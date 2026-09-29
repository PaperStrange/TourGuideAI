// Correct the two stale fields in the origin measurement record.
//
// Why this is a patch and not a re-run: freeze-origin.mjs used to hardcode
// wTiles=2000, so it wrote `frozenWTiles: 2000 / marginM: -404.95` into a record
// whose measured values were already right. The tool now reads wTiles from the
// authoritative world-grid.mjs, but Overpass is returning 504 on the full-corridor
// bbox, so the record cannot be regenerated right now. Correcting the two derived
// fields from the contract constant is exactly equivalent, and the measured fields
// are left untouched.
//
// Only these keys change:  frozenWTiles -> wTiles, marginM recomputed.
// Everything else (origin, eastEnd, measuredSpanM, counts, coefficients) is preserved.
import { readFileSync, writeFileSync } from 'node:fs';

const RECORD = 'docs/handOff/archive/corpora/geo-japan/kyoto-slice-origin-candidate.json';
const { worldGrid } = await import(new URL('../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', import.meta.url).href);

const j = JSON.parse(readFileSync(RECORD, 'utf8'));
const before = JSON.stringify(j.corridor);
const span = j.corridor.measuredSpanM;

if (!Number.isFinite(span)) { console.error('measuredSpanM missing — refusing to patch'); process.exit(20); }

delete j.corridor.frozenWTiles;
j.corridor.wTiles = worldGrid.wTiles;
j.corridor.marginM = Number((span - worldGrid.wTiles).toFixed(2));
j.corridor.note = 'wTiles read from the frozen contract, not hardcoded here; marginM = measuredSpanM - wTiles';

writeFileSync(RECORD, JSON.stringify(j, null, 2), 'utf8');
console.log(`corridor before : ${before}`);
console.log(`corridor after  : ${JSON.stringify(j.corridor)}`);
console.log(`\ncontract says wTiles = ${worldGrid.wTiles}; measured span = ${span} m; margin = ${j.corridor.marginM} m`);
console.log(`origin untouched: ${j.derivedOrigin.lonUdeg}, ${j.derivedOrigin.latUdeg}  (way ${j.derivedOrigin.osmWayId})`);
console.log('');
console.log('TWO DIFFERENT GAPS — do not conflate them:');
console.log(`  road geometry vs the GRID east edge : ${Math.abs(j.corridor.marginM).toFixed(2)} m short (this field)`);
console.log('  road geometry vs 祇園交差点          : 91.92 m, frozen in the contract as GAP_M and asserted by A14.');
console.log('  The first is a rounding of the grid to 1600 m. The second is a real gap in the');
console.log('  road data and is the one that must never drift. A margin near -5 m is EXPECTED,');
console.log('  not a defect: wTiles was rounded up from 1595.05 to a multiple of 16.');
if (Math.abs(j.corridor.marginM) > 20) {
  console.log('\nWARNING: margin exceeds 20 m — the span and the constant disagree materially.');
  process.exit(21);
}
console.log('\nOK — the record is consistent with the contract.');
