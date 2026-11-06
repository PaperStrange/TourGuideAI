import argparse
import gzip
import hashlib
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
matplotlib.rcParams["svg.hashsalt"] = "tourguideai-terrain-source-v1"
import matplotlib.pyplot as plt
import numpy as np
from pyproj import Transformer
from shapely.geometry import LineString, Point, shape
from shapely.ops import transform
from shapely.strtree import STRtree


def identity(path, root):
    data = path.read_bytes()
    return {"path": str(path.relative_to(root)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def profile(root, source, output):
    geography_path = root / "experience/src/neighborhoods/shijo-east/geography.json"
    geography = json.loads(geography_path.read_text())
    source_bytes = source.read_bytes()
    collection = json.loads(gzip.decompress(source_bytes) if source.suffix == ".gz" else source_bytes)
    source_project = Transformer.from_crs(6668, 6674, always_xy=True).transform
    route_project = Transformer.from_crs(4326, 6674, always_xy=True).transform
    geographic = Transformer.from_crs(6674, 6668, always_xy=True).transform
    triangles = [transform(source_project, shape(feature["geometry"])) for feature in collection["features"]]
    planes = []
    for triangle in triangles:
        vertices = np.asarray(triangle.exterior.coords)
        if vertices.shape != (4, 3) or not np.array_equal(vertices[0], vertices[3]):
            raise ValueError("Source must retain exactly three closed 3D triangle vertices")
        planes.append(np.linalg.solve(np.column_stack([vertices[:3, :2], np.ones(3)]), vertices[:3, 2]))
    index = STRtree(triangles)
    frame = geography["frame"]
    edges = {edge["id"]: edge for edge in geography["navigation"]["edges"]}
    nodes = geography["selectedRoute"]["nodeIds"]
    samples, edge_records, sight_records = [], [], []
    distance = 0

    def sample(point, along, edge_id):
        matches = index.query(point, predicate="intersects")
        heights = [float(planes[item] @ np.array([point.x, point.y, 1])) for item in matches]
        span = max(heights) - min(heights) if heights else None
        longitude, latitude = geographic(point.x, point.y)
        return {"distanceMetres": along, "edgeId": edge_id, "x": point.x, "y": point.y,
                "longitude": longitude, "latitude": latitude,
                "terrainHeightMetres": sum(heights) / len(heights) if heights and span <= .05 else None,
                "triangleIds": [collection["features"][item]["id"] for item in matches],
                "heightSpreadMetres": span, "pedestrianFloorQualified": False}

    for ordinal, edge_id in enumerate(geography["selectedRoute"]["edgeIds"]):
        edge = edges[edge_id]
        if {edge["from"], edge["to"]} != {nodes[ordinal], nodes[ordinal + 1]}:
            raise ValueError("Terrain sampling route is disconnected")
        points = edge["points"] if edge["from"] == nodes[ordinal] else list(reversed(edge["points"]))
        line = LineString([route_project(frame["origin"]["longitude"] + point["x"] / frame["metresPerDegreeLon"],
                                        frame["origin"]["latitude"] + point["y"] / frame["metresPerDegreeLat"]) for point in points])
        distances = list(np.arange(0, line.length, 1)) + [line.length]
        edge_samples = [sample(line.interpolate(float(along)), distance + float(along), edge_id) for along in distances]
        samples.extend(edge_samples)
        for sight in geography["sights"]:
            if sight["nodeId"] == nodes[ordinal]:
                sight_records.append({"sightId": sight["id"], **sample(Point(line.coords[0]), distance, edge_id)})
            elif ordinal == len(nodes) - 2 and sight["nodeId"] == nodes[-1]:
                sight_records.append({"sightId": sight["id"], **sample(Point(line.coords[-1]), distance + line.length, edge_id)})
        edge_records.append({"ordinal": ordinal + 1, "id": edge_id, "startMetres": distance,
                             "endMetres": distance + line.length, "samples": len(edge_samples),
                             "covered": sum(item["terrainHeightMetres"] is not None for item in edge_samples),
                             "ambiguous": sum(item["heightSpreadMetres"] is not None and item["heightSpreadMetres"] > .05 for item in edge_samples)})
        distance += line.length
    result = {"schemaVersion": 1, "method": "Original triangle plane interpolation at 1 m along every oriented route edge, including each endpoint; Shapely containment in EPSG:6674",
        "coordinateSystem": "EPSG:6674 horizontal; EPSG:6697 source gravity-related height; reported geographic positions JGD2011",
        "inputs": [identity(path, root) for path in [geography_path, source]], "sourceTriangleCount": len(triangles),
        "sampleCount": len(samples), "coveredSamples": sum(item["terrainHeightMetres"] is not None for item in samples),
        "projectedRouteMetres": distance, "sampleSpacingMetres": 1,
        "edges": edge_records, "sights": sight_records, "samples": samples,
        "qualification": "unverified", "limitations": ["Source terrain is distinct from bridge decks, curb/pavement levels and covered-passage floors.",
            "Horizontal JGD2011/WGS84 correspondence and vertical model registration require separate review.",
            "This 1 m diagnostic profile is separate from the frozen 0.1 m benchmark camera trajectory. No runtime camera or collision surface is changed."]}
    output.mkdir(parents=True, exist_ok=True)
    (output / "terrain-profile.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    fig, axes = plt.subplots(2, 1, figsize=(12, 7), height_ratios=[2, 1])
    x = [item["distanceMetres"] for item in samples]
    y = [item["terrainHeightMetres"] if item["terrainHeightMetres"] is not None else np.nan for item in samples]
    axes[0].plot(x, y, color="#326b60", linewidth=1.5, label="Original terrain, interpolated")
    for ordinal, sight in enumerate(sight_records):
        axes[0].axvline(sight["distanceMetres"], color="#999999", linewidth=.6, linestyle="--")
        axes[0].text(sight["distanceMetres"], .97 if ordinal % 2 == 0 else .84, str(ordinal + 1),
                     transform=axes[0].get_xaxis_transform(), ha="center", va="top")
    axes[0].set_ylabel("Source gravity-related height (m)")
    axes[0].set_xlabel("Projected route distance (m)")
    axes[0].grid(alpha=.2)
    axes[0].legend(loc="lower left")
    axes[1].bar([item["ordinal"] for item in edge_records],
                [item["covered"] / item["samples"] * 100 for item in edge_records], color="#326b60")
    axes[1].set_xlabel("Ordered route edge")
    axes[1].set_ylabel("Terrain samples covered (%)")
    axes[1].set_ylim(0, 105)
    fig.suptitle("Kyoto route terrain inspection — pedestrian floors remain unqualified", fontsize=14)
    fig.text(.02, .045, "1 Mitsui · 2 Nishiki · 3 Tenmangu · 4 Takase · 5 Pontocho · 6 Shijo Bridge", fontsize=9)
    fig.text(.02, .015, "Source: Kyoto City / MLIT Project PLATEAU · CC BY 4.0 · Source terrain only; no surveyed pedestrian-ground acceptance", fontsize=8)
    fig.tight_layout(rect=[0, .07, 1, .95])
    fig.savefig(output / "terrain-profile.svg", metadata={"Date": None})
    plt.close(fig)
    print(json.dumps({key: result[key] for key in ["sampleCount", "coveredSamples", "projectedRouteMetres"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    profile(args.root.resolve(), args.source.resolve(), args.output.resolve())
