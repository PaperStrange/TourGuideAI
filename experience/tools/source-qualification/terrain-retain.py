import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import json
from pathlib import Path
import shutil


def identity(path, base):
    data = path.read_bytes()
    return {"path": str(path.relative_to(base)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def retain(root, source_run, profile_run):
    destination = root / "experience/evidence/realism-01/qualification/terrain"
    destination.mkdir(parents=True, exist_ok=True)
    records = []
    report = json.loads((source_run / "terrain-extraction.json").read_text())
    common = {"source": report["receipt"]["source"], "date": report["date"],
        "rights": "Kyoto City / MLIT Project PLATEAU, CC BY 4.0; derived source analysis attributed to TourGuideAI",
        "location": "Kyoto Shijo East, 54-edge / six-sight route and 25 m corridor",
        "method": "Original completed terrain-source experiment output retained unchanged",
        "limitations": "Source terrain qualification only; pedestrian floors, bridge deck, public access, final datum choice and runtime acceptance remain unverified"}
    for name in ["terrain-extraction.json", "terrain-triangles.geojson"]:
        path = source_run / name
        if name.endswith(".geojson"):
            data = path.read_bytes()
            target = destination / (name + ".gz")
            target.write_bytes(gzip.compress(data, mtime=0))
            records.append({**common, **identity(target, destination), "decodedBytes": len(data),
                            "decodedSha256": hashlib.sha256(data).hexdigest(), "method": "Complete original triangle GeoJSON, lossless gzip mtime=0"})
        else:
            shutil.copyfile(path, destination / name)
            records.append({**common, **identity(destination / name, destination)})
    if profile_run:
        for name in ["terrain-profile.json", "terrain-profile.svg"]:
            shutil.copyfile(profile_run / name, destination / name)
            records.append({**common, **identity(destination / name, destination),
                            "method": "Actual 1 m source-terrain interpolation and Matplotlib profile; unchanged generated output"})
    tools = root / "experience/tools/source-qualification"
    manifest = {"schemaVersion": 1, "date": datetime.now(timezone.utc).isoformat(), "files": records,
        "producers": [identity(tools / name, root) for name in
                      ["terrain-source.py", "terrain-profile.py", "terrain-retain.py", "terrain-source-requirements.txt", "terrain-profile-requirements.txt"]],
        "limitations": common["limitations"]}
    (destination / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"files": len(records), "bytes": sum(record["bytes"] for record in records)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--source-run", type=Path, required=True)
    parser.add_argument("--profile-run", type=Path)
    args = parser.parse_args()
    retain(args.root.resolve(), args.source_run.resolve(), args.profile_run.resolve() if args.profile_run else None)
