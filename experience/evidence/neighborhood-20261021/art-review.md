# Shijō-east executed-art review · 2026-10-21

The reviewed opening passes the bounded crossing, ground-material and player-readability checks in daylight and night. The six-sight neighborhood visual review remains open. Human realism, enjoyment and physical-device performance have not been established.

## Exact candidate

- Tested local application package: `9f3d1550c6263ca35d6c672da67952afcc3d2fb69ea4cf21d1c661ef06ebb4b6`.
- Neighborhood manifest: `4b543ce1609d5fa90ca92949b99050d06b2607d9e74c5477373dd79d691bd721`.
- Lighting rig: `6f385116cf4a63fa8baf787f8128bb2cccc1b3887e57588d7a754860e8095399`.
- [Browser capture records](art/opening-browser-result.json), SHA256 `abfb696b457a1b3dcfa622c2fa4fb8252e430345c4b8e8a6c1c37cd71d26a0e8`, retain actual camera matrices, player position, resource hashes, settled streaming and lighting state. The original record contains 22 passing checks and one invalid Stop-timing measurement. It is retained as image evidence without an overall functional-pass claim. The separate [focused controls report](art/focused-controls-result.json), SHA256 `07cf2c0df99bbb4423f4705268f35705e6982e90ed11aabb9a44288e43a074a4`, records 10/10 passing checks on the same application package.
- Opening player: source east `20.694`, north `2.33`, height `0`. Camera azimuth `0.22`, polar `1.1`, distance `22`; perspective vertical FOV `48°`. The desktop viewport is `1440×1000`, DPR `1`.

| Actual capture | SHA256 |
| --- | --- |
| [Daylight · English](art/opening-day-en.png) | `f9476f604f7a349659619dc7bcfddd9e7f4f7f1dc16817230268f6036e8097eb` |
| [Night · Chinese](art/opening-night-zh.png) | `b95ad6c46cde56bd5be86113b6ac11ba7a6e46bb9afdd34056dd3f9b28b0c7fc` |
| [Daylight viewport at page top](art/opening-day-viewport.png) | `f540ad6cb0a83447ba7de1347c798000ef676739cd46d7c98b71939c5e020bbd` |
| [Daylight full page at scroll zero](art/opening-day-page-top.png) | `5eaac2277f1230449bc23d9903fcb844fdaeb4748c2f41750a5a15322c4958cf` |

The full-page images retain a desktop sticky-column offset after scrolling. The separate [page-top capture](art/opening-day-page-top.png), viewport image and measured canvas top `574.8px` document the actual opening layout with the same camera matrix. Their scroll/camera provenance is in the focused controls report.

## Observed opening quality

- Asphalt meets the retained curb/tactile edge, and the zebra reads as paint on a continuous roadway. The bounded roadway mask comes from the original reviewed Shijō GLB road tops, with its raised sidewalk tops subtracted.
- Mitsui's pale wall, individual recessed dark windows, curved classical corner and layered canopy remain distinguishable. The traveller remains visible beside the crossing in both modes.
- Night has warm local pavement pools and illuminated corner columns, with darker upper glazing. Shadow direction and player grounding remain readable in the inspected pose.
- The stone, glass and asphalt retain an authored illustrated appearance. Glazing does not expose reconstructed interiors. Angular joins at the bounded western roadway transition and long night shadow wedges remain visible limitations.

## Source and production limits

The continuous scene uses source footprints, prepared surface polygons and source-derived building heights. Connector façade families, opening dimensions, material assignment, flat navigation grade, canopy clearance, river/deck heights and light fixtures are authored. The [reference ledger](../../public/assets/neighborhoods/shijo-east/references.json) records seven inspected licensed photographs and their date/viewpoint limits; photograph pixels are absent from runtime materials. Source correspondence at individual connector shopfronts is unverified.

The retained Shijō roadway mask is bounded to the original `x=0…64`, `y=−25…15` display area and remains an authored visual treatment. Navigation coordinates and its walking-surface union are preserved. One nonwalkable numerical paving sliver is recorded in [provenance](../../public/assets/neighborhoods/shijo-east/provenance.json): area `1.301756×10⁻⁶m²`, boundary difference `2.169546×10⁻⁶m` after float32 display conversion.

The [compression report](../../public/assets/neighborhoods/shijo-east/compression-report.json) covers 74 glTF assets with zero validator errors. Decoded world positions, UVs and source indices match the uncompressed Blender exports; maximum normal/tangent component error is `0.0000152587890625`. Source-coordinate precision and physical survey accuracy are separate matters. All six inspection IDs remain present.

Original route textures use 256px maps; retained Shijō textures use approved route-only 256px derivatives. Lossless WebP pixels match those sampled inputs. The 512×256 route HDR derivatives preserve mode exposure/intensity; measured mean linear RGB differs by less than 0.5% from each original. Existing standalone Shijō/Ginza asset bytes are unchanged.

## Required 3D payload

[Measured byte audit](art/startup-audit.json) counts the manifest, resident ground/context, spawn BASE, deduplicated dependencies, lighting rig, selected HDR and shared traveller. Deferred cells and page JavaScript/CSS/fonts are separate transfer accounting.

| Item | Bytes |
| --- | ---: |
| Daylight required 3D resources | 4,152,813 |
| Daylight headroom below 4 MiB | 41,491 |
| Night required 3D resources | 4,145,577 |
| Night headroom below 4 MiB | 48,727 |
| Ground / context geometry | 406,549 / 411,420 |
| Mitsui BASE / NEAR geometry | 1,328,346 / 3,150,539 |
| Daiya NEAR geometry | 1,961,229 |

Only Mitsui NEAR has the approved 3.5 MiB exception. Ordinary sections and other resident/base assets retain 2 MiB limits. The 10,974 tested corridor points have complete cell coverage. Resident geometry, rendered shadow submissions and estimated texture allocation require separate runtime counters; compressed transfer bytes do not establish frame rate or GPU allocation.

## Arcade and remaining route

The [completed bounded arcade report](art/arcade-result.json), SHA256 `4096de8b10722d34e3f52a6c5bf71b475b1a6630b5fba9583bbe34a5378fb408`, records six passing checks and two failures on the same `9f3d1550…` local package. It reconstructs the exact previously walked position approximately 21m before Market, then records actual walking to Market and another 20m inside. This establishes that observed segment; the complete neighborhood traversal remains a separate check.

The ordinary interior composition fails the player-framing gate. At Stop, camera collision constrains the camera distance to `0.2m`; the actor's head projects above the viewport (`NDC y=1.019`). The actor and paving dominate the image, with the hat/head cropped and no useful view along the arcade. The interior surface-inspection check also fails in this report. Camera recovery and inspection require a corrected runtime and fresh actual captures before release acceptance.

| Actual interior capture | SHA256 |
| --- | --- |
| [Ordinary daylight](art/inside-arcade-day-canvas.png) | `884660158f575c9989f060e3a9ed33dc826a512d2859b8762fa946e093637ef2` |
| [Ordinary night](art/inside-arcade-night-canvas.png) | `37f52186ef1880afd74f9503ab8d932a14e72aa1bcf292271f04baca3f18668e` |
| [Below-roof daylight, actual controls](art/inside-arcade-below-roof-day-canvas.png) | `01dcff9ee20db812c80f3c5b94a41737fbfcde78c07531d2e5f01bdf84685970` |
| [Below-roof night, actual controls](art/inside-arcade-below-roof-night-canvas.png) | `b7ba3881af7a1ad6c1c6275a9fcb1fe5d59cfe4e5a9b0ae49dd92e599eaa29f3` |

Actual orbit/tilt/zoom controls expose the colored pitched roof strip and repeated downlights while preserving player position. Night pavement illumination and wall/window depth are visible. The source-recognition limit is also visible: the narrow suspended canopy, exposed sky and repeated multi-storey glazed façades provide a simplified arcade interpretation; the reviewed Nishiki photograph shows a more enclosed roof/soffit composition and varied close commercial fronts. Near-window obstruction remains prominent in this pose. These images do not establish acceptance of the arcade's overall realism or individual shopfront identity.

Takase River, the Tenmangū street approach, Pontochō entrance, Shijō Bridge and their connectors require actual route captures before a whole-neighborhood visual disposition. The opening approval remains limited to its inspected location and poses.
