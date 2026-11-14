// 使用原生相机按钮检验相同视角的编码、加载边界和输入响应。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const target = process.argv[2];
assert(target, 'Usage: node experience/tests/browser-review-chunks.mjs <package|https-url> [output-parent] [baseline-result.json]');
const remote = target.startsWith('https://');
const directory = remote ? null : realpathSync(resolve(target));
const workspace = resolve(root, 'artifacts/realism-01/review-chunks');
const parent = resolve(process.argv[3] || resolve(workspace, 'qa'));
assert(parent.startsWith(workspace + sep), 'Output must stay inside the ignored chunk workspace');
const output = resolve(parent, new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-'));
const temporary = resolve(workspace, 'browser-tmp');
mkdirSync(output, { recursive: true });
mkdirSync(temporary, { recursive: true });
process.env.TMPDIR = temporary;
process.env.XDG_CONFIG_HOME = resolve(temporary, 'config');
process.env.XDG_CACHE_HOME = resolve(temporary, 'cache');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const driver = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(resolve(output, 'executed-driver.mjs'), driver);
const timeout = Number(process.env.REVIEW_CHUNKS_TIMEOUT || 240000);
assert(Number.isFinite(timeout) && timeout > 0);
const conditions = Object.freeze({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1,
  downloadBitsPerSecond: 10_000_000, latencyMs: 80, cacheDisabled: true,
  cameraActions: ['rotate-left', 'rotate-left', 'rotate-right', 'rotate-right', 'rotate-right', 'rotate-right', 'reset'],
  capturePoses: ['source', 'left-inspection', 'right-inspection', 'source-repeat'],
  observation: 'Every animation-frame callback; retain each distinct actual submitted frame' });
const report = { schemaVersion: 1, startedAt: new Date().toISOString(), completed: false, target,
  driver: { path: relative(root, fileURLToPath(import.meta.url)), sha256: sha(driver) }, conditions,
  packageManifest: directory ? JSON.parse(readFileSync(resolve(directory, 'package-manifest.json'))) : null,
  checks: [], network: [], captures: [], probes: [], pageErrors: [], console: [],
  limitations: [
    'Cloud Chromium software rendering leaves physical-device fluency, memory and screen presentation unverified.',
    'The two manual inspection poses use native buttons at approximately -0.3 and +0.3 radians from the source pose; they do not traverse the guided path.',
    'Animation-frame observations retain actual submitted frames. Counter gaps and observer delay remain explicit; the earliest retained matching frame may follow an earlier unobserved response.',
    'Input event timestamp and handler receipt are separate. Draw timing includes the measured browser event queue; physical display latency remains unmeasured.',
    'CDP transfer includes response prefixes and unfinished bodies; request headers and TLS/TCP overhead are excluded.',
    'The observer reads diagnostic snapshots every animation frame and therefore adds measurement overhead.',
  ] };
const persist = () => writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, pass, evidence, category = 'functional') {
  report.checks.push({ id, pass: Boolean(pass), evidence, category });
  persist(); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`);
}
const sameCamera = (a, b) => ['matrixWorld', 'projectionMatrix'].every(key => a?.[key]?.length === 16
  && b?.[key]?.length === 16 && a[key].every((value, index) => Math.abs(value - b[key][index]) < 1e-7));
const snapshot = () => page.evaluate(() => window.__REALISM_REVIEW__?.snapshot());
function isSettled(view) {
  const settled = view?.settledView;
  return Boolean(settled?.qualifiedFrames.length === 3 && view.drawnSplats > 0 && view.paging.idle && view.paging.settled
    && !view.requests.some(request => request.status === 'pending') && sameCamera(view, settled)
    && sameCamera(view, view.drawnView) && settled.drawnSplats === view.drawnSplats
    && settled.drawnSplats === view.drawnView.drawnSplats
    && Object.keys(settled.content).every(key => settled.content[key] === view.drawnView.content[key]));
}
let browser, context, page, server;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.wasm': 'application/wasm' };
async function serve() {
  const verifiedFiles = report.packageManifest.files.map(expected => {
    const filename = resolve(directory, expected.path);
    assert(filename.startsWith(directory + sep));
    const bytes = readFileSync(filename);
    assert.equal(bytes.length, expected.bytes, expected.path);
    assert.equal(sha(bytes), expected.sha256, expected.path);
    return { path: expected.path, bytes: bytes.length, sha256: sha(bytes) };
  });
  report.packageIdentity = { manifestSha256: sha(readFileSync(resolve(directory, 'package-manifest.json'))), verified: true, verifiedFiles };
  const compressed = new Map();
  server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    const filename = resolve(directory, pathname.slice(1));
    if (!filename.startsWith(directory + sep) || !existsSync(filename) || !statSync(filename).isFile()) {
      response.writeHead(404); response.end(); return;
    }
    if (['.html', '.js', '.css', '.json', '.svg'].includes(extname(filename))) {
      if (!compressed.has(filename)) compressed.set(filename, gzipSync(readFileSync(filename), { level: 9 }));
      const bytes = compressed.get(filename);
      response.writeHead(200, { 'Content-Type': mime[extname(filename)], 'Content-Encoding': 'gzip',
        'Content-Length': bytes.length, 'Cache-Control': 'no-store' }); response.end(bytes); return;
    }
    response.writeHead(200, { 'Content-Type': mime[extname(filename)] || 'application/octet-stream',
      'Content-Length': statSync(filename).size, 'Cache-Control': 'no-store' });
    const stream = createReadStream(filename);
    stream.on('error', error => response.destroy(error));
    response.on('close', () => stream.destroy()); stream.pipe(response);
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
  return `http://127.0.0.1:${server.address().port}/index.html`;
}
async function until(predicate, label) {
  report.activeOperation = { label, startedAt: new Date().toISOString() }; persist();
  const deadline = Date.now() + timeout;
  let recordedAt = 0;
  while (Date.now() < deadline) {
    const view = await snapshot();
    if (Date.now() - recordedAt > 10000) {
      report.lastObservation = { label, at: new Date().toISOString(), view }; persist(); recordedAt = Date.now();
    }
    if (view?.status === 'error') throw new Error(`${label}: ${view.error}`);
    if (predicate(view)) return view;
    await page.waitForTimeout(100);
  }
  throw new Error(`Timed out: ${label}`);
}
function transferAt(milliseconds) {
  const boundary = report.navigationStart + milliseconds / 1000;
  const requests = report.network.filter(item => item.startedAt <= boundary).map(item => {
    const complete = Number.isFinite(item.finishedAt) && item.finishedAt <= boundary;
    const received = Number.isFinite(item.responseAt) && item.responseAt <= boundary;
    const bytes = complete ? item.totalEncodedBytes : (received ? item.initialEncodedPrefixBytes : 0)
      + item.data.filter(event => event.timestamp <= boundary).reduce((sum, event) => sum + event.encodedDataLength, 0);
    return { requestId: item.requestId, url: item.url, complete, bytes };
  });
  return { boundaryAtMs: milliseconds, boundary, requests, totalEncodedBytes: requests.reduce((sum, item) => sum + item.bytes, 0),
    inflightBytes: requests.filter(item => !item.complete).reduce((sum, item) => sum + item.bytes, 0) };
}
async function capture(name) {
  const before = await until(isSettled, `${name} settled view`);
  const bytes = await page.locator('#review-canvas').screenshot({ path: resolve(output, `${name}.png`), type: 'png', timeout });
  const after = await snapshot();
  const record = { name, path: `${name}.png`, bytes: bytes.length, sha256: sha(bytes), before, after,
    transfer: transferAt(before.settledView.observedAt), boundaryKind: 'Subsequent idle observation qualifying three actual submitted frames' };
  report.captures.push(record);
  check(`${name}-stable`, isSettled(after) && sameCamera(before, after) && before.drawnSplats === after.drawnSplats
    && Object.keys(before.drawnView.content).every(key => before.drawnView.content[key] === after.drawnView.content[key]), record);
  return record;
}
async function probe(action, phase) {
  const before = await snapshot();
  const marker = await page.evaluate(() => window.__CHUNK_OBSERVATIONS__.inputs.length);
  await page.locator(`[data-action="${action}"]`).click();
  const input = await page.evaluate(index => window.__CHUNK_OBSERVATIONS__.inputs[index], marker);
  assert(input?.trusted && input.action === action && input.requested);
  assert(Number.isFinite(input.eventAt) && input.eventAt >= 0 && input.eventAt <= input.handlerAt);
  await until(view => view?.drawnView?.frames > before.frames && sameCamera(view, view.drawnView)
    && sameCamera(input.requested, view.drawnView), `${phase} ${action} draw`);
  const observationHandle = await page.waitForFunction(({ input }) => {
    const data = window.__CHUNK_OBSERVATIONS__;
    const matches = frame => ['matrixWorld', 'projectionMatrix'].every(key => frame[key]
      .every((value, index) => Math.abs(value - input.requested[key][index]) < 1e-7));
    const first = data.frames.find(frame => frame.submittedAt >= input.handlerAt && frame.frames > input.before.frames && matches(frame));
    return first ? { first, gaps: data.gaps.filter(gap => gap.to > input.before.frames && gap.from < first.frames) } : null;
  }, { input }, { polling: 'raf', timeout });
  const observation = await observationHandle.jsonValue();
  await observationHandle.dispose();
  assert(observation, 'A per-animation-frame observation must retain the submitted response');
  const record = { phase, action, input, before, firstObservedResponse: observation.first, observationGaps: observation.gaps,
    eventToSubmittedMs: observation.first.submittedAt - input.eventAt,
    handlerToSubmittedMs: observation.first.submittedAt - input.handlerAt,
    eventQueueMs: input.handlerAt - input.eventAt,
    observationLagMs: observation.first.observedAt - observation.first.submittedAt };
  report.probes.push(record);
  check(`${phase}-${action}-submitted-${report.probes.length}`, sameCamera(input.requested, observation.first)
    && !sameCamera(input.before, observation.first), record);
}
async function compare(left, leftPath, right, rightPath, id, exact = false) {
  const encoded = [leftPath, rightPath].map(path => readFileSync(path).toString('base64'));
  const metrics = await page.evaluate(async images => {
    const decoded = [];
    for (const encoded of images) {
      const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(encoded), value => value.charCodeAt(0))], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(bitmap, 0, 0);
      decoded.push({ width: bitmap.width, height: bitmap.height, rgba: context.getImageData(0, 0, bitmap.width, bitmap.height).data }); bitmap.close();
    }
    if (decoded[0].width !== decoded[1].width || decoded[0].height !== decoded[1].height) throw new Error('Compared PNG dimensions differ');
    let maximum = 0, total = 0, differingRgbChannels = 0, alphaMismatches = 0;
    const histogram = new Array(256).fill(0);
    for (let index = 0; index < decoded[0].rgba.length; index++) {
      const difference = Math.abs(decoded[0].rgba[index] - decoded[1].rgba[index]);
      if (index % 4 === 3) { if (difference) alphaMismatches++; continue; }
      histogram[difference]++; maximum = Math.max(maximum, difference); total += difference;
      if (difference) differingRgbChannels++;
    }
    const channels = decoded[0].width * decoded[0].height * 3;
    let count = 0, p95ChannelError = 0;
    for (let value = 0; value < histogram.length; value++) {
      count += histogram[value]; if (count >= Math.ceil(channels * .95)) { p95ChannelError = value; break; }
    }
    return { width: decoded[0].width, height: decoded[0].height, maxChannelError: maximum, p95ChannelError,
      meanAbsoluteError255: total / channels, differingRgbChannels, alphaMismatches };
  }, encoded);
  const record = { id, ...metrics, referencePath: leftPath, candidatePath: rightPath,
    sameCameraAndCount: sameCamera(left.before, right.before) && left.before.drawnSplats === right.before.drawnSplats,
    criteria: { maxChannelError: exact ? 0 : 1, p95ChannelError: 0, alphaMismatches: 0, source: exact ? 'Exact repeatability' : 'D25' } };
  (report.imageComparisons ??= []).push(record);
  check(`${id}-exact`, metrics.differingRgbChannels === 0 && metrics.alphaMismatches === 0, record, 'diagnostic');
  check(id, record.sameCameraAndCount && metrics.maxChannelError <= record.criteria.maxChannelError
    && metrics.p95ChannelError === 0 && metrics.alphaMismatches === 0, record);
}
persist();
try {
  const entry = remote ? new URL(target.endsWith('/') ? target + 'index.html' : target).href : await serve();
  report.entry = entry;
  const proxyAddress = remote ? process.env.HTTPS_PROXY || process.env.HTTP_PROXY : null;
  const proxy = proxyAddress ? new URL(proxyAddress) : null;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox'], env: { ...process.env }, ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1',
      ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.browser = browser.version();
  context = await browser.newContext({ viewport: conditions.viewport, deviceScaleFactor: 1, locale: 'en-US' });
  if (remote) {
    const manifestUrl = new URL('package-manifest.json', entry).href;
    const response = await context.request.get(manifestUrl); assert(response.ok());
    const bytes = await response.body(); report.packageManifest = JSON.parse(bytes);
    report.packageIdentity = { manifestSha256: sha(bytes), sourceUrl: manifestUrl, verified: false,
      scope: 'Declared HTTPS manifest; actual file verification is separate' };
  }
  page = await context.newPage(); page.setDefaultTimeout(timeout);
  page.on('pageerror', error => { report.pageErrors.push({ at: Date.now(), message: error.message }); persist(); });
  page.on('console', message => report.console.push({ at: Date.now(), type: message.type(), text: message.text() }));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Performance.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: conditions.latencyMs,
    downloadThroughput: conditions.downloadBitsPerSecond / 8, uploadThroughput: conditions.downloadBitsPerSecond / 8 });
  const requests = new Map();
  cdp.on('Network.requestWillBeSent', event => {
    const record = { requestId: event.requestId, url: event.request.url, startedAt: event.timestamp,
      responseAt: null, initialEncodedPrefixBytes: 0, data: [], finishedAt: null, totalEncodedBytes: null };
    requests.set(event.requestId, record); report.network.push(record);
  });
  cdp.on('Network.responseReceived', event => {
    const record = requests.get(event.requestId); if (!record) return;
    Object.assign(record, { responseAt: event.timestamp, initialEncodedPrefixBytes: event.response.encodedDataLength,
      status: event.response.status, fromDiskCache: event.response.fromDiskCache, fromServiceWorker: event.response.fromServiceWorker });
  });
  cdp.on('Network.dataReceived', event => requests.get(event.requestId)?.data.push({ timestamp: event.timestamp,
    encodedDataLength: event.encodedDataLength, dataLength: event.dataLength }));
  cdp.on('Network.loadingFinished', event => {
    const record = requests.get(event.requestId); if (record) Object.assign(record, { finishedAt: event.timestamp, totalEncodedBytes: event.encodedDataLength });
  });
  cdp.on('Network.loadingFailed', event => {
    const record = requests.get(event.requestId); if (record) Object.assign(record, { failedAt: event.timestamp, error: event.errorText, canceled: event.canceled });
  });
  await page.addInitScript(() => {
    const data = { frames: [], gaps: [], inputs: [], longTasks: [] };
    Object.defineProperty(window, '__CHUNK_OBSERVATIONS__', { value: data });
    const camera = view => view ? { frames: view.frames, matrixWorld: view.matrixWorld, projectionMatrix: view.projectionMatrix } : null;
    const pendingInputs = new WeakMap();
    document.addEventListener('click', event => {
      const button = event.target.closest('[data-action]'); if (!button) return;
      const input = { action: button.dataset.action, eventAt: event.timeStamp, handlerAt: performance.now(), trusted: event.isTrusted,
        before: camera(window.__REALISM_REVIEW__?.snapshot()) };
      data.inputs.push(input);
      pendingInputs.set(event, input);
    }, true);
    document.addEventListener('click', event => {
      const input = pendingInputs.get(event);
      if (input) input.requested = camera(window.__REALISM_REVIEW__?.snapshot());
    });
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      new PerformanceObserver(list => data.longTasks.push(...list.getEntries().map(entry => ({ startTime: entry.startTime, duration: entry.duration })))).observe({ type: 'longtask', buffered: true });
    }
    function observe() {
      const view = window.__REALISM_REVIEW__?.snapshot();
      const drawn = view?.drawnView;
      const previous = data.frames.at(-1);
      if (drawn && (!previous || drawn.frames !== previous.frames)) {
        const record = { ...drawn, observedAt: performance.now(), requestedCamera: camera(view), status: view.status,
          loadedBytes: view.loadedBytes, pagingObserved: view.paging, loadingSchedule: view.loadingSchedule };
        if (previous && drawn.frames > previous.frames + 1) data.gaps.push({ from: previous.frames, to: drawn.frames,
          missing: drawn.frames - previous.frames - 1, fromSubmittedAt: previous.submittedAt, toSubmittedAt: drawn.submittedAt });
        data.frames.push(record);
      }
      requestAnimationFrame(observe);
    }
    requestAnimationFrame(observe);
  });
  await page.goto(entry, { waitUntil: 'domcontentloaded' });
  report.firstView = await until(view => view?.firstView && view.drawnView?.drawnSplats > 0, 'first visible view');
  const metrics = await cdp.send('Performance.getMetrics');
  report.navigationStart = metrics.metrics.find(metric => metric.name === 'NavigationStart')?.value;
  assert(Number.isFinite(report.navigationStart));
  report.firstVisibleTransfer = transferAt(report.firstView.firstVisibleAt);
  check('first-view-4mib-budget', report.firstVisibleTransfer.totalEncodedBytes <= 4 * 1024 * 1024, report.firstVisibleTransfer, 'budget');
  const source = await capture('source');
  for (const action of conditions.cameraActions.slice(0, 2)) await probe(action, 'left-inspection');
  await capture('left-inspection');
  for (const action of conditions.cameraActions.slice(2, 6)) await probe(action, 'right-inspection');
  await capture('right-inspection');
  await probe('reset', 'source-repeat');
  const repeat = await capture('source-repeat');
  check('reset-camera-and-new-frame', sameCamera(source.before, repeat.before) && repeat.before.frames > source.before.frames);
  await compare(source, resolve(output, source.path), repeat, resolve(output, repeat.path), 'same-build-repeatability', true);
  if (process.argv[4]) {
    const baselinePath = resolve(process.argv[4]);
    const baseline = JSON.parse(readFileSync(baselinePath)); assert(baseline.completed);
    assert.deepEqual(baseline.conditions, conditions);
    report.baseline = { path: baselinePath, sha256: sha(readFileSync(baselinePath)) };
    for (const capture of report.captures) {
      const reference = baseline.captures.find(item => item.name === capture.name); assert(reference);
      await compare(reference, resolve(dirname(baselinePath), reference.path), capture,
        resolve(output, capture.path), `${capture.name}-approved-appearance`);
    }
  }
  report.renderer = await page.evaluate(() => {
    const gl = document.querySelector('#review-canvas').getContext('webgl2');
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null;
  });
  check('no-page-errors', report.pageErrors.length === 0, report.pageErrors);
  check('no-http-errors', !report.network.some(item => item.status >= 400), report.network.filter(item => item.status >= 400));
  report.completed = true;
} catch (error) {
  report.termination = { message: error.message, stack: error.stack }; process.exitCode = 1;
  console.error(error.stack);
} finally {
  if (page && !page.isClosed()) {
    report.lastView = await snapshot();
    report.observations = await page.evaluate(() => window.__CHUNK_OBSERVATIONS__ ?? null);
  }
  persist();
  if (browser) await browser.close();
  if (server?.listening) await new Promise(accept => { server.close(accept); server.closeAllConnections(); });
  report.finishedAt = new Date().toISOString(); persist();
}
if (report.checks.some(item => !item.pass && !['budget', 'diagnostic'].includes(item.category))) process.exitCode = 1;
console.log(JSON.stringify({ completed: report.completed, failed: report.checks.filter(item => !item.pass).map(item => item.id),
  report: relative(root, resolve(output, 'result.json')) }));
