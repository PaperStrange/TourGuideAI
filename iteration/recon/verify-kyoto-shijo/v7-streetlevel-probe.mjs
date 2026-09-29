// v7-streetlevel-probe.mjs — what street-level / POI sources are actually reachable,
// and what do they say about the Shijō-Karasuma block? Read-only; no imagery redistributed.
import { writeFileSync } from 'node:fs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function get(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja,en;q=0.9' }, redirect: 'follow' });
    const t = await r.text();
    return { ok: r.ok, status: r.status, len: t.length, text: t };
  } catch (e) { return { ok: false, status: 0, err: String(e.message || e) }; }
}

const targets = [
  ['google-maps-place-mitsui', 'https://www.google.com/maps/place/%E4%BA%AC%E9%83%BD%E4%B8%89%E4%BA%95%E3%83%93%E3%83%AB%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0/@35.00376,135.75997,19z'],
  ['google-maps-search-kamakura', 'https://www.google.com/maps/search/%E3%83%A1%E3%83%BC%E3%82%AB%E3%83%BC%E3%82%BA%E3%82%B7%E3%83%A3%E3%83%84%E9%8E%8C%E5%80%89+%E4%BA%AC%E9%83%BD%E5%9B%9B%E6%9D%A1%E7%83%8F%E4%B8%B8%E4%B8%89%E4%BA%95%E3%83%93%E3%83%AB%E5%BA%97/@35.00376,135.75997,19z'],
  ['google-maps-search-daiya', 'https://www.google.com/maps/search/%E4%BA%AC%E9%83%BD%E3%83%80%E3%82%A4%E3%83%A4%E3%83%93%E3%83%AB/@35.00376,135.75997,19z'],
  ['tullys-shop-detail', 'https://shop.tullys.co.jp/detail/4853093'],
  ['apparel-mag-arcteryx', 'https://www.apparel-mag.com/sbm/article/shop/2332'],
  ['fashion-press-apc', 'https://www.fashion-press.net/news/20856'],
];

const results = {};
for (const [name, url] of targets) {
  const r = await get(url);
  results[name] = { url, status: r.status, len: r.len, ok: r.ok, err: r.err };
  console.log(`\n########## ${name}  HTTP ${r.status}  ${r.len ?? 0} bytes ##########`);
  if (!r.ok) { console.log('  FAILED:', r.err || r.status); continue; }
  const t = r.text;
  // look for the building/tenant strings and for entrance/floor hints
  const probes = [
    ['京都三井ビル', 'mitsui-bldg-name'],
    ['京都三井ビルディング', 'mitsui-bldg-full'],
    ['京都ダイヤビル', 'daiya-bldg'],
    ['鎌倉シャツ', 'kamakura-shirt'],
    ['メーカーズシャツ', 'makers-shirt'],
    ['タリーズ', 'tullys'],
    ['アークテリクス', 'arcteryx'],
    ['ARC', 'arcteryx-en'],
    ['A.P.C', 'apc'],
    ['三菱UFJ', 'mufg'],
    ['三菱ＵＦＪ', 'mufg-full'],
    ['1階', 'floor-1F'],
    ['地下1階', 'floor-B1'],
    ['出口', 'exit-kanji'],
    ['entrance', 'entrance-en'],
    ['店舗', 'storefront'],
    ['長刀鉾町8', 'addr-8'],
    ['長刀鉾町10', 'addr-10'],
    ['四条通烏丸東入', 'addr-shijo-karasuma-higashi'],
  ];
  for (const [needle, label] of probes) {
    const n = t.split(needle).length - 1;
    if (n) console.log(`  hit ${String(n).padStart(3)}x  ${label.padEnd(28)} "${needle}"`);
  }
  // For Google Maps pages: try to surface nearby description text around key names
  for (const key of ['鎌倉シャツ', 'タリーズ', 'アークテリクス', 'A.P.C', '三菱ＵＦＪ銀行']) {
    const i = t.indexOf(key);
    if (i >= 0) {
      const seg = t.slice(Math.max(0, i - 160), i + 200).replace(/\s+/g, ' ');
      console.log(`  [ctx ${key}] ...${seg}...`);
    }
  }
}
writeFileSync('iteration/recon/verify-kyoto-shijo/v7-probe.json', JSON.stringify(results, null, 2));
console.log('\nwrote iteration/recon/verify-kyoto-shijo/v7-probe.json');
