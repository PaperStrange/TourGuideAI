// Verifies that every quoted clause in a curated excerpt file appears VERBATIM in
// the fetched plain-text source. Guards against transcription drift before the
// quotes are bound as evidence.
// Usage: node verify-quotes.mjs <excerpt.md> <source-plaintext.txt>
import { readFileSync } from 'node:fs';

const [excerptPath, sourcePath] = process.argv.slice(2);
if (!excerptPath || !sourcePath) {
  console.error('usage: node verify-quotes.mjs <excerpt.md> <source-plaintext.txt>');
  process.exit(2);
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const source = norm(readFileSync(sourcePath, 'utf8'));
const excerpt = readFileSync(excerptPath, 'utf8');

// Quote candidates: lines explicitly marked as quotes with a leading "> ".
// Anything unmarked is the author's own prose and is deliberately not checked.
const lines = excerpt
  .split(/\r?\n/)
  .filter((l) => /^>\s+\S/.test(l))
  .map((l) => norm(l.replace(/^>\s*/, '')))
  .filter((l) => l.length > 20);

let ok = 0;
const missing = [];
for (const l of lines) {
  if (source.includes(l)) ok += 1;
  else missing.push(l);
}

console.log(`checked ${lines.length} candidate clause line(s)`);
console.log(`  verbatim in source : ${ok}`);
console.log(`  NOT found verbatim : ${missing.length}`);
for (const m of missing) console.log(`\n   MISSING> ${m.slice(0, 150)}`);

process.exit(missing.length === 0 ? 0 : 1);
