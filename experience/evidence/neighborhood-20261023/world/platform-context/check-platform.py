import argparse
import hashlib
import json
from pathlib import Path

from shapely.geometry import Point, shape

ROOT = Path(__file__).resolve().parents[5]
parser = argparse.ArgumentParser()
parser.add_argument('--raw-osm', type=Path)
args = parser.parse_args()
records = json.loads(Path(__file__).with_name('osm-records.json').read_text())
official_path = ROOT / 'experience/src/neighborhoods/shijo-east/sources/kyoto-lod1.geojson'
official_bytes = official_path.read_bytes()
assert hashlib.sha256(official_bytes).hexdigest() == 'da1af049906d736b6329e062673a84728640957475d3b46107cebf46b48a2d93'
official = json.loads(official_bytes)
identifier = 'bldg_74454289-1d7a-4105-87ea-26e36c69bc44'
feature = next(item for item in official['features'] if item['properties']['gml_id'] == identifier)
scene_path = ROOT / 'experience/src/neighborhoods/shijo-east/scene.json'
scene_bytes = scene_path.read_bytes()
assert hashlib.sha256(scene_bytes).hexdigest() == '2979a2e426271fe19c91114928eb27b625cbfe3f8548eef4bdaec73e45cb7e8e'
scene = json.loads(scene_bytes)
mass = next(item for item in scene['features'] if item['sourceId'] == 'kyoto-city:' + identifier)
assert feature['properties'] == mass['sourceTags']
platform = next(item for item in records['elements'] if item['type'] == 'node' and item['id'] == 8886543723)
stop_area = next(item for item in records['elements'] if item['type'] == 'relation' and item['id'] == 21186538)
assert {'type': 'node', 'ref': platform['id'], 'role': 'platform'} in stop_area['members']

# 投影沿用冻结场景的经纬度原点与米制比例。
point = Point((platform['lon'] - 135.759719) * 91282.15, (platform['lat'] - 35.003739) * 110940.65)
footprint = shape(mass['geometry'])
assert footprint.contains(point)
assert abs(footprint.boundary.distance(point) - 0.783915255136987) < 1e-9
assert platform['tags']['shelter'] == 'yes;no'
assert mass['height']['measuredHeightAttribute'] == '2.9'
assert abs(mass['height']['metres'] - 2.124) < 1e-9
assert mass['osmMatches'] == [] and mass['canopySourceIds'] == []
if args.raw_osm:
    raw_bytes = args.raw_osm.read_bytes()
    assert hashlib.sha256(raw_bytes).hexdigest() == records['sourceSha256']
    raw_elements = {(item['type'], item['id']): item for item in json.loads(raw_bytes)['elements']}
    for item in records['elements']:
        assert item == raw_elements[(item['type'], item['id'])]
print(json.dumps({'status': 'pass', 'sourceId': mass['sourceId'], 'officialProperties': feature['properties'],
                  'platformNodeId': platform['id'], 'stopAreaRelationId': stop_area['id'],
                  'projectedPoint': list(point.coords)[0], 'insideFootprint': True,
                  'boundaryDistanceMetres': footprint.boundary.distance(point), 'height': mass['height'],
                  'rawOsmIdentityChecked': args.raw_osm is not None}, ensure_ascii=False, indent=2))
