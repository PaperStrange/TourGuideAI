import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil


def record(path, source, date, method, limitations):
    data = path.read_bytes()
    return {"path": path.name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
            "source": source, "date": date, "rights": "Kyoto City / MLIT Project PLATEAU · CC BY 4.0; derived road audit attributed to TourGuideAI",
            "location": "Kyoto Shijo East 1,353.444m route and adjacent Shimogyo/Higashiyama wards",
            "method": method, "limitations": limitations}


def main(downloads, runs, output):
    receipts = json.loads((downloads / "download-receipts.json").read_text())
    records = []
    for name in ["26106-bldg-lod3-tileset.json", "26105-bldg-lod3-tileset.json", "route-citygml-inventory.json"]:
        source = next(item for item in receipts["records"] if item["path"] == name)
        shutil.copyfile(downloads / name, output / name)
        copied = record(output / name, source["source"], source["date"], source["method"], source["limitations"])
        if copied["sha256"] != source["sha256"] or copied["bytes"] != source["bytes"]:
            raise ValueError(f"Copied source identity differs: {name}")
        records.append(copied)
    shutil.copyfile(downloads / "download-receipts.json", output / "download-receipts.json")
    now = datetime.now(timezone.utc).isoformat()
    records.append(record(output / "download-receipts.json", "Original HTTPS receipts for two ward indexes, CityGML inventory, code lists and two road files",
                          now, "Preserved original acquisition receipt JSON", "Raw road GML and full code-list ZIP remain in ignored downloads; reacquisition must match retained hashes."))
    for name in ["road-ground-audit.json", "near-route-roads.geojson", "road-coverage-board.svg"]:
        shutil.copyfile(runs / name, output / name)
        records.append(record(output / name, "Original road CityGML, source function dictionaries, ward tileset indexes and retained route; identities in road-ground-audit.json and download-receipts.json",
                              now, "GDAL 3.10.3 GML parser, explicit CRS/axis handling and horizontal geometry operations; rendered data board",
                              "Planar footprint and candidate geometry observations only; all route ground elevation, current access, pedestrian collision and appearance acceptance remain unverified."))
    manifest = {"schemaVersion": 1, "files": records,
                "processing": [{"path": name, "sha256": hashlib.sha256((output / name).read_bytes()).hexdigest()}
                               for name in ["acquire.py", "qualify.py", "retain.py"]],
                "limitations": "No vertical datum conversion, field measurement, pedestrian collision acceptance, appearance acceptance or runtime release."}
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"files": len(records), "bytes": sum(item["bytes"] for item in records)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--downloads", type=Path, required=True)
    parser.add_argument("--runs", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    main(args.downloads, args.runs, args.output)
