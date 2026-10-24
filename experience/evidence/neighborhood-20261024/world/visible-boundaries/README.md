# Source-scoped visible boundary review

Reviewed on 2026-10-24 against candidate9 manifest `79b1a3ed91f0b672364c690e44de9278dce555fab0074ce0dc4aaa8add62f534`. The exact captured cameras and image hashes are retained in [boundary-raycasts.json](boundary-raycasts.json). Candidate10 preserves the affected geometry; its separate all-source audit proves this. No canonical source, horizontal display surface, navigation or production asset changed during this review.

[closure-proposal.json](closure-proposal.json), SHA256 `e1dfea3c79d40ac5a438fe8c1089c6453ba6650df56016af28b33e61173f8b71`, is the bounded handoff. It permits only the listed vertical render faces; visual acceptance remains pending. Endpoints are directed with the higher surface on the left. Existing materials, complete prior geometry, UVs, source identities, transforms and walkable batches must remain exact.

- **Tenmangū:** actual decoded rays identify municipal source731, `kyoto-city:bldg_1bab607d-4c47-48a5-b523-e64000d895f6`. Polygon0 edges5–8 have complete exact adjacency to `shijo-east:ground`, zero footprint overlap and a display-level difference from building base0 to land−0.04m. Four vertical faces add eight triangles. The source establishes the footprint and LOD1 vertical extent; it does not identify an entrance or tenant.
- **Pontochō:** two exact northern shared boundaries belong to road20 (`osm:way:174762073`) and road151 (`osm:way:843727820`). Two vertical faces add four triangles between land−0.04m and road−0.12m. The source20 segment excludes the1.287435m portion covered by crossing path465069412. Existing widths6.4/12.8m and display elevations are authored, not measured curb construction.
- **Excluded:** road151's eastern cap overlaps bridge83 (`osm:way:532008156`, top−0.025m) in plan. It has no exact shared line suitable for this repair. The angular step also contains an existing0.5mm rounded endpoint discrepancy and is withheld. Whole-road/ground overlap values remain explicitly reported; the listed exact lines do not imply that the complete polygons have zero overlap. No blanket foundation, road, bridge or land adjustment is proposed.

The decoded diagnostic uses glTF-Transform4.5.1, meshoptimizer1.3.0 and Three; adjacency uses Shapely2.2.0. It reads the actual indexed mesh attributes and captured camera matrices, rather than claiming a native UI source selection. Fifteen hand-selected image rays identify visible surfaces; this is not exhaustive screen-space coverage. The original executed outputs retain their producer hashes. The portable scripts differ from their ignored originals only in repository-root discovery so they can run at this location.

From the repository root, with the pinned local tooling and immutable candidate9 package available:

```bash
node experience/evidence/neighborhood-20261024/world/visible-boundaries/identify-boundary-surfaces.mjs
PYTHONPATH=artifacts/site-tools-python \
python3 experience/evidence/neighborhood-20261024/world/visible-boundaries/audit-visible-boundaries.py
```

Outputs go to ignored `artifacts/neighborhood-20261024/world/`; portable evidence is not overwritten. Compare semantic results with the retained JSON, allowing only the producer-path/hash change caused by moving the scripts. [visible-boundaries.json](visible-boundaries.json) retains exact shared lines, higher-surface exclusions, source tags, height meanings and nearby overlaps. Its scene/prepared input hashes and the handoff's geography hash bind the unchanged source state.

The portable commands were actually rerun after the exclusive browser window closed. [reproduction.json](reproduction.json) records an exact match for all15 ray results, both camera bindings, all four building edges and both road adjacency records. Only producer-location/hash lineage changes; source and geometry results remain exact.

Before promotion, independently compare every decoded section against candidate10. Allow only eight source731 boundary triangles and four source20/151 boundary triangles using the approved existing materials. Require all existing geometry/material attributes and transforms, source tables, navigation, images and lighting to remain unchanged; recheck transport/startup limits and matched day/night views. A remaining line at an excluded boundary requires its own diagnosis.
