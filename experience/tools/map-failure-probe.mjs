import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(repository, process.env.MAP_PROBE_OUTPUT || 'artifacts/map-failure');
const dist = resolve(repository, process.env.MAP_PROBE_DIST || 'experience/dist');
mkdirSync(output, { recursive: true });
process.env.TMPDIR = join(output, 'tmp'); mkdirSync(process.env.TMPDIR, { recursive: true });
const assets = new Map();
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) collect(file);
    else assets.set('/' + relative(dist, file), readFileSync(file));
  }
}
collect(dist);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { startedAt: new Date().toISOString(), denied: [], errors: [],
  driverSha256: sha(readFileSync(new URL(import.meta.url))),
  artifact: [...assets].map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) })),
  conditions: { controlledFailure: 'Abort one actual OpenFreeMap raster tile request; all other provider requests remain real.',
    tlsVerification: true, viewport: [1440, 1000] } };
const save = () => writeFileSync(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff': 'font/woff',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const bytes = assets.get(path === '/' ? '/index.html' : path);
  response.writeHead(bytes ? 200 : 404, { 'Content-Type': mime[extname(path === '/' ? '/index.html' : path)] || 'application/octet-stream' });
  response.end(bytes || 'Unavailable');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const proxyValue = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxy = proxyValue ? new URL(proxyValue) : null;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'],
    ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1', ...(proxy.username ? {
      username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.conditions.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  let deny = true;
  await context.route('https://tiles.openfreemap.org/natural_earth/**', route => {
    if (deny && report.denied.length === 0) { report.denied.push(route.request().url()); return route.abort('connectionfailed'); }
    return route.continue();
  });
  await context.addInitScript(() => {
    window.__MAP_STATUS_TRACE__ = [];
    new MutationObserver(() => {
      const value = document.querySelector('#world-map')?.dataset.mapStatus;
      if (value && value !== window.__MAP_STATUS_TRACE__.at(-1)?.value) window.__MAP_STATUS_TRACE__.push({ value, time: performance.now() });
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-map-status'] });
  });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(`${origin}/?qa=1&mode=together&lang=en`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__MAP_STATUS_TRACE__.some(state => state.value === 'error'));
  await page.waitForTimeout(6000);
  const snapshot = () => page.evaluate(() => ({ status: document.querySelector('#world-map').dataset.mapStatus,
    copy: document.querySelector('#scene-status').textContent, retryVisible: !document.querySelector('#scene-retry').hidden,
    trace: window.__MAP_STATUS_TRACE__, map: window.__HOME__.snapshot().map }));
  report.afterDeniedTile = await snapshot(); save();
  if (report.afterDeniedTile.retryVisible) {
    await page.locator('#locale-zh').click();
    report.afterLocale = await snapshot();
    await page.locator('#locale-en').click();
    deny = false;
    await page.locator('#scene-retry').click();
    await page.waitForFunction(() => document.querySelector('#world-map').dataset.mapStatus === 'ready');
    report.afterRetry = await snapshot();
  }
  report.preservedError = report.afterDeniedTile.status === 'error' && report.afterDeniedTile.retryVisible && !report.afterDeniedTile.map.ready;
  report.recovered = report.afterRetry?.status === 'ready';
  const sameView = value => value && JSON.stringify(value.map.center) === JSON.stringify(report.afterDeniedTile.map.center)
    && value.map.zoom === report.afterDeniedTile.map.zoom && value.map.pitch === report.afterDeniedTile.map.pitch
    && JSON.stringify(value.map.places) === JSON.stringify(report.afterDeniedTile.map.places)
    && value.map.cameraTransitions === report.afterDeniedTile.map.cameraTransitions;
  report.localePreservesFailedView = report.afterLocale?.status === 'error' && sameView(report.afterLocale);
  report.retryPreservesView = sameView(report.afterRetry);
  console.log(JSON.stringify({ preservedError: report.preservedError, recovered: report.recovered,
    localePreservesFailedView: report.localePreservesFailedView, retryPreservesView: report.retryPreservesView,
    denied: report.denied.length, trace: report.afterDeniedTile.trace, errors: report.errors }));
  if (!report.preservedError || !report.recovered || !report.localePreservesFailedView || !report.retryPreservesView
      || report.errors.length > 0) process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString(); save();
  await browser?.close();
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
}
