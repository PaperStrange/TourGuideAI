# SPDX-License-Identifier: GPL-3.0-or-later
# 邻里素材按完整建筑分区；导航表面常驻，共享贴图独立于细节层级。
import argparse
import gzip
import hashlib
import json
import math
import shutil
import sys
import time
from urllib.parse import quote
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_site_context import validate_polygon
from neighborhood_mesh import MeshBatch, building_geometry
from neighborhood_materials import generate_textures
from neighborhood_landmarks import landmark_geometry, canopy_geometry, waterside_geometry
from neighborhood_river import load_river_context, river_context_geometry, mesh_source_table


ROOT = Path(__file__).resolve().parents[2]
MAPPING = '[x, height, -y]'


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def file_record(path, asset_dir):
    return {'file': path.relative_to(asset_dir).as_posix(), 'sha256': sha256(path), 'bytes': path.stat().st_size}


def linear_rgb(value):
    channels = [int(value.removeprefix('#')[index:index + 2], 16) / 255 for index in (0, 2, 4)]
    return [channel / 12.92 if channel <= .04045 else ((channel + .055) / 1.055) ** 2.4 for channel in channels]


def bounds_of(features):
    points = [point for feature in features for polygon in feature.get('polygons', []) for point in polygon['outer']]
    points.extend((feature['x'], feature['y']) for feature in features if 'x' in feature)
    if not points:
        raise ValueError('Spatial assets require nonempty source geometry')
    return {'minX': min(point[0] for point in points), 'maxX': max(point[0] for point in points),
            'minY': min(point[1] for point in points), 'maxY': max(point[1] for point in points)}


def validate_inputs(geography, style):
    if geography.get('id') != 'shijo-east' or style.get('id') != 'shijo-east':
        raise ValueError('The source and art recipe must identify shijo-east')
    mapping = geography['frame']['gltfMapping'].replace(' ', '').strip('[]')
    if mapping != 'x,height,-y':
        raise ValueError('Unexpected geographic coordinate mapping')
    identities = set()
    for feature in geography['features']:
        if feature['sourceId'] in identities:
            raise ValueError('Duplicate source feature: ' + feature['sourceId'])
        identities.add(feature['sourceId'])
        for polygon in feature['polygons']:
            validate_polygon(polygon, feature['sourceId'])
        if feature['kind'] == 'building':
            height = feature['height']['metres']
            if not isinstance(height, (int, float)) or not math.isfinite(height) or not .4 <= height <= 300:
                raise ValueError(feature['sourceId'] + ': unsupported height')
    if not geography.get('surfaces'):
        raise ValueError('Reviewed resident surfaces must be supplied independently of scenery')
    for surface in geography['surfaces']:
        for polygon in surface['polygons']:
            validate_polygon(polygon, surface['sourceId'])
        if not math.isfinite(surface['topHeightMetres']):
            raise ValueError('A resident surface needs a finite authored or sourced height')
        if surface.get('walkable') and not surface.get('surfaceId'):
            raise ValueError('Walkable surfaces require a stable surfaceId')
    if not 80 <= style['cellSizeMetres'] <= 120:
        raise ValueError('The reviewed cell-size range is 80 to 120 metres')
    for recipe in style['recipes'].values():
        if not recipe.get('referenceIds') or not recipe.get('authored'):
            raise ValueError('A facade recipe must retain reference IDs and authored distinctions')
        for key in ('wallMaterial', 'roofMaterial', 'glassMaterial', 'frameMaterial'):
            if recipe[key] not in style['materials']:
                raise ValueError('Unknown facade material: ' + recipe[key])
    source_features = {feature['sourceId']: feature for feature in geography['features']}
    for source_id, override in style.get('sourceMaterialOverrides', {}).items():
        feature = source_features[source_id]
        if (feature['kind'] != override['expectedKind'] or feature['kind'] != 'canopy' or
                feature['sourceVersion'] != override['expectedSourceVersion'] or
                feature['topHeightMetres'] != override['expectedTopHeightMetres']):
            raise ValueError('Reviewed canopy material source changed: ' + source_id)
        prior = style['materials'][override['priorRoofMaterial']]
        replacement = style['materials'][override['roofMaterial']]
        if prior['metresPerRepeat'] != replacement['metresPerRepeat']:
            raise ValueError('A material-only canopy treatment must preserve UV scale')
        for evidence in override['evidence']:
            if sha256(ROOT / evidence['file']) != evidence['sha256']:
                raise ValueError('Reviewed material evidence changed: ' + evidence['file'])
        audit = json.loads((ROOT / override['evidence'][0]['file']).read_text())
        reference = json.loads((ROOT / override['evidence'][1]['file']).read_text())
        if (audit['status'] != 'pass' or source_id != 'osm:way:' + str(audit['roofWay']['id']) or
                reference['mappedRoofId'] != source_id):
            raise ValueError('Canopy material review has no matching mapped source')
    landmarks = {feature['sourceId']: feature for feature in geography.get('landmarks', [])}
    for source_id, override in style.get('landmarkMaterialOverrides', {}).items():
        feature = landmarks[source_id]
        if (feature['kind'] != override['expectedKind'] or feature['kind'] != 'torii' or
                feature['sourceVersion'] != override['expectedSourceVersion']):
            raise ValueError('Reviewed landmark material source changed: ' + source_id)
        prior = style['materials'][override['priorHangingMaterial']]
        replacement = style['materials'][override['hangingMaterial']]
        if prior['metresPerRepeat'] != replacement['metresPerRepeat']:
            raise ValueError('Landmark material treatment must preserve UV scale')
        for evidence in override['evidence']:
            if sha256(ROOT / evidence['file']) != evidence['sha256']:
                raise ValueError('Reviewed landmark material evidence changed: ' + evidence['file'])
        review = json.loads((ROOT / override['evidence'][0]['file']).read_text())
        if (review['status'] != 'reviewed-source-support' or review['sourceId'] != source_id or
                review['sourceIndex'] != override['expectedSourceIndex'] or
                review['reference']['id'] not in override['referenceIds']):
            raise ValueError('Landmark material review has no matching source')
    for source_id, treatment in style.get('sourceTreatmentOverrides', {}).items():
        feature = source_features[source_id]
        if feature['kind'] != 'building' or treatment['treatment'] != 'wall-less-structure':
            raise ValueError('Unsupported reviewed source treatment: ' + source_id)
        if treatment['recipeId'] not in style['recipes']:
            raise ValueError('Reviewed source treatment requires an existing material recipe')
        if (feature['height']['metres'] != treatment['expectedHeightMetres'] or
                feature.get('baseHeightMetres', 0) != treatment['expectedBaseHeightMetres']):
            raise ValueError('Reviewed source envelope height changed: ' + source_id)
        for evidence in treatment['evidence']:
            if sha256(ROOT / evidence['file']) != evidence['sha256']:
                raise ValueError('Reviewed source treatment evidence changed: ' + evidence['file'])
        audit = json.loads((ROOT / treatment['evidence'][0]['file']).read_text())
        if (audit['status'] != 'pass' or audit['sourceId'] != source_id or
                not audit['insideFootprint'] or audit['height'] != feature['height']):
            raise ValueError('Reviewed source treatment has no matching envelope audit')
        semantics = json.loads((ROOT / treatment['evidence'][2]['file']).read_text())
        if semantics['sourceId'] != source_id or semantics['additionalProperties']['分類'] != '普通無壁舎':
            raise ValueError('Reviewed open construction requires the exact wall-less classification')
        boundary = json.loads((ROOT / treatment['evidence'][4]['file']).read_text())
        adjacent = boundary['adjacentSurfaces']
        if (boundary['status'] != 'pass' or boundary['sourceId'] != source_id or
                boundary['sourceIndex'] != treatment['expectedSourceIndex'] or
                boundary['unmatchedBoundaryMetres'] != 0 or len(adjacent) != 1 or
                adjacent[0]['sourceId'] != 'shijo-east:ground' or adjacent[0]['positiveAreaOverlapSquareMetres'] != 0 or
                adjacent[0]['floorHeightMetres'] != treatment['construction']['floorHeightMetres'] or
                adjacent[0]['topHeightMetres'] != treatment['construction']['floorEdgeBottomMetres'] or
                abs(adjacent[0]['sharedBoundaryMetres'] - boundary['floorPerimeterMetres']) > 1e-8):
            raise ValueError('Reviewed floor closure requires complete adjacent-boundary evidence')
        for source in boundary['inputs']:
            if sha256(ROOT / source['file']) != source['sha256']:
                raise ValueError('Reviewed floor boundary input changed: ' + source['file'])


def create_materials(style, asset_dir):
    materials, resource_paths = {}, set()
    shared_dir = asset_dir / 'shared/materials'
    shared_dir.mkdir(parents=True, exist_ok=True)
    generated = generate_textures(style['materials'], shared_dir)
    for name, specification in style['materials'].items():
        material = bpy.data.materials.new(name)
        material.use_nodes = True
        bsdf = material.node_tree.nodes.get('Principled BSDF')
        color = linear_rgb(specification['color'])
        material.diffuse_color = (*color, 1)
        bsdf.inputs['Base Color'].default_value = (*color, 1)
        bsdf.inputs['Roughness'].default_value = specification['roughness']
        bsdf.inputs['Metallic'].default_value = specification.get('metalness', 0)
        bsdf.inputs['Coat Weight'].default_value = specification.get('coatWeight', 0)
        bsdf.inputs['Coat Roughness'].default_value = specification.get('coatRoughness', .1)
        for socket_name, key, generated_key in [('Base Color', 'baseColor', 'color'), ('Roughness', 'roughnessMap', 'roughness'), ('Normal', 'normal', 'normal')]:
            if key in specification:
                source = (ROOT / specification[key]['file']).resolve()
                if sha256(source) != specification[key]['sha256']:
                    raise ValueError('Shared original material hash mismatch: ' + name)
                destination = shared_dir / source.name
                if destination.exists() and sha256(destination) != sha256(source):
                    raise ValueError('Shared material filename collision: ' + source.name)
                shutil.copyfile(source, destination)
            elif name in generated:
                destination = generated[name][generated_key]
            else:
                continue
            image = bpy.data.images.load(str(destination), check_existing=True)
            image.colorspace_settings.name = 'sRGB' if key == 'baseColor' else 'Non-Color'
            texture = material.node_tree.nodes.new('ShaderNodeTexImage')
            texture.image = image
            if key == 'normal':
                normal = material.node_tree.nodes.new('ShaderNodeNormalMap')
                normal.inputs['Strength'].default_value = specification.get('normalStrength', .4)
                material.node_tree.links.new(texture.outputs['Color'], normal.inputs['Color'])
                material.node_tree.links.new(normal.outputs['Normal'], bsdf.inputs[socket_name])
            else:
                material.node_tree.links.new(texture.outputs['Color'], bsdf.inputs[socket_name])
            resource_paths.add(destination)
        material['surfaceMeaning'] = specification['authored']
        materials[name] = material
    return materials, resource_paths


def make_mesh(name, data, material, metres_per_repeat, feature_table, extras):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(data.vertices, [], data.faces)
    if mesh.validate(verbose=True, clean_customdata=False):
        raise ValueError(name + ': Blender repaired invalid generated geometry')
    mesh.update()
    attribute = mesh.attributes.new(name='_SOURCE_INDEX', type='FLOAT', domain='POINT')
    attribute.data.foreach_set('value', data.source_indices)
    uv = mesh.uv_layers.new(name='UVMap')
    for face in mesh.polygons:
        axis = max(range(3), key=lambda index: abs(face.normal[index]))
        for loop_index in face.loop_indices:
            point = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            coordinates = (point.x, point.y) if axis == 2 else ((point.x, point.z) if axis == 1 else (point.y, point.z))
            uv.data[loop_index].uv = [value / metres_per_repeat for value in coordinates]
    mesh.calc_loop_triangles()
    if any(triangle.area <= 1e-12 for triangle in mesh.loop_triangles):
        raise ValueError(name + ': generated zero-area triangle')
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    for key, value in extras.items():
        obj[key] = value
    obj['sourceIndexLookup'] = 'manifest.featureTable'
    obj['sourceIndexAttribute'] = '_SOURCE_INDEX'
    return obj


def export_asset(path, objects, asset_dir, resource_paths, max_bytes):
    if not objects:
        raise ValueError('Cannot export a scenery section with no geometry')
    path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
        obj.data.calc_loop_triangles()
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLTF_SEPARATE',
                             export_keep_originals=True, use_selection=True, export_yup=True,
                             export_apply=True, export_extras=True, export_attributes=True,
                             export_cameras=False, export_lights=False, export_animations=False)
    # Blender 自身负责 glTF 编码；这里只收集已知导出资源，后续验证器审阅实际依赖。
    binary = path.with_suffix('.bin')
    if not binary.exists():
        raise ValueError('The glTF exporter did not produce its geometry buffer')
    total = path.stat().st_size + binary.stat().st_size
    used_images = set()
    for obj in objects:
        for material in obj.data.materials:
            for node in material.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image:
                    used_images.add(Path(bpy.path.abspath(node.image.filepath)).resolve())
    if not used_images.issubset(resource_paths):
        raise ValueError('Export references an image outside the reviewed shared resources')
    return {**file_record(path, asset_dir),
            'dependencies': [file_record(dependency, asset_dir) for dependency in [binary] + sorted(used_images)],
            'geometryBytes': total,
            'uncompressedBudgetExceeded': total > max_bytes, 'transferBudgetBytes': max_bytes,
            'triangles': sum(len(obj.data.loop_triangles) for obj in objects), 'batches': len(objects)}


def remove_meshes(objects):
    for obj in objects:
        mesh = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def recipe_for(feature, style):
    return style['recipes'][feature['recipeId']]


def point_segment_distance(point, start, end):
    dx, dy = end[0] - start[0], end[1] - start[1]
    length_squared = dx * dx + dy * dy
    if length_squared <= 1e-12:
        raise ValueError('Route graph contains a zero-length segment')
    parameter = min(1, max(0, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length_squared))
    nearest = (start[0] + parameter * dx, start[1] + parameter * dy)
    return math.dist(point, nearest), nearest


def prepare_features(scene, geography, style, prepared):
    selections = {record['sourceId']: record for record in prepared['buildings']}
    arcade_edges = {}
    for edge in prepared['arcadeFacadeEdges']:
        arcade_edges.setdefault(edge['sourceId'], []).append([edge['polygonIndex'], 0, edge['edgeIndex']])
    features = []
    for original in scene['features']:
        if original.get('renderPolicy', '').startswith('reference-only'):
            continue
        feature = dict(original)
        if feature['sourceId'] in style.get('sourceMaterialOverrides', {}):
            # 材质覆盖只更改指定屋顶的表面；坐标、UV 比例和碰撞体保持原样。
            feature['roofMaterial'] = style['sourceMaterialOverrides'][feature['sourceId']]['roofMaterial']
        if feature['kind'] == 'building':
            bounds = bounds_of([feature])
            center = ((bounds['minX'] + bounds['maxX']) / 2, (bounds['minY'] + bounds['maxY']) / 2)
            selection = selections[feature['sourceId']]
            feature['routeDistanceMetres'] = selection['distanceToRouteMetres']
            rule = style['assignmentRules']
            inside = lambda box: box['minX'] <= center[0] <= box['maxX'] and box['minY'] <= center[1] <= box['maxY']
            recipe = ('urban-stone', 'urban-plaster', 'urban-tile')[int(hashlib.sha256(feature['sourceId'].encode()).hexdigest()[:4], 16) % 3]
            if inside(rule['laneBounds']) and feature['height']['metres'] < 11:
                recipe = 'lane-timber'
            feature['recipeId'] = recipe
            feature['facadeEdges'] = [[edge['polygonIndex'], 0, edge['edgeIndex']] for edge in selection['routeFacingEdges']]
            feature['arcadeFacadeEdges'] = arcade_edges.get(feature['sourceId'], [])
            for edge in feature['arcadeFacadeEdges']:
                if edge not in feature['facadeEdges']:
                    feature['facadeEdges'].append(edge)
            treatment = style.get('sourceTreatmentOverrides', {}).get(feature['sourceId'])
            if treatment:
                # 单项来源分类限定开放构造；支撑和顶棚厚度保留明确的作者说明。
                feature['recipeId'] = treatment['recipeId']
                feature['facadeEdges'] = []
                feature['arcadeFacadeEdges'] = []
                feature['treatmentOverride'] = treatment
            matches = {match['sourceId'] for match in feature.get('osmMatches', [])}
            if 'osm:way:205732558' in matches:
                feature['retainedGroup'] = 'North'
                feature['inspectionFeatureIds'] = ['shijo-east:mitsui-frontage']
            elif 'osm:way:205732536' in matches:
                feature['retainedGroup'] = 'South'
        if feature['sourceId'] == 'osm:way:772134672':
            feature['inspectionFeatureIds'] = ['shijo-east:nishiki-market']
        if feature['sourceId'] == 'osm:way:532008156':
            feature['inspectionFeatureIds'] = ['shijo-east:shijo-bridge']
        if feature['kind'] == 'water' and feature.get('sourceTags', {}).get('name') == '高瀬川':
            feature['inspectionFeatureIds'] = ['shijo-east:takase-river']
        if feature['kind'] == 'water':
            feature['waterBankSegments'] = [segment for segment in prepared['waterBankSegments']
                                            if segment['sourceId'] == feature['sourceId']]
        features.append(feature)
    for original in scene.get('landmarks', []):
        feature = dict(original)
        feature['polygons'] = []
        feature['inspectionFeatureIds'] = ['shijo-east:nishiki-tenmangu' if feature['kind'] == 'torii' else 'shijo-east:pontocho-entrance']
        if feature['sourceId'] in style.get('landmarkMaterialOverrides', {}):
            feature['hangingMaterial'] = style['landmarkMaterialOverrides'][feature['sourceId']]['hangingMaterial']
        features.append(feature)
    return features


def retained_landmarks(asset_dir, resource_paths, source_indices, features):
    source = ROOT / 'experience/public/models/shijo-block.glb'
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(source))
    imported = set(bpy.data.objects) - before
    retained = {'North': [], 'South': [], 'Street': []}
    indices = {group: next(source_indices[feature['sourceId']] for feature in features
                          if feature.get('retainedGroup') == group) for group in ('North', 'South')}
    indices['Street'] = source_indices['authored:retained-shijo-streetscape']
    shared = asset_dir / 'shared/materials'
    finish_root = ROOT / 'experience/public/materials/architectural'
    finish_manifest = json.loads((finish_root / 'manifest.json').read_text())
    finishes = {item['material']: item for item in finish_manifest['maps']}
    applied_materials = set()
    for obj in imported:
        ancestors = [obj.name]
        parent = obj.parent
        while parent:
            ancestors.append(parent.name)
            parent = parent.parent
        group = next((name for name in ('North', 'South') if name + 'Building' in ancestors), None)
        if group is None and 'Street' in ancestors:
            group = 'Street'
        if obj.type != 'MESH' or group is None or group == 'Street' and obj.get('walkable'):
            continue
        obj.data.transform(obj.matrix_world)
        obj.parent = None
        obj.matrix_world.identity()
        attribute = obj.data.attributes.new(name='_SOURCE_INDEX', type='FLOAT', domain='POINT')
        attribute.data.foreach_set('value', [float(indices[group])] * len(obj.data.vertices))
        obj['sourceIndexAttribute'] = '_SOURCE_INDEX'
        semantic = obj.get('semanticGroup') or next((part for part in ancestors[1:] if part.startswith(group) and part != group + 'Building'), obj.name.split('_')[0])
        if group != 'Street':
            obj['occlusionGroup'] = semantic
            obj['semanticGroup'] = semantic
        else:
            for vertex in obj.data.vertices:
                vertex.co.z -= .17
                if 'paint' in obj.name:
                    vertex.co.z = .006
            obj['groundDatumAdjustmentMetres'] = -.17
            obj['retainedStreetDetail'] = True
            obj['retainedStreetCastShadow'] = any(material.name in ('curb', 'dark-metal', 'metal', 'off-white') for material in obj.data.materials)
            obj['surfaceMeaning'] = 'Retained original authored Shijo curb/crossing/street decoration in the frozen source frame'
        for material in obj.data.materials:
            if material not in applied_materials and material.name in finishes:
                finish = finishes[material.name]
                source_image = finish_root / finish['file']
                if sha256(source_image) != finish['sha256']:
                    raise ValueError('Reviewed Shijo finish map hash changed')
                destination = shared / ('retained-finish-' + finish['file'])
                shutil.copyfile(source_image, destination)
                image = bpy.data.images.load(str(destination), check_existing=True)
                image.colorspace_settings.name = 'sRGB'
                bsdf = material.node_tree.nodes.get('Principled BSDF')
                texture = material.node_tree.nodes.new('ShaderNodeTexImage')
                texture.image = image
                material.node_tree.links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
                bsdf.inputs['Metallic'].default_value = 0
                material['reviewedFinishSha256'] = finish['sha256']
                resource_paths.add(destination)
                applied_materials.add(material)
                for unused in list(material.node_tree.nodes):
                    if unused.type == 'TEX_IMAGE' and not any(output.is_linked for output in unused.outputs):
                        material.node_tree.nodes.remove(unused)
            for node in material.node_tree.nodes:
                if node.type != 'TEX_IMAGE' or not node.image:
                    continue
                image = node.image
                if image.packed_file:
                    data = bytes(image.packed_file.data)
                    destination = shared / ('retained-' + hashlib.sha256(data).hexdigest()[:16] + '.png')
                    destination.write_bytes(data)
                    image.filepath = str(destination)
                    image.unpack(method='REMOVE')
                else:
                    destination = Path(bpy.path.abspath(image.filepath)).resolve()
                if not destination.is_relative_to(shared):
                    raise ValueError('Retained landmark texture must be an embedded original image')
                resource_paths.add(destination)
        retained[group].append(obj)
    kept = {obj for objects in retained.values() for obj in objects}
    for obj in imported - kept:
        bpy.data.objects.remove(obj, do_unlink=True)
    if not all(retained.values()):
        raise ValueError('Existing source-recognizable landmark groups were not found')
    for obj in kept:
        obj.hide_set(True)
    return retained, {'file': str(source.relative_to(ROOT)), 'sha256': sha256(source),
                      'reviewedFinishManifestSha256': sha256(finish_root / 'manifest.json'),
                      'groups': {group: len(objects) for group, objects in retained.items()}}


def lighting_asset(asset_dir, bounds, style):
    rig = json.loads((ROOT / 'experience/public/lighting/rig.json').read_text())
    rig['id'] = 'shijo-east-lighting-v1'
    rig['renderBounds'] = bounds
    rig['limits']['maxShadowCastingLocalLights'] = 3
    for identifier, mode in rig['modes'].items():
        mode['fixtures'] = []
        source = ROOT / 'experience/public/lighting' / mode['environment']['file']
        source_hash = sha256(source)
        if source_hash != mode['environment']['sha256']:
            raise ValueError('Reviewed environment source hash changed')
        destination = asset_dir / 'shared/environments' / (identifier + '-512.hdr')
        destination.parent.mkdir(parents=True, exist_ok=True)
        environment = bpy.data.images.load(str(source), check_existing=False)
        original_dimensions = list(environment.size)
        environment.scale(512, 256)
        environment.file_format = 'HDR'
        environment.filepath_raw = str(destination)
        environment.save()
        bpy.data.images.remove(environment)
        mode['environment']['source'] = {'file': str(source.relative_to(ROOT)), 'sha256': source_hash,
                                         'dimensions': original_dimensions, 'operation': 'Blender Image.scale to512x256 linear Radiance HDR; source exposure and mode intensity unchanged'}
        mode['environment']['file'] = destination.relative_to(asset_dir).as_posix()
        mode['environment']['sha256'] = sha256(destination)
        mode['environment']['bytes'] = destination.stat().st_size
        mode['environment']['dimensions'] = [512, 256]
        mode['fog']['near'], mode['fog']['far'] = 100, 270
        mode['sun']['shadow']['fit'] = 'moving-local-region'
        mode['materials'] = mode.get('materials', []) + [
            {'match': ['lamp'], 'emissiveColor': '#ffe1b2', 'emissiveIntensity': 1.4 if mode is rig['modes']['night'] else .03}]
    path = asset_dir / 'lighting.json'
    write_json(path, rig)
    return {**file_record(path, asset_dir), 'dependencies': []}


def cell_fixtures(members, identifier):
    fixtures = []
    retained = {feature.get('retainedGroup') for feature in members}
    if 'North' in retained or 'South' in retained:
        original = json.loads((ROOT / 'experience/public/lighting/rig.json').read_text())['modes']['night']['fixtures']
        for fixture in original:
            if ('North' in retained and fixture['position'][2] < 9) or ('South' in retained and fixture['position'][2] >= 9):
                copy = json.loads(json.dumps(fixture))
                copy['modes'] = ['night']
                copy['position'][1] -= .17
                copy['target'][1] -= .17
                fixtures.append(copy)
    for feature in members:
        if feature['kind'] not in ('canopy', 'torii', 'information-board'):
            continue
        bounds = bounds_of([feature])
        x, y = (bounds['minX'] + bounds['maxX']) / 2, (bounds['minY'] + bounds['maxY']) / 2
        locations = [(x, y)]
        if feature['sourceId'] == 'osm:way:772134672':
            locations = [(xx, y) for xx in range(math.ceil(bounds['minX'] / 12) * 12, math.ceil(bounds['maxX'] / 12) * 12, 12)]
        for x, y in locations:
            fixtures.append({'id': identifier + '-' + str(len(fixtures)), 'type': 'spot', 'enabled': True,
                         'modes': ['night'], 'position': [x, 4.35, -y], 'target': [x, 0, -y],
                         'color': '#ffdfb7', 'intensity': 55, 'distance': 17, 'decay': 2,
                         'angle': 1.18, 'penumbra': .85,
                         'shadow': {'enabled': True, 'mapSize': 512, 'bias': -.0001,
                                    'normalBias': .02, 'radius': 3.8, 'near': .2, 'far': 17}})
    return fixtures


def main():
    parser = argparse.ArgumentParser(description='Export source-reviewed connected neighborhood scenery')
    parser.add_argument('--geography', type=Path, default=ROOT / 'experience/src/neighborhoods/shijo-east/geography.json')
    parser.add_argument('--scene', type=Path, default=ROOT / 'experience/src/neighborhoods/shijo-east/scene.json')
    parser.add_argument('--prepared-art', type=Path, required=True)
    parser.add_argument('--river-context', type=Path)
    parser.add_argument('--style', type=Path, default=ROOT / 'experience/art/neighborhood-style.json')
    parser.add_argument('--asset-dir', type=Path, default=ROOT / 'experience/public/assets/neighborhoods/shijo-east')
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'artifacts/neighborhood-20261021/art/build')
    arguments = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    started = time.perf_counter()
    navigation = json.loads(arguments.geography.read_text())
    geography = json.loads(arguments.scene.read_text())
    prepared = json.loads(arguments.prepared_art.read_text())
    style = json.loads(arguments.style.read_text())
    for surface in geography['surfaces']:
        surface['sourceId'] = surface['id']
        surface['surfaceId'] = surface['id']
        surface['material'] = 'paving'
    validate_inputs(geography, style)
    asset_dir, output_dir = arguments.asset_dir.resolve(), arguments.output_dir.resolve()
    asset_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1
    scene['neighborhoodId'] = geography['id']
    scene['sourceSha256'] = sha256(arguments.geography)
    bpy.context.preferences.filepaths.save_version = 0
    materials, resource_paths = create_materials(style, asset_dir)
    if prepared['sourceHashes']['scene.json'] != sha256(arguments.scene) or prepared['sourceHashes']['geography.json'] != sha256(arguments.geography):
        raise ValueError('Prepared art selection does not match frozen source inputs')
    features = prepare_features(geography, navigation, style, prepared)
    feature_table = [{'index': index, 'sourceId': feature['sourceId'], 'kind': feature['kind'],
                      'featureIds': feature.get('inspectionFeatureIds', [feature['sourceId']]),
                      'inspectionFeatureIds': feature.get('inspectionFeatureIds', []),
                      'sourceVersion': feature.get('sourceVersion'),
                      'height': feature.get('height'), 'recipeId': feature.get('recipeId'),
                      **({'treatmentOverride': feature['treatmentOverride']} if feature.get('treatmentOverride') else {})}
                     for index, feature in enumerate(features)]
    source_indices = {feature['sourceId']: index for index, feature in enumerate(features)}
    for source_id, override in style.get('sourceMaterialOverrides', {}).items():
        if source_indices[source_id] != override['expectedSourceIndex']:
            raise ValueError('Reviewed material source index changed: ' + source_id)
    for source_id, treatment in style.get('sourceTreatmentOverrides', {}).items():
        if source_indices[source_id] != treatment['expectedSourceIndex']:
            raise ValueError('Reviewed source index changed: ' + source_id)
    for source_id, override in style.get('landmarkMaterialOverrides', {}).items():
        if source_indices[source_id] != override['expectedSourceIndex']:
            raise ValueError('Reviewed landmark material source index changed: ' + source_id)
    for surface in geography['surfaces'] + prepared.get('displayMaterialSurfaces', []):
        if surface['sourceId'] not in source_indices:
            source_indices[surface['sourceId']] = len(feature_table)
            feature_table.append({'index': len(feature_table), 'sourceId': surface['sourceId'],
                                  'kind': 'surface', 'surfaceId': surface.get('surfaceId'),
                                  'heightMeaning': surface.get('heightMeaning')})
    source_indices['authored:retained-shijo-streetscape'] = len(feature_table)
    feature_table.append({'index': len(feature_table), 'sourceId': 'authored:retained-shijo-streetscape',
                          'kind': 'retained-street-decoration', 'featureIds': []})
    river_context = load_river_context(arguments.river_context, navigation['frame'], feature_table, source_indices, style)
    ground_batches = {}
    if not prepared.get('walkableMaterialSurfaces') or not prepared.get('walkableMaterialAudit') or any(
            item['unionDifferenceSquareMetres'] > 1e-7 or item['overlapSquareMetres'] > 1e-7 or item['hausdorffDistanceMetres'] > 1e-8
            for item in prepared['walkableMaterialAudit']):
        raise ValueError('Prepared walking material surfaces must conserve the reviewed navigation union')
    if not prepared.get('displayMaterialSurfaces'):
        raise ValueError('Prepared source-led display surfaces and retained Shijo roadway are required')
    display_surfaces = prepared['displayMaterialSurfaces'] + prepared['walkableMaterialSurfaces']
    scene_surfaces = display_surfaces + [dict(feature, material={'water': 'water', 'green': 'green', 'bridge': 'paving'}[feature['kind']], walkable=False)
                                            for feature in features if feature['kind'] in ('water', 'green', 'bridge')]
    for surface in scene_surfaces:
        key = (surface['material'], bool(surface.get('walkable')))
        data = ground_batches.setdefault(key, MeshBatch())
        for polygon in surface['polygons']:
            data.top(polygon['triangles'], surface['topHeightMetres'], source_indices[surface['sourceId']])
    ground_objects = [make_mesh('Resident_' + name + ('_walkable' if walkable else ''), data,
                               materials[name], style['materials'][name]['metresPerRepeat'], feature_table,
                               {'walkable': walkable, 'surfaceId': 'shijo-east-ground', 'resident': True})
                      for (name, walkable), data in ground_batches.items()]
    ground = export_asset(asset_dir / 'ground.gltf', ground_objects, asset_dir, resource_paths,
                          style['limits']['groundBytes'])
    bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / 'resident-ground.blend'), check_existing=False)
    remove_meshes(ground_objects)
    retained, retained_provenance = retained_landmarks(asset_dir, resource_paths, source_indices, features)
    cell_features = {}
    distant = []
    size = style['cellSizeMetres']
    for feature in features:
        if feature['kind'] not in ('building', 'canopy', 'torii', 'information-board', 'bridge', 'water'):
            continue
        if feature['kind'] == 'building' and feature.get('routeDistanceMetres', 0) > style['nearRouteMetres'] and not feature.get('retainedGroup'):
            distant.append(feature)
            continue
        if feature['kind'] == 'canopy':
            for section in prepared['roofSections']:
                if section['sourceId'] == feature['sourceId']:
                    joins = [item for item in prepared['arcadeSoffitSections']
                             if item['sourceId'] == feature['sourceId'] and
                             (item['cellX'], item['cellY']) == (section['cellX'], section['cellY'])]
                    cell_features.setdefault((section['cellX'], section['cellY']), []).append(dict(
                        feature, polygons=section['polygons'],
                        soffitPolygons=[polygon for item in joins for polygon in item['polygons']],
                        facadeSegments=[segment for item in joins for segment in item['facadeSegments']]))
            continue
        bounds = bounds_of([feature])
        ix = math.floor((bounds['minX'] + bounds['maxX']) / 2 / size)
        iy = math.floor((bounds['minY'] + bounds['maxY']) / 2 / size)
        cell_features.setdefault((ix, iy), []).append(feature)
    context_batches = {name: MeshBatch() for name in materials}
    for feature in distant:
        building_geometry(feature, recipe_for(feature, style), 'context', source_indices[feature['sourceId']], context_batches)
    context_objects = [make_mesh('Context_' + name, data, materials[name], style['materials'][name]['metresPerRepeat'], feature_table, {'resident': True})
                       for name, data in context_batches.items() if data.faces]
    for original in retained['Street']:
        obj = original.copy()
        obj.data = original.data.copy()
        bpy.context.scene.collection.objects.link(obj)
        obj.hide_set(False)
        context_objects.append(obj)
    context = export_asset(asset_dir / 'context.gltf', context_objects, asset_dir, resource_paths, style['limits']['contextBytes'])
    remove_meshes(context_objects)
    cells = []
    river_context_attached = False
    for (ix, iy), members in sorted(cell_features.items()):
        identifier = f'cell-{"e" if ix >= 0 else "w"}{abs(ix):03d}-{"n" if iy >= 0 else "s"}{abs(iy):03d}'
        bounds = {'minX': ix * size, 'maxX': (ix + 1) * size, 'minY': iy * size, 'maxY': (iy + 1) * size}
        cell = {'id': identifier, 'bounds': bounds, 'contentBounds': bounds_of(members),
                'featureIds': [member['sourceId'] for member in members],
                'featureTable': {str(source_indices[member['sourceId']]): feature_table[source_indices[member['sourceId']]] for member in members},
                'fixtures': cell_fixtures(members, identifier)}
        for lod in ('base', 'near'):
            batches = {name: MeshBatch() for name in materials}
            canopy_batches = {name: MeshBatch() for name in materials}
            counts = {'openings': 0, 'recesses': 0, 'edges': 0}
            extra_objects = []
            retained_done = set()
            for feature in members:
                index = source_indices[feature['sourceId']]
                if feature.get('retainedGroup'):
                    group = feature['retainedGroup']
                    if group not in retained_done:
                        for original in retained[group]:
                            obj = original.copy()
                            obj.data = original.data.copy()
                            bpy.context.scene.collection.objects.link(obj)
                            obj.hide_set(False)
                            if lod == 'base':
                                modifier = obj.modifiers.new('DistantOriginalArchitecture', 'DECIMATE')
                                modifier.ratio = .42
                                bpy.context.view_layer.objects.active = obj
                                bpy.ops.object.modifier_apply(modifier=modifier.name)
                            extra_objects.append(obj)
                        retained_done.add(group)
                elif feature['kind'] == 'building':
                    recipe = dict(recipe_for(feature, style), facadeEdges=feature['facadeEdges'],
                                  arcadeFacadeEdges=feature['arcadeFacadeEdges'], arcadeRecipe=style['recipes']['market-front'])
                    detail = building_geometry(feature, recipe, lod, index, batches)
                    for key, value in detail.items():
                        counts[key] += value
                elif feature['kind'] == 'canopy':
                    canopy_geometry(feature, lod, index, canopy_batches, batches)
                elif feature['kind'] in ('torii', 'information-board'):
                    landmark_geometry(feature, lod, index, batches)
                elif feature['kind'] in ('bridge', 'water'):
                    waterside_geometry(feature, lod, index, batches)
            objects = [make_mesh(identifier + '_' + lod + '_' + name, data, materials[name],
                                 style['materials'][name]['metresPerRepeat'], feature_table,
                                 {'cellId': identifier, 'detailLevel': lod})
                       for name, data in batches.items() if data.faces] + extra_objects
            objects.extend(make_mesh(identifier + '_' + lod + '_Canopy_' + name, data, materials[name],
                                     style['materials'][name]['metresPerRepeat'], feature_table,
                                     {'cellId': identifier, 'detailLevel': lod, 'occlusionGroup': 'Canopy_' + identifier})
                           for name, data in canopy_batches.items() if data.faces)
            if river_context and identifier == river_context['source']['attachmentCellId']:
                river_groups = river_context_geometry(river_context, style)
                for group, river_batches in sorted(river_groups.items()):
                    for name, data in river_batches.items():
                        if not data.faces:
                            continue
                        obj = make_mesh(identifier + '_' + lod + '_RiverContext_' + group + '_' + name,
                                        data, materials[name], style['materials'][name]['metresPerRepeat'], feature_table,
                                        {'cellId': identifier, 'detailLevel': lod, 'riverContext': True, 'walkable': False,
                                         'spatialGroup': group, 'featureTable': mesh_source_table(river_context, data.source_indices)})
                        obj['sourceIndexLookup'] = 'mesh.featureTable'
                        objects.append(obj)
                river_context_attached = True
            cell[lod] = export_asset(asset_dir / 'cells' / identifier / (lod + '.gltf'), objects,
                                     asset_dir, resource_paths, style['limits']['sectionBytes'])
            cell[lod]['detail'] = counts
            if lod == 'near':
                bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / (identifier + '.blend')), check_existing=False)
            remove_meshes(objects)
        cells.append(cell)
        print('[neighborhood-art] ' + identifier + ' ' + str(cell['near']['geometryBytes']), flush=True)
    if river_context and not river_context_attached:
        raise ValueError('Reviewed bridge cell is absent from the exported neighborhood')
    lighting = lighting_asset(asset_dir, geography['bounds'], style)
    for name in ('source-ledger.json', 'source-review.json'):
        shutil.copyfile(arguments.scene.parent / name, asset_dir / name)
    references_path = Path(__file__).with_name('neighborhood-references.json')
    references = json.loads(references_path.read_text())
    for reference in references['references']:
        if 'title' in reference:
            reference['url'] = 'https://commons.wikimedia.org/wiki/' + quote(reference['title'].replace(' ', '_'), safe=':,_()')
    write_json(asset_dir / 'references.json', references)
    provenance = {'version': 1, 'id': geography['id'], 'geographySha256': sha256(arguments.geography),
                  'sceneSha256': sha256(arguments.scene), 'preparedArtSha256': sha256(arguments.prepared_art),
                  'preparedArtSourceHashes': prepared['sourceHashes'],
                  'preparedArtProducerSha256': sha256(ROOT / 'experience/content-tools/prepare-neighborhood-art.py'),
                  'walkableMaterialAudit': prepared['walkableMaterialAudit'],
                  'arcadeGeometryAudit': prepared['arcadeGeometryAudit'],
                  'waterBoundaryAudit': prepared['waterBoundaryAudit'],
                  'reviewedRoadMask': {key: value for key, value in prepared['reviewedRoadMask'].items() if key not in ('polygons', 'input')},
                  'reviewedRoadMaskSources': {key: value for key, value in prepared['reviewedRoadMask']['input'].items() if key != 'meshes'},
                  'displayTriangulationAudit': [{'sourceId': surface['sourceId'], **surface['float32DisplayAudit']}
                                               for surface in prepared['displayMaterialSurfaces'] if surface.get('float32DisplayAudit', {}).get('omittedTriangles')],
                  'sourceLedger': file_record(asset_dir / 'source-ledger.json', asset_dir),
                  'references': file_record(asset_dir / 'references.json', asset_dir),
                  'styleSha256': sha256(arguments.style), 'generatorSha256': sha256(__file__),
                  'geometryHelperSha256': sha256(Path(__file__).with_name('neighborhood_mesh.py')),
                  'landmarkHelperSha256': sha256(Path(__file__).with_name('neighborhood_landmarks.py')),
                  'materialHelperSha256': sha256(Path(__file__).with_name('neighborhood_materials.py')),
                  'blenderVersion': bpy.app.version_string, 'elapsedSeconds': round(time.perf_counter() - started, 3),
                  'geometryMeaning': 'Source footprints and prepared surface polygons; reviewed original facade assemblies with explicit authored dimensions',
                  'rights': 'source-ledger.json and references.json', 'referenceIds': sorted({reference for recipe in style['recipes'].values() for reference in recipe['referenceIds']}),
                  'retainedLandmarks': retained_provenance,
                  'authored': ['Facade bay counts and window dimensions', 'Material-family assignments on sourced building masses', 'Flat ground and display water/bridge heights', 'Canopy profile and source-adjacent soffit joins up to6m; exact construction widths unmeasured', 'Lower-storey market frontage assemblies without tenant correspondence', 'Bank vertical faces between existing authored ground/water heights', 'Torii/board/railing dimensions', 'Night fixtures, light intensity and emission'],
                  'sourceFramePreserved': True, 'originalPackAssetsChanged': False,
                  'visualAcceptance': 'requires actual browser route review'}
    if style.get('sourceMaterialOverrides'):
        provenance['sourceMaterialOverrides'] = [
            {'sourceId': source_id, **override,
             'evidenceRecords': [{**evidence, 'record': json.loads((ROOT / evidence['file']).read_text())}
                                 for evidence in override['evidence']]}
            for source_id, override in style['sourceMaterialOverrides'].items()]
    if style.get('sourceTreatmentOverrides'):
        provenance['sourceTreatmentOverrides'] = [
            {'sourceId': source_id, **treatment,
             'evidenceRecords': [{**evidence, 'record': json.loads((ROOT / evidence['file']).read_text())}
                                 for evidence in treatment['evidence']]}
            for source_id, treatment in style['sourceTreatmentOverrides'].items()]
    if style.get('landmarkMaterialOverrides'):
        provenance['landmarkMaterialOverrides'] = [
            {'sourceId': source_id, **override,
             'evidenceRecords': [{**evidence, 'record': json.loads((ROOT / evidence['file']).read_text())}
                                 for evidence in override['evidence']]}
            for source_id, override in style['landmarkMaterialOverrides'].items()]
    if river_context:
        # 完整来源输入按确定性 gzip 保存，解码后仍对应审核过的原始字节。
        input_bytes = arguments.river_context.read_bytes()
        input_path = asset_dir / 'river-context.json.gz'
        input_path.write_bytes(gzip.compress(input_bytes, compresslevel=9, mtime=0))
        provenance['riverContext'] = {
            'input': {**file_record(input_path, asset_dir), 'encoding': 'gzip',
                      'decodedSha256': sha256(arguments.river_context), 'decodedBytes': len(input_bytes)},
            'helperSha256': sha256(Path(__file__).with_name('neighborhood_river.py')),
            'producerSha256': river_context['source']['producerSha256'],
            'sourceHashes': river_context['source']['sourceHashes'],
            'scope': river_context['source']['scope'], 'audit': river_context['source']['audit'],
            'sourceLedger': river_context['source']['sourceLedger'],
            'attachmentCellId': river_context['source']['attachmentCellId'],
            'sourceTableStorage': 'Complete per-mesh deferred featureTable; existing global source indices unchanged',
            'meaning': 'Retained mapped water and city masses; surrounding flat land, display levels and material treatment authored',
        }
    write_json(asset_dir / 'provenance.json', provenance)
    manifest = {'version': 1, 'id': geography['id'], 'revision': geography.get('revision', 1),
                'frame': geography['frame'], 'bounds': geography['bounds'],
                'ground': ground, 'context': context, 'lighting': lighting, 'cells': cells,
                'featureTable': {str(item['index']): item for item in feature_table},
                'sharedResources': [file_record(path, asset_dir) for path in sorted(resource_paths)],
                'cellSizeMetres': size, 'limits': style['limits'],
                'provenance': file_record(asset_dir / 'provenance.json', asset_dir)}
    write_json(asset_dir / 'manifest.json', manifest)
    print(json.dumps({'cells': len(cells), 'features': len(features), 'groundBytes': ground['geometryBytes'],
                      'elapsedSeconds': provenance['elapsedSeconds']}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
