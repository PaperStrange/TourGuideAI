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
 *   4  restore-parked-records.mjs    re-author the non-fact records FROM THE EVIDENCE BYTES
 *   5  extract-nonfact-rows.mjs      fact tables     -> parked payload (idempotent union)
 *   6  classify-freshness.mjs        derive factTier from the fields present
 *   7  merge-pack-meta.mjs           fold metadata into pack.json, publish attestations
 *   8  validate-city-pack-v2.mjs     assert; non-zero exit stops the build
 *
 * Ordering that matters, learned the hard way:
 *   - 4 before 5: restore appends to the fact tables, extract parks what it finds.
 *   - 5 before 6: tier derivation must see the parked payload, which 5 has just refreshed.
 *   - 6 before 7: merge publishes the parked payload, so the tiers have to be applied first.
 *   - 5 is a UNION, not a recompute-and-overwrite. The first version recomputed an empty
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

run('1/9 measure the corridor walk', join(HERE, 'measure-shijo-walk.mjs'), [join(EVID, 'osm-corridor-map.json'), '--out', join(EVID, 'transit-measurement.json')]);
run('2/9 build the ODbL half', join(HERE, 'build-osm-places.mjs'));
if (!Array.isArray(JSON.parse(execFileSync(node, ['-e', `process.stdout.write(require('fs').readFileSync(${JSON.stringify(join(PACK, 'places.json'))},'utf8'))`], { encoding: 'utf8' })))) {
  run('3/9 split the metadata head', join(HERE, 'split-pack-meta.mjs'));
} else {
  process.stdout.write('\n──── 3/9 split the metadata head\n  skipped: places.json / transit.json are already bare arrays\n');
}
run('4/9 re-author the non-fact records from the evidence bytes', join(HERE, 'restore-parked-records.mjs'));
run('5/9 correct the tracked metadata sources (doors valueKind, resolved contradictions)', join(HERE, 'apply-tracked-corrections.mjs'));
run('6/9 extract the non-fact rows from the fact tables', join(HERE, 'extract-nonfact-rows.mjs'));
run('7/9 derive freshness tiers', join(HERE, 'classify-freshness.mjs'));
run('8/9 merge metadata into pack.json', join(HERE, 'merge-pack-meta.mjs'));

process.stdout.write('\n──── 9/9 validate\n');
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
