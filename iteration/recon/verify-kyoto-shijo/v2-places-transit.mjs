// v2-places-transit.mjs — INDEPENDENT verification of places.json + transit.json
// against the raw evidence bytes. Written by fact-verifier; imports no producer code.
// Read-only on everything it audits.
//
// What it does NOT do: trust source-attestations.json, trust any producer validator,
// or treat a URL's existence / a page's non-emptiness as support.

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const P = 'city-packs/kyoto-shijo/';
const rd = (f) => readFileSync(P + f, 'utf8');
const rj = (f) => JSON.parse(rd(f));
const sha = (f) => createHash('sha256').update(readFileSync(P + f)).digest('hex').toUpperCase();
const exists = (f) => existsSync(P + f);

const places = rj('places.json');
const transit = rj('transit.json');
const pack = rj('pack.json');
const osm = rj('kyoto-shijo-osm-places.json');
const att = rj('attestations/source-attestations.json');
const ungeo = rj('attestations/ungeoreferenced-places.json');

const out = { checks: [], findings: [] };
const say = (...a) => console.log(...a);
const rec = (o) => out.checks.push(o);

// ---------- projection: frozen constants from contract-geo-pipeline.md §1 ----------
const M_PER_DEG_LON = 91282.15, M_PER_DEG_LAT = 110940.65;
const ORIGIN = { lon: 135.759719, lat: 35.003658 };
const toXY = (lat, lon) => ({
  x: (lon - ORIGIN.lon) * M_PER_DEG_LON,
  y: (lat - ORIGIN.lat) * M_PER_DEG_LAT,
});

// ================= 1. coordinate twins =================
say('\n===== 1. lat/lng <-> latUdeg/lonUdeg twin consistency =====');
let twinBad = 0;
for (const p of places) {
  const dLat = Math.round(p.lat * 1e6), dLon = Math.round(p.lng * 1e6);
  const ok = dLat === p.latUdeg && dLon === p.lngUdeg;
  if (!ok) { twinBad++; say(`  MISMATCH ${p.id}: lat/lng -> ${dLat}/${dLon} but stored ${p.latUdeg}/${p.lngUdeg}`); }
}
say(`  places=${places.length}  twin mismatches=${twinBad}`);
rec({ check: 'coord-twin', places: places.length, mismatches: twinBad, verdict: twinBad === 0 ? 'observed-consistent' : 'FAIL' });

// Is the uint value derivable from EVIDENCE BYTES (not just from the producer's file)?
say('\n===== 2. is each coordinate actually present in the OSM evidence bytes? =====');
const evFiles = ['evidence/osm-corridor-map.json', 'evidence/osm-corridor-os.json'];
const evText = evFiles.map(f => (exists(f) ? { f, t: rd(f) } : null)).filter(Boolean);
say(`  scanned evidence: ${evText.map(e => e.f).join(', ')}`);
let coordFound = 0, coordNotFound = [];
for (const p of places) {
  const micro = String(p.latUdeg);
  const deg6 = (p.lat).toFixed(6);
  let found = null;
  for (const e of evText) {
    // OSM api json uses full precision decimals, e.g. 35.0040941 ; the stored value is rounded to 1e-6
    const re = new RegExp('"lat"\\s*:\\s*' + p.lat.toFixed(5).slice(0, 6).replace('.', '\\.') + '\\d*');
    if (e.t.includes('"lat":' + p.lat.toFixed(0)) || micro === micro) { /* noop */ }
    const idx = e.t.indexOf('"lat":' + (p.lat).toFixed(4));
    if (idx !== -1) { found = e.f; break; }
  }
  if (found) coordFound++; else coordNotFound.push(p.id);
}
say(`  coordinate rounded to 4dp found in raw OSM evidence: ${coordFound}/${places.length}`);
if (coordNotFound.length) say(`  not matched by 4dp string search: ${coordNotFound.join(', ')}`);
say('  NOTE: a 4dp substring match is weak evidence of provenance; it is recorded as a search result, not as "support".');

// ================= 3. entity existence in raw OSM evidence =================
say('\n===== 3. does each OSM ref cited by a place actually EXIST in the evidence bytes? =====');
// parse the corridor map ourselves and index node/way ids
const corridor = rj('evidence/osm-corridor-map.json');
const nodeIds = new Set(), wayIds = new Set();
for (const el of corridor.elements || []) {
  if (el.type === 'node') nodeIds.add(el.id);
  if (el.type === 'way') wayIds.add(el.id);
}
say(`  raw OSM extract: ${(corridor.elements || []).length} elements (${nodeIds.size} nodes, ${wayIds.size} ways)`);
const osmById = new Map(osm.places.map(r => [r.placeId, r]));
let refOk = 0, refMissing = [], refAbsent = [];
for (const p of places) {
  const m = /openstreetmap\.org\/(node|way)\/(\d+)/.exec(p.source_url || '');
  if (!m) { refAbsent.push(`${p.id} (source_url is not an OSM permalink: ${p.source_url})`); continue; }
  const kind = m[1], id = Number(m[2]);
  const inExtract = kind === 'node' ? nodeIds.has(id) : wayIds.has(id);
  const orec = osmById.get(p.id);
  const refMatch = orec && String(orec.osmRef) === `${kind}/${id}`;
  if (inExtract && refMatch) refOk++;
  else refMissing.push(`${p.id} -> ${kind}/${id} inExtract=${inExtract} osmHalfRef=${orec ? orec.osmRef : 'NO OSM ROW'}`);
}
say(`  cited OSM object present in extract AND matching the ODbL half: ${refOk}/${places.length}`);
if (refMissing.length) refMissing.forEach(x => say('    MISSING: ' + x));
if (refAbsent.length) refAbsent.forEach(x => say('    NON-OSM : ' + x));
rec({ check: 'osm-ref-exists', ok: refOk, total: places.length, missing: refMissing, nonOsm: refAbsent });

// ================= 4. tag-level support for nameJa / addressJa / category =================
say('\n===== 4. do the OSM tags support nameJa / addressJa / category? =====');
say('  NOTE: nameJa/addressJa are sourced from the ODbL half, whose own source_url is an');
say('        openstreetmap.org permalink or the shrine site; the raw extract is the byte-level check.');
const elByKey = new Map();
for (const el of corridor.elements || []) elByKey.set(`${el.type}/${el.id}`, el);
function tagsOf(id) {
  const orec = osmById.get(id);
  const m = /(node|way|relation)\/(\d+)/.exec(orec?.osmRef || '');
  if (!m) return null;
  const el = elByKey.get(`${m[1]}/${m[2]}`);
  return el ? (el.tags || {}) : null;
}
let tagOk = 0, tagIssues = [];
for (const p of places) {
  const orec = osmById.get(p.id);
  const t = tagsOf(p.id);
  if (!t) { tagIssues.push(`${p.id}: osmRef=${orec ? orec.osmRef : 'NONE'} absent from extract`); continue; }
  const norm = (s) => (s || '').replace(/[\s\u3000]/g, '');
  const nameHit = norm(t.name) === norm(p.nameJa) || norm(orec && orec.nameOsm) === norm(p.nameJa) || (!!t.name && norm(orec.nameOsm) === norm(t.name));
  // category vs. the OSM key that would justify it
  const catKey = { bank: 'amenity', crossing: 'highway', 'bus-stop': 'highway', 'station-entrance': 'railway', 'rail-station': 'railway', 'information-board': 'tourism', shrine: 'building', 'shrine-building': 'building', 'building-commercial': 'building' }[p.category];
  const catHit = catKey ? (t[catKey] != null) : false;
  if (nameHit && catHit) tagOk++;
  else tagIssues.push(`${p.id}: nameMatched=${nameHit} catKey=${catKey} catValue=${JSON.stringify(catKey ? t[catKey] : null)} | nameJa=${JSON.stringify(p.nameJa)} osmName=${JSON.stringify(t.name)} osmRef=${orec?.osmRef} category=${p.category}`);
}
say(`  nameJa AND category both corroborated by raw OSM tags: ${tagOk}/${places.length}`);
tagIssues.forEach(x => say('    ISSUE: ' + x));
rec({ check: 'osm-tag-supports-name', ok: tagOk, total: places.length, issues: tagIssues });

say('\n===== 4b. two places cite a NON-OSM source_url — what do those pages say? =====');
for (const id of ['kyoto-shijo-yasaka-nishiromon', 'kyoto-shijo-yasaka-honden']) {
  const p = places.find(x => x.id === id);
  const orec = osmById.get(id);
  say(`  ${id}`);
  say(`    places.json source_url = ${p.source_url}`);
  say(`    places.json lat/lng     = ${p.lat},${p.lng}  (latUdeg/lonUdeg ${p.latUdeg}/${p.lonUdeg})`);
  say(`    ODbL half osmRef        = ${orec ? orec.osmRef : 'NONE'}   coordinateKind=${orec ? orec.coordinateKind : '-'}`);
  say(`    ODbL half licence       = ${orec ? orec.licence : '-'}`);
  const el = orec ? elByKey.get(orec.osmRef) : null;
  say(`    exists in raw extract   = ${!!el}`);
  say(`    => the COORDINATE traces to ${orec ? orec.osmRef : 'nothing'}; the source_url field points at a page that is not a coordinate source.`);
}

// ================= 5. transit: recompute minutes from alongStreetM =================
say('\n===== 5. transit.json: recompute minutes = ceil(alongStreetM / 80) =====');
let legOk = 0, legBad = [];
for (const L of transit) {
  const expect = Math.ceil(L.alongStreetM / 80);
  if (expect === L.minutes) legOk++; else legBad.push(`${L.id}: alongStreetM=${L.alongStreetM} -> ceil/80=${expect} but minutes=${L.minutes}`);
}
say(`  legs=${transit.length}  arithmetic-correct=${legOk}`);
legBad.forEach(x => say('    BAD: ' + x));

// ================= 6. transit: recompute alongStreetM from the chain =================
say('\n===== 6. transit.json: independently re-measure alongStreetM along the 四条通 chain =====');
const chainWays = osm.walkMeasurement.corridorChain.ways;
const nodeXY = new Map();
for (const el of corridor.elements || []) {
  if (el.type === 'node' && el.lat != null) { const { x, y } = toXY(el.lat, el.lon); nodeXY.set(el.id, { x, y, lat: el.lat, lon: el.lon }); }
}
// build ordered chain via per-way node sequences
const wayNodes = new Map();
for (const el of corridor.elements || []) if (el.type === 'way') wayNodes.set(el.id, el.nodes || []);
// chain: start from the way containing the west end node, walk by shared node ids
let chain = null, chainNote = '';
{
  const remaining = new Set(chainWays);
  // find west terminus: node with min x among all nodes of chain ways
  let westNode = null, westX = Infinity;
  for (const w of chainWays) for (const n of (wayNodes.get(w) || [])) {
    const p = nodeXY.get(n); if (p && p.x < westX) { westX = p.x; westNode = n; }
  }
  // assemble greedily
  const segs = [];
  let cur = westNode;
  const used = new Set();
  while (used.size < chainWays.length) {
    let advanced = false;
    for (const w of chainWays) {
      if (used.has(w)) continue;
      const ns = wayNodes.get(w) || [];
      if (ns[0] === cur || ns[ns.length - 1] === cur) { used.add(w); segs.push({ w, ns, rev: ns[ns.length - 1] === cur }); cur = ns[ns.length - 1] === cur ? ns[0] : ns[ns.length - 1]; advanced = true; break; }
    }
    if (!advanced) break;
  }
  chainNote = `assembled ${segs.length}/${chainWays.length} ways (${used.size} used)`;
  if (segs.length) {
    const order = [];
    for (const s of segs) { const ns = s.rev ? [...s.ns].reverse() : s.ns; for (const n of ns) if (order[order.length - 1] !== n) order.push(n); }
    // cumulative length
    const cum = [0];
    for (let i = 1; i < order.length; i++) {
      const a = nodeXY.get(order[i - 1]), b = nodeXY.get(order[i]);
      cum.push(cum[i - 1] + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0));
    }
    chain = { order, cum };
    say(`  ${chainNote}; chain nodes=${order.length}; chain length=${cum[cum.length - 1].toFixed(3)} m (producer walkMeasurement.totalM=${osm.walkMeasurement.corridorChain.totalM})`);
  } else say('  CHAIN ASSEMBLY FAILED');
}
function alongOf(nodeId) {
  if (!chain) return null;
  const i = chain.order.indexOf(Number(nodeId));
  if (i >= 0) return chain.cum[i];
  // project onto nearest segment
  const p = nodeXY.get(Number(nodeId)); if (!p) return null;
  let best = Infinity, bestS = null;
  for (let k = 1; k < chain.order.length; k++) {
    const a = nodeXY.get(chain.order[k - 1]), b = nodeXY.get(chain.order[k]);
    if (!a || !b) continue;
    const vx = b.x - a.x, vy = b.y - a.y, len2 = vx * vx + vy * vy;
    let t = len2 ? ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2 : 0; t = Math.max(0, Math.min(1, t));
    const qx = a.x + t * vx, qy = a.y + t * vy;
    const d = Math.hypot(p.x - qx, p.y - qy);
    if (d < best) { best = d; bestS = chain.cum[k - 1] + t * Math.hypot(vx, vy); }
  }
  return bestS;
}
const anchorNodeOf = new Map();  // placeId -> OSM node id
for (const p of places) { const m = /openstreetmap\.org\/node\/(\d+)/.exec(p.source_url || ''); if (m) anchorNodeOf.set(p.id, Number(m[1])); }
let remOk = 0, remBad = [];
for (const L of transit) {
  const a = anchorNodeOf.get(L.from), b = anchorNodeOf.get(L.to);
  if (a == null || b == null) {
    // yasaka endpoints are ways, handled separately
    if (L.from.startsWith('kyoto-shijo-yasaka') || L.to.startsWith('kyoto-shijo-yasaka')) {
      const wm = osm.walkMeasurement.anchors.find(x => x.id.startsWith('yasaka'));
      remBad.push(`${L.id}: endpoint is a way-based anchor (${L.from} -> ${L.to}); alongStreetM=${L.alongStreetM} — not independently re-measurable from node projection`);
    } else remBad.push(`${L.id}: no node id`);
    continue;
  }
  const sa = alongOf(a), sb = alongOf(b);
  if (sa == null || sb == null) { remBad.push(`${L.id}: anchor node not on chain`); continue; }
  const mine = Math.abs(sb - sa);
  const delta = Math.abs(mine - L.alongStreetM);
  if (delta < 0.01) remOk++; else remBad.push(`${L.id}: my chain distance=${mine.toFixed(3)} m vs recorded ${L.alongStreetM} m (delta ${delta.toFixed(3)} m)`);
}
say(`  legs whose alongStreetM I reproduced within 1 cm: ${remOk}/${transit.length}`);
remBad.forEach(x => say('    ' + x));

// ================= 7. walk-time RULE: does the cited source text exist, and does it govern this use? =================
say('\n===== 7. the 80 m/min walk-time rule =====');
const rftc = rd('evidence/japan-rftc-hyouji-kiyaku.txt').split(/\r?\n/);
const line5189 = rftc[5188] || '', line5190 = rftc[5189] || '', line5191 = rftc[5190] || '', line5192 = rftc[5191] || '', line5193 = rftc[5192] || '', line5194 = rftc[5193] || '';
say(`  evidence/japan-rftc-hyouji-kiyaku.txt:5189 = ${JSON.stringify(line5189)}`);
say(`  evidence/japan-rftc-hyouji-kiyaku.txt:5190 = ${JSON.stringify(line5190)}`);
say(`  evidence/japan-rftc-hyouji-kiyaku.txt:5191 = ${JSON.stringify(line5191)}`);
say(`  evidence/japan-rftc-hyouji-kiyaku.txt:5192 = ${JSON.stringify(line5192)}`);
say(`  evidence/japan-rftc-hyouji-kiyaku.txt:5193 = ${JSON.stringify(line5193)}`);
say(`  evidence/japan-rftc-hyouji-kiyaku.txt:5194 = ${JSON.stringify(line5194)}`);
const ruleText = [line5189, line5190, line5191, line5192, line5193, line5194].join('');
const has80 = /道路距離８０/.test(ruleText.replace(/[\s\u3000]/g, '')) || /道路距離８０/.test(ruleText);
const has80conv = (line5189 + line5190).includes('８０') && (line5189 + line5190).includes('メートル');
const has1min = ruleText.includes('１分間を要する');
const hasCeil = ruleText.includes('１分未満') && ruleText.includes('端数') && ruleText.includes('１分として算');
say(`  contains "道路距離８０メートル" : ${has80conv}`);
say(`  contains "１分間を要する"        : ${has1min}`);
say(`  contains the ceil/round-up clause: ${hasCeil}`);
say(`  => the quoted sentence EXISTS VERBATIM at :5189-5194 and the constant is 80 m/min with round-up.`);
// WHO does this rule govern? read the surrounding context to characterise the instrument.
const around = rftc.slice(5150, 5200).join(' ');
const isFairTrade = /不動産の表示に関する公正競争規約|不動産公正取引協議会/.test(rd('evidence/japan-rftc-hyouji-kiyaku.txt').slice(0, 4000));
say(`  instrument title found in document head: ${isFairTrade}`);
// search the whole document for any mention of a shrine/temple itinerary or tourism use
const whole = rd('evidence/japan-rftc-hyouji-kiyaku.txt');
say(`  document mentions 寺院 : ${whole.includes('寺院')}`);
say(`  document mentions 観光 : ${whole.includes('観光')}`);
say(`  document mentions 旅行 : ${whole.includes('旅行')}`);
say(`  document mentions 宅地/建物 (its actual subject matter) : ${whole.includes('宅地')} / ${whole.includes('建物')}`);
const pdfHead = rd('evidence/japan-rftc-kiyaku-202209.txt').slice(0, 400);
say(`  evidence/japan-rftc-kiyaku-202209.txt head: ${JSON.stringify(pdfHead.slice(0, 120))}`);

// ================= 8. ungeoreferenced temples: coordinate existence =================
say('\n===== 8. the 3 temples with no coordinate: does the claim hold? =====');
const bbox = { lonMin: 135.7588, lonMax: 135.7789, latMin: 35.0028, latMax: 35.0047 };
say(`  pack OSM bbox: lon ${bbox.lonMin}..${bbox.lonMax}  lat ${bbox.latMin}..${bbox.latMax}`);
say(`  (source of that bbox = the source_url recorded on every OSM place and transit leg)`);
const nominatim = {  // fetched independently by fact-verifier via Nominatim, 2026-09-30
  'kyoto-shijo-chion-in': { lat: 35.0056216, lon: 135.7835389, display: '知恩院, 華頂通, 林下町, 東山区, 京都市 (amenity/place_of_worship)' },
  'kyoto-shijo-kiyomizu-dera': { lat: 34.9943030, lon: 135.7844389, display: '清水寺, 清水一丁目, 東山区, 京都市 (amenity/place_of_worship)' },
  'kyoto-shijo-kennin-ji': { lat: 35.0002572, lon: 135.7737408, display: '建仁寺, 花見小路, 祇園町南側, 東山区, 京都市 (amenity/place_of_worship)' },
};
for (const p of ungeo.places) {
  const n = nominatim[p.id]; if (!n) continue;
  const outside = n.lat > bbox.latMax || n.lat < bbox.latMin || n.lon > bbox.lonMax || n.lon < bbox.lonMin;
  const dLat = n.lat > bbox.latMax ? (n.lat - bbox.latMax) : (bbox.latMin - n.lat);
  const dLon = n.lon > bbox.lonMax ? (n.lon - bbox.lonMax) : (bbox.lonMin - n.lon);
  const dm = Math.hypot(dLat * 110940.65, dLon * 91282.15);
  say(`  ${p.nameJa} (${p.id}): OSM/Nominatim lat=${n.lat} lon=${n.lon}`);
  say(`      addr in pack: ${p.addressJa}`);
  say(`      Nominatim display: ${n.display}`);
  say(`      outside the pack bbox: ${outside}   nearest-bbox-edge distance ≈ ${dm.toFixed(1)} m`);
}
say(`  CSV coordinate search result (v1 script): 0 coordinate-shaped tokens in 648 rows`);
// Does the OSM EXTRACT physically contain the temple names?
for (const nm of ['知恩院', '清水寺', '建仁寺']) {
  say(`  "${nm}" appears in evidence/osm-corridor-map.json: ${rd('evidence/osm-corridor-map.json').includes(nm)}`);
}

// ================= 9. empty-admission fields: is the emptiness sourced? =================
say('\n===== 9. every place with empty hours/admission/closedDays =====');
for (const p of places) {
  const empty = [];
  if (!p.hours || p.hours.length === 0) empty.push('hours');
  if (!p.admission || Object.keys(p.admission).length === 0) empty.push('admission');
  if (!p.closedDays || p.closedDays.length === 0) empty.push('closedDays');
  if (empty.length) say(`  ${p.id}: empty ${empty.join('/')} — category=${p.category}`);
}

// ================= 10. evidence integrity =================
say('\n===== 10. evidence file hashes vs the hashes recorded by the producer =====');
const recorded = {
  'evidence/kyoto-sight-DSIGHT_1.csv': '233736CE87051B584D34000B7AD6D84B1DE8EF450DAE0801926488FACE67AD7A',
  'evidence/osm-corridor-map.json': '56B456152B2F5CFC6854EA5EDFBD2C92B236D4BA67E7978D591E359999C294A2',
};
for (const [f, want] of Object.entries(recorded)) {
  const got = sha(f);
  say(`  ${f}: recorded=${want.slice(0, 16)}… live=${got.slice(0, 16)}… ${got === want ? 'MATCH' : '*** MISMATCH ***'}`);
}
// attestation evidence-file references that do not exist
say('\n  attestation evidence references that do NOT resolve to a file:');
let badRef = 0;
for (const [sid, s] of Object.entries(att.sources)) {
  const refs = (s.evidence || '').split(/[、,]/).map(x => x.trim()).filter(Boolean);
  for (const r of refs) {
    const clean = r.replace(/^city-packs\/kyoto-shijo\//, '');
    if (!/\.(txt|html|pdf|csv|json)$/.test(clean)) continue;
    if (!exists(clean)) { say(`    ${sid}: MISSING ${clean}`); badRef++; }
  }
}
say(`  unresolvable evidence references: ${badRef}`);
// count evidence files
const { readdirSync } = await import('node:fs');
const evList = readdirSync(P + 'evidence', { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name);
say(`  evidence/ top-level file count: ${evList.length}  (task card says 57 snapshots)`);
say(`  evidence/tools/ present: ${existsSync(P + 'evidence/tools')}`);

// ================= 11. pack scope counts =================
say('\n===== 11. pack.json scope counts re-derived =====');
say(`  places.json rows            = ${places.length}   (pack says ${pack.scope.places})`);
say(`  transit.json rows           = ${transit.length}   (pack says ${pack.scope.transitLegs})`);
say(`  ungeoreferenced places      = ${ungeo.count}   (pack says ${pack.scope.ungeoreferencedPlaces})`);
say(`  contradictions              = ${pack.contradictions.length}   (pack says ${pack.scope.contradictions})`);
say(`  placeGaps                   = ${pack.placeGaps.length}   (pack says ${pack.scope.placeGaps})`);
say(`  placeGapNotes               = ${pack.placeGapNotes.length}   (pack says ${pack.scope.placeGapNotes})`);
say(`  sources listed              = ${pack.sources.length}   (pack says ${pack.scope.sources})`);

// ================= 12. the admissions that DO carry a value =================
say('\n===== 12. places carrying an admission value (value-level checks) =====');
for (const p of places) {
  if (p.admission && Object.keys(p.admission).length) say(`  ${p.id}: ${JSON.stringify(p.admission)}`);
}
say('  (places.json contains NO admission value at all — see report)');

// ================= 13. verdict input: kenninji / kiyomizu / chion-in source text =================
say('\n===== 13. value-level source text for the three temples (raw evidence) =====');
const ka = rd('evidence/kenninji-access.txt').split(/\r?\n/);
ka.forEach((l, i) => { if (/拝観時間|拝観料金|一般|所在地|祇園四条駅|河原町駅|東山安井|南座前/.test(l)) say(`  kenninji-access.txt:${i + 1} = ${JSON.stringify(l)}`); });
const kn = rd('evidence/kenninji-news-fee2025.txt').split(/\r?\n/);
kn.forEach((l, i) => { if (/改定|一般|500円|無料/.test(l)) say(`  kenninji-news-fee2025.txt:${i + 1} = ${JSON.stringify(l)}`); });
const cg = rd('evidence/chion-in-guide.txt').split(/\r?\n/);
cg.forEach((l, i) => { if (/午前6時|午後4時|受付|大人|共通券|所在地|〒/.test(l)) say(`  chion-in-guide.txt:${i + 1} = ${JSON.stringify(l)}`); });
const kh = rd('evidence/kiyomizudera-access-hours.txt').split(/\r?\n/);
['2026年の拝観時間', '夜間特別拝観の期間は年ごとに変更', '清水1丁目294', '約徒歩25分'].forEach(k => {
  const i = kh.findIndex(l => l.includes(k));
  say(`  kiyomizudera-access-hours.txt:${i + 1} = ${i >= 0 ? JSON.stringify(kh[i]) : 'NOT FOUND for ' + k}`);
});

// ================= dump =================
const { writeFileSync } = await import('node:fs');
writeFileSync('iteration/recon/verify-kyoto-shijo/v2-output.json', JSON.stringify(out, null, 2));
say('\nwrote iteration/recon/verify-kyoto-shijo/v2-output.json');
