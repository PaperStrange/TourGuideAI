# SPDX-License-Identifier: GPL-3.0-or-later
# 根据已审阅的 Wako 来源生成独立素材包；未知构造和表面参数属于作者设计。
import argparse
import hashlib
import json
import math
import shutil
import sys
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.geometry import tessellate_polygon


ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--source', default=str(ROOT / 'experience/content/ginza-wako/source.json'))
parser.add_argument('--context', default=str(ROOT / 'experience/content/ginza-wako/context.json'))
parser.add_argument('--output-dir', default=str(ROOT / 'artifacts/ginza-art-20261021/build'))
parser.add_argument('--asset-dir', default=str(ROOT / 'experience/public/packs/ginza-wako'))
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
source_path = Path(args.source).resolve()
source = json.loads(source_path.read_text())
context_path = Path(args.context).resolve()
context_source = json.loads(context_path.read_text())
if context_source['projection']['origin'] != source['projection']['origin']:
    raise ValueError('Context and landmark must use the same reviewed origin')
output_dir = Path(args.output_dir).resolve()
asset_dir = Path(args.asset_dir).resolve()
output_dir.mkdir(parents=True, exist_ok=True)
asset_dir.mkdir(parents=True, exist_ok=True)
STARTED = time.perf_counter()


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


if context_source['renderGeometry']['canonicalWakoSourceSha256'] != sha256(source_path):
    raise ValueError('Context exclusions must match the reviewed landmark source')


def progress(message):
    print('[ginza-art] ' + message, flush=True)


bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
materials = {}
material_scale = {}
objects = []
mesh_cache = {}
group_metadata = {}
group_features = {
    'WakoCornerGround': ['wako-rounded-corner', 'wako-stone-cornice'],
    'WakoCornerUpper': ['wako-rounded-corner', 'wako-window-hierarchy', 'wako-stone-cornice'],
    'WakoWingChuoGround': ['wako-stone-cornice'],
    'WakoWingHarumiGround': ['wako-stone-cornice'],
    'WakoWingChuoUpper': ['wako-window-hierarchy', 'wako-stone-cornice'],
    'WakoWingHarumiUpper': ['wako-window-hierarchy', 'wako-stone-cornice'],
    'WakoTower': ['wako-clock'],
}


def image_map(name, pixels, noncolor=False):
    height, width, _ = pixels.shape
    image = bpy.data.images.new(name, width=width, height=height, alpha=False)
    if noncolor:
        image.colorspace_settings.name = 'Non-Color'
    rgba = np.ones((height, width, 4), dtype=np.float32)
    rgba[:, :, :3] = np.clip(pixels, 0, 1)
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw = str(output_dir / (name + '.png'))
    image.file_format = 'PNG'
    image.save()
    image.pack()
    return image


def surface_maps(name, kind):
    size = 512 if kind == 'upper' else 256
    rng = np.random.default_rng({'upper': 1932, 'lower': 1933, 'paving': 1934, 'road': 1935}[kind])
    yy, xx = np.mgrid[:size, :size]
    grain = rng.normal(0, 1, (size, size))
    broad = np.sin(xx / size * math.tau * 2) * np.cos(yy / size * math.tau * 3)
    if kind == 'upper':
        joint = ((yy % 128) < 2) | (((xx + 128 * (yy // 128 % 2)) % 256) < 2)
        value = .69 + grain * .014 + broad * .008 - joint * .055
        tint = (1, .978, .936)
        height = grain * .003 - joint * .018
        roughness = .79 + grain * .035
    elif kind == 'lower':
        joint = ((yy % 256) < 2) | ((xx % 256) < 2)
        mineral = np.maximum(grain - .65, 0)
        value = .46 + grain * .025 - mineral * .025 - joint * .045
        tint = (1, .942, .90)
        height = grain * .0008 - joint * .012
        roughness = .25 + grain * .03
    elif kind == 'paving':
        joint = ((yy % 128) < 3) | (((xx + 128 * (yy // 128 % 2)) % 256) < 3)
        value = .48 + grain * .018 + broad * .014 - joint * .08
        tint = (1, .987, .97)
        height = grain * .003 - joint * .025
        roughness = .85 + grain * .04
    else:
        aggregate = np.maximum(grain - .9, 0)
        value = .215 + grain * .012 + aggregate * .012 + broad * .010
        tint = (.98, 1, 1.025)
        height = grain * .004 + aggregate * .003
        roughness = .84 + grain * .025 + broad * .015
    albedo = image_map(name + '-albedo', np.stack([value * c for c in tint], axis=-1))
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * 2
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * 2
    normal = np.stack([-dx, -dy, np.ones_like(height)], axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    normals = image_map(name + '-normal', normal * .5 + .5, True)
    rough = image_map(name + '-roughness', np.repeat(np.clip(roughness, .12, .98)[:, :, None], 3, axis=2), True)
    return albedo, normals, rough


def glazing_maps():
    # 贴图只表达表面色差和粗糙度；高光由实时环境与观察方向产生。
    size = 128
    yy, xx = np.mgrid[:size, :size]
    rng = np.random.default_rng(1936)
    grain = rng.normal(0, 1, (size, size))
    variation = np.sin(xx / size * math.tau * 3) * .009 + np.cos(yy / size * math.tau) * .006
    linear_tint = np.stack([.18 + variation, .225 + variation, .24 + variation], axis=-1)
    # glTF 的 Base Color 贴图使用 sRGB；将设计的线性反射颜色编码后写入 PNG。
    tint = np.where(linear_tint <= .0031308, linear_tint * 12.92,
                    1.055 * np.power(linear_tint, 1 / 2.4) - .055)
    roughness = np.clip(.16 + grain * .008 + variation * 1.6, .10, .22)
    return (image_map('wako-glazing-tint', tint),
            image_map('wako-glazing-roughness', np.repeat(roughness[:, :, None], 3, axis=2), True))


def material(name, color, roughness, metalness=0, maps=None, scale=2):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    bsdf = result.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metalness
    if maps:
        albedo, normals, rough = maps
        for image, socket in [(albedo, 'Base Color'), (rough, 'Roughness')]:
            texture = result.node_tree.nodes.new('ShaderNodeTexImage')
            texture.image = image
            result.node_tree.links.new(texture.outputs['Color'], bsdf.inputs[socket])
        texture = result.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = normals
        normal = result.node_tree.nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value = .42
        result.node_tree.links.new(texture.outputs['Color'], normal.inputs['Color'])
        result.node_tree.links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
    result.diffuse_color = (*color, 1)
    materials[name] = result
    material_scale[name] = scale
    return result


material('wako-upper-granite', (.69, .67, .63), .8, maps=surface_maps('wako-upper', 'upper'), scale=2.6)
material('wako-lower-polished-stone', (.46, .43, .41), .25, maps=surface_maps('wako-lower', 'lower'), scale=2.2)
material('wako-paving', (.48, .47, .46), .85, maps=surface_maps('wako-paving', 'paving'), scale=2.4)
material('wako-asphalt', (.15, .15, .16), .92, maps=surface_maps('wako-road', 'road'), scale=2.5)
for name, color, roughness, metalness in [
    ('wako-trim', (.66, .645, .61), .69, 0),
    ('wako-glass', (.18, .23, .245), .13, 0),
    ('wako-ground-glass', (.13, .16, .17), .16, 0),
    ('wako-frame', (.095, .095, .088), .29, .78),
    ('wako-grille', (.16, .145, .115), .37, .75),
    ('wako-clock-dial', (.73, .80, .78), .28, .05),
    ('wako-clock-ink', (.045, .06, .065), .34, .4),
    ('wako-roof', (.26, .27, .27), .85, 0),
    ('wako-curb', (.54, .55, .54), .8, 0),
    ('wako-lamp', (.83, .76, .63), .4, 0),
    ('wako-paint', (.73, .75, .74), .86, 0),
]:
    material(name, color, roughness, metalness)

glazing_tint, glazing_roughness = glazing_maps()
for name in ['wako-glass', 'wako-ground-glass']:
    node_tree = materials[name].node_tree
    bsdf = node_tree.nodes.get('Principled BSDF')
    for image, socket in [(glazing_tint, 'Base Color'), (glazing_roughness, 'Roughness')]:
        texture = node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = image
        node_tree.links.new(texture.outputs['Color'], bsdf.inputs[socket])
    bsdf.inputs['Coat Weight'].default_value = .32
    bsdf.inputs['Coat Roughness'].default_value = .075
    material_scale[name] = 3.8


def uv_map(mesh, material_name):
    uv = mesh.uv_layers.new(name='UVMap')
    scale = material_scale[material_name]
    for face in mesh.polygons:
        axis = max(range(3), key=lambda i: abs(face.normal[i]))
        for loop_index in face.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            a, b = (vertex.x, vertex.y) if axis == 2 else ((vertex.x, vertex.z) if axis == 1 else (vertex.y, vertex.z))
            uv.data[loop_index].uv = (a / scale, b / scale)


def remember(obj, group, walkable=False):
    obj['semanticGroup'] = group
    if group in group_features or group in ('WakoRoof', 'WakoRear') or group.startswith('ContextBuilding_'):
        obj['occlusionGroup'] = group
    if group in group_features:
        obj['inspectionFeatureIds'] = group_features[group]
    for key, value in group_metadata.get(group, {}).items():
        obj[key] = value
    if walkable:
        obj['walkable'] = True
        obj['surfaceId'] = 'ginza-wako-sidewalk'
    objects.append(obj)
    return obj


def box(name, center, size, material_name, group, angle=0, bevel=.012):
    key = (tuple(round(v, 5) for v in size), material_name, bevel)
    if key not in mesh_cache:
        bpy.ops.mesh.primitive_cube_add(size=1)
        template = bpy.context.object
        template.dimensions = size
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        template.data.materials.append(materials[material_name])
        if bevel:
            modifier = template.modifiers.new('EdgeRadius', 'BEVEL')
            modifier.width = min(bevel, min(size) / 4)
            modifier.segments = 1
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        uv_map(template.data, material_name)
        mesh_cache[key] = template.data
        bpy.data.objects.remove(template, do_unlink=True)
    obj = bpy.data.objects.new(name, mesh_cache[key])
    bpy.context.collection.objects.link(obj)
    obj.location = center
    obj.rotation_euler.z = angle
    return remember(obj, group)


def polygon_slab(name, points, top, thickness, material_name, group, walkable=False):
    points = [Vector((p[0], p[1], top)) for p in points]
    if (points[0] - points[-1]).length < .00001:
        points = points[:-1]
    signed_area = sum(a.x * b.y - b.x * a.y for a, b in zip(points, points[1:] + points[:1]))
    if signed_area < 0:
        points.reverse()
    count = len(points)
    vertices = [tuple(p) for p in points] + [(p.x, p.y, top - thickness) for p in points]
    faces = []
    for triangle in tessellate_polygon([points]):
        indices = [index if isinstance(index, int) else min(range(count), key=lambda i: (points[i] - index).length) for index in triangle]
        faces.append(tuple(indices))
        faces.append(tuple(index + count for index in reversed(indices)))
    faces.extend((i, (i + 1) % count, (i + 1) % count + count, i + count) for i in range(count))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(materials[material_name])
    uv_map(mesh, material_name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return remember(obj, group, walkable)


def triangulated_surface(name, triangles, top, material_name, group):
    # 孔洞和重叠由来源预处理中的 Shapely 验证；这里只接收明确的三角形。
    vertices, faces, indices = [], [], {}
    for triangle in triangles:
        if len(triangle) != 3:
            raise ValueError('Context surface must contain triangle faces')
        face = []
        points = [Vector((float(point[0]), float(point[1]), top)) for point in triangle]
        normal = (points[1] - points[0]).cross(points[2] - points[0])
        if abs(normal.z) < 1e-10:
            raise ValueError('Context surface contains a degenerate triangle')
        if normal.z < 0:
            points.reverse()
        for point in points:
            key = (point.x, point.y, point.z)
            if key not in indices:
                indices[key] = len(vertices)
                vertices.append(key)
            face.append(indices[key])
        faces.append(tuple(face))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(materials[material_name])
    uv_map(mesh, material_name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return remember(obj, group)


def cylinder(name, center, radius, depth, material_name, group, rotation=None, sides=20):
    key = ('cylinder', sides, material_name)
    if key not in mesh_cache:
        bpy.ops.mesh.primitive_cylinder_add(vertices=sides, radius=1, depth=1)
        template = bpy.context.object
        template.data.materials.append(materials[material_name])
        for face in template.data.polygons:
            face.use_smooth = len(face.vertices) == 4
        uv_map(template.data, material_name)
        mesh_cache[key] = template.data
        bpy.data.objects.remove(template, do_unlink=True)
    obj = bpy.data.objects.new(name, mesh_cache[key])
    bpy.context.collection.objects.link(obj)
    obj.location = center
    obj.scale = (radius, radius, depth)
    if rotation:
        obj.rotation_euler = rotation
    return remember(obj, group)


class Facade:
    def __init__(self, a, b, group):
        self.a = Vector(a)
        self.b = Vector(b)
        self.direction = self.b - self.a
        self.length = self.direction.length
        self.direction.normalize()
        self.inside = Vector((-self.direction.y, self.direction.x))
        self.angle = math.atan2(self.direction.y, self.direction.x)
        self.group = group

    def position(self, x, inset, z):
        point = self.a + self.direction * x + self.inside * inset
        return (point.x, point.y, z)

    def block(self, name, x, inset, z, size, material_name, bevel=.012):
        return box(name, self.position(x, inset, z), size, material_name, self.group, self.angle, bevel)

    def band(self, name, z, height, depth, material_name, projection=.03):
        return self.block(name, self.length / 2, depth / 2 - projection, z, (self.length + .015, depth, height), material_name)

    def window(self, x, bottom, width, height, arched=False, ground=False, quiet=False):
        glass = 'wako-ground-glass' if ground else 'wako-glass'
        surround = 'wako-upper-granite' if quiet else 'wako-trim'
        self.block('RecessedGlazing', x, .34, bottom + height / 2, (width, .055, height), glass, 0)
        for sign in (-1, 1):
            reveal_width = .065 if quiet else .15
            self.block('StoneReveal', x + sign * (width / 2 + reveal_width / 2), .15, bottom + height / 2,
                       (reveal_width, .28 if quiet else .38, height + .12), surround)
            self.block('WindowJamb', x + sign * (width / 2 - .035), .27, bottom + height / 2,
                       (.065, .075, height), 'wako-frame')
        self.block('ProjectingSill', x, .14 if quiet else -.045, bottom - .035 if quiet else bottom - .055,
                   (width + (.16 if quiet else .36), .32 if quiet else .57, .07 if quiet else .13), surround)
        self.block('WindowHead', x, .20, bottom + height + .025,
                   (width + .12, .22, .075 if quiet else .12), surround)
        self.block('Transom', x, .265, bottom + height * .40, (width, .075, .055), 'wako-frame', 0)
        self.block('CentreMullion', x, .265, bottom + height / 2, (.045, .075, height), 'wako-frame', 0)
        if arched:
            radius = width / 2 + .09
            spring = bottom + height - radius
            for index in range(16):
                local_x = -width / 2 + width * (index + .5) / 16
                arc_height = math.sqrt(max(0, (width / 2) ** 2 - local_x ** 2))
                fill_height = radius - arc_height
                if fill_height > .015:
                    self.block('ArcadeSpandrel', x + local_x, .135,
                               bottom + height - fill_height / 2,
                               (width / 16 + .008, .28, fill_height), 'wako-upper-granite', 0)
            for index in range(12):
                angle = math.pi * (index + .5) / 12
                segment = self.block('RoundHeadVoussoir', x + math.cos(angle) * radius, .07,
                                     spring + math.sin(angle) * radius, (.16, .28, radius * math.pi / 12 + .035), 'wako-trim')
                segment.rotation_euler = (Matrix.Rotation(self.angle, 4, 'Z') @ Matrix.Rotation(-angle, 4, 'Y')).to_euler()
            self.block('ArchLowerRail', x, .18, bottom + .48, (width, .11, .075), 'wako-grille')
            for t in (-.3, -.1, .1, .3):
                self.block('ArcadeRailing', x + width * t, .18, bottom + .30, (.035, .075, .55), 'wako-grille', 0)


progress('Prepared original PBR materials and geometry helpers')


class SurfacePath:
    def __init__(self, points, group):
        self.points = [Vector(p) for p in points]
        self.group = group
        self.edges = [Facade(a, b, group) for a, b in zip(points, points[1:])]
        self.offsets = [0]
        for edge in self.edges:
            self.offsets.append(self.offsets[-1] + edge.length)
        self.length = self.offsets[-1]

    def sample(self, distance):
        distance = min(self.length, max(0, distance))
        index = next((i for i in range(len(self.edges)) if distance <= self.offsets[i + 1]), len(self.edges) - 1)
        edge = self.edges[index]
        point = edge.a + edge.direction * (distance - self.offsets[index])
        return point, edge.direction

    def interval(self, name, start, end, bottom, top, material_name, depth=.55, projection=0):
        if end - start < .005 or top - bottom < .005:
            return
        for index, edge in enumerate(self.edges):
            low = max(start, self.offsets[index])
            high = min(end, self.offsets[index + 1])
            if high > low + .005:
                edge.block(name, (low + high) / 2 - self.offsets[index], depth / 2 - projection,
                           (top + bottom) / 2, (high - low + .008, depth, top - bottom), material_name)

    def band(self, name, bottom, top, depth=.55, projection=0, material_name='wako-trim'):
        self.interval(name, 0, self.length, bottom, top, material_name, depth, projection)

    def row(self, bottom, top, count, width, window_bottom, window_height, arched=False, ground=False, quiet=False):
        stone = 'wako-lower-polished-stone' if ground else 'wako-upper-granite'
        spacing = self.length / count
        self.band('WallBelowWindows', bottom, window_bottom, material_name=stone)
        self.band('WallAboveWindows', window_bottom + window_height, top, material_name=stone)
        previous = 0
        for index in range(count):
            center = spacing * (index + .5)
            self.interval('StonePier', previous, center - width / 2, window_bottom, window_bottom + window_height, stone)
            point, direction = self.sample(center)
            facade = Facade(point - direction * width / 2, point + direction * width / 2, self.group)
            facade.window(width / 2, window_bottom, width, window_height, arched, ground, quiet)
            previous = center + width / 2
        self.interval('StonePier', previous, self.length, window_bottom, window_bottom + window_height, stone)


footprint = [(p['x'], p['y']) for p in source['building']['footprint']]
if source['building']['footprintWinding'] != 'clockwise' or len(footprint) != 13:
    raise ValueError('Review the changed source footprint before generating architecture')
dimensions = source['building']['dimensions']
roof_height = dimensions['roofHeightMetres']
tower_top = dimensions['groundToClockTowerTopMetres']
ground_height = source['authoredNavigation']['groundHeightMetres']
corridor_width = source['authoredNavigation']['fullWidthMetres']
if corridor_width != 4:
    raise ValueError('The reviewed navigation envelope must specify four metres')
sidewalk = [Vector((p['x'], p['y'])) for p in source['sidewalk']['centerline']]
corner_points = [footprint[0]] + list(reversed(footprint[4:12]))
paths = {
    'WakoWingHarumi': [footprint[1], footprint[0]],
    'WakoCorner': corner_points,
    'WakoWingChuo': [footprint[4], footprint[3]],
}
for name, points in paths.items():
    lower = SurfacePath(points, name + 'Ground')
    upper = SurfacePath(points, name + 'Upper')
    is_corner = name == 'WakoCorner'
    narrow_count = 6 if is_corner else max(6, round(upper.length / 2.35))
    ground_count = 3 if is_corner else max(3, round(lower.length / 5.3))
    lower.row(ground_height, 4.65, ground_count, lower.length / ground_count - .85, .38, 3.85, ground=True)
    lower.row(4.65, 8.75, narrow_count, 1.23, 5.25, 2.72, ground=True)
    lower.band('LowerFrieze', 4.35, 5.02, .82, .30)
    lower.band('LowerFriezeCap', 4.97, 5.12, .94, .36)
    lower.band('DecoratedBelt', 8.25, 8.92, .78, .24)
    lower.band('ProjectingBeltCornice', 8.91, 9.15, 1.02, .43)
    for row in range(4):
        bottom = 9.15 + row * 3.90
        upper.row(bottom, bottom + 3.90, narrow_count, 1.18, bottom + .65, 2.65, quiet=True)
    upper.band('UpperStoreyStringCourse', 24.64, 25.10, .82, .25)
    upper.row(25.10, 28.70, narrow_count, 1.24 if is_corner else 1.16, 25.55, 2.58, arched=is_corner)
    upper.band('UpperFrieze', 28.70, 29.30, .72, .13)
    upper.band('CrownUnderside', 29.30, 29.48, 1.03, .43)
    upper.band('CrownCornice', 29.48, 29.78, 1.20, .54)
    upper.band('RoofParapet', 29.78, roof_height, .68, .14)
    # 檐口支托和腰线装饰保持独立体积；它们的尺寸是作者简化。
    for distance in np.arange(.35, upper.length, .55):
        point, direction = upper.sample(float(distance))
        part = Facade(point - direction * .1, point + direction * .1, upper.group)
        part.block('CorniceBracket', .1, -.25, 29.17, (.16, .57, .27), 'wako-trim')
    for distance in np.arange(.6, lower.length, 2.25):
        point, direction = lower.sample(float(distance))
        part = Facade(point - direction * .16, point + direction * .16, lower.group)
        part.block('FriezeRelief', .16, -.32, 8.61, (.22, .14, .35), 'wako-trim')
        for offset in (-.34, -.20, .20, .34):
            part.block('FriezeFluting', .16 + offset, -.35, 4.67, (.025, .035, .38), 'wako-grille', 0)
    for index in range(narrow_count):
        distance = lower.length * (index + .5) / narrow_count
        point, direction = lower.sample(distance)
        part = Facade(point - direction * .5, point + direction * .5, lower.group)
        part.block('BalconyRail', .5, -.18, 5.77, (1.16, .10, .055), 'wako-grille')
        for offset in (-.42, -.21, 0, .21, .42):
            part.block('BalconyBaluster', .5 + offset, -.18, 5.48, (.035, .065, .55), 'wako-grille', 0)

# 后墙和屋顶按来源轮廓封闭，未观察立面采用明确记录的简化构造。
for a, b in [(footprint[3], footprint[2]), (footprint[2], footprint[1])]:
    rear = Facade(a, b, 'WakoRear')
    rear.band('RearEnclosure', roof_height / 2, roof_height, .5, 'wako-upper-granite')
polygon_slab('WakoRoof', list(reversed(footprint)), roof_height - .18, .24, 'wako-roof', 'WakoRoof')
polygon_slab('BuildingFoundation', list(reversed(footprint)), ground_height, .20, 'wako-lower-polished-stone', 'WakoRear')

# 塔楼位置通过圆角来源顶点推导；塔楼平面和装饰属于作者设计。
corner = SurfacePath(corner_points, 'WakoTower')
corner_mid, tangent = corner.sample(corner.length / 2)
inward = Vector((-tangent.y, tangent.x))
tower_center = corner_mid + inward * 4.25
tower_angle = math.atan2(tangent.y, tangent.x)
tower_width = 4.65
tower_depth = 4.65
box('TowerBody', (*tower_center, (roof_height + tower_top) / 2),
    (tower_width, tower_depth, tower_top - roof_height), 'wako-upper-granite', 'WakoTower', tower_angle)
for z, height, width in [(roof_height + .16, .32, 5.25), (tower_top - .72, .20, 5.07),
                         (tower_top - .39, .24, 5.35), (tower_top - .10, .20, 5.48)]:
    box('TowerCornice', (*tower_center, z), (width, width, height), 'wako-trim', 'WakoTower', tower_angle)
for quarter in range(4):
    angle = tower_angle + quarter * math.pi / 2
    direction = Vector((math.cos(angle), math.sin(angle)))
    inside = Vector((-direction.y, direction.x))
    front = tower_center - inside * (tower_depth / 2 + .03)
    facade = Facade(front - direction * tower_width / 2, front + direction * tower_width / 2, 'WakoTower')
    center_x = tower_width / 2
    clock_z = roof_height + 6.05
    facade.block('TowerGrilleRecess', center_x, -.015, roof_height + 2.85, (2.0, .10, 4.6), 'wako-frame')
    for offset in np.linspace(-.82, .82, 7):
        facade.block('TowerGrilleVertical', center_x + float(offset), -.09, roof_height + 2.8,
                     (.045, .05, 4.45), 'wako-grille', 0)
    for z in np.arange(roof_height + .65, roof_height + 5, .32):
        facade.block('TowerGrilleHorizontal', center_x, -.10, float(z), (1.9, .05, .035), 'wako-grille', 0)
    for offset in (-1.70, -1.40, 1.40, 1.70):
        facade.block('TowerPilaster', center_x + offset, -.14, roof_height + 4.65, (.19, .38, 3.0), 'wako-trim')
        facade.block('TowerCapital', center_x + offset, -.20, roof_height + 6.18, (.32, .48, .19), 'wako-trim')
    rotation = (math.pi / 2, 0, angle)
    clock_position = facade.position(center_x, -.17, clock_z)
    cylinder('ClockStoneSurround', clock_position, dimensions['clockDialDiameterMetres'] / 2 + .25,
             .20, 'wako-trim', 'WakoTower', rotation, 48)
    cylinder('ClockMetalBezel', facade.position(center_x, -.30, clock_z), 1.27, .10,
             'wako-grille', 'WakoTower', rotation, 48)
    cylinder('ClockFace', facade.position(center_x, -.365, clock_z), dimensions['clockDialDiameterMetres'] / 2,
             .035, 'wako-clock-dial', 'WakoTower', rotation, 48)
    for index in range(60):
        theta = index * math.tau / 60
        length = .15 if index % 5 == 0 else .055
        tick = facade.block('ClockMinuteMark', center_x + math.sin(theta) * 1.06, -.397,
                            clock_z + math.cos(theta) * 1.06, (.025 if index % 5 else .05, .015, length), 'wako-clock-ink', 0)
        tick.rotation_euler = (Matrix.Rotation(angle, 4, 'Z') @ Matrix.Rotation(theta, 4, 'Y')).to_euler()
    # 指针呈现设计时间；不提供实时钟表或营业状态。
    for theta, length, width in [(math.radians(60), dimensions['minuteHandLengthMetres'], .045),
                                  (math.radians(-60), dimensions['hourHandLengthMetres'], .075)]:
        hand = facade.block('ClockHand', center_x + math.sin(theta) * length / 2, -.425,
                            clock_z + math.cos(theta) * length / 2, (width, .025, length), 'wako-clock-ink', 0)
        hand.rotation_euler = (Matrix.Rotation(angle, 4, 'Z') @ Matrix.Rotation(theta, 4, 'Y')).to_euler()
    cylinder('ClockCentre', facade.position(center_x, -.45, clock_z), .10, .04,
             'wako-clock-ink', 'WakoTower', rotation, 20)
rod_height = dimensions['lightningRodHeightMetres']
cylinder('TowerRodBase', (*tower_center, tower_top + .34), .34, .68, 'wako-trim', 'WakoTower', sides=12)
cylinder('LightningRod', (*tower_center, tower_top + rod_height / 2), .042, rod_height, 'wako-grille', 'WakoTower', sides=8)
progress('Built source-sized body, opening hierarchy, cornices and clock tower')


def sidewalk_outline(points, radius):
    directions = [(b - a).normalized() for a, b in zip(points, points[1:])]
    normals = [Vector((-direction.y, direction.x)) for direction in directions]
    left, right = [], []
    for index, point in enumerate(points):
        if index == 0:
            offset = normals[0] * radius
        elif index == len(points) - 1:
            offset = normals[-1] * radius
        else:
            bisector = (normals[index - 1] + normals[index]).normalized()
            offset = bisector * radius / bisector.dot(normals[index])
        left.append(tuple(point + offset))
        right.append(tuple(point - offset))
    end_angle = math.atan2(normals[-1].y, normals[-1].x)
    start_angle = math.atan2(normals[0].y, normals[0].x)
    end_cap = [tuple(points[-1] + Vector((math.cos(end_angle - math.pi * i / 16),
                                        math.sin(end_angle - math.pi * i / 16))) * radius) for i in range(1, 16)]
    start_cap = [tuple(points[0] + Vector((math.cos(start_angle - math.pi - math.pi * i / 16),
                                          math.sin(start_angle - math.pi - math.pi * i / 16))) * radius) for i in range(1, 16)]
    return list(reversed(left + end_cap + list(reversed(right)) + start_cap)), left, right


outline, inside_edge, outside_edge = sidewalk_outline(sidewalk, corridor_width / 2)
polygon_slab('WalkableGinzaSidewalk', outline, ground_height, .18, 'wako-paving', 'Ground', True)
# 立面前的连续铺装提供视觉环境；可行走范围仍由四米路径限定。
apron = [footprint[1]] + corner_points + [footprint[3]] + list(reversed(inside_edge))
polygon_slab('FacadePavingApron', apron, ground_height - .003, .17, 'wako-paving', 'Ground')
box('DistantGround', (0, 10, ground_height - .35), (450, 450, .14), 'wako-asphalt', 'Context', bevel=0)
progress('Built four-metre authored sidewalk envelope at the mapped route')

context_features = context_source['features']
render_geometry = context_source['renderGeometry']
context_layers = {layer['id']: layer for layer in render_geometry['layers']}
if set(context_layers) != {'road', 'sidewalk', 'land'}:
    raise ValueError('Review the changed context surface layers')
material('wako-context-ground', (.31, .33, .34), .90)
context_surface_materials = {'road': 'wako-asphalt', 'sidewalk': 'wako-paving',
                             'land': 'wako-context-ground'}
for layer in context_layers.values():
    surface = context_surface_materials[layer['id']]
    triangulated_surface('MappedContext_' + layer['id'], layer['triangles'],
                         layer['topHeightMetres'], surface, 'Context')


def point_path_distance(point, points):
    distances = []
    for a, b in zip(points, points[1:]):
        direction = b - a
        ratio = min(1, max(0, (point - a).dot(direction) / direction.length_squared))
        distances.append((point - a - direction * ratio).length)
    return min(distances)


crossings = [feature for feature in context_features if feature['kind'] == 'crossing']
crossing_paths = [[Vector((point['x'], point['y'])) for point in item['points']] for item in crossings]
for feature, points in zip(crossings, crossing_paths):
    path = SurfacePath(points, 'Context')
    for distance in np.arange(.32, path.length - .25, .96):
        point, direction = path.sample(float(distance))
        box('MappedCrossing_' + feature['id'].rsplit(':', 1)[-1], (*point, -.112),
            (.46, 2.8, .006), 'wako-paint', 'Context', math.atan2(direction.y, direction.x), bevel=0)

# 路缘宽度与断口属于作者设计；保留来源路段和斑马线路径的长度。
display_bounds = render_geometry['authoredSettings']['bounds']
for polygon in context_layers['road']['polygons']:
    for ring in [polygon['outer']] + polygon['holes']:
        for first, second in zip(ring, ring[1:]):
            a, b = Vector(first), Vector(second)
            midpoint = (a + b) / 2
            if (b - a).length < .08 or midpoint.length > 48:
                continue
            # 展示矩形的裁切边界不代表现实路缘。
            if any(abs(a[axis] - display_bounds[key]) < 1e-5 and
                   abs(b[axis] - display_bounds[key]) < 1e-5
                   for axis, key in [(0, 'minX'), (0, 'maxX'), (1, 'minY'), (1, 'maxY')]):
                continue
            if min(point_path_distance(midpoint, path) for path in crossing_paths) < 1.8:
                continue
            edge = Facade(a, b, 'Context')
            edge.block('AuthoredRoadKerb', edge.length / 2, 0, -.065,
                       (edge.length, .12, .13), 'wako-curb', bevel=0)

material('wako-context', (.38, .395, .40), .82)
material('wako-context-glass', (.19, .235, .25), .23)
context_buildings = []
street = next(feature for feature in context_features if feature['id'] == 'osm:way:1026056857')
street_points = [Vector((point['x'], point['y'])) for point in street['points']]
for feature in [item for item in context_features if item['kind'] == 'building']:
    points = [Vector((point['x'], point['y'])) for point in feature['points'][:-1]]
    area = sum(a.x * b.y - b.x * a.y for a, b in zip(points, points[1:] + points[:1]))
    if area < 0:
        points.reverse()
    levels = int(feature['sourceLevels'])
    height = levels * 3.2
    group = 'ContextBuilding_' + feature['id'].rsplit(':', 1)[-1]
    group_metadata[group] = {'sourceFeatureId': feature['id'], 'authoredHeightMetres': height,
                             'heightValueKind': 'authored-from-observed-levels', 'gameplay': False}
    polygon_slab('MappedContextBody', points, height - .18, height - .18,
                 'wako-context', group)
    polygon_slab('MappedContextRoof', points, height, .18, 'wako-roof', group)
    edges = [Facade(a, b, group) for a, b in zip(points, points[1:] + points[:1])]
    front = min(edges, key=lambda edge: point_path_distance((edge.a + edge.b) / 2, street_points))
    count = max(2, round(front.length / 2.8))
    spacing = front.length / count
    # 邻楼只使用已知轮廓和层数；窗组、表面与高度明确属于作者设计。
    for level in range(levels):
        bottom = .4 + level * 3.2
        for index in range(count):
            center = spacing * (index + .5)
            width = spacing - .44
            front.block('ContextGlazing', center, -.035, bottom + 1.12,
                        (width, .04, 2.24), 'wako-context-glass', bevel=0)
            for offset in (-width / 2, width / 2):
                front.block('ContextReveal', center + offset, -.10, bottom + 1.12,
                            (.08, .18, 2.34), 'wako-curb', bevel=0)
            front.block('ContextSill', center, -.13, bottom - .04,
                        (width + .14, .24, .08), 'wako-curb', bevel=0)
    for z in (3.15, height - .32):
        front.block('ContextStoreyEdge', front.length / 2, -.08, z,
                    (front.length, .20, .15), 'wako-curb', bevel=0)
    context_buildings.append({'sourceFeatureId': feature['id'], 'observedLevels': levels,
                               'authoredHeightMetres': height, 'facadeAppearance': 'authored',
                               'semanticGroup': group})
progress('Built source-derived streets and nearby footprints with authored finishes')


def scene_point(point, height):
    return [round(float(point[0]), 6), height, round(-float(point[1]), 6)]


def shadow_settings(enabled=True, size=1024):
    return {'enabled': enabled, 'mapSize': size, 'bias': -.00018, 'normalBias': .025,
            'radius': 4.5, 'near': .10, 'far': 22}


fixtures = []
for index, (name, path_points) in enumerate(paths.items()):
    path = SurfacePath(path_points, name + 'Ground')
    point, direction = path.sample(path.length * .5)
    interior = Vector((-direction.y, direction.x))
    lamp_point = point - interior * .22
    target_index = [1, 2, 4][index]
    target = sidewalk[target_index]
    cylinder('AuthoredFacadeLamp', (*lamp_point, 4.25), .11, .30, 'wako-lamp', name + 'Ground', sides=12)
    # 光源位于灯罩下方及檐口外侧，保留灯具网格与建筑几何。
    light_point = lamp_point - interior * .16
    fixtures.append({'id': 'wako-pavement-' + str(index + 1), 'type': 'spot', 'enabled': True,
                     'position': scene_point(light_point, 4.05), 'target': scene_point(target, ground_height),
                     'color': '#ffe2bc', 'intensity': 170, 'distance': 15, 'decay': 2,
                     'angle': .95, 'penumbra': .90, 'shadow': shadow_settings()})
for index, z in enumerate([13.5, 34.5]):
    position = corner_mid - inward * (6 if index == 0 else 9)
    fixtures.append({'id': 'wako-facade-wash-' + str(index + 1), 'type': 'spot', 'enabled': True,
                     'position': scene_point(position, 3.0 if index == 0 else 9),
                     'target': scene_point(corner_mid + inward * (1.3 if index == 0 else 4.25), z),
                     'color': '#ffe3bf', 'intensity': 450 if index == 0 else 1150,
                     'distance': 45, 'decay': 2, 'angle': .76 if index == 0 else .31,
                     'penumbra': .92, 'shadow': shadow_settings(False, 512)})

shadow_points = list(footprint) + [tuple(point) for point in sidewalk]
shadow_points.extend((point['x'], point['y']) for feature in context_features
                     if feature['kind'] == 'building' for point in feature['points'])
shadow_bounds = {'minX': math.floor(min(point[0] for point in shadow_points)) - 10,
                 'maxX': math.ceil(max(point[0] for point in shadow_points)) + 10,
                 'minY': math.floor(min(point[1] for point in shadow_points)) - 10,
                 'maxY': math.ceil(max(point[1] for point in shadow_points)) + 10}
lighting = {
    'version': 1, 'defaultMode': 'day', 'axes': 'Three(east,height,-north), metres',
    'renderBounds': shadow_bounds,
    'scope': {'en': 'Authored daylight and night lighting. Reflections use licensed external HDR environments. Local fixtures and illuminated glazing do not establish actual lighting, opening hours, occupancy or entry.',
              'zh': '设计日光与夜间灯光。反射使用已授权的外部 HDR 环境。局部灯具和发光玻璃不代表实际灯光、营业时间、使用状态或入口。'},
    'limits': {'maxShadowCastingLocalLights': 3, 'staticShadowCaching': True, 'pointLightShadows': False},
    'modes': {},
}
environment_hashes = {
    'day': 'd0b515b6741e44ceaa7dc2e42a64ec30f61871ae313762729c6a14f5343484f2',
    'night': 'a690048dcecabf5ed1ad773f7abdec7cce7b1fea4d89b17f054a18f3e0fa2919',
}
for mode in ['day', 'night']:
    is_day = mode == 'day'
    lighting['modes'][mode] = {
        'label': {'en': 'Daylight' if is_day else 'Night', 'zh': '日光' if is_day else '夜间'},
        'environment': {'file': '../../lighting/environments/' + mode + '-1k.hdr',
                        'sha256': environment_hashes[mode], 'intensity': .72 if is_day else .10,
                        'rotationY': .8, 'use': 'illumination-and-reflections-only'},
        'backgroundColor': '#cbd8e4' if is_day else '#1b2a38',
        'fog': {'color': '#cbd8e4' if is_day else '#1b2a38', 'near': 70, 'far': 170},
        'exposure': 1.0 if is_day else 1.12,
        'hemisphere': {'skyColor': '#d4e1ef' if is_day else '#aec1d4',
                       'groundColor': '#777269' if is_day else '#505257', 'intensity': .28 if is_day else .42},
        'sun': {'enabled': True, 'position': [-24, 68, 45], 'target': [0, 0, -18],
                'color': '#fff4e5' if is_day else '#a8c5e8', 'intensity': 2.55 if is_day else .48,
                'shadow': {**shadow_settings(True, 2048), 'radius': 2.8, 'near': .5, 'far': 220,
                           'fit': 'source-render-bounds'}},
        'fixtures': [{**fixture, 'enabled': not is_day, 'intensity': 0 if is_day else fixture['intensity']} for fixture in fixtures],
        'materials': [] if is_day else [
            {'match': ['wako-lamp'], 'emissiveColor': '#ffe2bc', 'emissiveIntensity': 1.6},
            {'match': ['wako-clock-dial'], 'emissiveColor': '#dceae4', 'emissiveIntensity': .7},
            {'match': ['wako-ground-glass'], 'emissiveColor': '#d9b47f', 'emissiveIntensity': .035,
             'emissiveFromBaseColor': True},
        ],
    }


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


write_json(asset_dir / 'lighting.json', lighting)
write_json(asset_dir / 'materials.json', {
    'version': 1, 'id': 'ginza-wako-materials-v1', 'policy': 'embedded-pbr', 'overrides': {},
    'regions': [{'material': 'wako-lower-polished-stone', 'sourceRegion': 'lower-stone'},
                {'material': 'wako-upper-granite', 'sourceRegion': 'upper-granite'}],
    'surfacePolicy': {
        'albedo': 'Original unlit base colour; no photographed lighting or interiors',
        'normalAndRoughness': 'Original deterministic surface variation at material-specific metre scales',
        'glazing': {'materials': ['wako-glass', 'wako-ground-glass'],
                    'mapSize': [128, 128], 'coatWeight': .32, 'coatRoughness': .075,
                    'baseColorEncoding': 'sRGB, IEC 61966-2-1 transfer from authored linear colour',
                    'intendedLinearBaseColor': [.18, .225, .24],
                    'transmission': 0, 'reflectionSource': 'Shared licensed HDR, view-dependent'},
        'context': 'Mapped footprints and tagged levels; authored heights, window layout and muted finishes',
    },
    'authored': 'Original procedural PBR maps and parameters. Operator descriptions establish surface classes; colours, grain, UV scale, roughness and reflection response are authored. Photograph pixels are not included.',
})
shutil.copyfile(source_path, asset_dir / 'source.json')
shutil.copyfile(context_path, asset_dir / 'context.json')
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / 'ginza-wako.blend'))
progress('Saved editable source; batching runtime meshes')

# 按表面材料和语义区域合并，保留可行走表面与检查标识。
groups = {}
for obj in objects:
    group = obj['semanticGroup']
    material_name = obj.data.materials[0].name
    key = (group, material_name, bool(obj.get('walkable')))
    vertices, faces, smooth, uvs = groups.setdefault(key, ([], [], [], []))
    offset = len(vertices)
    mesh = obj.data
    vertices.extend(tuple(obj.matrix_world @ vertex.co) for vertex in mesh.vertices)
    faces.extend(tuple(offset + i for i in face.vertices) for face in mesh.polygons)
    smooth.extend(face.use_smooth for face in mesh.polygons)
    # 使用世界高度连续铺设石材纹理，让各层墙面和竖向窗间墙保持一致。
    normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
    for face in mesh.polygons:
        normal = normal_matrix @ face.normal
        axis = max(range(3), key=lambda i: abs(normal[i]))
        for loop_index in face.loop_indices:
            vertex = obj.matrix_world @ mesh.vertices[mesh.loops[loop_index].vertex_index].co
            a, b = (vertex.x, vertex.y) if axis == 2 else ((vertex.x, vertex.z) if axis == 1 else (vertex.y, vertex.z))
            uvs.append((a / material_scale[material_name], b / material_scale[material_name]))
roots = {}
batches = []
triangles = 0
for (group, material_name, walkable), (vertices, faces, smooth, uvs) in groups.items():
    if group not in roots:
        root = bpy.data.objects.new(group, None)
        bpy.context.collection.objects.link(root)
        root['semanticGroup'] = group
        for key, value in group_metadata.get(group, {}).items():
            root[key] = value
        roots[group] = root
    mesh = bpy.data.meshes.new(group + '_' + material_name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(materials[material_name])
    uv = mesh.uv_layers.new(name='UVMap')
    for face, smooth_value in zip(mesh.polygons, smooth):
        face.use_smooth = smooth_value
    for index, value in enumerate(uvs):
        uv.data[index].uv = value
    mesh.calc_loop_triangles()
    triangles += len(mesh.loop_triangles)
    obj = bpy.data.objects.new(mesh.name, mesh)
    bpy.context.collection.objects.link(obj)
    remember(obj, group, walkable)
    obj.parent = roots[group]
    batches.append(obj)
if triangles > 100000 or len(batches) > 64:
    raise ValueError('Asset geometry budget exceeded: ' + str((triangles, len(batches))))
bpy.ops.object.select_all(action='DESELECT')
for obj in batches + list(roots.values()):
    obj.select_set(True)
bpy.context.view_layer.objects.active = batches[0]
model_path = asset_dir / 'scene.glb'
bpy.ops.export_scene.gltf(filepath=str(model_path), export_format='GLB', use_selection=True,
                         export_yup=True, export_cameras=False, export_lights=False, export_extras=True)
provenance = {
    'version': 1, 'id': 'ginza-wako', 'revision': 1, 'status': 'exported-awaiting-browser-review',
    'generator': 'experience/art/build_ginza.py', 'generatorSha256': sha256(__file__),
    'blenderVersion': bpy.app.version_string,
    'source': {'path': str(source_path.relative_to(ROOT)), 'sha256': sha256(source_path)},
    'context': {'path': str(context_path.relative_to(ROOT)), 'sha256': sha256(context_path),
                'source': context_source['source'], 'authoredSettings': render_geometry['authoredSettings'],
                'layerValidation': render_geometry['validation'], 'buildings': context_buildings,
                'gameplay': False},
    'axes': 'Source/Blender east,north,height → glTF east,height,-north; metres',
    'dimensions': dimensions, 'references': source['references'],
    'authored': ['individual storey levels and window bay spacing', 'window and cornice depths',
                 'tower footprint and placement within the source corner', 'clock mounting and representative 10:10 hand pose',
                 'unseen tower faces, rear enclosure and roof treatment', 'simplified ornamental details',
                 'original procedural PBR maps', 'four-metre level corridor with rounded endpoint caps',
                 'non-traversable facade apron, neutral unmapped ground and distant asphalt continuation',
                 'source-path carriageway buffers, branch sidewalk widths and level presentation heights',
                 '0.12m road kerbs with authored crossing gaps and 2.8m zebra stripe width',
                 'nearby footprint masses with authored 3.2m storey height, glazing layout and materials',
                 'day/night fixtures, materials emission and calibration'],
    'noInteriorOrDoorAssignment': True, 'noCurrentAccessClaim': True,
    'referenceUse': 'Two licensed photographs guide original architectural geometry. No photograph pixels are used in runtime textures.',
    'sourceObjects': len(objects) - len(batches), 'primitives': len(batches), 'triangles': triangles,
    'textures': len([image for image in bpy.data.images if image.packed_file]),
    'model': {'bytes': model_path.stat().st_size, 'sha256': sha256(model_path)},
    'semanticGroups': list(roots), 'walkableTopMetres': ground_height,
    'preservedLegacyAssets': ['models/shijo-block.glb', 'models/traveller.glb', 'materials/architectural', 'lighting/rig.json'],
    'seconds': round(time.perf_counter() - STARTED, 2),
}
write_json(asset_dir / 'provenance.json', provenance)


def file_record(name):
    path = asset_dir / name
    return {'file': name, 'sha256': sha256(path), 'bytes': path.stat().st_size}


total_bytes = sum(path.stat().st_size for path in asset_dir.iterdir() if path.is_file() and path.name != 'manifest.json')
manifest = {'version': 1, 'id': 'ginza-wako', 'revision': 1,
            'model': file_record('scene.glb'), 'lighting': file_record('lighting.json'),
            'materials': file_record('materials.json'), 'provenance': file_record('provenance.json'),
            'source': {**file_record('source.json'), 'repositoryPath': str(source_path.relative_to(ROOT))},
            'context': {**file_record('context.json'), 'repositoryPath': str(context_path.relative_to(ROOT))},
            'metrics': {'triangles': triangles, 'primitives': len(batches), 'textures': provenance['textures'],
                        'assetBytesExcludingManifest': total_bytes}}
write_json(asset_dir / 'manifest.json', manifest)
total_bytes += (asset_dir / 'manifest.json').stat().st_size
if total_bytes > 8 * 1024 * 1024:
    raise ValueError('Asset transfer budget exceeded: ' + str(total_bytes))
progress('Exported ' + json.dumps({'modelBytes': model_path.stat().st_size, 'totalBytes': total_bytes,
                                 'triangles': triangles, 'primitives': len(batches), 'modelSha256': sha256(model_path)}))
