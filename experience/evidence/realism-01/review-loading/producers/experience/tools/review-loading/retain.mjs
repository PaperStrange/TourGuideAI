import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const { values } = parseArgs({ options: {
  package: { type: 'string' }, baseline: { type: 'string' }, published: { type: 'string' },
  qa: { type: 'string', default: 'artifacts/realism-01/review-loading/qa' },
  'regression-qa': { type: 'string' }, receipt: { type: 'string', multiple: true, default: [] },
  'trial-package': { type: 'string', multiple: true, default: [] },
  'public-url': { type: 'string', default: 'https://paperstrange.github.io/TourGuideAI/previews/realism-01/' },
} });
assert(values.package && values.baseline && values.published, 'Provide --package, --baseline and --published.');
const artifact = value => {
  const absolute = path.resolve(root, value);
  assert(absolute.startsWith(path.join(root, 'artifacts') + path.sep), `Input outside ignored artifacts: ${value}`);
  return absolute;
};
const output = path.join(root, 'experience/evidence/realism-01/review-loading');
const sha = data => createHash('sha256').update(data).digest('hex');
const json = async filename => JSON.parse(await readFile(filename, 'utf8'));
const createdAt = new Date().toISOString();
const files = [];
const attempts = [];
const interruptions = new Map();
for (const filename of values.receipt) {
  const input = artifact(filename);
  if (!input.endsWith('.json')) continue;
  const receipt = await json(input);
  if (!receipt.attemptReport) continue;
  const reportPath = artifact(receipt.attemptReport);
  assert.equal(receipt.runnerExited, true);
  assert.equal(receipt.originalReportChanged, false);
  assert(receipt.recordedAt && receipt.method && receipt.limitations);
  assert.equal(sha(await readFile(reportPath)), receipt.reportSha256);
  assert.equal((await json(reportPath)).driver.sha256, receipt.driverSha256);
  assert(!interruptions.has(reportPath), `Duplicate interruption receipt: ${reportPath}`);
  interruptions.set(reportPath, { path: `receipts/${path.basename(input)}`, receipt });
}
const provenance = {
  source: 'TourGuideAI actual browser measurements; Knock Community Hall by scbenoit, https://superspl.at/scene/0ff2e6dc',
  recordDate: createdAt,
  rights: 'Project-generated records and source. Capture images: CC BY 4.0, scbenoit; adapted camera and interface.',
  location: 'Innisfil, Ontario, Canada; managed Chromium software-rendering environment.',
  method: 'Actual source requests, native browser input, submitted-frame observations and independent HTTPS byte checks.',
  limitations: 'Architectural inspection. Software measurements leave physical-device performance, complete Kyoto coverage and human acceptance unverified.',
};

async function retain(source, destination, extra = {}) {
  const target = path.resolve(output, destination);
  assert(target.startsWith(output + path.sep), `Invalid retained path: ${destination}`);
  assert(!files.some(record => record.path === destination), `Duplicate retained path: ${destination}`);
  const bytes = await readFile(source);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target);
  const record = { ...provenance, path: destination, input: path.relative(root, source),
    bytes: bytes.length, sha256: sha(bytes), ...extra };
  files.push(record);
  return record;
}

async function packageIdentity(directory, label) {
  const manifestBytes = await readFile(path.join(directory, 'package-manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  assert.equal(new Set(manifest.files.map(file => file.path)).size, manifest.files.length);
  for (const expected of manifest.files) {
    const filename = path.resolve(directory, expected.path);
    assert(filename.startsWith(directory + path.sep), `Invalid packaged path: ${expected.path}`);
    const bytes = await readFile(filename);
    assert.equal(bytes.length, expected.bytes, `${label} size: ${expected.path}`);
    assert.equal(sha(bytes), expected.sha256, `${label} hash: ${expected.path}`);
  }
  for (const name of ['package-manifest.json', 'review-assets.json', 'index.html']) {
    await retain(path.join(directory, name), `${label}/${name}`);
  }
  return { manifest, path: path.relative(root, directory), sha256: sha(manifestBytes),
    verifiedFiles: manifest.files.length, verifiedAt: createdAt };
}

const baseline = await packageIdentity(artifact(values.baseline), 'baseline');
const candidate = await packageIdentity(artifact(values.package), 'candidate');
const trials = [];
for (const value of values['trial-package']) {
  const directory = artifact(value);
  const label = `trials/${path.basename(directory)}`;
  trials.push({ label, ...await packageIdentity(directory, label) });
}
const sourceFiles = baseline.manifest.files.filter(file => file.path.startsWith('data/'));
assert.equal(sourceFiles.length, 41);
for (const expected of sourceFiles) {
  const observed = candidate.manifest.files.find(file => file.path === expected.path);
  assert(observed, `Missing source: ${expected.path}`);
  assert.equal(observed.bytes, expected.bytes);
  assert.equal(observed.sha256, expected.sha256);
}

async function retainAttempts(directory, base, label) {
  const entries = await readdir(directory, { withFileTypes: true });
  assert(entries.every(entry => !entry.isSymbolicLink()), `Unexpected QA symlink: ${directory}`);
  if (entries.some(entry => entry.name === 'result.json')) {
    const reportPath = path.join(directory, 'result.json');
    const report = await json(reportPath);
    const interruption = interruptions.get(reportPath);
    assert(report.finishedAt || interruption, `Attempt is still active: ${directory}`);
    const folder = path.join('runs', label, path.relative(base, directory));
    const driver = await readFile(path.join(directory, 'executed-driver.mjs'));
    assert.equal(sha(driver), report.driver.sha256, `Executed driver: ${directory}`);
    const captures = [...(report.captures ?? []), ...(report.screenshots ?? [])];
    const selected = new Set(['result.json', 'executed-driver.mjs', ...captures.map(item => item.path)]);
    for (const filename of selected) {
      const source = path.resolve(directory, filename);
      assert(source.startsWith(directory + path.sep), `Invalid browser artifact: ${filename}`);
      assert(/\.(json|mjs|png|jpg)$/.test(filename), `Unexpected browser artifact: ${filename}`);
      const record = await retain(source, path.join(folder, filename), {
        recordDate: report.finishedAt ?? interruption.receipt.recordedAt });
      const capture = captures.find(item => item.path === filename);
      if (capture) {
        assert.equal(record.bytes, capture.bytes);
        assert.equal(record.sha256, capture.sha256);
      }
    }
    attempts.push({ path: `${folder}/result.json`, input: path.relative(root, path.join(directory, 'result.json')),
      completed: report.completed, finishedAt: report.finishedAt ?? null, driverSha256: report.driver.sha256,
      ...(!report.finishedAt ? { interruptionReceipt: interruption.path } : {}) });
    return;
  }
  for (const entry of entries) if (entry.isDirectory()) {
    await retainAttempts(path.join(directory, entry.name), base, label);
  }
}
const qa = artifact(values.qa);
await retainAttempts(qa, qa, 'loading');
if (values['regression-qa']) {
  const regression = artifact(values['regression-qa']);
  await retainAttempts(regression, regression, 'regression');
}
assert(attempts.length > 0, 'No ended browser attempts found.');
for (const filename of values.receipt) {
  const input = artifact(filename);
  const name = path.basename(input);
  let metadata = {};
  if (name === 'pages-build.json') {
    const receipt = await json(input);
    metadata = { source: 'https://api.github.com/repos/PaperStrange/TourGuideAI/pages/builds/latest',
      recordDate: receipt.updated_at, rights: 'Public GitHub Pages build metadata.',
      location: 'GitHub Pages repository PaperStrange/TourGuideAI',
      method: 'Retained commit, status and update time from the provider build-status observation.',
      limitations: 'Provider status metadata; actual served-file identities are independently verified.' };
  }
  if (name === 'canonical-index.html') metadata = { source: values['public-url'],
    rights: 'TourGuideAI generated public HTML.', location: 'Canonical public GitHub Pages review entry.',
    method: 'Actual canonical HTTPS response bytes, compared with the packaged index SHA-256.',
    limitations: 'Entry bytes only; source assets and browser behavior have separate evidence.' };
  await retain(input, `receipts/${name}`, metadata);
}
await retain(artifact(values.published), 'published-bytes.json');

// 保存实际发布源码，历史证据不随工作区的后续修改变化。
const producerPaths = new Set(candidate.manifest.producers.map(item => item.path));
for (const filename of ['experience/tests/browser-review-loading.mjs',
  'experience/tools/review-loading/retain.mjs', 'experience/tools/review-loading/verify.mjs',
  'experience/tools/review-loading/compare-images.py', 'experience/tools/review-loading/compare-entry.py',
  'experience/tools/verify-published.mjs']) producerPaths.add(filename);
const producers = [];
for (const sourcePath of [...producerPaths].sort()) {
  const source = path.resolve(root, sourcePath);
  assert(source.startsWith(root + path.sep), `Invalid producer path: ${sourcePath}`);
  const expected = candidate.manifest.producers.find(item => item.path === sourcePath);
  const bytes = await readFile(source);
  if (expected) {
    assert.equal(bytes.length, expected.bytes, `Producer size changed: ${sourcePath}`);
    assert.equal(sha(bytes), expected.sha256, `Producer changed after packaging: ${sourcePath}`);
  }
  const record = await retain(source, `producers/${sourcePath}`, { sourcePath });
  producers.push({ path: record.path, sourcePath, bytes: record.bytes, sha256: record.sha256 });
}
const manifest = {
  schemaVersion: 1, kind: 'responsive-architectural-loading', createdAt, publicUrl: values['public-url'], workspaceRoot: root,
  packageIdentities: { baseline: { ...baseline, manifest: undefined }, candidate: { ...candidate, manifest: undefined } },
  trialPackages: trials.map(({ manifest, ...identity }) => identity),
  sourceSha256: candidate.manifest.sourceSha256,
  appearanceProtocol: { decision: 'D25', maxChannelError: 1, p95ChannelError: 0, alphaMismatches: 0 },
  limits: { startupBytes: 4 * 1024 * 1024, ordinarySectionBytes: 2 * 1024 * 1024 },
  verificationScope: 'Offline source/evidence identities, independently decoded PNGs, recorded transfer boundaries and camera responses. Browser execution and physical-device acceptance remain separate.',
  files: files.sort((left, right) => left.path.localeCompare(right.path)), producers, attempts,
};
await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ output: path.relative(root, output), files: files.length,
  producers: producers.length, attempts: attempts.length }));
