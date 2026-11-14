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
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  record.playwrightFocusOverrideDisabled = true;
  record.samples.push({ phase: 'initial', hidden: await page.evaluate(() => document.hidden) });
  const window = await cdp.send('Browser.getWindowForTarget');
  record.window = window;
  await cdp.send('Browser.setWindowBounds', { windowId: window.windowId, bounds: { windowState: 'minimized' } });
  await page.waitForTimeout(500);
  record.samples.push({ phase: 'minimized', hidden: await page.evaluate(() => document.hidden) });
  await cdp.send('Browser.setWindowBounds', { windowId: window.windowId, bounds: { windowState: 'normal' } });
  await page.waitForTimeout(500);
  record.samples.push({ phase: 'restored', hidden: await page.evaluate(() => document.hidden) });
  const browserCdp = await browser.newBrowserCDPSession();
  const source = await cdp.send('Target.getTargetInfo');
  const background = await browserCdp.send('Target.createTarget', { url: 'about:blank', newWindow: false, browserContextId: source.targetInfo.browserContextId });
  await browserCdp.send('Target.activateTarget', { targetId: background.targetId });
  record.backgroundWindow = await browserCdp.send('Browser.getWindowForTarget', { targetId: background.targetId });
  record.sourceTarget = source.targetInfo.targetId;
  await page.waitForTimeout(500);
  record.samples.push({ phase: 'background-tab', hidden: await page.evaluate(() => document.hidden) });
  await browserCdp.send('Target.activateTarget', { targetId: source.targetInfo.targetId });
  await browserCdp.send('Target.closeTarget', { targetId: background.targetId });
  record.samples.push({ phase: 'returned-tab', hidden: await page.evaluate(() => document.hidden) });
} finally {
  await browser.close();
  writeFileSync('/workspace/TourGuideAI/artifacts/realism-01/review-transport/qa/visibility-headful-probe.json', JSON.stringify(record, null, 2) + '\n');
  console.log(JSON.stringify(record));
}
