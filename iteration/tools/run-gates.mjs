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
  { id: 'contract', name: 'geo contract (world-grid)', cmd: ['node', join(BUNDLE, 'tools', 'world-grid.mjs')],
    why: 'frozen projection, grid, origin and valueKind; 18 assertions' },
  { id: 'export', name: 'export boundary', cmd: ['node', join(BUNDLE, 'tools', 'assert-export-boundary.mjs'), '--self-test'],
    why: 'no fact-shaped prose may reach the exported guide' },
  { id: 'pack-stock', name: 'city pack (stock contract gate)', cmd: ['node', join(BUNDLE, 'tools', 'validate-city-pack.mjs'), PACK],
    why: 'the contract gate that existed before any pack; checks provenance PRESENCE' },
  { id: 'pack-v2', name: 'city pack (fact-layer gate)', cmd: ['node', join(PACK, 'validate-city-pack-v2.mjs'), '--json'],
    why: 'provenance ADEQUACY: URLs opened, per-entry sources, counts re-derived, enum imported' },
  { id: 'doors', name: 'doors (strict release gate)', cmd: ['node', join(PACK, 'validate-doors.mjs'), '--strict'],
    why: '--strict, because a declared blocker must fail the release gate' },
  { id: 'build', name: 'pack build is reproducible', cmd: ['node', join(PACK, 'evidence', 'tools', 'build-pack.mjs')],
    why: '9 stages; exits non-zero if validation fails, so it doubles as a reproducibility check' },
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
  // The LAST line is often a plan-view drawing or a hash footer, not the verdict, so
  // pick the most informative line instead: an explicit failure if there is one, else
  // the assertion/check summary, else the last line that is not pure ASCII art.
  const lines = out.split('\n').map((l) => l.trim()).filter(Boolean);
  const pick =
    lines.find((l) => /\bFAIL\b/.test(l)) ??
    lines.find((l) => /\d+\s*\/\s*\d+\s+assertions? passed|\d+\s+checks? passed|SELF-TEST PASS|PASS\b/i.test(l)) ??
    lines.filter((l) => !/^[\s+:#.=D]*$/.test(l)).slice(-1)[0] ??
    '';
  results.push({ id: g.id, name: g.name, why: g.why, code, ok: code === 0, envProblem, lastLine: pick.slice(0, 200) });
  if (!JSON_OUT) {
    const status = code === 0 ? 'PASS' : envProblem ? 'ENV ' : 'FAIL';
    console.log(`${status}  ${g.name}`);
    console.log(`      ${results.at(-1).lastLine}`);
  }
}

const failed = results.filter((r) => !r.ok);
const envFailed = failed.filter((r) => r.envProblem);
const exitCode = envFailed.length ? 2 : failed.length ? 1 : 0;

if (JSON_OUT) {
  console.log(JSON.stringify({ repo: REPO, pack: PACK, passed: failed.length === 0, exitCode, gates: results }));
} else {
  console.log('');
  if (exitCode === 0) console.log(`${results.length}/${results.length} gates passed.`);
  else if (exitCode === 2) console.log(`${failed.length} gate(s) could not RUN: ${envFailed.map((r) => r.id).join(', ')} - environment, not data.`);
  else console.log(`${failed.length} gate(s) FAILED: ${failed.map((r) => r.id).join(', ')} - a fact-layer violation.`);
}
process.exit(exitCode);
