# SPDX-License-Identifier: GPL-3.0-or-later
# 输入来自已验证的地理预处理；窗口、材料和层高展示均属于作者设计。
import argparse
import hashlib
import json
import math
import re
import sys
from pathlib import Path

import bpy
from mathutils import Vector


MATERIALS = {
    'context-wall-warm': ('b8b0a1', .86, 0),
    'context-wall-light': ('cdc9bf', .83, 0),
    'context-wall-muted': ('aaa79f', .88, 0),
    'context-roof': ('777c79', .90, 0),
    'context-trim': ('d1cdc2', .78, 0),
    'context-glass': ('536872', .24, .08),
    'context-road': ('737a7c', .94, 0),
    'context-path': ('c3bcac', .89, 0),
    'context-green': ('91a08b', .97, 0),
    'context-water': ('7897a3', .30, .03),
    'context-ground': ('c5c1b6', .97, 0),
}
SURFACE_HEIGHTS = {'ground': -.18, 'road': -.09, 'water': -.12, 'green': -.035, 'path': 0}
WALL_MATERIALS = ('context-wall-warm', 'context-wall-light', 'context-wall-muted')
MAXIMUMS = {'modelBytes': 8 * 1024 * 1024, 'triangles': 100000, 'batches': 128}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def finite(value, label, minimum=-20000, maximum=20000):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{label} must be a finite number')
    if not minimum <= value <= maximum:
        raise ValueError(f'{label} is outside [{minimum}, {maximum}]')
    return float(value)


def ring_area(ring):
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:])) / 2


def triangle_area(triangle):
    a, b, c = triangle
    return ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2


def validate_polygon(polygon, label):
    for ring in [polygon['outer']] + polygon['holes']:
        if len(ring) < 4 or ring[0] != ring[-1]:
            raise ValueError(f'{label}: expected a closed ring')
        for point in ring:
            if len(point) != 2:
                raise ValueError(f'{label}: local coordinates must contain x and north')
            finite(point[0], label)
            finite(point[1], label)
        if any(a == b for a, b in zip(ring, ring[1:])):
            raise ValueError(f'{label}: duplicate consecutive ring vertex')
    area = ring_area(polygon['outer'])
    if area <= 0 or any(ring_area(hole) >= 0 for hole in polygon['holes']):
        raise ValueError(f'{label}: expected CCW outer and CW holes')
    area += sum(ring_area(hole) for hole in polygon['holes'])
    expected = finite(polygon['areaSquareMetres'], label + ' area', 1e-9, 16000000)
    tolerance = max(1e-7, expected * 1e-8)
    if abs(area - expected) > tolerance:
        raise ValueError(f'{label}: ring area differs from the prepared area')
    total = 0
    if not polygon['triangles']:
        raise ValueError(f'{label}: pre-triangulated faces are required')
    for triangle in polygon['triangles']:
        if len(triangle) != 3:
            raise ValueError(f'{label}: each face must have three points')
        for point in triangle:
            if len(point) != 2:
                raise ValueError(f'{label}: triangle point must have two coordinates')
            finite(point[0], label)
            finite(point[1], label)
        current = abs(triangle_area(triangle))
        if current <= 1e-12:
            raise ValueError(f'{label}: degenerate prepared triangle')
        total += current
    if abs(total - expected) > tolerance:
        raise ValueError(f'{label}: triangle area differs from the prepared polygon')


def validate_context(context):
    if context.get('version') != 1 or context.get('representation') != 'geographic-context':
        raise ValueError('Expected version1 prepared geographic-context data')
    if context.get('navigation') != 'unreviewed':
        raise ValueError('This exporter only creates unreviewed navigation previews')
    if context['projection'].get('gltfMapping') != '[x, height, -y]':
        raise ValueError('Unexpected local-to-glTF axis mapping')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,80}', context['id']):
        raise ValueError('Invalid site identifier')
    for key in ('sha256', 'url', 'license', 'attribution', 'retrievedAt'):
        if not isinstance(context['source'].get(key), str) or not context['source'][key]:
            raise ValueError('Missing source ' + key)
    if not re.fullmatch(r'[a-f0-9]{64}', context['source']['sha256']):
        raise ValueError('Invalid raw-source hash')
    identifiers = set()
    for feature in context['features']:
        identifier = feature['sourceId']
        if identifier in identifiers or not re.fullmatch(r'osm:(way|relation):[0-9]+', identifier):
            raise ValueError('Duplicate or unsupported source identifier: ' + identifier)
        identifiers.add(identifier)
        if feature['kind'] not in ('building', 'road', 'path', 'green', 'water'):
            raise ValueError('Unsupported feature kind: ' + feature['kind'])
        if not feature['polygons']:
            raise ValueError(identifier + ': polygons are required')
        if feature['kind'] == 'building':
            finite(feature['height']['metres'], identifier + ' height', .1, 500)
            if not feature.get('architecturalReview', '').startswith('required:'):
                raise ValueError(identifier + ': maximum-height massing meaning is required')
        for polygon in feature['polygons']:
            validate_polygon(polygon, identifier)
    if context['identity'] not in identifiers:
        raise ValueError('Required landmark identity is absent')
    for polygon in context['ground']:
        validate_polygon(polygon, 'ground')
    for key in ('storeyHeightMetres', 'windowSpacingMetres'):
        finite(context['authoredPolicy'][key], key, .1, 100)


class MeshData:
    def __init__(self):
        self.vertices = []
        self.faces = []
        self.source_indices = []

    def face(self, points):
        start = len(self.vertices)
        self.vertices.extend(tuple(point) for point in points)
        self.faces.append(tuple(range(start, start + len(points))))

    def top(self, polygon, height, reverse=False):
        for triangle in polygon['triangles']:
            ordered = triangle if triangle_area(triangle) > 0 else list(reversed(triangle))
            if reverse:
                ordered = list(reversed(ordered))
            self.face([(x, y, height) for x, y in ordered])

    def extend(self, other):
        start = len(self.vertices)
        self.vertices.extend(other.vertices)
        self.faces.extend(tuple(start + index for index in face) for face in other.faces)
        self.source_indices.extend(other.source_indices)


def feature_geometry(feature, policy):
    identifier = feature['sourceId']
    if feature['kind'] != 'building':
        data = MeshData()
        for polygon in feature['polygons']:
            data.top(polygon, SURFACE_HEIGHTS[feature['kind']])
        return {'context-' + feature['kind']: data}, {'windowPanels': 0, 'courtyardRings': 0}
    palette = int(hashlib.sha256(identifier.encode()).hexdigest()[:8], 16) % len(WALL_MATERIALS)
    wall_name = WALL_MATERIALS[palette]
    result = {name: MeshData() for name in (wall_name, 'context-roof', 'context-trim', 'context-glass')}
    top = feature['height']['metres']
    floor_height = policy['storeyHeightMetres']
    spacing = policy['windowSpacingMetres']
    window_panels = 0
    for polygon in feature['polygons']:
        result['context-roof'].top(polygon, top)
        result[wall_name].top(polygon, 0, reverse=True)
        for ring in [polygon['outer']] + polygon['holes']:
            for a, b in zip(ring, ring[1:]):
                dx, dy = b[0] - a[0], b[1] - a[1]
                length = math.hypot(dx, dy)
                tangent = (dx / length, dy / length)
                outward = (tangent[1], -tangent[0])
                result[wall_name].face([(a[0], a[1], 0), (b[0], b[1], 0), (b[0], b[1], top), (a[0], a[1], top)])

                def panel(start, end, bottom, height, offset):
                    return [(a[0] + tangent[0] * distance + outward[0] * offset,
                             a[1] + tangent[1] * distance + outward[1] * offset, elevation)
                            for distance, elevation in [(start, bottom), (end, bottom), (end, bottom + height), (start, bottom + height)]]

                # 窗口采用统一的作者设计，不推断实际楼层、入口或室内使用。
                slots = max(0, int((length - .8) / spacing))
                levels = max(0, int((top - .6) / floor_height))
                for level in range(levels):
                    bottom = level * floor_height + .85
                    height = min(1.45, floor_height * .50, top - .45 - bottom)
                    if height <= .3:
                        continue
                    for slot in range(slots):
                        center = length * (slot + 1) / (slots + 1)
                        half = min(.65, spacing * .22)
                        result['context-trim'].face(panel(center - half - .09, center + half + .09, bottom - .09, height + .18, .022))
                        result['context-glass'].face(panel(center - half, center + half, bottom, height, .035))
                        window_panels += 1
                if length >= .5 and top >= 1:
                    result['context-trim'].face(panel(0, length, top - .16, .16, .018))
    return result, {'windowPanels': window_panels, 'courtyardRings': sum(len(p['holes']) for p in feature['polygons'])}


def make_material(name, settings):
    hex_color, roughness, metalness = settings
    srgb = [int(hex_color[index:index + 2], 16) / 255 for index in (0, 2, 4)]
    linear = [value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4 for value in srgb]
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*linear, 1)
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metalness
    if name == 'context-glass':
        shader.inputs['Coat Weight'].default_value = .25
        shader.inputs['Coat Roughness'].default_value = .12
    material['provenance'] = 'Authored shared neutral PBR; appearance is unreviewed'
    return material


def make_mesh(name, data, material, collection):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(data.vertices, [], data.faces)
    if mesh.validate(verbose=True, clean_customdata=False):
        raise ValueError(name + ': Blender rejected supplied mesh data')
    mesh.update()
    if data.source_indices:
        if len(data.source_indices) != len(data.vertices):
            raise ValueError(name + ': source indices do not match vertices')
        attribute = mesh.attributes.new(name='_SOURCE_INDEX', type='FLOAT', domain='POINT')
        attribute.data.foreach_set('value', data.source_indices)
    mesh.calc_loop_triangles()
    if any(triangle.area <= 1e-12 for triangle in mesh.loop_triangles):
        raise ValueError(name + ': zero-area rendered triangle')
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj


def main():
    parser = argparse.ArgumentParser(description='Export prepared geographic context with authored shared finishes')
    parser.add_argument('--context', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    arguments = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    if bpy.app.version != (4, 3, 2):
        raise ValueError('This reproducible exporter requires Blender4.3.2')
    context_path = arguments.context.resolve()
    context = json.loads(context_path.read_text())
    validate_context(context)
    output_dir = arguments.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    limits = {key: min(MAXIMUMS[key], int(finite(context['limits'][key], key, 1, MAXIMUMS[key]))) for key in MAXIMUMS}
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1
    scene['siteId'] = context['id']
    scene['representation'] = 'geographic-context'
    scene['navigation'] = 'unreviewed'
    scene['sourceSha256'] = context['source']['sha256']
    scene['contextSha256'] = sha256(context_path)
    scene['sourceIds'] = json.dumps([feature['sourceId'] for feature in context['features']])
    scene['sourceIdsEncoding'] = 'JSON array of stable source identifiers'
    editable = bpy.data.collections.new('Editable geographic features')
    scene.collection.children.link(editable)
    materials = {name: make_material(name, settings) for name, settings in MATERIALS.items()}
    grouped = {}
    feature_records = []
    roots = []
    ground = MeshData()
    for polygon in context['ground']:
        ground.top(polygon, SURFACE_HEIGHTS['ground'])
    ground.source_indices = [-1.0] * len(ground.vertices)
    grouped['context-ground'] = {'data': ground, 'sourceIds': [], 'ranges': []}
    make_mesh('Authored level-ground display', ground, materials['context-ground'], editable)
    for feature_index, feature in enumerate(context['features']):
        identifier = feature['sourceId']
        root = bpy.data.objects.new(identifier, None)
        editable.objects.link(root)
        root['sourceId'] = identifier
        root['sourceVersion'] = str(feature['sourceVersion'])
        root['sourceTimestamp'] = str(feature['sourceTimestamp'])
        root['sourceTags'] = json.dumps(feature['sourceTags'], ensure_ascii=False, sort_keys=True)
        root['kind'] = feature['kind']
        root['navigation'] = 'unreviewed'
        if feature['kind'] == 'building':
            root['architecturalReview'] = feature['architecturalReview']
            root['heightMeaning'] = json.dumps(feature['height'], sort_keys=True)
        roots.append(root)
        geometry, detail = feature_geometry(feature, context['authoredPolicy'])
        material_ranges = []
        for material_name, data in geometry.items():
            if not data.faces:
                continue
            data.source_indices = [float(feature_index)] * len(data.vertices)
            obj = make_mesh(identifier + '_' + material_name, data, materials[material_name], editable)
            obj.parent = root
            obj['sourceId'] = identifier
            obj['geometryMeaning'] = 'Source footprint with authored maximum-height massing and finish' if feature['kind'] == 'building' else 'Prepared geographic surface with authored level-ground presentation'
            group = grouped.setdefault(material_name, {'data': MeshData(), 'sourceIds': [], 'ranges': []})
            record = {'sourceId': identifier, 'firstVertex': len(group['data'].vertices), 'vertexCount': len(data.vertices),
                      'firstPolygon': len(group['data'].faces), 'polygonCount': len(data.faces)}
            group['ranges'].append(record)
            group['sourceIds'].append(identifier)
            group['data'].extend(data)
            material_ranges.append({'material': material_name, **record})
        feature_records.append({'sourceId': identifier, 'kind': feature['kind'], 'height': feature['height'],
                                'architecturalReview': feature.get('architecturalReview'), 'navigation': 'unreviewed',
                                'sourceVersion': feature['sourceVersion'], 'sourceTimestamp': feature['sourceTimestamp'],
                                'renderRanges': material_ranges, **detail})
    triangle_count = sum(sum(len(face) - 2 for face in group['data'].faces) for group in grouped.values())
    if triangle_count > limits['triangles'] or len(grouped) > limits['batches']:
        raise ValueError(f'Geometry budget exceeded: {triangle_count} triangles/{len(grouped)} batches')

    # .blend 保留每个来源要素，运行时按共享材质合并并记录来源列表。
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / 'site.blend'), check_existing=False)
    runtime = bpy.data.collections.new('Runtime material batches')
    scene.collection.children.link(runtime)
    batches = []
    for material_name, group in grouped.items():
        obj = make_mesh(material_name, group['data'], materials[material_name], runtime)
        obj['sourceIds'] = json.dumps(group['sourceIds'])
        obj['sourceIdsEncoding'] = 'JSON array of stable source identifiers'
        obj['representation'] = 'geographic-context'
        obj['navigation'] = 'unreviewed'
        batches.append(obj)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in batches + roots:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = batches[0]
    pending_path = output_dir / 'scene.pending.glb'
    bpy.ops.export_scene.gltf(filepath=str(pending_path), export_format='GLB', use_selection=True,
                             export_yup=True, export_apply=True, export_extras=True,
                             export_attributes=True,
                             export_cameras=False, export_lights=False, export_animations=False)
    if pending_path.stat().st_size > limits['modelBytes']:
        raise ValueError('Exported GLB exceeds the reviewed byte budget')
    model_path = output_dir / 'scene.glb'
    pending_path.replace(model_path)
    blend_path = output_dir / 'site.blend'
    manifest = {
        'schemaVersion': 1, 'id': context['id'], 'title': context['title'],
        'model': {'file': 'scene.glb', 'sha256': sha256(model_path), 'bytes': model_path.stat().st_size},
        'editable': {'file': 'site.blend', 'sha256': sha256(blend_path), 'bytes': blend_path.stat().st_size},
        'geometry': {'triangles': triangle_count, 'batches': len(batches), 'features': len(feature_records),
                     'buildings': sum(feature['kind'] == 'building' for feature in feature_records),
                     'courtyardRings': sum(feature['courtyardRings'] for feature in feature_records),
                     'windowPanels': sum(feature['windowPanels'] for feature in feature_records)},
        'representation': 'geographic-context', 'navigation': 'unreviewed', 'landmarkArchitecture': 'unreviewed',
        'source': context['source'], 'origin': context['origin'], 'projection': context['projection'],
        'bounds': context['bounds'], 'geographicBounds': context['geographicBounds'],
        'contextSha256': sha256(context_path), 'configSha256': context['configSha256'],
        'generatorSha256': sha256(__file__), 'blenderVersion': bpy.app.version_string,
        'limits': limits, 'authoredPolicy': context['authoredPolicy'], 'features': feature_records,
        'presentation': {'surfaceHeightsMetres': SURFACE_HEIGHTS, 'materials': MATERIALS,
                         'windows': 'Neutral authored panels and rims; no source-matched facade, entrance, occupancy or storey assignment',
                         'height': 'Maximum-height massing only; roof/body partition and local grade are unreviewed',
                         'lighting': 'PBR surfaces accept authored runtime lighting; no actual-condition claim',
                         'sourceMapping': 'Stable sourceId metadata roots and per-material sourceIds JSON; renderRanges describe the editable pre-export mesh order',
                         'sourceIndexAttribute': {'gltf': '_SOURCE_INDEX', 'three': '_source_index',
                                                  'lookup': 'manifest.features[index].sourceId', 'unassigned': -1}},
    }
    write_json(output_dir / 'manifest.json', manifest)
    print(json.dumps({'id': context['id'], 'model': manifest['model'], 'geometry': manifest['geometry']}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
