# Ginza streetscape and material review · 2026-10-21

## Actual browser views

The seven images below show model `ca7098c9…` in tested local package `63f81363…`. Chromium 151.0.7922.34 rendered the scene after the selected HDR reached `ready`. Desktop viewport is 1440 × 1000; phone viewport is 390 × 844. The [focused report](browser/packs-result.json) records 12/12 passing checks, exact image hashes, observed player/camera states, matrices, asset hashes and lighting modes. Its SHA256 is `6a0b70a499fbcf44044cf5bb317ccf99ae35f292dec472779fbb8759b5de86c1`.

| View | Day | Night |
| --- | --- | --- |
| English desktop opening | [Image](browser/ginza-opening-desktop-en-day.png) | [Image](browser/ginza-opening-desktop-en-night.png) |
| Chinese phone opening | [Image](browser/ginza-opening-phone-zh-day.png) | [Image](browser/ginza-opening-phone-zh-night.png) |
| English desktop second frontage | [Image](browser/ginza-day-en.png) | [Image](browser/ginza-night-en.png) |
| Chinese phone second frontage | — | [Image](browser/ginza-phone-second-frontage-close-zh.png) |

The final capture run restored and verified the actual version-3 poses recorded during the completed walk. It establishes the appearance at those positions; it does not represent a second full traversal. The complete clock tower and rod fit the opening views. The closer views deliberately frame the facade, with the tower extending above the image.

Art reviewed all seven images against the [October 19 browser evidence](../../area-packs-20261019/art/README.md). No additional art blocker was observed in this bounded revision. User recognition and realism judgment remain unverified. Automated assertions establish capture identity and behavior; they do not establish visual realism or physical-device performance.

## Visible findings

1. **Street structure:** the two carriageway directions, differentiated pavement and mapped crossing fragments establish a connected corner. The neighboring source footprints produce an adjoining street edge beside Wako. These changes are most apparent in the second-frontage views and the walked corner images below.
2. **Building character:** the rounded corner, arched upper openings, rectangular wing openings, major cornices, clock face and stone piers remain readable. The final glazing retains visible mullions and recess boundaries in both modes. Its original color/roughness variation and clearcoat are restrained at opening scale; the images do not support a claim of a large surface-detail transformation.
3. **Night hierarchy:** the clock, central facade wash and separate pavement pools remain distinct. The pool boundaries appear more gradual, with the actor grounded beside the lit frontage. Stone and window divisions remain readable outside the brightest region. The central vertical wash is still conspicuous.
4. **Interaction composition:** the yellow-clothed actor remains visible in the opening and closer frames. Phone guidance sits below the canvas; Reset and the inspection reticle remain readable. The opening prioritizes the building and leaves the actor small.

The surroundings remain simplified: broad plain land surfaces and the distant scene boundary are visible, adjoining facade layouts are authored, and nighttime asphalt remains very dark. Glass uses opaque reflective PBR; interiors and doorway access are unverified. This evidence supports a source-led authored street presentation, with no measured-reconstruction, current-lighting, current-occupancy or photorealism claim.

## Walk evidence and preserved geometry

The [full interaction report](continuity/packs-result.json) records **81/81** checks on earlier tested local package `db924643833272d490e939a884057156bb7b7ac7b94a4341035e213f17e69b3e`, model `b098e7755238836dcc83871026506036e4a3d01c3f62f19d9f8b8602c12ac99f`. Its report SHA256 is `11f39b8e3f78e853e5c1a756532b5ced5de5fb8db230c383bc4e35d2615b77c0`. That run exercised actual desktop/phone walking, the corner, second-wing framing, surface inspection, saved return and camera recovery. The report preserves actual per-target progress and grounding observations.

- [Desktop corner](continuity/desktop-ginza-sidewalk-node-2.png) and [second-frontage arrival](continuity/desktop-ginza-sidewalk-node-4.png).
- [Phone corner](continuity/phone-ginza-sidewalk-node-2.png) and [second-frontage arrival](continuity/phone-ginza-sidewalk-node-4.png).

The final material revision preserves all **55** mesh POSITION/index payloads, accessor layouts and complete node/ancestor transforms, verified with `pygltflib` in [the all-mesh audit](ginza-glazing-geometry-preservation.json). Lighting and glazing roughness bytes also remain identical across those two candidates. The earlier [42-mesh preservation audit](ginza-geometry-preservation.json) compares the landmark and rendered walkway/apron with the October 19 model. Both audits retain their exact model identities; neither substitutes for a new full walk on the final material bytes.

## Camera and asset identity

All poses use local east/north metres and Wako's 48° vertical field of view. The observed camera matrices are retained per image in the focused report.

| Pose | Player east/north | Azimuth / polar / distance | Target offset east/north/height |
| --- | --- | --- | --- |
| Opening, both viewports | −13.728 / 12.434 | 0.05 / 1.49 / 64 | 13.7 / 0 / 24.5 |
| Desktop second frontage | 19.541 / 16.504 | 0.93 / 1.43 / 32 | 10.190118 / −6.114710 / 18.559373 |
| Phone second frontage | 19.541 / 16.504 | 0.937867 / 1.49 / 29.807511 | 9.268132 / −7.016929 / 16.830025 |

| Final item | SHA256 |
| --- | --- |
| Tested local application package | `63f813639c87a260855d68b52222fc0dda4134668808132f85f7b7a4a7cb706f` |
| Model | `ca7098c975f745292a9fcb2743a6f6d08c5b3d3f3c948daaac5d409715f83e17` |
| Pack manifest | `42b5547cf2de36a07e4ccbd06186597a4de53029a8c1b71cedfbade932b22eba` |
| Pack lighting rig | `84f2e2968dc0d55e18d9614bbd0c6d82ce49534ad435fc6476d2ff0625b56699` |
| Material policy | `0ff52232fb0f8c95cbb5b7a2e83a5589a6f36efddbe1eb60779c5a2397e5e144` |
| Generator | `5b2d6e577eed889b9ae33ff0d07d1ed0aa98312e1cc5cdfd4e00168677de9a3c` |
| Canonical landmark source | `6e583689dc460e4a9c496838c44f57925bb8dc4b546338e4ff58f6967eddf674` |
| Canonical context source | `8afacd1d73dc1326466388f6e093538e775b97dafb6b3256c21721daf9c163e3` |

Shared HDR hashes remain daylight `d0b515b6741e44ceaa7dc2e42a64ec30f61871ae313762729c6a14f5343484f2` and night `a690048dcecabf5ed1ad773f7abdec7cce7b1fea4d89b17f054a18f3e0fa2919`. These licensed environments supply illumination and reflections. Background color, fixtures and their calibration are authored. Night retains three shadow-casting pavement spots and two unshadowed facade/tower washes.

## Source boundaries and reusable production method

The [context source](../../../content/ginza-wako/context.json) retains OSM IDs, original coordinates, versions and source tags. Nearby footprints are ways 103509466 and 449618283, both tagged with eight levels. Their 25.6 m heights, window arrangements and finishes are authored. Road paths are ways 884274229 and 1026056857; display widths of 9.6 m and 7.2 m, branch sidewalk width of 3.2 m, kerbs and stripe width are authored. The short Harumi crossing segment is retained within its available source extent.

GEOS-derived road, sidewalk and land polygons retain holes and exclude the original corridor, apron and building footprints. Their triangulation coverage and overlap checks are recorded in context provenance. The original 55.281851 m walking centreline, authored 4 m corridor, actor clearance, origin and Wako source dimensions remain unchanged. Added context has no navigation or entry meaning.

The reusable method is to keep source geometry and unknown dimensions explicit, preprocess surface exclusions, author shared original PBR material classes, preserve semantic inspection/occlusion groups, and review matching browser poses while moving and paused. Linear material colors are encoded as sRGB for Base Color images; normal and roughness data retain non-color interpretation. Fixtures are positioned clear of projecting trim, with shadow bounds fitted to the sourced scene. The [export provenance](../../../public/packs/ginza-wako/provenance.json) records the exact generated asset and reference boundaries. Its status describes export time; this document records the subsequent browser review.

## Measured resource budget

| Measurement | Actual | Cap |
| --- | ---: | ---: |
| GLB, including embedded images | 8,148,792 bytes | Included in pack cap |
| Entire pack, including JSON/manifest | 8,268,894 bytes | 8,388,608 bytes |
| Triangles | 87,154 | 100,000 |
| Mesh/material batches | 55 | 64 |
| Embedded original images | 14 | Included in pack cap |

The pack retains 119,714 bytes of margin. Blender 4.3.2 records 62.69 seconds for the final CPU export invocation; this is an export measurement. Shared traveller/HDR assets are excluded from marginal pack bytes. Actual GPU allocation and hardware frame timing were not measured here.

The [embedded-image color audit](ginza-glazing-color.json) uses `pygltflib` 1.16.5 and Pillow 12.3.0. The actual 128 × 128 RGB tint PNG has encoded byte means `[117.6226, 130.4539, 134.4041]`; sRGB decoding yields linear means `[0.180021, 0.224996, 0.240034]`, matching authored `[0.18, 0.225, 0.24]`. Both glass materials reference this image. Reproduce from the repository root with the [audit script](verify-ginza-glazing.py):

```sh
PYTHONPATH=artifacts/site-tools-python python3.12 experience/evidence/global-sites-20261021/art/verify-ginza-glazing.py --assets experience/public/packs/ginza-wako --output experience/evidence/global-sites-20261021/art/ginza-glazing-color.json
```

Shijō model `f4135e225f0575daca660c055a5fbdbc4ef3af31bd72736d1dbc806f07ff331c`, shared traveller `ee5307da94f4d1994e5323a0d31d6f79a255c9f2f10459e0a0e6434fb051fdb1`, and original lighting rig `29cc4209b243e3c069f3516cd0c236c68c0bcb0cb2526aa285f2fdd15caf1766` remain byte-identical.
