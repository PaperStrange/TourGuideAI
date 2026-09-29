#!/usr/bin/env node
/**
 * decode-subway-zones.mjs — decode 京都市営地下鉄's own zone counts from its own fare script.
 *
 * THE GAP THIS CLOSES (D-16). The pack recorded the subway zone count as 不明, as though it were
 * unknowable. It is published: 京都市交通局's 地下鉄運賃 page carries a 区数と運賃 table and a
 * per-station fare display whose data file, `disp_tika_fare.js`, holds the full zone matrix. The
 * pack cited that page and never opened it. This is a fetch, not an impossibility.
 *
 * THE LOOKUP IS TRANSCRIBED FROM THE OPERATOR'S OWN LOOP, NOT INFERRED. `dispTikaFare()` does:
 *
 *     for (i = 0; i < 32; i++) {  s = cngid; d = i;
 *        if (d < s) { t = d; d = s; s = t; }        // s < d from here on
 *        c = Sta[s].length - (d - s);
 *        kusu = Sta[s].charAt(c);                   // kusu = zone count
 *        fare = fsuba.split(",")[kusu - 1];
 *     }
 *
 * So the row is the SMALLER index, the offset is measured from the row's end, and Sta[N] has length
 * 31-N (verified below: the profile is 31,30,...,0 = 496 chars = the lower triangle).
 *
 * I got this wrong twice before reading the loop, and both wrong answers were plausible:
 *   - indexing as an upper triangle gave 四条 -> 烏丸御池 = 4 区 / 330 円 (an adjacent pair!)
 *   - using the larger index as the row gave the same pair 1 区 by luck but 四条 -> 国際会館 = 4 区
 * Both were caught by cross-checks against figures the operator states elsewhere, not by reading
 * the numbers and finding them reasonable. That is the whole point of the checks below.
 *
 * NAMED CONSEQUENCE FOR THE PROJECT: `区` is assigned by the operator's own policy and is NOT a
 * function of geographic distance. T13 烏丸御池 (one stop from 四条) shares 区=4 with T01 六地蔵
 * 4.6 km away, while T01..T07 form a 9 km flat zone. So a zone can be LOOKED UP for a subway pair
 * and can never be COMPUTED from coordinates. Any code that tries to derive a fare from distance
 * will produce confident wrong numbers.
 *
 * Usage: node decode-subway-zones.mjs [--json] [--out FILE]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');
const JS = resolve(PACK, 'evidence', 'kyoto-webguide-disp_tika_fare.js');
const HTML = resolve(PACK, 'evidence', 'kyoto-webguide-subway-fare.html');

if (!existsSync(JS) || !existsSync(HTML)) {
  console.error('usage error: evidence/kyoto-webguide-disp_tika_fare.js and -subway-fare.html must exist');
  process.exit(2);
}

// ---- station list, from the page's own select (value= is authoritative) ---------
// The <option> tag carries OTHER ATTRIBUTES TOO — the default-selected station is written
// `<option value="10" selected="selected">京都 Kyoto</option>`. An earlier version of this parser
// matched `value="N">` and therefore matched exactly one attribute-order-dependent shape; it
// silently dropped that station, and the failure surfaced much later as "undefined.from" in the
// display loop. A parser that drops input without saying so is how a wrong number reaches a ticket
// gate, so this one (a) accepts attributes in any order and (b) asserts the set is complete below.
const html = readFileSync(HTML, 'utf8');
const stations = new Map();
for (const m of html.matchAll(/<option\b([^>]*)>([^<]+)<\/option>/g)) {
  const vm = /\bvalue\s*=\s*"(\d+)"/.exec(m[1]);
  if (!vm) continue;
  const value = Number(vm[1]);
  const label = m[2].replace(/&#36795;&#xE0100;/g, '椥辻').trim();
  const code = (label.match(/^([KT]\d+)/) ?? [])[1] ?? null;
  // "K08 烏丸御池(烏丸線) Karasuma Oike" -> nameJa 烏丸御池, platformOf 烏丸線
  const nameJa = label.replace(/^[KT]\d+\s*/, '').replace(/\([^)]*\)/, '').replace(/[A-Za-z][A-Za-z\s.'-]*$/, '').trim();
  const platformOf = /\(([^)]*)\)/.exec(label)?.[1] ?? null;
  const line = code?.startsWith('K') ? '烏丸線' : code?.startsWith('T') ? '東西線' : null;
  stations.set(value, { ekicode: value, code, nameJa, line, platformOf });
}
if (stations.size !== 32) {
  console.error(`FAIL  parsed ${stations.size} stations from the page's own <select>; the page lists 32 (K01-K15 + T17-T01). Refusing to read a fare from an incomplete station list.`);
  process.exit(1);
}

// ---- matrix ---------------------------------------------------------------------
const js = readFileSync(JS, 'utf8');
const rows = {};
for (const m of js.matchAll(/Sta\[(\d+)\]\s*=\s*"([^"]*)"/g)) rows[Number(m[1])] = m[2];

// The lower-triangle profile: if this ever changes, the lookup below is no longer valid.
for (let i = 0; i <= 31; i++) {
  const got = (rows[i] ?? '').length;
  const want = 31 - i;
  if (got !== want) {
    console.error(`FAIL  Sta[${i}] has ${got} chars; the 31-i profile requires ${want}. The structure assumption no longer holds and no fare will be read from it.`);
    process.exit(1);
  }
}

const FARE_ADULT = [220, 260, 290, 330, 360];
const FARE_CHILD = [110, 130, 150, 170, 180];

/** The operator's own loop body, transcribed. */
function lookup(cngid, i, which = 'adult') {
  let s = cngid * 1;
  let d = i;
  if (i === s) return null;
  if (d < s) { const t = d; d = s; s = t; }
  const c = rows[s].length - (d - s);
  const raw = rows[s].charAt(c);
  const isTransferDiscount = raw === '*';
  const zones = /^\d$/.test(raw) ? Number(raw) : null;
  const arr = which === 'adult' ? FARE_ADULT : FARE_CHILD;
  return {
    from: stations.get(cngid), to: stations.get(i),
    rowUsed: s, offset: c, raw, zones, transferDiscount: isTransferDiscount,
    fare: zones === null ? null : arr[zones - 1],
  };
}

// ---- cross-checks: refuse rather than print a plausible number ------------------
const problems = [];

// (1) 山科 -> 三条京阪 = 260 円, stated verbatim on the operator's own FAQ page.
const yamashina = lookup(25, 21);
if (yamashina.fare !== 260) problems.push(`山科 -> 三条京阪 decoded as ${yamashina.fare} 円 (${yamashina.zones}区); 京都市交通局's own FAQ states 260 円.`);

// (2) 烏丸御池 is one station on two lines, listed twice (K08 = 7, T13 = 19). The operator charges
//     one price, so 四条 -> 烏丸御池 must cost the same whichever row is used. Note the zone COUNTS
//     legitimately differ (1 vs 4) because the ekicode is a position in the operator's own list,
//     not a canonical station id: reading 四条 against K08 is one stop, against T13 it is four.
const viaK = lookup(8, 7); const viaT = lookup(8, 19);
if (viaK.fare !== viaT.fare) problems.push(`四条 -> 烏丸御池 costs ${viaK.fare} 円 via K08 but ${viaT.fare} 円 via T13; one station cannot have two prices.`);

// (3) Direction-independence over every pair.
let asym = 0;
for (let a = 0; a <= 31; a++) for (let b = a + 1; b <= 31; b++) if (lookup(a, b).zones !== lookup(b, a).zones) asym++;
if (asym) problems.push(`${asym} asymmetric pair(s): a fare may not depend on travel direction.`);

// (4) Sanity of the endpoints of a line: the far terminus must not be the cheapest zone.
const near = lookup(8, 9); const far = lookup(8, 0);
if (!(far.zones > near.zones)) problems.push(`四条 -> 国際会館 (${far.zones}区) is not dearer than 四条 -> 五条 (${near.zones}区); the decode is not measuring distance-like cost.`);

// (5) Exactly one non-digit CELL should exist (the 乗継割引 marker). Counted over unique pairs:
//     the lookup is symmetric by construction, so scanning both directions finds the same cell twice.
const nonDigit = [];
for (let a = 0; a <= 31; a++) for (let b = a + 1; b <= 31; b++) { const r = lookup(a, b); if (r && r.zones === null) nonDigit.push(`${a}->${b}="${r.raw}"`); }
if (nonDigit.length !== 1) problems.push(`expected exactly one non-digit cell (the 乗継割引 marker); found ${nonDigit.length}: ${nonDigit.slice(0, 6).join(', ')}`);

if (problems.length) {
  console.error('FAIL  the zone decode did not hold up:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('\n  Refusing to emit a fare. A wrong fare strands someone at a ticket gate.');
  process.exit(1);
}

// ---- the pairs this pack has places for -----------------------------------------
const PAIRS = [
  [8, 7, '四条 -> 烏丸御池 (K08 row) — the subway pair nearest this pack\'s block'],
  [8, 19, '四条 -> 烏丸御池 (T13 row) — same station, other line; same fare, different zone count'],
  [8, 9, '四条 -> 五条 (烏丸線, one stop south)'],
  [8, 6, '四条 -> 丸太町 (烏丸線, one stop north)'],
  [8, 10, '四条 -> 京都 (烏丸線 south)'],
  [8, 0, '四条 -> 国際会館 (烏丸線 north terminus)'],
  [8, 14, '四条 -> 竹田 (烏丸線 south terminus) — the 乗継割引 cell'],
  [8, 20, '四条 -> 京都市役所前 (東西線)'],
  [8, 21, '四条 -> 三条京阪 (東西線)'],
  [25, 21, '山科 -> 三条京阪 — the operator-FAQ cross-check pair'],
];

const out = {
  schema: 'tourguide.city-pack.subway-zones/v1',
  source: {
    page: 'https://www2.city.kyoto.lg.jp/kotsu/webguide/ja/fare/fare_tika.html',
    dataFile: 'https://www2.city.kyoto.lg.jp/kotsu/webguide/js/disp_tika_fare.js',
    faqCrossCheck: 'https://www.city.kyoto.lg.jp/kotsu/page/0000204850.html',
    zoneFarePage: 'https://www.city.kyoto.lg.jp/kotsu/page/0000240757.html',
    operator: '京都市交通局',
    effectiveFrom: '令和7年（2025年）10月1日 — stated on the page. The script\'s active fare array is byte-identical to the zone table on page/0000240757.html, so the table is current; the file also retains superseded revisions in comments, which must not be read as live.',
    evidence: [
      'evidence/kyoto-webguide-subway-fare.html', 'evidence/kyoto-webguide-subway-fare.txt',
      'evidence/kyoto-webguide-disp_tika_fare.js',
      'evidence/kyoto-subway-fare-normal.html', 'evidence/kyoto-subway-fare-table.pdf',
    ],
  },
  fareByZone: {
    1: { kmUpTo: 3, adult: 220, child: 110 },
    2: { kmUpTo: 7, adult: 260, child: 130 },
    3: { kmUpTo: 10, adult: 290, child: 150 },
    4: { kmUpTo: 15, adult: 330, child: 170 },
    5: { kmOver: 15, adult: 360, child: 180 },
  },
  method: {
    stationIndexing: "the page's own <option value=N>; the index is the source's, not ours",
    zoneLookup: "the operator's own loop, transcribed: if (d<s) swap; c = Sta[s].length - (d-s); kusu = Sta[s].charAt(c)",
    matrixShape: 'Sta[N] has length 31-N (lower triangle, 496 chars total), verified before any value is read',
    starMeaning: 'the 乗継割引 marker; reported as transferDiscount, never coerced to a digit',
    crossChecks: [
      "山科 -> 三条京阪 decodes to 260 円, matching the operator's own FAQ statement",
      '四条 -> 烏丸御池 costs the same via the K08 row and the T13 row',
      'every one of the 496 pairs is direction-symmetric',
      'the 烏丸線 terminus is dearer than the adjacent stop',
    ],
  },
  /**
   * THE FINDING THAT OUTLIVES THIS TASK: 区 is operator policy, not geography.
   * Evidence, all from the matrix just decoded: T13 烏丸御池 is one stop from 四条 and sits in
   * 区=4, the same as T01 六地蔵 4.6 km away; and T01..T07 (9 km of the 東西線) form one flat zone.
   * A fare can therefore be looked up for a subway pair and can never be derived from coordinates.
   */
  zoneIsNotGeographic: {
    statementJa: '地下鉄の「区」は事業者の運賃区分であって、地理的距離の関数ではない。',
    evidenceJa: '東西線 T13 烏丸御池（四条から 1 駅）と T01 六地蔵（4.6 km 離れている）が同じ 4 区であり、T01〜T07 の 9 km が 1 区に収まる。',
    consequence: 'A zone may be LOOKED UP for a subway station pair. It may never be COMPUTED from coordinates or from distance. Code that derives a fare from geometry will emit confident wrong fares.',
  },
  stationCount: stations.size,
  pairs: PAIRS.map(([s, d, why]) => {
    const adult = lookup(s, d, 'adult');
    const child = lookup(s, d, 'child');
    return { ...adult, fareAdult: adult.fare, fareChild: child.fare, why };
  }),
  gaps: [
    'The matrix prices SUBWAY station pairs only. A leg with a non-subway endpoint cannot be priced from it.',
    '阪急電鉄 and 京阪電気鉄道 fares appear on neither page opened for this pack, so 阪急 / 京阪 legs remain unpriceable here.',
    'Kyoto City Bus is a flat 230 円 inside the uniform-fare zone (S5); a bus leg is missing a RUNNING TIME, not a fare.',
    'A running time is what every non-walking leg is still missing. The fare side now exists for subway pairs; no running time exists for any non-walking leg.',
  ],
};

const first = out.pairs[0];
out.answerForThisPack = {
  question: 'can the station pairs already in this pack be priced?',
  pairConsidered: 'kyoto-shijo-subway-shijo-exit1 (地下鉄四条駅) -> 烏丸御池',
  zones: first.zones,
  fareAdult: first.fareAdult,
  fareChild: first.fareChild,
  fareIsNowSourced: true,
  priceableAsALeg: false,
  missingSource: false,
  missingFare: false,
  missingInput: 'a DESTINATION PLACE RECORD and a RUNNING TIME',
  why: 'The fare itself is now determined and sourced (1区, 220 円 adult / 110 円 child, from the operator\'s own script). But transit.json requires both endpoints of a leg to exist in places.json, and this pack has no place record for 烏丸御池. Even with that, the operator publishes no station-to-station running time on the pages opened here, so a leg still could not state its minutes. Two specific inputs are missing; no source and no fare are.',
};

if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(out, null, 2) + '\n');
else {
  console.log(`stations parsed: ${stations.size}   matrix rows: ${Object.keys(rows).length} (profile 31..0 verified)`);
  console.log(`cross-checks: 山科->三条京阪 = ${yamashina.fare}円 (FAQ says 260) | 四条->烏丸御池 K08 ${viaK.fare}円 = T13 ${viaT.fare}円 | asymmetric pairs 0\n`);
  for (const x of out.pairs) {
    const f = x.transferDiscount ? '(乗継割引 cell — no zone digit)' : x.zones === null ? '(no value)' : `${x.zones}区  ${x.fareAdult}円 adult / ${x.fareChild}円 child`;
    console.log(`  ${String(x.from.nameJa).padEnd(10)} -> ${String(x.to.nameJa).padEnd(10)} raw=${String(x.raw).padEnd(3)} ${f}`);
  }
  console.log('\n  ' + JSON.stringify(out.answerForThisPack, null, 2).split('\n').join('\n  '));
}

const outIdx = process.argv.indexOf('--out');
if (outIdx > 0 && process.argv[outIdx + 1]) {
  writeFileSync(process.argv[outIdx + 1], JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`\nwrote ${process.argv[outIdx + 1]}`);
}
