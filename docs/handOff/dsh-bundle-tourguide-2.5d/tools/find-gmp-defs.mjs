// Locate and print the definition of "Google Maps Content" plus the Section 10
// exception family, which decides whether derived/grounded output escapes the
// Content restrictions.
import { readFileSync } from 'node:fs';

const p = process.argv[2];
let raw = readFileSync(p, 'utf8');
raw = raw.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
raw = raw.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
raw = raw.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
raw = raw.split('\n').map((l) => l.trim()).filter(Boolean).join(' ');
raw = raw.replace(/\s+/g, ' ');

const needles = [
  '"Google Maps Content" means',
  'Google Maps Content" means',
  '10.1 ',
  '10.2 ',
  '10.3 ',
  'Grounded Output" means',
  'Substantially',
  'Limitations on Content',
];
for (const n of needles) {
  const i = raw.indexOf(n);
  console.log(`\n════ "${n}" ════`);
  if (i < 0) { console.log('  (not found)'); continue; }
  console.log('  ' + raw.slice(Math.max(0, i - 80), i + 900).trim());
}
