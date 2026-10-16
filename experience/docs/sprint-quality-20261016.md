# Quality sprint · a clear, responsive travel journey

2026-10-16 · Functional corrections published; Q03 latency open at P1, Q00 final rerun pending.
Lead owns integration and the [checkpoint](agent-checkpoint.md). This plan records
the user's latest direction: continue testing inside the workspace, use no tunnel,
and address old links, high latency and misleading or mixed-language interface text.
The user found interactions fluent; this does not establish loading performance,
navigation clarity or acceptance of the wider experience.

## Sprint goal and scope

A person can explore a place or use an invited local room, understand what the
scene and route actually represent, and reach the appropriate supporting tool
without losing context, language or saved work. Waiting has visible progress and
recovery; improvements to latency have reproducible measurements.

Work from source `18bbeec` and record the exact tested build before any walkthrough.
The local room service remains in the workspace; the model is unconfigured.
No tunnel, paid host or model setup belongs to this sprint. Public Pages can remain
the distribution reference, but workspace validation does not establish remote
backend availability. Preserve Kyoto's building and day/night quality.

## Work sequence and review points

Use four focused working sessions as a proposed timebox, without calendar promises
or inferred team velocity. A session ends at its review point; unfinished evidence
stays visible rather than receiving a completion label.

1. **Inventory and baseline:** lead confirms this plan internally, walk the exact current build,
   record reproducible navigation/copy defects and performance traces. Exit with
   prioritized tickets, owners and a measured performance target for each experiment.
2. **Correct the journey:** resolve P0 issues and the highest-value P1 cause.
   Review concrete before/after paths, copy and trace evidence. Limit concurrent
   work to independently owned paths; root coordinates shared `main.js` edits.
3. **Integrated walkthrough:** run the matrix below on one frozen candidate;
   independently verify fixes, failures, return paths and state preservation.
4. **Review and handoff:** show the complete user journey, record remaining issues,
   update checkpoint/source evidence and decide whether the sprint goal is met.
   Publication, if performed by the lead, needs its own exact-byte verification.

## Ordered backlog

Priority indicates order and release consequence, not a promised number of sessions.
P0 blocks the relevant journey; P1 is required for this sprint's quality review;
P2 is explicitly deferred unless a baseline observation makes it necessary.

| Ticket | Priority / owner → reviewer | Concrete deliverable and acceptance | Dependency |
|---|---|---|---|
| Q00 · Restore trustworthy CI | P0 · QA + lead → engineering | Preserve failing homepage/original-walk job logs for `18bbeec`, reproduce the failing assertions and separate runtime defects from stale expectations. Repair the responsible cause and rerun affected browser checks on exact candidate bytes. A changed expectation requires observed behavior and its intended meaning; deleting or weakening a check does not establish a fix. | Existing failure logs; source diagnosis may precede browser baseline |
| Q01 · One understandable navigation system | P0 · Lead → product + QA | Inventory every visible destination and classify it as current homepage, supporting tool, historical comparison or external source. Labels explain the destination. Internal transitions retain locale and provide a usable return path. Existing `walk.html`, legacy `index.html?lighting=…`, companion selections, shared moments/recaps and invitations resolve with their original meaning. Private saves survive navigation and return. | Baseline link inventory; no blanket removal of old tools |
| Q02 · Complete locale and truthful claims | P0 · Lead + world-content → product + QA | EN and ZH each have complete headings, controls, status/error/help, accessible names and exported UI. Remove unintended bilingual editorial text. Distinguish authored street/3D map, curated/nearby orders, AI proposals and Maps navigation using the definitions below. Unconfigured model and disconnected room state stay explicit. | Copy/source inventory; shared terminology |
| Q03 · Responsive loading and recovery | P1 · Engineering → QA + art/UX | Measure shell, scene, map, discovery and room delays separately; fix a demonstrated cause and compare matching traces. Input, language/mode switching and cancellation remain usable during loading. Loading failures retain selections and allow a working retry or continued use. Preserve source attribution and appearance. | Recorded baseline and agreed experiment target; root integration |
| Q04 · Complete local group journey | P1 · Lead + engineering → QA + product | Two actual isolated clients create/join, add/remove wishes, select local views, receive SSE/poll updates, reload and reconnect. Fresh invites confirm service before token transmission. Service changes clear the active invitation and isolate credentials. AI remains honestly unavailable; no manufactured proposal is used to pass. | Q01/Q02; real local SQLite service |
| Q05 · Integrated regression and walkthrough | P1 · QA → lead + product + art/UX | Execute every applicable matrix cell against frozen bytes, record observations and defects with reproduction steps. Inspect matched day/night building features and material/shadow readability. Walk from a chosen place to a useful selected journey and its correct handoff; assess whether the result makes sense beyond completing controls. Supporting-page sharing and private-state isolation retain their behavior. Run affected unit/browser checks and required repository gates; no skipped critical path or unresolved P0. | Integrated Q00–Q04 candidate |
| Q06 · Larger emotional exploration / broader city content | P2 · Product → lead + user | Preserve the proposed experience backlog and its unanswered enjoyment/meaning questions. This sprint makes no claim of continuous replay, expanded navigation or real-world usefulness. | Separate future prioritization |

Product owns this plan and acceptance review. World-content supplies the link/source
inventory; art/UX reviews legibility, appearance and touch layout. Owners report
defects to the current file owner rather than editing the same file concurrently.

## Language and representation rules

- **UI locale:** headings, decorative slogans, instructions, tooltips, accessible
  labels, loading/error messages and app-authored export labels follow the selected
  language. The language switch itself may show “EN / 中文”. Switching preserves state.
- **Place identity:** Japanese world signs, proper names, original source titles,
  legal attribution and another participant's authored words retain their meaning.
  These are reviewed by role and provenance; a script-character scan alone cannot
  decide whether something is a leak. Do not invent translations of place facts.
- **Detailed Kyoto:** a rendered, authored interpretation grounded in source
  features. “Live” cannot imply a camera feed, current street activity or weather.
  Wider maps show provider geometry/coverage; another city's search cannot show
  Kyoto as that city's reconstruction. Day/night is authored appearance.
- **Curated Kyoto order:** the existing selected places arranged by the application.
  **Nearby order:** source-linked discoveries ordered by categories/proximity;
  coverage and reference coordinates do not establish entrances or access.
  **AI proposal:** only an actual configured-model result reviewed by the group;
  unavailable in this sprint's environment. **Google Maps directions:** Maps
  computes the route through selected places; no GPS path was recorded here.
- **Group activity:** wishes and last deliberately selected views are shared room
  contributions. They establish neither online presence nor a physical visit.

The source audit covers editorial headings, mode-group accessible names, scene
representation, route provenance and supporting-link destinations. The integrated
matrix and published checks below verify these corrections within their recorded
scope. Baseline CI failures included copy/lighting expectation drift and an actual
phone search-grid defect. Q00 still requires the final original-walk and CI reruns.

## Performance experiments and decision gates

Record build hashes, browser/version, viewport, renderer/hardware, network/cache
conditions, local API availability and provider failures with each trace. Capture
repeated cold and warm runs and retain individual values plus median/range; these
are engineering replications, not a user-study sample or production service level.

| Stage | Start → observable end | Separate evidence |
|---|---|---|
| Shell and first action | Navigation → controls visible/enabled → a click visibly changes state | Initial modules/bytes, long tasks and input-to-feedback delay |
| Detailed Kyoto | Scene request → first usable frame → walk/look/day-night response | Asset request/decode/compile costs and render scheduling; matched art frames |
| Wider map | Destination selected → relevant map and selectable places visible | Module/style/tile waits, animation and main-thread work |
| Discovery | Submit/select → pending indicator → result, empty state or recovery | Dispatch/queue/cache/HTTP/parse/render intervals; Photon/Wikipedia measured separately |
| Together | Local edit → acknowledged state → second client's visible state | API write/read/SSE delays; periodic updates identified by their configured cadence |

**Gate P1:** establish the slow stage before changing it. Engineering and lead record
the proposed target, affected user action and test conditions from this baseline.
No loading-time or frame-rate threshold is retroactively invented as a user promise.

**Gate P2:** retain an optimization when matched measurements demonstrate the
intended reduction beyond observed run-to-run variation, with unchanged correctness,
appearance, source completeness and recovery. If evidence is inconclusive, record
that outcome and make no speed claim. Provider throttling/caching rules remain in
force; removing useful detail or hiding a wait cannot substitute for improvement.

**Gate P3:** final integrated runs meet the recorded target and repeat the critical
interaction checks. A cloud software-renderer result diagnoses this environment;
phone-size emulation does not certify physical-phone GPU or network performance.
Any remaining external-service delay receives a truthful visible state and a
documented limit. AI-generation latency is unmeasured while the model is disabled.

### Recorded baseline and selected Q03 targets

Engineering's [recorded baseline](../evidence/quality-20261016/performance/baseline.json)
comes from `artifacts/homepage-performance.mjs`. The reusable final driver is
[`tools/homepage-performance.mjs`](../tools/homepage-performance.mjs), with
[measurement semantics](../tools/performance.md). The 12 observations comprise three
replications of Explore/Together × cold/warm: cold uses a new browser context;
warm navigates again within the same context. They use actual Pages HTTPS assets,
Chromium **151.0.7922.173**, 1440 × 1000 viewport, DPR 1, the managed proxy and TLS
verification, without request interception or throttling. Baseline HTML SHA-256 is
`ed6d33beed3e413c1e8cc7c3b766b290d54fd0a8fa7fa43e9dcfea02189c26e3`.
The following are internal experiment targets selected from that baseline, not a
general speed promise. Both the first and final published measurements below leave
the warm Together locale target unmet.

| Experiment | Baseline and exact observable | Candidate acceptance |
|---|---|---|
| Defer the detailed street payload in Together | Together loads **672,579 decoded JS bytes** in the `lighting-*.js` Three.js bundle, `create-game-*.js` and `live-view-*.js` in each of the six baseline Together observations. Measure Resource Timing `decodedBodySize`, including warm loads with zero transfer bytes. | **0 decoded bytes and 0 requests** for those street modules, street GLB models and lighting rig/HDR assets before an explicit detailed-street request. MapLibre and shared content remain legitimate Together dependencies. |
| Responsive warm Together locale switch | `languageActionMs`: browser `performance.now()` mark before the actual Playwright Chinese-language click → observation that `html.lang` is `zh`. It includes automation dispatch and frame scheduling. Three warm observations: **890.8 / 1261.6 / 946.5 ms**. | **Each of three matched warm runs <500 ms**, using the same start/end semantics and environment. Check translated visible text, unchanged destination/room and no incidental camera transition separately. |
| Suspend hidden detailed-scene work | After switching Explore → Together, wait for map readiness and 1.5 seconds of settling; sample over **2 seconds**. Baseline render delta is already 0; script time is about 9.5–13.7 ms. Recurring update calls were source-observed, not counted by that baseline. | New `updateFrames` counter delta **0**, plus render delta **0**, during the matched hidden interval. Visible scene resumes correctly. Do not present this as a previously measured update-count reduction. |
| Report usable readiness truthfully | Baseline preview time is navigation-relative readiness polling followed by a browser task; the sampled Explore state already has a rendered frame. It is not isolated asset-transfer or GPU time. | Record assets/lighting, compile, first-render and ready timings; report ready only after the actual first rendered frame. Preserve loading/error recovery. This is a readiness invariant and measurement correction. |

Do not claim that the entire Kyoto scene loads faster from these targets. Cold
network waits, shader compilation and software-renderer cadence have separate
causes. Candidate measurements against a workspace server can prove zero payload
and paused-work invariants; hosted latency comparisons require matching the
baseline delivery/cache conditions or explicitly reporting the difference.

**First published Q03 result:** the [12-observation report](../evidence/quality-20261016/performance/first-published.json)
for package `9a55e7b5…` confirms zero initial street-dependency bytes in Together and
zero hidden update/draw deltas. Warm Together language actions are **1140.0 /
937.4 / 1060.3 ms**. **All three fail the unchanged <500 ms target.** Functional
quality corrections remain valid within their tested scope.

**Final published Q03 result:** [all 12 observations](../evidence/quality-20261016/performance/final.json)
use final package `8751ba4e…`, HTML SHA-256
`86693c3539c8be3b2c947d8b25be8eea087eb53a515cb379a3a898ea9c0095e3`,
and the same system Chromium **151.0.7922.173** with SwiftShader. The report SHA-256 is
`d89100a34266659e0dbdcc0a9f48e01404106402402b0fc1fb31f1b02dd068da`;
no run raised an exception. Six Together observations each load **0 initial street
dependency bytes**. All six hidden-scene samples show **0 updates, 0 draws and
0 measured script time** during the two-second interval. Each of six Explore
observations has **one actual initial draw** before readiness.

Warm Together language actions are **1177.8 / 1113.4 / 1134.5 ms**: **all three fail
the unchanged <500 ms target**. Retain the functional release and carry Q03 latency
as **open P1**, with measured performance work before broader expansion.
Warm Explore readiness is **4350.4 / 4809.9 / 4461.5 ms**, improved from the first
published candidate's **6712.9 / 6243.3 / 6093.1 ms**, but the original baseline
**3880.4 / 3993.1 / 4068.9 ms** remains faster. Final cold Explore readiness is
**5908.9 / 5164.4 / 5409.5 ms**. These retain the navigation-relative observation
semantics above. The startup duplicate draw is corrected; this does **not** support
an overall 3D-loading speedup claim or a physical-device performance claim.

## Thorough walkthrough matrix

Run each applicable row in **EN desktop, ZH desktop, EN phone viewport and ZH phone
viewport**. Record each cell as pass, defect or explicitly untested, with browser,
viewport and evidence. Phone viewport checks use touch input where supported;
physical-device claims require a separate real-device result.

| Journey | Required actions and outcomes |
|---|---|
| Explore / initial Kyoto | Load cold/warm; understand representation; walk/look; day/night; change language mid-use; readable controls and state preservation |
| Explore / wider places | Submit a real city/landmark, disambiguate, inspect source, select nearby order, switch destinations and return; country view has clear next action |
| Explore / waiting and failure | Change query/destination while pending; cancel obsolete requests; observe no results, unavailable map/provider and working recovery without lost selection |
| Together / service | Disconnected default, explicit local Connect, invalid address, SSE/poll, reset and service change; no hidden cross-service token requests |
| Together / group | Two independent clients create/invite/confirm/join; add/remove different wishes, choose local view, return to world, reload/reconnect; unavailable AI stays unavailable |
| Locale / visible and accessible text | Inspect headings, banners, map UI, empty/loading/error states, invitation prompt and copy/share status; classify source names and user content separately |
| Supporting navigation | Follow current walk, saved-view, companion, comparison/credits entry points actually present; verify label, destination, language, return home and browser Back/Forward |
| Legacy inputs and saves | Open old lighting, companion `stops` including empty selection, perspective mode/shared fragment and recap fragment links; retain existing versioned saves |
| Sharing / recipient | Preview and copy selected Maps order; inspect all route parts; open saved-view/recap link in an independent recipient; selected notes only, private saves unchanged; cancellation/failure recoverable |
| Layout / motion / access | Keyboard focus/order on desktop, touch on phone, no clipped actions or unintended overflow, reduced-motion behavior, readable day/night and retry controls |

Use actual local rooms and actual provider responses for successful journeys.
Controlled network denial may exercise failure handling; label it as such.
No simulated success, fabricated participant activity or new public endpoint is
permitted. The final walkthrough explains remaining human realism, emotional value,
physical field use and native sharing/permission limits separately from test passes.

## Definition of done and decision

The lead accepts the integrated sprint only after Q00–Q05 evidence is reviewable,
all P0 defects are resolved, critical paths pass on the exact candidate, performance
claims have matched traces, and current docs/checkpoint reflect the tested behavior.
Any P1 left open includes its user effect and an explicit lead disposition; it is
not silently converted to completed work. Report source identity and local test
entry points; no tunnel or model availability is implied. User acceptance of the
experience remains a separate review of the actual delivered walkthrough.

## Acceptance notes · verified scope and remaining gates

**Disposition: release the verified functional corrections; carry Q03 latency as
open P1. Q00 final original-walk and CI reruns remain pending.**
The earlier CSS release uses runtime source
`d21c708bc3d196ca97c5b038fea68c4c73ea92aa`; this CSS package manifest is
`9a55e7b5d8fdc5c5202f18d81ee4ced0e0b6cfc2c945ef1e66a43088047d2d10`.
Pages `86868bf` has [79/79 file hashes verified](../evidence/quality-20261016/published-css-release/hosted-verification.json).
Actual published-page checks pass **38 connection**, **21 homepage** and
**9 navigation** checks in [the retained reports](../evidence/quality-20261016/published-css-release/).
Connection evidence uses the published frontend with a local loopback service.
The backend stays local and the model is unconfigured.

The final startup release uses runtime source
`828a405194d82e465887b15c8bcaedfaa3d04f9d`, with test drivers at
`54fdbaf9bed4328e36a70aeee23e73d0d4aed564`, and package manifest
`8751ba4ecb6f6fcec70d1c2d25cff41b074671ea4433d3bf5b4a087ac810d2fb`.
It includes first camera enabling before the initial draw, locale DOM changes that
do not draw the scene, and a no-op for an unchanged pause value. Engineering's
[focused **8/8**](../evidence/quality-20261016/startup/interaction-result.json),
[bundled-browser homepage **65/65**](../evidence/quality-20261016/startup/homepage-result.json),
[original-walk pause/appearance/startup **19/19**](../evidence/quality-20261016/startup/runtime-pause-result.json),
and [localized credits/license/save-return **3/3**](../evidence/quality-20261016/startup/credits-result.json)
checks pass. Pages `c3bcceb` serves [all **79/79** matching files](../evidence/quality-20261016/startup/hosted-verification.json),
with [**21/21** actual published homepage/phone checks](../evidence/quality-20261016/startup/hosted-home-result.json).
The final performance report is recorded above. Earlier complete-suite results
retain their package scopes; they are not reruns of this changed runtime.

The [full walkthrough](../evidence/quality-20261016/walkthrough-result.json) passes
**264/264** on package
`6cdc0ad9abd0ed507c3a883299164d04569b7a6ef7c789b30bcec7b8dd064935`.
The CSS-release search-grid change passes a matching-browser **6/6** probe and
[65/65 homepage checks](../evidence/quality-20261016/release-homepage-result.json)
on package `9a55e7b5…`. The [exact delta](../evidence/quality-20261016/final-css-delta.json)
records CSS and generated filename metadata changes, with **75 other files identical**.
The full 264-check matrix was not rerun on that CSS package or the startup release.

Application **89/89**, service **13/13** and repository **17/17** checks pass.
CI perspective **80/80** and companion **73/73** pass; their
[consumed assets match package 9a55e7b5…](../evidence/quality-20261016/ci-consumed-assets-binding.json).
That binding preserves the checks' stated scope; it does not claim a rerun of
every suite against the startup release's changed runtime. Original-walk CI at
`e9959df` completed 69 passing checks before a stale license-link selector blocked
the click. The repaired driver verifies the actual new-tab license destination
while preserving its existing checks; the focused 3/3 result above passes. The full
local original-walk rerun and fresh CI run `38851871150` remain pending.

| Area | Verified correction and scope | Remaining gate |
|---|---|---|
| Q00 · CI | Homepage defect reproduced and repaired; final homepage 65/65 and original-walk pause/appearance/startup 19/19 pass. License-link driver corrected with 3/3 focused checks. Earlier perspective/companion CI assets bind to `9a55e7b5…`. | Full final local original-walk and fresh CI `38851871150` remain pending; do not mark all CI green. |
| Q01/Q02 · Journey and language | The 264-check matrix covers EN/ZH desktop/phone navigation, locale/route preservation, supporting links, private saves and recipient behavior. Final published package passes 79/79 file verification and 21/21 homepage/phone checks; earlier CSS-release navigation checks retain their scope. | Physical native permission/share UI is outside this evidence; full earlier suites are not relabeled as final-package reruns. |
| Q03 · Responsiveness | Final measurements prove zero Together street-dependency bytes, zero hidden updates/draws/script time and one initial Explore draw, each across six applicable observations. | **Open P1: 1177.8 / 1113.4 / 1134.5 ms versus <500 ms each.** Continue measured work before broader expansion. No overall 3D-speedup claim. |
| Q04 · Local groups | [17/17 targeted room checks](../evidence/quality-20261016/local-rooms/walkthrough-result.json) and 38 actual published-frontend/local-service checks pass within the recorded package scopes. Local health reports rooms/events available and model unavailable. | No remote shared service or model-generation claim; earlier connection evidence remains explicitly scoped to the CSS release. |
| Recovery | [15/15 lighting checks](../evidence/quality-20261016/lighting-recovery/walkthrough-result.json) pass, including actual Reset/Retry and player preservation. [Partial-map recovery](../evidence/quality-20261016/map-recovery/after.json) uses real provider resources after a deliberate request denial. | Preserve P2 spacing disposition below; no claim of physical-device permission behavior. |
| Phone layout / retained art | Phone crop and search-grid checks pass. Art reviewed all four EN/ZH desktop/phone night cells plus ready daylight views: actor/pavement, crossing and existing facade features remain readable. | New realism acceptance and physical-phone performance remain unestablished. |
| Source integrity | Raw-source guard checks and the actual Paris journey exclude the reviewed coordinate conflict. Selected Maps links preserve the reviewed route. | Other provider records retain uncertainty; there is no provider-wide accuracy claim. |

The [coordinate review](../evidence/quality-20261016/provider-review/README.md)
records Wikipedia page **48435351**, Palazzo Bernardo Nani: the returned point was
in Paris while the article described a Venetian palace, and its linked Wikidata
point was in Venice. The guard applies only to this reviewed page ID and rejects
coordinates outside the recorded 2,000 m tolerance around that reviewed point.
It adds no runtime network call and does not move a place to a replacement point.
A corrected upstream point can pass ordinary radius checks. Unreviewed source
records retain their existing uncertainty; attribution is not an accuracy guarantee.

### Explicit P2 disposition

**Defer spacing polish for the English lighting-fallback banner beside Reset view.**
Art reviewed the 390 × 844 touch viewport with a deliberately denied night HDR
request: the English outer boxes overlap by **3.36 px**, while all message text
and the complete Reset label remain readable; Retry is separate below. The
[lighting recovery evidence](../evidence/quality-20261016/lighting-recovery/walkthrough-result.json)
proves actual drag → Reset preserves the player and Retry restores real night
resources in both locales. The Chinese state has a **7.55 px gap** in the reviewed
capture. This is accepted as nonblocking spacing polish.

Owner: lead for layout, art/UX for review. Any future text or hit-target obstruction
at a supported viewport reopens Q05 as P1. This disposition does not extend the
tested viewport result into a general physical-device claim.

### Next product priority

This sprint claims **retained building/material/lighting appearance**, with clearer
presentation and recovery. It does not establish improved architectural realism or
resolve the user's concern about meaningful travel. The next product work should
address recognizable building features and coherent day/night lighting alongside
the proposed continuous, responsive exploration and personally meaningful moment.
Review an actual approach, discovery and chosen pause; a working route or a larger
set of text cards alone cannot demonstrate that experience. Keep the place source
boundaries, private/shared/real-visit distinctions and absence of fabricated traveler
activity. Scope, cost and experiential evidence remain explicit decisions for that
work; this quality sprint does not claim a new scene, replay or completed real trip.

### Concrete exits for the existing Sprint 2A/2B proposal

These criteria refine [Sprint 2A/2B](lean-iteration.md#sprint-2a-and-2b-demonstrate-before-expanding).
They add no new city, venue, public social system or calendar commitment. Use one
source-reviewed bounded setting with a coherent approach, changing viewpoints and
a chosen pause. Any required connected surface must be reviewed before production;
the current crossing is not assumed sufficient merely because it already exists.

| Existing slice / owner → reviewer | Player actions and reviewable exit |
|---|---|
| 2A · Recognizable place · art + world-content → lead + QA | Approach and look around the agreed building features in the running scene. Compare source-reference cues and matched day/night frames: silhouette/openings, material response and readable shadows remain coherent from the walking camera. The actor and useful ground remain legible. Record sourced versus authored details. Improvement requires an explicit visual review against the current build; preserved artwork alone does not pass this new goal. |
| 2A · A place that responds · product + engineering → QA + experience reviewer | Walk, change direction, investigate a visible detail and pause by choice. The agreed continuous visual/ambient response changes with position or action between locations; an optional short explanation follows discovery. Keyboard/touch, mute/reduced motion and EN/ZH guidance remain usable. A sequence of fixed text unlocks does not meet this exit. |
| 2A · Meaning before expansion · product → lead + available human reviewer | Review actual play and the same detail/story in the flat-media reference. Record what attracted attention, which action contributed, what the person wants to keep or revisit, and why. A source-linked place cue may support an optional later visit. Agent walkthrough establishes behavior; enjoyment, personal affinity and practical transfer require their own observations. If moving/looking contributes no identifiable value, revise this bounded interaction before broader production. |
| 2B · Keep and inhabit a moment · engineering + product/art → QA + experience reviewer | After 2A's experience review supports proceeding, deliberately record a bounded approach, pause and final view; review, keep privately or discard, then optionally share selected material. Preserve actual motion/pacing and optional words. The recipient can replay, skip and take control without changing private saves. Version/size/failure tests must retain meaning; compare the same contribution's replay against its final image and words to assess what motion adds. |

The meaningful outcome may be noticing, personal attachment or a desire to return;
a booking, mandatory menu choice or compulsory share is unnecessary. Source-linked
orientation is a separately testable benefit. Physical access and a real visit are
never inferred from virtual exploration. Human review left unavailable is recorded
as pending, with no invented participant, rating or success percentage.
