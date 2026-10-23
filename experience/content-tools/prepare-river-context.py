import argparse
import gzip
import hashlib
import importlib.util
import json
import math
from pathlib import Path

import numpy as np
import shapely
from shapely.geometry import LineString, Point, Polygon, box, mapping, shape
from shapely.ops import unary_union


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location('neighborhood_art', Path(__file__).with_name('prepare-neighborhood-art.py'))
ART = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ART)
SITE = ART.SITE


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def context_polygons(geometry):
    records = ART.polygons(geometry)
    result, omitted = [], []
    for record in records:
        kept = []
        for triangle in record['triangles']:
            points = np.asarray(triangle, dtype=np.float32).astype(np.float64)
            a, b = points[1] - points[0], points[2] - points[0]
            if a[0] * b[1] - a[1] * b[0] == 0:
                omitted.append({'triangle': triangle, 'areaSquareMetres': Polygon(triangle).area})
            else:
                kept.append(Polygon(triangle))
        covered = unary_union(kept)
        components = [covered] if covered.geom_type == 'Polygon' else list(covered.geoms)
        for component in components:
            boundary = shapely.orient_polygons(component)
            faces = [triangle for triangle in kept if component.covers(triangle.representative_point())]
            result.append({'outer': [list(point) for point in boundary.exterior.coords],
                           'holes': [[list(point) for point in ring.coords] for ring in boundary.interiors],
                           'triangles': [[list(point) for point in triangle.exterior.coords[:-1]] for triangle in faces],
                           'areaSquareMetres': boundary.area,
                           'omittedNumericalTriangleAreasSquareMetres': record['omittedNumericalTriangleAreasSquareMetres']})
    before, after = ART.record_geometry(records), ART.record_geometry(result)
    difference, distance = before.symmetric_difference(after).area, before.hausdorff_distance(after)
    if difference > .001 or distance > .001:
        raise ValueError(f'Context float32 cleanup exceeds1mm boundary/0.001m2 area: {difference}, {distance}')
    return result, {'omittedTriangles': omitted, 'areaDifferenceSquareMetres': difference,
                    'hausdorffDistanceMetres': distance,
                    'maximumAreaDifferenceSquareMetres': .001, 'maximumBoundaryDifferenceMetres': .001}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--scene', type=Path, required=True)
    parser.add_argument('--geography', type=Path, required=True)
    parser.add_argument('--prepared-art', type=Path, required=True)
    parser.add_argument('--official', type=Path)
    parser.add_argument('--selected-source', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--scope-only', action='store_true')
    args = parser.parse_args()
    scene, geography, prepared = [json.loads(path.read_text()) for path in (args.scene, args.geography, args.prepared_art)]
    inputs = {str(path): sha(path) for path in (args.scene, args.geography, args.prepared_art)}
    frame = geography['frame']

    def project(coordinates):
        values = np.array(coordinates, dtype=float, copy=True)
        values[:, 0] = (values[:, 0] - frame['origin']['longitude']) * frame['metresPerDegreeLon']
        values[:, 1] = (values[:, 1] - frame['origin']['latitude']) * frame['metresPerDegreeLat']
        return values

    # 驻留距离采用当前 section-residency 的 230 m；覆盖完整相邻弧线与角色横向余量。
    cell = box(1000, 0, 1100, 100)
    admission = cell.buffer(230, quad_segs=32)
    routes = unary_union([LineString([(point['x'], point['y']) for point in edge['points']])
                          for edge in geography['navigation']['edges']])
    positions = routes.intersection(admission).buffer(.75, quad_segs=4)
    radius = 500
    extent = positions.buffer(radius, quad_segs=64)
    max_aspect, fog_far, orbit, target_axis = 2.0, 270, 55, 40
    view_factor = math.sqrt(1 + math.tan(math.radians(48 / 2)) ** 2 * (1 + max_aspect ** 2))
    camera_offset = orbit + math.sqrt(2) * target_axis
    minimum_boundary = positions.distance(extent.boundary)
    minimum_view_depth = (minimum_boundary - camera_offset) / view_factor
    if minimum_view_depth <= fog_far:
        raise ValueError('Context boundary enters the audited fog-depth envelope')
    bounds = extent.bounds
    geographic_bounds = [frame['origin']['longitude'] + bounds[0] / frame['metresPerDegreeLon'],
                         frame['origin']['latitude'] + bounds[1] / frame['metresPerDegreeLat'],
                         frame['origin']['longitude'] + bounds[2] / frame['metresPerDegreeLon'],
                         frame['origin']['latitude'] + bounds[3] / frame['metresPerDegreeLat']]
    scope = {'attachmentCellId': 'cell-e010-n000', 'extent': mapping(extent),
             'geographicBounds': geographic_bounds, 'localBounds': list(bounds),
             'camera': {'verticalFOVDegrees': 48, 'maximumAuditedAspect': max_aspect, 'farMetres': 350,
                        'fogFarDepthMetres': fog_far, 'orbitMaximumMetres': orbit,
                        'targetMaximumPerAxisMetres': target_axis, 'horizontalCameraEnvelopeMetres': camera_offset,
                        'viewDepthToCornerDistanceFactor': view_factor},
             'routePositionScope': {'cellBounds': [1000, 0, 1100, 100], 'retentionDistanceMetres': 230,
                                    'playerMarginMetres': .75, 'geometry': mapping(positions)},
             'authoredDisplayBufferMetres': radius, 'minimumRouteToOuterBoundaryMetres': minimum_boundary,
             'minimumConservativeBoundaryViewDepthMetres': minimum_view_depth,
             'limit': 'Audited aspect <=2.0 and normal section admission/retention; wider views require another extent review.'}
    if args.scope_only:
        write(args.output, scope)
        print(json.dumps({'geographicBounds': geographic_bounds, 'minimumBoundaryViewDepthMetres': minimum_view_depth}))
        return
    if args.official is None:
        raise ValueError('--official is required for retained city massing')
    inputs[str(args.official)] = sha(args.official)
    features = {feature['sourceId']: feature for feature in scene['features']}
    existing_records = [record for feature in scene['features'] if not feature.get('renderPolicy', '').startswith('reference-only')
                        for record in feature['polygons']]
    existing_records += [record for surface in prepared['displayMaterialSurfaces'] + prepared['walkableMaterialSurfaces']
                         for record in surface['polygons']]
    canonical_extent = routes.buffer(65, quad_segs=4)
    covered = unary_union([ART.record_geometry(existing_records), canonical_extent])
    extension = extent.difference(covered)
    source_water = []
    for feature in scene['features']:
        if feature['kind'] != 'water':
            continue
        local = shape(feature['geometry'])
        if local.geom_type in ('LineString', 'MultiLineString'):
            local = local.buffer(feature['width']['metres'] / 2, quad_segs=2, cap_style='flat', join_style='mitre')
        source_water.append((feature, SITE.display_geometry(local, .001)))
    full_water = unary_union([polygon for _, polygon in source_water])
    surfaces, buildings, selected_official, audits, excluded_buildings = [], [], [], [], []

    def surface(identifier, kind, material, height, geometry, basis, metadata=None):
        if geometry.is_empty or geometry.area <= 1e-8:
            return
        components = [geometry] if geometry.geom_type == 'Polygon' else list(geometry.geoms)
        kept, microscopic = [], []
        for component in components:
            if component.geom_type != 'Polygon':
                continue
            rounded = shapely.transform(component, lambda coordinates: coordinates.astype(np.float32).astype(np.float64))
            bounds = component.bounds
            diameter = math.hypot(bounds[2] - bounds[0], bounds[3] - bounds[1])
            if rounded.area == 0 and component.area <= 1e-8 and diameter <= .001:
                microscopic.append({'geometry': mapping(component), 'areaSquareMetres': component.area,
                                    'diameterMetres': diameter, 'float32AreaSquareMetres': rounded.area})
            else:
                kept.append(component)
        geometry = unary_union(kept)
        if geometry.is_empty:
            raise ValueError('A complete context feature collapsed in float32')
        try:
            records, numerical = context_polygons(geometry)
        except ValueError as error:
            write(args.output.with_name('surface-failure.json'), {'sourceId': identifier, 'geometry': mapping(geometry)})
            raise ValueError(f'{identifier}: {error}') from error
        surfaces.append({'sourceId': identifier, 'kind': kind, 'material': material, 'walkable': False,
                         'topHeightMetres': height, 'heightOrigin': 'authored-display; actual terrain and grade unmeasured',
                         'polygons': records, 'boundaryBasis': basis, **(metadata or {})})
        audits.append({'sourceId': identifier, 'float32DisplayAudit': numerical,
                       'microscopicFloat32Components': microscopic})

    water_used = Polygon()
    for feature, polygon in sorted(source_water, key=lambda item: shape(item[0]['geometry']).geom_type != 'Polygon'):
        clipped = polygon.intersection(extension).difference(water_used)
        surface(feature['sourceId'], 'water', 'water', -2.5, clipped,
                'complete-retained-area' if shape(feature['geometry']).geom_type in ('Polygon', 'MultiPolygon') else 'retained-centerline-with-existing-width',
                {key: feature.get(key) for key in ('sourceVersion', 'sourceTimestamp', 'sourceTags', 'width')})
        water_used = water_used.union(clipped)

    # 新背景建筑保留完整 LOD1 平面和 Z 范围；既有建筑及屋顶保持原文件。
    official_bytes = args.official.read_bytes()
    official = json.loads(gzip.decompress(official_bytes) if args.official.suffix == '.gz' else official_bytes)
    for feature in official['features']:
        properties = feature['properties']
        identifier = 'kyoto-city:' + properties['gml_id']
        if identifier in features:
            continue
        solid = shape(feature['geometry'])
        faces = list(solid.geoms) if solid.geom_type == 'MultiPolygon' else [solid]
        footprint = unary_union([shapely.force_2d(face) for face in faces if shapely.force_2d(face).area > 1e-15])
        if footprint.is_empty or not footprint.is_valid:
            raise ValueError('Invalid complete official building: ' + identifier)
        local = shapely.transform(footprint, project)
        if not extent.intersects(local) or not extension.intersects(local):
            continue
        frozen_overlap = local.intersection(covered).area
        if frozen_overlap > 1e-5:
            excluded_buildings.append({'sourceId': identifier, 'reason': 'full-footprint-overlaps-frozen-display',
                                       'overlapSquareMetres': frozen_overlap})
            continue
        z = shapely.get_coordinates(solid, include_z=True)[:, 2]
        height = float(np.max(z) - np.min(z))
        if not math.isfinite(height) or height <= 0:
            raise ValueError('Invalid official Z range: ' + identifier)
        records, numerical = ART.display_polygons(SITE.display_geometry(local, .001))
        buildings.append({'sourceId': identifier, 'kind': 'building', 'sourceDataset': 'kyoto-city-lod1-2025',
                          'sourceTags': properties, 'sourceGeometry': mapping(footprint), 'geometry': mapping(local),
                          'height': {'metres': height, 'origin': 'derived-from-official-LOD1-z-range',
                                     'sourceMinimumZ': float(np.min(z)), 'sourceMaximumZ': float(np.max(z)),
                                     'measuredHeightAttribute': properties.get('計測高さ'),
                                     'meaning': 'LOD1 solid vertical extent; roof/facade proportions unreviewed'},
                          'baseHeightMetres': 0, 'baseHeightOrigin': 'authored-flat-display', 'navigation': 'unreviewed',
                          'polygons': records, 'recipeId': 'urban-stone', 'facadeEdges': [],
                          'architecturalReview': 'Neutral context massing; no detailed facade, entrance or tenant claim'})
        selected_official.append(feature)
        audits.append({'sourceId': identifier, 'float32DisplayAudit': numerical})
    building_area = unary_union([ART.record_geometry(building['polygons']) for building in buildings])
    road_used = Polygon()
    for feature in scene['features']:
        if feature['kind'] != 'road':
            continue
        local = shape(feature['geometry'])
        if local.geom_type in ('LineString', 'MultiLineString'):
            local = local.buffer(feature['width']['metres'] / 2, quad_segs=2, cap_style='flat', join_style='mitre')
        clipped = shapely.intersection(SITE.display_geometry(local, .001), extension, grid_size=1e-9)
        clipped, _ = SITE.normalize_boolean_surface(clipped)
        if clipped.is_empty:
            continue
        clipped = shapely.difference(clipped, full_water, grid_size=1e-9)
        clipped, _ = SITE.normalize_boolean_surface(clipped)
        clipped = shapely.difference(clipped, building_area, grid_size=1e-9)
        clipped, _ = SITE.normalize_boolean_surface(clipped)
        clipped = shapely.difference(clipped, road_used, grid_size=1e-9)
        tags = feature.get('sourceTags', {})
        material = 'paving' if tags.get('highway') == 'pedestrian' or tags.get('surface') in ('paving_stones', 'sett', 'cobblestone') else 'asphalt'
        surface(feature['sourceId'], 'road', material, -.12, clipped, 'retained-complete-road-geometry-with-existing-display-width',
                {key: feature.get(key) for key in ('sourceVersion', 'sourceTimestamp', 'sourceTags', 'width')})
        road_used = road_used.union(clipped)
    land = shapely.difference(extension, full_water, grid_size=1e-9)
    land = shapely.difference(land, road_used, grid_size=1e-9)
    surface('authored:shijo-river-context-land', 'land', 'paving', -.04, land,
            'authored-flat-complement-to-mapped-water-and-roads; extends below new building bases; no observed landcover or bank profile')

    bank_segments = []
    for feature, polygon in source_water:
        original = shape(feature['geometry'])
        if original.geom_type not in ('Polygon', 'MultiPolygon'):
            continue
        shoreline = polygon.boundary.intersection(full_water.boundary.buffer(.002)).intersection(extension)
        for part in ART.line_parts(shoreline):
            for a, b in zip(part.coords, list(part.coords)[1:]):
                edge = LineString([a, b])
                if edge.length <= .01 or edge.interpolate(.5, normalized=True).distance(original.boundary) > .002:
                    continue
                midpoint = edge.interpolate(.5, normalized=True)
                dx, dy = b[0] - a[0], b[1] - a[1]
                left = Point(midpoint.x - dy / edge.length * .01, midpoint.y + dx / edge.length * .01)
                start, end = (a, b) if full_water.covers(left) else (b, a)
                bank_segments.append({'sourceId': feature['sourceId'], 'from': list(start), 'to': list(end),
                                      'waterOnLeft': True, 'topHeightMetres': -.04, 'bottomHeightMetres': -2.5,
                                      'heightOrigin': 'authored-display; actual bank profile unmeasured',
                                      'boundaryBasis': 'complete-retained-water-area-boundary; display-caps-excluded'})

    rendered = [ART.record_geometry(item['polygons']) for item in surfaces]
    combined = unary_union(rendered)
    overlap = combined.intersection(covered).area
    mutual_overlap = sum(item.area for item in rendered) - combined.area
    expected = extension
    missing = expected.symmetric_difference(combined).area
    if overlap > 1e-5 or abs(mutual_overlap) > 1e-5 or missing > .001:
        raise ValueError(f'Context conservation failed: old={overlap}, mutual={mutual_overlap}, missing={missing}')
    source_path = args.selected_source or args.official
    if args.selected_source:
        source_path.parent.mkdir(parents=True, exist_ok=True)
        payload = (json.dumps({'type': 'FeatureCollection', 'features': selected_official}, ensure_ascii=False, indent=2) + '\n').encode()
        source_path.write_bytes(gzip.compress(payload, mtime=0) if source_path.suffix == '.gz' else payload)
    ledger = json.loads(args.scene.with_name('source-ledger.json').read_text())
    if inputs != {path: sha(Path(path)) for path in inputs}:
        raise ValueError('An input changed during context preparation')
    result = {'schemaVersion': 1, 'id': 'shijo-east-river-context', 'attachmentCellId': 'cell-e010-n000',
              'frame': frame, 'sourceHashes': inputs, 'producerSha256': sha(Path(__file__)),
              'sourceLedger': ledger['sources'], 'selectedOfficialSource': {'file': str(source_path), 'sha256': sha(source_path),
                                                                           'license': 'CC-BY-4.0', 'features': len(selected_official)},
              'scope': scope, 'riverContextSurfaces': surfaces, 'riverContextBuildings': buildings,
              'riverContextBankSegments': bank_segments,
              'audit': {'canonicalAndNavigationUnchanged': True, 'surfaceCount': len(surfaces), 'buildingCount': len(buildings),
                        'bankSegments': len(bank_segments), 'excludedBuildings': excluded_buildings,
                        'landBelowNewBuildingFootprintsSquareMetres': land.intersection(building_area).area,
                        'landTopHeightMetres': -.04, 'buildingBaseHeightMetres': 0,
                        'surfaceTriangles': sum(len(polygon['triangles']) for item in surfaces for polygon in item['polygons']),
                        'buildingRoofTriangles': sum(len(polygon['triangles']) for item in buildings for polygon in item['polygons']),
                        'oldDisplayOverlapSquareMetres': overlap, 'mutualSurfaceOverlapSquareMetres': mutual_overlap,
                        'coverageDifferenceSquareMetres': missing, 'surfaceNumerics': audits,
                        'maximumCoverageDifferenceSquareMetres': .001, 'maximumOverlapSquareMetres': 1e-5,
                        'acceptanceLimits': {'oldDisplayOverlapSquareMetres': 1e-5,
                                             'mutualSurfaceOverlapSquareMetres': 1e-5,
                                             'coverageDifferenceSquareMetres': .001},
                        'maximumCleanupBoundaryChangeMetres': max(item['float32DisplayAudit']['hausdorffDistanceMetres'] for item in audits),
                        'cleanupBasis': 'GEOS triangles which collapse to zero area after actual float32 conversion; microscopic components require zero float32 area, area<=1e-8m2 and diameter<=1mm. Complete source geometry is retained.',
                        'overlayPrecisionMetres': 1e-9,
                        'buildingDisplayPrecisionMetres': .001,
                        'microscopicComponentPolicy': {'maximumAreaSquareMetres': 1e-8, 'maximumDiameterMetres': .001,
                                                       'requiresFloat32AreaZero': True},
                        'terrainMeasured': False, 'navigationExtended': False}}
    write(args.output, result)
    print(json.dumps({'output': str(args.output), 'sha256': sha(args.output), 'surfaceCount': len(surfaces),
                      'buildingCount': len(buildings), 'surfaceTriangles': result['audit']['surfaceTriangles'],
                      'buildingRoofTriangles': result['audit']['buildingRoofTriangles'], 'bankSegments': len(bank_segments)}))


if __name__ == '__main__':
    main()
