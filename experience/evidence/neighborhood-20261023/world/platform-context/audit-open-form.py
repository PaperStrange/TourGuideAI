import argparse
import hashlib
import json
import math
from pathlib import Path

from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import unary_union


ROOT = Path(__file__).resolve().parents[5]
SOURCE_ID = 'kyoto-city:bldg_74454289-1d7a-4105-87ea-26e36c69bc44'
TOLERANCE = 0.00003


def check(file_path, source, geography):
    payload = json.loads(file_path.read_text())
    assert payload['sourceId'] == SOURCE_ID and payload['sourceIndex'] == 223
    triangles = payload['triangles']
    footprint = Polygon(source['polygons'][0]['outer'])
    top = source['height']['metres']
    bottom = source.get('baseHeightMetres', 0)
    underside = top - .08
    beam_bottom = underside - .10
    vertices = [vertex for triangle in triangles for vertex in triangle['vertices']]
    assert all(bottom - TOLERANCE <= vertex[2] <= top + TOLERANCE for vertex in vertices)
    assert all(footprint.buffer(TOLERANCE).covers(Point(vertex[:2])) for vertex in vertices)
    assert set(triangle['material'] for triangle in triangles) == {'roof', 'frame'}
    roof_triangles = [Polygon([vertex[:2] for vertex in triangle['vertices']]) for triangle in triangles
                      if all(abs(vertex[2] - top) < TOLERANCE for vertex in triangle['vertices'])]
    roof = unary_union(roof_triangles)
    assert roof.hausdorff_distance(footprint) <= TOLERANCE
    assert roof.symmetric_difference(footprint).area < .001
    ground_triangles = [Polygon([vertex[:2] for vertex in triangle['vertices']]) for triangle in triangles
                        if all(abs(vertex[2] - bottom) < TOLERANCE for vertex in triangle['vertices'])]
    support = unary_union(ground_triangles)
    posts = list(support.geoms)
    assert len(posts) == 7
    assert all(abs(post.area - .12 ** 2) < .00001 for post in posts)
    assert all(abs(post.length - .48) < .0001 for post in posts)

    # 中轴由来源平面的两条短边中点确定，独立测量实际导出支撑的中心和间距。
    ring = source['polygons'][0]['outer']
    edges = sorted([(math.dist(a, b), a, b) for a, b in zip(ring, ring[1:])], key=lambda item: item[0])
    endpoints = [((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) for _, a, b in edges[:2]]
    axis = LineString(endpoints)
    posts.sort(key=lambda post: axis.project(post.centroid))
    expected_spacing = (axis.length - .9) / 6
    for index, post in enumerate(posts):
        assert axis.distance(post.centroid) <= TOLERANCE
        assert abs(axis.project(post.centroid) - (.45 + index * expected_spacing)) <= TOLERANCE
        assert footprint.covers(post)
    tangent = ((endpoints[1][0] - endpoints[0][0]) / axis.length,
               (endpoints[1][1] - endpoints[0][1]) / axis.length)
    normal = (-tangent[1], tangent[0])
    beam_start = axis.interpolate(.45 - .06)
    beam_end = axis.interpolate(axis.length - .45 + .06)
    beam = Polygon([(point.x + sign * normal[0] * .05, point.y + sign * normal[1] * .05)
                    for point, sign in [(beam_start, 1), (beam_end, 1), (beam_end, -1), (beam_start, -1)]])
    components = [(footprint, underside, top), (beam, beam_bottom, underside),
                  *[(post, bottom, underside) for post in posts]]
    # 每个三角形完全位于批准的凸构件内，排除跨越支撑间隙的立面。
    for triangle in triangles:
        points = triangle['vertices']
        assert any(all(low - TOLERANCE <= point[2] <= high + TOLERANCE and
                       polygon.buffer(TOLERANCE).covers(Point(point[:2])) for point in points)
                   for polygon, low, high in components), 'Face extends outside approved open components'
    beam_faces = [Polygon([vertex[:2] for vertex in triangle['vertices']]) for triangle in triangles
                  if all(abs(vertex[2] - beam_bottom) < TOLERANCE for vertex in triangle['vertices'])]
    assert unary_union(beam_faces).hausdorff_distance(beam) <= TOLERANCE
    corridors = unary_union([LineString([(point['x'], point['y']) for point in edge['points']]).buffer(edge['width'] / 2)
                             for edge in geography['navigation']['edges']])
    assert footprint.intersection(corridors).area == 0
    source_footprint = shape(source['geometry'])
    return {'file': payload['file'], 'triangles': len(triangles),
            'trianglePayloadSha256': hashlib.sha256(file_path.read_bytes()).hexdigest(),
            'baseMetres': min(vertex[2] for vertex in vertices), 'topMetres': max(vertex[2] for vertex in vertices),
            'slabUndersideMetres': underside, 'beamUndersideMetres': beam_bottom,
            'roofBoundaryErrorMetres': roof.hausdorff_distance(footprint),
            'roofAreaDifferenceSquareMetres': roof.symmetric_difference(footprint).area,
            'displayToProjectedSourceBoundaryMetres': footprint.hausdorff_distance(source_footprint),
            'navigationCorridorClearanceMetres': footprint.distance(corridors),
            'postSpacingMetres': expected_spacing,
            'posts': [{'centre': list(post.centroid.coords)[0], 'areaSquareMetres': post.area,
                       'perimeterMetres': post.length, 'axisOffsetMetres': axis.project(post.centroid)} for post in posts],
            'allFacesWithinApprovedComponents': True, 'unmeasuredConstruction': True}


parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('triangles', type=Path, nargs='+')
args = parser.parse_args()
scene = json.loads((ROOT / 'experience/src/neighborhoods/shijo-east/scene.json').read_text())
geography = json.loads((ROOT / 'experience/src/neighborhoods/shijo-east/geography.json').read_text())
source = next(feature for feature in scene['features'] if feature['sourceId'] == SOURCE_ID)
report = {'status': 'pass', 'sourceId': SOURCE_ID, 'float32ToleranceMetres': TOLERANCE,
          'sections': [check(file_path, source, geography) for file_path in args.triangles]}
args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': report['status'], 'sections': len(report['sections'])}))
