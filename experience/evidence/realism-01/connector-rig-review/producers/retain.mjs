import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../..');
const output = resolve(root, 'experience/evidence/realism-01/connector-rig-review');
const { values } = parseArgs({ options: {
  package: { type: 'string' }, qa: { type: 'string', multiple: true }, receipt: { type: 'string', multiple: true },
} });
assert(values.package && values.qa?.length, 'Supply --package and at least one --qa result.json');
const packageDirectory = resolve(values.package);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [];
const retain = (source, name, method) => {
  const data = readFileSync(source);
  const destination = resolve(output, name);
  assert(destination.startsWith(output + sep));
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, data);
  files.push({ file: name, bytes: data.length, sha256: sha(data), source: relative(root, source),
    date: new Date().toISOString(),
    rights: 'Project research; source photographs and derived geometry retain CC BY-SA 4.0 attribution to Irvin Chen / Panoramax Taiwan',
    location: 'Shijō–Karasuma research board; browser execution in cloud Chromium', method,
    limitations: 'Research publication. Complete-route, photoreal-scene, physical-device and participant acceptance remain open.' });
};
const packageManifestBytes = readFileSync(resolve(packageDirectory, 'package-manifest.json'));
const packageManifest = JSON.parse(packageManifestBytes);
assert.equal(packageManifest.id, 'realism-01-kyoto-connector-rig-review');
for (const file of packageManifest.files) {
  const source = resolve(packageDirectory, file.path);
  assert(source.startsWith(packageDirectory + sep));
  const data = readFileSync(source);
  assert.equal(data.length, file.bytes); assert.equal(sha(data), file.sha256);
  retain(source, 'package/' + file.path, 'Exact content bytes of the locally tested static package');
}
retain(resolve(packageDirectory, 'package-manifest.json'), 'package/package-manifest.json', 'Exact package identity and source provenance');
const qa = [];
for (const [index, sourceName] of values.qa.entries()) {
  const source = resolve(sourceName);
  const report = JSON.parse(readFileSync(source));
  assert.equal(report.completed, true);
  assert(report.checks.length > 0 && report.checks.every(check => check.pass));
  assert.equal(report.package.manifestSha256, sha(packageManifestBytes));
  const driver = resolve(dirname(source), 'executed-driver.mjs');
  assert.equal(sha(readFileSync(driver)), report.driver.sha256);
  const name = `qa/${index + 1}-${report.target.startsWith('https://') ? 'public' : 'local'}`;
  retain(source, name + '/result.json', 'Unchanged actual browser report');
  retain(driver, name + '/executed-driver.mjs', 'Exact executed browser producer');
  qa.push({ file: name + '/result.json', driver: name + '/executed-driver.mjs', checks: report.checks.length,
    target: report.target, passed: true });
}
for (const [index, source] of (values.receipt || []).entries()) {
  retain(resolve(source), `receipts/${index + 1}-${basename(source)}`, 'Unchanged setup, publication or served-byte receipt');
}
for (const name of ['package.mjs', 'check.mjs', 'retain.mjs', 'verify.mjs', 'verify-source.mjs', 'index.html', 'board.js', 'styles.css', 'README.md']) {
  retain(resolve(directory, name), 'producers/' + name, 'Exact publication/reproduction producer');
}
assert.equal(new Set(files.map(file => file.file)).size, files.length);
const manifest = { schemaVersion: 1, date: new Date().toISOString(),
  packageManifestSha256: sha(packageManifestBytes), qa, files,
  scope: 'Source-coverage and camera-rig research comparison; full-route acceptance remains open' };
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ output: relative(root, output), files: files.length,
  packageFiles: packageManifest.files.length, reports: qa.length }));
