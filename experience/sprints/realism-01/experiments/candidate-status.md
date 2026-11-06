# Candidate testing status · 6 November 2026

**Independent preparation is running in parallel. No candidate has passed the
Kyoto qualification gates or been admitted to the final comparison.** The approved
comparison has two representation families: textured mesh and captured Gaussian
splats, sharing reviewed ground/collision and the same licensed capture for a
matched A/B. The [benchmark manifest](../benchmark-manifest.json) therefore keeps
its candidate, run-order and final-pair arrays unfilled.

| Track / owner | Completed evidence | Still needed for qualification |
| --- | --- | --- |
| Textured mesh · Scene / art | [73 original PLATEAU tiles and 18 browser views](../../../evidence/realism-01/qualification/README.md); [369-building native texture audit](../../../evidence/realism-01/qualification/texture/README.md); exact Mitsui source identity; all-edge object index | Inspected municipal input is insufficient for close walking; additional current street-level detail, five sight identities, floor/entrance/lighting qualification and matched-capture reconstruction are required |
| Captured splats · Rendering / QA | [Spark 2.4.0 + existing Three 0.186.1](../../../evidence/realism-01/qualification/splat-compatibility/README.md): licensed non-Kyoto sample, 105,144 splats, native orbit, six engineering checks, zero page errors | Kyoto capture; correct source rendering/fidelity; street streaming and resource accounting; common collision; daylight/night; physical-device tests |
| Shared ground · Geography / QA | [Terrain profile](../../../evidence/realism-01/qualification/terrain/README.md): 6,019 triangles / 1,434 covered samples. [Actual detailed-surface audit](../../../evidence/realism-01/qualification/pedestrian/README.md): 1,986 road triangles / zero route or actor-envelope overlap | Additional licensed measured floors/deck and control; current access/source epoch. A local Pontochō review point needs a separately approved common route revision |
| Shared coordinates · Geography / QA | [Two explicit geoid models](../../../evidence/realism-01/qualification/datum/README.md): 12 independent grid checks and 2,868 local-frame checks | Independent physical controls; final reviewed source/model registration |
| Matched capture / evaluation · Research / product | [Reserved reference photos and public prices](../../../evidence/realism-01/qualification/references/README.md); [complete quotation package](../research/acquisition-package/README.md) with exact route and handover checks | Outreach authorization and sender identity; actual quote, same licensed originals/poses/calibration, measured floors, reserved full coverage, physical devices and fresh participants |

The municipal mesh source and the shoe splat sample have different subjects,
capture histories and purposes. Their screenshots and timing cannot rank the two
representations. The splat images remain visibly diffuse; the six engineering
passes establish activity and camera response, with source fidelity unverified.

Three + Spark is the first isolated splat adapter tested. PlayCanvas GS remains a
researched implementation option; its earlier hosted-demo observation has its own
scope. Google/Cesium tiles, panoramas and hybrid scene layering remain earlier
research options with no admitted current sprint trial. Shared collision geometry
is a requirement for both active families.

## Parallel work and dependency boundary

Mesh surface/reference inspection and splat format/renderer/source-intake work
can proceed independently. Shared ground registration benefits both. Neither
track waits for the other to be selected. Once common licensed capture and reviewed
floor/coordinate inputs are available, prepare both T01–T03 packages and execute
the [same frozen trial definitions](README.md). Rotate measured run order under
Benchmark V1; concurrent benchmark renders on one device would contaminate timing.

Next owned tasks: Rendering/QA completes independently referenced architectural
splat fidelity and streaming/resource-lifecycle checks; Research obtains capability,
rights and price answers using the prepared Kyoto inquiry after authorized contact.
Scene/QA verifies actual received sources and measured floors against that package.
Production representation remains undecided. Candidate expansion needs evidence of
a requirement that these two families cannot satisfy; the current findings call
for better shared source material and bounded delivery engineering.
