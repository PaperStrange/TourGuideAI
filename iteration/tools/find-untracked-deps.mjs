// Find every file a TRACKED script reads from disk that is NOT itself tracked.
//
// This is the check that would have caught the doors gate before CI did. Scanning the
// archive by hand missed it: the script referenced a path with no surrounding keyword
// that looked load-bearing. So this crawls the whole tracked set instead of guessing.
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';

const REPO = resolve(import.meta.dirname, '../..');

// A git-archive export has no .git, so there is no tracked-file list to compare against.
// Reporting an empty list as a pass would be the exact false negative this scanner exists
// to prevent, so it exits 2 (environment) rather than 0 (clean).
let tracked;
try {
  tracked = execSync('git ls-files', { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean);
} catch {
  console.log(`ENV  cannot list tracked files: ${REPO} is not a git working tree.`);
  console.log('     Run this in a clone, not in a git-archive export.');
  process.exit(2);
}
const trackedSet = new Set(tracked.map((p) => p.replace(/\\/g, '/')));

// Only scripts and JSON can declare a dependency.
const SOURCES = tracked.filter((p) => /\.(mjs|js|cjs|json|ps1|yml|yaml)$/.test(p));

const deps = new Map(); // repoRelPath -> Set of referring scripts
const missing = new Map();
const directories = new Map(); // bare directory references, reported separately
const written = new Map();     // paths this scanner saw WRITTEN, not read, and so does not flag

for (const rel of SOURCES) {
  const abs = join(REPO, rel);
  if (!existsSync(abs) || statSync(abs).size > 8 * 1024 * 1024) continue;
  let text;
  try { text = readFileSync(abs, 'utf8'); } catch { continue; }

  // A path appearing in a tracked script is NOT the same as that script READING it.
  //
  // This scanner reported iteration/viewer/index.html as an untracked dependency because
  // bake-viewer.mjs names it -- but bake-viewer WRITES it, and a build product that a tracked
  // script produces is the opposite of a missing input. A grep cannot tell reading from writing,
  // and the first attempt at the distinction failed for a reason worth recording: the candidate
  // path only looked like a path because it was being resolved against the repo root, while the
  // real expression was join(OUT_DIR, 'index.html') -- a bare FILENAME, which no path-shaped
  // regex will ever match. Getting this exact would need a JavaScript parser, for a check whose
  // whole purpose is to cost a glance, so the rule is deliberately coarse instead.
  //
  // A file is treated as WRITTEN when some script contains a writing call AND, somewhere in that
  // same script, every segment of this repo-relative path appears as a string literal. For
  // bake-viewer.mjs that is satisfied: it writes, and 'iteration', 'viewer' and 'index.html' all
  // appear. Over-detecting "written" is the safe direction -- it can only hide a dependency whose
  // sole reference is a write, and such a thing is not a dependency.
  const writesSomething = /(?:writeFileSync|writeFile|createWriteStream|mkdirSync|appendFileSync|rmSync|unlinkSync|cpSync)\s*\(/.test(text);
  const literalFragments = new Set();
  if (writesSomething) for (const m of text.matchAll(/['"`]([^'"`\n]{1,120})['"`]/g)) literalFragments.add(m[1]);
  const isWrittenHere = (rr) => writesSomething && rr.split('/').every((seg) => literalFragments.has(seg));

  // Quoted strings that look like a repo-relative path. Deliberately permissive:
  // a false positive costs a glance, a false negative costs a gate.
  for (const m of text.matchAll(/['"`]((?:\.\.?\/|[A-Za-z0-9_-]+\/)[^'"`\n]{3,120})['"`]/g)) {
    let cand = m[1];
    if (/^https?:|^\$\{|[<>*?]/.test(cand)) continue;

    // Resolve relative to the declaring file, then relative to the repo root.
    for (const base of [dirname(abs), REPO]) {
      const r = resolve(base, cand);
      if (!r.startsWith(REPO)) continue;
      const repoRel = r.slice(REPO.length + 1).replace(/\\/g, '/');
      if (!existsSync(r)) continue;                       // not on disk at all: ignore
      if (trackedSet.has(repoRel)) continue;              // tracked: fine
      if (isWrittenHere(repoRel)) {                          // written by this script, not read from it
        if (!written.has(repoRel)) written.set(repoRel, new Set());
        written.get(repoRel).add(rel);
        continue;
      }
      if (repoRel.includes('node_modules')) continue;     // expected to be absent
      const owner = repoRel.split('/')[0];
      if (!['docs', 'city-packs', 'iteration'].includes(owner)) continue;

      // A bare DIRECTORY is not a dependency. Git does not track directories, so
      // "this directory is untracked" is true of every directory that contains only
      // ignored files, and reporting it as a missing dependency buries the real ones.
      // Counted and reported separately rather than dropped, so the boundary is visible.
      if (statSync(r).isDirectory()) {
        if (!directories.has(repoRel)) directories.set(repoRel, new Set());
        directories.get(repoRel).add(rel);
        continue;
      }

      if (!missing.has(repoRel)) missing.set(repoRel, new Set());
      missing.get(repoRel).add(rel);
    }
  }
}

console.log(`scanned ${SOURCES.length} tracked scripts/data files of ${tracked.length} tracked files`);

if (directories.size) {
  console.log(`\n${directories.size} bare directory reference(s), not counted as dependencies:`);
  for (const [d, refs] of [...directories].sort()) console.log(`  ${d}/  (named by ${refs.size} file(s))`);
}

if (missing.size === 0) {
  console.log('\nOK - every untracked FILE read by a tracked script is accounted for.');
  process.exit(0);
}

console.log(`\n${missing.size} untracked FILE(s) are read by tracked scripts, so they are`);
console.log('ABSENT from a clean checkout and any gate that needs them cannot run:\n');
for (const [dep, refs] of [...missing].sort()) {
  const size = existsSync(join(REPO, dep)) ? statSync(join(REPO, dep)).size : 0;
  console.log(`  ${dep}`);
  console.log(`      ${(size / 1024).toFixed(1)} KB, referred by ${refs.size} file(s):`);
  for (const r of [...refs].slice(0, 4)) console.log(`        ${r}`);
}
console.log('\nEither track them, or make the gate fail loudly when they are absent.');
process.exit(1);
