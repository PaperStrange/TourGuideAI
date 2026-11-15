import argparse
import hashlib
import importlib.metadata
import itertools
import json
import math
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pycolmap


def identity(path):
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    return {"path": str(path), "bytes": path.stat().st_size, "sha256": digest}


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def observation_eligibility(model, graph, options):
    cameras = {camera_id: camera.has_bogus_params(options.min_focal_length_ratio,
        options.max_focal_length_ratio, options.max_extra_param)
        for camera_id, camera in model.cameras.items()}
    records = []
    unique_candidates = set()
    for image_id in sorted(model.reg_image_ids()):
        image = model.image(image_id)
        counts = Counter()
        for point_index in range(image.num_points2D()):
            if not graph.has_correspondences(image_id, point_index):
                continue
            counts["withGraphCorrespondences"] += 1
            if graph.is_two_view_observation(image_id, point_index):
                counts["globallyTwoViewObservations"] += 1
            correspondences = graph.extract_transitive_correspondences(
                image_id, point_index, options.max_transitivity)
            available = [correspondence for correspondence in correspondences
                if model.image(correspondence.image_id).has_pose
                and not cameras[model.image(correspondence.image_id).camera_id]]
            if cameras[image.camera_id]:
                counts["rejectedReferenceCamera"] += 1
            elif not available:
                counts["withoutRegisteredCorrespondence"] += 1
            elif (options.ignore_two_view_tracks and len(available) == 1
                    and graph.is_two_view_observation(available[0].image_id, available[0].point2D_idx)):
                counts["rejectedByTwoViewTrackPolicy"] += 1
            else:
                counts["eligibleBeforeGeometryEstimation"] += 1
                observations = [(image_id, point_index)] + [
                    (correspondence.image_id, correspondence.point2D_idx) for correspondence in available]
                unique_candidates.add(tuple(sorted(observations)))
        records.append({"imageId": image_id, "name": image.name, "frameId": image.frame_id,
            "hasPose": image.has_pose, "bogusCamera": cameras[image.camera_id],
            "keypoints": image.num_points2D(), "counts": dict(counts)})
    return {"images": records, "uniqueEligibleCandidateCount": len(unique_candidates),
        "uniqueEligibleCandidates": [[list(observation) for observation in candidate]
            for candidate in sorted(unique_candidates)],
        "method": "Pre-triangulation eligibility follows pinned IncrementalTriangulator::Find/Create using the official correspondence graph APIs; geometry acceptance is measured by actual TriangulateImage calls."}


def candidate_geometry(model, eligibility, options):
    estimator = pycolmap.EstimateTriangulationOptions(min_tri_angle=math.radians(options.min_angle),
        residual_type=pycolmap.TriangulationResidualType.ANGULAR_ERROR)
    estimator.ransac.max_error = math.radians(options.create_max_angle_error)
    estimator.ransac.random_seed = options.random_seed
    records = []
    for candidate in eligibility["uniqueEligibleCandidates"]:
        images = [model.image(image_id) for image_id, _ in candidate]
        points = [image.points2D[point_index].xy for image, (_, point_index) in zip(images, candidate)]
        poses = [image.cam_from_world() for image in images]
        cameras = [model.camera(image.camera_id) for image in images]
        estimator.ransac.min_num_trials = math.comb(len(candidate), 2) if len(candidate) <= 15 else 0
        result = pycolmap.estimate_triangulation(points, poses, cameras, estimator)
        pair_records = []
        for first, second in itertools.combinations(range(len(candidate)), 2):
            ray_a = cameras[first].cam_ray_from_img(points[first])
            ray_b = cameras[second].cam_ray_from_img(points[second])
            point = pycolmap.triangulate_mid_point(poses[second] * poses[first].inverse(), ray_a, ray_b)
            pair_record = {"observationIndices": [first, second], "midpointAvailable": point is not None}
            if point is not None:
                point_world = poses[first].inverse() * point
                angle = math.degrees(pycolmap.calculate_triangulation_angle(
                    images[first].projection_center(), images[second].projection_center(), point_world))
                transformed = [poses[index] * point_world for index in [first, second]]
                pair_record.update({"angleDegrees": angle,
                    "positiveCameraDepths": [float(value[2]) > 0 for value in transformed]})
            pair_records.append(pair_record)
        records.append({"observations": [{"imageId": image_id, "point2DIndex": point_index,
            "xy": points[index].tolist()} for index, (image_id, point_index) in enumerate(candidate)],
            "officialEstimatorAccepted": result is not None, "midpointDiagnostics": pair_records})
    return {"method": "Official EstimateTriangulation repeats the same angular residual, 4-degree minimum, 2-degree residual bound and small-track exhaustive-sampling count used by pinned TriangulateTrack. Midpoints and official acute angles provide separate diagnostics without relaxing acceptance.",
        "settings": estimator.summary(), "candidates": records,
        "estimatorAcceptedCandidates": sum(record["officialEstimatorAccepted"] for record in records)}


def replay(cache, pair, mapper_options, triangulation_options):
    model = pycolmap.Reconstruction()
    mapper = pycolmap.IncrementalMapper(cache)
    mapper.begin_reconstruction(model)
    first, second = pair
    record = {"imageIds": list(pair), "images": [model.image(image_id).name for image_id in pair],
        "graphMatches": cache.correspondence_graph.extract_matches_between_images(first, second).tolist()}
    pose = mapper.estimate_initial_two_view_geometry(mapper_options, first, second)
    record["initialGeometryAccepted"] = pose is not None
    if pose is None:
        mapper.end_reconstruction(True)
        return record
    record["cam2FromCam1"] = pose.matrix().tolist()
    # 仅在内存中重放已记录的最后一次默认初始化阶段。
    mapper.register_initial_image_pair(mapper_options, first, second, pose)
    record["registeredPhysicalFramesBeforeTriangulation"] = model.num_reg_frames()
    record["registeredVirtualImagesBeforeTriangulation"] = model.num_reg_images()
    record["pointsBeforeTriangulation"] = model.num_points3D()
    assert model.image(first).frame_id != model.image(second).frame_id
    record["eligibility"] = observation_eligibility(model, cache.correspondence_graph, triangulation_options)
    record["candidateGeometry"] = candidate_geometry(model, record["eligibility"], triangulation_options)
    record["triangulationCalls"] = []
    for image_id in pair:
        for data_id in model.image(image_id).frame.image_ids:
            before = model.num_points3D()
            added = mapper.triangulate_image(triangulation_options, data_id.id)
            record["triangulationCalls"].append({"imageId": data_id.id,
                "returnedAddedObservations": added, "pointsBefore": before,
                "pointsAfter": model.num_points3D()})
    record["registeredPhysicalFramesAfterTriangulation"] = model.num_reg_frames()
    record["pointsAfterTriangulation"] = model.num_points3D()
    record["reachesInitialZeroPointRejection"] = model.num_points3D() == 0
    record["points"] = [{"id": point_id, "xyz": point.xyz.tolist(),
        "track": [[element.image_id, element.point2D_idx] for element in point.track.elements]}
        for point_id, point in model.points3D.items()]
    mapper.end_reconstruction(True)
    return record


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-run", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--source-kind", choices=["frozen-run", "post-inspection-derivative"], required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    source_run, output = args.source_run.resolve(), args.output.resolve()
    assert source_run == root / "artifacts/realism-01/connector-rig/run-01"
    assert output.is_relative_to(root / "artifacts/realism-01/connector-parallax") and not output.exists()
    assert pycolmap.__version__ == "4.2.1"
    source_database = source_run / "database.db"
    source_before = identity(source_database)
    report_source = json.loads((source_run / "result.json").read_text())
    assert report_source["completed"] and report_source["models"] == []
    matches_recorded_bytes = source_before["sha256"] == report_source["database"]["sha256"]
    assert matches_recorded_bytes == (args.source_kind == "frozen-run")
    output.mkdir(parents=True)
    shutil.copyfile(Path(__file__), output / "executed-seed-geometry.py")
    snapshot = output / "database-snapshot.db"
    # 原数据库仅用于读取字节，COLMAP 只打开独立副本。
    shutil.copyfile(source_database, snapshot)
    snapshot_before = identity(snapshot)
    assert snapshot_before["sha256"] == source_before["sha256"]
    pipeline = pycolmap.IncrementalPipelineOptions(num_threads=2, random_seed=0,
        ba_refine_sensor_from_rig=False, ba_refine_focal_length=False,
        ba_refine_principal_point=False, ba_refine_extra_params=False)
    pipeline.mapper.abs_pose_refine_focal_length = False
    pipeline.mapper.abs_pose_refine_extra_params = False
    assert pipeline.summary() == json.loads((source_run / "settings.json").read_text())["mapping"]
    mapper_options = pipeline.get_mapper()
    stages = [[mapper_options.init_min_num_inliers, mapper_options.init_min_tri_angle]]
    for _ in range(2):
        mapper_options.init_min_num_inliers //= 2
        stages.append([mapper_options.init_min_num_inliers, mapper_options.init_min_tri_angle])
        mapper_options.init_min_tri_angle /= 2
        stages.append([mapper_options.init_min_num_inliers, mapper_options.init_min_tri_angle])
    assert stages == [[100, 16.0], [50, 16.0], [50, 8.0], [25, 8.0], [25, 4.0]]
    triangulation_options = pipeline.get_triangulation()
    triangulation_options.min_angle = mapper_options.init_min_tri_angle
    cache_options = pycolmap.DatabaseCacheOptions(min_num_matches=pipeline.min_num_matches,
        ignore_watermarks=pipeline.ignore_watermarks, load_all_images=pipeline.load_all_images,
        convert_pose_priors_to_enu=pipeline.use_prior_position)
    with pycolmap.Database.open(snapshot) as database:
        cache = pycolmap.DatabaseCache.create(database, cache_options)
    snapshot_after = identity(snapshot)
    source_directory = root / "artifacts/realism-01/connector-parallax/upstream"
    report = {"schemaVersion": 1, "startedAt": datetime.now(timezone.utc).isoformat(),
        "completed": False, "producer": identity(Path(__file__)),
        "versions": {name: importlib.metadata.version(name) for name in ["pycolmap", "numpy"]},
        "sourceKind": args.source_kind, "recordedEndOfRunDatabase": report_source["database"],
        "sourceMatchesRecordedRunBytes": matches_recorded_bytes,
        "sourceDatabaseBefore": source_before, "snapshotBeforeOpen": snapshot_before,
        "snapshotAfterClose": snapshot_after,
        "snapshotBytesChangedByDatabaseOpen": snapshot_before["sha256"] != snapshot_after["sha256"],
        "sourceRecords": [identity(source_run / name) for name in ["result.json", "settings.json", "executed-run.py"]],
        "sourceLog": identity(source_run.with_suffix(".txt")),
        "pinnedSource": [identity(source_directory / name) for name in ["tag.json", "incremental_pipeline.cc", "incremental_mapper.cc", "incremental_triangulator.cc"]],
        "automaticInitializationStages": stages,
        "replayedStage": "The existing pipeline's fifth automatic stage (25 inliers, 4 degrees); no threshold below the recorded library schedule is used.",
        "settings": {"mapper": mapper_options.summary(), "triangulation": triangulation_options.summary(), "cache": cache_options.summary()},
        "cache": {"rigs": cache.num_rigs(), "physicalFrames": cache.num_frames(),
            "virtualImages": cache.num_images(), "graphImagePairs": cache.correspondence_graph.num_image_pairs()},
        "api": {name: getattr(pycolmap.IncrementalMapper, name).__doc__ for name in [
            "estimate_initial_two_view_geometry", "register_initial_image_pair", "triangulate_image"]},
        "seeds": [], "limitations": [
            "Each recorded seed is replayed independently with the actual database cache; global initialization-search statistics are not replayed.",
            "The post-inspection derivative differs from the recorded run-end database bytes. Original run-end bytes are unavailable; the exact modifying-open chronology is unknown. Both identities are retained without reconstructing database headers.",
            "The source database is only copied and hashed; COLMAP opens the isolated snapshot and all reconstruction objects stay in memory.",
            "Pre-triangulation graph eligibility does not establish valid geometry. The actual official triangulator decides acceptance.",
            "This diagnostic stops at initial triangulation and performs no bundle adjustment, third-frame registration, model promotion or route acceptance."]}
    report_path = output / "result.json"
    write_json(report_path, report)
    for pair in [(8, 7), (36, 35), (36, 34)]:
        pycolmap.set_random_seed(0)
        report["seeds"].append(replay(cache, pair, mapper_options, triangulation_options))
        write_json(report_path, report)
    report["sourceDatabaseAfter"] = identity(source_database)
    assert report["sourceDatabaseAfter"] == source_before
    report["finishedAt"] = datetime.now(timezone.utc).isoformat()
    report["completed"] = True
    write_json(report_path, report)
    print(json.dumps({"report": str(report_path), "completed": True,
        "sourceDatabaseUnchanged": True, "seeds": [{"pair": seed["imageIds"],
            "initialGeometryAccepted": seed["initialGeometryAccepted"],
            "pointsAfterTriangulation": seed.get("pointsAfterTriangulation")}
            for seed in report["seeds"]]}))


if __name__ == "__main__":
    main()
