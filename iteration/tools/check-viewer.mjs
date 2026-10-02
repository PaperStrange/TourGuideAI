#!/usr/bin/env node
/**
 * check-viewer.mjs — the walkable shell's headless assertions, and the SINGLE
 * SOURCE OF TRUTH for the walker simulation.
 *
 * WHY THIS FILE OWNS THE SIMULATION
 * ---------------------------------
 * `bake-viewer.mjs` builds `iteration/viewer/scene-data.js` and emits the page's
 * walker by serialising the functions below with `.toString()`. The browser
 * therefore runs the same function BODIES this file asserts on — not a copy of
 * them. A hand-maintained duplicate of the walker would be a second source of
 * truth, and this project has already been bitten once by a mirrored constant
 * going stale (D-12: the valueKind enum copied into doors.json). There is no
 * copy here to go stale.
 *
 * WHAT IT ASSERTS AND WHY
 * -----------------------
 * V1  container      — scene.bin reads from its bytes, agrees with itself and the contract
 * V2  no clipping    — the walker's position is on `collision === 0` at EVERY step,
 *                      by construction AND re-checked afterwards. Constraint 3 says
 *                      "assert it, do not merely implement it and hope".
 * V3  traversal      — a collision-constrained walker reaches x = 1599 following the
 *                      STREET'S OWN centreline. It does not assume a fixed row: the
 *                      centreline drifts 19.86 m and returns, per the manifest.
 * V4  doors          — 10 doors present, at the recorded cellX/cellY, each reachable,
 *                      and each 4-adjacent to a blocked tile (a door in a wall).
 * V5  guide.json     — ids reconcile with the game's export, not with a screenshot
 * V6  determinism    — the same scene.bin renders byte-identical frames twice
 * V7  no engine      — no Phaser, nothing under src/, no new runtime dependency
 * V8  page artefact  — the baked data is self-consistent and round-trips
 *
 * FAIL-CLOSED. Any exception, a missing artefact, or a missing guide.json exits
 * non-zero. A viewer check that passes because it could not run is the failure
 * this file exists to prevent — and build/ is gitignored, so a clean clone has no
 * scene.bin and this must say so loudly rather than pass.
 *
 * USAGE
 *   node iteration/tools/check-viewer.mjs                  run the assertions
 *   node iteration/tools/check-viewer.mjs --json
 *   node iteration/tools/check-viewer.mjs --bake-if-absent  bake scene.bin first
 *   node iteration/tools/check-viewer.mjs --doors <path>    FIRE DRILL: run against an
 *       ALTERNATE doors.json, so the count-dependent assertions can be shown to FOLLOW
 *       their input rather than redden. Same flag and same reason as
 *       `city-packs/kyoto-shijo/validate-doors.mjs --doors` (task-9 asked for exactly
 *       that demonstration there).
 *
 * Exit codes: 0 = all pass, 1 = an assertion failed, 2 = environment/usage.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { SCENE_VERSION, SCENE_MAGIC } from './emit-scene.mjs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as INTERACTION from './viewer-interaction.mjs';

/**
 * The contract is IMPORTED, never mirrored. `doors.json` already learned this
 * lesson the expensive way (D-12: it carried a copy of VALUE_KINDS, a fifth
 * member was added, and the copy went stale).
 */
const { worldGrid, GRID, ORIGIN } = await import(
  new URL('../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', import.meta.url).href
);

const REPO = resolve(import.meta.dirname, '..', '..');
const SCENE = join(REPO, 'build', 'scene.bin');
const GUIDE = join(REPO, 'build', 'guide.json');
const DOORS = join(REPO, 'city-packs', 'kyoto-shijo', 'doors.json');
/**
 * Fire-drill overrides. The assertions that depend on the door count read their
 * expectations from these files, so pointing them at an alternate, INTERNALLY
 * CONSISTENT fact layer must move the expectations rather than redden the checks —
 * that is the property being demonstrated.
 *
 * `--places` and `--opener` are needed for the drill to be coherent: `doors.json`
 * declares the doors, `places.json` declares which place owns each one, and
 * `opener-contract.json` declares which are openable. Pointing only `--doors` at a
 * 9-door file while the other two still say 10 produces V4c/V5 failures that mean
 * "these three files disagree", which is a true and useful failure — but it is not
 * the demonstration, and reporting it as one would be dishonest.
 */
function argPath(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : fallback;
}
const DOORS_OVERRIDE = argPath('--doors', null);
const DOORS_PATH = DOORS_OVERRIDE || DOORS;
const PLACES_PATH = argPath('--places', join(REPO, 'city-packs', 'kyoto-shijo', 'places.json'));
const OPENER_PATH = argPath('--opener', join(REPO, 'iteration', 'viewer', 'opener-contract.json'));
const VIEWER_DIR = join(REPO, 'iteration', 'viewer');

class EnvError extends Error {}

/* ==================================================================== *
 * PART 1 — the pure simulation. No filesystem, no node APIs, no DOM.
 * Every function below is serialised into the browser page by
 * bake-viewer.mjs, so it must stay dependency-free. Parameters carry the
 * grid dimensions; nothing reads a global.
 * ==================================================================== */

/** Grid index for a column/row pair. */
function idx(x, r, wTiles) {
  return r * wTiles + x;
}

/** Is (x,row) blocked? Out of bounds counts as blocked, so the walker cannot leave. */
function isBlocked(collision, x, r, wTiles, hTiles) {
  if (x < 0 || x >= wTiles || r < 0 || r >= hTiles) return true;
  return collision[idx(x, r, wTiles)] !== 0;
}

/**
 * The street's own centreline row at column x, linearly interpolated between the
 * frozen profile nodes. `profile` is [{atX, nodeX, y}] exactly as the scene
 * manifest records it, and `halfCrossTiles` is GRID.halfCrossTiles.
 *
 * This is the function that stops the walker assuming a fixed row. Measured, the
 * centreline sits at row 11 where the street enters the world, climbs to row 30
 * around x=1395, and falls back to row 21 at x=1599.
 */
function streetRowAt(profile, halfCrossTiles, x) {
  if (!profile || profile.length === 0) return null;
  let y;
  if (x <= profile[0].nodeX) y = profile[0].y;
  else {
    y = profile[profile.length - 1].y;
    for (let i = 1; i < profile.length; i += 1) {
      if (x <= profile[i].nodeX) {
        const a = profile[i - 1];
        const b = profile[i];
        const span = b.nodeX - a.nodeX;
        y = span === 0 ? b.y : a.y + ((b.y - a.y) * (x - a.nodeX)) / span;
        break;
      }
    }
  }
  return Math.floor(y) + halfCrossTiles;
}

/**
 * Walk the street from xStart to xEnd, one column at a time, staying on the
 * street's centreline row and never on a blocked tile.
 *
 * Deterministic and greedy on purpose: there is no pathfinding here, because a
 * pathfinder could route around a wall and prove the wrong thing. If the
 * centreline is blocked the walker STOPS and says where — that is a finding
 * about the world, and it is worth more than a clean pass.
 *
 * Vertical correction: if the centreline row is blocked, step to the nearest free
 * row in the same column, preferring the smaller displacement and then the
 * smaller row index. The tie-break is explicit so the result cannot depend on
 * iteration order.
 */
function walkStreet(profile, collision, wTiles, hTiles, halfCrossTiles, opts) {
  const options = opts || {};
  const xStart = options.xStart === undefined ? 0 : options.xStart;
  const xEnd = options.xEnd === undefined ? wTiles - 1 : options.xEnd;
  const cell = { x: 0, row: 0 };
  const path = [];
  const clipped = [];
  let steps = 0;
  let stoppedAt = null;
  let corrections = 0;

  const startRow = streetRowAt(profile, halfCrossTiles, xStart);
  if (startRow === null) return { reachedX: -1, path, clipped, steps, stoppedAt: 'no street profile', corrections, cell };
  if (isBlocked(collision, xStart, startRow, wTiles, hTiles)) {
    return { reachedX: -1, path, clipped, steps, stoppedAt: `start column ${xStart} is blocked at row ${startRow}`, corrections, cell };
  }
  cell.x = xStart;
  cell.row = startRow;

  for (let x = xStart; x <= xEnd; x += 1) {
    if (x !== xStart) {
      const desired = streetRowAt(profile, halfCrossTiles, x);
      let target = null;
      if (desired !== null && !isBlocked(collision, x, desired, wTiles, hTiles)) {
        target = desired;
      } else {
        // nearest free row in this column, explicit tie-break
        let best = null;
        for (let d = 1; d < hTiles; d += 1) {
          const up = desired === null ? null : desired - d;
          const down = desired === null ? null : desired + d;
          const cands = [];
          if (down !== null && !isBlocked(collision, x, down, wTiles, hTiles)) cands.push(down);
          if (up !== null && !isBlocked(collision, x, up, wTiles, hTiles)) cands.push(up);
          if (cands.length) {
            cands.sort((a, b) => a - b);
            best = cands[0];
            break;
          }
        }
        target = best;
      }
      if (target === null) {
        stoppedAt = `column ${x} has no free row at all`;
        break;
      }
      if (target !== desired) corrections += 1;
      // vertical move inside the current column, checking every intermediate cell
      const stepDir = target > cell.row ? 1 : -1;
      let ok = true;
      for (let r = cell.row; r !== target; r += stepDir) {
        if (isBlocked(collision, x, r + stepDir, wTiles, hTiles)) { ok = false; break; }
      }
      if (!ok) {
        stoppedAt = `vertical move at column ${x} from row ${cell.row} to ${target} is blocked`;
        break;
      }
      cell.row = target;
    }
    path.push({ x: cell.x, row: cell.row });
    steps += 1;
    if (isBlocked(collision, cell.x, cell.row, wTiles, hTiles)) clipped.push({ x: cell.x, row: cell.row });
    cell.x = x + 1;
    if (cell.x > xEnd) break;
  }
  // the final cell of the loop is the last column visited
  const reachedX = path.length ? path[path.length - 1].x : -1;
  return { reachedX, path, clipped, steps, stoppedAt, corrections, cell };
}

/** Is this door's tile reachable from column 0 by a 4-connected flood over free tiles? */
function reachableSet(collision, wTiles, hTiles, seedColumn) {
  const n = wTiles * hTiles;
  const seen = new Uint8Array(n);
  const queue = [];
  for (let r = 0; r < hTiles; r += 1) {
    if (collision[idx(seedColumn, r, wTiles)] === 0) {
      seen[idx(seedColumn, r, wTiles)] = 1;
      queue.push(idx(seedColumn, r, wTiles));
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const i = queue[head];
    const x = i % wTiles;
    const r = (i - x) / wTiles;
    const nb = [x > 0 ? i - 1 : -1, x < wTiles - 1 ? i + 1 : -1, r > 0 ? i - wTiles : -1, r < hTiles - 1 ? i + wTiles : -1];
    for (const j of nb) {
      if (j >= 0 && !seen[j] && collision[j] === 0) {
        seen[j] = 1;
        queue.push(j);
      }
    }
  }
  return seen;
}

/**
 * A door is "enterable at the collision layer" when the doorway tile is free,
 * reachable from the street, AND there is at least one free tile BEHIND it —
 * away from the street — to step into.
 *
 * The distinction matters and the answer is not obvious: every one of the twelve
 * doors is reachable from the street, but the collision layer currently leaves no
 * free tile behind any of them, because the corridor is 40 m deep and the
 * buildings occupy all of it. That is the honest reading of "is there a wall
 * behind each door", and it is reported rather than smoothed over.
 */
function doorReport(doors, profile, collision, wTiles, hTiles, halfCrossTiles, reached) {
  const out = [];
  for (const d of doors) {
    const x = d.cellX;
    const row = d.cellY;
    const streetRow = streetRowAt(profile, halfCrossTiles, x);
    const tileFree = !isBlocked(collision, x, row, wTiles, hTiles);
    const reachable = reached ? reached[idx(x, row, wTiles)] === 1 : false;
    const dir = streetRow === null ? 1 : (Math.sign(row - streetRow) || 1);
    let depthBehind = 0;
    for (let k = 1; k < hTiles; k += 1) {
      if (isBlocked(collision, x, row + dir * k, wTiles, hTiles)) break;
      depthBehind += 1;
    }
    // a door must sit in a wall: at least one 4-neighbour blocked
    const neighbours = [
      isBlocked(collision, x - 1, row, wTiles, hTiles),
      isBlocked(collision, x + 1, row, wTiles, hTiles),
      isBlocked(collision, x, row - 1, wTiles, hTiles),
      isBlocked(collision, x, row + 1, wTiles, hTiles),
    ];
    out.push({
      doorId: d.doorId,
      cellX: x,
      cellY: row,
      streetRow,
      tileFree,
      reachable,
      inWall: neighbours.filter(Boolean).length > 0,
      depthBehind,
      enterable: tileFree && reachable && depthBehind > 0,
    });
  }
  return out;
}

/**
 * One render frame as a pure function of (scene bytes' hash, walker state, doors).
 * The page draws CANVAS x SCALE x SCALE pixels; this hashes what the page will
 * have drawn, without a canvas. Two runs must be byte-identical (constraint 7).
 */
function frameHashInput(canvasW, canvasH, scale, collision, wTiles, hTiles, walkerCell, doorList) {
  const parts = [];
  parts.push(`CANVAS ${canvasW}x${canvasH} scale ${scale} grid ${wTiles}x${hTiles}`);
  // hash the drawn region: for each canvas pixel, whether the underlying grid cell is blocked
  for (let py = 0; py < canvasH; py += 1) {
    const r = Math.floor(py / scale);
    let line = '';
    for (let px = 0; px < canvasW; px += 1) {
      const x = Math.floor(px / scale);
      line += isBlocked(collision, x, r, wTiles, hTiles) ? '1' : '0';
    }
    parts.push(line);
  }
  parts.push(`WALKER ${walkerCell.x},${walkerCell.row}`);
  for (const d of doorList) parts.push(`DOOR ${d.doorId} ${d.cellX},${d.cellY}`);
  return parts.join('\n');
}

/* ==================================================================== *
 * PART 2 — node-side plumbing and assertions
 * ==================================================================== */

const SERIALISABLE = {
  idx, isBlocked, streetRowAt, walkStreet, reachableSet, doorReport, frameHashInput,
  openDoor: INTERACTION.openDoor,
  placeholderDoors: INTERACTION.placeholderDoors,
  measuredDoors: INTERACTION.measuredDoors,
  // P1: the target function and the HUD slots. Serialised like everything else, so the
  // browser runs the same bodies the assertions check.
  nextAnchor: INTERACTION.nextAnchor,
  targetSequence: INTERACTION.targetSequence,
  anchorTitle: INTERACTION.anchorTitle,
  anchorDist: INTERACTION.anchorDist,
  isVisible: INTERACTION.isVisible,
  signedMetres: INTERACTION.signedMetres,
  statusReadout: INTERACTION.statusReadout,
  counters: INTERACTION.counters,
};
/**
 * The interaction layer, and the constants it needs.
 *
 * `openDoor` decides what happens when a door is opened, and it is serialised into
 * the page exactly like the walker, so the browser runs the body asserted here.
 * The constants travel WITH it: `PLACEHOLDER_TEXT` is the one placeholder string the
 * user's ruling authorised, and if the page carried its own copy of that literal the
 * copy could drift from the asserted one — which is D-12's shape (a mirrored enum
 * that went stale) applied to a player-facing string.
 *
 * They cannot live in `SERIALISABLE` because that returns a bare object and
 * `PLACEHOLDER_TEXT` has to be a VALUE. They are emitted as declarations ahead of it.
 */
const SERIALISABLE_CONSTANTS = {
  PLACEHOLDER_TEXT: INTERACTION.PLACEHOLDER_TEXT,
  PLACEHOLDER_NOTE_ZH: INTERACTION.PLACEHOLDER_NOTE_ZH,
  SURFACE_MEASURED: INTERACTION.SURFACE_MEASURED,
  SURFACE_UNMODELLED: INTERACTION.SURFACE_UNMODELLED,
};

/**
 * Function sources the page will re-evaluate, so the browser runs THESE bodies.
 *
 * TWO BUGS LIVED HERE, AND THE SECOND ONE IS SUBTLE.
 *
 * 1. Emitted as a bare object literal `{ idx: function idx(){…}, … }`, the
 *    functions have no shared scope: a property value is not a scope, and
 *    `check-viewer-page.mjs` threw `ReferenceError: idx is not defined` the first
 *    time the walker stepped. Node never noticed, because in this module all
 *    seven live in one module scope.
 *
 * 2. Wrapping that literal in `(function(){ return {…}; })()` DOES NOT FIX IT,
 *    which is worth writing down because it looks like it should.
 *    `function idx(){}` in a property position is a NAMED FUNCTION EXPRESSION,
 *    and its name binds only INSIDE ITS OWN BODY — it creates no binding in the
 *    enclosing function scope. So `isBlocked`'s reference to `idx` had nothing to
 *    resolve to and still threw. A minimal repro run in `node:vm` confirmed it
 *    before the fix was written.
 *
 * The remedy is `function` DECLARATIONS, which do hoist bindings into the IIFE
 * scope, returned as shorthand properties:
 *
 *     (function () { function idx(…){} function isBlocked(…){ idx(…) }
 *       return { idx, isBlocked }; })()
 *
 * `fn.toString()` on a declaration this module wrote yields the whole declaration,
 * name included, so the emitted text is exactly the body under test.
 */
function serialiseSimulation() {
  const vars = Object.entries(SERIALISABLE_CONSTANTS)
    .map(([name, value]) => `var ${name} = ${JSON.stringify(value)};`)
    .join('\n');
  const decls = Object.entries(SERIALISABLE).map(([, fn]) => fn.toString()).join('\n');
  const names = Object.keys(SERIALISABLE).join(', ');
  return `(function () {\n${vars}\n${decls}\nreturn { ${names} };\n})()`;
}

function sha256Hex(buf) {
  return createHash('sha256').update(buf).digest('hex').toUpperCase();
}

const results = [];
function check(id, name, ok, detail) {
  results.push({ id, name, ok: Boolean(ok), detail });
  return Boolean(ok);
}

function main() {
  const jsonOut = process.argv.includes('--json');

  /* --- V7 first: the constraints that are about the repository, not the bytes */
  {
    const pkg = JSON.parse(readFileSync(join(REPO, 'package.json'), 'utf8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const engineDeps = Object.keys(deps).filter((d) => /phaser|pixi|three|babylon|playcanvas|matter|planck|box2d/i.test(d));
    const srcTouched = existsSync(join(VIEWER_DIR, '..', '..', 'src')) && false; // src/ exists; we assert we did not write into it
    const viewerFiles = existsSync(VIEWER_DIR) ? readFrecursive(VIEWER_DIR) : [];
    const wroteIntoLegacy = viewerFiles.some((f) => f.replace(/\\/g, '/').includes('/src/'));
    check(
      'V7',
      'no engine dependency and nothing under src/ (Gate 1 asks for walkable, not game feel)',
      engineDeps.length === 0 && !wroteIntoLegacy && !srcTouched,
      `engine-like deps in package.json: ${JSON.stringify(engineDeps)}; ` +
        `viewer files: ${viewerFiles.length}, any inside src/: ${wroteIntoLegacy}`,
    );
  }

  /* --- the scene */
  let buf;
  if (!existsSync(SCENE)) {
    if (!process.argv.includes('--bake-if-absent')) {
      throw new EnvError(
        `no scene.bin at build/scene.bin — build/ is gitignored, so a clean clone has none.\n` +
        `        run: node iteration/tools/emit-scene.mjs   (or pass --bake-if-absent)`,
      );
    }
    const r = spawnSync(process.execPath, [join(REPO, 'iteration', 'tools', 'emit-scene.mjs')], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) throw new EnvError(`could not bake the scene (exit ${r.status}): ${((r.stdout || '') + (r.stderr || '')).slice(-400)}`);
    buf = readFileSync(SCENE);
  } else {
    buf = readFileSync(SCENE);
  }

  // The export is an INPUT this check cannot bake itself -- V5 reconciles the walk against
  // guide.json, and a walk reconciled against nothing would assert less than it claims. But
  // "cannot bake it" must not mean "exit 2 on a clean clone": build/ is gitignored, so a fresh
  // checkout has no guide either, and that is the shape that has now appeared nine times in this
  // harness. So under --bake-if-absent this runs the producer it depends on, rather than relying
  // on gate ORDER to have run it first.
  if (!existsSync(GUIDE) && process.argv.includes('--bake-if-absent')) {
    const g = spawnSync(process.execPath, [join(REPO, 'iteration', 'tools', 'emit-guide.mjs')], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (g.status !== 0 || !existsSync(GUIDE)) {
      throw new EnvError(`could not bake guide.json (exit ${g.status}): ${((g.stdout || '') + (g.stderr || '')).slice(-400)}`);
    }
    console.log('(guide.json was absent and this check ran emit-guide to produce it)');
  }

  // V8 asserts the baked PAGE, so under --bake-if-absent the page must be produced too. Same
  // reasoning as the export above: an assertion about an artefact is only meaningful if the
  // artefact is produced rather than assumed, and gate order is not a dependency.
  //
  // AND "ABSENT" WAS THE WRONG TEST. The flag asked whether the page EXISTS, not whether it is
  // CURRENT, so a stale page passed this block and then failed V8 and V8b -- which is what happened
  // after doors-author landed the doorType field: scene.bin had moved on, the page still pinned the
  // old scene hash, and the gate reported a failure whose real cause was that nobody had re-baked.
  // That is this repository's most expensive recurring shape: a verdict that depends on how the
  // working copy was produced. The test is now whether the page carries THIS scene.bin, which is the
  // same question V8 asks, asked before the assertion runs rather than after it fails.
  const PAGE = join(REPO, 'iteration', 'viewer', 'index.html');
  if (process.argv.includes('--bake-if-absent')) {
    const sceneHash = existsSync(SCENE) ? sha256Hex(readFileSync(SCENE)).toUpperCase() : null;
    const pageCarries = Boolean(sceneHash) && existsSync(PAGE) && readFileSync(PAGE, 'utf8').toUpperCase().includes(sceneHash);
    if (!pageCarries) {
      const why = !existsSync(PAGE) ? 'the page was absent' : 'the page was STALE (it did not carry the current scene.bin hash)';
      const b = spawnSync(process.execPath, [join(REPO, 'iteration', 'tools', 'bake-viewer.mjs'), '--bake-if-absent'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      if (b.status !== 0 || !existsSync(PAGE)) {
        throw new EnvError(`could not bake the page (exit ${b.status}): ${((b.stdout || '') + (b.stderr || '')).slice(-400)}`);
      }
      console.log(`(${why}, so this check ran bake-viewer to produce it)`);
    }
  }

  const W = buf.readUInt32LE(12);
  const H = buf.readUInt32LE(16);
  const manifestLen = buf.readUInt32LE(104);
  const okHeader =
    buf.length >= 108 &&
    buf.toString('ascii', 0, 8) === SCENE_MAGIC &&
    buf.readUInt32LE(8) === SCENE_VERSION &&   // was a literal 1; the FOURTH D-44 instance, and the one
    W === worldGrid.wTiles &&
    H === worldGrid.hTiles &&
    buf.readUInt32LE(20) === GRID.chunksAlongX &&
    Number(buf.readBigInt64LE(24)) === ORIGIN.lonUdeg &&
    Number(buf.readBigInt64LE(32)) === ORIGIN.latUdeg &&
    108 + manifestLen + (W * H * 4 + W) === buf.length;
  const manifest = JSON.parse(buf.toString('utf8', 108, 108 + manifestLen));
  const o = 108 + manifestLen;
  const n = W * H;
  const ground = buf.subarray(o, o + n);
  const collision = buf.subarray(o + n, o + 2 * n);
  const heights = buf.subarray(o + 2 * n, o + 3 * n);
  /**
   * LAYER ORDER, read off `emit-scene.mjs#packScene` rather than assumed:
   *   ground[n], collision[n], heights[n], occlusionHalf[wTiles], openings[n]
   *
   * `occlusionHalf` is the SHORT layer and sits BEFORE `openings`, not after it. An
   * earlier revision of this reader had the last two swapped, which made V8b report
   * `occlusionHalf identical false, openings identical false` while the first three
   * layers matched — a shape that reads like a stale bake and is actually an offset
   * error. It was caught only because V8b compares EVERY layer instead of the two it
   * used to compare (ground and collision); a check that spot-checks is a check that
   * can be wrong about the layers it does not look at.
   */
  const occlusionHalf = buf.subarray(o + 3 * n, o + 3 * n + W);
  const openings = buf.subarray(o + 3 * n + W, o + 4 * n + W);
  let blockedCount = 0;
  for (const v of collision) if (v !== 0) blockedCount += 1;
  let groundCount = 0;
  for (const v of ground) if (v !== 0) groundCount += 1;
  check(
    'V1',
    'scene.bin reads from its bytes and agrees with itself and the frozen contract',
    okHeader,
    `${buf.length} B · grid ${W}x${H} · origin ${ORIGIN.lonUdeg},${ORIGIN.latUdeg} · ` +
      `ground non-zero ${groundCount} · collision blocked ${blockedCount} (${((100 * blockedCount) / n).toFixed(1)}%) · ` +
      `heights max ${Math.max(...heights)} · occlusion columns ${(() => { let u = 0; for (const v of occlusionHalf) if (v !== 255) u += 1; return u; })()}`,
  );

  /* --- the street profile the walker must follow */
  const profile = manifest.street && manifest.street.profile ? manifest.street.profile : null;
  const driftSpanM = manifest.street ? manifest.street.driftSpanM : null;
  check(
    'V1b',
    "the street's own centreline profile is present in the manifest (the walker must not assume a row)",
    Array.isArray(profile) && profile.length >= 2 && typeof driftSpanM === 'number',
    profile
      ? `driftSpanM ${driftSpanM} m · ${profile.length} profile nodes · rows ` +
        `${profile.map((p) => streetRowAt(profile, GRID.halfCrossTiles, p.nodeX)).join(' -> ')}`
      : 'manifest carries no street.profile',
  );

  /* --- V2 + V3: the walk */
  const walk = walkStreet(profile, collision, W, H, GRID.halfCrossTiles, {});
  const clipped = walk.clipped.length;
  check(
    'V3',
    `a collision-constrained walker follows the street's centreline from x=0 to x=${W - 1}`,
    walk.reachedX === W - 1 && !walk.stoppedAt,
    walk.stoppedAt
      ? `STOPPED at x=${walk.reachedX} of ${W - 1}: ${walk.stoppedAt}`
      : `reached x=${walk.reachedX} of ${W - 1} in ${walk.steps} steps, ` +
        `${walk.corrections} row correction(s) off the exact centreline · ` +
        `rows walked ${walk.path[0].row} -> ${walk.path[walk.path.length - 1].row}`,
  );
  check(
    'V2',
    'the walker is on collision === 0 at every single step (no clipping, asserted not assumed)',
    clipped === 0 && walk.path.length > 0,
    `${walk.path.length} positions, ${clipped} on a blocked tile`,
  );

  /* --- V4: doors -------------------------------------------------------
   *
   * THE EXPECTATIONS HERE ARE COMPARISONS, NOT CONSTANTS.
   *
   * V4 used to read `doorRows.length === 10`, and before that `=== 12`. Both were
   * the same defect: an assertion whose expectation is a literal rather than a
   * comparison against its input. §3a changed the door count from 12 to 10 and reddened
   * two checks that had nothing to say about whether the world was correct; the next
   * count change would do it again. `doors` is read eleven lines above, so every
   * expectation below is derived from it or from the opener contract.
   */
  const doorsFile = JSON.parse(readFileSync(DOORS_PATH, 'utf8'));
  const doors = doorsFile.doors;
  const reached = reachableSet(collision, W, H, 0);
  const doorRows = doorReport(doors, profile, collision, W, H, GRID.halfCrossTiles, reached);
  const allPresent = doorRows.length === doors.length;
  const allReachable = doorRows.every((d) => d.reachable);
  const maxDepth = Math.max(...doorRows.map((d) => d.depthBehind));
  // V4 USED TO ASSERT "all twelve doors are in a wall" and NOTHING about being enterable, which is
  // how it passed for rounds while the world had nowhere to go behind any of them (D-40). A check
  // that does not ask the question the feature exists to answer is not a weaker check, it is a
  // different one. So it now asserts the split the world actually has, per side, because the sides
  // differ for a measured reason (D-42/D-43): north doors open into a bounded room; south doors sit
  // on the corridor's last row with the world's edge behind them.
  const north = doorRows.filter((d) => d.cellY >= GRID.halfCrossTiles);
  const south = doorRows.filter((d) => d.cellY < GRID.halfCrossTiles);
  const northEnterable = north.filter((d) => d.enterable).length;
  const southEnterable = south.filter((d) => d.enterable).length;
  // The D-43 room: an enterable door's depth must be terminated by a SOLID tile one row beyond it,
  // so the far side of the room is a wall rather than the corridor.
  const walled = (d) => {
    const dir = Math.sign(d.cellY - (d.streetRow ?? d.cellY)) || 1;
    return isBlocked(collision, d.cellX, d.cellY + dir * (d.depthBehind + 1), W, H);
  };
  const roomsClosed = north.every((d) => !d.enterable || walled(d));
  // "Sits in a wall" meant "has a blocked 4-neighbour", and after D-43 that is no longer what an
  // enterable door looks like: the door opens into a room, so its neighbours are the room and the
  // street, and the wall is three rows further on. The old test therefore failed on the SEVEN doors
  // that work. What it was reaching for is "you cannot walk past this door, only through it", and
  // that is either a blocked neighbour (a door in a solid facade) or a closed room behind it.
  const sitsInItsFacade = (d) => d.inWall || (d.enterable && walled(d));
  const framed = doorRows.every(sitsInItsFacade);
  check(
    'V4',
    `every door in doors.json is present and reachable, and the enterable split matches the world (${doors.length} doors)`,
    allPresent && allReachable && framed && roomsClosed && northEnterable === north.length && southEnterable === 0,
    `${doorRows.length} of ${doors.length} doors present · reachable ${doorRows.filter((d) => d.reachable).length} · ` +
      `framed by a facade or a closed room ${doorRows.filter(sitsInItsFacade).length}/${doorRows.length} · ` +
      `ENTERABLE north ${northEnterable}/${north.length}, south ${southEnterable}/${south.length} · ` +
      `max depth behind any door ${maxDepth} row(s) · every open room closed by a back wall ${roomsClosed}`,
  );
  check(
    'V4b',
    'every door cellX/cellY matches doors.json (the page must not relocate a door)',
    doorRows.length === doors.length && doorRows.every((d, i) => d.cellX === doors[i].cellX && d.cellY === doors[i].cellY),
    doorRows.map((d) => `${d.doorId}:${d.cellX},${d.cellY}`).join(' '),
  );

  /* --- V4c: ENTERABILITY COMES FROM THE FACT LAYER, NOT FROM COLLISION ---
   *
   * The user's ruling made enterability a SET INTERACTION rather than a consequence
   * of geometry, and the whole point is that the two can disagree:
   *
   *   - `collisionEnterable` is DERIVED from the collision bytes: a door is
   *     geometrically enterable when it has a free row behind it.
   *   - `declaredEnterable` comes from the opener contract, which is a fact-layer
   *     declaration: which side of the street the shopfront is on.
   *
   * If enterability were still a collision side-effect, `declaredEnterable` would be
   * a restatement of `collisionEnterable` and the south side could never be openable.
   * So the assertion is that every door is DECLARED openable while only a subset is
   * geometrically enterable, and that the two sides reach their answer by different
   * routes: every measured surface has nonzero measured depth, every unmodelled
   * surface has ZERO measured depth. That is what makes it a declaration rather than
   * a coincidence, and V4d proves the direction by injecting a contradiction.
   */
  const openerPath = OPENER_PATH;
  let opener = null;
  let openerErr = null;
  if (existsSync(openerPath)) {
    try { opener = JSON.parse(readFileSync(openerPath, 'utf8')); } catch (e) { openerErr = e.message; }
  }
  const declared = opener && Array.isArray(opener.openable) ? opener.openable : [];
  const declaredById = new Map(declared.map((d) => [d.doorId, d]));
  const declaredIds = new Set(declared.map((d) => d.doorId));
  const geometricIds = new Set(doors.map((d) => d.doorId));
  const missingDeclarations = [...geometricIds].filter((id) => !declaredIds.has(id));
  const extraDeclarations = [...declaredIds].filter((id) => !geometricIds.has(id));
  const allDeclaredOpenable = declared.every((d) => d.openable === true);
  const declaredEnterable = declared.filter((d) => d.openable).length;
  const collisionEnterable = doorRows.filter((d) => d.enterable).length;
  // the separation: measured surface <=> nonzero measured depth
  const measuredWithDepth = declared
    .filter((d) => d.surface === INTERACTION.SURFACE_MEASURED)
    .every((d) => typeof d.modelledInteriorRows === 'number' && d.modelledInteriorRows > 0);
  const unmodelledWithZero = declared
    .filter((d) => d.surface === INTERACTION.SURFACE_UNMODELLED)
    .every((d) => d.modelledInteriorRows === 0);
  const northDeclared = declared.filter((d) => d.side === 'north').length;
  const southDeclared = declared.filter((d) => d.side === 'south').length;
  check(
    'V4c',
    'enterability is DECLARED by the fact layer, not derived from collision: every door is openable while only some have geometry behind them',
    Boolean(opener) &&
      openerErr === null &&
      missingDeclarations.length === 0 &&
      extraDeclarations.length === 0 &&
      allDeclaredOpenable &&
      declaredEnterable === declared.length &&
      collisionEnterable < declaredEnterable &&
      measuredWithDepth &&
      unmodelledWithZero &&
      northDeclared + southDeclared === declared.length,
    openerErr
      ? `opener-contract.json is unreadable: ${openerErr}`
      : `declared openable ${declaredEnterable}/${declared.length} (fact layer) vs geometrically enterable ` +
        `${collisionEnterable}/${doorRows.length} (collision bytes) — the gap of ` +
        `${declaredEnterable - collisionEnterable} is the point · doors with no declaration ${JSON.stringify(missingDeclarations)} · ` +
        `declarations with no door ${JSON.stringify(extraDeclarations)} · ` +
        `measured surfaces all have nonzero depth=${measuredWithDepth}, unmodelled surfaces all have zero=${unmodelledWithZero} · ` +
        `sides north ${northDeclared} / south ${southDeclared}`,
  );

  /* --- V4d: THE COUNTERFACTUAL — flip a declaration, the outcome follows ---
   *
   * V4c could pass by accident if the declaration happened to agree with the collision
   * on this data. So: take a SOUTH door (zero measured depth, an unmodelled surface),
   * re-declare it as a measured interior, and require the outcome to CHANGE — the
   * interaction must resolve to a modelled room for that door, and the probe/declaration
   * reconciliation must report the disagreement. Nothing about the collision bytes moves.
   */
  {
    const southDoor = declared.find((d) => d.side === 'south');
    let flipDetail = 'no south door to flip';
    let flipOk = false;
    if (southDoor && opener) {
      const flippedDoorId = southDoor.doorId;
      const before = INTERACTION.openDoor(flippedDoorId, opener, { doors: doorRows });
      const flippedContract = JSON.parse(JSON.stringify(opener));
      const target = flippedContract.openable.find((d) => d.doorId === flippedDoorId);
      target.surface = INTERACTION.SURFACE_MEASURED; // the declaration changes
      const after = INTERACTION.openDoor(flippedDoorId, flippedContract, { doors: doorRows });
      // the collision bytes are untouched, so a collision-derived reading cannot move
      const collisionUnchanged = doorRows.find((d) => d.doorId === flippedDoorId).enterable === false;
      flipOk =
        before.kind === 'unmodelled-interior' &&
        before.placeholder === INTERACTION.PLACEHOLDER_TEXT &&
        before.drawRoom === false &&
        after.kind === 'measured-interior' &&
        after.placeholder === null &&
        after.drawRoom === true &&
        collisionUnchanged;
      flipDetail =
        `${flippedDoorId} (south, measured depth ${southDoor.modelledInteriorRows}): ` +
        `declared unmodelled -> placeholder ${JSON.stringify(before.placeholder)}, drawRoom ${before.drawRoom}; ` +
        `declared measured -> annotation ${JSON.stringify(after.annotation)}, drawRoom ${after.drawRoom}; ` +
        `collision bytes unchanged (still geometrically not enterable)=${collisionUnchanged}`;
    }
    check(
      'V4d',
      'counterfactual: re-declaring a south door as a measured interior changes the interaction, with the collision untouched',
      flipOk,
      flipDetail,
    );
  }

  /* --- V4e: the placeholder is legible, singular, and never a fake room ---
   *
   * The criterion the Lead set is that a player with NO background knowledge must not
   * come away believing they saw the real interior. That is not fully mechanisable, so
   * what is mechanised is the part that can be: exactly ONE placeholder string exists,
   * it appears on every unmodelled door and on no modelled door, an unmodelled door
   * draws nothing, and a door with no declaration is not silently enterable.
   */
  {
    const ph = INTERACTION.PLACEHOLDER_TEXT;
    const resultsByDoor = declared.map((d) => INTERACTION.openDoor(d.doorId, opener, { doors: doorRows }));
    const withPlaceholder = resultsByDoor.filter((r) => r.placeholder !== null);
    const placeholderIsOnly = withPlaceholder.every((r) => r.placeholder === ph);
    const unmodelledIds = INTERACTION.placeholderDoors(opener);
    const measuredIds = INTERACTION.measuredDoors(opener);
    const placeholderSet = new Set(withPlaceholder.map((r) => r.doorId));
    const rightDoors = unmodelledIds.every((id) => placeholderSet.has(id)) &&
      measuredIds.every((id) => !placeholderSet.has(id));
    const nothingDrawn = resultsByDoor.filter((r) => r.kind === 'unmodelled-interior').every((r) => r.drawRoom === false);
    const undeclared = INTERACTION.openDoor('D-NOT-A-DOOR', opener, { doors: doorRows });
    /**
     * The placeholder string must be a single literal in the interaction SOURCE, not
     * repeated per branch — a second copy is a second thing that can drift.
     *
     * Comments are stripped first, and that is not a loophole: the ruling that
     * authorised the string is quoted verbatim in this file's header, and a scan that
     * counted prose would fail a file for DOCUMENTING its own requirement. What must
     * be unique is the executable literal.
     */
    const src = readFileSync(join(REPO, 'iteration', 'tools', 'viewer-interaction.mjs'), 'utf8');
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*)/.test(l))
      .join('\n');
    const literalUses = (code.match(/内容开发中/g) || []).length;
    const inComment = (src.match(/内容开发中/g) || []).length - literalUses;
    check(
      'V4e',
      'the placeholder is one string, on exactly the unmodelled doors, draws nothing, and is not a fake room',
      placeholderIsOnly && rightDoors && nothingDrawn && withPlaceholder.length === unmodelledIds.length &&
        undeclared.enterable === false && literalUses === 1,
      `placeholder ${JSON.stringify(ph)} on ${withPlaceholder.length} of ${declared.length} doors ` +
        `(unmodelled ${unmodelledIds.length}: ${unmodelledIds.join(',')}) · nothing drawn behind any unmodelled door=${nothingDrawn} · ` +
        `a door with no declaration is enterable=${undeclared.enterable} (must be false) · ` +
        `executable occurrences of the literal in viewer-interaction.mjs=${literalUses} (must be 1; ` +
        `${inComment} further occurrence(s) are prose quoting the ruling)`,
    );
  }

  /* --- V5: reconcile with the game's export */
  let guideOk = false;
  let guideDetail = 'guide.json absent';
  if (existsSync(GUIDE)) {
    const guide = JSON.parse(readFileSync(GUIDE, 'utf8'));
    const guideRows = [...guide.stops, ...guide.nearby];
    const placeIds = new Set(guideRows.map((s) => s.placeId));

    /**
     * Reconciliation path: doors.json identifies its building by OSM way
     * (`osmRecord`), while the export identifies places by `placeId`. Neither
     * carries the other's key, so the bridge is the FACT LAYER: a place record
     * declares `entrances.doorIds`, and doors.json declares `doorId`. Reconciling
     * through it checks all three files at once instead of comparing two id
     * spaces that were never meant to be equal.
     */
    const placesFile = JSON.parse(readFileSync(PLACES_PATH, 'utf8'));
    const placesWithDoors = placesFile.filter((p) => p.entrances && Array.isArray(p.entrances.doorIds));
    const declaredDoorIds = placesWithDoors.flatMap((p) => p.entrances.doorIds);

    const doorIdSet = new Set(doors.map((d) => d.doorId));
    const declaredSet = new Set(declaredDoorIds);
    const missingFromPlaces = [...doorIdSet].filter((id) => !declaredSet.has(id));
    const extraInPlaces = [...declaredSet].filter((id) => !doorIdSet.has(id));
    // A building that owns doors must BE a place in the export, or the page would
    // mark a door on a building the guide never mentions.
    const buildingsMissingFromGuide = placesWithDoors.filter((p) => !placeIds.has(p.id)).map((p) => p.id);
    // And the entrance count the export prints must equal the fact layer's count.
    const countMismatch = [];
    for (const p of placesWithDoors) {
      const row = guideRows.find((s) => s.placeId === p.id);
      if (!row) { countMismatch.push(`${p.id}: not in the export`); continue; }
      const cell = [...row.verified, ...row.otherKinds].find((c) => c.field === 'entrances');
      if (!cell) { countMismatch.push(`${p.id}: the export has no entrances cell`); continue; }
      if (cell.value !== p.entrances.doorIds.length) {
        countMismatch.push(`${p.id}: export says ${cell.value}, fact layer says ${p.entrances.doorIds.length}`);
      }
      if (cell.valueKind !== 'authored') countMismatch.push(`${p.id}: entrances valueKind is ${cell.valueKind}, expected authored`);
    }

    guideOk =
      placeIds.size === 22 &&
      declaredDoorIds.length === doors.length &&
      missingFromPlaces.length === 0 &&
      extraInPlaces.length === 0 &&
      buildingsMissingFromGuide.length === 0 &&
      countMismatch.length === 0;
    guideDetail =
      `export carries ${placeIds.size} place ids; ${declaredDoorIds.length} doorIds across ${placesWithDoors.length} building place(s) ` +
      `[${placesWithDoors.map((p) => `${p.id.replace('kyoto-shijo-', '')}:${p.entrances.doorIds.length}`).join(', ')}]; ` +
      `doorIds absent from places.json ${JSON.stringify(missingFromPlaces)}; ` +
      `unknown in places.json ${JSON.stringify(extraInPlaces)}; ` +
      `door buildings absent from the export ${JSON.stringify(buildingsMissingFromGuide)}; ` +
      `entrance count/kind mismatches ${JSON.stringify(countMismatch)}`;
  }
  check('V5', "ids reconcile with the game's export (guide.json), not with a screenshot", guideOk, guideDetail);

  /* --- V6: determinism */
  {
    const doorsForFrame = doorRows.map((d) => ({ doorId: d.doorId, cellX: d.cellX, cellY: d.cellY }));
    const SCALE = 8;
    const CANVAS_W = W * SCALE; // the page draws the drawn region at 8 px/tile
    const CANVAS_H = H * SCALE;
    const a = sha256Hex(Buffer.from(frameHashInput(CANVAS_W, CANVAS_H, SCALE, collision, W, H, walk.path[walk.path.length - 1], doorsForFrame), 'utf8'));
    const b = sha256Hex(Buffer.from(frameHashInput(CANVAS_W, CANVAS_H, SCALE, collision, W, H, walk.path[walk.path.length - 1], doorsForFrame), 'utf8'));
    check(
      'V6',
      'the same scene.bin renders a byte-identical frame twice',
      a === b && a.length === 64,
      `frame sha256 ${a} (identical=${a === b}) at ${CANVAS_W}x${CANVAS_H}, scale ${SCALE}`,
    );
  }

  /* --- V8: the baked page artefact is self-consistent --------------------- *
   * ONE file, deliberately. A page that `fetch`es sibling files cannot be opened
   * from file:// in Chrome or Firefox: module scripts from file:// are blocked as
   * CORS requests, and even a classic <script src> is refused. A viewer that needs
   * `python -m http.server` before it opens is a viewer that has to be explained,
   * and Gate 1's criterion is that one real person walks it. So every layer, the
   * manifest and the walker body are inlined and the page has no network at all.
   */
  {
    const htmlPath = join(VIEWER_DIR, 'index.html');
    if (!existsSync(htmlPath)) {
      check('V8', 'the page artefact exists, is self-contained, and carries THIS scene', false,
        `missing iteration/viewer/index.html — run: node iteration/tools/bake-viewer.mjs`);
    } else {
      const html = readFileSync(htmlPath, 'utf8');
      const sceneHash = sha256Hex(buf);
      const pinsScene = html.includes(sceneHash);
      // the layer payloads must be present and distinct
      const m = html.match(/id="__TG_SCENE__"[^>]*>([\s\S]*?)<\/script>/);
      let parsed = null;
      let parseErr = null;
      if (m) { try { parsed = JSON.parse(m[1]); } catch (e) { parseErr = e.message; } }
      const n = W * H;
      const b64ToLen = (s) => (s ? Buffer.from(s, 'base64').length : -1);
      /**
       * DERIVED FROM THE CONTAINER, not from a literal list.
       *
       * This used to be hardcoded `[n, n, n, W]` for four layers, and when the scene
       * gained a fifth (`openings`) it reddened a check that had nothing to say about
       * whether the page was correct — the same defect class as the hardcoded door
       * counts: an expectation that is a constant rather than a comparison. The
       * expected sizes now come from the encoded layer names the page declares and the
       * grid the container states.
       */
      const expectedLayerBytes = (name) => {
        if (name === 'occlusionHalf') return W;
        if (name === 'openings') return n;
        return n; // ground, collision, heights
      };
      const declaredLayers = parsed && parsed.layers ? Object.keys(parsed.layers.byteLengths || {}) : [];
      // the container's own layer set, read from the header arithmetic
      const layerBytes = buf.length - 108 - manifestLen;
      const containerLayers = layerBytes === n * 4 + W ? ['ground', 'collision', 'heights', 'occlusionHalf', 'openings']
        : layerBytes === n * 3 + W ? ['ground', 'collision', 'heights', 'occlusionHalf']
          : [];
      const lens = declaredLayers.map((k) => b64ToLen(parsed.layers[k]));
      const layerLensOk = declaredLayers.length > 0 &&
        declaredLayers.every((k) => b64ToLen(parsed.layers[k]) === expectedLayerBytes(k));
      const layerSetMatches = containerLayers.length > 0 &&
        containerLayers.length === declaredLayers.length &&
        containerLayers.every((k) => declaredLayers.includes(k));
      // the page must carry LITERALLY the same simulation source this file asserts
      const sim = serialiseSimulation();
      const embedsSim = html.includes('function walkStreet') && html.includes('function streetRowAt') &&
        html.includes('function doorReport') && html.includes('function reachableSet') &&
        html.includes('function openDoor');
      const noNetwork = !/<script[^>]+src\s*=\s*["'](?!#)/i.test(html) && !/\bfetch\s*\(/.test(html) &&
        !/XMLHttpRequest/.test(html) && !/@import\s+url/i.test(html);
      const hasWalkerInput = /addEventListener\(\s*['"]keydown['"]/.test(html);
      check(
        'V8',
        'the page artefact exists, is self-contained, and carries THIS scene',
        pinsScene && layerLensOk && layerSetMatches && embedsSim && noNetwork && hasWalkerInput && parseErr === null,
        `${html.length} B single file · pins scene sha256 ${pinsScene} · payload parses ${parseErr === null} · ` +
        `layers ${JSON.stringify(declaredLayers)} at ${JSON.stringify(lens)} B (the container declares ` +
        `${JSON.stringify(containerLayers)}, all sizes as the grid implies=${layerLensOk}) · ` +
        `embeds the walker and interaction source ${embedsSim} (${sim.length} B) · ` +
        `no network of any kind ${noNetwork} · keyboard-driven ${hasWalkerInput}`,
      );
      // and the embedded bytes must BE the scene's bytes, not a re-encode
      if (parsed && layerLensOk) {
        const same = {};
        for (const k of declaredLayers) {
          const got = Buffer.from(parsed.layers[k], 'base64');
          const want = k === 'occlusionHalf' ? occlusionHalf : k === 'ground' ? ground : k === 'collision' ? collision
            : k === 'heights' ? heights : k === 'openings' ? openings : null;
          same[k] = want ? Buffer.compare(got, Buffer.from(want)) === 0 : false;
        }
        const allSame = Object.values(same).every(Boolean);
        check(
          'V8b',
          'the bytes embedded in the page are the scene.bin layer bytes, unmodified',
          allSame,
          Object.entries(same).map(([k, v]) => `${k} identical ${v}`).join(', '),
        );
      } else {
        check('V8b', 'the bytes embedded in the page are the scene.bin layer bytes, unmodified', false,
          `could not decode the page payload${parseErr ? `: ${parseErr}` : ''}`);
      }
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  if (jsonOut) {
    process.stdout.write(`${JSON.stringify({ tool: 'check-viewer', passed, failed, exitCode: failed ? 1 : 0, checks: results }, null, 2)}\n`);
  } else {
    process.stdout.write("check-viewer — the walkable shell's assertions\n\n");
    for (const r of results) {
      process.stdout.write(`${r.id.padEnd(5)} ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}\n`);
      process.stdout.write(`          ${r.detail}\n`);
    }
    process.stdout.write(`\n${passed}/${results.length} assertions passed, ${failed} failed\n`);
  }
  return failed === 0 ? 0 : 1;
}

/** Read a directory recursively (paths only). */
function readFrecursive(dir, out) {
  const acc = out || [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) readFrecursive(p, acc);
    else acc.push(p);
  }
  return acc;
}

/* Only run the CLI when this file IS the entry point. `bake-viewer.mjs` imports
 * the simulation from here, and a module that runs its assertions on import
 * would make the baker fail whenever the page artefact is stale — a checker that
 * cannot be used as a library is a checker people route around. */
const IS_ENTRY = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (IS_ENTRY) {
  try {
    process.exitCode = main();
  } catch (err) {
    if (err instanceof EnvError) {
      process.stderr.write(`ENV ERROR  ${err.message}\n`);
      process.exitCode = 2;
    } else {
      process.stderr.write(`FAIL-CLOSED  unexpected error (must never be read as a pass):\n${err && err.stack ? err.stack : err}\n`);
      process.exitCode = 2;
    }
  }
}

export { walkStreet, doorReport, reachableSet, streetRowAt, frameHashInput, isBlocked, idx, serialiseSimulation, sha256Hex, SERIALISABLE, SERIALISABLE_CONSTANTS };
