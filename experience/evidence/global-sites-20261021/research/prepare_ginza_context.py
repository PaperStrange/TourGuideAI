import hashlib
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

from shapely import constrained_delaunay_triangles
from shapely.geometry import LineString, Polygon, box
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[4]
source_path = ROOT / 'experience/evidence/area-packs-20261019/ginza-wako/osm-map.osm'
canonical_path = ROOT / 'experience/content/ginza-wako/source.json'
canonical = json.loads(canonical_path.read_text())
tree = ET.parse(source_path)
nodes = {node.get('id'): node for node in tree.findall('node')}
selection = {
    '103509466': ('building', None),
    '449618283': ('building', None),
    '884274229': ('road', ['2253598284', '473474084', '565362099', '9988001270', '2135828625', '258071907']),
    '1026056857': ('road', ['258071907', '2217343248', '9987940959', '2253621530', '565362105', '2253621533']),
    '522046473': ('crossing', None),
    '522926937': ('crossing', None),
    '522926935': ('crossing', None),
    '667867138': ('sidewalk', None),
    '522926938': ('sidewalk', None),
}
frame = canonical['projection']
features = []
for way in tree.findall('way'):
    if way.get('id') not in selection:
        continue
    kind, selected = selection[way.get('id')]
    original = [node.get('ref') for node in way.findall('nd')]
    selected = selected or original
    assert all(identifier in original for identifier in selected)
    assert all(original.index(b) == original.index(a) + 1 for a, b in zip(selected, selected[1:]) if b != selected[0])
    tags = {tag.get('k'): tag.get('v') for tag in way.findall('tag')}
    points = []
    for identifier in selected:
        node = nodes[identifier]
        latitude, longitude = float(node.get('lat')), float(node.get('lon'))
        points.append({'nodeId': identifier, 'latitude': latitude, 'longitude': longitude,
                       'x': round((longitude - frame['origin']['longitude']) * frame['metresPerDegreeLongitude'], 6),
                       'y': round((latitude - frame['origin']['latitude']) * frame['metresPerDegreeLatitude'], 6)})
    features.append({'id': 'osm:way:' + way.get('id'), 'kind': kind,
                     'sourceVersion': int(way.get('version')), 'sourceTimestamp': way.get('timestamp'),
                     'sourceTags': tags, 'sourceNodeIds': original, 'selectedNodeIds': selected, 'points': points,
                     'sourceHeightMetres': tags.get('height'), 'sourceLevels': tags.get('building:levels'),
                     'sourceWidthMetres': tags.get('width'), 'renderHeightMetres': None})


def coordinates(points):
    return [(point['x'], point['y']) for point in points]


def walk_outline(points, radius):
    normals = []
    for a, b in zip(points, points[1:]):
        dx, dy = b[0] - a[0], b[1] - a[1]
        length = math.hypot(dx, dy)
        normals.append((-dy / length, dx / length))
    left, right = [], []
    for index, point in enumerate(points):
        if index == 0:
            normal, scale = normals[0], radius
        elif index == len(points) - 1:
            normal, scale = normals[-1], radius
        else:
            nx = normals[index - 1][0] + normals[index][0]
            ny = normals[index - 1][1] + normals[index][1]
            length = math.hypot(nx, ny)
            normal = (nx / length, ny / length)
            scale = radius / (normal[0] * normals[index][0] + normal[1] * normals[index][1])
        offset = (normal[0] * scale, normal[1] * scale)
        left.append((point[0] + offset[0], point[1] + offset[1]))
        right.append((point[0] - offset[0], point[1] - offset[1]))
    end_angle = math.atan2(normals[-1][1], normals[-1][0])
    start_angle = math.atan2(normals[0][1], normals[0][0])
    end_cap = [(points[-1][0] + math.cos(end_angle - math.pi * i / 16) * radius,
                points[-1][1] + math.sin(end_angle - math.pi * i / 16) * radius) for i in range(1, 16)]
    start_cap = [(points[0][0] + math.cos(start_angle - math.pi - math.pi * i / 16) * radius,
                  points[0][1] + math.sin(start_angle - math.pi - math.pi * i / 16) * radius) for i in range(1, 16)]
    return list(reversed(left + end_cap + list(reversed(right)) + start_cap)), left


def polygon_records(geometry):
    polygons = [geometry] if geometry.geom_type == 'Polygon' else list(geometry.geoms)
    assert all(polygon.geom_type == 'Polygon' and polygon.is_valid for polygon in polygons)
    return [{'outer': list(polygon.exterior.coords), 'holes': [list(ring.coords) for ring in polygon.interiors]}
            for polygon in polygons]


footprint = coordinates(canonical['building']['footprint'])
wako = Polygon(footprint)
route = coordinates(canonical['sidewalk']['centerline'])
outline, inside_edge = walk_outline(route, canonical['authoredNavigation']['fullWidthMetres'] / 2)
corridor = Polygon(outline)
apron = Polygon([footprint[1], footprint[0]] + list(reversed(footprint[4:12])) + [footprint[3]] + list(reversed(inside_edge)))
assert wako.is_valid and corridor.is_valid and apron.is_valid
buildings = unary_union([wako] + [Polygon(coordinates(feature['points'])) for feature in features if feature['kind'] == 'building'])
excluded = unary_union([buildings, corridor, apron])
display_box = box(-65, -30, 80, 70)
widths = {'osm:way:884274229': 9.6, 'osm:way:1026056857': 7.2}
road = unary_union([LineString(coordinates(feature['points'])).buffer(widths[feature['id']] / 2, cap_style='flat', join_style='mitre')
                    for feature in features if feature['kind'] == 'road']).intersection(display_box)
assert road.intersection(excluded).area < 1e-8
sidewalk = unary_union([LineString(coordinates(feature['points'])).buffer(1.6, cap_style='round', join_style='mitre', quad_segs=8)
                        for feature in features if feature['kind'] == 'sidewalk']).intersection(display_box).difference(unary_union([excluded, road]))
land = display_box.difference(unary_union([excluded, road, sidewalk]))
layers, checks = [], []
for identifier, geometry, height in [('road', road, -.12), ('sidewalk', sidewalk, -.003), ('land', land, -.003)]:
    assert geometry.is_valid and not geometry.is_empty
    triangles = list(constrained_delaunay_triangles(geometry).geoms)
    triangle_union = unary_union(triangles)
    missing_area = triangle_union.symmetric_difference(geometry).area
    overlap_area = sum(triangle.area for triangle in triangles) - triangle_union.area
    assert missing_area < 1e-7 and abs(overlap_area) < 1e-7
    assert geometry.intersection(excluded).area < 1e-8
    layers.append({'id': identifier, 'polygons': polygon_records(geometry),
                   'triangles': [list(triangle.exterior.coords)[:3] for triangle in triangles],
                   'areaSquareMetres': geometry.area, 'topHeightMetres': height})
    checks.append({'id': identifier, 'valid': True, 'triangleCount': len(triangles),
                   'triangleCoverageDifferenceSquareMetres': missing_area,
                   'triangleOverlapSquareMetres': abs(overlap_area),
                   'excludedOverlapSquareMetres': geometry.intersection(excluded).area})
for index, a in enumerate([road, sidewalk, land]):
    for b in [road, sidewalk, land][index + 1:]:
        assert a.intersection(b).area < 1e-8
assert unary_union([road, sidewalk, land, excluded.intersection(display_box)]).symmetric_difference(display_box).area < 1e-7

result = {
    'schemaVersion': 1, 'reviewedAt': '2026-10-21', 'id': 'ginza-context',
    'source': {'path': str(source_path.relative_to(ROOT)), 'sha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
               'retrievedAt': canonical['sources'][0]['retrievedAt'], 'url': canonical['sources'][0]['url'],
               'license': 'ODbL-1.0', 'licenseUrl': 'https://www.openstreetmap.org/copyright',
               'attribution': '© OpenStreetMap contributors'},
    'projection': frame, 'features': features,
    'selection': 'Two complete nearby footprints and three mapped crossings; consecutive source-node portions of the two road ways nearest Wako. Selected road portions reach the authored display rectangle with existing mapped nodes.',
    'renderGeometry': {
        'classification': 'derived geometry from mapped centerlines with authored display widths; visual context only',
        'axes': 'local x east, y north; metres; topHeightMetres is authored level ground',
        'authoredSettings': {'bounds': {'minX': -65, 'maxX': 80, 'minY': -30, 'maxY': 70},
                             'roadFullWidthsMetres': widths, 'branchSidewalkFullWidthMetres': 3.2,
                             'widthBasis': 'Authored display policy. Three/two mapped lane tags inform road hierarchy; no measured lane or sidewalk width is available.',
                             'roadEndCaps': 'flat', 'roadCornerJoins': 'mitre', 'sidewalkRoundCapQuadrantSegments': 8},
        'canonicalWakoSourceSha256': hashlib.sha256(canonical_path.read_bytes()).hexdigest(),
        'exclusions': {'walkCorridor': polygon_records(corridor), 'facadeApron': polygon_records(apron),
                       'buildings': polygon_records(buildings)},
        'method': 'Shapely 2.2.0: source-path buffers, bounded intersection, union/difference; GEOS constrained Delaunay triangulation. Triangle union and area checked against polygons including all holes. Frozen generator corridor/apron formulas are reproduced only for exclusion.',
        'layers': layers, 'validation': checks,
    },
    'limits': [
        'Mapped centerlines do not measure full carriageway boundaries or lane widths.',
        'Both roads are tagged one-way and provide only selected carriageway centerlines.',
        'Nearby buildings report eight levels; their heights and facade appearance remain authored.',
        'Zebra tags support crossing character; stripe widths, gaps and signal timing are unknown.',
        'Crossing522046473 is a partial carriageway segment; it does not establish a complete walking connection.',
        'No streetlight pole, drain or planting placements were established by this source selection.',
        'Render surfaces are level authored presentation and do not extend the frozen55.281851m playable chain.',
        'Outer display bounds, building material assignments and any context lighting remain authored.',
    ],
}
print(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
