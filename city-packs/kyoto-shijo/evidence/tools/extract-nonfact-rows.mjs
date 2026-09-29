#!/usr/bin/env node
/**
 * extract-nonfact-rows.mjs — pull the rows that are NOT fact records out of the two fact
 * tables and park them in evidence/tools/, so places.json/transit.json stay bare arrays.
 *
 * Replaces ungeoreferenced-to-pack.mjs + drop-dangling-legs.mjs, which were DESTRUCTIVE on a
 * second run: they recomputed "rows to move" from an already-cleaned fact table, got an empty
 * list, and overwrote the parked payload with it. That destroyed three sourced temple records
 * and two sourced transit legs. A build step that loses data when re-run is not a build step.
 *
 * Two rules now make it safe:
 *   IDEMPOTENT — each run recomputes the fact tables' own contents, then UNIONs with whatever is
 *                already parked (keyed by id). Re-running cannot drop a record.
 *   REPORTABLE — it prints how many rows were newly parked vs already parked, so a regression
 *                in the fact tables cannot silently shrink the parked set.
 *
 * Two reasons a row is parked rather than deleted:
 *   ungeoreferenced — it carries sourced hours/fees but no coordinate in any source, so
 *                     validate-city-pack.mjs (rightly) will not accept it as a place.
 *   dangling leg    — its endpoint is such a row, so the leg has nowhere to point.
 * In both cases the sourced values are preserved; rule 5 says drop the record, not the fact.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');

const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8');

// ---- ungeoreferenced places ---------------------------------------------------
const placesPath = resolve(PACK, 'places.json');
const allPlaces = readJson(placesPath, []);
const georeferenced = allPlaces.filter((r) => Number.isInteger(r.latUdeg) && Number.isInteger(r.lngUdeg));
const ungeoreferencedNow = allPlaces.filter((r) => !(Number.isInteger(r.latUdeg) && Number.isInteger(r.lngUdeg)));

const ungeoMetaPath = resolve(HERE, 'ungeoreferenced.meta.json');
const priorUngeo = readJson(ungeoMetaPath, { places: [] });
const byId = new Map(priorUngeo.places.map((r) => [r.id, r]));
let newlyParkedPlaces = 0;
// restore-parked-records.mjs has just written the authoritative version of its records into
// places.json, so a record found here OVERWRITES the parked copy. Only records this script
// discovers on its own (not in the prior set) are genuinely new. Union-by-id, update-not-keep.
for (const r of ungeoreferencedNow) {
  if (byId.has(r.id)) byId.set(r.id, r);
  else { byId.set(r.id, r); newlyParkedPlaces++; }
}
// A record that has since BECOME georeferenced leaves the parked set — but only if it really is
// in places.json, so the two sets stay disjoint and nothing is held in both.
const placeIds = new Set(georeferenced.map((r) => r.id));
for (const id of [...byId.keys()]) if (placeIds.has(id)) byId.delete(id);

writeJson(placesPath, georeferenced);
writeJson(ungeoMetaPath, {
  note: 'Places that carry sourced facts but no position in any source read for this pack. They are NOT place records, because validate-city-pack.mjs requires a numeric coordinate and because a fact layer that lets a coordinate be derived from an address stops being a fact layer. Their hours, fees, addresses and provenance are kept here verbatim so nothing sourced is lost.',
  whyNotInPlacesJson: 'lat/lng would have to be invented from the address string. No source read for this pack states a coordinate for any of them, and the pack OSM extract (lat 35.0028–35.0047) does not reach them.',
  whatWouldCloseThis: 'An official page, a municipal open-data row, or an OSM object carrying the coordinate — opened and read, then recorded with verified_at.',
  count: byId.size,
  places: [...byId.values()],
});

// ---- legs with no resolvable endpoint ----------------------------------------
const transitPath = resolve(PACK, 'transit.json');
const allLegs = readJson(transitPath, []);
const kept = [];
const danglingNow = [];
for (const l of allLegs) {
  const bad = [['from', l.from], ['to', l.to]].filter(([, v]) => v && !placeIds.has(v));
  if (bad.length) danglingNow.push(l); else kept.push(l);
}
const legsMetaPath = resolve(HERE, 'ungeoreferenced-legs.meta.json');
const priorLegs = readJson(legsMetaPath, { legs: [] });
const legById = new Map(priorLegs.legs.map((l) => [l.id, l]));
let newlyParkedLegs = 0;
for (const l of danglingNow) {
  if (legById.has(l.id)) legById.set(l.id, l);
  else { legById.set(l.id, l); newlyParkedLegs++; }
}
for (const id of [...legById.keys()]) {
  // a parked leg whose endpoints became resolvable returns to the fact table
  const l = legById.get(id);
  if (placeIds.has(l.from) && placeIds.has(l.to)) legById.delete(id);
}
// Parked legs keep a machine-readable reason so the attestation is self-explaining.
for (const l of legById.values()) {
  l.droppedBecause = `endpoint ${['from', 'to'].filter((k) => !placeIds.has(l[k])).map((k) => `${k}=${l[k]}`).join(', ')} has no place record in places.json (no coordinate in any source)`;
  l.droppedBy = "rule 5, drop don't correct";
}

writeJson(transitPath, kept);
writeJson(legsMetaPath, {
  note: 'Transit legs whose endpoint is an ungeoreferenced place. Removed from transit.json because validate-city-pack.mjs raises DANGLING_REF, and repairing it would mean inventing a coordinate or silently redirecting the leg to a different place. The sourced durations below are kept as annotations, not as fact records.',
  whyNotInTransitJson: 'validate-city-pack.mjs: "a place referenced by transit must exist in places.json (no dangling ids)".',
  whatWouldCloseThis: 'A coordinate for the endpoint, from a source that is opened and read.',
  count: legById.size,
  legs: [...legById.values()],
});

console.log(`places.json: ${georeferenced.length} georeferenced records kept; parked ${newlyParkedPlaces} new, ${byId.size} total in the parked set`);
console.log(`transit.json: ${kept.length} legs kept; parked ${newlyParkedLegs} new, ${legById.size} total in the parked set`);
if (newlyParkedPlaces === 0 && newlyParkedLegs === 0 && (byId.size + legById.size) > 0) {
  console.log('  (nothing new to park — the parked set was preserved, which is the point)');
}
