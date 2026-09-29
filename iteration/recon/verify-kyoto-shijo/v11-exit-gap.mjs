// v11-exit-gap.mjs — is the "no entrance mapped here" a real-world absence or an OSM
// completeness gap? Compare the exits that ARE mapped around this station with the exits
// the public sources say exist at this specific building.
import { readFileSync, existsSync } from 'node:fs';
const P = 'city-packs/kyoto-shijo/';
const O = { lon: 135.759719, lat: 35.003658 };
const MLON = 91282.15, MLAT = 110940.65;
const XY = (lat, lon) => ({ x: (lon - O.lon) * MLON, y: (lat - O.lat) * MLAT });

const ev = ['evidence/osm-corridor-map.json', 'evidence/osm-corridor-os.json'];
console.log('===== every railway=subway_entrance node in the frozen evidence =====');
const all = [];
for (const f of ev) {
  if (!existsSync(P + f)) { console.log(`  ${f}: absent`); continue; }
  const j = JSON.parse(readFileSync(P + f, 'utf8'));
  const hits = j.elements.filter(e => e.type === 'node' && e.tags?.railway === 'subway_entrance');
  console.log(`  ${f}: ${hits.length} subway_entrance node(s), osm3s=${j.osm3s?.timestamp_osm_base ?? '-'}`);
  for (const h of hits) all.push({ f, id: h.id, ref: h.tags.ref ?? null, name: h.tags.name ?? null, ...XY(h.lat, h.lon) });
}
console.log('\n  node id        ref   x_m      y_m     name            evidence');
const refs = new Set();
for (const a of all.sort((p, q) => p.x - q.x)) {
  if (a.ref) refs.add(String(a.ref));
  console.log(`  ${String(a.id).padEnd(14)} ${String(a.ref ?? '-').padEnd(5)} ${a.x.toFixed(1).padStart(8)} ${a.y.toFixed(1).padStart(8)}   ${String(a.name ?? '-').padEnd(15)} ${a.f}`);
}
console.log(`\n  distinct ref numbers mapped anywhere in the extract: ${[...refs].sort((a, b) => a - b).join(', ') || '(none)'}`);
console.log(`  is ref "20" mapped?  ${refs.has('20') ? 'YES' : 'NO — not present in any frozen snapshot'}`);
console.log(`  is ref "19" mapped?  ${refs.has('19') ? 'YES' : 'NO'}`);
console.log(`  is ref "1"  mapped?  ${refs.has('1') ? 'YES' : 'NO'}`);

console.log('\n===== the block-0 bbox in lon/lat, for reference =====');
const x1 = O.lon + 40 / MLON, y0 = O.lat - 20 / MLAT, y1 = O.lat + 20 / MLAT;
console.log(`  lon ${O.lon}..${x1.toFixed(6)}   lat ${y0.toFixed(6)}..${y1.toFixed(6)}`);
console.log('\n===== which mapped exits fall inside the block bbox? =====');
const inb = all.filter(a => a.x >= 0 && a.x < 40 && a.y >= -20 && a.y < 20);
console.log(`  ${inb.length} of ${all.length}`);
for (const a of inb) console.log(`    node/${a.id} ref=${a.ref} x=${a.x.toFixed(1)} y=${a.y.toFixed(1)}`);

console.log('\n===== public sources that assert a named exit at this building =====');
console.log('  鎌倉シャツ 開店告知 (https://www.shirt.co.jp/news/info/2403_kyoto) states verbatim:');
console.log('    「阪急京都線【烏丸駅】、市営地下鉄烏丸線【四条駅】の両駅より直結となっており、');
console.log('      雨の日でも濡れることなくお越しいただけます。(20番出口)」');
console.log('  and gives the address 「四条通烏丸東入長刀鉾町8番 京都三井ビルディング1階」.');
console.log('  => exit 20 exists in reality, at this address, and is NOT in any frozen OSM snapshot.');
console.log('\n  office-navi 物件紹介 (京都三井ビル) states verbatim:');
console.log('    「ビルエントランス横に地下鉄の入り口がございます。」');
console.log('    「阪急烏丸線、地下鉄四条駅と地下道直結」');
console.log('  => a building entrance with an adjacent subway mouth on this block is asserted by a');
console.log('     property listing, but its POSITION is not given and it is not in OSM.');
