# Shijo Takakura associated low structure · production evidence

The candidate changes source index `223`, `kyoto-city:bldg_74454289-1d7a-4105-87ea-26e36c69bc44`, to an authored open assembly. The municipal record classifies it as `普通無壁舎`, an ordinary wall-less structure. The OSM Platform A point lies inside its footprint. This supports the open-form treatment; exact current shelter construction remains unverified.

The frozen asset candidate is `artifacts/neighborhood-20261023/art/platform-open-transport/`, manifest SHA256 `679241ee06a8115ad3f95ddd523c2f56555b900f3ecc4437d272573a968ec4e5`. Production provenance SHA256 is `845448d6bb53c4de1592c42b5e726d4f5b8001d589e14299221c2fae53c8270b`. Actual browser comparison and independent source audit remain separate acceptance steps. No public asset promotion is performed by this evidence record.

## Source and authored construction

The [source audit](../../world/platform-context/README.md) preserves the original footprint, `2.124m` LOD1 Z extent and separate `2.9m` measured-height attribute. The [semantic lookup](../../world/platform-context/semantic-review.json), SHA256 `a56ad01d023a620bbee4bc776e93365c428ad027da570eb13661ed271b413c22`, binds the original FileGDB classification and query. These records are embedded in production provenance and validated by the generator.

The roof's source ring and top height remain exact. Authored construction comprises a `0.08m` slab, seven `0.12m` square centreline posts inset `0.45m` from each end, and one `0.10m × 0.10m` centre beam. Posts and beam remain inside the source footprint. The beam underside is `1.944m` above virtual base zero; this is an authored dimension with no claim of measured public clearance. Existing neutral `roof` and `frame` materials are reused. The assembly carries no shop glazing, tenant lettering, new fixtures or selectable platform label.

The retained 2016 photograph visibly labels Platform B. Its dated appearance does not establish this Platform A assembly and supplies no dimensions or pixels to the exported model. The intermediate neutral enclosed export remains only in ignored `platform-raw/` and `platform-optimized/` directories; it is outside this candidate.

## Geometry and resource proof

[Geometry preservation](geometry-preservation.json) compares the candidate with manifest `deb00b97ca3e29e314a13225678c7e6827de59a0f8ff68d5d3bdccc7d3563458`. Across all 74 containers, every unrelated source's complete decoded oriented triangles, attributes, material names and world transforms remain exact. Retained imported object ordering changes some context/Mitsui/Daiya container bytes; their per-source geometry remains unchanged. Shared material image bytes, lighting, source ledgers and runtime source-index table are unchanged. Target roof triangles and roof ring are exact, and source index `223` is retained.

| Target resource | Prior target triangles | Open-assembly triangles | Current section transfer | Current decoded glTF + binary |
| --- | ---: | ---: | ---: | ---: |
| `cell-e001-s001/base.gltf` | 66 | 108 | 30,477 B | 117,306 B |
| `cell-e001-s001/near.gltf` | 330 | 108 | 115,682 B | 506,468 B |

The 108 target triangles comprise 104 frame triangles and 4 roof triangles. Other buildings share these material batches; no whole-cell fade or invisible selection surface is added. Navigation, ground and the six existing sight IDs remain unchanged.

The [compression report](compression-report.json.gz) records 74 glTFs with zero input/output validator errors, zero decoded world-position/UV error and exact source attributes. Existing normal/tangent quantization has maximum component error `0.0000152587890625`; it is unchanged in policy. The validator retains its tangent-space warnings and limited knowledge of the meshopt extension; actual decoder attribute comparisons supply the corresponding geometry proof.

The [transport report](transport-report.json.gz) verifies all 148 gzip resources and all 74 declared section budgets. The largest transfer remains bridge NEAR at `1,740,511B`, below 2MiB. Gzip transfer is separate from decoded geometry and GPU allocations. The package has 344 files; historical `river-package-audit.json` and `startup-audit.json` are preserved with earlier evidence and omitted from this newly generated package.

[Current startup audit](startup-audit.json) binds the final manifest and measures deduplicated required 3D resources, including the shared traveller and selected HDR:

| Mode | Manifest + resident/initial resources | Traveller | HDR | Total | 4MiB headroom |
| --- | ---: | ---: | ---: | ---: | ---: |
| Daylight | 2,562,125 B | 35,556 B | 432,312 B | 3,029,993 B | 1,164,311 B |
| Night | 2,562,125 B | 35,556 B | 425,076 B | 3,022,757 B | 1,171,547 B |

Application HTML/JavaScript/CSS/fonts, deferred sections and audit/provenance records are outside this required-3D metric. The transport report's `requiredPackageBytes` field is the common local-resource subtotal because that packaging run has no prior startup-audit input; the current external audit provides both complete mode totals. No latency improvement is inferred from these byte counts.

## Reproduction

Run from the repository root in the assigned CPU window. Existing prepared art and river inputs retain their recorded hashes. The following are the exact production commands; logs and editable Blender files remain in ignored artifacts.

```bash
env TMPDIR="$PWD/artifacts/tmp" blender --background --threads 4 --python experience/art/build_neighborhood.py -- --geography experience/src/neighborhoods/shijo-east/geography.json --scene experience/src/neighborhoods/shijo-east/scene.json --prepared-art artifacts/neighborhood-20261023/world/art-selection.json --river-context artifacts/neighborhood-20261023/world/river-context.json --style experience/art/neighborhood-style.json --asset-dir artifacts/neighborhood-20261023/art/platform-open-raw --output-dir artifacts/neighborhood-20261023/art/platform-open-build
node experience/art/optimize_neighborhood.mjs --input artifacts/neighborhood-20261023/art/platform-open-raw --output artifacts/neighborhood-20261023/art/platform-open-optimized --tools artifacts/neighborhood-20261021/art/tools --retained-texture-size 256 --report artifacts/neighborhood-20261023/art/platform-open-optimized/compression-report.json
node experience/art/package_neighborhood_transport.mjs --input artifacts/neighborhood-20261023/art/platform-open-optimized --output artifacts/neighborhood-20261023/art/platform-open-transport --report transport-report.json --startup-cell cell-e000-n000
```

Use distinct empty output directories when reproducing. Blender 4.3.2 and the pinned existing toolkit produced these assets. Whole-file export reproducibility is not claimed: imported object order can vary while the independent per-source comparison preserves geometry. Transport packaging has its own encoded/decoded identity checks.

[Evidence bindings](binding.json) list encoded and decoded hashes for the immutable manifest, provenance, compression/transport reports and executed audit scripts. The captured audit scripts contain the exact local input/output paths used for this run. The root agent owns generated-directory replacement and the next built-package browser review.
