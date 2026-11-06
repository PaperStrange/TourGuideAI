import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const source = resolve(root, 'experience/tools/splat-qualification');
const downloads = resolve(root, 'artifacts/realism-01/splat-qualification/downloads');
const output = resolve(root, process.argv[2] ?? 'artifacts/realism-01/splat-qualification/run-01');
assert(output.startsWith(resolve(root, 'artifacts') + '/'));
mkdirSync(output, { recursive: true });
const temporary = resolve(root, 'artifacts/splat-tmp'); mkdirSync(temporary, { recursive: true });
process.env.TMPDIR = temporary;
process.env.XDG_CONFIG_HOME = resolve(temporary, 'config');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = path => { const data = readFileSync(path); return { path: relative(root, path), bytes: data.length, sha256: hash(data) }; };
const receipt = JSON.parse(readFileSync(resolve(downloads, 'download-receipts.json')));
for (const record of receipt.records) {
  const data = readFileSync(resolve(downloads, record.path));
  assert.equal(hash(data), record.sha256); assert.equal(data.length, record.bytes);
}
const threeRoot = resolve(root, 'experience/node_modules/three');
const three = JSON.parse(readFileSync(resolve(threeRoot, 'package.json')));
assert.equal(three.version, '0.186.1');
const direct = new Map([['/', resolve(source, 'viewer.html')], ['/viewer.js', resolve(source, 'viewer.js')],
  ['/spark.module.js', resolve(downloads, 'spark.module.js')], ['/shoe.splat', resolve(downloads, 'shoe.splat')]]);
const served = new Map();
const report = { schemaVersion: 1, kind: 'non-kyoto-splat-engineering-compatibility', startedAt: new Date().toISOString(),
  sourceReceipts: identity(resolve(downloads, 'download-receipts.json')),
  toolSources: ['acquire.py', 'capture.mjs', 'viewer.html', 'viewer.js'].map(file => identity(resolve(source, file))),
  versions: { three: three.version, spark: '2.4.0', browser: null }, requests: [], errors: [], captures: [], checks: [],
  conditions: { viewport: [1440, 1000], dpr: 1, antialias: false, lod: false, sortAwaited: true,
    performanceProtocol: 'No network throttle or Benchmark V1 timing acceptance; software-rendered engineering diagnostic' },
  limitations: ['Single non-Kyoto shoe sample, publisher rcmt, dataset card MIT; original capture ownership/date/location unverified.',
    'No street capture, common mesh pair, collision, night lighting, streaming or physical-device acceptance.',
    'Readiness timestamps are diagnostic observations, not full-quality Benchmark V1 measurements.'], completed: false };
const save = () => writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const event = { path, status: 404 }; report.requests.push(event);
  if (path === '/favicon.ico') { event.status = 204; res.writeHead(204); res.end(); return; }
  let file = direct.get(path);
  if (path.startsWith('/three/')) {
    file = realpathSync(resolve(threeRoot, path.slice(7)));
    assert(file.startsWith(realpathSync(threeRoot) + '/'));
  }
  if (!file) { res.writeHead(404); res.end('Unknown diagnostic resource'); return; }
  const data = readFileSync(file); event.status = 200; event.bytes = data.length;
  served.set(path, { requestPath: path, ...identity(file) });
  res.writeHead(200, { 'Content-Type': extname(file) === '.html' ? 'text/html' : extname(file) === '.js' ? 'text/javascript' : 'application/octet-stream',
    'Cache-Control': 'no-store', 'Content-Length': data.length }); res.end(data);
});
await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.EXPERIENCE_QA_CHROMIUM ?? '/usr/bin/chromium',
    headless: true, args: ['--no-sandbox'], env: { ...process.env, TMPDIR: temporary } });
  report.versions.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => { report.errors.push({ type: 'pageerror', message: error.message }); save(); });
  page.on('console', message => { if (message.type() === 'error') { report.errors.push({ type: 'console', message: message.text() }); save(); } });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__SPLAT_DIAGNOSTIC__?.snapshot().ready, null, { timeout: 180000 });
  report.before = await page.evaluate(() => window.__SPLAT_DIAGNOSTIC__.snapshot());
  const canvas = page.locator('#stage');
  async function capture(name) {
    const data = await canvas.screenshot({ path: resolve(output, name), type: 'jpeg', quality: 92, timeout: 30000 });
    const observation = await page.evaluate(() => window.__SPLAT_DIAGNOSTIC__.snapshot());
    report.captures.push({ path: name, bytes: data.length, sha256: hash(data), date: new Date().toISOString(), observation });
    save();
  }
  await capture('source-initial.jpg');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  await page.mouse.down(); await page.mouse.move(box.x + box.width * .65, box.y + box.height * .52, { steps: 6 }); await page.mouse.up();
  report.after = await page.evaluate(() => window.__SPLAT_DIAGNOSTIC__.settle());
  await capture('source-after-native-orbit.jpg');
  report.disposed = await page.evaluate(() => window.__SPLAT_DIAGNOSTIC__.dispose());
  report.checks = [
    { id: 'original-source-decoded-and-drawn', pass: report.before.sample.initialized && report.before.sample.count > 0 && report.before.spark.activeSplats > 0 && report.before.draws >= 3 },
    { id: 'current-three-revision', pass: report.before.threeRevision === '186' },
    { id: 'native-orbit-changes-submitted-camera', pass: report.after.draws > report.before.draws && report.after.camera.matrixWorld.some((value, index) => value !== report.before.camera.matrixWorld[index]) && report.after.nativeInputs.some(input => input.trusted && input.type === 'pointerdown') },
    { id: 'captured-frame-changes', pass: report.captures[0].sha256 !== report.captures[1].sha256 },
    { id: 'sample-disposal-completes', pass: report.disposed.disposed && !report.disposed.sample.sceneContainsSample },
    { id: 'no-page-errors', pass: report.errors.length === 0 }
  ];
  report.completed = true;
} finally {
  if (browser) await browser.close();
  await new Promise(accept => { server.close(accept); server.closeAllConnections(); });
  report.servedResources = [...served.values()]; report.finishedAt = new Date().toISOString(); save();
}
console.log(JSON.stringify({ output: relative(root, output), checks: report.checks }));
assert(report.checks.every(check => check.pass), 'Compatibility diagnostic has failing checks; retain result.json');
