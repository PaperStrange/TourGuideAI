import { chromium } from '/workspace/TourGuideAI/experience/node_modules/playwright/index.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = '/workspace/TourGuideAI';
const output = resolve(root, 'artifacts/realism-01/review-transport/qa/native-visibility');
const temporary = resolve(root, 'artifacts/native-visibility-tmp');
mkdirSync(output, { recursive: true });
mkdirSync(temporary, { recursive: true });
const profile = resolve(temporary, 'chromium-profile');
mkdirSync(profile, { recursive: true });
const display = '127.0.0.1:93';
const authority = resolve(temporary, 'Xauthority');
const authentication = spawnSync('/usr/bin/xauth', ['-f', authority, 'add', display, 'MIT-MAGIC-COOKIE-1', randomBytes(16).toString('hex')], { encoding: 'utf8' });
if (authentication.status !== 0) throw new Error(authentication.stderr);
const env = { ...process.env, DISPLAY: display, XAUTHORITY: authority, TMPDIR: temporary, XDG_CONFIG_HOME: resolve(temporary, 'config'), XDG_CACHE_HOME: resolve(temporary, 'cache') };
const executable = resolve(root, 'artifacts/realism-01/review-transport/xvfb/root/usr/bin/Xvfb');
const displayArguments = [':93', '-nolock', '-nolisten', 'unix', '-listen', 'tcp', '-auth', authority, '-screen', '0', '1440x1000x24', '-noreset'];
const record = { startedAt: new Date().toISOString(), scriptSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'), display, displayArguments, noDefaults: true, samples: [], completed: false, method: 'Native Chromium tabs in the default browser context; actual visibilitychange observations', limitations: ['Blank tabs only; no 3D assets or performance qualification'] };
const server = spawn(executable, displayArguments, { cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'] });
let serverLog = '';
server.stderr.on('data', bytes => { serverLog += bytes; });
let manager;
let chrome;
let browser;
let managerLog = '';
let chromeLog = '';
const delay = ms => new Promise(accept => setTimeout(accept, ms));
try {
  let displayReady = false;
  for (let index = 0; index < 100; index++) {
    if (server.exitCode !== null) throw new Error(`Xvfb exited ${server.exitCode}: ${serverLog}`);
    const probe = spawnSync('/usr/bin/xdpyinfo', ['-display', display], { env, encoding: 'utf8' });
    if (probe.status === 0) { displayReady = true; break; }
    await delay(50);
  }
  if (!displayReady) throw new Error('Authenticated display did not become ready');
  const managerPath = resolve(root, 'artifacts/realism-01/review-transport/window-manager/root/usr/bin/twm');
  const managerArguments = ['-display', display, '-f', resolve(root, 'artifacts/realism-01/review-transport/window-manager/twmrc')];
  record.windowManager = { executable: managerPath, arguments: managerArguments };
  manager = spawn(managerPath, managerArguments, { cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'] });
  manager.stderr.on('data', bytes => { managerLog += bytes; });
  await delay(300);
  if (manager.exitCode !== null) throw new Error(`Window manager exited ${manager.exitCode}: ${managerLog}`);
  const chromeArguments = ['--no-sandbox', '--no-first-run', '--no-default-browser-check', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-gpu', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'];
  record.chromiumArguments = chromeArguments;
  chrome = spawn('/usr/bin/chromium', chromeArguments, { cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.stderr.on('data', bytes => { chromeLog += bytes; });
  const portPath = resolve(profile, 'DevToolsActivePort');
  for (let index = 0; index < 200 && !existsSync(portPath); index++) {
    if (chrome.exitCode !== null) throw new Error(`Chromium exited ${chrome.exitCode}: ${chromeLog}`);
    await delay(50);
  }
  if (!existsSync(portPath)) throw new Error('Chromium DevTools endpoint unavailable');
  const port = readFileSync(portPath, 'utf8').split('\n')[0];
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { noDefaults: true });
  record.browser = browser.version();
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  await page.evaluate(() => {
    window.visibilityObservations = [];
    document.addEventListener('visibilitychange', event => window.visibilityObservations.push({ hidden: document.hidden, state: document.visibilityState, trusted: event.isTrusted, at: performance.now() }));
  });
  const cdp = await context.newCDPSession(page);
  const browserCdp = await browser.newBrowserCDPSession();
  const { targetInfo } = await cdp.send('Target.getTargetInfo');
  const originalWindow = await cdp.send('Browser.getWindowForTarget');
  record.originalWindow = originalWindow;
  const sample = async phase => {
    record.samples.push({ phase, ...await page.evaluate(() => ({ hidden: document.hidden, state: document.visibilityState, visibilityEvents: window.visibilityObservations })) });
  };
  await sample('initial');
  const background = await browserCdp.send('Target.createTarget', { url: 'about:blank', newWindow: false });
  await browserCdp.send('Target.activateTarget', { targetId: background.targetId });
  record.backgroundWindow = await browserCdp.send('Browser.getWindowForTarget', { targetId: background.targetId });
  await delay(600);
  await sample('background-tab');
  await browserCdp.send('Target.activateTarget', { targetId: targetInfo.targetId });
  await delay(600);
  await sample('returned-tab');
  await browserCdp.send('Target.closeTarget', { targetId: background.targetId });
  await browserCdp.send('Browser.setWindowBounds', { windowId: originalWindow.windowId, bounds: { windowState: 'minimized' } });
  await delay(600);
  await sample('minimized');
  await browserCdp.send('Browser.setWindowBounds', { windowId: originalWindow.windowId, bounds: { windowState: 'normal' } });
  await delay(600);
  await sample('restored');
  record.sameWindow = record.originalWindow.windowId === record.backgroundWindow.windowId;
  record.nativeTabVisibilityPass = record.sameWindow && !record.samples[0].hidden && record.samples[1].hidden && !record.samples[2].hidden && record.samples[1].visibilityEvents.some(event => event.hidden && event.trusted);
  record.nativeMinimizePass = record.samples[3].hidden && !record.samples[4].hidden;
  record.completed = true;
  if (!record.nativeTabVisibilityPass) process.exitCode = 1;
} catch (error) {
  record.error = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  await browser?.close();
  chrome?.kill('SIGTERM');
  manager?.kill('SIGTERM');
  server.kill('SIGTERM');
  record.finishedAt = new Date().toISOString();
  record.logs = { server: serverLog, manager: managerLog, chromium: chromeLog };
  writeFileSync(resolve(output, 'result.json'), JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record));
}
