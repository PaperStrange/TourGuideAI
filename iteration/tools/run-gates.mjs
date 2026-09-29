// Local mirror of the fact-integrity CI gates.
//
// Why this exists as a script and not only as a workflow file: a `uses:` workflow can
// only be proven by a push, so without this the gates stay unverifiable until CI
// actually runs them. This runs the identical sequence locally, with the same exit
// semantics the gates define, and is what the workflow invokes.
//
// Exit contract, deliberately NOT collapsed:
//   0  all gates green
//   1  a FACT-LAYER violation - someone must open a source or delete a record
//   2  an ENVIRONMENT or usage problem - a pack, an enum or a tool could not be found
//      These want different responses, so they must not share a code.
//
// Usage: node iteration/tools/run-gates.mjs [--json] [--pack <dir>]
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO = resolve(import.meta.dirname, '../..');
const JSON_OUT = process.argv.includes('--json');
const packIdx = process.argv.indexOf('--pack');
const PACK = resolve(packIdx > 0 ? process.argv[packIdx + 1] : join(REPO, 'city-packs', 'kyoto-shijo'));
const BUNDLE = join(REPO, 'docs', 'handOff', 'dsh-bundle-tourguide-2.5d');

/** One gate. `envExit2` marks the patterns that mean "could not run", not "found bad data". */
const GATES = [
  { id: 'hygiene', name: 'repo hygiene (documented rules vs reality)', cmd: ['node', join(REPO, 'iteration', 'tools', 'check-repo-hygiene.mjs')],
    why: 'R1-R6: workflow branch refs, workflows README, UTF-8 text, gates tracked, line endings, branch/dir collisions' },
  { id: 'deps', name: 'every tracked script dependency is tracked', cmd: ['node', join(REPO, 'iteration', 'tools', 'find-untracked-deps.mjs')],
    why: 'a file read by a tracked script but not itself tracked is absent from a clean checkout' },
  { id: 'contract', name: 'geo contract (world-grid)', cmd: ['node', join(BUNDLE, 'tools', 'world-grid.mjs')],
    why: 'frozen projection, grid, origin and valueKind; 18 assertions' },
  { id: 'export', name: 'export boundary', cmd: ['node', join(BUNDLE, 'tools', 'assert-export-boundary.mjs'), '--self-test'],
    why: 'no fact-shaped prose may reach the exported guide' },
  { id: 'pack-stock', name: 'city pack (stock contract gate)', cmd: ['node', join(BUNDLE, 'tools', 'validate-city-pack.mjs'), PACK],
    why: 'the contract gate that existed before any pack; checks provenance PRESENCE' },
  { id: 'pack-v2', name: 'city pack (fact-layer gate)', cmd: ['node', join(PACK, 'validate-city-pack-v2.mjs'), '--json'],
    why: 'provenance ADEQUACY: URLs opened, per-entry sources, counts re-derived, enum imported' },
  { id: 'source-align', name: 'recorded values appear in the source they cite', cmd: ['node', join(REPO, 'iteration', 'tools', 'check-source-alignment.mjs')],
    why: 'D-14: check A proves a URL resolves; this proves the VALUE is in that source and not a different one' },
  { id: 'scene', name: 'scene emit (real geometry through the frozen projection)', cmd: ['node', join(REPO, 'iteration', 'tools', 'emit-scene.mjs'), '--assert'],
    why: 'real OSM geometry through a projection whose assertions had only ever seen a synthetic fixture; rejection, determinism, traversal independence' },
  { id: 'scene-read', name: 'scene.bin is readable from its bytes by a reader that is not the emitter', cmd: ['node', join(REPO, 'iteration', 'tools', 'gate-scene-read.mjs'), '--bake-if-absent'],
    why: 'Gate 1 needs a walkable world and nothing reads the scene today; this is the second independent reader of the container, which is the posture emit-guide chose when it stopped trusting it' },
  { id: 'doors', name: 'doors (strict release gate)', cmd: ['node', join(PACK, 'validate-doors.mjs'), '--strict'],
    why: '--strict, because a declared blocker must fail the release gate' },
  { id: 'build', name: 'pack build is reproducible', cmd: ['node', join(PACK, 'evidence', 'tools', 'build-pack.mjs')],
    why: '9 stages; exits non-zero if validation fails, so it doubles as a reproducibility check' },
  // Last, and with --no-fetch on purpose: CI and a git-archive export must not require
  // network reachability, and a checker that fails for lack of network is a checker people
  // disable. Comparing against the refs already present still catches local divergence,
  // and install-hooks.mjs puts the fetching version in a pre-push hook where it matters.
  // This gate GENERATES what it validates. build/ is gitignored -- correctly, it is a build
  // product -- so a clean checkout has no guide to check, and the first version of this entry
  // exited 2 with 'could not RUN' on a fresh clone while passing on my machine, where the file
  // happened to exist. That is the sixth instance of a verdict that depended on how the working
  // copy was prepared rather than on the repository, and the fix is the same each time: make the
  // gate self-sufficient. It must also bake the scene first, because the guide refuses to
  // describe a world built under a different contract -- and that refusal is worth keeping.
  { id: 'guide', name: 'guide export (the door that finally has something behind it)', cmd: ['node', join(REPO, 'iteration', 'tools', 'gate-guide.mjs')],
    why: 'the export boundary proved in task-4 asserted a door with nothing behind it; this asserts the artefact, including that the guide refuses to describe a scene baked under a different contract' },
  // Placed AFTER gate-guide so the export exists: the walk must reconcile against guide.json and
  // cannot bake it itself. That is ordering for an INPUT, not a verdict that depends on how the
  // working copy was prepared -- the viewer still bakes its own scene.bin via --bake-if-absent,
  // so a clean clone runs both gates without a predecessor's help for the artefact it owns.
  { id: 'viewer', name: 'walkable shell (the world, walked)', cmd: ['node', join(REPO, 'iteration', 'tools', 'check-viewer.mjs'), '--bake-if-absent'],
    why: 'a collision-constrained walker follows the drifting street centreline end to end; doors present and reconciled with the export; frames deterministic' },
  { id: 'viewer-page', name: 'the baked page actually runs', cmd: ['node', join(REPO, 'iteration', 'tools', 'check-viewer-page.mjs'), '--bake-if-absent'],
    why: 'the page own JavaScript executed headlessly against a DOM stub -- that it baked is not that it runs' },  { id: 'branch-sync', name: 'no local branch is stale or diverged', cmd: ['node', join(REPO, 'iteration', 'tools', 'check-branch-sync.mjs'), '--no-fetch'],
    why: 'a local branch behind its remote is how a commit lands on a 199-commit-old base' },
];

if (!existsSync(PACK)) {
  const msg = `pack not found: ${PACK}`;
  console.log(JSON_OUT ? JSON.stringify({ passed: false, envError: msg, gates: [] }) : `ENV ERROR  ${msg}`);
  process.exit(2);
}

const results = [];
for (const g of GATES) {
  const r = spawnSync(g.cmd[0], g.cmd.slice(1), { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const code = r.status ?? 1;
  // Distinguish "could not run" from "ran and found a violation". A missing tool, an
  // unreadable pack or a bad argument is an environment problem, not a data problem.
  const envProblem = code === 2 || /usage error|cannot find module|ENOENT|not found/i.test(out);
  // Pick the line that best describes the outcome, and let the EXIT CODE decide what
  // kind of line to look for. Naively taking the last line printed a plan-view drawing;
  // naively grepping for /FAIL\b/ printed "FAIL-CLOSED as required", which is the export
  // gate DESCRIBING correct behaviour. So: a failing run looks for a failure line with
  // FAIL as a standalone token, and a passing run looks for a completion marker.
  const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
  const notArt = (l) => !/^[\s+:#.=D]*$/.test(l);
  const pick = code === 0
    // Prefer a summary that also carries a SKIP count. world-grid prints
    // "16/18 assertions passed, 0 failed, 2 skipped" when the measurement records are
    // absent from the tree, and matching only on 'assertions passed' silently hides the
    // skips: the reader sees PASS and a fraction and never learns two checks did not run.
    // A skipped assertion is not a passed one, and the summary line is where that shows.
    ? lines.find((l) => /skipped/i.test(l) && /passed/i.test(l)) ??
      lines.find((l) => /SELF-TEST PASS|assertions? passed|\d+\s+checks? passed|BUILD OK|all facts carry provenance/i.test(l)) ?? lines.filter(notArt).slice(-1)[0] ?? ''
    : lines.find((l) => /(^|\s)FAIL(\s|$)/.test(l)) ??
      lines.find((l) => /\b(ENOENT|Error:|usage error|could not|not found)\b/i.test(l)) ??
      lines.filter(notArt).slice(-1)[0] ?? '';
  // Surface skips as a warning even on a green gate, so a partial run is never read as a
  // complete one. This is the same distinction the gates themselves make.
  const skipped = /(\d+)\s+skipped/i.exec(out);
  // On failure, keep the last few lines of RAW output rather than one chosen summary.
  // Losing the trace is why a CI-only crash in this very runner took a log download to
  // diagnose: the summary line said "Node.js v22.23.2" and the actual error had been
  // discarded. A gate that fails must carry its reason out with it.
  const tail = code === 0 ? [] : lines.filter(notArt).slice(-6);
  results.push({ id: g.id, name: g.name, why: g.why, code, ok: code === 0, envProblem, skipped: skipped ? Number(skipped[1]) : 0, lastLine: pick.slice(0, 220), tail });
  if (!JSON_OUT) {
    const status = code === 0 ? 'PASS' : envProblem ? 'ENV ' : 'FAIL';
    console.log(`${status}  ${g.name}`);
    console.log(`      ${results.at(-1).lastLine}`);
    if (results.at(-1).skipped) console.log(`      WARNING: ${results.at(-1).skipped} assertion(s) SKIPPED - this gate did not fully run.`);
    if (tail.length) {
      console.log('      --- last output before exit ---');
      for (const l of tail) console.log(`      ${l.slice(0, 150)}`);
    }
  }
}

const failed = results.filter((r) => !r.ok);
const skippedGates = results.filter((r) => r.ok && r.skipped > 0);
const envFailed = failed.filter((r) => r.envProblem);
// A gate that skipped assertions did not fully run, so it must not count as green.
// world-grid reports "16/18 assertions passed, 0 failed, 2 skipped" when the measurement
// records are absent -- it degrades honestly, but a runner that accepts that as a pass
// would go green while two assertions never executed. It now fails, with the skip count,
// because a partial run read as complete is the failure this whole harness exists to stop.
const exitCode = envFailed.length ? 2 : failed.length || skippedGates.length ? 1 : 0;

if (JSON_OUT) {
  console.log(JSON.stringify({ repo: REPO, pack: PACK, passed: exitCode === 0, exitCode, skipped: skippedGates.reduce((n, r) => n + r.skipped, 0), gates: results }));
} else {
  console.log('');
  if (exitCode === 0) console.log(`${results.length}/${results.length} gates passed, no skips.`);
  else if (envFailed.length) console.log(`${failed.length} gate(s) could not RUN: ${envFailed.map((r) => r.id).join(', ')} - environment, not data.`);
  else if (failed.length) console.log(`${failed.length} gate(s) FAILED: ${failed.map((r) => r.id).join(', ')} - a fact-layer violation.`);
  if (skippedGates.length) {
    console.log(`${skippedGates.length} gate(s) SKIPPED assertions and so did not fully run: ${skippedGates.map((r) => `${r.id} (${r.skipped})`).join(', ')}`);
    console.log('  A skipped assertion is not a passed one. Fix the missing input rather than the gate.');
  }
}
process.exit(exitCode);
