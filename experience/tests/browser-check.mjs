// Exercise a built distribution, because source inspection cannot prove shipped
// assets, input behavior or output. This is a bounded evidence driver, not an art
// acceptance gate. It uses actual input and a read-only ?qa=1 observer; no teleport.
import { chromium } from 'playwright';
import { Matrix4, Vector3 } from 'three';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, join, relative, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WORLD, PLAYER_RADIUS } from '../src/simulation/world.js';
import { STORAGE_KEY, LEGACY_KEY } from '../src/app/journey-store.js';

if (!process.argv[2]) {
  console.error('Usage: npm run test:browser -- <built-dist-directory>');
  process.exit(2);
}
const dist = resolve(process.argv[2]);
const output = resolve(process.env.EXPERIENCE_QA_OUTPUT || join(tmpdir(), 'experience-qa'));
const timeout = Number(process.env.EXPERIENCE_QA_TIMEOUT || 90000);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = new Map();
function collect(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) collect(path);
    else if (item.isFile()) assets.set('/' + relative(dist, path).split(sep).join('/'), readFileSync(path));
  }
}
collect(dist);
if (!assets.has('/index.html')) throw new Error('The specified directory has no built index.html. Run npm run build first.');
mkdirSync(output, { recursive: true });
const manifest = [...assets].sort(([a], [b]) => a.localeCompare(b)).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha(bytes) }));
const report = {
  startedAt: new Date().toISOString(), artifact: { directory: dist, manifestSha256: sha(JSON.stringify(manifest)), files: manifest },
  driverSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  conditions: { viewport: [1440, 1000], compactViewport: [1280, 720], deviceScaleFactor: 1, readOnlyObserver: '?qa=1', timeoutMs: timeout },
  checks: [], actions: [], scenarios: {}, screenshots: [], observations: {},
  limitations: ['Agent/automation evidence is not human art, fluency or immersion acceptance.',
    'Software GPU timings are not desktop hardware performance acceptance.',
    'HTTP packaged-resource loading is exercised; native file:// launch requires a browser environment permitting that scheme.'],
};
const persist = () => writeFileSync(join(output, 'browser-result.json'), JSON.stringify(report, null, 2) + '\n');
const check = (id, pass, evidence) => {
  report.checks.push({ id, pass: Boolean(pass), evidence }); persist();
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`);
};
const action = async (description, run) => {
  report.actions.push({ description, time: new Date().toISOString() }); persist();
  console.log(`ACTION ${description}`); return run();
};
const origin = 'http://127.0.0.1:4187';
const entry = origin + '/?qa=1';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json' };
const samePosition = (a, b) => a.x === b.x && a.y === b.y;
const journey = state => JSON.stringify({ visited: state.visitedIds, read: state.readSourceIds, choices: state.choiceIds, selected: state.selectedTargetId });
const delta = (a, b) => ({ x: b.x - a.x, y: b.y - a.y });
const length = v => Math.hypot(v.x, v.y);
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));
let browser;
const contexts = [];
async function scenario(name, seed = {}, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, ...options });
  contexts.push(context);
  const record = report.scenarios[name] = { requests: [], externalRequests: [], pageErrors: [], consoleErrors: [] };
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    if (url.origin === origin && assets.has(path)) {
      record.requests.push(path);
      return route.fulfill({ status: 200, contentType: types[extname(path)] || 'application/octet-stream', body: assets.get(path) });
    }
    record.externalRequests.push(url.href); await route.abort('blockedbyclient');
  });
  await context.addInitScript(seed => {
    if (!sessionStorage.getItem('qa-seeded')) {
      for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value);
      sessionStorage.setItem('qa-seeded', '1');
    }
  }, seed);
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  page.on('pageerror', error => { record.pageErrors.push(error.message); persist(); });
  page.on('console', message => { if (message.type() === 'error') { record.consoleErrors.push(message.text()); persist(); } });
  await page.goto(entry);
  await page.waitForFunction(() => window.__TOUR_GAME__ && document.querySelector('#loading')?.hidden, null, { timeout });
  return { context, page, record };
}
const observed = page => page.evaluate(() => window.__TOUR_GAME__.snapshot());
const camera = page => page.evaluate(() => window.__TOUR_GAME__.camera());
const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORAGE_KEY);
const settle = page => page.waitForTimeout(900);
async function capture(page, name) {
  const path = join(output, name + '.png'); await page.screenshot({ path, fullPage: true });
  report.screenshots.push({ name, path, sha256: sha(readFileSync(path)) }); persist();
}
async function locale(page, value, inCard = false) {
  await page.locator(`${inCard ? '#place-dialog' : '#language-switch'} [data-locale="${value}"]`).click();
  await page.waitForFunction(value => document.documentElement.lang === value, value);
}
async function moveKey(page, key, minimum = 0.35) {
  await page.locator('#game-stage').focus(); const before = await observed(page);
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(({ before, minimum }) => {
      const s = window.__TOUR_GAME__.snapshot(); return Math.hypot(s.x - before.x, s.y - before.y) >= minimum;
    }, { before, minimum }, { timeout });
  } finally { await page.keyboard.up(key); }
  await settle(page); return { before, after: await observed(page) };
}
async function approach(page, id, trace = []) {
  await action(`Walk through the journey control to ${id}`, () => page.locator(`[data-target="${id}"]`).click());
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const state = await observed(page); trace.push({ x: state.x, y: state.y });
    if (state.nearbyTargetId === id && state.targetDistance <= 0.2 && !state.destination) return state;
    await page.waitForTimeout(150);
  }
  throw new Error(`Visible journey control did not reach ${id}`);
}
async function open(page) {
  await page.locator('#game-stage').focus(); await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('#place-dialog').open);
}
async function close(page) {
  await page.locator('#card-close').click();
  await page.waitForFunction(() => !document.querySelector('#place-dialog').open);
}
function screenPoint(x, north, height, view, rect) {
  const p = new Vector3(x, height, -north)
    .applyMatrix4(new Matrix4().fromArray(view.matrixWorld).invert())
    .applyMatrix4(new Matrix4().fromArray(view.projectionMatrix));
  if (Math.abs(p.x) >= 1 || Math.abs(p.y) >= 1 || p.z < -1 || p.z > 1) throw new Error('Chosen pavement point is not in the current camera');
  return { x: rect.x + (p.x + 1) * rect.width / 2, y: rect.y + (1 - p.y) * rect.height / 2 };
}

try {
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM || undefined, headless: true, args: ['--no-sandbox'] });
  report.browser = browser.version(); persist();
  const main = await scenario('three-encounter-walk');
  const { page } = main;
  report.observations.openingCamera = await camera(page);
  report.observations.renderer = await page.locator('canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2'); const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return gl ? { version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(ext?.UNMASKED_RENDERER_WEBGL || gl.RENDERER) } : null;
  });
  check('actual-webgl-scene-ready', Boolean(report.observations.renderer), report.observations.renderer);
  await capture(page, 'opening-en');
  const initial = await observed(page);
  await locale(page, 'zh');
  check('chinese-goals-controls-and-camera-guidance', /[\u3400-\u9fff]/.test(await page.locator('#objective').innerText()) && /[\u3400-\u9fff]/.test(await page.locator('#camera-toolbar').innerText()));
  check('locale-preserves-position-and-journey', samePosition(initial, await observed(page)) && journey(initial) === journey(await observed(page)));
  await capture(page, 'opening-zh'); await locale(page, 'en');

  // Remove optional inertia for numerical picking checks, then restore normal
  // motion for the walkthrough. This uses the actual system preference contract.
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.locator('#camera-reset').click();
  let view = await camera(page);
  const right = await action('Walk right relative to the guided camera', () => moveKey(page, 'ArrowRight'));
  const displacement = delta(right.before, right.after);
  const rightAxis = { x: view.matrixWorld[0], y: -view.matrixWorld[2] };
  const alignment = (displacement.x * rightAxis.x + displacement.y * rightAxis.y) / (length(displacement) * length(rightAxis));
  check('keyboard-movement-is-camera-relative', alignment > 0.999, { displacement, rightAxis, alignment });
  const released = await observed(page); await settle(page);
  check('key-release-stops-walking', samePosition(released, await observed(page)));
  const rect = await page.locator('#game-stage canvas').boundingBox();
  const beforeDrag = await observed(page), beforeCamera = await camera(page);
  await page.mouse.move(rect.x + rect.width * .72, rect.y + rect.height * .63);
  await page.mouse.down(); await page.mouse.move(rect.x + rect.width * .47, rect.y + rect.height * .67, { steps: 8 }); await page.mouse.up();
  await settle(page); view = await camera(page);
  check('drag-orbits-without-queuing-a-walk', Math.abs(view.azimuth - beforeCamera.azimuth) > .02 && samePosition(beforeDrag, await observed(page)) && !(await observed(page)).destination, { beforeCamera, afterCamera: view });
  const stillCamera = await camera(page); await settle(page);
  check('reduced-motion-orbit-stops-after-release', Math.abs(stillCamera.azimuth - (await camera(page)).azimuth) < .000001);
  const rotatedWalk = await moveKey(page, 'ArrowRight');
  const rotatedDelta = delta(rotatedWalk.before, rotatedWalk.after);
  const rotatedAxis = { x: view.matrixWorld[0], y: -view.matrixWorld[2] };
  const rotatedAlignment = (rotatedDelta.x * rotatedAxis.x + rotatedDelta.y * rotatedAxis.y) / (length(rotatedDelta) * length(rotatedAxis));
  check('walking-adapts-to-rotated-camera', rotatedAlignment > .999, { rotatedDelta, rotatedAxis, rotatedAlignment });
  await page.setViewportSize({ width: 1280, height: 720 }); await settle(page);
  const groundStart = await observed(page); view = await camera(page);
  const groundGoal = { x: groundStart.x + 2.2, y: WORLD.crossing.northY };
  const point = screenPoint(groundGoal.x, groundGoal.y, .17, view, await page.locator('#game-stage canvas').boundingBox());
  await action('Click visible ground after orbit and resize', () => page.mouse.click(point.x, point.y));
  await page.waitForFunction(goal => { const s = window.__TOUR_GAME__.snapshot(); return Math.hypot(s.x - goal.x, s.y - goal.y) < .08 && !s.destination; }, groundGoal, { timeout });
  check('actual-raycast-click-reaches-the-world-point', Math.hypot((await observed(page)).x - groundGoal.x, (await observed(page)).y - groundGoal.y) < .08, { screen: point, intended: groundGoal, arrived: await observed(page) });
  // A different actual mesh height distinguishes surface picking from a single
  // navigation-plane approximation. These are authored asset heights, not surveys.
  await settle(page); view = await camera(page);
  const roadGoal = { x: groundGoal.x + 1.5, y: WORLD.roadSurface.northY - 1.5 };
  const roadPoint = screenPoint(roadGoal.x, roadGoal.y, .05, view, await page.locator('#game-stage canvas').boundingBox());
  await action('Click the actual lower road surface', () => page.mouse.click(roadPoint.x, roadPoint.y));
  await page.waitForFunction(goal => { const s = window.__TOUR_GAME__.snapshot(); return Math.hypot(s.x - goal.x, s.y - goal.y) < .08 && !s.destination; }, roadGoal, { timeout });
  check('road-height-picking-is-not-a-fixed-pavement-plane', Math.hypot((await observed(page)).x - roadGoal.x, (await observed(page)).y - roadGoal.y) < .08, { screen: roadPoint, intended: roadGoal, arrived: await observed(page) });
  await locale(page, 'zh'); await capture(page, 'compact-zh');
  const layout = await page.evaluate(() => {
    const stage = document.querySelector('#game-stage').getBoundingClientRect(), canvas = document.querySelector('canvas').getBoundingClientRect();
    const footer = document.querySelector('.bottom-bar').getBoundingClientRect();
    return { viewport: [innerWidth, innerHeight], document: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], canvas: [canvas.width, canvas.height], stage: [stage.width, stage.height], exportBottom: document.querySelector('#export-notes').getBoundingClientRect().bottom, footerTop: footer.top };
  });
  check('compact-layout-and-canvas-fit-after-capture', layout.document[0] === 1280 && layout.document[1] === 720 && layout.canvas.every((v, i) => Math.abs(v - layout.stage[i]) <= 1) && layout.exportBottom <= layout.footerTop, layout);
  await page.setViewportSize({ width: 1440, height: 1000 }); await locale(page, 'en'); await page.locator('#camera-reset').click();
  await page.locator('#game-stage').focus(); await page.keyboard.down('ArrowUp');
  try { await page.waitForFunction(max => window.__TOUR_GAME__.snapshot().y >= max - .002, WORLD.northFacadeY - PLAYER_RADIUS, { timeout }); }
  finally { await page.keyboard.up('ArrowUp'); }
  const wall = await observed(page); await page.keyboard.down('ArrowUp');
  try { await page.waitForFunction(tick => window.__TOUR_GAME__.snapshot().tick >= tick + 12, wall.tick, { timeout }); }
  finally { await page.keyboard.up('ArrowUp'); }
  check('north-facade-blocks-forward-motion', Math.abs((await observed(page)).y - wall.y) <= .001, { before: wall, after: await observed(page) });
  await capture(page, 'actor-near-facade');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await approach(page, 'crossing'); const prompt = await page.locator('#interact-button').innerText(); await settle(page);
  check('nearby-prompt-is-stable', await page.locator('#interact-button').isVisible() && prompt === await page.locator('#interact-button').innerText());
  await page.keyboard.down('e'); await page.keyboard.down('e'); await page.keyboard.up('e');
  await page.waitForFunction(() => document.querySelector('#place-dialog').open);
  const opened = await observed(page);
  check('opening-does-not-award-visit-or-source-read', opened.visitedIds.length === 0 && opened.readSourceIds.length === 0);
  await capture(page, 'crossing-card-en');
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1000); await page.keyboard.up('ArrowRight');
  check('modal-pauses-movement', samePosition(opened, await observed(page)) && (await observed(page)).paused);
  await locale(page, 'zh', true);
  check('open-card-locale-keeps-state-and-focus', samePosition(opened, await observed(page)) && journey(opened) === journey(await observed(page)) && await page.evaluate(() => document.activeElement?.dataset.locale === 'zh' && Boolean(document.activeElement.closest('#place-dialog'))));
  await capture(page, 'crossing-card-zh'); await close(page); await settle(page);
  check('close-does-not-reopen-and-restores-focus', !await page.locator('#place-dialog').evaluate(el => el.open) && await page.evaluate(() => document.activeElement.id === 'game-stage'));
  await locale(page, 'en'); await open(page); await page.locator('#source-details summary').click(); await settle(page);
  check('source-reading-remains-separate-from-visiting', (await observed(page)).readSourceIds.includes('crossing') && !(await observed(page)).visitedIds.length);
  await page.locator('[data-choice="north-first"]').click();
  check('choice-records-visit-and-next-target', (await observed(page)).choiceIds.crossing === 'north-first' && (await observed(page)).visitedIds.length === 1 && (await observed(page)).selectedTargetId === 'mitsui');

  const note = '<b data-personal-note>晚风 & "灯光"</b>\nA quiet crossing.';
  await page.locator('#memory-note').fill(note); await locale(page, 'zh', true);
  check('note-draft-survives-locale-without-autosaving', await page.locator('#memory-note').inputValue() === note && !(await saved(page)).notes.crossing);
  await page.locator('#memory-note').fill('x'.repeat(500)); await page.locator('#memory-note').press('End'); await page.keyboard.type('extra');
  check('note-input-enforces-500-character-bound', (await page.locator('#memory-note').inputValue()).length === 500 && /500/.test(await page.locator('#memory-limit').innerText()));
  await page.locator('#memory-note').fill(note); const beforeNote = await observed(page); await page.locator('#save-memory').click();
  check('explicit-note-save-preserves-journey-meaning', (await saved(page)).notes.crossing === note && journey(beforeNote) === journey(await observed(page)));
  await capture(page, 'saved-personal-note-zh'); await page.locator('#card-continue').click();
  const resumed = await moveKey(page, 'ArrowRight'); check('card-close-resumes-walking', length(delta(resumed.before, resumed.after)) > .2);
  await settle(page); const beforeReload = await saved(page); await page.reload();
  await page.waitForFunction(() => window.__TOUR_GAME__ && document.querySelector('#loading').hidden, null, { timeout }); await settle(page);
  const restored = await saved(page);
  check('reload-retains-world-position-choices-locale-and-note', samePosition(beforeReload.game, restored.game) && journey(beforeReload.game) === journey(restored.game) && restored.locale === 'zh' && restored.notes.crossing === note, { before: beforeReload, after: restored });

  await locale(page, 'en'); await approach(page, 'mitsui'); await open(page); await page.locator('[data-choice="street-only"]').click();
  check('mitsui-skip-retains-visit-without-planned-station-stop', (await observed(page)).choiceIds.mitsui === 'street-only' && (await observed(page)).visitedIds.includes('mitsui'));
  await page.locator('#card-continue').click(); await locale(page, 'zh');
  const roadTrace = []; await approach(page, 'mufg', roadTrace);
  const road = roadTrace.filter(p => p.y < -2 && p.y > -15);
  check('real-bank-walk-uses-the-mapped-crossing', road.length > 0 && road.every(p => Math.abs(p.x - WORLD.crossing.x) < .08), road);
  await capture(page, 'south-bank-approach'); await open(page); await capture(page, 'bank-card-zh');
  await page.locator('[data-choice="no-cash-stop"]').click();
  check('all-three-encounters-complete-with-distinct-choices', JSON.stringify((await observed(page)).visitedIds) === JSON.stringify(['crossing', 'mitsui', 'mufg']) && (await observed(page)).choiceIds.mufg === 'no-cash-stop');
  await page.locator('#card-continue').click(); const chineseResume = await moveKey(page, 'ArrowRight');
  check('chinese-encounter-chain-resumes', length(delta(chineseResume.before, chineseResume.after)) > .2 && !await page.locator('#place-dialog').evaluate(el => el.open));
  await capture(page, 'completed-walk-zh');
  const downloadEvent = page.waitForEvent('download'); await page.locator('#export-notes').click();
  const download = await downloadEvent, notesPath = join(output, 'played-field-notes-zh.html'); await download.saveAs(notesPath);
  const notesHtml = readFileSync(notesPath);
  const notesPage = await main.context.newPage(); const notesUrl = origin + '/qa-export.html';
  await notesPage.route(notesUrl, route => route.fulfill({ status: 200, contentType: 'text/html', body: notesHtml }));
  await notesPage.setViewportSize({ width: 390, height: 844 }); await notesPage.goto(notesUrl);
  const exported = await notesPage.evaluate(() => ({ text: document.body.innerText, personal: document.querySelector('.personal-note p')?.textContent, injectedElement: Boolean(document.querySelector('[data-personal-note]')), width: document.documentElement.scrollWidth, language: document.documentElement.lang }));
  check('download-reflects-choices-and-escaped-personal-note', exported.personal === note && !exported.injectedElement && exported.text.includes('不安排现金服务停留') && !exported.text.includes('现金计划：'), exported);
  check('export-fits-phone-width', exported.width <= 390 && exported.language === 'zh', exported.width);
  await capture(notesPage, 'field-notes-zh-mobile'); await notesPage.emulateMedia({ media: 'print' }); await notesPage.setViewportSize({ width: 850, height: 1100 }); await capture(notesPage, 'field-notes-zh-print'); await notesPage.close();
  report.observations.finalJourney = await saved(page);
  check('walk-has-no-external-requests-or-browser-errors', !main.record.externalRequests.length && !main.record.pageErrors.length && !main.record.consoleErrors.length, main.record);
  await main.context.close();

  for (const name of ['legacy-v1-mid-journey', 'legacy-v1-completed']) {
    const old = fixture(name); const migrated = await scenario(name, { [LEGACY_KEY]: JSON.stringify(old) });
    await settle(migrated.page); const current = await saved(migrated.page);
    check(`${name}-migrates-in-the-real-app`, current.version === 2 && current.locale === old.locale && samePosition(current.game, old.game) && journey(current.game) === journey(old.game), { before: old, after: current });
    await migrated.page.reload(); await migrated.page.waitForFunction(() => window.__TOUR_GAME__ && document.querySelector('#loading').hidden, null, { timeout });
    check(`${name}-migration-survives-reload`, samePosition((await saved(migrated.page)).game, old.game) && journey((await saved(migrated.page)).game) === journey(old.game));
    check(`${name}-no-external-requests-or-errors`, !migrated.record.externalRequests.length && !migrated.record.pageErrors.length && !migrated.record.consoleErrors.length, migrated.record);
    await migrated.context.close();
  }
  report.status = 'Browser walkthrough completed; independent visual review and human acceptance remain separate.';
} catch (error) {
  check('browser-run-completed', false, error.stack || String(error)); report.status = 'Incomplete or failed; do not claim playable validation.';
  const page = contexts.flatMap(context => context.pages()).findLast(page => !page.isClosed());
  if (page) await capture(page, 'failure').catch(() => {});
} finally {
  report.summary = { passed: report.checks.filter(c => c.pass).length, failed: report.checks.filter(c => !c.pass).length };
  report.finishedAt = new Date().toISOString(); persist();
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close();
}
process.exitCode = report.summary.failed ? 1 : 0;
