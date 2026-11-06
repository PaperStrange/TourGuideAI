import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
const viewerDirectory = fileURLToPath(new URL('./viewer/', import.meta.url));
const vendorDirectory = resolve(repository, 'experience/node_modules/three');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const finiteVector = (value, size) => Array.isArray(value) && value.length === size && value.every(Number.isFinite);
const local = (base, path) => { const resolved = realpathSync(resolve(base, path)), suffix = relative(realpathSync(base), resolved);
  assert(suffix !== '..' && !suffix.startsWith('../') && !isAbsolute(suffix), 'File must remain inside its declared directory'); return resolved; };
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary' };

export function loadReviewManifest(path) {
  const bytes = readFileSync(path), manifest = JSON.parse(bytes);
  assert.equal(manifest.schemaVersion, 1, 'Expected review manifest schema version 1');
  assert.equal(manifest.coordinateSystem.axes, 'x east, y up, z south; metres');
  assert.equal(manifest.contentSelection?.ambiguousOccurrences, 0, 'Resolve source content alternatives before capture');
  assert(typeof manifest.coordinateSystem.verticalDatum === 'string' && manifest.coordinateSystem.verticalDatum.length);
  assert(manifest.models.length && manifest.sights.length === 6, 'Source models and all six sights required');
  assert.equal(new Set(manifest.models.map(model => model.id)).size, manifest.models.length, 'Duplicate model IDs');
  assert.equal(new Set(manifest.sights.map(sight => sight.id)).size, 6, 'Distinct sights required');
  const assets = new Map();
  for (const [index, record] of manifest.models.entries()) {
    const model = readFileSync(local(dirname(path), record.file));
    assert.equal(record.bytes, model.length, `Model byte count differs: ${record.id}`);
    assert.equal(record.sha256, sha(model), `Model SHA-256 differs: ${record.id}`);
    assert(!record.transform || finiteVector(record.transform, 16), `Invalid source transform: ${record.id}`);
    assert(Array.isArray(record.selectedBatchIds) && record.selectedBatchIds.every(value => Number.isInteger(value) && value >= 0)
      && new Set(record.selectedBatchIds).size === record.selectedBatchIds.length, `Explicit source object selection required: ${record.id}`);
    assert(Number.isInteger(record.selectedTriangles) && record.selectedTriangles >= 0, `Selected source triangle count required: ${record.id}`);
    record.url = `/models/${index}.glb`; assets.set(record.url, model);
  }
  for (const sight of manifest.sights) {
    assert(finiteVector(sight.position, 3) && sight.heightQualified === false && sight.heightMethod,
      'Diagnostic sight needs explicit unqualified source height');
    assert(finiteVector(sight.forward, 2) && Math.abs(Math.hypot(...sight.forward) - 1) < .00001,
      'Explicit normalized route tangent required for sight direction');
  }
  assert.equal(manifest.models.reduce((sum, model) => sum + model.selectedTriangles, 0),
    manifest.contentSelection.selectedTriangles, 'Selected triangle inventory differs');
  return { bytes, manifest, assets };
}

export async function startReviewServer(path, port = 0) {
  const bundle = loadReviewManifest(path);
  const files = new Map(bundle.assets);
  for (const file of ['index.html', 'main.js', 'style.css']) files.set('/' + file, readFileSync(resolve(viewerDirectory, file)));
  files.set('/', files.get('/index.html'));
  files.set('/review-manifest.json', Buffer.from(JSON.stringify(bundle.manifest)));
  const requests = [];
  const server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    const record = { path: pathname, method: request.method, status: 404 }; requests.push(record);
    const respond = (status, bytes) => {
      record.status = status;
      response.writeHead(status, { 'Content-Type': mime[extname(pathname)] ?? (pathname === '/' ? mime['.html'] : 'application/octet-stream'),
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Length': bytes.length });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    };
    if (!['GET', 'HEAD'].includes(request.method)) { respond(405, Buffer.from('Read-only diagnostic')); return; }
    if (files.has(pathname)) { respond(200, files.get(pathname)); return; }
    if (pathname.startsWith('/vendor/three/') && ['.js', '.wasm'].includes(extname(pathname))) {
      const vendor = local(vendorDirectory, pathname.slice('/vendor/three/'.length));
      respond(200, readFileSync(vendor)); return;
    }
    respond(404, Buffer.from('Unavailable source review resource'));
  });
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', accept); });
  return { bundle, url: `http://127.0.0.1:${server.address().port}`, requests,
    close: () => new Promise((accept, reject) => { server.close(error => error ? reject(error) : accept()); server.closeAllConnections(); }) };
}

async function capture({ manifestPath, output, executable }) {
  assert(output.startsWith(resolve(repository, 'artifacts') + '/'), 'Generated captures must remain in ignored artifacts');
  mkdirSync(output, { recursive: true });
  const temporary = resolve(repository, 'artifacts/source-review-tmp'); mkdirSync(temporary, { recursive: true });
  const service = await startReviewServer(manifestPath);
  const report = { schemaVersion: 1, kind: 'source-appearance-diagnostic', startedAt: new Date().toISOString(),
    inputManifest: { path: relative(repository, manifestPath), bytes: service.bundle.bytes.length, sha256: sha(service.bundle.bytes) },
    toolSources: ['capture-review.mjs', 'viewer/main.js', 'viewer/index.html', 'viewer/style.css'].map(file => {
      const path = resolve(dirname(fileURLToPath(import.meta.url)), file), bytes = readFileSync(path);
      return { path: relative(repository, path), bytes: bytes.length, sha256: sha(bytes) };
    }),
    conditions: { viewport: [1440, 1000], dpr: 1, rendering: 'Original GLTF materials, neutral diagnostic hemisphere and directional illumination; no authored ground or night fixtures',
      browser: null, graphics: null, externalNetwork: 'All viewer, decoder and geometry resources are served by local HTTP.' },
    sourceCredit: 'Kyoto City / MLIT Project PLATEAU, CC BY 4.0',
    limitations: ['Source qualification images; no production renderer comparison or performance acceptance.',
      'Camera anchors use provisional source heights; surveyed pedestrian ground and current facade identity remain unqualified.',
      'The 25 m acquisition index is bounded; absent distant context and opposite wards remain visible source gaps.'],
    captures: [], checks: [], errors: [], requests: service.requests, completed: false };
  const save = () => writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  save();
  let browser;
  try {
    browser = await chromium.launch({ executablePath: executable, headless: true, args: ['--no-sandbox'],
      env: { ...process.env, TMPDIR: temporary } });
    report.conditions.browser = browser.version();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ type: 'pageerror', message: error.message }));
    page.on('console', message => { if (message.type() === 'error') report.errors.push({ type: 'console', message: message.text() }); });
    await page.goto(service.url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.__SOURCE_REVIEW__?.snapshot().ready, null, { timeout: 240000 });
    report.initial = await page.evaluate(() => window.__SOURCE_REVIEW__.snapshot());
    report.conditions.graphics = report.initial.graphics;
    save();
    const canvas = page.locator('#stage');
    for (const sight of service.bundle.manifest.sights) {
      for (const pose of ['approach', 'reverse', 'overview']) {
        const observation = await page.evaluate(async ({ id, pose }) => window.__SOURCE_REVIEW__.setPose(id, pose), { id: sight.id, pose });
        const file = `${sight.id}-${pose}.jpg`;
        const bytes = await canvas.screenshot({ path: resolve(output, file), type: 'jpeg', quality: 92, timeout: 30000 });
        const pixels = await page.evaluate(async encoded => {
          const source = Uint8Array.from(atob(encoded), value => value.charCodeAt(0));
          const image = await createImageBitmap(new Blob([source], { type: 'image/jpeg' }));
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const context = canvas.getContext('2d'); context.drawImage(image, 0, 0); image.close();
          const data = context.getImageData(0, 0, canvas.width, canvas.height).data, histogram = new Map();
          let samples = 0;
          for (let y = 8; y < canvas.height - 8; y += 5) for (let x = 8; x < canvas.width - 8; x += 5) {
            const index = (y * canvas.width + x) * 4;
            const bin = (data[index] >> 4) * 256 + (data[index + 1] >> 4) * 16 + (data[index + 2] >> 4);
            histogram.set(bin, (histogram.get(bin) ?? 0) + 1); samples++;
          }
          return { samples, distinctColorBins: histogram.size, dominantFraction: Math.max(...histogram.values()) / samples,
            method: 'Native browser JPEG decode; interior pixels sampled every five pixels and quantized to 16 levels per RGB channel' };
        }, bytes.toString('base64'));
        report.captures.push({ path: file, bytes: bytes.length, sha256: sha(bytes),
          date: new Date().toISOString(), source: 'Actual local Chromium rendering of the bound PLATEAU source package',
          rights: 'Derived source diagnostic; Kyoto City / MLIT Project PLATEAU, CC BY 4.0',
          location: sight.id, method: 'Playwright JPEG screenshot, quality 92, after selected camera pose and subsequent submitted draws',
          limitations: 'Provisional source-height camera; original acquired geometry without ground repair; no physical GPU or realism acceptance', observation, pixels });
        save();
      }
    }
    const before = await page.evaluate(() => window.__SOURCE_REVIEW__.snapshot());
    const rect = await canvas.boundingBox();
    await page.mouse.move(rect.x + rect.width * .5, rect.y + rect.height * .5);
    await page.mouse.down(); await page.mouse.move(rect.x + rect.width * .6, rect.y + rect.height * .5, { steps: 5 }); await page.mouse.up();
    const after = await page.evaluate(() => window.__SOURCE_REVIEW__.snapshot());
    report.interaction = { before, after };
    report.checks.push({ id: 'six-sights-three-source-poses', pass: report.captures.length === 18 });
    report.checks.push({ id: 'native-orbit-changes-submitted-camera', pass: after.draws > before.draws
      && after.camera.matrixWorld.some((value, index) => value !== before.camera.matrixWorld[index])
      && after.nativeInputs.some(input => input.trusted && input.type === 'pointerdown') });
    report.checks.push({ id: 'all-source-models-loaded', pass: report.initial.loaded.length === service.bundle.manifest.models.length });
    report.checks.push({ id: 'selected-source-triangle-inventory', pass: report.initial.loaded.every(model => model.triangles
      === service.bundle.manifest.models.find(record => record.id === model.id).selectedTriangles),
      triangles: report.initial.loaded.reduce((sum, model) => sum + model.triangles, 0),
      originalTriangles: report.initial.loaded.reduce((sum, model) => sum + model.originalTriangles, 0) });
    report.checks.push({ id: 'all-captures-have-visible-source-content', pass: report.captures.every(capture => capture.observation.render.triangles > 0
      && capture.pixels.distinctColorBins > 5 && capture.pixels.dominantFraction < .995),
      incompleteCaptures: report.captures.filter(capture => capture.observation.render.triangles === 0
        || capture.pixels.distinctColorBins <= 5 || capture.pixels.dominantFraction >= .995).map(capture => capture.path),
      limitation: 'Nonuniform pixels and submitted geometry do not establish recognizable landmarks or realistic appearance.' });
    report.checks.push({ id: 'no-page-errors', pass: report.errors.length === 0 });
    report.completed = true;
  } finally {
    if (browser) await browser.close();
    await service.close();
    report.finishedAt = new Date().toISOString();
    save();
  }
  const board = ['# Assembled source inspection', '',
    'Actual Chromium source renders with provisional source-height camera anchors. Ground, present-day appearance and lighting remain unqualified.', '',
    '| Sight | Approach | Reverse | Elevated context |', '| --- | --- | --- | --- |',
    ...service.bundle.manifest.sights.map(sight => `| ${sight.label ?? sight.id} | ![Approach](${sight.id}-approach.jpg) | ![Reverse](${sight.id}-reverse.jpg) | ![Context](${sight.id}-overview.jpg) |`), '',
    '[Input identities, observations and limits](result.json)', ''];
  writeFileSync(resolve(output, 'board.md'), board.join('\n'));
  console.log(JSON.stringify({ output: relative(repository, output), captures: report.captures.length, checks: report.checks }));
  assert(report.checks.every(check => check.pass), 'Source inspection diagnostic has failing checks; inspect result.json');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { manifest: { type: 'string' }, output: { type: 'string' },
    serve: { type: 'boolean' }, port: { type: 'string', default: '4198' } } });
  assert(values.manifest, 'Provide --manifest <review-manifest.json>');
  const manifestPath = resolve(repository, values.manifest);
  if (values.serve) {
    const service = await startReviewServer(manifestPath, Number(values.port));
    console.log(`Source inspection: ${service.url}`);
    process.once('SIGINT', async () => service.close());
    process.once('SIGTERM', async () => service.close());
  } else await capture({ manifestPath, output: resolve(repository, values.output ?? 'artifacts/realism-01/runs/source-review'),
    executable: process.env.EXPERIENCE_QA_CHROMIUM ?? '/usr/bin/chromium' });
}
