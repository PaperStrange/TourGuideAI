# Reviewed area packs · Ginza/Wako · 2026-10-19

Status: plan recorded before production. The user approves consistent map styling
and reviewed neighborhood/landmark packs, with Shijō's 3D interaction preserved.
Lead commits this plan before implementation and owns integration/publication.
This milestone delivers a reusable pack system and one second bounded walkable
area: **Ginza 4-chōme / Wako (SEIKO HOUSE)**. All delivery checks below are pending.

## Player outcome and boundary

From the existing shared-style map, deliberately open the reviewed Ginza walk.
Approach one Wako frontage, round its convex corner and discover the second wing.
Walking and changing the viewpoint reveal the tower, curved wall, window recesses
and material response. Look closer is optional. Choose a pause, retain a private
view with optional words, explore elsewhere and return to that exact area/view.
Existing Maps handoff retains the real selected place and intended stop order.

Both Shijō and Ginza support walking, rotation, tilt, inspection pan, zoom, day/night,
optional source-backed surface inspection and private keep/return. The player owns
the approach and camera; opening a detail requires an explicit action. A view,
saved intention and simulated walk do not automatically establish a real visit.

The new route follows one source-supported, same-side sidewalk around Wako.
World's connected OSM chain is ways `211774044` v8 → `667867139` v3 → `522859644`
v5, with bounded nodes `5091948700` → `6272872988` → `2135828626` → `2217343249`
→ `9926470824`. Its source-derived centerline length is approximately **55.28 m**.
Collision width, kerb clearance and simulation treatment are authored. The route
has no surveyed-access or current-opening guarantee; road crossings, station
access and building interiors are outside the playable boundary.

Official building dimensions supplied for the source review are **30.30 m roof
height plus 9.09 m clock tower**. World preserves the exact official source and its
meaning in the pack evidence. Art retains that hierarchy instead of interpreting
the older OSM height tag as tower height. The [recognition study](recognition-study.md)
supplies the licensed 2024 reference and architectural anchors; this milestone
adds an independently reviewed walking boundary to that earlier camera study.
Unseen detail, historical reference dates and authored dimensions stay explicit.

Global provider maps retain their shared palette and approximate-geometry labels.
The detailed walk is explicitly available for the two implemented areas. Provider
coverage, reviewed simulation surfaces and Maps-computed directions retain their
separate meanings. Replay remains conditional Sprint 2B work. The existing local
backend remains sufficient; this milestone requires no new hosted service or key.

## Baseline and continuity

Runtime `a1dbd36298e56109a396d2df1a9031851859b3c9`, CI/test source
`02c2d63ff407f706054d1029ebee46b39216a01d` and package
`0a6244091b50c9ee7220d698e1109c86bd397dba54384c8db20e68bc57c728e7`
form the release baseline. [Completed CI](../evidence/solo-20261018/ci/completed/README.md)
records original walk **133/133**, extended walkthrough **264/264**, solo **75/75**,
homepage **65/65**, perspective **80/80** and companion **73/73**. All five jobs
succeeded; counts overlap. Pages `9e8ecadd…` serves the 90-file verified package.

Freeze existing Kyoto model, textures, actor and lighting-profile hashes. Preserve
its current simulation behavior, camera interpretation, old routes, localized
links and recipient experiences. Existing untagged solo street records resolve
explicitly to `shijo-karasuma` revision 1; historical shared views retain their
interpretation. The new pack is `ginza-wako` revision 1. New captures use
`{version: 3, packId, revision, player, camera}`; existing v1/v2 views normalize only
under the Shijō default. The storage envelope remains version 1. Unknown or incompatible packs keep
the saved record intact and show an unavailable state. They never restore a pose
inside a different area or erase unrelated records.

## Phases, sprint tickets and owners

One integrated milestone is in progress. These phases are ordered work boundaries,
with no promised calendar dates or velocity. Root confirms exact file ownership
before production; reviewers report findings to the owner.

| Phase / ticket | Owner → reviewer | Exit and dependency |
|---|---|---|
| 1 · P00 Source and production lock · P0 | World + art → engineering + product + root | Preserve source versions, official dimensions, licensed references, route centerline, authored width, inspection features and source uncertainty. Freeze Kyoto asset hashes and the proposed resource caps below. Required before new geometry/navigation. |
| 1 · P01 Baseline and fixtures · P0 | QA + root → engineering | Bind current package and real legacy save fixtures; retain EN/ZH desktop/phone and day/night poses. Record actual baseline resources and open Q03 timing conditions. |
| 2 · P02 Pack definition and lifecycle · P0 | Engineering → root + QA | Versioned registry/definition supplies identity, coordinates, model/profile, navigation, camera and feature data. Existing Shijō and Ginza load through one lifecycle, with their own movement strategies. Latest intent wins; canceled loads cannot become active. |
| 2 · P03 Ginza art and navigation · P1 | Art + engineering → world + product + QA | New model/profile and finite-width reviewed route support the connected frontage/corner approach. Optional surface inspection follows actual visibility. Three source-matched poses and a moving lateral pass satisfy the art gates. Depends on P00/P02 interfaces. |
| 2 · P04 Homepage and private return · P0 | Root → product + engineering + QA | Clearly enter/leave the available detailed pack. Keep/reopen pose, day/night, note, source identity and selected order. Migration preserves old Shijō saves; mismatches expose recoverable unavailability. Depends on P02 capture/restore identity. |
| 3 · P05 Pack walkthrough and resources · P0 | QA → engineering + art + product | Actual cross-area keyboard/touch journeys, failure/cancellation tests, matched visual review, resource lifetime and performance evidence on immutable bytes. Depends on integrated P02–P04. |
| 3 · P06 Review, commit and publication · P0 | Root → QA + product | Resolve release blockers, commit coherent changes, run appropriate regressions and publish exact-byte/hosted checks with limitations. Record actual content/art/engineering/review effort and recurring costs. |

Root owns homepage and solo integration. Engineering owns runtime/simulation,
perspective adapters and the pack registry/core definition. World owns provenance,
content and pack-source JSON. Art owns the new generator/model/profile. QA owns
focused browser verification; product owns experience criteria and read-only UX
review. Art/runtime/source work may run in parallel after interface agreement.
Browser/GPU windows remain exclusive; no owner edits another owner's files.

The agreed Ginza local origin is node `2135828626`, latitude `35.6714369`, longitude
`139.7650181`. New assets live under `public/packs/ginza-wako/`, including
`scene.glb`, `lighting.json`, `materials.json` and manifest/provenance records.
Engineering owns the lightweight registry and its `getPack`, `getPackForPlace`,
`listPacks` and `getPackPlace` interfaces; root consumes these for UI and saves.

## Acceptance gates

**Walking and continuous response.** Start on the actual simulated sidewalk,
approach the first wing, follow the bend and choose a pause on the other frontage.
Movement stays within the pack's authored corridor and visible obstacles. Pointer
travel follows the route's turns. Walk/orbit/tilt/pan/zoom remain under direct
control; inspection never auto-frames or completes a visit. Check visible, occluded
and out-of-range detail cues while moving. The changed viewpoint must reveal a
spatial/material difference before optional explanatory text is opened.

**Architecture, materials and light.** Freeze arrival, oblique corner and chosen
pause poses, viewport, model/profile hashes and capture conditions. Compare with
annotated references at desktop and phone scale. Tower placement, convex corner,
window hierarchy and cornices must read beyond names/logos. A lateral move must
expose recess/frame depth and changing glazing. Reuse the shared finish machinery
with Wako-specific surface treatment grounded in its source review. Repeat approach
and pause by day/night: shadow direction/contact remain coherent; columns, reveals,
actor and pavement remain legible. Preserve Kyoto's approved assets and matched
appearance. Human recognition and emotional value remain separate pending evidence.

**Cross-area continuity.** Exercise seeded legacy Shijō → Ginza → map → reload →
saved Shijō → saved Ginza. Compare pack/revision, pose, lighting, note, source ID,
coordinates and selected stop order. Open Maps and inspect its actual destination
coordinates/order. A representative source point carries its stated precision;
it does not become a claimed entrance. Reordering or changing a map view must not
silently reinterpret another saved street view. Private records stay independent
of Together and existing perspective/companion storage.

**Cancellation and recovery.** Change the selected pack while its model/profile
loads, return to the map, then select the other pack. Only the latest intent may
draw, apply lighting or restore state. Test actual asset denial and deliberate
retry, unsupported pack/revision, storage failure and interrupted restore. Keep
saved data readable and retain a usable navigation/retry action. Destroy/abort
replaced instances and their event listeners; old completions cannot overwrite
the active scene, route or status.

**Bilingual and accessible interaction.** Complete the same journey in EN/ZH,
desktop keyboard and touch phone viewports. Provide equivalent keyboard camera
and inspect actions, visible focus, readable loading/error/selection state and
touch guidance that coexists with page scrolling. Language changes preserve area,
camera, note draft and journey. No essential cue depends only on sound or color;
respect reduced-motion behavior. Proper names and original source text retain
their identity without leaking untranslated interface instructions.

**Resource and cost discipline.** Proposed marginal production caps are **≤8 MiB
for the new model plus place-specific maps**, **≤100,000 triangles** and **≤64
mesh/material batches**. Measure exported and loaded assets before accepting these
caps; report shared assets separately. These caps are production controls, not
hardware-performance guarantees. Fetch new-area geometry only after deliberate
selection. Together initially fetches zero detailed-street dependencies; inactive
scenes perform zero updates/draws over two seconds. Record repeated-switch renderer
resources, requests, disposal, decoded bytes and first-visible-frame readiness;
resource ownership must remain bounded across return cycles. Log source curation,
art/export, engineering, localization and review effort plus rework. Preserve the
[coverage research](solo-coverage-research-20261018.md) distinction between public
service fees, availability, rights and actual production cost.

**Q03 remains open P1.** The latest matched warm Together locale observations are
**1121.1 / 1221.9 / 1097.9 ms**. The unchanged exit is each of three matched actions
**<500 ms**, using the same action start/end, browser, viewport, cache and provider
conditions. Record each observation with package identity and separate shell,
map, scene and interaction timings. Reduced work or smaller assets do not close
this latency gate. A functional pack release must report the unresolved result.

## Failure exits and review decision

Block release for corrupted/lost private state, cross-pack pose restoration,
wrong real-place identity, unusable walking/camera controls, hidden architectural
anchors, failed cancellation/disposal or changed Kyoto appearance outside scope.
If the connected source boundary or rights cannot support the selected experience,
stop new-area production and retain the usable existing release. Resource-cap
failure requires asset revision or an explicitly documented lead decision before
release. Do not silently weaken the caps or replace the walk with a turntable.

Observe whether an available person notices a sourced feature through movement,
chooses a personally meaningful pause and wants to return. Record familiarity,
device, assistance and their reason; compare the same fact/story in flat media
where useful. No participant count or success rate is invented. Agent verification
establishes delivered behavior and reviewed art; human recognition, enjoyment and
meaning remain unproven until observed. Sprint 2B replay requires that experience
evidence and its own bounded plan.

Final evidence identifies source/package, source/asset rights, actual browser and
resource results, art judgments, hosted-byte verification and every open gate.
Root owns the final release decision, checkpoint and publication.
