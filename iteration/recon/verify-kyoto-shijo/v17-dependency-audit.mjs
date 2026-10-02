// v17-dependency-audit.mjs — apply R2″ to my own scripts BEFORE being told twice.
// For every file my verification scripts read, is that file tracked by git?
// An untracked read is a derived-file dependency: either drop it, or justify it in-line.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const DIR = 'iteration/recon/verify-kyoto-shijo';
const files = readdirSync(DIR).filter(f => f.endsWith('.mjs')).sort();
console.log(`auditing ${files.length} scripts in ${DIR}\n`);

// git ls-files gives the tracked set; anything else is derived
let tracked;
try {
  tracked = new Set(execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean));
} catch (e) { console.log('git ls-files failed:', e.message); process.exit(1); }
console.log(`repo tracks ${tracked.size} files\n`);

const isTracked = (p) => tracked.has(p.replace(/\\/g, '/'));

// find every literal path-like string a script passes to a read call
const READ_RE = /(?:readFileSync|readFile|readFileSync\(|existsSync|createHash\([^)]*\)\.update\(|JSON\.parse\(readFileSync)\s*\(\s*['"`]([^'"`]+)['"`]/g;
const STR_RE = /['"`]([A-Za-z0-9_\-./]+\.(?:json|bin|md|mjs|html|txt|csv|pdf))['"`]/g;

const rows = [];
for (const f of files) {
  const src = readFileSync(`${DIR}/${f}`, 'utf8');
  const hits = new Set();
  for (const re of [READ_RE, STR_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      const p = m[1];
      if (/^https?:/.test(p)) continue;
      if (/^(node:|\.\/|\.\.\/)/.test(p) && !p.includes('/')) continue;
      hits.add(p);
    }
  }
  for (const p of [...hits].sort()) {
    // resolve relative to repo root (my scripts use repo-root-relative literals)
    const cand = [p, `iteration/recon/verify-kyoto-shijo/${p}`].find(c => existsSync(c));
    if (!cand) continue;
    rows.push({ script: f, path: cand, tracked: isTracked(cand) });
  }
}

const untracked = rows.filter(r => !r.tracked);
console.log('===== reads of UNTRACKED (derived) files =====');
if (!untracked.length) console.log('  (none)');
for (const r of untracked) console.log(`  ${r.script.padEnd(34)} -> ${r.path}`);

console.log('\n===== reads of tracked files (fine) =====');
const seen = new Set();
for (const r of rows.filter(r => r.tracked)) {
  const k = `${r.script}|${r.path}`;
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`  ${r.script.padEnd(34)} -> ${r.path}`);
}

console.log(`\nsummary: ${rows.length} read-edges, ${untracked.length} of them to untracked files`);
