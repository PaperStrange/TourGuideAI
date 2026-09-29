// Read-only check: does doors.json agree with the frozen enum, and does its prose
// match its own fields?
//
// REPOINTED after task-15. This script used to print `mirror inside doors.json` and
// `mirror agrees`, comparing a hand-written copy against the live enum. The copy no longer
// exists -- and its absence is the CORRECT state -- so every one of those two lines went
// from reporting health to reporting the opposite: `mirror inside doors.json: undefined`
// and `mirror agrees: NO - drift` on a file that is exactly right. Nothing runs this
// script, so nothing turned red; it would simply have misled the next reader.
//
// That is the same defect shape as the `unopenedUrls` pointer (D-18) and the five
// phantom workflows (D-07): a check that describes a repository that no longer exists.
// So the assertion is now inverted into what it should always have been: a mirror is a
// FAILURE, and the enum is read from where it lives.
import { readFileSync } from 'node:fs';

const PACK = 'city-packs/kyoto-shijo';
const doors = JSON.parse(readFileSync(`${PACK}/doors.json`, 'utf8'));
const raw = readFileSync(`${PACK}/doors.json`, 'utf8');
const { VALUE_KINDS, GUIDE_VERIFIED_COLUMN_ALLOWED } = await import(
  new URL('../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', import.meta.url).href
);

console.log('authoritative enum      :', JSON.stringify(VALUE_KINDS));
console.log('authoritative allow-list:', JSON.stringify(GUIDE_VERIFIED_COLUMN_ALLOWED));

// A copy is now the failure, not the thing being compared. Scan the whole file rather
// than one known key, so re-adding the mirror under a new name is still caught -- the
// same reason validate-doors.mjs V1 scans for key names instead of a path.
//
// BUT THE SCAN MUST BE TYPE-AWARE, and my first version was not. `guideVerifiedColumnAllowed`
// appears legitimately on every door as `provenance.guideVerifiedColumnAllowed: false` -- a
// per-record BOOLEAN CLAIM meaning "this door is not admitted to the verified column", which
// is a different thing from the contract's allow-LIST. Matching on the key name alone
// reported a clean file as broken. doors-author hit the identical trap in V1 and fixed it the
// same way: an array here is a mirror, a boolean under provenance is a claim.
//
// So the enum-mirror scan is confined to the region where a contract copy would live, and
// the per-record claim is checked as a claim.
const MIRROR_KEYS = ['valueKinds', 'guideVerifiedColumnAllowed', 'ORIGIN', 'PROJECTION', 'worldGrid', 'GRID'];
const mirroredInFrozen = doors.frozenConstants
  ? MIRROR_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(doors.frozenConstants, k))
  : [];
// Independently, a mirror could be re-added at top level rather than under frozenConstants.
const mirroredAtTopLevel = MIRROR_KEYS.filter(
  (k) => Object.prototype.hasOwnProperty.call(doors, k) && JSON.stringify(doors[k]) === JSON.stringify(VALUE_KINDS),
);
const mirrored = [...new Set([...mirroredInFrozen, ...mirroredAtTopLevel])];
console.log('no enum is stored here  :', mirrored.length === 0 ? 'correct - the enum is imported, not copied' : `NO - mirror keys present: ${JSON.stringify(mirrored)}`);
if (doors.frozenConstants) {
  const keys = Object.keys(doors.frozenConstants);
  console.log('frozenConstants keys    :', JSON.stringify(keys));
  if (mirroredInFrozen.length) console.log('  <- these are copies and must not exist:', JSON.stringify(mirroredInFrozen));
  const ptr = doors.frozenConstants.mustImport;
  console.log(`pointer to the truth    : ${ptr ?? '(missing)'} ${ptr ? '' : '<- mustImport is required'}`);
}
console.log(`the enum is followed automatically, so this file cannot be wrong about the LIST (${VALUE_KINDS.length} members)`);

const kinds = [...new Set(doors.doors.map((d) => d.provenance?.valueKind))];
console.log('valueKind used on doors :', JSON.stringify(kinds));

// Does the prose already claim authored while the field says something else?
const proseAuthored = /authored/i.test(raw);
const fieldAuthored = kinds.includes('authored');
console.log(`prose mentions authored : ${proseAuthored}`);
console.log(`field says authored     : ${fieldAuthored}`);
console.log(`prose/field agree       : ${proseAuthored === fieldAuthored ? 'yes' : 'NO - the file contradicts itself'}`);

const allowed = doors.doors.filter((d) => GUIDE_VERIFIED_COLUMN_ALLOWED.includes(d.provenance?.valueKind));
console.log(`doors admitted to the guide's verified column: ${allowed.length} (must be 0 until someone reads a source)`);
console.log(`guideVerifiedColumnAllowed on doors: ${JSON.stringify([...new Set(doors.doors.map((d) => d.provenance?.guideVerifiedColumnAllowed))])} <- a per-record boolean CLAIM, not a copy of the allow-list`);

// Every declared kind must exist in the live enum. This is the half that still works when
// the copy is gone: without it, "we removed the mirror" would also mean "we removed the
// ability to notice an incompatible kind".
const unknown = kinds.filter((k) => !VALUE_KINDS.includes(k));
console.log(`every declared kind is in the live enum: ${unknown.length === 0 ? 'yes' : `NO - unknown: ${JSON.stringify(unknown)}`}`);

console.log('');
console.log('summary.byValueKind     :', JSON.stringify(doors.summary?.byValueKind));
