import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const root = '/workspace/TourGuideAI';
const workspace = path.join(root, 'artifacts/realism-01/connector-surface-review');
const directory = path.resolve(process.argv[2]);
const publication = path.resolve(process.argv[3]);
assert(directory.startsWith(root + path.sep));
assert(publication.startsWith(workspace + path.sep));
const index = path.join(publication, 'index');
const prefix = 'previews/kyoto-source-review/';
const execute = promisify(execFile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = async args => (await execute('git', args, { cwd: root,
  env: { ...process.env, GIT_INDEX_FILE: index }, encoding: 'buffer', maxBuffer: 32 * 1024 * 1024 })).stdout;
await mkdir(publication);
const parent = (await git(['rev-parse', 'origin/gh-pages'])).toString().trim();
const implementation = (await git(['rev-parse', 'HEAD'])).toString().trim();
const manifestBytes = await readFile(path.join(directory, 'package-manifest.json'));
const manifest = JSON.parse(manifestBytes);
const files = [...manifest.files, { path: 'package-manifest.json', bytes: manifestBytes.length, sha256: sha(manifestBytes) }];
assert.equal(new Set(files.map(file => file.path)).size, files.length);
const packagePaths = new Set(files.map(file => prefix + file.path));
// 独立 Git index 更新研究页面，并核对原有附件和其他已发布页面。
await git(['read-tree', parent]);
const oldPaths = (await git(['ls-files', '-z', '--', prefix])).toString().split('\0').filter(Boolean);
assert(oldPaths.length > 0);
for (const name of oldPaths) {
  assert(packagePaths.has(name), `Existing public link must remain: ${name}`);
  if (['index.html', 'package-manifest.json'].includes(name.slice(prefix.length))) continue;
  assert.deepEqual(await readFile(path.join(directory, name.slice(prefix.length))), await git(['show', `${parent}:${name}`]), name);
}
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
await git(['diff', '--exit-code', parent, tree, '--', '.', ':!previews/kyoto-source-review']);
for (const file of files) {
  const bytes = await git(['show', `${tree}:${prefix}${file.path}`]);
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(sha(bytes), file.sha256, file.path);
}
const names = (await git(['ls-tree', '-r', '--name-only', '-z', tree, '--', prefix])).toString().split('\0').filter(Boolean);
assert.equal(names.length, files.length);
const receipt = { recordedAt: new Date().toISOString(), parent, tree, implementation,
  packageManifestSha256: sha(manifestBytes), verifiedFiles: files.length,
  preservedHistoricalFiles: oldPaths.length - 2, otherPublishedPathsUnchanged: true,
  producerSha256: sha(await readFile(new URL(import.meta.url))) };
await writeFile(path.join(publication, 'audit.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt));
