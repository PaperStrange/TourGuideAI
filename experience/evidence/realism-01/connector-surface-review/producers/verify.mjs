import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || resolve(dirname(fileURLToPath(import.meta.url)), '../../..'));
const evidence = resolve(root, 'experience/evidence/realism-01/connector-surface-review');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path));
const manifest = read(resolve(evidence, 'manifest.json'));
assert.equal(new Set(manifest.files.map(file => file.file)).size, manifest.files.length);
for (const file of manifest.files) {
  assert(!isAbsolute(file.file) && resolve(evidence, file.file).startsWith(evidence + sep));
  for (const key of ['source', 'date', 'rights', 'location', 'method', 'limitations']) assert(typeof file[key] === 'string' && file[key].trim().length);
  const bytes = readFileSync(resolve(evidence, file.file)); assert.equal(bytes.length, file.bytes, file.file); assert.equal(sha(bytes), file.sha256, file.file);
}
const packageDirectory = resolve(evidence, 'package'), packageBytes = readFileSync(resolve(packageDirectory, 'package-manifest.json'));
assert.equal(sha(packageBytes), manifest.packageManifestSha256);
const packageManifest = JSON.parse(packageBytes);
assert.equal(packageManifest.id, 'realism-01-kyoto-surface-review');
assert.equal(new Set(packageManifest.files.map(file => file.path)).size, packageManifest.files.length);
for (const file of packageManifest.files) {
  assert(!isAbsolute(file.path) && resolve(packageDirectory, file.path).startsWith(packageDirectory + sep));
  const bytes = readFileSync(resolve(packageDirectory, file.path)); assert.equal(bytes.length, file.bytes, file.path); assert.equal(sha(bytes), file.sha256, file.path);
}
for (const binding of packageManifest.sourceBindings) {
  assert(!isAbsolute(binding.path) && resolve(root, binding.path).startsWith(root + sep));
  assert.equal(sha(readFileSync(resolve(root, binding.path))), binding.sha256, binding.path);
}
assert.equal(sha(readFileSync(resolve(evidence, 'producers/package.mjs'))), packageManifest.producer.sha256);
for (const name of ['index.html', 'surface-app.js', 'surface-style.css']) assert.equal(sha(readFileSync(resolve(evidence, 'producers', name))), packageManifest.files.find(file => file.path === name).sha256);
const data = read(resolve(packageDirectory, 'surface-data.json'));
assert.equal(data.schemaVersion, 1); assert.equal(data.routeQualified, false); assert.equal(data.appearanceQualified, false);
assert.deepEqual(data.views.map(view => view.rank), [68, 69, 70, 71]); assert.deepEqual(data.heldout.map(view => view.rank), [67, 72]);
assert.equal(data.model.triangles, 66755); assert.equal(data.model.format, 'gltf');
assert.equal(data.model.bytes, [data.model.gltf, ...data.model.textures].reduce((sum, name) => sum + packageManifest.files.find(file => file.path === name).bytes, 0));
for (const view of data.views) {
  assert.equal(sha(readFileSync(resolve(packageDirectory, view.referenceImage))), view.imageSha256);
  assert.equal(sha(readFileSync(resolve(packageDirectory, view.maskPath))), view.maskSha256);
  assert(view.projectionReferences.length > 5 && view.near > 0 && view.far > view.near);
}
const historical = read(resolve(packageDirectory, 'history/package-20261115.json'));
for (const previous of historical.files) {
  const name = previous.path === 'index.html' ? 'index-20261115.html' : previous.path;
  const current = packageManifest.files.find(file => file.path === name);
  assert(current); assert.equal(current.bytes, previous.bytes); assert.equal(current.sha256, previous.sha256);
}
for (const qa of manifest.qa) {
  const report = read(resolve(evidence, qa.file));
  assert.equal(report.completed, true); assert.equal(report.checks.length, qa.checks); assert(report.checks.length > 0 && report.checks.every(check => check.pass));
  assert.equal(report.driver.sha256, sha(readFileSync(resolve(evidence, qa.driver))));
  assert.equal(report.package.manifestSha256, manifest.packageManifestSha256);
  assert.deepEqual(report.package.verifiedFiles, packageManifest.files); assert.deepEqual(report.views.map(view => view.viewport.width), [1280, 375]);
  assert.equal(report.pageErrors.length, 0); assert.equal(report.httpErrors.length, 0);
  for (const view of report.views) {
    assert(view.layout.document <= view.viewport.width && view.layout.body <= view.viewport.width);
    assert.equal(view.ready.meshTriangles, data.model.triangles); assert(view.pixels.foreground > 100);
    assert.equal(view.ready.allocations.physicalAllocationKnown, false);
    assert(view.ready.allocations.textures.every(texture => texture.width === 4096 && texture.height === 4096 && texture.generateMipmaps));
  }
  for (const screenshot of report.screenshots) {
    const path = resolve(dirname(resolve(evidence, qa.file)), screenshot.path);
    const bytes = readFileSync(path); assert.equal(bytes.length, screenshot.bytes); assert.equal(sha(bytes), screenshot.sha256);
  }
}
for (const record of manifest.files.filter(file => file.file.startsWith('receipts/') && file.file.endsWith('-source-commit.json'))) {
  const receipt = read(resolve(evidence, record.file)); assert.equal(receipt.completed, true);
  assert.equal(receipt.packageManifestSha256, manifest.packageManifestSha256); assert.equal(receipt.packageImplementationBase, packageManifest.implementationBase);
  assert.deepEqual(receipt.files, packageManifest.files.map(({ path, source, bytes, sha256 }) => ({ path, source, bytes, sha256 })));
  assert.deepEqual(receipt.sourceBindings, packageManifest.sourceBindings); assert.deepEqual(receipt.producer, packageManifest.producer);
  assert.equal(receipt.verifier.sha256, sha(readFileSync(resolve(evidence, 'producers/verify-source.mjs'))));
}
console.log(JSON.stringify({ verifiedFiles: manifest.files.length, packageFiles: packageManifest.files.length,
  browserReports: manifest.qa.length, browserChecks: manifest.qa.reduce((sum, qa) => sum + qa.checks, 0), routeQualified: false }));
