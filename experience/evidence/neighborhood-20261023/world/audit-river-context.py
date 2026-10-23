import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import shapely
from shapely.geometry import LineString, Point, Polygon, box, shape
from shapely.ops import unary_union


ROOT = Path(__file__).resolve().parents[4]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def geometry(records):
    return unary_union([Polygon(record['outer'], record['holes']) for record in records])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--repeat', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assert args.input.resolve() != args.repeat.resolve()
    assert args.input.read_bytes() == args.repeat.read_bytes()
    data = json.loads(args.input.read_text())
    for path, sha in data['sourceHashes'].items():
        assert digest(ROOT / path) == sha
    assert digest(ROOT / 'experience/content-tools/prepare-river-context.py') == data['producerSha256']
    canonical = ROOT / 'experience/src/neighborhoods/shijo-east'
    scene = json.loads((canonical / 'scene.json').read_text())
    route = json.loads((canonical / 'geography.json').read_text())
    prepared = json.loads((ROOT / 'artifacts/neighborhood-20261023/world/art-selection.json').read_text())
    records = [polygon for feature in scene['features'] if not feature.get('renderPolicy', '').startswith('reference-only')
               for polygon in feature['polygons']]
    records.extend(polygon for item in prepared['displayMaterialSurfaces'] + prepared['walkableMaterialSurfaces'] for polygon in item['polygons'])
    lines = unary_union([LineString([(point['x'], point['y']) for point in edge['points']]) for edge in route['navigation']['edges']])
    frozen = unary_union([geometry(records), lines.buffer(65, quad_segs=4)])
    rendered, triangles = [], 0
    for surface in data['riverContextSurfaces']:
        assert surface['walkable'] is False
        assert surface['topHeightMetres'] == {'water': -2.5, 'road': -.12, 'land': -.04}[surface['kind']]
        polygon = geometry(surface['polygons'])
        rendered.append(polygon)
        faces = []
        for record in surface['polygons']:
            for vertices in record['triangles']:
                points = np.asarray(vertices, dtype=np.float32).astype(np.float64)
                a, b = points[1] - points[0], points[2] - points[0]
                assert a[0] * b[1] - a[1] * b[0] != 0
                faces.append(Polygon(vertices))
        triangles += len(faces)
        assert unary_union(faces).symmetric_difference(polygon).area <= 1e-6
    combined = unary_union(rendered)
    extent = shape(data['scope']['extent'])
    overlap = combined.intersection(frozen).area
    mutual = sum(polygon.area for polygon in rendered) - combined.area
    residual = combined.symmetric_difference(extent.difference(frozen)).area
    limits = data['audit']['acceptanceLimits']
    assert limits == {'oldDisplayOverlapSquareMetres': 1e-5, 'mutualSurfaceOverlapSquareMetres': 1e-5,
                      'coverageDifferenceSquareMetres': .001}
    assert overlap <= 1e-5 and abs(mutual) <= 1e-5 and residual <= .001

    # 每个完整建筑与压缩来源中的实际 LOD1 面、孔洞和 Z 范围逐项核对。
    source_path = ROOT / data['selectedOfficialSource']['file']
    assert digest(source_path) == data['selectedOfficialSource']['sha256']
    source_bytes = gzip.decompress(source_path.read_bytes())
    originals = {feature['properties']['gml_id']: feature for feature in json.loads(source_bytes)['features']}
    assert len(originals) == len(data['riverContextBuildings'])
    frame = data['frame']
    def project(coordinates):
        values = np.array(coordinates, dtype=float, copy=True)
        values[:, 0] = (values[:, 0] - frame['origin']['longitude']) * frame['metresPerDegreeLon']
        values[:, 1] = (values[:, 1] - frame['origin']['latitude']) * frame['metresPerDegreeLat']
        return values
    maximum_footprint_error = 0
    maximum_building_overlap = 0
    roof_triangles, wall_triangles = 0, 0
    for building in data['riverContextBuildings']:
        original = originals[building['sourceId'].removeprefix('kyoto-city:')]
        assert building['sourceTags'] == original['properties']
        solid = shape(original['geometry'])
        faces = list(solid.geoms) if solid.geom_type == 'MultiPolygon' else [solid]
        footprint = unary_union([shapely.force_2d(face) for face in faces if shapely.force_2d(face).area > 1e-15])
        local = shapely.transform(footprint, project)
        assert local.equals_exact(shape(building['geometry']), 1e-8)
        display = geometry(building['polygons'])
        error = local.hausdorff_distance(display)
        maximum_footprint_error = max(maximum_footprint_error, error)
        assert error <= .001
        building_overlap = local.intersection(frozen).area
        maximum_building_overlap = max(maximum_building_overlap, building_overlap)
        assert building_overlap <= 1e-5
        z = shapely.get_coordinates(solid, include_z=True)[:, 2]
        assert building['height']['metres'] == float(z.max() - z.min())
        assert building['height']['sourceMinimumZ'] == float(z.min())
        assert building['height']['sourceMaximumZ'] == float(z.max())
        assert building['baseHeightMetres'] == 0
        for polygon in building['polygons']:
            roof_triangles += len(polygon['triangles'])
            wall_triangles += 2 * sum(len(ring) - 1 for ring in [polygon['outer'], *polygon['holes']])
            assert geometry([polygon]).symmetric_difference(unary_union([Polygon(face) for face in polygon['triangles']])).area < 1e-7
            for vertices in polygon['triangles']:
                points = np.asarray(vertices, dtype=np.float32).astype(np.float64)
                a, b = points[1] - points[0], points[2] - points[0]
                assert a[0] * b[1] - a[1] * b[0] != 0

    features = {feature['sourceId']: feature for feature in scene['features']}
    for segment in data['riverContextBankSegments']:
        source = shape(features[segment['sourceId']]['geometry'])
        assert source.geom_type in ('Polygon', 'MultiPolygon')
        a, b = segment['from'], segment['to']
        line = LineString([a, b])
        midpoint = line.interpolate(.5, normalized=True)
        assert source.boundary.distance(midpoint) <= .002
        dx, dy = b[0] - a[0], b[1] - a[1]
        left = Point(midpoint.x - dy / line.length * .01, midpoint.y + dx / line.length * .01)
        assert source.buffer(.002).covers(left)
        assert segment['topHeightMetres'] == -.04 and segment['bottomHeightMetres'] == -2.5
        assert line.intersection(frozen).length <= .002

    # fog 使用 view-depth；采用视锥角点距离和完整相机偏移包络。
    camera = data['scope']['camera']
    factor = math.sqrt(1 + math.tan(math.radians(camera['verticalFOVDegrees'] / 2)) ** 2 * (1 + camera['maximumAuditedAspect'] ** 2))
    offset = camera['orbitMaximumMetres'] + math.sqrt(2) * camera['targetMaximumPerAxisMetres']
    actual_positions = lines.intersection(box(1000, 0, 1100, 100).buffer(230, quad_segs=256)).buffer(.43, quad_segs=16)
    distance = actual_positions.distance(extent.boundary)
    depth = (distance - offset) / factor
    assert depth >= 270
    pauses = []
    for sight in route['sights']:
        if sight['id'] not in ('takase-river', 'pontocho-entrance', 'shijo-bridge'):
            continue
        boundary_distance = Point(sight['x'], sight['y']).distance(extent.boundary)
        pauses.append({'id': sight['id'], 'outerBoundaryDistanceMetres': boundary_distance,
                       'minimumConservativeBoundaryViewDepthMetres': (boundary_distance - offset) / factor})
    omitted = [triangle for item in data['audit']['surfaceNumerics'] for triangle in item['float32DisplayAudit']['omittedTriangles']]
    assert all(Polygon(np.asarray(item['triangle'], dtype=np.float32).astype(np.float64)).area == 0 for item in omitted)
    for path, sha in data['sourceHashes'].items():
        assert digest(ROOT / path) == sha
    report = {'schemaVersion': 1, 'passed': True, 'reviewedAt': '2026-10-23',
              'input': {'file': str(args.input), 'sha256': digest(args.input)},
              'repeat': {'file': str(args.repeat), 'sha256': digest(args.repeat), 'byteIdentical': True},
              'auditScriptSha256': digest(Path(__file__)), 'producerSha256': data['producerSha256'],
              'sourceHashes': data['sourceHashes'], 'selectedOfficialSource': data['selectedOfficialSource'],
              'uncompressedSelectedSourceSha256': hashlib.sha256(source_bytes).hexdigest(),
              'geometry': {'surfaces': len(rendered), 'surfaceTriangles': triangles, 'buildings': len(originals),
                           'roofTriangles': roof_triangles, 'plainWallTriangleEstimate': wall_triangles,
                           'bankSegments': len(data['riverContextBankSegments']), 'oldDisplayOverlapSquareMetres': overlap,
                           'mutualSurfaceOverlapSquareMetres': mutual, 'coverageDifferenceSquareMetres': residual,
                           'maximumBuildingFootprintErrorMetres': maximum_footprint_error,
                           'maximumBuildingOverlapSquareMetres': maximum_building_overlap,
                           'omittedFloat32Triangles': len(omitted),
                           'omittedFloat32TriangleAreaSquareMetres': sum(item['areaSquareMetres'] for item in omitted),
                           'maximumCleanupBoundaryChangeMetres': data['audit']['maximumCleanupBoundaryChangeMetres']},
              'acceptanceLimits': limits, 'camera': {'maximumAuditedAspect': camera['maximumAuditedAspect'],
                 'minimumRouteBoundaryDistanceMetres': distance, 'minimumConservativeBoundaryViewDepthMetres': depth, 'pauses': pauses},
              'canonicalUnchanged': True, 'navigationExtended': False, 'measuredTerrainOrBankHeight': False,
              'limits': 'Geometry and source audit; encoded bytes, browser appearance and runtime budgets require separate export/QA.'}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': True, 'output': str(args.output), 'sha256': digest(args.output),
                      'minimumBoundaryViewDepthMetres': depth, 'buildings': len(originals)}))


if __name__ == '__main__':
    main()
