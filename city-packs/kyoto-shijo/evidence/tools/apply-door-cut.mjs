#!/usr/bin/env node
/**
 * apply-door-cut.mjs — sync the two pack files that name doors being removed by task-20.
 *
 * WHAT WENT STALE AND WHY IT MATTERS. `doors-author` cut the south side from 5 doors to 3. Two of
 * the records that name doors still listed the deleted pair, and validate-city-pack-v2.mjs check (G)
 * caught it as DOOR_COVERAGE:
 *
 *     places.json: doorId mismatch vs doors.json: missing [], unknown ["D-S2","D-S4"]
 *
 * WHICH THREE SURVIVE IS NOT A CURATION CHOICE AND IS NOT MADE HERE. `doors-author` established it,
 * and the reason is measured rather than aesthetic: of the ten ways to choose three of five, keeping
 * {D-S1, D-S3, D-S5} (cellX 19, 26, 33) is the only one with a minimum spacing of 7.27 m — every
 * other choice gives 3.63 m — and it is the only one that keeps both ends of the facade. This file
 * therefore reads the surviving set from doors.json rather than restating it, so the mapping cannot
 * disagree with the authority.
 *
 * TWO SOURCES, DELIBERATELY NOT MERGED INTO ONE. doors.json is authoritative for WHICH doors exist;
 * places.json is authoritative for WHICH BUILDING each door belongs to. Check (G) compares them, and
 * that comparison is only meaningful if the two are held independently. Copying one into the other
 * would convert a detectable disagreement into silent agreement.
 *
 * The building→side mapping IS stated here, because doors.json records no side field. That is a
 * curation statement, not a derivation, and it is stated once, explicitly, so a reviewer can
 * disagree with it.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');
const readJson = (p, f) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : f);

const doors = readJson(resolve(PACK, 'doors.json'), { doors: [] });
const allDoorIds = doors.doors.map((d) => d.doorId);

// The side split is ours; the membership is doors.json's. Order follows doors.json so the emitted
// list is in the authority's own order rather than whatever order we happened to type.
const SIDES = [
  { placeId: 'kyoto-shijo-bldg-mitsui', prefix: 'D-N', note: 'north side of 四条通' },
  { placeId: 'kyoto-shijo-bldg-daiya', prefix: 'D-S', note: 'south side of 四条通' },
];

const placesPath = resolve(PACK, 'places.json');
const places = readJson(placesPath, []);
const log = [];

for (const side of SIDES) {
  const p = places.find((x) => x.id === side.placeId);
  if (!p?.entrances) { log.push(`${side.placeId}: no entrances block, skipped`); continue; }
  const expected = allDoorIds.filter((d) => d.startsWith(side.prefix));
  const before = { doorIds: p.entrances.doorIds, blockDoors: p.entrances.blockDoors };
  p.entrances.doorIds = expected;
  p.entrances.blockDoors = expected.length;
  const changed = JSON.stringify(before.doorIds) !== JSON.stringify(expected) || before.blockDoors !== expected.length;
  log.push(changed
    ? `${side.placeId} (${side.note}): blockDoors ${before.blockDoors} -> ${expected.length}, doorIds ${JSON.stringify(before.doorIds)} -> ${JSON.stringify(expected)}`
    : `${side.placeId} (${side.note}): already in step at ${expected.length} doors`);
}
writeFileSync(placesPath, JSON.stringify(places, null, 2) + '\n', 'utf8');

console.log(`apply-door-cut: ${allDoorIds.length} doors in doors.json`);
for (const l of log) console.log('  ' + l);
console.log(`  side split is a curation statement (doors.json carries no side field); membership is read from doors.json, never restated.`);
