import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../../', import.meta.url));
if (process.argv.includes('--help')) {
  console.log('Usage: node experience/tools/browser-asset-cache.mjs [built-dist-directory]\nASSET_CACHE_OUTPUT selects a repository artifacts directory; EXPERIENCE_QA_CHROMIUM selects Chromium.');
  process.exit(0);
}
if (process.argv.length > 3) throw new Error('Provide one built-dist directory.');
const dist = resolve(repository, process.argv[2] || 'experience/dist');
const output = resolve(repository, process.env.ASSET_CACHE_OUTPUT || 'artifacts/asset-cache');
if (!output.startsWith(join(repository, 'artifacts') + '/')) throw new Error('Cache evidence must remain in repository artifacts.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceFile = join(repository, 'experience/src/runtime/asset-bytes.js');
const source = readFileSync(sourceFile), driver = readFileSync(fileURLToPath(import.meta.url));
const fixturePaths = { rig: 'lighting/rig.json', alternateRig: 'packs/ginza-wako/lighting.json', model: 'models/traveller.glb' };
const fixtures = Object.fromEntries(Object.entries(fixturePaths).map(([id, path]) => {
  const bytes = readFileSync(join(dist, path));
  return [id, { path, body: bytes, bytes: bytes.length, sha256: sha(bytes) }];
}));
if (fixtures.rig.sha256 === fixtures.alternateRig.sha256) throw new Error('The two actual packaged rigs must have different identities.');
mkdirSync(join(output, 'fixtures'), { recursive: true });
process.env.TMPDIR = join(repository, 'artifacts/tmp'); mkdirSync(process.env.TMPDIR, { recursive: true });
writeFileSync(join(output, 'asset-bytes.js'), source);
writeFileSync(join(output, 'executed-driver.mjs'), driver);
for (const [id, fixture] of Object.entries(fixtures)) writeFileSync(join(output, 'fixtures', id + (id === 'model' ? '.glb' : '.json')), fixture.body);
const report = {
  startedAt: new Date().toISOString(), driverSha256: sha(driver), module: { path: sourceFile, sha256: sha(source), bytes: source.length },
  packagedDirectory: dist, fixtures: Object.fromEntries(Object.entries(fixtures).map(([id, { body, ...identity }]) => [id, identity])),
  conditions: { headless: true, realHTTP: true, responseInterception: false, fetchReplacement: false, tlsVerification: true,
    cacheControl: 'public, max-age=3600, immutable', requestTimeoutMs: 10000,
    scope: 'Production byte-loader module with real packaged rig/model bytes in Chromium HTTP cache; scene rendering and CDN behavior are unmeasured.' },
  http: [], network: [], actions: [], checks: [], errors: [], pageErrors: [], unexpectedRequests: [],
};
const save = () => writeFileSync(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
const check = (id, pass, evidence) => { report.checks.push({ id, pass: Boolean(pass), evidence }); save(); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`); };
const identity = fixture => ({ sha256: fixture.sha256, bytes: fixture.bytes });
const files = new Map();
const update = (path, fixture, status = 200) => {
  files.set(path, { fixture, status });
  report.actions.push({ action: 'server-resource', path, status, source: fixture.path, sha256: fixture.sha256, at: new Date().toISOString() });
};
const html = Buffer.from(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Asset cache verification</title>
<script type="module">
import { readAssetBytes } from '/runtime/asset-bytes.js';
window.assetCacheRead = async (url, expected) => {
  const started = performance.now();
  try {
    const value = await readAssetBytes(new URL(url, location.href), expected, AbortSignal.timeout(10000));
    return { ok: true, bytes: value.bytes.byteLength, sha256: value.sha256, elapsedMs: performance.now() - started };
  } catch (error) { return { ok: false, name: error.name, message: error.message, elapsedMs: performance.now() - started }; }
};
</script></html>`);
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const item = { at: new Date().toISOString(), path: url.pathname, query: url.search, method: request.method,
    requestHeaders: { cacheControl: request.headers['cache-control'] ?? null, pragma: request.headers.pragma ?? null,
      ifNoneMatch: request.headers['if-none-match'] ?? null }, status: null, bodyBytes: 0, bodySha256: null };
  report.http.push(item);
  response.on('finish', () => { item.finished = true; });
  let body, status = 200, headers = {};
  if (url.pathname === '/') { body = html; headers = { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' }; }
  else if (url.pathname === '/runtime/asset-bytes.js') { body = source; headers = { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' }; }
  else if (url.pathname === '/favicon.ico') { body = Buffer.alloc(0); status = 204; }
  else {
    const resource = files.get(url.pathname);
    if (!resource) { body = Buffer.from('Not found'); status = 404; headers['Cache-Control'] = 'no-store'; }
    else {
      body = resource.fixture.body; status = resource.status;
      const etag = '"' + resource.fixture.sha256 + '"';
      headers = { 'Content-Type': url.pathname.endsWith('.glb') ? 'model/gltf-binary' : 'application/json',
        'Cache-Control': 'public, max-age=3600, immutable', ETag: etag };
      if (status === 200 && request.headers['if-none-match'] === etag) { status = 304; body = Buffer.alloc(0); }
      item.resourceSha256 = resource.fixture.sha256;
    }
  }
  item.status = status; item.responseHeaders = headers;
  item.bodyBytes = body.length; item.bodySha256 = sha(body);
  response.writeHead(status, { ...headers, 'Content-Length': body.length }); response.end(body);
});
let browser, context, page;
const matching = (path, hash) => report.http.filter(item => item.path === path && (hash === undefined || new URLSearchParams(item.query).get('sha256') === hash));
const correct = (result, fixture) => result.ok && result.bytes === fixture.bytes && result.sha256 === fixture.sha256;
async function read(label, path, expected) {
  const result = await page.evaluate(({ path, expected }) => window.assetCacheRead(path, expected), { path, expected });
  report.actions.push({ action: 'production-read', label, path, expected: expected ?? null, result, at: new Date().toISOString() }); save();
  return result;
}
async function prime(label, path, expected) {
  const result = await page.evaluate(async ({ path, expected }) => {
    const url = new URL(path, location.href); url.searchParams.set('sha256', expected.sha256);
    const response = await fetch(url, { cache: 'default', signal: AbortSignal.timeout(10000) });
    const bytes = await response.arrayBuffer();
    const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
    return { status: response.status, bytes: bytes.byteLength, sha256 };
  }, { path, expected });
  report.actions.push({ action: 'native-cache-prime', label, path, expected, result, at: new Date().toISOString() }); save();
  return result;
}
async function section(name, action) {
  try { await action(); }
  catch (error) { report.errors.push({ section: name, name: error.name, message: error.message, stack: error.stack }); check(name + '-completed', false, error.message); }
}
try {
  await new Promise(accept => server.listen(0, '127.0.0.1', accept));
  const origin = `http://127.0.0.1:${server.address().port}`; report.conditions.origin = origin;
  const proxyValue = process.env.HTTPS_PROXY || process.env.HTTP_PROXY, proxy = proxyValue ? new URL(proxyValue) : null;
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox'], ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1,[::1]',
      ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.conditions.browser = browser.version();
  context = await browser.newContext(); page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('request', request => { if (new URL(request.url()).origin !== origin) report.unexpectedRequests.push(request.url()); });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  const requests = new Map();
  cdp.on('Network.requestWillBeSent', event => {
    const item = { id: event.requestId, url: event.request.url, timestamp: event.timestamp };
    report.network.push(item); requests.set(event.requestId, item);
  });
  cdp.on('Network.requestServedFromCache', event => { const item = requests.get(event.requestId); if (item) item.servedFromCache = true; });
  cdp.on('Network.responseReceived', event => { const item = requests.get(event.requestId); if (item) Object.assign(item,
    { status: event.response.status, fromDiskCache: event.response.fromDiskCache, fromServiceWorker: event.response.fromServiceWorker }); });
  cdp.on('Network.loadingFinished', event => { const item = requests.get(event.requestId); if (item) item.encodedDataLength = event.encodedDataLength; });
  cdp.on('Network.loadingFailed', event => { const item = requests.get(event.requestId); if (item) item.error = event.errorText; });
  await page.goto(origin, { waitUntil: 'load' }); await page.waitForFunction(() => typeof window.assetCacheRead === 'function');

  for (const id of ['rig', 'model']) await section('repeat-' + id, async () => {
    const fixture = fixtures[id], path = '/repeat/' + (id === 'model' ? 'traveller.glb' : 'rig.json'); update(path, fixture);
    const first = await read(id + '-cold', path, identity(fixture)), firstCount = matching(path).length;
    const second = await read(id + '-cached', path, identity(fixture)), secondCount = matching(path).length;
    check(id + '-same-sha-reuses-browser-cache', correct(first, fixture) && correct(second, fixture) && firstCount === 1 && secondCount === firstCount,
      { first, second, firstCount, secondCount, requests: matching(path) });
  });
  await section('version-change', async () => {
    const path = '/versions/rig.json?language=en', pathname = '/versions/rig.json'; update(pathname, fixtures.rig);
    const first = await read('original-version', path, identity(fixtures.rig)); update(pathname, fixtures.alternateRig);
    const changed = await read('new-version', path, identity(fixtures.alternateRig));
    const oldAgain = await read('original-cached-version', path, identity(fixtures.rig));
    const requests = matching(pathname);
    check('new-sha-fetches-changed-real-bytes-at-same-path', correct(first, fixtures.rig) && correct(changed, fixtures.alternateRig)
      && correct(oldAgain, fixtures.rig) && requests.length === 2
      && matching(pathname, fixtures.rig.sha256).length === 1 && matching(pathname, fixtures.alternateRig.sha256).length === 1
      && requests.every(item => new URLSearchParams(item.query).get('language') === 'en'), { first, changed, oldAgain, requests });
  });
  await section('integrity-recovery', async () => {
    const path = '/integrity/rig.json', expected = identity(fixtures.alternateRig); update(path, fixtures.rig);
    const primed = await prime('wrong-real-rig', path, expected);
    const rejected = await read('reject-cached-wrong-rig', path, expected), rejectedCount = matching(path).length;
    check('cached-real-bytes-with-wrong-identity-are-rejected', primed.status === 200 && primed.sha256 === fixtures.rig.sha256
      && !rejected.ok && /version mismatch/.test(rejected.message) && rejectedCount === 1, { primed, rejected, rejectedCount });
    update(path, fixtures.alternateRig);
    const recovered = await read('explicit-integrity-retry', path, expected), retryCount = matching(path).length;
    const cached = await read('verified-retry-is-cacheable', path, expected);
    check('explicit-integrity-retry-refreshes-then-reuses-cache', correct(recovered, fixtures.alternateRig) && correct(cached, fixtures.alternateRig)
      && retryCount === 2 && matching(path).length === retryCount, { recovered, cached, retryCount, requests: matching(path) });
  });
  await section('http-error-recovery', async () => {
    const path = '/missing/traveller.glb', expected = identity(fixtures.model); update(path, fixtures.model, 404);
    const primed = await prime('cacheable-http404', path, expected);
    const rejected = await read('reject-cached-http404', path, expected), rejectedCount = matching(path).length;
    check('cacheable-http404-remains-an-explicit-failure', primed.status === 404 && !rejected.ok && /404/.test(rejected.message)
      && rejectedCount === 1, { primed, rejected, rejectedCount });
    update(path, fixtures.model);
    const recovered = await read('explicit-http404-retry', path, expected), retryCount = matching(path).length;
    const cached = await read('recovered-model-is-cacheable', path, expected);
    check('explicit-retry-recovers-cached-http404', correct(recovered, fixtures.model) && correct(cached, fixtures.model)
      && retryCount === 2 && matching(path).length === retryCount, { recovered, cached, retryCount, requests: matching(path) });
  });
  for (const hashQuery of [false, true]) await section('unhashed-' + hashQuery, async () => {
    const pathname = '/unhashed/' + (hashQuery ? 'query-rig.json' : 'rig.json');
    const path = pathname + (hashQuery ? '?sha256=' + fixtures.rig.sha256 : ''); update(pathname, fixtures.rig);
    const first = await read('unhashed-initial', path), revalidated = await read('unhashed-same-bytes', path);
    update(pathname, fixtures.alternateRig); const changed = await read('unhashed-changed-bytes', path);
    const requests = matching(pathname);
    check('unhashed-' + (hashQuery ? 'hash-looking-query' : 'plain-url') + '-revalidates-and-observes-change', correct(first, fixtures.rig)
      && correct(revalidated, fixtures.rig) && correct(changed, fixtures.alternateRig) && requests.length === 3
      && requests[1].status === 304 && requests[1].requestHeaders.ifNoneMatch === '"' + fixtures.rig.sha256 + '"'
      && requests[2].status === 200, { first, revalidated, changed, requests });
  });
  report.resources = await page.evaluate(() => performance.getEntriesByType('resource').map(item => item.toJSON()));
  check('production-module-served-byte-identically', matching('/runtime/asset-bytes.js').length === 1
    && matching('/runtime/asset-bytes.js')[0].bodySha256 === sha(source), matching('/runtime/asset-bytes.js'));
  check('no-page-errors-or-external-requests', report.pageErrors.length === 0 && report.unexpectedRequests.length === 0,
    { pageErrors: report.pageErrors, unexpectedRequests: report.unexpectedRequests });
} catch (error) {
  report.errors.push({ section: 'setup', name: error.name, message: error.message, stack: error.stack });
} finally {
  await context?.close(); await browser?.close(); server.closeAllConnections();
  if (server.listening) await new Promise(accept => server.close(accept));
  report.finishedAt = new Date().toISOString(); save();
}
if (report.errors.length || report.checks.some(item => !item.pass)) process.exitCode = 1;
