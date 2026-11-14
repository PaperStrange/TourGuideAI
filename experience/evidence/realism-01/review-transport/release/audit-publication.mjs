import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import path from 'node:path';

const execute = promisify(execFile);
const root = '/workspace/TourGuideAI';
const directory = path.join(root, 'artifacts/realism-01/review-transport/package-identity2');
const index = path.join(root, 'artifacts/realism-01/review-transport/publication2/index');
const git = async args => (await execute('git', args, {
  cwd: root, env: { ...process.env, GIT_INDEX_FILE: index },
  encoding: 'buffer', maxBuffer: 64 * 1024 * 1024,
})).stdout;
const sha = data => createHash('sha256').update(data).digest('hex');
const manifestBytes = await readFile(path.join(directory, 'package-manifest.json'));
const manifest = JSON.parse(manifestBytes);
const tree = (await git(['write-tree'])).toString().trim();
await git(['diff', '--exit-code', 'origin/gh-pages', tree, '--', '.', ':!previews/realism-01']);
const expected = [...manifest.files, {
  path: 'package-manifest.json', bytes: manifestBytes.length, sha256: sha(manifestBytes),
}];
for (const file of expected) {
  const bytes = await git(['show', `${tree}:previews/realism-01/${file.path}`]);
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(sha(bytes), file.sha256, file.path);
}
const names = (await git(['ls-tree', '-r', '--name-only', '-z', tree, '--', 'previews/realism-01']))
  .toString().split('\0').filter(Boolean);
assert.equal(names.length, expected.length);
const receipt = { recordedAt: new Date().toISOString(), tree,
  parent: (await git(['rev-parse', 'origin/gh-pages'])).toString().trim(),
  implementation: (await git(['rev-parse', 'HEAD'])).toString().trim(),
  packageManifestSha256: sha(manifestBytes), verifiedFiles: expected.length,
  otherPublishedPathsUnchanged: true };
await writeFile(path.join(root, 'artifacts/realism-01/review-transport/publication2/audit.json'),
  JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
