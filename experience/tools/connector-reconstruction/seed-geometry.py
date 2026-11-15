import argparse
import gzip
import hashlib
import importlib.metadata
import itertools
import json
import math
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import pycolmap


def identity(path):
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    return {"path": str(path), "bytes": path.stat().st_size, "sha256": digest}


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def check_identity(path, expected):
    observed = identity(path)
    assert observed["sha256"] == expected["sha256"] and observed["bytes"] == expected["bytes"], str(path)


def bound_record_checks(evidence, report):
    check_identity(evidence / "producers/executed-seed-geometry.py", report["producer"])
    check_identity(evidence / "source-run/log.txt", report["sourceLog"])
    for record in report["sourceRecords"]:
        check_identity(evidence / "source-run" / Path(record["path"]).name, record)
    for record in report["pinnedSource"]:
        check_identity(evidence / "upstream" / Path(record["path"]).name, record)
    source_run = json.loads((evidence / "source-run/result.json").read_text())
    assert source_run["database"] == report["recordedEndOfRunDatabase"]
    check_identity(evidence / "source-run/selected.json", source_run["selection"])
    check_identity(evidence / "source-run/executed-run.py", source_run["producer"])
    check_identity(evidence / "source-run/settings.json", source_run["settings"])
    for source in source_run["sources"]:
        check_identity(evidence / f'source-run/receipts/{source["id"]}.json', source["receipt"])


def manifest_files(evidence, report):
    files = []
    for path in sorted(evidence.rglob("*")):
        if not path.is_file() or path.name == "manifest.json":
            continue
        relative = path.relative_to(evidence).as_posix()
        upstream = relative.startswith("upstream/")
        code = path.suffix == ".py" or relative in {"README.md", "requirements.txt"}
        source = ("COLMAP 4.2.1 commit bd1fcf654d2dd8fefa1466999c190a246f83f4b9; upstream/tag.json"
            if upstream else "TourGuideAI seed replay; source-run/result.json; Irvin Chen / Panoramax Taiwan; source-run/selected.json")
        rights = ("BSD-3-Clause, retained upstream copyright headers; tag.json is GitHub commit metadata"
            if upstream else "MIT, repository LICENSE" if code else
            "Derived CC BY-SA 4.0 source observations; Irvin Chen / Panoramax Taiwan attribution in source-run/selected.json; project analysis metadata")
        files.append({**identity(path), "path": relative, "source": source,
            "date": report["startedAt"], "rights": rights,
            "location": "Shijo-Karasuma, Kyoto; three source cameras west of approved route edge 1; coordinates in source-run/selected.json",
            "method": "Pinned official source retained verbatim" if upstream else
                "Authored producer or instructions retained verbatim" if code else
                "Exact executed analysis record, source receipt, or losslessly compressed post-inspection SQLite derivative",
            "limitations": "Original run-end database bytes unavailable; derivative identity explicit. Three-panorama initial geometry only; no metric scale, floor, collision, lighting or full-route qualification."})
    return files


def retain_source_receipts(evidence):
    source_run = json.loads((evidence / "source-run/result.json").read_text())
    for source in source_run["sources"]:
        target = evidence / f'source-run/receipts/{source["id"]}.json'
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            check_identity(Path(source["receipt"]["path"]), source["receipt"])
            shutil.copyfile(Path(source["receipt"]["path"]), target)
        check_identity(target, source["receipt"])


def refresh_provenance(evidence, root):
    assert evidence == root / "experience/evidence/realism-01/connector-seed-geometry"
    manifest = json.loads((evidence / "manifest.json").read_text())
    for record in manifest["files"]:
        check_identity(evidence / record["path"], record)
    report = json.loads((evidence / "result.json").read_text())
    retain_source_receipts(evidence)
    bound_record_checks(evidence, report)
    shutil.copyfile(Path(__file__), evidence / "producers/replay-verifier.py")
    manifest["producer"] = identity(Path(__file__))
    manifest["files"] = manifest_files(evidence, report)
    manifest["provenanceUpdatedAt"] = datetime.now(timezone.utc).isoformat()
    write_json(evidence / "manifest.json", manifest)
    print(json.dumps({"provenanceUpdated": str(evidence), "files": len(manifest["files"])}))


def pipeline_options():
    pipeline = pycolmap.IncrementalPipelineOptions(num_threads=2, random_seed=0,
        ba_refine_sensor_from_rig=False, ba_refine_focal_length=False,
        ba_refine_principal_point=False, ba_refine_extra_params=False)
    pipeline.mapper.abs_pose_refine_focal_length = False
    pipeline.mapper.abs_pose_refine_extra_params = False
    return pipeline


def last_stage_options(pipeline):
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
    return mapper_options, triangulation_options, cache_options, stages


def compare_values(actual, expected, label="seeds"):
    if isinstance(expected, dict):
        assert actual.keys() == expected.keys(), label
        for key, value in expected.items():
            compare_values(actual[key], value, f"{label}.{key}")
    elif isinstance(expected, list):
        assert len(actual) == len(expected), label
        for index, value in enumerate(expected):
            compare_values(actual[index], value, f"{label}[{index}]")
    elif isinstance(expected, float):
        assert math.isclose(actual, expected, rel_tol=1e-9, abs_tol=1e-10), label
    else:
        assert actual == expected, label


def retain(run, root):
    assert run.is_relative_to(root / "artifacts/realism-01/connector-parallax")
    report = json.loads((run / "result.json").read_text())
    assert report["completed"] and report["sourceDatabaseBefore"] == report["sourceDatabaseAfter"]
    source_database = Path(report["sourceDatabaseBefore"]["path"])
    assert identity(source_database) == report["sourceDatabaseBefore"]
    destination = root / "experience/evidence/realism-01/connector-seed-geometry"
    destination.mkdir(parents=True, exist_ok=True)
    assert not (destination / "manifest.json").exists()
    inputs = [(run / "result.json", "result.json"),
        (run / "executed-seed-geometry.py", "producers/executed-seed-geometry.py"),
        (Path(__file__), "producers/replay-verifier.py"),
        (Path(report["sourceLog"]["path"]), "source-run/log.txt")]
    inputs.extend((Path(record["path"]), "source-run/" + Path(record["path"]).name)
        for record in report["sourceRecords"])
    inputs.extend((Path(record["path"]), "upstream/" + Path(record["path"]).name)
        for record in report["pinnedSource"])
    inputs.append((source_database.parent / "selected.json", "source-run/selected.json"))
    for source, relative in inputs:
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        assert not target.exists()
        shutil.copyfile(source, target)
    compressed = destination / "database-snapshot.sqlite.gz"
    with source_database.open("rb") as source, compressed.open("wb") as target:
        with gzip.GzipFile(filename="", mode="wb", fileobj=target, mtime=0) as archive:
            shutil.copyfileobj(source, archive)
    assert identity(source_database) == report["sourceDatabaseBefore"]
    retain_source_receipts(destination)
    bound_record_checks(destination, report)
    files = manifest_files(destination, report)
    manifest = {"schemaVersion": 1, "createdAt": datetime.now(timezone.utc).isoformat(),
        "sourceKind": report["sourceKind"], "recordedEndOfRunDatabase": report["recordedEndOfRunDatabase"],
        "decodedDatabase": {"file": compressed.name, "bytes": report["sourceDatabaseBefore"]["bytes"],
            "sha256": report["sourceDatabaseBefore"]["sha256"]},
        "sourceDatabaseUnchangedDuringReplayAndRetention": True,
        "originalRunEndDatabaseBytesAvailable": report["sourceMatchesRecordedRunBytes"],
        "producer": identity(Path(__file__)), "files": files}
    write_json(destination / "manifest.json", manifest)
    print(json.dumps({"retained": str(destination), "files": len(files), "gzipBytes": compressed.stat().st_size}))


def verify(evidence, output, root):
    assert evidence.is_relative_to(root / "experience/evidence")
    assert output.is_relative_to(root / "artifacts/realism-01/connector-parallax") and not output.exists()
    manifest_path = evidence / "manifest.json"
    manifest_before = identity(manifest_path)
    manifest = json.loads(manifest_path.read_text())
    expected_files = {record["path"] for record in manifest["files"]}
    assert expected_files == {path.relative_to(evidence).as_posix() for path in evidence.rglob("*")
        if path.is_file() and path != manifest_path}
    for record in manifest["files"]:
        path = (evidence / record["path"]).resolve()
        assert path.is_relative_to(evidence)
        check_identity(path, record)
        assert all(record[field] for field in ["source", "date", "rights", "location", "method", "limitations"])
        datetime.fromisoformat(record["date"])
    frozen = json.loads((evidence / "result.json").read_text())
    assert frozen["completed"]
    bound_record_checks(evidence, frozen)
    check_identity(evidence / "producers/replay-verifier.py", manifest["producer"])
    check_identity(Path(__file__), manifest["producer"])
    for name, version in frozen["versions"].items():
        assert importlib.metadata.version(name) == version
    output.mkdir(parents=True)
    shutil.copyfile(Path(__file__), output / "executed-verifier.py")
    snapshot = output / "database-copy.db"
    with gzip.open(evidence / manifest["decodedDatabase"]["file"], "rb") as source, snapshot.open("wb") as target:
        shutil.copyfileobj(source, target)
    decoded = identity(snapshot)
    assert decoded["sha256"] == manifest["decodedDatabase"]["sha256"]
    assert decoded["bytes"] == manifest["decodedDatabase"]["bytes"]
    assert decoded["sha256"] == frozen["sourceDatabaseBefore"]["sha256"]
    pipeline = pipeline_options()
    assert pipeline.summary() == json.loads((evidence / "source-run/settings.json").read_text())["mapping"]
    mapper_options, triangulation_options, cache_options, stages = last_stage_options(pipeline)
    assert stages == frozen["automaticInitializationStages"]
    assert mapper_options.summary() == frozen["settings"]["mapper"]
    assert triangulation_options.summary() == frozen["settings"]["triangulation"]
    assert cache_options.summary() == frozen["settings"]["cache"]
    with pycolmap.Database.open(snapshot) as database:
        cache = pycolmap.DatabaseCache.create(database, cache_options)
    seeds = []
    for expected in frozen["seeds"]:
        pycolmap.set_random_seed(0)
        actual = replay(cache, expected["imageIds"], mapper_options, triangulation_options)
        compare_values(actual, expected)
        seeds.append(actual)
    for record in manifest["files"]:
        assert identity(evidence / record["path"])["sha256"] == record["sha256"]
    assert identity(manifest_path) == manifest_before
    report = {"schemaVersion": 1, "completed": True, "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "producer": identity(Path(__file__)), "manifest": manifest_before,
        "verifiedFiles": len(manifest["files"]), "decodedDatabase": decoded,
        "copyAfterDatabaseOpen": identity(snapshot), "retainedEvidenceUnchanged": True,
        "comparison": "Every seed field compared; float tolerance rtol=1e-9, atol=1e-10. All counts, graph memberships, coordinates, decisions and settings are checked.",
        "seeds": seeds}
    write_json(output / "verification.json", report)
    print(json.dumps({"verified": str(evidence), "output": str(output / "verification.json"),
        "seeds": len(seeds), "verifiedFiles": len(manifest["files"]), "retainedEvidenceUnchanged": True}))


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
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--source-run", type=Path)
    modes.add_argument("--retain", type=Path)
    modes.add_argument("--verify", type=Path)
    modes.add_argument("--refresh-provenance", type=Path)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--verification-output", type=Path)
    parser.add_argument("--source-kind", choices=["frozen-run", "post-inspection-derivative"])
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    assert pycolmap.__version__ == "4.2.1"
    if args.retain:
        retain(args.retain.resolve(), root)
        return
    if args.verify:
        assert args.verification_output is not None
        verify(args.verify.resolve(), args.verification_output.resolve(), root)
        return
    if args.refresh_provenance:
        refresh_provenance(args.refresh_provenance.resolve(), root)
        return
    assert args.output is not None and args.source_kind is not None
    source_run, output = args.source_run.resolve(), args.output.resolve()
    assert source_run == root / "artifacts/realism-01/connector-rig/run-01"
    assert output.is_relative_to(root / "artifacts/realism-01/connector-parallax") and not output.exists()
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
    pipeline = pipeline_options()
    assert pipeline.summary() == json.loads((source_run / "settings.json").read_text())["mapping"]
    mapper_options, triangulation_options, cache_options, stages = last_stage_options(pipeline)
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
