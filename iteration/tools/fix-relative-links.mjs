// Repair relative links after source documents moved.
//
// For every relative link that no longer resolves:
//   1. take its TAIL (segments after the last `../`),
//   2. classify the tail as FILE (has an extension) or DIR,
//   3. resolve it against the repo root first, then against the previous parent
//      (so `../README.md` written from a doc that moved up one level still works),
//   4. re-serialise from the file's real directory.
// Anything still ambiguous is reported, never guessed.
//
// Usage: node fix-relative-links.mjs [--apply]
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, normalize, relative, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd());
const APPLY = process.argv.includes('--apply');
const SCAN = ['iteration', join('docs', 'handOff')];

const mdFiles = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === '_cache') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) mdFiles(p, out);
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out;
};

const isFileTail = (t) => /\.[A-Za-z0-9]{1,6}$/.test(t);

/** Resolve a link tail to an existing repo path, root-first then one level up. */
function resolveTail(tail, docDir) {
  const rootFirst = [ROOT, dirname(ROOT)];
  for (const base of rootFirst) {
    const abs = normalize(join(base, tail));
    if (existsSync(abs)) {
      // keep it inside the repo, and reject a bare directory match for a file tail
      if (!abs.startsWith(ROOT)) continue;
      const st = statSync(abs);
      if (isFileTail(tail) && !st.isFile()) continue;
      return abs;
    }
  }
  return undefined;
}

const files = SCAN.flatMap((s) => mdFiles(join(ROOT, s)));
let fixed = 0;
const unresolved = [];

for (const file of files) {
  const dir = dirname(file);
  const before = readFileSync(file, 'utf8');
  const notes = [];
  let changed = 0;

  const after = before.replace(/\]\((\.\.\/[^)#\s]+)(#[^)\s]*)?\)/g, (whole, target, hash = '') => {
    if (existsSync(normalize(join(dir, target)))) return whole;
    const segs = target.split('/');
    const i = segs.findIndex((s) => s !== '..' && s !== '.');
    const tail = segs.slice(i).join('/');
    const abs = resolveTail(tail, dir);
    if (!abs) { unresolved.push({ file: relative(ROOT, file), target }); return whole; }
    const rel = relative(dir, abs).split(sep).join('/');
    notes.push(`${target} -> ${rel}`);
    changed += 1;
    return `](${rel}${hash})`;
  });

  if (after !== before) {
    fixed += changed;
    console.log(`  ${relative(ROOT, file)}  (${changed})`);
    for (const n of notes) console.log(`      ${n}`);
    if (APPLY) writeFileSync(file, after, 'utf8');
  }
}

console.log(`\n${APPLY ? 'APPLIED' : 'DRY RUN'} — scanned ${files.length} md, fixed ${fixed}, unresolved ${unresolved.length}`);
for (const u of unresolved) console.log(`  UNRESOLVED ${u.file}: ${u.target}`);
