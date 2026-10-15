// 使用独立 SQLite 服务和实际构建产物检查首页；API 与 SSE 经过真实本地服务。
import { chromium } from 'playwright';
import { readFileSync, readdirSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { startServer } from '../server/src/server.js';

if (!process.argv[2]) {
  console.error('Usage: node tests/browser-homepage.mjs <built-dist-directory>');
  process.exit(2);
}
const dist = resolve(process.argv[2]);
const artifactRoot = resolve('..', 'artifacts', 'homepage-qa');
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || join(artifactRoot, 'browser'));
const timeout = Number(process.env.EXPERIENCE_QA_TIMEOUT || 120000);
const sha = value => createHash('sha256').update(value).digest('hex');
const assets = new Map();
function collect(directory, root = directory, target = assets) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path, root, target);
    else if (entry.isFile()) target.set('/' + relative(root, path).split(sep).join('/'), readFileSync(path));
  }
}
collect(dist);
if (!assets.has('/index.html') || !assets.has('/walk.html')) throw new Error('Build must contain the homepage and preserved walk.html.');
mkdirSync(output, { recursive: true }); mkdirSync(artifactRoot, { recursive: true });
const databaseDirectory = mkdtempSync(join(artifactRoot, 'database-'));
const manifest = values => [...values].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const files = manifest(assets), serverSources = new Map();
collect(fileURLToPath(new URL('../server/src', import.meta.url)), undefined, serverSources);
const backendFiles = manifest(serverSources);
const report = {
  startedAt: new Date().toISOString(),
  artifact: { directory: dist, manifestSha256: sha(JSON.stringify(files)), files },
  server: { sourceManifestSha256: sha(JSON.stringify(backendFiles)), files: backendFiles, databaseDirectory },
  driverSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  conditions: { desktop: [1440, 1000], phone: [390, 844], timeoutMs: timeout },
  checks: [], scenarios: {}, screenshots: [], observations: {},
  limitations: [
    'Automated participants are test inputs; this run does not measure human enjoyment, shared understanding or trip usefulness.',
    'Two isolated browser contexts exercise one local server; public deployment, cross-network availability and physical-device performance require separate evidence.',
    'The LLM provider is deliberately unconfigured in this run, which verifies honest unavailable behavior. No successful generated plan is invented.',
    'Software-rendered Chromium supplies rendering compatibility evidence; hardware frame-rate acceptance is outside this run.',
  ],
};
const persist = () => writeFileSync(join(output, 'homepage-result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, passed, evidence) {
  report.checks.push({ id, pass: Boolean(passed), evidence });
  persist(); console.log(`${passed ? 'PASS' : 'FAIL'} ${id}`);
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const providerOrigins = new Set(['https://tiles.openfreemap.org', 'https://photon.komoot.io', 'https://en.wikipedia.org']);
const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v1-completed.json', import.meta.url)));
const baseline = {
  'tourguideai:journey:v2': JSON.stringify({ version: 2, locale: 'zh', hints: true,
    game: { ...legacy.game, x: 31.25, y: 2.1 }, notes: { crossing: 'Private saved walk fixture' } }),
  'tourguideai:perspective:v1': JSON.stringify({ version: 1, chapter: 'kyoto-looking-closer', locale: 'en', mode: 'story', index: 0,
    revealedIds: ['arrive'], moments: [{ momentId: 'arrive', note: 'Private saved perspective fixture', view: { kind: 'story', scale: 1.2, x: 0.45, y: 0.6 } }],
    trial: { assignment: 'story', source: 'choice', crossover: false }, feedback: null }),
  'tourguideai:travel:v1': '{"selected":["mufg","crossing"],"meaningful":["mitsui"]}',
  'tourguideai:appearance:v1': '{"lighting":"night"}',
};
let browser, service, origin;
const contexts = new Set();
const safeURL = href => {
  const url = new URL(href);
  for (const key of [...url.searchParams.keys()]) if (/token|invite/i.test(key)) url.searchParams.set(key, '[redacted]');
  if (url.hash) url.hash = '[redacted]';
  return url.href;
};
async function scenario(name, { mobile = false, language = 'en', url, seed = baseline, blockProviders = false, blockAPI = false } = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile });
  contexts.add(context);
  const record = report.scenarios[name] = { assets: [], api: [], providers: [], providerResponses: [], blockedProviders: [], external: [], pageErrors: [], consoleErrors: [], requestFailures: [] };
  await context.route('**/*', route => {
    const requested = new URL(route.request().url()), path = decodeURIComponent(requested.pathname === '/' ? '/index.html' : requested.pathname);
    if (providerOrigins.has(requested.origin)) {
      record.providers.push(safeURL(requested.href));
      if (blockProviders) { record.blockedProviders.push(safeURL(requested.href)); return route.abort('blockedbyclient'); }
      return route.continue();
    }
    if (requested.origin !== origin) { record.external.push(safeURL(requested.href)); return route.abort('blockedbyclient'); }
    if (path.startsWith('/api/')) {
      record.api.push({ method: route.request().method(), url: safeURL(requested.href) });
      return blockAPI ? route.abort('connectionfailed') : route.continue();
    }
    record.assets.push(path);
    if (!assets.has(path)) return route.fulfill({ status: 404, body: 'Missing packaged resource' });
    return route.fulfill({ status: 200, contentType: mime[extname(path)] || 'application/octet-stream', body: assets.get(path) });
  });
  await context.addInitScript(({ origin, seed }) => {
    if (location.origin !== origin) return;
    if (!sessionStorage.getItem('homepage-qa-seeded')) {
      for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value);
      sessionStorage.setItem('homepage-qa-seeded', '1');
    }
  }, { origin, seed });
  context.on('page', page => {
    page.on('pageerror', error => record.pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push(message.text()); });
    page.on('requestfailed', request => record.requestFailures.push({ url: safeURL(request.url()), error: request.failure()?.errorText }));
    page.on('response', response => {
      if (providerOrigins.has(new URL(response.url()).origin)) record.providerResponses.push({ url: safeURL(response.url()), status: response.status() });
    });
  });
  const page = await context.newPage(); page.setDefaultTimeout(timeout);
  await page.goto(url ?? `${origin}/?qa=1&lang=${language}`, { waitUntil: 'domcontentloaded' });
  return { context, page, record };
}
async function capture(page, name, mobile = false) {
  const path = join(output, `${name}.png`); await page.screenshot({ path, fullPage: !mobile });
  report.screenshots.push({ name, path, sha256: sha(readFileSync(path)) }); persist();
}
async function isolate(page, id) {
  const current = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(baseline));
  check(id, Object.entries(baseline).every(([key, value]) => current[key] === value), current);
}
async function closeContext(context) { await context.close(); contexts.delete(context); }

const home = page => page.evaluate(() => window.__HOME__?.snapshot());
const position = page => page.evaluate(() => window.__TOUR_GAME__?.snapshot());
async function holdMovementKeyInField(page) {
  const tick = await page.evaluate(() => window.__TOUR_GAME__.snapshot().tick);
  await page.keyboard.down('w');
  try {
    await page.waitForFunction(previous => window.__TOUR_GAME__?.snapshot().tick >= previous + 6, tick);
  } finally { await page.keyboard.up('w'); }
}
async function ready(page) {
  await page.waitForFunction(() => window.__HOME__?.snapshot().serviceReady);
}
async function sceneReady(page) {
  await page.waitForFunction(() => window.__HOME__?.snapshot().sceneState === 'ready'
    && document.querySelector('#live-stage canvas')?.width > 0);
}
async function search(page, query) {
  await page.locator('#place-query').fill(query);
  await page.locator('#search-submit').click();
  await page.waitForFunction(() => !document.querySelector('#search-submit').disabled);
  return page.locator('#search-results [data-result]').allTextContents();
}
async function chooseResult(page, index = 0) {
  await page.locator('#search-results [data-result]').nth(index).click();
  await page.waitForFunction(() => !/Looking for places|正在寻找起点/.test(document.querySelector('#routes-status').textContent));
}
async function roomSettled(page, participants, dreams) {
  await page.waitForFunction(({ participants, dreams }) => {
    const room = window.__HOME__?.snapshot().room;
    return room?.participants.length === participants && (dreams === undefined || room.dreams.length === dreams);
  }, { participants, dreams });
}
async function layout(page, id) {
  const value = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth,
    controls: [...document.querySelectorAll('#place-search, .mode-switch, #live-stage, #world-map')]
      .filter(node => !node.hidden).map(node => { const r = node.getBoundingClientRect(); return { id: node.id || node.className, x: r.x, right: r.right, width: r.width }; }) }));
  check(id, value.documentWidth <= value.width + 1 && value.controls.every(item => item.x >= -1 && item.right <= value.width + 1), value);
}
async function section(id, operation) {
  try { await operation(); }
  catch (error) { check(id + '-completed', false, { error: error.message, stack: error.stack }); }
}

try {
  service = await startServer({ port: 0, host: '127.0.0.1', databasePath: join(databaseDirectory, 'rooms.sqlite'),
    config: { provider: { apiKey: '', model: '', baseUrl: 'https://api.openai.com/v1' } } });
  origin = service.url;
  const proxyValue = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const proxy = proxyValue ? new URL(proxyValue) : null;
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
    ...(process.env.EXPERIENCE_QA_CHROMIUM ? { executablePath: process.env.EXPERIENCE_QA_CHROMIUM } : {}),
    ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1',
      ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.conditions.browser = browser.version();
  report.conditions.externalProxyConfigured = Boolean(proxy);
  persist();

  await section('explore-and-two-clients', async () => {
    const first = await scenario('alice'); const page = first.page;
    await ready(page); await sceneReady(page);
    const initial = await home(page);
    check('default-explore-has-real-kyoto-canvas', initial.mode === 'explore' && initial.sceneState === 'ready'
      && (await page.locator('#live-stage canvas').count()) === 1, initial);
    check('default-local-scene-does-not-fetch-discovery-or-tiles', first.record.providers.length === 0, first.record.providers);
    await layout(page, 'desktop-en-layout'); await capture(page, 'home-explore-en');
    const target = await page.evaluate(() => {
      const state = window.__TOUR_GAME__.snapshot(), rect = document.querySelector('#live-stage canvas').getBoundingClientRect();
      const point = window.__TOUR_GAME__.screenPoint(state.x + 0.75, state.y, 0.17);
      return { worldX: state.x + 0.75, worldY: state.y, x: rect.x + point.x, y: rect.y + point.y, visible: point.visible };
    });
    if (!target.visible) throw new Error('Short walk target is not visible in the initial camera.');
    await page.mouse.click(target.x, target.y);
    await page.waitForFunction(target => { const state = window.__TOUR_GAME__.snapshot(); return !state.moving
      && Math.hypot(state.x - target.worldX, state.y - target.worldY) < 0.12; }, target);
    check('homepage-pavement-click-walks-without-old-encounter-markers',
      await page.evaluate(() => window.__TOUR_GAME__.renderer().scene.markerCount === 0), { target, state: await position(page) });
    const beforeInput = await position(page);
    await page.locator('#place-query').focus();
    await page.keyboard.type('wasd Kyoto'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight');
    await holdMovementKeyInField(page);
    const afterInput = await position(page);
    check('search-typing-does-not-move-traveller', beforeInput?.x === afterInput?.x && beforeInput?.y === afterInput?.y,
      { before: beforeInput, after: afterInput });
    check('default-route-has-all-three-sourced-stops', (await page.locator('#route-stops li').count()) === 3
      && (await page.locator('#route-stops a').count()) === 3, await page.locator('#route-stops').innerText());
    const maps = await page.locator('#route-maps a').evaluateAll(nodes => nodes.map(node => node.href));
    check('default-google-maps-is-real-coordinate-route', maps.length === 1
      && new URL(maps[0]).hostname === 'www.google.com' && new URL(maps[0]).searchParams.get('destination')
      && new URL(maps[0]).searchParams.get('origin'), maps);
    const poseBeforeLocale = await position(page);
    await page.locator('#locale-zh').click();
    check('desktop-zh-copy-preserves-scene-position', await page.locator('html').getAttribute('lang') === 'zh'
      && (await position(page)).x === poseBeforeLocale.x && (await position(page)).y === poseBeforeLocale.y,
      { heading: await page.locator('h1').innerText(), position: await position(page) });
    check('desktop-zh-curated-route-and-memory-link-localize', /四条/.test(await page.locator('#route-title').innerText())
      && /视角/.test(await page.locator('[data-link="memories"]').innerText()),
      { routeTitle: await page.locator('#route-title').innerText(), memories: await page.locator('[data-link="memories"]').innerText() });
    await capture(page, 'home-explore-zh');
    await page.locator('#locale-en').click();
    const beforeLighting = await position(page);
    await page.locator('#lighting-night').click();
    await page.waitForFunction(() => window.__HOME__?.snapshot().lighting === 'night');
    check('homepage-night-switch-preserves-position-and-route', (await position(page)).x === beforeLighting.x
      && (await position(page)).y === beforeLighting.y && (await home(page)).routes[0].stops.length === 3,
      { home: await home(page), position: await position(page) });
    await capture(page, 'home-explore-night');
    await page.locator('#lighting-day').click();
    await page.waitForFunction(() => window.__HOME__?.snapshot().lighting === 'day');
    const links = await page.locator('#walk-link, #companion-link, [data-link="memories"]').evaluateAll(nodes => nodes.map(node => ({ id: node.id || node.dataset.link, href: node.href })));
    check('preserved-experience-links-have-correct-entries', links.some(link => new URL(link.href).pathname === '/walk.html')
      && links.some(link => new URL(link.href).pathname === '/travel.html') && links.some(link => new URL(link.href).pathname === '/perspective.html'), links);
    await isolate(page, 'explore-preserves-all-private-saves');

    const found = await search(page, 'Eiffel Tower');
    check('actual-photon-search-returns-identified-results', found.length > 0,
      { query: 'Eiffel Tower', results: found, status: await page.locator('#search-status').innerText(), responses: first.record.providerResponses.filter(item => item.url.includes('photon')) });
    if (!found.length) throw new Error('Live Photon search returned no selectable result; later live-provider UI checks remain unverified.');
    await chooseResult(page);
    const searched = await home(page);
    check('selected-center-retains-provider-source', searched.center.id.startsWith('osm:')
      && new URL(await page.locator('#center-source').getAttribute('href')).hostname === 'www.openstreetmap.org', searched.center);
    check('non-kyoto-center-shows-geographic-map', await page.locator('#live-stage').isHidden()
      && await page.locator('#world-map').isVisible() && /AREA|区域/.test(await page.locator('#preview-kind').innerText()), searched);
    await page.waitForFunction(() => window.__HOME__?.snapshot().map?.ready || document.querySelector('#world-map').dataset.mapStatus === 'error');
    if ((await home(page)).map?.ready) {
      await page.waitForFunction(() => { const map = window.__HOME__?.snapshot().map; return map.zoom > 16 && map.pitch > 55; });
    }
    check('actual-openfreemap-ready', (await home(page)).map?.ready === true,
      { map: (await home(page)).map, status: await page.locator('#scene-status').textContent(), providerResponses: first.record.providerResponses.filter(item => item.url.includes('openfreemap')) });
    await page.waitForFunction(() => window.__HOME__?.snapshot().map?.renderedBuildings > 0);
    check('local-area-renders-actual-building-extrusions', (await home(page)).map.buildingLayer === 'fill-extrusion'
      && (await home(page)).map.renderedBuildings > 0, (await home(page)).map);
    const routeCount = await page.locator('#route-options [data-route]').count();
    check('actual-wikipedia-nearby-produces-sourced-options', routeCount > 0,
      { routes: searched.routes, status: await page.locator('#routes-status').textContent(), responses: first.record.providerResponses.filter(item => item.url.includes('wikipedia')) });
    if (routeCount) {
      await page.locator('#route-options [data-route]').last().click();
      const expected = (await home(page)).routes.at(-1).stops.length;
      check('route-choice-updates-ordered-stops-and-map', (await page.locator('#route-stops li').count()) === expected
        && (await home(page)).map.routes[0]?.length === expected,
        { expected, map: (await home(page)).map, stops: await page.locator('#route-stops').innerText() });
    }
    await capture(page, 'home-searched-area');
    await page.locator('#mode-together').click();
    check('mode-change-preserves-selected-center', (await home(page)).center.id === searched.center.id, await home(page));
    await page.locator('#traveler-name').fill('Alice QA'); await page.locator('#room-title').fill('Shared places QA');
    await page.locator('#room-create').click(); await roomSettled(page, 1, 0);
    const invite = page.url();
    const invitation = new URLSearchParams(new URL(invite).hash.slice(1));
    check('invitation-fragment-has-no-participant-credential', invitation.has('room') && invitation.has('invite')
      && !invitation.has('participantToken') && !new URL(invite).searchParams.has('invite'), { fragmentKeys: [...invitation.keys()] });
    const second = await scenario('bob', { url: invite });
    const bob = second.page;
    // 邀请地址不会携带 QA 参数；添加只读观察参数不改变邀请内容。
    if (!new URL(bob.url()).searchParams.has('qa')) {
      const observe = new URL(bob.url()); observe.searchParams.set('qa', '1'); await bob.goto(observe.href, { waitUntil: 'domcontentloaded' });
    }
    await ready(bob); await bob.waitForFunction(() => window.__HOME__?.snapshot().room?.participants.length === 1);
    check('fresh-invite-is-read-only-until-join', await bob.locator('#room-join').isVisible()
      && await bob.locator('#room-create').isHidden(), { participants: (await home(bob)).room.participants.length });
    await bob.locator('#traveler-name').fill('Bob QA'); await bob.locator('#room-join').click();
    await roomSettled(page, 2, 0); await roomSettled(bob, 2, 0);
    check('two-browser-clients-share-actual-joined-room', (await home(page)).room.id === (await home(bob)).room.id,
      { participants: (await home(page)).room.participants.map(person => person.displayName), revision: (await home(page)).room.revision });

    await page.locator('#mode-explore').click(); await page.locator('#mode-together').click();
    const aliceSearch = await search(page, 'Eiffel Tower');
    if (!aliceSearch.length) throw new Error('Alice could not select a real place for her wish.');
    await chooseResult(page); await page.locator('#add-dream').click();
    await roomSettled(page, 2, 1); await roomSettled(bob, 2, 1);
    check('first-wish-streams-to-other-client', (await home(bob)).room.dreams[0].destinationId === (await home(page)).room.dreams[0].destinationId,
      { dreams: (await home(bob)).room.dreams, eventsRequested: second.record.api.some(item => item.url.endsWith('/events')) });
    const wikipediaBeforeCountry = second.record.providers.filter(url => url.includes('wikipedia.org')).length;
    const bobSearch = await search(bob, 'Japan');
    if (!bobSearch.length) throw new Error('Bob could not select a real place for his wish.');
    await chooseResult(bob);
    await bob.waitForFunction(() => { const map = window.__HOME__?.snapshot().map; return Math.abs(map?.zoom - 4) < 0.05 && map.pitch < 0.05; });
    check('country-result-shows-country-context-without-nearby-walk', (await home(bob)).center.kind === 'country'
      && (await home(bob)).routes.length === 0 && second.record.providers.filter(url => url.includes('wikipedia.org')).length === wikipediaBeforeCountry,
      { center: (await home(bob)).center, map: (await home(bob)).map, explanation: await bob.locator('#routes-status').innerText() });
    await capture(bob, 'home-country-context');
    await bob.locator('#add-dream').click();
    await roomSettled(page, 2, 2); await roomSettled(bob, 2, 2);
    const shared = (await home(page)).room;
    check('two-participants-have-distinct-contributions', new Set(shared.dreams.map(dream => dream.participantId)).size === 2
      && new Set(shared.dreams.map(dream => dream.destinationId)).size === 2,
      { dreams: shared.dreams, catalog: shared.catalog.map(place => ({ id: place.id, name: place.name })) });
    check('unconfigured-ai-never-claims-a-generated-plan', !(await home(page)).aiReady && await page.locator('#generate-plan').isDisabled()
      && !shared.plan && await page.locator('#accept-plan').isHidden(), { status: await page.locator('#ai-status').innerText(), plan: shared.plan });
    await page.locator('#preferences').fill('Architecture, no rush, ten days.');
    check('world-order-line-retains-both-destinations', (await home(page)).map.places.length === 2
      && (await home(page)).map.routes[0]?.length === 2, (await home(page)).map);
    await capture(page, 'home-together-two-clients');
    await bob.locator('#locale-zh').click(); await capture(bob, 'home-together-zh');
    const beforeReload = (await home(bob)).room;
    const reloadURL = new URL(bob.url()); reloadURL.searchParams.set('qa', '1');
    await bob.goto(reloadURL.href, { waitUntil: 'domcontentloaded' }); await ready(bob); await roomSettled(bob, 2, 2);
    check('room-reload-restores-participant-and-current-snapshot', await bob.locator('#room-setup').isHidden()
      && (await home(bob)).room.revision >= beforeReload.revision && (await home(bob)).room.dreams.length === 2,
      { revision: (await home(bob)).room.revision, participants: (await home(bob)).room.participants.length });
    await bob.locator('[data-remove-dream]').first().click(); await roomSettled(page, 2, 1); await roomSettled(bob, 2, 1);
    check('removing-own-wish-updates-other-client', (await home(page)).room.dreams[0].participantId === shared.dreams[0].participantId,
      { remaining: (await home(page)).room.dreams });
    await page.locator('[data-preview]').first().click();
    check('shared-place-can-open-local-geographic-preview', (await home(page)).localPreview
      && await page.locator('#back-world').isVisible(), { center: (await home(page)).center, map: (await home(page)).map });
    await page.locator('#back-world').click();
    check('back-world-restores-shared-context', !(await home(page)).localPreview && (await home(page)).mode === 'together', await home(page));
    await isolate(page, 'alice-shared-journey-preserves-private-saves'); await isolate(bob, 'bob-shared-journey-preserves-private-saves');
    const roomText = JSON.stringify((await home(page)).room);
    check('private-notes-and-credentials-excluded-from-room', !/Private saved|participantToken|inviteToken/.test(roomText), { roomFields: Object.keys((await home(page)).room) });
    await closeContext(second.context); await closeContext(first.context);
  });

  for (const context of [...contexts]) await closeContext(context);
  await section('mobile', async () => {
    const item = await scenario('mobile', { mobile: true }); const page = item.page;
    await ready(page); await sceneReady(page); await layout(page, 'phone-en-no-horizontal-overflow');
    await capture(page, 'home-phone-en', true);
    const before = await position(page);
    await page.locator('#place-query').tap(); await page.keyboard.type('wasd'); await page.keyboard.press('ArrowUp');
    await holdMovementKeyInField(page);
    check('phone-search-entry-keeps-traveller-position', (await position(page)).x === before.x && (await position(page)).y === before.y,
      { before, after: await position(page) });
    await page.locator('#locale-zh').tap(); await layout(page, 'phone-zh-no-horizontal-overflow');
    check('phone-zh-controls-and-legacy-links-localize', await page.locator('html').getAttribute('lang') === 'zh'
      && (await page.locator('#walk-link').getAttribute('href')).includes('lang=zh'), await page.locator('#mode-explore').innerText());
    await capture(page, 'home-phone-zh', true);
    await page.locator('#live-stage').scrollIntoViewIfNeeded(); await capture(page, 'home-phone-zh-scene', true);
    await page.locator('#mode-together').tap();
    await layout(page, 'phone-together-zh-no-horizontal-overflow');
    await page.locator('#room-setup').scrollIntoViewIfNeeded(); await capture(page, 'home-phone-together-zh', true);
    check('phone-together-room-controls-are-operable', await page.locator('#room-create').isEnabled()
      && await page.locator('#traveler-name').isVisible(), await page.locator('#room-setup').innerText());
    await page.locator('#locale-en').tap(); await layout(page, 'phone-together-en-no-horizontal-overflow');
    await isolate(page, 'phone-preserves-existing-private-saves'); await closeContext(item.context);
  });

  await section('unavailable-providers', async () => {
    const item = await scenario('unavailable-providers', { blockProviders: true, url: `${origin}/?qa=1&mode=together` }); const page = item.page;
    await ready(page);
    const before = (await home(page)).center;
    const result = await search(page, 'Kyoto');
    check('blocked-live-search-reports-error-with-query-retained', result.length === 0
      && /unavailable/.test(await page.locator('#search-status').innerText())
      && await page.locator('#place-query').inputValue() === 'Kyoto' && (await home(page)).center.id === before.id,
      { status: await page.locator('#search-status').innerText(), blocked: item.record.blockedProviders });
    await page.waitForFunction(() => document.querySelector('#world-map').dataset.mapStatus === 'error');
    check('blocked-map-has-visible-error', /could not load/.test(await page.locator('#scene-status').innerText()), await page.locator('#scene-status').innerText());
    await capture(page, 'home-provider-unavailable'); await isolate(page, 'failed-provider-keeps-private-saves'); await closeContext(item.context);
  });
  await section('unavailable-room-service', async () => {
    const item = await scenario('unavailable-service', { blockAPI: true, blockProviders: true, url: `${origin}/?qa=1&mode=together&lang=zh` }); const page = item.page;
    await page.waitForFunction(() => /托管服务/.test(document.querySelector('#room-status').textContent));
    check('unavailable-service-disables-creation-with-honest-copy', await page.locator('#room-create').isDisabled()
      && !(await home(page)).serviceReady && !(await home(page)).aiReady, await page.locator('#room-status').innerText());
    await isolate(page, 'unavailable-service-keeps-private-saves'); await closeContext(item.context);
  });
  await section('legacy-redirect', async () => {
    const item = await scenario('legacy-redirect', { url: `${origin}/index.html?lighting=night&qa=1&lang=zh` });
    await item.page.waitForURL('**/walk.html?lighting=night&qa=1&lang=zh');
    check('old-lighting-link-redirects-to-preserved-walk', new URL(item.page.url()).pathname === '/walk.html'
      && new URL(item.page.url()).searchParams.get('lighting') === 'night', safeURL(item.page.url()));
    await closeContext(item.context);
  });
  for (const [name, value] of Object.entries(report.scenarios)) {
    check(`${name}-no-page-exceptions`, value.pageErrors.length === 0, value.pageErrors);
    if (!name.startsWith('unavailable')) check(`${name}-no-console-errors`, value.consoleErrors.length === 0, value.consoleErrors);
    check(`${name}-requests-use-declared-origins`, value.external.length === 0, value.external);
  }
} catch (error) {
  report.fatal = { message: error.message, stack: error.stack };
} finally {
  for (const context of [...contexts]) await closeContext(context);
  await browser?.close(); await service?.close();
  report.finishedAt = new Date().toISOString();
  report.summary = { passed: report.checks.filter(item => item.pass).length, failed: report.checks.filter(item => !item.pass).length,
    fatal: Boolean(report.fatal) };
  persist(); console.log(JSON.stringify(report.summary));
  if (report.summary.failed || report.fatal) process.exitCode = 1;
}
