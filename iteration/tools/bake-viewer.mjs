#!/usr/bin/env node
/**
 * bake-viewer.mjs — build `iteration/viewer/index.html`: the walkable shell.
 *
 * WHAT IT EMITS, AND WHY IT IS ONE FILE
 * -------------------------------------
 * A single self-contained HTML page with no network access of any kind. That is
 * not tidiness, it is the requirement: Chrome and Firefox refuse to load a module
 * script from `file://` (it is treated as a CORS request), and even a classic
 * `<script src="…">` is refused. A viewer that needs `python -m http.server`
 * before it opens is a viewer someone has to explain, and Gate 1's criterion is
 * that ONE REAL PERSON walks it. So the four layers, the manifest, the street
 * profile, the doors and the walker are all inlined.
 *
 * THE WALKER ON THE PAGE IS NOT A COPY
 * ------------------------------------
 * The simulation functions are serialised out of `check-viewer.mjs` with
 * `.toString()` and re-evaluated in the page. The browser therefore runs the same
 * function BODIES that the headless assertions check. A hand-written second copy
 * would be a second source of truth, and this project has already paid for one of
 * those (D-12: the valueKind enum mirrored into doors.json went stale).
 *
 * The layers ship as base64 because the payload has to survive living inside a
 * `<script>` tag. The obvious optimisation — one JSON object with a small numeric
 * alphabet — needs a character like `<` or a quote in that alphabet and then the
 * payload can terminate the tag early. Base64's alphabet is [A-Za-z0-9+/=], which
 * cannot appear in `</script>`, and the trailing `=` padding is trimmed here and
 * restored on decode.
 *
 * USAGE
 *   node iteration/tools/bake-viewer.mjs            bake
 *   node iteration/tools/bake-viewer.mjs --bake-if-absent   bake scene.bin first
 *
 * Exit codes: 0 = baked, 1 = a problem, 2 = environment (no scene.bin).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { SCENE_VERSION, SCENE_MAGIC } from './emit-scene.mjs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  walkStreet, doorReport, reachableSet, streetRowAt, frameHashInput, isBlocked, idx,
  serialiseSimulation, sha256Hex,
} from './check-viewer.mjs';

const REPO = resolve(import.meta.dirname, '..', '..');
const SCENE = join(REPO, 'build', 'scene.bin');
const GUIDE = join(REPO, 'build', 'guide.json');
const DOORS = join(REPO, 'city-packs', 'kyoto-shijo', 'doors.json');
const OUT_DIR = join(REPO, 'iteration', 'viewer');
const OUT = join(OUT_DIR, 'index.html');

const { worldGrid, GRID, ORIGIN } = await import(
  new URL('../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', import.meta.url).href
);

function die(code, msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

/* ------------------------------------------------------------------ *
 * Read the scene. FAIL LOUDLY: build/ is gitignored, so a clean clone has
 * no scene.bin and this must say exactly what to run rather than emit a
 * page that silently renders nothing.
 * ------------------------------------------------------------------ */
if (!existsSync(SCENE)) {
  if (!process.argv.includes('--bake-if-absent')) {
    die(2,
      `no scene.bin at ${SCENE}\n` +
      `  build/ is gitignored, so a clean clone has none.\n` +
      `  run: node iteration/tools/emit-scene.mjs    (or pass --bake-if-absent)`);
  }
  const r = spawnSync(process.execPath, [join(REPO, 'iteration', 'tools', 'emit-scene.mjs')], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) die(2, `could not bake the scene (exit ${r.status}): ${((r.stdout || '') + (r.stderr || '')).slice(-500)}`);
}
if (!existsSync(GUIDE)) {
  die(2,
    `no guide.json at ${GUIDE}\n` +
    `  the walk must be reconciled against the game's EXPORT, and the export is guide.json.\n` +
    `  run: node iteration/tools/emit-guide.mjs`);
}

const buf = readFileSync(SCENE);
const W = buf.readUInt32LE(12);
const H = buf.readUInt32LE(16);
const manifestLen = buf.readUInt32LE(104);
const manifest = JSON.parse(buf.toString('utf8', 108, 108 + manifestLen));
const o = 108 + manifestLen;
const n = W * H;
const ground = buf.subarray(o, o + n);
const collision = buf.subarray(o + n, o + 2 * n);
const heights = buf.subarray(o + 2 * n, o + 3 * n);
const occlusionHalf = buf.subarray(o + 3 * n, o + 3 * n + W);
const openings = buf.subarray(o + 3 * n + W, o + 4 * n + W);

// Re-assert the container here rather than trusting it: this baker is a fourth
// reader, and a fourth reader that assumes is a fourth chance to be wrong.
if (buf.toString('ascii', 0, 8) !== SCENE_MAGIC || buf.readUInt32LE(8) !== SCENE_VERSION ||
    W !== worldGrid.wTiles || H !== worldGrid.hTiles ||
    108 + manifestLen + (n * 4 + W) !== buf.length) {
  die(1, `scene.bin does not match the frozen contract header (${W}x${H}, manifest ${manifestLen}, ${buf.length} B)`);
}

const SCENE_SHA = sha256Hex(buf);
const profile = manifest.street ? manifest.street.profile : null;
if (!profile) die(1, 'scene manifest carries no street.profile — the walker cannot know where the street is');

const doorsFile = JSON.parse(readFileSync(DOORS, 'utf8'));
const doors = doorsFile.doors;
const guide = JSON.parse(readFileSync(GUIDE, 'utf8'));

/* ------------------------------------------------------------------ *
 * Run the walk and the door analysis HERE, so the page opens showing a
 * correct, already-verified state instead of an empty canvas.
 * ------------------------------------------------------------------ */
const reached = reachableSet(collision, W, H, 0);
const walk = walkStreet(profile, collision, W, H, GRID.halfCrossTiles, {});
const doorsReport = doorReport(doors, profile, collision, W, H, GRID.halfCrossTiles, reached);

const placeById = new Map();
for (const s of [...guide.stops, ...guide.nearby]) placeById.set(s.placeId, s);
// doors.json names its building by OSM way; the bridge to the export is the fact
// layer's entrances.doorIds (the same bridge check-viewer.mjs V5 walks).
const placesFile = JSON.parse(readFileSync(join(REPO, 'city-packs', 'kyoto-shijo', 'places.json'), 'utf8'));
const doorToPlace = new Map();
for (const p of placesFile) {
  if (!p.entrances || !Array.isArray(p.entrances.doorIds)) continue;
  for (const id of p.entrances.doorIds) doorToPlace.set(id, p.id);
}

const doorMarkers = doorsReport.map((d) => {
  const placeId = doorToPlace.get(d.doorId) || null;
  const place = placeId ? placeById.get(placeId) : null;
  return {
    ...d,
    placeId,
    placeNameJa: place ? place.nameJa : null,
    inGuide: Boolean(place),
  };
});

/* ------------------------------------------------------------------ *
 * Layers -> base64 with trailing '=' trimmed ('=' cannot be trusted to
 * survive some editors; the length is in the payload, so it is restored).
 * ------------------------------------------------------------------ */
const b64 = (view) => Buffer.from(view).toString('base64').replace(/=+$/, '');

const payload = {
  schema: 'tourguide.viewer-scene/v1',
  scene: {
    path: 'build/scene.bin',
    sha256: SCENE_SHA,
    bytes: buf.length,
    grid: { wTiles: W, hTiles: H },
    chunksAlongX: buf.readUInt32LE(20),
    origin: { lonUdeg: ORIGIN.lonUdeg, latUdeg: ORIGIN.latUdeg },
    contractHash: buf.toString('ascii', 40, 104),
  },
  halfCrossTiles: GRID.halfCrossTiles,
  street: { driftSpanM: manifest.street.driftSpanM, profile },
  layers: {
    encoding: 'base64, trailing = trimmed',
    byteLengths: { ground: n, collision: n, heights: n, occlusionHalf: W },
    ground: b64(ground),
    collision: b64(collision),
    heights: b64(heights),
    occlusionHalf: b64(occlusionHalf),
  },
  doors: doorMarkers,
  walk: {
    reachedX: walk.reachedX,
    steps: walk.steps,
    corrections: walk.corrections,
    stoppedAt: walk.stoppedAt,
    startRow: walk.path.length ? walk.path[0].row : null,
    endRow: walk.path.length ? walk.path[walk.path.length - 1].row : null,
    path: walk.path,
  },
  guide: {
    path: 'build/guide.json',
    schema: guide.schema,
    stopCount: guide.stops.length,
    nearbyCount: guide.nearby.length,
    placeCount: guide.stops.length + guide.nearby.length,
    // only what the overlay needs, so the page cannot become a second export
    stops: guide.stops.map((s) => ({ seq: s.seq, placeId: s.placeId, nameJa: s.nameJa, nameZh: s.nameZh, alongStreetM: s.alongStreetM })),
  },
};

/* ------------------------------------------------------------------ *
 * The page. Plain HTML + one classic <script>. No imports, no fetch.
 * ------------------------------------------------------------------ */
const simSource = serialiseSimulation();

const html = `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<title>四条通 — walkable shell (Gate 1)</title>
<style>
  :root { --ink:#16161D; --paper:#F6F2EA; --ok:#1F6B3A; --warn:#8A5A00; --unknown:#6B6B6B; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--ink);
         font:13px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  header { padding:9px 14px; border-bottom:1px solid #d8d2c4; display:flex; gap:16px; flex-wrap:wrap; align-items:baseline; }
  header h1 { font-size:15px; margin:0; font-weight:700; }
  header .k { color:var(--unknown); }
  #hud { background:rgba(246,242,234,.95); padding:6px 14px; border-bottom:1px solid #d8d2c4; }
  .pill { display:inline-block; padding:1px 6px; border:1px solid #d8d2c4; border-radius:2px; margin-right:6px; }
  .ok { color:var(--ok); } .warn { color:var(--warn); } .dim { color:var(--unknown); }
  #scroll { padding:12px 14px; }
  canvas { display:block; border:1px solid #d8d2c4; background:#fff; max-width:100%; }
  table { border-collapse:collapse; margin-top:10px; font-size:12px; }
  td, th { border:1px solid #d8d2c4; padding:2px 7px; text-align:left; }
  th { background:#efe9dc; }
</style>
</head>
<body>
<header>
  <h1>四条通 — walkable shell</h1>
  <span><span class="k">scene</span> ${SCENE_SHA.slice(0, 16)}…</span>
  <span><span class="k">contract</span> ${payload.scene.contractHash.slice(0, 16)}…</span>
  <span><span class="k">grid</span> ${W}×${H}</span>
</header>
<div id="hud">
  <span class="pill">↑ ↓ ← → / WASD walk</span>
  <span class="pill">[ ] zoom</span>
  <span class="pill dim">green = walkable · dark = collision · grey = building footprint · red = door</span>
</div>
<div id="scroll">
  <canvas id="c"></canvas>
  <div id="pos"></div>
  <div id="legend"></div>
</div>

<script id="__TG_SCENE__" type="application/json">${JSON.stringify(payload)}</script>
<script>
(function () {
  'use strict';
  var PAYLOAD = JSON.parse(document.getElementById('__TG_SCENE__').textContent);

  /* --- decode the frozen layers ------------------------------------- */
  function b64view(s, expectedLen) {
    var pad = (4 - (s.length % 4)) % 4;
    var bin = atob(s + Array(pad + 1).join('='));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    if (expectedLen !== undefined && out.length !== expectedLen) {
      throw new Error('layer length ' + out.length + ' but the payload declares ' + expectedLen);
    }
    return out;
  }
  var W = PAYLOAD.scene.grid.wTiles, H = PAYLOAD.scene.grid.hTiles;
  var L = PAYLOAD.layers.byteLengths;
  var ground = b64view(PAYLOAD.layers.ground, L.ground);
  var collision = b64view(PAYLOAD.layers.collision, L.collision);
  var heights = b64view(PAYLOAD.layers.heights, L.heights);
  var occlusionHalf = b64view(PAYLOAD.layers.occlusionHalf, L.occlusionHalf);

  /* --- THE simulation, serialised out of check-viewer.mjs -------------
     Same function bodies the headless assertions ran against. Not a copy. */
  var SIM = ${simSource};

  /* --- the camera ----------------------------------------------------
     A 1.6 km street at 4 px/tile is a 6400x160 sliver: technically a render,
     useless for walking. The camera shows a WINDOW of the corridor at a readable
     scale and follows the walker. This is not "game feel" — it is the difference
     between the page showing the geometry and the page showing a line. */
  var ZOOMS = [2, 4, 8, 16, 32];
  var zoomIdx = 3;                     // 16 px/tile
  var VIEW_TILES_X = 96, VIEW_TILES_Y = 40;

  function scale() { return ZOOMS[zoomIdx]; }
  function camTop() { return 0; }      // the corridor is exactly H tiles tall: no vertical scroll
  function camLeft() {
    var span = Math.min(VIEW_TILES_X, W);
    var left = walker.x - Math.floor(span / 2);
    if (left < 0) left = 0;
    if (left > W - span) left = W - span;
    return left;
  }

  var cv = document.getElementById('c');
  var ctx = cv.getContext('2d');
  var img = null, imgW = 0, imgH = 0;

  function paint() {
    var S = scale();
    var span = Math.min(VIEW_TILES_X, W);
    var left = camLeft();
    var top = camTop();
    var pw = span * S, ph = VIEW_TILES_Y * S;
    if (cv.width !== pw || cv.height !== ph) {
      cv.width = pw; cv.height = ph;
      img = ctx.createImageData(pw, ph);
      imgW = pw; imgH = ph;
    }
    var d = img.data;
    for (var py = 0; py < ph; py++) {
      var r = top + ((py / S) | 0);
      for (var px = 0; px < pw; px++) {
        var x = left + ((px / S) | 0);
        var R, G, B;
        var i = r * W + x;
        if (r < 0 || r >= H || x < 0 || x >= W) { R = 255; G = 255; B = 255; }
        else if (collision[i]) { R = 60; G = 56; B = 62; }
        else if (ground[i]) { R = 214; G = 208; B = 194; }
        else { R = 246; G = 242; B = 234; }
        if (r >= 0 && r < H && x >= 0 && x < W && !collision[i] && heights[i] > 0) {
          R = 226 - Math.min(60, heights[i] * 2); G = 232 - Math.min(50, heights[i]); B = 210;
        }
        var o = (py * pw + px) * 4;
        d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = 255;
      }
    }
    // doors inside the window: a red tile plus a stem toward the street
    for (var k = 0; k < PAYLOAD.doors.length; k++) {
      var dr = PAYLOAD.doors[k];
      var dx0 = (dr.cellX - left) * S, dy0 = (dr.cellY - top) * S;
      if (dx0 < -S || dy0 < -S || dx0 > pw || dy0 > ph) continue;
      for (var yy = 0; yy < S; yy++) for (var xx = 0; xx < S; xx++) {
        var px2 = dx0 + xx, py2 = dy0 + yy;
        if (px2 < 0 || py2 < 0 || px2 >= pw || py2 >= ph) continue;
        var oo = (py2 * pw + px2) * 4;
        d[oo] = 200; d[oo + 1] = 30; d[oo + 2] = 30; d[oo + 3] = 255;
      }
      var dir = Math.sign(dr.cellY - dr.streetRow) || 1;
      for (var t = 1; t <= 2; t++) for (var sy = 0; sy < S; sy++) {
        var pxx = dx0 + ((S - 1) >> 1), pyy = (dr.cellY + dir * t - top) * S + sy;
        if (pxx < 0 || pyy < 0 || pxx >= pw || pyy >= ph) continue;
        var o3 = (pyy * pw + pxx) * 4;
        d[o3] = 220; d[o3 + 1] = 120; d[o3 + 2] = 120; d[o3 + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // the street's own centreline, the thing the walker follows
    ctx.strokeStyle = '#1F6B3A'; ctx.lineWidth = 1.5; ctx.beginPath();
    var started = false;
    for (var x2 = left; x2 <= left + span; x2++) {
      if (x2 < 0 || x2 >= W) continue;
      var row = SIM.streetRowAt(PAYLOAD.street.profile, PAYLOAD.halfCrossTiles, x2);
      if (row === null) continue;
      var cx = (x2 - left) * S + S / 2, cy = (row - top) * S + S / 2;
      if (!started) { ctx.moveTo(cx, cy); started = true; } else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    // trail + walker
    ctx.fillStyle = 'rgba(31,107,58,.30)';
    for (var i2 = 0; i2 < trail.length; i2++) {
      var tr = trail[i2];
      if (tr.x < left || tr.x > left + span) continue;
      ctx.fillRect((tr.x - left) * S, (tr.row - top) * S, S, S);
    }
    ctx.fillStyle = '#1F6B3A';
    ctx.fillRect((walker.x - left) * S + 1, (walker.row - top) * S + 1, S - 2, S - 2);
  }

  /* --- the walker --------------------------------------------------- */
  var walker = { x: PAYLOAD.walk.path.length ? PAYLOAD.walk.path[0].x : 0, row: PAYLOAD.walk.path[0].row };
  var trail = [];
  var refusals = 0;

  /** Try one step. Refuses if the destination is blocked — that IS the collision test. */
  function step(dx, dr) {
    var nx = walker.x + dx, nr = walker.row + dr;
    if (SIM.isBlocked(collision, nx, nr, W, H)) { refusals++; update(); return false; }
    walker.x = nx; walker.row = nr;
    trail.push({ x: nx, row: nr });
    if (trail.length > 2000) trail.shift();
    update();
    return true;
  }

  var KEYS = {
    ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
    d: [1, 0], a: [-1, 0], w: [0, -1], s: [0, 1]
  };
  window.addEventListener('keydown', function (e) {
    if (e.key === '[') { zoomIdx = Math.max(0, zoomIdx - 1); update(); e.preventDefault(); return; }
    if (e.key === ']') { zoomIdx = Math.min(ZOOMS.length - 1, zoomIdx + 1); update(); e.preventDefault(); return; }
    var lower = e.key && e.key.toLowerCase ? e.key.toLowerCase() : e.key;
    var k = KEYS[e.key] || KEYS[lower];
    if (!k) return;
    e.preventDefault();
    step(k[0], k[1]);
  });

  function update() {
    paint();
    document.getElementById('pos').textContent =
      'x=' + walker.x + ' of ' + (W - 1) + '  ·  row ' + walker.row + ' of ' + (H - 1) +
      '  ·  along-street ' + walker.x + ' m  ·  ' + scale() + ' px/tile' +
      '  ·  steps ' + trail.length + '  ·  refused (wall) ' + refusals +
      '  ·  this tile collision=' + collision[walker.row * W + walker.x];
  }

  /* --- the overlay the assertions describe --------------------------- */
  var enterable = 0, reachable = 0;
  var rows = ['<table><tr><th>door</th><th>cell</th><th>street row</th><th>reachable</th><th>in a wall</th><th>free depth behind</th><th>enterable</th><th>guide place</th></tr>'];
  for (var q = 0; q < PAYLOAD.doors.length; q++) {
    var d2 = PAYLOAD.doors[q];
    if (d2.reachable) reachable++;
    if (d2.enterable) enterable++;
    rows.push('<tr><td>' + d2.doorId + '</td><td>' + d2.cellX + ',' + d2.cellY + '</td><td>' + d2.streetRow +
      '</td><td>' + (d2.reachable ? 'yes' : 'no') + '</td><td>' + (d2.inWall ? 'yes' : 'no') +
      '</td><td>' + d2.depthBehind + '</td><td class="' + (d2.enterable ? 'ok' : 'warn') + '">' +
      (d2.enterable ? 'yes' : 'no') + '</td><td>' + (d2.placeNameJa || d2.placeId || '<span class="dim">—</span>') + '</td></tr>');
  }
  rows.push('</table>');
  document.getElementById('legend').innerHTML =
    '<p><b>walk</b>: reached x=' + PAYLOAD.walk.reachedX + ' of ' + (W - 1) +
    ' in ' + PAYLOAD.walk.steps + ' steps, ' + PAYLOAD.walk.corrections + ' row correction(s); rows ' +
    PAYLOAD.walk.startRow + ' → ' + PAYLOAD.walk.endRow + '.' +
    ' The street drifts ' + PAYLOAD.street.driftSpanM + ' m, so the walker follows the profile, not a fixed row.</p>' +
    '<p><b>doors</b>: ' + reachable + ' of ' + PAYLOAD.doors.length + ' reachable from the street; ' +
    '<b class="warn">' + enterable + ' of ' + PAYLOAD.doors.length + ' enterable</b>' +
    ' (a doorway with a free tile behind it to step into). The doors are <code>authored</code>: nobody has observed them.</p>' +
    '<p><b>export</b>: ' + PAYLOAD.guide.placeCount + ' place ids reconciled from ' + PAYLOAD.guide.path +
    ' (' + PAYLOAD.guide.stopCount + ' route stops + ' + PAYLOAD.guide.nearbyCount + ' passed alongside).</p>' +
    rows.join('');
  update();

  // expose for a headless probe, and for a curious person with a console
  window.__TG = { walker: walker, step: step, refusals: function () { return refusals; },
                  SIM: SIM, collision: collision, isBlocked: SIM.isBlocked, W: W, H: H,
                  zoom: function () { return scale(); }, camLeft: camLeft };
})();
</script>
</body>
</html>
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, html, 'utf8');

const sha = sha256Hex(Buffer.from(html, 'utf8'));
const enterable = doorMarkers.filter((d) => d.enterable).length;
const reachableCount = doorMarkers.filter((d) => d.reachable).length;

const out = [];
out.push('bake-viewer — the walkable shell');
out.push(`  scene      : ${SCENE_SHA}  (${buf.length} B, ${W}x${H})`);
out.push(`  contract   : ${payload.scene.contractHash}`);
out.push(`  guide      : ${payload.guide.placeCount} place ids reconciled (${payload.guide.stopCount} stops + ${payload.guide.nearbyCount} alongside)`);
out.push(`  street     : drift ${payload.street.driftSpanM} m · rows ${payload.walk.startRow} -> ${payload.walk.endRow}`);
out.push(`  walk       : reached x=${payload.walk.reachedX} of ${W - 1} in ${payload.walk.steps} steps, ${payload.walk.corrections} correction(s)`);
out.push(`  doors      : ${reachableCount}/${doorMarkers.length} reachable · ${enterable}/${doorMarkers.length} enterable · all in a wall ${doorMarkers.every((d) => d.inWall)}`);
out.push(`  simulation : ${simSource.length} B serialised out of check-viewer.mjs (same bodies, not a copy)`);
out.push(`  page       : ${OUT}`);
out.push(`               ${html.length} B, single file, no network`);
out.push(`               sha256 ${sha}`);
out.push('');
out.push(`  open it    : Start-Process "${OUT}"      (Windows)`);
out.push(`               open "${OUT}"               (macOS)`);
out.push(`               xdg-open "${OUT}"           (Linux)`);
out.push('  no server is needed: every layer is inlined, so file:// works.');
process.stdout.write(`${out.join('\n')}\n`);
process.exitCode = 0;
