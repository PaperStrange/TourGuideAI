# Candidate9 floor and source regeneration

The isolated generated package is `artifacts/neighborhood-20261023/art/candidate-9-transport/`, manifest SHA256 `79b1a3ed91f0b672364c690e44de9278dce555fab0074ce0dc4aaa8add62f534`. Independent decoded geometry review has passed. The [candidate9 browser art review](../candidate-9/README.md) accepts the corrected floor in matched day/night views and confirms the western Tenmangū pause for deliberate inspection. The [candidate8 images](../candidate-8/README.md) preserve the earlier uncovered-floor observation.

## Bound changes

The source-specific assembly at index 223 adds two upward-facing paving triangles at authored base 0, using the exact retained footprint triangulation and existing `paving` material. Roof, slab, beam and seven posts remain unchanged. The floor is ordinary visible geometry with no `walkable` metadata; navigation remains on the separate resident reviewed surfaces. The [floor-support audit](../../world/platform-context/floor-support.json), SHA256 `c3f236da23c9e83b9a44d5d4b2a06d0f03cbca14be8c79b780713a62ea1aea8a`, verifies 73.626288m² and zero overlap with existing rendered surfaces/navigation. Real pavement material and elevation remain unmeasured.

Canonical geography now binds the accepted western pause through its normal source-preparation process. Its SHA256 is `0fe837655a45b8c2685e1bae24d739ef9fdf2c55dc60401588474cfa31bd9c7f`; scene geometry remains `2979a2e426271fe19c91114928eb27b625cbfe3f8548eef4bdaec73e45cb7e8e`. Prepared art SHA256 is `1ec33111947716ef43d8592c96203f55d1194b0f5b9ab68168b0deaf373bdb65`; river-context SHA256 is `d77ea7a06b26954ea52a6991d45cd4c044b4c1659afd2df2bbe457cd23aef1c5`. The prepared geometry payloads preserve their previous geometry, with new source-hash bindings. Full normal generation updates exported scene metadata and provenance.

The Shinkyōgoku panel treatment and all existing images/lighting remain unchanged from candidate8. The torii's authored geometry, paper-form emission and generic surrounding facades retain their documented limits.

## Validation and resources

[Resource audit](resource-audit.json) verifies all 74 glTFs with zero input/output validator errors, exact optimized world positions/UVs/source indices and all 148 encoded resource identities. All section transfer budgets pass. Existing shared image/HDR bytes, lighting rig and compact runtime source-index table remain exact. No new image resource is added. Existing tangent-space warnings remain disclosed in the [compression report](compression-report.json.gz).

| Platform cell resource | Decoded glTF + binary | Gzip transfer | Section triangles | Material batches |
| --- | ---: | ---: | ---: | ---: |
| BASE | 120,312B | 30,804B | 3,631 | 7 |
| NEAR | 509,478B | 116,049B | 16,419 | 8 |

The [independent export audit](../../world/platform-context/candidate9-export-audit.json), SHA256 `57f0e9c9b4ee0dff263d69106fa43ff70da9bdd43468c5d166b212329f448144`, passes all 74 sections. The previous 108 target triangles remain exact in both LODs; exactly two upward paving triangles at base 0 bring the target total to 110. Their projected triangles equal the source roof-plan triangulation. Every unrelated source group, material, attribute and world transform remains exact, including the source116 panel treatment. The new floor uses the existing ground-paving material after texture-URI normalization. One pavement batch is added per platform section. The [executed browser evidence](../candidate-9/reviewed-captures.json) records passing same-pose primary frame budgets in both lighting modes.

Required 3D startup transfer is 3,035,372B by day and 3,028,136B by night. Daylight headroom below 4MiB is 1,158,932B. These counts include deduplicated resident/initial resources, traveller and the selected HDR; application HTML/JavaScript/CSS/fonts and deferred assets are separate. Gzip transfer is distinct from decoded geometry and actual GPU memory.

## Exact production commands

Run from the repository root in an assigned CPU window, using distinct empty output paths for a repeat:

```bash
env TMPDIR="$PWD/artifacts/tmp" blender --background --threads 4 --python experience/art/build_neighborhood.py -- --geography experience/src/neighborhoods/shijo-east/geography.json --scene experience/src/neighborhoods/shijo-east/scene.json --prepared-art artifacts/neighborhood-20261023/world/art-selection.json --river-context artifacts/neighborhood-20261023/world/river-context.json --style experience/art/neighborhood-style.json --asset-dir artifacts/neighborhood-20261023/art/candidate-9-raw --output-dir artifacts/neighborhood-20261023/art/candidate-9-build
node experience/art/optimize_neighborhood.mjs --input artifacts/neighborhood-20261023/art/candidate-9-raw --output artifacts/neighborhood-20261023/art/candidate-9-optimized --tools artifacts/neighborhood-20261021/art/tools --retained-texture-size 256 --report artifacts/neighborhood-20261023/art/candidate-9-optimized/compression-report.json
node experience/art/package_neighborhood_transport.mjs --input artifacts/neighborhood-20261023/art/candidate-9-optimized --output artifacts/neighborhood-20261023/art/candidate-9-transport --report transport-report.json --startup-cell cell-e000-n000
```

[Bindings](binding.json) preserve the exact generated manifest, provenance, compression/transport reports and resource audit. Root owns public-directory promotion and the canonical application build. No visual acceptance is inferred from asset/source checks.
