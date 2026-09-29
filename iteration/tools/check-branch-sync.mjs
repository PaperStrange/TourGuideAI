// Refuse to act on a stale ref.
//
// WHY THIS EXISTS, and it is not hypothetical. Before this script, I nearly committed on
// a local `master` that was 198 commits behind `origin/master` and pushed it. Git would
// have rejected the non-fast-forward push, but the real hazard is what comes next: a
// rejected push invites `--force`, and `--force` would have discarded 198 commits of
// remote work. I caught it only because I happened to compare the two refs by hand at the
// last moment.
//
// I had also written iteration/design/branching-model.md with sources, which states the
// rule: refresh from the remote before touching a shared branch. Writing the rule did
// nothing. This is the same defect class as D-01 through D-19 -- a rule asserted in a
// document with no machine behind it -- and the fix has to be the same: mechanise it.
//
// What it does: fetches, then compares every local branch against its remote counterpart
// and reports ahead/behind. A branch that is BOTH ahead and behind has diverged, and any
// commit or push on it needs a deliberate decision, not a reflex.
//
// Exit 0 = no divergence. 1 = divergence found (act deliberately). 2 = could not fetch.
// Usage: node iteration/tools/check-branch-sync.mjs [--no-fetch] [--json]
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '../..');
const JSON_OUT = process.argv.includes('--json');
const NO_FETCH = process.argv.includes('--no-fetch');
const git = (cmd, opts = {}) => execSync(`git ${cmd}`, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], ...opts }).trim();

if (!NO_FETCH) {
  try {
    git('fetch --prune origin');
  } catch (e) {
    const msg = `cannot reach the remote, so local refs may be stale: ${String(e.message).split('\n')[0]}`;
    if (JSON_OUT) console.log(JSON.stringify({ fetched: false, error: msg, branches: [] }));
    else console.log(`ENV  ${msg}\n     Re-run with --no-fetch only if you accept working from possibly stale refs.`);
    process.exit(2);
  }
}

const locals = git('for-each-ref --format=%(refname:short) refs/heads').split('\n').filter(Boolean);
const remotes = new Set(git('for-each-ref --format=%(refname:short) refs/remotes/origin').split('\n').filter(Boolean).map((r) => r.replace(/^origin\//, '')));

const rows = [];
for (const b of locals) {
  if (!remotes.has(b)) {
    rows.push({ branch: b, remote: false, upstream: (() => { try { return git(`rev-parse --abbrev-ref ${b}@{upstream}`); } catch { return null; } })(), ahead: null, behind: null, verdict: 'no-remote-counterpart' });
    continue;
  }
  const [ahead, behind] = git(`rev-list --left-right --count ${b}...origin/${b}`).split(/\s+/).map(Number);
  let upstream = null;
  try { upstream = git(`rev-parse --abbrev-ref ${b}@{upstream}`); } catch { /* none configured */ }
  const verdict = ahead > 0 && behind > 0 ? 'DIVERGED' : behind > 0 ? 'stale' : ahead > 0 ? 'ahead' : 'in-sync';
  rows.push({ branch: b, remote: true, upstream, ahead, behind, verdict });
}

const divergent = rows.filter((r) => r.verdict === 'DIVERGED');
const stale = rows.filter((r) => r.verdict === 'stale');
const noUpstream = rows.filter((r) => r.remote && !r.upstream);

if (JSON_OUT) {
  console.log(JSON.stringify({ fetched: !NO_FETCH, diverged: divergent.length, stale: stale.length, branches: rows }));
} else {
  console.log('branch sync — refresh before acting on a shared branch\n');
  console.log('branch                 remote  ahead  behind  upstream            verdict');
  for (const r of rows) {
    console.log(
      `${r.branch.padEnd(22)} ${(r.remote ? 'yes' : 'NO ').padEnd(7)} ${String(r.ahead ?? '-').padStart(5)}  ${String(r.behind ?? '-').padStart(6)}  ${String(r.upstream ?? '(none)').padEnd(19)} ${r.verdict}`,
    );
  }
  console.log('');
  if (divergent.length) {
    console.log(`${divergent.length} branch(es) DIVERGED: ${divergent.map((r) => r.branch).join(', ')}`);
    console.log('  A commit or push here needs a deliberate decision. A rejected push is NOT a');
    console.log('  reason to reach for --force: --force is what discards the other side\'s work.');
  }
  if (stale.length) {
    console.log(`${stale.length} branch(es) behind the remote: ${stale.map((r) => `${r.branch} (-${r.behind})`).join(', ')}`);
    console.log('  Committing here starts from an old base. Fetch and rebase or branch from origin/<name>.');
  }
  if (noUpstream.length) {
    console.log(`${noUpstream.length} branch(es) track nothing: ${noUpstream.map((r) => r.branch).join(', ')}`);
    console.log('  No upstream means push/pull have no default target, which is how a long-lived');
    console.log('  branch ends up local-only for 30 commits without anyone noticing.');
  }
  if (!divergent.length && !stale.length) console.log('every local branch with a remote counterpart is in sync or ahead only.');
}

process.exit(divergent.length || stale.length ? 1 : 0);
