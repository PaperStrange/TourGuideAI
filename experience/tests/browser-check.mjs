// Exercise a built distribution, because source inspection cannot prove shipped
// assets, input behavior or output. This is a bounded evidence driver, not an art
// acceptance gate. It uses actual input and a read-only ?qa=1 observer; no teleport.
import { chromium } from 'playwright';
import { Matrix4, Vector3 } from 'three';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, join, relative, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WORLD, PLAYER_RADIUS } from '../src/simulation/world.js';
import { STORAGE_KEY, LEGACY_KEY } from '../src/app/journey-store.js';
import { verifySharing, SELECTED_NOTE, UNSELECTED_NOTE, UNSAVED_DRAFT } from './browser-sharing.mjs';
import { verifyComparison } from './browser-comparison.mjs';
import { APPEARANCE_KEY } from '../src/app/appearance.js';
import { lightingState, waitForLighting, verifyAppearanceOpening, verifyAppearanceWithJourney, verifyAppearanceFaults } from './browser-appearance.mjs';

if (!process.argv[2]) {
  console.error('Usage: npm run test:browser -- <built-dist-directory>');
  process.exit(2);
}
const dist = resolve(process.argv[2]);
const reviewOnly = process.argv.includes('--review');
const savedBankReview = reviewOnly && process.argv.includes('--saved-bank');
const lightingReview = reviewOnly && process.argv.includes('--lighting');
const sharingOnly = process.argv.includes('--sharing');
const comparisonOnly = process.argv.includes('--comparison');
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || join(tmpdir(), 'experience-qa'));
// Software rendering can advance the bounded fixed-step simulation slowly.
// This is a tooling ceiling, not an accepted product response time or FPS target.
const timeout = Number(process.env.EXPERIENCE_QA_TIMEOUT || 240000);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = new Map();
function collect(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) collect(path);
    else if (item.isFile()) assets.set('/' + relative(dist, path).split(sep).join('/'), readFileSync(path));
  }
}
collect(dist);
if (!assets.has('/index.html')) throw new Error('The specified directory has no built index.html. Run npm run build first.');
mkdirSync(output, { recursive: true });
const manifest = [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const report = {
  startedAt: new Date().toISOString(), artifact: { directory: dist, manifestSha256: sha(JSON.stringify(manifest)), files: manifest },
  driverSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  driverSources: ['browser-check.mjs', 'browser-sharing.mjs', 'browser-comparison.mjs', 'browser-appearance.mjs'].map(file => ({ file,
    sha256: sha(readFileSync(new URL(file, import.meta.url))) })),
  conditions: { viewport: [1440, 1000], compactViewport: [1280, 720], deviceScaleFactor: 1, readOnlyObserver: '?qa=1', timeoutMs: timeout },
  scope: comparisonOnly ? 'Rendering-comparison behavior and failure fixtures only; no gameplay or sharing acceptance'
    : sharingOnly ? 'Sharing/recipient checks from a restored completed journey with WebGL deliberately unavailable; no gameplay or art acceptance'
    : savedBankReview ? 'Opening plus restored-bank rendering review only; no walked-route validation'
    : reviewOnly ? 'Opening and bank visual-review capture only' : 'Complete browser behavior, sharing and saved-journey validation',
  checks: [], actions: [], scenarios: {}, screenshots: [], observations: {},
  limitations: ['Agent/automation evidence is not human art, fluency or immersion acceptance.',
    'Software GPU timings are not desktop hardware performance acceptance.',
    'Headless Chromium does not reproduce real tab focus changes here; focus-loss cleanup uses an injected blur event.',
    'Native sharing uses an observed API stub, not an OS share sheet or recipient delivery. Browser PDF output does not establish every OS printer.',
    'HTTP packaged-resource loading is exercised; native file:// launch requires a browser environment permitting that scheme.'],
};
const persist = () => writeFileSync(join(output, 'browser-result.json'), JSON.stringify(report, null, 2) + '\n');
const check = (id, pass, evidence) => {
  report.checks.push({ id, pass: Boolean(pass), evidence }); persist();
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`);
};
const action = async (description, run) => {
  report.actions.push({ description, time: new Date().toISOString() }); persist();
  console.log(`ACTION ${description}`); return run();
};
const origin = 'http://127.0.0.1:4187';
const entry = origin + '/?qa=1';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json' };
const samePosition = (a, b) => a.x === b.x && a.y === b.y;
const journey = state => JSON.stringify({ visited: state.visitedIds, read: state.readSourceIds, choices: state.choiceIds, selected: state.selectedTargetId });
const delta = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
const length = v => Math.hypot(v.x, v.y);
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));
let browser;
const contexts = [];
async function scenario(name, seed = {}, options = {}, noWebGL = false, settings = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, ...options });
  contexts.push(context);
  const record = report.scenarios[name] = { requests: [], externalRequests: [], pageErrors: [], consoleErrors: [] };
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    if (path.endsWith('.glb') && settings.assetBarrier) await settings.assetBarrier;
    if (url.origin === origin) await settings.delayAsset?.(path);
    if (url.origin === origin && (settings.blockedPaths?.includes(path) || settings.failAsset?.(path))) {
      record.requests.push(path); return route.fulfill({ status: 404, body: 'Deliberate QA missing-asset fixture' });
    }
    if (url.origin === origin && assets.has(path)) {
      record.requests.push(path);
      return route.fulfill({ status: 200, contentType: types[extname(path)] || 'application/octet-stream', body: assets.get(path) });
    }
    record.externalRequests.push(url.href); await route.abort('blockedbyclient');
  });
  await context.addInitScript(({ seed, noWebGL, origin, staticEntry }) => {
    if (location.origin !== origin) return;
    if (!sessionStorage.getItem('qa-seeded')) {
      for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value);
      sessionStorage.setItem('qa-seeded', '1');
    }
    window.__QA_ENTRY__ = { storageWrites: [], webglContexts: 0 };
    if (staticEntry) {
      for (const method of ['setItem', 'removeItem', 'clear']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (...args) {
          if (this === localStorage) window.__QA_ENTRY__.storageWrites.push({ method, key: args[0] });
          return original.apply(this, args);
        };
      }
    }
    const originalContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) {
        window.__QA_ENTRY__.webglContexts++;
        if (noWebGL) return null;
      }
      return originalContext.call(this, type, ...args);
    };
    window.__QA_NATIVE_CALLS__ = []; window.__QA_NATIVE_ABORT__ = false;
    Object.defineProperty(navigator, 'share', { configurable: true, value: async payload => {
      window.__QA_NATIVE_CALLS__.push({ title: payload.title, text: payload.text, url: payload.url,
        files: payload.files?.map(file => ({ name: file.name, type: file.type, size: file.size })) });
      if (window.__QA_NATIVE_ABORT__) throw new DOMException('QA cancelled share sheet', 'AbortError');
    } });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    window.__QA_IMAGE_TEXT__ = [];
    const originalText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, ...args) {
      if (this.canvas.width === 1080) window.__QA_IMAGE_TEXT__.push({ text, x, y, font: this.font, height: this.canvas.height });
      return originalText.call(this, text, x, y, ...args);
    };
  }, { seed, noWebGL, origin, staticEntry: Boolean(settings.staticEntry) });
  context.on('page', openedPage => {
    openedPage.on('pageerror', error => { record.pageErrors.push(error.message); persist(); });
    openedPage.on('console', message => { if (message.type() === 'error') { record.consoleErrors.push(message.text()); persist(); } });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  await page.goto(settings.entryUrl || entry, { waitUntil: settings.beforeReady ? 'commit' : 'load' });
  if (settings.beforeReady) await settings.beforeReady(page);
  if (!settings.staticEntry) await page.waitForFunction(noWebGL => noWebGL
    ? document.querySelector('#retry-scene') && document.querySelector('#game-stage').dataset.sceneStatus === 'unavailable'
    : window.__TOUR_GAME__ && document.querySelector('#loading')?.hidden, noWebGL, { timeout });
  return { context, page, record };
}
const observed = page => page.evaluate(() => window.__TOUR_GAME__.snapshot());
const camera = page => page.evaluate(() => window.__TOUR_GAME__.camera());
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);
const settle = page => page.waitForTimeout(900);
async function capture(page, name) {
  const path = join(output, name + '.png'); await page.screenshot({ path, fullPage: true });
  report.screenshots.push({ name, path, sha256: sha(readFileSync(path)) }); persist();
}
async function locale(page, value, inCard = false) {
  await page.locator(`${inCard ? '#place-dialog' : '#language-switch'} [data-locale="${value}"]`).click();
  await page.waitForFunction(value => document.documentElement.lang === value, value);
}
async function moveKey(page, key, minimum = 0.35) {
  await page.locator('#game-stage').focus(); const before = await observed(page);
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(({ before, minimum }) => {
      const s = window.__TOUR_GAME__.snapshot(); return Math.hypot(s.x - before.x, s.y - before.y) >= minimum;
    }, { before, minimum }, { timeout });
  } finally { await page.keyboard.up(key); }
  await settle(page); return { before, after: await observed(page) };
}
async function approach(page, id, trace = []) {
  await action(`Walk through the journey control to ${id}`, () => page.locator(`[data-target="${id}"]`).click());
  const started = Date.now();
  const deadline = Date.now() + timeout;
  let lastProgress = 0;
  while (Date.now() < deadline) {
    const sample = await page.evaluate(() => ({ state: window.__TOUR_GAME__.snapshot(), renderedFrames: window.__TOUR_GAME__.renderer().renderedFrames }));
    const state = sample.state;
    const elapsedMs = Date.now() - started;
    trace.push({ elapsedMs, renderedFrames: sample.renderedFrames, tick: state.tick, x: state.x, y: state.y });
    if (elapsedMs - lastProgress >= 5000) {
      lastProgress = elapsedMs;
      report.observations[`approach-${id}`] = { status: 'walking', elapsedMs, current: state, samples: trace }; persist();
      console.log(`PROGRESS ${id}: ${elapsedMs}ms, tick ${state.tick}, position ${state.x},${state.y}`);
    }
    if (state.nearbyTargetId === id && state.targetDistance <= 0.2 && !state.destination) {
      report.observations[`approach-${id}`] = { status: 'arrived', elapsedMs, final: state, samples: trace }; persist();
      return state;
    }
    await page.waitForTimeout(150);
  }
  report.observations[`approach-${id}`] = { elapsedMs: Date.now() - started, samples: trace }; persist();
  throw new Error(`Visible journey control did not reach ${id}`);
}
async function open(page) {
  await page.locator('#game-stage').focus(); await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('#place-dialog').open);
}
async function close(page) {
  await page.locator('#card-close').click();
  await page.waitForFunction(() => !document.querySelector('#place-dialog').open);
}
function screenPoint(x, north, height, view, rect) {
  const p = new Vector3(x, height, -north)
    .applyMatrix4(new Matrix4().fromArray(view.matrixWorld).invert())
    .applyMatrix4(new Matrix4().fromArray(view.projectionMatrix));
  if (Math.abs(p.x) >= 1 || Math.abs(p.y) >= 1 || p.z < -1 || p.z > 1) throw new Error('Chosen pavement point is not in the current camera');
  return { x: rect.x + (p.x + 1) * rect.width / 2, y: rect.y + (1 - p.y) * rect.height / 2 };
}

try {
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || undefined, headless: true, args: ['--no-sandbox'] });
  report.browser = browser.version(); persist();
  if (comparisonOnly) {
    await verifyComparison({ scenario, assets, origin, check, capture, report, timeout, persist });
  } else if (sharingOnly) {
    const old = fixture('legacy-v1-completed');
    const seed = { version: 2, ...old, notes: { crossing: SELECTED_NOTE, mitsui: UNSELECTED_NOTE } };
    const main = await scenario('sharing-with-unavailable-webgl', { [STORAGE_KEY]: JSON.stringify(seed) }, {}, true);
    await verifySharing({ main, scenario, saved, check, capture, report, output, origin, timeout, persist, includeDraftCheck: false });
    check('focused-sharing-has-no-unexpected-errors-or-external-requests', !main.record.pageErrors.length && !main.record.externalRequests.length
      && main.record.consoleErrors.every(message => message.includes('Error creating WebGL context.')), main.record);
    await main.context.close();
  } else {
  const main = await scenario('three-encounter-walk');
  const { page } = main;
  await waitForLighting(page, 'day', timeout);
  report.observations.openingCamera = await camera(page);
  report.observations.renderer = await page.locator('canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2'); const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl ? { version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(ext?.UNMASKED_RENDERER_WEBGL || gl.RENDERER) } : null;
  });
  check('actual-webgl-scene-ready', Boolean(report.observations.renderer), report.observations.renderer);
  const emptyShare = await page.locator('#export-notes').evaluate(button => ({ disabled: button.disabled,
    explanation: (button.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim() }));
  check('empty-walk-explains-why-sharing-is-disabled', emptyShare.disabled && Boolean(emptyShare.explanation), emptyShare);
  await capture(page, 'opening-en');
  const initial = await observed(page);
  await locale(page, 'zh');
  check('chinese-goals-controls-and-camera-guidance', /[\u3400-\u9fff]/.test(await page.locator('#objective').innerText()) && /[\u3400-\u9fff]/.test(await page.locator('#camera-toolbar').innerText()));
  check('locale-preserves-position-and-journey', samePosition(initial, await observed(page)) && journey(initial) === journey(await observed(page)));
  await capture(page, 'opening-zh'); await locale(page, 'en');

  if (reviewOnly) {
    let reviewPage = page;
    if (lightingReview) {
      await page.locator('#appearance-controls [data-appearance="night"]').click(); await waitForLighting(page, 'night', timeout);
      await capture(page, 'opening-night-en'); await locale(page, 'zh'); await capture(page, 'opening-night-zh');
      await locale(page, 'en'); report.observations.openingLighting = await lightingState(page);
    }
    if (savedBankReview) {
      await main.context.close();
      const seed = { version: 2, ...fixture('legacy-v1-completed'), locale: 'en', notes: {} };
      reviewPage = (await scenario('restored-bank-render-review', { [STORAGE_KEY]: JSON.stringify(seed) })).page;
      await waitForLighting(reviewPage, 'day', timeout);
      report.observations.bankReviewMethod = 'Restored recorded completed-bank save; no walked-route claim.';
    } else await approach(page, 'mufg');
    await reviewPage.waitForFunction(() => window.__TOUR_GAME__.camera().frontage === 'south', null, { timeout });
    report.observations.bankCamera = await camera(reviewPage);
    check('bank-camera-faces-the-south-frontage', report.observations.bankCamera.frontage === 'south', report.observations.bankCamera);
    await capture(reviewPage, savedBankReview ? 'south-bank-restored' : 'south-bank-approach');
    if (lightingReview) {
      await reviewPage.locator('#appearance-controls [data-appearance="night"]').click(); await waitForLighting(reviewPage, 'night', timeout);
      await capture(reviewPage, 'south-bank-night'); report.observations.bankLighting = await lightingState(reviewPage);
    }
    await open(reviewPage); await capture(reviewPage, 'bank-card-en');
    report.observations.rendererStatistics = await reviewPage.evaluate(() => window.__TOUR_GAME__.renderer());
  } else {
  await verifyAppearanceOpening({ page, saved, check, capture, assets, timeout, report });

  // Remove optional inertia for numerical picking checks, then restore normal
  // motion for the walkthrough. This uses the actual system preference contract.
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator('#camera-reset').click();
  let view = await camera(page);
  const right = await action('Walk right relative to the guided camera', () => moveKey(page, 'ArrowRight'));
  const displacement = delta(right.before, right.after);
  const rightAxis = { x: view.matrixWorld[0], y: -view.matrixWorld[2] };
  const alignment = (displacement.x * rightAxis.x + displacement.y * rightAxis.y) / (length(displacement) * length(rightAxis));
  check('keyboard-movement-is-camera-relative', alignment > 0.999, { displacement, rightAxis, alignment });
  const released = await observed(page); await settle(page);
  check('key-release-stops-walking', samePosition(released, await observed(page)));
  await page.locator('#game-stage').focus(); await page.keyboard.down('ArrowRight');
  const beforeFocusLoss = await observed(page);
  await page.waitForFunction(before => { const s = window.__TOUR_GAME__.snapshot(); return Math.hypot(s.x - before.x, s.y - before.y) > .2; }, beforeFocusLoss, { timeout });
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const afterBlur = await observed(page);
  await page.waitForFunction(tick => window.__TOUR_GAME__.snapshot().tick >= tick + 12, afterBlur.tick, { timeout });
  check('blur-event-clears-held-input', samePosition(afterBlur, await observed(page)), { method: 'Injected blur while real ArrowRight remains held; headless tab switching does not emulate focus loss.', beforeFocusLoss, afterBlur });
  await page.keyboard.up('ArrowRight');
  const rect = await page.locator('#game-stage canvas').boundingBox();
  const beforeDrag = await observed(page), beforeCamera = await camera(page);
  await page.mouse.move(rect.x + rect.width * .72, rect.y + rect.height * .63);
  await page.mouse.down(); await page.mouse.move(rect.x + rect.width * .47, rect.y + rect.height * .67, { steps: 8 }); await page.mouse.up();
  await settle(page); view = await camera(page);
  check('drag-orbits-without-queuing-a-walk', Math.abs(view.azimuth - beforeCamera.azimuth) > .02 && samePosition(beforeDrag, await observed(page)) && !(await observed(page)).destination, { beforeCamera, afterCamera: view });
  const stillCamera = await camera(page); await settle(page);
  check('reduced-motion-orbit-stops-after-release', Math.abs(stillCamera.azimuth - (await camera(page)).azimuth) < .000001);
  const rotatedWalk = await moveKey(page, 'ArrowRight');
  const rotatedDelta = delta(rotatedWalk.before, rotatedWalk.after);
  const rotatedAxis = { x: view.matrixWorld[0], y: -view.matrixWorld[2] };
  const rotatedAlignment = (rotatedDelta.x * rotatedAxis.x + rotatedDelta.y * rotatedAxis.y) / (length(rotatedDelta) * length(rotatedAxis));
  check('walking-adapts-to-rotated-camera', rotatedAlignment > .999, { rotatedDelta, rotatedAxis, rotatedAlignment });
  await page.setViewportSize({ width: 1280, height: 720 }); await settle(page);
  const groundStart = await observed(page); view = await camera(page);
  const groundGoal = { x: groundStart.x + 2.2, y: WORLD.crossing.northY };
  const point = screenPoint(groundGoal.x, groundGoal.y, .17, view, await page.locator('#game-stage canvas').boundingBox());
  await action('Click visible ground after orbit and resize', () => page.mouse.click(point.x, point.y));
  await page.waitForFunction(goal => { const s = window.__TOUR_GAME__.snapshot(); return Math.hypot(s.x - goal.x, s.y - goal.y) < .08 && !s.destination; }, groundGoal, { timeout });
  check('actual-raycast-click-reaches-the-world-point', Math.hypot((await observed(page)).x - groundGoal.x, (await observed(page)).y - groundGoal.y) < .08, { screen: point, intended: groundGoal, arrived: await observed(page) });
  // A different actual mesh height distinguishes surface picking from a single
  // navigation-plane approximation. These are authored asset heights, not surveys.
  await settle(page); view = await camera(page);
  const roadGoal = { x: groundGoal.x + 1.5, y: WORLD.roadSurface.northY - 1.5 };
  const roadPoint = screenPoint(roadGoal.x, roadGoal.y, .05, view, await page.locator('#game-stage canvas').boundingBox());
  await action('Click the actual lower road surface', () => page.mouse.click(roadPoint.x, roadPoint.y));
  await page.waitForFunction(goal => { const s = window.__TOUR_GAME__.snapshot(); return Math.hypot(s.x - goal.x, s.y - goal.y) < .08 && !s.destination; }, roadGoal, { timeout });
  check('road-height-picking-is-not-a-fixed-pavement-plane', Math.hypot((await observed(page)).x - roadGoal.x, (await observed(page)).y - roadGoal.y) < .08, { screen: roadPoint, intended: roadGoal, arrived: await observed(page) });
  await locale(page, 'zh'); await capture(page, 'compact-zh');
  const layout = await page.evaluate(() => {
    const stage = document.querySelector('#game-stage').getBoundingClientRect(), canvas = document.querySelector('canvas').getBoundingClientRect();
    const footer = document.querySelector('.bottom-bar').getBoundingClientRect();
    return { viewport: [innerWidth, innerHeight], document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], canvas: [canvas.width, canvas.height], stage: [stage.width, stage.height], exportBottom: document.querySelector('#export-notes').getBoundingClientRect().bottom, footerTop: footer.top };
  });
  check('compact-layout-and-canvas-fit-after-capture', layout.document[0] === 1280 && layout.document[1] === 720 && layout.canvas.every((v, i) => Math.abs(v - layout.stage[i]) <= 1) && layout.exportBottom <= layout.footerTop, layout);
  for (const language of ['zh', 'en']) {
    await locale(page, language);
    const controls = await page.locator('#appearance-controls [data-appearance]').evaluateAll(buttons => buttons.map(button => {
      const rect = button.getBoundingClientRect(), top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { language: document.documentElement.lang, text: button.textContent, clipped: button.scrollWidth > button.clientWidth,
        withinViewport: rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight,
        reachable: top === button || button.contains(top) };
    }));
    check(`compact-${language}-appearance-controls-fit-and-remain-reachable`, controls.length === 2
      && controls.every(button => !button.clipped && button.withinViewport && button.reachable), controls);
  }
  await capture(page, 'compact-night-en');
  await page.setViewportSize({ width: 1440, height: 1000 }); await locale(page, 'en');
  const beforeResetView = await observed(page); await page.locator('#camera-reset').click();
  check('reset-view-preserves-position-and-journey', samePosition(beforeResetView, await observed(page)) && journey(beforeResetView) === journey(await observed(page)));
  await page.locator('#game-stage').focus(); await page.keyboard.down('ArrowUp');
  try { await page.waitForFunction(max => window.__TOUR_GAME__.snapshot().y >= max - .002, WORLD.northFacadeY - PLAYER_RADIUS, { timeout }); }
  finally { await page.keyboard.up('ArrowUp'); }
  const wall = await observed(page); await page.keyboard.down('ArrowUp');
  try { await page.waitForFunction(tick => window.__TOUR_GAME__.snapshot().tick >= tick + 12, wall.tick, { timeout }); }
  finally { await page.keyboard.up('ArrowUp'); }
  check('north-facade-blocks-forward-motion', Math.abs((await observed(page)).y - wall.y) <= .001, { before: wall, after: await observed(page) });
  await capture(page, 'actor-near-facade');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await approach(page, 'crossing'); const prompt = await page.locator('#interact-button').innerText(); await settle(page);
  check('nearby-prompt-is-stable', await page.locator('#interact-button').isVisible() && prompt === await page.locator('#interact-button').innerText());
  await page.keyboard.down('e'); await page.keyboard.down('e'); await page.keyboard.up('e');
  await page.waitForFunction(() => document.querySelector('#place-dialog').open);
  const opened = await observed(page);
  check('opening-does-not-award-visit-or-source-read', opened.visitedIds.length === 0 && opened.readSourceIds.length === 0);
  await capture(page, 'crossing-card-en');
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1000); await page.keyboard.up('ArrowRight');
  check('modal-pauses-movement', samePosition(opened, await observed(page)) && (await observed(page)).paused);
  await locale(page, 'zh', true);
  check('open-card-locale-keeps-state-and-focus', samePosition(opened, await observed(page)) && journey(opened) === journey(await observed(page)) && await page.evaluate(() => document.activeElement?.dataset.locale === 'zh' && Boolean(document.activeElement.closest('#place-dialog'))));
  await capture(page, 'crossing-card-zh'); await close(page); await settle(page);
  check('close-does-not-reopen-and-restores-focus', !await page.locator('#place-dialog').evaluate(el => el.open) && await page.evaluate(() => document.activeElement.id === 'game-stage'));
  await locale(page, 'en'); await open(page); await page.locator('#source-details summary').click(); await settle(page);
  check('source-reading-remains-separate-from-visiting', (await observed(page)).readSourceIds.includes('crossing') && !(await observed(page)).visitedIds.length);
  await page.locator('[data-choice="north-first"]').click();
  check('choice-records-visit-and-next-target', (await observed(page)).choiceIds.crossing === 'north-first' && (await observed(page)).visitedIds.length === 1 && (await observed(page)).selectedTargetId === 'mitsui');

  const note = SELECTED_NOTE;
  await page.locator('#memory-note').fill(note); await locale(page, 'zh', true);
  check('note-draft-survives-locale-without-autosaving', await page.locator('#memory-note').inputValue() === note && !(await saved(page)).notes.crossing);
  await close(page); await open(page);
  check('note-draft-survives-close-and-reopen-without-autosaving', await page.locator('#memory-note').inputValue() === note && !(await saved(page)).notes.crossing);
  await page.locator('#memory-note').fill('x'.repeat(500)); await page.locator('#memory-note').press('End'); await page.keyboard.type('extra');
  check('note-input-enforces-500-character-bound', (await page.locator('#memory-note').inputValue()).length === 500 && /500/.test(await page.locator('#memory-limit').innerText()));
  await page.locator('#memory-note').fill(note); const beforeNote = await observed(page); await page.locator('#save-memory').click();
  check('explicit-note-save-preserves-journey-meaning', (await saved(page)).notes.crossing === note && journey(beforeNote) === journey(await observed(page)));
  await capture(page, 'saved-personal-note-zh'); await close(page);
  const resumed = await moveKey(page, 'ArrowRight'); check('card-close-resumes-walking', length(delta(resumed.before, resumed.after)) > .2);
  await settle(page); const beforeReload = await saved(page); await page.reload();
  await page.waitForFunction(() => window.__TOUR_GAME__ && document.querySelector('#loading').hidden, null, { timeout }); await settle(page);
  const restored = await saved(page);
  check('reload-retains-world-position-choices-locale-and-note', samePosition(beforeReload.game, restored.game) && journey(beforeReload.game) === journey(restored.game) && restored.locale === 'zh' && restored.notes.crossing === note, { before: beforeReload, after: restored });

  await locale(page, 'en'); await approach(page, 'mitsui'); await open(page); await page.locator('[data-choice="street-only"]').click();
  check('mitsui-skip-retains-visit-without-planned-station-stop', (await observed(page)).choiceIds.mitsui === 'street-only' && (await observed(page)).visitedIds.includes('mitsui'));
  await page.locator('#memory-note').fill(UNSELECTED_NOTE); await page.locator('#save-memory').click();
  await page.locator('#card-continue').click(); await locale(page, 'zh');
  const roadTrace = []; await approach(page, 'mufg', roadTrace);
  const road = roadTrace.filter(p => p.y < -2 && p.y > -15);
  check('real-bank-walk-uses-the-mapped-crossing', road.length > 0 && road.every(p => Math.abs(p.x - WORLD.crossing.x) < .08), road);
  await page.waitForFunction(() => window.__TOUR_GAME__.camera().frontage === 'south', null, { timeout });
  check('bank-camera-faces-actionable-frontage', (await camera(page)).frontage === 'south', await camera(page));
  await capture(page, 'south-bank-approach'); await open(page); await capture(page, 'bank-card-zh');
  await page.locator('[data-choice="no-cash-stop"]').click();
  check('all-three-encounters-complete-with-distinct-choices', JSON.stringify((await observed(page)).visitedIds) === JSON.stringify(['crossing', 'mitsui', 'mufg']) && (await observed(page)).choiceIds.mufg === 'no-cash-stop');
  await page.locator('#memory-note').fill(UNSAVED_DRAFT);
  await page.locator('#card-continue').click(); const chineseResume = await moveKey(page, 'ArrowRight');
  check('chinese-encounter-chain-resumes', length(delta(chineseResume.before, chineseResume.after)) > .2 && !await page.locator('#place-dialog').evaluate(el => el.open));
  await page.locator('#game-stage').focus(); await page.keyboard.down('ArrowUp');
  try { await page.waitForFunction(min => window.__TOUR_GAME__.snapshot().y <= min + .002, WORLD.southFacadeY + PLAYER_RADIUS, { timeout }); }
  finally { await page.keyboard.up('ArrowUp'); }
  const southWall = await observed(page); await page.keyboard.down('ArrowUp');
  try { await page.waitForFunction(tick => window.__TOUR_GAME__.snapshot().tick >= tick + 12, southWall.tick, { timeout }); }
  finally { await page.keyboard.up('ArrowUp'); }
  check('south-facing-walk-is-blocked-by-south-facade', Math.abs((await observed(page)).y - southWall.y) <= .001, { before: southWall, after: await observed(page) });
  await capture(page, 'completed-walk-zh');
  await verifyAppearanceWithJourney({ page, saved, check, capture, timeout, draft: UNSAVED_DRAFT });
  await verifySharing({ main, scenario, saved, check, capture, report, output, origin, timeout, persist, includeDraftCheck: true });
  const creditsEvent = page.waitForEvent('popup'); await page.locator('.bottom-bar a[href="./credits.html"]').click();
  const creditsPage = await creditsEvent; await creditsPage.waitForLoadState('domcontentloaded');
  const credits = await creditsPage.evaluate(() => ({ text: document.body.innerText, links: [...document.querySelectorAll('a[href]')].map(a => a.href) }));
  const references = JSON.parse(assets.get('/content-evidence/facade-references.json')).references;
  const localCreditLinks = credits.links.map(link => new URL(link)).filter(url => url.origin === origin).map(url => url.pathname === '/' ? '/index.html' : url.pathname);
  check('packaged-artwork-credits-retain-authors-sources-and-licenses', creditsPage.url() === origin + '/credits.html' && localCreditLinks.every(path => assets.has(path)) && references.every(reference => credits.text.includes(reference.author) && credits.links.includes(reference.sourceUrl) && credits.links.includes(reference.licenseUrl)), { ...credits, localCreditLinks });
  await capture(creditsPage, 'artwork-credits'); await creditsPage.close(); await page.bringToFront();
  report.observations.finalJourney = await saved(page);
  report.observations.rendererStatistics = await page.evaluate(() => window.__TOUR_GAME__.renderer());
  const contextLost = await page.evaluate(() => {
    const extension = document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context');
    if (!extension) return false; extension.loseContext(); return true;
  });
  check('context-loss-injection-is-supported', contextLost);
  if (contextLost) {
    await page.waitForSelector('#retry-scene');
    const afterLoss = await saved(page), beforeLoss = report.observations.finalJourney;
    check('context-loss-keeps-journey-notes-and-localized-recovery', samePosition(beforeLoss.game, afterLoss.game) && journey(beforeLoss.game) === journey(afterLoss.game) && JSON.stringify(beforeLoss.notes) === JSON.stringify(afterLoss.notes) && /[\u3400-\u9fff]/.test(await page.locator('.scene-error').innerText()));
    await capture(page, 'context-loss-zh');
    await page.locator('#retry-scene').click();
    await page.waitForFunction(() => window.__TOUR_GAME__ && document.querySelector('#loading')?.hidden && document.querySelector('#game-stage').dataset.sceneStatus === 'ready', null, { timeout });
    const afterRetry = await saved(page);
    check('retry-restores-rendering-with-the-same-saved-journey', samePosition(beforeLoss.game, afterRetry.game) && journey(beforeLoss.game) === journey(afterRetry.game) && JSON.stringify(beforeLoss.notes) === JSON.stringify(afterRetry.notes));
    await waitForLighting(page, 'night', timeout);
    check('graphics-recovery-retains-the-night-preference', (await lightingState(page)).mode === 'night');
  }
  const beforeResetJourney = await saved(page);
  await page.locator('#reset-button').click(); await page.locator('#cancel-reset').click();
  check('cancel-restart-retains-journey-and-notes', journey((await saved(page)).game) === journey(beforeResetJourney.game) && JSON.stringify((await saved(page)).notes) === JSON.stringify(beforeResetJourney.notes));
  await page.locator('#reset-button').click(); await page.locator('#confirm-reset').click();
  const freshJourney = await saved(page);
  check('confirmed-restart-clears-progress-and-personal-notes', samePosition(freshJourney.game, WORLD.spawn) && !freshJourney.game.visitedIds.length && !freshJourney.game.readSourceIds.length && !Object.keys(freshJourney.game.choiceIds).length && !Object.keys(freshJourney.notes).length && freshJourney.locale === 'zh');
  check('journey-restart-does-not-reset-appearance', await page.evaluate(key => JSON.parse(localStorage.getItem(key))?.lighting === 'night', APPEARANCE_KEY)
    && (await lightingState(page)).mode === 'night');
  check('walk-has-no-external-requests-or-browser-errors', !main.record.externalRequests.length && !main.record.pageErrors.length && !main.record.consoleErrors.length, main.record);
  await main.context.close();

  // A restored position inside the accepted navigation bounds targets the exact
  // western road wedge that had missing walkable geometry in the first expansion.
  const westSeed = { version: 2, locale: 'en', hints: true, notes: {},
    game: { x: 8, y: 2.1, visitedIds: [], readSourceIds: [], choiceIds: {}, selectedTargetId: 'crossing' } };
  const western = await scenario('restored-western-road', { [STORAGE_KEY]: JSON.stringify(westSeed) });
  const westGoal = { x: 9, y: 2.1 };
  const westPoint = screenPoint(westGoal.x, westGoal.y, .05, await camera(western.page), await western.page.locator('#game-stage canvas').boundingBox());
  await western.page.mouse.click(westPoint.x, westPoint.y);
  await western.page.waitForFunction(goal => { const s = window.__TOUR_GAME__.snapshot(); return Math.hypot(s.x - goal.x, s.y - goal.y) < .08 && !s.destination; }, westGoal, { timeout });
  const westGround = await western.page.evaluate(() => ({ state: window.__TOUR_GAME__.snapshot(), renderer: window.__TOUR_GAME__.renderer() }));
  check('restored-western-road-has-real-pickable-ground', Math.abs(westGround.renderer.scene.actorPosition[1] - .05) < .003, { ...westGround, method: 'Restored valid position (8,2.1), then real pointer click at independently projected road point (9,2.1).' });
  await capture(western.page, 'western-asphalt-restored');
  check('western-road-probe-has-no-external-requests-or-errors', !western.record.externalRequests.length && !western.record.pageErrors.length && !western.record.consoleErrors.length, western.record);
  await western.context.close();

  const eastSeed = { version: 2, locale: 'en', hints: true, notes: {},
    game: { x: 50, y: -2, visitedIds: [], readSourceIds: [], choiceIds: {}, selectedTargetId: 'crossing' } };
  const eastern = await scenario('restored-eastern-camera-envelope', { [STORAGE_KEY]: JSON.stringify(eastSeed) });
  await eastern.page.waitForFunction(() => window.__TOUR_GAME__.renderer().scene.fadedGroups.includes('ContextBuilding_205732545'), null, { timeout });
  const eastState = await eastern.page.evaluate(() => ({ state: window.__TOUR_GAME__.snapshot(), camera: window.__TOUR_GAME__.camera(), renderer: window.__TOUR_GAME__.renderer() }));
  check('expanded-context-building-does-not-enclose-the-restored-camera', eastState.state.x === 50 && eastState.state.y === -2
    && Math.abs(eastState.renderer.scene.actorPosition[1] - .05) < .003
    && eastState.camera.position.every((value, i) => Math.abs(value - [55.23675, 16.19163, 22.25189][i]) < .0001),
  { ...eastState, method: 'Restored valid save under unchanged guided camera; actual contextual occluder must fade. Screenshot review establishes actor visibility.' });
  await capture(eastern.page, 'eastern-context-occlusion-restored');
  check('eastern-camera-probe-has-no-external-requests-or-errors', !eastern.record.externalRequests.length && !eastern.record.pageErrors.length && !eastern.record.consoleErrors.length, eastern.record);
  await eastern.context.close();

  for (const name of ['legacy-v1-mid-journey', 'legacy-v1-completed']) {
    const old = fixture(name);
    let releaseAssets;
    const coldShare = name === 'legacy-v1-completed' ? {
      assetBarrier: new Promise(resolve => { releaseAssets = resolve; }),
      beforeReady: async page => {
        try {
          await page.locator('#export-notes').click();
          await page.waitForFunction(() => document.querySelector('#share-dialog')?.open);
        } finally { releaseAssets(); }
      },
    } : {};
    const migrated = await scenario(name, { [LEGACY_KEY]: JSON.stringify(old) }, {}, false, coldShare);
    if (name === 'legacy-v1-completed') {
      check('sharing-opened-during-scene-load-remains-paused-and-focused', (await observed(migrated.page)).paused
        && await migrated.page.evaluate(() => Boolean(document.activeElement.closest('#share-dialog'))));
      await migrated.page.locator('#share-close').click();
    }
    await settle(migrated.page); const current = await saved(migrated.page);
    check(`${name}-migrates-in-the-real-app`, current.version === 2 && current.locale === old.locale && samePosition(current.game, old.game) && journey(current.game) === journey(old.game), { before: old, after: current });
    await migrated.page.reload(); await migrated.page.waitForFunction(() => window.__TOUR_GAME__ && document.querySelector('#loading').hidden, null, { timeout });
    check(`${name}-migration-survives-reload`, samePosition((await saved(migrated.page)).game, old.game) && journey((await saved(migrated.page)).game) === journey(old.game));
    if (name === 'legacy-v1-completed') {
      await migrated.page.locator('#reset-button').click(); await migrated.page.locator('#confirm-reset').click();
      await migrated.page.reload(); await migrated.page.waitForFunction(() => window.__TOUR_GAME__ && document.querySelector('#loading').hidden, null, { timeout });
      const afterRestart = await saved(migrated.page);
      check('restarting-migrated-journey-does-not-resurrect-legacy-progress', samePosition(afterRestart.game, WORLD.spawn) && !afterRestart.game.visitedIds.length && !Object.keys(afterRestart.game.choiceIds).length);
    }
    check(`${name}-no-external-requests-or-errors`, !migrated.record.externalRequests.length && !migrated.record.pageErrors.length && !migrated.record.consoleErrors.length, migrated.record);
    await migrated.context.close();
  }
  const retained = { ...report.observations.finalJourney, locale: 'en' };
  const unsupported = await scenario('webgl-unavailable', { [STORAGE_KEY]: JSON.stringify(retained) }, {}, true);
  const unavailableSave = await saved(unsupported.page);
  check('webgl-failure-keeps-existing-journey-and-notes', samePosition(retained.game, unavailableSave.game) && journey(retained.game) === journey(unavailableSave.game) && JSON.stringify(retained.notes) === JSON.stringify(unavailableSave.notes));
  check('webgl-failure-leaves-field-note-export-available', await unsupported.page.locator('#export-notes').isEnabled() && await unsupported.page.locator('#retry-scene').isVisible());
  await capture(unsupported.page, 'webgl-unavailable-en'); await locale(unsupported.page, 'zh');
  check('webgl-failure-recovery-translates', /[\u3400-\u9fff]/.test(await unsupported.page.locator('.scene-error').innerText()));
  check('webgl-failure-has-no-uncaught-errors-or-external-requests', !unsupported.record.pageErrors.length && !unsupported.record.externalRequests.length
    && unsupported.record.consoleErrors.every(message => message.includes('Error creating WebGL context.')), { ...unsupported.record, consoleNote: 'Only Three context-creation diagnostics are expected in this deliberately unavailable scenario.' });
  await unsupported.context.close();
  await verifyAppearanceFaults({ scenario, assets, origin, seed: report.observations.finalJourney, saved, check, capture, timeout });
  await verifyComparison({ scenario, assets, origin, check, capture, report, timeout, persist });
  }
  }
  report.status = comparisonOnly ? 'Focused comparison checks completed; no gameplay or sharing acceptance.' : sharingOnly ? 'Focused sharing checks completed; no gameplay or art acceptance.' : reviewOnly ? 'Limited visual-review capture completed; the full behavior suite was not run.' : 'Browser walkthrough completed; independent visual review and human acceptance remain separate.';
} catch (error) {
  check('browser-run-completed', false, error.stack || String(error)); report.status = 'Incomplete or failed; do not claim playable validation.';
  const failurePages = contexts.flatMap(context => context.pages()).filter(page => !page.isClosed());
  report.observations.failure = [];
  for (const [index, page] of failurePages.entries()) {
    report.observations.failure.push(await page.evaluate(() => ({ url: location.href,
      state: window.__TOUR_GAME__?.snapshot(), camera: window.__TOUR_GAME__?.camera(),
      sceneStatus: document.querySelector('#game-stage')?.dataset.sceneStatus,
      comparison: window.__TOUR_COMPARISON__?.snapshot(),
      sharing: { open: document.querySelector('#share-dialog')?.open, status: document.querySelector('#share-status')?.textContent },
    })).catch(() => null));
    await capture(page, failurePages.length === 1 ? 'failure' : `failure-${index + 1}`).catch(() => {});
  }
} finally {
  report.summary = { passed: report.checks.filter(c => c.pass).length, failed: report.checks.filter(c => !c.pass).length };
  report.finishedAt = new Date().toISOString(); persist();
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close();
}
process.exitCode = report.summary.failed ? 1 : 0;
