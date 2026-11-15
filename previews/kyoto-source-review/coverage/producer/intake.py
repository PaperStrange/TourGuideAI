import argparse
from collections import Counter
from datetime import datetime, timezone
import gzip
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import urllib.parse
import urllib.request

from pyproj import CRS, Geod, Transformer
from shapely.geometry import LineString, Point
from shapely.ops import transform, unary_union


ROOT = Path(__file__).resolve().parents[3]
CACHE = ROOT / "artifacts/realism-01/connector-source-intake"
EVIDENCE = ROOT / "experience/evidence/realism-01/connector-source-intake"
PREVIOUS = ROOT / "experience/evidence/realism-01/free-connector-next"
GEOGRAPHY = ROOT / "experience/src/neighborhoods/shijo-east/geography.json"
BASE = "https://api.panoramax.xyz/api"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def store(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n")


def request(name, url, decode_json=True):
    path = CACHE / name
    receipt_path = path.with_name(path.name + ".receipt.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        receipt = json.loads(receipt_path.read_text())
        assert receipt["url"] == url and sha(path.read_bytes()) == receipt["sha256"]
        return json.loads(path.read_bytes()) if decode_json else path.read_bytes()
    parsed = urllib.parse.urlparse(url)
    assert parsed.scheme == "https" and parsed.netloc in {"api.panoramax.xyz", "panoramax.osm.tw"}
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "TourGuideAI-source-research/1.1"}), timeout=60) as response:
        data = response.read(64 * 1024 * 1024 + 1)
        assert len(data) <= 64 * 1024 * 1024
        assert response.status == 200
        receipt = {"url": url, "finalUrl": response.url, "status": response.status,
            "date": datetime.now(timezone.utc).isoformat(), "headers": list(response.headers.items()),
            "bytes": len(data), "sha256": sha(data)}
    path.write_bytes(data)
    store(receipt_path, receipt)
    return json.loads(data) if decode_json else data


def geography():
    geo = json.loads(GEOGRAPHY.read_text())
    frame = geo["frame"]
    lookup = {edge["id"]: edge for edge in geo["navigation"]["edges"]}
    projection = CRS.from_proj4("+proj=aeqd +lat_0=35.0044 +lon_0=135.7655 +datum=WGS84 +units=m")
    project = Transformer.from_crs(4326, projection, always_xy=True)
    inverse = Transformer.from_crs(projection, 4326, always_xy=True)
    geographic = [LineString([(frame["origin"]["longitude"] + point["x"] / frame["metresPerDegreeLon"],
        frame["origin"]["latitude"] + point["y"] / frame["metresPerDegreeLat"]) for point in lookup[key]["points"]])
        for key in geo["selectedRoute"]["edgeIds"]]
    lines = [transform(project.transform, line) for line in geographic]
    return geo, project, inverse, geographic, lines


def paginated(name, url, field):
    pages = []
    records = []
    visited = set()
    while url:
        assert url not in visited and len(pages) < 100, "Pagination cycle or bounded page limit"
        visited.add(url)
        filename = f"responses/{name}-{len(pages) + 1:03d}.json"
        data = request(filename, url)
        rows = data[field]
        next_links = [link["href"] for link in data.get("links", []) if link["rel"] == "next"]
        assert len(next_links) <= 1
        pages.append({"file": filename, "url": url, "count": len(rows),
            "next": next_links[0] if next_links else None,
            "numberMatched": data.get("numberMatched"), "numberReturned": data.get("numberReturned")})
        records.extend(rows)
        url = urllib.parse.urljoin(url, next_links[0]) if next_links else None
    assert len({row["id"] for row in records}) == len(records), "Repeated identifiers across pages"
    return pages, records


def acquire():
    geo, project, inverse, geographic, lines = geography()
    bounds = transform(inverse.transform, unary_union(lines).buffer(100)).bounds
    url = BASE + "/collections?" + urllib.parse.urlencode({"bbox": ",".join(map(str, bounds)), "limit": 1000})
    catalog_pages, collections = paginated("catalog", url, "collections")
    store(CACHE / "catalog.json", {"pages": catalog_pages, "collections": collections})
    print(json.dumps({"collections": len(collections), "ids": [row["id"] for row in collections]}, indent=2))


def collections():
    catalog = json.loads((CACHE / "catalog.json").read_text())
    geod = Geod(ellps="WGS84")
    selection = []
    for row in catalog["collections"]:
        boxes = row["extent"]["spatial"]["bbox"]
        diagonals = [geod.inv(box[0], box[1], box[2], box[3])[2] for box in boxes]
        selection.append({"id": row["id"], "extentDiagonalMetres": diagonals,
            "completeCollectionAudit": all(value <= 20000 for value in diagonals),
            "declaredItems": row.get("stats:items", {}).get("count")})
    store(CACHE / "collection-selection.json", {"maximumLocalExtentDiagonalMetres": 20000, "collections": selection,
        "scope": "Complete local sequence metadata. Global contributor albums retain catalog and previous bounded item coverage only."})
    identifiers = sorted(row["id"] for row in selection if row["completeCollectionAudit"])
    summaries = []
    for identifier in identifiers:
        metadata = request(f"responses/collection-{identifier}.json", f"{BASE}/collections/{identifier}")
        pages, records = paginated("items-" + identifier, f"{BASE}/collections/{identifier}/items?limit=1000", "features")
        summaries.append({"id": identifier, "metadata": f"responses/collection-{identifier}.json",
            "pages": pages, "recordCount": len(records), "ranks": [item["properties"].get("geovisio:rank_in_collection") for item in records],
            "metadataPictureCount": metadata.get("stats:items", {}).get("count"),
            "licenses": dict(Counter(item["properties"].get("license") for item in records))})
        store(CACHE / "collection-inventory.json", {"completed": False, "catalogPages": catalog["pages"], "collections": summaries})
        print(json.dumps({"id": identifier, "records": len(records), "pages": len(pages)}), flush=True)
    store(CACHE / "collection-inventory.json", {"completed": True, "catalogPages": catalog["pages"], "collections": summaries})


def read_source(directory, filename):
    path = directory / filename
    return path.read_bytes() if path.exists() else gzip.decompress(path.with_name(path.name + ".gz").read_bytes())


def calculate_audit(directory, inventory):
    assert inventory["completed"]
    geo, project, inverse, geographic, lines = geography()
    previous = json.loads((PREVIOUS / "records/findings.json").read_text())
    previous_ids = {item["id"] for item in previous["records"]}
    rows = []
    groups = []
    for collection in inventory["collections"]:
        members = []
        for page in collection["pages"]:
            payload = json.loads(read_source(directory, page["file"]))
            for item in payload["features"]:
                assert item["collection"] == collection["id"]
                properties = item["properties"]
                exif = properties.get("exif", {})
                coordinates = item["geometry"]["coordinates"]
                point = Point(*project.transform(*coordinates[:2]))
                distances = [point.distance(line) for line in lines]
                nearest = distances.index(min(distances))
                members.append({"id": item["id"], "collection": item["collection"], "rank": properties.get("geovisio:rank_in_collection"),
                    "coordinates": coordinates, "date": properties["datetime"], "license": properties.get("license"),
                    "providers": item.get("providers"), "camera": properties.get("pers:interior_orientation", {}),
                    "projection": exif.get("Xmp.GPano.ProjectionType"), "sourceSoftware": exif.get("Exif.Image.Software"),
                    "horizontalAccuracyMetres": properties.get("quality:horizontal_accuracy"),
                    "routeDistanceMetres": distances[nearest], "nearestEdgeOrdinal": nearest + 1,
                    "nearestEdgeChainageMetres": lines[nearest].project(point),
                    "firstEdgeDistanceMetres": distances[0], "firstEdgeChainageMetres": lines[0].project(point),
                    "alreadyInBoundedQuery": item["id"] in previous_ids,
                    "source": next(link["href"] for link in item["links"] if link["rel"] == "self"),
                    "assets": item["assets"]})
        assert len(members) == collection["recordCount"]
        members.sort(key=lambda row: row["rank"])
        pairs = []
        for left, right in zip(members, members[1:]):
            if right["rank"] != left["rank"] + 1:
                continue
            distance = Point(*project.transform(*left["coordinates"][:2])).distance(Point(*project.transform(*right["coordinates"][:2])))
            if max(left["routeDistanceMetres"], right["routeDistanceMetres"]) <= 50:
                pairs.append({"ranks": [left["rank"], right["rank"]], "ids": [left["id"], right["id"]],
                    "declaredCameraSpacingMetres": distance,
                    "firstEdgeChainageChangeMetres": right["firstEdgeChainageMetres"] - left["firstEdgeChainageMetres"],
                    "edgeOrdinals": [left["nearestEdgeOrdinal"], right["nearestEdgeOrdinal"]]})
        near = [row for row in members if row["routeDistanceMetres"] <= 50]
        groups.append({"id": collection["id"], "records": len(members), "pages": len(collection["pages"]),
            "rankRange": [min(row["rank"] for row in members), max(row["rank"] for row in members)] if members else [],
            "uniqueRanks": len({row["rank"] for row in members}),
            "newToBoundedQuery": sum(not row["alreadyInBoundedQuery"] for row in members),
            "fieldOfView360Count": sum(row["camera"].get("field_of_view") == 360 for row in members),
            "routeCamerasWithin50Metres": len(near),
            "newRouteCamerasWithin50Metres": sum(not row["alreadyInBoundedQuery"] for row in near),
            "firstEdgeChainageRangeMetres": [min(row["firstEdgeChainageMetres"] for row in near), max(row["firstEdgeChainageMetres"] for row in near)] if near else [],
            "nearbyConsecutivePairs": pairs})
        rows.extend(members)
    result = {"routeSha256": sha(GEOGRAPHY.read_bytes()), "previousFindingsSha256": sha((PREVIOUS / "records/findings.json").read_bytes()),
        "method": "Complete paginated selected collection metadata; PyProj AEQD and Shapely distances to every original route polyline; no geolocation used as a surface or calibration certificate.",
        "routeMetres": geo["coverage"]["metres"], "routeEdges": len(lines), "groups": groups, "records": rows,
        "routeQualified": False,
        "limitations": "Completeness applies to these dated collection responses and their terminal pagination. Service/catalog coverage, camera accuracy, visible surfaces, physical calibration, scale, pedestrian floor and lighting remain unverified."}
    return result


def audit():
    inventory = json.loads((CACHE / "collection-inventory.json").read_text())
    result = calculate_audit(CACHE, inventory)
    store(CACHE / "findings.json", result)
    print(json.dumps({"records": len(result["records"]), "groups": result["groups"]}, indent=2))


def images():
    from PIL import Image

    findings = json.loads((CACHE / "findings.json").read_text())
    selected = [row for row in findings["records"] if row["collection"] == "cf65c61d-2a42-452d-8095-a1daee44e6a9"
        and row["rank"] in [68, 69, 70, 71]]
    selected.sort(key=lambda row: row["rank"])
    assert [row["rank"] for row in selected] == [68, 69, 70, 71]
    decoded = []
    for row in selected:
        assert row["license"] == "CC-BY-SA-4.0"
        assert row["projection"] == "equirectangular" and row["camera"]["field_of_view"] == 360
        assert row["camera"]["sensor_array_dimensions"] == [6080, 3040]
        request("intake/" + row["id"] + ".json", row["source"])
        for resolution in ["hd", "sd"]:
            filename = "intake/" + row["id"] + "-" + resolution + ".jpg"
            data = request(filename, row["assets"][resolution]["href"], decode_json=False)
            with Image.open(CACHE / filename) as image:
                dimensions = image.size
                image.verify()
            assert dimensions == ((6080, 3040) if resolution == "hd" else (2048, 1024))
            decoded.append({"file": filename, "dimensions": list(dimensions), "bytes": len(data), "sha256": sha(data)})
    store(CACHE / "intake/selected.json", selected)
    store(CACHE / "intake/decoded-images.json", decoded)
    print(json.dumps({"selected": len(selected), "decodedImages": len(decoded)}))


def selection():
    destination = EVIDENCE / "selection"
    destination.mkdir(parents=True, exist_ok=True)
    selected = json.loads((CACHE / "intake/selected.json").read_text())
    for name in ["selected.json", "decoded-images.json"]:
        shutil.copyfile(CACHE / "intake" / name, destination / name)
    for row in selected:
        for suffix in [".json", "-hd.jpg", "-sd.jpg"]:
            source = CACHE / "intake" / (row["id"] + suffix)
            receipt = json.loads(source.with_name(source.name + ".receipt.json").read_text())
            assert sha(source.read_bytes()) == receipt["sha256"] and source.stat().st_size == receipt["bytes"]
            shutil.copyfile(source.with_name(source.name + ".receipt.json"), destination / (source.name + ".receipt.json"))
            if suffix == ".json":
                (destination / (source.name + ".gz")).write_bytes(gzip.compress(source.read_bytes(), mtime=0))
            elif suffix == "-sd.jpg":
                shutil.copyfile(source, destination / source.name)
    print(json.dumps({"selection": str(destination / "selected.json"), "sourceImages": len(selected)}))


def plot():
    os.environ.setdefault("MPLCONFIGDIR", str(CACHE / "matplotlib"))
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Circle
    from PIL import Image

    plt.rcParams.update({"svg.hashsalt": "connector-source-intake", "font.family": "DejaVu Sans"})
    selected = json.loads((EVIDENCE / "selection/selected.json").read_text())
    previous = json.loads((PREVIOUS / "records/selected.json").read_text())
    findings = json.loads((CACHE / "findings.json").read_text())
    geo, project, inverse, geographic, lines = geography()
    start = list(lines[0].coords)[0]
    figure, axes = plt.subplots(1, 2, figsize=(13, 5), gridspec_kw={"width_ratios": [1.8, 1]})
    for axis in axes:
        for ordinal, line in enumerate(lines):
            x, y = line.xy
            axis.plot([value - start[0] for value in x], [value - start[1] for value in y], color="#267f80", linewidth=2.3,
                label="Approved 54-edge route" if ordinal == 0 else None)
        nearby = [row for row in findings["records"] if row["routeDistanceMetres"] <= 100]
        positions = [project.transform(*row["coordinates"][:2]) for row in nearby]
        axis.scatter([point[0] - start[0] for point in positions], [point[1] - start[1] for point in positions],
            s=8, color="#98a2b3", alpha=0.45, label="Audited metadata positions")
        for rows, color, label in [(previous, "#bf7431", "19 Feb: original 3 HD photos"), (selected, "#6b42b3", "17 Feb: newly acquired 4 HD photos")]:
            points = [project.transform(*row["coordinates"][:2]) for row in rows]
            axis.scatter([point[0] - start[0] for point in points], [point[1] - start[1] for point in points],
                s=35, color=color, edgecolors="white", linewidths=0.6, zorder=5, label=label)
        axis.scatter([0], [0], marker="*", s=130, color="#1b3a42", zorder=6, label="Route start")
        axis.set_aspect("equal")
        axis.set_xlabel("East from route start (m)")
        axis.set_ylabel("North from route start (m)")
        axis.grid(alpha=0.2)
    axes[0].set_title("Full 1,353.444 m route · source camera metadata")
    axes[0].set_xlim(-100, 1180)
    axes[0].set_ylim(-150, 250)
    axes[0].legend(loc="upper left", fontsize=8)
    axes[1].set_title("Crossing detail · circles show declared 4 m accuracy")
    axes[1].set_xlim(-70, 45)
    axes[1].set_ylim(-60, 55)
    for row in selected:
        x, y = project.transform(*row["coordinates"][:2])
        axes[1].add_patch(Circle((x - start[0], y - start[1]), row["horizontalAccuracyMetres"], fill=False, color="#6b42b3", alpha=0.6))
    figure.text(0.5, 0.015, "Positions describe source metadata. Visible surfaces, pedestrian geometry and eastbound coverage remain unqualified.", ha="center", fontsize=9)
    figure.tight_layout(rect=[0, 0.045, 1, 1])
    figure.savefig(EVIDENCE / "coverage.svg", metadata={"Date": None})
    plt.close(figure)
    figure, axes = plt.subplots(2, 2, figsize=(12, 6.8))
    for axis, row in zip(axes.flat, selected):
        with Image.open(EVIDENCE / "selection" / (row["id"] + "-sd.jpg")) as image:
            axis.imshow(image)
        axis.set_axis_off()
        axis.set_title(f"Rank {row['rank']} · {row['date'][11:19]} UTC · {row['routeDistanceMetres']:.1f} m from route start", fontsize=10)
    figure.suptitle("17 February 2026 · Irvin Chen / Panoramax Taiwan · CC BY-SA 4.0", fontsize=13)
    figure.text(0.5, 0.015, "Source panoramas displayed at reduced size. Visual surfaces and reconstruction geometry require separate review.", ha="center", fontsize=9)
    figure.tight_layout(rect=[0, 0.03, 1, 0.95])
    figure.savefig(EVIDENCE / "contact-sheet.webp", dpi=130)
    plt.close(figure)


def retain():
    selection()
    inventory = json.loads((CACHE / "collection-inventory.json").read_text())
    catalog = json.loads((CACHE / "catalog.json").read_text())
    raw_names = [page["file"] for page in catalog["pages"]]
    for collection in inventory["collections"]:
        raw_names.append(collection["metadata"])
        raw_names.extend(page["file"] for page in collection["pages"])
    for name in raw_names:
        source = CACHE / name
        receipt = json.loads(source.with_name(source.name + ".receipt.json").read_text())
        data = source.read_bytes()
        assert sha(data) == receipt["sha256"] and len(data) == receipt["bytes"]
        destination = EVIDENCE / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.with_name(destination.name + ".gz").write_bytes(gzip.compress(data, mtime=0))
        shutil.copyfile(source.with_name(source.name + ".receipt.json"), destination.with_name(destination.name + ".receipt.json"))
    for name in ["catalog.json", "collection-selection.json", "collection-inventory.json"]:
        shutil.copyfile(CACHE / name, EVIDENCE / name)
    findings = json.loads((CACHE / "findings.json").read_text())
    (EVIDENCE / "all-records.json.gz").write_bytes(gzip.compress((CACHE / "findings.json").read_bytes(), mtime=0))
    selected = json.loads((EVIDENCE / "selection/selected.json").read_text())
    summary = {key: value for key, value in findings.items() if key != "records"}
    summary.update({"catalogCollections": len(catalog["collections"]), "completeLocalCollections": len(inventory["collections"]),
        "recordsAudited": len(findings["records"]), "newMetadataRecords": sum(not row["alreadyInBoundedQuery"] for row in findings["records"]),
        "routeCamerasWithin50Metres": sum(row["routeDistanceMetres"] <= 50 for row in findings["records"]),
        "newRouteCamerasWithin50Metres": sum(row["routeDistanceMetres"] <= 50 and not row["alreadyInBoundedQuery"] for row in findings["records"]),
        "newlyAcquiredHdImages": len(selected), "selected": selected,
        "selectedDeclaredSpacingMetres": [pair["declaredCameraSpacingMetres"] for group in findings["groups"] if group["id"] == selected[0]["collection"]
            for pair in group["nearbyConsecutivePairs"] if set(pair["ids"]).issubset({row["id"] for row in selected})]})
    store(EVIDENCE / "findings.json", summary)
    references = EVIDENCE / "references"
    references.mkdir(exist_ok=True)
    for name in ["license.html.gz", "license.html.receipt.json", "api-openapi.json.gz", "api-openapi.json.receipt.json"]:
        shutil.copyfile(PREVIOUS / "records" / name, references / name)
    producer = EVIDENCE / "producer"
    producer.mkdir(exist_ok=True)
    shutil.copyfile(Path(__file__), producer / "intake.py")
    plot()
    dates = [json.loads((CACHE / name).with_name(Path(name).name + ".receipt.json").read_text())["date"] for name in raw_names]
    records = []
    for path in sorted(EVIDENCE.rglob("*")):
        if not path.is_file() or path.name == "manifest.json":
            continue
        data = path.read_bytes()
        relative = str(path.relative_to(EVIDENCE))
        row = {"file": relative, "bytes": len(data), "sha256": sha(data),
            "source": "Retained Panoramax responses and approved repository route", "date": max(dates),
            "rights": "Source declarations retained per record; selected photographs CC BY-SA 4.0, Irvin Chen",
            "location": "Kyoto, Japan; approved Shijo east route and nearby collection extents",
            "method": "Unchanged source bytes or reproducible metadata analysis; producer/intake.py",
            "limitations": "Dated local collection coverage only. Position metadata supplies no surface or geometry acceptance."}
        if path.suffix == ".gz":
            raw = gzip.decompress(data)
            row.update({"uncompressedBytes": len(raw), "uncompressedSha256": sha(raw)})
        source_name = path.name[:-3] if path.suffix == ".gz" else path.name
        receipt_path = path.with_name(source_name + ".receipt.json")
        if receipt_path.exists():
            receipt = json.loads(receipt_path.read_text())
            row.update({"source": receipt["url"], "date": receipt["date"], "acquisitionReceipt": str(receipt_path.relative_to(EVIDENCE))})
        elif path.name.endswith(".receipt.json"):
            receipt = json.loads(data)
            row.update({"source": receipt["url"], "date": receipt["date"], "method": "Exact acquisition receipt for the named source response"})
        if relative == "producer/intake.py":
            row.update({"source": "experience/tools/connector-source-intake/intake.py", "rights": "Repository code; image licenses remain separate"})
        records.append(row)
    store(EVIDENCE / "manifest.json", {"schemaVersion": 1, "generatedUtc": datetime.now(timezone.utc).isoformat(),
        "routeQualified": False, "selectedPhotographer": "Irvin Chen", "license": "CC-BY-SA-4.0", "records": records})
    print(json.dumps({"retainedFiles": len(records), "bytes": sum(row["bytes"] for row in records)}))


def verify():
    from PIL import Image

    manifest = json.loads((EVIDENCE / "manifest.json").read_text())
    assert manifest["routeQualified"] is False
    for row in manifest["records"]:
        path = EVIDENCE / row["file"]
        assert path.resolve().is_relative_to(EVIDENCE.resolve())
        data = path.read_bytes()
        assert len(data) == row["bytes"] and sha(data) == row["sha256"], row["file"]
        for key in ["source", "date", "rights", "location", "method", "limitations"]:
            assert row[key]
        if path.suffix == ".gz":
            data = gzip.decompress(data)
            assert len(data) == row["uncompressedBytes"] and sha(data) == row["uncompressedSha256"]
        if row.get("acquisitionReceipt"):
            receipt = json.loads((EVIDENCE / row["acquisitionReceipt"]).read_text())
            assert sha(data) == receipt["sha256"] and len(data) == receipt["bytes"]
            assert receipt["status"] == 200 and receipt["url"] == row["source"]
    assert (EVIDENCE / "producer/intake.py").read_bytes() == Path(__file__).read_bytes()
    inventory = json.loads((EVIDENCE / "collection-inventory.json").read_text())
    selection_rules = json.loads((EVIDENCE / "collection-selection.json").read_text())
    catalog = json.loads((EVIDENCE / "catalog.json").read_text())
    geod = Geod(ellps="WGS84")
    expected = []
    for row in catalog["collections"]:
        diagonals = [geod.inv(*box[:4])[2] for box in row["extent"]["spatial"]["bbox"]]
        if all(value <= selection_rules["maximumLocalExtentDiagonalMetres"] for value in diagonals):
            expected.append(row["id"])
    assert sorted(expected) == sorted(row["id"] for row in inventory["collections"])
    assert inventory["completed"] and len(expected) == 9
    assert len(catalog["collections"]) == 14
    catalog_records = []
    for page in catalog["pages"]:
        catalog_records.extend(json.loads(read_source(EVIDENCE, page["file"]))["collections"])
    assert catalog_records == catalog["collections"]
    geo, project, inverse, geographic, lines = geography()
    bounds = transform(inverse.transform, unary_union(lines).buffer(100)).bounds
    query = urllib.parse.parse_qs(urllib.parse.urlparse(catalog["pages"][0]["url"]).query)
    assert list(map(float, query["bbox"][0].split(","))) == list(bounds)
    assert query["limit"] == ["1000"]
    for pages, field in [(catalog["pages"], "collections")] + [(row["pages"], "features") for row in inventory["collections"]]:
        identifiers = []
        for index, page in enumerate(pages):
            raw = json.loads(read_source(EVIDENCE, page["file"]))
            identifiers.extend(row["id"] for row in raw[field])
            assert page["count"] == len(raw[field])
            links = [link["href"] for link in raw.get("links", []) if link["rel"] == "next"]
            assert links == ([page["next"]] if page["next"] else [])
            if index + 1 < len(pages):
                assert urllib.parse.urljoin(page["url"], page["next"]) == pages[index + 1]["url"]
            else:
                assert page["next"] is None
        assert len(identifiers) == len(set(identifiers))
    for collection in inventory["collections"]:
        metadata = json.loads(read_source(EVIDENCE, collection["metadata"]))
        assert metadata["stats:items"]["count"] == collection["metadataPictureCount"] == collection["recordCount"]
        assert sorted(collection["ranks"]) == list(range(1, collection["recordCount"] + 1))
        actual_ranks = [item["properties"]["geovisio:rank_in_collection"] for page in collection["pages"]
            for item in json.loads(read_source(EVIDENCE, page["file"]))["features"]]
        assert actual_ranks == collection["ranks"]
    recomputed = calculate_audit(EVIDENCE, inventory)
    retained = json.loads(gzip.decompress((EVIDENCE / "all-records.json.gz").read_bytes()))
    assert recomputed == retained
    assert len(retained["records"]) == 3076
    assert sum(not row["alreadyInBoundedQuery"] for row in retained["records"]) == 2923
    assert sum(row["routeDistanceMetres"] <= 50 and not row["alreadyInBoundedQuery"] for row in retained["records"]) == 0
    summary = json.loads((EVIDENCE / "findings.json").read_text())
    for key in ["groups", "routeMetres", "routeEdges", "routeSha256", "previousFindingsSha256", "routeQualified"]:
        assert summary[key] == retained[key]
    assert summary["recordsAudited"] == 3076 and summary["newMetadataRecords"] == 2923
    assert summary["routeCamerasWithin50Metres"] == 45 and summary["newRouteCamerasWithin50Metres"] == 0
    selected = json.loads((EVIDENCE / "selection/selected.json").read_text())
    assert summary["selected"] == selected and summary["newlyAcquiredHdImages"] == len(selected)
    assert [row["rank"] for row in selected] == [68, 69, 70, 71]
    for row in selected:
        assert row in retained["records"] and math.isfinite(row["routeDistanceMetres"])
        assert row["firstEdgeChainageMetres"] == 0 and row["nearestEdgeOrdinal"] == 1
        raw = json.loads(read_source(EVIDENCE / "selection", row["id"] + ".json"))
        assert raw["id"] == row["id"] and raw["properties"]["license"] == row["license"] == "CC-BY-SA-4.0"
        assert raw["geometry"]["coordinates"] == row["coordinates"] and raw["providers"] == row["providers"]
        assert raw["properties"]["datetime"] == row["date"]
        assert raw["properties"]["pers:interior_orientation"] == row["camera"]
        assert row["camera"]["sensor_array_dimensions"] == [6080, 3040] and row["camera"]["field_of_view"] == 360
        assert row["projection"] == "equirectangular" and row["horizontalAccuracyMetres"] == 4.0
        for resolution in ["hd", "sd"]:
            receipt = json.loads((EVIDENCE / "selection" / (row["id"] + "-" + resolution + ".jpg.receipt.json")).read_text())
            assert receipt["url"] == raw["assets"][resolution]["href"]
            decoded = next(image for image in json.loads((EVIDENCE / "selection/decoded-images.json").read_text()) if image["file"] == "intake/" + row["id"] + "-" + resolution + ".jpg")
            assert decoded["bytes"] == receipt["bytes"] and decoded["sha256"] == receipt["sha256"]
        with Image.open(EVIDENCE / "selection" / (row["id"] + "-sd.jpg")) as image:
            assert image.size == (2048, 1024)
            image.verify()
    print(json.dumps({"verifiedFiles": len(manifest["records"]), "collectionRecords": len(retained["records"]),
        "routeEdges": retained["routeEdges"], "selectedImages": len(selected), "newEastboundCoverageQualified": False}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["acquire", "collections", "audit", "images", "selection", "plot", "retain", "verify"])
    arguments = parser.parse_args()
    {"acquire": acquire, "collections": collections, "audit": audit, "images": images, "selection": selection,
        "plot": plot, "retain": retain, "verify": verify}[arguments.mode]()
