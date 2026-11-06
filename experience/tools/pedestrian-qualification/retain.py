import argparse
import gzip
import hashlib
import json
from pathlib import Path
import shutil


def identity(path, base):
    data = path.read_bytes()
    return {"path": str(path.relative_to(base)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def retain(root, run):
    target = root / "experience/evidence/realism-01/qualification/pedestrian"
    target.mkdir(parents=True, exist_ok=True)
    report = json.loads((run / "pedestrian-surface-audit.json").read_text())
    common = {"source": "Kyoto City / MLIT Project PLATEAU original road CityGML and 3D Tiles; exact identities in pedestrian-surface-audit.json",
        "date": report["date"], "rights": "CC BY 4.0, Kyoto City / MLIT Project PLATEAU; derived diagnostic attributed to TourGuideAI",
        "location": "Kyoto Shijo East 1,353.444 m / 54-edge / six-sight route",
        "method": "Unchanged output of original detailed surface intersection and source-height correspondence audit",
        "limitations": "Source collection coverage only; no current-access, pedestrian collision, surveyed accuracy or runtime acceptance"}
    records = []
    for name in ["pedestrian-surface-audit.json", "surface-coverage.svg", "detailed-road-triangles.json", "navigation-surface-check.json", "navigation-correction.svg"]:
        source = run / name
        if name == "detailed-road-triangles.json":
            data = source.read_bytes()
            path = target / (name + ".gz")
            path.write_bytes(gzip.compress(data, mtime=0))
            records.append({**common, **identity(path, target), "decodedBytes": len(data), "decodedSha256": hashlib.sha256(data).hexdigest(),
                            "method": "Complete selected original road triangle records, lossless gzip mtime=0"})
        else:
            path = target / name
            shutil.copyfile(source, path)
            records.append({**common, **identity(path, target)})
    research = root / "artifacts/realism-01/pedestrian/research"
    for source_name, retained_name in [("findings.json", "source-access-findings.json"), ("receipts.json", "source-access-receipts.json")]:
        path = target / retained_name
        shutil.copyfile(research / source_name, path)
        records.append({**common, **identity(path, target),
            "source": "Official Kyoto City road-information/site-policy pages and Nishiki Market Union contact, filming, union and site-policy documents; exact URLs in source-access-receipts.json",
            "rights": "Derived factual research notes and source receipts; original pages/documents retain Kyoto City and Nishiki Market Union rights. No reusable geometry or commercial capture permission established.",
            "method": "Full public-page inspection and OOXML text extraction; unchanged factual findings/receipt output retained; original downloaded bodies remain ignored",
            "limitations": "Bounded public-source lookup; absence of acquired qualifying geometry does not prove no survey exists. Capture policy scopes and source rights need explicit confirmation for a commercial survey."})
    tools = root / "experience/tools/pedestrian-qualification"
    manifest = {"schemaVersion": 1, "date": report["date"], "files": records,
                "producers": [identity(tools / name, root) for name in ["audit.py", "navigation_audit.py", "navigation-observations.mjs", "retain.py", "verify.py", "requirements.txt"]]}
    (target / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"files": len(records), "bytes": sum(record["bytes"] for record in records)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--run", type=Path, required=True)
    args = parser.parse_args()
    retain(args.root.resolve(), args.run.resolve())
