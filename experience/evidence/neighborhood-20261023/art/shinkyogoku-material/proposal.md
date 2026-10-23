# Shinkyōgoku roof material · isolated revision

The prepared source change applies only to mapped roof `osm:way:551741577`, version8. The [source audit](../../world/shinkyogoku-context/source-audit.json) binds its full plan and the reviewed player position. Its extent is local `x678.354–709.016`, `y9.241–547.304`, including the e006 connector and Tenmangū approach. The mapped width at e006 is `4.262696m`; the existing `5m` height remains authored.

The [association reference review](../../world/shinkyogoku-context/reference-review.json) records a 2022 polycarbonate replacement announcement and a small photograph of pale curved panels with repeated framing. The photograph's exact location within Shinkyōgoku is unspecified. Its pixels are research-only and are excluded from generated assets. This revision is an original opaque PBR interpretation; local roof profile, panel dimensions and present construction remain unverified.

## Prepared material

| Property | Value |
| --- | --- |
| Material | `shinkyogoku-panel` |
| Authored sRGB base colour | `#d2d8d5` |
| Roughness | `0.56`, original texture variation `±0.035`, seam increment `0.035` |
| Metalness | `0` |
| Clearcoat / clearcoat roughness | `0.12 / 0.30` |
| Alpha / emission | `1 / 0` |
| Maps | Original deterministic 128×128 colour, roughness and normal maps |
| Panel treatment | Broad colour variation `±1.5%`, narrow seam darkening `6%` |
| UV repeat / normal strength | Existing `3m` repeat / `0.12` |

The source-specific assignment preserves roof vertices, winding, UV coordinates, source indices, transforms, height, collision and existing edge-frame material. No curved profile, facade join, support, fixture or runtime parameter is introduced. Canopy fading remains associated with the existing cell group. An additional material batch may be required in cells containing another roof material; actual per-frame checks must include it.

Prepared files are `experience/art/neighborhood-style.json`, `build_neighborhood.py`, `neighborhood_landmarks.py` and `neighborhood_materials.py`. The generator validates both frozen audit hashes and embeds their records in provenance. The other source groups' full material definitions and map bytes must remain exact.

## Isolated production commands

The root agent released the CPU window and the following commands completed using separate ignored output directories. Public assets remain unchanged by this production record:

```bash
env TMPDIR="$PWD/artifacts/tmp" blender --background --threads 4 --python experience/art/build_neighborhood.py -- --geography experience/src/neighborhoods/shijo-east/geography.json --scene experience/src/neighborhoods/shijo-east/scene.json --prepared-art artifacts/neighborhood-20261023/world/art-selection.json --river-context artifacts/neighborhood-20261023/world/river-context.json --style experience/art/neighborhood-style.json --asset-dir artifacts/neighborhood-20261023/art/shinkyogoku-material-raw --output-dir artifacts/neighborhood-20261023/art/shinkyogoku-material-build
node experience/art/optimize_neighborhood.mjs --input artifacts/neighborhood-20261023/art/shinkyogoku-material-raw --output artifacts/neighborhood-20261023/art/shinkyogoku-material-optimized --tools artifacts/neighborhood-20261021/art/tools --retained-texture-size 256 --report artifacts/neighborhood-20261023/art/shinkyogoku-material-optimized/compression-report.json
node experience/art/package_neighborhood_transport.mjs --input artifacts/neighborhood-20261023/art/shinkyogoku-material-optimized --output artifacts/neighborhood-20261023/art/shinkyogoku-material-transport --report transport-report.json --startup-cell cell-e000-n000
```

Before promotion, validate all 74 glTFs, every encoded/decoded transport resource and all section budgets; compare complete decoded per-source geometry/UVs/transforms against candidate7; compare all unrelated materials, original images, lighting and source tables exactly. Record actual new image dimensions/channels, decoded RGBA8 equivalent and required-3D startup bytes. Three 128×128 RGBA8 textures with complete mip chains would total 262,140B; this is a prospective storage equivalent, not a measured GPU allocation.

Actual e006 and Tenmangū day/night captures must use the prior recorded player positions and explicitly preserved desired-camera settings, with resolved camera/lighting/resource metadata. Review underside and seam readability, night glare, the complete actor and unchanged source-framing limitations. The same physical roof participates in both areas' camera tests. Matching geometry alone does not establish rendered quality or human realism.

## Isolated output

Manifest SHA256 is `4e490c35d171aceb160efb70d94ae8c9fc097a2ad4440fe1010c1b619ca7a601`. [Resource audit](resource-audit.json) checks all 74 optimized glTFs with zero input/output validator errors, zero world-position/UV error and exact source indices. All 148 encoded resources and the 74 section budgets pass the [transport report](transport-report.json.gz).

The [independent material/export audit](../../world/shinkyogoku-context/material-export-audit.json), SHA256 `57903f64a25939cd9daeea14ac2a1dc90782c536a61a24353bb7654feb9248c5`, passes all 74 sections and 9,731 section/source comparisons against candidate7. Every existing attribute, oriented triangle, world transform and unrelated material remains exact. Source 116's roof-only material changes in 16 containers. Ten affected sections gain one material batch; six retain their batch count. No TANGENT attribute is exported for the target: 318 triangle-corners use runtime-generated tangent space, with one additional validator warning per affected section and zero errors. Actual frame-budget review remains required.

All previous shared map bytes, the lighting rig, reference/source files and compact runtime source table remain exact. The three new 128×128 RGB WebP maps total 2,386B. Their decoded RGB payload totals 147,456B; the RGBA8 equivalent is 196,608B, or 262,140B including full mip chains. These storage equivalents do not measure GPU allocation. Observed normal-map channels span 128/126–129/255; the restrained relief survives image encoding. Full pixel hashes and channel ranges are in the resource audit.

Required 3D startup transfer is 3,034,606B by day and 3,027,370B by night, including deduplicated local dependencies, the traveller and the selected HDR. Daylight headroom below 4MiB is 1,159,698B. New panel textures are deferred beyond the opening section. Application HTML/JavaScript/CSS/fonts and deferred sections remain separate from this metric.

[Evidence bindings](binding.json) preserve exact manifest, production provenance, compression/transport reports and the executed resource audit. Independent geometry/material review has passed. Actual e006/Tenmangū day/night rendering remains pending. Candidate7 platform day/night review also remains pending because its interrupted camera-safety run ended before those captures.
