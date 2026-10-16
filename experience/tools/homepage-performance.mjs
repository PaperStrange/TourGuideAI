import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const pageURL = process.env.PERF_URL || 'https://paperstrange.github.io/TourGuideAI/';
const output = resolve(repository, process.env.PERF_OUTPUT || 'artifacts/performance-final');
const repetitions = Number(process.env.PERF_RUNS || 3);
mkdirSync(output, { recursive: true });
process.env.TMPDIR = join(output, 'tmp'); mkdirSync(process.env.TMPDIR, { recursive: true });
const proxyValue = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxy = proxyValue ? new URL(proxyValue) : null;
const report = {
  startedAt: new Date().toISOString(), pageURL,
  conditions: { viewport: [1440, 1000], dpr: 1, repetitions, cache: 'new context for cold; same-context reload for warm',
    networkInterception: false, externalProxyConfigured: Boolean(proxy), tlsVerification: true,
    timing: 'browser Performance timeline; Playwright actions include automation scheduling',
    searchCompletion: 'aria-busy=false when supplied by the form; otherwise the original disabled-button completion signal',
    limitations: 'Managed cloud browser; software rendering and provider variability are recorded, not physical-device performance.' },
  driverSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'), runs: [],
};
const save = () => writeFileSync(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
const browser = await chromium.launch({ headless: true, executablePath: process.env.EXPERIENCE_QA_CHROMIUM || '/usr/bin/chromium',
  args: ['--no-sandbox'], ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1',
    ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
report.conditions.browser = browser.version();
try {
  for (let index = 0; index < repetitions; index++) for (const mode of ['explore', 'together']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    await context.addInitScript(() => {
      window.__PERF_TRACE__ = { longTasks: [], events: [] };
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.__PERF_TRACE__.longTasks.push({ start: entry.startTime, duration: entry.duration });
      }).observe({ type: 'longtask', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.__PERF_TRACE__.events.push({ name: entry.name, start: entry.startTime,
          duration: entry.duration, processingStart: entry.processingStart, processingEnd: entry.processingEnd, interactionId: entry.interactionId });
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
    });
    const page = await context.newPage(); page.setDefaultTimeout(90000);
    const cdp = await context.newCDPSession(page); await cdp.send('Performance.enable');
    for (const temperature of ['cold', 'warm']) {
      const run = { index, mode, temperature, errors: [], failedRequests: [], network: [] };
      report.runs.push(run); save();
      const errorListener = error => run.errors.push(error.message);
      const failedListener = request => run.failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
      const responseListener = response => run.network.push({ url: response.url(), status: response.status(), timing: response.request().timing() });
      page.on('pageerror', errorListener); page.on('requestfailed', failedListener); page.on('response', responseListener);
      console.log(`START ${index + 1} ${mode} ${temperature}`);
      try {
        const url = new URL(pageURL); url.search = new URLSearchParams({ qa: '1', lang: 'en', mode });
        const navigation = await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
        run.htmlSha256 = createHash('sha256').update(await navigation.body()).digest('hex');
        run.navigationStatus = navigation.status();
        await page.locator('#mode-explore').waitFor({ state: 'visible' });
        run.shellObservedMs = await page.evaluate(() => performance.now());
        await page.evaluate(() => { window.__PERF_ACTION_START__ = performance.now(); });
        await page.locator('#locale-zh').click();
        await page.waitForFunction(() => document.documentElement.lang === 'zh');
        run.languageActionMs = await page.evaluate(() => performance.now() - window.__PERF_ACTION_START__);
        await page.locator('#locale-en').click();
        await page.waitForFunction(kind => kind === 'explore' ? window.__HOME__?.snapshot().sceneState === 'ready'
          : window.__HOME__?.snapshot().map?.ready === true, mode, { timeout: 120000 });
        run.previewObservedMs = await page.evaluate(() => performance.now());
        run.initialState = await page.evaluate(() => {
          const canvas = document.querySelector('#live-stage canvas, #world-map canvas');
          const gl = canvas?.getContext('webgl2');
          const extension = gl?.getExtension('WEBGL_debug_renderer_info');
          return { home: window.__HOME__?.snapshot(), renderer: window.__TOUR_GAME__?.renderer() ?? null,
            graphics: extension ? { vendor: gl.getParameter(extension.UNMASKED_VENDOR_WEBGL), renderer: gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) } : null };
        });
        if (mode === 'explore') {
          await page.locator('#mode-together').click();
          await page.waitForFunction(() => window.__HOME__?.snapshot().map?.ready === true, null, { timeout: 120000 });
          run.mapAfterSwitchObservedMs = await page.evaluate(() => performance.now());
          await page.waitForTimeout(1500);
          const before = await cdp.send('Performance.getMetrics');
          const renderBefore = await page.evaluate(() => ({ renderedFrames: window.__TOUR_GAME__?.renderer().renderedFrames,
            updateFrames: window.__TOUR_GAME__?.renderer().updateFrames }));
          await page.waitForTimeout(2000);
          const after = await cdp.send('Performance.getMetrics');
          const metrics = value => Object.fromEntries(value.metrics.map(item => [item.name, item.value]));
          const first = metrics(before), second = metrics(after);
          run.hiddenScene = { sampleMs: 2000, taskDurationMs: (second.TaskDuration - first.TaskDuration) * 1000,
            scriptDurationMs: (second.ScriptDuration - first.ScriptDuration) * 1000,
            ...await page.evaluate(value => ({ renderDelta: window.__TOUR_GAME__?.renderer().renderedFrames - value.renderedFrames,
              updateDelta: value.updateFrames === undefined ? null : window.__TOUR_GAME__?.renderer().updateFrames - value.updateFrames }), renderBefore) };
        }
        await page.locator('#place-query').fill('Tokyo');
        await page.evaluate(() => { window.__PERF_SEARCH_START__ = performance.now(); });
        await page.locator('#search-submit').click();
        await page.waitForFunction(() => {
          const busy = document.querySelector('#place-search').getAttribute('aria-busy');
          return busy === null ? !document.querySelector('#search-submit').disabled : busy === 'false';
        }, null, { timeout: 30000 });
        run.search = await page.evaluate(() => ({ durationMs: performance.now() - window.__PERF_SEARCH_START__,
          status: document.querySelector('#search-status').textContent,
          results: document.querySelectorAll('[data-result]').length }));
      } catch (error) {
        run.error = error.message;
      }
      run.timeline = await page.evaluate(() => ({ now: performance.now(),
        navigation: performance.getEntriesByType('navigation').map(entry => entry.toJSON()),
        paint: performance.getEntriesByType('paint').map(entry => entry.toJSON()),
        resources: performance.getEntriesByType('resource').map(entry => entry.toJSON()),
        longTasks: window.__PERF_TRACE__?.longTasks, events: window.__PERF_TRACE__?.events,
        home: window.__HOME__?.snapshot() })).catch(error => ({ error: error.message }));
      page.off('pageerror', errorListener); page.off('requestfailed', failedListener); page.off('response', responseListener);
      save(); console.log(`END ${index + 1} ${mode} ${temperature} shell=${run.shellObservedMs?.toFixed(0)} preview=${run.previewObservedMs?.toFixed(0)} error=${run.error || 'none'}`);
    }
    await context.close();
  }
} finally {
  report.finishedAt = new Date().toISOString(); save(); await browser.close();
}
if (report.runs.some(run => run.error || run.errors.length > 0)) process.exitCode = 1;
