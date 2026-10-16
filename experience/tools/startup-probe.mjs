import { chromium } from 'playwright';
import { startServer } from '../server/src/server.js';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const dist = resolve(repository, process.env.STARTUP_PROBE_DIST || 'experience/dist');
const output = resolve(repository, process.env.STARTUP_PROBE_OUTPUT || 'artifacts/startup-probe');
mkdirSync(output, { recursive: true });
process.env.TMPDIR = join(output, 'tmp'); mkdirSync(process.env.TMPDIR, { recursive: true });
const assets = new Map();
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else assets.set('/' + relative(dist, path), readFileSync(path));
  }
}
collect(dist);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { startedAt: new Date().toISOString(), errors: [], checks: [],
  driverSha256: sha(readFileSync(new URL(import.meta.url))),
  files: [...assets].map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) })),
  conditions: { viewport: [1440, 1000], dpr: 1, tlsVerification: true, inputs: 'Actual keyboard and homepage controls; read-only diagnostic observations.' } };
const save = () => writeFileSync(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
const check = (id, pass, evidence) => { report.checks.push({ id, pass: Boolean(pass), evidence }); save(); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`); };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary' };
const service = await startServer({ port: 0, host: '127.0.0.1', databasePath: join(output, 'rooms.sqlite'),
  config: { provider: { apiKey: '', model: '', baseUrl: 'https://api.openai.com/v1' } } });
const proxyValue = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxy = proxyValue ? new URL(proxyValue) : null;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'],
    ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1', ...(proxy.username ? {
      username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
  report.conditions.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== service.url || url.pathname.startsWith('/api/')) return route.continue();
    const path = url.pathname === '/' ? '/index.html' : url.pathname;
    const bytes = assets.get(path);
    return route.fulfill({ status: bytes ? 200 : 404, contentType: mime[extname(path)] || 'application/octet-stream', body: bytes || 'Missing packaged asset' });
  });
  const page = await context.newPage(); page.setDefaultTimeout(120000);
  page.on('pageerror', error => report.errors.push(error.message));
  const state = () => page.evaluate(() => ({ player: window.__TOUR_GAME__.snapshot(), renderer: window.__TOUR_GAME__.renderer(),
    home: window.__HOME__.snapshot(), locale: document.documentElement.lang, aria: document.querySelector('#live-stage canvas').getAttribute('aria-label') }));
  async function walk(id) {
    const before = await state();
    await page.keyboard.down('ArrowRight');
    try { await page.waitForFunction(x => window.__TOUR_GAME__.snapshot().x > x + 0.15, before.player.x); }
    finally { await page.keyboard.up('ArrowRight'); }
    await page.waitForFunction(() => !window.__TOUR_GAME__.snapshot().moving);
    const after = await state();
    check(id, after.player.x > before.player.x + 0.15 && after.renderer.renderedFrames > before.renderer.renderedFrames,
      { before: { x: before.player.x, frames: before.renderer.renderedFrames }, after: { x: after.player.x, frames: after.renderer.renderedFrames } });
  }
  await page.goto(`${service.url}/?qa=1&lang=en`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__HOME__?.snapshot().sceneState === 'ready' && window.__TOUR_GAME__?.renderer().renderedFrames >= 1);
  await page.waitForTimeout(150);
  const initial = await state();
  check('ready-follows-one-initial-draw', initial.renderer.renderedFrames === 1 && initial.renderer.startup.firstRenderMs >= 0,
    { frames: initial.renderer.renderedFrames, startup: initial.renderer.startup, rendererStatus: initial.renderer.status });
  await walk('visible-keyboard-walk-renders');
  const beforeLocale = await state();
  await page.locator('#locale-zh').click();
  const chinese = await state();
  check('locale-updates-accessibility-with-position-preserved', chinese.locale === 'zh' && chinese.aria.includes('京都')
    && chinese.player.x === beforeLocale.player.x && chinese.player.y === beforeLocale.player.y,
    { locale: chinese.locale, aria: chinese.aria, before: { x: beforeLocale.player.x, y: beforeLocale.player.y }, after: { x: chinese.player.x, y: chinese.player.y } });
  const nightBefore = chinese.renderer.renderedFrames;
  await page.locator('#lighting-night').click();
  await page.waitForFunction(frames => {
    const renderer = window.__TOUR_GAME__.renderer();
    return renderer.lighting.phase === 'ready' && renderer.lighting.mode === 'night' && renderer.renderedFrames > frames;
  }, nightBefore);
  const night = await state();
  check('night-ready-is-rendered', night.renderer.lighting.environment.status === 'ready',
    { frames: night.renderer.renderedFrames, lighting: night.renderer.lighting });
  await page.locator('#mode-together').click();
  const hiddenBefore = await state();
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(2000); await page.keyboard.up('ArrowRight');
  const hiddenAfter = await state();
  check('hidden-scene-is-paused-with-zero-work', hiddenAfter.player.paused && !hiddenAfter.renderer.visible
    && hiddenAfter.renderer.updateFrames === hiddenBefore.renderer.updateFrames
    && hiddenAfter.renderer.renderedFrames === hiddenBefore.renderer.renderedFrames
    && hiddenAfter.player.x === hiddenBefore.player.x && hiddenAfter.player.y === hiddenBefore.player.y,
    { updateDelta: hiddenAfter.renderer.updateFrames - hiddenBefore.renderer.updateFrames,
      renderDelta: hiddenAfter.renderer.renderedFrames - hiddenBefore.renderer.renderedFrames, sampleMs: 2000,
      before: { x: hiddenBefore.player.x, y: hiddenBefore.player.y }, after: { x: hiddenAfter.player.x, y: hiddenAfter.player.y } });
  await page.locator('#mode-explore').click();
  const resumed = await state();
  check('resume-preserves-night-position-and-enables-play', !resumed.player.paused && resumed.renderer.visible
    && resumed.renderer.lighting.mode === 'night' && resumed.player.x === hiddenAfter.player.x && resumed.player.y === hiddenAfter.player.y,
    { paused: resumed.player.paused, visible: resumed.renderer.visible, lighting: resumed.renderer.lighting.mode });
  await walk('resumed-keyboard-walk-renders');
  check('no-page-exceptions', report.errors.length === 0, report.errors);
  if (report.checks.some(value => !value.pass)) process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString(); save();
  await browser?.close(); await service.close();
}
