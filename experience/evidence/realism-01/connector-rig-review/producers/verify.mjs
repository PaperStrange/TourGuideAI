import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || resolve(dirname(fileURLToPath(import.meta.url)), '../../..'));
const evidence = resolve(root, 'experience/evidence/realism-01/connector-rig-review');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(resolve(evidence, 'manifest.json')));
assert.equal(new Set(manifest.files.map(file => file.file)).size, manifest.files.length);
for (const file of manifest.files) {
  assert(!isAbsolute(file.file) && resolve(evidence, file.file).startsWith(evidence + sep), file.file);
  assert(Number.isInteger(file.bytes) && file.bytes >= 0);
  assert.match(file.sha256, /^[a-f0-9]{64}$/);
  for (const key of ['source', 'date', 'rights', 'location', 'method', 'limitations']) {
    assert(typeof file[key] === 'string' && file[key].trim().length > 0, `${file.file}: ${key}`);
  }
  const bytes = readFileSync(resolve(evidence, file.file));
  assert.equal(bytes.length, file.bytes, file.file); assert.equal(sha(bytes), file.sha256, file.file);
}
const packageDirectory = resolve(evidence, 'package');
const packageManifestBytes = readFileSync(resolve(packageDirectory, 'package-manifest.json'));
assert.equal(sha(packageManifestBytes), manifest.packageManifestSha256);
const packageManifest = JSON.parse(packageManifestBytes);
assert.equal(packageManifest.id, 'realism-01-kyoto-connector-rig-review');
assert.equal(new Set(packageManifest.files.map(file => file.path)).size, packageManifest.files.length);
for (const file of packageManifest.files) {
  assert(!isAbsolute(file.path) && resolve(packageDirectory, file.path).startsWith(packageDirectory + sep));
  const bytes = readFileSync(resolve(packageDirectory, file.path));
  assert.equal(bytes.length, file.bytes, file.path); assert.equal(sha(bytes), file.sha256, file.path);
}
for (const binding of packageManifest.sourceBindings) {
  assert(!isAbsolute(binding.path) && resolve(root, binding.path).startsWith(root + sep));
  assert.equal(sha(readFileSync(resolve(root, binding.path))), binding.sha256, binding.path);
}
assert.equal(sha(readFileSync(resolve(evidence, 'producers/package.mjs'))), packageManifest.producer.sha256);
for (const name of ['index.html', 'board.js', 'styles.css']) {
  assert.equal(sha(readFileSync(resolve(evidence, 'producers', name))), packageManifest.files.find(file => file.path === name).sha256);
}
const data = JSON.parse(readFileSync(resolve(packageDirectory, 'review-data.json')));
assert.equal(data.schemaVersion, 1);
assert.equal(data.photographs.length, 3);
assert(data.methods.length >= 3);
const historical = JSON.parse(readFileSync(resolve(packageDirectory, 'history/package-20261114.json')));
for (const prior of historical.files.filter(file => file.path !== 'index.html')) {
  const current = packageManifest.files.find(file => file.path === prior.path);
  assert(current, prior.path); assert.equal(current.bytes, prior.bytes); assert.equal(current.sha256, prior.sha256);
}
for (const qa of manifest.qa) {
  const report = JSON.parse(readFileSync(resolve(evidence, qa.file)));
  assert.equal(report.completed, true); assert.equal(report.checks.length, qa.checks);
  assert(report.checks.length > 0 && report.checks.every(check => check.pass));
  assert.equal(report.driver.sha256, sha(readFileSync(resolve(evidence, qa.driver))));
  assert.equal(report.package.manifestSha256, manifest.packageManifestSha256);
  assert.deepEqual(report.package.verifiedFiles, packageManifest.files);
  assert.deepEqual(report.viewports.map(view => view.viewport.width), [1280, 375]);
  for (const view of report.viewports) {
    assert(view.scrollWidth <= view.viewport.width && view.bodyScrollWidth <= view.viewport.width);
    assert(view.images.every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0));
    assert.equal(view.methods.length, data.methods.length);
    assert.equal(view.sourcePhotographs.length, data.photographs.length);
  }
  assert.equal(report.pageErrors.length, 0); assert.equal(report.httpErrors.length, 0);
  assert.equal(report.checks.find(check => check.id === 'canonical-entry').details.indexSha256,
    packageManifest.files.find(file => file.path === 'index.html').sha256);
}
console.log(JSON.stringify({ verifiedFiles: manifest.files.length, packageFiles: packageManifest.files.length,
  browserReports: manifest.qa.length, browserChecks: manifest.qa.reduce((sum, qa) => sum + qa.checks, 0), routeQualified: false }));
