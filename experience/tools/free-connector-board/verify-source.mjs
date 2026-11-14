import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const packageDirectory = resolve(process.argv[2]);
const revision = process.argv[3];
const output = resolve(process.argv[4]);
assert(/^[a-f0-9]{7,40}$/.test(revision || ''));
assert(output.startsWith(resolve(root, 'artifacts/realism-01/free-connector-next') + sep));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const commit = execFileSync('git', ['rev-parse', revision], { cwd: root, encoding: 'utf8' }).trim();
const manifestBytes = readFileSync(resolve(packageDirectory, 'package-manifest.json'));
const manifest = JSON.parse(manifestBytes);
const files = manifest.files.map(file => {
  const data = execFileSync('git', ['show', `${commit}:${file.source}`], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
  assert.equal(data.length, file.bytes, file.path);
  assert.equal(sha(data), file.sha256, file.path);
  return { path: file.path, source: file.source, bytes: data.length, sha256: sha(data) };
});
const producer = execFileSync('git', ['show', `${commit}:${manifest.producer.path}`], { cwd: root });
assert.equal(sha(producer), manifest.producer.sha256);
const report = { kind: 'package-source-commit-binding', completed: true, checkedAt: new Date().toISOString(),
  sourceCommit: commit, packageImplementationBase: manifest.implementationBase,
  packageManifestSha256: sha(manifestBytes), files, producer: manifest.producer,
  verifier: { path: relative(root, fileURLToPath(import.meta.url)), sha256: sha(readFileSync(fileURLToPath(import.meta.url))) },
  method: 'Read each exact committed source through git show and compare size/SHA-256 with the packaged content and packaging producer',
  limitations: 'The packaging base and later exact source commit are distinct identities. This receipt establishes source bytes and supplies no route qualification.' };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ sourceCommit: commit, files: files.length, packageManifestSha256: report.packageManifestSha256 }));
