import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import json
from pathlib import Path
import resource
import time
import xml.etree.ElementTree as ET

from osgeo import gdal, ogr, osr
import requests


GML = "{http://www.opengis.net/gml}"
DEM = "{http://www.opengis.net/citygml/relief/2.0}"


def fingerprint(path):
    digest = hashlib.sha256()
    size = 0
    with path.open("rb") as stream:
        while block := stream.read(1024 * 1024):
            digest.update(block)
            size += len(block)
    return {"bytes": size, "sha256": digest.hexdigest()}


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def acquire(root, cache):
    audit_path = root / "experience/evidence/realism-01/qualification/dem/dem-envelope-audit.json"
    audit = json.loads(audit_path.read_text())
    source = audit["smallestCoveringEnvelope"]
    cache.mkdir(parents=True, exist_ok=True)
    target, receipt_path = cache / "original.gml.gz", cache / "receipt.json"
    if receipt_path.exists():
        receipt = json.loads(receipt_path.read_text())
        if receipt["source"] != source["source"] or fingerprint(target) != receipt["encoded"]:
            raise ValueError("Terrain cache differs from retained receipt")
        return receipt
    limit = 64 * 1024 ** 2
    count = 0
    with requests.get(source["source"], headers={"Accept-Encoding": "gzip", "Cache-Control": "no-cache",
                      "User-Agent": "TourGuideAI-terrain-qualification/1.0"}, stream=True, timeout=60) as response:
        response.raise_for_status()
        if response.status_code != 200 or response.headers.get("Content-Encoding") != "gzip":
            raise ValueError("Terrain experiment requires a complete gzip-encoded response within its transfer budget")
        with target.open("wb") as output:
            for block in response.raw.stream(1024 * 1024, decode_content=False):
                count += len(block)
                if count > limit:
                    raise ValueError("Terrain encoded transfer exceeds 64 MiB")
                output.write(block)
        receipt = {"date": datetime.now(timezone.utc).isoformat(), "source": source["source"],
            "rights": "Kyoto City / MLIT Project PLATEAU, CC BY 4.0", "location": "Kyoto mesh 523546",
            "method": "Complete original HTTPS gzip response; encoded bytes preserved, TLS/proxy unchanged",
            "limitations": "Source acquisition only; terrain is distinct from pedestrian floor, bridge deck and current access",
            "encoded": fingerprint(target), "contentEncoding": "gzip", "status": response.status_code,
            "declaredDecodedBytes": source["declaredFileBytes"], "encodedLimitBytes": limit,
            "decodedLimitBytes": 900 * 1024 ** 2, "selection": {"path": str(audit_path.relative_to(root)), **fingerprint(audit_path)}}
    write_json(receipt_path, receipt)
    return receipt


class DecodedReader:
    def __init__(self, stream, limit):
        self.stream, self.limit = stream, limit
        self.bytes = 0
        self.digest = hashlib.sha256()

    def read(self, size):
        block = self.stream.read(size)
        self.bytes += len(block)
        if self.bytes > self.limit:
            raise ValueError("Decoded terrain exceeds the declared 900 MiB experiment budget")
        self.digest.update(block)
        return block


def coordinate_system(code):
    result = osr.SpatialReference()
    result.ImportFromEPSG(code)
    result.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    return result


def extract(root, cache, output):
    gdal.UseExceptions()
    ogr.UseExceptions()
    started = time.monotonic()
    receipt = json.loads((cache / "receipt.json").read_text())
    if fingerprint(cache / "original.gml.gz") != receipt["encoded"]:
        raise ValueError("Terrain source identity differs")
    geography_path = root / "experience/src/neighborhoods/shijo-east/geography.json"
    geography = json.loads(geography_path.read_text())
    source_crs, metric_crs = coordinate_system(6668), coordinate_system(6674)
    project = osr.CoordinateTransformation(source_crs, metric_crs)
    route_project = osr.CoordinateTransformation(coordinate_system(4326), metric_crs)
    frame = geography["frame"]
    lookup = {edge["id"]: edge for edge in geography["navigation"]["edges"]}
    route = ogr.Geometry(ogr.wkbMultiLineString)
    for edge_id in geography["selectedRoute"]["edgeIds"]:
        line = ogr.Geometry(ogr.wkbLineString)
        for point in lookup[edge_id]["points"]:
            line.AddPoint_2D(frame["origin"]["longitude"] + point["x"] / frame["metresPerDegreeLon"],
                             frame["origin"]["latitude"] + point["y"] / frame["metresPerDegreeLat"])
        route.AddGeometry(line)
    bounds = route.GetEnvelope()
    route.Transform(route_project)
    corridor = route.Buffer(25)
    features = []
    triangle_count = 0
    envelope = None
    with gzip.open(cache / "original.gml.gz", "rb") as compressed:
        reader = DecodedReader(compressed, receipt["decodedLimitBytes"])
        parents = []
        context = ET.iterparse(reader, events=["start", "end"])
        for event, element in context:
            if event == "start":
                parents.append(element)
                continue
            if element.tag == GML + "Envelope":
                if envelope is not None:
                    raise ValueError("Unexpected additional terrain envelope")
                envelope = {"srsName": element.get("srsName"), "srsDimension": element.get("srsDimension")}
                if envelope != {"srsName": "http://www.opengis.net/def/crs/EPSG/0/6697", "srsDimension": "3"}:
                    raise ValueError("Terrain CRS differs from retained envelope")
            elif element.tag == GML + "Triangle":
                if envelope is None:
                    raise ValueError("Terrain triangles precede the declared CRS")
                triangle_count += 1
                for key, value in envelope.items():
                    element.set(key, value)
                geometry = ogr.CreateGeometryFromGML(ET.tostring(element, encoding="unicode"))
                geometry.SwapXY()
                geometry = ogr.ForceToPolygon(geometry)
                west, east, south, north = geometry.GetEnvelope()
                if west <= bounds[1] + .0005 and east >= bounds[0] - .0005 and south <= bounds[3] + .0005 and north >= bounds[2] - .0005:
                    metric = geometry.Clone()
                    metric.Transform(project)
                    if metric.Intersects(corridor):
                        if not metric.IsValid() or metric.GetArea() <= 0:
                            raise ValueError(f"Invalid route terrain triangle: {triangle_count}")
                        owner = next(parent for parent in reversed(parents[:-1]) if parent.tag == DEM + "ReliefFeature")
                        features.append({"type": "Feature", "id": f"triangle-{triangle_count}",
                            "properties": {"sourceOrdinal": triangle_count, "reliefFeatureId": owner.get(GML + "id"),
                                "sourceMesh": owner.findtext(GML + "name"), "creationDate": owner.findtext("{http://www.opengis.net/citygml/2.0}creationDate"),
                                "heightDatum": "EPSG:6697 JGD2011 gravity-related height", "pedestrianFloorQualified": False},
                            "geometry": json.loads(geometry.ExportToJson())})
                if triangle_count % 200000 == 0:
                    print(json.dumps({"triangles": triangle_count, "retained": len(features), "decodedBytes": reader.bytes}), flush=True)
            if element.tag in [GML + "Triangle", DEM + "ReliefFeature"]:
                element.clear()
                parents[-2].remove(element)
            parents.pop()
        if reader.bytes != receipt["declaredDecodedBytes"]:
            raise ValueError("Full decoded terrain size differs from original inventory")
        decoded = {"bytes": reader.bytes, "sha256": reader.digest.hexdigest()}
    collection = {"type": "FeatureCollection", "coordinateSystem": "JGD2011 longitude/latitude; source gravity-related height in metres",
                  "features": features, "limitations": "Original terrain triangles only; no pedestrian-floor, bridge-deck, datum-transform or runtime acceptance"}
    write_json(output / "terrain-triangles.geojson", collection)
    report = {"schemaVersion": 1, "date": datetime.now(timezone.utc).isoformat(), "receipt": receipt,
        "decoded": decoded, "route": {"path": str(geography_path.relative_to(root)), **fingerprint(geography_path)},
        "sourceTriangles": triangle_count, "retainedTriangles": len(features), "corridorMetres": 25,
        "crs": envelope, "sourceHeightRangeMetres": [min(point[2] for feature in features for point in feature["geometry"]["coordinates"][0]),
                                                     max(point[2] for feature in features for point in feature["geometry"]["coordinates"][0])],
        "libraries": {"gdal": gdal.__version__, "xmlParser": "CPython ElementTree / Expat", "requests": requests.__version__},
        "elapsedSeconds": time.monotonic() - started, "processPeakRssBytes": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024,
        "method": "Streaming ElementTree XML parser, GDAL GML triangle parser with explicit 3D CRS/axis handling, horizontal EPSG:6674 route corridor selection",
        "limitations": collection["limitations"], "outputs": [{"path": "terrain-triangles.geojson", **fingerprint(output / "terrain-triangles.geojson")} ]}
    write_json(output / "terrain-extraction.json", report)
    print(json.dumps({key: report[key] for key in ["sourceTriangles", "retainedTriangles", "decoded", "elapsedSeconds", "processPeakRssBytes"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=["acquire", "extract"])
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    root, cache = args.root.resolve(), args.cache.resolve()
    if not cache.is_relative_to(root / "artifacts"):
        raise ValueError("Terrain originals must stay in ignored artifacts")
    if args.operation == "acquire":
        print(json.dumps(acquire(root, cache)))
    else:
        if args.output is None or not args.output.resolve().is_relative_to(root / "artifacts"):
            raise ValueError("Terrain experiment output must stay in ignored artifacts")
        extract(root, cache, args.output.resolve())
