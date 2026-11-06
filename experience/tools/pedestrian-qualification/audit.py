import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import json
from pathlib import Path

import DracoPy
import matplotlib
matplotlib.use("Agg")
matplotlib.rcParams["svg.hashsalt"] = "tourguideai-pedestrian-source-v1"
import matplotlib.pyplot as plt
import numpy as np
from py3dtiles.tileset.content import read_binary_tile_content
from pyproj import Transformer, datadir, network
from scipy.spatial import cKDTree
from shapely.geometry import LineString, Point, Polygon, mapping, shape
from shapely.ops import unary_union
from shapely.strtree import STRtree


def identity(path, root):
    data = path.read_bytes()
    return {"path": str(path.relative_to(root)), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def read(path):
    return json.loads(path.read_text())


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def local_frame(geography):
    origin = geography["origin"]
    longitude, latitude = np.radians([origin["longitude"], origin["latitude"]])
    rotation = np.array([[-np.sin(longitude), np.cos(longitude), 0],
        [np.cos(latitude) * np.cos(longitude), np.cos(latitude) * np.sin(longitude), np.sin(latitude)],
        [np.sin(latitude) * np.cos(longitude), np.sin(latitude) * np.sin(longitude), -np.cos(latitude)]])
    ecef = Transformer.from_crs(4979, 4978, always_xy=True)
    center = np.array(ecef.transform(origin["longitude"], origin["latitude"], 0, errcheck=True))

    def convert(longitude, latitude, height=0):
        values = np.column_stack(ecef.transform(longitude, latitude, height, errcheck=True))
        return (values - center) @ rotation.T

    return convert, rotation, center


def road_triangles(root, review, receipts):
    result, originals = [], []
    for model in review["models"]:
        if model["category"] != "road":
            continue
        receipt = next(item for item in receipts["records"] if item["id"] == model["id"])
        source = root / "artifacts/realism-01/downloads/route-qualification" / receipt["file"]
        actual = identity(source, root)
        if any(actual[key] != receipt[key] for key in ["bytes", "sha256"]):
            raise ValueError("Original road tile differs from its receipt")
        originals.append({**actual, "source": receipt["source"]})
        tile = read_binary_tile_content(source)
        gltf = tile.body.gltf
        matrix = np.array(model["transform"]).reshape((4, 4), order="F")
        selected = set(model["selectedBatchIds"])
        gml_ids = tile.body.batch_table.header.data["gml_id"]
        for primitive_index, primitive in enumerate(gltf.meshes[0].primitives):
            extension = primitive.extensions["KHR_draco_mesh_compression"]
            view = gltf.bufferViews[extension["bufferView"]]
            start = view.byteOffset or 0
            decoded = DracoPy.decode(gltf.binary_blob()[start:start + view.byteLength])
            points = np.asarray(decoded.points, dtype=np.float64)
            faces = np.asarray(decoded.faces, dtype=np.int64)
            batches = decoded.get_attribute_by_unique_id(extension["attributes"]["_BATCHID"])["data"].reshape(-1)
            local = points @ matrix[:3, :3].T + matrix[:3, 3]
            for index, face in enumerate(faces):
                batch = int(batches[face[0]])
                if not np.all(batches[face] == batch):
                    raise ValueError("Road source triangle crosses object identity")
                if batch in selected:
                    result.append({"id": f"{model['id']}:{primitive_index}:{index}", "gmlId": gml_ids[batch],
                        "sourceTileId": model["id"], "source": model["source"], "vertices": local[face].tolist()})
    return result, originals


def audit(root, output):
    output.mkdir(parents=True, exist_ok=True)
    evidence = root / "experience/evidence/realism-01/qualification"
    geography_path = root / "experience/src/neighborhoods/shijo-east/geography.json"
    review_path = evidence / "geometry/review-manifest.json"
    receipts_path = evidence / "geometry/download-receipts.json"
    roads_path = evidence / "ground/near-route-roads.geojson"
    datum_path = evidence / "datum/datum-diagnostic.json"
    terrain_path = evidence / "datum/terrain-frame-diagnostic.json"
    geography, review, receipts, roads, datum = map(read, [geography_path, review_path, receipts_path, roads_path, datum_path])
    convert, rotation, center = local_frame(geography)
    source_triangles, originals = road_triangles(root, review, receipts)
    foot = [Polygon(np.asarray(item["vertices"])[:, [0, 2]]) for item in source_triangles]
    if any(not polygon.is_valid or polygon.area <= 0 for polygon in foot):
        raise ValueError("Selected source road contains invalid projected triangles")
    all_surface = unary_union(foot)
    network.set_network_enabled(False)
    grid_directory = root / "artifacts/realism-01/ground-datum/downloads"
    datadir.append_data_dir(str(grid_directory))
    grid = next(model for model in datum["models"] if model["grid"] == "jp_gsi_gsigeo2011.tif")
    grid_receipt = next(item for item in datum["gridReceipts"]["records"] if item["path"] == grid["grid"])
    if identity(grid_directory / grid["grid"], root)["sha256"] != grid_receipt["sha256"]:
        raise ValueError("Diagnostic geoid grid identity differs")
    vertical = Transformer.from_pipeline(grid["definition"])
    semantic = [item for item in roads["features"] if item["properties"]["lod"] == 3]
    semantic_ids = {item["properties"]["id"] for item in semantic}
    sidewalk_triangles = [item for item in source_triangles if item["gmlId"] in semantic_ids]
    sidewalk_foot = unary_union([Polygon(np.asarray(item["vertices"])[:, [0, 2]]) for item in sidewalk_triangles])
    correspondence = []
    for feature in semantic:
        decoded_vertices = np.concatenate([np.asarray(item["vertices"]) for item in sidewalk_triangles if item["gmlId"] == feature["properties"]["id"]])
        source_vertices = np.concatenate([np.asarray(polygon[0])[:-1] for polygon in feature["geometry"]["coordinates"]])
        geographic = vertical.transform(source_vertices[:, 0], source_vertices[:, 1], source_vertices[:, 2], errcheck=True)
        converted = convert(*geographic)
        distances, _ = cKDTree(decoded_vertices).query(converted)
        reverse, _ = cKDTree(converted).query(decoded_vertices)
        correspondence.append({"gmlId": feature["properties"]["id"], "sourceTriangleCount": len(feature["geometry"]["coordinates"]),
            "decodedTriangleCount": len(decoded_vertices) // 3, "sourceToDecodedMaximumMetres": float(distances.max()),
            "decodedToSourceMaximumMetres": float(reverse.max()), "sourceProperties": feature["properties"],
            "limitation": "Same-data geometry/format consistency only; no independent survey accuracy"})
    radius = geography["navigation"]["playerRadius"]
    lookup = {edge["id"]: edge for edge in geography["navigation"]["edges"]}
    route_nodes = geography["selectedRoute"]["nodeIds"]
    frame = geography["frame"]
    edge_records, lines = [], []
    distance = 0
    for ordinal, edge_id in enumerate(geography["selectedRoute"]["edgeIds"]):
        edge = lookup[edge_id]
        points = edge["points"] if edge["from"] == route_nodes[ordinal] else list(reversed(edge["points"]))
        longitudes = np.array([frame["origin"]["longitude"] + item["x"] / frame["metresPerDegreeLon"] for item in points])
        latitudes = np.array([frame["origin"]["latitude"] + item["y"] / frame["metresPerDegreeLat"] for item in points])
        local = convert(longitudes, latitudes, np.zeros(len(points)))
        line = LineString(local[:, [0, 2]])
        lines.append(line)
        footprint = line.buffer(radius)
        overlap = line.intersection(all_surface).length
        sidewalk_overlap = line.intersection(sidewalk_foot).length
        edge_records.append({"ordinal": ordinal + 1, "id": edge_id, "startMetres": distance, "endMetres": distance + line.length,
            "lengthMetres": line.length, "allDetailedRoadOverlapMetres": overlap,
            "classifiedSidewalkOverlapMetres": sidewalk_overlap, "nearestDetailedRoadMetres": line.distance(all_surface),
            "nearestClassifiedSidewalkMetres": line.distance(sidewalk_foot),
            "actorFootprintRadiusMetres": radius, "actorFootprintArea": footprint.area,
            "detailedRoadActorFootprintOverlapArea": footprint.intersection(all_surface).area,
            "geometryAvailability": "present-on-centerline" if overlap > 0 else "missing-on-centerline",
            "pedestrianFloorQualified": False,
            "gapKind": "pedestrian-floor-in-market-shrine-zone" if 9 <= ordinal + 1 <= 24 else "bridge-approach-or-deck" if ordinal + 1 >= 52 else "street-pedestrian-surface"})
        distance += line.length
    tree = STRtree(foot)
    planes = []
    for item in source_triangles:
        vertices = np.asarray(item["vertices"])
        planes.append(np.linalg.solve(np.column_stack([vertices[:, [0, 2]], np.ones(3)]), vertices[:, 1]))
    terrain = read(terrain_path)
    terrain_sights = {item["sightId"]: item for item in next(model for model in terrain["models"] if model["grid"] == grid["grid"])["sights"]}
    sights = []
    for sight in geography["sights"]:
        point3 = convert([sight["longitude"]], [sight["latitude"]], [0])[0]
        point = Point(point3[[0, 2]])
        indices = tree.query(point, predicate="intersects")
        heights = [float(planes[index] @ np.array([point.x, point.y, 1])) for index in indices]
        nearest_index = int(tree.nearest(point))
        nearest_point = foot[nearest_index].exterior.interpolate(foot[nearest_index].exterior.project(point))
        nearest_height = float(planes[nearest_index] @ np.array([nearest_point.x, nearest_point.y, 1]))
        terrain_item = terrain_sights[sight["id"]]
        sights.append({"id": sight["id"], "sourceCoordinates": [sight["longitude"], sight["latitude"]],
            "localEastSouth": [point.x, point.y], "detailedRoadHeightsAtAnchor": heights,
            "anchorRoadTriangleIds": [source_triangles[index]["id"] for index in indices],
            "nearestDetailedRoadMetres": point.distance(all_surface),
            "nearestRoadSample": {"triangleId": source_triangles[nearest_index]["id"],
                "localEastSouth": [nearest_point.x, nearest_point.y], "localUpMetres": nearest_height,
                "limitation": "Nearest off-route road sample; no anchor floor height is inferred"},
            "terrainLocalUpMetres": terrain_item["localEastUpSouthMetres"][1], "pedestrianFloorQualified": False})
    surfaces = {"schemaVersion": 1, "coordinateSystem": review["coordinateSystem"], "triangles": source_triangles,
                "classifiedSidewalkIds": sorted(semantic_ids), "limitations": "Selected original road surfaces, including source classification where joined; current access and floor acceptance unverified"}
    write(output / "detailed-road-triangles.json", surfaces)
    result = {"schemaVersion": 1, "date": datetime.now(timezone.utc).isoformat(), "routeLengthMetres": geography["selectedRoute"]["lengthMetres"],
        "frameProjectedLengthMetres": distance, "sourceRoadTriangles": len(source_triangles), "classifiedSidewalkTriangles": len(sidewalk_triangles),
        "sourceRoadObjects": len({item["gmlId"] for item in source_triangles}), "classifiedSidewalkObjects": len(semantic_ids),
        "totalDetailedRoadCenterlineOverlapMetres": sum(item["allDetailedRoadOverlapMetres"] for item in edge_records),
        "totalClassifiedSidewalkCenterlineOverlapMetres": sum(item["classifiedSidewalkOverlapMetres"] for item in edge_records),
        "edgesWithDetailedCenterlineGeometry": sum(item["allDetailedRoadOverlapMetres"] > 0 for item in edge_records),
        "totalDetailedRoadActorFootprintOverlapArea": sum(item["detailedRoadActorFootprintOverlapArea"] for item in edge_records),
        "sightsWithDetailedSurfaceAtAnchor": sum(bool(item["detailedRoadHeightsAtAnchor"]) for item in sights),
        "inputs": [identity(path, root) for path in [geography_path, review_path, receipts_path, roads_path, datum_path, terrain_path]],
        "originalTiles": originals, "diagnosticGrid": grid_receipt, "diagnosticPipeline": grid["definition"],
        "sourceCorrespondence": correspondence, "edges": edge_records, "sights": sights,
        "method": "Original selected Draco road triangles; exact planar union/intersection with all ordered route edges and actor footprint; original GML source vertices converted through explicit GSIGEO2011 and compared bidirectionally",
        "limitations": ["Complete absence/presence within these inspected source collections does not establish availability in every possible external source.",
            "Classification and decoded geometry supply no current-access, obstacle, curb or pedestrian-floor acceptance.",
            "Terrain and zero-height LOD1 road polygons are excluded from pedestrian-surface coverage.",
            "Source conversion consistency supplies no independent survey control or approval of the source's historical epoch/model.",
            "The existing route's anchors, corridor widths and bridge endpoint retain authored accuracy limits. No runtime navigation is changed."]}
    write(output / "pedestrian-surface-audit.json", result)
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    for axis in axes:
        for polygon in foot:
            x, z = polygon.exterior.xy
            axis.fill(x, -np.asarray(z), facecolor="#92b7aa", edgecolor="none", alpha=.65)
        for line in lines:
            x, z = line.xy
            axis.plot(x, -np.asarray(z), color="#b44035", linewidth=2)
        for ordinal, sight in enumerate(sights):
            x, z = sight["localEastSouth"]
            axis.scatter([x], [-z], color="#253b37", s=20)
            axis.annotate(str(ordinal + 1), (x, -z), xytext=(3, 6), textcoords="offset points")
        axis.set_aspect("equal")
        axis.set_xlabel("Local east (m)")
        axis.set_ylabel("Local north (m)")
        axis.grid(alpha=.15)
    route_union = unary_union(lines)
    west, south, east, north = route_union.bounds
    axes[0].set_xlim(west - 30, east + 30)
    axes[0].set_ylim(-north - 35, -south + 35)
    axes[0].set_title("Full approved route; detailed source surfaces in green")
    anchor = sights[4]["localEastSouth"]
    axes[1].set_xlim(anchor[0] - 18, anchor[0] + 50)
    axes[1].set_ylim(-anchor[1] - 12, -anchor[1] + 42)
    axes[1].set_title("Pontochō / bridge approach surface gap")
    fig.suptitle("Pedestrian source availability — red route has no inferred floor", fontsize=14)
    fig.text(.02, .045, "1 Mitsui · 2 Nishiki · 3 Tenmangu · 4 Takase · 5 Pontocho · 6 Shijo Bridge", fontsize=9)
    fig.text(.02, .015, "Kyoto City / MLIT PLATEAU · CC BY 4.0 · Detailed source intersection only; pedestrian acceptance remains unverified", fontsize=8)
    fig.tight_layout(rect=[0, .08, 1, .93])
    fig.savefig(output / "surface-coverage.svg", metadata={"Date": None})
    plt.close(fig)
    print(json.dumps({key: result[key] for key in ["sourceRoadTriangles", "classifiedSidewalkTriangles", "totalDetailedRoadCenterlineOverlapMetres", "edgesWithDetailedCenterlineGeometry", "sightsWithDetailedSurfaceAtAnchor"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    audit(args.root.resolve(), args.output.resolve())
