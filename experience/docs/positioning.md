# Product directions to explore

2026-10-07 · Owner: product-design · Exploratory team recommendation; no new runtime delivered.

## Start from the experience, not a fixed product category

The user explicitly released the SOW as a binding product-design constraint. It remains a record of
initial ideas; game-first, itinerary generation and traveler preparation can be reconsidered. We can
seek delight, connection or memory without requiring a booked trip, a planning output or even a
permanent commitment to the label “travel game.” Existing implementation still gives us a useful
place to prototype, rather than a requirement to keep adding features to its original loop.

The latest signals are distinct: recognition of a real place is affirmed qualitatively; menu-choice
value is weak; the small street feels limited beside the referenced games; and the user likes the
idea of their own and other travelers' footprints. Live-browser A is favored informally. The earlier
“roughly 60% positive feedback on realism” has an unknown denominator/method and is not a fidelity
score or formal recognition result. Keep B as a reference unless the user retires it.

The question to explore is now: **can another person's way of noticing a real place make it more
interesting to me, and give me something of my own to leave there?** Orientation and real travel
can be useful consequences, but they are not the sole reason for the experience to exist.

## Three materially different hypotheses

These are alternatives to investigate, not three feature packages we have committed to build.

| Hypothesis | Experience and primary value | Small experiment and decisive evidence |
|---|---|---|
| **A · Borrow someone’s eyes — recommended** | Encounter an explicitly shared view, follow what caught that person's attention, discover a detail and hear their short personal remark. Frame your own view and optionally leave a sentence. Value: attention, curiosity and a feeling of human connection. | One short connected walk with a shared view/remark and an optional personal response. Does the recipient notice something new, explain why that perspective mattered, or want to offer a different observation? A generic fact popup or an anonymous decorative marker does not prove this hypothesis. |
| **B · Curiosity-led discovery** | A recognizable place becomes a small visual discovery: look from another angle, notice a pattern or follow a spatial clue. Value: playful investigation, even alone and without a travel plan. | One environmental discovery with a readable reveal and an optional continuation. Does exploring the space produce enjoyment or understanding that merely reading the answer does not? No copied combat, loot economy or menu quiz is needed. |
| **C · A place to return to** | Keep a view and a personal thought, then revisit how the place or its meaning has changed for you. A later physical visit can add a reflection, but is optional. Value: personal memory and continuity. | One private place capsule and one actual return, if a participant is available. Does it recover a meaningful memory or invite a new observation? A saved log that the person finds no reason to reopen does not establish value. |

Choose A for the next small prototype because it directly develops the user's interest in other
people's footprints and tests a purpose beyond planning. B or C may be stronger after evidence;
we should be willing to change direction. No uniqueness or market-advantage claim follows yet.

## Recommended prototype: one shared look, one personal response

Use one recognizable place and a short coherent approach, discovery and departure. A shared moment
invites the player to pause and look up or turn toward a specific feature. Let them notice it, then
reveal the author's short remark. They can continue their curiosity, frame a view of their own and
leave one sentence privately. This is an invitation, not a compulsory tutorial or a completion gate.
Include contrasting viewpoints and a readable reveal/ending, rather than another isolated turntable
or card. Test this experience depth before committing to a larger district; do not assume today's
64 m strip is sufficient. Source any required connected extension before implementing movement.

The first expressive medium is **a view plus short text**. Photo, sketch, audio and longer story are
possible later forms, not simultaneous requirements. An intentional viewpoint/moment is sufficient;
a full path recorder, city simulation, social feed, route planner and new camera technology are not
prerequisites. Reuse working navigation and sharing patterns where they serve the experience.

Use an explicitly shared contribution from an available person, or clearly label a team-authored
example. A staged example can test interaction/readability, but cannot prove connection with another
traveler. Never fabricate a person's visit, remark, popularity or live presence. The player controls
whether their own view/text stays private or enters a reviewable share; opening someone else's
moment records no visit or contribution for the reader.

The proposed loop is: **recognize → encounter a shared perspective → follow curiosity → notice →
leave an optional personal mark → another person gains a way to notice**. A later real visit and
reflection can close another loop, with no GPS tracking, trip booking or planning output required.

A short demonstration should show that sensory sequence using real browser moments. Until the
prototype exists, label it as a concept. Do not stage a feature the current build lacks or splice the
separate Ginza reference into a Kyoto walk as though the locations were adjacent.

## What the current build does and does not establish

| Status | Scope |
|---|---|
| Delivered | The Kyoto slice has guided exploration, three sourced encounters, EN/ZH, notes, authored day/night and selected-note link/PNG/print recaps. See [delivery](iteration.md) and [validation](validation.md). The user accepted fluency/guidance for the build they played. |
| Limitation | Its 64 m strip/one crossing and encounter-choice recap do not yet offer a richer connected travel experience, arbitrary shared viewpoints, continuous footprints or another person's perspective. Expanded background geometry is not expanded navigation. |
| Proposed now | The small shared-look prototype and experience tests. Existing note/preview/recipient patterns can help, but their three-ID, choice-required recap model is not already a free personal-moment system. |
| Open | Whether the best experience is social, exploratory, reflective, useful for travel, or a combination; whether 3D participation adds value; whether people want to contribute or return. |

A footprint can mean a deliberately marked moment, not necessarily a movement log. If path recording
is useful later, start private and never invent old paths from existing encounter saves. Keep virtual
exploration, explicitly shared personal material, user-reported physical visits and sourced place
facts distinct. A personal story does not verify opening hours, access or historical claims.

## Three proposed exploratory sprints

These replace the earlier proposals. They test A only and add no roadmap layer, fixed dates or
full-city promise. Content/art establish the place and contribution rights; engineering implements
only what the experience requires; product and QA observe it with available people.

| Sprint | Small deliverable | Decision evidence |
|---|---|---|
| 1 · Discover through a perspective | A short connected approach → shared look → observed detail → personal remark → continuation/ending. Confirm supported geometry/access before extending the walk. Use a consented contribution or a clearly labelled authored example. | Can someone find the invitation and notice the detail without coaching? Do they describe curiosity or a changed way of seeing, rather than merely reading another card? If the space remains a disconnected facade, revise the experience before increasing content volume. |
| 2 · Leave something of your own | Frame a view and add a short private sentence without completing a menu choice. Reopen, edit or remove it; preview exactly what would be shared. | Does the person have something they want to express and understand who can see it? A forced submission or generic task answer does not establish authorship value. Retain the option to enjoy the walk without contributing. |
| 3 · Another person receives it | An available recipient opens one explicitly shared moment, explores its context and may leave an optional response. Observe later virtual return or real-world follow-up only if naturally available. | Does the recipient gain a specific way to notice, feel a connection they can explain, or want to explore further? Does the author care about the response? If nobody is available, mark this human evidence pending rather than claiming a social result. |

The next deliverable is the **small connected shared-look prototype**, not all three hypotheses.
Its exact place/contribution depends on evidence and availability. It will not by itself settle the
broader complaint about travel depth; that remains a separate question if people want a longer walk.

## How could this matter outside the screen?

| Perspective | Possible effect to investigate | Limit |
|---|---|---|
| Person exploring now | Enjoy a new perspective, feel connected to someone, remember a detail or express a thought | Valuable without a trip. Delight/connection require the person's evidence, not interaction counts. |
| Optional future visitor | Recognize the place, orient or approach a useful action with more context | Secondary measurable benefit. Compare unseen-photo/map transfer separately from an actual field visit; no field-ready-guide guarantee. |
| Contributor or friend | Have a personal way of seeing understood; exchange a considered moment or trail | Explicit sharing and clear origin/status, no popularity ranking or co-presence promise. |
| Place/community | Potentially different attention or behavior from visitors | Unproven. Revenue, footfall, crowd distribution and cultural understanding need separate evidence from people and places. |

## What would change our minds?

Compare the same personal moment in the 3D scene with a static view/story card, and with a scene
containing the same factual information alone. Record what was noticed, enjoyed, remembered or
expressed, plus assistance and confusion. If a static card provides the same value with less friction,
consider a simpler format. If this is only clicking map facts or menus, we have not proved that play
adds value. Do not protect the “game” category from that result.

Record familiarity before testing. Keep virtual recognition, reported connection/confidence,
unseen-photo/map transfer and actual field use separate. A title-only place guess, unsupported detail,
confusion between virtual and physical presence, or an involuntary disclosure is an actionable failure.
A voluntary response or return is useful case evidence, not proof of retention. No invented success
rate, participant count or conversion target should be derived from the reported “60%.”

## References and parallel work

Minecraft suggests agency; Terraria suggests rewarding discovery; Animal Crossing suggests personal
attachment; The Sims 4 suggests personal stories; Scriptum suggests situated investigation. These
qualities inspire experiments without importing construction/destruction, household simulation or AR
room scanning. [Nintendo](https://www.nintendo.com/en-ca/store/products/animal-crossing-new-horizons-switch/)
and [EA](https://thesims-api.ea.com/game-info/overview) frame their titles as life simulation, not native-VR requirements.
[Scriptum](https://www.adver2play.com/Scriptum/) is a historical AR-room-puzzle reference from indexed
developer text; live page access/current installability was unverified on 2026-10-07. Travel preview,
virtual exploration and real-place 3D also overlap with [Google Maps](https://blog.google/products-and-platforms/products/maps/google-maps-october-2023-update/),
[Wander](https://www.parklineinteractive.com/) and [BRINK](https://www.brinkxr.com/); no uniqueness claim is established.

The selected [Ginza/Wako study](recognition-study.md) remains a parallel bounded architectural task:
three live camera views for building-feature recognition, with no Ginza walk, venue or second-city
game. It does not decide the product's purpose or prove the shared-perspective hypothesis.
