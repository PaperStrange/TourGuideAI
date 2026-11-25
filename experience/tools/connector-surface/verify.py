import argparse
import gzip
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence", type=Path, required=True)
    args = parser.parse_args()
    evidence = args.evidence.resolve()
    assert evidence.is_relative_to(ROOT / "experience/evidence/realism-01/connector-surface")
    manifest = json.loads((evidence / "manifest.json").read_text())
    paths = set()
    for record in manifest["records"]:
        path = evidence / record["path"]
        assert path.resolve().is_relative_to(evidence) and record["path"] not in paths
        paths.add(record["path"])
        data = path.read_bytes()
        assert len(data) == record["bytes"] and hashlib.sha256(data).hexdigest() == record["sha256"]
        original = gzip.decompress(data) if record["compression"] == "gzip" else data
        assert len(original) == record["originalBytes"]
        assert hashlib.sha256(original).hexdigest() == record["originalSha256"]
        assert all(record[field] for field in ["source", "date", "rights", "location", "method", "limitations"])
    assert {path.relative_to(evidence).as_posix() for path in evidence.rglob("*") if path.is_file()} == paths | {"manifest.json"}
    print(json.dumps({"verified": True, "evidence": str(evidence), "files": len(paths)}))


if __name__ == "__main__":
    main()
