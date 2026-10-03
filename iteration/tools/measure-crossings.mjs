// Resolve the crossings' node refs to coordinates and measure them.
// The claim under test: a crossing's span across 四条通 equals the carriageway width,
// so if the crossings cluster at ~19-20 m, CARRIAGEWAY_HALF_M = 5.0 describes a 10 m road
// that does not exist.
import { readFileSync } from 'node:fs';
const R = 'D:/All-Downloads/TourGuideAI/';
const j = JSON.parse(readFileSync(R + 'city-packs/kyoto-shijo/evidence/osm-corridor-map.json', 'utf8'));
const els = j.elements || [];

const byId = new Map();
for (const e of els) if (e.type === 'node') byId.set(e.id, e);

const x = (lon) => (lon - 135.759719) * 91282.15;
const y = (lat) => (lat - 35.003739) * 110940.65;

const crossings = els.filter((e) => e.tags && e.tags.footway === 'crossing');
const rows = [];
for (const c of crossings) {
  const pts = (c.nodes || []).map((id) => byId.get(id)).filter(Boolean).map((n) => ({ x: x(n.lon), y: y(n.lat) }));
  if (pts.length < 2) continue;
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const dx = Math.abs(pts[pts.length - 1].x - pts[0].x);
  const dy = Math.abs(pts[pts.length - 1].y - pts[0].y);
  rows.push({ id: c.id, n: pts.length, len, dx, dy, dxs: dx, dys: dy, mark: c.tags['crossing:markings'] || '-', sig: c.tags.crossing || '-' });
}

console.log(`crossings with >=2 resolved nodes: ${rows.length} of ${crossings.length}`);
console.log('');
console.log('=== sorted by dy (north-south extent) -- these are the ones that cross the street ===');
rows.sort((a, b) => b.dy - a.dy);
console.log('  way id        nodes   dy(m)    dx(m)   markings        crossing');
for (const r of rows.slice(0, 16)) {
  console.log(`  ${String(r.id).padEnd(13)} ${String(r.n).padStart(3)}  ${r.dy.toFixed(2).padStart(7)}  ${r.dx.toFixed(2).padStart(6)}   ${r.mark.padEnd(14)} ${r.sig}`);
}

const dys = rows.filter((r) => r.dy > 8).map((r) => r.dy).sort((a, b) => a - b);
console.log('');
console.log(`=== the ones spanning > 8 m in y: ${dys.length} ===`);
if (dys.length) {
  const mean = dys.reduce((a, b) => a + b, 0) / dys.length;
  console.log(`  min ${dys[0].toFixed(2)}  median ${dys[Math.floor(dys.length / 2)].toFixed(2)}  mean ${mean.toFixed(2)}  max ${dys[dys.length - 1].toFixed(2)}`);
}

console.log('');
console.log('=== the comparison ===');
console.log('  CARRIAGEWAY_HALF_M = 5.0   =>  a 10.00 m carriageway');
console.log(`  spanning crossings say     =>  a ${dys.length ? (dys.reduce((a, b) => a + b, 0) / dys.length).toFixed(1) : '?'} m carriageway (mean), i.e. half-width ~${dys.length ? (dys.reduce((a, b) => a + b, 0) / dys.length / 2).toFixed(1) : '?'} m`);
console.log('  contract bound W + D <= 9.18 with D = 3.0  =>  half-width <= 6.18 m');

console.log('');
console.log('=== distribution of ALL crossing dy ===');
const alldy = rows.map((r) => r.dy).sort((a, b) => a - b);
const q = (f) => alldy[Math.min(alldy.length - 1, Math.floor(alldy.length * f))];
console.log(`  min ${alldy[0].toFixed(2)}  p25 ${q(.25).toFixed(2)}  median ${q(.5).toFixed(2)}  p75 ${q(.75).toFixed(2)}  max ${alldy[alldy.length - 1].toFixed(2)}`);
console.log('  (a cluster near 3-5 m would be crossings of side streets, not of 四条通)');
