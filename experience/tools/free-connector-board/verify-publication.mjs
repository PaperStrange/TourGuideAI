import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const revision = process.argv[2];
const output = resolve(process.argv[3]);
assert(/^[a-f0-9]{7,40}$/.test(revision || ''));
assert(output.startsWith(resolve(root, 'artifacts/realism-01/free-connector-next') + sep));
const field = format => execFileSync('git', ['show', '-s', `--format=${format}`, revision], { cwd: root, encoding: 'utf8' }).trim();
const commit = field('%H'), tree = field('%T'), parent = field('%P');
for (const value of [commit, tree, parent]) assert.match(value, /^[a-f0-9]{40}$/);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { kind: 'published-commit-tree-binding', checkedAt: new Date().toISOString(), commit, tree, parent,
  method: 'Read exact commit, tree and parent object identities through Git formatted fields',
  producer: { path: relative(root, fileURLToPath(import.meta.url)), sha256: sha(readFileSync(fileURLToPath(import.meta.url))) } };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ commit, tree, parent }));
