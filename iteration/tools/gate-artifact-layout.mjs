// gate-artifact-layout.mjs — the storage norm, as a check that can fail.
//
// WHY THIS IS A GATE AND NOT A DOCUMENT.
//
// This project has written a lesson down and then repeated the mistake often enough that the pattern
// is recorded in its own registry: D-07's README describing workflows that never existed, D-12's
// mirrored enum, D-44's four copied constants, my own board six rounds behind, and .gitignore's own
// comment saying the bare-directory trap "has now hit three times". The conclusion already written
// into this repo is that WRITING THE LESSON DOWN IS NOT WHAT PREVENTS IT; WIRING THE ARTEFACT IS.
//
// So the storage norm lives here, as a table, and this script is the enforcer. A file in the wrong
// place, or with the wrong tracked/untracked state, makes this exit non-zero, and this is wired into
// run-gates, which is wired into CI. The user asked how compliance would be guaranteed for future
// teammates and subagents; the honest answer is that a norm nobody can violate unnoticed is worth
// more than a norm everyone has agreed to.
//
// THE TABLE IS THE SPEC. Every entry states what belongs at a path, whether git must track it, and
// why. Adding a location means adding a row here, which is deliberate: the norm cannot drift from the
// enforcement because they are the same object.
//
// AND IT REFUSES UNKNOWN PLACES. A file class that lands anywhere not in this table fails, so a new
// teammate cannot invent a new evidence directory by accident. That is the failure this exists for.
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const REPO = join(import.meta.dirname, '..', '..');
const JSON_OUT = process.argv.includes('--json');
const SELF_TEST = process.argv.includes('--self-test');

// ── THE HANDOFF DELIVERABLE IS FROZEN ───────────────────────────────────────────────────────────
// docs/handOff/evidence/ is a handoff-stage artefact and the user's ruling is that it must not be
// moved, renamed, overwritten or deleted -- INCLUDING odpt-developer.html, which is a failed fetch
// (636 bytes of "You need to enable JavaScript to run this app.") and is therefore the obvious thing
// a later teammate would try to re-fetch in place. Doing that would destroy the evidence that the
// fetch failed, so the failure is recorded in iteration/design/licence-register.md instead and the
// file stays exactly as found.
//
// A baseline file makes "do not touch it" mechanical instead of a promise. Regenerate it ONLY with
// --accept-handoff-baseline, which is a deliberate act, and never as a way to make a red gate green.
const BASELINE_PATH = join(import.meta.dirname, '..', 'design', 'handoff-evidence-baseline.json');

// ── THE SPEC ────────────────────────────────────────────────────────────────────────────────────
// class        what kind of bytes these are, by extension and path
// where        the only locations allowed to hold them
// tracked      true = git must track it; false = git must ignore it; null = either is acceptable
class FileClass {
  constructor(id, match, locations, tracked, why) {
    Object.assign(this, { id, match, locations, tracked, why });
  }
}

// THE ORDER OF THIS TABLE IS LOAD-BEARING. CLASSES.find() takes the FIRST match, so a broad rule
// placed above a narrow one silently swallows it. My first version put process-material above
// curated-recon and the narrower class reported zero files while its members were misclassified --
// the same shape as the bare-directory trap in .gitignore, where a general pattern defeats a
// specific negation. Narrow and specific classes come first; broad catch-alls come last.
const CLASSES = [
  new FileClass(
    'pack-tooling',
    (rel) => /^city-packs\/[^/]+\/evidence\/tools\//.test(rel),
    ['city-packs/*/evidence/tools/'],
    null,
    'the scripts that BUILT the fact layer, kept beside the evidence they consumed, plus their meta.json sidecars. Tracked state is left to them on purpose: a local .gitignore there excludes one scratch snapshot (.build-before.json) while the rest is source. This class exists because the table had no slot for it and an unclassifiable file is how a norm quietly stops covering something',
  ),
  new FileClass(
    'fact-evidence',
    (rel) => /^city-packs\/[^/]+\/evidence\//.test(rel),
    ['city-packs/*/evidence/'],
    true,
    'source bytes for FACT provenance -- validate-doors V10 reads and hashes these, so they must travel with the repo or a clean checkout cannot verify anything',
  ),
  new FileClass(
    'licence-evidence',
    (rel) => /^docs\/handOff\/evidence\//.test(rel),
    ['docs/handOff/evidence/'],
    true,
    'legal and licence texts (Google terms, ODbL, GSI, PLATEAU, MLIT, ODPT). No gate reads them, so their only value is as a citable snapshot -- which is lost if they are not in the repo',
  ),
  new FileClass(
    'new-capture',
    (rel) => /^\.dsh\/artifacts\/(evidence|licences)\//.test(rel),
    ['.dsh/artifacts/evidence/', '.dsh/artifacts/licences/'],
    true,
    'captures made from now on. Tracked, because the norm is that a cited source must be verifiable from a clean checkout',
  ),

  new FileClass(
    'curated-recon',
    (rel) => /^iteration\/recon\/_fetch-(intl|japan)\//.test(rel) || /^iteration\/recon\/_raw-review-zh\//.test(rel),
    ['iteration/recon/_fetch-intl/', 'iteration/recon/_fetch-japan/', 'iteration/recon/_raw-review-zh/'],
    true,
    'the three licence/market review lines KEEP their fetched pages in the repo, because review-source-*.md cites them clause by clause. They were already tracked before this norm; the norm records that as deliberate rather than letting a later reader assume it was an oversight',
  ),  new FileClass(
    'process-material',
    (rel) =>
      /^\.dsh\/artifacts\/raw\//.test(rel) ||
      /^iteration\/recon\/_raw/.test(rel) ||
      /^iteration\/recon\/sections\/_raw/.test(rel) ||
      /^docs\/handOff\/archive\/corpora\/geo-japan\/src\//.test(rel),
    ['.dsh/artifacts/raw/', 'iteration/recon/_raw*/', 'iteration/recon/_fetch*/', 'docs/handOff/archive/corpora/geo-japan/src/'],
    false,
    'crawl caches behind research and section drafts, plus the evaluation-source fetch caches. Excluded on purpose: they are the process, not a cited source, and tens of MB would bloat the repo without making any claim verifiable',
  ),
  new FileClass(
    'raw-slice-reincluded',
    (rel) => /^docs\/handOff\/archive\/corpora\/geo-japan\/(kyoto-slice-[^/]+\.json)$/.test(rel),
    ['docs/handOff/archive/corpora/geo-japan/'],
    true,
    'three raw slice files under an otherwise-ignored archive. .gitignore re-includes them by NAME, one at a time, because a bare directory negation would have re-included the whole 23 MB corpus -- the trap this repo has hit three times. Tracked on purpose',
  ),
  // Two different things, split because they need opposite tracked states and a shared class would
  // have to lie about one of them. Both exist because an .html extension must not be enough to make
  // a file look like captured evidence.
  new FileClass(
    'baked-page',
    (rel) => /^iteration\/viewer\/index\.html$/.test(rel),
    ['iteration/viewer/'],
    false,
    'the baked viewer page (311 KB). REGENERATED by bake-viewer and gate-scene-read -- ignoring it is what makes "the gates bake it if absent" the real contract, since a committed copy would be a second truth about the world',
  ),
  new FileClass(
    'vendored-page',
    (rel) => /^docs\/pics\/flowchart\/mermaid_renderer\.html$/.test(rel),
    ['docs/pics/flowchart/'],
    true,
    'a self-contained diagram renderer kept for the flowchart sources beside it. Tracked because it is an input to regenerating those pictures, not an output of the code in this repo',
  ),
  new FileClass(
    'build-output',
    (rel) => /^build\//.test(rel),
    ['build/'],
    false,
    'derived artefacts (scene.bin, guide.json, the baked page). Regenerated by the gates from source, so committing them would create a second truth',
  ),
];

// Paths that must never hold a captured byte, whoever wrote it. This is the "refuse unknown places"
// half: a new evidence directory created by a teammate fails here rather than becoming a de-facto
// standard that the next person copies.
const FORBIDDEN_FOR_CAPTURES = [
  { re: /^iteration\/(?!recon\/)/, why: 'iteration/ holds tooling and design notes; captured bytes belong in one of the declared stores' },
  { re: /^src\//, why: 'src/ is the pre-reboot product and is not part of the fact layer' },
  { re: /^city-packs\/[^/]+\/(?!evidence\/|attestations\/)/, why: 'inside a city pack only evidence/ and attestations/ carry captured bytes; the rest is authored fact data' },
  { re: /^docs\/(?!handOff\/)/, why: 'outside docs/handOff/ there is no declared evidence store' },
  { re: /^\.dsh\/(?!artifacts\/|skills\/)/, why: 'inside .dsh/ only artifacts/ and skills/ are declared' },
];

// ── collect what is on disk ─────────────────────────────────────────────────────────────────────
let tracked = new Set();
try {
  tracked = new Set(
    execSync('git ls-files', { cwd: REPO, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map((p) => p.replace(/\\/g, '/')),
  );
} catch {
  console.log('ENV  not a git working tree; the tracked/untracked half of this norm cannot be checked');
  process.exit(2);
}

const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', '.vite']);
const all = [];
const rec = (abs, relBase) => {
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const rel = relBase ? `${relBase}/${e.name}` : e.name;
    const p = join(abs, e.name);
    if (e.isDirectory()) rec(p, rel);
    else if (e.isFile()) all.push({ rel: rel.replace(/\\/g, '/'), bytes: statSync(p).size, ext: extname(e.name).toLowerCase() });
  }
};
rec(REPO, '');

// ── check ───────────────────────────────────────────────────────────────────────────────────────
const violations = [];
const counters = {};

for (const f of all) {
  const cls = CLASSES.find((c) => c.match(f.rel));
  counters[cls ? cls.id : 'unclassified'] = (counters[cls ? cls.id : 'unclassified'] ?? 0) + 1;
  if (!cls) continue;

  // 1. tracked state must match the class
  if (cls.tracked !== null) {
    const isTracked = tracked.has(f.rel);
    if (cls.tracked && !isTracked) {
      violations.push({ rule: 'tracked', file: f.rel, cls: cls.id, detail: 'must be tracked by git but is not', why: cls.why });
    }
    if (!cls.tracked && isTracked) {
      violations.push({ rule: 'untracked', file: f.rel, cls: cls.id, detail: 'must be gitignored but git is tracking it', why: cls.why });
    }
  }
}

// 2. a captured byte may not live outside a declared store
const CAPTURE_EXT = new Set(['.html', '.htm', '.pdf', '.csv', '.xml', '.docx', '.xlsx']);
for (const f of all) {
  if (!CAPTURE_EXT.has(f.ext)) continue;
  const alreadyInAStore = CLASSES.some((c) => c.match(f.rel));
  if (alreadyInAStore) continue;
  for (const rule of FORBIDDEN_FOR_CAPTURES) {
    if (rule.re.test(f.rel)) {
      violations.push({ rule: 'unknown-place', file: f.rel, cls: '(capture outside any declared store)', detail: rule.why, why: 'the norm declares where captures may live; a new location must be added to the table in this file, deliberately' });
      break;
    }
  }
}

// 3. the same bytes must not sit in two declared stores (D-23: duplicate evidence splits citations)
const bySize = new Map();
for (const f of all) {
  const cls = CLASSES.find((c) => c.match(f.rel));
  if (!cls || cls.id === 'build-output') continue;
  const key = `${f.bytes}:${f.rel.split('/').pop()}`;
  if (!bySize.has(key)) bySize.set(key, []);
  bySize.get(key).push(f.rel);
}
for (const [, paths] of bySize) {
  const stores = new Set(paths.map((p) => (CLASSES.find((c) => c.match(p)) ?? {}).id));
  if (paths.length > 1 && stores.size > 1) {
    violations.push({ rule: 'duplicate', file: paths.join(' + '), cls: [...stores].join(','), detail: 'the same filename and size in two declared stores', why: 'D-23: duplicate evidence splits citations across two truths; one copy must be removed' });
  }
}

// Hash CRLF-normalised bytes, NOT the working-copy bytes.
//
// THIS GATE FAILED IN A CLEAN CLONE ON THE DAY I WROTE IT, and the cause is the one this repo has
// already paid for: a verdict that depends on how the working copy was produced. CLAUSES-verbatim.md
// is 6107 bytes here and 6222 in a fresh clone -- the difference is exactly its line count, and
// odpt-developer.html (a single line) matched in both. So a baseline of raw working-tree bytes
// encodes this machine's line endings, which is a second truth about the handoff deliverable.
//
// WHAT THIS BASELINE ACTUALLY GUARDS: that nobody EDITS, ADDS or DELETES a file in the frozen
// handoff directory. It does not need byte-identity across platforms to do that, and it must not
// silently claim it. Normalising CRLF to LF before hashing makes the check environment-independent
// while still catching any content change.
const hashCanonical = (p) =>
  createHash('sha256').update(readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), 'utf8').digest('hex').toUpperCase();
// ── the handoff deliverable must be unedited, judged on normalised bytes ───────────────────────────────
const HANDOFF_DIR = join(REPO, 'docs', 'handOff', 'evidence');
if (process.argv.includes('--accept-handoff-baseline')) {
  const snap = {};
  for (const e of readdirSync(HANDOFF_DIR)) {
    const p = join(HANDOFF_DIR, e);
    if (statSync(p).isFile()) snap[e] = hashCanonical(p);
  }
  writeFileSync(BASELINE_PATH, JSON.stringify({ note: 'FROZEN handoff deliverable; see iteration/design/licence-register.md', files: snap }, null, 2) + '\n', 'utf8');
  console.log(`handoff baseline accepted: ${Object.keys(snap).length} files -> ${relative(REPO, BASELINE_PATH).replace(/\\/g, '/')}`);
} else if (existsSync(BASELINE_PATH) && existsSync(HANDOFF_DIR)) {
  const base = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).files ?? {};
  const now = {};
  for (const e of readdirSync(HANDOFF_DIR)) {
    const p = join(HANDOFF_DIR, e);
    if (statSync(p).isFile()) now[e] = hashCanonical(p);
  }
  for (const [name, hash] of Object.entries(base)) {
    if (!(name in now)) {
      violations.push({ rule: 'handoff-frozen', file: `docs/handOff/evidence/${name}`, cls: 'licence-evidence', detail: 'REMOVED from the frozen handoff deliverable', why: 'this directory is a handoff-stage artefact and must not be touched, including its failed fetch' });
    } else if (now[name] !== hash) {
      violations.push({ rule: 'handoff-frozen', file: `docs/handOff/evidence/${name}`, cls: 'licence-evidence', detail: `MODIFIED: baseline ${hash.slice(0, 16)}… now ${now[name].slice(0, 16)}…`, why: 'this directory is a handoff-stage artefact and must not be touched, including its failed fetch' });
    }
  }
  for (const name of Object.keys(now)) {
    if (!(name in base)) {
      violations.push({ rule: 'handoff-frozen', file: `docs/handOff/evidence/${name}`, cls: 'licence-evidence', detail: 'ADDED to the frozen handoff deliverable', why: 'new captures belong in .dsh/artifacts/, not in a frozen handoff artefact' });
    }
  }
}
// ── self-test: prove the gate can fail ──────────────────────────────────────────────────────────
// A check that has only ever been seen to pass has not been tested. This writes a real file into a
// place the table forbids, confirms the gate reports it, then removes it.
if (SELF_TEST) {
  const probe = join(REPO, 'iteration', '_norm-selftest-probe.html');
  writeFileSync(probe, '<html>self-test probe; not evidence</html>', 'utf8');
  let caught = false;
  try {
    const out = execSync(`node ${JSON.stringify(join(import.meta.dirname, 'gate-artifact-layout.mjs'))} --json`, { cwd: REPO, encoding: 'utf8' });
    caught = JSON.parse(out).violations.some((v) => v.rule === 'unknown-place' && v.file.includes('_norm-selftest-probe'));
  } catch (e) {
    try {
      caught = JSON.parse(e.stdout).violations.some((v) => v.rule === 'unknown-place' && v.file.includes('_norm-selftest-probe'));
    } catch { caught = false; }
  }
  // Second self-test: the frozen-handoff guard must actually fire. I shipped it once on the strength
  // of a test that read the wrong exit code -- $LASTEXITCODE after a Select-String in a pipeline,
  // which returns 0 when it matches nothing -- and reported OK while the guard was working. So the
  // guard gets its own regression test here rather than relying on anyone's reading of a shell.
  const frozenProbe = join(REPO, 'docs', 'handOff', 'evidence', 'gsi-kiban.txt');
  let frozenCaught = false;
  if (existsSync(frozenProbe) && existsSync(BASELINE_PATH)) {
    const original = readFileSync(frozenProbe);
    writeFileSync(frozenProbe, Buffer.concat([original, Buffer.from('x')]), null);
    try {
      execSync(`node ${JSON.stringify(join(import.meta.dirname, 'gate-artifact-layout.mjs'))} --json`, { cwd: REPO, encoding: 'utf8' });
    } catch (e) {
      try {
        frozenCaught = JSON.parse(e.stdout).violations.some((v) => v.rule === 'handoff-frozen' && v.file.includes('gsi-kiban'));
      } catch { frozenCaught = false; }
    }
    writeFileSync(frozenProbe, original);
  }
  console.log(frozenCaught
    ? 'SELF-TEST PASS  a single byte appended to a frozen handoff file is reported by rule handoff-frozen'
    : 'SELF-TEST FAIL  the frozen-handoff guard did not fire on an edited byte; it is not a guard');
  if (!frozenCaught) process.exit(1);
  unlinkSync(probe);
  console.log(caught
    ? 'SELF-TEST PASS  a capture placed in a forbidden directory is reported by rule unknown-place'
    : 'SELF-TEST FAIL  the gate did NOT report a capture in a forbidden directory; the norm is not enforced');
  if (!caught) process.exit(1);
}

const summary = { scanned: all.length, counters, violations: violations.length };
if (JSON_OUT) {
  console.log(JSON.stringify({ ...summary, violations }, null, 2));
} else {
  console.log(`artifact layout norm — ${all.length} files scanned`);
  for (const c of CLASSES) {
    console.log(`  ${String(counters[c.id] ?? 0).padStart(5)}  ${c.id.padEnd(18)} ${c.tracked ? 'tracked' : 'ignored'}  ${c.locations.join(' ')}`);
  }
  if (counters.unclassified) console.log(`  ${String(counters.unclassified).padStart(5)}  (not covered by the table)`);
  console.log('');
  if (!violations.length) {
    console.log('OK - every classified file is in a declared place with the declared tracked state.');
  } else {
    console.log(`${violations.length} violation(s) of the storage norm:`);
    for (const v of violations.slice(0, 40)) {
      console.log(`  [${v.rule}] ${v.file}`);
      console.log(`      ${v.detail}`);
    }
    if (violations.length > 40) console.log(`  … and ${violations.length - 40} more`);
    console.log('');
    console.log('The norm is the CLASSES table at the top of this file. To add a location, add a row');
    console.log('there, deliberately -- an undeclared location is the failure this gate exists for.');
  }
}
process.exit(violations.length ? 1 : 0);
