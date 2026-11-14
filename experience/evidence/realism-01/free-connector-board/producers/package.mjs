import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const evidence = resolve(root, 'experience/evidence/realism-01/free-connector-next');
const workspace = resolve(root, 'artifacts/realism-01/free-connector-next');
const output = resolve(process.argv[2] || resolve(workspace, 'public-package'));
const implementationBase = process.argv[3];
assert(/^[a-f0-9]{40}$/.test(implementationBase || ''), 'Supply the inspected implementation base commit as the third argument');
assert(output.startsWith(workspace + sep), 'Package must remain inside the ignored source workspace');
assert(!existsSync(output), 'Use a new package directory');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceManifestBytes = readFileSync(resolve(evidence, 'manifest.json'));
const sourceManifest = JSON.parse(sourceManifestBytes);
const files = [];
for (const record of sourceManifest.files) {
  const data = readFileSync(resolve(evidence, record.file));
  assert.equal(data.length, record.bytes, record.file);
  assert.equal(sha(data), record.sha256, record.file);
}
assert.equal(sha(readFileSync(resolve(evidence, sourceManifest.producer.file))), sourceManifest.producer.sha256);
const names = [...sourceManifest.files.map(record => record.file), 'README.md', 'board.html', 'manifest.json', 'research.py'];
const sources = names.map(name => ({ name, source: resolve(evidence, name) }));
sources.push({ name: 'index.html', source: resolve(dirname(fileURLToPath(import.meta.url)), 'index.html') });
const geometryManifests = [];
for (const method of ['perspective', 'spherical']) {
  const directory = resolve(root, 'experience/evidence/realism-01/connector-reconstruction', method);
  const manifestBytes = readFileSync(resolve(directory, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes);
  geometryManifests.push({ method, sha256: sha(manifestBytes) });
  for (const [sourceName, name] of [['geometry-board.png', `geometry/${method}-board.png`], ['result.json', `geometry/${method}-result.json`]]) {
    const record = manifest.files.find(file => file.path === sourceName || file.file === sourceName);
    assert(record, `${method}/${sourceName} must be retained`);
    const data = readFileSync(resolve(directory, sourceName));
    assert.equal(sha(data), record.sha256);
    sources.push({ name, source: resolve(directory, sourceName) });
  }
}
for (const { name, source } of sources) {
  const data = readFileSync(source);
  const path = resolve(output, name);
  assert(path.startsWith(output + sep));
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  files.push({ path: name, bytes: data.length, sha256: sha(data), source: relative(root, source) });
}
const producer = readFileSync(fileURLToPath(import.meta.url));
const manifest = {
  schemaVersion: 1,
  id: 'realism-01-kyoto-source-board',
  createdAt: new Date().toISOString(),
  implementationBase,
  sourceEvidenceManifestSha256: sha(sourceManifestBytes),
  geometryEvidenceManifests: geometryManifests,
  producer: { path: relative(root, fileURLToPath(import.meta.url)), sha256: sha(producer) },
  scope: 'Static research board and retained source evidence; no application runtime or route qualification',
  files,
};
writeFileSync(resolve(output, 'package-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ output: relative(root, output), files: files.length,
  bytes: files.reduce((sum, file) => sum + file.bytes, 0),
  manifestSha256: sha(readFileSync(resolve(output, 'package-manifest.json'))) }));
