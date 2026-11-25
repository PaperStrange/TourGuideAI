import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const packageDirectory = resolve(process.argv[2]), revision = process.argv[3], output = resolve(process.argv[4]);
assert.match(revision || '', /^[a-f0-9]{7,40}$/);
assert(output.startsWith(resolve(root, 'artifacts/realism-01/connector-surface-review') + sep));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const commit = execFileSync('git', ['rev-parse', revision], { cwd: root, encoding: 'utf8' }).trim();
const manifestBytes = readFileSync(resolve(packageDirectory, 'package-manifest.json')), manifest = JSON.parse(manifestBytes);
assert.equal(manifest.id, 'realism-01-kyoto-surface-review');
const committed = path => execFileSync('git', ['show', `${commit}:${path}`], { cwd: root, maxBuffer: 64 * 1024 * 1024 });
execFileSync('git', ['cat-file', '-e', manifest.implementationBase + '^{commit}'], { cwd: root });
const files = manifest.files.map(file => {
  const bytes = committed(file.source); assert.equal(bytes.length, file.bytes, file.path); assert.equal(sha(bytes), file.sha256, file.path);
  return { path: file.path, source: file.source, bytes: bytes.length, sha256: sha(bytes) };
});
assert.equal(sha(committed(manifest.producer.path)), manifest.producer.sha256);
for (const binding of manifest.sourceBindings) assert.equal(sha(committed(binding.path)), binding.sha256, binding.path);
const report = { kind: 'package-source-commit-binding', completed: true, checkedAt: new Date().toISOString(), sourceCommit: commit,
  packageImplementationBase: manifest.implementationBase, packageManifestSha256: sha(manifestBytes), files,
  producer: manifest.producer, sourceBindings: manifest.sourceBindings,
  verifier: { path: relative(root, fileURLToPath(import.meta.url)), sha256: sha(readFileSync(fileURLToPath(import.meta.url))) },
  method: 'Read exact committed sources, retained dependency bytes, generated metadata, input manifests and producer through git show; compare byte counts and SHA-256',
  limitations: 'The packaging base and exact source commit are distinct identities. Source identity supplies no realism or full-route acceptance.' };
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ sourceCommit: commit, files: files.length, packageManifestSha256: report.packageManifestSha256 }));
