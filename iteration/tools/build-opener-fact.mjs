#!/usr/bin/env node
/**
 * build-opener-fact.mjs — generate the OPENABLE SURFACES fact layer.
 *
 * WHY THIS FILE EXISTS, AND WHY IT IS A GENERATOR
 * -----------------------------------------------
 * The user's ruling:
 *
 *   「南侧的店面在世界里不存在：仍然需要设置可以走进去的交互操作，第一版交互反馈显示
 *     "内容开发中"即可。以还原现实为第一标准。」
 *
 * (The SHOPFRONTS on the south side do not exist in the world: the interaction to
 *  walk into them still has to be provided, and for the first version the
 *  interaction feedback may read "content under development". Fidelity to reality
 *  is the first standard.)
 *
 * The trap in that ruling is that "make the south enterable" has an easy wrong
 * reading — derive enterability from collision depth. That is exactly what the
 * scene already does: `openings` is derived from the collision bytes, so the south
 * side is structurally zero and would stay zero no matter what the fact layer says.
 *
 * So enterability is a SET INTERACTION, declared in the fact layer and consumed by
 * the interaction layer — the same discipline as "a door's POSITION comes from the
 * fact layer, the emitter does not guess it".
 *
 * The declarations are authored BY THIS FILE, not pasted into the artefacts:
 *   - a door's side, row and building come from `doors.json` (fact layer);
 *   - a building's place id and name come from `places.json` (fact layer);
 *   - the collision probe is MEASURED, and is recorded as evidence — it does NOT
 *     decide the surface kind.
 *
 * Regenerating overwrites the artefacts, so a hand-edit there cannot survive and
 * cannot be mistaken for a declaration. That is deliberate: this project has
 * already been bitten once by a mirrored constant going stale (D-12, the valueKind
 * enum copied into doors.json), so the declared half has exactly one source.
 *
 * USAGE
 *   node iteration/tools/build-opener-fact.mjs            write + report
 *   node iteration/tools/build-opener-fact.mjs --json
 *
 * Exit codes: 0 = written, 1 = a consistency failure, 2 = environment.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO = resolve(import.meta.dirname, '..', '..');
const PACK = join(REPO, 'city-packs', 'kyoto-shijo');
/**
 * `--doors <path>` is the FIRE DRILL override, the same flag and the same reason as
 * `validate-doors.mjs --doors`: run every assertion against an alternate doors.json so
 * the count-dependent checks can be shown to FOLLOW their input rather than redden,
 * without editing the shipped file.
 */
const DOORS = (() => {
  const i = process.argv.indexOf('--doors');
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : join(PACK, 'doors.json');
})();
const PLACES = (() => {
  const i = process.argv.indexOf('--places');
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : join(PACK, 'places.json');
})();
const SCENE = join(REPO, 'build', 'scene.bin');
/**
 * `--out <dir>` so a fire drill can generate a variant without touching the shipped
 * artefacts, and `--check` so staleness is detectable rather than promised.
 *
 * CLASSIFICATION, because the layout gate asks this question and the answer decides
 * which store this file belongs to: **the JSON is DERIVED OUTPUT of this script.**
 * The DECLARATION lives here, in a tracked script, as the `SURFACE` vocabulary and the
 * north/south rule below; the JSON is that declaration's serialised form, regenerable
 * from doors.json + places.json + the scene probe. It is not a hand-maintained list
 * that other files copy — which is the one thing it must not be (D-12).
 *
 * `--check` regenerates in memory and diffs against what is on disk, so a hand-edit to
 * the JSON cannot survive a gate run. Without it "regenerable" is a claim; with it,
 * staleness is a failing assertion.
 */
const OUT_DIR = (() => {
  const i = process.argv.indexOf('--out');
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : join(REPO, 'iteration', 'viewer');
})();
const CHECK_ONLY = process.argv.includes('--check');
const OUT_JSON = join(OUT_DIR, 'opener-contract.json');
const OUT_MD = join(OUT_DIR, 'opener-contract.md');

class EnvError extends Error {}

function die(code, msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

/* ------------------------------------------------------------------ *
 * Inputs. Both are fact layer; neither is authored here.
 * ------------------------------------------------------------------ */
if (!existsSync(DOORS)) die(2, `fact layer missing: ${DOORS}`);
if (!existsSync(PLACES)) die(2, `fact layer missing: ${PLACES}`);
const doorsFile = JSON.parse(readFileSync(DOORS, 'utf8'));
const places = JSON.parse(readFileSync(PLACES, 'utf8'));
const doors = doorsFile.doors;
if (!Array.isArray(doors) || doors.length === 0) die(1, 'doors.json carries no doors');

/**
 * The collision probe is EVIDENCE, not the criterion.
 *
 * `scene.bin` may be absent (build/ is gitignored), and this fact layer must still
 * generate: the DECLARATION does not depend on the bake. When the scene is present
 * the probe is recorded and reconciled; when it is absent the field is null and the
 * checker says so rather than inventing a depth.
 */
let collision = null;
let W = 0;
let H = 0;
let halfCrossTiles = null;
let sceneSha = null;
if (existsSync(SCENE)) {
  const buf = readFileSync(SCENE);
  W = buf.readUInt32LE(12);
  H = buf.readUInt32LE(16);
  if (buf.toString('ascii', 0, 8) !== 'TG25DSCN') die(1, 'scene.bin is not a TG25DSCN container');
  const manifestLen = buf.readUInt32LE(104);
  const manifest = JSON.parse(buf.toString('utf8', 108, 108 + manifestLen));
  halfCrossTiles = manifest.grid && manifest.grid.wTiles === W
    ? Math.floor(H / 2)
    : null;
  // GRID.halfCrossTiles is the storage offset; import it rather than halve H,
  // because "the corridor is 40 rows so half is 20" is a coincidence of this grid.
  const { GRID } = await import(
    new URL('../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', import.meta.url).href
  );
  halfCrossTiles = GRID.halfCrossTiles;
  const o = 108 + manifestLen;
  const n = W * H;
  collision = buf.subarray(o + n, o + 2 * n);
  const { createHash } = await import('node:crypto');
  sceneSha = createHash('sha256').update(buf).digest('hex').toUpperCase();
}

const placeById = new Map(places.map((p) => [p.id, p]));

/** Which place owns a door, via the fact layer's own `entrances.doorIds`. */
const doorOwner = new Map();
for (const p of places) {
  if (!p.entrances || !Array.isArray(p.entrances.doorIds)) continue;
  for (const id of p.entrances.doorIds) doorOwner.set(id, p.id);
}

/**
 * How many free rows lie AWAY FROM THE STREET behind this doorway.
 *
 * Direction, verified against the bytes rather than reasoned about, because getting
 * it backwards silently returns the WIDTH OF THE CORRIDOR and looks like a plausible
 * room. At the north door `D-N1` (18,24) the bytes read: rows 22-27 free, row 28
 * blocked, and the building footprint (`ground`) starts at row 25. So a north
 * shopfront's interior lies at INCREASING row, and the doorway faces the street from
 * the south. `row = floor(y_m) + halfCrossTiles` counts northward, and the north wall
 * of the corridor is further north than the facade the door sits on.
 *
 * Measured on this block: the north doors open into 3 free rows (D-43's bounded room,
 * closed by a back wall) and the south doors into 0, because row 0 is the corridor's
 * last row and one step south leaves the world. The first version of this probe used
 * -1 and reported 24 rows for the north doors — that is the corridor itself.
 */
function probeDepth(cellX, cellY) {
  if (!collision || halfCrossTiles === null) return null;
  const step = cellY >= halfCrossTiles ? 1 : -1;
  let depth = 0;
  for (let k = 1; k < H; k += 1) {
    const r = cellY + step * k;
    if (r < 0 || r >= H) break;
    if (collision[r * W + cellX] !== 0) break;
    depth += 1;
  }
  return depth;
}

/* ------------------------------------------------------------------ *
 * The DECLARATION — the part that is authored, and the part that decides.
 * ------------------------------------------------------------------ */
const SURFACE = {
  MEASURED_INTERIOR: 'measured-interior',
  UNMODELLED_INTERIOR: 'unmodelled-interior',
};

const MODEL_RULE =
  'The emitted corridor is 40 m deep (worldGrid.hTiles), so the collision layer can only ' +
  'carry an interior that falls inside it. A north-side door opens into a modelled room; a ' +
  'south-side door opens onto a building that lies OUTSIDE that window, so the engine has no ' +
  'geometry for it at all. The shortfall is in the MODEL, not in the world: both shopfronts ' +
  'exist in reality, and doors.json records both as valueKind=authored.';

const openable = doors.map((d) => {
  const placeId = doorOwner.get(d.doorId) || null;
  const place = placeId ? placeById.get(placeId) : null;
  const northSide = d.cellY >= (halfCrossTiles === null ? 20 : halfCrossTiles);
  const depth = probeDepth(d.cellX, d.cellY);

  /**
   * The surface kind is a PROPERTY OF THE WORLD, decided by which side of the
   * street the shopfront is on — not by how many free tiles the collision layer
   * happens to have. The probe below is recorded as evidence and reconciled; it is
   * never the input to this decision. `check-viewer.mjs` V4c uses exactly that
   * separation to prove the two sides have different sources.
   */
  const surface = northSide ? SURFACE.MEASURED_INTERIOR : SURFACE.UNMODELLED_INTERIOR;

  return {
    doorId: d.doorId,
    cellX: d.cellX,
    cellY: d.cellY,
    side: northSide ? 'north' : 'south',
    placeId,
    placeNameJa: place ? place.nameJa : null,
    source: 'city-packs/kyoto-shijo/doors.json#' + d.doorId + ' + places.json#' + (placeId || '?'),
    // THE DECLARATION:
    openable: true,
    surface,
    // EVIDENCE, measured, not the criterion:
    modelledInteriorRows: depth,
    modelledInteriorM: depth === null ? null : depth,
    ifUnmodelled: surface === SURFACE.UNMODELLED_INTERIOR
      ? 'the shopfront exists in the real world; the engine has no interior geometry for it, ' +
        'because the south building falls outside the emitted 40 m corridor'
      : null,
  };
});

const bySurface = openable.reduce((a, d) => {
  a[d.surface] = (a[d.surface] || 0) + 1;
  return a;
}, {});

const contract = {
  schema: 'tourguide.opener-contract/v1',
  generatedBy: 'iteration/tools/build-opener-fact.mjs',
  generatedFrom: {
    doors: 'city-packs/kyoto-shijo/doors.json',
    places: 'city-packs/kyoto-shijo/places.json',
    sceneProbe: sceneSha ? 'build/scene.bin' : null,
    sceneSha256: sceneSha,
  },
  /**
   * The distinction the whole task turns on. A consumer MUST render these two
   * differently, and the difference must be visible to a player who does not know
   * the background.
   */
  surfaceKinds: {
    [SURFACE.MEASURED_INTERIOR]: {
      realInteriorExists: true,
      modelled: true,
      playerFacingJa: '实际存在的店内（已建模）',
      interaction: 'enter-measured',
    },
    [SURFACE.UNMODELLED_INTERIOR]: {
      realInteriorExists: true,
      modelled: false,
      playerFacingJa: '实际存在的店（本版本未建模）',
      /** The first-version feedback the user authorised, verbatim in intent. */
      interaction: 'placeholder',
      placeholderTextJa: '内容开发中',
      placeholderTextZh: '内容开发中',
      /** What the placeholder must NOT do. */
      mustNot: [
        'draw a room, lobby or wall that no source describes',
        'present an unmodelled surface as if it were the real layout',
      ],
    },
  },
  modelRule: MODEL_RULE,
  counts: {
    doors: openable.length,
    openable: openable.filter((d) => d.openable).length,
    bySurface,
  },
  openable,
};

/* ------------------------------------------------------------------ *
 * Consistency the fact layer can check on itself.
 * ------------------------------------------------------------------ */
const problems = [];
for (const d of openable) {
  if (!d.placeId) problems.push(`${d.doorId}: no place declares this door in places.json entrances.doorIds`);
  if (!d.openable) problems.push(`${d.doorId}: declared not openable`);
  if (d.surface === SURFACE.MEASURED_INTERIOR && d.modelledInteriorRows === 0) {
    // This is the interesting direction: a MEASURED surface with no measured
    // depth means the collision layer and the world disagree. It is reported as a
    // finding rather than silently reconciled, because either file could be wrong.
    problems.push(
      `${d.doorId}: declared ${d.surface} (a room exists) but the collision probe found 0 free rows — ` +
      'the scene and the declaration disagree',
    );
  }
  if (d.surface === SURFACE.UNMODELLED_INTERIOR && d.modelledInteriorRows > 0) {
    problems.push(
      `${d.doorId}: declared ${d.surface} but the collision layer has ${d.modelledInteriorRows} free row(s) — ` +
      'the scene and the declaration disagree',
    );
  }
}
if (bySurface[SURFACE.MEASURED_INTERIOR] === undefined || bySurface[SURFACE.UNMODELLED_INTERIOR] === undefined) {
  problems.push('both surface kinds must be present, or a consumer cannot be shown to distinguish them');
}

const json = `${JSON.stringify(contract, null, 2)}\n`;

const md = [];
md.push('# Openable surfaces — the fact layer for door interaction');
md.push('');
md.push('> **DERIVED OUTPUT of `iteration/tools/build-opener-fact.mjs`. Do not hand-edit.**');
md.push('>');
md.push('> The DECLARATION lives in that script: the `SURFACE` vocabulary, the north/south rule,');
md.push('> and the placeholder contract. This file is its serialised form, regenerable from');
md.push('> `doors.json` + `places.json` + the scene probe. A hand-edit here would be a second');
md.push('> source of truth for a declared vocabulary, which is D-12 — the defect this project has');
md.push('> already paid for four times. Run the generator with `--check` to compare the artefacts');
md.push('> against what the script would write; any difference fails.');
md.push('');
md.push('## Why enterability is declared and not derived');
md.push('');
md.push('The scene\'s `openings` are derived from the collision bytes, so the south side is structurally');
md.push('zero and would stay zero however the fact layer felt about it. The user\'s ruling makes');
md.push('enterability a **set interaction**, so it is declared here and consumed by the viewer:');
md.push('');
md.push('> 南侧的店面在世界里不存在：仍然需要设置可以走进去的交互操作，第一版交互反馈显示「内容开发中」即可。以还原现实为第一标准。');
md.push('');
md.push('## Surface kinds');
md.push('');
md.push('| kind | real interior exists | modelled | interaction |');
md.push('|---|---|---|---|');
for (const [k, v] of Object.entries(contract.surfaceKinds)) {
  md.push(`| \`${k}\` | ${v.realInteriorExists} | ${v.modelled} | \`${v.interaction}\` |`);
}
md.push('');
md.push(`**Rule.** ${MODEL_RULE}`);
md.push('');
md.push('## Doors');
md.push('');
md.push('| door | cell | side | place | surface | modelled depth (evidence) |');
md.push('|---|---|---|---|---|---|');
for (const d of openable) {
  md.push(
    `| ${d.doorId} | ${d.cellX},${d.cellY} | ${d.side} | ${d.placeNameJa || d.placeId || '—'} | ` +
    `\`${d.surface}\` | ${d.modelledInteriorRows === null ? 'not probed (no scene.bin)' : `${d.modelledInteriorRows} row(s)`} |`,
  );
}
md.push('');
md.push(`Counts: **${contract.counts.doors} doors, ${contract.counts.openable} openable** — ` +
  `${bySurface[SURFACE.MEASURED_INTERIOR] || 0} measured, ${bySurface[SURFACE.UNMODELLED_INTERIOR] || 0} unmodelled.`);
md.push('');
md.push('**The modelled depth column is EVIDENCE, not the criterion.** It is measured from the collision');
md.push('layer and recorded so the two can be reconciled; the `surface` column is what decides, and it is');
md.push('decided by which side of the street the shopfront is on.');
const mdText = `${md.join('\n')}\n`;

/**
 * `--check`: is what is on disk what this script would write?
 *
 * This is the half that makes "derived output" a checkable property rather than a
 * promise. A hand-edit to `opener-contract.json` is a second source of truth for a
 * declared vocabulary, and this project has paid for that four times (the valueKind
 * mirror, SCENE_VERSION in two files, blockSize derived from nothing, the four copied
 * constants in task-18). So staleness fails here, and the fix is to regenerate.
 */
if (CHECK_ONLY) {
  const stale = [];
  if (!existsSync(OUT_JSON)) stale.push(`missing: ${relative(OUT_JSON)}`);
  else if (readFileSync(OUT_JSON, 'utf8') !== json) stale.push(`STALE: ${relative(OUT_JSON)}`);
  if (!existsSync(OUT_MD)) stale.push(`missing: ${relative(OUT_MD)}`);
  else if (readFileSync(OUT_MD, 'utf8') !== mdText) stale.push(`STALE: ${relative(OUT_MD)}`);
  if (stale.length) {
    for (const s of stale) process.stdout.write(`FAIL  ${s}\n`);
    process.stdout.write('\n  the artefacts are DERIVED from this script; regenerate them with\n' +
      '    node iteration/tools/build-opener-fact.mjs\n' +
      '  Regenerating is safe. Hand-editing them is not: the DECLARATION lives here, so a\n' +
      '  hand-edit would be a second source of truth (D-12).\n');
    process.exit(1);
  }
  process.stdout.write(`PASS  opener facts are current (${contract.counts.doors} doors, ` +
    `${bySurface[SURFACE.MEASURED_INTERIOR] || 0} measured, ` +
    `${bySurface[SURFACE.UNMODELLED_INTERIOR] || 0} unmodelled)\n`);
  process.exit(0);
}

writeFileSync(OUT_JSON, json, 'utf8');
writeFileSync(OUT_MD, mdText, 'utf8');

function relative(p) {
  return p.startsWith(REPO) ? p.slice(REPO.length + 1).replace(/\\/g, '/') : p;
}

const out = [];
out.push('build-opener-fact — openable surfaces (fact layer)');
out.push(`  doors input : ${doors.length} from city-packs/kyoto-shijo/doors.json`);
out.push(`  places input: ${places.length}, ${doorOwner.size} door(s) declared by a place`);
out.push(`  scene probe : ${sceneSha ? sceneSha.slice(0, 16) + '…' : 'absent (build/ is gitignored) — depth not probed'}`);
out.push('');
out.push(`  openable    : ${contract.counts.openable} of ${contract.counts.doors}`);
for (const [k, v] of Object.entries(bySurface)) out.push(`    ${k.padEnd(22)} ${v}`);
out.push('');
out.push('  door   side   surface                place                     modelled depth');
for (const d of openable) {
  out.push(
    `  ${d.doorId.padEnd(6)} ${d.side.padEnd(6)} ${d.surface.padEnd(22)} ` +
    `${(d.placeNameJa || '—').padEnd(24)} ${d.modelledInteriorRows === null ? 'not probed' : d.modelledInteriorRows + ' row(s)'}`,
  );
}
out.push('');
if (problems.length) {
  out.push(`  ${problems.length} consistency problem(s):`);
  for (const p of problems) out.push(`    ${p}`);
} else {
  out.push('  consistency : every door has a declaring place; every declared surface agrees with the probe');
}
process.stdout.write(`${out.join('\n')}\n`);

process.exitCode = problems.length ? 1 : 0;
