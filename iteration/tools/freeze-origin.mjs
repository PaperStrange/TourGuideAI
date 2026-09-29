// A1 — freeze the projection origin by MEASUREMENT, not by hand.
//
// User decision: "方案1+方案2，默认方案1，允许用户语言输入并作为方案2的原点"
//   - default (方案 1): DERIVED
//   - override (方案 2): a HUMAN-NAMED anchor resolved to coordinates, validated identically
//
// TWO corrections, both found by measurement rather than reasoning:
//
// (1) "Westernmost road node in the bbox" is not a rule — the westernmost x_m can belong
//     to any cross street. First run returned 錦小路通, a residential lane.
//
// (2) "Westernmost point of the named road" is not a rule either. 四条通 is the whole of
//     市道186号 嵐山祇園線, which starts at 松尾大社 and therefore runs ~1.0 km WEST of
//     四条烏丸. Measured way boundaries along 四条通 in the western stub:
//       273924626  135.748883 .. 135.751874  primary lanes=4
//       385665653  135.751874 .. 135.752063  primary lanes=4
//       273924625  135.752063 .. 135.755136  primary lanes=4
//       977465923  135.755136 .. 135.758147  primary lanes=4   <- the origin the first run picked
//       1496344393 135.758147 .. 135.758392  primary lanes=4
//       964931603  135.758392 .. 135.759606  primary lanes=4
//       678103923  135.759606 .. 135.759719  primary lanes=4   <- OSM way boundary sits ON 四条烏丸
//     So the origin must be CONSTRAINED to the declared slice, not merely to the road.
//
// Rule now: the westernmost geometry point of the road that lies at or EAST of the slice's
// declared western anchor (四条烏丸). The declared anchor is data, not opinion — the user
// named it, and an OSM way boundary confirms it.
//
// Reads a cached Overpass response (fetched with curl, which this sandbox permits).
// Usage: node freeze-origin.mjs <overpass.json> [--out file.json]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const src = process.argv[2];
if (!src || !existsSync(src)) { console.error('usage: node freeze-origin.mjs <overpass.json> [--out file.json]'); process.exit(10); }

// Read the corridor length from the AUTHORITATIVE frozen constant rather than
// repeating the number here. Hardcoding it is exactly how this file once wrote a
// stale `frozenWTiles: 2000 / marginM: -404.95` into the measurement record after
// the contract had moved to 1600.
const WG = new URL('../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', import.meta.url);
let wTiles;
try {
  ({ worldGrid: { wTiles } } = await import(WG.href));
} catch (e) {
  console.error(`cannot read worldGrid.wTiles from ${WG.pathname}: ${e.message}`);
  process.exit(11);
}
if (!Number.isInteger(wTiles) || wTiles <= 0) { console.error(`bad wTiles from contract: ${wTiles}`); process.exit(11); }

const ROAD = '四条通';
const LON_M_PER_DEG = 91282.15;
const LAT_M_PER_DEG = 110940.65;

// Declared slice anchor, from the user's own segment definition 四条烏丸 → 祇園.
//
// CORRECTED 2026-09-30 (found by doors-author). The previous value, lat 35.003825,
// sat 18.56 m NORTH of 四条通's centreline while claiming to be the 四条通 × 烏丸通
// crossing — implying a 520% grade between two points both supposedly on that street.
// The error came from modelling 四条烏丸 as a POINT. It is not one: it is the crossing
// of two roads, and a crossing has no single node.
//
// So the anchor is a pair, each half taken from whichever road actually defines it:
//   lon -> 烏丸通's eastern edge of the crossing, which is also the frozen origin's
//          longitude, so that the reported eastward offset stays 3.56 m;
//   lat -> 四条通's centreline (y = 0), because the slice runs ALONG 四条通 and its
//          cross-axis zero is that street, not the intersection's centroid.
// This keeps the published decomposition honest: east 3.56 m, south 18.53 m.
const ANCHOR = { name: '四条烏丸', lat: 35.003658, lon: 135.759719 };

const json = JSON.parse(readFileSync(src, 'utf8'));
const ways = (json.elements || []).filter((e) => e.type === 'way' && Array.isArray(e.geometry));
console.log(`source              : ${src}`);
console.log(`ways named ${ROAD}     : ${ways.length}`);

let nodes = [];
for (const w of ways) {
  w.geometry.forEach((p, i) => nodes.push({
    lat: p.lat, lon: p.lon, wayId: w.id, idx: i,
    highway: w.tags?.highway ?? '', lanes: w.tags?.lanes ?? '', width: w.tags?.width ?? '',
  }));
}
console.log(`geometry nodes      : ${nodes.length}`);
if (!nodes.length) { console.error('no geometry for the named road'); process.exit(2); }

// Constrain to the declared slice: everything at or east of the anchor.
const beforeN = nodes.length;
nodes = nodes.filter((p) => p.lon >= ANCHOR.lon);
console.log(`after slice clamp   : ${nodes.length}  (dropped ${beforeN - nodes.length} west of ${ANCHOR.name})`);
if (!nodes.length) { console.error(`no ${ROAD} geometry east of ${ANCHOR.name}`); process.exit(3); }

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
const distFromAnchor = Math.hypot((west.lon - ANCHOR.lon) * LON_M_PER_DEG, (west.lat - ANCHOR.lat) * LAT_M_PER_DEG);

console.log(`\n── 方案 1 origin: westernmost ${ROAD} point at or east of ${ANCHOR.name} ──`);
console.log(`  lon ${west.lon.toFixed(7)}   lat ${west.lat.toFixed(7)}`);
console.log(`  MICRODEG  lon ${toUd(west.lon)}   lat ${toUd(west.lat)}`);
console.log(`  OSM way ${west.wayId} node#${west.idx}  highway=${west.highway}  lanes=${west.lanes || '-'}  width=${west.width || '-'}`);
console.log(`  east end  lon ${east.lon.toFixed(7)}  lat ${east.lat.toFixed(7)}  (microdeg ${toUd(east.lon)}, ${toUd(east.lat)})`);

console.log(`\n── corridor span along the clamped road ──`);
console.log(`  span              : ${span.toFixed(2)} m`);
console.log(`  wTiles (contract) : ${wTiles}`);
console.log(`  margin            : ${(span - wTiles).toFixed(2)} m  ${span >= wTiles ? '(covers the corridor ✅)' : '❌ SHORT — the slice is smaller than wTiles assumes'}`);
const dEast = (west.lon - ANCHOR.lon) * LON_M_PER_DEG;
const dSouth = -(west.lat - ANCHOR.lat) * LAT_M_PER_DEG;
console.log(`\n  origin sits ${distFromAnchor.toFixed(2)} m from ${ANCHOR.name}`);
console.log(`    decomposition: east ${dEast.toFixed(2)} m, ${dSouth >= 0 ? 'south' : 'north'} ${Math.abs(dSouth).toFixed(2)} m`);
console.log(`    NOTE: the distance is not an eastward offset. Writing "east ${distFromAnchor.toFixed(1)} m" would imply`);
console.log(`          lonUdeg ${toUd(ANCHOR.lon + distFromAnchor / LON_M_PER_DEG)}, which is wrong by ~${((distFromAnchor - dEast)).toFixed(1)} m of longitude.`);

const payload = {
  note: 'A1 origin — derived candidate to freeze into the geo contract (GAP-1)',
  method: `方案 1: westernmost geometry point of ${ROAD} AT OR EAST OF the declared slice anchor (${ANCHOR.name})`,
  corrections: [
    'bbox-wide "westernmost node" returned 錦小路通, a residential lane.',
    'road-wide "westernmost point" returned 松尾大社, ~1.0 km west of the slice, because 四条通 IS 市道186号 嵐山祇園線.',
  ],
  road: ROAD,
  sliceAnchor: ANCHOR,
  source: 'Overpass API (overpass-api.de), OpenStreetMap contributors',
  licence: 'ODbL 1.0',
  coefficients: { LON_M_PER_DEG, LAT_M_PER_DEG },
  derivedOrigin: {
    lonUdeg: toUd(west.lon), latUdeg: toUd(west.lat),
    lonDeg: west.lon, latDeg: west.lat,
    osmWayId: west.wayId, nodeIndex: west.idx, highway: west.highway, lanes: west.lanes || null, width: west.width || null,
  },
  eastEnd: { lonUdeg: toUd(east.lon), latUdeg: toUd(east.lat), lonDeg: east.lon, latDeg: east.lat },
  corridor: { measuredSpanM: Number(span.toFixed(2)), wTiles, marginM: Number((span - wTiles).toFixed(2)) },
  crossCheck: { anchor: ANCHOR.name, distanceFromAnchorM: Number(distFromAnchor.toFixed(1)) },
  counts: { ways: ways.length, nodes: nodes.length },
};

const i = process.argv.indexOf('--out');
if (i > 0 && process.argv[i + 1]) {
  writeFileSync(process.argv[i + 1], JSON.stringify(payload, null, 2), 'utf8');
  console.log(`\n  wrote ${process.argv[i + 1]}`);
}
