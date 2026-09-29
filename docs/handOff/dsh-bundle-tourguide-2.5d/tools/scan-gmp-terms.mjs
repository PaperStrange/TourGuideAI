// Extract the clauses that decide whether "fetch → store derived layer → render
// server-side" is permitted. Reads the stored Google Maps service-terms snapshot
// and prints candidate sentences grouped by theme.
import { readFileSync } from 'node:fs';

const p = process.argv[2];
let raw = readFileSync(p, 'utf8');
raw = raw.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
raw = raw.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
raw = raw.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ');

const sentences = raw.split(/(?<=[.!?])\s+/);
const themes = {
  'derive / derivative / produce': /deriv|produc(?:e|ed|t)\s+work/i,
  'render / rendering': /render/i,
  'display / attribution duties': /\bdisplay\b|attribut/i,
  'map imagery & tiles': /imagery|\btiles?\b|map data/i,
  'non-Google map prohibitions': /non-Google/i,
  'store / cache / delete': /\bstore|\bcach|delete the cached/i,
  'export / download': /export|download/i,
};

console.log(`source: ${p}\nplain text: ${raw.length} chars, ${sentences.length} sentences\n`);
for (const [label, re] of Object.entries(themes)) {
  const hits = sentences.filter((s) => re.test(s));
  console.log(`── ${label}  (${hits.length} hit${hits.length === 1 ? '' : 's'})`);
  for (const h of hits.slice(0, 8)) {
    const t = h.trim();
    if (t.length < 15) continue;
    console.log(`   • ${t.slice(0, 300)}`);
  }
  console.log('');
}
