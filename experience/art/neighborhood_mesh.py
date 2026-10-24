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
        self.end = end
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


def profiled_opening(plane, slot_left, slot_right, bottom, top, tiers, material, profile, lod):
    # 分层矩形保留阶梯窗头的轮廓；侧壁和背板均使用真实几何。
    center = (slot_left + slot_right) / 2
    recess = profile['nearRecessMetres'] if lod == 'near' else profile['baseRecessMetres']
    plane.panel(material, slot_left, slot_right, bottom, tiers[0][1])
    plane.panel(material, slot_left, slot_right, tiers[-1][2], top)
    for width, low, high in tiers:
        left, right = center - width / 2, center + width / 2
        plane.panel(material, slot_left, left, low, high)
        plane.panel(material, right, slot_right, low, high)
        plane.panel(profile['glassMaterial'], left, right, low, high, -recess)
    outline = [(center - tiers[0][0] / 2, tiers[0][1]),
               (center + tiers[0][0] / 2, tiers[0][1])]
    for index, (width, low, high) in enumerate(tiers):
        outline.append((center + width / 2, high))
        if index + 1 < len(tiers):
            outline.append((center + tiers[index + 1][0] / 2, high))
    outline.append((center - tiers[-1][0] / 2, tiers[-1][2]))
    for index in range(len(tiers) - 1, -1, -1):
        width, low, high = tiers[index]
        outline.append((center - width / 2, low))
        if index:
            outline.append((center - tiers[index - 1][0] / 2, low))
    for start, end in zip(outline, outline[1:] + outline[:1]):
        length = math.dist(start, end)
        if length <= 1e-9:
            continue
        plane.batches[material].face([plane.point(*start), plane.point(*end),
                                     plane.point(*end, -recess), plane.point(*start, -recess)], plane.source_index)
        if lod != 'near':
            continue
        width = profile['frameWidthMetres']
        inside = (-(end[1] - start[1]) / length * width, (end[0] - start[0]) / length * width)
        plane.batches[profile['frameMaterial']].face([
            plane.point(*start, -recess + .015), plane.point(*end, -recess + .015),
            plane.point(end[0] + inside[0], end[1] + inside[1], -recess + .015),
            plane.point(start[0] + inside[0], start[1] + inside[1], -recess + .015)], plane.source_index)


def reviewed_facade_geometry(plane, height, base_height, recipe, lod, override):
    preserved = {name: MeshBatch() for name in plane.batches}
    original_plane = FacadePlane(plane.start, plane.end, plane.source_index, preserved)
    facade_geometry(original_plane, height, base_height, recipe, lod)
    minimum = override['minimumChangedHeightMetres']
    # 跨越保护高度的原始墙面完整保留，新立面从该墙面原有的顶边开始。
    cutoff = max(point[2] for data in preserved.values() for face in data.faces
                 if min(data.vertices[index][2] for index in face) < minimum
                 for point in (data.vertices[index] for index in face))
    for name, data in preserved.items():
        for face in data.faces:
            vertices = [data.vertices[index] for index in face]
            if min(point[2] for point in vertices) < minimum or min(point[2] for point in vertices) >= height - .16 - 1e-9:
                plane.batches[name].face(vertices, plane.source_index)
    protected_openings = sum(1 for face in preserved[recipe.get('glassMaterial', 'glass')].faces
                             if max(preserved[recipe.get('glassMaterial', 'glass')].vertices[index][2]
                                    for index in face) < minimum)
    profile = override['profile']
    count = max(1, round(plane.length / profile['bayWidthMetres']))
    slot = plane.length / count
    openings = 0
    for band in profile['bands']:
        low = max(cutoff, base_height + (height - base_height) * band['bottomRatio'])
        high = base_height + (height - base_height) * band['topRatio']
        if high <= low:
            continue
        row_height = (high - low) / band['rows']
        for row in range(band['rows']):
            row_bottom, row_top = low + row * row_height, low + (row + 1) * row_height
            sill = row_bottom + band['sillMetres']
            head = min(row_top - band['headMarginMetres'], sill + band['openingHeightMetres'])
            step_count = band.get('headSteps', 0)
            step_height = band.get('stepHeightMetres', 0)
            width = band['openingWidthMetres']
            if (head - sill <= step_count * step_height or width >= slot - .25 or
                    width - step_count * 2 * band.get('stepInsetMetres', 0) <= .1):
                raise ValueError('Reviewed facade opening does not fit its authored band')
            tiers = [(width, sill, head - step_count * step_height)]
            for step in range(step_count):
                tiers.append((width - (step + 1) * 2 * band['stepInsetMetres'],
                              head - (step_count - step) * step_height,
                              head - (step_count - step - 1) * step_height))
            for bay in range(count):
                profiled_opening(plane, bay * slot, (bay + 1) * slot, row_bottom, row_top,
                                 tiers, band['material'], profile, lod)
                openings += 1
    return {'openings': openings + protected_openings,
            'recesses': openings + (protected_openings if lod == 'near' else 0)}


def market_frontage_geometry(plane, height, base_height, recipe, lod):
    # 街面构造仅表示参考照片中的材料与开口层次，不对应商户或营业状态。
    upper_start = min(height, base_height + recipe['marketFasciaTopMetres'])
    opening_top = min(upper_start - .45, base_height + recipe['groundOpeningMetres'])
    opening_bottom = base_height + recipe['groundSillMetres']
    if opening_top <= opening_bottom + .5 or plane.length < 1.2:
        return facade_geometry(plane, height, base_height, recipe, lod)
    count = max(1, round(plane.length / recipe['bayWidthMetres']))
    slot = plane.length / count
    openings = 0
    recess = recipe['recessMetres'] if lod == 'near' else .06
    for index in range(count):
        left, right = slot * index, slot * (index + 1)
        variant = (plane.source_index + index + round(plane.start[0])) % 3
        frame = ('wood', 'frame', 'market-metal')[variant]
        fascia = ('wood', 'market-fascia', 'tile-wall')[variant]
        pier = min(.17 + variant * .035, slot * .16)
        a, b = left + pier, right - pier
        plane.panel(recipe['wallMaterial'], left, a, base_height, upper_start)
        plane.panel(recipe['wallMaterial'], b, right, base_height, upper_start)
        plane.panel('granite', a, b, base_height, opening_bottom)
        plane.panel(fascia, a, b, opening_top, upper_start)
        plane.reveal(frame, a, b, opening_bottom, opening_top, recess)
        plane.panel('glass', a, b, opening_bottom, opening_top, -recess)
        plinth_top = min(opening_top, opening_bottom + (.55 if variant == 0 else .32))
        plane.panel(frame, a, b, opening_bottom, plinth_top, -recess + .025)
        if lod == 'near':
            for x0, x1, z0, z1 in [
                (a, a + .055, opening_bottom, opening_top),
                (b - .055, b, opening_bottom, opening_top),
                (a, b, opening_top - .065, opening_top),
            ]:
                plane.box(frame, x0, x1, z0, z1, -recess + .045, .07)
            transom = opening_top - .38
            plane.panel(frame, a, b, transom - .025, transom + .025, -recess + .06)
            divisions = max(2, round((b - a) / (.28 if variant == 0 else .9)))
            for division in range(1, divisions):
                position = a + (b - a) * division / divisions
                plane.panel(frame, position - .018, position + .018, plinth_top,
                            transom, -recess + .07)
            plane.box(frame, a, b, opening_top, opening_top + .08, .04, .19)
            plane.box('market-metal', left, right, upper_start - .08, upper_start, .025, .12)
        openings += 1
    totals = {'openings': openings, 'recesses': openings if lod == 'near' else 0}
    if height - upper_start > .4:
        upper_recipe = dict(recipe, openingWidthRatio=.47, sillRatio=.34, headRatio=.78,
                            groundSillMetres=.75, groundOpeningMetres=2.15,
                            trimMaterial=recipe['wallMaterial'], frameMaterial='frame')
        upper = facade_geometry(plane, height, upper_start, upper_recipe, lod)
        for key in totals:
            totals[key] += upper[key]
    elif height > upper_start:
        plane.panel(recipe['wallMaterial'], 0, plane.length, upper_start, height)
    return totals


def wall_less_geometry(feature, source_index, batches):
    construction = feature['treatmentOverride']['construction']
    if len(feature['polygons']) != 1:
        raise ValueError('Reviewed wall-less assembly requires its single source polygon')
    polygon = feature['polygons'][0]
    ring = polygon['outer']
    if len(ring) != 5 or ring[0] != ring[-1] or polygon.get('holes'):
        raise ValueError('Reviewed wall-less assembly requires the retained quadrilateral')
    top = feature['height']['metres']
    bottom = feature.get('baseHeightMetres', 0)
    underside = top - construction['roofThicknessMetres']
    beam_bottom = underside - construction['beamDepthMetres']
    if beam_bottom <= bottom or construction['postCount'] < 2:
        raise ValueError('Invalid authored wall-less assembly dimensions')
    roof = batches[construction['roofMaterial']]
    structure = batches[construction['structureMaterial']]
    if construction['floorHeightMetres'] != bottom or construction['floorWalkable'] is not False:
        raise ValueError('Reviewed display floor must remain nonwalkable at the assembly base')
    # 来源建筑底面被地面预处理排除；显示铺装只覆盖同一平面范围，导航仍由常驻表面负责。
    batches[construction['floorMaterial']].top(polygon['triangles'], bottom, source_index)
    edge_bottom = construction['floorEdgeBottomMetres']
    if not math.isfinite(edge_bottom) or edge_bottom >= bottom:
        raise ValueError('Reviewed floor edge must connect to the lower adjacent display surface')
    # 侧面仅连接已审阅的显示高度，保留原始铺装顶面和完整边界。
    for start, end in zip(ring, ring[1:]):
        batches[construction['floorMaterial']].face(
            [(start[0], start[1], edge_bottom), (end[0], end[1], edge_bottom),
             (end[0], end[1], bottom), (start[0], start[1], bottom)], source_index)
    roof.top(polygon['triangles'], top, source_index)
    for triangle in polygon['triangles']:
        a, b, c = triangle
        signed = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        points = list(reversed(triangle)) if signed > 0 else triangle
        roof.face([(x, y, underside) for x, y in points], source_index)
    for start, end in zip(ring, ring[1:]):
        FacadePlane(start, end, source_index, batches).panel(
            construction['structureMaterial'], 0, math.dist(start, end), underside, top)
    longest = max(range(4), key=lambda index: math.dist(ring[index], ring[index + 1]))
    corners = [ring[(longest + offset) % 4] for offset in range(4)]
    start = [(corners[0][axis] + corners[3][axis]) / 2 for axis in (0, 1)]
    end = [(corners[1][axis] + corners[2][axis]) / 2 for axis in (0, 1)]
    length = math.dist(start, end)
    tangent = [(end[axis] - start[axis]) / length for axis in (0, 1)]
    inset = construction['endInsetMetres']
    span = length - 2 * inset
    if span <= construction['postWidthMetres']:
        raise ValueError('Authored support spacing exceeds the source roof')
    # 支撑沿来源四边形的中心线布置；生成后逐顶点检查仍位于来源平面范围。
    first_vertex = len(structure.vertices)
    structure.box(((start[0] + end[0]) / 2, (start[1] + end[1]) / 2,
                   underside - construction['beamDepthMetres'] / 2),
                  (span + construction['postWidthMetres'], construction['beamWidthMetres'], construction['beamDepthMetres']),
                  source_index, tangent)
    for index in range(construction['postCount']):
        distance = inset + span * index / (construction['postCount'] - 1)
        structure.box((start[0] + tangent[0] * distance, start[1] + tangent[1] * distance,
                       (bottom + underside) / 2),
                      (construction['postWidthMetres'], construction['postWidthMetres'], underside - bottom),
                      source_index, tangent)
    for x, y, _ in structure.vertices[first_vertex:]:
        cross_products = [(b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0])
                          for a, b in zip(ring, ring[1:])]
        if min(cross_products) < -1e-8 and max(cross_products) > 1e-8:
            raise ValueError('Authored support extends outside the source footprint')
    return {'openings': 0, 'recesses': 0, 'edges': 4}


def vertical_boundary_geometry(segments, batch, source_index):
    # 审阅后的高侧边界位于左侧；新增侧面朝向较低表面，保留两侧原始顶面。
    for segment in segments:
        start, end = segment['from'], segment['to']
        bottom, top = segment['bottomHeightMetres'], segment['topHeightMetres']
        values = [*start, *end, bottom, top]
        if (len(start) != 2 or len(end) != 2 or not all(math.isfinite(value) for value in values) or
                math.dist(start, end) <= 1e-8 or bottom >= top):
            raise ValueError('Reviewed vertical boundary requires a finite segment and ordered display heights')
        batch.face([(start[0], start[1], bottom), (end[0], end[1], bottom),
                    (end[0], end[1], top), (start[0], start[1], top)], source_index)


def building_geometry(feature, recipe, lod, source_index, batches):
    if feature.get('treatmentOverride', {}).get('treatment') == 'wall-less-structure':
        return wall_less_geometry(feature, source_index, batches)
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
                    arcade_edges = recipe.get('arcadeFacadeEdges', [])
                    is_arcade = [polygon_index, ring_index, edge_index] in arcade_edges
                    selected_recipe = recipe['arcadeRecipe'] if is_arcade else recipe
                    override = next((item for item in feature.get('facadeOverrides', [])
                                     if item['face'] == [polygon_index, ring_index, edge_index]), None)
                    if override:
                        detail = reviewed_facade_geometry(plane, top, bottom, selected_recipe, lod, override)
                    else:
                        detail = (market_frontage_geometry if is_arcade else facade_geometry)(
                            plane, top, bottom, selected_recipe, lod)
                    for key in ('openings', 'recesses'):
                        totals[key] += detail[key]
                else:
                    plane.panel(recipe['wallMaterial'], 0, plane.length, bottom, top)
                totals['edges'] += 1
    if feature.get('boundaryClosures'):
        vertical_boundary_geometry(feature['boundaryClosures'], batches[recipe['wallMaterial']], source_index)
    return totals
