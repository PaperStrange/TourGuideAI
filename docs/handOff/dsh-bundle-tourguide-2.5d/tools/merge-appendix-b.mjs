// Appends the old report's unique §5.4 (concrete LLM/fact enforcement mechanism)
// as Appendix B. Companion to merge-reports.mjs, which appended Appendix A.
// Usage: node merge-appendix-b.mjs <old.md> <new.md>
import { readFileSync, writeFileSync } from 'node:fs';

const [oldPath, newPath] = process.argv.slice(2);
if (!oldPath || !newPath) {
  console.error('usage: node merge-appendix-b.mjs <old.md> <new.md>');
  process.exit(2);
}

const oldLines = readFileSync(oldPath, 'utf8').split(/\r?\n/);
const start = oldLines.findIndex((l) => /^### 5\.4 /.test(l));
const end = oldLines.findIndex((l, i) => i > start && /^## 6\./.test(l));
if (start < 0 || end < 0) {
  console.error('could not locate old §5.4 boundaries');
  process.exit(1);
}

let body = oldLines.slice(start, end);
while (body.length && /^(-{3,}|\s*)$/.test(body[body.length - 1])) body.pop();
body[0] = '## Appendix B. Concrete enforcement mechanism — how the fact/narrative separation is actually held';

const block = [
  '',
  '---',
  '',
  '> **Provenance.** Appendix B is the second and last artefact carried over from the superseded',
  '> earlier report. §5 above states the *rule* (the LLM may only produce narrative wrapping over a',
  '> frozen `GuideDoc`); this appendix states the *mechanism* that makes the rule enforceable, which',
  '> the earlier pass specified in more operational detail than §5 does. Source: see "Authored by".',
  '',
  ...body,
  '',
].join('\n');

const current = readFileSync(newPath, 'utf8');
if (current.includes('## Appendix B')) {
  console.error('refusing to run: new report already contains "## Appendix B"');
  process.exit(1);
}

// Insert before the "## Authored by" section so provenance stays last.
const marker = '\n---\n\n## Authored by';
const idx = current.indexOf(marker);
const out = idx >= 0
  ? current.slice(0, idx) + block + current.slice(idx)
  : current + block;

writeFileSync(newPath, out, 'utf8');
console.log('inserted Appendix B');
console.log(`  appendix body lines: ${body.length}`);
console.log(`  new file size: ${readFileSync(newPath, 'utf8').length}`);
