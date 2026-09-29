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
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
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
