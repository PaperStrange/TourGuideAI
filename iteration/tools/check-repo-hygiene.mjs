// Repo-hygiene gates: the rules that were being violated while nothing looked.
//
// Every check here exists because the corresponding rule was, at some point in this
// branch, asserted in a document and false in the repository. A rule with no machine
// behind it is a rule that drifts, and each of these drifted silently for months.
//
// Exit 0 = all rules hold. Exit 1 = a rule is violated. Exit 2 = could not run.
// Usage: node iteration/tools/check-repo-hygiene.mjs [--json]
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join, basename } from 'node:path';

const REPO = resolve(import.meta.dirname, '../..');
const JSON_OUT = process.argv.includes('--json');
const WF = join(REPO, '.github', 'workflows');

const results = [];
const add = (id, ok, title, detail, status) =>
  results.push({ id, ok, title, detail, status: status ?? (ok ? 'pass' : 'fail') });

// R1, R3 and R4 need git. An export produced by `git archive` has no .git directory, and
// asking git anything there crashes the checker instead of reporting honestly. That is
// an ENVIRONMENT problem, not a rule violation, and the two want different responses --
// so this exits 2 with a statement rather than dying or, worse, reporting PASS on an
// empty branch list.
function gitOk() {
  try { execSync('git rev-parse --git-dir', { cwd: REPO, stdio: ['ignore', 'ignore', 'ignore'] }); return true; } catch { return false; }
}
if (!gitOk()) {
  const msg = `${REPO} is not a git working tree, so branch refs, the tracked-file list and the gitignore rules cannot be inspected. Run this in a clone, not in a git-archive export.`;
  if (JSON_OUT) console.log(JSON.stringify({ repo: REPO, passed: false, exitCode: 2, envError: msg, checks: [] }));
  else console.log(`ENV  repo hygiene could not run\n      ${msg}`);
  process.exit(2);
}

// ── R1 · workflow branch references must name branches that exist ─────────────
// Defect: five workflows filtered on main/develop, which do not exist. GitHub leaves
// their checks Pending forever, so any branch protection requiring them blocks merges.
//
// This check must read the branches: FILTER, not every 6-space list item. The first
// version scanned globally and flagged `- '.github/workflows/fact-integrity.yml'` from a
// paths: block as a missing branch -- a false positive that would have been worse than
// no check, because it trains the reader to ignore the output.
{
  let branches = [];
  try {
    const out = execSync('git for-each-ref --format=%(refname:short) refs/heads refs/remotes/origin', { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    branches = out.split('\n').map((b) => b.replace(/^origin\//, '').trim()).filter((b) => b && b !== 'origin' && b !== 'HEAD');
  } catch { /* fall through to the empty set and let the check fail loudly */ }
  const known = new Set(branches);
  const offenders = [];
  for (const f of existsSync(WF) ? readdirSync(WF).filter((n) => n.endsWith('.yml')) : []) {
    const lines = readFileSync(join(WF, f), 'utf8').split('\n');
    let inBranches = false;
    lines.forEach((line, i) => {
      if (/^\s*branches(-ignore)?:\s*(\[.*\])?\s*$/.test(line)) { inBranches = true; return; }
      if (/^\s*(paths(-ignore)?|tags(-ignore)?):/.test(line)) { inBranches = false; return; }
      if (!inBranches) return;
      const m = line.match(/^\s+-\s*'?([A-Za-z0-9._\/-]+)'?\s*$/);
      if (!m) { if (line.trim() && !line.startsWith(' ') === false && /^\s*\w+:/.test(line) && !/^\s+-/.test(line)) inBranches = false; return; }
      const b = m[1];
      if (b.includes('*') || b.includes('!')) return;   // glob patterns are fine
      if (!known.has(b)) offenders.push(`${f}:${i + 1} branch filter names "${b}", which is not a branch`);
    });
    for (const m of readFileSync(join(WF, f), 'utf8').matchAll(/branches\/([A-Za-z0-9._-]+)\/protection/g)) {
      if (!known.has(m[1])) offenders.push(`${f}: configures protection for "${m[1]}", which is not a branch`);
    }
  }
  add('R1', offenders.length === 0, 'workflow branch references name real branches',
    offenders.length ? offenders.join('\n      ') : `checked every branches: filter against ${known.size} known branches`);
}

// ── R2 · the workflows README must describe the workflows that exist ──────────
// Defect: the README promised lint.yml, test.yml, docs.yml, task-prompt-testing.yml and
// ux-audit-validation.yml. None of the five has ever existed.
{
  const readme = join(WF, 'README.md');
  const actual = existsSync(WF) ? readdirSync(WF).filter((n) => n.endsWith('.yml')).sort() : [];
  const problems = [];
  if (!existsSync(readme)) problems.push('workflows README.md is missing');
  else {
    const text = readFileSync(readme, 'utf8');
    const promised = [...new Set([...text.matchAll(/\*\*([a-z0-9-]+\.yml)\*\*/g)].map((m) => m[1]))].sort();
    for (const p of promised) if (!actual.includes(p)) problems.push(`README names ${p}, which does not exist`);
    for (const a of actual) if (!promised.includes(a)) problems.push(`${a} exists but the README never names it`);
  }
  add('R2', problems.length === 0, 'workflows README matches the workflows on disk',
    problems.length ? problems.join('\n      ') : `${actual.length} workflows, all documented`);
}

// ── R3 · repo text files must be UTF-8 without a BOM ─────────────────────────
// Defect: 8 of 620 tracked text files were not UTF-8 (4 UTF-16LE, 4 with a BOM).
// CONTRIBUTING.md being UTF-16LE is plausibly why its wrong branch name went unnoticed.
//
// Scope is deliberate. This rule is about files a human or tool must READ AND EDIT as
// text: markdown, YAML, JSON and scripts. Raw fetched HTML under the recon and evidence
// directories is exempt by design -- those are byte snapshots of third-party pages and
// their encoding is part of what was captured. The exempt count is printed rather than
// silently skipped, so the boundary stays visible instead of becoming a hiding place.
{
  const ENFORCED = /\.(md|yml|yaml|json|mjs|js|cjs|ts|tsx|jsx|sh|ps1)$/i;
  const EXEMPT = /^(iteration\/recon\/_raw-|iteration\/recon\/_fetch-|docs\/handOff\/archive\/|city-packs\/[^/]+\/evidence\/)/;
  let tracked = [];
  try { tracked = execSync('git ls-files', { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean); } catch { /* ignore */ }
  const offenders = [];
  let scanned = 0, exempted = 0;
  const scan = (b) => {
    if (b.length < 3) return '';
    if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return 'UTF-8 with a BOM';
    if ((b[0] === 0xff && b[1] === 0xfe) || (b[0] === 0xfe && b[1] === 0xff)) return 'UTF-16';
    const lim = Math.min(4000, b.length);
    let zeros = 0;
    for (let i = 0; i < lim; i++) if (b[i] === 0) zeros++;
    return zeros / lim > 0.2 ? `NUL bytes in the first ${lim} (UTF-16 without a BOM?)` : '';
  };
  for (const rel of tracked) {
    const abs = join(REPO, rel);
    if (!existsSync(abs)) continue;
    const enforced = ENFORCED.test(rel);
    const exempt = EXEMPT.test(rel);
    if (!enforced && !exempt) continue;
    const problem = scan(readFileSync(abs));
    if (enforced) { scanned++; if (problem) offenders.push(`${rel}: ${problem}`); }
    else { exempted++; if (problem) offenders.push(`${rel}: ${problem}  [exempt path, so this is FYI not a failure]`); }
  }
  const real = offenders.filter((o) => !o.includes('exempt path'));
  const fyi = offenders.filter((o) => o.includes('exempt path'));
  add('R3', real.length === 0, 'repo text files are UTF-8 without a BOM',
    real.length
      ? real.slice(0, 12).join('\n      ') + (real.length > 12 ? `\n      ... ${real.length - 12} more` : '')
      : `${scanned} enforced files clean; ${exempted} exempt snapshot files scanned${fyi.length ? `, ${fyi.length} of those still carry a third-party BOM (as captured)` : ''}`);
}

// ── R4 · every gate a document names must exist as a file ────────────────────
// The same failure as R2, generalised: a documented rule whose mechanism is absent.
// This is the check that would have caught the untracked gate scripts.
{
  const NEEDED = [
    ['docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', 'geo contract gate'],
    ['docs/handOff/dsh-bundle-tourguide-2.5d/tools/assert-export-boundary.mjs', 'export-boundary gate'],
    ['docs/handOff/dsh-bundle-tourguide-2.5d/tools/validate-city-pack.mjs', 'stock city-pack gate'],
    ['city-packs/kyoto-shijo/validate-city-pack-v2.mjs', 'fact-layer gate'],
    ['city-packs/kyoto-shijo/validate-doors.mjs', 'doors gate'],
    ['iteration/tools/run-gates.mjs', 'gate runner'],
    ['iteration/tools/find-untracked-deps.mjs', 'untracked-dependency scanner'],
    ['iteration/tools/check-repo-hygiene.mjs', 'this checker'],
    ['iteration/design/branching-model.md', 'branching model'],
    ['iteration/design/repo-defect-registry.md', 'defect registry'],
    ['iteration/design/contract-geo-pipeline.md', 'frozen geo contract'],
    ['.github/workflows/fact-integrity.yml', 'the CI job that runs these gates'],
  ];
  const missing = NEEDED.filter(([p]) => !existsSync(join(REPO, p))).map(([p, why]) => `${p} (${why}) is absent`);
  const untracked = NEEDED.filter(([p]) => {
    if (!existsSync(join(REPO, p))) return false;
    try { execSync(`git ls-files --error-unmatch "${p}"`, { cwd: REPO, stdio: 'ignore' }); return false; } catch { return true; }
  }).map(([p]) => `${p} exists but is NOT tracked, so a clean checkout will not have it`);
  const problems = [...missing, ...untracked];
  add('R4', problems.length === 0, 'every documented gate exists AND is tracked',
    problems.length ? problems.join('\n      ') : `${NEEDED.length} gate artefacts present and tracked`);
}

// ── R5 · JSON is content-addressed, so line endings must not be re-encoded ────
// Defect: core.autocrlf=true plus '* text=auto' rewrote newlines on checkout, which
// silently invalidated every SHA-256 assertion in the pack while every gate that only
// READS the data stayed green.
{
  const ga = join(REPO, '.gitattributes');
  const problems = [];
  if (!existsSync(ga)) problems.push('.gitattributes is missing');
  else {
    const text = readFileSync(ga, 'utf8');
    if (!/^\*\.json\s+-text\s*$/m.test(text)) problems.push('no `*.json -text` rule: JSON bytes may be re-encoded on checkout');
  }
  let autocrlf = '';
  try { autocrlf = execSync('git config --get core.autocrlf', { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { autocrlf = '(unset)'; }
  if (autocrlf === 'true') problems.push('core.autocrlf=true in this working copy; the .gitattributes rule is what protects other contributors, and it is present, so this is a warning only');
  const hard = problems.filter((p) => !p.includes('warning only'));
  add('R5', hard.length === 0, 'line-ending re-encoding is disabled for content-addressed files',
    hard.length ? hard.join('\n      ') : `*.json is -text; core.autocrlf=${autocrlf} (per-contributor setting, the rule covers it)`);
}

// ── R6 · no branch name may shadow a top-level directory ─────────────────────
// Defect: the branch `iteration` collides with the directory `iteration`, so
// `git log -1 iteration` fails with "both revision and filename".
//
// Status is KNOWN-ACCEPTED, not PASS. The finding is real and stays visible on every
// run; it is not a failure because renaming a 200-commit branch is the owner's call and
// a check that fails forever for a decision nobody has made yet is a check people learn
// to ignore -- which would weaken R1 to R5. The distinction between "known and accepted"
// and "clean" is the point; collapsing them either way loses information.
{
  const dirs = new Set(readdirSync(REPO, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).filter((n) => !n.startsWith('.')));
  let branches = [];
  try { branches = execSync('git for-each-ref --format=%(refname:short) refs/heads', { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean); } catch { /* ignore */ }
  const clashes = branches.filter((b) => dirs.has(b));
  add('R6', clashes.length === 0, 'no local branch shadows a top-level directory',
    clashes.length
      ? clashes.map((c) => `branch "${c}" collides with directory "${c}/"`).join('\n      ')
        + '\n      git log / rebase / diff report "both revision and filename" for that name.'
        + '\n      KNOWN-ACCEPTED, recorded in iteration/design/repo-defect-registry.md as D-13.'
        + '\n      Not auto-fixed: renaming a long-lived 200-commit branch is the owner\'s call.'
      : `${branches.length} local branches, no collision`,
    clashes.length ? 'known-accepted' : 'pass');
}

// ── R7 · the pre-push guard must actually be installed ───────────────────────
// Defect class: .git/hooks is untracked, so a hook cannot be committed. Writing the rule
// in branching-model.md did nothing, and a hook that exists on one machine is the same
// kind of nothing. install-hooks.mjs is the tracked artefact; this checks that it has been
// RUN in this clone, and reports absence rather than assuming presence.
{
  const problems = [];
  let hooksPath = null;
  try {
    hooksPath = execSync('git rev-parse --git-path hooks', { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (!hooksPath.startsWith('/') && !/^[A-Za-z]:/.test(hooksPath)) hooksPath = join(REPO, hooksPath);
  } catch { problems.push('cannot resolve the hooks directory'); }
  if (hooksPath) {
    const hook = join(hooksPath, 'pre-push');
    if (!existsSync(hook)) problems.push(`no pre-push hook at ${hook} - run: node iteration/tools/install-hooks.mjs`);
    else if (!readFileSync(hook, 'utf8').includes('install-hooks.mjs')) problems.push(`${hook} exists but was not written by install-hooks.mjs`);
  }
  add('R7', problems.length === 0, 'the pre-push guard is installed in this clone',
    problems.length
      ? problems.join('\n      ') + '\n      .git/hooks is untracked, so committing cannot fix this - the script has to be run per clone.'
      : 'pre-push refuses to push from a stale or diverged branch (bypass: git push --no-verify)');
}

const failed = results.filter((r) => r.status === 'fail');
const accepted = results.filter((r) => r.status === 'known-accepted');
if (JSON_OUT) console.log(JSON.stringify({ repo: REPO, passed: failed.length === 0, exitCode: failed.length ? 1 : 0, checks: results }));
else {
  console.log('repo hygiene — every rule here was violated while nothing looked\n');
  for (const r of results) {
    const tag = r.status === 'pass' ? 'PASS' : r.status === 'known-accepted' ? 'KNOWN' : 'FAIL';
    console.log(`${tag}  ${r.id}  ${r.title}`);
    if (r.detail) console.log(`      ${r.detail}`);
  }
  console.log('');
  const parts = [];
  if (failed.length) parts.push(`${failed.length} violated: ${failed.map((r) => r.id).join(', ')}`);
  if (accepted.length) parts.push(`${accepted.length} known-accepted and recorded: ${accepted.map((r) => r.id).join(', ')}`);
  console.log(parts.length ? parts.join('  |  ') : `${results.length}/${results.length} rules hold.`);
}
process.exit(failed.length ? 1 : 0);
