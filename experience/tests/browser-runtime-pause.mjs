// 验证共享 runtime 的启动、暂停与外观更新，使用已保存的真实格式及实际 UI 输入。
import { chromium } from 'playwright';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';

if (!process.argv[2]) throw new Error('Usage: node tests/browser-runtime-pause.mjs <built-dist-directory>');
const dist = resolve(process.argv[2]);
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || '../artifacts/runtime-pause');
const timeout = Number(process.env.EXPERIENCE_QA_TIMEOUT || 60000);
mkdirSync(output, { recursive: true });
const assets = new Map();
function collect(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) collect(path);
    else assets.set('/' + relative(dist, path), readFileSync(path));
  }
}
collect(dist);
if (!assets.has('/walk.html')) throw new Error('Built walk.html is required.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const report = { startedAt: new Date().toISOString(), artifact: { manifestSha256: sha(JSON.stringify(files)), files },
  driverSha256: sha(readFileSync(new URL(import.meta.url))), checks: [], scenarios: {}, screenshots: [],
  conditions: { viewport: [1440, 1000], timeoutMs: timeout, reducedMotion: 'reduce', readOnlyObserver: '?qa=1',
    startupFixture: 'A valid completed legacy journey restored into v2; no test teleport or mutable runtime API.' },
  limitations: ['Focused shared-runtime regression; the full three-encounter route is outside this run.',
    'Delayed local HDR/GLB requests are explicit fault scheduling; no successful asset bytes are fabricated.',
    'Automated software-GPU evidence does not establish physical-device fluency or preferred appearance.'] };
const persist = () => writeFileSync(join(output, 'runtime-pause-result.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, pass, evidence) {
  report.checks.push({ id, pass: Boolean(pass), evidence }); persist(); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`);
}
const origin = 'http://127.0.0.1:4189';
const key = 'tourguideai:journey:v2';
const appearanceKey = 'tourguideai:appearance:v1';
const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v1-completed.json', import.meta.url)));
const seed = { version: 2, locale: 'en', hints: true, notes: { crossing: 'Previously saved memory' }, game: legacy.game };
const rig = JSON.parse(assets.get('/lighting/rig.json'));
const nightPath = new URL(rig.modes.night.environment.file, origin + '/lighting/rig.json').pathname;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff' };
const contexts = new Set();
const browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || undefined, headless: true, args: ['--no-sandbox'] });
report.conditions.browser = browser.version();
async function scenario(name, delay = () => undefined) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  contexts.add(context);
  const record = report.scenarios[name] = { requests: [], external: [], errors: [], consoleErrors: [] };
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || !assets.has(url.pathname)) {
      record.external.push(url.href); return route.abort('blockedbyclient');
    }
    record.requests.push(url.pathname); await delay(url.pathname);
    return route.fulfill({ status: 200, body: assets.get(url.pathname), contentType: mime[extname(url.pathname)] || 'application/octet-stream' });
  });
  await context.addInitScript(({ key, appearanceKey, seed }) => {
    localStorage.setItem(key, JSON.stringify(seed));
    localStorage.setItem(appearanceKey, JSON.stringify({ lighting: 'day' }));
  }, { key, appearanceKey, seed });
  const page = await context.newPage(); page.setDefaultTimeout(timeout);
  page.on('pageerror', error => record.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push(message.text()); });
  await page.goto(origin + '/walk.html?qa=1&lang=en', { waitUntil: 'domcontentloaded' });
  return { context, page, record };
}
const state = page => page.evaluate(() => ({ player: window.__TOUR_GAME__.snapshot(), camera: window.__TOUR_GAME__.camera(),
  renderer: window.__TOUR_GAME__.renderer(), focus: document.activeElement.id }));
const ready = page => page.waitForFunction(() => window.__TOUR_GAME__?.renderer().status === 'ready'
  && document.querySelector('#loading').hidden, null, { timeout });
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const position = value => ({ x: value.player.x, y: value.player.y });
const samePosition = (a, b) => a.player.x === b.player.x && a.player.y === b.player.y;
const pose = value => JSON.stringify([value.camera.position, value.camera.target]);
const progress = value => JSON.stringify([value.game.visitedIds, value.game.choiceIds, value.notes]);
async function capture(page, name) {
  const path = join(output, name + '.png'); await page.screenshot({ path, fullPage: true });
  report.screenshots.push({ name, path, sha256: sha(readFileSync(path)) }); persist();
}
async function movingInput(page, id) {
  await page.locator('#game-stage').focus();
  const before = await state(page);
  await page.keyboard.down('ArrowRight');
  try {
    await page.waitForFunction(before => {
      const value = window.__TOUR_GAME__.snapshot();
      return Math.hypot(value.x - before.x, value.y - before.y) > 0.1;
    }, position(before), { timeout });
  } finally { await page.keyboard.up('ArrowRight'); }
  await page.waitForFunction(() => !window.__TOUR_GAME__.snapshot().moving, null, { timeout });
  const stopped = await state(page);
  await page.waitForFunction(tick => window.__TOUR_GAME__.snapshot().tick > tick + 5, stopped.player.tick, { timeout });
  const released = await state(page);
  check(id, !samePosition(before, stopped) && samePosition(stopped, released) && !released.player.paused
    && released.camera.enabled && released.renderer.renderedFrames > before.renderer.renderedFrames,
  { before: position(before), stopped: position(stopped), released: position(released), cameraEnabled: released.camera.enabled });
}
async function blockedInput(page, id) {
  const before = await state(page);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
  const after = await state(page);
  check(id, before.player.paused && after.player.paused && !after.camera.enabled && samePosition(before, after)
    && before.player.tick === after.player.tick && pose(before) === pose(after),
  { before: position(before), after: position(after), tickBefore: before.player.tick, tickAfter: after.player.tick, cameraEnabled: after.camera.enabled });
}
try {
  let releaseNight;
  const nightGate = new Promise(resolve => { releaseNight = resolve; });
  const main = await scenario('walk-modal-appearance', path => path === nightPath ? nightGate : undefined);
  const page = main.page; await ready(page);
  const initial = await state(page);
  check('restored-walk-ready-has-visible-frame-and-enabled-camera', initial.renderer.renderedFrames >= 1
    && initial.camera.enabled && !initial.player.paused && initial.player.nearbyTargetId === 'mufg', initial);
  await movingInput(page, 'held-key-moves-and-release-stops-before-modal');
  await page.locator('#appearance-controls [data-appearance="night"]').click();
  await page.waitForFunction(() => window.__TOUR_GAME__.renderer().lighting.phase === 'loading', null, { timeout });
  await page.locator('#game-stage').focus(); await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('#place-dialog').open, null, { timeout });
  await blockedInput(page, 'encounter-modal-stops-simulation-and-camera');
  const draft = 'Appearance transition preserves this draft. 夜景备注';
  await page.locator('#memory-note').fill(draft);
  await page.locator('#place-dialog [data-locale="zh"]').click();
  check('paused-locale-change-keeps-dialog-draft-and-focus', await page.locator('#memory-note').inputValue() === draft
    && await page.evaluate(() => document.documentElement.lang === 'zh' && document.querySelector('#place-dialog').open
      && document.activeElement.dataset.locale === 'zh' && window.__TOUR_GAME__.snapshot().paused
      && document.querySelector('#game-stage canvas').getAttribute('aria-label').includes('京都')));
  await page.locator('#memory-note').focus();
  const beforeNight = await state(page), beforeSaved = await saved(page);
  releaseNight();
  await page.waitForFunction(frames => {
    const value = window.__TOUR_GAME__.renderer();
    return value.lighting.phase === 'ready' && value.lighting.mode === 'night' && value.renderedFrames > frames;
  }, beforeNight.renderer.renderedFrames, { timeout });
  const afterNight = await state(page);
  check('delayed-night-draw-keeps-modal-position-draft-focus-and-progress', afterNight.player.paused && !afterNight.camera.enabled
    && samePosition(beforeNight, afterNight) && pose(beforeNight) === pose(afterNight) && afterNight.focus === 'memory-note'
    && await page.locator('#memory-note').inputValue() === draft && progress(await saved(page)) === progress(beforeSaved)
    && afterNight.renderer.lighting.environment.status === 'ready', { lighting: afterNight.renderer.lighting, focus: afterNight.focus });
  await capture(page, 'walk-night-modal-zh');
  await page.locator('#card-close').click();
  const closed = await state(page);
  await page.waitForFunction(tick => window.__TOUR_GAME__.snapshot().tick > tick + 5, closed.player.tick, { timeout });
  check('closing-modal-restores-control-without-replaying-held-key', !closed.player.paused && closed.camera.enabled
    && samePosition(closed, await state(page)) && await page.evaluate(() => document.activeElement.id === 'game-stage'));
  await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('#place-dialog').open, null, { timeout });
  check('reopened-card-retains-unsaved-draft', await page.locator('#memory-note').inputValue() === draft
    && !(await saved(page)).notes.mufg);
  await page.locator('#card-close').click();
  await movingInput(page, 'movement-and-key-release-work-after-appearance-modal');
  await page.locator('#export-notes').click();
  await page.waitForFunction(() => document.querySelector('#share-dialog').open, null, { timeout });
  await blockedInput(page, 'share-dialog-pauses-world');
  await page.locator('#share-dialog [data-locale="en"]').click();
  check('share-locale-change-preserves-pause-and-real-preview', await page.evaluate(() => document.documentElement.lang === 'en'
    && document.querySelector('#share-dialog').open && window.__TOUR_GAME__.snapshot().paused)
    && await page.locator('#share-preview').innerText().then(text => text.length > 0));
  await page.locator('#share-close').click();
  check('share-close-restores-camera-and-keeps-progress', !(await state(page)).player.paused && (await state(page)).camera.enabled
    && progress(await saved(page)) === progress(beforeSaved));
  await page.locator('#reset-button').click();
  await page.waitForFunction(() => document.querySelector('#reset-dialog').open, null, { timeout });
  await blockedInput(page, 'reset-confirmation-pauses-world');
  await page.locator('#cancel-reset').click();
  check('reset-cancel-resumes-with-night-and-progress-intact', !(await state(page)).player.paused && (await state(page)).camera.enabled
    && (await state(page)).renderer.lighting.mode === 'night' && progress(await saved(page)) === progress(beforeSaved));
  await movingInput(page, 'movement-resumes-after-reset-cancel');
  check('modal-scenario-has-no-external-requests-or-browser-errors', !main.record.external.length && !main.record.errors.length
    && !main.record.consoleErrors.length, main.record);
  await main.context.close(); contexts.delete(main.context);

  let releaseModel;
  const modelGate = new Promise(resolve => { releaseModel = resolve; });
  const startup = await scenario('share-during-startup', path => path.endsWith('.glb') ? modelGate : undefined);
  await startup.page.locator('#export-notes').click();
  await startup.page.waitForFunction(() => document.querySelector('#share-dialog').open, null, { timeout });
  await startup.page.locator('#share-dialog [data-locale="zh"]').click();
  const startupFocus = await startup.page.evaluate(() => document.activeElement.dataset.locale);
  releaseModel(); await ready(startup.page);
  const loaded = await state(startup.page);
  check('scene-completing-under-share-dialog-keeps-pause-and-current-locale', loaded.player.paused && !loaded.camera.enabled
    && loaded.renderer.renderedFrames >= 1 && await startup.page.evaluate(() => document.querySelector('#share-dialog').open
      && document.documentElement.lang === 'zh' && document.activeElement.dataset.locale === 'zh'
      && document.querySelector('#game-stage canvas').getAttribute('aria-label').includes('京都')), { startupFocus, loaded });
  await blockedInput(startup.page, 'startup-modal-keeps-input-blocked-after-first-draw');
  await startup.page.locator('#share-close').click();
  await movingInput(startup.page, 'closing-startup-modal-enables-normal-walking');
  check('startup-scenario-has-no-external-requests-or-browser-errors', !startup.record.external.length && !startup.record.errors.length
    && !startup.record.consoleErrors.length, startup.record);
} catch (error) {
  report.error = { message: error.message, stack: error.stack }; process.exitCode = 1;
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
  report.finishedAt = new Date().toISOString();
  report.summary = { passed: report.checks.filter(value => value.pass).length, failed: report.checks.filter(value => !value.pass).length };
  persist(); if (report.summary.failed || report.error) process.exitCode = 1;
}
