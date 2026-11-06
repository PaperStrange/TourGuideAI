import argparse
import hashlib
import json
import math
from pathlib import Path
from urllib.parse import urljoin
from xml.etree import ElementTree

import pyproj
import shapely
from pyproj import Transformer
from shapely.geometry import LineString, Point, box
from shapely.ops import transform


def file_record(path, base):
    data = path.read_bytes()
    return {"path": str(path.relative_to(base)), "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest()}


def tile_contents(node, base_url, project):
    content = node.get("content")
    if content:
        region = content["boundingVolume"]["region"]
        west, south, east, north = map(math.degrees, region[:4])
        if not west <= east or not south <= north:
            raise ValueError("Unsupported wrapped bounding region")
        yield {"source": urljoin(base_url, content["uri"]),
               "boundsDegrees": [west, south, east, north],
               "leaf": not node.get("children"),
               "shape": transform(project, box(west, south, east, north))}
    for child in node.get("children", []):
        yield from tile_contents(child, base_url, project)


def write_board(audit, output):
    svg = ElementTree.Element("svg", {"xmlns": "http://www.w3.org/2000/svg",
                                      "viewBox": "0 0 1180 258", "role": "img"})
    ElementTree.SubElement(svg, "title").text = "54-edge source candidate index"
    ElementTree.SubElement(svg, "desc").text = (
        "Each column represents one route edge in order. Colored cells indicate nearby "
        "content bounding regions only. Appearance, ground and lighting remain unverified.")
    ElementTree.SubElement(svg, "rect", {"width": "1180", "height": "258", "fill": "#f8f7f2"})
    def label(x, y, value, size=13):
        ElementTree.SubElement(svg, "text", {"x": str(x), "y": str(y), "font-size": str(size),
                                            "font-family": "sans-serif", "fill": "#263b39"}).text = value
    label(20, 30, "54 route edges · nearby source candidates", 21)
    label(20, 53, "25 m search distance; equal-width edge columns; geometry and appearance acceptance remain open.")
    for row, category in enumerate(["building", "road", "furniture"]):
        label(20, 99 + row * 39, category.capitalize())
        for edge in audit["edges"]:
            count = len(edge["candidates"][category])
            ElementTree.SubElement(svg, "rect", {
                "x": str(145 + (edge["ordinal"] - 1) * 18), "y": str(79 + row * 39),
                "width": "16", "height": "28", "rx": "2",
                "fill": "#39746b" if count else "#e1ddd4"})
            if edge["ordinal"] == 1 or edge["ordinal"] % 5 == 0 or edge["ordinal"] == 54:
                if row == 2:
                    label(144 + (edge["ordinal"] - 1) * 18, 204, str(edge["ordinal"]), 10)
    label(20, 233, "Green: one or more content bounds within 25 m. Beige: none in these three retained collections.")
    ElementTree.ElementTree(svg).write(output, encoding="utf-8", xml_declaration=True)


def audit_sources(root, output):
    source_dir = root / "experience/evidence/realism-01/sources"
    geography_path = root / "experience/src/neighborhoods/shijo-east/geography.json"
    geography = json.loads(geography_path.read_text())
    inspection = json.loads((source_dir / "source-inspection.json").read_text())
    receipts = json.loads((root / "experience/evidence/neighborhood-20261027/world/source-receipts.json").read_text())
    origin = geography["origin"]
    local_crs = f"+proj=aeqd +lat_0={origin['latitude']} +lon_0={origin['longitude']} +datum=WGS84 +units=m"
    project = Transformer.from_crs("EPSG:4326", local_crs, always_xy=True).transform
    categories = {"building": "26104_bldg_lod3", "road": "26100_tran_lod3", "furniture": "26100_frn_lod3"}
    inputs, collections = [], {}
    for category, identity in categories.items():
        receipt = next(record for record in receipts["ignoredMetadataReads"] if record.get("id") == identity)
        path = source_dir / "metadata" / Path(receipt["file"]).name
        recorded = file_record(path, source_dir)
        if recorded["sha256"] != receipt["sha256"] or recorded["bytes"] != receipt["bytes"]:
            raise ValueError(f"Metadata receipt mismatch: {identity}")
        inputs.append({**recorded, "source": receipt["url"], "category": category})
        collections[category] = list(tile_contents(json.loads(path.read_text())["root"], receipt["url"], project))
    nodes = {node["id"]: node for node in geography["navigation"]["nodes"]}
    edges = {edge["id"]: edge for edge in geography["navigation"]["edges"]}
    inspected = {record["source"]: record for record in inspection["records"]}
    output_edges = []
    for index, identity in enumerate(geography["selectedRoute"]["edgeIds"]):
        edge = edges[identity]
        if len(edge["points"]) != 2:
            raise ValueError(f"Endpoint-only audit requires a straight route edge: {identity}")
        node_ids = geography["selectedRoute"]["nodeIds"][index:index + 2]
        line = LineString([project(nodes[node]["longitude"], nodes[node]["latitude"]) for node in node_ids])
        candidates = {}
        for category, tiles in collections.items():
            candidates[category] = []
            for tile in tiles:
                distance = line.distance(tile["shape"])
                if distance <= 25:
                    sample = inspected.get(tile["source"])
                    candidates[category].append({"source": tile["source"], "leaf": tile["leaf"],
                        "boundsDegrees": tile["boundsDegrees"], "boundsDistanceMetres": round(distance, 3),
                        "contentInspected": bool(sample),
                        "inspectedObjectIds": ([obj["id"] for obj in sample.get("objects", [])]
                                                or sample.get("objectIds", [])) if sample else []})
        nearby_objects = []
        for record in inspection["records"]:
            for obj in record.get("objects", []):
                distance = line.distance(Point(project(obj["longitude"], obj["latitude"])))
                if distance <= 25:
                    nearby_objects.append({"id": obj["id"], "tile": record["tile"], "lod": obj["lod"],
                                           "attributePointDistanceMetres": round(distance, 3)})
        output_edges.append({"ordinal": index + 1, "id": identity, "nodeIds": node_ids,
            "lengthMetres": edge["lengthMetres"], "candidates": candidates, "nearbyInspectedObjects": nearby_objects,
            "appearanceStatus": "unverified", "groundStatus": "unverified", "lightingStatus": "unverified"})
    result = {"schemaVersion": 1, "reviewedOn": "2026-11-05", "route": file_record(geography_path, root),
        "method": "Shapely distance from projected route-edge endpoints to each content bounding region, including non-leaf content; inspected object attribute points indexed separately.",
        "searchDistanceMetres": 25, "coordinateSystem": local_crs,
        "tools": {"pyproj": pyproj.__version__, "shapely": shapely.__version__}, "inputs": inputs,
        "limitations": ["Candidate bounds and object attribute points do not establish visible facade or pavement coverage.",
            "The building collection covers Nakagyo; opposite street sides in other wards require their own sources.",
            "Only the five retained sampled tiles have content inspection. All 54 edges still require walking-height, ground and lighting qualification.",
            "The fixed 25 m search distance is an acquisition index; distant sightlines and occluded surfaces require additional review."],
        "counts": {category: {"totalContentTiles": len(tiles),
            "edgesWithCandidateBounds": sum(bool(edge["candidates"][category]) for edge in output_edges),
            "edgesWithLeafCandidateBounds": sum(any(tile["leaf"] for tile in edge["candidates"][category]) for edge in output_edges),
            "uniqueCandidateTiles": len({tile["source"] for edge in output_edges for tile in edge["candidates"][category]})}
            for category, tiles in collections.items()}, "edges": output_edges}
    output.mkdir(parents=True, exist_ok=True)
    (output / "route-source-audit.json").write_text(json.dumps(result, indent=2) + "\n")
    write_board(result, output / "route-source-board.svg")
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    result = audit_sources(args.root.resolve(), args.output.resolve())
    print(json.dumps({"edgeCount": len(result["edges"]), "counts": result["counts"]}, indent=2))


if __name__ == "__main__":
    main()
