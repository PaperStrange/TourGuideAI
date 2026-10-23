# SPDX-License-Identifier: GPL-3.0-or-later
# 河畔背景随桥梁分区载入；每个网格保留完整来源表，导航数据保持独立。
import hashlib
import json
import math
from pathlib import Path

from build_site_context import validate_polygon
from neighborhood_landmarks import water_bank_geometry
from neighborhood_mesh import MeshBatch, building_geometry


ROOT = Path(__file__).resolve().parents[2]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_river_context(path, frame, feature_table, source_indices, style):
    if path is None:
        return None
    source = json.loads(path.read_text())
    if source.get('schemaVersion') != 1 or source.get('id') != 'shijo-east-river-context':
        raise ValueError('Unexpected river context identity')
    if source['frame'] != frame or source['attachmentCellId'] != 'cell-e010-n000':
        raise ValueError('River context must retain the reviewed frame and bridge cell')
    for filename, expected in source['sourceHashes'].items():
        if sha256(ROOT / filename) != expected:
            raise ValueError('River context source hash mismatch: ' + filename)
    producer = ROOT / 'experience/content-tools/prepare-river-context.py'
    if sha256(producer) != source['producerSha256']:
        raise ValueError('River context producer changed after preparation')
    selected = source['selectedOfficialSource']
    if sha256(ROOT / selected['file']) != selected['sha256']:
        raise ValueError('Selected official context geometry changed')
    audit = source['audit']
    if not audit['canonicalAndNavigationUnchanged'] or audit['navigationExtended']:
        raise ValueError('River context cannot change the reviewed walking area')
    maximum_tolerances = {'oldDisplayOverlapSquareMetres': 1e-5,
                          'mutualSurfaceOverlapSquareMetres': 1e-5, 'coverageDifferenceSquareMetres': .001}
    for key, maximum in maximum_tolerances.items():
        tolerance = audit['acceptanceLimits'][key]
        if not math.isfinite(tolerance) or not 0 <= tolerance <= maximum or abs(audit[key]) > tolerance:
            raise ValueError('River context surface conservation failed: ' + key)
    scope = source['scope']
    if scope['minimumConservativeBoundaryViewDepthMetres'] <= scope['camera']['fogFarDepthMetres']:
        raise ValueError('River context ends within the audited fog-depth envelope')
    table = {str(entry['index']): dict(entry) for entry in feature_table}
    indices = dict(source_indices)
    surfaces = source['riverContextSurfaces']
    buildings = source['riverContextBuildings']
    for record in surfaces + buildings:
        identifier = record['sourceId']
        for polygon in record['polygons']:
            validate_polygon(polygon, identifier)
        if record['kind'] == 'building':
            height = record['height']['metres']
            if not math.isfinite(height) or not .4 <= height <= 300:
                raise ValueError(identifier + ': unsupported context height')
        elif record['walkable'] or record['material'] not in style['materials'] or not math.isfinite(record['topHeightMetres']):
            raise ValueError(identifier + ': invalid context display surface')
        if identifier not in indices:
            index = len(table)
            indices[identifier] = index
            table[str(index)] = {'index': index, 'sourceId': identifier, 'kind': record['kind'], 'featureIds': []}
    for segment in source['riverContextBankSegments']:
        if segment['sourceId'] not in indices or not segment['waterOnLeft']:
            raise ValueError('River context bank requires a retained source and reviewed orientation')
    return {'source': source, 'path': path, 'indices': indices, 'featureTable': table}


def river_context_geometry(context, style):
    source, indices = context['source'], context['indices']
    groups = {'Surfaces': {name: MeshBatch() for name in style['materials']}}
    surfaces = groups['Surfaces']
    for surface in source['riverContextSurfaces']:
        for polygon in surface['polygons']:
            surfaces[surface['material']].top(polygon['triangles'], surface['topHeightMetres'], indices[surface['sourceId']])
    for building in source['riverContextBuildings']:
        # 完整建筑按中心位置进入空间组，让浏览器按实际包围盒执行视锥裁剪。
        points = [point for polygon in building['polygons'] for point in polygon['outer']]
        center = [(min(point[axis] for point in points) + max(point[axis] for point in points)) / 2 for axis in (0, 1)]
        cell = tuple(math.floor(value / style['cellSizeMetres']) for value in center)
        label = 'Buildings_' + '_'.join(str(value) for value in cell)
        batches = groups.setdefault(label, {name: MeshBatch() for name in style['materials']})
        recipe = dict(style['recipes'][building['recipeId']], facadeEdges=[])
        building_geometry(building, recipe, 'context', indices[building['sourceId']], batches)
    for segment in source['riverContextBankSegments']:
        water_bank_geometry([segment], indices[segment['sourceId']], surfaces)
    return groups


def mesh_source_table(context, source_indices):
    # 网格来源表具有完整优先级，混合现有与新增来源时必须包含所有实际索引。
    result = {}
    for index in sorted({int(value) for value in source_indices}):
        record = context['featureTable'][str(index)]
        compact = {'sourceId': record['sourceId']}
        if record.get('featureIds'):
            compact['featureIds'] = record['featureIds']
        if record.get('surfaceId'):
            compact['surfaceId'] = record['surfaceId']
        if record.get('kind') == 'building' and not record['sourceId'].startswith('kyoto-city:bldg_'):
            compact['kind'] = 'building'
        result[str(index)] = compact
    return result
