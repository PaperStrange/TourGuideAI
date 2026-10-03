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
 *   node iteration/tools/check-viewer-page.mjs --page <path>   FIRE DRILL: check an
 *       ALTERNATE baked page, so an assertion whose expectation is a count can be shown
 *       to FOLLOW its input rather than redden. Same shape as
 *       `check-viewer.mjs --doors` and `validate-doors.mjs --doors`.
 *
 * Exit codes: 0 = all pass, 1 = an assertion failed, 2 = environment.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const REPO = resolve(import.meta.dirname, '..', '..');
const PAGE = (() => {
  const i = process.argv.indexOf('--page');
  return i >= 0 && process.argv[i + 1]
    ? resolve(process.argv[i + 1])
    : join(REPO, 'iteration', 'viewer', 'index.html');
})();
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
function makeContext(preloaded, hash) {
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
      closePath: () => {}, fill: () => {}, arc: () => {}, rect: () => {},
      clearRect: () => {}, save: () => {}, restore: () => {}, translate: () => {}, scale: () => {},
      fillText: () => {}, strokeText: () => {}, measureText: () => ({ width: 0 }),
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
          id, textContent: '', innerHTML: '', style: {}, value: '', className: '',
          /**
           * Elements carry their own listeners. The page has a BUTTON now (the key-log
           * export), and a stub without `addEventListener` fails the page at load with a
           * TypeError that belongs to the harness rather than to the page — the same shape
           * as the empty `textContent` that made the page parse an empty payload.
           */
          addEventListener: (type, fn) => {
            const k = `${id}:${type}`;
            (listeners[k] = listeners[k] || []).push(fn);
          },
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
    /* The variant is chosen by URL fragment (`index.html#V-B`), so the page reads
     * `location`. The stub supplies both, and a test can select a variant by setting
     * `ctx.location.hash` before evaluating. */
    location: { hash: hash || '', href: 'file:///index.html' + (hash || '') },
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    console,
    Math, JSON, Uint8Array, Uint8ClampedArray, Array, Object, String, Number, Error, isNaN, parseInt, parseFloat,
  };
  ctx.globalThis = ctx;
  /**
   * A second, independent context for the OTHER variant. P15 needs to run the same page with
   * a different URL fragment and compare the two, and the experiment is only valid if the two
   * runs share nothing: a reused DOM stub would let V-A's state leak into V-B's.
   */
  ctx.__makeSibling = (hash) => makeContext(preloaded, hash);
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
   *
   * EXPECTATIONS ARE DERIVED, NOT LITERAL. This check used to read
   * `rawBytes === 64000 * 3 + 1600`, i.e. the four-layer layout written out as
   * arithmetic; when the scene gained the `openings` layer it reddened a check
   * that had nothing to say about whether the page was correct. The expected total
   * now comes from the payload's OWN declared byte lengths — the same input the
   * check is validating.
   */
  const payloadMatch = html.match(/<script id="__TG_SCENE__"[^>]*>([\s\S]*?)<\/script>/);
  const payload = payloadMatch ? JSON.parse(payloadMatch[1]) : null;
  const declaredLengths = payload && payload.layers ? payload.layers.byteLengths : {};
  const layerNames = Object.keys(declaredLengths);
  const grid = payload ? payload.scene.grid : null;
  const n = grid ? grid.wTiles * grid.hTiles : 0;
  // every layer is either a full grid layer or the one-per-column occlusion layer
  const expectedTotal = layerNames.reduce((a, k) => a + declaredLengths[k], 0);
  const everyLengthPlausible = layerNames.length > 0 && layerNames.every((k) => (
    declaredLengths[k] === n || declaredLengths[k] === (grid ? grid.wTiles : -1)
  ));
  const b64Bytes = payload
    ? layerNames.reduce((a, k) => a + payload.layers[k].length, 0)
    : 0;
  const rawBytes = payload ? expectedTotal : 0;
  check(
    'P0',
    `the page carries every layer the scene declares (${layerNames.length}), and the base64 cost is recorded rather than hidden`,
    Boolean(payload) && everyLengthPlausible && rawBytes > 0,
    `${layerNames.length} layer(s) ${JSON.stringify(layerNames)} · declared byte lengths ` +
      `${JSON.stringify(declaredLengths)} · ${rawBytes} raw -> ${b64Bytes} base64 chars ` +
      `(+${rawBytes ? ((b64Bytes / rawBytes - 1) * 100).toFixed(1) : '?'}%), page ${html.length} B total`,
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

  /* ==================================================================== *
   * CAPTURE t=0 BEFORE ANY EARLIER CHECK MOVES THE WALKER.
   *
   * This is not tidiness. My first version of P12 read `#s3` where it stood in the file —
   * after P4 had walked the walker to x=100 and north into a wall — so it asked "does the
   * first frame name a real place" about a state that was not the first frame, and reported
   * 0 of 6 names. The page was right; the check was reading a stale DOM. Every t=0 claim
   * below reads these two frozen values, and a checker that mutates state must say which
   * snapshot it is asserting about — the same discipline `next`'s assertions are under.
   * ==================================================================== */
  const T0 = {
    derived: TG.derived ? Object.keys(TG.derived).length : -1,
    read: TG.read ? Object.keys(TG.read).length : -1,
    walker: { x: TG.walker.x, row: TG.walker.row },
    s3: elements['s3'] ? elements['s3'].innerHTML : '',
    s2: elements['s2'] ? elements['s2'].innerHTML : '',
    display: TG.displayState(),
    targetId: (TG.currentTarget() || { anchor: {} }).anchor.id || null,
  };

  /* ---- the page drew something, at THE SPEC'S scale ------------------- *
   * This check used to assert `zoom >= 8 && viewW < 1600 * zoom`, encoding the OLD
   * 2/4/8/16/32 screen-pixel ladder this viewer happened to be written with. When the
   * scale was corrected to appendix-visual-and-ui-spec §1.1–1.2 — tile 32 px, zoom in
   * {1,2,3} integers, zoom 2 the default — that threshold stopped describing the page
   * and the check went red on a CORRECT artefact. So it is re-anchored to the spec
   * rather than to any ladder: the tile is 32 px, the zoom is one of the three legal
   * integers, screen pixels per tile is 32/zoom, and the view is a WINDOW rather than
   * the whole corridor. A future scale change must move the spec, not this constant.
   */
  const c = canvases.c;
  const zoom = TG.zoom ? TG.zoom() : null;
  const tilePx = TG.tilePx;
  const pxPerTile = TG.screenPxPerTile ? TG.screenPxPerTile() : null;
  const viewTiles = TG.viewTilesX ? TG.viewTilesX() : null;
  const LEGAL_ZOOMS = [1, 2, 3];
  const specConformant =
    tilePx === 32 &&
    LEGAL_ZOOMS.includes(zoom) &&
    Math.abs(pxPerTile - 32 * zoom) < 1e-9 &&
    viewTiles === Math.round(1280 / 32 / zoom) &&
    viewTiles > 0 && viewTiles < 1600;
  check(
    'P3',
    'the page paints at the SPEC scale: 32 px tiles, integer zoom, a window not a sliver',
    Boolean(c) && c.__put && c.__putCount >= 1 && specConformant,
    c
      ? `canvas ${c.width}x${c.height} · tile ${tilePx} px · zoom ${zoom} of ${JSON.stringify(LEGAL_ZOOMS)} ` +
        `· ${pxPerTile} screen px/tile (=32/zoom) · ${viewTiles} tiles wide ` +
        `(1280 logical px = one 40-tile block at zoom 1) · window is ${viewTiles}/1600 tiles ` +
        `of the corridor, a window not a sliver=${viewTiles < 1600} · ` +
        `${c.__put ? c.__put.data.length : 0} bytes of ImageData`
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

  /* ---- the page's own summary agrees with the page's own data ---------- *
   * THE EXPECTATIONS ARE THE PAYLOAD'S OWN NUMBERS, NOT LITERALS.
   *
   * This check used to read `payload.doors.length === 10 && dReachable === 10 &&
   * dEnterable === 7`, and before that `=== 12` / `=== 7`. Every one of those is the
   * same defect: an expectation that is a constant rather than a comparison against
   * the input being validated. §3a moved the door count 12 -> 10 and reddened a check
   * with nothing to say about whether the page was correct. The counts below are now
   * derived from the payload, and the assertion is that the page's PRINTED numbers
   * equal the payload's numbers — which is what P5 was always reaching for.
   */
  /**
   * P5 — S2, THE THREE COUNTERS, AND ALL THREE DENOMINATORS FROM THE INPUT.
   *
   * The old P5 read a `#legend` block that the P1 card required DELETED (the 10-row debug
   * table). The counting did not go away, it became S2 (`街上 n/6 · 门洞 n/10 · 街外 16`),
   * so the assertion follows the slot rather than the block — and it takes the three
   * denominators from the payload, never from a literal. `play-systems-designer` was
   * explicit that 1/1 could not prove this and that the numbers must come from the page's
   * OWN counters().
   */
  const s2 = elements['s2'] ? elements['s2'].innerHTML : '';
  const gc = payload.guideCounts;
  const anchors = payload.anchors;
  const streetTotal = anchors.filter((a) => a.kind === 'place').length;
  const doorTotal = anchors.filter((a) => a.kind === 'doorway').length;
  const outsideTotal = gc.placeTotal - gc.placeInWindow;
  const countersOk =
    streetTotal === gc.placeInWindow && doorTotal === gc.doorwayTotal &&
    outsideTotal === 16 &&
    s2.includes(`街上 <b>0</b>/${streetTotal}`) &&
    s2.includes(`门洞 <b>0</b>/${doorTotal}`) &&
    s2.includes(`街外 <b>${outsideTotal}</b>`);
  check(
    'P5',
    `S2 prints three counters with all three denominators from input (街上 ${streetTotal} · 门洞 ${doorTotal} · 街外 ${outsideTotal})`,
    countersOk,
    `S2 says ${JSON.stringify(s2.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())} · denominators derived: ` +
      `placeInWindow=${gc.placeInWindow}, doorwayTotal=${gc.doorwayTotal}, placeTotal-placeInWindow=${outsideTotal}; ` +
      `all from payload.guideCounts and payload.anchors, no literal`,
  );

  /* ==================================================================== *
   * THE P1 CRITERIA (task-24). Four assertions, all read off the PAGE's own state
   * through `window.__TG` — never off an external model of the page. That distinction is
   * not pedantry: while wiring step 1 I passed a two-record STUB into the page's own
   * counters() and reported denominators of 1/1, which was a probe error that looked like
   * a payload error. The page must be the source of its own numbers.
   * ==================================================================== */

  /* ---- P9 · t=0 has an empty progression ------------------------------ */
  const derivedAt0 = T0.derived;
  const readAt0 = T0.read;
  check(
    'P9',
    't=0: the progression sets are empty, so the first frame is comparable between subjects',
    derivedAt0 === 0 && readAt0 === 0,
    `derived=${derivedAt0} read=${readAt0} (both must be 0 at spawn; spec §1.7: the save IS these two sets) · ` +
      `walker at spawn (${T0.walker.x}, ${T0.walker.row})`,
  );

  /* ---- P10 · existence is not gated; only verification is -------------- *
   * THE CRITERION HERE WAS RULED WRONG, AND MY FIRST VERSION ASSERTED IT ANYWAY.
   *
   * The phrasing I originally handed the Lead — "the first-frame name set equals the fact
   * layer's inSceneWindow set" — was overturned: the first-frame spec gives anchors SHAPE and
   * no names (one name appears, in the status readout), so "six names on the first frame"
   * would amount to the task log that spec explicitly refuses.
   *
   * The corrected criterion is a STATE property, in the SOW's own words:
   *   `visible(a)` does not depend on `derived`; `derived` lights up MARKERS, it does not
   *   change NAMES.
   *
   * So this assertion now checks the property that was actually ruled correct, and it checks
   * it on the ARTEFACT rather than on the payload: if the draw path ever consulted `derived`,
   * markers would appear only after a visit and existence would be gated behind discovery —
   * which is the exact thing the rule forbids. Reading the payload alone could not detect
   * that; reading the draw path can.
   *
   * Separately, the drift check I still want (the page's in-window places must EQUAL the ones
   * guide.json marks `inSceneWindow`) is kept, because it is real and it is cheap — it just no
   * longer claims to be the first-frame criterion.
   */
  const execScript = scripts[0];
  const drawConsultsDerived = /derived/.test(
    execScript.slice(execScript.indexOf('PAYLOAD.anchors.length'), execScript.indexOf('putImageData')),
  );
  const inWinNames = payload.anchors.filter((a) => a.kind === 'place').map((a) => a.id).sort();
  /**
   * The fact-layer side comes from `build/guide.json` read from disk, not from the page's own
   * payload — otherwise the assertion would compare the page against a copy of itself and
   * could never catch a wrong copy.
   */
  const guideDoc = JSON.parse(readFileSync(new URL('../../build/guide.json', import.meta.url), 'utf8'));
  const guideInWin = [
    ...guideDoc.stops.filter((s) => s.inSceneWindow).map((s) => s.placeId),
    ...guideDoc.nearby.filter((s) => s.inSceneWindow).map((s) => s.placeId),
  ].sort();
  const sameSet = inWinNames.length === guideInWin.length &&
    inWinNames.every((n, i) => n === guideInWin[i]);
  check(
    'P10',
    `existence is ungated: the marker draw path never reads 'derived' (${inWinNames.length} in-window places, set matches guide.json)`,
    !drawConsultsDerived && sameSet && inWinNames.length > 0,
    `draw path references 'derived'=${drawConsultsDerived} (must be false: markers are drawn for ` +
      `every anchor unconditionally, so arriving lights a marker rather than revealing it) · ` +
      `in-window places on the page: ${JSON.stringify(inWinNames)} · ` +
      `guide.json inSceneWindow: ${JSON.stringify(guideInWin)} · equal=${sameSet}`,
  );

  /* ---- P11 · one step() changes at least one DISPLAYED quantity ------- *
   * "The first key press gets a response from the world" is P1's second criterion. This is
   * the mechanical half of it: at least one displayed value must differ after one step.
   */
  const beforeStep = TG.displayState();
  const movedOk = TG.step(1, 0);
  const afterStep = TG.displayState();
  TG.update();
  const changedKeys = Object.keys(beforeStep).filter(
    (k) => JSON.stringify(beforeStep[k]) !== JSON.stringify(afterStep[k]),
  );
  check(
    'P11',
    'one step() changes at least one displayed quantity (the first key press has a response)',
    movedOk === true && changedKeys.length > 0,
    `step(1,0) accepted=${movedOk} · before ${JSON.stringify(beforeStep)} · after ${JSON.stringify(afterStep)} · ` +
      `changed: ${JSON.stringify(changedKeys)}`,
  );

  /* ---- P12 · the first frame NAMES a real place from the fact layer ---- *
   * The card's rewritten "the first frame is not empty" criterion, and the reason it is
   * written against the HUD rather than the window:
   *
   *   The nearest anchor sits at column 20 and the spawn window is columns 0..19, because
   *   camLeft clamps to 0. The camera bias is VERTICAL and its direction is
   *   sign(11 - 11) = 0, so no amount of camera tuning brings a sourced cell into the first
   *   frame. A criterion demanding one would be permanently red for a reason that is not a
   *   defect — and a criterion that can never go green teaches people to ignore red.
   *
   * The name is checked against the payload's own records, so it is the fact layer's value
   * and not a string this check knows in advance.
   */
  const s3Html = T0.s3;
  const realNames = payload.anchors.filter((a) => a.kind === 'place').map((a) => a.nameJa);
  const namedInS3 = realNames.filter((n) => s3Html.includes(n));
  check(
    'P12',
    `t=0: the HUD names at least one real fact-layer place (${namedInS3.length} of ${realNames.length})`,
    namedInS3.length >= 1,
    `S3 at spawn says ${JSON.stringify(s3Html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())} · ` +
      `matched real names: ${JSON.stringify(namedInS3)} · window-sourced cells at t=0 would be 0 by construction ` +
      `(nearest anchor col 20, window cols 0..19, and the camera bias is vertical with dir=sign(11-11)=0)`,
  );

  /* ---- P13 · the walker NEVER leaves the frame (hard rule, spec §1.5) -- *
   * Walk the whole corridor one step at a time and require the walker's cell to stay inside
   * the camera window at EVERY step. This is the hard rule the card calls assertable, and it
   * is what catches a bias or a clamp pushing the walker off-screen — a spot check at spawn
   * would not.
   *
   * The walker follows the street profile rather than a fixed row, which is the only way to
   * get across: the street drifts 19.86 m (rows 11 -> 21), so a walker holding row 11 is
   * correctly REFUSED by the north facade at x=836. My first version held the row, stopped
   * there, and failed on a threshold — the refusal was right and the test was wrong.
   */
  TG.walker.x = T0.walker.x;
  TG.walker.row = T0.walker.row;
  const offFrame = [];
  let walked = 0;
  let lastRow = TG.walker.row;
  for (let i = 0; i < 2000; i += 1) {
    const cl = TG.camLeft(), ct = TG.camTop();
    const vx = TG.viewTilesX(), vy = TG.viewTilesY();
    if (!(TG.walker.x >= cl && TG.walker.x < cl + vx && TG.walker.row >= ct && TG.walker.row < ct + vy)) {
      offFrame.push({ step: i, x: TG.walker.x, row: TG.walker.row, camLeft: cl, camTop: ct });
    }
    // follow the street's own centreline, the way the shipped walker does
    const want = TG.SIM.streetRowAt(payload.street.profile, payload.halfCrossTiles, TG.walker.x + 1);
    let ok = false;
    if (want !== null && want !== TG.walker.row) ok = TG.step(0, want > TG.walker.row ? 1 : -1);
    if (!ok) ok = TG.step(1, 0);
    if (!ok && want !== null && want !== TG.walker.row) ok = TG.step(1, 0);
    if (!ok) break;
    lastRow = TG.walker.row;
    walked += 1;
  }
  check(
    'P13',
    `the walker never leaves the frame while walking the corridor (reached x=${TG.walker.x}, ${walked} steps)`,
    offFrame.length === 0 && TG.walker.x > 1500,
    `walked ${walked} step(s) to x=${TG.walker.x}, ending row ${lastRow} (street ends near row 21) · ` +
      `frames with the walker outside the camera window: ${offFrame.length}` +
      (offFrame.length ? ` · first: ${JSON.stringify(offFrame[0])}` : '') +
      ` · window is 20x11 tiles at zoom 2 with a bias of floor(11/3)=3 rows toward the target`,
  );

  /* ---- P14 · the two deleted things are really gone ------------------- *
   * Card deliverable 2: the 10-row debug table must leave the first screen, and the
   * "E open a door" line must be DELETED. That line is the specific thing under test: it was
   * the only thing telling anyone E existed, and P1 exists to ask whether it is needed.
   *
   * The check searches what a PERSON RECEIVES: HTML comments, JS comments, <style> and the
   * payload all come out first. The phrase legitimately survives in comments that DOCUMENT
   * its removal, in both syntaxes — my first version searched the raw bytes and failed the
   * page for explaining itself, and the fix is not to delete the explanation but to ask the
   * question of the delivered text.
   */
  const delivered = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
  const hasPanelMarkup = /id="panel"/.test(delivered);
  const hasTableMarkup = /<table/i.test(delivered);
  const hasEHint = /E open a door/.test(delivered);
  const hasWASDPill = /↑ ↓ ← → \/ WASD walk/.test(delivered);
  /* the V-B keymap IS allowed to name the E key — it is the variant that exists to test
     whether the key was merely undiscoverable. It must name KEYS and nothing else. It lives
     in the payload, which the delivered-text search strips, so it is checked on the payload
     itself; that the page APPLIES it is asserted separately in P15. */
  const keymapLine = (payload.variants['V-B'].instructionalText || []).join(' ');
  const keymapHasGoal = /目标|找|去|goal|target|objective/i.test(keymapLine);
  const vAHasNoText = (payload.variants['V-A'].instructionalText || []).length === 0;
  check(
    'P14',
    'the debug table is off the first screen and the "E open a door" line is gone from the page',
    !hasPanelMarkup && !hasTableMarkup && !hasEHint && !hasWASDPill && !keymapHasGoal && vAHasNoText && keymapLine.length > 0,
    `#panel markup present=${hasPanelMarkup} · <table> present=${hasTableMarkup} · ` +
      `"E open a door" present=${hasEHint} · WASD pill present=${hasWASDPill} · ` +
      `V-A has no instructional text=${vAHasNoText} · V-B keymap names no goal=${!keymapHasGoal} · ` +
      `(searched with HTML/JS comments and the payload stripped; the phrase survives only in the comments recording its removal)`,
  );

  /* ---- P15 · both variants run, and they differ in EXACTLY the keymap - *
   * The pair exists to separate "the keys were not discoverable" from "there was no reason
   * to press one". That separation is only valid if the two variants are identical except
   * for the keymap, so this evaluates the page a SECOND time with `location.hash = '#V-B'`
   * and compares the two runs' state key by key. If V-B also changed the goal, the target or
   * the counters, the experiment would be confounded rather than conducted.
   */
  let vB = null;
  let vBError = null;
  try {
    const sib = ctx.__makeSibling('#V-B');
    vm.runInContext(code, vm.createContext(sib.ctx), { filename: 'index.html#V-B', timeout: 20000 });
    vB = { tg: sib.ctx.window.__TG, els: sib.elements };
  } catch (e) {
    vBError = e.message;
  }
  const vBvariant = vB && vB.tg ? vB.tg.variant : null;
  const vAkeymapVisible = TG.keymapVisible ? TG.keymapVisible() : null;
  const vBkeymapVisible = vB && vB.tg ? vB.tg.keymapVisible() : null;
  const vBkeymapText = vB && vB.tg ? vB.tg.keymapText() : '';
  const sameTarget = vB && vB.tg ? vB.tg.currentTarget().anchor.id === T0.targetId : false;
  const sameCounters = vB && vB.tg
    ? JSON.stringify(vB.tg.displayState().s2) === JSON.stringify(T0.display.s2)
    : false;
  check(
    'P15',
    'both variants run, and they differ in the keymap ALONE (the third cause is isolated)',
    vBvariant === 'V-B' && vAkeymapVisible === false && vBkeymapVisible === true &&
      vBkeymapText === keymapLine && vBkeymapText.length > 0 && sameTarget && sameCounters,
    vBError
      ? `V-B failed to run: ${vBError}`
      : `V-A keymap visible=${vAkeymapVisible} · V-B keymap visible=${vBkeymapVisible} ` +
        `saying ${JSON.stringify(vBkeymapText)} · both variants pick the same first target=${sameTarget} ` +
        `and show the same counters=${sameCounters} · labels V-A=${TG.variant}, V-B=${vBvariant} · ` +
        `so any difference in outcome is attributable to the KEYMAP and not to the goal`,
  );

  /* ---- P16 · every anchor is DRAWN, whether or not it was reached ------ *
   * THE BEHAVIOURAL VERSION OF P10, and it took three attempts to find one that works.
   *
   * The SOW's corrected criterion: `visible(a)` does not depend on `derived`; `derived` lights
   * markers, it does not reveal them. Existence is not gated, only verification is.
   *
   * ATTEMPT 1 — derive every anchor, require the frame to be byte-identical. VACUOUS: under a
   * build that gates drawing behind `derived`, deriving everything draws everything, so the
   * frames matched and the check stayed green on a broken build. A comparison whose sides are
   * both saturated cannot detect a gate.
   *
   * ATTEMPT 2 — derive ONE ON-SCREEN anchor, require the frame to be byte-identical. Now it
   * failed on the GOOD build, and correctly so: the camera slides toward the current target,
   * and deriving the target changes which anchor `next` returns, so the window moves and the
   * frame legitimately differs. Frame identity cannot isolate markers while the camera is
   * itself a function of `derived`.
   *
   * ATTEMPT 3, below — ask the question directly, and do not involve the camera at all: for
   * every anchor inside the current window, does the rendered frame carry that anchor's mark
   * at that anchor's cell, with `derived` EMPTY? If a mark only appeared on arrival, none of
   * these cells would carry one. Counts are reported so a change in marker coverage shows up
   * as a number rather than as a pass.
   */
  /**
   * RESET THE PROGRESSION SET FIRST, AND ASSERT THE RESET TOOK.
   *
   * P16 ran GREEN on a build whose markers were gated behind `derived`, and the cause was
   * ORDERING. P10 runs earlier and writes `TG.derived[a.id] = true` for all 16 anchors while it
   * probes whether the draw path reads `derived`; under the helper-mediated break it does, so
   * P10 leaves every anchor marked. P16 then saw a non-empty `derived`, the gate skipped
   * nothing, every mark was drawn, and "derived empty" — the entire premise — was false.
   *
   * A check whose precondition is "this set is empty" must CLEAR it and CONFIRM it, not assume
   * that an earlier check left the world alone. This is the same defect as P12 reading a stale
   * `#s3`: there, a previous check had moved the walker; here, a previous check had filled the
   * set. Both are checks mutating shared state and a later check trusting it.
   */
  for (const k of Object.keys(TG.derived)) delete TG.derived[k];
  for (const k of Object.keys(TG.read)) delete TG.read[k];
  const derivedIsEmpty = Object.keys(TG.derived).length === 0 && Object.keys(TG.read).length === 0;
  /**
   * PARK WHERE AN ANCHOR IS ACTUALLY ON SCREEN — and assert that precondition rather than
   * assuming it.
   *
   * At spawn with `derived` empty NO anchor is inside the window: the nearest is column 20
   * while the window is columns 0..19, because `camLeft` clamps to 0 at the world's western
   * edge and cannot slide right without excluding the walker. That is the same geometry the
   * card records, and it means a check run at spawn would be vacuous — so it searches east for
   * the first cell where an anchor is visible, and reports the position it used.
   */
  let parked = null;
  for (let cx = 0; cx <= 60 && !parked; cx += 1) {
    const row = TG.SIM.streetRowAt(payload.street.profile, payload.halfCrossTiles, cx);
    if (row === null) continue;
    TG.walker.x = cx;
    TG.walker.row = row;
    TG.update();
    const l = TG.camLeft(), t0 = TG.camTop(), wx = TG.viewTilesX(), wy = TG.viewTilesY();
    const hit = payload.anchors.filter((a) => a.cellX >= l && a.cellX < l + wx && a.cellY >= t0 && a.cellY < t0 + wy);
    if (hit.length > 0) parked = { cx, row, hit, cl: l, ct: t0 };
  }
  const cl = parked ? parked.cl : TG.camLeft();
  const ct = parked ? parked.ct : TG.camTop();
  const vx = TG.viewTilesX();
  const vy = TG.viewTilesY();
  const expected = { doorway: [176, 24, 24], place: [30, 90, 160] };
  const inWindow = parked ? parked.hit : [];
  const missing = [];
  let doorwayMarks = 0;
  let placeMarks = 0;
  const cvs = canvases.c;
  const S = TG.screenPxPerTile();
  const sample = (col, row, dy) => {
    const o = (((row - ct) * S + dy) * cvs.width + ((col - cl) * S + (S >> 1))) * 4;
    return [cvs.__put.data[o], cvs.__put.data[o + 1], cvs.__put.data[o + 2]];
  };
  for (const a of inWindow) {
    const want = a.kind === 'doorway' ? expected.doorway : expected.place;
    // doors are filled, so the cell centre carries the mark; places are hollow, so sample the top edge
    let rgb = sample(a.cellX, a.cellY, S >> 1);
    let hit = rgb[0] === want[0] && rgb[1] === want[1] && rgb[2] === want[2];
    if (!hit && a.kind !== 'doorway') {
      rgb = sample(a.cellX, a.cellY, 0);
      hit = rgb[0] === want[0] && rgb[1] === want[1] && rgb[2] === want[2];
    }
    if (hit) { if (a.kind === 'doorway') doorwayMarks += 1; else placeMarks += 1; }
    else missing.push(`${a.id}(${a.kind}) rgb=${JSON.stringify(rgb)}`);
  }
  check(
    'P16',
    `every anchor inside the window is DRAWN with derived empty (${inWindow.length} in window: ${doorwayMarks} door, ${placeMarks} place)`,
    derivedIsEmpty && inWindow.length > 0 && missing.length === 0,
    !derivedIsEmpty
      ? `VACUOUS: the progression set could not be cleared (derived=${Object.keys(TG.derived).length}), ` +
        `so a gate would have skipped nothing and this check could not fail`
      : !parked
        ? 'VACUOUS: no anchor enters the window from any cell tried, so nothing could be checked'
        : `parked at x=${parked.cx} row ${parked.row} (the first cell where an anchor is visible) · ` +
          `derived and read both cleared and confirmed empty · ` +
          `window cols ${cl}..${cl + vx - 1} rows ${ct}..${ct + vy - 1} · ` +
          `anchors carrying their own mark with derived EMPTY: ${inWindow.length - missing.length} of ${inWindow.length}` +
          (missing.length ? ` · NOT drawn: ${JSON.stringify(missing)}` : '') +
          ` · a mark gated behind arrival would be absent here, because nothing has been reached`,
  );
  for (const k of Object.keys(TG.derived)) delete TG.derived[k];
  TG.walker.x = T0.walker.x;
  TG.walker.row = T0.walker.row;
  TG.update();

  /* ---- the interaction, driven through the PAGE's own handler ---------- *

  /* ---- the interaction, driven through the PAGE's own handler ---------- *

  /* ---- the interaction, driven through the PAGE's own handler ---------- *
   * The card's third deliverable is that triggering a south door shows the
   * placeholder rather than doing nothing. `"Nothing happens" is the worst outcome,
   * because the player concludes the game is broken.` So the page's OWN
   * `openNearestDoor()` runs here, through the same DOM stub, and the receipt it
   * renders into S4 is read back.
   *
   * P8 now reads `#s4` instead of `#panel`: the P1 card replaced the old panel with the
   * four HUD slots, and S4 is the doorway receipt. The assertion's SUBJECT did not change
   * — a south door still must say 内容开发中 and draw no room, a north door still must not.
   */
  const s4 = () => (elements['s4'] ? elements['s4'].innerHTML : '');
  {
    const contract = payload.openerContract;
    const unmodelled = contract.openable.filter((d) => d.surface === 'unmodelled-interior');
    const measured = contract.openable.filter((d) => d.surface === 'measured-interior');
    const placeholder = (payload.doors.find((d) => d.interaction && d.interaction.placeholder) || {}).interaction;

    // stand on a south door and press E
    const southDoor = payload.doors.find((d) => d.surface === 'unmodelled-interior');
    let southPanel = '';
    let southOutcome = null;
    if (southDoor && typeof TG.openNearestDoor === 'function') {
      TG.walker.x = southDoor.cellX;
      TG.walker.row = southDoor.cellY;
      TG.openNearestDoor();
      southOutcome = TG.lastInteraction();
      southPanel = s4();
    } else if (southDoor) {
      // the page may not expose openNearestDoor; fall back to the door marker's own
      // pre-resolved interaction, which the baker computed with the same body
      southOutcome = southDoor.interaction;
      southPanel = '';
    }

    // stand on a north door and press E
    const northDoor = payload.doors.find((d) => d.surface === 'measured-interior');
    let northPanel = '';
    let northOutcome = null;
    if (northDoor && typeof TG.openNearestDoor === 'function') {
      TG.walker.x = northDoor.cellX;
      TG.walker.row = northDoor.cellY;
      TG.openNearestDoor();
      northOutcome = TG.lastInteraction();
      northPanel = s4();
    } else if (northDoor) {
      northOutcome = northDoor.interaction;
    }

    const southShowsPlaceholder = Boolean(southOutcome) &&
      southOutcome.placeholder === (placeholder ? placeholder.placeholder : '内容开发中') &&
      southPanel.includes(southOutcome.placeholder);
    const southDrawsNothing = Boolean(southOutcome) && southOutcome.drawRoom === false &&
      !southPanel.includes('id="room"');
    const northIsDifferent = Boolean(northOutcome) && northOutcome.kind === 'measured-interior' &&
      northOutcome.placeholder === null && northOutcome.drawRoom === true &&
      northPanel.includes('measured interior') && !northPanel.includes('内容开发中');

    check(
      'P8',
      "opening a SOUTH door shows the placeholder in the page's own S4 receipt; opening a NORTH door does not",
      southShowsPlaceholder && southDrawsNothing && northIsDifferent,
      `${unmodelled.length} unmodelled / ${measured.length} measured doors · ` +
        `south ${southDoor ? southDoor.doorId : '(none)'} -> kind ${southOutcome ? southOutcome.kind : '?'}, ` +
        `placeholder ${JSON.stringify(southOutcome ? southOutcome.placeholder : null)}, drawRoom ${southOutcome ? southOutcome.drawRoom : '?'}, ` +
        `panel shows it=${Boolean(southOutcome) && southPanel.includes(southOutcome.placeholder)}, no room canvas drawn=${southDrawsNothing} · ` +
        `north ${northDoor ? northDoor.doorId : '(none)'} -> kind ${northOutcome ? northOutcome.kind : '?'}, ` +
        `placeholder ${JSON.stringify(northOutcome ? northOutcome.placeholder : null)}, drawRoom ${northOutcome ? northOutcome.drawRoom : '?'}, ` +
        `panel says "measured interior"=${northPanel.includes('measured interior')}, ` +
        `panel carries the south placeholder=${northPanel.includes('内容开发中')} (must be false)`,
    );

    /* P8b — the page does not carry its own copy of the decision. If the baked
       contract and the page's door markers disagreed, the page would show one thing
       while the assertions checked another. */
    const markerAgreesWithContract = payload.doors.every((d) => {
      const c = contract.openable.find((o) => o.doorId === d.doorId);
      if (!c) return false;
      return d.surface === c.surface &&
        d.interaction.kind === (c.surface === 'unmodelled-interior' ? 'unmodelled-interior' : 'measured-interior') &&
        d.openable === c.openable;
    });
    check(
      'P8b',
      'every door marker on the page carries the surface kind the fact-layer declaration states',
      markerAgreesWithContract,
      payload.doors.map((d) => `${d.doorId}:${d.surface}`).join(' '),
    );

    /**
     * P8c — ON THE PAGE, the placeholder is not something the layout can be mistaken for.
     *
     * The Lead's criterion is that a player with no background knowledge must not come
     * away believing they saw the real interior. "Not misleadable" is not fully
     * mechanisable, but two properties are:
     *
     *   1. the placeholder string appears EXACTLY ONCE in the page's executable source,
     *      so it cannot drift between branches — and it appears in the payload at all,
     *      so the page cannot be a version that forgot it;
     *   2. the panel for an unmodelled door carries the placeholder and NO room canvas,
     *      while the panel for a modelled door carries no placeholder.
     *
     * What this deliberately does NOT claim: that the WORDING is good. That is a design
     * judgement, and it is reported rather than asserted.
     */
    const pageCode = code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*)/.test(l))
      .join('\n');
    const pageLiteralUses = (pageCode.match(/内容开发中/g) || []).length;
    const placeholderInPayload = (JSON.stringify(payload).match(/内容开发中/g) || []).length;
    const unmodelledNoRoom = unmodelled.every((d) => {
      const m = payload.doors.find((x) => x.doorId === d.doorId);
      return m && m.interaction.placeholder !== null && m.interaction.drawRoom === false;
    });
    check(
      'P8c',
      'on the page, an unmodelled door is a placeholder and nothing room-shaped, and the string exists once in executable code',
      pageLiteralUses === 1 && placeholderInPayload >= unmodelled.length && unmodelledNoRoom,
      `executable occurrences of the placeholder in the page script=${pageLiteralUses} (must be 1) · ` +
        `occurrences in the payload=${placeholderInPayload} (>= one per unmodelled door, ${unmodelled.length}) · ` +
        `every unmodelled door has a placeholder and draws no room=${unmodelledNoRoom}`,
    );
  }

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
