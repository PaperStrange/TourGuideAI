import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] || resolve(dirname(fileURLToPath(import.meta.url)), '../../..'));
const evidence = resolve(root, 'experience/evidence/realism-01/free-connector-board');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(readFileSync(resolve(evidence, 'manifest.json')));
assert.equal(new Set(manifest.files.map(file => file.file)).size, manifest.files.length);
for (const file of manifest.files) {
  assert(!isAbsolute(file.file) && resolve(evidence, file.file).startsWith(evidence + sep), file.file);
  assert(Number.isInteger(file.bytes) && file.bytes >= 0);
  assert.match(file.sha256, /^[a-f0-9]{64}$/);
  for (const key of ['source', 'date', 'rights', 'location', 'method', 'limitations']) assert(typeof file[key] === 'string' && file[key].trim().length > 0, `${file.file}: ${key}`);
  const bytes = readFileSync(resolve(evidence, file.file));
  assert.equal(bytes.length, file.bytes, file.file); assert.equal(sha(bytes), file.sha256, file.file);
}
const packageManifestBytes = readFileSync(resolve(evidence, 'package/package-manifest.json'));
assert.equal(sha(packageManifestBytes), manifest.packageManifestSha256);
const packageManifest = JSON.parse(packageManifestBytes);
assert.equal(packageManifest.files.length, 44);
assert.equal(new Set(packageManifest.files.map(file => file.path)).size, packageManifest.files.length);
for (const file of packageManifest.files) {
  const directory = resolve(evidence, 'package');
  assert(!isAbsolute(file.path) && resolve(directory, file.path).startsWith(directory + sep));
  const bytes = readFileSync(resolve(evidence, 'package', file.path));
  assert.equal(bytes.length, file.bytes, file.path); assert.equal(sha(bytes), file.sha256, file.path);
}
const sourceManifestBytes = readFileSync(resolve(evidence, 'package/manifest.json'));
assert.equal(sha(sourceManifestBytes), packageManifest.sourceEvidenceManifestSha256);
const sourceManifest = JSON.parse(sourceManifestBytes);
assert.equal(sourceManifest.files.length, 35);
for (const file of sourceManifest.files) assert.equal(sha(readFileSync(resolve(evidence, 'package', file.file))), file.sha256);
assert.equal(sha(readFileSync(resolve(evidence, 'package/research.py'))), sourceManifest.producer.sha256);
assert.equal(sha(readFileSync(resolve(evidence, 'producers/package.mjs'))), packageManifest.producer.sha256);
assert.equal(sha(readFileSync(resolve(evidence, 'producers/index.html'))), packageManifest.files.find(file => file.path === 'index.html').sha256);
for (const record of packageManifest.geometryEvidenceManifests) {
  const bytes = readFileSync(resolve(evidence, `geometry/${record.method}-manifest.json`));
  assert.equal(sha(bytes), record.sha256);
  const trialManifest = JSON.parse(bytes);
  for (const [sourceName, packageName] of [['geometry-board.png', `${record.method}-board.png`], ['result.json', `${record.method}-result.json`]]) {
    const item = trialManifest.files.find(file => file.path === sourceName || file.file === sourceName);
    assert.equal(sha(readFileSync(resolve(evidence, 'package/geometry', packageName))), item.sha256);
  }
  const result = JSON.parse(readFileSync(resolve(evidence, 'package/geometry', `${record.method}-result.json`)));
  assert.equal(result.completed, true);
  assert(result.directions.every(direction => direction.models.length === 0));
  const pairs = result.directions.flatMap(direction => direction.pairs);
  if (record.method === 'perspective') {
    assert.equal(pairs.length, 12);
    const inliers = pairs.filter(pair => pair.verifiedInliers > 0).map(pair => pair.verifiedInliers);
    assert.equal(inliers.length, 5); assert.equal(Math.min(...inliers), 34); assert.equal(Math.max(...inliers), 201);
    assert.equal(pairs.filter(pair => pair.configuration === 'TwoViewGeometryConfiguration.CALIBRATED').length, 1);
  } else {
    assert.equal(record.method, 'spherical');
    assert.deepEqual(pairs.map(pair => pair.verifiedInliers).sort((a, b) => a - b), [83, 224, 308]);
    assert(pairs.every(pair => pair.configuration === 'TwoViewGeometryConfiguration.CALIBRATED'));
  }
}
const sourceBindingFile = manifest.files.find(file => file.file.endsWith('-source-commit.json'));
assert(sourceBindingFile, 'Exact source commit receipt is required');
const sourceBinding = JSON.parse(readFileSync(resolve(evidence, sourceBindingFile.file)));
assert.equal(sourceBinding.kind, 'package-source-commit-binding');
assert.equal(sourceBinding.completed, true);
assert.equal(sourceBinding.packageManifestSha256, manifest.packageManifestSha256);
assert.equal(sourceBinding.packageImplementationBase, packageManifest.implementationBase);
assert.match(sourceBinding.sourceCommit, /^[a-f0-9]{40}$/);
assert.equal(sourceBinding.files.length, packageManifest.files.length);
for (const file of sourceBinding.files) {
  const expected = packageManifest.files.find(expected => expected.path === file.path);
  assert.equal(file.sha256, expected.sha256); assert.equal(file.bytes, expected.bytes); assert.equal(file.source, expected.source);
}
assert.equal(sourceBinding.verifier.sha256, sha(readFileSync(resolve(evidence, 'producers/verify-source.mjs'))));
const receipt = suffix => {
  const file = manifest.files.find(file => file.file.endsWith('-' + suffix));
  assert(file, `Required publication receipt: ${suffix}`);
  return JSON.parse(readFileSync(resolve(evidence, file.file)));
};
const publication = receipt('audit.json');
assert.equal(publication.packageManifestSha256, manifest.packageManifestSha256);
assert.equal(publication.verifiedFiles, 45);
assert.equal(publication.otherPublishedPathsUnchanged, true);
const publicationProducer = manifest.files.find(file => file.file.endsWith('-prepare-publication.mjs'));
assert(publicationProducer);
assert.equal(sha(readFileSync(resolve(evidence, publicationProducer.file))), publication.producerSha256);
const build = receipt('pages-build.json');
assert.equal(build.status, 'built'); assert.equal(build.error.message, null); assert.match(build.commit, /^[a-f0-9]{40}$/);
const publishedCommit = receipt('published-commit.json');
assert.equal(publishedCommit.kind, 'published-commit-tree-binding');
assert.equal(publishedCommit.commit, build.commit);
assert.equal(publishedCommit.tree, publication.tree);
assert.equal(publishedCommit.parent, publication.parent);
assert.equal(publishedCommit.producer.sha256, sha(readFileSync(resolve(evidence, 'producers/verify-publication.mjs'))));
const published = receipt('published-bytes.json');
assert.equal(published.files.length, 45); assert.equal(published.passed, 45); assert.equal(published.failed, 0);
const expectedPublic = [...packageManifest.files.map(file => ({ path: '/' + file.path, bytes: file.bytes, sha256: file.sha256 })),
  { path: '/package-manifest.json', bytes: packageManifestBytes.length, sha256: sha(packageManifestBytes) }].sort((a, b) => a.path.localeCompare(b.path));
assert.equal(published.manifestSha256, sha(JSON.stringify(expectedPublic)));
for (const file of published.files) {
  const expected = expectedPublic.find(expected => expected.path === file.path);
  assert(expected && file.pass); assert.deepEqual(file.observed, { bytes: expected.bytes, sha256: expected.sha256 });
  assert.equal(file.bytes, expected.bytes); assert.equal(file.sha256, expected.sha256);
}
for (const qa of manifest.qa) {
  const report = JSON.parse(readFileSync(resolve(evidence, qa.file)));
  if (qa.target.startsWith('https://')) assert.equal(qa.target, published.baseURL);
  assert.equal(report.completed, true); assert.equal(report.checks.length, 25);
  assert(report.checks.every(check => check.pass));
  assert.equal(report.driver.sha256, sha(readFileSync(resolve(evidence, qa.driver))));
  assert.equal(report.package.manifestSha256, manifest.packageManifestSha256);
  assert.deepEqual(report.package.verifiedFiles, packageManifest.files);
  assert.equal(report.viewports.length, 4);
  for (const view of report.viewports) {
    assert([1280, 375].includes(view.viewport.width));
    assert(view.scrollWidth <= view.viewport.width && view.bodyScrollWidth <= view.viewport.width);
    assert.equal(view.images.length, view.entry === 'index.html' ? 6 : 4);
    assert(view.images.every(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0));
    assert.equal(view.captions.filter(text => text.includes('Irvin Chen / Panoramax Taiwan') && text.includes('CC BY-SA 4.0')).length, 3);
    if (view.entry === 'index.html') assert(view.geometryResults.includes('5 of 12') && view.geometryResults.includes('83, 224 and 308'));
  }
  assert.equal(report.pageErrors.length, 0); assert.equal(report.httpErrors.length, 0);
  const entry = report.checks.find(check => check.id === 'canonical-entry');
  assert.equal(entry.details.indexSha256, packageManifest.files.find(file => file.path === 'index.html').sha256);
}
console.log(JSON.stringify({ verifiedFiles: manifest.files.length, packageFiles: packageManifest.files.length,
  browserReports: manifest.qa.length, browserChecks: manifest.qa.length * 25,
  sourceRecords: sourceManifest.files.length, sourceCommit: sourceBinding.sourceCommit, routeQualified: false }));
