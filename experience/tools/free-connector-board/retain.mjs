import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const output = resolve(root, 'experience/evidence/realism-01/free-connector-board');
const args = process.argv.slice(2);
let packageDirectory;
const reports = [], receipts = [];
for (let index = 0; index < args.length; index += 2) {
  const option = args[index], value = args[index + 1];
  assert(value, `Missing value for ${option}`);
  if (option === '--package') packageDirectory = resolve(value);
  else if (option === '--qa') reports.push(resolve(value));
  else if (option === '--receipt') receipts.push(resolve(value));
  else throw new Error(`Unknown option ${option}`);
}
assert(packageDirectory && reports.length > 0, 'Supply --package and at least one --qa result.json');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [];
const retain = (source, name, method, rights = 'Project research; source photographs and derived geometry charts retain CC BY-SA 4.0 attribution to Irvin Chen / Panoramax Taiwan') => {
  const data = readFileSync(source);
  const destination = resolve(output, name);
  assert(destination.startsWith(output + sep));
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, data);
  files.push({ file: name, bytes: data.length, sha256: sha(data), source: relative(root, source),
    date: new Date().toISOString(), rights, location: 'Shijō–Karasuma research board; browser execution in cloud Chromium',
    method, limitations: 'Static evidence publication. No complete-route, physical-device or participant qualification.' });
};
const packageManifestBytes = readFileSync(resolve(packageDirectory, 'package-manifest.json'));
const packageManifest = JSON.parse(packageManifestBytes);
assert.equal(packageManifest.files.length, 44);
for (const file of packageManifest.files) {
  const source = resolve(packageDirectory, file.path);
  assert(source.startsWith(packageDirectory + sep));
  const data = readFileSync(source);
  assert.equal(data.length, file.bytes); assert.equal(sha(data), file.sha256);
  retain(source, 'package/' + file.path, 'Exact content bytes from the locally tested static package');
}
retain(resolve(packageDirectory, 'package-manifest.json'), 'package/package-manifest.json', 'Exact package identity and source provenance');
for (const record of packageManifest.geometryEvidenceManifests) {
  const source = resolve(root, 'experience/evidence/realism-01/connector-reconstruction', record.method, 'manifest.json');
  assert.equal(sha(readFileSync(source)), record.sha256);
  retain(source, `geometry/${record.method}-manifest.json`, 'Exact prior geometry trial evidence identity');
}
const qa = [];
for (const [index, source] of reports.entries()) {
  const report = JSON.parse(readFileSync(source));
  assert.equal(report.completed, true);
  assert.equal(report.package.manifestSha256, sha(packageManifestBytes));
  const driver = resolve(dirname(source), 'executed-driver.mjs');
  assert.equal(sha(readFileSync(driver)), report.driver.sha256);
  const name = `qa/${index + 1}-${report.target.startsWith('https://') ? 'public' : 'local'}`;
  retain(source, name + '/result.json', 'Unchanged actual browser report');
  retain(driver, name + '/executed-driver.mjs', 'Exact executed browser producer');
  qa.push({ file: name + '/result.json', driver: name + '/executed-driver.mjs', checks: report.checks.length,
    target: report.target, passed: report.checks.every(check => check.pass) });
}
for (const [index, source] of receipts.entries()) retain(source, `receipts/${index + 1}-${basename(source)}`, 'Unchanged independent setup, publication or served-byte receipt');
for (const name of ['package.mjs', 'check.mjs', 'retain.mjs', 'verify.mjs', 'verify-source.mjs', 'verify-publication.mjs', 'index.html', 'README.md']) {
  retain(resolve(dirname(fileURLToPath(import.meta.url)), name), 'producers/' + name, 'Exact current publication/reproduction producer');
}
const manifest = { schemaVersion: 1, date: new Date().toISOString(),
  packageManifestSha256: sha(packageManifestBytes), qa, files,
  scope: 'Published source and geometry evidence; existing application runtime remains separate' };
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ output: relative(root, output), files: files.length, packageFiles: packageManifest.files.length, reports: qa.length }));
