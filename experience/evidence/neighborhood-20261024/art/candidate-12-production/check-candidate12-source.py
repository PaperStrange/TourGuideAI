import collections
import copy
import hashlib
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'experience/art'))
from neighborhood_mesh import MeshBatch, building_geometry
from neighborhood_landmarks import canopy_geometry


def records(batches, remap=None):
    remap = remap or {}
    return collections.Counter((remap.get(name, name), tuple(batch.vertices[index] for index in face))
                               for name, batch in batches.items() for face in batch.faces)


style = json.loads((ROOT / 'experience/art/neighborhood-style.json').read_text())
scene = json.loads((ROOT / 'experience/src/neighborhoods/shijo-east/scene.json').read_text())
prepared = json.loads((ROOT / 'artifacts/neighborhood-20261023/world/art-selection.json').read_text())
features = {feature['sourceId']: feature for feature in scene['features']}
selections = {feature['sourceId']: feature for feature in prepared['buildings']}
report = {'status': 'pass-pure-source-proof', 'facades': [], 'roof': {}}
for source_id, override in style['sourceFacadeOverrides'].items():
    original = copy.deepcopy(features[source_id])
    recipe_id = ('urban-stone', 'urban-plaster', 'urban-tile')[int(hashlib.sha256(source_id.encode()).hexdigest()[:4], 16) % 3]
    recipe = dict(style['recipes'][recipe_id], facadeEdges=[[edge['polygonIndex'], 0, edge['edgeIndex']]
                  for edge in selections[source_id]['routeFacingEdges']], arcadeFacadeEdges=[])
    candidate = dict(original, facadeOverrides=[override])
    a, b = override['expectedFrom'], override['expectedTo']
    length = math.dist(a, b)
    tangent = ((b[0] - a[0]) / length, (b[1] - a[1]) / length)
    outward = (tangent[1], -tangent[0])
    for lod in ('base', 'near'):
        prior = {name: MeshBatch() for name in style['materials']}
        current = {name: MeshBatch() for name in style['materials']}
        building_geometry(original, recipe, lod, override['expectedSourceIndex'], prior)
        building_geometry(candidate, recipe, lod, override['expectedSourceIndex'], current)
        old, new = records(prior), records(current)
        removed, added = old - new, new - old
        protected = collections.Counter({key: count for key, count in old.items()
                      if min(point[2] for point in key[1]) < 3.5 or all(point[2] == original['height']['metres'] for point in key[1])})
        assert not protected - new, (source_id, lod, 'protected geometry changed')
        for material, face in list(removed) + list(added):
            assert min(point[2] for point in face) >= 3.5
            for point in face:
                along = (point[0] - a[0]) * tangent[0] + (point[1] - a[1]) * tangent[1]
                depth = (point[0] - a[0]) * outward[0] + (point[1] - a[1]) * outward[1]
                assert -.1 <= along <= length + .1 and -.401 <= depth <= .101, (source_id, point)
        old_triangles = sum(batch.triangles for batch in prior.values())
        new_triangles = sum(batch.triangles for batch in current.values())
        assert new_triangles - old_triangles <= 4000
        report['facades'].append({'sourceId': source_id, 'lod': lod, 'priorTriangles': old_triangles,
            'candidateTriangles': new_triangles, 'deltaTriangles': new_triangles - old_triangles,
            'protectedFacesExact': sum(protected.values()), 'removedFaces': sum(removed.values()),
            'addedFaces': sum(added.values()), 'allChangesOnSelectedUpperFace': True})

source_id = 'osm:way:772134672'
for lod in ('base', 'near'):
    assert sum(item['deltaTriangles'] for item in report['facades'] if item['lod'] == lod) <= 4000
sheet = style['sourceThinSheets'][source_id]
feature = dict(features[source_id], soffitPolygons=[], facadeSegments=[])
for lod in ('base', 'near'):
    before = {name: MeshBatch() for name in style['materials']}
    after = {name: MeshBatch() for name in style['materials']}
    before_structure = {name: MeshBatch() for name in style['materials']}
    after_structure = {name: MeshBatch() for name in style['materials']}
    canopy_geometry(feature, lod, 139, before, before_structure)
    canopy_geometry(dict(feature, roofRoleMaterials=sheet['materials']), lod, 139, after, after_structure)
    assert records(before) == records(after, {value: key for key, value in sheet['materials'].items()})
    assert records(before_structure) == records(after_structure)
    assert all(set(after[name].source_indices) == {139.0} for name in sheet['materials'].values())
    report['roof'][lod] = {'geometryExact': True, 'entranceTrimExact': True,
                           'triangles': sum(batch.triangles for batch in after.values())}
report['producerFiles'] = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
                         for path in [ROOT / 'experience/art/neighborhood_mesh.py', ROOT / 'experience/art/neighborhood_landmarks.py',
                                      ROOT / 'experience/art/neighborhood-style.json', ROOT / 'experience/art/build_neighborhood.py']}
print(json.dumps(report, indent=2))
