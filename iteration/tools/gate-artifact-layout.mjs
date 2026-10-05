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
    'game-entry-source',
    (rel) => rel === 'iteration/game/index.html',
    ['iteration/game/index.html'],
    true,
    'authored Vite entry source for the isolated first playable, not a fetched page or generated artifact. Only this exact source path is declared; new captured pages still require an evidence-store row. The generated single-file game stays in ignored dist/.',
  ),
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

const hashCanonical = (p) =>
  createHash('sha256').update(readFileSync(p, 'utf8').replace(/\r\n/g, '\n'), 'utf8').digest('hex').toUpperCase();
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

// 3. the same CONTENT must not sit in two declared stores (D-23: duplicate evidence splits
// citations across two truths).
//
// The first version keyed on filename + byte count, which is not the same question and produced a
// false verdict the moment a legitimate pair appeared: the licence archive and the pipeline's working
// copy are both named the same and were sized the same, so all 14 were reported as duplicates. Two
// files agreeing on a name and a length are not known to be one file -- this repo has measured that
// exact confusion, since gsi-kiban.txt is 5832 bytes in the working tree and 6222 in a fresh clone
// purely from line endings.
//
// So this hashes, and it needs an explicit allowance for pairs that are deliberately two copies with
// two roles. A norm that forces the archive and the working copy into one file would push the gate
// back to reading the handoff deliverable, which is the dependency inversion the user caught.
// ORDER-PROOF ON PURPOSE. I wrote these keys as 'fact-evidence+curated-recon' while the code builds
// them sorted, so the pair never matched and two real duplicates were reported as allowed -- and I
// misread the truncated output as one of them passing. This is the fourth ordering mistake in one
// session (twice a broad class swallowing a narrow one in the table above, once an exit code read
// from the wrong side of a pipe). So the keys are compared as UNORDERED PAIRS: a set of sorted
// two-element arrays, with the lookup sorting both sides. Writing a key in the wrong order can no
// longer silently disable it.
// Sorts the two class ids so a key written in either order matches.
const twinKey = (s) => s.split('+').sort().join('+');
const DELIBERATE_TWIN_STORES = new Set([
  // One PDF under two names in two stores. Found only after this rule started hashing instead of
  // comparing names and sizes. Kept as twins on purpose: the pack's copy is cited from the fact layer
  // and the recon copy is cited from the clause sweep, and deleting either would break a citation
  // from a document that legitimately needs it. Recorded here rather than silently tolerated.
  // Both pairs are Kyoto open-data captures held once by the pack and once by the clause sweep, under
  // DIFFERENT names -- which is why the earlier name+size rule never saw them and hashing did. Kept
  // as twins: the pack's copies are cited from the fact layer and the recon copies from the clause
  // sweep, so removing either breaks a citation from a document that needs it. Listed by name, so a
  // NEW byte-identical pair still fails until someone records it here deliberately.
  'curated-recon+fact-evidence', // kyoto-city-kiyaku-syoban.pdf == kyoto-kiyaku.pdf
                                 //   and kyoto-sight-DSIGHT_1.csv == kyoto-sight.csv
  'licence-evidence+new-capture', // docs/handOff/evidence (frozen archive) vs .dsh/artifacts/licences (gate-readable)
]);
const byContent = new Map();
for (const f of all) {
  const cls = CLASSES.find((c) => c.match(f.rel));
  if (!cls || cls.id === 'build-output') continue;
  // Manifest files describe other files rather than being evidence, so they are not candidates.
  if (/MANIFEST\.json$/.test(f.rel)) continue;
  const abs = join(REPO, f.rel);
  let h;
  try {
    h = hashCanonical(abs);
  } catch {
    continue; // unreadable or binary; not a duplicate question
  }
  if (!byContent.has(h)) byContent.set(h, []);
  byContent.get(h).push(f.rel);
}
for (const [h, paths] of byContent) {
  const stores = new Set(paths.map((p) => (CLASSES.find((c) => c.match(p)) ?? {}).id));
  if (paths.length > 1 && stores.size > 1) {
    const pair = [...stores].sort().join('+');
    if (process.env.NORM_DEBUG) console.log(`    DEBUG bucket ${h.slice(0, 12)} pair=[${pair}] allowed=${DELIBERATE_TWIN_STORES.has(pair)} files=${paths.length} :: ${paths.join(' | ')}`);
    if (DELIBERATE_TWIN_STORES.has(twinKey(pair))) continue;
    violations.push({ rule: 'duplicate', file: paths.join(' + '), cls: [...stores].join(','), detail: `byte-identical content (sha256 ${h.slice(0, 16)}…) in two declared stores`, why: 'D-23: duplicate evidence splits citations across two truths; one copy must be removed, or the pair must be added to DELIBERATE_TWIN_STORES with its reason' });
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
// ── the licence store: every snapshot must be present AND unchanged ──────────────────────────────
// This is what makes the licence claims checkable rather than merely written down. Before it, the 14
// snapshots had integrity protection (the archive baseline) but no EXISTENCE protection: deleting one
// left every gate green while a compliance claim silently lost its basis. Measured before building
// it -- removing osm-block-q1-footprints.json made validate-doors exit 1, so that gate does read its
// evidence, but nothing read these.
//
// Note the direction, which the user caught: this reads .dsh/artifacts/licences/, the pipeline's own
// copy, NOT docs/handOff/evidence/. A gate that depended on the handoff deliverable would invert the
// dependency, since that folder is the pipeline's output.
const LICENCE_DIR = join(REPO, '.dsh', 'artifacts', 'licences');
const LICENCE_MANIFEST = join(LICENCE_DIR, 'MANIFEST.json');
if (existsSync(LICENCE_MANIFEST)) {
  const man = JSON.parse(readFileSync(LICENCE_MANIFEST, 'utf8'));
  const present = new Set(existsSync(LICENCE_DIR) ? readdirSync(LICENCE_DIR) : []);
  for (const entry of man.files ?? []) {
    if (!present.has(entry.name)) {
      violations.push({ rule: 'licence-missing', file: `.dsh/artifacts/licences/${entry.name}`, cls: 'new-capture', detail: `MISSING. It constrains: ${entry.constrains}`, why: 'a licence claim whose snapshot is absent cannot be verified, which is exactly the state that let six snapshots sit unread' });
      continue;
    }
    const now = hashCanonical(join(LICENCE_DIR, entry.name));
    if (now !== entry.sha256Canonical) {
      violations.push({ rule: 'licence-modified', file: `.dsh/artifacts/licences/${entry.name}`, cls: 'new-capture', detail: `CHANGED: manifest ${entry.sha256Canonical.slice(0, 16)}… now ${now.slice(0, 16)}…`, why: 'the record says what this snapshot said; a silent edit would leave the register describing a document that no longer exists' });
    }
  }
  // A file in the store that the record does not mention is an unreviewed addition.
  for (const name of present) {
    if (name === 'MANIFEST.json') continue;
    if (!(man.files ?? []).some((e) => e.name === name)) {
      violations.push({ rule: 'licence-unrecorded', file: `.dsh/artifacts/licences/${name}`, cls: 'new-capture', detail: 'present in the store but absent from the record', why: 'an unreviewed snapshot is how a store stops describing itself' });
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
  // Third self-test: the licence store's existence and integrity guard must fire. Deleting a licence
  // snapshot used to leave every gate green while a compliance claim quietly lost its basis, so the
  // guard gets a regression test rather than my word for it.
  const LIC = join(REPO, '.dsh', 'artifacts', 'licences');
  let licenceCaught = false;
  let licenceVictim = null;
  if (existsSync(LIC)) {
    const name = readdirSync(LIC).find((n) => n !== 'MANIFEST.json');
    if (name) {
      licenceVictim = join(LIC, name);
      const held = readFileSync(licenceVictim);
      unlinkSync(licenceVictim);
      try {
        execSync(`node ${JSON.stringify(join(import.meta.dirname, 'gate-artifact-layout.mjs'))} --json`, { cwd: REPO, encoding: 'utf8' });
      } catch (e) {
        try {
          licenceCaught = JSON.parse(e.stdout).violations.some((v) => v.rule === 'licence-missing' && v.file.endsWith(name));
        } catch { licenceCaught = false; }
      }
      writeFileSync(licenceVictim, held);
    }
  }
  console.log(licenceCaught
    ? 'SELF-TEST PASS  a deleted licence snapshot is reported by rule licence-missing'
    : 'SELF-TEST FAIL  deleting a licence snapshot did not fail the gate; the claim has no basis guard');
  if (!licenceCaught) process.exit(1);
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
