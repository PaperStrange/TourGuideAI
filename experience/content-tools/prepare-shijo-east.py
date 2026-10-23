import argparse
import copy
import hashlib
import importlib.util
import json
import math
from pathlib import Path

import networkx as nx
import numpy as np
import osm2geojson
import shapely
from shapely.geometry import LineString, Point, Polygon, mapping, shape
from shapely.ops import unary_union


def load_module(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


REVIEW = load_module("review_shijo_east", "review-shijo-east.py")
SITE = load_module("prepare_site", "prepare-site.py")
ORIGIN = REVIEW.ORIGIN


def projected(coordinates):
    result = np.array(coordinates, dtype=float, copy=True)
    result[:, 0] = (result[:, 0] - ORIGIN["longitude"]) * 91282.15
    result[:, 1] = (result[:, 1] - ORIGIN["latitude"]) * 110940.65
    return result


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n")


def render_polygons(geometry):
    normalized, _ = SITE.normalize_boolean_surface(SITE.display_geometry(geometry, .001))
    return SITE.polygon_records(normalized)


def prepare(raw_path, output):
    data, source_nodes, source_ways, graph = REVIEW.load_graph(raw_path)
    receipt = json.loads(raw_path.with_suffix(".json.receipt.json").read_text())
    if digest(raw_path) != receipt["sha256"]:
        raise ValueError("Captured OSM response does not match its receipt")
    anchors = {
        "mitsui-frontage": 4600871814,
        "nishiki-market": 5554417552,
        "nishiki-tenmangu": 354840400,
        "takase-river": 5492358876,
        "pontocho-entrance": 5248383670,
    }
    via = [4600871814, 4600871812, 5554417552, 434344433,
           11791924472, 5492358876, 5248383670, 2367201412]
    ordered = []
    for start, finish in zip(via, via[1:]):
        path = nx.shortest_path(graph, start, finish, weight="distance")
        ordered.extend(path if not ordered else path[1:])
    # 四条通的直接连接形成真实街区环路；弧线之间仅通过原始共有节点连接。
    connector = nx.shortest_path(graph, 4600871812, 11791924472, weight="distance")
    selected_pairs = set(tuple(sorted(pair)) for chain in (ordered, connector)
                         for pair in zip(chain, chain[1:]))
    selected_nodes = sorted({node for pair in selected_pairs for node in pair})
    nodes = [{"id": f"osm:node:{ident}", "sourceId": f"osm:node:{ident}",
              "longitude": source_nodes[ident]["lon"], "latitude": source_nodes[ident]["lat"],
              "x": REVIEW.local(source_nodes[ident])[0], "y": REVIEW.local(source_nodes[ident])[1],
              "height": 0, "heightOrigin": "authored-flat-display", "surveyedElevation": None,
              "sourceVersion": source_nodes[ident]["version"], "sourceTimestamp": source_nodes[ident]["timestamp"],
              "sourceTags": source_nodes[ident].get("tags", {})} for ident in selected_nodes]
    node_lookup = {node["id"]: node for node in nodes}
    edges = []
    for start, finish in sorted(selected_pairs):
        way = source_ways[graph.edges[start, finish]["wayId"]]
        tags = way.get("tags", {})
        node_ids = [f"osm:node:{ident}" for ident in (start, finish)]
        endpoints = [node_lookup[ident] for ident in node_ids]
        crossing_nodes = [node["sourceId"] for node in endpoints if node["sourceTags"].get("highway") == "crossing"]
        edges.append({"id": f"osm:way:{way['id']}:{start}:{finish}", "from": node_ids[0], "to": node_ids[1],
                      "points": [{key: node[key] for key in ("x", "y", "height")} for node in endpoints],
                      "width": 1.5, "widthOrigin": "authored-simulation-corridor", "measuredWidthMetres": None,
                      "heightOrigin": "authored-flat-display", "surveyedGrade": None,
                      "bidirectional": True, "accessible": True, "reviewed": True,
                      "reviewStatus": "source-topology-reviewed; current-access-and-grade-unverified",
                      "sourceId": f"osm:way:{way['id']}", "sourceIds": [f"osm:way:{way['id']}", *node_ids],
                      "sourceVersion": way["version"], "sourceTimestamp": way["timestamp"], "sourceTags": tags,
                      "access": {"basis": "mapped-pedestrian-way", "foot": tags.get("foot"),
                                 "motorVehicleConditional": tags.get("motor_vehicle:conditional"),
                                 "currentClosure": "unknown", "wheelchair": "unreviewed"},
                      "crossing": {"kind": tags.get("crossing") or ("mapped-crossing-node" if crossing_nodes else "none-tagged"),
                                   "sourceNodeIds": crossing_nodes},
                      "lengthMetres": math.dist(REVIEW.local(source_nodes[start]), REVIEW.local(source_nodes[finish])),
                      "geodesicLengthMetres": graph.edges[start, finish]["distance"]})
    deck_way = source_ways[1560746285]
    deck_geo = Polygon([(source_nodes[ident]["lon"], source_nodes[ident]["lat"]) for ident in deck_way["nodes"]])
    deck = shapely.transform(deck_geo, projected)
    view_geo = {"lon": 135.77152, "lat": 35.0039100}
    view_x, view_y = REVIEW.local(view_geo)
    view = {"id": "authored:shijo-bridge-view", "longitude": view_geo["lon"], "latitude": view_geo["lat"],
            "x": view_x, "y": view_y, "height": 0, "heightOrigin": "authored-flat-display",
            "surveyedElevation": None, "positionOrigin": "authored-representative-point-inside-mapped-pedestrian-area",
            "sourceIds": ["osm:way:1560746285", "osm:way:532008156"]}
    start = node_lookup["osm:node:2367201412"]
    bridge_line = LineString([(start["x"], start["y"]), (view_x, view_y)])
    if not deck.buffer(1e-8).covers(bridge_line) or deck.boundary.distance(Point(view_x, view_y)) < .75:
        raise ValueError("Authored bridge approach leaves the captured pedestrian area")
    nodes.append(view)
    node_lookup[view["id"]] = view
    bridge_edge = {"id": "authored:shijo-bridge-view-approach", "from": start["id"], "to": view["id"],
                   "points": [{key: node[key] for key in ("x", "y", "height")} for node in (start, view)],
                   "width": 1.5, "widthOrigin": "authored-simulation-corridor", "measuredWidthMetres": None,
                   "heightOrigin": "authored-flat-display", "surveyedGrade": None,
                   "bidirectional": True, "accessible": True, "reviewed": True,
                   "reviewStatus": "authored-path-contained-in-mapped-pedestrian-area; current-access-and-grade-unverified",
                   "sourceId": "osm:way:1560746285", "sourceIds": ["osm:way:1560746285", "osm:way:532008156"],
                   "sourceVersion": deck_way["version"], "sourceTimestamp": deck_way["timestamp"], "sourceTags": deck_way["tags"],
                   "access": {"basis": "mapped-public-pedestrian-area", "currentClosure": "unknown", "wheelchair": "unreviewed"},
                   "crossing": {"kind": "none-tagged", "sourceNodeIds": []}, "lengthMetres": bridge_line.length,
                   "geodesicLengthMetres": REVIEW.GEOD.inv(start["longitude"], start["latitude"], view_geo["lon"], view_geo["lat"])[2]}
    edges.append(bridge_edge)
    ordered_ids = [f"osm:node:{ident}" for ident in ordered] + [view["id"]]
    edge_lookup = {frozenset((edge["from"], edge["to"])): edge for edge in edges}
    selected_edges = [edge_lookup[frozenset(pair)] for pair in zip(ordered_ids, ordered_ids[1:])]
    length = sum(edge["lengthMetres"] for edge in selected_edges)
    if not 1000 <= length <= 2000:
        raise ValueError("The approved complete route must be between 1 and 2 km")
    route_lines = [LineString([(point["x"], point["y"]) for point in edge["points"]]) for edge in edges]
    extent = unary_union(route_lines).buffer(65, quad_segs=4)
    source = {"id": "osm-shijo-east-20261021", "url": receipt["url"], "sha256": receipt["sha256"],
              "retrievedAt": receipt["retrievedAt"], "license": "ODbL-1.0",
              "licenseUrl": "https://opendatacommons.org/licenses/odbl/1-0/", "attribution": "© OpenStreetMap contributors",
              "rawFile": "artifacts/neighborhood-20261021/world/raw/osm-map.json"}
    sight_anchors = [{"id": key, "nodeId": f"osm:node:{ident}", "approachNodeId": f"osm:node:{ident}",
                      **{field: node_lookup[f"osm:node:{ident}"][field] for field in ("x", "y", "height", "latitude", "longitude")},
                      "positionOrigin": "mapped-public-approach-node; not-an-entrance"} for key, ident in anchors.items()]
    sight_anchors.append({"id": "shijo-bridge", "nodeId": view["id"], "approachNodeId": view["id"],
                         **{field: view[field] for field in ("x", "y", "height", "latitude", "longitude", "positionOrigin")}})
    geography = {"schemaVersion": 1, "id": "shijo-east", "revision": 1,
                 "title": {"en": "Shijo, Nishiki and the rivers", "zh": "四条、锦市场与河畔"},
                 "startNodeId": "osm:node:4600871814",
                 "origin": ORIGIN, "frame": {"origin": ORIGIN, "kind": "local-tangent-equirectangular",
                     "metresPerDegreeLon": 91282.15, "metresPerDegreeLat": 110940.65,
                     "axes": "x east, y north, height up; metres", "gltfMapping": "[x,height,-y]"},
                 "bounds": {"minX": extent.bounds[0], "minY": extent.bounds[1], "maxX": extent.bounds[2], "maxY": extent.bounds[3]},
                 "geographicBounds": [135.7593, 35.0030, 135.7734, 35.0063],
                 "coverage": {"kind": "reviewed-route-topology", "metres": length, "sights": 6,
                              "currentAccess": "unverified", "terrain": "authored-flat-display"},
                 "navigation": {"kind": "route-graph", "playerRadius": .32, "nodes": nodes, "edges": edges},
                 "spawn": {**{field: nodes[0][field] for field in ("x", "y", "height")},
                           "nodeId": "osm:node:4600871814", "edgeId": selected_edges[0]["id"]},
                 "selectedRoute": {"id": "shijo-east-six-sights", "nodeIds": ordered_ids,
                                   "edgeIds": [edge["id"] for edge in selected_edges], "lengthMetres": length,
                                   "geodesicLengthMetres": sum(edge["geodesicLengthMetres"] for edge in selected_edges)},
                 "sights": sight_anchors, "source": source,
                 "heightPolicy": "All navigation uses authored level zero. Source layer tags express ordering, not surveyed metre heights.",
                 "accessLimitations": ["Current closures and crowding are unknown.", "Takakura permits motor vehicles outside its tagged restricted period.",
                                       "Nishiki operator reports incomplete mobility-aid accessibility.", "Bridge deck grade and canopy clearance remain unmeasured."],
                 "sceneFile": "scene.json", "sourceLedgerFile": "source-ledger.json"}
    spawn = node_lookup[geography["spawn"]["nodeId"]]
    geography["spawn"].update({field: spawn[field] for field in ("x", "y", "height")})
    write_json(output / "geography.json", geography)
    retained_way_ids = {int(edge["sourceId"].rsplit(":", 1)[1]) for edge in edges} | {532008156}
    retained_node_ids = {ident for way_id in retained_way_ids for ident in source_ways[way_id]["nodes"]}
    write_json(output / "sources" / "route-osm.json", {key: value for key, value in data.items() if key != "elements"} | {
        "elements": [item for item in data["elements"] if (item["type"] == "node" and item["id"] in retained_node_ids)
                     or (item["type"] == "way" and item["id"] in retained_way_ids)]})
    print(json.dumps({"file": str(output / "geography.json"), "nodes": len(nodes), "edges": len(edges),
                      "lengthMetres": length, "geodesicLengthMetres": geography["selectedRoute"]["geodesicLengthMetres"]}))
    return geography, data, extent, deck


def prepare_scene(geography, data, extent, deck, official_path, output):
    source_lookup = {SITE.source_id(item): item for item in data["elements"]}
    features, exclusions, osm_retained = [], [], {}
    canopies, osm_buildings = [], []
    route_lines = [LineString([(point["x"], point["y"]) for point in edge["points"]])
                   for edge in geography["navigation"]["edges"]]
    corridor = unary_union([line.buffer(edge["width"] / 2, quad_segs=4)
                            for line, edge in zip(route_lines, geography["navigation"]["edges"])])
    for element in data["elements"]:
        if element["type"] not in ("way", "relation"):
            continue
        tags = element.get("tags", {})
        kind = SITE.feature_kind(tags)
        if tags.get("building") == "roof":
            kind = "canopy"
        if tags.get("man_made") == "bridge":
            kind = "bridge"
        if tags.get("waterway") in ("river", "stream") and tags.get("tunnel") != "culvert":
            kind = "water"
        if kind is None or (kind == "path" and (tags.get("tunnel") == "yes" or tags.get("level", "0") != "0")):
            continue
        identifier = SITE.source_id(element)
        selected, reason = SITE.dependencies(element, source_lookup)
        if selected is None:
            exclusions.append({"sourceId": identifier, "reason": reason})
            continue
        validation_kind = "path" if "waterway" in tags else ("building" if kind in ("building", "canopy") else kind)
        reason = SITE.validate_source_rings(element, selected, validation_kind)
        if reason:
            exclusions.append({"sourceId": identifier, "reason": reason})
            continue
        converted = osm2geojson.json2shapes({"elements": copy.deepcopy(list(selected.values()))}, raise_on_failure=True)
        matches = [item["shape"] for item in converted if SITE.source_id(item["properties"]) == identifier]
        if len(matches) != 1:
            exclusions.append({"sourceId": identifier, "reason": "no-unambiguous-converted-geometry"})
            continue
        source_geometry = matches[0]
        if source_geometry.is_empty or not source_geometry.is_valid:
            exclusions.append({"sourceId": identifier, "reason": "invalid-source-geometry"})
            continue
        local = shapely.transform(source_geometry, projected)
        if not extent.intersects(local):
            continue
        osm_retained.update(selected)
        if kind == "building":
            if local.geom_type in ("Polygon", "MultiPolygon"):
                osm_buildings.append((identifier, local, tags))
            continue
        width = None
        if local.geom_type in ("LineString", "MultiLineString"):
            observed = SITE.tagged_metres(tags.get("width"))
            road_lanes = SITE.tagged_metres(tags.get("lanes"))
            authored_road_width = road_lanes * 3.2 if road_lanes else 4.5
            authored = authored_road_width if kind == "road" else (4 if kind == "water" else 2.4)
            width = {"metres": observed or authored, "origin": "observed-tag" if observed else "authored-display-width"}
            surface = local.buffer(width["metres"] / 2, quad_segs=2, cap_style="flat", join_style="mitre").intersection(extent)
        elif local.geom_type in ("Polygon", "MultiPolygon"):
            surface = local if kind in ("canopy", "bridge") else local.intersection(extent)
        else:
            continue
        if kind == "canopy":
            canopies.append((identifier, local))
        record = {"sourceId": identifier, "kind": kind, "sourceTags": tags,
                  "sourceVersion": element.get("version"), "sourceTimestamp": element.get("timestamp"),
                  "sourceGeometry": mapping(source_geometry), "geometry": mapping(local),
                  "height": {"metres": 5 if kind == "canopy" else 0, "origin": "authored-display"},
                  "topHeightMetres": {"road": -.12, "water": -2.5, "path": -.01, "bridge": -.025, "canopy": 5}.get(kind, -.02),
                  "heightOrigin": "authored-display; actual-grade-or-clearance-unknown", "width": width,
                  "navigation": "only-selected-route-graph", "polygons": render_polygons(surface)}
        if kind == "canopy":
            record["clearance"] = {"metres": 4.5, "origin": "authored-display", "measuredMetres": None}
        features.append(record)
    official = json.loads(official_path.read_text())
    official_retained, building_geometries, clashes = [], [], []
    for feature in official["features"]:
        properties = feature["properties"]
        identifier = f"kyoto-city:{properties['gml_id']}"
        solid = shape(feature["geometry"])
        faces = list(solid.geoms) if solid.geom_type == "MultiPolygon" else [solid]
        projected_faces = [shapely.force_2d(face) for face in faces if shapely.force_2d(face).area > 1e-15]
        footprint = unary_union(projected_faces)
        if footprint.is_empty or not footprint.is_valid:
            raise ValueError(f"Official LOD1 footprint cannot be derived: {identifier}")
        local = shapely.transform(footprint, projected)
        if not extent.intersects(local):
            continue
        z = shapely.get_coordinates(solid, include_z=True)[:, 2]
        source_height = float(np.max(z) - np.min(z))
        if not math.isfinite(source_height) or source_height <= 0:
            raise ValueError(f"Invalid LOD1 z range: {identifier}")
        canopy_matches = [key for key, polygon in canopies if local.intersection(polygon).area / local.area > .65]
        kind = "canopy" if canopy_matches else "building"
        mapped_matches = [{"sourceId": key, "overlapFraction": local.intersection(polygon).area / local.area,
                           "sourceTags": tags} for key, polygon, tags in osm_buildings
                          if local.intersection(polygon).area / local.area > .65]
        record = {"sourceId": identifier, "kind": kind, "sourceDataset": "kyoto-city-lod1-2025",
                  "sourceTags": properties, "sourceGeometry": mapping(footprint), "geometry": mapping(local),
                  "height": {"metres": source_height, "origin": "derived-from-official-LOD1-z-range",
                             "sourceMinimumZ": float(np.min(z)), "sourceMaximumZ": float(np.max(z)),
                             "measuredHeightAttribute": properties.get("計測高さ"),
                             "meaning": "LOD1 solid vertical extent; measured-height attribute retained independently; facade/roof proportions unreviewed"},
                  "baseHeightMetres": 0, "baseHeightOrigin": "authored-flat-display", "width": None,
                  "navigation": "unreviewed-building-interior", "osmMatches": mapped_matches,
                  "canopySourceIds": canopy_matches,
                  "architecturalReview": "LOD1 massing; detailed facade/roof/entrance requires separate reviewed references",
                  "polygons": render_polygons(local)}
        if kind == "canopy":
            record.update({"renderPolicy": "reference-only; corresponding-OSM-canopy-is-rendered",
                           "topHeightMetres": 5, "clearance": {"metres": 4.5, "origin": "authored-display", "measuredMetres": None}})
        official_retained.append(feature)
        features.append(record)
        if kind == "building":
            building_geometries.append(local)
            overlap = local.intersection(corridor)
            if overlap.area > .01:
                clashes.append({"sourceId": identifier, "overlapSquareMetres": overlap.area,
                               "centerlineDistanceMetres": min(line.distance(local) for line in route_lines),
                               "osmMatches": [match["sourceId"] for match in mapped_matches]})
    ground_buildings = unary_union(building_geometries)
    # 道路、地面与步行面分别设置高程；步行面从审阅图生成。
    surfaces = [{"id": "shijo-east:walkable", "kind": "path", "walkable": True, "topHeightMetres": 0,
                 "heightOrigin": "authored-flat-display", "polygons": render_polygons(corridor)}]
    low_surfaces = unary_union([Polygon(polygon["outer"], polygon["holes"]) for feature in features
                               if feature["kind"] in ("road", "water", "bridge") for polygon in feature["polygons"]])
    rendered_ground = extent.difference(ground_buildings).difference(corridor).difference(low_surfaces)
    surfaces.append({"id": "shijo-east:ground", "kind": "land", "walkable": False, "topHeightMetres": -.04,
                     "heightOrigin": "authored-flat-display", "polygons": render_polygons(rendered_ground)})
    landmarks = []
    for point_id, kind in ((5204263033, "torii"), (4641550774, "information-board")):
        identifier = f"osm:node:{point_id}"
        point = source_lookup[identifier]
        osm_retained[identifier] = point
        x, y = REVIEW.local(point)
        landmarks.append({"sourceId": identifier, "kind": kind, "x": x, "y": y, "height": 0,
                          "longitude": point["lon"], "latitude": point["lat"],
                          "heightOrigin": "authored-flat-display", "dimensions": None,
                          "sourceVersion": point["version"], "sourceTimestamp": point["timestamp"], "sourceTags": point.get("tags", {})})
    scene = {"schemaVersion": 1, "id": geography["id"], "revision": 1, "frame": geography["frame"],
             "origin": ORIGIN, "bounds": geography["bounds"], "features": features, "surfaces": surfaces, "landmarks": landmarks,
             "navigationFile": "geography.json", "sourceLedgerFile": "source-ledger.json",
             "missingEvidence": ["surveyed route grade", "current access", "canopy clearances", "complete individual facade measurements"],
             "representation": "source-derived-LOD1-and-OSM-with-authored-display-surfaces"}
    write_json(output / "scene.json", scene)
    write_json(output / "sources" / "scene-osm.json", {"version": "0.6", "license": "https://opendatacommons.org/licenses/odbl/1-0/",
               "attribution": "© OpenStreetMap contributors", "elements": list(osm_retained.values())})
    write_json(output / "sources" / "kyoto-lod1.geojson", {"type": "FeatureCollection", "features": official_retained})
    report = {"officialBuildings": len(official_retained), "features": len(features), "clashes": clashes,
              "excludedOSMFeatures": exclusions, "rawOSMSourceSha256": geography["source"]["sha256"],
              "officialExtractSha256": digest(official_path), "officialSource": "https://data.city.kyoto.lg.jp/resource/?id=21422"}
    write_json(output / "source-review.json", report)
    receipts = {str(ident): json.loads((official_path.parent / "raw" / f"kyoto-{ident}.zip.receipt.json").read_text())
                for ident in (20016, 20018, 21422)}
    ledger = {"schemaVersion": 1, "id": "shijo-east", "reviewedAt": "2026-10-21",
              "sources": [geography["source"],
                  {"id": "kyoto-city-lod1-2025", "url": "https://data.city.kyoto.lg.jp/resource/?id=21422",
                   "datasetUrl": "https://data.city.kyoto.lg.jp/dataset/00661/", "title": "京都市 3D都市モデル 建築物 LOD1_2025",
                   "license": "CC-BY-4.0", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
                   "attribution": "京都市 3D都市モデル（LOD1_2025）, 京都市, CC BY 4.0",
                   "datasetUpdatedAt": "2026-08-31", "sourceSurveyYear": "2025 (per-feature attributes retained)",
                   "sourceCRS": "EPSG:6674; source Z values retained separately from authored level-zero placement",
                   "retrievedAt": receipts["21422"]["retrievedAt"], "archiveSha256": receipts["21422"]["sha256"],
                   "archiveBytes": receipts["21422"]["bytes"],
                   "changes": "Selected complete LOD1 solids; derived footprint union and Z range; converted horizontal coordinates; triangulated footprints and authored flat display placement."}],
              "inspectedOfficialCoverage": [
                  {"resourceId": 20016, "url": "https://data.city.kyoto.lg.jp/resource/?id=20016",
                   "license": "CC-BY-4.0", "archiveSha256": receipts["20016"]["sha256"], "trafficAreas": 31,
                   "bounds": [135.771008, 35.003923, 135.775155, 35.006746], "usedInScene": False},
                  {"resourceId": 20018, "url": "https://data.city.kyoto.lg.jp/resource/?id=20018",
                   "license": "CC-BY-4.0", "archiveSha256": receipts["20018"]["sha256"], "bridges": 4,
                   "bounds": [135.773176, 35.005292, 135.774761, 35.005834], "usedInScene": False,
                   "coverage": "The captured LOD3 bridges do not cover Shijo Bridge."}],
              "retainedFiles": [{"file": str(path.relative_to(output)), "sha256": digest(path), "bytes": path.stat().st_size,
                                 "license": "CC-BY-4.0" if path.suffix == ".geojson" else "ODbL-1.0"}
                                for path in sorted((output / "sources").iterdir()) if path.suffix in (".json", ".geojson")],
              "sourcesForFacts": [
                  {"id": "kyoto-tourism-access", "url": "https://kyoto.travel/en/getting-around/comfortable-access-to-central-kyoto-city-nishiki-market/",
                   "supports": "Shijo via Takakura to Nishiki, and Shinkyogoku approach to Nishiki Tenmangu.", "rights": "Facts paraphrased; operator imagery and text not redistributed."},
                  {"id": "nishiki-operator", "url": "https://www.kyoto-nishiki.or.jp/en/union/",
                   "supports": "Takakura–Teramachi extent, approximately390m length,3.3m street width with some wider sections.", "rights": "Facts paraphrased; source images not redistributed."},
                  {"id": "nishiki-faq", "url": "https://www.kyoto-nishiki.or.jp/en/contact/",
                   "supports": "Public street; shop-specific hours; incomplete mobility-aid accessibility and crowding; stop when eating.", "rights": "Facts paraphrased."},
                  {"id": "nishiki-tenmangu", "url": "https://nishikitenmangu.or.jp/",
                   "supports": "Shrine faces Nishiki across Shinkyogoku; principal deity; published08:00–20:00 gate hours.", "rights": "Facts paraphrased; source images not redistributed."},
                  {"id": "pontocho-city", "url": "https://ja.kyoto.travel/komafuda/show.php?id=2203&lang=en",
                   "supports": "Shijo southern endpoint; approximately500m alley; two-storey buildings, continuous eaves and lattice details.", "rights": "Facts paraphrased; source images not redistributed."}],
              "knownSourceDifferences": [{"subject": "Nishiki hours", "osm": "Way66703315 opening_hours09:00–18:00; roof77213467210:00–18:00+",
                  "operator": "Street is public; shop hours vary.", "productRule": "Do not treat OSM hours as whole-street opening or guaranteed shop availability."}],
              "authoredPresentation": {"navigationWidthMetres": 1.5, "navigationHeightMetres": 0,
                   "roadWidth": "Tagged lane count multiplied by authored3.2m, otherwise4.5m; explicit width tags take precedence.",
                   "waterHeightMetres": -2.5, "canopyHeightMetres": 5, "canopyClearanceMetres": 4.5,
                   "facadeRoofDoor": "Separate licensed-reference review required; detailed entrance/tenant identity is unknown."},
              "geometryAudit": {"routeMetres": geography["selectedRoute"]["lengthMetres"],
                   "geodesicMetres": geography["selectedRoute"]["geodesicLengthMetres"],
                   "officialGroundBuildingCorridorOverlaps": len(clashes), "displayPrecisionMetres": .001},
              "reproduction": {"intake": "experience/content-tools/intake-shijo-east.py", "preparation": "experience/content-tools/prepare-shijo-east.py",
                   "dependencies": {"networkx": nx.__version__, "osm2geojson": osm2geojson.__version__, "shapely": shapely.__version__},
                   "officialExtraction": "ogr2ogr GeoJSON; spatial query EPSG4326 bbox135.7593,35.0030,135.7722,35.0057; full source geometry retained; selected attributes and WGS84 output"}}
    write_json(output / "source-ledger.json", ledger)
    print(json.dumps({"scene": str(output / "scene.json"), "officialBuildings": len(official_retained),
                      "features": len(features), "routeClashes": len(clashes)}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--official", type=Path)
    args = parser.parse_args()
    geography, data, extent, deck = prepare(args.source, args.output)
    if args.official:
        prepare_scene(geography, data, extent, deck, args.official, args.output)


if __name__ == "__main__":
    main()
