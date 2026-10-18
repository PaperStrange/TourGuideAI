# Solo exploration · 2026-10-18

Status: plan recorded before production; source implemented, S06 browser/art review
pending. Lead owns integration and release; this document defines the reviewable
slice and its decision gates.
The user authorizes the next iteration and research into broader solo travel while
preserving art, quality and usable interaction. Sprint 2A is active; 2B replay
remains conditional on the experience evidence below.

## Goal and player sequence

Let a person follow their own curiosity, inspect a recognizable place and keep a
view or journey they want to return to. Deliver one connected solo flow through the
existing homepage, with detailed Kyoto and wider map coverage clearly identified.

1. **Explore Kyoto freely.** Walk and turn toward either frontage. A source-backed
   facade detail becomes readable through position and viewing angle. A restrained
   inspection cue follows actual visibility; the player can keep moving or inspect.
2. **Look closer by choice.** Orbit, approach and pause under direct control. Depth,
   glazing and shadows respond to the changing viewpoint. Optional short EN/ZH
   context names what was noticed; opening it does not complete a checkpoint.
3. **Explore another area.** Search or move the wider map, then explicitly choose
   “Explore this area / 探索这片区域”. Existing source providers supply nearby places.
   Panning alone makes no discovery request and does not create a named destination.
4. **Keep and return.** “Keep this place / 收藏这个地点” retains the chosen area/place,
   view and selected stop order in a compact private list. Optional personal words
   explain what drew attention. Reopening restores the appropriate presentation;
   the existing Maps action remains available for an intended real journey.

Saving, reading and planning are optional. Personal significance can come from
looking, noticing or wanting to return; a booked trip is unnecessary. The interface
must offer a worthwhile view before asking someone to organize it.

## Existing capability and bounded change

| Observed source | Consequence for this iteration |
|---|---|
| [Live adapter](../src/perspective/live-view.js) already supports free movement and view capture/restore. [Camera values](../src/runtime/view-state.js) constrain frontage-relative orbit. | Engineering adds opt-in exploration orbit and a versioned private pose. Existing shared-view interpretation remains unchanged. |
| [Perspective saves](../src/perspective/state.js) allow three editorial moment IDs. | Root owns a small independent solo record for arbitrary chosen places/views; existing perspective saves remain readable. A collection does not require an encounter or choice card. |
| [Homepage](../src/home/main.js) searches real centers and nearby places; [world map](../src/home/world-map.js) already shows global provider geometry. | Add explicit discovery at the visible map center and deliberate return continuity. Keep discovery origin, map camera, named selection and selected stop order distinct. |
| Detailed Kyoto, source facts and Maps handoff already exist. | Refine the existing authored setting and reuse the sourced discovery/handoff. Broader map coverage does not establish a walkable reconstructed city. |

Production stays within the current Kyoto navigable surface and existing provider
map coverage. A wider route or additional handcrafted location needs its own sourced
geometry/access review. Replay, public travelers, accounts, paid hosting and model
generation are outside this slice. Local Together remains available and unchanged.

## Ordered tickets and ownership

Each file has one owner. This table describes responsibilities; root confirms exact
file assignments before edits. Reviewers send findings to that owner.

| Ticket / priority | Owner → reviewer | Deliverable and exit | Dependency |
|---|---|---|---|
| S00 · Baseline and continuity · P0 | QA + root → engineering | Bind current runtime/package, prior CI and open Q03 measurements; preserve repeatable EN/ZH desktop/phone starting views and private-save fixtures. | Current published release; no success simulations |
| S01 · Recognizable architecture · P1 | Art → world + QA + root | Refine existing facade/material/day-night assets against the three matched walking poses and detailed art exits below. | Source reference/features agreed with world |
| S02 · Continuous exploration · P1 | Engineering → art + product + QA | Opt-in full orbit and a reusable inspection response based on view, distance and occlusion. Player controls approach, pause and camera. No automatic camera framing or visit completion. | Existing geometry; agreed visible feature IDs and art cue |
| S03 · Explore an area · P1 | Root → world + QA | Explicit visible-area query, source-linked nearby results and useful selected order. Replace an in-flight query safely; an old response cannot replace the newly chosen area. Shared palette retains map readability and attribution. | Current discovery provider behavior and actual map camera |
| S04 · Keep and return · P1 | Root → product + engineering + QA | Independent private records preserve sourced identity or explicitly unnamed area, representation, view and selected stop order; optional words, reopen and remove. Restore Kyoto and map views using their respective schemas. | S02 view API; S03 distinction between query origin and selected place |
| S05 · Breadth evidence · P1 research | World → art + engineering + product | Compare shared-style provider geometry, reviewed area packs, licensed photographs and scans using the evidence questions below; recommend the next bounded production method. | [Coverage research](solo-coverage-research-20261018.md) |
| S06 · Integrated review and release · P0 | QA + root → product + art | Packaged bilingual walkthrough, selected-state/legacy regression, actual visual review and matched performance observations; publish exact evidence and remaining limits. | S01–S04 integrated and frozen |

WIP: one usable release slice. Art, runtime and source research may proceed on
separately assigned files. Root alone integrates homepage, map presentation and
solo state. QA and engineering reserve non-overlapping browser/GPU windows.
Existing tests are extended where they cover a changed behavior; test counts are
evidence of checked behavior and do not establish enjoyment.

## Review gates

**Art and recognition.** Apply the [Sprint 2A art supplement](sprint-quality-20261016.md#sprint-2a-art-review-supplement),
[facade references](facade-references.md) and [art direction](art-direction.md).
Freeze intersection/Mitsui/Daiya approach poses, viewport, model/profile hashes and
capture conditions. Compare annotated source cues at desktop and phone scale:
Mitsui's pale wall, punched windows and curved columned corner; Daiya's vertical
ribs and diagonal columned feature. Review a matched lateral move for sill/reveal/
frame depth, changing glazing and canopy contact shadows. Repeat the same approach
and pause by day/night. Shapes, actor and pavement remain legible; shadows remain
attached and coherent. Indistinguishable facade grids, concealed signature cues,
flat dark panels or obscuring shadow bands fail the corresponding exit. Authored
dimensions and source uncertainty remain explicit. Human recognition is unproven.

**Continuous response.** Walk and look between the agreed features, approach from
different directions, leave, return and occlude the feature. The cue responds to
what is actually visible and becomes inactive when obstructed or outside its valid
view. Use a restrained point/bracket on the visible surface, preserving its material
appearance. Inspection never takes camera control or requires reading before continuing.
Changing position must reveal a perceptible spatial/material difference; more text
entries do not close this gate. Record the useful movement and its visible effect.

**Breadth and return.** Demonstrate two distinct source-covered areas with actual
provider responses. Free panning makes no nearby query; the explicit action uses
the current center. An unnamed center stays an area until a sourced place is chosen.
Keep one map view and one Kyoto view, switch places/language, reload and reopen:
restore the saved representation, framing and selected order without modifying
older journey/perspective saves. Available dates/sources remain visible in details;
saved source snapshots do not imply current opening or access. No GPS or physical
visit is inferred. A failed save never reports success; a failed query retains the
previous useful view and offers a deliberate retry. Source failure does not fabricate places.

**Accessibility and fluency.** Complete the same flow in EN/ZH, desktop keyboard
and touch phone viewports. Camera inspection has a keyboard-accessible equivalent;
touch gestures coexist with page scrolling. Focus, help, selected state and error
feedback remain readable. Respect reduced motion and mute; no essential cue relies
only on sound, color or animation. Original Japanese place identity/source text
remains distinct from translated UI. Restoring a view is deliberate and cancellable
where animated. Camera/map resources suspend while hidden.

**Performance and cost.** Preserve the prior targets: zero initial detailed-street
payload in Together, zero hidden scene updates/draws over two seconds and one
initial Explore draw. Q03's three matched warm Together locale changes must each
remain measured against **<500 ms**; the prior 1177.8 / 1113.4 / 1134.5 ms result
leaves it open P1. Record shell/scene/map/query/interaction timing separately,
decoded payload, model size and visible update work under matched conditions.
No general speedup claim follows from reduced work in one stage. Record actual
asset/source/engineering/review effort and rework, provider requests and deployment
fees; a free provider does not establish free production or assured availability.

**Experience decision.** Independently play the flow and record where movement
revealed something, what was worth keeping and whether returning preserves that
reason. Compare the same detail/story with its existing flat-media form when
reviewing added value. Agent review establishes behavior; enjoyment, affinity and
recognition require observed human evidence with familiarity/device recorded.
Available observations receive no invented sample size or success percentage.

## Breadth research and failure exits

For each production method, record verified rights/attribution, geographic coverage,
recognizable features, navigability limits, source/update freshness, integration
effort, manual art/review work, payload/recovery and recurring service dependence.
Use the same compact area when comparison evidence exists; label estimates and
missing evidence. Keep photos, scans, authored geometry and approximate map volumes
visibly distinguishable. Research findings select a future production method; they
do not automatically add another city or service to this release.

Block release for private-state loss, incorrect-source substitution, unusable
controls, concealed essential features or misleading saved/visit claims. Revise a
failed bounded interaction or art treatment before adding coverage. Carry Q03 as
an explicit P1 until its unchanged target passes, with further breadth production
conditional on measured cost/quality. If moving/looking adds no identifiable value,
record that outcome and revise the interaction before Sprint 2B. Replay remains a
separate conditional slice: actual deliberate approach/pause/view, private review,
optional sharing and recipient control, with its own meaning and size tests.

Release evidence identifies source/package, actual checks, reviewed visual states,
provider conditions and open limits. Root owns checkpoint, publication and final
acceptance. This plan authorizes no agent to edit another owner's files.

## S06 review record · current candidate

Plan commit: `1babfc636c75006550646e371759aa2dba46f77c`.
Implemented source: `1ce9360a89e3ab72943bb2d1876051f80a14bf1e`.
Workspace output `artifacts/solo-unit-20261018.txt` confirms **105/105** unit checks
with zero failures or skips; lead reports **17/17** repository gates.
Actual solo browser behavior, EN/ZH desktop/phone usability, kept-view return and
integrated legacy preservation remain pending. Matched glazing review has not
passed; the corrected treatment awaits the same-pose comparison. Source completion
does not close the art or experience gates. Q03 remains open P1, and root will
record final package/publication evidence after the coordinated review.
