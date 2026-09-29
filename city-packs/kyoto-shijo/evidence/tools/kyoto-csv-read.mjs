#!/usr/bin/env node
/**
 * kyoto-csv-read.mjs — read the Kyoto City open-data CSV as a *source document*.
 *
 * The CSV has NO header row (source: 京都市オープンデータ, resource 7052,
 * licensed CC-BY 4.0). The column numbers below are the ones the project already
 * documented in iteration/recon/review-source-japan.md §3.5, and every value this
 * tool prints is quoted from the file byte-for-byte — nothing is derived.
 *
 * Columns whose semantics are NOT confirmed are never indexed by name here.
 *
 * Usage:
 *   node kyoto-csv-read.mjs <csv> wards            -> rows whose address names a slice ward
 *   node kyoto-csv-read.mjs <csv> row <id>         -> one row by column 0
 *   node kyoto-csv-read.mjs <csv> stats            -> physical-subset coverage, recomputed
 */
import { readFileSync } from 'node:fs';

const [, , src, mode, arg] = process.argv;
if (!src || !mode) { console.error('usage: node kyoto-csv-read.mjs <csv> <wards|row|stats> [id]'); process.exit(2); }

// RFC4180-ish parse; the file is UTF-8 with a BOM, LF endings, no header.
function parseCsv(text) {
  const rows = []; let cur = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { cur.push(f); f = ''; }
    else if (c === '\n') { cur.push(f); rows.push(cur); cur = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f !== '' || cur.length) { cur.push(f); rows.push(cur); }
  return rows;
}

const raw = readFileSync(src, 'utf8').replace(/^\uFEFF/, '');
const rows = parseCsv(raw).filter((r) => r.length > 1);
const C = { id: 0, name: 8, nameKana: 9, alias: 10, desc: 12, zip: 15, addr: 17, tel: 18, open: 21, close: 23, closed: 25, hours: 26, fee: 27, photo: 29 };
const ne = (r, i) => String(r[i] ?? '').trim() !== '';

if (mode === 'wards') {
  const WARDS = ['中京区', '下京区', '東山区'];
  const hit = rows.filter((r) => WARDS.some((w) => String(r[C.addr] ?? '').includes(w)));
  console.log(`${hit.length} rows whose address names 中京区/下京区/東山区  (of ${rows.length} rows)`);
  for (const r of hit) {
    console.log('---');
    console.log(`col0  id      : ${r[C.id]}`);
    console.log(`col8  name    : ${r[C.name]}`);
    console.log(`col10 alias   : ${r[C.alias]}`);
    console.log(`col17 address : ${r[C.addr]}`);
    console.log(`col18 tel     : ${r[C.tel]}`);
    console.log(`col21/23 open : ${r[C.open]} / ${r[C.close]}`);
    console.log(`col25 closed  : ${JSON.stringify(r[C.closed])}`);
    console.log(`col26 hours   : ${JSON.stringify(r[C.hours])}`);
    console.log(`col27 fee     : ${JSON.stringify(r[C.fee])}`);
    console.log(`col12 desc    : ${String(r[C.desc]).slice(0, 220)}`);
  }
} else if (mode === 'row') {
  const r = rows.find((x) => x[C.id] === arg);
  if (!r) { console.error(`no row with col0 = ${arg}`); process.exit(1); }
  for (let i = 0; i < r.length; i++) console.log(`[${String(i).padStart(2)}] ${JSON.stringify(r[i])}`);
} else if (mode === 'stats') {
  const physical = rows.filter((r) => ne(r, C.zip) || ne(r, C.addr) || ne(r, C.tel));
  const len = physical.map((r) => String(r[C.desc]).length).sort((a, b) => a - b);
  const med = len[Math.floor(len.length / 2)];
  console.log(`rows                 ${rows.length}`);
  console.log(`physical (zip|addr|tel) ${physical.length}`);
  console.log(`description non-empty   ${physical.filter((r) => ne(r, C.desc)).length}/${physical.length}`);
  console.log(`description median chars ${med}`);
  const WARDS = ['中京区', '下京区', '東山区'];
  for (const w of WARDS) console.log(`  ${w}: ${physical.filter((r) => String(r[C.addr]).includes(w)).length} physical rows`);
} else { console.error(`unknown mode ${mode}`); process.exit(2); }
