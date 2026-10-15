// 检查实际构建产物和浏览器 API；显式传入构建目录才能发现打包遗漏。
// Geolocation 输入由浏览器测试控制，证据范围包括界面行为和数据处理。
import { chromium } from 'playwright';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PLACES } from '../src/travel/places.js';

if (!process.argv[2]) {
  console.error('Usage: node tests/browser-travel.mjs <built-dist-directory>');
  process.exit(2);
}
const dist = resolve(process.argv[2]);
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || join('..', 'artifacts', 'travel-qa'));
const timeout = Number(process.env.EXPERIENCE_QA_TIMEOUT || 30000);
const origin = 'http://127.0.0.1:4187';
const entry = `${origin}/travel.html?qa=1`;
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
if (!assets.has('/travel.html')) throw new Error('Built travel.html is missing; build the application before this check.');
mkdirSync(output, { recursive: true });
const files = [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const report = {
  startedAt: new Date().toISOString(),
  artifact: { directory: dist, manifestSha256: sha(JSON.stringify(files)), files },
  driverSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  conditions: { desktopViewport: [1440, 1000], phoneViewport: [390, 844], timeoutMs: timeout },
  checks: [], scenarios: {}, screenshots: [], outputs: [],
  limitations: [
    'Geolocation is an explicit controllable browser fixture, not a measured GPS trace or permission-system test.',
    'Visibility changes are injected because headless background-tab behavior does not establish physical-device lifecycle behavior.',
    'Mobile emulation does not establish physical-device ergonomics or real walking safety.',
    'Google Maps URLs are inspected without contacting Google; app installation, directions accuracy and recipient delivery are untested.',
    'Clipboard/native-share stubs establish attempted handoff and recovery, not OS delivery.',
  ],
};
const persist = () => writeFileSync(join(output, 'travel-result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, passed, evidence) {
  report.checks.push({ id, pass: Boolean(passed), evidence });
  persist(); console.log(`${passed ? 'PASS' : 'FAIL'} ${id}`);
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.woff': 'font/woff', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v1-completed.json', import.meta.url)));
const baseline = {
  'tourguideai:journey:v2': JSON.stringify({ version: 2, locale: 'zh', hints: true, game: { ...legacy.game, x: 31.25, y: 2.1 }, notes: { crossing: 'Private original journey fixture' } }),
  'tourguideai:perspective:v1': JSON.stringify({ version: 1, chapter: 'kyoto-looking-closer', locale: 'en', mode: 'story', index: 1, revealedIds: ['arrive'], moments: [{ momentId: 'arrive', note: 'Private perspective fixture', view: { kind: 'story', scale: 1.2, x: 0.45, y: 0.6 } }], trial: { assignment: 'story', source: 'choice', crossover: false }, feedback: null }),
  'tourguideai:appearance:v1': '{"lighting":"night"}',
};
let browser;
const contexts = new Set();
async function scenario(name, { language = 'en', mobile = false, clipboard = 'ok', nativeShare = 'absent', seed = {}, storageDenied = false, geolocationMode = 'controlled', clock = false } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile,
    ...(geolocationMode === 'native' ? { permissions: ['geolocation'], geolocation: { latitude: 35.00381234, longitude: 135.75951234, accuracy: 8 } } : {}) });
  contexts.add(context);
  const record = report.scenarios[name] = { requests: [], externalRequests: [], pageErrors: [], consoleErrors: [] };
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { record.externalRequests.push(url.href); return route.abort('blockedbyclient'); }
    const path = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    record.requests.push(path);
    if (!assets.has(path)) return route.fulfill({ status: 404, body: 'Missing packaged asset' });
    return route.fulfill({ status: 200, contentType: mime[extname(path)] || 'application/octet-stream', body: assets.get(path) });
  });
  await context.addInitScript(({ baseline, seed, clipboard, nativeShare, storageDenied, geolocationMode, origin }) => {
    if (location.origin !== origin) return;
    if (!sessionStorage.getItem('qa-seeded')) {
      for (const [key, value] of Object.entries({ ...baseline, ...seed })) localStorage.setItem(key, value);
      sessionStorage.setItem('qa-seeded', '1');
    }
    const fixture = window.__TRAVEL_BROWSER_FIXTURE__ = { writes: [], copied: [], shares: [], watches: [], cleared: [], geolocationEvents: [], oneShotRequests: 0, visible: true };
    const callbacks = new Map(), browserGeolocation = navigator.geolocation;
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      watchPosition(success, error, options) {
        const onSuccess = position => { fixture.geolocationEvents.push({ type: 'position', latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: position.timestamp }); success(position); };
        const onError = value => { fixture.geolocationEvents.push({ type: 'error', code: value.code, message: value.message }); error(value); };
        const id = geolocationMode === 'native' ? browserGeolocation.watchPosition(onSuccess, onError, options) : fixture.watches.length + 1;
        callbacks.set(id, { success, error }); fixture.watches.push({ id, options }); return id;
      },
      clearWatch(id) { fixture.cleared.push(id); if (geolocationMode === 'native') browserGeolocation.clearWatch(id); },
      getCurrentPosition(...args) { fixture.oneShotRequests++; if (geolocationMode === 'native') browserGeolocation.getCurrentPosition(...args); },
    } });
    // 保留取消后的回调，用于检查已经排队的迟到结果。
    fixture.position = (id, { latitude, longitude, accuracy = 8, age = 0, timestamp }) => callbacks.get(id)?.success({
      coords: { latitude, longitude, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: timestamp ?? Date.now() - age,
    });
    fixture.error = (id, code) => callbacks.get(id)?.error({ code, message: 'Deliberate QA geolocation error' });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => fixture.visible ? 'visible' : 'hidden' });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => !fixture.visible });
    fixture.setVisible = value => { fixture.visible = value; document.dispatchEvent(new Event('visibilitychange')); };
    for (const method of ['setItem', 'removeItem', 'clear', 'getItem']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        if (this === localStorage) {
          if (method !== 'getItem') fixture.writes.push({ method, key: args[0], value: args[1] });
          if (storageDenied) throw new DOMException('QA storage denied', 'SecurityError');
        }
        return original.apply(this, args);
      };
    }
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { async writeText(text) {
      fixture.copied.push(text); if (clipboard === 'denied') throw new DOMException('QA clipboard denied', 'NotAllowedError');
    } } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare === 'absent' ? undefined : async value => {
      fixture.shares.push(value); if (nativeShare === 'cancel') throw new DOMException('QA share cancelled', 'AbortError');
    } });
  }, { baseline, seed, clipboard, nativeShare, storageDenied, geolocationMode, origin });
  context.on('page', page => {
    page.on('pageerror', error => record.pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push(message.text()); });
  });
  const page = await context.newPage(); page.setDefaultTimeout(timeout);
  if (clock) await page.clock.install({ time: new Date() });
  await page.goto(`${entry}&lang=${language}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#location-start').waitFor();
  return { page, context, record };
}
const fixture = page => page.evaluate(() => ({ ...window.__TRAVEL_BROWSER_FIXTURE__, position: undefined, error: undefined, setVisible: undefined }));
const storage = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
async function isolate(page, id) {
  const current = await storage(page);
  check(id, Object.entries(baseline).every(([key, value]) => current[key] === value), { expected: baseline, current });
}
async function capture(page, name, mobile = false) {
  const path = join(output, `${name}.png`); await page.screenshot({ path, fullPage: !mobile });
  report.screenshots.push({ name, path, sha256: sha(readFileSync(path)) }); persist();
}
async function runCase(name, run) {
  try { await run(); } catch (error) {
    const observations = [];
    for (const context of contexts) for (const page of context.pages()) {
      observations.push(await page.evaluate(() => ({ fixture: { ...window.__TRAVEL_BROWSER_FIXTURE__, position: undefined, error: undefined, setVisible: undefined },
        locationStatus: document.querySelector('#location-status')?.outerHTML, gps: document.querySelector('#gps-layer')?.outerHTML })));
    }
    check(`${name}-completed`, false, { message: error.message, stack: error.stack, observations });
  }
  finally { for (const context of [...contexts]) { await context.close(); contexts.delete(context); } }
}

// 每个独立场景记录自己的浏览器错误，便于判断定位和行程编辑的具体问题。
const status = page => page.locator('#location-status').getAttribute('data-state');
const waitStatus = (page, value) => page.waitForFunction(value => document.querySelector('#location-status')?.dataset.state === value, value);
const gps = page => page.evaluate(() => {
  const layer = document.querySelector('#gps-layer'), dot = document.querySelector('#gps-dot');
  return { visible: getComputedStyle(layer).display !== 'none' && layer.getAttribute('aria-hidden') !== 'true',
    quality: layer.dataset.quality, x: dot.getAttribute('cx'), y: dot.getAttribute('cy'),
    accuracy: document.querySelector('#location-accuracy').textContent };
});
const selected = page => page.locator('#selected-list [data-place-id]').evaluateAll(nodes => nodes.map(node => node.dataset.placeId));
const watchId = async page => (await fixture(page)).watches.at(-1).id;
const emit = (page, id, position) => page.evaluate(({ id, position }) => window.__TRAVEL_BROWSER_FIXTURE__.position(id, position), { id, position });
const fix = { latitude: 35.00381234, longitude: 135.75951234, accuracy: 8 };
async function updateNativePosition(page, context, position) {
  await context.setGeolocation(position);
  await page.waitForFunction(position => {
    const event = window.__TRAVEL_BROWSER_FIXTURE__.geolocationEvents.at(-1);
    return document.querySelector('#location-status').dataset.state === 'unavailable'
      || event?.type === 'position' && event.latitude === position.latitude && event.longitude === position.longitude && event.accuracy === position.accuracy;
  }, position);
  const requiresRetry = await status(page) === 'unavailable';
  if (requiresRetry) {
    // Chromium 更新模拟坐标时可能先报告 POSITION_UNAVAILABLE；按照界面要求重新启动。
    await page.locator('#location-start').click();
  }
  await waitStatus(page, position.accuracy > 50 ? 'uncertain' : 'tracking');
  return { requiresRetry, events: (await fixture(page)).geolocationEvents };
}

async function locationCases() {
  await runCase('native-browser-location', async () => {
    const { page, context } = await scenario('native-browser-location', { geolocationMode: 'native' });
    const before = await storage(page), initialShare = await page.locator('#share-text').inputValue();
    const initial = await fixture(page);
    check('location-start-is-explicit', initial.watches.length === 0 && initial.oneShotRequests === 0
      && await status(page) === 'idle' && !(await gps(page)).visible, { initial, gps: await gps(page) });
    await page.locator('#location-start').click(); await waitStatus(page, 'tracking');
    const first = await gps(page), native = await fixture(page);
    check('native-granted-position-renders-accuracy-and-marker', first.visible && first.quality === 'fresh'
      && /8/.test(first.accuracy) && native.watches.length === 1 && native.watches[0].options.enableHighAccuracy,
    { first, native, permission: await page.evaluate(async () => (await navigator.permissions.query({ name: 'geolocation' })).state) });
    await capture(page, 'travel-desktop-en');
    const update = await updateNativePosition(page, context, { latitude: 35.00391234, longitude: 135.75961234, accuracy: 11 });
    await page.waitForFunction(previous => {
      const dot = document.querySelector('#gps-dot'); return dot.getAttribute('cx') !== previous.x || dot.getAttribute('cy') !== previous.y;
    }, first);
    const second = await gps(page);
    check('native-location-update-or-explicit-provider-retry-moves-marker', second.visible && /11/.test(second.accuracy)
      && (second.x !== first.x || second.y !== first.y), { first, second, update });
    const poorUpdate = await updateNativePosition(page, context, { latitude: 35.00391234, longitude: 135.75961234, accuracy: 120 });
    check('native-poor-accuracy-is-labelled-uncertain', /120/.test((await gps(page)).accuracy)
      && (await gps(page)).quality === 'uncertain', { gps: await gps(page), message: await page.locator('#location-status').innerText(), update: poorUpdate });
    await capture(page, 'travel-location-uncertain');
    await updateNativePosition(page, context, { latitude: 35.68131234, longitude: 139.76711234, accuracy: 9 });
    check('outside-kyoto-is-not-plotted-as-an-in-map-location', !(await gps(page)).visible,
      { gps: await gps(page), text: await page.locator('#outside-area').innerText() });
    check('outside-area-has-an-explicit-explanation', await page.locator('#outside-area').isVisible()
      && /outside this small Kyoto area/.test(await page.locator('#outside-area').innerText()), {});
    await capture(page, 'travel-location-outside');
    check('sensor-updates-do-not-save-gps-or-mark-visits', JSON.stringify(await storage(page)) === JSON.stringify(before)
      && await page.locator('#share-text').inputValue() === initialShare,
    { before, after: await storage(page), share: await page.locator('#share-text').inputValue() });
    const activeWatch = await watchId(page); await page.locator('#location-stop').click(); await waitStatus(page, 'idle');
    check('native-stop-clears-watch-and-location-marker', (await fixture(page)).cleared.includes(activeWatch)
      && !(await gps(page)).visible, await fixture(page));
    await page.reload(); await page.locator('#location-start').waitFor();
    check('reload-does-not-resume-location', await status(page) === 'idle' && (await fixture(page)).watches.length === 0
      && !(await gps(page)).visible, { status: await status(page), fixture: await fixture(page) });
    await isolate(page, 'native-location-keeps-original-and-perspective-saves');
  });

  await runCase('controlled-location-lifecycle', async () => {
    const { page } = await scenario('controlled-location-lifecycle', { clock: true });
    const beforeSensor = await storage(page), beforeShare = await page.locator('#share-text').inputValue();
    await page.locator('#location-start').click(); await waitStatus(page, 'requesting');
    const first = await watchId(page); await emit(page, first, fix); await waitStatus(page, 'tracking');
    const firstDot = await gps(page);
    await page.clock.fastForward(2); await emit(page, first, { ...fix, latitude: 35.00391234 });
    const nextDot = await gps(page);
    check('continuous-good-updates-use-one-watch-and-move-the-dot', firstDot.y !== nextDot.y
      && nextDot.visible && (await fixture(page)).watches.length === 1, { firstDot, nextDot });
    await page.clock.fastForward(2); await emit(page, first, { ...fix, accuracy: 120 }); await waitStatus(page, 'uncertain');
    check('continuous-low-accuracy-does-not-claim-nearby', (await gps(page)).quality === 'uncertain'
      && await page.locator('[data-proximity="nearby"]').count() === 0, await gps(page));
    await page.clock.fastForward(2); await emit(page, first, { latitude: 35.68131234, longitude: 139.76711234, accuracy: 9 });
    check('continuous-outside-update-keeps-the-map-honest', await status(page) === 'tracking'
      && !(await gps(page)).visible && await page.locator('#outside-area').isVisible(), await gps(page));
    check('continuous-sensor-data-never-enters-storage-or-share-text', JSON.stringify(await storage(page)) === JSON.stringify(beforeSensor)
      && await page.locator('#share-text').inputValue() === beforeShare, { before: beforeSensor, after: await storage(page) });
    await page.clock.fastForward(2); await emit(page, first, fix); await waitStatus(page, 'tracking');
    await page.evaluate(() => window.__TRAVEL_BROWSER_FIXTURE__.setVisible(false)); await waitStatus(page, 'paused');
    check('hidden-page-clears-watch-and-gps', (await fixture(page)).cleared.includes(first) && !(await gps(page)).visible,
      { fixture: await fixture(page), gps: await gps(page) });
    await page.evaluate(() => window.__TRAVEL_BROWSER_FIXTURE__.setVisible(true));
    await page.clock.fastForward(1000);
    check('foreground-return-requires-explicit-resume', await status(page) === 'paused' && (await fixture(page)).watches.length === 1
      && await page.locator('#location-start').isEnabled(), await fixture(page));
    await emit(page, first, { ...fix, longitude: 135.75971234 });
    check('late-hidden-session-callback-is-ignored', await status(page) === 'paused' && !(await gps(page)).visible, await gps(page));
    await page.locator('#location-start').click(); await waitStatus(page, 'requesting');
    const second = await watchId(page);
    await emit(page, first, fix);
    check('old-session-callback-cannot-satisfy-resumed-request', await status(page) === 'requesting' && !(await gps(page)).visible,
      { first, second, status: await status(page) });
    await emit(page, second, fix); await waitStatus(page, 'tracking');
    await page.clock.fastForward(20001); await waitStatus(page, 'stale');
    check('accepted-fix-expires-and-clears-live-map-indicator', !(await gps(page)).visible,
      { gps: await gps(page), message: await page.locator('#location-status').innerText() });
    check('stale-fix-cannot-claim-nearby', await page.locator('[data-proximity="nearby"]').count() === 0, {});
    await capture(page, 'travel-location-stale');
    await emit(page, second, { ...fix, longitude: 135.75961234 }); await waitStatus(page, 'tracking');
    check('fresh-update-recovers-an-expired-watch', (await gps(page)).visible && (await fixture(page)).watches.length === 2, await gps(page));
    await page.locator('#location-stop').click(); await waitStatus(page, 'idle');
    await emit(page, second, { ...fix, latitude: 35.00391234 });
    await page.evaluate(id => window.__TRAVEL_BROWSER_FIXTURE__.error(id, 1), second);
    check('stop-invalidates-late-success-and-error-callbacks', await status(page) === 'idle' && !(await gps(page)).visible,
      { status: await status(page), fixture: await fixture(page) });
    await page.locator('#location-start').click();
    await emit(page, await watchId(page), { ...fix, age: 30000 }); await waitStatus(page, 'stale');
    check('initial-stale-position-never-appears-current', !(await gps(page)).visible, await gps(page));
    await page.locator('#location-stop').click();
    for (const [code, expected] of [[1, 'denied'], [2, 'unavailable'], [3, 'error']]) {
      await page.locator('#location-start').click(); const id = await watchId(page);
      await page.evaluate(({ id, code }) => window.__TRAVEL_BROWSER_FIXTURE__.error(id, code), { id, code });
      await waitStatus(page, expected);
      check(`location-error-${expected}-leaves-manual-route-usable`, !(await gps(page)).visible
        && await page.locator('#location-start').isEnabled() && (await selected(page)).length === 3
        && (await fixture(page)).cleared.includes(id), { status: await status(page), text: await page.locator('#location-status').innerText() });
    }
    await isolate(page, 'location-faults-keep-private-saves');
  });

  await runCase('delayed-freshness-timer', async () => {
    const { page } = await scenario('delayed-freshness-timer', { clock: true });
    await page.locator('#location-start').click(); await emit(page, await watchId(page), fix); await waitStatus(page, 'tracking');
    const nextTime = await page.evaluate(() => Date.now() + 21000);
    await page.clock.setSystemTime(nextTime);
    await page.locator('#locale-zh').click();
    check('rerender-rechecks-age-when-freshness-timer-is-delayed', await status(page) === 'stale' && !(await gps(page)).visible
      && await page.locator('[data-proximity="nearby"]').count() === 0
      && await page.locator('[data-distance]').evaluateAll(nodes => nodes.every(node => !node.textContent.includes('≈0'))),
    { status: await status(page), gps: await gps(page), distances: await page.locator('[data-distance]').allTextContents() });
  });
}

const placeById = new Map(PLACES.map(place => [place.id, place]));
const coordinate = id => `${placeById.get(id).latitude},${placeById.get(id).longitude}`;
function urlStops(href) {
  const url = new URL(href);
  if (url.origin !== 'https://www.google.com' || url.searchParams.get('api') !== '1') return null;
  if (url.pathname === '/maps/search/') return [url.searchParams.get('query')];
  if (url.pathname !== '/maps/dir/' || url.searchParams.get('travelmode') !== 'walking') return null;
  return [url.searchParams.get('origin'), ...(url.searchParams.get('waypoints')?.split('|') ?? []), url.searchParams.get('destination')];
}
const links = (page, selector = '#maps-links a') => page.locator(selector).evaluateAll(nodes => nodes.map(node => node.href));
async function checkRoute(page, id, expected) {
  const order = await selected(page), hrefs = await links(page), parsed = hrefs.map(urlStops);
  check(id, JSON.stringify(order) === JSON.stringify(expected)
    && JSON.stringify(parsed) === JSON.stringify(expected.length ? [expected.map(coordinate)] : []), { order, hrefs, parsed, expected });
}
const travelRecord = page => page.evaluate(() => JSON.parse(localStorage.getItem('tourguideai:travel:v1')));

async function routeCases() {
  await runCase('route-editing-and-export', async () => {
    const { page } = await scenario('route-editing-and-export', { nativeShare: 'cancel' });
    await checkRoute(page, 'default-route-contains-every-selected-stop', ['crossing', 'mitsui', 'mufg']);
    const legs = await links(page, '.leg-links a');
    check('per-leg-links-preserve-both-consecutive-walks', JSON.stringify(legs.map(urlStops)) === JSON.stringify([
      ['crossing', 'mitsui'].map(coordinate), ['mitsui', 'mufg'].map(coordinate),
    ]), { legs });
    const beforeMark = await page.locator('#share-text').inputValue();
    await page.locator('[data-meaning="mitsui"]').click();
    const marked = await travelRecord(page);
    check('meaningful-mark-is-explicit-private-and-distinct-from-route', JSON.stringify(marked.meaningful) === '["mitsui"]'
      && await page.locator('[data-meaning="mitsui"]').getAttribute('aria-pressed') === 'true'
      && await page.locator('#share-text').inputValue() === beforeMark, marked);
    await page.locator('[data-up="mufg"]').click(); await page.locator('[data-down="crossing"]').click();
    await checkRoute(page, 'reordering-changes-maps-order-without-dropping-stops', ['mufg', 'crossing', 'mitsui']);
    await page.locator('[data-remove="crossing"]').click();
    await checkRoute(page, 'removing-a-stop-updates-route-and-checkbox', ['mufg', 'mitsui']);
    check('removed-stop-is-unchecked', !(await page.locator('[data-include="crossing"]').isChecked()), {});
    await page.locator('[data-include="crossing"]').check();
    await checkRoute(page, 'reselecting-appends-the-stop-once', ['mufg', 'mitsui', 'crossing']);
    await page.locator('#locale-zh').click();
    check('chinese-switch-preserves-order-and-private-marks', await page.evaluate(() => document.documentElement.lang === 'zh')
      && JSON.stringify(await selected(page)) === '["mufg","mitsui","crossing"]'
      && await page.locator('[data-meaning="mitsui"]').getAttribute('aria-pressed') === 'true', await travelRecord(page));
    await capture(page, 'travel-desktop-zh');
    const share = await page.locator('#share-text').inputValue();
    await page.locator('#copy-maps').click();
    check('copy-handoff-equals-visible-selected-route', (await fixture(page)).copied.at(-1) === share
      && share.includes(placeById.get('crossing').title.zh) && share.indexOf(placeById.get('mufg').title.zh) < share.indexOf(placeById.get('mitsui').title.zh),
    { share, copied: (await fixture(page)).copied });
    const beforeCancel = await storage(page); await page.locator('#native-share').click();
    const shared = (await fixture(page)).shares.at(-1);
    check('native-share-cancel-keeps-route-and-private-state', JSON.stringify(await storage(page)) === JSON.stringify(beforeCancel)
      && shared.url === (await links(page))[0] && /取消/.test(await page.locator('#status').innerText()), { shared, status: await page.locator('#status').innerText() });
    await page.locator('#download-csv').locator('..').locator('summary').click();
    const event = page.waitForEvent('download'); await page.locator('#download-csv').click();
    const download = await event, path = join(output, 'selected-journey-zh.csv'); await download.saveAs(path);
    const csv = readFileSync(path, 'utf8'); report.outputs.push({ name: 'selected-journey-zh.csv', path, sha256: sha(readFileSync(path)) });
    const rows = ['mufg', 'mitsui', 'crossing'].map(id => `"${placeById.get(id).title.zh}",${coordinate(id)}\r\n`);
    check('csv-retains-selected-order-and-public-place-coordinates', csv === 'Name,Latitude,Longitude\r\n' + rows.join('')
      && download.suggestedFilename().endsWith('.csv'), { csv, filename: download.suggestedFilename() });
    await page.reload(); await page.locator('#location-start').waitFor();
    await checkRoute(page, 'edited-route-survives-reload', ['mufg', 'mitsui', 'crossing']);
    check('private-meaningful-mark-survives-reload', await page.locator('[data-meaning="mitsui"]').getAttribute('aria-pressed') === 'true', await travelRecord(page));
    await page.locator('[data-remove="mufg"]').click(); await page.locator('[data-remove="crossing"]').click();
    await checkRoute(page, 'one-stop-route-becomes-a-search-link', ['mitsui']);
    await page.locator('[data-remove="mitsui"]').click(); await checkRoute(page, 'removing-every-stop-clears-links', []);
    check('no-stops-disables-export-with-visible-guidance', await page.locator('#empty-journey').isVisible()
      && await page.locator('#copy-maps').isDisabled() && await page.locator('#native-share').isDisabled()
      && await page.locator('#download-csv').isDisabled() && (await travelRecord(page)).meaningful.includes('mitsui'), await travelRecord(page));
    await page.locator('#clear-marks').click();
    check('private-mark-can-be-deleted-independently', (await travelRecord(page)).meaningful.length === 0, await travelRecord(page));
    await isolate(page, 'route-editing-keeps-existing-game-and-perspective-saves');
  });

  await runCase('phone-and-clipboard-recovery', async () => {
    const { page } = await scenario('phone-and-clipboard-recovery', { mobile: true, clipboard: 'denied' });
    for (const language of ['en', 'zh']) {
      await page.locator(`#locale-${language}`).tap();
      await page.locator('#location-start').tap(); const id = await watchId(page);
      await emit(page, id, fix); await waitStatus(page, 'tracking');
      const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
        touchPoints: navigator.maxTouchPoints, language: document.documentElement.lang,
        map: document.querySelector('#place-map').getBoundingClientRect().toJSON(),
        heading: document.querySelector('h1').textContent, status: document.querySelector('#location-status').textContent }));
      check(`phone-${language}-has-localized-live-location-without-overflow`, dimensions.width === 390 && dimensions.scroll === 390
        && dimensions.language === language && dimensions.map.width > 0 && dimensions.map.width <= 390 && (await gps(page)).visible, dimensions);
      await page.locator('#location-start').evaluate(node => node.closest('section').scrollIntoView());
      await capture(page, `travel-phone-${language}`, true);
      await page.locator('#location-stop').tap();
    }
    const share = await page.locator('#share-text').inputValue(); await page.locator('#copy-maps').tap();
    const manual = await page.locator('#share-text').evaluate(node => ({ readonly: node.readOnly, selected: node.selectionEnd - node.selectionStart, focused: document.activeElement === node }));
    check('denied-clipboard-leaves-selectable-complete-text', (await fixture(page)).copied.at(-1) === share
      && manual.readonly && manual.focused && manual.selected === share.length && (await page.locator('#status').innerText()).length > 0, { share, manual });
    await page.locator('#native-share').tap();
    check('missing-native-share-retains-manual-handoff', (await fixture(page)).shares.length === 0
      && await page.locator('#share-text').inputValue() === share && await page.locator('#share-text').evaluate(node => document.activeElement === node), {});
    await isolate(page, 'phone-flow-keeps-existing-private-saves');
  });

  await runCase('blocked-storage', async () => {
    const { page } = await scenario('blocked-storage', { storageDenied: true });
    await page.locator('[data-remove="mufg"]').click();
    await checkRoute(page, 'blocked-storage-retains-in-memory-route-editing', ['crossing', 'mitsui']);
    check('blocked-storage-has-visible-save-limitation', (await page.locator('#storage-status').innerText()).length > 0, await page.locator('#storage-status').innerText());
    await page.locator('#copy-maps').click();
    check('blocked-storage-still-allows-explicit-copy', (await fixture(page)).copied.at(-1) === await page.locator('#share-text').inputValue(), {});
  });

  await runCase('perspective-companion-entry', async () => {
    const { page } = await scenario('perspective-companion-entry');
    await page.goto(`${origin}/perspective.html?mode=story&lang=en`);
    await page.locator('#travel-link').waitFor();
    for (const language of ['en', 'zh']) {
      await page.locator(`#locale-${language}`).click();
      const href = await page.locator('#travel-link').getAttribute('href'), url = new URL(href, page.url());
      check(`perspective-${language}-links-to-complete-companion-plan`, url.origin === origin && url.pathname === '/travel.html'
        && url.searchParams.get('lang') === language && url.searchParams.get('stops') === 'crossing,mitsui,mufg', { href });
    }
    await page.locator('#travel-link').focus(); await page.keyboard.press('Enter');
    await page.locator('#location-start').waitFor();
    check('perspective-link-opens-chinese-companion-with-location-off', await page.evaluate(() => document.documentElement.lang === 'zh')
      && await status(page) === 'idle' && (await fixture(page)).watches.length === 0, { url: page.url() });
    const current = await storage(page), perspective = JSON.parse(current['tourguideai:perspective:v1']);
    const expectedPerspective = JSON.parse(baseline['tourguideai:perspective:v1']); expectedPerspective.locale = 'zh';
    check('companion-entry-keeps-both-private-experiences', current['tourguideai:journey:v2'] === baseline['tourguideai:journey:v2']
      && current['tourguideai:appearance:v1'] === baseline['tourguideai:appearance:v1']
      && Object.keys(expectedPerspective).every(key => JSON.stringify(expectedPerspective[key]) === JSON.stringify(perspective[key])), current);
  });

  await runCase('imported-route-reload-and-keyboard', async () => {
    const { page } = await scenario('imported-route-reload-and-keyboard');
    await page.goto(`${entry}&lang=en&stops=mufg,crossing,mitsui`);
    await page.locator('#location-start').waitFor();
    await checkRoute(page, 'entry-query-imports-the-requested-order', ['mufg', 'crossing', 'mitsui']);
    await page.locator('#up-crossing').focus(); await page.keyboard.press('Enter');
    await checkRoute(page, 'keyboard-reorder-updates-imported-route', ['crossing', 'mufg', 'mitsui']);
    const afterMove = await page.evaluate(() => ({ id: document.activeElement.id, disabled: document.activeElement.disabled,
      tag: document.activeElement.tagName, inside: Boolean(document.activeElement.closest('#selected-list')) }));
    check('reorder-keeps-keyboard-focus-on-a-usable-route-control', afterMove.tag === 'BUTTON' && !afterMove.disabled && afterMove.inside, afterMove);
    await page.locator('#remove-mufg').focus(); await page.keyboard.press('Enter');
    const afterRemove = await page.evaluate(() => ({ id: document.activeElement.id, disabled: document.activeElement.disabled,
      tag: document.activeElement.tagName, inside: Boolean(document.activeElement.closest('#selected-list')) }));
    check('remove-keeps-keyboard-focus-on-a-usable-route-control', afterRemove.tag === 'BUTTON' && !afterRemove.disabled && afterRemove.inside, afterRemove);
    await page.locator('#locale-zh').click(); await page.reload(); await page.locator('#location-start').waitFor();
    await checkRoute(page, 'query-entry-edits-survive-reload', ['crossing', 'mitsui']);
    check('query-entry-retains-explicit-chinese-language-after-reload', await page.evaluate(() => document.documentElement.lang === 'zh'), { url: page.url() });
    await isolate(page, 'imported-route-keeps-existing-private-saves');
  });
}

try {
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || undefined, headless: true, args: ['--no-sandbox'] });
  report.browser = browser.version(); persist();
  await locationCases();
  await routeCases();
  for (const [name, record] of Object.entries(report.scenarios)) {
    check(`${name}-uses-local-assets-without-browser-errors`, record.externalRequests.length === 0
      && record.pageErrors.length === 0 && record.consoleErrors.length === 0
      && !record.requests.some(path => /\.(glb|hdr)$/.test(path)), record);
  }
} finally {
  for (const context of [...contexts]) await context.close();
  if (browser) await browser.close();
  report.finishedAt = new Date().toISOString();
  report.summary = { passed: report.checks.filter(item => item.pass).length, failed: report.checks.filter(item => !item.pass).length };
  persist(); console.log(JSON.stringify(report.summary));
  if (report.summary.failed) process.exitCode = 1;
}
