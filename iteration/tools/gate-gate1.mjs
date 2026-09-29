// gate-gate1.mjs — where Gate 1 actually stands, as one command instead of prose.
//
// WHY THIS EXISTS. iteration/design/gate1-acceptance.md splits the four definition items into what a
// machine can decide and what only a person on the street can. That split is right, and it has one
// practical problem: the human half has no status. "Twelve positions observed by nobody" is a
// sentence in a document, and a sentence is exactly the thing this project keeps discovering goes
// stale -- D-07's README describing workflows that never existed, D-44's four copied constants.
//
// So this reads the ARTEFACTS and reports the four items against them. It is deliberately NOT a gate
// in run-gates: a gate is pass/fail, and Gate 1 is partly not-yet-attemptable. Exiting non-zero for
// "a person has not walked it" would make it a permanently red gate, which the project has already
// decided is worse than no gate -- R6 is KNOWN-ACCEPTED for that reason. This reports and exits 0,
// and says plainly which items are machine-decidable and which are not.
//
// It answers one question the human checklist needs: WHEN the doors are observed, does everything
// downstream notice? Nothing today connects a valueKind change to a re-derivation, so this states
// the dependency out loud rather than leaving it implied.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const REPO = join(import.meta.dirname, '..', '..');
const PACK = join(REPO, 'city-packs', 'kyoto-shijo');
const JSON_OUT = process.argv.includes('--json');

const readJson = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const doorsDoc = readJson(join(PACK, 'doors.json'));
const placesDoc = readJson(join(PACK, 'places.json'));
const guide = readJson(join(REPO, 'build', 'guide.json'));

const doors = doorsDoc?.doors ?? [];
const places = Array.isArray(placesDoc) ? placesDoc : (placesDoc?.places ?? []);

const items = [];

// ── 1. one street ───────────────────────────────────────────────────────────────────────────
let scene = null;
if (existsSync(join(REPO, 'build', 'scene.bin'))) {
  const b = readFileSync(join(REPO, 'build', 'scene.bin'));
  const ml = b.readUInt32LE(104);
  scene = { version: b.readUInt32LE(8), wTiles: b.readUInt32LE(12), hTiles: b.readUInt32LE(16), manifest: JSON.parse(b.toString('utf8', 108, 108 + ml)) };
}
items.push({
  id: '1-street',
  decidable: 'machine',
  title: 'one street: real OSM geometry baked into a walkable world',
  ok: Boolean(scene) && scene.manifest?.frontageContinuity?.coveredM > 1200,
  evidence: scene
    ? `scene v${scene.version} ${scene.wTiles}x${scene.hTiles} · axis coverage ${scene.manifest.frontageContinuity.coveredM} m of 1600 (${scene.manifest.frontageContinuity.coveragePct.toFixed(1)}%)`
    : 'no build/scene.bin',
});

// ── 2. twelve enterable places ──────────────────────────────────────────────────────────────
const byKind = {};
for (const d of doors) byKind[d.provenance?.valueKind] = (byKind[d.provenance?.valueKind] ?? 0) + 1;
const observedDoors = byKind.observed ?? 0;
// enterable is read from the viewer's own assertion rather than recomputed here, so this reports a
// number that some other check already defends.
// ONE run of the viewer check, read twice. It is the slowest thing here and a checker that takes
// twice as long as it needs to is a checker people learn to skip.
let viewerOut = null;
try {
  viewerOut = execSync('node iteration/tools/check-viewer.mjs --bake-if-absent', { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (e) { viewerOut = (e.stdout ?? '') + (e.stderr ?? ''); }
let enterable = null;
{
  const m = viewerOut ? viewerOut.match(/ENTERABLE north (\d+)\/(\d+), south (\d+)\/(\d+)/) : null;
  if (m) enterable = { north: Number(m[1]), northTotal: Number(m[2]), south: Number(m[3]), southTotal: Number(m[4]) };
}
items.push({
  id: '2-places',
  decidable: 'machine + human',
  title: 'twelve enterable places: 12 doors, and each position OBSERVED',
  // Machine half can be satisfied while the human half is not, and the two are reported separately
  // rather than averaged into one green -- averaging is how a real gap gets hidden.
  ok: doors.length === 12 && enterable !== null && enterable.north + enterable.south >= 1 && observedDoors === 12,
  partial: doors.length === 12,
  evidence: `${doors.length} doors · valueKind ${JSON.stringify(byKind)} · ENTERABLE north ${enterable ? `${enterable.north}/${enterable.northTotal}` : '?'}, south ${enterable ? `${enterable.south}/${enterable.southTotal}` : '?'}`,
  blocking: observedDoors < 12 ? `${12 - observedDoors} of 12 door positions have NEVER been observed (D-24/D-25/D-40); block 0's south side additionally has three mutually contradictory measurements (D-45). The five-minute checklist is the only instrument.` : null,
});

// ── 3. walkable 2.5D ────────────────────────────────────────────────────────────────────────
let walk = null;
{
  const m = viewerOut ? viewerOut.match(/reached x=(\d+) of (\d+) in (\d+) steps, (\d+) row correction/) : null;
  if (m) walk = { reached: Number(m[1]), of: Number(m[2]), steps: Number(m[3]), corrections: Number(m[4]) };
}
items.push({
  id: '3-walkable',
  decidable: 'machine',
  title: 'walkable 2.5D: a collision-constrained walker traverses the street',
  ok: Boolean(walk) && walk.reached === walk.of,
  evidence: walk ? `reached x=${walk.reached} of ${walk.of} in ${walk.steps} steps, ${walk.corrections} correction(s)` : 'viewer check did not report a walk',
});

// ── 4. one real person walks it ─────────────────────────────────────────────────────────────
// Not machine-decidable, and this checker refuses to fake it. What it CAN do is confirm the export a
// person would carry actually exists and is traceable, so the human step has something to walk with.
const guideOk = Boolean(guide);
let verifiedCells = 0;
if (guide) {
  const walk2 = (o) => {
    if (o === null || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(walk2); return; }
    if (Array.isArray(o.verified)) for (const v of o.verified) if (v && v.valueKind === 'observed') verifiedCells += 1;
    for (const v of Object.values(o)) walk2(v);
  };
  walk2(guide);
}
items.push({
  id: '4-person',
  decidable: 'human',
  title: 'one real person walks it, with no extra itinerary research and no fear of the language barrier',
  ok: false,                       // cannot be true until a person reports it
  evidence: guideOk
    ? `the export exists and is traceable: guide.json carries ${verifiedCells} observed cell(s); the person has not walked it`
    : 'no build/guide.json to carry',
  blocking: 'Only a person can answer this, and the question is the user\'s own success definition: did they have to look anything else up, and were they ever afraid to act because they could not read it.',
});

const machineItems = items.filter((i) => i.decidable.includes('machine'));
const machineOk = machineItems.filter((i) => i.ok).length;

if (JSON_OUT) {
  console.log(JSON.stringify({ items, machineOk, machineTotal: machineItems.length }, null, 2));
} else {
  console.log('Gate 1 — where it actually stands\n');
  for (const i of items) {
    const mark = i.ok ? 'DONE ' : i.partial ? 'PART ' : 'OPEN ';
    console.log(`${mark} ${i.title}`);
    console.log(`        [${i.decidable}] ${i.evidence}`);
    if (i.blocking) console.log(`        blocked: ${i.blocking}`);
  }
  console.log('');
  console.log(`machine-decidable items: ${machineOk} of ${machineItems.length}`);
  console.log('human-decidable items: 1 of 1, and it cannot be satisfied by any agent — see');
  console.log('iteration/recon/DOOR-CHECKLIST-for-human.md (approximately five minutes) and');
  console.log('iteration/design/gate1-acceptance.md section 3.');
  console.log('');
  console.log('This is not a gate and exits 0 by design. A permanently red gate stops being information,');
  console.log('which is why R6 in check-repo-hygiene.mjs is KNOWN-ACCEPTED rather than failing.');
}
process.exit(0);
