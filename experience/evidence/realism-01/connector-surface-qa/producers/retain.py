import argparse
import gzip
import hashlib
import importlib.metadata
import json
import math
import shutil
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

import analyze


ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = ROOT / "experience/evidence/realism-01/connector-surface-qa"
WORKSPACE = ROOT / "artifacts/realism-01/connector-surface-qa"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def compare(actual, expected, location="root"):
    if isinstance(expected, bool) or expected is None or isinstance(expected, str):
        assert actual == expected, location
    elif isinstance(expected, int):
        assert isinstance(actual, int) and actual == expected, location
    elif isinstance(expected, float):
        assert math.isclose(actual, expected, rel_tol=1e-10, abs_tol=1e-10), location
    elif isinstance(expected, list):
        assert len(actual) == len(expected), location
        for index, (left, right) in enumerate(zip(actual, expected, strict=True)):
            compare(left, right, location + f"[{index}]")
    else:
        assert isinstance(expected, dict) and actual.keys() == expected.keys(), location
        for key in expected:
            compare(actual[key], expected[key], location + "." + key)


def verify(directory):
    manifest = json.loads((directory / "manifest.json").read_text())
    assert manifest["routeQualified"] is False
    for row in manifest["files"]:
        path = (directory / row["path"]).resolve()
        assert path.is_relative_to(directory.resolve())
        data = path.read_bytes()
        assert len(data) == row["bytes"] and digest(data) == row["sha256"], row["path"]
        for key in ["source", "date", "rights", "location", "method", "limitations"]:
            assert row[key], (row["path"], key)
        if path.suffix == ".gz":
            decoded = gzip.decompress(data)
            assert len(decoded) == row["decodedBytes"] and digest(decoded) == row["decodedSha256"]
    for row in manifest["dependencies"]:
        path = (ROOT / row["path"]).resolve()
        assert path.is_relative_to(ROOT)
        assert digest(path.read_bytes()) == row["sha256"] and path.stat().st_size == row["bytes"]
    report = json.loads((directory / "report.json").read_text())
    assert digest((directory / "producers/executed-analyze.py").read_bytes()) == report["producerSha256"]
    for name, version in report["versions"].items():
        assert importlib.metadata.version(name) == version, name
    inputs = directory / "inputs"
    views, masks, centers, cameras = analyze.load_views(inputs / "prepared.json", inputs / "roundtrip", inputs / "read_write_model.py")
    dense, points, arrays = analyze.dense_measurements(inputs / "dense.ply.gz", views, masks, centers, inputs / "native-intrinsics.json")
    mesh = analyze.mesh_measurements(inputs / "mesh.ply.gz", points, dense["maximumPhysicalBaselineArbitraryUnits"])
    texture = analyze.texture_measurements(inputs / "texture.jpg")
    for key, actual in [("cameras", cameras), ("views", views), ("dense", dense), ("mesh", mesh), ("texture", texture)]:
        compare(actual, report[key], key)
    with np.load(directory / "point-measurements.npz", allow_pickle=False) as retained:
        assert set(retained.files) == set(arrays)
        for name, actual in arrays.items():
            np.testing.assert_allclose(actual, retained[name], rtol=1e-10, atol=1e-10)
    assert all(dense["relativeSupportChecks"].values()) == report["relativeSupportChecksPass"]
    print(json.dumps({"verifiedFiles": len(manifest["files"]), "boundDependencies": len(manifest["dependencies"]),
        "densePoints": len(points), "supportObservations": dense["supportObservations"],
        "meshTriangles": mesh["triangles"], "recomputed": True, "routeQualified": False}))


def retain(source):
    assert source.is_relative_to(WORKSPACE) and not EVIDENCE.exists()
    report = json.loads((source / "report.json").read_text())
    execution = json.loads((source / "execution.json").read_text())
    assert report["completed"]
    arguments = execution["arguments"]
    EVIDENCE.mkdir(parents=True)

    def copy(path, name, compressed=False):
        destination = EVIDENCE / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        data = path.read_bytes()
        destination.write_bytes(gzip.compress(data, mtime=0) if compressed else data)

    for name in ["report.json", "point-measurements.npz", "execution.json"]:
        copy(source / name, name)
    copy(source / "executed-analyze.py", "producers/executed-analyze.py")
    for name in ["retain.py", "requirements.txt"]:
        copy(Path(__file__).parent / name, "producers/" + name)
    for key, name, compressed in [("prepared", "prepared.json", False), ("reader", "read_write_model.py", False),
        ("dense", "dense.ply.gz", True), ("mesh", "mesh.ply.gz", True),
        ("native_intrinsics", "native-intrinsics.json", False), ("texture", "texture.jpg", False)]:
        path = Path(arguments[key]).resolve()
        record = next(row for row in report["inputs"] if row["path"] == str(path))
        assert digest(path.read_bytes()) == record["sha256"] and path.stat().st_size == record["bytes"]
        copy(path, "inputs/" + name, compressed)
    for path in Path(arguments["roundtrip"]).iterdir():
        if path.is_file():
            record = next(row for row in report["inputs"] if row["path"] == str(path.resolve()))
            assert digest(path.read_bytes()) == record["sha256"]
            copy(path, "inputs/roundtrip/" + path.name)
    dependencies = []
    paths = [analyze.ORIGINAL / "result.json", *sorted((analyze.ORIGINAL / "masks").glob("*.png")),
        *sorted((analyze.ORIGINAL / "sparse/0").glob("*.bin"))]
    for path in paths:
        dependencies.append({"path": str(path.relative_to(ROOT)), "sha256": digest(path.read_bytes()), "bytes": path.stat().st_size})
    timestamp = datetime.now(timezone.utc).isoformat()
    files = []
    for path in sorted(EVIDENCE.rglob("*")):
        if path.is_file():
            data = path.read_bytes()
            row = {"path": str(path.relative_to(EVIDENCE)), "bytes": len(data), "sha256": digest(data),
                "source": "Actual OpenMVS run-02 outputs, independent numeric audit and pinned COLMAP source reader",
                "date": timestamp, "rights": "Source-derived geometry and imagery CC BY-SA 4.0, Irvin Chen / Panoramax Taiwan; upstream reader retains BSD notice; project producer under repository licensing",
                "location": "Shijō–Karasuma crossing; four original positions west of the approved route start",
                "method": "Unchanged retained measurement bytes, exact gzip source geometry, mature-library independent numerical recomputation",
                "limitations": "Relative source-derived diagnostic; physical scale, continuous floor, full-route quality and human acceptance remain open."}
            if path.suffix == ".gz":
                decoded = gzip.decompress(data)
                row.update({"decodedBytes": len(decoded), "decodedSha256": digest(decoded)})
            files.append(row)
    (EVIDENCE / "manifest.json").write_text(json.dumps({"schemaVersion": 1, "date": timestamp,
        "files": files, "dependencies": dependencies, "routeQualified": False,
        "numericComparison": "Counts and decisions exact; numerical measurements rtol1e-10, atol1e-10."}, indent=2) + "\n")
    verify(EVIDENCE)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--retain", type=Path)
    modes.add_argument("--verify", type=Path)
    arguments = parser.parse_args()
    if arguments.retain:
        retain(arguments.retain.resolve())
    else:
        verify(arguments.verify.resolve())
