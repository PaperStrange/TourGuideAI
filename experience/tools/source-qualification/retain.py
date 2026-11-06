import argparse
import gzip
import hashlib
from importlib.metadata import version
import json
from pathlib import Path
import shutil


def identity(path, base):
    data = path.read_bytes()
    return {"path": str(path.relative_to(base)), "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest()}


def retain(root, kind, source, date):
    destination = root / "experience/evidence/realism-01/qualification" / kind
    destination.mkdir(parents=True, exist_ok=True)
    tools = root / "experience/tools/source-qualification"
    producers = [tools / "retain.py"]
    records = []
    common = {"source": "Kyoto City / MLIT Project PLATEAU; original identities in the retained source receipts",
              "date": date, "rights": "CC BY 4.0; derived diagnostic attributed to TourGuideAI",
              "location": "Kyoto Shijo East, approved 1,353.444 m / 54-edge / six-sight route",
              "method": "Unchanged completed-run evidence copied with SHA-256 verification",
              "limitations": "Source qualification only; current appearance, pedestrian ground, night lighting and production acceptance remain unverified."}

    def copy(path, provenance=None, compress=False):
        data = path.read_bytes()
        target = destination / (path.name + ".gz" if compress else path.name)
        if compress:
            target.write_bytes(gzip.compress(data, mtime=0))
        else:
            shutil.copyfile(path, target)
            if target.read_bytes() != data:
                raise ValueError(f"Copy differs: {path}")
        record = {**common, **(provenance or {}), **identity(target, destination)}
        if compress:
            record.update(decodedBytes=len(data), decodedSha256=hashlib.sha256(data).hexdigest(),
                          method="Lossless gzip, mtime=0; complete original decoded bytes retained")
        records.append(record)

    if kind == "geometry":
        downloads = root / "artifacts/realism-01/downloads/route-qualification"
        for name in ["inventory.json", "download-receipts.json"]:
            copy(downloads / name)
        for name in ["geometry-audit.json", "content-selection.json", "review-manifest.json"]:
            copy(source / name)
        copy(source / "objects.geojson", compress=True)
        producers += [tools / "geometry.py", tools / "requirements.txt"]
    elif kind == "views":
        report = json.loads((source / "result.json").read_text())
        if not report["completed"] or len(report["captures"]) != 18:
            raise ValueError("Retain a completed six-sight source review, including its failing checks")
        manifest = destination.parent / "geometry/review-manifest.json"
        if identity(manifest, root)["sha256"] != report["inputManifest"]["sha256"]:
            raise ValueError("Retained source manifest differs from the captured manifest")
        for capture in report["captures"]:
            path = source / capture["path"]
            actual = identity(path, source)
            if any(actual[key] != capture[key] for key in ["path", "bytes", "sha256"]):
                raise ValueError(f"Capture identity differs: {path}")
            copy(path, {key: capture[key] for key in common})
        copy(source / "result.json", {"method": "Complete original browser report, including every failing check and submitted camera observation"})
        copy(source / "board.md", {"method": "Original capture index; all 18 images and failure report retained"})
        for producer in report["toolSources"]:
            path = root / producer["path"]
            if identity(path, root) != producer:
                raise ValueError(f"Capture producer changed: {path}")
            producers.append(path)
    elif kind == "landmarks":
        for name in ["landmark-correspondence.json", "landmark-correspondence.md"]:
            copy(source / name)
        producers += [tools / "match-landmarks.py", root / "experience/sprints/realism-01/experiments/landmark-targets.json"]
    elif kind == "dem":
        audit = json.loads((source / "dem-envelope-audit.json").read_text())
        copy(source / "dem-envelope-audit.json", {"method": "Original bounded DEM envelope inspection report",
             "limitations": "Envelope metadata only; full terrain was not acquired or evaluated."})
        for record in audit["records"]:
            path = source / record["path"]
            actual = identity(path, source)
            if any(actual[key] != record[key] for key in ["path", "bytes", "sha256"]):
                raise ValueError(f"DEM prefix changed: {path}")
            copy(path, {key: record[key] for key in common})
        producers += [destination.parent / "ground/inspect_dem.py"]
    elif kind == "validation":
        copy(source / "reproduction.json", {"source": "Actual repeated source extraction, ground audit and semantic matching on retained originals",
             "method": "Byte equality for 83 generated outputs and SHA-256/size checks for 73 original B3DM files"})
        producers += [tools / "verify-reproduction.py"]
    manifest = {"schemaVersion": 1, "date": date, "files": records,
                "producers": [identity(path, root) for path in producers],
                "limitations": common["limitations"]}
    if kind in ["geometry", "landmarks"]:
        manifest["libraries"] = {name: version(name) for name in
                                 ["py3dtiles", "pygltflib", "DracoPy", "numpy", "pyproj", "shapely", "Pillow"]}
    (destination / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"kind": kind, "files": len(records), "bytes": sum(record["bytes"] for record in records)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--kind", choices=["geometry", "views", "landmarks", "dem", "validation"], required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--date", required=True)
    args = parser.parse_args()
    retain(args.root.resolve(), args.kind, args.source.resolve(), args.date)
