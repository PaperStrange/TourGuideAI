import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import json
from pathlib import Path


def verify(root, output):
    evidence = root / "experience/evidence/realism-01/qualification"
    artifacts = root / "artifacts/realism-01"
    records = []

    def compare(original, reproduced, decoded=False):
        data = gzip.decompress(original.read_bytes()) if decoded else original.read_bytes()
        actual = reproduced.read_bytes()
        if data != actual:
            raise ValueError(f"Reproduction differs: {original} / {reproduced}")
        records.append({"original": str(original.relative_to(root)), "reproduced": str(reproduced.relative_to(root)),
                        "decodedOriginal": decoded, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})

    run = artifacts / "runs/route-qualification-reproduction"
    for name in ["geometry-audit.json", "content-selection.json", "review-manifest.json"]:
        compare(evidence / "geometry" / name, run / name)
    compare(evidence / "geometry/objects.geojson.gz", run / "objects.geojson", decoded=True)
    compare(artifacts / "runs/route-qualification/road-triangles.json", run / "road-triangles.json")
    manifest = json.loads((evidence / "geometry/review-manifest.json").read_text())
    for model in manifest["models"]:
        original = artifacts / "runs/route-qualification" / model["file"]
        if hashlib.sha256(original.read_bytes()).hexdigest() != model["sha256"]:
            raise ValueError(f"Original GLB identity differs: {model['id']}")
        compare(original, run / model["file"])
    for name in ["road-ground-audit.json", "near-route-roads.geojson", "road-coverage-board.svg"]:
        compare(evidence / "ground" / name, artifacts / "runs/ground-qualification-review" / name)
    for name in ["landmark-correspondence.json", "landmark-correspondence.md"]:
        compare(evidence / "landmarks" / name, artifacts / "runs/landmark-qualification-reproduction" / name)
    receipts = json.loads((evidence / "geometry/download-receipts.json").read_text())
    for record in receipts["records"]:
        data = (artifacts / "downloads/route-qualification" / record["file"]).read_bytes()
        if len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"]:
            raise ValueError(f"Original B3DM receipt differs: {record['id']}")
    result = {"date": datetime.now(timezone.utc).isoformat(), "status": "passed", "sourceReceiptChecks": len(receipts["records"]),
              "identicalOutputs": len(records), "records": records,
              "limitations": "Reproducibility from identical acquired inputs; no appearance, physical-device, collision or participant acceptance."}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({key: result[key] for key in ["status", "sourceReceiptChecks", "identicalOutputs"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    verify(args.root.resolve(), args.output.resolve())
