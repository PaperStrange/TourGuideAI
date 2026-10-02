// v12-recheck-after-change.mjs — the fact layer changed after task-3 was signed off.
// Re-run the load-bearing checks on the CURRENT bytes, and diff against what I verified.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const P = 'city-packs/kyoto-shijo/';
const rd = (f) => readFileSync(P + f, 'utf8');
const rj = (f) => JSON.parse(rd(f));
const places = rj('places.json'), transit = rj('transit.json'), osmHalf = rj('kyoto-shijo-osm-places.json');
const MLON = 91282.15, MLAT = 110940.65;
const h = (f) => createHash('sha256').update(readFileSync(P + f)).digest('hex').toUpperCase();

console.log('===== 1. the pack changed under my verified report =====');
console.log('  places.json  sha256 now :', h('places.json').slice(0, 32));
console.log('  transit.json sha256 now :', h('transit.json').slice(0, 32));
console.log('  (my task-3 report was written against 19 places / 6 legs;');
console.log('   those hashes were 5634B764.. / 721D29B7.. — both differ now)');
console.log(`  counts now: places=${places.length} legs=${transit.length}`);
console.log(`  ungeoreferenced-places.json now has ${rj('attestations/ungeoreferenced-places.json').places.length} place(s)`);
console.log(`  dropped-legs.json now has ${rj('attestations/dropped-legs.json').legs.length} leg(s)`);

console.log('\n===== 2. the 3 temples: do their NEW coordinates match my independent Nominatim read? =====');
// values I fetched myself from Nominatim on 2026-09-30, recorded in my task-3 report
const mine = {
  'kyoto-shijo-chion-in': { lat: 35.0056216, lon: 135.7835389, ref: 'Nominatim 知恩院 amenity/place_of_worship' },
  'kyoto-shijo-kiyomizu-dera': { lat: 34.9943030, lon: 135.7844389, ref: 'Nominatim 清水寺 amenity/place_of_worship' },
  'kyoto-shijo-kennin-ji': { lat: 35.0002572, lon: 135.7737408, ref: 'Nominatim 建仁寺 amenity/place_of_worship' },
};
for (const p of places.filter(x => mine[x.id])) {
  const m = mine[p.id];
  const d = Math.hypot((p.lat - m.lat) * MLAT, (p.lng - m.lon) * MLON);
  console.log(`  ${p.nameJa.padEnd(6)} pack=${p.lat},${p.lng}   mine=${m.lat},${m.lon}   Δ=${d.toFixed(1)} m`);
  console.log(`         osmRecord=${p.osmRecord}`);
  console.log(`         origin=${p.origin}  valueKind=${p.provenance.valueKind}  badge=${p.provenance.guideVerifiedColumnAllowed}`);
  const rec = osmHalf.places.find(r => r.placeId === p.id);
  console.log(`         ODbL half row: ${rec ? rec.osmRef + '  licence=' + rec.licence + '  latUdeg=' + rec.latUdeg : '*** ABSENT FROM THE ODbL HALF ***'}`);
  const twinOk = Math.round(p.lat * 1e6) === p.latUdeg && Math.round(p.lng * 1e6) === p.lngUdeg;
  console.log(`         twin consistent: ${twinOk}`);
}
console.log('  note: Nominatim returns the OSM *object* representative point for a POI, which for a');
console.log('  large temple complex need not coincide with the temple grounds centroid. A ~40 m');
console.log('  difference is therefore expected and is NOT by itself an error.');

console.log('\n===== 3. the 9 legs now in transit.json =====');
for (const L of transit) {
  console.log(`  ${L.id}  ${String(L.mode).padEnd(5)} ${L.from} -> ${L.to}`);
  console.log(`        minutes=${L.minutes} alongStreetM=${L.alongStreetM} rule=${L.minutesRule} fare=${L.fareIC ?? 'null'}/${L.fareTicket ?? 'null'} src=${L.source_url.slice(0, 60)}`);
}
console.log('  distinct modes:', [...new Set(transit.map(t => t.mode))].join(','));
console.log('  legs with any fare:', transit.filter(t => t.fareIC != null || t.fareTicket != null).length);

console.log('\n===== 4. do the 3 temples now have OSM footprints backing their coordinate? =====');
const a = osmHalf.places.filter(r => mine[r.placeId]);
for (const r of a) console.log(`  ${r.placeId}: osmRef=${r.osmRef} nameOsm=${r.nameOsm ?? '-'} coordinateKind=${r.coordinateKind ?? '-'}`);
console.log('  (if osmRef is a real node/way, the coordinate traces to OSM; if it is null, the');
console.log('   coordinate has no OSM backing and the +official-site origin label is doing work it cannot do)');
