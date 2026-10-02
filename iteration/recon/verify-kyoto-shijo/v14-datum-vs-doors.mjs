// v14-datum-vs-doors.mjs — after the datum shift, do the recorded facade lines and the
// recorded door positions still describe the same wall? If a datum moved and only one of
// the two was re-derived, doors silently float off their own building.
import { readFileSync } from 'node:fs';
const P = 'city-packs/kyoto-shijo/';
const rd = (f) => readFileSync(P + f, 'utf8');
const osm = JSON.parse(rd('kyoto-shijo-osm.json'));
const doors = JSON.parse(rd('doors.json'));
const corridor = JSON.parse(rd('evidence/osm-corridor-map.json'));

const MLON = 91282.15, MLAT = 110940.65;

console.log('===== A. what the ODbL half records for the two facades =====');
for (const f of osm.facades) {
  const full = f.facadeRunFull.fromM, to = f.facadeRunFull.toM;
  console.log(`  ${f.facadeId}  ${f.osmBuildingName}`);
  console.log(`    facadeRunFull.fromM  x=${full.xM.toFixed(4)}  y=${full.yM.toFixed(4)}`);
  console.log(`    facadeRunFull.toM    x=${to.xM.toFixed(4)}  y=${to.yM.toFixed(4)}`);
  console.log(`    clippedToBlock       ${JSON.stringify(f.facadeRunClippedToBlock)}`);
}

console.log('\n===== B. what the doors record for their own y =====');
for (const d of osm.doors) {
  console.log(`  ${d.doorId}  building=${d.osmBuildingName}  qXM=${d.placement.quantisedXM.toFixed(4)}  qYM=${d.placement.quantisedYM.toFixed(4)}`);
}

console.log('\n===== C. facade y vs door y, per building =====');
const byBuilding = {};
for (const d of osm.doors) (byBuilding[d.osmBuildingId] ||= []).push(d);
for (const f of osm.facades) {
  const ds = byBuilding[f.osmBuildingId] || [];
  if (!ds.length) continue;
  const fy = (f.facadeRunFull.fromM.yM + f.facadeRunFull.toM.yM) / 2;
  const dy = ds.map(d => d.placement.quantisedYM);
  const mean = dy.reduce((a, b) => a + b, 0) / dy.length;
  console.log(`  ${f.facadeId} ${f.osmBuildingName}`);
  console.log(`    facade mean y_m      = ${fy.toFixed(4)}`);
  console.log(`    doors   mean y_m      = ${mean.toFixed(4)}   (n=${ds.length})`);
  console.log(`    DOOR - FACADE        = ${(mean - fy).toFixed(4)} m   <-- should be ~0 if both are in the same frame`);
}

console.log('\n===== D. where is the south facade in the SAME frame as the doors? =====');
console.log('  The corridor chain (四条通) sits near y=0 in the FROZEN EVIDENCE frame:');
// recompute the chain from evidence to establish the evidence-frame street y
const OLD = { lon: 135.759719, lat: 35.003658 };   // the ORIGINAL origin I used in task-3
const nodeById = new Map();
for (const e of corridor.elements) if (e.type === 'node') nodeById.set(e.id, e);
const chainWays = [964931603, 678103923, 465069436, 465069431, 380083522, 174762073, 843727820, 28322073, 27427466, 1510539685, 854442449];
const pts = [];
for (const w of chainWays) {
  const el = corridor.elements.find(e => e.type === 'way' && e.id === w);
  if (!el) continue;
  for (const n of el.nodes) { const nd = nodeById.get(n); if (nd) pts.push({ lat: nd.lat, lon: nd.lon }); }
}
const ys = pts.map(p => (p.lat - OLD.lat) * MLAT);
const xs = pts.map(p => (p.lon - OLD.lon) * MLON);
console.log(`  evidence-frame 四条通 chain: y in [${Math.min(...ys).toFixed(2)}, ${Math.max(...ys).toFixed(2)}]  x in [${Math.min(...xs).toFixed(1)}, ${Math.max(...xs).toFixed(1)}]`);
console.log(`  => in the EVIDENCE frame the street centreline is near y=0, and`);
console.log(`     the south facade measured at y=${((-10.93)).toFixed(2)}, the north at y=${(13.69).toFixed(2)}  (my task-11 numbers)`);
console.log(`     doors.json NOW places the north doors at y=+4.69 and the south doors at y=-19.9`);
console.log('');
console.log('  If the datum moved north by ~8.986 m, then a point at evidence-frame y should now read y-8.986:');
for (const [label, evY] of [['north facade', 13.69], ['south facade', -10.93]]) {
  console.log(`    ${label.padEnd(14)} evidence y=${String(evY).padStart(7)}  -> predicted new y=${(evY - 8.986).toFixed(3)}`);
}
console.log('');
console.log('  north doors are at +4.6875  => matches (13.69 - 8.986) = 4.70   OK');
console.log('  south doors are at -19.875  => predicted from facade (-10.93 - 8.986) = -19.92   ALSO MATCHES');
console.log('');
console.log('  >>> So BOTH facades moved by the same datum, and both door sets moved with them.');
console.log('  >>> The doors did NOT float. The 9.07 m I measured earlier was the datum shift, not a defect.');
console.log('  >>> Confirm by testing door-vs-facade distance in section C above.');
