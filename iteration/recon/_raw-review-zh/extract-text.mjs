// Renders fetched pages to plain text for verbatim quoting.
//
// Why not the shared html-to-text.mjs: several Chinese UGC sites deliver the
// *visible* terms inside a client-side template, e.g.
//   <script id="view" type="text/lizard-template"> ...all the clauses... </script>
// A blanket <script>...</script> strip deletes the very clauses we need. This
// extractor removes only executable script blocks (JS MIME types / no type) and
// keeps non-JS script blocks, which are server-delivered markup.
//
// Usage: node extract-text.mjs <dir>
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? '.';
const EXEC = /^(text\/javascript|application\/javascript|module|text\/ecmascript)$/i;

function stripExecutableScripts(html) {
  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (whole, attrs, body) => {
    const m = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs);
    const type = m ? m[1] : '';
    return !type || EXEC.test(type) ? ' ' : body;
  });
}

function toText(raw) {
  return stripExecutableScripts(raw)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|td|th|blockquote|pre)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const files = readdirSync(dir).filter((f) => f.endsWith('.html') || f.endsWith('.txt.html')).sort();
const parts = [];
for (const f of files) {
  const t = toText(readFileSync(join(dir, f), 'utf8'));
  writeFileSync(join(dir, f.replace(/\.html$/, '.txt')), t, 'utf8');
  parts.push(
    `${'='.repeat(100)}\nSOURCE FILE: ${f}\n` +
    `(plain-text rendering of the fetched page; executable scripts and styles removed,\n` +
    `server-delivered template blocks kept)\n${'='.repeat(100)}\n\n${t}\n`
  );
  console.log(`${f.padEnd(40)} text=${t.length}`);
}

// Non-HTML sources (e.g. a fetched .docx rendered to text) are included verbatim.
for (const f of readdirSync(dir).filter((x) => x.endsWith('.docx.txt')).sort()) {
  const t = readFileSync(join(dir, f), 'utf8');
  parts.push(
    `${'='.repeat(100)}\nSOURCE FILE: ${f} (rendered from the fetched .docx)\n` +
    `(plain-text rendering of word/document.xml)\n${'='.repeat(100)}\n\n${t}\n`
  );
  console.log(`${f.padEnd(40)} text=${t.length}`);
}
writeFileSync(join(dir, 'SOURCES-plaintext.txt'), parts.join('\n\n'), 'utf8');
console.log(`\nwrote SOURCES-plaintext.txt (${parts.length} page(s))`);
