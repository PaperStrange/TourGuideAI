# Delivery board · TourGuideAI 2.5D

Updated 2026-10-07. Owner: lead. Planning baseline: `origin/iteration` at
`eae982f4ba20a107bf21a35b70f635b4935a4c70`.

**Current user review:** the user relays a friend's preference for live A and
roughly “60% positive” feedback on realism; the method and denominator are unknown.
The user affirms real-place recognition, finds choices and the small street's
travel experience less convincing, and likes their own/other travelers' footprints.
They ask what follows and how it affects real life. They also explicitly free the
team to challenge the SOW: it is initial design guidance, not a product boundary.
The earlier accepted fluency/guidance remains evidence for the version played.

**New user approval:** Borrow someone's eyes and its A/B experiment are approved.
The user also requests a city/country comparison across cost, enjoyment and
competition from games, AI travel agents and internet products. The
[strategy evaluation](../../experience/docs/city-country-strategy.md) preserves
the wider ambition and compares six approaches. Selective immersive chapters are
the leading conditional recommendation; larger implementation/budget decisions
remain dependent on experience, continuity and production evidence.

**Approved experiment:** test “borrow someone's eyes”—follow a deliberately
shared viewpoint, notice a real detail, frame your own view and optionally leave a
short thought for another visitor. Curiosity and connection may matter without a
planned trip. Preparation and real-visit reflection are optional benefits to test.
The following stages explore one hypothesis; they are not a commitment to a larger
map, full route recorder, community feed or all candidate concepts.

| Proposed sprint | Owners | Bounded outcome | State |
|---|---|---|---|
| Focus-1 · Discover through another view | product, art, world, engineering, QA | One coherent short approach and contrasting, explicitly authored or consented personal moments; movement/viewpoint reveals a supported detail | Experience experiment approved; implementation and contributors pending |
| Focus-2 · Leave my moment | product, engineering, QA | Frame a view and optionally keep a short thought without completing a choice menu; preview selected sharing | Proposed; current encounter notes/recap do not yet represent independent viewpoints or footprints |
| Focus-3 · Experience A/B and recipient | product, QA, available participants | Compare same story/facts/contribution in live 3D and map/photo/story; assess voluntary enjoyment and recipient meaning, with travel utility separately | A/B approved; implementation and human evidence pending; distinct from earlier rendering comparison |
| Parallel · Architectural recognition | world, art, engineering, QA, lead | Bounded live Ginza/Wako study with reference-supported architecture | Reference selection, licensed photograph and validation brief complete; scene implementation pending |

[SOW §0f](SOW.md), [positioning](../../experience/docs/positioning.md) and
[Ginza recognition study](../../experience/docs/recognition-study.md) distinguish
user feedback, selected reference and unproven recommendations. After the experience
test, assess one city journey and then a two-city corridor before expanding coverage;
these are conditional decision stages, not committed release dates. The following
lighting sprints are already delivered:

| Sprint | Owners | Exit | State |
|---|---|---|---|
| Light-1 · Sources and rig | world, art, engineering | Verified licensed local HDR assets; shared presets and shadow/material contract | Complete: two verified CC0 HDRs; reviewed shared rig and unchanged source models |
| Light-2 · Experience and comparison | engineering, art, product, lead | EN/ZH switching in the walk; separate appearance preference; six matched live/Cycles views | Complete: bilingual controls, isolated preference, six reviewed Cycles images in `a176cf3` |
| Light-3 · Verify and publish | QA, art, lead | Readable night route, state/notes preserved, rapid/failing load recovery, matched views and exact hosted bytes | Complete technical delivery: 130 browser / 33 pure / 17 repository checks; Pages `afea7b9`, all 38 tested files verified. User art acceptance remains open |

[SOW §0e](SOW.md) records the new direction. The following expanded-street/sharing
sprints are the preceding delivered increment:

| Sprint | Owners | Concrete exit | Current state |
|---|---|---|---|
| Detail-1 · Shared source and interface | world, engineering, art, lead | Sourced enlarged intersection context; fixed matched camera contract; explicit multi-format recap schema | Complete: seven source footprints, three shared view definitions, bounded presentation-only recap |
| Detail-2 · Implement both comparisons and sharing | art, engineering, product, lead | Correct diagonal corners and detailed streetscape; realtime PBR versus Blender path-traced stills; one preview with link, PNG, print/PDF | Implemented and pushed in `6a532aa`; original game bounds and encounters preserved |
| Detail-3 · Verify and publish review | QA, art, product, lead | Actual matched browser views; note-selection/privacy, recipient and format checks; incremental commits/pushes; updated existing Pages site | Complete technical delivery: 97 browser / 22 pure / 17 repository checks passed; Pages `28dc489` serves the exact 31 tested files. User art acceptance remains open |

These sprints continue the existing owners' work. They do not expand the playable
boundary or claim new verified entrances. [SOW §0d](SOW.md) supersedes older
pending-fluency and HTML-only-sharing statements below. Final new-art acceptance
remains with the user.

### Historical delivery baseline · 2026-10-05–06

The following goals, sequencing and scope record earlier decisions and delivered
increments. They do not override the user's 2026-10-07 instruction to reconsider
the product freely. Current exploratory recommendations are above.

**Status: recommended options approved on 2026-10-05, with English/Chinese guidance
and explicit art-quality/interaction-fluency acceptance.** The user's current
decisions are recorded in [SOW §0a](SOW.md#0a--当前用户裁定2026-10-05).
**Latest priority:** the user requested a more vivid, three-dimensional experience
and Blender technology research as the next iteration's main target. See
[SOW §0b](SOW.md) and the [3D/Blender research and iteration plan](blender-depth-research.md).
The V3D iteration below takes priority over full-guide work and destination expansion.
The latest user feedback asks for more believable architecture/light and immersion
across trips, days, individual actions and whole-trip sharing. The user also
authorized a clean project structure and incremental remote commits/pushes. The
new application is `experience/`; current delivery details continue in its
[iteration plan](../../experience/docs/iteration.md) and
[immersion design](../../experience/docs/immersion.md).
The Street View request now has a concrete reference route: linked Maps comparison
plus independently licensed photographs of the exact buildings, recorded in
[facade references](../../experience/docs/facade-references.md). This does not
claim a Google panorama was inspected or extracted into the model.
SP0 clarification is complete. SP1–SP3 now have an implemented, runnable first
playable in [`iteration/game/`](../game/README.md): detailed street art, three
sourced encounters, English/Chinese guidance and player-derived field notes.
The delivered build passed **44/44 browser checks** and **17/17 existing repository
gates**, with no browser errors or required secondary network requests. Independent
art and product review found no remaining blocking defect in the final captures.
User art/fluency acceptance and fresh-user evidence remain pending; implementation
and technical verification do not substitute for those decisions. Direct `file://`
launch is unverified because managed Chromium blocks that scheme; exact bundle
bytes were exercised over HTTP with every secondary request denied.

### First-playable delivery · 2026-10-05

| Outcome | Delivered evidence | Status |
|---|---|---|
| SP1 visual proposal | Actual-size EN/ZH opening, approach, card and choice captures; [visual record](visual-target.md) | Implemented proposal reviewed by agents; user art approval pending |
| SP2 rendered block | melonJS street, character, facade depth, mapped crossing, reduced motion and resized laptop layout | Browser-verified; source/fact versus authored-art boundaries retained |
| SP3 meaningful loop | Three sourced encounters, useful cash-service choice, bilingual guidance, clear pause/close/resume, honest south placeholders | 44/44 browser checks; [QA result](first-playable-result.md) |
| Early SP4 support | Save/resume, distinct choices, player-derived offline field notes | Demonstrated preview; full travel-ready guide and memoir scope remain open |
| Product acceptance | Implemented art quality, interaction fluency and fresh-user next-action probe | Awaiting actual user review; no invented tester or pass |

Runnable source and commands: [game README](../game/README.md). Exact build and
source hashes: [delivery manifest](../../.dsh/artifacts/evidence/first-playable/manifest.json).
This delivery does not complete the full Gate 1 street, twelve destinations or
real-world field walk. The user's new depth/vividness request is the actionable
direction for the next iteration; it does not retroactively approve the first artwork.

### Current iteration · V3D, a vivid three-dimensional Kyoto

Main outcome: the same small block gains convincing volume, materials, lighting
and restrained life while preserving fluent play and complete EN/ZH guidance.
Adopted route: Blender → GLB → Three.js browser rendering with HTML UI and journey
state in the independent `experience/` package. The earlier playable stays
available as a historical baseline.

**V3D-0 complete:** Blender 4.3.2 generated a reproducible 5.29 MB GLB; the live
Three.js proof passed 24/24 independent technical checks, including EN/ZH camera
controls and graphics-failure recovery. [Evidence and limits](blender-depth-research.md#final-browser-evidence)
are recorded separately from gameplay and art/fluency acceptance. V3D-1/2 are now
implemented in `experience/`; the photo-informed facades and integrated journey
passed **53/53 browser checks**, **16/16 pure tests** and **17/17 repository gates**.
Exact built bytes, screenshots and limits are in
[validation](../../experience/docs/validation.md).
V3D-3 human acceptance and hardware fluency remain open; software-rendered cloud
cadence is not a performance pass.

| Sprint | Owner | Deliverable and exit |
|---|---|---|
| V3D-0 · Technical/art feasibility | Engineering + art, QA independent | Complete: reproducible Blender scene/export, browser proof, cost/material/axis checks and written recommendation; research does not count as integrated gameplay |
| V3D-1 · Camera contract and art kit | Engineering + art + world/content | Implemented guided camera, ground picking, occlusion, animated traveller and photo-informed facades; actual browser art review found no blocker in inspected frames, with recorded polish limits |
| V3D-2 · Playable integration | Engineering + design | Three encounters, EN/ZH cards, preserved saves and personal notes verified; 16 pure tests and 53 packaged browser checks pass |
| V3D-3 · Polish and acceptance | QA + art + design + user | Restrained ambient life, hardware/performance and offline/fallback evidence, full bilingual walkthrough, separate user art/fluency acceptance |

The user approved guided 3D for the first launched version on 2026-10-05. The
camera uses a three-quarter view with limited orbit/zoom and reset; framing and
player-follow behavior are validated in V3D-1. Scope excludes city expansion, invented
interiors, new venue facts and multiplayer. Performance thresholds are provisional
until measured on named target hardware. Detail and primary sources are in the
[research document](blender-depth-research.md).

## 1. Product goal and established decisions

The product is a browser game where a player explores real Japanese cities,
makes travel choices, receives an itinerary reflecting that play, follows it in
Japan, and adds real photos to a memoir. The complete goal includes 3–5 cities
and playing with friends; Gate 1 is a smaller validation milestone.

Carry forward these decisions without asking again:

- Art direction and legibility first, mechanics design second, implementation
  follows the design. A good-looking but invented street does not meet the goal.
- First city: Kyoto; first street: Shijo. Gate 1: one street, 12 enterable places,
  playable 2.5D and a real-world walk. The approved first milestone is a smaller
  polished block with a complete, source-backed encounter. Count real destinations
  with meaningful content and evidenced access; repeated doors and placeholders
  do not inflate the count. The interim demo does not complete Gate 1.
- Detailed, recognizable stylized 2.5D is approved. The first playable must pass
  both high-quality implemented art and fluent interaction review, independently.
- Desktop-first gameplay, English/Chinese guidance and Japanese world signs. Exported guides
  must be phone-readable, printable and usable offline. Touch gameplay is outside
  the current scope.
- Source-backed facts belong to the city pack. Narrative cannot invent places,
  opening hours, prices or transport. Unknowns stay unknown; mandatory trip facts
  must be resolved before declaring a route independently usable.
- Keep the existing three south-side placeholder interactions until their
  representation is repaired; they do not count as finished venue experiences.
- The official long-description field was already approved by the user. Preserve
  text, provenance and attribution; implementation details do not reopen approval.
- Latest recorded engine decision: melonJS, Phaser fallback, in an isolated
  `iteration/game/` workspace. Engine selection was delegated by the user.
- No deadline-pressure mechanic in the initial slice without sourced constraints
  and a visible recovery option. Game-clock values never become travel facts.
- No community feed or imported third-party review corpus in the planned slice.
  No mandatory live LLM calls. Offline guide access cannot become a paid feature;
  selling time shortcuts would violate the real-cost contract.

Sources: [SOW](SOW.md) §§1–6, 9, 12; [design core](design-core.md) §§7–8;
[foundation decision](foundation-research.md) §§5–6;
[placeholder contract](../viewer/opener-contract.md).

## 2. Evidence baseline, not percent complete

| Area | Current evidence | Planning consequence |
|---|---|---|
| Existing technical checks | On 2026-10-05, `node iteration/tools/run-gates.mjs --json` passed all 17 current checks, no skips, in a fresh worktree at the baseline commit; no tracked files changed | Preserve useful coverage; green checks do not approve art, fun or field accuracy |
| Player comprehension | [P1 trial](p1-trial-01-result.md) records failure: participant could not understand the scene or goal | Retest after the visual/design correction; older “untested” status summaries are stale |
| Visual/runtime at planning baseline | Historical baker has `TILE_ASSETS = null`; the independent `iteration/game/` playable was subsequently delivered above | Keep baseline history distinct from the new playable and the V3D research proof |
| Places and doors | [Status §7.1](status.md) distinguishes 12 budget slots, 10 authored doors, 7 supported north recesses and no confirmed door-to-tenant mapping | Never count door markers as distinct real experiences; source and scope decide what can ship |
| Player-derived itinerary | [Emitter](../tools/emit-guide.mjs) explicitly exports a fixed curated chain; current page exports a key log | A journey-to-guide feature still needs implementation and acceptance |
| Save/memoir | Current visit state is in memory; real-photo memoir loop not implemented | Persistence and photo return are explicit roadmap deliverables |
| Fact quality | Known D-53/L09 duration and coordinate classification issues are recorded in [status](status.md); sparse hours/transport facts | Reconcile against current source, then correct before the field route; technical checks alone do not close them |
| Physical validation | No accepted Kyoto field walk is recorded | Final real-world claim waits for a human route test |

Source files were reviewed at the immutable baseline above. SOW SHA-256:
`0991dad212510f76da205f53235f3e3836ede5e2960a74d8cdce89dd43d39fcd`.
Current counts are baseline observations, not fixed acceptance totals.

## 3. Team and decision rights

Five specialist agents were convened for the initial planning review; lead is the
sixth role. That review was read-only, with dependencies discussed directly between
roles. The same team subsequently implemented and independently reviewed the first
playable and V3D-0 proof under the ownership table. Historical closed source-review
teams were not restarted.

| Role / agent | Accountability | Delivery and independent review |
|---|---|---|
| Producer / lead | Scope, priorities, sprint board, integration, decision log | Maintains this board; user resolves product tradeoffs |
| Game design / `product_design` | Core loop, choices, onboarding, reward and pacing | Supplies mechanics and playtest intent; art/QA challenge comprehension and outcomes |
| Art direction + UX / `art_ux` | Reference frame, asset language, scene composition, English/Chinese UI, first-playable brief | Delivers visual design; user judges direction and implemented quality, QA observes real-browser readability/fluency |
| Technical direction / `engineering` | Runtime, controls, camera, persistence, journey/export integration | Supplies code and technical evidence; QA independently checks behavior |
| World + content / `world_content` | Real geography, entrances, venue content, source/rights records | Supplies sourced city content; QA independently checks release-route claims |
| QA + playtest / `qa_release` | Regression, browser observation, usability and field acceptance | Does not self-approve authored runtime/content; lead resolves defects, user accepts product |

Before implementation, map every ticket to the existing owner in
[file-ownership.md](file-ownership.md). These planning agents do not implicitly
replace `geo-contract`, `doors-author`, `pack-curator` or `export-guard` ownership.
Existing file changes go through their recorded role; lead records any explicit
handoff before an agent writes. New runtime and art paths need one named owner.
Allow parallel art/content/runtime work only after their shared contracts are
clear; integration and final verification are sequential.

The original planning run found a hardcoded Windows path in
`check-task-ownership.mjs`. The lead repaired it in this follow-up to resolve the
table relative to the script, and the helper now runs in this checkout. The
explicit ownership table remains authoritative; the helper does not replace it.

## 4. Team discussion and resulting plan

- Art + engineering: framing must be tested in the actual 2.5D projection. The
  old orthographic viewport arithmetic cannot settle final camera visibility.
  Agree on a representative frame before producing a whole asset library.
- World + engineering: do not widen the road constant using a single midpoint
  calculation. Street drift and both facade envelopes need per-location support.
  Correct geometry is an engineering obligation, not a request to approve false facts.
- Design + art: first scene communicates place, purpose and action. A visit card
  should reward the player with a useful sourced discovery; raw door IDs and
  provenance diagnostics belong in detail views, not the main game experience.
- QA + engineering: guide existence is insufficient. Distinct journeys must
  produce appropriately different guides, and saved progress must survive reopen.
- Design + world: seven receipts with the same building name cannot establish a
  meaningful game loop. Find a real, source-supported encounter; do not attach
  a remote temple or invented shop to an unverified block-zero entrance.
- All roles: retain separate visual, playability, factual and field acceptance.
  The plan places the memoir loop before multiplying cities. That ordering is
  the team's delivery sequence relative to the older S2/S3 status sequence.
- User clarification: guidance serves English and Chinese audiences; the first
  playable validates the quality of executed art and the fluency of interaction.
  A static frame, green checks or working buttons alone cannot pass this milestone.

## 5. Phases and sprint backlog

Sprints below are ordered delivery units, **not calendar estimates**. No dates,
asset purchases, external staff or field-test availability have been assumed.
Set the next sprint's timebox from available capacity, then estimate from measured
asset/content throughput. Later city and multiplayer work remains a coarse backlog.

| Phase | Sprint | Demonstrable outcome | Lead roles | Dependency / exit |
|---|---|---|---|---|
| 0 · Align | SP0 · Definition | Source-grounded scope, approved options, team and risks | Producer + all | Complete: recommended package approved with bilingual guidance and art/fluency emphasis; operational dates/resources remain unset |
| 1 · Visual foundation | SP1 · Art target | Actual-size target frame and opening/interaction/visit-card storyboard for the real block, in both English and Chinese; limited asset vocabulary | Art + world | Approved direction; user reviews recognizable place/style, player, walkable area and possible action before broad asset production; concept approval is not first-playable acceptance |
| 1 · Visual foundation | SP2 · Rendered block | Integrated melonJS scene with sourced road/sidewalk/crossing geometry, recognizable frontage, signs, actor and depth ordering | Engineering + art + world | SP1; real browser review, readable names, visible actor, correct occlusion, coherent camera; existing three south placeholders retained honestly; carried-forward offline single-file `file://` build works with inlined assets; integer simulation replays to the same state |
| 2 · Playable loop | SP3 · First playable: meaningful encounter | Integrated rendered block, sourced choice, English/Chinese goals and controls, and visit-card payoff | Design + art + world + engineering; QA reviews | SP2 and sourced venue/access; implemented art and fluent interaction must both pass the first-playable brief; player understands choice/consequence and sees visit/route update; retain the separate 30-second fresh-user discoverability and first-input checks; only the 90-second reward probe is diagnostic |
| 2a · Current visual iteration | V3D-0 → V3D-3 · Vivid three-dimensional Kyoto | Blender/browser proof → camera contract and art kit → integrated 3D encounters → polish and acceptance | Art + engineering + design + world; QA independent | New user priority before SP4/SP5; see current-iteration table above and [research plan](blender-depth-research.md); first-playable regression/EN-ZH/source boundaries retained |
| 2 · Playable loop | SP4 · Play to guide | Save/resume, chosen visit order, one-click personal guide and a small travel keepsake | Engineering + design; QA accepts | SP3; two different journeys produce matching different outputs; reload preserves state; phone/print guide works offline with complete required glyphs |
| 3 · Gate 1 | SP5 · Complete agreed street scope | Twelve real destinations with evidenced access and meaningful content; usable end-to-end route; correct applicable durations, hours, cost and next-leg facts | World + engineering + art | Approved Q2 definition; no fabricated entrances to meet a number; documented corridor coverage; source freshness/unknowns reviewed |
| 3 · Gate 1 | SP6 · Human and field validation | Browser traversal and a recorded real Kyoto walk using the exported guide; fix discovered blockers | QA + world + producer | SP5 and approved Q5 criterion; named tester/date still needed under Q4; separate visual, playability, factual and field evidence must all pass |
| 4 · Complete one-city experience | SP7 · Photo memoir | Player adds a real photo to the corresponding journey/place, revisits and exports the memoir | Design + engineering + art | SP4; storage model settled before build; real photo persists after reopen with correct association and deletion/replacement behavior |
| 4 · Complete one-city experience | SP8 · City alpha | Coherent multi-day loop, supported cultural interactions, readable language progression, sourced time/cost choices, satisfying journey ending | Design + world + engineering + art | Gate 1 evidence and memoir; no required live AI; pacing and repeat-play evidence; original 4–10-hour target remains unproven until tested |
| 5 · Replication | SP9 · Second city | Same product loop using a new city/style/content pack | World + art + engineering | One-city quality accepted; measure actual production cost; second city works through data/style/content changes only; any required runtime code or new tile type fails replication and must be repaired before SP10 |
| 5 · Replication | SP10 · Reach 3–5 cities | Agreed additional cities meeting the same game and guide standard | Producer + world + art + QA | Select cities/count after SP9 economics; do not promise dates before that measurement |
| 6 · Friends and release | SP11 · Play together | Agreed cooperative journey, consistent shared choices and individual/shared guide/memoir behavior | Engineering + design + QA | Solo product and city pipeline accepted; multiplayer model, group size, host/disconnect rules agreed first |
| 6 · Friends and release | SP12 · Release candidate | Accepted target browsers, stable saves, usable offline outputs, polished content and release package | QA + producer + all | No unresolved blocker against agreed release criteria; multiplayer recovery checks; release branch from iteration, stable release only to master |

No sprint passes solely because it ends. If its outcome is not demonstrated,
repair or rescope explicitly before starting dependent work. SP7 may proceed
while arranging SP6 logistics, but that must not imply the field claim passed.

## 6. Clarifications and boundaries

**Answered by the user on 2026-10-05: use the recommended options**, with English
and Chinese guidance and explicit first-playable art/fluency validation. The
table records decisions; the absence of dates/budget/testers is not an approval
to invent them. The first-playable acceptance brief is linked below.

| ID | Decision | Approved choice / impact | Remaining action |
|---|---|---|---|
| Q1 | Visual direction | Detailed recognizable stylized Kyoto 2.5D; high-quality implemented art is required | Produce target frame, then review corresponding browser implementation |
| Q2 | First playable and place counting | Smaller polished block with complete sourced encounter first, retaining 12 real destinations later; repeated doors/placeholders do not count; art quality and interaction fluency are both first-playable requirements | Source the selected encounter; pass the first-playable brief before expanding |
| Q3 | Player guidance | Clear objectives/contextual controls in complete English and Chinese UI suites; optional exploration assistance; Japanese world signs remain authentic | Review both locales for parity, readability and smooth interaction; default to state-preserving language selection |
| Q4 | Delivery/resources | Quality-led milestone delivery, existing/free assets first; estimate later work from throughput | Dates, paid budget and human testers still unset; arrange before dependent scheduling/field work |
| Q5 | Real-world acceptance | First-time visitor completes agreed route and activities without required outside research/guide; record factual errors, abandoned actions and confidence separately | Specify selected route and schedule independent field session |

The [first-playable brief](first-playable-brief.md) defines the art and interaction
review. English/Chinese selection is an implementation default; the user requires
both suites, not simultaneous duplicate text on every screen. Changing UI language
must preserve progress and must not change Japanese world facts or learned content.

Decisions to resolve when they become actionable, without blocking the art review:

- Route endpoints/length and venue selection: inherited documents mix
  approximately 2 km, a 1,600 m grid and a different measured centerline length.
  Reconcile measurement conventions first; ask the user only if intended coverage
  must change. Geometry cannot be falsified to fit a budget.
- Memoir storage: local import versus account-backed/cloud upload, cross-device
  behavior and photo retention. The SOW's “upload” needs this product definition
  before SP7; no backend scope is silently assumed.
- Cultural/language mechanics, complete-city playtime, performance budget and
  target browser/device list: design proposes measurable contracts before the
  corresponding implementation. The historical 30-minute “want to continue”
  probe is a design proposal, not a user-approved pass percentage.
- City selection and exact 3–5 count follow SP9; multiplayer interaction model,
  party size, account/network needs and shared ownership precede SP11.
- Third-party review text remains unresolved in conflicting old notes. Do not
  import it; any later request requires an eligible source and explicit scope.

Settled items are not new permission requests: approved Q1–Q5 choices, engine
selection, desktop game/mobile guide, English and Chinese audiences, south
placeholders and official long text.

## 7. Completion standard and working rhythm

For each sprint, the ticket names its player outcome, dependencies, exact file
owner, independent reviewer, demonstration and failure condition. At kickoff,
assign human acceptance dates; until then the criteria above are **unscheduled**,
not completed or active experiments. Approval of scope is not evidence of quality.

The team reports what the player can now do, what evidence supports it and what
still fails. Review in a real browser for visual/UI claims; the existing VM/DOM
stub checks cannot prove readability. Preserve existing integrity checks without
skips; adapt conflicting prototype checks intentionally when the engine changes.
Do not add a new gate framework or use assertion counts as progress.

Human tests use a frozen build and a recorded route/task. A repeat participant
can judge art but cannot stand in for a fresh first-use tester. Field evidence
separates wrong guide facts from normal pauses or personal choices; use the SOW's
24–48-hour follow-up against specific events. A fluent observer, if available,
can catch incorrect facts a visitor would not recognize. Agents cannot claim
this test has occurred without the external evidence.

At each demo: QA reviews independently, design/art assess the player experience,
and producer records pass/fail and the next highest-value correction. The approved
interim milestone does not reduce the final SOW. External spending, publication
and production release are not performed by this planning update. Work branches
start from `iteration`; `master` remains the stable
release line under [branching-model.md](branching-model.md).

Historical board and task-1…task-18 records remain available in Git at the
baseline commit. This board replaces their stale “current” summary; it does not
rewrite their history or the SOW.
