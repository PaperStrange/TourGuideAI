#!/usr/bin/env node
/**
 * restore-parked-records.mjs — (re)author the non-fact records from the evidence bytes.
 *
 * These three places carry sourced hours and fees but no coordinate in any source, so they
 * cannot be place records; and their two transit legs consequently cannot resolve an endpoint.
 * The records were first written by hand, then destroyed by a non-idempotent build step, so
 * they are re-derived here from the fetched bytes rather than from memory — every Japanese
 * string below was re-read out of evidence/ during this rebuild, and `readWhat` records which
 * file and line it came from.
 *
 * Run this BEFORE extract-nonfact-rows.mjs: it appends the records to places.json / transit.json,
 * and that step then parks them. build-pack.mjs enforces the order.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');
const readJson = (p, f) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : f);

const VERIFIED_AT = '2026-09-29';
const BY = 'city-data-architect (pack-curator, shared task task-10)';

// ---- the three records --------------------------------------------------------
// Every record AND every hours entry carries its own verified_at, because a sub-fact that
// cannot answer "when was this checked?" ages silently inside its parent record.
// Applied here rather than typed next to each entry, so it cannot be forgotten on one of them.
const stamp = (r) => ({
  ...r,
  verified_at: VERIFIED_AT,
  hours: (r.hours ?? []).map((h) => ({ ...h, verified_at: h.verified_at ?? VERIFIED_AT })),
  closedDays: (r.closedDays ?? []).map((c) => (typeof c === 'string' ? { labelJa: c, source_url: r.source_url, verified_at: VERIFIED_AT } : c)),
});
const RECORDS = [
  {
    id: 'kyoto-shijo-chion-in',
    nameJa: '知恩院', nameZh: '', nameEn: 'Chion-in',
    category: 'temple', factTier: 'semi-static',
    addressJa: '京都市東山区林下町400',
    origin: 'official-site',
    hours: [{ open: '06:00', close: '16:00', appliesTo: '開閉門時間（通年）', source_url: 'https://www.chion-in.or.jp/guide/' }],
    admission: {
      currency: 'JPY', minorUnit: 1,
      items: [
        { labelJa: '方丈庭園 大人', amount: 400, source_url: 'https://www.chion-in.or.jp/guide/' },
        { labelJa: '友禅苑 大人', amount: 300, source_url: 'https://www.chion-in.or.jp/guide/' },
        { labelJa: '方丈庭園・友禅苑 共通券 大人', amount: 500, source_url: 'https://www.chion-in.or.jp/guide/' },
        { labelJa: '共通券 小人（小・中学生）', amount: 250, source_url: 'https://www.chion-in.or.jp/guide/' },
      ],
      note: '境内の参拝は無料。上記は庭園拝観料。共通券の販売は 15:20 まで。',
    },
    closedDays: [],
    stateNoteJa: '',
    source_url: 'https://www.chion-in.or.jp/guide/',
    provenance: {
      valueKind: 'observed', verifiedBy: BY,
      readWhat: 'evidence/chion-in-guide.txt（公式拝観情報ページの抽出）を再読。L81『午前6時から午後4時』／L87『開閉門時間は午前6時から午後4時です。』／L83『※一部行事・法要日程では開門時間が異なります。』／L84『※各所受付は午前9時～』。庭園拝観料の表 L121-141：友禅苑 大人300円・方丈庭園 大人400円・共通券 大人500円、小人 150/200/250円、団体 270/360/450円。受付時間 L144-149：友禅苑 午前9時～午後4時、方丈庭園 午前9時～午後3時50分、※共通券販売は午後3時20分まで。行事による開門変更 L90-99：正月元旦 1月1日 午前5時30分、御忌大会 4月19日～4月25日 午前5時、伝宗伝戒道場 12月5日～12月24日 午前6時20分。無料シャトルバス L109-113：三門前から御影堂前、午前9時～午後4時（午後1時～2時を除く）。所在地は公式ページのフッタ『〒605-8686 京都市東山区林下町400』。',
      attestedFields: ['nameJa', 'addressJa', 'hours', 'admission', 'category'],
      valueKindPerField: { nameJa: 'observed', addressJa: 'observed', hours: 'observed', admission: 'observed', category: 'observed', nameEn: 'licenced', stateNoteJa: 'absent' },
      notAttested: ['latUdeg', 'lngUdeg', 'closedDays'],
      whyEmpty: '座標はどの来源にも無い。住所を座標へ変換するのは導出であって観測ではないので行わない。定休日は公式に記載が無い。',
      hoursNote: '『境内に入れるのは 6:00–16:00』であって『拝観できるのが 6:00–16:00』ではない。各所受付は 9:00 から。行事日は開門が早まる。',
      guideVerifiedColumnAllowed: true,
      addressCorroboration: '京都市 CSV（evidence/kyoto-csv-slice-rows.txt、row 1000015/1000016）col17 が『東山区林下町400』で公式フッタと一致する。2 来源一致の corroboration であって座標の证明ではない。',
    },
  },
  {
    id: 'kyoto-shijo-kiyomizu-dera',
    nameJa: '清水寺', nameZh: '', nameEn: 'Kiyomizu-dera',
    category: 'temple', factTier: 'semi-static',
    addressJa: '京都市東山区清水一丁目294',
    origin: 'official-site',
    hours: [
      { open: '06:00', close: '18:00', appliesTo: '2026年 1.1〜3.26 / 4.6〜6.30 / 9.1〜11.20 / 12.1〜12.31', source_url: 'https://www.kiyomizudera.or.jp/access.php' },
      { open: '06:00', close: '18:30', appliesTo: '2026年 7.1〜8.13 / 8.17〜8.31', source_url: 'https://www.kiyomizudera.or.jp/access.php' },
      { open: '06:00', close: '21:30', appliesTo: '2026年 夜間特別拝観 3.27〜4.5 / 8.14〜8.16 / 11.21〜11.30（21:00 受付終了）', source_url: 'https://www.kiyomizudera.or.jp/access.php' },
    ],
    admission: {},
    closedDays: [],
    stateNoteJa: '',
    source_url: 'https://www.kiyomizudera.or.jp/access.php',
    provenance: {
      valueKind: 'observed', verifiedBy: BY,
      readWhat: 'evidence/kiyomizudera-access-hours.txt を再読。L28『2026年の拝観時間』、L29『＊夜間特別拝観の期間は年ごとに変更になります』、L30『＊夜間特別拝観の期間は、開門時間を延長します』、L33-39 が表頭『期間／開門時間／閉門時間』、L36-41 に『1.1 ～ 3.26 / 6:00 / 18:00』『3.27 ～ 4.5（春の夜間特別拝観）/ 6:00 / 21:30 (21:00受付終了)』、続いて 4.6〜6.30 → 18:00、7.1〜8.13 → 18:30、8.14〜8.16（千日詣り／夏の夜間特別拝観）→ 21:30、8.17〜8.31 → 18:30、9.1〜11.20 → 18:00、11.21〜11.30（秋の夜間特別拝観）→ 21:30、12.1〜12.31 → 18:00。L20『〒605-0862 京都市東山区清水1丁目294』。交通案内：市バス206・100系統 五条坂下車 徒歩10分、京阪電鉄 清水五条駅から約徒歩25分。',
      attestedFields: ['nameJa', 'addressJa', 'hours', 'category'],
      valueKindPerField: { nameJa: 'observed', addressJa: 'observed', hours: 'observed', category: 'observed', nameEn: 'licenced', admission: 'absent' },
      notAttested: ['latUdeg', 'lngUdeg', 'admission', 'closedDays'],
      whyEmpty: '拝観料：公式サイトのトップ・拝観案内・FAQ のいずれにも金額が無い。京都市 CSV の col27 に『本堂・舞台 大人400円』があるが、それは row 10000008『清水寺　狛犬』の行であって本堂の料金ではない。主体が違う行の金額を採用するのは本タスクが排除しようとしている『確からしい値』なので空欄とし、pack.json の矛盾 C1 に記録した。座標：本パックの OSM 抽出範囲（lat 35.0028–35.0047）に清水寺の地物が無い。',
      hoursNote: '閉門は 3 通り（18:00 / 18:30 / 21:30）あり、夜間特別拝観の期間は年ごとに変わる。攻略は期間を明示して提示しなければならない。',
      guideVerifiedColumnAllowed: true,
      addressCorroboration: '京都市 CSV row 1000004（evidence/kyoto-csv-slice-rows.txt）col17『京都市東山区清水一丁目294』と公式 L20/L159 が同一住所を述べている。',
    },
  },
  {
    id: 'kyoto-shijo-kennin-ji',
    nameJa: '建仁寺', nameZh: '', nameEn: 'Kennin-ji',
    category: 'temple', factTier: 'semi-static',
    addressJa: '京都市東山区大和大路通四条下る小松町584',
    origin: 'official-site',
    hours: [{ open: '10:00', close: '16:30', appliesTo: '受付終了（17:00 閉門）', source_url: 'https://www.kenninji.jp/access/' }],
    admission: {
      currency: 'JPY', minorUnit: 1,
      items: [
        { labelJa: '一般', amount: 800, effectiveFrom: VERIFIED_AT, supersededFrom: '2027-01-01', source_url: 'https://www.kenninji.jp/access/' },
        { labelJa: '学生（小・中・高）', amount: 500, effectiveFrom: VERIFIED_AT, source_url: 'https://www.kenninji.jp/access/' },
        { labelJa: '一般（2027-01-01 改定後）', amount: 1000, effectiveFrom: '2027-01-01', source_url: 'https://www.kenninji.jp/news/?p=2352' },
      ],
      note: '小学生未満は無料。障害者手帳提示で本人無料（介助は有料）。2027-01-01 に一般が 800 円から 1,000 円へ改定される告知が出ている（学生は 500 円のまま）。',
    },
    closedDays: [],
    stateNoteJa: '',
    source_url: 'https://www.kenninji.jp/access/',
    provenance: {
      valueKind: 'observed', verifiedBy: BY,
      readWhat: 'evidence/kenninji-access.txt を再読。L7『午前10時～午後4時30分受付終了（午後5時閉門）』、L9『一般 800円、学生（小・中・高） 500円 ※小学生未満のお子様は無料』、L10『※小学生以下のみでの拝観は不可』、L11『※障害者手帳をお持ちの方は無料で拝観可能（介助は有料）』、L20『京阪電車「祇園四条駅」より 徒歩7分』、L21『阪急電車「河原町駅」より 徒歩10分』、L24-26 市バス『東山安井』徒歩5分／『南座前』徒歩7分／『祇園』・『清水道』徒歩10分。所在地 L5『京都市東山区大和大路通四条下る小松町』（生 HTML evidence/kenninji-access.html L86 <dd> も同一）。料金改定告知 evidence/kenninji-news-fee2025.txt L13 で『改定後 拝観料：一般 1,000円』『改定時期：2027年1月1日』を確認。',
      attestedFields: ['nameJa', 'addressJa', 'hours', 'admission', 'category'],
      valueKindPerField: { nameJa: 'observed', addressJa: 'observed', hours: 'observed', admission: 'observed', category: 'observed', nameEn: 'licenced' },
      notAttested: ['latUdeg', 'lngUdeg', 'closedDays'],
      whyEmpty: '座標は本パックの OSM 抽出範囲外。定休日は公式に記載が無い。京都市 CSV row 1000043 の col25 には休みの記載があるが、公式が述べていない現行値として採用できない（pack.json 矛盾 C3）。',
      hoursNote: '16:30 は『受付終了』であって閉門ではない。閉門は 17:00。攻略は 16:30 を最終入場として書くこと。',
      addressNote: '公式サイトの所在地は『小松町』までで番地を含まない。addressJa の『584』は京都市 CSV row 1000043 col17『東山区大和大路通四条下る４丁目小松町584番地』から来ており、2 来源の合成である。番地なしの公式表記だけを採るなら『京都市東山区大和大路通四条下る小松町』が正しい。',
      guideVerifiedColumnAllowed: true,
      addressCorroboration: '京都市 CSV row 1000043（evidence/kyoto-csv-slice-rows.txt）と公式 L5 が同一地を指す。',
    },
  },
];

// ---- the two legs that point at them ------------------------------------------
const LEGS = [
  {
    id: 'L07', from: 'kyoto-shijo-station-keihan-gion-shijo', to: 'kyoto-shijo-kennin-ji',
    mode: 'walk', lineName: null, minutes: 7, alongStreetM: null,
    minutesRule: 'operator-published: 徒歩7分',
    minutesProvenance: 'operator-published',
    fareIC: null, fareTicket: null, transfers: 0,
    source_url: 'https://www.kenninji.jp/access/',
    verified_at: VERIFIED_AT,
    provenance: {
      valueKind: 'observed', distanceValueKind: 'absent', minutesValueKind: 'observed', verifiedBy: BY,
      readWhat: 'evidence/kenninji-access.txt L20『京阪電車「祇園四条駅」より 徒歩7分』。これは運営者自身が公表した徒歩分数であり、80 m/分 の規約で算出した値ではない。',
      whyNoDistance: '建仁寺の座標が無いため、本パックが距離を実測できない。したがって alongStreetM は null。分だけが来源を持つ。',
      notAttested: ['徒歩経路', '実際の道路距離'],
      guideVerifiedColumnAllowed: true,
    },
  },
  {
    id: 'L08', from: 'kyoto-shijo-station-hankyu-kawaramachi', to: 'kyoto-shijo-kennin-ji',
    mode: 'walk', lineName: null, minutes: 10, alongStreetM: null,
    minutesRule: 'operator-published: 徒歩10分',
    minutesProvenance: 'operator-published',
    fareIC: null, fareTicket: null, transfers: 0,
    source_url: 'https://www.kenninji.jp/access/',
    verified_at: VERIFIED_AT,
    provenance: {
      valueKind: 'observed', distanceValueKind: 'absent', minutesValueKind: 'observed', verifiedBy: BY,
      readWhat: 'evidence/kenninji-access.txt L21『阪急電車「河原町駅」より 徒歩10分』。運営者公表値。',
      whyNoDistance: 'L07 に同じ。',
      notAttested: ['徒歩経路', '実際の道路距離'],
      guideVerifiedColumnAllowed: true,
    },
  },
];

// ---- append to the fact tables (extract-nonfact-rows.mjs parks them next) -------
const placesPath = resolve(PACK, 'places.json');
const places = readJson(placesPath, []);
const stampedRecords = RECORDS.map(stamp);
const stampedLegs = LEGS.map((l) => ({ ...l, verified_at: l.verified_at ?? VERIFIED_AT }));

// Replace-by-id rather than union: this file is the AUTHORITATIVE definition of these records,
// so an edit here must propagate on the next build instead of being shadowed by a stale parked
// copy. (The parked set previously kept whichever version landed first, which meant a fix to a
// record never reached pack.json.)
let addedP = 0; let refreshedP = 0;
const byIdP = new Map(places.map((p) => [p.id, p]));
for (const r of stampedRecords) {
  if (byIdP.has(r.id)) { Object.assign(byIdP.get(r.id), r); refreshedP++; }
  else { places.push(r); addedP++; }
}
writeFileSync(placesPath, JSON.stringify(places, null, 2) + '\n', 'utf8');

const transitPath = resolve(PACK, 'transit.json');
const legs = readJson(transitPath, []);
let addedL = 0; let refreshedL = 0;
const byIdL = new Map(legs.map((l) => [l.id, l]));
for (const l of stampedLegs) {
  if (byIdL.has(l.id)) { Object.assign(byIdL.get(l.id), l); refreshedL++; }
  else { legs.push(l); addedL++; }
}
writeFileSync(transitPath, JSON.stringify(legs, null, 2) + '\n', 'utf8');

console.log(`restore-parked-records: places +${addedP} new / ${refreshedP} refreshed (${RECORDS.length} defined); legs +${addedL} new / ${refreshedL} refreshed (${LEGS.length} defined)`);
console.log(`  places.json now ${places.length}, transit.json now ${legs.length} (extract-nonfact-rows parks the non-fact rows next)`);

console.log(`restore-parked-records: +${addedP} places (${RECORDS.length} defined), +${addedL} legs (${LEGS.length} defined); places.json now ${places.length}, transit.json now ${legs.length}`);
