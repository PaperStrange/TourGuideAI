# A believable place, a continuing journey

The user likes the new spatial depth and asks for more believable buildings and
lighting. Guided 3D is approved for the first launched version. The latest product
direction connects the whole travel journey, each day, small interactions such as
opening a door, and sharing the completed travel experience.

## This delivery

### Current follow-up · daylight and night, 2026-10-06

The user requests selectable daylight/night atmosphere and online building-related
resources for better lighting and shadows. The team implemented two authored
lighting modes in the playable walk and the existing live/Blender comparison.
Local licensed urban HDR environments supply reflections and ambient light;
directional light, warm night fixtures, shadows and selective material emission
come from a shared rig. They do not replace the sourced Kyoto geometry.

1. Verify source/license/size of the selected environment maps; establish a shared
   lighting, material and matching-view contract.
2. Add EN/ZH controls and separate local appearance preferences. Preserve the
   journey, notes, camera and any card opened while lighting finishes loading.
3. Inspect actual daylight/night gameplay before rendering the six final matched
   images, then verify switching, failure/retry, resource lifetime and night play.
4. Publish the exact tested package and push the source, attribution and evidence.

Manual mode selection is independent of real time, weather, opening hours and the
recap. The camera/encounter scope remains unchanged. Implementation and six matched
images are committed in `a176cf38fbf1645fa8a5a0eb72a99d017ba705ab`. The frozen
package passed 130 browser checks, 33 pure tests and 17 repository gates. It is
published on the existing Pages site, with all 38 hosted files hash-verified.
See the [day/night delivery evidence](../evidence/day-night-20261006/README.md). User realism acceptance and representative-device performance
remain separate.

### Delivered expanded-street and sharing follow-up · 2026-10-06

The user played the hosted version and accepted fluency and guidance. Architecture
and streets still look too simple; realism is not accepted. The user requests two
concrete visual solutions on a larger, more detailed street, and several sharing
formats rather than a single-choice product decision.

1. Correct the source-backed diagonal building corners and extend visual context
   around Karasuma. Finish facade recesses, trim, canopy structure, pavement and
   surface response. Keep gameplay bounds separate from visual context.
2. Compare live PBR with offline Blender path tracing of the same geometry at
   matching intersection/north/south views. Label static renders clearly; their
   quality and render time are not evidence of realtime interaction performance.
3. Replace immediate HTML download with a preview, individually opt-in saved
   notes, web-link sharing/copy, PNG image and a printable reader/PDF workflow.
4. Verify the new paths and matched views, preserve previous immutable evidence,
   commit/push meaningful slices, then update the existing GitHub Pages review.

Implementation is complete in source commit
`6a532aa9a2ef0e9d4366ff8159f497f0843b737e`. Seven sourced building footprints now
frame the street; construction and material details are original authored work.
The comparison has one intersection and two close frontage views, with identical
geometry and camera poses in both treatments. Sharing provides all three formats
from one reviewed selection. The exact package passed 97 browser checks, 22 pure
tests and 17 repository gates, and is published on the existing
[Pages site](https://paperstrange.github.io/TourGuideAI/). All 31 hosted package
files match the tested hashes. See the [delivery evidence](../evidence/detail-study-20261006/README.md).
New-art acceptance remains with the user.

The following paragraphs describe the preceding delivered increment.

Build one clean application under `experience/`, independent of historical folder
constraints. Improve facade proportions, detail and illumination; integrate the
existing small block into guided playable 3D; carry saved choices and bilingual
encounters forward. Add a personal note to a completed encounter and include it in
the user's field-note export. Keep this work reviewable through meaningful commits
and pushes to the working remote branch, as explicitly requested by the user.

The user also requested building details informed by Google Maps Street View.
Keep Maps as an optional linked comparison, and use independently licensed photos
of the exact buildings for authored facade geometry and materials. The current
pass distinguishes Mitsui's stone window bays and classical corner from Daiya's
vertical fins, dark glazing and arched base. It does not extract Google imagery,
claim a surveyed reconstruction, or verify authored doorway assignments. The
research, source dates, licenses and limitations are recorded in
[facade-references.md](facade-references.md).

## Ordered delivery slices

| Slice | Outcome | Review evidence |
|---|---|---|
| Foundation | Independent package, self-contained sourced content, pure simulation and camera contract | Build/test from `experience/`, no runtime imports from historical folders, camera-relative input and save compatibility |
| Believable block | Eight source-backed building levels, authored plausible proportions, layered materials, neutral daylight and controllable views | Actual browser before/after at comparable player scale; building identity, glass/stone/metal contrast, actor visibility and shadows |
| Interaction and continuity | Approach → prompt → choice → resume; save a personal note; return and export it | Real pointer/keyboard walkthrough in EN/ZH; draft/persistence/export checks; source reads remain distinct from simulated visits |
| Acceptance | Packaged bytes, recovery behavior, performance evidence and user review | Independent browser results, asset/source hashes, explicit unverified hardware and human criteria |

The first three slices are implemented and tested before claiming this increment
ready for review. Completion details and limitations belong in [validation.md](validation.md).
Human art and interaction-fluency acceptance remain separate.

## Following slices

Use the trip → day → moment → memory model in [immersion.md](immersion.md). Add a
purposeful day plan and a readable daily recap before multiplying cities. A door
interaction needs a meaningful destination, visible reach/open/enter feedback and
a clear way back; current unverified entrances must not gain invented access or
interiors. Extend local notes into user-selected trip memories, then previewable
whole-trip sharing. Personal memory, simulated discovery, real-world visit and
verified source information remain distinct throughout.
