// v10-live-osm.mjs — LIVE check against the OSM database (GET + UA), independent of the
// pack's frozen snapshot. Tests three things the pack asserts:
//   (1) are there really no entrance/door nodes in this block?
//   (2) what is actually mapped as a shop/amenity on these two buildings?
//   (3) are the two footprints still the same shape as the frozen evidence?
const UA = 'TourGuideAI-door-reality-check/1.0 (contact: local research)';
const O = { lon: 135.759719, lat: 35.003658 };
const MLON = 91282.15, MLAT = 110940.65;
const XY = (lat, lon) => ({ x: (lon - O.lon) * MLON, y: (lat - O.lat) * MLAT });

async function overpass(q, tries = 5) {
  const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q);
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.status === 504 || r.status === 429 || r.status === 502) {
        console.log(`    (overpass HTTP ${r.status}, retry ${i}/${tries})`);
        await new Promise(s => setTimeout(s, 5000 * i));
        continue;
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const t = await r.text();
      if (!t.trim().startsWith('{')) { console.log('    (non-json body, retrying)'); await new Promise(s => setTimeout(s, 4000)); continue; }
      return JSON.parse(t);
    } catch (e) {
      console.log(`    (overpass error ${e.message}, retry ${i}/${tries})`);
      await new Promise(s => setTimeout(s, 5000 * i));
    }
  }
  throw new Error('overpass gave up after ' + tries + ' tries');
}

// block 0 bbox: x in [0,40), y in [-20,20)  =>  lon/lat
const x0 = O.lon, x1 = O.lon + 40 / MLON;
const y0 = O.lat - 20 / MLAT, y1 = O.lat + 20 / MLAT;
const bbox = `${y0},${x0},${y1},${x1}`;
console.log(`block bbox (S,W,N,E) = ${bbox}`);
console.log(`  = lon ${x0.toFixed(6)}..${x1.toFixed(6)}  lat ${y0.toFixed(6)}..${y1.toFixed(6)}`);

console.log('\n########## (1) LIVE: any entrance / door / building:entrance node in the block? ##########');
const q1 = `[out:json][timeout:60];(node["entrance"](${bbox});node["door"](${bbox});node["building:entrance"](${bbox});way["entrance"](${bbox});way["door"](${bbox});way["building:entrance"](${bbox}););out tags center;`;
const r1 = await overpass(q1);
console.log(`  elements returned: ${r1.elements.length}`);
for (const e of r1.elements) {
  const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
  const p = lat ? XY(lat, lon) : null;
  console.log(`    ${e.type}/${e.id}  ${p ? `x=${p.x.toFixed(1)} y=${p.y.toFixed(1)}` : ''}  ${JSON.stringify(e.tags)}`);
}
console.log(`  osm3s timestamp: ${r1.osm3s?.timestamp_osm_base}`);
console.log(`  >>> LIVE VERDICT: ${r1.elements.length === 0 ? 'CONFIRMED zero entrance/door elements in the block' : 'the block DOES have entrance/door elements — the pack claim is out of date'}`);

console.log('\n########## (2) LIVE: every shop / amenity / POI inside the block ##########');
const q2 = `[out:json][timeout:60];(node["shop"](${bbox});node["amenity"](${bbox});node["office"](${bbox});node["tourism"](${bbox});way["shop"](${bbox});way["amenity"](${bbox});way["office"](${bbox}););out tags center;`;
const r2 = await overpass(q2);
console.log(`  elements returned: ${r2.elements.length}`);
for (const e of r2.elements) {
  const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
  const p = lat ? XY(lat, lon) : null;
  console.log(`    ${e.type}/${String(e.id).padEnd(12)} ${p ? `x=${p.x.toFixed(1).padStart(6)} y=${p.y.toFixed(1).padStart(6)}` : '        -      -'}  ${JSON.stringify(e.tags)}`);
}

console.log('\n########## (3) LIVE: the two footprints, and any building:part / entrance on them ##########');
const q3 = `[out:json][timeout:60];(way(205732558);way(205732536);relation["building"](35.0034,135.7595,35.0041,135.7606););out body geom;`;
const r3 = await overpass(q3);
for (const e of r3.elements) {
  if (e.type !== 'way') { console.log(`  ${e.type}/${e.id} tags=${JSON.stringify(e.tags)}`); continue; }
  const pts = (e.geometry || []).map(g => XY(g.lat, g.lon));
  console.log(`  way/${e.id} ${e.tags?.name || ''} nodes=${pts.length} tags=${JSON.stringify(e.tags)}`);
  if (pts.length) {
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    console.log(`      x[${Math.min(...xs).toFixed(2)}, ${Math.max(...xs).toFixed(2)}]  y[${Math.min(...ys).toFixed(2)}, ${Math.max(...ys).toFixed(2)}]`);
  }
}

console.log('\n########## (4) LIVE: is there a subway entrance near the 三井ビル (the claimed 20番出口)? ##########');
const q4 = `[out:json][timeout:60];(node["railway"="subway_entrance"](35.0028,135.7588,35.0060,135.7620);node["railway"="subway_entrance"](35.0028,135.7588,35.0060,135.7620););out tags center;`.replace(/\(([^)]+)\);node\["railway"="subway_entrance"\]\(\1\);/g, '($1);');
const r4 = await overpass(q4);
console.log(`  subway_entrance nodes in the wider 烏丸/四条 area: ${r4.elements.length}`);
for (const e of r4.elements) {
  const p = XY(e.lat, e.lon);
  console.log(`    node/${String(e.id).padEnd(12)} ref=${String(e.tags.ref ?? '-').padEnd(4)} x=${p.x.toFixed(1).padStart(8)} y=${p.y.toFixed(1).padStart(7)}  name=${e.tags.name ?? '-'}`);
}
console.log('  (the pack claims a "20番出口" is integrated with 京都三井ビルディング; check whether ref=20 exists)');
