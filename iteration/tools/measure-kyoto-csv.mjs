// The Kyoto CSV mixes entry TYPES. Measuring raw column coverage is misleading:
// "狂言" (a theatrical form) and "淀" (a place name) can never have opening hours.
// The usable question is coverage WITHIN the subset that should have the field.
import { readFileSync } from 'node:fs';

const raw = readFileSync(process.argv[2] ?? 'iteration/recon/_fetch-japan/kyoto-sight.csv', 'utf8');
const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '');
function parse(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
}
const rows = lines.slice(1).map(parse);
const C = { id: 0, name: 8, desc: 12, zip: 15, addr: 17, tel: 18, open: 21, close: 23, closed: 25, hours: 26, fee: 27, photo: 29 };
const nonEmpty = (r, i) => String(r[i] ?? '').trim() !== '';

// An entry is PHYSICAL if it carries a zip, an address, or a phone — the markers of
// a place you can stand in front of. Everything else is a concept, an event, a
// craft, or a historical name.
const physical = rows.filter((r) => nonEmpty(r, C.zip) || nonEmpty(r, C.addr) || nonEmpty(r, C.tel));
const concept = rows.filter((r) => !(nonEmpty(r, C.zip) || nonEmpty(r, C.addr) || nonEmpty(r, C.tel)));
const pct = (n, d) => (d ? ((100 * n) / d).toFixed(0) : '0') + '%';

console.log(`total rows      ${rows.length}`);
console.log(`  physical      ${physical.length}  ${pct(physical.length, rows.length)}   (has zip | addr | tel)`);
console.log(`  concept/other ${concept.length}  ${pct(concept.length, rows.length)}   (has none of them)`);

const cover = (set, i) => `${set.filter((r) => nonEmpty(r, i)).length}/${set.length} ${pct(set.filter((r) => nonEmpty(r, i)).length, set.length)}`;
console.log('\ncoverage WITHIN the physical subset (the rows a guide could send someone to):');
console.log(`  description   ${cover(physical, C.desc)}`);
console.log(`  zip           ${cover(physical, C.zip)}`);
console.log(`  address       ${cover(physical, C.addr)}`);
console.log(`  phone         ${cover(physical, C.tel)}`);
console.log(`  open clock    ${cover(physical, C.open)}`);
console.log(`  close clock   ${cover(physical, C.close)}`);
console.log(`  closed days   ${cover(physical, C.closed)}`);
console.log(`  hours text    ${cover(physical, C.hours)}`);
console.log(`  fee text      ${cover(physical, C.fee)}`);
console.log(`  photo ref     ${cover(physical, C.photo)}`);

console.log('\ncoverage WITHIN the concept subset (for contrast):');
console.log(`  description   ${cover(concept, C.desc)}`);
console.log(`  address       ${cover(concept, C.addr)}`);

// Does the physical subset actually reach the slice? 四条烏丸 -> 祇園 sits in
// 中京区 / 下京区 / 東山区. The addr column is free text, so match on ward name.
const WARDS = ['中京区', '下京区', '東山区'];
console.log('\nslice relevance — physical rows whose address names a ward the slice crosses:');
for (const w of WARDS) {
  const hit = physical.filter((r) => String(r[C.addr] ?? '').includes(w));
  console.log(`  ${w}  ${hit.length} rows`);
  for (const r of hit.slice(0, 5)) console.log(`      ${String(r[C.name]).slice(0, 34)}  |  ${String(r[C.addr]).slice(0, 30)}`);
}
const inSlice = physical.filter((r) => WARDS.some((w) => String(r[C.addr] ?? '').includes(w)));
console.log(`\n  total physical rows in the three slice wards: ${inSlice.length}`);
console.log(`  of those, with hours text : ${inSlice.filter((r) => nonEmpty(r, C.hours)).length}`);
console.log(`  of those, with fee text   : ${inSlice.filter((r) => nonEmpty(r, C.fee)).length}`);
console.log(`  of those, with open/close : ${inSlice.filter((r) => nonEmpty(r, C.open) && nonEmpty(r, C.close)).length}`);
