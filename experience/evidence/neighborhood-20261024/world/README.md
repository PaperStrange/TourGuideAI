# Source review for the remaining art corrections

Reviewed on2026-10-24. Canonical scene and navigation remain unchanged.

The [torii paper review](torii-paper-review.json) binds the retained full-resolution2007 original, CC BY2.0 credit, mapped node5204263033 and source index1047. Visible folded white streamers support an original matte nonemissive material on the existing hanging faces. Exact PBR values remain authored. Plaque lettering and geometry remain unchanged in this increment; current decoration and night photometry remain unverified. Record SHA256: `1c0d04780039823cdce0831bd32867373082b329b57c4ae53a167b16238b03d4`.

The [floor boundary audit](floor-boundary.json) reads the frozen scene and prepared display surfaces with Shapely2.2.0. The complete64.46802097165m source223 perimeter adjoins `shijo-east:ground` at authored−0.04m while the existing floor is at0. Shared boundary is complete, unmatched length is0, and positive-area overlap is0. Four vertical boundary closures can join those existing display levels while retaining the exact cap, footprint, roof, posts and nonwalkable status. Their dimensions describe a display repair; real curb construction and pavement height remain unmeasured. Record SHA256: `1ca8cd8131f2d2d1dcdee8328292c3fd0c8172e60122d02e0ddc76b833be1d70`.

The bounded read-only check was run with:

```bash
PYTHONPATH=artifacts/site-tools-python \
python3 artifacts/neighborhood-20261024/world/audit-floor-boundary.py
```

The [connector association record](connector-associations.json) identifies one retained, dated Daimaru photo suitable for a subsequent source201 south-face review. The municipal footprint overlaps named OSM205748651 by98.181%. Its source-associated edge and photo-visible architectural cues are recorded, with current-condition and full-elevation limits. The current art correction does not alter this frontage. The official Nishiki association pages establish the named shop's block context; exact municipal facade correspondence remains open.

Production acceptance requires an independent decoded comparison against candidate9: source223 may gain eight perimeter triangles, source1047 may change only the existing hanging-face material, and all other geometry/materials/source identities/world transforms must remain exact. Resource hashes, gzip identities, section/startup budgets and matched day/night browser views remain required.

## Independent candidate10 export audit

[The executed audit](candidate10-export-audit.json), SHA256 `97989383be234776aeafe54f22f1771c9151044d6a3cf6e28c34aa219e816160`, passes on frozen manifest `e58257879fb4ead8af14022e71e329ee3309f9920eec6fe2cf4717276573d108`, provenance `93eddcc5951f77ce4b451eea72743672f622583a71d733ba711ad7fb76b41696`. Baseline is candidate9 manifest `79b1a3ed91f0b672364c690e44de9278dce555fab0074ce0dc4aaa8add62f534`.

All74 sections and9,731 source groups were decoded with glTF-Transform4.5.1 and meshoptimizer1.3.0. Both platform LODs retain every existing110 triangle with exact attributes, material and world transform. Eight additional triangles form four outward perimeter faces between0 and−0.04m, with two triangles on each exact source-ring edge. Torii source1047 changes only the material on six existing NEAR triangles. Their complete positions, normals, UVs, source values and world matrices remain exact. The exported paper material is opaque, nonmetallic, nonemissive and texture-free, with roughness0.899999976. All other materials, including arcade lamps, remain exact.

The audit verifies all148 declared gzip round trips and both section/startup limits. The package contains347 files;311 retain exact baseline bytes. No images were added, and shared images/HDR/lighting, canonical geography, source indices and navigation remain unchanged. Required3D startup transfer is **3,037,230 bytes by day** and **3,029,994 bytes by night**. Decoded resource totals remain distinct from compressed transfer; application HTML/JavaScript/CSS/fonts, HTTP framing, GPU memory and frame cost are outside those figures. Matched browser appearance still requires its separate review.

Reproduce with an unused ignored output directory and the pinned art toolkit:

```bash
node experience/evidence/neighborhood-20261024/world/audit-candidate10-export.mjs \
  artifacts/neighborhood-20261023/art/candidate-9-transport \
  artifacts/neighborhood-20261024/art/candidate-10-transport \
  e58257879fb4ead8af14022e71e329ee3309f9920eec6fe2cf4717276573d108 \
  artifacts/neighborhood-20261024/world/candidate10-export-audit-repeat
```

The [producer](audit-candidate10-export.mjs) SHA256 is `7c82b3da0f1945aebd78a2f2904b00120201b5fdb810cc897fafa3c8dfcd51f0`. It retains original oriented triangles and complete decoded attributes in exact per-source comparisons. Frozen input artifacts remain read-only.
