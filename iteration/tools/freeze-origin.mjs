// A1 — freeze the projection origin by MEASUREMENT, not by hand.
//
// User decision: "方案1+方案2，默认方案1，允许用户语言输入并作为方案2的原点"
//   - default (方案 1): DERIVED — the westernmost point of the road we actually use.
//   - override (方案 2): a HUMAN-NAMED anchor resolved to coordinates, validated identically.
//
// CORRECTION over the first attempt: "westernmost road node in the slice" is NOT a valid
// rule — the westernmost x_m in a bbox can belong to any cross street. The first run
// returned 錦小路通, a residential lane, because the bbox extended west of 四条烏丸.
// The rule must be anchored to the road the slice IS: 四条通 (市道186号 嵐山祇園線).
//
// Reads a cached Overpass response (fetched with curl, which this sandbox permits).
// Usage: node freeze-origin.mjs <overpass.json> [--out file.json]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const src = process.argv[2];
if (!src || !existsSync(src)) { console.error('usage: node freeze-origin.mjs <overpass.json> [--out file.json]'); process.exit(10); }

const ROAD = '四条通';
const LON_M_PER_DEG = 91282.15;
const LAT_M_PER_DEG = 110940.65;
const KARASUMA = { lat: 35.003825, lon: 135.759680 };

const json = JSON.parse(readFileSync(src, 'utf8'));
const ways = (json.elements || []).filter((e) => e.type === 'way' && Array.isArray(e.geometry));
console.log(`source            : ${src}`);
console.log(`ways named ${ROAD}   : ${ways.length}`);

const nodes = [];
for (const w of ways) {
  w.geometry.forEach((p, i) => nodes.push({
    lat: p.lat, lon: p.lon, wayId: w.id, idx: i,
    highway: w.tags?.highway ?? '', lanes: w.tags?.lanes ?? '', width: w.tags?.width ?? '',
  }));
}
console.log(`geometry nodes    : ${nodes.length}`);
if (!nodes.length) { console.error('no geometry for the named road'); process.exit(2); }

const lat0 = nodes.reduce((s, p) => s + p.lat, 0) / nodes.length;
const lon0 = nodes.reduce((s, p) => s + p.lon, 0) / nodes.length;
for (const p of nodes) {
  p.xm = (p.lon - lon0) * LON_M_PER_DEG;
  p.ym = (p.lat - lat0) * LAT_M_PER_DEG;
}

const west = nodes.reduce((a, b) => (b.xm < a.xm ? b : a));
const east = nodes.reduce((a, b) => (b.xm > a.xm ? b : a));
const span = east.xm - west.xm;
const toUd = (d) => Math.round(d * 1e6);

console.log(`\n── 方案 1 origin candidate: westernmost point of ${ROAD} ──`);
console.log(`  lon ${west.lon.toFixed(7)}   lat ${west.lat.toFixed(7)}`);
console.log(`  MICRODEG  lon ${toUd(west.lon)}   lat ${toUd(west.lat)}`);
console.log(`  OSM way ${west.wayId} node#${west.idx}  highway=${west.highway}  lanes=${west.lanes || '-'}  width=${west.width || '-'}`);
console.log(`  east end  lon ${east.lon.toFixed(7)}  lat ${east.lat.toFixed(7)}  (microdeg ${toUd(east.lon)}, ${toUd(east.lat)})`);

console.log(`\n── corridor span along the road ──`);
console.log(`  span          : ${span.toFixed(2)} m`);
console.log(`  frozen wTiles : 2000`);
console.log(`  margin        : ${(span - 2000).toFixed(2)} m  ${span >= 2000 ? '(covers the 2000 m contract ✅)' : '❌ SHORT'}`);

const dx = (west.lon - KARASUMA.lon) * LON_M_PER_DEG;
const dy = (west.lat - KARASUMA.lat) * LAT_M_PER_DEG;
const dist = Math.hypot(dx, dy);
console.log(`\n── cross-check vs 四条烏丸 (${KARASUMA.lat}, ${KARASUMA.lon}) ──`);
console.log(`  derived origin sits ${dist.toFixed(1)} m from 四条烏丸   (dx ${dx.toFixed(1)} m, dy ${dy.toFixed(1)} m)`);
console.log(`  → the two schemes ${dist < 60 ? 'AGREE (within one block) ✅' : 'DISAGREE — needs a decision ❌'}`);

const payload = {
  note: 'A1 origin — derived candidate to freeze into the geo contract (GAP-1)',
  method: `方案 1: westernmost geometry point of the road actually used (${ROAD}), not of the bbox`,
  correction: 'The bbox-wide "westernmost node" rule was wrong — it returned 錦小路通, a residential lane west of 四条烏丸.',
  road: ROAD,
  source: 'Overpass API (overpass-api.de), OpenStreetMap contributors',
  licence: 'ODbL 1.0',
  coefficients: { LON_M_PER_DEG, LAT_M_PER_DEG },
  derivedOrigin: {
    lonUdeg: toUd(west.lon), latUdeg: toUd(west.lat),
    lonDeg: west.lon, latDeg: west.lat,
    osmWayId: west.wayId, nodeIndex: west.idx, highway: west.highway, lanes: west.lanes || null, width: west.width || null,
  },
  eastEnd: { lonUdeg: toUd(east.lon), latUdeg: toUd(east.lat), lonDeg: east.lon, latDeg: east.lat },
  corridor: { measuredSpanM: Number(span.toFixed(2)), frozenWTiles: 2000, marginM: Number((span - 2000).toFixed(2)) },
  crossCheck: { anchor: '四条烏丸', ...KARASUMA, distanceM: Number(dist.toFixed(1)), agree: dist < 60 },
  counts: { ways: ways.length, nodes: nodes.length },
};

const i = process.argv.indexOf('--out');
if (i > 0 && process.argv[i + 1]) {
  writeFileSync(process.argv[i + 1], JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\n  wrote ${process.argv[i + 1]}`);
}
