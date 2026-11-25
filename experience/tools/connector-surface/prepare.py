import argparse
import hashlib
import importlib.util
import json
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
import pycolmap
import pycolmap.panorama as panorama
from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = ROOT / "experience/evidence/realism-01/connector-rig/run-02"
METHODS = ROOT / "artifacts/realism-01/surface-methods"
WORKSPACE = ROOT / "artifacts/realism-01/connector-surface"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def store(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def command(arguments, output, stem):
    record = {"argv": [str(value) for value in arguments], "cwd": str(output),
        "startedAt": datetime.now(timezone.utc).isoformat()}
    store(output / (stem + ".command.json"), record)
    with (output / (stem + ".txt")).open("w") as log:
        completed = subprocess.run(record["argv"], cwd=output, stdout=log, stderr=subprocess.STDOUT)
    record.update({"returnCode": completed.returncode, "finishedAt": datetime.now(timezone.utc).isoformat()})
    store(output / (stem + ".command.json"), record)
    completed.check_returncode()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--intake", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    intake, output = args.intake.resolve(), args.output.resolve()
    assert intake.is_relative_to(ROOT / "artifacts")
    assert output.is_relative_to(WORKSPACE) and not output.exists()
    output.mkdir(parents=True)
    shutil.copyfile(Path(__file__), output / "executed-prepare.py")
    original = json.loads((EVIDENCE / "result.json").read_text())
    selected = json.loads((intake / "selected.json").read_text())
    assert selected == json.loads((EVIDENCE / "selected.json").read_text())
    assert len(selected) == 4
    assert pycolmap.__version__ == "4.2.1"
    assert Path(panorama.__file__).read_bytes() == (EVIDENCE / "producers/upstream-panorama.py").read_bytes()
    assert digest(METHODS / "OpenMVS_Ubuntu_x64.zip") == "7104ae1ddd6ca38fbca9e0e4a70b20af59e21e0b497eb7181c864fbf38ca8d00"
    model = pycolmap.Reconstruction(EVIDENCE / "sparse/0")
    assert model.num_reg_images() == 48 and model.num_points3D() == 1377
    sources, projected, partition = [output / name for name in ["sources", "projected", "partition-masks"]]
    for directory in [sources, projected, partition, output / "source-colmap", output / "colmap/sparse", output / "colmap/images", output / "masks"]:
        directory.mkdir(parents=True)
    for source in selected:
        path = intake / (source["id"] + "-hd.jpg")
        expected = next(item for item in original["sources"] if item["id"] == source["id"])
        assert digest(path) == expected["file"]["sha256"]
        with Image.open(path) as image:
            assert image.size == (6080, 3040)
        shutil.copyfile(path, sources / (source["id"] + ".jpg"))
    cv2.setNumThreads(2)
    processor = panorama.PanoProcessor(sources, projected, partition,
        panorama.PANO_RENDER_OPTIONS[panorama.PanoRenderType.PERSPECTIVE_OVERLAPPING])
    for source in selected:
        processor.process(source["id"] + ".jpg")
    model.write_text(output / "source-colmap")
    reader_path = METHODS / "upstream/colmap-read-write-model-3.11.1.py"
    specification = importlib.util.spec_from_file_location("colmap_model_io", reader_path)
    model_io = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(model_io)
    cameras, images, points = model_io.read_model(output / "source-colmap", ext=".txt")
    records, retained, dropped = [], {}, []
    for image_id, image in images.items():
        folder, source_name = image.name.split("/")
        camera_index = int(folder.removeprefix("pano_camera"))
        rendered = next(item for item in original["rendered"] if item["cameraIndex"] == camera_index and item["sourceId"] == Path(source_name).stem)
        projected_path = projected / image.name
        assert digest(projected_path) == rendered["image"]["sha256"]
        mask_path = EVIDENCE / "masks" / (folder + ".png")
        with Image.open(mask_path) as mask:
            mask_values = np.asarray(mask)
        assert set(np.unique(mask_values)).issubset({0, 255})
        assert int(np.count_nonzero(mask_values)) == rendered["retainedPixels"]
        if not np.any(mask_values):
            assert not np.any(image.point3D_ids >= 0)
            dropped.append({"imageId": image_id, "originalName": image.name, "reason": "Original upper-hemisphere mask retains zero pixels"})
            continue
        name = folder + "__" + source_name
        retained[image_id] = image._replace(name=name)
        shutil.copyfile(projected_path, output / "colmap/images" / name)
        shutil.copyfile(mask_path, output / "masks" / (Path(name).stem + ".mask.png"))
        records.append({"imageId": image_id, "originalName": image.name, "name": name,
            "sourceId": Path(source_name).stem, "cameraIndex": camera_index,
            "frameId": model.image(image_id).frame_id, "imageSha256": digest(projected_path),
            "maskSha256": digest(mask_path), "validMaskPixels": int(np.count_nonzero(mask_values)),
            "camFromWorld": model.image(image_id).cam_from_world().matrix().tolist(),
            "center": model.image(image_id).projection_center().tolist()})
    assert len(retained) == 32 and len(dropped) == 16
    assert all(set(point.image_ids).issubset(retained) for point in points.values())
    cameras = {key: camera for key, camera in cameras.items() if any(image.camera_id == key for image in retained.values())}
    model_io.write_model(cameras, retained, points, output / "colmap/sparse", ext=".txt")
    command([METHODS / "bin/InterfaceCOLMAP", "-i", output / "colmap", "-o", output / "scene.mvs",
        "--image-folder", output / "colmap/images", "--max-threads", "2"], output, "01-import")
    command([METHODS / "bin/InterfaceCOLMAP", "-i", output / "scene.mvs", "-o", output / "roundtrip-cameras",
        "--image-folder", output / "colmap/images", "--no-points", "1", "--binary", "0", "--max-threads", "2"], output, "02-export-cameras")
    exported_cameras, exported_images, _ = model_io.read_model(output / "roundtrip-cameras/sparse", ext=".txt")
    assert len(exported_images) == len(retained)
    maximum_pose_error = 0.0
    mapping = []
    lookup = {record["name"]: record for record in records}
    for internal_id, image in enumerate(exported_images.values()):
        record = lookup[image.name]
        assert image.id == record["imageId"]
        pose = np.concatenate([image.qvec2rotmat(), image.tvec[:, None]], axis=1)
        error = float(np.max(np.abs(pose - np.asarray(record["camFromWorld"]))))
        maximum_pose_error = max(maximum_pose_error, error)
        assert error < 1e-4
        camera = exported_cameras[image.camera_id]
        assert camera.model == "PINHOLE" and camera.width == camera.height == 1520
        assert np.array_equal(camera.params, [760.0, 760.0, 760.0, 760.0])
        mapping.append({**record, "internalId": internal_id, "roundtripTextPoseMaximumError": error})
    assert all(np.any(image.point3D_ids >= 0) for image in retained.values())
    command([METHODS / "bin/InterfaceCOLMAP", "-i", output / "scene.mvs", "-o", output / "roundtrip-exact",
        "--image-folder", output / "colmap/images", "--force-points", "1", "--binary", "1", "--max-threads", "2"], output, "02b-export-exact")
    exact = pycolmap.Reconstruction(output / "roundtrip-exact/sparse")
    assert exact.num_reg_images() == 32 and exact.num_points3D() == 1377
    exact_errors = []
    for image in exact.images.values():
        record = lookup[image.name]
        error = float(np.max(np.abs(image.cam_from_world().matrix() - np.asarray(record["camFromWorld"]))))
        assert error < 1e-12
        exact_errors.append(error)
    report = {"schemaVersion": 1, "completed": True, "date": datetime.now(timezone.utc).isoformat(),
        "sourceRunReportSha256": digest(EVIDENCE / "result.json"), "originalPhysicalFrames": 4,
        "originalVirtualImages": 48, "retainedVirtualImages": 32, "sparsePoints": 1377,
        "imageRecords": mapping, "droppedImages": dropped, "heldoutImagesIncluded": [],
        "upstreamReaderSha256": digest(reader_path), "officialProjectionSha256": digest(Path(panorama.__file__)),
        "maximumRoundtripTextPoseError": maximum_pose_error,
        "maximumRoundtripBinaryPoseError": max(exact_errors),
        "roundtripPrecision": "Official InterfaceCOLMAP TXT exporter uses default stream precision; tolerance 1e-4 covers serialization rounding. Actual scene retains source double poses.",
        "maskRule": "Unchanged original closest-camera partition intersected with upper hemisphere; label 0 excluded, 255 retained",
        "limitations": ["Relative geometry remains in arbitrary units.", "All source pixels originate from the four fitted panoramas; held-out ranks 67 and 72 are excluded.",
            "Source locations remain west of the approved route start; floor and complete-route appearance remain unqualified."]}
    store(output / "prepared.json", report)
    print(json.dumps({"prepared": str(output), "images": len(mapping), "originalPanoramas": 4, "poseError": maximum_pose_error}))


if __name__ == "__main__":
    main()
