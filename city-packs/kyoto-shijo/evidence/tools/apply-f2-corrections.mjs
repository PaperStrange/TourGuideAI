#!/usr/bin/env node
/**
 * apply-f2-corrections.mjs — task-12: the fact-layer loose ends an independent verifier left.
 *
 * Three parts, each tied to a numbered defect in
 * iteration/recon/fact-verification-kyoto-shijo.md. Nothing here is a new claim about the
 * world; every change either cites bytes already captured, or removes a citation that was
 * pointing somewhere that does not support the value.
 *
 * ── D-15: "we did not fetch it" is not "it does not exist" ──────────────────────
 * 知恩院 / 清水寺 / 建仁寺 were recorded as having no coordinate source. They are in OSM, outside
 * the corridor bbox (435.6 m / 1069.7 m / 52.7 m). Three narrow fetches (evidence/osm-temple-*.json)
 * supply way/456122965, way/336641107 and way/760889100, all with complete geometry, all
 * amenity=place_of_worship. So the three records gain coordinates, they leave the ungeoreferenced
 * parked set and enter places.json, and the two legs that were dropped only because their endpoint
 * had no position come back.
 *
 * ── The 12 UNKNOWN values: classify, do not fill ────────────────────────────────
 * Iteration/tools/check-source-alignment.mjs reported 12 literal values appearing in no captured
 * source. Each is one of three things, and the fix differs:
 *   (a) OSM DERIVED — the value IS in the cited source, but as a tag fragment rather than the
 *       composed string the record stored. Fix: store the source's own literal.
 *   (b) CURATED — our translation or our label. No source can exist. Fix: keep the value, say so,
 *       and close the guide gate on it, because a name we wrote must not carry "we verified this".
 *   (c) MISSING SOURCE — we should have a source and do not. Fix: name the gap. None here.
 * The forbidden move is inventing a citation to make the counter go down.
 *
 * ── Plus the contract violation, and the two misdirected pointers ───────────────
 * See the inline comments at each site.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');
const readJson = (p, f) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : f);
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8');

const odbl = readJson(resolve(PACK, 'kyoto-shijo-osm-places.json'), { places: [] });
const byPlaceId = new Map(odbl.places.map((r) => [r.placeId, r]));
const coord = (placeId) => {
  const r = byPlaceId.get(placeId);
  if (!r) throw new Error(`ODbL half has no row for ${placeId}`);
  return { latUdeg: r.latUdeg, lonUdeg: r.lonUdeg, osmRef: r.osmRef, nameEnOsm: r.nameEnOsm };
};

const log = [];
const VERIFIED_AT = '2026-09-29';

// ─────────────────────────────────────────────────────────────────────────────
// 1. The three temples: OSM coordinates + OSM name:en, official site for hours/fees
// ─────────────────────────────────────────────────────────────────────────────
const TEMPLES = [
  {
    id: 'kyoto-shijo-chion-in',
    osmNameEn: 'Chion-in',
    official: 'https://www.chion-in.or.jp/guide/',
    addressJa: '京都市東山区林下町400',
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
    stateNoteJa: '',
  },
  {
    id: 'kyoto-shijo-kiyomizu-dera',
    osmNameEn: 'Kiyomizu-dera',
    official: 'https://www.kiyomizudera.or.jp/access.php',
    addressJa: '京都市東山区清水一丁目294',
    hours: [
      { open: '06:00', close: '18:00', appliesTo: '2026年 1.1〜3.26 / 4.6〜6.30 / 9.1〜11.20 / 12.1〜12.31', source_url: 'https://www.kiyomizudera.or.jp/access.php' },
      { open: '06:00', close: '18:30', appliesTo: '2026年 7.1〜8.13 / 8.17〜8.31', source_url: 'https://www.kiyomizudera.or.jp/access.php' },
      { open: '06:00', close: '21:30', appliesTo: '2026年 夜間特別拝観 3.27〜4.5 / 8.14〜8.16 / 11.21〜11.30（21:00 受付終了）', source_url: 'https://www.kiyomizudera.or.jp/access.php' },
    ],
    admission: {},
    stateNoteJa: '',
  },
  {
    id: 'kyoto-shijo-kennin-ji',
    osmNameEn: 'Kennin-ji',
    official: 'https://www.kenninji.jp/access/',
    addressJa: '京都市東山区大和大路通四条下る小松町584',
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
    stateNoteJa: '',
  },
];

const placesPath = resolve(PACK, 'places.json');
const places = readJson(placesPath, []);
const placeById = new Map(places.map((p) => [p.id, p]));

for (const t of TEMPLES) {
  const c = coord(t.id);
  const osmRow = byPlaceId.get(t.id);
  const row = {
    id: t.id,
    osmRecord: `kyoto-shijo-osm-places.json placeId=${t.id}`,
    nameJa: osmRow.nameOsm, // the OSM tag verbatim, read from the ODbL half rather than retyped
    nameZh: '',
    nameEn: t.osmNameEn,
    category: 'temple',
    factTier: 'semi-static',
    addressJa: t.addressJa,
    latUdeg: c.latUdeg,
    lngUdeg: c.lonUdeg,
    lat: Number((c.latUdeg / 1e6).toFixed(6)),
    lng: Number((c.lonUdeg / 1e6).toFixed(6)),
    origin: 'osm+official-site',
    hours: t.hours,
    admission: t.admission,
    closedDays: [],
    stateNoteJa: t.stateNoteJa,
    source_url: t.official,
    verified_at: VERIFIED_AT,
    provenance: {
      valueKind: 'observed',
      verifiedBy: 'city-data-architect (pack-curator, task-12)',
      readWhat: `Coordinates and the English name come from OSM ${c.osmRef} (amenity=place_of_worship, geometry complete, centre = mean of all vertices). Hours, fees and address come from the operator's own page ${t.official}. The OSM way also carries website=${t.official}, and that tag agrees with the page this record cites — two independent paths reaching the same operator page.`,
      coordinateSource: {
        osmRef: c.osmRef,
        licence: 'ODbL 1.0',
        evidence: 'see kyoto-shijo-osm-places.json source.evidenceFiles for the per-temple fetch and its sha256',
        note: 'This is the coordinate this record previously recorded as unsourceable. It was never absent — our fetch box stopped short of it (D-15).',
      },
      valueKindPerField: {
        nameJa: 'observed', nameEn: 'observed', latUdeg: 'observed', lngUdeg: 'observed',
        hours: 'observed', admission: 'observed', addressJa: 'observed', category: 'observed',
      },
      notAttested: Object.keys(t.admission).length ? ['closedDays'] : ['admission', 'closedDays'],
      whyEmpty: Object.keys(t.admission).length
        ? '定休日は運営者のページに記載が無い。'
        : '拝観料は運営者のページに金額の記載が無い（京都市 CSV の該当額は別主体の行に付された値。/pack.json 矛盾 C1）。定休日も記載が無い。',
      guideVerifiedColumnAllowed: true,
    },
  };
  if (placeById.has(t.id)) { Object.assign(placeById.get(t.id), row); }
  else { places.push(row); placeById.set(t.id, row); }
}
log.push(`${TEMPLES.length} temples given OSM coordinates + OSM name:en, official site retained for hours/fees`);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Label alignment: store the source's own literal where the source has one
// ─────────────────────────────────────────────────────────────────────────────
// The value must be what the cited source says. Where OSM carries a `name`, the record uses it
// verbatim; the editorial suffix ("バス停", "のりば", "(案内板)", "(Hankyu)") moves into a separate
// curated field so neither the fact value nor the curation is misrepresented.
const LABEL_FIXES = [
  { id: 'kyoto-shijo-hist-bank-sign-1', nameJa: '旧三菱銀行京都支店の歴史継承', curatedLabelJa: '旧三菱銀行京都支店の歴史継承（案内板）', kind: 'osm-verbatim' },
  { id: 'kyoto-shijo-hist-bank-sign-2', nameJa: '旧三菱銀行京都支店', curatedLabelJa: '旧三菱銀行京都支店（案内板）', kind: 'osm-verbatim' },
  { id: 'kyoto-shijo-subway-shijo-exit19', nameJa: '地下鉄四条駅 19番出入口', curatedLabelJa: '地下鉄四条駅 19番出入口', kind: 'curated-no-name-tag',
    note: 'node/4229848161 carries NO name tag at all (only railway=subway_entrance, ref=19). Every word of this label is ours.' },
  { id: 'kyoto-shijo-bus-shijo-karasuma-G', nameJa: '四条烏丸 Gのりば', curatedLabelJa: '四条烏丸 バス停 Gのりば', kind: 'osm-plus-ref',
    note: 'OSM name=四条烏丸 and local_ref=G; "のりば" is the platform word and "バス停" is our classification.' },
  { id: 'kyoto-shijo-bus-shijo-kawaramachi-D', nameJa: '四条河原町 Dのりば', curatedLabelJa: '四条河原町 バス停 Dのりば', kind: 'osm-plus-ref',
    note: 'OSM name=四条河原町 and local_ref=D; as above.' },
  { id: 'kyoto-shijo-yasaka-nishiromon', nameEn: 'West Tower Gate', curatedLabelEn: 'Yasaka Shrine, West Tower Gate', kind: 'osm-verbatim',
    note: 'way/105449683 name:en=West Tower Gate. The shrine name was our prefix; it is now name-en context only.' },
  { id: 'kyoto-shijo-yasaka-honden', nameEn: 'Main Shrine', curatedLabelEn: 'Yasaka Shrine, Main Hall (Honden)', kind: 'osm-verbatim',
    note: 'way/88108397 name:en=Main Shrine. "Main Hall (Honden)" was our rendering.' },
  { id: 'kyoto-shijo-station-hankyu-kawaramachi', nameEn: 'Kyoto Kawaramachi', curatedLabelEn: 'Kyoto Kawaramachi Station (Hankyu)', kind: 'osm-verbatim',
    note: 'node/6944607675 name:en=Kyoto Kawaramachi. The operator word "(Hankyu)" was our disambiguation.' },
  { id: 'kyoto-shijo-station-keihan-gion-shijo', nameEn: 'Gion-shijo', curatedLabelEn: 'Gion-shijō Station (Keihan)', kind: 'osm-verbatim',
    note: 'node/6883622225 name:en=Gion-shijo, ASCII, no macron. We had added the macron and "(Keihan)".' },
];
for (const f of LABEL_FIXES) {
  const p = placeById.get(f.id);
  if (!p) continue;
  if (f.nameJa) { p.curatedLabelJa = f.curatedLabelJa ?? p.nameJa; p.nameJa = f.nameJa; }
  if (f.nameEn) { p.curatedLabelEn = f.curatedLabelEn ?? p.nameEn; p.nameEn = f.nameEn; }
  p.labelProvenance = {
    kind: f.kind,
    note: f.note ?? 'The value is the cited source\'s own tag text, used verbatim.',
    ...(f.note ? {} : {}),
  };
  log.push(`label ${f.id}: name now the source's own literal (${f.kind})`);
}

// Composed OSM address fragments: the two buildings. OSM holds the parts as separate tags and
// no tag contains the joined string, so the composed form is ours. Keep the tags' own values.
for (const id of ['kyoto-shijo-bldg-mitsui', 'kyoto-shijo-bldg-daiya']) {
  const p = placeById.get(id);
  if (!p) continue;
  p.addressProvenance = {
    kind: 'osm-fragments-composed',
    fragmentsFrom: { 'addr:province': '京都府', 'addr:city': '京都市', 'addr:suburb': '下京区', 'addr:quarter': '長刀鉾町' },
    note: 'OSM carries the address as separate tags; no single tag contains this joined string, so the composition (ward order and the block-number join) is ours while every fragment is OSM\'s. The street-and-entry clause 四条通烏丸東入 appears in the traditional address and is NOT in any source read for this pack, so it is deliberately absent.',
  };
  log.push(`address ${id}: fragment composition declared, unverifiable street clause omitted`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. The contract violation: a name we wrote must not sit behind an open guide gate
// ─────────────────────────────────────────────────────────────────────────────
// design-core §8.2.2 ④: only `observed` reaches the guide's "verified" column. Two records hold
// curator-written names and had guideVerifiedColumnAllowed=true, which would print a name we
// invented behind "we verified this". Harmless only until the badge renders.
//
// WHY `whyNotObserved` AND NOT ONLY `guideGateNote`. The two names were doing different jobs:
// `guideGateNote` said what the FLAG is set to, which a reader only consults if they already know
// the flag exists. `whyNotObserved` is the field a reader looks at when they ask "why is this value
// not something you observed?" — the question itself, not the mechanism. `valueKind` and the
// per-record permission are two independent gates, and the second one was declared in the data
// while nothing in the fact layer enforced or explained it. Both fields are kept: the note stays
// for continuity, the reason is now where the question is asked.
const GATE_CLOSES = [
  {
    id: 'kyoto-shijo-crossing-karasuma-east',
    field: 'nameJa',
    whyNotObserved: 'この地点の nameJa（四条烏丸交差点 東側横断歩道）は本パックが付けた位置記述であり、来源が述べた名称ではない。OSM node/2737069286 には name タグが無い（highway=crossing、crossing=traffic_signals、crossing:markings=zebra のみ）。座標と category は OSM から読んだ observed だが、名前は我々が書いたものなので、この記録は攻略の「已验证」欄に出してはならない。',
  },
  {
    id: 'kyoto-shijo-subway-shijo-exit1',
    field: 'nameZh',
    whyNotObserved: 'この出入口の nameZh（四条站出口1）は本パックが付けた中国語表記であり、来源が述べた名称ではない。OSM node/11283562286 の name は "Exit 1" で、name:zh は無い。nameJa / nameEn / 座標は OSM のタグをそのまま読んだ observed だが、nameZh は我々が書いたものなので、この記録は攻略の「已验证」欄に出してはならない。',
  },
];
for (const g of GATE_CLOSES) {
  const p = placeById.get(g.id);
  if (!p) continue;
  p.provenance.guideVerifiedColumnAllowed = false;
  p.provenance.guideGateNote = `guideVerifiedColumnAllowed closed because provenance.valueKindPerField.${g.field} is a curator-written name with no source (OSM carries no such tag on this object). design-core §8.2.2 ④: only observed reaches the verified column, so an invented name must not print behind "we verified this".`;
  p.provenance.whyNotObserved = g.whyNotObserved;
  log.push(`gate closed on ${g.id} (curated ${g.field}) with a stated whyNotObserved`);
}
// The two category fields are direct tag transforms (building=commercial -> building-commercial),
// not licence-derived templates. design-core reserves `licenced` for templates.
for (const id of ['kyoto-shijo-bldg-mitsui', 'kyoto-shijo-bldg-daiya', 'kyoto-shijo-crossing-karasuma-east']) {
  const p = placeById.get(id);
  if (p?.provenance?.valueKindPerField?.category === 'licenced') {
    p.provenance.valueKindPerField.category = 'observed';
    log.push(`category ${id}: licenced -> observed (direct transform of an OSM tag, not a template)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Coordinate provenance pointers on the two 八坂神社 records
// ─────────────────────────────────────────────────────────────────────────────
// Their source_url points at the shrine's own pages, which contain no coordinate. The coordinate
// is real and was verified against way/105449683 and way/88108397, so the fix is to name where it
// came from rather than leave the reader following a pointer that cannot support the value.
for (const id of ['kyoto-shijo-yasaka-nishiromon', 'kyoto-shijo-yasaka-honden']) {
  const p = placeById.get(id);
  if (!p) continue;
  const c = coord(id);
  p.provenance.coordinateSource = {
    osmRef: c.osmRef,
    licence: 'ODbL 1.0',
    evidence: 'kyoto-shijo-osm-places.json (placeId=' + id + ')',
    note: 'The record\'s source_url is the shrine\'s own page, which states hours and access but no coordinate. The coordinate comes from OSM and is reachable through osmRecord. Two different sources support two different field groups in the same record, and this field says which is which.',
  };
  log.push(`coordinate pointer added on ${id} -> ${c.osmRef}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3b. The two block-0 buildings: a composed address must not be labelled observed
// ─────────────────────────────────────────────────────────────────────────────
// FOUND BY THE CHECK O AUDIT, not by looking for the flag. These two records declared
// `valueKindPerField.addressJa = "observed"` while the SAME RECORD's `addressProvenance.kind` read
// "osm-fragments-composed" and its note said plainly that "the composition (ward order, the
// block-number join) is ours while every fragment is OSM's". One value, labelled both ways in one
// record — and behind it an open guide gate, so the guide would have printed a joined string we
// assembled under a heading that means "a human opened a source and read this".
//
// The consequence is the one the project already reasoned about: design-core §8.2.2 ④ says of
// `authored` that "'到过' would endorse a hand-made judgement as 'we verified it'". A composed
// address is that hand-made judgement. Closing the gate costs the address its place in the verified
// column; it does NOT hide the address, which still renders everywhere else.
//
// Two label corrections fall out of the same record:
//   - `perField.entrances` said `licenced` while `entrances.valueKind` said `authored`. One nested
//     object, two vocabularies; `authored` is the member the enum grew for a curator placement.
//   - `perField.addressJa` becomes `authored`, which is what its own addressProvenance says.
const BUILDING_GATE_CLOSES = ['kyoto-shijo-bldg-mitsui', 'kyoto-shijo-bldg-daiya'];
for (const id of BUILDING_GATE_CLOSES) {
  const p = placeById.get(id);
  if (!p) continue;
  p.provenance.valueKindPerField.addressJa = 'authored';
  if (p.provenance.valueKindPerField.entrances) p.provenance.valueKindPerField.entrances = 'authored';
  p.provenance.guideVerifiedColumnAllowed = false;
  p.provenance.whyNotObserved = 'addressJa（' + p.addressJa + '）は OSM のタグを連結した値である。個々の断片（addr:province 京都府／addr:city 京都市／addr:suburb 下京区／addr:quarter 長刀鉾町／addr:block_number）は OSM から読んだ observed だが、連結そのもの——区の順序と番地の繋ぎ方——は本パックが行った編集であり、どの来源もこの文字列を述べていない（addressProvenance.kind = osm-fragments-composed）。同じ記録の中で addressJa を observed と呼ぶのは、この記録自身の addressProvenance と矛盾していた。加えて entrances は 12 門の配置で authored である。したがって建物名・座標・category は OSM から読んだ observed だが、この記録は攻略の「已验证」欄に出してはならない。';
  log.push(`gate closed on ${id}: composed address + authored entrances, both now labelled as such`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Field-level provenance for the mixed-source records
// ─────────────────────────────────────────────────────────────────────────────
// Two of these records draw on TWO sources that support DIFFERENT fields: the shrine's own page
// states hours and access and the address; OSM states the coordinates and the English name. One
// `source_url` cannot honestly cover both, and the alignment gate is right to flag a value that
// appears in neither the cited source nor anything it can reach.
//
// The fix is not to pick a winner but to say which field comes from where. `sourcesByField` maps
// each field group to the source that carries it, so a reader (or a checker) asking "show me the
// bytes behind nameEn" is sent to the OSM extract instead of to a Japanese page that has no
// English on it.
const FIELD_SOURCE_SETS = [
  {
    id: 'kyoto-shijo-yasaka-nishiromon',
    osmRef: 'way/105449683',
    osmUrl: 'https://www.openstreetmap.org/way/105449683',
    officialUrl: 'https://www.yasaka-jinja.or.jp/access/',
    fromOsm: ['nameJa', 'nameEn', 'latUdeg', 'lngUdeg'],
    fromOfficial: ['stateNoteJa'],
  },
  {
    id: 'kyoto-shijo-yasaka-honden',
    osmRef: 'way/88108397',
    osmUrl: 'https://www.openstreetmap.org/way/88108397',
    officialUrl: 'https://www.yasaka-jinja.or.jp/about/architecture/',
    fromOsm: ['nameJa', 'nameEn', 'latUdeg', 'lngUdeg'],
    fromOfficial: ['addressJa'],
  },
];
for (const s of FIELD_SOURCE_SETS) {
  const p = placeById.get(s.id);
  if (!p) continue;
  p.sourcesByField = {
    [s.osmUrl]: s.fromOsm,
    [s.officialUrl]: s.fromOfficial,
    note: `This record draws on two sources and each supports a different field group. ${s.osmUrl} carries ${s.fromOsm.join(', ')}; ${s.officialUrl} carries ${s.fromOfficial.join(', ')}.`,
  };
  p.provenance.osmRef = s.osmRef;
  // source_url must name the source that carries the LITERAL values, because that is the source a
  // reader opens to check them. "West Tower Gate" and "Main Shrine" appear only in OSM; the shrine's
  // own pages are Japanese and have no English name on them at all. So for these two records the
  // citation is the OSM element, and the official page is declared in sourcesByField for stateNoteJa
  // and addressJa. Pointing source_url at a page that cannot contain the value would be the same
  // misdirection the verifier found on the coordinate field, one field over.
  p.source_url = s.osmUrl;
  log.push(`field-level provenance on ${s.id}: citation -> ${s.osmRef} (carries ${s.fromOsm.join(', ')}), official page declared for ${s.fromOfficial.join(', ')}`);
}

writeJson(placesPath, places);
console.log(`apply-f2-corrections: ${log.length} change(s)`);
for (const l of log) console.log('  ' + l);
console.log(`places.json now ${places.length} records`);
