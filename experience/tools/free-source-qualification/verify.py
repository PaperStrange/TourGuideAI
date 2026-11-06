import argparse
import hashlib
import json
from pathlib import Path


def check(path, record):
    data = path.read_bytes()
    if len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"]:
        raise ValueError(f"Evidence identity differs: {path}")


def verify(root):
    target = root / "experience/evidence/realism-01/qualification/free-sources"
    manifest = json.loads((target / "manifest.json").read_text())
    for base, items in [(target, manifest["files"]), (root, manifest["producers"])]:
        for item in items:
            check(base / item["path"], item)
    research = json.loads((target / "research-receipts.json").read_text())
    photos = json.loads((target / "photo-receipts.json").read_text())
    camera = json.loads((target / "camera-metadata.json").read_text())
    business = json.loads((target / "business-identity.json").read_text())
    route_input = business["routeInput"]
    if hashlib.sha256((root / route_input["path"]).read_bytes()).hexdigest() != route_input["sha256"]:
        raise ValueError("Business association route identity differs")
    known_source_hashes = {item["sha256"] for item in research["metadataReceipts"]}
    if any(item["sourceSha256"] not in known_source_hashes for item in business["records"]):
        raise ValueError("Business source lacks research receipt")
    previews = json.loads((target / "karta-preview-receipts.json").read_text())
    visual = json.loads((target / "karta-visual-review.json").read_text())
    if {item["photoId"] for item in visual["records"]} != {item["photoId"] for item in previews}:
        raise ValueError("KartaView visual review sources differ")
    for preview in previews:
        check(target / Path(preview["cachePath"]).name, preview)
    roles = json.loads((target / "source-roles.json").read_text())
    for record in roles["inputs"]:
        path = root / record["path"]
        if not record["path"].startswith("artifacts/") or path.exists():
            check(path, record)
    if any(item["independentHoldout"] for item in roles["records"]):
        raise ValueError("Inspected references have no blind holdout qualification")
    for item in roles["records"]:
        if item["sameCaptureFamilyAsReservedMitsui"] and not item["use"].startswith("inspection-only"):
            raise ValueError("Related reserved-capture family must remain inspection-only")
    comparison = json.loads((target / "registry-comparison.json").read_text())
    for name, digest in comparison["protectedInputsUnchanged"].items():
        path = root / name
        if (not name.startswith("artifacts/") or path.exists()) and hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError("Protected source input changed")
    coverage = json.loads((target / "query-coverage.json").read_text())
    for item in coverage["inputs"]:
        path = root / item["path"]
        if not item["path"].startswith("artifacts/") or path.exists():
            check(path, item)
    geo = json.loads((root / "experience/src/neighborhoods/shijo-east/geography.json").read_text())
    if [item["id"] for item in coverage["edgeCoverage"]] != geo["selectedRoute"]["edgeIds"]:
        raise ValueError("Query coverage route order differs")
    if not all(item["coveredByDocumentedBoundingBox"] for item in coverage["edgeCoverage"]):
        raise ValueError("Query rectangle does not cover the complete approved route")
    nearby = {item["photoId"]: item for item in coverage["nearbyPhotoRecords"]}
    if {item["photoId"] for item in previews} | set(visual["unreviewedNearbyPhotoIds"]) != set(nearby):
        raise ValueError("Nearby imagery inspection coverage differs")
    for preview in previews:
        source = nearby[preview["photoId"]]
        if preview["sourceCoordinates"] != source["sourceCoordinates"] or preview["projectedRouteDistanceMetres"] != source["projectedRouteDistanceMetres"]:
            raise ValueError("Inspected preview source position differs")
    if photos["records"] != [{key: value for key, value in item.items() if key != "cachePath"} for item in research["acquiredPhotographs"]["records"]]:
        raise ValueError("Acquired photo records differ")
    originals = {item["file"]: item for item in photos["records"]}
    if {item["file"] for item in camera} != set(originals) or any(item["sha256"] != originals[item["file"]]["sha256"] for item in camera):
        raise ValueError("Camera metadata source differs")
    if sum(item["bytes"] for item in photos["records"]) != photos["downloadedBytes"]:
        raise ValueError("Acquired byte total differs")
    check(root / research["approvedRoute"]["identity"]["cachePath"], research["approvedRoute"]["identity"])
    route = research["approvedRoute"]["boundsDegrees"]
    for item in research["supplementaryOfficialCollection"]["inspectedTilesets"]:
        bounds = item["rootBoundingRegionDegrees"]
        intersects = not (bounds[2] < route[0] or bounds[0] > route[2] or bounds[3] < route[1] or bounds[1] > route[3])
        if intersects != item["intersectsApprovedRouteBounds"]:
            raise ValueError("Declared extent comparison differs")
    cached = 0
    for item in research["acquiredPhotographs"]["records"]:
        path = root / item["cachePath"]
        if path.exists():
            check(path, item)
            cached += 1
    overlap = json.loads((target / "overlap-photo-receipts.json").read_text())
    if sum(item["bytes"] for item in overlap["records"]) != overlap["downloadedBytes"]:
        raise ValueError("Adjacent photo byte total differs")
    for item in overlap["records"]:
        path = root / "artifacts/realism-01/free-sources/lookup/originals-overlap" / item["file"]
        if path.exists():
            check(path, item)
            cached += 1
    print(json.dumps({"status": "passed", "files": len(manifest["files"]), "producers": len(manifest["producers"]),
        "photoRecords": len(originals) + len(overlap["records"]), "cachedOriginalsRechecked": cached,
        "kartaPreviewsRechecked": len(previews), "qualityAcceptance": "unqualified"}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    args = parser.parse_args()
    verify(args.root.resolve())
