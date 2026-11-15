import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const workspace = resolve(root, 'artifacts/realism-01/connector-rig-review');
const target = process.argv[2] || resolve(workspace, 'package');
const remote = target.startsWith('https://');
const packageDirectory = remote ? null : resolve(target);
const output = resolve(process.argv[3] || resolve(workspace, 'qa', new Date().toISOString().replaceAll(':', '-')));
assert(output.startsWith(workspace + sep));
assert(!existsSync(output), 'Use a fresh validation directory');
mkdirSync(output, { recursive: true });
const temporary = resolve(root, 'artifacts/rig-board-tmp');
mkdirSync(temporary, { recursive: true });
process.env.TMPDIR = temporary;
process.env.XDG_CACHE_HOME = resolve(temporary, 'cache');
process.env.XDG_CONFIG_HOME = resolve(temporary, 'config');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const driver = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(resolve(output, 'executed-driver.mjs'), driver);
const report = { target, startedAt: new Date().toISOString(), completed: false,
  driver: { path: relative(root, fileURLToPath(import.meta.url)), sha256: sha(driver) },
  checks: [], viewports: [], pageErrors: [], httpErrors: [],
  limitations: ['Static research-board browser checks establish no walking-route, realism, interaction or physical-device acceptance.'] };
const persist = () => writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
const check = (id, pass, details) => {
  report.checks.push({ id, pass, details }); persist(); assert(pass, id);
};
persist();
let server;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/plain; charset=utf-8' };
if (packageDirectory) {
  server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const path = resolve(packageDirectory, pathname === '/' ? 'index.html' : pathname.slice(1));
    if (!path.startsWith(packageDirectory + sep) || !existsSync(path) || !statSync(path).isFile()) {
      response.writeHead(404); response.end(); return;
    }
    const bytes = readFileSync(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Content-Length': bytes.length });
    response.end(bytes);
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
}
const base = remote ? (target.endsWith('/') ? target : target + '/') : `http://127.0.0.1:${server.address().port}/`;
let browser;
try {
  const proxyAddress = remote ? process.env.HTTPS_PROXY || process.env.HTTP_PROXY : null;
  const proxy = proxyAddress ? new URL(proxyAddress) : null;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1',
      ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.browserVersion = browser.version();
  const requestContext = await browser.newContext();
  const manifestResponse = await requestContext.request.get(new URL('package-manifest.json', base).href);
  assert.equal(manifestResponse.status(), 200);
  const manifestBytes = await manifestResponse.body();
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.id, 'realism-01-kyoto-connector-rig-review');
  const reviewResponse = await requestContext.request.get(new URL('review-data.json', base).href);
  assert.equal(reviewResponse.status(), 200);
  const data = await reviewResponse.json();
  const sourceReports = {};
  for (const path of ['rig/run-01/result.json', 'rig/run-02/result.json', 'coverage/findings.json']) {
    const response = await requestContext.request.get(new URL(path, base).href);
    assert.equal(response.status(), 200);
    sourceReports[path] = await response.json();
  }
  const rig = sourceReports['rig/run-01/result.json'];
  const dense = sourceReports['rig/run-02/result.json'];
  const coverage = sourceReports['coverage/findings.json'];
  const currentMethods = data.methods.filter(method => method.id.endsWith('shared-rig'));
  check('physical-camera-source-measurements', currentMethods.length === 2
    && currentMethods.every((method, index) => {
      const actual = index ? dense : rig;
      return method.physicalPositions === actual.databasePhysicalFrames.length
        && method.virtualImages === actual.features.length && method.modelCount === actual.models.length;
    }), { publishedMethods: currentMethods, actualSourceCounts: [rig.sources.length, dense.sources.length] });
  check('source-coverage-measurements', data.coverage.measures[0].value === String(coverage.completeLocalCollections)
    && data.coverage.measures[1].value === String(coverage.routeCamerasWithin50Metres)
    && data.coverage.measures[2].value === String(coverage.newRouteCamerasWithin50Metres),
  { collections: coverage.completeLocalCollections, near: coverage.routeCamerasWithin50Metres, newNear: coverage.newRouteCamerasWithin50Metres });
  const verified = [];
  for (const file of manifest.files) {
    const response = await requestContext.request.get(new URL(file.path, base).href);
    const bytes = await response.body();
    assert.equal(response.status(), 200, file.path);
    assert.equal(bytes.length, file.bytes, file.path);
    assert.equal(sha(bytes), file.sha256, file.path);
    verified.push(file);
  }
  report.package = { manifestSha256: sha(manifestBytes), verifiedFiles: verified };
  check('package-bytes', verified.length === manifest.files.length && verified.length > 44, { files: verified.length });
  const historicalResponse = await requestContext.request.get(new URL('history/package-20261114.json', base).href);
  assert.equal(historicalResponse.status(), 200);
  const historical = await historicalResponse.json();
  const preserved = historical.files.filter(file => file.path !== 'index.html');
  check('historical-urls-and-bytes', preserved.every(file => manifest.files.some(current => current.path === file.path
    && current.bytes === file.bytes && current.sha256 === file.sha256)), { historicalFilesPreserved: preserved.length });
  const indexBytes = await (await requestContext.request.get(base)).body();
  const expectedIndex = manifest.files.find(file => file.path === 'index.html');
  check('canonical-entry', sha(indexBytes) === expectedIndex.sha256, { indexSha256: sha(indexBytes), expectedSha256: expectedIndex.sha256 });
  await requestContext.close();

  for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', error => { report.pageErrors.push(error.message); persist(); });
    page.on('response', response => { if (response.status() >= 400) { report.httpErrors.push({ url: response.url(), status: response.status() }); persist(); } });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForSelector('html[data-review-ready="true"]');
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const disclosures = page.locator('details');
    assert.equal(await disclosures.count(), 2);
    for (const [index, disclosure] of (await disclosures.all()).entries()) {
      const summary = disclosure.locator('summary');
      const links = disclosure.locator('a');
      const initiallyHidden = !(await links.first().isVisible());
      await summary.click();
      const expanded = await disclosure.evaluate(element => ({ open: element.open,
        width: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth, viewport: innerWidth }));
      const visible = await Promise.all((await links.all()).map(link => link.isVisible()));
      await summary.click();
      const closed = !(await disclosure.evaluate(element => element.open)) && !(await links.first().isVisible());
      check(`disclosure-${index + 1}-${viewport.width}`, initiallyHidden && expanded.open
        && expanded.width <= expanded.viewport && expanded.bodyWidth <= expanded.viewport
        && visible.length > 0 && visible.every(Boolean) && closed,
      { label: await summary.textContent(), initiallyHidden, expanded, visibleLinks: visible.length, closed });
    }
    const observation = await page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      images: [...document.images].map(image => ({ source: image.getAttribute('src'), complete: image.complete,
        naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, width: image.getBoundingClientRect().width,
        x: image.getBoundingClientRect().x, right: image.getBoundingClientRect().right, alt: image.alt })),
      sourcePhotographs: [...document.querySelectorAll('[data-source-photo]')].map(figure => ({ id: figure.dataset.sourcePhoto,
        caption: figure.querySelector('figcaption').textContent })),
      methods: [...document.querySelectorAll('[data-method]')].map(row => ({ id: row.dataset.method, cells: [...row.cells].map(cell => cell.textContent) })),
      measures: document.querySelector('#measures').textContent,
      coverageMeasures: document.querySelector('#coverage-measures').textContent,
      denseSourceCaption: document.querySelector('#dense-sources-caption').textContent,
      denseSourceLinks: [...document.querySelectorAll('#dense-source-links li')].map(item => item.textContent),
      links: [...document.querySelectorAll('a[href],img[src],link[href],script[src]')].map(element => ({
        attribute: element.getAttribute('href') || element.getAttribute('src'), url: element.href || element.src })),
      qualification: document.querySelector('[data-qualification]').textContent,
    }));
    report.viewports.push(observation); persist();
    const label = String(viewport.width);
    check(`images-${label}`, observation.images.length === 6 && observation.images.every(image => image.complete
      && image.naturalWidth > 0 && image.naturalHeight > 0 && image.alt.length > 0), observation.images);
    check(`no-horizontal-overflow-${label}`, observation.scrollWidth <= viewport.width && observation.bodyScrollWidth <= viewport.width
      && observation.images.every(image => image.x >= 0 && image.right <= viewport.width),
    { scrollWidth: observation.scrollWidth, bodyScrollWidth: observation.bodyScrollWidth });
    check(`source-attribution-${label}`, observation.sourcePhotographs.length === data.photographs.length
      && data.photographs.every(source => observation.sourcePhotographs.some(figure => figure.id === source.id
        && figure.caption.includes(source.attribution) && figure.caption.includes(source.license))), observation.sourcePhotographs);
    check(`denser-source-attribution-${label}`, observation.denseSourceCaption.includes('17 February 2026')
      && observation.denseSourceCaption.includes('Irvin Chen / Panoramax Taiwan')
      && observation.denseSourceCaption.includes('CC BY-SA 4.0') && observation.denseSourceLinks.length === dense.sources.length,
    { caption: observation.denseSourceCaption, sources: observation.denseSourceLinks });
    check(`method-measurements-${label}`, observation.methods.length === data.methods.length
      && data.methods.every(method => observation.methods.some(row => row.id === method.id
        && JSON.stringify(row.cells) === JSON.stringify([method.title, method.sourcePositions, method.constraints, method.result]))), observation.methods);
    check(`summary-measurements-${label}`, data.finding.measures.every(item => observation.measures.includes(item.label + item.value))
      && data.coverage.measures.every(item => observation.coverageMeasures.includes(item.label + item.value)),
    { finding: observation.measures, coverage: observation.coverageMeasures });
    check(`qualification-${label}`, observation.qualification.includes('Continuous eastward walking')
      && observation.qualification.includes('remain unqualified'), observation.qualification);
    const localLinks = [...new Set(observation.links.filter(link => new URL(link.url).origin === new URL(base).origin).map(link => link.url))];
    const links = [];
    for (const url of localLinks) {
      const response = await context.request.get(url);
      const bytes = await response.body();
      links.push({ url, status: response.status(), bytes: bytes.length, sha256: sha(bytes) });
    }
    check(`local-links-${label}`, links.length >= 15 && links.every(link => link.status === 200), links);
    await context.close();
  }
  check('page-and-http-errors', report.pageErrors.length === 0 && report.httpErrors.length === 0,
    { pageErrors: report.pageErrors, httpErrors: report.httpErrors });
  report.completed = true;
  report.finishedAt = new Date().toISOString();
  persist();
  console.log(JSON.stringify({ output: relative(root, output), checks: report.checks.length,
    passed: report.checks.every(check => check.pass), files: verified.length }));
} finally {
  await browser?.close();
  await new Promise(accept => server ? server.close(accept) : accept());
  persist();
}
