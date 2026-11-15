import argparse
import hashlib
import itertools
import json
import math
from datetime import datetime
from pathlib import Path

import numpy as np
import pycolmap
import pycolmap.panorama as panorama
from PIL import Image


def require(condition, description):
    if not condition:
        raise AssertionError(description)


def read_json(path):
    return json.loads(path.read_text())


def check_identity(path, record):
    contents = path.read_bytes()
    require(len(contents) == record["bytes"], f"Byte count: {path}")
    require(hashlib.sha256(contents).hexdigest() == record["sha256"], f"SHA-256: {path}")


def close(actual, expected, description, tolerance=1e-8):
    require(np.shape(actual) == np.shape(expected), f"Shape: {description}")
    require(np.allclose(actual, expected, rtol=0, atol=tolerance, equal_nan=False), description)


def view_name(name):
    prefix, source = name.partition("/")[::2]
    require(prefix.startswith("pano_camera") and source.endswith(".jpg"), f"Virtual image name: {name}")
    index = int(prefix.removeprefix("pano_camera"))
    require(0 <= index < 12 and "/" not in source, f"Virtual camera index: {name}")
    return index, source


def verify_manifest(evidence):
    manifest = read_json(evidence / "manifest.json")
    indexed = {}
    for entry in manifest["files"]:
        name = entry["path"]
        unresolved = evidence / name
        require(not unresolved.is_symlink(), f"Evidence symlink: {name}")
        path = unresolved.resolve()
        require(path.is_relative_to(evidence) and path.is_file(), f"Manifest path: {name}")
        require(name not in indexed, f"Duplicate manifest entry: {name}")
        check_identity(path, entry)
        for key in ["source", "date", "rights", "location", "method", "limitations"]:
            require(bool(entry[key]), f"Missing provenance {key}: {name}")
        datetime.fromisoformat(entry["date"].replace("Z", "+00:00"))
        indexed[name] = entry
    required = {"result.json", "settings.json", "selected.json", "observations.json", "observations.npz", "database-export.json",
        "producers/run.py", "producers/upstream-panorama.py"}
    require(required <= indexed.keys(), "Required retained evidence records")
    return manifest, indexed


def verify_sources(evidence, result, selected, indexed):
    require(len(selected) >= 3, "At least three original inputs")
    require(len({entry["id"] for entry in selected}) == len(selected), "Unique original source IDs")
    require(len({entry["collection"] for entry in selected}) == 1, "One native source sequence")
    require(len(result["sources"]) == len(selected), "Executed source count")
    require(result.get("sourcePanoramaCount", len(selected)) == len(selected), "Reported original source count")
    check_identity(evidence / "selected.json", result["selection"])
    if "selectionReference" in result:
        check_identity(evidence / "selected.json", result["selectionReference"])
    check_identity(evidence / "producers/run.py", result["producer"])
    check_identity(evidence / "producers/upstream-panorama.py", result["upstream"])
    require(Path(panorama.__file__).read_bytes() == (evidence / "producers/upstream-panorama.py").read_bytes(),
        "Installed official projection source must match retained source")
    require(pycolmap.__version__ == result["versions"]["pycolmap"] == "4.2.1", "Pinned pycolmap version")
    for source, executed in zip(selected, result["sources"], strict=True):
        require(all(executed[key] == value for key, value in source.items()), f"Executed metadata: {source['id']}")
        require(source["license"] == "CC-BY-SA-4.0", "Source license")
        require(source["projection"] == "equirectangular", "Source projection")
        require(source["camera"]["sensor_array_dimensions"] == [6080, 3040], "Native source dimensions")
        require(bool(source["providers"]) and len(source["coordinates"]) == 2, "Attribution and declared location")
        receipt_name = f"sources/{source['id']}.receipt.json"
        require(receipt_name in indexed, f"Indexed receipt: {source['id']}")
        receipt_path = evidence / receipt_name
        check_identity(receipt_path, executed["receipt"])
        receipt = read_json(receipt_path)
        require(receipt["status"] == 200 and receipt["url"] == source["assets"]["hd"]["href"], "Acquired source URL")
        require(receipt["bytes"] == executed["file"]["bytes"] and receipt["sha256"] == executed["file"]["sha256"],
            "Source file identity and HTTP receipt")
    return {f"{source['id']}.jpg" for source in selected}


def verify_settings(evidence, result, camera):
    settings = read_json(evidence / "settings.json")
    check_identity(evidence / "settings.json", result["settings"])
    mask_path = Path(result["database"]["path"]).parent / "masks"
    reader = pycolmap.ImageReaderOptions(mask_path=mask_path, camera_model=camera.model_name,
        camera_params=camera.params_to_string())
    extraction = pycolmap.FeatureExtractionOptions(use_gpu=False, num_threads=2)
    matching = pycolmap.FeatureMatchingOptions(use_gpu=False, num_threads=2, rig_verification=True,
        skip_image_pairs_in_same_frame=True)
    verification = pycolmap.TwoViewGeometryOptions(compute_relative_pose=True)
    verification.ransac.random_seed = 0
    mapping = pycolmap.IncrementalPipelineOptions(num_threads=2, random_seed=0,
        ba_refine_sensor_from_rig=False, ba_refine_focal_length=False,
        ba_refine_principal_point=False, ba_refine_extra_params=False)
    mapping.mapper.abs_pose_refine_focal_length = False
    mapping.mapper.abs_pose_refine_extra_params = False
    for key, value in [("reader", reader), ("extraction", extraction), ("matching", matching),
            ("verification", verification), ("mapping", mapping)]:
        require(settings[key] == value.summary(), f"Exact default settings and declared overrides: {key}")
    conditions = result["conditions"]
    for key, value in {"threads": 2, "device": "CPU", "randomSeed": 0, "virtualCamerasPerPanorama": 12,
            "pitchesDegrees": [-35, 0, 35], "horizontalFieldOfViewDegrees": 90,
            "verticalFieldOfViewDegrees": 90, "rigVerification": True,
            "samePhysicalFrameMatching": False, "sourceGpsUsedForFitting": False}.items():
        require(conditions[key] == value, f"Trial conditions: {key}")
    return mapping


def verify_masks(evidence, result, indexed, camera, rotations):
    rays = panorama.get_virtual_camera_rays(camera)
    axes = np.asarray(rotations)[:, 2, :]
    masks = {}
    for index, rotation in enumerate(rotations):
        name = f"masks/pano_camera{index}.png"
        require(name in indexed, f"Indexed camera mask: {index}")
        with Image.open(evidence / name) as image:
            observed = np.asarray(image.convert("L"))
        require(observed.shape == (camera.height, camera.width), "Mask dimensions")
        expected = np.zeros(len(rays), dtype=np.uint8)
        partition_count = 0
        # 按官方射线投影逐段核对原始半球与最近相机分区。
        for start in range(0, len(rays), 200000):
            directions = rays[start:start + 200000] @ rotation
            closest = np.argmax(directions @ axes.T, axis=1) == index
            partition_count += int(np.count_nonzero(closest))
            expected[start:start + len(directions)] = (closest & (directions[:, 1] < 0)) * 255
        expected = expected.reshape(camera.width, camera.height).T
        require(np.array_equal(observed, expected), f"Exact original hemisphere mask: {index}")
        for render in [item for item in result["rendered"] if item["cameraIndex"] == index]:
            check_identity(evidence / name, render["mask"])
            require(render["retainedPixels"] == int(np.count_nonzero(expected)), "Retained mask pixels")
            require(render["partitionPixels"] == partition_count, "Official partition pixels")
            require(render["originalHemisphereMask"] is True, "Original hemisphere mask declaration")
        masks[index] = observed
    return masks


def verify_observations(evidence, result, observations, arrays, camera, rotations, masks, sources, mapping):
    images = {item["imageId"]: item for item in observations["images"]}
    require(len(images) == len(observations["images"]) == len(sources) * 12, "Original sources × virtual sensors")
    require(len(result["features"]) == len(images) == len(result["rendered"]), "Executed image counts")
    expected_views = {(index, source) for index in range(12) for source in sources}
    require({view_name(item["name"]) for item in images.values()} == expected_views, "All original source views")
    recorded_features = {item["image"]: item for item in result["features"]}
    frames = {item["id"]: item for item in observations["frames"]}
    cameras = {item["id"]: item for item in observations["cameras"]}
    require(len(frames) == len(sources) and len(cameras) == 12, "Physical frame and shared camera counts")
    require(result["databaseRigCount"] == len(observations["rigs"]) == 1, "One shared rig")
    require(result["databasePosePriors"] == 0, "No fitted source position priors")
    require(observations["posePriorCount"] == 0, "Exported position prior count")
    require({item["frameId"] for item in result["databasePhysicalFrames"]} == frames.keys(), "Recorded frame IDs")
    camera_indices = {}
    frame_sources = {}
    used_keys = set()
    feature_count = 0
    continuous_horizon_exceptions = 0
    for image_id, image in images.items():
        index, source = view_name(image["name"])
        require(image["cameraIndex"] == index and image["sourceId"] + ".jpg" == source, "Exported source association")
        require(image["width"] == camera.width and image["height"] == camera.height, "Exported image dimensions")
        require(image["maskPath"] == f"masks/pano_camera{index}.png", "Exported original mask")
        camera_indices.setdefault(image["cameraId"], index)
        require(camera_indices[image["cameraId"]] == index, "Shared sensor identity across frames")
        frame_sources.setdefault(image["frameId"], source)
        require(frame_sources[image["frameId"]] == source, "One physical panorama per frame")
        keypoints = arrays[image["keypointsKey"]]
        used_keys.add(image["keypointsKey"])
        require(keypoints.ndim == 2 and keypoints.shape[1] in [2, 4, 6], "Native keypoint array shape")
        require(np.isfinite(keypoints).all(), "Finite original keypoints")
        require(len(keypoints) == image["features"] == recorded_features[image["name"]]["count"], "Feature count")
        require(recorded_features[image["name"]]["frameId"] == image["frameId"], "Feature physical frame")
        xy = keypoints[:, :2]
        require(((xy >= 0) & (xy < [camera.width, camera.height])).all(), "Keypoints inside image")
        pixels = np.floor(xy).astype(int)
        require(np.all(masks[index][pixels[:, 1], pixels[:, 0]] > 0), "Every keypoint belongs to original pixel mask")
        rays = camera.cam_ray_from_img(xy) @ rotations[index]
        continuous_horizon_exceptions += int(np.count_nonzero(rays[:, 1] >= 0))
        feature_count += len(keypoints)
        require(image_id in frames[image["frameId"]]["imageIds"], "Frame membership")
    require(continuous_horizon_exceptions == 0, "Every feature ray lies above original panorama horizon")
    for frame_id, frame in frames.items():
        require(len(frame["imageIds"]) == len(set(frame["imageIds"])) == 12, "Twelve distinct virtual sensors per frame")
        require({images[image_id]["cameraId"] for image_id in frame["imageIds"]} == cameras.keys(), "Every frame uses the same sensors")
        require(all(images[image_id]["frameId"] == frame_id for image_id in frame["imageIds"]), "Complete physical-frame membership")
    for camera_id, entry in cameras.items():
        require(entry["model"] == camera.model_name and entry["width"] == camera.width and entry["height"] == camera.height,
            "Shared projection model and size")
        close(entry["params"], camera.params, "Known shared intrinsics")
    rig = observations["rigs"][0]
    require({sensor["sensorId"] for sensor in rig["sensors"]} == cameras.keys(), "Rig sensors")
    require(all(frame["rigId"] == rig["rigId"] for frame in frames.values()), "Shared rig per original frame")
    for sensor in rig["sensors"]:
        index = camera_indices[sensor["sensorId"]]
        expected = np.column_stack((rotations[index] @ rotations[0].T, np.zeros(3)))
        close(sensor["sensorFromRig"], expected, "Fixed known rig rotation and zero translation")
        require(sensor["reference"] == (index == 0) == (sensor["sensorId"] == rig["refSensorId"]), "Known reference sensor")
    reported_pairs = {tuple(item["images"]): item for item in result["pairs"]}
    seen_pairs = set()
    stored_count = usable_count = total_matches = total_inliers = 0
    for pair in observations["pairs"]:
        first_id, second_id = pair["imageIds"]
        require(pair["pairId"] == pycolmap.image_pair_to_pair_id(first_id, second_id), "Official pair identity")
        require(pair["pairId"] not in seen_pairs, "Unique pair records")
        seen_pairs.add(pair["pairId"])
        first, second = images[first_id], images[second_id]
        require(first["frameId"] != second["frameId"], "Matching excludes co-located virtual images")
        require(pair["frames"] == [first["frameId"], second["frameId"]], "Pair physical-frame association")
        matches, inliers = arrays[pair["matchKey"]], arrays[pair["inlierKey"]]
        used_keys.update([pair["matchKey"], pair["inlierKey"]])
        for values in [matches, inliers]:
            require(values.ndim == 2 and values.shape[1] == 2 and np.issubdtype(values.dtype, np.integer), "Native match index shape")
            require(((values >= 0) & (values < [first["features"], second["features"]])).all(), "Match indices in native feature arrays")
            require(len({tuple(row) for row in values.tolist()}) == len(values), "Unique match rows")
        require(set(map(tuple, inliers.tolist())) <= set(map(tuple, matches.tolist())), "Verified inliers belong to tentative matches")
        require(len(matches) == pair["tentativeMatches"] and len(inliers) == pair["verifiedInliers"], "Match counts")
        require(pair["configurationName"] == str(pycolmap.TwoViewGeometryConfiguration(pair["configuration"])), "Geometry enum")
        total_matches += len(matches)
        total_inliers += len(inliers)
        names = (first["name"], second["name"])
        if names in reported_pairs:
            stored_count += 1
            reported = reported_pairs[names]
            require(reported["tentativeMatches"] == len(matches) and reported["verifiedInliers"] == len(inliers), "Executed stored geometry counts")
            require(reported["configuration"] == pair["configurationName"], "Executed geometry configuration")
            require(reported["databaseTriangulationAngleDegrees"] is None, "SQLite does not persist a measured triangulation angle")
            usable_count += int(len(inliers) >= mapping.min_num_matches and pair["configuration"] not in [0, 1])
        else:
            require(len(inliers) == 0, "Unreported geometry has no verified inliers")
    require(stored_count == len(result["pairs"]), "All executed stored geometries retained")
    require(used_keys == set(arrays.files), "Every retained observation array is indexed")
    return {"physicalFrames": len(frames), "virtualImages": len(images), "features": feature_count,
        "exportedMatchPairs": len(seen_pairs), "storedGeometryPairs": stored_count,
        "pairsMeetingDefaultCorrespondenceMinimum": usable_count,
        "tentativeMatches": total_matches, "verifiedInliers": total_inliers,
        "aboveOriginalHorizonFeatures": feature_count}, images


def verify_model(path, converted_path, report, observations, arrays, sources, camera, rotations, mapping):
    model = pycolmap.Reconstruction(path)
    images = [model.image(image_id) for image_id in model.reg_image_ids()]
    frames = {}
    calibration_errors = []
    reported_cameras = {item["image"]: item for item in report["cameras"]}
    require(reported_cameras.keys() == {image.name for image in images}, "Reported sparse camera identities")
    geometry_finite = bool(images) and model.num_points3D() > 0
    for image in images:
        index, source = view_name(image.name)
        recorded = observations[image.image_id]
        require(recorded["name"] == image.name and recorded["frameId"] == image.frame_id, "Sparse image provenance")
        require(recorded["cameraId"] == image.camera_id, "Sparse camera identity")
        require(len(image.points2D) == recorded["features"], "Sparse original feature count")
        close(np.asarray([point.xy for point in image.points2D]).reshape(-1, 2),
            arrays[recorded["keypointsKey"]][:, :2], "Sparse original keypoint coordinates", 1e-6)
        expected_rotation = rotations[index] @ rotations[0].T
        actual = image.cam_from_world() * image.frame.rig_from_world.inverse()
        calibration_errors.extend([float(np.max(np.abs(actual.rotation.matrix() - expected_rotation))),
            float(np.max(np.abs(actual.translation))), float(np.max(np.abs(model.camera(image.camera_id).params - camera.params)))])
        require(model.camera(image.camera_id).model_name == camera.model_name, "Sparse camera model")
        center = image.projection_center()
        recorded_camera = reported_cameras[image.name]
        require(recorded_camera["cameraId"] == image.camera_id and recorded_camera["frameId"] == image.frame_id,
            "Reported camera/frame association")
        require(recorded_camera["source"] == source, "Reported camera original source")
        close(recorded_camera["center"], center, "Reported camera position")
        close(recorded_camera["camFromWorld"], image.cam_from_world().matrix(), "Reported camera rotation and translation")
        close(recorded_camera["params"], model.camera(image.camera_id).params, "Reported camera intrinsics")
        geometry_finite = geometry_finite and np.isfinite(center).all() and np.isfinite(image.cam_from_world().matrix()).all()
        frames.setdefault(image.frame_id, {"source": source, "centers": [], "indices": []})
        require(frames[image.frame_id]["source"] == source, "Sparse original panorama per frame")
        frames[image.frame_id]["centers"].append(center)
        frames[image.frame_id]["indices"].append(index)
    for frame in frames.values():
        require(set(frame["indices"]) == set(range(12)), "Every registered frame retains twelve virtual sensors")
        calibration_errors.extend(float(np.linalg.norm(center - frame["centers"][0])) for center in frame["centers"])
    reported_frames = {item["frameId"]: item for item in report["frames"]}
    require(reported_frames.keys() == frames.keys(), "Reported physical frame identities")
    for frame_id, frame in frames.items():
        recorded_frame = reported_frames[frame_id]
        require(recorded_frame["source"] == frame["source"] and recorded_frame["virtualImageCount"] == 12,
            "Reported original frame association")
        close(recorded_frame["center"], frame["centers"][0], "Reported physical frame position")
    registered_sources = {frame["source"] for frame in frames.values()}
    require(registered_sources <= sources, "Registered input panorama membership")
    require(report["registeredVirtualImages"] == len(images), "Reported registered virtual images")
    require(report["registeredPhysicalFrames"] == len(frames), "Reported registered physical frames")
    require(set(report["registeredPanoramas"]) == registered_sources, "Reported original panoramas")
    require(report["points3D"] == model.num_points3D(), "Reported sparse point count")
    errors, angles, depths, frame_counts = [], [], [], []
    adjacency = {frame_id: set() for frame_id in frames}
    reported_points = {point["id"]: point for point in report["points"]}
    require(reported_points.keys() == set(model.points3D.keys()), "Reported sparse point identities")
    for point_id, point in model.points3D.items():
        geometry_finite = geometry_finite and np.isfinite(point.xyz).all() and math.isfinite(point.error)
        centers = {}
        seen = set()
        recorded = reported_points[point_id]
        recorded_observations = {(entry["imageId"], entry["point2DIndex"]): entry for entry in recorded["observations"]}
        for element in point.track.elements:
            require((element.image_id, element.point2D_idx) not in seen, "Unique point track observations")
            seen.add((element.image_id, element.point2D_idx))
            image = model.image(element.image_id)
            observed = image.points2D[element.point2D_idx]
            require(observed.point3D_id == point_id, "Bidirectional point track association")
            centers[image.frame_id] = image.projection_center()
            position = image.cam_from_world() * point.xyz
            projected = model.camera(image.camera_id).img_from_cam(position)
            depths.append(float(position[2]))
            recorded_observation = recorded_observations[(element.image_id, element.point2D_idx)]
            close(recorded_observation["xy"], observed.xy, "Reported observation coordinates")
            close(recorded_observation["cameraDepth"], position[2], "Reported observation camera depth")
            if projected is None:
                geometry_finite = False
                require(recorded_observation["predictedXy"] is None and recorded_observation["errorPixels"] is None,
                    "Unprojectable observation report")
            else:
                error = float(np.linalg.norm(projected - observed.xy))
                errors.append(error)
                close(recorded_observation["predictedXy"], projected, "Reported projected coordinates")
                close(recorded_observation["errorPixels"], error, "Reported per-observation residual")
        require(recorded_observations.keys() == seen, "Complete reported observation membership")
        frame_counts.append(len(centers))
        point_angles = []
        for first_id, second_id in itertools.combinations(centers, 2):
            adjacency[first_id].add(second_id)
            adjacency[second_id].add(first_id)
            first, second = point.xyz - centers[first_id], point.xyz - centers[second_id]
            denominator = np.linalg.norm(first) * np.linalg.norm(second)
            if denominator > 0 and np.isfinite(denominator):
                # COLMAP 使用两个物理相机射线之间的锐角衡量三角测量。
                cosine = abs(float(np.clip(np.dot(first, second) / denominator, -1, 1)))
                computed = math.degrees(math.acos(cosine))
                official = math.degrees(pycolmap.calculate_triangulation_angle(centers[first_id], centers[second_id], point.xyz))
                close(official, computed, "Official acute triangulation angle", 1e-6)
                point_angles.append(official)
            else:
                geometry_finite = False
        angle = max(point_angles) if point_angles else None
        if angle is not None:
            angles.append(angle)
        close(recorded["xyz"], point.xyz, "Reported reconstructed point position")
        require(recorded["physicalFrameCount"] == len(centers), "Distinct physical frames observing point")
        require({(entry["imageId"], entry["point2DIndex"]) for entry in recorded["track"]} == seen, "Reported point tracks")
        if angle is None:
            require(recorded["maximumPhysicalTriangulationAngleDegrees"] is None, "No physical triangulation angle")
        else:
            close(recorded["maximumPhysicalTriangulationAngleDegrees"], angle, "Physical acute parallax", 1e-6)
    baselines = [float(np.linalg.norm(first["centers"][0] - second["centers"][0]))
        for first, second in itertools.combinations(frames.values(), 2)]
    ratio = min(baselines) / max(baselines) if baselines and max(baselines) > 0 else 0
    visited, pending = set(), list(frames)[:1]
    while pending:
        current = pending.pop()
        if current not in visited:
            visited.add(current)
            pending.extend(adjacency[current] - visited)
    criteria = {"atLeastThreeOriginalPanoramas": len(registered_sources) >= 3,
        "finiteCamerasAndNonzeroPoints": bool(geometry_finite),
        "nonCoincidentPhysicalCenters": ratio > 1e-6,
        "physicalTrackGraphConnected": bool(frames) and len(visited) == len(frames),
        "positiveDepthForEveryObservation": bool(depths) and all(math.isfinite(depth) and depth > 0 for depth in depths),
        "knownRigAndIntrinsicsPreserved": bool(calibration_errors) and max(calibration_errors) <= 1e-8,
        "physicalParallaxAtLeastDefaultFilter": len(angles) == model.num_points3D() > 0
            and min(angles) >= mapping.mapper.filter_min_tri_angle - 1e-6,
        "observationErrorsWithinDefaultFilter": bool(errors) and all(math.isfinite(error) for error in errors)
            and max(errors) <= mapping.mapper.filter_max_reproj_error + 1e-6}
    if "everyPointAcrossPhysicalFrames" in report["relativeCameraDiagnostics"]:
        criteria["everyPointAcrossPhysicalFrames"] = bool(frame_counts) and all(count >= 2 for count in frame_counts)
    require(report["relativeCameraDiagnostics"] == criteria, "Independently recomputed camera diagnostics")
    require(report["relativeCameraDiagnosticPass"] == all(criteria.values()), "Independent relative camera outcome")
    require(report["missingInputPanoramas"] == sorted(sources - registered_sources), "Dropped original source frames")
    require(report["registeredAllInputPanoramas"] == (sources == registered_sources), "Complete input registration declaration")
    require(report["pointsAcrossAtLeastTwoPhysicalFrames"] == sum(count >= 2 for count in frame_counts),
        "Reported points seen across two original panoramas")
    require(report["pointsAcrossThreePhysicalFrames"] == sum(count >= 3 for count in frame_counts),
        "Reported points seen across three original panoramas")
    if angles:
        close(report["minimumMaximumPhysicalTriangulationAngleDegrees"], min(angles), "Reported minimum physical parallax", 1e-6)
        close(report["medianMaximumPhysicalTriangulationAngleDegrees"], np.median(angles), "Reported median physical parallax", 1e-6)
    if errors:
        close(report["maximumObservedReprojectionErrorPixels"], max(errors), "Reported maximum observation residual")
        close(report["p95ObservedReprojectionErrorPixels"], np.percentile(errors, 95), "Reported p95 observation residual")
    converted = pycolmap.Reconstruction(converted_path)
    require(converted.num_reg_images() == len(frames) == report["convertedPanoramaImages"], "Converted physical image count")
    require(converted.num_points3D() == model.num_points3D() == report["convertedPoints3D"], "Converted sparse structure count")
    require({image.name for image in converted.images.values()} == registered_sources, "Converted original image names")
    for image in converted.images.values():
        require(converted.camera(image.camera_id).model_name == "EQUIRECTANGULAR", "Converted panorama camera model")
        frame = next(value for value in frames.values() if value["source"] == image.name)
        close(image.projection_center(), frame["centers"][0], "Converted original camera center")
    for point_id, point in converted.points3D.items():
        close(point.xyz, model.point3D(point_id).xyz, "Converted point position")
        require(point.track.length() == model.point3D(point_id).track.length(), "Converted observation count")
    return {"id": report["id"], "registeredPhysicalFrames": len(frames), "registeredVirtualImages": len(images),
        "inputPanoramas": len(sources), "missingInputPanoramas": sorted(sources - registered_sources),
        "points3D": model.num_points3D(), "pointsAcrossTwoPhysicalFrames": sum(count >= 2 for count in frame_counts),
        "minimumToMaximumBaselineRatio": ratio, "physicalBaselinesArbitraryUnits": baselines,
        "minimumAcutePhysicalTriangulationAngleDegrees": min(angles) if angles else None,
        "medianAcutePhysicalTriangulationAngleDegrees": float(np.median(angles)) if angles else None,
        "maximumObservedReprojectionErrorPixels": max(errors) if errors else None,
        "criteria": criteria, "relativeCameraDiagnosticPass": all(criteria.values())}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    evidence = args.evidence.resolve()
    manifest, indexed = verify_manifest(evidence)
    result, selected = read_json(evidence / "result.json"), read_json(evidence / "selected.json")
    require(result["completed"] is True and result["stage"] == "complete", "Completed executed trial")
    database_export = read_json(evidence / "database-export.json")
    require(database_export["originalRunDatabase"] == result["database"], "Original executed database identity")
    require(database_export["observedSourceBytes"] == result["database"]["bytes"], "Retained database byte count")
    require(database_export["originalRunBytesAvailable"] ==
        (database_export["observedSourceSha256"] == result["database"]["sha256"]), "Explicit original database availability")
    require(database_export["sourceUnchangedDuringExport"] is True and database_export["resultFeaturePairFrameRigCountsMatch"] is True,
        "Isolated export and executed count comparison")
    require(database_export["sqliteIntegrityCheck"] == "ok", "Retained SQLite integrity result")
    require(set(database_export["isolatedReadByteChanges"]) <= set(range(24, 28)) | set(range(92, 96)),
        "Isolated pycolmap read changes restricted to SQLite header counters")
    sources = verify_sources(evidence, result, selected, indexed)
    camera = panorama.create_virtual_camera(pano_width=6080, pano_height=3040, hfov_deg=90, vfov_deg=90)
    rotations = panorama.get_virtual_rotations(4, [-35, 0, 35])
    close(result["rig"]["rotationsFromPanorama"], rotations, "Official virtual camera rotations")
    close(result["rig"]["camera"]["params"], camera.params, "Official virtual camera parameters")
    mapping = verify_settings(evidence, result, camera)
    masks = verify_masks(evidence, result, indexed, camera, rotations)
    observations = read_json(evidence / "observations.json")
    with np.load(evidence / "observations.npz", allow_pickle=False) as arrays:
        counts, images = verify_observations(evidence, result, observations, arrays, camera, rotations, masks, sources, mapping)
        model_ids = {str(model["id"]) for model in result["models"]}
        for directory in ["sparse", "sparse_equirectangular"]:
            path = evidence / directory
            actual_ids = {entry.name for entry in path.iterdir() if entry.is_dir()} if path.exists() else set()
            require(actual_ids == model_ids, f"Actual retained {directory} models")
            require(all(str(file.relative_to(evidence)) in indexed for file in path.rglob("*") if file.is_file()), "Indexed sparse files")
        models = [verify_model(evidence / "sparse" / str(model["id"]),
            evidence / "sparse_equirectangular" / str(model["id"]), model, images, arrays, sources, camera, rotations, mapping)
            for model in result["models"]]
    outcome = {"schemaVersion": 1, "evidence": evidence.name, "integrityPass": True,
        "originalRunDatabaseBytesAvailable": database_export["originalRunBytesAvailable"],
        "databaseExportBinding": "run-end-sha256" if database_export["originalRunBytesAvailable"] else "retained-derivative-and-original-count-consistency",
        "indexedFiles": len(indexed), "sourcePanoramas": len(sources), **counts,
        "retainedSparseModels": len(models), "models": models,
        "relativeCameraDiagnosticPass": any(model["relativeCameraDiagnosticPass"] for model in models),
        "walkableConnectorQualified": False, "fullRouteQualified": False,
        "limitations": ["Original HD source bytes are represented by retained HTTP receipts and executed SHA-256 identities.",
            database_export["limitations"],
            "Relative sparse camera geometry has arbitrary scale; horizon masks exclude ground observations.",
            "Physical floor, collision, lighting, occlusion and independent landmark recognition remain unqualified."]}
    encoded = json.dumps(outcome, indent=2, allow_nan=False) + "\n"
    if args.output is not None:
        root = Path(__file__).resolve().parents[3]
        require(args.output.resolve().is_relative_to(root / "artifacts"), "Verification output belongs in ignored artifacts")
        args.output.write_text(encoded)
    print(encoded, end="")


if __name__ == "__main__":
    main()
