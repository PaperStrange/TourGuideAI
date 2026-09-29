#!/usr/bin/env node
/**
 * emit-guide.mjs — build-time emitter: fact layer + scene -> a route guide a
 * player can carry into 四条通.
 *
 * WHY THIS EXISTS
 * ---------------
 * Until now the repository could bake a scene binary (`emit-scene.mjs`) and
 * validate a fact table (`validate-city-pack-v2.mjs`), and could NOT produce a
 * route. `assert-export-boundary.mjs` (task-4) guards the export boundary and
 * has had nothing behind the door since. This is what goes behind it.
 *
 * It imports the contract; it does not restate it. ORIGIN, worldGrid, GRID,
 * PROJECTION, VALUE_KIND(S), GUIDE_VERIFIED_COLUMN_ALLOWED, contractFingerprint,
 * projectMicroDeg, quantizeToSubTile and locateSubTile all come from
 * `world-grid.mjs`. Any number this file appears to "know" that also lives in
 * the contract is a bug. `mayAppearInGuideVerifiedColumn` — not a copied
 * `['observed']` — decides the verified column.
 *
 * WHERE THE ROUTE COMES FROM (recorded, because it is a decision)
 * --------------------------------------------------------------
 * There is NO itinerary in the fact layer: `places.json` is 22 places,
 * `transit.json` is 9 legs, and `pack.json` carries no itinerary / routePlan /
 * walkOrder field (searched: iteration/design/*.md, pack.json, iteration/tools/*.mjs
 * -> zero hits). Per design-core section 4 the itinerary is layer (3) ITIN,
 * derived from the PLAYER'S ACTION LOG — and no action log exists, because
 * Gate 1 has not started.
 *
 * So this emitter does not invent a playthrough. It does the literal thing the
 * "one-click generate a route guide" promise says: walk the CURATED CHAIN in
 * `transit.json` from the frozen ORIGIN eastward and emit a stop at every
 * endpoint of that chain. The chain is curation, every leg carries a
 * source_url and a valueKind, and no route is computed from coordinates.
 *
 * USAGE
 *   node iteration/tools/emit-guide.mjs                  emit + report
 *   node iteration/tools/emit-guide.mjs --json           machine-readable report
 *   node iteration/tools/emit-guide.mjs --out-dir <dir>
 *
 * Exit codes: 0 = emitted, 1 = a fact-layer precondition failed (this is a
 * BUILD FAILURE, not a warning), 2 = environment (input missing/unreadable).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '../..');

const CONTRACT = await import(
  new URL('../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', import.meta.url).href
);
const {
  ORIGIN,
  worldGrid,
  GRID,
  VALUE_KIND,
  VALUE_KINDS,
  GUIDE_VERIFIED_COLUMN_ALLOWED,
  mayAppearInGuideVerifiedColumn,
  projectMicroDeg,
  quantizeToSubTile,
  locateSubTile,
  contractFingerprint,
  sha256Hex,
} = CONTRACT;

/**
 * scene.bin reader.
 *
 * WHY THIS IS LOCAL AND NOT IMPORTED FROM emit-scene.mjs
 * -----------------------------------------------------
 * It was imported from `emit-scene.mjs` at first, on the principle "reuse the
 * container's own reader rather than re-deriving the header". That is the right
 * principle, and it broke: `emit-scene.mjs` is mid-change by another owner and
 * currently does not parse at all (an orphaned comment body after a duplicate
 * `const FRONTAGE_BAND_DEPTH_M`), so the guide emitter could not run — a build
 * dependency on a file in flux.
 *
 * The reader is therefore local, and the CONTAINER IS NOT TRUSTED: the header
 * layout is re-asserted below (magic, version, dims, contract hash, manifest
 * bounds) instead of assumed, and `validate-guide.mjs` G2 re-reads the contract
 * hash at the same offsets to cross-check. The layout is frozen by
 * `emit-scene.mjs#packScene` and by the contract document; if it changes, these
 * checks fail loudly rather than reading garbage.
 */
import { SCENE_MAGIC, SCENE_VERSION } from './emit-scene.mjs';
// Imported, not copied. This is the second half of the same D-12 lesion the card fixed for
// SCENE_VERSION: a reader carrying its own format id cannot notice that the container changed
// format. Verified the hard way -- gate-scene-read.mjs held ersion === 1 as a literal and kept
// passing R3 while the emitter had moved to version 2, and only R7, which does real arithmetic on
// the layer lengths, still caught it.

function unpackScene(buf) {
  if (buf.length < 108) throw new Error(`scene.bin is only ${buf.length} B — too small to be a container`);
  if (buf.toString('ascii', 0, 8) !== SCENE_MAGIC) {
    throw new Error(`scene.bin magic is ${JSON.stringify(buf.toString('ascii', 0, 8))}, expected ${SCENE_MAGIC}`);
  }
  const version = buf.readUInt32LE(8);
  if (version !== SCENE_VERSION) throw new Error(`scene.bin version ${version}, expected ${SCENE_VERSION}`);
  const wTiles = buf.readUInt32LE(12);
  const hTiles = buf.readUInt32LE(16);
  const chunksAlongX = buf.readUInt32LE(20);
  const lonUdeg = Number(buf.readBigInt64LE(24));
  const latUdeg = Number(buf.readBigInt64LE(32));
  const contractHash = buf.toString('ascii', 40, 104);
  const manifestLen = buf.readUInt32LE(104);
  const layerBytes = wTiles * hTiles * 3 + wTiles;
  const expected = 108 + manifestLen + layerBytes;
  if (manifestLen <= 0 || expected !== buf.length) {
    throw new Error(
      `scene.bin header disagrees with its own length: ${wTiles}x${hTiles} + manifest ${manifestLen} ` +
        `implies ${expected} B, file is ${buf.length} B`,
    );
  }
  let o = 108;
  const manifest = JSON.parse(buf.toString('utf8', o, o + manifestLen));
  o += manifestLen;
  const n = wTiles * hTiles;
  const ground = buf.subarray(o, o + n);
  o += n;
  const collision = buf.subarray(o, o + n);
  o += n;
  const heights = buf.subarray(o, o + n);
  o += n;
  const occlusionHalf = buf.subarray(o, o + wTiles);
  return { version, wTiles, hTiles, chunksAlongX, lonUdeg, latUdeg, contractHash, manifest, ground, collision, heights, occlusionHalf };
}

/* ------------------------------------------------------------------ *
 * Constants that are OURS, not the contract's
 * ------------------------------------------------------------------ */

const PACK_DIR = 'city-packs/kyoto-shijo';
const SCENE_PATH = 'build/scene.bin';
const DEFAULT_OUT_DIR = 'build';

const GUIDE_SCHEMA = 'tourguide.guide/v1';

/**
 * The export language. v1 ships ONE language but keeps the structure right
 * (contract-export.md section 7): adding a language must be adding one array
 * entry, not a data-shape change.
 */
const EXPORT_LANGUAGE = 'zh-Hans';
const PLACE_NAME_FIELDS = ['nameZh', 'nameJa', 'nameEn'];

/**
 * Words the guide may not use about the route. The route is a deterministic
 * projection of a curated chain, NOT a recommendation — so promotional framing
 * would be a claim this layer cannot back. Asserted by validate-guide.mjs.
 */
const FORBIDDEN_ROUTE_WORDS = ['推荐', '最佳', '必去', '不容错过', 'recommended', 'must-see', 'best'];

function die(code, msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

function readJson(path) {
  const abs = resolve(REPO, path);
  if (!existsSync(abs)) die(2, `input not found: ${path}`);
  try {
    return JSON.parse(readFileSync(abs, 'utf8'));
  } catch (e) {
    die(2, `input is not JSON: ${path}\n  ${e.message}`);
  }
}

function sha256File(relPath) {
  const abs = resolve(REPO, relPath);
  if (!existsSync(abs)) die(2, `input not found for hashing: ${relPath}`);
  return sha256Hex(readFileSync(abs));
}

/** Round to fixed decimals as a NUMBER, so JSON output is stable across runs. */
function fixed(n, d = 2) {
  return Number(Number(n).toFixed(d));
}

/* ------------------------------------------------------------------ *
 * 1. Fact layer -> cells with a valueKind each
 * ------------------------------------------------------------------ */

/**
 * Project a place into the frozen window.
 *
 * `alongStreetM` is x_m — "distance along 四条通 from this slice's origin". It
 * is NOT a coordinate and must never be printed as one (contract section 0.1;
 * ge-pipeline contract section 5 counter-example A). It exists to order stops
 * and to tell the reader how far they walk.
 */
function projectPlace(p) {
  const { x_m, y_m } = projectMicroDeg(p.lngUdeg, p.latUdeg, ORIGIN);
  const sub = quantizeToSubTile(x_m, y_m);
  const at = locateSubTile(sub.subX, sub.subY);
  return {
    alongStreetM: fixed(x_m),
    acrossStreetM: fixed(y_m),
    tileX: at.tileX,
    row: at.row,
    inSceneWindow: at.inWindow,
  };
}

/**
 * Build the per-field cells for a place.
 *
 * `valueKindPerField` is authoritative WHERE IT EXISTS: the fact layer records
 * that e.g. a place's `nameZh` is a curator translation rather than an OSM tag.
 * Falling back to the record-level `valueKind` would silently promote those
 * fields, which is the promotion contract clause 4 exists to stop.
 */
function placeCells(p) {
  const prov = p.provenance || {};
  const perField = prov.valueKindPerField || {};
  const recordKind = prov.valueKind;
  const recordGate = prov.guideVerifiedColumnAllowed === true;
  const cells = [];

  const name = pickPlaceName(p);
  /**
   * The exported name is whichever language field was non-empty, so its kind must
   * be looked up under THAT field's name (`nameZh` / `nameJa` / `nameEn`) — not
   * under the generic key `name`.
   *
   * Getting this wrong is a silent promotion: `kyoto-shijo-subway-shijo-exit1`
   * carries `valueKindPerField.nameZh = "licenced"` (a curator-written Chinese
   * name with no source) while its record-level kind is `observed`. Keyed as
   * `name` the per-field override is missed and an invented name lands in the
   * verified column. The cell is therefore keyed by `field` = the source field,
   * and `exportField` records that the reader sees it as the place's name.
   */
  const nameProvenanceKey = name.fieldUsed;
  const fieldValues = [
    [nameProvenanceKey, name.value, nameProvenanceKey, p.source_url],
    ['nameJa', p.nameJa || null, 'nameJa', p.source_url],
    ['category', p.category || null, 'category', p.source_url],
    ['addressJa', p.addressJa || null, 'addressJa', p.source_url],
    ['latUdeg', Number.isInteger(p.latUdeg) ? p.latUdeg : null, 'latUdeg', p.source_url],
    ['lonUdeg', Number.isInteger(p.lngUdeg) ? p.lngUdeg : null, 'lonUdeg', p.source_url],
    ['hours', Array.isArray(p.hours) && p.hours.length ? p.hours : null, 'hours', p.source_url],
    ['admission', p.admission && Object.keys(p.admission).length ? p.admission : null, 'admission', p.source_url],
    ['closedDays', Array.isArray(p.closedDays) && p.closedDays.length ? p.closedDays : null, 'closedDays', p.source_url],
    ['entrances', p.entrances ? p.entrances.blockDoors : null, 'entrances', p.entrances ? p.entrances.doorsFile : null],
  ];

  for (const [field, value, provenanceField, sourceUrl] of fieldValues) {
    // A null value is a GAP, not a cell. Gaps are emitted in `gaps[]` (clause 2).
    if (value === null || value === undefined) continue;
    const perFieldKind = perField[provenanceField];
    const kind = perFieldKind || recordKind;
    const kindAllowed = mayAppearInGuideVerifiedColumn(kind);
    cells.push({
      field,
      value,
      valueKind: kind,
      kindSource: perFieldKind ? 'provenance.valueKindPerField' : 'provenance.valueKind',
      isExportedName: field === nameProvenanceKey && field === name.fieldUsed && field !== 'nameJa',
      // TWO gates, not one (contract-export.md section 3.3). The enum gate comes
      // from the imported allow-list; the record gate comes from the fact layer.
      verifiedColumn: kindAllowed && recordGate,
      enumGateOpen: kindAllowed,
      recordGateOpen: recordGate,
      sourceUrl: sourceUrl || p.source_url || null,
      labelJa: null,
    });
  }

  // The entrances count is authored (doors.json), and it never reaches the
  // verified column: doors are not fact rows (pack.scope.doorsArePlaces=false).
  //
  // `value` is replaced by the COUNT rather than the doorIds array: a door id in
  // the guide would present an authored object as a fact-layer datum, and D-N*
  // must not appear in guide.json at all (assertion G16).
  if (p.entrances) {
    const c = cells.find((x) => x.field === 'entrances');
    if (c) {
      c.value = Array.isArray(p.entrances.doorIds) ? p.entrances.doorIds.length : c.value;
      c.valueKind = p.entrances.valueKind || VALUE_KIND.AUTHORED;
      c.kindSource = 'places.json#/entrances.valueKind';
      c.verifiedColumn = false;
      c.enumGateOpen = mayAppearInGuideVerifiedColumn(c.valueKind);
      c.labelJa = '策展人配置（门不是事实行；门位置无来源，见 doors.json provenance.whyNotObserved）';
      // `whyNotObserved` is quoted, but the door IDs are stripped: D-N* is an
      // authored object's identifier and must not enter the guide's data.
      c.whyNotObserved = typeof p.entrances.whyNotObserved === 'string'
        ? p.entrances.whyNotObserved.replace(/D-N\d+/g, '（门 id 见 doors.json）')
        : null;
    }
  }
  return cells;
}

/** First non-empty name field, and WHICH field it came from (section 7). */
function pickPlaceName(p) {
  for (const f of PLACE_NAME_FIELDS) {
    const v = (p[f] || '').trim();
    if (v) return { fieldUsed: f, value: v };
  }
  return { fieldUsed: null, value: p.id };
}

/**
 * Build the cells for one transit leg. The fact layer splits kind per aspect
 * (`provenance.distanceValueKind` vs `minutesValueKind`); those must not be
 * collapsed, because a leg commonly has an OBSERVED distance and a LICENCED
 * duration — that is exactly the distinction clause 4 protects.
 */
function legCells(t) {
  const prov = t.provenance || {};
  const cells = [];
  const add = (field, value, kind, extra = {}) => {
    if (value === null || value === undefined || value === '') return;
    const enumGateOpen = mayAppearInGuideVerifiedColumn(kind);
    cells.push({
      field,
      value,
      valueKind: kind,
      kindSource: extra.kindSource || 'transit.json#/provenance',
      verifiedColumn: enumGateOpen && extra.recordGate !== false,
      enumGateOpen,
      recordGateOpen: extra.recordGate !== false,
      sourceUrl: extra.sourceUrl || t.source_url || null,
      labelJa: extra.labelJa || null,
      derivation: extra.derivation || null,
    });
  };

  add('minutes', t.minutes, prov.minutesValueKind || prov.valueKind,
    { kindSource: 'transit.json#/provenance.minutesValueKind', derivation: t.minutesRule || null,
      labelJa: prov.minutesValueKind === VALUE_KIND.LICENCED ? '规约常数（80 m/分）算出，非观测' : null });
  add('alongStreetM', t.alongStreetM, prov.distanceValueKind || prov.valueKind,
    { kindSource: 'transit.json#/provenance.distanceValueKind', derivation: '四条通中心线链上实测' });
  add('measuredStraightM', t.measuredStraightM, prov.distanceValueKind || prov.valueKind,
    { kindSource: 'transit.json#/provenance.distanceValueKind', derivation: t.distanceBasis || null });
  add('fareIC', t.fareIC, VALUE_KIND.LICENCED, { kindSource: 'absent-in-pack', labelJa: null });
  add('fareTicket', t.fareTicket, VALUE_KIND.LICENCED, { kindSource: 'absent-in-pack' });
  add('transfers', t.transfers, VALUE_KIND.LICENCED, { kindSource: 'absent-in-pack' });
  return cells;
}

/* ------------------------------------------------------------------ *
 * 2. Route: the curated chain, walked deterministically
 * ------------------------------------------------------------------ */

/**
 * Enumerate every SIMPLE path between the westmost and eastmost chain nodes and
 * take the one with the greatest total measured length.
 *
 * Why longest, and why anchored on the extremes: it is deterministic, it is
 * explainable in one sentence to a reader ("the guide walks the full corridor"),
 * and it does not need a hand-maintained order. Ties break on the leg-id
 * sequence, so the result cannot depend on Map iteration order.
 */
function deriveMainChain(legs, placeById) {
  const endpoints = [];
  for (const t of legs) {
    for (const id of [t.from, t.to]) if (!endpoints.includes(id)) endpoints.push(id);
  }
  if (endpoints.length === 0) return { chain: [], branches: [], reason: 'no legs' };

  const xOf = (id) => (placeById.get(id) ? placeById.get(id).alongStreetM : null);
  const sorted = [...endpoints].sort((a, b) => (xOf(a) ?? 0) - (xOf(b) ?? 0) || (a < b ? -1 : 1));
  const start = sorted[0];
  const end = sorted[sorted.length - 1];

  // adjacency, canonical order: leg length desc, then leg id asc
  const adj = new Map();
  for (const t of legs) {
    for (const [a, b] of [[t.from, t.to], [t.to, t.from]]) {
      if (!adj.has(a)) adj.set(a, []);
      adj.get(a).push(b);
    }
  }
  for (const [, list] of adj) list.sort((p, q) => (p < q ? -1 : 1));

  const legOf = new Map();
  for (const t of legs) {
    legOf.set(`${t.from}->${t.to}`, t);
    if (!legOf.has(`${t.to}->${t.from}`)) legOf.set(`${t.to}->${t.from}`, t);
  }
  const legLen = (t) => t.alongStreetM ?? t.measuredStraightM ?? 0;

  let best = null;
  const visited = new Set([start]);
  const path = [];
  const walk = (node, totalM) => {
    if (node === end) {
      const ids = path.map((p) => p.legId);
      if (
        best === null ||
        totalM > best.totalM ||
        (totalM === best.totalM && ids.join(',') < best.legIds.join(','))
      ) {
        best = { totalM, legIds: ids, legs: [...path] };
      }
      return;
    }
    for (const next of adj.get(node) || []) {
      if (visited.has(next)) continue;
      const leg = legOf.get(`${node}->${next}`);
      if (!leg) continue;
      visited.add(next);
      path.push({
        legId: leg.id,
        from: leg.from,
        to: leg.to,
        direction: leg.from === node ? 'forward' : 'reverse',
      });
      walk(next, totalM + legLen(leg));
      path.pop();
      visited.delete(next);
    }
  };
  walk(start, 0);

  if (!best) return { chain: [], branches: legs, reason: `no simple path ${start} -> ${end}` };

  const usedIds = new Set(best.legIds);
  return {
    chain: best.legs,
    branches: legs.filter((t) => !usedIds.has(t.id)),
    start,
    end,
    totalM: best.totalM,
    reason: `longest simple path ${start} -> ${end} over the curated legs (${best.legs.length} of ${legs.length})`,
  };
}

/* ------------------------------------------------------------------ *
 * 3. Gaps — every one of them, truthfully
 * ------------------------------------------------------------------ */

/**
 * Wording classes for gaps. `pack.transit.gapWordingRule` requires that a gap say
 * WHICH KIND of gap it is, and the two are not interchangeable: "the world has not
 * published it" asks for a different source, while "our sources do not cover it"
 * asks for another look. A third case is real here — the world HAS published
 * PLATEAU LOD1 heights, we simply have not ingested them — and collapsing it into
 * either of the other two would misdirect the next person.
 */
const GAP_WORDING = Object.freeze({
  WORLD_NOT_PUBLISHED: 'world-has-not-published',
  SOURCES_NOT_COVERED: 'our-sources-do-not-cover',
  NOT_INGESTED: 'source-exists-but-not-ingested',
});

function buildGaps({ scene, pack, places, transit, chain, branchLegs, stops, nearby }) {
  const gaps = [];
  const push = (g) => gaps.push(g);

  // (1) Unsourced building heights, straight out of the scene manifest.
  const counts = scene.manifestCounts || {};
  const unsourced = counts.heightAbstract ?? 0;
  push({
    gapId: 'GAP-HEIGHT-UNSOURCED',
    kind: 'unsourced-height',
    scope: 'scene',
    count: unsourced,
    valueKind: VALUE_KIND.ABSTRACT,
    wordingClass: GAP_WORDING.NOT_INGESTED,
    statementJa:
      `${unsourced} 栋建筑的 heightM 为 null（OSM 既无 building:levels 也无 height 标签）。` +
      'PLATEAU LOD1 抽象高度这项数据存在，但本管线尚未摄入——不是世界没有公布，是我们没有摄取。' +
      '填一个"看起来合理"的高度是本项目唯一要防的失败。',
    why: 'emit-scene.mjs gradeHeight() 判定为 abstract 且刻意不填数字',
    sourceUrl: 'iteration/design/contract-geo-pipeline.md#GAP-11',
    wordingClass: GAP_WORDING.WORLD_NOT_PUBLISHED,
    worldPublished: true,
  });

  // (2) Every gap the pack itself records, verbatim, with its wording class.
  const transitGaps = (pack.transit && pack.transit.gaps) || [];
  transitGaps.forEach((g, i) => {
    // The pack's own sentences use the wording classes verbatim; classify them
    // rather than paraphrasing, so the class cannot drift from the sentence.
    const worldNotPublished = /世界が公表していない|OSM に存在せず/.test(g);
    push({
      gapId: `GAP-TRANSIT-${String(i + 1).padStart(2, '0')}`,
      kind: 'no-running-time',
      scope: 'transit',
      count: 1,
      valueKind: null,
      wordingClass: worldNotPublished ? GAP_WORDING.WORLD_NOT_PUBLISHED : GAP_WORDING.SOURCES_NOT_COVERED,
      statementJa: g,
      why: 'pack.transit.gaps（事实层自己记录的缺口）',
      sourceUrl: null,
      worldPublished: worldNotPublished,
    });
  });

  /**
   * Place-level gap notes.
   *
   * These carry a SOURCED VALUE — an operator-published walking time such as
   * `徒歩7分` — plus the reason it could not become a leg. The first version read
   * only `note || how || gap` and therefore DROPPED the value and the reason,
   * rendering five gap entries with no content: a sourced operator figure
   * vanished from the guide, which is the omission clause 2 forbids. All three
   * fields are now printed.
   *
   * The kind is classified rather than assumed: "there is no leg between these
   * two" and "this point has no coordinate" are different gaps with different
   * fixes, and forcing every note into `coordinate-unavailable` misdirected them.
   */
  const placeGapNotes = pack.placeGapNotes || [];
  placeGapNotes.forEach((g, i) => {
    const why = g.whyNotALeg || g.how || '';
    // The statement is the FACT; `why` (rendered separately) is the reason. Joining
    // them here duplicated the whole reason in every entry.
    const text = [g.gap, g.value ? `运营方公表 ${g.value}` : ''].filter(Boolean).join(' — ');
    const noCoordinate = /座標が無い|座標は本パックの|抽取框|の外にある/.test(why);
    // A note whose blocker is a missing coordinate has no leg for a DIFFERENT
    // reason than one whose blocker is a missing endpoint record.
    const kind = noCoordinate ? 'coordinate-unavailable' : 'leg-missing-between-stops';
    const worldNotPublished = /OSM に存在しない|世界が公表していない/.test(text);
    push({
      gapId: `GAP-PLACE-NOTE-${String(i + 1).padStart(2, '0')}`,
      kind,
      scope: 'route',
      count: 1,
      valueKind: VALUE_KIND.OBSERVED,
      /** The operator's own figure, carried verbatim so it is not lost. */
      operatorPublishedValue: g.value || null,
      verifiedAt: g.verified_at || null,
      wordingClass: worldNotPublished ? GAP_WORDING.WORLD_NOT_PUBLISHED : GAP_WORDING.SOURCES_NOT_COVERED,
      statementJa: text,
      why: why || '',
      sourceUrl: g.source_url || null,
      status: g.status || null,
      worldPublished: worldNotPublished,
    });
  });

  // (4) 南座前 has no coordinate ANYWHERE — the "world has not published it" class.
  const stationCoords = (pack.transit && pack.transit.stationCoordinates) || { entries: [] };
  const obtained = (stationCoords.entries || []).filter((e) => e.status === 'obtained');
  const notObtained = (stationCoords.entries || []).filter((e) => e.status !== 'obtained');
  push({
    gapId: 'GAP-COORD-NANZA',
    kind: 'coordinate-unavailable',
    scope: 'place',
    count: 1,
    valueKind: null,
    statementJa:
      '南座前停留所：OSM に存在しない（3 つの抽出・京都市 CSV・新規 bbox のいずれにも無い）。' +
      '「世界が公表していない」種類の缺口であって「我々が取得していない」種類ではない。',
    why: '座標が無いため transit.json の端点にできない。公式サイトの徒歩分数は source 付きの缺口として残す。',
    sourceUrl: stationCoords.sourcePage || null,
    wordingClass: GAP_WORDING.WORLD_NOT_PUBLISHED,
    worldPublished: true,
  });
  if (obtained.length || notObtained.length) {
    push({
      gapId: 'GAP-COORD-STATION-SET',
      kind: 'coordinate-unavailable',
      scope: 'place',
      count: notObtained.length,
      valueKind: null,
      statementJa:
        `stationCoordinates: ${obtained.length} 点は取得済み（清水五条駅・東山安井）、` +
        `${notObtained.length} 点は未取得（南座前）。`,
      why: stationCoords.note || '',
      sourceUrl: stationCoords.sourcePage || null,
      wordingClass: GAP_WORDING.SOURCES_NOT_COVERED,
      worldPublished: false,
    });
  }

  // (5) Adjacent STOPS on the emitted route with no leg between them. This is
  //     the gap class only the export layer can see: the pack cannot know which
  //     stops a guide will place next to each other.
  const legPair = new Set();
  for (const t of transit) {
    legPair.add(`${t.from}|${t.to}`);
    legPair.add(`${t.to}|${t.from}`);
  }
  for (let i = 1; i < stops.length; i += 1) {
    const a = stops[i - 1];
    const b = stops[i];
    if (legPair.has(`${a.placeId}|${b.placeId}`)) continue;
    push({
      gapId: `GAP-LEG-${a.placeId.replace('kyoto-shijo-', '')}->${b.placeId.replace('kyoto-shijo-', '')}`,
      kind: 'leg-missing-between-stops',
      scope: 'route',
      count: 1,
      valueKind: null,
      statementJa:
        `停留点 ${a.nameJa} と ${b.nameJa} の間に transit.json の leg が無い` +
        `（沿街差 ${fixed(Math.abs(b.alongStreetM - a.alongStreetM))} m）。` +
        '所要時間を述べた来源を本パックは開いていないので、この区間は時間を出さない。',
      why: '本层发现：curated chain 不含这两个停留点之间的边',
      sourceUrl: null,
      wordingClass: GAP_WORDING.SOURCES_NOT_COVERED,
      worldPublished: false,
    });
  }

  // (6) Places outside the frozen 40 m scene window: they MUST be in the guide
  //     (the player walks to them) and CANNOT have scene geometry.
  const outside = stops.filter((s) => !s.inSceneWindow);
  if (outside.length) {
    push({
      gapId: 'GAP-SCENE-WINDOW',
      kind: 'scene-window-outside',
      scope: 'scene',
      count: outside.length,
      valueKind: null,
      statementJa:
        `${outside.length} / ${stops.length} 个停留点在冻结的场景窗口之外（走廊只有 ` +
        `${GRID.corridorWidthM} m 宽）。它们必须在攻略里（读者要走过去），但不可能有 2.5D 几何。`,
      why: '冻结窗口是 x∈[0,1600) row∈[0,40)，即 y_m∈[-20,+20)；`inSceneWindow` 由 locateSubTile 判定',
      sourceUrl: 'iteration/design/contract-geo-pipeline.md#3',
      wordingClass: GAP_WORDING.SOURCES_NOT_COVERED,
      worldPublished: false,
      placeIds: outside.map((s) => s.placeId),
    });
  }

  // (7) Branch legs are not on the main chain — say so rather than dropping them.
  if (branchLegs.length) {
    push({
      gapId: 'GAP-BRANCH-LEGS',
      kind: 'leg-missing-between-stops',
      scope: 'route',
      count: branchLegs.length,
      valueKind: null,
      statementJa:
        `${branchLegs.length} 段 leg 不在主链上（${branchLegs.map((l) => l.legId).join(', ')}）：` +
        '它们是同一走廊的替代入口或延伸段，主链为此已选最长简单路径。',
      why: 'deriveMainChain() 选了最长简单路径，其余边如实列出而不是丢弃',
      sourceUrl: null,
      wordingClass: GAP_WORDING.SOURCES_NOT_COVERED,
      worldPublished: false,
    });
  }
  return gaps;
}

/* ------------------------------------------------------------------ *
 * 4. Fares — LOOK UP, never compute from distance (D-31)
 * ------------------------------------------------------------------ */

/**
 * D-31. `pack.transit.subwayZones.zoneIsNotGeographic` states it in the fact
 * layer's own words:
 *
 *   "地下鉄の「区」は事業者の運賃区分であって、地理的距離の関数ではない。"
 *   evidence: T13 烏丸御池 is ONE stop from 四条 and shares 4区 with T01 六地蔵,
 *             4.6 km away; T01..T07 span 9 km inside one zone.
 *   consequence: "A zone may be LOOKED UP for a subway station pair. It may
 *                 never be COMPUTED from coordinates or from distance."
 *
 * `subwayZones.fareByZone` carries a `kmUpTo` field, which is the bait: it makes
 * distance-derived fares look data-supported. This function therefore does NOT
 * read `kmUpTo`, does not read coordinates, and emits only entries whose basis
 * is literally `lookup`. A fare without a looked-up basis is a BUILD FAILURE.
 */
function buildFares(pack) {
  const out = [];
  const fareRef = (pack.transit && pack.transit.fareReference) || [];
  for (const f of fareRef) {
    if (f.mode === 'bus') {
      out.push({
        fareId: 'FARE-BUS-FLAT',
        operatorJa: f.operatorJa,
        mode: 'bus',
        basis: 'lookup',
        lookedUpFrom: 'pack.transit.fareReference[0]',
        zoneCount: null,
        fareAdult: f.fareAdult,
        fareChild: f.fareChild,
        currency: f.currency,
        appliesToJa: f.appliesToJa,
        priceableAsALeg: false,
        whyNotALeg: f.whyReferenceOnly,
        sourceUrl: f.source_url,
        verifiedAt: f.verified_at,
        noteJa: '参考运赁。本包无所要时间/班距/初终电，故不构成 leg。',
      });
    }
  }

  const zones = (pack.transit && pack.transit.subwayZones) || {};
  const answer = zones.answerForThisPack || {};
  if (answer.zones !== undefined && answer.zones !== null) {
    out.push({
      fareId: 'FARE-SUBWAY-SHIJO-UMARUYAMA',
      operatorJa: '京都市交通局（地下鉄）',
      mode: 'subway',
      basis: 'lookup',
      lookedUpFrom: 'pack.transit.subwayZones.answerForThisPack（zone 来自运营方矩阵，非地理计算）',
      zoneCount: answer.zones,
      fareAdult: answer.fareAdult,
      fareChild: answer.fareChild,
      currency: 'JPY',
      appliesToJa: `${answer.pairConsidered}`,
      priceableAsALeg: answer.priceableAsALeg === true,
      whyNotALeg: answer.why,
      sourceUrl: (zones.source && zones.source.source_url) || null,
      verifiedAt: (zones.source && zones.source.verified_at) || null,
      noteJa:
        '运赁已查表确定（' + answer.zones + '区 / ' + answer.fareAdult + ' 円）。' +
        '缺的是终点地点记录与站间所要时间——不是运赁，也不是来源。' +
        'D-31：此值来自运营方矩阵查表，绝不由坐标或距离推算。',
    });
  }

  // The upper bound the pack says is the ONLY thing its sources support.
  if (zones.fareByZone) {
    const adults = Object.values(zones.fareByZone).map((z) => z.adult);
    out.push({
      fareId: 'FARE-SUBWAY-UPPER-BOUND',
      operatorJa: '京都市交通局（地下鉄）',
      mode: 'subway',
      basis: 'lookup',
      lookedUpFrom: 'pack.transit.subwayZones.fareByZone 的最大档（区间上限，非任一区间的运赁）',
      zoneCount: null,
      fareAdult: Math.max(...adults),
      fareChild: null,
      currency: 'JPY',
      appliesToJa: '仅作为运赁上限陈述',
      priceableAsALeg: false,
      whyNotALeg: (fareRef.find((f) => f.mode === 'subway') || {}).whyReferenceOnly || null,
      sourceUrl: (fareRef.find((f) => f.mode === 'subway') || {}).source_url || null,
      verifiedAt: (fareRef.find((f) => f.mode === 'subway') || {}).verified_at || null,
      noteJa: '上限只说明"最多多少钱"，不说明这一段多少钱。',
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 5. Build
 * ------------------------------------------------------------------ */

export function buildGuide({ outDir = DEFAULT_OUT_DIR } = {}) {
  const places = readJson(`${PACK_DIR}/places.json`);
  const transit = readJson(`${PACK_DIR}/transit.json`);
  const pack = readJson(`${PACK_DIR}/pack.json`);

  if (!Array.isArray(places) || places.length === 0) die(1, 'places.json is empty — nothing to export');
  if (!Array.isArray(transit)) die(1, 'transit.json must be an array');

  /* --- the scene, and the contract it was baked under ------------------ */
  const sceneAbs = resolve(REPO, SCENE_PATH);
  if (!existsSync(sceneAbs)) die(2, `scene not found: ${SCENE_PATH} (run emit-scene.mjs first)`);
  const sceneBuf = readFileSync(sceneAbs);
  const scene = unpackScene(sceneBuf);
  const contractNow = contractFingerprint();
  if (scene.contractHash !== contractNow) {
    die(
      1,
      `scene.bin was baked under contract ${scene.contractHash} but the contract is now ${contractNow}.\n` +
        '  Re-bake with `node iteration/tools/emit-scene.mjs`. A guide may not describe a world built ' +
        'under different frozen literals (geo contract section 10).',
    );
  }
  const sceneInfo = {
    path: SCENE_PATH,
    sha256: sha256Hex(sceneBuf),
    bytes: sceneBuf.length,
    contractHash: scene.contractHash,
    grid: { wTiles: scene.wTiles, hTiles: scene.hTiles },
    manifestCounts: scene.manifest.counts,
  };

  /* --- places -> projected stops --------------------------------------- */
  const placeById = new Map();
  for (const p of places) {
    const proj = projectPlace(p);
    placeById.set(p.id, { ...p, ...proj, cells: placeCells(p) });
  }

  /* --- route ------------------------------------------------------------ */
  const route = deriveMainChain(transit, placeById);

  /**
   * Walk the chosen chain IN ROUTE ORDER.
   *
   * The DFS explores the undirected graph, so `chain[i].from` is not necessarily
   * the node we arrived at: a leg may be traversed in reverse. The `direction`
   * recorded at DFS time is what makes the sequence correct, and without it the
   * stop list silently drops the leg's far end (it produced 23 accounted-for
   * places out of 22 records on the first run — the assertion caught it).
   */
  const orderedStopIds = [];
  if (route.chain.length) {
    let cursor = route.start;
    orderedStopIds.push(cursor);
    for (const l of route.chain) {
      cursor = l.from === cursor ? l.to : l.from;
      if (!orderedStopIds.includes(cursor)) orderedStopIds.push(cursor);
    }
  }
  const stops = orderedStopIds.map((id, i) => {
    const p = placeById.get(id);
    if (!p) die(1, `route references ${id}, which is not in places.json`);
    return {      seq: i + 1,
      placeId: id,
      nameJa: p.nameJa,
      nameZh: (p.nameZh || '').trim(),
      nameEn: (p.nameEn || '').trim(),
      nameFieldUsed: pickPlaceName(p).fieldUsed,
      category: p.category,
      factTier: p.factTier || null,
      alongStreetM: p.alongStreetM,
      acrossStreetM: p.acrossStreetM,
      inSceneWindow: p.inSceneWindow,
      tileX: p.tileX,
      row: p.row,
      verified: p.cells.filter((c) => c.verifiedColumn),
      otherKinds: p.cells.filter((c) => !c.verifiedColumn),
      cellCount: p.cells.length,
    };
  });

  const legs = route.chain.map((l, i) => {
    const t = transit.find((x) => x.id === l.legId);
    const from = placeById.get(t.from);
    const to = placeById.get(t.to);
    const cells = legCells(t);
    return {
      seq: i + 1,
      legId: t.id,
      mode: t.mode,
      from: t.from,
      to: t.to,
      fromNameJa: from ? from.nameJa : t.from,
      toNameJa: to ? to.nameJa : t.to,
      direction: l.direction,
      verified: cells.filter((c) => c.verifiedColumn),
      otherKinds: cells.filter((c) => !c.verifiedColumn),
      cellCount: cells.length,
    };
  });

  const branchLegs = route.branches.map((t) => {
    const cells = legCells(t);
    return {
      legId: t.id,
      mode: t.mode,
      from: t.from,
      to: t.to,
      fromNameJa: (placeById.get(t.from) || {}).nameJa || t.from,
      toNameJa: (placeById.get(t.to) || {}).nameJa || t.to,
      verified: cells.filter((c) => c.verifiedColumn),
      otherKinds: cells.filter((c) => !c.verifiedColumn),
      cellCount: cells.length,
    };
  });

  /**
   * The 13 places that are NOT endpoints of the curated chain.
   *
   * Dropping them would be the omission clause 2 forbids: the player walks past
   * 京都三井ビルディング and the 地下鉄四条駅 19番出入口 on this very route. But
   * inventing a leg between them would fabricate a duration no source states.
   *
   * So they are emitted as a separate list, each hanging off the NEAREST CHAIN
   * STOP, with the along-street distance between the two. That number is pure
   * geometry (both come from the frozen projection), it is labelled as geometry
   * rather than as a walking leg, and it is what a reader actually needs in order
   * to know how far off the route a place sits.
   */
  const chainStopIds = new Set(orderedStopIds);
  const nearby = [];
  for (const p of places) {
    if (chainStopIds.has(p.id)) continue;
    const proj = placeById.get(p.id);
    let best = null;
    for (const id of orderedStopIds) {
      const c = placeById.get(id);
      const alongGap = fixed(Math.abs(proj.alongStreetM - c.alongStreetM));
      const crossGap = fixed(Math.abs(proj.acrossStreetM - c.acrossStreetM));
      const euclid = fixed(Math.sqrt(
        (proj.alongStreetM - c.alongStreetM) ** 2 + (proj.acrossStreetM - c.acrossStreetM) ** 2,
      ));
      const cand = { placeId: id, nameJa: c.nameJa, alongGapM: alongGap, crossGapM: crossGap, straightM: euclid };
      if (best === null || cand.straightM < best.straightM || (cand.straightM === best.straightM && cand.placeId < best.placeId)) {
        best = cand;
      }
    }
    const cells = proj.cells;
    nearby.push({
      placeId: p.id,
      nameJa: p.nameJa,
      nameZh: (p.nameZh || '').trim(),
      nameFieldUsed: pickPlaceName(p).fieldUsed,
      category: p.category,
      factTier: p.factTier || null,
      alongStreetM: proj.alongStreetM,
      acrossStreetM: proj.acrossStreetM,
      inSceneWindow: proj.inSceneWindow,
      nearestChainStop: best,
      distanceBasis: 'geometry only: both points projected through the frozen ORIGIN; this is NOT a walking leg and states no duration',
      verified: cells.filter((c) => c.verifiedColumn),
      otherKinds: cells.filter((c) => !c.verifiedColumn),
      cellCount: cells.length,
    });
  }
  nearby.sort((a, b) => a.alongStreetM - b.alongStreetM || (a.placeId < b.placeId ? -1 : 1));

  /**
   * Which of the 22 places the guide can actually tell you something visitable
   * about: sourced hours, admission or closed days. A place with none of those is
   * still a landmark the player walks past, but the guide has nothing to say about
   * visiting it, and pretending otherwise would be the invented detail.
   */
  const visitableInfo = places
    .filter((p) => (Array.isArray(p.hours) && p.hours.length) ||
      (p.admission && Object.keys(p.admission).length) ||
      (Array.isArray(p.closedDays) && p.closedDays.length))
    .map((p) => p.id)
    .sort();

  /* --- gaps, fares, licences ------------------------------------------- */
  const gaps = buildGaps({ scene: sceneInfo, pack, places, transit, chain: route.chain, branchLegs, stops });
  const fares = buildFares(pack);

  const licences = {
    odbl: {
      required: true,
      attribution: pack.licenceObligations.odblAttribution,
      licenceUri: pack.licenceObligations.odblLicenceUri,
      derivedFile: pack.licenceObligations.odblDerivedFile,
      why: pack.licenceObligations.whySeparate,
    },
    ccByKyoto: {
      required: true,
      attributionJa: pack.licenceObligations.ccByAttributionJa,
      note: pack.licenceObligations.ccByNote,
      modifiedFromSource: pack.licenceObligations.modifiedFromSource,
    },
    curatedContent: {
      licence: pack.licenceObligations.curatedContentLicence,
      why: pack.licenceObligations.curatedContentWhy,
      appliesTo: pack.licenceObligations.curatedContentAppliesTo,
    },
    reviewTextPolicy: {
      rule: '任何平台的用户文本一律不进入本攻略（三条调研线一致结论）。本层不生成景点描述。',
      curatedDescriptions: 0,
      platformReviewText: 0,
    },
  };

  /* --- value distribution: every cell, one kind each -------------------- */
  const allCells = [];
  for (const s of stops) for (const c of [...s.verified, ...s.otherKinds]) allCells.push({ ...c, owner: `place:${s.placeId}` });
  for (const n of nearby) for (const c of [...n.verified, ...n.otherKinds]) allCells.push({ ...c, owner: `place:${n.placeId}` });
  for (const l of legs) for (const c of [...l.verified, ...l.otherKinds]) allCells.push({ ...c, owner: `leg:${l.legId}` });
  for (const l of branchLegs) for (const c of [...l.verified, ...l.otherKinds]) allCells.push({ ...c, owner: `branch:${l.legId}` });
  for (const f of fares) for (const [field, value] of [['fareAdult', f.fareAdult], ['zoneCount', f.zoneCount]]) {
    if (value === null || value === undefined) continue;
    allCells.push({
      field, value, valueKind: VALUE_KIND.OBSERVED, kindSource: 'fact layer fare table (looked up)',
      verifiedColumn: mayAppearInGuideVerifiedColumn(VALUE_KIND.OBSERVED), enumGateOpen: true, recordGateOpen: true,
      sourceUrl: f.sourceUrl, labelJa: null, owner: `fare:${f.fareId}`,
    });
  }

  const valueCounts = {};
  for (const k of VALUE_KINDS) valueCounts[k] = 0;
  let unknownKind = 0;
  for (const c of allCells) {
    if (Object.prototype.hasOwnProperty.call(valueCounts, c.valueKind)) valueCounts[c.valueKind] += 1;
    else unknownKind += 1;
  }

  const summary = {
    placeCount: stops.length,
    placeRecordsTotal: places.length,
    nearbyPlaceCount: nearby.length,
    placesAccountedFor: stops.length + nearby.length,
    visitableInfoPlaceCount: visitableInfo.length,
    legCount: legs.length,
    branchLegCount: branchLegs.length,
    transitLegsTotal: transit.length,
    cellCount: allCells.length,
    valueCounts,
    unknownKindCount: unknownKind,
    verifiedColumnCount: allCells.filter((c) => c.verifiedColumn).length,
    gapCount: gaps.length,
    gapCountsByKind: gaps.reduce((acc, g) => {
      acc[g.kind] = (acc[g.kind] || 0) + 1;
      return acc;
    }, {}),
    gapItemCount: gaps.reduce((n, g) => n + (Number.isFinite(g.count) ? g.count : 0), 0),
    fares: {
      entries: fares.length,
      computedFromDistance: 0,
      allLookedUp: fares.every((f) => f.basis === 'lookup'),
      priceableAsALeg: fares.filter((f) => f.priceableAsALeg).length,
    },
    stopsOutsideSceneWindow: stops.filter((s) => !s.inSceneWindow).length,
    nearbyOutsideSceneWindow: nearby.filter((n) => !n.inSceneWindow).length,
    guideVerifiedColumnAllowedImported: [...GUIDE_VERIFIED_COLUMN_ALLOWED],
    verifiedColumnsAllObserved: allCells.every((c) => !c.verifiedColumn || c.valueKind === VALUE_KIND.OBSERVED),
  };

  const guide = {
    schema: GUIDE_SCHEMA,
    city: {
      cityId: pack.cityId,
      nameLocal: pack.nameLocal,
      nameEn: pack.nameEn,
      country: pack.country,
      timeZone: pack.timeZone,
      currency: pack.currency,
      corridor: pack.corridor,
    },
    language: {
      export: EXPORT_LANGUAGE,
      available: [EXPORT_LANGUAGE],
      placeNameFields: PLACE_NAME_FIELDS,
      structureNote:
        'v1 只出口一种语言（zh-Hans），但语言字段是数组结构：加语言 = 加一项，不改数据形状。' +
        'nameJa 一律并列打印（读者在街上看到的是日文招牌）。nameZh 缺失时不翻译，退回 nameJa 并记录 nameFieldUsed。',
    },
    inputs: {
      factLayer: [
        { path: `${PACK_DIR}/places.json`, sha256: sha256File(`${PACK_DIR}/places.json`) },
        { path: `${PACK_DIR}/transit.json`, sha256: sha256File(`${PACK_DIR}/transit.json`) },
        { path: `${PACK_DIR}/pack.json`, sha256: sha256File(`${PACK_DIR}/pack.json`) },
      ],
      scene: sceneInfo,
      contract: { fingerprint: contractNow, source: 'world-grid.mjs#contractFingerprint()' },
    },
    route: {
      derivation: route.reason,
      startPlaceId: route.start || null,
      endPlaceId: route.end || null,
      totalMeasuredM: route.totalM !== undefined ? fixed(route.totalM) : null,
      legs,
    },
    stops,
    nearby,
    visitableInfoPlaceIds: visitableInfo,
    branchLegs,
    fares,
    gaps,
    licences,
    summary,
  };

  return { guide, scene: sceneInfo, route, allCells };
}

/* ------------------------------------------------------------------ *
 * 6. Rendering — deterministic markdown
 * ------------------------------------------------------------------ */

const KIND_LABEL_JA = {
  [VALUE_KIND.OBSERVED]: '✅ 已验证（人打开来源读到的值）',
  [VALUE_KIND.PARSED]: '⚙️ 机器读取（parser 读的来源值，无人核过）',
  [VALUE_KIND.AUTHORED]: '✍️ 策展人放置（我们的判断，非来源陈述）',
  [VALUE_KIND.LICENCED]: '📐 规约/模板派生（常数算出，非观测）',
  [VALUE_KIND.ABSTRACT]: '🔷 模型抽象值（无来源，且不填数字）',
};

function fmtCellValue(v) {
  if (Array.isArray(v)) return v.join(' / ');
  if (v && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function renderMarkdown(guide) {
  const L = [];
  const s = guide.summary;

  /** The exported name cell, so its valueKind label shows next to the heading. */
  const nameCellOf = (row) => [...row.verified, ...row.otherKinds].find((c) => c.isExportedName) ?? null;

  L.push(`# 四条通 路线攻略 · ${guide.city.nameLocal}`);
  L.push('');
  L.push('> **这份攻略的每个值都能回指事实层；回指不到的，只以缺口形式出现。**');
  L.push('> 本文件由 `iteration/tools/emit-guide.mjs` 确定性生成，不含任何 LLM 生成的描述。');
  L.push('');
  L.push(`- schema: \`${guide.schema}\``);
  L.push(`- 城市: ${guide.city.nameLocal} / ${guide.city.nameEn}（${guide.city.cityId}）`);
  L.push(`- 出口语言: \`${guide.language.export}\``);
  L.push(`- 路段: **${s.placeCount} 个停留点 / ${s.legCount} 段主链**（事实层共 ${s.transitLegsTotal} 段，${s.branchLegCount} 段在支线）`);
  L.push(`- 主链测距合计: ${guide.route.totalMeasuredM} m（沿四条通，自本段起点）`);
  L.push(`- 契约指纹: \`${guide.inputs.contract.fingerprint}\``);
  L.push(`- scene.bin: \`${guide.inputs.scene.sha256}\`（${guide.inputs.scene.bytes} B）`);
  L.push('');
  L.push('**路线怎么来的**：' + guide.route.derivation + '。没有任何从坐标现算的"最优路线"。');
  L.push('');

  /* ---- stops ---- */
  L.push('---');
  L.push('');
  L.push('## 停留点');
  L.push('');
  for (const st of guide.stops) {
    const legacy = st.nameZh ? `（${st.nameJa}）` : '';
    const nc = nameCellOf(st);
    L.push(`### ${st.seq}. ${st.nameZh || st.nameJa}${legacy}`);
    L.push('');
    if (nc) {
      L.push(`- **地名种类**: ${KIND_LABEL_JA[nc.valueKind] || nc.valueKind}（字段 \`${nc.field}\`，` +
        `${nc.verifiedColumn ? '在"已验证"栏' : '**不在**"已验证"栏'}）`);
    }    const sceneNote = st.inSceneWindow
      ? `场景窗口内（tile ${st.tileX}, row ${st.row}）`
      : `**场景窗口外**（走廊仅 ${GRID.corridorWidthM} m 宽；此处沿街 ${st.alongStreetM} m、横向 ${st.acrossStreetM} m）`;
    L.push(`- 沿街里程: **${st.alongStreetM} m**（自本段起点；这是里程，不是坐标）`);
    L.push(`- 场景: ${sceneNote}`);
    L.push(`- 类别: ${st.category}` + (st.factTier ? ` · 新鲜度层级: ${st.factTier}` : ''));
    L.push('');
    if (st.verified.length) {
      L.push('**已验证**（只允许 `observed`）');
      L.push('');
      L.push('| 字段 | 值 | 来源 |');
      L.push('|---|---|---|');
      for (const c of st.verified) L.push(`| ${c.field} | ${fmtCellValue(c.value)} | ${c.sourceUrl || ''} |`);
      L.push('');
    }
    const others = st.otherKinds;
    if (others.length) {
      L.push('**其他来源类别**（不进"已验证"栏，各自标注真实种类）');
      L.push('');
      L.push('| 字段 | 值 | 种类 | 说明 |');
      L.push('|---|---|---|---|');
      for (const c of others) {
        L.push(`| ${c.field} | ${fmtCellValue(c.value)} | ${KIND_LABEL_JA[c.valueKind] || c.valueKind} | ${c.labelJa || ''} |`);
      }
      L.push('');
    }
  }

  /* ---- legs ---- */
  L.push('---');
  L.push('');
  L.push('## 主链路段');
  L.push('');
  for (const lg of guide.route.legs) {
    const arrow = lg.direction === 'forward' ? '→' : '←（反向走）';
    L.push(`### ${lg.seq}. ${lg.legId} · ${lg.fromNameJa} ${arrow} ${lg.toNameJa}（${lg.mode}）`);
    L.push('');
    for (const c of lg.verified) L.push(`- ✅ **${c.field} = ${fmtCellValue(c.value)}** — 来源 ${c.sourceUrl || ''}`);
    for (const c of lg.otherKinds) {
      L.push(`- ${KIND_LABEL_JA[c.valueKind] || c.valueKind} **${c.field} = ${fmtCellValue(c.value)}**${c.labelJa ? ` — ${c.labelJa}` : ''}${c.derivation ? `（${c.derivation}）` : ''}`);
    }
    L.push('');
  }

  if (guide.branchLegs.length) {
    L.push('### 支线（不在主链上，如实列出）');
    L.push('');
    for (const lg of guide.branchLegs) {
      const mins = [...lg.verified, ...lg.otherKinds].find((c) => c.field === 'minutes');
      L.push(`- **${lg.legId}** ${lg.fromNameJa} → ${lg.toNameJa}（${lg.mode}）` +
        (mins ? ` · ${mins.value} 分 [${mins.valueKind}]` : ''));
    }
    L.push('');
  }

  /* ---- nearby places: every place the route passes, none dropped ---- */
  L.push('---');
  L.push('');
  L.push(`## 沿街经过的地点（${guide.nearby.length} 处）`);
  L.push('');
  L.push('> 这些地点在**本路线沿街经过**，但**不是**主链的端点：`transit.json` 里没有连接它们的 leg，');
  L.push('> 所以本攻略**不给它们所要时间**——那是运营方或来源要陈述的事，不是本层能算的。');
  L.push('> 下面的数字是**纯几何**（两点都经冻结原点投影），标明为"沿街距离"，不是步行时间。');
  L.push('');
  L.push('| 沿街里程 | 地点 | 类别 | 最近的链上停留点 | 直线距离 | 场景 |');
  L.push('|---|---|---|---|---|---|');
  for (const n of guide.nearby) {
    L.push(
      `| ${n.alongStreetM} m | ${n.nameZh || n.nameJa}（${n.nameJa}） | ${n.category} | ` +
      `${n.nearestChainStop.nameJa} | ${n.nearestChainStop.straightM} m | ${n.inSceneWindow ? '窗口内' : '**窗口外**'} |`,
    );
  }
  L.push('');
  for (const n of guide.nearby) {
    if (n.verified.length) {
      L.push(`- **${n.nameJa}** 已核实字段：` +
        n.verified.map((c) => `${c.field}=${fmtCellValue(c.value)}`).join('、') +
        `（来源 ${n.verified[0].sourceUrl || '—'}）`);
    }
    const os = n.otherKinds;
    if (os.length) {
      L.push(`- **${n.nameJa}** 其他类别：` +
        os.map((c) => `${c.field}=${fmtCellValue(c.value)}[${c.valueKind}]`).join('、'));
    }
  }
  L.push('');
  L.push(`**全部 ${guide.summary.placeRecordsTotal} 条地点记录都在本攻略里：` +
    `${guide.summary.placeCount} 个主链停留点 + ${guide.summary.nearbyPlaceCount} 个沿街经过点。**`);
  L.push('');

  /* ---- fares ---- */
  L.push('---');
  L.push('');
  L.push('## 运赁（只能查表）');
  L.push('');
  L.push('> **D-31：运赁只能查表，不得从距离推算。** 地下铁的「区」是运营方的运赁区分，不是地理距离的函数——');
  L.push('> 东西线 T13 烏丸御池（距四条一站）与 4.6 km 外的 T01 六地蔵同属 4 区。按距离算会产出自信的错数。');
  L.push('');
  L.push('| 项目 | 大人 | 小児 | 依据 | 能不能构成一段行程 |');
  L.push('|---|---|---|---|---|');
  for (const f of guide.fares) {
    L.push(`| ${f.operatorJa}${f.zoneCount ? `（${f.zoneCount} 区）` : ''} | ${f.fareAdult ?? '—'} ${f.currency} | ${f.fareChild ?? '—'} | ${f.basis} | ${f.priceableAsALeg ? '可以' : '**不可以**'} |`);
  }
  L.push('');
  for (const f of guide.fares) {
    L.push(`- **${f.fareId}**：${f.noteJa || ''}`);
    if (f.whyNotALeg) L.push(`  - 为什么不能构成 leg：${f.whyNotALeg}`);
    if (f.sourceUrl) L.push(`  - 来源：${f.sourceUrl}`);
  }
  L.push('');
  L.push(`本攻略中由距离派生的运赁数量：**${guide.summary.fares.computedFromDistance}**（必须为 0）。`);
  L.push('');

  /* ---- gaps ---- */
  L.push('---');
  L.push('');
  L.push('## 缺口（{0} 条，全部写出，不省略、不填默认值）'.replace('{0}', String(guide.summary.gapCount)));
  L.push('');
  for (const g of guide.gaps) {
    const count = Number.isFinite(g.count) ? `（${g.count}）` : '';
    L.push(`- **${g.gapId}**${count} [${g.kind}]`);
    if (g.operatorPublishedValue) {
      L.push(`  - **运营方公表值：${g.operatorPublishedValue}**（${g.sourceUrl || ''}${g.verifiedAt ? `，${g.verifiedAt}` : ''}）——**读取到了，但它不能构成本包的一段行程**`);
    }
    L.push(`  - ${g.statementJa}`);
    if (g.why) L.push(`  - 为什么是缺口：${g.why}`);
    if (g.sourceUrl && !g.operatorPublishedValue) L.push(`  - 来源：${g.sourceUrl}`);  }
  L.push('');

  /* ---- licences ---- */
  L.push('---');
  L.push('');
  L.push('## 许可与归属（必须随本文件一起分发）');
  L.push('');
  L.push(`- **ODbL 1.0**：${guide.licences.odbl.attribution}`);
  L.push(`  - ${guide.licences.odbl.licenceUri}`);
  L.push(`  - 派生文件：\`${guide.licences.odbl.derivedFile}\``);
  L.push(`- **CC BY 4.0（京都市）**：${guide.licences.ccByKyoto.attributionJa}`);
  L.push(`- 策展内容许可：${guide.licences.curatedContent.licence}`);
  L.push('');
  L.push('## 没有引用的东西');
  L.push('');
  L.push(`- 平台用户文本：**一律不进入本攻略**（三条调研线一致结论：任何平台都不允许离线存储并永久再分发其文本）。`);
  L.push(`- 本层自撰的景点介绍：**${guide.licences.reviewTextPolicy.curatedDescriptions} 条**（一个字都没有写）。`);
  L.push('');
  L.push('---');
  L.push('');
  L.push('*本攻略是事实层的确定性投影，不是推荐清单。仅供研究，不构成投资建议。*');
  L.push('');
  return L.join('\n');
}

/* ------------------------------------------------------------------ *
 * 7. HTML view — the shape assert-export-boundary.mjs requires
 * ------------------------------------------------------------------ */

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * A minimal HTML VIEW of the same guide. It is not a second data source: every
 * string below comes from `guide.json` built in the same run, so the two cannot
 * drift.
 *
 * The declarations are the export-boundary contract (task-4):
 *   data-tgf="guide"       -> this text is checked against the fact layer
 *   data-tgf="narrative"   -> immersion text, measured and never failed
 *   data-prov="<owner>"    -> this value is attributed
 *   data-entity="<placeId>"-> this text claims to be that entity's name
 *   data-time="<placeId>"  -> the times here come from that fact record
 *   data-ui-strings="…"    -> template chrome, checked against its own vocabulary
 */
function renderHtml(guide) {
  const H = [];
  const chrome = ['四条通 路线攻略', '停留点', '主链路段', '运赁', '缺口', '许可与归属', '沿街里程', '场景'];
  H.push('<!DOCTYPE html>');
  H.push('<html lang="zh-Hans">');
  H.push('<head>');
  H.push('<meta charset="utf-8">');
  H.push('<title data-tgf="guide" data-ui-strings="四条通 路线攻略">四条通 路线攻略</title>');
  H.push('</head>');
  H.push('<body>');
  H.push(`<h1 data-tgf="guide" data-prov="doc:${guide.inputs.contract.fingerprint.slice(0, 8).toLowerCase()}" data-ui-strings="${esc(chrome.join(' · '))}">四条通 路线攻略</h1>`);
  /**
   * Chrome and data must not share a text node.
   *
   * The first version put the fact-layer city name inside the same element that
   * declared `data-ui-strings="City:"`, which makes the city name chrome text and
   * checks it against the CHROME lexicon instead of the fact layer — the boundary
   * scanner correctly reported `CHROME_UNKNOWN: 京都, 四条通, 四条烏丸, 祇園`. The
   * label is chrome; the value is a fact-layer string. They are separate nodes.
   */
  H.push('<p><span data-tgf="guide" data-ui-strings="City:">City:</span> ');
  /**
   * `data-prov`, NOT `data-entity`: the boundary contract reads `data-entity` as
   * "this text IS that entity's name", and `京都・四条通（四条烏丸〜祇園）` is the
   * city's display name, not the name of the `kyoto-shijo` record. Claiming it as
   * an entity plate produced `ENTITY_ID_UNKNOWN: kyoto-shijo` +
   * `ENTITY_UNDECLARED: 京都` — the scanner was right and the markup was wrong.
   */
  H.push(`<span data-tgf="guide" data-prov="pack:cityId">${esc(guide.city.nameLocal)}</span></p>`);

  H.push('<h2 data-tgf="guide" data-ui-strings="停留点">停留点</h2>');
  for (const st of guide.stops) {
    H.push(`<section data-tgf="guide" data-prov="place:${esc(st.placeId)}">`);
    H.push(`<h3 data-tgf="guide" data-prov="place:${esc(st.placeId)}" data-entity="${esc(st.placeId)}">${esc(st.nameJa)}</h3>`);
    H.push(`<p data-tgf="guide" data-prov="place:${esc(st.placeId)}">${esc(String(st.alongStreetM))} m</p>`);
    H.push('</section>');
  }

  H.push('<h2 data-tgf="guide" data-ui-strings="主链路段">主链路段</h2>');
  for (const lg of guide.route.legs) {
    H.push(`<section data-tgf="guide" data-prov="leg:${esc(lg.legId)}">`);
    H.push(`<h3 data-tgf="guide" data-prov="leg:${esc(lg.legId)}" data-entity="${esc(lg.from)}">${esc(lg.fromNameJa)}</h3>`);
    const mins = [...lg.verified, ...lg.otherKinds].find((c) => c.field === 'minutes');
    if (mins) {
      H.push(`<p data-tgf="guide" data-prov="leg:${esc(lg.legId)}">${esc(String(mins.value))} min [${esc(mins.valueKind)}]</p>`);
    }
    H.push('</section>');
  }

  H.push('<h2 data-tgf="guide" data-ui-strings="沿街经过的地点">沿街经过的地点</h2>');
  for (const n of guide.nearby) {
    H.push(`<section data-tgf="guide" data-prov="place:${esc(n.placeId)}">`);
    H.push(`<h3 data-tgf="guide" data-prov="place:${esc(n.placeId)}" data-entity="${esc(n.placeId)}">${esc(n.nameJa)}</h3>`);
    H.push(`<p data-tgf="guide" data-prov="place:${esc(n.placeId)}">${esc(String(n.alongStreetM))} m</p>`);
    H.push('</section>');
  }

  H.push('<h2 data-tgf="guide" data-ui-strings="运赁">运赁</h2>');
  for (const f of guide.fares) {
    // The currency CODE is a fact-layer string the boundary scanner has no
    // allow-list entry for, and a bare `JPY` next to a number is exactly the
    // "fact-shaped with nothing behind it" shape that guard exists to catch. The
    // amount is the sourced datum; the unit lives in guide.json (`currency`).
    H.push(`<p data-tgf="guide" data-prov="fare:${esc(f.fareId)}">${esc(String(f.fareAdult))} basis=${esc(f.basis)}</p>`);
  }

  H.push('<h2 data-tgf="guide" data-ui-strings="缺口">缺口</h2>');
  for (const g of guide.gaps) {
    H.push(`<p data-tgf="guide" data-prov="gap:${esc(g.gapId)}">${esc(g.kind)}</p>`);
  }

  H.push('<h2 data-tgf="guide" data-ui-strings="许可与归属">许可与归属</h2>');
  H.push(`<p data-tgf="guide" data-prov="licence:odbl">${esc(guide.licences.odbl.attribution)}</p>`);
  H.push(`<p data-tgf="guide" data-prov="licence:ccby">${esc(guide.licences.ccByKyoto.attributionJa)}</p>`);
  H.push('</body>');
  H.push('</html>');
  H.push('');
  return H.join('\n');
}

/* ------------------------------------------------------------------ *
 * 8. CLI
 * ------------------------------------------------------------------ */

function writeOut(dir, name, text) {
  const abs = resolve(REPO, dir, name);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text, 'utf8');
  return { path: `${dir}/${name}`, bytes: Buffer.byteLength(text, 'utf8'), sha256: sha256Hex(Buffer.from(text, 'utf8')) };
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(
      'emit-guide.mjs — fact layer + scene -> build/guide.{json,md,html}\n' +
        '  --out-dir <dir>   output directory (default: build)\n' +
        '  --json            machine-readable report\n',
    );
    return 0;
  }
  const outIdx = argv.indexOf('--out-dir');
  const outDir = outIdx >= 0 ? argv[outIdx + 1] : DEFAULT_OUT_DIR;

  const { guide, scene } = buildGuide({ outDir });

  const jsonText = `${JSON.stringify(guide, null, 2)}\n`;
  const mdText = renderMarkdown(guide);
  const htmlText = renderHtml(guide);

  const wJson = writeOut(outDir, 'guide.json', jsonText);
  const wMd = writeOut(outDir, 'guide.md', mdText);
  const wHtml = writeOut(outDir, 'guide.html', htmlText);

  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ guide: wJson, md: wMd, html: wHtml, summary: guide.summary }, null, 2)}\n`);
    return 0;
  }

  const s = guide.summary;
  const out = [];
  out.push('emit-guide — fact layer + scene -> a route guide');
  out.push(`  pack      : ${PACK_DIR}`);
  out.push(`  scene     : ${scene.path}  ${scene.bytes} B  sha256 ${scene.sha256}`);
  out.push(`  contract  : ${guide.inputs.contract.fingerprint}`);
  out.push('');
  out.push('  -- ROUTE (derived from the curated chain, never from coordinates) --');
  out.push(`  ${guide.route.derivation}`);
  out.push(`  stops on the main chain : ${s.placeCount} of ${s.placeRecordsTotal} place records`);
  out.push(`  passed-alongside places : ${s.nearbyPlaceCount}  (no leg, geometry only, no duration claimed)`);
  out.push(`  accounted for           : ${s.placesAccountedFor} of ${s.placeRecordsTotal}  (must equal the total)`);
  out.push(`  with visitable info     : ${s.visitableInfoPlaceCount}  (sourced hours/admission/closedDays)`);
  out.push(`  main chain legs    : ${s.legCount} of ${s.transitLegsTotal} (branch legs listed: ${s.branchLegCount})`);
  out.push(`  measured total     : ${guide.route.totalMeasuredM} m along 四条通`);
  out.push(`  outside 40 m window: ${s.stopsOutsideSceneWindow} of ${s.placeCount} chain stops, ` +
    `${s.nearbyOutsideSceneWindow} of ${s.nearbyPlaceCount} passed-alongside`);
  out.push('');
  out.push('  -- VALUE DISTRIBUTION (cells: one kind each; never measured before) --');
  for (const k of VALUE_KINDS) {
    const n = s.valueCounts[k] || 0;
    out.push(`  ${k.padEnd(9)} : ${String(n).padStart(4)}`);
  }
  out.push(`  ${'(total)'.padEnd(9)} : ${String(s.cellCount).padStart(4)}   cells`);
  out.push(`  verified column    : ${s.verifiedColumnCount}  (allowed kinds imported: ${JSON.stringify(s.guideVerifiedColumnAllowedImported)})`);
  out.push(`  all verified cells observed: ${s.verifiedColumnsAllObserved}`);
  out.push(`  unclassified cells : ${s.unknownKindCount}  (must be 0)`);
  out.push('');
  out.push('  -- GAPS (every one written out) --');
  out.push(`  gap entries: ${s.gapCount}   summed item count: ${s.gapItemCount}`);
  for (const [k, n] of Object.entries(s.gapCountsByKind)) out.push(`    ${k.padEnd(30)} ${n}`);
  out.push('');
  out.push('  -- FARES (D-31: lookup only, never from distance) --');
  out.push(`  entries ${s.fares.entries}   computedFromDistance ${s.fares.computedFromDistance}   allLookedUp ${s.fares.allLookedUp}   priceableAsALeg ${s.fares.priceableAsALeg}`);
  out.push('');
  out.push('  -- OUTPUT --');
  out.push(`  ${wJson.path.padEnd(18)} ${String(wJson.bytes).padStart(7)} B  sha256 ${wJson.sha256}`);
  out.push(`  ${wMd.path.padEnd(18)} ${String(wMd.bytes).padStart(7)} B  sha256 ${wMd.sha256}`);
  out.push(`  ${wHtml.path.padEnd(18)} ${String(wHtml.bytes).padStart(7)} B  sha256 ${wHtml.sha256}`);
  process.stdout.write(`${out.join('\n')}\n`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  process.exitCode = main(process.argv.slice(2));
}
