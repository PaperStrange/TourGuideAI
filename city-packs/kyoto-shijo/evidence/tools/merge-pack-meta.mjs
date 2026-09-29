// merge-pack-meta.mjs — fold the curation metadata into the two places it can actually live,
// and DERIVE every count from the files rather than stating it.
//
// Layout decision (this is the fix for the drift Lead found):
//   pack.json            pack identity, licences, scope, gaps, contradictions, transit rules.
//                        Every count in it is computed here from the files on disk, and
//                        validate-city-pack-v2.mjs re-derives and asserts them, so a future
//                        edit that adds a place and forgets pack.json goes red instead of stale.
//   attestations/*.json  the per-source record of what was actually READ, and the rows that
//                        are NOT fact records (ungeoreferenced places, dropped legs, block doors).
//                        These live at the path the surviving fact files point at, because a
//                        place record's provenance.readWhat must be checkable by someone who
//                        has places.json and nothing else.
//
// Idempotent: running it twice produces the same output.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');
const ATTEST = resolve(PACK, 'attestations');
mkdirSync(ATTEST, { recursive: true });

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const write = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8');

const pack = read(resolve(PACK, 'pack.json'));
const places = read(resolve(PACK, 'places.json'));
const transit = read(resolve(PACK, 'transit.json'));
const placesMeta = read(resolve(HERE, 'places.meta.json'));
const transitMeta = read(resolve(HERE, 'transit.meta.json'));
const ungeo = read(resolve(HERE, 'ungeoreferenced.meta.json'));
const ungeoLegs = read(resolve(HERE, 'ungeoreferenced-legs.meta.json'));
const blockDoors = read(resolve(HERE, 'block-doors.json'));
const doors = read(resolve(PACK, 'doors.json'));
const odbl = read(resolve(PACK, 'kyoto-shijo-osm-places.json'));

// ---- attestations: what was read, at a path the fact files can point to --------
write(resolve(ATTEST, 'source-attestations.json'), {
  note: 'One entry per URL this pack cites. `whatIRead` is what the curator actually found on the page — page, table, or line — recorded so a different person can check the claim without re-fetching. `evidence` names the raw bytes kept under evidence/, whose sha256 is recorded here too, so the bytes can be proven unchanged.',
  rule: 'A URL that was never opened does not count as verification. An entry with no evidence file has not been opened and is listed under unopenedUrls instead.',
  cityId: pack.cityId,
  recordedAt: pack.verifiedAt,
  recordedBy: pack.verifiedBy,
  sources: placesMeta.sources,
  unopenedUrls: (pack.sources ?? []).filter((u) => !Object.values(placesMeta.sources).some((s) => s.url === u)),
  licencePointers: [
    { url: 'https://www.openstreetmap.org/copyright', reason: 'licence pointer for the ODbL half, not an opened document' },
    { url: 'https://opendatacommons.org/licenses/odbl/1-0/', reason: 'licence text pointer, not an opened document' },
  ],
  // Files deliberately removed from evidence/, with the reason, so that a reader who finds a
  // reference to one of them (in a history, a verifier record, or a note) knows it was removed on
  // purpose rather than lost. Without this list the removal itself looks like the D-18 defect class.
  evidenceRemoved: placesMeta.evidenceRemoved ?? [],
  evidenceRemovedWhy: 'evidence/kyoto-kotsu-fare-bus-teiki.html and .txt were byte-identical to the -normal pair (same sha256 8695CF20… and CAD3F056…) because page/0000240682.html redirects to the same canonical page. Two names for one snapshot looked like two independent captures. The duplicate pair was deleted and the survivor records both URLs in alsoServes. References to the removed pair still appear in verification-verifier.json and in the verifier report: that is the correct historical state, because the verifier cited what existed when it audited, and those records are evidence rather than working state.',
});

write(resolve(ATTEST, 'ungeoreferenced-places.json'), ungeo);
write(resolve(ATTEST, 'dropped-legs.json'), ungeoLegs);
write(resolve(ATTEST, 'block-doors.json'), {
  ...blockDoors,
  // The doors' provenance vocabulary is stated ONCE and pointed at, not restated. An earlier version
  // of this file spelled out `valueKind: "licenced"` while doors.json said `authored`, so the
  // decision record contradicted the artefact it describes. Prose copies of a frozen enum drift for
  // exactly the same reason code copies do — and this is the second spelling of the same drift here.
  valueKind: 'authored',
  valueKindAuthority: 'city-packs/kyoto-shijo/doors.json (each door\'s provenance.valueKind) and world-grid.mjs (VALUE_KINDS). This file does not restate the enum; it points at the two places that own it.',
  guideVerifiedColumnAllowed: false,
  decision: 'DOORS ARE A SEPARATE ENTITY TYPE. places.json does not carry them and must not be expected to.',
  decisionWhy: [
    'A place record needs a name and a position. Each door "name" is 本門 — the word for a gate type, not a proper name — and the OSM extract plus every source opened for this pack describes this block as having no mapped doorway at all.',
    'doors.json marks every door valueKind="authored" with provenance.guideVerifiedColumnAllowed=false, and validate-doors.mjs V8/V15 assert that boundary. Promoting a door into places.json would give a curator placement a row in the fact layer, which is the exact move contract clause 4 forbids.',
    'So the doors remain: our authored content in doors.json, their ODbL geometry in kyoto-shijo-osm.json, and a declared count + doorId list reachable from places.json via each building record\'s entrances block.',
  ],
  reachableFrom: `${pack.scope.doorsNotPlaces} doorIds are declared across ${places.filter((p) => p.entrances).length} building records in places.json; this file holds the decision record.`,
});

// ---- pack.json: derived counts -------------------------------------------------
function derivedCounts() {
  const declared = places.flatMap((p) => p.entrances?.doorIds ?? []);
  return {
    places: places.length,
    transitLegs: transit.length,
    sources: Object.keys(placesMeta.sources).length,
    placeGaps: placesMeta.gaps.length,
    placeGapNotes: placesMeta.gapNotes.length,
    contradictions: placesMeta.contradictions.length,
    transitGaps: transitMeta.gaps.length,
    transfers: transitMeta.transfers.length,
    fareReferences: transitMeta.fareReference.length,
    ungeoreferencedPlaces: ungeo.places.length,
    droppedLegs: ungeoLegs.legs.length,
    authoredDoors: doors.doors.length,
    doorsDeclaredInPlaces: declared.length,
    odblRows: odbl.places.length,
  };
}
const c = derivedCounts();

delete pack.placeMeta;
delete pack.transit;
delete pack.transitMeta;

pack.coordinateSystem = placesMeta.coordinateSystem;
pack.placeSources = placesMeta.sources;
pack.placeGaps = placesMeta.gaps;
pack.placeGapsResolved = placesMeta.gapsResolved ?? [];
pack.placeGapNotes = placesMeta.gapNotes;
pack.placeGapNotesClosed = placesMeta.gapNotesClosed ?? [];
pack.contradictions = placesMeta.contradictions;
pack.evidenceRemoved = placesMeta.evidenceRemoved ?? [];
pack.transit = {
  schemaVersion: transitMeta.schemaVersion,
  scopeNote: transitMeta.scopeNote,
  walkTimeRule: transitMeta.walkTimeRule,
  distanceRule: transitMeta.distanceRule,
  fareReference: transitMeta.fareReference,
  // Subway zone counts are looked up, never computed: 区 is operator policy, not geography.
  subwayZones: transitMeta.subwayZones,
  stationCoordinates: transitMeta.stationCoordinates,
  gapWordingRule: transitMeta.gapWordingRule,
  gaps: transitMeta.gaps,
  transfers: transitMeta.transfers,
};

pack.scope = {
  gate: 'Gate 1',
  anchorBlockIndex: 0,
  anchorBlockNote: 'Block 0 of the frozen corridor: the first 40 m of 四条通 east of 四条烏丸, the only block that can hold authored interiors.',
  countsDerivedFrom: ['places.json', 'transit.json', 'doors.json', 'kyoto-shijo-osm-places.json', 'attestations/ungeoreferenced-places.json', 'attestations/dropped-legs.json'],
  countsAssertedBy: 'validate-city-pack-v2.mjs check (K) re-derives every count below from those files and fails on any mismatch',
  ...c,
  doorsArePlaces: false,
  doorsNote: 'The authored doors are a SEPARATE ENTITY TYPE, not place records: places.json does not carry them and a reader must not expect it to. Each door name is the word 本門 (a gate type, not a proper name) and no source opened for this pack states that any doorway exists in this block, so a place row would carry an invented name and an invented position. They remain in doors.json (our content) + kyoto-shijo-osm.json (their ODbL geometry) as valueKind=licenced, and each building record in places.json declares its doorIds. See attestations/block-doors.json and placeGaps.',
  ungeoreferencedNote: 'Records with sourced hours/fees/addresses but NO coordinate in any source. They are deliberately not in places.json (which requires a numeric coordinate) and are kept in full, with provenance, at attestations/ungeoreferenced-places.json.',
  droppedLegsNote: 'Transit legs whose endpoint has no coordinate. Removed from transit.json because the stock validator raises DANGLING_REF; kept with their sourced durations at attestations/dropped-legs.json.',
};

// The records themselves, not just their counts. These live here rather than in pack.json
// proper so that pack.json stays a manageable read and the arrays keep one home.
pack.ungeoreferencedPlaces = ungeo.places;
pack.ungeoreferencedLegs = ungeoLegs.legs;

pack.attestations = {
  dir: 'city-packs/kyoto-shijo/attestations/',
  files: ['source-attestations.json', 'ungeoreferenced-places.json', 'dropped-legs.json', 'block-doors.json'],
  why: 'places.json and transit.json are bare arrays so that their shape is exactly what the fact-layer contract declares. Everything that is not a fact record — the record of what was read at each URL, the rows that are not place records — lives here, at a path the fact files point at, so it is checkable from the pack alone.',
};

// The UNKNOWN triage is data, not prose: the gate's counter is what a reader will look up, so the
// per-value classification travels with it.
pack.sourceAlignment = {
  ...read(resolve(HERE, 'source-alignment-triage.json')),
  triageFile: 'evidence/tools/source-alignment-triage.json',
  gateCommand: 'node iteration/tools/check-source-alignment.mjs',
};

pack.licenceObligations.curatedContentLicence = 'CC BY 4.0';
pack.licenceObligations.curatedContentAppliesTo = ['pack.json', 'places.json', 'transit.json', 'doors.json', 'attestations/**'];
pack.licenceObligations.curatedContentWhy = 'Lead decision 2026-09-30: curated data under city-packs/ is CC BY 4.0. The repository LICENSE is MIT and covers the SOFTWARE only. CC BY 4.0 is what both upstream data sources already use (京都市 京都観光見もの情報 is CC-BY 4.0; Japanese government open data is PDL 1.0, which declares CC BY 4.0 compatibility), it carries no share-alike, and it is one-way compatible with ODbL.';
pack.licenceObligations.odblNotCovered = 'OSM-derived values are NOT covered by the curated-content licence. They live only in kyoto-shijo-osm.json and kyoto-shijo-osm-places.json, each published under ODbL 1.0 with attribution.';
pack.licenceObligations.whereAttributionLives = 'places.json and transit.json are bare arrays and carry no licence block of their own; pack.json (licenceObligations) and city-packs/kyoto-shijo/kyoto-shijo-osm-places.json (source.attribution) are the authoritative statements, and this is stated in pack.fileRoles.';

pack.fileRoles = {
  'pack.json': 'Pack identity, licences and obligations, the per-source attestation index, scope counts (derived, then asserted by the checker), and the explicit gap / contradiction lists. Not a fact table.',
  'places.json': `Top-level array, ${c.places} fact records — exactly the shape the fact-layer contract declares. Bare array: no schemaVersion and no licence block of its own; both live in pack.json.`,
  'transit.json': `Top-level array, ${c.transitLegs} fact records. Bare array, same reason.`,
  'kyoto-shijo-osm-places.json': `ODbL 1.0 Derivative Database — every OSM-derived value (${c.odblRows} rows), kept out of our two fact files per ODbL 4.5(a).`,
  'kyoto-shijo-osm.json': 'The ODbL half of doors.json. Not touched by this task.',
  'doors.json': 'Our authored block-0 door content; refers to the ODbL file by doorId. Not touched by this task.',
  'attestations/': 'The record of what was actually read at each source URL, plus the rows that are deliberately NOT fact records.',
  'evidence/': 'The fetched source bytes and the scripts that read them, so a verifier can re-derive every number offline.',
};

pack.verifiedAt = pack.verifiedAt ?? '2026-09-29';
pack.verifiedBy = pack.verifiedBy ?? 'city-data-architect (pack-curator, shared task task-10)';

write(resolve(PACK, 'pack.json'), pack);
console.log(`pack.json rewritten. Derived counts: ${JSON.stringify(c)}`);
