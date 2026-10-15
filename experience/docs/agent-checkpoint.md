# Agent checkpoint · travel companion

2026-10-15 · Lead owns integration, commits and publication.
**State: implementation in progress; this milestone is not yet verified or hosted.**

## Resume from saved work

- Workspace: `/workspace/TourGuideAI`; source branch: `chore-sow-delivery-plan`.
- Starting source: `23171a05413cd41bb5cacc493a85c7b1e5726ee7`, a documentation update.
- Previously released application: `f701bda`; Pages:
  `89ff73ea3577721e6a5aab312b6814dd6d65ee5c`. See [existing review entry](../../PREVIEW.md).
- The preceding environment was unavailable and in-memory work was not committed.
  The team is recreating that implementation in this workspace. Only saved files,
  commits and linked evidence establish recoverable progress.
- Node 24 and dependencies are available at this checkpoint. Recheck on another
  environment rather than assuming installed tools or scratch evidence persisted.

The user authorized continuing the Maps/location feature and requested revised
agent checkpoints and synchronized commits. Continue that work without reopening
the same permission question. SOW is initial guidance, not a restriction on further
product discovery. Historical closed reviewers are not active team members.

## Approved scope and present limits

Implement `travel.html`: selected ordered places → Google Maps directions, optional
manual My Maps CSV import, and explicit foreground location for nearby context.
English/Chinese, phone layout and the three existing Kyoto place references are
in scope. [Companion behavior](travel-companion.md) records export and location rules.

Location starts explicitly, pauses when hidden and requires Resume when visible
again. No background tracking, stored/uploaded GPS history or automatic visit marks.
Directions represent Google-computed routes through selected places, not a person's
recorded movement. Planned places, personal significance, virtual moments and
user-reported real visits must remain distinct.

The broader **Find your own place** experiment is still proposed: continuous world
response, deliberate personal approach/pause/view, and a recipient who can inhabit
the moment. This milestone neither delivers replay nor settles emotional value.
No new scene, destination, public feed, Google account integration or field success
is claimed. Ginza remains a separate architectural study.

## Active owners and next actions

| Owner | Current boundary | Next action |
|---|---|---|
| Lead | Companion entry/UI/integration/copy, package/CI/navigation, release evidence and publication | Integrate agreed modules; review EN/ZH and state boundaries; commit coherent slices; publish verified bytes |
| Engineering | Foreground location module and its unit tests | Finish explicit start, accuracy/freshness, hidden-page cleanup and explicit resume behavior |
| World-content | `src/travel/places.js`, `maps.js`, `state.js`; `tests/travel-maps.test.mjs` | Source place references; preserve selection order and every stop across bounded links/CSV; isolate companion state |
| QA-release | `tests/browser-travel.mjs` | Independently exercise built EN/ZH phone/desktop flow, permissions, failures, export and regression boundaries |
| Product-design | This checkpoint, `docs/travel-companion.md`, small current-milestone updates to lean plan/delivery board | Keep implementation, evidence and human acceptance separate; hand final status update to lead |

Paths in the ownership table are relative to `experience/`. Do not edit another
owner's files; report interface conflicts to that owner. Preserve unrelated changes.

## Exact local resume and verification commands

Inspect before editing or rebuilding:

```sh
cd /workspace/TourGuideAI
git status --short
git branch --show-current
git log -3 --oneline
git diff --stat
node --version
```

After integration is ready, run from the independent application. The lead is
adding `test:travel`; the direct equivalent is `node tests/browser-travel.mjs dist`.
QA serves an immutable build snapshot internally; no preview server is needed.

```sh
cd /workspace/TourGuideAI/experience
npm ci
npm test
npm run build
EXPERIENCE_QA_CHROMIUM=/usr/bin/chromium EXPERIENCE_QA_OUTPUT=/workspace/scratch/travel-qa-20261015 npm run test:travel -- dist
EXPERIENCE_QA_CHROMIUM=/usr/bin/chromium npm run test:perspective -- dist
EXPERIENCE_QA_CHROMIUM=/usr/bin/chromium npm run test:browser -- dist
cd /workspace/TourGuideAI
node iteration/tools/run-gates.mjs
```

The Chromium path above exists in this environment. On a fresh environment install
the repository's Playwright browser/prerequisites or supply the available executable.
Do not run competing browser suites on the shared GPU; coordinate with QA.

## Completion record to fill from actual evidence

At this checkpoint, companion implementation, final unit/browser checks, source
push, hosted package verification and physical review are **pending**. Old test
counts belong to the old release and cannot validate these changes.

The lead closes technical delivery only after recording the tested source commit,
unit and packaged-browser results, EN/ZH captures, built-file hashes, pushed source
and Pages commit, and successful comparison of hosted files with the tested package.
Planned evidence directory: `experience/evidence/travel-20261015/`; do not treat that
path as a completed report until it exists. Update this checkpoint, the companion
record, lean plan, delivery board and `PREVIEW.md` to the same delivered state.

Commit and push coherent reviewable increments; do not leave the milestone only
in scratch files or process memory. Finish with source/Pages identities and explicit
remaining limits. Simulated browser location is not a physical field trial, and
technical delivery is not acceptance of enjoyment, emotional expression or utility.
