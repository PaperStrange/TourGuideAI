import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
SITES = [
    ('delft-markt', 'NL', 'Delft Markt / City Hall', [4.3570, 52.0108, 4.3595, 52.0121], '209351406'),
    ('helsinki-senate', 'FI', 'Helsinki Senate Square / Cathedral', [24.9518, 60.1681, 24.9548, 60.1704], '1542850662'),
]
FIELDS = ['height', 'building:levels', 'roof:shape', 'roof:height', 'building:material', 'width', 'access', 'wheelchair']


def tags(element):
    return {tag.get('k'): tag.get('v') for tag in element.findall('tag')}


def way_record(way, nodes):
    identifiers = [node.get('ref') for node in way.findall('nd')]
    values = tags(way)
    return {'id': 'osm:way:' + way.get('id'), 'version': int(way.get('version')),
            'timestamp': way.get('timestamp'), 'nodeCountIncludingClosure': len(identifiers),
            'closed': identifiers[0] == identifiers[-1],
            'missingNodeIds': [identifier for identifier in identifiers if identifier not in nodes],
            'tags': values, 'fieldPresence': {field: values.get(field) for field in FIELDS}}


result = []
retrievals = {item['id']: item for item in json.loads((ROOT / 'retrievals.json').read_text())}
for identifier, country, title, bbox, landmark_id in SITES:
    path = ROOT / (identifier + '.osm')
    data = path.read_bytes()
    capture = retrievals[identifier]
    assert len(data) == capture['bytes']
    assert hashlib.sha256(data).hexdigest() == capture['sha256']
    document = ET.fromstring(data)
    nodes = {node.get('id'): node for node in document.findall('node')}
    ways = {way.get('id'): way for way in document.findall('way')}
    buildings = [way for way in ways.values() if 'building' in tags(way)]
    highways = [way for way in ways.values() if 'highway' in tags(way)]
    relations = []
    for relation in document.findall('relation'):
        if 'building' not in tags(relation):
            continue
        members = [member.attrib for member in relation.findall('member')]
        present = [member for member in members if member['type'] == 'way' and member['ref'] in ways]
        relations.append({'id': 'osm:relation:' + relation.get('id'), 'version': int(relation.get('version')),
                          'tags': tags(relation), 'members': members,
                          'missingWayIds': [member['ref'] for member in members if member['type'] == 'way' and member['ref'] not in ways],
                          'presentMembers': [way_record(ways[member['ref']], nodes) for member in present]})
    landmark = way_record(ways[landmark_id], nodes)
    assert landmark['closed'] and not landmark['missingNodeIds']
    result.append({'id': identifier, 'country': country, 'title': title, 'bboxWgs84WestSouthEastNorth': bbox,
                   'source': capture, 'attribution': '© OpenStreetMap contributors', 'license': 'ODbL-1.0',
                   'licenseUrl': 'https://www.openstreetmap.org/copyright',
                   'rawCounts': {'nodes': len(nodes), 'ways': len(ways), 'relations': len(document.findall('relation')),
                                 'buildingWays': len(buildings), 'highwayWays': len(highways)},
                   'landmark': landmark, 'buildingRelations': relations,
                   'buildingTagPresenceCounts': {field: sum(field in tags(way) for way in buildings) for field in FIELDS},
                   'highwayKinds': {kind: sum(tags(way)['highway'] == kind for way in highways) for kind in sorted({tags(way)['highway'] for way in highways})},
                   'limits': ['Counts describe the complete response, including ways and relation members extending beyond the requested bbox.',
                              'Map editing timestamps and source dates are independent of capture/review date.',
                              'Height and access tags remain source reports; this intake does not certify facade shape or current walking access.',
                              'A building height does not specify individual roofs, domes, towers or facade elevations.']})
print(json.dumps({'reviewedAt': '2026-10-21', 'status': 'raw-source-identity-and-completeness-checked', 'sites': result}, ensure_ascii=False, indent=2))
