// Converts fetched HTML evidence pages into readable plain text so clauses can
// be quoted verbatim (raw HTML interleaves tags that break sentence continuity).
// Usage: node html-to-text.mjs <indir> <outfile>
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [indir, outfile] = process.argv.slice(2);
if (!indir || !outfile) {
  console.error('usage: node html-to-text.mjs <indir> <outfile>');
  process.exit(2);
}

function toText(raw) {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|td|th|blockquote|pre)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const parts = [];
for (const f of readdirSync(indir).filter((x) => x.endsWith('.html')).sort()) {
  const t = toText(readFileSync(join(indir, f), 'utf8'));
  parts.push(
    `${'='.repeat(100)}\n` +
    `SOURCE FILE: ${f}\n` +
    `(plain-text rendering of the fetched HTML; tags and scripts removed)\n` +
    `${'='.repeat(100)}\n\n${t}\n`
  );
}

const out = parts.join('\n\n');
writeFileSync(outfile, out, 'utf8');
const kb = Math.round(Buffer.byteLength(out, 'utf8') / 1024);
console.log(`wrote ${outfile}`);
console.log(`  ${parts.length} page(s), ${out.length} chars (~${kb} KB)`);
