# Candidate10 paper response and pavement boundary

The isolated package is `artifacts/neighborhood-20261024/art/candidate-10-transport/`, manifest `e58257879fb4ead8af14022e71e329ee3309f9920eec6fe2cf4717276573d108`. Its baseline is candidate9 manifest `79b1a3ed91f0b672364c690e44de9278dce555fab0074ce0dc4aaa8add62f534`. Producer checks, independent decoded audit and the [matched browser review](../candidate-10/README.md) pass for the bounded paper and platform-edge corrections. Public assets remain under the lead's promotion control.

## Exact scope

- Torii source `osm:node:5204263033`, index1047: the three existing NEAR paper faces use `torii-paper`. Geometry, source attributes, UV scale and world position are preserved. The original untextured material uses authored sRGB `#dedbd2`, roughness0.90, metallic0 and coat0, with opaque nonemissive response. The exported roughness is the exact float32 value `0.8999999761581421`. Existing arcade lamp materials and emission remain unchanged. No new texture is added.
- Platform-associated municipal source `kyoto-city:bldg_74454289-1d7a-4105-87ea-26e36c69bc44`, index223: four outward perimeter faces connect existing paving at0 to adjoining display ground at−0.04. These add eight triangles to each LOD using the existing paving material. The previous110 target triangles, floor top, source ring, roof and seven posts remain unchanged. All added geometry is nonwalkable.

The [paper review](../../world/torii-paper-review.json), SHA256 `1c0d04780039823cdce0831bd32867373082b329b57c4ae53a167b16238b03d4`, binds the inspected 2007 photograph and source1047 association. It supports a matte paper interpretation; present decoration, exact material parameters and night photometry remain unmeasured. Plaque text and geometry are unchanged.

The [boundary audit](../../world/floor-boundary.json), SHA256 `1ca8cd8131f2d2d1dcdee8328292c3fd0c8172e60122d02e0ddc76b833be1d70`, establishes that the entire 64.46802097165m perimeter touches only `shijo-east:ground` at −0.04, with zero overlap and zero unmatched boundary. The closure joins existing authored display levels; it makes no measured-curb claim. Both evidence records are hash-validated by the generator and embedded in production provenance.

## Producer validation

[Source comparison](source-check.json) preserves a pre-edit generated baseline and verifies exact torii geometry, all prior platform roof/post/top faces, all existing material definitions, and the four new outward boundary faces on the exact ring. [Resource audit](resource-audit.json) verifies all 74 glTF containers with zero validator errors, exact optimized positions/UVs/source indices, unchanged original shared images/HDR/lighting and the unchanged compact runtime source table. The new material occurs only in `cells/cell-e006-n001/near.gltf`. The existing normal/tangent encoding policy and validator warnings are retained in the compression report.

All 148 gzip resources pass encoded and decoded identity checks. Existing section transfer limits remain satisfied. Gzip transfer is distinct from decoded geometry and actual GPU allocation.

The [independent decoded audit](../../world/candidate10-export-audit.json), SHA256 `97989383be234776aeafe54f22f1771c9151044d6a3cf6e28c34aa219e816160`, passes all 74 sections. It preserves every unrelated source group/material, the previous 110 platform triangles per LOD, and all attributes/transforms of the six torii paper triangles. It verifies the eight added outward floor-edge triangles per LOD and the isolated opaque nonemissive paper material.

| Changed section | Decoded glTF + binary | Gzip transfer | Material batches |
| --- | ---: | ---: | ---: |
| Platform e001s001 BASE | 120,697B | 31,085B | 7 |
| Platform e001s001 NEAR | 509,863B | 116,357B | 8 |
| Torii e006n001 NEAR | 836,381B | 314,459B | 19 |

Required 3D startup transfer is 3,037,230B by day and 3,029,994B by night, within 4,194,304B. Daylight headroom is 1,157,074B. Counts include deduplicated resident/opening resources, traveller and selected HDR; application HTML/JavaScript/CSS/fonts and deferred resources are separate. Added image bytes are zero. [Bindings](binding.json) retain exact manifest/provenance/report and executed-check identities.

## Reproduction

Use an assigned CPU window and distinct empty output paths for an independent repeat, from the repository root:

```bash
env TMPDIR="$PWD/artifacts/tmp" blender --background --threads 4 --python experience/art/build_neighborhood.py -- --geography experience/src/neighborhoods/shijo-east/geography.json --scene experience/src/neighborhoods/shijo-east/scene.json --prepared-art artifacts/neighborhood-20261023/world/art-selection.json --river-context artifacts/neighborhood-20261023/world/river-context.json --style experience/art/neighborhood-style.json --asset-dir artifacts/neighborhood-20261024/art/candidate-10-raw --output-dir artifacts/neighborhood-20261024/art/candidate-10-build
node experience/art/optimize_neighborhood.mjs --input artifacts/neighborhood-20261024/art/candidate-10-raw --output artifacts/neighborhood-20261024/art/candidate-10-optimized --tools artifacts/neighborhood-20261021/art/tools --retained-texture-size 256 --report artifacts/neighborhood-20261024/art/candidate-10-optimized/compression-report.json
node experience/art/package_neighborhood_transport.mjs --input artifacts/neighborhood-20261024/art/candidate-10-optimized --output artifacts/neighborhood-20261024/art/candidate-10-transport --report transport-report.json --startup-cell cell-e000-n000
```

The normal sequence preserves frozen geography `0fe837655a45b8c2685e1bae24d739ef9fdf2c55dc60401588474cfa31bd9c7f`, scene `2979a2e426271fe19c91114928eb27b625cbfe3f8548eef4bdaec73e45cb7e8e`, prepared art `1ec33111947716ef43d8592c96203f55d1194b0f5b9ab68168b0deaf373bdb65` and river context `d77ea7a06b26954ea52a6991d45cd4c044b4c1659afd2df2bbe457cd23aef1c5`.

Actual [matched views](../candidate-10/README.md) preserve the candidate9 platform cameras and closely reproduce the western native framing. The platform edge is visibly closed, and the paper remains readable with nonemissive response. Existing arcade lamp emission is verified in runtime/material observations; an identifiable lamp body is outside those western images. Source-backed connector facade variation, factual plaque detail and broader night-glazing review remain open. No route-wide realism or physical-device fluency result is claimed by this export.
