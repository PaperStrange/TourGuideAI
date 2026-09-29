#!/usr/bin/env node
/**
 * check-build-lossless.mjs — the regression guard for the data-loss defect.
 *
 * WHAT WENT WRONG, AND WHY A COMMENT IS NOT ENOUGH. In task-10 a build step recomputed its own
 * input ("which rows need parking?") from an already-cleaned fact table, got an empty list, and
 * overwrote its previous output with it. Three sourced temple records and two transit legs were
 * destroyed, and nothing failed — the build was green. The step was `ungeoreferenced-to-pack.mjs`;
 * its replacement, `extract-nonfact-rows.mjs`, uses union-by-id semantics instead of recompute-and-
 * overwrite, and `apply-f2-corrections.mjs` now owns the record contents.
 *
 * But "the new step is written correctly" is exactly the kind of claim that decays: someone edits
 * the union back into an assignment, the build stays green, and a record disappears. So the
 * guarantee is checked here rather than asserted in a comment.
 *
 * WHAT IT CHECKS. Two independent things a build must never do:
 *   1. MONOTONICITY — the set of (place id, leg id) in the pack never shrinks across a build.
 *      A record may be corrected or moved, but the identity set may not silently lose a member.
 *      Canonical ids for the three temples and the two legs are pinned explicitly, because those
 *      are the exact records this defect once ate.
 *   2. NO EMPTY-OUTPUT OVERWRITE — a parked payload (attestations/ungeoreferenced-places.json,
 *      attestations/dropped-legs.json) may not go from non-empty to empty. That is the precise
 *      signature of the original bug: it did not corrupt a record, it replaced a list with [].
 *
 * Usage:
 *   node check-build-lossless.mjs --snapshot <file>   write the before-state
 *   node check-build-lossless.mjs --verify   <file>   assert the after-state lost nothing
 * Exit 0 = lossless, 1 = a record or payload disappeared.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');
const readJson = (p, f) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : f);

// THE PINNED SET. These five are the records the original defect destroyed. They are listed by id
// so that removing one is a deliberate edit to this file rather than a side effect of a build.
const MUST_EXIST = {
  places: ['kyoto-shijo-chion-in', 'kyoto-shijo-kiyomizu-dera', 'kyoto-shijo-kennin-ji'],
  legs: ['L07', 'L08'],
};

function state() {
  const places = readJson(resolve(PACK, 'places.json'), []);
  const transit = readJson(resolve(PACK, 'transit.json'), []);
  const ungeo = readJson(resolve(PACK, 'attestations', 'ungeoreferenced-places.json'), { places: [] });
  const dropped = readJson(resolve(PACK, 'attestations', 'dropped-legs.json'), { legs: [] });
  const pack = readJson(resolve(PACK, 'pack.json'), {});
  return {
    placeIds: places.map((p) => p.id).sort(),
    legIds: transit.map((l) => l.id).sort(),
    parkedPlaceIds: (ungeo.places ?? []).map((p) => p.id).sort(),
    parkedLegIds: (dropped.legs ?? []).map((l) => l.id).sort(),
    // substance counts, so a record that survives as a husk is still caught
    hoursEntries: places.reduce((n, p) => n + (p.hours?.length ?? 0), 0),
    admissionItems: places.reduce((n, p) => n + (p.admission?.items?.length ?? 0), 0),
    packUngeorefCount: (pack.ungeoreferencedPlaces ?? []).length,
    packDroppedLegCount: (pack.ungeoreferencedLegs ?? []).length,
    // Gap-list shapes. A build must not shrink these silently (loss) AND must not grow them with
    // duplicates (accumulation). Only the loss direction was checked at first, which missed a real
    // defect: apply-f3-corrections appended the same gap entry on every run until `gapsResolved`
    // held four copies of one item. Accumulation is the same family as the payload that got
    // overwritten with [] — a build whose output changes on every run is not reproducible.
    gapCounts: {
      placeGaps: (pack.placeGaps ?? []).length,
      placeGapsResolved: (pack.placeGapsResolved ?? []).length,
      placeGapNotes: (pack.placeGapNotes ?? []).length,
      transitGaps: (pack.transit?.gaps ?? []).length,
    },
    gapDuplicates: (() => {
      const lists = {
        placeGaps: pack.placeGaps ?? [],
        placeGapsResolved: pack.placeGapsResolved ?? [],
        placeGapNotes: pack.placeGapNotes ?? [],
        transitGaps: pack.transit?.gaps ?? [],
      };
      const dupes = {};
      for (const [name, list] of Object.entries(lists)) {
        const seen = new Set(); const dup = [];
        for (const g of list) { const k = typeof g === 'string' ? g : g?.key ?? g?.gap; if (seen.has(k)) dup.push(k); else seen.add(k); }
        if (dup.length) dupes[name] = dup.length;
      }
      return dupes;
    })(),
  };
}

const mode = process.argv[2];
const file = process.argv[3];
if (!mode || !file) { console.error('usage: node check-build-lossless.mjs <--snapshot|--verify> <file>'); process.exit(2); }

if (mode === '--snapshot') {
  const s = state();
  writeFileSync(file, JSON.stringify(s, null, 2) + '\n', 'utf8');
  console.log(`lossless snapshot: ${s.placeIds.length} places, ${s.legIds.length} legs, ${s.parkedPlaceIds.length} parked places, ${s.parkedLegIds.length} parked legs`);
  process.exit(0);
}

const before = readJson(file, null);
if (!before) { console.error(`verify: no snapshot at ${file}`); process.exit(2); }
const after = state();
const problems = [];

// 1. identity sets must not shrink, wherever a record lives
for (const [key, label] of [['placeIds', 'places.json'], ['legIds', 'transit.json'], ['parkedPlaceIds', 'attestations/ungeoreferenced-places.json'], ['parkedLegIds', 'attestations/dropped-legs.json']]) {
  const lost = before[key].filter((id) => !after[key].includes(id));
  // A record may MOVE between the fact table and the parked set, but it may not vanish from both.
  const gone = lost.filter((id) => ![...after.placeIds, ...after.legIds, ...after.parkedPlaceIds, ...after.parkedLegIds].includes(id));
  if (gone.length) problems.push(`${label}: ${gone.length} record(s) vanished entirely: ${gone.join(', ')}`);
}
// the same record may not be counted in both the fact table and the parked set
const both = after.placeIds.filter((id) => after.parkedPlaceIds.includes(id));
if (both.length) problems.push(`records present in BOTH places.json and the parked set (double-counted): ${both.join(', ')}`);

// 2. the exact records the original defect ate
for (const id of MUST_EXIST.places) {
  if (![...after.placeIds, ...after.parkedPlaceIds].includes(id)) problems.push(`pinned place ${id} is gone from both the fact table and the parked set`);
}
for (const id of MUST_EXIST.legs) {
  if (![...after.legIds, ...after.parkedLegIds].includes(id)) problems.push(`pinned leg ${id} is gone from both the fact table and the parked set`);
}

// 3. the empty-overwrite signature
if (before.parkedPlaceIds.length > 0 && after.parkedPlaceIds.length === 0 && before.placeIds.length === after.placeIds.length) {
  problems.push('the parked-place payload went non-empty -> empty without the records appearing in places.json: this is the exact signature of the original data-loss bug');
}

// 4. substance must not silently drain out of records that remain
for (const k of ['hoursEntries', 'admissionItems']) {
  if (after[k] < before[k]) problems.push(`${k} fell from ${before[k]} to ${after[k]} — a record kept its id but lost its facts`);
}

// 5. gap lists must not accumulate duplicates
for (const [name, n] of Object.entries(after.gapDuplicates ?? {})) {
  problems.push(`${name} contains ${n} duplicate entr${n === 1 ? 'y' : 'ies'}: a build that appends on every run is not reproducible`);
}

if (problems.length) {
  console.error(`FAIL  build is LOSSY — ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  console.error('\n  A build may correct or move a record. It may not lose one silently.');
  process.exit(1);
}
console.log(`PASS  build is lossless: ${after.placeIds.length} places (${before.placeIds.length} before), ${after.legIds.length} legs (${before.legIds.length} before), 0 records lost, no payload emptied, no facts drained`);
