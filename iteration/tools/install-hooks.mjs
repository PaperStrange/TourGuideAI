// Install the repository's git hooks.
//
// The gates catch divergence when someone RUNS them. A pre-push hook catches it at the
// moment it would cause harm, which is the difference between a check and a safeguard.
// This matters because the failure it guards against is not a wrong result -- it is a
// rejected push followed by a reflex `--force`, and `--force` is what discards the other
// side's work.
//
// Hooks live in .git/hooks, which git does not track, so they cannot be committed. This
// script is the tracked artefact: it writes the hook and can be re-run by anyone who
// clones. `run-gates.mjs` reports whether the hook is present.
//
// Usage: node iteration/tools/install-hooks.mjs [--check]
import { writeFileSync, existsSync, readFileSync, chmodSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

const REPO = resolve(import.meta.dirname, '../..');
const CHECK = process.argv.includes('--check');

let hooksDir;
try {
  hooksDir = execSync('git rev-parse --git-path hooks', { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  if (!hooksDir.startsWith('/') && !/^[A-Za-z]:/.test(hooksDir)) hooksDir = join(REPO, hooksDir);
} catch {
  console.error(`ENV  ${REPO} is not a git working tree, so there is nowhere to install hooks.`);
  process.exit(2);
}

const HOOK = `#!/bin/sh
# Installed by iteration/tools/install-hooks.mjs -- do not edit here, edit that file.
#
# Refuse to push from a stale or diverged branch. This is the mechanised form of the rule
# in iteration/design/branching-model.md: refresh before touching a shared branch.
#
# The hazard is not the push itself. Git rejects a non-fast-forward, and the danger is the
# next reflex -- --force, which discards the remote side. So a rejection here should send
# you to fetch and rebase, never to force.
echo "pre-push: checking branch sync against the remote..."
if ! node "$(git rev-parse --show-toplevel)/iteration/tools/check-branch-sync.mjs"; then
  echo ""
  echo "pre-push: REFUSING. A local branch is stale or diverged from its remote."
  echo "          Fetch, then rebase your work onto origin/<branch>."
  echo "          Do NOT reach for --force: that is what discards the other side's commits."
  echo "          To push anyway, bypass with: git push --no-verify"
  exit 1
fi
exit 0
`;

const target = join(hooksDir, 'pre-push');
const exists = existsSync(target);
const current = exists ? readFileSync(target, 'utf8') : '';

if (CHECK) {
  if (!exists) { console.error(`no pre-push hook at ${target}`); process.exit(1); }
  if (!current.includes('install-hooks.mjs')) { console.error(`pre-push at ${target} was not written by this script`); process.exit(1); }
  console.log(`OK - pre-push hook installed at ${target}`);
  process.exit(0);
}

if (exists && !current.includes('install-hooks.mjs')) {
  console.error(`REFUSING: ${target} already exists and was not written by this script.`);
  console.error('  Move it aside, or reconcile it by hand, rather than overwriting a hook you may rely on.');
  process.exit(3);
}

mkdirSync(hooksDir, { recursive: true });
writeFileSync(target, HOOK, 'utf8');
try { chmodSync(target, 0o755); } catch { /* windows */ }
console.log(`installed pre-push hook at ${target}`);
console.log('It refuses to push from a stale or diverged branch; bypass with git push --no-verify.');
