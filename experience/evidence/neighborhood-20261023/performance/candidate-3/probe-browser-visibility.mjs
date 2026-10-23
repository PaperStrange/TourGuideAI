import { chromium } from '../../experience/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

process.env.TMPDIR = '/workspace/TourGuideAI/artifacts/tmp';
mkdirSync(process.env.TMPDIR, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext();
const a = await context.newPage();
const b = await context.newPage();
const connection = await browser.newBrowserCDPSession();
const pageCDP = await context.newCDPSession(a);
const target = await pageCDP.send('Target.getTargetInfo');
const window = await connection.send('Browser.getWindowForTarget', { targetId: target.targetInfo.targetId });
const report = { target: target.targetInfo, window, samples: [] };
async function sample(label) {
  report.samples.push({ label, a: await a.evaluate(() => ({ hidden: document.hidden, visibility: document.visibilityState })),
    b: await b.evaluate(() => ({ hidden: document.hidden, visibility: document.visibilityState })) });
}
try {
  await sample('two-pages');
  await b.bringToFront();
  await a.waitForTimeout(1000);
  await sample('second-brought-to-front');
  await connection.send('Browser.setWindowBounds', { windowId: window.windowId, bounds: { windowState: 'minimized' } });
  await a.waitForTimeout(1000);
  await sample('first-window-minimized');
  await connection.send('Browser.setWindowBounds', { windowId: window.windowId, bounds: { windowState: 'normal' } });
  await a.bringToFront();
  await a.waitForTimeout(1000);
  await sample('first-window-restored');
} finally {
  writeFileSync(new URL('./browser-visibility.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  await context.close();
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
