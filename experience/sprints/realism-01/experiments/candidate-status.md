# Candidate testing status · 6 November 2026

**Independent preparation is running in parallel. No candidate has passed the
Kyoto qualification gates or been admitted to the final comparison.** The approved
comparison has two representation families: textured mesh and captured Gaussian
splats, sharing reviewed ground/collision and the same licensed capture for a
matched A/B. The [benchmark manifest](../benchmark-manifest.json) therefore keeps
its candidate, run-order and final-pair arrays unfilled.

| Track / owner | Completed evidence | Still needed for qualification |
| --- | --- | --- |
| Textured mesh · Scene / art | [73 original PLATEAU tiles and 18 browser views](../../../evidence/realism-01/qualification/README.md); exact Mitsui source identity; all-edge object index | Current street-level detail, five sight identities, floor/entrance/lighting qualification; matched-capture reconstruction for an A/B |
| Captured splats · Rendering / QA | [Spark 2.4.0 + existing Three 0.186.1](../../../evidence/realism-01/qualification/splat-compatibility/README.md): licensed non-Kyoto sample, 105,144 splats, native orbit, six engineering checks, zero page errors | Kyoto capture; correct source rendering/fidelity; street streaming and resource accounting; common collision; daylight/night; physical-device tests |
| Shared ground · Geography / QA | [Complete terrain extraction and profile](../../../evidence/realism-01/qualification/terrain/README.md): 6,019 triangles; all 1,434 samples covered | Pedestrian floors and bridge deck; current access and source epoch/model acceptance |
| Shared coordinates · Geography / QA | [Two explicit geoid models](../../../evidence/realism-01/qualification/datum/README.md): 12 independent grid checks and 2,868 local-frame checks | Independent physical controls; final reviewed source/model registration |
| Matched capture / evaluation · Research / product | [Reserved reference photos and public provider prices](../../../evidence/realism-01/qualification/references/README.md); itemized capture requirements | Same licensed originals/poses/calibration for both methods, complete route quote, reserved full coverage, physical devices and fresh participants |

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

Next owned tasks: Scene/QA qualifies deck, covered-passage and curb surfaces;
Rendering/QA resolves source fidelity on an independently referenced street splat
and measures streaming/resource lifecycle; Research prepares the matched Kyoto
capture package and actual quote. Production representation remains undecided.
