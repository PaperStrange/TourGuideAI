// v18-sow-integrity.mjs — check the SOW for the two defect classes I just found:
//   (a) factual errors about tracked-ness introduced in the merged text
//   (b) malformed table rows (a long row split across physical lines)
import { readFileSync } from 'node:fs';
const f = 'iteration/design/SOW.md';
const lines = readFileSync(f, 'utf8').split(/\r?\n/);
console.log(`SOW.md: ${lines.length} lines\n`);

console.log('===== (a) claims about tracked-ness =====');
const claims = [
  [/scene\.bin[^\n]{0,40}被跟踪/, 'scene.bin 被跟踪', false, 'scene.bin is GITIGNORED (.gitignore:86 /build)'],
  [/被跟踪文件[^\n]{0,20}scene\.bin/, 'tracked-file + scene.bin', false, 'same'],
];
for (let i = 0; i < lines.length; i++) {
  for (const [re, label, truth, why] of claims) {
    if (re.test(lines[i])) {
      console.log(`  L${i + 1}: ${label}  ->  TRUTH: ${why}`);
      console.log(`      "${lines[i].trim().slice(0, 190)}"`);
    }
  }
}
// any other place asserting scene.bin is tracked
for (let i = 0; i < lines.length; i++) {
  if (/scene\.bin/.test(lines[i]) && /(被跟踪|tracked)/.test(lines[i])) {
    console.log(`  L${i + 1} (broad match): "${lines[i].trim().slice(0, 190)}"`);
  }
}

console.log('\n===== (b) table integrity =====');
// a markdown table line begins with | ; a row that fails to end with | is malformed
const tables = [];
let cur = null;
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim();
  if (t.startsWith('|')) {
    if (!cur) cur = { start: i + 1, rows: [] };
    cur.rows.push({ n: i + 1, t });
  } else if (cur && t.startsWith('>') && t.endsWith('|')) {
    // blockquote line that still carries a trailing cell pipe => orphaned row fragment
    cur.orphans = cur.orphans || [];
    cur.orphans.push({ n: i + 1, t });
  } else {
    if (cur) { tables.push(cur); cur = null; }
  }
}
if (cur) tables.push(cur);
console.log(`  tables found: ${tables.length}`);
let badHeader = 0, badRows = 0, orphans = 0;
for (const tb of tables) {
  const first = tb.rows[0]?.t || '';
  const cols = first.split('|').length - 2;
  const issues = [];
  for (const r of tb.rows) {
    const endsWithPipe = r.t.endsWith('|');
    const c = r.t.split('|').length - 2;
    if (!endsWithPipe || c !== cols) issues.push(`    L${r.n}: cells=${c} (expected ${cols}) endsWithPipe=${endsWithPipe}`);
  }
  if (issues.length || tb.orphans) {
    console.log(`  TABLE at L${tb.start} (cols=${cols}) — ${issues.length} malformed row(s), ${tb.orphans?.length || 0} orphaned fragment(s)`);
    issues.slice(0, 6).forEach(x => console.log(x));
    if (issues.length > 6) console.log(`    ... ${issues.length - 6} more`);
    for (const o of tb.orphans || []) {
      console.log(`    L${o.n}: ORPHAN blockquote fragment ending in '|' -> "${o.t.slice(0, 150)}"`);
      orphans++;
    }
    badRows += issues.length;
  }
}
console.log(`\n  total malformed rows: ${badRows}, orphaned fragments: ${orphans}`);
