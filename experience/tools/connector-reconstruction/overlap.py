import argparse
import hashlib
import importlib.metadata
import itertools
import json
import math
import platform
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import py360convert
import pycolmap
from PIL import Image


def digest(filename):
    return hashlib.sha256(filename.read_bytes()).hexdigest()


def identity(filename):
    return {"path": str(filename), "bytes": filename.stat().st_size, "sha256": digest(filename)}


def write_json(filename, value):
    filename.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def main():
    parser = argparse.ArgumentParser(description="Measure native panorama overlap with CPU COLMAP.")
    parser.add_argument("--intake", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument("--projection", choices=["perspective", "spherical"], default="perspective")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[3]
    intake = args.intake.resolve()
    output = args.output.resolve()
    assert intake.is_relative_to(root / "artifacts")
    assert output.is_relative_to(root / "artifacts/realism-01/connector-reconstruction")
    assert not output.exists(), "The output must be a new run directory."
    assert args.size >= 256
    spherical = args.projection == "spherical"
    selected_path = intake / "selected.json"
    sources = json.loads(selected_path.read_text())
    assert len(sources) == 3 and len({item["id"] for item in sources}) == 3
    assert len({item["collection"] for item in sources}) == 1
    output.mkdir(parents=True)
    (output / "executed-overlap.py").write_bytes(Path(__file__).read_bytes())
    report = {
        "schemaVersion": 1,
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "completed": False,
        "method": "CPU SIFT matching and native spherical sparse reconstruction of three licensed panoramas" if spherical else "CPU SIFT matching and fixed virtual-pinhole sparse reconstruction of three licensed panoramas",
        "producer": identity(Path(__file__).resolve()),
        "selection": identity(selected_path),
        "versions": {name: importlib.metadata.version(name) for name in ["pycolmap", "py360convert", "Pillow", "numpy", "scipy"]},
        "python": platform.python_version(),
        "device": "pycolmap.Device.cpu",
        "conditions": {
            "projection": args.projection,
            "cropSize": args.size, "horizontalFovDegrees": 90,
            "verticalFovDegrees": 90, "pitchDegrees": 0,
            "headingsRelativeToPanoramaDegrees": [None] if spherical else [0, 90, 180, -90],
            "interpolation": "bilinear", "numThreads": 2,
            "maxNumFeatures": 8192, "randomSeed": 0,
            "cameraModel": "EQUIRECTANGULAR" if spherical else "PINHOLE",
            "focalPixels": (args.size - 1) / 2,
            "principalPointPixels": [args.size / 2, args.size / 2],
            "intrinsicsExplanation": "py360convert samples inclusive image endpoints; COLMAP uses a half-pixel origin. This fixes the virtual projection, while physical stitching calibration remains unverified.",
            "sourceGeolocationUsedForFitting": False,
            "featureMask": "Only the upper half of each horizontal crop is admitted. The lower hemisphere contains car-roof reflection, vehicles and ground; it is excluded from this facade-overlap trial.",
        },
        "sources": [], "directions": [],
        "limitations": [
            "Three selected source cameras lie west of the first approved route edge; this test establishes no complete route coverage.",
            "Spherical stitching, scene motion and image redaction can violate a single-center camera model.",
            "Virtual projection intrinsics do not establish physical lens calibration or absolute camera orientation.",
            "Sparse coordinates have arbitrary similarity scale; declared GPS accuracy is not surveyed control.",
            "Sparse correspondences establish no continuous pedestrian floor, collision surface, lighting qualification or independent recognition.",
            "The three reconstruction sources cannot also serve as held-out appearance references.",
            "The shared upper-half feature mask excludes the ground. Traffic and sky remaining above the horizon require geometric rejection and later surface review.",
        ],
    }
    if spherical:
        report["conditions"].update({"cropSize": None, "horizontalFovDegrees": 360,
            "verticalFovDegrees": 180, "interpolation": "Unchanged decoded panorama pixels",
            "focalPixels": None, "principalPointPixels": None,
            "maximumFeatureImageSize": 3040,
            "intrinsicsExplanation": "Native COLMAP EQUIRECTANGULAR model uses panorama width/height. Physical stitching calibration remains unverified.",
            "featureMask": "Only the original panorama upper hemisphere is admitted; lower hemisphere including reflected car roof and ground is excluded."})
    report_path = output / "result.json"
    write_json(report_path, report)
    arrays = {}
    for source in sources:
        assert source["license"] == "CC-BY-SA-4.0"
        assert source["projection"] == "equirectangular"
        filename = intake / f'{source["id"]}-hd.jpg'
        receipt_path = filename.with_name(filename.name + ".receipt.json")
        receipt = json.loads(receipt_path.read_text())
        assert receipt["status"] == 200
        assert receipt["bytes"] == filename.stat().st_size
        assert receipt["sha256"] == digest(filename)
        with Image.open(filename) as image:
            assert image.size == tuple(source["camera"]["sensor_array_dimensions"])
            assert image.width == image.height * 2
            arrays[source["id"]] = np.asarray(image.convert("RGB"))
        report["sources"].append({**source, "file": identity(filename), "receipt": identity(receipt_path)})
    write_json(report_path, report)

    for heading in report["conditions"]["headingsRelativeToPanoramaDegrees"]:
        directory = output / f"heading-{heading}"
        image_directory = directory / "images"
        image_directory.mkdir(parents=True)
        images = []
        for source in sources:
            pixels = arrays[source["id"]] if spherical else py360convert.e2p(arrays[source["id"]], (90, 90), heading, 0, (args.size, args.size), mode="bilinear")
            filename = image_directory / f'{source["id"]}.png'
            Image.fromarray(pixels).save(filename)
            images.append(identity(filename))

        mask = np.zeros(pixels.shape[:2], dtype=np.uint8)
        mask[:pixels.shape[0] // 2, :] = 255
        mask_path = directory / "facade-mask.png"
        Image.fromarray(mask).save(mask_path)

        # 固定虚拟投影参数；地理坐标不参与相机求解或比例估计。
        reader = pycolmap.ImageReaderOptions()
        reader.camera_model = "EQUIRECTANGULAR" if spherical else "PINHOLE"
        reader.camera_mask_path = str(mask_path)
        focal = (args.size - 1) / 2
        center = args.size / 2
        if not spherical:
            reader.camera_params = f"{focal},{focal},{center},{center}"
        extraction = pycolmap.FeatureExtractionOptions()
        extraction.num_threads = 2
        extraction.use_gpu = False
        extraction.max_image_size = 3040 if spherical else args.size
        extraction.sift.max_num_features = 8192
        matching = pycolmap.FeatureMatchingOptions()
        matching.num_threads = 2
        matching.use_gpu = False
        verification = pycolmap.TwoViewGeometryOptions()
        verification.compute_relative_pose = True
        verification.ransac.random_seed = 0
        mapping = pycolmap.IncrementalPipelineOptions()
        mapping.min_model_size = 3
        mapping.max_num_models = 1
        mapping.num_threads = 2
        mapping.random_seed = 0
        mapping.ba_use_gpu = False
        mapping.ba_refine_focal_length = False
        mapping.ba_refine_principal_point = False
        mapping.ba_refine_extra_params = False
        mapping.mapper.abs_pose_refine_focal_length = False
        mapping.mapper.abs_pose_refine_extra_params = False
        mapping.mapper.num_threads = 2
        mapping.mapper.random_seed = 0
        mapping.triangulation.random_seed = 0
        settings = {name: value.summary() for name, value in [
            ("reader", reader), ("extraction", extraction), ("matching", matching),
            ("verification", verification), ("mapping", mapping),
        ]}
        write_json(directory / "settings.json", settings)
        direction = {"headingDegrees": heading, "images": images, "featureMask": identity(mask_path), "settings": identity(directory / "settings.json"),
                     "stage": "feature-extraction", "pairs": [], "models": []}
        report["directions"].append(direction)
        write_json(report_path, report)
        database_path = directory / "database.db"
        pycolmap.extract_features(database_path, image_directory, camera_mode=pycolmap.CameraMode.SINGLE,
                                  reader_options=reader, extraction_options=extraction, device=pycolmap.Device.cpu)
        direction["stage"] = "matching"
        write_json(report_path, report)
        pycolmap.match_exhaustive(database_path, matching_options=matching,
                                 verification_options=verification, device=pycolmap.Device.cpu)
        database = pycolmap.Database.open(database_path)
        loaded = sorted(database.read_all_images(), key=lambda image: image.name)
        direction["features"] = [{"image": image.name, "count": len(database.read_keypoints(image.image_id))}
                                 for image in loaded]
        for first, second in itertools.combinations(loaded, 2):
            matches = database.read_matches(first.image_id, second.image_id)
            geometry = database.read_two_view_geometry(first.image_id, second.image_id)
            pose = geometry.cam2_from_cam1
            direction["pairs"].append({
                "images": [first.name, second.name], "tentativeMatches": len(matches),
                "verifiedInliers": len(geometry.inlier_matches),
                "configuration": str(pycolmap.TwoViewGeometryConfiguration(geometry.config)),
                "triangulationAngleDegrees": math.degrees(geometry.tri_angle) if geometry.tri_angle >= 0 else None,
                "cam2FromCam1": None if pose is None else pose.matrix().tolist(),
            })
        database.close()
        direction["stage"] = "sparse-reconstruction"
        write_json(report_path, report)
        models = pycolmap.incremental_mapping(database_path, image_directory, directory / "sparse", options=mapping)
        for model_id, model in models.items():
            points = list(model.points3D.values())
            assert points and all(np.isfinite(point.xyz).all() and math.isfinite(point.error) for point in points)
            cameras = []
            for image_id in sorted(model.reg_image_ids()):
                image = model.image(image_id)
                cameras.append({"image": image.name, "center": image.projection_center().tolist(),
                                "camFromWorld": image.cam_from_world().matrix().tolist()})
            direction["models"].append({
                "id": model_id, "registeredImages": model.num_reg_images(), "points3D": model.num_points3D(),
                "meanReprojectionErrorPixels": model.compute_mean_reprojection_error(),
                "meanTrackLength": model.compute_mean_track_length(), "cameras": cameras,
                "points": [{"xyz": point.xyz.tolist(), "rgb": point.color.tolist(),
                            "errorPixels": point.error, "trackLength": point.track.length()} for point in points],
            })
            model.export_PLY(str(directory / f"sparse-{model_id}.ply"))
        direction["stage"] = "complete"
        direction["database"] = identity(database_path)
        write_json(report_path, report)
    report["completed"] = True
    report["finishedAt"] = datetime.now(timezone.utc).isoformat()
    report["files"] = [identity(filename) for filename in sorted(output.rglob("*"))
                       if filename.is_file() and filename != report_path]
    write_json(report_path, report)
    print(json.dumps({"report": str(report_path), "directions": len(report["directions"]),
                      "models": sum(len(direction["models"]) for direction in report["directions"])}))


if __name__ == "__main__":
    main()
