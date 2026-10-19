// 使用真实输入、构建文件和实际地图服务，检查私人探索与返回视角。
import { chromium } from 'playwright';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { startServer } from '../server/src/server.js';

if (!process.argv[2]) throw new Error('Usage: node tests/browser-solo.mjs <built-dist-directory>');
const dist = resolve(process.argv[2]);
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || '../artifacts/solo-exploration-20261018/browser');
const timeout = Number(process.env.EXPERIENCE_QA_TIMEOUT || 90000);
const only = process.env.EXPERIENCE_QA_ONLY?.split(',').filter(Boolean);
const key = 'tourguideai.solo.places.v1';
const sha = value => createHash('sha256').update(value).digest('hex');
const assets = new Map();
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else assets.set('/' + relative(dist, path), readFileSync(path));
  }
}
collect(dist);
if (!assets.has('/index.html')) throw new Error('Missing built homepage.');
mkdirSync(output, { recursive: true });
const files = [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const report = { startedAt: new Date().toISOString(), artifact: { directory: dist, manifestSha256: sha(JSON.stringify(files)), files },
  driverSha256: sha(readFileSync(new URL(import.meta.url))), checks: [], scenarios: {}, screenshots: [],
  conditions: { desktop: [1440, 1000], phone: [390, 844], reducedMotion: 'reduce', timeoutMs: timeout, scenarios: only || 'all' },
  limitations: ['Automated desktop and touch inputs establish behavior; physical-device fluency, enjoyment and place recognition require human evidence.',
    'Map/search successes use actual public providers. Explicit request denials and delayed responses are recovery tests.',
    'Private records are virtual saved views, with no claim of a physical visit. The test service has no configured LLM provider.'] };
const persist = () => writeFileSync(join(output, 'solo-result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, pass, evidence) { report.checks.push({ id, pass: Boolean(pass), evidence }); persist(); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`); }
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream', '.woff': 'font/woff', '.svg': 'image/svg+xml' };
const providerOrigins = new Set(['https://tiles.openfreemap.org', 'https://photon.komoot.io', 'https://en.wikipedia.org']);
const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v1-completed.json', import.meta.url)));
const baseline = {
  'tourguideai:journey:v2': JSON.stringify({ version: 2, locale: 'zh', hints: true, game: legacy.game, notes: { crossing: 'Existing private walk note' } }),
  'tourguideai:perspective:v1': JSON.stringify({ version: 1, chapter: 'kyoto-looking-closer', locale: 'en', mode: 'story', index: 0,
    revealedIds: [], moments: [], trial: { assignment: 'story', source: 'choice', crossover: false }, feedback: null }),
  'tourguideai:travel:v1': '{"selected":["mufg","crossing"],"meaningful":["mitsui"]}',
  'tourguideai:appearance:v1': '{"lighting":"night"}',
};
const home = page => page.evaluate(() => window.__HOME__?.snapshot());
const state = page => page.evaluate(() => window.__TOUR_GAME__?.snapshot());
const camera = page => page.evaluate(() => window.__TOUR_GAME__?.camera());
const view = async page => (await home(page)).currentView;
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{"version":1,"places":[]}'), key);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function closeEnough(a, b, tolerance = 0.0001) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tolerance;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return a === b;
  const keys = Object.keys(a); return keys.length === Object.keys(b).length && keys.every(key => closeEnough(a[key], b[key], tolerance));
}
let browser, service;
const contexts = new Set();
const touchContexts = new WeakSet();
async function makeScenario(name, { mobile = false, locale = 'en', seed = {}, fault = {} } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  contexts.add(context);
  if (mobile) touchContexts.add(context);
  const record = report.scenarios[name] = { requests: [], providerResponses: [], requestFailures: [], denied: [], external: [], pageErrors: [], consoleErrors: [] };
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    record.requests.push({ origin: url.origin, path, query: url.search, method: route.request().method() });
    if (fault.deny?.(url)) { record.denied.push(url.href); return route.abort('blockedbyclient'); }
    if (fault.delay?.(url)) await fault.wait;
    if (providerOrigins.has(url.origin)) return route.continue();
    if (url.origin !== service.url) { record.external.push(url.origin); return route.abort('blockedbyclient'); }
    if (path.startsWith('/api/')) return route.continue();
    const bytes = assets.get(path);
    return route.fulfill({ status: bytes ? 200 : 404, body: bytes || 'Missing packaged resource', contentType: mime[extname(path)] || 'application/octet-stream' });
  });
  await context.addInitScript(({ origin, values }) => {
    window.__QA_INPUT_LOG__ = [];
    document.addEventListener('pointerdown', event => window.__QA_INPUT_LOG__.push({ type: event.pointerType, trusted: event.isTrusted, target: event.target.id || event.target.tagName }), true);
    if (location.origin === origin && !sessionStorage.getItem('solo-qa-seeded')) {
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
      sessionStorage.setItem('solo-qa-seeded', '1');
    }
  }, { origin: service.url, values: { ...baseline, ...seed } });
  const page = await context.newPage(); page.setDefaultTimeout(timeout);
  page.on('pageerror', error => { record.pageErrors.push(error.message); persist(); });
  page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => record.requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => { if (providerOrigins.has(new URL(response.url()).origin)) record.providerResponses.push({ url: response.url(), status: response.status() }); });
  await page.goto(`${service.url}/?qa=1&lang=${locale}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__HOME__));
  return { page, context, record, fault };
}
async function close(context) { await context.close(); contexts.delete(context); }
async function capture(page, name) {
  const phone = touchContexts.has(page.context());
  if (phone) await page.locator('.preview-frame').scrollIntoViewIfNeeded();
  const path = join(output, `${name}.png`); await page.screenshot({ path, fullPage: !phone });
  report.screenshots.push({ name, file: `${name}.png`, sha256: sha(readFileSync(path)), fullPage: !phone }); persist();
}
async function streetReady(page, mode) {
  await page.waitForFunction(expected => {
    const renderer = window.__TOUR_GAME__?.renderer();
    return window.__HOME__?.snapshot().sceneState === 'ready' && renderer?.status === 'ready' && renderer.renderedFrames > 0
      && renderer.lighting.phase === 'ready' && (!expected || renderer.lighting.mode === expected);
  }, mode);
  await page.waitForFunction(() => Boolean(window.__HOME__?.snapshot().currentView));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function mapReady(page) {
  await page.waitForFunction(() => window.__HOME__?.snapshot().map?.ready && Boolean(window.__HOME__.snapshot().currentView));
}
async function frames(page, before) {
  await page.waitForFunction(value => window.__TOUR_GAME__?.renderer().renderedFrames > value, before);
}
async function keyStep(page, code) {
  const before = await page.evaluate(() => window.__TOUR_GAME__.renderer().renderedFrames);
  await page.keyboard.press(code); await frames(page, before);
}
async function activate(page, selector) { if (touchContexts.has(page.context())) await page.locator(selector).tap(); else await page.locator(selector).click(); }
async function locale(page, value) { await activate(page, `#locale-${value}`); await page.waitForFunction(value => document.documentElement.lang === value, value); }
async function keep(page, title, note) {
  await activate(page, '#solo-keep');
  await page.locator('#kept-title').fill(title); await page.locator('#kept-note').fill(note);
  await activate(page, '#keep-place-form button[type=submit]');
  await page.locator('#keep-place-dialog').waitFor({ state: 'hidden' });
  return (await saved(page)).places[0];
}
async function reopen(page, place) {
  await activate(page, `[data-kept-open="${place.id}"]`);
  await page.waitForFunction(() => /saved view and place order are open|已打开收藏/.test(document.querySelector('#solo-status').textContent));
  return view(page);
}
async function isolate(page, id) {
  const actual = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(baseline));
  check(id, equal(actual, baseline), actual);
}
async function layout(page, id) {
  const actual = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
    rects: ['#solo-controls', '#solo-places', '.preview-frame'].map(selector => ({ selector, ...document.querySelector(selector).getBoundingClientRect().toJSON() })) }));
  check(id, actual.width <= page.viewportSize().width + 1 && actual.rects.every(rect => rect.right <= page.viewportSize().width + 1 && rect.left >= -1), actual);
}
async function search(page, query, predicate) {
  await page.locator('#place-query').fill(query); await activate(page, '#search-submit');
  await page.waitForFunction(() => document.querySelector('#place-search').getAttribute('aria-busy') !== 'true');
  const texts = await page.locator('#search-results [data-result]').allTextContents();
  const index = texts.findIndex(predicate); if (index < 0) throw new Error(`Actual provider did not return requested place: ${query}; ${texts.join(' | ')}`);
  const result = page.locator('#search-results [data-result]').nth(index);
  if (touchContexts.has(page.context())) await result.tap(); else await result.click();
  await page.waitForFunction(() => !/Looking for places|正在寻找起点/.test(document.querySelector('#routes-status').textContent));
  await mapReady(page); return texts;
}
const nearbyCount = record => record.requests.filter(value => value.origin === 'https://en.wikipedia.org').length;
async function drag(page, selector, { dx = 90, dy = 15, button = 'left' } = {}) {
  const rect = await page.locator(selector).boundingBox();
  const x = rect.x + rect.width * 0.55, y = rect.y + rect.height * 0.5;
  await page.mouse.move(x, y); await page.mouse.down({ button }); await page.mouse.move(x + dx, y + dy, { steps: 8 }); await page.mouse.up({ button });
}
async function touchGesture(page, selector, twoFingers = false) {
  const rect = await page.locator(selector).boundingBox();
  const x = rect.x + rect.width * (selector.includes('world-map') ? 0.7 : 0.5), y = rect.y + rect.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const points = delta => twoFingers ? [{ x: x - 35 + delta, y: y - delta / 2, id: 1 }, { x: x + 35 + delta, y: y - delta / 2, id: 2 }]
    : [{ x: x + delta, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(0) });
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(i * 7) }); await page.waitForTimeout(35); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
}
async function run(name, body) {
  if (only && !only.includes(name)) return;
  try { await body(); }
  catch (error) { check(`${name}-completed`, false, { message: error.message, stack: error.stack }); }
  finally { for (const context of [...contexts]) await close(context); }
}

let streetPlace, areaPlace, eiffelPlace;
if (process.env.EXPERIENCE_QA_REUSE_REPORT) {
  const path = resolve(process.env.EXPERIENCE_QA_REUSE_REPORT), bytes = readFileSync(path), previous = JSON.parse(bytes);
  streetPlace = previous.checks.find(value => ['street-save-keeps-exact-v2-view-light-and-plain-note',
    'street-save-keeps-exact-v3-pack-view-light-and-plain-note'].includes(value.id) && value.pass)?.evidence;
  if (!streetPlace?.id || streetPlace.representation !== 'street') throw new Error('Previous report lacks a successful actual saved Kyoto view.');
  report.reusedRecordSource = { path, sha256: sha(bytes), recordId: streetPlace.id, packageSha256: previous.artifact.manifestSha256 };
}
try {
  service = await startServer({ port: 0, host: '127.0.0.1', databasePath: join(output, 'rooms.sqlite'), config: { provider: { apiKey: '', model: '' } } });
  const proxyURL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const proxy = proxyURL ? new URL(proxyURL) : null;
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || undefined, headless: true, args: ['--no-sandbox'],
    ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1', ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.browser = browser.version(); persist();

  await run('street', async () => {
    const { page, record } = await makeScenario('street'); await streetReady(page, 'day');
    const initial = await state(page), initialView = await view(page);
    const diagnostics = await page.evaluate(() => window.__TOUR_GAME__.renderer().scene);
    const materials = diagnostics.architecturalMaterials;
    const materialManifest = files.find(file => /materials\/.*manifest\.json$/.test(file.path));
    check('finish-maps-loaded-and-bound', materials?.appliedFinishes > 0 && materials.finishTextureCount === 4
      && materials.disposedReplacedMaps === 4 && materials.finishManifestHash === materialManifest?.sha256, { materials, materialManifest });
    check('solo-has-no-encounter-markers-or-auto-progress', diagnostics.markerCount === 0 && !initial.visitedIds.length && !Object.keys(initial.choiceIds).length, { diagnostics, initial });
    await page.locator('#live-stage').focus();
    await page.keyboard.down('ArrowRight');
    try { await page.waitForFunction(x => window.__TOUR_GAME__.snapshot().x > x + 0.35, initial.x); }
    finally { await page.keyboard.up('ArrowRight'); }
    const walked = await state(page);
    check('free-walk-changes-position-without-completion', Math.hypot(walked.x - initial.x, walked.y - initial.y) > 0.35 && !walked.visitedIds.length && !Object.keys(walked.choiceIds).length, walked);
    await page.locator('#solo-inspect').click();
    check('look-closer-focuses-stage', await page.locator('#live-stage').evaluate(node => node === document.activeElement), await page.evaluate(() => document.activeElement.id));
    const beforeTurn = await view(page);
    const turnFrame = await page.evaluate(() => window.__TOUR_GAME__.renderer().renderedFrames);
    for (let i = 0; i < 12; i++) await page.keyboard.press('l');
    await frames(page, turnFrame);
    const turned = await view(page);
    check('keyboard-orbit-exceeds-guided-limit-without-moving-player', Math.abs(turned.camera.azimuth - beforeTurn.camera.azimuth) > 0.8
      && equal(turned.player, beforeTurn.player) && (await camera(page)).solo, { beforeTurn, turned });
    await keyStep(page, 'i'); await keyStep(page, '-');
    const adjusted = await view(page);
    check('keyboard-tilt-zoom-change-actual-view', adjusted.camera.polar !== turned.camera.polar && adjusted.camera.distance > turned.camera.distance, adjusted);
    const beforePan = await view(page); await drag(page, '#live-stage canvas', { button: 'right', dx: 60, dy: -45 });
    await page.waitForFunction(before => JSON.stringify(window.__HOME__.snapshot().currentView?.camera.targetOffset) !== JSON.stringify(before), beforePan.camera.targetOffset);
    const afterPan = await view(page);
    check('right-drag-changes-framing-without-walk', !equal(beforePan.camera.targetOffset, afterPan.camera.targetOffset) && equal(beforePan.player, afterPan.player), { beforePan, afterPan });
    await page.locator('#preview-reset').click();
    await page.waitForFunction(() => Boolean(window.__HOME__.snapshot().currentView));
    if (!(await page.evaluate(() => window.__TOUR_GAME__.inspection().enabled))) await page.locator('#solo-inspect').click();
    await page.locator('#live-stage').focus();
    const keyboardStart = await view(page);
    let keyboardFocus = null;
    for (let i = 0; i < 16; i++) {
      await keyStep(page, 'Shift+i');
      keyboardFocus = await page.evaluate(() => window.__TOUR_GAME__.inspection().focus);
      if (keyboardFocus) break;
    }
    check('keyboard-pan-can-aim-at-actual-facade', Boolean(keyboardFocus) && equal((await view(page)).player, keyboardStart.player), { keyboardStart, actual: await view(page), keyboardFocus });
    if (keyboardFocus) {
      const framing = await view(page); await page.keyboard.press('e'); await page.locator('#solo-inspection').waitFor();
      check('keyboard-inspect-selects-visible-feature-without-reframing', (await page.evaluate(() => window.__TOUR_GAME__.inspection().selected?.id)) === keyboardFocus.id
        && closeEnough(await view(page), framing), await page.evaluate(() => window.__TOUR_GAME__.inspection()));
      await page.locator('#solo-close-detail').click();
    }
    await page.locator('#preview-reset').click();
    const rect = await page.locator('#live-stage canvas').boundingBox();
    let found = null;
    // 通过实际鼠标扫描可见表面；只读观察器提供命中结果，不能设置命中。
    for (const y of [0.2, 0.32, 0.44, 0.56, 0.68]) {
      for (const x of [0.2, 0.35, 0.5, 0.65, 0.8]) {
        await page.mouse.move(rect.x + rect.width * x, rect.y + rect.height * y);
        await page.waitForTimeout(90);
        found = await page.evaluate(() => window.__TOUR_GAME__.inspection().focus);
        if (found) break;
      }
      if (found) break;
    }
    check('visible-facade-offers-source-bound-cue', Boolean(found) && ['mitsui-window-bays', 'daiya-vertical-facade'].includes(found.id), found);
    if (found) {
      const beforeInspect = await view(page);
      check('approach-and-cue-do-not-select', !(await page.evaluate(() => window.__TOUR_GAME__.inspection().selected)), await page.evaluate(() => window.__TOUR_GAME__.inspection()));
      await page.locator('#solo-detail').click(); await page.locator('#solo-inspection').waitFor();
      check('explicit-inspection-matches-cue-and-preserves-framing', (await page.evaluate(() => window.__TOUR_GAME__.inspection().selected?.id)) === found.id
        && closeEnough(await view(page), beforeInspect) && await page.locator('#inspection-sources a').count() > 0, { selected: await page.evaluate(() => window.__TOUR_GAME__.inspection()), beforeInspect, after: await view(page) });
      await locale(page, 'zh');
      check('inspection-localizes-without-reframing', /三井|钻石/.test(await page.locator('#inspection-title').textContent()) && closeEnough(await view(page), beforeInspect), await page.locator('#inspection-detail').textContent());
      await capture(page, 'street-inspection-zh');
      await page.locator('#solo-close-detail').click();
      check('close-detail-clears-selection-keeps-view', !(await page.evaluate(() => window.__TOUR_GAME__.inspection().selected)) && closeEnough(await view(page), beforeInspect), await view(page));
    }
    await page.locator('#live-stage').focus(); await page.keyboard.press('Escape');
    check('escape-resumes-walking-mode', !(await page.evaluate(() => window.__TOUR_GAME__.inspection().enabled)), await camera(page));
    await page.locator('#lighting-night').click(); await streetReady(page, 'night');
    const beforeKeep = await view(page), privateNote = '<img src=x onerror="window.soloInjected=1"> 私人夜景';
    await page.locator('#solo-keep').click(); await page.locator('#kept-note').fill(privateNote);
    const paused = await state(page); await page.locator('#kept-note').press('w');
    check('note-editing-pauses-world', paused.paused && equal((await view(page)).player, beforeKeep.player), await state(page));
    await page.locator('#kept-title').fill('Night windows 夜景'); await page.locator('#kept-note').fill(privateNote);
    await page.locator('#keep-place-form button[type=submit]').click(); await page.locator('#keep-place-dialog').waitFor({ state: 'hidden' });
    streetPlace = (await saved(page)).places[0];
    check('street-save-keeps-exact-v3-pack-view-light-and-plain-note', streetPlace.view.version === 3
      && streetPlace.view.packId === 'shijo-karasuma' && streetPlace.view.revision === 1 && streetPlace.lighting === 'night'
      && closeEnough(streetPlace.view, beforeKeep) && streetPlace.note === privateNote && !(await page.evaluate(() => window.soloInjected)), streetPlace);
    await page.reload(); await streetReady(page); await reopen(page, streetPlace);
    check('street-reopen-after-reload-restores-exact-view', closeEnough(await view(page), streetPlace.view)
      && (await page.evaluate(() => window.__TOUR_GAME__.renderer().lighting.mode)) === 'night', { saved: streetPlace.view, actual: await view(page) });
    await locale(page, 'en'); check('locale-preserves-private-note-and-camera', closeEnough(await view(page), streetPlace.view)
      && (await saved(page)).places[0].note === privateNote, await view(page));
    await capture(page, 'street-kept-night-en'); await layout(page, 'desktop-solo-layout');
    const warmCounts = [];
    for (const mode of ['day', 'night', 'day', 'night']) { await page.locator(`#lighting-${mode}`).click(); await streetReady(page, mode); warmCounts.push(await page.evaluate(() => window.__TOUR_GAME__.renderer().memory.textures)); }
    check('warm-light-switches-retain-bounded-textures', warmCounts[0] === warmCounts[2] && warmCounts[1] === warmCounts[3], { modes: ['day', 'night', 'day', 'night'], counts: warmCounts });
    const retained = await view(page); await page.locator('#mode-together').click(); await mapReady(page);
    const hidden = await page.evaluate(() => window.__TOUR_GAME__.renderer()); await page.waitForTimeout(1000);
    const stillHidden = await page.evaluate(() => window.__TOUR_GAME__.renderer());
    check('together-suspends-private-street-work', !stillHidden.visible && hidden.updateFrames === stillHidden.updateFrames && hidden.renderedFrames === stillHidden.renderedFrames, { hidden, stillHidden });
    await page.locator('#traveler-name').fill('QA traveler'); await page.locator('#room-title').fill('Private-view isolation'); await page.locator('#room-create').click();
    await page.waitForFunction(() => Boolean(window.__HOME__.snapshot().room));
    const room = (await home(page)).room;
    check('private-note-is-not-in-room', !JSON.stringify(room).includes(privateNote) && !JSON.stringify(room).includes('Night windows'), { participants: room.participants.length, dreams: room.dreams.length });
    await page.locator('#mode-explore').click(); await streetReady(page, 'night');
    check('return-from-together-keeps-private-view', closeEnough(await view(page), retained), { retained, actual: await view(page) });
    await isolate(page, 'street-and-room-preserve-legacy-records');
    check('street-has-no-unhandled-browser-errors', record.pageErrors.length === 0 && record.external.length === 0, record.pageErrors);
  });

  await run('map', async () => {
    const seed = streetPlace ? { [key]: JSON.stringify({ version: 1, places: [streetPlace] }) } : {};
    const { page, record, fault } = await makeScenario('map', { seed });
    const results = await search(page, 'Shijo Bridge Kyoto', text => /Shij[oō]|四条|四條/i.test(text));
    const selected = await home(page);
    check('actual-shijo-search-enters-approximate-map', !selected.localPreview && await page.locator('#world-map').isVisible()
      && record.providerResponses.some(value => value.url.includes('photon') && value.status === 200), { results, center: selected.center });
    check('selected-search-result-clears-choice-prompt', !(await page.locator('#search-status').textContent()).trim(), await page.locator('#search-status').textContent());
    const beforePan = await view(page), beforeNearby = nearbyCount(record);
    await drag(page, '#world-map canvas', { dx: 85, dy: 40 }); await mapReady(page);
    const panned = await view(page);
    check('manual-map-pan-does-not-discover-or-rename-place', !closeEnough(beforePan.center, panned.center) && nearbyCount(record) === beforeNearby
      && (await home(page)).center.id === selected.center.id, { beforePan, panned, beforeNearby, afterNearby: nearbyCount(record) });
    await page.locator('#solo-area').click(); await page.waitForFunction(() => !/Looking for places|正在寻找起点/.test(document.querySelector('#routes-status').textContent)); await mapReady(page);
    const area = await home(page);
    check('explicit-area-search-uses-visible-center', area.center.kind === 'area' && Math.abs(area.center.longitude - panned.center[0]) < 0.000001
      && Math.abs(area.center.latitude - panned.center[1]) < 0.000001 && nearbyCount(record) > beforeNearby && closeEnough((await view(page)).center, panned.center), { center: area.center, view: await view(page), requests: record.requests.filter(value => value.origin.includes('wikipedia')) });
    if (await page.locator('#route-options [data-route]').count() > 1) await page.locator('#route-options [data-route]').nth(1).click();
    const selectedIndex = Number(await page.locator('#route-options [aria-pressed="true"]').getAttribute('data-route'));
    const stopIds = (await home(page)).routes[selectedIndex].stops;
    await drag(page, '#world-map canvas', { dx: 40, dy: -40, button: 'right' }); await mapReady(page);
    areaPlace = await keep(page, 'River area 川辺', 'My private area note');
    check('map-save-keeps-center-orientation-and-selected-order', areaPlace.representation === 'map' && closeEnough(areaPlace.view, await view(page))
      && equal(areaPlace.route.stops.map(stop => stop.id), stopIds), { saved: areaPlace, actual: await view(page), selectedStopIds: stopIds });
    await locale(page, 'zh');
    check('area-locale-keeps-camera-and-order', closeEnough(await view(page), areaPlace.view)
      && equal((await home(page)).routes[selectedIndex].stops, stopIds), await home(page));
    await capture(page, 'map-area-kept-zh');
    const eiffelResults = await search(page, 'Eiffel Tower', text => /Eiffel|艾菲尔|埃菲尔/i.test(text));
    eiffelPlace = await keep(page, 'Paris view', 'A second place, same private list');
    check('cross-place-list-retains-independent-sources', eiffelPlace.center.longitude < 3 && areaPlace.center.longitude > 135 && (await saved(page)).places.some(value => value.id === areaPlace.id), { eiffelResults, eiffel: eiffelPlace.center, area: areaPlace.center });
    check('actual-paris-order-excludes-reviewed-coordinate-conflict', (await home(page)).routes.every(route => !route.stops.includes('wikipedia:en:48435351')), (await home(page)).routes);
    await reopen(page, areaPlace); await drag(page, '#world-map canvas', { dx: -65, dy: 50 }); await mapReady(page);
    let releaseQuery; fault.wait = new Promise(resolve => { releaseQuery = resolve; });
    fault.delay = url => url.origin === 'https://en.wikipedia.org';
    const requestStart = nearbyCount(record);
    await page.locator('#solo-area').click();
    await page.waitForFunction(() => /Looking for places|正在寻找起点/.test(document.querySelector('#routes-status').textContent));
    const until = Date.now() + timeout;
    while (nearbyCount(record) === requestStart && Date.now() < until) await page.waitForTimeout(50);
    if (nearbyCount(record) === requestStart) throw new Error('Explicit area query never reached the actual provider request.');
    const delayedURL = record.requests.filter(value => value.origin === 'https://en.wikipedia.org').at(-1);
    await reopen(page, eiffelPlace); fault.delay = null; releaseQuery();
    await page.waitForTimeout(300);
    check('superseded-area-response-does-not-replace-kept-paris-view', closeEnough(await view(page), eiffelPlace.view)
      && (await home(page)).center.id === eiffelPlace.center.id, { delayedRequest: delayedURL, actual: await home(page), requestFailures: record.requestFailures });
    await drag(page, '#world-map canvas', { dx: 55, dy: 30 }); await mapReady(page);
    const beforeDenied = await view(page), keptBeforeDenied = (await saved(page)).places.map(place => place.id);
    fault.deny = url => url.origin === 'https://en.wikipedia.org';
    await page.locator('#solo-area').click(); await page.locator('#routes-retry').waitFor();
    check('provider-denial-retains-map-and-private-list', closeEnough(await view(page), beforeDenied)
      && equal((await saved(page)).places.map(place => place.id), keptBeforeDenied) && record.denied.length > 0,
      { view: await view(page), status: await page.locator('#routes-status').textContent(), denied: record.denied });
    fault.deny = null; await page.locator('#routes-retry').click();
    await page.waitForFunction(() => !/Looking for places|正在寻找起点/.test(document.querySelector('#routes-status').textContent));
    check('nearby-retry-uses-actual-provider', await page.locator('#routes-retry').isHidden()
      && (await home(page)).center.kind === 'area', { status: await page.locator('#routes-status').textContent(), routes: (await home(page)).routes });
    await page.reload(); await page.waitForFunction(() => Boolean(window.__HOME__));
    const requestsBeforeReturn = nearbyCount(record); await reopen(page, areaPlace);
    check('map-reopen-after-reload-preserves-exact-view-and-order', closeEnough(await view(page), areaPlace.view)
      && equal((await home(page)).routes[0].stops, areaPlace.route.stops.map(stop => stop.id)) && nearbyCount(record) === requestsBeforeReturn, { saved: areaPlace, actual: await home(page) });
    const beforeLocale = (await home(page)).map;
    await locale(page, 'en'); await mapReady(page);
    check('reopened-map-language-does-not-reframe', closeEnough(await view(page), areaPlace.view)
      && (await home(page)).map.cameraTransitions === beforeLocale.cameraTransitions, { before: beforeLocale, actual: await view(page), map: (await home(page)).map });
    check('same-size-locale-change-does-not-resize-map', typeof beforeLocale.resizeEvents === 'number'
      && (await home(page)).map.resizeEvents === beforeLocale.resizeEvents, { before: beforeLocale.resizeEvents, after: (await home(page)).map.resizeEvents });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForFunction(previous => {
      const canvas = document.querySelector('#world-map canvas');
      return window.__HOME__.snapshot().map.resizeEvents > previous && Math.abs(canvas.width - canvas.closest('#world-map').clientWidth) < 2;
    }, beforeLocale.resizeEvents);
    await mapReady(page);
    const resized = await page.locator('#world-map canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height,
      rect: canvas.getBoundingClientRect().toJSON(), host: canvas.closest('#world-map').getBoundingClientRect().toJSON() }));
    check('actual-viewport-resize-updates-canvas-and-keeps-map-pose', (await home(page)).map.resizeEvents > beforeLocale.resizeEvents
      && Math.abs(resized.rect.width - resized.host.width) < 1 && Math.abs(resized.width - resized.host.width) < 2
      && closeEnough(await view(page), areaPlace.view), { resized, map: (await home(page)).map, view: await view(page) });
    if (streetPlace) {
      await reopen(page, streetPlace); await streetReady(page, 'night');
      await page.setViewportSize({ width: 1440, height: 1000 }); await reopen(page, areaPlace);
      const returned = await page.locator('#world-map canvas').evaluate(canvas => ({ width: canvas.width, hostWidth: canvas.closest('#world-map').clientWidth }));
      check('hidden-map-resize-reopens-correct-canvas-and-saved-pose', Math.abs(returned.width - returned.hostWidth) < 2
        && closeEnough(await view(page), areaPlace.view), { returned, view: await view(page), map: (await home(page)).map });
    }
    await page.locator(`[data-kept-remove="${eiffelPlace.id}"]`).click(); await page.locator('#solo-cancel-remove').click();
    check('remove-cancel-preserves-record', (await saved(page)).places.some(value => value.id === eiffelPlace.id), (await saved(page)).places.map(value => value.id));
    await page.locator(`[data-kept-remove="${eiffelPlace.id}"]`).click(); await page.locator('#solo-confirm-remove').click();
    check('explicit-remove-only-removes-selected-record', !(await saved(page)).places.some(value => value.id === eiffelPlace.id)
      && (await saved(page)).places.some(value => value.id === areaPlace.id), (await saved(page)).places.map(value => value.id));
    const countryCount = nearbyCount(record); await search(page, 'Japan', text => /Japan|日本/.test(text));
    check('country-disables-area-query-and-skips-nearby', (await home(page)).center.kind === 'country' && await page.locator('#solo-area').isDisabled()
      && nearbyCount(record) === countryCount, await home(page));
    await isolate(page, 'map-operations-preserve-legacy-records');
    check('actual-provider-map-no-page-exceptions', record.pageErrors.length === 0 && record.external.length === 0, record.pageErrors);
  });

  await run('phone', async () => {
    const { page, record } = await makeScenario('phone', { mobile: true }); await streetReady(page, 'day');
    for (const language of ['en', 'zh']) {
      await locale(page, language); await page.locator('#solo-inspect').scrollIntoViewIfNeeded();
      const mode = language === 'en' ? 'day' : 'night';
      await page.locator(`#lighting-${mode}`).tap(); await streetReady(page, mode);
      const touchHelp = await page.evaluate(() => ({ coarse: matchMedia('(pointer: coarse)').matches,
        fine: matchMedia('(pointer: fine)').matches, guidance: document.querySelector('#view-guidance').textContent, lastInput: window.__QA_INPUT_LOG__.at(-1) }));
      check(`phone-${language}-actual-tap-keeps-touch-guidance`, touchHelp.lastInput?.type === 'touch' && touchHelp.lastInput.trusted
        && /Tap|轻触/.test(touchHelp.guidance), touchHelp);
      if (language === 'en') {
        await page.locator('#lighting-day').click();
        const mouseHelp = await page.evaluate(() => ({ touch: window.__HOME__.snapshot().touchControls, input: window.__QA_INPUT_LOG__.at(-1), guidance: document.querySelector('#view-guidance').textContent }));
        await page.locator('#lighting-day').tap();
        const restoredTouchHelp = await page.evaluate(() => ({ touch: window.__HOME__.snapshot().touchControls, input: window.__QA_INPUT_LOG__.at(-1), guidance: document.querySelector('#view-guidance').textContent }));
        check('hybrid-actual-mouse-and-touch-select-appropriate-guidance', mouseHelp.input?.type === 'mouse' && mouseHelp.touch === false
          && /Click/.test(mouseHelp.guidance) && restoredTouchHelp.input?.type === 'touch' && restoredTouchHelp.touch === true
          && /Tap/.test(restoredTouchHelp.guidance), { mouseHelp, restoredTouchHelp });
      }
      if (!(await page.evaluate(() => window.__TOUR_GAME__.inspection().enabled))) await page.locator('#solo-inspect').tap();
      await page.locator('#live-stage canvas').scrollIntoViewIfNeeded();
      const before = await view(page); await touchGesture(page, '#live-stage canvas');
      await page.waitForFunction(before => Math.abs(window.__HOME__.snapshot().currentView.camera.azimuth - before) > 0.05, before.camera.azimuth);
      const turned = await view(page);
      check(`phone-${language}-touch-orbit-without-walking`, equal(turned.player, before.player) && !closeEnough(turned.camera, before.camera), { before, turned });
      await touchGesture(page, '#live-stage canvas', true);
      await page.waitForFunction(before => JSON.stringify(window.__HOME__.snapshot().currentView.camera.targetOffset) !== JSON.stringify(before), turned.camera.targetOffset);
      check(`phone-${language}-two-finger-aim`, !closeEnough((await view(page)).camera.targetOffset, turned.camera.targetOffset) && equal((await view(page)).player, turned.player), await view(page));
      await page.locator('#solo-keep').tap(); await page.locator('#kept-note').fill(language === 'zh' ? '触屏私人草稿' : 'Touch private draft');
      await page.locator('#solo-cancel-keep').tap();
      check(`phone-${language}-cancel-note-preserves-world`, !(await saved(page)).places.length && equal((await view(page)).player, turned.player), await view(page));
      await layout(page, `phone-${language}-no-horizontal-overflow`); await capture(page, `phone-${language}-inspection-controls`);
    }
    await search(page, 'Shijo Bridge Kyoto', text => /Shij[oō]|四条|四條/i.test(text));
    await page.locator('#world-map canvas').scrollIntoViewIfNeeded();
    const beforeMap = await view(page), queriesBeforePan = nearbyCount(record);
    await touchGesture(page, '#world-map canvas', true); await mapReady(page);
    const pannedMap = await view(page);
    check('phone-touch-map-pan-is-deliberate-without-query', !closeEnough(beforeMap.center, pannedMap.center)
      && nearbyCount(record) === queriesBeforePan, { beforeMap, pannedMap });
    await activate(page, '#solo-area'); await page.waitForFunction(() => !/Looking for places|正在寻找起点/.test(document.querySelector('#routes-status').textContent)); await mapReady(page);
    const phoneArea = (await home(page)).center;
    check('phone-area-action-uses-touch-panned-center', phoneArea.kind === 'area' && closeEnough([phoneArea.longitude, phoneArea.latitude], pannedMap.center), phoneArea);
    const phoneSaved = await keep(page, '鸭川边的视角', '在水边停一下');
    await page.reload(); await page.waitForFunction(() => Boolean(window.__HOME__)); await reopen(page, phoneSaved);
    check('phone-kept-map-reloads-exact-view-order-and-note', closeEnough(await view(page), phoneSaved.view)
      && equal((await home(page)).routes[0].stops, phoneSaved.route.stops.map(stop => stop.id))
      && (await saved(page)).places[0].note === '在水边停一下' && /探索/.test(await page.locator('#solo-area').textContent()), { saved: phoneSaved, actual: await home(page) });
    await layout(page, 'phone-kept-map-no-horizontal-overflow'); await capture(page, 'phone-zh-kept-map');
    await isolate(page, 'phone-preserves-legacy-records');
    check('phone-no-page-exceptions', record.pageErrors.length === 0, record.pageErrors);
  });

  await run('finish-recovery', async () => {
    const fault = { deny: url => url.pathname.startsWith('/materials/') && url.pathname.endsWith('.png') };
    const { page, record } = await makeScenario('finish-recovery', { fault });
    await page.waitForFunction(() => window.__HOME__?.snapshot().sceneState === 'error');
    check('missing-finish-is-visible-startup-failure', record.denied.length > 0 && await page.locator('#scene-retry').isVisible()
      && await page.locator('#solo-keep').isDisabled(), { denied: record.denied, status: await page.locator('#scene-status').textContent() });
    fault.deny = null; await page.locator('#scene-retry').click(); await streetReady(page, 'day');
    check('finish-retry-loads-real-maps', (await page.evaluate(() => window.__TOUR_GAME__.renderer().scene.architecturalMaterials.finishTextureCount)) === 4
      && await page.locator('#solo-keep').isEnabled(), await page.evaluate(() => window.__TOUR_GAME__.renderer().scene.architecturalMaterials));
    await capture(page, 'finish-retry-ready');
  });

  if (areaPlace && streetPlace) await run('map-restore-recovery', async () => {
    const seed = { [key]: JSON.stringify({ version: 1, places: [areaPlace, streetPlace] }) };
    const fault = { deny: url => url.origin === 'https://tiles.openfreemap.org' };
    const { page, record } = await makeScenario('map-restore-recovery', { seed, fault });
    await page.locator(`[data-kept-open="${areaPlace.id}"]`).click();
    await page.waitForFunction(() => /could not fully reopen|未能完整/.test(document.querySelector('#solo-status').textContent));
    check('failed-map-reopen-never-announces-success', await page.locator('#solo-keep').isDisabled() && (await saved(page)).places.length === 2
      && record.denied.length > 0, { status: await page.locator('#solo-status').textContent(), map: (await home(page)).map });
    fault.deny = null; await page.locator('#scene-retry').click(); await mapReady(page); await reopen(page, areaPlace);
    check('map-retry-restores-exact-saved-camera', closeEnough(await view(page), areaPlace.view), { actual: await view(page), saved: areaPlace.view });
    await close(page.context());
    let release; const wait = new Promise(resolve => { release = resolve; });
    const delayed = { delay: url => url.origin === 'https://tiles.openfreemap.org', wait };
    const next = await makeScenario('superseded-map-restore', { seed, fault: delayed });
    await next.page.locator(`[data-kept-open="${areaPlace.id}"]`).click();
    await next.page.waitForFunction(() => /Returning|正在返回/.test(document.querySelector('#solo-status').textContent));
    await next.page.locator(`[data-kept-open="${streetPlace.id}"]`).click(); delayed.delay = null; release();
    await streetReady(next.page, 'night'); await next.page.waitForFunction(() => /saved view and place order are open|已打开收藏/.test(document.querySelector('#solo-status').textContent));
    check('superseded-map-restore-cannot-overwrite-street-selection', closeEnough(await view(next.page), streetPlace.view)
      && (await home(next.page)).center.id === streetPlace.center.id && await next.page.locator('#live-stage').isVisible(), await home(next.page));
  });

  await run('malformed-storage', async () => {
    const invalid = '{"version":999,"places":[]}';
    const { page } = await makeScenario('malformed-storage', { seed: { [key]: invalid } }); await streetReady(page);
    check('malformed-private-record-is-preserved-with-visible-error', (await home(page)).solo.storageError && await page.locator('#solo-keep').isDisabled()
      && await page.evaluate(({ key, invalid }) => localStorage.getItem(key) === invalid, { key, invalid }), await page.locator('#solo-status').textContent());
    await isolate(page, 'malformed-private-record-does-not-touch-older-records');
  });

  await run('storage-quota', async () => {
    const { page } = await makeScenario('storage-quota'); await streetReady(page);
    const quota = await page.evaluate(() => {
      let entries = 0, failure;
      for (const size of [65536, 1024, 16]) {
        let reached = false;
        try { for (let i = 0; i < 256; i++, entries++) localStorage.setItem(`solo-qa-quota-${entries}`, 'q'.repeat(size)); }
        catch (error) { failure = error.name; reached = true; }
        if (!reached) throw new Error('Browser did not reach localStorage quota within the bounded fixture.');
      }
      return { entries, error: failure };
    });
    await page.locator('#solo-keep').click(); await page.locator('#kept-title').fill('Quota recovery'); await page.locator('#kept-note').fill('Keep this draft');
    await page.locator('#keep-place-form button[type=submit]').click();
    check('actual-storage-quota-keeps-dialog-and-draft', quota.error === 'QuotaExceededError' && await page.locator('#keep-place-dialog').isVisible()
      && /could not be saved|无法保存/.test(await page.locator('#keep-error').textContent()) && await page.locator('#kept-note').inputValue() === 'Keep this draft'
      && !(await saved(page)).places.length, quota);
    await page.evaluate(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('solo-qa-quota-')) localStorage.removeItem(key); });
    await page.locator('#keep-place-form button[type=submit]').click(); await page.locator('#keep-place-dialog').waitFor({ state: 'hidden' });
    check('storage-retry-saves-preserved-draft', (await saved(page)).places[0]?.note === 'Keep this draft', await saved(page));
    await isolate(page, 'quota-recovery-preserves-legacy-records');
  });
  check('all-scenarios-have-no-page-exceptions-or-unexpected-external-calls', Object.values(report.scenarios).every(value => !value.pageErrors.length && !value.external.length),
    Object.fromEntries(Object.entries(report.scenarios).map(([name, value]) => [name, { pageErrors: value.pageErrors, external: value.external }])));
} finally {
  for (const context of [...contexts]) await close(context);
  if (browser) await browser.close(); if (service) await service.close();
  report.finishedAt = new Date().toISOString(); report.passed = report.checks.filter(check => check.pass).length;
  report.failed = report.checks.filter(check => !check.pass).length; persist();
  if (report.failed) process.exitCode = 1;
}
