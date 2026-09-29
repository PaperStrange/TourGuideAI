// drop-dangling-legs.mjs — move transit legs whose endpoint has no place record out of
// transit.json and into pack.json as `ungeoreferencedLegs`.
//
// Rule 5 of the fact-integrity skill, applied literally: "When a validator, schema check, or
// provenance gate rejects content, discard it. Do not repair it, guess a substitute, or fall
// back to a fluent-sounding value."
//
// validate-city-pack.mjs raises DANGLING_REF because kennin-ji has no place record (it has no
// coordinate in any source). The two possible "repairs" are both forbidden:
//   - point the leg at the nearest station instead -> a leg that says it takes you to the
//     temple but actually stops at a station, which is how someone ends up walking the wrong way;
//   - give kennin-ji a coordinate derived from its address -> an invented position, labelled
//     observed, printed in the guide's verified column.
// So the legs are discarded from the fact table. Their sourced duration ("徒歩7分" / "徒歩10分",
// published by the temple itself) is preserved in pack.json so the information is not lost —
// it stays an annotation until a coordinate source is opened.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');

const places = JSON.parse(readFileSync(resolve(PACK, 'places.json'), 'utf8'));
const ids = new Set(places.map((p) => p.id));
const transitPath = resolve(PACK, 'transit.json');
const legs = JSON.parse(readFileSync(transitPath, 'utf8'));

const kept = [];
const dropped = [];
for (const l of legs) {
  const bad = [['from', l.from], ['to', l.to]].filter(([, v]) => v && !ids.has(v));
  if (bad.length) dropped.push({ ...l, droppedBecause: `endpoint ${bad.map(([k, v]) => `${k}=${v}`).join(', ')} has no place record in places.json (no coordinate in any source)`, droppedBy: 'rule 5, drop don\'t correct' });
  else kept.push(l);
}

writeFileSync(transitPath, JSON.stringify(kept, null, 2) + '\n', 'utf8');
writeFileSync(resolve(HERE, 'ungeoreferenced-legs.meta.json'), JSON.stringify({
  note: 'Transit legs whose endpoint is an ungeoreferenced place. Removed from transit.json because the validator raises DANGLING_REF, and repairing it would mean inventing a coordinate or silently redirecting the leg to a different place. The sourced durations below are kept as annotations, not as fact records.',
  whyNotInTransitJson: 'validate-city-pack.mjs: "a place referenced by transit must exist in places.json (no dangling ids)".',
  whatWouldCloseThis: 'A coordinate for the endpoint, from a source that is opened and read.',
  count: dropped.length,
  legs: dropped,
}, null, 2) + '\n', 'utf8');

console.log(`transit.json: ${kept.length} legs kept, ${dropped.length} dropped as dangling: ${dropped.map((d) => d.id).join(', ')}`);
