import argparse
import hashlib
import json
from pathlib import Path
import shutil


def identity(path, label):
    data = path.read_bytes()
    return {"path": label, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def retain(root, research, run):
    target = root / "experience/evidence/realism-01/qualification/free-sources"
    target.mkdir(parents=True, exist_ok=True)
    inputs = [
        (research / "research-receipts.json", "research-receipts.json"),
        (research / "lookup/originals/download-receipts.json", "photo-receipts.json"),
        (research / "lookup/originals/exif-camera-fields.json", "camera-metadata.json"),
        (run / "reference-board.png", "reference-board.png"),
        (run / "source-roles.json", "source-roles.json"),
        (research / "lookup/originals-overlap/download-receipts.json", "overlap-photo-receipts.json"),
        (research / "lookup/originals-overlap/registry-comparison.json", "registry-comparison.json"),
        (run / "query-coverage.json", "query-coverage.json"),
        (research / "lookup/business-identity.json", "business-identity.json"),
        (research / "karta-preview-receipts.json", "karta-preview-receipts.json"),
        (research / "karta-visual-review.json", "karta-visual-review.json"),
        (research / "karta-preview-2634400926.jpg", "karta-preview-2634400926.jpg"),
        (research / "karta-preview-2634394311.jpg", "karta-preview-2634394311.jpg"),
    ]
    manifest = {"schemaVersion": 1, "date": "2026-11-06", "files": [], "producers": [],
        "sourceRole": "Shijo images: inspection only, capture family overlaps reserved Mitsui reference. Momiji: nearby material reference with exact route frontage unverified. KartaView: off-route thumbnail inspection only. No new blind holdout.",
        "limitations": "No exact photo-to-GML registration, metric mesh, calibrated pose, detailed floor or complete route/day-night acceptance"}
    for path, name in inputs:
        destination = target / name
        shutil.copyfile(path, destination)
        if path.read_bytes() != destination.read_bytes():
            raise ValueError("Retained reference evidence differs")
        karta = name.startswith("karta-")
        manifest["files"].append({**identity(destination, name),
            "source": "KartaView public API and published thumbnails; exact source URLs in karta-preview-receipts.json" if karta else "HAGAT hOMSZE / Wikimedia Commons original photos; Kyoto City / MLIT PLATEAU metadata; independent business listings; source URLs and byte identities in research-receipts.json",
            "date": "2026-11-06", "rights": "© Grab and KartaView Contributors, CC BY-SA 4.0; thumbnails unchanged. Observation text: TourGuideAI." if karta else "Commons photographs: CC0 1.0. Derived chart and observations: TourGuideAI. Official/vendor metadata: attributed factual findings; raw archives/pages remain ignored.",
            "location": "Approved Kyoto Shijo East route; distinct supplementary collection extents recorded separately",
            "method": "Unchanged published thumbnail and its source receipt; bounded visual inspection" if karta else "Acquired-photo receipts and EXIF; bounded official-source metadata; full-frame photographic reference chart; exact source polyline and business-pin measurements",
            "limitations": manifest["limitations"]})
    for name in ["board.py", "retain.py", "verify.py", "source_roles.py", "query_coverage.py", "research.py", "business_identity.py", "requirements.txt"]:
        path = root / "experience/tools/free-source-qualification" / name
        manifest["producers"].append(identity(path, str(path.relative_to(root))))
    (target / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"retainedFiles": len(manifest["files"]), "producers": len(manifest["producers"])}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--research", type=Path, required=True)
    parser.add_argument("--run", type=Path, required=True)
    args = parser.parse_args()
    retain(args.root.resolve(), args.research.resolve(), args.run.resolve())
