// Corrects relative links in a relocated Markdown file by REBASING each target
// against its new location, instead of stacking string replacements (which
// double-applies and under-counts depth).
//
// Usage: node fix-rel-links.mjs <file> <oldDirFromRepoRoot> <newDirFromRepoRoot>
//   e.g. node fix-rel-links.mjs docs/handOff/recon-2.5d-game-research.md \
//          docs/project_lifecycle/knowledge docs/handOff
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname, normalize } from 'node:path';

const [file, oldDir, newDir] = process.argv.slice(2);
if (!file || !oldDir || !newDir) {
  console.error('usage: node fix-rel-links.mjs <file> <oldDirFromRoot> <newDirFromRoot>');
  process.exit(2);
}

const ROOT = process.cwd();
const oldAbs = resolve(ROOT, oldDir);
const newAbs = resolve(ROOT, newDir);

/** Split "a/../b/c" style prefixes off a relative target. */
function rebase(target) {
  // Separate an optional #fragment so it survives unchanged.
  const hashAt = target.search(/[#?]/);
  const pathPart = hashAt >= 0 ? target.slice(0, hashAt) : target;
  const suffix = hashAt >= 0 ? target.slice(hashAt) : '';

  const parts = pathPart.split('/');
  const rest = [];
  let i = 0;
  // Consume leading '.' / '..' segments.
  while (i < parts.length && (parts[i] === '.' || parts[i] === '..' || parts[i] === '')) {
    if (parts[i] === '..') rest.push('..');
    i += 1;
  }
  const tail = parts.slice(i).join('/');
  if (!tail) return target; // nothing to rebase

  // Resolve the absolute target using the OLD base, then relativise to the NEW base.
  const absTarget = normalize(join(oldAbs, rest.join('/'), tail));
  const out = relPath(newAbs, absTarget);
  return out + suffix;
}

function relPath(fromDir, toPath) {
  const from = fromDir.split(/[\\/]/).filter(Boolean);
  const to = toPath.split(/[\\/]/).filter(Boolean);
  let k = 0;
  while (k < from.length && k < to.length && from[k] === to[k]) k += 1;
  const ups = new Array(from.length - k).fill('..');
  const downs = to.slice(k);
  const parts = ups.concat(downs);
  return parts.length ? parts.join('/') : '.';
}

let text = readFileSync(file, 'utf8');
const seen = new Map();
text = text.replace(/\]\(((?:\.\.?\/)[^)\s]*)\)/g, (whole, target) => {
  const fixed = rebase(target);
  if (fixed !== target) {
    const key = `${target}  ->  ${fixed}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  return `](${fixed})`;
});

writeFileSync(file, text, 'utf8');
console.log(`rebased ${[...seen.values()].reduce((a, b) => a + b, 0)} link(s), ${seen.size} distinct:`);
for (const [k, v] of [...seen.entries()].sort()) console.log(`  ${String(v).padStart(3)}x  ${k}`);

// Verify.
const newFileAbs = resolve(ROOT, file);
const lines = readFileSync(newFileAbs, 'utf8').split(/\r?\n/);
const base = dirname(newFileAbs);
const targets = new Set();
for (const l of lines) for (const m of l.matchAll(/\]\((\.\.?\/[^)#\s]+)/g)) targets.add(m[1]);
const broken = [...targets].filter((t) => !existsSync(join(base, t)));
console.log(`\nverify: ${targets.size} distinct relative target(s), ${broken.length} broken`);
for (const b of broken) console.log(`  BROKEN ${b}`);
process.exit(broken.length ? 1 : 0);
