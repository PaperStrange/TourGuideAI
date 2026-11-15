import argparse
import hashlib
import importlib.metadata
import itertools
import json
import os
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parents[3]
cache = root / "artifacts/realism-01/connector-rig/plot-cache"
cache.mkdir(parents=True, exist_ok=True)
os.environ["MPLCONFIGDIR"] = str(cache)

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pycolmap
import pycolmap.panorama as panorama


def write_json(filename, value):
    filename.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def digest(filename):
    return hashlib.sha256(filename.read_bytes()).hexdigest()


def export_observations(database_path, output):
    arrays = {}
    result = {"schemaVersion": 1, "images": [], "cameras": [], "rigs": [], "frames": [], "pairs": []}
    with pycolmap.Database.open(database_path) as database:
        images = {image.image_id: image for image in database.read_all_images()}
        cameras = {camera.camera_id: camera for camera in database.read_all_cameras()}
        for camera_id, camera in sorted(cameras.items()):
            result["cameras"].append({"id": camera_id, "model": camera.model_name,
                "width": camera.width, "height": camera.height, "params": camera.params.tolist()})
        for image_id, image in sorted(images.items()):
            camera_folder, source_name = Path(image.name).parts
            assert camera_folder.startswith("pano_camera")
            camera_index = int(camera_folder.removeprefix("pano_camera"))
            assert 0 <= camera_index < 12 and camera_folder == f"pano_camera{camera_index}"
            key = f"keypoints_{image_id}"
            arrays[key] = database.read_keypoints(image_id)
            result["images"].append({"imageId": image_id, "name": image.name,
                "cameraId": image.camera_id, "frameId": image.frame_id, "sourceId": Path(source_name).stem,
                "cameraIndex": camera_index, "keypointsKey": key, "features": len(arrays[key]),
                "width": cameras[image.camera_id].width, "height": cameras[image.camera_id].height,
                "maskPath": f"masks/pano_camera{camera_index}.png"})
        for rig in database.read_all_rigs():
            sensors = []
            for sensor in sorted(rig.sensor_ids(), key=lambda value: value.id):
                reference = rig.is_ref_sensor(sensor)
                transform = pycolmap.Rigid3d() if reference else rig.sensor_from_rig(sensor)
                sensors.append({"sensorId": sensor.id, "reference": reference,
                    "sensorFromRig": transform.matrix().tolist()})
            result["rigs"].append({"rigId": rig.rig_id, "refSensorId": rig.ref_sensor_id.id, "sensors": sensors})
        for frame in database.read_all_frames():
            result["frames"].append({"id": frame.frame_id, "rigId": frame.rig_id,
                "imageIds": sorted(image.id for image in frame.image_ids)})
        match_pair_ids, _ = database.read_all_matches()
        geometry_pair_ids, _ = database.read_two_view_geometry_num_inliers()
        for pair_id in sorted(set(match_pair_ids) | set(geometry_pair_ids)):
            first_id, second_id = pycolmap.pair_id_to_image_pair(pair_id)
            geometry = database.read_two_view_geometry(first_id, second_id)
            matches_key, inliers_key = f"matches_{pair_id}", f"inliers_{pair_id}"
            arrays[matches_key] = database.read_matches(first_id, second_id)
            arrays[inliers_key] = geometry.inlier_matches
            pose = geometry.cam2_from_cam1
            result["pairs"].append({"pairId": pair_id, "imageIds": [first_id, second_id],
                "frames": [images[first_id].frame_id, images[second_id].frame_id],
                "matchKey": matches_key, "inlierKey": inliers_key,
                "tentativeMatches": len(arrays[matches_key]), "verifiedInliers": len(arrays[inliers_key]),
                "storedGeometry": pair_id in geometry_pair_ids, "configuration": int(geometry.config),
                "configurationName": str(pycolmap.TwoViewGeometryConfiguration(geometry.config)),
                "cam2FromCam1": pose.matrix().tolist() if pose is not None else None,
                **{name: getattr(geometry, name).tolist() if getattr(geometry, name) is not None else None for name in ["E", "F", "H"]}})
        result["posePriorCount"] = len(database.read_all_pose_priors())
    np.savez_compressed(output / "observations.npz", **arrays)
    write_json(output / "observations.json", result)
    return result


def create_board(output, report, observations, summary):
    ranks = {source["id"]: source["rank"] for source in report["sources"]}
    image_sources = {image["imageId"]: image["sourceId"] for image in observations["images"]}
    support = {tuple(sorted(pair)): [0, 0] for pair in itertools.combinations(ranks, 2)}
    for pair in observations["pairs"]:
        source_pair = tuple(sorted(image_sources[value] for value in pair["imageIds"]))
        support[source_pair][0] += pair["tentativeMatches"]
        support[source_pair][1] += pair["verifiedInliers"]
    figure = plt.figure(figsize=(12, 8), layout="constrained")
    figure.suptitle(f'Kyoto shared-camera rig · {summary["sourcePanoramas"]} original panoramas / '
        f'{summary["virtualImages"]} virtual views\n{summary["models"]} reconstructed models · '
        f'{summary["registeredPhysicalFramesMaximum"]} registered physical frames', fontsize=14)
    axis = figure.add_subplot(2, 2, 1)
    labels = [f'{ranks[first]} ↔ {ranks[second]}' for first, second in support]
    positions = np.arange(len(labels))
    axis.barh(positions - 0.17, [values[0] for values in support.values()], height=0.32, color="#a1adb8", label="Tentative")
    bars = axis.barh(positions + 0.17, [values[1] for values in support.values()], height=0.32, color="#167567", label="Verified")
    axis.bar_label(bars, padding=3, fontsize=8)
    axis.set_yticks(positions, labels)
    axis.set_xlabel("Sum across virtual image pairs (not unique tracks)")
    axis.set_ylabel("Physical source sequence ranks")
    axis.legend(fontsize=8)
    axis.set_title("Actual feature correspondence support", fontsize=11)
    axis = figure.add_subplot(2, 2, 2)
    values = [pair["verifiedInliers"] for pair in observations["pairs"] if pair["storedGeometry"]]
    axis.bar(np.arange(len(values)), sorted(values, reverse=True), color="#4b6d8b")
    axis.axhline(15, color="#a04c22", linestyle="--", label="Default graph minimum: 15")
    axis.set_xlabel("Stored two-view geometry records, ranked")
    axis.set_ylabel("Verified inlier count")
    axis.set_title(f'{summary["storedGeometries"]} stored / {summary["usableGeometries"]} usable pairs', fontsize=11)
    axis.legend(fontsize=8)
    if report["models"]:
        axis = figure.add_subplot(2, 2, 3, projection="3d")
        for model in report["models"]:
            points = np.asarray([point["xyz"] for point in model["points"]])
            if len(points):
                colors = np.asarray([point["rgb"] for point in model["points"]]) / 255
                axis.scatter(*points.T, c=colors, s=2, alpha=0.6)
            centers = np.asarray([frame["center"] for frame in model["frames"]])
            axis.scatter(*centers.T, c="crimson", marker="^", s=35)
        axis.set_title("Actual sparse structure and physical camera centers", fontsize=10)
        for dimension in ["x", "y", "z"]:
            getattr(axis, f"set_{dimension}label")(f"{dimension.upper()} · arbitrary units", fontsize=8)
    else:
        axis = figure.add_subplot(2, 2, 3)
        axis.axis("off")
        axis.text(0.5, 0.65, "NO SPARSE MODEL", ha="center", fontsize=21, weight="bold", color="#9a3b30")
        axis.text(0.5, 0.39, "No recovered camera path or point cloud to display.\nVirtual projections are observations, not camera recovery.\nNo geometry, floor, scale or collision is invented.", ha="center", fontsize=10, linespacing=1.6)
    axis = figure.add_subplot(2, 2, 4)
    axis.axis("off")
    lines = [f'Source dates: {", ".join(summary["sourceDates"])}',
        f'Original panoramas: {summary["sourcePanoramas"]} · fixed virtual sensors: 12',
        f'Actual sparse points: {summary["sparsePointsMaximum"]}',
        f'Relative-camera diagnostic passes: {summary["relativeCameraDiagnosticPasses"]}',
        "Unmodified geometric initialization and filter settings",
        "CPU · known projection calibration and rig transforms fixed",
        "Original upper-hemisphere partition masks retained",
        "Source GPS excluded from fitting; metric scale unverified",
        "West of route start; eastbound corridor remains unqualified",
        "Continuous ground, collision and appearance gates remain open"]
    axis.text(0.0, 0.95, "\n".join(lines), va="top", fontsize=9, linespacing=1.6)
    figure.supxlabel("Irvin Chen / Panoramax · source-derived evidence CC BY-SA 4.0\nNumerical research evidence; not a live route preview or a quality approval", fontsize=9)
    figure.savefig(output / "geometry-board.png", dpi=140)
    plt.close(figure)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    run, output = args.run.resolve(), args.output.resolve()
    assert run.is_relative_to(root / "artifacts/realism-01/connector-rig")
    assert output.is_relative_to(root / "experience/evidence/realism-01/connector-rig") and not output.exists()
    report = json.loads((run / "result.json").read_text())
    assert report["completed"] and report["stage"] == "complete"
    assert digest(run / "executed-run.py") == report["producer"]["sha256"]
    for record in report["files"]:
        filename = Path(record["path"])
        assert filename.is_relative_to(run) and filename.stat().st_size == record["bytes"]
        if filename != run / "database.db":
            assert digest(filename) == record["sha256"]
    database_source = run / "database.db"
    database_bytes = database_source.read_bytes()
    before_hash = digest(database_source)
    work = root / "artifacts/realism-01/connector-rig/retention-work" / run.name
    work.mkdir(parents=True, exist_ok=True)
    database_copy = work / "database.db"
    shutil.copyfile(database_source, database_copy)
    with sqlite3.connect(f"file:{database_source}?mode=ro", uri=True) as connection:
        assert connection.execute("PRAGMA integrity_check").fetchone() == ("ok",)
    output.mkdir(parents=True)

    def copy(source, destination):
        filename = output / destination
        filename.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, filename)

    for name in ["result.json", "settings.json", "selected.json"]:
        copy(run / name, name)
    copy(run / "executed-run.py", "producers/run.py")
    copy(run / "upstream-panorama.py", "producers/upstream-panorama.py")
    for name in ["retain.py", "verify.py", "requirements.txt"]:
        copy(Path(__file__).parent / name, "producers/" + name)
    distribution = importlib.metadata.distribution("pycolmap")
    copy(Path(distribution.locate_file("pycolmap-4.2.1.dist-info/licenses/COPYING.txt")), "producers/colmap-license.txt")
    copy(run.parent / "install.json", "producers/opencv-install.json")
    copy(run.parent / (run.name + ".txt"), "execution.txt")
    for source in report["sources"]:
        copy(Path(source["receipt"]["path"]), f'sources/{source["id"]}.receipt.json')
    for index in range(12):
        masks = [item for item in report["rendered"] if item["cameraIndex"] == index]
        assert len(masks) == len(report["sources"]) and len({item["mask"]["sha256"] for item in masks}) == 1
        copy(Path(masks[0]["mask"]["path"]), f"masks/pano_camera{index}.png")
    for directory in ["sparse", "sparse_equirectangular"]:
        for filename in sorted((run / directory).rglob("*")):
            if filename.is_file():
                copy(filename, str(filename.relative_to(run)))
    # 官方数据库类即使只读查询也会更新 SQLite 头部计数，因此仅打开隔离副本。
    observations = export_observations(database_copy, output)
    assert digest(database_source) == before_hash
    exported_features = {image["name"]: image["features"] for image in observations["images"]}
    assert exported_features == {image["image"]: image["count"] for image in report["features"]}
    exported_images = {image["imageId"]: image for image in observations["images"]}
    exported_pairs = {tuple(exported_images[image_id]["name"] for image_id in pair["imageIds"]): pair for pair in observations["pairs"] if pair["storedGeometry"]}
    assert len(exported_pairs) == len(report["pairs"])
    for pair in report["pairs"]:
        exported_pair = exported_pairs[tuple(pair["images"])]
        assert all(exported_pair[key] == pair[key] for key in ["tentativeMatches", "verifiedInliers", "frames"])
        assert exported_pair["configurationName"] == pair["configuration"]
    assert len(observations["rigs"]) == report["databaseRigCount"]
    assert observations["posePriorCount"] == report["databasePosePriors"] == 0
    assert {frame["id"]: (frame["rigId"], len(frame["imageIds"])) for frame in observations["frames"]} == {
        frame["frameId"]: (frame["rigId"], frame["dataCount"]) for frame in report["databasePhysicalFrames"]}
    read_bytes = database_copy.read_bytes()
    changed_offsets = [index for index, (before, after) in enumerate(zip(database_bytes, read_bytes)) if before != after]
    write_json(output / "database-export.json", {"schemaVersion": 1,
        "originalRunDatabase": report["database"], "observedSourceSha256": before_hash,
        "observedSourceBytes": len(database_bytes), "observedAt": datetime.now(timezone.utc).isoformat(),
        "originalRunBytesAvailable": before_hash == report["database"]["sha256"],
        "isolatedReadCopySha256": digest(database_copy), "isolatedReadByteChanges": changed_offsets,
        "sourceUnchangedDuringExport": True, "resultFeaturePairFrameRigCountsMatch": True,
        "sqliteIntegrityCheck": "ok", "method": "Byte-copy the observed database; export via official pycolmap from the isolated copy only. Compare all feature, stored pair, frame and rig counts against the immutable run result.",
        "limitations": "Prior diagnostic pycolmap Database.open calls modified the first trial database before retention; its exact original bytes are unavailable. Isolated reproduction changes SQLite header counters at offsets 24–27 and 92–95. No original header is reconstructed and no report hash is rewritten." if before_hash != report["database"]["sha256"] else "Original database bytes match the immutable result; the isolated read copy has separate provenance."})
    summary = {"schemaVersion": 1, "run": run.name, "completed": True,
        "sourcePanoramas": len(report["sources"]), "sourceDates": sorted({source["date"][:10] for source in report["sources"]}),
        "virtualImages": len(observations["images"]), "databasePhysicalFrames": len(observations["frames"]),
        "models": len(report["models"]),
        "registeredPhysicalFramesMaximum": max((model["registeredPhysicalFrames"] for model in report["models"]), default=0),
        "sparsePointsMaximum": max((model["points3D"] for model in report["models"]), default=0),
        "storedGeometries": sum(pair["storedGeometry"] for pair in observations["pairs"]),
        "usableGeometries": sum(pair["storedGeometry"] and pair["verifiedInliers"] >= 15 for pair in observations["pairs"]),
        "relativeCameraDiagnosticPasses": sum(model.get("relativeCameraDiagnosticPass", False) for model in report["models"]),
        "status": "relative-geometry-diagnostic" if report["models"] else "completed-no-model",
        "qualifiedContinuousRoute": False, "qualifiedMetricScale": False, "qualifiedFloorOrCollision": False,
        "sourceGpsUsedForFitting": False, "sourceCollection": report["sources"][0]["collection"],
        "startedAt": report["startedAt"], "finishedAt": report["finishedAt"],
        "elapsedSeconds": (datetime.fromisoformat(report["finishedAt"]) - datetime.fromisoformat(report["startedAt"])).total_seconds(),
        "limitations": report["limitations"]}
    write_json(output / "summary.json", summary)
    create_board(output, report, observations, summary)
    timestamp = datetime.now(timezone.utc).isoformat()
    manifest = {"schemaVersion": 1, "createdAt": timestamp,
        "source": "Irvin Chen / Panoramax; individual source identities and original byte hashes are retained in selected.json, result.json and sources/ receipts",
        "date": report["finishedAt"], "rights": "CC BY-SA 4.0 for source-derived evidence; COLMAP BSD-3-Clause and repository licensing for code",
        "location": "Kyoto, Japan; Shijō–Karasuma crossing area, west of the approved first route edge",
        "method": report["method"], "limitations": report["limitations"], "files": []}
    for filename in sorted(output.rglob("*")):
        if filename.is_file():
            manifest["files"].append({"path": str(filename.relative_to(output)), "bytes": filename.stat().st_size,
                "sha256": digest(filename), "source": "Exact executed run, pinned producers, original acquisition receipts or actual database observations",
                "date": timestamp, "rights": "BSD-3-Clause; see producers/colmap-license.txt" if filename.name in ["upstream-panorama.py", "colmap-license.txt"] else "CC BY-SA 4.0 source-derived evidence; repository code licensing",
                "location": "Kyoto, Japan; exact source coordinates retained in selected.json",
                "method": "Byte-identical retention, mature-library database export or labelled numerical plot",
                "limitations": "Relative geometry diagnostic; no metric scale, continuous floor, eastbound route or appearance approval"})
    write_json(output / "manifest.json", manifest)
    print(json.dumps({"output": str(output), "files": len(manifest["files"]), "summary": summary}))


if __name__ == "__main__":
    main()
