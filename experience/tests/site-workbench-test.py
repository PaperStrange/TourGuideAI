import copy
import hashlib
import importlib.util
import json
import math
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from urllib.parse import parse_qs, urlparse
import xml.etree.ElementTree as ET

from pyproj import Geod, Transformer
from shapely import transform
from shapely.geometry import Polygon, shape
from shapely.ops import unary_union


REPOSITORY = Path(__file__).resolve().parents[2]
PREPARER = REPOSITORY / "experience/content-tools/prepare-site.py"
SITE_DIRECTORY = REPOSITORY / "experience/content/sites"
RESEARCH = REPOSITORY / "experience/evidence/global-sites-20261021/research"
SCRATCH = REPOSITORY / "artifacts/site-workbench-tests"
SITE_IDS = ("delft-markt", "helsinki-senate")
COURTYARDS = ("1331997", "1331998", "1688738", "2105743", "7193165")
specification = importlib.util.spec_from_file_location("prepare_site_module", PREPARER)
preparer = importlib.util.module_from_spec(specification)
specification.loader.exec_module(preparer)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, allow_nan=False)


@lru_cache(maxsize=None)
def source(site_id):
    path = SITE_DIRECTORY / f"{site_id}.json"
    config = json.loads(path.read_bytes())
    raw_path = (path.parent / config["source"]["file"]).resolve()
    raw = raw_path.read_bytes()
    root = ET.fromstring(raw)
    elements = {f"osm:{element.tag}:{element.attrib['id']}": element
                for element in root if element.tag in ("node", "way", "relation")}
    return {"path": path, "config": config, "raw_path": raw_path, "raw": raw,
            "root": root, "elements": elements}


@lru_cache(maxsize=None)
def prepared(site_id):
    return preparer.prepare_site(source(site_id)["path"])


def raw_ring(capture, way_id):
    way = capture["elements"][f"osm:way:{way_id}"]
    points = []
    for reference in way.findall("nd"):
        node = capture["elements"][f"osm:node:{reference.attrib['ref']}"]
        points.append((float(node.attrib["lon"]), float(node.attrib["lat"])))
    if len(points) < 4 or points[0] != points[-1]:
        raise ValueError(f"The captured fixture is not a complete closed ring: {way_id}")
    return points


def raw_courtyard(capture, relation_id):
    # 这五个真实样本各含一个闭合外环；不实现通用 OSM relation 转换器。
    relation = capture["elements"][f"osm:relation:{relation_id}"]
    outer = [member.attrib["ref"] for member in relation.findall("member") if member.attrib["role"] == "outer"]
    inner = [member.attrib["ref"] for member in relation.findall("member") if member.attrib["role"] == "inner"]
    if len(outer) != 1 or not inner:
        raise ValueError(f"Unexpected courtyard fixture structure: {relation_id}")
    return Polygon(raw_ring(capture, outer[0]), [raw_ring(capture, way_id) for way_id in inner])


def polygons(feature):
    return [Polygon(item["outer"], item["holes"]) for item in feature["polygons"]]


def feature(result, identifier):
    return next(item for item in result["scene"]["features"] if item["sourceId"] == identifier)


@contextmanager
def config_copy(site_id, change=None, root=None, raw=None):
    capture = source(site_id)
    SCRATCH.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="source-case-", dir=SCRATCH) as directory:
        directory = Path(directory)
        config = copy.deepcopy(capture["config"])
        payload = raw if raw is not None else ET.tostring(root, encoding="utf-8") if root is not None else capture["raw"]
        (directory / "capture.osm").write_bytes(payload)
        config["source"]["file"] = "capture.osm"
        config["source"]["sha256"] = digest(payload)
        if change is not None:
            change(config)
        path = directory / "site.json"
        path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        yield path


class SiteWorkbenchTests(unittest.TestCase):
    def assert_same_geometry(self, actual, expected, tolerance):
        self.assertTrue(actual.is_valid)
        self.assertFalse(actual.is_empty)
        self.assertLessEqual(actual.hausdorff_distance(expected), tolerance)
        self.assertLessEqual(actual.symmetric_difference(expected).area, max(tolerance, expected.area * 1e-9))

    def assert_display_geometry(self, actual, expected, scene):
        precision = scene["displayPrecisionMetres"]
        self.assertTrue(math.isfinite(precision) and 0 < precision <= .001)
        self.assertTrue(actual.is_valid)
        self.assertFalse(actual.is_empty)
        self.assertLessEqual(actual.hausdorff_distance(expected), precision + 1e-9)
        self.assertLessEqual(actual.symmetric_difference(expected).area,
                             expected.length * precision + math.pi * precision ** 2)

    def test_actual_snapshot_and_feature_provenance_reach_all_outputs(self):
        retrievals = {item["id"]: item for item in json.loads((RESEARCH / "retrievals.json").read_bytes())}
        for site_id in SITE_IDS:
            with self.subTest(site=site_id):
                capture, result = source(site_id), prepared(site_id)
                expected = retrievals[site_id]
                self.assertEqual(digest(capture["raw"]), expected["sha256"])
                self.assertEqual(len(capture["raw"]), expected["bytes"])
                for document in (result["scene"], result["review"]):
                    self.assertEqual(document["source"]["sha256"], expected["sha256"])
                    self.assertEqual(document["source"]["url"], expected["url"])
                    self.assertEqual(document["source"]["retrievedAt"], expected["retrievedAt"])
                    self.assertEqual(document["source"]["license"], "ODbL-1.0")
                    self.assertEqual(document["source"]["attribution"], "© OpenStreetMap contributors")
                    query_bounds = [float(value) for value in parse_qs(urlparse(expected["url"]).query)["bbox"][0].split(",")]
                    self.assertEqual(document["source"]["queryBounds"], query_bounds)
                    self.assertEqual(document["configSha256"], digest(capture["path"].read_bytes()))
                    self.assertEqual(document["representation"], "geographic-context")
                    self.assertEqual(document["navigation"], "unreviewed")
                self.assertEqual(result["review"]["landmarkArchitecture"], "unreviewed")
                exported = {item["id"]: item for item in result["geojson"]["features"]}
                self.assertEqual(result["geojson"]["type"], "FeatureCollection")
                self.assertEqual(set(exported), {item["sourceId"] for item in result["scene"]["features"]})
                for item in result["scene"]["features"]:
                    original = capture["elements"][item["sourceId"]]
                    self.assertEqual(item["sourceVersion"], int(original.attrib["version"]))
                    self.assertEqual(item["sourceTimestamp"], original.attrib["timestamp"])
                    self.assertEqual(item["sourceTags"], {tag.attrib["k"]: tag.attrib["v"] for tag in original.findall("tag")})
                    self.assertEqual(exported[item["sourceId"]]["geometry"], item["sourceGeometry"])
                    self.assertEqual(exported[item["sourceId"]]["properties"]["navigation"], "unreviewed")

    def test_landmark_footprints_retain_actual_nodes_and_reported_heights(self):
        for site_id, height, node_count in (("delft-markt", 20, 41), ("helsinki-senate", 59, 40)):
            with self.subTest(site=site_id):
                capture, result = source(site_id), prepared(site_id)
                identifier = capture["config"]["identity"]
                item = feature(result, identifier)
                original = Polygon(raw_ring(capture, identifier.rsplit(":", 1)[1]))
                self.assertEqual(len(original.exterior.coords), node_count)
                self.assert_same_geometry(shape(item["sourceGeometry"]), original, 1e-11)
                self.assert_display_geometry(unary_union(polygons(item)), shape(item["geometry"]), result["scene"])
                self.assertEqual(item["height"], {"metres": height, "origin": "observed", "sourceTag": "height", "sourceValue": str(height)})
                self.assertNotIn("roof:shape", item["sourceTags"])
                self.assertNotIn("building:levels", item["sourceTags"])

    def test_projection_has_actual_east_north_metre_scale_and_inverse(self):
        geodesic = Geod(ellps="WGS84")
        for site_id in SITE_IDS:
            with self.subTest(site=site_id):
                result = prepared(site_id)
                scene = result["scene"]
                origin = scene["origin"]
                inverse = Transformer.from_crs(scene["projection"]["localCRS"], "EPSG:4326", always_xy=True)
                self.assertEqual(scene["projection"]["gltfMapping"], "[x, height, -y]")
                for item in scene["features"]:
                    restored = transform(shape(item["geometry"]), inverse.transform, interleaved=False)
                    self.assertLess(restored.hausdorff_distance(shape(item["sourceGeometry"])), 1e-9)
                    for polygon in item["polygons"]:
                        for x, y in polygon["outer"]:
                            longitude, latitude = inverse.transform(x, y)
                            azimuth, _, distance = geodesic.inv(origin["longitude"], origin["latitude"], longitude, latitude)
                            self.assertAlmostEqual(x, distance * math.sin(math.radians(azimuth)), delta=0.002)
                            self.assertAlmostEqual(y, distance * math.cos(math.radians(azimuth)), delta=0.002)

    def test_render_surfaces_are_finite_bounded_and_disjoint(self):
        for site_id in SITE_IDS:
            with self.subTest(site=site_id):
                scene = prepared(site_id)["scene"]
                left, bottom, right, top = scene["bounds"]
                precision = scene["displayPrecisionMetres"]
                self.assertIn("disjoint", scene["surfacePolicy"])
                displayed = []
                for item in scene["features"]:
                    for polygon in item["polygons"]:
                        for ring in [polygon["outer"], *polygon["holes"]]:
                            for x, y in ring:
                                self.assertTrue(math.isfinite(x) and math.isfinite(y))
                                self.assertLessEqual(math.hypot(x, y), scene["limits"]["radiusMetres"] + precision)
                                self.assertTrue(left - precision <= x <= right + precision)
                                self.assertTrue(bottom - precision <= y <= top + precision)
                    surface = unary_union(polygons(item))
                    if item["kind"] == "building":
                        self.assert_display_geometry(surface, shape(item["geometry"]), scene)
                    for previous_id, previous in displayed:
                        self.assertLessEqual(surface.intersection(previous).area, 1e-7,
                                             f"Overlapping display surfaces: {item['sourceId']} and {previous_id}")
                    displayed.append((item["sourceId"], surface))

    def test_all_render_triangles_preserve_surface_area_and_holes(self):
        for site_id in SITE_IDS:
            for item in prepared(site_id)["scene"]["features"]:
                with self.subTest(site=site_id, feature=item["sourceId"]):
                    for record in item["polygons"]:
                        expected = Polygon(record["outer"], record["holes"])
                        triangles = [Polygon(vertices) for vertices in record["triangles"]]
                        self.assertTrue(expected.exterior.is_ccw)
                        self.assertTrue(all(not ring.is_ccw for ring in expected.interiors))
                        self.assertTrue(triangles)
                        self.assertTrue(all(triangle.is_valid and triangle.area > 0 for triangle in triangles))
                        combined = unary_union(triangles)
                        self.assert_same_geometry(combined, expected, 1e-7)
                        self.assertAlmostEqual(sum(triangle.area for triangle in triangles), expected.area, delta=max(1e-7, expected.area * 1e-9))

    def test_five_actual_courtyard_relations_keep_inner_rings(self):
        capture = source("helsinki-senate")
        for relation_id in COURTYARDS:
            original = raw_courtyard(capture, relation_id)
            self.assertTrue(original.is_valid)
            left, bottom, right, top = original.bounds

            def include_complete_relation(config):
                config["identity"] = f"osm:relation:{relation_id}"
                config["bounds"] = [left - .00002, bottom - .00002, right + .00002, top + .00002]
                config["origin"] = {"longitude": (left + right) / 2, "latitude": (bottom + top) / 2}

            with self.subTest(relation=relation_id), config_copy("helsinki-senate", include_complete_relation) as path:
                result = preparer.prepare_site(path)
                item = feature(result, f"osm:relation:{relation_id}")
                self.assert_same_geometry(shape(item["sourceGeometry"]), original, 1e-11)
                self.assertEqual(sum(len(record["holes"]) for record in item["polygons"]), len(original.interiors))
                expected_local = shape(item["geometry"])
                self.assert_display_geometry(unary_union(polygons(item)), expected_local, result["scene"])
                triangles = unary_union([Polygon(points) for record in item["polygons"] for points in record["triangles"]])
                self.assert_same_geometry(triangles, unary_union(polygons(item)), 1e-7)
                components = [expected_local] if isinstance(expected_local, Polygon) else list(expected_local.geoms)
                for component in components:
                    for ring in component.interiors:
                        hole = Polygon(ring)
                        precision = result["scene"]["displayPrecisionMetres"]
                        self.assertLessEqual(triangles.intersection(hole.buffer(-precision)).area, 1e-7)
                        self.assertLessEqual(triangles.intersection(hole).area,
                                             hole.length * precision + math.pi * precision ** 2)

    def test_missing_height_and_width_remain_explicitly_authored(self):
        authored, derived, width_count = [], [], 0
        for site_id in SITE_IDS:
            result = prepared(site_id)
            policy = source(site_id)["config"]["authoredPolicy"]
            for item in result["scene"]["features"]:
                tags = item["sourceTags"]
                if item["kind"] == "building" and "height" not in tags:
                    if "building:levels" not in tags:
                        authored.append(item["sourceId"])
                        self.assertEqual(item["height"]["origin"], "authored")
                        self.assertEqual(item["height"]["metres"], policy["defaultBuildingHeightMetres"])
                        self.assertIn(item["sourceId"], result["review"]["authoredBuildingHeights"])
                    elif tags["building:levels"].isdigit():
                        derived.append(item["sourceId"])
                        self.assertEqual(item["height"]["origin"], "derived-with-authored-policy")
                        self.assertEqual(item["height"]["sourceValue"], tags["building:levels"])
                if item["width"] is not None and "width" not in tags:
                    width_count += 1
                    self.assertEqual(item["width"]["origin"], "authored")
                    self.assertIsNone(item["width"]["sourceValue"])
                self.assertEqual(item["navigation"], "unreviewed")
        self.assertTrue(authored)
        self.assertTrue(derived)
        self.assertGreater(width_count, 0)

    def test_actual_incomplete_relations_are_reported_and_never_rendered(self):
        result = prepared("helsinki-senate")
        excluded = {item["sourceId"]: item for item in result["review"]["excluded"]}
        included = {item["sourceId"] for item in result["scene"]["features"]}
        elements = source("helsinki-senate")["elements"]
        for identifier in ("osm:relation:14659098", "osm:relation:14659097"):
            self.assertIn(identifier, elements)
            self.assertNotIn(identifier, included)
            self.assertEqual(excluded[identifier]["reason"], "incomplete-building-assembly")
            actual_missing = sorted(f"osm:{member.attrib['type']}:{member.attrib['ref']}"
                                    for member in elements[identifier].findall("member")
                                    if f"osm:{member.attrib['type']}:{member.attrib['ref']}" not in elements)
            self.assertTrue(actual_missing)
            self.assertEqual(sorted(excluded[identifier]["missingMembers"]), actual_missing)

    def test_preparation_is_deterministic_and_never_mutates_captured_files(self):
        for site_id in SITE_IDS:
            with self.subTest(site=site_id):
                capture = source(site_id)
                before = {path: digest(path.read_bytes()) for path in (capture["path"], capture["raw_path"])}
                self.assertEqual(canonical(prepared(site_id)), canonical(preparer.prepare_site(capture["path"])))
                self.assertEqual(before, {path: digest(path.read_bytes()) for path in before})

    def test_cli_emits_the_same_complete_three_outputs(self):
        SCRATCH.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="cli-", dir=SCRATCH) as directory:
            output = Path(directory) / "out"
            command = [sys.executable, str(PREPARER), "--site", str(source("delft-markt")["path"]), "--output", str(output)]
            subprocess.run(command, cwd=REPOSITORY, check=True, capture_output=True, text=True, timeout=60)
            expected = prepared("delft-markt")
            names = {"context.json": "scene", "review.json": "review", "source.geojson": "geojson"}
            self.assertEqual({path.name for path in output.iterdir()}, set(names))
            for filename, key in names.items():
                self.assertEqual(canonical(json.loads((output / filename).read_bytes())), canonical(expected[key]))
            hashes = {filename: digest((output / filename).read_bytes()) for filename in names}
            subprocess.run(command, cwd=REPOSITORY, check=True, capture_output=True, text=True, timeout=60)
            self.assertEqual(hashes, {filename: digest((output / filename).read_bytes()) for filename in names})

    def test_source_hash_mismatch_stops_before_output(self):
        def wrong_hash(config):
            config["source"]["sha256"] = "0" * 64

        with config_copy("delft-markt", wrong_hash) as path:
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                preparer.prepare_site(path)
            output = path.parent / "rejected-output"
            process = subprocess.run([sys.executable, str(PREPARER), "--site", str(path), "--output", str(output)],
                                     cwd=REPOSITORY, capture_output=True, text=True, timeout=60)
            self.assertNotEqual(process.returncode, 0)
            self.assertIn("Source SHA-256 does not match", process.stderr)
            self.assertFalse(output.exists())

    def test_missing_required_source_node_is_rejected(self):
        capture = source("delft-markt")
        root = ET.fromstring(capture["raw"])
        way = root.find("way[@id='209351406']")
        node = root.find(f"node[@id='{way.find('nd').attrib['ref']}']")
        root.remove(node)
        with config_copy("delft-markt", root=root) as path:
            with self.assertRaisesRegex(ValueError, "missing.*node"):
                preparer.prepare_site(path)

    def test_missing_required_relation_member_is_rejected(self):
        root = ET.fromstring(source("helsinki-senate")["raw"])
        relation = root.find("relation[@id='1331997']")
        inner = next(member for member in relation.findall("member") if member.attrib["role"] == "inner")
        root.remove(root.find(f"way[@id='{inner.attrib['ref']}']"))

        def require_relation(config):
            config["identity"] = "osm:relation:1331997"

        with config_copy("helsinki-senate", require_relation, root=root) as path:
            with self.assertRaisesRegex(ValueError, "missing.*member"):
                preparer.prepare_site(path)

    def test_open_required_building_is_rejected_without_closing_it(self):
        root = ET.fromstring(source("delft-markt")["raw"])
        way = root.find("way[@id='209351406']")
        way.remove(way.findall("nd")[-1])
        with config_copy("delft-markt", root=root) as path:
            with self.assertRaisesRegex(ValueError, "open.*ring"):
                preparer.prepare_site(path)

    def test_self_intersection_is_rejected_without_repairing_landmark(self):
        capture = source("delft-markt")
        root = ET.fromstring(capture["raw"])
        way = root.find("way[@id='209351406']")
        coordinates = raw_ring(capture, "209351406")
        refs = {point: nd.attrib["ref"] for point, nd in zip(coordinates, way.findall("nd"))}
        hull = list(Polygon(coordinates).convex_hull.exterior.coords)[:-1]
        crossed = [hull[0], hull[2], hull[1], hull[3], hull[0]]
        self.assertFalse(Polygon(crossed).is_valid)
        for nd in way.findall("nd"):
            way.remove(nd)
        for point in crossed:
            ET.SubElement(way, "nd", {"ref": refs[point]})
        with config_copy("delft-markt", root=root) as path:
            with self.assertRaisesRegex(ValueError, "invalid|self.intersect"):
                preparer.prepare_site(path)

    def test_truncated_actual_xml_is_rejected(self):
        raw = source("delft-markt")["raw"]
        with config_copy("delft-markt", raw=raw[:len(raw) // 2]) as path:
            with self.assertRaises((ValueError, ET.ParseError)):
                preparer.prepare_site(path)

    def test_required_identity_cannot_be_silently_replaced(self):
        root = ET.fromstring(source("delft-markt")["raw"])
        root.remove(root.find("way[@id='209351406']"))
        with config_copy("delft-markt", root=root) as path:
            with self.assertRaisesRegex(ValueError, "identity.*absent"):
                preparer.prepare_site(path)

    def test_missing_license_and_invalid_local_extent_are_rejected(self):
        def missing_license(config):
            del config["source"]["license"]

        def invalid_origin(config):
            config["origin"]["longitude"] = float("nan")

        def excessive_extent(config):
            config["limits"]["radiusMetres"] = 10

        for change, message in ((missing_license, "license"), (invalid_origin, "longitude"), (excessive_extent, "radius")):
            with self.subTest(case=change.__name__), config_copy("delft-markt", change) as path:
                with self.assertRaisesRegex(ValueError, message):
                    preparer.prepare_site(path)


if __name__ == "__main__":
    unittest.main(verbosity=2)
