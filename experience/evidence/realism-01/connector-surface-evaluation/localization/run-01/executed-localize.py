import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import shutil

import cv2
import numpy as np
import pycolmap
import pycolmap.panorama as panorama
from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
WORKSPACE = ROOT / "artifacts/realism-01/connector-surface-evaluation"
ORIGINAL = ROOT / "experience/evidence/realism-01/connector-rig/run-02"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def identity(path):
    return {"path": str(path), "bytes": path.stat().st_size, "sha256": digest(path)}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def pose_options():
    estimation = pycolmap.RANSACOptions(random_seed=0)
    refinement = pycolmap.AbsolutePoseRefinementOptions()
    assert estimation.max_error == 4.0
    assert not refinement.refine_focal_length and not refinement.refine_extra_params
    assert not refinement.use_position_prior
    return estimation, refinement


def cameras_and_rig(model):
    cameras, transforms = {}, {}
    for image in model.images.values():
        index = int(image.name.partition("/")[0].removeprefix("pano_camera"))
        camera = image.camera
        transform = image.cam_from_world() * image.frame.rig_from_world.inverse()
        if index in cameras:
            assert np.array_equal(cameras[index].params, camera.params)
            assert np.allclose(transforms[index].matrix(), transform.matrix(), atol=1e-12, rtol=0)
        cameras[index] = camera
        transforms[index] = transform
    assert set(cameras) == set(range(12))
    return [cameras[index] for index in range(12)], [transforms[index] for index in range(12)]


def solve_pose(model, associations):
    cameras, transforms = cameras_and_rig(model)
    estimation, refinement = pose_options()
    points2d = np.asarray([row["xy"] for row in associations], dtype=float).reshape(-1, 2)
    points3d = np.asarray([model.point3D(row["point3DId"]).xyz for row in associations], dtype=float).reshape(-1, 3)
    camera_indices = [row["cameraIndex"] for row in associations]
    result = None
    if len(associations) >= 3:
        pycolmap.set_random_seed(0)
        result = pycolmap.estimate_and_refine_generalized_absolute_pose(
            points2d, points3d, camera_indices, transforms, cameras, estimation, refinement)
    if result is None:
        return {"poseRecovered": False, "localizationEligible": False, "associations": len(associations)}
    pose = result["rig_from_world"]
    observations = []
    for index, row in enumerate(associations):
        camera_index = row["cameraIndex"]
        camera_pose = transforms[camera_index] * pose
        point_camera = camera_pose * points3d[index]
        projected = cameras[camera_index].img_from_cam(point_camera)
        error = float(np.linalg.norm(projected - points2d[index])) if projected is not None else None
        observations.append({"association": index, "ransacInlier": bool(result["inlier_mask"][index]),
            "positiveDepth": bool(point_camera[2] > 0), "depth": float(point_camera[2]),
            "projected": projected.tolist() if projected is not None else None,
            "errorPixels": error})
    inliers = [row for row in observations if row["ransacInlier"]]
    unique_inliers = {associations[row["association"]]["point3DId"] for row in inliers}
    unique_points = {row["point3DId"] for row in associations}
    ratio = len(unique_inliers) / len(unique_points)
    eligible = len(unique_inliers) >= 30 and ratio >= 0.25 and all(
        row["positiveDepth"] and row["errorPixels"] is not None and row["errorPixels"] <= 4 for row in inliers)
    assert np.isfinite(pose.matrix()).all()
    errors = [row["errorPixels"] for row in inliers if row["errorPixels"] is not None]
    inlier_cameras = Counter(associations[row["association"]]["cameraIndex"] for row in inliers)
    fit_images = {image.image_id: image for image in model.images.values()}
    support_frames = {fit_images[element.image_id].frame_id for point_id in unique_inliers
        for element in model.point3D(point_id).track.elements}
    return {"poseRecovered": True, "localizationEligible": eligible,
        "rigFromWorld": pose.matrix().tolist(), "center": pose.inverse().translation.tolist(),
        "uniqueInliers": len(unique_inliers), "officialUniqueInliers": int(result["num_inliers"]),
        "uniqueCandidatePoints": len(unique_points), "uniqueInlierRatio": ratio,
        "inlierObservations": len(inliers), "inlierVirtualCameras": dict(sorted(inlier_cameras.items())),
        "pointSupportPhysicalFitFrames": sorted(support_frames),
        "inlierErrorPixels": {"median": float(np.median(errors)), "p95": float(np.percentile(errors, 95)), "maximum": max(errors)},
        "allInlierDepthsPositive": all(row["positiveDepth"] for row in inliers),
        "cameraFromWorld": [{"cameraIndex": index, "matrix": (transform * pose).matrix().tolist(),
            "model": cameras[index].model_name, "width": cameras[index].width, "height": cameras[index].height,
            "params": cameras[index].params.tolist()} for index, transform in enumerate(transforms)],
        "observations": observations}


def localize(source_root, output):
    assert source_root.is_relative_to(ROOT / "artifacts")
    assert output.is_relative_to(WORKSPACE) and not output.exists()
    output.mkdir(parents=True)
    shutil.copyfile(Path(__file__), output / "executed-localize.py")
    frozen = json.loads((ORIGINAL / "result.json").read_text())
    selected = {role: json.loads((source_root / role / "selected.json").read_text()) for role in ["fit", "holdout"]}
    assert [row["rank"] for row in selected["fit"]] == [68, 69, 70, 71]
    assert [row["rank"] for row in selected["holdout"]] == [67, 72]
    assert (source_root / "fit/selected.json").read_bytes() == (ORIGINAL / "selected.json").read_bytes()
    assignment = json.loads((source_root / "assignment.json").read_text())
    source_hashes = {str(path.relative_to(ORIGINAL)): digest(path) for path in sorted((ORIGINAL / "sparse/0").glob("*.bin"))}
    model = pycolmap.Reconstruction(ORIGINAL / "sparse/0")
    assert model.num_points3D() == 1377 and model.num_reg_images() == 48
    assert Path(panorama.__file__).read_bytes() == (ORIGINAL / "producers/upstream-panorama.py").read_bytes()
    estimation, refinement = pose_options()
    report = {"schemaVersion": 1, "startedAt": datetime.now(timezone.utc).isoformat(), "completed": False,
        "producer": identity(Path(__file__)), "assignment": assignment, "assignmentIdentity": identity(source_root / "assignment.json"),
        "modelFileHashes": source_hashes, "sources": selected,
        "versions": {name: importlib.metadata.version(name) for name in ["pycolmap", "numpy", "Pillow", "opencv-python-headless"]},
        "settings": {"poseEstimation": estimation.summary(), "poseRefinement": refinement.summary(),
            "matchPairs": "Each held-out view to all four fitting views with the same virtual-camera index; 96 predeclared pairs",
            "ambiguousAssociations": "Exclude any query keypoint with conflicting 3D identities or any point assigned to multiple query keypoints within one virtual view",
            "eligibility": {"minimumUniqueInliers": 30, "minimumUniqueInlierRatio": 0.25,
                "maximumRefinedInlierErrorPixels": 4, "requiresPositiveDepth": True},
            "fitModelUpdates": False, "queryImagesUsedForSurfaceFitting": False, "sourceGpsUsed": False},
        "images": [], "features": [], "pairs": [], "queries": [],
        "limitations": ["Same-sequence adjacent views support a bounded view-generalization diagnostic; capture-family independence and recognition remain unverified.",
            "Query poses depend on the frozen arbitrary-scale sparse model and actual image correspondences; no surveyed pose ground truth is available.",
            "Only source upper-hemisphere features are used. Ground, metric scale, route coverage and visual acceptance remain unqualified."]}
    report_path = output / "result.json"
    write_json(report_path, report)
    source_directory, image_directory, mask_directory = [output / name for name in ["sources", "images", "masks"]]
    for directory in [source_directory, image_directory, mask_directory]:
        directory.mkdir()
    original_sources = {row["id"]: row for row in frozen["sources"]}
    for role in selected:
        for row in selected[role]:
            source = source_root / role / (row["id"] + "-hd.jpg")
            receipt = json.loads(source.with_name(source.name + ".receipt.json").read_text())
            assert digest(source) == receipt["sha256"] and source.stat().st_size == receipt["bytes"]
            assert row["license"] == "CC-BY-SA-4.0" and row["camera"]["sensor_array_dimensions"] == [6080, 3040]
            if role == "fit":
                assert digest(source) == original_sources[row["id"]]["file"]["sha256"]
            shutil.copyfile(source, source_directory / (row["id"] + ".jpg"))
    cv2.setNumThreads(2)
    pycolmap.set_random_seed(0)
    processor = panorama.PanoProcessor(source_directory, image_directory, mask_directory,
        panorama.PANO_RENDER_OPTIONS[panorama.PanoRenderType.PERSPECTIVE_OVERLAPPING])
    report["stage"] = "projecting"
    write_json(report_path, report)
    expected_images = {str(Path(row["image"]["path"]).relative_to(Path(frozen["database"]["path"]).parent / "images")): row["image"] for row in frozen["rendered"]}
    for role in selected:
        for row in selected[role]:
            processor.process(row["id"] + ".jpg")
            for camera_index in range(12):
                name = f'pano_camera{camera_index}/{row["id"]}.jpg'
                filename = image_directory / name
                if role == "fit":
                    assert digest(filename) == expected_images[name]["sha256"], name
                shutil.copyfile(ORIGINAL / f"masks/pano_camera{camera_index}.png", mask_directory / (name + ".png"))
                report["images"].append({"name": name, "role": role, "sourceId": row["id"], "cameraIndex": camera_index,
                    "sha256": digest(filename), "bytes": filename.stat().st_size})
    database_path = output / "features.db"
    camera = processor.rig_config.cameras[0].camera
    reader = pycolmap.ImageReaderOptions(mask_path=mask_directory, camera_model=camera.model_name, camera_params=camera.params_to_string())
    extraction = pycolmap.FeatureExtractionOptions(use_gpu=False, num_threads=2)
    report["settings"].update({"reader": reader.summary(), "extraction": extraction.summary()})
    report["stage"] = "features"
    write_json(report_path, report)
    pycolmap.extract_features(database_path, image_directory, reader_options=reader, camera_mode=pycolmap.CameraMode.PER_FOLDER,
        extraction_options=extraction, device=pycolmap.Device.cpu)
    frozen_observations = json.loads((ORIGINAL / "observations.json").read_text())
    original_names = {row["name"]: row for row in frozen_observations["images"]}
    keypoints = {}
    with pycolmap.Database.open(database_path) as database, np.load(ORIGINAL / "observations.npz", allow_pickle=False) as originals:
        database_images = {image.name: image for image in database.read_all_images()}
        for row in report["images"]:
            image = database_images[row["name"]]
            points = database.read_keypoints(image.image_id)
            keypoints[image.image_id] = points
            binding = None
            if row["role"] == "fit":
                expected = originals[original_names[image.name]["keypointsKey"]]
                assert np.array_equal(points, expected), f"Exact fitting keypoint binding: {image.name}"
                binding = original_names[image.name]["imageId"]
            report["features"].append({"image": image.name, "imageId": image.image_id, "count": len(points),
                "frozenImageId": binding, "exactKeypointBinding": binding is not None})
    pairs = [(f'pano_camera{index}/{query["id"]}.jpg', f'pano_camera{index}/{fit["id"]}.jpg')
        for query in selected["holdout"] for index in range(12) for fit in selected["fit"]]
    pair_path = output / "pairs.txt"
    pair_path.write_text("".join(f"{first} {second}\n" for first, second in pairs))
    matching = pycolmap.FeatureMatchingOptions(use_gpu=False, num_threads=2)
    verification = pycolmap.TwoViewGeometryOptions(compute_relative_pose=True)
    verification.ransac.random_seed = 0
    pairing = pycolmap.ImportedPairingOptions(match_list_path=pair_path)
    report["settings"].update({"matching": matching.summary(), "verification": verification.summary(), "pairing": pairing.summary()})
    report["stage"] = "matching"
    write_json(report_path, report)
    pycolmap.match_image_pairs(database_path, matching_options=matching, pairing_options=pairing,
        verification_options=verification, device=pycolmap.Device.cpu)
    model_images = {image.name: image for image in model.images.values()}
    candidates = defaultdict(lambda: defaultdict(list))
    with pycolmap.Database.open(database_path) as database:
        for query_name, fit_name in pairs:
            query_image, fit_image = database_images[query_name], database_images[fit_name]
            geometry = database.read_two_view_geometry(query_image.image_id, fit_image.image_id)
            matches = geometry.inlier_matches
            pair_record = {"query": query_name, "fit": fit_name, "queryImageId": query_image.image_id,
                "fitImageId": fit_image.image_id, "tentative": len(database.read_matches(query_image.image_id, fit_image.image_id)),
                "verified": len(matches), "configuration": int(geometry.config), "inliers": matches.tolist()}
            report["pairs"].append(pair_record)
            for query_index, fit_index in matches:
                point = model_images[fit_name].points2D[int(fit_index)]
                if point.has_point3D():
                    candidates[(query_name, int(query_index))][point.point3D_id].append(
                        {"fitImage": fit_name, "fitFeature": int(fit_index), "frozenImageId": model_images[fit_name].image_id})
    report["stage"] = "pose-localization"
    write_json(report_path, report)
    for query in selected["holdout"]:
        selected_candidates = {key: values for key, values in candidates.items() if key[0].endswith(query["id"] + ".jpg")}
        unique = {key: next(iter(values)) for key, values in selected_candidates.items() if len(values) == 1}
        multiplicity = Counter((key[0], point_id) for key, point_id in unique.items())
        associations = []
        for (name, feature_index), point_id in sorted(unique.items()):
            if multiplicity[(name, point_id)] != 1:
                continue
            image_id = database_images[name].image_id
            associations.append({"queryImage": name, "queryFeature": feature_index,
                "cameraIndex": int(name.partition("/")[0].removeprefix("pano_camera")),
                "xy": keypoints[image_id][feature_index, :2].tolist(), "point3DId": int(point_id),
                "xyz": model.point3D(point_id).xyz.tolist(), "supportingMatches": selected_candidates[(name, feature_index)][point_id]})
        result = solve_pose(model, associations)
        report["queries"].append({"sourceId": query["id"], "rank": query["rank"],
            "matchedQueryKeypoints": len(selected_candidates), "conflictingPointIdentities": sum(len(values) != 1 for values in selected_candidates.values()),
            "duplicateQueryAssignmentsRemoved": sum(multiplicity[(key[0], point_id)] != 1 for key, point_id in unique.items()),
            "associations": associations, "pose": result})
        write_json(report_path, report)
    report["stage"] = "complete"
    report["completed"] = True
    report["finishedAt"] = datetime.now(timezone.utc).isoformat()
    report["fittingModelUnchanged"] = all(digest(ORIGINAL / name) == value for name, value in source_hashes.items())
    assert report["fittingModelUnchanged"]
    report["database"] = identity(database_path)
    write_json(report_path, report)
    print(json.dumps({"completed": True, "output": str(output), "queries": [{"rank": query["rank"],
        "poseRecovered": query["pose"]["poseRecovered"], "eligible": query["pose"]["localizationEligible"],
        "inliers": query["pose"].get("uniqueInliers")} for query in report["queries"]]}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    localize(arguments.source_root.resolve(), arguments.output.resolve())


if __name__ == "__main__":
    main()
