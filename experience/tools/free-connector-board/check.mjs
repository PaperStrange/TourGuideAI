import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const workspace = resolve(root, 'artifacts/realism-01/free-connector-next');
const target = process.argv[2] || resolve(workspace, 'public-package');
const remote = target.startsWith('https://');
const packageDirectory = remote ? null : resolve(target);
const output = resolve(process.argv[3] || resolve(workspace, 'board-qa', new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')));
assert(output.startsWith(workspace + sep));
assert(!existsSync(output));
mkdirSync(output, { recursive: true });
const temporary = resolve(root, 'artifacts/board-tmp');
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
  limitations: ['Static source evidence review only; browser layout checks establish no walking-route or physical-device acceptance.'] };
const persist = () => writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
const check = (id, pass, details) => {
  report.checks.push({ id, pass, details }); persist(); assert(pass, id);
};
persist();
let server;
const types = { '.html': 'text/html; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/plain; charset=utf-8' };
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
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
    ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1',
      ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.browserVersion = browser.version();
  for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
   for (const entry of ['', 'board.html']) {
    const label = `${entry || 'index'}-${viewport.width}`;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', error => { report.pageErrors.push(error.message); persist(); });
    page.on('response', response => { if (response.status() >= 400) { report.httpErrors.push({ url: response.url(), status: response.status() }); persist(); } });
    await page.goto(new URL(entry, base).href, { waitUntil: 'networkidle' });
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const observation = await page.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      images: [...document.images].map(image => ({ source: image.getAttribute('src'), complete: image.complete,
        naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, width: image.getBoundingClientRect().width,
        x: image.getBoundingClientRect().x, right: image.getBoundingClientRect().right, alt: image.alt })),
      captions: [...document.querySelectorAll('figure figcaption')].map(caption => caption.textContent),
      links: [...document.querySelectorAll('a[href],img[src],link[href]')].map(element => ({
        attribute: element.getAttribute('href') || element.getAttribute('src'), url: element.href || element.src })),
      qualification: document.querySelector('.note').textContent,
      geometryResults: document.querySelector('[data-geometry-results]')?.textContent || null,
    }));
    report.viewports.push(observation); persist();
    observation.entry = entry || 'index.html';
    check(`images-${label}`, observation.images.length === (entry ? 4 : 6) && observation.images.every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0 && image.alt.length > 0), observation.images);
    check(`no-horizontal-overflow-${label}`, observation.scrollWidth <= viewport.width && observation.bodyScrollWidth <= viewport.width
      && observation.images.every(image => image.x >= 0 && image.right <= viewport.width), { scrollWidth: observation.scrollWidth, bodyScrollWidth: observation.bodyScrollWidth });
    const photoCaptions = observation.captions.filter(text => text.includes('Irvin Chen / Panoramax Taiwan'));
    check(`attribution-${label}`, photoCaptions.length === 3 && photoCaptions.every(text => text.includes('CC BY-SA 4.0')), photoCaptions);
    check(`qualification-${label}`, observation.qualification.includes('Continuous eastward walking') && observation.qualification.includes('remain unqualified'), observation.qualification);
    if (!entry) check(`geometry-results-${label}`, observation.geometryResults.includes('5 of 12') && observation.geometryResults.includes('83, 224 and 308') && observation.qualification.includes('zero registered 3D models'), observation.geometryResults);
    const localLinks = [...new Set(observation.links.filter(link => new URL(link.url).origin === new URL(base).origin).map(link => link.url))];
    const links = [];
    for (const url of localLinks) {
      const response = await context.request.get(url);
      const bytes = await response.body();
      links.push({ url, status: response.status(), bytes: bytes.length, sha256: sha(bytes) });
    }
    check(`local-links-${label}`, links.length === (entry ? 7 : 10) && links.every(link => link.status === 200), links);
    await context.close();
   }
  }
  const context = await browser.newContext();
  const manifestResponse = await context.request.get(new URL('package-manifest.json', base).href);
  assert.equal(manifestResponse.status(), 200);
  const manifestBytes = await manifestResponse.body();
  const manifest = JSON.parse(manifestBytes);
  const verified = [];
  for (const file of manifest.files) {
    const response = await context.request.get(new URL(file.path, base).href);
    const bytes = await response.body();
    assert.equal(response.status(), 200, file.path);
    assert.equal(bytes.length, file.bytes, file.path);
    assert.equal(sha(bytes), file.sha256, file.path);
    verified.push(file);
  }
  report.package = { manifestSha256: sha(manifestBytes), verifiedFiles: verified };
  check('package-bytes', verified.length === 44, { files: verified.length });
  const indexBytes = await (await context.request.get(base)).body();
  const expectedIndex = manifest.files.find(file => file.path === 'index.html');
  check('canonical-entry', sha(indexBytes) === expectedIndex.sha256, { indexSha256: sha(indexBytes), expectedSha256: expectedIndex.sha256 });
  await context.close();
  check('page-and-http-errors', report.pageErrors.length === 0 && report.httpErrors.length === 0, { pageErrors: report.pageErrors, httpErrors: report.httpErrors });
  report.completed = true;
  report.finishedAt = new Date().toISOString();
  persist();
  console.log(JSON.stringify({ output: relative(root, output), checks: report.checks.length, passed: report.checks.every(check => check.pass), files: verified.length }));
} finally {
  await browser?.close();
  await new Promise(accept => server ? server.close(accept) : accept());
  persist();
}
