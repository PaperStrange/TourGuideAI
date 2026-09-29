// Validates a skill directory the way the filesystem skill provider will read
// it: SKILL.md exists, carries YAML frontmatter, and the frontmatter holds the
// fields discovery depends on. Usage:
//   node check-skill-md.mjs <skills-dir-or-SKILL.md>
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const target = process.argv[2];
if (!target) {
  console.error('usage: node check-skill-md.mjs <skills-dir-or-SKILL.md>');
  process.exit(2);
}

const files = [];
if (statSync(target).isDirectory()) {
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const p = join(target, entry.name, 'SKILL.md');
    if (existsSync(p)) files.push(p);
    else console.error(`WARN ${entry.name}/ has no SKILL.md and will not be discovered`);
  }
} else if (existsSync(target)) {
  files.push(target);
}

if (files.length === 0) {
  console.error(`FAIL no SKILL.md found under ${target}`);
  process.exit(1);
}

let failed = false;
for (const p of files) {
  const raw = readFileSync(p, 'utf8');
  const problems = [];
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) {
    problems.push('no YAML frontmatter block (--- ... ---)');
  } else {
    let fm;
    try {
      fm = yaml.load(m[1]);
    } catch (err) {
      problems.push(`frontmatter is not valid YAML: ${err.message}`);
    }
    if (fm) {
      if (!fm.name) problems.push('frontmatter.name missing');
      else if (!/^[a-z0-9-]+$/.test(fm.name)) problems.push(`frontmatter.name "${fm.name}" is not lower-kebab-case`);
      if (!fm.description) problems.push('frontmatter.description missing');
      else {
        const d = String(fm.description);
        if (!/^use when/i.test(d)) problems.push('description should start with "Use when" so the model knows when to load it');
        if (d.length > 1024) problems.push(`description is ${d.length} chars (>1024); keep the catalog entry short`);
      }
      const bodyChars = raw.length - m[0].length;
      if (bodyChars < 200) problems.push(`body is only ${bodyChars} chars; too thin to be a useful skill`);
    }
  }

  if (problems.length) {
    failed = true;
    console.error(`FAIL ${p}`);
    for (const x of problems) console.error(`  - ${x}`);
  } else {
    console.log(`OK   ${p}`);
    console.log(`     name=${yaml.load(m[1]).name}  body=${raw.length - m[0].length} chars`);
  }
}

process.exit(failed ? 1 : 0);
