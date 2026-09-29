// Registers the Cordis custom YAML tags so js-yaml can parse loader patches,
// then runs structural checks on a patch file. Usage:
//   node check-patch-yml.mjs <file.patch.yml>
import { readFileSync } from 'node:fs';
import yaml from 'js-yaml';

const jsTag = new yaml.Type('tag:yaml.org,2002:js', {
  kind: 'scalar',
  construct: (data) => ({ __js: data }),
});

// js-yaml 3.14 ships DEFAULT_SCHEMA as a Schema object whose types are grouped
// by kind under compiledTypeMap ({scalar, sequence, mapping, fallback} → tag →
// Type). Build an explicit type list so the Cordis `!!js` scalar tag resolves
// instead of throwing "unknown tag !<tag:yaml.org,2002:js>".
function defaultTypeList() {
  const map = yaml.DEFAULT_SCHEMA.compiledTypeMap;
  if (!map) throw new Error('js-yaml DEFAULT_SCHEMA has no compiledTypeMap');
  const seen = new Set();
  const types = [];
  for (const kind of ['scalar', 'sequence', 'mapping', 'fallback']) {
    for (const t of Object.values(map[kind] ?? {})) {
      if (t && typeof t.tag === 'string' && !seen.has(t.tag)) {
        seen.add(t.tag);
        types.push(t);
      }
    }
  }
  if (types.length === 0) throw new Error('could not read js-yaml DEFAULT_SCHEMA type list');
  return types;
}

const schema = new yaml.Schema(defaultTypeList().concat([jsTag]));

const file = process.argv[2];
if (!file) {
  console.error('usage: node check-patch-yml.mjs <file.patch.yml>');
  process.exit(2);
}

// The Cordis Loader evaluates `!!js <expr>` scalars itself; plain js-yaml has no
// such tag and cannot be told about it reliably (3.14 resolves `!!js` as
// tag:yaml.org,2002:js through the default schema, so a user-registered Type is
// never consulted). Structure checking does not need the expression, so both
// forms are rewritten to a quoted placeholder before parsing. This tool proves
// the document's SHAPE; the real proof that the dialect is accepted is the
// bundle installing and its rows appearing.
const raw = readFileSync(file, 'utf8')
  .replace(/(^|\s)!!js\s+[^\n]*$/gm, '$1"__js_expr__"')
  .replace(/(^|\s)!js\s+[^\n]*$/gm, '$1"__js_expr__"');

let doc;
try {
  doc = yaml.load(raw, { schema });
} catch (err) {
  console.error(`PARSE FAIL ${file}\n  ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(doc)) {
  console.error(`SHAPE FAIL ${file}\n  top level must be a YAML array, got ${typeof doc}`);
  process.exit(1);
}

let rows = 0;
const ids = [];
for (const entry of doc) {
  if (entry && Array.isArray(entry.insert)) {
    for (const row of entry.insert) {
      rows += 1;
      ids.push(row.id);
    }
  } else if (entry && entry.id) {
    rows += 1;
    ids.push(`${row.id} (override)`);
  } else {
    console.error(`WARN ${file}: patch entry without insert[] or id: ${JSON.stringify(entry).slice(0, 80)}`);
  }
}

console.log(`PARSE OK  ${file}`);
console.log(`  patch entries : ${doc.length}`);
console.log(`  rows          : ${rows}`);
console.log(`  row ids       : ${ids.join(', ')}`);

// Preset-specific structural checks: the row that carries an agent-preset decl.
for (const entry of doc) {
  for (const row of entry?.insert ?? []) {
    const c = row.config;
    if (!c || typeof c !== 'object') continue;
    if (!('plugins' in c)) continue;
    const problems = [];
    if (!c.id) problems.push('config.id missing');
    if (!Array.isArray(c.plugins)) problems.push('config.plugins is not an array');
    else {
      const seen = new Set();
      for (const p of c.plugins) {
        if (!p.id) problems.push(`a plugin row has no id (name=${p.name})`);
        if (!p.name) problems.push(`plugin row "${p.id}" has no name`);
        if (p.id && seen.has(p.id)) problems.push(`duplicate plugin id "${p.id}"`);
        if (p.id) seen.add(p.id);
      }
      console.log(`  preset "${c.id}": ${c.plugins.length} plugin rows, ${c.plugins.filter((p) => p.disabled === true).length} hard-disabled`);
    }
    if (problems.length) {
      console.error(`PRESET FAIL row ${row.id}:\n  - ${problems.join('\n  - ')}`);
      process.exit(1);
    }
  }
}

process.exit(0);
