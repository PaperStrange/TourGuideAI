# Agent checkpoint · travel companion

2026-10-15 · Lead owns integration, commits and publication.
**State: milestone technically delivered, published and verified. Physical field review remains open.**

## Resume from saved work

- Workspace: `/workspace/TourGuideAI`; source branch: `chore-sow-delivery-plan`.
- Starting source: `23171a05413cd41bb5cacc493a85c7b1e5726ee7`, a documentation update.
- Foundations and focused tests pushed: `6452aae90d1e1c8c882cf953eacd0b474101e827`.
- Released application: `a8c3e493058198e8e5012bc9fd470190dc358148`.
- Pages: `6b5b1ea41a658badc8d364ad2267d07028b8fdbe`; publication worktree:
  `/workspace/TourGuideAI-pages`, branch `publish-travel-20261015`.
- Live entry: [travel.html](https://paperstrange.github.io/TourGuideAI/travel.html).
  [Review instructions](../../PREVIEW.md) and [evidence](../evidence/travel-20261015/README.md).
- The implementation and verification are saved in files and commits. Resume from
  these records; the preceding unavailable environment's process memory is unnecessary.
- Node 24 and dependencies are available at this checkpoint. Recheck on another
  environment rather than assuming installed tools or scratch evidence persisted.

The user authorized continuing the Maps/location feature and requested revised
agent checkpoints and synchronized commits. Continue that work without reopening
the same permission question. SOW is initial guidance, not a restriction on further
product discovery. Historical closed reviewers are not active team members.

## Approved scope and present limits

Delivered `travel.html`: selected ordered places → Google Maps directions, optional
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
| Lead | Companion entry/UI/integration/copy, package/CI/navigation, release evidence and publication | Complete: source/Pages pushed and hosted bytes verified; maintain release record |
| Engineering | Foreground location module and its unit tests | Complete: 20 focused tests and integration review |
| World-content | `src/travel/places.js`, `maps.js`, `state.js`; `tests/travel-maps.test.mjs` | Complete: sourced references, all-stop export and 10 focused tests |
| QA-release | `tests/browser-travel.mjs` | Complete: 73 packaged-browser checks, EN/ZH captures, recovery, export and save isolation |
| Product-design | This checkpoint, `docs/travel-companion.md`, small current-milestone updates to lean plan/delivery board | Complete; next research concerns field usefulness and emotional expression |
| Art/UX | EN/ZH phone/desktop and location-state capture review | Complete: seven captures reviewed; Chinese map-label repair verified |

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

Run from the independent application. The direct equivalent of `test:travel` is
`node tests/browser-travel.mjs dist`.
QA serves an immutable build snapshot internally; no preview server is needed.

```sh
cd /workspace/TourGuideAI/experience
npm ci --cache /workspace/.npm-cache
npm test
npm run build
export TMPDIR=/workspace/TourGuideAI/artifacts/travel-tmp
export PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright
mkdir -p "$TMPDIR"
EXPERIENCE_QA_OUTPUT=/workspace/TourGuideAI/artifacts/travel-qa npm run test:travel -- dist
EXPERIENCE_QA_TIMEOUT=600000 npm run test:perspective -- dist
EXPERIENCE_QA_TIMEOUT=600000 npm run test:browser -- dist
cd /workspace/TourGuideAI
node iteration/tools/run-gates.mjs
```

The matching Playwright Chromium is installed at the browser path above. On a fresh
environment install it with `npm exec --cache /workspace/.npm-cache -- playwright install chromium`
using the same `PLAYWRIGHT_BROWSERS_PATH`. Coordinate GPU-heavy suites with QA.

## Completion record

The companion passes **73/73 browser checks**, the application passes **74/74 unit
tests**, and **17/17 repository gates** pass. The final companion report is
`experience/evidence/travel-20261015/final/travel-result.json`; its package manifest
is `6a4f5b2f11d67153058305d73ffc715d3dd7bdd5c16531bd2a89b2a933fe0608`.
The original walk passes 130 checks, perspective passes 80, and focused sharing
passes 24. Their resource bindings match the final package. All 63 hosted files
match, and [CI run 38779049743](https://github.com/PaperStrange/TourGuideAI/actions/runs/38779049743)
succeeds for all three runtime jobs. Source and Pages are synchronized.

Completed evidence is in `experience/evidence/travel-20261015/`. The runtime source
remains `a8c3e49`; subsequent documentation and test-evidence commits do not change
the hosted application. No implementation blocker remains. Physical review covers
GPS, permission/OS sharing behavior, Google directions and My Maps import on actual
devices. The next product discussion concerns the proposed continuous exploration
and meaningful-moment experience, beyond this practical handoff.

Commit and push coherent reviewable increments; do not leave the milestone only
in scratch files or process memory. Finish with source/Pages identities and explicit
remaining limits. Simulated browser location is not a physical field trial, and
technical delivery is not acceptance of enjoyment, emotional expression or utility.
