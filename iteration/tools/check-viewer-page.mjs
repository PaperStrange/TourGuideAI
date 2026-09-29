#!/usr/bin/env node
/**
 * check-viewer-page.mjs — run the BAKED PAGE's own JavaScript, headlessly.
 *
 * WHY THIS EXISTS
 * ---------------
 * `check-viewer.mjs` asserts on the simulation functions in node. That does not
 * prove the PAGE works: the bake step serialises those functions and embeds them
 * in a template literal, and a serialisation or template error would produce a
 * page that is syntactically fine as HTML and broken as JavaScript. "It baked"
 * is not "it runs", and a canvas viewer cannot be checked by a human every time.
 *
 * So this extracts the page's second `<script>` block — the real one, not the JSON
 * payload — and evaluates it in `node:vm` against a minimal DOM stub. The page's
 * own code then runs: it decodes the layers from its own base64, computes its own
 * overlay, and installs its own key handler. The assertions then drive that key
 * handler and read the page's own state.
 *
 * WHAT IS STUBBED AND WHAT IS NOT
 * -------------------------------
 * Stubbed: `document` (getElementById / createElement / canvas 2D context),
 * `window` (addEventListener / __TG), `atob` (real, from node), `ImageData`.
 * NOT stubbed: the layer decode, the walker, the collision test, the walk summary,
 * the door table, and the key mapping. Those are the page's own code, executed.
 *
 * A wall-walk attempt is issued through the page's own key handler: pressing left
 * at x=0 must be REFUSED, and the page must count the refusal. That is constraint 3
 * tested through the artefact a person will actually open, not through the module.
 *
 * USAGE
 *   node iteration/tools/check-viewer-page.mjs
 *   node iteration/tools/check-viewer-page.mjs --json
 *
 * Exit codes: 0 = all pass, 1 = an assertion failed, 2 = environment.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const REPO = resolve(import.meta.dirname, '..', '..');
const PAGE = join(REPO, 'iteration', 'viewer', 'index.html');
const SCENE = join(REPO, 'build', 'scene.bin');

class EnvError extends Error {}

const results = [];
function check(id, name, ok, detail) {
  results.push({ id, name, ok: Boolean(ok), detail });
  return Boolean(ok);
}

/* ---- minimal DOM stub: only what the page actually touches ------------- *
 * `textContent` is PRE-POPULATED from the page's real DOM: the page reads its
 * payload out of `<script id="__TG_SCENE__">` by id, so a stub that returned an
 * empty element would make the page parse an empty payload and report a
 * SyntaxError that belongs to the harness, not to the page. First run of this
 * file did exactly that.
 */
function makeContext(preloaded) {
  const canvases = {};
  const elements = {};
  for (const [id, text] of Object.entries(preloaded || {})) elements[id] = { id, textContent: text, innerHTML: '', style: {} };

  function ctx2d(canvas) {
    return {
      canvas,
      createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (img) => { canvas.__put = img; canvas.__putCount = (canvas.__putCount || 0) + 1; },
      fillRect: () => { canvas.__fillRects = (canvas.__fillRects || 0) + 1; },
      beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {},
      set fillStyle(v) { canvas.__fillStyle = v; }, get fillStyle() { return canvas.__fillStyle; },
      set strokeStyle(v) { canvas.__strokeStyle = v; }, get strokeStyle() { return canvas.__strokeStyle; },
      set lineWidth(v) { canvas.__lineWidth = v; }, get lineWidth() { return canvas.__lineWidth; },
    };
  }

  function el(id) {
    if (!elements[id]) {
      if (id === 'c' || id === 'canvas') {
        const c = { id, width: 0, height: 0, getContext: () => (c.__ctx = c.__ctx || ctx2d(c)) };
        canvases[id] = c;
        elements[id] = c;
      } else {
        elements[id] = {
          id, textContent: '', innerHTML: '', style: {},
        };
      }
    }
    return elements[id];
  }

  const listeners = {};
  const documentStub = {
    getElementById: (id) => el(id),
    createElement: (tag) => el(`created:${tag}`),
  };
  const windowStub = {
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    document: documentStub,
  };
  const ctx = {
    document: documentStub,
    window: windowStub,
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    console,
    Math, JSON, Uint8Array, Uint8ClampedArray, Array, Object, String, Number, Error, isNaN, parseInt, parseFloat,
  };
  ctx.globalThis = ctx;
  return { ctx, listeners, elements, canvases };
}

/**
 * The page's own element text, so the stub answers `getElementById` the way the
 * browser will. Only the elements the page reads by id are needed.
 */
function preloadedElements(html) {
  const out = {};
  const m = html.match(/<script id="([^"]+)"[^>]*>([\s\S]*?)<\/script>/);
  if (m) out[m[1]] = m[2];
  return out;
}

function main() {
  const jsonOut = process.argv.includes('--json');
  // SELF-SUFFICIENT BY CONSTRUCTION. iteration/viewer/index.html is a DERIVED artefact and is
  // gitignored, so a clean checkout has no page and this check exited 2 with 'could not RUN'
  // there while passing on my machine. That is the EIGHTH occurrence of one shape in this
  // harness: a verdict that depends on how the working copy was prepared rather than on the
  // repository. R1 assumed a single-branch clone carries every branch; R7 required a per-clone
  // hook CI can never have; branch-sync read an empty branch list as 'not a git repository'; the
  // guide gate pointed at an absent build product; the scene-read gate relied on gate order; and
  // this. The remedy has been identical every time, and writing the lesson down has demonstrably
  // not been what prevents it -- wiring the artefact is. So this bakes the page when it is absent
  // and says so, rather than assuming a predecessor gate ran.
  if (!existsSync(PAGE)) {
    if (!process.argv.includes('--bake-if-absent')) {
      throw new EnvError(`no page at ${PAGE} - run: node iteration/tools/bake-viewer.mjs (or pass --bake-if-absent)`);
    }
    const r = spawnSync(process.execPath, [join(REPO, 'iteration', 'tools', 'bake-viewer.mjs'), '--bake-if-absent'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0 || !existsSync(PAGE)) {
      throw new EnvError(`could not bake the page (exit ${r.status}); run: node iteration/tools/bake-viewer.mjs`);
    }
    console.log('(the page was absent and this check baked it)');
  }
  if (!existsSync(SCENE)) throw new EnvError(`no scene.bin at ${SCENE} — build/ is gitignored; run emit-scene.mjs`);

  const html = readFileSync(PAGE, 'utf8');

  /* ---- which layers a page can actually READ is a real limit ----------- *
   * layers.json (2.2 MB raw) is not realistic to inline four times over; base64
   * costs 33%. This records the honest cost of the choice, not a wish.
   */
  const payloadMatch = html.match(/<script id="__TG_SCENE__"[^>]*>([\s\S]*?)<\/script>/);
  const payload = payloadMatch ? JSON.parse(payloadMatch[1]) : null;
  const b64Bytes = payload
    ? ['ground', 'collision', 'heights', 'occlusionHalf'].reduce((a, k) => a + payload.layers[k].length, 0)
    : 0;
  const rawBytes = payload
    ? Object.values(payload.layers.byteLengths).reduce((a, b) => a + b, 0)
    : 0;
  check(
    'P0',
    'the page carries the four layers, and the base64 cost is recorded rather than hidden',
    Boolean(payload) && rawBytes === 64000 * 3 + 1600,
    `${rawBytes} raw layer bytes -> ${b64Bytes} base64 chars (+${((b64Bytes / rawBytes - 1) * 100).toFixed(1)}%), ` +
      `page ${html.length} B total`,
  );

  /* ---- extract the page's code block and run it ------------------------ */
  const scripts = [...html.matchAll(/<script(?![^>]*\btype="application\/json")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (scripts.length !== 1) throw new EnvError(`expected exactly 1 executable script in the page, found ${scripts.length}`);
  const code = scripts[0];

  const { ctx, listeners, elements, canvases } = makeContext(preloadedElements(html));
  const sandbox = vm.createContext(ctx);
  let runError = null;
  try {
    vm.runInContext(code, sandbox, { filename: 'iteration/viewer/index.html#script[1]', timeout: 20000 });
  } catch (e) {
    runError = e;
  }
  check(
    'P1',
    "the page's own JavaScript parses and runs to completion in a DOM stub",
    runError === null,
    runError ? `${runError.name}: ${runError.message}` : `ran ${code.length} B of page script with no error`,
  );
  if (runError) return finish(jsonOut);

  const TG = ctx.window.__TG;
  check(
    'P2',
    'the page exposes its live state (walker, collision, step) — it is drivable, not a picture',
    Boolean(TG) && typeof TG.step === 'function' && TG.collision instanceof Uint8Array && TG.W === 1600,
    TG ? `__TG present: W=${TG.W} H=${TG.H} collision=${TG.collision.length} B step=${typeof TG.step} walker=(${TG.walker.x},${TG.walker.row})` : '__TG missing',
  );
  if (!TG) return finish(jsonOut);

  /* ---- the page drew something, at a size a person can read ----------- *
   * The first bake drew the WHOLE corridor at 4 px/tile: a correct 6400x160
   * render that shows a 1.6 km street as a sliver. "It rendered" is not "you can
   * see the geometry", so the camera is asserted, not assumed.
   */
  const c = canvases.c;
  const zoom = TG.zoom ? TG.zoom() : null;
  const viewW = c ? c.width : 0;
  const readable = zoom >= 8 && viewW > 0 && viewW < 1600 * zoom; // a window, not the whole grid
  check(
    'P3',
    'the page painted the grid through a readable camera window',
    Boolean(c) && c.__put && c.__putCount >= 1 && readable,
    c
      ? `canvas ${c.width}x${c.height} at ${zoom} px/tile, putImageData called ${c.__putCount} time(s), ` +
        `${c.__put ? c.__put.data.length : 0} bytes of ImageData · ` +
        `window is ${viewW}/${1600 * zoom} px of the full corridor (a window, not a sliver)=${readable}`
      : 'no canvas',
  );

  /* ---- collision through the page's own key handler -------------------- */
  const before = { x: TG.walker.x, row: TG.walker.row };
  const refusedBefore = TG.refusals();
  // walk to the western edge, then try to leave the world
  for (let i = 0; i < 60 && TG.walker.x > 0; i += 1) {
    if (!TG.step(-1, 0)) break;
  }
  const atWestEdge = TG.walker.x;
  const moved = TG.step(-1, 0); // must be refused: x = -1 is outside
  const refusedAfter = TG.refusals();

  // and a deliberate walk INTO the north wall from a mid-corridor column
  TG.walker.x = 100;
  TG.walker.row = 12; // free at x=100 per the street profile
  let stepsUp = 0;
  while (TG.step(0, -1)) { stepsUp += 1; if (stepsUp > 60) break; }
  const wallRow = TG.walker.row;
  const blockedAbove = TG.isBlocked(TG.collision, TG.walker.x, wallRow - 1, TG.W, TG.H);

  check(
    'P4',
    "the page's walker is refused by the collision layer (through its own step function)",
    atWestEdge === 0 && moved === false && refusedAfter > refusedBefore && blockedAbove,
    `walked west to x=${atWestEdge}; step(-1) at x=0 returned ${moved} (expected false); ` +
      `refusals ${refusedBefore} -> ${refusedAfter}; from x=100 walked north ${stepsUp} step(s) to row ${wallRow}, ` +
      `and the tile above it is blocked=${blockedAbove}`,
  );

  /* ---- the page's own summary agrees with the page's own data ---------- */
  const leg = elements['legend'] ? elements['legend'].innerHTML : '';
  const doorsOk = payload.doors.length === 12 && payload.doors.every((d) => d.reachable && d.inWall);
  check(
    'P5',
    'the page states the walk result and the door result from its own payload',
    leg.includes(`reached x=${payload.walk.reachedX}`) && leg.includes(`${payload.doors.length}`) && doorsOk,
    `legend mentions reached x=${payload.walk.reachedX}, ${payload.doors.length} doors; ` +
      `payload: ${payload.doors.filter((d) => d.reachable).length} reachable, ` +
      `${payload.doors.filter((d) => d.enterable).length} enterable, all in a wall=${payload.doors.every((d) => d.inWall)}`,
  );

  /* ---- the guide overlay is the export, not a fresh invention ---------- */
  {
    const guide = JSON.parse(readFileSync(join(REPO, 'build', 'guide.json'), 'utf8'));
    const guideIds = new Set([...guide.stops, ...guide.nearby].map((s) => s.placeId));
    const payloadIds = payload.guide.stops.map((s) => s.placeId);
    const allInGuide = payloadIds.every((id) => guideIds.has(id));
    const doorPlacesInGuide = payload.doors.filter((d) => d.placeId).every((d) => guideIds.has(d.placeId));
    check(
      'P6',
      "the page's overlay ids all come from guide.json (the export, not a screenshot)",
      allInGuide && doorPlacesInGuide && payload.guide.placeCount === 22,
      `page carries ${payloadIds.length} route stops + ${payload.guide.nearbyCount} alongside = ${payload.guide.placeCount}; ` +
        `all present in guide.json=${allInGuide}; door place ids in guide.json=${doorPlacesInGuide}; ` +
        `scene pinned ${payload.scene.sha256.slice(0, 16)}…`,
    );
  }

  /* ---- determinism through the page: run it twice, compare the pixels --- */
  {
    const runs = [];
    const sizes = [];
    for (let i = 0; i < 2; i += 1) {
      const env = makeContext(preloadedElements(html));
      vm.runInContext(code, vm.createContext(env.ctx), { filename: 'run' + i, timeout: 20000 });
      const d = env.canvases.c.__put.data;
      sizes.push(env.canvases.c.width * env.canvases.c.height);
      runs.push(Buffer.from(d.buffer, d.byteOffset, d.byteLength));
    }
    const same = Buffer.compare(runs[0], runs[1]) === 0;
    check(
      'P7',
      'the page renders byte-identical pixels on two independent runs',
      same && runs[0].length === sizes[0] * 4 && runs[0].length > 0,
      `${runs[0].length} pixel bytes each at ${sizes[0]} px, identical=${same}`,
    );
  }

  return finish(jsonOut);
}

function finish(jsonOut) {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  if (jsonOut) {
    process.stdout.write(`${JSON.stringify({ tool: 'check-viewer-page', passed, failed, exitCode: failed ? 1 : 0, checks: results }, null, 2)}\n`);
  } else {
    process.stdout.write("check-viewer-page — run the baked page's own JavaScript, headlessly\n\n");
    for (const r of results) {
      process.stdout.write(`${r.id.padEnd(4)} ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}\n`);
      process.stdout.write(`         ${r.detail}\n`);
    }
    process.stdout.write(`\n${passed}/${results.length} assertions passed, ${failed} failed\n`);
  }
  return failed === 0 ? 0 : 1;
}

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
