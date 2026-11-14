import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../../../', import.meta.url)));
const evidence = path.join(root, 'experience/evidence/realism-01/review-page');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const manifest = await json(path.join(evidence, 'manifest.json'));
for (const [base, records] of [[evidence, manifest.files], [root, manifest.producers]]) {
  for (const record of records) {
    const filename = path.resolve(base, record.path);
    assert(filename.startsWith(base + path.sep), `Invalid retained path: ${record.path}`);
    const data = await readFile(filename);
    assert.equal(data.length, record.bytes, `Size: ${record.path}`);
    assert.equal(sha(data), record.sha256, `Hash: ${record.path}`);
    if (base === evidence) {
      for (const key of ['source', 'recordDate', 'rights', 'location', 'method', 'limitations']) {
        assert(record[key], `Missing ${key}: ${record.path}`);
      }
    }
  }
}
const packageManifest = await json(path.join(evidence, 'package-manifest.json'));
const published = await json(path.join(evidence, 'published-bytes.json'));
assert.equal(published.baseURL, manifest.publicUrl);
assert.equal(published.failed, 0, 'Public HTTPS verification contains failures');
assert.equal(published.files.length, packageManifest.files.length + 1);
for (const expected of packageManifest.files) {
  const hosted = published.files.find(item => item.path === '/' + expected.path);
  assert(hosted?.pass, `Missing public file: ${expected.path}`);
  assert.equal(hosted.observed.sha256, expected.sha256, `Hosted hash: ${expected.path}`);
}
const packagedManifestBytes = await readFile(path.join(evidence, 'package-manifest.json'));
assert.equal(published.files.find(item => item.path === '/package-manifest.json')?.observed.sha256, sha(packagedManifestBytes));
const reports = [];
for (const record of manifest.files.filter(item => item.path.endsWith('/result.json'))) {
  const report = await json(path.join(evidence, record.path));
  const snapshot = manifest.files.find(item => item.path === path.join(path.dirname(record.path), 'executed-driver.mjs'));
  assert(snapshot, `Driver snapshot missing: ${record.path}`);
  assert.equal(snapshot.sha256, report.driver.sha256, `Driver identity: ${record.path}`);
  reports.push(report);
}
const successful = reports.filter(report => report.completed && report.checks.length && report.checks.every(check => check.pass));
const matchingPackage = report => packageManifest.files.every(file =>
  report.packageFiles.some(item => item.path === file.path && item.sha256 === file.sha256));
assert(successful.some(report => !report.target.startsWith('https:') && matchingPackage(report)
  && ['desktop', 'cancellation', 'paged-cancellation', 'recovery', 'phone'].every(section => report.environment.sections.includes(section))),
  'The final package requires a complete successful local walkthrough');
const hostedLoadsMatch = report => packageManifest.files
  .filter(file => file.path === 'index.html' || /\.(js|css)$/.test(file.path))
  .every(file => report.responses.some(response => response.sha256 === file.sha256
    && new URL(response.url).pathname.endsWith('/' + file.path)));
assert(successful.some(report => report.target === manifest.publicUrl && hostedLoadsMatch(report)
  && ['desktop', 'cancellation', 'paged-cancellation', 'phone'].every(section => report.environment.sections.includes(section))),
  'Actual public entry walkthrough is missing');
console.log(JSON.stringify({ files: manifest.files.length, producers: manifest.producers.length,
  attempts: reports.length, successfulAttempts: successful.length, publicFiles: published.files.length, verified: true }));
