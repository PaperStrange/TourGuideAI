# First playable · art and interaction brief

Updated 2026-10-05. Owner: `art_ux`. Planning baseline: `eae982f4ba20a107bf21a35b70f635b4935a4c70`.
Status: approved product direction; integrated runtime and review captures now exist; **user visual acceptance remains pending**.
This is the SP1 design brief and the acceptance contract for the first playable after runtime integration.
It does not claim SP1 alone completes the first playable or the full Gate 1 street/12-place goal.

## 1. Approved outcome

Deliver a small, source-faithful Kyoto/Shijo experience in **detailed stylized 2.5D**.
The first playable must independently demonstrate **high-quality executed art AND fluent interaction**.
Objectives and contextual controls support **English and Chinese**; China is one target market.
Prose agreement on a style is not approval of an image, and an approved image is not approval of a game.
Carry forward desktop-first gameplay, phone/print offline guides, melonJS as the selected foundation,
and retained south-side interactions with honest “content in development” feedback.

## 2. Smallest useful experience

Sequence: orient in the street → choose a nearby sourced target → approach → read a contextual action
→ interact → understand a useful discovery → close the card → resume movement → see visit state retained.
Show a recognizable player, readable pedestrian space/crossing/frontage, sourced place identity,
and an immediate purpose. The first destination and spawn must be composed together on actual geometry.
Use one genuinely useful, source-supported encounter before multiplying doorway receipts.
If content supports only a building name/location, label the result a wayfinding demo; it is not a completed venue experience.
Also exercise a retained south-side placeholder as an honest unavailable-content state, separate from the useful encounter.
Do not add deadline pressure, fabricated prices/opening hours, imagined tenant-door mappings or invented interiors.

## 3. SP1 package and first-playable follow-through

The first four artifacts belong to SP1; the live demo follows runtime integration and is required for first-playable acceptance.

| Required artifact | Must show | Review purpose |
|---|---|---|
| Source/reference board | Exact chosen block; support for geometry, frontage, crossing, signs and destination; unresolved details marked | Establish what the scene may truthfully represent |
| Actual-size opening target | Intended viewport/scale; player, street identity, purpose and possible action; selected detail/palette/depth treatment | User judges visual direction before broad asset production |
| Approach → interaction → visit-card storyboard | Prompt boundary, action/feedback, card close/resume, useful discovery, separate visited/verified states | Design the complete interaction rather than a static opening |
| Paired English/Chinese states | Equivalent opening, prompt, card, unavailable/empty/error and source-detail states at the same size | Review completeness, layout and meaning in both suites |
| Corresponding live browser demo | Same scene and interaction chain using the implemented assets, camera and controls | Judge executed quality and fluency after integration |

The paired language artifacts are review evidence; they do not require simultaneous bilingual gameplay.
Record approved reference/version, viewport and any accepted compromises so runtime comparison is meaningful.
Opening, approach and bilingual visit-card frames now exist in the integrated browser build.
They are the current implemented-art review proposal, not a previously user-approved concept frame.
See [visual target](visual-target.md) for inspected build evidence, concrete findings and remaining acceptance limits.

## 4. Art and camera execution

Build from supported street structure and names, then add licensed visual treatment appropriate to that block.
Generic “Kyoto” lanterns, wires, shrines or shopfronts must not imply unsupported location facts.
Keep unknown authored details distinguishable in production records; never promote decoration into guide facts.
Define only the tile/sprite sizes, facade pieces, palette and layering needed for this scene before expanding a library.
Do not settle final framing using the old orthographic camera's row arithmetic: validate the selected 2.5D projection.
Keep the actor findable during walking/occlusion; preserve readable signs and stable scaling; avoid camera hunting.
Existing pixel constants are implementation inputs to reconcile with the approved frame, not proof of visual quality.
Use sourced world names and Japanese signs faithfully; do not invent a translated business name to fit a label.

## 5. Interface, localization and accessibility

Implementation choice: ship selectable, complete English and Chinese UI suites with both catalogs available offline.
Switching language preserves position, target, route/visit progress, any implemented learned-glyph state and any open interaction.
Translate objectives, controls, feedback, loading/errors, empty states, placeholders and source-detail labels.
Japanese source signs and factual names retain their source meaning; locale switching grants no learned glyphs.
Suggested generic copy: “Explore the nearby places” / “探索附近地点”; “E · View details” / “E · 查看详情”.
Use wording that matches the implemented action; route-added feedback appears only when a route entry actually exists.
The visit card foregrounds the place and useful discovery. Distinguish “visited” from “verified” with text and shape.
Put source/date detail behind an accessible disclosure; keep raw IDs, diagnostic counters and provenance enums out of default UI.
All actions and disclosures must work by keyboard with visible focus; card close returns control predictably.
Do not rely on color, sound or animation alone. Text must remain legible and unclipped in both suites at the review size.
If animation/camera easing is used, provide reduced motion without losing necessary state feedback.

## 6. Observable failure conditions

| Area | Fail or remain unaccepted when |
|---|---|
| Executed art | Runtime falls back to empty slabs/placeholder blocks; composition, detail density, signage/props, palette or depth visibly miss the approved target; compromises are undisclosed |
| Place readability | Reviewer cannot associate the scene with the referenced street; player, walking space or actionable target is unclear; label/prompt/card refer to different locations |
| Scene integration | Actor/door ordering contradicts foreground geometry; actor becomes unfindable; labels obscure the player or action; camera jumps/oscillates or scaling makes signs unreadable |
| Movement and focus | Movement continues after release or while a blocking card is open; close loses focus/position; controls remain stuck; language switching resets the journey |
| Interaction | Prompt offers an unavailable action, flickers misleadingly or selects the wrong target; opening needs unexplained retries; one press causes duplicate actions; closing immediately reopens the card |
| Feedback and recovery | Input has absent or visibly delayed feedback, unexplained stalls/hitches interrupt the chain, result is unclear, or the player cannot understand how to resume |
| Locale/accessibility parity | Missing/untranslated UI, clipped or missing glyphs, changed factual meaning, keyboard traps, invisible focus or color-only statuses prevent equivalent use |
| Evidence | Only a concept/screenshot, source data, green technical checks or a recording without a matching runnable build and actual browser/human review is supplied |

## 7. Acceptance and evidence

Keep three recorded decisions separate: **concept direction**, **implemented quality**, **user acceptance**.
Art/UX prepares the target; engineering implements it; QA independently observes the browser; user accepts product quality.
Compare approved target and actual runtime at matching viewport/scale, then judge the scene while moving/interacting.
Capture the complete chain in each locale with build identifier, selected route/target, viewport, input method and screen/input evidence.
Both executed art and interaction fluency must pass; strength in one cannot compensate for failure in the other.
Retain the 30-second fresh-user next-action probe and first-input response; the 90-second reward probe remains diagnostic.
Record actual stalls, mistaken inputs, confusion and recovery. These probes do not replace the full fluency walkthrough.
If one participant tries both locales, only the first exposure supports fresh-user discoverability; the second tests parity/fluency.
Do not invent FPS, latency, sample-size or satisfaction guarantees; record observations and resolve material failures before acceptance.
Use existing regression checks for their technical contracts; do not add a script that declares art quality or human acceptance.

## 8. Operational dependencies and handoff

- World/content owner: select the sourced encounter, substantiate entrance/content claims and resolve geometry needed by the frame.
- Art/UX owner: produce the reference/target/storyboard and confirm usable asset rights; procurement remains separately authorized.
- Client/runtime owner: integrate the scene, localization, input/focus/camera and state preservation in the isolated game workspace.
- QA + lead: schedule the user review, name the participant/date and collect evidence for both locales on the same build.
- Lead: register new-file ownership and reconcile sprint tickets; existing file owners retain their boundaries.

References: [delivery board](delivery-board.md), [SOW](SOW.md) §§4.1a/6/10,
[failed P1 trial](p1-trial-01-result.md), [visual specification](appendix-visual-and-ui-spec.md),
[foundation decision](foundation-research.md), [file ownership](file-ownership.md).
