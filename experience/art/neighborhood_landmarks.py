# SPDX-License-Identifier: GPL-3.0-or-later
# 地标位置沿用来源坐标；构造尺寸、未测量高度与表面处理在 provenance 中记录。
import math

from neighborhood_mesh import FacadePlane


def landmark_geometry(feature, lod, source_index, batches):
    x, y = feature['x'], feature['y']
    if feature['kind'] == 'torii':
        # 外侧石鸟居跨越东西向街道，参考照片支持双柱、横梁与中央匾额。
        for sign in (-1, 1):
            batches['granite'].cylinder((x, y + sign * 2.15, 2.15), .23, 4.3, source_index, 16)
            batches['granite'].cylinder((x, y + sign * 2.15, .12), .35, .24, source_index, 16)
        batches['granite'].box((x, y, 4.05), (.38, 5.4, .38), source_index)
        batches['granite'].box((x, y, 3.23), (.28, 5.05, .23), source_index)
        batches['wood'].box((x - .27, y, 3.74), (.1, .65, .95), source_index)
        if lod == 'near':
            for index in range(7):
                yy = y - 1.75 + index * .58
                batches['wood'].box((x - .24, yy, 3.12), (.065, .6, .065), source_index)
                if index % 2:
                    batches['lamp'].face([(x - .29, yy, 3.08), (x - .29, yy + .18, 2.88),
                                          (x - .29, yy, 2.68), (x - .29, yy - .18, 2.88)], source_index)
    elif feature['kind'] == 'information-board':
        # 公告板保留单独来源位置，周边商业建筑继续使用各自的来源体积。
        batches['wood'].box((x, y, 1.35), (1.65, .16, 1.35), source_index)
        for sign in (-1, 1):
            batches['wood'].box((x + sign * .64, y, .78), (.13, .18, 1.56), source_index)
        for side in (-1, 1):
            batches['roof'].face([(x - .98, y, 2.24), (x + .98, y, 2.24),
                                  (x + .98, y + side * .42, 2.04), (x - .98, y + side * .42, 2.04)], source_index)
        batches['granite'].box((x + 1.25, y, .68), (.3, .3, 1.36), source_index)


def scanline_intersections(ring, x):
    intersections = []
    for a, b in zip(ring, ring[1:]):
        if (a[0] <= x < b[0]) or (b[0] <= x < a[0]):
            t = (x - a[0]) / (b[0] - a[0])
            intersections.append(a[1] + t * (b[1] - a[1]))
    return sorted(intersections)


def canopy_geometry(feature, lod, source_index, batches, structure_batches):
    top = feature.get('topHeightMetres', 5)
    if feature['sourceId'] != 'osm:way:772134672':
        roof_material = feature.get('roofMaterial', 'roof')
        for polygon in feature['polygons']:
            batches[roof_material].top(polygon['triangles'], top, source_index)
            for a, b in zip(polygon['outer'], polygon['outer'][1:]):
                plane = FacadePlane(a, b, source_index, batches)
                plane.panel('frame', 0, plane.length, top - .15, top)
        return
    # 连接面由来源屋顶、相邻建筑和保留横街的布尔审阅结果提供。
    for polygon in feature['soffitPolygons']:
        batches['roof'].top(polygon['triangles'], top - .35, source_index)
        for triangle in polygon['triangles']:
            a, b, c = triangle
            signed = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
            vertices = list(reversed(triangle)) if signed > 0 else triangle
            batches['arcade-soffit'].face([(x, y, top - .395) for x, y in vertices], source_index)
    for segment in feature['facadeSegments']:
        plane = FacadePlane(segment['from'], segment['to'], source_index, structure_batches)
        plane.panel('market-fascia', 0, plane.length, top - 1.15, top - .4, .035)
        plane.box('market-metal', 0, plane.length, top - .48, top - .35, .065, .15)
        if lod == 'near':
            count = max(1, math.ceil(plane.length / 3.6))
            for index in range(count):
                position = plane.length * (index + .5) / count
                plane.box('market-metal', position - .03, position + .03,
                          top - .85, top - .42, .12, .25)
    # 原始屋顶多边形按区块裁切，横截面使用真实边界，脊部和配色属于作者尺寸。
    for polygon in feature['polygons']:
        ring = polygon['outer']
        left, right = min(point[0] for point in ring), max(point[0] for point in ring)
        count = max(1, math.ceil((right - left) / 1.8))
        for index in range(count):
            x0, x1 = left + (right - left) * index / count, left + (right - left) * (index + 1) / count
            intersections = scanline_intersections(ring, (x0 + x1) / 2)
            if len(intersections) % 2:
                raise ValueError('Canopy section must have paired source-boundary intersections')
            for low, high in zip(intersections[::2], intersections[1::2]):
                mid = (low + high) / 2
                ridge_width = min(.7, (high - low) * .2)
                color = ('arcade-red', 'arcade-gold', 'arcade-green')[int(x0 / 1.8) % 3]
                for yy0, zz0, yy1, zz1, material in [
                    (low, top - .35, mid - ridge_width, top - .35, 'roof'),
                    (mid - ridge_width, top - .35, mid, top + .15, color),
                    (mid, top + .15, mid + ridge_width, top - .35, color),
                    (mid + ridge_width, top - .35, high, top - .35, 'roof'),
                ]:
                    points = [(x0, yy0, zz0), (x1, yy0, zz0), (x1, yy1, zz1), (x0, yy1, zz1)]
                    batches[material].face(points, source_index)
                    underside = 'arcade-soffit' if material == 'roof' else material
                    batches[underside].face(list(reversed([(x, y, z - .045) for x, y, z in points])), source_index)
                batches['frame'].box((x0, mid, top - .37), (.055, high - low, .09), source_index)
                if lod == 'near' and index % 3 == 0:
                    for yy in (low + .3, high - .3):
                        batches['lamp'].box(((x0 + x1) / 2, yy, top - .43), (.24, .24, .06), source_index)
        if left < 263.5:
            center_y = sum(scanline_intersections(ring, left + .15)) / 2
            for side in (-1, 1):
                structure_batches['market-metal'].box((left, center_y + side * 2.1, 2.8), (.3, .3, 5.6), source_index)
            structure_batches['market-metal'].box((left, center_y, 5.35), (.55, 4.65, .9), source_index)
            structure_batches['arcade-red'].box((left - .29, center_y, 5.75), (.08, 4.8, .12), source_index)


def waterside_geometry(feature, lod, source_index, batches):
    if feature['kind'] == 'water':
        water_bank_geometry(feature['waterBankSegments'], source_index, batches)
        return
    if feature['sourceId'] != 'osm:way:532008156':
        return
    # 北側欄干の平面は橋の北縁に従い、高さと格子間隔は写真参照の作者寸法。
    for polygon in feature['polygons']:
        for a, b in zip(polygon['outer'], polygon['outer'][1:]):
            if (a[1] + b[1]) / 2 < 19 or abs(b[0] - a[0]) < 1:
                continue
            plane = FacadePlane(a, b, source_index, batches)
            count = max(1, round(plane.length / 2.4))
            for index in range(count):
                left, right = plane.length * index / count, plane.length * (index + 1) / count
                plane.box('granite', left, min(right, left + .28), -.1, 1.03, 0, .38)
                plane.box('granite', left, right, .12, .28, 0, .24)
                plane.box('frame', left, right, .88, .96, 0, .09)
                subdivisions = max(2, round((right - left) / .3))
                for bar in range(1, subdivisions):
                    position = left + (right - left) * bar / subdivisions
                    plane.box('frame', position - .018, position + .018, .28, .88, 0, .036)
                if lod == 'near':
                    plane.box('frame', left, right, .57, .61, 0, .035)


def water_bank_geometry(segments, source_index, batches):
    # 水岸立面只连接已审阅的平面边界与现有作者高度，不改变行走面。
    for segment in segments:
        start, end = segment['from'], segment['to']
        if segment['waterOnLeft']:
            start, end = end, start
        plane = FacadePlane(start, end, source_index, batches)
        plane.panel('granite', 0, plane.length,
                    segment['bottomHeightMetres'], segment['topHeightMetres'])
