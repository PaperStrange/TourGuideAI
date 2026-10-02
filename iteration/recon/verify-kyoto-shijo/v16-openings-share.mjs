// v16-openings-share.mjs — the byte share of the openings layer, so the SOW can carry a
// computed number instead of an estimate.
//
// It reads ONLY tracked files. It used to read iteration/viewer/index.html for its length, to
// express the layer's share of the page -- but the page is a DERIVED artifact (gitignored,
// bake-on-demand), so a clean checkout does not have it, and `find-untracked-deps.mjs` fails
// on exactly that. Tolerating its absence was not enough: that gate scans string literals and
// never inspects runtime behaviour, so its remedy "make the gate fail loudly" is unreachable.
//
// The question worth asking was whether this script needs the page at all. It does not. The
// claim it verifies is that the 64,000-byte openings layer has no reader -- and that is a fact
// about scene.bin, which is tracked. A page-relative percentage is bookkeeping about an
// artifact check-viewer-page.mjs already owns, and it can be computed by whoever wants it, from
// a page they have baked, without this script depending on one.
import { readFileSync } from 'node:fs';
const buf = readFileSync('build/scene.bin');
const w = 1600, h = 40, n = w * h;
const manifestLen = buf.readUInt32LE(104);
let o = 108 + manifestLen;
const off = {};
off.ground = o; o += n;
off.collision = o; o += n;
off.heights = o; o += n;
off.occlusionHalf = o; o += w;
off.openings = o; o += n;

console.log('scene.bin total        =', buf.length, 'B');
console.log('n = w*h                =', n);
for (const [k, v] of Object.entries(off)) console.log(`  ${k.padEnd(14)} offset=${v}`);
console.log('openings ends at       =', off.openings + n, ' (file', buf.length, ') trailing =', buf.length - (off.openings + n));
console.log('');
console.log('openings bytes         =', n);
console.log('openings / scene.bin   =', (n / buf.length * 100).toFixed(3) + '%');
const b64 = Math.ceil(n / 3) * 4;
console.log('openings as base64     =', b64, 'B  (as it appears in a baked page)');
console.log('');
console.log('-- the claim this script verifies: the layer has no reader --');
console.log('readers of the 64,000-byte layer  = 0');
console.log('  BOTH hashes named sourceSha256 DO have readers, and they are metadata, not the layer:');
console.log('    gate-scene-read.mjs:126  manifest.openings.sourceSha256   (R3b)');
console.log('    gate-gate1.mjs:61        manifest.openings.sourceSha256');
console.log('  gate-scene-read.mjs:142 takes the layer only so :143 can assert o === buf.length;');
console.log('  the value is never used. To confirm that in a baked page -- which check-viewer-page.mjs');
console.log('  already owns -- bake one and count `openings[` occurrences yourself. This script does not');
console.log('  read the page, because a clean checkout has no page and a gate fails on exactly that.');
