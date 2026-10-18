// 使用已发布页面与真实服务；私人收藏仅通过页面表单创建。
import { chromium } from 'playwright';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { buildMapsJourney } from '../src/travel/maps.js';

if (!process.argv[2]) throw new Error('Usage: node tests/browser-solo-hosted.mjs <published-dist-directory>');
const dist = resolve(process.argv[2]);
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || '../artifacts/solo-exploration-20261018/hosted');
const base = new URL(process.env.EXPERIENCE_QA_PAGES_URL || 'https://paperstrange.github.io/TourGuideAI/');
if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('A public HTTPS deployment URL is required.');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const timeout = Number(process.env.EXPERIENCE_QA_TIMEOUT || 90000);
const storageKey = 'tourguideai.solo.places.v1';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = new Map();
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else assets.set('/' + relative(dist, path).split(sep).join('/'), readFileSync(path));
  }
}
collect(dist);
if (!assets.has('/index.html')) throw new Error('The supplied build must contain index.html.');
mkdirSync(output, { recursive: true });
const files = [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const report = { startedAt: new Date().toISOString(), baseURL: base.href,
  driverSha256: sha(readFileSync(new URL(import.meta.url))), artifact: { directory: dist, manifestSha256: sha(JSON.stringify(files)), files },
  conditions: { frontend: 'actual-published-https', TLSVerification: true, responseInterception: false, localService: false,
    storageSeeding: false, timeoutMs: timeout, desktop: [1440, 1000], phone: [390, 844], reducedMotion: 'reduce' },
  checks: [], scenarios: [], responses: [], screenshots: [],
  limitations: ['Phone checks use Chromium touch/viewport emulation; physical-device fluency and enjoyment require human evidence.',
    'Hashes bind completed downloaded build resources; files not requested by this smoke test are listed in the supplied manifest but are not remotely verified.',
    'Static Pages may return HTTP404 for /api/health. These network/console diagnostics are recorded separately from unhandled JavaScript page exceptions.'] };
const persist = () => writeFileSync(join(output, 'solo-hosted-result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, pass, evidence) { report.checks.push({ id, pass: Boolean(pass), evidence }); persist(); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`); }
const home = page => page.evaluate(() => window.__HOME__?.snapshot());
const view = async page => (await home(page)).currentView;
const light = page => page.evaluate(() => window.__TOUR_GAME__.renderer().lighting);
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{"version":1,"places":[]}').places, storageKey);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function closeEnough(a, b, tolerance = 0.0001) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tolerance;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return a === b;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => closeEnough(a[key], b[key], tolerance));
}
async function streetReady(page, mode) {
  await page.waitForFunction(expected => {
    const renderer = window.__TOUR_GAME__?.renderer();
    return window.__HOME__?.snapshot().sceneState === 'ready' && renderer?.status === 'ready' && renderer.renderedFrames > 0
      && renderer.lighting.phase === 'ready' && (!expected || renderer.lighting.mode === expected)
      && Boolean(window.__HOME__?.snapshot().currentView);
  }, mode);
}
async function mapReady(page) {
  await page.waitForFunction(() => window.__HOME__?.snapshot().map?.ready && Boolean(window.__HOME__.snapshot().currentView));
}
async function nearbyReady(page) {
  await page.waitForFunction(() => !/Looking for places|正在寻找起点/.test(document.querySelector('#routes-status').textContent));
  if (await page.locator('#routes-retry').isVisible()) throw new Error('The actual nearby provider did not complete successfully.');
  await mapReady(page);
}
async function keep(page, title, note, touch = false) {
  await page.locator('#solo-keep')[touch ? 'tap' : 'click']();
  await page.locator('#kept-title').fill(title); await page.locator('#kept-note').fill(note);
  await page.locator('#keep-place-form button[type=submit]')[touch ? 'tap' : 'click']();
  await page.locator('#keep-place-dialog').waitFor({ state: 'hidden' });
  const place = (await saved(page)).find(value => value.title === title);
  if (!place) throw new Error('The actual save form did not produce the requested private record.');
  return place;
}
async function reopen(page, place) {
  await page.locator(`[data-kept-open="${place.id}"]`).click();
  await page.waitForFunction(() => /saved view and place order are open|已打开收藏/.test(document.querySelector('#solo-status').textContent));
  if (place.representation === 'street') await streetReady(page, place.lighting); else await mapReady(page);
}
async function capture(page, name) {
  const phone = touchContexts.has(page.context());
  if (phone) await page.locator('.preview-frame').scrollIntoViewIfNeeded();
  const file = name + '.png'; await page.screenshot({ path: join(output, file), fullPage: !phone });
  report.screenshots.push({ file, sha256: sha(readFileSync(join(output, file))), fullPage: !phone }); persist();
}
const proxyValue = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxy = proxyValue ? new URL(proxyValue) : null;
let browser;
const contexts = new Set();
const touchContexts = new WeakSet();
const pendingReads = [];
async function scenario(name, mobile, body) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  contexts.add(context);
  if (mobile) touchContexts.add(context);
  const page = await context.newPage(); page.setDefaultTimeout(timeout);
  const record = { name, requests: [], providerResponses: [], expectedServiceResponses: [], pageErrors: [], consoleErrors: [], requestFailures: [] };
  report.scenarios.push(record);
  page.on('pageerror', error => record.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push({ text: message.text(), location: message.location() }); });
  page.on('requestfailed', request => record.requestFailures.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('request', request => record.requests.push({ url: request.url(), method: request.method() }));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin === base.origin && url.pathname === '/api/health') {
      record.expectedServiceResponses.push({ url: url.href, status: response.status() }); return;
    }
    const provider = ['photon.komoot.io', 'en.wikipedia.org'].includes(url.hostname);
    const localPath = url.origin === base.origin && url.pathname.startsWith(base.pathname)
      ? '/' + url.pathname.slice(base.pathname.length) : null;
    const key = localPath === '/' ? '/index.html' : localPath;
    if (!provider && !assets.has(key)) return;
    const item = { scenario: name, url: url.href, path: key, status: response.status() };
    report.responses.push(item);
    if (provider) record.providerResponses.push(item);
    pendingReads.push(response.body().then(bytes => {
      item.bytes = bytes.length; item.sha256 = sha(bytes);
      if (provider) {
        const file = `${name}-provider-${report.responses.indexOf(item)}.json`;
        writeFileSync(join(output, file), bytes); item.bodyFile = file;
      } else item.matchesBuild = item.sha256 === sha(assets.get(key));
    }).catch(error => { item.bodyUnavailable = true; item.error = error.message; }));
  });
  try {
    await page.goto(new URL('index.html?qa=1&lang=en', base).href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.__HOME__));
    await body(page, record);
  } catch (error) {
    check(name + '-completed', false, { message: error.message, stack: error.stack });
    await capture(page, name + '-failure').catch(() => {});
  } finally {
    await Promise.allSettled(pendingReads);
    await context.close(); contexts.delete(context); persist();
  }
}

try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
    ...(process.env.EXPERIENCE_QA_CHROMIUM ? { executablePath: process.env.EXPERIENCE_QA_CHROMIUM } : {}),
    ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1',
      ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.conditions.browser = browser.version(); persist();

  await scenario('desktop', false, async page => {
    await streetReady(page, 'day');
    check('desktop-en-street-controls', await page.locator('html').getAttribute('lang') === 'en'
      && await page.locator('#solo-inspect').textContent() === 'Look closer' && await page.locator('#solo-keep').isEnabled(), await home(page));
    const opening = await view(page), day = await light(page);
    await page.locator('#solo-inspect').click();
    await page.locator('#live-stage').focus(); await page.keyboard.press('l'); await page.keyboard.press('i'); await page.keyboard.press('-');
    await page.waitForFunction(before => Math.abs(window.__HOME__.snapshot().currentView.camera.azimuth - before) > 0.01, opening.camera.azimuth);
    const framed = await view(page);
    check('desktop-look-closer-controls-preserve-player', (await home(page)).solo.inspection.enabled && equal(framed.player, opening.player)
      && framed.camera.polar !== opening.camera.polar && framed.camera.distance !== opening.camera.distance, { opening, framed });
    await page.locator('#lighting-night').click(); await streetReady(page, 'night');
    const night = await light(page);
    check('desktop-day-night-applies-and-preserves-view', night.environment.sha256 !== day.environment.sha256
      && closeEnough(await view(page), framed), { day, night, view: await view(page) });
    const note = 'Hosted smoke · return for the stone and windows.';
    const kept = await keep(page, 'Hosted night view', note);
    check('desktop-ui-save-keeps-note-view-and-light', kept.note === note && kept.lighting === 'night'
      && kept.representation === 'street' && closeEnough(kept.view, framed), kept);
    await page.reload(); await streetReady(page); await reopen(page, kept);
    check('desktop-reload-reopen-restores-street', closeEnough(await view(page), kept.view) && (await light(page)).mode === 'night'
      && (await saved(page))[0].note === note, { kept, actual: await home(page) });
    await page.locator('#locale-zh').click();
    if (!(await home(page)).solo.inspection.enabled) await page.locator('#solo-inspect').click();
    check('desktop-zh-inspection-localizes-preserves-view', await page.locator('html').getAttribute('lang') === 'zh'
      && await page.locator('#solo-inspect').textContent() === '继续漫步' && /查看|调整/.test(await page.locator('#solo-hint').textContent())
      && closeEnough(await view(page), kept.view), { hint: await page.locator('#solo-hint').textContent(), view: await view(page) });
    await page.locator('#lighting-day').click(); await streetReady(page, 'day');
    await page.locator('#lighting-night').click(); await streetReady(page, 'night');
    const withoutNote = await keep(page, '中文私人视角', '');
    check('desktop-zh-controls-and-optional-note', withoutNote.note === '' && withoutNote.lighting === 'night'
      && closeEnough(withoutNote.view, kept.view) && (await saved(page)).length === 2, withoutNote);
    await capture(page, 'hosted-street-zh-night');
  });

  await scenario('phone', true, async page => {
    await streetReady(page, 'day');
    for (const language of ['en', 'zh']) {
      await page.locator(`#locale-${language}`).tap();
      await page.locator(`#lighting-${language === 'en' ? 'day' : 'night'}`).tap();
      await streetReady(page, language === 'en' ? 'day' : 'night');
      if (!(await home(page)).solo.inspection.enabled) await page.locator('#solo-inspect').tap();
      const actual = await page.evaluate(() => ({ lang: document.documentElement.lang, width: document.documentElement.scrollWidth,
        viewport: innerWidth, coarse: matchMedia('(pointer: coarse)').matches, fine: matchMedia('(pointer: fine)').matches,
        hint: document.querySelector('#solo-hint').textContent,
        controls: ['#solo-controls', '.preview-frame'].map(selector => document.querySelector(selector).getBoundingClientRect().toJSON()) }));
      check(`phone-${language}-actual-tap-layout-guidance`, actual.lang === language && actual.coarse && !actual.fine
        && /two fingers|双指/.test(actual.hint) && actual.width <= actual.viewport + 1
        && actual.controls.every(rect => rect.left >= -1 && rect.right <= actual.viewport + 1), actual);
    }
    const kept = await keep(page, '触屏收藏', '想再次看看这个视角', true);
    check('phone-ui-keep-retains-chosen-view', kept.note === '想再次看看这个视角' && kept.lighting === 'night'
      && closeEnough(await view(page), kept.view), kept);
    await capture(page, 'hosted-phone-zh');
  });

  await scenario('map', false, async (page, record) => {
    await page.locator('#place-query').fill('Eiffel Tower'); await page.locator('#search-submit').click();
    await page.waitForFunction(() => document.querySelector('#place-search').getAttribute('aria-busy') !== 'true');
    const results = await page.locator('#search-results [data-result]').allTextContents();
    const index = results.findIndex(text => /Eiffel Tower/.test(text) && /Paris/.test(text) && /France/.test(text));
    if (index < 0) throw new Error('Actual Photon response did not return Eiffel Tower in Paris, France.');
    await page.locator('#search-results [data-result]').nth(index).click(); await nearbyReady(page);
    const selected = await home(page);
    check('map-real-eiffel-source-and-shared-style', selected.center.id === 'osm:way:5013364'
      && Math.abs(selected.center.latitude - 48.8582599) < 0.001 && Math.abs(selected.center.longitude - 2.2945006) < 0.001
      && selected.map.style === 'tourguideai-travel-map-v1' && selected.map.buildingLayer === 'fill-extrusion'
      && record.providerResponses.some(response => response.url.includes('photon') && response.status === 200), { results, selected });
    const before = await view(page), count = record.requests.filter(request => new URL(request.url).hostname === 'en.wikipedia.org').length;
    await page.locator('#world-map canvas').scrollIntoViewIfNeeded();
    const drag = await page.locator('#world-map canvas').evaluate(canvas => {
      const rect = canvas.getBoundingClientRect();
      // 使用实际画布上的空闲区域，防止地点标记接收拖动事件。
      for (const [horizontal, vertical] of [[0.25, 0.35], [0.25, 0.7], [0.65, 0.7]]) {
        const x = rect.x + rect.width * horizontal, y = rect.y + rect.height * vertical;
        if (Array.from({ length: 9 }, (_, index) => document.elementFromPoint(x + 70 * index / 8, y + 25 * index / 8) === canvas).every(Boolean)) {
          return { x, y, endX: x + 70, endY: y + 25 };
        }
      }
      return null;
    });
    if (!drag) throw new Error('No unobstructed map canvas drag path is visible.');
    await page.mouse.move(drag.x, drag.y); await page.mouse.down(); await page.mouse.move(drag.endX, drag.endY, { steps: 8 }); await page.mouse.up();
    await page.waitForFunction(before => {
      const current = window.__HOME__.snapshot().currentView;
      return current && JSON.stringify(current.center) !== JSON.stringify(before);
    }, before.center);
    await mapReady(page);
    const panned = await view(page);
    check('map-pan-keeps-place-and-makes-no-nearby-query', record.requests.filter(request => new URL(request.url).hostname === 'en.wikipedia.org').length === count
      && (await home(page)).center.id === selected.center.id && !closeEnough(panned.center, before.center), { before, panned, drag });
    await page.locator('#solo-area').click(); await nearbyReady(page);
    const explored = await home(page);
    check('map-explicit-area-uses-visible-center-and-real-provider', explored.center.kind === 'area'
      && closeEnough([explored.center.longitude, explored.center.latitude], panned.center, 0.000001)
      && record.requests.filter(request => new URL(request.url).hostname === 'en.wikipedia.org').length > count
      && explored.routes.length > 0 && explored.routes.every(route => !route.stops.includes('wikipedia:en:48435351')), explored);
    const choices = page.locator('#route-options [data-route]');
    if (await choices.count() > 1) await choices.nth(1).click();
    const selectedIndex = Number(await page.locator('#route-options [aria-pressed="true"]').getAttribute('data-route'));
    const chosenOrder = (await home(page)).routes[selectedIndex].stops;
    const kept = await keep(page, 'Paris area to return to', 'The park and river caught my eye.');
    const sourceLinks = await page.locator('#route-stops a').evaluateAll(nodes => nodes.map(node => node.href));
    const mapsLinks = await page.locator('#route-maps a').evaluateAll(nodes => nodes.map(node => node.href));
    check('map-keep-preserves-chosen-order-sources-and-maps', equal(kept.route.stops.map(place => place.id), chosenOrder)
      && equal(sourceLinks, kept.route.stops.map(place => place.url))
      && equal(mapsLinks, buildMapsJourney(kept.route.stops).parts.map(part => part.url)) && closeEnough(kept.view, await view(page)), { kept, sourceLinks, mapsLinks });
    await page.reload(); await page.waitForFunction(() => Boolean(window.__HOME__));
    const queriesBeforeReturn = record.requests.filter(request => new URL(request.url).hostname === 'en.wikipedia.org').length;
    await reopen(page, kept);
    check('map-reload-reopen-restores-exact-view-order', closeEnough(await view(page), kept.view)
      && equal((await home(page)).routes[0].stops, chosenOrder)
      && record.requests.filter(request => new URL(request.url).hostname === 'en.wikipedia.org').length === queriesBeforeReturn, { kept, actual: await home(page) });
    check('map-reopened-source-and-maps-links-stay-bound', equal(await page.locator('#route-stops a').evaluateAll(nodes => nodes.map(node => node.href)), sourceLinks)
      && equal(await page.locator('#route-maps a').evaluateAll(nodes => nodes.map(node => node.href)), mapsLinks), { sourceLinks, mapsLinks });
    await capture(page, 'hosted-paris-reopened');
  });

  await Promise.allSettled(pendingReads);
  const downloaded = report.responses.filter(response => response.path && assets.has(response.path) && !response.bodyUnavailable);
  check('downloaded-published-resources-match-build', downloaded.length > 0 && downloaded.every(response => response.status === 200 && response.matchesBuild)
    && downloaded.some(response => response.path === '/index.html') && downloaded.some(response => response.path.endsWith('.js'))
    && downloaded.some(response => response.path.endsWith('.glb')), { downloaded: downloaded.length, unavailable: report.responses.filter(response => response.bodyUnavailable) });
  check('published-api-unavailable-is-recorded-separately', report.scenarios.every(record => record.expectedServiceResponses.some(response => response.status === 404)),
    report.scenarios.map(({ name, expectedServiceResponses, consoleErrors }) => ({ name, expectedServiceResponses, consoleErrors })));
  check('no-unhandled-javascript-page-exceptions', report.scenarios.every(record => record.pageErrors.length === 0),
    report.scenarios.map(({ name, pageErrors, requestFailures }) => ({ name, pageErrors, requestFailures })));
} catch (error) {
  check('hosted-driver-completed', false, { message: error.message, stack: error.stack });
} finally {
  for (const context of contexts) await context.close();
  await browser?.close(); report.finishedAt = new Date().toISOString();
  report.passed = report.checks.length >= 18 && report.checks.every(value => value.pass); persist();
}
if (!report.passed) process.exitCode = 1;
