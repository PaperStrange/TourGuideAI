#!/usr/bin/env node
/**
 * build-osm-places.mjs — write city-packs/kyoto-shijo/kyoto-shijo-osm-places.json.
 *
 * Every coordinate in the ODbL file is copied out of an OSM response, never typed.
 * That is the whole point of generating it: a hand-transcribed number is exactly the
 * value nobody can check. Re-running this against the same evidence bytes must
 * reproduce the file byte-for-byte.
 *
 * Sources read (both are in evidence/, both are OSM = ODbL 1.0):
 *   evidence/osm-corridor-map.json      OSM API 0.6 map response, 四条烏丸 .. 祇園
 *   evidence/osm-block-q1-footprints.json   block-0 footprint response (already recorded
 *                                           by doors.json's method.facadeGeometrySource)
 *   evidence/osm-block-q2-everything.json   block-0 "everything" response
 *
 * Usage: node build-osm-places.mjs [--out ../../kyoto-shijo/kyoto-shijo-osm-places.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVID = resolve(HERE, '..');

const read = (f) => JSON.parse(readFileSync(resolve(EVID, f), 'utf8'));
const sha256 = (f) => createHash('sha256').update(readFileSync(resolve(EVID, f))).digest('hex').toUpperCase();

const corridor = read('osm-corridor-map.json');
const blockQ1 = read('osm-block-q1-footprints.json');
const blockQ2 = read('osm-block-q2-everything.json');

const nodeIndex = new Map();
for (const doc of [corridor, blockQ1, blockQ2]) {
  for (const e of doc.elements ?? []) if (e.type === 'node') nodeIndex.set(e.id, e);
}
const wayIndex = new Map();
for (const doc of [corridor, blockQ1, blockQ2]) {
  for (const e of doc.elements ?? []) if (e.type === 'way') wayIndex.set(e.id, e);
}

const udeg = (deg) => Math.round(deg * 1e6);
const centreOfNode = (id) => {
  const n = nodeIndex.get(id);
  if (!n) throw new Error(`node/${id} not found in any evidence file`);
  return { latUdeg: udeg(n.lat), lonUdeg: udeg(n.lon) };
};
const centreOfWay = (id) => {
  const w = wayIndex.get(id);
  if (!w) throw new Error(`way/${id} not found in any evidence file`);
  const ns = (w.nodes ?? []).map((n) => nodeIndex.get(n)).filter(Boolean);
  if (!ns.length) throw new Error(`way/${id} has no nodes present in the extracts`);
  const lat = ns.reduce((s, n) => s + n.lat, 0) / ns.length;
  const lon = ns.reduce((s, n) => s + n.lon, 0) / ns.length;
  return { latUdeg: udeg(lat), lonUdeg: udeg(lon), vertexCount: ns.length, declaredNodeCount: (w.nodes ?? []).length };
};

/** Named OSM objects the pack registers as places. `why` is the curation reason. */
const REGISTRY = [
  { placeId: 'kyoto-shijo-bldg-mitsui', kind: 'way', id: 205732558, why: 'north-side building containing doors D-N1..D-N7' },
  { placeId: 'kyoto-shijo-bldg-daiya', kind: 'way', id: 205732536, why: 'south-side building containing doors D-S1..D-S5' },
  { placeId: 'kyoto-shijo-bank-mufg-kyoto', kind: 'node', id: 14196400744, why: "the block's only mapped occupant (three doors' facade line is also recorded in kyoto-shijo-osm.json)" },
  { placeId: 'kyoto-shijo-hist-bank-sign-1', kind: 'node', id: 10220936881, why: 'history information board on the block' },
  { placeId: 'kyoto-shijo-hist-bank-sign-2', kind: 'node', id: 10220936882, why: 'history information board on the block' },
  { placeId: 'kyoto-shijo-crossing-karasuma-east', kind: 'node', id: 2737069286, why: 'signalised crossing on the east arm of 四条烏丸' },
  { placeId: 'kyoto-shijo-subway-shijo-exit1', kind: 'node', id: 11283562286, why: 'subway 四条駅 Exit 1 — the nearest station exit to the block' },
  { placeId: 'kyoto-shijo-subway-shijo-exit19', kind: 'node', id: 4229848161, why: 'subway 四条駅 exit 19' },
  { placeId: 'kyoto-shijo-bus-shijo-karasuma-F', kind: 'node', id: 2787253037, why: '四条烏丸 bus stop, Fのりば' },
  { placeId: 'kyoto-shijo-bus-shijo-karasuma-G', kind: 'node', id: 8447615881, why: '四条烏丸 bus stop, Gのりば' },
  { placeId: 'kyoto-shijo-bus-shijo-takakura-A', kind: 'node', id: 8886543723, why: '四条高倉 bus stop, Aのりば' },
  { placeId: 'kyoto-shijo-bus-shijo-kawaramachi-E', kind: 'node', id: 4387240005, why: '四条河原町 bus stop, Eのりば' },
  { placeId: 'kyoto-shijo-bus-shijo-kawaramachi-D', kind: 'node', id: 2503718438, why: '四条河原町 bus stop, Dのりば' },
  { placeId: 'kyoto-shijo-station-hankyu-kawaramachi', kind: 'node', id: 6944607675, why: '阪急京都線 京都河原町駅' },
  { placeId: 'kyoto-shijo-station-keihan-gion-shijo', kind: 'node', id: 6883622225, why: '京阪本線 祇園四条駅' },
  { placeId: 'kyoto-shijo-bus-shijo-keihan-mae-A', kind: 'node', id: 2930865877, why: '四条京阪前 bus stop, Aのりば' },
  { placeId: 'kyoto-shijo-bus-gion-A', kind: 'node', id: 2503718437, why: '祇園 bus stop, Aのりば' },
  { placeId: 'kyoto-shijo-yasaka-nishiromon', kind: 'way', id: 105449683, why: '八坂神社 西楼門 — the gate that faces 四条通' },
  { placeId: 'kyoto-shijo-yasaka-honden', kind: 'way', id: 88108397, why: '八坂神社 本殿' },
];

const rows = REGISTRY.map((r) => {
  const c = r.kind === 'node' ? centreOfNode(r.id) : centreOfWay(r.id);
  const el = r.kind === 'node' ? nodeIndex.get(r.id) : wayIndex.get(r.id);
  return {
    placeId: r.placeId,
    osmRef: `${r.kind}/${r.id}`,
    whyInPack: r.why,
    latUdeg: c.latUdeg,
    lonUdeg: c.lonUdeg,
    coordinateKind: 'osm-centre',
    nameOsm: el.tags?.name ?? null,
    nameEnOsm: el.tags?.['name:en'] ?? null,
    tags: el.tags ?? {},
    licence: 'ODbL 1.0',
  };
});

const doc = {
  schema: 'tourguide.city-pack.osm-derived/places/v1',
  pack: 'kyoto-shijo',
  note: 'Every coordinate and tag in this file originates in OpenStreetMap. It is a Derivative Database published under ODbL 1.0 (clause 4.4), and it is the alteration file clause 4.6 asks for. places.json and transit.json hold our own content and reach this file by placeId — no OSM value is copied back into them.',
  source: {
    dataset: 'OpenStreetMap, via the OSM API 0.6 map endpoint and Overpass API',
    licence: 'Open Database License (ODbL) 1.0',
    licenceUri: 'https://opendatacommons.org/licenses/odbl/1-0/',
    attribution: '© OpenStreetMap contributors',
    copyrightUrl: 'https://www.openstreetmap.org/copyright',
    retrievedAt: '2026-09-29',
    evidenceFiles: [
      { file: 'evidence/osm-corridor-map.json', sha256: sha256('osm-corridor-map.json'), query: 'https://api.openstreetmap.org/api/0.6/map.json?bbox=135.7588,35.0028,135.7789,35.0047' },
      { file: 'evidence/osm-corridor-os.json', sha256: sha256('osm-corridor-os.json'), query: 'https://api.openstreetmap.org/api/0.6/map.json?bbox=135.7595,35.0028,135.7790,35.0047' },
      { file: 'evidence/osm-block-q1-footprints.json', sha256: sha256('osm-block-q1-footprints.json'), note: 'already recorded by doors.json method.facadeGeometrySource' },
      { file: 'evidence/osm-block-q2-everything.json', sha256: sha256('osm-block-q2-everything.json'), note: 'already recorded by doors.json method.facadeGeometrySource.secondQuery' },
    ],
  },
  method: {
    scripts: ['evidence/tools/build-osm-places.mjs', 'evidence/tools/measure-shijo-walk.mjs'],
    coordinateRule: 'integer microdegrees, rounded to nearest (iteration/design/contract-geo-pipeline.md §5)',
    wayCentreRule: 'arithmetic mean of the way\'s vertices that are present in the extracts',
  },
  places: rows,
  walkMeasurement: JSON.parse(readFileSync(resolve(EVID, 'transit-measurement.json'), 'utf8')),
};

const outIdx = process.argv.indexOf('--out');
const OUT = outIdx > 0 ? process.argv[outIdx + 1] : resolve(EVID, '../../kyoto-shijo/kyoto-shijo-osm-places.json');
writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log(`wrote ${OUT}  ${rows.length} places`);
for (const r of rows) console.log(`  ${r.placeId.padEnd(42)} ${r.osmRef.padEnd(18)} ${r.latUdeg},${r.lonUdeg}  ${r.nameOsm ?? ''}`);
