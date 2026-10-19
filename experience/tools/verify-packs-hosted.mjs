// 发布后使用真实 HTTPS 页面与输入检查两个街区的保存、返回和地图交接。
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const [pageURL, outputDirectory] = process.argv.slice(2);
if (!pageURL || !outputDirectory) throw new Error('Usage: node tools/verify-packs-hosted.mjs <https-page-url> <output-directory>');
const base = new URL(pageURL), output = resolve(outputDirectory);
if (base.protocol !== 'https:') throw new Error('Published verification requires HTTPS.');
mkdirSync(output, { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { startedAt: new Date().toISOString(), url: base.href,
  driverSha256: sha(readFileSync(new URL(import.meta.url))), checks: [], pageErrors: [], responses: [], screenshots: [],
  conditions: { viewport: [1440, 1000], reducedMotion: 'reduce', interception: false, tlsVerification: true,
    scope: 'Actual desktop published journey; phone, failure and resource coverage are separate packaged checks.' } };
const save = () => writeFileSync(join(output, 'hosted-packs.json'), JSON.stringify(report, null, 2) + '\n');
function check(id, pass, evidence) {
  report.checks.push({ id, pass: Boolean(pass), evidence }); save(); console.log(`${pass ? 'PASS' : 'FAIL'} ${id}`);
  if (!pass) throw new Error('Hosted check failed: ' + id);
}
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const samePose = (a, b) => a.packId === b.packId && a.revision === b.revision
  && Math.hypot(a.player.x - b.player.x, a.player.y - b.player.y) < .002
  && ['azimuth', 'polar', 'distance'].every(key => Math.abs(a.camera[key] - b.camera[key]) < .0001)
  && ['x', 'y', 'height'].every(key => Math.abs(a.camera.targetOffset[key] - b.camera.targetOffset[key]) < .0001);
const proxyValue = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const proxy = proxyValue ? new URL(proxyValue) : null;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
  ...(process.env.EXPERIENCE_QA_CHROMIUM ? { executablePath: process.env.EXPERIENCE_QA_CHROMIUM } : {}),
  ...(proxy ? { proxy: { server: proxy.origin, bypass: 'localhost,127.0.0.1',
    ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) } } : {}) });
report.conditions.browser = browser.version();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage(); page.setDefaultTimeout(120000);
page.on('pageerror', error => report.pageErrors.push(error.message));
page.on('response', response => report.responses.push({ url: response.url(), status: response.status() }));
const state = () => page.evaluate(() => window.__HOME__.snapshot());
const records = () => page.evaluate(() => JSON.parse(localStorage.getItem('tourguideai.solo.places.v1')).places);
async function ready(packId, lighting) {
  await page.waitForFunction(({ packId, lighting }) => {
    const state = window.__HOME__?.snapshot(), renderer = window.__TOUR_GAME__?.renderer();
    return state?.pack?.packId === packId && state.sceneState === 'ready' && state.currentView?.version === 3
      && renderer?.renderedFrames > 0 && renderer.lighting.phase === 'ready'
      && (!lighting || renderer.lighting.mode === lighting);
  }, { packId, lighting });
}
async function capture(name) {
  const file = name + '.png', path = join(output, file);
  await page.locator('.preview-frame').scrollIntoViewIfNeeded();
  await page.screenshot({ path });
  report.screenshots.push({ file, sha256: sha(readFileSync(path)), state: await state() }); save();
}
async function keep(title, note) {
  await page.locator('#solo-keep').click();
  await page.locator('#kept-title').fill(title); await page.locator('#kept-note').fill(note);
  await page.locator('#keep-place-form button[type=submit]').click();
  await page.locator('#keep-place-dialog').waitFor({ state: 'hidden' });
  return (await records()).find(place => place.title === title);
}
async function reopen(place) {
  await page.locator(`[data-kept-open="${place.id}"]`).click(); await ready(place.view.packId, place.lighting);
  await page.waitForFunction(() => /saved view and place order are open|已打开收藏/.test(document.querySelector('#solo-status').textContent));
  check('published-return-' + place.view.packId, samePose((await state()).currentView, place.view)
    && (await records()).find(value => value.id === place.id)?.note === place.note, { expected: place, actual: await state() });
}
try {
  const descriptorResponse = await context.request.get(new URL('review-build.json', base).href);
  check('published-descriptor-available', descriptorResponse.ok());
  report.descriptor = await descriptorResponse.json();
  const url = new URL(base); url.search = new URLSearchParams({ qa: '1', lang: 'en', mode: 'explore', pack: 'ginza-wako' });
  const response = await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  report.htmlSha256 = sha(await response.body());
  check('published-homepage-available', response.ok());
  await ready('ginza-wako', 'day');
  const manifestResponse = await context.request.get(new URL('packs/ginza-wako/manifest.json', base).href);
  if (!manifestResponse.ok()) throw new Error('Published pack manifest unavailable.');
  const manifest = await manifestResponse.json(), renderer = await page.evaluate(() => window.__TOUR_GAME__.renderer());
  check('published-ginza-model-matches-manifest-and-draws', (await state()).requestedPack === 'ginza-wako'
    && renderer.scene.assetHashes['packs/ginza-wako/scene.glb'] === manifest.model.sha256, { manifest, renderer });
  check('published-ginza-controls-and-source', await page.locator('#solo-inspect').isEnabled()
    && await page.locator('#solo-keep').isEnabled() && await page.locator('#walk-link').isHidden()
    && (await page.locator('#center-source').getAttribute('href')).startsWith('https://'), await state());
  const before = (await state()).currentView;
  await page.locator('#live-stage').focus(); await page.keyboard.down('ArrowUp');
  try {
    await page.waitForFunction(previous => {
      const current = window.__TOUR_GAME__.snapshot();
      return Math.hypot(current.x - previous.x, current.y - previous.y) > .35;
    }, before.player);
  } finally { await page.keyboard.up('ArrowUp'); }
  await page.waitForFunction(() => !window.__TOUR_GAME__.snapshot().moving);
  const ground = await page.evaluate(() => window.__TOUR_GAME__.grounding());
  check('published-actual-keyboard-walk-stays-grounded', ground.inside && Boolean(ground.hit), { before, after: (await state()).currentView, ground });
  await page.locator('#solo-inspect').click(); await page.locator('#live-stage').focus();
  const camera = (await state()).currentView.camera; await page.keyboard.press('KeyL');
  await page.waitForFunction(azimuth => Math.abs(window.__HOME__.snapshot().currentView.camera.azimuth - azimuth) > .01, camera.azimuth);
  check('published-camera-orbit-responds', Math.abs((await state()).currentView.camera.azimuth - camera.azimuth) > .01);
  await page.locator('#solo-inspect').click(); await page.locator('#lighting-night').click(); await ready('ginza-wako', 'night');
  await capture('ginza-night-en');
  const ginza = await keep('Hosted Ginza return', 'A pause by the curved stone facade.');
  check('published-ginza-save-has-pack-and-note', ginza.view.packId === 'ginza-wako' && ginza.lighting === 'night' && Boolean(ginza.note), ginza);
  await page.locator('[data-pack="shijo-karasuma"]').click(); await ready('shijo-karasuma', 'night');
  check('published-shijo-retains-guided-links', await page.locator('#walk-link').isVisible() && await page.locator('#companion-link').isVisible());
  const shijo = await keep('Hosted Shijo return', 'The crossing remains here.');
  await page.reload(); await ready('shijo-karasuma');
  await reopen(ginza); await page.locator('#locale-zh').click(); await ready('ginza-wako', 'night');
  check('published-zh-retains-view-and-private-note', await page.locator('html').getAttribute('lang') === 'zh'
    && samePose((await state()).currentView, ginza.view) && (await records()).find(value => value.id === ginza.id).note === ginza.note);
  await capture('ginza-return-zh');
  const links = await page.locator('#route-maps a').evaluateAll(nodes => nodes.map(node => node.href)), coordinates = [];
  for (const href of links) {
    const link = new URL(href), query = link.searchParams;
    if (link.origin !== 'https://www.google.com') throw new Error('Unexpected Maps handoff origin.');
    const part = query.has('query') ? [query.get('query')] : [query.get('origin'), ...(query.get('waypoints')?.split('|') || []), query.get('destination')];
    if (coordinates.at(-1) === part[0]) part.shift(); coordinates.push(...part);
  }
  check('published-maps-preserves-real-selected-order', equal(coordinates, ginza.route.stops.map(stop => `${stop.latitude},${stop.longitude}`)), { links, coordinates });
  await page.locator('#street-map-toggle').click(); await page.waitForFunction(() => window.__HOME__.snapshot().map?.ready);
  check('published-surrounding-map-retains-ginza', (await state()).center.id === ginza.center.id && await page.locator('#world-map').isVisible());
  await reopen(shijo);
  check('published-localized-shijo-links', new URL(await page.locator('#walk-link').getAttribute('href'), base).searchParams.get('lang') === 'zh');
  check('published-two-place-records-survive', (await records()).length === 2);
  check('published-journey-has-no-page-exceptions', report.pageErrors.length === 0, report.pageErrors);
} catch (error) { report.error = error.message; process.exitCode = 1; }
finally {
  report.finishedAt = new Date().toISOString(); report.summary = { passed: report.checks.filter(item => item.pass).length,
    failed: report.checks.filter(item => !item.pass).length, error: report.error || null };
  save(); await context.close(); await browser.close(); console.log(JSON.stringify(report.summary));
}
