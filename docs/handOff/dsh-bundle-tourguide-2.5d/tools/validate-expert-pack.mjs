// Validates an expert/team directory against the EXACT constraints enforced by
// @weibaohui/experts-management (mirrored from its src/index.js create endpoint
// and parsePluginJson). Run: node validate-expert-pack.mjs <expert-dir>
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: node validate-expert-pack.mjs <expert-dir>'); process.exit(10); }

// Mirrored constants — see experts-management/src/index.js
const KEBAB_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const AGENT_FILE_RE = /^agents\/[A-Za-z0-9][A-Za-z0-9._-]*\.md$/;
const MD_MAX_CHARS = 512 * 1024;
const EXPERT_NAME_PREFIX = 'expert-';
const PLUGIN_JSON_REL = '.codebuddy-plugin/plugin.json';

const fails = [];
const warns = [];
const oks = [];
const bad = (m) => fails.push(m);
const ok = (m) => oks.push(m);

// ── 1. manifest present + parses ────────────────────────────────────────────
const manifestPath = join(dir, PLUGIN_JSON_REL);
if (!existsSync(manifestPath)) { console.error(`FAIL: missing ${PLUGIN_JSON_REL}`); process.exit(20); }
let plugin;
try { plugin = JSON.parse(readFileSync(manifestPath, 'utf8')); }
catch (e) { console.error(`FAIL: plugin.json is not valid JSON — ${e.message}`); process.exit(20); }
ok('plugin.json present and parses');

// ── 2. name: kebab, and the /expert-<name> gesture must be registerable ─────
const name = typeof plugin.name === 'string' ? plugin.name : '';
if (!KEBAB_NAME_RE.test(name)) bad(`name must be lowercase kebab-case, got '${name}'`);
else if (!KEBAB_NAME_RE.test(EXPERT_NAME_PREFIX + name)) bad(`candidate '${EXPERT_NAME_PREFIX}${name}' fails the registry regex`);
else ok(`name '${name}' -> gesture /${EXPERT_NAME_PREFIX}${name}`);

// ── 3. expertType ───────────────────────────────────────────────────────────
if (plugin.expertType !== 'agent' && plugin.expertType !== 'team') bad(`expertType must be 'agent' or 'team', got '${plugin.expertType}'`);
else ok(`expertType = ${plugin.expertType}`);

// ── 4. non-empty describe() (registry silently skips empty ones) ────────────
const hasText = (v) => typeof v === 'string' && v.trim() !== '';
const loc = (o, k1, k2) => (o && typeof o === 'object' ? (o[k1] ?? (k2 ? o[k2] : undefined)) : undefined);
const describeOk =
  hasText(plugin.description) ||
  hasText(loc(plugin.profession, 'zh', 'en')) ||
  hasText(loc(plugin.displayDescription, 'zh', 'en'));
if (!describeOk) bad('needs non-empty description/profession/displayDescription (registry skips empty ones)');
else ok('describe() non-empty');

// ── 5. agents files: exist, regex-valid, unique stems, within size ──────────
const list = Array.isArray(plugin.agents) ? plugin.agents.map(String) : [];
if (list.length === 0) bad('agents must be a non-empty array');
if (list.length > 20) bad(`agents supports at most 20 files, got ${list.length}`);
const stems = new Set();
const seen = new Set();
const agentTexts = new Map();
for (const rel of list) {
  const file = rel.replace(/^\.\//, '');
  if (!AGENT_FILE_RE.test(file)) { bad(`invalid agent file path: '${rel}' (expected agents/<id>.md)`); continue; }
  if (seen.has(file)) { bad(`duplicate agent file: '${file}'`); continue; }
  seen.add(file);
  const p = join(dir, file);
  if (!existsSync(p)) { bad(`declared agent file missing on disk: ${file}`); continue; }
  const text = readFileSync(p, 'utf8');
  if (text.trim() === '') bad(`agent file '${file}' content is empty`);
  if (text.length > MD_MAX_CHARS) bad(`agent file '${file}' exceeds ${MD_MAX_CHARS} chars`);
  agentTexts.set(file, text);
  stems.add(basename(file).replace(/\.md$/, ''));
}
if (stems.size) ok(`${stems.size} agent file(s) present, unique, within size limit`);

// ── 6. team wiring: leadAgent must match an agent file stem ─────────────────
const ti = plugin.teamInfo && typeof plugin.teamInfo === 'object' ? plugin.teamInfo : {};
if (plugin.expertType === 'team') {
  const lead = typeof ti.leadAgent === 'string' ? ti.leadAgent : '';
  if (!stems.has(lead)) bad(`teamInfo.leadAgent '${lead || '(missing)'}' must match one of the agents files`);
  else ok(`leadAgent '${lead}' matches an agent file`);
  const ma = Array.isArray(ti.memberAgents) ? ti.memberAgents.map(String) : [];
  for (const m of ma) if (!stems.has(m)) bad(`teamInfo.memberAgents lists '${m}' with no matching agent file`);
  const covered = new Set([lead, ...ma]);
  const uncovered = [...stems].filter((s) => !covered.has(s));
  if (uncovered.length) bad(`agent file(s) not referenced by teamInfo: ${uncovered.join(', ')}`);
  if (stems.size && !uncovered.length) ok(`all ${stems.size} agents referenced by leadAgent + memberAgents`);

  // members[] display rows should agree with the agent files
  const members = Array.isArray(plugin.members) ? plugin.members : [];
  if (members.length !== stems.size) warns.push(`members[] has ${members.length} rows but there are ${stems.size} agent files`);
  for (const m of members) {
    if (!stems.has(String(m.id || ''))) bad(`members[] lists id '${m.id}' with no matching agent file`);
  }
  const leads = members.filter((m) => m.role === 'lead');
  if (leads.length !== 1) warns.push(`members[] should have exactly one role:"lead", found ${leads.length}`);
  ok('members[] cross-checked against agent files');
}

// ── 7. frontmatter of every agent md ───────────────────────────────────────
const REQUIRED_FM = ['name', 'description', 'color', 'emoji', 'vibe'];
for (const [file, text] of agentTexts) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') { bad(`${file}: missing YAML frontmatter opening '---'`); continue; }
  const end = lines.indexOf('---', 1);
  if (end < 0) { bad(`${file}: frontmatter not closed`); continue; }
  const fm = lines.slice(1, end).join('\n');
  for (const key of REQUIRED_FM) {
    if (!new RegExp(`^${key}:\\s*\\S`, 'm').test(fm)) bad(`${file}: frontmatter missing '${key}'`);
  }
  const fmName = (fm.match(/^name:\s*(\S+)/m) || [])[1];
  const stem = basename(file).replace(/\.md$/, '');
  if (fmName !== stem) bad(`${file}: frontmatter name '${fmName}' != file stem '${stem}'`);
}
if (agentTexts.size) ok(`frontmatter checked (${REQUIRED_FM.join(', ')}) on every agent file`);

// ── 8. declared skills must exist (dangling ones would break the pack) ─────
const skills = Array.isArray(plugin.skills) ? plugin.skills.map(String) : [];
for (const s of skills) {
  const p = join(dir, s.replace(/^\.\//, ''));
  if (!existsSync(p) || !statSync(p).isDirectory()) bad(`declared skill dir missing: ${s}`);
}
if (!skills.length) ok('no skills declared (nothing dangling)');
else if (!fails.some((f) => f.includes('declared skill'))) ok(`${skills.length} declared skill dir(s) exist`);

// ── 9. stray files that do not belong in a pack ────────────────────────────
const top = readdirSync(dir, { withFileTypes: true }).map((e) => e.name);
const allowedTop = new Set(['.codebuddy-plugin', 'agents', 'skills', 'avatars', 'README.md', '.downloaded_at']);
const stray = top.filter((t) => !allowedTop.has(t));
if (stray.length) warns.push(`unexpected top-level entries: ${stray.join(', ')}`);

// ── report ─────────────────────────────────────────────────────────────────
console.log(`expert-pack validation — ${name || '(unnamed)'}`);
console.log(`  dir: ${dir}\n`);
for (const o of oks) console.log(`  OK    ${o}`);
for (const w of warns) console.log(`  WARN  ${w}`);
for (const f of fails) console.log(`  FAIL  ${f}`);
console.log(`\n  ${oks.length} ok, ${warns.length} warn, ${fails.length} fail`);
process.exit(fails.length ? 1 : 0);
