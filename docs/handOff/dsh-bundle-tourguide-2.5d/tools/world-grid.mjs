#!/usr/bin/env node
/**
 * world-grid.mjs — the frozen geo-pipeline contract, as executable constants.
 *
 * Companion to `iteration/design/contract-geo-pipeline.md`. Every number the
 * rendering, content and verification layers depend on lives here as a frozen
 * literal, and every clause of the contract has a mechanical assertion below.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The projection is the pipeline's single point of no return: get it wrong once
 * and all 12 interiors, every sign position and every collision box has to be
 * rebuilt. So these values are not "config we can tune later" — they are
 * literals, asserted against the measured corridor and against an independent
 * WGS84 computation.
 *
 * S1b (2026-09-30): `wTiles` was 2000, an UNMEASURED ESTIMATE. The road was then
 * measured way by way along 四条通: 四条烏丸 -> 四条通's geometry end is 1,595.05 m,
 * not 2,000 m. wTiles is now 1600, and the origin is no longer a gap — it is the
 * measured westernmost 四条通 point at or east of 四条烏丸.
 *
 * EPSG:3857 / EPSG:900913 (Web Mercator) is FORBIDDEN. At the corridor's
 * coefficient latitude phi0 = 35.0055 deg, cos(phi0) = 0.8190969811, so one
 * true ground metre is 1/cos(phi0) = 1.2208566544 "web-mercator metres". Every
 * feature measured in 3857 comes out +22.09% too large, and the 1,600-tile
 * corridor would need 1,953.4 tiles. Assertion A6 fails loudly if anyone
 * reintroduces it.
 *
 * USAGE
 *   node world-grid.mjs            full assertion report
 *   node world-grid.mjs --hash     just the grid hashes (for cross-process checks)
 *   node world-grid.mjs --json     machine-readable report
 *   node world-grid.mjs --help
 *
 * Also importable:
 *   import { worldGrid, PROJECTION, ORIGIN, VALUE_KIND } from './world-grid.mjs';
 *
 * Exit codes: 0 = all assertions pass, 1 = an assertion failed, 2 = usage error.
 *
 * Licence: this file contains no geodata beyond two measured integers and their
 * provenance. The test fixture below is synthetic and is explicitly NOT the
 * 四条通 alignment; see buildFixtureLines().
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/* ------------------------------------------------------------------ *
 * 1. Units and the frozen projection
 * ------------------------------------------------------------------ */

/** Geographic / provenance units. Integer only — floats never enter the fact layer. */
export const GEO_UNITS = Object.freeze({
  microDegreesPerDegree: 1000000,
});

/**
 * Local tangent-plane equirectangular projection, origin-relative.
 *
 *   x_m = (lon - lon0) * metresPerDegreeLon
 *   y_m = (lat - lat0) * metresPerDegreeLat
 *
 * The two coefficients are the WGS84 local metres-per-degree of longitude and
 * latitude at `coefficientLatitudeDeg` (A4 checks them against the closed form).
 * They are frozen because they are the only place the projection's scale lives.
 *
 * `coefficientLatitudeDeg` is where the coefficients were EVALUATED — it is not
 * the origin's latitude, and it must not be "corrected" to the origin's
 * 35.003658. A5 measures that choice: +-0.0018 deg of latitude moves the far end
 * by 33 mm.
 */
export const PROJECTION = Object.freeze({
  kind: 'local-tangent-equirectangular',
  metresPerDegreeLon: 91282.15,
  metresPerDegreeLat: 110940.65,
  coefficientLatitudeDeg: 35.0055,
  // Wave the next reader off the shortcut before they take it.
  forbiddenCrs: Object.freeze(['EPSG:3857', 'EPSG:900913', 'Web Mercator']),
});

/**
 * The frozen projection origin — S1b, 2026-09-30. This resolves GAP-1.
 *
 * MIRROR OF THE MEASUREMENT, not a choice: `iteration/tools/freeze-origin.mjs`
 * derived it, `docs/handOff/archive/corpora/geo-japan/kyoto-slice-origin-candidate.json`
 * records it, and A13 asserts these literals equal that file field for field.
 *
 * TWO RULES WERE TRIED AND REJECTED BEFORE THIS ONE. They are kept here because
 * both of the obvious "simplifications" below silently move the origin ~1 km west:
 *
 *   1. "westernmost node in the bbox" — WRONG. The westernmost x_m in a corridor
 *      bbox can belong to any cross street. It returned 錦小路通, a residential
 *      lane, not 四条通 at all.
 *
 *   2. "westernmost point of the named road" — WRONG. 四条通 IS 市道186号
 *      嵐山祇園線; it starts at 松尾大社 and therefore runs ~1.0 km WEST of
 *      四条烏丸. This rule returned the 松尾大社 end, i.e. the origin jumped a
 *      kilometre out of the declared slice.
 *
 * The rule that works is road-WITHIN-SLICE: the westernmost 四条通 geometry
 * point AT OR EAST OF the declared western anchor (四条烏丸). The constraint is
 * a slice clamp, and removing it re-breaks rule 2. Do not simplify it away.
 */
export const ORIGIN = Object.freeze({
  status: 'frozen',
  lonUdeg: 135759719,
  latUdeg: 35003658,
  // Provenance — who says so, and where it was read.
  osmWayId: 465069436,
  nodeIndex: 3,
  highway: 'primary',
  method: 'westernmost 四条通 geometry point at or east of 四条烏丸 (road-within-slice)',
  sliceAnchorName: '四条烏丸',
  source: 'Overpass API (overpass-api.de), OpenStreetMap contributors',
  licence: 'ODbL 1.0',
});

/**
 * The corridor's east end — where 四条通's geometry actually stops. This is a
 * REAL boundary, not the corridor's nominal end: it is 4.93 m short of
 * x_m = 1,600 m and 91.92 m short of 祇園交差点. Frozen as a constant so that
 * gap cannot drift silently (A14).
 */
export const EAST_END = Object.freeze({
  lonUdeg: 135777193,
  latUdeg: 35003749,
});

/**
 * 祇園交差点 (四条通 x 東大路通) — the declared eastern end of the slice.
 *
 * APPROXIMATE, and recorded as such. design-core states "祇園交差点约在 135.7782",
 * which is a 4-decimal figure, so the reference carries +-50 uDeg = +-4.6 m of
 * slack. It is NOT an observed fact and is NOT a fact-layer row, so `valueKind`
 * does not apply to it; it exists only to keep the 92 m gap measurable.
 */
export const GI_ON_REFERENCE = Object.freeze({
  name: '祇園交差点',
  lonUdeg: 135778200,
  approximate: true,
  toleranceUdeg: 50,
  note: 'design-core states ~135.7782; +-50 uDeg = +-4.6 m. Reference only, not a fact row.',
});

/** The documented east gap, in metres. A14 asserts the constants still reproduce it. */
export const EAST_GAP_REFERENCE_M = 92.0;

/* ------------------------------------------------------------------ *
 * 2. The frozen world grid
 * ------------------------------------------------------------------ */

/**
 * The corridor's tile extents. Frozen literal — do not derive these at runtime.
 *
 *   wTiles  = 1600  -> 1.6 km along the street, 1 tile = 1 m
 *   hTiles  =  40  -> 40 m across the street (one block deep)
 *   blockSize = 40 -> one authored block is 40x40 tiles = 40 m x 40 m
 *
 * S1b: wTiles was 2000 (an unmeasured estimate). The measured span is 1,595.05 m,
 * so 1600 covers it with 4.95 m to spare, and 1600 / 16 = 100 is an exact split
 * into the 16 ground chunks.
 *
 * Consequence that was previously muddled: the corridor is 64,000 tiles =
 * 40 authored blocks laid side by side, NOT one 1280x1280 tilemap (1280x1280 px
 * is the pixel extent of a single 40 m block).
 */
export const worldGrid = Object.freeze({
  wTiles: 1600,
  hTiles: 40,
  blockSize: 40,
});

/** World / play units. Integer tiles plus 1/16 sub-tiles; no floats. */
export const WORLD_UNITS = Object.freeze({
  tileMetres: 1,
  subTilesPerTile: 16,
});

/**
 * Values derived from `worldGrid`. Frozen, and asserted against `worldGrid`
 * (A2) so that hand-editing a derived number cannot go unnoticed.
 *
 * THREE DIFFERENT "$UNIT" WORDS LIVE HERE. They are not interchangeable:
 *   - a TILE  is 1 m of ground            -> 64,000 of them
 *   - a BLOCK is the authored 40x40 unit  -> 40 of them along the street
 *   - a CHUNK is a ground-layer texture   -> 16 of them, 100 tiles / 3,200 px each
 *
 * `halfCrossTiles` is the storage offset: the street centreline is tileY = 0,
 * so the corridor spans tileY in [-20, +20) and row index = tileY + 20. The
 * offset is a storage detail; the coordinate definition stays `floor(y_m)`.
 */
export const GRID = Object.freeze({
  corridorLengthM: 1600,
  corridorWidthM: 40,
  tileCount: 64000,
  tilesPerBlock: 1600,
  blocksAlongX: 40,
  blocksAcrossY: 1,
  halfCrossTiles: 20,
  // Ground-layer textures. design-core section 8.2.1 (1): 16 chunks of 100x40 tiles.
  chunksAlongX: 16,
  chunkTilesX: 100,
  chunkTilesY: 40,
  chunkPxWide: 3200,
  chunkPxHigh: 1280,
  textureMaxPx: 4096,
  pixelSizePx: 32,
  blockPixelExtentPx: 1280,
  // Ground-layer extents, where "64,000 tiles" stops being abstract:
  // 1,600 tiles x 32 px = 51,200 px wide, 65.536 Mpx total. Indexed colour is
  // 62.5 MiB; RGBA would be 250 MiB. Note MiB, not MB: 65,536,000 B is 65.54 MB
  // but 62.5 MiB, and sizing a texture needs the MiB one.
  groundPxWide: 51200,
  groundPxHigh: 1280,
  groundPxTotal: 65536000,
  groundIndexedBytes: 65536000,
  groundRgbaBytes: 262144000,
});

/* ------------------------------------------------------------------ *
 * 3. valueKind — provenance class, not confidence
 * ------------------------------------------------------------------ */

/**
 * How a value came to exist. This is NOT a confidence score and must never be
 * turned into one (an agent's self-assessment is not mechanically checkable).
 *
 *   observed — a human opened the source and read the value off it
 *   parsed   — a PARSER read this value off the source; no human has verified it
 *   authored — a human PLACED this value. Derived from observation, but not
 *              itself read from any source: our judgement, on the record
 *   licenced — a licence-derived default or template, e.g. road width where OSM
 *              `width` coverage in this slice is 2.7%
 *   abstract — a model-derived abstraction, e.g. PLATEAU LOD1 height
 *
 * WHY `parsed` EXISTS (S3, task-13, ruled by the Lead): the scene emitter reads
 * `building:levels` / `height` off OSM with a parser. Those values ARE in the
 * source — they are not invented and not abstract — but nobody opened the source
 * and read them. Calling them `observed` would have dissolved the distinction
 * clause 4 exists to protect, and widening `observed` to cover machine reading
 * would have emptied the guide's verified column of meaning. A sourced value
 * read by a machine is its own kind, so it got its own member.
 *
 * WHY `authored` EXISTS (task-2, `doors-author`): OSM records exactly two
 * building footprints and ZERO entrance nodes in the Gate-1 block, so all 12
 * doors are authored placements. Before this member existed the only
 * honest-looking option was `licenced`, which clause 4 defines as a
 * licence-derived template — and a door position is nobody's template. The
 * label was the least-wrong of three rather than correct, so the enum was the
 * thing to fix, not the label.
 *
 * NEITHER `parsed` NOR `authored` REACHES THE GUIDE'S VERIFIED COLUMN. Being
 * high in the list below buys nothing: only GUIDE_VERIFIED_COLUMN_ALLOWED grants
 * access, and A9b asserts that gate is still exactly ['observed']. `parsed` is
 * the most tempting of the four to promote ("but the source says it!") and A9b
 * blocks it explicitly, because a parser bug promoted to `observed` becomes a
 * printed claim that a human checked something.
 *
 * The member is spelled `licenced` (British) because it is a frozen wire value.
 * Do not normalise it to `licensed`: A9 rejects the American spelling, and the
 * validator rejects any row that carries it.
 */
export const VALUE_KIND = Object.freeze({
  OBSERVED: 'observed',
  PARSED: 'parsed',
  AUTHORED: 'authored',
  LICENCED: 'licenced',
  ABSTRACT: 'abstract',
});

/**
 * Provenance order, for REPORTING only. Strength of evidence, strongest first:
 * human read off a source > machine read off a source > placed by a curator >
 * template default > model abstraction. This is not a permission ladder — see
 * the allow-list below.
 */
export const VALUE_KINDS = Object.freeze([
  'observed',
  'parsed',
  'authored',
  'licenced',
  'abstract']);

/** Only these kinds may appear in the guide's "verified" column. */
export const GUIDE_VERIFIED_COLUMN_ALLOWED = Object.freeze(['observed']);

export function isValueKind(kind) {
  return typeof kind === 'string' && VALUE_KINDS.includes(kind);
}

export function mayAppearInGuideVerifiedColumn(kind) {
  return GUIDE_VERIFIED_COLUMN_ALLOWED.includes(kind);
}

/**
 * `lanes` on 四条通 is self-contradictory and MAY NOT BE USED AS A FACT until a
 * human checks it once. Measured segments (design-core section 8.2.1 (1)c):
 *
 *   135.748883 .. 135.759719   7 ways   lanes=4   west of 四条烏丸
 *   135.759719 .. 135.761091   1 way    lanes=2   <- the FIRST way east of 四条烏丸
 *   135.761091 .. 135.766352   1 way    lanes=2
 *   135.766352 .. 135.769320   1 way    lanes=1   <- contains 四条河原町
 *   135.769320 .. 135.771015   1 way    lanes=2
 *   135.771015 .. 135.777193   5 ways   lanes=4
 *
 * Seven consecutive ways west of the anchor say 4; the very next way east says 2;
 * and the lanes=1 segment sits on the busiest intersection in the corridor. Local
 * knowledge (L2) says 四条通 is about 4 lanes, so `lanes=1` is not credible either.
 * The 16 ways sum matches the measurement's own way count, so the record is
 * complete — the DATA is what disagrees with itself.
 *
 * `usableAsFact: false` is asserted (A15) so that flipping it requires an edit
 * here, where the reason is written down. This is the first item of the 18 h
 * human check of 60 `primary` ways that L2 recommended.
 */
export const LANES_QUALITY = Object.freeze({
  field: 'lanes',
  road: '四条通',
  usableAsFact: false,
  humanCheckRequired: true,
  reason:
    'lanes=4 for 7 ways west of 四条烏丸, then lanes=2 on the first way east, and lanes=1 over 四条河原町; local knowledge says ~4',
  segments: Object.freeze([
    Object.freeze({ lonFromUdeg: 135748883, lonToUdeg: 135759719, ways: 7, lanes: '4', note: 'west of 四条烏丸' }),
    Object.freeze({ lonFromUdeg: 135759719, lonToUdeg: 135761091, ways: 1, lanes: '2', note: 'first way east of 四条烏丸' }),
    Object.freeze({ lonFromUdeg: 135761091, lonToUdeg: 135766352, ways: 1, lanes: '2' }),
    Object.freeze({ lonFromUdeg: 135766352, lonToUdeg: 135769320, ways: 1, lanes: '1', note: 'contains 四条河原町 (lon~135.7687)' }),
    Object.freeze({ lonFromUdeg: 135769320, lonToUdeg: 135771015, ways: 1, lanes: '2' }),
    Object.freeze({ lonFromUdeg: 135771015, lonToUdeg: 135777193, ways: 5, lanes: '4' }),
  ]),
});

/* ------------------------------------------------------------------ *
 * 4. Projection and grid primitives
 * ------------------------------------------------------------------ */

/** Thrown when the world grid is asked to exist before its origin is frozen. */
export class OriginNotFrozenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OriginNotFrozenError';
    this.code = 'ORIGIN_NOT_FROZEN';
  }
}

/** Thrown when a fact-layer coordinate is not an integer microdegree. */
export class NonIntegerCoordinateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NonIntegerCoordinateError';
    this.code = 'NON_INTEGER_COORDINATE';
  }
}

const DEG_TO_RAD = Math.PI / 180;

/** WGS84 ellipsoid constants (defining parameters). */
const WGS84 = Object.freeze({
  a: 6378137,
  f: 1 / 298.257223563,
  get e2() {
    return 2 * this.f - this.f * this.f;
  },
});

/**
 * Independent ground truth, method 1: the exact closed form of the WGS84
 * metres-per-degree of longitude, (pi/180) * N(phi) * cos(phi), where N is the
 * prime-vertical radius of curvature. This does NOT share code with the frozen
 * coefficient, which is the point — A4 uses it as the second opinion.
 */
export function ellipsoidMetresPerDegreeLon(latDeg) {
  const phi = latDeg * DEG_TO_RAD;
  const { a, e2 } = WGS84;
  const sinPhi = Math.sin(phi);
  const n = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  return DEG_TO_RAD * n * Math.cos(phi);
}

/** Exact closed form of the WGS84 metres-per-degree of latitude, (pi/180) * M(phi). */
export function ellipsoidMetresPerDegreeLat(latDeg) {
  const phi = latDeg * DEG_TO_RAD;
  const { a, e2 } = WGS84;
  const sinPhi = Math.sin(phi);
  const w = 1 - e2 * sinPhi * sinPhi;
  const m = (a * (1 - e2)) / (w * Math.sqrt(w));
  return DEG_TO_RAD * m;
}

/**
 * Independent ground truth, method 2: the truncated series that is usually
 * quoted for these coefficients. Both methods must agree (A4), which is what
 * makes either of them usable as a cross-check on the frozen literal.
 */
export function seriesMetresPerDegreeLon(latDeg) {
  const r = latDeg * DEG_TO_RAD;
  return 111412.84 * Math.cos(r) - 93.5 * Math.cos(3 * r) + 0.118 * Math.cos(5 * r);
}

export function seriesMetresPerDegreeLat(latDeg) {
  const r = latDeg * DEG_TO_RAD;
  return 111132.92 - 559.82 * Math.cos(2 * r) + 1.175 * Math.cos(4 * r) - 0.0023 * Math.cos(6 * r);
}

/** Integer microdegrees -> metres, longitude axis. */
export function uDegToMetresLon(uDeg) {
  return (uDeg / GEO_UNITS.microDegreesPerDegree) * PROJECTION.metresPerDegreeLon;
}

/**
 * Project an offset in integer microdegrees. Origin-free by construction:
 * x_m depends only on (lon - lon0), so the whole pipeline can be exercised
 * without inventing a Kyoto coordinate. This is where the pipeline's single
 * float excursion happens.
 */
export function projectDeltaMicroDeg(dLonMicro, dLatMicro) {
  assertIntegerMicroDeg(dLonMicro, 'dLonMicro');
  assertIntegerMicroDeg(dLatMicro, 'dLatMicro');
  const dLonDeg = dLonMicro / GEO_UNITS.microDegreesPerDegree;
  const dLatDeg = dLatMicro / GEO_UNITS.microDegreesPerDegree;
  return {
    x_m: dLonDeg * PROJECTION.metresPerDegreeLon,
    y_m: dLatDeg * PROJECTION.metresPerDegreeLat,
  };
}

/** Project an absolute integer-microdegree coordinate against a frozen origin. */
export function projectMicroDeg(lonUdeg, latUdeg, origin) {
  assertIntegerMicroDeg(lonUdeg, 'lonUdeg');
  assertIntegerMicroDeg(latUdeg, 'latUdeg');
  const o = assertFrozenOrigin(origin);
  return projectDeltaMicroDeg(lonUdeg - o.lonUdeg, latUdeg - o.latUdeg);
}

export function assertIntegerMicroDeg(value, label) {
  if (!Number.isInteger(value)) {
    throw new NonIntegerCoordinateError(
      `${label} must be an integer microdegree (got ${JSON.stringify(value)}). ` +
        'Floats are allowed inside projectDeltaMicroDeg only; the fact layer stores integers.',
    );
  }
  return value;
}

/**
 * Gate on the origin. A grid may not be built at all until the segment start has
 * been measured and frozen:
 *   { status: 'frozen', lonUdeg: <int>, latUdeg: <int> }
 * (0, 0) is rejected: it is the "coordinate missing" placeholder, and a record
 * whose coordinate is the origin is a data-integrity defect, not a location.
 *
 * S1b note: the field names are `lonUdeg` / `latUdeg`, matching the measurement
 * record and the task card. There is deliberately no `lonMicro` alias — one name
 * for one thing, or the two drift.
 */
export function assertFrozenOrigin(origin) {
  if (!origin || typeof origin !== 'object') {
    throw new OriginNotFrozenError(
      'origin is missing: the segment start has not been measured yet. ' +
        'Pass { status: "frozen", lonUdeg, latUdeg } (see ORIGIN in world-grid.mjs).',
    );
  }
  if (origin.status !== 'frozen') {
    throw new OriginNotFrozenError(
      `origin.status must be "frozen" (got ${JSON.stringify(origin.status)}). ` +
        'A provisional origin silently re-projects every baked artefact.',
    );
  }
  const { lonUdeg, latUdeg } = origin;
  if (!Number.isInteger(lonUdeg) || !Number.isInteger(latUdeg)) {
    throw new OriginNotFrozenError('origin must carry integer microdegrees');
  }
  if (lonUdeg === 0 && latUdeg === 0) {
    throw new OriginNotFrozenError(
      'origin (0, 0) is the null-island placeholder, not a measured segment start',
    );
  }
  return Object.freeze({ status: 'frozen', lonUdeg, latUdeg });
}

/** Quantise metres to the canonical integer 1/16-sub-tile pair. */
export function quantizeToSubTile(x_m, y_m) {
  const subX = Math.round(x_m * WORLD_UNITS.subTilesPerTile);
  const subY = Math.round(y_m * WORLD_UNITS.subTilesPerTile);
  // Math.round(-0.5) is -0; normalise so hashes and JSON do not see two zeros.
  return { subX: subX === 0 ? 0 : subX, subY: subY === 0 ? 0 : subY };
}

/** tileX = floor(x_m), expressed on the canonical integer sub-tile. */
export function tileFromSub(sub) {
  return Math.floor(sub / WORLD_UNITS.subTilesPerTile);
}

/**
 * The tile definition as written, `floor(x_m)`. REFERENCE ORACLE ONLY — every
 * production path goes through `quantizeToSubTile` + `tileFromSub`, because the
 * canonical tile must be a pure function of the integer sub-tile. This exists so
 * A3 can prove the two agree away from tile boundaries.
 */
export function referenceTileFromMetres(x_m) {
  return Math.floor(x_m);
}

/**
 * Place a sub-tile in the corridor window.
 *
 * The window is half-open: tileX in [0, 1600) and row in [0, 40), i.e. y_m in
 * [-20, +20). A point at exactly x = 1600 m is OUT of the window. Out of window
 * is reported, never clamped — "drop, don't correct".
 */
export function locateSubTile(subX, subY) {
  const tileX = tileFromSub(subX);
  const tileY = tileFromSub(subY);
  const row = tileY + GRID.halfCrossTiles;
  const inWindow =
    tileX >= 0 && tileX < worldGrid.wTiles && row >= 0 && row < worldGrid.hTiles;
  return {
    tileX,
    tileY,
    row,
    inWindow,
    index: inWindow ? row * worldGrid.wTiles + tileX : -1,
  };
}

export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

/**
 * Fingerprint of EVERY frozen literal in this module — the contract's version
 * stamp, as opposed to the grid payload hash (A8), which covers geometry only.
 *
 * The two are deliberately different things and both are worth having:
 *   - contract sha256 moves when any literal moves, including the valueKind
 *     vocabulary. This module is gitignored (the preset bundle is junction-linked
 *     into the local DSH profile), so the tracked contract document carries this
 *     hash as its audit anchor.
 *   - fixture grid sha256 moves ONLY when the projection, grid or rasteriser
 *     change. A provenance-vocabulary edit must NOT move it, and an edit that
 *     does move it needs a signature — that is the whole S1 section-10 rule.
 *
 * Order is explicit and fixed, so the digest is reproducible.
 */
export function contractFingerprint() {
  const parts = [
    ['GEO_UNITS', GEO_UNITS],
    ['PROJECTION', PROJECTION],
    ['ORIGIN', ORIGIN],
    ['EAST_END', EAST_END],
    ['GI_ON_REFERENCE', GI_ON_REFERENCE],
    ['EAST_GAP_REFERENCE_M', EAST_GAP_REFERENCE_M],
    ['worldGrid', worldGrid],
    ['WORLD_UNITS', WORLD_UNITS],
    ['GRID', GRID],
    ['VALUE_KIND', VALUE_KIND],
    ['VALUE_KINDS', VALUE_KINDS],
    ['GUIDE_VERIFIED_COLUMN_ALLOWED', GUIDE_VERIFIED_COLUMN_ALLOWED],
    ['LANES_QUALITY', LANES_QUALITY],
  ];
  return sha256Hex(Buffer.from(JSON.stringify(parts), 'utf8'));
}

/* ------------------------------------------------------------------ *
 * 5. Rasteriser
 * ------------------------------------------------------------------ */

function plot(subX, subY, bytes, tally) {
  const at = locateSubTile(subX, subY);
  if (!at.inWindow) return false;
  if (bytes[at.index] === 0) {
    bytes[at.index] = 1;
    tally.plotted += 1;
  }
  return true;
}

/**
 * Integer Bresenham on 1/16 sub-tiles; no floats, so it cannot drift.
 *
 * The endpoints are canonicalised first, so a segment's pixel set is a function
 * of the UNORDERED endpoint pair. This matters because OSM way direction is not
 * stable — a re-extract, a split, or a normaliser may reverse a way's node
 * order, and without this the same street would bake a different collision
 * raster and the build would stop being reproducible.
 */
function plotLine(ax, ay, bx, by, bytes, tally) {
  let x = ax;
  let y = ay;
  let ex = bx;
  let ey = by;
  if (ex < x || (ex === x && ey < y)) {
    x = bx;
    y = by;
    ex = ax;
    ey = ay;
  }
  const dx = Math.abs(ex - x);
  const sx = x < ex ? 1 : -1;
  const dy = -Math.abs(ey - y);
  const sy = y < ey ? 1 : -1;
  let err = dx + dy;
  for (let guard = 0; guard < 1000000; guard += 1) {
    plot(x, y, bytes, tally);
    if (x === ex && y === ey) return;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  throw new Error('rasteriser guard tripped');
}

/**
 * Rasterise origin-relative polylines into the corridor grid.
 *
 * `lines` is an array of polylines, each an array of [dLonMicro, dLatMicro].
 * Feature order is the input order; the write is idempotent (set, not add), so
 * the payload is a pure function of (lines) and the frozen constants.
 */
export function rasterizePolylineDeltas(lines) {
  const bytes = new Uint8Array(worldGrid.wTiles * worldGrid.hTiles);
  const tally = { plotted: 0, drawn: 0, rejected: 0 };
  for (const line of lines) {
    const subs = line.map(([dLonMicro, dLatMicro]) => {
      const { x_m, y_m } = projectDeltaMicroDeg(dLonMicro, dLatMicro);
      return quantizeToSubTile(x_m, y_m);
    });
    if (subs.length === 0) continue;
    const outside = subs.some((s) => !locateSubTile(s.subX, s.subY).inWindow);
    if (outside) {
      tally.rejected += 1;
      continue;
    }
    tally.drawn += 1;
    if (subs.length === 1) {
      plot(subs[0].subX, subs[0].subY, bytes, tally);
      continue;
    }
    for (let i = 1; i < subs.length; i += 1) {
      plotLine(subs[i - 1].subX, subs[i - 1].subY, subs[i].subX, subs[i].subY, bytes, tally);
    }
  }
  return { bytes, ...tally };
}

/**
 * Production path: rasterise absolute integer-microdegree features against a
 * frozen origin. Rejected features are counted, not repaired — the caller must
 * treat `rejected > 0` as a build failure.
 *
 * With no explicit origin this uses the frozen ORIGIN, so the real corridor can
 * be built; pass an origin only in tests.
 */
export function buildWorldGrid(linesMicroDeg, origin = ORIGIN) {
  const o = assertFrozenOrigin(origin);
  const lines = linesMicroDeg.map((line) =>
    line.map(([lonUdeg, latUdeg]) => {
      assertIntegerMicroDeg(lonUdeg, 'lonUdeg');
      assertIntegerMicroDeg(latUdeg, 'latUdeg');
      return [lonUdeg - o.lonUdeg, latUdeg - o.latUdeg];
    }),
  );
  return { origin: o, ...rasterizePolylineDeltas(lines) };
}

/* ------------------------------------------------------------------ *
 * 6. Test fixture — SYNTHETIC, NOT GEODATA
 * ------------------------------------------------------------------ */

/**
 * Synthetic corridor fixture used by the idempotence and determinism checks.
 *
 * It is deliberately expressed as ORIGIN-RELATIVE microdegree offsets so that no
 * Kyoto coordinate has to be invented: the projection is a pure function of
 * (lon - lon0), so the whole pipeline is exercised without asserting anything
 * about where 四条通 actually is. These numbers are a test fixture. They are NOT
 * the street alignment and must never be shipped as one.
 *
 * Layout: a spine at 1 m spacing (x = 0..wTiles-1 m, inside the frozen window)
 * with a deterministic +-0.22 m wobble, one 5 m cross-stub, and one 8 m branch.
 */
export function buildFixtureLines() {
  const spine = [];
  for (let i = 0; i < worldGrid.wTiles; i += 1) {
    const xMetres = i * 1.0;
    const yMetres = (((i * 7) % 5) - 2) * 0.11094065;
    spine.push(metresToDeltaMicroDeg(xMetres, yMetres));
  }
  const anchorX = spine[1000][0];
  const anchorY = spine[1000][1];
  const branch = [
    [anchorX, anchorY],
    [anchorX + fromMetresX(8), anchorY + fromMetresY(3)],
    [anchorX + fromMetresX(8), anchorY - fromMetresY(3)],
  ];
  const stub = [
    [anchorX, anchorY],
    [anchorX, anchorY + fromMetresY(5)],
  ];
  return [spine, branch, stub];
}

/** metres -> integer microdegree delta. Test-fixture helper only. */
export function metresToDeltaMicroDeg(xMetres, yMetres) {
  return [fromMetresX(xMetres), fromMetresY(yMetres)];
}

function fromMetresX(xMetres) {
  return Math.round((xMetres / PROJECTION.metresPerDegreeLon) * GEO_UNITS.microDegreesPerDegree);
}

function fromMetresY(yMetres) {
  return Math.round((yMetres / PROJECTION.metresPerDegreeLat) * GEO_UNITS.microDegreesPerDegree);
}

/* ------------------------------------------------------------------ *
 * 6b. Measurement reconciliation
 * ------------------------------------------------------------------ */

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The two measurements this contract depends on. Absolute paths resolved from
 * this module, so the checks do not depend on the caller's cwd.
 */
export const MEASURED_SLICE_PATH = resolve(
  HERE,
  '../../archive/corpora/geo-japan/kyoto-slice-measurement-summary.json',
);
export const ORIGIN_CANDIDATE_PATH = resolve(
  HERE,
  '../../archive/corpora/geo-japan/kyoto-slice-origin-candidate.json',
);

function readJsonIfPresent(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Read the origin measurement (freeze-origin.mjs output). Returns null when the
 * file is absent, so the bundle still runs when installed standalone.
 */
export function readOriginCandidate() {
  const raw = readJsonIfPresent(ORIGIN_CANDIDATE_PATH);
  if (!raw || !raw.derivedOrigin || !raw.eastEnd) return null;
  return {
    path: ORIGIN_CANDIDATE_PATH,
    method: raw.method,
    corrections: raw.corrections || [],
    road: raw.road,
    sliceAnchor: raw.sliceAnchor,
    derivedOrigin: raw.derivedOrigin,
    eastEnd: raw.eastEnd,
    measuredSpanM: raw.corridor ? raw.corridor.measuredSpanM : null,
    // The record carries the corridor length it was validated against, and a
    // margin with the OPPOSITE sign convention to ours: the tool writes
    // marginM = measuredSpanM - wTiles, so a corridor longer than the road is
    // NEGATIVE there and POSITIVE here. A14 pins both fields.
    recordedWTiles: raw.corridor
      ? (raw.corridor.wTiles ?? raw.corridor.frozenWTiles ?? null)
      : null,
    recordedMarginM: raw.corridor ? raw.corridor.marginM : null,
    distanceFromAnchorM: raw.crossCheck ? raw.crossCheck.distanceFromAnchorM : null,
    counts: raw.counts || {},
  };
}

/**
 * Read the building/shop/entrance slice measurement and reconcile it against the
 * FROZEN corridor: the bbox must cover the corridor in x and over-cover it in y.
 */
export function readMeasuredSlice() {
  const raw = readJsonIfPresent(MEASURED_SLICE_PATH);
  if (!raw || !raw.bbox) return null;
  const m = /lat\s+([\d.]+)\.\.([\d.]+),\s*lng\s+([\d.]+)\.\.([\d.]+)/.exec(raw.bbox);
  if (!m) return null;
  const [, latS, latN, lngW, lngE] = m.map(Number);
  const dLatDeg = latN - latS;
  const dLngDeg = lngE - lngW;
  const spanXM = dLngDeg * PROJECTION.metresPerDegreeLon;
  const spanYM = dLatDeg * PROJECTION.metresPerDegreeLat;
  const originLonDeg = ORIGIN.lonUdeg / GEO_UNITS.microDegreesPerDegree;
  const westOfOriginM = (lngW - originLonDeg) * PROJECTION.metresPerDegreeLon;
  const eastOfOriginM = (lngE - originLonDeg) * PROJECTION.metresPerDegreeLon;
  const counts = raw.counts || {};
  return {
    path: MEASURED_SLICE_PATH,
    fetchedAt: raw.fetchedAt,
    rawResponseSha256: raw.rawResponseSha256,
    bbox: { latS, latN, lngW, lngE },
    dLatDeg,
    dLngDeg,
    spanXM,
    spanYM,
    halfWidthYM: spanYM / 2,
    westOfOriginM,
    eastOfOriginM,
    coversCorridorX: westOfOriginM <= 0 && eastOfOriginM >= GRID.corridorLengthM,
    overhangWestM: -westOfOriginM,
    overhangEastM: eastOfOriginM - GRID.corridorLengthM,
    counts,
    levelsCoveragePct: raw.levelsCoveragePct,
  };
}

/* ------------------------------------------------------------------ *
 * 7. Assertions — one per contract clause
 * ------------------------------------------------------------------ */

const results = [];

function check(id, clause, ok, detail, skipped = false) {
  results.push({ id, clause, ok: Boolean(ok), skipped: Boolean(skipped), detail });
  return Boolean(ok);
}

function near(value, target, tol) {
  return Math.abs(value - target) <= tol;
}

export function runAssertions() {
  results.length = 0;

  /* A1 — frozen literals ------------------------------------------------ */
  {
    const deepFrozen =
      Object.isFrozen(worldGrid) &&
      Object.isFrozen(PROJECTION) &&
      Object.isFrozen(ORIGIN) &&
      Object.isFrozen(EAST_END) &&
      Object.isFrozen(GI_ON_REFERENCE) &&
      Object.isFrozen(VALUE_KIND) &&
      Object.isFrozen(LANES_QUALITY) &&
      Object.isFrozen(GRID) &&
      Object.isFrozen(GEO_UNITS) &&
      Object.isFrozen(WORLD_UNITS);
    let mutationThrew = false;
    try {
      worldGrid.wTiles = 2000;
    } catch {
      mutationThrew = true;
    }
    const literalsHold =
      worldGrid.wTiles === 1600 &&
      worldGrid.hTiles === 40 &&
      worldGrid.blockSize === 40 &&
      PROJECTION.metresPerDegreeLon === 91282.15 &&
      PROJECTION.metresPerDegreeLat === 110940.65 &&
      ORIGIN.lonUdeg === 135759719 &&
      ORIGIN.latUdeg === 35003658 &&
      EAST_END.lonUdeg === 135777193 &&
      EAST_END.latUdeg === 35003749;
    check(
      'A1',
      'clause 1+2 — constants are frozen literals',
      deepFrozen && mutationThrew && literalsHold && worldGrid.wTiles === 1600,
      `deepFrozen=${deepFrozen} mutationThrew=${mutationThrew} wTiles=${worldGrid.wTiles} ` +
        `lon=${PROJECTION.metresPerDegreeLon} lat=${PROJECTION.metresPerDegreeLat} ` +
        `origin=${ORIGIN.lonUdeg},${ORIGIN.latUdeg} east=${EAST_END.lonUdeg},${EAST_END.latUdeg}`,
    );
  }

  /* A2 — worldGrid self-consistent with the 1.6 km / 40 m boundary ------ */
  {
    const { wTiles, hTiles, blockSize } = worldGrid;
    const tileCount = wTiles * hTiles;
    const blocksAlongX = wTiles / blockSize;
    const blocksAcrossY = hTiles / blockSize;
    const byBlocks = blocksAlongX * blocksAcrossY * blockSize * blockSize;
    const chunksCover = GRID.chunksAlongX * GRID.chunkTilesX;
    const pixelOk =
      GRID.blockPixelExtentPx === blockSize * GRID.pixelSizePx &&
      GRID.groundPxWide === wTiles * GRID.pixelSizePx &&
      GRID.groundPxHigh === hTiles * GRID.pixelSizePx &&
      GRID.groundPxTotal === GRID.groundPxWide * GRID.groundPxHigh &&
      GRID.groundIndexedBytes === GRID.groundPxTotal &&
      GRID.groundRgbaBytes === GRID.groundPxTotal * 4;
    // The 16-chunk split must tile the whole corridor exactly, and each chunk
    // must fit the texture limit.
    const chunkOk =
      chunksCover === wTiles &&
      GRID.chunkTilesY === hTiles &&
      GRID.chunkPxWide === GRID.chunkTilesX * GRID.pixelSizePx &&
      GRID.chunkPxHigh === GRID.chunkTilesY * GRID.pixelSizePx &&
      GRID.chunkPxWide <= GRID.textureMaxPx &&
      GRID.chunkPxHigh <= GRID.textureMaxPx &&
      Number.isInteger(wTiles / GRID.chunksAlongX);
    const ok =
      tileCount === GRID.tileCount &&
      Number.isInteger(blocksAlongX) &&
      Number.isInteger(blocksAcrossY) &&
      blocksAlongX === GRID.blocksAlongX &&
      blocksAcrossY === GRID.blocksAcrossY &&
      byBlocks === tileCount &&
      wTiles * WORLD_UNITS.tileMetres === GRID.corridorLengthM &&
      hTiles * WORLD_UNITS.tileMetres === GRID.corridorWidthM &&
      hTiles % 2 === 0 &&
      pixelOk &&
      chunkOk;
    check(
      'A2',
      'clause 2 — worldGrid tiles exactly into 1.6 km / 40 m, 16 chunks',
      ok,
      `${wTiles}x${hTiles} tiles = ${tileCount} tiles = ${blocksAlongX} blocks x ${blocksAcrossY} block ` +
        `= ${byBlocks} tiles; corridor = ${wTiles * WORLD_UNITS.tileMetres} m x ${hTiles * WORLD_UNITS.tileMetres} m; ` +
        `ground ${GRID.groundPxWide}x${GRID.groundPxHigh} px = ${(GRID.groundPxTotal / 1e6).toFixed(3)} Mpx ` +
        `= ${(GRID.groundIndexedBytes / 1048576).toFixed(1)} MiB indexed / ` +
        `${(GRID.groundRgbaBytes / 1048576).toFixed(0)} MiB RGBA; ` +
        `${GRID.chunksAlongX} chunks of ${GRID.chunkTilesX}x${GRID.chunkTilesY} tiles ` +
        `= ${GRID.chunkPxWide}x${GRID.chunkPxHigh} px (limit ${GRID.textureMaxPx}) ` +
        `(pixelOk=${pixelOk} chunkOk=${chunkOk})`,
    );
  }

  /* A3 — tile definition ------------------------------------------------ */
  {
    // The definition, as written in the contract.
    const definitionCases = [
      [0.0, 0],
      [0.999, 0],
      [1.0, 1],
      [39.5, 39],
      [-0.4, -1],
      [1599.99, 1599],
    ];
    const definitionOk = definitionCases.every(
      ([metres, expected]) => referenceTileFromMetres(metres) === expected,
    );

    // The same cases one mid-tile either side, through the canonical path.
    const canonicalCases = [0.5, 1.5, 39.5, 1599.5, -0.5, -1.5];
    const canonicalOk = canonicalCases.every(
      (metres) => tileFromSub(quantizeToSubTile(metres, 0).subX) === referenceTileFromMetres(metres),
    );

    // A float's own floor and the canonical integer tile may disagree only
    // within half a sub-tile (1/32 m) of a tile boundary. Sample the
    // near-boundary region explicitly, both signs — a coarse sweep never lands
    // there and the check would pass vacuously.
    const fractions = [
      0, 0.001, 0.03, 0.031, 0.0312, 0.03125, 0.0313, 0.032, 0.25, 0.5, 0.75,
      0.96, 0.968, 0.96875, 0.969, 0.97, 0.99, 0.999,
    ];
    let disagreements = 0;
    let unexplained = 0;
    let worstDisagreementM = 0;
    for (let k = -3; k < 60; k += 1) {
      for (const f of fractions) {
        const x_m = k + f;
        const fromGrid = tileFromSub(quantizeToSubTile(x_m, 0).subX);
        const fromFloat = referenceTileFromMetres(x_m);
        if (fromGrid !== fromFloat) {
          disagreements += 1;
          const toBoundary = Math.min(x_m - Math.floor(x_m), Math.ceil(x_m) - x_m);
          worstDisagreementM = Math.max(worstDisagreementM, toBoundary);
          if (toBoundary > 0.03125 + 1e-9) unexplained += 1;
        }
      }
    }
    check(
      'A3',
      'clause 3 — tileX = floor(x_m), canonical on the sub-tile',
      definitionOk && canonicalOk && unexplained === 0 && disagreements > 0 &&
        worstDisagreementM <= 0.03125 + 1e-9,
      `definition cases ok=${definitionOk} (incl. floor(-0.4)=-1); canonical path agrees on ` +
        `${canonicalCases.length} mid-tile cases=${canonicalOk}; near-boundary sweep over ` +
        `${(60 + 3) * fractions.length} samples found ${disagreements} disagreements, worst ` +
        `${worstDisagreementM.toFixed(6)} m from a boundary (bound 0.03125, unexplained=${unexplained})`,
    );
  }

  /* A4 — projection accuracy against an independent WGS84 computation ---- */
  {
    const phi = PROJECTION.coefficientLatitudeDeg;
    const exactLon = ellipsoidMetresPerDegreeLon(phi);
    const exactLat = ellipsoidMetresPerDegreeLat(phi);
    const serLon = seriesMetresPerDegreeLon(phi);
    const serLat = seriesMetresPerDegreeLat(phi);
    const crossCheck = near(exactLon, serLon, 0.5) && near(exactLat, serLat, 0.5);
    const lonErrPerDeg = PROJECTION.metresPerDegreeLon - exactLon;
    const latErrPerDeg = PROJECTION.metresPerDegreeLat - exactLat;

    // Worst-case x error over the whole corridor, from the coefficient alone.
    const spanDeg = GRID.corridorLengthM / PROJECTION.metresPerDegreeLon;
    const xErrM = Math.abs(lonErrPerDeg) * spanDeg;
    const yErrM = (Math.abs(latErrPerDeg) * GRID.corridorWidthM) / PROJECTION.metresPerDegreeLat;

    // Flatness: a tangent plane departs from the ellipsoid by ~ d^2 / (2R).
    const rMean = 6371008.8;
    const sagittaM = (GRID.corridorLengthM * GRID.corridorLengthM) / (2 * rMean);

    const ok = crossCheck && xErrM < 1 && yErrM < 1 && sagittaM < 1;
    check(
      'A4',
      'clause 1 — frozen coefficients == WGS84 ground truth, error < 1 m',
      ok,
      `exact lon=${exactLon.toFixed(4)} lat=${exactLat.toFixed(4)} m/deg; ` +
        `series lon=${serLon.toFixed(4)} lat=${serLat.toFixed(4)} (agree=${crossCheck}); ` +
        `frozen-exact: lon ${lonErrPerDeg.toFixed(4)} m/deg -> ${(xErrM * 1000).toFixed(3)} mm over ` +
        `${GRID.corridorLengthM} m, lat ${latErrPerDeg.toFixed(4)} m/deg -> ${(yErrM * 1000).toFixed(3)} mm over ` +
        `${GRID.corridorWidthM} m; tangent-plane sagitta ${sagittaM.toFixed(4)} m`,
    );
  }

  /* A5 — the coefficient latitude is not load-bearing -------------------- */
  {
    // The card evaluates the coefficients at 35.0055; the measured street axis
    // is ~35.0037. Prove the choice cannot move a tile either way.
    const delta = 0.0018;
    const slope = Math.abs(
      (ellipsoidMetresPerDegreeLon(PROJECTION.coefficientLatitudeDeg) -
        ellipsoidMetresPerDegreeLon(PROJECTION.coefficientLatitudeDeg - delta)) /
        delta,
    );
    const spanDeg = GRID.corridorLengthM / PROJECTION.metresPerDegreeLon;
    const xErrM = slope * delta * spanDeg;
    check(
      'A5',
      'clause 1 — coefficient latitude sensitivity is immaterial',
      xErrM < 0.1,
      `d(lonCoef)/d(phi)=${slope.toFixed(1)} m/deg per deg; +-${delta} deg ` +
        `(35.0055 vs the measured axis ${(ORIGIN.latUdeg / 1e6).toFixed(6)}) -> ` +
        `${(xErrM * 1000).toFixed(2)} mm over ${GRID.corridorLengthM} m (bound 100 mm)`,
    );
  }

  /* A6 — EPSG:3857 is rejected, not merely discouraged ------------------- */
  {
    const phi = PROJECTION.coefficientLatitudeDeg;
    const cosPhi = Math.cos(phi * DEG_TO_RAD);
    const inflation = 1 / cosPhi - 1;
    const mercatorTiles = GRID.corridorLengthM / cosPhi;
    const couldLandInGrid = mercatorTiles < worldGrid.wTiles;
    const overhangTiles = mercatorTiles - worldGrid.wTiles;
    // A 3.5 m lane, the unit the corridor is actually made of.
    const laneM = 3.5;
    const laneTiles3857 = laneM / cosPhi;
    const laneErrTiles = laneTiles3857 - laneM;
    const ok = inflation > 0.2 && !couldLandInGrid && laneErrTiles > 0.5;
    check(
      'A6',
      'clause 1 — Web Mercator overstates ground by >20%, so it cannot land in the grid',
      ok,
      `cos(${phi} deg)=${cosPhi.toFixed(10)}; inflation=+${(inflation * 100).toFixed(3)}%; ` +
        `corridor would need ${mercatorTiles.toFixed(1)} tiles vs wTiles=${worldGrid.wTiles} ` +
        `(${overhangTiles.toFixed(1)} tiles overhang = ` +
        `${((overhangTiles / worldGrid.wTiles) * 100).toFixed(1)}% of the grid); ` +
        `a ${laneM} m lane becomes ${laneTiles3857.toFixed(3)} tiles (${laneErrTiles.toFixed(3)} tiles = ` +
        `${((laneErrTiles / laneM) * 100).toFixed(2)}% too wide)`,
    );
  }

  /* A7 — three precisions that are NOT the same number ------------------ */
  {
    const subTileMm = (WORLD_UNITS.tileMetres / WORLD_UNITS.subTilesPerTile) * 1000;
    const microDegLonMm =
      (PROJECTION.metresPerDegreeLon / GEO_UNITS.microDegreesPerDegree) * 1000;
    const microDegLatMm =
      (PROJECTION.metresPerDegreeLat / GEO_UNITS.microDegreesPerDegree) * 1000;
    const rMean = 6371008.8;
    const sagittaMm = ((GRID.corridorLengthM * GRID.corridorLengthM) / (2 * rMean)) * 1000;
    const ok =
      subTileMm === 62.5 &&
      microDegLonMm > subTileMm &&
      microDegLatMm > subTileMm &&
      sagittaMm > subTileMm;
    check(
      'A7',
      'clause 5 — sub-tile, microdegree and model error are three different numbers',
      ok,
      `1/16 sub-tile=${subTileMm} mm; fact-layer 1 uDeg=${microDegLonMm.toFixed(2)} mm lon / ` +
        `${microDegLatMm.toFixed(2)} mm lat -> the fact layer is ${(microDegLonMm / subTileMm).toFixed(2)}x ` +
        `COARSER than the sub-tile, so sub-tile positions are not addressable from fact-layer input; ` +
        `model error at the far end=${sagittaMm.toFixed(1)} mm ` +
        `(${(sagittaMm / subTileMm).toFixed(1)}x coarser than the sub-tile)`,
    );
  }

  /* A8 — idempotence: same input twice, byte-identical grid -------------- */
  {
    const fixture = buildFixtureLines();
    const roundTripped = JSON.parse(JSON.stringify(fixture));
    const first = rasterizePolylineDeltas(fixture);
    const second = rasterizePolylineDeltas(roundTripped);
    const hashA = sha256Hex(first.bytes);
    const hashB = sha256Hex(second.bytes);
    const byteIdentical =
      hashA === hashB && first.bytes.length === second.bytes.length && first.plotted === second.plotted;
    check(
      'A8',
      'acceptance — same input twice yields a byte-identical grid',
      byteIdentical && first.rejected === 0,
      `sha256 A=${hashA} B=${hashB} identical=${byteIdentical}; ` +
        `${first.bytes.length} bytes, drawn=${first.drawn}, rejected=${first.rejected}, setTiles=${first.plotted}`,
    );
    // Feature-order invariance: the write is a set, so order cannot matter.
    const reversedFeatures = rasterizePolylineDeltas([...fixture].reverse());
    check(
      'A8b',
      'acceptance — grid is independent of feature order',
      sha256Hex(reversedFeatures.bytes) === hashA,
      `sha256=${sha256Hex(reversedFeatures.bytes)}`,
    );
    // Vertex-order invariance: the segment set depends only on unordered
    // endpoint pairs, so reversed way node order must not move a single tile.
    const reversedVertices = rasterizePolylineDeltas(
      fixture.map((line) => [...line].reverse()),
    );
    const vertexSymmetric = sha256Hex(reversedVertices.bytes) === hashA;
    check(
      'A8c',
      'acceptance — rasteriser is direction-invariant (OSM way order is not stable)',
      vertexSymmetric,
      `reversed-vertex sha256=${sha256Hex(reversedVertices.bytes)} identical=${vertexSymmetric}`,
    );
  }

  /* A9 — valueKind enum ------------------------------------------------- */
  {
    // The enum is EXACT: five members, in this order, no more and no fewer.
    // Adding a sixth without thinking about the gate fails here.
    const expectedKinds = ['observed', 'parsed', 'authored', 'licenced', 'abstract'];
    const expectedKeys = ['OBSERVED', 'PARSED', 'AUTHORED', 'LICENCED', 'ABSTRACT'];
    const kindsExact =
      VALUE_KINDS.length === expectedKinds.length &&
      VALUE_KINDS.every((k, i) => k === expectedKinds[i]) &&
      Object.keys(VALUE_KIND).length === expectedKeys.length &&
      expectedKeys.every((k, i) => VALUE_KIND[k] === expectedKinds[i]);
    const kindsFrozen = Object.isFrozen(VALUE_KIND) && Object.isFrozen(VALUE_KINDS);
    const spellingFrozen = VALUE_KIND.LICENCED === 'licenced';
    const americanRejected = !isValueKind('licensed') && !isValueKind('Licenced');
    const authoredIsValidKind = isValueKind('authored');
    const parsedIsValidKind = isValueKind('parsed');
    check(
      'A9',
      'clause 4 — valueKind enum is exactly {observed, parsed, authored, licenced, abstract}',
      kindsExact && kindsFrozen && spellingFrozen && americanRejected && authoredIsValidKind && parsedIsValidKind,
      `kinds=[${VALUE_KINDS.join(', ')}] exact=${kindsExact} frozen=${kindsFrozen}; ` +
        `'licensed' rejected=${americanRejected}; 'parsed' and 'authored' are valid kinds=` +
        `${parsedIsValidKind && authoredIsValidKind}`,
    );
  }

  /* A9b — adding a member did NOT widen the guide gate ------------------ */
  {
    // The failure this guards: someone adds `parsed` or `authored` (or a later
    // member) and the verified column quietly grows with the enum. The allow-list
    // must stay exactly one entry, and it must stay `observed`.
    const allowListExact =
      GUIDE_VERIFIED_COLUMN_ALLOWED.length === 1 &&
      GUIDE_VERIFIED_COLUMN_ALLOWED[0] === 'observed' &&
      Object.isFrozen(GUIDE_VERIFIED_COLUMN_ALLOWED);
    // Re-derive the permitted set from the predicate, so the allow-list constant
    // and the function cannot disagree.
    const permitted = VALUE_KINDS.filter((k) => mayAppearInGuideVerifiedColumn(k));
    const permittedExact = permitted.length === 1 && permitted[0] === 'observed';
    // `parsed` is the most tempting member to promote — "but the source says it!"
    // — so it gets its own named check rather than riding along with the others.
    const parsedBlocked = !mayAppearInGuideVerifiedColumn('parsed');
    const othersBlocked =
      !mayAppearInGuideVerifiedColumn('authored') &&
      !mayAppearInGuideVerifiedColumn('licenced') &&
      !mayAppearInGuideVerifiedColumn('abstract') &&
      !mayAppearInGuideVerifiedColumn(undefined) &&
      !mayAppearInGuideVerifiedColumn(null) &&
      !mayAppearInGuideVerifiedColumn('OBSERVED');
    check(
      'A9b',
      'clause 4 — the gate did not widen: five kinds, one reaches the guide',
      allowListExact && permittedExact && parsedBlocked && othersBlocked,
      `allow-list=${JSON.stringify(GUIDE_VERIFIED_COLUMN_ALLOWED)} exact=${allowListExact}; ` +
        `permitted by predicate=[${permitted.join(', ')}]; of ${VALUE_KINDS.length} kinds, ` +
        `parsed blocked=${parsedBlocked}, authored/licenced/abstract/undefined/null/'OBSERVED' blocked=${othersBlocked}`,
    );
  }

  /* A10 — integer microdegrees, and the origin gate --------------------- */
  {
    let floatRejected = false;
    try {
      projectDeltaMicroDeg(1.5, 0);
    } catch (e) {
      floatRejected = e.code === 'NON_INTEGER_COORDINATE';
    }
    // Test the GATE itself, not a default parameter: since S1b `buildWorldGrid`
    // defaults to the frozen ORIGIN, so "no origin at all" can no longer reach it.
    const gate = (origin) => {
      try {
        assertFrozenOrigin(origin);
        return false;
      } catch (e) {
        return e.code === 'ORIGIN_NOT_FROZEN';
      }
    };
    const gates = [
      `missing:${gate(undefined) ? 'gated' : 'LEAKED'}`,
      `unfrozen:${gate({ status: 'provisional', lonUdeg: 135759719, latUdeg: 35003658 }) ? 'gated' : 'LEAKED'}`,
      `null-island:${gate({ status: 'frozen', lonUdeg: 0, latUdeg: 0 }) ? 'gated' : 'LEAKED'}`,
      `non-integer:${gate({ status: 'frozen', lonUdeg: 135.759719, latUdeg: 35.003658 }) ? 'gated' : 'LEAKED'}`,
    ];
    const allGated = gates.every((g) => g.endsWith('gated'));
    // An explicitly bad origin must still propagate out of the builder.
    let badOriginPropagates = false;
    try {
      buildWorldGrid([], { status: 'provisional', lonUdeg: 135759719, latUdeg: 35003658 });
    } catch (e) {
      badOriginPropagates = e.code === 'ORIGIN_NOT_FROZEN';
    }
    // And the frozen origin itself must work with no argument at all.
    let defaultOriginWorks = false;
    try {
      defaultOriginWorks = buildWorldGrid([]).origin.lonUdeg === ORIGIN.lonUdeg;
    } catch {
      defaultOriginWorks = false;
    }
    check(
      'A10',
      'clause 5 — fact-layer coords are integer microdegrees; grid needs a frozen origin',
      floatRejected && allGated && badOriginPropagates && defaultOriginWorks,
      `float coordinate rejected=${floatRejected}; gate ${gates.join(' ')}; ` +
        `bad origin propagates from buildWorldGrid=${badOriginPropagates}; ` +
        `default (no-arg) origin is the frozen ORIGIN=${defaultOriginWorks}`,
    );
  }

  /* A11 — out-of-window is rejected, never clamped ---------------------- */
  {
    const east = metresToDeltaMicroDeg(2500, 0);
    const atEdgeMetres = metresToDeltaMicroDeg(GRID.corridorLengthM, 0);
    const north = metresToDeltaMicroDeg(100, 25);
    const inside = metresToDeltaMicroDeg(100, 19.9);

    // Edges, arithmetically. The window test runs on the canonical sub-tile,
    // so each edge is inset twice: the outermost representable canonical
    // position is half a sub-tile short, and the rejection threshold another
    // half-sub-tile further in. Both numbers are exact, not measured.
    const t = WORLD_UNITS.subTilesPerTile;
    const lastSub = worldGrid.wTiles * t - 1;
    const lastCanonicalM = lastSub / t;
    const rejectionThresholdM = (lastSub + 0.5) / t;
    const canonicalInsetM = GRID.corridorLengthM - lastCanonicalM;
    const thresholdInsetM = GRID.corridorLengthM - rejectionThresholdM;
    const mPerUdeg = PROJECTION.metresPerDegreeLon / GEO_UNITS.microDegreesPerDegree;
    const lastInUdeg = Math.floor(rejectionThresholdM / mPerUdeg);
    const firstOutUdeg = lastInUdeg + 1;

    // Edges, empirically — through the real projection, not the algebra.
    const at = (u) => locateSubTile(quantizeToSubTile(projectDeltaMicroDeg(u, 0).x_m, 0).subX, 0);
    const udegIn = at(lastInUdeg).inWindow;
    const udegOut = at(firstOutUdeg).inWindow;
    const subIn = locateSubTile(lastSub, 0).inWindow;
    const subOut = locateSubTile(lastSub + 1, 0).inWindow;
    const rowSouth = locateSubTile(0, -GRID.halfCrossTiles * t);
    const rowNorth = locateSubTile(0, GRID.halfCrossTiles * t);

    const r = rasterizePolylineDeltas([
      [east],
      [atEdgeMetres],
      [north],
      [inside],
      [[lastInUdeg, 0]],
    ]);
    const drawnExpected =
      sha256Hex(r.bytes) === sha256Hex(rasterizePolylineDeltas([[inside], [[lastInUdeg, 0]]]).bytes);

    const ok =
      r.drawn === 2 &&
      r.rejected === 3 &&
      drawnExpected &&
      r.plotted > 0 &&
      canonicalInsetM === 0.0625 &&
      thresholdInsetM === 0.03125 &&
      udegIn &&
      !udegOut &&
      subIn &&
      !subOut &&
      rowSouth.inWindow &&
      rowSouth.row === 0 &&
      !rowNorth.inWindow;

    check(
      'A11',
      'clause 3 — half-open window x[0,1600) row[0,40); overflow rejected, never clamped',
      ok,
      `drawn=${r.drawn} rejected=${r.rejected} (2500 m east, ${GRID.corridorLengthM} m edge, y=+25 m dropped); ` +
        `canonical inset=${(canonicalInsetM * 1000).toFixed(2)} mm, rejection threshold inset=${(thresholdInsetM * 1000).toFixed(2)} mm; ` +
        `last accepted input=${lastInUdeg} uDeg (=${(lastInUdeg * mPerUdeg).toFixed(3)} m, in=${udegIn}), ` +
        `next uDeg=${firstOutUdeg} (=${(firstOutUdeg * mPerUdeg).toFixed(3)} m, in=${udegOut}); ` +
        `sub ${lastSub} in=${subIn}, sub ${lastSub + 1} in=${subOut}; ` +
        `row: y=-20 m -> row ${rowSouth.row}, y=+20 m -> out=${!rowNorth.inWindow}`,
    );
  }

  /* A12 — the building measurement covers the frozen corridor ----------- */
  {
    const slice = readMeasuredSlice();
    if (!slice) {
      check(
        'A12',
        'clause 2 — building measurement covers the frozen corridor',
        true,
        `SKIPPED: ${MEASURED_SLICE_PATH} absent (bundle installed standalone?)`,
        true,
      );
    } else {
      const { counts } = slice;
      const coverage =
        counts.buildingWays > 0 ? (counts.withLevels / counts.buildingWays) * 100 : NaN;
      const coverageConsistent = near(coverage, slice.levelsCoveragePct, 0.05);
      const bandIsSuperset = slice.halfWidthYM > GRID.halfCrossTiles;
      const hashPresent =
        typeof slice.rawResponseSha256 === 'string' && slice.rawResponseSha256.length === 64;
      const countsPresent =
        Number.isInteger(counts.buildingWays) &&
        Number.isInteger(counts.withLevels) &&
        Number.isInteger(counts.entrances) &&
        Number.isInteger(counts.shops);
      check(
        'A12',
        'clause 2 — building measurement covers the frozen corridor',
        coverageConsistent && slice.coversCorridorX && bandIsSuperset && hashPresent && countsPresent,
        `bbox lng ${slice.bbox.lngW}..${slice.bbox.lngE} vs frozen origin ${ORIGIN.lonUdeg} uDeg ` +
          `-> x from ${slice.westOfOriginM.toFixed(2)} m to +${slice.eastOfOriginM.toFixed(2)} m ` +
          `(overhang ${slice.overhangWestM.toFixed(2)} m west / ${slice.overhangEastM.toFixed(2)} m east of the ` +
          `${GRID.corridorLengthM} m corridor, covers=${slice.coversCorridorX}); ` +
          `lat band ${slice.spanYM.toFixed(2)} m = +-${slice.halfWidthYM.toFixed(2)} m vs corridor ` +
          `+-${GRID.halfCrossTiles} m (superset=${bandIsSuperset}); counts ${counts.buildingWays} ways / ` +
          `${counts.withLevels} with building:levels = ${coverage.toFixed(2)}% (file says ${slice.levelsCoveragePct}%, ` +
          `consistent=${coverageConsistent}); ${counts.entrances} entrance nodes, ${counts.shops} shop nodes; ` +
          `fetched ${slice.fetchedAt}`,
      );
    }
  }

  /* A13 — the origin is a mirror of the measurement, not a choice ------- */
  {
    const cand = readOriginCandidate();
    if (!cand) {
      check(
        'A13',
        'clause 1 — frozen ORIGIN mirrors the measurement record',
        true,
        `SKIPPED: ${ORIGIN_CANDIDATE_PATH} absent (bundle installed standalone?)`,
        true,
      );
    } else {
      const d = cand.derivedOrigin;
      const matches =
        d.lonUdeg === ORIGIN.lonUdeg &&
        d.latUdeg === ORIGIN.latUdeg &&
        d.osmWayId === ORIGIN.osmWayId &&
        d.nodeIndex === ORIGIN.nodeIndex &&
        d.highway === ORIGIN.highway &&
        cand.eastEnd.lonUdeg === EAST_END.lonUdeg &&
        cand.eastEnd.latUdeg === EAST_END.latUdeg;
      // The rounding from the measured degrees to the frozen integers must be
      // the nearest microdegree, not a truncation.
      const roundTrips =
        Math.round(d.lonDeg * 1e6) === ORIGIN.lonUdeg &&
        Math.round(d.latDeg * 1e6) === ORIGIN.latUdeg;
      // The two rejected rules must still be recorded, or someone will
      // "simplify" the slice clamp away and move the origin ~1 km west.
      const correctionsKept =
        cand.corrections.length === 2 &&
        cand.corrections.some((c) => /錦小路通/.test(c)) &&
        cand.corrections.some((c) => /松尾大社/.test(c));
      const anchorDeclared = Boolean(cand.sliceAnchor) && cand.sliceAnchor.name === ORIGIN.sliceAnchorName;
      check(
        'A13',
        'clause 1 — frozen ORIGIN mirrors the measurement record, and both rejected rules survive',
        matches && roundTrips && correctionsKept && anchorDeclared,
        `origin ${ORIGIN.lonUdeg},${ORIGIN.latUdeg} == way ${d.osmWayId} node#${d.nodeIndex} ` +
          `(${d.highway}) matches=${matches}; uDeg round-trip=${roundTrips}; ` +
          `anchor=${cand.sliceAnchor ? cand.sliceAnchor.name : '-'}; ` +
          `recorded span=${cand.measuredSpanM} m, origin sits ${cand.distanceFromAnchorM} m from the anchor; ` +
          `rejected rules kept=${correctionsKept}`,
      );
    }
  }

  /* A14 — the east end and the 92 m gap are constants, not drift --------- */
  {
    const cand = readOriginCandidate();
    const spanM = cand && cand.measuredSpanM ? cand.measuredSpanM : 1595.05;
    const marginM = GRID.corridorLengthM - spanM;
    // Corridor east limit, from the frozen origin, in microdegrees.
    const corridorEastUdeg =
      ORIGIN.lonUdeg + Math.round((GRID.corridorLengthM / PROJECTION.metresPerDegreeLon) * 1e6);
    const roadEndsInsideCorridor = EAST_END.lonUdeg < corridorEastUdeg;
    const tailBeyondRoadM = uDegToMetresLon(corridorEastUdeg - EAST_END.lonUdeg);
    const gapM = uDegToMetresLon(GI_ON_REFERENCE.lonUdeg - EAST_END.lonUdeg);
    const gapSlackM = uDegToMetresLon(GI_ON_REFERENCE.toleranceUdeg);
    const gapMatchesDocumented = near(gapM, EAST_GAP_REFERENCE_M, gapSlackM + 0.5);
    // The gap must be big enough to matter: if someone "extends" the road to
    // 祇園交差点 by assumption, this collapses toward zero.
    const gapIsReal = gapM > 10;
    const spanFits = spanM > 0 && spanM <= GRID.corridorLengthM;
    // Strongest form of the check: project the frozen EAST_END against the frozen
    // ORIGIN and see whether the two constants reproduce the measured span. This
    // does not trust the tool that wrote the JSON — it re-derives the number the
    // JSON claims.
    const projectedEastM = projectMicroDeg(EAST_END.lonUdeg, EAST_END.latUdeg, ORIGIN).x_m;
    const spanReproduced = near(projectedEastM, spanM, 0.05);
    // The record also states the corridor length it was validated against, and a
    // margin whose sign convention is the opposite of ours (span - wTiles). Pin
    // both: if someone changes wTiles without re-running freeze-origin.mjs, the
    // record and the contract now disagree and this fires.
    const recordedWTilesAgrees =
      cand && cand.recordedWTiles !== null ? cand.recordedWTiles === worldGrid.wTiles : true;
    const recordedMarginAgrees =
      cand && cand.recordedMarginM !== null ? near(cand.recordedMarginM, -marginM, 0.01) : true;
    const ok =
      spanFits && roadEndsInsideCorridor && gapMatchesDocumented && gapIsReal &&
      spanReproduced && recordedWTilesAgrees && recordedMarginAgrees &&
      near(marginM, 4.95, 0.01);
    check(
      'A14',
      'clause 1 — measured span fits the corridor; the 92 m east gap is frozen',
      ok,
      `measured span=${spanM} m inside wTiles=${worldGrid.wTiles} -> margin ${marginM.toFixed(2)} m; ` +
        `EAST_END projected against ORIGIN = ${projectedEastM.toFixed(3)} m ` +
        `(reproduces the record: ${spanReproduced}); ` +
        `corridor east=${corridorEastUdeg} uDeg vs road end=${EAST_END.lonUdeg} uDeg ` +
        `-> road stops ${tailBeyondRoadM.toFixed(2)} m before the corridor end; ` +
        `gap to ${GI_ON_REFERENCE.name} (ref ${GI_ON_REFERENCE.lonUdeg} uDeg, +-${gapSlackM.toFixed(2)} m) = ` +
        `${gapM.toFixed(2)} m vs documented ${EAST_GAP_REFERENCE_M} m (matches=${gapMatchesDocumented}, real=${gapIsReal}); ` +
        `record: wTiles=${cand ? cand.recordedWTiles : '?'} (agrees=${recordedWTilesAgrees}), ` +
        `marginM=${cand ? cand.recordedMarginM : '?'} = -(ours) (agrees=${recordedMarginAgrees})`,
    );
  }

  /* A15 — `lanes` is not a fact yet ------------------------------------- */
  {
    const lanesValues = [...new Set(LANES_QUALITY.segments.map((s) => s.lanes))];
    const conflicting = lanesValues.length >= 3;
    const sumWays = LANES_QUALITY.segments.reduce((s, seg) => s + seg.ways, 0);
    const cand = readOriginCandidate();
    const wayCountMatches = cand && cand.counts.ways ? sumWays === cand.counts.ways : true;
    // The exact contradiction the card names: every segment west of the origin
    // says 4, and the segment that STARTS at the origin says 2.
    const westOfOrigin = LANES_QUALITY.segments.filter((s) => s.lonToUdeg <= ORIGIN.lonUdeg);
    const atOrigin = LANES_QUALITY.segments.find((s) => s.lonFromUdeg === ORIGIN.lonUdeg);
    const contradiction =
      westOfOrigin.length > 0 &&
      westOfOrigin.every((s) => s.lanes === '4') &&
      Boolean(atOrigin) &&
      atOrigin.lanes === '2';
    const forbidden =
      LANES_QUALITY.usableAsFact === false && LANES_QUALITY.humanCheckRequired === true;
    check(
      'A15',
      'clause 4 — `lanes` may not be used as a fact until a human checks it',
      forbidden && conflicting && wayCountMatches && contradiction,
      `usableAsFact=${LANES_QUALITY.usableAsFact} humanCheckRequired=${LANES_QUALITY.humanCheckRequired}; ` +
        `recorded ${LANES_QUALITY.segments.length} segments / ${sumWays} ways (measurement says ` +
        `${cand ? cand.counts.ways : '?'}) = ${wayCountMatches}; distinct lanes values=[${lanesValues.join(',')}] ` +
        `conflicting=${conflicting}; west of origin all lanes=4 (${westOfOrigin.length} segs) but the first way ` +
        `east is lanes=${atOrigin ? atOrigin.lanes : '?'} -> contradiction=${contradiction}`,
    );
  }

  const passed = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.length - passed - skipped;
  const fixture = rasterizePolylineDeltas(buildFixtureLines());
  return {
    results,
    passed,
    failed,
    skipped,
    origin: { lonUdeg: ORIGIN.lonUdeg, latUdeg: ORIGIN.latUdeg, status: ORIGIN.status },
    contractHash: contractFingerprint(),
    fixtureHash: sha256Hex(fixture.bytes),
    fixtureSetTiles: fixture.plotted,
    gridBytes: fixture.bytes.length,
  };
}

/* ------------------------------------------------------------------ *
 * 8. CLI
 * ------------------------------------------------------------------ */

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(
      'world-grid.mjs — frozen geo-pipeline constants (S1/S1b contract)\n' +
        '  --hash   print the fixture grid hash only\n' +
        '  --json   print the assertion report as JSON\n',
    );
    return 0;
  }
  const report = runAssertions();
  if (argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.failed === 0 ? 0 : 1;
  }
  if (argv.includes('--hash')) {
    process.stdout.write(
      `payloadsha256=${report.fixtureHash} setTiles=${report.fixtureSetTiles} bytes=${report.gridBytes}\n`,
    );
    return report.failed === 0 ? 0 : 1;
  }
  process.stdout.write('S1 geo-pipeline contract — executable assertions\n');
  process.stdout.write(
    `node ${process.version}  ·  ${worldGrid.wTiles}x${worldGrid.hTiles} tiles @ ${WORLD_UNITS.tileMetres} m ` +
      `(${GRID.tileCount} tiles = ${GRID.blocksAlongX} blocks = ${GRID.chunksAlongX} chunks)  ·  ` +
      `origin=${ORIGIN.lonUdeg},${ORIGIN.latUdeg} (${ORIGIN.status})  ·  ` +
      `road end=${EAST_END.lonUdeg}  ·  GAP to ${GI_ON_REFERENCE.name} ~${EAST_GAP_REFERENCE_M} m\n\n`,
  );
  for (const r of report.results) {
    const label = r.ok ? (r.skipped ? 'SKIP' : 'PASS') : 'FAIL';
    process.stdout.write(`${r.id.padEnd(4)} ${label}  ${r.clause}\n`);
    process.stdout.write(`          ${r.detail}\n`);
  }
  process.stdout.write(
    `\n${report.passed}/${report.results.length} assertions passed, ${report.failed} failed` +
      `${report.skipped ? `, ${report.skipped} skipped` : ''}\n` +
      `contract sha256=${report.contractHash}  (all frozen literals)\n` +
      `fixture grid sha256=${report.fixtureHash}  setTiles=${report.fixtureSetTiles}  bytes=${report.gridBytes}\n`,
  );
  return report.failed === 0 ? 0 : 1;
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`internal error: ${e && e.stack ? e.stack : e}\n`);
    process.exitCode = 1;
  }
}
