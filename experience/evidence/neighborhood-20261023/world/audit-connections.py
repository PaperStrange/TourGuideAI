import argparse
import hashlib
import json
import platform
from pathlib import Path

import numpy as np
import shapely
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import unary_union


ROOT = Path(__file__).resolve().parents[4]
CANONICAL = ROOT / 'experience/src/neighborhoods/shijo-east'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def geometry(records):
    return unary_union([Polygon(record['outer'], record['holes']) for record in records])


def receipt(path):
    return {'file': str(path.resolve().relative_to(ROOT)), 'sha256': digest(path),
            'bytes': path.stat().st_size}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepared', type=Path, required=True)
    parser.add_argument('--repeat', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    assert args.prepared.resolve() != args.repeat.resolve()
    assert args.prepared.read_bytes() == args.repeat.read_bytes(), 'Derived preparation is not byte-identical'
    prepared = json.loads(args.prepared.read_text())
    scene = json.loads((CANONICAL / 'scene.json').read_text())
    geography = json.loads((CANONICAL / 'geography.json').read_text())
    ledger = json.loads((CANONICAL / 'source-ledger.json').read_text())
    canonical_files = ['scene.json', 'geography.json', 'source-ledger.json', 'source-review.json', 'sights.js']
    canonical_files.extend(item['file'] for item in ledger['retainedFiles'])
    before = {name: digest(CANONICAL / name) for name in canonical_files}
    for item in ledger['retainedFiles']:
        assert before[item['file']] == item['sha256']
    for name, sha in prepared['sourceHashes'].items():
        assert before[name] == sha
    features = {feature['sourceId']: feature for feature in scene['features']}
    roof = geometry(features['osm:way:772134672']['polygons'])
    buildings = unary_union([geometry(feature['polygons']) for feature in features.values()
                             if feature['kind'] == 'building'])
    blockers = []
    for feature in features.values():
        if feature['kind'] == 'road':
            blockers.append(geometry(feature['polygons']))
        elif feature['kind'] == 'path' and feature['geometry']['type'] == 'LineString':
            coordinates = feature['geometry']['coordinates']
            if abs(coordinates[-1][1] - coordinates[0][1]) > abs(coordinates[-1][0] - coordinates[0][0]):
                blockers.append(geometry(feature['polygons']))

    # 独立核对实际三角形、建筑附着边和横街保留范围。
    patches, maximum_attachment_error, maximum_span, triangle_count = [], 0, 0, 0
    for section in prepared['arcadeSoffitSections']:
        patch = geometry(section['polygons'])
        assert patch.is_valid and section['facadeSegments']
        patches.append(patch)
        triangles = [triangle for polygon in section['polygons'] for triangle in polygon['triangles']]
        faces = unary_union([Polygon(triangle) for triangle in triangles])
        assert faces.symmetric_difference(patch).area < 1e-7
        for triangle in triangles:
            points = np.asarray(triangle, dtype=np.float32).astype(np.float64)
            a, b = points[1] - points[0], points[2] - points[0]
            assert a[0] * b[1] - a[1] * b[0] != 0
        triangle_count += len(triangles)
        for polygon in section['polygons']:
            maximum_span = max(maximum_span, max(Point(point).distance(roof) for point in polygon['outer']))
        for segment in section['facadeSegments']:
            ring = features[segment['buildingSourceId']]['polygons'][segment['polygonIndex']]['outer']
            a, b = ring[segment['edgeIndex']:segment['edgeIndex'] + 2]
            line = LineString([a, b])
            error = max(line.distance(Point(segment['from'])), line.distance(Point(segment['to'])))
            maximum_attachment_error = max(maximum_attachment_error, error)
            assert error < 1e-7
            assert line.project(Point(segment['to'])) > line.project(Point(segment['from']))
    assert maximum_span <= 6.000001
    combined = unary_union(patches)
    patch_overlap = sum(patch.area for patch in patches) - combined.area
    protected_overlap = {'crossStreet': combined.intersection(unary_union(blockers)).area,
                         'building': combined.intersection(buildings).area,
                         'sourceRoof': combined.intersection(roof).area}
    assert abs(patch_overlap) < 1e-6 and max(protected_overlap.values()) < 1e-6

    # 水岸只沿实际保留的水面边界；中心线端盖不提供岸线。
    water = unary_union([geometry(feature['polygons']) for feature in features.values() if feature['kind'] == 'water'])
    land = unary_union([geometry(surface['polygons']) for surface in scene['surfaces'] if not surface.get('walkable')])
    bank_counts = {}
    for segment in prepared['waterBankSegments']:
        feature = features[segment['sourceId']]
        source = shape(feature['geometry'])
        a, b = segment['from'], segment['to']
        line = LineString([a, b])
        midpoint = line.interpolate(.5, normalized=True)
        dx, dy = b[0] - a[0], b[1] - a[1]
        left = Point(midpoint.x - dy / line.length * .01, midpoint.y + dx / line.length * .01)
        assert water.covers(left) and segment['waterOnLeft'] is True
        assert midpoint.distance(water.boundary) <= .002
        assert midpoint.distance(land) <= .002
        if source.geom_type in ('Polygon', 'MultiPolygon'):
            assert segment['boundaryBasis'] == 'mapped-water-area-boundary'
            assert midpoint.distance(source.boundary) <= .002
        else:
            assert feature['sourceTags']['name'] == '高瀬川'
            assert 'endcaps-excluded' in segment['boundaryBasis']
            half_width = feature['width']['metres'] / 2
            sides = unary_union([source.offset_curve(half_width, join_style='mitre'),
                                 source.offset_curve(-half_width, join_style='mitre')])
            assert midpoint.distance(sides) <= .002
        assert segment['topHeightMetres'] == -.04 and segment['bottomHeightMetres'] == -2.5
        bank_counts[segment['sourceId']] = bank_counts.get(segment['sourceId'], 0) + 1
    assert bank_counts.get('osm:way:254080497', 0) == 0
    profiles = []
    for x in (287.127, 300, 400, 500, 550, 600):
        line = LineString([(x, 125), (x, 165)])
        roof_slice, joined_slice = roof.intersection(line), combined.intersection(line)
        profiles.append({'x': x, 'roofY': list(roof_slice.bounds)[1::2],
                         'joinedLengthMetres': joined_slice.length,
                         'joinedYBounds': list(joined_slice.bounds)[1::2]})
    northern_gap = LineString([(550, roof.intersection(LineString([(550, 125), (550, 165)])).bounds[3] + .01), (550, 165)])
    assert combined.intersection(northern_gap).is_empty
    proximity = []
    for name, point in [('torii', next(item for item in scene['landmarks'] if item['kind'] == 'torii')),
                        ('approach', next(item for item in geography['sights'] if item['id'] == 'nishiki-tenmangu'))]:
        position = Point(point['x'], point['y'])
        nearby = []
        for feature in features.values():
            if feature['kind'] != 'canopy' or feature.get('renderPolicy', '').startswith('reference-only'):
                continue
            footprint = geometry(feature['polygons'])
            if footprint.distance(position) < 10:
                nearby.append({'sourceId': feature['sourceId'], 'distanceMetres': footprint.distance(position),
                               'inside': footprint.covers(position), 'authoredTopHeightMetres': feature['topHeightMetres']})
        proximity.append({'point': name, 'position': [point['x'], point['y']], 'canopiesWithin10m': nearby})
    assert before == {name: digest(CANONICAL / name) for name in canonical_files}
    road = prepared['reviewedRoadMask']
    assert digest(ROOT / road['inputFile']) == road['inputSha256']
    for item in (road['input']['model'], road['input']['world']):
        assert digest(ROOT / item['file']) == item['sha256']
    producers = ['experience/content-tools/prepare-neighborhood-art.py', 'experience/content-tools/prepare-site.py',
                 'experience/content-tools/extract-shijo-road-mask.mjs', str(Path(__file__).resolve().relative_to(ROOT)),
                 'experience/tests/neighborhood-source-test.py']
    report = {'schemaVersion': 1, 'reviewedAt': '2026-10-23', 'passed': True,
              'scope': 'Actual retained-source geometry and independent derived-input reproduction; visual acceptance is separate.',
              'tools': {'python': platform.python_version(), 'numpy': np.__version__, 'shapely': shapely.__version__,
                        'geos': shapely.geos_version_string},
              'canonical': [receipt(CANONICAL / name) for name in canonical_files],
              'inputs': [receipt(ROOT / road['inputFile']), receipt(ROOT / road['input']['model']['file']),
                         receipt(ROOT / road['input']['world']['file'])],
              'producers': [receipt(ROOT / name) for name in producers],
              'outputs': {'frozen': receipt(args.prepared), 'repeat': receipt(args.repeat), 'byteIdentical': True},
              'geometry': {'facadeEdges': len(prepared['arcadeFacadeEdges']), 'soffitSections': len(patches),
                           'soffitTriangles': triangle_count, 'maximumConnectionSpanMetres': maximum_span,
                           'maximumFacadeAttachmentErrorMetres': maximum_attachment_error,
                           'patchOverlapSquareMetres': patch_overlap, 'protectedOverlapSquareMetres': protected_overlap,
                           'float32CollapsedTriangles': 0, 'profiles': profiles, 'x550NorthernGapRemainsOpen': True,
                           'waterBankSegments': len(prepared['waterBankSegments']), 'bankCounts': bank_counts,
                           'waterLeftOrientationChecked': True, 'tenmanguCanopyProximity': proximity},
              'producerAudits': {'arcadeGeometryAudit': prepared['arcadeGeometryAudit'],
                                 'waterBoundaryAudit': prepared['waterBoundaryAudit']},
              'canonicalUnchanged': True, 'constructionDimensionsObserved': False, 'heightObserved': False}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'passed': True, 'report': str(args.output), 'sha256': digest(args.output),
                      'derivedByteIdentical': True, 'canonicalFilesChecked': len(canonical_files)}))


if __name__ == '__main__':
    main()
