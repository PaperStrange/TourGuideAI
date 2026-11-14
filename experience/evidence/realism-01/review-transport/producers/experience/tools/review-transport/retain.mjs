import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const { values } = parseArgs({ options: {
  package: { type: 'string' },
  published: { type: 'string' },
  measurement: { type: 'string', default: 'artifacts/realism-01/review-transport/compression-01/compression-report.json' },
  baseline: { type: 'string', default: 'artifacts/realism-01/review-transport/baseline' },
  qa: { type: 'string', default: 'artifacts/realism-01/review-transport/qa' },
  display: { type: 'string', default: 'artifacts/realism-01/review-transport/xvfb' },
  'window-manager': { type: 'string', default: 'artifacts/realism-01/review-transport/window-manager' },
  'publication-audit': { type: 'string', default: 'artifacts/realism-01/review-transport/publication2/audit.json' },
  'publication-producer': { type: 'string', default: 'artifacts/realism-01/review-transport/audit-publication.mjs' },
  'public-url': { type: 'string', default: 'https://paperstrange.github.io/TourGuideAI/previews/realism-01/' },
} });
assert(values.package && values.published, 'Provide --package and --published.');
const artifact = value => {
  const resolved = path.resolve(root, value);
  assert(resolved.startsWith(path.join(root, 'artifacts') + path.sep), 'Inputs must stay in ignored artifacts.');
  return resolved;
};
const packageDirectory = artifact(values.package);
const baseline = artifact(values.baseline);
const qa = artifact(values.qa);
const measurement = artifact(values.measurement);
const published = artifact(values.published);
const display = artifact(values.display);
const windowManager = artifact(values['window-manager']);
const publicationAudit = artifact(values['publication-audit']);
const publicationProducer = artifact(values['publication-producer']);
const output = path.join(root, 'experience/evidence/realism-01/review-transport');
const sha = data => createHash('sha256').update(data).digest('hex');
const json = async filename => JSON.parse(await readFile(filename, 'utf8'));
const createdAt = new Date().toISOString();
const files = [];
const qaEntries = await readdir(qa, { withFileTypes: true });
const interruptions = new Map();
for (const entry of qaEntries) {
  if (!entry.isFile() || !/(?:interruption|stop)[^/]*\.json$/.test(entry.name)) continue;
  const receipt = await json(path.join(qa, entry.name));
  if (!receipt.attemptReport) continue;
  const filename = artifact(receipt.attemptReport);
  assert(filename.startsWith(qa + path.sep), 'Interrupted attempt must belong to this QA directory.');
  assert.equal(receipt.runnerExited, true);
  assert.equal(receipt.originalReportChanged, false);
  assert(receipt.recordedAt && receipt.method && receipt.limitations);
  assert.equal(sha(await readFile(filename)), receipt.reportSha256);
  assert.equal((await json(filename)).driver.sha256, receipt.driverSha256);
  assert(!interruptions.has(filename), `Duplicate interruption receipt: ${filename}`);
  interruptions.set(filename, { path: entry.name, receipt });
}
const provenance = {
  source: 'TourGuideAI measured transport and architectural exploration; Knock Community Hall by scbenoit, https://superspl.at/scene/0ff2e6dc',
  recordDate: createdAt,
  rights: 'Project-generated records and application source. Captured architecture and screenshots: CC BY 4.0, scbenoit; adapted camera and UI.',
  location: 'Innisfil, Ontario, Canada; Chromium observations in the managed workspace',
  method: 'Actual package measurements, native browser actions and independent HTTPS byte observations; individual reports retain unfinished and failed attempts.',
  limitations: 'Architectural exploration. File identity and recorded transfer do not establish Kyoto coverage, pedestrian floors, physical-device performance or full-route acceptance.',
};

async function retain(source, destination, extra = {}) {
  const target = path.resolve(output, destination);
  assert(target.startsWith(output + path.sep), `Invalid retained path: ${destination}`);
  const bytes = await readFile(source);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target);
  const record = { ...provenance, path: destination, input: path.relative(root, source),
    bytes: bytes.length, sha256: sha(bytes), ...extra };
  files.push(record);
  return record;
}

async function retainRuns(directory) {
  if (directory === path.join(qa, 'native-visibility')) return;
  const entries = await readdir(directory, { withFileTypes: true });
  if (entries.some(entry => entry.name === 'result.json')) {
    const reportPath = path.join(directory, 'result.json');
    const report = await json(reportPath);
    const interruption = interruptions.get(reportPath);
    assert(report.finishedAt || interruption, `Browser attempt is still active: ${directory}`);
    for (const entry of entries) {
      assert(!entry.isSymbolicLink(), `Unexpected symlink in browser evidence: ${entry.name}`);
      if (entry.isFile()) {
        assert(/\.(json|mjs|js|png|jpg|txt|csv)$/.test(entry.name), `Review unexpected browser artifact: ${entry.name}`);
        await retain(path.join(directory, entry.name), path.join('runs', path.relative(qa, directory), entry.name),
          { recordDate: report.finishedAt ?? interruption.receipt.recordedAt,
            ...(!report.finishedAt && entry.name === 'result.json' ? { interruptionReceipt: interruption.path } : {}) });
      }
    }
  } else {
    for (const entry of entries) if (entry.isDirectory()) await retainRuns(path.join(directory, entry.name));
  }
}

await retainRuns(qa);
const nativeVisibility = path.join(qa, 'native-visibility');
for (const [reportName, producerName] of [['result.json', 'probe.mjs'], ['result-01-sandbox.json', 'probe-01.mjs']]) {
  const report = await json(path.join(nativeVisibility, reportName));
  assert(report.finishedAt, `Native visibility probe is still active: ${reportName}`);
  const producer = path.join(nativeVisibility, producerName);
  assert.equal(sha(await readFile(producer)), report.scriptSha256);
  const observed = { recordDate: report.finishedAt, method: report.method, limitations: report.limitations.join(' ') };
  await retain(path.join(nativeVisibility, reportName), `diagnostics/native-visibility/${reportName}`, observed);
  await retain(producer, `diagnostics/native-visibility/${producerName}`, observed);
}
for (const entry of qaEntries) {
  if (entry.isFile() && (/^trust.*\.json$/.test(entry.name) || /^visibility-(headful-)?probe[^/]*\.(mjs|json)$/.test(entry.name)
    || ['run-headful.mjs', 'run-headful-display-only.mjs', 'observe-native.mjs'].includes(entry.name)
    || /^run-isolated-public(?:-[a-z-]+)?\.sh$/.test(entry.name)
    || /^namespace-check(?:-[a-z-]+)?\.(mjs|json)$/.test(entry.name)
    || /^display-.*\.json$/.test(entry.name) || /(?:interruption|stop)[^/]*\.json$/.test(entry.name))) {
    await retain(path.join(qa, entry.name), entry.name);
  }
}
async function retainDisplayDependency(source, destination, additionalFiles = []) {
  const receipt = await json(path.join(source, 'acquisition.json'));
  const provenance = { source: receipt.sourceUrl, recordDate: receipt.acquiredAt,
    rights: `Debian ${receipt.package} package copyright and license notices retained at ${destination}/copyright.txt.`,
    location: 'Managed Linux workspace; native virtual display for browser visibility checks.',
    method: receipt.method, limitations: receipt.limitations.join(' ') };
  await retain(path.join(source, 'acquisition.json'), `${destination}/acquisition.json`, provenance);
  await retain(path.join(source, receipt.rightsFile), `${destination}/copyright.txt`, provenance);
  for (const filename of additionalFiles) await retain(path.join(source, filename), `${destination}/${filename}`, provenance);
}
await retainDisplayDependency(display, 'display');
await retainDisplayDependency(windowManager, 'window-manager', ['twmrc']);
const displaySourceDirectory = path.join(display, 'source');
const displaySource = await json(path.join(displaySourceDirectory, 'acquisition.json'));
const displaySourceProvenance = { recordDate: displaySource.acquiredAt,
  location: 'Debian Xorg source; task-local native display configuration in the managed workspace.',
  method: displaySource.method, limitations: displaySource.limitations.join(' '),
  source: displaySource.files.map(file => file.sourceUrl).join(' '),
  rights: 'Source-specific copyright retained in source headers and display/copyright.txt.' };
await retain(path.join(displaySourceDirectory, 'acquisition.json'), 'display/source/acquisition.json', displaySourceProvenance);
for (const expected of displaySource.files) {
  const bytes = await readFile(path.join(displaySourceDirectory, expected.path));
  assert.equal(bytes.length, expected.bytes);
  assert.equal(sha(bytes), expected.sha256);
  await retain(path.join(displaySourceDirectory, expected.path), `display/source/${expected.path}`,
    { ...displaySourceProvenance, source: expected.sourceUrl, rights: expected.rights });
}
async function retainCompression(filename, destination) {
  const report = await json(filename);
  assert(report.finishedAt, `Compression attempt is still active: ${filename}`);
  const producer = path.join(path.dirname(filename), 'executed-package.mjs');
  assert.equal(sha(await readFile(producer)), report.producer.sha256,
    'Compression requires its exact executed producer snapshot.');
  const observed = { recordDate: report.finishedAt, method: 'Native gzip compression, persisted-file decoding and source SHA-256 verification.',
    limitations: report.limitations };
  await retain(filename, `${destination}/report.json`, observed);
  await retain(producer, `${destination}/executed-package.mjs`, observed);
}
await retainCompression(measurement, 'compression');
const measurementParent = path.dirname(path.dirname(measurement));
for (const entry of await readdir(measurementParent, { withFileTypes: true })) {
  const filename = path.join(measurementParent, entry.name, 'compression-report.json');
  if (entry.isDirectory() && /^compression-\d+$/.test(entry.name) && filename !== measurement) {
    await retainCompression(filename, `compression/attempts/${entry.name}`);
  }
}
for (const name of ['package-manifest.json', 'review-assets.json']) {
  await retain(path.join(baseline, name), `baseline/${name}`);
  await retain(path.join(packageDirectory, name), `release/${name}`);
}
await retain(published, 'published-bytes.json');
const audit = await json(publicationAudit);
const publicationProvenance = { recordDate: audit.recordedAt,
  method: 'Verify prepared Git tree blobs against every final package file and confirm unchanged published paths outside the review preview.',
  limitations: 'Prepared publication tree observation. Independently observed actual HTTPS bytes remain required.' };
await retain(publicationAudit, 'release/publication-audit.json', publicationProvenance);
await retain(publicationProducer, 'release/audit-publication.mjs', publicationProvenance);
const packageManifest = await json(path.join(packageDirectory, 'package-manifest.json'));
assert.equal(packageManifest.transportEncoding, 'identity', 'The approved release uses native identity transport.');

// 发布记录保存生成时的源码字节，后续应用修改不影响历史证据。
const producerPaths = new Set(packageManifest.producers.map(item => item.path));
for (const name of ['experience/tests/browser-review-transport.mjs',
  'experience/tools/review-transport/retain.mjs', 'experience/tools/review-transport/verify.mjs',
  'experience/tools/verify-published.mjs']) producerPaths.add(name);
const producers = [];
for (const sourcePath of [...producerPaths].sort()) {
  const absolute = path.resolve(root, sourcePath);
  assert(absolute.startsWith(root + path.sep), `Invalid producer: ${sourcePath}`);
  const data = await readFile(absolute);
  const expected = packageManifest.producers.find(item => item.path === sourcePath);
  if (expected) {
    assert.equal(data.length, expected.bytes, `Producer changed after packaging: ${sourcePath}`);
    assert.equal(sha(data), expected.sha256, `Producer changed after packaging: ${sourcePath}`);
  }
  const record = await retain(absolute, `producers/${sourcePath}`, { sourcePath });
  producers.push({ sourcePath, path: record.path, bytes: record.bytes, sha256: record.sha256 });
}
files.sort((left, right) => left.path.localeCompare(right.path));
assert.equal(new Set(files.map(record => record.path)).size, files.length, 'Duplicate retained path.');
const manifest = {
  schemaVersion: 1, kind: 'native-transport-and-continuous-exploration', createdAt,
  publicUrl: values['public-url'], sourceSha256: packageManifest.sourceSha256,
  limits: { startupBytes: 4 * 1024 * 1024, ordinarySectionBytes: 2 * 1024 * 1024 },
  appearanceProtocol: {
    decision: 'D25', maxChannelError: 1, p95ChannelError: 0, alphaMismatches: 0,
    requirements: 'Unchanged source and rendering metadata; matching submitted camera, projection and drawn splat count; independently decoded PNG measurements and same-build repeatability observations.',
    exactPixels: 'Exploratory exact equality remains a separate diagnostic, including any failed result.',
    limitations: 'One quantization step on the 0–255 RGB scale qualifies this architectural regression only. Human realism, full-route acceptance and physical-device performance remain separate gates.',
  },
  coverageProtocol: {
    local: 'All functional sections, including complete bounded-tour endpoints with actual submitted frames.',
    public: 'Independent responsive UI, recovery, mouse/touch and tour controls including native hidden-tab pause; every hosted package byte independently verified over HTTPS.',
    publicEndpoints: 'Full endpoint sweep is covered by the byte-identical local package; no independent public endpoint sweep is claimed.',
  },
  transferProtocol: {
    encodedPrefix: 'The retained headerBytes field is CDP responseReceived.response.encodedDataLength: the initial encoded-response prefix, which can already include buffered body bytes.',
    boundary: 'Completed responses use loadingFinished.encodedDataLength. Unfinished responses use the observed initial prefix plus subsequent dataReceived encoded deltas up to the boundary.',
    limitations: 'Request headers, TLS/TCP overhead and unobserved resources are excluded. First visible rendering and settled rendering are separate observations.',
  },
  decision: 'Native source transport is published. Gzip remains a measured rejected experiment; decoded source identities are preserved.',
  verificationScope: 'Offline verification checks retained bytes, recorded decoded identities, actual request boundaries and PNG pixels. It does not repeat compression of absent raw sources or execute the browser.',
  files, producers,
};
await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ evidence: path.relative(root, output), files: files.length, producers: producers.length }));
