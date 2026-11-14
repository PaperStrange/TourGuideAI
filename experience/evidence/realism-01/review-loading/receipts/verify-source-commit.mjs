import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const root = '/workspace/TourGuideAI';
const commit = 'b4b140d2c48b7e185e296272f9fb141588caca95';
const manifestBytes = await readFile(`${root}/artifacts/realism-01/review-loading/package-03/package-manifest.json`);
const manifest = JSON.parse(manifestBytes);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const execute = promisify(execFile);
const files = [];
for (const expected of manifest.producers) {
  const { stdout } = await execute('git', ['show', `${commit}:${expected.path}`], {
    cwd: root, encoding: 'buffer', maxBuffer: 4 * 1024 * 1024,
  });
  const observed = { path: expected.path, bytes: stdout.length, sha256: sha(stdout) };
  assert.equal(observed.bytes, expected.bytes, expected.path);
  assert.equal(observed.sha256, expected.sha256, expected.path);
  files.push(observed);
}
const receipt = { recordedAt: new Date().toISOString(), commit,
  packageImplementationBase: manifest.implementationBase,
  packageManifestSha256: sha(manifestBytes),
  producerSha256: sha(await readFile(new URL(import.meta.url))),
  method: 'Read immutable Git blobs at the declared publication source commit and compare each package producer size and SHA-256.',
  limitations: 'Source-commit identity; actual build output, browser behavior and public delivery have separate evidence.', files };
await writeFile(`${root}/artifacts/realism-01/review-loading/source-commit.json`, JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ commit, files: files.length, verified: true }));
