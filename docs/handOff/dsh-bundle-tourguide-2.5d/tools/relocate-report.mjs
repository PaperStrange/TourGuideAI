// Relocates the merged recon report into docs/handOff/ and rewrites the relative
// links whose depth changes as a result. The file moves ONE level up
// (docs/project_lifecycle/knowledge/ -> docs/handOff/), so:
//   ../../../X -> ../../X      (targets repo root)
//   ../../X    -> ../X         (targets docs/)
//   ../handOff/X -> X          (was a sibling dir, now this very directory)
// Usage: node relocate-report.mjs
import { readFileSync, writeFileSync, existsSync, unlinkSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve('docs/project_lifecycle/knowledge/recon-2.5d-game-research.md');
const DST = resolve('docs/handOff/recon-2.5d-game-research.md');
const SUPERSEDED = resolve('docs/handOff/_superseded-old-pass.md');

if (!existsSync(SRC)) { console.error('source not found: ' + SRC); process.exit(1); }

// 1. Stash the superseded pass out of the way (do not delete until the move verifies).
if (existsSync(DST)) renameSync(DST, SUPERSEDED);

// 2. Rewrite links, most-specific prefix first.
let text = readFileSync(SRC, 'utf8');
const before = text.length;
const counts = {};
const apply = (from, to) => {
  const n = text.split(from).length - 1;
  if (n) { counts[`${from} -> ${to}`] = n; text = text.split(from).join(to); }
};
apply('../../../', '../../');
apply('../../', '../');
apply('../handOff/', '');
console.log('link rewrites:');
for (const [k, v] of Object.entries(counts)) console.log(`  ${v,3}x  ${k}`);
console.log(`  (${before} -> ${text.length} chars)`);

// 3. Move.
writeFileSync(DST, text, 'utf8');
unlinkSync(SRC);
console.log(`moved -> ${DST}`);
console.log(`superseded pass parked at ${SUPERSEDED}`);
