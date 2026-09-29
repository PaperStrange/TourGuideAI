// Extracts quotable spans from the fetched ToS pages so claims can be bound to
// verbatim evidence. Usage: node extract-clauses.mjs <dir> <keyword> [contextChars]
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [dir, keyword, ctxRaw] = process.argv.slice(2);
if (!dir || !keyword) {
  console.error('usage: node extract-clauses.mjs <dir> <keyword> [contextChars]');
  process.exit(2);
}
const ctx = Number(ctxRaw ?? 260);

function text(file) {
  let raw = readFileSync(file, 'utf8');
  raw = raw.replace(/<script[\s\S]*?<\/script>/gi, ' ')
           .replace(/<style[\s\S]*?<\/style>/gi, ' ')
           .replace(/<[^>]+>/g, ' ')
           .replace(/&#39;|&apos;/g, "'")
           .replace(/&quot;/g, '"')
           .replace(/&amp;/g, '&')
           .replace(/&nbsp;/g, ' ')
           .replace(/\s+/g, ' ')
           .trim();
  return raw;
}

const files = ['google-maps-service-terms.html', 'google-places-billing.html',
  'osm-tile-usage-policy.html', 'osm-copyright-odbl.html',
  'osm-nominatim-policy.html', 'geofabrik-japan.html'];

const re = new RegExp(keyword, 'gi');
for (const f of files) {
  const p = join(dir, f);
  if (!existsSync(p)) continue;
  const t = text(p);
  let m, n = 0;
  const seen = new Set();
  while ((m = re.exec(t)) !== null && n < 4) {
    const start = Math.max(0, m.index - Math.floor(ctx / 3));
    const span = t.slice(start, Math.min(t.length, m.index + ctx));
    const key = span.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    n += 1;
    console.log(`\n[${f}] @${m.index}\n  ...${span}...`);
  }
  if (n === 0) console.log(`\n[${f}] no match for /${keyword}/`);
}
