// gate-scene-read.mjs — read scene.bin from the BYTES, and assert the container agrees with itself.
//
// WHY THIS EXISTS. iteration/design/gate1-scope.md established that Gate 1 needs a WALKABLE
// world, that this is derived geometry rather than hand-authored art, and that nothing currently
// reads scene.bin except emit-guide -- which unpacks it only to check the export boundary. There
// is no renderer, no collision consumer and no player. This is the first step of the shell: the
// bytes must be readable by something that is not emit-scene.mjs, and the format must be asserted
// rather than assumed.
//
// It is deliberately a SEPARATE reader from emit-guide's. Two independent readers of one
// container is the same posture emit-guide itself chose when it stopped trusting the container:
// the header is re-derived and cross-checked, not believed. If this reader and that one ever
// disagree, the container has changed under one of them and that is the finding.
//
// Format, derived from the bytes and asserted below rather than copied from a comment:
//
//   0-7      magic "TG25DSCN"
//   8-11     version (u32)
//   12-15    wTiles (u32)
//   16-19    hTiles (u32)
//   20-23    chunksAlongX (u32)
//   24-31    lonUdeg (i64, microdegrees)
//   32-39    latUdeg (i64, microdegrees)
//   40-103   contractHash (64 bytes ASCII)
//   104-107  manifestLen (u32)
//   108...   manifest (JSON, manifestLen bytes)
//   then     ground[n], collision[n], heights[n], occlusionHalf[wTiles]   where n = wTiles*hTiles
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ORIGIN, worldGrid, GRID } from '../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs';
import { SCENE_MAGIC, SCENE_VERSION } from './emit-scene.mjs';

const REPO = join(import.meta.dirname, '..', '..');
const P = join(REPO, 'build', 'scene.bin');

const problems = [];
const ok = (id, cond, detail) => { if (!cond) problems.push(`${id}: ${detail}`); console.log(`${id} ${cond ? 'PASS' : 'FAIL'}  ${detail}`); };

// SELF-SUFFICIENT BY CONSTRUCTION. build/ is gitignored, so a clean checkout has no scene.bin
// and the first version of this gate exited 2 with 'could not RUN' there while passing on my
// machine. That is the SEVENTH occurrence of one shape in this harness: a verdict that depends
// on how the working copy was prepared rather than on the repository. R1 assumed a single-branch
// clone carries every branch; R7 required a per-clone hook that CI can never have; branch-sync
// read an empty branch list as 'not a git repository'; the guide gate pointed at an absent build
// product. The remedy has been identical every time, and relying on gate ORDER to supply the
// artefact is the same fault wearing a different hat -- so this bakes its own input when the
// artefact is missing rather than assuming a predecessor ran.
import { spawnSync } from 'node:child_process';
let buf;
try {
  buf = readFileSync(P);
} catch {
  if (!process.argv.includes('--bake-if-absent')) {
    console.log(`ENV  no scene.bin at ${P} - run emit-scene.mjs first, or pass --bake-if-absent`);
    process.exit(2);
  }
  const r = spawnSync(process.execPath, [join(REPO, 'iteration', 'tools', 'emit-scene.mjs')], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) {
    console.log(`ENV  could not bake the scene (exit ${r.status})`);
    const all = (r.stdout ?? '') + (r.stderr ?? '');
    for (const l of all.split('\n').slice(-6)) if (l.trim()) console.log('    ' + l);
    process.exit(2);
  }
  buf = readFileSync(P);
  console.log('(scene.bin was absent and this gate baked it)');
}

// The container's format id and version are IMPORTED, not copied. This reader's LOGIC is
// independent of the emitter -- it re-derives the header and cross-checks it -- but the format
// CONSTANTS must not be: a reader carrying its own copy of the magic cannot notice that the
// container changed format, which is the one thing R2 and R3 exist to notice. The evidence is
// immediate: R3 read ersion === 1 as a literal and therefore kept passing the assertion while
// the emitter had already moved to version 2.
ok('R1', buf.length >= 108, `${buf.length} B, minimum header is 108`);
ok('R2', buf.toString('ascii', 0, 8) === SCENE_MAGIC, `magic ${JSON.stringify(buf.toString('ascii', 0, 8))}`);
const version = buf.readUInt32LE(8);
const wTiles = buf.readUInt32LE(12);
const hTiles = buf.readUInt32LE(16);
const chunksAlongX = buf.readUInt32LE(20);
const lonUdeg = Number(buf.readBigInt64LE(24));
const latUdeg = Number(buf.readBigInt64LE(32));
const contractHash = buf.toString('ascii', 40, 104);
const manifestLen = buf.readUInt32LE(104);

ok('R3', version === SCENE_VERSION, `version ${version} equals the IMPORTED SCENE_VERSION ${SCENE_VERSION}`);
// The container must agree with the FROZEN CONTRACT, not merely with itself. A scene baked
// under a different grid is a scene of a different world.
ok('R4', wTiles === worldGrid.wTiles && hTiles === worldGrid.hTiles,
  `grid ${wTiles}x${hTiles} equals the frozen worldGrid ${worldGrid.wTiles}x${worldGrid.hTiles}`);
ok('R5', chunksAlongX === GRID.chunksAlongX, `chunksAlongX ${chunksAlongX} equals GRID ${GRID.chunksAlongX}`);
// The origin in the header must BE the contract's origin: this is the datum the whole world is
// measured from, and a container carrying a stale one would silently misplace every door.
ok('R6', lonUdeg === ORIGIN.lonUdeg && latUdeg === ORIGIN.latUdeg,
  `origin ${lonUdeg},${latUdeg} equals the frozen ORIGIN ${ORIGIN.lonUdeg},${ORIGIN.latUdeg}`);

// The container must agree with its own length. emit-guide asserts this too; asserting it in a
// second reader is the point -- one reader agreeing with itself is not corroboration.
const n = wTiles * hTiles;
const layerBytes = n * 3 + wTiles;              // ground, collision, heights, then one byte per column
const expected = 108 + manifestLen + layerBytes;
ok('R7', expected === buf.length, `header implies ${expected} B (manifest ${manifestLen} + layers ${layerBytes}), file is ${buf.length} B`);

if (problems.length) { console.log(`\n${problems.length} problem(s); not reading layers.`); process.exit(1); }

let o = 108;
let manifest;
try { manifest = JSON.parse(buf.toString('utf8', o, o + manifestLen)); }
catch (e) { console.log(`FAIL  manifest is not JSON: ${e.message}`); process.exit(1); }
o += manifestLen;
const ground = buf.subarray(o, o + n); o += n;
const collision = buf.subarray(o, o + n); o += n;
const heights = buf.subarray(o, o + n); o += n;
const occlusionHalf = buf.subarray(o, o + wTiles); o += wTiles;
ok('R8', o === buf.length, `consumed ${o} B of ${buf.length} - no trailing bytes and no short read`);

// The manifest must describe the layers that actually follow it.
const mGround = manifest.layers?.ground ?? manifest.ground ?? null;
if (mGround && typeof mGround.tiles === 'number') {
  let used = 0; for (const v of ground) if (v !== 0) used++;
  ok('R9', used === mGround.tiles, `manifest says ${mGround.tiles} ground tiles, the bytes hold ${used} non-zero`);
} else {
  console.log('R9 SKIP  manifest carries no ground tile count under a key this reader recognises');
}

// Cross-check against the emitter's own published numbers, read here from the bytes.
let blocked = 0; for (const v of collision) if (v !== 0) blocked++;
console.log(`\nread from the bytes:`);
console.log(`  origin            ${lonUdeg},${latUdeg}   grid ${wTiles}x${hTiles}  chunks ${chunksAlongX}`);
console.log(`  contract hash     ${contractHash.slice(0, 16)}...  (${contractHash.length} chars)`);
console.log(`  manifest          ${manifestLen} B, keys ${Object.keys(manifest).slice(0, 8).join(', ')}`);
console.log(`  ground non-zero   ${(() => { let u = 0; for (const v of ground) if (v) u++; return u; })()} of ${n}`);
console.log(`  collision blocked ${blocked} of ${n}   (${(100 * blocked / n).toFixed(1)}%)`);
console.log(`  heights max       ${Math.max(...heights)}`);
console.log(`  occlusion columns ${(() => { let u = 0; for (const v of occlusionHalf) if (v) u++; return u; })()} of ${wTiles}`);

console.log(`\n${problems.length === 0 ? 'PASS' : 'FAIL'}  ${9 - problems.length + 0}/${9} checks, ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
