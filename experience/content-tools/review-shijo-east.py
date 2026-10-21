import argparse
import json
import math
from pathlib import Path

import networkx as nx
import pyproj


ORIGIN = {"longitude": 135.759719, "latitude": 35.003739}
GEOD = pyproj.Geod(ellps="WGS84")


def local(node):
    return ((node["lon"] - ORIGIN["longitude"]) * 91282.15,
            (node["lat"] - ORIGIN["latitude"]) * 110940.65)


def load_graph(path):
    data = json.loads(path.read_text())
    nodes = {item["id"]: item for item in data["elements"] if item["type"] == "node"}
    ways = {item["id"]: item for item in data["elements"] if item["type"] == "way"}
    graph = nx.Graph()
    for way in ways.values():
        tags = way.get("tags", {})
        highway = tags.get("highway")
        if highway not in ("footway", "pedestrian", "path", "living_street", "residential"):
            continue
        if tags.get("area") == "yes":
            continue
        if tags.get("access") in ("private", "no") or tags.get("foot") in ("private", "no"):
            continue
        if tags.get("tunnel") == "yes" or tags.get("indoor") == "yes" or tags.get("level", "0") != "0":
            continue
        if highway == "residential" and tags.get("name") != "高倉通":
            continue
        for start, end in zip(way["nodes"], way["nodes"][1:]):
            if start not in nodes or end not in nodes:
                raise ValueError(f"Incomplete highway way {way['id']}")
            a, b = nodes[start], nodes[end]
            distance = GEOD.inv(a["lon"], a["lat"], b["lon"], b["lat"])[2]
            graph.add_edge(start, end, distance=distance, wayId=way["id"])
    return data, nodes, ways, graph


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    data, nodes, ways, graph = load_graph(args.source)
    targets = [
        ("mitsui-frontage", 135.75998, 35.00376),
        ("takakura-shijo", 135.76247, 35.00379),
        ("nishiki-market", 135.76252, 35.00497),
        ("nishiki-tenmangu", 135.76710, 35.00503),
        ("shinkyogoku-shijo", 135.76710, 35.00387),
        ("takase-river", 135.77048, 35.00388),
        ("pontocho-entrance", 135.77106, 35.00392),
        ("shijo-bridge", 135.77155, 35.00391),
    ]
    selected = []
    for name, lon, lat in targets:
        nearby = sorted(graph.nodes, key=lambda ident: GEOD.inv(lon, lat, nodes[ident]["lon"], nodes[ident]["lat"])[2])[:5]
        selected.append({"name": name, "nearest": [{"id": ident, "longitude": nodes[ident]["lon"],
                         "latitude": nodes[ident]["lat"], "distance": GEOD.inv(lon, lat, nodes[ident]["lon"], nodes[ident]["lat"])[2],
                         "ways": sorted({graph.edges[ident, other]["wayId"] for other in graph.neighbors(ident)})}
                        for ident in nearby]})
    route_nodes = [item["nearest"][0]["id"] for item in selected]
    legs = []
    for a, b in zip(route_nodes, route_nodes[1:]):
        if not nx.has_path(graph, a, b):
            legs.append({"from": a, "to": b, "connected": False,
                         "componentSizes": [len(nx.node_connected_component(graph, ident)) for ident in (a, b)]})
            continue
        path = nx.shortest_path(graph, a, b, weight="distance")
        groups = []
        for start, end in zip(path, path[1:]):
            edge = graph.edges[start, end]
            if not groups or groups[-1]["wayId"] != edge["wayId"]:
                groups.append({"wayId": edge["wayId"], "tags": ways[edge["wayId"]].get("tags", {}), "nodeIds": [start], "length": 0})
            groups[-1]["nodeIds"].append(end)
            groups[-1]["length"] += edge["distance"]
        legs.append({"from": a, "to": b, "connected": True, "nodeIds": path, "groups": groups,
                     "length": sum(group["length"] for group in groups)})
    report = {"targets": selected, "legs": legs, "totalLength": sum(leg.get("length", 0) for leg in legs),
              "namedPlaces": [{"type": item["type"], "id": item["id"], "tags": item.get("tags", {})}
                              for item in data["elements"] if item.get("tags", {}).get("name") in ("錦市場", "四条大橋", "高瀬川", "錦天満宮")]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"path": str(args.output), "length": report["totalLength"],
                      "legs": [{key: leg[key] for key in ("from", "to", "connected", "length") if key in leg} for leg in legs]}, indent=2))


if __name__ == "__main__":
    main()
