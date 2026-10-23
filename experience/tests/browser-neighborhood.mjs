// 使用实际构建、浏览器输入和分区网络请求验证连续街区。
import { chromium } from 'playwright';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { Matrix4, Vector3 } from 'three';
import { startServer } from '../server/src/server.js';
import { createJourneyPlanner } from '../src/journey/recommendations.js';
import { createJourneySession } from '../src/journey/session.js';
import { createRouteNavigation } from '../src/simulation/route-navigation.js';
import { verifyHistoricalGeography } from './helpers/neighborhood-evidence-source.mjs';
import geography from '../src/neighborhoods/shijo-east/geography.json' with { type: 'json' };
import { SIGHTS } from '../src/neighborhoods/shijo-east/sights.js';

if (!process.argv[2]) throw new Error('Usage: node tests/browser-neighborhood.mjs <built-dist-directory>');
const dist = resolve(process.argv[2]);
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || '../artifacts/neighborhood-20261021/qa/browser');
const timeout = Number(process.env.EXPERIENCE_QA_TIMEOUT || 120000);
const walkingTimeout = Number(process.env.EXPERIENCE_QA_WALK_TIMEOUT || 2400000);
const only = process.env.EXPERIENCE_QA_ONLY?.split(',').filter(Boolean);
const sections = ['startup', 'route-choice', 'journey', 'initial-recovery', 'latest-intent', 'unavailable-revision', 'external-session', 'residency-boundary', 'camera-safety'];
if (only?.some(value => ![...sections, 'walking-controls', 'arcade-regression', 'arcade-inspection', 'recovered-keyboard', 'recovered-camera-input', 'bridge-review', 'visual-review', 'tenmangu-framing', 'western-approach', 'platform-review', 'canopy-review'].includes(value))) throw new Error('Unknown neighborhood test section.');
const prefix = '/assets/neighborhoods/shijo-east/';
const journeyKey = 'tourguideai.journey.session.v1';
const keptKey = 'tourguideai.solo.places.v1';
const sha = value => createHash('sha256').update(value).digest('hex');
const geographyBytes = readFileSync(new URL('../src/neighborhoods/shijo-east/geography.json', import.meta.url));
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
const descriptors = [manifest.ground, manifest.lighting, manifest.context,
  ...manifest.cells.flatMap(cell => [cell.base, cell.near])].filter(Boolean);
const encodedResources = values => [...new Map(values.flatMap(descriptor => [descriptor, ...(descriptor.dependencies || [])])
  .filter(asset => asset.transport).map(asset => [asset.file, asset])).values()];
const encodedAssets = encodedResources(descriptors);
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
  driverDependencies: [{ file: 'tests/helpers/neighborhood-evidence-source.mjs',
    sha256: sha(readFileSync(new URL('./helpers/neighborhood-evidence-source.mjs', import.meta.url))) }],
  source: { id: geography.id, revision: geography.revision, geographySha256: sha(geographyBytes),
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
  checks: [], scenarios: {}, screenshots: [], paths: [], savedViews: [], http: [],
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
  '.webp': 'image/webp', '.hdr': 'application/octet-stream', '.woff': 'font/woff', '.gz': 'application/gzip' };
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
const requestAssetPath = value => assetPath(value.transport || value);
const nearRequestPaths = new Set(manifest.cells.filter(cell => cell.near).map(cell => requestAssetPath(cell.near)));
const contains = (cell, point) => point.x >= cell.bounds.minX - .001 && point.x <= cell.bounds.maxX + .001
  && point.y >= cell.bounds.minY - .001 && point.y <= cell.bounds.maxY + .001;
const cellsAt = point => manifest.cells.filter(cell => contains(cell, point));
const bridgeSight = geography.sights.find(sight => sight.id === 'shijo-bridge');
if (!bridgeSight) throw new Error('Reviewed bridge sight is absent.');
const riverCells = cellsAt(bridgeSight);
const riverEncodedAssets = encodedResources(riverCells.flatMap(cell => [cell.base, cell.near]).filter(Boolean));
const startupEncodedAssets = encodedResources([manifest.ground, manifest.context, ...cellsAt(geography.spawn).map(cell => cell.base)].filter(Boolean));
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
    && stream.retainedBytes <= 64 * 1024 * 1024 && nearCapacity(stream)
    && stream.cells.every(cell => !cell.error && cell.state !== 'failed')
    && Number.isFinite(stream.estimatedTextureBytes) && stream.estimatedTextureBytes <= 96 * 1024 * 1024;
}
function nearCapacity(stream) {
  return stream.nearLimit === (stream.tier === 'compact' ? 1 : 3)
    && Number.isSafeInteger(stream.nearReservations) && stream.nearReservations >= 0
    && stream.cells.filter(cell => cell.level === 'near').length + stream.nearReservations <= stream.nearLimit;
}
function resources(value) {
  const scene = value.renderer.scene, lighting = value.renderer.lighting;
  return { renderTotals: value.renderer.render, renderedFrames: value.renderer.renderedFrames, updateFrames: value.renderer.updateFrames,
    geometry: { meshes: scene.meshes, triangles: scene.triangles, streamedMeshes: scene.streetMeshes,
      streamedTriangles: scene.streetTriangles, permanentResidentMeshes: scene.residentMeshes, permanentResidentTriangles: scene.residentTriangles },
    residency: { cells: value.stream.residentCells, nearCells: value.stream.cells.filter(cell => cell.level === 'near').length,
      nearLimit: value.stream.nearLimit, nearReservations: value.stream.nearReservations, tier: value.stream.tier,
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
async function scenario(name, fault = {}, options = {}) {
  const contextOptions = { viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference', deviceScaleFactor: 1,
    ...options.context };
  const context = await browser.newContext(contextOptions);
  contexts.add(context);
  const record = report.scenarios[name] = { startedAt: Date.now(), context: contextOptions, requests: [], responses: [], finishedRequests: [],
    failures: [], denied: [], delayed: [], pageErrors: [], unexpectedOrigins: [] };
  if (fault.deny || fault.delay) await context.route(service.url + '/**', async route => {
    const url = new URL(route.request().url()), path = url.pathname === '/' ? '/index.html' : url.pathname;
    if (path.startsWith('/api/')) return route.continue();
    if (fault.deny?.(path)) { record.denied.push(path); return route.abort('blockedbyclient'); }
    if (fault.delay?.(path)) { record.delayed.push(path); await fault.wait; }
    return route.continue();
  });
  await context.addInitScript(({ origin, values }) => {
    if (location.origin === origin && !sessionStorage.getItem('neighborhood-qa-seeded')) {
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
      sessionStorage.setItem('neighborhood-qa-seeded', '1');
    }
  }, { origin: service.url, values: { ...legacy, ...options.storage } });
  const page = await context.newPage(); page.setDefaultTimeout(timeout);
  page.on('request', request => {
    const url = new URL(request.url()); record.requests.push({ at: Date.now(), origin: url.origin, path: url.pathname, method: request.method() });
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== service.url && !providers.has(url.origin)) record.unexpectedOrigins.push(url.origin);
  });
  page.on('requestfailed', request => record.failures.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText }));
  page.on('response', response => record.responses.push({ path: new URL(response.url()).pathname, status: response.status() }));
  page.on('requestfinished', request => record.finishedRequests.push(new URL(request.url()).pathname));
  page.on('pageerror', error => { record.pageErrors.push(error.message); persist(); });
  await page.goto(service.url + '/?qa=1&mode=together&lang=en', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__HOME__));
  return { context, page, record, fault };
}
function compressedRequests(record, expected) {
  const loaded = encodedAssets.filter(asset => record.requests.some(request => request.path === assetPath(asset.transport)));
  const logicalRequests = record.requests.filter(request => encodedAssets.some(asset => request.path === assetPath(asset)));
  const http = report.http.filter(request => request.at >= record.startedAt
    && loaded.some(asset => request.path === assetPath(asset.transport)));
  const matches = asset => record.responses.some(response => response.path === assetPath(asset.transport) && response.status === 200)
    && record.finishedRequests.includes(assetPath(asset.transport)) && !record.failures.some(failure => failure.path === assetPath(asset.transport))
    && http.some(request => request.path === assetPath(asset.transport) && request.status === 200 && request.finished
      && request.bytes === asset.transport.bytes && request.sha256 === asset.transport.sha256);
  return { pass: expected.length > 0 && expected.every(matches) && loaded.every(matches) && logicalRequests.length === 0,
    expected: expected.map(asset => ({ logical: asset.file, decodedBytes: asset.bytes, decodedSha256: asset.sha256, transport: asset.transport })),
    loaded: loaded.map(asset => asset.file), logicalRequests, http,
    identityEvidence: 'Encoded and decoded identities were independently verified in manifest preflight; actual HTTP body hashes and successful runtime readiness bind the loaded resources.' };
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
async function groundClick(page, target, touch = false) {
  await page.locator('#live-stage canvas').scrollIntoViewIfNeeded();
  const camera = await page.evaluate(() => window.__TOUR_GAME__.camera());
  const bounds = await page.locator('#live-stage canvas').boundingBox();
  const point = new Vector3(target.x, target.height, -target.y)
    .applyMatrix4(new Matrix4().fromArray(camera.matrixWorld).invert())
    .applyMatrix4(new Matrix4().fromArray(camera.projectionMatrix));
  if (Math.abs(point.x) > .98 || Math.abs(point.y) > .98) throw new Error('The selected actual ground point is outside the current camera.');
  const x = bounds.x + (point.x + 1) * bounds.width / 2, y = bounds.y + (1 - point.y) * bounds.height / 2;
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}
async function capture(page, name, canvasOnly = false) {
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
  if (canvasOnly) {
    const canvasFile = name + '-canvas.png';
    await page.locator('#live-stage canvas').screenshot({ path: join(output, canvasFile) });
    report.screenshots.push({ file: canvasFile, kind: 'actual-canvas', sha256: sha(readFileSync(join(output, canvasFile))),
      layout: await layout(), observed: await observe(page) }); persist();
  }
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
async function inspectVisibleSurface(page, id, expectedId) {
  const initial = await observe(page); await page.locator('#solo-inspect').click();
  const attempts = [], inputs = [];
  let focus = null;
  const scan = async points => {
    await page.locator('#live-stage canvas').scrollIntoViewIfNeeded();
    const bounds = await page.locator('#live-stage canvas').boundingBox();
    for (const [x, y] of points) {
      const previous = (await observe(page)).renderer.updateFrames;
      await page.mouse.move(bounds.x + bounds.width * x, bounds.y + bounds.height * y);
      await page.waitForFunction(previous => window.__TOUR_GAME__.renderer().updateFrames > previous, previous);
      focus = await page.evaluate(() => window.__TOUR_GAME__.inspection().focus);
      attempts.push({ pointer: { x, y, bounds }, focus, camera: (await observe(page)).camera });
      if (focus && (!expectedId || focus.id === expectedId)) return true;
    }
    return false;
  };
  let found = await scan([[.5, .35], [.25, .4], [.75, .4], [.35, .25], [.65, .25], [.15, .6], [.85, .6], [.5, .15]]);
  if (!found && expectedId === 'shijo-east:nishiki-market') {
    inputs.push(...await aimAlongArcade(page, id));
    found = await scan([[.25, .08], [.4, .08], [.12, .25], [.25, .3], [.4, .4], [.7, .3], [.6, .15], [.5, .5]]);
  }
  if (found) {
    await page.locator('#solo-detail').click();
    await page.waitForFunction(() => Boolean(window.__TOUR_GAME__.inspection().selected));
  }
  const selected = await page.evaluate(() => window.__TOUR_GAME__.inspection().selected);
  check(id, Boolean(focus && selected && selected.id === focus.id && (!expectedId || selected.id === expectedId))
    && near((await observe(page)).route.position, initial.route.position),
    { focus, selected, inputs, attempts, before: initial.route.position, after: (await observe(page)).route.position });
  if (selected) await page.locator('#solo-close-detail').click();
  await page.locator('#live-stage').focus(); await page.keyboard.press('Escape');
  await page.waitForFunction(() => !window.__TOUR_GAME__.inspection().enabled);
  if (inputs.length) {
    await page.locator('#preview-reset').click();
    await page.waitForFunction(() => !window.__TOUR_GAME__.camera().transitioning && !window.__TOUR_GAME__.camera().obstruction?.settling);
    check(id + '-explicit-reset-keeps-walking-position', near((await observe(page)).route.position, initial.route.position), await observe(page));
  }
}
async function aimAlongArcade(page, checkId) {
  const inputs = [];
  await page.locator('#live-stage').focus();
  for (const operation of ['orbit', 'tilt', 'zoom']) {
    let reached = false;
    for (let step = 0; step < 40; step++) {
      const before = await observe(page), camera = before.camera;
      const offset = new Vector3().fromArray(camera.position).sub(new Vector3().fromArray(camera.viewTarget));
      const radius = offset.length(), azimuth = Math.atan2(offset.x, offset.z), polar = Math.acos(offset.y / radius);
      const angle = Math.atan2(Math.sin(-Math.PI / 2 - azimuth), Math.cos(-Math.PI / 2 - azimuth));
      if (operation === 'orbit' ? Math.abs(angle) <= .081 : operation === 'tilt' ? polar >= 1.44 : radius <= 8.01) { reached = true; break; }
      const key = operation === 'orbit' ? angle < 0 ? 'j' : 'l' : operation === 'tilt' ? 'k' : '=';
      await page.keyboard.press(key);
      await page.waitForFunction(frame => window.__TOUR_GAME__.renderer().updateFrames > frame, before.renderer.updateFrames);
      const after = await observe(page);
      if (!inputs.length && checkId) {
        const expectedAzimuth = azimuth + (key === 'j' ? -.08 : key === 'l' ? .08 : 0);
        const difference = Math.atan2(Math.sin(after.camera.azimuth - expectedAzimuth), Math.cos(after.camera.azimuth - expectedAzimuth));
        check(checkId + '-first-adjustment-starts-from-rendered-pose', Math.abs(difference) < .003
          && near(after.camera.distance, key === '=' ? Math.max(camera.limits.distance[0], radius - 1) : radius)
          && near(after.camera.polar, key === 'k' ? Math.min(camera.limits.polar[1], polar + .06) : polar)
          && near(after.camera.target, camera.viewTarget) && near(after.route.position, before.route.position),
        { key, before: camera, after: after.camera, expectedAzimuth, radius, polar });
      }
      inputs.push({ operation, key, before: camera, after: after.camera });
    }
    if (!reached) throw new Error('Actual camera input did not reach the visible arcade framing: ' + operation);
  }
  return inputs;
}
function retainHistoricalGeography(source) {
  const proof = verifyHistoricalGeography(source.source.geographySha256, geographyBytes);
  report.source.historicalGeographyCompatibility = proof;
  return proof;
}
function priorFullWalk() {
  const sourceBytes = gunzipSync(readFileSync(new URL('../evidence/neighborhood-20261023/ci/neighborhood-result.json.gz', import.meta.url)));
  const sourceSha256 = sha(sourceBytes);
  if (sourceSha256 !== '5a5c9f94960fb3212ed01f9a5d606034f267de1e3c5ffa82e3748f75052a9cfd') throw new Error('Prior actual route evidence changed.');
  const source = JSON.parse(sourceBytes);
  retainHistoricalGeography(source);
  return { source, sourceSha256 };
}
async function aimWestAtTenmangu(page, record) {
  const inputs = [];
  await page.locator('#solo-inspect').click(); await page.locator('#live-stage').focus();
  for (const operation of ['orbit', 'tilt', 'zoom']) {
    let reached = false;
    for (let step = 0; step < 40; step++) {
      const before = await observe(page), camera = before.camera;
      const offset = new Vector3().fromArray(camera.position).sub(new Vector3().fromArray(camera.viewTarget));
      const radius = offset.length(), azimuth = Math.atan2(offset.x, offset.z), polar = Math.acos(offset.y / radius);
      const angle = Math.atan2(Math.sin(Math.PI / 2 - azimuth), Math.cos(Math.PI / 2 - azimuth));
      if (operation === 'orbit' ? Math.abs(angle) <= .081 : operation === 'tilt' ? polar >= 1.44 : radius <= 10.01) { reached = true; break; }
      const key = operation === 'orbit' ? angle < 0 ? 'j' : 'l' : operation === 'tilt' ? 'k' : '=';
      await page.keyboard.press(key);
      await page.waitForFunction(frame => window.__TOUR_GAME__.renderer().updateFrames > frame, before.renderer.updateFrames);
      const after = await observe(page);
      inputs.push({ operation, key, before: camera, after: after.camera, position: after.route.position });
    }
    if (!reached) throw new Error('Native controls did not reach the Tenmangu review framing: ' + operation);
  }
  record.reviewInputs = inputs;
  await page.keyboard.press('Escape');
  return cameraSettled(page, record, 'native-west-facing-tenmangu-review');
}
function sessionAt(view, lighting = 'day', stopIds = geography.sights.map(sight => sight.id)) {
  const planner = createJourneyPlanner({ routeId: geography.id, revision: geography.revision,
    graph: geography.navigation, startNodeId: geography.startNodeId, sights: SIGHTS });
  return createJourneySession(planner.route(stopIds), { view, lighting });
}
function priorArcadeInterior() {
  const sourceBytes = readFileSync(new URL('../evidence/neighborhood-20261021/qa/arcade-blocker/arcade-result.json', import.meta.url));
  if (sha(sourceBytes) !== '4096de8b10722d34e3f52a6c5bf71b475b1a6630b5fba9583bbe34a5378fb408') throw new Error('The retained interior evidence changed.');
  const source = JSON.parse(sourceBytes);
  return { sourceSha256: sha(sourceBytes), visited: source.captures.find(value => value.file === 'inside-arcade-day-canvas.png').observed };
}
function actorProjection(value) {
  const points = [0, 1.75].map(height => new Vector3(value.route.position.x,
    value.route.position.height + height, -value.route.position.y)
    .applyMatrix4(new Matrix4().fromArray(value.camera.matrixWorld).invert())
    .applyMatrix4(new Matrix4().fromArray(value.camera.projectionMatrix)).toArray());
  return { points, verticalOccupancy: Math.abs(points[1][1] - points[0][1]) / 2,
    actualDistance: new Vector3().fromArray(value.camera.position).distanceTo(new Vector3().fromArray(value.camera.viewTarget)) };
}
function streetFraming(value) {
  const actor = actorProjection(value);
  return { actor, safe: actor.actualDistance >= 5 - .003 && actor.verticalOccupancy <= .5
    && actor.points.every(point => point.every(Number.isFinite) && point.every(coordinate => Math.abs(coordinate) < 1)) };
}
function priorVisualReview() {
  const bytes = gunzipSync(readFileSync(new URL('../evidence/neighborhood-20261023/qa/candidate-6-visual-review/neighborhood-result.json.gz', import.meta.url)));
  const sourceSha256 = sha(bytes);
  if (sourceSha256 !== '897b1ceaf5a4ec1f9305704423b141397e049ba4b1a032acd07d998ccaef230b') throw new Error('Prior visual evidence changed.');
  const source = JSON.parse(bytes);
  retainHistoricalGeography(source);
  return { source, sourceSha256 };
}
async function recordNativeInputs(page) {
  await page.evaluate(() => {
    window.__NEIGHBORHOOD_INPUT_EVENTS__ = [];
    const stage = document.querySelector('#live-stage');
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'touchmove', 'wheel', 'keydown']) {
      stage.addEventListener(type, event => window.__NEIGHBORHOOD_INPUT_EVENTS__.push({ type, trusted: event.isTrusted,
        pointerType: event.pointerType ?? null, pointerId: event.pointerId ?? null, button: event.button ?? null,
        buttons: event.buttons ?? null, x: event.clientX ?? null, y: event.clientY ?? null,
        code: event.code ?? null, deltaY: event.deltaY ?? null,
        touches: event.touches ? [...event.touches].map(touch => ({ id: touch.identifier, x: touch.clientX, y: touch.clientY })) : null,
      }), { capture: true, passive: true });
    }
  });
}
async function nativeCameraInput(page, context, operation) {
  await page.locator('#live-stage canvas').scrollIntoViewIfNeeded();
  const bounds = await page.locator('#live-stage canvas').boundingBox();
  const x = bounds.x + bounds.width * .5, y = bounds.y + bounds.height * .5;
  await page.mouse.move(x, y);
  await page.evaluate(() => { window.__NEIGHBORHOOD_INPUT_EVENTS__.length = 0; });
  const gestures = [];
  if (operation === 'click') await page.mouse.click(x, y);
  else if (operation === 'touch-tap') await page.touchscreen.tap(x, y);
  else if (operation.startsWith('keyboard-')) {
    const keys = { 'keyboard-orbit': ['j'], 'keyboard-tilt': ['i'], 'keyboard-zoom': ['-'], 'keyboard-pan': ['Shift+i', 'Shift+i'] }[operation];
    await page.locator('#live-stage').focus();
    for (const key of keys) { await page.keyboard.press(key); gestures.push({ key }); }
  } else if (operation === 'wheel') { await page.mouse.wheel(0, 40); gestures.push({ deltaY: 40 }); }
  else if (['drag', 'right-pan', 'middle-horizontal'].includes(operation)) {
    const button = operation === 'right-pan' ? 'right' : operation === 'middle-horizontal' ? 'middle' : 'left';
    const end = operation === 'right-pan' ? { x, y: y - 40 } : { x: x + 12, y };
    await page.mouse.down({ button }); await page.mouse.move(end.x, end.y, { steps: 3 }); await page.mouse.up({ button });
    gestures.push({ button, start: { x, y }, end });
  } else {
    const cdp = await context.newCDPSession(page);
    const points = (halfSpan = 24, shiftY = 0) => [-halfSpan, halfSpan].map((offset, index) =>
      ({ x: x + offset, y: y + shiftY, radiusX: 2, radiusY: 2, force: 1, id: index + 1 }));
    let frames;
    if (operation === 'three-finger') frames = [0, 4, 8, 12].map(shift => [-24, 0, 24].map((offset, index) =>
      ({ x: x + offset + shift, y, radiusX: 2, radiusY: 2, force: 1, id: index + 1 })));
    else if (operation === 'pinch') frames = [24, 22, 20, 18].map(span => points(span));
    else if (operation === 'touch-pan') frames = [0, -6, -12, -18].map(shift => points(24, shift));
    else if (operation === 'touch-mixed') frames = [...[24, 22, 20, 18].map(span => points(span)), ...[-6, -12, -18].map(shift => points(18, shift))];
    else throw new Error('Unknown native camera input: ' + operation);
    try {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: frames[0] });
      for (const frame of frames.slice(1)) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: frame });
        gestures.push({ touchPoints: frame, observed: await observe(page) });
        await page.waitForTimeout(60);
      }
    } finally {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    }
  }
  return { operation, bounds, start: { x, y }, gestures };
}
async function cameraSettled(page, record, operation) {
  const samples = [], started = Date.now();
  let previous = null, stableSince = null;
  while (Date.now() - started < timeout) {
    const value = await observe(page);
    const sample = { elapsedMs: Date.now() - started, camera: value.camera, view: value.home.currentView,
      updateFrames: value.renderer.updateFrames, renderedFrames: value.renderer.renderedFrames };
    if (!previous || sample.updateFrames !== previous.updateFrames) {
      samples.push(sample);
      const stable = previous && !sample.camera.transitioning && !sample.camera.obstruction?.settling
        && near(previous.camera.matrixWorld, sample.camera.matrixWorld, .00001)
        && near(previous.view, sample.view, .00001);
      stableSince = stable ? stableSince ?? sample.elapsedMs : null;
      if (stableSince !== null && sample.elapsedMs - stableSince >= 300) {
        (record.cameraSettling ??= []).push({ operation, elapsedMs: sample.elapsedMs, samples });
        return value;
      }
      previous = sample;
    }
    await page.waitForTimeout(100);
  }
  (record.cameraSettling ??= []).push({ operation, elapsedMs: Date.now() - started, samples });
  throw new Error('Actual camera did not settle within the browser-operation deadline: ' + operation);
}
async function boundedWalk(page, id, reached) {
  const started = Date.now(), path = { id, startedAt: new Date().toISOString(), samples: [] };
  report.paths.push(path);
  while (Date.now() - started < 180000) {
    const actual = await observe(page);
    path.samples.push({ elapsedMs: Date.now() - started, route: actual.route, ground: actual.ground,
      camera: actual.camera, resources: resources(actual), stream: actual.stream });
    persist();
    if (reached(actual)) { path.completedAt = new Date().toISOString(); return actual; }
    await page.waitForTimeout(1000);
  }
  throw new Error('Bounded actual walk timed out: ' + id);
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
function independentJourneyDistance(session) {
  // 直接使用保留的中心线计算距离，不调用生产推荐器或路径查找函数。
  const graph = new Map(geography.navigation.nodes.map(node => [node.id, []]));
  for (const edge of geography.navigation.edges) {
    if (!edge.accessible || !edge.reviewed) continue;
    const length = edge.points.slice(1).reduce((sum, point, index) => {
      const previous = edge.points[index];
      return sum + Math.hypot(point.x - previous.x, point.y - previous.y, point.height - previous.height);
    }, 0);
    graph.get(edge.from).push({ to: edge.to, length });
    if (edge.bidirectional !== false) graph.get(edge.to).push({ to: edge.from, length });
  }
  const legs = [];
  let from = session.startNodeId;
  for (const id of session.stopIds) {
    const sight = geography.sights.find(value => value.id === id);
    if (!sight) throw new Error('The selected option contains an unknown source sight.');
    const distances = new Map([[from, 0]]), remaining = new Set(graph.keys());
    while (remaining.size) {
      let node, distance = Infinity;
      for (const candidate of remaining) if ((distances.get(candidate) ?? Infinity) < distance) {
        node = candidate; distance = distances.get(candidate);
      }
      if (!node || node === sight.nodeId) break;
      remaining.delete(node);
      for (const edge of graph.get(node)) {
        const next = distance + edge.length;
        if (next < (distances.get(edge.to) ?? Infinity)) distances.set(edge.to, next);
      }
    }
    const distanceMeters = distances.get(sight.nodeId);
    if (!Number.isFinite(distanceMeters)) throw new Error('The selected option has no independent source-graph connection.');
    legs.push({ from, to: sight.nodeId, sightId: id, distanceMeters }); from = sight.nodeId;
  }
  return { distanceMeters: legs.reduce((sum, leg) => sum + leg.distanceMeters, 0), legs };
}
async function verifyChosenPlan(page, id, expectedOrder) {
  const session = await readSession(page), observed = await home(page), independent = independentJourneyDistance(session);
  const visible = await page.locator('.journey-stops [data-journey-focus]').evaluateAll(nodes => nodes.map(node => node.dataset.journeyFocus));
  const locale = await page.locator('html').getAttribute('lang');
  const distanceLabel = await page.locator('#neighborhood-journey .journey-distance strong').innerText();
  check(id, equal(session.stopIds, expectedOrder) && equal(visible, expectedOrder) && equal(observed.neighborhood.selected, expectedOrder)
    && Math.abs(observed.neighborhood.distanceMeters - independent.distanceMeters) < 1e-6
    && distanceLabel === new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(independent.distanceMeters / 1000) + ' km',
  { session, selected: observed.neighborhood, visible, independent, distanceLabel, locale });
  await mapsOrder(page, session, id + '-maps-order');
  return { session, observed, independent };
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
  const provenanceDescriptor = manifest.provenance;
  const provenanceBytes = provenanceDescriptor && assets.get(assetPath(provenanceDescriptor));
  if (!provenanceBytes || provenanceBytes.length !== provenanceDescriptor.bytes || sha(provenanceBytes) !== provenanceDescriptor.sha256) {
    throw new Error('Packaged neighborhood provenance differs from its manifest.');
  }
  const provenance = JSON.parse(provenanceBytes);
  if (provenance.geographySha256 !== report.source.geographySha256) throw new Error('Packaged geography differs from the current test source.');
  check('packaged-provenance-binds-current-geography', true, { file: provenanceDescriptor.file,
    sha256: sha(provenanceBytes), geographySha256: provenance.geographySha256, sceneSha256: provenance.sceneSha256 });
  const transportProof = [];
  for (const descriptor of descriptors) {
    for (const asset of [descriptor, ...(descriptor.dependencies || [])]) {
      const bytes = assets.get(assetPath(asset));
      if (!bytes || bytes.length !== asset.bytes || sha(bytes) !== asset.sha256) throw new Error('Manifest asset mismatch: ' + asset.file);
      if (asset.transport) {
        const transport = asset.transport, encoded = assets.get(assetPath(transport));
        if (transport.encoding !== 'gzip' || !encoded || encoded.length !== transport.bytes || sha(encoded) !== transport.sha256) {
          throw new Error('Manifest transport mismatch: ' + transport.file);
        }
        const decoded = gunzipSync(encoded, { maxOutputLength: asset.bytes });
        if (decoded.length !== asset.bytes || sha(decoded) !== asset.sha256 || !decoded.equals(bytes)) {
          throw new Error('Decoded transport differs from the logical asset: ' + asset.file);
        }
        transportProof.push({ file: asset.file, bytes: decoded.length, sha256: sha(decoded), transport });
      }
    }
  }
  check('manifest-assets-match-actual-packaged-bytes', true, { cells: manifest.cells.length, sha256: sha(manifestBytes) });
  if (transportProof.length) check('gzip-transport-and-decoded-assets-match-exact-packaged-identities', true, transportProof);
  if (encodedAssets.length) {
    const geometry = descriptors.filter(descriptor => descriptor.transport || descriptor.dependencies?.some(asset => asset.file.endsWith('.bin') && asset.transport)).map(descriptor => {
      const resources = [descriptor, ...(descriptor.dependencies || []).filter(asset => asset.file.endsWith('.bin'))];
      return { file: descriptor.file, transferBytes: resources.reduce((sum, asset) => sum + (asset.transport?.bytes ?? asset.bytes), 0),
        decodedBytes: resources.reduce((sum, asset) => sum + asset.bytes, 0), declaredTransferBytes: descriptor.transferGeometryBytes,
        declaredDecodedBytes: descriptor.geometryBytes, budget: descriptor.transferBudgetBytes,
        reviewedMaximum: (descriptor.file === 'cells/cell-e000-n000/near.gltf' ? 3.5 : 2) * 1024 * 1024 };
    });
    check('gzip-section-wire-budget-keeps-decoded-memory-size-explicit', geometry.every(value => value.transferBytes === value.declaredTransferBytes
      && value.decodedBytes === value.declaredDecodedBytes && (value.budget === 2 * 1024 * 1024 || value.budget === value.reviewedMaximum)
      && value.budget <= value.reviewedMaximum && value.transferBytes <= value.budget), geometry);
  }
  service = await startServer({ port: 0, host: '127.0.0.1', databasePath: join(output, 'rooms.sqlite'), config: { provider: { apiKey: '', model: '' } } });
  const assetIdentities = new Map(files.map(file => [file.path, file]));
  // 成功资源通过真实 HTTP 返回不可变构建；网络拦截仅用于明确的中断或延迟检查。
  service.app.use((request, response) => {
    const url = new URL(request.originalUrl, service.url), path = url.pathname === '/' ? '/index.html' : url.pathname;
    const bytes = assets.get(path), identity = assetIdentities.get(path);
    const record = { at: Date.now(), path, query: url.search, status: bytes ? 200 : 404,
      bytes: bytes?.length ?? 0, sha256: identity?.sha256 ?? null, finished: false };
    report.http.push(record); response.on('finish', () => { record.finished = true; });
    response.removeHeader('Content-Security-Policy');
    response.set('Cache-Control', 'no-store');
    response.set('Content-Type', mime[extname(path)] || 'application/octet-stream');
    response.status(record.status).end(bytes || 'Packaged asset missing');
  });
  report.conditions.assetDelivery = 'Actual loopback HTTP with immutable captured build bodies and no-store; only deliberate abort/delay scenarios install request routes.';
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
      .flatMap(cell => [cell.base, cell.near].filter(Boolean)
        .flatMap(asset => asset.transport ? [assetPath(asset), assetPath(asset.transport)] : [assetPath(asset)])));
    check('initial-neighborhood-load-does-not-fetch-distant-cells', distantFiles.size > 0
      && !record.requests.some(request => distantFiles.has(request.path)), { distantFiles: [...distantFiles], requested: record.requests.filter(request => request.path.startsWith(prefix)) });
    if (riverEncodedAssets.length) check('startup-does-not-fetch-deferred-gzip-river-resources',
      !record.requests.some(request => riverEncodedAssets.some(asset => [assetPath(asset), assetPath(asset.transport)].includes(request.path))),
    { cellIds: riverCells.map(cell => cell.id), deferred: riverEncodedAssets.map(asset => ({ logical: assetPath(asset), transport: assetPath(asset.transport) })), requests: record.requests });
    await primaryFrameBudget(page, 'opening-day'); await capture(page, 'opening-day-en');
    if (startupEncodedAssets.length) {
      const proof = compressedRequests(record, startupEncodedAssets);
      check('startup-loads-compressed-required-containers-through-real-http', proof.pass, proof);
    }
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

  await section('route-choice', async () => {
    const { page } = await scenario('route-choice'); await enter(page);
    const initialOrder = (await readSession(page)).stopIds;
    if (initialOrder.length !== 6 || !initialOrder.includes('shijo-bridge')) throw new Error('Expected the reviewed six-sight default journey.');
    await page.locator('[data-journey-remove="shijo-bridge"]').click();
    await verifyChosenPlan(page, 'native-remove-bridge-establishes-edited-five-sight-journey', initialOrder.filter(id => id !== 'shijo-bridge'));
    await page.locator('#solo-inspect').click(); await page.locator('#live-stage').focus();
    const initialAzimuth = (await observe(page)).camera.azimuth;
    await page.keyboard.press('l');
    await page.waitForFunction(value => Math.abs(window.__TOUR_GAME__.camera().azimuth - value) > .001, initialAzimuth);
    await page.keyboard.press('Escape'); await setLighting(page, 'night');
    const saved = await keep(page, 'Chosen walk view · 自选路线', 'Private route-choice note · 私人路线笔记');
    const pose = (await home(page)).currentView;
    await page.waitForFunction(({ key, view }) => {
      const progress = JSON.parse(localStorage.getItem(key))?.progress;
      return progress?.lighting === 'night' && progress.view?.camera.azimuth === view.camera.azimuth
        && progress.view.camera.polar === view.camera.polar && progress.view.camera.distance === view.camera.distance
        && progress.view.player.x === view.player.x && progress.view.player.y === view.player.y;
    }, { key: journeyKey, view: pose });
    const before = await readSession(page), privateBefore = await page.evaluate(key => localStorage.getItem(key), keptKey);
    const initialDistance = independentJourneyDistance(before);
    await page.locator('.journey-preferences > summary').click();
    await page.locator('#journey-suggest').click();
    const readVisibleChoices = () => page.locator('[data-journey-choice]').evaluateAll(buttons => buttons.map(button => {
      const container = button.parentElement, paragraphs = container.querySelectorAll('p');
      return { index: button.dataset.journeyChoice, buttonText: button.textContent.trim(),
        title: container.querySelector('strong').textContent.trim(), distanceText: paragraphs[0].textContent.trim(),
        sightTitles: paragraphs[1].textContent.trim().split(' → ') };
    }));
    const options = await readVisibleChoices();
    const locale = await page.locator('html').getAttribute('lang');
    const candidates = options.map(option => ({ ...option, stopIds: option.sightTitles.map(title => {
      const matches = SIGHTS.filter(sight => sight.title[locale] === title);
      if (matches.length !== 1) throw new Error('The visible suggestion does not map to one reviewed sight: ' + title);
      return matches[0].id;
    }) }));
    const alternative = candidates.find(option => !equal(option.stopIds, before.stopIds)
      && Math.abs(independentJourneyDistance({ ...before, stopIds: option.stopIds }).distanceMeters - initialDistance.distanceMeters) > .1);
    if (!alternative) throw new Error('No genuinely different visible route alternative is available.');
    const english = { heading: await page.locator('.journey-alternatives > summary').innerText(),
      status: await page.locator('.journey-status').innerText(), options };
    await setLocale(page, 'zh');
    const chinese = { heading: await page.locator('.journey-alternatives > summary').innerText(),
      status: await page.locator('.journey-status').innerText(), options: await readVisibleChoices(),
      session: await readSession(page), view: (await home(page)).currentView };
    check('reviewed-default-offers-one-explicit-neutral-choice-in-both-locales', candidates.length === 1
      && equal(alternative.stopIds, initialOrder) && english.heading === 'Suggested walk'
      && english.status === 'One reviewed walk is available. Choose it, then adjust its stops.'
      && english.options[0].title === 'Neighborhood contrasts' && english.options[0].buttonText === 'Choose this walk'
      && chinese.heading === '推荐路线' && chinese.status === '目前有一条已审核漫步可供选择。选择后，再调整停留景点。'
      && chinese.options.length === 1 && chinese.options[0].title === '街区的不同侧面' && chinese.options[0].buttonText === '选择这段漫步'
      && equal(chinese.options[0].sightTitles, initialOrder.map(id => SIGHTS.find(sight => sight.id === id).title.zh))
      && equal(chinese.session.stopIds, before.stopIds) && near(chinese.view, pose),
    { english, chinese, initialOrder, before });
    await setLocale(page, 'en');
    check('suggestions-preserve-active-journey-until-native-choice', equal((await readSession(page)).stopIds, before.stopIds)
      && near((await home(page)).currentView, pose) && Math.abs((await home(page)).neighborhood.distanceMeters - initialDistance.distanceMeters) < 1e-6
      && await page.evaluate(key => localStorage.getItem(key), keptKey) === privateBefore,
    { before, current: await readSession(page), initialDistance, options: candidates, selectedAlternative: alternative });
    await page.locator(`[data-journey-choice="${alternative.index}"]`).click();
    const chosen = await verifyChosenPlan(page, 'native-choice-commits-different-source-graph-order-and-distance', alternative.stopIds);
    check('choosing-alternative-preserves-private-view-lighting-and-note', near(chosen.observed.currentView, pose)
      && near(chosen.session.progress.view, pose) && chosen.session.progress.lighting === 'night'
      && !(await page.locator('.journey-alternatives').evaluate(node => node.open))
      && await page.evaluate(key => localStorage.getItem(key), keptKey) === privateBefore,
    { chosen: chosen.session, saved, currentView: chosen.observed.currentView });
    const editedOrder = [...alternative.stopIds], last = editedOrder.length - 1;
    await page.locator(`[data-journey-up="${editedOrder[last]}"]`).click();
    [editedOrder[last - 1], editedOrder[last]] = [editedOrder[last], editedOrder[last - 1]];
    await verifyChosenPlan(page, 'chosen-alternative-reorder-updates-graph-distance-and-maps', editedOrder);
    const removedId = editedOrder.find(id => id !== geography.sights[0].id);
    await page.locator(`[data-journey-remove="${removedId}"]`).click();
    const finalOrder = editedOrder.filter(id => id !== removedId);
    await verifyChosenPlan(page, 'chosen-alternative-removal-updates-graph-distance-and-maps', finalOrder);
    await setLocale(page, 'zh'); await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page, geography.id, 'night');
    const resumed = await verifyChosenPlan(page, 'native-reload-keeps-edited-chosen-route-and-localized-distance', finalOrder);
    check('chosen-route-reload-preserves-exact-pose-night-chinese-and-private-note', near(resumed.observed.currentView, pose)
      && near(resumed.session.progress.view, pose) && resumed.session.progress.lighting === 'night'
      && await page.locator('html').getAttribute('lang') === 'zh'
      && await page.evaluate(key => localStorage.getItem(key), keptKey) === privateBefore,
    { session: resumed.session, currentView: resumed.observed.currentView, saved });
    await capture(page, 'chosen-route-edited-reloaded-zh');
    await unchangedLegacy(page, 'actual-route-choice-preserves-legacy-records');
  });

  await section('journey', async () => {
    const target = geography.sights[1], delayedCells = cellsAt(target).filter(cell => !contains(cell, geography.spawn));
    if (!delayedCells.length) throw new Error('The actual manifest has no later cell for the boundary failure case.');
    const deniedPaths = new Set(delayedCells.map(cell => requestAssetPath(cell.base)));
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
    await inspectVisibleSurface(page, 'actual-market-surface-inspection-keeps-player-location', 'shijo-east:nishiki-market');
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
    const riverFiles = new Set(cellsAt(remembered.view.player).map(cell => requestAssetPath(cell.base)));
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
    const required = new Set(cellsAt(geography.spawn).map(cell => requestAssetPath(cell.base)));
    let deny = true;
    const { page, record } = await scenario('initial-recovery', { deny: path => deny && required.has(path) });
    await page.locator('#mode-explore').click(); await page.locator('#journey-enter').click();
    await page.waitForFunction(() => window.__HOME__.snapshot().sceneState === 'error');
    const retained = await readSession(page);
    const baseRequestsBeforeLocale = record.requests.filter(request => required.has(request.path)).length;
    await setLocale(page, 'zh'); await page.waitForTimeout(1500);
    const failedChinese = await home(page);
    const retryVisible = await page.locator('#scene-retry').isVisible();
    check('initial-real-cell-error-preserves-selected-journey', record.denied.length > 0 && retained?.routeId === geography.id
      && retryVisible && failedChinese.sceneState === 'error', { retained, current: failedChinese, denied: record.denied });
    check('locale-change-keeps-initial-error-until-explicit-retry', failedChinese.sceneState === 'error' && retryVisible
      && failedChinese.neighborhood.status === 'openError'
      && record.requests.filter(request => required.has(request.path)).length === baseRequestsBeforeLocale,
    { baseRequestsBeforeLocale, baseRequestsAfterLocale: record.requests.filter(request => required.has(request.path)).length,
      current: failedChinese, retryVisible });
    if (!retryVisible) throw new Error('Explicit scene Retry is unavailable after the real initial-cell failure.');
    deny = false; await page.locator('#scene-retry').click(); await ready(page);
    await page.waitForFunction(() => !window.__HOME__.snapshot().neighborhood.busy);
    check('initial-retry-loads-real-cell-with-preserved-order', equal((await readSession(page)).stopIds, retained.stopIds)
      && (await observe(page)).ground.hit && (await observe(page)).lifecycle.active === 1
      && (await home(page)).neighborhood.status !== 'openError'
      && record.requests.filter(request => required.has(request.path)).length > baseRequestsBeforeLocale, await observe(page));
    await unchangedLegacy(page, 'initial-retry-keeps-legacy-bytes');
  });

  await section('latest-intent', async () => {
    let release;
    const barrier = new Promise(resolve => { release = resolve; });
    const { page, record } = await scenario('latest-intent', { delay: path => path === requestAssetPath(manifest.ground), wait: barrier });
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

  await section('external-session', async () => {
    let release;
    const barrier = new Promise(resolve => { release = resolve; });
    const { context, page, record, fault } = await scenario('external-session', {
      delay: path => path === requestAssetPath(manifest.ground), wait: barrier,
    });
    let bytes, newer, heldSince;
    try {
      await page.locator('#mode-explore').click(); await page.locator('#journey-enter').click();
      const deadline = Date.now() + timeout;
      while (!record.delayed.length && Date.now() < deadline) await page.waitForTimeout(100);
      if (!record.delayed.length) throw new Error('The actual ground asset did not reach the delayed request.');
      heldSince = Date.now();
      const initial = await readSession(page);
      newer = { ...initial, stopIds: [...initial.stopIds].reverse(), variantId: 'personal',
        progress: { ...initial.progress, lighting: 'night' }, updatedAt: new Date().toISOString() };
      bytes = JSON.stringify(newer);
      // 第二个同源页面使用原生 localStorage，触发真正的跨页面 storage 事件。
      const writer = await context.newPage();
      await writer.goto(service.url + '/credits.html?lang=en', { waitUntil: 'domcontentloaded' });
      await writer.evaluate(({ key, bytes }) => localStorage.setItem(key, bytes), { key: journeyKey, bytes });
      await page.bringToFront();
      await page.waitForFunction(() => window.__HOME__.snapshot().neighborhood.storageChanged);
      const controls = await page.locator('#journey-enter, [data-journey-up], [data-journey-down], [data-journey-remove], #journey-suggest')
        .evaluateAll(nodes => nodes.map(node => ({ id: node.id, disabled: node.disabled })));
      check('external-current-revision-blocks-stale-mutations-during-opening',
        await page.locator('#journey-reload').isVisible() && controls.length > 0 && controls.every(node => node.disabled)
        && await writer.evaluate(key => localStorage.getItem(key), journeyKey) === bytes,
      { initial, newer, controls, current: await home(page) });
      while (Date.now() - heldSince < 15000) await page.waitForTimeout(Math.min(500, 15000 - (Date.now() - heldSince)));
      check('external-session-survives-fifteen-second-pending-opening',
        Date.now() - heldSince >= 15000 && (await home(page)).neighborhood.storageChanged
        && await writer.evaluate(key => localStorage.getItem(key), journeyKey) === bytes,
      { heldMs: Date.now() - heldSince, delayed: record.delayed, current: await home(page) });
    } finally { fault.delay = undefined; release(); }
    await ready(page);
    await page.waitForFunction(() => !window.__HOME__.snapshot().neighborhood.busy);
    const beforeInput = await observe(page);
    await page.locator('#solo-inspect').click(); await page.locator('#live-stage').focus(); await page.keyboard.press('j');
    await page.waitForFunction(angle => Math.abs(window.__TOUR_GAME__.camera().azimuth - angle) > .001, beforeInput.camera.azimuth);
    await page.keyboard.press('Escape'); await page.waitForTimeout(1100);
    check('late-opening-and-real-camera-capture-preserve-external-session-bytes',
      await page.evaluate(key => localStorage.getItem(key), journeyKey) === bytes
      && (await home(page)).neighborhood.storageChanged && await page.locator('#journey-enter').isDisabled()
      && await page.locator('#journey-reload').isEnabled(), { expected: newer, current: await observe(page) });
    await setLocale(page, 'zh');
    check('external-session-reload-control-is-localized-with-record-retained',
      await page.locator('#journey-reload').textContent() === '重新加载已存漫步'
      && await page.evaluate(key => localStorage.getItem(key), journeyKey) === bytes, await home(page));
    await page.locator('#journey-reload').click(); await ready(page, geography.id, 'night');
    await page.waitForFunction(() => !window.__HOME__.snapshot().neighborhood.busy);
    const adopted = await readSession(page);
    check('explicit-reload-adopts-newer-order-and-lighting-after-pagehide',
      equal(adopted.stopIds, newer.stopIds) && adopted.progress.lighting === 'night'
      && !(await home(page)).neighborhood.storageChanged && await page.locator('#journey-enter').isEnabled()
      && await page.locator('html').getAttribute('lang') === 'zh', { adopted, current: await observe(page) });
    await unchangedLegacy(page, 'external-session-guard-keeps-legacy-bytes');
  });

  await section('residency-boundary', async () => {
    const { source, sourceSha256 } = priorFullWalk();
    const priorPath = source.paths.find(path => path.id === 'outbound-boundary-denied');
    const opening = source.savedViews.find(value => value.view.player.x < 30);
    for (const { tier, startX, endX, viewport } of [
      { tier: 'desktop', startX: 78, endX: 92, viewport: { width: 1440, height: 1000 } },
      { tier: 'compact', startX: 94, endX: 106, viewport: { width: 390, height: 844 } },
    ]) {
      const start = priorPath.samples.find(value => value.route.position.x >= startX && value.route.position.x < startX + 2);
      const finish = priorPath.samples.find(value => value.route.position.x >= endX && value.route.position.x < endX + 2);
      if (!start?.ground.inside || !start.ground.hit || !finish?.ground.inside || !finish.ground.hit) throw new Error('The bounded path needs previously visited ground samples.');
      const view = { ...opening.view, player: { ...start.route.position } };
      const reconstructed = sessionAt(view);
      let releaseNear, heldNearPath;
      const nearBarrier = new Promise(resolve => { releaseNear = resolve; });
      const { page, context, record, fault } = await scenario('residency-' + tier, {
        delay: path => {
          if (!heldNearPath && nearRequestPaths.has(path)) {
            heldNearPath = path; return true;
          }
          return false;
        }, wait: nearBarrier,
      }, {
        context: { viewport, ...(tier === 'compact' ? { isMobile: true, hasTouch: true } : {}) },
        storage: { [journeyKey]: JSON.stringify(reconstructed) },
      });
      record.restoration = { sourceReportSha256: sourceSha256, sourcePackageSha256: source.artifact.manifestSha256,
        sourcePathId: priorPath.id, sourcePosition: start.route.position, finishPosition: finish.route.position,
        sourceCamera: opening.view.camera, reconstructedSession: reconstructed,
        description: 'The position was reached during the preserved full CI walk. The retained opening camera is reused explicitly; this is a reconstructed return record, not an exact prior frame.' };
      // 每个实际浏览器帧读取公开观察器，保留下载、解析与附件期间的容量。
      await page.evaluate(() => {
        window.__NEIGHBORHOOD_RESIDENCY_SAMPLES__ = [];
        window.__NEIGHBORHOOD_RESIDENCY_ACTIVE__ = true;
        const sample = () => {
          if (!window.__NEIGHBORHOOD_RESIDENCY_ACTIVE__) return;
          const game = window.__TOUR_GAME__, stream = game?.streaming();
          if (stream) window.__NEIGHBORHOOD_RESIDENCY_SAMPLES__.push({ at: performance.now(), route: game.route(), stream });
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
      try {
        await enter(page);
        await page.waitForFunction(() => window.__TOUR_GAME__.streaming().nearReservations > 0);
        await page.waitForFunction(() => window.__NEIGHBORHOOD_RESIDENCY_SAMPLES__.some(value => value.stream.nearReservations > 0));
        const held = await observe(page);
        check(tier + '-actual-near-request-reserves-capacity-before-response',
          Boolean(heldNearPath && record.delayed.includes(heldNearPath)) && nearCapacity(held.stream),
        { heldNearPath, current: held });
      } finally { fault.delay = undefined; releaseNear(); }
      await settled(page);
      const initial = await observe(page);
      const settledNearSets = [initial.stream.cells.filter(cell => cell.level === 'near').map(cell => cell.id).sort().join(',')];
      check(tier + '-recorded-boundary-position-restores-with-correct-tier',
        near(initial.route.position, start.route.position) && initial.stream.tier === tier
        && initial.stream.nearLimit === (tier === 'compact' ? 1 : 3), { restoration: record.restoration, initial });
      for (const [direction, target] of [['forward', finish.route.position], ['return', start.route.position]]) {
        // 目标点全部来自旧报告；分段点击使手机也保持可见地面命中。
        const from = (await observe(page)).route.position;
        const points = priorPath.samples.map(value => value.route.position)
          .filter(point => point.edgeId === from.edgeId && point.x >= Math.min(from.x, target.x) && point.x <= Math.max(from.x, target.x));
        if (target.x < from.x) points.reverse();
        let previous = from;
        for (const point of [...points, target]) {
          if (Math.hypot(point.x - previous.x, point.y - previous.y) < 5 && point !== target) continue;
          await groundClick(page, point, tier === 'compact');
          await page.waitForFunction(target => {
            const route = window.__TOUR_GAME__.route();
            return !route.destination && Math.hypot(route.position.x - target.x, route.position.y - target.y) < .15;
          }, point, { timeout: Math.min(walkingTimeout, 120000) });
          previous = point;
        }
        await settled(page);
        settledNearSets.push((await observe(page)).stream.cells.filter(cell => cell.level === 'near').map(cell => cell.id).sort().join(','));
        check(tier + '-boundary-' + direction + '-keeps-ground-and-full-quality',
          (await observe(page)).ground.inside && Boolean((await observe(page)).ground.hit)
          && budget((await observe(page)).stream), await observe(page));
      }
      const samples = await page.evaluate(() => {
        window.__NEIGHBORHOOD_RESIDENCY_ACTIVE__ = false;
        return window.__NEIGHBORHOOD_RESIDENCY_SAMPLES__;
      });
      const nearSets = new Set(samples.map(value => value.stream.cells.filter(cell => cell.level === 'near').map(cell => cell.id).sort().join(',')));
      record.residencySamples = samples;
      check(tier + '-near-cap-includes-inflight-reservations-through-real-boundary',
        samples.length > 0 && samples.every(value => nearCapacity(value.stream))
        && samples.some(value => value.stream.nearReservations > 0) && new Set(settledNearSets).size > 1,
      { samples: samples.length, reservationSamples: samples.filter(value => value.stream.nearReservations > 0).length,
        attachingSamples: samples.filter(value => value.stream.attachments.active > 0).length,
        nearSets: [...nearSets], settledNearSets, maxUsedSlots: Math.max(...samples.map(value => value.stream.nearReservations
          + value.stream.cells.filter(cell => cell.level === 'near').length)), limit: initial.stream.nearLimit });
      await unchangedLegacy(page, tier + '-boundary-replay-keeps-legacy-bytes');
      await context.close(); contexts.delete(context);
    }
  });

  if (only?.includes('arcade-regression')) await section('arcade-regression', async () => {
    const sourceBytes = readFileSync(new URL('../evidence/neighborhood-20261021/qa/arcade-blocker/source-walk-result.json', import.meta.url));
    if (sha(sourceBytes) !== 'ab353164cf5c4fdd323880d9368e3f96f9ffc0abff3f80a0e655801ed7880ebb') throw new Error('The actual approach evidence changed.');
    const source = JSON.parse(sourceBytes), visited = source.error.observed;
    const session = sessionAt(visited.home.currentView, 'day', visited.home.neighborhood.selected);
    const { page, record } = await scenario('arcade-regression', {}, { storage: { [journeyKey]: JSON.stringify(session) } });
    record.restoration = { sourceReportSha256: sha(sourceBytes), sourcePackageSha256: source.artifact.manifestSha256,
      sourceView: visited.home.currentView, reconstructedSession: session,
      description: 'The complete pose and selected order come from the previously observed actual approach. The session wrapper is reconstructed through public helpers.' };
    await enter(page); await settled(page);
    const restored = await observe(page);
    check('arcade-restores-prior-actual-approach-pose', near(restored.home.currentView, visited.home.currentView)
      && restored.ground.inside && Boolean(restored.ground.hit), restored);
    await capture(page, 'arcade-restored-approach-day', true);
    const market = geography.sights.find(sight => sight.id === 'nishiki-market');
    await focusSight(page, market);
    const arrived = await boundedWalk(page, 'remaining-actual-walk-to-market', value => !value.route.destination
      && Math.hypot(value.route.position.x - market.x, value.route.position.y - market.y) < .15);
    check('arcade-market-arrival-is-grounded-without-completion-flags', arrived.ground.inside && Boolean(arrived.ground.hit)
      && arrived.state.visitedIds.length === 0 && Object.keys(arrived.state.choiceIds).length === 0, arrived);
    await capture(page, 'arcade-market-day', true); await setLighting(page, 'night'); await capture(page, 'arcade-market-night', true);
    await setLighting(page, 'day'); await inspectVisibleSurface(page, 'market-actual-source-surface-selection', 'shijo-east:nishiki-market');
    await focusSight(page, geography.sights.find(sight => sight.id === 'nishiki-tenmangu'));
    await boundedWalk(page, 'actual-walk-inside-arcade', value => Math.hypot(value.route.position.x - arrived.route.position.x,
      value.route.position.y - arrived.route.position.y) >= 20);
    await page.locator('#journey-stop').click();
    await page.waitForFunction(() => !window.__TOUR_GAME__.route().goal && !window.__TOUR_GAME__.camera().obstruction?.settling);
    const stopped = await observe(page), projection = actorProjection(stopped);
    check('ordinary-arcade-camera-keeps-actor-within-viewport-and-distance-budget',
      projection.points.every(([x, y, z]) => Math.abs(x) <= 1 && Math.abs(y) <= 1 && Math.abs(z) <= 1)
      && projection.verticalOccupancy <= .5 && projection.actualDistance >= 5
      && stopped.camera.position[1] < 4.65 && stopped.ground.inside && Boolean(stopped.ground.hit),
    { projection, observed: stopped });
    await capture(page, 'arcade-inside-ordinary-day', true);
    await setLighting(page, 'night'); await capture(page, 'arcade-inside-ordinary-night', true);
    const beforeInspection = await observe(page);
    await page.locator('#solo-inspect').click();
    await page.waitForFunction(() => window.__TOUR_GAME__.inspection().enabled);
    await page.waitForTimeout(500);
    const entered = await observe(page);
    check('arcade-inspection-entry-keeps-actual-rendered-composition',
      near(entered.camera.position, beforeInspection.camera.position, .00001)
      && near(entered.camera.viewTarget, beforeInspection.camera.viewTarget, .00001)
      && near(entered.home.currentView, beforeInspection.home.currentView) && entered.camera.inspectionAimed === false,
    { before: beforeInspection.camera, after: entered.camera });
    await page.locator('#live-stage').focus();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__TOUR_GAME__.inspection().enabled && !window.__TOUR_GAME__.camera().obstruction?.settling);
    await inspectVisibleSurface(page, 'interior-actual-source-surface-selection', 'shijo-east:nishiki-market');
    await capture(page, 'arcade-interior-east-night', true);
    await setLighting(page, 'day'); await capture(page, 'arcade-interior-east-day', true);
    await page.locator('#solo-inspect').click(); await page.locator('#live-stage').focus();
    const beforeFraming = await observe(page);
    record.belowRoofInputs = await aimAlongArcade(page, 'below-roof-framing');
    await page.waitForFunction(() => !window.__TOUR_GAME__.camera().transitioning && !window.__TOUR_GAME__.camera().obstruction?.settling);
    const belowRoof = await observe(page);
    check('actual-keys-frame-below-arcade-roof-with-position-preserved',
      near(beforeFraming.route.position, belowRoof.route.position) && belowRoof.camera.position[1] < 4.65
      && belowRoof.camera.position[1] > belowRoof.route.position.height
      && belowRoof.camera.distance <= 10.001 && belowRoof.camera.polar >= 1.44,
    { before: beforeFraming.camera, after: belowRoof.camera, position: belowRoof.route.position });
    await capture(page, 'arcade-below-roof-day', true); await setLighting(page, 'night'); await capture(page, 'arcade-below-roof-night', true);
    await page.locator('#live-stage').focus(); await page.keyboard.press('Escape');
    await unchangedLegacy(page, 'arcade-regression-keeps-legacy-bytes');
  });

  if (only?.includes('bridge-review')) await section('bridge-review', async () => {
    const { source, sourceSha256 } = priorFullWalk();
    const remembered = source.savedViews.find(value => value.view.player.edgeId === 'authored:shijo-bridge-view-approach');
    if (!remembered) throw new Error('The actual completed bridge view is unavailable.');
    const initial = await scenario('river-startup-laziness');
    await enter(initial.page); await settled(initial.page);
    check('river-gzip-resources-stay-unrequested-at-original-startup', riverEncodedAssets.length > 0
      && !initial.record.requests.some(request => riverEncodedAssets.some(asset => [assetPath(asset), assetPath(asset.transport)].includes(request.path))),
    { cellIds: riverCells.map(cell => cell.id), encoded: riverEncodedAssets, observed: await observe(initial.page), requests: initial.record.requests });
    if (startupEncodedAssets.length) {
      const proof = compressedRequests(initial.record, startupEncodedAssets);
      check('bridge-review-startup-loads-verified-compressed-containers', proof.pass, proof);
    }
    await initial.context.close(); contexts.delete(initial.context);
    const poses = [{ id: 'bridge', view: remembered.view, sourceSavedView: remembered },
      ...['takase-river', 'pontocho-entrance'].map(id => {
        const screenshot = source.screenshots.find(value => value.file === 'outbound-' + id + '-day.png');
        if (!screenshot?.observed?.home?.currentView) throw new Error('The actual completed view is unavailable: ' + id);
        return { id, view: screenshot.observed.home.currentView, sourceScreenshot: screenshot.file };
      })];
    for (const pose of poses) {
      const reconstructed = sessionAt(pose.view);
      const { context, page, record } = await scenario(pose.id + '-review', {}, { storage: { [journeyKey]: JSON.stringify(reconstructed) } });
      record.restoration = { sourceReportSha256: sourceSha256, sourcePackageSha256: source.artifact.manifestSha256,
        sourceSavedView: pose.sourceSavedView, sourceScreenshot: pose.sourceScreenshot, sourceView: pose.view,
        reconstructedSession: reconstructed,
        description: 'Exact previously observed actual-walk pose, restored through a public journey session and production entry.' };
      await enter(page); await settled(page);
      check(pose.id + '-review-restores-exact-previously-walked-view', near((await home(page)).currentView, pose.view)
        && Boolean((await observe(page)).ground.hit), await observe(page));
      for (const mode of ['day', 'night']) {
        await setLighting(page, mode);
        await primaryFrameBudget(page, pose.id + '-' + mode);
        await capture(page, pose.id + '-prior-actual-pose-' + mode, true);
      }
      const loaded = riverEncodedAssets.filter(asset => record.requests.some(request => request.path === assetPath(asset.transport)));
      const proof = compressedRequests(record, loaded);
      check(pose.id + '-loads-verified-gzip-geometry-without-logical-network-fetches',
        loaded.some(asset => asset.transport.file.endsWith('.gltf.gz')) && loaded.some(asset => asset.transport.file.endsWith('.bin.gz'))
        && proof.pass,
      { bridgeCellIds: riverCells.map(cell => cell.id), loaded, proof,
        resources: resources(await observe(page)) });
      await unchangedLegacy(page, pose.id + '-review-keeps-legacy-bytes');
      await context.close(); contexts.delete(context);
    }
  });

  if (only?.includes('visual-review')) await section('visual-review', async () => {
    const { source, sourceSha256 } = priorFullWalk();
    const remembered = source.screenshots.find(value => value.file === 'outbound-nishiki-tenmangu-day.png');
    if (!remembered?.observed?.home?.currentView) throw new Error('The actual Tenmangu approach view is absent.');
    const positions = [
      { id: 'connector-e001-n000', pathIndex: 1, sampleIndex: 238, expected: [174.862, 1.987], purpose: 'Shijo road, curb and frontage continuity' },
      { id: 'connector-e002-n000', pathIndex: 1, sampleIndex: 465, expected: [261.695, 69.736], purpose: 'Takakura narrow approach and camera clearance' },
      { id: 'connector-e003-n001', pathIndex: 3, sampleIndex: 106, expected: [354.920, 140.262], purpose: 'Nishiki facade, soffit and enclosure continuity' },
      { id: 'connector-e004-n001', pathIndex: 3, sampleIndex: 221, expected: [450.175, 141.556], purpose: 'Nishiki facade, soffit and enclosure continuity' },
      { id: 'connector-e005-n001', pathIndex: 3, sampleIndex: 342, expected: [550.373, 143.356], purpose: 'Source-retained open cross-street gap' },
      { id: 'connector-e006-n000', pathIndex: 4, sampleIndex: 149, expected: [682.274, 69.952], purpose: 'Shinkyogoku southbound connection' },
      { id: 'connector-e007-n000', pathIndex: 4, sampleIndex: 407, expected: [749.921, 9.606], purpose: 'Shijo east connector depth and grounding' },
      { id: 'connector-e008-n000', pathIndex: 4, sampleIndex: 631, expected: [870.317, 35.079], purpose: 'Mapped crossing detour and raised street edges' },
    ];
    const poses = [{ id: 'nishiki-tenmangu', view: remembered.observed.home.currentView,
      sourceScreenshot: remembered.file, purpose: 'Recorded approach, roof clearance and west-side torii',
      framing: 'Recorded camera intent; subsequent native west-facing adjustment is recorded separately.' },
    ...positions.map(position => {
      const path = source.paths[position.pathIndex], sample = path?.samples[position.sampleIndex];
      const player = sample?.route?.position;
      const next = path?.samples.slice(position.sampleIndex + 1).find(value => value.route?.position
        && Math.hypot(value.route.position.x - player.x, value.route.position.y - player.y) > .1)?.route.position;
      if (!player || !next || !near([player.x, player.y], position.expected)) throw new Error('The recorded connector position differs: ' + position.id);
      const azimuth = Math.atan2(-(next.x - player.x), next.y - player.y);
      return { ...position, sourcePosition: player, nextSourcePosition: next,
        view: { version: 3, packId: geography.id, revision: geography.revision, player,
          camera: { azimuth, polar: 1.45, distance: 10, targetOffset: { x: 0, y: 0, height: 1.5 } } },
        framing: 'New authored review camera: follows the actual next recorded movement direction, distance10m, polar1.45, target height1.5m. The prior sample supplies position and edge identity only.' };
    })];
    for (const pose of poses) {
      const reconstructed = sessionAt(pose.view);
      const { context, page, record } = await scenario(pose.id + '-visual-review', {}, { storage: { [journeyKey]: JSON.stringify(reconstructed) } });
      record.restoration = { sourceReportSha256: sourceSha256, sourcePackageSha256: source.artifact.manifestSha256,
        sourceScreenshot: pose.sourceScreenshot, pathIndex: pose.pathIndex, sampleIndex: pose.sampleIndex,
        sourcePosition: pose.sourcePosition || pose.view.player, nextSourcePosition: pose.nextSourcePosition,
        view: pose.view, framing: pose.framing, purpose: pose.purpose, reconstructedSession: reconstructed,
        description: 'Previously walked position restored through a public journey session and production entry. This visual review does not repeat the full traversal.' };
      await enter(page); await settled(page);
      const ordinary = await cameraSettled(page, record, 'restored-ordinary-review');
      record.ordinaryRestored = ordinary;
      check(pose.id + '-visual-review-restores-recorded-position-and-declared-framing',
        near(ordinary.home.currentView, reconstructed.progress.view) && near(ordinary.route.position, pose.view.player)
        && Boolean(ordinary.ground.hit) && ordinary.ground.inside, ordinary);
      if (pose.id === 'nishiki-tenmangu') {
        const aimed = await aimWestAtTenmangu(page, record);
        const offset = new Vector3().fromArray(aimed.camera.position).sub(new Vector3().fromArray(aimed.camera.viewTarget));
        const azimuth = Math.atan2(offset.x, offset.z);
        const torii = new Vector3(662.042049, 2.5, -142.658582)
          .applyMatrix4(new Matrix4().fromArray(aimed.camera.matrixWorld).invert())
          .applyMatrix4(new Matrix4().fromArray(aimed.camera.projectionMatrix)).toArray();
        check('tenmangu-native-westward-framing-keeps-player-and-brings-source-torii-into-frustum',
          near(ordinary.route.position, aimed.route.position) && Math.abs(azimuth - Math.PI / 2) <= .081
          && torii.every(Number.isFinite) && torii.every(value => Math.abs(value) < 1),
        { sourcePoint: { id: 'osm:node:5204263033', x: 662.042049, y: 142.658582, reviewHeight: 2.5 },
          projection: torii, ordinary: ordinary.camera, adjusted: aimed.camera, inputs: record.reviewInputs,
          limitation: 'Frustum inclusion is geometric evidence; art review evaluates visible source geometry and occlusion.' });
      }
      const matchingView = (await observe(page)).home.currentView;
      for (const mode of ['day', 'night']) {
        await setLighting(page, mode); await settled(page);
        await primaryFrameBudget(page, pose.id + '-visual-' + mode);
        const actual = await cameraSettled(page, record, 'visual-review-' + mode), actor = actorProjection(actual);
        check(pose.id + '-visual-' + mode + '-keeps-view-grounded-actor-and-camera-clearance',
          near(actual.home.currentView, matchingView) && near(actual.route.position, pose.view.player)
          && Boolean(actual.ground.hit) && actual.ground.inside && actor.actualDistance >= 5 - .003
          && actor.verticalOccupancy <= .5 && actor.points.every(point => point.every(Number.isFinite)
            && Math.abs(point[0]) < 1 && Math.abs(point[1]) < 1 && point[2] > -1 && point[2] < 1),
        { actor, actual, reviewView: matchingView });
        await capture(page, pose.id + '-review-' + mode, true);
      }
      await unchangedLegacy(page, pose.id + '-visual-review-keeps-legacy-bytes');
      await context.close(); contexts.delete(context);
    }
  });

  if (only?.includes('tenmangu-framing')) await section('tenmangu-framing', async () => {
    const sourceBytes = gunzipSync(readFileSync(new URL('../evidence/neighborhood-20261023/qa/candidate-6-visual-review/neighborhood-result.json.gz', import.meta.url)));
    const sourceSha256 = sha(sourceBytes);
    if (sourceSha256 !== '897b1ceaf5a4ec1f9305704423b141397e049ba4b1a032acd07d998ccaef230b') throw new Error('The retained Tenmangu visual record differs.');
    const source = JSON.parse(sourceBytes), previous = source.scenarios['nishiki-tenmangu-visual-review'];
    const remembered = source.screenshots.find(value => value.file === 'nishiki-tenmangu-review-day-canvas.png');
    if (!remembered?.observed?.home?.currentView) throw new Error('The recorded Tenmangu view is unavailable.');
    retainHistoricalGeography(source);
    const view = remembered.observed.home.currentView, reconstructed = sessionAt(view);
    const { page, record } = await scenario('tenmangu-native-framing', {}, { storage: { [journeyKey]: JSON.stringify(reconstructed) } });
    record.restoration = { sourceReportSha256: sourceSha256, sourcePackageSha256: source.artifact.manifestSha256,
      sourceScreenshot: remembered.file, earlierRestoration: previous.restoration, view, reconstructedSession: reconstructed,
      description: 'Same prior-walk player position and actual camera intent produced by the preceding native-input review; restored through a public session.' };
    function framing(value) {
      const actor = actorProjection(value);
      const point = new Vector3(662.042049, 2.5, -142.658582)
        .applyMatrix4(new Matrix4().fromArray(value.camera.matrixWorld).invert())
        .applyMatrix4(new Matrix4().fromArray(value.camera.projectionMatrix)).toArray();
      const safe = actor.actualDistance >= 5 - .003 && actor.verticalOccupancy <= .5
        && actor.points.every(coordinate => coordinate.every(Number.isFinite)
          && Math.abs(coordinate[0]) < 1 && Math.abs(coordinate[1]) < 1 && Math.abs(coordinate[2]) < 1);
      return { actor, point, safe, toriiInFrame: point.every(Number.isFinite)
        && Math.abs(point[0]) <= .75 && Math.abs(point[1]) <= .8 && Math.abs(point[2]) < 1,
      sourcePoint: { id: 'osm:node:5204263033', x: 662.042049, y: 142.658582, reviewHeight: 2.5 },
      limitation: 'Frustum and actor checks establish composition bounds; art review separately evaluates actual torii visibility and occlusion.' };
    }
    await enter(page); await settled(page);
    const ordinary = await cameraSettled(page, record, 'restored-prior-native-view');
    check('tenmangu-followup-restores-exact-native-view-and-prior-walk-position', near(ordinary.home.currentView, view)
      && near(ordinary.route.position, view.player) && framing(ordinary).safe, ordinary);
    record.ordinary = ordinary;
    await page.locator('#solo-inspect').click(); await page.locator('#live-stage').focus();
    const entered = await cameraSettled(page, record, 'inspection-entry');
    check('tenmangu-inspection-entry-preserves-rendered-recovered-composition',
      near(entered.camera.matrixWorld, ordinary.camera.matrixWorld, .00001) && near(entered.home.currentView, ordinary.home.currentView),
    { before: ordinary.camera, after: entered.camera });
    record.inputs = [];
    let adjusted = entered;
    for (let index = 0; index < 8; index++) {
      const current = framing(adjusted);
      if (current.safe && current.toriiInFrame) break;
      if (!current.safe) { record.stoppedBecause = 'Actual camera or actor left the unchanged review limits.'; break; }
      const before = adjusted;
      await page.keyboard.press('j');
      await page.waitForFunction(frame => window.__TOUR_GAME__.renderer().updateFrames > frame, before.renderer.updateFrames);
      adjusted = await cameraSettled(page, record, 'native-j-' + (index + 1));
      record.inputs.push({ key: 'j', before, after: adjusted, framing: framing(adjusted) }); persist();
    }
    const inspected = framing(adjusted);
    check('tenmangu-small-native-orbit-includes-source-point-with-complete-actor-and-clearance',
      inspected.safe && inspected.toriiInFrame && near(adjusted.route.position, ordinary.route.position),
    { framing: inspected, observed: adjusted, inputs: record.inputs, stoppedBecause: record.stoppedBecause });
    const inspectionView = adjusted.home.currentView;
    for (const mode of ['day', 'night']) {
      await setLighting(page, mode); await settled(page);
      const actual = await cameraSettled(page, record, 'inspection-' + mode);
      check('tenmangu-inspection-' + mode + '-preserves-native-pose-and-source-framing',
        near(actual.home.currentView, inspectionView) && near(actual.route.position, ordinary.route.position)
        && framing(actual).safe && framing(actual).toriiInFrame,
      { observed: actual, framing: framing(actual), resources: resources(actual) });
      await capture(page, 'tenmangu-native-inspection-' + mode, true);
    }
    await page.locator('#live-stage').focus(); await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.__TOUR_GAME__.inspection().enabled);
    for (const mode of ['day', 'night']) {
      await setLighting(page, mode); await settled(page);
      await primaryFrameBudget(page, 'tenmangu-native-walking-' + mode);
      const actual = await cameraSettled(page, record, 'walking-' + mode);
      check('tenmangu-walking-' + mode + '-keeps-complete-actor-source-framing-and-ground',
        near(actual.route.position, ordinary.route.position) && framing(actual).safe && framing(actual).toriiInFrame
        && Boolean(actual.ground.hit) && actual.ground.inside,
      { observed: actual, framing: framing(actual), inspectionView, resources: resources(actual) });
      await capture(page, 'tenmangu-native-walking-' + mode, true);
    }
    await unchangedLegacy(page, 'tenmangu-native-framing-keeps-legacy-bytes');
  });

  if (only?.includes('arcade-inspection')) await section('arcade-inspection', async () => {
    const { sourceSha256, visited } = priorArcadeInterior();
    const reconstructed = sessionAt(visited.home.currentView);
    const { page, record } = await scenario('arcade-inspection', {}, { storage: { [journeyKey]: JSON.stringify(reconstructed) } });
    record.restoration = { sourceReportSha256: sourceSha256, sourceView: visited.home.currentView, reconstructedSession: reconstructed };
    record.inspectionInputs = []; record.inspectionAttempts = [];
    await enter(page); await settled(page);
    await page.waitForFunction(() => !window.__TOUR_GAME__.camera().obstruction?.settling);
    const initial = await observe(page);
    await page.locator('#solo-inspect').click(); await page.locator('#live-stage').focus();
    let selected = null;
    for (const pose of [
      { name: 'ordinary-composition', keys: [] },
      { name: 'east-below-soffit', keys: [], aim: true },
      { name: 'toward-visible-left-frontage', keys: [['Shift+j', 2], ['Shift+i', 2]] },
    ]) {
      if (pose.aim) record.inspectionInputs.push(...await aimAlongArcade(page, 'deliberate-arcade-framing'));
      for (const [key, count] of pose.keys) {
        for (let index = 0; index < count; index++) await page.keyboard.press(key);
        record.inspectionInputs.push({ key, count, pose: pose.name });
      }
      await page.waitForFunction(() => !window.__TOUR_GAME__.camera().transitioning && !window.__TOUR_GAME__.camera().obstruction?.settling);
      await capture(page, 'inspection-' + pose.name, true);
      await page.locator('#live-stage canvas').scrollIntoViewIfNeeded();
      const bounds = await page.locator('#live-stage canvas').boundingBox();
      for (const [x, y] of [[.25, .08], [.4, .08], [.12, .25], [.25, .3], [.4, .4], [.7, .3], [.6, .15], [.5, .5]]) {
        const before = await observe(page);
        await page.mouse.move(bounds.x + x * bounds.width, bounds.y + y * bounds.height);
        await page.waitForFunction(frame => window.__TOUR_GAME__.renderer().updateFrames > frame, before.renderer.updateFrames);
        const current = await observe(page), inspection = await page.evaluate(() => window.__TOUR_GAME__.inspection());
        record.inspectionAttempts.push({ pose: pose.name, pointer: { x, y, bounds }, inspection, current }); persist();
        if (inspection.focus?.id !== 'shijo-east:nishiki-market') continue;
        await page.mouse.click(bounds.x + x * bounds.width, bounds.y + y * bounds.height);
        await page.waitForFunction(() => Boolean(window.__TOUR_GAME__.inspection().selected));
        selected = await page.evaluate(() => window.__TOUR_GAME__.inspection().selected);
        await capture(page, 'inspection-selected-' + pose.name, true);
        break;
      }
      if (selected) break;
    }
    const actual = await observe(page);
    check('deliberate-arcade-framing-selects-the-actual-market-source-surface', selected?.id === 'shijo-east:nishiki-market'
      && near(initial.route.position, actual.route.position),
    { selected, positionBefore: initial.route.position, positionAfter: actual.route.position,
      inputs: record.inspectionInputs, attempts: record.inspectionAttempts.length,
      visibleHelp: { inspection: await page.locator('#solo-hint').textContent(), preview: await page.locator('#view-guidance').textContent() } });
    await unchangedLegacy(page, 'deliberate-inspection-keeps-legacy-bytes');
  });

  if (only?.includes('recovered-keyboard')) await section('recovered-keyboard', async () => {
    const { sourceSha256, visited } = priorArcadeInterior();
    const reconstructed = sessionAt(visited.home.currentView);
    const { page, record } = await scenario('recovered-keyboard', {}, { storage: { [journeyKey]: JSON.stringify(reconstructed) } });
    record.restoration = { sourceReportSha256: sourceSha256, sourceView: visited.home.currentView, reconstructedSession: reconstructed };
    record.keyboardInputs = [];
    await enter(page); await settled(page);
    await page.waitForFunction(() => !window.__TOUR_GAME__.camera().obstruction?.settling);
    const remembered = await keep(page, 'Actual arcade camera', 'Keyboard direction regression · 实际画面方向');
    const navigation = createRouteNavigation(geography.navigation);
    for (const key of ['ArrowUp', 'ArrowRight']) {
      await reopen(page, remembered);
      await page.waitForFunction(() => !window.__TOUR_GAME__.camera().obstruction?.settling);
      await page.locator('#live-stage').focus();
      const before = await observe(page), matrix = before.camera.matrixWorld;
      const basis = key === 'ArrowUp' ? { x: -matrix[8], y: matrix[10] } : { x: matrix[0], y: -matrix[2] };
      const length = Math.hypot(basis.x, basis.y); basis.x /= length; basis.y /= length;
      const actualAzimuth = Math.atan2(matrix[8], matrix[10]);
      const yawDifference = Math.abs(Math.atan2(Math.sin(actualAzimuth - before.camera.azimuth), Math.cos(actualAzimuth - before.camera.azimuth)));
      const start = before.route.position;
      const projected = navigation.project(start.x + basis.x * .9, start.y + basis.y * .9, start);
      const expected = { x: projected.x - start.x, y: projected.y - start.y };
      const samples = [], started = Date.now();
      await page.keyboard.down(key);
      try {
        while (Date.now() - started < 10000) {
          const current = await observe(page);
          samples.push({ elapsedMs: Date.now() - started, route: current.route, ground: current.ground,
            camera: current.camera, tick: current.state.tick });
          if (Math.hypot(current.route.position.x - start.x, current.route.position.y - start.y) >= .2) break;
          await page.waitForTimeout(50);
        }
      } finally { await page.keyboard.up(key); }
      await page.waitForFunction(() => !window.__TOUR_GAME__.snapshot().moving);
      const after = await observe(page), delta = { x: after.route.position.x - start.x, y: after.route.position.y - start.y };
      const distance = Math.hypot(delta.x, delta.y), expectedLength = Math.hypot(expected.x, expected.y);
      const directionCosine = (delta.x * expected.x + delta.y * expected.y) / (distance * expectedLength);
      const evidence = { key, basis, projected, expected, yawDifference, delta, distance, directionCosine, before, after, samples };
      record.keyboardInputs.push(evidence);
      check('recovered-camera-' + key + '-uses-rendered-ground-direction',
        before.camera.obstruction.active && yawDifference > Math.PI / 4 && distance >= .15 && directionCosine > .85
        && samples.every(value => value.ground.inside && value.ground.hit)
        && near(before.camera.azimuth, after.camera.azimuth, .00001)
        && near(before.camera.polar, after.camera.polar, .00001) && near(before.camera.distance, after.camera.distance, .00001), evidence);
    }
    await unchangedLegacy(page, 'rendered-direction-input-keeps-legacy-bytes');
  });

  if (only?.includes('recovered-camera-input')) await section('recovered-camera-input', async () => {
    const { sourceSha256, visited } = priorArcadeInterior();
    const reconstructed = sessionAt(visited.home.currentView);
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const { context, page, record } = await scenario('recovered-camera-input-' + reducedMotion, {},
        { storage: { [journeyKey]: JSON.stringify(reconstructed) }, context: { reducedMotion, hasTouch: true } });
      record.restoration = { sourceReportSha256: sourceSha256, sourceView: visited.home.currentView, reconstructedSession: reconstructed };
      await enter(page); await settled(page);
      await cameraSettled(page, record, 'initial-restoration');
      await page.evaluate(() => {
        window.__NEIGHBORHOOD_INPUT_EVENTS__ = [];
        const stage = document.querySelector('#live-stage');
        for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchmove', 'wheel', 'keydown']) {
          stage.addEventListener(type, event => window.__NEIGHBORHOOD_INPUT_EVENTS__.push({ type: event.type,
            trusted: event.isTrusted, pointerType: event.pointerType ?? null, pointerId: event.pointerId ?? null,
            button: event.button ?? null, buttons: event.buttons ?? null, x: event.clientX ?? null,
            y: event.clientY ?? null, touches: event.touches?.length ?? null, code: event.code ?? null,
            deltaY: event.deltaY ?? null }), { capture: true, passive: true });
        }
      });
      const remembered = await keep(page, 'Rendered arcade framing', 'Actual pointer and wheel input');
      for (const operation of ['click', 'touch-tap', 'middle-horizontal', 'three-finger', 'wheel', 'drag', 'keyboard']) {
        await reopen(page, remembered);
        const beforeEntry = await cameraSettled(page, record, operation + '-restoration');
        await page.locator('#solo-inspect').click();
        await page.locator('#live-stage canvas').scrollIntoViewIfNeeded();
        const bounds = await page.locator('#live-stage canvas').boundingBox(), before = await cameraSettled(page, record, operation + '-entry');
        check(reducedMotion + '-' + operation + '-inspection-entry-preserves-rendered-and-saved-pose',
          near(beforeEntry.camera.matrixWorld, before.camera.matrixWorld, .00001)
          && near(beforeEntry.home.currentView, before.home.currentView, .00001) && before.camera.inspectionAimed === false,
        { beforeEntry, before });
        const x = bounds.x + bounds.width * .5, y = bounds.y + bounds.height * .5;
        await page.mouse.move(x, y);
        await page.evaluate(() => { window.__NEIGHBORHOOD_INPUT_EVENTS__.length = 0; });
        if (operation === 'click') await page.mouse.click(x, y);
        if (operation === 'touch-tap') await page.touchscreen.tap(x, y);
        if (operation === 'middle-horizontal') {
          await page.mouse.down({ button: 'middle' });
          await page.mouse.move(x + 12, y, { steps: 3 });
          await page.mouse.up({ button: 'middle' });
        }
        if (operation === 'three-finger') {
          const cdp = await context.newCDPSession(page);
          const points = shift => [-24, 0, 24].map((offset, index) => ({ x: x + offset + shift, y,
            radiusX: 2, radiusY: 2, force: 1, id: index + 1 }));
          try {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(0) });
            for (const shift of [4, 8, 12]) {
              await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(shift) });
              await page.waitForTimeout(40);
            }
          } finally {
            await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await cdp.detach();
          }
        }
        if (operation === 'wheel') await page.mouse.wheel(0, -40);
        if (operation === 'drag') {
          await page.mouse.down(); await page.mouse.move(x + 12, y, { steps: 3 }); await page.mouse.up();
        }
        if (operation === 'keyboard') { await page.locator('#live-stage').focus(); await page.keyboard.press('j'); }
        await page.waitForFunction(frame => window.__TOUR_GAME__.renderer().updateFrames > frame, before.renderer.updateFrames);
        const after = await cameraSettled(page, record, operation + '-input'), renderedDistance = actorProjection(before).actualDistance;
        const inputEvents = await page.evaluate(() => window.__NEIGHBORHOOD_INPUT_EVENTS__);
        const offset = new Vector3().fromArray(before.camera.position).sub(new Vector3().fromArray(before.camera.viewTarget));
        const actualAzimuth = Math.atan2(offset.x, offset.z), actualPolar = Math.acos(offset.y / offset.length());
        const keyboardDelta = Math.atan2(Math.sin(after.camera.azimuth - actualAzimuth + .08),
          Math.cos(after.camera.azimuth - actualAzimuth + .08));
        const preservesPose = ['click', 'touch-tap', 'middle-horizontal', 'three-finger'].includes(operation);
        const unchangedPose = near(before.camera.position, after.camera.position, .00001)
          && near(before.camera.viewTarget, after.camera.viewTarget, .00001)
          && near(before.home.currentView, after.home.currentView, .00001) && after.camera.inspectionAimed === false
          && !after.route.destination && !after.state.moving;
        const middleStart = inputEvents.find(event => event.type === 'pointerdown' && event.button === 1);
        const delivered = inputEvents.length > 0 && inputEvents.every(event => event.trusted)
          && (operation !== 'touch-tap' || inputEvents.some(event => event.type === 'pointerup' && event.pointerType === 'touch'))
          && (operation !== 'middle-horizontal' || middleStart && inputEvents.some(event => event.type === 'pointermove' && event.buttons === 4
            && event.x > middleStart.x && event.y === middleStart.y))
          && (operation !== 'three-finger' || new Set(inputEvents.filter(event => event.type === 'pointerdown'
            && event.pointerType === 'touch').map(event => event.pointerId)).size === 3
            && inputEvents.some(event => event.type === 'touchmove' && event.touches === 3));
        const adjusted = after.camera.inspectionAimed === true && near(after.camera.target, before.camera.viewTarget)
          && (operation === 'wheel' ? after.camera.distance < renderedDistance && after.camera.distance > renderedDistance * .75
            : near(after.camera.distance, renderedDistance))
          && (operation !== 'keyboard' || Math.abs(keyboardDelta) < .003 && near(after.camera.polar, actualPolar));
        check(reducedMotion + '-recovered-camera-native-' + operation + '-keeps-continuous-visible-origin',
          delivered && before.camera.obstruction.active && near(before.route.position, after.route.position)
          && (preservesPose ? unchangedPose : adjusted),
        { operation, reducedMotion, bounds, pointer: { x, y }, wheelDeltaY: operation === 'wheel' ? -40 : null,
          dragPixels: ['drag', 'middle-horizontal', 'three-finger'].includes(operation) ? 12 : null,
          key: operation === 'keyboard' ? 'j' : null, inputEvents,
          renderedDistance, actualAzimuth, actualPolar, keyboardDelta, before, after });
        if (operation === 'touch-tap') {
          for (const locale of ['en', 'zh']) {
            await page.locator('#locale-' + locale).tap();
            await page.waitForFunction(expected => document.documentElement.lang === expected, locale);
            const help = await page.locator('#solo-hint').evaluate(element => ({ text: element.textContent,
              bounds: element.getBoundingClientRect().toJSON(), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
              clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
            const localized = await observe(page);
            check(reducedMotion + '-' + locale + '-touch-inspection-help-explains-stationary-mode',
              help.text.includes(locale === 'en' ? 'Choose Keep walking to move' : '选择“继续漫步”后行走')
              && help.bounds.width > 0 && help.bounds.height > 0 && help.scrollWidth <= help.clientWidth + 1
              && help.scrollHeight <= help.clientHeight + 1 && localized.home.touchControls === true
              && near(localized.route.position, before.route.position, .00001), { help, observed: localized });
            await capture(page, 'native-inspection-help-' + reducedMotion + '-' + locale);
          }
          await page.locator('#locale-en').tap();
          await page.waitForFunction(() => document.documentElement.lang === 'en');
        }
        await page.locator('#live-stage').focus(); await page.keyboard.press('Escape');
        if (operation === 'click' || operation === 'touch-tap') {
          const walking = await cameraSettled(page, record, operation + '-leave-inspection');
          const walkingBounds = await page.locator('#live-stage canvas').boundingBox();
          check(reducedMotion + '-' + operation + '-escape-preserves-the-same-ground-ray',
            near(walking.camera.matrixWorld, after.camera.matrixWorld, .00001)
            && near(walking.camera.projectionMatrix, after.camera.projectionMatrix, .00001)
            && near(walking.route.position, after.route.position, .00001)
            && walkingBounds.width === bounds.width && walkingBounds.height === bounds.height
            && !walking.camera.inspecting,
          { before: after.camera, after: walking.camera, bounds, walkingBounds });
          const walkX = walkingBounds.x + walkingBounds.width * .5, walkY = walkingBounds.y + walkingBounds.height * .5;
          if (operation === 'touch-tap') await page.touchscreen.tap(walkX, walkY);
          else await page.mouse.click(walkX, walkY);
          const commanded = await observe(page);
          const arrived = await boundedWalk(page, reducedMotion + '-' + operation + '-same-ground-after-escape', value => !value.route.destination
            && !value.state.moving && Math.hypot(value.route.position.x - walking.route.position.x,
              value.route.position.y - walking.route.position.y) >= .15);
          check(reducedMotion + '-' + operation + '-same-ground-navigates-after-escape',
            Boolean(commanded.route.goal || commanded.route.destination) && arrived.ground.inside && Boolean(arrived.ground.hit)
            && Math.hypot(arrived.route.position.x - walking.route.position.x, arrived.route.position.y - walking.route.position.y) >= .15,
          { pointer: { x: walkX, y: walkY }, before: walking, commanded, arrived });
        }
      }
      await page.locator('#preview-reset').click(); await cameraSettled(page, record, 'explicit-reset');
      await setLighting(page, 'night'); await settled(page);
      const beforeHide = await cameraSettled(page, record, 'before-hide');
      await page.locator('#mode-together').click();
      const hidden = await observe(page), requests = record.requests.filter(value => value.path.startsWith(prefix)).length;
      await page.waitForTimeout(2000); const afterHidden = await observe(page);
      check(reducedMotion + '-recovered-camera-hidden-has-zero-work-and-section-requests',
        hidden.stream.suspended && afterHidden.stream.suspended
        && hidden.renderer.updateFrames === afterHidden.renderer.updateFrames
        && hidden.renderer.renderedFrames === afterHidden.renderer.renderedFrames
        && requests === record.requests.filter(value => value.path.startsWith(prefix)).length,
      { hidden, afterHidden, requests });
      await page.locator('#mode-explore').click(); await ready(page, geography.id, 'night');
      const resumed = await cameraSettled(page, record, 'visible-resume');
      check(reducedMotion + '-recovered-camera-resumes-saved-pose-and-night-lighting',
        near(beforeHide.home.currentView, resumed.home.currentView) && resumed.renderer.lighting.mode === 'night'
        && actorProjection(resumed).actualDistance >= 5 && actorProjection(resumed).verticalOccupancy <= .5,
      { beforeHide, resumed, projection: actorProjection(resumed) });
      await unchangedLegacy(page, reducedMotion + '-native-camera-input-keeps-legacy-bytes');
      await context.close(); contexts.delete(context);
    }
  });

  if (only?.includes('canopy-review')) await section('canopy-review', async () => {
    const { source, sourceSha256 } = priorVisualReview();
    const sourceAuditBytes = readFileSync(new URL('../evidence/neighborhood-20261023/world/shinkyogoku-context/source-audit.json', import.meta.url));
    const referenceBytes = readFileSync(new URL('../evidence/neighborhood-20261023/world/shinkyogoku-context/reference-review.json', import.meta.url));
    const sourceAudit = JSON.parse(sourceAuditBytes), reference = JSON.parse(referenceBytes);
    const materialResources = manifest.sharedResources.filter(value => value.file.includes('/shinkyogoku-panel-'));
    const cells = ['cell-e006-n000', 'cell-e006-n001'].map(id => {
      const cell = manifest.cells.find(value => value.id === id), descriptor = cell.near;
      const gltf = JSON.parse(assets.get(assetPath(descriptor)));
      const materialIndex = gltf.materials.findIndex(value => value.name === 'shinkyogoku-panel');
      return { id, file: descriptor.file, sha256: descriptor.sha256, materialIndex,
        material: gltf.materials[materialIndex],
        usedPrimitiveCount: gltf.meshes.flatMap(mesh => mesh.primitives).filter(primitive => primitive.material === materialIndex).length };
    });
    const binding = { sourceIndex: 116, source: manifest.featureTable[116], sourceAuditSha256: sha(sourceAuditBytes),
      referenceReviewSha256: sha(referenceBytes), sourceRoof: { id: sourceAudit.roofWay.id, version: sourceAudit.roofWay.version },
      materialResources, cells,
      scope: 'Source-specific authored opaque canopy material. Prior player positions and desired cameras are restored. This check does not assert fresh torii recognition or measured roof construction.' };
    check('canopy-material-binds-reviewed-source-and-actual-packaged-resources',
      binding.source.sourceId === 'osm:way:551741577' && sourceAudit.status === 'pass'
        && sourceAudit.roofWay.id === 551741577 && reference.mappedRoofId === binding.source.sourceId
        && materialResources.length === 3 && cells.every(cell => cell.materialIndex >= 0 && cell.usedPrimitiveCount > 0), binding);
    for (const [id, sourceScreenshot] of [
      ['shinkyogoku-e006', 'connector-e006-n000-review-day-canvas.png'],
      ['tenmangu-recorded', 'nishiki-tenmangu-review-day-canvas.png'],
    ]) {
      const remembered = source.screenshots.find(value => value.file === sourceScreenshot);
      const view = remembered.observed.home.currentView, reconstructed = sessionAt(view);
      const { context, page, record } = await scenario('canopy-' + id, {}, { storage: { [journeyKey]: JSON.stringify(reconstructed) } });
      record.restoration = { sourceReportSha256: sourceSha256, sourcePackageSha256: source.artifact.manifestSha256,
        sourceScreenshot, view, reconstructedSession: reconstructed,
        description: 'Exact previously visited position and retained review-camera intent, restored through the public journey session.' };
      record.materialBinding = binding;
      await enter(page); await settled(page);
      check(id + '-canopy-restores-exact-prior-position-and-camera', near((await home(page)).currentView, view), await observe(page));
      const materialRequests = materialResources.map(resource => ({ ...resource,
        requested: record.requests.some(value => value.path === assetPath(resource)),
        finished: record.finishedRequests.includes(assetPath(resource)),
        response: record.responses.find(value => value.path === assetPath(resource) && value.status === 200) ?? null }));
      check(id + '-canopy-loads-real-reviewed-material-images', materialRequests.every(value => value.requested && value.finished && value.response), materialRequests);
      for (const mode of ['day', 'night']) {
        await setLighting(page, mode); await settled(page); await primaryFrameBudget(page, id + '-canopy-' + mode);
        const observed = await cameraSettled(page, record, id + '-canopy-' + mode);
        check(id + '-canopy-' + mode + '-keeps-exact-view-ground-and-actor', near(observed.home.currentView, view)
          && streetFraming(observed).safe && observed.ground.inside && Boolean(observed.ground.hit), observed);
        await capture(page, id + '-canopy-' + mode, true);
      }
      await unchangedLegacy(page, id + '-canopy-keeps-legacy-bytes');
      await context.close(); contexts.delete(context);
    }
  });

  if (only?.includes('platform-review')) await section('platform-review', async () => {
    const { source, sourceSha256 } = priorVisualReview();
    const remembered = source.screenshots.find(value => value.file === 'connector-e001-n000-review-day-canvas.png');
    const view = remembered.observed.home.currentView, reconstructed = sessionAt(view);
    const { page, record } = await scenario('platform-material-review', {}, { storage: { [journeyKey]: JSON.stringify(reconstructed) } });
    record.restoration = { sourceReportSha256: sourceSha256, sourcePackageSha256: source.artifact.manifestSha256,
      sourceScreenshot: remembered.file, view, reconstructedSession: reconstructed,
      description: 'Exact prior recorded connector position and authored review camera, restored for the source-specific structure/material change.' };
    await enter(page); await settled(page);
    check('platform-review-restores-exact-prior-position-and-review-camera', near((await home(page)).currentView, view), await observe(page));
    for (const mode of ['day', 'night']) {
      await setLighting(page, mode); await settled(page); await primaryFrameBudget(page, 'platform-' + mode);
      const observed = await cameraSettled(page, record, 'platform-' + mode);
      check('platform-' + mode + '-keeps-exact-view-ground-and-actor', near(observed.home.currentView, view)
        && streetFraming(observed).safe && observed.ground.inside && Boolean(observed.ground.hit), observed);
      await capture(page, 'platform-e001-prior-view-' + mode, true);
    }
  });

  if (only?.includes('western-approach')) await section('western-approach', async () => {
    const { source, sourceSha256 } = priorFullWalk();
    const remembered = source.screenshots.find(value => value.file === 'outbound-nishiki-tenmangu-day.png');
    const view = remembered.observed.home.currentView, reconstructed = sessionAt(view);
    const node = geography.navigation.nodes.find(value => value.id === 'osm:node:354840400');
    const torii = geography.navigation.nodes.find(value => value.id === 'osm:node:5204263033');
    if (!node || !torii) throw new Error('The source-reviewed western approach nodes are absent.');
    const navigation = createRouteNavigation(geography.navigation), path = navigation.path(view.player, node);
    if (!path || !Number.isFinite(path.distanceMeters) || path.distanceMeters < 29 || path.distanceMeters > 30) throw new Error('The recorded eastern approach is not connected to the proposed western node.');
    const { page, record } = await scenario('tenmangu-western-walk', {}, { storage: { [journeyKey]: JSON.stringify(reconstructed) } });
    record.restoration = { sourceReportSha256: sourceSha256, sourcePackageSha256: source.artifact.manifestSha256,
      sourceScreenshot: remembered.file, view, reconstructedSession: reconstructed,
      description: 'Recorded eastern approach restored; the western viewing pause is reached by subsequent actual UI walking.' };
    record.approach = { start: view.player, targetNode: node, toriiNode: torii, graphPath: path };
    await enter(page); await settled(page);
    check('western-review-starts-at-recorded-eastern-position', near((await home(page)).currentView, view), await observe(page));
    await focusSight(page, geography.sights.find(sight => sight.id === 'nishiki-market'));
    await boundedWalk(page, 'actual-westward-walk-through-source-torii-node', value => value.route.position.x <= node.x + 3);
    await page.locator('#journey-stop').click();
    await page.waitForFunction(() => !window.__TOUR_GAME__.route().goal && !window.__TOUR_GAME__.snapshot().moving);
    const stopped = await cameraSettled(page, record, 'stopped-near-western-node');
    record.approach.nearbyStop = stopped;
    await groundClick(page, node);
    const arrived = await boundedWalk(page, 'actual-ground-click-to-western-source-node', value => !value.route.destination
      && !value.state.moving && Math.hypot(value.route.position.x - node.x, value.route.position.y - node.y) < .15);
    await settled(page);
    check('western-source-node-is-reached-by-actual-controls', Math.hypot(arrived.route.position.x - node.x, arrived.route.position.y - node.y) < .15
      && Math.hypot(arrived.route.position.x - view.player.x, arrived.route.position.y - view.player.y) > 29
      && Boolean(arrived.ground.hit) && arrived.ground.inside && streetFraming(arrived).safe,
    { start: view.player, node, stopped, arrived, graphPath: path });
    record.approach.arrived = arrived;
    await capture(page, 'tenmangu-western-arrival-ordinary-day', true);
    await page.locator('#solo-inspect').click(); await page.locator('#live-stage').focus();
    record.approach.cameraInputs = [];
    for (let step = 0; step < 40; step++) {
      const before = await observe(page), offset = new Vector3().fromArray(before.camera.position).sub(new Vector3().fromArray(before.camera.viewTarget));
      const actualAzimuth = Math.atan2(offset.x, offset.z);
      const intended = Math.atan2(-(torii.x - before.route.position.x), torii.y - before.route.position.y);
      const difference = Math.atan2(Math.sin(intended - actualAzimuth), Math.cos(intended - actualAzimuth));
      if (Math.abs(difference) <= .1) break;
      const key = difference < 0 ? 'j' : 'l';
      await page.keyboard.press(key);
      const after = await cameraSettled(page, record, 'western-orbit-' + step);
      record.approach.cameraInputs.push({ key, before, after }); persist();
      if (!streetFraming(after).safe) throw new Error('Native western-approach orbit exceeded the unchanged camera/actor bounds.');
    }
    for (let step = 0; step < 12; step++) {
      const before = await observe(page), offset = new Vector3().fromArray(before.camera.position).sub(new Vector3().fromArray(before.camera.viewTarget));
      if (Math.acos(offset.y / offset.length()) >= 1.43) break;
      await page.keyboard.press('k');
      const after = await cameraSettled(page, record, 'western-tilt-' + step);
      record.approach.cameraInputs.push({ key: 'k', before, after }); persist();
      if (!streetFraming(after).safe) throw new Error('Native western-approach tilt exceeded the unchanged camera/actor bounds.');
    }
    const aimed = await observe(page);
    check('western-native-framing-keeps-actual-arrived-position-and-street-scale', near(aimed.route.position, arrived.route.position)
      && streetFraming(aimed).safe, { arrived, aimed, framing: streetFraming(aimed) });
    // 选点来自当前 Torii 几何的匾额、横梁和柱面；浏览器必须命中实际来源网格。
    const surfaces = [{ name: 'plaque-west-face', x: torii.x - .32, y: torii.y, height: 3.74 },
      { name: 'upper-beam-west-face', x: torii.x - .19, y: torii.y, height: 4.05 },
      { name: 'north-post-west-face', x: torii.x - .23, y: torii.y + 2.15, height: 2.15 },
      { name: 'south-post-west-face', x: torii.x - .23, y: torii.y - 2.15, height: 2.15 }];
    record.approach.surfaceBasis = { generator: 'experience/art/neighborhood_landmarks.py',
      sha256: sha(readFileSync(new URL('../art/neighborhood_landmarks.py', import.meta.url))),
      sourceId: torii.sourceId, authoredDimensions: true, surfaces };
    record.approach.inspectionAttempts = [];
    let selected = null;
    await page.locator('#live-stage canvas').scrollIntoViewIfNeeded();
    for (const surface of surfaces) {
      const current = await observe(page), bounds = await page.locator('#live-stage canvas').boundingBox();
      const projected = new Vector3(surface.x, surface.height, -surface.y)
        .applyMatrix4(new Matrix4().fromArray(current.camera.matrixWorld).invert())
        .applyMatrix4(new Matrix4().fromArray(current.camera.projectionMatrix));
      if (Math.abs(projected.x) >= .98 || Math.abs(projected.y) >= .98 || Math.abs(projected.z) >= 1) {
        record.approach.inspectionAttempts.push({ surface, projected: projected.toArray(), reason: 'outside-actual-frustum' }); continue;
      }
      const x = bounds.x + (projected.x + 1) * bounds.width / 2, y = bounds.y + (1 - projected.y) * bounds.height / 2;
      await page.mouse.move(x, y);
      await page.waitForFunction(frame => window.__TOUR_GAME__.renderer().updateFrames > frame, current.renderer.updateFrames);
      const inspection = await page.evaluate(() => window.__TOUR_GAME__.inspection());
      record.approach.inspectionAttempts.push({ surface, projected: projected.toArray(), pointer: { x, y }, inspection }); persist();
      if (inspection.focus?.id !== 'shijo-east:nishiki-tenmangu') continue;
      await page.mouse.click(x, y);
      await page.waitForFunction(() => window.__TOUR_GAME__.inspection().selected?.id === 'shijo-east:nishiki-tenmangu');
      selected = await page.evaluate(() => window.__TOUR_GAME__.inspection().selected); break;
    }
    check('western-approach-selects-visible-actual-torii-source-geometry', selected?.id === 'shijo-east:nishiki-tenmangu'
      && near((await observe(page)).route.position, arrived.route.position),
    { selected, attempts: record.approach.inspectionAttempts, basis: record.approach.surfaceBasis });
    if (selected) await page.locator('#solo-close-detail').click();
    await page.locator('#live-stage').focus(); await page.keyboard.press('Escape');
    const matchedView = (await cameraSettled(page, record, 'western-walking-frame')).home.currentView;
    for (const mode of ['day', 'night']) {
      await setLighting(page, mode); await settled(page); await primaryFrameBudget(page, 'western-approach-' + mode);
      const actual = await cameraSettled(page, record, 'western-' + mode);
      check('western-approach-' + mode + '-retains-arrived-view-and-grounded-actor', near(actual.home.currentView, matchedView)
        && near(actual.route.position, arrived.route.position) && streetFraming(actual).safe && actual.ground.inside && Boolean(actual.ground.hit), actual);
      await capture(page, 'tenmangu-western-approach-' + mode, true);
    }
    await unchangedLegacy(page, 'western-approach-review-keeps-legacy-bytes');
  });

  await section('camera-safety', async () => {
    const { source, sourceSha256 } = priorVisualReview();
    const rememberedView = source.screenshots.find(value => value.file === 'nishiki-tenmangu-review-day-canvas.png').observed.home.currentView;
    const reconstructed = sessionAt(rememberedView);
    const operations = ['click', 'touch-tap', 'middle-horizontal', 'three-finger', 'keyboard-orbit', 'keyboard-tilt',
      'keyboard-zoom', 'drag', 'wheel', 'pinch', 'keyboard-pan', 'right-pan', 'touch-pan', 'touch-mixed'];
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const { context, page, record } = await scenario('tenmangu-camera-safety-' + reducedMotion, {},
        { storage: { [journeyKey]: JSON.stringify(reconstructed) }, context: { reducedMotion, hasTouch: true } });
      record.restoration = { sourceReportSha256: sourceSha256, sourcePackageSha256: source.artifact.manifestSha256,
        sourceScreenshot: 'nishiki-tenmangu-review-day-canvas.png', view: rememberedView, reconstructedSession: reconstructed,
        description: 'Exact previously walked position and recorded native camera intent. Camera safety is evaluated separately from torii recognition.' };
      await enter(page); await settled(page); await recordNativeInputs(page);
      const original = await cameraSettled(page, record, 'initial-tenmangu-view');
      check(reducedMotion + '-tenmangu-safety-restores-recorded-view', near(original.home.currentView, rememberedView)
        && streetFraming(original).safe && original.ground.inside && Boolean(original.ground.hit), original);
      const idleBefore = await observe(page), quietStarted = performance.now();
      await page.waitForTimeout(2000);
      const idleAfter = await observe(page), quietElapsedMs = performance.now() - quietStarted;
      const quiet = { elapsedMs: quietElapsedMs, before: idleBefore, after: idleAfter,
        updateDelta: idleAfter.renderer.updateFrames - idleBefore.renderer.updateFrames,
        drawDelta: idleAfter.renderer.renderedFrames - idleBefore.renderer.renderedFrames,
        shadowDelta: idleAfter.renderer.lighting.shadowUpdates - idleBefore.renderer.lighting.shadowUpdates };
      record.visibleIdle = quiet;
      check(reducedMotion + '-settled-visible-recovered-camera-stays-render-idle-for-two-seconds',
        quietElapsedMs >= 2000 && quiet.drawDelta === 0 && quiet.shadowDelta === 0
          && near(idleBefore.camera.matrixWorld, idleAfter.camera.matrixWorld, .00001)
          && near(idleBefore.home.currentView, idleAfter.home.currentView, .00001)
          && near(idleBefore.route.position, idleAfter.route.position) && !idleAfter.route.destination && !idleAfter.state.moving
          && equal(idleBefore.stream, idleAfter.stream)
          && idleBefore.renderer.lighting.phase === 'ready' && idleAfter.renderer.lighting.phase === 'ready'
          && !idleBefore.renderer.lighting.pendingRequests && !idleAfter.renderer.lighting.pendingRequests,
      quiet);
      const saved = await keep(page, 'Tenmangū camera safety · 相机检查', 'Private original view · 原有私人视角');
      await settled(page);
      const restoreBefore = await cameraSettled(page, record, 'before-same-view-resource-check');
      const requestStart = record.requests.length, httpStart = report.http.length;
      const sectionRequestPaths = new Set(manifest.cells.flatMap(cell => [cell.base, cell.near].filter(Boolean))
        .flatMap(descriptor => [descriptor, ...(descriptor.dependencies || [])]).map(requestAssetPath));
      await reopen(page, saved);
      await page.waitForFunction(() => window.__TOUR_GAME__.route().restoring === false);
      await settled(page);
      const restoreAfter = await cameraSettled(page, record, 'after-same-view-resource-check');
      const restoreRequests = record.requests.slice(requestStart).filter(request => sectionRequestPaths.has(request.path));
      const restoreHTTP = report.http.slice(httpStart).filter(request => sectionRequestPaths.has(request.path));
      const resourceFields = ['resourceCount', 'textureCount', 'retainedBytes', 'estimatedTextureBytes',
        'loadedBytes', 'decodedBytes', 'releasedModels', 'cancellations', 'residentCells', 'nearReservations'];
      const restoredResources = { before: restoreBefore, after: restoreAfter, requests: restoreRequests, http: restoreHTTP,
        differences: resourceFields.filter(key => restoreBefore.stream[key] !== restoreAfter.stream[key]) };
      record.sameViewRestore = restoredResources;
      check(reducedMotion + '-same-private-view-reopen-preserves-selection-heading-and-resident-sections',
        near(restoreBefore.home.currentView, restoreAfter.home.currentView)
          && near(restoreBefore.camera.matrixWorld, restoreAfter.camera.matrixWorld, .00001)
          && near(restoreBefore.route.position, restoreAfter.route.position)
          && near(restoreBefore.state.heading, restoreAfter.state.heading, .00001)
          && equal(restoreBefore.home.neighborhood.selected, restoreAfter.home.neighborhood.selected)
          && equal(restoreBefore.stream.cells, restoreAfter.stream.cells) && equal(restoreBefore.lifecycle, restoreAfter.lifecycle)
          && !restoreRequests.length && !restoreHTTP.length && !restoredResources.differences.length,
      restoredResources);
      record.inputCases = [];
      for (const operation of operations) {
        await reopen(page, saved);
        const walking = await cameraSettled(page, record, operation + '-restored');
        await page.locator('#solo-inspect').click();
        const before = await cameraSettled(page, record, operation + '-inspection-entry');
        check(reducedMotion + '-' + operation + '-tenmangu-entry-preserves-safe-visible-view',
          near(before.camera.matrixWorld, walking.camera.matrixWorld, .00001) && near(before.home.currentView, walking.home.currentView)
          && before.camera.inspectionPanned === false && streetFraming(before).safe,
        { walking, before, framing: streetFraming(before) });
        const settlingStart = record.cameraSettling.length;
        const action = await nativeCameraInput(page, context, operation);
        await page.waitForFunction(frame => window.__TOUR_GAME__.renderer().updateFrames > frame, before.renderer.updateFrames);
        const after = await cameraSettled(page, record, operation + '-native-result');
        const events = await page.evaluate(() => window.__NEIGHBORHOOD_INPUT_EVENTS__);
        const ignored = ['click', 'touch-tap', 'middle-horizontal', 'three-finger'].includes(operation);
        const purposefulPan = ['keyboard-pan', 'right-pan', 'touch-pan', 'touch-mixed'].includes(operation);
        const delivered = events.length > 0 && events.every(event => event.trusted)
          && (!['pinch', 'touch-pan', 'touch-mixed', 'three-finger'].includes(operation)
            || events.some(event => event.type === 'touchmove' && event.touches.length === (operation === 'three-finger' ? 3 : 2)))
          && (operation !== 'middle-horizontal' || events.some(event => event.type === 'pointermove' && event.buttons === 4))
          && (operation !== 'touch-tap' || events.some(event => event.type === 'pointerup' && event.pointerType === 'touch'));
        const sampledFrames = record.cameraSettling.slice(settlingStart).flatMap(value => value.samples).map(sample => ({
          updateFrames: sample.updateFrames, camera: sample.camera, framing: streetFraming({ route: before.route, camera: sample.camera }),
        }));
        const preserved = near(before.home.currentView, after.home.currentView, .00001)
          && near(before.camera.matrixWorld, after.camera.matrixWorld, .00001)
          && after.camera.inspectionAimed === false && after.camera.inspectionPanned === false;
        const adjusted = after.camera.inspectionAimed === true && !near(before.home.currentView.camera, after.home.currentView.camera, .00001);
        const panned = after.camera.inspectionPanned === true && !near(before.camera.viewTarget, after.camera.target, .00001);
        const controlled = purposefulPan ? adjusted && panned : after.camera.inspectionPanned === false
          && streetFraming(after).safe && sampledFrames.every(sample => sample.framing.safe) && (ignored ? preserved : adjusted);
        const evidence = { operation, reducedMotion, action, events, before, after, sampledFrames,
          ignored, purposefulPan, delivered, preserved, adjusted, panned, framing: streetFraming(after) };
        record.inputCases.push(evidence);
        check(reducedMotion + '-tenmangu-' + operation + '-honors-input-and-framing-scope',
          delivered && controlled && near(before.route.position, after.route.position) && !after.route.destination && !after.state.moving,
        evidence);
        if (operation === 'keyboard-orbit') {
          await page.locator('#live-stage').focus(); await page.keyboard.press('l');
          const reversed = await cameraSettled(page, record, 'reverse-away-from-wall');
          check(reducedMotion + '-tenmangu-orbit-can-reverse-away-from-wall', streetFraming(reversed).safe
            && new Vector3().fromArray(reversed.camera.position).distanceTo(new Vector3().fromArray(after.camera.position)) > .2
            && near(reversed.route.position, before.route.position), { after, reversed, framing: streetFraming(reversed) });
        }
        if (operation === 'pinch') {
          const touches = events.filter(event => event.type === 'touchmove').map(event => event.touches);
          const centers = touches.map(points => ({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2,
            span: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y) }));
          check(reducedMotion + '-symmetric-native-pinch-retains-actor-framing-policy', centers.length >= 3
            && centers.every(center => Math.abs(center.x - action.start.x) < .01 && Math.abs(center.y - action.start.y) < .01)
            && centers.at(-1).span < centers[0].span && after.camera.inspectionPanned === false
            && after.camera.distance > actorProjection(before).actualDistance && streetFraming(after).safe,
          { centers, before, after, events });
        }
        if (operation === 'keyboard-pan') {
          const aimed = await keep(page, 'Intentional façade view · 主动立面构图', 'Private pan note · 私人平移记录');
          check(reducedMotion + '-intentional-pan-saves-exact-camera-and-note', near(aimed.view, after.home.currentView)
            && aimed.note === 'Private pan note · 私人平移记录', { aimed, after });
          await page.locator('#live-stage').focus(); await page.keyboard.press('l');
          await cameraSettled(page, record, 'changed-before-panned-restore');
          await reopen(page, aimed);
          const restored = await cameraSettled(page, record, 'restored-deliberate-pan');
          check(reducedMotion + '-panned-view-reopens-exact-saved-intent', near(restored.home.currentView, aimed.view)
            && restored.camera.inspectionPanned === true && near(restored.camera.viewTarget, restored.camera.target),
          { aimed, restored });
          await capture(page, 'tenmangu-purposeful-pan-' + reducedMotion, true);
        }
        await page.locator('#live-stage').focus(); await page.keyboard.press('Escape');
        const returned = await cameraSettled(page, record, operation + '-return-to-walking');
        check(reducedMotion + '-' + operation + '-escape-restores-safe-walking-frame', streetFraming(returned).safe
          && !returned.camera.inspecting && returned.camera.inspectionPanned === false
          && near(returned.route.position, before.route.position) && Boolean(returned.ground.hit) && returned.ground.inside,
        { before, returned, framing: streetFraming(returned) });
      }
      await reopen(page, saved); await setLocale(page, 'zh');
      const beforeReload = await cameraSettled(page, record, 'before-native-reload');
      await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page); await settled(page);
      const reloaded = await cameraSettled(page, record, 'after-native-reload');
      check(reducedMotion + '-safe-camera-private-view-survives-localized-reload', near(beforeReload.home.currentView, reloaded.home.currentView)
        && (await kept(page)).places.some(value => value.id === saved.id && value.note === saved.note)
        && await page.locator('html').getAttribute('lang') === 'zh' && streetFraming(reloaded).safe,
      { beforeReload, reloaded, saved });
      await unchangedLegacy(page, reducedMotion + '-tenmangu-camera-safety-keeps-legacy-bytes');
      await context.close(); contexts.delete(context);
    }
  });

  check('no-page-exceptions-or-unexpected-network-origins', Object.values(report.scenarios).every(value => !value.pageErrors.length && !value.unexpectedOrigins.length),
    Object.fromEntries(Object.entries(report.scenarios).map(([name, value]) => [name, { pageErrors: value.pageErrors, unexpectedOrigins: value.unexpectedOrigins }])));
} finally {
  for (const context of contexts) await context.close(); await browser?.close(); await service?.close();
  report.finishedAt = new Date().toISOString(); report.summary = { passed: report.checks.filter(value => value.pass).length, failed: report.checks.filter(value => !value.pass).length };
  persist(); if (report.summary.failed) process.exitCode = 1;
}
