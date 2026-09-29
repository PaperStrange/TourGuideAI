// Minimal-risk repair for relative links that are exactly one ../ level short.
// Only adds one "../" when that makes the target resolve to a real path; anything
// already resolving, or resolving after no change, is left untouched. This avoids
// the blanket-prefix trap of double-applying to links that were already correct.
//
// Usage: node fix-links-plus-one.mjs <file>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname, normalize } from 'node:path';

const file = process.argv[2];
if (!file) { console.error('usage: node fix-links-plus-one.mjs <file>'); process.exit(2); }

const abs = resolve(file);
const base = dirname(abs);

let text = readFileSync(abs, 'utf8');
const changes = [];
let untouched = 0;

text = text.replace(/\]\(((?:\.\.\/)+[^)\s#]+)(#[^)\s]*)?\)/g, (whole, target, frag = '') => {
  const asIs = normalize(join(base, target));
  if (existsSync(asIs)) { untouched += 1; return whole; }
  const bumped = normalize(join(base, '..', target));
  if (existsSync(bumped)) {
    changes.push(`${target}  ->  ../${target}`);
    return `](../${target}${frag})`;
  }
  // Neither resolves: report but do not guess.
  changes.push(`${target}  ->  UNRESOLVED (left as-is)`);
  return whole;
});

writeFileSync(abs, text, 'utf8');

const counts = new Map();
for (const c of changes) counts.set(c, (counts.get(c) || 0) + 1);
console.log(`applied ${changes.length} change(s), ${counts.size} distinct; ${untouched} link(s) already resolved`);
for (const [k, v] of [...counts.entries()].sort()) console.log(`  ${String(v).padStart(3)}x  ${k}`);

// Re-verify.
const lines = readFileSync(abs, 'utf8').split(/\r?\n/);
const targets = new Set();
for (const l of lines) for (const m of l.matchAll(/\]\((\.\.?\/[^)#\s]+)/g)) targets.add(m[1]);
const broken = [...targets].filter((t) => !existsSync(join(base, t)));
console.log(`\nverify: ${targets.size} distinct relative target(s), ${broken.length} broken`);
for (const b of broken) console.log(`  BROKEN ${b}`);
process.exit(broken.length ? 1 : 0);
