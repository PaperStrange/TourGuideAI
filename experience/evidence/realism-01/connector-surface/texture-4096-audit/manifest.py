import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    path = ROOT / "manifest.json"
    if args.write:
        assert not path.exists()
        records = []
        for item in sorted(ROOT.iterdir()):
            if not item.is_file() or item == path:
                continue
            records.append({"path": item.name, "source": "Independent audit of actual OpenMVS texture-4096-01 and run-02 artifacts",
                "date": "2026-11-25", "rights": "Repository-authored analysis and execution evidence; upstream notices retained in sibling mask-audit bundle.",
                "location": "Kyoto connector experiment in native reconstruction coordinates",
                "method": "Mature PLY/OBJ/glTF/image parsers; exact geometric triangle comparison and measured interior pixel residuals.",
                "limitations": "Fitted-source minimum is optimistic and has no occlusion or source-assignment proof; held-out acceptance remains separate.",
                "sha256": hashlib.sha256(item.read_bytes()).hexdigest(), "bytes": item.stat().st_size})
        path.write_text(json.dumps({"schemaVersion": 1, "records": records}, indent=2) + "\n")
    data = json.loads(path.read_text())
    for record in data["records"]:
        item = (ROOT / record["path"]).resolve()
        assert item.is_relative_to(ROOT)
        assert item.stat().st_size == record["bytes"]
        assert hashlib.sha256(item.read_bytes()).hexdigest() == record["sha256"]
    print(json.dumps({"verifiedRecords": len(data["records"])}))


if __name__ == "__main__":
    main()
