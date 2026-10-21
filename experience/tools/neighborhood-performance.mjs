import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus, totalmem, platform, release, arch } from 'node:os';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const help = `Usage: node experience/tools/neighborhood-performance.mjs [built-dist-directory]
Defaults: experience/dist; NEIGHBORHOOD_PERF_OUTPUT=artifacts/neighborhood-performance
EXPERIENCE_QA_CHROMIUM selects Chromium. See tools/neighborhood-performance.md.
Runs one cold entry, three warm reloads, actual keyboard/orbit inputs and a hidden-tab observation.
Schedule an exclusive browser window after the built neighborhood passes its startup/visual review.`;
if (process.argv.includes('--help')) { console.log(help); process.exit(0); }
const dist = resolve(repository, process.argv[2] || 'experience/dist');
const output = resolve(repository, process.env.NEIGHBORHOOD_PERF_OUTPUT || 'artifacts/neighborhood-performance');
if (!output.startsWith(join(repository, 'artifacts') + '/')) throw new Error('Performance output must be inside repository artifacts.');
const timeout = 120000, packId = 'shijo-east', prefix = '/assets/neighborhoods/shijo-east/';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = new Map();
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Build contains a symbolic link: ${path}`);
    if (entry.isDirectory()) collect(path);
    else if (entry.isFile()) files.set('/' + relative(dist, path).replaceAll('\\', '/'), readFileSync(path));
  }
}
collect(dist);
if (!files.has('/index.html') || !files.has(prefix + 'manifest.json')) throw new Error('A complete built neighborhood is required.');
const manifest = JSON.parse(files.get(prefix + 'manifest.json'));
if (manifest.id !== packId) throw new Error('Unexpected neighborhood manifest.');
const packageFiles = [...files].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const fileHashes = new Map(packageFiles.map(file => [file.path, file.sha256]));
mkdirSync(output, { recursive: true });
// Chromium 的本地 socket 使用短路径，并且所有临时内容保留在忽略的 artifacts 目录。
process.env.TMPDIR = join(repository, 'artifacts/tmp'); mkdirSync(process.env.TMPDIR, { recursive: true });
const proxyURL = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxy = proxyURL ? new URL(proxyURL) : null;
const report = {
  startedAt: new Date().toISOString(), driverSha256: sha(readFileSync(new URL(import.meta.url))),
  artifact: { directory: dist, manifestSha256: sha(JSON.stringify(packageFiles)), files: packageFiles,
    neighborhood: { id: manifest.id, revision: manifest.revision, manifestSha256: sha(files.get(prefix + 'manifest.json')) } },
  conditions: { viewport: [1440, 1000], dpr: 1, locale: 'en', lighting: 'day', headless: true,
    entries: 'One fresh-context cold navigation followed by three full-page reloads retaining HTTP cache and private state; no movement between these entries.',
    network: { transport: 'Actual loopback HTTP; immutable build bytes; no interception or content encoding',
      cdp: { latencyMs: 80, downloadBytesPerSecond: 1250000, uploadBytesPerSecond: 1250000 },
      externalProxyConfigured: Boolean(proxy), tlsVerification: true, api: 'No backend; /api requests return actual HTTP 404.' },
    input: 'Ten 300 ms walking key holds and ten 300 ms orbit key holds; each records automation dispatch, trusted browser event and changed-state/draw observation.',
    observation: 'Read-only runtime snapshots sampled on requestAnimationFrame; observer cost and skipped draw-counter increments are recorded.',
    hidden: 'Actual background tab; benchmark animation-frame observer is stopped before a 2-second runtime counter/CPU/network sample.',
    host: { platform: platform(), release: release(), arch: arch(), logicalCPUs: cpus().length,
      cpuModels: [...new Set(cpus().map(cpu => cpu.model))], memoryBytes: totalmem() },
    limitations: [
      'Software or cloud graphics cannot establish physical GPU or phone performance.',
      'Loopback HTTP with CDP throttling does not reproduce CDN compression, TLS connection setup or a physical WAN.',
      'First usable observation is readiness plus rendered ground and enabled controls; actual input is independently exercised after the entry measurements.',
      'Response means first changed simulation/camera state with a newer submitted draw; physical display presentation is unmeasured.',
      'Input and frame observations cover the starting neighborhood segment; the complete-route correctness walkthrough remains separate.',
      'Q03 uses its existing homepage driver and threshold; this report does not replace or close it.',
    ] },
  entries: [], interactions: null, interactionNetwork: [], hidden: null, http: [], checks: [], errors: [],
};
const save = () => writeFileSync(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
const check = (id, pass, evidence) => { report.checks.push({ id, pass: Boolean(pass), evidence }); save(); };
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const server = createServer((request, response) => {
  const started = performance.now(); let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end(); return; }
  const path = pathname === '/' ? '/index.html' : pathname;
  const bytes = files.get(path), record = { path, method: request.method, at: new Date().toISOString(), status: 0, bodyBytes: 0 };
  report.http.push(record);
  response.on('finish', () => { record.durationMs = performance.now() - started; });
  if (!['GET', 'HEAD'].includes(request.method)) { record.status = 405; response.writeHead(405).end(); return; }
  if (!bytes) { record.status = 404; response.writeHead(404, { 'Cache-Control': 'no-store' }).end('Not found'); return; }
  const etag = '"' + fileHashes.get(path) + '"';
  response.setHeader('ETag', etag);
  response.setHeader('Cache-Control', path.endsWith('.html') ? 'no-cache' : 'public, max-age=3600, immutable');
  response.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream');
  if (request.headers['if-none-match'] === etag) { record.status = 304; response.writeHead(304).end(); return; }
  record.status = 200; record.bodyBytes = request.method === 'HEAD' ? 0 : bytes.length;
  response.setHeader('Content-Length', bytes.length); response.writeHead(200); response.end(request.method === 'HEAD' ? undefined : bytes);
});

function installObserver(expectedPack) {
  const trace = { firstUsable: null, actions: [], observerWorkMs: [], frameCounterGaps: [] };
  let frame, observing = true, active = null;
  const sample = () => {
    const game = window.__TOUR_GAME__;
    if (!game || game.pack().packId !== expectedPack) return null;
    const renderer = game.renderer(), state = game.snapshot(), camera = game.camera(), route = game.route();
    return { position: { x: state.x, y: state.y, height: state.height, edgeId: state.edgeId, edgeDistance: state.edgeDistance },
      paused: state.paused, tick: state.tick,
      camera: { azimuth: camera.azimuth, polar: camera.polar, distance: camera.distance, enabled: camera.enabled },
      renderedFrames: renderer.renderedFrames, updateFrames: renderer.updateFrames,
      status: renderer.status, visible: renderer.visible, lightingPhase: renderer.lighting.phase,
      restoring: route?.restoring, blocked: route?.blocked, startup: renderer.startup };
  };
  function observe() {
    if (!observing) return;
    const start = performance.now(), value = sample(), now = performance.now();
    if (value && !trace.firstUsable && value.status === 'ready' && value.renderedFrames > 0 && value.visible
      && value.lightingPhase === 'ready' && !value.paused && value.camera.enabled && !value.restoring && !value.blocked
      && !window.__HOME__?.snapshot().neighborhood?.busy) {
      const ground = window.__TOUR_GAME__.grounding();
      if (ground.inside && ground.hit) trace.firstUsable = { observedMs: now, state: value, ground };
    }
    if (value && active?.browserInput && !active.finished) {
      const moved = Math.hypot(value.position.x - active.before.position.x, value.position.y - active.before.position.y) > .001;
      const turned = Math.abs(value.camera.azimuth - active.before.camera.azimuth) > .00001;
      if (!active.response && (active.kind === 'walk' ? moved : turned) && value.renderedFrames > active.before.renderedFrames) {
        active.response = { observedMs: now, eventToResponseMs: now - active.browserInput.receivedMs,
          dispatchToResponseMs: now - active.dispatchStartMs, state: value };
      }
      if (value.renderedFrames !== active.previousCounter) {
        const delta = value.renderedFrames - active.previousCounter;
        if (delta > 1) trace.frameCounterGaps.push({ action: active.id, observedMs: now, delta });
        active.draws.push({ observedMs: now, renderedFrames: value.renderedFrames, counterDelta: delta });
        active.previousCounter = value.renderedFrames;
      }
    }
    trace.observerWorkMs.push(performance.now() - start);
    if (!trace.firstUsable || active) frame = requestAnimationFrame(observe);
    else { observing = false; frame = undefined; }
  }
  window.addEventListener('keydown', event => {
    if (!active || event.code !== active.code || event.repeat || active.browserInput) return;
    active.browserInput = { receivedMs: performance.now(), eventTimeStamp: event.timeStamp, trusted: event.isTrusted, code: event.code };
  }, true);
  window.addEventListener('keyup', event => {
    if (active && event.code === active.code) active.browserRelease = { receivedMs: performance.now(), eventTimeStamp: event.timeStamp, trusted: event.isTrusted };
  }, true);
  window.__NEIGHBORHOOD_PERF__ = {
    read: () => structuredClone(trace),
    begin(id, kind, code) {
      const before = sample(); if (!before || !trace.firstUsable || active) throw new Error('The observed neighborhood is not ready for an input action.');
      active = { id, kind, code, before, dispatchStartMs: performance.now(), browserInput: null, response: null,
        draws: [], previousCounter: before.renderedFrames, finished: false };
      trace.actions.push(active);
      if (!observing) { observing = true; frame = requestAnimationFrame(observe); }
    },
    end() {
      if (active) { active.finished = true; active.finishedMs = performance.now(); active.after = sample(); active = null; }
    },
    stop() { observing = false; cancelAnimationFrame(frame); frame = undefined; },
    sample,
  };
  frame = requestAnimationFrame(observe);
}

const percentile = (values, fraction) => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1] : null;
const metrics = result => Object.fromEntries(result.metrics.map(value => [value.name, value.value]));
function summarizeActions(trace) {
  const groups = {};
  for (const kind of ['walk', 'orbit', 'all']) {
    const actions = trace.actions.filter(action => kind === 'all' || action.kind === kind);
    const response = actions.flatMap(action => action.response ? [action.response.eventToResponseMs] : []);
    const dispatch = actions.flatMap(action => action.response ? [action.response.dispatchToResponseMs] : []);
    const intervals = actions.flatMap(action => action.draws.slice(1).map((draw, index) => draw.observedMs - action.draws[index].observedMs));
    groups[kind] = { actions: actions.length, responses: response.length, drawIntervals: intervals.length,
      inputP95Ms: percentile(response, .95), dispatchP95Ms: percentile(dispatch, .95), frameIntervalP95Ms: percentile(intervals, .95), intervalsMs: intervals };
  }
  return { groups, observerWorkP95Ms: percentile(trace.observerWorkMs, .95), frameCounterGaps: trace.frameCounterGaps };
}

let browser, context, page, cdp, currentEntry;
try {
  await new Promise(accept => server.listen(0, '127.0.0.1', accept));
  const origin = `http://127.0.0.1:${server.address().port}`;
  report.conditions.pageURL = `${origin}/?qa=1&lang=en&mode=explore&pack=${packId}`;
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox'], ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1,[::1]',
      ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.conditions.browser = browser.version();
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  await context.addInitScript(installObserver, packId);
  page = await context.newPage(); page.setDefaultTimeout(timeout);
  page.on('pageerror', error => { report.errors.push({ stage: currentEntry?.id || 'interaction', message: error.message }); save(); });
  cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable'); await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 1250000, uploadThroughput: 1250000 });
  const requests = new Map();
  cdp.on('Network.requestWillBeSent', event => {
    const item = { id: event.requestId, url: event.request.url, method: event.request.method, type: event.type,
      timestamp: event.timestamp, wallTime: event.wallTime };
    (currentEntry?.network ?? report.interactionNetwork).push(item); requests.set(event.requestId, item);
  });
  cdp.on('Network.responseReceived', event => {
    const item = requests.get(event.requestId); if (item) Object.assign(item, { status: event.response.status,
      fromDiskCache: event.response.fromDiskCache, fromServiceWorker: event.response.fromServiceWorker,
      protocol: event.response.protocol, mimeType: event.response.mimeType, timing: event.response.timing });
  });
  cdp.on('Network.requestServedFromCache', event => { const item = requests.get(event.requestId); if (item) item.servedFromCache = true; });
  cdp.on('Network.loadingFinished', event => { const item = requests.get(event.requestId); if (item) Object.assign(item,
    { finishedTimestamp: event.timestamp, encodedDataLength: event.encodedDataLength }); });
  cdp.on('Network.loadingFailed', event => { const item = requests.get(event.requestId); if (item) item.failure = { errorText: event.errorText, canceled: event.canceled }; });

  for (let index = 0; index < 4; index++) {
    currentEntry = { id: index ? `warm-${index}` : 'cold', network: [] }; report.entries.push(currentEntry); save();
    const response = index ? await page.reload({ waitUntil: 'domcontentloaded', timeout })
      : await page.goto(report.conditions.pageURL, { waitUntil: 'domcontentloaded', timeout });
    currentEntry.htmlSha256 = sha(await response.body()); currentEntry.status = response.status();
    await page.waitForFunction(() => Boolean(window.__NEIGHBORHOOD_PERF__?.read().firstUsable), null, { timeout });
    currentEntry.observation = await page.evaluate(() => ({ trace: window.__NEIGHBORHOOD_PERF__.read(), timeOrigin: performance.timeOrigin,
      resources: performance.getEntriesByType('resource').map(item => item.toJSON()),
      navigation: performance.getEntriesByType('navigation').map(item => item.toJSON()), home: window.__HOME__.snapshot() }));
    const usable = currentEntry.observation.trace.firstUsable.observedMs;
    currentEntry.firstUsableObservedMs = usable;
    currentEntry.bytesAtUsable = {
      completedTransferBytes: currentEntry.observation.resources.filter(item => item.responseEnd <= usable).reduce((sum, item) => sum + item.transferSize, 0),
      completedDecodedBodyBytes: currentEntry.observation.resources.filter(item => item.responseEnd <= usable).reduce((sum, item) => sum + item.decodedBodySize, 0),
      navigationTransferBytes: currentEntry.observation.navigation[0]?.transferSize ?? null,
      pendingRequests: currentEntry.network.filter(item => !item.finishedTimestamp && !item.failure).map(item => item.url),
    };
    check(currentEntry.id + '-exact-index', currentEntry.htmlSha256 === fileHashes.get('/index.html'), currentEntry.htmlSha256);
    check(currentEntry.id + '-first-usable-budget', usable <= (index ? 3000 : 8000), { observedMs: usable, targetMs: index ? 3000 : 8000 });
    console.log(`${currentEntry.id}: usable ${usable.toFixed(1)} ms`);
    await page.waitForFunction(() => {
      const stream = window.__TOUR_GAME__?.streaming();
      if (!stream) return false;
      if (stream.cells.some(cell => cell.error)) return true;
      const desired = stream.cells.filter(cell => cell.desired);
      return !stream.downloads.active && !stream.downloads.queued && !stream.attachments.active && !stream.attachments.queued
        && desired.length > 0 && desired.every(cell => cell.state === 'ready' && cell.level === cell.desired);
    }, null, { timeout });
    const settled = await page.evaluate(() => ({ observedMs: performance.now(), stream: window.__TOUR_GAME__.streaming() }));
    currentEntry.settledMs = settled.observedMs; currentEntry.settledStream = settled.stream;
    const desired = settled.stream.cells.filter(cell => cell.desired);
    const settledReady = !settled.stream.cells.some(cell => cell.error) && desired.length > 0
      && desired.every(cell => cell.state === 'ready' && cell.level === cell.desired);
    check(currentEntry.id + '-desired-sections-ready', settledReady, settled);
    if (!settledReady) throw new Error('Neighborhood detail did not reach the requested resident quality.');
    save();
  }
  currentEntry = null;
  report.conditions.graphics = await page.evaluate(() => {
    const gl = document.querySelector('#live-stage canvas')?.getContext('webgl2'), extension = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl ? { vendor: gl.getParameter(gl.VENDOR), renderer: gl.getParameter(gl.RENDERER), version: gl.getParameter(gl.VERSION),
      unmaskedVendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : null,
      unmaskedRenderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null,
      contextAttributes: gl.getContextAttributes(), viewport: window.__TOUR_GAME__.viewport() } : null;
  });
  const graphicsText = JSON.stringify(report.conditions.graphics || {});
  report.conditions.softwareRendererDetected = /swiftshader|llvmpipe|software|softpipe/i.test(graphicsText);
  await page.locator('#live-stage').scrollIntoViewIfNeeded(); await page.locator('#live-stage').focus();
  async function input(id, kind, key, code) {
    await page.evaluate(({ id, kind, code }) => window.__NEIGHBORHOOD_PERF__.begin(id, kind, code), { id, kind, code });
    await page.keyboard.down(key);
    try {
      await page.waitForTimeout(300);
      await page.waitForFunction(id => window.__NEIGHBORHOOD_PERF__.read().actions.find(action => action.id === id)?.response,
        id, { timeout: 10000 });
    } finally { await page.keyboard.up(key); await page.evaluate(() => window.__NEIGHBORHOOD_PERF__.end()); }
  }
  for (let index = 0; index < 10; index++) await input(`walk-${index + 1}`, 'walk', index % 2 ? 'ArrowLeft' : 'ArrowRight', index % 2 ? 'ArrowLeft' : 'ArrowRight');
  await page.locator('#solo-inspect').click(); await page.locator('#live-stage').focus();
  for (let index = 0; index < 10; index++) await input(`orbit-${index + 1}`, 'orbit', index % 2 ? 'j' : 'l', index % 2 ? 'KeyJ' : 'KeyL');
  await page.keyboard.press('Escape');
  const trace = await page.evaluate(() => { window.__NEIGHBORHOOD_PERF__.stop(); return window.__NEIGHBORHOOD_PERF__.read(); });
  report.interactions = { trace, summary: summarizeActions(trace) };
  check('all-inputs-trusted-and-responsive', trace.actions.length === 20 && trace.actions.every(action => action.browserInput?.trusted
    && action.browserRelease?.trusted && action.response), { actions: trace.actions.length, responses: report.interactions.summary.groups.all.responses });
  check('input-response-p95', report.interactions.summary.groups.all.inputP95Ms <= 100, report.interactions.summary.groups);
  check('observed-frame-interval-p95', trace.frameCounterGaps.length === 0 && report.interactions.summary.groups.all.drawIntervals > 0
    && report.interactions.summary.groups.all.frameIntervalP95Ms <= 33.3, report.interactions.summary);
  save();

  await page.waitForTimeout(1500);
  const blank = await context.newPage(); await blank.goto('about:blank');
  await blank.evaluate(() => window.__NEIGHBORHOOD_PERF__?.stop()); await blank.bringToFront();
  await page.waitForFunction(() => document.hidden, null, { timeout: 10000 });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => ({ now: performance.now(), hidden: document.hidden, state: window.__NEIGHBORHOOD_PERF__.sample(), stream: window.__TOUR_GAME__.streaming() }));
  const beforeCPU = metrics(await cdp.send('Performance.getMetrics'));
  const requestsBefore = report.interactionNetwork.length, httpBefore = report.http.length;
  await page.waitForTimeout(2000);
  const afterCPU = metrics(await cdp.send('Performance.getMetrics'));
  const after = await page.evaluate(() => ({ now: performance.now(), hidden: document.hidden, state: window.__NEIGHBORHOOD_PERF__.sample(), stream: window.__TOUR_GAME__.streaming() }));
  report.hidden = { before, after, observedMs: after.now - before.now,
    renderDelta: after.state.renderedFrames - before.state.renderedFrames, updateDelta: after.state.updateFrames - before.state.updateFrames,
    taskDurationMs: (afterCPU.TaskDuration - beforeCPU.TaskDuration) * 1000,
    scriptDurationMs: (afterCPU.ScriptDuration - beforeCPU.ScriptDuration) * 1000,
    neighborhoodRequests: report.interactionNetwork.slice(requestsBefore).filter(item => new URL(item.url).pathname.startsWith(prefix)),
    servedNeighborhoodRequests: report.http.slice(httpBefore).filter(item => item.path.startsWith(prefix)) };
  check('hidden-neighborhood-zero-work', before.hidden && after.hidden && report.hidden.renderDelta === 0 && report.hidden.updateDelta === 0
    && report.hidden.neighborhoodRequests.length === 0, report.hidden);
  await blank.close(); await page.bringToFront();
  check('no-page-exceptions', report.errors.length === 0, report.errors);
  check('no-missing-build-resources', report.http.every(item => item.status !== 404 || item.path.startsWith('/api/') || item.path === '/favicon.ico'),
    report.http.filter(item => item.status === 404));
} catch (error) {
  report.errors.push({ stage: currentEntry?.id || 'setup', message: error.message, stack: error.stack });
  if (page && !page.isClosed()) {
    try { report.lastObservation = await page.evaluate(() => ({ home: window.__HOME__?.snapshot(),
      trace: window.__NEIGHBORHOOD_PERF__?.read(), stream: window.__TOUR_GAME__?.streaming() })); }
    catch (observationError) { report.observationError = observationError.message; }
  }
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString(); save();
  await context?.close(); await browser?.close();
  server.closeAllConnections(); await new Promise(accept => server.close(accept));
}
if (report.checks.some(result => !result.pass) || report.errors.length) process.exitCode = 1;
