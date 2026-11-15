import argparse
import hashlib
import importlib.metadata
import itertools
import json
import math
import platform
import shutil
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
import pycolmap
import pycolmap.panorama as panorama
from PIL import Image


def identity(filename):
    data = filename.read_bytes()
    return {"path": str(filename), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def write_json(filename, value):
    filename.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def model_record(model, processor, expected_sources):
    images = [model.image(image_id) for image_id in sorted(model.reg_image_ids())]
    frames = {}
    camera_records = []
    maximum_rotation_error = 0.0
    maximum_center_error = 0.0
    maximum_intrinsic_error = 0.0
    maximum_translation_error = 0.0
    for image in images:
        camera_index, source_name = processor.split_image_name(image.name)
        rig_camera = processor.rig_config.cameras[camera_index]
        expected = pycolmap.Rigid3d() if rig_camera.ref_sensor else rig_camera.cam_from_rig
        observed = image.cam_from_world() * image.frame.rig_from_world.inverse()
        rotation_error = float(np.max(np.abs(expected.rotation.matrix() - observed.rotation.matrix())))
        center = image.projection_center()
        frames.setdefault(image.frame_id, {"source": source_name, "centers": []})["centers"].append(center)
        camera = model.camera(image.camera_id)
        intrinsic_error = float(np.max(np.abs(camera.params - rig_camera.camera.params)))
        maximum_intrinsic_error = max(maximum_intrinsic_error, intrinsic_error)
        maximum_rotation_error = max(maximum_rotation_error, rotation_error)
        maximum_translation_error = max(maximum_translation_error, float(np.max(np.abs(observed.translation))))
        camera_records.append({"image": image.name, "cameraId": image.camera_id, "frameId": image.frame_id,
            "source": source_name, "center": center.tolist(), "camFromWorld": image.cam_from_world().matrix().tolist(),
            "params": camera.params.tolist(), "rigRotationMaximumError": rotation_error,
            "rigTranslationMaximumError": float(np.max(np.abs(observed.translation))),
            "intrinsicMaximumError": intrinsic_error})
    for frame in frames.values():
        maximum_center_error = max(maximum_center_error,
            max(float(np.linalg.norm(center - frame["centers"][0])) for center in frame["centers"]))
    frame_records = [{"frameId": key, "source": value["source"], "center": value["centers"][0].tolist(),
                      "virtualImageCount": len(value["centers"])} for key, value in frames.items()]
    points = []
    physical_angles = []
    observed_frames_per_point = []
    observation_errors = []
    nonpositive_depth_observations = 0
    frame_adjacency = {key: set() for key in frames}
    for point_id, point in model.points3D.items():
        by_frame = {}
        observations = []
        for element in point.track.elements:
            image = model.image(element.image_id)
            by_frame[image.frame_id] = image.projection_center()
            point_camera = image.cam_from_world() * point.xyz
            xy = image.points2D[element.point2D_idx].xy
            predicted = model.camera(image.camera_id).img_from_cam(point_camera)
            error = float(np.linalg.norm(predicted - xy)) if predicted is not None else None
            if error is not None:
                observation_errors.append(error)
            if point_camera[2] <= 0 or predicted is None:
                nonpositive_depth_observations += 1
            observations.append({"imageId": image.image_id, "point2DIndex": element.point2D_idx,
                "xy": xy.tolist(), "cameraDepth": float(point_camera[2]),
                "predictedXy": predicted.tolist() if predicted is not None else None, "errorPixels": error})
        for first, second in itertools.combinations(by_frame, 2):
            frame_adjacency[first].add(second)
            frame_adjacency[second].add(first)
        angles = []
        for first, second in itertools.combinations(by_frame.values(), 2):
            angles.append(math.degrees(pycolmap.calculate_triangulation_angle(first, second, point.xyz)))
        maximum_angle = max(angles) if angles else None
        if maximum_angle is not None:
            physical_angles.append(maximum_angle)
        observed_frames_per_point.append(len(by_frame))
        points.append({"id": point_id, "xyz": point.xyz.tolist(), "rgb": point.color.tolist(),
            "reprojectionErrorPixels": point.error, "physicalFrameCount": len(by_frame),
            "maximumPhysicalTriangulationAngleDegrees": maximum_angle,
            "observations": observations,
            "track": [{"imageId": element.image_id, "point2DIndex": element.point2D_idx} for element in point.track.elements]})
    errors = [point.error for point in model.points3D.values()]
    all_finite = bool(points) and all(np.isfinite(point["xyz"]).all() and math.isfinite(point["reprojectionErrorPixels"]) for point in points)
    all_cameras_finite = bool(camera_records) and all(np.isfinite(camera["center"]).all()
        and np.isfinite(camera["camFromWorld"]).all() for camera in camera_records)
    baselines = [{"frames": [first["frameId"], second["frameId"]],
        "distanceArbitraryUnits": float(np.linalg.norm(np.asarray(first["center"]) - second["center"]))}
        for first, second in itertools.combinations(frame_records, 2)]
    maximum_baseline = max((pair["distanceArbitraryUnits"] for pair in baselines), default=0)
    minimum_baseline_ratio = min((pair["distanceArbitraryUnits"] / maximum_baseline for pair in baselines), default=0) if maximum_baseline > 0 else 0
    visited, pending = set(), list(frames)[:1]
    while pending:
        current = pending.pop()
        if current not in visited:
            visited.add(current)
            pending.extend(frame_adjacency[current] - visited)
    registered_sources = {frame["source"] for frame in frame_records}
    diagnostics = {"atLeastThreeOriginalPanoramas": len(registered_sources) >= 3,
        "finiteCamerasAndNonzeroPoints": all_cameras_finite and all_finite,
        "everyPointAcrossPhysicalFrames": bool(points) and all(count >= 2 for count in observed_frames_per_point),
        "nonCoincidentPhysicalCenters": minimum_baseline_ratio > 1e-6,
        "physicalTrackGraphConnected": bool(frames) and len(visited) == len(frames),
        "positiveDepthForEveryObservation": bool(observation_errors) and nonpositive_depth_observations == 0,
        "knownRigAndIntrinsicsPreserved": max(maximum_rotation_error, maximum_translation_error, maximum_intrinsic_error, maximum_center_error) <= 1e-8,
        "physicalParallaxAtLeastDefaultFilter": bool(physical_angles) and min(physical_angles) >= 1.5 - 1e-6,
        "observationErrorsWithinDefaultFilter": bool(observation_errors) and max(observation_errors) <= 4 + 1e-6}
    return {"registeredVirtualImages": len(images), "registeredPhysicalFrames": len(frames),
        "registeredPanoramas": sorted({frame["source"] for frame in frame_records}),
        "points3D": model.num_points3D(), "frames": frame_records, "cameras": camera_records, "points": points,
        "meanReprojectionErrorPixels": model.compute_mean_reprojection_error(),
        "p95ReprojectionErrorPixels": float(np.percentile(errors, 95)) if errors else None,
        "meanTrackLength": model.compute_mean_track_length(),
        "pointsAcrossAtLeastTwoPhysicalFrames": sum(count >= 2 for count in observed_frames_per_point),
        "pointsAcrossThreePhysicalFrames": sum(count >= 3 for count in observed_frames_per_point),
        "medianMaximumPhysicalTriangulationAngleDegrees": float(np.median(physical_angles)) if physical_angles else None,
        "minimumMaximumPhysicalTriangulationAngleDegrees": min(physical_angles) if physical_angles else None,
        "maximumRigRotationError": maximum_rotation_error, "maximumSameFrameCenterError": maximum_center_error,
        "maximumRigTranslationError": maximum_translation_error,
        "maximumIntrinsicError": maximum_intrinsic_error, "finitePointsAndErrors": all_finite,
        "finiteCameras": all_cameras_finite, "physicalBaselines": baselines,
        "minimumToMaximumPhysicalBaselineRatio": minimum_baseline_ratio,
        "physicalTrackGraph": {str(frame): sorted(neighbors) for frame, neighbors in frame_adjacency.items()},
        "maximumObservedReprojectionErrorPixels": max(observation_errors) if observation_errors else None,
        "p95ObservedReprojectionErrorPixels": float(np.percentile(observation_errors, 95)) if observation_errors else None,
        "nonpositiveDepthObservations": nonpositive_depth_observations,
        "registeredAllInputPanoramas": set(expected_sources) == registered_sources,
        "missingInputPanoramas": sorted(set(expected_sources) - registered_sources),
        "relativeCameraDiagnostics": diagnostics, "relativeCameraDiagnosticPass": all(diagnostics.values())}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--intake", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--selection-reference", type=Path, required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    intake, output = args.intake.resolve(), args.output.resolve()
    assert intake.is_relative_to(root / "artifacts")
    assert output.is_relative_to(root / "artifacts/realism-01/connector-rig") and not output.exists()
    output.mkdir(parents=True)
    selected_path = intake / "selected.json"
    selected = json.loads(selected_path.read_text())
    assert len(selected) >= 3 and len({source["id"] for source in selected}) == len(selected)
    assert len({source["collection"] for source in selected}) == 1
    frozen = args.selection_reference.resolve()
    assert frozen.is_relative_to(root / "experience/evidence")
    assert selected_path.read_bytes() == frozen.read_bytes()
    upstream = Path(panorama.__file__)
    frozen_upstream = root / "experience/evidence/realism-01/connector-reconstruction/spherical/producers/upstream-panorama.py"
    assert upstream.read_bytes() == frozen_upstream.read_bytes()
    shutil.copyfile(Path(__file__), output / "executed-run.py")
    shutil.copyfile(upstream, output / "upstream-panorama.py")
    shutil.copyfile(selected_path, output / "selected.json")
    source_dir, image_dir, mask_dir = (output / name for name in ["sources", "images", "masks"])
    for directory in [source_dir, image_dir, mask_dir]:
        directory.mkdir()
    report = {"schemaVersion": 1, "startedAt": datetime.now(timezone.utc).isoformat(), "completed": False,
        "method": "Official COLMAP panorama projection and fixed shared camera rig; upper-hemisphere features",
        "producer": identity(Path(__file__).resolve()), "upstream": identity(upstream),
        "selection": identity(selected_path), "selectionReference": identity(frozen),
        "sourcePanoramaCount": len(selected), "python": platform.python_version(),
        "versions": {name: importlib.metadata.version(name) for name in ["pycolmap", "opencv-python-headless", "numpy", "Pillow"]},
        "conditions": {"threads": 2, "device": "CPU", "randomSeed": 0, "virtualCamerasPerPanorama": 12,
            "pitchesDegrees": [-35, 0, 35], "horizontalFieldOfViewDegrees": 90, "verticalFieldOfViewDegrees": 90,
            "projection": "Unmodified pycolmap.panorama.PanoProcessor", "rigVerification": True,
            "samePhysicalFrameMatching": False, "sourceGpsUsedForFitting": False,
            "featureMask": "Official closest-camera partition intersected with the original panorama upper hemisphere",
            "geometricInitialization": "Installed IncrementalPipelineOptions defaults, including automatic library retries",
            "calibration": "Known virtual projection intrinsics and sensor-from-rig poses fixed during pose estimation and bundle adjustment",
            "relativeCameraDiagnosticCriteria": {"minimumOriginalPanoramas": 3,
                "minimumToMaximumBaselineRatioExclusive": 1e-6, "maximumRigIntrinsicError": 1e-8,
                "minimumAcutePhysicalParallaxDegrees": 1.5, "maximumObservationReprojectionErrorPixels": 4,
                "requiresFiniteNonzeroStructure": True, "requiresConnectedPhysicalTracks": True,
                "requiresPositiveDepth": True}},
        "sources": [], "rendered": [], "pairs": [], "models": [],
        "limitations": ["Selected source cameras lie west of the first route edge; eastbound connector coverage remains unqualified.",
            "Known projection rotations do not establish physical stitching calibration or surveyed camera poses.",
            "Upper-hemisphere masking excludes ground and capture-vehicle reflection; traffic and stitching can remain above the horizon.",
            "Relative sparse structure has arbitrary scale and establishes no continuous floor, collision, lighting or independent-recognition acceptance.",
            "Virtual cameras from one panorama share a center and count as one physical frame."]}
    report_path = output / "result.json"
    write_json(report_path, report)
    for source in selected:
        assert source["license"] == "CC-BY-SA-4.0" and source["projection"] == "equirectangular"
        filename = intake / f'{source["id"]}-hd.jpg'
        receipt_path = filename.with_name(filename.name + ".receipt.json")
        receipt = json.loads(receipt_path.read_text())
        actual = identity(filename)
        assert receipt["status"] == 200 and receipt["bytes"] == actual["bytes"] and receipt["sha256"] == actual["sha256"]
        with Image.open(filename) as image:
            assert image.size == (6080, 3040) == tuple(source["camera"]["sensor_array_dimensions"])
        shutil.copyfile(filename, source_dir / f'{source["id"]}.jpg')
        report["sources"].append({**source, "file": actual, "receipt": identity(receipt_path)})
    cv2.setNumThreads(2)
    pycolmap.set_random_seed(0)
    processor = panorama.PanoProcessor(source_dir, image_dir, mask_dir,
        panorama.PANO_RENDER_OPTIONS[panorama.PanoRenderType.PERSPECTIVE_OVERLAPPING])
    report["stage"] = "rendering"
    write_json(report_path, report)
    for source in selected:
        processor.process(f'{source["id"]}.jpg')
    camera = processor.rig_config.cameras[0].camera
    assert camera.width == camera.height == 1520
    rays = panorama.get_virtual_camera_rays(camera)
    for index, rotation in enumerate(processor.cams_from_pano_rotation):
        # 掩码按原始球面射线判定半球，保留官方虚拟相机分区。
        upper = ((rays @ rotation)[:, 1] < 0).reshape(camera.width, camera.height).T
        for source in selected:
            name = f'pano_camera{index}/{source["id"]}.jpg'
            mask_path = mask_dir / f"{name}.png"
            with Image.open(mask_path) as image:
                original_mask = np.asarray(image.convert("L"))
            retained_mask = np.where(upper, original_mask, 0).astype(np.uint8)
            Image.fromarray(retained_mask).save(mask_path)
            report["rendered"].append({"image": identity(image_dir / name), "mask": identity(mask_path),
                "cameraIndex": index, "sourceId": source["id"], "retainedPixels": int(np.count_nonzero(retained_mask)),
                "partitionPixels": int(np.count_nonzero(original_mask)), "originalHemisphereMask": True})
    report["rig"] = {"camera": {"model": camera.model_name, "width": camera.width, "height": camera.height,
        "params": camera.params.tolist(), "hasPriorFocalLength": camera.has_prior_focal_length},
        "rotationsFromPanorama": [matrix.tolist() for matrix in processor.cams_from_pano_rotation]}
    database_path = output / "database.db"
    extraction = pycolmap.FeatureExtractionOptions(use_gpu=False, num_threads=2)
    reader = pycolmap.ImageReaderOptions(mask_path=mask_dir, camera_model=camera.model_name, camera_params=camera.params_to_string())
    matching = pycolmap.FeatureMatchingOptions(use_gpu=False, num_threads=2, rig_verification=True, skip_image_pairs_in_same_frame=True)
    geometry = pycolmap.TwoViewGeometryOptions(compute_relative_pose=True)
    geometry.ransac.random_seed = 0
    mapping = pycolmap.IncrementalPipelineOptions(num_threads=2, random_seed=0,
        ba_refine_sensor_from_rig=False, ba_refine_focal_length=False,
        ba_refine_principal_point=False, ba_refine_extra_params=False)
    mapping.mapper.abs_pose_refine_focal_length = False
    mapping.mapper.abs_pose_refine_extra_params = False
    assert mapping.use_prior_position is False
    settings = {name: value.summary() for name, value in [("reader", reader), ("extraction", extraction),
        ("matching", matching), ("verification", geometry), ("mapping", mapping)]}
    write_json(output / "settings.json", settings)
    report["settings"] = identity(output / "settings.json")
    report["stage"] = "feature-extraction"
    write_json(report_path, report)
    pycolmap.extract_features(database_path, image_dir, reader_options=reader,
        camera_mode=pycolmap.CameraMode.PER_FOLDER, extraction_options=extraction, device=pycolmap.Device.cpu)
    with pycolmap.Database.open(database_path) as database:
        pycolmap.apply_rig_config([processor.rig_config], database)
        report["databaseRigCount"] = len(database.read_all_rigs())
        report["databasePhysicalFrames"] = [{"frameId": frame.frame_id, "rigId": frame.rig_id,
            "dataCount": frame.num_data_ids()} for frame in database.read_all_frames()]
        report["databasePosePriors"] = len(database.read_all_pose_priors())
    report["stage"] = "matching"
    write_json(report_path, report)
    pycolmap.match_exhaustive(database_path, matching_options=matching, verification_options=geometry, device=pycolmap.Device.cpu)
    with pycolmap.Database.open(database_path) as database:
        images = sorted(database.read_all_images(), key=lambda image: image.image_id)
        report["features"] = [{"image": image.name, "frameId": image.frame_id, "count": len(database.read_keypoints(image.image_id))} for image in images]
        pair_ids, _ = database.read_two_view_geometry_num_inliers()
        for pair_id in pair_ids:
            first_id, second_id = pycolmap.pair_id_to_image_pair(pair_id)
            first = database.read_image(first_id)
            second = database.read_image(second_id)
            two_view = database.read_two_view_geometry(first_id, second_id)
            angle = two_view.tri_angle
            report["pairs"].append({"images": [first.name, second.name], "frames": [first.frame_id, second.frame_id],
                "tentativeMatches": len(database.read_matches(first_id, second_id)), "verifiedInliers": len(two_view.inlier_matches),
                "configuration": str(pycolmap.TwoViewGeometryConfiguration(two_view.config)),
                "databaseTriangulationAngleDegrees": math.degrees(angle) if math.isfinite(angle) and angle >= 0 else None,
                "triangulationAngleMethod": "Database read; unavailable sentinel remains null. Model ray angles are computed separately."})
    report["stage"] = "sparse-reconstruction"
    write_json(report_path, report)
    models = pycolmap.incremental_mapping(database_path, image_dir, output / "sparse", mapping)
    for model_id, model in models.items():
        record = model_record(model, processor, [f'{source["id"]}.jpg' for source in selected])
        record["id"] = model_id
        converted = processor.convert_to_equirectangular(model)
        destination = output / "sparse_equirectangular" / str(model_id)
        destination.mkdir(parents=True)
        converted.write(destination)
        record["convertedPanoramaImages"] = converted.num_reg_images()
        record["convertedPoints3D"] = converted.num_points3D()
        report["models"].append(record)
    report["completed"] = True
    report["stage"] = "complete"
    report["finishedAt"] = datetime.now(timezone.utc).isoformat()
    report["database"] = identity(database_path)
    report["files"] = [identity(filename) for filename in sorted(output.rglob("*")) if filename.is_file() and filename != report_path]
    write_json(report_path, report)
    print(json.dumps({"report": str(report_path), "completed": True, "models": len(report["models"]),
        "relativeCameraDiagnosticPasses": sum(model["relativeCameraDiagnosticPass"] for model in report["models"])}))


if __name__ == "__main__":
    main()
