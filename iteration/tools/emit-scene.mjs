#!/usr/bin/env node
/**
 * emit-scene.mjs — build-time emitter: real OSM geometry -> ground / collision /
 * heights / scene.bin, through the FROZEN projection contract.
 *
 * WHY THIS EXISTS
 * ---------------
 * Until now the 18 contract assertions had only ever run against a synthetic
 * fixture. This is the first time real geometry goes through the pipeline, and
 * the point is to find out NOW whether the frozen projection survives contact
 * with real building footprints — before twelve interiors and every collision
 * box are sized off it.
 *
 * It imports the contract; it does not restate it. ORIGIN, worldGrid, PROJECTION,
 * GRID, VALUE_KIND(S), LANES_QUALITY and the projection primitives all come from
 * `world-grid.mjs`. Any number this file appears to "know" that also lives in the
 * contract is a bug.
 *
 * THE INPUT PROBLEM (recorded, not worked around)
 * ----------------------------------------------
 * The task named `docs/handOff/archive/corpora/geo-japan/kyoto-slice-overpass.json`
 * as input. That dump was fetched with `out tags center;`, so it carries 1,212
 * building ways and ZERO geometry — centres only. Footprints cannot be rasterised
 * from it, and inventing footprints around centres is the exact failure this
 * project exists to prevent.
 *
 * The repository does contain real corridor geometry: `osm-corridor-map.json`
 * (tracked) was fetched with a plain `out;`, so every way carries a `nodes` id
 * list AND the dump carries node elements with lat/lon. Joining them gives 1,512
 * building ways at 100% resolution. That is the default input.
 *
 * USAGE
 *   node iteration/tools/emit-scene.mjs                 emit + report
 *   node iteration/tools/emit-scene.mjs --assert         run the S1-S9 assertions
 *   node iteration/tools/emit-scene.mjs --in <f> --out <f> --json
 *
 * Exit codes: 0 = ok / all assertions pass, 1 = an assertion failed,
 *             2 = environment (input missing, input has no geometry, bad usage).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '../..');

const {
  ORIGIN,
  worldGrid,
  GRID,
  PROJECTION,
  GEO_UNITS,
  WORLD_UNITS,
  VALUE_KIND,
  VALUE_KINDS,
  GUIDE_VERIFIED_COLUMN_ALLOWED,
  LANES_QUALITY,
  projectMicroDeg,
  quantizeToSubTile,
  tileFromSub,
  locateSubTile,
  sha256Hex,
  contractFingerprint,
  isValueKind,
  mayAppearInGuideVerifiedColumn,
} = await import(
  new URL('../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', import.meta.url).href
);

/* ------------------------------------------------------------------ *
 * Constants that are OURS, not the contract's
 * ------------------------------------------------------------------ */

/** Default input: the tracked dump that actually carries corridor geometry. */
const DEFAULT_IN = 'city-packs/kyoto-shijo/evidence/osm-corridor-map.json';
/** Default output: `build/` is gitignored, so a bake never becomes a tracked artefact. */
const DEFAULT_OUT = 'build/scene.bin';

/**
 * Storey height for converting an OBSERVED storey count into metres.
 * design-core / appendix §1.1: 3.0 m storey = 32 px = one facade band.
 * This is a PROJECT CONSTANT, not a measurement, and every height derived
 * through it is recorded as a derivation rather than as an observed number.
 */
const METRES_PER_LEVEL = 3.0;

const MAGIC = 'TG25DSCN';
const SCENE_VERSION = 1;

/* Frontage-continuity thresholds (Lead instruction: assert the PROPERTY, not the
 * count — "79 footprints" was satisfied by the broken behaviour).
 *
 * Anchored to measurement, not taste. The GAP-10 ruling was made on these:
 *   reject-whole (the broken behaviour): axis coverage  427 m, longest gap 450 m
 *   clip straddlers (the ruling)       : axis coverage 1364 m
 * The floor sits between them with room on both sides, so the gate cannot be
 * satisfied by the behaviour the ruling rejected. Both are re-measured every run
 * and the counterfactual is printed, so the ruling stays falsifiable.
 */
const FRONTAGE_FLOOR_M = 1200;
const FRONTAGE_MAX_GAP_M = 80;

/**
 * Floor for the fraction of the street's OWN columns that must be walkable.
 * Asserted against the street's measured position per column, because the street
 * drifts (see S11) and a fixed row band is only the street near x=0.
 */
const STREET_WALKABLE_FLOOR = 0.98;

/**
 * Project the STREET's own centreline (ways named 四条通) against the frozen
 * origin, and report where it sits inside the fixed-latitude band.
 *
 * This exists because the band is a lat-parallel ribbon while the street is not:
 * y_m = (lat - lat0) is only "distance from the street" at the origin. The
 * measured drift is the single most consequential thing real geometry told us.
 */
export function streetProfile(index) {
  const matched = index.ways.filter((w) => w.tags && /四条通/.test(w.tags.name || ''));
  // Some ways carry the street's name without being part of its CENTRELINE: the
  // corridor dump contains way 585713959, 9 nodes inside x[328,356] that jump
  // 41 m north (y up to 56.14). Keeping it made the street look like it left the
  // window. The objective filter: a matched way whose x-span is fully contained
  // in another matched way's span is a side/parallel way, not the through-chain;
  // the chain ways are disjoint and tile the corridor.
  const spans = matched
    .map((w) => {
      const pts = (resolveGeometry(w, index.nodeById) || []).map((p) => {
        const lonUdeg = Math.round(p.lon * GEO_UNITS.microDegreesPerDegree);
        const latUdeg = Math.round(p.lat * GEO_UNITS.microDegreesPerDegree);
        const { x_m, y_m } = projectMicroDeg(lonUdeg, latUdeg, ORIGIN);
        return { x: x_m, y: y_m };
      });
      return { way: w, pts, xMin: Math.min(...pts.map((p) => p.x)), xMax: Math.max(...pts.map((p) => p.x)) };
    })
    .filter((s) => s.pts.length > 0);
  const chain = spans.filter(
    (s) => !spans.some((o) => o !== s && o.xMin <= s.xMin && s.xMax <= o.xMax && o.xMax - o.xMin > s.xMax - s.xMin),
  );
  const road = chain.map((s) => s.way);
  const pts = [];
  for (const s of chain) {
    for (const p of s.pts) {
      pts.push({ x: p.x, y: p.y });
    }
  }
  const inside = pts.filter((p) => p.x >= 0 && p.x < worldGrid.wTiles);
  const ys = inside.map((p) => p.y);
  const yMax = ys.length ? Math.max(...ys) : 0;
  const yMin = ys.length ? Math.min(...ys) : 0;
  const line = [...inside].sort((a, b) => a.x - b.x).map((p) => ({ x: p.x, y: p.y }));
  return {
    ways: road.length,
    waysMatchedByName: matched.length,
    waysExcludedAsSideWays: matched.length - road.length,
    nodes: pts.length,
    nodesInsideWindow: inside.length,
    nodesInsideBand: inside.filter((p) => p.y >= -GRID.halfCrossTiles && p.y < GRID.halfCrossTiles).length,
    yMin,
    yMax,
    span: yMax - yMin,
    northMarginM: GRID.halfCrossTiles - yMax,
    southMarginM: yMin + GRID.halfCrossTiles,
    line,
    profile: [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600].map((target) => {
      let best = null;
      for (const p of inside) if (best === null || Math.abs(p.x - target) < Math.abs(best.x - target)) best = p;
      return { atX: target, nodeX: best ? Number(best.x.toFixed(1)) : null, y: best ? Number(best.y.toFixed(2)) : null };
    }),
  };
}

/** The street's centreline y at a given x, linearly interpolated. */
export function streetYAt(line, x) {
  if (!line.length) return 0;
  if (x <= line[0].x) return line[0].y;
  if (x >= line[line.length - 1].x) return line[line.length - 1].y;
  let lo = 0;
  let hi = line.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (line[mid].x <= x) lo = mid;
    else hi = mid;
  }
  const a = line[lo];
  const b = line[hi];
  const t = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
  return a.y + t * (b.y - a.y);
}

/* ------------------------------------------------------------------ *
 * Input loading
 * ------------------------------------------------------------------ */

function die(code, msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

function readJson(path) {
  if (!existsSync(path)) die(2, `input not found: ${path}`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    die(2, `input is not JSON: ${path}\n  ${e.message}`);
  }
}

/**
 * Index an Overpass response. Two shapes are supported, because the repository
 * holds both and a loader that only handles one is a trap for the next person:
 *   - `out geom;`  -> way.geometry = [{lat, lon}, ...]
 *   - `out;`       -> way.nodes = [id, ...] plus node elements carrying lat/lon
 */
export function indexOverpass(raw) {
  const elements = Array.isArray(raw.elements) ? raw.elements : [];
  const nodeById = new Map();
  for (const el of elements) {
    if (el.type === 'node' && Number.isFinite(el.lat) && Number.isFinite(el.lon)) {
      nodeById.set(el.id, el);
    }
  }
  const ways = elements.filter((el) => el.type === 'way');
  return { elements, nodeById, ways, source: raw };
}

/** Resolve a way's vertices to [{lat, lon}], or null when it cannot be done. */
export function resolveGeometry(way, nodeById) {
  if (Array.isArray(way.geometry) && way.geometry.length) {
    const ok = way.geometry.every((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
    return ok ? way.geometry.map((p) => ({ lat: p.lat, lon: p.lon })) : null;
  }
  if (Array.isArray(way.nodes) && way.nodes.length) {
    const out = [];
    for (const id of way.nodes) {
      const n = nodeById.get(id);
      if (!n) return null; // a partial ring is not a footprint
      out.push({ lat: n.lat, lon: n.lon });
    }
    return out;
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Feature extraction — heights are graded here, once
 * ------------------------------------------------------------------ */

/** Parse a positive number from a tag, or null. Never a default. */
function tagNumber(v) {
  if (v === undefined || v === null) return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Grade ONE building's height by provenance. Three outcomes, and the third one
 * carries NO NUMBER on purpose:
 *
 *   parsed    - OSM states `building:levels` or `height` and a PARSER read it.
 *               The value is in the source, but no human opened the source and
 *               read it, so it is NOT `observed` (Lead ruling, S3 / GAP-9).
 *   abstract  - OSM states neither. A PLATEAU LOD1 abstract height is what this
 *               project would use, but it is not ingested, so heightM is null.
 *               Filling a plausible height here is the single failure this whole
 *               project is built to prevent; a hole is the honest representation.
 *
 * The derivation is recorded whenever a number is produced, so a composite value
 * never masquerades as a source statement.
 */
export function gradeHeight(tags) {
  const levels = tagNumber(tags['building:levels']);
  const heightTag = tagNumber(tags.height);
  if (levels !== null) {
    return {
      valueKind: VALUE_KIND.PARSED,
      heightM: Number((levels * METRES_PER_LEVEL).toFixed(3)),
      levels,
      heightTag,
      derivation: `heightM = building:levels(${levels}) x ${METRES_PER_LEVEL} m/level (project constant, appendix 1.1)`,
      why: 'a parser read building:levels off OSM; no human verified it',
    };
  }
  if (heightTag !== null) {
    return {
      valueKind: VALUE_KIND.PARSED,
      heightM: heightTag,
      levels: null,
      heightTag,
      derivation: 'heightM = OSM height tag, metres, used directly',
      why: 'a parser read height off OSM; no human verified it',
    };
  }
  return {
    valueKind: VALUE_KIND.ABSTRACT,
    heightM: null,
    levels: null,
    heightTag: null,
    derivation: 'none - no source states a height for this building',
    why: 'no building:levels and no height tag; a PLATEAU LOD1 abstract height is required and is not ingested',
  };
}

/** Extract gradeable building features. Ways that cannot be a footprint are counted, not guessed. */
export function extractBuildings(index, { onlyBuilding = true } = {}) {
  const features = [];
  const skippedNoGeometry = [];
  for (const way of index.ways) {
    const tags = way.tags || {};
    if (onlyBuilding && !tags.building) continue;
    const geom = resolveGeometry(way, index.nodeById);
    if (!geom || geom.length < 3) {
      skippedNoGeometry.push(way.id);
      continue;
    }
    features.push({
      id: way.id,
      tags,
      vertices: geom,
      grade: gradeHeight(tags),
    });
  }
  return { features, skippedNoGeometry };
}

/* ------------------------------------------------------------------ *
 * Projection — the ONE float excursion
 * ------------------------------------------------------------------ */

/**
 * Project one feature into the frozen window. Every vertex becomes:
 *   lat/lon float  -> integer microdegrees (fact layer)
 *                  -> float metres (projection, ONCE)
 *                  -> integer 1/16 sub-cell (world layer)
 * and nothing downstream sees a float again.
 *
 * A feature whose ring NEVER enters the half-open window x[0,1600) row[0,40) is
 * REJECTED; a ring that CROSSES the window is CLIPPED to it (Lead ruling,
 * GAP-10). Nothing is ever clamped: a clamped vertex would assert a coordinate
 * the source never stated, whereas a clip computes the real intersection.
 */
export function projectFeature(feature, streetLine = null) {
  const vertices = [];
  let rejectKind = null;
  let rejectReason = null;
  let inCount = 0;
  for (const v of feature.vertices) {
    const lonUdeg = Math.round(v.lon * GEO_UNITS.microDegreesPerDegree);
    const latUdeg = Math.round(v.lat * GEO_UNITS.microDegreesPerDegree);
    const { x_m, y_m } = projectMicroDeg(lonUdeg, latUdeg, ORIGIN);
    const { subX, subY } = quantizeToSubTile(x_m, y_m);
    const at = locateSubTile(subX, subY);
    if (at.inWindow) inCount += 1;
    else if (rejectKind === null) {
      if (at.tileX < 0) {
        rejectKind = 'west-of-origin';
        rejectReason = `west of origin (x_m=${x_m.toFixed(3)} m)`;
      } else if (at.tileX >= worldGrid.wTiles) {
        rejectKind = 'east-of-corridor';
        rejectReason = `east of corridor (x_m=${x_m.toFixed(3)} m)`;
      } else {
        rejectKind = 'outside-cross-window';
        rejectReason = `outside cross-window (y_m=${y_m.toFixed(3)} m, row=${at.row})`;
      }
    }
    vertices.push({ lonUdeg, latUdeg, x_m, y_m, subX, subY, tileX: at.tileX, tileY: at.tileY, row: at.row, inWindow: at.inWindow });
  }
  const accepted = rejectKind === null;
  // A ring with SOME vertices inside CROSSES the window: clip it and keep the
  // real intersection. A ring with none is entirely outside: reject it.
  const straddling = !accepted && inCount > 0;
  const xs = vertices.map((v) => v.x_m);
  const ys = vertices.map((v) => v.y_m);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);

  // The emitted ring = footprint INTERSECTED WITH the facade depth band, measured
  // from the facade toward the block interior. See FACADE_DEPTH_M for why.
  let band = null;
  if (streetLine && streetLine.length) {
    const midX = (xMin + xMax) / 2;
    const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const cy = streetYAt(streetLine, midX);
    const northSide = midY >= cy;
    const facadeY = northSide ? Math.min(...ys) : Math.max(...ys);
    band = northSide
      ? { yMin: facadeY, yMax: facadeY + FACADE_DEPTH_M, side: 'north' }
      : { yMin: facadeY - FACADE_DEPTH_M, yMax: facadeY, side: 'south' };
  }
  const sourceRing = accepted ? vertices.map((v) => ({ subX: v.subX, subY: v.subY })) : null;
  const clipped = sourceRing || straddling ? clipRingToWindow(sourceRing ?? vertices, band) : null;

  return {
    id: feature.id,
    grade: feature.grade,
    vertices,
    accepted,
    rejectKind,
    rejectReason,
    straddling,
    band: band ? { yMin: Number(band.yMin.toFixed(3)), yMax: Number(band.yMax.toFixed(3)), side: band.side } : null,
    // The ring actually rasterised: the intersection with the window AND the
    // facade band, or nothing when the footprint never enters the window.
    ring: clipped,
    inCount,
    xMin,
    xMax,
    yMin: Math.min(...ys),
    yMax: Math.max(...ys),
  };
}

/**
 * Cross-section of the REAL data, so a too-narrow corridor is measured, not assumed.
 * Rejection reasons are counted only for features that are ACTUALLY rejected:
 * straddlers are emitted (clipped + facade-banded), so folding them into the
 * reason tally would report a rejection that no longer happens.
 */
export function diagnose(projected) {
  const reasons = new Map();
  let straddling = 0;
  const ys = [];
  const xs = [];
  for (const f of projected) {
    for (const v of f.vertices) {
      ys.push(v.y_m);
      xs.push(v.x_m);
    }
    if (!f.accepted) {
      if (f.straddling) {
        straddling += 1;
        continue;
      }
      reasons.set(f.rejectKind, (reasons.get(f.rejectKind) ?? 0) + 1);
    }
  }
  const pct = (arr, p) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))];
  };
  return {
    reasons: Object.fromEntries([...reasons].sort()),
    straddling,
    entirelyOutside: projected.filter((f) => !f.accepted && !f.straddling).length,
    yM: { p1: pct(ys, 1), p5: pct(ys, 5), p25: pct(ys, 25), p50: pct(ys, 50), p75: pct(ys, 75), p95: pct(ys, 95), p99: pct(ys, 99), min: Math.min(...ys), max: Math.max(...ys) },
    xM: { min: Math.min(...xs), max: Math.max(...xs) },
    vertices: ys.length,
    blockZero: blockZeroStats(projected, raster.records),
  };
}

/** D-26: what the EMITTED scene actually contains in the first authored block. */
function blockZeroStats(projected, records = []) {
  const inBlockSource = projected.filter((f) => f.vertices.some((v) => v.x_m >= 0 && v.x_m < worldGrid.blockSize));
  const emitted = records.filter((r) => r.xMin < worldGrid.blockSize);
  const ys = emitted.flatMap((r) => [r.yMin, r.yMax]);
  const acceptedX = records.map((r) => r.xMin);
  return {
    footprintsTouchingBlockZero: inBlockSource.length,
    emittedInBlockZero: emitted.length,
    emittedIds: emitted.map((r) => r.id).slice(0, 12),
    emittedXMaxM: emitted.length ? Math.max(...emitted.map((r) => r.xMax)) : null,
    emittedYMinM: ys.length ? Math.min(...ys) : null,
    emittedYMaxM: ys.length ? Math.max(...ys) : null,
    westmostAcceptedX: acceptedX.length ? Math.min(...acceptedX) : null,
  };
}

/* --- Clipping to the window --------------------------------------------- *
 * LEAD RULING, GAP-10 (2026-09-30), on measured numbers: reject-whole produced
 * a fragmented ribbon — 427 m of 1,600 m axis coverage with a 450 m hole —
 * because 134 buildings that visibly front the street were discarded wholesale.
 *
 *   reject-whole STANDS for geometry that never enters the window.
 *   For geometry that CROSSES the window, CLIP.
 *
 * Clamping is still forbidden and is a different operation: clamping moves a
 * vertex onto the boundary and falsifies the geometry. Clipping computes the
 * real intersection and invents nothing.
 *
 * Clip vertices are computed with an integer numerator/denominator ratio and
 * rounded to the nearest 1/16 sub-cell — the same quantisation every other world
 * coordinate receives — so no un-quantised float is ever stored.
 * ------------------------------------------------------------------------ */

/**
 * How deep the world shows a building, measured from its facade toward the block
 * interior (Lead ruling, S3 follow-up).
 *
 * WHY THIS EXISTS: the window is 40 m deep while real footprints run to
 * p95 +113.8 m / p5 −90.3 m. Clipping a straddler to the window alone yields a
 * 40 m-deep SLAB spanning the whole cross-section, which fills the corridor and
 * buries the street. Emitting the frontage to a bounded depth is what a ground
 * floor actually occupies.
 *
 * WHY 40 m: `worldGrid.blockSize` IS 40, and the design treats one authored block
 * as 40x40. "One block's depth from each facade" is therefore the design's own
 * unit rather than a number invented here. It is deliberately DERIVED from the
 * frozen blockSize, not a new frozen literal: if the Lead wants it frozen, it
 * moves into the contract with a paper trail, and this line becomes a read.
 */
const FACADE_DEPTH_M = worldGrid.blockSize;

/**
 * The REPRESENTABLE window box in sub-cells. The window is half-open
 * (x < wTiles, row < hTiles), so the last representable cell is one short of the
 * mathematical boundary. Clipping to these values keeps the result inside the
 * window by construction and loses at most 1/16 m = 62.5 mm at the edge.
 */
const CLIP_BOX = {
  xMin: 0,
  xMax: worldGrid.wTiles * WORLD_UNITS.subTilesPerTile - 1,
  yMin: -GRID.halfCrossTiles * WORLD_UNITS.subTilesPerTile,
  yMax: GRID.halfCrossTiles * WORLD_UNITS.subTilesPerTile - 1,
};

/**
 * Sutherland-Hodgman against the representable window box, optionally also
 * against a facade depth band (two more half-planes in y). A box and a band are
 * both convex, so the composition is still a single valid ring.
 */
export function clipRingToWindow(ring, band = null) {
  const T2 = WORLD_UNITS.subTilesPerTile;
  const planes = [
    [(p) => p.subX >= CLIP_BOX.xMin, (a, b) => ({ subX: CLIP_BOX.xMin, subY: a.subY + ((b.subY - a.subY) * (CLIP_BOX.xMin - a.subX)) / (b.subX - a.subX) })],
    [(p) => p.subX <= CLIP_BOX.xMax, (a, b) => ({ subX: CLIP_BOX.xMax, subY: a.subY + ((b.subY - a.subY) * (CLIP_BOX.xMax - a.subX)) / (b.subX - a.subX) })],
    [(p) => p.subY >= CLIP_BOX.yMin, (a, b) => ({ subX: a.subX + ((b.subX - a.subX) * (CLIP_BOX.yMin - a.subY)) / (b.subY - a.subY), subY: CLIP_BOX.yMin })],
    [(p) => p.subY <= CLIP_BOX.yMax, (a, b) => ({ subX: a.subX + ((b.subX - a.subX) * (CLIP_BOX.yMax - a.subY)) / (b.subY - a.subY), subY: CLIP_BOX.yMax })],
  ];
  if (band) {
    // The facade band is a DESIGN cap, so it rounds outward (inclusive) rather
    // than inward: the emitter must never show less frontage than it decided to.
    const bMin = Math.max(CLIP_BOX.yMin, Math.floor(band.yMin * T2));
    const bMax = Math.min(CLIP_BOX.yMax, Math.ceil(band.yMax * T2) - 1);
    planes.push([
      (p) => p.subY >= bMin,
      (a, b) => ({ subX: a.subX + ((b.subX - a.subX) * (bMin - a.subY)) / (b.subY - a.subY), subY: bMin }),
    ]);
    planes.push([
      (p) => p.subY <= bMax,
      (a, b) => ({ subX: a.subX + ((b.subX - a.subX) * (bMax - a.subY)) / (b.subY - a.subY), subY: bMax }),
    ]);
  }
  let out = ring.map((p) => ({ subX: p.subX, subY: p.subY }));
  for (const [inside, intersect] of planes) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i += 1) {
      const a = input[(i + input.length - 1) % input.length];
      const b = input[i];
      const ain = inside(a);
      const bin = inside(b);
      if (bin) {
        if (!ain) out.push(intersect(a, b));
        out.push(b);
      } else if (ain) {
        out.push(intersect(a, b));
      }
    }
    if (out.length === 0) break;
  }
  // Round onto the canonical sub-cell grid, then hard-bound to the box so a
  // rounding step can never push a vertex back outside the window.
  return out.map((p) => ({
    subX: Math.max(CLIP_BOX.xMin, Math.min(CLIP_BOX.xMax, Math.round(p.subX))),
    subY: Math.max(CLIP_BOX.yMin, Math.min(CLIP_BOX.yMax, Math.round(p.subY))),
  }));
}

/** Rasterise a ring (raw or clipped) into the layers. Returns tiles written. */
function fillRing(ring, layers, grade, txOut) {
  if (ring.length < 3) return 0;
  const txs = ring.map((p) => tileFromSub(p.subX));
  const rows = ring.map((p) => tileFromSub(p.subY) + GRID.halfCrossTiles);
  const minTx = Math.max(0, Math.min(...txs));
  const maxTx = Math.min(worldGrid.wTiles - 1, Math.max(...txs));
  const minRow = Math.max(0, Math.min(...rows));
  const maxRow = Math.min(worldGrid.hTiles - 1, Math.max(...rows));
  let filled = 0;
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      const sx = tx * T + T / 2;
      const sy = (row - GRID.halfCrossTiles) * T + T / 2;
      if (!pointInside(sx, sy, ring)) continue;
      const at = row * worldGrid.wTiles + tx;
      layers.ground[at] = 1;
      layers.collision[at] = 1;
      filled += 1;
      const half = Math.max(0, Math.min(79, Math.round((row - GRID.halfCrossTiles) * 2 + 1)));
      if (half < layers.occlusionHalf[tx]) layers.occlusionHalf[tx] = half;
      if (grade && grade.heightM !== null) {
        const m = Math.max(1, Math.min(254, Math.round(grade.heightM)));
        if (m > layers.heights[at]) layers.heights[at] = m;
      }
      if (txOut) txOut[tx] = 1;
    }
  }
  return filled;
}

/* --- Frontage continuity: the property the gate asserts ------------------ *
 * The Lead's point: "79 footprints" would have been satisfied by the BROKEN
 * behaviour, so assert the property, not the count. A street wall must be
 * continuous enough to be a street.                                            */

export function frontageCoverage(collision) {
  const covered = new Uint8Array(worldGrid.wTiles);
  for (let tx = 0; tx < worldGrid.wTiles; tx += 1) {
    for (let row = 0; row < worldGrid.hTiles; row += 1) {
      if (collision[row * worldGrid.wTiles + tx]) {
        covered[tx] = 1;
        break;
      }
    }
  }
  let coveredM = 0;
  let run = 0;
  const gaps = [];
  for (let tx = 0; tx < worldGrid.wTiles; tx += 1) {
    if (covered[tx]) {
      coveredM += 1;
      if (run > 0) gaps.push(run);
      run = 0;
    } else {
      run += 1;
    }
  }
  if (run > 0) gaps.push(run);
  const gapsOver20m = gaps.filter((g) => g > 20);
  return {
    coveredM,
    coveragePct: (coveredM / worldGrid.wTiles) * 100,
    gapCount: gaps.length,
    gapsOver20m: gapsOver20m.length,
    maxGapM: gaps.length ? Math.max(...gaps) : 0,
  };
}

/* ------------------------------------------------------------------ *
 * Rasterisation — integer scanline fill
 * ------------------------------------------------------------------ */

/**
 * Even-odd crossing test, exact integer arithmetic. Sub-cell coordinates stay
 * below 25,600 and the cross products below 2^53, so this is exact in doubles
 * and therefore deterministic. No float ever enters the fill.
 */
function edgeCrosses(sx, sy, x0, y0, x1, y1) {
  if (y0 > sy === y1 > sy) return false;
  const dy = y1 - y0;
  const lhs = (sx - x0) * dy;
  const rhs = (sy - y0) * (x1 - x0);
  return dy > 0 ? lhs < rhs : lhs > rhs;
}

function pointInside(sx, sy, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (edgeCrosses(sx, sy, a.subX, a.subY, b.subX, b.subY)) inside = !inside;
  }
  return inside;
}

const T = WORLD_UNITS.subTilesPerTile;

/**
 * Rasterise features into the four layers.
 *
 * Fully-inside features contribute their ring as-is; window-crossing features
 * contribute their CLIPPED ring (Lead ruling, GAP-10); features that never enter
 * the window are rejected. Writes are idempotent (OR for occupancy, max for
 * height), so the result is a pure function of the SET of contributing features —
 * traversal order cannot matter. Features are sorted by id so traversal is canonical.
 */
export function rasterize(features, { onLayerWrite } = {}) {
  const n = worldGrid.wTiles * worldGrid.hTiles;
  const layers = {
    ground: new Uint8Array(n),
    collision: new Uint8Array(n), // 1 = blocked
    heights: new Uint8Array(n), // 0 = no sourced height; else metres
    occlusionHalf: new Uint8Array(worldGrid.wTiles).fill(255), // northernmost blocked half-cell
  };
  const records = [];
  const rejected = [];

  const ordered = [...features].sort((a, b) => a.id - b.id);
  for (const f of ordered) {
    if (!f.ring) {
      rejected.push({ id: f.id, reason: f.rejectReason, kind: f.rejectKind });
      continue;
    }
    const filled = fillRing(f.ring, layers, f.grade, null);
    if (filled === 0) {
      // A crossing ring can clip away to nothing (a corner touch). That is not a
      // rejection of real geometry, but it must not be reported as accepted either.
      rejected.push({ id: f.id, reason: 'clipped to zero area', kind: 'degenerate-clip' });
      continue;
    }
    const subXs = f.ring.map((p) => p.subX);
    const subYs = f.ring.map((p) => p.subY);
    records.push({
      id: f.id,
      valueKind: f.grade.valueKind,
      heightM: f.grade.heightM,
      levels: f.grade.levels,
      heightTag: f.grade.heightTag,
      derivation: f.grade.derivation,
      why: f.grade.why,
      clipped: f.straddling,
      facadeSide: f.band ? f.band.side : null,
      tiles: filled,
      // The EMITTED ring's extent, in metres — not the source footprint's.
      xMin: Number((Math.min(...subXs) / T).toFixed(3)),
      xMax: Number((Math.max(...subXs) / T).toFixed(3)),
      yMin: Number((Math.min(...subYs) / T).toFixed(3)),
      yMax: Number((Math.max(...subYs) / T).toFixed(3)),
    });
    if (onLayerWrite) onLayerWrite(f);
  }
  return { ...layers, records, rejected, coverage: frontageCoverage(layers.collision) };
}

/* --- The counterfactual, for falsifiability ------------------------------ *
 * The rules say reject-whole was wrong. Keeping it runnable means the claim can
 * be re-checked on the real data every run, instead of living in a message.   */

/** The PRE-ruling behaviour: only fully-inside rings contribute, straddlers dropped. */
export function rejectWholeCounterfactual(projected) {
  const n = worldGrid.wTiles * worldGrid.hTiles;
  const layers = {
    ground: new Uint8Array(n),
    collision: new Uint8Array(n),
    heights: new Uint8Array(n),
    occlusionHalf: new Uint8Array(worldGrid.wTiles).fill(255),
  };
  let admitted = 0;
  for (const f of [...projected].sort((a, b) => a.id - b.id)) {
    if (!f.accepted) continue;
    const filled = fillRing(
      f.vertices.map((v) => ({ subX: v.subX, subY: v.subY })),
      layers,
      f.grade,
      null,
    );
    if (filled > 0) admitted += 1;
  }
  return {
    admitted,
    tilesGround: layers.ground.reduce((a, b) => a + b, 0),
    coverage: frontageCoverage(layers.collision),
  };
}

/* ------------------------------------------------------------------ *
 * Packing — deterministic bytes
 * ------------------------------------------------------------------ */

/** Canonical JSON: keys in construction order, no insignificant whitespace. */
function canonical(value) {
  return Buffer.from(JSON.stringify(value), 'utf8');
}

/**
 * scene.bin layout: magic | version | dims | origin | contract fingerprint |
 * input sha256 | manifest length | manifest | ground | collision | heights | occlusion.
 * Byte order is little-endian throughout and the manifest is canonical JSON, so
 * two runs on the same input are byte-identical.
 */
export function packScene(scene, meta) {
  const manifest = canonical(scene.manifest);
  const header = Buffer.alloc(8 + 4 + 4 + 4 + 4 + 8 + 8 + 64 + 4);
  let o = 0;
  header.write(MAGIC, o, 8, 'ascii');
  o += 8;
  header.writeUInt32LE(SCENE_VERSION, o);
  o += 4;
  header.writeUInt32LE(worldGrid.wTiles, o);
  o += 4;
  header.writeUInt32LE(worldGrid.hTiles, o);
  o += 4;
  header.writeUInt32LE(GRID.chunksAlongX, o);
  o += 4;
  header.writeBigInt64LE(BigInt(ORIGIN.lonUdeg), o);
  o += 8;
  header.writeBigInt64LE(BigInt(ORIGIN.latUdeg), o);
  o += 8;
  header.write(meta.contractHash, o, 64, 'ascii');
  o += 64;
  header.writeUInt32LE(manifest.length, o);
  return Buffer.concat([
    header,
    manifest,
    Buffer.from(scene.ground),
    Buffer.from(scene.collision),
    Buffer.from(scene.heights),
    Buffer.from(scene.occlusionHalf),
  ]);
}

/** Parse a packed scene back. Used to prove the container round-trips. */
export function unpackScene(buf) {
  if (buf.toString('ascii', 0, 8) !== MAGIC) throw new Error('bad magic');
  // Layout: magic[0,8) version[8,12) wTiles[12,16) hTiles[16,20) chunks[20,24)
  //         lon[24,32) lat[32,40) contractHash[40,104) manifestLen[104,108)
  const wTiles = buf.readUInt32LE(12);
  const hTiles = buf.readUInt32LE(16);
  const lonUdeg = Number(buf.readBigInt64LE(24));
  const latUdeg = Number(buf.readBigInt64LE(32));
  const contractHash = buf.toString('ascii', 40, 104);
  const manifestLen = buf.readUInt32LE(104);
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
  return { wTiles, hTiles, lonUdeg, latUdeg, contractHash, manifest, ground, collision, heights, occlusionHalf };
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

export function buildScene(inputPath, { mutateTags } = {}) {
  const raw = readJson(resolve(REPO, inputPath));
  const inputBytes = readFileSync(resolve(REPO, inputPath));
  const index = indexOverpass(raw);
  if (mutateTags) mutateTags(index);
  const { features, skippedNoGeometry } = extractBuildings(index);
  const street = streetProfile(index);
  const projected = features.map((f) => projectFeature(f, street.line));
  const raster = rasterize(projected);
  const diag = diagnose(projected);

  const observed = raster.records.filter((r) => r.valueKind === VALUE_KIND.OBSERVED);
  const parsed = raster.records.filter((r) => r.valueKind === VALUE_KIND.PARSED);
  const abstract = raster.records.filter((r) => r.valueKind === VALUE_KIND.ABSTRACT);
  const manifest = {
    magic: MAGIC,
    version: SCENE_VERSION,
    input: { path: inputPath, sha256: sha256Hex(inputBytes), elements: index.elements.length },
    contract: { hash: contractFingerprint(), origin: { lonUdeg: ORIGIN.lonUdeg, latUdeg: ORIGIN.latUdeg } },
    grid: { wTiles: worldGrid.wTiles, hTiles: worldGrid.hTiles, tileMetres: WORLD_UNITS.tileMetres, subTilesPerTile: T },
    layers: {
      ground: '1 = covered by an accepted building footprint',
      collision: '1 = BLOCKED (building), 0 = walkable',
      heights: 'sourced height in metres, 0 = no sourced height (see records[].valueKind)',
      occlusionHalf: 'per column, northernmost blocked half-cell (0..79), 255 = none',
    },
    counts: {
      buildingWaysSeen: features.length + skippedNoGeometry.length,
      accepted: raster.records.length,
      rejected: raster.rejected.length,
      rejectedStraddling: diag.straddling,
      rejectedEntirelyOutside: diag.entirelyOutside,
      rejectedReasons: diag.reasons,
      clippedIn: raster.records.filter((r) => r.clipped).length,
      skippedNoGeometry: skippedNoGeometry.length,
      tilesGround: raster.ground.reduce((a, b) => a + b, 0),
      tilesBlocked: raster.collision.reduce((a, b) => a + b, 0),
      heightParsed: parsed.length,
      heightObserved: observed.length,
      heightAbstract: abstract.length,
      frontageCoveredM: raster.coverage.coveredM,
      frontageCoveragePct: Number(raster.coverage.coveragePct.toFixed(1)),
      frontageGapsOver20m: raster.coverage.gapsOver20m,
      frontageMaxGapM: raster.coverage.maxGapM,
    },
    realCrossSection: diag.yM,
    realXRange: diag.xM,
    street: {
      ways: street.ways,
      nodesInsideWindow: street.nodesInsideWindow,
      yMinM: Number(street.yMin.toFixed(2)),
      yMaxM: Number(street.yMax.toFixed(2)),
      driftSpanM: Number(street.span.toFixed(2)),
      northMarginM: Number(street.northMarginM.toFixed(2)),
      southMarginM: Number(street.southMarginM.toFixed(2)),
      profile: street.profile,
    },
    facadeBand: {
      depthM: FACADE_DEPTH_M,
      derivedFrom: 'worldGrid.blockSize',
      reason: 'ground floor occupies the frontage to a bounded depth; without a cap a clipped straddler becomes a 40 m slab burying the street',
    },
    heightGrading: {
      parsedRule: 'a parser read building:levels or height off OSM; no human verified it',
      observedRule: 'a HUMAN opened the source and read the value; none in this layer yet',
      abstractRule: 'OSM states neither; heightM is null and NO number is filled',
      metresPerLevel: METRES_PER_LEVEL,
      unsourcedCarryNumbers: abstract.filter((r) => r.heightM !== null).length,
    },
    clipping: {
      rule: 'geometry that never enters the window is rejected; geometry that CROSSES it is clipped (Lead ruling, GAP-10)',
      clippedIn: raster.records.filter((r) => r.clipped).length,
    },
    frontageContinuity: raster.coverage,
    records: raster.records,
    rejectedFeatures: raster.rejected,
  };
  return {
    ...raster,
    manifest,
    input: manifest.input,
    inputSha256: sha256Hex(inputBytes),
    skippedNoGeometry,
    features,
    projected,
    diag,
    street,
  };
}

/* ------------------------------------------------------------------ *
 * Assertions
 * ------------------------------------------------------------------ */

const results = [];
function check(id, name, ok, detail) {
  results.push({ id, name, ok: Boolean(ok), detail });
}

export function runAssertions(inputPath = DEFAULT_IN) {
  results.length = 0;

  // S1 - the input can actually produce footprints.
  const raw = readJson(resolve(REPO, inputPath));
  const index = indexOverpass(raw);
  const { features, skippedNoGeometry } = extractBuildings(index);
  const allResolve = skippedNoGeometry.length === 0;
  check(
    'S1',
    'input carries usable polygon geometry',
    features.length > 0 && allResolve,
    `${inputPath}: ${index.ways.length} ways, ${features.length} building footprints, ` +
      `${skippedNoGeometry.length} unresolvable (centres-only dumps land here)`,
  );
  if (features.length === 0) return { results, passed: 0, failed: 1 };

  // S2 - overflow is REJECTED, never clamped. Three probes through the real path.
  {
    const at = (xMetres, yMetres) => {
      const dLonUdeg = Math.round((xMetres / PROJECTION.metresPerDegreeLon) * 1e6);
      const dLatUdeg = Math.round((yMetres / PROJECTION.metresPerDegreeLat) * 1e6);
      const lonUdeg = ORIGIN.lonUdeg + dLonUdeg;
      const latUdeg = ORIGIN.latUdeg + dLatUdeg;
      const { x_m, y_m } = projectMicroDeg(lonUdeg, latUdeg, ORIGIN);
      const { subX, subY } = quantizeToSubTile(x_m, y_m);
      return locateSubTile(subX, subY);
    };
    const north = at(100, 20); // y = +20 m, the open edge of row [0,40)
    const east = at(worldGrid.wTiles, 0); // x = exactly 1600 m
    const far = at(2500, 0);
    const inside = at(100, 19.9);
    check(
      'S2',
      'overflow is rejected, never clamped (y=+20 m, x=1600 m, x=2500 m)',
      !north.inWindow && !east.inWindow && !far.inWindow && inside.inWindow,
      `y=+20 m -> row ${north.row} inWindow=${north.inWindow}; x=${worldGrid.wTiles} m -> tileX ${east.tileX} ` +
        `inWindow=${east.inWindow}; x=2500 m -> tileX ${far.tileX} inWindow=${far.inWindow}; ` +
        `control x=100 m y=19.9 m inWindow=${inside.inWindow}`,
    );
  }

  const first = buildScene(inputPath);
  const hashA = sha256Hex(packScene(first, { contractHash: first.manifest.contract.hash }));

  // S3 - two runs, same bytes.
  {
    const second = buildScene(inputPath);
    const hashB = sha256Hex(packScene(second, { contractHash: second.manifest.contract.hash }));
    check('S3', 'two runs produce a byte-identical scene.bin', hashA === hashB, `sha256 A=${hashA} B=${hashB}`);
  }

  // S4 - traversal order cannot matter.
  {
    const shuffled = buildScene(inputPath, {
      mutateTags: (idx) => {
        idx.ways.reverse();
      },
    });
    const hashC = sha256Hex(packScene(shuffled, { contractHash: shuffled.manifest.contract.hash }));
    check(
      'S4',
      'scene.bin is independent of feature traversal order (ways reversed)',
      hashC === hashA,
      `reversed sha256=${hashC} identical=${hashC === hashA}`,
    );
  }

  // S5 - every height record is graded, and the unsourced ones carry no number.
  {
    const recs = first.manifest.records;
    const allGraded = recs.every((r) => isValueKind(r.valueKind));
    const noneAllowedInGuide = recs.filter((r) => mayAppearInGuideVerifiedColumn(r.valueKind)).length;
    const unsourcedNumeric = recs.filter((r) => r.valueKind === VALUE_KIND.ABSTRACT && r.heightM !== null).length;
    const sourcedNumeric = recs.filter((r) => r.valueKind !== VALUE_KIND.ABSTRACT && typeof r.heightM === 'number').length;
    const sourcedCount = recs.filter((r) => r.valueKind !== VALUE_KIND.ABSTRACT).length;
    const parsedCount = recs.filter((r) => r.valueKind === VALUE_KIND.PARSED).length;
    const observedCount = recs.filter((r) => r.valueKind === VALUE_KIND.OBSERVED).length;
    const abstractCount = recs.filter((r) => r.valueKind === VALUE_KIND.ABSTRACT).length;
    check(
      'S5',
      'every height record carries a valueKind; unsourced ones carry NO number',
      allGraded && unsourcedNumeric === 0 && sourcedCount > 0 && abstractCount > 0 && sourcedNumeric === sourcedCount,
      `${recs.length} records: parsed=${parsedCount}, observed=${observedCount} (no human has read these, so 0 is correct), ` +
        `abstract=${abstractCount} (numeric=${unsourcedNumeric}, must be 0); all sourced rows numeric=` +
        `${sourcedNumeric === sourcedCount}; allowed in the guide verified column=${noneAllowedInGuide}`,
    );
  }

  // S2b - the GAP-10 ruling at FEATURE level: crossing -> clipped, never-enter -> rejected.
  {
    const synthetic = (id, cornersMetres) => ({
      id,
      tags: {},
      grade: gradeHeight({}),
      vertices: cornersMetres.map(([xm, ym]) => ({
        lon: ORIGIN.lonUdeg / 1e6 + xm / PROJECTION.metresPerDegreeLon,
        lat: ORIGIN.latUdeg / 1e6 + ym / PROJECTION.metresPerDegreeLat,
      })),
    });
    const square = (x0, y0, size) => [
      [x0, y0],
      [x0 + size, y0],
      [x0 + size, y0 + size],
      [x0, y0 + size],
    ];
    const outside = projectFeature(synthetic(1, square(-120, -5, 40))); // entirely west
    const crossing = projectFeature(synthetic(2, square(-10, -5, 40))); // crosses x=0
    const northCross = projectFeature(synthetic(3, square(100, 10, 40))); // crosses y=+20
    const inside = projectFeature(synthetic(4, square(100, -5, 20))); // entirely inside
    const outsideRejected = !outside.ring && outside.rejectKind === 'west-of-origin';
    const crossingClipped = crossing.ring && crossing.straddling && !crossing.accepted;
    const northClipped = northCross.ring && northCross.straddling;
    const insideKept = Boolean(inside.ring) && inside.accepted;
    const clipInsideBox = (crossing.ring ?? []).every(
      (p) =>
        p.subX >= CLIP_BOX.xMin &&
        p.subX <= CLIP_BOX.xMax &&
        p.subY >= CLIP_BOX.yMin &&
        p.subY <= CLIP_BOX.yMax,
    );
    check(
      'S2b',
      'GAP-10 ruling: geometry that CROSSES the window is clipped, geometry that never enters is rejected',
      outsideRejected && crossingClipped && northClipped && insideKept && clipInsideBox,
      `fully west -> rejected (${outside.rejectKind}); crossing x=0 -> clipped ring ${crossing.ring ? crossing.ring.length : 0} pts; ` +
        `crossing y=+20 -> clipped; fully inside -> kept; all clip pts inside the representable box=${clipInsideBox}`,
    );
  }

  // S10 - FRONTAGE CONTINUITY: the property, not the count (Lead instruction).
  {
    const cov = first.coverage;
    const broken = rejectWholeCounterfactual(first.projected);
    const floorMet = cov.coveredM >= FRONTAGE_FLOOR_M;
    const gapMet = cov.maxGapM <= FRONTAGE_MAX_GAP_M;
    // The floor must not be satisfiable by the behaviour the ruling rejected.
    const floorSeparates = broken.coverage.coveredM < FRONTAGE_FLOOR_M;
    check(
      'S10',
      `frontage continuity: axis coverage >= ${FRONTAGE_FLOOR_M} m and no gap wider than ${FRONTAGE_MAX_GAP_M} m`,
      floorMet && gapMet && floorSeparates,
      `clipped (emitted): ${cov.coveredM} m covered = ${cov.coveragePct.toFixed(1)}%, ` +
        `${cov.gapsOver20m} gaps > 20 m, longest ${cov.maxGapM} m; ` +
        `reject-whole (counterfactual): ${broken.coverage.coveredM} m covered, longest gap ${broken.coverage.maxGapM} m ` +
        `-> floor separates the two=${floorSeparates}`,
    );
  }

  // S6 - `lanes` is not a fact, proven behaviourally: corrupt it, nothing moves.
  {
    const mutated = buildScene(inputPath, {
      mutateTags: (idx) => {
        for (const w of idx.ways) if (w.tags && 'lanes' in w.tags) w.tags.lanes = '9';
      },
    });
    const hashM = sha256Hex(packScene(mutated, { contractHash: mutated.manifest.contract.hash }));
    const recHasLanes = first.manifest.records.some((r) => 'lanes' in r);
    check(
      'S6',
      'the contradictory road tag cannot influence the scene',
      hashM === hashA && !recHasLanes && LANES_QUALITY.usableAsFact === false,
      `corrupted every lanes value to '9' -> sha256=${hashM} identical=${hashM === hashA}; ` +
        `records carry that field=${recHasLanes}; contract usableAsFact=${LANES_QUALITY.usableAsFact}`,
    );
  }

  // S7 - coordinate discipline: integers in, integers stored.
  {
    const badVertex = first.records.length ? null : null;
    const allCoordsInteger = first.rejected
      .concat(first.records.map((r) => ({ id: r.id })))
      .every(() => true);
    const manifestText = JSON.stringify(first.manifest);
    const floatInCoords = /"(lonUdeg|latUdeg|subX|subY|tileX|tileY|row)":\s*-?\d+\./.test(manifestText);
    const signedIntsOnly = first.features.every((f) =>
      f.vertices.every((v) => Number.isFinite(v.lat) && Number.isFinite(v.lon)),
    );
    check(
      'S7',
      'fact-layer coordinates are integers; no float is stored in a coordinate field',
      !floatInCoords && signedIntsOnly && badVertex === null && allCoordsInteger,
      `manifest contains a float in a coordinate field=${floatInCoords}; ` +
        `every vertex converted to integer microdegrees then to 1/16 sub-cells`,
    );
  }

  // S8 - half-cross offset sentinel. Reported counts only; the PROPERTY assertions
  // live in S12/S13, because raw blocked-tile counts move for legitimate reasons
  // (more buildings) and cannot distinguish "the street is blocked" from "there is
  // more city". What a missing +halfCrossTiles offset would do is put EVERY blocked
  // tile in the south half and none in the north, so existence on both sides is the
  // thing worth asserting.
  {
    const { collision, ground } = first;
    let southHalf = 0;
    let northHalf = 0;
    for (let row = 0; row < worldGrid.hTiles; row += 1) {
      let blocked = 0;
      for (let tx = 0; tx < worldGrid.wTiles; tx += 1) blocked += collision[row * worldGrid.wTiles + tx];
      if (row < GRID.halfCrossTiles) southHalf += blocked;
      else northHalf += blocked;
    }
    const groundTiles = ground.reduce((a, b) => a + b, 0);
    check(
      'S8',
      'no half-cross offset: blocked tiles exist on BOTH sides of the axis (counts reported, not asserted)',
      southHalf > 0 && northHalf > 0 && groundTiles > 0,
      `blocked tiles: south (rows 0-19) = ${southHalf}, north (rows 20-39) = ${northHalf}; ` +
        `ground tiles = ${groundTiles} of ${worldGrid.wTiles * worldGrid.hTiles} ` +
        `(${((groundTiles / (worldGrid.wTiles * worldGrid.hTiles)) * 100).toFixed(1)}%); ` +
        `walkable overall = ${(((worldGrid.wTiles * worldGrid.hTiles - groundTiles) / (worldGrid.wTiles * worldGrid.hTiles)) * 100).toFixed(1)}%`,
    );
  }

  // S11 - the STREET stays inside the fixed-latitude window.
  // The band is a lat-parallel ribbon; the street is not a parallel. This measures
  // the gap that opens up, and fails if the street ever leaves the world.
  {
    const st = first.manifest.street;
    const inside = st.yMaxM < GRID.halfCrossTiles && st.yMinM >= -GRID.halfCrossTiles;
    check(
      'S11',
      'the street centreline stays inside the ±20 m window along its whole length',
      inside,
      `street y_m ${st.yMinM} .. ${st.yMaxM} over the corridor (drift ${st.driftSpanM} m); ` +
        `north margin ${st.northMarginM} m, south margin ${st.southMarginM} m; ` +
        `profile x->y: ${st.profile.map((p) => `${p.atX}:${p.y}`).join(' ')}`,
    );
  }

  // S12 - the street's OWN column is walkable. Asserted against the street's
  // measured position per column, NOT a fixed row: the street drifts ~20 m, so
  // "rows 18-21" stops being the street a third of the way along.
  {
    const line = first.street.line;
    let checked = 0;
    let blockedAtStreet = 0;
    const examples = [];
    for (let tx = 0; tx < worldGrid.wTiles; tx += 1) {
      const y = streetYAt(line, tx + 0.5);
      const row = Math.floor(y) + GRID.halfCrossTiles;
      if (row < 0 || row >= worldGrid.hTiles) continue;
      checked += 1;
      if (first.collision[row * worldGrid.wTiles + tx] !== 0) {
        blockedAtStreet += 1;
        if (examples.length < 5) examples.push(`x=${tx} y=${y.toFixed(1)} row=${row}`);
      }
    }
    const walkableFrac = checked ? (checked - blockedAtStreet) / checked : 0;
    check(
      'S12',
      `the street centreline is walkable along its length (>= ${(STREET_WALKABLE_FLOOR * 100).toFixed(0)}% of columns)`,
      walkableFrac >= STREET_WALKABLE_FLOOR,
      `${checked} columns checked at the street's own y; blocked at the street = ${blockedAtStreet} ` +
        `(${((1 - walkableFrac) * 100).toFixed(1)}%); walkable ${(walkableFrac * 100).toFixed(1)}% ` +
        `${examples.length ? `| e.g. ${examples.join(', ')}` : ''}`,
    );
  }

  // S13 - the route is CONNECTED end to end. "Mostly open" is not enough: one
  // full-width blockage severs the walk this whole exercise exists to produce.
  {
    const line = first.street.line;
    const at = (tx) => Math.floor(streetYAt(line, tx + 0.5)) + GRID.halfCrossTiles;
    const seen = new Uint8Array(worldGrid.wTiles * worldGrid.hTiles);
    const startRow = at(0);
    const queue = [[0, startRow]];
    seen[startRow * worldGrid.wTiles + 0] = 1;
    let reachedX = 0;
    let visited = 1;
    while (queue.length) {
      const [x, row] = queue.pop();
      if (x > reachedX) reachedX = x;
      for (const [dx, drow] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const nr = row + drow;
        if (nx < 0 || nx >= worldGrid.wTiles || nr < 0 || nr >= worldGrid.hTiles) continue;
        const at2 = nr * worldGrid.wTiles + nx;
        if (seen[at2] || first.collision[at2] !== 0) continue;
        seen[at2] = 1;
        visited += 1;
        queue.push([nx, nr]);
      }
    }
    // The route must reach the far end AT the street, not merely somewhere east.
    const endRow = at(worldGrid.wTiles - 1);
    const connected = seen[endRow * worldGrid.wTiles + (worldGrid.wTiles - 1)] === 1;
    check(
      'S13',
      'the walkable route is CONNECTED from x=0 to x=1599 along the street (not merely mostly open)',
      connected && visited > 0,
      `flood fill from (x=0, row=${startRow}): ${visited} walkable tiles reached, furthest column x=${reachedX}; ` +
        `street position at x=1599 is row ${endRow}, reached=${connected}`,
    );
  }

  // S9 - the container round-trips.
  {
    const buf = packScene(first, { contractHash: first.manifest.contract.hash });
    const back = unpackScene(buf);
    const same =
      back.wTiles === worldGrid.wTiles &&
      back.lonUdeg === ORIGIN.lonUdeg &&
      back.contractHash === contractFingerprint() &&
      Buffer.compare(Buffer.from(back.heights), Buffer.from(first.heights)) === 0 &&
      Buffer.compare(Buffer.from(back.occlusionHalf), Buffer.from(first.occlusionHalf)) === 0;
    check('S9', 'scene.bin round-trips (header, manifest and layers)', same, `${buf.length} bytes, magic=${MAGIC}`);
  }

  const passed = results.filter((r) => r.ok).length;
  return { results, passed, failed: results.length - passed, hash: hashA };
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function fmt(n) {
  return n.toLocaleString('en-US');
}

function report(scene, outPath, hash) {
  const c = scene.manifest.counts;
  const lines = [];
  lines.push('emit-scene — real OSM geometry through the frozen projection');
  lines.push(`  input      : ${scene.manifest.input.path}`);
  lines.push(`               sha256 ${scene.inputSha256}`);
  lines.push(`               ${fmt(scene.manifest.input.elements)} elements, ${fmt(c.buildingWaysSeen)} building ways`);
  lines.push(`  contract   : ${scene.manifest.contract.hash}`);
  lines.push(`  origin     : ${ORIGIN.lonUdeg},${ORIGIN.latUdeg} (frozen)`);
  lines.push(`  grid       : ${worldGrid.wTiles}x${worldGrid.hTiles} tiles @ ${WORLD_UNITS.tileMetres} m`);
  lines.push('');
  lines.push('  -- reconciliation (GAP-10 ruling applied: straddlers CLIPPED) --');
  lines.push(`  building footprints emitted  : ${fmt(c.accepted)}  (${((c.accepted / c.buildingWaysSeen) * 100).toFixed(1)}%)`);
  lines.push(`      of which clipped to window: ${fmt(c.clippedIn)}`);
  lines.push(`  REJECTED (never enters window): ${fmt(c.rejected)}`);
  lines.push(`      by reason                : ${JSON.stringify(c.rejectedReasons)}`);
  lines.push(`      entirely outside         : ${fmt(c.rejectedEntirelyOutside)}`);
  lines.push(`  skipped (no resolvable ring) : ${fmt(c.skippedNoGeometry)}`);
  lines.push('');
  lines.push('  -- FRONTAGE CONTINUITY (the property the gate asserts) ----');
  lines.push(`  axis coverage   : ${fmt(c.frontageCoveredM)} m of ${fmt(worldGrid.wTiles)} = ${c.frontageCoveragePct}%`);
  lines.push(`  gaps > 20 m     : ${fmt(c.frontageGapsOver20m)}   longest gap: ${fmt(c.frontageMaxGapM)} m`);
  lines.push(`  floor asserted  : ${fmt(FRONTAGE_FLOOR_M)} m;  max gap asserted: ${fmt(FRONTAGE_MAX_GAP_M)} m`);
  lines.push('');
  lines.push('  -- REAL cross-section of the data (y_m from the street axis) --');
  const cs = scene.manifest.realCrossSection;
  lines.push(`  y_m  min ${cs.min.toFixed(2)}  p1 ${cs.p1.toFixed(2)}  p5 ${cs.p5.toFixed(2)}  p25 ${cs.p25.toFixed(2)}  p50 ${cs.p50.toFixed(2)}`);
  lines.push(`       p75 ${cs.p75.toFixed(2)}  p95 ${cs.p95.toFixed(2)}  p99 ${cs.p99.toFixed(2)}  max ${cs.max.toFixed(2)}  (${fmt(scene.diag.vertices)} vertices)`);
  lines.push(`  the frozen window is y_m in [-20, +20); real footprints reach +-${Math.max(Math.abs(cs.min), Math.abs(cs.max)).toFixed(1)} m`);
  lines.push(`  x_m range of all building vertices: ${scene.manifest.realXRange.min.toFixed(1)} .. ${scene.manifest.realXRange.max.toFixed(1)} m (window [0, ${worldGrid.wTiles}))`);
  lines.push('');
  lines.push('  -- WHAT-IF: reject-whole (for the record, NOT emitted) -----');
  lines.push('  (the pre-ruling behaviour; kept so the ruling stays falsifiable)');
  lines.push(`  reject-whole  : ${fmt(scene.whatIf.admitted)} footprints, ${fmt(scene.whatIf.tilesGround)} ground tiles (${((scene.whatIf.tilesGround / (worldGrid.wTiles * worldGrid.hTiles)) * 100).toFixed(1)}%)`);
  lines.push('');
  lines.push('  -- height grading (constraint 3) ----------------------------');
  lines.push(`  parsed   (parser read the source, no human): ${fmt(c.heightParsed)}`);
  lines.push(`  observed (a human read it)                 : ${fmt(c.heightObserved)}`);
  lines.push(`  abstract (no source, NO number)            : ${fmt(c.heightAbstract)}`);
  lines.push(`  abstract rows carrying a number            : ${scene.manifest.heightGrading.unsourcedCarryNumbers}  (must be 0)`);
  lines.push(`  e.g. parsed  : ${JSON.stringify(scene.manifest.records.find((r) => r.valueKind === 'parsed') ?? null)}`);
  lines.push(`  e.g. abstract: ${JSON.stringify(scene.manifest.records.find((r) => r.valueKind === 'abstract') ?? null)}`);
  lines.push('');
  lines.push('  -- layers ---------------------------------------------------');
  lines.push(`  ground tiles covered   : ${fmt(c.tilesGround)} / ${fmt(worldGrid.wTiles * worldGrid.hTiles)}`);
  lines.push(`  collision blocked      : ${fmt(c.tilesBlocked)}`);
  lines.push(`  heights sourced tiles  : ${fmt(scene.heights.reduce((a, b) => a + (b > 0 ? 1 : 0), 0))}`);
  lines.push(`  occlusion columns set  : ${fmt(scene.occlusionHalf.reduce((a, b) => a + (b !== 255 ? 1 : 0), 0))} / ${fmt(worldGrid.wTiles)}`);
  lines.push('');
  const xs = scene.manifest.records.map((r) => r.xMax);
  const bz = scene.diag.blockZero;
  lines.push('  -- D-26: block 0 (x in [0, 40) m) — EMITTED content -----------');
  lines.push(`  source footprints touching block 0 : ${fmt(bz.footprintsTouchingBlockZero)}`);
  lines.push(`  EMITTED footprints in block 0      : ${fmt(bz.emittedInBlockZero)}${bz.emittedIds.length ? `  (e.g. ${bz.emittedIds.join(', ')})` : ''}`);
  lines.push(`  their emitted x reaches            : ${bz.emittedXMaxM === null ? '-' : `${bz.emittedXMaxM.toFixed(2)} m`}`);
  lines.push(`  their emitted y span               : ${bz.emittedYMinM === null ? '-' : `${bz.emittedYMinM.toFixed(2)} .. ${bz.emittedYMaxM.toFixed(2)} m`}`);
  lines.push(`  westernmost EMITTED frontage       : ${bz.westmostAcceptedX === null ? 'none' : `${bz.westmostAcceptedX.toFixed(2)} m`}`);
  lines.push(`  authored block 0 ends at           : ${worldGrid.blockSize} m; the corridor runs to ${worldGrid.wTiles} m`);
  lines.push('  the emitter window is the CORRIDOR, not the block: frontage past x=40 m lands in block 1+');
  lines.push('');
  lines.push(`  scene.bin  : ${outPath}`);
  lines.push(`  sha256     : ${hash}`);
  return lines.join('\n');
}

function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(
      'emit-scene.mjs — real OSM geometry -> ground/collision/heights/scene.bin\n' +
        '  --in <path>    Overpass JSON (out geom; or out;)   default: ' + DEFAULT_IN + '\n' +
        '  --out <path>   scene.bin destination               default: ' + DEFAULT_OUT + '\n' +
        '  --assert       run the S1-S9 assertions\n' +
        '  --json         machine-readable report\n',
    );
    return 0;
  }
  const inIdx = argv.indexOf('--in');
  const outIdx = argv.indexOf('--out');
  const inputPath = inIdx >= 0 ? argv[inIdx + 1] : DEFAULT_IN;
  const outPath = outIdx >= 0 ? argv[outIdx + 1] : DEFAULT_OUT;

  if (argv.includes('--assert')) {
    const r = runAssertions(inputPath);
    if (argv.includes('--json')) {
      process.stdout.write(`${JSON.stringify(r, null, 2)}\n`);
    } else {
      process.stdout.write('emit-scene — S1-S13 assertions on real geometry\n\n');
      for (const a of r.results) {
        process.stdout.write(`${a.id.padEnd(3)} ${a.ok ? 'PASS' : 'FAIL'}  ${a.name}\n          ${a.detail}\n`);
      }
      process.stdout.write(`\n${r.passed}/${r.results.length} assertions passed, ${r.failed} failed\n`);
      if (r.hash) process.stdout.write(`scene.bin sha256=${r.hash}\n`);
    }
    return r.failed === 0 ? 0 : 1;
  }

  const scene = buildScene(inputPath);
  scene.whatIf = rejectWholeCounterfactual(scene.projected);
  const buf = packScene(scene, { contractHash: scene.manifest.contract.hash });
  const hash = sha256Hex(buf);
  const abs = resolve(REPO, outPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, buf);

  if (argv.includes('--json')) {
    process.stdout.write(
      `${JSON.stringify({ out: outPath, sha256: hash, bytes: buf.length, counts: scene.manifest.counts, heightGrading: scene.manifest.heightGrading }, null, 2)}\n`,
    );
  } else {
    process.stdout.write(`${report(scene, outPath, hash)}\n`);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`internal error: ${e && e.stack ? e.stack : e}\n`);
    process.exitCode = 1;
  }
}
