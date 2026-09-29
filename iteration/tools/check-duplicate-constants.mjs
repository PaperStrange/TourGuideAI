// A check for the defect I have now watched happen twice in one session: a constant that one file
// defines and another file COPIES instead of importing.
//
// WHY THIS EXISTS, and it is not hypothetical. VALUE_KINDS was mirrored into doors.json and went
// stale the moment geo-contract added a fifth member -- that is D-12, and its recorded lesson is
// that mirrored copies drift and imports do not. Then SCENE_VERSION sat defined twice, once in
// emit-scene.mjs and once in emit-guide.mjs, and I watched the second copy disagree with the first
// during task-18: emit-scene moved to 2 while emit-guide still said 1, which is precisely the
// state that makes a reader accept a container it should refuse.
//
// The first instance cost a red gate; the second was caught by eye while reading a diff. Neither
// is a mechanism. This is.
//
// HOW IT WORKS, and the limit is stated rather than hidden. It collects exported const/let
// declarations that hold a primitive literal (number, string, boolean) from the contract and the
// tools, then looks for the SAME NAME redeclared with a literal in a DIFFERENT file. A name that
// is imported is not a copy. A name declared twice with the same value IS still reported, because
// two copies that agree today disagree after one edit -- and reporting only the disagreements
// would miss the moment before the edit, which is the only moment the fix is cheap.
//
// WHAT IT DOES NOT CATCH: a copy under a DIFFERENT name (the `kmUpTo` class of problem), and a
// literal inlined at a use site rather than bound to a name. Both need real dataflow analysis.
// Stated here so the guard is not read as airtight -- a guard whose limits are unknown gets
// trusted for things it cannot do.
import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const REPO = join(import.meta.dirname, '..', '..');
const JSON_OUT = process.argv.includes('--json');

// Scan the contract and everything under iteration/tools. Deliberately not the whole repo: the
// previous product under src/ is full of duplicate names and is not ours to police.
const roots = [
  'docs/handOff/dsh-bundle-tourguide-2.5d/tools',
  'iteration/tools',
  'iteration/viewer',
];

let tracked = [];
try {
  tracked = execSync('git ls-files', { cwd: REPO, encoding: 'utf8' }).split('\n').filter(Boolean);
} catch {
  console.log('ENV  not a git working tree, cannot distinguish tracked sources');
  process.exit(2);
}
const trackedSet = new Set(tracked.map((p) => p.replace(/\\/g, '/')));

const files = tracked.filter((p) => /\.(mjs|js)$/.test(p) && roots.some((r) => p.startsWith(r + '/')));

// name -> [{ file, line, value, kind }]
const declared = new Map();
// names imported anywhere, so a redeclaration can be told from a legitimately different symbol
const importedSomewhere = new Set();

for (const rel of files) {
  const abs = join(REPO, rel);
  if (!existsSync(abs)) continue;
  const text = readFileSync(abs, 'utf8');
  const lines = text.split('\n');

  for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) importedSomewhere.add(name);
    }
  }

  lines.forEach((line, i) => {
    // Any top-level const/let holding a primitive, exported or not.
    //
    // The first version required `export`, and that made it report OK on a tree where
    // emit-guide.mjs declares SCENE_VERSION twice over -- once imported in spirit from
    // emit-scene.mjs and once as a bare `const SCENE_VERSION = 1`. A COPY IS MOST OFTEN NOT
    // EXPORTED, because the copier had no intention of anyone importing it; requiring `export`
    // therefore excluded exactly the case this check exists for. Found by running it against a
    // tree I already knew was wrong, which is the only way to find out a check does nothing.
    const m = line.match(/^(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?);\s*(?:\/\/.*)?$/);
    if (!m) return;
    const [, name, rawInit] = m;
    const init = rawInit.trim();
    // Only primitives. An object or a call is a different thing and comparing them textually
    // would produce noise, which is how a guard gets switched off.
    if (!/^-?\d+(\.\d+)?$/.test(init) && !/^'[^']*'$/.test(init) && !/^"[^"]*"$/.test(init) && init !== 'true' && init !== 'false') return;
    if (!declared.has(name)) declared.set(name, []);
    declared.get(name).push({ file: rel, line: i + 1, value: init });
  });
}

const problems = [];
for (const [name, sites] of declared) {
  if (sites.length < 2) continue;
  const values = [...new Set(sites.map((s) => s.value))];
  const agrees = values.length === 1;
  // Two kinds of duplicate, and only one of them should turn a gate red.
  //
  // A duplicate of a CONTRACT constant -- a magic value, a version, an origin, a directory a
  // consumer must agree on -- is a defect whether or not the copies currently agree, because the
  // next edit is the one nobody re-reads. That is D-12 and it cost a red gate.
  //
  // A local-looking constant that two unrelated files happen to name the same way ('PACK',
  // 'MAGIC_HEADER') is usually not a shared value at all; reporting those as failures would make
  // the check noisy, and a noisy check gets switched off. They are listed and not counted.
  const isContractShaped = /MAGIC|VERSION|ORIGIN|GRID|HASH|SEED|PREFIX|SCHEMA/.test(name);
  // A machine-specific absolute path in a tracked script is ALWAYS a defect, whichever file it is
  // in: it means that script cannot run in a clean checkout at all.
  const isMachinePath = sites.some((s) => /^'[A-Za-z]:[\\/]/.test(s.value) || /^'\/Users\/|^'\/home\//.test(s.value));
  const blocking = isMachinePath || (isContractShaped && sites.some((s) => s.file.startsWith('iteration/tools/') || s.file.startsWith('docs/handOff/')));
  problems.push({
    name,
    agrees,
    blocking,
    values,
    sites: sites.map((s) => `${s.file}:${s.line} = ${s.value}`),
    importedSomewhere: importedSomewhere.has(name),
  });
}

const blocking = problems.filter((p) => p.blocking);
const noted = problems.filter((p) => !p.blocking);

if (JSON_OUT) {
  console.log(JSON.stringify({ scanned: files.length, blocking: blocking.length, noted: noted.length, problems }, null, 2));
} else {
  console.log(`scanned ${files.length} tracked script(s) under the contract and iteration/tools`);
  console.log('');
  if (!problems.length) {
    console.log('OK - no primitive is declared in more than one file.');
  } else {
    if (blocking.length) {
      console.log(`${blocking.length} BLOCKING duplicate(s) -- a contract-shaped constant or a machine path:`);
      for (const p of blocking) {
        console.log(`  ${p.agrees ? 'two copies, same value' : 'VALUES DIFFER'}  ${p.name}${/^'[A-Za-z]:/.test(p.values[0]) ? '   <== MACHINE-SPECIFIC PATH' : ''}`);
        for (const s of p.sites) console.log(`     ${s}`);
      }
      console.log('');
    }
    if (noted.length) {
      console.log(`${noted.length} duplicate name(s) reported but not counted as failures -- most such pairs are`);
      console.log('unrelated locals that happen to share a name, and counting them would make this noisy:');
      for (const p of noted) console.log(`  ${p.agrees ? 'same value' : 'DIFFER'}  ${p.name}: ${p.sites.join(' | ')}`);
      console.log('');
    }
    console.log('A copy that agrees today disagrees after one edit, and that edit is exactly the one');
    console.log('nobody re-reads. Export from one place and import it from the others.');
  }
}
process.exit(blocking.length ? 1 : 0);
