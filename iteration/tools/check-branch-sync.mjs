// Refuse to act on a stale ref.
//
// WHY THIS EXISTS, and it is not hypothetical. Before this script, I nearly committed on
// a local `master` that was 198 commits behind `origin/master` and pushed it. Git would
// have rejected the non-fast-forward push, but the real hazard is what comes next: a
// rejected push invites `--force`, and `--force` would have discarded 198 commits of remote
// work. I caught it only because I happened to compare the two refs by hand at the last
// moment.
//
// I had also written iteration/design/branching-model.md with sources, which states the
// rule: refresh from the remote before touching a shared branch. Writing the rule did
// nothing. This is the same defect class as D-01 through D-22 -- a rule asserted in a
// document with no machine behind it -- and the fix has to be the same: mechanise it.
//
// CI NOTE, learned the hard way. GitHub Actions checks out a single branch, so `origin/*`
// tracking refs for OTHER branches do not exist. The first version called
// `git rev-parse --abbrev-ref <b>@{upstream}` unconditionally, which throws when the
// upstream is absent -- and because the git helper piped stderr away, the thrown object was
// prototype-less and even Node's own error printer choked on it, so CI reported a bare
// 'Node.js v22.23.2'. Every git call here is now routed through one guarded helper that
// returns null instead of throwing, and the comparison is skipped when the counterpart ref
// is not present, because "not fetched" is not "diverged".
//
// Exit 0 = no divergence. 1 = divergence found (act deliberately). 2 = could not fetch.
// Usage: node iteration/tools/check-branch-sync.mjs [--no-fetch] [--json]
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '../..');
const JSON_OUT = process.argv.includes('--json');
const NO_FETCH = process.argv.includes('--no-fetch');

/** Run a git command and return trimmed stdout, or null on ANY failure. Never throws. */
function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

/** True when a revision exists and resolves. */
const hasRef = (rev) => git(`rev-parse --verify --quiet ${rev}`) !== null;

if (!NO_FETCH) {
  try {
    execSync('git fetch --prune origin', { cwd: REPO, stdio: ['ignore', 'ignore', 'pipe'] });
  } catch {
    const msg = 'cannot reach the remote, so local refs may be stale';
    if (JSON_OUT) console.log(JSON.stringify({ fetched: false, error: msg, branches: [] }));
    else console.log(`ENV  ${msg}\n     Re-run with --no-fetch only if you accept working from possibly stale refs.`);
    process.exit(2);
  }
}

// A git working tree with NO LOCAL BRANCHES is still a git working tree. actions/checkout
// leaves the runner in a detached HEAD, so `for-each-ref refs/heads` returns nothing there
// -- and the first version read that empty list as "this is not a repository" and exited 2.
// It is the fourth distinct failure of this one check, and all four had the same shape:
// treating a proxy signal as the fact. The fact is whether git is usable, so ask that.
if (git('rev-parse --git-dir') === null) {
  const msg = `${REPO} is not a git working tree`;
  if (JSON_OUT) console.log(JSON.stringify({ error: msg, branches: [] }));
  else console.log(`ENV  ${msg}`);
  process.exit(2);
}

const localsRaw = git('for-each-ref --format=%(refname:short) refs/heads') ?? '';
const locals = localsRaw.split('\n').filter(Boolean);

// No local branches means there is nothing to compare, which is the CI checkout shape.
// That is "not applicable", not "clean" and not "broken" -- saying so is the point.
if (locals.length === 0) {
  const head = git('rev-parse --short HEAD') ?? '(unknown)';
  if (JSON_OUT) console.log(JSON.stringify({ fetched: !NO_FETCH, diverged: 0, stale: 0, branches: [], note: 'detached HEAD with no local branches' }));
  else console.log(`N/A  no local branches to compare (detached HEAD at ${head}).\n     Nothing to check here, and that is not a pass --\n     the guard that matters is the pre-push hook on a developer machine.`);
  process.exit(0);
}

const rows = [];
for (const b of locals) {
  const remoteRef = `refs/remotes/origin/${b}`;
  let upstream = null;
  // Only ask for an upstream when the tracking ref actually exists. Asking anyway is what
  // crashed in CI, where a single-branch checkout has none for the other branches.
  if (hasRef(`refs/remotes/origin/${b}`)) {
    upstream = `origin/${b}`;
  }
  if (!hasRef(remoteRef)) {
    rows.push({ branch: b, remote: false, upstream: null, ahead: null, behind: null, verdict: 'no-remote-counterpart' });
    continue;
  }
  const counted = git(`rev-list --left-right --count ${b}...origin/${b}`);
  if (counted === null) {
    rows.push({ branch: b, remote: true, upstream, ahead: null, behind: null, verdict: 'uncomparable' });
    continue;
  }
  const [ahead, behind] = counted.split(/\s+/).map(Number);
  const verdict = ahead > 0 && behind > 0 ? 'DIVERGED' : behind > 0 ? 'stale' : ahead > 0 ? 'ahead' : 'in-sync';
  rows.push({ branch: b, remote: true, upstream, ahead, behind, verdict });
}

const divergent = rows.filter((r) => r.verdict === 'DIVERGED');
const stale = rows.filter((r) => r.verdict === 'stale');
const notFetched = rows.filter((r) => r.verdict === 'no-remote-counterpart' && !process.env.CI);

if (JSON_OUT) {
  console.log(JSON.stringify({ fetched: !NO_FETCH, diverged: divergent.length, stale: stale.length, branches: rows }));
} else {
  console.log('branch sync — refresh before acting on a shared branch\n');
  console.log('branch                 remote  ahead  behind  verdict');
  for (const r of rows) {
    console.log(`${r.branch.padEnd(22)} ${(r.remote ? 'yes' : 'no ').padEnd(7)} ${String(r.ahead ?? '-').padStart(5)}  ${String(r.behind ?? '-').padStart(6)}  ${r.verdict}`);
  }
  console.log('');
  if (divergent.length) {
    console.log(`${divergent.length} branch(es) DIVERGED: ${divergent.map((r) => r.branch).join(', ')}`);
    console.log('  A commit or push here needs a deliberate decision. A rejected push is NOT a');
    console.log("  reason to reach for --force: --force is what discards the other side's work.");
  }
  if (stale.length) {
    console.log(`${stale.length} branch(es) behind the remote: ${stale.map((r) => `${r.branch} (-${r.behind})`).join(', ')}`);
    console.log('  Committing here starts from an old base. Fetch and rebase, or branch from origin/<name>.');
  }
  if (notFetched.length) {
    console.log(`${notFetched.length} local branch(es) with no fetched counterpart: ${notFetched.map((r) => r.branch).join(', ')}`);
    console.log('  Not a divergence -- it means this clone never fetched them. Not counted as a failure.');
  }
  if (!divergent.length && !stale.length) console.log('every local branch with a remote counterpart is in sync or ahead only.');
}

process.exit(divergent.length || stale.length ? 1 : 0);
