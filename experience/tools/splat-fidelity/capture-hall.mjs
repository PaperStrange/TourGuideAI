import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, realpathSync, copyFileSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = resolve(root, 'experience/tools/splat-fidelity');
const research = resolve(root, 'artifacts/realism-01/splat-fidelity/research');
const output = resolve(root, process.argv[2]); assert(output.startsWith(resolve(root, 'artifacts/'))); mkdirSync(output, { recursive: true });
const calibrationOnly = process.argv.includes('--calibration-only'), focalAdjustment = process.argv.includes('--focal2') ? 2 : 1;
const temporary = resolve(root, 'artifacts/splat-fidelity-tmp'); mkdirSync(temporary, { recursive: true });
process.env.TMPDIR = temporary; process.env.XDG_CONFIG_HOME = resolve(temporary, 'config');
const hash = data => createHash('sha256').update(data).digest('hex');
const identify = path => { const data = readFileSync(path); return { path: relative(root, path), bytes: data.length, sha256: hash(data) }; };
const three = resolve(root, 'experience/node_modules/three');
const files = new Map([['/', resolve(directory, 'hall.html')], ['/hall.js', resolve(directory, 'hall.js')],
  ['/spark.module.js', resolve(root, 'artifacts/realism-01/splat-qualification/downloads/spark.module.js')],
  ['/hall.sog', resolve(research, 'knock-original.sog')], ['/hall-config.json', resolve(research, 'knock-published-viewer-config.json')],
  ['/publisher', resolve(research, 'knock-viewer.html')], ['/assets/main-BNR-fDHi.js', resolve(research, 'supersplat-deployed-bundle.js')],
  ['/assets/main-XaDM7_Ax.css', resolve(research, 'supersplat-deployed-style.css')]]);
const config = JSON.parse(readFileSync(resolve(research, 'knock-published-viewer-config.json')));
const sourcePrefix = config.contentUrl.slice(0, config.contentUrl.lastIndexOf('/') + 1);
const report = { schemaVersion: 1, kind: 'original-publisher-architecture-fidelity', startedAt: new Date().toISOString(), completed: false,
  calibrationOnly, focalAdjustment,
  toolSources: ['capture-hall.mjs', 'hall.html', 'hall.js'].map(name => identify(resolve(directory, name))),
  sourceInputs: [...files.values()].map(identify), servedResources: [], errors: [], blockedExternalRequests: [], captures: [],
  limits: ['Non-Kyoto engineering sample; original drone capture provides no complete pedestrian route coverage',
    'Cached unchanged deployed publisher viewer and original components; publisher poster is a separate view without camera metadata',
    'SwiftShader; no physical-device, night, continuous-route, resource-budget or user realism acceptance'] };
mkdirSync(resolve(output, 'tool-snapshot'), { recursive: true });
for (const item of report.toolSources) copyFileSync(resolve(root, item.path), resolve(output, 'tool-snapshot', item.path.split('/').at(-1)));
const save = () => writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
let publisherCamera = {}; const served = new Map();
const mime = path => ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp' })[extname(path)] || 'application/octet-stream';
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  if (path === '/metrics') { report.blockedExternalRequests.push('Local publisher telemetry suppressed: /metrics'); res.writeHead(204); res.end(); return; }
  if (path === '/publisher-camera.json') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(publisherCamera)); return; }
  let file = files.get(path);
  if (path.startsWith('/three/')) { file = realpathSync(resolve(three, path.slice(7))); assert(file.startsWith(realpathSync(three) + '/')); }
  if (!file) { report.errors.push({ type: 'unmapped-local-resource', path }); res.writeHead(404); res.end(); return; }
  const data = readFileSync(file); served.set(path, { requestPath: path, ...identify(file) });
  res.writeHead(200, { 'Content-Type': mime(file), 'Cache-Control': 'no-store', 'Content-Length': data.length }); res.end(data);
});
await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
let browser;
try {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'], env: { ...process.env, TMPDIR: temporary } });
  report.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 960, height: 960 }, deviceScaleFactor: 1 });
  await context.route('**/*', async route => {
    const url = route.request().url();
    if (url.startsWith(`http://127.0.0.1:${server.address().port}/`)) return route.continue();
    let file;
    if (url.startsWith(sourcePrefix)) { const name = new URL(url).pathname.split('/').at(-1); if (/^[\w.-]+$/.test(name)) file = resolve(research, 'knock-original', name); }
    else if (url === config.posterUrl) file = resolve(research, 'knock-publisher-reference.webp');
    if (file) { served.set(url, { requestPath: url, ...identify(file) }); return route.fulfill({ status: 200, contentType: mime(file), headers: { 'Access-Control-Allow-Origin': '*' }, body: readFileSync(file) }); }
    report.blockedExternalRequests.push(url); return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => { report.errors.push({ type: 'pageerror', message: error.message }); save(); });
  page.on('console', message => { if (message.type() === 'error') { report.errors.push({ type: 'console', message: message.text() }); save(); } });
  const origin = `http://127.0.0.1:${server.address().port}`;
  // 使用发布者公开支持的参数关闭自动镜头动画和界面，保持参考截图与记录的相机一致。
  await page.goto(`${origin}/publisher?noanim&noui&webgl`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.app?.root, null, { timeout: 180000 });
  publisherCamera = await page.evaluate(() => {
    const camera = window.app.root.findComponents('camera')[0];
    const gl = window.app.graphicsDevice.gl, debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { camera: { matrixWorld: Array.from(camera.entity.getWorldTransform().data), projectionMatrix: Array.from(camera.projectionMatrix.data), position: Array.from(camera.entity.getPosition().toArray()), fov: camera.fov, horizontalFov: camera.horizontalFov },
      viewport: [window.app.graphicsDevice.width, window.app.graphicsDevice.height],
      assetTransforms: window.app.root.findComponents('gsplat').map(item => Array.from(item.entity.getWorldTransform().data)),
      graphics: { renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) } };
  });
  report.publisher = publisherCamera; writeFileSync(resolve(output, 'publisher-camera.json'), JSON.stringify(publisherCamera, null, 2) + '\n');
  async function capture(name, locator, observation) {
    const data = await locator.screenshot({ path: resolve(output, name), type: 'jpeg', quality: 92, timeout: 120000 });
    report.captures.push({ path: name, bytes: data.length, sha256: hash(data), date: new Date().toISOString(), observation }); save();
  }
  await capture('publisher-initial.jpg', page.locator('canvas').first(), publisherCamera);
  report.publisherCameraAfterCapture = await page.evaluate(() => Array.from(window.app.root.findComponents('camera')[0].entity.getWorldTransform().data));
  await page.goto(`${origin}/?focal=${focalAdjustment}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__HALL__?.snapshot().ready, null, { timeout: 240000 });
  report.before = await page.evaluate(() => window.__HALL__.snapshot());
  await capture('spark-initial.jpg', page.locator('#stage'), report.before);
  if (!calibrationOnly) {
  await page.mouse.move(480, 480); await page.mouse.down(); await page.mouse.move(528, 490, { steps: 3 }); await page.mouse.up();
  report.afterOrbit = await page.evaluate(() => window.__HALL__.settle()); await capture('spark-orbit.jpg', page.locator('#stage'), report.afterOrbit);
  await page.mouse.wheel(0, -180); report.afterDolly = await page.evaluate(() => window.__HALL__.settle()); await capture('spark-dolly.jpg', page.locator('#stage'), report.afterDolly);
  const second = await context.newPage(); await second.goto('about:blank'); await second.bringToFront(); await second.waitForTimeout(300);
  report.background = await page.evaluate(() => window.__HALL__.snapshot()); await page.bringToFront(); await page.waitForTimeout(300);
  report.resumed = await page.evaluate(() => window.__HALL__.snapshot()); await second.close();
  }
  report.disposed = await page.evaluate(() => window.__HALL__.dispose());
  const matrixError = (a, b) => Math.max(...a.map((value, index) => Math.abs(value - b[index])));
  report.cameraAgreement = { worldMaxAbs: matrixError(report.publisher.camera.matrixWorld, report.before.camera.matrixWorld), projectionMaxAbs: matrixError(report.publisher.camera.projectionMatrix, report.before.camera.projectionMatrix) };
  report.checks = [
    { id: 'publisher-camera-stable-during-capture', pass: matrixError(report.publisher.camera.matrixWorld, report.publisherCameraAfterCapture) < .00001 },
    { id: 'original-splat-count', pass: report.before.sourceCount === 1935275 },
    { id: 'publisher-camera-match', pass: report.cameraAgreement.worldMaxAbs < .00001 && report.cameraAgreement.projectionMaxAbs < .00001 },
    { id: 'dispose', pass: report.disposed.disposed },
  ];
  if (!calibrationOnly) report.checks.push(
    { id: 'native-orbit', pass: report.afterOrbit.draws > report.before.draws && matrixError(report.afterOrbit.camera.matrixWorld, report.before.camera.matrixWorld) > .01 && report.afterOrbit.nativeInputs.some(event => event.trusted && event.type === 'pointerdown') },
    { id: 'native-dolly', pass: report.afterDolly.draws > report.afterOrbit.draws && report.afterDolly.nativeInputs.some(event => event.trusted && event.type === 'wheel') },
    { id: 'native-hidden-resume-observed', pass: report.background.visibilityState === 'hidden' && report.resumed.visibilityState === 'visible' });
  report.completed = true;
  await context.close();
} finally {
  if (browser) await browser.close();
  await new Promise(accept => { server.close(accept); server.closeAllConnections(); });
  report.servedResources = [...served.values()]; report.finishedAt = new Date().toISOString(); save();
}
console.log(JSON.stringify({ completed: report.completed, checks: report.checks, errors: report.errors }));
