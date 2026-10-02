#!/usr/bin/env node
/**
 * apply-tracked-corrections.mjs — repair the tracked metadata sources, not their output.
 *
 * Two classes of correction, both cases of a fact that was true when written and is not any more:
 *
 *  1. `valueKind=licenced` for the 12 doors. world-grid.mjs added `authored` for exactly this
 *     case (OSM maps two footprints and zero entrance nodes, so a door position is a curator's
 *     placement, not a licence-derived template). doors.json moved; this prose did not.
 *
 *  2. Contradiction C6 is RESOLVED, not open. It recorded that SKILL.md's schema (`lat`, `lng`)
 *     and contract-geo-pipeline.md §5 (integer microdegrees, no second alias) disagreed.
 *     Lead's ruling, 2026-09-30: decimal `lat`/`lng` are canonical IN THE FACT LAYER because the
 *     schema and validate-city-pack.mjs require them; integer microdegrees remain the provenance
 *     form and live in the ODbL halves, reached by `osmRecord`; and carrying one number in two
 *     representations with one authoritative and the other recomputed+asserted is NOT the
 *     forbidden second alias. A resolved contradiction left in place reads as an open risk, so
 *     it is relabelled resolved with the ruling recorded.
 *
 * Editing the tracked source rather than the generated output matters: merge-pack-meta.mjs
 * rewrites pack.json from places.meta.json on every build, so a fix applied only to pack.json
 * is erased by the next build. That is the same drift the fix is about.
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, o) => writeFileSync(p, JSON.stringify(o, null, 2) + '\n', 'utf8');

let edits = 0;

// ---- 1. places.meta.json: the tracked source of the pack's prose --------------
const metaPath = resolve(HERE, 'places.meta.json');
const meta = readJson(metaPath);

const DOOR_REASON = 'doors.json は各門を valueKind=authored とする（world-grid.mjs が task-2 で追加した第 4 の enum メンバ。OSM は block に 2 つの footprint と entrance node ゼロしか記録しておらず、門の位置はキュレーターの配置であってライセンス由来のテンプレートではない）。';
for (const g of meta.gaps) {
  if (typeof g === 'string' && g.includes('valueKind=licenced')) {
    meta.gaps[meta.gaps.indexOf(g)] = g
      .replace(/valueKind=licenced としており/g, 'valueKind=authored としており')
      .replace(/licenced のまま留まる/g, 'authored のまま留まる');
    edits++;
  }
}
for (const c of meta.contradictions) {
  if (c.id === 'C5' && c.handling.includes('valueKind=licenced')) {
    c.handling = c.handling.replace(/valueKind=licenced とし/g, 'valueKind=authored とし');
    edits++;
  }
}

// ---- 2. places.json: the door labels the fact table itself carries ------------
// extract-nonfact-rows.mjs moves these records around but never rewrites their contents, so a
// label fixed only in the metadata prose would survive in the fact table. Both are corrected.
const placesPath = resolve(PACK, 'places.json');
const places = readJson(placesPath);
for (const p of places) {
  if (p.entrances && p.entrances.valueKind !== 'authored') {
    p.entrances.valueKind = 'authored';
    p.entrances.guideVerifiedColumnAllowed = false;
    p.entrances.whyNotObserved = DOOR_REASON;
    edits++;
  }
}
writeJson(placesPath, places);

// ---- 3. C6: record the ruling, do not leave a resolved decision looking open ---
const c6 = meta.contradictions.find((c) => c.id === 'C6');
if (c6 && c6.status !== 'resolved') {
  c6.status = 'resolved';
  c6.resolvedAt = '2026-09-30';
  c6.resolvedBy = 'Lead';
  c6.resolution = 'lat / lng（十進数の数値）が事実層の正準形。skill の schema と validate-city-pack.mjs がそう要求しており、schema は自分のファイル内で優先する。整数マイクロ度は provenance 形式として残り、ODbL 側ハーフ（kyoto-shijo-osm-places.json）に置かれ、osmRecord で到達する。第二の別名は禁止＝第二の「値」の禁止であり、同一の数を 2 表記で持ち片方を権威・他方を再計算してアサートする本パックの扱い（validate-city-pack-v2.mjs check C）は別名に当たらない。この区別は Lead 裁定により明示された。SKILL.md の schema 節も同じ裁定で更新済み。';
  c6.handling = `${c6.handling} → 裁定済み（下記 resolution）。`;
  edits++;
}

// ---- 3. C5: closed by the Lead, so say so rather than leaving it looking open ---
// The card said the 12 doors should be places rows; the pack does not register them. Lead's
// ruling, 2026-09-30: "The card was wrong, not you." Leaving a resolved contradiction labelled
// open overstates the pack's remaining risk, which misleads the next reader in the safe direction
// — and a risk list nobody trusts is one nobody reads.
for (const c of meta.contradictions) {
  if (c.id === 'C5' && c.status !== 'resolved') {
    c.status = 'resolved';
    c.resolvedAt = '2026-09-30';
    c.resolvedBy = 'Lead';
    c.resolution = 'カードの『12 個の門自体は places として入庫すべき』は誤りだった。Lead 裁定：門は places の行にしない。places の行は名前と出典のある位置を期待するが、門の「名前」は本門という種別名であり、block 内に開口部の存在を述べた来源は 1 件も無い（OSM は footprint 2 件・entrance node 0 件）。scope.doorsArePlaces=false と attestations/block-doors.json が正しい形であり、doorId を 2 棟の建物レコードに宣言させ check (G) が双方向で照合する形はカードの要求より強い。';
    c.handling = `${c.handling} → 裁定済み（下記 resolution）。`;
    edits++;
  }
}

// ---- 4. task-12: the attestation half (verifier findings #1, #3, #4, #6) -------
// merge-pack-meta.mjs REGENERATES attestations/source-attestations.json from this file on every
// build, so a fix applied only to the published copy is erased on the next run. That is the same
// source-vs-output lesson as the door labels above, so the corrections go into the tracker.
if (meta.sources && !meta.sources.S15) {
  meta.sources.S15 = {
    url: 'https://opendatacommons.org/licenses/odbl/1-0/',
    title: 'Open Database License (ODbL) v1.0 — full text (Open Data Commons)',
    licence: 'ODbL 1.0（この文書自体が規約正文）',
    whatIRead: 'ODbL 正文（evidence/odbl-1.0-text.html / .txt、51,176 B）を実際に開き 4.4 と 4.5 を逐字で読んだ。4.4「Share alike. a. Any Derivative Database that You Publicly Use must be only under the terms of: i. This License」→ kyoto-shijo-osm-places.json はそれ自体 Derivative Database なので ODbL 1.0 で公開する。4.5「Limits of Share Alike. … a. For the avoidance of doubt, You are not required to license Collective Databases under this License if You incorporate this Database or a Derivative Database in the collection, but this License still applies to this Database or a Derivative Database as a part of the Collective Database」→ 同ファイルを places.json / transit.json の隣に置く配置は Collective Database であり、こちらの行は CC BY 4.0 のままでよい。2 語は別物で、以前の版は同じファイルを両方と呼んでいた。',
    evidence: 'evidence/odbl-1.0-text.html / .txt',
  };
  edits++;
}
if (meta.sources && !meta.sources.S16) {
  meta.sources.S16 = {
    url: 'https://data.city.kyoto.lg.jp/dataset/00073/',
    title: '京都市オープンデータ データセット 00073「京都観光Navi」',
    licence: 'CC-BY 4.0（表示）',
    whatIRead: 'データセットページ（evidence/kyoto-odp-dataset-00073.html / .txt、8,505 B）を実際に開いた。著作権者 京都市／登録者 産業観光局 観光ＭＩＣＥ推進室／ライセンス CC-BY 4.0（表示）／性質 一覧表オープンデータ／分野 観光・産業。2 件のリソースの一方が本パックが使う「京都観光見もの情報」CSV（S1、資源 7052）であることを確認した。このページは取得済み・転記済みであり「未開封」ではない。',
    evidence: 'evidence/kyoto-odp-dataset-00073.html / .txt',
  };
  edits++;
}
if (meta.sources?.S3 && !String(meta.sources.S3.whatIRead).includes('21,314 B')) {
  meta.sources.S3.whatIRead = 'OSM の copyright ページ（evidence/osm-copyright.html / .txt、21,314 B）を実際に開いて読んだ。ODbL 1.0 の適用、および「© OpenStreetMap contributors」の帰属表示義務の記載を確認した。以前の版はこのページを引用しながら開いておらず、スナップショットも無かったため、これは実読に置き換えた記録である。';
  meta.sources.S3.evidence = 'evidence/osm-copyright.html / .txt';
  edits++;
}
if (meta.sources?.S5 && !String(meta.sources.S5.whatIRead).includes('重複について')) {
  meta.sources.S5.whatIRead = `${meta.sources.S5.whatIRead}\n【重複について】page/0000240682.html は別の正規 URL へ転送され、evidence/kyoto-kotsu-fare-bus-normal.{html,txt} と evidence/kyoto-kotsu-fare-bus-teiki.{html,txt} が逐バイト同一（sha256 8695CF20… / CAD3F056…）になった。2 つの独立取得に見えていたが実体は 1 ページ。重複側は削除し、残した側が両方の URL に答えることをここに記す。`;
  meta.sources.S5.evidence = 'evidence/kyoto-kotsu-fare-bus-normal.html / .txt';
  meta.sources.S5.alsoServes = 'https://www.city.kyoto.lg.jp/kotsu/page/0000240682.html';
  edits++;
}
if (meta.sources?.S10 && !meta.sources.S10.evidenceRoleNote) {
  meta.sources.S10.evidence = 'evidence/kiyomizudera-access-hours.html / .txt（拝観時間表の本体）、evidence/kiyomizudera-faq.html / .txt（団体割引・障害者減免の記載。金額の記載が無いことの確認）';
  meta.sources.S10.evidenceRoleNote = 'evidence/kiyomizudera-guide.{html,txt} は S10 の時間数の根拠として挙げられていたが、そのファイルに拝観時間表は無い（表は kiyomizudera-access-hours.txt:28-67）。guide 側は清水寺サイトのトップページであり、取得日には実際に開いたが、この主張の根拠にはならない。S10 の evidence から外した。';
  edits++;
}
// The removed duplicate pair, recorded so nobody re-fetches a file that was deliberately deleted.
meta.evidenceRemoved = [...new Set([...(meta.evidenceRemoved ?? []), 'kyoto-kotsu-fare-bus-teiki.html', 'kyoto-kotsu-fare-bus-teiki.txt'])];
// Enforce it, not just record it: if the pair reappears the build deletes it, so the "57 files but
// 56 distinct contents" state cannot come back silently.
for (const f of meta.evidenceRemoved) {
  const p = join(PACK, 'evidence', f);
  if (existsSync(p)) { unlinkSync(p); edits++; console.log(`  removed re-appeared duplicate evidence/${f}`); }
}

// ---- 5. task-12: close the gaps D-15 opened, and correct the wording it exposed ----
// A gap list is read as "what is still missing". Leaving a closed item in it is the same defect as
// the misdirected `unopenedUrls`: it points the next reader at work that is already done.
if (!meta.gapsResolved) {
  meta.gapsResolved = [];
  const resolved = [
    {
      gap: '三座寺院（知恩院・清水寺・建仁寺）に坐标来源が無い',
      status: 'closed',
      closedAt: '2026-09-30',
      how: '「无来源」は誤りで、正しくは「抽取框の外」。3 件それぞれに narrow bbox で OSM API から取得し、amenity=place_of_worship の way を同定した（知恩院 way/456122965、清水寺 way/336641107、建仁寺 way/760889100）。3 件とも全頂点が揃った完全なジオメトリで、中心は全頂点の平均。証拠は evidence/osm-temple-*.json、座標は kyoto-shijo-osm-places.json。',
      whatChanged: '3 件は ungeoreferenced から places.json へ入り、parked 集合は空になった（0 places / 0 legs）。',
    },
    {
      gap: 'L07（祇園四条→建仁寺・徒歩7分）と L08（京都河原町→建仁寺・徒歩10分）が DANGLING_REF で破棄されていた',
      status: 'closed',
      closedAt: '2026-09-30',
      how: '端点に座標が無かったことが唯一の理由だったので、座標が入った時点で復帰させた。分は運営者公表値（kenninji-access.txt:20,:21）。加えて両端点間の直線距離を実測し、RFTC 80 m/分 換算との食い違いを各レコードに記録した（L07: 427.4 m → 6 分 vs 公表 7 分。L08: 605.3 m → 8 分 vs 公表 10 分）。',
      whatChanged: 'transit.json は 6 本から 9 本になった（L09 清水寺を新規追加）。packed legs は 0。',
    },
    {
      gap: '清水寺への leg が存在しない（slice の看板目的地）',
      status: 'closed',
      closedAt: '2026-09-30',
      how: 'L09 祇園バス停 → 清水寺 を追加。15 分は本パックの実測直線距離 1,122.6 m に RFTC 80 m/分 の端数切り上げを適用した値（licenced、運営者公表値ではない）。清水寺公式が公表する徒歩分数は京阪 清水五条駅からの約25分であり、清水五条駅の座標は本パックに無いので、その leg は引退させず gapNotes #0 に残した。',
    },
  ];
  meta.gapsResolved.push(...resolved);
  edits++;
}

// The three coordinate entries in gapNotes are closed: they were the D-15 items above.
if (!meta.gapNotesResolvedAt) {
  const coordGapIds = ['知恩院の座標', '建仁寺の座標', '清水寺の座標'];
  const moving = meta.gapNotes.filter((g) => coordGapIds.includes(g.gap));
  if (moving.length) {
    meta.gapNotesClosed = moving.map((g) => ({ ...g, status: 'closed', closedAt: '2026-09-30', how: 'narrow bbox で OSM API から取得。evidence/osm-temple-*.json を参照。' }));
    meta.gapNotes = meta.gapNotes.filter((g) => !coordGapIds.includes(g.gap));
    edits++;
  }
  meta.gapNotesResolvedAt = '2026-09-30';
}

// The 清水五条 / 東山安井 / 南座前 note said those points are "outside this pack's OSM extract
// range", which reads as a property of the world. It is a property of OUR fetch box, and after D-15
// that distinction is not allowed to blur.
if (!meta.gapNotesWordingFixed) {
  for (const g of meta.gapNotes) {
    if (typeof g.whyNotALeg === 'string' && g.whyNotALeg.includes('OSM 抽出範囲外')) {
      g.whyNotALeg = 'これらの座標は本パックの OSM 抽取框（lat 35.0028–35.0047）の外にある。来源に無いのではない（D-15 と同じ区別）。この 3 点はまだ個別に取得していないため端点にできず、出典付きの注記として残す。';
      edits++;
    }
  }
  meta.gapNotesWordingFixed = '2026-09-30';
}

// Transit gaps: "本パックの来源に無い" is the accurate claim; "取不到" overstated the obstacle.
if (meta.transit?.gaps) {
  for (const [i, g] of meta.transit.gaps.entries()) {
    if (typeof g === 'string' && g.includes('停留所間の所要時間・系統別の運行間隔・初発/終電が本パックのどの来源にも無い')) {
      meta.transit.gaps[i] = g.replace('停留所間の所要時間・系統別の運行間隔・初発/終電が本パックのどの来源にも無い', '停留所間の所要時間・系統別の運行間隔・初発/終電は、本パックの来源リストの範囲では取得していない（取得不能ではない。運営者の時刻表索引ページはパック内で引用済みだが開いていない）');
      edits++;
    }
    if (typeof g === 'string' && g.includes('地下鉄区間：四条駅→烏丸御池駅の区数が不明')) {
      meta.transit.gaps[i] = '地下鉄区間：四条駅→烏丸御池駅の区数を確定していない。京都市交通局の普通運賃一覧（S6）は区ごとの額（1区220円〜5区360円）を与えるが、駅間の区数は駅を指定する検索画面が返すものであり、その画面を本パックは開いていない。';
      edits++;
    }
  }
}

// ---- 6. task-22: keep the door inventory in step with doors.json ----------------
// `doors-author` cut the south side from 5 doors to 3. `evidence/tools/block-doors.json` is UPSTREAM
// of `attestations/block-doors.json` — this repo publishes the latter from the former on every build
// — so a stale inventory here would silently revert a correct downstream fix. Its count and doorIds
// are therefore regenerated from doors.json, the authority, instead of being hand-maintained.
try {
  const out = execFileSync(process.execPath, [resolve(HERE, 'sync-block-doors.mjs')], { encoding: 'utf8', cwd: PACK });
  console.log('  ' + out.trim().split('\n').join('\n  '));
} catch (e) {
  console.error(e.stdout ?? '');
  console.error(`sync-block-doors failed: ${e.message}`);
  process.exit(1);
}

writeJson(metaPath, meta);

// ---- 3. pack.json: C6's own copy, so it does not read as open either ----------
const packPath = resolve(PACK, 'pack.json');
const pack = readJson(packPath);
for (const c of pack.contradictions ?? []) {
  if (['C5', 'C6'].includes(c.id) && c.status !== 'resolved') {
    const src = meta.contradictions.find((m) => m.id === c.id);
    if (src) { Object.assign(c, src); edits++; }
  }
  if (c.id === 'C5' && typeof c.handling === 'string' && c.handling.includes('valueKind=licenced')) {
    c.handling = c.handling.replace(/valueKind=licenced とし/g, 'valueKind=authored とし');
    edits++;
  }
}
writeJson(packPath, pack);

console.log(`apply-tracked-corrections: ${edits} edit(s) to the tracked sources (doors valueKind -> authored; C6 marked resolved with the Lead ruling)`);
