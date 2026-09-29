// Moves named files into target subdirectories and rebases every relative link
// against the file's NEW location, computing absolute targets from the OLD
// location. Deterministic orders only: no string stacking (which double-applies).
//
// Usage: node reorganize-handoff.mjs [--apply]
//   without --apply it prints the plan and mutates nothing.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { resolve, join, dirname, normalize } from 'node:path';

const ROOT = resolve(process.cwd());
const HO = join(ROOT, 'docs', 'handOff');
const APPLY = process.argv.includes('--apply');

// 1. The moves. Data/evidence dirs stay where they are.
const MOVES = [
  ['design-core.md', 'design'],
  ['appendix-visual-and-ui-spec.md', 'design'],
  ['recon-2.5d-game-research.md', 'recon'],
  ['recon-codebase-salvage.md', 'recon'],
  ['gap-analysis-and-plan.md', 'recon'],
  ['DSH-PLUGINS-FOR-2.5D.md', 'reference'],
  ['Q5_ai_in_the_loop.md', 'reference'],
  ['research-plan-jobs1.txt', 'reference'],
];

function relPath(fromDir, toPath) {
  const from = fromDir.split(/[\\/]/).filter(Boolean);
  const to = toPath.split(/[\\/]/).filter(Boolean);
  let k = 0;
  while (k < from.length && k < to.length && from[k] === to[k]) k += 1;
  const ups = new Array(from.length - k).fill('..');
  return ups.concat(to.slice(k)).join('/') || '.';
}

/** Rebase one relative target: resolve against oldDir, re-serialise from newDir. */
function rebaseTarget(target, oldDir, newDir) {
  if (!/^\.\.?\//.test(target)) return target;            // absolute/url/anchor: untouched
  const hashAt = target.search(/[#?]/);
  const pathPart = hashAt >= 0 ? target.slice(0, hashAt) : target;
  const suffix = hashAt >= 0 ? target.slice(hashAt) : '';
  const absTarget = normalize(join(oldDir, pathPart));
  return relPath(newDir, absTarget) + suffix;
}

const plan = [];
for (const [name, sub] of MOVES) {
  const from = join(HO, name);
  const to = join(HO, sub, name);
  if (!existsSync(from)) { plan.push({ name, sub, skip: 'missing' }); continue; }
  if (existsSync(to)) { plan.push({ name, sub, skip: 'destination exists' }); continue; }

  const oldDir = HO;
  const newDir = join(HO, sub);
  let text = readFileSync(from, 'utf8');
  const changes = [];
  text = text.replace(/\]\(([^)\s]+)\)/g, (whole, target) => {
    const fixed = rebaseTarget(target, oldDir, newDir);
    if (fixed !== target) changes.push(`${target} -> ${fixed}`);
    return `](${fixed})`;
  });
  plan.push({ name, sub, changes, text });
}

console.log(`handOff reorganise — ${APPLY ? 'APPLY' : 'DRY RUN'}\n`);
for (const p of plan) {
  if (p.skip) { console.log(`  SKIP  ${p.name}  (${p.skip})`); continue; }
  console.log(`  MOVE  ${p.name}  ->  ${p.sub}/   (${p.changes.length} link(s) rebased)`);
  for (const c of p.changes) console.log(`          ${c}`);
}

if (!APPLY) { console.log('\n(dry run — nothing written)'); process.exit(0); }

for (const p of plan) {
  if (p.skip) continue;
  const dir = join(HO, p.sub);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, p.name), p.text, 'utf8');
  rmSync(join(HO, p.name));
}
console.log('\napplied.');

// 2. Verify every relative link under handOff resolves.
const bad = [];
const walk = (dir) => {
  for (const e of readdirSyncSafe(dir)) {
    const full = join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (!e.name.endsWith('.md')) continue;
    for (const line of readFileSync(full, 'utf8').split(/\r?\n/)) {
      for (const m of line.matchAll(/\]\((\.\.?\/[^)#\s]+)/g)) {
        if (!existsSync(normalize(join(dirname(full), m[1])))) bad.push(`${full.replace(ROOT, '')}: ${m[1]}`);
      }
    }
  }
};
function readdirSyncSafe(dir) {
  try { return require('node:fs').readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}
walk(HO);
console.log(`\nverify: ${bad.length} broken relative link(s)`);
for (const b of bad) console.log(`  BROKEN ${b}`);
process.exit(bad.length ? 1 : 0);
