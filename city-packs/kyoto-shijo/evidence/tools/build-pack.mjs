#!/usr/bin/env node
/**
 * build-pack.mjs — the canonical, ordered build of city-packs/kyoto-shijo.
 *
 * Written because the hand-run order bit me twice: pack.json was merged from a stale
 * ungeoreferenced payload, so it kept factTier=static on records that carried hours while
 * the attestation copy on disk said semi-static. One entry point with a fixed order removes
 * that class of error — tier classification now runs AFTER every payload is loaded and
 * BEFORE anything is written, so the on-disk files cannot disagree.
 *
 * Steps, in order:
 *   1  measure-shijo-walk.mjs        evidence bytes  -> transit-measurement.json
 *   2  build-osm-places.mjs          OSM extracts    -> kyoto-shijo-osm-places.json (ODbL half)
 *   3  split-pack-meta.mjs           (no-op once split) head -> evidence/tools/*.meta.json
 *   4  apply-f2-corrections.mjs      temples in, labels aligned to OSM, gates closed, pointers fixed
 *   5  restore-temple-legs.mjs       the legs whose endpoints now resolve, + the 清水寺 leg
 *   6  extract-nonfact-rows.mjs      remaining non-fact rows -> parked payload (union)
 *   7  apply-tracked-corrections.mjs tracked metadata sources: doors valueKind, resolved items
 *   8  classify-freshness.mjs        derive factTier from the fields present
 *   9  merge-pack-meta.mjs           fold metadata into pack.json, publish attestations
 *  10  validate-city-pack-v2.mjs     assert; non-zero exit stops the build
 *
 * Ordering that matters, learned the hard way:
 *   - 4 before 5 before 6: corrections first (they are authoritative), then legs (they need the
 *     temples to have coordinates), then extract parks whatever still cannot be a fact record.
 *   - 6 before 8: tier derivation must see the parked payload, which 6 has just refreshed.
 *   - 8 before 9: merge publishes the parked payload, so the tiers have to be applied first.
 *   - 6 is a UNION, not a recompute-and-overwrite. The first version recomputed an empty
 *     "to park" list from an already-clean fact table and overwrote the payload with it,
 *     destroying three sourced temple records. Re-running a build must never lose data.
 *
 * Usage: node city-packs/kyoto-shijo/evidence/tools/build-pack.mjs
 * Idempotent: running it twice yields byte-identical output.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');
const REPO = resolve(PACK, '../..');
const EVID = join(PACK, 'evidence');

const node = process.execPath;
const run = (label, script, args = []) => {
  process.stdout.write(`\n──── ${label}\n`);
  const out = execFileSync(node, [script, ...args], { cwd: REPO, encoding: 'utf8' });
  process.stdout.write(out.split('\n').map((l) => (l ? `  ${l}` : l)).join('\n'));
};

// Losslessness guard, run around the whole build. The original data-loss defect was GREEN — it
// replaced a payload with an empty list and nothing complained — so the guarantee needs a check,
// not a comment. The snapshot is taken before any step writes.
const SNAP = join(EVID, 'tools', '.build-before.json');
run('0/10 snapshot the pack before the build (losslessness guard)', join(HERE, 'check-build-lossless.mjs'), ['--snapshot', SNAP]);

run('1/10 measure the corridor walk', join(HERE, 'measure-shijo-walk.mjs'), [join(EVID, 'osm-corridor-map.json'), '--out', join(EVID, 'transit-measurement.json')]);
run('2/10 build the ODbL half', join(HERE, 'build-osm-places.mjs'));
if (!Array.isArray(JSON.parse(execFileSync(node, ['-e', `process.stdout.write(require('fs').readFileSync(${JSON.stringify(join(PACK, 'places.json'))},'utf8'))`], { encoding: 'utf8' })))) {
  run('3/10 split the metadata head', join(HERE, 'split-pack-meta.mjs'));
} else {
  process.stdout.write('\n──── 3/10 split the metadata head\n  skipped: places.json / transit.json are already bare arrays\n');
}
run('4/10 apply the F2 corrections (D-15 temples, labels, gates, pointers)', join(HERE, 'apply-f2-corrections.mjs'));
run('4b/10 apply the F3 corrections (subway zones, station coordinates, gap wording)', join(HERE, 'apply-f3-corrections.mjs'));
run('5/10 restore the temple legs whose endpoints now resolve', join(HERE, 'restore-temple-legs.mjs'));
run('6/10 extract the remaining non-fact rows', join(HERE, 'extract-nonfact-rows.mjs'));
run('7/10 correct the tracked metadata sources', join(HERE, 'apply-tracked-corrections.mjs'));
run('8/10 derive freshness tiers', join(HERE, 'classify-freshness.mjs'));
run('9/10 merge metadata into pack.json', join(HERE, 'merge-pack-meta.mjs'));
run('9b/10 verify the build lost nothing', join(HERE, 'check-build-lossless.mjs'), ['--verify', SNAP]);

process.stdout.write('\n──── 10/10 validate\n');
try {
  const out = execFileSync(node, [join(PACK, 'validate-city-pack-v2.mjs'), REPO, PACK], { cwd: REPO, encoding: 'utf8' });
  process.stdout.write(out.split('\n').map((l) => (l ? `  ${l}` : l)).join('\n'));
} catch (e) {
  process.stdout.write((e.stdout ?? '').split('\n').map((l) => (l ? `  ${l}` : l)).join('\n'));
  process.stdout.write((e.stderr ?? '').split('\n').map((l) => (l ? `  ${l}` : l)).join('\n'));
  process.stderr.write(`\nBUILD FAILED at validation (exit ${e.status}).\n`);
  process.exit(e.status ?? 1);
}
process.stdout.write('\nBUILD OK — pack is internally consistent and self-asserting.\n');
