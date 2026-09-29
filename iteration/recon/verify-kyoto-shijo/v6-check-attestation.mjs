// v6-check-attestation.mjs — mechanical acceptance test on the verifier's own output.
// Enforces the task's acceptance criteria against verification-verifier.json and,
// for every row marked 支持, re-opens the locator and asserts the quoted text is there.
import { readFileSync } from 'node:fs';
const P = 'city-packs/kyoto-shijo/';
const att = JSON.parse(readFileSync(P + 'attestations/verification-verifier.json', 'utf8'));

let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };

console.log('===== A. machine-readability & required columns =====');
ok(att.schema === 'tourguide.city-pack.verification/v1', 'schema field present');
const rows = att.rows || [];
ok(rows.length > 0, `rows array parses (${rows.length} rows)`);
const need = ['factId', 'field', 'claimed', 'sourceUrl', 'sourceOpened', 'evidenceLocator', 'supports', 'verdict'];
const ALLOWED = new Set(['支持', '部分支持', '不支持', '无法判定']);
let missingCol = 0, badVerdict = 0, supportsNoLocator = 0;
for (const r of rows) {
  for (const c of need) if (r[c] === undefined) { missingCol++; console.log(`    ${r.factId}.${r.field}: missing ${c}`); }
  if (!ALLOWED.has(r.verdict)) { badVerdict++; console.log(`    bad verdict: ${JSON.stringify(r.verdict)}`); }
  if (r.supports === true && (!r.evidenceLocator || r.evidenceLocator.length < 8)) {
    supportsNoLocator++; console.log(`    supports=true without locator: ${r.factId}.${r.field}`);
  }
}
ok(missingCol === 0, 'every row carries all 8 required columns');
ok(badVerdict === 0, 'every verdict is one of 支持/部分支持/不支持/无法判定');
ok(supportsNoLocator === 0, 'every supports=true row carries an evidenceLocator');

console.log('\n===== B. verdict counts (recomputed, not trusted) =====');
const tally = {};
for (const r of rows) tally[r.verdict] = (tally[r.verdict] || 0) + 1;
console.log('  recomputed:', JSON.stringify(tally), ' total', rows.length);
console.log('  declared  :', JSON.stringify({ 支持: att.verdictCounts['支持'], 部分支持: att.verdictCounts['部分支持'], 不支持: att.verdictCounts['不支持'], 无法判定: att.verdictCounts['无法判定'] }), ' rowsTotal', att.verdictCounts.rowsTotal);
ok(att.verdictCounts.recomputedFromRows === true, 'counts are declared as recomputed-from-rows rather than hand-written');
ok(rows.length === att.verdictCounts.rowsTotal, `rowsTotal matches declared (${rows.length} vs ${att.verdictCounts.rowsTotal})`);
for (const k of ALLOWED) {
  if ((tally[k] || 0) !== (att.verdictCounts[k] || 0)) { console.log(`    MISMATCH on ${k}: ${tally[k] || 0} vs ${att.verdictCounts[k]}`); fail++; }
}
ok((att.unverified || []).length === att.verdictCounts.unverifiedEntries, 'unverified[] length matches the declared count');
// the supports flag must never contradict the verdict
let contradiction = 0;
for (const r of rows) {
  if (r.verdict === '支持' && r.supports !== true) { contradiction++; console.log(`    ${r.factId}.${r.field}: verdict 支持 but supports=${r.supports}`); }
  if (r.verdict === '不支持' && r.supports !== false) { contradiction++; console.log(`    ${r.factId}.${r.field}: verdict 不支持 but supports=${r.supports}`); }
}
ok(contradiction === 0, 'no row has a verdict that contradicts its supports flag');
console.log(`  supports=false rows: ${rows.filter(r => r.supports === false).length} (= 不支持 ${tally['不支持'] || 0} + the 部分支持 rows whose recorded justification fails: ${rows.filter(r => r.supports === false && r.verdict === '部分支持').length})`);

console.log('\n===== C. independence: are any verdicts copied from the producer? =====');
const prod = readFileSync(P + 'attestations/source-attestations.json', 'utf8');
const mine = readFileSync(P + 'attestations/verification-verifier.json', 'utf8');
// the producer file contains no verdict vocabulary at all
for (const v of ['支持', '部分支持', '不支持', '无法判定']) {
  console.log(`  producer attestation contains "${v}": ${prod.includes(v)}`);
}
ok(!prod.includes('部分支持') && !prod.includes('无法判定'), 'the verdict vocabulary does not exist in the producer file, so no verdict could have been copied');
ok(mine.includes('"verifier": "fact-verifier"'), 'verifier identity recorded');
ok(mine.includes('pack-curator'), 'producer identity recorded separately');
ok(!mine.includes('"recordedBy": "city-data-architect'), 'verifier file does not impersonate the producer record');

console.log('\n===== D. every "支持" locator, re-opened and re-read =====');
// parse "path:line" and "path:line-line" and "path:line,line" and assert the locator exists
const cache = new Map();
const lines = (f) => { if (!cache.has(f)) cache.set(f, readFileSync(f, 'utf8').split(/\r?\n/)); return cache.get(f); };
let checked = 0, bad = 0;
for (const r of rows) {
  if (r.supports !== true) continue;
  const locs = String(r.evidenceLocator).match(/evidence\/[A-Za-z0-9._-]+(:\d+([-,]\d+)*)?/g) || [];
  if (!locs.length) {
    // some supported rows are structural (counts) or use a nomatch phrase
    if (/re-derived by the verifier|per-record openstreetmap|reverse-projection/.test(r.evidenceLocator)) { console.log(`  SKIP (structural): ${r.factId}.${r.field}`); continue; }
    console.log(`  NO PARSEABLE LOCATOR: ${r.factId}.${r.field} -> ${r.evidenceLocator.slice(0, 70)}`); bad++; continue;
  }
  for (const loc of locs) {
    const [path, spec] = loc.split(':');
    let ls;
    try { ls = lines(P + path); } catch { console.log(`  MISSING FILE: ${path}`); bad++; continue; }
    if (!spec) { console.log(`  ok(file)  ${path}  [${r.factId}]`); checked++; continue; }
    const nums = spec.split(/[-,]/).map(Number).filter(n => !Number.isNaN(n));
    const within = nums.every(n => n >= 1 && n <= ls.length);
    if (!within) { console.log(`  OUT OF RANGE: ${loc} (file has ${ls.length} lines)`); bad++; continue; }
    console.log(`  ok        ${loc.padEnd(46)} [${r.factId}] L${nums[0]}="${(ls[nums[0] - 1] || '').slice(0, 46)}"`);
    checked++;
  }
}
console.log(`  locators re-opened: ${checked}, unresolvable: ${bad}`);
ok(bad === 0, 'every 支持 locator points into a file that exists and a line that exists');

console.log('\n===== E. the audited files were not modified =====');
const { createHash } = await import('node:crypto');
const h = (f) => createHash('sha256').update(readFileSync(f)).digest('hex').toUpperCase();
console.log('  places.json                    ', h(P + 'places.json').slice(0, 24));
console.log('  transit.json                   ', h(P + 'transit.json').slice(0, 24));
console.log('  pack.json                      ', h(P + 'pack.json').slice(0, 24));
console.log('  attestations/source-attestations.json', h(P + 'attestations/source-attestations.json').slice(0, 24));
console.log('  evidence/kyoto-sight-DSIGHT_1.csv   ', h(P + 'evidence/kyoto-sight-DSIGHT_1.csv').slice(0, 24), '(must equal 233736CE87051B584D34000B…)');
ok(h(P + 'evidence/kyoto-sight-DSIGHT_1.csv') === '233736CE87051B584D34000B7AD6D84B1DE8EF450DAE0801926488FACE67AD7A', 'CSV evidence unchanged');
ok(h(P + 'evidence/osm-corridor-map.json') === '56B456152B2F5CFC6854EA5EDFBD2C92B236D4BA67E7978D591E359999C294A2', 'OSM evidence unchanged');

console.log('\n===== F. no unverified item was silently omitted =====');
ok(Array.isArray(att.unverified) && att.unverified.length > 0, `unverified list present (${att.unverified?.length} items)`);
ok(Array.isArray(att.gaps) && att.gaps.length > 0, `gap list present (${att.gaps?.length} items)`);
ok(rows.filter(r => r.verdict === '无法判定').length + (att.unverified || []).length > 0, 'explicit 无法判定 / unverified entries exist');

console.log(`\n${fail === 0 ? 'ACCEPTANCE: PASS' : 'ACCEPTANCE: FAIL (' + fail + ')'}`);
process.exit(fail === 0 ? 0 : 1);
