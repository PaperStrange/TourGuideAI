import argparse
import hashlib
import importlib.metadata
import itertools
import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pycolmap
from pyproj import Geod


ROOT = Path(__file__).resolve().parents[3]
WORKSPACE = ROOT / "artifacts/realism-01/connector-rig-geometry"
EVIDENCE = ROOT / "experience/evidence/realism-01/connector-rig-geometry"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def quantiles(values):
    assert values and np.isfinite(values).all()
    return dict(zip(["minimum", "p05", "median", "p95", "maximum"],
                    np.quantile(values, [0, .05, .5, .95, 1]).tolist(), strict=True))


def analyze(directory):
    assert importlib.metadata.version("pycolmap") == "4.2.1"
    selection = {source["id"]: source for source in json.loads((directory / "selected.json").read_text())}
    model = pycolmap.Reconstruction(directory / "model")
    assert model.num_points3D() > 0
    frames = {}
    for image_id in sorted(model.reg_image_ids()):
        image = model.image(image_id)
        source_id = Path(image.name).stem
        assert source_id in selection and image.has_pose
        camera = model.camera(image.camera_id)
        assert camera.model_name == "SIMPLE_PINHOLE" and camera.width == camera.height == 1520
        expected_focal = 1520 / (2 * math.tan(math.radians(90) / 2))
        assert np.array_equal(camera.params, [expected_focal, 760., 760.])
        center = image.projection_center()
        assert np.isfinite(center).all() and np.isfinite(image.cam_from_world().matrix()).all()
        frame = frames.setdefault(image.frame_id, {"sourceId": source_id, "rank": selection[source_id]["rank"],
            "center": center.tolist(), "imageIds": [], "maximumSensorCenterDifference": 0.})
        assert frame["sourceId"] == source_id
        frame["imageIds"].append(image_id)
        frame["maximumSensorCenterDifference"] = max(frame["maximumSensorCenterDifference"],
            float(np.linalg.norm(center - frame["center"])))
    assert {frame["sourceId"] for frame in frames.values()} == set(selection)
    assert all(len(frame["imageIds"]) == 12 and frame["maximumSensorCenterDifference"] <= 1e-8 for frame in frames.values())
    observations = []
    points = []
    graph = {frame_id: set() for frame_id in frames}
    edge_support = {}
    for point_id in sorted(model.point3D_ids()):
        point = model.point3D(point_id)
        assert np.isfinite(point.xyz).all()
        physical_frames = set()
        point_errors = []
        for element in point.track.elements:
            image = model.image(element.image_id)
            assert image.has_pose and image.points2D[element.point2D_idx].point3D_id == point_id
            physical_frames.add(image.frame_id)
            point_camera = image.cam_from_world() * point.xyz
            assert np.isfinite(point_camera).all() and point_camera[2] > 0
            observed = image.points2D[element.point2D_idx].xy
            predicted = model.camera(image.camera_id).img_from_cam(point_camera)
            assert predicted is not None and np.isfinite(predicted).all()
            error = float(np.linalg.norm(observed - predicted))
            point_errors.append(error)
            observations.append({"pointId": point_id, "imageId": image.image_id,
                "point2DIndex": element.point2D_idx, "physicalFrameId": image.frame_id,
                "cameraDepthArbitraryUnits": float(point_camera[2]), "observedXy": observed.tolist(),
                "recomputedXy": predicted.tolist(), "errorPixels": error})
        assert len(physical_frames) >= 2
        angles = []
        for first, second in itertools.combinations(sorted(physical_frames), 2):
            graph[first].add(second)
            graph[second].add(first)
            edge_support[(first, second)] = edge_support.get((first, second), 0) + 1
            angle = math.degrees(pycolmap.calculate_triangulation_angle(
                np.asarray(frames[first]["center"]), np.asarray(frames[second]["center"]), point.xyz))
            angles.append(angle)
        assert max(angles) >= 1.5 - 1e-6 and max(point_errors) <= 4 + 1e-6
        assert abs(float(np.mean(point_errors)) - point.error) <= 1e-9
        points.append({"pointId": point_id, "physicalFrames": sorted(physical_frames),
            "maximumPhysicalAngleDegrees": max(angles), "meanReprojectionErrorPixels": float(np.mean(point_errors))})
    visited, pending = set(), [next(iter(graph))]
    while pending:
        current = pending.pop()
        if current not in visited:
            visited.add(current)
            pending.extend(graph[current] - visited)
    assert len(visited) == len(frames)
    geodesic = Geod(ellps="WGS84")
    baselines = []
    for first, second in itertools.combinations(sorted(frames), 2):
        one, two = frames[first], frames[second]
        source1, source2 = selection[one["sourceId"]], selection[two["sourceId"]]
        lon1, lat1 = source1["coordinates"]
        lon2, lat2 = source2["coordinates"]
        _, _, gps_distance = geodesic.inv(lon1, lat1, lon2, lat2)
        baselines.append({"frames": [first, second], "sourceRanks": [one["rank"], two["rank"]],
            "relativeDistanceArbitraryUnits": float(np.linalg.norm(np.asarray(one["center"]) - two["center"])),
            "declaredGpsDistanceMetres": gps_distance,
            "declaredHorizontalAccuracyMetres": [source1["horizontalAccuracyMetres"], source2["horizontalAccuracyMetres"]],
            "sharedPointCount": edge_support.get((first, second), 0)})
    maximum_relative = max(pair["relativeDistanceArbitraryUnits"] for pair in baselines)
    maximum_gps = max(pair["declaredGpsDistanceMetres"] for pair in baselines)
    for pair in baselines:
        pair["relativeFractionOfMaximumBaseline"] = pair["relativeDistanceArbitraryUnits"] / maximum_relative
        pair["gpsFractionOfMaximumBaseline"] = pair["declaredGpsDistanceMetres"] / maximum_gps
    assert min(pair["relativeFractionOfMaximumBaseline"] for pair in baselines) > 1e-6
    return {"registeredPhysicalFrames": len(frames), "registeredVirtualImages": model.num_reg_images(),
        "sparsePoints": len(points), "observations": len(observations),
        "pointsWithAtLeastThreePhysicalFrames": sum(len(point["physicalFrames"]) >= 3 for point in points),
        "allPointsHaveMultiplePhysicalFrames": True, "allObservationsHavePositiveDepth": True,
        "allPhysicalFramesConnectedByPointTracks": True,
        "physicalAngleDegrees": quantiles([point["maximumPhysicalAngleDegrees"] for point in points]),
        "observationErrorPixels": quantiles([observation["errorPixels"] for observation in observations]),
        "meanPointReprojectionErrorPixels": float(np.mean([point["meanReprojectionErrorPixels"] for point in points])),
        "frames": {str(frame_id): frame for frame_id, frame in frames.items()},
        "baselines": baselines, "points": points, "pointObservations": observations}


def verify(directory):
    manifest = json.loads((directory / "manifest.json").read_text())
    for entry in manifest["files"]:
        path = (directory / entry["path"]).resolve()
        assert path.is_relative_to(directory.resolve())
        assert path.stat().st_size == entry["bytes"] and digest(path) == entry["sha256"]
    actual = analyze(directory)
    retained = json.loads((directory / "report.json").read_text())
    assert actual == retained["analysis"]
    assert digest(directory / "executed-model-geometry.py") == retained["producerSha256"]
    print(json.dumps({"verifiedFiles": len(manifest["files"]),
        "registeredPhysicalFrames": actual["registeredPhysicalFrames"], "sparsePoints": actual["sparsePoints"],
        "maximumObservationErrorPixels": actual["observationErrorPixels"]["maximum"],
        "minimumPhysicalAngleDegrees": actual["physicalAngleDegrees"]["minimum"],
        "relativeGeometryDiagnosticPassed": True, "metricOrRouteQualified": False}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--verify", type=Path)
    parser.add_argument("--retain", type=Path)
    args = parser.parse_args()
    if args.verify:
        verify(args.verify.resolve())
        return
    if args.retain:
        source = args.retain.resolve()
        assert source.is_relative_to(WORKSPACE) and not EVIDENCE.exists()
        verify(source)
        shutil.copytree(source, EVIDENCE)
        verify(EVIDENCE)
        return
    assert args.run and args.output
    source, output = args.run.resolve(), args.output.resolve()
    assert source.is_relative_to(ROOT / "artifacts/realism-01/connector-rig")
    assert output.is_relative_to(WORKSPACE) and not output.exists()
    source_report = json.loads((source / "result.json").read_text())
    assert source_report["completed"] and len(source_report["models"]) == 1
    source_files = {name: digest(source / name) for name in ["result.json", "selected.json"]}
    for name in ["rigs.bin", "cameras.bin", "frames.bin", "images.bin", "points3D.bin"]:
        source_files[f"sparse/0/{name}"] = digest(source / "sparse/0" / name)
    output.mkdir(parents=True)
    shutil.copytree(source / "sparse/0", output / "model")
    shutil.copyfile(source / "selected.json", output / "selected.json")
    shutil.copyfile(Path(__file__), output / "executed-model-geometry.py")
    timestamp = datetime.now(timezone.utc).isoformat()
    report = {"schemaVersion": 1, "date": timestamp, "sourceRun": source.name,
        "sourceHashes": source_files, "producerSha256": digest(Path(__file__)),
        "versions": {name: importlib.metadata.version(name) for name in ["pycolmap", "numpy", "pyproj"]},
        "method": "Independent native-model reload, official camera projection and triangulation-angle APIs, WGS84 inverse geodesics for declared GPS context",
        "analysis": analyze(output), "relativeGeometryDiagnosticPassed": True,
        "metricOrRouteQualified": False,
        "limitations": ["This audit performs no database writes, feature matching, bundle adjustment, alignment or scale fitting.",
            "Native point tracks and every observation are recomputed independently of the reconstruction producer's diagnostics.",
            "Positive sparse geometry does not establish photometric fidelity, metric scale, walking surface, source coverage or full-route quality.",
            "Source GPS declares 4 m horizontal accuracy per position. Baseline ratios differ; these coordinates supply no independent scale or geometry ground truth.",
            "Only the selected upper-hemisphere image features were reconstructed; ground remains unobserved."]}
    write_json(output / "report.json", report)
    assert all(digest(source / name) == expected for name, expected in source_files.items())
    manifest = {"schemaVersion": 1, "files": []}
    for filename in sorted(output.rglob("*")):
        if filename.is_file():
            manifest["files"].append({"path": str(filename.relative_to(output)), "bytes": filename.stat().st_size,
                "sha256": digest(filename), "source": "Run-02 native COLMAP model; Irvin Chen / Panoramax Taiwan source imagery",
                "date": timestamp, "rights": "Source-derived geometry CC BY-SA 4.0; project code under repository licensing",
                "location": "Shijō–Karasuma crossing, four cameras west of approved route edge 1",
                "method": report["method"], "limitations": "Relative sparse geometry diagnostic; metric scale, floor and full route remain unqualified."})
    write_json(output / "manifest.json", manifest)
    verify(output)


if __name__ == "__main__":
    main()
