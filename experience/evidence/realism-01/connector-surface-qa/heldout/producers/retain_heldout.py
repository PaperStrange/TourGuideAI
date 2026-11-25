import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys

from heldout import ROOT, WORKSPACE, digest, identity, verify_identity


EVIDENCE = ROOT / "experience/evidence/realism-01/connector-surface-qa/heldout"
EVALUATION = ROOT / "experience/evidence/realism-01/connector-surface-evaluation"


def compare(actual, expected):
    if isinstance(expected, dict):
        assert set(actual) == set(expected)
        for key in expected:
            compare(actual[key], expected[key])
    elif isinstance(expected, list):
        assert len(actual) == len(expected)
        for first, second in zip(actual, expected, strict=True):
            compare(first, second)
    elif isinstance(expected, float):
        assert math.isclose(actual, expected, rel_tol=1e-10, abs_tol=1e-10)
    else:
        assert actual == expected


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")


def verify(directory):
    manifest = json.loads((directory / "manifest.json").read_text())
    for record in manifest["files"]:
        path = (directory / record["path"]).resolve()
        assert path.is_relative_to(directory)
        verify_identity(record, path)
        assert all(record.get(key) for key in ["source", "date", "rights", "location", "method", "limitations"])
    for record in manifest["dependencies"]:
        path = (ROOT / record["path"]).resolve()
        assert path.is_relative_to(ROOT / "experience")
        verify_identity(record, path)
    report = json.loads((directory / "report.json").read_text())
    producer = Path(__file__).with_name("heldout.py")
    assert digest(producer) == digest(directory / "producers/executed-heldout.py") == report["producer"]["sha256"]
    output = WORKSPACE / ("heldout-verification-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f"))
    output.mkdir(parents=True)
    for name in ["native", "4096"]:
        arguments = [sys.executable, str(producer), "--evidence", str(EVALUATION), "--output", str(output / name)]
        if name == "4096":
            arguments.extend(["--render-evidence", str(EVALUATION / "variant-4096")])
        with (output / (name + ".txt")).open("w") as stream:
            subprocess.run(arguments, check=True, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT)
        actual = json.loads((output / name / "result.json").read_text())
        assert actual["completed"] and actual["frozenInputsUnchanged"] and actual["retainedEvidenceOnly"]
        assert not actual["poseEstimationRerun"] and not actual["frozenDatabaseOpened"]
        for key in ["bindings", "poses", "omittedChecks"]:
            compare(actual[key], report["shared"][key])
        for key in ["views", "totals"]:
            compare(actual[key], report["renders"][name][key])
    print(json.dumps({"verifiedFiles": len(manifest["files"]), "boundDependencies": len(manifest["dependencies"]),
        "renderVariants": 2, "renderedViews": 48, "sharedAssociations": report["shared"]["bindings"]["verifiedAssociations"],
        "recomputed": True, "output": str(output)}))


def retain():
    assert not EVIDENCE.exists()
    EVIDENCE.mkdir(parents=True)
    portable = {name: json.loads((WORKSPACE / folder / "result.json").read_text()) for name, folder in [
        ("native", "heldout-portable-native-01"), ("4096", "heldout-portable-4096-01")]}
    for report in portable.values():
        assert report["completed"] and report["retainedEvidenceOnly"] and report["frozenInputsUnchanged"]
    for key in ["bindings", "poses", "omittedChecks"]:
        compare(portable["native"][key], portable["4096"][key])
    assert portable["native"]["producer"] == portable["4096"]["producer"]
    copied_sources = {}

    def copy(source, name):
        destination = EVIDENCE / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        copied_sources[name] = str(source.relative_to(ROOT))

    for name, folder in [("native", "heldout-01"), ("4096", "heldout-4096-01")]:
        raw = WORKSPACE / folder
        history = json.loads((raw / "result.json").read_text())
        assert history["completed"] and history["frozenInputsUnchanged"]
        assert digest(raw / "executed-heldout.py") == history["producer"]["sha256"]
        for key in ["poses", "views", "totals"]:
            compare(history[key], portable[name][key])
        for key, value in history["bindings"].items():
            compare(value, portable[name]["bindings"][key])
        for filename in ["result.json", "executed-heldout.py"]:
            copy(raw / filename, "historical/" + name + "/" + filename)
    copy(WORKSPACE / "heldout-portable-native-01/executed-heldout.py", "producers/executed-heldout.py")
    copy(Path(__file__), "producers/retain_heldout.py")
    copy(Path(__file__).with_name("requirements.txt"), "producers/requirements.txt")
    shared = {key: portable["native"][key] for key in ["bindings", "poses", "omittedChecks"]}
    report = {"schemaVersion": 1, "completed": True, "date": datetime.now(timezone.utc).isoformat(),
        "producer": portable["native"]["producer"], "shared": shared,
        "renders": {name: {key: value[key] for key in ["views", "totals", "localization", "render"]} for name, value in portable.items()},
        "poseEstimationRerun": False, "frozenDatabaseOpened": False, "retainedEvidenceOnly": True,
        "limitations": portable["native"]["limitations"], "routeQualified": False, "appearanceQualified": False}
    write_json(EVIDENCE / "report.json", report)
    dependencies = {}
    for result in portable.values():
        for record in result["frozenInputs"]:
            path = Path(record["path"])
            assert path.is_relative_to(ROOT / "experience")
            verify_identity(record)
            dependencies[str(path.relative_to(ROOT))] = {**record, "path": str(path.relative_to(ROOT))}
    producer = Path(__file__).with_name("heldout.py")
    dependencies[str(producer.relative_to(ROOT))] = {**identity(producer), "path": str(producer.relative_to(ROOT))}
    timestamp = datetime.now(timezone.utc).isoformat()
    records = []
    for path in sorted(EVIDENCE.rglob("*")):
        if path.is_file():
            name = str(path.relative_to(EVIDENCE))
            records.append({**identity(path), "path": name, "source": copied_sources.get(name, "Independently recomputed native and 4096 atlas retained measurements"),
                "date": timestamp, "rights": "Source-derived measurements CC BY-SA 4.0, Irvin Chen / Panoramax Taiwan; project producers retain repository licensing",
                "location": "Shijō–Karasuma held-out ranks 67/72, west of approved route start",
                "method": "Native-track binding, exact retained keypoints, saved verified match tuples, fixed-pose classification and saved-pixel photometry",
                "limitations": "Portable checks omit absent descriptor/database rows; historical copied-database audit retained. Same-sequence model-relative diagnostics only."})
    write_json(EVIDENCE / "manifest.json", {"schemaVersion": 1, "files": records,
        "dependencies": list(dependencies.values()), "routeQualified": False,
        "numericComparison": "Counts and decisions exact; numerical values rtol 1e-10, atol 1e-10."})
    verify(EVIDENCE)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--retain", action="store_true")
    modes.add_argument("--verify", type=Path)
    arguments = parser.parse_args()
    retain() if arguments.retain else verify(arguments.verify.resolve())
