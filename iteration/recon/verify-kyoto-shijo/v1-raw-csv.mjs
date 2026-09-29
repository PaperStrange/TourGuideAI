// v1-raw-csv.mjs — INDEPENDENT reading of evidence/kyoto-sight-DSIGHT_1.csv
// Written by fact-verifier. Imports nothing from the producer. No network.
// Purpose: test the curator's claims 1 (清水寺 admission) and 3 (八坂神社 2016 date)
// directly against the raw CSV bytes, with its OWN RFC4180 parser and its OWN
// line-number accounting, so the producer's line citations are not taken on trust.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const CSV = 'city-packs/kyoto-shijo/evidence/kyoto-sight-DSIGHT_1.csv';
const raw = readFileSync(CSV);                       // raw bytes, no transcoding
const sha = createHash('sha256').update(raw).digest('hex').toUpperCase();
const text = raw.toString('utf8');

// ---- my own RFC4180-ish parser: tracks the physical 1-based line where each
// ---- record STARTS, and counts fields per record. No dependency on any producer tool.
function parseCsv(t) {
  const rows = [];
  let field = '', rec = [], inQ = false;
  let line = 1, recStartLine = 1;
  const push = () => { rec.push(field); field = ''; };
  const endRec = () => {
    push();
    rows.push({ line: recStartLine, fields: rec });
    rec = [];
    recStartLine = line;
  };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else {
        if (c === '\n') line++;      // newline inside a quoted field still advances the physical line
        field += c;
      }
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') push();
      else if (c === '\r') { /* swallow CR of CRLF */ }
      else if (c === '\n') { line++; endRec(); recStartLine = line; }
      else field += c;
    }
  }
  if (field !== '' || rec.length) endRec();
  return rows.filter(r => !(r.fields.length === 1 && r.fields[0] === ''));
}

const rows = parseCsv(text);
const byId = new Map();
for (const r of rows) byId.set(r.fields[0], r);

console.log('=== v1 RAW CSV — fact-verifier independent read ===');
console.log('file        :', CSV);
console.log('sha256      :', sha);
console.log('bytes       :', raw.length);
console.log('records     :', rows.length);
console.log('header row  :', rows[0].fields[0] === '1000001' ? 'NONE (first record is data id 1000001)' : 'PRESENT?');
console.log('cols in rec1:', rows[0].fields.length);
const colCounts = {};
for (const r of rows) colCounts[r.fields.length] = (colCounts[r.fields.length] || 0) + 1;
console.log('col-count distribution:', JSON.stringify(colCounts));

function show(id, cols) {
  const r = byId.get(id);
  if (!r) { console.log(`\n[id ${id}] *** NOT FOUND ***`); return; }
  console.log(`\n--- id ${id}  (starts at physical CSV line ${r.line}, ${r.fields.length} fields) ---`);
  for (const c of cols) console.log(`  col${String(c).padStart(2)} = ${JSON.stringify(r.fields[c])}`);
}

console.log('\n############ CLAIM 1 — 清水寺 admission belongs to a different subject row ############');
show('1000004', [0, 8, 10, 17, 21, 23, 25, 26, 27]);   // 清水寺 本堂
show('1000008', [0, 8, 10, 17, 21, 23, 25, 26, 27]);   // 清水寺 狛犬 — claimed home of the 400円
show('1000001', [0, 8, 27]);                            // 北野天満宮 本殿 (first record)
// Independent hunt: every row in the whole CSV whose col27 mentions 本堂 or 舞台
console.log('\n--- every row whose col27 (fee) mentions 本堂 or 舞台 ---');
let hits = 0;
for (const r of rows) {
  const f = r.fields[27] || '';
  if (f.includes('本堂') || f.includes('舞台')) {
    hits++;
    console.log(`  id ${r.fields[0]} line ${r.line} name=${JSON.stringify(r.fields[8])} col27=${JSON.stringify(f)}`);
  }
}
if (!hits) console.log('  (none)');
console.log('\n--- every row whose col8 (name) mentions 清水寺 ---');
for (const r of rows) {
  const f = r.fields[8] || '';
  if (f.includes('清水寺')) console.log(`  id ${r.fields[0]} line ${r.line} name=${JSON.stringify(f)} col27=${JSON.stringify(r.fields[27] || '')}`);
}

console.log('\n############ CLAIM 3 — 八坂神社 本殿 CSV date is 平成28年 (2016) ############');
show('1000040', [0, 8, 17, 21, 23, 25, 26, 27]);
const r40 = byId.get('1000040');
if (r40) {
  const fee = r40.fields[27] || '';
  console.log('\n  raw col27 begins with:', JSON.stringify(fee.slice(0, 8)));
  console.log('  contains "28年"        :', fee.includes('28年'));
  console.log('  contains "平成"        :', fee.includes('平成'));
  console.log('  contains "令和"        :', fee.includes('令和'));
  console.log('  contains "平成28年"    :', fee.includes('平成28年'));
  // What is the newest year-like token anywhere in the whole row?
  const years = (r40.fields.join(' | ').match(/(平成|令和|昭和)?\s?\d{1,2}年/g) || []);
  console.log('  every year-like token in the entire row:', JSON.stringify(years));
}[]

console.log('\n############ CLAIM 2 support — 建仁寺 CSV fee ############');
show('1000043', [0, 8, 17, 21, 23, 25, 26, 27]);

console.log('\n############ the three ungeoreferenced temples: addresses in CSV ############');
show('1000015', [0, 8, 17]);
show('1000016', [0, 8, 17]);
// Independent search: does ANY column of ANY row carry a coordinate for these temples?
console.log('\n--- hunting for any coordinate-shaped token in the CSV (lat-ish 34/35, lng-ish 135) ---');
const coordRe = /(3[45]\.\d{3,}|13[5-6]\.\d{3,})/g;
const cHits = new Set();
let coordRows = 0;
for (const r of rows) {
  const joined = r.fields.join(',');
  const m = joined.match(coordRe);
  if (m) { coordRows++; for (const x of m) cHits.add(x); if (coordRows <= 5) console.log(`  id ${r.fields[0]} line ${r.line} name=${JSON.stringify(r.fields[8])} tokens=${JSON.stringify(m)}`); }
}
console.log(`  rows containing a coordinate-shaped token: ${coordRows} of ${rows.length}`);
console.log(`  distinct coordinate-shaped tokens: ${cHits.size}`);
console.log('  sample:', JSON.stringify([...cHits].slice(0, 20)));
if (coordRows === 0) console.log('  => the CSV carries NO coordinate at all; a coordinate for the 3 temples cannot come from here.');
