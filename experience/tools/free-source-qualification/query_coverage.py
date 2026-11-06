import argparse
import hashlib
import json
from pathlib import Path

from pyproj import CRS, Geod, Transformer
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import transform, unary_union


def identity(path, root):
    data = path.read_bytes()
    return {"path": str(path.relative_to(root)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def measure(root, research, output):
    geo_path = root / "experience/src/neighborhoods/shijo-east/geography.json"
    geo = json.loads(geo_path.read_text())
    frame = geo["frame"]
    lookup = {item["id"]: item for item in geo["navigation"]["edges"]}
    projection = CRS.from_proj4("+proj=aeqd +lat_0=35.0044 +lon_0=135.7655 +datum=WGS84 +units=m")
    transformer = Transformer.from_crs(4326, projection, always_xy=True)
    lines = []
    for key in geo["selectedRoute"]["edgeIds"]:
        coordinates = [(frame["origin"]["longitude"] + point["x"] / frame["metresPerDegreeLon"],
            frame["origin"]["latitude"] + point["y"] / frame["metresPerDegreeLat"]) for point in lookup[key]["points"]]
        lines.append(transform(transformer.transform, LineString(coordinates)))
    geod = Geod(ellps="WGS84")
    centers = [("kartaview-route-west", 135.7599457, 35.00376),
               ("kartaview-route-query", 135.7655, 35.0044),
               ("kartaview-route-east", 135.77152, 35.00391)]
    circles, queries, sources = [], [], [identity(geo_path, root)]
    for name, longitude, latitude in centers:
        ring = [geod.fwd(longitude, latitude, angle / 2, 500)[:2] for angle in range(720)]
        circles.append(transform(transformer.transform, Polygon(ring)))
        path = research / (name + ".raw")
        data = json.loads(path.read_text())
        if data["status"]["httpCode"] != 200 or data["result"]["hasMoreData"]:
            raise ValueError("Expected successful completed bounded source query")
        sources.append(identity(path, root))
        queries.append({"name": name, "longitude": longitude, "latitude": latitude, "requestedRadius": 500,
            "returnedPhotoCount": len(data["result"]["data"]), "hasMoreData": data["result"]["hasMoreData"],
            "receipt": json.loads((research / (name + ".receipt.json")).read_text()), "response": data})
    union = unary_union(circles)
    bounds = [135.7590, 35.0031, 135.7725, 35.0057]
    rectangle = transform(transformer.transform, box(*bounds))
    rectangle_path = research / "kartaview-route-bounds.raw"
    rectangle_data = json.loads(rectangle_path.read_text())
    if rectangle_data["status"]["httpCode"] != 200 or rectangle_data["result"]["hasMoreData"]:
        raise ValueError("Expected completed bounding-box query")
    sources.append(identity(rectangle_path, root))
    route = unary_union(lines)
    photo_distances = [{"photoId": item["id"], "sequenceId": item["sequenceId"],
        "sourceCoordinates": [float(item["lng"]), float(item["lat"])], "declaredShotDate": item["shotDate"],
        "projectedRouteDistanceMetres": Point(*transformer.transform(float(item["lng"]), float(item["lat"]))).distance(route)}
        for query in queries for item in query["response"]["result"]["data"]]
    result = {"date": "2026-11-06", "inputs": sources, "projection": projection.to_wkt(),
        "method": "PyProj WGS84 geodesic 500m rings sampled every0.5degree and local AEQD transform; Shapely union and each complete source polyline containment",
        "queries": queries, "boundingBoxQuery": {"boundsDegrees": bounds,
            "receipt": json.loads((research / "kartaview-route-bounds.receipt.json").read_text()), "response": rectangle_data},
        "edgeCoverage": [{"ordinal": index + 1, "id": key, "coveredBy500MetreCircleUnion": union.covers(line),
            "coveredByDocumentedBoundingBox": rectangle.covers(line), "lengthMetres": line.length}
            for index, (key, line) in enumerate(zip(geo["selectedRoute"]["edgeIds"], lines))],
        "circleUnionUncoveredRouteMetres": route.difference(union).length,
        "boundingBoxUncoveredRouteMetres": route.difference(rectangle).length,
        "minimumRouteClearanceInsideCircleUnionMetres": route.distance(union.boundary),
        "nearbyPhotoRecords": photo_distances,
        "limitations": "Photo API docs identify lat/lng and radius range 1–500 without explicit units. Circle calculation reports the 500m interpretation; the documented bounding-box query controls geographic coverage conclusions. Camera coordinates, returned dates and service completeness remain unverified. No camera records in the route rectangle does not exclude off-route cameras viewing route features. Two nearby published thumbnails are separately inspected in karta-preview-receipts.json."}
    output.mkdir(parents=True, exist_ok=True)
    (output / "query-coverage.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"edgeCount": len(lines), "circleUncoveredMetres": result["circleUnionUncoveredRouteMetres"],
        "bboxUncoveredMetres": result["boundingBoxUncoveredRouteMetres"], "queryCounts": [item["returnedPhotoCount"] for item in queries],
        "bboxPhotoCount": len(rectangle_data["result"]["data"]), "minimumNearbyPhotoRouteDistanceMetres": min(item["projectedRouteDistanceMetres"] for item in photo_distances)}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--research", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    measure(args.root.resolve(), args.research.resolve(), args.output.resolve())
