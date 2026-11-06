import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, realpathSync, copyFileSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = resolve(root, 'experience/tools/splat-streaming');
const output = resolve(root, process.argv[2]);
const converted = resolve(root, process.argv[3]);
const initialOnly = process.argv.includes('--initial-only');
assert(output.startsWith(resolve(root, 'artifacts/realism-01/splat-streaming/')));
assert(converted.startsWith(resolve(root, 'artifacts/realism-01/splat-streaming/converted')));
mkdirSync(output, { recursive: true });
const temporary = resolve(root, 'artifacts/splat-streaming-tmp');
mkdirSync(temporary, { recursive: true });
process.env.TMPDIR = temporary;
process.env.XDG_CONFIG_HOME = resolve(temporary, 'config');
const hash = data => createHash('sha256').update(data).digest('hex');
const identify = file => { const data = readFileSync(file); return { path: relative(root, file), bytes: data.length, sha256: hash(data) }; };
const research = resolve(root, 'artifacts/realism-01/splat-fidelity/research');
const three = resolve(root, 'experience/node_modules/three');
const files = new Map([
  ['/', resolve(directory, 'viewer.html')], ['/viewer.js', resolve(directory, 'viewer.js')],
  ['/spark.module.js', resolve(root, 'artifacts/realism-01/splat-qualification/downloads/spark.module.js')],
  ['/hall-config.json', resolve(research, 'knock-published-viewer-config.json')],
  ['/publisher-camera.json', resolve(root, 'artifacts/realism-01/splat-fidelity/hall-run-03-focal2/publisher-camera.json')],
]);
const report = { startedAt: new Date().toISOString(), completed: false, initialOnly,
  source: identify(resolve(research, 'knock-original.sog')),
  sourceSplatCount: 1935275, sourceShDegree: 3,
  converterDirectory: relative(root, converted),
  convertedFiles: readdirSync(converted).filter(name => /\.radc?$/.test(name)).map(name => identify(resolve(converted, name))),
  toolSources: ['capture.mjs', 'viewer.js', 'viewer.html'].map(name => identify(resolve(directory, name))),
  rights: 'Knock Community Hall by scbenoit, https://superspl.at/scene/0ff2e6dc, CC BY 4.0; derived LoD/encoding conversion recorded separately.',
  network: { downloadBitsPerSecond: 10000000, uploadBitsPerSecond: 10000000, latencyMilliseconds: 80, cacheDisabled: true,
    textCompression: 'gzip level 9', sourceCompression: 'official RAD encoding, unchanged' },
  requests: [], servedResources: [], captures: [], observations: [], errors: [],
  limits: { initialTransferBytes: 4194304, maxPagedSplats: 524288, maxPages: 8, lodSplatCount: 262144, numFetchers: 1 },
  benchmarkFullQualityReady: 'unverified', completeMemoryAccounting: false,
  limitations: ['Software-renderer mechanics and actual bytes only; physical-device timing gates unverified.',
    'First visible LoD represents partial detail. The complete full-quality starting view remains unqualified.',
    'One licensed hall source establishes no Kyoto route, pedestrian floor or independent discovery qualification.'] };
assert.equal(report.source.sha256, '81d061bad6ba255689939847482836f7d70bf2e222abce04e6d81c2c976c6a71');
mkdirSync(resolve(output, 'tool-snapshot'), { recursive: true });
for (const item of report.toolSources) copyFileSync(resolve(root, item.path), resolve(output, 'tool-snapshot', item.path.split('/').at(-1)));
const save = () => writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
const served = new Map(), responseCache = new Map();
const mime = file => ({ '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' })[extname(file)] ?? 'application/octet-stream';
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  let file = files.get(path);
  if (path.startsWith('/three/')) {
    file = realpathSync(resolve(three, path.slice(7)));
    assert(file.startsWith(realpathSync(three) + '/'));
  }
  if (path.startsWith('/converted/')) {
    const name = path.slice('/converted/'.length);
    assert(/^[\w.-]+\.radc?$/.test(name));
    file = resolve(converted, name);
  }
  if (!file) { report.errors.push({ type: 'unmapped-resource', path }); res.writeHead(404); res.end(); return; }
  let response = responseCache.get(file);
  if (!response) {
    const original = readFileSync(file);
    const compressed = ['.js', '.html', '.json'].includes(extname(file));
    const body = compressed ? gzipSync(original, { level: 9 }) : original;
    response = { original, body, compressed };
    responseCache.set(file, response);
    served.set(path, { requestPath: path, ...identify(file), encodedBodyBytes: body.length,
      encodedBodySha256: hash(body), contentEncoding: compressed ? 'gzip' : 'identity' });
  }
  const headers = { 'Content-Type': mime(file), 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
  if (response.compressed) headers['Content-Encoding'] = 'gzip';
  let status = 200, body = response.body;
  if (req.headers.range) {
    assert(!response.compressed);
    const match = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range);
    assert(match);
    const first = Number(match[1]), last = Math.min(Number(match[2]), body.length - 1);
    assert(first <= last);
    headers['Content-Range'] = `bytes ${first}-${last}/${body.length}`;
    body = body.subarray(first, last + 1);
    status = 206;
  }
  headers['Content-Length'] = body.length;
  res.writeHead(status, headers);
  res.end(body);
});
await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const requestMap = new Map();
try {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'],
    env: { ...process.env, TMPDIR: temporary } });
  report.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 960, height: 960 }, deviceScaleFactor: 1 });
  await context.route(url => !url.href.startsWith(origin) && !url.href.startsWith('blob:'), route => {
    report.errors.push({ type: 'blocked-external-request', url: route.request().url() });
    return route.abort();
  });
  await context.addInitScript(() => {
    const NativeWorker = window.Worker;
    const state = { created: 0, terminated: 0, active: 0, events: [] };
    window.__WORKERS__ = state;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args);
        this.observedId = ++state.created;
        this.observedTerminated = false;
        state.active++;
        state.events.push({ type: 'create', id: this.observedId, at: performance.now() });
      }
      terminate() {
        if (!this.observedTerminated) {
          this.observedTerminated = true;
          state.terminated++;
          state.active--;
          state.events.push({ type: 'terminate', id: this.observedId, at: performance.now() });
        }
        return super.terminate();
      }
    };
  });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  await session.send('Network.emulateNetworkConditions', { offline: false, latency: 80,
    downloadThroughput: 10000000 / 8, uploadThroughput: 10000000 / 8, connectionType: 'cellular4g' });
  session.on('Network.requestWillBeSent', event => {
    if (!event.request.url.startsWith(origin)) return;
    const request = { id: event.requestId, url: event.request.url, timestamp: event.timestamp, wallTime: event.wallTime,
      type: event.type, requestHeaders: event.request.headers, chunks: [] };
    requestMap.set(event.requestId, request);
    report.requests.push(request);
  });
  session.on('Network.responseReceived', event => {
    const request = requestMap.get(event.requestId);
    if (request) request.response = { status: event.response.status, headers: event.response.headers,
      encodedHeaderBytes: event.response.encodedDataLength, fromDiskCache: event.response.fromDiskCache,
      protocol: event.response.protocol, timestamp: event.timestamp };
  });
  session.on('Network.dataReceived', event => {
    const request = requestMap.get(event.requestId);
    if (request) request.chunks.push({ timestamp: event.timestamp, decodedBytes: event.dataLength, encodedBytes: event.encodedDataLength });
  });
  session.on('Network.loadingFinished', event => {
    const request = requestMap.get(event.requestId);
    if (request) request.finished = { timestamp: event.timestamp, encodedBytes: event.encodedDataLength };
  });
  session.on('Network.loadingFailed', event => {
    const request = requestMap.get(event.requestId);
    if (request) request.failed = { timestamp: event.timestamp, canceled: event.canceled, error: event.errorText };
  });
  page.on('pageerror', error => { report.errors.push({ type: 'pageerror', message: error.message }); save(); });
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) report.errors.push({ type: `console-${message.type()}`, message: message.text() });
  });
  async function observe(label) {
    const state = await page.evaluate(() => window.__STREAM__.snapshot());
    report.observations.push({ label, state });
    save();
    return state;
  }
  async function capture(label) {
    const state = await observe(label);
    const bytes = await page.locator('#stage').screenshot({ path: resolve(output, `${label}.jpg`), type: 'jpeg', quality: 92, timeout: 120000 });
    report.captures.push({ path: `${label}.jpg`, bytes: bytes.length, sha256: hash(bytes), stateLabel: label });
    save();
    return state;
  }
  async function settle() {
    await page.waitForFunction(() => {
      const state = window.__STREAM__?.snapshot();
      return state?.selectedSplats > 0 && state.pager && !state.pager.pending && state.pager.readyUploads === 0 && state.stableForMs > 800;
    }, null, { timeout: 180000, polling: 250 });
  }
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__STREAM__?.snapshot().firstVisible.length > 0, null, { timeout: 180000, polling: 100 });
  await capture('first-visible');
  await settle();
  const initial = await capture('bounded-initial');
  report.radMeta = await page.evaluate(async () => {
    const resource = performance.getEntriesByType('resource').find(entry => entry.name.endsWith('.rad'));
    return { headerLoaded: !!resource };
  });
  if (!initialOnly) {
    for (let index = 1; index <= 3; index++) {
      await page.mouse.move(460, 480);
      await page.mouse.down();
      await page.mouse.move(670, 485, { steps: 4 });
      await page.mouse.up();
      if (index === 2) await page.mouse.wheel(0, -180);
      await settle();
      await capture(`native-view-${index}`);
    }
    await page.evaluate(() => window.__STREAM__.resetCamera());
    await settle();
    await capture('returned-initial');
    for (let cycle = 1; cycle <= 3; cycle++) {
      await page.evaluate(() => window.__STREAM__.remove(true));
      await page.waitForFunction(() => {
        const state = window.__STREAM__.snapshot();
        return state.lodTrees === 0 && state.pager?.pages.length === 0 && !state.pager.pending;
      }, null, { timeout: 30000, polling: 250 });
      await observe(`unloaded-${cycle}`);
      if (cycle < 3) {
        await page.evaluate(() => window.__STREAM__.mount());
        await settle();
        await observe(`reloaded-${cycle}`);
      }
    }
    await page.evaluate(() => window.__STREAM__.mount());
    await page.waitForFunction(() => window.__STREAM__.snapshot().pager?.fetchers > 0, null, { timeout: 30000, polling: 25 });
    await observe('before-cancel');
    report.cancellation = await page.evaluate(() => window.__STREAM__.remove(true));
    await page.waitForFunction(() => {
      const state = window.__STREAM__.snapshot();
      return state.lodTrees === 0 && state.pager?.pages.length === 0 && !state.pager.pending;
    }, null, { timeout: 30000, polling: 250 });
    await observe('after-cancel');
  }
  report.disposal = await page.evaluate(() => window.__STREAM__.dispose());
  report.heap = await session.send('Runtime.getHeapUsage');
  const cutoff = initial.firstVisible[0].epochMs;
  function bytesAt(request, epochMs) {
    const atEpoch = timestamp => (request.wallTime + timestamp - request.timestamp) * 1000;
    if (request.finished && atEpoch(request.finished.timestamp) <= epochMs) return request.finished.encodedBytes;
    const headers = request.response && atEpoch(request.response.timestamp) <= epochMs ? request.response.encodedHeaderBytes : 0;
    return headers + request.chunks.filter(chunk => atEpoch(chunk.timestamp) <= epochMs).reduce((sum, chunk) => sum + chunk.encodedBytes, 0);
  }
  report.firstVisibleTransfer = { epochMs: cutoff, totalEncodedBytes: report.requests.reduce((sum, request) => sum + bytesAt(request, cutoff), 0),
    sourceEncodedBytes: report.requests.filter(request => request.url.includes('/converted/')).reduce((sum, request) => sum + bytesAt(request, cutoff), 0),
    method: 'CDP completed response encodedDataLength or response headers plus dataReceived encoded bytes up to submitted first-visible frame',
    benchmarkFullQualityReady: false };
  const observed = report.observations.map(item => item.state);
  const residentPages = observed.flatMap(state => state.pageHistory.map(item => item.pages.length));
  const histories = report.disposal.pageHistory;
  const changes = histories.slice(1).filter((entry, index) => {
    const previous = histories[index];
    return entry.generation === previous.generation && entry.pages.some(page => previous.pages.some(old => old.page === page.page && old.chunk !== page.chunk));
  });
  report.evictions = { observedReplacementEvents: changes.length, examples: changes.slice(0, 10) };
  report.checks = [
    { id: 'original-source-identity', pass: report.source.sha256 === '81d061bad6ba255689939847482836f7d70bf2e222abce04e6d81c2c976c6a71' },
    { id: 'first-visible-total-transfer-within-4mib', pass: report.firstVisibleTransfer.totalEncodedBytes <= 4194304 },
    { id: 'resident-pool-within-eight-pages', pass: Math.max(...residentPages) <= 8 },
    { id: 'source-fetchers-within-one', pass: observed.every(state => !state.pager || state.pager.fetchers <= 1) },
    { id: 'same-camera-as-original-reference', pass: initial.camera.matrixWorld.every((value, index) => Math.abs(value - JSON.parse(readFileSync(files.get('/publisher-camera.json'), 'utf8')).camera.matrixWorld[index]) < .00001) },
  ];
  if (!initialOnly) report.checks.push(
    { id: 'native-input-observed', pass: observed.some(state => state.nativeInputs.some(event => event.trusted && event.type === 'pointerdown')) },
    { id: 'page-eviction-observed', pass: changes.length > 0 },
    { id: 'three-unload-cycles-release-pages', pass: report.observations.filter(item => item.label.startsWith('unloaded-')).length === 3
      && report.observations.filter(item => item.label.startsWith('unloaded-')).every(item => item.state.pager.pages.length === 0 && item.state.lodTrees === 0) },
    { id: 'inflight-source-fetch-canceled', pass: report.requests.some(request => request.url.includes('/converted/') && request.failed?.canceled) });
  report.completed = true;
  await context.close();
} finally {
  if (browser) await browser.close();
  await new Promise(accept => { server.close(accept); server.closeAllConnections(); });
  report.servedResources = [...served.values()];
  report.finishedAt = new Date().toISOString();
  save();
}
console.log(JSON.stringify({ completed: report.completed, firstVisibleTransfer: report.firstVisibleTransfer,
  checks: report.checks, errors: report.errors }));
