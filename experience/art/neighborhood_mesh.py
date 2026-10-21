# SPDX-License-Identifier: GPL-3.0-or-later
# 共享建筑组件保留来源编号；构造尺寸由审阅后的 facade recipe 提供。
import math


class MeshBatch:
    def __init__(self):
        self.vertices = []
        self.faces = []
        self.source_indices = []

    def face(self, points, source_index):
        start = len(self.vertices)
        self.vertices.extend(tuple(point) for point in points)
        self.faces.append(tuple(range(start, start + len(points))))
        self.source_indices.extend([float(source_index)] * len(points))

    def top(self, triangles, height, source_index):
        for triangle in triangles:
            a, b, c = triangle
            signed = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
            if abs(signed) <= 1e-12:
                raise ValueError('A prepared surface contains a degenerate triangle')
            points = triangle if signed > 0 else list(reversed(triangle))
            self.face([(point[0], point[1], height) for point in points], source_index)

    def box(self, center, size, source_index, tangent=(1, 0)):
        tx, ty = tangent
        length = math.hypot(tx, ty)
        if length <= 1e-9 or min(size) <= 0:
            raise ValueError('A construction component needs positive dimensions')
        tx, ty = tx / length, ty / length
        nx, ny = -ty, tx
        sx, sy, sz = (value / 2 for value in size)
        points = [(center[0] + tx * x + nx * y, center[1] + ty * x + ny * y, center[2] + z)
                  for x, y, z in [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz),
                                  (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]]
        for indices in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
                        (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
            self.face([points[index] for index in indices], source_index)

    @property
    def triangles(self):
        return sum(len(face) - 2 for face in self.faces)

    def cylinder(self, center, radius, height, source_index, sides=12):
        rings = [[(center[0] + radius * math.cos(index * math.tau / sides),
                   center[1] + radius * math.sin(index * math.tau / sides),
                   center[2] + sign * height / 2) for index in range(sides)] for sign in (-1, 1)]
        self.face(list(reversed(rings[0])), source_index)
        self.face(rings[1], source_index)
        for index in range(sides):
            after = (index + 1) % sides
            self.face([rings[0][index], rings[0][after], rings[1][after], rings[1][index]], source_index)


class FacadePlane:
    def __init__(self, start, end, source_index, batches):
        dx, dy = end[0] - start[0], end[1] - start[1]
        self.length = math.hypot(dx, dy)
        if self.length <= 1e-8:
            raise ValueError('A facade edge must have positive length')
        self.start = start
        self.tangent = (dx / self.length, dy / self.length)
        self.outward = (self.tangent[1], -self.tangent[0])
        self.source_index = source_index
        self.batches = batches

    def point(self, distance, height, depth=0):
        return (self.start[0] + self.tangent[0] * distance + self.outward[0] * depth,
                self.start[1] + self.tangent[1] * distance + self.outward[1] * depth, height)

    def panel(self, material, left, right, bottom, top, depth=0):
        if right - left <= 1e-7 or top - bottom <= 1e-7:
            return
        self.batches[material].face([self.point(left, bottom, depth), self.point(right, bottom, depth),
                                    self.point(right, top, depth), self.point(left, top, depth)], self.source_index)

    def box(self, material, left, right, bottom, top, depth, thickness):
        if right - left <= 1e-7 or top - bottom <= 1e-7:
            return
        self.batches[material].box(self.point((left + right) / 2, (bottom + top) / 2, depth),
                                  (right - left, thickness, top - bottom), self.source_index, self.tangent)

    def reveal(self, material, left, right, bottom, top, recess):
        # 开口背板和四个侧面均为实际几何，主墙面不覆盖玻璃。
        for coordinates in [
            [(left, bottom, 0), (left, bottom, -recess), (left, top, -recess), (left, top, 0)],
            [(right, bottom, -recess), (right, bottom, 0), (right, top, 0), (right, top, -recess)],
            [(left, bottom, -recess), (left, bottom, 0), (right, bottom, 0), (right, bottom, -recess)],
            [(left, top, 0), (left, top, -recess), (right, top, -recess), (right, top, 0)],
        ]:
            self.batches[material].face([self.point(*coordinate) for coordinate in coordinates], self.source_index)


def facade_geometry(plane, height, base_height, recipe, lod):
    wall = recipe['wallMaterial']
    trim = recipe.get('trimMaterial', wall)
    frame = recipe.get('frameMaterial', 'metal-dark')
    glass = recipe.get('glassMaterial', 'glass')
    storey = recipe['storeyHeightMetres']
    bay = recipe['bayWidthMetres']
    recess = recipe['recessMetres']
    if min(storey, bay, recess) <= 0 or not 0 < recipe['openingWidthRatio'] < 1:
        raise ValueError('Facade recipe dimensions are invalid')
    floor_count = max(1, int(round((height - base_height) / storey)))
    floor_height = (height - base_height) / floor_count
    if floor_height <= .4 or plane.length < 1.1:
        plane.panel(wall, 0, plane.length, base_height, height)
        return {'openings': 0, 'recesses': 0}
    count = max(1, int(plane.length / bay))
    slot = plane.length / count
    half_width = min(slot * recipe['openingWidthRatio'] / 2, (slot - .24) / 2)
    if half_width <= .1:
        plane.panel(wall, 0, plane.length, base_height, height)
        return {'openings': 0, 'recesses': 0}
    openings = 0
    for level in range(floor_count):
        floor_bottom = base_height + floor_height * level
        floor_top = floor_bottom + floor_height
        sill = floor_bottom + floor_height * recipe.get('sillRatio', .26)
        head = floor_bottom + floor_height * recipe.get('headRatio', .82)
        if level == 0:
            sill = floor_bottom + recipe.get('groundSillMetres', .45)
            head = min(floor_top - .35, floor_bottom + recipe.get('groundOpeningMetres', 2.65))
        if head <= sill:
            plane.panel(wall, 0, plane.length, floor_bottom, floor_top)
            continue
        plane.panel(wall, 0, plane.length, floor_bottom, sill)
        plane.panel(wall, 0, plane.length, head, floor_top)
        cursor = 0
        for index in range(count):
            center = slot * (index + .5)
            left, right = center - half_width, center + half_width
            plane.panel(wall, cursor, left, sill, head)
            current_recess = recess if lod == 'near' else 0
            if lod == 'near':
                plane.reveal(trim, left, right, sill, head, current_recess)
            plane.panel(glass, left, right, sill, head, -current_recess)
            if lod == 'near':
                frame_width = min(.055, half_width * .12)
                for a, b, c, d in [(left, right, sill, sill + frame_width),
                                    (left, right, head - frame_width, head),
                                    (left, left + frame_width, sill, head),
                                    (right - frame_width, right, sill, head)]:
                    plane.panel(frame, a, b, c, d, -recess + .022)
                if right - left > 1.25:
                    plane.panel(frame, center - .022, center + .022, sill, head, -recess + .025)
                plane.batches[trim].face([plane.point(left - .045, sill, .08), plane.point(right + .045, sill, .08),
                                          plane.point(right + .045, sill, -recess), plane.point(left - .045, sill, -recess)], plane.source_index)
            cursor = right
            openings += 1
        plane.panel(wall, cursor, plane.length, sill, head)
    if lod == 'near':
        plane.box(trim, 0, plane.length, height - .16, height + .025, .025, .16)
        if recipe.get('canopyHeightMetres'):
            canopy_height = min(recipe['canopyHeightMetres'], height - .4)
            projection = recipe['canopyProjectionMetres']
            plane.box(recipe.get('canopyMaterial', 'metal-dark'), 0, plane.length,
                      canopy_height, canopy_height + .12, projection / 2, projection)
    return {'openings': openings, 'recesses': openings if lod == 'near' else 0}


def building_geometry(feature, recipe, lod, source_index, batches):
    top = feature['height']['metres']
    bottom = feature.get('baseHeightMetres', 0)
    if top <= bottom:
        raise ValueError(feature['sourceId'] + ': roof height must exceed ground height')
    totals = {'openings': 0, 'recesses': 0, 'edges': 0}
    for polygon_index, polygon in enumerate(feature['polygons']):
        batches[recipe.get('roofMaterial', 'roof')].top(polygon['triangles'], top, source_index)
        for ring_index, ring in enumerate([polygon['outer']] + polygon.get('holes', [])):
            for edge_index, (start, end) in enumerate(zip(ring, ring[1:])):
                plane = FacadePlane(start, end, source_index, batches)
                # facadeEdges 限定来源审阅的街面；其他面仍保留完整体积和中性墙面。
                reviewed = recipe.get('facadeEdges')
                detailed = lod != 'context' and (reviewed is None or [polygon_index, ring_index, edge_index] in reviewed)
                if detailed:
                    detail = facade_geometry(plane, top, bottom, recipe, lod)
                    for key in ('openings', 'recesses'):
                        totals[key] += detail[key]
                else:
                    plane.panel(recipe['wallMaterial'], 0, plane.length, bottom, top)
                totals['edges'] += 1
    return totals
