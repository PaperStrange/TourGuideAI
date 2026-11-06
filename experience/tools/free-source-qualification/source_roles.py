import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit


def key(url):
    return unquote(urlsplit(url).path.rsplit("/", 1)[-1]).removeprefix("File:").replace("_", " ").casefold()


def inspect(root, research, output):
    paths = ["experience/evidence/realism-01/qualification/references/sources.json",
        "experience/evidence/realism-01/qualification/references/downloads.json",
        "experience/public/content-evidence/facade-references.json",
        "experience/public/assets/neighborhoods/shijo-east/references.json"]
    documents = [json.loads((root / path).read_text()) for path in paths]
    reserved_keys = {key(item[field]) for item in documents[0]["images"] for field in ["sourceUrl", "imageUrl"]}
    reserved_hashes = {item["sha256"] for item in documents[1]}
    authoring_keys = {key(item[field]) for document in documents[2:] for item in document["references"] for field in ["sourceUrl", "imageUrl", "url"] if field in item}
    authoring_hashes = {item[field] for document in documents[2:] for item in document["references"] for field in ["imageSha256", "sha256"] if field in item}
    receipts = [research / "lookup/originals/download-receipts.json"]
    extra = research / "lookup/originals-overlap/download-receipts.json"
    if extra.exists():
        receipts.append(extra)
    rows = []
    for path in receipts:
        for item in json.loads(path.read_text())["records"]:
            source_key = key(item["source"])
            same_family = "shijo dori walk evening 1835pm june 2026 n13p" in source_key
            takase_family = "morning walk 1013am" in source_key and "june 2026 n13p" in source_key
            rows.append({"file": item["file"], "source": item["source"], "sha256": item["sha256"],
                "exactReservedSourceMatch": source_key in reserved_keys,
                "exactReservedByteMatch": item["sha256"] in reserved_hashes,
                "exactExistingAuthoringSourceMatch": source_key in authoring_keys,
                "exactExistingAuthoringByteMatch": item["sha256"] in authoring_hashes,
                "sameCaptureFamilyAsReservedMitsui": same_family,
                "sameCaptureFamilyAsExistingTakaseAuthoring": takase_family,
                "captureFamilyEvidence": "Same photographer HAGAT hOMSZE, June21 Shijo evening series as reserved frame28" if same_family else "June24 Takase series also contains existing authoring frame220; no shared reserved source identified",
                "use": "inspection-only; authoring admission requires explicit evaluation redesign" if same_family else "potential-art-reference; source-building registration unqualified",
                "independentHoldout": False})
    inputs = []
    for path in [root / name for name in paths] + receipts:
        data = path.read_bytes()
        inputs.append({"path": str(path.relative_to(root)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
    result = {"date": "2026-11-06", "inputs": inputs, "records": rows,
        "method": "Canonical decoded source-filename and exact-byte checks against the reserved and two existing authoring registries; explicit same-capture-family review",
        "limitations": "Distinct filenames/hashes do not establish independence. Reserved frame28 remains untouched and excluded from authoring; its related new captures remain inspection-only."}
    output.mkdir(parents=True, exist_ok=True)
    (output / "source-roles.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"photos": len(rows), "exactReservedMatches": sum(item["exactReservedSourceMatch"] or item["exactReservedByteMatch"] for item in rows),
        "relatedReservedCaptureFamily": sum(item["sameCaptureFamilyAsReservedMitsui"] for item in rows)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--research", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    inspect(args.root.resolve(), args.research.resolve(), args.output.resolve())
