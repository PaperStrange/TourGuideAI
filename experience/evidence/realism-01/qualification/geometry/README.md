# Original geometry inspection

6 November 2026 · Kyoto City / MLIT Project PLATEAU · CC BY 4.0.

[Acquisition receipts](download-receipts.json) bind 73 original B3DM files
(41,151,256 bytes). [Inventory](inventory.json) preserves the 25 m route-neighborhood
selection, ward, parent content, depth and refinement metadata. It includes
51 Nakagyo building tiles, seven Shimogyo building tiles, one Higashiyama building
tile, two road tiles and 12 furniture tiles.

| Measured quantity | Result |
| --- | ---: |
| Original object occurrences | 2,269 |
| Original triangles | 152,473 |
| Selected object occurrences | 1,965 |
| Selected triangles | 119,514 |
| Excluded overlapping ancestor occurrences | 304 |
| Unresolved source alternatives | 0 |
| Building occurrences by declared object LOD | LOD1: 6; LOD2: 2,086; LOD3: 21 |
| Ordered route edges indexed by actual projected geometry | 54 |

Counts describe acquired source contents, which can extend beyond the route.
[Complete object records](objects.geojson.gz) retain every original occurrence,
triangle-union footprint, source ID, selected state and height range. Gzip is
lossless; the [manifest](manifest.json) binds both compressed and decoded bytes.
[Geometry audit](geometry-audit.json) maps surfaces within 25 m of each route
edge and records representative-point side. This side classification cannot
establish a visible or accessible frontage.

[Content selection](content-selection.json) records every exclusion with its
same-object GML ID, source REPLACE ancestry and measured horizontal/vertical
overlap. The viewer filters batch indices; retained vertex positions, UVs and
materials remain unchanged. Zero unresolved alternatives is required before
capture. The review package has no authored ground or architectural repair.

The parser uses py3dtiles/pygltflib for B3DM/GLTF, DracoPy for source primitives,
Pillow for texture headers, PyProj for coordinate conversion and Shapely for
projected triangle unions. GLTF Y-up is converted to Z-up, translated by
CESIUM_RTC in ECEF, and rotated into the local east/up/south frame. The origin
height is zero on WGS84 ellipsoid. Original gravity-related source heights are
retained separately; no geoid conversion or surveyed ground tie has been applied.
Projected footprints use the explicitly recorded local AEQD CRS.

[Review manifest](review-manifest.json) binds each extracted GLB by SHA-256,
placement matrix, texture identity, selected batch and triangle count. Its six
camera anchors use the nearest selected building's minimum vertex height, with
`heightQualified: false`. The route tangent sets approach direction. Browser
images use a 1.7 m eye offset; elevated context uses 27 m. These are diagnostic
camera placements, with no pedestrian-ground or collision acceptance.

## Reproduction

Raw B3DM and extracted GLB files stay under ignored `artifacts/realism-01/`.
Install [pinned dependencies](../../../../tools/source-qualification/requirements.txt)
there. The saved producer/library identities are in the manifest. Acquire the
adjacent-ward indexes using the [ground recipe](../ground/README.md), then:

```sh
PYTHONPATH=artifacts/realism-01/geometry-tools:artifacts/realism-01/inspection-tools python experience/tools/source-qualification/geometry.py acquire --root . --cache artifacts/realism-01/downloads/route-qualification
PYTHONPATH=artifacts/realism-01/geometry-tools:artifacts/realism-01/inspection-tools python experience/tools/source-qualification/geometry.py inspect --root . --cache artifacts/realism-01/downloads/route-qualification --output artifacts/realism-01/runs/route-qualification
node experience/tools/source-qualification/capture-review.mjs --manifest artifacts/realism-01/runs/route-qualification/review-manifest.json --serve --port 4198
```

Existing receipts are checked before cached bytes are reused. A fresh acquisition
has new timestamps; compare source file hashes with retained receipts before
review. Reproduction from identical cached inputs must reproduce all five output
JSON/GeoJSON files and 73 GLBs. The manifest's `models/` paths describe generated
assets; those assets are intentionally excluded from this tracked evidence folder.

The source metadata assigns FY2021 aerial imagery to LOD2 and FY2023 vehicle
imagery/laser to LOD3. Metadata publication in 2026 establishes no current façade,
entrance, floor or lighting condition.
