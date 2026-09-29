// v3-fact-table.mjs — build the audit table: read the claim out of the FACT (not the
// producer's attestation), then read the source bytes and decide support.
// Writes JSON only; makes no judgement that is not printed for inspection.
import { readFileSync, writeFileSync } from 'node:fs';
const P = 'city-packs/kyoto-shijo/';
const rj = (f) => JSON.parse(readFileSync(P + f, 'utf8'));
const places = rj('places.json'), transit = rj('transit.json');
const ungeo = rj('attestations/ungeoreferenced-places.json');
const dropped = rj('attestations/dropped-legs.json');
const pack = rj('pack.json');

const rows = [];
let n = 0;
const add = (o) => rows.push({ seq: ++n, ...o });

// ---- valueKind / badge-eligibility audit ----
console.log('===== guide-badge eligibility (design-core §8.2.2 ④: only observed may enter 已验证) =====');
const vk = {};
const badge = { allowedTrue: 0, allowedFalse: 0, allowedAbsent: 0 };
const licencedFields = [];
for (const p of places) {
  const pv = p.provenance || {};
  for (const [k, v] of Object.entries(pv.valueKindPerField || {})) {
    vk[v] = (vk[v] || 0) + 1;
    if (v === 'licenced') licencedFields.push(`${p.id}.${k}`);
  }
  if (pv.guideVerifiedColumnAllowed === true) badge.allowedTrue++;
  else if (pv.guideVerifiedColumnAllowed === false) badge.allowedFalse++;
  else badge.allowedAbsent++;
}
console.log('  places.json valueKindPerField histogram:', JSON.stringify(vk));
console.log(`  guideVerifiedColumnAllowed: true=${badge.allowedTrue} false=${badge.allowedFalse} absent=${badge.allowedAbsent}`);
console.log('  licenced-typed fields carrying a VALUE in places.json:');
console.log('   ', licencedFields.length ? licencedFields.join(', ') : '(none — no place field with valueKind=licenced actually carries a fact value)');

console.log('\n  transit.json minutesValueKind values:');
for (const L of transit) console.log(`    ${L.id}: valueKind=${L.provenance.valueKind} minutesValueKind=${L.provenance.minutesValueKind} distanceValueKind=${L.provenance.distanceValueKind} guideVerifiedColumnAllowed=${L.provenance.guideVerifiedColumnAllowed}`);

// ---- per-place rows ----
console.log('\n===== per-place FACT rows and what source each carries =====');
for (const p of places) {
  const hasHours = (p.hours || []).length, hasAdm = Object.keys(p.admission || {}).length;
  const osmSrc = /openstreetmap\.org/.test(p.source_url);
  console.log(`  ${p.id.padEnd(44)} cat=${String(p.category).padEnd(18)} tier=${String(p.factTier).padEnd(11)} hours=${hasHours} adm=${hasAdm} src=${osmSrc ? 'OSM' : 'OFFICIAL'} ${p.source_url}`);
}

// ---- admissions with a value ----
console.log('\n===== every admission VALUE in the pack =====');
for (const p of ungeo.places) {
  for (const it of (p.admission?.items || [])) {
    console.log(`  ${p.id} "${it.labelJa}" ${it.amount} JPY  src=${it.source_url}  effectiveFrom=${it.effectiveFrom ?? '-'} supersededFrom=${it.supersededFrom ?? '-'}`);
  }
}
console.log('  places.json admission values:', places.filter(p => Object.keys(p.admission || {}).length).length);

// ---- hours with a value ----
console.log('\n===== every hours VALUE in the pack =====');
for (const p of ungeo.places) {
  for (const h of (p.hours || [])) console.log(`  ${p.id} ${h.open}-${h.close} appliesTo="${h.appliesTo}" src=${h.source_url} verified_at=${h.verified_at}`);
}

// ---- dropped / ungeoreferenced ----
console.log('\n===== 3 ungeoreferenced (no coordinate) + 2 dropped legs =====');
for (const p of ungeo.places) console.log(`  UNGEO ${p.id} hours=${(p.hours || []).length} admissionItems=${(p.admission?.items || []).length} coords=ABSENT src=${p.source_url}`);
for (const L of dropped.legs) console.log(`  DROPPED ${L.id} ${L.from} -> ${L.to} minutes=${L.minutes} src=${L.source_url} why="${L.droppedBecause}"`);

// ---- pack-level sourced values not covered above ----
console.log('\n===== pack.json value-bearing blocks =====');
console.log('  walkTimeRule.statementJa :', pack.transit.walkTimeRule.statementJa);
console.log('  walkTimeRule.readAtLine  :', pack.transit.walkTimeRule.readAtLine);
console.log('  walkTimeRule.source_url  :', pack.transit.walkTimeRule.source_url);
for (const f of pack.transit.fareReference) console.log(`  fareReference ${f.operatorJa}: ${JSON.stringify(f.fareAdult ?? f.fareByZoneAdult)} src=${f.source_url}`);
for (const t of pack.transit.transfers) console.log(`  transfer ${t.id}: ${t.measuredAlongStreetM ?? '-'} m / ${t.minutes} min src=${t.source_url}`);
console.log('  licenceObligations.odblAttribution :', pack.licenceObligations.odblAttribution);
console.log('  licenceObligations.odblLicenceUri  :', pack.licenceObligations.odblLicenceUri);
console.log('  licenceObligations.whySeparate     :', pack.licenceObligations.whySeparate);

writeFileSync('iteration/recon/verify-kyoto-shijo/v3-facttable.json', JSON.stringify({ rows, places: places.length, transit: transit.length }, null, 2));
console.log('\nwrote iteration/recon/verify-kyoto-shijo/v3-facttable.json');
