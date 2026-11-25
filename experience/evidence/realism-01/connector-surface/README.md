# Kyoto source-derived surface experiment

Four original Panoramax panoramas now produce an inspectable textured surface through official CPU OpenMVS 2.4.0. Source positions remain west of the approved route start. Geometry retains the native arbitrary scale and original upper-hemisphere masks.

| Recorded output | Measured result | Evidence |
|---|---:|---|
| Physical fitting sources | 4 original panoramas, ranks 68–71 | [Intake](../connector-surface-sources/manifest.json) |
| Reserved evaluation sources | Ranks 67 and 72, excluded from reconstruction | [Assignment](../connector-surface-sources/assignment.json) |
| Original / retained virtual views | 48 / 32; 16 have zero valid mask pixels | [Preparation](run-02/prepared.json) |
| Imported camera identity | Maximum binary roundtrip pose difference 4.44×10⁻¹⁵ | [Preparation](run-02/prepared.json) |
| Dense points | 39,651; 7 / 14,472 / 25,172 supported by 2 / 3 / 4 physical positions | [Dense result](run-02/dense-result.json) |
| CPU depth estimation and fusion | 48.91 seconds | [Actual log](run-02/03-dense.txt) |
| Clean mesh | 33,482 vertices, 66,755 triangles | [Mesh result](run-02/mesh-result.json) |
| Native texture | One 8192² RGB JPEG; 256 MiB RGBA base allocation | [Texture result](run-02/texture-result.json) |
| Full-resolution packing derivative | One 4096² lossless RGB PNG; 64 MiB RGBA base, 85.33 MiB complete mip chain | [Actual derivative](texture-4096-01/result.json) |
| Derivative geometry identity | All 66,755 oriented triangles and original float32 positions preserved exactly | [Independent comparison](texture-4096-audit/result.json) |
| Derivative / native atlas samples | Mean RGB difference 1.158/255 across 264,484 interior triangle samples | [Independent comparison](texture-4096-audit/result.json) |
| Recorded texture assignment marker | 634 faces have the native constant-UV unassigned marker | [Independent audit](mask-audit/run-02-texture-assignment-audit.json) |
| Matched review cameras | Four original direction-9 cameras, 1520² reference images | [Review inputs](review-inputs/manifest.json) |

The [independent geometry review](../connector-surface-qa/README.md) records five mesh components and unsupported interpolation limits. Every dense point has at least two physical source positions and every recorded support observation has positive depth. Forty-three full-resolution projected observations lie 1–1.414 source pixels outside a valid mask boundary; nine observations lie outside at the native 760² depth-map scale. Three dense points have a maximum physical support angle below the 1.5° diagnostic. These measurements remain part of the evaluation.

The mesh retains open boundaries. Ground, collision, independent landmark discovery, real-world scale, lighting changes, production streaming and continuous 1.35 km walking remain unqualified. The [actual held-out evaluation](../connector-surface-evaluation/README.md) localized both reserved panoramas against frozen geometry. Native-atlas surface coverage reaches 30.24% and 13.03% of their eligible upper-hemisphere pixels; covered-pixel RGB errors outside pose-candidate neighborhoods are 19.28/255 and 36.52/255. This incomplete surface fails appearance and route acceptance. Source viewpoints reused for fitting provide camera and rendering comparisons only.

The [full-resolution 4096-atlas glTF/PNG variant](texture-4096-01/manifest.json) has its own output identity and [independent review](texture-4096-audit/README.md). It preserves the original native 8192-atlas result. Measured atlas differences include JPEG compression and UV serialization; source-assignment identity is unqualified. The native OBJ export always writes `Tr 1`; its RGB-only material and loader behavior are documented in the [official exporter proof](mask-audit/manifest.json). Three's supported `invertTrProperty: true` reads this exporter convention while preserving native MTL bytes.

| Attempt | Recorded outcome | Retained files |
|---|---|---|
| `run-01` | Dense execution terminated at mask-path lookup; geometry was not produced | [Manifest](run-01/manifest.json) |
| `run-02` | Import, CPU depth, mesh and original-resolution texture completed | [Manifest](run-02/manifest.json) |
| `texture-4096-01` | Native 4096-atlas glTF/PNG export completed at unchanged source resolution | [Manifest](texture-4096-01/manifest.json) |

The [toolchain](toolchain/manifest.json) retains the exact release metadata, executable checks, command help, method source and dependency report. [Reproduction and offline verification](../../../tools/connector-surface/README.md) require fresh output identities. Each retained record carries source, date, rights, location, method, limitations and SHA-256; gzip records also bind their original bytes.

Photographic derivatives are attributed to Irvin Chen / Panoramax Taiwan, captured 17 February 2026, under CC BY-SA 4.0. Original image URLs, coordinates, license metadata and acquisition receipts remain in the [source intake evidence](../connector-surface-sources/README.md). Their declared GPS accuracy is 4 m. These neighboring views share a capture family; they provide no independent ground survey.
