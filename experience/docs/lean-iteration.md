# Lean iteration · Borrow someone's eyes

2026-10-07 · User-approved experience and A/B test · Lead: release/integration.

## Goal and bounded release

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
| Experience · Sprint 1, current | Integration + specialist team: Discover → Respond → Learn as one usable release | Bilingual browser checks, state/share isolation, reviewed images and exact hosted package. Technical completion does not establish enjoyment. |
| Experience · Sprint 2, next | Product + QA: observe available participants using both formats; fix the largest observed friction | Record assignment/order/crossover, device and place familiarity, assistance, voluntary continuation and enjoyment explanations. Retain 3D where its experiential benefit justifies its friction; prefer story where it works better, or revise and retest. |
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

Implementation in progress. Final verified behavior, checks, build identity and
review links will replace this paragraph when the release is frozen.
