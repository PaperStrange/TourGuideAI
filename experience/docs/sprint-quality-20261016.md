# Quality sprint · a clear, responsive travel journey

2026-10-16 · Plan issued before walkthrough; execution results pending.
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

Initial source observations requiring walkthrough: `src/home/main.js` contains
mixed EN/ZH decorative headings and a fixed English mode-group accessible name;
`src/home/copy.js` calls the authored scene “LIVE STREET PREVIEW / 实时街景预览”.
These are source findings, not completed browser results. Which old-link transitions
confuse the user and where latency originates remain to be measured.
The latest CI also reports homepage and original-walk browser failures. QA's
initial diagnosis identifies stale copy/lighting expectations; Q00 requires
reproduction and evidence before either is marked resolved.

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
