// End-to-end discovery check: replicates experts-management's
// scanExpertsRoot -> readExpertDir -> parsePluginJson -> provider list() path
// and reports exactly what the Expert Manager and the /expert- gesture would see.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const HOME = process.env.DSH_HOME || join(process.env.USERPROFILE || '', '.dsh');
const installedDir = join(HOME, 'experts');
const EXPERT_NAME_PREFIX = 'expert-';
const KEBAB_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PLUGIN_JSON_REL = '.codebuddy-plugin/plugin.json';
const BUILTIN_SCAN_SKIP = new Set(['.git', 'node_modules']);
const RANK_INSTALLED = 100;

// Mirror of parsePluginJson's localized() helper: prefer zh, fall back to en.
const localized = (o, k1, k2) => {
  if (o === null || typeof o !== 'object') return typeof o === 'string' ? o : undefined;
  const v = o[k1] ?? (k2 ? o[k2] : undefined);
  return typeof v === 'string' ? v : undefined;
};

const rows = [];
const errors = [];
for (const entry of readdirSync(installedDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  if (BUILTIN_SCAN_SKIP.has(entry.name)) continue;
  const dir = join(installedDir, entry.name);
  try {
    const pj = join(dir, PLUGIN_JSON_REL);
    const raw = readFileSync(pj, 'utf8');
    const p = JSON.parse(raw);
    const name = String(p.name || '');
    if (name === '') throw new Error('plugin.json missing name');
    const expertType = p.expertType === 'team' ? 'team' : 'agent';
    const ti = p.expertType === 'team' && p.teamInfo && typeof p.teamInfo === 'object' ? p.teamInfo : {};
    const professionZh = localized(p.profession, 'zh', 'en');
    const descZh = localized(p.displayDescription, 'zh', 'en') ?? p.description;
    const describe = [professionZh, descZh].filter(Boolean).join(' · ');
    const candName = EXPERT_NAME_PREFIX + name;

    // Mirrors provider list()'s two silent-skip conditions.
    const skipped = [];
    if (!KEBAB_NAME_RE.test(candName)) skipped.push(`invalid candidate name '${candName}'`);
    if (describe === '') skipped.push('empty description');
    if (skipped.length) { errors.push(`${name}: ${skipped.join('; ')}`); continue; }

    // Resolve the injected role prompt: for teams the lead agent md.
    const lead = expertType === 'team' ? String(ti.leadAgent || '') : name;
    const leadPath = join(dir, 'agents', `${lead}.md`);
    if (!existsSync(leadPath)) throw new Error(`lead agent file missing: agents/${lead}.md`);

    rows.push({
      candName, name, expertType, rank: RANK_INSTALLED, dir, lead, leadPath,
      skillName: candName, path: leadPath,
      resourceBase: dir,
      invocation: { modelInvocable: false, userInvocable: true },
      metadata: { expertType, profession: professionZh, version: p.version },
      displayNameZh: localized(p.displayName, 'zh', 'en'),
      members: expertType === 'team'
        ? [{ id: lead, role: 'lead' }, ...(Array.isArray(ti.memberAgents) ? ti.memberAgents.map((m) => ({ id: m, role: 'member' })) : [])]
        : [],
      roleBytes: readFileSync(leadPath, 'utf8').length,
    });
  } catch (e) {
    errors.push(`${entry.name}: ${e.message}`);
  }
}
rows.sort((a, b) => (a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1));

const teams = rows.filter((r) => r.expertType === 'team');
console.log(`discovery over ${installedDir}\n`);
console.log(`  discovered      : ${rows.length} expert(s)`);
console.log(`  teams           : ${teams.length}`);
console.log(`  errors          : ${errors.length}`);
for (const e of errors) console.log(`    ERR ${e}`);

console.log('\n  --- team(s) the Expert Manager "Mine" tab would list ---');
for (const t of teams) {
  console.log(`  name        : ${t.name}`);
  console.log(`  displayName : ${t.displayNameZh}`);
  console.log(`  profession  : ${t.metadata.profession}`);
  console.log(`  version     : ${t.metadata.version}`);
  console.log(`  dir         : ${t.dir}`);
  console.log(`  members     : ${t.members.length}  (${t.members.map((m) => `${m.id}[${m.role}]`).join(', ')})`);
  console.log(`  first agent : ${basename(t.leadPath)}  (${t.roleBytes} B role prompt)`);
}

console.log('\n  --- what the /expert- gesture would register ---');
for (const r of rows) {
  const tag = r.expertType === 'team' ? 'TEAM' : '    ';
  console.log(`  ${tag}  /${r.skillName}`);
}
const target = rows.find((r) => r.name === 'tourguide-reality-loop-team');
console.log(
  target
    ? `\n  RESULT: registered as /${target.skillName} — modelInvocable=${target.invocation.modelInvocable}, userInvocable=${target.invocation.userInvocable}`
    : '\n  RESULT: team NOT discovered',
);
process.exit(target && errors.length === 0 ? 0 : 1);
