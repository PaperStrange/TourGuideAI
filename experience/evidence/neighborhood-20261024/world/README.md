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

## Independent candidate11 export audit

The [source boundary review](visible-boundaries/README.md) identifies four exact source731 building edges and two road20/151-to-land segments. The [executed export audit](candidate11-export-audit.json), SHA256 `2dd0f205a63772c717b2cd1016e4066f5f4a6e9d9424ada77108d5627281ccc8`, passes against candidate10. Candidate11 manifest is `4fb428b9d5b73274f0e64726cdf045f034e7be1823b8919f7ea6ef7d3bc09544`; provenance is `f457de851f3c156ec0d35a06163b466f14fc35a7802641e0b1f31f01c7dc3eef`.

All74 sections and9,731 source groups were independently decoded. Source731 retains all496 BASE and1,870 NEAR triangles with complete original attributes/materials/world transforms; each LOD gains eight `tile-wall` triangles on the four approved boundaries, from0 to−0.04m. Road20 retains16 original resident triangles and road151 retains7; each gains two `paving` triangles between−0.04 and−0.12m. Their exact float32 endpoints, heights, outward winding and full rectangle coverage match the reviewed segments. Both road additions belong to `Resident_paving` with `walkable:false`. The excluded crossing coverage, bridge overlap and rounded angular step receive no added faces.

All prior source geometry, material definitions, node metadata and world transforms remain exact. The two resident walkable primitives additionally retain byte-identical decoded attribute and index arrays. Canonical geography, scene, prepared input, source records, feature table, images, lighting and river context are unchanged. The347-file package has310 byte-identical files; reordered retained containers still pass their complete decoded comparison. All148 gzip resources decode to their declared originals, all74 validation reports contain zero errors, and every section meets its transfer limit.

Measured required3D transfer is **3,036,911 bytes by day** and **3,029,675 bytes by night**, below4MiB. Decoded resource accounting remains separate. These checks establish export/source preservation; matched visual review and runtime measurements retain their separate acceptance scope. Boundary dimensions describe authored display repairs and establish no surveyed foundation or curb construction.

Reproduce with a fresh ignored output directory:

```bash
node experience/evidence/neighborhood-20261024/world/audit-candidate11-export.mjs \
  artifacts/neighborhood-20261024/art/candidate-10-transport \
  artifacts/neighborhood-20261024/art/candidate-11-transport \
  4fb428b9d5b73274f0e64726cdf045f034e7be1823b8919f7ea6ef7d3bc09544 \
  artifacts/neighborhood-20261024/world/candidate11-export-audit-repeat
```

The [audit producer](audit-candidate11-export.mjs) SHA256 is `0c9cc5811c9ae443270c666dade7538b731443c1bdd07fcf9ef4766d13eca534`.

## Independent candidate12 export audit

The [source-associated frontage records](connector-fronts/README.md) bound the approved source201 south edge3 and source274 south edge2 treatments. The [executed audit](candidate12-export-audit.json), SHA256 `ccba681ffcab6f0daa807c10d7e377e5553b6b608f0790b6df8df3ba24467b17`, passes against candidate11. Candidate12 manifest is `86e4f424a36cb858c16f6e282ad8ceb8f146d6b285d482de3c0ce2fe2f726b61`; provenance is `4be84e2d9c2bbb50979ed6df2f591f61df0ad651c0e864ce6b1679b9d8fadb3c`.

All74 sections and9,731 source groups were independently decoded. Both facade LODs preserve every original triangle intersecting below3.5m, complete inherited crossing panels, roof/cornice, other edges and their complete source envelopes. The decoded inherited seams are3.836241722m for201 and3.827879906m for274. Changed triangles remain on the approved upper faces, within authored inward recess limits of0.06m BASE and0.20m/0.12m NEAR respectively. Regional membership allows20 micrometres for source-to-float32 rounding; protected triangle attributes/materials/transforms remain exact. Combined BASE triangle count increases by2,648; combined NEAR decreases by2,780.

Nishiki source139 retains exact oriented triangles, positions, normals, UVs, source values, world transforms and entrance-trim material. Only its existing colored roof faces receive the three dedicated material roles. Ten sections contain the verified paired opposite-normal roof vertices; maximum deviation from the existing authored45mm separation is0.0000000763m. Role metadata is source-specific, with diffuse fraction0.55, zero ordinary transmission/emission and metalness0. These optical values and roof separation are authored; they establish no measured roof construction or current lighting.

Every unrelated source retains exact decoded attributes/materials/transforms/metadata, including the prior platform, paper and boundary corrections. Both resident walkable primitives retain byte-identical decoded attribute and index arrays. Canonical geography, scene, prepared geometry, navigation, feature table, river input, images/HDR and lighting remain unchanged. The347-file package has285 byte-identical files, with no new images. The additional dated photograph record and bilingual public credit identify Nryate,2021-03-14,CC BY-SA4.0; no photograph pixels enter the scene.

All148 gzip resources decode to their declared originals; all74 validator reports contain zero errors. Every section meets its existing transfer limit. Required3D transfer is **3,037,665 bytes by day** and **3,030,429 bytes by night**, below4MiB. Decoded resource/memory totals remain separate. Application HTML/JavaScript/CSS/fonts and HTTP framing are excluded. Native day/night appearance and runtime timing require their separate acceptance checks.

Reproduce using the pinned toolkit and a fresh ignored output directory:

```bash
node experience/evidence/neighborhood-20261024/world/audit-candidate12-export.mjs \
  artifacts/neighborhood-20261024/art/candidate-11-transport \
  artifacts/neighborhood-20261024/art/candidate-12-transport \
  86e4f424a36cb858c16f6e282ad8ceb8f146d6b285d482de3c0ce2fe2f726b61 \
  artifacts/neighborhood-20261024/world/candidate12-export-audit-repeat
```

The [audit producer](audit-candidate12-export.mjs) SHA256 is `f303e82bdeb27034b69d9d9a40e2969b193af1fe970920427ad6171f2ebba66f`. Its [regional checks](candidate12-regions.mjs) SHA256 is `4062b59def19dbeba81d8464044617595cc3eb75ee5bb6445778c999d6de23e6`. Container ordering and shared-resource list ordering are normalized for comparison while resource identities and decoded source attributes remain exact.
