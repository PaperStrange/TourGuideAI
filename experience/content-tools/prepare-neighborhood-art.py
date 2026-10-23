import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path

import numpy as np
import shapely
from shapely.geometry import LineString, Point, Polygon, box, shape
from shapely.geometry.polygon import orient
from shapely.ops import nearest_points, unary_union


spec = importlib.util.spec_from_file_location("prepare_site", Path(__file__).with_name("prepare-site.py"))
SITE = importlib.util.module_from_spec(spec)
spec.loader.exec_module(SITE)


def polygons(geometry):
    normalized, _ = SITE.normalize_boolean_surface(geometry)
    return SITE.polygon_records(normalized)


def record_geometry(records):
    return unary_union([Polygon(item["outer"], item["holes"]) for item in records])


def display_polygons(geometry):
    records = polygons(geometry)
    result, omitted = [], []
    for record in records:
        kept = []
        for triangle in record["triangles"]:
            coordinates = np.asarray(triangle, dtype=np.float32).astype(np.float64)
            a, b = coordinates[1] - coordinates[0], coordinates[2] - coordinates[0]
            if a[0] * b[1] - a[1] * b[0] == 0:
                omitted.append({"triangle": triangle, "areaSquareMetres": Polygon(triangle).area})
            else:
                kept.append(Polygon(triangle))
        if len(kept) == len(record["triangles"]):
            result.append(record)
            continue
        # 只清理实际 float32 零面积面；展示轮廓随保留的 GEOS 三角形同步。
        covered = unary_union(kept)
        components = [covered] if isinstance(covered, Polygon) else list(covered.geoms)
        for component in components:
            boundary = orient(component, sign=1)
            triangles = [triangle for triangle in kept if component.covers(triangle.representative_point())]
            result.append({"outer": [list(point) for point in boundary.exterior.coords],
                           "holes": [[list(point) for point in ring.coords] for ring in boundary.interiors],
                           "triangles": [[list(point) for point in triangle.exterior.coords[:-1]] for triangle in triangles],
                           "areaSquareMetres": boundary.area,
                           "omittedNumericalTriangleAreasSquareMetres": record["omittedNumericalTriangleAreasSquareMetres"]})
    before, after = record_geometry(records), record_geometry(result)
    loss, distance = before.symmetric_difference(after).area, before.hausdorff_distance(after)
    if loss > 1e-5 or distance > 1e-5:
        raise ValueError("Float32 display cleanup exceeds the explicit tiny numerical tolerance")
    return result, {"omittedTriangles": omitted, "areaDifferenceSquareMetres": loss,
                    "hausdorffDistanceMetres": distance,
                    "maximumAreaDifferenceSquareMetres": 1e-5, "maximumBoundaryDifferenceMetres": 1e-5}


def display_materials(scene, reviewed_path):
    reviewed = json.loads(reviewed_path.read_text())
    for item in (reviewed["model"], reviewed["world"]):
        if hashlib.sha256(Path(item["file"]).read_bytes()).hexdigest() != item["sha256"]:
            raise ValueError("Reviewed road input hash changed")
    bounds = reviewed["world"]["bounds"]
    extent = box(bounds["minX"], bounds["minY"], bounds["maxX"], bounds["maxY"])
    road_tops = unary_union([Polygon(triangle) for mesh in reviewed["meshes"] if mesh["kind"] == "road" for triangle in mesh["triangles"]])
    sidewalk_tops = unary_union([Polygon(triangle) for mesh in reviewed["meshes"] if mesh["kind"] == "sidewalk" for triangle in mesh["triangles"]])
    mask = road_tops.difference(sidewalk_tops).intersection(extent)
    if not mask.is_valid or mask.is_empty:
        raise ValueError("Reviewed original road mask is invalid")
    surfaces, asphalt_masks = [], [(reviewed["id"], mask)]

    def add(source, geometry, material, suffix):
        if geometry.is_empty or geometry.area <= 1e-10:
            return
        source_id = source.get("sourceId", source.get("id"))
        records, float_audit = display_polygons(geometry)
        surfaces.append({"id": source_id + ":" + suffix, "sourceId": source_id,
                         "surfaceId": source.get("surfaceId", source.get("id")),
                         "kind": source["kind"], "walkable": False, "material": material,
                         "topHeightMetres": source["topHeightMetres"],
                         "heightOrigin": source.get("heightOrigin", "authored-display"),
                         "polygons": records, "float32DisplayAudit": float_audit,
                         "materialBasis": "Frozen source surface tags and reviewed authored roadway display mask; navigation unchanged."})

    retained = {"sourceId": reviewed["id"], "kind": "road", "topHeightMetres": -.12}
    add(retained, mask, "asphalt", "road")
    covered_roads = mask
    for source in scene["features"]:
        if source["kind"] != "road":
            continue
        original = record_geometry(source["polygons"])
        # 原场景范围内使用经审阅的实际显示面，范围外保留冻结的道路展示几何。
        geometry = original.difference(extent).difference(covered_roads)
        tags = source.get("sourceTags", {})
        material = "paving" if tags.get("surface") in ("paving_stones", "sett", "cobblestone") or tags.get("highway") == "pedestrian" else "asphalt"
        add(source, geometry, material, "road")
        covered_roads = covered_roads.union(geometry)
        if material == "asphalt":
            asphalt_masks.append((source["sourceId"], geometry))
    for source in scene["features"]:
        if source["kind"] == "path" and source.get("sourceTags", {}).get("surface") == "asphalt":
            asphalt_masks.append((source["sourceId"], record_geometry(source["polygons"])))
    asphalt_area = unary_union([geometry for _, geometry in asphalt_masks])
    covered_paths = Polygon()
    for source in scene["features"]:
        if source["kind"] != "path":
            continue
        geometry = record_geometry(source["polygons"]).difference(covered_paths)
        add(source, geometry.intersection(asphalt_area), "asphalt", "path-asphalt")
        add(source, geometry.difference(asphalt_area), "paving", "path-paving")
        covered_paths = covered_paths.union(geometry)
    for source in scene["surfaces"]:
        if not source.get("walkable"):
            add(source, record_geometry(source["polygons"]).difference(mask), "paving", "land")
    audit = {"input": reviewed, "inputFile": str(reviewed_path),
             "inputSha256": hashlib.sha256(reviewed_path.read_bytes()).hexdigest(),
             "bounds": bounds, "maskAreaSquareMetres": mask.area, "polygons": polygons(mask),
             "sidewalkSubtractionAreaSquareMetres": road_tops.intersection(sidewalk_tops).intersection(extent).area,
             "canonicalGeometryChanged": False,
             "meaning": "Bounded original authored visual road plan, minus raised sidewalk top faces; no surveyed width or navigation claim."}
    return surfaces, asphalt_masks, audit


def walkable_materials(scene, roads):
    road_area = unary_union([geometry for _, geometry in roads])
    surfaces, audits = [], []
    for source in scene["surfaces"]:
        if not source.get("walkable"):
            continue
        original = record_geometry(source["polygons"])
        rendered = []
        # 材质分界沿用冻结的道路展示面；导航范围与标高保持原值。
        for material, geometry in (("asphalt", original.intersection(road_area)),
                                   ("paving", original.difference(road_area))):
            if geometry.is_empty:
                continue
            records = polygons(geometry)
            result = record_geometry(records)
            rendered.append(result)
            surfaces.append({"id": source["id"] + ":" + material,
                             "sourceId": source["id"], "surfaceId": source["id"],
                             "kind": source["kind"], "walkable": True, "material": material,
                             "topHeightMetres": source["topHeightMetres"],
                             "heightOrigin": source["heightOrigin"], "polygons": records,
                             "roadSourceIds": [identifier for identifier, road in roads
                                               if result.intersection(road).area > 1e-10] if material == "asphalt" else [],
                             "materialBasis": "Frozen OSM surface tags and bounded original reviewed road mask; all widths retain their source or authored classification."})
        combined = unary_union(rendered)
        difference = combined.symmetric_difference(original).area
        boundary_error = combined.hausdorff_distance(original)
        overlap = sum(part.area for part in rendered) - combined.area
        if difference > 1e-7 or boundary_error > 1e-8 or abs(overlap) > 1e-7:
            raise ValueError(f"Material partition changed walking geometry: {source['id']}")
        audits.append({"surfaceId": source["id"], "originalAreaSquareMetres": original.area,
                       "renderedAreaSquareMetres": combined.area,
                       "unionDifferenceSquareMetres": difference, "overlapSquareMetres": overlap,
                       "hausdorffDistanceMetres": boundary_error,
                       "topHeightMetres": source["topHeightMetres"], "canonicalGeometryChanged": False})
    return surfaces, audits


def line_parts(geometry):
    if geometry.geom_type == "LineString":
        return [geometry]
    if hasattr(geometry, "geoms"):
        return [line for part in geometry.geoms for line in line_parts(part)]
    return []


def arcade_connections(scene, size):
    roof_source = next(feature for feature in scene["features"] if feature["sourceId"] == "osm:way:772134672")
    roof = record_geometry(roof_source["polygons"])
    maximum_span = 6.0
    buildings = [(feature, record_geometry(feature["polygons"])) for feature in scene["features"]
                 if feature["kind"] == "building"]
    near_buildings = [(feature, footprint) for feature, footprint in buildings if footprint.distance(roof) <= maximum_span]
    building_area = unary_union([footprint for _, footprint in near_buildings])
    blockers = []
    for feature in scene["features"]:
        if feature["kind"] == "road":
            blockers.append(record_geometry(feature["polygons"]))
        elif feature["kind"] == "path" and feature["geometry"]["type"] == "LineString":
            coordinates = feature["geometry"]["coordinates"]
            if abs(coordinates[-1][1] - coordinates[0][1]) > abs(coordinates[-1][0] - coordinates[0][0]):
                blockers.append(record_geometry(feature["polygons"]))
    blocked = unary_union(blockers)
    edges = []
    x_values = {point[0] for polygon in roof_source["polygons"] for point in polygon["outer"]}
    for feature, _ in near_buildings:
        for polygon_index, polygon in enumerate(feature["polygons"]):
            for edge_index, (a, b) in enumerate(zip(polygon["outer"], polygon["outer"][1:])):
                dx, dy = b[0] - a[0], b[1] - a[1]
                length = math.hypot(dx, dy)
                if length <= .05 or abs(dx) / length < .5:
                    continue
                line = LineString([a, b])
                if line.distance(roof) > maximum_span:
                    continue
                normal_y = -dx / length
                edges.append({"sourceId": feature["sourceId"], "polygonIndex": polygon_index,
                              "edgeIndex": edge_index, "from": a, "to": b, "normalY": normal_y,
                              "height": feature["height"], "line": line})
                x_values.update((a[0], b[0]))
    x_values = sorted(x for x in x_values if roof.bounds[0] <= x <= roof.bounds[2])
    grouped, rejected = {}, []
    for left, right in zip(x_values, x_values[1:]):
        if right - left <= 1e-8:
            continue
        x = (left + right) / 2
        section = roof.intersection(LineString([(x, roof.bounds[1] - 1), (x, roof.bounds[3] + 1)]))
        if section.is_empty:
            continue
        low, high = section.bounds[1], section.bounds[3]
        mid_y = (low + high) / 2
        roof_piece = roof.intersection(box(left, roof.bounds[1] - 1, right, roof.bounds[3] + 1))
        for side, boundary in (("north", high), ("south", low)):
            candidates = []
            for edge in edges:
                a, b = edge["from"], edge["to"]
                if not min(a[0], b[0]) <= x <= max(a[0], b[0]):
                    continue
                y = a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1])
                gap = y - boundary if side == "north" else boundary - y
                facing = edge["normalY"] < 0 if side == "north" else edge["normalY"] > 0
                if facing and gap >= -1e-7:
                    candidates.append((gap, edge))
            if not candidates:
                continue
            gap, edge = min(candidates, key=lambda item: item[0])
            if gap > maximum_span:
                rejected.append({"fromX": left, "toX": right, "side": side, "gapMetres": gap})
                continue
            a, b = edge["from"], edge["to"]
            attached = [(xx, a[1] + (xx - a[0]) / (b[0] - a[0]) * (b[1] - a[1])) for xx in (left, right)]
            facade = LineString(attached)
            side_box = box(left, mid_y if side == "north" else roof.bounds[1] - maximum_span,
                           right, roof.bounds[3] + maximum_span if side == "north" else mid_y)
            patch = unary_union([roof_piece, facade]).convex_hull.intersection(side_box).difference(roof).difference(building_area).difference(blocked)
            components = [patch] if isinstance(patch, Polygon) else list(patch.geoms)
            retained = [part for part in components if isinstance(part, Polygon) and part.area > 1e-8
                        and part.distance(facade) < 1e-7 and part.distance(roof) < 1e-7]
            if not retained:
                continue
            key = (edge["sourceId"], edge["polygonIndex"], edge["edgeIndex"])
            group = grouped.setdefault(key, {"edge": edge, "patches": [], "side": side, "maximumSpanMetres": 0})
            group["patches"].extend(retained)
            group["maximumSpanMetres"] = max(group["maximumSpanMetres"], gap)
    selected, sections, all_patches = [], [], []
    for group in grouped.values():
        edge = group["edge"]
        patch = unary_union(group["patches"])
        selected.append({key: edge[key] for key in ("sourceId", "polygonIndex", "edgeIndex", "from", "to", "height")} |
                        {"nearestRoofSourceId": roof_source["sourceId"], "distanceMetres": edge["line"].distance(roof),
                         "side": group["side"], "maximumAuthoredSpanMetres": group["maximumSpanMetres"]})
        min_x, min_y, max_x, max_y = patch.bounds
        for cell_x in range(math.floor(min_x / size), math.floor(max_x / size) + 1):
            for cell_y in range(math.floor(min_y / size), math.floor(max_y / size) + 1):
                clipped = patch.intersection(box(cell_x * size, cell_y * size, (cell_x + 1) * size, (cell_y + 1) * size))
                if clipped.is_empty or clipped.area <= 1e-8:
                    continue
                records, float_audit = display_polygons(clipped)
                segments = []
                for line in line_parts(edge["line"].intersection(clipped.buffer(1e-8))):
                    start, end = list(line.coords[0]), list(line.coords[-1])
                    if edge["line"].project(Point(start)) > edge["line"].project(Point(end)):
                        start, end = end, start
                    if math.dist(start, end) > 1e-5:
                        segments.append({"from": start, "to": end, "buildingSourceId": edge["sourceId"],
                                         "polygonIndex": edge["polygonIndex"], "edgeIndex": edge["edgeIndex"]})
                sections.append({"sourceId": roof_source["sourceId"], "cellX": cell_x, "cellY": cell_y,
                                 "polygons": records, "facadeSegments": segments,
                                 "buildingSourceId": edge["sourceId"], "float32DisplayAudit": float_audit,
                                 "constructionOrigin": "authored connection between retained roof and adjacent building boundaries",
                                 "heightOrigin": "authored; no measured soffit height"})
                all_patches.append(record_geometry(records))
    joined = unary_union(all_patches)
    if joined.intersection(blocked).area > 1e-6 or joined.intersection(building_area).area > 1e-6 or joined.intersection(roof).area > 1e-6:
        raise ValueError("Arcade connections overlap protected source surfaces")
    audit = {"roofSourceId": roof_source["sourceId"], "maximumAuthoredConnectionMetres": maximum_span,
             "constructionWidthsObserved": False, "heightObserved": False,
             "roofGeometryChanged": False, "buildingGeometryChanged": False,
             "crossStreetOverlapSquareMetres": joined.intersection(blocked).area,
             "buildingOverlapSquareMetres": joined.intersection(building_area).area,
             "sourceRoofOverlapSquareMetres": joined.intersection(roof).area,
             "connectionAreaSquareMetres": joined.area, "facadeEdgeCount": len(selected),
             "sectionCount": len(sections), "unjoinedLargeGaps": rejected,
             "limits": "Connections are authored visual interpretation of separately mapped roof and LOD1 boundaries; source gaps outside this policy remain open."}
    return selected, sections, audit


def water_banks(scene):
    land = unary_union([record_geometry(surface["polygons"]) for surface in scene["surfaces"] if not surface.get("walkable")])
    waters = [(feature, record_geometry(feature["polygons"])) for feature in scene["features"] if feature["kind"] == "water"]
    all_water = unary_union([geometry for _, geometry in waters])
    segments, reviews = [], []
    for feature, water in waters:
        source = shape(feature["geometry"])
        if source.geom_type in ("Polygon", "MultiPolygon"):
            eligible_boundary = source.boundary
            basis = "mapped-water-area-boundary"
        elif feature.get("sourceTags", {}).get("name") == "高瀬川":
            half_width = feature["width"]["metres"] / 2
            eligible_boundary = unary_union([source.offset_curve(half_width, join_style="mitre"), source.offset_curve(-half_width, join_style="mitre")])
            basis = "source-centerline-with-existing-authored-water-width; endcaps-excluded"
        else:
            reviews.append({"sourceId": feature["sourceId"], "bankSegments": 0,
                            "reason": "Centerline-derived water does not supply an additional outer bank boundary."})
            continue
        shared = water.boundary.intersection(land.buffer(.002)).intersection(all_water.boundary.buffer(.002))
        count, length = 0, 0
        for polygon in feature["polygons"]:
            for ring in [polygon["outer"], *polygon["holes"]]:
                for a, b in zip(ring, ring[1:]):
                    edge = LineString([a, b])
                    for part in line_parts(edge.intersection(shared.buffer(1e-8))):
                        if part.length <= .01 or part.interpolate(.5, normalized=True).distance(eligible_boundary) > .002:
                            continue
                        start, end = list(part.coords[0]), list(part.coords[-1])
                        if edge.project(Point(start)) > edge.project(Point(end)):
                            start, end = end, start
                        segments.append({"sourceId": feature["sourceId"], "from": start, "to": end,
                                         "waterOnLeft": True, "topHeightMetres": -.04,
                                         "bottomHeightMetres": feature["topHeightMetres"],
                                         "heightOrigin": "existing authored display levels; actual bank profile unmeasured",
                                         "boundaryBasis": basis})
                        count += 1
                        length += part.length
        reviews.append({"sourceId": feature["sourceId"], "bankSegments": count, "bankLengthMetres": length,
                        "landDistanceMetres": water.distance(land),
                        "sharedPlanBoundaryMetres": water.boundary.intersection(land.boundary).length,
                        "diagnosis": "Plan areas touch; a vertical display transition is required between authored ground and water heights."})
    return segments, {"sourceAndNavigationChanged": False, "displayExtentCapsExcluded": True,
                      "bankHeightsObserved": False, "features": reviews}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scene", type=Path, required=True)
    parser.add_argument("--geography", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--reviewed-road", type=Path, required=True)
    parser.add_argument("--cell-size", type=float, default=100)
    parser.add_argument("--facade-distance", type=float, default=25)
    args = parser.parse_args()
    if not 80 <= args.cell_size <= 120 or not 0 < args.facade_distance <= 100:
        raise ValueError("Unsupported reviewed cell size or facade selection distance")
    paths = (args.scene, args.geography)
    if args.scene.name == args.geography.name:
        raise ValueError("Scene and geography need distinct source names")
    before = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
    scene, geography = json.loads(args.scene.read_text()), json.loads(args.geography.read_text())
    if scene["id"] != geography["id"] or scene["frame"] != geography["frame"]:
        raise ValueError("Scene and route must share identity and coordinate frame")
    route = unary_union([LineString([(point["x"], point["y"]) for point in edge["points"]])
                         for edge in geography["navigation"]["edges"]])
    roof_sections, facade_selection, audits = [], [], []
    size = args.cell_size
    for feature in scene["features"]:
        footprint = unary_union([Polygon(item["outer"], item["holes"]) for item in feature["polygons"]])
        if feature["kind"] == "canopy" and not feature.get("renderPolicy", "").startswith("reference-only"):
            min_x, min_y, max_x, max_y = footprint.bounds
            parts = []
            for cell_x in range(math.floor(min_x / size), math.floor(max_x / size) + 1):
                for cell_y in range(math.floor(min_y / size), math.floor(max_y / size) + 1):
                    clipped = footprint.intersection(box(cell_x * size, cell_y * size, (cell_x + 1) * size, (cell_y + 1) * size))
                    if clipped.is_empty or clipped.area <= 1e-10:
                        continue
                    records = polygons(clipped)
                    parts.extend(Polygon(item["outer"], item["holes"]) for item in records)
                    roof_sections.append({"sourceId": feature["sourceId"], "cellX": cell_x, "cellY": cell_y, "polygons": records})
            error = unary_union(parts).symmetric_difference(footprint).area
            if error > max(1e-7, footprint.area * 1e-9):
                raise ValueError(f"Canopy section union changed source plan: {feature['sourceId']}")
            audits.append({"sourceId": feature["sourceId"], "areaSquareMetres": footprint.area, "unionDifferenceSquareMetres": error})
        elif feature["kind"] == "building":
            selected_edges = []
            for polygon_index, polygon in enumerate(feature["polygons"]):
                for edge_index, (a, b) in enumerate(zip(polygon["outer"], polygon["outer"][1:])):
                    line = LineString([a, b])
                    length = line.length
                    if length <= 1e-8 or line.distance(route) > args.facade_distance:
                        continue
                    midpoint = line.interpolate(.5, normalized=True)
                    route_point = nearest_points(midpoint, route)[1]
                    normal = [(b[1] - a[1]) / length, (a[0] - b[0]) / length]
                    toward_route = [route_point.x - midpoint.x, route_point.y - midpoint.y]
                    if sum(normal[index] * toward_route[index] for index in (0, 1)) <= 1e-8:
                        continue
                    selected_edges.append({"polygonIndex": polygon_index, "edgeIndex": edge_index,
                                           "from": a, "to": b, "lengthMetres": length,
                                           "distanceToRouteMetres": line.distance(route), "outwardNormal": normal,
                                           "nearestRoutePoint": [route_point.x, route_point.y]})
            facade_selection.append({"sourceId": feature["sourceId"], "distanceToRouteMetres": footprint.distance(route),
                                     "routeFacingEdges": selected_edges})
    display_surfaces, asphalt_masks, road_audit = display_materials(scene, args.reviewed_road)
    material_surfaces, material_audits = walkable_materials(scene, asphalt_masks)
    arcade_edges, soffit_sections, arcade_audit = arcade_connections(scene, size)
    bank_segments, bank_audit = water_banks(scene)
    after = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
    if before != after:
        raise ValueError("Canonical source changed during art preparation")
    result = {"schemaVersion": 1, "id": scene["id"], "sourceHashes": before, "cellSizeMetres": size,
              "purpose": "Derived art selection; source geometry and navigation remain unchanged.",
              "facadeSelection": {"maximumDistanceMetres": args.facade_distance, "orientation": "outer edge normal faces nearest route point", "occlusion": "untested"},
              "roofSections": roof_sections, "buildings": facade_selection, "roofUnionAudit": audits,
              "walkableMaterialSurfaces": material_surfaces, "walkableMaterialAudit": material_audits,
              "displayMaterialSurfaces": display_surfaces, "reviewedRoadMask": road_audit,
              "arcadeFacadeEdges": arcade_edges, "arcadeSoffitSections": soffit_sections,
              "arcadeGeometryAudit": arcade_audit, "waterBankSegments": bank_segments, "waterBoundaryAudit": bank_audit,
              "canonicalUnchanged": True, "tools": {"shapely": shapely.__version__}}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"file": str(args.output), "roofSections": len(roof_sections), "buildings": len(facade_selection),
                      "selectedEdges": sum(len(item["routeFacingEdges"]) for item in facade_selection),
                      "walkableMaterialSurfaces": len(material_surfaces), "walkableMaterialAudit": material_audits}))


if __name__ == "__main__":
    main()
