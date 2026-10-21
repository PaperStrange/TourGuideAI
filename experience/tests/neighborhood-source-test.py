import hashlib
import json
import math
from functools import lru_cache
from pathlib import Path
import unittest

import numpy as np
from pyproj import Geod
import shapely
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import unary_union


ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = ROOT / "experience/src/neighborhoods/shijo-east"
GEOD = Geod(ellps="WGS84")
EXPECTED_ANCHORS = {
    "mitsui-frontage": "osm:node:4600871814",
    "nishiki-market": "osm:node:5554417552",
    "nishiki-tenmangu": "osm:node:434344433",
    "takase-river": "osm:node:5492358876",
    "pontocho-entrance": "osm:node:5248383670",
    "shijo-bridge": "authored:shijo-bridge-view",
}


@lru_cache(maxsize=None)
def read(name):
    return json.loads((DIRECTORY / name).read_bytes())


def elements(document):
    return {f"osm:{item['type']}:{item['id']}": item for item in document["elements"]}


def projected(coordinates):
    # 使用声明的坐标系核对原始坐标；测地距离另用 pyproj 独立计算。
    frame = read("geography.json")["frame"]
    result = np.array(coordinates, dtype=float, copy=True)
    result[:, 0] = (result[:, 0] - frame["origin"]["longitude"]) * frame["metresPerDegreeLon"]
    result[:, 1] = (result[:, 1] - frame["origin"]["latitude"]) * frame["metresPerDegreeLat"]
    return result


def display_shape(item):
    return unary_union([Polygon(value["outer"], value["holes"]) for value in item["polygons"]])


@lru_cache(maxsize=None)
def corridor():
    return unary_union([LineString([(point["x"], point["y"]) for point in edge["points"]])
                        .buffer(edge["width"] / 2, quad_segs=4)
                        for edge in read("geography.json")["navigation"]["edges"]])


class NeighborhoodSourceTests(unittest.TestCase):
    def test_retained_source_bytes_match_the_portable_licensed_ledger(self):
        ledger = read("source-ledger.json")
        geography = read("geography.json")
        self.assertEqual(ledger["id"], geography["id"])
        self.assertEqual(next(item for item in ledger["sources"] if item["id"] == geography["source"]["id"]), geography["source"])
        self.assertEqual({entry["file"] for entry in ledger["retainedFiles"]},
                         {"sources/route-osm.json", "sources/scene-osm.json", "sources/kyoto-lod1.geojson"})
        for entry in ledger["retainedFiles"]:
            with self.subTest(file=entry["file"]):
                path = (DIRECTORY / entry["file"]).resolve()
                self.assertTrue(path.is_relative_to(DIRECTORY))
                payload = path.read_bytes()
                self.assertEqual(len(payload), entry["bytes"])
                self.assertEqual(hashlib.sha256(payload).hexdigest(), entry["sha256"])
                self.assertIn(entry["license"], ("ODbL-1.0", "CC-BY-4.0"))
        for source in ledger["sources"]:
            self.assertTrue(source["url"].startswith("https://"))
            self.assertTrue(source["licenseUrl"].startswith("https://"))
            self.assertTrue(source["attribution"])
            self.assertRegex(source["retrievedAt"], r"^2026-10-21T")
        self.assertEqual(read("scene.json")["frame"], geography["frame"])
        self.assertEqual(read("source-review.json")["rawOSMSourceSha256"], geography["source"]["sha256"])

    def test_selected_source_ways_retain_complete_original_nodes(self):
        capture = read("sources/route-osm.json")
        lookup = elements(capture)
        self.assertIn("OpenStreetMap", capture["copyright"])
        self.assertIn("odbl", capture["license"])
        self.assertEqual(len(lookup), len(capture["elements"]))
        for identifier, element in lookup.items():
            with self.subTest(source=identifier):
                self.assertGreater(element["version"], 0)
                self.assertRegex(element["timestamp"], r"^\d{4}-\d{2}-\d{2}T")
                if element["type"] == "way":
                    self.assertGreaterEqual(len(element["nodes"]), 2)
                    for reference in element["nodes"]:
                        self.assertIn(f"osm:node:{reference}", lookup)

    def test_navigation_nodes_preserve_source_identity_and_coordinate_precision(self):
        geography = read("geography.json")
        lookup = elements(read("sources/route-osm.json"))
        for node in geography["navigation"]["nodes"]:
            with self.subTest(node=node["id"]):
                self.assertTrue(all(math.isfinite(node[key]) for key in ("x", "y", "height", "latitude", "longitude")))
                if node["id"].startswith("osm:"):
                    original = lookup[node["sourceId"]]
                    self.assertEqual(node["sourceId"], node["id"])
                    self.assertEqual((node["longitude"], node["latitude"]), (original["lon"], original["lat"]))
                    self.assertEqual(node["sourceVersion"], original["version"])
                    self.assertEqual(node["sourceTimestamp"], original["timestamp"])
                    self.assertEqual(node["sourceTags"], original.get("tags", {}))
                expected = projected([[node["longitude"], node["latitude"]]])[0]
                self.assertAlmostEqual(node["x"], expected[0], places=8)
                self.assertAlmostEqual(node["y"], expected[1], places=8)
                self.assertLessEqual(geography["bounds"]["minX"], node["x"])
                self.assertLessEqual(node["x"], geography["bounds"]["maxX"])
                self.assertLessEqual(geography["bounds"]["minY"], node["y"])
                self.assertLessEqual(node["y"], geography["bounds"]["maxY"])

    def test_mapped_edges_follow_original_adjacent_way_nodes(self):
        geography = read("geography.json")
        lookup = elements(read("sources/route-osm.json"))
        nodes = {node["id"]: node for node in geography["navigation"]["nodes"]}
        authored = []
        for edge in geography["navigation"]["edges"]:
            with self.subTest(edge=edge["id"]):
                original = lookup[edge["sourceId"]]
                self.assertEqual(edge["sourceVersion"], original["version"])
                self.assertEqual(edge["sourceTimestamp"], original["timestamp"])
                self.assertEqual(edge["sourceTags"], original.get("tags", {}))
                self.assertEqual(edge["points"], [{key: nodes[identifier][key] for key in ("x", "y", "height")}
                                                  for identifier in (edge["from"], edge["to"])])
                if edge["id"].startswith("authored:"):
                    authored.append(edge["id"])
                    continue
                pair = {int(identifier.rsplit(":", 1)[1]) for identifier in (edge["from"], edge["to"])}
                self.assertTrue(any(pair == {start, finish} for start, finish in zip(original["nodes"], original["nodes"][1:])))
                self.assertNotIn(original.get("tags", {}).get("access"), ("private", "no"))
                self.assertNotIn(original.get("tags", {}).get("foot"), ("private", "no"))
                self.assertNotEqual(original.get("tags", {}).get("indoor"), "yes")
        self.assertEqual(authored, ["authored:shijo-bridge-view-approach"])

    def test_route_lengths_match_independent_wgs84_measurement(self):
        geography = read("geography.json")
        nodes = {node["id"]: node for node in geography["navigation"]["nodes"]}
        edges = {edge["id"]: edge for edge in geography["navigation"]["edges"]}
        for edge in edges.values():
            with self.subTest(edge=edge["id"]):
                start, finish = nodes[edge["from"]], nodes[edge["to"]]
                geodesic = GEOD.inv(start["longitude"], start["latitude"], finish["longitude"], finish["latitude"])[2]
                local = math.hypot(finish["x"] - start["x"], finish["y"] - start["y"])
                self.assertAlmostEqual(edge["geodesicLengthMetres"], geodesic, places=6)
                self.assertAlmostEqual(edge["lengthMetres"], local, places=6)
                self.assertLess(abs(local - geodesic), 0.05)
        route = geography["selectedRoute"]
        total = sum(edges[identifier]["geodesicLengthMetres"] for identifier in route["edgeIds"])
        self.assertAlmostEqual(route["geodesicLengthMetres"], total, places=6)
        self.assertGreaterEqual(total, 1000)
        self.assertLessEqual(total, 2000)
        self.assertLess(abs(route["lengthMetres"] - total), 0.25)

    def test_six_external_observation_points_are_on_the_selected_continuous_route(self):
        geography = read("geography.json")
        nodes = {node["id"]: node for node in geography["navigation"]["nodes"]}
        edges = {edge["id"]: edge for edge in geography["navigation"]["edges"]}
        route = geography["selectedRoute"]
        self.assertEqual({sight["id"]: sight["nodeId"] for sight in geography["sights"]}, EXPECTED_ANCHORS)
        self.assertEqual(len(route["nodeIds"]), len(route["edgeIds"]) + 1)
        for start, finish, identifier in zip(route["nodeIds"], route["nodeIds"][1:], route["edgeIds"]):
            self.assertEqual({start, finish}, {edges[identifier]["from"], edges[identifier]["to"]})
        order = []
        for sight in geography["sights"]:
            node = nodes[sight["nodeId"]]
            order.append(route["nodeIds"].index(sight["nodeId"]))
            for key in ("x", "y", "height", "latitude", "longitude"):
                self.assertEqual(sight[key], node[key])
            if sight["nodeId"].startswith("osm:"):
                self.assertEqual(sight["positionOrigin"], "mapped-public-approach-node; not-an-entrance")
        self.assertEqual(order, sorted(order))
        self.assertEqual(geography["startNodeId"], geography["spawn"]["nodeId"])
        self.assertEqual(geography["startNodeId"], route["nodeIds"][0])

    def test_bridge_approach_and_view_use_the_actual_mapped_pedestrian_polygon(self):
        geography = read("geography.json")
        lookup = elements(read("sources/route-osm.json"))
        way = lookup["osm:way:1560746285"]
        self.assertEqual(way["nodes"][0], way["nodes"][-1])
        self.assertEqual(way["tags"]["highway"], "pedestrian")
        original = Polygon([(lookup[f"osm:node:{identifier}"]["lon"], lookup[f"osm:node:{identifier}"]["lat"])
                            for identifier in way["nodes"]])
        deck = shapely.transform(original, projected)
        self.assertTrue(deck.is_valid)
        edge = next(edge for edge in geography["navigation"]["edges"] if edge["id"] == "authored:shijo-bridge-view-approach")
        line = LineString([(point["x"], point["y"]) for point in edge["points"]])
        self.assertTrue(deck.covers(line))
        self.assertGreaterEqual(deck.boundary.distance(Point(line.coords[-1])), edge["width"] / 2)
        self.assertEqual(edge["sourceIds"], ["osm:way:1560746285", "osm:way:532008156"])

    def test_authored_grade_width_and_unverified_access_remain_explicit(self):
        geography = read("geography.json")
        self.assertEqual(geography["coverage"]["currentAccess"], "unverified")
        self.assertEqual(geography["coverage"]["terrain"], "authored-flat-display")
        for node in geography["navigation"]["nodes"]:
            self.assertEqual(node["height"], 0)
            self.assertEqual(node["heightOrigin"], "authored-flat-display")
            self.assertIsNone(node["surveyedElevation"])
        for edge in geography["navigation"]["edges"]:
            with self.subTest(edge=edge["id"]):
                self.assertEqual(edge["widthOrigin"], "authored-simulation-corridor")
                self.assertIsNone(edge["measuredWidthMetres"])
                self.assertIsNone(edge["surveyedGrade"])
                self.assertEqual(edge["access"]["currentClosure"], "unknown")
                self.assertEqual(edge["access"]["wheelchair"], "unreviewed")
                self.assertIn("current-access-and-grade-unverified", edge["reviewStatus"])

    def test_official_building_footprints_heights_and_attributes_remain_traceable(self):
        source = read("sources/kyoto-lod1.geojson")
        originals = {f"kyoto-city:{item['properties']['gml_id']}": item for item in source["features"]}
        retained = [item for item in read("scene.json")["features"] if item.get("sourceDataset") == "kyoto-city-lod1-2025"]
        self.assertEqual({item["sourceId"] for item in retained}, set(originals))
        for feature in retained:
            with self.subTest(source=feature["sourceId"]):
                original = originals[feature["sourceId"]]
                self.assertEqual(feature["sourceTags"], original["properties"])
                solid = shape(original["geometry"])
                faces = list(solid.geoms) if solid.geom_type == "MultiPolygon" else [solid]
                footprint = unary_union([shapely.force_2d(face) for face in faces if shapely.force_2d(face).area > 1e-15])
                self.assertTrue(shape(feature["sourceGeometry"]).equals(footprint))
                expected = shapely.transform(footprint, projected)
                self.assertTrue(shape(feature["geometry"]).equals_exact(expected, 1e-7))
                elevations = shapely.get_coordinates(solid, include_z=True)[:, 2]
                self.assertTrue(np.isfinite(elevations).all())
                height = feature["height"]
                self.assertAlmostEqual(height["metres"], float(np.max(elevations) - np.min(elevations)), places=8)
                self.assertEqual(height["sourceMinimumZ"], float(np.min(elevations)))
                self.assertEqual(height["sourceMaximumZ"], float(np.max(elevations)))
                self.assertEqual(height["measuredHeightAttribute"], original["properties"].get("計測高さ"))
                self.assertEqual(feature["baseHeightOrigin"], "authored-flat-display")
                self.assertIn("requires separate reviewed references", feature["architecturalReview"])

    def test_complete_walking_corridor_has_no_building_footprint_overlap(self):
        buildings = [feature for feature in read("scene.json")["features"] if feature["kind"] == "building"]
        self.assertGreater(len(buildings), 0)
        for feature in buildings:
            with self.subTest(source=feature["sourceId"]):
                overlap = corridor().intersection(shape(feature["geometry"])).area
                self.assertLessEqual(overlap, 1e-8)

    def test_scene_osm_identity_and_source_geometry_remain_unmodified(self):
        lookup = elements(read("sources/scene-osm.json"))
        for feature in read("scene.json")["features"]:
            if not feature["sourceId"].startswith("osm:"):
                continue
            with self.subTest(source=feature["sourceId"]):
                original = lookup[feature["sourceId"]]
                self.assertEqual(feature["sourceVersion"], original["version"])
                self.assertEqual(feature["sourceTimestamp"], original["timestamp"])
                self.assertEqual(feature["sourceTags"], original.get("tags", {}))
                expected = shapely.transform(shape(feature["sourceGeometry"]), projected)
                self.assertTrue(shape(feature["geometry"]).equals_exact(expected, 1e-7))
                self.assertEqual(feature["navigation"], "only-selected-route-graph")

    def test_display_triangles_preserve_polygon_holes_and_declared_precision(self):
        scene = read("scene.json")
        tolerance = read("source-ledger.json")["geometryAudit"]["displayPrecisionMetres"]
        self.assertLessEqual(tolerance, 0.001)
        for feature in scene["features"] + scene["surfaces"]:
            identifier = feature.get("sourceId", feature.get("id"))
            with self.subTest(source=identifier):
                for record in feature["polygons"]:
                    polygon = Polygon(record["outer"], record["holes"])
                    self.assertTrue(polygon.is_valid)
                    self.assertGreater(polygon.area, 0)
                    triangles = [Polygon(points) for points in record["triangles"]]
                    self.assertTrue(all(triangle.is_valid and triangle.area > 0 for triangle in triangles))
                    union = unary_union(triangles)
                    self.assertLessEqual(union.symmetric_difference(polygon).area, 1e-7)
                    self.assertLessEqual(abs(sum(triangle.area for triangle in triangles) - union.area), 1e-7)
                    for hole in record["holes"]:
                        self.assertLessEqual(union.intersection(Polygon(hole)).area, 1e-7)
                if feature.get("sourceDataset") == "kyoto-city-lod1-2025":
                    original = shape(feature["geometry"])
                    actual = display_shape(feature)
                    self.assertLessEqual(actual.hausdorff_distance(original), tolerance)
                    self.assertLessEqual(actual.symmetric_difference(original).area, original.length * tolerance + tolerance ** 2)

    def test_actual_walkable_surface_covers_every_reviewed_centerline(self):
        surfaces = [value for value in read("scene.json")["surfaces"] if value["walkable"]]
        self.assertEqual(len(surfaces), 1)
        surface = display_shape(surfaces[0])
        self.assertTrue(surface.is_valid)
        self.assertEqual(surfaces[0]["topHeightMetres"], 0)
        for edge in read("geography.json")["navigation"]["edges"]:
            line = LineString([(point["x"], point["y"]) for point in edge["points"]])
            self.assertTrue(surface.covers(line), edge["id"])
        self.assertLess(surface.symmetric_difference(corridor()).area, corridor().length * 0.001)


if __name__ == "__main__":
    unittest.main(verbosity=2)
