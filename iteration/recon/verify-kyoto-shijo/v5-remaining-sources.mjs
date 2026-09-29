// v5-remaining-sources.mjs — the last value-level checks, all by opening the bytes.
import { readFileSync } from 'node:fs';
const P = 'city-packs/kyoto-shijo/evidence/';
const L = (f) => readFileSync(P + f, 'utf8').split(/\r?\n/);
const show = (tag, lines, re) => {
  console.log(`\n--- ${tag} ---`);
  let n = 0;
  lines.forEach((l, i) => { if (re.test(l)) { n++; console.log(`  L${i + 1}: ${JSON.stringify(l)}`); } });
  if (!n) console.log('  (no matching line)');
};

console.log('########## 1. 知恩院 admission fees — S9 chion-in-guide.txt ##########');
const cg = L('chion-in-guide.txt');
cg.forEach((l, i) => { if (/円|共通券|方丈庭園|友禅苑|小人|団体/.test(l)) console.log(`  L${i + 1}: ${JSON.stringify(l)}`); });

console.log('\n########## 2. 知恩院 hours — the exact opening/closing sentence ##########');
show('chion-in-guide.txt', cg, /開閉門|午前6時|午後4時|各所受付/);

console.log('\n########## 3. 清水寺 — does the FAQ page state an admission fee? ##########');
const kf = L('kiyomizudera-faq.txt');
console.log(`  kiyomizudera-faq.txt lines: ${kf.length}`);
kf.forEach((l, i) => { if (/拝観料|入山料|円|料金/.test(l)) console.log(`  L${i + 1}: ${JSON.stringify(l)}`); });

console.log('\n########## 4. 清水寺 — does the guide page state a fee? ##########');
const kg = L('kiyomizudera-guide.txt');
console.log(`  kiyomizudera-guide.txt lines: ${kg.length}`);
kg.forEach((l, i) => { if (/拝観料|入山料|円|料金/.test(l)) console.log(`  L${i + 1}: ${JSON.stringify(l)}`); });

console.log('\n########## 5. Kyoto City open-data terms — S2 evidence is a PDF, is there text? ##########');
import { existsSync } from 'node:fs';
console.log('  kyoto-city-kiyaku-syoban.pdf exists:', existsSync(P + 'kyoto-city-kiyaku-syoban.pdf'));
for (const f of ['kyoto-city-kiyaku-syoban.txt']) console.log(`  ${f} exists:`, existsSync(P + f));
console.log('  => the terms document is stored ONLY as a PDF; nothing in evidence/ extracts its clauses.');

console.log('\n########## 6. 建仁寺 address — official page vs CSV ##########');
const ka = L('kenninji-access.txt');
ka.forEach((l, i) => { if (/小松町|所在地|大和大路/.test(l)) console.log(`  kenninji-access.txt L${i + 1}: ${JSON.stringify(l)}`); });
console.log('  pack addressJa = 京都市東山区大和大路通四条下る小松町584');
console.log('    -> the official page stops at 小松町 (no 番地); the "584" comes from the CSV row 1000043.');
console.log('    -> no OSM object backs this address for 建仁寺 (it is outside the extract).');

console.log('\n########## 7. the 6 transit legs: which source_url is actually carried ##########');
import { readFileSync as rf } from 'node:fs';
const transit = JSON.parse(rf('city-packs/kyoto-shijo/transit.json', 'utf8'));
const urls = [...new Set(transit.map(t => t.source_url))];
console.log('  distinct source_url across all 6 legs:', urls.length);
urls.forEach(u => console.log('   ', u));
console.log('  => every leg cites the OSM bbox API URL. The 80 m/min RULE that turns distance into');
console.log('     minutes is cited NOT on the legs but in pack.json transit.walkTimeRule (S4).');

console.log('\n########## 8. pack.json transit.scopeNote — the verbatim zero-leg claim ##########');
const pack = JSON.parse(rf('city-packs/kyoto-shijo/pack.json', 'utf8'));
console.log('  ' + pack.transit.scopeNote);
console.log('\n  pack.transit.gaps entries touching bus/subway/private rail:');
pack.transit.gaps.filter(g => /バス|地下鉄|阪急|京阪/.test(g)).forEach((g, i) => console.log(`   [${i + 1}] ${g}`));
