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
pack.scope.doorsNotPlaces = 12;
pack.scope.doorsNote = 'The 12 authored doors are NOT place records. Their "names" are 本門 (a type, not a proper name) and no source states where any doorway is, so a place record for one would carry an invented name and an invented position. They remain in doors.json + kyoto-shijo-osm.json as valueKind=licenced. See placeGaps "12 番の門そのもの" and contradictions C5.';

// Licence boundary, restated where the pack can be read without the repo.
pack.licenceObligations.curatedContentLicence = 'CC BY 4.0';
pack.licenceObligations.curatedContentAppliesTo = ['pack.json', 'places.json', 'transit.json', 'doors.json'];
pack.licenceObligations.curatedContentWhy = 'Lead decision 2026-09-30: curated data under city-packs/ is CC BY 4.0. The repository LICENSE is MIT and covers the SOFTWARE only. CC BY 4.0 is what both upstream data sources already use (京都市 京都観光見もの情報 is CC-BY 4.0; Japanese government open data is PDL 1.0, which declares CC BY 4.0 compatibility), it carries no share-alike, and it is one-way compatible with ODbL.';
pack.licenceObligations.odblNotCovered = 'OSM-derived values are NOT covered by the curated-content licence. They live only in kyoto-shijo-osm.json and kyoto-shijo-osm-places.json, each published under ODbL 1.0 with attribution.';

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
