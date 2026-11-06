import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const preview = realpathSync(resolve(root, 'artifacts/realism-01/splat-fidelity/local-preview'));
const output = resolve(root, process.argv[2] || 'artifacts/realism-01/splat-fidelity/preview-check-02');
assert(output.startsWith(resolve(root, 'artifacts/'))); mkdirSync(output, { recursive: true });
const temporary = resolve(root, 'artifacts/splat-fidelity-tmp'); mkdirSync(temporary, { recursive: true });
process.env.TMPDIR = temporary; process.env.XDG_CONFIG_HOME = resolve(temporary, 'config');
const hash = data => createHash('sha256').update(data).digest('hex');
const identify = file => { const data = readFileSync(file); return { path: relative(root, file), bytes: data.length, sha256: hash(data) }; };
const report = { startedAt: new Date().toISOString(), completed: false, source: identify(resolve(preview, 'package-manifest.json')), producer: identify(fileURLToPath(import.meta.url)), requests: [], externalRequests: [], errors: [] };
const server = createServer((req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const file = realpathSync(resolve(preview, '.' + (path === '/' ? '/index.html' : path))); assert(file.startsWith(preview + '/'));
    const data = readFileSync(file); report.requests.push(identify(file));
    res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' })[extname(file)] || 'application/octet-stream' }); res.end(data);
  } catch (error) { report.errors.push(error.message); res.writeHead(404); res.end(); }
});
await new Promise(accept => server.listen(0, '127.0.0.1', accept));
let browser;
try {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'], env: { ...process.env, TMPDIR: temporary } });
  const context = await browser.newContext({ viewport: { width: 640, height: 700 }, deviceScaleFactor: 1 });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await context.route('**/*', route => {
    if (route.request().url().startsWith(origin + '/')) return route.continue();
    report.externalRequests.push(route.request().url()); return route.abort();
  });
  const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(origin); const frame = page.frames().find(item => item.parentFrame());
  await frame.waitForFunction(() => window.__HALL__?.snapshot().ready, null, { timeout: 180000 });
  report.before = await frame.evaluate(() => window.__HALL__.snapshot());
  const image = await page.screenshot({ path: resolve(output, 'preview.jpg'), type: 'jpeg', quality: 92, timeout: 120000 });
  report.capture = { path: 'preview.jpg', bytes: image.length, sha256: hash(image) };
  const box = await page.frameLocator('iframe').locator('#stage').boundingBox();
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.down();
  await page.mouse.move(box.x + box.width * .52, box.y + box.height * .5); await page.mouse.up();
  report.after = await frame.evaluate(() => window.__HALL__.settle());
  report.checks = [
    { id: 'source-loaded', pass: report.before.sourceCount === 1935275 },
    { id: 'no-external-requests', pass: report.externalRequests.length === 0 },
    { id: 'no-page-errors', pass: report.errors.length === 0 },
    { id: 'native-interaction', pass: report.after.draws > report.before.draws && report.after.nativeInputs.some(item => item.trusted && item.type === 'pointerdown') && report.after.camera.matrixWorld.some((value, index) => value !== report.before.camera.matrixWorld[index]) },
    { id: 'attribution-visible', pass: await page.getByText('Knock Community Hall by scbenoit', { exact: true }).isVisible() }
  ]; report.completed = true; await context.close();
} finally {
  if (browser) await browser.close();
  await new Promise(accept => { server.close(accept); server.closeAllConnections(); });
  report.finishedAt = new Date().toISOString(); writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ completed: report.completed, checks: report.checks, errors: report.errors }));
