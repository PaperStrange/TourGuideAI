// v9-tenant-sources.mjs — fetch and read the reachable public sources that state a
// ground-floor tenancy or a doorway for the block, and print the exact sentence used.
import { readFileSync } from 'node:fs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const targets = [
  ['鎌倉シャツ 京都四条烏丸三井ビル店 開店告知', 'https://www.shirt.co.jp/news/info/2403_kyoto', ['京都三井ビルディング1階', '20番出口', '四条通烏丸東入長刀鉾町8番', '直結']],
  ['A.P.C. KYOTO 移転リニューアル', 'https://www.fashion-press.net/news/20856', ['長刀鉾町10', '1F', '四条通烏丸東入']],
  ['タリーズ 四条烏丸京都三井ビル店', 'https://shop.tullys.co.jp/detail/4853093', ['京都三井ビル', '四条通烏丸東入', '1階', '階']],
  ['アークテリクス 京都ブランドストア 出店告知', 'https://www.apparel-mag.com/sbm/article/shop/2332', ['長刀鉾町', '四条', '京都ダイヤビル', '1階']],
  ['京都ダイヤビル テナント一覧(2026-02)', 'https://osaka-sirokichi.seesaa.net/article/519944857.html', ['1階', '三菱UFJ銀行', 'A.P.C.', 'アークテリクス', '玄関口', '旧三菱銀行']],
  ['京都三井ビル 物件紹介(office-navi blog)', 'https://www.office-navi.jp/officeblog/%e4%ba%ac%e9%83%bd/202411/entry37225/', ['ビルエントランス横に地下鉄の入り口', '地下道直結', '長刀鉾町8', '地上8階']],
];
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const seen = new Set();
const out = {};
for (const [label, url, needles] of targets) {
  console.log(`\n########## ${label}`);
  console.log(`  URL: ${url}`);
  let html;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ja' }, redirect: 'follow' });
    if (!r.ok) { console.log(`  FETCH FAILED HTTP ${r.status}`); out[label] = { url, status: r.status }; continue; }
    html = await r.text();
    console.log(`  HTTP ${r.status}, ${html.length} bytes`);
  } catch (e) { console.log(`  FETCH ERROR ${e.message}`); out[label] = { url, error: String(e.message) }; continue; }
  const text = strip(html);
  const found = [];
  for (const n of needles) {
    const i = text.indexOf(n);
    if (i < 0) { console.log(`  [MISS] "${n}"`); continue; }
    const seg = text.slice(Math.max(0, i - 130), i + 170).trim();
    console.log(`  [HIT ] "${n}"`);
    console.log(`         ...${seg}...`);
    found.push({ needle: n, context: seg });
    seen.add(n);
  }
  out[label] = { url, status: 200, found };
}
console.log('\n===== which needles appeared in ANY source =====');
for (const n of [...seen].sort()) console.log(`  ${n}`);
console.log('\nNOTE: every sentence above is what a public page states. None of them is street-level');
console.log('      imagery; none states a door POSITION along the facade.');
