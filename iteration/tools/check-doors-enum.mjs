// Read-only check: does doors.json agree with the frozen enum, and does its prose
// match its own fields?
import { readFileSync } from 'node:fs';

const PACK = 'city-packs/kyoto-shijo';
const doors = JSON.parse(readFileSync(`${PACK}/doors.json`, 'utf8'));
const { VALUE_KINDS, GUIDE_VERIFIED_COLUMN_ALLOWED } = await import(
  new URL('../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', import.meta.url).href
);

const raw = readFileSync(`${PACK}/doors.json`, 'utf8');

console.log('authoritative enum      :', JSON.stringify(VALUE_KINDS));
console.log('authoritative allow-list:', JSON.stringify(GUIDE_VERIFIED_COLUMN_ALLOWED));

const mirror = doors.frozenConstants?.valueKinds;
console.log('mirror inside doors.json:', JSON.stringify(mirror));
const mirrorOk = JSON.stringify(mirror) === JSON.stringify(VALUE_KINDS);
console.log(`mirror agrees           : ${mirrorOk ? 'yes' : 'NO — drift'}`);

const kinds = [...new Set(doors.doors.map((d) => d.provenance?.valueKind))];
console.log('valueKind used on doors :', JSON.stringify(kinds));

// Does the prose already claim authored while the field says something else?
const proseAuthored = /authored/i.test(raw);
const fieldAuthored = kinds.includes('authored');
console.log(`prose mentions authored : ${proseAuthored}`);
console.log(`field says authored     : ${fieldAuthored}`);
console.log(`prose/field agree       : ${proseAuthored === fieldAuthored ? 'yes' : 'NO — the file contradicts itself'}`);

const allowed = doors.doors.filter((d) => GUIDE_VERIFIED_COLUMN_ALLOWED.includes(d.provenance?.valueKind));
console.log(`doors admitted to the guide's verified column: ${allowed.length} (must be 0 until someone reads a source)`);
console.log(`guideVerifiedColumnAllowed on doors: ${JSON.stringify([...new Set(doors.doors.map((d) => d.provenance?.guideVerifiedColumnAllowed))])} <- this is already right and must stay`);

console.log('');
console.log('summary.byValueKind     :', JSON.stringify(doors.summary?.byValueKind));
