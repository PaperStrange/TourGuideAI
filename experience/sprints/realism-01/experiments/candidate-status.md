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
| Captured splats · Rendering / QA | [Architectural comparison](../../../evidence/realism-01/qualification/splat-fidelity/README.md) and [paged rendering](../../../evidence/realism-01/qualification/splat-streaming/README.md): identical licensed Hall source, matching cameras, native input, eviction, unloading and cancellation | Free Kyoto capture; residual quality differences; startup and section byte limits; complete resource accounting; common collision; daylight/night; physical-device tests |
| Shared ground · Geography / QA | [Terrain profile](../../../evidence/realism-01/qualification/terrain/README.md): 6,019 triangles / 1,434 covered samples. [Actual detailed-surface audit](../../../evidence/realism-01/qualification/pedestrian/README.md): 1,986 road triangles / zero route or actor-envelope overlap | Additional licensed measured floors/deck and control; current access/source epoch. A local Pontochō review point needs a separately approved common route revision |
| Shared coordinates · Geography / QA | [Two explicit geoid models](../../../evidence/realism-01/qualification/datum/README.md): 12 independent grid checks and 2,868 local-frame checks | Independent physical controls; final reviewed source/model registration |
| Matched capture / evaluation · Research / product | [Reserved reference photos](../../../evidence/realism-01/qualification/references/README.md); [exact full-route scope and handover checks](../research/acquisition-package/README.md) | Qualifying free licensed originals/poses/calibration, measured floors, reserved full coverage, physical devices and fresh participants; supplier outreach is parked under the user's free-source requirement |

The [free-source investigation](../research/free-source-feasibility.md) inspected
five CC0 photographs, additional official assets and public street imagery metadata.
Four new Shijō photographs share a reserved evaluation capture family and remain
inspection-only. The located Momiji frontage lies north of the selected route.
No additional exact-route dimensional reconstruction package was qualified.

The municipal Kyoto source and the Hall capture have different subjects and capture
histories. Their screenshots cannot rank mesh against splats. The Hall comparison
does use exactly the same original components and measured camera across two splat
renderers. On a common foreground mask, documented focal calibration reduces mean
RGB difference from 22.52 to 20.59/255. Residual differences remain. Its 28.40 MiB
full-load archive requires at least 23.83 seconds at 10 Mbps before decoding, so it
exceeds the 4 MiB / 8 second initial-load gates. Native hidden/resume is unqualified.

Three + Spark is the isolated splat adapter. The publisher's PlayCanvas runtime and
GaussianSplats3D supply independent same-source diagnostics; they do not add
representation families. Google/Cesium tiles, panoramas and hybrid scene layering remain earlier
research options with no admitted current sprint trial. Shared collision geometry
is a requirement for both active families.

## Parallel work and dependency boundary

Mesh surface/reference inspection and splat format/renderer/source-intake work
can proceed independently. Shared ground registration benefits both. Neither
track waits for the other to be selected. Once common licensed capture and reviewed
floor/coordinate inputs are available, prepare both T01–T03 packages and execute
the [same frozen trial definitions](README.md). Rotate measured run order under
Benchmark V1; concurrent benchmark renders on one device would contaminate timing.

Bounded streaming now works mechanically with eight resident pages and one source
fetcher. The frozen SH3 run transfers 4,737,856 response bytes before its partial-detail
first view, and 38/39 compact chunks exceed 2 MiB. These failures remain open.
Next technical work evaluates documented source encoding against the same-camera
reference and byte limits. The [single SH2 follow-up](../../../evidence/realism-01/qualification/splat-encoding/README.md)
reduces partial first-visible transfer to 3,898,536 bytes / 3.72 MiB. It explicitly
removes degree-3 directional coefficients, and 37/39 chunks still exceed 2 MiB.
Full-quality and directional appearance remain unqualified. Scene/QA needs qualifying free route capture and measured
floors for the common comparison. Supplier outreach and paid capture are parked.
Production representation remains undecided. Candidate expansion needs evidence of
a requirement that these two families cannot satisfy; the current findings call
for better shared source material and bounded delivery engineering.

No renderer winner is selected. Both families retain their current admission gaps;
the encoding result supplies a measured engineering trade-off, with production
selection still dependent on source, quality, resource and physical/human gates.
