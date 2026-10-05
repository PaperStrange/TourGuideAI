// Ad hoc first-playable browser evidence, not a repository gate or test framework.
// The emitted HTML is a necessary input: source inspection cannot establish what
// the shipped bundle renders or whether it requests external resources.
// Requires an existing Playwright installation (NODE_PATH may select tooling)
// and Chromium. No browser download or project dependency installation is needed.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
if (!process.argv[2]) {
  console.error('Usage: node iteration/game/qa/browser-check.mjs <built-html> (build the production artifact first)');
  process.exit(2);
}
const artifact = resolve(process.argv[2]);
const output = resolve(process.env.TG_QA_OUTPUT || '/workspace/scratch/first-playable-evidence');
const html = readFileSync(artifact, 'utf8');
const hash = createHash('sha256').update(html).digest('hex');
mkdirSync(output, { recursive: true });

const report = {
  artifact, sha256: hash, bytes: Buffer.byteLength(html),
  time: new Date().toISOString(), browser: null, checks: [], actions: [],
  network: [], pageErrors: [], consoleErrors: [], screenshots: [],
  limitations: [
    'Managed Chromium blocks file:// navigation. This run fulfills an allowed HTTP document directly from the exact bundle bytes and denies every secondary request; file:// launch is unverified.',
    'Automation and agent visual review do not establish fresh-user comprehension, human art approval, or a real-world field walk.',
  ],
};
const persist = () => writeFileSync(join(output, 'browser-result.json'), JSON.stringify(report, null, 2) + '\n');
const check = (id, pass, evidence) => {
  report.checks.push({ id, pass: Boolean(pass), evidence });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id}: ${JSON.stringify(evidence)}`);
  persist();
};
const browser = await chromium.launch({
  executablePath: process.env.TG_QA_CHROMIUM || '/usr/bin/chromium',
  headless: true, args: ['--no-sandbox'],
});
report.browser = await browser.version();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1,
  recordVideo: { dir: join(output, 'video'), size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
const documentUrl = 'http://127.0.0.1:4178/first-playable';
await context.route('**/*', async (route) => {
  const request = route.request();
  if (request.isNavigationRequest() && request.url() === documentUrl) {
    await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html });
  } else {
    report.network.push({ url: request.url(), type: request.resourceType() });
    await route.abort('blockedbyclient');
  }
});
page.on('pageerror', (error) => { report.pageErrors.push(error.message); persist(); });
page.on('console', (message) => {
  if (message.type() === 'error') { report.consoleErrors.push(message.text()); persist(); }
});

const capture = async (name) => {
  const path = join(output, name + '.png');
  await page.screenshot({ path, fullPage: true });
  report.screenshots.push(path); persist();
};
const act = async (name, operation) => {
  report.actions.push({ name, time: new Date().toISOString() }); persist();
  await operation();
};
const storageKey = 'tourguideai:first-walk:v1';
const stored = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), storageKey);
const position = (record) => ({ x: record.game.x, y: record.game.y });
const samePosition = (a, b) => a.game.x === b.game.x && a.game.y === b.game.y;
const progress = (record) => JSON.stringify({ visits: record.game.visitedIds, choices: record.game.choiceIds,
  sourceReads: record.game.readSourceIds, selected: record.game.selectedTargetId });
const settle = () => page.waitForTimeout(850); // Observe after the documented 600 ms persistence cadence.
const hold = async (key, milliseconds) => act(`Hold ${key} for ${milliseconds} ms, then release`, async () => {
  await page.keyboard.down(key); await page.waitForTimeout(milliseconds); await page.keyboard.up(key); await settle();
});
const locale = async (value, inDialog = false) => act(`Select ${value}${inDialog ? ' with card open' : ''}`, async () => {
  await page.locator(`${inDialog ? '#place-dialog' : '#language-switch'} [data-locale="${value}"]`).click();
  await page.waitForFunction((lang) => document.documentElement.lang === lang, value);
});
const approach = async (id) => act(`Use the visible journey destination ${id} and walk there`, async () => {
  await page.locator(`[data-target="${id}"]`).click();
  await page.waitForFunction(({ key, id }) => {
    const state = JSON.parse(localStorage.getItem(key) || 'null')?.game;
    return state?.nearbyTargetId === id && state.targetDistance <= 0.2;
  }, { key: storageKey, id }, { timeout: 20000 });
  await settle();
});

try {
  await act('Open the exact production bundle with all secondary requests denied', () => page.goto(documentUrl));
  await page.waitForSelector('canvas', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(700);
  const layout = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    documentWidth: document.documentElement.scrollWidth,
    canvas: [...document.querySelectorAll('canvas')].map((canvas) => ({
      width: canvas.width, height: canvas.height,
      rect: { x: canvas.getBoundingClientRect().x, y: canvas.getBoundingClientRect().y,
        width: canvas.getBoundingClientRect().width, height: canvas.getBoundingClientRect().height },
    })),
    controls: [...document.querySelectorAll('button,select,[role="dialog"]')].map((el) => ({
      tag: el.tagName, id: el.id, text: el.textContent.trim().slice(0,120), hidden: el.hidden,
    })),
    storage: Object.fromEntries(Object.keys(localStorage).map((key) => [key, localStorage.getItem(key)])),
  }));
  check('visible-production-canvas', layout.canvas.length > 0 && layout.canvas.every((canvas) => canvas.rect.width > 0 && canvas.rect.height > 0), layout.canvas);
  check('initial-viewport-width', layout.documentWidth <= layout.viewport.width, layout);
  await capture('first-playable-initial');
  await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), storageKey);
  const initial = await stored();
  await locale('zh');
  const chinese = await page.locator('#objective').innerText();
  check('chinese-goal-and-context-controls', /[\u3400-\u9fff]/.test(chinese) && /[\u3400-\u9fff]/.test(await page.locator('#controls').innerText()), chinese);
  check('locale-preserves-initial-position-progress', samePosition(initial, await stored()) && progress(initial) === progress(await stored()), { before: initial, after: await stored() });
  await capture('first-playable-zh-initial');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(400);
  check('1280px-no-horizontal-overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth })));
  const roadCoverage = await page.locator('#game-stage canvas').evaluate((canvas) => {
    const ctx = canvas.getContext('2d');
    const sample = (fraction) => [...ctx.getImageData(Math.floor(canvas.width * fraction), Math.floor(canvas.height / 2), 1, 1).data];
    return { width: canvas.width, height: canvas.height, left: sample(0.03), center: sample(0.5), right: sample(0.97) };
  });
  check('resize-renders-road-across-canvas', ['left', 'right'].every((side) => roadCoverage[side].slice(0,3).every((value, channel) => Math.abs(value - roadCoverage.center[channel]) < 35)), roadCoverage);
  const shortLayout = await page.evaluate(() => {
    const exportRect = document.querySelector('#export-notes').getBoundingClientRect();
    const footerRect = document.querySelector('.bottom-bar').getBoundingClientRect();
    const controlsRect = document.querySelector('.controls-bar').getBoundingClientRect();
    return { viewportHeight: innerHeight, documentHeight: document.documentElement.scrollHeight,
      exportBottom: exportRect.bottom, footerTop: footerRect.top, controlsBottom: controlsRect.bottom };
  });
  check('short-desktop-controls-and-footer-do-not-overlap', shortLayout.exportBottom <= shortLayout.footerTop && shortLayout.controlsBottom <= shortLayout.footerTop, shortLayout);
  await capture('first-playable-zh-1280x720');
  await locale('en');
  await capture('first-playable-en-1280x720');
  await page.waitForTimeout(150);
  const afterCaptureSize = await page.evaluate(() => {
    const canvas = document.querySelector('#game-stage canvas').getBoundingClientRect();
    const stage = document.querySelector('#game-stage').getBoundingClientRect();
    return { canvas: { width: canvas.width, height: canvas.height }, stage: { width: stage.width, height: stage.height } };
  });
  check('resized-canvas-still-covers-stage-after-capture', Math.abs(afterCaptureSize.canvas.width - afterCaptureSize.stage.width) <= 1 && Math.abs(afterCaptureSize.canvas.height - afterCaptureSize.stage.height) <= 1, afterCaptureSize);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await locale('en');
  await page.locator('#game-stage').focus();
  await hold('ArrowRight', 350);
  const moved = await stored();
  check('held-key-moves-player', moved.game.x > initial.game.x && moved.game.y === initial.game.y, { before: position(initial), after: position(moved) });
  await settle();
  check('released-key-stops-player', samePosition(moved, await stored()), { released: position(moved), later: position(await stored()) });
  await hold('ArrowUp', 1600);
  const wall = await stored();
  await hold('ArrowUp', 500);
  check('north-facade-collision', wall.game.y > initial.game.y && samePosition(wall, await stored()), { atFacade: position(wall), continuedInput: position(await stored()) });
  await capture('first-playable-at-facade');

  await approach('crossing');
  const promptSamples = [];
  for (let i = 0; i < 5; i++) {
    promptSamples.push(await page.locator('#interact-button').evaluate((el) => ({ visible: !el.hidden, label: el.textContent.trim() })));
    await page.waitForTimeout(100);
  }
  check('nearby-prompt-stable', promptSamples.every((sample) => sample.visible && sample.label === promptSamples[0].label), promptSamples);
  await capture('first-playable-near-crossing');
  await act('Hold E; repeated keydown must not duplicate the open action', async () => {
    await page.keyboard.down('e'); await page.waitForTimeout(150); await page.keyboard.down('e');
    await page.waitForTimeout(200); await page.keyboard.up('e');
  });
  await page.waitForFunction(() => document.querySelector('#place-dialog').open);
  const opened = await stored();
  check('opening-is-not-a-visit-or-source-read', opened.game.visitedIds.length === 0 && opened.game.readSourceIds.length === 0, opened.game);
  await capture('first-playable-en-card');
  await hold('ArrowRight', 500);
  check('modal-pauses-movement', samePosition(opened, await stored()), { before: position(opened), after: position(await stored()) });
  await locale('zh', true);
  const openChinese = await stored();
  check('open-card-locale-retains-state', await page.locator('#place-dialog').evaluate((el) => el.open) && samePosition(opened, openChinese) && progress(opened) === progress(openChinese), { title: await page.locator('#card-title').innerText(), before: opened, after: openChinese });
  check('modal-language-switch-retains-keyboard-focus', await page.evaluate(() => document.activeElement?.dataset?.locale === 'zh' && Boolean(document.activeElement.closest('#place-dialog'))), await page.evaluate(() => ({ tag: document.activeElement.tagName, locale: document.activeElement.dataset.locale })));
  await capture('first-playable-zh-card');
  await locale('en', true);
  await act('Close card without choosing', () => page.locator('#card-close').click());
  await page.waitForTimeout(400);
  check('close-does-not-reopen', !(await page.locator('#place-dialog').evaluate((el) => el.open)), await page.evaluate(() => ({ dialogOpen: document.querySelector('#place-dialog').open, focused: document.activeElement.id })));
  check('close-restores-movement-focus', await page.evaluate(() => document.activeElement.id === 'game-stage'), await page.evaluate(() => document.activeElement.id));
  await act('Open the nearby crossing again with E', () => page.keyboard.press('e'));
  await page.waitForFunction(() => document.querySelector('#place-dialog').open);
  await act('Read provenance disclosure', () => page.locator('#source-details summary').click());
  await settle();
  const sourceRead = await stored();
  check('source-read-distinct-from-visit', sourceRead.game.readSourceIds.includes('crossing') && sourceRead.game.visitedIds.length === 0, sourceRead.game);
  await act('Choose north side from the actual card', () => page.locator('[data-choice="north-first"]').click());
  const chosen = await stored();
  check('choice-records-one-visit-and-next-target', chosen.game.visitedIds.length === 1 && chosen.game.visitedIds[0] === 'crossing' && chosen.game.choiceIds.crossing === 'north-first' && chosen.game.selectedTargetId === 'mitsui', chosen.game);
  await locale('zh', true);
  check('locale-keeps-chosen-outcome', await page.locator('#card-continue').isVisible() && progress(chosen) === progress(await stored()), await page.locator('.outcome-note').innerText());
  await capture('first-playable-zh-choice');
  await act('Continue walking after choice', () => page.locator('#card-continue').click());
  const resumed = await stored();
  await hold('ArrowRight', 300);
  check('close-resumes-movement', (await stored()).game.x > resumed.game.x, { before: position(resumed), after: position(await stored()) });
  const beforeReload = await stored();
  await act('Reload the production document', () => page.reload());
  await page.waitForSelector('#loading[hidden]', { state: 'attached' });
  await settle();
  const restored = await stored();
  check('save-reload-position-progress-locale', samePosition(beforeReload, restored) && progress(beforeReload) === progress(restored) && restored.locale === 'zh', { before: beforeReload, after: restored });
  await capture('first-playable-zh-restored');

  await locale('en');
  await approach('mitsui');
  await act('Open Mitsui with E', () => page.keyboard.press('e'));
  await page.waitForFunction(() => document.querySelector('#place-dialog').open);
  await act('Keep walking outside instead of adding the station clue', () => page.locator('[data-choice="street-only"]').click());
  check('alternate-choice-keeps-visit-with-different-route-intent', (await stored()).game.choiceIds.mitsui === 'street-only' && (await stored()).game.visitedIds.includes('mitsui'), (await stored()).game);
  await page.locator('#card-continue').click();
  const downloadEvent = page.waitForEvent('download');
  await act('Export the player field notes', () => page.locator('#export-notes').click());
  const download = await downloadEvent;
  const exportedPath = join(output, 'played-field-notes-en.html');
  await download.saveAs(exportedPath);
  const exported = readFileSync(exportedPath, 'utf8');
  check('export-reflects-distinct-player-choices', exported.includes('North side first') && exported.includes('Stay above ground') && !exported.includes('Arrival note:'), { path: exportedPath, bytes: Buffer.byteLength(exported) });
  await capture('first-playable-en-progress');
  const { WORLD, TARGETS } = await import('../src/content.js');
  const beforeClick = await stored();
  const canvasRect = await page.locator('#game-stage canvas').boundingBox();
  const clickDestination = { x: beforeClick.game.x + 3, y: 2 };
  const scale = Math.max(32, Math.min(46, canvasRect.width / 27));
  const halfView = canvasRect.width / scale / 2;
  const cameraX = Math.max(WORLD.bounds.minX + halfView, Math.min(WORLD.bounds.maxX - halfView, beforeClick.game.x + 2));
  const clickPosition = {
    x: canvasRect.width / 2 + (clickDestination.x - cameraX) * scale,
    y: canvasRect.height / 2 - (clickDestination.y - (WORLD.roadCenterY + 2.5)) * scale / 3,
  };
  await act('Click a visible unmarked pavement point', () => page.locator('#game-stage canvas').click({ position: clickPosition }));
  await page.waitForTimeout(1700); await settle();
  const afterClick = await stored();
  check('canvas-click-walks-to-pavement', Math.abs(afterClick.game.x - clickDestination.x) < 0.25 && Math.abs(afterClick.game.y - clickDestination.y) < 0.25,
    { before: position(beforeClick), screenPoint: clickPosition, intended: clickDestination, after: position(afterClick) });

  await locale('zh');
  const roadTrace = [];
  await act('Chinese journey control: walk to MUFG using the crossing', async () => {
    await page.locator('[data-target="mufg"]').click();
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const current = await stored(); roadTrace.push(position(current));
      if (current.game.nearbyTargetId === 'mufg' && current.game.targetDistance <= 0.2) break;
      await page.waitForTimeout(150);
    }
  });
  const roadSamples = roadTrace.filter((point) => point.y < -2 && point.y > -15);
  check('autowalk-crosses-at-mapped-crossing', roadSamples.length > 0 && roadSamples.every((point) => Math.abs(point.x - WORLD.crossing.x) < 0.25), roadSamples);
  check('chinese-approach-reaches-bank', (await stored()).game.nearbyTargetId === 'mufg', (await stored()).game);
  await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('#place-dialog').open);
  await capture('first-playable-zh-bank');
  await page.locator('[data-choice="no-cash-stop"]').click();
  const bankChoice = await stored();
  check('chinese-choice-retained', bankChoice.game.choiceIds.mufg === 'no-cash-stop' && bankChoice.game.visitedIds.length === 3, bankChoice.game);
  await page.locator('#card-continue').click();
  const closedChinese = await stored();
  await hold('ArrowRight', 250);
  check('chinese-full-chain-resumes', (await stored()).game.x > closedChinese.game.x && !(await page.locator('#place-dialog').evaluate((el) => el.open)), { before: position(closedChinese), after: position(await stored()) });

  // Reach a retained placeholder with actual input. Its authored reading point is
  // nearby; the E prompt must identify it and must not record a completed venue.
  const placeholder = TARGETS.find((target) => target.id === 'D-S3');
  const atSouth = await stored();
  const secondsToPlaceholderX = Math.abs(placeholder.x - atSouth.game.x) / 4.56;
  if (secondsToPlaceholderX > 0.03) await hold(placeholder.x > atSouth.game.x ? 'ArrowRight' : 'ArrowLeft', Math.round(secondsToPlaceholderX * 1000));
  await hold('ArrowDown', 300);
  const nearPlaceholder = await stored();
  check('placeholder-can-be-approached', nearPlaceholder.game.nearbyTargetId?.startsWith('D-S'), nearPlaceholder.game);
  if (nearPlaceholder.game.nearbyTargetId?.startsWith('D-S')) {
    await page.keyboard.press('e'); await page.waitForFunction(() => document.querySelector('#place-dialog').open);
    check('placeholder-honestly-unfinished', (await page.locator('#card-title').innerText()).includes('内容开发中'), await page.locator('#card-title').innerText());
    await capture('first-playable-zh-placeholder');
    await page.locator('[data-choice="return-to-street"]').click();
    check('placeholder-never-counts-as-real-visit', (await stored()).game.visitedIds.length === 3 && !(await stored()).game.visitedIds.some((id) => id.startsWith('D-S')), (await stored()).game.visitedIds);
  }
  const chineseDownloadEvent = page.waitForEvent('download');
  await act('Export Chinese field notes after the real Chinese choice', () => page.locator('#export-notes').click());
  const chineseDownload = await chineseDownloadEvent;
  const chineseExportPath = join(output, 'played-field-notes-zh.html');
  await chineseDownload.saveAs(chineseExportPath);
  const chineseExport = readFileSync(chineseExportPath, 'utf8');
  check('chinese-export-reflects-no-cash-choice', chineseExport.includes('不安排现金服务停留') && !chineseExport.includes('现金计划：'), { path: chineseExportPath, bytes: Buffer.byteLength(chineseExport) });
  const exportPage = await context.newPage();
  exportPage.on('pageerror', (error) => report.pageErrors.push(error.message));
  exportPage.on('console', (message) => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  const exportUrl = 'http://127.0.0.1:4178/played-field-notes';
  await exportPage.route(exportUrl, (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: chineseExport }));
  await exportPage.setViewportSize({ width: 390, height: 844 });
  await exportPage.goto(exportUrl);
  const mobileNotePath = join(output, 'field-notes-zh-mobile.png');
  await exportPage.screenshot({ path: mobileNotePath, fullPage: true }); report.screenshots.push(mobileNotePath);
  check('export-readable-width-on-phone', await exportPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.lang === 'zh'), await exportPage.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, lang: document.documentElement.lang })));
  await exportPage.emulateMedia({ media: 'print' });
  await exportPage.setViewportSize({ width: 850, height: 1100 });
  const printNotePath = join(output, 'field-notes-zh-print.png');
  await exportPage.screenshot({ path: printNotePath, fullPage: true }); report.screenshots.push(printNotePath);
  await exportPage.close();
  const { createState, stepSimulation, snapshot } = await import('../src/simulation.js');
  const commands = [
    ...Array.from({ length: 180 }, () => ({ x: 1 })),
    ...Array.from({ length: 240 }, () => ({ y: 1 })),
    ...Array.from({ length: 900 }, () => ({ x: -1 })),
    ...Array.from({ length: 80 }, () => ({ y: -1 })),
    ...Array.from({ length: 25 }, () => ({ x: 1 })),
    {},
  ];
  const seed = { visitedIds: ['crossing'], readSourceIds: [], choiceIds: { crossing: 'north-first' } };
  const continuous = createState(seed);
  commands.forEach((command) => stepSimulation(continuous, command));
  let resumedReplay = createState(seed);
  commands.slice(0, 420).forEach((command) => stepSimulation(resumedReplay, command));
  const checkpoint = JSON.parse(JSON.stringify(snapshot(resumedReplay)));
  resumedReplay = createState(checkpoint);
  commands.slice(420).forEach((command) => stepSimulation(resumedReplay, command));
  const alternative = createState(seed);
  commands.slice(0, -1).forEach((command) => stepSimulation(alternative, command));
  stepSimulation(alternative, { y: -1 });
  check('deterministic-replay-across-save-restore', JSON.stringify(snapshot(continuous)) === JSON.stringify(snapshot(resumedReplay)) && continuous.x !== WORLD.spawn.x && continuous.tick === commands.length,
    { commands: commands.length, checkpoint: { x: checkpoint.x, y: checkpoint.y, tick: checkpoint.tick }, final: snapshot(continuous) });
  check('replay-is-not-a-no-op-or-vacuous-comparison', alternative.y !== continuous.y, { standard: { x: continuous.x, y: continuous.y }, changedLastCommand: { x: alternative.x, y: alternative.y } });
  const pausedReplay = snapshot(continuous); pausedReplay.paused = true;
  for (let i = 0; i < 20; i++) stepSimulation(pausedReplay, { x: 1 });
  check('paused-simulation-does-not-advance', pausedReplay.x === continuous.x && pausedReplay.y === continuous.y && pausedReplay.tick === continuous.tick,
    { tickBefore: continuous.tick, tickAfter: pausedReplay.tick, before: { x: continuous.x, y: continuous.y }, after: { x: pausedReplay.x, y: pausedReplay.y } });
  report.simulationSourceSha256 = createHash('sha256').update(readFileSync(new URL('../src/simulation.js', import.meta.url))).digest('hex');
  for (const [label, invalidSave] of [
    ['null', 'null'], ['primitive', '42'], ['invalid-json', '{'],
    ['invalid-game', JSON.stringify({ locale: 'zh', game: { x: 'bad', y: null, visitedIds: ['invented-place'], readSourceIds: true, choiceIds: null } })],
  ]) {
    await act(`Reload with a corrupt ${label} save`, async () => {
      await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: invalidSave });
      // pagehide legitimately saves the current session; a one-shot init script
      // supplies the corrupt disk value at the next application's startup.
      await page.addInitScript(({ key, value, label }) => {
        if (!sessionStorage.getItem(`qa-corrupt-${label}`)) {
          localStorage.setItem(key, value); sessionStorage.setItem(`qa-corrupt-${label}`, '1');
        }
      }, { key: storageKey, value: invalidSave, label });
      await page.reload(); await page.waitForSelector('#loading[hidden]', { state: 'attached' }); await settle();
    });
    const recovered = await stored();
    check(`corrupt-save-${label}-recovers`, recovered.game.x === WORLD.spawn.x && recovered.game.y === WORLD.spawn.y && recovered.game.visitedIds.length === 0,
      { position: position(recovered), visits: recovered.game.visitedIds, locale: recovered.locale });
  }
  report.frameIntervals = await page.evaluate(() => new Promise((resolve) => {
    const values = []; let previous;
    const frame = (time) => {
      if (previous !== undefined) values.push(time - previous);
      previous = time;
      if (values.length < 90) requestAnimationFrame(frame);
      else { values.sort((a,b)=>a-b); resolve({ sampleFrames: values.length, medianMs: values[45], p95Ms: values[85], maxMs: values.at(-1) }); }
    };
    requestAnimationFrame(frame);
  }));
  report.interactionStatus = 'browser chain executed; see individual checks';
  report.bodyText = (await page.locator('body').innerText()).slice(0,10000);
  check('no-secondary-network-requests', report.network.length === 0, report.network);
  check('no-browser-errors', report.pageErrors.length === 0 && report.consoleErrors.length === 0,
    { pageErrors: report.pageErrors, consoleErrors: report.consoleErrors });
} catch (error) {
  check('browser-run-completed', false, error.stack || String(error));
  await capture('first-playable-failure').catch(() => {});
} finally {
  persist();
  await context.close();
  await browser.close();
}
process.exitCode = report.checks.some((result) => !result.pass) ? 1 : 0;
