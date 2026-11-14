// 使用实际页面、浏览器输入和发布资产验证公开评审入口。
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { gzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('../../', import.meta.url));
const target = process.argv[2];
assert(target, 'Usage: node experience/tests/browser-review-transport.mjs <package-directory|https-entry-url> [output-directory] [approved-reference-directory|reference-https-entry-url]');
const remote = target.startsWith('https://');
const packageDirectory = remote ? null : realpathSync(resolve(target));
const referenceTarget = process.argv[4] || null;
const referenceDirectory = referenceTarget && !referenceTarget.startsWith('https://') ? realpathSync(resolve(referenceTarget)) : null;
assert(!referenceTarget || remote === referenceTarget.startsWith('https://'), 'Compared entries must both use local packages or public HTTPS.');
const outputRoot = resolve(root, 'artifacts/realism-01/review-transport/qa');
const outputParent = resolve(process.argv[3] || outputRoot);
assert(outputParent === outputRoot || outputParent.startsWith(outputRoot + sep), 'QA output must stay inside its ignored workspace directory.');
const attempt = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const output = resolve(outputParent, attempt);
mkdirSync(output, { recursive: true });
const driverBytes = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(resolve(output, 'executed-driver.mjs'), driverBytes);
const temporary = resolve(root, 'artifacts/review-transport-tmp');
mkdirSync(temporary, { recursive: true });
process.env.TMPDIR = temporary;
process.env.XDG_CONFIG_HOME = resolve(temporary, 'config');
process.env.XDG_CACHE_HOME = resolve(temporary, 'cache');
const timeout = Number(process.env.REVIEW_QA_TIMEOUT || 240000);
const tourTimeout = Number(process.env.REVIEW_QA_TOUR_TIMEOUT || timeout);
const sections = (process.env.REVIEW_QA_ONLY || 'shell,module-recovery,desktop,cancellation,paged-cancellation,recovery,phone,tour-endpoints').split(',');
assert(sections.every(value => ['transport', 'shell', 'module-recovery', 'desktop', 'cancellation', 'paged-cancellation', 'recovery', 'phone', 'tour', 'tour-endpoints'].includes(value)));
// 原生隐藏页检查单独运行，使用没有 Playwright 焦点模拟的默认浏览器上下文。
assert(!sections.includes('tour') || process.env.REVIEW_QA_NATIVE_CONTEXT === '1', 'The tour section requires REVIEW_QA_NATIVE_CONTEXT=1 and an authenticated X display.');
assert(process.env.REVIEW_QA_NATIVE_CONTEXT !== '1' || (sections.length === 1 && sections[0] === 'tour'), 'Native default-context runs contain only the tour section.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = {
  startedAt: new Date().toISOString(), completed: false, target, referenceTarget, output: relative(root, output),
  driver: { path: relative(root, fileURLToPath(import.meta.url)), sha256: sha(driverBytes) },
  environment: { node: process.version, browser: null, renderer: null, sections, timeoutMs: timeout, tourTimeoutMs: tourTimeout,
    desktop: { width: 1440, height: 1000 }, phone: { width: 390, height: 844 }, deviceScaleFactor: 1 },
  packageFiles: [], referencePackageFiles: [], checks: [], sections: {}, scenarios: {}, screenshots: [], requests: [], responses: [], failures: [], network: [], transfer: {},
  console: [], pageErrors: [], serverEvents: [], limitations: [
    'Chromium uses a cloud software renderer. These results do not establish physical-device frame rate, memory, or enjoyment.',
    'Phone input uses trusted Chromium touch events in an emulated viewport; a physical phone is not available.',
    'Intentional transport faults affect actual asset requests. Successful loads use packaged or hosted source bytes.',
    'First visible rendering does not establish that every detail has finished streaming.',
    'CDP transfer totals include encoded response bytes and observed response headers; request headers, TLS/TCP overhead, worker memory and physical-device timing are outside this measurement.',
  ],
};
if (process.env.REVIEW_QA_TRUST_RECEIPT) {
  const receiptPath = resolve(process.env.REVIEW_QA_TRUST_RECEIPT);
  assert(receiptPath.startsWith(outputRoot + sep));
  const bytes = readFileSync(receiptPath);
  report.environment.trustReceipt = { path: relative(root, receiptPath), sha256: sha(bytes), content: JSON.parse(bytes) };
}
const persist = () => writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, pass, evidence, category = 'functional') {
  report.checks.push({ id, pass: Boolean(pass), category, evidence }); persist();
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`);
}
async function identifyFile(file, base) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  return { path: relative(base, file), bytes: statSync(file).size, sha256: hash.digest('hex') };
}
async function inventory(directory, base = directory, records = report.packageFiles) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await inventory(path, base, records);
    else if (entry.isFile()) records.push(await identifyFile(path, base));
  }
}
const transport = { failPath: null, failed: false, delayPath: null, delayPrefix: null };
let server, browser, nativeBrowserProcess, browserProxy, entry, referenceEntry, manifest, originalUrl, streamedUrl;
const pendingResponses = new Set();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.gz': 'application/gzip' };
const isChunkUrl = url => /\.radc(?:\.gz)?$/.test(new URL(url).pathname);

async function startLocalServer() {
  await inventory(packageDirectory);
  if (referenceDirectory) await inventory(referenceDirectory, referenceDirectory, report.referencePackageFiles);
  const prefix = '/review-package/';
  const referencePrefix = '/reference-package/';
  const compressedText = new Map();
  server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    const selectedRoot = pathname.startsWith(referencePrefix) ? referenceDirectory : packageDirectory;
    const selectedPrefix = pathname.startsWith(referencePrefix) ? referencePrefix : prefix;
    const file = selectedRoot && resolve(selectedRoot, pathname.slice(selectedPrefix.length));
    if (!selectedRoot || !pathname.startsWith(selectedPrefix) || !file.startsWith(selectedRoot + sep) || !existsSync(file) || !statSync(file).isFile()) {
      report.serverEvents.push({ at: Date.now(), path: pathname, status: 404 }); response.writeHead(404); response.end(); return;
    }
    if (pathname === transport.failPath && !transport.failed) {
      transport.failed = true;
      report.serverEvents.push({ at: Date.now(), path: pathname, status: 503, intentional: true });
      response.writeHead(503, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); response.end('QA transport interruption'); return;
    }
    if (pathname === transport.delayPath || (transport.delayPrefix && pathname.startsWith(transport.delayPrefix) && isChunkUrl('http://localhost' + pathname))) {
      report.serverEvents.push({ at: Date.now(), path: pathname, delayedMs: 5000, intentional: true });
      await new Promise(accept => setTimeout(accept, 5000));
      if (response.destroyed) return;
    }
    // 文本响应使用 gzip；已压缩的场景块按原始文件字节发送。
    if (['.html', '.js', '.css', '.json', '.svg'].includes(extname(file))) {
      if (!compressedText.has(file)) compressedText.set(file, gzipSync(readFileSync(file), { level: 9 }));
      const bytes = compressedText.get(file);
      response.writeHead(200, { 'Content-Type': mime[extname(file)], 'Content-Encoding': 'gzip', 'Content-Length': bytes.length, 'Cache-Control': 'no-store' });
      response.end(bytes); return;
    }
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Length': statSync(file).size, 'Cache-Control': 'no-store' });
    const stream = createReadStream(file);
    stream.on('error', error => { report.serverEvents.push({ at: Date.now(), path: pathname, error: error.message }); response.destroy(error); });
    response.on('close', () => stream.destroy()); stream.pipe(response);
  });
  await new Promise(accept => server.listen(0, '127.0.0.1', accept));
  const entryName = process.env.REVIEW_QA_ENTRY || (existsSync(resolve(packageDirectory, 'index.html')) ? 'index.html' : 'realism-review.html');
  if (referenceDirectory) referenceEntry = `http://127.0.0.1:${server.address().port}${referencePrefix}index.html`;
  return `http://127.0.0.1:${server.address().port}${prefix}${entryName}`;
}
const snapshot = page => page.evaluate(() => window.__REALISM_REVIEW__?.snapshot());
const sameCamera = (left, right) => left?.matrixWorld?.length === 16 && right?.matrixWorld?.length === 16
  && left?.projectionMatrix?.length === 16 && right?.projectionMatrix?.length === 16
  && left.matrixWorld.every((value, index) => Math.abs(value - right.matrixWorld[index]) < 1e-7)
  && left.projectionMatrix.every((value, index) => Math.abs(value - right.projectionMatrix[index]) < 1e-7);
async function visibleScene(page, variant) {
  await page.waitForFunction(expected => {
    const view = window.__REALISM_REVIEW__?.snapshot();
    return view?.firstView && (!expected || view.variant === expected) && view.status !== 'error';
  }, variant, { timeout });
  return renderedView(page);
}
async function renderedView(page, afterFrame = -1) {
  await page.waitForFunction(previousFrame => {
    const view = window.__REALISM_REVIEW__?.snapshot();
    const drawn = view?.drawnView;
    return drawn?.frames > previousFrame && drawn.variant === view.variant && view.drawnSplats > 0
      && view.matrixWorld.every((value, index) => Math.abs(value - drawn.matrixWorld[index]) < 1e-7)
      && view.projectionMatrix.every((value, index) => Math.abs(value - drawn.projectionMatrix[index]) < 1e-7);
  }, afterFrame, { timeout });
  return snapshot(page);
}
const drawnCamera = view => ({ matrixWorld: view.drawnView.matrixWorld,
  projectionMatrix: view.drawnView.projectionMatrix, position: view.drawnView.matrixWorld.slice(12, 15) });
async function submittedTourFrame(page, afterFrame = -1) {
  // 播放期间下一个请求姿态可以领先，运动证据使用已经提交的画面。
  await page.waitForFunction(previous => {
    const view = window.__REALISM_REVIEW__?.snapshot();
    return view?.firstView && !['error', 'loading'].includes(view.status)
      && view.drawnView?.frames > previous && view.drawnView.variant === view.variant && view.drawnView.drawnSplats > 0;
  }, afterFrame, { timeout });
  return snapshot(page);
}
async function screenshot(page, name) {
  const bytes = await page.screenshot({ path: resolve(output, name + '.jpg'), type: 'jpeg', quality: 88, fullPage: true, timeout: 120000 });
  report.screenshots.push({ path: name + '.jpg', bytes: bytes.length, sha256: sha(bytes) }); persist();
}
async function newPage(name, phone = false) {
  const nativeContext = process.env.REVIEW_QA_NATIVE_CONTEXT === '1';
  assert(!nativeContext || !phone, 'Native default context is reserved for desktop visibility checks.');
  const context = nativeContext ? browser.contexts()[0] : await browser.newContext({ viewport: phone ? report.environment.phone : report.environment.desktop,
    deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, locale: 'en-US' });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  if (nativeContext) await page.setViewportSize(report.environment.desktop);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable', { maxTotalBufferSize: 128 * 1024 * 1024, maxResourceBufferSize: 40 * 1024 * 1024 });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Performance.enable');
  const network = new Map();
  cdp.on('Network.requestWillBeSent', event => {
    const record = { scenario: name, requestId: event.requestId, url: event.request.url, startedAt: event.timestamp,
      responseAt: null, headerBytes: 0, data: [], finishedAt: null, totalEncodedBytes: null, failedAt: null };
    network.set(event.requestId, record); report.network.push(record);
  });
  cdp.on('Network.responseReceived', event => {
    const record = network.get(event.requestId); if (!record) return;
    record.responseAt = event.timestamp; record.status = event.response.status;
    record.headerBytes = event.response.encodedDataLength; record.mimeType = event.response.mimeType;
    record.fromDiskCache = event.response.fromDiskCache; record.fromServiceWorker = event.response.fromServiceWorker;
  });
  cdp.on('Network.dataReceived', event => {
    network.get(event.requestId)?.data.push({ timestamp: event.timestamp, dataLength: event.dataLength, encodedDataLength: event.encodedDataLength });
  });
  cdp.on('Network.loadingFinished', event => {
    const record = network.get(event.requestId); if (!record) return;
    record.finishedAt = event.timestamp; record.totalEncodedBytes = event.encodedDataLength;
  });
  cdp.on('Network.loadingFailed', event => {
    const record = network.get(event.requestId); if (!record) return;
    record.failedAt = event.timestamp; record.error = event.errorText; record.canceled = event.canceled;
  });
  page.on('request', request => report.requests.push({ scenario: name, at: Date.now(), url: request.url(), method: request.method(), type: request.resourceType(), external: new URL(request.url()).origin !== new URL(entry).origin }));
  page.on('requestfailed', request => report.failures.push({ scenario: name, at: Date.now(), url: request.url(), error: request.failure()?.errorText }));
  page.on('console', message => report.console.push({ scenario: name, at: Date.now(), type: message.type(), text: message.text() }));
  page.on('pageerror', error => report.pageErrors.push({ scenario: name, at: Date.now(), message: error.message }));
  page.on('response', response => {
    const item = { scenario: name, at: Date.now(), url: response.url(), status: response.status(), headers: response.headers() };
    report.responses.push(item);
    const task = (async () => {
      try { const bytes = await response.body(); item.bytes = bytes.length; item.sha256 = sha(bytes); }
      catch (error) { item.bodyUnavailable = error.message; }
    })();
    pendingResponses.add(task); task.finally(() => pendingResponses.delete(task));
  });
  return { page, context, cdp };
}

async function launchNativeBrowser(proxy) {
  assert(process.env.DISPLAY, 'A real X display is required for native visibility.');
  assert(!proxy?.username && !proxy?.password, 'Native browser requires a proxy without embedded credentials.');
  const profile = resolve(temporary, `native-${Date.now().toString(36)}-${process.pid}`); mkdirSync(profile, { recursive: true });
  const args = ['--no-sandbox', '--no-first-run', '--no-default-browser-check', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--force-color-profile=srgb',
    '--disable-background-networking', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, ...(proxy ? [`--proxy-server=${proxy.origin}`, '--proxy-bypass-list=localhost;127.0.0.1'] : []), 'about:blank'];
  report.environment.nativeBrowser = { args, noDefaults: true, reason: 'Native tab visibility with Playwright focus emulation absent' };
  nativeBrowserProcess = spawn(process.env.CHROMIUM_PATH || '/usr/bin/chromium', args, { env: { ...process.env }, stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((accept, reject) => {
    let diagnostic = '';
    const timer = setTimeout(() => reject(new Error(`Native Chromium DevTools endpoint timeout: ${diagnostic}`)), 30000);
    nativeBrowserProcess.once('error', error => { clearTimeout(timer); reject(error); });
    nativeBrowserProcess.once('exit', code => { clearTimeout(timer); reject(new Error(`Native Chromium exited ${code}: ${diagnostic}`)); });
    nativeBrowserProcess.stderr.on('data', bytes => {
      diagnostic += bytes;
      const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(diagnostic);
      if (match) { clearTimeout(timer); accept(match[1]); }
    });
  });
  return chromium.connectOverCDP(endpoint, { noDefaults: true });
}
async function checkLayout(page, id) {
  const layout = await page.evaluate(() => ({ viewport: innerWidth, body: document.body.scrollWidth, document: document.documentElement.scrollWidth,
    canvas: (() => { const box = document.querySelector('#review-canvas').getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height }; })(),
    language: document.documentElement.lang }));
  check(id, Math.max(layout.body, layout.document) <= layout.viewport + 1 && layout.canvas.width > 200 && layout.canvas.height > 150, layout);
}
async function useAction(page, action) {
  const before = await snapshot(page);
  await page.locator(`[data-action="${action}"]`).click();
  await page.waitForFunction(previous => {
    const view = window.__REALISM_REVIEW__?.snapshot();
    return view?.matrixWorld?.some((value, index) => Math.abs(value - previous.matrixWorld[index]) > 1e-7);
  }, before, { timeout: 15000 });
  const after = await renderedView(page, before.frames);
  check(`button-${action}`, !sameCamera(before, after), { before, after });
}
async function desktop() {
  const { page, context } = await newPage('desktop');
  try {
    await page.goto(entry); const initial = await visibleScene(page, 'streamed');
    report.scenarios.desktop = { initial };
    check('ordinary-entry-streamed-only', !report.requests.some(item => item.scenario === 'desktop' && item.url === originalUrl), { selected: initial.variant });
    check('english-guidance', await page.locator('#language-en').getAttribute('aria-pressed') === 'true' && await page.getByRole('button', { name: 'Rotate left', exact: true }).isVisible());
    await checkLayout(page, 'desktop-layout'); await screenshot(page, 'desktop-en');
    for (const action of ['rotate-left', 'rotate-right', 'tilt-up', 'tilt-down', 'zoom-in', 'zoom-out']) await useAction(page, action);
    await page.locator('[data-action="reset"]').click();
    check('reset-restores-view', sameCamera(initial, await renderedView(page)));
    const canvas = page.locator('#review-canvas'); const box = await canvas.boundingBox();
    const beforeDrag = await snapshot(page);
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.down();
    await page.mouse.move(box.x + box.width * .56, box.y + box.height * .52, { steps: 8 }); await page.mouse.up();
    const afterDrag = await renderedView(page, beforeDrag.frames); check('native-pointer-drag', !sameCamera(beforeDrag, afterDrag), { before: beforeDrag, after: afterDrag });
    const beforeWheel = await snapshot(page); await page.mouse.wheel(0, -100);
    const afterWheel = await renderedView(page, beforeWheel.frames); check('native-wheel-zoom', !sameCamera(beforeWheel, afterWheel), { before: beforeWheel, after: afterWheel });
    await canvas.focus(); const beforeKeyboard = await snapshot(page); await page.keyboard.press('ArrowRight');
    const afterKeyboard = await renderedView(page, beforeKeyboard.frames); check('focused-keyboard-rotation', !sameCamera(beforeKeyboard, afterKeyboard), { before: beforeKeyboard, after: afterKeyboard });
    await page.locator('#language-en').focus(); const beforeOutside = await snapshot(page); await page.keyboard.press('ArrowRight');
    check('keyboard-outside-canvas-keeps-view', sameCamera(beforeOutside, await snapshot(page)));
    report.scenarios.desktop.textInputCount = await page.locator('input,textarea,[contenteditable="true"]').count();
    if (report.scenarios.desktop.textInputCount === 0) report.limitations.push('The review page has no text input; keyboard focus outside its canvas is verified with the language control.');
    const focus = [];
    for (let index = 0; index < 20; index++) { await page.keyboard.press('Tab'); focus.push(await page.evaluate(() => ({ tag: document.activeElement.tagName, id: document.activeElement.id, action: document.activeElement.dataset.action, label: document.activeElement.getAttribute('aria-label'), outline: getComputedStyle(document.activeElement).outlineStyle }))); }
    check('keyboard-reaches-visible-controls', ['rotate-left', 'zoom-in', 'reset', 'fullscreen'].every(action => focus.some(item => item.action === action)), focus);
    await page.locator('[data-action="fullscreen"]').click();
    const entered = await page.evaluate(() => Boolean(document.fullscreenElement));
    report.scenarios.desktop.fullscreen = { supported: await page.evaluate(() => document.fullscreenEnabled), entered };
    if (entered) { await page.locator('[data-action="fullscreen"]').click(); await page.waitForFunction(() => !document.fullscreenElement); check('fullscreen-enter-exit', true); }
    else { check('fullscreen-available', false, report.scenarios.desktop.fullscreen); report.limitations.push('The automated browser did not enter native fullscreen.'); }
    await page.locator('#language-zh').click();
    check('chinese-guidance', await page.locator('#language-zh').getAttribute('aria-pressed') === 'true' && (await page.locator('html').getAttribute('lang')).startsWith('zh'));
    await screenshot(page, 'desktop-zh'); await page.locator('#language-en').click();
    await page.setViewportSize({ width: 768, height: 900 }); await renderedView(page); await checkLayout(page, 'tablet-resize');
    await page.setViewportSize(report.environment.desktop); await renderedView(page);
    const beforeSwitch = await snapshot(page);
    await page.locator('#variant-original').click(); const original = await visibleScene(page, 'original');
    check('switch-original-preserves-camera', sameCamera(beforeSwitch, original), { before: beforeSwitch, after: original });
    await screenshot(page, 'desktop-original');
    await page.locator('#variant-streamed').click(); const streamed = await visibleScene(page, 'streamed');
    check('switch-streamed-preserves-camera', sameCamera(original, streamed), { before: original, after: streamed });
    await screenshot(page, 'desktop-streamed-comparison');
    const credit = await page.locator('body').innerText();
    check('visible-source-credit', credit.includes('scbenoit') && /CC BY\s*4\.0/.test(credit) && credit.includes('Knock'));
    report.scenarios.desktop.links = await page.locator('a').evaluateAll(links => links.map(link => ({ text: link.innerText, href: link.href })));
    report.environment.renderer = await page.evaluate(() => { const gl = document.querySelector('canvas').getContext('webgl2'); const extension = gl?.getExtension('WEBGL_debug_renderer_info'); return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null; });
  } finally { await context.close(); }
}
async function cancellation() {
  const { page, context, cdp } = await newPage('cancellation');
  try {
    await page.goto(entry); await visibleScene(page, 'streamed');
    transport.delayPath = new URL(originalUrl).pathname;
    if (remote) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 2000, downloadThroughput: 512 * 1024, uploadThroughput: 512 * 1024 });
    const request = page.waitForRequest(originalUrl);
    await page.locator('#variant-original').click(); await request;
    const changedAt = Date.now(); await page.locator('#variant-streamed').click();
    if (remote) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    const view = await visibleScene(page, 'streamed');
    const aborts = report.failures.filter(item => item.scenario === 'cancellation' && item.url === originalUrl && item.at >= changedAt);
    check('superseded-original-request-canceled', aborts.length > 0 && view.variant === 'streamed', { changedAt, aborts, view });
    report.scenarios.cancellation = { changedAt, view };
  } finally { transport.delayPath = null; await context.close(); }
}
async function recovery() {
  const { page, context } = await newPage('recovery');
  try {
    transport.failPath = new URL(originalUrl).pathname; transport.failed = false;
    if (remote) await context.route(originalUrl, async route => {
      if (!transport.failed) { transport.failed = true; report.serverEvents.push({ at: Date.now(), url: originalUrl, intentional: true, fault: 'connectionreset' }); await route.abort('connectionreset'); }
      else await route.continue();
    });
    const directEntry = new URL(entry); directEntry.searchParams.set('variant', 'original');
    await page.goto(directEntry.href);
    await page.locator('#retry-scene').waitFor({ state: 'visible', timeout });
    const error = await page.locator('#scene-status').innerText();
    check('real-asset-failure-shows-retry', transport.failed && error.length > 0, { text: error, view: await snapshot(page) });
    await screenshot(page, 'asset-error');
    await page.locator('#retry-scene').click(); const recovered = await visibleScene(page, 'original');
    check('visible-retry-restores-source', recovered.variant === 'original' && recovered.firstView, recovered);
    check('original-entry-loads-original-only', !report.requests.some(item => item.scenario === 'recovery' && item.url === streamedUrl));
    report.scenarios.recovery = { fault: remote ? 'Browser connection reset of actual hosted asset request' : 'Local HTTP server returned one 503 for actual source asset', recovered };
  } finally { transport.failPath = null; await context.close(); }
}
async function pagedCancellation() {
  const { page, context, cdp } = await newPage('paged-cancellation');
  try {
    transport.delayPrefix = new URL('.', streamedUrl).pathname;
    if (remote) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 2000, downloadThroughput: 512 * 1024, uploadThroughput: 512 * 1024 });
    const chunkRequest = page.waitForRequest(request => isChunkUrl(request.url()), { timeout });
    await page.goto(entry, { waitUntil: 'domcontentloaded' });
    const chunk = await chunkRequest;
    const originalRequest = page.waitForRequest(originalUrl, { timeout });
    const changedAt = Date.now(); await page.locator('#variant-original').click();
    await originalRequest;
    await page.waitForFunction(url => window.__REALISM_REVIEW__?.snapshot().requests.some(request => request.url === url && request.status === 'aborted'), chunk.url(), { timeout: 30000 });
    const view = await snapshot(page);
    const aborts = report.failures.filter(item => item.scenario === 'paged-cancellation' && item.url === chunk.url() && item.at >= changedAt);
    check('superseded-paged-request-canceled', aborts.length > 0 && view.variant === 'original', { changedAt, abortedChunk: chunk.url(), aborts, view });
    report.scenarios.pagedCancellation = { changedAt, view };
  } finally { transport.delayPrefix = null; await context.close(); }
}
async function phone() {
  const { page, context, cdp } = await newPage('phone', true);
  try {
    const directEntry = new URL(entry); directEntry.searchParams.set('lang', 'zh');
    await page.goto(directEntry.href); await visibleScene(page, 'streamed');
    check('chinese-direct-entry', await page.locator('#language-zh').getAttribute('aria-pressed') === 'true' && (await page.locator('html').getAttribute('lang')).startsWith('zh'));
    await page.locator('#language-en').tap();
    await checkLayout(page, 'phone-en-layout'); await screenshot(page, 'phone-en');
    for (const action of ['rotate-left', 'tilt-up', 'zoom-in', 'reset']) check(`phone-visible-${action}`, await page.locator(`[data-action="${action}"]`).isVisible());
    const canvas = page.locator('#review-canvas'); await canvas.scrollIntoViewIfNeeded(); const box = await canvas.boundingBox();
    const before = await snapshot(page);
    const start = { x: box.x + box.width * .45, y: box.y + box.height * .5 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + 40, y: start.y + 8 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const afterDrag = await renderedView(page, before.frames);
    check('native-touch-drag', !sameCamera(before, afterDrag), { before, after: afterDrag });
    const beforePinch = await snapshot(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: start.x - 35, y: start.y, id: 0 }, { x: start.x + 35, y: start.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x - 55, y: start.y, id: 0 }, { x: start.x + 55, y: start.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const afterPinch = await renderedView(page, beforePinch.frames);
    check('native-touch-pinch', !sameCamera(beforePinch, afterPinch), { before: beforePinch, after: afterPinch });
    const beforeTap = await snapshot(page); await page.locator('[data-action="zoom-in"]').tap();
    const afterTap = await renderedView(page, beforeTap.frames);
    check('phone-native-button-tap', !sameCamera(beforeTap, afterTap), { before: beforeTap, after: afterTap });
    await page.locator('#language-zh').tap(); await checkLayout(page, 'phone-zh-layout'); await screenshot(page, 'phone-zh');
    report.scenarios.phone = { final: await snapshot(page) };
  } finally { await context.close(); }
}

function transferredAt(scenario, boundary) {
  const requests = report.network.filter(item => item.scenario === scenario && item.startedAt <= boundary).map(item => {
    const complete = Number.isFinite(item.finishedAt) && item.finishedAt <= boundary;
    const responseStarted = Number.isFinite(item.responseAt) && item.responseAt <= boundary;
    const bodyBytes = item.data.filter(event => event.timestamp <= boundary).reduce((sum, event) => sum + event.encodedDataLength, 0);
    const bytes = complete ? item.totalEncodedBytes : (responseStarted ? item.headerBytes : 0) + bodyBytes;
    return { requestId: item.requestId, url: item.url, complete, responseStarted, encodedBytes: bytes,
      headerBytes: responseStarted ? item.headerBytes : 0, observedBodyBytes: bodyBytes };
  });
  const completedBytes = requests.filter(item => item.complete).reduce((sum, item) => sum + item.encodedBytes, 0);
  const inflightBytes = requests.filter(item => !item.complete).reduce((sum, item) => sum + item.encodedBytes, 0);
  return { boundary, completedBytes, inflightBytes, totalEncodedBytes: completedBytes + inflightBytes, requests };
}

async function settledView(page, legacyReference = false) {
  const deadline = Date.now() + timeout;
  let last = null, stable = 0, lastObservation = 0;
  while (Date.now() < deadline) {
    const current = await renderedView(page, last?.frames ?? -1);
    if (Date.now() - lastObservation >= 10000) {
      report.scenarios.settlingObservation = { entry: page.url(), view: current, observedAt: new Date().toISOString() };
      persist(); lastObservation = Date.now();
    }
    if (current.status === 'interactive' && (legacyReference || current.drawnView?.paging?.settled) && current.drawnSplats > 0
      && !current.requests.some(request => request.status === 'pending')) {
      stable = last && sameCamera(current, last) && current.drawnSplats === last.drawnSplats ? stable + 1 : 1;
      if (stable >= 3) return current;
    } else stable = 0;
    last = current;
    await page.waitForTimeout(150);
  }
  report.scenarios.settlingFailure = { entry: page.url(), last, observedAt: new Date().toISOString() };
  persist();
  throw new Error('No stable submitted view with idle source paging was observed');
}

async function captureCanvas(page, name, legacyReference = false) {
  const before = await settledView(page, legacyReference);
  const bytes = await page.locator('#review-canvas').screenshot({ path: resolve(output, name + '.png'), type: 'png', timeout: 120000 });
  const after = await snapshot(page);
  const capture = { path: name + '.png', bytes: bytes.length, sha256: sha(bytes), before, after,
    stableDuringCapture: sameCamera(before, after) && (legacyReference || after.drawnView?.paging?.settled) && before.drawnSplats === after.drawnSplats,
    readinessMethod: legacyReference ? 'Approved viewer interactive state with three stable submitted frames' : 'Submitted-frame idle paging and three stable submitted frames; current desired and drawn camera match' };
  report.screenshots.push(capture); persist();
  assert(capture.stableDuringCapture, 'Camera or paging changed during the settled capture');
  return capture;
}

async function compareCanvasImages(candidateCapture, referenceCapture, key = 'imageComparison', label = 'approved-reference') {
  const page = await browser.newPage();
  try {
    await page.goto(new URL('review-assets.json', entry).href);
    const images = [referenceCapture, candidateCapture].map(capture => `data:image/png;base64,${readFileSync(resolve(output, capture.path)).toString('base64')}`);
    const metrics = await page.evaluate(async urls => {
      const pixels = [];
      for (const url of urls) {
        const bitmap = await createImageBitmap(await (await fetch(url)).blob());
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(bitmap, 0, 0);
        const rgba = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
        const digest = await crypto.subtle.digest('SHA-256', rgba);
        pixels.push({ width: bitmap.width, height: bitmap.height, rgba,
          sha256: [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('') });
        bitmap.close();
      }
      if (pixels[0].width !== pixels[1].width || pixels[0].height !== pixels[1].height) throw new Error('Compared canvas dimensions differ');
      const histogram = new Array(256).fill(0);
      let total = 0, maximum = 0, alphaMismatches = 0, differingRgbChannels = 0;
      for (let index = 0; index < pixels[0].rgba.length; index++) {
        const difference = Math.abs(pixels[0].rgba[index] - pixels[1].rgba[index]);
        if (index % 4 === 3) { if (difference) alphaMismatches++; continue; }
        histogram[difference]++; total += difference; maximum = Math.max(maximum, difference);
        if (difference) differingRgbChannels++;
      }
      const channels = pixels[0].width * pixels[0].height * 3;
      const p95Rank = Math.ceil(channels * .95);
      let accumulated = 0, percentile = 0;
      for (let value = 0; value < histogram.length; value++) {
        accumulated += histogram[value]; if (accumulated >= p95Rank) { percentile = value; break; }
      }
      return { dimensions: { width: pixels[0].width, height: pixels[0].height },
        referencePixelSha256: pixels[0].sha256, candidatePixelSha256: pixels[1].sha256,
        meanAbsoluteError255: total / channels, p95ChannelError: percentile, maxChannelError: maximum,
        alphaMismatches, differingRgbChannels, exactPixels: pixels[0].sha256 === pixels[1].sha256,
        pixelFormat: 'RGBA8', metricChannels: 'RGB', p95Definition: 'Ascending absolute RGB channel differences, rank ceil(0.95*N), one-based' };
    }, images);
    const comparison = { ...metrics, referencePath: referenceCapture.path, candidatePath: candidateCapture.path,
      sameCamera: sameCamera(referenceCapture.before, candidateCapture.before),
      worldMatrixMaxAbsoluteDifference: Math.max(...referenceCapture.before.matrixWorld.map((value, index) => Math.abs(value - candidateCapture.before.matrixWorld[index]))),
      projectionMatrixMaxAbsoluteDifference: Math.max(...referenceCapture.before.projectionMatrix.map((value, index) => Math.abs(value - candidateCapture.before.projectionMatrix[index]))),
      referenceDrawnSplats: referenceCapture.before.drawnSplats, candidateDrawnSplats: candidateCapture.before.drawnSplats,
      appearanceCriteria: { maxChannelError: 1, p95ChannelError: 0, alphaMismatches: 0, source: 'D25 appearance protocol' } };
    report[key] = comparison;
    const matchedView = comparison.sameCamera && referenceCapture.before.drawnSplats === candidateCapture.before.drawnSplats;
    check(`${label}-same-camera`, matchedView, comparison);
    check(`${label}-identical-settled-pixels`, metrics.exactPixels, comparison, 'diagnostic');
    check(`${label}-appearance-preserved`, matchedView && metrics.maxChannelError <= 1 && metrics.p95ChannelError === 0
      && metrics.alphaMismatches === 0, comparison);
  } finally { await page.close(); }
}

async function measureEntry(label, url) {
  const scenario = `transport-${label}`;
  const { page, context, cdp } = await newPage(scenario);
  try {
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80,
      downloadThroughput: 10_000_000 / 8, uploadThroughput: 10_000_000 / 8 });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const firstView = await visibleScene(page, 'streamed');
    report.scenarios[scenario] = { firstView, observedAt: new Date().toISOString() }; persist();
    const metrics = await cdp.send('Performance.getMetrics');
    const navStart = metrics.metrics.find(metric => metric.name === 'NavigationStart')?.value;
    assert(Number.isFinite(navStart) && navStart > 0, 'CDP NavigationStart is required for transfer boundaries');
    const legacyReference = label === 'reference';
    if (!legacyReference) assert(Number.isFinite(firstView.firstVisibleAt), 'Actual first-visible renderer timestamp is required');
    const firstVisibleObservedAt = await page.evaluate(() => performance.now());
    const firstVisibleBoundary = legacyReference ? null : navStart + firstView.firstVisibleAt / 1000;
    const stable = await settledView(page, legacyReference);
    if (!legacyReference) assert(Number.isFinite(stable.firstSettledAt), 'Actual settled-renderer timestamp is required');
    const settledObservedAt = await page.evaluate(() => performance.now());
    const settledBoundary = legacyReference ? null : navStart + stable.firstSettledAt / 1000;
    const canvasScreenshot = await captureCanvas(page, `settled-${label}`, legacyReference);
    const canvasRepeatScreenshot = process.env.REVIEW_QA_REPEATABILITY === '1'
      ? await captureCanvas(page, `settled-${label}-repeat`, legacyReference) : null;
    const result = { entry: url, navStart, firstVisibleAtMs: firstView.firstVisibleAt,
      firstVisibleBoundary, settledAtMs: stable.firstSettledAt, settledBoundary,
      firstVisible: legacyReference ? null : transferredAt(scenario, firstVisibleBoundary),
      settled: legacyReference ? null : transferredAt(scenario, settledBoundary),
      firstVisibleObservedAtMs: firstVisibleObservedAt, settledObservedAtMs: settledObservedAt,
      firstVisibleObservedTransfer: transferredAt(scenario, navStart + firstVisibleObservedAt / 1000),
      settledObservedTransfer: transferredAt(scenario, navStart + settledObservedAt / 1000),
      firstView, settledView: stable, canvasScreenshot, canvasRepeatScreenshot, runtimeRequests: stable.requests,
      performanceMarks: await page.evaluate(() => performance.getEntriesByType('mark').map(mark => ({ name: mark.name, startTime: mark.startTime }))),
      navigationTiming: await page.evaluate(() => performance.getEntriesByType('navigation')[0].toJSON()),
      readinessMethod: canvasScreenshot.readinessMethod,
      conditions: { downloadBitsPerSecond: 10_000_000, latencyMs: 80, cacheDisabled: true } };
    report.transfer[label] = result;
    if (!legacyReference) check(`transfer-${label}-first-visible-within-4mib`, result.firstVisible.totalEncodedBytes <= 4 * 1024 * 1024,
      { bytes: result.firstVisible.totalEncodedBytes, boundary: firstVisibleBoundary, detail: 'Partial first visibility; full-quality and physical performance remain separate.' }, 'budget');
    check(`transport-${label}-native-chunks`, stable.requests.some(request => request.status === 'complete' && request.url.endsWith('.radc'))
      && !stable.requests.some(request => request.url.endsWith('.radc.gz')), stable.requests);
    return { canvasScreenshot, canvasRepeatScreenshot };
  } finally { await context.close(); }
}

async function measureTransport() {
  assert(!manifest.transport, 'The production candidate retains native scene transport');
  const candidate = await measureEntry('candidate', entry);
  if (candidate.canvasRepeatScreenshot) await compareCanvasImages(candidate.canvasRepeatScreenshot, candidate.canvasScreenshot, 'candidateRepeatability', 'candidate-repeatability');
  if (!referenceEntry) return;
  const reference = await measureEntry('reference', referenceEntry);
  if (reference.canvasRepeatScreenshot) await compareCanvasImages(reference.canvasRepeatScreenshot, reference.canvasScreenshot, 'referenceRepeatability', 'reference-repeatability');
  await compareCanvasImages(candidate.canvasScreenshot, reference.canvasScreenshot);
}

async function shell() {
  const { page, context } = await newPage('shell');
  let release;
  const held = new Promise(accept => { release = accept; });
  try {
    const sceneModule = /\/assets\/scene-[^/]+\.js(?:\?.*)?$/;
    await context.route(sceneModule, async route => { await held; await route.continue(); });
    const requested = page.waitForRequest(request => sceneModule.test(request.url()), { timeout });
    await page.goto(entry, { waitUntil: 'domcontentloaded' }); await requested;
    const before = await snapshot(page);
    check('controls-visible-before-viewer-module', await page.locator('#place-title').isVisible()
      && await page.locator('#language-en').isEnabled() && await page.locator('#language-zh').isEnabled()
      && await page.locator('[data-action="rotate-left"]').isVisible() && !before?.firstView, { before });
    await page.locator('#language-zh').click();
    check('language-works-before-viewer-module', (await page.locator('html').getAttribute('lang')).startsWith('zh')
      && await page.getByRole('button', { name: '向左旋转', exact: true }).isVisible());
    await page.setViewportSize(report.environment.phone); await checkLayout(page, 'pending-viewer-phone-layout');
    await screenshot(page, 'pending-viewer-zh');
    await page.locator('#language-en').click(); await page.setViewportSize(report.environment.desktop);
    release(); const visible = await visibleScene(page, 'streamed');
    const marks = await page.evaluate(() => performance.getEntriesByType('mark').map(mark => ({ name: mark.name, startTime: mark.startTime })));
    const controls = marks.find(mark => mark.name === 'review-controls-ready');
    const module = marks.find(mark => mark.name === 'review-scene-module-ready');
    check('viewer-loads-after-responsive-controls', controls && module && controls.startTime < module.startTime && visible.firstView,
      { marks, visible });
    report.scenarios.shell = { before, visible, marks };
  } finally { release(); await context.close(); }
}

async function identifySourceData() {
  const referencePath = resolve(root, 'experience/evidence/realism-01/review-page/package-manifest.json');
  const referenceBytes = readFileSync(referencePath);
  const approved = JSON.parse(referenceBytes);
  const context = await browser.newContext(browserProxy ? { proxy: browserProxy } : {});
  let packageBytes;
  try {
    const response = await context.request.get(new URL('package-manifest.json', entry).href);
    assert(response.ok(), `Package manifest HTTP ${response.status()}`); packageBytes = await response.body();
  } finally { await context.close(); }
  const packaged = JSON.parse(packageBytes);
  const expected = approved.files.filter(file => file.path.startsWith('data/'));
  assert.equal(expected.length, 41, 'Expected approved SOG plus40RAD/RADC files');
  const declared = expected.map(file => ({ ...file,
    candidate: packaged.files.find(candidate => candidate.path === file.path) }));
  report.sourceIdentity = { approvedManifest: { path: relative(root, referencePath), sha256: sha(referenceBytes) },
    candidateManifest: { url: new URL('package-manifest.json', entry).href, sha256: sha(packageBytes) },
    declared, localByteHashesAvailable: !remote };
  check('source-manifest-retains-approved-data', declared.every(file => file.candidate?.sha256 === file.sha256
    && file.candidate?.bytes === file.bytes), declared);
  if (!remote) {
    const observed = expected.map(file => ({ path: file.path, expected: { bytes: file.bytes, sha256: file.sha256 },
      observed: report.packageFiles.find(candidate => candidate.path === file.path) }));
    report.sourceIdentity.observed = observed;
    check('local-source-bytes-retain-approved-data', observed.every(file => file.observed?.sha256 === file.expected.sha256
      && file.observed?.bytes === file.expected.bytes), observed);
  }
}

async function moduleRecovery() {
  const { page, context } = await newPage('module-recovery');
  let failed = false;
  try {
    await context.route(/\/assets\/scene-[^/]+\.js(?:\?.*)?$/, async route => {
      if (!failed) {
        failed = true;
        report.serverEvents.push({ at: Date.now(), url: route.request().url(), intentional: true, fault: 'connectionreset', scenario: 'module-recovery' });
        await route.abort('connectionreset');
      } else await route.continue();
    });
    await page.goto(entry, { waitUntil: 'domcontentloaded' });
    const reload = page.locator('#retry-scene');
    await reload.waitFor({ state: 'visible', timeout });
    check('actual-viewer-module-failure-shows-reload', failed && /reload/i.test(await reload.innerText()),
      { text: await reload.innerText(), status: await page.locator('#scene-status').innerText() });
    await page.locator('#language-zh').click();
    check('language-remains-usable-after-module-failure', (await page.locator('html').getAttribute('lang')).startsWith('zh'));
    await screenshot(page, 'viewer-module-error-zh');
    await reload.click();
    const recovered = await visibleScene(page, 'streamed');
    check('visible-reload-restores-actual-viewer-module', recovered.firstView && recovered.drawnSplats > 0, recovered);
    report.scenarios.moduleRecovery = { fault: 'Connection reset on the actual scene module request', recovered };
  } finally { await context.close(); }
}

async function tour() {
  const { page, context, cdp } = await newPage('tour');
  try {
    await page.goto(entry); const initial = await settledView(page);
    const toggle = page.locator('#tour-toggle');
    check('tour-visible-control', await toggle.isVisible());
    await toggle.click();
    await page.waitForFunction(() => window.__REALISM_REVIEW__.snapshot().tour?.status === 'running');
    const started = await submittedTourFrame(page, initial.frames);
    const distance = Math.hypot(...drawnCamera(started).position.map((value, index) => value - initial.position[index]));
    check('tour-start-has-no-teleport', distance < 1, { before: initial, after: started, distance });
    await page.waitForFunction(previous => {
      const view = window.__REALISM_REVIEW__.snapshot();
      return view.frames > previous.frames && view.tour?.progress > previous.tour.progress + .02;
    }, started, { timeout });
    const moved = await submittedTourFrame(page, started.frames);
    check('tour-renders-continuous-movement', !sameCamera(drawnCamera(started), drawnCamera(moved)) && moved.tour.status === 'running', { before: started, after: moved });
    await toggle.click(); const paused = await renderedView(page, moved.frames);
    await page.waitForTimeout(300); const held = await renderedView(page, paused.frames);
    check('tour-pause-holds-camera', held.tour.status === 'paused' && sameCamera(paused, held), { before: paused, after: held });
    await toggle.click();
    await page.waitForFunction(previous => window.__REALISM_REVIEW__.snapshot().frames > previous.frames
      && window.__REALISM_REVIEW__.snapshot().tour.status === 'running', held, { timeout });
    const resumed = await submittedTourFrame(page, held.frames);
    check('tour-resumes-from-current-view', Math.hypot(...drawnCamera(resumed).position.map((value, index) => value - held.position[index])) < 1,
      { before: held, after: resumed });
    const beforeReverse = await snapshot(page); await page.locator('#tour-reverse').click();
    const reversed = await submittedTourFrame(page, beforeReverse.frames);
    check('tour-reverse-control', reversed.tour.direction === -beforeReverse.tour.direction,
      { before: beforeReverse, after: reversed });
    await page.locator('[data-action="rotate-left"]').click();
    const manual = await renderedView(page, reversed.frames);
    check('tour-manual-control-pauses', manual.tour.status === 'paused' && !sameCamera(manual, drawnCamera(reversed)), manual);
    await toggle.click();
    await page.evaluate(() => document.querySelector('#variant-original').addEventListener('click', () => {
      window.__TOUR_QA_SWITCH_VIEW__ = window.__REALISM_REVIEW__.snapshot();
    }, { capture: true, once: true }));
    await page.locator('#variant-original').click();
    const switched = await visibleScene(page, 'original');
    const beforeSwitch = await page.evaluate(() => window.__TOUR_QA_SWITCH_VIEW__);
    check('tour-source-switch-pauses', switched.tour.status === 'paused' && sameCamera(beforeSwitch, switched), { before: beforeSwitch, after: switched });
    await page.locator('#variant-streamed').click(); await settledView(page);
    await toggle.click();
    await page.evaluate(() => {
      window.__TOUR_QA_VISIBILITY__ = [];
      document.addEventListener('visibilitychange', event => window.__TOUR_QA_VISIBILITY__.push({
        hidden: document.hidden, state: document.visibilityState, trusted: event.isTrusted, at: performance.now(),
      }));
    });
    const browserCdp = await browser.newBrowserCDPSession();
    const source = await cdp.send('Target.getTargetInfo');
    const sourceWindow = await cdp.send('Browser.getWindowForTarget');
    const background = await browserCdp.send('Target.createTarget', { url: 'about:blank', newWindow: false });
    await browserCdp.send('Target.activateTarget', { targetId: background.targetId });
    const backgroundWindow = await browserCdp.send('Browser.getWindowForTarget', { targetId: background.targetId });
    await page.waitForFunction(() => document.hidden, null, { timeout: 10000, polling: 100 });
    const hidden = await snapshot(page);
    const hiddenObserved = await page.evaluate(() => document.hidden);
    await browserCdp.send('Target.activateTarget', { targetId: source.targetInfo.targetId });
    await browserCdp.send('Target.closeTarget', { targetId: background.targetId });
    await page.waitForFunction(() => !document.hidden, null, { polling: 100 });
    const visibilityEvents = await page.evaluate(() => window.__TOUR_QA_VISIBILITY__);
    const returned = await renderedView(page);
    const nativeVisibility = { hiddenObserved, sourceWindow, backgroundWindow, visibilityEvents };
    check('tour-hidden-tab-pauses', hiddenObserved && sourceWindow.windowId === backgroundWindow.windowId
      && visibilityEvents.some(event => event.hidden && event.trusted) && returned.tour.status === 'paused' && returned.tour.pauseReason === 'hidden',
      { ...nativeVisibility, hidden, returned });
    await page.waitForTimeout(300); const afterReturn = await renderedView(page, returned.frames);
    check('tour-return-needs-explicit-resume', hiddenObserved && afterReturn.tour.status === 'paused' && sameCamera(returned, afterReturn),
      { before: returned, after: afterReturn });
    await toggle.click(); const resumedAfterHidden = await submittedTourFrame(page, afterReturn.frames);
    check('tour-resumes-after-native-tab-return', resumedAfterHidden.tour.status === 'running'
      && Math.hypot(...drawnCamera(resumedAfterHidden).position.map((value, index) => value - afterReturn.position[index])) < 1,
      { before: afterReturn, after: resumedAfterHidden });
    await toggle.click(); await renderedView(page, resumedAfterHidden.frames);
    await screenshot(page, 'tour-paused');
    report.scenarios.tour = { ...report.scenarios.tour, nativeVisibility, initial, started, moved, paused, held, resumed, reversed, manual, beforeSwitch, switched, hidden, returned, afterReturn, resumedAfterHidden };
  } finally { await context.close(); }
}

async function tourEndpoints() {
  const { page, context } = await newPage('tour-endpoints');
  try {
    if (process.env.REVIEW_QA_ENDPOINT_VIEWPORT) {
      const [width, height] = process.env.REVIEW_QA_ENDPOINT_VIEWPORT.split('x').map(Number);
      assert(Number.isInteger(width) && width >= 390 && Number.isInteger(height) && height >= 400, 'Endpoint viewport must use WIDTHxHEIGHT with usable dimensions');
      report.environment.endpointViewport = { width, height, deviceScaleFactor: 1 };
      await page.setViewportSize({ width, height });
    }
    await page.goto(entry); const initial = await visibleScene(page, 'streamed');
    const toggle = page.locator('#tour-toggle');
    await toggle.click();
    await page.waitForFunction(() => {
      const view = window.__REALISM_REVIEW__.snapshot();
      return view.tour.status === 'running' && view.tour.phase === 'approach' && view.tour.poseUpdates > 0;
    }, null, { timeout });
    await toggle.click(); const pausedApproach = await renderedView(page, initial.frames);
    await page.waitForTimeout(300); const heldApproach = await renderedView(page, pausedApproach.frames);
    check('tour-approach-pause-holds-camera', heldApproach.tour.phase === 'approach' && heldApproach.tour.status === 'paused'
      && sameCamera(pausedApproach, heldApproach), { pausedApproach, heldApproach });
    await toggle.click(); const resumedApproach = await submittedTourFrame(page, heldApproach.frames);
    check('tour-approach-resume-keeps-current-view', Math.hypot(...drawnCamera(resumedApproach).position.map((value, index) => value - heldApproach.position[index])) < 1,
      { heldApproach, resumedApproach });
    await observeTourUntil(page, 'midpoint', view => view.tour.progress >= .5);
    await toggle.click();
    const midpoint = await captureCanvas(page, 'tour-midpoint');
    await toggle.click();
    await observeTourUntil(page, 'completed', view => view.tour.status === 'complete');
    const completed = await renderedView(page);
    const endpoint = completed.tour.endpointPositions[1];
    check('tour-completes-at-submitted-endpoint', completed.tour.progress === 1 && completed.tour.status === 'complete'
      && completed.position.every((value, index) => Math.abs(value - endpoint[index]) < 1e-6)
      && completed.frames > completed.tour.lastPoseRequestedAfterFrame, completed);
    await captureCanvas(page, 'tour-endpoint');
    await page.locator('#tour-reverse').click();
    const reversed = await snapshot(page);
    check('tour-completed-endpoint-can-reverse', reversed.tour.direction === -1 && reversed.tour.status === 'paused'
      && sameCamera(completed, reversed), { completed, reversed });
    await toggle.click(); const returning = await submittedTourFrame(page, reversed.frames);
    check('tour-endpoint-resume-keeps-current-view', Math.hypot(...drawnCamera(returning).position.map((value, index) => value - reversed.position[index])) < 1,
      { reversed, returning });
    const canvas = page.locator('#review-canvas'); await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox(); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -100); const manual = await renderedView(page, returning.frames);
    check('tour-native-wheel-pauses', manual.tour.status === 'paused' && manual.tour.pauseReason === 'manual', manual);
    await page.locator('[data-action="reset"]').click(); const reset = await renderedView(page, manual.frames);
    check('tour-reset-restores-approved-camera', reset.tour.status === 'idle' && sameCamera(initial, reset), { initial, reset });
    report.scenarios.tourEndpoints = { initial, pausedApproach, heldApproach, resumedApproach, midpoint, completed, reversed, returning, manual, reset };
  } finally { await context.close(); }
}

async function observeTourUntil(page, goal, accept) {
  const deadline = Date.now() + tourTimeout;
  let observedAt = 0;
  while (Date.now() < deadline) {
    const view = await snapshot(page);
    if (Date.now() - observedAt >= 10000) {
      report.scenarios.tourProgress = { goal, view, observedAt: new Date().toISOString() }; persist();
      observedAt = Date.now();
    }
    if (accept(view)) return view;
    await page.waitForTimeout(500);
  }
  report.scenarios.tourTimeout = { goal, view: await snapshot(page), observedAt: new Date().toISOString() }; persist();
  throw new Error(`Rendered tour did not reach ${goal} within ${tourTimeout}ms`);
}

persist();
try {
  entry = remote ? target : await startLocalServer();
  if (remote && entry.endsWith('/')) entry += 'index.html';
  if (remote && referenceTarget) referenceEntry = referenceTarget.endsWith('/') ? referenceTarget + 'index.html' : referenceTarget;
  report.entry = entry;
  report.referenceEntry = referenceEntry;
  const proxyAddress = remote ? process.env.HTTPS_PROXY || process.env.HTTP_PROXY : null;
  const proxy = proxyAddress ? new URL(proxyAddress) : null;
  browserProxy = proxy ? { server: proxy.origin, bypass: 'localhost,127.0.0.1',
    ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } : null;
  report.environment.proxyConfigured = Boolean(proxy);
  browser = process.env.REVIEW_QA_NATIVE_CONTEXT === '1' ? await launchNativeBrowser(proxy) : await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: process.env.REVIEW_QA_HEADED !== '1', args: ['--no-sandbox'], env: { ...process.env },
    ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1',
      ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.environment.browser = browser.version();
  const response = await browser.newContext(browserProxy ? { proxy: browserProxy } : {}).then(async context => {
    try { const result = await context.request.get(new URL('review-assets.json', entry).href); assert(result.ok(), `Asset manifest HTTP ${result.status()}`); return result.body(); }
    finally { await context.close(); }
  });
  manifest = JSON.parse(response); report.manifest = { url: new URL('review-assets.json', entry).href, bytes: response.length, sha256: sha(response), content: manifest };
  originalUrl = new URL(manifest.original, report.manifest.url).href; streamedUrl = new URL(manifest.streamed, report.manifest.url).href;
  report.assetEntries = { originalUrl, streamedUrl };
  await identifySourceData();
  for (const section of sections) {
    report.sections[section] = { startedAt: new Date().toISOString(), firstCheck: report.checks.length, completed: false }; persist();
    await ({ transport: measureTransport, shell, 'module-recovery': moduleRecovery, desktop, cancellation, 'paged-cancellation': pagedCancellation, recovery, phone, tour, 'tour-endpoints': tourEndpoints }[section])();
    report.sections[section] = { ...report.sections[section], finishedAt: new Date().toISOString(), lastCheck: report.checks.length - 1, completed: true }; persist();
  }
  await Promise.all(pendingResponses);
  check('no-unhandled-page-errors', report.pageErrors.length === 0, report.pageErrors);
  check('ordinary-loads-have-no-http-errors', report.responses.filter(item => item.status >= 400 && item.scenario !== 'recovery').length === 0, report.responses.filter(item => item.status >= 400));
  check('no-external-scene-dependency', report.requests.filter(item => item.external).length === 0, report.requests.filter(item => item.external));
  report.completed = true;
} catch (error) {
  report.termination = { message: error.message, stack: error.stack }; console.error(error.stack); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  nativeBrowserProcess?.kill('SIGTERM');
  await Promise.all(pendingResponses);
  if (server) await new Promise(accept => { server.close(accept); server.closeAllConnections(); });
  report.finishedAt = new Date().toISOString(); persist();
}
if (report.checks.some(item => !item.pass && item.category !== 'diagnostic')) process.exitCode = 1;
console.log(JSON.stringify({ completed: report.completed, checks: report.checks.length, failed: report.checks.filter(item => !item.pass).map(item => item.id), report: relative(root, resolve(output, 'result.json')) }));
