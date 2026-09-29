#!/usr/bin/env node
/**
 * measure-shijo-walk.mjs — measure distances ALONG the mapped 四条通 centreline.
 *
 * Why a script instead of eyeballing a map: the guide's walking minutes must be
 * reproducible from the evidence bytes, not typed in by a curator. This tool reads
 * the OSM corridor extract, chains the 四条通 ways by SHARED NODE ID (OSM topology,
 * not a distance guess), projects each anchor onto that chain, and reports the
 * along-street distance between consecutive anchors.
 *
 * It deliberately does NOT decide walking time. The rule used downstream is the one
 * quoted from the 不動産の表示に関する公正競争規約 (道路距離80mにつき1分, 端数は1分):
 * see city-packs/kyoto-shijo/evidence/japan-rftc-hyouji-kiyaku.txt line 5189.
 *
 * Licence of the input: OSM, ODbL 1.0. The output is a measurement over ODbL data and
 * is therefore published in city-packs/kyoto-shijo/kyoto-shijo-osm.json, not in our own rows.
 *
 * Usage: node measure-shijo-walk.mjs <corridor-map.json> [--out file.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LON_M_PER_DEG = 91282.15;
const LAT_M_PER_DEG = 110940.65;
// Frozen in iteration/design/contract-geo-pipeline.md §1b.
const ORIGIN = { lonUdeg: 135759719, latUdeg: 35003658 };
const ORIGIN_DEG = { lon: ORIGIN.lonUdeg / 1e6, lat: ORIGIN.latUdeg / 1e6 };

const proj = (lat, lon) => ({
  x: (lon - ORIGIN_DEG.lon) * LON_M_PER_DEG,
  y: (lat - ORIGIN_DEG.lat) * LAT_M_PER_DEG,
});
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const src = process.argv[2];
if (!src) { console.error('usage: node measure-shijo-walk.mjs <corridor-map.json> [--out file.json]'); process.exit(2); }
const doc = JSON.parse(readFileSync(src, 'utf8'));
const nodeById = new Map();
for (const e of doc.elements) if (e.type === 'node') nodeById.set(e.id, e);

// ---- 四条通 ways -------------------------------------------------------------
const ways = doc.elements.filter((e) => e.type === 'way' && e.tags?.name === '四条通' && Array.isArray(e.nodes));
const nodesPresent = ways.every((w) => w.nodes.every((n) => nodeById.has(n)));
const byFirstLast = new Map(); // "a|b" -> way
for (const w of ways) {
  const a = w.nodes[0]; const b = w.nodes[w.nodes.length - 1];
  byFirstLast.set(`${Math.min(a, b)}|${Math.max(a, b)}`, w);
}
const endsOf = (w) => [w.nodes[0], w.nodes[w.nodes.length - 1]];
const otherEnd = (w, n) => (w.nodes[0] === n ? w.nodes[w.nodes.length - 1] : w.nodes[0]);

// ---- chain west of the origin, then east --------------------------------------
// Westmost way is the one whose western end has no 四条通 neighbour.
const degree = new Map();
for (const w of ways) for (const n of endsOf(w)) degree.set(n, (degree.get(n) ?? 0) + 1);
const westTerminus = [...degree.entries()].filter(([, d]) => d === 1)
  .map(([n]) => ({ id: n, lon: nodeById.get(n).lon }))
  .sort((a, b) => a.lon - b.lon);

let chain = null;
for (const term of westTerminus) {
  const startWay = ways.find((w) => endsOf(w).includes(term.id));
  if (!startWay) continue;
  const built = [];
  let cur = startWay; let from = term.id;
  const seen = new Set();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.nodes[0] === from) built.push({ way: cur, pts: [...cur.nodes] });
    else built.push({ way: cur, pts: [...cur.nodes].reverse() });
    const to = otherEnd(cur, from);
    const next = ways.find((w) => w.id !== cur.id && !seen.has(w.id) && endsOf(w).includes(to));
    cur = next; from = to;
  }
  if (!chain || built.length > chain.length) chain = built;
}

// ---- geometry, west -> east ---------------------------------------------------
const geom = [];
let spanM = 0;
for (const link of chain) {
  for (const nid of link.pts) {
    const n = nodeById.get(nid);
    const p = { id: nid, wayId: link.way.id, lanes: link.way.tags.lanes ?? null, ...proj(n.lat, n.lon) };
    if (geom.length && geom[geom.length - 1].id === nid) continue;
    geom.push(p);
  }
}
// Orient the chain so x increases.
if (geom[geom.length - 1].x < geom[0].x) geom.reverse();
const cum = [0];
for (let i = 1; i < geom.length; i++) cum.push(cum[i - 1] + dist(geom[i - 1], geom[i]));
spanM = cum[cum.length - 1];

/** Distance along the chain, measured from the chain's western end. */
function alongChain(p) {
  let best = null;
  for (let i = 1; i < geom.length; i++) {
    const a = geom[i - 1]; const b = geom[i];
    const dx = b.x - a.x; const dy = b.y - a.y;
    const L2 = dx * dx + dy * dy;
    let t = L2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
    t = Math.max(0, Math.min(1, t));
    const q = { x: a.x + t * dx, y: a.y + t * dy };
    const d = dist(p, q);
    const L = Math.sqrt(L2);
    if (!best || d < best.d) best = { d, along: cum[i - 1] + t * L, x: q.x, y: q.y };
  }
  return best;
}

// ---- anchors ------------------------------------------------------------------
const N = (id) => { const n = nodeById.get(id); if (!n) throw new Error(`node ${id} absent from extract`); return { id, lat: n.lat, lon: n.lon }; };
const anchorDefs = [
  { id: 'origin-shijo-karasuma', nameJa: '四条烏丸（投影原点）', src: 'ORIGIN, frozen in iteration/design/contract-geo-pipeline.md §1b', ll: ORIGIN_DEG },
  { id: 'bus-shijo-karasuma-F', nameJa: '四条烏丸 バス停 Fのりば', src: 'OSM node/2787253037', ll: N(2787253037) },
  { id: 'subway-shijo-exit1', nameJa: '地下鉄四条駅 1番出入口', src: 'OSM node/11283562286', ll: N(11283562286) },
  { id: 'bus-shijo-takakura', nameJa: '四条高倉 バス停 Aのりば', src: 'OSM node/8886543723', ll: N(8886543723) },
  { id: 'bus-shijo-kawaramachi-E', nameJa: '四条河原町 バス停 Eのりば', src: 'OSM node/4387240005', ll: N(4387240005) },
  { id: 'hankyu-kyoto-kawaramachi', nameJa: '阪急 京都河原町駅', src: 'OSM node/6944607675', ll: N(6944607675) },
  { id: 'keihan-gion-shijo', nameJa: '京阪 祇園四条駅', src: 'OSM node/6883622225', ll: N(6883622225) },
  { id: 'bus-shijo-keihan-mae-A', nameJa: '四条京阪前 バス停 Aのりば', src: 'OSM node/2930865877', ll: N(2930865877) },
  { id: 'bus-gion-A', nameJa: '祇園 バス停 Aのりば', src: 'OSM node/2503718437', ll: N(2503718437) },
  { id: 'yasaka-jinja-nishiro-mon', nameJa: '八坂神社 西楼門', src: 'OSM way/105449683', ll: null },
  { id: 'yasaka-jinja-honden', nameJa: '八坂神社 本殿', src: 'OSM way/88108397', ll: null },
  { id: 'chion-in', nameJa: '知恩院', src: 'OSM node/… absent — address only (東山区林下町400)', ll: null },
  { id: 'kiyomizu-dera', nameJa: '清水寺', src: 'OSM node/… absent — address only (東山区清水一丁目294)', ll: null },
  { id: 'kennin-ji', nameJa: '建仁寺', src: 'OSM node/… absent — address only (東山区大和大路通四条下る小松町584)', ll: null },
];

// Ways that are anchors rather than nodes: read their centre straight off the extract.
const wayCentre = (id) => {
  const w = doc.elements.find((e) => e.type === 'way' && e.id === id);
  if (!w) return null;
  const lat = w.nodes.map((n) => nodeById.get(n)).filter(Boolean).reduce((s, n) => s + n.lat, 0) / w.nodes.length;
  const lon = w.nodes.map((n) => nodeById.get(n)).filter(Boolean).reduce((s, n) => s + n.lon, 0) / w.nodes.length;
  return { lat, lon };
};
for (const a of anchorDefs) {
  if (a.id === 'yasaka-jinja-nishiro-mon') a.ll = wayCentre(105449683);
  if (a.id === 'yasaka-jinja-honden') a.ll = wayCentre(88108397);
}

const anchors = [];
for (const a of anchorDefs) {
  if (!a.ll) { anchors.push({ ...a, lat: null, lon: null, xM: null, yM: null, alongStreetM: null, offsetFromCentrelineM: null, reason: 'no OSM object in the extract and no coordinates in any source read for this pack' }); continue; }
  const p = proj(a.ll.lat, a.ll.lon);
  const on = alongChain(p);
  anchors.push({
    ...a, lat: +a.ll.lat.toFixed(7), lon: +a.ll.lon.toFixed(7),
    xM: +p.x.toFixed(3), yM: +p.y.toFixed(3),
    alongStreetM: +on.along.toFixed(3), offsetFromCentrelineM: +on.d.toFixed(3),
  });
}

const out = {
  schema: 'tourguide.city-pack.osm-derived/walk-measurement/v1',
  source: {
    dataset: 'OpenStreetMap, via the OSM API 0.6 map endpoint',
    extract: 'city-packs/kyoto-shijo/evidence/osm-corridor-map.json',
    licence: 'Open Database License (ODbL) 1.0',
    attribution: '© OpenStreetMap contributors',
    copyrightUrl: 'https://www.openstreetmap.org/copyright',
  },
  method: {
    projection: 'local tangent-plane equirectangular; metresPerDegreeLon 91282.15, metresPerDegreeLat 110940.65 (iteration/design/contract-geo-pipeline.md §1)',
    origin: `${ORIGIN.lonUdeg},${ORIGIN.latUdeg} (frozen)`,
    chaining: '四条通 ways chained by shared OSM node id; the west terminus is the end node with no 四条通 neighbour; all other streets excluded',
    anchorProjection: 'each anchor is dropped onto the nearest point of the chain; alongStreetM is measured from the chain west end',
    walkTimeRule: '道路距離80メートルにつき1分間、1分未満の端数は1分 (不動産の表示に関する公正競争規約 施行規則; evidence/japan-rftc-hyouji-kiyaku.txt)',
    walkMetresPerMinute: 80,
    verification: { allWayNodesPresentInExtract: nodesPresent, wayCount: ways.length, chainedWays: chain.length, chainNodeCount: geom.length },
  },
  corridorChain: {
    ways: chain.map((l) => l.way.id),
    lanes: [...new Set(chain.map((l) => l.way.tags.lanes).filter(Boolean))],
    totalM: +spanM.toFixed(3),
    westEnd: { lat: nodeById.get(geom[0].id).lat, lon: nodeById.get(geom[0].id).lon, xM: +geom[0].x.toFixed(3) },
    eastEnd: { lat: nodeById.get(geom[geom.length - 1].id).lat, lon: nodeById.get(geom[geom.length - 1].id).lon, xM: +geom[geom.length - 1].x.toFixed(3) },
  },
  anchors,
  legs: [],
  gaps: [
    'Offsets from the centreline are straight-line distances to the chain, not the walked path around the 四条烏丸 crossing.',
    'No timetable, headway, first/last departure or platform-level data is measured here. Those remain gaps.',
    '知恩院 / 清水寺 / 建仁寺 have no OSM object in this extract, so their alongStreetM is null: the pack carries their address and their own source instead of a invented coordinate.',
  ],
};

// Legs between anchors that sit ON the chain, in west -> east order.
const onChain = anchors.filter((a) => a.alongStreetM !== null).sort((a, b) => a.alongStreetM - b.alongStreetM);
const walkMin = (m) => Math.max(1, Math.ceil(m / 80));
for (let i = 1; i < onChain.length; i++) {
  const a = onChain[i - 1]; const b = onChain[i];
  const m = Math.abs(b.alongStreetM - a.alongStreetM);
  out.legs.push({ from: a.id, to: b.id, mode: 'walk', alongStreetM: +m.toFixed(3), minutes: walkMin(m), rule: `ceil(${m.toFixed(3)} m / 80 m per min)` });
}

const outIdx = process.argv.indexOf('--out');
if (outIdx > 0 && process.argv[outIdx + 1]) {
  writeFileSync(process.argv[outIdx + 1], JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`wrote ${process.argv[outIdx + 1]}`);
}

console.log(`chain: ${chain.length} ways / ${geom.length} nodes  span ${spanM.toFixed(3)} m  lanes ${out.corridorChain.lanes.join('/')}  allNodesPresent=${nodesPresent}`);
console.log(`west ${out.corridorChain.westEnd.lon}  east ${out.corridorChain.eastEnd.lon}  (way east end lon 135.777193)`);
console.log('\nanchors:');
for (const a of onChain) console.log(`  ${String(a.alongStreetM).padStart(9)} m  off ${String(a.offsetFromCentrelineM).padStart(7)} m  x=${String(a.xM).padStart(9)}  ${a.id}`);
console.log('\nlegs:');
for (const l of out.legs) console.log(`  ${String(l.alongStreetM).padStart(9)} m  ${String(l.minutes).padStart(3)} min  ${l.from} -> ${l.to}`);
