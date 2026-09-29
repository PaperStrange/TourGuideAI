// merge-pack-meta.mjs — fold evidence/tools/{places,transit}.meta.json into pack.json.
//
// pack.json is the only file in the pack allowed to carry metadata; places.json and
// transit.json are bare arrays because that is the shape the fact-layer contract
// declares and the shape validate-city-pack.mjs accepts.
//
// Idempotent: running it twice produces the same pack.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');

const pack = JSON.parse(readFileSync(resolve(PACK, 'pack.json'), 'utf8'));
const placesMeta = JSON.parse(readFileSync(resolve(HERE, 'places.meta.json'), 'utf8'));
const transitMeta = JSON.parse(readFileSync(resolve(HERE, 'transit.meta.json'), 'utf8'));

const places = JSON.parse(readFileSync(resolve(PACK, 'places.json'), 'utf8'));
const transit = JSON.parse(readFileSync(resolve(PACK, 'transit.json'), 'utf8'));

delete pack.placeMeta;
delete pack.transitMeta;
delete pack.transit;

pack.coordinateSystem = placesMeta.coordinateSystem;
pack.placeSources = placesMeta.sources;
pack.placeGaps = placesMeta.gaps;
pack.placeGapNotes = placesMeta.gapNotes;
pack.contradictions = placesMeta.contradictions;

pack.transit = {
  schemaVersion: transitMeta.schemaVersion,
  scopeNote: transitMeta.scopeNote,
  walkTimeRule: transitMeta.walkTimeRule,
  distanceRule: transitMeta.distanceRule,
  fareReference: transitMeta.fareReference,
  gaps: transitMeta.gaps,
  transfers: transitMeta.transfers,
};

pack.scope.includedPlaces = places.length;
pack.scope.includedTransitLegs = transit.length;

pack.fileRoles = {
  'pack.json': 'pack-level identity, licences, obligations, the per-source record of what was actually read, and the explicit gap / contradiction lists. Not a fact table.',
  'places.json': `top-level array, ${places.length} fact records (the contract's shape)`,
  'transit.json': `top-level array, ${transit.length} fact records (the contract's shape)`,
  'kyoto-shijo-osm-places.json': 'ODbL 1.0 Derivative Database — every OSM-derived value, kept out of our two fact files (ODbL 4.5(a) Collective Database)',
  'doors.json': "our authored block-0 door content; refers to the ODbL file by doorId. Not touched by this task.",
  'kyoto-shijo-osm.json': 'the ODbL half of doors.json. Not touched by this task.',
  'evidence/': 'the fetched source bytes and the scripts that read them, so a verifier can re-derive every number offline',
};

writeFileSync(resolve(PACK, 'pack.json'), JSON.stringify(pack, null, 2) + '\n', 'utf8');
console.log(`pack.json rewritten: ${places.length} places, ${transit.length} transit legs, ${Object.keys(pack.placeSources).length} sources, ${pack.placeGaps.length} gaps, ${pack.contradictions.length} contradictions, ${pack.transit.gaps.length} transit gaps`);
