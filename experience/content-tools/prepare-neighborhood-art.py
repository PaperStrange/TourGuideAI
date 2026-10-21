import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path

import shapely
from shapely.geometry import LineString, Polygon, box
from shapely.ops import nearest_points, unary_union


spec = importlib.util.spec_from_file_location("prepare_site", Path(__file__).with_name("prepare-site.py"))
SITE = importlib.util.module_from_spec(spec)
spec.loader.exec_module(SITE)


def polygons(geometry):
    normalized, _ = SITE.normalize_boolean_surface(geometry)
    return SITE.polygon_records(normalized)


def record_geometry(records):
    return unary_union([Polygon(item["outer"], item["holes"]) for item in records])


def walkable_materials(scene):
    roads = [(feature["sourceId"], record_geometry(feature["polygons"]))
             for feature in scene["features"] if feature["kind"] == "road"]
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
                             "materialBasis": "Frozen OSM-derived display road polygons; tagged or authored display widths remain unchanged."})
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scene", type=Path, required=True)
    parser.add_argument("--geography", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
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
    material_surfaces, material_audits = walkable_materials(scene)
    after = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
    if before != after:
        raise ValueError("Canonical source changed during art preparation")
    result = {"schemaVersion": 1, "id": scene["id"], "sourceHashes": before, "cellSizeMetres": size,
              "purpose": "Derived art selection; source geometry and navigation remain unchanged.",
              "facadeSelection": {"maximumDistanceMetres": args.facade_distance, "orientation": "outer edge normal faces nearest route point", "occlusion": "untested"},
              "roofSections": roof_sections, "buildings": facade_selection, "roofUnionAudit": audits,
              "walkableMaterialSurfaces": material_surfaces, "walkableMaterialAudit": material_audits,
              "canonicalUnchanged": True, "tools": {"shapely": shapely.__version__}}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"file": str(args.output), "roofSections": len(roof_sections), "buildings": len(facade_selection),
                      "selectedEdges": sum(len(item["routeFacingEdges"]) for item in facade_selection),
                      "walkableMaterialSurfaces": len(material_surfaces), "walkableMaterialAudit": material_audits}))


if __name__ == "__main__":
    main()
