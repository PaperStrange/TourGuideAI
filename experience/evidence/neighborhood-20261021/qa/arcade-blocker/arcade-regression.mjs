// 从已实际行走的位置重建返回记录；后续移动全部使用页面控件。
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join, relative, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const require = createRequire(join(root, 'experience/package.json'));
const { chromium } = require('playwright');
const { Matrix4, Vector3 } = require('three');
const { startServer } = await import(pathToFileURL(join(root, 'experience/server/src/server.js')).href);
const { createJourneyPlanner } = await import(pathToFileURL(join(root, 'experience/src/journey/recommendations.js')).href);
const { createJourneySession, JOURNEY_STORAGE_KEY } = await import(pathToFileURL(join(root, 'experience/src/journey/session.js')).href);
const { SIGHTS } = await import(pathToFileURL(join(root, 'experience/src/neighborhoods/shijo-east/sights.js')).href);
if (!process.argv[2] || !process.env.EXPERIENCE_QA_OUTPUT) throw new Error('Provide the frozen built directory and explicit output directory.');
const dist = resolve(process.argv[2]), output = resolve(process.env.EXPERIENCE_QA_OUTPUT);
const sourcePath = join(root, 'artifacts/neighborhood-20261021/qa/first-arcade/result.json');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceBytes = readFileSync(sourcePath), source = JSON.parse(sourceBytes);
if (sha(sourceBytes) !== 'ab353164cf5c4fdd323880d9368e3f96f9ffc0abff3f80a0e655801ed7880ebb') throw new Error('The retained actual-walk evidence changed.');
const visited = source.error.observed, view = visited.home.currentView;
const geography = JSON.parse(readFileSync(join(root, 'experience/src/neighborhoods/shijo-east/geography.json')));
if (!visited.ground.inside || !visited.ground.hit || view.packId !== geography.id || view.revision !== geography.revision) throw new Error('The retained pose lacks valid visited-ground provenance.');
const planner = createJourneyPlanner({ routeId: geography.id, revision: geography.revision,
  graph: geography.navigation, startNodeId: geography.startNodeId, sights: SIGHTS });
const session = createJourneySession(planner.route(visited.home.neighborhood.selected), { view, lighting: 'day' });
const assets = new Map();
function collect(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) collect(path);
    else assets.set('/' + relative(dist, path).split(sep).join('/'), readFileSync(path));
  }
}
collect(dist); mkdirSync(output, { recursive: true });
const files = [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const report = { startedAt: new Date().toISOString(), driverSha256: sha(readFileSync(new URL(import.meta.url))),
  artifact: { directory: dist, files, manifestSha256: sha(JSON.stringify(files)) },
  restoration: { sourceReport: relative(root, sourcePath), sourceReportSha256: sha(sourceBytes),
    sourcePackageSha256: source.artifact.manifestSha256, sourcePosition: visited.route.position,
    sourceView: view, reconstructedSession: session,
    description: 'New session created through public helpers from a previously observed, actually visited pose and selected order. Original localStorage bytes were not retained.' },
  conditions: { viewport: [1440, 1000], reducedMotion: 'no-preference', walkingTimeoutMs: 600000 },
  checks: [], captures: [], trace: [], inputs: [], pageErrors: [], requests: [] };
const persist = () => writeFileSync(join(output, 'arcade-result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, pass, evidence) { report.checks.push({ id, pass: Boolean(pass), evidence }); persist(); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`); }
const samePlayer = (a, b) => a.edgeId === b.edgeId && ['x', 'y', 'height', 'edgeDistance'].every(key => Math.abs(a[key] - b[key]) < .003);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff' };
let browser, context, page, service;
const observe = () => page.evaluate(() => ({ home: window.__HOME__?.snapshot(), state: window.__TOUR_GAME__?.snapshot(),
  route: window.__TOUR_GAME__?.route(), stream: window.__TOUR_GAME__?.streaming(), ground: window.__TOUR_GAME__?.grounding(),
  camera: window.__TOUR_GAME__?.camera(), renderer: window.__TOUR_GAME__?.renderer(), inspection: window.__TOUR_GAME__?.inspection() }));
async function ready(mode) {
  await page.waitForFunction(mode => {
    const h = window.__HOME__?.snapshot(), r = window.__TOUR_GAME__?.renderer();
    return h?.pack?.packId === 'shijo-east' && h.sceneState === 'ready' && r?.status === 'ready'
      && r.lighting.phase === 'ready' && (!mode || r.lighting.mode === mode) && r.renderedFrames > 0;
  }, mode);
}
async function settled() {
  await page.waitForFunction(() => {
    const s = window.__TOUR_GAME__?.streaming();
    return s && !s.downloads.active && !s.downloads.queued && !s.attachments.active && !s.attachments.queued;
  });
}
async function capture(name, waitForScene = true) {
  if (waitForScene) await settled();
  const layout = () => page.evaluate(() => ({ scrollX, scrollY, viewport: { width: innerWidth, height: innerHeight },
    visualColumn: document.querySelector('.visual-column')?.getBoundingClientRect().toJSON(),
    canvas: document.querySelector('#live-stage canvas')?.getBoundingClientRect().toJSON() }));
  const beforeScroll = await layout();
  await page.evaluate(() => window.scrollTo({ left: 0, top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => window.scrollY === 0);
  const afterScroll = await layout();
  const file = name + '.png';
  await page.screenshot({ path: join(output, file), fullPage: true });
  report.captures.push({ file, capturedAt: new Date().toISOString(), sha256: sha(readFileSync(join(output, file))),
    layout: { beforeScroll, afterScroll }, observed: await observe() });
  if (waitForScene) {
    const canvasFile = name + '-canvas.png';
    await page.locator('#live-stage canvas').screenshot({ path: join(output, canvasFile) });
    report.captures.push({ file: canvasFile, kind: 'actual-canvas', capturedAt: new Date().toISOString(),
      sha256: sha(readFileSync(join(output, canvasFile))), layout: await layout(), observed: await observe() });
  }
  persist(); console.log('CAPTURE ' + file);
}
async function lighting(mode) { await page.locator('#lighting-' + mode).click(); await ready(mode); }
async function walkUntil(id, predicate) {
  const started = Date.now();
  while (Date.now() - started < 600000) {
    const current = await observe();
    report.trace.push({ id, elapsedMs: Date.now() - started, route: current.route, ground: current.ground,
      stream: current.stream, camera: current.camera, tick: current.state.tick, renderedFrames: current.renderer.renderedFrames,
      updateFrames: current.renderer.updateFrames, render: current.renderer.render, shadows: current.renderer.scene?.shadows });
    persist();
    if (predicate(current)) return current;
    await page.waitForTimeout(1000);
  }
  throw new Error('Actual walking deadline reached: ' + id);
}
async function inspect(name, faceEast = false) {
  await page.locator('#solo-inspect').click(); await page.locator('#live-stage').focus();
  const initial = await observe();
  if (faceEast) {
    for (let step = 0; step < 22; step++) await page.keyboard.press('j');
    await page.waitForFunction(() => !window.__TOUR_GAME__.camera().transitioning);
    report.inputs.push({ operation: 'inspection-orbit', key: 'j', presses: 22 });
  }
  await page.locator('#live-stage canvas').scrollIntoViewIfNeeded();
  const bounds = await page.locator('#live-stage canvas').boundingBox();
  let observed;
  for (const [x, y] of [[.5, .35], [.25, .35], [.75, .35], [.25, .6], [.75, .6], [.5, .15]]) {
    await page.mouse.move(bounds.x + bounds.width * x, bounds.y + bounds.height * y);
    const update = (await observe()).renderer.updateFrames;
    await page.waitForFunction(update => window.__TOUR_GAME__.renderer().updateFrames > update, update);
    observed = await observe(); if (observed.inspection.focus) break;
  }
  if (observed.inspection.focus) {
    await page.locator('#solo-detail').click();
    await page.waitForFunction(() => Boolean(window.__TOUR_GAME__.inspection().selected));
  }
  const final = await observe();
  check(name + '-actual-surface-inspection-preserves-position', Boolean(final.inspection.focus && final.inspection.selected)
    && samePlayer(final.route.position, initial.route.position), { inspection: final.inspection, camera: final.camera, position: final.route.position });
  await capture(name + '-inspection');
  if (final.inspection.selected) await page.locator('#solo-close-detail').click();
  await page.locator('#live-stage').focus(); await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__TOUR_GAME__.inspection().enabled);
}
function projectedActor(current) {
  return [0, 1.6].map(height => new Vector3(current.route.position.x, current.route.position.height + height, -current.route.position.y)
    .applyMatrix4(new Matrix4().fromArray(current.camera.matrixWorld).invert())
    .applyMatrix4(new Matrix4().fromArray(current.camera.projectionMatrix)).toArray());
}

try {
  service = await startServer({ port: 0, host: '127.0.0.1', databasePath: join(output, 'rooms.sqlite'), config: { provider: { apiKey: '', model: '' } } });
  const address = process.env.HTTPS_PROXY || process.env.HTTP_PROXY, proxy = address ? new URL(address) : null;
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM, headless: true, args: ['--no-sandbox'],
    ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1', ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.browser = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', deviceScaleFactor: 1 });
  await context.route(service.url + '/**', route => {
    const url = new URL(route.request().url()), path = url.pathname === '/' ? '/index.html' : url.pathname;
    if (path.startsWith('/api/')) return route.continue();
    const bytes = assets.get(path);
    return route.fulfill({ status: bytes ? 200 : 404, contentType: mime[extname(path)] || 'application/octet-stream', body: bytes || 'Missing packaged asset' });
  });
  await context.addInitScript(({ origin, key, session }) => {
    if (location.origin === origin && !sessionStorage.getItem('arcade-qa-restored')) {
      localStorage.setItem(key, JSON.stringify(session)); sessionStorage.setItem('arcade-qa-restored', '1');
    }
  }, { origin: service.url, key: JOURNEY_STORAGE_KEY, session });
  page = await context.newPage(); page.setDefaultTimeout(120000);
  page.on('request', request => { const url = new URL(request.url()); report.requests.push({ origin: url.origin, path: url.pathname }); });
  page.on('pageerror', error => { report.pageErrors.push(error.message); persist(); });
  await page.goto(service.url + '/?qa=1&lang=en&mode=explore', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__HOME__));
  await page.locator('#journey-enter').click(); await ready('day'); await settled();
  const restored = await observe();
  check('restored-position-matches-prior-actual-walk-evidence', samePlayer(restored.route.position, view.player)
    && !restored.route.destination && restored.ground.inside && restored.ground.hit, restored);
  if (!samePlayer(restored.route.position, view.player)) throw new Error('The previously visited pose was not restored.');
  await capture('restored-approach-day');
  const market = geography.sights.find(sight => sight.id === 'nishiki-market');
  await page.locator('[data-journey-focus="nishiki-market"]').click();
  report.inputs.push({ operation: 'walk-to-sight', sightId: market.id });
  const arrived = await walkUntil('remaining-walk-to-market', current => !current.route.destination
    && Math.hypot(current.route.position.x - market.x, current.route.position.y - market.y) < .15);
  check('remaining-route-reaches-market-by-actual-walking', arrived.ground.inside && arrived.ground.hit
    && arrived.state.visitedIds.length === 0 && Object.keys(arrived.state.choiceIds).length === 0, arrived);
  await capture('market-approach-day'); await lighting('night'); await capture('market-approach-night');
  await lighting('day'); await inspect('market-approach');
  await page.locator('[data-journey-focus="nishiki-tenmangu"]').click();
  report.inputs.push({ operation: 'walk-to-sight', sightId: 'nishiki-tenmangu', stopAfterMetres: 20 });
  await walkUntil('inside-arcade', current => Math.hypot(current.route.position.x - arrived.route.position.x,
    current.route.position.y - arrived.route.position.y) >= 20);
  await page.locator('#journey-stop').click();
  await page.waitForFunction(() => !window.__TOUR_GAME__.route().goal);
  const stopped = await observe(); await page.waitForTimeout(1000); const retained = await observe();
  check('inside-arcade-stop-retains-real-grounded-position', !stopped.route.destination && stopped.ground.hit && stopped.ground.inside
    && samePlayer(stopped.route.position, retained.route.position)
    && Math.hypot(stopped.route.position.x - arrived.route.position.x, stopped.route.position.y - arrived.route.position.y) >= 19.5, stopped);
  const projection = projectedActor(stopped);
  check('inside-arcade-actor-is-within-actual-rendered-camera', projection.every(([x, y, z]) => Math.abs(x) <= 1 && Math.abs(y) <= 1 && Math.abs(z) <= 1),
    { projection, camera: stopped.camera });
  await capture('inside-arcade-day'); await lighting('night'); await capture('inside-arcade-night');
  await inspect('inside-arcade', true); await capture('inside-arcade-east-night');
  await lighting('day'); await capture('inside-arcade-east-day');
  // 使用真实键盘将视点降到棚顶下方，保留实际行走位置。
  await page.locator('#solo-inspect').click(); await page.locator('#live-stage').focus();
  const framingStart = await observe();
  for (let step = 0; step < 16; step++) await page.keyboard.press('=');
  for (let step = 0; step < 8; step++) await page.keyboard.press('k');
  report.inputs.push({ operation: 'below-roof-framing', keys: [{ key: '=', presses: 16 }, { key: 'k', presses: 8 }] });
  await page.waitForFunction(() => !window.__TOUR_GAME__.camera().transitioning);
  const belowRoof = await observe();
  check('actual-controls-frame-below-arcade-roof-without-moving-player',
    samePlayer(framingStart.route.position, belowRoof.route.position)
    && belowRoof.camera.position[1] < 4.65 && belowRoof.camera.position[1] > belowRoof.route.position.height
    && belowRoof.camera.distance <= 10.001 && belowRoof.camera.polar >= 1.44,
    { before: framingStart.camera, after: belowRoof.camera, position: belowRoof.route.position });
  await capture('inside-arcade-below-roof-day'); await lighting('night'); await capture('inside-arcade-below-roof-night');
  await page.locator('#live-stage').focus(); await page.keyboard.press('Escape');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), JOURNEY_STORAGE_KEY);
  report.finalSession = saved;
  check('bounded-regression-preserves-selected-order-and-no-runtime-exceptions', JSON.stringify(saved.stopIds) === JSON.stringify(session.stopIds)
    && report.pageErrors.length === 0, { saved, errors: report.pageErrors });
} catch (error) {
  report.error = { message: error.message, stack: error.stack };
  if (page && !page.isClosed()) { report.error.observed = await observe(); await capture('failure', false); }
  check('bounded-arcade-regression-completed', false, report.error);
} finally {
  await context?.close(); await browser?.close(); await service?.close();
  report.finishedAt = new Date().toISOString(); report.summary = { passed: report.checks.filter(item => item.pass).length,
    failed: report.checks.filter(item => !item.pass).length };
  persist(); if (report.summary.failed) process.exitCode = 1;
}
