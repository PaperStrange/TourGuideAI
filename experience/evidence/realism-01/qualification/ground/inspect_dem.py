import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

import requests


GML = "{http://www.opengis.net/gml}"


def route_bounds(geography):
    selected = set(geography["selectedRoute"]["nodeIds"])
    nodes = [node for node in geography["navigation"]["nodes"] if node["id"] in selected]
    return {"west": min(node["longitude"] for node in nodes), "south": min(node["latitude"] for node in nodes),
            "east": max(node["longitude"] for node in nodes), "north": max(node["latitude"] for node in nodes)}


def main(root, output):
    sources = root / "experience/evidence/realism-01/qualification/ground"
    audit = json.loads((sources / "road-ground-audit.json").read_text())
    geography = json.loads((root / audit["route"]["path"]).read_text())
    bounds = route_bounds(geography)
    output.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers["User-Agent"] = "TourGuideAI-ground-qualification/1.0"
    records = []
    for source in audit["demAcquisitionCandidates"]:
        url = source["url"]
        with session.get(url, headers={"Range": "bytes=0-32767"}, stream=True, timeout=60) as response:
            response.raise_for_status()
            payload = response.raw.read(32768, decode_content=True)
            status, content_range = response.status_code, response.headers.get("Content-Range")
            content_encoding = response.headers.get("Content-Encoding")
        parser = ET.XMLPullParser(["end"])
        parser.feed(payload)
        envelopes = [item for _, item in parser.read_events() if item.tag == GML + "Envelope"]
        if len(envelopes) != 1:
            raise ValueError(f"Expected one complete source envelope in bounded prefix: {url}")
        envelope = envelopes[0]
        if envelope.get("srsName") != "http://www.opengis.net/def/crs/EPSG/0/6697" or envelope.get("srsDimension") != "3":
            raise ValueError(f"Unexpected DEM envelope CRS: {url}")
        lower = [float(value) for value in envelope.find(GML + "lowerCorner").text.split()]
        upper = [float(value) for value in envelope.find(GML + "upperCorner").text.split()]
        covers = lower[0] <= bounds["south"] and lower[1] <= bounds["west"] and upper[0] >= bounds["north"] and upper[1] >= bounds["east"]
        path = url.rsplit("/", 1)[-1] + ".prefix"
        (output / path).write_bytes(payload)
        records.append({"path": path, "bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest(),
                        "source": url, "date": datetime.now(timezone.utc).isoformat(),
                        "rights": "Kyoto City / MLIT Project PLATEAU · CC BY 4.0",
                        "location": "Kyoto terrain source mesh 523546",
                        "method": "HTTPS Range request for bytes 0–32767; urllib3 decodes HTTP content encoding; decoded prefix capped at 32768 bytes; ElementTree XMLPullParser reads the completed GML envelope",
                        "limitations": "Partial original response; envelope bounds do not establish triangle coverage, terrain quality or pedestrian-floor height.",
                        "httpStatus": status, "contentRange": content_range, "contentEncoding": content_encoding,
                        "declaredFileBytes": source["fileSize"],
                        "srsName": envelope.get("srsName"), "sourceLowerLatLonHeight": lower,
                        "sourceUpperLatLonHeight": upper, "envelopeContainsEntireRouteBounds": covers})
    candidates = sorted([record for record in records if record["envelopeContainsEntireRouteBounds"]], key=lambda item: item["declaredFileBytes"])
    selected = candidates[0] if candidates else None
    result = {"schemaVersion": 1, "routeBoundsDegrees": bounds, "records": records,
              "smallestCoveringEnvelope": {key: selected[key] for key in ["source", "declaredFileBytes", "path"]} if selected else None,
              "downloadCapBytes": 100_000_000,
              "downloadEligible": bool(selected and selected["declaredFileBytes"] <= 100_000_000),
              "qualification": "unverified; bounded prefix inspection only"}
    (output / "dem-envelope-audit.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"records": len(records), "selected": result["smallestCoveringEnvelope"], "downloadEligible": result["downloadEligible"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    main(args.root.resolve(), args.output)
