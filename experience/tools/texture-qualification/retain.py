import argparse
import gzip
import hashlib
import json
from pathlib import Path
import shutil


def identity(path, name):
    data = path.read_bytes()
    return {"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def retain(root, run):
    destination = root / "experience/evidence/realism-01/qualification/texture"
    destination.mkdir(parents=True, exist_ok=True)
    report = json.loads((run / "texture-density.json").read_text())
    limitations = " ".join(report["limitations"])
    records = []
    for name in ["texture-density.json", "triangle-measurements.json.gz", "texture-density-board.png"]:
        target = destination / name
        shutil.copyfile(run / name, target)
        if target.read_bytes() != (run / name).read_bytes():
            raise ValueError(f"Retained bytes differ: {name}")
        record = {**identity(target, name), "source": "Kyoto City / MLIT Project PLATEAU; original B3DM identities and UVs bound in texture-density.json",
            "date": report["date"], "rights": "CC BY 4.0; derived measurements and chart attributed to TourGuideAI",
            "location": "Kyoto Shijo East, approved 1,353.444 m / 54-edge / six-sight route",
            "method": "Original Draco UV-pixel/physical-surface Jacobian and singular values; unchanged completed-run data and Matplotlib chart",
            "limitations": limitations}
        if name.endswith(".gz"):
            decoded = gzip.decompress(target.read_bytes())
            record.update(decodedBytes=len(decoded), decodedSha256=hashlib.sha256(decoded).hexdigest())
        records.append(record)
    producers = []
    for name in ["measure.py", "plot.py", "retain.py", "verify.py", "requirements.txt"]:
        path = root / "experience/tools/texture-qualification" / name
        producers.append(identity(path, str(path.relative_to(root))))
    manifest = {"schemaVersion": 1, "date": report["date"], "files": records, "producers": producers,
                "libraries": report["libraries"], "limitations": limitations}
    (destination / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"retainedFiles": len(records), "producers": len(producers)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--run", type=Path, required=True)
    args = parser.parse_args()
    retain(args.root.resolve(), args.run.resolve())
