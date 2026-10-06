import { createHash } from 'node:crypto';
import { APPEARANCE_KEY } from '../src/app/appearance.js';
import { STORAGE_KEY } from '../src/app/journey-store.js';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const stable = value => JSON.stringify({ x: value.game.x, y: value.game.y, locale: value.locale,
  visits: value.game.visitedIds, choices: value.game.choiceIds, read: value.game.readSourceIds,
  selected: value.game.selectedTargetId, notes: value.notes });
const pose = camera => JSON.stringify({ position: camera.position, target: camera.target,
  matrixWorld: camera.matrixWorld, projectionMatrix: camera.projectionMatrix });
export const lightingState = page => page.evaluate(() => window.__TOUR_GAME__.renderer().lighting);
export const waitForLighting = (page, mode, timeout, phase = 'ready') => page.waitForFunction(({ mode, phase }) => {
  const light = window.__TOUR_GAME__?.renderer().lighting;
  return light?.requestedMode === mode && light.mode === mode && light.phase === phase;
}, { mode, phase }, { timeout });

export function lightingMatchesRig(actual, mode, rig, assets) {
  const expected = rig.modes[mode];
  const expectedFixtures = expected.fixtures.filter(light => light.enabled && light.intensity > 0);
  const fixtures = actual.lights.filter(light => expected.fixtures.some(config => config.id === light.id));
  return actual.phase === 'ready' && actual.mode === mode && actual.requestedMode === mode
    && actual.rig.sha256 === sha(assets.get('/lighting/rig.json'))
    && actual.environment.sha256 === expected.environment.sha256
    && Boolean(actual.environment.textureId)
    && Math.abs(actual.environmentIntensity - expected.environment.intensity) < 1e-8
    && Math.abs(actual.environmentRotationY - expected.environment.rotationY) < 1e-8
    && Math.abs(actual.exposure - expected.exposure) < 1e-8
    && expectedFixtures.every(config => fixtures.some(light => light.id === config.id
      && Math.abs(light.intensity - config.intensity) < 1e-8 && light.castShadow === Boolean(config.shadow?.enabled)))
    && fixtures.filter(light => light.intensity > 0 && light.castShadow).length <= rig.limits.maxShadowCastingLocalLights
    && (mode === 'night' ? actual.emissiveMeshes.some(mesh => mesh.intensity > 0)
      : fixtures.every(light => light.intensity === 0) && actual.emissiveMeshes.every(mesh => mesh.intensity === 0));
}

async function pixels(page, a, b) {
  return page.evaluate(async encoded => {
    const images = await Promise.all(encoded.map(async text => {
      const img = new Image(); img.src = 'data:image/png;base64,' + text; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      return { width: img.width, height: img.height, data: ctx.getImageData(0, 0, img.width, img.height).data };
    }));
    if (images[0].width !== images[1].width || images[0].height !== images[1].height) throw new Error('Appearance changed canvas dimensions');
    let difference = 0, changedPixels = 0, sumA = 0, sumB = 0;
    for (let i = 0; i < images[0].data.length; i += 4) {
      let changed = false;
      for (let channel = 0; channel < 3; channel++) {
        const x = images[0].data[i + channel], y = images[1].data[i + channel];
        difference += Math.abs(x - y); sumA += x; sumB += y; changed ||= x !== y;
      }
      if (changed) changedPixels++;
    }
    const count = images[0].width * images[0].height;
    return { width: images[0].width, height: images[0].height, changedPixels,
      meanAbsoluteChannelDifference: difference / (count * 3), meanA: sumA / (count * 3), meanB: sumB / (count * 3) };
  }, [a.toString('base64'), b.toString('base64')]);
}

export async function verifyAppearanceOpening({ page, saved, check, capture, assets, timeout, report }) {
  const rig = JSON.parse(assets.get('/lighting/rig.json'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await waitForLighting(page, 'day', timeout);
  const before = await saved(page), camera = pose(await page.evaluate(() => window.__TOUR_GAME__.camera()));
  const day = await lightingState(page), canvas = page.locator('#game-stage canvas');
  const dayPixels = await canvas.screenshot(), repeatPixels = await canvas.screenshot();
  check('day-applies-the-local-environment-and-unlit-fixtures', lightingMatchesRig(day, 'day', rig, assets), day);
  await page.locator('#appearance-controls [data-appearance="night"]').click();
  await waitForLighting(page, 'night', timeout);
  const night = await lightingState(page), nightPixels = await canvas.screenshot();
  check('night-applies-distinct-local-environment-lights-and-emission', lightingMatchesRig(night, 'night', rig, assets)
    && night.environment.sha256 !== day.environment.sha256, night);
  const baseline = await pixels(page, dayPixels, repeatPixels), contrast = await pixels(page, dayPixels, nightPixels);
  check('day-night-change-appears-in-actual-fixed-camera-pixels', contrast.meanAbsoluteChannelDifference > baseline.meanAbsoluteChannelDifference + 1,
    { baseline, contrast, note: 'One channel value above repeated-frame noise establishes a rendered change, not preferred brightness or readability.' });
  check('appearance-switch-preserves-opening-camera-and-world', stable(await saved(page)) === stable(before)
    && pose(await page.evaluate(() => window.__TOUR_GAME__.camera())) === camera);
  await capture(page, 'opening-night-en');
  await page.locator('#language-switch [data-locale="zh"]').click(); await capture(page, 'opening-night-zh');
  check('appearance-controls-translate-and-keep-night-selected', /[\u3400-\u9fff]/.test(await page.locator('#appearance-controls').innerText())
    && await page.locator('#appearance-controls [data-appearance="night"]').getAttribute('aria-pressed') === 'true');
  await page.locator('#language-switch [data-locale="en"]').click();
  const warmed = await page.evaluate(() => window.__TOUR_GAME__.renderer());
  const resources = [];
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const mode of ['day', 'night']) {
      await page.locator(`#appearance-controls [data-appearance="${mode}"]`).click(); await waitForLighting(page, mode, timeout);
    }
    await canvas.screenshot(); // Sample live GPU allocations after the requested frame is drawn.
    resources.push(await page.evaluate(() => window.__TOUR_GAME__.renderer()));
  }
  check('repeated-warm-switches-do-not-grow-live-renderer-resources', resources.every(sample =>
    sample.memory.textures === warmed.memory.textures && sample.memory.geometries === warmed.memory.geometries
    && sample.lighting.cacheEntries <= 2 && sample.lighting.pendingRequests === 0)
    && await canvas.count() === 1, { warmed, samples: resources });
  report.observations.appearance = { day, night, pixelComparison: contrast, resources };
  await page.emulateMedia({ reducedMotion: 'no-preference' });
}

export async function verifyAppearanceWithJourney({ page, saved, check, capture, timeout, draft }) {
  const before = await saved(page), beforeCamera = pose(await page.evaluate(() => window.__TOUR_GAME__.camera()));
  await page.locator('#appearance-controls [data-appearance="day"]').click(); await waitForLighting(page, 'day', timeout);
  await page.locator('#appearance-controls [data-appearance="night"]').click(); await waitForLighting(page, 'night', timeout);
  const after = await saved(page);
  check('completed-journey-and-camera-survive-appearance-switching', stable(after) === stable(before)
    && pose(await page.evaluate(() => window.__TOUR_GAME__.camera())) === beforeCamera, { before, after });
  await page.locator('#game-stage').focus(); await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('#place-dialog').open);
  check('unsaved-note-survives-close-switch-and-reopen', await page.locator('#memory-note').inputValue() === draft
    && !(await saved(page)).notes.mufg);
  await capture(page, 'night-completed-card-zh'); await page.locator('#card-close').click();
  const preference = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), APPEARANCE_KEY);
  check('appearance-is-a-separate-persisted-preference', preference?.lighting === 'night'
    && !Object.hasOwn(after, 'appearance') && !Object.hasOwn(after, 'lighting')
    && !Object.hasOwn(after.game, 'appearance') && !Object.hasOwn(after.game, 'lighting'), { preference });
}

export async function verifyAppearanceFaults({ scenario, assets, origin, seed, saved, check, capture, timeout }) {
  const rig = JSON.parse(assets.get('/lighting/rig.json'));
  const nightPath = new URL(rig.modes.night.environment.file, origin + '/lighting/rig.json').pathname;
  let releaseNight;
  let nightGate = new Promise(resolve => { releaseNight = resolve; });
  let nightRequested = false;
  const delayed = await scenario('appearance-delayed-hdr', { [STORAGE_KEY]: JSON.stringify(seed) }, {}, false,
    { delayAsset: path => { if (path === nightPath) { nightRequested = true; return nightGate; } } });
  const page = delayed.page;
  await waitForLighting(page, 'day', timeout);
  const before = await saved(page);
  await page.locator('#appearance-controls [data-appearance="night"]').click();
  await page.waitForFunction(() => window.__TOUR_GAME__.renderer().lighting.phase === 'loading');
  await page.locator('#game-stage').focus(); await page.keyboard.press('e');
  await page.waitForFunction(() => document.querySelector('#place-dialog').open);
  const draft = 'Pending HDR must not replace this unsaved draft. 夜色';
  await page.locator('#memory-note').fill(draft); await page.locator('#memory-note').focus();
  const openedCamera = pose(await page.evaluate(() => window.__TOUR_GAME__.camera()));
  releaseNight(); await waitForLighting(page, 'night', timeout);
  check('delayed-hdr-commit-preserves-open-card-draft-pause-and-focus', nightRequested
    && await page.locator('#place-dialog').evaluate(node => node.open)
    && await page.locator('#memory-note').inputValue() === draft
    && await page.evaluate(() => document.activeElement.id === 'memory-note' && window.__TOUR_GAME__.snapshot().paused)
    && pose(await page.evaluate(() => window.__TOUR_GAME__.camera())) === openedCamera
    && stable(await saved(page)) === stable(before));
  await capture(page, 'delayed-night-card'); await page.locator('#card-close').click();
  await page.locator('#appearance-controls [data-appearance="day"]').click();
  await waitForLighting(page, 'day', timeout);
  await page.reload();
  await page.waitForFunction(() => window.__TOUR_GAME__ && document.querySelector('#loading').hidden, null, { timeout });
  await waitForLighting(page, 'day', timeout);
  nightGate = new Promise(resolve => { releaseNight = resolve; });
  await page.locator('#appearance-controls [data-appearance="night"]').click();
  await page.waitForFunction(() => window.__TOUR_GAME__.renderer().lighting.phase === 'loading');
  await page.locator('#appearance-controls [data-appearance="day"]').click();
  releaseNight();
  await waitForLighting(page, 'day', timeout);
  await page.waitForFunction(() => window.__TOUR_GAME__.renderer().lighting.pendingRequests === 0, null, { timeout });
  check('late-hdr-request-cannot-override-the-last-mode-choice', (await lightingState(page)).mode === 'day'
    && stable(await saved(page)) === stable(before));
  check('delayed-appearance-has-no-external-requests-or-browser-errors', !delayed.record.externalRequests.length
    && !delayed.record.pageErrors.length && !delayed.record.consoleErrors.length, delayed.record);
  await delayed.context.close();

  let failNight = true;
  const missing = await scenario('appearance-missing-hdr', { [STORAGE_KEY]: JSON.stringify(seed) }, {}, false,
    { failAsset: path => path === nightPath && failNight });
  await waitForLighting(missing.page, 'day', timeout);
  const beforeMissing = await saved(missing.page);
  await missing.page.locator('#appearance-controls [data-appearance="night"]').click();
  await waitForLighting(missing.page, 'night', timeout, 'fallback');
  check('missing-hdr-keeps-a-usable-night-fallback-and-journey', await missing.page.locator('#appearance-retry').isVisible()
    && await missing.page.locator('#game-stage canvas').isVisible() && stable(await saved(missing.page)) === stable(beforeMissing));
  await missing.page.locator('#language-switch [data-locale="zh"]').click();
  check('missing-hdr-fallback-is-localized', /[\u3400-\u9fff]/.test(await missing.page.locator('#appearance-status').innerText()));
  await capture(missing.page, 'missing-night-hdr-zh');
  failNight = false; await missing.page.locator('#appearance-retry').click(); await waitForLighting(missing.page, 'night', timeout);
  check('hdr-retry-applies-the-real-local-asset', lightingMatchesRig(await lightingState(missing.page), 'night', rig, assets));
  check('hdr-faults-have-only-deliberate-diagnostics', !missing.record.externalRequests.length && !missing.record.pageErrors.length
    && missing.record.consoleErrors.every(message => message.includes('404 (Not Found)')), missing.record);
  await missing.context.close();
}
