import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import gzip
import importlib.metadata
import json
from pathlib import Path
import shutil

import cv2
import numpy as np
import pycolmap
from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
ORIGINAL = ROOT / "experience/evidence/realism-01/connector-rig/run-02"
WORKSPACE = ROOT / "artifacts/realism-01/connector-surface-qa"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def identity(path):
    return {"path": str(path), "bytes": path.stat().st_size, "sha256": digest(path)}


def verify_identity(record, path=None):
    path = Path(record["path"]) if path is None else path
    assert path.stat().st_size == record["bytes"] and digest(path) == record["sha256"], path
    return path


def close(actual, expected, tolerance=1e-8):
    np.testing.assert_allclose(actual, expected, rtol=1e-10, atol=tolerance)


def verify_associations(source, model, database_path=None, keypoints_path=None):
    model_images = {image.name: image for image in model.images.values()}
    observations = json.loads((ORIGINAL / "observations.json").read_text())
    original_images = {row["name"]: row for row in observations["images"]}
    candidates = defaultdict(lambda: defaultdict(list))
    keypoints, database_pairs = {}, {}
    features = {row["image"]: row for row in source["features"]}
    assert len(features) == 72
    pair_count = 0
    if database_path is not None:
        with pycolmap.Database.open(database_path) as database:
            images = {image.name: image for image in database.read_all_images()}
            assert set(images) == set(features)
            for name, image in images.items():
                assert image.image_id == features[name]["imageId"]
                keypoints[name] = database.read_keypoints(image.image_id)
            for pair in source["pairs"]:
                query, fit = images[pair["query"]], images[pair["fit"]]
                geometry = database.read_two_view_geometry(query.image_id, fit.image_id)
                database_pairs[(pair["query"], pair["fit"])] = {"inliers": geometry.inlier_matches,
                    "configuration": int(geometry.config), "tentative": len(database.read_matches(query.image_id, fit.image_id))}
    else:
        assert keypoints_path is not None
        with np.load(keypoints_path, allow_pickle=False) as retained:
            assert set(retained.files) == {str(row["imageId"]) for row in features.values()}
            keypoints = {name: retained[str(row["imageId"])] for name, row in features.items()}
    with np.load(ORIGINAL / "observations.npz", allow_pickle=False) as frozen:
        for name, points in keypoints.items():
            assert len(points) == features[name]["count"]
            if name in original_images:
                assert np.array_equal(points, frozen[original_images[name]["keypointsKey"]]), name
        expected_pairs = {(f'pano_camera{query_index}/{query["id"]}.jpg', f'pano_camera{fit_index}/{fit["id"]}.jpg')
            for query in source["sources"]["holdout"] for query_index in range(12)
            for fit in source["sources"]["fit"] for fit_index in range(12)}
        assert len(source["pairs"]) == len(expected_pairs) == 1152
        assert {(row["query"], row["fit"]) for row in source["pairs"]} == expected_pairs
        for pair in source["pairs"]:
            assert features[pair["query"]]["imageId"] == pair["queryImageId"]
            assert features[pair["fit"]]["imageId"] == pair["fitImageId"]
            matches = np.asarray(pair["inliers"], dtype=np.uint32).reshape(-1, 2)
            assert len(matches) == pair["verified"] and pair["tentative"] >= len(matches)
            assert np.all(matches[:, 0] < len(keypoints[pair["query"]]))
            assert np.all(matches[:, 1] < len(keypoints[pair["fit"]]))
            if database_path is not None:
                actual_pair = database_pairs[(pair["query"], pair["fit"])]
                assert np.array_equal(matches, actual_pair["inliers"])
                assert actual_pair["configuration"] == pair["configuration"]
                assert actual_pair["tentative"] == pair["tentative"]
            fit_image = model_images[pair["fit"]]
            for query_index, fit_index in matches:
                point = fit_image.points2D[int(fit_index)]
                if point.has_point3D():
                    candidates[(pair["query"], int(query_index))][point.point3D_id].append(
                        {"fitImage": pair["fit"], "fitFeature": int(fit_index), "frozenImageId": fit_image.image_id})
            pair_count += 1
    support_count = 0
    for query in source["queries"]:
        selected = {key: values for key, values in candidates.items() if Path(key[0]).stem == query["sourceId"]}
        unambiguous = {key: next(iter(values)) for key, values in selected.items() if len(values) == 1}
        multiplicities = Counter((key[0], point_id) for key, point_id in unambiguous.items())
        expected = {key: point_id for key, point_id in unambiguous.items() if multiplicities[(key[0], point_id)] == 1}
        actual = {(row["queryImage"], row["queryFeature"]): row["point3DId"] for row in query["associations"]}
        assert actual == expected and len(actual) == len(query["associations"])
        assert len(selected) == query["matchedQueryKeypoints"]
        assert sum(len(values) != 1 for values in selected.values()) == query["conflictingPointIdentities"]
        assert sum(multiplicities[(key[0], point_id)] != 1 for key, point_id in unambiguous.items()) == query["duplicateQueryAssignmentsRemoved"]
        for association in query["associations"]:
            name, feature = association["queryImage"], association["queryFeature"]
            point = model.point3D(association["point3DId"])
            assert np.array_equal(point.xyz, association["xyz"])
            assert np.array_equal(keypoints[name][feature, :2], association["xy"])
            assert association["cameraIndex"] == int(name.partition("/")[0].removeprefix("pano_camera"))
            supports = selected[(name, feature)][association["point3DId"]]
            assert association["supportingMatches"] == supports and len(supports) > 0
            track = {(element.image_id, element.point2D_idx) for element in point.track.elements}
            for support in supports:
                image = model_images[support["fitImage"]]
                assert image.image_id == support["frozenImageId"]
                assert (image.image_id, support["fitFeature"]) in track
                assert image.points2D[support["fitFeature"]].point3D_id == association["point3DId"]
                support_count += 1
    return {"verifiedPairRecords": pair_count, "exactFittingKeypointBindings": len(original_images),
        "verifiedAssociations": sum(len(query["associations"]) for query in source["queries"]),
        "verifiedSupportingMatches": support_count, "candidateSelectionRecomputed": True,
        "databasePairRowsVerified": database_path is not None, "retainedKeypointsVerified": keypoints_path is not None}


def verify_pose(query, model):
    saved = query["pose"]
    assert saved["poseRecovered"] and saved["finalConsensusRefinement"]
    rig = np.asarray(saved["rigFromWorld"])
    close(rig[:, :3] @ rig[:, :3].T, np.eye(3), 1e-12)
    close(np.linalg.det(rig[:, :3]), 1, 1e-12)
    close(-rig[:, :3].T @ rig[:, 3], saved["center"], 1e-12)
    cameras = {row["cameraIndex"]: row for row in saved["cameraFromWorld"]}
    assert set(cameras) == set(range(12))
    originals = {}
    for image in model.images.values():
        index = int(image.name.partition("/")[0].removeprefix("pano_camera"))
        originals[index] = image
    for index, camera in cameras.items():
        original = originals[index]
        assert camera["model"] == original.camera.model_name == "SIMPLE_PINHOLE"
        assert camera["width"] == original.camera.width == camera["height"] == original.camera.height == 1520
        assert np.array_equal(camera["params"], original.camera.params)
        transform = (original.cam_from_world() * original.frame.rig_from_world.inverse()).matrix()
        expected = np.column_stack([transform[:, :3] @ rig[:, :3], transform[:, :3] @ rig[:, 3] + transform[:, 3]])
        close(camera["matrix"], expected, 1e-12)
    assert len(saved["observations"]) == len(query["associations"])
    verified, inlier_points, inlier_cameras, inlier_errors = [], set(), Counter(), []
    maximum_depth_difference = 0.0
    maximum_error_difference = 0.0
    for index, (association, recorded) in enumerate(zip(query["associations"], saved["observations"], strict=True)):
        assert recorded["association"] == index
        camera = cameras[association["cameraIndex"]]
        matrix = np.asarray(camera["matrix"])
        coordinates = matrix[:, :3] @ model.point3D(association["point3DId"]).xyz + matrix[:, 3]
        positive = bool(coordinates[2] > 0)
        close(coordinates[2], recorded["depth"])
        maximum_depth_difference = max(maximum_depth_difference, abs(float(coordinates[2]) - recorded["depth"]))
        assert positive == recorded["positiveDepth"]
        projected, error = None, None
        if positive:
            focal, principal_x, principal_y = camera["params"]
            projected = coordinates[:2] / coordinates[2] * focal + [principal_x, principal_y]
            error = float(np.linalg.norm(projected - association["xy"]))
            close(projected, recorded["projected"])
            close(error, recorded["errorPixels"])
            maximum_error_difference = max(maximum_error_difference, abs(error - recorded["errorPixels"]))
        else:
            assert recorded["projected"] is None and recorded["errorPixels"] is None
        inlier = positive and error <= 4.0
        assert inlier == recorded["finalConsensusInlier"]
        if inlier:
            inlier_points.add(association["point3DId"])
            inlier_cameras[association["cameraIndex"]] += 1
            inlier_errors.append(error)
        verified.append({"association": index, "point3DId": association["point3DId"], "positiveDepth": positive,
            "depth": float(coordinates[2]), "errorPixels": error, "finalConsensusInlier": inlier})
    unique_points = {row["point3DId"] for row in query["associations"]}
    ratio = len(inlier_points) / len(unique_points)
    assert len(inlier_points) == saved["uniqueInliers"] and len(unique_points) == saved["uniqueCandidatePoints"]
    assert len(inlier_errors) == saved["inlierObservations"]
    assert {str(key): value for key, value in inlier_cameras.items()} == saved["inlierVirtualCameras"]
    close(ratio, saved["uniqueInlierRatio"])
    errors = {"median": float(np.median(inlier_errors)), "p95": float(np.percentile(inlier_errors, 95)), "maximum": max(inlier_errors)}
    for key, value in errors.items():
        close(value, saved["inlierErrorPixels"][key])
    support_frames = sorted({model.image(element.image_id).frame_id for point_id in inlier_points
        for element in model.point3D(point_id).track.elements})
    assert support_frames == saved["pointSupportPhysicalFitFrames"]
    assert saved["allInlierDepthsPositive"]
    assert saved["localizationEligible"] == (len(inlier_points) >= 30 and ratio >= 0.25)
    return {"rank": query["rank"], "associations": len(verified), "uniqueInliers": len(inlier_points),
        "inlierObservations": len(inlier_errors), "uniqueCandidatePoints": len(unique_points), "uniqueInlierRatio": ratio,
        "inlierErrorPixels": errors, "positiveDepthClassificationsMatch": True, "finalConsensusClassificationsMatch": True,
        "maximumDepthDifference": maximum_depth_difference, "maximumErrorDifferencePixels": maximum_error_difference,
        "localizationEligible": saved["localizationEligible"], "pointSupportPhysicalFitFrames": support_frames,
        "observations": verified}


def photometry(reference, observed, selected):
    count = int(np.count_nonzero(selected))
    if count == 0:
        return None
    difference = observed[selected].astype(np.float64) - reference[selected].astype(np.float64)
    absolute = np.abs(difference)
    squared_mean = float(np.sum(difference * difference) / (3 * count))
    return {"pixels": count, "meanAbsoluteChannelError255": float(np.sum(absolute) / (3 * count)),
        "p95AbsoluteChannelError255": float(np.percentile(absolute, 95)),
        "rootMeanSquareChannelError255": float(np.sqrt(squared_mean)),
        "psnrDb": float(10 * np.log10(255 * 255 / squared_mean)) if squared_mean else None,
        "exactPixelFraction": float(np.count_nonzero(np.all(difference == 0, axis=1)) / count)}


def verify_pixels(render, source, retained=None):
    queries = {row["rank"]: row for row in source["queries"]}
    image_records = {row["name"]: row for row in source["images"]}
    assert len(render["views"]) == 24
    assert {(row["rank"], row["cameraIndex"]) for row in render["views"]} == {(rank, index) for rank in queries for index in range(12)}
    reports = []
    cv2.setNumThreads(2)
    for row in render["views"]:
        assert row["rendered"]
        files = [verify_identity(record, retained[Path(record["path"]).name] if retained else None) for record in row["files"]]
        assert len(files) == 4
        render_path, eligible_path, neighborhood_path, reference_path = files
        with Image.open(render_path) as image:
            assert image.mode == "RGBA"
            rendered = np.asarray(image)
        with Image.open(eligible_path) as image:
            eligible_values = np.asarray(image)
        with Image.open(neighborhood_path) as image:
            neighborhood = np.asarray(image)
        with Image.open(reference_path) as image:
            reference = np.asarray(image.convert("RGB"))
        assert rendered.shape == (1520, 1520, 4) and reference.shape == (1520, 1520, 3)
        assert eligible_values.shape == neighborhood.shape == (1520, 1520)
        assert set(np.unique(rendered[:, :, 3])).issubset({0, 255})
        assert set(np.unique(eligible_values)).issubset({0, 255}) and set(np.unique(neighborhood)).issubset({0, 255})
        eligible, covered = eligible_values > 0, rendered[:, :, 3] > 0
        assert not np.any(covered & ~eligible)
        assert np.all(rendered[:, :, :3][~covered] == 0)
        query = queries[row["rank"]]
        name = f'pano_camera{row["cameraIndex"]}/{query["sourceId"]}.jpg'
        assert digest(reference_path) == image_records[name]["sha256"]
        if retained is None:
            assert digest(reference_path) == digest(Path(source["projectionDirectory"]) / name)
            with Image.open(Path(source["maskDirectory"]) / (name + ".png")) as image:
                assert np.array_equal(eligible, np.asarray(image.convert("L")) > 0)
        with Image.open(ORIGINAL / "masks" / (f'pano_camera{row["cameraIndex"]}.png')) as image:
            assert np.array_equal(eligible, np.asarray(image) > 0)
        regenerated = np.zeros((1520, 1520), dtype=np.uint8)
        associations = [entry for entry in query["associations"] if entry["cameraIndex"] == row["cameraIndex"]]
        for association in associations:
            pixel = tuple(int(round(value - 0.5)) for value in association["xy"])
            cv2.circle(regenerated, pixel, 32, 255, thickness=-1)
        assert np.array_equal(regenerated, neighborhood)
        comparison = covered & (neighborhood == 0)
        counts = {"eligiblePixels": int(np.count_nonzero(eligible)), "coveredPixels": int(np.count_nonzero(covered)),
            "uncoveredPixels": int(np.count_nonzero(eligible & ~covered)), "poseCandidates": len(associations),
            "poseNeighborhoodEligiblePixels": int(np.count_nonzero(eligible & (neighborhood > 0))),
            "comparisonPixels": int(np.count_nonzero(comparison))}
        for key, value in counts.items():
            assert value == row[key], (row["rank"], row["cameraIndex"], key)
        coverage = counts["coveredPixels"] / counts["eligiblePixels"] if counts["eligiblePixels"] else None
        if coverage is None:
            assert row["coverage"] is None
        else:
            close(coverage, row["coverage"])
        results = {}
        for key, selected in [("fullCoveredPhotometry", covered), ("remainingPixelPhotometry", comparison)]:
            measured = photometry(reference, rendered[:, :, :3], selected)
            if measured is None:
                assert row[key] is None
            else:
                assert set(measured) == set(row[key])
                for metric, value in measured.items():
                    if value is None:
                        assert row[key][metric] is None
                    else:
                        close(value, row[key][metric], 1e-12)
            results[key] = measured
        reports.append({"rank": row["rank"], "cameraIndex": row["cameraIndex"], **counts, "coverage": coverage,
            **results, "fileHashesVerified": True, "sourceReferenceAndMaskBound": True, "poseNeighborhoodMaskReproduced": True})
    return reports


def retained_manifest(directory):
    manifest_path = directory / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    paths = [manifest_path]
    for record in manifest["files"]:
        path = (directory / record["path"]).resolve()
        assert path.is_relative_to(directory)
        verify_identity(record, path)
        assert all(record.get(key) for key in ["source", "date", "rights", "location", "method", "limitations"])
        paths.append(path)
    return paths


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--localization", type=Path)
    parser.add_argument("--render", type=Path)
    parser.add_argument("--evidence", type=Path)
    parser.add_argument("--render-evidence", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    output = arguments.output.resolve()
    assert output.is_relative_to(WORKSPACE) and not output.exists()
    retained_files, keypoints_path, copied_database = None, None, None
    frozen_paths, omitted = [], []
    if arguments.evidence:
        assert arguments.localization is None and arguments.render is None
        evidence = arguments.evidence.resolve()
        assert evidence.is_relative_to(ROOT / "experience/evidence")
        frozen_paths.extend(retained_manifest(evidence))
        localization_path = evidence / "localization/run-02/result.json"
        keypoints_path = localization_path.parent / "keypoints.npz"
        render_directory = evidence / "render"
        retained_files = {path.name: path for path in render_directory.iterdir() if path.is_file()}
        if arguments.render_evidence:
            render_directory = arguments.render_evidence.resolve()
            assert render_directory.is_relative_to(ROOT / "experience/evidence")
            frozen_paths.extend(retained_manifest(render_directory))
            retained_files.update({path.name: path for path in render_directory.iterdir() if path.is_file()})
        render_path = render_directory / "result.json"
        omitted.append("The retained bundle omits features.db, descriptors and raw tentative-match arrays. Database pair-row/configuration/count checks are not repeated; hash-bound saved verified tuples and retained exact keypoint arrays are checked instead.")
    else:
        assert arguments.localization is not None and arguments.render is not None and arguments.render_evidence is None
        localization_path, render_path = arguments.localization.resolve(), arguments.render.resolve()
        assert localization_path.is_relative_to(ROOT / "artifacts") and render_path.is_relative_to(ROOT / "artifacts")
    source = json.loads(localization_path.read_text())
    render = json.loads(render_path.read_text())
    assert source["completed"] and source["fittingModelUnchanged"] and render["completed"] and render["meshUnchanged"]
    assert [row["rank"] for row in source["sources"]["fit"]] == [68, 69, 70, 71]
    assert [row["rank"] for row in source["sources"]["holdout"]] == [67, 72]
    verify_identity(render["localization"], localization_path)
    if arguments.evidence:
        geometry_directory = ROOT / "experience/evidence/realism-01/connector-surface"
        for record in render.get("sourceAssets", [render["mesh"]]):
            original_path = Path(record["path"])
            path = geometry_directory / original_path.parent.name / original_path.name
            if path.suffix == ".obj":
                path = path.with_suffix(".obj.gz")
                decoded = gzip.decompress(path.read_bytes())
                assert len(decoded) == record["bytes"] and hashlib.sha256(decoded).hexdigest() == record["sha256"]
            else:
                verify_identity(record, path)
            frozen_paths.append(path)
    else:
        verify_identity(render["mesh"])
    output.mkdir(parents=True)
    shutil.copyfile(Path(__file__), output / "executed-heldout.py")
    if not arguments.evidence:
        database_path = verify_identity(source["database"])
        copied_database = output / "features-copy.db"
        shutil.copyfile(database_path, copied_database)
        frozen_paths.append(database_path)
    # Database 仅打开独立副本；原始输入在计算前后核对哈希。
    frozen_paths.extend([localization_path, render_path, ORIGINAL / "observations.json", ORIGINAL / "observations.npz"])
    frozen_paths.extend(sorted((ORIGINAL / "masks").glob("*.png")))
    frozen_paths.extend(ORIGINAL / name for name in source["modelFileHashes"])
    frozen_paths.extend(retained_files[Path(record["path"]).name] if retained_files else Path(record["path"])
        for row in render["views"] for record in row["files"])
    producer_records = [(localization_path.parent / "executed-relocalize.py", source["producer"]),
        (localization_path.parent / "executed-localize.py", source["poseProducer"]),
        (render_path.parent / "executed-render.py", render["producer"])]
    for path, record in producer_records:
        assert digest(path) == record["sha256"] and path.stat().st_size == record["bytes"]
        frozen_paths.append(path)
    frozen = [identity(path) for path in sorted(set(frozen_paths))]
    for name, expected in source["modelFileHashes"].items():
        assert digest(ORIGINAL / name) == expected
    model = pycolmap.Reconstruction(ORIGINAL / "sparse/0")
    assert model.num_reg_images() == 48 and model.num_points3D() == 1377
    bindings = verify_associations(source, model, copied_database, keypoints_path)
    poses = [verify_pose(query, model) for query in source["queries"]]
    pixels = verify_pixels(render, source, retained_files)
    for record in frozen:
        verify_identity(record)
    totals = {key: sum(row[key] for row in pixels) for key in ["eligiblePixels", "coveredPixels", "uncoveredPixels", "comparisonPixels"]}
    totals["coverage"] = totals["coveredPixels"] / totals["eligiblePixels"]
    for metric in ["fullCoveredPhotometry", "remainingPixelPhotometry"]:
        entries = [row[metric] for row in pixels if row[metric] is not None]
        total_pixels = sum(row["pixels"] for row in entries)
        totals[metric] = {"pixels": total_pixels, "weightedMeanAbsoluteChannelError255":
            sum(row["pixels"] * row["meanAbsoluteChannelError255"] for row in entries) / total_pixels}
    report = {"schemaVersion": 1, "completed": True, "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "producer": identity(Path(__file__)), "executedProducer": identity(output / "executed-heldout.py"),
        "versions": {name: importlib.metadata.version(name) for name in ["pycolmap", "numpy", "Pillow", "opencv-python-headless"]},
        "localization": identity(localization_path), "render": identity(render_path), "bindings": bindings,
        "poses": poses, "views": pixels, "totals": totals, "frozenInputs": frozen, "frozenInputsUnchanged": True,
        "poseEstimationRerun": False, "frozenDatabaseOpened": False, "photometryRecomputedFromSavedPixels": True,
        "retainedEvidenceOnly": bool(arguments.evidence), "omittedChecks": omitted,
        "limitations": ["Same-sequence adjacent query images and model-relative poses provide a bounded diagnostic; independent capture and surveyed pose accuracy remain unverified.",
            "Pixel verification checks saved rendered colors and alpha against recorded measurements; it does not independently rerender mesh visibility or texture interpolation.",
            "Coverage includes sky and unobserved surfaces. Appearance errors apply only to covered pixels; all uncovered pixels remain in the coverage denominator.",
            "The 32-pixel exclusion masks do not establish independence from all feature descriptor support. Human realism, relighting, ground and full-route acceptance remain unqualified."]}
    (output / "result.json").write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"completed": True, "bindings": bindings, "views": len(pixels), "totals": totals, "output": str(output)}))


if __name__ == "__main__":
    main()
