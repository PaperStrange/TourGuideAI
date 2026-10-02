// v15-scene-bytes.mjs — read build/scene.bin directly with my own reader, to test the
// SOW §4.1 claim: do the three south doors stand on emitted geometry or on nothing?
// Layout taken from unpackScene (emit-scene.mjs L1036-1057) and re-implemented here.
import { readFileSync } from 'node:fs';
const buf = readFileSync('build/scene.bin');
if (buf.toString('ascii', 0, 8) !== 'TG25DSCN') throw new Error('bad magic');
const wTiles = buf.readUInt32LE(12), hTiles = buf.readUInt32LE(16);
const lonUdeg = Number(buf.readBigInt64LE(24)), latUdeg = Number(buf.readBigInt64LE(32));
const contractHash = buf.toString('ascii', 40, 104);
const manifestLen = buf.readUInt32LE(104);
let o = 108;
const manifest = JSON.parse(buf.toString('utf8', o, o + manifestLen)); o += manifestLen;
const n = wTiles * hTiles;
const ground = buf.subarray(o, o + n); o += n;
const collision = buf.subarray(o, o + n); o += n;
const heights = buf.subarray(o, o + n); o += n;
const occlusionHalf = buf.subarray(o, o + wTiles); o += wTiles;
const openings = buf.subarray(o, o + n);

console.log('===== scene.bin header (my own read) =====');
console.log(`  magic=TG25DSCN  wTiles=${wTiles}  hTiles=${hTiles}  n=${n}`);
console.log(`  origin lonUdeg=${lonUdeg} latUdeg=${latUdeg}`);
console.log(`  contractHash=${contractHash.slice(0, 24)}…`);
console.log(`  manifestLen=${manifestLen}  file bytes=${buf.length}`);
console.log(`  manifest.records=${manifest.records?.length}  rejectedFeatures=${manifest.rejectedFeatures?.length}`);

console.log('\n===== §4.1 claim 1: manifest.records contains 205732558 but NOT 205732536 =====');
const recIds = (manifest.records || []).map(r => r.osmId ?? r.id ?? r.sourceId);
console.log(`  records include 205732558 (north 三井ビル): ${recIds.includes(205732558)}`);
console.log(`  records include 205732536 (south ダイヤビル): ${recIds.includes(205732536)}`);
console.log('  rejectedFeatures:');
for (const r of manifest.rejectedFeatures || []) console.log(`    ${JSON.stringify(r)}`);

console.log('\n===== §4.1 claim 2: block 0 (cols 0..39) row-by-row occupancy =====');
console.log('  row | ground | collision | heights | nonZeroCols');
const rowStats = [];
for (let row = 0; row < hTiles; row++) {
  let g = 0, c = 0, h = 0, cols = [];
  for (let tx = 0; tx < 40; tx++) {
    const i = row * wTiles + tx;
    if (ground[i]) { g++; cols.push(tx); }
    if (collision[i]) c++;
    if (heights[i]) h++;
  }
  rowStats.push({ row, g, c, h, cols });
}
for (const r of rowStats) {
  const mark = (r.g || r.c || r.h) ? ' <== HAS CONTENT' : '';
  console.log(`  ${String(r.row).padStart(3)} | ${String(r.g).padStart(6)} | ${String(r.c).padStart(9)} | ${String(r.h).padStart(7)} | ${r.cols.length ? r.cols.join(',') : '-'}${mark}`);
}
const emptyRows = rowStats.filter(r => !r.g && !r.c && !r.h).map(r => r.row);
console.log(`\n  rows in block 0 with ZERO ground+collision+height: ${emptyRows.length === 0 ? '(none)' : `${emptyRows.length} -> [${emptyRows[0]}..${emptyRows[emptyRows.length - 1]}]`}`);

console.log('\n===== §4.1 claim 3: the three south doors stand on nothing =====');
const doors = JSON.parse(readFileSync('city-packs/kyoto-shijo/doors.json', 'utf8')).doors;
for (const d of doors) {
  const i = d.cellY * wTiles + d.cellX;
  const behind = (d.cellY + 1) * wTiles + d.cellX;   // row+1 = further south
  console.log(`  ${d.doorId}  cell=(${d.cellX},${d.cellY})  ground=${ground[i]} collision=${collision[i]} height=${heights[i]}   |  south neighbour row ${d.cellY + 1}: ground=${behind >= 0 && behind < n ? ground[behind] : 'OUT OF ARRAY'} collision=${behind >= 0 && behind < n ? collision[behind] : 'OUT OF ARRAY'}`);
}

console.log('\n===== the isBlocked() convention the SOW §4.1 calls out =====');
console.log(`  row 0 exists in the array (0..${hTiles - 1}), so a south door at row 0 is NOT out of bounds.`);
console.log(`  Its SOUTH neighbour is row -1, which IS out of bounds.`);
const northDoorRow = doors.find(d => d.doorId === 'D-N1').cellY;
console.log(`  north doors are at row ${northDoorRow}; their north neighbour row ${northDoorRow - 1} is in bounds.`);
console.log(`  => "framed by a facade" can pass for a south door only because row -1 is treated as blocked.`);
console.log(`     That is the boundary-as-wall claim, and rows above show whether there is real geometry behind.`);
