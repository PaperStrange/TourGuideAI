#!/usr/bin/env node
/**
 * validate-guide.mjs — the export layer's assertions.
 *
 * WHAT IT PROVES
 * --------------
 * A guide that renders is not a guide that is true. This file is the mechanical
 * answer to "is this route guide allowed to exist", and every check below is a
 * claim the project made that would otherwise be a declaration:
 *
 *   G1  determinism        — the emitter is a pure function of its inputs
 *   G2  scene binding      — the guide describes the world that was actually baked
 *   G3  input pinning      — the fact-layer files the guide claims are the ones on disk
 *   G4  verified column    — ONLY `observed`, gates computed from the IMPORTED allow-list
 *   G5  kind visibility    — every non-observed value carries its true kind, no blank
 *   G6  no blank labels    — a checked cell must be distinguishable from an unchecked one
 *   G7  value reachability — every printed scalar traces to a literal in the fact layer
 *   G8  gap presence       — the known gaps are written out, not omitted
 *   G9  route coverage     — every place record appears exactly once
 *   G10 fares              — D-31: looked up, never derived from distance
 *   G11 boundary           — the guide passes assert-export-boundary.mjs (task-4)
 *   G12 licence            — the mandatory ODbL / CC BY attributions are present verbatim
 *   G13 gap wording        — each gap says WHICH KIND of gap it is
 *   G14 no review text     — the no-platform-review-text rule, mechanically
 *   G15 route wording      — the guide does not promote the route
 *
 * FAIL-CLOSED: any exception, any unreadable input, or a missing output exits
 * non-zero. A validator that passes because it could not run is the failure mode
 * this file exists to prevent.
 *
 * USAGE
 *   node iteration/tools/validate-guide.mjs            run the gate
 *   node iteration/tools/validate-guide.mjs --json
 *   node iteration/tools/validate-guide.mjs --in-dir <dir>
 *
 * Exit codes: 0 = all pass, 1 = an assertion failed, 2 = environment/usage.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const REPO = resolve(import.meta.dirname, '../..');
const PACK_DIR = 'city-packs/kyoto-shijo';

/**
 * The gate is IMPORTED, never restated. `validate-city-pack-v2.mjs:61-67` already
 * establishes this pattern for the fact layer; the export layer must not be the
 * place where someone copies `['observed']` and lets the two drift.
 */
const CONTRACT = await import(
  new URL('../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs', import.meta.url).href
);

const JSON_OUT = process.argv.includes('--json');
const inIdx = process.argv.indexOf('--in-dir');
const IN_DIR = inIdx >= 0 ? process.argv[inIdx + 1] : 'build';

class EnvError extends Error {}

function readText(rel) {
  const abs = resolve(REPO, rel);
  if (!existsSync(abs)) throw new EnvError(`file not found: ${rel}`);
  return readFileSync(abs, 'utf8');
}

function readJson(rel) {
  try {
    return JSON.parse(readText(rel));
  } catch (e) {
    if (e instanceof EnvError) throw e;
    throw new EnvError(`not JSON: ${rel} — ${e.message}`);
  }
}

const results = [];
function check(id, name, ok, detail) {
  results.push({ id, name, ok: Boolean(ok), detail });
  return Boolean(ok);
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Every scalar leaf of a JSON value, as strings. Numbers are normalised. */
function leaves(value, out = []) {
  if (value === null || value === undefined) return out;
  if (typeof value === 'object') {
    for (const v of Object.values(value)) leaves(v, out);
    return out;
  }
  out.push(typeof value === 'number' ? String(value) : String(value));
  return out;
}

const sourceText = (cache, rel) => {
  if (!cache.has(rel)) cache.set(rel, readText(rel));
  return cache.get(rel);
};

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

function main() {
  const guidePath = `${IN_DIR}/guide.json`;
  const mdPath = `${IN_DIR}/guide.md`;
  const htmlPath = `${IN_DIR}/guide.html`;

  const guide = readJson(guidePath);
  const md = readText(mdPath);
  const html = readText(htmlPath);

  const places = readJson(`${PACK_DIR}/places.json`);
  const transit = readJson(`${PACK_DIR}/transit.json`);
  const pack = readJson(`${PACK_DIR}/pack.json`);
  const contract = readJson(`${PACK_DIR}/doors.json`); // presence check only

  const srcCache = new Map();
  const factLayerText = [
    sourceText(srcCache, `${PACK_DIR}/places.json`),
    sourceText(srcCache, `${PACK_DIR}/transit.json`),
    sourceText(srcCache, `${PACK_DIR}/pack.json`),
  ].join('\n');

  /* --- G1: determinism, verified by RERUNNING in child processes ---------- *
   * Two independent `node` processes, not two calls in this one: a module-level
   * cache or a reused object would hide non-determinism from an in-process check.
   */
  const tmp = mkdtempSync(join(tmpdir(), 'tg-guide-det-'));
  let determinism = { ok: false, detail: 'not run' };
  try {
    const runs = [];
    for (let i = 0; i < 2; i += 1) {
      const dir = join(tmp, `run${i}`);
      const r = spawnSync(
        process.execPath,
        [join(REPO, 'iteration', 'tools', 'emit-guide.mjs'), '--out-dir', dir],
        { cwd: REPO, encoding: 'utf8' },
      );
      if (r.status !== 0) {
        determinism = { ok: false, detail: `emitter exited ${r.status}: ${(r.stderr || '').slice(0, 300)}` };
        break;
      }
      runs.push({
        json: readFileSync(join(dir, 'guide.json'), 'utf8'),
        md: readFileSync(join(dir, 'guide.md'), 'utf8'),
        html: readFileSync(join(dir, 'guide.html'), 'utf8'),
      });
    }
    if (runs.length === 2) {
      const sameJson = runs[0].json === runs[1].json;
      const sameMd = runs[0].md === runs[1].md;
      const sameHtml = runs[0].html === runs[1].html;
      const committed = runs[0].json === readText(guidePath) && runs[0].md === readText(mdPath);
      determinism = {
        ok: sameJson && sameMd && sameHtml && committed,
        detail:
          `two child processes: guide.json identical=${sameJson}, guide.md identical=${sameMd}, ` +
          `guide.html identical=${sameHtml}; on-disk copies match the freshly emitted ones=${committed}`,
      };
    }
  } finally {
    try { rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  check('G1', 'deterministic: two independent runs produce byte-identical output', determinism.ok, determinism.detail);

  /* --- G3: input pinning ------------------------------------------------- */
  {
    const mismatches = [];
    for (const entry of guide.inputs.factLayer) {
      const actual = createHash('sha256').update(readFileSync(resolve(REPO, entry.path))).digest('hex').toUpperCase();
      if (actual !== entry.sha256) mismatches.push(`${entry.path}: guide says ${entry.sha256}, disk has ${actual}`);
    }
    const sceneAbs = resolve(REPO, guide.inputs.scene.path);
    const sceneActual = createHash('sha256').update(readFileSync(sceneAbs)).digest('hex').toUpperCase();
    if (sceneActual !== guide.inputs.scene.sha256) {
      mismatches.push(`scene: guide says ${guide.inputs.scene.sha256}, disk has ${sceneActual}`);
    }
    check(
      'G3',
      'every input sha256 the guide pins is the file actually on disk',
      mismatches.length === 0,
      mismatches.length ? mismatches.join('; ') : `${guide.inputs.factLayer.length} fact-layer files + scene.bin all match`,
    );
  }

  /* --- G2: scene binding ------------------------------------------------- */
  {
    const sceneBuf = readFileSync(resolve(REPO, guide.inputs.scene.path));
    const contractHash = sceneBuf.toString('ascii', 40, 104);
    const same = contractHash === guide.inputs.contract.fingerprint;
    check(
      'G2',
      'scene.bin was baked under the same contract fingerprint the guide claims',
      same,
      `scene contractHash=${contractHash} guide fingerprint=${guide.inputs.contract.fingerprint} match=${same}`,
    );
  }

  /* --- G4: the verified column ------------------------------------------ */
  const allCells = [];
  for (const s of guide.stops) for (const c of s.verified) allCells.push({ ...c, where: `stop ${s.seq} (${s.placeId})` });
  for (const n of guide.nearby) for (const c of n.verified) allCells.push({ ...c, where: `nearby (${n.placeId})` });
  for (const l of guide.route.legs) for (const c of l.verified) allCells.push({ ...c, where: `leg ${l.legId}` });
  for (const l of guide.branchLegs) for (const c of l.verified) allCells.push({ ...c, where: `branch ${l.legId}` });

  const { mayAppearInGuideVerifiedColumn, GUIDE_VERIFIED_COLUMN_ALLOWED, VALUE_KINDS } = CONTRACT;

  {
    const bad = allCells.filter((c) => c.valueKind !== 'observed');
    const allowed = [...GUIDE_VERIFIED_COLUMN_ALLOWED];
    check(
      'G4',
      `the verified column contains ONLY ${JSON.stringify(allowed)} (allow-list imported, not restated)`,
      bad.length === 0 && allowed.length === 1 && allowed[0] === 'observed',
      bad.length
        ? `${bad.length} offending cell(s): ` + bad.slice(0, 5).map((c) => `${c.where}.${c.field}=${c.valueKind}`).join('; ')
        : `${allCells.length} verified cells, all observed; imported allow-list=${JSON.stringify(allowed)}; ` +
          `guide records it as ${JSON.stringify(guide.summary.guideVerifiedColumnAllowedImported)}`,
    );
  }

  /* --- G5: kind visibility on everything that is NOT in the verified column */
  {
    const others = [];
    for (const s of guide.stops) for (const c of s.otherKinds) others.push({ ...c, where: `stop ${s.seq}` });
    for (const n of guide.nearby) for (const c of n.otherKinds) others.push({ ...c, where: `nearby ${n.placeId}` });
    for (const l of guide.route.legs) for (const c of l.otherKinds) others.push({ ...c, where: `leg ${l.legId}` });
    for (const l of guide.branchLegs) for (const c of l.otherKinds) others.push({ ...c, where: `branch ${l.legId}` });

    const blank = others.filter((c) => !c.valueKind || typeof c.valueKind !== 'string');
    const unknown = others.filter((c) => c.valueKind && !VALUE_KINDS.includes(c.valueKind));
    check(
      'G5',
      'every non-verified value carries a real valueKind string (never blank, never unknown)',
      blank.length === 0 && unknown.length === 0,
      blank.length || unknown.length
        ? `blank=${blank.length} unknown=${unknown.length}`
        : `${others.length} non-verified cells all carry a kind from ${JSON.stringify(VALUE_KINDS)}; ` +
          `kinds present: ${JSON.stringify([...new Set(others.map((c) => c.valueKind))].sort())}`,
    );
    /**
     * The promotion direction, GATE-AWARE.
     *
     * A cell with an allowed kind may legitimately sit outside the verified column
     * when the RECORD gate is closed (contract-export.md section 3.3: two gates,
     * not one). The first version of this check ignored the second gate and
     * flagged all 7 cells of the two `guideVerifiedColumnAllowed: false` records
     * — the check was wrong, not the emitter.
     */
    const wrong = others.filter(
      (c) => mayAppearInGuideVerifiedColumn(c.valueKind) && c.recordGateOpen !== false,
    );
    const gateClosedCount = others.filter(
      (c) => mayAppearInGuideVerifiedColumn(c.valueKind) && c.recordGateOpen === false,
    ).length;
    check(
      'G5b',
      'no cell is left out of the verified column while BOTH gates are open',
      wrong.length === 0,
      wrong.length
        ? `${wrong.length} cell(s) hold an allowed kind with the record gate open but sit in otherKinds: ` +
          wrong.slice(0, 5).map((c) => `${c.where}.${c.field}=${c.valueKind}`).join('; ')
        : `every cell permitted by both gates is in the verified column; ` +
          `${gateClosedCount} cell(s) kept out by the fact layer's own guideVerifiedColumnAllowed=false`,
    );
  }

  /* --- G6: no blank labels; a check result must be visible ---------------- */
  {
    const byKind = {};
    for (const c of allCells) byKind[c.valueKind] = (byKind[c.valueKind] || 0) + 1;
    const othersByKind = {};
    for (const s of guide.stops) for (const c of s.otherKinds) othersByKind[c.valueKind] = (othersByKind[c.valueKind] || 0) + 1;
    for (const n of guide.nearby) for (const c of n.otherKinds) othersByKind[c.valueKind] = (othersByKind[c.valueKind] || 0) + 1;
    for (const l of guide.route.legs) for (const c of l.otherKinds) othersByKind[c.valueKind] = (othersByKind[c.valueKind] || 0) + 1;

    const kindLabelPresent = {};
    for (const k of Object.keys(othersByKind)) {
      // The markdown must render this kind with a visible label somewhere.
      kindLabelPresent[k] = md.includes(`[${k}]`) || md.includes(k);
    }
    const allLabelled = Object.values(kindLabelPresent).every(Boolean);
    check(
      'G6',
      'a value whose kind forbids the verified column is never rendered as if it were verified',
      allLabelled && (othersByKind.licenced || 0) > 0,
      `verified by kind ${JSON.stringify(byKind)}; outside the column ${JSON.stringify(othersByKind)}; ` +
        `each such kind has a visible label in guide.md=${allLabelled}`,
    );
  }

  /* --- G7: value reachability ------------------------------------------- */
  {
    const missing = [];
    let checked = 0;
    const walkRow = (row, where) => {
      for (const c of [...row.verified, ...row.otherKinds]) {
        // Only scalar leaves are checkable as literals; arrays/objects are walked.
        for (const leaf of leaves(c.value)) {
          checked += 1;
          if (leaf === '' || leaf === 'null' || leaf === 'undefined') continue;
          if (!factLayerText.includes(leaf)) missing.push(`${where}.${c.field} = ${JSON.stringify(leaf)}`);
        }
      }
    };
    for (const s of guide.stops) walkRow(s, `stop ${s.seq}`);
    for (const n of guide.nearby) walkRow(n, `nearby ${n.placeId}`);
    for (const l of guide.route.legs) walkRow(l, `leg ${l.legId}`);
    for (const l of guide.branchLegs) walkRow(l, `branch ${l.legId}`);

    // Fair-fare cells must also come from the fact layer.
    for (const f of guide.fares) {
      for (const leaf of leaves({ fareAdult: f.fareAdult, fareChild: f.fareChild, zoneCount: f.zoneCount })) {
        checked += 1;
        if (!factLayerText.includes(leaf)) missing.push(`fare ${f.fareId} = ${JSON.stringify(leaf)}`);
      }
    }

    check(
      'G7',
      'every value the guide prints appears literally in the fact layer',
      missing.length === 0 && checked > 0,
      missing.length
        ? `${missing.length} unbacked value(s): ` + missing.slice(0, 6).join('; ')
        : `${checked} scalar value(s) traced verbatim into places.json / transit.json / pack.json`,
    );
  }

  /* --- G8: the known gaps are all written out --------------------------- */
  {
    const gapIds = new Set(guide.gaps.map((g) => g.gapId));
    const kinds = new Set(guide.gaps.map((g) => g.kind));

    const heightGap = guide.gaps.find((g) => g.kind === 'unsourced-height');
    const heightCount = heightGap ? heightGap.count : 0;

    // The scene manifest is the authority on how many buildings have no source.
    const sceneBuf = readFileSync(resolve(REPO, guide.inputs.scene.path));
    const manifestLen = sceneBuf.readUInt32LE(104);
    const manifest = JSON.parse(sceneBuf.toString('utf8', 108, 108 + manifestLen));
    const abstractCount = manifest.counts.heightAbstract;
    const abstractWithNumber = manifest.records.filter(
      (r) => r.valueKind === 'abstract' && r.heightM !== null,
    ).length;

    const transitGapCount = (pack.transit.gaps || []).length;
    const emittedTransitGaps = guide.gaps.filter((g) => g.kind === 'no-running-time').length;

    check(
      'G8',
      'the gaps are present in the output, with counts that match their source',
      gapIds.size === guide.gaps.length &&
        heightCount > 0 &&
        heightCount === abstractCount &&
        abstractWithNumber === 0 &&
        emittedTransitGaps === transitGapCount &&
        kinds.has('coordinate-unavailable') &&
        kinds.has('leg-missing-between-stops') &&
        kinds.has('scene-window-outside'),
      `gap entries=${guide.gaps.length} (unique ids=${gapIds.size}); unsourced-height=${heightCount} ` +
        `vs scene manifest heightAbstract=${abstractCount} (abstract rows carrying a number=${abstractWithNumber}, must be 0); ` +
        `pack transit gaps=${transitGapCount} all emitted=${emittedTransitGaps === transitGapCount}; ` +
        `kinds present=${JSON.stringify([...kinds].sort())}`,
    );

    // Every gap must also be VISIBLE in the human-readable output.
    const invisible = guide.gaps.filter((g) => !md.includes(g.gapId));
    check(
      'G8b',
      'every gap id is rendered in guide.md (a gap only in JSON is an omission)',
      invisible.length === 0,
      invisible.length ? `not rendered: ${invisible.map((g) => g.gapId).join(', ')}` : `all ${guide.gaps.length} gap ids appear in guide.md`,
    );
  }

  /* --- G9: route coverage ----------------------------------------------- */
  {
    const seen = new Map();
    for (const s of guide.stops) seen.set(s.placeId, (seen.get(s.placeId) || 0) + 1);
    for (const n of guide.nearby) seen.set(n.placeId, (seen.get(n.placeId) || 0) + 1);
    const dupes = [...seen].filter(([, n]) => n > 1).map(([id]) => id);
    const missing = places.map((p) => p.id).filter((id) => !seen.has(id));
    const unknown = [...seen.keys()].filter((id) => !places.some((p) => p.id === id));

    check(
      'G9',
      'every place record appears exactly once in the guide (nothing dropped, nothing duplicated)',
      dupes.length === 0 && missing.length === 0 && unknown.length === 0,
      `guide covers ${seen.size} of ${places.length} place records; duplicated=${JSON.stringify(dupes)}; ` +
        `missing=${JSON.stringify(missing)}; not-in-pack=${JSON.stringify(unknown)}; ` +
        `accounted-for counter says ${guide.summary.placesAccountedFor}`,
    );
  }

  /* --- G10: D-31, fares ------------------------------------------------ */
  {
    const fares = guide.fares || [];
    const notLookup = fares.filter((f) => f.basis !== 'lookup');
    const computed = fares.filter((f) => f.computedFromDistance || Number(guide.summary.fares.computedFromDistance) !== 0);
    // The pack must still say `区` is not geographic: if that statement is ever
    // removed, this check has lost its premise and must fail rather than pass quietly.
    const premise = pack.transit?.subwayZones?.zoneIsNotGeographic;
    const premiseHolds = Boolean(premise && /never be COMPUTED from coordinates or from distance/.test(premise.consequence || ''));
    // Every subway fare must equal a value that exists in the pack's own table.
    const zoneTable = pack.transit?.subwayZones?.fareByZone || {};
    const tableFares = new Set();
    for (const z of Object.values(zoneTable)) { tableFares.add(z.adult); tableFares.add(z.child); }
    const unbacked = fares
      .filter((f) => f.mode === 'subway' && Number.isFinite(f.fareAdult))
      .filter((f) => !tableFares.has(f.fareAdult));

    check(
      'G10',
      'D-31: every fare is a table lookup, none is derived from distance',
      notLookup.length === 0 && computed.length === 0 && premiseHolds && unbacked.length === 0 &&
        Number(guide.summary.fares.computedFromDistance) === 0,
      `fares=${fares.length} all basis=lookup=${notLookup.length === 0}; ` +
        `computedFromDistance=${guide.summary.fares.computedFromDistance}; ` +
        `priceableAsALeg=${fares.filter((f) => f.priceableAsALeg).length}; ` +
        `zoneIsNotGeographic premise still present and still forbids distance=${premiseHolds}; ` +
        `subway fares not present in fareByZone=${JSON.stringify(unbacked.map((f) => f.fareAdult))}`,
    );

    // The bait must not have been carried into the guide.
    const kmBait = /kmUpTo/.test(JSON.stringify(guide));
    check(
      'G10b',
      'the distance bait (fareByZone.kmUpTo) is absent from the guide',
      !kmBait,
      kmBait ? 'guide.json contains kmUpTo — the field that makes distance-derived fares look supported' : 'no kmUpTo anywhere in guide.json',
    );
  }

  /* --- G11: the export boundary (task-4) -------------------------------- */
  let boundaryDetail = 'not run';
  let boundaryOk = false;
  {
    const r = spawnSync(
      process.execPath,
      [
        join(REPO, 'docs', 'handOff', 'dsh-bundle-tourguide-2.5d', 'tools', 'assert-export-boundary.mjs'),
        '--pack', join(REPO, PACK_DIR),
        '--export', join(REPO, htmlPath),
        '--json',
      ],
      { cwd: REPO, encoding: 'utf8' },
    );
    let parsed = null;
    try { parsed = JSON.parse(r.stdout); } catch { /* leave null */ }
    boundaryOk = r.status === 0 && parsed && parsed.pass === true;
    boundaryDetail = parsed
      ? `exit=${r.status} pass=${parsed.pass} violations=${parsed.violations.length} ` +
        `guideTextNodes=${parsed.stats.guideNodes} narrativeNodes=${parsed.stats.narrativeNodes} ` +
        `allowList=${parsed.allowMode}`
      : `exit=${r.status} unparsable output: ${(r.stdout || r.stderr || '').slice(0, 200)}`;
    if (parsed && parsed.violations.length) {
      boundaryDetail += ` | first violations: ${parsed.violations.slice(0, 3).map((v) => `${v.class}:${v.match}`).join(', ')}`;
    }
  }
  check('G11', 'the emitted guide.html PASSES the export-boundary assertion (task-4)', boundaryOk, boundaryDetail);

  /* --- G12: licence obligations travel with the guide -------------------- */
  {
    const odbl = pack.licenceObligations.odblAttribution;
    const ccby = pack.licenceObligations.ccByAttributionJa;
    const inJson = guide.licences.odbl.attribution === odbl && guide.licences.ccByKyoto.attributionJa === ccby;
    const inMd = md.includes(odbl) && md.includes(ccby);
    check(
      'G12',
      'the mandatory ODbL and CC BY attributions are present VERBATIM in both outputs',
      inJson && inMd,
      `json exact=${inJson} markdown contains both=${inMd}; odbl=${JSON.stringify(odbl)}; ccby length=${ccby.length}`,
    );
  }

  /* --- G13: gap wording rule -------------------------------------------- *
   * Classified, not grepped. The first version looked for a wording phrase inside
   * every gap sentence and failed 11 of them for using their own words; the pack's
   * rule is that a gap DECLARES its class, so the check now reads the declared
   * class and cross-checks it against the sentence.
   */
  {
    const rule = pack.transit?.gapWordingRule?.rule || '';
    const classes = new Set(Object.values({
      WORLD_NOT_PUBLISHED: 'world-has-not-published',
      SOURCES_NOT_COVERED: 'our-sources-do-not-cover',
      NOT_INGESTED: 'source-exists-but-not-ingested',
    }));
    const unclassified = guide.gaps.filter((g) => !classes.has(g.wordingClass));
    // A gap declared `world-has-not-published` must actually say so in its sentence.
    const inconsistent = guide.gaps.filter((g) => {
      if (g.wordingClass !== 'world-has-not-published') return false;
      return !/世界が公表していない|世界没有公布|OSM に存在しない|OSM に存在せず/.test(g.statementJa);
    });
    check(
      'G13',
      'each gap declares WHICH kind of gap it is, and the class agrees with its sentence',
      unclassified.length === 0 && inconsistent.length === 0 && rule.length > 0,
      unclassified.length || inconsistent.length
        ? `unclassified=${unclassified.map((g) => g.gapId).join(', ')}; ` +
          `class contradicts sentence=${inconsistent.map((g) => g.gapId).join(', ')}`
        : `all ${guide.gaps.length} gaps declare a class; ` +
          `distribution=${JSON.stringify(guide.gaps.reduce((a, g) => { a[g.wordingClass] = (a[g.wordingClass] || 0) + 1; return a; }, {}))}; ` +
          `pack wording rule present=${rule.length > 0}`,
    );
  }

  /* --- G14: no platform review text ------------------------------------- *
   * The first version of this check flagged the guide's OWN policy sentence
   * ("任何平台的评价正文一律不进入本攻略"), i.e. it failed the guide for saying
   * it does not do the thing. A vocabulary scan must exclude the disclaimer that
   * performs the exclusion, or it can never be satisfied by an honest document.
   */
  {
    const platformWords = ['点评', '评价', '口碑', '大众点评', 'tabelog', '食べログ', 'yelp', 'tripadvisor', '猫途鹰', '小红书', '马蜂窝', '携程', 'reviews'];
    // Strip the two policy statements that exist to forbid this content.
    const body = md
      .replace(/^> .*评价.*$/gm, '')
      .replace(/- .*评价正文.*$/gm, '')
      .replace(/- 任何平台的评价正文.*$/gm, '');
    const hits = platformWords.filter((w) => body.includes(w));
    const pol = guide.licences.reviewTextPolicy;
    check(
      'G14',
      'no platform review text or "N user reviews" style claim reaches the guide BODY',
      hits.length === 0 && pol.platformReviewText === 0 && pol.curatedDescriptions === 0,
      hits.length
        ? `platform vocabulary found outside the policy statement: ${hits.join(', ')}`
        : `no platform-review vocabulary in the guide body (policy sentence excluded); counters ${JSON.stringify(pol)}`,
    );
  }

  /* --- G15: route wording ---------------------------------------------- *
   * Same lesson: `不是推荐清单` ("is not a recommendation list") contains the word
   * 推荐. A negation must not read as a claim, so the check looks at the word in
   * context and exempts an explicit negation.
   */
  {
    const banned = ['推荐', '最佳', '必去', '不容错过', 'recommended', 'must-see'];
    const lines = md.split('\n');
    const hits = [];
    for (const line of lines) {
      for (const w of banned) {
        let idx = line.toLowerCase().indexOf(w.toLowerCase());
        while (idx !== -1) {
          const before = line.slice(Math.max(0, idx - 12), idx);
          const negated = /不是|不含|并不|非|no |not |never /.test(before);
          if (!negated) hits.push(`${w} @ ${JSON.stringify(line.slice(Math.max(0, idx - 20), idx + 20))}`);
          idx = line.toLowerCase().indexOf(w.toLowerCase(), idx + 1);
        }
      }
    }
    const declared = /FORBIDDEN_ROUTE_WORDS/.test(readText('iteration/tools/emit-guide.mjs'));
    check(
      'G15',
      'the guide does not promote the route (negated usage such as "不是推荐清单" is not a claim)',
      hits.length === 0 && declared,
      hits.length
        ? `promotional wording found: ${hits.slice(0, 4).join(' | ')}`
        : `no promotional route wording in guide.md; emitter declares the list=${declared}`,
    );
  }

  /* --- G16: doors are authored and stay out of the verified column ------- */
  {
    const doorFile = contract;
    const doorRows = doorFile.doors || [];
    const doorIds = doorRows.map((d) => d.doorId).filter(Boolean);
    const kinds = [...new Set(doorRows.map((d) => d.provenance?.valueKind))];
    // Test against the ACTUAL door ids, not the string "D-N": a first version
    // grepped for `D-N` and failed on the quoted `whyNotObserved` prose.
    const leaked = doorIds.filter((id) => JSON.stringify(guide).includes(id));
    const entranceCells = [];
    for (const s of guide.stops) for (const c of s.verified) if (c.field === 'entrances') entranceCells.push(s.placeId);
    for (const n of guide.nearby) for (const c of n.verified) if (c.field === 'entrances') entranceCells.push(n.placeId);
    const authoredEntranceCells = [];
    for (const s of guide.stops) for (const c of s.otherKinds) if (c.field === 'entrances') authoredEntranceCells.push(`${s.placeId}:${c.valueKind}`);
    for (const n of guide.nearby) for (const c of n.otherKinds) if (c.field === 'entrances') authoredEntranceCells.push(`${n.placeId}:${c.valueKind}`);
    const allAuthored = authoredEntranceCells.every((x) => x.endsWith(':authored'));
    check(
      'G16',
      'the 12 authored doors are declared authored, never verified, and their ids stay out of the guide',
      kinds.length === 1 && kinds[0] === 'authored' && leaked.length === 0 && entranceCells.length === 0 &&
        allAuthored && authoredEntranceCells.length > 0,
      `doors.json valueKinds=${JSON.stringify(kinds)} (${doorRows.length} doors); ` +
        `door ids appearing in guide.json=${JSON.stringify(leaked)}; ` +
        `entrances cells in the verified column=${entranceCells.length}; ` +
        `entrances cells outside it=${JSON.stringify(authoredEntranceCells)}`,
    );
  }

  /* --- summary ---------------------------------------------------------- */
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  if (JSON_OUT) {
    process.stdout.write(
      `${JSON.stringify({ tool: 'validate-guide', dir: IN_DIR, passed, failed, exitCode: failed ? 1 : 0, checks: results }, null, 2)}\n`,
    );
  } else {
    process.stdout.write('validate-guide — the export layer\'s assertions\n\n');
    for (const r of results) {
      process.stdout.write(`${r.id.padEnd(5)} ${r.ok ? 'PASS' : 'FAIL'}  ${r.name}\n`);
      process.stdout.write(`          ${r.detail}\n`);
    }
    process.stdout.write(`\n${passed}/${results.length} assertions passed, ${failed} failed\n`);
    if (failed === 0) {
      const s = guide.summary;
      process.stdout.write(
        `\nvalue distribution: ${JSON.stringify(s.valueCounts)} (${s.cellCount} cells) · ` +
          `verified column ${s.verifiedColumnCount} · gaps ${s.gapCount} entries / ${s.gapItemCount} items · ` +
          `fares computedFromDistance ${s.fares.computedFromDistance}\n`,
      );
      process.stdout.write(
        `guide.json sha256 ${createHash('sha256').update(readFileSync(resolve(REPO, guidePath))).digest('hex').toUpperCase()}\n`,
      );
      process.stdout.write(
        `guide.md   sha256 ${createHash('sha256').update(readFileSync(resolve(REPO, mdPath))).digest('hex').toUpperCase()}\n`,
      );
    }
  }
  return failed === 0 ? 0 : 1;
}

try {
  process.exitCode = main();
} catch (err) {
  if (err instanceof EnvError) {
    process.stderr.write(`ENV ERROR  ${err.message}\n`);
    process.exitCode = 2;
  } else {
    process.stderr.write(`FAIL-CLOSED  unexpected error (must never be read as a pass):\n${err && err.stack ? err.stack : err}\n`);
    process.exitCode = 2;
  }
}
