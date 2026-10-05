# A believable place, a continuing journey

The user likes the new spatial depth and asks for more believable buildings and
lighting. Guided 3D is approved for the first launched version. The latest product
direction connects the whole travel journey, each day, small interactions such as
opening a door, and sharing the completed travel experience.

## This delivery

Build one clean application under `experience/`, independent of historical folder
constraints. Improve facade proportions, detail and illumination; integrate the
existing small block into guided playable 3D; carry saved choices and bilingual
encounters forward. Add a personal note to a completed encounter and include it in
the user's field-note export. Keep this work reviewable through meaningful commits
and pushes to the working remote branch, as explicitly requested by the user.

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
