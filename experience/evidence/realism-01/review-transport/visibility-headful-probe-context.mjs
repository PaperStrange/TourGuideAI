import { chromium } from '/workspace/TourGuideAI/experience/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const temporary = '/workspace/TourGuideAI/artifacts/review-transport-tmp';
mkdirSync(temporary, { recursive: true });
process.env.TMPDIR = temporary;
process.env.XDG_CONFIG_HOME = temporary + '/config';
process.env.XDG_CACHE_HOME = temporary + '/cache';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: false, args: ['--no-sandbox'], env: { ...process.env } });
const record = { browser: browser.version(), samples: [] };
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await page.context().newCDPSession(page);
  record.samples.push({ phase: 'initial', hidden: await page.evaluate(() => document.hidden) });
  const window = await cdp.send('Browser.getWindowForTarget');
  record.window = window;
  await cdp.send('Browser.setWindowBounds', { windowId: window.windowId, bounds: { windowState: 'minimized' } });
  await page.waitForTimeout(500);
  record.samples.push({ phase: 'minimized', hidden: await page.evaluate(() => document.hidden) });
  await cdp.send('Browser.setWindowBounds', { windowId: window.windowId, bounds: { windowState: 'normal' } });
  await page.waitForTimeout(500);
  record.samples.push({ phase: 'restored', hidden: await page.evaluate(() => document.hidden) });
  const background = await page.context().newPage();
  await background.goto('about:blank'); await background.bringToFront();
  await page.waitForTimeout(500);
  record.samples.push({ phase: 'background-tab', hidden: await page.evaluate(() => document.hidden) });
  await page.bringToFront(); await background.close();
  record.samples.push({ phase: 'returned-tab', hidden: await page.evaluate(() => document.hidden) });
} finally {
  await browser.close();
  writeFileSync('/workspace/TourGuideAI/artifacts/realism-01/review-transport/qa/visibility-headful-probe.json', JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record));
}
