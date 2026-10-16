// 记录真实页面的语言、导航和恢复行为；基线与修复结果分别保存。
import { chromium } from 'playwright';
import { readFileSync, readdirSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { lightingMatchesRig } from './browser-appearance.mjs';
import { KYOTO_ARCHITECTURAL_PROFILE } from '../src/runtime/architectural-profile.js';
import { copy } from '../src/home/copy.js';
import { createRecap, buildRecapUrl } from '../src/app/share.js';
import { createShareURL } from '../src/perspective/share.js';
import { startServer } from '../server/src/server.js';

if (!process.argv[2]) throw new Error('Usage: node tests/browser-walkthrough.mjs <built-dist-directory> [--baseline]');
const dist = resolve(process.argv[2]);
const baseline = process.argv.includes('--baseline');
const selectedSection = process.env.EXPERIENCE_QA_SECTION;
const selected = name => !selectedSection || selectedSection === name;
const devices = process.env.EXPERIENCE_QA_PHONE_ONLY === '1' ? [true] : [false, true];
const packaged = process.env.EXPERIENCE_QA_FRONTEND === 'packaged';
const base = new URL(process.env.EXPERIENCE_QA_PAGES_URL || 'https://paperstrange.github.io/TourGuideAI/');
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || '../artifacts/homepage-walkthrough-20261016/browser');
const timeout = Number(process.env.EXPERIENCE_QA_TIMEOUT || 90000);
const sha = value => createHash('sha256').update(value).digest('hex');
const assets = new Map();
function collect(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) collect(path);
    else assets.set('/' + relative(dist, path).split(sep).join('/'), readFileSync(path));
  }
}
collect(dist);
if (!assets.has('/walk.html')) throw new Error('The reviewed build must contain walk.html.');
mkdirSync(output, { recursive: true });
const files = [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const report = { startedAt: new Date().toISOString(), phase: baseline ? 'baseline' : 'verification',
  artifact: { manifestSha256: sha(JSON.stringify(files)), files }, driverSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  conditions: { baseURL: base.href, frontend: packaged ? 'immutable-package-at-pages-origin' : 'actual-published-https',
    timeoutMs: timeout, sections: selectedSection || 'all', devices: devices.map(value => value ? 'phone' : 'desktop'),
    localNetworkPermission: baseline ? 'not-requested' : 'granted-by-automation', browser: null, renderer: 'not-yet-observed' }, checks: [], pages: [], screenshots: [], responses: [],
  limitations: ['Automation and phone viewport emulation do not establish physical-device fluency or human understanding.',
    'Timing describes this cloud Chromium and managed network; engineering records separate repeated latency experiments.',
    'Offline checks use explicit browser network denial. Successful pages and assets are real responses.'] };
const persist = () => writeFileSync(join(output, 'walkthrough-result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, pass, evidence) { report.checks.push({ id, pass: Boolean(pass), evidence }); persist(); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`); }
const safeURL = value => { const url = new URL(value); if (url.hash) url.hash = '[redacted]'; return url.href; };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff': 'font/woff', '.jpg': 'image/jpeg', '.png': 'image/png', '.glb': 'model/gltf-binary' };
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxyURL = proxy && new URL(proxy);
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
  ...(process.env.EXPERIENCE_QA_CHROMIUM ? { executablePath: process.env.EXPERIENCE_QA_CHROMIUM } : {}),
  ...(proxyURL ? { proxy: { server: proxyURL.origin, bypass: 'localhost,127.0.0.1',
    ...(proxyURL.username ? { username: decodeURIComponent(proxyURL.username), password: decodeURIComponent(proxyURL.password) } : {}) } } : {}) });
report.conditions.browser = browser.version();
const contexts = new Set();
const cleanups = new Map();
const service = baseline ? null : await startServer({ port: 0, host: '127.0.0.1',
  databasePath: join(mkdtempSync(join(output, 'service-')), 'rooms.sqlite'),
  config: { provider: { apiKey: '', model: '' }, allowedOrigins: [base.origin] } });
if (service) report.conditions.localService = service.url;
async function scenario(id, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
  contexts.add(context);
  if (service) await context.grantPermissions(['local-network-access'], { origin: base.origin });
  const reads = [], record = { id, mobile, pageErrors: [], consoleErrors: [], timings: [], navigation: [], providerRequests: [], authenticatedRequests: [] };
  report.pages.push(record);
  if (packaged) await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return route.continue();
    const path = '/' + url.pathname.slice(base.pathname.length);
    const key = path === '/' ? '/index.html' : path;
    if (!assets.has(key)) return route.continue();
    return route.fulfill({ status: 200, contentType: mime[extname(key)] || 'application/octet-stream', body: assets.get(key) });
  });
  const page = await context.newPage(); page.setDefaultTimeout(timeout);
  page.on('pageerror', error => record.pageErrors.push(error.message));
  page.on('request', request => {
    const url = new URL(request.url());
    if (['photon.komoot.io', 'en.wikipedia.org'].includes(url.hostname)) record.providerRequests.push(safeURL(url.href));
    if (request.headers().authorization) record.authenticatedRequests.push({ method: request.method(), url: safeURL(url.href) });
  });
  page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push(message.text()); });
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
    const path = '/' + url.pathname.slice(base.pathname.length), key = path === '/' ? '/index.html' : path;
    if (!assets.has(key)) return;
    reads.push(response.body().then(bytes => report.responses.push({ scenario: id, path: key, status: response.status(),
      sha256: sha(bytes), matches: sha(bytes) === sha(assets.get(key)) })).catch(error => report.responses.push({ scenario: id, path: key, error: error.message, bodyUnavailable: true })));
  });
  async function go(path, selector) {
    const started = Date.now(), response = await page.goto(new URL(path, base).href, { waitUntil: 'domcontentloaded' });
    await page.locator(selector).first().waitFor({ state: 'visible' });
    record.timings.push({ path: safeURL(page.url()), controlsVisibleMs: Date.now() - started,
      paint: await page.evaluate(() => performance.getEntriesByType('paint').map(entry => ({ name: entry.name, startTime: entry.startTime }))) });
    record.navigation.push({ url: safeURL(page.url()), status: response?.status() });
  }
  async function capture(name) {
    const path = join(output, name + '.png'); await page.screenshot({ path, fullPage: !mobile });
    report.screenshots.push({ name, path, sha256: sha(readFileSync(path)) }); persist();
  }
  async function close() {
    // 导航可能取消尚未完成的响应；证据读取不应阻止 context 清理。
    let deadline;
    await Promise.race([Promise.all(reads), new Promise(resolve => { deadline = setTimeout(resolve, 3000); })]);
    clearTimeout(deadline);
    check(id + '-no-page-exceptions', !record.pageErrors.length, record.pageErrors);
    await context.close(); contexts.delete(context); cleanups.delete(context);
  }
  cleanups.set(context, close);
  return { context, page, record, go, capture, close };
}
async function section(id, operation) {
  const existing = new Set(contexts);
  try { await operation(); }
  catch (error) { check(id + '-completed', false, { message: error.message, stack: error.stack }); }
  finally { for (const context of [...contexts]) if (!existing.has(context)) await cleanups.get(context)(); }
}
async function links(page) { return page.locator('a[href]').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent.trim(), href: node.href }))); }
function localizedInternal(link, locale) { const url = new URL(link.href); return url.origin !== base.origin || url.searchParams.get('lang') === locale; }
const home = page => page.evaluate(() => window.__HOME__.snapshot());
const state = page => page.evaluate(() => window.__TOUR_GAME__.snapshot());
const camera = page => page.evaluate(() => window.__TOUR_GAME__.camera());
async function search(page, query) {
  await page.locator('#place-query').fill(query); await page.locator('#search-submit').click();
  await page.waitForFunction(() => document.querySelector('#place-search').getAttribute('aria-busy') !== 'true');
  return page.locator('#search-results [data-result]').allTextContents();
}
async function selectResult(page) {
  await page.locator('#search-results [data-result]').first().click();
  await page.waitForFunction(() => !/Looking for places|正在寻找起点/.test(document.querySelector('#routes-status').textContent));
  await page.waitForFunction(() => window.__HOME__?.snapshot().map?.ready);
}
async function connect(page, transport = 'sse') {
  if (!await page.locator('#testing-connection').evaluate(node => node.open)) await page.locator('#testing-connection summary').click();
  await page.locator('#service-endpoint').fill(service.url); await page.locator('#service-transport').selectOption(transport);
  await page.locator('#service-connect').click();
  await page.waitForFunction(() => window.__HOME__?.snapshot().serviceReady);
}
async function room(page, participants, dreams) {
  await page.waitForFunction(({ participants, dreams }) => {
    const value = window.__HOME__?.snapshot().room;
    return value?.participants.length === participants && (dreams === undefined || value.dreams.length === dreams);
  }, { participants, dreams });
}
async function touchGesture(page, pinch) {
  await page.locator('#live-stage').scrollIntoViewIfNeeded();
  const rect = await page.locator('#live-stage canvas').boundingBox(), client = await page.context().newCDPSession(page);
  const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
  const points = offset => pinch ? [{ id: 1, x: x - offset, y }, { id: 2, x: x + offset, y }] : [{ id: 1, x: x + offset, y }];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(pinch ? 25 : 0) });
  for (let step = 1; step <= 6; step++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(pinch ? 25 + step * 5 : step * 9) });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await client.detach();
}

try {
  if (selected('home')) for (const mobile of devices) for (const locale of ['en', 'zh']) await section(`home-${locale}-${mobile ? 'phone' : 'desktop'}`, async () => {
    const test = await scenario(`home-${locale}-${mobile ? 'phone' : 'desktop'}`, mobile), { page } = test;
    await test.go(`index.html?qa=1&lang=${locale}`, '#mode-explore');
    await page.waitForFunction(() => window.__HOME__);
    const labels = await page.locator('.eyebrow').allTextContents();
    const modeLabel = await page.locator('.mode-switch').getAttribute('aria-label');
    check(test.record.id + '-editorial-text-follows-locale', !labels.some(text => /A WORLD TO FEEL\s*\/|YOUR WALK\s*\/|OUR JOURNEY\s*\//.test(text))
      && (locale === 'en' || /[\u3400-\u9fff]/.test(modeLabel)), { labels, modeLabel });
    const navigation = await links(page);
    check(test.record.id + '-internal-links-retain-locale', navigation.filter(link => new URL(link.href).origin === base.origin).every(link => localizedInternal(link, locale)), navigation);
    const layout = await page.evaluate(() => ({ innerWidth, document: document.documentElement.scrollWidth,
      frames: [...document.querySelectorAll('.preview-frame,.visual-column')].map(node => {
        const rect = node.getBoundingClientRect(); return { element: node.className, x: rect.x, right: rect.right };
      }), offenders: [...document.querySelectorAll('body *')].filter(node => {
        const rect = node.getBoundingClientRect(); return rect.width > 0 && (rect.right > document.documentElement.clientWidth + 1 || rect.x < -1);
      }).slice(0, 25).map(node => ({ tag: node.tagName, id: node.id, className: node.className,
        rect: node.getBoundingClientRect().toJSON(), minWidth: getComputedStyle(node).minWidth, width: getComputedStyle(node).width })) }));
    const viewport = page.viewportSize().width;
    check(test.record.id + '-no-horizontal-overflow', layout.document <= viewport + 1
      && layout.frames.every(rect => rect.x >= -1 && rect.right <= viewport + 1), { viewport, ...layout });
    await test.capture(test.record.id);
    await page.locator('#mode-together').click();
    await page.waitForFunction(() => window.__HOME__?.snapshot().mode === 'together');
    await test.capture(test.record.id + '-together');
    check(test.record.id + '-mode-preserves-locale', await page.locator('html').getAttribute('lang') === locale);
    await test.close();
  });
  if (selected('support')) await section('support-navigation', async () => {
    const test = await scenario('support-navigation'), { page } = test;
    await test.go('index.html?qa=1&lang=zh', '#walk-link');
    await page.locator('#walk-link').click(); await page.locator('#language-switch').waitFor();
    check('home-to-walk-honors-explicit-chinese', await page.locator('html').getAttribute('lang') === 'zh', { url: safeURL(page.url()), lang: await page.locator('html').getAttribute('lang') });
    await test.capture('walk-explicit-zh');
    let navigation = await links(page);
    check('walk-provides-home-return', navigation.some(link => /(?:index\.html|\/)\?lang=zh/.test(link.href)), navigation);
    await page.goBack({ waitUntil: 'domcontentloaded' }); await page.locator('#walk-link').waitFor();
    check('browser-back-retains-home-chinese', await page.locator('html').getAttribute('lang') === 'zh');
    for (const [file, selector] of [['travel.html', '#location-start'], ['perspective.html', '#perspective-app']]) {
      await test.go(`${file}?lang=zh&mode=story`, selector); navigation = await links(page);
      const homeLinks = navigation.filter(link => /\/index\.html(?:\?|$)/.test(link.href));
      check(file + '-home-return-retains-chinese', homeLinks.length > 0 && homeLinks.every(link => localizedInternal(link, 'zh')), homeLinks);
      await test.capture(file.replace('.html', '') + '-zh-navigation');
    }
    await test.go('credits.html?lang=zh', 'main nav'); navigation = await links(page);
    const walkLinks = await page.locator('#credits-walk-link').evaluateAll(nodes => nodes.map(node => ({ text: node.textContent.trim(), href: node.href })));
    check('credits-walk-label-opens-walk-in-chinese', walkLinks.length > 0 && walkLinks.every(link => new URL(link.href).pathname.endsWith('/walk.html') && localizedInternal(link, 'zh')), walkLinks);
    await test.capture('credits-zh-navigation');
    const recap = createRecap({ locale: 'zh', state: { visitedIds: ['crossing'], choiceIds: { crossing: 'north-first' } }, notes: {}, created: '2026-10-16' });
    await test.go(buildRecapUrl(recap, base.href), '#journey-reader'); navigation = await links(page);
    const recapWalk = navigation.filter(link => /walk|散步|漫步/i.test(link.text));
    check('recap-walk-label-opens-walk-in-chinese', recapWalk.length > 0 && recapWalk.every(link => new URL(link.href).pathname.endsWith('/walk.html') && localizedInternal(link, 'zh')), recapWalk);
    await test.capture('recap-zh-navigation');
    await test.close();
  });
  if (selected('ci')) await section('ci-focused-reproduction', async () => {
    const test = await scenario('ci-focused-reproduction'), { page } = test;
    await test.go('walk.html?qa=1&lighting=day', '#game-stage');
    await page.waitForFunction(() => window.__TOUR_GAME__?.renderer().lighting.phase === 'ready');
    const actual = await page.evaluate(() => window.__TOUR_GAME__.renderer().lighting);
    report.conditions.renderer = await page.evaluate(() => window.__TOUR_GAME__.renderer().renderer || 'WebGL observed; hardware not reported');
    const rig = JSON.parse(assets.get('/lighting/rig.json'));
    check('walk-day-matches-approved-architectural-profile', lightingMatchesRig(actual, 'day', rig, assets, KYOTO_ARCHITECTURAL_PROFILE), actual);
    check('walk-day-is-distinct-from-comparison-rig', actual.environmentIntensity !== rig.modes.day.environment.intensity,
      { actual: actual.environmentIntensity, studyRig: rig.modes.day.environment.intensity });
    await test.go('index.html?qa=1&lang=zh&mode=together', '#room-status');
    await page.waitForFunction(expected => document.querySelector('#room-status').textContent === expected
      && !window.__HOME__?.snapshot().connectionPending, copy('zh', 'serviceUnavailable'), { timeout: 20000 });
    check('disconnected-room-has-current-chinese-guidance', await page.locator('#room-create').isDisabled()
      && !(await page.evaluate(() => window.__HOME__.snapshot().aiReady)), await page.locator('#room-status').innerText());
    await test.capture('disconnected-zh');
    await test.close();
  });
  if (!baseline && selected('legacy')) for (const mobile of devices) for (const locale of ['en', 'zh']) await section(`legacy-${locale}-${mobile ? 'phone' : 'desktop'}`, async () => {
    const id = `legacy-${locale}-${mobile ? 'phone' : 'desktop'}`, test = await scenario(id, mobile), { page, context } = test;
    const previous = JSON.parse(readFileSync(new URL('./fixtures/legacy-v1-completed.json', import.meta.url)));
    const privateJourney = { version: 2, locale: locale === 'en' ? 'zh' : 'en', hints: true, game: previous.game,
      notes: { crossing: 'Private QA note, excluded from recipient links.' } };
    await context.addInitScript(({ origin, journey }) => {
      if (location.origin === origin && !sessionStorage.getItem('walkthrough-seeded')) {
        localStorage.setItem('tourguideai:journey:v2', JSON.stringify(journey)); sessionStorage.setItem('walkthrough-seeded', '1');
      }
    }, { origin: base.origin, journey: privateJourney });
    await test.go(`walk.html?qa=1&lang=${locale}&lighting=night#qa-context`, '#language-switch');
    check(id + '-explicit-language-overrides-saved-display', await page.locator('html').getAttribute('lang') === locale);
    const other = locale === 'en' ? 'zh' : 'en';
    await page.locator(`#language-switch [data-locale="${other}"]`).click();
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('#language-switch').waitFor();
    const walkURL = new URL(page.url());
    check(id + '-walk-language-switch-survives-reload', await page.locator('html').getAttribute('lang') === other
      && walkURL.searchParams.get('lang') === other && walkURL.searchParams.get('lighting') === 'night' && walkURL.hash === '#qa-context', safeURL(page.url()));
    for (const selector of ['#walk-home-link', '#walk-credits-link']) check(id + selector + '-locale', new URL(await page.locator(selector).getAttribute('href'), page.url()).searchParams.get('lang') === other);
    await page.locator('#walk-home-link').click(); await page.locator('#mode-explore').waitFor();
    check(id + '-walk-home-link-reaches-selected-language', await page.locator('html').getAttribute('lang') === other);
    await test.go(`travel.html?lang=${locale}&stops=`, '#location-start');
    check(id + '-legacy-empty-companion-selection', await page.locator('#selected-list [data-place-id]').count() === 0);
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('#location-start').waitFor();
    check(id + '-empty-selection-survives-reload', await page.locator('#selected-list [data-place-id]').count() === 0);
    await page.locator('#travel-home-link').click(); await page.locator('#mode-explore').waitFor();
    check(id + '-companion-home-link-retains-language', await page.locator('html').getAttribute('lang') === locale);
    const shared = createShareURL({ momentId: 'arrive', note: 'Selected QA shared note', view: { kind: 'story', scale: 1.2, x: 0.45, y: 0.55 } }, base.href, { locale, includeNote: true });
    await test.go(shared, '#recipient-view');
    const originalHash = new URL(page.url()).hash;
    check(id + '-legacy-recipient-keeps-selected-note', (await page.locator('.recipient-note').innerText()) === 'Selected QA shared note');
    await page.locator('#locale-' + other).click(); await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('#recipient-view').waitFor();
    check(id + '-recipient-locale-persists-with-unchanged-fragment', await page.locator('html').getAttribute('lang') === other && new URL(page.url()).hash === originalHash);
    await page.locator('#perspective-home-link').click(); await page.locator('#mode-explore').waitFor();
    check(id + '-perspective-home-link-retains-language', await page.locator('html').getAttribute('lang') === other);
    const recap = createRecap({ locale, state: previous.game, notes: privateJourney.notes, includedNoteIds: [], created: '2026-10-16' });
    await test.go(buildRecapUrl(recap, base.href), '#recap-content');
    check(id + '-recap-excludes-unselected-private-note', !(await page.locator('#recap-content').innerText()).includes(privateJourney.notes.crossing));
    await page.locator(`[data-recap-locale="${other}"]`).click(); await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('#recap-content').waitFor();
    check(id + '-recap-language-switch-survives-reload', await page.locator('html').getAttribute('lang') === other);
    check(id + '-recap-has-separate-correct-home-and-walk', new URL(await page.locator('#journey-home-link').getAttribute('href'), page.url()).pathname.endsWith('/index.html')
      && new URL(await page.locator('#journey-walk-link').getAttribute('href'), page.url()).pathname.endsWith('/walk.html'));
    await test.go(`credits.html?lang=${locale}#lighting`, '#credits-language');
    await page.locator(`#credits-language [data-locale="${other}"]`).click(); await page.reload({ waitUntil: 'domcontentloaded' });
    check(id + '-credits-language-keeps-source-section', await page.locator('html').getAttribute('lang') === other && new URL(page.url()).hash === '#lighting');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tourguideai:journey:v2')));
    check(id + '-support-navigation-keeps-private-journey', JSON.stringify(saved.notes) === JSON.stringify(privateJourney.notes)
      && saved.game.x === previous.game.x && saved.game.y === previous.game.y
      && JSON.stringify(saved.game.choiceIds) === JSON.stringify(previous.game.choiceIds), { position: { x: saved.game.x, y: saved.game.y }, choices: saved.game.choiceIds });
    await test.close();
  });
  if (!baseline && selected('journeys')) for (const mobile of devices) for (const locale of ['en', 'zh']) await section(`journey-${locale}-${mobile ? 'phone' : 'desktop'}`, async () => {
    const id = `journey-${locale}-${mobile ? 'phone' : 'desktop'}`, test = await scenario(id, mobile), { page, context } = test;
    await test.go(`index.html?qa=1&lang=${locale}`, '#place-query');
    await page.waitForFunction(() => window.__HOME__?.snapshot().sceneState === 'ready');
    await page.locator('#live-stage').scrollIntoViewIfNeeded(); await test.capture(id + '-day-ready');
    check(id + '-perspectives-entry-visible', await page.locator('[data-link="memories"]').isVisible());
    const before = await state(page);
    await page.locator('#place-query').fill('wasd'); await page.locator('#place-query').press('ArrowUp');
    check(id + '-text-input-keeps-position', (await state(page)).x === before.x && (await state(page)).y === before.y);
    if (mobile) {
      const beforeCamera = await camera(page);
      await touchGesture(page, true);
      await page.waitForFunction(previous => Math.abs(window.__TOUR_GAME__.camera().distance - previous) > 0.05, beforeCamera.distance);
      check(id + '-actual-touch-pinch-zooms', Math.abs((await camera(page)).distance - beforeCamera.distance) > 0.05);
      const rotated = await camera(page); await touchGesture(page, false);
      await page.waitForFunction(previous => Math.abs(window.__TOUR_GAME__.camera().azimuth - previous) > 0.01, rotated.azimuth);
      const afterGesture = await state(page);
      check(id + '-touch-drag-looks-without-walking', afterGesture.x === before.x && afterGesture.y === before.y && !afterGesture.moving,
        { before, afterGesture, camera: await camera(page) });
      check(id + '-touch-guidance-describes-pinch', /Pinch|双指/.test(await page.locator('#view-guidance').innerText()), await page.locator('#view-guidance').innerText());
      await page.locator('#preview-reset').click();
    }
    const walkPoint = await page.evaluate(() => {
      const current = window.__TOUR_GAME__.snapshot(), rect = document.querySelector('#live-stage canvas').getBoundingClientRect();
      const target = window.__TOUR_GAME__.screenPoint(current.x + 0.5, current.y, 0.17);
      return { x: rect.x + target.x, y: rect.y + target.y, worldX: current.x + 0.5, worldY: current.y, visible: target.visible };
    });
    if (!walkPoint.visible) throw new Error('The short pavement target is outside the displayed camera.');
    if (mobile) await page.touchscreen.tap(walkPoint.x, walkPoint.y); else await page.mouse.click(walkPoint.x, walkPoint.y);
    await page.waitForFunction(target => { const value = window.__TOUR_GAME__.snapshot(); return !value.moving && Math.hypot(value.x - target.worldX, value.y - target.worldY) < 0.13; }, walkPoint);
    check(id + '-pavement-input-walks', true, await state(page));
    const dayFrames = await page.evaluate(() => window.__TOUR_GAME__.renderer().renderedFrames);
    await page.locator('#lighting-night').click();
    await page.waitForFunction(previous => {
      const renderer = window.__TOUR_GAME__?.renderer();
      return renderer?.lighting.phase === 'ready' && renderer.lighting.mode === 'night' && renderer.renderedFrames > previous;
    }, dayFrames);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    check(id + '-night-view-has-applied-environment-and-rendered-frame', true,
      await page.evaluate(() => ({ lighting: window.__TOUR_GAME__.renderer().lighting, renderedFrames: window.__TOUR_GAME__.renderer().renderedFrames })));
    await page.locator('#live-stage').scrollIntoViewIfNeeded(); await test.capture(id + '-night-ready');
    await page.locator('#mode-together').click(); await page.waitForFunction(() => window.__HOME__?.snapshot().map?.ready);
    const stopped = await page.evaluate(() => window.__TOUR_GAME__.renderer().updateFrames);
    await page.waitForTimeout(2000);
    const pausedFrames = await page.evaluate(() => window.__TOUR_GAME__.renderer().updateFrames);
    check(id + '-hidden-scene-stops-updates', pausedFrames === stopped, { before: stopped, after: pausedFrames, observedMs: 2000 });
    await page.locator('#mode-explore').click();
    check(id + '-return-retains-night-and-position', (await home(page)).lighting === 'night' && Math.abs((await state(page)).x - walkPoint.worldX) < 0.13);

    // 离线由浏览器实际断网产生；恢复后仍使用真实公共服务。
    await context.setOffline(true); await search(page, 'Kyoto');
    const other = locale === 'en' ? 'zh' : 'en'; await page.locator('#locale-' + other).click();
    check(id + '-failed-search-localizes-and-retains-query', await page.locator('#search-status').innerText() === copy(other, 'searchError')
      && await page.locator('#place-query').inputValue() === 'Kyoto');
    await context.setOffline(false); await page.locator('#locale-' + locale).click();
    const requested = page.waitForRequest(request => new URL(request.url()).hostname === 'photon.komoot.io');
    await page.locator('#place-query').fill('Kyoto Station'); await page.locator('#search-submit').click(); await requested;
    await page.locator('#locale-' + other).click();
    check(id + '-pending-search-keeps-replacement-available', await page.locator('#search-submit').isEnabled());
    const found = await search(page, 'Eiffel Tower');
    check(id + '-replacement-query-has-real-results', found.length > 0 && await page.locator('#place-query').inputValue() === 'Eiffel Tower', found);
    if (!found.length) throw new Error('Actual Photon replacement search returned no selectable Eiffel Tower result.');
    await selectResult(page);
    const origin = (await home(page)).center;
    check(id + '-wider-place-keeps-own-source-and-map', origin.id.startsWith('osm:') && await page.locator('#live-stage').isHidden()
      && new URL(await page.locator('#center-source').getAttribute('href')).hostname === 'www.openstreetmap.org', origin);
    const selectedRoute = (await home(page)).routes[0];
    check(id + '-nearby-order-has-real-source-links', selectedRoute?.stops.length > 1 && await page.locator('#route-stops a').count() > 1, selectedRoute);
    const reviewedRoutes = (await home(page)).routes;
    check(id + '-nearby-order-excludes-reviewed-coordinate-conflict', reviewedRoutes.length > 0
      && reviewedRoutes.every(route => !route.stops.includes('wikipedia:en:48435351')), reviewedRoutes);
    if (await page.locator('#route-stops [data-stop]').count() > 1) {
      await page.locator('#route-stops [data-stop]').nth(1).click();
      const routesBefore = (await home(page)).routes, mapBefore = (await home(page)).map;
      await page.locator('#locale-' + locale).click();
      const switched = await home(page);
      check(id + '-locale-keeps-discovery-order-after-stop-preview', JSON.stringify(switched.routes) === JSON.stringify(routesBefore), { origin, routesBefore, after: switched.routes });
      check(id + '-map-locale-preserves-camera-without-transition', switched.map.locale === locale
        && switched.map.cameraTransitions === mapBefore.cameraTransitions && Math.abs(switched.map.zoom - mapBefore.zoom) < 0.01,
        { before: mapBefore, after: switched.map });
    }
    const controls = await page.locator('#world-map .maplibregl-ctrl button[aria-label]').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    check(id + '-map-controls-follow-locale', controls.length >= 3 && controls.every(label => locale === 'zh' ? /[\u3400-\u9fff]/.test(label) : !/[\u3400-\u9fff]/.test(label)), controls);
    await page.locator('#world-map').scrollIntoViewIfNeeded(); await test.capture(id + '-wider-map');
    const maps = await page.locator('#route-maps a').evaluateAll(nodes => nodes.map(node => node.href));
    check(id + '-maps-handoff-preserves-route-coordinates', maps.length > 0 && maps.every(href => {
      const url = new URL(href); return url.hostname === 'www.google.com' && url.searchParams.get('destination') && url.searchParams.get('origin');
    }), maps);
    if (!mobile && locale === 'en') {
      const opened = page.waitForEvent('popup'); await page.locator('#route-maps a').first().click();
      const destination = await opened;
      await destination.waitForLoadState('domcontentloaded', { timeout: 30000 });
      const response = await destination.evaluate(() => ({ url: location.href,
        status: performance.getEntriesByType('navigation')[0]?.responseStatus, title: document.title }));
      check('actual-google-maps-handoff-opens-external-page', new URL(response.url).hostname.endsWith('google.com')
        && response.status >= 200 && response.status < 400, { requested: maps[0], ...response });
      await destination.close();
    }
    await page.locator('#copy-maps').click();
    check(id + '-maps-copy-or-visible-fallback-has-same-order', (await page.locator('#maps-text').inputValue()).includes(maps[0]));
    const countryResults = await search(page, 'Japan');
    if (!countryResults.length) throw new Error('Actual Photon country search returned no result.');
    await selectResult(page);
    const country = await home(page), countryLink = page.locator('#route-maps a').first();
    check(id + '-country-handoff-is-one-place', country.center.kind === 'country'
      && new URL(await countryLink.getAttribute('href')).pathname.includes('/maps/search')
      && (await countryLink.innerText()).includes(copy(locale, 'openPlaceMaps')), { center: country.center, label: await countryLink.innerText() });
    await context.setOffline(true); await search(page, 'Osaka'); await context.setOffline(false);
    check(id + '-failed-query-keeps-country-selection', (await home(page)).center.id === country.center.id);
    const empty = await search(page, 'zzqaxxyy9988776655zzqaxxyy');
    check(id + '-real-empty-query-shows-empty-state', !empty.length && await page.locator('#search-status').innerText() === copy(locale, 'noResults'), { returned: empty, text: await page.locator('#search-status').innerText() });
    await test.close();
  });
  if (!baseline && selected('map-recovery')) for (const mobile of devices) for (const locale of ['en', 'zh']) await section(`map-recovery-${locale}-${mobile ? 'phone' : 'desktop'}`, async () => {
    const id = `map-recovery-${locale}-${mobile ? 'phone' : 'desktop'}`, test = await scenario(id, mobile), { page, context } = test;
    await context.route('https://tiles.openfreemap.org/**', route => route.abort('connectionfailed'));
    await test.go(`index.html?qa=1&lang=${locale}&mode=together`, '#place-query');
    await page.waitForFunction(() => document.querySelector('#world-map').dataset.mapStatus === 'error');
    const found = await search(page, 'Japan'); if (!found.length) throw new Error('Real country search failed during map recovery case.');
    await page.locator('#search-results [data-result]').first().click();
    await page.waitForFunction(() => window.__HOME__?.snapshot().center.kind === 'country');
    const before = (await home(page)).center;
    check(id + '-map-error-keeps-real-selection-and-retry', await page.locator('#scene-retry').isVisible()
      && await page.locator('#scene-status').innerText() === copy(locale, 'mapError'), before);
    await page.locator('#world-map').scrollIntoViewIfNeeded(); await test.capture(id + '-failed');
    await context.unroute('https://tiles.openfreemap.org/**'); await page.locator('#scene-retry').click();
    await page.waitForFunction(() => window.__HOME__?.snapshot().map?.ready);
    check(id + '-real-retry-retains-country-and-locale', (await home(page)).center.id === before.id
      && (await home(page)).map.locale === locale && await page.locator('#world-map canvas').count() === 1, await home(page));
    await test.close();
  });
  if (!baseline && selected('rooms')) for (const mobile of devices) for (const locale of ['en', 'zh']) await section(`room-${locale}-${mobile ? 'phone' : 'desktop'}`, async () => {
    const id = `room-${locale}-${mobile ? 'phone' : 'desktop'}`, first = await scenario(id, mobile), alice = first.page;
    await first.go(`index.html?qa=1&lang=${locale}&mode=together`, '#room-create'); await connect(alice);
    await alice.locator('#traveler-name').fill('Walkthrough QA A'); await alice.locator('#room-title').fill('Local QA journey');
    await alice.locator('#room-create').click(); await room(alice, 1, 0);
    const invite = alice.url(), second = await scenario(id + '-recipient', mobile), bob = second.page;
    await second.go(`index.html?qa=1&lang=${locale}&mode=together`, '#room-create');
    await connect(bob, 'poll');
    const requestsBeforeInvite = second.record.authenticatedRequests.length;
    await second.go(invite, '#room-join');
    await bob.waitForFunction(() => window.__HOME__?.snapshot().invitationNeedsConfirmation);
    check(id + '-fresh-invite-sends-no-auth-before-confirmation', second.record.authenticatedRequests.length === requestsBeforeInvite);
    await connect(bob, 'poll'); await room(bob, 1, 0);
    await bob.locator('#traveler-name').fill('Walkthrough QA B'); await bob.locator('#room-join').click();
    await room(alice, 2, 0); await room(bob, 2, 0);
    const aliceResult = await search(alice, 'Kyoto'); if (!aliceResult.length) throw new Error('Real first participant search returned no result.');
    await selectResult(alice); await alice.locator('#add-dream').click(); await room(bob, 2, 1);
    const result = await search(bob, 'Japan'); if (!result.length) throw new Error('Real room wish search returned no selectable result.');
    await selectResult(bob); await bob.locator('#add-dream').click(); await room(alice, 2, 2); await room(bob, 2, 2);
    check(id + '-two-participants-see-both-real-wishes', new Set((await home(alice)).room.dreams.map(value => value.participantId)).size === 2);
    check(id + '-unconfigured-ai-remains-explicit', !(await home(alice)).aiReady && await alice.locator('#generate-plan').isDisabled()
      && !(await home(alice)).room.plan && await alice.locator('#ai-status').innerText() === copy(locale, 'aiUnavailable'));
    await alice.locator('[data-preview]').first().click(); await alice.locator('#back-world').waitFor();
    await alice.locator('#back-world').click(); check(id + '-shared-preview-returns-to-world', !(await home(alice)).localPreview);
    await bob.reload({ waitUntil: 'domcontentloaded' }); await room(bob, 2, 2);
    check(id + '-member-reload-keeps-confirmed-service', (await home(bob)).serviceEndpoint === service.url && !(await home(bob)).invitationNeedsConfirmation);
    await bob.locator('[data-remove-dream]').first().click(); await room(alice, 2, 1);
    check(id + '-removal-synchronizes', (await home(alice)).room.dreams.length === 1);
    await alice.locator('#together-panel').scrollIntoViewIfNeeded(); await first.capture(id + '-shared');
    await second.close(); await first.close();
  });
  if (!baseline && selected('scene-recovery')) for (const mobile of devices) for (const locale of ['en', 'zh']) await section(`scene-recovery-${locale}-${mobile ? 'phone' : 'desktop'}`, async () => {
    const id = `scene-recovery-${locale}-${mobile ? 'phone' : 'desktop'}`, test = await scenario(id, mobile), { page, context } = test;
    await context.route('**/models/shijo-block.glb', route => route.abort('connectionfailed'));
    await test.go(`index.html?qa=1&lang=${locale}`, '#place-query');
    await page.waitForFunction(() => window.__HOME__?.snapshot().sceneState === 'error');
    const original = (await home(page)).center;
    check(id + '-model-failure-is-localized-and-recoverable', await page.locator('#scene-retry').isVisible()
      && await page.locator('#scene-status').innerText() === copy(locale, 'sceneError'));
    await context.unroute('**/models/shijo-block.glb'); await page.locator('#scene-retry').click();
    await page.waitForFunction(() => window.__HOME__?.snapshot().sceneState === 'ready');
    check(id + '-model-retry-restores-real-scene-and-selection', (await home(page)).center.id === original.id
      && await page.locator('#live-stage canvas').count() === 1);
    const position = await state(page);
    await context.route('**/lighting/environments/night-1k.hdr', route => route.abort('connectionfailed'));
    await page.locator('#lighting-night').click();
    await page.waitForFunction(() => window.__TOUR_GAME__?.renderer().lighting.phase === 'fallback');
    const actual = await page.evaluate(() => window.__TOUR_GAME__.renderer().lighting), feedback = await page.locator('#scene-status').innerText();
    check(id + '-night-fallback-is-disclosed', /fallback|simplified|could not load|unavailable|备用|简化|未能|无法.*光/i.test(feedback), { actual, feedback });
    check(id + '-night-fallback-has-retry', await page.locator('#scene-retry').isVisible());
    await page.locator('#live-stage').scrollIntoViewIfNeeded(); await test.capture(id + '-night-fallback');
    const resetPose = await camera(page);
    if (mobile) await touchGesture(page, false);
    else {
      const canvas = await page.locator('#live-stage canvas').boundingBox();
      await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
      await page.mouse.down(); await page.mouse.move(canvas.x + canvas.width / 2 + 70, canvas.y + canvas.height / 2, { steps: 8 }); await page.mouse.up();
    }
    await page.waitForFunction(previous => Math.abs(window.__TOUR_GAME__.camera().azimuth - previous) > 0.01, resetPose.azimuth);
    await page.locator('#preview-reset').click();
    await page.waitForFunction(previous => Math.abs(window.__TOUR_GAME__.camera().azimuth - previous) < 0.01, resetPose.azimuth);
    const fallbackLayout = await page.evaluate(() => {
      const status = document.querySelector('#scene-status'), reset = document.querySelector('#preview-reset'), retry = document.querySelector('#scene-retry');
      return { status: status.getBoundingClientRect().toJSON(), reset: reset.getBoundingClientRect().toJSON(), retry: retry.getBoundingClientRect().toJSON(),
        completeText: status.scrollWidth <= status.clientWidth + 1 && status.scrollHeight <= status.clientHeight + 1 };
    });
    check(id + '-fallback-reset-is-usable-and-status-text-fits', fallbackLayout.completeText
      && (await state(page)).x === position.x && (await state(page)).y === position.y, fallbackLayout);
    await context.unroute('**/lighting/environments/night-1k.hdr');
    if (await page.locator('#scene-retry').isVisible()) {
      await page.locator('#scene-retry').click();
      await page.waitForFunction(() => { const light = window.__TOUR_GAME__?.renderer().lighting; return light?.phase === 'ready' && light.mode === 'night'; });
      check(id + '-night-retry-retains-position-and-mode', (await state(page)).x === position.x && (await state(page)).y === position.y
        && (await home(page)).lighting === 'night');
    }
    await test.close();
  });
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  await service?.close();
  const completed = report.responses.filter(item => !item.bodyUnavailable);
  check('completed-response-bodies-match-reviewed-build', completed.length > 0 && completed.every(item => item.matches),
    { count: completed.length, mismatches: completed.filter(item => !item.matches),
      unavailableAfterNavigation: report.responses.filter(item => item.bodyUnavailable),
      limit: 'Navigation can cancel asset downloads. Full deployed-package equality is verified separately.' });
  report.finishedAt = new Date().toISOString();
  report.summary = { passed: report.checks.filter(item => item.pass).length, failed: report.checks.filter(item => !item.pass).length };
  persist(); console.log(JSON.stringify(report.summary));
  if (report.summary.failed && !baseline) process.exitCode = 1;
}
