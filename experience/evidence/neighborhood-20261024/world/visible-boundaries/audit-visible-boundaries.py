import hashlib
import json
from pathlib import Path

import shapely
from shapely.geometry import LineString, Polygon, mapping
from shapely.ops import unary_union

# 只审阅实际图像命中的来源；保留原始导航和所有水平显示面。
ROOT = next(parent for parent in Path(__file__).resolve().parents if (parent / 'experience').is_dir() and (parent / '.git').exists())
scene_file = ROOT / 'experience/src/neighborhoods/shijo-east/scene.json'
prepared_file = ROOT / 'artifacts/neighborhood-20261023/world/art-selection.json'
raycast_file = ROOT / 'artifacts/neighborhood-20261024/world/boundary-raycasts.json'
scene = json.loads(scene_file.read_text())
prepared = json.loads(prepared_file.read_text())


def identity(file):
    data = file.read_bytes()
    return {'file': str(file.relative_to(ROOT)), 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}


def geometry(record):
    return unary_union([Polygon(item['outer'], item.get('holes', [])) for item in record['polygons']])


def line_parts(shape):
    if shape.geom_type == 'LineString':
        return [shape] if shape.length > 1e-8 else []
    if hasattr(shape, 'geoms'):
        return [line for part in shape.geoms for line in line_parts(part)]
    return []


surfaces = prepared['displayMaterialSurfaces'] + prepared['walkableMaterialSurfaces']
surfaces += [item for item in scene['features'] if item['kind'] in ('water', 'green', 'bridge')]
parsed = [(record, geometry(record)) for record in surfaces]
ground_record, ground = next(item for item in parsed if item[0].get('sourceId') == 'shijo-east:ground')
building_id = 'kyoto-city:bldg_1bab607d-4c47-48a5-b523-e64000d895f6'
building = next(item for item in scene['features'] if item['sourceId'] == building_id)
footprint = geometry(building)
ring = building['polygons'][0]['outer']
facade = []
for edge_index in (5, 6, 7, 8):
    edge = LineString([ring[edge_index], ring[edge_index + 1]])
    adjacent = []
    for record, area in parsed:
        if area.distance(edge) > .001:
            continue
        shared = area.boundary.intersection(edge)
        if shared.length <= 1e-8:
            continue
        adjacent.append({'sourceId': record.get('sourceId', record.get('id')),
                         'heightMetres': record['topHeightMetres'], 'sharedLengthMetres': shared.length,
                         'sharedBoundary': mapping(shared), 'areaOverlapSquareMetres': footprint.intersection(area).area})
    facade.append({'polygonIndex': 0, 'edgeIndex': edge_index, 'from': ring[edge_index], 'to': ring[edge_index + 1],
                   'lengthMetres': edge.length, 'buildingBaseHeightMetres': building.get('baseHeightMetres', 0),
                   'adjacentSurfaces': adjacent})

roads = []
for road_id in ('osm:way:174762073', 'osm:way:843727820'):
    record, area = next(item for item in parsed if item[0].get('sourceId') == road_id and item[0]['kind'] == 'road')
    shared = area.boundary.intersection(ground.boundary)
    source = next(item for item in scene['features'] if item['sourceId'] == road_id)
    centre_north = max(point[1] for point in source['geometry']['coordinates'])
    selected = []
    for line in line_parts(shared):
        # 北侧边界对应图中前景的道路/铺装轮廓；完整相邻关系另行保留。
        coordinates = list(line.coords)
        for start, end in zip(coordinates, coordinates[1:]):
            midpoint_y = (start[1] + end[1]) / 2
            if midpoint_y < centre_north:
                continue
            segment = LineString([start, end])
            blockers = []
            for other, other_area in parsed:
                if other is ground_record or other is record or other['topHeightMetres'] < ground_record['topHeightMetres']:
                    continue
                covered = segment.intersection(other_area)
                if covered.length > 1e-8:
                    blockers.append({'sourceId': other.get('sourceId', other.get('id')),
                                     'heightMetres': other['topHeightMetres'], 'lengthMetres': covered.length,
                                     'geometry': mapping(covered)})
            selected.append({'from': list(start), 'to': list(end), 'lengthMetres': segment.length, 'higherSurfaceCoverage': blockers})
    others = []
    for other, other_area in parsed:
        if other is record or other is ground_record or other_area.distance(area) > .5:
            continue
        shared_other = area.boundary.intersection(other_area.boundary)
        overlap = area.intersection(other_area).area
        if shared_other.length > 1e-8 or overlap > 1e-8:
            others.append({'sourceId': other.get('sourceId', other.get('id')), 'kind': other['kind'],
                           'heightMetres': other['topHeightMetres'], 'sharedBoundaryMetres': shared_other.length,
                           'sharedBoundary': mapping(shared_other), 'planOverlapSquareMetres': overlap})
    roads.append({'sourceId': road_id, 'sourceVersion': source['sourceVersion'], 'sourceTimestamp': source['sourceTimestamp'],
                  'sourceTags': source['sourceTags'], 'width': source['width'], 'roadHeightMetres': record['topHeightMetres'],
                  'landHeightMetres': ground_record['topHeightMetres'], 'groundSharedBoundaryMetres': shared.length,
                  'planOverlapWithGroundSquareMetres': area.intersection(ground).area,
                  'northSharedSegments': selected, 'otherNearbySurfaces': others})

report = {'status': 'diagnostic', 'reviewedAt': '2026-10-24', 'tools': {'shapely': shapely.__version__},
          'inputs': [identity(scene_file), identity(prepared_file), identity(raycast_file)], 'producer': identity(Path(__file__)),
          'tenmangu': {'sourceId': building_id, 'sourceIndex': 731, 'kind': building['kind'],
                       'height': building['height'], 'edges': facade}, 'pontocho': roads,
          'canonicalGeometryChanged': False, 'navigationChanged': False,
          'limits': 'These are source-indexed authored display surfaces. Widths and elevations retain their original authored status. Exact shared boundaries are distinguished from plan overlaps and unmatched regions; geometry alone does not establish the final screen-space cause.'}
output = ROOT / 'artifacts/neighborhood-20261024/world/visible-boundaries.json'
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'tenmanguEdges': facade, 'pontocho': roads}, ensure_ascii=False, indent=2))


