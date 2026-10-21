// 使用实际构建、浏览器输入和分区网络请求验证连续街区。
import { chromium } from 'playwright';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { Matrix4, Vector3 } from 'three';
import { startServer } from '../server/src/server.js';
import geography from '../src/neighborhoods/shijo-east/geography.json' with { type: 'json' };
import { SIGHTS } from '../src/neighborhoods/shijo-east/sights.js';

if (!process.argv[2]) throw new Error('Usage: node tests/browser-neighborhood.mjs <built-dist-directory>');
const dist = resolve(process.argv[2]);
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || '../artifacts/neighborhood-20261021/qa/browser');
const timeout = Number(process.env.EXPERIENCE_QA_TIMEOUT || 120000);
const walkingTimeout = Number(process.env.EXPERIENCE_QA_WALK_TIMEOUT || 2400000);
const only = process.env.EXPERIENCE_QA_ONLY?.split(',').filter(Boolean);
const sections = ['startup', 'journey', 'initial-recovery', 'latest-intent', 'unavailable-revision'];
if (only?.some(value => ![...sections, 'walking-controls'].includes(value))) throw new Error('Unknown neighborhood test section.');
const prefix = '/assets/neighborhoods/shijo-east/';
const journeyKey = 'tourguideai.journey.session.v1';
const keptKey = 'tourguideai.solo.places.v1';
const sha = value => createHash('sha256').update(value).digest('hex');
const assets = new Map();
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else assets.set('/' + relative(dist, path).split(sep).join('/'), readFileSync(path));
  }
}
collect(dist);
const manifestBytes = assets.get(prefix + 'manifest.json');
if (!assets.has('/index.html') || !manifestBytes) throw new Error('The complete neighborhood build is required.');
const manifest = JSON.parse(manifestBytes);
if (manifest.id !== geography.id || manifest.revision !== geography.revision) throw new Error('Neighborhood source and build identities differ.');
mkdirSync(output, { recursive: true });
const files = [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const legacy = {
  'tourguideai:journey:v2': JSON.stringify({ version: 2, locale: 'zh', hints: true,
    notes: { crossing: 'Earlier private memory · 已有私人文字' }, game: JSON.parse(readFileSync(new URL('./fixtures/legacy-v1-completed.json', import.meta.url))).game }),
  'tourguideai:travel:v1': '{"selected":["mufg","crossing"],"meaningful":["mitsui"]}',
  'tourguideai:appearance:v1': '{"lighting":"night"}',
};
const report = {
  startedAt: new Date().toISOString(), artifact: { directory: dist, files, manifestSha256: sha(JSON.stringify(files)) },
  driverSha256: sha(readFileSync(new URL(import.meta.url))),
  source: { id: geography.id, revision: geography.revision, geographySha256: sha(readFileSync(new URL('../src/neighborhoods/shijo-east/geography.json', import.meta.url))),
    manifestSha256: sha(manifestBytes) },
  conditions: { viewport: [1440, 1000], reducedMotion: 'no-preference', timeoutMs: timeout,
    walkingTimeoutMs: walkingTimeout, sections: only || sections },
  resourcePolicy: { primaryCalls: 120, primarySubmittedTriangles: 200000, sharedImageTextureBytes: 96 * 1024 * 1024,
    allocatedTextureBudgetBytes: 96 * 1024 * 1024,
    ordinaryRenderSamples: 'Last renderer.info.render totals; may include shadow passes.',
    sceneGeometry: 'All attached streamed and permanent mesh geometry; not a visibility count.',
    sharedImageEstimate: 'Active shared glTF image textures, RGBA plus mipmaps. Excludes HDR/PMREM, shadow/render targets and runtime-generated textures.',
    combinedTextureEstimate: 'Shared scene images plus actor/contact textures and allocated lighting targets, including cached PMREM/workspace/fallback/shadow targets. Depth24 is conservatively estimated at 4 bytes per pixel. Excludes driver padding/metadata, canvas/compositor, geometry and temporary conversion peaks.',
    primaryProof: 'A new real Look closer frame at the same stopped, settled pose; unchanged shadow invalidation counter and no pending light shadow updates before or after.' },
  checks: [], scenarios: {}, screenshots: [], paths: [], savedViews: [],
  limitations: ['Actual automated desktop input and software-rendered frames do not establish physical-device performance or human enjoyment.',
    'Failure cases abort or delay actual packaged requests. Successful loads use the preserved build bytes.',
    'Authored level ground and simulation widths do not establish current pedestrian access or surveyed grades.'],
};
const persist = () => writeFileSync(join(output, 'neighborhood-result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, pass, evidence) { report.checks.push({ id, pass: Boolean(pass), evidence }); persist(); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`); }
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function near(a, b, tolerance = .003) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= tolerance;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return a === b;
  return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => near(a[key], b[key], tolerance));
}
const providers = new Set(['https://tiles.openfreemap.org', 'https://photon.komoot.io', 'https://en.wikipedia.org']);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.gltf': 'model/gltf+json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.hdr': 'application/octet-stream', '.woff': 'font/woff' };
let browser, service;
const contexts = new Set();
const home = page => page.evaluate(() => window.__HOME__?.snapshot());
const observe = page => page.evaluate(() => ({ home: window.__HOME__?.snapshot(),
  state: window.__TOUR_GAME__?.snapshot(), route: window.__TOUR_GAME__?.route(),
  stream: window.__TOUR_GAME__?.streaming(), ground: window.__TOUR_GAME__?.grounding(),
  camera: window.__TOUR_GAME__?.camera(), renderer: window.__TOUR_GAME__?.renderer(),
  lifecycle: window.__TOUR_RUNTIME__?.lifecycle() }));
const readSession = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), journeyKey);
const kept = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{"version":1,"places":[]}'), keptKey);
const assetPath = value => new URL(value.file, 'http://qa.invalid' + prefix + 'manifest.json').pathname;
const contains = (cell, point) => point.x >= cell.bounds.minX - .001 && point.x <= cell.bounds.maxX + .001
  && point.y >= cell.bounds.minY - .001 && point.y <= cell.bounds.maxY + .001;
const cellsAt = point => manifest.cells.filter(cell => contains(cell, point));
function cellsAlong(points) {
  const ids = new Set();
  for (let index = 0; index < points.length; index++) {
    const start = points[index - 1] || points[index], finish = points[index];
    const steps = Math.max(1, Math.ceil(Math.hypot(finish.x - start.x, finish.y - start.y)));
    for (let step = 0; step <= steps; step++) {
      const fraction = step / steps;
      const point = { x: start.x + (finish.x - start.x) * fraction, y: start.y + (finish.y - start.y) * fraction };
      for (const cell of cellsAt(point)) ids.add(cell.id);
    }
  }
  return ids;
}
function budget(stream) {
  return stream.downloads.peak <= 2 && stream.attachments.peak <= 1 && stream.residentCells <= 9
    && stream.retainedBytes <= 64 * 1024 * 1024 && stream.cells.filter(cell => cell.level === 'near').length <= 3
    && stream.cells.every(cell => !cell.error && cell.state !== 'failed')
    && Number.isFinite(stream.estimatedTextureBytes) && stream.estimatedTextureBytes <= 96 * 1024 * 1024;
}
function resources(value) {
  const scene = value.renderer.scene, lighting = value.renderer.lighting;
  return { renderTotals: value.renderer.render, renderedFrames: value.renderer.renderedFrames, updateFrames: value.renderer.updateFrames,
    geometry: { meshes: scene.meshes, triangles: scene.triangles, streamedMeshes: scene.streetMeshes,
      streamedTriangles: scene.streetTriangles, permanentResidentMeshes: scene.residentMeshes, permanentResidentTriangles: scene.residentTriangles },
    residency: { cells: value.stream.residentCells, nearCells: value.stream.cells.filter(cell => cell.level === 'near').length,
      retainedBytes: value.stream.retainedBytes, estimatedSharedImageTextureBytes: value.stream.estimatedTextureBytes,
      sharedImageTextureCount: value.stream.textureCount },
    memory: value.renderer.memory, allocatedTextureMemory: scene.textureMemory ?? null,
    lighting: { mode: lighting.mode, phase: lighting.phase, shadowUpdates: lighting.shadowUpdates,
      pendingShadowLightIds: lighting.lights.filter(light => light.castShadow && light.shadowNeedsUpdate).map(light => light.id),
      textureMemory: lighting.textureMemory ?? null } };
}
function textureBudget(value) {
  const memory = value.allocatedTextureMemory, lighting = value.lighting.textureMemory;
  return memory?.complete === true && lighting?.complete === true
    && Number.isFinite(memory.estimatedBytes) && memory.estimatedBytes >= 0 && memory.estimatedBytes <= 96 * 1024 * 1024
    && memory.sharedSceneBytes === value.residency.estimatedSharedImageTextureBytes
    && memory.lightingBytes === lighting.estimatedBytes && memory.actorAndContact.complete === true
    && Math.abs(memory.estimatedBytes - memory.sharedSceneBytes - memory.actorAndContact.estimatedBytes - memory.lightingBytes) < 1;
}
async function scenario(name, fault = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', deviceScaleFactor: 1 });
  contexts.add(context);
  const record = report.scenarios[name] = { requests: [], failures: [], denied: [], delayed: [], pageErrors: [], unexpectedOrigins: [] };
  await context.route(service.url + '/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname === '/' ? '/index.html' : url.pathname;
    if (path.startsWith('/api/')) return route.continue();
    if (fault.deny?.(path)) { record.denied.push(path); return route.abort('blockedbyclient'); }
    if (fault.delay?.(path)) { record.delayed.push(path); await fault.wait; }
    const bytes = assets.get(path);
    return route.fulfill({ status: bytes ? 200 : 404, contentType: mime[extname(path)] || 'application/octet-stream', body: bytes || 'Packaged asset missing' });
  });
  await context.addInitScript(({ origin, values }) => {
    if (location.origin === origin && !sessionStorage.getItem('neighborhood-qa-seeded')) {
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
      sessionStorage.setItem('neighborhood-qa-seeded', '1');
    }
  }, { origin: service.url, values: legacy });
  const page = await context.newPage(); page.setDefaultTimeout(timeout);
  page.on('request', request => {
    const url = new URL(request.url()); record.requests.push({ at: Date.now(), origin: url.origin, path: url.pathname, method: request.method() });
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== service.url && !providers.has(url.origin)) record.unexpectedOrigins.push(url.origin);
  });
  page.on('requestfailed', request => record.failures.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText }));
  page.on('pageerror', error => { record.pageErrors.push(error.message); persist(); });
  await page.goto(service.url + '/?qa=1&mode=together&lang=en', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__HOME__));
  return { context, page, record, fault };
}
async function ready(page, packId = geography.id, lighting) {
  await page.waitForFunction(({ packId, lighting }) => {
    const home = window.__HOME__?.snapshot(), render = window.__TOUR_GAME__?.renderer();
    return home?.pack?.packId === packId && home.sceneState === 'ready' && home.currentView?.packId === packId
      && render?.status === 'ready' && render.renderedFrames > 0 && render.lighting?.phase === 'ready'
      && (!lighting || render.lighting.mode === lighting);
  }, { packId, lighting });
}
async function enter(page) {
  await page.locator('#mode-explore').click();
  await page.locator('#journey-enter').click();
  await ready(page);
  await page.waitForFunction(() => !window.__HOME__.snapshot().neighborhood.busy);
}
async function setLighting(page, mode) { await page.locator('#lighting-' + mode).click(); await ready(page, geography.id, mode); }
async function settled(page) {
  await page.waitForFunction(() => {
    const stream = window.__TOUR_GAME__?.streaming();
    return stream && !stream.downloads.active && !stream.downloads.queued && !stream.attachments.active && !stream.attachments.queued
      && stream.cells.every(cell => !['downloading', 'queued', 'attaching'].includes(cell.state));
  });
  const stream = await page.evaluate(() => window.__TOUR_GAME__.streaming());
  const incomplete = stream.cells.filter(cell => cell.error || cell.state === 'failed'
    || cell.desired && (cell.state !== 'ready' || cell.level !== cell.desired));
  if (incomplete.length) throw new Error('Settled section quality is incomplete: ' + JSON.stringify(incomplete));
}
async function primaryFrameBudget(page, id) {
  const attempts = [];
  let proof = false, after;
  for (let attempt = 0; attempt < 3 && !proof; attempt++) {
    await settled(page);
    await page.waitForFunction(() => {
      const game = window.__TOUR_GAME__, lighting = game.renderer().lighting;
      return !game.camera().transitioning && lighting.phase === 'ready' && !lighting.pendingRequests
        && lighting.lights.every(light => !light.castShadow || !light.shadowNeedsUpdate);
    });
    const before = await observe(page);
    if (before.route.destination || before.state.moving) throw new Error('Primary-frame measurement requires a stopped player.');
    if (await page.evaluate(() => window.__TOUR_GAME__.inspection().enabled)) throw new Error('Primary-frame measurement requires closed inspection.');
    await page.locator('#solo-inspect').click();
    await page.waitForFunction(frame => window.__TOUR_GAME__.renderer().renderedFrames > frame, before.renderer.renderedFrames);
    after = await observe(page);
    const beforeResources = resources(before), afterResources = resources(after);
    proof = after.renderer.renderedFrames > before.renderer.renderedFrames
      && before.renderer.lighting.shadowUpdates === after.renderer.lighting.shadowUpdates
      && beforeResources.lighting.pendingShadowLightIds.length === 0 && afterResources.lighting.pendingShadowLightIds.length === 0
      && near(before.route.position, after.route.position) && near(before.camera.matrixWorld, after.camera.matrixWorld, 1e-6)
      && near(before.camera.projectionMatrix, after.camera.projectionMatrix, 1e-6)
      && equal(beforeResources.geometry, afterResources.geometry) && equal(beforeResources.residency, afterResources.residency)
      && after.renderer.lighting.phase === 'ready' && !after.renderer.lighting.pendingRequests;
    attempts.push({ before: beforeResources, after: afterResources, cameraBefore: before.camera, cameraAfter: after.camera, proof });
    await page.locator('#live-stage').focus(); await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__TOUR_GAME__.inspection().enabled);
  }
  check(id + '-cached-shadow-primary-frame-budget', proof && after.renderer.render.calls <= 120
    && after.renderer.render.triangles <= 200000 && budget(after.stream) && textureBudget(resources(after)),
  { attempts, finalResources: resources(after) });
  return resources(after);
}
async function setLocale(page, locale) {
  await page.locator('#locale-' + locale).click();
  await page.waitForFunction(value => document.documentElement.lang === value, locale);
}
async function groundClick(page, target) {
  await page.locator('#live-stage canvas').scrollIntoViewIfNeeded();
  const camera = await page.evaluate(() => window.__TOUR_GAME__.camera());
  const bounds = await page.locator('#live-stage canvas').boundingBox();
  const point = new Vector3(target.x, target.height, -target.y)
    .applyMatrix4(new Matrix4().fromArray(camera.matrixWorld).invert())
    .applyMatrix4(new Matrix4().fromArray(camera.projectionMatrix));
  if (Math.abs(point.x) > .98 || Math.abs(point.y) > .98) throw new Error('The selected actual ground point is outside the current camera.');
  await page.mouse.click(bounds.x + (point.x + 1) * bounds.width / 2, bounds.y + (1 - point.y) * bounds.height / 2);
}
async function capture(page, name) {
  const layout = () => page.evaluate(() => ({ scrollX, scrollY, viewport: { width: innerWidth, height: innerHeight },
    documentHeight: document.documentElement.scrollHeight,
    visualColumn: document.querySelector('.visual-column')?.getBoundingClientRect().toJSON(),
    canvas: document.querySelector('#live-stage canvas')?.getBoundingClientRect().toJSON(), camera: window.__TOUR_GAME__?.camera() }));
  const beforeScroll = await layout();
  await page.evaluate(() => window.scrollTo({ left: 0, top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => window.scrollY === 0);
  const afterScroll = await layout();
  const file = name + '.png'; await page.screenshot({ path: join(output, file), fullPage: true });
  report.screenshots.push({ file, sha256: sha(readFileSync(join(output, file))), layout: { beforeScroll, afterScroll }, observed: await observe(page) }); persist();
}
async function unchangedLegacy(page, id) {
  const actual = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.keys(legacy));
  check(id, equal(actual, legacy), actual);
}
async function keep(page, title, note) {
  await page.locator('#solo-keep').click(); await page.locator('#kept-title').fill(title); await page.locator('#kept-note').fill(note);
  await page.locator('#keep-place-form button[type=submit]').click();
  await page.locator('#keep-place-dialog').waitFor({ state: 'hidden' });
  const place = (await kept(page)).places.find(value => value.title === title);
  report.savedViews.push(place); persist(); return place;
}
async function reopen(page, record) {
  await page.locator(`[data-kept-open="${record.id}"]`).click(); await ready(page, geography.id, record.lighting);
  await page.waitForFunction(expected => {
    const actual = window.__HOME__.snapshot().currentView;
    return actual && Math.hypot(actual.player.x - expected.x, actual.player.y - expected.y) < .003;
  }, record.view.player);
  await settled(page);
}
async function arrival(page, sight, pathId, { untilBlocked = false } = {}) {
  const started = Date.now(), trace = { id: pathId, sightId: sight.id, startedAt: new Date().toISOString(), samples: [] };
  report.paths.push(trace);
  while (Date.now() - started < walkingTimeout) {
    const value = await observe(page);
    const sample = { elapsedMs: Date.now() - started, route: value.route, ground: value.ground,
      stream: value.stream, actorPosition: value.renderer?.scene.actorPosition, stateTick: value.state?.tick, resources: resources(value) };
    trace.samples.push(sample);
    if (untilBlocked && value.stream?.blocked) { persist(); return value; }
    const position = value.route?.position;
    if (position && !value.route.destination && Math.hypot(position.x - sight.x, position.y - sight.y) < .15) {
      trace.completedAt = new Date().toISOString();
      check(pathId + '-actual-arrival-ground-and-budgets', trace.samples.every(item => item.ground?.inside && item.ground.hit
        && Math.abs(item.ground.height - item.route.position.height) < .003
        && Math.abs(item.actorPosition[1] - item.ground.height) < .003 && budget(item.stream) && textureBudget(item.resources)),
      { sightId: sight.id, samples: trace.samples.length, final: sample });
      await primaryFrameBudget(page, pathId);
      persist(); return value;
    }
    if (trace.samples.length % 5 === 0) persist();
    await page.waitForTimeout(1000);
  }
  trace.timeout = true; persist(); throw new Error(`Actual walk did not arrive at ${sight.id} within ${walkingTimeout} ms`);
}
async function focusSight(page, sight) {
  await page.locator(`[data-journey-focus="${sight.id}"]`).click();
  await page.waitForFunction(() => !window.__HOME__.snapshot().neighborhood.busy);
}
async function walkingStatus(page) {
  return page.evaluate(() => ({ route: window.__TOUR_GAME__.route(),
    target: document.querySelector('#journey-walk-target').textContent,
    distance: document.querySelector('#journey-walk-distance').textContent,
    detail: document.querySelector('#journey-walk-detail').textContent,
    stopHidden: document.querySelector('#journey-stop').hidden }));
}
function correctWalkingStatus(value, sight, locale) {
  const expected = SIGHTS.find(item => item.id === sight.id).title[locale];
  const number = Number(value.distance.match(/[\d,]+/)?.[0].replaceAll(',', ''));
  return value.target.includes(expected) && value.route.goal
    && Math.hypot(value.route.goal.x - sight.x, value.route.goal.y - sight.y) < .15
    && Number.isFinite(number) && Math.abs(number - Math.ceil(value.route.remainingDistanceMeters)) <= 1
    && (locale === 'zh' ? /^剩余[\d,]+米$/.test(value.distance) : /^[\d,]+ m remaining$/.test(value.distance))
    && !value.stopHidden;
}
async function verifyWalkingControls(page, sight) {
  const order = (await readSession(page)).stopIds, privatePlaces = await kept(page);
  await focusSight(page, sight);
  await page.waitForFunction(() => Boolean(window.__TOUR_GAME__.route().goal));
  const started = await walkingStatus(page);
  check('walk-to-shows-actual-target-and-remaining-metres-en', correctWalkingStatus(started, sight, 'en'), started);
  await page.waitForFunction(distance => window.__TOUR_GAME__.route().remainingDistanceMeters < distance - 2,
    started.route.remainingDistanceMeters);
  await page.locator('#solo-keep').click();
  const paused = await observe(page), pausedStatus = await walkingStatus(page);
  await page.locator('#kept-note').fill('Walking draft · 暂停输入'); await page.locator('#kept-note').press('ArrowLeft');
  await page.waitForTimeout(1000);
  const heldModal = await observe(page);
  check('active-walk-modal-pauses-with-honest-guidance', paused.route.paused
    && near(heldModal.route.position, paused.route.position)
    && equal(paused.route.goal, started.route.goal) && equal(heldModal.route.goal, paused.route.goal)
    && near(heldModal.route.remainingDistanceMeters, paused.route.remainingDistanceMeters)
    && pausedStatus.target.startsWith('Destination:') && /paused/.test(pausedStatus.detail), { pausedStatus, paused, heldModal });
  await page.locator('#solo-cancel-keep').click();
  await page.waitForFunction(() => !window.__TOUR_GAME__.route().paused);
  if (!(await observe(page)).route.goal) throw new Error('Closing the note modal lost the active walking path.');
  // 在实际点击传播前后读取状态，避免把滚动控件期间的正常行走误算为 Stop 改变视角。
  await page.evaluate(() => {
    const read = () => ({ route: window.__TOUR_GAME__.route(), view: window.__HOME__.snapshot().currentView });
    window.__NEIGHBORHOOD_STOP_PROOF__ = {};
    const before = event => {
      if (!event.target.closest?.('#journey-stop')) return;
      window.__NEIGHBORHOOD_STOP_PROOF__.before = read(); window.removeEventListener('click', before, true);
    };
    const after = event => {
      if (!event.target.closest?.('#journey-stop')) return;
      window.__NEIGHBORHOOD_STOP_PROOF__.after = read(); window.removeEventListener('click', after);
    };
    window.addEventListener('click', before, true); window.addEventListener('click', after);
  });
  await page.locator('#journey-stop').click();
  await page.waitForFunction(() => !window.__TOUR_GAME__.route().goal);
  const clickProof = await page.evaluate(() => window.__NEIGHBORHOOD_STOP_PROOF__);
  const stopped = await observe(page); await page.waitForTimeout(1000);
  const retained = await observe(page);
  check('stop-keeps-grounded-position-camera-order-and-private-notes', !stopped.route.destination
    && stopped.route.remainingWaypoints === 0 && !stopped.state.moving && stopped.ground.inside && stopped.ground.hit
    && near(stopped.route.position, retained.route.position)
    && Boolean(clickProof.before?.route.goal) && !clickProof.after?.route.goal
    && near(clickProof.before?.route.position, clickProof.after?.route.position, 1e-6)
    && near(clickProof.before?.view.camera, clickProof.after?.view.camera, 1e-6)
    && equal((await readSession(page)).stopIds, order) && equal(await kept(page), privatePlaces), { clickProof, stopped, retained });
  await setLocale(page, 'zh'); await page.waitForTimeout(1000);
  const localized = await walkingStatus(page);
  check('stopped-walk-does-not-resume-on-language-change', !localized.route.goal && localized.stopHidden
    && /已在此停下/.test(localized.detail) && near((await observe(page)).route.position, stopped.route.position), localized);
  await focusSight(page, sight);
  const resumed = await walkingStatus(page);
  await page.waitForFunction(distance => window.__TOUR_GAME__.route().remainingDistanceMeters < distance - 2,
    resumed.route.remainingDistanceMeters);
  const advanced = await walkingStatus(page);
  check('explicit-walk-to-resumes-progress-with-chinese-guidance', correctWalkingStatus(advanced, sight, 'zh')
    && advanced.route.remainingDistanceMeters < resumed.route.remainingDistanceMeters - 2, { resumed, advanced });
  await page.locator('#journey-stop').click();
  await page.waitForFunction(() => !window.__TOUR_GAME__.route().goal);
  await setLocale(page, 'en');
}
async function inspectVisibleSurface(page, id) {
  const initial = await observe(page); await page.locator('#solo-inspect').click();
  await page.locator('#live-stage canvas').scrollIntoViewIfNeeded();
  const bounds = await page.locator('#live-stage canvas').boundingBox();
  let focus = null;
  for (const [x, y] of [[.5, .35], [.25, .4], [.75, .4], [.35, .25], [.65, .25], [.15, .6], [.85, .6], [.5, .15]]) {
    const previous = (await observe(page)).renderer.updateFrames;
    await page.mouse.move(bounds.x + bounds.width * x, bounds.y + bounds.height * y);
    await page.waitForFunction(previous => window.__TOUR_GAME__.renderer().updateFrames > previous, previous);
    focus = await page.evaluate(() => window.__TOUR_GAME__.inspection().focus);
    if (focus) break;
  }
  if (focus) {
    await page.locator('#solo-detail').click();
    await page.waitForFunction(() => Boolean(window.__TOUR_GAME__.inspection().selected));
  }
  const selected = await page.evaluate(() => window.__TOUR_GAME__.inspection().selected);
  check(id, Boolean(focus && selected && selected.id === focus.id) && near((await observe(page)).route.position, initial.route.position),
    { focus, selected, before: initial.route.position, after: (await observe(page)).route.position });
  if (selected) await page.locator('#solo-close-detail').click();
  await page.locator('#live-stage').focus(); await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__TOUR_GAME__.inspection().enabled);
}
async function mapsOrder(page, session, id) {
  const links = await page.locator('#neighborhood-journey .map-links a').evaluateAll(nodes => nodes.map(node => node.href));
  const actual = [];
  for (const href of links) {
    const url = new URL(href); if (url.origin !== 'https://www.google.com') throw new Error('Unexpected Maps origin.');
    const values = url.searchParams.has('query') ? [url.searchParams.get('query')]
      : [url.searchParams.get('origin'), ...(url.searchParams.get('waypoints')?.split('|') || []), url.searchParams.get('destination')];
    if (actual.at(-1) === values[0]) values.shift(); actual.push(...values);
  }
  const sights = new Map(geography.sights.map(sight => [sight.id, sight]));
  const selected = session.stopIds.map(id => sights.get(id));
  const start = geography.sights[0]; if (selected[0].nodeId !== start.nodeId) selected.unshift(start);
  check(id, equal(actual, selected.map(sight => `${sight.latitude},${sight.longitude}`)), { links, actual, stopIds: session.stopIds });
}
async function section(name, run) {
  if (only && !only.includes(name)) return;
  try { await run(); }
  catch (error) {
    const diagnostics = [];
    for (const context of contexts) for (const page of context.pages()) if (!page.isClosed()) {
      try { diagnostics.push(await observe(page)); await capture(page, `${name}-failure-${diagnostics.length}`); }
      catch (captureError) { diagnostics.push({ error: captureError.message }); }
    }
    check(name + '-completed', false, { message: error.message, stack: error.stack, diagnostics });
  } finally { for (const context of contexts) await context.close(); contexts.clear(); }
}

try {
  for (const descriptor of [manifest.ground, manifest.lighting, manifest.context,
    ...manifest.cells.flatMap(cell => [cell.base, cell.near])].filter(Boolean)) {
    for (const asset of [descriptor, ...(descriptor.dependencies || [])]) {
      const bytes = assets.get(assetPath(asset));
      if (!bytes || bytes.length !== asset.bytes || sha(bytes) !== asset.sha256) throw new Error('Manifest asset mismatch: ' + asset.file);
    }
  }
  check('manifest-assets-match-actual-packaged-bytes', true, { cells: manifest.cells.length, sha256: sha(manifestBytes) });
  service = await startServer({ port: 0, host: '127.0.0.1', databasePath: join(output, 'rooms.sqlite'), config: { provider: { apiKey: '', model: '' } } });
  const address = process.env.HTTPS_PROXY || process.env.HTTP_PROXY, proxy = address ? new URL(address) : null;
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || undefined, headless: true, args: ['--no-sandbox'],
    ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1', ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.browser = browser.version(); persist();

  if (only?.includes('walking-controls')) await section('walking-controls', async () => {
    const { page } = await scenario('walking-controls'); await enter(page);
    await primaryFrameBudget(page, 'focused-opening-day'); await capture(page, 'focused-opening-day-top');
    const screenshot = report.screenshots.at(-1), layout = screenshot.layout;
    check('fullpage-normalization-preserves-camera-and-records-sticky-layout', layout.afterScroll.scrollY === 0
      && near(layout.beforeScroll.camera.matrixWorld, layout.afterScroll.camera.matrixWorld, 1e-6), layout);
    const viewportFile = 'focused-opening-day-viewport.png';
    await page.screenshot({ path: join(output, viewportFile), fullPage: false });
    report.screenshots.push({ file: viewportFile, sha256: sha(readFileSync(join(output, viewportFile))), layout, observed: await observe(page) }); persist();
    await verifyWalkingControls(page, geography.sights[1]);
    await unchangedLegacy(page, 'focused-walking-controls-keep-existing-private-records');
  });

  await section('startup', async () => {
    const { page, record } = await scenario('startup');
    check('together-does-not-load-private-neighborhood-cells', !record.requests.some(item => item.path.startsWith(prefix)), record.requests);
    await enter(page); const first = await observe(page);
    check('neighborhood-starts-at-reviewed-global-spawn', near(first.route.position.x, geography.spawn.x)
      && near(first.route.position.y, geography.spawn.y) && first.ground.inside && first.ground.hit
      && first.home.currentView.version === 3 && first.home.currentView.packId === geography.id && budget(first.stream)
      && textureBudget(resources(first)), first);
    const distantFiles = new Set(manifest.cells.filter(cell => Math.hypot(
      Math.max(cell.bounds.minX - geography.spawn.x, geography.spawn.x - cell.bounds.maxX, 0),
      Math.max(cell.bounds.minY - geography.spawn.y, geography.spawn.y - cell.bounds.maxY, 0)) > 230)
      .flatMap(cell => [cell.base, cell.near].filter(Boolean).map(assetPath)));
    check('initial-neighborhood-load-does-not-fetch-distant-cells', distantFiles.size > 0
      && !record.requests.some(request => distantFiles.has(request.path)), { distantFiles: [...distantFiles], requested: record.requests.filter(request => request.path.startsWith(prefix)) });
    await primaryFrameBudget(page, 'opening-day'); await capture(page, 'opening-day-en');
    await setLighting(page, 'night'); await setLocale(page, 'zh'); await primaryFrameBudget(page, 'opening-night'); await capture(page, 'opening-night-zh');
    await setLighting(page, 'day'); await setLocale(page, 'en');
    const graphNodes = new Map(geography.navigation.nodes.map(node => [node.id, node]));
    const secondNode = graphNodes.get(geography.selectedRoute.nodeIds[1]);
    const distance = Math.hypot(secondNode.x - geography.spawn.x, secondNode.y - geography.spawn.y);
    const neighbor = { id: 'visible-neighbor', height: 0,
      x: geography.spawn.x + (secondNode.x - geography.spawn.x) * Math.min(3, distance) / distance,
      y: geography.spawn.y + (secondNode.y - geography.spawn.y) * Math.min(3, distance) / distance };
    await groundClick(page, neighbor); await arrival(page, neighbor, 'actual-ground-click');
    const beforeKey = await observe(page); await page.locator('#live-stage').focus(); await page.keyboard.down('ArrowRight');
    try { await page.waitForFunction(tick => window.__TOUR_GAME__.snapshot().tick >= tick + 24, beforeKey.state.tick); }
    finally { await page.keyboard.up('ArrowRight'); }
    const afterKey = await observe(page);
    check('real-keyboard-input-walks-with-grounded-player', Math.hypot(afterKey.route.position.x - beforeKey.route.position.x,
      afterKey.route.position.y - beforeKey.route.position.y) > .05 && afterKey.ground.hit && afterKey.ground.inside, { beforeKey, afterKey });
    await page.waitForTimeout(300); const stopped = await observe(page);
    check('key-release-does-not-continue-walking', near(stopped.route.position, afterKey.route.position), { afterKey, stopped });
    await verifyWalkingControls(page, geography.sights[1]);
    await page.locator('#solo-inspect').click();
    const beforeInspect = await observe(page); await page.keyboard.press('l'); await page.keyboard.press('Shift+i');
    await page.waitForFunction(() => !window.__TOUR_GAME__.camera().transitioning);
    const afterInspect = await observe(page);
    check('real-inspection-framing-keeps-player-location', near(beforeInspect.route.position, afterInspect.route.position)
      && !near(beforeInspect.camera.target, afterInspect.camera.target) && beforeInspect.camera.azimuth !== afterInspect.camera.azimuth, { beforeInspect, afterInspect });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__TOUR_GAME__.inspection().enabled);
    await setLighting(page, 'night'); await setLocale(page, 'zh'); await capture(page, 'interaction-night-zh');
    const before = await observe(page); await page.locator('#solo-keep').click();
    await page.locator('#kept-note').fill('WASD 箭头输入只编辑文字'); await page.locator('#kept-note').press('ArrowLeft');
    await page.waitForTimeout(300);
    check('note-editing-pauses-avatar-and-keeps-route', near((await observe(page)).route.position, before.route.position), await observe(page));
    await page.locator('#solo-cancel-keep').click();
    await page.locator('#mode-together').click();
    const hidden = await observe(page), count = record.requests.filter(item => item.path.startsWith(prefix)).length;
    await page.waitForTimeout(2000); const after = await observe(page);
    check('hidden-neighborhood-has-zero-work-and-new-cell-requests', after.renderer.updateFrames === hidden.renderer.updateFrames
      && after.renderer.renderedFrames === hidden.renderer.renderedFrames && after.stream.suspended
      && record.requests.filter(item => item.path.startsWith(prefix)).length === count, { hidden, after });
    await page.locator('#mode-explore').click(); await ready(page, geography.id, 'night');
    check('return-keeps-pose-and-lighting', near((await home(page)).currentView, before.home.currentView), await observe(page));
    await page.locator('#mode-together').click();
    await page.locator('#traveler-name').fill('Neighborhood QA traveler'); await page.locator('#room-title').fill('Private journey isolation');
    await page.locator('#room-create').click(); await page.waitForFunction(() => Boolean(window.__HOME__.snapshot().room));
    const room = (await home(page)).room;
    check('actual-room-does-not-receive-private-route-or-old-note', !JSON.stringify(room).includes('Earlier private memory')
      && !JSON.stringify(room).includes('edgeDistance') && !JSON.stringify(room).includes(geography.selectedRoute.id),
    { roomId: room.id, participants: room.participants.length, catalog: room.catalog });
    const credits = await page.context().newPage();
    await credits.goto(service.url + '/credits.html?lang=zh', { waitUntil: 'domcontentloaded' });
    const sourceLinks = await credits.locator('#shijo-east-data a').evaluateAll(nodes => nodes.map(node => node.href));
    check('packaged-neighborhood-credits-retain-source-and-license-links', sourceLinks.some(url => url.includes('creativecommons.org/licenses/by/4.0'))
      && sourceLinks.some(url => url.includes('opendatacommons.org/licenses/odbl'))
      && assets.has(prefix + 'source-ledger.json') && assets.has(prefix + 'references.json'), sourceLinks);
    await credits.close();
    await unchangedLegacy(page, 'startup-keeps-existing-private-records');
  });

  await section('journey', async () => {
    const target = geography.sights[1], delayedCells = cellsAt(target).filter(cell => !contains(cell, geography.spawn));
    if (!delayedCells.length) throw new Error('The actual manifest has no later cell for the boundary failure case.');
    const deniedPaths = new Set(delayedCells.map(cell => assetPath(cell.base)));
    let deny = true;
    const { page, record, fault } = await scenario('journey', { deny: path => deny && deniedPaths.has(path) });
    await enter(page); const initialSession = await readSession(page);
    const startRecord = await keep(page, 'Beginning · 起点', 'Private starting view');
    await focusSight(page, target);
    await arrival(page, target, 'outbound-boundary-denied', { untilBlocked: true });
    await page.waitForFunction(() => window.__TOUR_GAME__.streaming()?.blocked?.reason === 'section-failed');
    const blocked = await observe(page);
    check('failed-section-stops-at-boundary-with-destination', blocked.stream.blocked.reason === 'section-failed'
      && blocked.route.destination && record.denied.length > 0 && blocked.ground.inside && blocked.ground.hit, blocked);
    await page.waitForTimeout(1500); const held = await observe(page);
    check('failed-boundary-retains-position-and-planned-path', near(held.route.position, blocked.route.position)
      && equal(held.route.destination, blocked.route.destination) && held.route.remainingWaypoints === blocked.route.remainingWaypoints, held);
    const failedStatus = await walkingStatus(page);
    await setLocale(page, 'zh'); const failedChinese = await walkingStatus(page);
    check('failed-section-guidance-keeps-actual-goal-and-localized-retry', correctWalkingStatus(failedStatus, target, 'en')
      && /could not load/.test(failedStatus.detail) && correctWalkingStatus(failedChinese, target, 'zh')
      && /未能加载/.test(failedChinese.detail) && near((await observe(page)).route.position, blocked.route.position),
    { failedStatus, failedChinese });
    await setLocale(page, 'en');
    let releaseRetry;
    const retryBarrier = new Promise(resolve => { releaseRetry = resolve; });
    fault.delay = path => deniedPaths.has(path); fault.wait = retryBarrier;
    deny = false;
    try {
      await page.locator('#scene-retry').click();
      const requestDeadline = Date.now() + timeout;
      while (!record.delayed.some(path => deniedPaths.has(path)) && Date.now() < requestDeadline) await page.waitForTimeout(100);
      if (!record.delayed.some(path => deniedPaths.has(path))) throw new Error('Retry did not request the actual delayed base section.');
      await page.waitForFunction(() => window.__TOUR_GAME__.streaming()?.blocked?.reason === 'section-loading');
      const started = Date.now(), samples = [];
      // 保持真实响应待定至少十五秒，检查边界等待期间的位置、路线和地面。
      do {
        const value = await observe(page);
        samples.push({ elapsedMs: Date.now() - started, route: value.route, ground: value.ground, stream: value.stream });
        if (Date.now() - started < 15000) await page.waitForTimeout(1000);
      } while (Date.now() - started < 15000);
      const final = await observe(page);
      samples.push({ elapsedMs: Date.now() - started, route: final.route, ground: final.ground, stream: final.stream });
      check('pending-base-section-holds-grounded-pose-and-goal-for-fifteen-seconds', samples.at(-1).elapsedMs >= 15000
        && samples.every(sample => sample.stream.blocked?.reason === 'section-loading'
          && near(sample.route.position, blocked.route.position) && equal(sample.route.goal, blocked.route.goal)
          && equal(sample.route.destination, blocked.route.destination) && sample.route.remainingWaypoints === blocked.route.remainingWaypoints
          && sample.ground.inside && sample.ground.hit && Math.abs(sample.ground.height - sample.route.position.height) < .003),
      { delayedPaths: record.delayed.filter(path => deniedPaths.has(path)), samples });
    } finally { fault.delay = undefined; releaseRetry(); }
    await arrival(page, target, 'outbound-retry');
    await capture(page, 'outbound-nishiki-market-day');
    await inspectVisibleSurface(page, 'actual-market-surface-inspection-keeps-player-location');
    for (const sight of geography.sights.slice(2)) {
      await focusSight(page, sight); await arrival(page, sight, 'outbound-' + sight.id); await capture(page, 'outbound-' + sight.id + '-day');
    }
    const end = await observe(page);
    check('free-walking-preserves-selected-order-and-no-visits', equal((await readSession(page)).stopIds, initialSession.stopIds)
      && end.state.visitedIds.length === 0 && Object.keys(end.state.choiceIds).length === 0, end);
    const note = '河畔私人观察 <script>window.__noteExecuted=true</script>';
    await setLighting(page, 'night');
    const remembered = await keep(page, 'River view · 河畔', note), pose = (await home(page)).currentView;
    await page.locator('[data-journey-up="shijo-bridge"]').click();
    const edited = await readSession(page);
    check('reordering-keeps-current-pose-light-and-private-note', near(edited.progress.view, pose)
      && edited.progress.lighting === 'night' && remembered.note === note && !equal(edited.stopIds, initialSession.stopIds), { edited, remembered });
    await mapsOrder(page, edited, 'edited-maps-order-contains-every-selected-stop');
    await page.locator('[data-journey-remove="nishiki-market"]').click();
    const removed = await readSession(page);
    check('remove-sight-changes-itinerary-without-moving-player', !removed.stopIds.includes('nishiki-market')
      && near((await home(page)).currentView, pose), { removed, view: (await home(page)).currentView });
    await page.locator('#journey-add-sight').selectOption('nishiki-market'); await page.locator('#journey-add').click();
    const added = await readSession(page);
    check('add-sight-restores-selected-source-without-changing-pose', added.stopIds.includes('nishiki-market')
      && near((await home(page)).currentView, pose), added);
    await page.locator('.journey-preferences > summary').click();
    await page.locator('[data-journey-interest="architecture"]').check();
    const beforeSuggestions = await readSession(page); await page.locator('#journey-suggest').click();
    check('recommendation-preview-preserves-explicit-selected-order', equal((await readSession(page)).stopIds, beforeSuggestions.stopIds)
      && await page.locator('[data-journey-choice]').count() > 0, { beforeSuggestions, current: await readSession(page) });
    await setLocale(page, 'zh'); await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page, geography.id, 'night');
    check('reload-preserves-exact-route-view-edge-and-language', near((await home(page)).currentView, pose)
      && equal((await readSession(page)).stopIds, added.stopIds) && await page.locator('html').getAttribute('lang') === 'zh'
      && !(await page.evaluate(() => Boolean(window.__noteExecuted))), { observed: await observe(page), session: await readSession(page) });
    await capture(page, 'river-night-reloaded-zh');
    await page.locator('#street-map-toggle').click();
    await page.waitForFunction(() => window.__HOME__.snapshot().map?.ready);
    const mapBefore = (await home(page)).map;
    const markerBounds = await page.locator('#world-map .destination-pin').evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect(), parent = document.querySelector('#world-map').getBoundingClientRect();
      return { title: node.getAttribute('aria-label'), x: rect.x + rect.width / 2 - parent.x,
        y: rect.y + rect.height / 2 - parent.y, width: parent.width, height: parent.height };
    }));
    check('surrounding-map-fits-selected-route-sight-markers', markerBounds.length >= added.stopIds.length
      && markerBounds.every(value => value.x >= 0 && value.x <= value.width && value.y >= 0 && value.y <= value.height), { mapBefore, markerBounds });
    await page.locator('#world-map canvas').scrollIntoViewIfNeeded();
    const mapCanvas = await page.locator('#world-map canvas').boundingBox();
    const start = { x: mapCanvas.x + mapCanvas.width * .2, y: mapCanvas.y + mapCanvas.height * .8 };
    const clearCanvas = await page.evaluate(point => document.elementFromPoint(point.x, point.y)?.tagName === 'CANVAS', start);
    if (!clearCanvas) throw new Error('The actual map drag path starts under a control or marker.');
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(start.x + 100, start.y - 35, { steps: 8 }); await page.mouse.up();
    await page.waitForFunction(() => window.__HOME__.snapshot().map?.ready);
    const manuallyMoved = (await home(page)).map;
    check('actual-map-drag-preserves-private-walking-position', !near(manuallyMoved.center, mapBefore.center, .000001)
      && near((await readSession(page)).progress.view, pose), { mapBefore, manuallyMoved });
    await setLocale(page, 'en'); await page.waitForFunction(() => window.__HOME__.snapshot().map?.ready);
    const mapAfter = (await home(page)).map;
    check('map-language-keeps-manual-camera-and-selected-order', near(mapAfter.center, manuallyMoved.center, 1e-7)
      && near(mapAfter.zoom, manuallyMoved.zoom, 1e-6) && near(mapAfter.bearing, manuallyMoved.bearing, 1e-6) && near(mapAfter.pitch, manuallyMoved.pitch, 1e-6)
      && equal((await readSession(page)).stopIds, added.stopIds), { manuallyMoved, mapAfter });
    await reopen(page, remembered);
    check('kept-river-view-restores-after-map', near((await home(page)).currentView, remembered.view), await observe(page));
    for (const sight of geography.sights.slice(0, -1).reverse()) {
      await focusSight(page, sight); await arrival(page, sight, 'return-' + sight.id); await capture(page, 'return-' + sight.id + '-night');
    }
    await unchangedLegacy(page, 'complete-walk-keeps-existing-private-records');
    const nodes = new Map(geography.navigation.nodes.map(node => [node.id, node]));
    const expectedCells = cellsAlong(geography.selectedRoute.nodeIds.map(id => nodes.get(id)));
    const outboundCells = cellsAlong(report.paths.filter(path => path.id.startsWith('outbound')).flatMap(path => path.samples.map(sample => sample.route.position)));
    const returnCells = cellsAlong(report.paths.filter(path => path.id.startsWith('return-')).flatMap(path => path.samples.map(sample => sample.route.position)));
    check('outbound-and-return-cross-every-selected-route-cell', [...expectedCells].every(id => outboundCells.has(id) && returnCells.has(id))
      && Math.hypot((await observe(page)).route.position.x - geography.spawn.x, (await observe(page)).route.position.y - geography.spawn.y) < .15,
    { expected: [...expectedCells], outbound: [...outboundCells], returning: [...returnCells] });
    let releaseRestore;
    const restoreBarrier = new Promise(resolve => { releaseRestore = resolve; });
    const riverFiles = new Set(cellsAt(remembered.view.player).map(cell => assetPath(cell.base)));
    fault.delay = path => riverFiles.has(path); fault.wait = restoreBarrier;
    const beforeRestore = await observe(page);
    try {
      await page.locator(`[data-kept-open="${remembered.id}"]`).click();
      await page.waitForFunction(() => window.__TOUR_GAME__.route()?.restoring);
      check('distant-saved-restore-waits-for-real-required-cell', record.delayed.some(path => riverFiles.has(path))
        && near((await observe(page)).route.position, beforeRestore.route.position), { delayed: record.delayed, observed: await observe(page) });
      await page.locator('#street-map-toggle').click();
    } finally { fault.delay = undefined; releaseRestore(); }
    await page.waitForFunction(() => window.__HOME__.snapshot().map?.ready && !window.__TOUR_GAME__.route().restoring);
    await page.waitForTimeout(1000);
    check('map-switch-cancels-old-distant-restore-without-teleport', near((await observe(page)).route.position, beforeRestore.route.position)
      && Array.isArray((await home(page)).currentView?.center) && await page.locator('#world-map').isVisible(), await observe(page));
    await page.locator('#street-map-toggle').click(); await ready(page, geography.id);
    const resources = { beginning: [], river: [] };
    for (let cycle = 0; cycle < 3; cycle++) {
      for (const [name, record] of [['river', remembered], ['beginning', startRecord]]) {
        await reopen(page, record);
        const measuredResources = await primaryFrameBudget(page, `restore-${name}-${cycle}`);
        const actual = await observe(page);
        resources[name].push({ stream: actual.stream, memory: actual.renderer.memory, lifecycle: actual.lifecycle, resources: measuredResources });
        check(`restore-${name}-${cycle}-retains-real-pose-order-note`, near(actual.home.currentView, record.view)
          && (await kept(page)).places.find(value => value.id === record.id).note === record.note, { view: actual.home.currentView, recordId: record.id });
      }
    }
    check('warm-saved-view-cycles-bound-resources', Object.values(resources).every(values => values.every(value => budget(value.stream)
      && value.lifecycle.active === 1 && value.lifecycle.pending === 0 && textureBudget(value.resources))
      && values[2].memory.textures <= values[1].memory.textures
      && values[2].memory.geometries <= values[1].memory.geometries
      && values[2].stream.retainedBytes <= values[1].stream.retainedBytes
      && values[2].stream.estimatedTextureBytes <= values[1].stream.estimatedTextureBytes
      && values[2].resources.geometry.triangles <= values[1].resources.geometry.triangles
      && values[2].resources.geometry.meshes <= values[1].resources.geometry.meshes
      && values[2].resources.allocatedTextureMemory.estimatedBytes <= values[1].resources.allocatedTextureMemory.estimatedBytes), resources);
  });

  await section('initial-recovery', async () => {
    const required = new Set(cellsAt(geography.spawn).map(cell => assetPath(cell.base)));
    let deny = true;
    const { page, record } = await scenario('initial-recovery', { deny: path => deny && required.has(path) });
    await page.locator('#mode-explore').click(); await page.locator('#journey-enter').click();
    await page.waitForFunction(() => window.__HOME__.snapshot().sceneState === 'error');
    const retained = await readSession(page); await setLocale(page, 'zh');
    check('initial-real-cell-error-preserves-selected-journey', record.denied.length > 0 && retained?.routeId === geography.id
      && await page.locator('#scene-retry').isVisible(), { retained, current: await home(page), denied: record.denied });
    deny = false; await page.locator('#scene-retry').click(); await ready(page);
    check('initial-retry-loads-real-cell-with-preserved-order', equal((await readSession(page)).stopIds, retained.stopIds)
      && (await observe(page)).ground.hit && (await observe(page)).lifecycle.active === 1, await observe(page));
    await unchangedLegacy(page, 'initial-retry-keeps-legacy-bytes');
  });

  await section('latest-intent', async () => {
    let release;
    const barrier = new Promise(resolve => { release = resolve; });
    const { page, record } = await scenario('latest-intent', { delay: path => path === assetPath(manifest.ground), wait: barrier });
    try {
      await page.locator('#mode-explore').click(); await page.locator('#journey-enter').click();
      const deadline = Date.now() + timeout;
      while (!record.delayed.length && Date.now() < deadline) await page.waitForTimeout(100);
      if (!record.delayed.length) throw new Error('Actual delayed ground request was not issued.');
      const controls = await page.locator('#neighborhood-journey [data-journey-choice], #neighborhood-journey [data-journey-up], #neighborhood-journey [data-journey-down], #neighborhood-journey [data-journey-remove], #journey-suggest, #journey-add').evaluateAll(nodes => nodes.map(node => ({ id: node.id, disabled: node.disabled })));
      check('opening-controls-prevent-competing-itinerary-mutations', (await home(page)).neighborhood.busy
        && controls.length > 0 && controls.every(control => control.disabled), controls);
      await page.locator('[data-pack="ginza-wako"]').click();
    } finally { release(); }
    await ready(page, 'ginza-wako'); await page.waitForTimeout(1000);
    const actual = await observe(page);
    check('canceled-neighborhood-cannot-replace-latest-pack', actual.home.pack.packId === 'ginza-wako'
      && actual.lifecycle.active === 1 && actual.lifecycle.pending === 0 && actual.home.neighborhood.status !== 'openError'
      && await page.locator('#live-stage canvas').count() === 1, actual);
    await unchangedLegacy(page, 'cancellation-keeps-legacy-bytes');
  });

  await section('unavailable-revision', async () => {
    const { page } = await scenario('unavailable-revision'); await enter(page);
    const actual = await readSession(page), future = { ...actual, revision: actual.revision + 100 };
    const bytes = JSON.stringify(future);
    // 从本次实际生成的记录构造未知版本，检查保留行为。
    await page.evaluate(({ key, bytes }) => localStorage.setItem(key, bytes), { key: journeyKey, bytes });
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => Boolean(window.__HOME__));
    await page.locator('.journey-replacement').waitFor({ state: 'visible' });
    check('unknown-revision-deeplink-preserves-record-and-blocks-entry', await page.evaluate(key => localStorage.getItem(key), journeyKey) === bytes
      && await page.locator('#journey-enter').isDisabled(), { future, current: await home(page) });
    await setLocale(page, 'zh');
    check('unavailable-language-change-keeps-record-bytes', await page.evaluate(key => localStorage.getItem(key), journeyKey) === bytes
      && await page.locator('#journey-enter').isDisabled(), await home(page));
    await page.locator('.journey-replacement > summary').click(); await page.locator('#journey-replace').click();
    const replacement = await readSession(page);
    check('explicit-replacement-selects-current-reviewed-version', replacement.revision === geography.revision
      && (!replacement.progress.view || replacement.progress.view.revision === geography.revision), replacement);
    await unchangedLegacy(page, 'version-replacement-preserves-unrelated-records');
  });

  check('no-page-exceptions-or-unexpected-network-origins', Object.values(report.scenarios).every(value => !value.pageErrors.length && !value.unexpectedOrigins.length),
    Object.fromEntries(Object.entries(report.scenarios).map(([name, value]) => [name, { pageErrors: value.pageErrors, unexpectedOrigins: value.unexpectedOrigins }])));
} finally {
  for (const context of contexts) await context.close(); await browser?.close(); await service?.close();
  report.finishedAt = new Date().toISOString(); report.summary = { passed: report.checks.filter(value => value.pass).length, failed: report.checks.filter(value => !value.pass).length };
  persist(); if (report.summary.failed) process.exitCode = 1;
}
