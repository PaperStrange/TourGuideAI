// Print the exact text around specific section numbers in the stored Google Maps
// service-terms snapshot, so a clause can be quoted verbatim rather than summarised.
import { readFileSync } from 'node:fs';

const p = process.argv[2];
let raw = readFileSync(p, 'utf8');
raw = raw.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
raw = raw.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
raw = raw.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
raw = raw.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
raw = raw.replace(/\n(?=[a-z,;)])/g, ' ').replace(/\s+/g, ' ').replace(/(\d\.\d(?:\.\d)?)\s/g, '\n$1 ');

const want = process.argv.slice(3);
for (const w of want) {
  const i = raw.indexOf(`\n${w} `);
  const j = i >= 0 ? i : raw.indexOf(w);
  console.log(`\n════════ around "${w}" ════════`);
  if (j < 0) { console.log('  (not found)'); continue; }
  console.log('  ' + raw.slice(Math.max(0, j - 120), j + 1100).trim().replace(/\n/g, '\n  '));
}
