// classify-freshness.mjs — set factTier from the fields present, and make every closedDays
// entry carry its own provenance. Covers BOTH record sets: places.json and the
// ungeoreferenced records kept in attestations/ungeoreferenced-places.json.
//
// Why the tier is derived rather than typed:
//   The skill's freshness table says semi-static means "opening hours, admission fees, closed
//   days — re-verify quarterly". Declaring a record static while it carries a 16:00 closing
//   time would let that time sit in the pack for a year unreviewed. Deriving the tier from the
//   fields means the two can never disagree, and validate-city-pack-v2.mjs check (I) re-derives
//   it independently and fails on a mismatch.
//
// Why closedDays must be objects with their own source:
//   "Tuesday is shut" is a fact that strands someone outside a door exactly like a wrong hour
//   does. It has to answer the same question: which source says so?
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');

const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v) && Object.keys(v).length > 0);

function tier(rows, label) {
  let semi = 0;
  const lines = [];
  for (const r of rows) {
    const carried = { hours: has(r.hours), admission: has(r.admission), closedDays: has(r.closedDays) };
    const anySemi = carried.hours || carried.admission || carried.closedDays;
    r.factTier = anySemi ? 'semi-static' : 'static';
    if (anySemi) {
      semi++;
      lines.push(`${r.id}: ${Object.entries(carried).filter(([, v]) => v).map(([k]) => k).join('+')} -> semi-static`);
    }
    r.closedDays = (r.closedDays ?? []).map((c) => (typeof c === 'string'
      ? { labelJa: c, source_url: r.source_url, verified_at: r.verified_at, note: 'inherited from the record source; replace with the specific source if one is opened' }
      : c));
  }
  console.log(`${label}: ${rows.length - semi} static, ${semi} semi-static`);
  for (const l of lines) console.log(`  ${l}`);
  return rows;
}

const placesPath = resolve(PACK, 'places.json');
const places = tier(JSON.parse(readFileSync(placesPath, 'utf8')), 'places.json');
writeFileSync(placesPath, JSON.stringify(places, null, 2) + '\n', 'utf8');

// The ungeoreferenced payload has exactly ONE writable home: evidence/tools/ungeoreferenced.meta.json.
// merge-pack-meta.mjs later publishes it to attestations/ungeoreferenced-places.json, where it is
// an OUTPUT. Previously this script tiered the published copy while merge read the source copy, so
// the tier assignment was silently discarded — two writable copies of one payload, which is the
// same drift class as a hand-written count.
const ungeoPath = resolve(HERE, 'ungeoreferenced.meta.json');
const ungeo = JSON.parse(readFileSync(ungeoPath, 'utf8'));
ungeo.places = tier(ungeo.places, 'ungeoreferenced.meta.json');
writeFileSync(ungeoPath, JSON.stringify(ungeo, null, 2) + '\n', 'utf8');
