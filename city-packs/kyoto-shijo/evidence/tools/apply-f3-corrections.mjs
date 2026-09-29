#!/usr/bin/env node
/**
 * apply-f3-corrections.mjs — task-14: the three items task-12 left open.
 *
 * All three came out of my own report, which matters for how they are fixed: two of them were cases
 * where I had already caught my own wording, so the standard is "prove it is a property of the world,
 * or say it is a property of our fetch box".
 *
 * ── 1. The subway zoning gap (D-16) ─────────────────────────────────────────────
 * The pack said 区数不明, as though unknowable. 京都市交通局 publishes the whole matrix in the data
 * file behind its own fare page, and that page was cited and never opened. Decoded by
 * evidence/tools/decode-subway-zones.mjs, with four cross-checks against figures the operator states
 * elsewhere. The named consequence is recorded in the pack: `区` is operator policy, NOT geography —
 * T13 烏丸御池 is one stop from 四条 and shares 区=4 with T01 六地蔵 4.6 km away — so a fare can be
 * looked up for a subway pair and can never be computed from coordinates.
 *
 * ── 2. The three coordinates ────────────────────────────────────────────────────
 * Two were ALREADY IN THE EVIDENCE WE HOLD, which is D-15's lesson repeating in a new place: I
 * recorded them as "outside this pack's OSM extract range" when they were in the corridor extract
 * the whole time (my earlier grep was on a narrower bbox and I concluded absence from it).
 *   清水五条駅   node/6883622224 (and 7944965638) — in evidence/osm-corridor-map.json
 *   東山安井     node/1854284675, node/3006140863 — needed one fetch of the original corridor bbox
 *   南座前       NOT IN OSM. Verified against three extracts, the Kyoto CSV, and a fresh bbox.
 *                This is the "the world does not publish it" kind of gap, not the "we did not fetch"
 *                kind. Recorded as such, with what would close it.
 *
 * ── 3. The wording sweep ────────────────────────────────────────────────────────
 * Every remaining gap note that overstates a gap becomes 本パックの来源の範囲では取得していない.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');
const EVID = join(PACK, 'evidence');
const readJson = (p, f) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : f);
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8');

const VERIFIED_AT = '2026-09-29';
const changes = [];

// ─────────────────────────────────────────────────────────────────────────────
// 1. subway zones into transit meta
// ─────────────────────────────────────────────────────────────────────────────
const zones = readJson(join(EVID, 'subway-zones.json'), null);
if (!zones) throw new Error('evidence/subway-zones.json missing — run decode-subway-zones.mjs first');
const metaPath = join(HERE, 'transit.meta.json');
const tmeta = readJson(metaPath, {});

tmeta.subwayZones = {
  note: '京都市営地下鉄 の区数と運賃。区数は事業者が公表するマトリクスから引くものであって、地理的距離から計算できるものではない。',
  source: zones.source,
  fareByZone: zones.fareByZone,
  method: zones.method,
  zoneIsNotGeographic: zones.zoneIsNotGeographic,
  pairs: zones.pairs,
  answerForThisPack: zones.answerForThisPack,
  decodedBy: 'evidence/tools/decode-subway-zones.mjs',
  decodedFrom: 'evidence/subway-zones.json',
  verification: {
    crossChecks: zones.method.crossChecks,
    stationCountParsed: zones.stationCount,
    matrixProfile: 'Sta[N] length is 31-N for all N in 0..31 (496 chars), asserted before any value is read',
  },
};
changes.push('transit.meta.json: subwayZones added (区数 matrix decoded, 4 cross-checks recorded)');

// Replace the two overstated subway/bus gaps with accurate ones.
const GAP_BEFORE_AFTER = [];
if (Array.isArray(tmeta.gaps)) {
  tmeta.gaps = tmeta.gaps.map((g) => {
    if (typeof g !== 'string') return g;
    if (g.includes('地下鉄区間')) {
      GAP_BEFORE_AFTER.push({ where: 'transit.gaps', before: g, after: '地下鉄区間の運賃：区数は取得済み（subwayZones、京都市交通局の運賃ページが読むデータファイルから復号）。ただし transit.json に地下鉄の leg を追加するには ① 終点の地点レコード（例 烏丸御池）と ② 駅間の所要時間 の 2 つがまだ無い。運賃は缺口ではない。' });
      return '地下鉄区間の運賃：区数は取得済み（subwayZones、京都市交通局の運賃ページが読むデータファイルから復号）。ただし transit.json に地下鉄の leg を追加するには ① 終点の地点レコード（例 烏丸御池）と ② 駅間の所要時間 の 2 つがまだ無い。運賃は缺口ではない。';
    }
    if (g.includes('停留所間の所要時間')) {
      const after = g.replace(
        '停留所間の所要時間・系統別の運行間隔・初発/終電は、本パックの来源リストの範囲では取得していない（取得不能ではない。運営者の時刻表索引ページはパック内で引用済みだが開いていない）',
        '停留所間の所要時間・系統別の運行間隔・初発/終電は、本パックの来源の範囲では取得していない。取得不能ではない——運営者の時刻表索引ページはパック内で引用済みだが、まだ開いていない。バスの運賃は取得済み（均一 230 円）なので、バス leg に欠けているのは時間であって運賃ではない。',
      );
      GAP_BEFORE_AFTER.push({ where: 'transit.gaps', before: g, after });
      return after;
    }
    if (g.includes('阪急電鉄・京阪電気鉄道の運賃')) {
      const after = g.replace(/^[\s\S]*$/, '阪急電鉄・京阪電気鉄道の運賃：両社の運賃ページは本パックの来源の範囲では取得していない。取得不能ではない。ユーザーの許可来源一覧に両社は含まれておらず、開いていないものを引用しないという規則に従った結果である。');
      GAP_BEFORE_AFTER.push({ where: 'transit.gaps', before: g, after });
      return after;
    }
    if (g.includes('清水五条駅・東山安井停留所・南座前停留所')) {
      const after = '清水五条駅・東山安井・南座前：清水五条駅と東山安井は取得済み（transit.stationCoordinates を参照）。南座前は OSM に存在せず（3 つの抽出・京都市 CSV・新規 bbox のいずれにも無い）、これは「世界が公表していない」種類の缺口であって「我々が取得していない」種類ではない。';
      GAP_BEFORE_AFTER.push({ where: 'transit.gaps', before: g, after });
      return after;
    }
    return g;
  });
}
changes.push(`transit.gaps: ${GAP_BEFORE_AFTER.length} entries reworded`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. the three station coordinates
// ─────────────────────────────────────────────────────────────────────────────
// Read straight out of the extracts so the numbers cannot drift from the bytes.
const corridor = readJson(join(EVID, 'osm-corridor-map.json'), { elements: [] });
const eastArea = readJson(join(EVID, 'osm-eastarea-busstops.json'), { elements: [] });
const nodeOf = (docs, id) => {
  for (const d of docs) { const e = (d.elements ?? []).find((x) => x.type === 'node' && x.id === id); if (e) return e; }
  return null;
};
const docs = [corridor, eastArea];
const u = (deg) => Math.round(deg * 1e6);

const COORDS = [
  { nameJa: '京阪電鉄 清水五条駅', kind: 'rail-station', osmRef: 'node/6883622224', id: 6883622224, status: 'obtained', note: '京阪本線の stop_position（local_ref=1）。同じ駅の反対方向が node/7944965638（local_ref=2）。' },
  { nameJa: '東山安井 バス停', kind: 'bus-stop', osmRef: 'node/1854284675', id: 1854284675, status: 'obtained', note: '建仁寺公式が『市バス「東山安井」より 徒歩5分』と述べるバス停。反対側が node/3006140863。' },
  { nameJa: '南座前 バス停', kind: 'bus-stop', osmRef: null, id: null, status: 'absent-from-source', note: '建仁寺公式は『市バス「南座前」より 徒歩7分』と述べるが、この停留所は OSM に存在しない。' },
];

for (const c of COORDS) {
  if (c.id === null) continue;
  const n = nodeOf(docs, c.id);
  if (!n) { c.status = 'absent-from-our-extracts'; continue; }
  c.latUdeg = u(n.lat);
  c.lonUdeg = u(n.lon);
  c.osmRef = `node/${n.id}`;
  c.nameOsm = n.tags?.name ?? null;
  c.tags = n.tags ?? {};
  c.coordinateKind = 'osm-node';
}

tmeta.stationCoordinates = {
  note: '建仁寺公式アクセスページが所要分数を述べている 3 点の座標。places.json の行にはしない——訪問先ではなく、建仁寺への leg の端点候補だからである。ODbL 派生値なので出典は kyoto-shijo-osm-places.json 側に置く。',
  sourcePage: 'https://www.kenninji.jp/access/',
  sourceEvidence: 'evidence/kenninji-access.txt:24-26',
  entries: COORDS,
  verdicts: {
    obtained: COORDS.filter((c) => c.status === 'obtained').map((c) => c.nameJa),
    absentFromSource: COORDS.filter((c) => c.status === 'absent-from-source').map((c) => c.nameJa),
    verdictNote: '清水五条駅と東山安井は「我々の抽出框の外」だと思っていたが、清水五条駅は corridor 抽出に最初から入っており、東山安井は bbox をもう一度取れば入った。どちらも「世界が公表していない」のではない。南座前だけが「世界が公表していない」——OSM に当該停留所ノードが無い。',
  },
  gapKind: {
    obtained: 'we had it / one narrow fetch',
    absentFromSource: 'the source does not carry it — closed only by a different source, not by another fetch of the same one',
  },
};
changes.push(`transit.meta.json: stationCoordinates added — ${COORDS.filter((c) => c.status === 'obtained').length} obtained, ${COORDS.filter((c) => c.status !== 'obtained').length} absent from source`);

// ─────────────────────────────────────────────────────────────────────────────
// 3. wording sweep over the remaining transit gaps
// ─────────────────────────────────────────────────────────────────────────────
if (Array.isArray(tmeta.gaps)) {
  for (const [i, g] of tmeta.gaps.entries()) {
    if (typeof g !== 'string') continue;
    if (g.includes('深リンクの規則')) {
      const after = '深リンクの規則：design-core §5 は「策展した常用路線＋深リンク」を求める。深リンクの URL 形式とオフライン時の劣化は本パックの範囲外（攻略層の設計）。';
      if (after !== g) { GAP_BEFORE_AFTER.push({ where: 'transit.gaps', before: g, after }); tmeta.gaps[i] = after; }
    }
  }
}
// Stale-entry sweep: an entry can overstate a gap by being OUT OF DATE, not only by overstating
// the obstacle. task-12 obtained 知恩院's coordinate, so the old "知恩院に座標が無い" wording is a
// closed gap still sitting in the open list — the same misdirection class as the unopenedUrls
// pointer, one step further on.
if (Array.isArray(tmeta.gaps)) {
  for (const [i, g] of tmeta.gaps.entries()) {
    if (typeof g !== 'string') continue;
    if (g.includes('知恩院への leg') && g.includes('知恩院に座標が無い')) {
      const after = '知恩院への leg：知恩院の座標は取得済み（OVL 側 placeId=kyoto-shijo-chion-in、OSM way/456122965。task-12 で解消）。leg が無い理由は別で、祇園四条駅／祇園バス停から知恩院までの歩行距離・所要時間を述べた来源を本パックは開いていないため。運賃でも座標でもなく、時間と経路が欠けている。';
      GAP_BEFORE_AFTER.push({ where: 'transit.gaps', before: g, after });
      tmeta.gaps[i] = after;
    }
  }
  // The subway-zone gaps belong on the published list too, not only inside subwayZones.
  if (!tmeta.gaps.some((g) => typeof g === 'string' && g.includes('subwayZones の gaps'))) {
    tmeta.gaps.push('地下鉄の運賃以外の缺口：subwayZones の gaps を参照。区数と運賃は取得済みだが、駅間の所要時間は本パックの来源の範囲では取得していない。');
  }
}

tmeta.gapWordingRule = {
  rule: '缺口の文言は「世界が公表していない」か「本パックの来源の範囲では取得していない」のどちらかを明示しなければならない。',
  why: 'D-15 は「取得していない」を「存在しない」と記録したことが原因で、座標 3 件と leg 2 本を失った。同じ混同は読者を不要な回り道に送る。',
  sweep: GAP_BEFORE_AFTER,
};
writeJson(metaPath, tmeta);
changes.push(`transit.meta.json: gapWordingRule added with the ${GAP_BEFORE_AFTER.length}-entry before/after sweep`);

// ─────────────────────────────────────────────────────────────────────────────
// 4. places meta: the OSM half's gap list must drop the 2 closed entries
// ─────────────────────────────────────────────────────────────────────────────
const pmetaPath = join(HERE, 'places.meta.json');
const pmeta = readJson(pmetaPath, {});

// places.json gap note for the three stations: two closed, one reclassified.
//
// IDEMPOTENCE: REPLACE-BY-KEY, not a push. The first version appended unconditionally and added a
// duplicate on every build — `gapsResolved` reached four copies of the same item before the drift
// showed up in the idempotency check. Repeated duplicates are the same defect class as the payload
// that was overwritten with [] in task-10: a build whose output changes on every run is not
// reproducible, and repetition dilutes the very list the next reader relies on.
const STATION_GAP_KEY = '清水五条駅・東山安井・南座前の座標が未取得';
if (!Array.isArray(pmeta.gapsResolved)) pmeta.gapsResolved = [];
const stationGapEntry = {
  key: STATION_GAP_KEY,
  gap: STATION_GAP_KEY,
  status: 'partially-closed',
  closedAt: VERIFIED_AT,
  how: '清水五条駅（node/6883622224）は corridor 抽出に最初から入っていた。東山安井（node/1854284675、node/3006140863）は元の corridor bbox を一度取り直せば入った。どちらも「我々の抽出框の外」と記録していたが、実際は「まだ見ていなかった」である。南座前は OSM に存在しない——これは「世界が公表していない」種類の缺口で、閉じるには別の来源（京都市交通局のバス停一覧など）が要る。',
  whatChanged: 'transit.stationCoordinates に 2 件を収録。3 件目の扱いを gapKind で分類。',
};
{
  const before = pmeta.gapsResolved.length;
  const idx = pmeta.gapsResolved.findIndex((g) => (g.key ?? g.gap) === STATION_GAP_KEY);
  if (idx === -1) pmeta.gapsResolved.push(stationGapEntry);
  else pmeta.gapsResolved[idx] = stationGapEntry;
  // De-duplicate any earlier accumulation, so the repair is not merely "stop growing".
  const seen = new Set();
  pmeta.gapsResolved = pmeta.gapsResolved.filter((g) => {
    const k = g.key ?? g.gap;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  changes.push(`places.meta.json: gapsResolved ${before} -> ${pmeta.gapsResolved.length} (replace-by-key${before !== pmeta.gapsResolved.length ? ', duplicates removed' : ''}), station item marked partially-closed with the gap kind named`);
}

writeJson(pmetaPath, pmeta);

console.log(`apply-f3-corrections: ${changes.length} change(s)`);
for (const c of changes) console.log('  ' + c);
console.log('\ngap wording before/after:');
for (const g of GAP_BEFORE_AFTER) {
  console.log(`  [${g.where}]`);
  console.log(`    before: ${g.before.slice(0, 150)}`);
  console.log(`    after : ${g.after.slice(0, 150)}`);
}
