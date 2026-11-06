import argparse
import hashlib
import json
from pathlib import Path

from bs4 import BeautifulSoup
from shapely.geometry import LineString, Point


def locate(root, folder):
    geography_path = root / "experience/src/neighborhoods/shijo-east/geography.json"
    geography = json.loads(geography_path.read_text())
    frame = geography["frame"]
    lookup = {edge["id"]: edge for edge in geography["navigation"]["edges"]}

    def local(longitude, latitude):
        return Point((longitude - frame["origin"]["longitude"]) * frame["metresPerDegreeLon"],
                     (latitude - frame["origin"]["latitude"]) * frame["metresPerDegreeLat"])

    edges = [LineString([(point["x"], point["y"]) for point in lookup[key]["points"]]) for key in geography["selectedRoute"]["edgeIds"]]
    records = []
    for name, business_type, photo in [("identity-momiji-retty", "Restaurant", "takase-20260624-212.jpg"),
                                      ("identity-toyoko-official", "Hotel", "shijo-20260621-37.jpg")]:
        source_path = folder / (name + ".body")
        receipt = json.loads((folder / (name + ".receipt.json")).read_text())
        digest = hashlib.sha256(source_path.read_bytes()).hexdigest()
        if digest != receipt["sha256"]:
            raise ValueError("Business source receipt differs")
        soup = BeautifulSoup(source_path.read_text(), "html.parser")
        structured = []
        for script in soup.find_all("script", type="application/ld+json"):
            parsed = json.loads(script.string)
            structured.extend(parsed if isinstance(parsed, list) else [parsed])
        business = next(item for item in structured if item.get("@type") == business_type)
        longitude, latitude = float(business["geo"]["longitude"]), float(business["geo"]["latitude"])
        point = local(longitude, latitude)
        distances = [edge.distance(point) for edge in edges]
        nearest = min(range(len(edges)), key=lambda index: distances[index])
        nearest_point = edges[nearest].interpolate(edges[nearest].project(point))
        photo_record = next(item for item in json.loads((folder / "originals/download-receipts.json").read_text())["records"] if item["file"] == photo)
        camera = local(float(photo_record["location"]["declaredLongitude"]), float(photo_record["location"]["declaredLatitude"]))
        records.append({"photo": photo, "businessName": business["name"], "independentAddress": business["address"],
            "declaredBusinessLongitudeLatitude": [longitude, latitude], "distanceFromAuthoredRouteMetres": distances[nearest],
            "nearestRouteEdgeOrdinal": nearest + 1, "nearestRouteEdgeId": geography["selectedRoute"]["edgeIds"][nearest],
            "offsetFromNearestRouteEastNorthMetres": [point.x - nearest_point.x, point.y - nearest_point.y],
            "distanceFromPhotoDeclaredCameraMetres": point.distance(camera), "source": receipt["source"],
            "retrievedAt": receipt["retrievedAt"], "sourceSha256": digest,
            "method": "Independent listing/official Hotel JSON-LD parsed through BeautifulSoup and JSON; business coordinate compared with authored route using its declared frame",
            "qualification": "Named nearby business association only; supplied business pin is not a surveyed doorway or façade polygon",
            "limits": "Listing/official pin and phone camera GPS need not coincide. No camera-to-feature transform, measured entrance/floor, current access or exact source-model frontage is established. Original website assets have no reusable art license established."})
    report = {"reviewedAt": "2026-11-06", "records": records,
        "routeInput": {"path": str(geography_path.relative_to(root)), "sha256": hashlib.sha256(geography_path.read_bytes()).hexdigest()},
        "supplementalSources": ["identity-momiji-profile.receipt.json", "identity-momiji-magazine.receipt.json", "identity-momiji-1000bero.receipt.json"],
        "addressDiscrepancy": "A 2019 travel blog gives Nabeyacho 220-1. Retty (updated 2026-04-06) and the 2018 1000bero feature independently give Nabeyacho 225 Hagiwara Building 1F; these are listing-level corroboration. Exact geometric assignment requires storefront registration."}
    (folder / "business-identity.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"businesses": len(records), "routeDistancesMetres": [item["distanceFromAuthoredRouteMetres"] for item in records]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--lookup", type=Path, required=True)
    args = parser.parse_args()
    locate(args.root.resolve(), args.lookup.resolve())
