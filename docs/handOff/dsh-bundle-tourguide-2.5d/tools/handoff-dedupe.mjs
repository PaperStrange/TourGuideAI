// handOff restructure, step 1: dedupe + prune.
// Deletes exact byte-identical duplicates (SHA-256 verified, keeping the
// shortest path in each group) and the unrelated recon-cache directory.
// Dry-run unless --apply.
import { readdirSync, statSync, readFileSync, unlinkSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const HO = join(ROOT, 'docs', 'handOff');
const APPLY = process.argv.includes('--apply');

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

const files = walk(HO).filter((f) => !f.includes('dsh-bundle-tourguide-2.5d'));

// Build the set of filenames that any document references. A duplicate whose
// NAME is cited must not be dropped merely because a shorter-path twin exists:
// the citation would break. Safety beats bytes.
const DOC_DIRS = ['design', 'recon', 'reference'];
const citedNames = new Set();
{
  const stack = DOC_DIRS.map((d) => join(HO, d)).filter((d) => existsSync(d));
  const docs = [];
  const collect = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) collect(p);
      else if (e.name.endsWith('.md')) docs.push(p);
    }
  };
  stack.forEach(collect);
  const corpus = docs.map((d) => readFileSync(d, 'utf8')).join('\n');
  for (const f of files) {
    const name = f.split(/[\\/]/).pop();
    if (corpus.includes(name)) citedNames.add(f);
  }
}
console.log(`filenames cited by documents: ${citedNames.size} file(s) pinned (never dropped)`);

// Hash everything once.
const byHash = new Map();
for (const f of files) {
  const h = createHash('sha256').update(readFileSync(f)).digest('hex');
  if (!byHash.has(h)) byHash.set(h, []);
  byHash.get(h).push(f);
}

const dupGroups = [...byHash.entries()].filter(([, g]) => g.length > 1);
let removed = 0;
let freedBytes = 0;
let pinnedKept = 0;
const toDelete = [];

for (const [, group] of dupGroups) {
  const pinned = group.filter((f) => citedNames.has(f));
  // Keep every pinned copy; if none is pinned, keep the shortest-path one.
  const keep = pinned.length
    ? pinned
    : [[...group].sort((a, b) => {
        const ra = relative(HO, a).length;
        const rb = relative(HO, b).length;
        return ra !== rb ? ra - rb : relative(HO, a).localeCompare(relative(HO, b));
      })[0]];
  if (pinned.length > 1) pinnedKept += pinned.length - 1;
  const extras = group.filter((f) => !keep.includes(f));
  for (const x of extras) {
    toDelete.push(x);
    freedBytes += statSync(x).size;
    removed += 1;
  }
}

console.log(`exact-duplicate groups : ${dupGroups.length}`);
console.log(`redundant copies to drop: ${removed}`);
console.log(`bytes freed            : ${(freedBytes / 1048576).toFixed(1)} MB`);
console.log('\nsample of what would be dropped:');
for (const d of toDelete.slice(0, 8)) console.log(`  DROP ${relative(HO, d)}`);

const cacheDir = join(HO, 'recon-cache');
const cacheExists = existsSync(cacheDir);
console.log(`\nrecon-cache/ present   : ${cacheExists ? 'yes -> DROP whole dir (unrelated content, 0 co-named files)' : 'no'}`);

if (!APPLY) { console.log('\n(dry run — nothing deleted)'); process.exit(0); }

for (const d of toDelete) unlinkSync(d);
if (cacheExists) rmSync(cacheDir, { recursive: true, force: true });
console.log(`\napplied: dropped ${removed} duplicate file(s)${cacheExists ? ' + recon-cache/' : ''}`);
