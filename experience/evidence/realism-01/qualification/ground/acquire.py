import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import requests


SOURCES = {
    "route-citygml-inventory.json": "https://api.plateauview.mlit.go.jp/datacatalog/citygml/r:135.7590,35.0031,135.7725,35.0057?types=bldg,tran,frn,dem",
    "26106-bldg-lod3-tileset.json": "https://assets.cms.plateau.reearth.io/assets/d3/4c620c-1c8b-44fa-9168-b50ed86f27f1/26100_kyoto-shi_city_2025_citygml_1_op_bldg_3dtiles_26106_shimogyo-ku_lod3/tileset.json",
    "26105-bldg-lod3-tileset.json": "https://assets.cms.plateau.reearth.io/assets/dd/3e0851-94fb-4fed-8e44-289d0e3fb41f/26100_kyoto-shi_city_2025_citygml_1_op_bldg_3dtiles_26105_higashiyama-ku_lod3/tileset.json",
    "kyoto-codelists.zip": "https://assets.cms.plateau.reearth.io/assets/bb/15fa90-93c2-42be-848b-85d694d6efdb/26100_kyoto-shi_city_2025_citygml_1_op_codelists.zip",
}


def acquire(output):
    output.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers["User-Agent"] = "TourGuideAI-source-qualification/1.0"
    records = []
    for name, url in SOURCES.items():
        response = session.get(url, timeout=60)
        response.raise_for_status()
        if name.endswith(".json"):
            response.json()
        payload = response.content
        if len(payload) > 4_000_000:
            raise ValueError(f"Unexpected index size: {name}")
        (output / name).write_bytes(payload)
        records.append({"path": name, "source": url, "date": datetime.now(timezone.utc).isoformat(),
                        "status": response.status_code, "bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest(),
                        "rights": "Kyoto City / MLIT Project PLATEAU, CC BY 4.0; retained dataset metadata applies",
                        "location": "Kyoto Shijo East route and adjacent wards",
                        "method": "Original HTTPS JSON response; inherited proxy/CA and TLS verification retained",
                        "limitations": "Catalogue/index bounds identify acquisition candidates; no geometry or appearance acceptance."})
    inventory = json.loads((output / "route-citygml-inventory.json").read_text())
    cities = [city for city in inventory["cities"] if city["cityCode"] == "26100" and city["year"] == 2025]
    if len(cities) != 1:
        raise ValueError("Expected one Kyoto 2025 source inventory")
    for item in cities[0]["files"]["tran"]:
        name = item["url"].rsplit("/", 1)[-1]
        response = session.get(item["url"], timeout=60)
        response.raise_for_status()
        payload = response.content
        if len(payload) != item["fileSize"]:
            raise ValueError(f"Road source size differs from catalogue: {name}")
        (output / name).write_bytes(payload)
        records.append({"path": name, "source": item["url"], "date": datetime.now(timezone.utc).isoformat(),
                        "status": response.status_code, "bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest(),
                        "rights": "Kyoto City / MLIT Project PLATEAU, CC BY 4.0; retained dataset metadata applies",
                        "location": f"Kyoto source mesh {item['code']}",
                        "method": "Original HTTPS CityGML response; inherited proxy/CA and TLS verification retained",
                        "limitations": "Whole mesh source; exact route coverage and vertical registration require geometric inspection."})
    (output / "download-receipts.json").write_text(json.dumps({"schemaVersion": 1, "records": records}, indent=2) + "\n")
    print(json.dumps({"downloaded": len(records), "bytes": sum(record["bytes"] for record in records)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    acquire(parser.parse_args().output)
