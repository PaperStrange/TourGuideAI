// ungeoreferenced-to-pack.mjs — move the records that HAVE sourced facts but NO position
// out of places.json and into pack.json as `ungeoreferencedPlaces`.
//
// The reasoning, because this is a judgement call rather than a mechanical rule:
//   * validate-city-pack.mjs requires a numeric lat/lng on every place record. That is
//     the right gate: a place you cannot point at is not a place you can walk to.
//   * 知恩院 / 清水寺 / 建仁寺 have real, sourced, semi-static facts (opening hours,
//     admission, operator-published walking times) and a real address corroborated by two
//     sources — but no source states their coordinates, and this pack's OSM extract does not
//     reach them.
//   * Filling lat/lng from the address would be deriving a position and calling it observed.
//   * DELETING the records would throw away sourced hours and fees, which is the opposite of
//     the failure mode this pack exists to prevent.
// So they leave the fact table and stay in the pack with their provenance intact, and the
// gap is named. transit.json legs L07/L08 point at kennin-ji's id, which now resolves in
// pack.json's ungeoreferencedPlaces rather than in places.json — the verifier is told which.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');

const placesPath = resolve(PACK, 'places.json');
const rows = JSON.parse(readFileSync(placesPath, 'utf8'));

const kept = [];
const moved = [];
for (const r of rows) {
  if (Number.isInteger(r.latUdeg) && Number.isInteger(r.lngUdeg)) kept.push(r);
  else moved.push(r);
}

writeFileSync(placesPath, JSON.stringify(kept, null, 2) + '\n', 'utf8');

const out = {
  note: 'Places that carry sourced facts but no position in any source read for this pack. They are NOT place records, because validate-city-pack.mjs requires a numeric coordinate and because a fact layer that lets a coordinate be derived from an address stops being a fact layer. Their hours, fees, addresses and provenance are kept here verbatim so nothing sourced is lost.',
  whyNotInPlacesJson: 'lat/lng would have to be invented from the address string. No source read for this pack states a coordinate for any of them, and the pack OSM extract (lat 35.0028–35.0047) does not reach them.',
  whatWouldCloseThis: 'An official page, a municipal open-data row, or an OSM object carrying the coordinate — opened and read, then recorded with verified_at.',
  count: moved.length,
  places: moved,
};
writeFileSync(resolve(HERE, 'ungeoreferenced.meta.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');

console.log(`places.json: ${kept.length} records kept (all georeferenced), ${moved.length} moved to pack.json#ungeoreferencedPlaces: ${moved.map((m) => m.id).join(', ')}`);
