#!/usr/bin/env node
/**
 * validate-city-pack-v2.mjs — the fact-layer gate that checkProvenance() cannot be.
 *
 * Validate-city-pack.mjs checks provenance PRESENCE. It cannot tell whether a source_url
 * supports the value recorded against it, and that gap is the one that strands a traveller
 * outside a locked door. This file adds the checks that are still mechanical, i.e. the ones
 * that need evidence bytes rather than a human judgement:
 *
 *   A  every source_url cited by a fact or a pack source resolves to a NON-EMPTY file under
 *      evidence/ — so "this URL was opened" is a checked fact, not a claim. A citation with
 *      no bytes on disk is a GAP and is reported as one.
 *   B  every evidence file's sha256 is recordable and stable, and the ODbL half is present.
 *   C  coordinates: both spellings required and MUTUALLY CONSISTENT (the integer microdegree
 *      pair is authoritative; the decimal twin must be its exact conversion). A place with one
 *      spelling and not the other is a violation, because the two spellings can drift.
 *   D  every hours[] / admission{} / closedDays entry carries its own source_url + verified_at.
 *      A fee inside an admission object that has no source of its own is exactly the
 *      "hours/admission are free text" failure the expert review named.
 *   E  integer-typed domain fields: latUdeg/lngUdeg, fare amounts, minutes. No floats.
 *   F  transit: a walk leg with a measured distance must have minutes == ceil(m/80) under the
 *      sourced 80 m/min rule; fareIC == fareTicket unless a source says otherwise; a leg may
 *      not carry a fare AND mode=walk.
 *   G  no reference to a place id outside places.json and pack.json#ungeoreferencedPlaces.
 *   H  the ODbL separation holds: no place record carries an OSM-derived coordinate value
 *      copied from the ODbL half — it must reach it through `osmRecord`.
 *   I  freshness tiers: every record declares factTier, and a semi-static record (hours /
 *      admission / closedDays present) must have been verified within the quarterly window.
 *   J  no record carries an agent self-assessed confidence field (skill: not mechanically
 *      checkable, and it dilutes the rule).
 *
 * Exit codes: 0 = pass, 1 = violation, 2 = usage error.
 *
 * Usage: node validate-city-pack-v2.mjs <repo-root> [<pack-dir>]
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// HERE = D:\...\TourGuideAI\city-packs\kyoto-shijo, so the repo root is TWO levels up,
// not four. Four landed on D:\ and made the documented invocation
//   node city-packs/kyoto-shijo/validate-city-pack-v2.mjs
// fail with "D:\city-packs\kyoto-shijo\pack.json not found" while the pack was fine.
// It took three attempts to get this right because I kept reasoning about the path
// instead of printing it; the resolution is now stated below rather than inferred.
//   up1 -> <repo>\city-packs      up2 -> <repo>      up3 -> <repo parent>
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const REPO = resolve(positional[0] ?? resolve(HERE, '../..'));
const PACKDIR = resolve(positional[1] ?? join(REPO, 'city-packs', 'kyoto-shijo'));
// Machine-readable mode for CI. Anchored to the first line of a NON-EMPTY line, because a
// trailing newline in a shell-captured stream otherwise eats the anchor and the JSON vanishes.
const JSON_MODE = process.argv.includes('--json');

// The valueKind enum is FROZEN in exactly one place. Importing it rather than restating it
// matters: this checker previously hard-coded the three members it knew about, and the enum
// gained a fourth (`authored`, added when it turned out all 12 doors are authored placements)
// without this file noticing. A checker that carries its own copy of a frozen constant is a
// second source of truth, and it will drift exactly like a hand-written count does.
const GRID_URL = new URL('../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', import.meta.url);
let VALUE_KINDS;
let GUIDE_VERIFIED_COLUMN_ALLOWED;
try {
  ({ VALUE_KINDS, GUIDE_VERIFIED_COLUMN_ALLOWED } = await import(GRID_URL.href));
} catch (e) {
  console.error(`usage error: cannot import the frozen valueKind enum from ${GRID_URL.pathname}: ${e.message}`);
  process.exit(2);
}

const violations = [];
const notes = [];
const checks = [];
const fail = (code, at, msg) => violations.push({ code, at, msg });
const ok = (id, detail) => checks.push({ id, detail });

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').toUpperCase();

// ---- load -------------------------------------------------------------------
for (const f of ['pack.json', 'places.json', 'transit.json']) {
  if (!existsSync(join(PACKDIR, f))) { console.error(`usage error: ${join(PACKDIR, f)} not found`); process.exit(2); }
}
const pack = readJson(join(PACKDIR, 'pack.json'));
const places = readJson(join(PACKDIR, 'places.json'));
const transit = readJson(join(PACKDIR, 'transit.json'));
const evidDir = join(PACKDIR, 'evidence');
if (!existsSync(evidDir)) { console.error(`usage error: ${evidDir} not found`); process.exit(2); }

// ---- A/B: every cited URL must have bytes on disk ---------------------------
const evidenceFiles = readdirSync(evidDir).filter((f) => statSync(join(evidDir, f)).isFile());
const evidenceHashes = new Map(evidenceFiles.map((f) => [f, sha256(join(evidDir, f))]));

/** Every (url -> evidence file) binding this pack relies on. A URL absent from this map
 *  cannot be checked, and is reported as an unchecked citation rather than silently passed. */
const URL_EVIDENCE = {
  'https://data.city.kyoto.lg.jp/resource/?id=7052': ['kyoto-odp-resource-7052.html'],
  'https://data.city.kyoto.lg.jp/dataset/00073/': ['kyoto-odp-dataset-00073.html'],
  'https://www2.city.kyoto.lg.jp/sogo/toukei/Sonota/kiyaku/kiyaku_syoban.pdf': ['kyoto-city-kiyaku-syoban.pdf'],
  'https://www.tfkoutori.jp/data/pdf/kiyaku-202209.pdf': ['japan-rftc-kiyaku-202209.pdf'],
  // page/0000240682.html redirects to the same page as the canonical bus-fare URL, so ONE snapshot
  // serves both URLs. The duplicate pair (kyoto-kotsu-fare-bus-teiki.*) was byte-identical and has
  // been deleted; binding both URLs here is what stops a "missing evidence" error and a re-fetch.
  'https://www.city.kyoto.lg.jp/kotsu/page/0000240682.html': ['kyoto-kotsu-fare-bus-normal.html'],
  'https://www.city.kyoto.lg.jp/kotsu/page/0000204850.html': ['kyoto-kotsu-fare-search.html'],
  'https://opendatacommons.org/licenses/odbl/1-0/': ['odbl-1.0-text.html'],
  'https://www.city.kyoto.lg.jp/kotsu/page/0000240757.html': ['kyoto-kotsu-fare-subway.html'],
  'https://www.yasaka-jinja.or.jp/access/': ['yasaka-jinja-access.html'],
  'https://www.yasaka-jinja.or.jp/about/architecture/': ['yasaka-jinja-architecture.html'],
  'https://www.chion-in.or.jp/guide/': ['chion-in-guide.html'],
  'https://www.kiyomizudera.or.jp/access.php': ['kiyomizudera-access-hours.html'],
  'https://www.kenninji.jp/access/': ['kenninji-access.html'],
  'https://www.kenninji.jp/news/?p=2352': ['kenninji-news-fee2025.html'],
  'https://www.openstreetmap.org/way/205732558': ['osm-block-q1-footprints.json', 'osm-block-q2-everything.json'],
  'https://www.openstreetmap.org/way/205732536': ['osm-block-q1-footprints.json', 'osm-block-q2-everything.json'],
  // The three temples' own fetches, and the two 八坂神社 ways named in sourcesByField.
  'https://www.openstreetmap.org/way/456122965': ['osm-temple-chionin.json'],
  'https://www.openstreetmap.org/way/336641107': ['osm-temple-kiyomizu.json'],
  'https://www.openstreetmap.org/way/760889100': ['osm-temple-kenninji.json'],
  'https://www.openstreetmap.org/way/105449683': ['osm-corridor-map.json', 'osm-corridor-os.json'],
  'https://www.openstreetmap.org/way/88108397': ['osm-corridor-map.json', 'osm-corridor-os.json'],
  'https://api.openstreetmap.org/api/0.6/map.json?bbox=135.7588,35.0028,135.7789,35.0047': ['osm-corridor-map.json'],
  'https://www.openstreetmap.org/copyright': ['osm-corridor-map.json'],
};
// OSM node URLs are all served by the same corridor extract.
const osmNodeUrl = /^https:\/\/www\.openstreetmap\.org\/node\/(\d+)$/;

const citedUrls = new Set();
const collect = (u) => { if (typeof u === 'string' && /^https?:/.test(u)) citedUrls.add(u); };
for (const s of pack.sources ?? []) collect(typeof s === 'string' ? s : s?.url);
for (const p of places) {
  collect(p.source_url);
  for (const h of p.hours ?? []) collect(h.source_url);
  for (const it of p.admission?.items ?? []) collect(it.source_url);
  for (const c of p.closedDays ?? []) collect(typeof c === 'string' ? null : c.source_url);
  // A record that draws on two sources declares them per field group; both must be openable.
  for (const u of Object.keys(p.sourcesByField ?? {})) collect(u);
}
for (const l of transit) collect(l.source_url);
for (const x of pack.transit?.transfers ?? []) collect(x.source_url);
for (const f of pack.transit?.fareReference ?? []) collect(f.source_url);
for (const g of pack.placeGapNotes ?? []) collect(g.source_url);
collect(pack.transit?.walkTimeRule?.source_url);
collect(pack.transit?.distanceRule?.source_url);
for (const r of pack.ungeoreferencedPlaces ?? []) { collect(r.source_url); for (const h of r.hours ?? []) collect(h.source_url); for (const it of r.admission?.items ?? []) collect(it.source_url); }
for (const l of pack.ungeoreferencedLegs ?? []) collect(l.source_url);

const unchecked = [];
const missingBytes = [];
for (const u of [...citedUrls].sort()) {
  const files = URL_EVIDENCE[u] ?? (osmNodeUrl.test(u) ? ['osm-corridor-map.json'] : null);
  if (!files) { unchecked.push(u); continue; }
  for (const f of files) {
    const p = join(evidDir, f);
    if (!existsSync(p) || statSync(p).size === 0) { missingBytes.push(`${u} -> evidence/${f}`); }
  }
}
if (missingBytes.length) for (const m of missingBytes) fail('EVIDENCE_MISSING', 'evidence/', `cited source has no bytes on disk: ${m}`);
else ok('A', `${citedUrls.size - unchecked.length}/${citedUrls.size} cited URLs resolve to non-empty evidence bytes`);
// ODbL attribution URLs are not "read" documents, they are licence pointers; do not let them
// masquerade as verified sources.
const LICENCE_POINTERS = new Set(['https://www.openstreetmap.org/copyright', 'https://opendatacommons.org/licenses/odbl/1-0/']);
for (const u of unchecked.filter((u) => !LICENCE_POINTERS.has(u))) {
  fail('EVIDENCE_UNBOUND', 'evidence/', `cited source has no evidence binding, so "was it opened?" cannot be checked: ${u}`);
}
if (unchecked.some((u) => LICENCE_POINTERS.has(u))) notes.push('licence-pointer URLs (ODbL text, OSM copyright) are declared as pointers, not as opened documents — deliberately not counted as verified sources');
if (!missingBytes.length && !unchecked.filter((u) => !LICENCE_POINTERS.has(u)).length) ok('A2', 'every non-pointer cited URL is bound to a named evidence file');

// ---- B: ODbL half present and hashed ----------------------------------------
const odblFile = join(PACKDIR, 'kyoto-shijo-osm-places.json');
if (!existsSync(odblFile)) fail('ODBL_HALF_MISSING', 'kyoto-shijo-osm-places.json', 'the ODbL separation file is absent, so place records reference nothing');
else {
  const odbl = readJson(odblFile);
  const ha = sha256(odblFile);
  ok('B', `ODbL half present: ${basename(odblFile)} ${statSync(odblFile).size} B sha256 ${ha.slice(0, 16)}…, ${odbl.places.length} rows`);
  const odblIds = new Set(odbl.places.map((r) => r.placeId));
  for (const p of places) {
    if (!p.osmRecord) continue;
    const m = /placeId=([^\]}]+)/.exec(p.osmRecord);
    if (!m) { fail('ODBL_REF_BAD', `places[${p.id}]`, `osmRecord is not a placeId reference: ${p.osmRecord}`); continue; }
    if (!odblIds.has(m[1])) fail('ODBL_REF_DANGLING', `places[${p.id}]`, `osmRecord points at ${m[1]}, which is not in ${basename(odblFile)}`);
    // H: the coordinate in our file must be the one in the ODbL file, not a silent re-derivation
    const row = odbl.places.find((r) => r.placeId === m[1]);
    if (row && (row.latUdeg !== p.latUdeg || row.lonUdeg !== p.lngUdeg)) {
      fail('ODBL_VALUE_DRIFT', `places[${p.id}]`, `latUdeg/lngUdeg ${p.latUdeg},${p.lngUdeg} != ODbL half ${row.latUdeg},${row.lonUdeg}`);
    }
  }
  const unref = places.filter((p) => p.origin === 'osm' && !p.osmRecord);
  if (unref.length) fail('ODBL_UNREFERENCED', 'places.json', `${unref.length} records declare origin=osm but carry no osmRecord reference`);
  ok('H', 'every origin=osm record reaches its coordinate through osmRecord and the values match the ODbL half');
}

// ---- C/E: coordinates, both spellings, consistent, integer-typed -------------
const CONFIDENCE_FIELDS = ['confidence', 'score', 'certainty', 'trust', 'reliability'];
let coordChecked = 0;
for (const p of places) {
  const at = `places[${p.id}]`;
  if (!Number.isInteger(p.latUdeg) || !Number.isInteger(p.lngUdeg)) { fail('COORD_NOT_INTEGER', at, `latUdeg/lngUdeg must be integers (microdegrees), got ${JSON.stringify(p.latUdeg)},${JSON.stringify(p.lngUdeg)}`); continue; }
  if (typeof p.lat !== 'number' || typeof p.lng !== 'number') { fail('COORD_TWIN_MISSING', at, 'lat/lng decimal twin missing; the stock validator reads these, so they must be present and derived'); continue; }
  const tLat = Number((p.latUdeg / 1e6).toFixed(6));
  const tLng = Number((p.lngUdeg / 1e6).toFixed(6));
  if (tLat !== p.lat || tLng !== p.lng) fail('COORD_TWIN_DRIFT', at, `decimal twin (${p.lat},${p.lng}) is not the conversion of (${p.latUdeg},${p.lngUdeg}) -> (${tLat},${tLng})`);
  else coordChecked++;
  if (p.latUdeg === 0 && p.lngUdeg === 0) fail('NULL_ISLAND', at, 'coordinates are (0,0)');
  for (const f of CONFIDENCE_FIELDS) if (Object.prototype.hasOwnProperty.call(p, f)) fail('CONFIDENCE_FIELD', at, `agent-assessed field "${f}" is not mechanically checkable and must not be in the fact layer`);
}
if (coordChecked === places.length) ok('C', `${coordChecked} place records: integer microdegree pair and decimal twin both present and mutually consistent`);

// ---- D/F: hours, admission, closedDays, fares each carry their own provenance --
const isoOk = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v)) && Date.parse(v) <= Date.now() + 864e5;
let hChecked = 0; let aChecked = 0;
// Every record that carries facts, whether or not it earned a place row. An ungeoreferenced
// record still has to tier and provenance its hours and fees — that is the whole reason it is
// kept in the pack rather than deleted.
const allPlaceLike = [...places, ...(pack.ungeoreferencedPlaces ?? [])];
for (const p of allPlaceLike) {
  const at = `places[${p.id}]`;
  for (const [i, h] of (p.hours ?? []).entries()) {
    if (!h.source_url || !/^https?:/.test(h.source_url)) fail('HOURS_NO_SOURCE', at, `hours[${i}] has no source_url`);
    else hChecked++;
    if (!isoOk(h.verified_at ?? p.verified_at)) fail('HOURS_NO_VERIFIED_AT', at, `hours[${i}] has no usable verified_at`);
    if (typeof h.open !== 'string' || typeof h.close !== 'string' || !/^\d{2}:\d{2}$/.test(h.open) || !/^\d{2}:\d{2}$/.test(h.close)) {
      fail('HOURS_NOT_CLOCK', at, `hours[${i}] open/close must be HH:MM clock strings, got ${JSON.stringify(h.open)}/${JSON.stringify(h.close)}`);
    }
  }
  const items = p.admission?.items ?? [];
  for (const [i, it] of items.entries()) {
    if (!Number.isInteger(it.amount)) fail('FARE_NOT_INTEGER', at, `admission.items[${i}].amount must be an integer minor unit, got ${JSON.stringify(it.amount)}`);
    if (!it.source_url || !/^https?:/.test(it.source_url)) fail('FARE_NO_SOURCE', at, `admission.items[${i}] ("${it.labelJa}") has no source_url of its own`);
    else aChecked++;
  }
  if (Object.keys(p.admission ?? {}).length && items.length === 0) fail('ADMISSION_UNSOURCED', at, 'admission object has no sourced items — a bare admission object cannot be checked');
  for (const [i, c] of (p.closedDays ?? []).entries()) {
    if (!c || typeof c !== 'object' || !c.source_url || !isoOk(c.verified_at)) {
      fail('CLOSEDDAYS_NO_SOURCE', at, `closedDays[${i}] must be an object with its own source_url + verified_at; free text is not mechanically checkable`);
    }
  }
}
if (hChecked) ok('D-hours', `${hChecked} hours entries each carry their own source_url`);
if (aChecked) ok('D-admission', `${aChecked} admission items each carry their own source_url`);

// ---- E/F: transit -------------------------------------------------------------
const placeIds = new Set(places.map((p) => p.id));
const ungeoIds = new Set((pack.ungeoreferencedPlaces ?? []).map((p) => p.id));
const walkRule = pack.transit?.walkTimeRule;
if (!walkRule || walkRule.metresPerMinute !== 80 || walkRule.rounding !== 'ceil' || !/^https?:/.test(walkRule.source_url ?? '')) {
  fail('WALK_RULE_UNSOURCED', 'pack.json', 'transit.walkTimeRule must carry metresPerMinute=80, rounding=ceil and a source_url');
} else ok('F-walkrule', `walk rule sourced: ${walkRule.source_url}`);

for (const l of transit) {
  const at = `transit[${l.id ?? '?'}]`;
  for (const k of ['from', 'to']) {
    const v = l[k];
    if (ungeoIds.has(v)) fail('REF_UNGEOREFERENCED', at, `${k}=${v} is an ungeoreferenced place; it has no coordinate and cannot be a leg endpoint`);
    else if (!placeIds.has(v)) fail('REF_UNKNOWN', at, `${k}=${v} resolves to no record at all`);
  }
  if (!Number.isInteger(l.minutes) || l.minutes <= 0) fail('MINUTES_NOT_INTEGER', at, `minutes must be a positive integer, got ${JSON.stringify(l.minutes)}`);
  if (l.mode === 'walk') {
    if (l.fareIC !== null || l.fareTicket !== null) fail('WALK_HAS_FARE', at, 'a walk leg must not carry a fare');
  }
  if (l.alongStreetM !== null && l.alongStreetM !== undefined) {
    if (typeof l.alongStreetM !== 'number') fail('DISTANCE_NOT_NUMBER', at, 'alongStreetM must be a number or null');
    else {
      const expect = Math.max(1, Math.ceil(l.alongStreetM / 80));
      if (expect !== l.minutes) fail('MINUTES_MISMATCH', at, `alongStreetM ${l.alongStreetM} implies ${expect} min under the sourced 80 m/min ceil rule, but minutes=${l.minutes}`);
    }
  }
  // A leg's minutes must rest on something checkable, and there are three legitimate bases:
  //   alongStreetM       measured along the 四条通 chain (the corridor legs)
  //   measuredStraightM  measured between two OSM centres (the temple legs, which leave the street)
  //   operator-published the operator states the walking time themselves
  // A straight line is a weaker basis than a route distance and the record labels it as such, but
  // it is a measurement with a citable origin — unlike a plausible-looking number.
  if (l.minutesProvenance !== 'operator-published' && l.alongStreetM === null && l.measuredStraightM === undefined) {
    fail('LEG_NO_BASIS', at, 'a leg with neither a measured distance nor an operator-published duration has no checkable basis for its minutes');
  }
  if (l.measuredStraightM !== undefined) {
    if (typeof l.measuredStraightM !== 'number' || l.measuredStraightM <= 0) {
      fail('DISTANCE_NOT_NUMBER', at, `measuredStraightM must be a positive number or absent, got ${JSON.stringify(l.measuredStraightM)}`);
    } else if (Number.isInteger(l.minutes)) {
      // A route cannot be shorter than the straight line between its ends, so a published minute
      // count below the straight-line floor is the one direction in which the two quantities
      // CONTRADICT rather than merely differ. Divergence upward is fine and is recorded; this is not.
      const floorMin = Math.max(1, Math.ceil(l.measuredStraightM / 80));
      if (l.minutes < floorMin) {
        fail('MINUTES_IMPOSSIBLE', at, `${l.minutes} min is below the straight-line floor: ${l.measuredStraightM} m cannot be walked in under ${floorMin} min at 80 m/min, so the published figure and the measurement contradict each other`);
      }
    }
  }
  if (l.fareIC !== null && l.fareTicket !== null && l.fareIC !== l.fareTicket && !l.fareDifferenceSource_url) {
    fail('FARE_DIFF_UNSOURCED', at, `fareIC ${l.fareIC} != fareTicket ${l.fareTicket} with no source for the difference`);
  }
  for (const k of ['fareIC', 'fareTicket']) {
    if (l[k] !== null && !Number.isInteger(l[k])) fail('FARE_NOT_INTEGER', at, `${k} must be an integer minor unit or null, got ${JSON.stringify(l[k])}`);
  }
  if (!Number.isInteger(l.transfers) || l.transfers < 0) fail('TRANSFERS_NOT_INTEGER', at, `transfers must be a non-negative integer, got ${JSON.stringify(l.transfers)}`);
  if (!l.provenance?.valueKind) fail('LEG_NO_VALUEKIND', at, 'every leg must declare provenance.valueKind');
  else if (!VALUE_KINDS.includes(l.provenance.valueKind)) fail('VALUEKIND_BAD', at, `valueKind must be one of ${VALUE_KINDS.join('|')} (imported from world-grid.mjs), got ${JSON.stringify(l.provenance.valueKind)}`);
}
ok('F', `${transit.length} transit legs: endpoints resolve, minutes are integers, walk legs carry no fare, measured legs satisfy the sourced ceil(d/80) rule`);

// ---- N: valueKind on every record and sub-fact, against the frozen enum --------
// Two things are checked, because they fail differently:
//   1. every declared valueKind is a member of the frozen enum (no invented label);
//   2. `authored`, `licenced` and `abstract` records set guideVerifiedColumnAllowed false.
//      Only `observed` may reach the guide's verified column, and a record that claims
//      otherwise is the failure clause 4 was written about: "visited" endorsing a template.
const seenKinds = new Map();
const gateOffenders = [];
const scanKinds = (label, kind, allowed) => {
  if (kind === undefined) return;
  seenKinds.set(kind, (seenKinds.get(kind) ?? 0) + 1);
  if (!VALUE_KINDS.includes(kind)) { fail('VALUEKIND_BAD', label, `"${kind}" is not in the frozen enum ${VALUE_KINDS.join('|')}`); return; }
  const mustBeGatedOff = !GUIDE_VERIFIED_COLUMN_ALLOWED.includes(kind);
  if (mustBeGatedOff && allowed === true) gateOffenders.push(`${label}: valueKind=${kind} but guideVerifiedColumnAllowed=true`);
};
for (const p of allPlaceLike) {
  scanKinds(`places[${p.id}]`, p.provenance?.valueKind, p.provenance?.guideVerifiedColumnAllowed);
  for (const [field, kind] of Object.entries(p.provenance?.valueKindPerField ?? {})) {
    if (kind === 'absent') continue;
    seenKinds.set(kind, (seenKinds.get(kind) ?? 0) + 1);
    if (!VALUE_KINDS.includes(kind)) fail('VALUEKIND_BAD', `places[${p.id}].${field}`, `"${kind}" is not in the frozen enum ${VALUE_KINDS.join('|')}`);
  }
  if (p.entrances?.valueKind) scanKinds(`places[${p.id}].entrances`, p.entrances.valueKind, p.entrances.guideVerifiedColumnAllowed);
}
for (const l of transit) {
  scanKinds(`transit[${l.id}]`, l.provenance?.valueKind, l.provenance?.guideVerifiedColumnAllowed);
  for (const k of ['distanceValueKind', 'minutesValueKind']) scanKinds(`transit[${l.id}].${k}`, l.provenance?.[k], undefined);
}
if (gateOffenders.length) for (const g of gateOffenders) fail('GUIDE_GATE_OPEN', 'places.json', g);
else ok('N', `every valueKind is a member of the frozen enum ${VALUE_KINDS.join('|')}; usage ${[...seenKinds.entries()].map(([k, n]) => `${k}:${n}`).join(', ')}`);

// ---- O: a refused guide gate must SAY WHY, and the refusal must actually hold ----
//
// THE DEFECT THIS EXISTS FOR. Two independent gates decide whether a value may appear in the
// guide's "verified" column: `valueKind` (must be `observed`) and the per-record permission
// `guideVerifiedColumnAllowed`. The fact layer DECLARED the second gate but nothing in the fact
// layer ENFORCED it — only the export side caught a violation, and only during task-16, after its
// first run had already printed an invented name under a heading that means "a human opened a
// source and read this".
//
// So: `valueKind === 'observed'` does NOT imply "may appear in the verified column". A gate that is
// declared but unenforced is not a gate, it is a comment, and the next consumer — a memoir, a
// second city, a UI — has no reason to know it exists.
//
// Two things are asserted:
//   1. ALIGNMENT — if any per-field entry declares a non-`observed` kind, the holder's own gate must
//      be closed. This is what makes the refusal enforced rather than merely declared, and it is the
//      rule that catches the shape the audit found: a record whose `nameJa` is curator-written while
//      the record still says it may enter the verified column.
//   2. REASON — every closed gate states why, in at least one of the fields that exist for the
//      purpose. A refusal with no reason tells the next curator "no" without telling them what would
//      change the answer.
//
// NOT asserted, deliberately: that an `observed` field on a closed-gate record is a contradiction.
// It is not. `latUdeg` on the 四条烏丸 crossing really was read off OSM and is legitimately
// `observed`; the record is barred from the verified column because ONE of its names is ours, not
// because its coordinates are unsound. Conflating "this field is unverified" with "this record may
// not be presented as verified" would have been my error, and the first version of this check made
// exactly that mistake against 8 fields. The observed fields on such a record are therefore COUNTED
// and reported, so the judgement stays visible instead of silently assumed.
const gateWithoutReason = [];
const gateMisaligned = [];
const closedGates = [];

const auditGate = (label, holder, reasonFields, perField) => {
  const allowed = holder?.guideVerifiedColumnAllowed;
  const entries = Object.entries(perField ?? {}).filter(([, k]) => k && k !== 'absent');
  const nonObserved = entries.filter(([, k]) => k !== 'observed');
  const observed = entries.filter(([, k]) => k === 'observed');

  // 1. alignment: a non-observed field with an open gate is the defect
  if (nonObserved.length && allowed !== false) {
    gateMisaligned.push(`${label}: ${nonObserved.map(([f, k]) => `${f}=${k}`).join(', ')} but guideVerifiedColumnAllowed=${JSON.stringify(allowed)} — the holder may enter the guide's verified column while carrying a value that may not`);
  }
  if (allowed !== false) return;

  closedGates.push({ label, nonObserved: nonObserved.map(([f]) => f), observedCount: observed.length });

  // 2. reason
  const raw = reasonFields.map((f) => holder?.[f]).find((v) => typeof v === 'string' && v.trim().length > 0);
  if (!raw || raw.trim().length < 40) {
    gateWithoutReason.push(`${label}: guideVerifiedColumnAllowed=false but none of ${reasonFields.join('/')} states why (${raw ? `${raw.trim().length} chars, too short to be a reason` : 'absent'})`);
  }
};

for (const p of allPlaceLike) {
  auditGate(`places[${p.id}]`, p.provenance, ['whyNotObserved', 'guideGateNote'], p.provenance?.valueKindPerField);
  if (p.entrances) auditGate(`places[${p.id}].entrances`, p.entrances, ['whyNotObserved', 'whyAuthored'], p.entrances.valueKindPerField);
}
for (const l of transit) auditGate(`transit[${l.id}]`, l.provenance, ['whyNotObserved', 'guideGateNote'], l.provenance?.valueKindPerField);

for (const g of gateMisaligned) fail('GATE_MISALIGNED', 'fact layer', g);
for (const g of gateWithoutReason) fail('GATE_WITHOUT_REASON', 'fact layer', g);
if (closedGates.length === 0) {
  // A check that examined nothing is not a passing check — say so rather than reporting green.
  notes.push('no holder refuses the guide verified column, so check O had nothing to examine in this pack');
} else if (!gateWithoutReason.length && !gateMisaligned.length) {
  const detail = closedGates.map((c) => (c.nonObserved.length
    ? `${c.label} (refuses ${c.nonObserved.join(', ')}; ${c.observedCount} observed field(s) remain, legitimately so)`
    : `${c.label} (whole-record refusal)`)).join('; ');
  ok('O', `${closedGates.length} refused guide gate(s), each aligned with its per-field kinds and carrying a stated reason: ${detail}`);
}

// fareReference integrity
for (const [i, f] of (pack.transit?.fareReference ?? []).entries()) {
  const at = `pack.transit.fareReference[${i}]`;
  if (f.fareAdult !== undefined && !Number.isInteger(f.fareAdult)) fail('FARE_NOT_INTEGER', at, 'fareAdult must be an integer');
  if (!f.source_url || !isoOk(f.verified_at)) fail('FARE_REF_UNSOURCED', at, 'fareReference entries need source_url + verified_at');
  if (!f.whyReferenceOnly) fail('FARE_REF_NO_REASON', at, 'a fare that is not attached to a leg must say why');
}

// ---- I: freshness tiers -------------------------------------------------------
const QUARTER_MS = 92 * 24 * 3600 * 1000;
const now = Date.now();
const SEMI = ['hours', 'admission', 'closedDays'];
let semiCount = 0;
for (const p of allPlaceLike) {
  if (!p.factTier) { fail('NO_FACT_TIER', `places[${p.id}]`, 'record must declare factTier (static | semi-static | dynamic)'); continue; }
  if (!['static', 'semi-static', 'dynamic'].includes(p.factTier)) { fail('FACT_TIER_BAD', `places[${p.id}]`, `factTier must be static|semi-static|dynamic, got ${JSON.stringify(p.factTier)}`); continue; }
  const carried = SEMI.filter((k) => (Array.isArray(p[k]) ? p[k].length : Object.keys(p[k] ?? {}).length) > 0);
  if (carried.length) {
    semiCount++;
    if (p.factTier !== 'semi-static') fail('TIER_UNDERSTATED', `places[${p.id}]`, `carries ${carried.join('/')} (semi-static by the skill's freshness table) but declares factTier=${p.factTier}`);
    const age = now - Date.parse(p.verified_at);
    if (!(age >= 0)) fail('VERIFIED_IN_FUTURE', `places[${p.id}]`, `verified_at ${p.verified_at} is in the future`);
    else if (age > QUARTER_MS) fail('SEMI_STATIC_STALE', `places[${p.id}]`, `semi-static facts verified ${Math.round(age / 864e5)} days ago; the quarterly review is overdue`);
  } else if (p.factTier === 'semi-static') {
    fail('TIER_OVERSTATED', `places[${p.id}]`, 'declares semi-static but carries no semi-static field');
  }
}
// A check that examines zero records is not a passing check. Say so out loud.
ok('I', `freshness tiers declared on all ${allPlaceLike.length} records; ${semiCount} carry hours/admission/closedDays and every one of those is tiered semi-static inside the quarterly window`);
if (semiCount === 0) notes.push('check I examined 0 semi-static records in this pack — the tier rules were not exercised by real data');

// ---- G: door coverage declaration ---------------------------------------------
const doorsFile = join(PACKDIR, 'doors.json');
if (existsSync(doorsFile)) {
  const doors = readJson(doorsFile);
  const doorIds = doors.doors.map((d) => d.doorId);
  const declared = places.flatMap((p) => p.entrances?.doorIds ?? []);
  const miss = doorIds.filter((d) => !declared.includes(d));
  const extra = declared.filter((d) => !doorIds.includes(d));
  if (miss.length || extra.length) fail('DOOR_COVERAGE', 'places.json', `doorId mismatch vs doors.json: missing ${JSON.stringify(miss)}, unknown ${JSON.stringify(extra)}`);
  else ok('G', `all ${doorIds.length} authored doorIds are declared by a building record, and no record invents a door`);
  // the doors must NOT be place records (no name, no position)
  const asPlaces = places.filter((p) => /^kyoto-shijo-door-/.test(p.id));
  if (asPlaces.length) fail('DOOR_AS_PLACE', 'places.json', `${asPlaces.length} door records were given place status; door names are type words and no source states a doorway position`);
}

// ---- K: pack.json scope counts must be DERIVED, not stated ---------------------
// A hand-written count is a second source of truth and decays silently: pack.json claimed 22
// places while places.json held 19 and nothing compared them. Every count is recomputed here.
const odblDoc = existsSync(odblFile) ? readJson(odblFile) : { places: [] };
const trueCounts = {
  places: places.length,
  transitLegs: transit.length,
  sources: Object.keys(pack.placeSources ?? {}).length,
  placeGaps: (pack.placeGaps ?? []).length,
  placeGapNotes: (pack.placeGapNotes ?? []).length,
  contradictions: (pack.contradictions ?? []).length,
  transitGaps: (pack.transit?.gaps ?? []).length,
  transfers: (pack.transit?.transfers ?? []).length,
  fareReferences: (pack.transit?.fareReference ?? []).length,
  ungeoreferencedPlaces: (pack.ungeoreferencedPlaces ?? []).length,
  droppedLegs: (pack.ungeoreferencedLegs ?? []).length,
  authoredDoors: existsSync(doorsFile) ? readJson(doorsFile).doors.length : 0,
  doorsDeclaredInPlaces: places.flatMap((p) => p.entrances?.doorIds ?? []).length,
  odblRows: odblDoc.places.length,
};
{
  const attPath = join(PACKDIR, 'attestations', 'ungeoreferenced-places.json');
  const attLegs = join(PACKDIR, 'attestations', 'dropped-legs.json');
  const attSrc = join(PACKDIR, 'attestations', 'source-attestations.json');
  for (const f of [attPath, attLegs, attSrc, join(PACKDIR, 'attestations', 'block-doors.json')]) {
    if (!existsSync(f) || statSync(f).size === 0) fail('ATTESTATION_MISSING', 'attestations/', `${basename(f)} is declared by pack.json but absent or empty`);
  }
  if (existsSync(attPath)) trueCounts.ungeoreferencedPlaces = readJson(attPath).places.length;
  if (existsSync(attLegs)) trueCounts.droppedLegs = readJson(attLegs).legs.length;
  if (existsSync(attSrc)) {
    const srcDoc = readJson(attSrc);
    for (const [k, s] of Object.entries(srcDoc.sources ?? {})) {
      if (!s.whatIRead || s.whatIRead.length < 40) fail('ATTESTATION_THIN', `placeSources.${k}`, 'whatIRead must record what was actually found on the page, not just that the URL exists');
      if (!s.url || !/^https?:/.test(s.url)) fail('ATTESTATION_NO_URL', `placeSources.${k}`, 'attestation without a URL');
    }
    ok('L', `${Object.keys(srcDoc.sources ?? {}).length} sources carry a written attestation kept at attestations/source-attestations.json`);
  }
  const mismatch = [];
  for (const [k, v] of Object.entries(trueCounts)) {
    if (pack.scope[k] !== v) mismatch.push(`${k}: pack.json says ${JSON.stringify(pack.scope[k])}, files say ${v}`);
  }
  if (!Array.isArray(pack.scope.countsDerivedFrom) || pack.scope.countsDerivedFrom.length === 0) fail('COUNTS_UNDECLARED', 'pack.json', 'scope must declare which files its counts are derived from');
  if (!pack.scope.countsAssertedBy) fail('COUNTS_UNASSERTED', 'pack.json', 'scope must name the check that asserts its counts');
  if (mismatch.length) for (const m of mismatch) fail('SCOPE_COUNT_DRIFT', 'pack.json', m);
  else ok('K', `${Object.keys(trueCounts).length} scope counts re-derived from the files and all match`);
}

// ---- M: the shipped fact files must not carry OSM-sourced VALUES inline ---------
// The ODbL separation only holds if our two fact files hold references, not OSM content.
// Coordinates are the one deliberate exception and are declared as such: they are OSM-derived
// and are the reason GAP-6 exists, while their authoritative copy lives in the ODbL half and
// check B asserts the two agree.
const OSM_TAG_KEYS = ['osmBuildingId', 'osmBuildingName', 'osmNodeId', 'osmWayId', 'osmRef', 'osmTags', 'tags', 'geometry', 'facadeLineRun', 'observedAnchors', 'placement'];
const COORD_EXCEPTION = ['latUdeg', 'lngUdeg', 'lat', 'lng'];
const inlineOsm = [];
const scanOsm = (label, rec) => {
  for (const k of Object.keys(rec)) if (OSM_TAG_KEYS.includes(k)) inlineOsm.push(`${label}.${k}`);
};
for (const p of places) scanOsm(`places[${p.id}]`, p);
for (const l of transit) scanOsm(`transit[${l.id ?? '?'}]`, l);
if (inlineOsm.length) for (const m of inlineOsm) fail('ODBL_VALUE_INLINE', 'places.json/transit.json', `${m} carries an OSM-derived value inline; it belongs in kyoto-shijo-osm-places.json and must be reached by osmRecord`);
else ok('M', `no OSM tag or geometry value appears inline in places.json or transit.json (coordinate exception declared: ${COORD_EXCEPTION.join(', ')})`);
{
  const coords = places.filter((p) => 'latUdeg' in p).length;
  notes.push(`ODbL boundary: ${coords} place records carry an integer microdegree coordinate inline. Coordinates are OSM-derived, so the authoritative copy is kyoto-shijo-osm-places.json and check B(ODBL_VALUE_DRIFT) asserts the inline value equals it; that is the declared exception, not an oversight.`);
}

// ---- report -------------------------------------------------------------------
const emit = JSON_MODE
  ? (obj) => process.stdout.write(JSON.stringify(obj) + '\n')
  : null;
const report = {
  tool: 'validate-city-pack-v2',
  packDir: PACKDIR,
  repo: REPO,
  passed: checks.length,
  failed: violations.length,
  exitCode: violations.length === 0 ? 0 : 1,
  checks: checks.map((c) => ({ id: c.id, ok: true, detail: c.detail })),
  violations: violations.map((v) => ({ code: v.code, at: v.at, msg: v.msg })),
  notes,
  evidenceFiles: evidenceFiles.length,
  evidenceSha256: Object.fromEntries(evidenceHashes),
};

if (JSON_MODE) {
  emit(report);
  process.exit(report.exitCode);
}

console.log(`validate-city-pack-v2 — ${PACKDIR}`);
console.log(`repo ${REPO}`);
for (const c of checks) console.log(`  PASS  ${c.id.padEnd(14)} ${c.detail}`);
for (const n of notes) console.log(`  note             ${n}`);
if (violations.length === 0) {
  console.log(`\n${checks.length} checks passed, 0 violations.`);
  console.log(`evidence: ${evidenceFiles.length} files, ${[...evidenceHashes.values()].length} sha256 recorded`);
  process.exit(0);
}
console.error(`\nFAIL  ${violations.length} violation(s):\n`);
const byCode = new Map();
for (const v of violations) { if (!byCode.has(v.code)) byCode.set(v.code, []); byCode.get(v.code).push(v); }
for (const [code, list] of byCode) {
  console.error(`  [${code}] ${list.length}`);
  for (const v of list) console.error(`      ${v.at}: ${v.msg}`);
}
console.error('\n  Fix by opening a real source, or by DELETING the record. Never substitute a plausible value.');
process.exit(1);
