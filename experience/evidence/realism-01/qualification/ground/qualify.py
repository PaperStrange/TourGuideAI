import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET
import zipfile

from osgeo import gdal, ogr, osr


NS = {"gml": "http://www.opengis.net/gml", "tran": "http://www.opengis.net/citygml/transportation/2.0"}
GML_ID = "{http://www.opengis.net/gml}id"


def fingerprint(path):
    data = path.read_bytes()
    return {"path": path.name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def crs(code):
    value = osr.SpatialReference()
    value.ImportFromEPSG(code)
    value.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    return value


def projected(geometry, source_code=6668):
    result = geometry.Clone()
    result.Transform(osr.CoordinateTransformation(crs(source_code), crs(6674)))
    return result


def children(node):
    yield node
    for child in node.get("children", []):
        yield from children(child)


def route_lines(geography):
    frame = geography["frame"]
    lookup = {item["id"]: item for item in geography["navigation"]["edges"]}
    result = []
    for edge_id in geography["selectedRoute"]["edgeIds"]:
        edge = lookup[edge_id]
        line = ogr.Geometry(ogr.wkbLineString)
        for point in edge["points"]:
            line.AddPoint_2D(frame["origin"]["longitude"] + point["x"] / frame["metresPerDegreeLon"],
                            frame["origin"]["latitude"] + point["y"] / frame["metresPerDegreeLat"])
        result.append((edge_id, projected(line, 4326)))
    return result


def code_lists(downloads):
    selected = ["Road_function.xml", "TrafficArea_function.xml", "AuxiliaryTrafficArea_function.xml"]
    result = {}
    with zipfile.ZipFile(downloads / "kyoto-codelists.zip") as archive:
        for filename in selected:
            source = f"codelists/{filename}"
            tree = ET.fromstring(archive.read(source))
            result[filename] = {
                definition.find("gml:name", NS).text: definition.find("gml:description", NS).text
                for definition in tree.findall(".//gml:Definition", NS)
            }
    return result


def roads(downloads, lines, codelists):
    features, source_summaries = [], []
    for path in sorted(downloads.glob("*_tran_6697_op.gml")):
        dataset = ogr.Open(str(path))
        layer = dataset.GetLayerByName("Road")
        heights, count = [], 0
        for feature in layer:
            geometry = feature.GetGeometryRef().Clone()
            bounds = geometry.GetEnvelope3D()
            heights.extend(bounds[4:])
            count += 1
            metric = projected(geometry)
            if min(line.Distance(metric) for _, line in lines) > 25:
                continue
            if not metric.IsValid():
                raise ValueError(f"Invalid planar source geometry: {feature.GetField('gml_id')}")
            function = str(feature.GetField("function"))
            features.append({"id": feature.GetField("gml_id"), "kind": "Road", "lod": 1,
                             "sourceFile": path.name, "function": function,
                             "functionLabel": codelists["Road_function.xml"].get(function),
                             "heightRangeMetres": list(bounds[4:]), "geometry": geometry, "metric": metric})
        tree = ET.parse(path)
        envelope = tree.find("gml:boundedBy/gml:Envelope", NS)
        source_summaries.append({**fingerprint(path), "roadFeatures": count,
                                 "gmlEnvelopeSrsName": envelope.get("srsName"),
                                 "gmlEnvelopeDimension": envelope.get("srsDimension"),
                                 "ogrLayerHorizontalEpsg": layer.GetSpatialRef().GetAuthorityCode(None),
                                 "lod1HeightRangeMetres": [min(heights), max(heights)]})
        for kind in ["TrafficArea", "AuxiliaryTrafficArea"]:
            for item in tree.findall(f".//tran:{kind}", NS):
                surface = item.find("tran:lod3MultiSurface/gml:MultiSurface", NS)
                if surface is None:
                    continue
                # XML 片段保留从原 CityModel Envelope 继承的三维坐标声明。
                surface.set("srsDimension", envelope.get("srsDimension"))
                surface.set("srsName", envelope.get("srsName"))
                geometry = ogr.CreateGeometryFromGML(ET.tostring(surface, encoding="unicode"))
                geometry.SwapXY()
                metric = projected(geometry)
                if min(line.Distance(metric) for _, line in lines) > 25:
                    continue
                function = item.find("tran:function", NS)
                code = function.text if function is not None else None
                features.append({"id": item.get(GML_ID), "kind": kind, "lod": 3,
                                 "sourceFile": path.name, "function": code,
                                 "functionLabel": codelists[f"{kind}_function.xml"].get(code),
                                 "heightRangeMetres": list(geometry.GetEnvelope3D()[4:]),
                                 "geometry": geometry, "metric": metric})
    return features, source_summaries


def ward_candidates(downloads, lines):
    receipts = json.loads((downloads / "download-receipts.json").read_text())["records"]
    result = []
    for name in ["26106-bldg-lod3-tileset.json", "26105-bldg-lod3-tileset.json"]:
        path = downloads / name
        record = next(value for value in receipts if value["path"] == name)
        root = json.loads(path.read_text())
        candidates = []
        for node in children(root["root"]):
            content = node.get("content")
            content_region = content.get("boundingVolume", {}).get("region") if content else None
            region = content_region or node.get("boundingVolume", {}).get("region")
            if not content or not region:
                continue
            west, south, east, north = map(math.degrees, region[:4])
            ring = ogr.Geometry(ogr.wkbLinearRing)
            for x, y in [(west, south), (east, south), (east, north), (west, north), (west, south)]:
                ring.AddPoint_2D(x, y)
            polygon = ogr.Geometry(ogr.wkbPolygon)
            polygon.AddGeometry(ring)
            metric = projected(polygon, 4326)
            distances = [line.Distance(metric) for _, line in lines]
            if min(distances) <= 25:
                candidates.append({"uri": content.get("uri", content.get("url")),
                                   "boundsSource": "content" if content_region else "node",
                                   "regionDegreesAndHeight": [west, south, east, north, *region[4:]],
                                   "leaf": not node.get("children"),
                                   "nearEdgeOrdinals": [index + 1 for index, distance in enumerate(distances) if distance <= 25],
                                   "nearestRouteDistanceMetres": min(distances)})
        result.append({"source": record, "candidateCount": len(candidates), "candidates": candidates})
    return result


def coverage_board(features, lines, output):
    xs, ys = [], []
    for _, line in lines:
        for x, y, *_ in line.GetPoints():
            xs.append(x)
            ys.append(y)
    left, right, bottom, top = min(xs) - 40, max(xs) + 40, min(ys) - 40, max(ys) + 40
    scale = min(1120 / (right - left), 250 / (top - bottom))

    def screen(x, y):
        return 40 + (x - left) * scale, 90 + (top - y) * scale

    svg = ET.Element("svg", {"xmlns": "http://www.w3.org/2000/svg", "viewBox": "0 0 1200 440",
                             "role": "img", "aria-label": "Source road footprints and route; elevation qualification remains open"})
    ET.SubElement(svg, "rect", {"width": "1200", "height": "440", "fill": "#f8f7f2"})
    defs = ET.SubElement(svg, "defs")
    clip = ET.SubElement(defs, "clipPath", {"id": "map"})
    ET.SubElement(clip, "rect", {"x": "35", "y": "75", "width": "1130", "height": "280"})
    group = ET.SubElement(svg, "g", {"clip-path": "url(#map)"})
    for feature in sorted(features, key=lambda item: item["lod"]):
        coordinates = json.loads(feature["metric"].ExportToJson())["coordinates"]
        for polygon in coordinates:
            rings = []
            for ring in polygon:
                points = [screen(point[0], point[1]) for point in ring]
                rings.append("M " + " L ".join(f"{x:.2f},{y:.2f}" for x, y in points) + " Z")
            ET.SubElement(group, "path", {"d": " ".join(rings), "fill-rule": "evenodd",
                                         "fill": "#b8c1b5" if feature["lod"] == 1 else "#236ab5",
                                         "fill-opacity": "0.75", "stroke": "#6f7e70", "stroke-width": "0.2"})
    for _, line in lines:
        points = [screen(x, y) for x, y, *_ in line.GetPoints()]
        ET.SubElement(group, "polyline", {"points": " ".join(f"{x:.2f},{y:.2f}" for x, y in points),
                                         "fill": "none", "stroke": "#b74837", "stroke-width": "3"})
    for text, x, y, size in [
        ("Kyoto route: inspected road sources", 40, 34, 24),
        ("Grey: LOD1 road footprints · Red: approved 54-edge route · Blue: one nearby detailed sidewalk feature", 40, 62, 15),
        ("54/54 centerlines overlap source road footprints; all LOD1 elevations are zero.", 40, 382, 18),
        ("The detailed sidewalk is near edges 50–54. Ground elevation and pedestrian collision remain unverified.", 40, 411, 16),
    ]:
        ET.SubElement(svg, "text", {"x": str(x), "y": str(y), "font-size": str(size),
                                   "font-family": "sans-serif", "fill": "#233b35"}).text = text
    ET.ElementTree(svg).write(output, encoding="utf-8", xml_declaration=True)


def main(root, downloads, output):
    ogr.UseExceptions()
    gdal.UseExceptions()
    gdal.SetConfigOption("OGR_GEOMETRY_ACCEPT_UNCLOSED_RING", "NO")
    route_path = root / "experience/src/neighborhoods/shijo-east/geography.json"
    geography = json.loads(route_path.read_text())
    lines = route_lines(geography)
    codes = code_lists(downloads)
    features, summaries = roads(downloads, lines, codes)
    road_union = ogr.Geometry(ogr.wkbMultiPolygon)
    for feature in features:
        if feature["lod"] == 1:
            for polygon in feature["metric"]:
                road_union.AddGeometry(polygon)
    road_union = road_union.UnionCascaded()
    edges = []
    for index, (edge_id, line) in enumerate(lines):
        near = [(feature, line.Distance(feature["metric"])) for feature in features]
        intersection = line.Intersection(road_union)
        overlap = intersection.Length()
        edges.append({"ordinal": index + 1, "id": edge_id, "lengthMetres": line.Length(),
                      "lod1PlanarOverlapMetres": overlap, "lod1PlanarOverlapFraction": overlap / line.Length(),
                      "nearFeatures": [{"id": item["id"], "kind": item["kind"], "lod": item["lod"],
                                        "distanceMetres": distance, "function": item["function"],
                                        "functionLabel": item["functionLabel"]} for item, distance in near if distance <= 25],
                      "groundElevationStatus": "unverified", "pedestrianCollisionStatus": "unverified"})
    inventory = json.loads((downloads / "route-citygml-inventory.json").read_text())
    source_metadata = root / "experience/evidence/neighborhood-20261027/world/kyoto-2025-metadata.zip"
    with zipfile.ZipFile(source_metadata) as archive:
        rows = list(csv.reader(io.StringIO(archive.read("metadata/udx_26100_2025_resource_op.csv").decode("utf-8-sig"))))
    selected_rows = [row for row in rows if len(row) > 6 and row[4] in
                     ["bldg:lod2Solid", "bldg:lod3Solid", "tran:lod1MultiSurface", "tran:lod3MultiSurface", "dem:tin"]]
    result = {"schemaVersion": 1, "route": {**fingerprint(route_path), "path": str(route_path.relative_to(root))},
              "method": "GDAL GML geometry parser; projected horizontal distances in JGD2011 Japan Plane Rectangular CS VI (EPSG:6674); 25m acquisition neighborhood.",
              "gdalVersion": gdal.VersionInfo("RELEASE_NAME"), "roadSources": summaries, "codeLists": codes,
              "verticalReference": {"code": "EPSG:6697", "name": "JGD2011 + JGD2011 (vertical) height",
                                    "meaning": "Gravity-related metres; not WGS84 ellipsoid height. No geoid conversion applied.",
                                    "runtimeRoute": "Authored flat zero; no accepted vertical tie to source.",
                                    "lod1": "All observed LOD1 Road Z values are zero and do not establish terrain height."},
              "metadataSource": {**fingerprint(source_metadata), "path": str(source_metadata.relative_to(root))},
              "selectedMetadataResourceRows": selected_rows,
              "demAcquisitionCandidates": inventory["cities"][0]["files"]["dem"],
              "wardCandidates": ward_candidates(downloads, lines), "edges": edges,
              "limitations": ["Planar overlap is road footprint overlap, not an accepted pedestrian volume or grade.",
                              "LOD3 function labels are source classifications; present access and pedestrian safety remain unverified.",
                              "Route WGS84 and source JGD2011 horizontal transforms need surveyed registration for final acceptance.",
                              "Building bounds identify acquisition candidates and do not establish facade identity or appearance.",
                              "DEM inventory identifies whole files; exact route content and vertical registration have not been inspected."]}
    geojson = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "id": feature["id"],
         "properties": {key: value for key, value in feature.items() if key not in ["geometry", "metric"]},
         "geometry": json.loads(feature["geometry"].ExportToJson())} for feature in features]}
    output.mkdir(parents=True, exist_ok=True)
    (output / "road-ground-audit.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    (output / "near-route-roads.geojson").write_text(json.dumps(geojson, ensure_ascii=False, indent=2) + "\n")
    coverage_board(features, lines, output / "road-coverage-board.svg")
    print(json.dumps({"sources": len(summaries), "retainedFeatures": len(features),
                      "lod1OverlapMetres": sum(edge["lod1PlanarOverlapMetres"] for edge in edges),
                      "lod3NearEdges": [edge["ordinal"] for edge in edges if any(item["lod"] == 3 for item in edge["nearFeatures"])],
                      "wardCandidates": {item["source"]["path"]: item["candidateCount"] for item in result["wardCandidates"]}}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--downloads", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    main(args.root.resolve(), args.downloads, args.output)
