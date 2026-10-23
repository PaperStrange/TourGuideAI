# Shinkyogoku canopy reference review

Reviewed 2026-10-23 for the actual local point `(682.274,69.952)`, WGS84 latitude `35.0043695353`, longitude `135.7671933419`. [The source audit](source-audit.json) places it inside retained roof way `551741577`, version8, dated 2025-11-14. Covered pedestrian way `1568699671` identifies 新京極通. The roof's plan spans local bounds `[678.354170,9.241356,709.015844,547.303509]`; its cross-section at the reviewed northing spans `x679.618780–683.881475`, approximately4.262696m. These dimensions derive from mapped plan geometry. Construction heights and clearances remain unknown. The existing scene's5m roof height is authored.

The [merchant association's 2022 announcement](https://www.atpress.ne.jp/news/305224) identifies polycarbonate roofing and a replacement programme begun in November2021, with completion then planned for November2022. Its published after-work photograph shows pale translucent curved panels and repeated framing. The exact photograph location within the street is unspecified. [Reference metadata](reference-review.json) retains the image hash, caption, date and rights limit. The private reference image supplies no licensed runtime texture.

This evidence supports a street-specific material review. An exact southern roof profile, support arrangement and facade connection still require a matching view and approved authored dimensions. No architecture, canonical geography, navigation or runtime files changed during this research.

The compact source audit was produced by `artifacts/neighborhood-20261023/world/audit-shinkyogoku.py` using Shapely2.2.0 against the retained raw OSM response and frozen scene; both source hashes are embedded. It checks complete ring-node availability, polygon validity, point containment and the actual plan cross-section. OSM data is © OpenStreetMap contributors, ODbL1.0. Current access and construction condition were not surveyed.

## Independent material export audit

[The portable export audit](material-export-audit.json) records the actual frozen candidate manifest `4e490c35d171aceb160efb70d94ae8c9fc097a2ad4440fe1010c1b619ca7a601` against the platform-open baseline `679241ee06a8115ad3f95ddd523c2f56555b900f3ecc4437d272573a968ec4e5`. The original source and reference records above remain unchanged.

[The independent driver](audit-material-export.mjs) decoded all74 sections with glTF-Transform4.5.1 and meshoptimizer1.3.0. All9,731 section/source groups preserve their oriented triangles, original position/normal/UV/source attributes and world transforms. Unrelated complete material definitions and original texture bytes remain exact. Only source116's existing roof faces receive `shinkyogoku-panel`, across eight cells and both detail levels; their edge-frame material remains unchanged. Ten of those16 sections gain one material batch, which requires actual browser cost review.

The three original128×128 RGB WebP maps total2,386B. Sharp0.35.5 independently checked their dimensions and pixel statistics. The exported roof contains no `TANGENT` attribute: all318 target triangle-corners retain the prior attribute set. The validator reports one added `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE` warning in each affected section and zero errors. Tangent orthogonality has no exported values to test; actual renderer appearance remains part of browser acceptance.

All148 gzip resources expand to their declared decoded bytes and hashes. The largest transferred geometry section is1,740,511B. Required3D startup is3,034,606B by day and3,027,370B by night, including the manifest, resident ground/context, opening BASE section, deduplicated dependencies, lighting rig, chosen HDR and traveller. Both remain below4MiB. Application HTML/JavaScript/CSS/fonts, deferred sections and HTTP framing are outside that figure. Three complete128×128 RGBA8 mip chains would occupy262,140B; this is a storage equivalent, and actual GPU allocation is unmeasured.

From the repository root, with the pinned art toolkit installed and both frozen candidate directories retained:

```bash
node experience/evidence/neighborhood-20261023/world/shinkyogoku-context/audit-material-export.mjs artifacts/neighborhood-20261023/art/platform-open-transport artifacts/neighborhood-20261023/art/shinkyogoku-material-transport artifacts/neighborhood-20261023/world/shinkyogoku-material-audit
```

The driver produces the complete per-source report in the ignored output directory. Its SHA256 is recorded in the compact portable audit, together with the driver, baseline, candidate, canonical geography and scene identities. The audit does not modify production inputs or public assets. Visual acceptance of e006 and the Tenmangū approach remains separate; the material does not claim a measured canopy profile or current construction condition.
