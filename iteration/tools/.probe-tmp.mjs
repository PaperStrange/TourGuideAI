// temporary probe (not a deliverable) — corridor ordering of the 22 places
import { readFileSync } from 'node:fs';
const REPO = process.cwd();
const { ORIGIN, projectMicroDeg, quantizeToSubTile, locateSubTile, worldGrid, GRID } =
  await import(new URL('docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', `file://${REPO}/`).href);
const cp = 'city-packs/kyoto-shijo';
const places = JSON.parse(readFileSync(`${cp}/places.json`, 'utf8'));
const transit = JSON.parse(readFileSync(`${cp}/transit.json`, 'utf8'));

const rows = places.map((p) => {
  const { x_m, y_m } = projectMicroDeg(p.lngUdeg, p.latUdeg, ORIGIN);
  const sub = quantizeToSubTile(x_m, y_m);
  const at = locateSubTile(sub.subX, sub.subY);
  return { id: p.id, name: p.nameJa, x: x_m, y: y_m, tileX: at.tileX, row: at.row, inWindow: at.inWindow };
});
rows.sort((a, b) => a.x - b.x);
console.log('=== places in corridor order (x_m from the frozen origin) ===');
for (const r of rows) {
  console.log(`  x=${r.x.toFixed(2).padStart(9)}  y=${r.y.toFixed(2).padStart(7)}  tileX=${String(r.tileX).padStart(4)} row=${String(r.row).padStart(2)} inWin=${r.inWindow}  ${r.id}`);
}
const outside = rows.filter((r) => !r.inWindow);
console.log(`\n  ${rows.length} places, ${outside.length} outside the frozen window`);
if (outside.length) for (const o of outside) console.log(`    OUTSIDE: ${o.id} x=${o.x.toFixed(2)} row=${o.row}`);

console.log('\n=== consecutive pairs in x order: is there a leg? ===');
const ids = new Set(transit.map((t) => `${t.from}->${t.to}`));
const idsRev = new Set(transit.map((t) => `${t.to}->${t.from}`));
let missing = 0;
for (let i = 1; i < rows.length; i += 1) {
  const a = rows[i - 1];
  const b = rows[i];
  const fwd = ids.has(`${a.id}->${b.id}`);
  const rev = idsRev.has(`${a.id}->${b.id}`);
  const anyLeg = transit.find((t) => (t.from === a.id && t.to === b.id) || (t.from === b.id && t.to === a.id));
  if (!anyLeg) missing += 1;
  console.log(`  ${fwd || rev ? 'LEG ' : 'GAP '} ${a.id.slice(12)} -> ${b.id.slice(12)}  dx=${(b.x - a.x).toFixed(1)} m ${anyLeg ? `(${anyLeg.id} ${anyLeg.minutes}min)` : ''}`);
}
console.log(`\n  ${missing} consecutive pair(s) have no leg in transit.json`);
console.log('\n=== transit.json legs, in file order ===');
for (const t of transit) {
  const a = rows.find((r) => r.id === t.from);
  const b = rows.find((r) => r.id === t.to);
  console.log(`  ${t.id} ${t.mode} ${t.minutes}min  x:${a ? a.x.toFixed(1) : '?'} -> ${b ? b.x.toFixed(1) : '?'}  alongStreetM=${t.alongStreetM} straight=${t.measuredStraightM ?? '-'} fare=${t.fareIC}`);
}
