import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const workspace = resolve(root, 'artifacts/realism-01/connector-surface-review');
const target = process.argv[2];
const output = resolve(process.argv[3]);
assert(target && output.startsWith(workspace + sep) && !existsSync(output));
mkdirSync(output, { recursive: true });
const temporary = resolve(root, 'artifacts/surface-browser-tmp');
mkdirSync(temporary, { recursive: true });
process.env.TMPDIR = temporary;
process.env.XDG_CACHE_HOME = resolve(temporary, 'cache');
process.env.XDG_CONFIG_HOME = resolve(temporary, 'config');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const driver = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(resolve(output, 'executed-driver.mjs'), driver);
const report = { target, startedAt: new Date().toISOString(), completed: false,
  driver: { path: relative(root, fileURLToPath(import.meta.url)), sha256: sha(driver) },
  checks: [], views: [], screenshots: [], pageErrors: [], httpErrors: [],
  limitations: ['Actual cloud-browser control and file checks; no physical-device timing, complete-route or human realism acceptance.'] };
const persist = () => writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
const check = (id, pass, details) => { report.checks.push({ id, pass, details }); persist(); assert(pass, id); };
persist();
let server, browser;
const remote = target.startsWith('https://');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
if (!remote) {
  const directory = resolve(target);
  server = createServer((request, response) => {
    const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filename = resolve(directory, name === '/' ? 'index.html' : name.slice(1));
    if (!filename.startsWith(directory + sep) || !existsSync(filename) || !statSync(filename).isFile()) {
      response.writeHead(404); response.end(); return;
    }
    const bytes = readFileSync(filename);
    response.writeHead(200, { 'Content-Type': mime[extname(filename)] || 'application/octet-stream', 'Content-Length': bytes.length });
    response.end(bytes);
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
}
const base = remote ? (target.endsWith('/') ? target : target + '/') : `http://127.0.0.1:${server.address().port}/`;
try {
  const proxy = remote && (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) ? new URL(process.env.HTTPS_PROXY || process.env.HTTP_PROXY) : null;
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1',
      ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.browserVersion = browser.version();
  report.rendererCondition = 'Chromium ANGLE SwiftShader software renderer; ordinary native input and actual WebGL draws';
  const network = await browser.newContext();
  const manifestResponse = await network.request.get(new URL('package-manifest.json', base).href);
  assert.equal(manifestResponse.status(), 200);
  const manifestBytes = await manifestResponse.body();
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.id, 'realism-01-kyoto-surface-review');
  const dataResponse = await network.request.get(new URL('surface-data.json', base).href);
  assert.equal(dataResponse.status(), 200);
  const data = await dataResponse.json();
  assert(data.model.status === 'textured' || data.model.status === 'untextured');
  const verified = [];
  for (const file of manifest.files) {
    const response = await network.request.get(new URL(file.path, base).href);
    const bytes = await response.body();
    assert.equal(response.status(), 200, file.path); assert.equal(bytes.length, file.bytes, file.path); assert.equal(sha(bytes), file.sha256, file.path);
    verified.push(file);
  }
  report.package = { manifestSha256: sha(manifestBytes), verifiedFiles: verified };
  check('published-package-bytes', verified.length === manifest.files.length, { files: verified.length });
  const historical = await (await network.request.get(new URL('history/package-20261115.json', base).href)).json();
  check('historical-asset-bytes', historical.files.filter(file => file.path !== 'index.html').every(file =>
    manifest.files.some(current => current.path === file.path && current.bytes === file.bytes && current.sha256 === file.sha256)),
  { preservedContentFiles: historical.files.length - 1 });
  const indexBytes = await (await network.request.get(base)).body();
  check('canonical-entry', sha(indexBytes) === manifest.files.find(file => file.path === 'index.html').sha256, { sha256: sha(indexBytes) });
  await network.close();
  const maxError = (left, right) => Math.max(...left.map((value, index) => Math.abs(value - right[index])));
  for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
    const label = String(viewport.width);
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.setDefaultTimeout(180000);
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    page.on('pageerror', error => { report.pageErrors.push(error.message); persist(); });
    page.on('response', response => { if (response.status() >= 400) { report.httpErrors.push({ url: response.url(), status: response.status() }); persist(); } });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForSelector('html[data-review-ready="true"]');
    const snapshot = () => page.evaluate(() => window.__surfaceReview.snapshot());
    const initial = await snapshot();
    const initialResources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => ({
      name: entry.name, initiatorType: entry.initiatorType, encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize, transferSize: entry.transferSize })));
    check(`lazy-surface-${label}`, !initial.loaded && !requests.some(url => url.includes('/surface/model/')),
      { initial, modelRequests: requests.filter(url => url.includes('/surface/model/')) });
    const source = await page.locator('#source-photo').evaluate(image => ({ complete: image.complete, width: image.naturalWidth, height: image.naturalHeight }));
    check(`original-photograph-${label}`, source.complete && source.width === data.views[0].width && source.height === data.views[0].height, source);
    await page.evaluate(() => { window.__trustedSurfaceEvents = []; for (const type of ['click', 'keydown', 'pointerdown']) document.addEventListener(type, event => window.__trustedSurfaceEvents.push({ type, trusted: event.isTrusted, target: event.target.id, key: event.key || null }), true); });
    await page.locator('#load-surface').click();
    await page.waitForSelector('html[data-surface-ready="true"]', { timeout: 300000 });
    await page.waitForLoadState('networkidle');
    const ready = await snapshot();
    const resourcesAfterLoad = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => ({
      name: entry.name, initiatorType: entry.initiatorType, encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize, transferSize: entry.transferSize })));
    const explicitResources = resourcesAfterLoad.slice(initialResources.length);
    const allocations = ready.allocations;
    check(`allocation-observations-${label}`, allocations.textures.length === data.model.textures.length
      && allocations.rendererTextureCount === data.model.textures.length
      && allocations.textures.every(texture => texture.width === data.model.atlasWidth && texture.height === data.model.atlasHeight && texture.generateMipmaps)
      && allocations.drawingBufferWidth > 0 && allocations.drawingBufferHeight > 0 && allocations.physicalAllocationKnown === false, allocations);
    const modelResources = explicitResources.filter(entry => entry.name.includes('/surface/model/'));
    check(`explicit-model-transfer-${label}`, modelResources.length === 2
      && modelResources.reduce((sum, entry) => sum + entry.decodedBodySize, 0) === data.model.bytes,
    { initialResources, explicitResources, initialResourceEncodedBytes: initialResources.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
      explicitResourceEncodedBytes: explicitResources.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
      actualModelDecodedBytes: modelResources.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
      limitations: 'Actual browser resource-size boundaries; headers, document transfer and optional later evidence views are separate. No timing acceptance.' });
    check(`decoded-surface-${label}`, ready.loaded && ready.meshTriangles === data.model.triangles
      && ready.renderer.triangles > 0 && ready.renderer.calls > 0 && (data.model.status !== 'textured' || ready.texturedMeshes > 0), ready);
    check(`matched-source-camera-${label}`, maxError(ready.camera.world, ready.camera.expectedSourceWorld) < 1e-8,
      { maximumAbsoluteError: maxError(ready.camera.world, ready.camera.expectedSourceWorld), camera: ready.camera });
    check(`native-material-convention-${label}`, ready.materials.length > 0 && ready.materials.every(material => material.opacity === 1 && !material.transparent), ready.materials);
    const verifyProjection = async view => {
      const observed = await page.evaluate(() => window.__surfaceReview.projectReferences());
      assert.equal(observed.length, view.projectionReferences.length);
      assert(observed.length > 5);
      const error = Math.max(...observed.map((point, index) => {
        assert.equal(point.pointId, view.projectionReferences[index].pointId);
        return maxError(point.pixel, view.projectionReferences[index].expectedPixel);
      }));
      check(`native-projection-${view.rank}-${label}`, error < 1e-7,
        { sourceView: view.id, originalPixels: [view.width, view.height], projectedPoints: observed.length, maximumPixelError: error,
          referenceMethod: data.projectionConvention });
    };
    await verifyProjection(data.views[0]);
    const pixels = await page.locator('#surface-canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2'); const values = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, values);
      let foreground = 0; for (let index = 0; index < values.length; index += 4) if (Math.abs(values[index] - 230) > 2 || Math.abs(values[index + 1] - 236) > 2 || Math.abs(values[index + 2] - 229) > 2) foreground += 1;
      return { pixels: values.length / 4, foreground, width: gl.drawingBufferWidth, height: gl.drawingBufferHeight };
    });
    check(`actual-surface-pixels-${label}`, pixels.foreground > 100, pixels);
    const screenshotPath = resolve(output, `surface-${label}.png`);
    await page.locator('#surface-canvas').screenshot({ path: screenshotPath });
    const screenshotBytes = readFileSync(screenshotPath);
    report.screenshots.push({ path: `surface-${label}.png`, bytes: screenshotBytes.length, sha256: sha(screenshotBytes) }); persist();
    await page.locator('#turn-left').click();
    const turned = await snapshot();
    check(`native-turn-${label}`, turned.draws > ready.draws && maxError(turned.camera.world, ready.camera.world) > 1e-4, turned);
    await page.locator('#reset').click();
    await page.waitForFunction(() => !window.__surfaceReview.snapshot().viewPending && !window.__surfaceReview.snapshot().inspecting);
    const reset = await snapshot();
    check(`reset-source-camera-${label}`, maxError(reset.camera.world, ready.camera.world) < 1e-8, reset);
    await page.locator('#surface-canvas').focus();
    await page.keyboard.press('ArrowRight');
    const keyboard = await snapshot();
    check(`native-keyboard-${label}`, keyboard.draws > reset.draws && maxError(keyboard.camera.world, reset.camera.world) > 1e-4, keyboard);
    await page.keyboard.press('Home');
    await page.waitForFunction(() => !window.__surfaceReview.snapshot().viewPending && !window.__surfaceReview.snapshot().inspecting);
    const box = await page.locator('#surface-canvas').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.52, { steps: 5 }); await page.mouse.up();
    const dragged = await snapshot();
    check(`native-drag-${label}`, maxError(dragged.camera.world, ready.camera.world) > 1e-4 && dragged.draws > keyboard.draws, dragged);
    await page.locator('#reset').click();
    await page.waitForFunction(() => !window.__surfaceReview.snapshot().viewPending && !window.__surfaceReview.snapshot().inspecting);
    const beforeZoom = await snapshot();
    await page.locator('#zoom-in').click();
    const zoomed = await snapshot();
    check(`native-zoom-${label}`, maxError(zoomed.camera.world, beforeZoom.camera.world) > 1e-4 && zoomed.draws > beforeZoom.draws
      && zoomed.orbitDistance < beforeZoom.orbitDistance, zoomed);
    await page.locator('#show-photo').click();
    await page.waitForFunction(() => window.__surfaceReview.snapshot().mode === 'photo');
    check(`source-comparison-${label}`, await page.locator('#source-photo').isVisible()
      && !(await page.locator('#surface-canvas').isVisible()), await snapshot());
    await page.locator('#view').focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    await page.waitForFunction(id => !window.__surfaceReview.snapshot().viewPending && window.__surfaceReview.snapshot().selectedView === id, data.views[1].id);
    await page.locator('#show-surface').click();
    const changedView = await snapshot();
    check(`native-capture-choice-${label}`, changedView.selectedView === data.views[1].id
      && maxError(changedView.camera.world, changedView.camera.expectedSourceWorld) < 1e-8, changedView);
    await verifyProjection(data.views[1]);
    for (const view of data.views.slice(2)) {
      await page.locator('#view').focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
      await page.waitForFunction(id => !window.__surfaceReview.snapshot().viewPending && window.__surfaceReview.snapshot().selectedView === id, view.id);
      await verifyProjection(view);
    }
    const beforeLocale = await snapshot();
    await page.locator('#language').click();
    const chinese = await page.evaluate(() => ({ lang: document.documentElement.lang, title: document.querySelector('h1').textContent,
      reset: document.querySelector('#reset').textContent, guidance: document.querySelector('.guidance').textContent,
      qualification: document.querySelector('.qualification').textContent, controls: [...document.querySelectorAll('#controls button')].map(button => button.textContent) }));
    check(`chinese-guidance-${label}`, chinese.lang === 'zh-CN' && chinese.title === '走近京都的建筑'
      && chinese.reset === '恢复拍摄视角' && chinese.guidance.includes('方向键') && chinese.qualification.includes('1.35'), chinese);
    const localeState = await snapshot();
    check(`locale-keeps-camera-${label}`, maxError(localeState.camera.world, beforeLocale.camera.world) === 0, localeState);
    await page.locator('#language').click();
    check(`english-guidance-${label}`, await page.locator('html').getAttribute('lang') === 'en'
      && await page.locator('#reset').textContent() === 'Reset view', { language: (await snapshot()).language });
    const idleStart = await snapshot(); await page.waitForTimeout(250); const idleEnd = await snapshot();
    check(`idle-frame-plateau-${label}`, idleStart.draws === idleEnd.draws, { before: idleStart.draws, after: idleEnd.draws });
    await page.locator('#evidence summary').click();
    const anchors = page.locator('#evidence a');
    check(`evidence-disclosure-${label}`, await page.locator('#evidence').evaluate(node => node.open)
      && (await Promise.all((await anchors.all()).map(anchor => anchor.isVisible()))).every(Boolean), { links: await anchors.count() });
    const layout = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth, buttons: [...document.querySelectorAll('button')].filter(button => !button.hidden).map(button => ({ id: button.id, width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
      links: [...document.querySelectorAll('a[href]')].map(anchor => anchor.href), events: window.__trustedSurfaceEvents }));
    check(`layout-${label}`, layout.document <= viewport.width && layout.body <= viewport.width, layout);
    check(`trusted-input-${label}`, layout.events.length > 10 && layout.events.every(event => event.trusted), layout.events);
    for (const url of layout.links.filter(url => new URL(url).origin === new URL(base).origin)) assert.equal((await context.request.get(url)).status(), 200, url);
    report.views.push({ viewport, ready, source, pixels, changedView, chinese, layout, initialResources, explicitResources }); persist();
    await context.close();
  }
  check('page-and-http-errors', report.pageErrors.length === 0 && report.httpErrors.length === 0,
    { pageErrors: report.pageErrors, httpErrors: report.httpErrors });
  report.completed = true; report.finishedAt = new Date().toISOString(); persist();
  console.log(JSON.stringify({ output: relative(root, output), checks: report.checks.length, passed: true, files: report.package.verifiedFiles.length }));
} finally {
  await browser?.close();
  await new Promise(accept => server ? server.close(accept) : accept());
  persist();
}
