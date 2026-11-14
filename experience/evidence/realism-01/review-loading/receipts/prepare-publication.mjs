import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const root = '/workspace/TourGuideAI';
const directory = path.join(root, 'artifacts/realism-01/review-loading/package-03');
const publication = path.join(root, 'artifacts/realism-01/review-loading/publication-03');
const index = path.join(publication, 'index');
const prefix = 'previews/realism-01/';
const execute = promisify(execFile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = async args => (await execute('git', args, { cwd: root,
  env: { ...process.env, GIT_INDEX_FILE: index }, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 })).stdout;
await mkdir(publication, { recursive: true });
const parent = (await git(['rev-parse', 'origin/gh-pages'])).toString().trim();
const implementation = (await git(['rev-parse', 'HEAD'])).toString().trim();
const manifestBytes = await readFile(path.join(directory, 'package-manifest.json'));
const manifest = JSON.parse(manifestBytes);
const files = [...manifest.files, { path: 'package-manifest.json', bytes: manifestBytes.length, sha256: sha(manifestBytes) }];
assert.equal(new Set(files.map(file => file.path)).size, files.length);
for (const producer of manifest.producers) {
  const bytes = await readFile(path.join(root, producer.path));
  assert.equal(bytes.length, producer.bytes, producer.path);
  assert.equal(sha(bytes), producer.sha256, producer.path);
}
// 独立 index 只更新此预览，来源分支和其他已发布页面保持原样。
await git(['read-tree', parent]);
const previous = (await git(['ls-files', '-z', '--', prefix])).toString().split('\0').filter(Boolean);
if (previous.length) await git(['update-index', '--force-remove', '--', ...previous]);
for (const file of files) {
  const filename = path.resolve(directory, file.path);
  assert(filename.startsWith(directory + path.sep));
  const bytes = await readFile(filename);
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(sha(bytes), file.sha256, file.path);
  const object = (await git(['hash-object', '-w', '--no-filters', filename])).toString().trim();
  await git(['update-index', '--add', '--cacheinfo', '100644', object, prefix + file.path]);
}
const tree = (await git(['write-tree'])).toString().trim();
await git(['diff', '--exit-code', parent, tree, '--', '.', ':!previews/realism-01']);
for (const file of files) {
  const bytes = await git(['show', `${tree}:${prefix}${file.path}`]);
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(sha(bytes), file.sha256, file.path);
}
const names = (await git(['ls-tree', '-r', '--name-only', '-z', tree, '--', prefix])).toString().split('\0').filter(Boolean);
assert.equal(names.length, files.length);
const receipt = { recordedAt: new Date().toISOString(), parent, tree, implementation,
  packageManifestSha256: sha(manifestBytes), verifiedFiles: files.length, otherPublishedPathsUnchanged: true,
  producerSha256: sha(await readFile(new URL(import.meta.url))) };
await writeFile(path.join(publication, 'audit.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
