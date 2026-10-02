// v16-openings-share.mjs — the exact byte share of the openings layer, so the SOW can
// carry a computed number instead of an estimate.
import { readFileSync } from 'node:fs';
const buf = readFileSync('build/scene.bin');
const page = readFileSync('iteration/viewer/index.html');
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
console.log('');
console.log('index.html bytes       =', page.length);
console.log('openings / index.html  =', (n / page.length * 100).toFixed(3) + '%');
const b64 = Math.ceil(n / 3) * 4;
console.log('openings as base64     =', b64, 'B');
console.log('b64 / index.html       =', (b64 / page.length * 100).toFixed(3) + '%');
console.log('');
const s = page.toString('utf8');
const cnt = (s.match(/openings/g) || []).length;
console.log(`literal "openings" occurrences in index.html = ${cnt}`);
// is it really never indexed by executable code? look for property access patterns
for (const pat of ['scene.openings', '.openings[', 'openings[', 'openings:', 'openings,', '"openings"']) {
  const c = (s.match(new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  console.log(`  pattern ${JSON.stringify(pat).padEnd(18)} -> ${c}`);
}
