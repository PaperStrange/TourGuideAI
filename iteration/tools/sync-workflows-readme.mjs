// Reconcile the workflows README with the workflow set that actually exists on a branch.
//
// Why this exists: R2 of check-repo-hygiene.mjs asserts the README matches the .yml files
// on disk, and that set DIFFERS PER BRANCH. master carries mvp-release.yml (the MVP
// deployment pipeline, triggered on the mvp-release branch) and iteration does not;
// iteration carries fact-integrity.yml, which master lacked until this release. Two
// hand-kept lists would drift on the first edit, which is the defect class R2 exists for.
//
// The table lives between BEGIN/END markers so regeneration is exact.
// Usage: node iteration/tools/sync-workflows-readme.mjs [--check]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO = resolve(import.meta.dirname, '../..');
const WF = join(REPO, '.github', 'workflows');
const README = join(WF, 'README.md');
const CHECK = process.argv.includes('--check');
const BEGIN = '<!-- BEGIN GENERATED WORKFLOW TABLE -->';
const FINISH = '<!-- END GENERATED WORKFLOW TABLE -->';

if (!existsSync(README)) { console.error('ENV  no workflows README'); process.exit(2); }
const actual = readdirSync(WF).filter((n) => n.endsWith('.yml')).sort();

// One row per workflow, keyed by filename. A workflow with no entry renders as UNKNOWN
// rather than disappearing, so adding a file forces a description instead of silently
// shrinking the documentation.
const ROWS = {
  'fact-integrity.yml': [
    'push/PR → `master` `iteration` `release-*`, limited to `city-packs/**`, `iteration/**`, `dsh-bundle/tools/**`; + `workflow_dispatch`',
    '**Fact-integrity gates**: runs `iteration/tools/run-gates.mjs`. See below',
  ],
  'ci-cd.yml': [
    'push/PR → `master` `iteration` `feat-*` `release-*`; + `workflow_dispatch`',
    'Infrastructure-aware build and test; its `build-and-test` job is one of the checks branch protection requires',
  ],
  'e2e-tests.yml': [
    'Mon/Thu schedule + PR; + `workflow_dispatch`',
    'End-to-end tests',
  ],
  'security-scan.yml': [
    'weekly schedule + push → `master` `release-*`, limited to source and `package*.json`',
    'Security scan; `security-scan` is one of the checks branch protection requires',
  ],
  'stability-tests.yml': [
    'Wed schedule + PR (limited to `src/**`); + `workflow_dispatch`',
    'Stability and load tests',
  ],
  'dependency-updates.yml': [
    'Mon schedule; + `workflow_dispatch`',
    'Dependabot metadata',
  ],
  'branch-protection.yml': [
    'Mon schedule; + `workflow_dispatch`',
    'Configures branch protection for `master` / `iteration` / `release-*` via `gh api`',
  ],
  'mvp-release.yml': [
    'push → `mvp-release` `release/mvp-*`; PR → `mvp-release`; + `workflow_dispatch`',
    'MVP deployment pipeline (railway / vercel / heroku). **Present on `master` only** — `iteration` has neither the branch nor this workflow',
  ],
};

const table = [
  '| File | Trigger | Purpose |',
  '|---|---|---|',
  ...actual.map((f) => {
    const r = ROWS[f] ?? ['UNKNOWN — describe it', 'UNKNOWN — no entry in sync-workflows-readme.mjs'];
    return `| **${f}** | ${r[0]} | ${r[1]} |`;
  }),
].join('\n');

const text = readFileSync(README, 'utf8');
let updated;
if (text.includes(BEGIN) && text.includes(FINISH)) {
  updated = text.replace(new RegExp(`${BEGIN}[\\s\\S]*?${FINISH}`), `${BEGIN}\n${table}\n${FINISH}`);
} else {
  // First run: replace the hand-written table, header row through the blank line after it.
  const re = /\| File \| Trigger \| Purpose \|[\s\S]*?\n\n/;
  if (!re.test(text)) {
    console.error('could not find an existing workflow table; add the BEGIN/END markers by hand once');
    process.exit(3);
  }
  updated = text.replace(re, `${BEGIN}\n${table}\n${FINISH}\n\n`);
}

if (updated === text) {
  console.log(`OK - workflows README already lists all ${actual.length} workflows: ${actual.join(', ')}`);
  process.exit(0);
}
if (CHECK) {
  console.error(`workflows README is stale; ${actual.length} workflows on disk, table not in sync.`);
  process.exit(1);
}
writeFileSync(README, updated, 'utf8');
console.log(`updated workflows README for ${actual.length} workflows: ${actual.join(', ')}`);
