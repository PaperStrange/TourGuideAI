# Candidate11 reviewed display-boundary closures

The isolated output is `artifacts/neighborhood-20261024/art/candidate-11-transport/`, manifest `4fb428b9d5b73274f0e64726cdf045f034e7be1823b8919f7ea6ef7d3bc09544`. Its baseline is candidate10 manifest `e58257879fb4ead8af14022e71e329ee3309f9920eec6fe2cf4717276573d108`. Producer validation, independent decoded audit and the [matched browser review](../candidate-11/README.md) pass for the scoped boundary repairs. Public promotion belongs to the lead.

## Exact scope

The frozen [boundary proposal](../../world/visible-boundaries/closure-proposal.json), SHA256 `e1dfea3c79d40ac5a438fe8c1089c6453ba6650df56016af28b33e61173f8b71`, identifies the depicted sources through decoded offline rays and retained actual camera matrices. The producer validates that record and every bound input before applying the listed segments.

| Source | Added faces | Existing display levels | Material and residency |
| --- | --- | --- | --- |
| Municipal `kyoto-city:bldg_1bab607d-4c47-48a5-b523-e64000d895f6`, index731 | Polygon0 edges5–8; four quads/eight triangles in each BASE and NEAR | Building base0 to adjoining ground−0.04 | Existing `tile-wall`, same building batches/source index |
| `osm:way:174762073`, index20 | Exact31.141523795m north boundary; one quad/two triangles | Ground−0.04 to road−0.12 | Existing `paving`, explicitly nonwalkable resident batch |
| `osm:way:843727820`, index151 | Exact11.851772230m north boundary; one quad/two triangles | Ground−0.04 to road−0.12 | Existing `paving`, explicitly nonwalkable resident batch |

The additions total20 triangles across both building LODs and resident ground. Original facade faces, horizontal surfaces, source footprints, base metadata, material definitions and navigation remain unchanged by the producer. The new faces join authored display levels; real foundations/curbs are unmeasured.

The road20 portion covered by crossing465069412 is excluded. Road151's eastern overlap with bridge83/532008156 and the angular half-millimetre boundary mismatch are excluded. Whole-road aggregate overlaps of0.024621/0.001517m² remain reported by the source audit. This correction claims only the two exact shared lines and leaves those separate relationships unchanged.

## Producer proof and resource limits

[Source proof](source-proof.json) executes the production geometry functions on the retained input. Source731's previous496 BASE/1,870 NEAR triangles remain exact before eight additions per LOD. All original resident ground faces and every walkable batch remain exact; the road additions enter only `(paving, False)`. Exact endpoints, height intervals and outward winding pass. Exported attributes and material/transform identity require the separate independent audit.

[Resource audit](resource-audit.json) verifies all74 glTF containers with zero validator errors and exact optimized world positions, UVs and source indices. The existing normal/tangent policy and recorded validator warnings remain separate. All148 gzip resources pass the transport producer's encoded/decoded identity checks. Existing ordinary section limits and the retained Mitsui-only exception remain in force.

The [independent decoded audit](../../world/candidate11-export-audit.json), SHA256 `2dd0f205a63772c717b2cd1016e4066f5f4a6e9d9424ada77108d5627281ccc8`, passes all74 sections and9,731 section/source groups. Every prior attribute, oriented triangle, material, transform and node metadata remains exact. Both actual walkable primitives retain byte-identical attribute/index arrays. The audit measures only the20 approved added triangles, with exact float32 endpoints/heights and outward winding. All148 encoded/decoded transport identities pass.

Required 3D startup transfer is3,036,911B by day and3,029,675B at night, within4,194,304B. Daylight headroom is1,157,393B. This includes the manifest, resident/opening resources, traveller and selected HDR; page HTML/JavaScript/CSS/fonts and deferred resources are separate. Shared image/HDR bytes, lighting rig and runtime source-index table remain exact; added image bytes are zero. Gzip transfer is distinct from decoded memory and actual GPU allocation.

## Reproduction

From the repository root, use an assigned CPU window and distinct empty output directories for an independent repeat:

```bash
env TMPDIR="$PWD/artifacts/tmp" blender --background --threads 4 --python experience/art/build_neighborhood.py -- --geography experience/src/neighborhoods/shijo-east/geography.json --scene experience/src/neighborhoods/shijo-east/scene.json --prepared-art artifacts/neighborhood-20261023/world/art-selection.json --river-context artifacts/neighborhood-20261023/world/river-context.json --style experience/art/neighborhood-style.json --asset-dir artifacts/neighborhood-20261024/art/candidate-11-raw --output-dir artifacts/neighborhood-20261024/art/candidate-11-build
node experience/art/optimize_neighborhood.mjs --input artifacts/neighborhood-20261024/art/candidate-11-raw --output artifacts/neighborhood-20261024/art/candidate-11-optimized --tools artifacts/neighborhood-20261021/art/tools --retained-texture-size 256 --report artifacts/neighborhood-20261024/art/candidate-11-optimized/compression-report.json
node experience/art/package_neighborhood_transport.mjs --input artifacts/neighborhood-20261024/art/candidate-11-optimized --output artifacts/neighborhood-20261024/art/candidate-11-transport --report transport-report.json --startup-cell cell-e000-n000
```

[Bindings](binding.json) retain the exact production files and executed proof scripts. Original standalone Shijō/Ginza assets are outside this output directory.

## Executed visual review

The [seven current canvases](../candidate-11/README.md) use the recorded candidate9 Tenmangū purposeful-pan and Pontochō arrival compositions, plus current western native framing. The four source731 edges and two north road edges pass the bounded contact review in both modes. Actual camera comparison differences and primary budgets are recorded separately. The deliberately panned inspection state retains its user-chosen actor framing; ordinary walking checks remain separate. Excluded road/bridge/corner relationships retain their visible limits.

The [candidate10 review](../candidate-10/README.md) retains accepted paper/platform fixes. Source-backed frontage correspondence, factual plaque detail, broad night reflections and other unreviewed boundaries remain open. Candidate11 acceptance covers the pictured scoped repairs; whole-route realism and physical-device performance remain separate unestablished gates.
