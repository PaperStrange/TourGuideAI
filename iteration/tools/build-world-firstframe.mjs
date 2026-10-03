// Emit one JSON with everything the first-frame page needs, already sliced.
// Sources, all from the project: build/scene.bin (ground/collision/heights),
// manifest.street.profile (centreline), places.json (names), the corpus (crossings).
import { readFileSync, writeFileSync } from 'node:fs';
const R = 'D:/All-Downloads/TourGuideAI/';
const OUT = 'D:/All-Downloads/foundation-test/probe-melon/public/shijo/world.json';

const buf = readFileSync(R + 'build/scene.bin');
const mlen = buf.readUInt32LE(104);
const man = JSON.parse(buf.subarray(108, 108 + mlen).toString('utf8'));
const W = 1600, H = 40, n = W * H;
let o = 108 + mlen;
const ground = buf.subarray(o, o + n); o += n;
const collision = buf.subarray(o, o + n); o += n;
const heights = buf.subarray(o, o + n); o += n;

// places: names with coordinates, verbatim
const places = JSON.parse(readFileSync(R + 'city-packs/kyoto-shijo/places.json', 'utf8'));
const labels = [];
for (const p of Object.values(places)) {
  if (!p || p.lngUdeg === undefined) continue;
  labels.push({
    x: +(((p.lngUdeg / 1e6) - 135.759719) * 91282.15).toFixed(2),
    y: +(((p.latUdeg / 1e6) - 35.003739) * 110940.65).toFixed(2),
    name: p.nameJa,
    kind: p.category,
  });
}

// crossings spanning the street, from the corridor corpus
const corpus = JSON.parse(readFileSync(R + 'city-packs/kyoto-shijo/evidence/osm-corridor-map.json', 'utf8'));
const nodes = new Map();
for (const e of corpus.elements) if (e.type === 'node') nodes.set(e.id, e);
const X = (lon) => (lon - 135.759719) * 91282.15;
const Y = (lat) => (lat - 35.003739) * 110940.65;
const crossings = [];
for (const e of corpus.elements) {
  if (e.type !== 'way' || !e.tags || e.tags.footway !== 'crossing') continue;
  const pts = (e.nodes || []).map((id) => nodes.get(id)).filter(Boolean).map((q) => ({ x: X(q.lon), y: Y(q.lat) }));
  if (pts.length < 2) continue;
  const dy = Math.abs(pts[pts.length - 1].y - pts[0].y);
  if (dy > 8) crossings.push({ x: +pts[0].x.toFixed(2), y0: +Math.min(pts[0].y, pts[pts.length - 1].y).toFixed(2), span: +dy.toFixed(2) });
}

const out = {
  W, H,
  profile: man.street.profile.slice().sort((a, b) => a.atX - b.atX),
  halfM: 9.71,
  halfMNote: 'measured: mean span of the 29 crossings that cross 四条通 = 19.43 m. The emitter constant is 5.0 and is stale.',
  ground: Buffer.from(ground).toString('base64'),
  collision: Buffer.from(collision).toString('base64'),
  heights: Buffer.from(heights).toString('base64'),
  labels,
  crossings,
};
writeFileSync(OUT, JSON.stringify(out));
console.log('wrote world.json  ' + (JSON.stringify(out).length / 1024).toFixed(0) + ' KB');
console.log(`  ${W}x${H} cells · ${labels.length} names · ${crossings.length} crossings · half ${out.halfM} m`);
console.log('');
console.log('names and whether each is inside the world (y in [-20, +20)):');
for (const l of labels) console.log(`  ${(l.y >= -20 && l.y < 20) ? 'IN ' : 'OUT'}  y=${String(l.y).padStart(7)}  x=${String(l.x).padStart(5)}  ${l.name}`);
