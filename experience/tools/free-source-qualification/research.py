import argparse
import hashlib
import json
import math
from pathlib import Path


def assemble(root, folder):
    def read(path):
        return json.loads(path.read_text())

    def identity(path):
        data = path.read_bytes()
        return {"cachePath": str(path.relative_to(root)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}

    catalog_path = root / "artifacts/neighborhood-20261027/world/plateau-catalog.raw"
    city = next(item for item in read(catalog_path)["citygml"] if item["city_code"] == "26100")
    geo_path = root / "experience/src/neighborhoods/shijo-east/geography.json"
    geo = read(geo_path)
    selected = {item["id"]: item for item in geo["navigation"]["edges"]}
    points = [point for key in geo["selectedRoute"]["edgeIds"] for point in selected[key]["points"]]
    frame = geo["frame"]
    coordinates = [(frame["origin"]["longitude"] + point["x"] / frame["metresPerDegreeLon"],
                    frame["origin"]["latitude"] + point["y"] / frame["metresPerDegreeLat"]) for point in points]
    route_bounds = [min(point[0] for point in coordinates), min(point[1] for point in coordinates),
                    max(point[0] for point in coordinates), max(point[1] for point in coordinates)]
    tilesets = []
    for path in sorted(folder.glob("uc25*-tileset.json")):
        region = read(path)["root"]["boundingVolume"]["region"]
        bounds = [math.degrees(value) for value in region[:4]]
        intersects = not (bounds[2] < route_bounds[0] or bounds[0] > route_bounds[2] or bounds[3] < route_bounds[1] or bounds[1] > route_bounds[3])
        tilesets.append({**identity(path), "rootBoundingRegionDegrees": bounds, "intersectsApprovedRouteBounds": intersects,
            "method": "Standard JSON tileset region radians converted to degrees; rectangle intersection against every approved intermediate route point",
            "limitations": "Declared extent screening; no decoded geometry or quality acceptance; ZIP timestamps establish no capture date"})
    receipts = [read(folder / name) for name in ["route-all-types.receipt.json", "mapillary-legal.receipt.json"]]
    lookup = folder / "lookup"
    metadata_receipts = [read(path) for path in sorted(lookup.glob("*.receipt.json"))]
    for record in receipts:
        actual = identity(root / record["cachePath"])
        if actual["bytes"] != record["bytes"] or actual["sha256"] != record["sha256"]:
            raise ValueError("Research receipt differs")
    photos = read(lookup / "originals/download-receipts.json")
    for photo in photos["records"]:
        actual = identity(lookup / "originals" / photo["file"])
        if actual["bytes"] != photo["bytes"] or actual["sha256"] != photo["sha256"]:
            raise ValueError("Original photograph differs")
        photo["cachePath"] = actual["cachePath"]
    output = {"schemaVersion": 1, "date": "2026-11-06", "constraint": "Free sources only; no outreach, purchase, paid service or token request",
        "approvedRoute": {"identity": identity(geo_path), "boundsDegrees": route_bounds, "lengthMetres": geo["selectedRoute"]["lengthMetres"]},
        "officialRouteQuery": {"receipt": receipts[0], "response": read(folder / "route-all-types.raw"),
            "rights": "Official PLATEAU metadata; existing municipal source rights recorded in the source qualification receipts",
            "limitations": "Mesh-file availability establishes no detailed geometry at a particular route point"},
        "supplementaryOfficialCollection": {"catalogIdentity": identity(catalog_path), "catalogKyotoEntry": city,
            "rangeReceipts": read(folder / "highdetail-range-receipts.json"), "archiveEntries": read(folder / "highdetail-index.json"),
            "inspectedTilesets": tilesets,
            "rights": "Resource-specific redistribution terms not established during this inspection; source bytes remain in ignored research cache",
            "limitations": "The three inspected category extents are outside the approved route; furniture/vegetation nested entries were not acquired"},
        "photographCandidates": read(lookup / "findings.json"), "acquiredPhotographs": photos, "metadataReceipts": metadata_receipts,
        "mapillaryTerms": {"receipt": receipts[1], "effectiveDate": "2024-02-15",
            "facts": ["Section 3(b) applies CC BY-SA to user content unless another license is indicated", "Section 11 requires developer application registration and a client_id", "Section 5 prohibits use with real-time sensor-synchronized navigation or route guidance", "Section 5 restricts unapproved scraping/extraction"],
            "qualification": "No exact-route image IDs, permitted application access or calibrated source package acquired; no token requested"},
        "kartaView": {"receipts": [read(folder / name) for name in ["kartaview-docs.receipt.json", "kartaview-terms.receipt.json", "kartaview-app.receipt.json"]],
            "queryEvidence": "query-coverage.json retains all four completed no-key queries and their full JSON responses",
            "documentedAccess": "Public site FAQ provides a no-key /2.0/photo/ location/radius lookup and documented geographic bounds. Radius range is 1–500; published documentation does not specify units.",
            "rights": "Public site terms license street imagery and 3D spatial data under CC BY-SA 4.0, credit © Grab and KartaView Contributors",
            "method": "Public documentation/terms in site JavaScript; west, central, east radius queries and a geographic rectangle verified against all 54 complete route polylines",
            "limitations": "The route rectangle returns zero camera records; the east radius query returns seven off-route cameras. Two nearest thumbnails are inspected separately. Camera-coordinate lookup does not establish visible-feature coverage or total source absence."},
        "limitations": "Public metadata and declared GPS are not surveyed camera positions or current-access proof. No complete captured 3D route was qualified. Existing full-route realism, floor, discovery and performance gates remain unchanged."}
    target = folder / "research-receipts.json"
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"output": str(target.relative_to(root)), "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "inspectedSupplementaryTilesets": len(tilesets), "routeIntersections": sum(item["intersectsApprovedRouteBounds"] for item in tilesets),
        "photoCandidates": len(output["photographCandidates"]["records"]), "originalPhotos": len(photos["records"]), "originalPhotoBytes": photos["downloadedBytes"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--research", type=Path, required=True)
    args = parser.parse_args()
    assemble(args.root.resolve(), args.research.resolve())
