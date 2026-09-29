// Dumps a contiguous text window around an anchor phrase from one fetched page,
// so a clause can be quoted verbatim in an evidence snapshot.
// Usage: node show-clause.mjs <file> <anchorRegex> [beforeChars] [afterChars]
import { readFileSync } from 'node:fs';

const [file, anchor, beforeRaw, afterRaw] = process.argv.slice(2);
if (!file || !anchor) {
  console.error('usage: node show-clause.mjs <file> <anchorRegex> [before] [after]');
  process.exit(2);
}
const before = Number(beforeRaw ?? 120);
const after = Number(afterRaw ?? 1800);

const raw = readFileSync(file, 'utf8');
const text = raw
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, '\n')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, '&')
  .replace(/&nbsp;/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const re = new RegExp(anchor, 'i');
const m = re.exec(text);
if (!m) {
  console.error(`anchor not found: /${anchor}/`);
  process.exit(1);
}
const start = Math.max(0, m.index - before);
const end = Math.min(text.length, m.index + after);
console.log(text.slice(start, end));
