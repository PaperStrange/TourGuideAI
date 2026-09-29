// add-coordinate-twins.mjs — emit lat / lng as the decimal-degree twin of latUdeg / lngUdeg.
//
// WHY THIS EXISTS, AND WHY IT IS NOT A SECOND VALUE:
// Two frozen documents disagree about the field name.
//   iteration/design/contract-geo-pipeline.md §5: "フィールド名は lonUdeg / latUdeg の 1 組だけ。
//     故意に lonMicro 別名を提供しない" — one thing, one name, and floats never enter the fact layer.
//   docs/handOff/dsh-bundle-tourguide-2.5d/tools/validate-city-pack.mjs: checkCoord() reads
//     `p.lat` / `p.lng` as numbers and fails BAD_LAT / BAD_LNG when they are absent.
// Neither can be edited from here (the validator is another teammate's file; the contract is a
// frozen artifact), so the pack carries BOTH spellings of the SAME number, with the integer
// microdegree pair as the authoritative one. The decimal twin is a pure unit conversion of the
// stored integer — it cannot carry an independent value, and checkCoordinateTwins() in
// validate-city-pack-v2.mjs recomputes it and fails if the two ever diverge.
// This conflict is reported as contradiction C6 in pack.json and must be resolved by Lead.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');
const p = resolve(PACK, 'places.json');
const rows = JSON.parse(readFileSync(p, 'utf8'));

let twins = 0; let nulls = 0;
for (const r of rows) {
  if (Number.isInteger(r.latUdeg) && Number.isInteger(r.lngUdeg)) {
    r.lat = Number((r.latUdeg / 1e6).toFixed(6));
    r.lng = Number((r.lngUdeg / 1e6).toFixed(6));
    twins++;
  } else {
    // No coordinate exists in any source for this record. null says so; a number here
    // would be the invention this whole task exists to prevent.
    r.lat = null; r.lng = null; nulls++;
  }
}
writeFileSync(p, JSON.stringify(rows, null, 2) + '\n', 'utf8');
console.log(`places.json: ${twins} records got decimal twins, ${nulls} records carry null coordinates (named gaps)`);
