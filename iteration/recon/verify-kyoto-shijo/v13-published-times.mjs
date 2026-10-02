// v13-published-times.mjs — is there ANY operator-published walk time for the pair
// that the new leg L09 claims to cross-check against?
import { readFileSync } from 'node:fs';
const t = readFileSync('city-packs/kyoto-shijo/evidence/kiyomizudera-access-hours.txt', 'utf8').split(/\r?\n/);
console.log('=== every walk figure the Kiyomizu-dera operator page publishes, with its origin ===');
t.forEach((l, i) => { if (/徒歩/.test(l)) console.log(`  :${i + 1}  ${l.trim()}`); });

console.log('\n=== does 祇園 appear on that page at all? ===');
const g = [];
t.forEach((l, i) => { if (l.includes('祇園')) g.push(`  :${i + 1}  ${l.trim()}`); });
console.log(g.length ? g.join('\n') : '  (absent)');

console.log('\n=== is there any published "15 min" figure on that page? ===');
const fifteen = [];
t.forEach((l, i) => { if (/15\s*分/.test(l)) fifteen.push(`  :${i + 1}  ${l.trim()}`); });
console.log(fifteen.length ? fifteen.join('\n') : '  NONE — the page publishes 10 min (五条坂/清水道) and 25 min (清水五条駅); no 15.');

console.log('\n=== what L09 would be if the rule had been applied to a ROAD distance ===');
const M = 80;
for (const road of [1122.6, 1300, 1400, 1500, 1600]) {
  console.log(`  road distance ${road} m -> ceil(${road}/80) = ${Math.ceil(road / M)} min`);
}
console.log('  (1,122.6 m is the STRAIGHT LINE; the rule asks for 道路距離, which on this');
console.log('   route is longer. The verifier does NOT know the true road distance —');
console.log('   no route was measured and no route source was opened. That is the gap.)');
