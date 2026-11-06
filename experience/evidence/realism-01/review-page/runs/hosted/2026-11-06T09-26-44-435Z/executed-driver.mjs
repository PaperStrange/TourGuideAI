// 使用实际页面、浏览器输入和发布资产验证公开评审入口。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../', import.meta.url));
const target = process.argv[2];
assert(target, 'Usage: node experience/tests/browser-realism-review.mjs <package-directory|https-entry-url> [output-directory]');
const remote = target.startsWith('https://');
const packageDirectory = remote ? null : realpathSync(resolve(target));
const outputRoot = resolve(root, 'artifacts/realism-01/review-page/qa');
const outputParent = resolve(process.argv[3] || outputRoot);
assert(outputParent === outputRoot || outputParent.startsWith(outputRoot + sep), 'QA output must stay inside its ignored workspace directory.');
const attempt = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const output = resolve(outputParent, attempt);
mkdirSync(output, { recursive: true });
const driverBytes = readFileSync(fileURLToPath(import.meta.url));
writeFileSync(resolve(output, 'executed-driver.mjs'), driverBytes);
const temporary = resolve(root, 'artifacts/review-qa-tmp');
mkdirSync(temporary, { recursive: true });
process.env.TMPDIR = temporary;
process.env.XDG_CONFIG_HOME = resolve(temporary, 'config');
process.env.XDG_CACHE_HOME = resolve(temporary, 'cache');
const timeout = Number(process.env.REVIEW_QA_TIMEOUT || 240000);
const sections = (process.env.REVIEW_QA_ONLY || 'desktop,cancellation,paged-cancellation,recovery,phone').split(',');
assert(sections.every(value => ['desktop', 'cancellation', 'paged-cancellation', 'recovery', 'phone'].includes(value)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = {
  startedAt: new Date().toISOString(), completed: false, target, output: relative(root, output),
  driver: { path: relative(root, fileURLToPath(import.meta.url)), sha256: sha(driverBytes) },
  environment: { node: process.version, browser: null, renderer: null, sections, timeoutMs: timeout,
    desktop: { width: 1440, height: 1000 }, phone: { width: 390, height: 844 }, deviceScaleFactor: 1 },
  packageFiles: [], checks: [], scenarios: {}, screenshots: [], requests: [], responses: [], failures: [],
  console: [], pageErrors: [], serverEvents: [], limitations: [
    'Chromium uses a cloud software renderer. These results do not establish physical-device frame rate, memory, or enjoyment.',
    'Phone input uses trusted Chromium touch events in an emulated viewport; a physical phone is not available.',
    'Intentional transport faults affect actual asset requests. Successful loads use packaged or hosted source bytes.',
    'First visible rendering does not establish that every detail has finished streaming.',
  ],
};
const persist = () => writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, pass, evidence) {
  report.checks.push({ id, pass: Boolean(pass), evidence }); persist();
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`);
}
async function identifyFile(file) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  return { path: relative(packageDirectory, file), bytes: statSync(file).size, sha256: hash.digest('hex') };
}
async function inventory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await inventory(path);
    else if (entry.isFile()) report.packageFiles.push(await identifyFile(path));
  }
}
const transport = { failPath: null, failed: false, delayPath: null, delayPrefix: null };
let server, browser, entry, manifest, originalUrl, streamedUrl;
const pendingResponses = new Set();
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

async function startLocalServer() {
  await inventory(packageDirectory);
  const prefix = '/review-package/';
  server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    const file = resolve(packageDirectory, pathname.slice(prefix.length));
    if (!pathname.startsWith(prefix) || !file.startsWith(packageDirectory + sep) || !existsSync(file) || !statSync(file).isFile()) {
      report.serverEvents.push({ at: Date.now(), path: pathname, status: 404 }); response.writeHead(404); response.end(); return;
    }
    if (pathname === transport.failPath && !transport.failed) {
      transport.failed = true;
      report.serverEvents.push({ at: Date.now(), path: pathname, status: 503, intentional: true });
      response.writeHead(503, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); response.end('QA transport interruption'); return;
    }
    if (pathname === transport.delayPath || (transport.delayPrefix && pathname.startsWith(transport.delayPrefix) && pathname.endsWith('.radc'))) {
      report.serverEvents.push({ at: Date.now(), path: pathname, delayedMs: 5000, intentional: true });
      await new Promise(accept => setTimeout(accept, 5000));
      if (response.destroyed) return;
    }
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Length': statSync(file).size, 'Cache-Control': 'no-store' });
    const stream = createReadStream(file);
    stream.on('error', error => { report.serverEvents.push({ at: Date.now(), path: pathname, error: error.message }); response.destroy(error); });
    response.on('close', () => stream.destroy()); stream.pipe(response);
  });
  await new Promise(accept => server.listen(0, '127.0.0.1', accept));
  const entryName = process.env.REVIEW_QA_ENTRY || (existsSync(resolve(packageDirectory, 'index.html')) ? 'index.html' : 'realism-review.html');
  return `http://127.0.0.1:${server.address().port}${prefix}${entryName}`;
}
const snapshot = page => page.evaluate(() => window.__REALISM_REVIEW__?.snapshot());
const sameCamera = (left, right) => left?.matrixWorld?.length === 16 && right?.matrixWorld?.length === 16
  && left.matrixWorld.every((value, index) => Math.abs(value - right.matrixWorld[index]) < 1e-7);
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
async function screenshot(page, name) {
  const bytes = await page.screenshot({ path: resolve(output, name + '.jpg'), type: 'jpeg', quality: 88, fullPage: true, timeout: 120000 });
  report.screenshots.push({ path: name + '.jpg', bytes: bytes.length, sha256: sha(bytes) }); persist();
}
async function newPage(name, phone = false) {
  const context = await browser.newContext({ viewport: phone ? report.environment.phone : report.environment.desktop,
    deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, locale: 'en-US' });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable', { maxTotalBufferSize: 128 * 1024 * 1024, maxResourceBufferSize: 40 * 1024 * 1024 });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
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
    const chunkRequest = page.waitForRequest(request => request.url().endsWith('.radc'), { timeout });
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

persist();
try {
  entry = remote ? target : await startLocalServer();
  if (remote && entry.endsWith('/')) entry += 'index.html';
  report.entry = entry;
  const proxyAddress = remote ? process.env.HTTPS_PROXY || process.env.HTTP_PROXY : null;
  const proxy = proxyAddress ? new URL(proxyAddress) : null;
  report.environment.proxyConfigured = Boolean(proxy);
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'], env: { ...process.env },
    ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1',
      ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.environment.browser = browser.version();
  const response = await browser.newContext().then(async context => {
    try { const result = await context.request.get(new URL('review-assets.json', entry).href); assert(result.ok(), `Asset manifest HTTP ${result.status()}`); return result.body(); }
    finally { await context.close(); }
  });
  manifest = JSON.parse(response); report.manifest = { url: new URL('review-assets.json', entry).href, bytes: response.length, sha256: sha(response), content: manifest };
  originalUrl = new URL(manifest.original, report.manifest.url).href; streamedUrl = new URL(manifest.streamed, report.manifest.url).href;
  report.assetEntries = { originalUrl, streamedUrl };
  for (const section of sections) await ({ desktop, cancellation, 'paged-cancellation': pagedCancellation, recovery, phone }[section])();
  await Promise.all(pendingResponses);
  check('no-unhandled-page-errors', report.pageErrors.length === 0, report.pageErrors);
  check('ordinary-loads-have-no-http-errors', report.responses.filter(item => item.status >= 400 && item.scenario !== 'recovery').length === 0, report.responses.filter(item => item.status >= 400));
  check('no-external-scene-dependency', report.requests.filter(item => item.external).length === 0, report.requests.filter(item => item.external));
  report.completed = true;
} catch (error) {
  report.termination = { message: error.message, stack: error.stack }; console.error(error.stack); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await Promise.all(pendingResponses);
  if (server) await new Promise(accept => { server.close(accept); server.closeAllConnections(); });
  report.finishedAt = new Date().toISOString(); persist();
}
if (report.checks.some(item => !item.pass)) process.exitCode = 1;
console.log(JSON.stringify({ completed: report.completed, checks: report.checks.length, failed: report.checks.filter(item => !item.pass).map(item => item.id), report: relative(root, resolve(output, 'result.json')) }));
