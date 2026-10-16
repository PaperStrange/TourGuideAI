# Lean iteration · Borrow someone's eyes

Updated 2026-10-16 · Lead: release/integration.

## Active sprint · journey clarity and responsiveness

The user asks for the next sprint plan followed by a thorough walkthrough, with
testing inside the workspace and no tunnel. They find interactions fluent and
report old links, high latency and misleading text, including Chinese within the
English interface. The [quality sprint](sprint-quality-20261016.md) is written before
browser execution: triage the current homepage/original-walk CI failures,
navigation/locale/meaning corrections, measured loading and
response experiments, then the complete EN/ZH desktop/phone Explore/Together and
supporting-link walkthrough. Tickets name owners, reviewers, dependencies and exit
evidence. The local room service remains available only where actually tested;
the model stays unconfigured. These observations do not approve emotional value
or establish the cause of latency. The earlier expansion proposals below remain
separate backlog items while this quality sprint is active.

Q03 now has measured baseline targets: defer detailed-street payload from Together,
warm Together language change below 500 ms in each of three matching observations,
zero hidden scene updates over two seconds, and readiness after an actual rendered
frame. The final 12 observations prove zero Together street-dependency bytes,
zero hidden updates/draws/script time and one initial Explore draw across all six
applicable observations. Warm Together locale actions are **1177.8 / 1113.4 /
1134.5 ms**: all miss the unchanged <500 ms target. **Release the functional fixes;
carry Q03 latency as open P1**, with measured performance work before broader
expansion. Warm Explore readiness improves over the first published candidate but
remains slower than the original baseline; make no overall 3D-speedup claim.

The full walkthrough passes 264/264 on package `6cdc0ad9…`. CSS-release runtime `d21c708`
and package `9a55e7b5…` include the CSS search-grid repair, verified by a matching
6/6 probe and 65/65 homepage suite; 75 other package files are identical. Perspective
80/80 and companion 73/73 CI checks consume assets identical to that CSS package.
Pages `86868bf` passes 79/79 file verification plus 38 connection, 21 homepage and
9 navigation checks, retaining that CSS-package scope. Final runtime `828a405` /
drivers `54fdbaf` / package `8751ba4e…` passes engineering 8/8, bundled homepage 65/65,
original-walk pause/appearance/startup 19/19 and localized credits/license/save-return
3/3. Pages `c3bcceb` passes 79/79 file verification and 21/21 actual homepage/phone
checks. The full local original-walk suite passes **133/133** on that final package,
as do final CI artifact reports for homepage **65/65**, perspective **80/80** and
companion **73/73**. **The local walkthrough milestone is achieved**, and all known
runtime/driver P0 reproductions are verified fixed on final bytes. Remote
original-walk and full walkthrough jobs in CI `38851871150` remain in progress;
Q00 aggregate verification is pending, with no all-CI-green claim. Exact hashes,
performance values and package scope limits are in the sprint acceptance table.
The English fallback-banner/Reset 3.36 px edge overlap is accepted as P2 spacing
polish after readable text and actual Reset/Retry checks. This sprint retains
existing art. Recognizable building features/lighting and meaningful continuous
exploration remain the next product priorities; their value is not established by
navigation, copy or latency checks.
Concrete [2A/2B exit criteria](sprint-quality-20261016.md#concrete-exits-for-the-existing-sprint-2a2b-proposal)
now tie source-recognizable art and continuous player response to an actual
approach/discovery/pause, followed conditionally by a deliberate personal moment.
They preserve the existing bounded experiment and separate technical proof from
observed enjoyment, affinity and practical transfer.

## Delivered baseline · Explore and Together homepage

The approved journey has two modes: a center-place search with live street/3D-map
preview and sourced local suggestions; and an invited group's world map of dream
countries/cities, shared local views and reviewed AI proposals. The source service
uses persisted rooms and revision-checked updates. Current testing uses the local
service and explicit endpoint connection; no tunnel is authorized for this sprint.
Future public collaboration requires separately configured hosting, persistence
and, for AI proposals, a model provider. The frontend and
backend have separate release evidence in the [checkpoint](agent-checkpoint.md).

Building/material readability and day/night lighting remain active acceptance
criteria. Matched camera captures record the current art refinement. Generic map
geometry, detailed Kyoto interpretation and real-place recognition retain distinct
coverage claims. Human realism, enjoyment and field usefulness remain open.

## Previous milestone · approved travel companion

The user approved Google Maps selected-journey sharing and foreground phone
location for nearby context. The milestone is published at `travel.html`, with
English/Chinese UI and the three existing Kyoto place references. Ordered route
parts preserve every selected place; Google calculates the routes. Location starts
explicitly, pauses when hidden and requires Resume. It creates no GPS history or
automatic real-visit marks. Personal meaning and existing view/note sharing remain
separate from directions.

See [companion behavior](travel-companion.md) and the [agent checkpoint](agent-checkpoint.md)
for owners, resume commands and release evidence. Runtime `a8c3e49` / Pages `6b5b1ea`
passes 73 companion, 130 original, 80 perspective and 24 focused sharing browser
checks, 74 unit tests and 17 repository gates. All 63 hosted files match the package;
all three CI jobs pass for the runtime source.
Field usefulness and emotional value remain unaccepted. The proposed experience
correction below continues as a separate next sprint; this utility milestone does
not deliver continuous world response or personal replay.

## Latest review and proposed correction · 2026-10-13

The user reports that narrative reads well but immersive play is weaker, then
clarifies that all three problems matter: reading interrupts exploration, the
street feels unresponsive, and the outcome lacks meaning. Responses are confined
to checkpoints, detail is presented as text, and a final link/card does not express
the emotion of discovering an interesting place or a place one feels called to.

This is qualitative feedback from the user, not a completed randomized A/B result.
Sprint 1 is technically delivered; its immersive and expressive value is unaccepted.
The user's clarification also broadens usefulness: emotional affinity, expression
and a desire to return matter alongside practical travel preparation.

### Recommendation: Find your own place

The proposed loop is **wander → notice → investigate → linger → keep a moment →
invite someone into it**. The player chooses what draws them and what, if anything,
to retain. We do not prescribe a special place, the correct emotion or a reflection
they must write. A practical place reference can accompany a moment, but is not
the primary reward.

A concrete short experience could move from a lively street edge toward a quieter
view: the player follows something that attracts their attention, changes position
to understand it, pauses where they choose and frames their own view. Sound,
visibility and readable detail respond along the way. If the place matters to
them, they can preserve a short approach and pause and add their own words.
Whether this produces attachment remains the question to test.

### Diagnosis and team synthesis

The lead, product and engineering reviewed the delivered source remotely.
Starting live mode or selecting a chapter automatically approaches a fixed point;
arrival frames the camera. Proximity unlocks a text reveal. Personal saves accept
only three editorial moment IDs. The world has little response to deliberate
inspection, and the page gives substantial space to reading. These facts fit the
reported problem; they do not quantify how much each factor contributes.

Sources: [perspective flow](../src/perspective/main.js),
[state contract](../src/perspective/state.js), [presentation](../src/perspective/styles.css)
and [world update](../src/runtime/world-view.js). This review did not rerun the
browser or identify a newly measured performance regression.

Product challenged an initial landmark-finding proposal: making the player hunt
the correct facade could reproduce the checkpoint problem as a navigation lesson.
Engineering distinguishes continuous spatial response from adding more triggers,
and an actual short recorded movement from a montage of posed camera keyframes.
World-content is checking whether a separate street/riverside setting offers a
source-supported approach, change of atmosphere and place to pause.

### Three connected changes

| Change | Player behavior and world response | Bounded implementation |
|---|---|---|
| Explore continuously | Walk, pause, look closer and change direction whenever something draws attention. Position changes sightlines and sound; nearer features become legible. Inspection gives a small in-world response and optional context. | One compact coherent area, one reusable inspection interaction and one continuous ambience response. No automatic chapter steering, mandatory narration or proximity-only completion. |
| Make a personal moment | Choose where and how to pause. Optionally start a short recording of an approach, stop at a chosen view, review it and keep it privately with optional words. | Bounded local recording of actual movement, camera changes, pauses and authored scene/ambience state. No microphone, video upload, GPS or lifetime movement log in this slice. |
| Let someone enter it | A recipient can replay or skip the author's moment, then take control and explore its surroundings. | Isolated guest state, selected sharing and a clear handoff from replay to control. Opening the moment never changes the recipient's saved journey or records a physical visit. |

The environment must have meaningful responses between interesting locations;
removing numbered markers while retaining the same fixed unlocks is insufficient.
Environmental sound is optional and has visual equivalents. Respect mute and
reduced-motion preferences. Authored ambience does not imply live weather, traffic,
crowds, venue activity or crossing safety.

Details should first be visible or understandable through action. Short EN/ZH
context can deepen what was noticed; Japanese world names remain intact. Readable
signs, material details, sound and framing are functional art work here. Dense
prose and decorative crowds are not substitutes for that response.

### An experiential memory, with a reason to exist

The user may record only a deliberately started, bounded segment. Preserve the
actual turns, pauses and chosen camera; do not compute a new route and label it
their replay. A few posed keyframes would be a composed scene, which is a distinct
possible medium and must be labelled accordingly.

The prototype needs a versioned bounded record and tested encoded size. The present
8192-character share limit makes payload size a real engineering constraint.
Preserve important turns and pauses when reducing samples, verify spatial error,
and explain an over-limit segment rather than silently dropping its meaning.
Share bundled ambience identifiers/settings, not recorded audio. An unavailable
scene version needs an honest fallback. Older saved views must keep working.

The **fancier-postcard risk** is central. Compare the same contribution as a
replayable moment and as its final image with the same words. Replay earns its
cost only if approach, pacing and spatial context communicate something meaningful
that the image does not, or invite the recipient to explore. Do not assume that
motion, a share click or a longer viewing time proves emotion or connection.

The first personal value is being able to keep and return to the moment oneself.
Sharing is optional. Another person's view is an invitation; it is not fabricated
traveler presence, and a stored memory is not evidence that somebody revisited it.

### Place selection and cost

The current two office frontages are useful technical assets but their limited
contrast may constrain this experiment. First establish an approach, a visible
change and a worthwhile place to pause. Do not stretch the same crossing into a
longer chapter by repetition.

One candidate under source review is a **separate Shijō Bridge / Kamogawa chapter**
with a street-to-riverside transition. It is not adjacent playable coverage of the
present Shijō–Karasuma strip. Exact access, geometry and visual/audio rights must be
checked before implementation; no new location is selected or built by this brief.
Keep Ginza/Wako's architectural study separate.

World-content checked two primary sources on 2026-10-13:

- [Kyoto Prefecture tourism article, 2026-08-19](https://www.kyoto-kankou.or.jp/kawanokyoto/news/58):
  Shijō Bridge crosses the river; the Sanjō–Shijō banks support sitting and
  conversation, with access by stairs/slopes at various points. This does not
  identify a particular currently open descent.
- [Prefecture River Division page, updated 2026-07-13](https://www.pref.kyoto.jp/kamogawa/1205475129577.html):
  distinguishes an upper street-side walkway and lower waterside path on the east
  bank through the Shijō reach. This supports the spatial contrast, not surveyed
  access geometry or current station directions.

The candidate route is bridgehead → one verified descent → a short riverside
segment and optional pause. Exact connection, obstacles, current access and any
step-free alternative remain to verify. Source-image reuse rights are unestablished;
no image or map was imported. A quieter soundscape or particular emotional response
is an authored hypothesis, not a guarantee from these sources.

| Direction | Relative cost and opportunity | Decision |
|---|---|---|
| Polish ambience and narration around the existing checkpoints | Low–medium; stronger presentation, with the same limited agency and expressive endpoint | Supporting work only |
| One coherent responsive place plus a deliberate personal moment | Medium; interaction/art, potentially new bounded geometry, memory/replay and recipient work | Recommended experiment |
| Populated open city and continuous social travel history | High; traversable coverage, behavior systems, content, operations and maintenance | Defer until the small experience earns expansion |

These are relative judgments, not quotes or measured person-day estimates.
Reuse navigation, localization, renderer, local storage patterns and share previews.
Measure actual content, art, engineering and rework effort. Free data does not
remove production costs, and a camera replay is not already implemented by the
existing single-pose capture API.

### Sprint 2A and 2B: demonstrate before expanding

- **2A · A place that responds.** Product owns the free exploration sequence;
  world-content checks the compact setting and access; art makes its contrast
  and inspectable details readable; engineering delivers the continuous response
  and optional assistance. QA checks agency, keyboard/touch behavior, camera
  visibility, EN/ZH guidance and ordinary-device behavior. Review actual play
  before building the full memory feature.
- **2B · Keep and inhabit a moment.** Engineering owns bounded recording/replay
  and compatibility; product/art own expression and recipient handoff; QA verifies
  path/pause fidelity, size limits, failure recovery and state isolation. The lead
  prepares a comparison of replay versus image/words from the same contribution.
  Human participants supply the emotional and social evidence.

Do not turn background geometry into navigation by enlarging bounds. The current
64 m strip and seven context footprints do not establish a complete walking route.
Any connected corner or alternative setting needs explicit surface, collision,
visibility and source review. See [content boundaries](content-contract.md).

Keep the released story/map and guided version available for comparison.
Observe voluntary investigation, reasons for pausing, willingness to continue and
whether the player wants to keep or return to a moment. Lingering alone can mean
confusion, idle time or admiration; ask what it meant. For recipients, ask what
they understood about the author's attraction and whether they wanted to explore.
Nobody must identify a life-defining place for a session to be useful.

Record device, familiarity, assistance and presentation order. The same contribution
helps compare expressive formats, but repeat exposure still matters. Retain story/map
as a low-friction reference for the experience; the memory-medium comparison answers
a separate question. Recognition in a new real photograph and successful physical
use are separate later checks, not inferred benefits.

Continue only when the observed experience explains why being in the space adds
value. If it needs text coaching, remains a set of unlocks, or the replay conveys no
more than a photograph, revise the smallest cause before buying broader coverage.
No invented success percentage, population result or market advantage is claimed.

This update records a source-grounded diagnosis and proposed sprint revision.
It does not publish new runtime behavior or claim that recording, the new setting,
human attachment or real-world travel benefit have been demonstrated.

## Original Sprint 1 goal and bounded release

Deliver a complete small experience that can answer whether moving and looking
through a recognizable place makes a shared perspective more enjoyable than an
equivalent illustrated story/map. The broader city/country goal remains in
[the strategy](city-country-strategy.md); this is its first evidence-producing iteration.

Use three supported observations around the existing Shijō crossing, a deliberate
walk between viewpoints, a natural ending and an optional personal moment. Label
the author as a studio sample. Do not invent a traveler, broaden physical access
claims or turn a sample into social-connection evidence.

## Three delivery slices

| Slice | Deliverable | Acceptance |
|---|---|---|
| Discover | EN/ZH arrival, three observations, live walking/looking and the matched map/story alternative | Same content and reveal sequence; actual walking respects existing bounds; clear controls, readable mobile story mode and recoverable 3D failure |
| Respond | Save a personal frame and optional sentence, reopen/edit/remove, preview one selected moment and share a read-only link | No old journey mutation; private state survives reload; only selected saved material travels; personal framing versus fallback reference is explicit |
| Learn and release | Optional local feedback, explicit report export, technical evidence and hosted review | Record assigned/requested format and crossovers; no hidden analytics or invented participants; exact tested package published |

Engineering owns runtime/pose handling; world-content owns observations; product
owns bilingual copy; art owns matched browser-view plates; QA independently owns
tests. Lead owns orchestration, state, sharing, presentation and release. The file
ownership registry is the editing boundary. Commit tested, coherent slices; do not
wait for every future feature before delivering a useful result.

## Experiment and decision

The experience A/B is distinct from the old real-time/Cycles rendering comparison.
An initial format assignment can support formative comparison; direct mode links
and deliberate switching support review. Mark crossovers in an exported report,
because trying both formats is not an independent randomized observation.

Use the same sample contribution, source facts and opportunities to save/share in
both formats. Story images are illustrated captures of our browser scene, not
photographs of Kyoto. Personal 3D frames are restored as 3D; a fallback reference
image must never pretend to reproduce the saved camera. Unavoidable presentation
differences are recorded, so the comparison concerns the delivered experiences.

Enjoyment and voluntary continuation are the first questions. A local score and
comment are individual feedback, not a population result. A known sample author
can test interest, not reciprocal connection. Later tests need available people,
familiarity/order controls and real consenting contributors. No statistical sample,
pass rate, willingness to pay or field success is assumed.

## Phases, sprints and backlog

Keep one release slice in progress. Each sprint closes with an owner, evidence,
measured production/revision effort and a continue, revise or stop decision.
The table is a sequence of decision gates, not a commitment to unstaffed dates.

| Phase / sprint | Lead and outcome | Decision gate |
|---|---|---|
| Experience · Sprint 1, delivered | Integration + specialist team: Discover → Respond → Learn as one usable release | Bilingual browser checks, state/share isolation, reviewed images and exact hosted package. Technical completion does not establish enjoyment. |
| Experience · Sprint 2, proposed revision above | Product + team + QA: a responsive place, a personal moment and review with available participants | Record assignment/order/crossover, device and place familiarity, assistance, voluntary continuation and enjoyment explanations. Retain 3D where its experiential benefit justifies its friction; prefer story where it works better, or revise and retest. |
| City · Sprint 3, conditional | Product + world + art + engineering: connect contrasting places through arrival, transit and departure, carrying personal moments | Reviewers can explain where they went, why the transition makes sense and why they continued. Record loading/state failures and production/rework effort; revise disconnected scenes before adding coverage. |
| Corridor · Sprint 4, conditional | Same team: carry the experience between two cities | Regional continuity, repeat value, recovery and repeatable source/art/update work justify expansion. Replace illustrative cost assumptions with observed comparable work. |

Sprint 2 uses the same author, facts, destinations and response opportunities.
The [review protocol](perspective-review.md) supplies neutral EN/ZH prompts and
explains assignment, crossover and the single local feedback record.
Record differences in walking time and framing: this compares delivered formats,
not a perfectly isolated rendering variable. Missing participants leaves this
human gate pending. Real consenting contributors and recipients are needed before
claiming reciprocal connection. Chapter purchase or recurring access requires a
separate willingness-to-pay experiment.

Backlog order: **P0** comparison validity, access, state or selected-sharing defects;
**P1** human observation and the smallest fixes it identifies; **P2** city continuity
after the experience gate; **P3** corridor after the city gate. Feeds, bookings,
extensive path history and country geometry remain deferred. At each review,
publish evidence limits, actual effort and the next uncertainty before adding scope.

## Definition of done

- Actual packaged browser walkthrough in both languages/formats, phone and desktop.
- Meaningful state/share tests, malformed input and unavailable storage/assets/WebGL.
- Existing runtime behavior checked after opt-in extensions; original journey retained.
- Actual images inspected; load/recovery/keyboard behavior checked independently.
- Source commit, package hashes and known limits retained; source pushed and hosted
  review updated. User enjoyment and ordinary-device performance remain human review.

Do not add a public feed, accounts, booking agent, continuous path history, new
country geometry or a second-city promise to this release. Measure production and
revision effort before choosing the next scope: one city journey, then a two-city
corridor. Ginza/Wako remains a separate architectural study.

## Delivery record

Sprint 1 is delivered at `perspective.html` in application `f701bda`.
Discover, Respond and Learn are implemented in both languages and both formats.
The package passes 80 perspective browser checks, 130 original-walk
browser checks, 44 pure tests and 17 repository gates. All 57 hosted files
match the tested package. [Delivery record](../evidence/perspective-20261007/README.md).

The three matched JPEGs add 830,021 bytes; existing geometry and lighting are reused.
No new paid service, account, public feed or country asset pipeline was introduced.
Sprint 2's human comparison remains pending. The 2026-10-13 feedback and proposed revision above guide the next experiment; the prepared review protocol remains a baseline.
Technical completion is not acceptance of enjoyment, realism or market demand.
