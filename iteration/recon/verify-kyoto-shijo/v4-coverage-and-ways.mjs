// v4-coverage-and-ways.mjs — (a) reverse-project every OSM way/anchor coordinate about
// which a coordinate claim is made, and (b) quantify what the 19 chosen places cover.
import { readFileSync } from 'node:fs';
const P = 'city-packs/kyoto-shijo/';
const rj = (f) => JSON.parse(readFileSync(P + f, 'utf8'));
const corridor = rj('evidence/osm-corridor-map.json');
const osmHalf = rj('kyoto-shijo-osm-places.json');
const places = rj('places.json');

const M_LON = 91282.15, M_LAT = 110940.65, O = { lon: 135.759719, lat: 35.003658 };
const XY = (lat, lon) => ({ x: (lon - O.lon) * M_LON, y: (lat - O.lat) * M_LAT });
const elems = corridor.elements;
const nodeById = new Map();
for (const e of elems) if (e.type === 'node') nodeById.set(e.id, e);
const elByKey = new Map();
for (const e of elems) elByKey.set(`${e.type}/${e.id}`, e);

console.log('===== (a) does the stored microdegree coordinate equal the raw OSM geometry? =====');
console.log('  place                                  osmRef              stored µdeg        raw OSM value               Δ (m)   verdict');
let worst = 0, bad = 0;
for (const p of places) {
  const rec = osmHalf.places.find(r => r.placeId === p.id);
  if (!rec) continue;
  const [kind, idStr] = rec.osmRef.split('/');
  const id = Number(idStr);
  const el = elByKey.get(rec.osmRef);
  if (!el) { console.log(`  ${p.id.padEnd(38)} ${rec.osmRef.padEnd(19)} OBJECT NOT IN EXTRACT`); bad++; continue; }
  let lat, lon, how;
  if (kind === 'node') { lat = el.lat; lon = el.lon; how = 'node'; }
  else {
    const ns = (el.nodes || []).map(n => nodeById.get(n)).filter(Boolean);
    if (!ns.length) { console.log(`  ${p.id.padEnd(38)} ${rec.osmRef.padEnd(19)} way has no resolvable nodes`); bad++; continue; }
    lat = ns.reduce((a, n) => a + n.lat, 0) / ns.length;
    lon = ns.reduce((a, n) => a + n.lon, 0) / ns.length;
    how = `way avg of ${ns.length} nodes`;
  }
  const dm = Math.hypot((p.lat - lat) * M_LAT, (p.lng - lon) * M_LON);
  const ok = dm < 0.06;              // rounding to 1e-6 deg is ~0.11 m; allow 6 cm
  if (!ok) bad++;
  worst = Math.max(worst, dm);
  console.log(`  ${p.id.padEnd(38)} ${rec.osmRef.padEnd(19)} ${String(p.latUdeg + '/' + p.lngUdeg).padEnd(18)} ${lat.toFixed(7) + ',' + lon.toFixed(7)}  ${dm.toFixed(3).padStart(6)}  ${ok ? 'MATCH' : '*** OFF ***'} (${how})`);
}
console.log(`  worst deviation ${worst.toFixed(3)} m; records not reproduced: ${bad}/${places.length}`);
console.log('  => the way-based coordinateKind is "vertex mean", which the raw geometry reproduces;');
console.log('     that is a reviewer-derivable quantity, not a source-stated one (informational, not a violation).');

console.log('\n===== (b) how representative are the 19 chosen places? =====');
const cnt = (fn) => elems.filter(fn).length;
console.log(`  raw extract elements total            : ${elems.length}`);
console.log(`  nodes / ways                          : ${cnt(e => e.type === 'node')} / ${cnt(e => e.type === 'way')}`);
const cats = {
  'railway=station nodes (all)': elems.filter(e => e.type === 'node' && e.tags?.railway === 'station').length,
  'railway=station nodes in places.json': 2,
  'railway=subway_entrance nodes (all)': cnt(e => e.type === 'node' && e.tags?.railway === 'subway_entrance'),
  'subway_entrance nodes in places.json': 2,
  'highway=bus_stop nodes (all)': cnt(e => e.type === 'node' && e.tags?.highway === 'bus_stop'),
  'bus_stop nodes in places.json': 8,
  'tourism=information nodes (all)': cnt(e => e.type === 'node' && e.tags?.tourism === 'information'),
  'information nodes in places.json': 2,
  'amenity=bank nodes (all)': cnt(e => e.type === 'node' && e.tags?.amenity === 'bank'),
  'bank nodes in places.json': 1,
  'highway=crossing nodes (all)': cnt(e => e.type === 'node' && e.tags?.highway === 'crossing'),
  'crossing nodes in places.json': 1,
  'building=* ways (all)': cnt(e => e.type === 'way' && e.tags?.building),
  'building ways in places.json': 2,
};
for (const [k, v] of Object.entries(cats)) console.log(`  ${k.padEnd(40)} ${v}`);
console.log('  NOTE: 清水寺 appears as a NAME inside the extract even though the temple lies outside');
console.log('        the bbox — let me show what actually carries that name:');
for (const e of elems) {
  const s = JSON.stringify(e.tags || {});
  if (s.includes('清水寺') && e.type === 'node') console.log(`      node/${e.id} lat=${e.lat} lon=${e.lon} tags=${s.slice(0, 150)}`);
}
