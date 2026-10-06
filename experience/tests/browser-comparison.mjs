import { createHash } from 'node:crypto';
import { Matrix4, PerspectiveCamera, Vector3 } from 'three';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const close = (a, b) => Math.abs(a - b) < 1e-8;
const same = (a, b) => a.length === b.length && a.every((n, i) => close(n, b[i]));

export async function verifyComparison({ scenario, assets, origin, check, capture, report, timeout, persist }) {
  const manifestPath = '/render-study/manifest.json';
  if (!assets.has(manifestPath)) throw new Error('Comparison assets are not ready: no packaged render-study/manifest.json.');
  const expected = JSON.parse(assets.get(manifestPath));
  const modelPath = new URL(expected.model, origin + manifestPath).pathname;
  const snapshot = page => page.evaluate(() => window.__TOUR_COMPARISON__.snapshot());
  const ready = page => page.waitForFunction(() => {
    const s = window.__TOUR_COMPARISON__?.snapshot();
    return s?.status.manifest === 'ready' && s.status.image === 'ready' && s.status.realtime === 'ready' && s.renderer.renderedFrames > 0;
  }, null, { timeout });
  const entryUrl = origin + '/comparison.html?qa=1';
  const seedKey = 'tourguideai:journey:v2', seed = JSON.stringify({ version: 2, locale: 'zh', notes: { crossing: 'Existing private journey' }, game: { x: 23.8, y: 2.1 } });
  const main = await scenario('rendering-comparison', { [seedKey]: seed }, {}, false, { entryUrl, staticEntry: true });
  const { page } = main;
  await ready(page);
  check('comparison-loads-the-exact-manifest-and-model', (await snapshot(page)).renderer.modelHash === expected.modelSha256
    && expected.modelSha256 === sha(assets.get(modelPath)), { modelPath, modelSha256: expected.modelSha256 });
  for (const [index, view] of expected.views.entries()) {
    if (index) await page.locator('#study-view').selectOption(view.id);
    await page.waitForFunction(id => {
      const s = window.__TOUR_COMPARISON__.snapshot(); return s.selectedViewId === id && s.renderer.viewId === id && s.status.image === 'ready';
    }, view.id, { timeout });
    const observed = await snapshot(page), config = view.camera;
    const camera = new PerspectiveCamera(config.fov, config.aspect, config.near ?? .15, config.far ?? 260);
    camera.up.fromArray(config.up ?? [0, 1, 0]); camera.position.fromArray(config.position);
    camera.lookAt(new Vector3().fromArray(config.target)); camera.updateMatrixWorld(true);
    const actual = observed.renderer.camera;
    check(`comparison-${view.id}-uses-matched-camera-and-visibility`, same(actual.position, config.position)
      && same(actual.target, config.target) && same(actual.up, config.up ?? [0, 1, 0])
      && close(actual.fov, config.fov) && close(actual.aspect, config.aspect)
      && same(actual.projectionMatrix, camera.projectionMatrix.toArray())
      && same(actual.matrixWorld, new Matrix4().copy(camera.matrixWorld).toArray())
      && JSON.stringify(observed.renderer.hiddenGroups) === JSON.stringify(view.hiddenGroups), observed.renderer);
    const imagePath = new URL(view.file, origin + manifestPath).pathname;
    const layout = await page.evaluate(() => {
      const img = document.querySelector('#study-image'), image = img.getBoundingClientRect();
      const canvas = document.querySelector('#realtime-stage canvas').getBoundingClientRect();
      return { image: [image.width, image.height], canvas: [canvas.width, canvas.height], objectFit: getComputedStyle(img).objectFit };
    });
    check(`comparison-${view.id}-keeps-the-hashed-still-uncropped`, view.renderSha256 === sha(assets.get(imagePath))
      && new URL(observed.image.src).pathname === imagePath && Math.abs(observed.image.width / observed.image.height - config.aspect) < .005
      && Math.abs(layout.image[0] / layout.image[1] - config.aspect) < .01
      && Math.abs(layout.canvas[0] / layout.canvas[1] - config.aspect) < .01
      && layout.objectFit === 'contain', { imagePath, renderSha256: view.renderSha256, image: observed.image, layout });
    await capture(page, `comparison-${view.id}-both-en`);
  }
  for (const mode of ['realtime', 'still', 'both']) {
    await page.locator(`#study-mode input[value="${mode}"]`).check();
    const state = await snapshot(page);
    check(`comparison-${mode}-mode-shows-the-intended-panels`, state.mode === mode
      && await page.locator('#realtime-panel').isVisible() === (mode !== 'still')
      && await page.locator('#still-panel').isVisible() === (mode !== 'realtime'));
  }
  const beforeLocale = await snapshot(page);
  await page.locator('#study-language [data-locale="zh"]').click();
  check('comparison-language-switch-keeps-view-and-mode', (await snapshot(page)).selectedViewId === beforeLocale.selectedViewId
    && (await snapshot(page)).mode === beforeLocale.mode && /[\u3400-\u9fff]/.test(await page.locator('h1').innerText()));
  await capture(page, 'comparison-both-zh');
  const oldCanvas = await page.locator('#realtime-stage canvas').elementHandle();
  await page.locator('#realtime-stage canvas').evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForFunction(() => window.__TOUR_COMPARISON__.snapshot().status.realtime === 'unavailable', null, { timeout });
  check('comparison-context-loss-leaves-the-cycles-view-usable', await page.locator('#study-image').isVisible() && (await snapshot(page)).status.image === 'ready');
  await page.locator('#study-retry').click(); await ready(page);
  check('comparison-retry-replaces-the-lost-canvas-once', !await oldCanvas.evaluate(node => node.isConnected)
    && await page.locator('#realtime-stage canvas').count() === 1 && (await snapshot(page)).selectedViewId === beforeLocale.selectedViewId);
  const untouched = await page.evaluate(key => ({ ...window.__QA_ENTRY__, value: localStorage.getItem(key) }), seedKey);
  check('comparison-does-not-write-the-existing-journey', !untouched.storageWrites.length && untouched.value === seed, untouched);
  check('comparison-has-no-external-requests-or-browser-errors', !main.record.externalRequests.length && !main.record.pageErrors.length && !main.record.consoleErrors.length, main.record);
  report.observations.comparison = await snapshot(page); persist(); await main.context.close();

  const unavailable = await scenario('comparison-no-webgl', {}, {}, true, { entryUrl: entryUrl + '&lang=zh', staticEntry: true });
  await unavailable.page.waitForFunction(() => {
    const s = window.__TOUR_COMPARISON__?.snapshot(); return s?.status.realtime === 'unavailable' && s.status.image === 'ready';
  }, null, { timeout });
  check('comparison-without-webgl-still-presents-the-still-treatment', await unavailable.page.locator('#study-image').isVisible()
    && /[\u3400-\u9fff]/.test(await unavailable.page.locator('#realtime-status').innerText())
    && !unavailable.record.pageErrors.length && !unavailable.record.externalRequests.length, unavailable.record);
  await capture(unavailable.page, 'comparison-no-webgl-zh'); await unavailable.context.close();

  for (const [label, path, statusId] of [
    ['manifest', manifestPath, '#manifest-status'],
    ['image', new URL(expected.views[0].file, origin + manifestPath).pathname, '#image-status'],
  ]) {
    const missing = await scenario(`comparison-missing-${label}`, {}, {}, true,
      { entryUrl, staticEntry: true, blockedPaths: [path] });
    await missing.page.waitForFunction(label => window.__TOUR_COMPARISON__?.snapshot().status[label] === 'unavailable', label, { timeout });
    const english = await missing.page.locator(statusId).innerText();
    await missing.page.locator('#study-language [data-locale="zh"]').click();
    check(`comparison-missing-${label}-has-localized-recoverable-error`, Boolean(english)
      && /[\u3400-\u9fff]/.test(await missing.page.locator(statusId).innerText())
      && await missing.page.locator('#study-retry').isVisible() && !missing.record.pageErrors.length && !missing.record.externalRequests.length,
    { ...missing.record, note: '404 asset and unavailable-WebGL diagnostics are deliberate fault fixtures.' });
    await capture(missing.page, `comparison-missing-${label}-zh`); await missing.context.close();
  }
}
