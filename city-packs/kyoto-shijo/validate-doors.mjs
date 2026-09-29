#!/usr/bin/env node
/**
 * validate-doors.mjs — mechanical assertions for city-packs/kyoto-shijo/doors.json
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The city pack's fact layer is only worth what it can prove. doors.json claims
 * 12 doorways, each bound to a real OSM building footprint, each sitting in an
 * integer cell inside a 40x40 m block, each with an honest valueKind. Every one
 * of those claims is re-derived here from the stored evidence bytes and the
 * FROZEN constants -- nothing is taken on the file's word.
 *
 * The constants are IMPORTED from the authoritative module, never retyped:
 * retyping them is how the corridor length silently drifted once already
 * (wTiles 2000 -> 1600, contract section 10).
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not re-fetch Overpass. It reads the frozen evidence under
 * city-packs/kyoto-shijo/evidence/ and verifies the recorded sha256, so the run
 * is reproducible offline and detects tampering. OSM is a live database; a
 * fresh fetch is a re-verification event, not a validator step.
 *
 * Usage:  node city-packs/kyoto-shijo/validate-doors.mjs [--json]
 * Exit:   0 = all assertions pass, 1 = an assertion failed, 2 = usage/IO error.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const WGEO_PATH = resolve(REPO, 'docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs');
const DOORS_PATH = resolve(HERE, 'doors.json');
const SLICE_PATH = resolve(REPO, 'docs/handOff/archive/corpora/geo-japan/kyoto-slice-overpass.json');
const EVID_DIR = resolve(HERE, 'evidence');

const WGEO = await import(pathToFileURL(WGEO_PATH).href);
const {
  ORIGIN, PROJECTION, worldGrid, GRID, VALUE_KIND, VALUE_KINDS, WORLD_UNITS,
  GUIDE_VERIFIED_COLUMN_ALLOWED, isValueKind, mayAppearInGuideVerifiedColumn,
  quantizeToSubTile, tileFromSub, projectMicroDeg, LANES_QUALITY,
} = WGEO;

/** One canonical 1/16 sub-tile in metres (0.0625 m), derived from the import. */
const WORLD_ONE_SUBTILE = WORLD_UNITS.tileMetres / WORLD_UNITS.subTilesPerTile;

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex').toUpperCase();

const doorsDoc = readJson(DOORS_PATH);
const doors = doorsDoc.doors;
const facades = doorsDoc.facades;

/* ------------------------------------------------------------------ *
 * assertion harness
 * ------------------------------------------------------------------ */
const results = [];
function check(id, title, ok, detail) {
  results.push({ id, title, ok: Boolean(ok), detail });
  return Boolean(ok);
}

/* ------------------------------------------------------------------ *
 * V1 — the mirror of the frozen constants equals the import
 * ------------------------------------------------------------------ */
{
  const m = doorsDoc.frozenConstants;
  const pairs = [
    ['ORIGIN.status', m.ORIGIN.status, ORIGIN.status],
    ['ORIGIN.lonUdeg', m.ORIGIN.lonUdeg, ORIGIN.lonUdeg],
    ['ORIGIN.latUdeg', m.ORIGIN.latUdeg, ORIGIN.latUdeg],
    ['PROJECTION.kind', m.PROJECTION.kind, PROJECTION.kind],
    ['PROJECTION.metresPerDegreeLon', m.PROJECTION.metresPerDegreeLon, PROJECTION.metresPerDegreeLon],
    ['PROJECTION.metresPerDegreeLat', m.PROJECTION.metresPerDegreeLat, PROJECTION.metresPerDegreeLat],
    ['PROJECTION.coefficientLatitudeDeg', m.PROJECTION.coefficientLatitudeDeg, PROJECTION.coefficientLatitudeDeg],
    ['worldGrid.wTiles', m.worldGrid.wTiles, worldGrid.wTiles],
    ['worldGrid.hTiles', m.worldGrid.hTiles, worldGrid.hTiles],
    ['worldGrid.blockSize', m.worldGrid.blockSize, worldGrid.blockSize],
    ['GRID.halfCrossTiles', m.GRID.halfCrossTiles, GRID.halfCrossTiles],
    ['GRID.blocksAcrossY', m.GRID.blocksAcrossY, GRID.blocksAcrossY],
  ];
  const bad = pairs.filter(([, a, b]) => a !== b);
  const kindsOk = JSON.stringify(m.valueKinds) === JSON.stringify(VALUE_KINDS);
  const guideOk = JSON.stringify(m.guideVerifiedColumnAllowed) === JSON.stringify(GUIDE_VERIFIED_COLUMN_ALLOWED);
  check('V1', 'frozen constants imported, not retyped', bad.length === 0 && kindsOk && guideOk,
    `compared ${pairs.length} literals against ${WGEO_PATH.split(/[\\/]/).pop()}: ` +
    `mismatches=${bad.length}${bad.length ? ' -> ' + bad.map(([k, a, b]) => `${k}: file=${a} import=${b}`).join('; ') : ''}; ` +
    `valueKinds match=${kindsOk}; guideVerifiedColumnAllowed match=${guideOk}`);
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
  let maxPerp = 0, maxShift = 0;
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
    // the door must sit within the run, not past either end
    if (qx < run.fromM - 1e-9 || qx > run.toM + 1e-9) problems.push(`${d.doorId}: x ${qx} outside run [${run.fromM},${run.toM}]`);
    const shift = Math.max(Math.abs(qx - p.authoredXM), Math.abs(qy - p.authoredYM));
    if (Math.abs(shift - Math.max(p.quantisationShiftM.x, p.quantisationShiftM.y)) > 1e-6) {
      problems.push(`${d.doorId}: recorded quantisation shift disagrees with recomputed`);
    }
    maxPerp = Math.max(maxPerp, perp);
    maxShift = Math.max(maxShift, shift);
  }
  check('V5', `every door sits in its own cell and within 1/32 m of its measured facade line`,
    problems.length === 0,
    `max perpendicular offset ${maxPerp.toFixed(6)} m; max quantisation shift ${maxShift.toFixed(6)} m; ` +
    `bound ${BOUND} m; problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
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
  check('V8', "valueKind is a frozen member and licenced/abstract doors stay out of the guide's verified column",
    problems.length === 0,
    `kinds=${JSON.stringify(byKind)} (allowed ${JSON.stringify(GUIDE_VERIFIED_COLUMN_ALLOWED)} -> admitted=${admitted}); ` +
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
 * V10 — the evidence still hashes to what the pack recorded
 * ------------------------------------------------------------------ */
{
  const recorded = [
    ['osm-block-q1-footprints.json', doorsDoc.method.facadeGeometrySource.rawResponseSha256],
    ['osm-block-q2-everything.json', doorsDoc.method.facadeGeometrySource.secondQuery.rawResponseSha256],
  ];
  const problems = [];
  const detail = [];
  for (const [name, want] of recorded) {
    const p = resolve(EVID_DIR, name);
    if (!existsSync(p)) { problems.push(`${name} missing`); continue; }
    const got = sha256(p);
    const ok = got === want;
    if (!ok) problems.push(`${name}: recorded ${want} but on disk ${got}`);
    detail.push(`${name} ${ok ? 'OK' : 'TAMPERED'} ${got.slice(0, 16)}...`);
  }
  check('V10', 'evidence bytes are unchanged since the pack was written', problems.length === 0,
    `${detail.join(' | ')}; problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
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
 * V12 — the summary block a consumer reads without parsing all 12 doors
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
  const modules = facades.map((f, i) => f.facadeRunClippedToBlock.frontageXM / (i === 0 ? north : south));
  const total = widths.reduce((a, b) => a + b, 0);
  const declaredTotal = doorsDoc.block.facadeFrontageTotalM;
  const cmp = [
    ['doorCount', s.doorCount, doors.length],
    ['doorsNorthSide', s.doorsNorthSide, north],
    ['doorsSouthSide', s.doorsSouthSide, south],
    ['guideVerifiedColumnAdmitted', s.guideVerifiedColumnAdmitted, 0],
    ['minPairwiseDoorSeparationM', s.minPairwiseDoorSeparationM, Number(minD.toFixed(4))],
    ['storefrontWidthNorthM', s.storefrontWidthNorthM, Number(modules[0].toFixed(6))],
    ['storefrontWidthSouthM', s.storefrontWidthSouthM, Number(modules[1].toFixed(6))],
    ['storefrontWidthMeanM', s.storefrontWidthMeanM, Number((total / doors.length).toFixed(6))],
    ['facadeFrontageNorthM', doorsDoc.block.facadeFrontageNorthM, Number(widths[0].toFixed(6))],
    ['facadeFrontageSouthM', doorsDoc.block.facadeFrontageSouthM, Number(widths[1].toFixed(6))],
    ['facadeFrontageTotalM', declaredTotal, Number(total.toFixed(6))],
    ['distinctBuildingIds', JSON.stringify([...s.distinctBuildingIds].sort((a, b) => a - b)), JSON.stringify(uniqIds)],
  ];
  for (const [k, a, b] of cmp) if (a !== b) problems.push(`${k}: declared=${a} recomputed=${b}`);
  check('V12', 'summary block is self-consistent with the doors and facades it summarises',
    problems.length === 0,
    `checked ${cmp.length} summary fields; cellX ${Math.min(...xs)}..${Math.max(...xs)}, cellY ${Math.min(...ys)}..${Math.max(...ys)}; ` +
    `problems=${problems.length}${problems.length ? ' -> ' + problems.join('; ') : ''}`);
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
  const f = doorsDoc.observedBlockFeatures;
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

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ passed, failed, results }, null, 2));
} else {
  console.log('kyoto-shijo doors — executable assertions');
  console.log(`  block = ${worldGrid.blockSize}x${worldGrid.blockSize} cells @ 1 m  ·  ` +
    `origin=${ORIGIN.lonUdeg},${ORIGIN.latUdeg} (frozen)  ·  cellY = row = tileY + ${GRID.halfCrossTiles}  ·  ` +
    `lane tag usable as fact=${LANES_QUALITY.usableAsFact}`);
  console.log(`  doors=${doors.length}  ·  facades=${facades.length}  ·  ` +
    `frontage=${doorsDoc.block.facadeFrontageTotalM.toFixed(3)} m  ·  ` +
    `storefront mean=${doorsDoc.summary.storefrontWidthMeanM.toFixed(4)} m`);
  console.log('');
  for (const r of results) {
    console.log(`${r.id.padEnd(4)} ${r.ok ? 'PASS' : 'FAIL'}  ${r.title}`);
    console.log(`          ${r.detail}`);
  }
  console.log('');
  console.log(`${passed}/${results.length} assertions passed, ${failed} failed`);
  console.log(`slice sha256=${sliceHash}`);
  console.log(`min pairwise door separation=${doorsDoc.summary.minPairwiseDoorSeparationM} m  ·  ` +
    `max perpendicular offset from facade=${doorsDoc.summary.maxPerpendicularOffsetFromFacadeM} m`);
  console.log('');
  console.log('plan view — derived from the evidence footprints, not from the doors file');
  console.log('  D door cell   # footprint interior   : 四条通 sidewalk   = street centreline   | 烏丸通   . open ground');
  console.log(planView());
}
process.exit(failed === 0 ? 0 : 1);
