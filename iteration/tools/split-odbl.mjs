// GAP-6 — land the ODbL file-separation convention.
//
// The contract has carried GAP-6 as "ODbL-derived rows need file segregation, the
// *-odbl.json naming is a Lead decision" since before any pack existed. doors.json is
// the first pack that mixes both provenances: building identity + facade geometry
// come from OpenStreetMap (ODbL 1.0), while door placement, entrance type and
// interior template are ours.
//
// The rule this implements comes from the licence text itself, not from taste:
//   ODbL 4.2  — publicly conveying a Derivative Database requires the licence (or its
//               URI) to travel WITH the database and alongside the documentation.
//   ODbL 4.4  — a Derivative Database must be distributed under ODbL.
//   ODbL 4.5a — a Collective Database (ODbL content sitting unmodified beside
//               independent databases) does NOT require the whole to be ODbL, only the
//               ODbL part. That is what lets our curated rows stay ours.
//
// So: every OSM-sourced field moves into `<pack>-osm.json`, published under ODbL with
// the licence URI and attribution carried inside the file. doors.json keeps only our
// own content plus *references* to the OSM record by identifier.
//
// This splits a record that a validator reads, so it must be idempotent and must not
// silently drop a field: anything not explicitly classified is reported and kept.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const PACK = 'city-packs/kyoto-shijo';
const DOORS = `${PACK}/doors.json`;
const OSM_OUT = `${PACK}/kyoto-shijo-osm.json`;

// ---- classification ---------------------------------------------------------
// ODbL-derived: the value originates in OpenStreetMap.
const ODBL_DOOR_FIELDS = ['osmBuildingId', 'osmBuildingName', 'facadeLineRun', 'observedAnchors', 'placement'];
// Ours: authored by a curator, or a value we computed and own.
const OWN_DOOR_FIELDS = ['doorId', 'cellX', 'cellY', 'tileY', 'entrancePointJa', 'interiorTemplate', 'provenance'];

const doors = JSON.parse(readFileSync(DOORS, 'utf8'));
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

if (existsSync(OSM_OUT)) {
  console.error(`${OSM_OUT} already exists — this split is one-way; delete it to re-run.`);
  process.exit(30);
}

// ---- collect the ODbL half ---------------------------------------------------
const doorsOsm = [];
const facadeIds = new Set();
const unclassified = [];

for (const d of doors.doors) {
  const rec = { doorId: d.doorId };
  for (const k of Object.keys(d)) {
    if (ODBL_DOOR_FIELDS.includes(k)) rec[k] = d[k];
    else if (!OWN_DOOR_FIELDS.includes(k)) unclassified.push(`${d.doorId}.${k}`);
  }
  doorsOsm.push(rec);
  if (d.facadeLineRun?.facadeId) facadeIds.add(d.facadeLineRun.facadeId);
}

// Facade records are geometry we read from OSM, so they travel with the ODbL half.
const facadesOsm = doors.facades ?? [];

const osmHalf = {
  schema: 'tourguide.city-pack.osm-derived/v1',
  pack: doors.pack,
  note: 'Every value in this file originates in OpenStreetMap, or is a position measured against OSM geometry. '
      + 'It is published as a Derivative Database under ODbL 1.0, exactly as clause 4.4 requires. '
      + 'It is also the alteration file clause 4.6 asks for: the scripts that produced it are listed under method. '
      + 'doors.json holds our own content and refers to this file by doorId.',
  source: {
    dataset: 'OpenStreetMap, via Overpass API',
    licence: 'Open Database License (ODbL) 1.0',
    licenceUri: 'https://opendatacommons.org/licenses/odbl/1-0/',
    attribution: '© OpenStreetMap contributors',
    copyrightUrl: 'https://www.openstreetmap.org/copyright',
    extractedAt: doors.fetchedAt ?? null,
  },
  method: {
    extraction: 'Overpass API, out body geom on a narrow block bbox',
    projection: 'local tangent-plane equirectangular, origin frozen in the geo contract',
    scripts: [
      'docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs',
      'iteration/tools/freeze-origin.mjs',
      `${PACK}/validate-doors.mjs`,
    ],
  },
  // The two footprint ways these doors open into, quoted with their facade edges.
  buildings: [
    { osmWayId: 205732558, name: '京都三井ビルディング', side: 'north', facadeId: 'F-north',
      facadeEdgeNodes: [2157078408, 2157078409], source: 'Bing (imagery-traced, per the OSM tag)' },
    { osmWayId: 205732536, name: '京都ダイヤビル', side: 'south', facadeId: 'F-south',
      facadeEdgeNodes: [2157078404, 2157078405], source: 'Bing (imagery-traced, per the OSM tag)' },
  ],
  facades: facadesOsm,
  doors: doorsOsm,
  observedBlockFeatures: doors.observedBlockFeatures ?? null,
  evidenceFiles: (doors.evidence ?? []).map?.((e) => e) ?? doors.evidence ?? undefined,
};

if (unclassified.length) {
  console.error('REFUSING TO SPLIT — door fields neither ODbL-derived nor ours:');
  for (const u of unclassified) console.error(`  ${u}`);
  process.exit(31);
}

const osmText = JSON.stringify(osmHalf, null, 2) + '\n';
writeFileSync(OSM_OUT, osmText, 'utf8');
const osmSha = sha256(osmText);

// ---- rewrite doors.json: ours + references ----------------------------------
for (const d of doors.doors) {
  for (const k of ODBL_DOOR_FIELDS) delete d[k];
  d.osmRecord = `${OSM_OUT}#/doors[doorId=${d.doorId}]`;
}

doors.facades = undefined;
delete doors.facades;
doors.observedBlockFeatures = undefined;
delete doors.observedBlockFeatures;

doors.osmDerived = {
  file: OSM_OUT,
  sha256: osmSha,
  licence: 'ODbL 1.0',
  licenceUri: 'https://opendatacommons.org/licenses/odbl/1-0/',
  attribution: '© OpenStreetMap contributors',
  carriedFields: ['osmBuildingId', 'osmBuildingName', 'facadeLineRun', 'observedAnchors', 'placement', 'facades', 'observedBlockFeatures'],
  relation: 'Collective Database per ODbL 4.5(a): our content and the ODbL content sit in separate files, '
          + 'each under its own licence. This file is ours and is NOT itself under ODbL; it contains no OSM-derived value, '
          + 'only references into the ODbL file by doorId.',
  why: 'Separating is what ODbL 4.2 and 4.4 ask for, and 4.5(a) is what keeps our curated rows from being absorbed.',
};

const doorsText = JSON.stringify(doors, null, 2) + '\n';
writeFileSync(DOORS, doorsText, 'utf8');

console.log(`wrote ${OSM_OUT}  ${osmText.length} B  sha256 ${osmSha.slice(0, 16)}…`);
console.log(`rewrote ${DOORS}  ${doorsText.length} B`);
console.log('');
console.log(`ODbL half   : ${doorsOsm.length} door records + ${facadesOsm.length} facades + buildings + observedBlockFeatures`);
console.log(`our half    : doorId, cellX/cellY (authored placement), entrancePointJa, interiorTemplate, provenance`);
console.log(`references  : each door carries osmRecord -> the ODbL file`);
console.log('');
console.log('NOTE: the validator reads fields that just moved. It must be repointed at');
console.log(`${OSM_OUT} for osmBuildingId / facadeLineRun / placement, or it will fail loudly —`);
console.log('which is the correct behaviour and must not be worked around by copying fields back.');
