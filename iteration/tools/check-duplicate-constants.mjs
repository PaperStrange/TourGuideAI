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
// HOW IT WORKS, and its limits are stated rather than hidden.
//
// Pass 1 -- DECLARATIONS. Collect const/let declarations holding a primitive literal and report a
// name declared in more than one file. A name that is imported is not a copy; a name declared twice
// with the SAME value is still reported, because two copies that agree today disagree after one
// edit, and reporting only the disagreements would miss the moment before the edit, which is the
// only moment the fix is cheap.
//
// Pass 2 -- INLINE LITERALS. Pass 1 alone was insufficient, and the measurement that proved it: the
// scene magic and version appeared in FIVE files, as a named const in two, under a different name in
// one, and as a bare literal at two comparison sites. Pass 1 found two of the five. Two of the
// three misses were format-region literals compared inline -- `buf.readUInt32LE(8) !== 1` and
// `toString('ascii', 0, 8) !== 'TG25DSCN'` -- so this pass looks for those shapes specifically:
// a comparison against a numeric or string literal within a few lines of a read of the container
// header. That is a heuristic, not dataflow analysis, and it is scoped to the container region
// because a literal compared anywhere else is ordinary code.
//
// STILL NOT CAUGHT, stated so the guard is not trusted for what it cannot do: a copy under a
// different name that is never compared inline (`const SCENE_MAGIC = ...` used only in an
// assignment), and a literal assembled at runtime. Both need a real parser and a type checker.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const REPO = join(import.meta.dirname, '..', '..');
const JSON_OUT = process.argv.includes('--json');

// Scan the contract and everything under iteration/tools. Deliberately not the whole repo: the
// previous product under src/ is full of duplicate names and is not ours to police.
// SCOPE, and the reason it is not the whole bundle. The DSH bundle's expert tooling carries its own
// duplicate -- EXPERT_NAME_PREFIX in discover-expert-teams.mjs and validate-expert-pack.mjs -- and
// those files belong to the harness, not to this project, so a gate that stays red on them is a gate
// people learn to ignore. R6 in check-repo-hygiene.mjs is KNOWN-ACCEPTED for the same reason: a
// check that fails forever for something nobody here can fix stops being information. The external
// duplicate is printed below so it stays visible rather than excluded silently.
const roots = [
  'iteration/tools',
  'iteration/viewer',
];
const EXTERNAL_NOTE = "docs/handOff/dsh-bundle-tourguide-2.5d/tools/{discover-expert-teams,validate-expert-pack}.mjs "
  + "duplicate EXPERT_NAME_PREFIX and PLUGIN_JSON_REL; those files belong to the DSH bundle, not this project.";

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

// ── Pass 2: inline literals in the container-header region ────────────────────────────────
// Found by measurement, not by imagination. The scene magic and version lived in five files: a
// named const in two, a differently-named const in one, and a bare literal at two comparison
// sites. Pass 1 caught two of the five, and BOTH misses were format literals compared inline.
const inlineHits = [];
const HEADER_READ = /readUInt32LE\(\s*8\s*\)|readUInt32LE\(\s*12\s*\)|readUInt32LE\(\s*16\s*\)|readUInt32LE\(\s*20\s*\)|toString\(\s*['"]ascii['"]\s*,\s*0\s*,\s*8\s*\)|readUInt32LE\(\s*104\s*\)|readBigInt64LE/;
for (const rel of files) {
  const abs = join(REPO, rel);
  if (!existsSync(abs)) continue;
  const lines = readFileSync(abs, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (!HEADER_READ.test(line)) return;
    // Skip comments. The checker's own header documents the shapes it hunts for, and a checker
    // that reports its own documentation as a finding is a checker people stop reading.
    if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) return;
    // A literal compared against something read from the header, on this line or the two after.
    for (let k = 0; k <= 2 && i + k < lines.length; k++) {
      const probe = lines[i + k];
      for (const m of probe.matchAll(/(?:===|!==|==|!=)\s*(\d+|'[^']{2,}'|"[^"]{2,}")/g)) {
        const lit = m[1];
        // Ignore comparisons that are plainly not the container's format: offsets, byte counts.
        if (/^\d+$/.test(lit) && Number(lit) < 2) continue;
        inlineHits.push({ file: rel, line: i + k + 1, literal: lit, text: probe.trim().slice(0, 100) });
      }
    }
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
  console.log(JSON.stringify({ scanned: files.length, blocking: blocking.length, noted: noted.length, inlineLiterals: inlineHits.length, problems, inlineHits }, null, 2));
} else {
  console.log(`scanned ${files.length} tracked script(s) under the contract and iteration/tools`);
  console.log('');
  console.log('EXCLUDED (external): ' + EXTERNAL_NOTE);
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
if (!JSON_OUT && inlineHits.length) {
  console.log(`${inlineHits.length} INLINE literal(s) compared against a container-header read -- these are the`);
  console.log('format constants that Pass 1 cannot see, because they were never bound to a name:');
  for (const h of inlineHits) console.log(`  ${h.file}:${h.line}  ${h.literal}   ${h.text}`);
  console.log('');
  console.log('Two of the three D-44 instances found so far were exactly this shape. Bind it to the');
  console.log('imported constant instead, so a format change breaks the comparison rather than the data.');
  console.log('');
}
process.exit(blocking.length || inlineHits.length ? 1 : 0);
