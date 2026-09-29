// Decisive measurement for the rendering-route decision (ui-designer §7):
//   (i)  of street-fronting building footprints in the Kyoto 四条烏丸→祇園 slice,
//        how many carry a usable `building:levels`?
//   (ii) how many OSM `entrance` nodes exist at all (door-derivability ceiling)?
//
// Data: Overpass API (ODbL). Licence: OSM ODbL — attribution required, and the
// result must NOT be redistributed as a derived database without the same licence.
//
// Usage: node measure-kyoto-blocks.mjs [--out file.json]
import { writeFileSync } from 'node:fs';

// 四条烏丸 (35.0038, 135.7596) → 四条河原町 (35.0038, 135.7687) → 祇園 (35.0037, 135.7782)
// Corridor: axis ±60 m so both sides of the street are captured.
const S = 35.0030, N = 35.0046;      // ~±45 m in latitude
const W = 135.7590, E = 135.7788;

const Q = `
[out:json][timeout:120];
(
  way["building"](${S},${W},${N},${E});
  node["entrance"](${S},${W},${N},${E});
  node["shop"](${S},${W},${N},${E});
);
out tags center;
`;

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function run() {
  let json, used;
  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(Q),
      });
      if (!res.ok) { console.log(`  ${ep} -> HTTP ${res.status}`); continue; }
      json = await res.json();
      used = ep;
      break;
    } catch (e) { console.log(`  ${ep} -> ${e.message}`); }
  }
  if (!json) { console.error('all endpoints failed'); process.exit(1); }

  const els = json.elements || [];
  const buildings = els.filter((e) => e.type === 'way' && e.tags && e.tags.building);
  const entrances = els.filter((e) => e.type === 'node' && e.tags && e.tags.entrance);
  const shops = els.filter((e) => e.type === 'node' && e.tags && e.tags.shop);

  const withLevels = buildings.filter((b) => /^\d+$/.test(String(b.tags['building:levels'] || '')));
  const withHeight = buildings.filter((b) => /^\d+(\.\d+)?$/.test(String(b.tags.height || '')));

  // Level distribution (what the "2-band default" would actually hide)
  const dist = {};
  for (const b of withLevels) {
    const n = Number(b.tags['building:levels']);
    dist[n] = (dist[n] || 0) + 1;
  }

  console.log(`Overpass endpoint: ${used}`);
  console.log(`bbox: lat ${S}..${N}, lng ${W}..${E}  (~2 km of 四条通, ±45 m)`);
  console.log(`generator: ${json.generator || '-'}\n`);

  console.log('── (i) building footprints ──────────────────────────────');
  console.log(`  building ways            : ${buildings.length}`);
  const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) + '%' : 'n/a');
  console.log(`  with building:levels     : ${withLevels.length}  (${pct(withLevels.length, buildings.length)})`);
  console.log(`  with height              : ${withHeight.length}  (${pct(withHeight.length, buildings.length)})`);
  console.log(`  with neither             : ${buildings.length - withLevels.length - withHeight.length}`);

  console.log('\n  levels distribution (levels -> count):');
  for (const k of Object.keys(dist).sort((a, b) => a - b)) {
    console.log(`      ${String(k).padStart(2)} -> ${dist[k]}`);
  }

  console.log('\n── (ii) doors: OSM entrance nodes ───────────────────────');
  console.log(`  entrance nodes in slice  : ${entrances.length}`);
  console.log(`  shop nodes in slice      : ${shops.length}`);
  for (const e of entrances.slice(0, 12)) {
    console.log(`      entrance=${e.tags.entrance}${e.tags.name ? '  ' + e.tags.name : ''}`);
  }

  console.log('\n── verdict against the ui-designer threshold ────────────');
  const cov = buildings.length ? withLevels.length / buildings.length : 0;
  const need = 0.70;
  console.log(`  threshold (i) >= 70%     : ${(cov * 100).toFixed(1)}%  -> ${cov >= need ? 'PASS: 2-band default stays an edge case' : 'FAIL: 2-band default would be the norm'}`);
  console.log(`  threshold (ii) doors     : ${entrances.length} entrance nodes vs ~100 shopfronts`);
  console.log(`      -> doors are ${entrances.length === 0 ? 'NOT derivable at all from OSM here' : 'sparsely mappable; authoring still required'}`);

  const note = {
    query: Q.trim(), endpoint: used, bbox: { S, N, W, E },
    counts: {
      buildings: buildings.length, withLevels: withLevels.length,
      withHeight: withHeight.length, entrances: entrances.length, shops: shops.length,
    },
    levelsDistribution: dist,
    fetchedAt: new Date().toISOString(),
    licence: 'OpenStreetMap contributors, ODbL 1.0',
  };
  const outIdx = process.argv.indexOf('--out');
  if (outIdx > 0 && process.argv[outIdx + 1]) {
    writeFileSync(process.argv[outIdx + 1], JSON.stringify(note, null, 2), 'utf8');
    console.log(`\n  wrote ${process.argv[outIdx + 1]}`);
  }
}
run();
