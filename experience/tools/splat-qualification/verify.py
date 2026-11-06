import argparse
import hashlib
import json
from pathlib import Path


def main(root):
    output = root / "experience/evidence/realism-01/qualification/splat-compatibility"
    manifest = json.loads((output / "manifest.json").read_text())
    for base, records in [(output, manifest["files"]), (root, manifest["producers"])]:
        for record in records:
            data = (base / record["path"]).read_bytes()
            if len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"]:
                raise ValueError(f"Evidence identity differs: {record['path']}")
    report = json.loads((output / "result.json").read_text())
    receipts = json.loads((output / "download-receipts.json").read_text())
    receipt_data = (output / "download-receipts.json").read_bytes()
    if hashlib.sha256(receipt_data).hexdigest() != report["sourceReceipts"]["sha256"]:
        raise ValueError("Source acquisition binding differs")
    sample = next(record for record in receipts["records"] if record["path"] == "shoe.splat")
    tree = json.loads((output / "sample-tree.json").read_text())
    listed = next(record for record in tree if record["path"] == "shoe.splat")
    if listed["lfs"]["oid"] != sample["sha256"] or listed["size"] != sample["bytes"]:
        raise ValueError("Pinned sample metadata differs")
    served = next(record for record in report["servedResources"] if record["requestPath"] == "/shoe.splat")
    if served["sha256"] != sample["sha256"] or served["bytes"] != sample["bytes"]:
        raise ValueError("Browser sample differs from original acquisition")
    for producer in report["toolSources"]:
        if hashlib.sha256((root / producer["path"]).read_bytes()).hexdigest() != producer["sha256"]:
            raise ValueError("Successful capture source changed")
    for capture in report["captures"]:
        if hashlib.sha256((output / capture["path"]).read_bytes()).hexdigest() != capture["sha256"]:
            raise ValueError("Capture image differs")
    if not report["completed"] or len(report["checks"]) != 6 or not all(check["pass"] for check in report["checks"]):
        raise ValueError("Successful diagnostic record is incomplete or failing")
    failed = json.loads((output / "startup-failure.json").read_text())
    if failed["completed"] or failed["captures"]:
        raise ValueError("Launch failure must preserve its unobserved scope")
    if report["before"]["resources"]["completeAccounting"]:
        raise ValueError("Partial resource observations cannot establish complete accounting")
    print(json.dumps({"status": "passed", "fileHashes": len(manifest["files"]), "producerHashes": len(manifest["producers"]),
                      "completedEngineeringChecks": 6, "retainedStartupFailures": 1,
                      "limitations": "Integrity and one non-Kyoto engineering observation only"}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    main(parser.parse_args().root.resolve())
