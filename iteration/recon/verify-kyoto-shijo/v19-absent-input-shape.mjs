// v19-absent-input-shape.mjs — I told the Lead "any check that uses existsSync ? read : null
// is in this shape, and there is more than one in this repo." That was a claim, not a finding.
// Test it: find every site where a MISSING input changes a check's verdict rather than failing it.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
const scripts = tracked.filter(f => /\.(mjs|js|ts)$/.test(f) && /^(iteration|docs|city-packs)\//.test(f));
console.log(`scanning ${scripts.length} tracked scripts\n`);

// Shapes where a missing input yields a VALUE instead of an error:
//   A. existsSync(...) ? read... : <fallback>        -> ternary fallback
//   B. if (existsSync(...)) { ... }   with an else that does NOT throw/exit
//   C. catch { } / try{}catch{} that swallows a read error
//   D. fs.existsSync used to guard a check, where the guarded branch only records a result
const shapes = [
  { id: 'A', re: /existsSync\([^)]*\)\s*\?[^:]{0,80}:\s*([^;\n]{1,80})/g, label: 'ternary fallback on existsSync' },
  { id: 'C', re: /catch\s*(\([^)]*\))?\s*\{\s*(\/\*[^*]*\*\/\s*)?\}/g, label: 'empty catch (swallowed error)' },
  { id: 'D', re: /existsSync\(([^)]*)\)/g, label: 'existsSync guard (needs manual read)' },
];

const hits = { A: [], C: [], D: [] };
for (const f of scripts) {
  let src;
  try { src = readFileSync(f, 'utf8'); } catch { continue; }
  // skip my own verification scripts and the audit tooling itself
  for (const sh of shapes) {
    sh.re.lastIndex = 0;
    let m;
    while ((m = sh.re.exec(src))) {
      const line = src.slice(0, m.index).split('\n').length;
      hits[sh.id].push({ f, line, text: m[0].replace(/\s+/g, ' ').slice(0, 110) });
    }
  }
}

console.log('===== shape A: existsSync ? read : fallback  (a missing file yields a VALUE) =====');
for (const h of hits.A) console.log(`  ${h.f}:${h.line}\n      ${h.text}`);

console.log('\n===== shape C: empty catch (a read error is swallowed) =====');
for (const h of hits.C) console.log(`  ${h.f}:${h.line}\n      ${h.text}`);

console.log(`\n===== shape D summary: existsSync guards, by file (manual triage needed) =====`);
const byFile = {};
for (const h of hits.D) byFile[h.f] = (byFile[h.f] || 0) + 1;
Object.entries(byFile).sort((a, b) => b[1] - a[1]).forEach(([f, n]) => console.log(`  ${String(n).padStart(3)}  ${f}`));

console.log(`\nshape A total: ${hits.A.length}   shape C total: ${hits.C.length}   shape D total: ${hits.D.length}`);
