// 固定视角的实际 runtime 图像证据；此脚本不判定审美、识别能力或完整游戏验收。
import { chromium } from 'playwright';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { startServer } from '../server/src/server.js';

if (!process.argv[2]) throw new Error('Usage: node tests/browser-art-poses.mjs <built-dist-directory>');
const dist = resolve(process.argv[2]);
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || '../artifacts/art-poses');
const phoneOnly = process.argv.includes('--phone-only');
mkdirSync(output, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = new Map();
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else assets.set('/' + relative(dist, path), readFileSync(path));
  }
}
collect(dist);
const runtimePaths = [...assets.keys()].filter(path => /^\/assets\/create-game-[^/]+\.js$/.test(path));
if (runtimePaths.length !== 1) throw new Error('Expected one compiled createGame module.');
const runtimePath = runtimePaths[0];
const files = [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const poses = [
  { id: 'intersection', version: 1, player: { x: 20.721, y: 2.33 }, camera: { azimuth: 3.361593, polar: 1.05, distance: 32, targetOffset: { x: 0, y: -11.32, height: 4 } } },
  { id: 'mitsui', version: 1, player: { x: 24.7, y: -18.5 }, camera: { azimuth: -0.4, polar: 1.05, distance: 36, targetOffset: { x: -4.7, y: 25, height: 11 } } },
  { id: 'daiya', version: 1, player: { x: 23.8, y: 2.1 }, camera: { azimuth: 3.541593, polar: 1.05, distance: 36, targetOffset: { x: -6.8, y: -24.1, height: 10 } } },
];
const sourceBindings = [];
for (const [path, bytes] of assets) {
  if (!path.endsWith('.js.map')) continue;
  const map = JSON.parse(bytes);
  map.sources?.forEach((source, index) => {
    if (/\/(architectural-profile|architectural-materials|world-view|camera|create-game|lighting)\.js$/.test(source)
      && typeof map.sourcesContent?.[index] === 'string') sourceBindings.push({ source, sourceMap: path, sha256: sha(map.sourcesContent[index]) });
  });
}
const report = { startedAt: new Date().toISOString(), artifact: { directory: dist, manifestSha256: sha(JSON.stringify(files)), files },
  driverSha256: sha(readFileSync(new URL(import.meta.url))), sourceBindings, poses, captures: [], errors: [],
  method: 'Six canonical views construct the shipped public createGame API with initialView and lightingMode. Two phone views use actual homepage controls. Runtime observations are read-only.',
  limitations: ['Canonical full-canvas art framing is a capture harness; phone captures show the integrated homepage.',
    'These images establish rendered appearance for independent review, not human place recognition or enjoyment.',
    'The software GPU supplies compatibility evidence; cadence is not physical-device performance.'] };
const save = () => writeFileSync(join(output, 'art-poses-result.json'), JSON.stringify(report, null, 2) + '\n');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff': 'font/woff' };
const service = await startServer({ port: 0, host: '127.0.0.1', databasePath: join(output, 'rooms.sqlite'),
  config: { provider: { apiKey: '', model: '' } } });
const browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || undefined, headless: true, args: ['--no-sandbox'] });
report.browser = browser.version();
const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><style>html,body,#scene{margin:0;width:100%;height:100%;overflow:hidden}</style></head><body><div id="scene"></div></body></html>';
const contexts = new Set();
async function contextFor(phone = false) {
  const context = await browser.newContext({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
  contexts.add(context);
  const requests = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== service.url) throw new Error('Unexpected external request: ' + url.origin);
    if (url.pathname.startsWith('/api/')) return route.continue();
    if (url.pathname === '/art-capture.html') return route.fulfill({ status: 200, body: html, contentType: 'text/html' });
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const bytes = assets.get(path); requests.push(path);
    if (!bytes) throw new Error('Unpackaged asset: ' + path);
    return route.fulfill({ status: 200, body: bytes, contentType: mime[extname(path)] || 'application/octet-stream' });
  });
  const page = await context.newPage(); page.setDefaultTimeout(90000);
  page.on('pageerror', error => { report.errors.push(error.message); save(); });
  page.on('console', message => { if (message.type() === 'error') { report.errors.push(message.text()); save(); } });
  return { context, page, requests };
}
async function capture(page, id, settings, requests, selector) {
  await page.waitForFunction(mode => {
    const value = window.__TOUR_GAME__?.renderer();
    return value?.status === 'ready' && value.renderedFrames > 0 && value.lighting.phase === 'ready' && value.lighting.mode === mode;
  }, settings.mode);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (!selector) await page.locator('#live-stage canvas').scrollIntoViewIfNeeded();
  const observation = await page.evaluate(() => ({ state: window.__TOUR_GAME__.snapshot(), camera: window.__TOUR_GAME__.camera(),
    viewport: window.__TOUR_GAME__.viewport(), renderer: window.__TOUR_GAME__.renderer(),
    document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
      pointerCoarse: matchMedia('(pointer: coarse)').matches, pointerFine: matchMedia('(pointer: fine)').matches,
      guidance: document.querySelector('#view-guidance')?.textContent ?? null },
    canvas: document.querySelector('canvas').getBoundingClientRect().toJSON() }));
  const path = join(output, id + '.png');
  if (selector) await page.locator(selector).screenshot({ path });
  else await page.screenshot({ path, fullPage: false });
  report.captures.push({ id, ...settings, file: id + '.png', sha256: sha(readFileSync(path)), observation, requests: [...new Set(requests)] });
  save(); console.log('CAPTURE ' + id);
}
try {
  for (const pose of phoneOnly ? [] : poses) {
    for (const mode of ['day', 'night']) {
      const { context, page, requests } = await contextFor();
      await page.goto(service.url + '/art-capture.html?qa=1');
      await page.evaluate(async ({ runtimePath, pose, mode }) => {
        const module = await import(runtimePath);
        const exports = Object.values(module).filter(value => typeof value === 'function');
        if (exports.length !== 1) throw new Error('Unexpected compiled createGame exports.');
        await exports[0](document.querySelector('#scene'), { initialView: pose, encounters: false, lightingMode: mode, locale: 'en' });
      }, { runtimePath, pose, mode });
      await capture(page, `${pose.id}-${mode}-desktop`, { mode, framing: 'canonical-live-runtime', requestedView: pose }, requests, '#scene canvas');
      await context.close(); contexts.delete(context);
    }
  }
  const { context, page, requests } = await contextFor(true);
  await page.goto(service.url + '/?qa=1&lang=en');
  await capture(page, 'opening-day-phone', { mode: 'day', framing: 'integrated-homepage' }, requests);
  const before = await page.evaluate(() => window.__TOUR_GAME__.renderer().renderedFrames);
  await page.locator('#lighting-night').tap();
  await page.waitForFunction(value => window.__TOUR_GAME__.renderer().renderedFrames > value, before);
  await capture(page, 'opening-night-phone', { mode: 'night', framing: 'integrated-homepage' }, requests);
  await context.close(); contexts.delete(context);
  if (report.errors.length) throw new Error('Browser reported errors.');
  report.status = 'captured-for-review';
} catch (error) {
  report.error = { message: error.message, stack: error.stack }; report.status = 'incomplete'; process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close();
  await browser.close(); await service.close();
  report.finishedAt = new Date().toISOString(); save();
}
