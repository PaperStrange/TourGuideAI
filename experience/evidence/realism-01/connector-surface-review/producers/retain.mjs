import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../..');
const output = resolve(root, 'experience/evidence/realism-01/connector-surface-review');
const { values } = parseArgs({ options: { package: { type: 'string' }, qa: { type: 'string', multiple: true }, receipt: { type: 'string', multiple: true } } });
assert(values.package && values.qa?.length, 'Supply --package and at least one --qa result.json');
const packageDirectory = resolve(values.package);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = [];
function retain(source, name, method) {
  const bytes = readFileSync(source), destination = resolve(output, name);
  assert(destination.startsWith(output + sep));
  assert(!files.some(file => file.file === name), name);
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, bytes);
  files.push({ file: name, bytes: bytes.length, sha256: sha(bytes), source: relative(root, source), date: new Date().toISOString(),
    rights: 'Project research; source photographs and derived surfaces: Irvin Chen / Panoramax Taiwan, CC BY-SA 4.0; Three.js: MIT',
    location: 'Four capture positions west of Shijō–Karasuma; browser execution in cloud Chromium', method,
    limitations: 'Relative-scale surface research; same-sequence reserved views. Route, human realism, independent recognition and physical-device performance remain unqualified.' });
}
const manifestBytes = readFileSync(resolve(packageDirectory, 'package-manifest.json'));
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.id, 'realism-01-kyoto-surface-review');
for (const file of manifest.files) {
  const source = resolve(packageDirectory, file.path); assert(source.startsWith(packageDirectory + sep));
  const bytes = readFileSync(source); assert.equal(bytes.length, file.bytes); assert.equal(sha(bytes), file.sha256);
  retain(source, 'package/' + file.path, 'Exact bytes of the tested static research package');
}
retain(resolve(packageDirectory, 'package-manifest.json'), 'package/package-manifest.json', 'Exact static package identity and provenance');
const qa = [];
for (const [index, sourceName] of values.qa.entries()) {
  const source = resolve(sourceName), report = JSON.parse(readFileSync(source));
  assert.equal(report.completed, true); assert(report.checks.length && report.checks.every(check => check.pass));
  assert.equal(report.package.manifestSha256, sha(manifestBytes));
  const driver = resolve(dirname(source), 'executed-driver.mjs');
  assert.equal(sha(readFileSync(driver)), report.driver.sha256);
  const name = `qa/${index + 1}-${report.target.startsWith('https://') ? 'public' : 'local'}`;
  retain(source, name + '/result.json', 'Unchanged actual native browser-control and WebGL report');
  retain(driver, name + '/executed-driver.mjs', 'Exact executed browser driver');
  for (const screenshot of report.screenshots) {
    const path = resolve(dirname(source), screenshot.path); assert(path.startsWith(dirname(source) + sep));
    const bytes = readFileSync(path); assert.equal(bytes.length, screenshot.bytes); assert.equal(sha(bytes), screenshot.sha256);
    retain(path, name + '/' + screenshot.path, 'Actual WebGL canvas screenshot; retained without visual interpretation');
  }
  qa.push({ file: name + '/result.json', driver: name + '/executed-driver.mjs', checks: report.checks.length,
    target: report.target, passed: true });
}
for (const [index, source] of (values.receipt || []).entries()) retain(resolve(source), `receipts/${index + 1}-${basename(source)}`, 'Unchanged source, setup or publication receipt');
for (const name of ['package.mjs', 'check.mjs', 'retain.mjs', 'verify.mjs', 'verify-source.mjs', 'index.html', 'surface-app.js', 'surface-style.css', 'README.md']) {
  retain(resolve(directory, name), 'producers/' + name, 'Exact publication and reproduction source');
}
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify({ schemaVersion: 1, date: new Date().toISOString(),
  packageManifestSha256: sha(manifestBytes), qa, files,
  scope: 'Interactive captured-color research surface; complete-route acceptance remains open' }, null, 2) + '\n');
console.log(JSON.stringify({ output: relative(root, output), files: files.length, packageFiles: manifest.files.length, reports: qa.length }));
