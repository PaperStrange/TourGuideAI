#!/usr/bin/env node
/**
 * validate-doors.mjs — mechanical assertions for city-packs/kyoto-shijo/doors.json
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The city pack's fact layer is only worth what it can prove. doors.json claims
 * the authored doorways, each bound to a real OSM building footprint, each sitting in an
 * integer cell inside a 40x40 m block, each with an honest valueKind. Every one
 * of those claims is re-derived here from the stored evidence bytes and the
 * FROZEN constants -- nothing is taken on the file's word.
 *
 * The constants are IMPORTED from the authoritative module, never retyped:
 * retyping them is how the corridor length silently drifted once already
 * (wTiles 2000 -> 1600, contract section 10).
 *
 * TWO FILES, TWO LICENCES (ODbL 4.5(a), landed as contract GAP-6)
 * ---------------------------------------------------------------
 * The pack is split. `doors.json` is OUR content and is not under ODbL.
 * `kyoto-shijo-osm.json` is the ODbL half: building identities, facade geometry,
 * door placements and the block's mapped features. Each of our door records
 * points at its ODbL counterpart with `osmRecord`, and this validator JOINS the
 * two halves by `doorId` so the geometric assertions keep working.
 *
 * The join is in memory only. The stored files stay separated, and V16/V17 read
 * the RAW doors.json to prove the separation actually holds -- because a join
 * that silently papered over a field copied back into doors.json would defeat
 * the whole point of splitting. V16 is the assertion that would fire.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not re-fetch Overpass. It reads the frozen evidence under
 * city-packs/kyoto-shijo/evidence/ and verifies the recorded sha256, so the run
 * is reproducible offline and detects tampering. OSM is a live database; a
 * fresh fetch is a re-verification event, not a validator step.
 *
 * Usage:  node city-packs/kyoto-shijo/validate-doors.mjs [--json]
 *         node city-packs/kyoto-shijo/validate-doors.mjs --strict
 *              Release gate. Same assertions, but exit is non-zero while any
 *              declared BLOCKER stands. The default run exits 0 with a blocker
 *              standing, because nothing in the pack is FALSE -- it is not yet
 *              SHIPPABLE. Those are different states and this flag keeps them
 *              different, rather than making CI permanently red and training
 *              everyone to ignore it.
 *         node city-packs/kyoto-shijo/validate-doors.mjs --doors <path>   # fire drill:
 *              run every assertion against an ALTERNATE doors.json, so the
 *              separation assertions can be shown to fail without editing the
 *              shipped file (task-9 asked for exactly that demonstration).
 * Exit:   0 = all assertions pass (and no fatal blocker under --strict)
 *         1 = an assertion failed, or --strict with a blocker standing
 *         2 = usage/IO error.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const WGEO_PATH = resolve(REPO, 'docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs');
const SLICE_PATH = resolve(REPO, 'docs/handOff/archive/corpora/geo-japan/kyoto-slice-overpass.json');
const EVID_DIR = resolve(HERE, 'evidence');

const argv = process.argv.slice(2);
const argOf = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const DOORS_PATH = resolve(argOf('--doors') || resolve(HERE, 'doors.json'));

const WGEO = await import(pathToFileURL(WGEO_PATH).href);
const {
  ORIGIN, PROJECTION, worldGrid, GRID, VALUE_KIND, VALUE_KINDS, WORLD_UNITS,
  GUIDE_VERIFIED_COLUMN_ALLOWED, isValueKind, mayAppearInGuideVerifiedColumn,
  quantizeToSubTile, tileFromSub, projectMicroDeg, LANES_QUALITY,
  DOOR_TYPES, isDoorType,
} = WGEO;

/** One canonical 1/16 sub-tile in metres (0.0625 m), derived from the import. */
const WORLD_ONE_SUBTILE = WORLD_UNITS.tileMetres / WORLD_UNITS.subTilesPerTile;

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').toUpperCase();

const doorsDoc = readJson(DOORS_PATH);
/* The ODbL half. Default path comes from the pointer block in doors.json, so the
 * two files cannot drift apart silently. */
const OSM_PATH = resolve(argOf('--osm') || resolve(REPO, doorsDoc.osmDerived.file));
const osmDoc = readJson(OSM_PATH);
const osmByDoor = new Map((osmDoc.doors || []).map((r) => [r.doorId, r]));

/**
 * JOIN VIEW. Each of our door records, augmented with its ODbL counterpart.
 * `__own` and `__osm` keep the two provenances separable inside the assertions.
 * Nothing here is written back to disk; V16/V17 assert on the raw documents.
 */
const doors = doorsDoc.doors.map((own) => {
  const osm = osmByDoor.get(own.doorId);
  return { ...own, ...(osm || {}), __own: own, __osm: osm };
});
/** Moved wholesale to the ODbL half. */
const facades = osmDoc.facades;
const observedBlockFeatures = osmDoc.observedBlockFeatures;

/* ------------------------------------------------------------------ *
 * assertion harness
 * ------------------------------------------------------------------ */
const results = [];
function check(id, title, ok, detail) {
  results.push({ id, title, ok: Boolean(ok), detail });
  return Boolean(ok);
}

/* ------------------------------------------------------------------ *
 * V1 — the contract is IMPORTED, not copied (D-12)
 *
 * This assertion used to compare twelve literals and two enum members in
 * doors.json against the import. It did its job -- it went red the moment
 * VALUE_KINDS gained `parsed` -- and that red was the point: the copy in
 * doors.json had gone stale. The fix is not to refresh the copy. A mirrored copy
 * drifts, an import does not, so the mirror is gone and this assertion now holds
 * the absence of the drift surface instead of tolerating it.
 *
 * This is not weaker. It is the same protection pointed at the cause:
 *   - before: a copy was allowed, and had to be kept in step by hand;
 *   - now:    a copy is a FAILURE, and nothing has to be kept in step at all.
 * The companion assertion is V8, which checks every declared valueKind against the
 * LIVE imported enum -- so deleting the copy did not delete the ability to notice
 * an incompatible kind; it only deleted the ability to be wrong about the list.
 * ------------------------------------------------------------------ */
{
  // Key names the contract owns. A mirror of any of these is the defect itself.
  const CONTRACT_MIRROR_KEYS = Object.freeze([
    'ORIGIN', 'PROJECTION', 'worldGrid', 'GRID',
    'valueKinds', 'guideVerifiedColumnAllowed',
    'tileMetres', 'subTilesPerTile', 'cellMetres', 'worldDepthM',
  ]);
  // High-entropy literals from the contract. None of these can collide with a door
  // cell or a measured width, so a match anywhere is a mirror under a new name --
  // which the key check above could not see.
  const CONTRACT_LITERAL_VALUES = Object.freeze([
    ORIGIN.lonUdeg, ORIGIN.latUdeg,
    PROJECTION.metresPerDegreeLon, PROJECTION.metresPerDegreeLat, PROJECTION.coefficientLatitudeDeg,
  ].filter((v) => typeof v === 'number'));

  const problems = [];
  const foundKeys = [];
  const foundValues = [];
  // One exemption, stated rather than special-cased silently: `guideVerifiedColumnAllowed`
  // is ALSO a per-record BOOLEAN on every door -- "this record is not admitted to the
  // guide's verified column". That is not a copy of the contract's allow-LIST; it is the
  // record's own assertion, V8 checks it, and the Lead explicitly asked for it to stay.
  // The contract's list is an ARRAY, so the guard is type-aware: a list here is a mirror,
  // a boolean under provenance is a claim. A copy re-appearing as an array still fails.
  const isPerRecordClaim = (key, value, path) =>
    key === 'guideVerifiedColumnAllowed' && typeof value === 'boolean' && /\.provenance$/.test(path);
  (function walk(node, path) {
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (CONTRACT_MIRROR_KEYS.includes(k) && !isPerRecordClaim(k, v, path)) {
          foundKeys.push(`${path}.${k}`);
        }
        walk(v, `${path}.${k}`);
      }
      return;
    }
    if (typeof node === 'number' && CONTRACT_LITERAL_VALUES.includes(node)) foundValues.push(`${path}=${node}`);
  })(doorsDoc, '');

  for (const p of foundKeys) problems.push(`contract-mirror key at ${p} -- the contract is imported, not copied`);
  for (const p of foundValues) problems.push(`contract literal at ${p} -- a mirror under another name is still a mirror`);

  // The pointer must resolve, and must point at something that still IS the contract.
  const mustImport = doorsDoc.frozenConstants && doorsDoc.frozenConstants.mustImport;
  const pointerPath = mustImport ? resolve(REPO, mustImport) : null;
  if (!mustImport) problems.push('frozenConstants.mustImport is absent -- nothing says where the contract lives');
  else if (pointerPath !== WGEO_PATH) problems.push(`frozenConstants.mustImport points at ${mustImport}, but this validator imported ${WGEO_PATH}`);

  // ...and the contract must still export its shape, so V1 cannot pass vacuously
  const shapeOk = Boolean(ORIGIN) && Number.isInteger(ORIGIN.lonUdeg) && Number.isInteger(ORIGIN.latUdeg)
    && Number.isInteger(worldGrid.blockSize) && worldGrid.blockSize > 0
    && Number.isInteger(worldGrid.wTiles) && worldGrid.wTiles > 0
    && Number.isFinite(PROJECTION.metresPerDegreeLon) && Number.isFinite(PROJECTION.metresPerDegreeLat)
    && Array.isArray(VALUE_KINDS) && VALUE_KINDS.length > 0 && VALUE_KINDS.every((k) => typeof k === 'string')
    && Array.isArray(GUIDE_VERIFIED_COLUMN_ALLOWED)
    && GUIDE_VERIFIED_COLUMN_ALLOWED.every((k) => VALUE_KINDS.includes(k));
  if (!shapeOk) problems.push('the imported contract no longer exports the expected shape');

  check('V1', 'the contract is imported, not copied (D-12)',
    problems.length === 0,
    `scanned the whole file for ${CONTRACT_MIRROR_KEYS.length} contract-mirror key names and ` +
    `${CONTRACT_LITERAL_VALUES.length} high-entropy contract literals: ` +
    `mirrored keys=${foundKeys.length} (bound 0), mirrored literals=${foundValues.length} (bound 0); ` +
    `pointer ${mustImport ? `resolves to ${WGEO_PATH.split(/[\\/]/).pop()}` : 'MISSING'} and the module exports the expected shape=${shapeOk}; ` +
    `no enum is stored here, so the live enum is ${VALUE_KINDS.length} members (${VALUE_KINDS.join('|')}) and this file follows it automatically; ` +
    `problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V2 — every cell is an integer inside the 40x40 block
 * ------------------------------------------------------------------ */
{
  const bad = [];
  for (const d of doors) {
    for (const k of ['cellX', 'cellY']) {
      if (!Number.isInteger(d[k]) || d[k] < 0 || d[k] >= worldGrid.blockSize) {
        bad.push(`${d.doorId}.${k}=${d[k]}`);
      }
    }
  }
  const xs = doors.map((d) => d.cellX), ys = doors.map((d) => d.cellY);
  check('V2', `all ${doors.length} doors land in cellX, cellY in [0, ${worldGrid.blockSize})`, bad.length === 0,
    `bounds from worldGrid.blockSize=${worldGrid.blockSize}; cellX ${Math.min(...xs)}..${Math.max(...xs)}, ` +
    `cellY ${Math.min(...ys)}..${Math.max(...ys)}; violations=${bad.length}${bad.length ? ' -> ' + bad.join(', ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V3 — pairwise distinct cells and >= 1 m separation
 * ------------------------------------------------------------------ */
{
  const key = (d) => `${d.cellX},${d.cellY}`;
  const seen = new Map();
  const collisions = [];
  for (const d of doors) {
    if (seen.has(key(d))) collisions.push(`${d.doorId} shares cell (${key(d)}) with ${seen.get(key(d))}`);
    else seen.set(key(d), d.doorId);
  }
  let minD = Infinity, minPair = null;
  for (let i = 0; i < doors.length; i += 1) {
    for (let j = i + 1; j < doors.length; j += 1) {
      const a = doors[i], b = doors[j];
      const ax = a.placement.subX / 16, ay = a.placement.subY / 16;
      const bx = b.placement.subX / 16, by = b.placement.subY / 16;
      const dist = Math.hypot(ax - bx, ay - by);
      if (dist < minD) { minD = dist; minPair = `${a.doorId}..${b.doorId}`; }
    }
  }
  check('V3', 'cells are pairwise distinct and every pair is >= 1 m apart',
    collisions.length === 0 && minD >= 1.0,
    `distinct cells ${seen.size}/${doors.length}; collisions=${collisions.length}` +
    `${collisions.length ? ' -> ' + collisions.join('; ') : ''}; ` +
    `min pairwise separation ${minD.toFixed(4)} m (${minPair}) vs bound 1.0000 m`);
}

/* ------------------------------------------------------------------ *
 * V4 — the declared cells are reproduced from the stored OSM geometry
 * ------------------------------------------------------------------ */
{
  const q1 = readJson(resolve(EVID_DIR, 'osm-block-q1-footprints.json'));
  const byWay = new Map(q1.elements.filter((e) => e.type === 'way').map((w) => [w.id, w]));
  const problems = [];
  const lines = [];
  for (const f of facades) {
    const w = byWay.get(f.osmBuildingId);
    if (!w) { problems.push(`facade ${f.facadeId}: way ${f.osmBuildingId} absent from evidence`); continue; }
    // the cited node ids must be consecutive vertices of the cited way
    const i = w.nodes.indexOf(f.facadeRunFull.fromNode);
    const j = w.nodes.indexOf(f.facadeRunFull.toNode);
    const consecutive = i >= 0 && j >= 0 && (
      (i + 1) % w.nodes.length === j || (j + 1) % w.nodes.length === i);
    if (!consecutive) problems.push(`facade ${f.facadeId}: nodes ${f.facadeRunFull.fromNode}/${f.facadeRunFull.toNode} are not a consecutive edge of way ${f.osmBuildingId}`);
    // reproject the raw microdegrees and compare with the recorded metres.
    // NOTE: the stored microdegrees are integer-rounded, while the stored metres
    // came from the unrounded lon/lat, so a sub-micrometre residual is expected
    // and the tolerance is set accordingly (a microdegree is 91.28 mm, so the
    // rounding residual must stay far below one fact-layer quantum).
    const A = projectMicroDeg(f.facadeRunFull.fromUdeg.lonUdeg, f.facadeRunFull.fromUdeg.latUdeg, ORIGIN);
    const B = projectMicroDeg(f.facadeRunFull.toUdeg.lonUdeg, f.facadeRunFull.toUdeg.latUdeg, ORIGIN);
    const dA = Math.hypot(A.x_m - f.facadeRunFull.fromM.xM, A.y_m - f.facadeRunFull.fromM.yM);
    const dB = Math.hypot(B.x_m - f.facadeRunFull.toM.xM, B.y_m - f.facadeRunFull.toM.yM);
    const xExt = B.x_m - A.x_m;
    const eLen = Math.hypot(B.x_m - A.x_m, B.y_m - A.y_m);
    const frontageOk = Math.abs(xExt - f.facadeRunFull.frontageXM) < 1e-4;
    const edgeLenOk = Math.abs(eLen - f.facadeRunFull.edgeLengthM) < 1e-4;
    if (dA > 1e-3 || dB > 1e-3 || !frontageOk || !edgeLenOk) {
      problems.push(`facade ${f.facadeId}: reprojection dA=${dA.toExponential(2)} dB=${dB.toExponential(2)} ` +
        `frontageOk=${frontageOk} (${xExt.toFixed(6)} vs ${f.facadeRunFull.frontageXM}) edgeLenOk=${edgeLenOk} (${eLen.toFixed(6)} vs ${f.facadeRunFull.edgeLengthM})`);
    }
    // the clipped frontage must equal the block clip applied to the full run
    const clippedTo = Math.min(B.x_m, worldGrid.blockSize);
    const clippedFrom = Math.max(A.x_m, 0);
    const clipOk = Math.abs((clippedTo - clippedFrom) - f.facadeRunClippedToBlock.frontageXM) < 1e-4 &&
      Math.abs(clippedFrom - f.facadeRunClippedToBlock.fromM) < 1e-4 &&
      Math.abs(clippedTo - f.facadeRunClippedToBlock.toM) < 1e-4;
    if (!clipOk) problems.push(`facade ${f.facadeId}: clipped run does not match the block clip`);
    lines.push(`${f.facadeId} way ${f.osmBuildingId} edge ${f.facadeRunFull.fromNode}->${f.facadeRunFull.toNode} ` +
      `edgeOK=${consecutive} frontageX=${xExt.toFixed(6)}m edgeLen=${eLen.toFixed(6)}m clipped=${(clippedTo - clippedFrom).toFixed(6)}m`);
  }
  for (const d of doors) {
    const p = d.placement;
    const sub = quantizeToSubTile(p.authoredXM, p.authoredYM);
    const cx = tileFromSub(sub.subX);
    const cy = tileFromSub(sub.subY) + GRID.halfCrossTiles;
    if (sub.subX !== p.subX || sub.subY !== p.subY || cx !== d.cellX || cy !== d.cellY) {
      problems.push(`${d.doorId}: declared sub/cell (${p.subX},${p.subY})->(${d.cellX},${d.cellY}) ` +
        `but recomputed (${sub.subX},${sub.subY})->(${cx},${cy})`);
    }
    if (p.floorXMVersusCanonical.floorXM !== Math.floor(p.authoredXM) ||
        p.floorXMVersusCanonical.floorYM !== Math.floor(p.authoredYM)) {
      problems.push(`${d.doorId}: recorded floor() does not match Math.floor(authored)`);
    }
    // the module midpoint must be the midpoint of its declared storefront module
    const run = d.facadeLineRun;
    const width = run.storefrontModule.widthM;
    const expected = run.fromM + (run.storefrontModule.indexOnFacade + 0.5) * width;
    if (Math.abs(expected - p.authoredXM) > 1e-5) {
      problems.push(`${d.doorId}: module midpoint expected ${expected.toFixed(6)} got ${p.authoredXM}`);
    }
  }
  check('V4', 'declared cells re-derived from stored OSM geometry + imported quantiser',
    problems.length === 0,
    `${lines.join(' | ')}; recomputed ${doors.length} doors; problems=${problems.length}` +
    `${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V5 — canonical sub-tile lies in its cell, on its facade
 * ------------------------------------------------------------------ */
{
  const problems = [];
  let maxPerp = 0, maxShift = 0, maxPerpDoor = '';
  const BOUND = 1 / 32; // 0.03125 m — the contract's A3 disagreement bound
  for (const d of doors) {
    const p = d.placement;
    const qx = p.subX / 16, qy = p.subY / 16;
    if (tileFromSub(p.subX) !== d.cellX || tileFromSub(p.subY) + GRID.halfCrossTiles !== d.cellY) {
      problems.push(`${d.doorId}: canonical sub-tile outside its declared cell`);
    }
    // distance from the quantised point to the facade LINE (infinite line through the run)
    const run = d.facadeLineRun;
    const dx = run.toM - run.fromM, dy = run.yToM - run.yFromM;
    const L = Math.hypot(dx, dy);
    const perp = Math.abs((qx - run.fromM) * dy - (qy - run.yFromM) * dx) / L;
    if (perp > BOUND + 1e-9) problems.push(`${d.doorId}: ${perp.toFixed(6)} m off the facade line (> ${BOUND})`);
    // The perpendicular offset is COMPUTED here, never read from the record. The ODbL
    // half used to store a per-door perpendicularOffsetFromFacadeM; it did not
    // reproduce from the geometry (worst 3.600 mm at D-S4, where the natural
    // perpendicular distance is 0.015200 m against a stored 0.018806 m) and was
    // dropped in task-9. A derived value stored beside its source is a second source
    // of truth, so this assertion is now the only place the number exists.
    // the door must sit within the run, not past either end
    if (qx < run.fromM - 1e-9 || qx > run.toM + 1e-9) problems.push(`${d.doorId}: x ${qx} outside run [${run.fromM},${run.toM}]`);
    const shift = Math.max(Math.abs(qx - p.authoredXM), Math.abs(qy - p.authoredYM));
    if (Math.abs(shift - Math.max(p.quantisationShiftM.x, p.quantisationShiftM.y)) > 1e-6) {
      problems.push(`${d.doorId}: recorded quantisation shift disagrees with recomputed`);
    }
    maxPerp = Math.max(maxPerp, perp);
    maxShift = Math.max(maxShift, shift);
    if (perp === maxPerp) maxPerpDoor = d.doorId;
  }
  check('V5', `every door sits in its own cell and within 1/32 m of its measured facade line`,
    problems.length === 0,
    `max perpendicular offset ${maxPerp.toFixed(6)} m (${maxPerpDoor}) -- COMPUTED here, not stored; ` +
    `max quantisation shift ${maxShift.toFixed(6)} m; bound ${BOUND} m; ` +
    `problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V6 — the acceptance criterion: every osmBuildingId resolves in the slice
 * ------------------------------------------------------------------ */
let sliceHash = null;
{
  const slice = readJson(SLICE_PATH);
  sliceHash = sha256(SLICE_PATH);
  const index = new Map(slice.elements.map((e) => [`${e.type}/${e.id}`, e]));
  const rows = [];
  const problems = [];
  for (const d of doors) {
    const el = index.get(`way/${d.osmBuildingId}`);
    if (!el) { problems.push(`${d.doorId}: way/${d.osmBuildingId} NOT FOUND in slice`); rows.push(`${d.doorId} MISSING`); continue; }
    const hasBuilding = Boolean(el.tags && el.tags.building);
    if (!hasBuilding) problems.push(`${d.doorId}: way/${d.osmBuildingId} has no building tag`);
    const c = el.center ? projectMicroDeg(Math.round(el.center.lon * 1e6), Math.round(el.center.lat * 1e6), ORIGIN) : null;
    if (!c) problems.push(`${d.doorId}: way/${d.osmBuildingId} has no center in the slice`);
    rows.push(`${d.doorId} -> way/${d.osmBuildingId} "${el.tags.name || '(unnamed)'}" ` +
      `building=${el.tags.building} levels=${el.tags['building:levels'] || '-'} ` +
      `centroid=(${c ? c.x_m.toFixed(1) : '?'}, ${c ? c.y_m.toFixed(1) : '?'})m`);
    if (d.osmBuildingName && el.tags.name !== d.osmBuildingName) {
      problems.push(`${d.doorId}: name mismatch slice="${el.tags.name}" file="${d.osmBuildingName}"`);
    }
  }
  const uniq = new Set(doors.map((d) => d.osmBuildingId));
  check('V6', `all ${doors.length} osmBuildingId values resolve in the corpus slice`,
    problems.length === 0,
    `slice=${SLICE_PATH.split(/[\\/]/).slice(-1)[0]} (${slice.elements.length} elements, sha256 ${sliceHash.slice(0, 16)}...); ` +
    `distinct building ids used=${uniq.size}; unresolved/mismatched=${problems.length}` +
    `${problems.length ? ' -> ' + problems.join('; ') : ''}`);
  for (const r of rows) console.log(`      ${r}`);
}

/* ------------------------------------------------------------------ *
 * V7 — each door's facade edge belongs to the way it registers
 * ------------------------------------------------------------------ */
{
  const wayOfFacade = new Map(facades.map((f) => [f.facadeId, f.osmBuildingId]));
  const problems = [];
  for (const d of doors) {
    const owner = wayOfFacade.get(d.facadeLineRun.facadeId);
    if (owner === undefined) problems.push(`${d.doorId}: unknown facadeId ${d.facadeLineRun.facadeId}`);
    else if (owner !== d.osmBuildingId) {
      problems.push(`${d.doorId}: registers way ${d.osmBuildingId} but sits on facade ${d.facadeLineRun.facadeId} owned by way ${owner}`);
    }
  }
  check('V7', 'every door is bound to the footprint that actually owns its facade edge',
    problems.length === 0,
    `facades: ${[...wayOfFacade].map(([k, v]) => `${k}=way ${v}`).join(', ')}; ` +
    `problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V8 — provenance: valid valueKind, and the guide's verified column
 * ------------------------------------------------------------------ */
{
  const problems = [];
  const byKind = {};
  let admitted = 0;
  for (const d of doors) {
    const p = d.provenance;
    if (!p || !isValueKind(p.valueKind)) { problems.push(`${d.doorId}: valueKind ${JSON.stringify(p && p.valueKind)} is not a frozen member`); continue; }
    byKind[p.valueKind] = (byKind[p.valueKind] || 0) + 1;
    if (mayAppearInGuideVerifiedColumn(p.valueKind)) admitted += 1;
    if (p.valueKind !== VALUE_KIND.OBSERVED && p.guideVerifiedColumnAllowed === true) {
      problems.push(`${d.doorId}: ${p.valueKind} claims admission to the guide's verified column`);
    }
    if (!p.verifiedAt || !p.verifiedBy || !p.source) problems.push(`${d.doorId}: provenance incomplete`);
    // the per-field breakdown must exist and must not launder a field upward
    const f = p.fields || {};
    for (const k of ['osmBuildingId', 'facadeLineRun', 'cellX', 'cellY', 'entrancePointJa', 'interiorTemplate']) {
      if (!isValueKind(f[k])) problems.push(`${d.doorId}: field ${k} has no valid valueKind`);
    }
    for (const k of Object.keys(f)) {
      if (f[k] === VALUE_KIND.OBSERVED && p.valueKind !== VALUE_KIND.OBSERVED && !['osmBuildingId', 'facadeLineRun'].includes(k)) {
        problems.push(`${d.doorId}: field ${k} marked observed inside a ${p.valueKind} record -- not permitted`);
      }
    }
    if (!['本門', '側門', '路地奥'].includes(d.entrancePointJa)) problems.push(`${d.doorId}: entrancePointJa ${JSON.stringify(d.entrancePointJa)} outside the domain`);
    if (!['S 10×7', 'M 13×9', 'L 16×10'].includes(d.interiorTemplate)) problems.push(`${d.doorId}: interiorTemplate ${JSON.stringify(d.interiorTemplate)} outside the domain`);
  }
  const declared = doorsDoc.summary.byValueKind;
  const summaryOk = VALUE_KINDS.every((k) => (declared[k] || 0) === (byKind[k] || 0));
  if (!summaryOk) problems.push('summary.byValueKind disagrees with the doors');
  check('V8', "valueKind is a frozen member and only `observed` reaches the guide's verified column",
    problems.length === 0,
    `kinds=${JSON.stringify(byKind)} (allowed ${JSON.stringify(GUIDE_VERIFIED_COLUMN_ALLOWED)} -> admitted=${admitted}); ` +
    `every door keeps guideVerifiedColumnAllowed=false, so authored/licenced/abstract all stay out; ` +
    `summary matches=${summaryOk}; problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V9 — facade lines agree with the mapped sidewalks
 * ------------------------------------------------------------------ */
{
  const q1 = readJson(resolve(EVID_DIR, 'osm-block-q1-footprints.json'));
  const byWay = new Map(q1.elements.filter((e) => e.type === 'way').map((w) => [w.id, w]));
  // y of a polyline at a given x, by linear interpolation inside the bracketing segment
  const yAtX = (w, x) => {
    const pts = w.geometry.map((p) => [p.lon, p.lat]).map(([lo, la]) => {
      const m = projectMicroDeg(Math.round(lo * 1e6), Math.round(la * 1e6), ORIGIN);
      return [m.x_m, m.y_m];
    });
    for (let i = 1; i < pts.length; i += 1) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      if ((x >= Math.min(x0, x1) && x <= Math.max(x0, x1)) && x1 !== x0) {
        return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
      }
    }
    return null;
  };
  const problems = [];
  const detail = [];
  // y, at a given x, along ONE cited edge of a building way.
  // Deliberately not a scan over the whole polygon: a building outline is a closed
  // ring, so at a given x it has a street-facing wall AND a back wall, and a blind
  // scan returns whichever edge happens to come first (it returned y=78.6 for the
  // north building's rear wall on the first run of this validator).
  const edgeYAtX = (w, nodeA, nodeB, x) => {
    const i = w.nodes.indexOf(nodeA), j = w.nodes.indexOf(nodeB);
    if (i < 0 || j < 0) return null;
    const P = (k) => projectMicroDeg(Math.round(w.geometry[k].lon * 1e6), Math.round(w.geometry[k].lat * 1e6), ORIGIN);
    const A = P(i), B = P(j);
    if (x < Math.min(A.x_m, B.x_m) - 1e-9 || x > Math.max(A.x_m, B.x_m) + 1e-9) return null;
    if (Math.abs(B.x_m - A.x_m) < 1e-12) return null;
    return A.y_m + ((x - A.x_m) / (B.x_m - A.x_m)) * (B.y_m - A.y_m);
  };
  for (const f of facades) {
    const sw = byWay.get(f.sidewalkFootway.osmWayId);
    if (!sw) { problems.push(`${f.facadeId}: sidewalk way ${f.sidewalkFootway.osmWayId} absent from evidence`); continue; }
    const building = byWay.get(f.osmBuildingId);
    const midX = (f.facadeRunClippedToBlock.fromM + f.facadeRunClippedToBlock.toM) / 2;
    const swY = yAtX(sw, midX);
    const faY = edgeYAtX(building, f.facadeRunFull.fromNode, f.facadeRunFull.toNode, midX);
    if (swY === null || faY === null) { problems.push(`${f.facadeId}: could not interpolate (swY=${swY}, faY=${faY})`); continue; }
    const beyond = Math.abs(faY - swY);
    const sameSideAsCentreline = Math.sign(faY) === Math.sign(swY) && Math.abs(faY) > Math.abs(swY);
    const rangeOk = beyond >= 1.5 && beyond <= 4.5;
    if (!sameSideAsCentreline) problems.push(`${f.facadeId}: facade y=${faY.toFixed(3)} is not beyond its sidewalk y=${swY.toFixed(3)} on the street's far side`);
    if (!rangeOk) problems.push(`${f.facadeId}: facade-to-sidewalk ${beyond.toFixed(3)} m outside [1.5, 4.5]`);
    detail.push(`${f.facadeId} facade y=${faY.toFixed(3)} sidewalk y=${swY.toFixed(3)} beyond=${beyond.toFixed(3)}m`);
  }
  // both facades must straddle the street centreline, which is the whole point of the row convention
  const northY = facades.find((f) => f.side === 'north').facadeRunFull.fromM.yM;
  const southY = facades.find((f) => f.side === 'south').facadeRunFull.fromM.yM;
  const straddles = northY > 0 && southY < 0;
  if (!straddles) problems.push('facades do not straddle the street centreline y=0');
  check('V9', 'facade lines agree with the mapped sidewalks and straddle the street centreline',
    problems.length === 0,
    `${detail.join(' | ')}; north y=${northY.toFixed(3)} > 0 > south y=${southY.toFixed(3)} = ${straddles}; ` +
    `problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V10 — the ODbL half's raw-bytes chain still hashes correctly
 * ------------------------------------------------------------------ */
{
  const problems = [];
  const detail = [];
  const files = osmDoc.evidenceFiles || [];
  if (files.length === 0) problems.push('the ODbL half declares no evidenceFiles');
  for (const rec of files) {
    if (!rec.path || !rec.sha256) { problems.push(`evidenceFiles entry without path/sha256: ${JSON.stringify(rec).slice(0, 80)}`); continue; }
    const p = resolve(REPO, rec.path);
    if (!existsSync(p)) { problems.push(`${rec.path} missing`); continue; }
    const got = sha256(p);
    const ok = got.toLowerCase() === String(rec.sha256).toLowerCase();
    if (!ok) problems.push(`${rec.path}: recorded ${rec.sha256} but on disk ${got}`);
    if (typeof rec.bytes === 'number' && readFileSync(p).length !== rec.bytes) {
      problems.push(`${rec.path}: recorded ${rec.bytes} bytes, on disk ${readFileSync(p).length}`);
    }
    detail.push(`${rec.path.split('/').slice(-1)[0]} ${ok ? 'OK' : 'TAMPERED'} ${got.slice(0, 16)}...`);
  }
  check('V10', "the ODbL half's raw-bytes chain still hashes correctly",
    problems.length === 0,
    `${detail.join(' | ')}; digests read from the ODbL half, not from ours -- they were moved there in task-9; ` +
    `problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V11 — the slice on disk is the very bytes its measurement record names
 * ------------------------------------------------------------------ */
{
  const summaryPath = resolve(REPO, 'docs/handOff/archive/corpora/geo-japan/kyoto-slice-measurement-summary.json');
  const problems = [];
  let recorded = null;
  if (!existsSync(summaryPath)) problems.push('measurement summary absent');
  else {
    const s = readJson(summaryPath);
    recorded = s.rawResponseSha256;
    if (recorded !== sliceHash) problems.push(`measurement record says ${recorded}, slice file hashes to ${sliceHash}`);
    // the record's own counts must match the slice, so the two cannot drift apart
    const slice = readJson(SLICE_PATH);
    const ways = slice.elements.filter((e) => e.type === 'way');
    const nodes = slice.elements.filter((e) => e.type === 'node');
    const got = {
      buildingWays: ways.filter((w) => w.tags && w.tags.building).length,
      entrances: nodes.filter((n) => n.tags && n.tags.entrance).length,
      shops: nodes.filter((n) => n.tags && n.tags.shop).length,
    };
    for (const k of Object.keys(got)) {
      if (got[k] !== s.counts[k]) problems.push(`count ${k}: record=${s.counts[k]} slice=${got[k]}`);
    }
  }
  check('V11', 'slice bytes and the measurement record agree', problems.length === 0,
    `slice sha256 ${sliceHash.slice(0, 16)}... vs measurement record ${recorded ? recorded.slice(0, 16) + '...' : '(none)'}; ` +
    `counts cross-checked; problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V12 — the summary block a consumer reads without parsing every door
 * ------------------------------------------------------------------ */
{
  const s = doorsDoc.summary;
  const problems = [];
  const xs = doors.map((d) => d.cellX), ys = doors.map((d) => d.cellY);
  const uniqIds = [...new Set(doors.map((d) => d.osmBuildingId))].sort((a, b) => a - b);
  let minD = Infinity;
  for (let i = 0; i < doors.length; i += 1) {
    for (let j = i + 1; j < doors.length; j += 1) {
      minD = Math.min(minD, Math.hypot(
        doors[i].placement.subX / 16 - doors[j].placement.subX / 16,
        doors[i].placement.subY / 16 - doors[j].placement.subY / 16));
    }
  }
  const north = doors.filter((d) => d.facadeLineRun.facadeId === 'F-north').length;
  const south = doors.filter((d) => d.facadeLineRun.facadeId === 'F-south').length;
  const widths = facades.map((f) => f.facadeRunClippedToBlock.frontageXM);
  // The storefront MODULE width is a measured artefact recorded per door in the ODbL
  // half. It is NOT frontage divided by door count. The two agreed only while every
  // facade was fully tiled by its doors; they stopped agreeing in task-20 (D3), when the
  // south side was cut from five doors to three WITHOUT moving any door, so two of the
  // south facade's five modules now carry no door. frontage/count would have reported
  // 6.055049 m -- a partition the doors do not form. So the width is READ from the
  // records, checked uniform within each facade, and the un-tiled module count is
  // reported here so the consequence stays visible instead of quietly re-deriving.
  const moduleOf = (facadeId) => {
    const w = doors.filter((d) => d.facadeLineRun.facadeId === facadeId)
      .map((d) => d.facadeLineRun.storefrontModule.widthM);
    const uniq = [...new Set(w)];
    if (uniq.length !== 1) problems.push(`${facadeId}: storefrontModule.widthM is not uniform across its doors (${uniq.join(', ')})`);
    return uniq[0];
  };
  const modules = [moduleOf('F-north'), moduleOf('F-south')];
  const moduleCounts = facades.map((f, i) => Math.round(widths[i] / modules[i]));
  const doorsPerFacade = [north, south];
  moduleCounts.forEach((mc, i) => {
    if (doorsPerFacade[i] > mc) problems.push(`${facades[i].facadeId}: ${doorsPerFacade[i]} doors but only ${mc} modules of ${modules[i]} m fit its ${widths[i].toFixed(6)} m frontage`);
  });
  const untiled = moduleCounts.reduce((a, mc, i) => a + (mc - doorsPerFacade[i]), 0);
  const total = widths.reduce((a, b) => a + b, 0);
  const meanModule = modules.reduce((a, m, i) => a + m * doorsPerFacade[i], 0) / doors.length;
  const declaredTotal = doorsDoc.block.facadeFrontageTotalM;
  // Re-derive the residual maxima in summary, so they cannot be edited in place:
  // the census in V17 pins a section's COUNT, and a value edited in place does not
  // move a count. These being re-derived here is what covers them.
  //
  // NB: maxPerpendicularOffsetFromFacadeM is GONE. It was a max over per-door values
  // that did not reproduce from the geometry (worst 3.600 mm, D-S4), so in task-9 the
  // stored per-door field was dropped from the ODbL half and the aggregate with it.
  // V5 now computes the true perpendicular maximum and prints it. Do not reintroduce
  // a stored copy of a derived value.
  let maxShift = 0;
  for (const d of doors) {
    const p = d.placement;
    const qx = p.subX / 16, qy = p.subY / 16;
    maxShift = Math.max(maxShift, Math.max(Math.abs(qx - p.authoredXM), Math.abs(qy - p.authoredYM)));
  }
  const cmp = [
    ['doorCount', s.doorCount, doors.length],
    ['doorsNorthSide', s.doorsNorthSide, north],
    ['doorsSouthSide', s.doorsSouthSide, south],
    ['guideVerifiedColumnAdmitted', s.guideVerifiedColumnAdmitted, 0],
    ['minPairwiseDoorSeparationM', s.minPairwiseDoorSeparationM, Number(minD.toFixed(4))],
    ['storefrontWidthNorthM', s.storefrontWidthNorthM, Number(modules[0].toFixed(6))],
    ['storefrontWidthSouthM', s.storefrontWidthSouthM, Number(modules[1].toFixed(6))],
    ['storefrontWidthMeanM', s.storefrontWidthMeanM, Number(meanModule.toFixed(6))],
    ['facadeFrontageNorthM', doorsDoc.block.facadeFrontageNorthM, Number(widths[0].toFixed(6))],
    ['facadeFrontageSouthM', doorsDoc.block.facadeFrontageSouthM, Number(widths[1].toFixed(6))],
    ['facadeFrontageTotalM', declaredTotal, Number(total.toFixed(6))],
    ['frontageFreeWestM.north', doorsDoc.block.frontageFreeWestM.north, facades[0].facadeRunFull.fromM.xM],
    ['frontageFreeWestM.south', doorsDoc.block.frontageFreeWestM.south, facades[1].facadeRunFull.fromM.xM],
    ['maxQuantisationShiftM', s.maxQuantisationShiftM, Number(maxShift.toFixed(6))],
    ['distinctBuildingIds', JSON.stringify([...s.distinctBuildingIds].sort((a, b) => a - b)), JSON.stringify(uniqIds)],
  ];
  for (const [k, a, b] of cmp) if (a !== b) problems.push(`${k}: declared=${a} recomputed=${b}`);
  check('V12', 'summary block is self-consistent with the doors and facades it summarises',
    problems.length === 0,
    `checked ${cmp.length} summary fields; cellX ${Math.min(...xs)}..${Math.max(...xs)}, cellY ${Math.min(...ys)}..${Math.max(...ys)}; ` +
    `storefront module widths read from the ODbL records: north ${modules[0]} m x ${moduleCounts[0]} modules, south ${modules[1]} m x ${moduleCounts[1]} modules; ` +
    `doors per facade ${doorsPerFacade.join('/')}; modules carrying NO door = ${untiled}` +
    (untiled ? ` (the south facade is no longer fully tiled -- task-20 cut it from 5 doors to 3 without moving any door; this is recorded, not an error)` : '') +
    `; problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * geometry helpers for V13/V14 and the plan view
 * ------------------------------------------------------------------ */
const q1geo = readJson(resolve(EVID_DIR, 'osm-block-q1-footprints.json'));
const wayIndex = new Map(q1geo.elements.filter((e) => e.type === 'way').map((w) => [w.id, w]));
/** Project a way's outline to metres (integer-microdegree rounded, as stored). */
function outlineOf(wayId) {
  const w = wayIndex.get(wayId);
  return w.geometry.map((p) => {
    const m = projectMicroDeg(Math.round(p.lon * 1e6), Math.round(p.lat * 1e6), ORIGIN);
    return [m.x_m, m.y_m];
  });
}
function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function distToPolygonEdge(x, y, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [x0, y0] = poly[j], [x1, y1] = poly[i];
    const dx = x1 - x0, dy = y1 - y0;
    const L2 = dx * dx + dy * dy;
    let t = L2 === 0 ? 0 : ((x - x0) * dx + (y - y0) * dy) / L2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)));
  }
  return best;
}
const outlines = new Map(facades.map((f) => [f.osmBuildingId, outlineOf(f.osmBuildingId)]));

/* ------------------------------------------------------------------ *
 * V13 — every door actually sits on the wall of the building it registers
 * ------------------------------------------------------------------ */
{
  const problems = [];
  let worst = 0;
  const BOUND = WORLD_ONE_SUBTILE; // 0.0625 m: the door must stand in the wall
  for (const d of doors) {
    const poly = outlines.get(d.osmBuildingId);
    const qx = d.placement.subX / 16, qy = d.placement.subY / 16;
    const dist = distToPolygonEdge(qx, qy, poly);
    if (dist > BOUND) problems.push(`${d.doorId}: ${dist.toFixed(4)} m from way ${d.osmBuildingId}'s outline`);
    worst = Math.max(worst, dist);
  }
  check('V13', 'every door stands in the wall of the footprint it registers to', problems.length === 0,
    `worst distance from the registered footprint outline ${worst.toFixed(4)} m (bound ${BOUND} m = one 1/16 sub-tile, ` +
    `i.e. the grid snap is the only thing between the door and the wall); ` +
    `problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V14 — a door is in the wall, not in the room -- and never in the WRONG building
 * ------------------------------------------------------------------ */
{
  const problems = [];
  let worstPenetration = 0;
  for (const d of doors) {
    const qx = d.placement.subX / 16, qy = d.placement.subY / 16;
    // (a) the trap the task card names: a door must not end up inside a building it
    //     does not register to. This is a hard failure at any depth.
    for (const [id, poly] of outlines) {
      if (id === d.osmBuildingId) continue;
      if (pointInPolygon(qx, qy, poly)) {
        problems.push(`${d.doorId} registers way ${d.osmBuildingId} but its anchor is inside way ${id}`);
      }
    }
    // (b) landing inside its OWN footprint is expected and harmless: a doorway is in
    //     the wall, and the 62.5 mm grid snap puts it a few millimetres either side.
    //     What would be wrong is a door standing in the middle of the floor plate, so
    //     the penetration is bounded by half a sub-tile.
    const own = outlines.get(d.osmBuildingId);
    if (pointInPolygon(qx, qy, own)) {
      const pen = distToPolygonEdge(qx, qy, own);
      worstPenetration = Math.max(worstPenetration, pen);
      if (pen > WORLD_ONE_SUBTILE / 2) {
        problems.push(`${d.doorId}: ${pen.toFixed(4)} m inside its own footprint -- deeper than half a sub-tile`);
      }
    }
  }
  check('V14', 'no door stands inside the wrong building, nor in the middle of its own floor plate',
    problems.length === 0,
    `tested ${doors.length} anchors against ${outlines.size} outlines by ray casting; ` +
    `max penetration into the door's own footprint ${worstPenetration.toFixed(4)} m (bound ${WORLD_ONE_SUBTILE / 2} m = half a 1/16 sub-tile); ` +
    `problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V15 — every coordinate quoted for the block's real features is exact
 * ------------------------------------------------------------------ */
{
  const q2 = readJson(resolve(EVID_DIR, 'osm-block-q2-everything.json'));
  const nodeIdx = new Map(q2.elements.filter((e) => e.type === 'node').map((n) => [n.id, n]));
  const wayIdx = new Map(q2.elements.filter((e) => e.type === 'way').map((w) => [w.id, w]));
  const f = observedBlockFeatures;
  const problems = [];
  const round3 = (v) => Number(v.toFixed(3));
  const checkNode = (label, id, m) => {
    const n = nodeIdx.get(id);
    if (!n) { problems.push(`${label}: node ${id} not in evidence`); return; }
    const p = projectMicroDeg(Math.round(n.lon * 1e6), Math.round(n.lat * 1e6), ORIGIN);
    if (round3(p.x_m) !== m.xM || round3(p.y_m) !== m.yM) {
      problems.push(`${label} node ${id}: quoted (${m.xM}, ${m.yM}) evidence (${round3(p.x_m)}, ${round3(p.y_m)})`);
    }
  };
  const checkWayRange = (label, id, xR, yR) => {
    const w = wayIdx.get(id);
    if (!w) { problems.push(`${label}: way ${id} not in evidence`); return; }
    const g = w.geometry.map((p) => projectMicroDeg(Math.round(p.lon * 1e6), Math.round(p.lat * 1e6), ORIGIN));
    const xs = g.map((p) => round3(p.x_m)), ys = g.map((p) => round3(p.y_m));
    const got = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const want = [...xR, ...yR];
    if (got.join() !== want.join()) problems.push(`${label} way ${id}: quoted ${want.join()} evidence ${got.join()}`);
  };
  for (const o of f.occupant) checkNode('occupant', o.osmNodeId, o.m);
  for (const o of f.signage) checkNode('signage', o.osmNodeId, o.m);
  for (const o of f.crossing) checkNode('crossing', o.osmNodeId, o.m);
  for (const o of f.streetFurniture) checkNode('streetFurniture', o.osmNodeId, o.m);
  for (const o of f.hedges) checkWayRange('hedge', o.osmWayId, o.xRangeM, o.yRangeM);
  for (const o of f.beneathTheBlock) checkWayRange('beneath', o.osmWayId, o.xRangeM, o.yRangeM);
  const counted = f.occupant.length + f.signage.length + f.crossing.length + f.streetFurniture.length +
    f.hedges.length + f.beneathTheBlock.length;
  check('V15', "the block's quoted feature coordinates equal the evidence bytes",
    problems.length === 0,
    `verified ${counted} features (${f.occupant.length} occupant, ${f.signage.length} boards, ${f.crossing.length} crossing, ` +
    `${f.streetFurniture.length} street items, ${f.hedges.length} hedges, ${f.beneathTheBlock.length} beneath) against ` +
    `the signed evidence; problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ================================================================== *
 * SEPARATION — the ODbL split (contract GAP-6)
 *
 * These three assertions are the reason the pack is split into two files.
 * Without them the next edit that "helpfully" puts a coordinate back into
 * doors.json would pass every other check in this file, and the split would be
 * quietly undone. They read the RAW doors.json, never the join view.
 * ================================================================== */

/** Fields the split moved into the ODbL half. Must not reappear in ours. */
const CARRIED_FIELDS = Object.freeze([
  'osmBuildingId', 'osmBuildingName', 'facadeLineRun', 'observedAnchors',
  'placement', 'facades', 'observedBlockFeatures', 'unusedSourceCandidates',
]);
/** Carried fields that live at the TOP LEVEL of the ODbL half, not on a door record. */
const TOP_LEVEL_CARRIED = Object.freeze(['facades', 'observedBlockFeatures', 'unusedSourceCandidates']);
/** Our own content: the complete, closed key set of one door record.
 *  `doorType` joined this list in task-19; `doorTypeSource` is the ONE optional
 *  member, permitted only on a door that is actually classified (see V22). Keeping
 *  the set closed is what makes adding a field a review event. */
const OWN_DOOR_KEYS = Object.freeze([
  'doorId', 'cellX', 'cellY', 'tileY', 'entrancePointJa', 'doorType',
  'interiorTemplate', 'provenance', 'osmRecord',
]);
/** The one optional door key, and the condition under which it is legal. */
const OPTIONAL_DOOR_KEYS = Object.freeze(['doorTypeSource']);
/** Closed inventory of top-level sections. A new section is a review event.
 *  unusedSourceCandidates left this list in task-9, when it moved to the ODbL half. */
const TOP_LEVEL_SECTIONS = Object.freeze([
  'schema', 'pack', 'block', 'cellYConvention', 'frozenConstants', 'method',
  'contentFieldsRule', 'doors', 'summary', 'gaps',
  'contradictionsWithDesign', 'validator', 'licence', 'osmDerived',
]);
/** Closed key sets for the small sections that still carry OSM-derived values,
 *  so an aggregate cannot be smuggled in without tripping V16. */
const CLOSED_SECTIONS = Object.freeze({
  // task-15: cellMetres, subTilesPerTile and worldDepthM were contract copies and are
  // gone; cellXRange/cellYRange stay because they say WHICH block this is, not how big
  // a block is. See the rangeNote in the file itself.
  block: ['blockIndex', 'note', 'cellXRange', 'cellYRange', 'rangeNote',
    'facadeFrontageNorthM', 'facadeFrontageSouthM', 'facadeFrontageTotalM',
    'frontageFreeWestM'],
  summary: ['doorCount', 'byValueKind', 'guideVerifiedColumnAdmitted', 'doorsNorthSide',
    'doorsSouthSide', 'distinctBuildingIds', 'storefrontWidthNorthM', 'storefrontWidthSouthM',
    'storefrontWidthMeanM', 'minPairwiseDoorSeparationM', 'minSameFacadeCellSpacing',
    'maxQuantisationShiftM', 'derivedOnlyNote'],
  cellYConvention: ['formula', 'why', 'evidenceStreetCentrelineAtOrigin', 'conflictWithTaskCard'],
  // task-15: the mirror is gone, so this is now pointer and rationale only. The key set
  // is still locked, because a RETURNED mirror would otherwise slip in as a new key.
  frozenConstants: ['mustImport', 'noMirror', 'howToRead', 'whyNothingIsCopiedHere',
    'whatIsStillCopiedHere', 'enforcedBy', 'removedIn', 'whatWasRemoved'],
  // Locked in task-9 follow-up. The Lead had believed this block was already pinned by
  // V17's census; it was not -- V17 covers block/cellYConvention/frozenConstants/summary
  // only. V21 guards the required CC BY 4.0 slots, but an ARBITRARY new key here was
  // unguarded. Now it is a review event, like the other policy-bearing blocks.
  licence: ['thisFile', 'odblAppliesToThisFile', 'odblHalf', 'derivedFrom', 'source',
    'attributionRequired', 'attribution', 'odblNote', 'residualNote', 'contentLicence',
    'odblUrl', 'osmCopyrightUrl', 'contentLicenceWhy', 'contentLicenceUri',
    'contentLicenceNotice', 'contentCreator', 'contentWarrantyDisclaimer'],
});

/** Key names that only ever appear on OSM-derived data. */
const OSM_SHAPED_KEYS = new Set([
  'xM', 'yM', 'lonUdeg', 'latUdeg', 'fromM', 'toM', 'fromUdeg', 'toUdeg', 'subX', 'subY',
  'edgeNodes', 'osmWayId', 'osmNodeId', ...CARRIED_FIELDS,
]);
const isData = (v) => typeof v === 'number' || Array.isArray(v) || (v !== null && typeof v === 'object');

/**
 * Every OSM element id this pack's evidence contains. Used two ways: a bare
 * number equal to one of these is an OSM id being stored as data, and one
 * appearing inside a longer string is a citation.
 */
const evidenceIds = new Set();
for (const j of [readJson(resolve(EVID_DIR, 'osm-block-q1-footprints.json')),
  readJson(resolve(EVID_DIR, 'osm-block-q2-everything.json'))]) {
  for (const e of j.elements) evidenceIds.add(e.id);
}

/**
 * Distinctive numbers from the ODbL half: more than three decimal places, or an
 * integer of 1000+. Exact equality with one of these is strong evidence that a
 * value was measured off OSM geometry. Numbers this shape do not collide by
 * chance, which is why the test is shaped this way rather than by magnitude.
 */
const odblNumbers = new Set();
(function collect(v) {
  if (typeof v === 'number') {
    const distinctive = Number.isInteger(v) ? Math.abs(v) >= 1000 : Math.abs(v * 1000 - Math.round(v * 1000)) > 1e-6;
    if (distinctive) odblNumbers.add(v);
  } else if (Array.isArray(v)) v.forEach(collect);
  else if (v && typeof v === 'object') Object.values(v).forEach(collect);
})(osmDoc);

/**
 * Classify every value in a JSON tree.
 *   VALUE     — OSM-derived DATA: an id, a microdegree, a geometry key holding
 *               a structure, or a number that matches the ODbL half exactly.
 *               These are what must not live in our file.
 *   REFERENCE — a citation or a field NAME (a provenance string naming a way
 *               id, or `provenance.fields.osmBuildingId = "observed"`). Naming
 *               the source is the point of a provenance field, and the ODbL
 *               framing allows it: doors.json carries references, not values.
 */
function classify(value, path, out) {
  if (typeof value === 'number') {
    if (evidenceIds.has(value)) out.push(['VALUE:osm-element-id', path]);
    else if (Number.isInteger(value) && Math.abs(value) >= 1_000_000) out.push(['VALUE:microdegree', path]);
    else if (odblNumbers.has(value)) out.push(['VALUE:matches-odbl-number', path]);
  } else if (typeof value === 'string') {
    const tokens = value.match(/\d{7,}/g);
    if (tokens && tokens.some((t) => evidenceIds.has(Number(t)))) out.push(['REF:osm-id-in-string', path]);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => classify(v, `${path}[${i}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (OSM_SHAPED_KEYS.has(k)) out.push([isData(v) ? `VALUE:field:${k}` : `REF:name:${k}`, `${path}.${k}`]);
      classify(v, `${path}.${k}`, out);
    }
  }
  return out;
}

/** Census of VALUE signals over the whole raw doors.json, keyed by section. */
function valueCensus(doc) {
  const census = {};
  for (const [section, body] of Object.entries(doc)) {
    const hits = classify(body, section, []).filter((h) => h[0].startsWith('VALUE'));
    if (hits.length === 0) continue;
    census[section] = { count: hits.length, kinds: [...new Set(hits.map((h) => h[0]))].sort() };
  }
  return census;
}

/**
 * THE DECLARED RESIDUAL. doors.json still carries OSM-derived values in these
 * places, and pinning them here is deliberate: an exact census means the residual
 * can neither grow silently nor shrink silently. Growth means someone put a value
 * back. Shrinkage means the split advanced -- correct the census in the same
 * commit.
 *
 *   summary                 distinctBuildingIds, and widths/offsets measured off the facades
 *   block                   frontage widths and the frontage-free west end, measured off the footprints
 *   cellYConvention         the way/node ids proving the origin sits on the street centreline
 *
 * TWO SECTIONS HAVE LEFT THIS CENSUS, both on purpose:
 *   unusedSourceCandidates  42 values, moved to the ODbL half in task-9, on the Lead's
 *                           call that 'unused' does not make a full geometry record ours.
 *   frozenConstants         4 values, gone in task-15. They were the projection ORIGIN's
 *                           two integer microdegrees plus the latUdeg/lonUdeg key names.
 *                           A mirrored contract literal is not an OSM-derived measurement
 *                           we chose to keep -- it was a copy, and copies drift. Removing
 *                           it dropped this section out of the census entirely.
 * summary also lost maxPerpendicularOffsetFromFacadeM when its non-reproducing
 * per-door source was dropped.
 *
 * WHAT PINS THE RESIDUAL (stated because a census alone does not):
 *   summary, block    re-derived by V12 (15 fields, incl. the quantisation maximum
 *                     and the frontage-free west end)
 *   doors, facades    re-derived by V4/V5/V9/V13/V14
 *   cellYConvention.evidenceStreetCentrelineAtOrigin
 *     -> pinned by count and key set ONLY. A value inside it could be edited in
 *        place without this validator noticing. That is the acknowledged soft spot,
 *        and it is why cellYConvention is the next candidate to leave this file.
 *   frozenConstants   was pinned by V1 against the import; now there is nothing
 *                     there to pin, and V1 pins its ABSENCE instead.
 *
 * KNOWN BLIND SPOT, stated rather than papered over: an aggregate that exists ONLY
 * in doors.json and was computed from ODbL geometry -- summary.minPairwiseDoorSeparationM,
 * block.facadeFrontageTotalM -- has no twin in the ODbL half, so exact-number
 * matching cannot see it. The closed key sets in CLOSED_SECTIONS are what stop a
 * new one appearing; V12 is what stops an existing one moving.
 */
const DECLARED_VALUE_CENSUS = Object.freeze({
  block: { count: 4, kinds: ['VALUE:matches-odbl-number'] },
  cellYConvention: { count: 3, kinds: ['VALUE:field:osmWayId', 'VALUE:osm-element-id'] },
  summary: { count: 5, kinds: ['VALUE:matches-odbl-number', 'VALUE:osm-element-id'] },
});

/* ------------------------------------------------------------------ *
 * V16 — doors.json carries no OSM-derived value
 * ------------------------------------------------------------------ */
{
  const problems = [];
  const raw = doorsDoc.doors;

  // (a) every door record has exactly our own keys, plus at most a declared optional
  //     key. The set stays closed so that adding a FIELD is a review event -- that is
  //     the property task-19 needed when it added doorType. DoorType SEMANTICS are
  //     V22's job, not this one: this checks shape only.
  for (const d of raw) {
    const keys = Object.keys(d).sort();
    const want = [...OWN_DOOR_KEYS].sort();
    const extra = keys.filter((k) => !want.includes(k));
    const undeclared = extra.filter((k) => !OPTIONAL_DOOR_KEYS.includes(k));
    const missing = want.filter((k) => !keys.includes(k));
    if (undeclared.length || missing.length) {
      problems.push(`${d.doorId}: key set differs` +
        `${undeclared.length ? ` -- EXTRA [${undeclared.join(', ')}]` : ''}${missing.length ? ` -- missing [${missing.join(', ')}]` : ''}`);
    }
  }

  // (b) no door record carries any OSM-derived value at all
  const doorValues = classify(raw, 'doors', []).filter((h) => h[0].startsWith('VALUE'));
  for (const [kind, path] of doorValues.slice(0, 8)) problems.push(`door record carries ${kind} at ${path}`);
  if (doorValues.length > 8) problems.push(`... and ${doorValues.length - 8} more value signals inside doors[]`);

  // (c) none of the moved fields reappears at the top level
  for (const k of CARRIED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(doorsDoc, k)) {
      problems.push(`top-level key "${k}" is back in doors.json -- it belongs in the ODbL half`);
    }
  }

  // (d) closed inventory of top-level sections
  const topKeys = Object.keys(doorsDoc).sort();
  const extraTop = topKeys.filter((k) => !TOP_LEVEL_SECTIONS.includes(k));
  const missingTop = TOP_LEVEL_SECTIONS.filter((k) => !topKeys.includes(k));
  if (extraTop.length) problems.push(`undeclared top-level section(s): [${extraTop.join(', ')}] -- declare them in TOP_LEVEL_SECTIONS after checking they carry no OSM value`);
  if (missingTop.length) problems.push(`declared top-level section(s) missing: [${missingTop.join(', ')}]`);

  // (e) closed key sets for the sections that still carry residual values
  for (const [section, declared] of Object.entries(CLOSED_SECTIONS)) {
    const got = Object.keys(doorsDoc[section] || {}).sort();
    const want = [...declared].sort();
    if (got.join() !== want.join()) {
      const extra = got.filter((k) => !want.includes(k));
      problems.push(`${section}: key set differs${extra.length ? ` -- EXTRA [${extra.join(', ')}]` : ''}`);
    }
  }

  const refs = classify(raw, 'doors', []).filter((h) => h[0].startsWith('REF')).length;
  check('V16', 'doors.json carries no OSM-derived value (the ODbL separation holds)',
    problems.length === 0,
    `${raw.length} door records, key set closed at [${OWN_DOOR_KEYS.join(', ')}]; ` +
    `OSM-derived VALUE signals inside doors[] = ${doorValues.length} (bound 0); ` +
    `${refs} REFERENCE signals are allowed and expected (provenance citations and field names); ` +
    `${Object.keys(CLOSED_SECTIONS).length} residual-bearing sections key-locked; ` +
    `${TOP_LEVEL_SECTIONS.length} top-level sections declared; ` +
    `problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V17 — the residual OSM content is exactly the declared census
 * ------------------------------------------------------------------ */
{
  const got = valueCensus(doorsDoc);
  const problems = [];
  const sections = [...new Set([...Object.keys(got), ...Object.keys(DECLARED_VALUE_CENSUS)])].sort();
  for (const s of sections) {
    const a = got[s], b = DECLARED_VALUE_CENSUS[s];
    if (!b) { problems.push(`NEW residual section "${s}" (${a.count} values: ${a.kinds.join(', ')}) -- move it to the ODbL half, or declare it here`); continue; }
    if (!a) { problems.push(`section "${s}" no longer carries residual values -- the split advanced; remove it from DECLARED_VALUE_CENSUS`); continue; }
    if (a.count !== b.count) problems.push(`"${s}": count ${a.count} vs declared ${b.count}`);
    if (a.kinds.join() !== b.kinds.join()) problems.push(`"${s}": kinds [${a.kinds.join(', ')}] vs declared [${b.kinds.join(', ')}]`);
  }
  const total = Object.values(got).reduce((n, v) => n + v.count, 0);
  check('V17', 'the OSM-derived residual in doors.json is exactly the declared census',
    problems.length === 0,
    `${total} OSM-derived values remain in doors.json across ${Object.keys(got).length} sections ` +
    `(${sections.map((s) => `${s}=${got[s] ? got[s].count : 0}`).join(', ')}). ` +
    `This is the INCOMPLETE part of the split, pinned so it cannot grow silently. ` +
    `problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V18 — every osmRecord pointer resolves to the same doorId in the ODbL half
 * ------------------------------------------------------------------ */
{
  const problems = [];
  const pointer = /^(.+?)#\/doors\[doorId=(.+)\]$/;
  const osmDoors = osmDoc.doors || [];
  const targetIds = new Set(osmDoors.map((r) => r.doorId));
  const referenced = new Set();
  const pointerFiles = new Set();

  // the file the pointer block names must be the file we actually read
  const declaredFile = doorsDoc.osmDerived.file;
  if (resolve(REPO, declaredFile) !== OSM_PATH) {
    problems.push(`osmDerived.file says ${declaredFile} but the validator read ${OSM_PATH}`);
  }
  const osmHash = sha256(OSM_PATH);
  if (osmHash.toLowerCase() !== String(doorsDoc.osmDerived.sha256).toLowerCase()) {
    problems.push(`osmDerived.sha256 says ${doorsDoc.osmDerived.sha256} but the file hashes to ${osmHash}`);
  }

  for (const d of doorsDoc.doors) {
    const p = d.osmRecord;
    if (typeof p !== 'string') { problems.push(`${d.doorId}: osmRecord is not a string`); continue; }
    const m = pointer.exec(p);
    if (!m) { problems.push(`${d.doorId}: osmRecord "${p}" does not match <file>#/doors[doorId=<id>]`); continue; }
    const [, file, id] = m;
    pointerFiles.add(file);
    if (resolve(REPO, file) !== OSM_PATH) problems.push(`${d.doorId}: osmRecord names ${file}, not the ODbL half`);
    if (id !== d.doorId) problems.push(`${d.doorId}: osmRecord points at doorId=${id}`);
    if (!targetIds.has(id)) { problems.push(`${d.doorId}: doorId=${id} has no record in the ODbL half`); continue; }
    const rec = osmByDoor.get(id);
    if (rec.doorId !== id) problems.push(`${d.doorId}: ODbL record's own doorId is ${rec.doorId}`);
    if (rec.doorId !== d.doorId) problems.push(`${d.doorId}: ODbL record resolves to a DIFFERENT door (${rec.doorId})`);
    const missing = CARRIED_FIELDS.filter((k) => !TOP_LEVEL_CARRIED.includes(k) &&
      !Object.prototype.hasOwnProperty.call(rec, k));
    if (missing.length) problems.push(`${d.doorId}: ODbL record is missing moved field(s) [${missing.join(', ')}]`);
    referenced.add(id);
  }
  // carried fields that live at the top level of the ODbL half, not on a door record
  for (const k of TOP_LEVEL_CARRIED) {
    if (!Object.prototype.hasOwnProperty.call(osmDoc, k)) {
      problems.push(`ODbL half is missing top-level carried field "${k}"`);
    }
  }
  // bijection: no orphan ODbL records, none referenced twice
  if (referenced.size !== doorsDoc.doors.length) {
    problems.push(`${referenced.size} distinct ODbL records referenced by ${doorsDoc.doors.length} doors`);
  }
  const orphans = osmDoors.filter((r) => !referenced.has(r.doorId)).map((r) => r.doorId);
  if (orphans.length) problems.push(`orphan ODbL records: [${orphans.join(', ')}]`);

  check('V18', 'every osmRecord pointer resolves to the same doorId in the ODbL half',
    problems.length === 0,
    `${doorsDoc.doors.length} pointers -> ${referenced.size} distinct ODbL records, bijective (orphans=${orphans.length}); ` +
    `pointer file(s): ${[...pointerFiles].join(', ')}; ODbL sha256 ${osmHash.slice(0, 16)}... matches osmDerived.sha256; ` +
    `each target carries the moved fields; problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V19 — the ODbL half names the raw bytes it was derived from
 * ------------------------------------------------------------------ */
{
  const problems = [];
  const files = osmDoc.evidenceFiles || [];
  const hashes = [];
  if (files.length < 2) problems.push(`evidenceFiles has ${files.length} entries; both Overpass responses must be named`);
  for (const rec of files) {
    if (!rec.path) problems.push('an evidenceFiles entry has no path');
    else if (!existsSync(resolve(REPO, rec.path))) problems.push(`${rec.path} does not exist`);
    if (!/^[0-9a-f]{64}$/i.test(String(rec.sha256))) problems.push(`${rec.path}: sha256 is not a 64-hex digest`);
    else hashes.push(String(rec.sha256).slice(0, 16));
    if (!rec.osmBaseTimestamp) problems.push(`${rec.path}: no osmBaseTimestamp (the in-band osm3s timestamp)`);
    if (!rec.fetchedAtUtc) problems.push(`${rec.path}: no fetchedAtUtc`);
    if (typeof rec.bytes !== 'number') problems.push(`${rec.path}: no byte count`);
  }
  if (!osmDoc.source || osmDoc.source.extractedAt === null || osmDoc.source.extractedAt === undefined) {
    problems.push('source.extractedAt is still null -- the ODbL half does not say when it was extracted');
  }
  // the extraction must not predate the data it claims to be about
  for (const rec of files) {
    if (rec.fetchedAtUtc && rec.osmBaseTimestamp && rec.fetchedAtUtc < rec.osmBaseTimestamp) {
      problems.push(`${rec.path}: fetchedAtUtc ${rec.fetchedAtUtc} is BEFORE osmBaseTimestamp ${rec.osmBaseTimestamp}`);
    }
  }
  check('V19', 'the ODbL half names the raw bytes it was derived from',
    problems.length === 0,
    `${files.length} evidence file(s) named with path + sha256 + bytes + in-band osm3s timestamp + fetch time ` +
    `(digests ${hashes.join(', ')}); source.extractedAt = ${osmDoc.source && osmDoc.source.extractedAt}; ` +
    `problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V21 — our attribution record is as complete as the licence we elected
 *
 * CC BY 4.0 section 3(a)(1) requires creator identification, a copyright notice,
 * a licence notice, a notice referring to the disclaimer of warranties and a URI
 * to the licence to travel with the work when it is Shared. The Lead elected
 * CC BY 4.0 on 2026-09-30 and, on the first pass, recorded only the licence name
 * and the reasoning -- the material that has to travel was unbuilt. This
 * assertion is what stops that recurring.
 *
 * It is deliberately NOT a hardcoded 1:1 field list against the ODbL half. The two
 * halves are different kinds of thing (one is extracted from a dataset, the other
 * is authored), so some ODbL slots legitimately have no counterpart here. Instead
 * every ODbL `source` slot must be ACCOUNTED FOR: either mapped to a named field
 * of ours that is non-empty, or declared not-applicable with a reason. A slot that
 * is neither fails, so if the ODbL half ever gains a slot this goes red until
 * someone decides what it means for our side.
 * ------------------------------------------------------------------ */

/** Editorial floors, NOT derived facts. An editorial threshold is a different kind
 *  of value from a measured one, and this file does not blur the two. */
const EDITORIAL_MIN_NOTICE_CHARS = 40;

/** CC BY 4.0 section 3(a)(1): material that must be present on our side. */
const REQUIRED_OUR_SLOTS = Object.freeze([
  'contentLicence', 'contentLicenceUri', 'contentLicenceNotice',
  'contentWarrantyDisclaimer', 'contentCreator',
]);

/** Every ODbL `source` slot, accounted for. */
const ODBL_SOURCE_COUNTERPART = Object.freeze({
  dataset: { ours: 'thisFile', note: 'theirs names the upstream dataset; ours names what this file is' },
  licence: { ours: 'contentLicence', note: '' },
  licenceUri: { ours: 'contentLicenceUri', note: '' },
  attribution: { ours: 'contentLicenceNotice', note: 'the credit + link + changes notice CC BY 4.0 requires' },
  copyrightUrl: { ours: null, na: "Our content has no copyright page of its own. The CC BY deed URI in contentLicenceUri carries the terms, and osmCopyrightUrl covers the ODbL half's attribution." },
  extractedAt: { ours: null, na: 'Nothing was extracted. Our rows are authored and carry a per-door verifiedAt; the ODbL half carries extractedAt for the material that WAS extracted.' },
});

/**
 * A field whose ENTIRE content is one of these is a placeholder.
 *
 * Deliberately whole-string anchored, and deliberately NOT applied to explanatory
 * prose. The first version of this test matched on token presence, and it fired on
 * the Lead's `contentCreator.why`, which reads "...the repository LICENSE still
 * reads the unedited MIT placeholder..." -- a sentence ABOUT a placeholder, not a
 * placeholder. That is pattern-matching on a word instead of reading what the
 * field says, which is the exact failure this session keeps circling.
 */
const PLACEHOLDER_ONLY = /^(TBD|TODO|FIXME|XXX|UNSET|null|placeholder|n\/?a)$/i;
const hasContent = (v) => {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
};
/** Present, non-empty, and not a whole-string placeholder. Value slots only. */
const filled = (v) => hasContent(v) && !(typeof v === 'string' && PLACEHOLDER_ONLY.test(v.trim()));

/** Declared blockers: visible, counted, and fatal under --strict. */
const DECLARED_BLOCKERS = [];

{
  const problems = [];
  const L = doorsDoc.licence;

  // (1) every required slot is present, non-empty and not a placeholder
  for (const slot of REQUIRED_OUR_SLOTS) {
    if (!filled(L[slot])) problems.push(`required attribution slot "${slot}" is absent, empty, or a placeholder`);
  }
  if (L.contentLicenceUri && !/^https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/?$/.test(String(L.contentLicenceUri))) {
    problems.push(`contentLicenceUri "${L.contentLicenceUri}" is not the CC BY 4.0 deed`);
  }
  for (const slot of ['contentLicenceNotice', 'contentWarrantyDisclaimer']) {
    const v = L[slot];
    if (typeof v === 'string' && v.trim().length < EDITORIAL_MIN_NOTICE_CHARS) {
      problems.push(`${slot} is ${v.trim().length} chars; an editorial floor of ${EDITORIAL_MIN_NOTICE_CHARS} applies because a notice that says "see licence" is not a notice`);
    }
  }

  // (2) symmetry: every ODbL source slot is accounted for
  const odblSlots = Object.keys(osmDoc.source || {});
  const unaccounted = odblSlots.filter((k) => !Object.prototype.hasOwnProperty.call(ODBL_SOURCE_COUNTERPART, k));
  if (unaccounted.length) {
    problems.push(`the ODbL half has source slot(s) [${unaccounted.join(', ')}] with no entry in ODBL_SOURCE_COUNTERPART -- decide what they mean for our side`);
  }
  for (const [slot, map] of Object.entries(ODBL_SOURCE_COUNTERPART)) {
    if (!odblSlots.includes(slot)) { problems.push(`ODBL_SOURCE_COUNTERPART declares "${slot}", which the ODbL half no longer has`); continue; }
    if (map.ours === null) {
      if (!hasContent(map.na)) problems.push(`"${slot}" is declared not-applicable without a reason`);
    } else if (!filled(L[map.ours])) {
      problems.push(`${slot}: counterpart "${map.ours}" on our side is absent or empty -- this is the quiet drop the check exists to catch`);
    }
  }

  // (3) the creator slot: resolved, or explicitly declared unresolved.
  //     Accepts the two-year schema the rights holder supplied. The two years are
  //     DIFFERENT facts -- 2024 is the year of first publication, 2026 the year of
  //     the edition being licensed -- so they are asserted as a relationship rather
  //     than collapsed into one field. `.why`/`.needed` and their historical
  //     counterparts `wasBlockedBecause`/`wasNeeded` are explanatory prose, so they
  //     are checked with hasContent, NOT with the placeholder test.
  const c = L.contentCreator;
  const cObj = (c && typeof c === 'object') ? c : {};
  const yearOk = (v) => Number.isInteger(v) && v >= 1000 && v <= 2200;
  const resolved = filled(cObj.name) && (filled(cObj.firstPublicationYear) || filled(cObj.year) || filled(cObj.years));
  if (resolved) {
    for (const k of ['firstPublicationYear', 'yearOfThisEdition']) {
      if (cObj[k] !== undefined && !yearOk(cObj[k])) {
        problems.push(`contentCreator.${k} ${JSON.stringify(cObj[k])} is not a plausible 4-digit year`);
      }
    }
    if (yearOk(cObj.firstPublicationYear) && yearOk(cObj.yearOfThisEdition)
        && cObj.yearOfThisEdition < cObj.firstPublicationYear) {
      problems.push(`contentCreator.yearOfThisEdition ${cObj.yearOfThisEdition} predates firstPublicationYear ${cObj.firstPublicationYear}`);
    }
  }
  const declaredUnresolved = typeof cObj.status === 'string' && /UNRESOLVED/i.test(cObj.status)
    && (hasContent(cObj.why) || hasContent(cObj.wasBlockedBecause))
    && (hasContent(cObj.needed) || hasContent(cObj.wasNeeded));
  if (!resolved && !declaredUnresolved) {
    problems.push('contentCreator is neither a resolved credit (name + first publication year) nor explicitly flagged unresolved with why + needed');
  }
  if (!resolved && declaredUnresolved) {
    DECLARED_BLOCKERS.push({
      id: 'B1',
      what: 'CC BY 4.0 creator identification is unresolved',
      detail: `${String(cObj.status)} -- the pack cannot lawfully be distributed under CC BY 4.0 until the creator is named.`,
      needed: String(cObj.needed || cObj.wasNeeded),
      fatalWhen: '--strict',
    });
  }

  const mapped = Object.values(ODBL_SOURCE_COUNTERPART).filter((m) => m.ours).length;
  const na = Object.values(ODBL_SOURCE_COUNTERPART).filter((m) => !m.ours).length;
  const creatorNote = resolved
    ? `contentCreator resolved: ${cObj.name}` +
      (yearOk(cObj.firstPublicationYear) ? `, first published ${cObj.firstPublicationYear}` : '') +
      (yearOk(cObj.yearOfThisEdition) ? `, this edition ${cObj.yearOfThisEdition}` : '')
    : 'DECLARED BLOCKER: contentCreator is unresolved -- printed in the BLOCKED section and fatal under --strict';
  check('V21', 'our attribution record is as complete as the licence we elected requires',
    problems.length === 0,
    `${REQUIRED_OUR_SLOTS.length} required CC BY 4.0 slots present; all ` +
    `${Object.keys(ODBL_SOURCE_COUNTERPART).length} ODbL source slots accounted for ` +
    `(${mapped} mapped, ${na} declared not-applicable with a reason); ${creatorNote}` +
    `; problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * V22 — every door declares a doorType, from the IMPORTED vocabulary
 *
 * The user ruled (D-24, task-19): the first version does NOT classify doors, but the
 * structure must exist so that a later classification pass is an EDIT rather than a
 * MIGRATION. Doors that all read `entrancePointJa: "本門"` is not "unclassified",
 * it is having nowhere to put a classification.
 *
 * `unclassified` is a FINISHED STATE, not a gap. This assertion is what makes that
 * distinction mechanical rather than a promise: the field must be PRESENT on every
 * door, so "not classified" cannot decay into "field quietly dropped".
 *
 * Three guards, and the third is the one that matters most:
 *   (1) present on every door            -- structure exists;
 *   (2) value is a member of DOOR_TYPES  -- imported, never copied (D-12);
 *   (3) DOOR_TYPES is exactly the v1 set -- so EXTENDING the vocabulary turns this
 *       RED until the pin and the model doc are updated together. Without (3), adding
 *       a member silently widens what a door may claim, and the classification rules
 *       in iteration/design/door-type-model.md would drift away from the code.
 *   (4) a classified door must carry doorTypeSource -- vacuous in v1, live the first
 *       time anyone classifies anything, and the reason a type cannot be invented.
 * ------------------------------------------------------------------ */
{
  /** The v1 vocabulary, pinned EXACTLY. This is not a copy of the enum -- the enum is
   *  imported above. It is the EXPECTATION, and pinning it is what converts "someone
   *  extended the vocabulary" from a silent change into a red assertion. */
  const DECLARED_V1_DOOR_TYPES = Object.freeze(['unclassified']);
  /** The neutral member: the name of the state "this version does not decide".
   *  This is a sentinel the guard has to recognise, not a copy of the value set --
   *  the set itself is DOOR_TYPES, imported. If the neutral member is ever renamed,
   *  guard (3) fails first and points here. */
  const NEUTRAL_DOOR_TYPE = 'unclassified';

  const problems = [];

  // (1) the field is PRESENT on every door
  for (const d of doorsDoc.doors) {
    if (!Object.prototype.hasOwnProperty.call(d, 'doorType')) {
      problems.push(`${d.doorId}: carries no doorType field -- "not classified" must be a value, not an absent key`);
    }
  }

  // (2) every value is a member of the LIVE imported vocabulary
  for (const d of doorsDoc.doors) {
    if (d.doorType !== undefined && !isDoorType(d.doorType)) {
      problems.push(`${d.doorId}: doorType ${JSON.stringify(d.doorType)} is not in DOOR_TYPES [${DOOR_TYPES.join(', ')}]`);
    }
  }

  // (3) the imported vocabulary is exactly what v1 declared
  const setMatches = JSON.stringify([...DOOR_TYPES]) === JSON.stringify([...DECLARED_V1_DOOR_TYPES]);
  if (!setMatches) {
    problems.push(`DOOR_TYPES is now [${DOOR_TYPES.join(', ')}] but v1 declared [${DECLARED_V1_DOOR_TYPES.join(', ')}] -- ` +
      `extend DECLARED_V1_DOOR_TYPES here AND the classification rules in iteration/design/door-type-model.md in the same commit`);
  }

  // (4) a classified door must say where the classification came from; and a source
  //     on an unclassified door is a dangling pointer
  for (const d of doorsDoc.doors) {
    const classified = d.doorType !== undefined && d.doorType !== NEUTRAL_DOOR_TYPE;
    const src = d.doorTypeSource;
    if (classified) {
      const ok = src && typeof src === 'object' && typeof src.url === 'string' && src.url.trim() !== ''
        && typeof src.verifiedAt === 'string' && src.verifiedAt.trim() !== '';
      if (!ok) {
        problems.push(`${d.doorId}: doorType ${JSON.stringify(d.doorType)} with no doorTypeSource {url, verifiedAt} -- ` +
          `a classification must point at a source; without one it is an invented claim`);
      }
    } else if (src !== undefined) {
      problems.push(`${d.doorId}: carries doorTypeSource but is ${JSON.stringify(d.doorType)} -- a source for a classification that was not made is a dangling pointer`);
    }
  }

  const counts = {};
  for (const d of doorsDoc.doors) counts[d.doorType] = (counts[d.doorType] || 0) + 1;
  const classifiedCount = doorsDoc.doors.filter((d) => d.doorType !== undefined && d.doorType !== NEUTRAL_DOOR_TYPE).length;

  check('V22', 'every door declares a doorType from the imported vocabulary',
    problems.length === 0,
    `${doorsDoc.doors.length} doors, all carrying doorType: ${JSON.stringify(counts)}; ` +
    `vocabulary imported from world-grid.mjs = [${DOOR_TYPES.join(', ')}], ` +
    `pinned here as the v1 set = [${DECLARED_V1_DOOR_TYPES.join(', ')}], match=${setMatches}` +
    (setMatches ? '' : ' -- extending the vocabulary is a review event, see the note above') +
    `; classified doors=${classifiedCount} (v1 classifies nothing, so 0 is the finished state, not a shortfall); ` +
    `no door carries a doorTypeSource while unclassified; ` +
    `problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
}

/* ------------------------------------------------------------------ *
 * guard — an assertion may not be silently deleted to make the run green
 * ------------------------------------------------------------------ */
const MIN_ASSERTIONS = 22;
{
  check('V20', `at least ${MIN_ASSERTIONS} assertions exist`,
    results.length + 1 >= MIN_ASSERTIONS,
    `this run has ${results.length + 1} assertions; floor is ${MIN_ASSERTIONS}. ` +
    `Without this, deleting the assertion that is inconvenient would turn the run green.`);
}

/* ------------------------------------------------------------------ *
 * report
 * ------------------------------------------------------------------ */
const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;

/** 40x40 ASCII plan of the block, derived from the evidence, not from the doors file. */
function planView() {
  // street furniture read back out of the evidence
  const polyOf = (id) => outlineOf(id);
  const sidewalkWays = [465066447, 465069406].map(polyOf);
  const centrelines = [465069436, 678103923, 964931603].map(polyOf);
  const distToAny = (x, y, polys, scale = 1) => polys.reduce((best, poly) => {
    let d = Infinity;
    for (let i = 1; i < poly.length; i += 1) {
      const [x0, y0] = poly[i - 1], [x1, y1] = poly[i];
      const dx = x1 - x0, dy = y1 - y0;
      const L2 = dx * dx + dy * dy;
      let t = L2 === 0 ? 0 : ((x - x0) * dx + (y - y0) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      d = Math.min(d, Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy)));
    }
    return Math.min(best, d * scale);
  }, Infinity);
  const rows = [];
  rows.push('     ' + Array.from({ length: worldGrid.blockSize }, (_, i) => i % 10).join(''));
  for (let cellY = worldGrid.blockSize - 1; cellY >= 0; cellY -= 1) {
    let line = '';
    for (let cellX = 0; cellX < worldGrid.blockSize; cellX += 1) {
      const cx = cellX + 0.5, cy = cellY - GRID.halfCrossTiles + 0.5;
      const door = doors.find((d) => d.cellX === cellX && d.cellY === cellY);
      const inAny = [...outlines.values()].some((p) => pointInPolygon(cx, cy, p));
      let ch;
      if (door) ch = 'D';
      else if (inAny) ch = '#';
      else if (distToAny(cx, cy, sidewalkWays) < 1.2) ch = ':';
      else if (distToAny(cx, cy, centrelines) < 1.0) ch = '=';
      else if (cy > -10.983 && cy < 13.646) ch = ' ';   // 四条通 right-of-way between the facades
      else if (cx < 7 && Math.abs(cy) > 2) ch = '+';    // 烏丸通 carriageway / junction
      else ch = '.';
      line += ch;
    }
    const tag = cellY === 33 ? '  <- north facade, y~13.7' :
      cellY === 20 ? '  <- 四条通 centreline, y=0' :
        cellY === 9 ? '  <- south facade, y~-10.9' : '';
    rows.push(`${String(cellY).padStart(3)}  ${line}${tag}`);
  }
  return rows.join('\n');
}

const STRICT = process.argv.includes('--strict');
const blockersFatal = STRICT && DECLARED_BLOCKERS.length > 0;

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ passed, failed, strict: STRICT, blockers: DECLARED_BLOCKERS, results }, null, 2));
} else {
  console.log('kyoto-shijo doors — executable assertions');
  console.log(`  own content : ${DOORS_PATH.split(/[\\/]/).slice(-3).join('/')}  (${doorsDoc.doors.length} doors, no ODbL value)`);
  console.log(`  ODbL half   : ${OSM_PATH.split(/[\\/]/).slice(-3).join('/')}  (joined by doorId, ${(osmDoc.doors || []).length} records)`);
  console.log(`  block = ${worldGrid.blockSize}x${worldGrid.blockSize} cells @ 1 m  ·  ` +
    `origin=${ORIGIN.lonUdeg},${ORIGIN.latUdeg} (frozen)  ·  cellY = row = tileY + ${GRID.halfCrossTiles}  ·  ` +
    `lane tag usable as fact=${LANES_QUALITY.usableAsFact}`);
  console.log(`  doors=${doors.length}  ·  facades=${facades.length}  ·  ` +
    `frontage=${doorsDoc.block.facadeFrontageTotalM.toFixed(3)} m  ·  ` +
    `storefront mean=${doorsDoc.summary.storefrontWidthMeanM.toFixed(4)} m`);
  console.log('');
  // printed in ID order. The count-floor guard is numbered V20 but must EXECUTE last,
  // because it counts the other assertions -- so execution order and ID order differ,
  // and the reader should see the IDs ascending rather than the guard in the middle.
  const ordered = [...results].sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  for (const r of ordered) {
    console.log(`${r.id.padEnd(4)} ${r.ok ? 'PASS' : 'FAIL'}  ${r.title}`);
    console.log(`          ${r.detail}`);
  }
  console.log('');
  console.log(`${passed}/${results.length} assertions passed, ${failed} failed`);
  console.log(`slice sha256=${sliceHash}`);
  console.log(`min pairwise door separation=${doorsDoc.summary.minPairwiseDoorSeparationM} m  ·  ` +
    `max perpendicular offset from facade: see V5 (computed there, no longer stored in either file)`);
  console.log('');
  console.log('ODbL split — residual OSM-derived values still inside doors.json (pinned by V17)');
  const census = valueCensus(doorsDoc);
  const allSections = [...new Set([...Object.keys(census), ...Object.keys(DECLARED_VALUE_CENSUS)])].sort();
  for (const s of allSections) {
    const c = census[s];
    console.log(`  ${s.padEnd(24)} ${String(c ? c.count : 0).padStart(3)}` +
      `${c ? '   ' + c.kinds.join(', ') : ''}`);
  }
  console.log(`  ${'TOTAL'.padEnd(24)} ${String(Object.values(census).reduce((n, v) => n + v.count, 0)).padStart(3)}`);
  console.log('');
  console.log('BLOCKED — declared, visible, and fatal under --strict');
  if (DECLARED_BLOCKERS.length === 0) {
    console.log('  (none)');
  } else {
    for (const b of DECLARED_BLOCKERS) {
      console.log(`  ${b.id}  ${b.what}`);
      console.log(`      ${b.detail}`);
      console.log(`      needed: ${b.needed}`);
      console.log(`      fatal when: ${b.fatalWhen}`);
    }
    console.log(`  ${DECLARED_BLOCKERS.length} blocker(s) standing. The assertions above are green and exit is 0,`);
    console.log('  because nothing in the pack is FALSE -- it is not yet SHIPPABLE. Re-run with');
    console.log('  --strict to make this exit non-zero, which is the release gate.');
  }
  console.log('');
  console.log('plan view — derived from the evidence footprints, not from the doors file');
  console.log('  D door cell   # footprint interior   : 四条通 sidewalk   = street centreline   | 烏丸通   . open ground');
  console.log(planView());
}
process.exit(failed === 0 && !blockersFatal ? 0 : 1);
