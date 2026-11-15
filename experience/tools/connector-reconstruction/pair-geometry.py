import argparse
import hashlib
import importlib.metadata
import json
import math
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pycolmap


REPOSITORY = Path(__file__).resolve().parents[3]
WORKSPACE = REPOSITORY / "artifacts/realism-01/connector-parallax"
EVIDENCE = REPOSITORY / "experience/evidence/realism-01/connector-parallax"
SOURCE = "experience/evidence/realism-01/connector-reconstruction/spherical"
INPUTS = {
    "pairs.json": f"{SOURCE}/heading-None/pair-observations.json",
    "original-result.json": f"{SOURCE}/result.json",
    "settings.json": f"{SOURCE}/heading-None/settings.json",
    "original-execution.txt": f"{SOURCE}/execution.txt",
    "selected.json": f"{SOURCE}/selected.json",
    "source-manifest.json": f"{SOURCE}/manifest.json",
}
UPSTREAM_COMMIT = "bd1fcf654d2dd8fefa1466999c190a246f83f4b9"
UPSTREAM = {
    "incremental_pipeline.cc": ("controllers", "7ac7783c6accaaf941d470c02fb8eefb9054d6b7ecd3701d828259fda0e00351"),
    "incremental_mapper.cc": ("sfm", "ed54fd69e838bd189926110607bcb4ac5dc302b9840612447cc76612118f6969"),
    "incremental_triangulator.cc": ("sfm", "7699ada72dde810fcfb436feb828de43b3b6ec692196cde98d79327f2082a6e8"),
}
INITIALIZATION_STAGES = [
    {"minimumInliers": 100, "minimumAngleDegrees": 16},
    {"minimumInliers": 50, "minimumAngleDegrees": 16},
    {"minimumInliers": 50, "minimumAngleDegrees": 8},
    {"minimumInliers": 25, "minimumAngleDegrees": 8},
    {"minimumInliers": 25, "minimumAngleDegrees": 4},
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def write_json(filename, value):
    filename.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def quantiles(values):
    return None if not values else {
        name: float(value) for name, value in zip(
            ["minimum", "p10", "median", "p90", "maximum"],
            np.quantile(values, [0, .1, .5, .9, 1]), strict=True)
    }


def analyze(folder):
    assert importlib.metadata.version("pycolmap") == "4.2.1"
    original = json.loads((folder / "original-result.json").read_text())
    selected = json.loads((folder / "selected.json").read_text())
    assert original["completed"] and original["conditions"]["cameraModel"] == "EQUIRECTANGULAR"
    assert original["conditions"]["sourceGeolocationUsedForFitting"] is False
    dimensions = {tuple(source["camera"]["sensor_array_dimensions"]) for source in selected}
    assert len(dimensions) == 1
    width, height = dimensions.pop()
    camera = pycolmap.Camera.create_from_model_id(
        camera_id=1, model=pycolmap.CameraModelId.EQUIRECTANGULAR,
        focal_length=0, width=width, height=height)
    defaults = pycolmap.IncrementalPipelineOptions()
    thresholds = {
        "initialMinimumInliers": defaults.mapper.init_min_num_inliers,
        "initialMinimumAngleDegrees": defaults.mapper.init_min_tri_angle,
        "finalMinimumAngleDegrees": defaults.mapper.filter_min_tri_angle,
    }
    assert thresholds == {"initialMinimumInliers": 100, "initialMinimumAngleDegrees": 16., "finalMinimumAngleDegrees": 1.5}
    results = []
    for pair in json.loads((folder / "pairs.json").read_text()):
        assert pair["configuration"] == "TwoViewGeometryConfiguration.CALIBRATED"
        first, second = [np.asarray(points, dtype=np.float64) for points in pair["matchedPoints"]]
        assert first.shape == second.shape == (pair["tentativeMatches"], 2)
        assert np.isfinite(first).all() and np.isfinite(second).all()
        assert np.all(first[:, 1] < height / 2) and np.all(second[:, 1] < height / 2)
        # 已保留的紧凑坐标使用对应行索引；保持原始内点顺序和矩阵。
        rows = {tuple(match): index for index, match in enumerate(pair["matches"])}
        assert len(rows) == len(pair["matches"])
        indices = [rows[tuple(match)] for match in pair["inliers"]]
        inliers = np.array([[index, index] for index in indices], dtype=np.uint32)
        geometry = pycolmap.TwoViewGeometry(
            config=int(pycolmap.TwoViewGeometryConfiguration.CALIBRATED),
            E=np.asarray(pair["E"]), F=None if pair["F"] is None else np.asarray(pair["F"]),
            H=None if pair["H"] is None else np.asarray(pair["H"]), inlier_matches=inliers)
        success = pycolmap.estimate_two_view_geometry_pose(camera, first, camera, second, geometry)
        assert success and geometry.cam2_from_cam1 is not None
        assert len(geometry.inlier_matches) == pair["verifiedInliers"]
        pose = geometry.cam2_from_cam1
        first_center = np.zeros(3)
        second_center = pose.inverse().translation
        rays1 = np.asarray(camera.cam_ray_from_img(first))
        rays2 = np.asarray(camera.cam_ray_from_img(second))
        points = []
        for index in indices:
            point = pycolmap.triangulate_mid_point(pose, rays1[index], rays2[index])
            record = {"match": pair["matches"][index], "retainedMatchRow": index, "triangulated": point is not None}
            if point is not None:
                assert np.isfinite(point).all()
                transformed = pose * point
                depth1 = float(np.dot(point, rays1[index]))
                depth2 = float(np.dot(transformed, rays2[index]))
                angle = math.degrees(pycolmap.calculate_triangulation_angle(first_center, second_center, point))
                residuals = [math.degrees(math.acos(float(np.clip(np.dot(position / np.linalg.norm(position), ray), -1, 1))))
                             for position, ray in [(point, rays1[index]), (transformed, rays2[index])]]
                record.update({"xyzInUnitBaseline": point.tolist(), "rayDepths": [depth1, depth2],
                               "positiveInBothCameras": depth1 > 0 and depth2 > 0,
                               "angleDegrees": angle, "angularResidualDegrees": residuals})
            points.append(record)
        positive = [point for point in points if point.get("positiveInBothCameras")]
        angles = [point["angleDegrees"] for point in positive]
        result = {
            "images": pair["images"], "tentativeMatches": pair["tentativeMatches"],
            "verifiedInliers": pair["verifiedInliers"], "poseRecomputed": success,
            "pose": pose.matrix().tolist(), "originalPoseMaximumDifference": float(np.max(np.abs(pose.matrix() - np.asarray(pair["cam2FromCam1"])))),
            "nativeMedianAngleDegrees": math.degrees(geometry.tri_angle),
            "midpointPositiveDepthCount": len(positive),
            "midpointTriangulatedCount": sum(point["triangulated"] for point in points),
            "midpointPositiveDepthAnglesDegrees": quantiles(angles),
            "midpointPositiveDepthAngularResidualDegrees": quantiles([error for point in positive for error in point["angularResidualDegrees"]]),
            "positivePointsAtLeastInitialAngle": sum(angle >= thresholds["initialMinimumAngleDegrees"] for angle in angles),
            "positivePointsAtLeastFinalAngle": sum(angle >= thresholds["finalMinimumAngleDegrees"] for angle in angles),
            "positivePointsAtLeastLastInitializationAngle": sum(angle >= INITIALIZATION_STAGES[-1]["minimumAngleDegrees"] for angle in angles),
            "points": points,
        }
        assert math.isfinite(result["nativeMedianAngleDegrees"])
        results.append(result)
    return {"sourceRanks": {source["id"]: source["rank"] for source in selected},
            "camera": {"model": camera.model_name, "width": camera.width, "height": camera.height, "params": camera.params.tolist()},
            "defaultThresholds": thresholds, "pairs": results}


def plot(report, target):
    config = WORKSPACE / "plot-cache"
    config.mkdir(parents=True, exist_ok=True)
    os.environ["MPLCONFIGDIR"] = str(config)
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    analysis = report["analysis"]
    labels = [" ↔ ".join(str(analysis["sourceRanks"][Path(image).stem]) for image in pair["images"])
              for pair in analysis["pairs"]]
    values = [pair["nativeMedianAngleDegrees"] for pair in analysis["pairs"]]
    figure, axes = plt.subplots(figsize=(9, 4.5), constrained_layout=True)
    axes.bar(labels, values, color="#345e55")
    axes.axhline(analysis["defaultThresholds"]["initialMinimumAngleDegrees"], color="#ad603a", label="Declared initial minimum: 16°")
    axes.axhline(INITIALIZATION_STAGES[-1]["minimumAngleDegrees"], color="#577ba1", linestyle="-.", label="Last automatic initial minimum: 4°")
    axes.axhline(analysis["defaultThresholds"]["finalMinimumAngleDegrees"], color="#7e7738", linestyle="--", label="Declared final filter: 1.5°")
    for index, value in enumerate(values):
        axes.text(index, value + .3, f"{value:.3f}°", ha="center")
    axes.set(ylabel="Triangulation angle (degrees)", title="Retained spherical pairs · official pose recomputation", ylim=(0, 18))
    axes.legend(loc="center right", frameon=False)
    figure.savefig(target, dpi=130)
    plt.close(figure)


def verify(directory):
    manifest = json.loads((directory / "manifest.json").read_text())
    assert len({entry["path"] for entry in manifest["files"]}) == len(manifest["files"])
    for entry in manifest["files"]:
        filename = (directory / entry["path"]).resolve()
        assert filename.is_relative_to(directory.resolve())
        data = filename.read_bytes()
        assert len(data) == entry["bytes"] and digest(data) == entry["sha256"]
        assert all(entry[field] for field in ["source", "date", "rights", "location", "method", "limitations"])
    report = json.loads((directory / "report.json").read_text())
    recomputed = analyze(directory / "inputs")
    assert recomputed == report["analysis"], "Recomputed geometry differs from retained exact values"
    assert digest((directory / "executed-pair-geometry.py").read_bytes()) == report["producerSha256"]
    for name, (_, expected) in UPSTREAM.items():
        assert digest((directory / "upstream" / name).read_bytes()) == expected
    assert report["controllerAudit"]["initializationStages"] == INITIALIZATION_STAGES
    prior = json.loads((directory / "inputs/source-manifest.json").read_text())
    for name, original in INPUTS.items():
        if name == "source-manifest.json":
            continue
        expected = next(entry for entry in prior["files"] if entry["path"] == original.removeprefix(SOURCE + "/"))
        assert digest((directory / "inputs" / name).read_bytes()) == expected["sha256"]
    print(json.dumps({"verifiedFiles": len(manifest["files"]), "recomputedPairs": len(recomputed["pairs"]),
                      "nativeAnglesDegrees": [pair["nativeMedianAngleDegrees"] for pair in recomputed["pairs"]],
                      "routeQualified": False}))


def main():
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--output", type=Path)
    modes.add_argument("--verify", type=Path)
    modes.add_argument("--retain", type=Path)
    args = parser.parse_args()
    if args.verify:
        verify(args.verify.resolve())
        return
    if args.retain:
        source = args.retain.resolve()
        assert source.is_relative_to(WORKSPACE)
        verify(source)
        assert not EVIDENCE.exists()
        shutil.copytree(source, EVIDENCE)
        verify(EVIDENCE)
        return
    output = args.output.resolve()
    assert output.is_relative_to(WORKSPACE) and not output.exists()
    (output / "inputs").mkdir(parents=True)
    for name, source in INPUTS.items():
        shutil.copyfile(REPOSITORY / source, output / "inputs" / name)
    (output / "upstream").mkdir()
    for name, (_, expected) in UPSTREAM.items():
        source = WORKSPACE / "upstream" / name
        assert digest(source.read_bytes()) == expected
        shutil.copyfile(source, output / "upstream" / name)
    producer = Path(__file__).read_bytes()
    (output / "executed-pair-geometry.py").write_bytes(producer)
    timestamp = datetime.now(timezone.utc).isoformat()
    report = {"schemaVersion": 1, "date": timestamp, "producerSha256": digest(producer),
              "versions": {name: importlib.metadata.version(name) for name in ["pycolmap", "numpy", "matplotlib"]},
              "method": "Official pycolmap pose recovery from unchanged retained E/H matrices, inliers and image coordinates; independent bearing-ray midpoint triangulation",
              "analysis": analyze(output / "inputs"),
              "controllerAudit": {
                  "version": "COLMAP 4.2.1", "commit": UPSTREAM_COMMIT,
                  "method": "Complete manual source reading; immutable upstream source hashes retained",
                  "initializationStages": INITIALIZATION_STAGES,
                  "references": {
                      "retrySchedule": "upstream/incremental_pipeline.cc:423–449",
                      "initialTriangulationThreshold": "upstream/incremental_pipeline.cc:497–507",
                      "firstModelSizePolicy": "upstream/incremental_pipeline.cc:817–821",
                      "twoViewTrackPolicy": "upstream/incremental_triangulator.cc:487–495",
                  },
                  "interpretation": "The unchanged controller may halve the inlier count twice and the initial angle twice. Initial triangulation uses the current initial-angle requirement; later point filtering remains at 1.5 degrees. Pair diagnostics alone do not reproduce every initialization criterion.",
              },
              "limitations": [
                  "This audit performs no feature matching, database modification, threshold change or model construction.",
                  "Prior database-loaded tri_angle=-1 is an unmeasured sentinel; compact reports encode it as null.",
                  "The retained mapper automatically retries through the recorded 100/16, 50/16, 50/8, 25/8 and 25/4 inlier/degree stages. These pair comparisons do not isolate every rejection criterion.",
                  "Midpoint bearing-ray reconstruction is a separate per-correspondence diagnostic; native median calculation can use its own cheirality filtering.",
                  "The input upper-half mask excludes ground. All reconstructed values have arbitrary unit-baseline scale.",
                  "Weak parallax in these retained matches does not determine the sufficiency of the whole capture collection or qualify a walking surface.",
              ]}
    write_json(output / "report.json", report)
    plot(report, output / "parallax.png")
    records = []
    for filename in sorted(output.rglob("*")):
        if filename.is_file():
            data = filename.read_bytes()
            upstream_source = UPSTREAM.get(filename.name) if filename.parent.name == "upstream" else None
            records.append({"path": str(filename.relative_to(output)), "bytes": len(data), "sha256": digest(data),
                            "source": f"https://raw.githubusercontent.com/colmap/colmap/{UPSTREAM_COMMIT}/src/colmap/{upstream_source[0]}/{filename.name}" if upstream_source else "Retained spherical trial and official pycolmap 4.2.1 APIs; Irvin Chen / Panoramax Taiwan",
                            "date": timestamp, "rights": "COLMAP BSD 3-clause; original copyright and license retained in source" if upstream_source else "Project-generated diagnostic; source-derived measurements CC BY-SA 4.0, Irvin Chen / Panoramax Taiwan",
                            "location": "Shijō–Karasuma crossing; selected cameras west of approved route edge 1",
                            "method": report["method"], "limitations": "Source-relative pair geometry; no metric scale, ground, route model or physical-device acceptance."})
    write_json(output / "manifest.json", {"schemaVersion": 1, "files": records})
    verify(output)


if __name__ == "__main__":
    main()
