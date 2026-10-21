// 使用真实导出文件与浏览器输入审阅内部地理场景，不修改产品保存内容。
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { Matrix4, Vector3 } from 'three';
import { startWorkbenchServer } from '../content-tools/preview-site.mjs';

const directories = process.argv.slice(2).map(path => resolve(path));
if (directories.length !== 2) throw new Error('Usage: node tests/browser-site-workbench.mjs <delft-output> <helsinki-output>');
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || '../artifacts/site-workbench-browser');
const timeout = Number(process.env.EXPERIENCE_QA_TIMEOUT || 120000);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
mkdirSync(output, { recursive: true });
const sites = directories.map(directory => {
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json')));
  const context = JSON.parse(readFileSync(join(directory, 'context.json')));
  return { directory, manifest, context, files: ['manifest.json', 'context.json', 'review.json', manifest.model.file]
    .map(file => { const bytes = readFileSync(join(directory, file)); return { file, bytes: bytes.length, sha256: sha(bytes) }; }) };
});
const report = { startedAt: new Date().toISOString(), driverSha256: sha(readFileSync(new URL(import.meta.url))),
  inputs: sites.map(({ directory, manifest, files }) => ({ directory, id: manifest.id, files })),
  viewerFiles: ['preview-site.mjs', 'viewer/index.html', 'viewer/main.js', 'viewer/style.css'].map(file => ({ file,
    sha256: sha(readFileSync(new URL('../content-tools/' + file, import.meta.url))) })),
  conditions: { desktop: [1440, 1000], phone: [390, 844], reducedMotion: 'reduce', timeoutMs: timeout },
  checks: [], screenshots: [], scenarios: {},
  limits: ['Internal geographic-context review only; architectural fidelity, access, grade and walking remain unreviewed.',
    'Browser automation is not a physical-device or human recognition study.',
    'Failure cases deny actual local requests; successful files and source responses are not substituted.'] };
const persist = () => writeFileSync(join(output, 'site-workbench-result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, pass, evidence) { report.checks.push({ id, pass: Boolean(pass), evidence }); persist(); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`); }
const snapshot = page => page.evaluate(() => window.__SITE_WORKBENCH__?.snapshot());
const distance = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
const sameCamera = (a, b) => distance(a.position, b.position) < 1e-6 && distance(a.target, b.target) < 1e-6;
const contexts = new Set();
let service, browser;

async function open(name, mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  contexts.add(context);
  const record = report.scenarios[name] = { requests: [], responses: [], denied: [], external: [], errors: [] };
  const fault = { path: null };
  await context.route(service.url + '/**', route => {
    if (new URL(route.request().url()).pathname === fault.path) { record.denied.push(route.request().url()); return route.abort('blockedbyclient'); }
    return route.continue();
  });
  await context.addInitScript(() => {
    if (!sessionStorage.getItem('qa-workbench-initialized')) {
      localStorage.setItem('tourguideai:journey:v2', '{"version":2,"locale":"zh","notes":{"crossing":"Private note"}}');
      localStorage.setItem('tourguideai:appearance:v1', '{"lighting":"night"}');
      sessionStorage.setItem('qa-workbench-initialized', '1');
    }
  });
  const page = await context.newPage(); page.setDefaultTimeout(timeout);
  page.on('pageerror', error => { record.errors.push(error.message); persist(); });
  page.on('request', request => {
    const url = new URL(request.url()); record.requests.push(url.pathname);
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== service.url) record.external.push(url.href);
  });
  page.on('response', response => record.responses.push({ path: new URL(response.url()).pathname, status: response.status() }));
  await page.goto(service.url, { waitUntil: 'domcontentloaded' });
  return { page, context, record, fault, mobile };
}
async function ready(page, id, mode = 'day') {
  await page.waitForFunction(({ id, mode }) => {
    const value = window.__SITE_WORKBENCH__?.snapshot();
    return value?.phase === 'ready' && value.siteId === id && value.mode === mode && value.renderedFrames > 0;
  }, { id, mode });
}
async function choose(page, id, mode) { await page.locator('#site-selector').selectOption(id); await ready(page, id, mode); }
async function activate(session, selector) { await session.page.locator(selector)[session.mobile ? 'tap' : 'click'](); }
async function capture(session, name) {
  await session.page.locator('#stage').scrollIntoViewIfNeeded();
  const file = name + '.png'; await session.page.screenshot({ path: join(output, file), fullPage: !session.mobile });
  const stage = await session.page.locator('#canvas-host canvas').screenshot();
  report.screenshots.push({ file, sha256: sha(readFileSync(join(output, file))), stageSha256: sha(stage), snapshot: await snapshot(session.page) });
  persist(); return sha(stage);
}
async function inspectLandmark(session, site) {
  const page = session.page, state = await snapshot(page), rect = await page.locator('#canvas-host canvas').boundingBox();
  const identity = site.context.identity, feature = site.context.features.find(item => item.sourceId === identity);
  const projection = new Matrix4().fromArray(state.camera.projectionMatrix);
  const inverse = new Matrix4().fromArray(state.camera.matrixWorld).invert();
  const candidates = feature.polygons.flatMap(record => record.triangles).map(points => {
    const x = points.reduce((sum, point) => sum + point[0], 0) / 3;
    const y = points.reduce((sum, point) => sum + point[1], 0) / 3;
    const point = new Vector3(x, feature.height.metres, -y).applyMatrix4(inverse).applyMatrix4(projection);
    return { normalized: point.toArray(), x: rect.x + (point.x + 1) * rect.width / 2, y: rect.y + (1 - point.y) * rect.height / 2 };
  }).filter(point => point.normalized.slice(0, 2).every(value => Math.abs(value) < .95)
    && point.normalized[2] >= -1 && point.normalized[2] <= 1)
    .sort((a, b) => Math.hypot(...a.normalized.slice(0, 2)) - Math.hypot(...b.normalized.slice(0, 2)));
  const attempts = [];
  for (const point of candidates.slice(0, 8)) {
    if (session.mobile) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
    const selected = (await snapshot(page)).selectedFeature; attempts.push({ point, selected });
    if (selected === identity) break;
  }
  const actual = await snapshot(page), text = await page.locator('#feature-record').textContent();
  check(`${site.manifest.id}-actual-roof-click-selects-source-identity`, actual.selectedFeature === identity
    && text.includes(identity) && text.includes(String(feature.height.metres)) && await page.locator('#feature-record').isVisible(), { attempts, text });
}
async function layout(session, label) {
  const actual = await session.page.evaluate(() => ({ width: document.documentElement.scrollWidth,
    rects: ['#stage', '#site-selector', '.scene-actions'].map(selector => ({ selector, ...document.querySelector(selector).getBoundingClientRect().toJSON() })) }));
  check(label, actual.width <= session.page.viewportSize().width + 1
    && actual.rects.every(rect => rect.left >= -1 && rect.right <= session.page.viewportSize().width + 1), actual);
}
async function section(name, operation) {
  try { await operation(); }
  catch (error) { check(`${name}-completed`, false, { message: error.message, stack: error.stack }); }
  finally { for (const context of contexts) await context.close(); contexts.clear(); }
}

try {
  service = await startWorkbenchServer({ directories, port: 0 });
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || undefined, headless: true, args: ['--no-sandbox'] });
  report.browser = browser.version(); persist();
  await section('desktop', async () => {
    const session = await open('desktop'), page = session.page;
    for (const site of sites) {
      await choose(page, site.manifest.id, 'day');
      const actual = await snapshot(page);
      check(`${site.manifest.id}-actual-model-hash-and-unreviewed-scope`, actual.modelSha256 === site.manifest.model.sha256
        && actual.representation === 'geographic-context' && actual.navigation === 'unreviewed'
        && actual.renderer.triangles > 0 && actual.renderer.geometries > 0, actual);
      const original = actual.camera, day = await capture(session, `${site.manifest.id}-day-en`);
      await inspectLandmark(session, site);
      await page.locator('#stage').focus(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Shift+ArrowUp'); await page.keyboard.press('+');
      const moved = await snapshot(page);
      check(`${site.manifest.id}-keyboard-orbit-pan-zoom-affect-camera`, distance(moved.camera.position, original.position) > 1
        && distance(moved.camera.target, original.target) > 1, { before: original, after: moved.camera });
      await activate(session, '#reset-view');
      check(`${site.manifest.id}-reset-restores-opening-camera`, sameCamera((await snapshot(page)).camera, original));
      await activate(session, '[data-locale=zh]');
      check(`${site.manifest.id}-locale-retains-camera-source-selection`, (await snapshot(page)).locale === 'zh'
        && sameCamera((await snapshot(page)).camera, original)
        && (await snapshot(page)).selectedFeature === site.context.identity
        && (await page.locator('#feature-record').textContent()).includes('来源标识'));
      await activate(session, '[data-lighting=night]'); await ready(page, site.manifest.id, 'night');
      const night = await capture(session, `${site.manifest.id}-night-zh`);
      check(`${site.manifest.id}-night-renders-different-pixels-with-same-pose`, day !== night && sameCamera((await snapshot(page)).camera, original), { day, night });
      await layout(session, `${site.manifest.id}-desktop-layout`);
      await activate(session, '[data-lighting=day]'); await ready(page, site.manifest.id, 'day');
      await activate(session, '[data-locale=en]');
    }
    const memories = {};
    for (let round = 0; round < 3; round++) for (const site of sites) {
      await choose(page, site.manifest.id, 'day'); const actual = await snapshot(page);
      const previous = memories[site.manifest.id];
      if (previous) check(`${site.manifest.id}-repeat-${round}-resources-remain-bounded`, actual.renderer.geometries === previous.geometries
        && actual.renderer.textures === previous.textures && await page.locator('canvas').count() === 1, { previous, actual: actual.renderer });
      memories[site.manifest.id] = actual.renderer;
    }
    const stored = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
    check('workbench-keeps-private-journey-and-appearance-bytes', stored['tourguideai:journey:v2'] === '{"version":2,"locale":"zh","notes":{"crossing":"Private note"}}'
      && stored['tourguideai:appearance:v1'] === '{"lighting":"night"}' && Object.keys(stored).length === 2, stored);
    const idle = (await snapshot(page)).renderedFrames; await page.waitForTimeout(2000);
    check('idle-workbench-does-not-continuously-redraw', (await snapshot(page)).renderedFrames === idle, { before: idle, after: (await snapshot(page)).renderedFrames, sampleMs: 2000 });
  });
  await section('phone', async () => {
    const session = await open('phone', true), page = session.page;
    await choose(page, sites[1].manifest.id, 'day');
    await page.locator('#stage').scrollIntoViewIfNeeded();
    const initial = await snapshot(page), rect = await page.locator('#canvas-host canvas').boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const points = offset => [{ id: 1, x: rect.x + rect.width * .4 + offset, y: rect.y + rect.height * .5 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(0) });
    for (let index = 1; index <= 6; index++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(index * 8) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    check('phone-touch-drag-changes-actual-camera', distance((await snapshot(page)).camera.position, initial.camera.position) > 1);
    await activate(session, '[data-lighting=night]'); await ready(page, sites[1].manifest.id, 'night');
    for (const language of ['en', 'zh']) {
      await activate(session, `[data-locale=${language}]`); await layout(session, `phone-${language}-layout`);
      check(`phone-${language}-controls-are-localized`, await page.locator('#reset-view').textContent() === (language === 'en' ? 'Reset view' : '重置视角'));
      await capture(session, `helsinki-phone-night-${language}`);
    }
  });
  await section('recovery', async () => {
    const session = await open('recovery'), page = session.page;
    await ready(page, sites[0].manifest.id);
    session.fault.path = `/sites/${sites[1].manifest.id}/${sites[1].manifest.model.file}`;
    await page.locator('#site-selector').selectOption(sites[1].manifest.id);
    await page.waitForFunction(() => window.__SITE_WORKBENCH__.snapshot().phase === 'error');
    check('denied-real-model-is-visible-error', await page.locator('#retry').isVisible() && session.record.denied.length > 0, await snapshot(page));
    session.fault.path = null; await activate(session, '#retry'); await ready(page, sites[1].manifest.id);
    check('model-retry-restores-exact-asset', (await snapshot(page)).modelSha256 === sites[1].manifest.model.sha256);
    const camera = (await snapshot(page)).camera;
    session.fault.path = '/lighting/environments/night-1k.hdr';
    await activate(session, '[data-lighting=night]');
    await page.waitForFunction(() => window.__SITE_WORKBENCH__.snapshot().phase === 'error');
    check('denied-night-hdr-keeps-visible-error-and-previous-applied-mode', (await snapshot(page)).mode === 'day'
      && (await snapshot(page)).requestedMode === 'night' && await page.locator('#retry').isVisible(), await snapshot(page));
    await capture(session, 'night-hdr-denied');
    session.fault.path = null; await activate(session, '#retry'); await ready(page, sites[1].manifest.id, 'night');
    check('night-retry-renders-requested-mode-with-retained-camera', sameCamera((await snapshot(page)).camera, camera), await snapshot(page));
  });
  for (const [name, record] of Object.entries(report.scenarios)) {
    check(`${name}-uses-only-local-assets`, record.external.length === 0, record.external);
    check(`${name}-has-no-unhandled-page-errors`, record.errors.length === 0, record.errors);
  }
  check('reviewed-export-and-viewer-bytes-stay-unchanged', sites.every(site => site.files.every(file => sha(readFileSync(join(site.directory, file.file))) === file.sha256))
    && report.viewerFiles.every(file => sha(readFileSync(new URL('../content-tools/' + file.file, import.meta.url))) === file.sha256));
  report.finishedAt = new Date().toISOString(); report.passed = report.checks.filter(check => check.pass).length;
  report.failed = report.checks.filter(check => !check.pass).length; persist();
  if (report.failed) process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close();
  await browser?.close(); await service?.close();
}
