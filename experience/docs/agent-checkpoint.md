# Agent checkpoint · Explore and Together homepage

2026-10-16 · Lead owns integration, commits and publication.
**State: quality fixes are published and source is synchronized through `54fdbaf`. Final full original-walk regression and CI are running. Q03's latency target remains open. Backend tests stay in this workspace.**

## Resume from saved work

- Workspace: `/workspace/TourGuideAI`; source branch: `chore-sow-delivery-plan`.
- Quality runtime: `828a405194d82e465887b15c8bcaedfaa3d04f9d`.
  [Sprint plan](sprint-quality-20261016.md) was issued and pushed as `a834cc5`
  before implementation. Pages runtime commit is `c3bcceb` and package manifest is
  `8751ba4ecb6f6fcec70d1c2d25cff41b074671ea4433d3bf5b4a087ac810d2fb`.
  [CI for the preceding runtime](https://github.com/PaperStrange/TourGuideAI/actions/runs/38847943226)
  passes perspective/travel. Its homepage failure identified the search-grid sizing
  issue repaired in `d21c708`; the original walk passed 69 checks before a stale
  localized-credits selector prevented a click. The driver is repaired and its
  focused credits/attribution/return checks pass 3/3. [Final source CI](https://github.com/PaperStrange/TourGuideAI/actions/runs/38851871150)
  runs on `54fdbaf9bed4328e36a70aeee23e73d0d4aed564`; it is currently in progress.
- Candidate fixes preserve locale and route origin, restore phone navigation,
  constrain the phone scene width, load the street engine on demand, suspend hidden
  scene updates, and provide map/lighting recovery. The approved model, photographic
  environments and architectural profile are retained. Full EN/ZH desktop/phone
  walkthrough passes 264 checks on package `6cdc0ad9`. The CSS repair passes six
  matching-browser layout stages. Final startup package `8751ba4e` passes 65 homepage,
  8 startup interaction and 19 original-walk pause/appearance checks. Unit/service
  suites pass 89/13. CI perspective 80/80 and travel 73/73 are preceding-runtime
  results; their asset binding applies to the CSS package `9a55e7b5`.
  [Quality evidence](../evidence/quality-20261016/README.md) records the separate
  conditions. The preceding CSS publication matches all 79 files and passes 38
  hosted connection, 21 homepage/phone and 9 navigation checks. Final startup
  publication also matches all 79 files and passes 21 actual hosted homepage/phone
  checks. All 12 final timing observations use the published bytes and record no
  failed requests or page exceptions. Together street payload and hidden updates/
  draws are zero; Explore draws once at startup. Warm Together locale actions
  take 1177.8 / 1113.4 / 1134.5 ms and miss the unchanged <500 ms target. Q03 remains
  open P1. Retain functional fixes; investigate the remaining delay before broader
  expansion. The original baseline remains faster for warm Explore readiness.
- Current milestone starts from checkpoint commit `3794918`.
- Local connection runtime: `bdc85fd4cd5dd90f390f042c0112b8d80fc19768`;
  verified Pages runtime: `53cf8647a46d365bf2b7774e0971d9bcd24b1711`;
  Pages verification metadata: `ad9fc10d6b90ca824fd8203cba1cff8b33366665`.
- Homepage baseline: `c3bf2309329eb1ff212f14d3e24697f38d98a23d`;
  baseline Pages: `eb8647d622d983280fba08fe9c23752aac1e81a4`;
  art refinement: `2767263`.
  [Homepage evidence](../evidence/homepage-20261015/README.md).
- Latest direction: keep testing on our own computer, plan the next sprint using
  agile project management, then perform a thorough walkthrough. The user reports
  fluent interaction alongside old links, latency and misleading/mixed-language
  descriptions. Make routine product decisions independently; do not ask the user
  to identify the defects. Building realism, lighting and useful travel remain
  core product challenges. No public tunnel or paid service is authorized for this sprint.
- Local service runs on loopback port 8787 with durable ignored SQLite storage
  and the exact Pages origin allowed. Continue same-computer browser testing;
  the user chose this path after the previous tunnel proposal. No public
  forwarding endpoint exists.
- Repeatable setup: `npm ci` then `npm run local:pages` in `experience/server`.
  [Local guide](../server/docs/local-pages.md). The current workspace process uses
  ignored `server/.data/local-test.sqlite`; the launcher default is
  `server/.data/rooms.sqlite`. Recheck the process before resuming; no availability
  beyond the execution environment's lifetime is promised.
- Together's **Testing connection** supports an explicitly chosen HTTPS or
  loopback HTTP endpoint and live or periodic updates. Selection stays in the
  tab. Member credentials are endpoint-scoped; unfamiliar invitations require
  confirmation before any token-bearing request. Endpoint changes clear the
  active invitation and cancel pending room operations. Existing journey saves
  are retained. AI remains unavailable without a configured model provider.
- Previously released companion application: `a8c3e493058198e8e5012bc9fd470190dc358148`.
- Previous Pages: `6b5b1ea41a658badc8d364ad2267d07028b8fdbe`; publication worktree:
  `/workspace/TourGuideAI-pages`, branch `publish-travel-20261015`.
- Released companion entry: [travel.html](https://paperstrange.github.io/TourGuideAI/travel.html).
  [Review instructions](../../PREVIEW.md) and [evidence](../evidence/travel-20261015/README.md).
- Resume from the recorded release and inspect the working tree for current changes.
- Node 24.19 and dependencies are available at this checkpoint. Recheck on another
  environment rather than assuming installed tools or scratch evidence persisted.

The user authorized a homepage with Explore and Together, selected a small hosted
backend and requested synchronized commits/checkpoints. Continue that work within
the agreed scope. SOW remains initial guidance. Historical closed reviewers are
not active team members.

## Approved scope and present limits

The [homepage brief](homepage-journeys.md) defines the new release criteria:
Explore searches a real place, opens its available scene/map and suggests sourced
local stops. Together uses invitation-based rooms for participants' dream countries
or cities, a shared world map, local views and reviewed journey proposals. The
backend provides persisted room state, revision-checked edits, streamed updates
and a configured-model planning endpoint. Shared activity means intentional room
contributions and selected views; it carries no physical-location presence claim.

Building realism and day/night remain priorities. Detailed Kyoto and wider 3D-map
coverage must be labelled according to the delivered geometry. Source-informed
place order, externally computed directions and model-generated proposals retain
their different meanings. Hosted API availability and model readiness remain
pending verification; the homepage reads actual service capabilities.

The existing `travel.html` companion retains Google Maps directions, optional
manual My Maps CSV import and explicit foreground location. Its independent saved
selections/meaningful marks and old query links must remain usable. The original
Kyoto walk moves to `walk.html`; legacy `index.html?lighting=…` links must reach it.
Existing perspective and recap links keep their recipient behavior and saves.

Location starts explicitly, pauses when hidden and requires Resume when visible
again. No background tracking, stored/uploaded GPS history or automatic visit marks.
Directions represent Google-computed routes through selected places, not a person's
recorded movement. Planned places, personal significance, virtual moments and
user-reported real visits must remain distinct.

The broader **Find your own place** experiment is still proposed: continuous world
response, deliberate personal approach/pause/view, and a recipient who can inhabit
the moment. This milestone neither delivers replay nor settles emotional value.
The new search/map scope does not complete that emotional-expression experiment.
Ginza remains a separate architectural study.

## Active owners and next actions

| Owner | Current boundary | Next action |
|---|---|---|
| Lead | Integration, checkpoint, release | Complete publication evidence and source synchronization; carry the explicit Q03 latency limit |
| Engineering | Runtime loading/pause, map and performance | Final matched timing; investigate remaining latency without reducing art detail |
| World-content | Navigation, language and source meanings | Completed locale/link audit; next review recognizable building references and source quality |
| QA-release | Browser drivers and independent walkthrough | Complete final original-walk regression and actual published homepage verification |
| Product-design | Sprint plan, delivery board and lean iteration | Record delivered scope and open latency target; use Sprint 2A/2B experiential exits |
| Art/UX | Detailed Kyoto appearance and visual review | Retained day/night art reviewed; next compare identifiable facade cues and coherent lighting |

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

Check the service and independent application. The homepage browser suite starts
an isolated real SQLite service and serves an immutable build snapshot internally;
no shared API process or preview server is required for that suite.

```sh
cd /workspace/TourGuideAI/experience/server
npm ci --cache /workspace/.npm-cache
npm test
cd /workspace/TourGuideAI/experience
npm ci --cache /workspace/.npm-cache
npm test
npm run build
export TMPDIR=/workspace/TourGuideAI/artifacts/homepage-qa/tmp
export PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright
mkdir -p "$TMPDIR"
EXPERIENCE_QA_CHROMIUM=/usr/bin/chromium EXPERIENCE_QA_OUTPUT=/workspace/TourGuideAI/artifacts/homepage-qa/browser node tests/browser-homepage.mjs dist
npm run test:travel -- dist
EXPERIENCE_QA_TIMEOUT=600000 npm run test:perspective -- dist
EXPERIENCE_QA_TIMEOUT=600000 npm run test:browser -- dist
cd /workspace/TourGuideAI
node iteration/tools/run-gates.mjs
```

The matching Playwright Chromium is installed at the browser path above. On a fresh
environment install it with `npm exec --cache /workspace/.npm-cache -- playwright install chromium`
using the same `PLAYWRIGHT_BROWSERS_PATH`. Coordinate GPU-heavy suites with QA.

## Current release checks

The published homepage baseline passes 65 browser checks, 82 unit tests, 7 server
checks, 11 client integration checks and 17 repository gates. The Docker service
retains room state across restart. All 80 published files match the tested hashes.
Evidence lives in `experience/evidence/homepage-20261015/`. The local connection
increment passes 37 candidate and 38 actual published-page browser checks, 87 unit tests, 13 service tests and
17 repository gates; its evidence lives in that directory's `local-pages/` folder.
Candidate tests use real loopback APIs and candidate frontend bytes served under
the Pages origin. The published run uses actual HTTPS assets with two loopback
APIs; all 112 captured static responses match. A separate comparison verifies all
80 published files. Browser local-network permission was granted by automation;
manual permission UX and physical-device access remain untested.
The font includes all known homepage and companion copy with no missing glyphs.
No model call or public room-service availability has been established. Do not
include service secrets or participant credentials in the checkpoint.

## Previous companion release evidence

The companion passes **73/73 browser checks**, the application passes **74/74 unit
tests**, and **17/17 repository gates** pass. The final companion report is
`experience/evidence/travel-20261015/final/travel-result.json`; its package manifest
is `6a4f5b2f11d67153058305d73ffc715d3dd7bdd5c16531bd2a89b2a933fe0608`.
The original walk passes 130 checks, perspective passes 80, and focused sharing
passes 24. Their resource bindings match the final package. All 63 hosted files
match, and [CI run 38779049743](https://github.com/PaperStrange/TourGuideAI/actions/runs/38779049743)
succeeds for all three runtime jobs. That companion release has synchronized source
and Pages records.

Completed companion evidence is in `experience/evidence/travel-20261015/`, for runtime
`a8c3e49`. These results do not validate the homepage changes. Physical review covers
GPS, permission/OS sharing behavior, Google directions and My Maps import on actual
devices. The next product discussion concerns the proposed continuous exploration
and meaningful-moment experience, beyond this practical handoff.

Commit and push coherent reviewable increments; do not leave the milestone only
in scratch files or process memory. Finish with source/Pages identities and explicit
remaining limits. Simulated browser location is not a physical field trial, and
technical delivery is not acceptance of enjoyment, emotional expression or utility.
