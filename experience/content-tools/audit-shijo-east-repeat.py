import argparse
import hashlib
import json
from pathlib import Path


FILES = ["geography.json", "scene.json", "source-ledger.json", "source-review.json",
         "sources/route-osm.json", "sources/scene-osm.json", "sources/kyoto-lod1.geojson"]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--canonical", type=Path, required=True)
    parser.add_argument("--repeat", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.canonical.resolve() == args.repeat.resolve():
        raise ValueError("Independent generation directories are required")
    results = []
    for filename in FILES:
        original, repeated = args.canonical / filename, args.repeat / filename
        results.append({"file": filename, "canonicalSha256": digest(original), "repeatSha256": digest(repeated),
                        "bytes": original.stat().st_size, "identical": original.read_bytes() == repeated.read_bytes()})
    ledger = json.loads((args.canonical / "source-ledger.json").read_text())
    bindings = [{"file": item["file"], "boundSha256": item["sha256"],
                 "matches": digest(args.canonical / item["file"]) == item["sha256"]}
                for item in ledger["retainedFiles"]]
    report = {"schemaVersion": 1, "scope": "Actual captured-source regeneration and retained source hash bindings",
              "canonicalDirectory": str(args.canonical), "repeatDirectory": str(args.repeat),
              "files": results, "sourceBindings": bindings,
              "passed": all(item["identical"] for item in results) and all(item["matches"] for item in bindings)}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    if not report["passed"]:
        raise ValueError("Actual source regeneration or retained hash binding failed")
    print(json.dumps({"passed": True, "identicalFiles": len(results), "sourceBindings": len(bindings), "report": str(args.output)}))


if __name__ == "__main__":
    main()
