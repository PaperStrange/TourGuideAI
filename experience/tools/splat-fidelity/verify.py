import argparse
import hashlib
from importlib.metadata import version
import json
import math
from pathlib import Path
import zipfile

import numpy as np
from PIL import Image


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read(path):
    return json.loads(path.read_text())


def contained(base, name):
    path = (base / name).resolve()
    require(not Path(name).is_absolute() and path.is_relative_to(base.resolve()), f"Path leaves its evidence root: {name}")
    return path


def identity_bytes(data, record, label):
    require(len(data) == record["bytes"] and hashlib.sha256(data).hexdigest() == record["sha256"], f"Identity differs: {label}")


def identity(path, record):
    identity_bytes(path.read_bytes(), record, str(path))


def same_identity(left, right, label):
    require(all(left[key] == right[key] for key in ["bytes", "sha256"]), f"Cross-evidence identity differs: {label}")


def close(actual, expected, label):
    require(math.isfinite(actual) and math.isfinite(expected) and math.isclose(actual, expected, rel_tol=1e-10, abs_tol=1e-10), f"Measurement differs: {label}")


def matrix_error(left, right):
    a, b = np.asarray(left, dtype=float), np.asarray(right, dtype=float)
    require(a.shape == b.shape == (16,) and np.isfinite(a).all() and np.isfinite(b).all(), "Camera/asset matrices must contain 16 finite values")
    return float(np.max(np.abs(a - b)))


def checks(record):
    result = {item["id"]: item["pass"] for item in record["checks"]}
    require(len(result) == len(record["checks"]), "Duplicate check identity")
    return result


def gate(record, name, actual):
    require(checks(record)[name] is bool(actual), f"Recorded check disagrees with observations: {name}")


def image(path):
    with Image.open(path) as source:
        return np.asarray(source.convert("RGB"), dtype=np.float64)


def compare_pixels(directory, record, background):
    arrays = []
    for item in record["inputs"]:
        path = contained(directory, item["path"])
        identity(path, item)
        arrays.append(image(path))
    require(len(arrays) == 2 and arrays[0].shape == arrays[1].shape, "Comparison requires matching image dimensions")
    difference = np.abs(arrays[0] - arrays[1])
    mask = np.maximum.reduce([np.abs(array - background).max(axis=2) for array in arrays]) > 12
    require(mask.any(), "Foreground comparison is empty")
    require(record["canvasPixels"] == mask.size and record["foregroundPixels"] == int(mask.sum()), "Comparison pixel count differs")
    values = {"meanAbsoluteError255": difference.mean(), "rootMeanSquaredError255": np.sqrt(np.square(difference).mean()),
        "foregroundMeanAbsoluteError255": difference[mask].mean(), "foregroundP95ChannelError255": np.percentile(difference[mask], 95)}
    for key, value in values.items():
        close(float(value), record[key], key)


def verify(root, retained_only=False):
    libraries = {name: version(name) for name in ["numpy", "Pillow"]}
    require(libraries == {"numpy": "2.5.4", "Pillow": "12.3.0"}, "Image verification requires numpy==2.5.4 and Pillow==12.3.0")
    folder = root / "experience/evidence/realism-01/qualification/splat-fidelity"
    manifest = read(folder / "manifest.json")
    manifest_paths = [record["path"] for record in manifest["files"]]
    require(len(manifest_paths) == len(set(manifest_paths)), "Duplicate retained file")
    actual_paths = {str(path.relative_to(folder)) for path in folder.rglob("*") if path.is_file() and path.name != "manifest.json"}
    require(set(manifest_paths) == actual_paths, "Retained file inventory differs")
    for record in manifest["files"]:
        require(all(record.get(key) for key in ["source", "date", "rights", "location", "method", "limitations"]), "Missing evidence provenance")
        identity(contained(folder, record["path"]), record)
    producer_paths = [record["path"] for record in manifest["producers"]]
    require(len(producer_paths) == len(set(producer_paths)), "Duplicate producer")
    require("experience/tools/splat-fidelity/verify.py" in producer_paths, "Verifier producer is absent from manifest")
    for record in manifest["producers"]:
        identity(contained(root, record["path"]), record)

    raw_checked = set()

    def optional_original(record):
        path = contained(root, record["path"])
        if not retained_only and path.exists():
            identity(path, record)
            raw_checked.add(record["path"])

    source_manifest = read(folder / "source-files.json")
    source_files = {record["path"]: record for record in source_manifest["files"]}
    require(len(source_files) == len(source_manifest["files"]), "Duplicate original source")
    require(sum(record["bytes"] for record in source_files.values()) == source_manifest["totalSourceBytes"] <= source_manifest["networkLimitBytes"] <= 40000000, "Source acquisition budget differs")
    source_catalog = {}
    for record in source_files.values():
        name = str(Path(source_manifest["cacheRoot"]) / record["path"])
        source_catalog[name] = {**record, "path": name}
        optional_original(source_catalog[name])
    layout = read(folder / "archive-layout.json")
    receipt = read(folder / "knock-source-receipt.json")
    acquisition_path = folder / "knock-original-acquisition.json"
    acquisition = read(acquisition_path)
    require(hashlib.sha256(acquisition_path.read_bytes()).hexdigest() == receipt["recommended_asset"]["receipt_manifest_sha256"], "Source acquisition receipt hash differs")
    same_identity(layout, receipt["recommended_asset"], "Original hall archive")
    require(layout["sha256"] == acquisition["archive_sha256"] and layout["bytes"] == acquisition["archive_bytes"], "Archive acquisition identity differs")
    entry_sources = {record["zip_entry"]: record for record in acquisition["sources"]}
    require(len(entry_sources) == len(acquisition["sources"]) == len(layout["entries"]) == 8, "Original component inventory differs")
    for entry in layout["entries"]:
        original, acquired = source_files[entry["source_path"]], entry_sources[entry["filename"]]
        same_identity(original, acquired, entry["filename"])
        require(acquired["sha256"] == acquired["zip_entry_sha256"] and original["url"] == acquired["url"], "Original component ZIP/source binding differs")
    archive_name = str(Path(source_manifest["cacheRoot"]) / layout["archive"])
    source_catalog[archive_name] = {**layout, "path": archive_name}
    optional_original(source_catalog[archive_name])
    archive_path = contained(root, archive_name)
    if not retained_only and archive_path.exists():
        with zipfile.ZipFile(archive_path) as archive:
            require(archive.namelist() == [entry["filename"] for entry in layout["entries"]], "ZIP component order differs")
            require(archive.comment.hex() == layout["commentHex"], "ZIP comment differs")
            for entry in layout["entries"]:
                info = archive.getinfo(entry["filename"])
                identity_bytes(archive.read(info), source_files[entry["source_path"]], entry["filename"])
                require(list(info.date_time) == entry["date_time"] and info.extra.hex() == entry["extra_hex"] and info.comment.hex() == entry["comment_hex"], "ZIP entry metadata differs")
                require(all(getattr(info, key) == entry[key] for key in ["external_attr", "internal_attr", "create_system", "create_version", "extract_version", "compress_type", "flag_bits"]), "ZIP entry attributes differ")
    config_path = folder / "knock-published-viewer-config.json"
    require(hashlib.sha256(config_path.read_bytes()).hexdigest() == receipt["published_default_camera"]["config_sha256"], "Publisher configuration identity differs")
    config_name = str(Path(source_manifest["cacheRoot"]) / config_path.name)
    source_catalog[config_name] = {"path": config_name, "bytes": config_path.stat().st_size, "sha256": hashlib.sha256(config_path.read_bytes()).hexdigest()}
    for prefix, records in [("artifacts/realism-01/splat-fidelity/downloads", read(folder / "download-receipts.json")["records"]),
                            ("artifacts/realism-01/splat-qualification/downloads", read(folder.parent / "splat-compatibility/download-receipts.json")["records"])]:
        for record in records:
            name = str(Path(prefix) / record["path"])
            source_catalog[name] = {**record, "path": name}

    def producer(record, directory=None):
        path = directory / "tool-snapshot" / Path(record["path"]).name if directory else contained(root, record["path"])
        identity(path, record)

    def report_sources(directory, report):
        historical = {record["path"]: record for record in report.get("toolSources", [])}
        for record in historical.values():
            producer(record, directory)
        inputs = {record["path"]: record for record in report.get("sourceInputs", [])}
        for record in list(inputs.values()) + report.get("servedResources", []):
            if record["path"] in historical:
                same_identity(record, historical[record["path"]], "Historical source tool")
            elif record["path"] in source_catalog:
                same_identity(record, source_catalog[record["path"]], "Original source")
                optional_original(record)
            elif record["path"].startswith("experience/evidence/"):
                identity(contained(root, record["path"]), record)
            else:
                optional_original(record)
            if record["path"] in inputs:
                same_identity(record, inputs[record["path"]], "Actually served source")
        return {record["requestPath"]: record for record in report.get("servedResources", [])}

    def captures(directory, records):
        for record in records:
            path = contained(directory, record["path"])
            identity(path, record)
            observation = record.get("observation")
            if observation and "viewport" in observation:
                pixels = image(path)
                require([pixels.shape[1], pixels.shape[0]] == observation["viewport"], "Capture viewport differs from observation")

    def native_movement(before, after, event):
        return after["draws"] > before["draws"] and matrix_error(before["camera"]["matrixWorld"], after["camera"]["matrixWorld"]) > .00001 and any(item["trusted"] and item["type"] == event for item in after["nativeInputs"])

    def hidden(record):
        observed = record["background"]["visibilityState"] == "hidden" and record["resumed"]["visibilityState"] == "visible"
        gate(record, "native-hidden-resume-observed", observed)
        require(observed is False, "Retained headless observation must retain its failed hidden/resume result")

    shoe_directory = folder / "shoe"
    shoe = read(shoe_directory / "result.json")
    require(shoe["completed"] and not shoe["errors"], "Independent shoe run did not complete cleanly")
    served = report_sources(shoe_directory, shoe)
    same_identity(served["/shoe.splat"], source_catalog["artifacts/realism-01/splat-qualification/downloads/shoe.splat"], "Common shoe source")
    require([record["engine"] for record in shoe["engines"]] == ["spark", "independent"], "Independent renderer pair differs")
    for engine in shoe["engines"]:
        captures(shoe_directory, engine["captures"])
        gate(engine, "source-count", engine["before"]["sourceCount"] == 105144)
        gate(engine, "native-camera-change", native_movement(engine["before"], engine["afterOrbit"], "pointerdown"))
        gate(engine, "disposal-completed", engine["disposed"]["disposed"])
        hidden(engine)
    for pose, field in [("initial", "before"), ("orbit", "afterOrbit")]:
        for matrix in ["matrixWorld", "projectionMatrix"]:
            require(matrix_error(shoe["engines"][0][field]["camera"][matrix], shoe["engines"][1][field]["camera"][matrix]) < 1e-10, f"Shoe {pose} camera differs")
    require(shoe["identicalInitialCameras"] is True, "Common shoe camera observation differs")
    decoder = shoe["engines"][0]["before"]["decoderComparison"]
    require(decoder["matched"] + decoder["ambiguous"] + decoder["missing"] == decoder["count"] == decoder["independentCount"] == 105144, "Partial decoder identity inventory differs")
    require(decoder["missing"] > 0 and decoder["ambiguous"] > 0, "Partial decoder comparison must preserve excluded entries")
    shoe_comparison = read(shoe_directory / "comparison.json")
    producer(shoe_comparison["producer"])
    require([record["pose"] for record in shoe_comparison["comparisons"]] == ["initial", "orbit"], "Shoe comparison pose inventory differs")
    for comparison in shoe_comparison["comparisons"]:
        compare_pixels(shoe_directory, comparison, np.array([32, 37, 42]))

    hall_reports = {}
    for variant in ["default", "focal2"]:
        directory = folder / "hall" / variant
        report = read(directory / "result.json")
        require(report["completed"], "Hall comparison did not complete")
        served = report_sources(directory, report)
        same_identity(served["/hall.sog"], layout, "Common hall archive")
        for record in acquisition["sources"]:
            same_identity(served[record["url"]], record, "Publisher original component")
        captures(directory, report["captures"])
        require(read(directory / "publisher-camera.json") == report["publisher"], "Publisher camera file differs")
        world = matrix_error(report["publisher"]["camera"]["matrixWorld"], report["before"]["camera"]["matrixWorld"])
        projection = matrix_error(report["publisher"]["camera"]["projectionMatrix"], report["before"]["camera"]["projectionMatrix"])
        close(world, report["cameraAgreement"]["worldMaxAbs"], "Hall world camera")
        close(projection, report["cameraAgreement"]["projectionMaxAbs"], "Hall projection camera")
        gate(report, "publisher-camera-match", world < .00001 and projection < .00001)
        stable = matrix_error(report["publisher"]["camera"]["matrixWorld"], report["publisherCameraAfterCapture"]) < .00001
        gate(report, "publisher-camera-stable-during-capture", stable)
        require(world < .00001 and projection < .00001 and stable, "Comparable hall camera is unqualified")
        require(len(report["publisher"]["assetTransforms"]) == 1 and matrix_error(report["publisher"]["assetTransforms"][0], report["before"]["assetTransform"]) < .00001, "Common hall object transform differs")
        require(report["publisher"]["viewport"] == report["before"]["viewport"], "Common hall viewport differs")
        gate(report, "original-splat-count", report["before"]["sourceCount"] == receipt["recommended_asset"]["splat_count"])
        gate(report, "dispose", report["disposed"]["disposed"])
        require(report["disposed"]["completeMemoryAccounting"] is False, "Complete memory accounting remains unqualified")
        if variant == "default":
            gate(report, "native-orbit", native_movement(report["before"], report["afterOrbit"], "pointerdown"))
            gate(report, "native-dolly", native_movement(report["afterOrbit"], report["afterDolly"], "wheel"))
            hidden(report)
        else:
            require(report["calibrationOnly"] and report["focalAdjustment"] == 2 and report["before"]["rendererSettings"]["focalAdjustment"] == 2, "Calibration renderer setting differs")
        comparison = read(directory / "comparison.json")
        producer(comparison["producer"])
        require(comparison["cameraAgreement"] == report["cameraAgreement"], "Pixel comparison camera binding differs")
        compare_pixels(directory, comparison, np.zeros(3))
        hall_reports[variant] = report

    calibration = read(folder / "hall/calibration-comparison.json")
    producer(calibration["producer"])
    require((folder / "hall/default/publisher-initial.jpg").read_bytes() == (folder / "hall/focal2/publisher-initial.jpg").read_bytes(), "Calibration publisher captures differ")
    paths = [folder / "hall/default/publisher-initial.jpg", folder / "hall/default/spark-initial.jpg", folder / "hall/focal2/spark-initial.jpg"]
    require(len(calibration["inputs"]) == len(paths), "Calibration input inventory differs")
    arrays = []
    for path, record in zip(paths, calibration["inputs"]):
        identity(path, record)
        arrays.append(image(path))
    require(all(array.shape == arrays[0].shape for array in arrays), "Common-mask dimensions differ")
    mask = np.maximum.reduce([array.max(axis=2) for array in arrays]) > 12
    require(int(mask.sum()) == calibration["commonForegroundPixels"], "Common-mask pixel count differs")
    errors = [float(np.abs(array - arrays[0])[mask].mean()) for array in arrays[1:]]
    close(errors[0], calibration["defaultMeanAbsoluteError255"], "Default common-mask MAE")
    close(errors[1], calibration["focal2MeanAbsoluteError255"], "Calibrated common-mask MAE")
    close((1 - errors[1] / errors[0]) * 100, calibration["relativeErrorReductionPercent"], "Common-mask reduction")

    preview_directory = folder / "preview"
    preview = read(preview_directory / "result.json")
    package_path = preview_directory / "package-manifest.json"
    package = read(package_path)
    identity(package_path, preview["source"])
    producer(preview["producer"])
    package_files = {record["path"]: record for record in package["files"]}
    require(len(package_files) == len(package["files"]) and sum(record["bytes"] for record in package_files.values()) == package["bytes"], "Preview package inventory differs")
    preview_root = Path(preview["source"]["path"]).parent
    for record in package_files.values():
        optional_original({**record, "path": str(preview_root / record["path"])})
        if record["source"].startswith("experience/tools/"):
            identity(contained(root, record["source"]), record)
        elif record["source"] in source_catalog:
            same_identity(record, source_catalog[record["source"]], "Packaged source dependency")
    same_identity(package_files["hall.sog"], layout, "Packaged original hall")
    identity(config_path, package_files["hall-config.json"])
    identity(folder / "knock-credit.txt", package_files["licenses/source.txt"])
    identity(folder / "knock-source-receipt.json", package_files["source-receipt.json"])
    requested = set()
    for request in preview["requests"]:
        path = Path(request["path"])
        require(path.is_relative_to(preview_root), "Preview requested an external package path")
        name = str(path.relative_to(preview_root))
        same_identity(request, package_files[name], "Actually requested preview package file")
        requested.add(name)
    required = {"index.html", "viewer.html", "hall.js", "hall.sog", "hall-config.json", "publisher-camera.json", "spark.module.js",
        "three/build/three.module.js", "three/build/three.core.js", "three/examples/jsm/controls/OrbitControls.js", "three/examples/jsm/postprocessing/Pass.js"}
    require(required.issubset(requested), "Preview omitted a required actual dependency request")
    captures(preview_directory, [preview["capture"]])
    require(preview["completed"] and not preview["errors"] and not preview["externalRequests"], "Preview did not complete locally without errors")
    gate(preview, "source-loaded", preview["before"]["sourceCount"] == receipt["recommended_asset"]["splat_count"])
    gate(preview, "no-external-requests", not preview["externalRequests"])
    gate(preview, "no-page-errors", not preview["errors"])
    gate(preview, "native-interaction", native_movement(preview["before"], preview["after"], "pointerdown"))
    require(checks(preview)["attribution-visible"] is True and preview["before"]["rendererSettings"]["focalAdjustment"] == 2, "Preview attribution/calibration observation differs")

    for name in ["shoe-index-assumption", "hall-animated-reference"]:
        directory = folder / "failures" / name
        report = read(directory / "result.json")
        report_sources(directory, report)
        if name == "hall-animated-reference":
            require("publisher-camera-stable-during-capture" not in checks(report), "Invalid animated reference must retain its missing stability gate")
            capture = next(record for record in report["captures"] if record["path"] == "publisher-initial.jpg")
            captures(directory, [capture])
    failure_directory = folder / "failures/preview-missing-transitive-import"
    failed_preview = read(failure_directory / "result.json")
    producer(failed_preview["producer"], failure_directory)
    identity(failure_directory / "package-manifest.json", failed_preview["source"])
    require(failed_preview["completed"] is False and failed_preview["errors"], "Failed dependency preview must remain failed")
    require("three/examples/jsm/postprocessing/Pass.js" not in {record["path"] for record in read(failure_directory / "package-manifest.json")["files"]}, "Historical missing dependency evidence differs")

    print(json.dumps({"status": "passed", "evidenceFiles": len(manifest["files"]), "producers": len(manifest["producers"]),
        "libraries": libraries,
        "sourceComponents": len(entry_sources), "optionalOriginalFilesChecked": len(raw_checked), "retainedOnly": retained_only,
        "imageComparisonsRecomputed": 5, "commonForegroundPixels": int(mask.sum()), "previewDependenciesObserved": len(requested),
        "retainedFailedGate": "native-hidden-resume-observed", "limitations": "Evidence integrity and recomputed observations only; renderer differences, full memory accounting, device performance and Kyoto route acceptance remain unqualified"}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--retained-only", action="store_true", help="Validate tracked evidence without consulting ignored caches or installed browser assets")
    args = parser.parse_args()
    verify(args.root.resolve(), args.retained_only)
