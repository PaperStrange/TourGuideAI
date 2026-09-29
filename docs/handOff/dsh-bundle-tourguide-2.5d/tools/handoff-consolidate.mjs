// handOff restructure, step 2: consolidate evidence dirs by PURPOSE, then
// rewrite the (few) inbound path references in the document layer.
// Dry-run unless --apply.
import { existsSync, mkdirSync, renameSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const HO = join(ROOT, 'docs', 'handOff');
const APPLY = process.argv.includes('--apply');

// from -> to. Every target directory is created as needed.
const MOVES = [
  ['engine-evidence', 'archive/engine'],
  ['recon-tmp', 'archive/page-cache'],
  ['research-scratch', 'archive/fetch-scripts'],   // then corpora/ is lifted out below
  ['recon-sections', 'recon/sections'],
];
// Directory renames inside archive/ after the move above.
const LIFTS = [
  ['archive/fetch-scripts/recon2', 'archive/corpora/geo-japan'],
];

// Inbound path references to rewrite, in the document layer.
const REF_REWRITES = [
  ['engine-evidence/', 'archive/engine/'],
  ['engine-evidence\\', 'archive\\engine\\'],
  ['recon-tmp/', 'archive/page-cache/'],
  ['recon-tmp\\', 'archive\\page-cache\\'],
  ['recon-sections/', 'recon/sections/'],
  ['recon-sections\\', 'recon\\sections\\'],
  ['research-scratch/recon2/', 'archive/corpora/geo-japan/'],
  ['research-scratch/', 'archive/fetch-scripts/'],
  ['docs/handOff/evidence/', 'docs/handOff/evidence/'],   // unchanged, documents intent
];

console.log('MOVES');
for (const [a, b] of MOVES) console.log(`  ${existsSync(join(HO, a)) ? 'OK  ' : 'MISS'} ${a}  ->  ${b}`);
console.log('LIFTS');
for (const [a, b] of LIFTS) console.log(`  ${existsSync(join(HO, a.split('/').slice(0, -1).join('/'))) ? '?   ' : 'MISS'} ${a}  ->  ${b}`);

const DOC_TARGETS = ['design', 'recon', 'reference', 'README.md'];
function docFiles() {
  const out = [];
  for (const t of DOC_TARGETS) {
    const p = join(HO, t);
    if (!existsSync(p)) continue;
    if (statSync(p).isFile()) { out.push(p); continue; }
    const rec = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const q = join(d, e.name);
        if (e.isDirectory()) rec(q);
        else if (e.name.endsWith('.md')) out.push(q);
      }
    };
    rec(p);
  }
  return out;
}

console.log('\nREFERENCE REWRITES');
const hits = [];
for (const f of docFiles()) {
  const before = readFileSync(f, 'utf8');
  let after = before;
  for (const [a, b] of REF_REWRITES) if (a !== b) after = after.split(a).join(b);
  if (after !== before) {
    const n = REF_REWRITES.reduce((acc, [a, b]) => acc + (a !== b ? before.split(a).length - 1 : 0), 0);
    hits.push({ f, after, n });
    console.log(`  ${relative(HO, f)}  (${n} replacement(s))`);
  }
}
if (hits.length === 0) console.log('  (none)');

if (!APPLY) { console.log('\n(dry run — nothing moved)'); process.exit(0); }

for (const [a, b] of MOVES) {
  const from = join(HO, a);
  if (!existsSync(from)) continue;
  const to = join(HO, b);
  mkdirSync(join(to, '..'), { recursive: true });
  renameSync(from, to);
}
for (const [a, b] of LIFTS) {
  const from = join(HO, a);
  if (!existsSync(from)) continue;
  const to = join(HO, b);
  mkdirSync(join(to, '..'), { recursive: true });
  renameSync(from, to);
}
for (const h of hits) writeFileSync(h.f, h.after, 'utf8');
console.log(`\napplied: ${MOVES.length} move(s), ${LIFTS.length} lift(s), ${hits.length} document(s) rewritten`);
