import argparse
import gzip
import hashlib
import json
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import Point, shape
from shapely.ops import transform


def receipt(path, root):
    data = path.read_bytes()
    return {"path": str(path.relative_to(root)), "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest()}


def match_landmarks(root, objects_path, output):
    geography_path = root / "experience/src/neighborhoods/shijo-east/geography.json"
    scene_path = root / "experience/src/neighborhoods/shijo-east/scene.json"
    targets_path = root / "experience/sprints/realism-01/experiments/landmark-targets.json"
    geography = json.loads(geography_path.read_text())
    scene = json.loads(scene_path.read_text())
    targets = json.loads(targets_path.read_text())["targets"]
    object_bytes = objects_path.read_bytes()
    source_objects = json.loads(gzip.decompress(object_bytes) if objects_path.suffix == ".gz" else object_bytes)
    origin = geography["origin"]
    local_crs = f"+proj=aeqd +lat_0={origin['latitude']} +lon_0={origin['longitude']} +datum=WGS84 +units=m"
    project = Transformer.from_crs("EPSG:4326", local_crs, always_xy=True).transform
    if source_objects.get("coordinateSystem") != local_crs:
        raise ValueError("Object footprint coordinate system must match the declared AEQD frame")
    sights = {sight["id"]: sight for sight in geography["sights"]}
    if len(targets) != 6 or {target["sightId"] for target in targets} != set(sights):
        raise ValueError("Landmark target inventory must cover all six route sights exactly once")
    features = {feature["sourceId"]: feature for feature in scene["features"] + scene["landmarks"]}
    prepared = []
    for feature in source_objects["features"]:
        if feature["properties"]["selectedForReview"] is not True:
            continue
        geometry = shape(feature["geometry"])
        if geometry.is_empty or not geometry.is_valid:
            raise ValueError(f"Invalid inspected object footprint: {feature['id']}")
        prepared.append((feature, geometry))
    records = []
    for target in targets:
        sight = sights[target["sightId"]]
        original = features[target["sceneSourceId"]]
        if target.get("expectedOsmId") and not any(
                match["sourceId"] == target["expectedOsmId"] for match in original.get("osmMatches", [])):
            raise ValueError("Named building no longer matches its retained OSM source")
        reference = (transform(project, shape(original["sourceGeometry"])) if "sourceGeometry" in original
                     else Point(project(original["longitude"], original["latitude"])))
        approach = Point(project(sight["longitude"], sight["latitude"]))
        original_gml_id = original.get("sourceTags", {}).get("gml_id")
        candidates = []
        for feature, geometry in prepared:
            properties = feature["properties"]
            if properties["category"] not in target["categories"]:
                continue
            exact = original_gml_id is not None and properties["gmlId"] == original_gml_id
            distance = approach.distance(geometry)
            if not exact and distance > target["searchDistanceMetres"]:
                continue
            intersection = reference.intersection(geometry).area if reference.area > 0 else None
            candidates.append({"objectId": feature["id"], "gmlId": properties["gmlId"],
                "source": properties["source"], "category": properties["category"], "lod": properties["lod"],
                "relationship": "same-source-object" if exact else "spatial-candidate",
                "approachDistanceMetres": round(distance, 3),
                "referenceDistanceMetres": round(reference.distance(geometry), 3),
                "referenceAreaOverlapFraction": round(intersection / reference.area, 6) if intersection is not None else None,
                "triangles": properties["triangles"], "texturedTriangles": properties["texturedTriangles"]})
        candidates.sort(key=lambda item: (item["relationship"] != "same-source-object", item["approachDistanceMetres"], item["objectId"]))
        exact = [candidate for candidate in candidates if candidate["relationship"] == "same-source-object"]
        records.append({"sightId": target["sightId"], "approach": {"longitude": sight["longitude"], "latitude": sight["latitude"]},
            "retainedSceneSourceId": target["sceneSourceId"], "retainedGmlId": original_gml_id,
            "sourceObjectContinuity": "verified-id" if exact else "unverified",
            "requiredFeatures": target["requiredFeatures"], "searchDistanceMetres": target["searchDistanceMetres"],
            "candidates": candidates, "appearanceStatus": "unverified", "entranceStatus": "unverified",
            "groundStatus": "unverified", "nightLightingStatus": "unverified"})
    report = {"schemaVersion": 1, "coordinateSystem": local_crs,
        "sourceOccurrences": len(source_objects["features"]), "selectedOccurrences": len(prepared),
        "method": "Join retained semantic feature IDs to decoded PLATEAU object IDs; index actual triangle-union footprints near each public approach using Shapely.",
        "inputs": [receipt(path, root) for path in [geography_path, scene_path, targets_path, objects_path]],
        "limitations": ["A repeated gml_id establishes source-object continuity; it does not verify current architecture, source photography, door positions or appearance quality.",
            "Spatial candidates may be adjacent buildings or street objects. Their proximity or footprint overlap does not establish semantic identity.",
            "Reference source geometries and approach coordinates retain their existing accuracy limits. No new surveyed height or pedestrian access is inferred."],
        "sights": records}
    output.mkdir(parents=True, exist_ok=True)
    (output / "landmark-correspondence.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    rows = ["# Six-sight source correspondence", "", "[Object-level results](landmark-correspondence.json)", "",
            "| Sight | Exact retained source ID | Spatial candidates | Appearance / entrance / ground / night |",
            "| --- | --- | ---: | --- |"]
    for record in records:
        exact = [candidate for candidate in record["candidates"] if candidate["relationship"] == "same-source-object"]
        identity = ", ".join(f"`{candidate['gmlId']}` (LOD{candidate['lod']})" for candidate in exact) or "Unverified"
        rows.append(f"| {record['sightId']} | {identity} | {len(record['candidates']) - len(exact)} | Unverified |")
    rows += ["", "Only repeated source IDs establish continuity with retained semantic features. Nearby objects remain acquisition candidates. Every required visible feature still needs assembled-view and independent reference review.", ""]
    (output / "landmark-correspondence.md").write_text("\n".join(rows))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--objects", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = match_landmarks(args.root.resolve(), args.objects.resolve(), args.output.resolve())
    print(json.dumps({"sights": len(result["sights"]),
        "exactSourceIds": sum(record["sourceObjectContinuity"] == "verified-id" for record in result["sights"])}))
