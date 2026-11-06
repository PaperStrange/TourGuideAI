import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from io import BytesIO
import json
import math
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen

import DracoPy
import numpy as np
from PIL import Image
from py3dtiles.tileset.content import read_binary_tile_content
from pyproj import Transformer
import shapely
from shapely.geometry import LineString, Point, box, mapping, shape
from shapely.ops import transform


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def route_data(root):
    path = root / "experience/src/neighborhoods/shijo-east/geography.json"
    geography = json.loads(path.read_text())
    origin = geography["origin"]
    crs = f"+proj=aeqd +lat_0={origin['latitude']} +lon_0={origin['longitude']} +datum=WGS84 +units=m"
    project = Transformer.from_crs("EPSG:4326", crs, always_xy=True).transform
    nodes = {node["id"]: node for node in geography["navigation"]["nodes"]}
    lines = []
    for a, b in zip(geography["selectedRoute"]["nodeIds"][:-1], geography["selectedRoute"]["nodeIds"][1:]):
        lines.append(LineString([project(nodes[n]["longitude"], nodes[n]["latitude"]) for n in [a, b]]))
    return geography, nodes, crs, project, lines


def contents(node, base_url, project, depth=0, parent_content=None):
    require(not node.get("transform"), "Tileset transform requires a reviewed extension to this extractor")
    content = node.get("content")
    if content:
        bounds = content.get("boundingVolume", node["boundingVolume"])["region"]
        region = list(map(math.degrees, bounds[:4]))
        source = urljoin(base_url, content["uri"])
        yield {"source": source, "boundsDegrees": region, "depth": depth,
               "parentContent": parent_content, "geometricError": node["geometricError"], "refine": node.get("refine"),
               "leaf": not node.get("children"), "shape": transform(project, box(*region))}
        parent_content = source
    for child in node.get("children", []):
        yield from contents(child, base_url, project, depth + 1, parent_content)


def inventory(root, cache):
    geography, nodes, crs, project, lines = route_data(root)
    retained = root / "experience/evidence/realism-01/sources"
    audit = json.loads((retained / "route-source-audit.json").read_text())
    sources = {}
    for edge in audit["edges"]:
        for category, candidates in edge["candidates"].items():
            for record in candidates:
                sources[record["source"]] = {"source": record["source"], "category": category,
                    "ward": "26104" if category == "building" else "26100", "leaf": record["leaf"],
                    "boundsDegrees": record["boundsDegrees"]}
    for item in audit["inputs"]:
        for candidate in contents(json.loads((retained / item["path"]).read_text())["root"], item["source"], project):
            if candidate["source"] in sources:
                sources[candidate["source"]].update({key: value for key, value in candidate.items() if key != "shape"})
    adjacent = root / "artifacts/realism-01/downloads/ground-qualification"
    receipts = json.loads((adjacent / "download-receipts.json").read_text())["records"]
    for ward in ["26105", "26106"]:
        record = next(value for value in receipts if value["path"] == f"{ward}-bldg-lod3-tileset.json")
        raw = (adjacent / record["path"]).read_bytes()
        require(sha(raw) == record["sha256"], f"Ward index hash differs: {ward}")
        for candidate in contents(json.loads(raw)["root"], record["source"], project):
            if min(line.distance(candidate["shape"]) for line in lines) <= 25:
                sources[candidate["source"]] = {key: value for key, value in candidate.items() if key != "shape"}
                sources[candidate["source"]].update(category="building", ward=ward)
    ordered = []
    for url, record in sorted(sources.items()):
        tile_id = f"{record['category']}-{record['ward']}-{Path(url).stem}-{sha(url.encode())[:8]}"
        ordered.append({**record, "id": tile_id, "file": f"{tile_id}.b3dm"})
    result = {"schemaVersion": 1, "sourceAuditSha256": sha((retained / "route-source-audit.json").read_bytes()),
              "candidateSearchMetres": 25, "records": ordered}
    write_json(cache / "inventory.json", result)
    return result


def acquire(root, cache):
    selection = inventory(root, cache)
    path = cache / "download-receipts.json"
    prior = json.loads(path.read_text())["records"] if path.exists() else []
    known = {record["source"]: record for record in prior}

    def download(record):
        target = cache / record["file"]
        if record["source"] in known:
            receipt = known[record["source"]]
            data = target.read_bytes()
            require(sha(data) == receipt["sha256"] and len(data) == receipt["bytes"], f"Cache receipt differs: {target}")
            return {**receipt, **record}
        request = Request(record["source"], headers={"User-Agent": "TourGuideAI-source-qualification/1.0"})
        with urlopen(request, timeout=60) as response:
            require(response.status == 200, f"HTTP status: {record['source']}")
            data = response.read(64 * 1024 ** 2 + 1)
            require(len(data) <= 64 * 1024 ** 2, f"Tile exceeds acquisition limit: {record['source']}")
            target.write_bytes(data)
            return {**record, "date": datetime.now(timezone.utc).isoformat(), "bytes": len(data), "sha256": sha(data),
                "contentType": response.headers.get("Content-Type"), "lastModified": response.headers.get("Last-Modified"),
                "rights": "Kyoto City / MLIT Project PLATEAU, CC BY 4.0; source dates remain in dataset receipts",
                "location": "Kyoto Shijo East and the adjacent source wards",
                "method": "Unmodified original HTTPS B3DM bytes with inherited proxy/CA and TLS verification",
                "limitations": "Acquired candidate content; geometry and appearance need separate qualification"}

    records = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        for record in executor.map(download, selection["records"]):
            records.append(record)
            write_json(path, {"schemaVersion": 1, "records": records})
            print(json.dumps({"acquired": len(records), "total": len(selection["records"]), "id": record["id"], "bytes": record["bytes"]}), flush=True)
    return records


def coordinate_frame(origin):
    longitude, latitude = map(math.radians, [origin["longitude"], origin["latitude"]])
    ecef = Transformer.from_crs(4979, 4978, always_xy=True)
    origin_ecef = np.array(ecef.transform(origin["longitude"], origin["latitude"], 0))
    local = np.array([[-math.sin(longitude), math.cos(longitude), 0],
        [math.cos(latitude) * math.cos(longitude), math.cos(latitude) * math.sin(longitude), math.sin(latitude)],
        [math.sin(latitude) * math.cos(longitude), math.sin(latitude) * math.sin(longitude), -math.cos(latitude)]])
    y_up_to_z_up = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]])
    return ecef, origin_ecef, local, y_up_to_z_up


def binary_property(table, name):
    value = table.header.data.get(name)
    return table.get_binary_property(name) if isinstance(value, dict) else value


def inspect_tile(record, cache, models, frame, project, ecef_to_geographic):
    source_path = cache / record["file"]
    source_bytes = source_path.read_bytes()
    require(sha(source_bytes) == record["sha256"], f"Source hash differs: {record['id']}")
    tile = read_binary_tile_content(source_path)
    gltf, table = tile.body.gltf, tile.body.batch_table
    require(not tile.body.feature_table.header.data.get("RTC_CENTER"), "Feature-table RTC_CENTER needs explicit reviewed handling")
    require(len(gltf.nodes) == 1 and gltf.nodes[0].mesh == 0 and not gltf.nodes[0].children,
            f"Unsupported scene hierarchy: {record['id']}")
    require(not any(getattr(gltf.nodes[0], key) for key in ["matrix", "rotation", "translation", "scale"]),
            f"Unexpected node transform: {record['id']}")
    require(len(gltf.meshes) == 1, f"Unexpected mesh hierarchy: {record['id']}")
    center = np.array(gltf.extensions["CESIUM_RTC"]["center"])
    ecef, origin_ecef, local, up_axis = frame
    model_matrix = np.eye(4)
    model_matrix[:3, :3] = local @ up_axis
    model_matrix[:3, 3] = local @ (center - origin_ecef)
    model_path = models / f"{record['id']}.glb"
    gltf.save_binary(model_path)
    model_bytes = model_path.read_bytes()
    gml_ids = table.header.data["gml_id"]
    objects = {index: {"parts": [], "triangles": 0, "texturedTriangles": 0, "world": [], "projected": []}
               for index in range(len(gml_ids))}
    texture_records = []
    for index, image in enumerate(gltf.images):
        require(image.bufferView is not None and image.uri is None, f"External texture unsupported: {record['id']}")
        view = gltf.bufferViews[image.bufferView]
        start = view.byteOffset or 0
        payload = gltf.binary_blob()[start:start + view.byteLength]
        with Image.open(BytesIO(payload)) as decoded:
            texture_records.append({"index": index, "mimeType": image.mimeType, "width": decoded.width,
                                    "height": decoded.height, "bytes": len(payload), "sha256": sha(payload)})
    all_local = []
    road_triangles = []
    for primitive in gltf.meshes[0].primitives:
        require(primitive.mode == 4, f"Non-triangle primitive: {record['id']}")
        extension = primitive.extensions["KHR_draco_mesh_compression"]
        view = gltf.bufferViews[extension["bufferView"]]
        start = view.byteOffset or 0
        decoded = DracoPy.decode(gltf.binary_blob()[start:start + view.byteLength])
        points = np.asarray(decoded.points, dtype=np.float64)
        faces = np.asarray(decoded.faces, dtype=np.int64)
        batches = decoded.get_attribute_by_unique_id(extension["attributes"]["_BATCHID"])["data"].reshape(-1)
        require(len(faces) * 3 == gltf.accessors[primitive.indices].count, f"Decoded triangle count differs: {record['id']}")
        require(len(points) == len(batches), f"Batch vertices differ: {record['id']}")
        require(np.all(batches[faces] == batches[faces[:, 0]][:, None]), f"Triangle crosses batch IDs: {record['id']}")
        world = points @ up_axis.T + center
        local_points = (world - origin_ecef) @ local.T
        all_local.append(local_points)
        longitude, latitude, altitude = ecef_to_geographic.transform(world[:, 0], world[:, 1], world[:, 2])
        east, north = project(longitude, latitude)
        projected = np.column_stack([east, north])
        material = gltf.materials[primitive.material]
        textured = material.pbrMetallicRoughness.baseColorTexture is not None and "TEXCOORD_0" in extension["attributes"]
        for index in np.unique(batches):
            require(int(index) in objects, f"Batch ID out of range: {record['id']}")
            obj = objects[int(index)]
            batch_faces = faces[batches[faces[:, 0]] == index]
            vertices = np.unique(batch_faces)
            polygons = shapely.make_valid(shapely.polygons(projected[batch_faces]))
            if len(polygons):
                obj["parts"].append(shapely.union_all(polygons))
            obj["world"].append(np.column_stack([longitude[vertices], latitude[vertices], altitude[vertices]]))
            obj["projected"].append(local_points[vertices])
            obj["triangles"] += len(batch_faces)
            obj["texturedTriangles"] += len(batch_faces) if textured else 0
        if record["category"] == "road":
            road_triangles.extend(local_points[faces].tolist())
    features = []
    for index, obj in objects.items():
        require(obj["world"], f"Unreferenced batch object: {record['id']}#{index}")
        world = np.concatenate(obj["world"])
        local_points = np.concatenate(obj["projected"])
        footprint = shapely.union_all(obj["parts"])
        require(not footprint.is_empty, f"Object has no projected surface: {record['id']}#{index}")
        def value(key):
            values = binary_property(table, key)
            result = values[index] if values is not None else None
            return result.item() if isinstance(result, np.generic) else result
        properties = {"gmlId": gml_ids[index], "source": record["source"], "category": record["category"],
            "lod": value("_lod"), "sourceTileId": record["id"], "batchIndex": index,
            "triangles": obj["triangles"], "texturedTriangles": obj["texturedTriangles"],
            "heightRangeEllipsoidalMetres": [float(world[:, 2].min()), float(world[:, 2].max())],
            "sourceHeightRangeMetres": [value("_zmin"), value("_zmax")],
            "localBounds": np.concatenate([local_points.min(0), local_points.max(0)]).tolist(),
            "sourceName": value("gml:name"), "buildingId": value("uro:BuildingIDAttribute_uro:buildingID"),
            "sourcePointDegrees": [value("_x"), value("_y")],
            "sourceBoundsDegrees": [value("_xmin"), value("_ymin"), value("_xmax"), value("_ymax")],
            "actualBoundsDegrees": [float(world[:, 0].min()), float(world[:, 1].min()), float(world[:, 0].max()), float(world[:, 1].max())],
            "projectedGeometryType": footprint.geom_type,
            "appearanceStatus": "unverified", "groundStatus": "unverified", "lightingStatus": "unverified"}
        features.append({"type": "Feature", "id": f"{record['source']}#{index}", "properties": properties, "geometry": mapping(footprint)})
    local_points = np.concatenate(all_local)
    model = {"id": record["id"], "category": record["category"], "ward": record["ward"],
        "file": f"models/{model_path.name}", "bytes": len(model_bytes), "sha256": sha(model_bytes),
        "source": record["source"], "sourceSha256": record["sha256"], "transform": model_matrix.flatten(order="F").tolist(),
        "bounds": np.concatenate([local_points.min(0), local_points.max(0)]).tolist(),
        "cesiumRTC": center.tolist(), "objects": len(features), "triangles": sum(obj["triangles"] for obj in objects.values()),
        "textures": texture_records, "lodCounts": dict(Counter(str(feature["properties"]["lod"]) for feature in features))}
    return features, model, road_triangles


def select_content(features, models, receipts):
    metadata = {record["id"]: record for record in receipts}
    metadata_by_url = {record["source"]: record for record in receipts}

    def replacement_ancestors(record):
        ancestors = []
        parent = record["parentContent"]
        while parent in metadata_by_url:
            ancestor = metadata_by_url[parent]
            if ancestor["refine"] != "REPLACE":
                break
            ancestors.append(parent)
            parent = ancestor["parentContent"]
        return ancestors
    groups = defaultdict(list)
    for feature in features:
        groups[(feature["properties"]["category"], feature["properties"]["gmlId"])].append(feature)
    alternatives, ambiguous = [], []
    for identity, occurrences in groups.items():
        ordered = sorted(occurrences, key=lambda feature: (
            -(feature["properties"]["lod"] or 0), -metadata[feature["properties"]["sourceTileId"]]["depth"],
            metadata[feature["properties"]["sourceTileId"]]["geometricError"],
            -feature["properties"]["triangles"], -feature["properties"]["texturedTriangles"], feature["id"]))
        retained = []
        for feature in ordered:
            feature["properties"]["selectedForReview"] = True
            footprint = shape(feature["geometry"])
            bounds = np.array(feature["properties"]["localBounds"])
            for selected in retained:
                other = shape(selected["geometry"])
                other_bounds = np.array(selected["properties"]["localBounds"])
                intersection = footprint.intersection(other).area
                union = footprint.union(other).area
                iou = intersection / union if union > 0 else None
                height_overlap = max(0, min(bounds[4], other_bounds[4]) - max(bounds[1], other_bounds[1]))
                height_union = max(bounds[4], other_bounds[4]) - min(bounds[1], other_bounds[1])
                height_iou = height_overlap / height_union if height_union > 0 else 1
                bound_difference = float(np.abs(bounds - other_bounds).max())
                hausdorff = footprint.hausdorff_distance(other)
                near_same_extents = bound_difference <= 0.1 and hausdorff <= 0.1
                overlapping_surface = iou is not None and iou >= 0.9 and height_iou >= 0.9
                ancestry = replacement_ancestors(metadata[selected["properties"]["sourceTileId"]])
                replacement = feature["properties"]["source"] in ancestry and intersection > 0 and height_overlap > 0
                measured = {"gmlId": identity[1], "selected": selected["id"], "alternative": feature["id"],
                    "projectedIntersectionOverUnion": iou, "heightIntersectionOverUnion": height_iou,
                    "maximumBoundsDifferenceMetres": bound_difference, "projectedHausdorffMetres": hausdorff,
                    "selectedLod": selected["properties"]["lod"], "alternativeLod": feature["properties"]["lod"],
                    "selectedTriangles": selected["properties"]["triangles"], "alternativeTriangles": feature["properties"]["triangles"],
                    "selectedTexturedTriangles": selected["properties"]["texturedTriangles"], "alternativeTexturedTriangles": feature["properties"]["texturedTriangles"]}
                if near_same_extents or overlapping_surface or replacement:
                    feature["properties"]["selectedForReview"] = False
                    feature["properties"]["representedBy"] = selected["id"]
                    alternatives.append({**measured, "decision": "overlapping-alternative-excluded",
                        "criterion": "Declared REPLACE ancestor of the same GML object" if replacement else
                            "Within 0.1 m bounds and projected Hausdorff, or at least 0.9 projected and height overlap",
                        "replacementAncestorChain": ancestry if replacement else []})
                    break
                if footprint.distance(other) < 0.01 and height_overlap > 0.01:
                    ambiguous.append({**measured, "decision": "overlap-needs-review"})
            if feature["properties"]["selectedForReview"]:
                retained.append(feature)
    for model in models:
        selected = [feature for feature in features if feature["properties"]["sourceTileId"] == model["id"]
                    and feature["properties"]["selectedForReview"]]
        model["selectedBatchIds"] = [feature["properties"]["batchIndex"] for feature in selected]
        model["selectedTriangles"] = sum(feature["properties"]["triangles"] for feature in selected)
    return {"method": "Select highest actual LOD, deepest content node, lowest geometric error, then triangle/texture detail and stable occurrence ID. Exclude declared REPLACE ancestors of the same GML object and measured overlapping alternatives; preserve sibling/disjoint fragments.",
        "sourceOccurrences": len(features), "selectedOccurrences": sum(feature["properties"]["selectedForReview"] for feature in features),
        "excludedOccurrences": len(alternatives), "alternatives": alternatives, "ambiguous": ambiguous}


def inspect(root, cache, output):
    geography, nodes, crs, project, lines = route_data(root)
    frame = coordinate_frame(geography["origin"])
    to_geographic = Transformer.from_crs(4978, 4979, always_xy=True)
    models = output / "models"
    models.mkdir(parents=True, exist_ok=True)
    receipts = json.loads((cache / "download-receipts.json").read_text())["records"]
    selection = json.loads((cache / "inventory.json").read_text())["records"]
    require({item["source"] for item in receipts} == {item["source"] for item in selection}, "Acquisition inventory incomplete")
    features, model_records, road_triangles = [], [], []
    for index, record in enumerate(receipts):
        objects, model, road = inspect_tile(record, cache, models, frame, project, to_geographic)
        features.extend(objects)
        model_records.append(model)
        road_triangles.extend(road)
        print(json.dumps({"inspected": index + 1, "total": len(receipts), "id": record["id"], "objects": len(objects), "triangles": model["triangles"]}), flush=True)
    selection = select_content(features, model_records, receipts)
    write_json(output / "content-selection.json", selection)
    write_json(output / "objects.geojson", {"type": "FeatureCollection", "coordinateSystem": crs,
        "method": "Union of decoded source triangles projected through ECEF geographic coordinates into the declared local metre CRS",
        "limitations": ["Projected surfaces include roofs and walls; they do not establish public entrances or visibility.",
            "Content is source geometry; appearance, current condition, lighting and pedestrian-ground acceptance remain open."], "features": features})
    shapes = [shape(feature["geometry"]) for feature in features]
    edges = []
    for index, line in enumerate(lines):
        coordinates = np.array(line.coords)
        tangent = coordinates[-1] - coordinates[0]
        matches = []
        for feature, footprint in zip(features, shapes):
            distance = line.distance(footprint)
            if distance <= 25:
                delta = np.array(footprint.representative_point().coords[0]) - coordinates[0]
                side_value = float(tangent[0] * delta[1] - tangent[1] * delta[0])
                matches.append({"objectId": feature["id"], "gmlId": feature["properties"]["gmlId"],
                    "category": feature["properties"]["category"], "sourceTileId": feature["properties"]["sourceTileId"],
                    "lod": feature["properties"]["lod"], "selectedForReview": feature["properties"]["selectedForReview"],
                    "projectedSurfaceDistanceMetres": round(distance, 4),
                    "representativePointSide": "left" if side_value > 0 else "right" if side_value < 0 else "on-line"})
        edges.append({"ordinal": index + 1, "id": geography["selectedRoute"]["edgeIds"][index],
            "matches": matches, "appearanceStatus": "unverified", "groundStatus": "unverified", "lightingStatus": "unverified"})
    ecef, origin_ecef, rotation, up_axis = frame
    sights = []
    for sight in geography["sights"]:
        node = nodes[sight["nodeId"]]
        location = Point(project(node["longitude"], node["latitude"]))
        candidates = [(location.distance(footprint), feature) for feature, footprint in zip(features, shapes)
                      if feature["properties"]["category"] == "building" and feature["properties"]["selectedForReview"]]
        distance, nearest = min(candidates, key=lambda candidate: candidate[0])
        position = rotation @ (np.array(ecef.transform(node["longitude"], node["latitude"], 0)) - origin_ecef)
        position[1] = nearest["properties"]["localBounds"][1]
        route_index = geography["selectedRoute"]["nodeIds"].index(sight["nodeId"])
        before = nodes[geography["selectedRoute"]["nodeIds"][route_index if route_index < 54 else 53]]
        after = nodes[geography["selectedRoute"]["nodeIds"][min(54, route_index + 1)]]
        tangent = rotation @ (np.array(ecef.transform(after["longitude"], after["latitude"], 0))
                              - np.array(ecef.transform(before["longitude"], before["latitude"], 0)))
        forward = tangent[[0, 2]] / np.linalg.norm(tangent[[0, 2]])
        sights.append({"id": sight["id"], "label": sight.get("title", sight["id"]), "position": position.tolist(),
            "forward": forward.tolist(),
            "heightMethod": "Minimum actual decoded vertex height of nearest projected building surface; provisional diagnostic anchor",
            "heightQualified": False, "heightSourceObjectId": nearest["id"], "heightSourceDistanceMetres": distance})
    review = {"schemaVersion": 1, "contentSelection": {"selectedOccurrences": selection["selectedOccurrences"],
        "excludedOccurrences": selection["excludedOccurrences"], "ambiguousOccurrences": len(selection["ambiguous"]),
        "selectedTriangles": sum(model["selectedTriangles"] for model in model_records)},
        "coordinateSystem": {"axes": "x east, y up, z south; metres", "origin": geography["origin"],
        "verticalDatum": "WGS84 ellipsoidal local tangent frame with origin height zero; CityGML orthometric source heights retained separately",
        "method": "GLTF Y-up to Z-up, CESIUM_RTC ECEF translation, then ECEF to local east/up/south rotation",
        "physicalGroundQualified": False}, "models": model_records, "sights": sights,
        "provenance": {"source": "Kyoto City / MLIT Project PLATEAU", "rights": "CC BY 4.0", "downloadReceiptsSha256": sha((cache / "download-receipts.json").read_bytes())},
        "limitations": ["Source diagnostic only; original source materials and all acquired content retained.",
            "No authored road plane, rebuilt ground, night lighting or production streaming added.",
            "Near-route source content can include distant objects; bounds search is an acquisition limit.",
            "Provisional eye-height anchors require ground/vertical-datum review before navigation acceptance."]}
    write_json(output / "review-manifest.json", review)
    write_json(output / "geometry-audit.json", {"schemaVersion": 1, "coordinateSystem": crs,
        "sourceDownloads": len(receipts), "sourceBytes": sum(record["bytes"] for record in receipts),
        "sourceObjects": len(features), "gmlIdDuplicates": len(features) - len({feature["properties"]["gmlId"] for feature in features}),
        "sourceTriangles": sum(model["triangles"] for model in model_records),
        "lodCounts": dict(Counter(str(feature["properties"]["lod"]) for feature in features if feature["properties"]["category"] == "building")),
        "sourceModels": model_records, "edges": edges,
        "limitations": review["limitations"] + ["Representative-point side classifies the object sample relative to forward route direction; it does not establish an accessible frontage."]})
    write_json(output / "road-triangles.json", {"coordinateSystem": review["coordinateSystem"], "triangles": road_triangles})
    require(not selection["ambiguous"], "Overlapping source occurrences need review before diagnostic capture")
    return review


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=["acquire", "inspect"])
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    root, cache = args.root.resolve(), args.cache.resolve()
    require(cache.is_relative_to(root / "artifacts"), "Raw source cache must remain inside ignored artifacts")
    if args.operation == "acquire":
        acquire(root, cache)
    else:
        require(args.output is not None, "Inspection output required")
        output = args.output.resolve()
        require(output.is_relative_to(root / "artifacts"), "Diagnostic models must remain inside ignored artifacts")
        inspect(root, cache, output)


if __name__ == "__main__":
    main()
