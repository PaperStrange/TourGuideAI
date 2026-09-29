// v8-frontage.mjs — rebuild the two footprints from the frozen OSM bytes and classify
// every edge as STREET-FRONTING vs flank, so the door placements can be tested against
// the real street wall. No producer geometry is trusted; node refs are re-projected here.
import { readFileSync } from 'node:fs';
const P = 'city-packs/kyoto-shijo/';
const corridor = JSON.parse(readFileSync(P + 'evidence/osm-corridor-map.json', 'utf8'));
const MLON = 91282.15, MLAT = 110940.65, O = { lon: 135.759719, lat: 35.003658 };
const XY = (lat, lon) => ({ x: (lon - O.lon) * MLON, y: (lat - O.lat) * MLAT });

const nodeById = new Map();
for (const e of corridor.elements) if (e.type === 'node') nodeById.set(e.id, e);

function footprint(wayId) {
  const w = corridor.elements.find(e => e.type === 'way' && e.id === wayId);
  if (!w) return null;
  const pts = w.nodes.map(id => { const n = nodeById.get(id); return n ? { id, ...XY(n.lat, n.lon) } : { id, x: NaN, y: NaN }; });
  return { wayId, tags: w.tags, pts };
}

// street centrelines present in the extract
const streetWays = corridor.elements.filter(e => e.type === 'way' && e.tags?.highway && e.tags?.name);
const named = {};
for (const w of streetWays) {
  const n = w.tags.name;
  if (!['四条通', '烏丸通'].includes(n)) continue;
  (named[n] ||= []).push(w);
}
console.log('===== street centrelines found in the frozen extract =====');
for (const [k, v] of Object.entries(named)) {
  console.log(`  ${k}: ${v.length} way(s)`);
  for (const w of v) {
    const pts = w.nodes.map(id => nodeById.get(id)).filter(Boolean).map(n => XY(n.lat, n.lon));
    if (!pts.length) continue;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    console.log(`    way/${w.id} lanes=${w.tags.lanes ?? '-'} x[${Math.min(...xs).toFixed(1)}, ${Math.max(...xs).toFixed(1)}] y[${Math.min(...ys).toFixed(1)}, ${Math.max(...ys).toFixed(1)}]`);
  }
}

// key street reference lines (from the pack's own observed features, re-derived here)
const SHIJO_Y = 0, KARASUMA_X = 0;   // ORIGIN lies on both, per the pack's own evidence

for (const [name, wayId] of [['京都三井ビルディング', 205732558], ['京都ダイヤビル', 205732536]]) {
  const fp = footprint(wayId);
  console.log(`\n===== ${name}  way/${wayId}  building=${fp.tags.building} levels=${fp.tags['building:levels']} =====`);
  console.log(`  outline (x_m, y_m) in order:`);
  for (const p of fp.pts) console.log(`    node/${String(p.id).padEnd(12)} x=${p.x.toFixed(2).padStart(8)}  y=${p.y.toFixed(2).padStart(8)}`);

  // classify edges
  const pts = fp.pts.slice(0, -1);  // last repeats first
  console.log('  edges:');
  const fronting = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    if (!isFinite(a.x) || !isFinite(b.x)) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    // which side of the street is this edge on, and is it roughly parallel to 四条通?
    const parallelShijo = Math.abs(dy) < Math.abs(dx);       // more E-W than N-S
    const side = mid.y > 0 ? 'north' : 'south';
    const distFromShijo = Math.abs(mid.y);
    const distFromKarasuma = Math.abs(mid.x);
    // 四条通 carriageway half-width: north sidewalk 11.32, south -8.54 -> centreline ~+1.39
    const kind = parallelShijo && distFromShijo > 9.5 && distFromShijo < 15.5
      ? 'FRONTS-四条通'
      : (!parallelShijo && distFromKarasuma < 6 ? 'FRONTS-烏丸通?' : (parallelShijo ? 'parallel-but-setback' : 'flank-other'));
    console.log(`    ${String(a.id).padEnd(12)} -> ${String(b.id).padEnd(12)}  len=${len.toFixed(2).padStart(7)}  mid=(${mid.x.toFixed(1)}, ${mid.y.toFixed(1)})  dY=${distFromShijo.toFixed(1)}  ${kind}`);
    if (kind === 'FRONTS-四条通') fronting.push({ a, b, len, mid });
  }
  const total = fronting.reduce((s, e) => s + e.len, 0);
  console.log(`  >>> street-fronting (四条通) edges: ${fronting.length}, total length ${total.toFixed(3)} m`);
  for (const e of fronting) console.log(`      x from ${Math.min(e.a.x, e.b.x).toFixed(3)} to ${Math.max(e.a.x, e.b.x).toFixed(3)}  (len ${e.len.toFixed(3)})`);
}

// ---- now test the 12 door positions against the real street wall ----
console.log('\n===== the 12 doors vs. the real 四条通 street wall =====');
const osmDoors = JSON.parse(readFileSync(P + 'kyoto-shijo-osm.json', 'utf8')).doors;
const wall = [];  // collect street-fronting x-intervals from both footprints
for (const wayId of [205732558, 205732536]) {
  const fp = footprint(wayId);
  const pts = fp.pts.slice(0, -1);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (Math.abs(b.y - a.y) < Math.abs(b.x - a.x) && Math.abs(mid.y) > 9.5 && Math.abs(mid.y) < 15.5) {
      wall.push({ wayId, x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y: mid.y });
    }
  }
}
console.log('  measured 四条通 street wall segments:');
for (const w of wall) console.log(`    way/${w.wayId}  x [${w.x0.toFixed(3)}, ${w.x1.toFixed(3)}]  y=${w.y.toFixed(2)}  length=${(w.x1 - w.x0).toFixed(3)} m`);
const totalWall = wall.reduce((s, w) => s + (w.x1 - w.x0), 0);
console.log(`  TOTAL 四条通 street wall in the extract: ${totalWall.toFixed(3)} m`);

console.log('\n  door-by-door test (is the door actually on a street wall?):');
let onWall = 0, offWall = 0;
for (const d of osmDoors) {
  const x = d.placement.quantisedXM;
  const side = d.facadeLineRun.facadeId === 'F-north' ? 'north' : 'south';
  const segs = wall.filter(w => w.wayId === d.osmBuildingId);
  const hit = segs.find(s => x >= s.x0 - 0.001 && x <= s.x1 + 0.001);
  const verdict = hit ? 'ON street wall' : '*** NOT on any 四条通 wall of its own building ***';
  if (hit) onWall++; else offWall++;
  // distance to nearest wall segment of the same building
  let near = Infinity;
  for (const s of segs) near = Math.min(near, x < s.x0 ? s.x0 - x : (x > s.x1 ? x - s.x1 : 0));
  console.log(`    ${d.doorId}  ${side.padEnd(5)} x=${x.toFixed(4).padStart(8)}  building way/${d.osmBuildingId}  ${verdict}${isFinite(near) && near > 0 ? `  (nearest wall edge ${near.toFixed(2)} m away)` : ''}`);
}
console.log(`  on-wall: ${onWall}/12   off-wall: ${offWall}/12`);
