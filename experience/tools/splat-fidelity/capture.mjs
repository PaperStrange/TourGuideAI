import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, realpathSync, copyFileSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const directory = resolve(root, 'experience/tools/splat-fidelity');
const output = resolve(root, process.argv[2]);
assert(output.startsWith(resolve(root, 'artifacts/')));
mkdirSync(output, { recursive: true });
const temporary = resolve(root, 'artifacts/splat-fidelity-tmp'); mkdirSync(temporary, { recursive: true });
process.env.TMPDIR = temporary; process.env.XDG_CONFIG_HOME = resolve(temporary, 'config');
const hash = data => createHash('sha256').update(data).digest('hex');
const identify = path => { const data = readFileSync(path); return { path: relative(root, path), bytes: data.length, sha256: hash(data) }; };
const previous = resolve(root, 'artifacts/realism-01/splat-qualification/downloads');
const downloads = resolve(root, 'artifacts/realism-01/splat-fidelity/downloads');
const three = resolve(root, 'experience/node_modules/three');
const files = new Map([['/', resolve(directory, 'viewer.html')], ['/viewer.js', resolve(directory, 'viewer.js')],
  ['/spark.module.js', resolve(previous, 'spark.module.js')], ['/shoe.splat', resolve(previous, 'shoe.splat')],
  ['/independent.module.js', resolve(downloads, 'independent.module.js')], ['/reference.json', resolve(root, 'experience/evidence/realism-01/qualification/splat-compatibility/result.json')]]);
const report = { schemaVersion: 1, startedAt: new Date().toISOString(), completed: false,
  kind: 'same-source-independent-splat-renderer-diagnostic', toolSources: ['acquire.py', 'capture.mjs', 'viewer.html', 'viewer.js'].map(name => identify(resolve(directory, name))),
  sourceInputs: [...files.values()].map(identify), servedResources: [], errors: [], engines: [],
  limits: ['Same licensed non-Kyoto shoe bytes and initial camera; no independent photograph or source capture orientation.',
    'SwiftShader diagnostic; no physical-device, Kyoto realism, night, streaming or complete resource acceptance.'] };
mkdirSync(resolve(output, 'tool-snapshot'), { recursive: true });
for (const item of report.toolSources) copyFileSync(resolve(root, item.path), resolve(output, 'tool-snapshot', item.path.split('/').at(-1)));
const save = () => writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
const served = new Map();
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  let file = files.get(path);
  if (path.startsWith('/three/')) { file = realpathSync(resolve(three, path.slice(7))); assert(file.startsWith(realpathSync(three) + '/')); }
  if (!file) { res.writeHead(404); res.end('Unmapped diagnostic resource'); return; }
  const data = readFileSync(file); served.set(path, { requestPath: path, ...identify(file) });
  res.writeHead(200, { 'Content-Type': extname(file) === '.html' ? 'text/html' : extname(file) === '.js' ? 'text/javascript' : 'application/octet-stream',
    'Cache-Control': 'no-store', 'Content-Length': data.length }); res.end(data);
});
await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
let browser;
try {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'], env: { ...process.env, TMPDIR: temporary } });
  report.browser = browser.version();
  for (const engine of ['spark', 'independent']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', error => { report.errors.push({ engine, type: 'pageerror', message: error.message }); save(); });
    page.on('console', message => { if (message.type() === 'error') { report.errors.push({ engine, type: 'console', message: message.text() }); save(); } });
    await page.goto(`http://127.0.0.1:${server.address().port}/?engine=${engine}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__FIDELITY__?.snapshot().ready, null, { timeout: 180000 });
    const record = { engine, before: await page.evaluate(() => window.__FIDELITY__.snapshot()), captures: [] }; report.engines.push(record);
    const canvas = page.locator('#stage');
    async function capture(pose) {
      const name = `${engine}-${pose}.jpg`; const data = await canvas.screenshot({ path: resolve(output, name), type: 'jpeg', quality: 92 });
      record.captures.push({ path: name, bytes: data.length, sha256: hash(data), date: new Date().toISOString(), observation: await page.evaluate(() => window.__FIDELITY__.snapshot()) }); save();
    }
    await capture('initial');
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.down();
    await page.mouse.move(box.x + box.width * .65, box.y + box.height * .52, { steps: 6 }); await page.mouse.up();
    record.afterOrbit = await page.evaluate(() => window.__FIDELITY__.settle()); await capture('orbit');
    const second = await context.newPage(); await second.goto('about:blank'); await second.bringToFront(); await second.waitForTimeout(300);
    record.background = await page.evaluate(() => window.__FIDELITY__.snapshot());
    await page.bringToFront(); await page.waitForTimeout(300); record.resumed = await page.evaluate(() => window.__FIDELITY__.snapshot());
    await second.close(); record.disposed = await page.evaluate(() => window.__FIDELITY__.dispose());
    record.checks = [
      { id: 'source-count', pass: record.before.sourceCount === 105144 },
      { id: 'native-camera-change', pass: record.afterOrbit.draws > record.before.draws && record.afterOrbit.camera.matrixWorld.some((value, index) => value !== record.before.camera.matrixWorld[index]) && record.afterOrbit.nativeInputs.some(event => event.trusted && event.type === 'pointerdown') },
      { id: 'disposal-completed', pass: record.disposed.disposed },
      { id: 'native-hidden-resume-observed', pass: record.background.visibilityState === 'hidden' && record.resumed.visibilityState === 'visible', qualification: 'Observation only; no timing threshold or hidden-work accounting' }
    ];
    await context.close(); save();
  }
  report.identicalInitialCameras = report.engines[0].before.camera.matrixWorld.every((value, index) => value === report.engines[1].before.camera.matrixWorld[index]);
  report.completed = true;
} finally {
  if (browser) await browser.close();
  await new Promise(accept => { server.close(accept); server.closeAllConnections(); });
  report.servedResources = [...served.values()]; report.finishedAt = new Date().toISOString(); save();
}
console.log(JSON.stringify({ output: relative(root, output), completed: report.completed, errors: report.errors, engines: report.engines.map(item => ({ engine: item.engine, checks: item.checks })) }));
