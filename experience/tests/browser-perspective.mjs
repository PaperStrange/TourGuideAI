// Focused packaged-browser evidence for the shared-perspective experiment.
// This establishes behavior, not enjoyment, social connection or field usefulness.
import { chromium } from 'playwright';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MOMENTS } from '../src/content/perspectives.js';
import { createRecord } from '../src/perspective/state.js';

if (!process.argv[2]) {
  console.error('Usage: npm run test:perspective -- <built-dist-directory>');
  process.exit(2);
}
const dist = resolve(process.argv[2]);
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || join(tmpdir(), 'perspective-qa'));
const timeout = Number(process.env.EXPERIENCE_QA_TIMEOUT || 240000);
const origin = 'http://127.0.0.1:4187';
const entry = `${origin}/perspective.html?qa=1`;
const key = 'tourguideai:perspective:v1';
const oldKey = 'tourguideai:journey:v2';
const sha = value => createHash('sha256').update(value).digest('hex');
const assets = new Map();
function collect(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) collect(path);
    else if (item.isFile()) assets.set('/' + relative(dist, path).split(sep).join('/'), readFileSync(path));
  }
}
collect(dist);
if (!assets.has('/perspective.html')) throw new Error('Missing built perspective.html; build the application first.');
mkdirSync(output, { recursive: true });
const files = [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const report = {
  startedAt: new Date().toISOString(),
  artifact: { directory: dist, manifestSha256: sha(JSON.stringify(files)), files },
  driverSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  conditions: { viewport: [1440, 1000], compactViewport: [390, 844], deviceScaleFactor: 1, timeoutMs: timeout },
  checks: [], scenarios: {}, screenshots: [], observations: {}, outputs: [],
  limitations: [
    'Automated fixtures are not human enjoyment, connection, recognition or travel-benefit evidence.',
    'Software-rendered Chromium is not representative-device fluency acceptance.',
    'Clipboard transfer and local export do not establish recipient delivery or an OS share sheet.',
    'Packaged HTTP assets are exercised; native file:// launch is not tested.',
  ],
};
const persist = () => writeFileSync(join(output, 'perspective-result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, passed, evidence) {
  report.checks.push({ id, pass: Boolean(passed), evidence });
  persist(); console.log(`${passed ? 'PASS' : 'FAIL'} ${id}`);
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v1-completed.json', import.meta.url)));
const oldRecord = JSON.stringify({ version: 2, locale: 'zh', hints: true,
  game: { ...legacy.game, x: 31.25, y: 2.1 }, notes: { crossing: 'Distinctive private Kyoto note — do not migrate or overwrite.' } });
const baselineStorage = { [oldKey]: oldRecord, 'tourguideai:appearance:v1': '{"lighting":"night"}' };
let browser;
const contexts = new Set();
async function scenario(name, { seed = {}, url = entry, noWebGL = false, storageDenied = false,
  viewport = { width: 1440, height: 1000 }, blocked = new Set(), delay } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, permissions: ['clipboard-read', 'clipboard-write'] });
  contexts.add(context);
  const record = report.scenarios[name] = { requests: [], externalRequests: [], pageErrors: [], consoleErrors: [] };
  await context.route('**/*', async route => {
    const request = new URL(route.request().url());
    if (request.origin !== origin) {
      record.externalRequests.push(request.href); return route.abort('blockedbyclient');
    }
    const path = decodeURIComponent(request.pathname === '/' ? '/index.html' : request.pathname);
    record.requests.push(path);
    await delay?.(path);
    if (blocked.has(path) || !assets.has(path)) return route.fulfill({ status: 404, body: 'QA missing-asset fixture' });
    return route.fulfill({ status: 200, contentType: mime[extname(path)] || 'application/octet-stream', body: assets.get(path) });
  });
  await context.addInitScript(({ seed, origin, noWebGL, storageDenied }) => {
    if (location.origin !== origin) return;
    if (!sessionStorage.getItem('qa-seeded')) {
      for (const [name, value] of Object.entries(seed)) localStorage.setItem(name, value);
      sessionStorage.setItem('qa-seeded', '1');
    }
    window.__QA_PERSPECTIVE__ = { writes: [], webglContexts: 0 };
    for (const method of ['setItem', 'removeItem', 'clear', 'getItem']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        if (this === localStorage) {
          if (method !== 'getItem') window.__QA_PERSPECTIVE__.writes.push({ method, key: args[0] });
          if (storageDenied) throw new DOMException('QA storage denied', 'SecurityError');
        }
        return original.apply(this, args);
      };
    }
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) {
        window.__QA_PERSPECTIVE__.webglContexts++;
        if (noWebGL) return null;
      }
      return getContext.call(this, type, ...args);
    };
  }, { seed: { ...baselineStorage, ...seed }, origin, noWebGL, storageDenied });
  context.on('page', page => {
    page.on('pageerror', error => record.pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push(message.text()); });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  return { context, page, record, blocked };
}
const snapshot = page => page.evaluate(() => window.__PERSPECTIVE__.snapshot());
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), key);
const liveState = page => page.evaluate(() => window.__PERSPECTIVE_VIEW__?.snapshot());
const note = '<img src=x onerror="window.__injected=1"> 我留意到窗格与转角。 & "Quiet street" 🚶';
const secondNote = 'Unselected saved private note';
const draft = 'Unsaved draft — never include this in a shared link.';
const sharedPayload = url => JSON.parse(Buffer.from(new URL(url).hash.slice('#moment='.length), 'base64url').toString('utf8'));
async function ready(page) {
  await page.waitForFunction(() => Boolean(window.__PERSPECTIVE__));
}
async function begin(page) {
  await ready(page);
  if (await page.locator('#begin').count()) await page.locator('#begin').click();
  await page.locator('#note').waitFor();
}
async function setLocale(page, value) {
  await page.locator(`#locale-${value}`).click();
  await page.waitForFunction(value => document.documentElement.lang === value, value);
}
async function waitImage(page, selector = '#story-image') {
  await page.waitForFunction(selector => {
    const img = document.querySelector(selector); return img?.complete && img.naturalWidth > 0;
  }, selector);
}
async function waitLive(page, stopped = true) {
  await page.waitForFunction(stopped => {
    const state = window.__PERSPECTIVE_VIEW__?.snapshot();
    return state?.ready && state.settled && (!stopped || !state.moving);
  }, stopped);
}
async function arrive(page, id) {
  const start = Date.now(), samples = [];
  let lastLog = -10000;
  while (Date.now() - start < timeout) {
    const state = await liveState(page), elapsedMs = Date.now() - start;
    samples.push({ elapsedMs, ...state });
    report.observations[id] = { elapsedMs, samples }; persist();
    if (state?.ready && state.settled && !state.moving && await page.locator('#reveal').isEnabled()) return state;
    if (elapsedMs - lastLog >= 10000) { lastLog = elapsedMs; console.log(`PROGRESS ${id}: ${elapsedMs}ms, ${JSON.stringify(state?.position)}`); }
    await page.waitForTimeout(2000);
  }
  throw Error(`Arrival exceeded tooling allowance: ${id}`);
}
async function contentMatches(page, item, language, mode) {
  const shown = await page.locator('#moment-title').textContent();
  const invitation = await page.locator('#moment-invitation').textContent();
  const remark = await page.locator('#moment-remark').textContent();
  const fact = await page.locator('#moment-fact').textContent();
  check(`${mode}-${item.id}-${language}-matched-content`, shown === item.title[language]
    && invitation === item.invitation[language] && remark === item.remark[language] && fact === item.fact[language],
  { shown, invitation, remark, fact });
}
async function capture(page, name) {
  if (report.screenshots.some(item => item.name === name)) throw Error(`Duplicate screenshot name: ${name}`);
  const path = join(output, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  report.screenshots.push({ name, path, sha256: sha(readFileSync(path)) }); persist();
}
async function close(context) { await context.close(); contexts.delete(context); }
async function isolation(page, id) {
  const evidence = await page.evaluate(({ oldKey, baselineStorage }) => ({
    old: localStorage.getItem(oldKey), appearance: localStorage.getItem('tourguideai:appearance:v1'),
    writes: window.__QA_PERSPECTIVE__.writes,
    expected: baselineStorage,
  }), { oldKey, baselineStorage });
  check(id, evidence.old === oldRecord && evidence.appearance === baselineStorage['tourguideai:appearance:v1']
    && evidence.writes.every(write => write.key === key), evidence);
}
async function runCase(name, run) {
  try { await run(); }
  catch (error) { check(`${name}-completed`, false, { message: error.message, stack: error.stack }); }
  finally { for (const context of [...contexts]) await close(context); }
}

// Scenario calls are kept in this file so the final report binds the complete
// focused driver, the immutable distribution and the observed inputs together.
let storyURL, liveURL, sharedLiveView;
try {
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || undefined,
    headless: true, args: ['--no-sandbox'] });
  report.browser = browser.version(); persist();

  await runCase('story-authoring', async () => {
    const { page, context, record } = await scenario('story-authoring', { url: `${entry}&mode=story&lang=en` });
    await ready(page); await capture(page, 'perspective-welcome-en');
    await page.locator('#begin').focus(); await page.keyboard.press('Enter');
    await page.locator('#note').waitFor();
    for (let index = 0; index < MOMENTS.length; index++) {
      if (index) await page.locator('#next').click();
      await waitImage(page);
      await page.locator('#reveal').click();
      await contentMatches(page, MOMENTS[index], 'en', 'story');
      await setLocale(page, 'zh'); await contentMatches(page, MOMENTS[index], 'zh', 'story');
      await capture(page, `story-${MOMENTS[index].id}-zh`);
      await setLocale(page, 'en');
    }
    check('story-does-not-request-3d-assets', !record.requests.some(path => /\.(glb|hdr)$/.test(path))
      && await page.evaluate(() => window.__QA_PERSPECTIVE__.webglContexts === 0), { requests: record.requests });
    await page.locator('[data-moment="0"]').click();
    await page.locator('#story-zoom').focus(); await page.keyboard.press('ArrowRight');
    await page.locator('#story-x').focus(); await page.keyboard.press('ArrowRight');
    await page.locator('#note').fill(note); await page.locator('#frame-view').click(); await page.locator('#save-moment').click();
    const original = (await stored(page)).moments.find(item => item.momentId === 'arrive');
    check('story-keyboard-framing-and-private-save', original.note === note && original.view.kind === 'story'
      && original.view.scale > 1 && original.view.x > 0.5, original);
    await page.locator('[data-moment="1"]').click();
    check('switching-moment-clears-previous-framing-indicator', (await snapshot(page)).selectedFrame === null
      && await page.locator('#frame-status').innerText() === '', {});
    await page.locator('#note').fill(secondNote);
    await page.locator('#save-moment').click();
    await page.reload(); await begin(page);
    await page.locator('[data-open-moment="arrive"]').click();
    check('private-note-and-view-survive-reload', await page.locator('#note').inputValue() === note
      && JSON.stringify((await snapshot(page)).storyFrame) === JSON.stringify(original.view), await snapshot(page));
    await page.locator('#note').fill(draft);
    await page.locator('#share-moment').click();
    const withoutNote = sharedPayload(await page.locator('#share-url').inputValue());
    check('share-note-defaults-off-and-excludes-draft', !await page.locator('#include-note').isChecked()
      && withoutNote.note === '' && !JSON.stringify(withoutNote).includes(secondNote)
      && !JSON.stringify(withoutNote).includes(draft), withoutNote);
    await page.locator('#include-note').check();
    storyURL = await page.locator('#share-url').inputValue();
    const selected = sharedPayload(storyURL), preview = await page.locator('#share-preview').innerText();
    check('selected-saved-note-and-frame-match-preview', selected.note === note && selected.momentId === 'arrive'
      && JSON.stringify(selected.view) === JSON.stringify(original.view) && preview.includes(note)
      && !preview.includes(secondNote) && !preview.includes(draft), { selected, preview });
    check('preview-personal-text-is-inert', await page.locator('#share-preview img[src="x"]').count() === 0
      && await page.evaluate(() => window.__injected === undefined), {});
    await page.locator('#copy-link').click();
    check('copy-link-uses-reviewed-payload', await page.evaluate(() => navigator.clipboard.readText()) === storyURL, {});
    await capture(page, 'perspective-share-preview-en');
    await page.keyboard.press('Escape');
    check('cancel-sharing-preserves-unsaved-draft', await page.locator('#note').inputValue() === draft, {});
    await page.locator('#note').fill('Edited saved note'); await page.locator('#save-moment').click();
    const afterEdit = await stored(page);
    check('explicit-edit-updates-only-the-selected-private-moment', afterEdit.moments.find(item => item.momentId === 'arrive').note === 'Edited saved note'
      && afterEdit.moments.find(item => item.momentId === 'mitsui-rhythm').note === secondNote, afterEdit);
    await page.locator('[data-delete-moment="arrive"]').click();
    await page.reload(); await begin(page);
    const afterDelete = await stored(page);
    check('edit-delete-persist-with-other-private-moment-intact', afterDelete.moments.length === 1
      && afterDelete.moments[0].momentId === 'mitsui-rhythm' && afterDelete.moments[0].note === secondNote, afterDelete);
    await setLocale(page, 'zh'); await page.setViewportSize({ width: 390, height: 844 }); await waitImage(page);
    check('phone-story-controls-do-not-overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth })));
    await capture(page, 'perspective-story-phone-zh');
    await page.locator('#finish').click();
    check('feedback-is-optional-and-not-preselected', await page.locator('#feedback-score').inputValue() === ''
      && await page.locator('#export-feedback').isDisabled(), {});
    await page.locator('#feedback-score').selectOption('4');
    await page.locator('#feedback-note').fill('AUTOMATED QA FIXTURE — not a human evaluation.');
    await page.locator('#save-feedback').click();
    const downloadEvent = page.waitForEvent('download'); await page.locator('#export-feedback').click();
    const download = await downloadEvent, downloadPath = join(output, 'automated-feedback-fixture.json');
    await download.saveAs(downloadPath);
    const feedback = JSON.parse(readFileSync(downloadPath));
    report.outputs.push({ name: 'automated-feedback-fixture.json', path: downloadPath, sha256: sha(readFileSync(downloadPath)) });
    check('feedback-export-is-explicit-local-and-excludes-personal-content', feedback.feedback.score === 4
      && feedback.feedback.note.includes('AUTOMATED QA FIXTURE') && !JSON.stringify(feedback).includes(secondNote)
      && !Object.hasOwn(feedback, 'moments') && !Object.hasOwn(feedback, 'successRate'), feedback);
    await page.locator('#reset-button').click(); await page.locator('#cancel-reset').click();
    check('cancel-reset-retains-private-record', (await stored(page)).moments.length === 1, {});
    await page.locator('#reset-button').click(); await page.locator('#confirm-reset').click();
    check('reset-clears-only-this-experience', (await stored(page)).moments.length === 0
      && (await stored(page)).feedback === null, await stored(page));
    await isolation(page, 'story-keeps-kyoto-save-and-appearance-unchanged');
    await close(context);
  });

  await runCase('live-experience', async () => {
    const { page, context } = await scenario('live-experience', { url: `${entry}&mode=walk&lang=en` });
    await begin(page); await arrive(page, 'live-arrive');
    await capture(page, 'perspective-live-opening-en');
    const beforeFocus = await liveState(page);
    await page.locator('#look-here').click(); await waitLive(page);
    const afterFocus = await liveState(page);
    check('look-here-changes-camera-without-player-teleport', JSON.stringify(beforeFocus.position) === JSON.stringify(afterFocus.position)
      && Boolean(afterFocus.view), { beforeFocus, afterFocus });
    await page.locator('#live-stage').focus(); await page.keyboard.press('e');
    const noEncounters = await page.evaluate(() => ({ targets: window.__TOUR_GAME__.targets(),
      state: window.__TOUR_GAME__.snapshot(), scene: window.__TOUR_GAME__.renderer().scene,
      label: document.querySelector('#live-stage canvas').getAttribute('aria-label'),
      legacyCards: document.querySelectorAll('#place-dialog,[data-target]').length }));
    check('live-perspective-has-no-legacy-encounters', noEncounters.targets.length === 0
      && noEncounters.legacyCards === 0 && noEncounters.state.visitedIds.length === 0
      && noEncounters.scene.markerCount === 0 && !/Press E|按 E/.test(noEncounters.label), noEncounters);
    const beforeMove = await liveState(page); await page.keyboard.down('ArrowRight');
    try { await page.waitForFunction(p => {
      const state = window.__PERSPECTIVE_VIEW__.snapshot();
      return Math.hypot(state.position.x - p.x, state.position.y - p.y) > 0.25;
    }, beforeMove.position); } finally { await page.keyboard.up('ArrowRight'); }
    await waitLive(page); const released = await liveState(page); await page.waitForTimeout(400);
    check('actual-keyboard-walk-and-release-work', JSON.stringify(released.position) === JSON.stringify((await liveState(page)).position)
      && JSON.stringify(released.position) !== JSON.stringify(beforeMove.position), { beforeMove, released });
    const canvas = page.locator('#live-stage canvas'), rect = await canvas.boundingBox();
    const beforeDrag = await liveState(page);
    await page.mouse.move(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5); await page.mouse.down();
    await page.mouse.move(rect.x + rect.width * 0.62, rect.y + rect.height * 0.48, { steps: 6 }); await page.mouse.up();
    await waitLive(page); await page.waitForTimeout(500);
    const dragged = await liveState(page);
    check('drag-changes-framing-without-queuing-a-walk', JSON.stringify(beforeDrag.position) === JSON.stringify(dragged.position)
      && Math.abs(beforeDrag.view.camera.azimuth - dragged.view.camera.azimuth) > 0.01, { beforeDrag, dragged });
    await page.locator('#look-here').click(); await waitLive(page);
    const focused = await liveState(page);
    check('normal-motion-focus-settles-without-moving-player', JSON.stringify(focused.position) === JSON.stringify(dragged.position)
      && Math.abs(focused.view.camera.azimuth - dragged.view.camera.azimuth) > 0.01, { dragged, focused });
    await page.locator('#note').fill(draft);
    const priorMoment = (await snapshot(page)).record.index;
    await page.locator('#mode-story').click(); await waitImage(page); await setLocale(page, 'zh');
    check('mode-and-locale-change-preserve-current-moment-and-draft', await page.locator('#note').inputValue() === draft
      && (await snapshot(page)).record.index === priorMoment, await snapshot(page));
    await page.locator('#mode-walk').click(); await arrive(page, 'live-return-after-mode-change');
    for (let index = 0; index < MOMENTS.length; index++) {
      if (index) { await page.locator('#next').click(); await arrive(page, `live-${MOMENTS[index].id}`); }
      await page.locator('#reveal').click(); await waitLive(page);
      await contentMatches(page, MOMENTS[index], 'zh', 'live');
      await setLocale(page, 'en'); await contentMatches(page, MOMENTS[index], 'en', 'live');
      await capture(page, `perspective-live-${MOMENTS[index].id}-en`); await setLocale(page, 'zh');
    }
    await page.locator('#note').fill(note); await page.locator('#frame-view').click(); await page.locator('#save-moment').click();
    const saved = (await stored(page)).moments.find(item => item.momentId === 'daiya-rhythm');
    sharedLiveView = saved.view;
    check('actual-live-framing-saves-as-live-pose', saved.view.kind === 'walk' && saved.note === note, saved);
    await page.locator('#share-moment').click(); await page.locator('#include-note').check();
    liveURL = await page.locator('#share-url').inputValue();
    const whileOpen = await liveState(page);
    check('live-share-pauses-scene-and-labels-reference-preview', whileOpen.paused
      && /reference|参考/i.test(await page.locator('#share-preview .small').first().innerText())
      && JSON.stringify(sharedPayload(liveURL).view) === JSON.stringify(saved.view), { whileOpen, payload: sharedPayload(liveURL) });
    await capture(page, 'perspective-live-share-zh'); await page.keyboard.press('Escape');
    await page.reload(); await begin(page);
    await page.locator('[data-open-moment="daiya-rhythm"]').click(); await waitLive(page);
    const restored = await liveState(page);
    check('saved-live-view-restores-after-reload', JSON.stringify(restored.view) === JSON.stringify(saved.view.pose)
      && await page.locator('#note').inputValue() === note, { saved: saved.view.pose, restored });
    await isolation(page, 'live-keeps-kyoto-save-and-appearance-unchanged');
    report.observations.liveRenderer = await page.evaluate(() => window.__TOUR_GAME__.renderer());
    await close(context);
  });

  await runCase('story-recipient', async () => {
    if (!storyURL) throw Error('Story share prerequisite did not complete');
    const own = createRecord({ mode: 'story', locale: 'zh' }); own.index = 2;
    const existing = JSON.stringify(own);
    const { page, context, record } = await scenario('story-recipient', { url: storyURL + '', seed: { [key]: existing },
      viewport: { width: 390, height: 844 } });
    await page.locator('#recipient-view').waitFor(); await waitImage(page, '#recipient-image');
    const recipientFrame = await page.locator('#recipient-image').evaluate(img => {
      const matrix = new DOMMatrix(img.style.transform), origin = img.style.transformOrigin.split(/\s+/);
      return { scaleX: matrix.a, scaleY: matrix.d, skewX: matrix.b, skewY: matrix.c,
        translateX: matrix.e, translateY: matrix.f, x: parseFloat(origin[0]) / 100, y: parseFloat(origin[1]) / 100,
        percentOrigin: origin.every(value => value.endsWith('%')), rawOrigin: img.style.transformOrigin };
    });
    const expectedFrame = sharedPayload(storyURL).view;
    // Chromium exposes CSS matrix coefficients at float32 precision. Allow one
    // relative float32 epsilon; this is arithmetic tolerance, not visual drift.
    const scaleTolerance = 2 ** -23 * Math.max(1, expectedFrame.scale);
    check('fresh-story-recipient-matches-selected-note-and-frame', await page.locator('.recipient-note').innerText() === note
      && recipientFrame.percentOrigin && Math.abs(recipientFrame.scaleX - expectedFrame.scale) <= scaleTolerance
      && Math.abs(recipientFrame.scaleY - expectedFrame.scale) <= scaleTolerance
      && Math.abs(recipientFrame.x - expectedFrame.x) < 1e-8 && Math.abs(recipientFrame.y - expectedFrame.y) < 1e-8
      && recipientFrame.skewX === 0 && recipientFrame.skewY === 0 && recipientFrame.translateX === 0 && recipientFrame.translateY === 0,
    { expectedFrame, recipientFrame });
    check('recipient-text-inert-and-private-content-absent', await page.locator('img[src="x"]').count() === 0
      && await page.evaluate(() => window.__injected === undefined)
      && !(await page.locator('body').innerText()).includes(secondNote), {});
    await setLocale(page, 'zh'); await capture(page, 'perspective-recipient-story-phone-zh');
    await setLocale(page, 'en');
    const state = await page.evaluate(key => ({ stored: localStorage.getItem(key), writes: window.__QA_PERSPECTIVE__.writes,
      contexts: window.__QA_PERSPECTIVE__.webglContexts }), key);
    check('recipient-locale-is-read-only-without-webgl', state.stored === existing && state.writes.length === 0
      && state.contexts === 0 && !record.requests.some(path => /\.(glb|hdr)$/.test(path)), state);
    await isolation(page, 'recipient-leaves-kyoto-record-unchanged'); await close(context);
  });

  await runCase('live-recipient', async () => {
    if (!liveURL) throw Error('Live share prerequisite did not complete');
    const url = new URL(liveURL); url.searchParams.set('qa', '1');
    const { page, context } = await scenario('live-recipient', { url: url.href });
    await waitLive(page); const observed = await liveState(page);
    check('live-recipient-restores-selected-pose-read-only', observed.paused
      && JSON.stringify(observed.view) === JSON.stringify(sharedLiveView.pose)
      && await page.locator('.recipient-note').innerText() === note
      && await page.evaluate(() => window.__QA_PERSPECTIVE__.writes.length === 0), { observed, expected: sharedLiveView });
    await capture(page, 'perspective-recipient-live-zh');
    await close(context);
  });

  await runCase('webgl-fallback', async () => {
    const { page, context } = await scenario('webgl-fallback', { url: `${entry}&mode=walk&lang=zh`, noWebGL: true });
    await begin(page); await page.locator('#use-story').waitFor();
    await page.locator('#note').fill(draft); await page.locator('#use-story').click(); await waitImage(page);
    check('unavailable-webgl-offers-explicit-story-fallback', (await snapshot(page)).record.mode === 'story'
      && await page.locator('#note').inputValue() === draft && await page.locator('#story-stage').isVisible(), await snapshot(page));
    await capture(page, 'perspective-no-webgl-story-zh'); await isolation(page, 'fallback-preserves-kyoto-record');
    await close(context);
    if (liveURL) {
      const recipient = await scenario('recipient-webgl-fallback', { url: liveURL, noWebGL: true });
      await recipient.page.waitForFunction(() => document.querySelector('#recipient-live')?.hidden);
      await waitImage(recipient.page, '#recipient-image');
      check('live-recipient-fallback-does-not-pretend-to-reproduce-framing', await recipient.page.locator('#recipient-image').isVisible()
        && /reference|参考/i.test(await recipient.page.locator('#recipient-status').innerText())
        && await recipient.page.evaluate(() => window.__QA_PERSPECTIVE__.writes.length === 0),
      { status: await recipient.page.locator('#recipient-status').innerText(), original: sharedPayload(liveURL).view });
      await capture(recipient.page, 'perspective-recipient-fallback-zh'); await close(recipient.context);
    }
  });

  await runCase('invalid-recipient', async () => {
    const { page, context } = await scenario('invalid-recipient', { url: `${entry}&lang=zh#moment=wyg` });
    await page.locator('.invalid-share').waitFor();
    check('malformed-recipient-has-localized-recovery-without-storage-write', await page.locator('.invalid-share a').isVisible()
      && await page.evaluate(() => document.documentElement.lang === 'zh' && window.__QA_PERSPECTIVE__.writes.length === 0),
    { text: await page.locator('.invalid-share').innerText() });
    await page.goto(`${entry}&lang=en#moment=${'a'.repeat(8200)}`); await page.locator('.invalid-share').waitFor();
    check('oversized-recipient-recovers-without-partial-content', await page.locator('#recipient-view').count() === 0
      && await page.locator('.invalid-share a').isVisible(), {});
    await page.locator('.invalid-share a').click(); await page.locator('#begin').waitFor();
    check('invalid-link-can-start-own-experience', await page.locator('#begin').isVisible(), {});
    await close(context);
  });

  await runCase('storage-denied', async () => {
    const { page, context } = await scenario('storage-denied', { url: `${entry}&mode=story`, storageDenied: true });
    await begin(page); await page.locator('#note').fill(note); await page.locator('#save-moment').click();
    check('denied-storage-keeps-working-draft-and-visible-warning', await page.locator('#note').inputValue() === note
      && (await page.locator('#storage-status').innerText()).length > 0, { warning: await page.locator('#storage-status').innerText() });
    await close(context);
  });

  await runCase('delayed-startup', async () => {
    let release;
    const barrier = new Promise(resolve => { release = resolve; });
    const saved = createRecord({ mode: 'walk' });
    saved.moments = [{ momentId: 'arrive', note: 'Saved before delayed loading', view: { kind: 'walk', pose: {
      version: 1, player: { x: 23.8, y: 2.1 }, camera: { azimuth: 0.22, polar: 0.88, distance: 24,
        targetOffset: { x: 1.2, y: -2.2, height: 0.9 } },
    } } }];
    try {
      const { page, context } = await scenario('delayed-startup', { url: entry, seed: { [key]: JSON.stringify(saved) },
        delay: path => path.endsWith('.glb') ? barrier : undefined });
      await begin(page); await page.locator('#live-stage canvas').waitFor();
      await setLocale(page, 'zh'); await page.locator('#note').fill(draft); await page.locator('#share-moment').click();
      await page.locator('#include-note').focus(); release(); await waitLive(page, false);
      const state = await liveState(page);
      check('late-live-start-retains-open-share-pause-focus-and-draft', state.paused
        && await page.locator('#share-dialog').evaluate(dialog => dialog.open)
        && await page.locator('#include-note').evaluate(input => input === document.activeElement)
        && await page.locator('#note').inputValue() === draft
        && /京都/.test(await page.locator('#live-stage canvas').getAttribute('aria-label')), state);
      await page.keyboard.press('Escape'); await close(context);
    } finally { release(); }
    let releaseAgain;
    const delayedAgain = new Promise(resolve => { releaseAgain = resolve; });
    try {
      const { page, context } = await scenario('abandoned-live-start', { url: `${entry}&mode=walk`,
        delay: path => path.endsWith('.glb') ? delayedAgain : undefined });
      await begin(page); await page.locator('#live-stage canvas').waitFor();
      await page.locator('#note').fill(draft); await page.locator('#mode-story').click();
      releaseAgain(); await waitImage(page);
      await page.waitForFunction(() => !window.__PERSPECTIVE_VIEW__ && document.querySelectorAll('#live-stage canvas').length === 0);
      check('abandoned-live-start-cannot-replace-story-or-lose-draft', (await snapshot(page)).record.mode === 'story'
        && await page.locator('#note').inputValue() === draft && await page.locator('#story-stage').isVisible(), await snapshot(page));
      await close(context);
    } finally { releaseAgain(); }
  });

  await runCase('asset-failure', async () => {
    const blocked = new Set(['/models/shijo-block.glb']);
    const { page, context } = await scenario('asset-failure', { url: `${entry}&mode=walk`, blocked });
    await begin(page); await page.locator('#retry-live').waitFor();
    await page.locator('#note').fill(draft); blocked.clear(); await page.locator('#retry-live').click(); await waitLive(page);
    check('failed-live-asset-retry-retains-draft', await page.locator('#note').inputValue() === draft
      && (await snapshot(page)).sceneStatus === 'ready', await snapshot(page));
    await close(context);
    const missing = new Set(['/' + MOMENTS[0].image]);
    const imageCase = await scenario('story-image-failure', { url: `${entry}&mode=story&lang=zh`, blocked: missing });
    await begin(imageCase.page);
    await imageCase.page.waitForFunction(() => document.querySelector('#story-image').complete && document.querySelector('#story-image').naturalWidth === 0);
    check('missing-story-image-is-not-silently-presented-as-loaded', (await imageCase.page.locator('#scene-state').innerText()).length > 0, {});
    await imageCase.page.locator('[data-moment="1"]').click(); await waitImage(imageCase.page);
    check('missing-image-does-not-trap-story-navigation', await imageCase.page.locator('#moment-title').innerText() === MOMENTS[1].title.zh, {});
    await close(imageCase.context);
  });
} catch (error) {
  check('browser-run-completed', false, { message: error.message, stack: error.stack });
} finally {
  for (const context of [...contexts]) await close(context);
  await browser?.close();
  for (const [name, scenario] of Object.entries(report.scenarios)) {
    check(`${name}-no-external-network-or-uncaught-errors`, scenario.externalRequests.length === 0 && scenario.pageErrors.length === 0,
      { externalRequests: scenario.externalRequests, pageErrors: scenario.pageErrors });
    const deliberateFault = /fallback|failure/.test(name);
    check(`${name}-console-diagnostics`, deliberateFault
      ? scenario.consoleErrors.every(message => /Failed to load resource|Error creating WebGL context|THREE.WebGLRenderer/.test(message))
      : scenario.consoleErrors.length === 0, scenario.consoleErrors);
  }
  report.summary = { passed: report.checks.filter(check => check.pass).length, failed: report.checks.filter(check => !check.pass).length };
  report.finishedAt = new Date().toISOString(); persist();
  console.log(JSON.stringify(report.summary));
  if (report.summary.failed) process.exitCode = 1;
}
