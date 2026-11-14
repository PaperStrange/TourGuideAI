import argparse
from collections import Counter
from datetime import datetime, timezone
import gzip
import hashlib
import json
import os
from pathlib import Path
import urllib.parse
import urllib.request

from pyproj import CRS, Transformer
from shapely.geometry import LineString, Point, box
from shapely.ops import transform, unary_union


REPOSITORY = Path(__file__).resolve().parents[4]
CACHE = REPOSITORY / "artifacts/realism-01/free-connector-next/intake"
EVIDENCE = Path(__file__).resolve().parent
GEOGRAPHY = REPOSITORY / "experience/src/neighborhoods/shijo-east/geography.json"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def request(name, url):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    receipt_path = CACHE / (name + ".receipt.json")
    if path.exists():
        receipt = json.loads(receipt_path.read_text())
        assert receipt["url"] == url and digest(path.read_bytes()) == receipt["sha256"]
        return path.read_bytes()
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "TourGuideAI-source-research/1.0"}), timeout=60) as response:
        body = response.read()
        receipt = {"url": url, "finalUrl": response.url, "status": response.status,
            "date": datetime.now(timezone.utc).isoformat(), "headers": list(response.headers.items()),
            "bytes": len(body), "sha256": digest(body)}
    assert receipt["status"] == 200
    path.write_bytes(body)
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")
    return body


def geography():
    geo = json.loads(GEOGRAPHY.read_text())
    frame = geo["frame"]
    lookup = {item["id"]: item for item in geo["navigation"]["edges"]}
    projection = CRS.from_proj4("+proj=aeqd +lat_0=35.0044 +lon_0=135.7655 +datum=WGS84 +units=m")
    projector = Transformer.from_crs(4326, projection, always_xy=True)
    inverse = Transformer.from_crs(projection, 4326, always_xy=True)
    geographic_lines = [LineString([(frame["origin"]["longitude"] + point["x"] / frame["metresPerDegreeLon"],
        frame["origin"]["latitude"] + point["y"] / frame["metresPerDegreeLat"]) for point in lookup[key]["points"]])
        for key in geo["selectedRoute"]["edgeIds"]]
    lines = [transform(projector.transform, line) for line in geographic_lines]
    route = unary_union(lines)
    return geo, projection, projector, inverse, geographic_lines, lines, route


def acquire():
    geo, projection, projector, inverse, geographic_lines, lines, route = geography()
    request("api-root.json", "https://api.panoramax.xyz/api/")
    request("api-openapi.json", "https://api.panoramax.xyz/openapi.json")
    request("api-docs.html", "https://docs.panoramax.fr/backend/api/api/")
    request("stac-docs.html", "https://docs.panoramax.fr/backend/dev/STAC_compatibility/")
    request("license.html", "https://creativecommons.org/licenses/by-sa/4.0/legalcode.en")
    request("origin-configuration.json", "https://panoramax.osm.tw/api/configuration")
    bounds = {
        "route": unary_union(geographic_lines).bounds,
        "surrounding": transform(inverse.transform, route.buffer(100)).bounds,
    }
    for key, bbox in bounds.items():
        url = "https://api.panoramax.xyz/api/search?" + urllib.parse.urlencode({"bbox": ",".join(map(str, bbox)), "limit": 1000})
        request(key + ".json", url)
    print(json.dumps({name: len(json.loads((CACHE / (name + ".json")).read_text())["features"]) for name in bounds}))


def audit():
    geo, projection, projector, inverse, geographic_lines, lines, route = geography()
    queries, rows = [], []
    records = {}
    for name in ["route", "surrounding"]:
        source = json.loads((CACHE / (name + ".json")).read_text())
        assert len(source["features"]) < 1000 and not any(link["rel"] == "next" for link in source["links"])
        queries.append({"name": name, "returned": len(source["features"]), "requestedLimit": 1000,
            "nextLink": False, "receipt": json.loads((CACHE / (name + ".json.receipt.json")).read_text())})
        records.update({item["id"]: item for item in source["features"]})
    for item in records.values():
        point = Point(*projector.transform(*item["geometry"]["coordinates"][:2]))
        distances = [point.distance(line) for line in lines]
        nearest = min(range(len(lines)), key=lambda index: distances[index])
        properties = item["properties"]
        interior = properties.get("pers:interior_orientation", {})
        exif = properties.get("exif", {})
        rows.append({"id": item["id"], "collection": item["collection"], "coordinates": item["geometry"]["coordinates"],
            "date": properties["datetime"], "providers": item["providers"], "license": properties["license"],
            "source": next(link["href"] for link in item["links"] if link["rel"] == "self"),
            "originalInstance": next(link["href"] for link in item["links"] if link["rel"] == "via"),
            "nearestEdgeOrdinal": nearest + 1, "routeDistanceMetres": distances[nearest],
            "nearestEdgeChainageMetres": lines[nearest].project(point), "camera": interior,
            "heading": properties.get("view:azimuth"), "horizontalAccuracyMetres": properties.get("quality:horizontal_accuracy"),
            "projection": exif.get("Xmp.GPano.ProjectionType"),
            "sourceSoftware": exif.get("Exif.Image.Software"), "sourceComment": exif.get("Exif.Photo.UserComment"),
            "rank": properties.get("geovisio:rank_in_collection"), "assets": item["assets"],
            "poseQualification": "unverified: EXIF/declared position and heading are acquisition metadata; full extrinsics, distortion, metric scale and pedestrian floor are absent"})
    rows.sort(key=lambda row: (row["routeDistanceMetres"], row["id"]))
    groups = []
    for key in sorted({row["collection"] for row in rows}):
        group = [row for row in rows if row["collection"] == key]
        runs = []
        for threshold in [25, 50]:
            current = []
            for row in sorted(group, key=lambda row: row["rank"]):
                eligible = row["routeDistanceMetres"] <= threshold
                if current and (not eligible or row["rank"] != current[-1]["rank"] + 1):
                    runs.append({"thresholdMetres": threshold, "ranks": [item["rank"] for item in current],
                        "photoIds": [item["id"] for item in current], "edgeOrdinals": sorted({item["nearestEdgeOrdinal"] for item in current}),
                        "nearestEdgeChainageRangeMetres": [min(item["nearestEdgeChainageMetres"] for item in current), max(item["nearestEdgeChainageMetres"] for item in current)]})
                    current = []
                if eligible:
                    current.append(row)
            if current:
                runs.append({"thresholdMetres": threshold, "ranks": [item["rank"] for item in current],
                    "photoIds": [item["id"] for item in current], "edgeOrdinals": sorted({item["nearestEdgeOrdinal"] for item in current}),
                    "nearestEdgeChainageRangeMetres": [min(item["nearestEdgeChainageMetres"] for item in current), max(item["nearestEdgeChainageMetres"] for item in current)]})
        groups.append({"collection": key, "count": len(group), "uniqueCoordinates": len({tuple(row["coordinates"]) for row in group}),
            "within25Metres": sum(row["routeDistanceMetres"] <= 25 for row in group),
            "minimumRouteDistanceMetres": min(row["routeDistanceMetres"] for row in group),
            "fieldOfView360Count": sum(row["camera"].get("field_of_view") == 360 for row in group),
            "dates": sorted({row["date"][:10] for row in group}), "licenses": dict(Counter(row["license"] for row in group)),
            "sourceSoftware": dict(Counter(row["sourceSoftware"] for row in group)), "consecutiveRetainedRanks": runs})
    result = {"routeSha256": digest(GEOGRAPHY.read_bytes()), "routeMetres": geo["coverage"]["metres"],
        "edgeCount": len(lines), "projection": projection.to_wkt(), "queries": queries,
        "records": rows, "groups": groups,
        "edgeProximity": [{"ordinal": index + 1, "id": key,
            "nearestCameraMetres": min(Point(*projector.transform(*row["coordinates"][:2])).distance(line) for row in rows),
            "cameraCountWithin25Metres": sum(Point(*projector.transform(*row["coordinates"][:2])).distance(line) <= 25 for row in rows)}
            for index, (key, line) in enumerate(zip(geo["selectedRoute"]["edgeIds"], lines))],
        "method": "Standard JSON decoding; PyProj WGS84/local AEQD; Shapely point-to-complete-polyline distances. Exact route bounds plus100m surrounding query; both unsaturated at limit1000 with no next link.",
        "limitations": "Service completeness is unverified. Declared camera proximity does not establish visible coverage, overlapping surfaces, calibrated poses, measured floor or route qualification. Server-generated semantics and annotations are excluded from findings."}
    (CACHE / "findings.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"queries": [(row["name"], row["returned"]) for row in queries], "records": len(rows), "groups": groups}, indent=2))


def images():
    from PIL import Image

    result = json.loads((CACHE / "findings.json").read_text())
    chosen_collection = "8f84abce-001a-4cb7-97f1-2b99b0aa27f1"
    selected = sorted([row for row in result["records"] if row["collection"] == chosen_collection], key=lambda row: row["routeDistanceMetres"])[:3]
    assert len(selected) == 3 and all(row["license"] == "CC-BY-SA-4.0" and row["camera"]["field_of_view"] == 360 for row in selected)
    decoded_images = []
    for row in selected:
        for resolution in ["hd", "sd"]:
            name = row["id"] + "-" + resolution + ".jpg"
            data = request(name, row["assets"][resolution]["href"])
            with Image.open(CACHE / name) as image:
                size, format_name = image.size, image.format
                image.verify()
            assert size == ((6080, 3040) if resolution == "hd" else (2048, 1024)) and format_name == "JPEG"
            decoded_images.append({"file": name, "size": list(size), "format": format_name, "bytes": len(data), "sha256": digest(data)})
        request(row["id"] + ".json", row["source"])
    (CACHE / "selected.json").write_text(json.dumps(selected, ensure_ascii=False, indent=2) + "\n")
    (CACHE / "decoded-images.json").write_text(json.dumps(decoded_images, indent=2) + "\n")
    print(json.dumps([{key: row[key] for key in ["id", "date", "coordinates", "routeDistanceMetres", "nearestEdgeOrdinal", "rank"]} for row in selected], indent=2))


def plot():
    os.environ["MPLCONFIGDIR"] = str(CACHE / "matplotlib")
    import matplotlib
    matplotlib.use("Agg")
    matplotlib.rcParams["svg.hashsalt"] = "TourGuideAI-free-connector-next"
    from matplotlib import pyplot

    geo, projection, projector, inverse, geographic_lines, lines, route = geography()
    result = json.loads((CACHE / "findings.json").read_text())
    selected = json.loads((CACHE / "selected.json").read_text())
    figure, axes = pyplot.subplots(2, 1, figsize=(13, 8), gridspec_kw={"height_ratios": [1.5, 1]})
    for axis in axes:
        for index, line in enumerate(lines):
            x, y = line.xy
            axis.plot(x, y, color="#245746", linewidth=3, label="Approved 54-edge route" if index == 0 else None)
        xy = [projector.transform(*row["coordinates"][:2]) for row in result["records"]]
        axis.scatter(*zip(*xy), s=12, color="#8c9aaf", alpha=0.7, label="167 declared camera positions")
        chosen = [projector.transform(*row["coordinates"][:2]) for row in selected]
        axis.scatter(*zip(*chosen), s=60, color="#d46c27", edgecolors="white", zorder=5, label="Three reviewed panoramas")
        for index, sight in enumerate(geo["sights"]):
            x, y = projector.transform(sight["longitude"], sight["latitude"])
            axis.scatter([x], [y], s=80, marker="D", color="#245746", zorder=4)
            axis.annotate(str(index + 1), (x, y), xytext=(5, 10), textcoords="offset points", fontsize=11)
        axis.set_aspect("equal", adjustable="box")
        axis.set_xlabel("Local east (metres)")
        axis.set_ylabel("Local north (metres)")
        axis.grid(alpha=0.2)
    axes[0].set_title("Free source intake · Kyoto Shijō East · 1,353.444 m / six sights", loc="left", weight="bold")
    axes[0].legend(loc="lower right", fontsize=9)
    start_x, start_y = projector.transform(geo["sights"][0]["longitude"], geo["sights"][0]["latitude"])
    axes[1].set_xlim(start_x - 65, start_x + 115)
    axes[1].set_ylim(start_y - 65, start_y + 55)
    axes[1].set_title("Start crossing: camera track runs north–south; route edge 1 continues east", loc="left", fontsize=11)
    for row in selected:
        x, y = projector.transform(*row["coordinates"][:2])
        axes[1].annotate("Rank " + str(row["rank"]), (x, y), xytext=(-55, 4), textcoords="offset points", fontsize=9)
    figure.text(0.03, 0.02, "Camera geolocation measures proximity. Visible surface coverage, pose accuracy and walking-floor qualification remain separate.\n"
        "Sight anchors: 1 Mitsui frontage · 2 Nishiki Market · 3 Nishiki Tenmangū · 4 Takase River · 5 Pontochō · 6 Shijō Bridge", fontsize=9)
    figure.tight_layout(rect=(0, 0.08, 1, 1))
    figure.savefig(CACHE / "coverage.svg", metadata={"Date": None})
    pyplot.close(figure)


def retain():
    selected = json.loads((CACHE / "selected.json").read_text())
    receipt_names = [path.name for path in CACHE.glob("*.receipt.json")]
    compressed_names = ["api-root.json", "api-openapi.json", "api-docs.html", "stac-docs.html", "license.html", "origin-configuration.json", "route.json", "surrounding.json"]
    compressed_names.extend(row["id"] + ".json" for row in selected)
    names = ["findings.json", "selected.json", "decoded-images.json", "coverage.svg"] + receipt_names
    names.extend(row["id"] + "-sd.jpg" for row in selected)
    output = EVIDENCE / "records"
    output.mkdir(exist_ok=True)
    files = []
    for name in compressed_names + names:
        raw = (CACHE / name).read_bytes()
        filename = name + ".gz" if name in compressed_names else name
        stored = gzip.compress(raw, mtime=0) if name in compressed_names else raw
        (output / filename).write_bytes(stored)
        receipt_path = CACHE / (name + ".receipt.json")
        receipt = json.loads(receipt_path.read_text()) if receipt_path.exists() else None
        files.append({"file": "records/" + filename, "bytes": len(stored), "sha256": digest(stored),
            "decodedBytes": len(raw), "decodedSha256": digest(raw), "gzip": name in compressed_names,
            "source": receipt["url"] if receipt else "Retained acquisition receipts, actual query metadata and route geography",
            "date": receipt["date"] if receipt else datetime.now(timezone.utc).isoformat(),
            "rights": "Image and camera records: contributor attribution / CC BY-SA 4.0. Official documentation: retained research receipt. Derived geographic measurements: project research.",
            "location": "Approved Shijō East route and surrounding100m query rectangle, Kyoto, Japan",
            "method": "Exact received bytes; gzip is lossless. SD images are unchanged service-provided previews. Measurements use PyProj and Shapely.",
            "limitations": "Camera positions and vendor metadata remain unverified; source intake supplies no accepted continuous route or pedestrian floor."})
    producer = Path(__file__).read_bytes()
    manifest = {"schemaVersion": 1, "files": files,
        "producer": {"file": "research.py", "bytes": len(producer), "sha256": digest(producer)},
        "route": {"file": str(GEOGRAPHY.relative_to(REPOSITORY)), "sha256": digest(GEOGRAPHY.read_bytes())},
        "originals": [{"file": row["id"] + "-hd.jpg", "receipt": "records/" + row["id"] + "-hd.jpg.receipt.json",
            "source": row["assets"]["hd"]["href"], "attribution": "Irvin Chen / Panoramax Taiwan", "rights": "CC BY-SA 4.0",
            "scope": "Exact downloaded service HD files remain in ignored artifacts; reacquire with images mode"} for row in selected]}
    (EVIDENCE / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"retainedFiles": len(files), "storedBytes": sum(row["bytes"] for row in files)}))


def verify():
    from PIL import Image

    manifest = json.loads((EVIDENCE / "manifest.json").read_text())
    assert digest(Path(__file__).read_bytes()) == manifest["producer"]["sha256"]
    assert digest(GEOGRAPHY.read_bytes()) == manifest["route"]["sha256"]
    decoded = {}
    for row in manifest["files"]:
        data = (EVIDENCE / row["file"]).read_bytes()
        assert len(data) == row["bytes"] and digest(data) == row["sha256"], row["file"]
        raw = gzip.decompress(data) if row["gzip"] else data
        assert len(raw) == row["decodedBytes"] and digest(raw) == row["decodedSha256"]
        decoded[Path(row["file"]).name.removesuffix(".gz")] = raw
    for name, data in decoded.items():
        if name.endswith(".receipt.json"):
            receipt = json.loads(data)
            original = name.removesuffix(".receipt.json")
            if original in decoded:
                assert len(decoded[original]) == receipt["bytes"] and digest(decoded[original]) == receipt["sha256"]
    result = json.loads(decoded["findings.json"])
    selected = json.loads(decoded["selected.json"])
    geo, projection, projector, inverse, geographic_lines, lines, route = geography()
    records = {}
    for query in result["queries"]:
        payload = json.loads(decoded[query["name"] + ".json"])
        assert len(payload["features"]) == query["returned"] < query["requestedLimit"]
        assert not any(link["rel"] == "next" for link in payload["links"])
        bounds = list(map(float, urllib.parse.parse_qs(urllib.parse.urlparse(query["receipt"]["url"]).query)["bbox"][0].split(",")))
        assert all(box(*bounds).covers(line) for line in geographic_lines)
        assert all(box(*bounds).covers(Point(item["geometry"]["coordinates"][:2])) for item in payload["features"])
        records.update({item["id"]: item for item in payload["features"]})
    assert len(records) == len(result["records"])
    for row in result["records"]:
        item = records[row["id"]]
        point = Point(*projector.transform(*item["geometry"]["coordinates"][:2]))
        distances = [point.distance(line) for line in lines]
        assert row["routeDistanceMetres"] == min(distances)
        assert row["nearestEdgeOrdinal"] == distances.index(min(distances)) + 1
        assert row["camera"] == item["properties"].get("pers:interior_orientation", {})
        assert row["license"] == item["properties"]["license"]
        assert row["coordinates"] == item["geometry"]["coordinates"]
    assert len(result["edgeProximity"]) == len(lines) == 54
    for edge, line in zip(result["edgeProximity"], lines):
        distances = [Point(*projector.transform(*row["coordinates"][:2])).distance(line) for row in result["records"]]
        assert min(distances) == edge["nearestCameraMetres"]
        assert sum(value <= 25 for value in distances) == edge["cameraCountWithin25Metres"]
    for group in result["groups"]:
        members = [row for row in result["records"] if row["collection"] == group["collection"]]
        assert len(members) == group["count"]
        assert len({tuple(row["coordinates"]) for row in members}) == group["uniqueCoordinates"]
        assert sum(row["camera"].get("field_of_view") == 360 for row in members) == group["fieldOfView360Count"]
        for threshold in [25, 50]:
            runs = [run for run in group["consecutiveRetainedRanks"] if run["thresholdMetres"] == threshold]
            covered_ids = [photo_id for run in runs for photo_id in run["photoIds"]]
            assert len(set(covered_ids)) == len(covered_ids)
            assert set(covered_ids) == {row["id"] for row in members if row["routeDistanceMetres"] <= threshold}
            for run in runs:
                assert run["ranks"] == list(range(run["ranks"][0], run["ranks"][-1] + 1))
                covered = [next(row for row in members if row["id"] == photo_id) for photo_id in run["photoIds"]]
                assert run["ranks"] == [row["rank"] for row in covered]
                assert run["edgeOrdinals"] == sorted({row["nearestEdgeOrdinal"] for row in covered})
                assert run["nearestEdgeChainageRangeMetres"] == [min(row["nearestEdgeChainageMetres"] for row in covered), max(row["nearestEdgeChainageMetres"] for row in covered)]
    assert sorted(row["rank"] for row in selected) == [57, 58, 59]
    for row in selected:
        assert row in result["records"] and row["license"] == "CC-BY-SA-4.0"
        item = json.loads(decoded[row["id"] + ".json"])
        assert item["geometry"]["coordinates"] == row["coordinates"]
        assert item["properties"]["license"] == row["license"]
        path = EVIDENCE / "records" / (row["id"] + "-sd.jpg")
        with Image.open(path) as image:
            assert image.size == (2048, 1024) and image.format == "JPEG"
            image.verify()
    image_report = json.loads(decoded["decoded-images.json"])
    assert len(image_report) == 6
    for row in image_report:
        receipt = json.loads(decoded[row["file"] + ".receipt.json"])
        assert row["bytes"] == receipt["bytes"] and row["sha256"] == receipt["sha256"]
        assert row["size"] == ([6080, 3040] if row["file"].endswith("-hd.jpg") else [2048, 1024])
    print(json.dumps({"verifiedFiles": len(manifest["files"]), "routeEdges": len(lines), "records": len(records),
        "retainedPanoramas": len(selected), "routeQualified": False}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["acquire", "audit", "images", "plot", "retain", "verify"])
    args = parser.parse_args()
    {"acquire": acquire, "audit": audit, "images": images, "plot": plot, "retain": retain, "verify": verify}[args.mode]()
