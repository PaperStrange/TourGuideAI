import argparse
import copy
import hashlib
import json
import math
import re
from pathlib import Path

import osm2geojson
import pyproj
import shapely
from shapely.geometry import LineString, Polygon, box, mapping
from shapely.geometry.polygon import orient
from shapely.ops import polygonize_full, unary_union


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def source_id(element):
    return f"osm:{element['type']}:{element['id']}"


def finite_number(value, name, minimum, maximum):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be a number")
    if not math.isfinite(value) or not minimum <= value <= maximum:
        raise ValueError(f"{name} is outside [{minimum}, {maximum}]")
    return float(value)


def tagged_metres(value):
    if value is None:
        return None
    text = str(value).strip().removesuffix(" m").strip()
    if not re.fullmatch(r"[+]?\d+(?:\.\d+)?", text):
        return None
    number = float(text)
    return number if math.isfinite(number) and 0 < number <= 500 else None


def feature_kind(tags):
    if tags.get("building") not in (None, "no"):
        return "building"
    if tags.get("natural") == "water" or "water" in tags:
        return "water"
    if tags.get("leisure") in ("park", "garden") or tags.get("landuse") in ("grass", "forest"):
        return "green"
    if tags.get("highway") in ("pedestrian", "footway", "path", "steps", "cycleway"):
        return "path"
    if tags.get("highway") in ("primary", "secondary", "tertiary", "residential", "living_street", "service", "unclassified"):
        return "road"
    return None


def polygon_records(geometry):
    if geometry.is_empty or geometry.area <= 0:
        return []
    polygons = [geometry] if isinstance(geometry, Polygon) else list(geometry.geoms)
    result = []
    for item in polygons:
        if not isinstance(item, Polygon):
            continue
        polygon = orient(item, sign=1)
        prepared = list(shapely.constrained_delaunay_triangles(polygon).geoms)
        # 共线交点产生的数值退化三角形单独记录，不交给 Blender 建立无面积面。
        triangles = [triangle for triangle in prepared if triangle.area > 1e-12]
        removed_triangles = [triangle.area for triangle in prepared if triangle.area <= 1e-12]
        if not triangles:
            raise ValueError("Display polygon has no nondegenerate triangles")
        covered = unary_union(triangles)
        if covered.symmetric_difference(polygon).area > max(1e-7, polygon.area * 1e-9):
            raise ValueError("Triangulation does not preserve the polygon and its holes")
        # 显示轮廓由实际保留的面组成，退化尖刺不能留在审阅轮廓中。
        rendered = [covered] if isinstance(covered, Polygon) else list(covered.geoms)
        assigned = 0
        for component in rendered:
            if not isinstance(component, Polygon) or not component.is_valid:
                raise ValueError("Triangulation produced invalid rendered topology")
            boundary = orient(component, sign=1)
            faces = [triangle for triangle in triangles if component.covers(triangle.representative_point())]
            assigned += len(faces)
            result.append({
                "outer": [list(point) for point in boundary.exterior.coords],
                "holes": [[list(point) for point in ring.coords] for ring in boundary.interiors],
                "triangles": [[list(point) for point in triangle.exterior.coords[:-1]] for triangle in faces],
                "areaSquareMetres": boundary.area,
                "omittedNumericalTriangleAreasSquareMetres": removed_triangles,
            })
        if assigned != len(triangles):
            raise ValueError("Every retained triangle must belong to one rendered component")
    return result


def height_record(tags, policy):
    observed = tagged_metres(tags.get("height"))
    if observed is not None:
        return {"metres": observed, "origin": "observed", "sourceTag": "height", "sourceValue": tags["height"]}
    levels = tagged_metres(tags.get("building:levels"))
    if levels is not None and levels * policy["storeyHeightMetres"] <= 500:
        return {"metres": levels * policy["storeyHeightMetres"], "origin": "derived-with-authored-policy",
                "sourceTag": "building:levels", "sourceValue": tags["building:levels"],
                "authoredStoreyHeightMetres": policy["storeyHeightMetres"]}
    return {"metres": policy["defaultBuildingHeightMetres"], "origin": "authored",
            "reason": "No supported source height or floor count", "sourceHeight": tags.get("height")}


def display_geometry(geometry, precision):
    # 输入仅量化一次；布尔运算使用完整精度，使相邻显示区域共享同一交点。
    return shapely.set_precision(shapely.set_precision(geometry, precision), 0)


def normalize_boolean_surface(surface):
    # GEOS 布尔交点的浮点误差按纳米以下尺度清理；原始地理数据保持完整。
    tolerance = 1e-10
    minimum_area = 1e-10
    components = [surface] if isinstance(surface, Polygon) else list(surface.geoms)
    kept, removed = [], []
    for component in components:
        if not isinstance(component, Polygon):
            continue
        if component.area <= minimum_area:
            removed.append(component.area)
            continue
        cleaned = component.simplify(tolerance, preserve_topology=True)
        if not cleaned.is_valid or cleaned.is_empty:
            raise ValueError("Boolean surface normalization produced invalid geometry")
        kept.append(cleaned)
    result = unary_union(kept)
    return result, {"toleranceMetres": tolerance, "minimumPolygonAreaSquareMetres": minimum_area,
                    "removedPolygonAreasSquareMetres": removed,
                    "areaChangeSquareMetres": surface.symmetric_difference(result).area}


def dependencies(element, lookup):
    selected = {source_id(element): element}
    if element["type"] == "way":
        if len(element.get("nodes", [])) < 2:
            return None, "insufficient-way-nodes"
        for reference in element["nodes"]:
            node = lookup.get(f"osm:node:{reference}")
            if node is None:
                return None, "missing-way-node"
            selected[source_id(node)] = node
    elif element["type"] == "relation":
        if element.get("tags", {}).get("type") != "multipolygon":
            return None, "unsupported-relation-type"
        members = element.get("members", [])
        if not members:
            return None, "missing-relation-members"
        for member in members:
            if member["type"] != "way" or member.get("role") not in ("outer", "inner", ""):
                return None, "unsupported-relation-member"
            way = lookup.get(f"osm:way:{member['ref']}")
            if way is None:
                return None, "missing-relation-member"
            required, reason = dependencies(way, lookup)
            if required is None:
                return None, reason
            selected.update(required)
    else:
        return None, "unsupported-element-type"
    return selected, None


def validate_source_rings(element, selected, kind):
    def coordinates(way):
        return [(finite_number(selected[f"osm:node:{reference}"]["lon"], "node longitude", -180, 180),
                 finite_number(selected[f"osm:node:{reference}"]["lat"], "node latitude", -85, 85))
                for reference in way["nodes"]]

    if element["type"] == "way":
        points = coordinates(element)
        if kind in ("building", "water", "green") or element.get("tags", {}).get("area") == "yes":
            if points[0] != points[-1] or len(points) < 4:
                return "open-surface-ring"
            if not Polygon(points).is_valid or Polygon(points).area <= 0:
                return "invalid-source-ring"
        return None

    # osm2geojson 会修复部分无效轮廓；转换前验证原始环，保留数据错误的可见性。
    rings = {"outer": [], "inner": []}
    for member in element["members"]:
        points = coordinates(selected[f"osm:way:{member['ref']}"])
        role = member.get("role") or "outer"
        rings[role].append(LineString(points))
    areas = {}
    for role, lines in rings.items():
        if not lines:
            areas[role] = Polygon()
            continue
        polygons, cuts, dangles, invalid = polygonize_full(lines)
        if not all(part.is_empty for part in (cuts, dangles, invalid)) or polygons.is_empty:
            return "invalid-relation-rings"
        areas[role] = unary_union(polygons.geoms)
    if areas["outer"].is_empty or (not areas["inner"].is_empty and not areas["outer"].covers(areas["inner"])):
        return "invalid-relation-holes"
    return None


def prepare_site(site_path):
    site_path = Path(site_path).resolve()
    config_bytes = site_path.read_bytes()
    config = json.loads(config_bytes)
    if config.get("version") != 1 or config.get("review", {}).get("representation") != "geographic-context":
        raise ValueError("Only version 1 geographic-context site definitions are supported")
    if not config.get("identity") or not config.get("id") or not config.get("title", {}).get("en"):
        raise ValueError("Site identity, id and title are required")
    source = config["source"]
    for key in ("sha256", "url", "retrievedAt", "license", "attribution"):
        if not isinstance(source.get(key), str) or not source[key].strip():
            raise ValueError(f"Source {key} is required")
    source_path = (site_path.parent / source["file"]).resolve()
    raw = source_path.read_bytes()
    if sha256(raw) != source["sha256"]:
        raise ValueError("Source SHA-256 does not match the reviewed snapshot")
    if source.get("format") != "osm-xml":
        raise ValueError("The current adapter requires a captured OSM XML snapshot")

    longitude = finite_number(config["origin"]["longitude"], "origin longitude", -180, 180)
    latitude = finite_number(config["origin"]["latitude"], "origin latitude", -85, 85)
    west, south, east, north = config["bounds"]
    if not (-180 <= west < east <= 180 and -85 <= south < north <= 85):
        raise ValueError("Bounds must be ordered WGS84 coordinates without an antimeridian crossing")
    if not (west <= longitude <= east and south <= latitude <= north):
        raise ValueError("The local origin must lie inside the site bounds")
    projection = pyproj.CRS.from_proj4(f"+proj=aeqd +lat_0={latitude} +lon_0={longitude} +datum=WGS84 +units=m +no_defs")
    projector = pyproj.Transformer.from_crs("EPSG:4326", projection, always_xy=True)
    geographic_bounds = box(west, south, east, north)
    original_local_bounds = shapely.transform(geographic_bounds, projector.transform, interleaved=False)
    radius = finite_number(config["limits"]["radiusMetres"], "radiusMetres", 10, 2000)
    if any(math.hypot(x, y) > radius for x, y in original_local_bounds.exterior.coords):
        raise ValueError("Site bounds exceed the reviewed local radius")
    policy = config["authoredPolicy"]
    display_precision = finite_number(policy["displayPrecisionMetres"], "displayPrecisionMetres", .0001, .001)
    local_bounds = display_geometry(original_local_bounds, display_precision)
    for key in ("defaultBuildingHeightMetres", "storeyHeightMetres", "roadWidthMetres", "pathWidthMetres", "windowSpacingMetres"):
        finite_number(policy[key], key, .1, 100)

    parsed = osm2geojson.parse_xml(raw.decode("utf-8"))
    lookup = {source_id(element): element for element in parsed["elements"]}
    if config["identity"] not in lookup:
        raise ValueError("The required site identity is absent from its source snapshot")
    excluded, pending, consumed_ways = [], [], set()
    for element in lookup.values():
        tags = element.get("tags", {})
        if element["type"] == "relation" and tags.get("type") == "building":
            missing = [f"osm:{member['type']}:{member['ref']}" for member in element.get("members", [])
                       if f"osm:{member['type']}:{member['ref']}" not in lookup]
            excluded.append({"sourceId": source_id(element),
                             "reason": "incomplete-building-assembly" if missing else "building-assembly-requires-architectural-review",
                             "missingMembers": missing})
        elif tags.get("building:part") not in (None, "no") and not feature_kind(tags):
            excluded.append({"sourceId": source_id(element), "reason": "building-part-requires-architectural-review"})
    candidates = [element for element in lookup.values() if element["type"] in ("way", "relation") and feature_kind(element.get("tags", {}))]
    candidates.sort(key=lambda item: (item["type"] != "relation", source_id(item)))
    for element in candidates:
        identifier = source_id(element)
        if identifier in consumed_ways and identifier != config["identity"]:
            continue
        kind, tags = feature_kind(element["tags"]), element["tags"]
        selected, reason = dependencies(element, lookup)
        if selected is None:
            excluded.append({"sourceId": identifier, "reason": reason})
            continue
        if kind == "building" and element["type"] == "way" and element["nodes"][0] != element["nodes"][-1]:
            excluded.append({"sourceId": identifier, "reason": "open-building-ring"})
            continue
        reason = validate_source_rings(element, selected, kind)
        if reason:
            excluded.append({"sourceId": identifier, "reason": reason})
            continue
        # 每个要素独立转换，完整依赖由已捕获的数据提供，不补造缺失节点。
        shapes = osm2geojson.json2shapes({"elements": copy.deepcopy(list(selected.values()))}, raise_on_failure=True)
        matches = [item["shape"] for item in shapes if source_id(item["properties"]) == identifier]
        if len(matches) != 1:
            raise ValueError(f"Converter did not return exactly one geometry for {identifier}")
        geometry = matches[0]
        if geometry.is_empty or not geometry.is_valid:
            excluded.append({"sourceId": identifier, "reason": "invalid-source-geometry"})
            continue
        if not geographic_bounds.intersects(geometry):
            excluded.append({"sourceId": identifier, "reason": "outside-site-bounds"})
            continue
        if geometry.geom_type not in ("Polygon", "MultiPolygon", "LineString", "MultiLineString"):
            excluded.append({"sourceId": identifier, "reason": "unsupported-geometry"})
            continue
        if kind == "building" and geometry.geom_type not in ("Polygon", "MultiPolygon"):
            excluded.append({"sourceId": identifier, "reason": "building-is-not-polygonal"})
            continue
        local = shapely.transform(geometry, projector.transform, interleaved=False)
        if not all(math.isfinite(value) for value in local.bounds):
            raise ValueError(f"Non-finite projected geometry for {identifier}")
        # 建筑保留完整轮廓；跨越边界的建筑记录排除，避免制作被截断的立面。
        if kind == "building" and not original_local_bounds.covers(local):
            excluded.append({"sourceId": identifier, "reason": "building-crosses-site-boundary"})
            continue
        width = None
        if local.geom_type in ("LineString", "MultiLineString"):
            if kind not in ("road", "path"):
                excluded.append({"sourceId": identifier, "reason": "surface-is-not-polygonal"})
                continue
            observed_width = tagged_metres(tags.get("width"))
            width = {"metres": observed_width or policy["roadWidthMetres" if kind == "road" else "pathWidthMetres"],
                     "origin": "observed" if observed_width else "authored", "sourceValue": tags.get("width")}
            surface = display_geometry(local.buffer(width["metres"] / 2, quad_segs=2, cap_style="flat", join_style="mitre"), display_precision).intersection(local_bounds)
        else:
            surface = display_geometry(local, display_precision).intersection(local_bounds)
        if surface.is_empty or surface.area <= 0:
            excluded.append({"sourceId": identifier, "reason": "no-surface-inside-bounds"})
            continue
        record = {"sourceId": identifier, "sourceVersion": element.get("version"), "sourceTimestamp": element.get("timestamp"),
                  "kind": kind, "sourceTags": tags, "sourceGeometry": mapping(geometry), "geometry": mapping(local),
                  "height": height_record(tags, policy) if kind == "building" else {"metres": .02, "origin": "authored"},
                  "width": width, "navigation": "unreviewed", "_surface": surface}
        if kind == "building":
            record["architecturalReview"] = "required: footprint/maximum-height massing only; roof, building parts, facade and ground levels are unreviewed"
        pending.append(record)
        if element["type"] == "relation":
            consumed_ways.update(f"osm:way:{member['ref']}" for member in element["members"]
                                 if feature_kind(selected[f"osm:way:{member['ref']}"].get("tags", {})) in (None, kind))

    if not any(item["sourceId"] == config["identity"] for item in pending):
        reason = next((item["reason"] for item in excluded if item["sourceId"] == config["identity"]), "not-supported")
        raise ValueError(f"Required site identity cannot be represented: {reason}")
    priorities = {"building": 0, "path": 1, "road": 2, "water": 3, "green": 4}
    pending.sort(key=lambda item: (priorities[item["kind"]], item["sourceId"] != config["identity"], item["sourceId"]))
    covered = Polygon()
    features, geographic_features, numeric_cleanup = [], [], []
    for record in pending:
        surface = record.pop("_surface")
        if record["kind"] == "building" and surface.intersection(covered).area > 1e-5:
            excluded.append({"sourceId": record["sourceId"], "reason": "overlapping-building-footprints-require-review"})
            continue
        surface, cleanup = normalize_boolean_surface(surface.difference(covered))
        if cleanup["areaChangeSquareMetres"] or cleanup["removedPolygonAreasSquareMetres"]:
            numeric_cleanup.append({"sourceId": record["sourceId"], **cleanup})
        if surface.is_empty:
            excluded.append({"sourceId": record["sourceId"], "reason": "surface-covered-by-prior-display-layer"})
            continue
        record["polygons"] = polygon_records(surface)
        if not record["polygons"]:
            excluded.append({"sourceId": record["sourceId"], "reason": "no-polygonal-surface"})
            continue
        features.append(record)
        covered = unary_union([covered, surface])
        geographic_features.append({"type": "Feature", "id": record["sourceId"], "geometry": record["sourceGeometry"],
                                   "properties": {key: record[key] for key in ("sourceId", "sourceVersion", "sourceTimestamp", "kind", "sourceTags", "height", "width", "navigation")}})
    source_record = {key: value for key, value in source.items() if key != "file"}
    scene = {"version": 1, "id": config["id"], "title": config["title"], "countryCode": config["countryCode"],
             "identity": config["identity"], "representation": "geographic-context", "navigation": "unreviewed",
             "origin": config["origin"], "source": source_record, "configSha256": sha256(config_bytes),
             "projection": {"sourceCRS": "EPSG:4326", "localCRS": projection.to_wkt(), "axisOrder": "longitude, latitude",
                            "localAxes": "x east, y north, z height; metres", "gltfMapping": "[x, height, -y]"},
             "bounds": list(local_bounds.bounds), "ground": polygon_records(local_bounds), "features": features,
             "geographicBounds": config["bounds"],
             "displayPrecisionMetres": display_precision,
             "surfacePolicy": "Authored display order: building, path, road, water, green. Complete source geometry is retained; displayed surfaces are disjoint. Grade and overlapping buildings require review.",
             "authoredPolicy": policy, "limits": config["limits"]}
    review = {"version": 1, "siteId": config["id"], "source": source_record, "configSha256": sha256(config_bytes),
              "tools": {"osm2geojson": osm2geojson.__version__, "shapely": shapely.__version__, "pyproj": pyproj.__version__},
              "representation": "geographic-context", "navigation": "unreviewed", "landmarkArchitecture": "unreviewed",
              "displayPrecisionMetres": display_precision,
              "booleanSurfaceNormalization": numeric_cleanup,
              "features": len(features), "buildings": sum(item["kind"] == "building" for item in features),
              "courtyards": sum(len(polygon["holes"]) for item in features if item["kind"] == "building" for polygon in item["polygons"]),
              "authoredBuildingHeights": [item["sourceId"] for item in features if item["kind"] == "building" and item["height"]["origin"] == "authored"],
              "excluded": sorted(excluded, key=lambda item: item["sourceId"]),
              "missingEvidence": ["surveyed elevation/grade", "reviewed walking/access graph", "source-matched landmark silhouette", "reviewed facade/roof details", "actual lighting/occupancy"],
              "policy": policy}
    return {"scene": scene, "review": review, "geojson": {"type": "FeatureCollection", "features": geographic_features}}


def main():
    parser = argparse.ArgumentParser(description="Audit captured geographic context for the Blender site workbench")
    parser.add_argument("--site", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    arguments = parser.parse_args()
    result = prepare_site(arguments.site)
    arguments.output.mkdir(parents=True, exist_ok=True)
    for key, filename in (("scene", "context.json"), ("review", "review.json"), ("geojson", "source.geojson")):
        (arguments.output / filename).write_text(json.dumps(result[key], ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"id": result["scene"]["id"], "features": result["review"]["features"], "buildings": result["review"]["buildings"], "courtyards": result["review"]["courtyards"], "excluded": len(result["review"]["excluded"])}))


if __name__ == "__main__":
    main()
