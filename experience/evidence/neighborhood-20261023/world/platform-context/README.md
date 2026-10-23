# Shijo Takakura platform context

Reviewed 2026-10-23. The [audit](audit.json) confirms that OSM platform node `8886543723` lies within municipal LOD1 feature `kyoto-city:bldg_74454289-1d7a-4105-87ea-26e36c69bc44`. This establishes a spatial association with the bus platform. The [additional FileGDB lookup](semantic-review.json) records the exact feature's `分類=普通無壁舎`, an ordinary wall-less structure category. Support layout, roof thickness, clearance and present condition remain unverified.

The retained [OSM records](osm-records.json) include the complete platform node, stop-area relation `21186538`, covered sidewalk way `465066447` and adjacent Shijo roadway `465069431`. They are exact excerpts of the captured OSM response, under ODbL 1.0, © OpenStreetMap contributors. Platform A is named 四条高倉 / Shijo Takakura; it has `highway=bus_stop`, `public_transport=platform`, `bench=yes`, `tactile_paving=yes` and the unresolved literal `shelter=yes;no`. The stop-area relation explicitly includes it as a platform. These tags do not establish the municipal mass's construction details.

| Retained source | SHA-256 |
| --- | --- |
| `artifacts/neighborhood-20261021/world/raw/osm-map.json`, captured 2026-10-21 | `45969d94df108b46f38cb4b13e9f41756c30a38ce602e504f1b92d6486afa787` |
| `experience/src/neighborhoods/shijo-east/sources/kyoto-lod1.geojson` | `da1af049906d736b6329e062673a84728640957475d3b46107cebf46b48a2d93` |
| `experience/src/neighborhoods/shijo-east/scene.json` | `2979a2e426271fe19c91114928eb27b625cbfe3f8548eef4bdaec73e45cb7e8e` |

The municipal payload is a retained FileGDB-to-GeoJSON export from 京都市 3D都市モデル LOD1_2025, CC BY 4.0, © Kyoto City. Original archive SHA-256 is `15701dd9b876eeba5be4d9c45ac0cd39e72f43a30fb17164aea8d3b07618116d`; source and attribution are recorded in [the canonical ledger](../../../../src/neighborhoods/shijo-east/source-ledger.json). All feature properties are preserved in the audit: building ID `26100-bldg-418155`, creation date `2024-03-22`, survey year `2025`, unknown use and construction, name `null`, floor counts `0`, and recorded construction year `0001`. The latter values provide no usable storey or construction-date classification.

The measured-height attribute is **2.9 m**. The retained solid's Z range is **37.25–39.374 m**, producing the separately recorded **2.124 m** extent. Current rendering places that extent at authored ground zero. The footprint is approximately `x157.987…187.749`, `y−3.125…−0.627` in the frozen scene frame. Platform WGS84 `(35.003718,135.7616253)` projects to `(174.01116254515452,−2.329753650424183)` and lies **0.783915255 m** inside the footprint boundary.

Projection uses origin longitude `135.759719`, latitude `35.003739`, with `x=(longitude−originLongitude)×91282.15` and `y=(latitude−originLatitude)×110940.65`. Nearby sidewalk `465066447` has `covered=yes`; its mapped centerline is about 2.382 m from the mass. It supplies no shelter footprint or attachment correspondence. The empty `osmMatches` and `canopySourceIds` fields reflect the preparation routine's polygon-overlap selection; platform points are absent from the scene subset. See `prepare-shijo-east.py` lines 268–283.

## Bounded official lookup

The [Kyoto City Transportation Bureau FAQ](https://www.city.kyoto.lg.jp/kotsu/page/0000204848.html), dated 2026-05-12 and read on 2026-10-23, names both directions of Shijo Takakura in Q6. It describes space for three buses and distinct boarding/alighting positions. The [official Shijo Takakura stop page](https://www2.city.kyoto.lg.jp/kotsu/busdia/hyperdia/menu072.htm) confirms the stop identity and destinations. Its map link explicitly warns that markers do not indicate precise stop positions. Neither page establishes this mass's architectural dimensions.

The [official widening project page](https://www.city.kyoto.lg.jp/kensetu/page/0000241999.html), dated 2018-09-03, describes completion in October 2015 and roadway-projecting terrace stops at Shijo Takakura and Shijo Kawaramachi. It supplies project context; this feature's construction dimensions remain unverified. Public availability of official pages does not establish permission to redistribute their imagery.

The retained [2016 reference metadata](reference-2016.json) records Hide1228's CC BY-SA 4.0 photograph, unchanged original hash and the art lead's dated Platform B inspection. Research imagery remains in ignored artifacts. No photographic pixels or derived architecture from this reference are distributed in the product.

## Exact source semantics

The [attribute query output](gdb-feature.txt) identifies FileGDB feature `401985` as `普通無壁舎` and records `立上高=点群から取得_中央値`. The [MLIT Building definition](https://www.mlit.go.jp/plateaudocument01-01/Contents/定義文書/bldg--Building.html) includes wall-less structures and defines LOD1 as a uniform extrusion upward from ground, normally using median height. Its measured-height attribute describes the lowest above-ground point to the highest point. These meanings explain why an LOD1 volume cannot establish enclosing walls. The precise reason for this record's 2.9 m attribute versus 2.124 m geometric extent remains unverified. Its lower Z of 37.25 does not establish a roof underside or pedestrian clearance.

The exact GDB properties are retained separately from `audit.json` and `osm-records.json`, whose bytes remain frozen for art provenance. `semantic-review.json` binds the query and result SHA-256 values. The source class must remain explicit when assessing visual limitations.

## Proposed art treatment

The source class supports an open authored archetype retaining the exact plan footprint, source ID, source top extent and navigation. Post locations, roof thickness, clearance and finishes require explicit authored status; the retained data supplies no measured construction assembly. Record the bus-platform association independently. The generator's generic urban family selection does not use the platform record.

Root approved preparation of that bounded authored treatment after reviewing the exact source class. Actual geometry and visual acceptance belong to the art lane. This source audit changes no canonical scene, source geometry, navigation or art assets.

## Reproduction

Run the bounded [source check](check-platform.py) from the repository root:

```bash
PYTHONPATH=artifacts/site-tools-python \
python3 experience/evidence/neighborhood-20261023/world/platform-context/check-platform.py \
  --raw-osm artifacts/neighborhood-20261021/world/raw/osm-map.json
```

The recorded run used Python 3.12 and Shapely 2.2.0 and passed. It verifies both retained municipal file hashes, exact properties, projection, containment, the literal shelter tag, source height meanings, relation membership and byte-derived raw OSM identity. A clean checkout can omit `--raw-osm` to verify the portable records against the committed municipal geometry; that run explicitly reports `rawOsmIdentityChecked:false`.

Reproduce the additional attribute lookup with GDAL 3.10.3 and the retained archive extraction:

```bash
ogrinfo -ro -q -geom=NO \
  artifacts/neighborhood-20261021/world/raw/kyoto-21422/bldg_LOD1_R7_公開用.gdb \
  -sql @experience/evidence/neighborhood-20261023/world/platform-context/gdb-query.sql
```

This read-only query prints the selected feature's attributes. It exports no geometry and changes no production files.

## Independent open-assembly export audit

[The actual export audit](open-export-audit.json), SHA-256 `35a910929b4828c838d321a0be2a7b391b4d7aa9f87b6e302efba80ed2803224`, passes on manifest `679241ee06a8115ad3f95ddd523c2f56555b900f3ecc4437d272573a968ec4e5` and provenance `845448d6bb53c4de1592c42b5e726d4f5b8001d589e14299221c2fae53c8270b`. Baseline is the preserved candidate 6 manifest `deb00b97ca3e29e314a13225678c7e6827de59a0f8ff68d5d3bdccc7d3563458`.

Both BASE and NEAR contain 108 target triangles. Independent Shapely checks recover seven 0.12 m square support footprints, 0.45 m end insets and approximately 4.810002 m spacing. Every exported face lies inside the approved slab, beam or support prism. The authored slab underside is 2.044 m and beam underside 1.944 m. These are virtual dimensions. The municipal footprint supplies the authored roof outline; it is not an independently surveyed roof plan. The exported top remains 2.124 m within float32 precision, and the original two top-face records retain exact attributes, material and transformation.

The roof boundary differs from the retained display polygon by at most 0.000007081 m. Its display polygon already differs from the projected municipal outline by at most 0.000386063 m. The full outline remains 1.631825 m clear of the canonical simulation corridor. Canonical scene and geography hashes remain unchanged.

Of 74 sections, 67 retain identical container bytes. The remaining seven pass exact comparison of 357 unrelated source groups using oriented triangles, complete decoded attributes, full material definitions and world transformations. Existing floating source indices are rounded only for grouping within 0.001; their original values remain part of the exact comparison. All shared images, source ledgers, lighting and unrelated feature provenance remain identical. All 148 declared gzip resources decode to the manifest's exact original bytes.

The new output contains 344 files, of which 310 are byte-identical to candidate 6. The earlier `startup-audit.json` and `river-package-audit.json` remain with their original candidates; their omission is recorded explicitly. The new art startup report resides outside runtime assets. This audit establishes bounded geometry and provenance preservation. Actual browser appearance remains a separate acceptance check.

Reproduce from the repository root with the pinned art toolkit and Python dependencies:

```bash
PYTHONPATH=artifacts/site-tools-python \
node experience/evidence/neighborhood-20261023/world/platform-context/audit-open-export.mjs \
  artifacts/neighborhood-20261023/candidate-6/assets/neighborhoods/shijo-east \
  artifacts/neighborhood-20261023/art/platform-open-transport \
  artifacts/neighborhood-20261023/world/platform-open-audit
```

The [Node audit](audit-open-export.mjs) uses glTF-Transform 4.5.1 and meshoptimizer 1.3.0 to decode actual artifacts. It invokes the [independent geometry check](audit-open-form.py), using Shapely 2.2.0. Extracted target triangles remain ignored; the portable report retains their hashes and measured results. Runtime artifacts are read-only throughout this command.

## Candidate 9 floor and metadata acceptance

[The floor support record](floor-support.json), SHA-256 `c3f236da23c9e83b9a44d5d4b2a06d0f03cbca14be8c79b780713a62ea1aea8a`, checks the exact 73.626288 m² source footprint against the current prepared display and navigation surfaces. Positive-area overlap is zero; nearest navigation distance is 1.631595472 m. The two original prepared footprint triangles cover the entire polygon. Paving material and height zero are authored; the municipal data supplies no measured pavement material or elevation. This surface remains nonwalkable.

[The independent candidate 9 export audit](candidate9-export-audit.json), SHA-256 `57f0e9c9b4ee0dff263d69106fa43ff70da9bdd43468c5d166b212329f448144`, passes for manifest `79b1a3ed91f0b672364c690e44de9278dce555fab0074ce0dc4aaa8add62f534`, provenance `3d1e1ac45623495f52d6e0d876a1a3766679cf47679476651d90b11797b88d67`. Its baseline is candidate 8 manifest `4e490c35d171aceb160efb70d94ae8c9fc097a2ad4440fe1010c1b619ca7a601`.

The audit decodes all 74 sections and compares 9,731 source groups. Source223 in `cell-e001-s001` BASE and NEAR retains every existing triangle's attributes, material and world transformation. Each gains exactly two upward paving triangles at virtual height zero, taking its count from 108 to 110. Their projected vertices exactly match the retained top-face triangle plan. All unrelated sources, including the Shinkyōgoku material treatment, remain exact. All shared images and lighting resources retain their original bytes. The independent resource check verifies 148 gzip round trips; 182 of the 347 packaged files remain byte-identical. Changed metadata records the approved anchor and floor through the ordinary production pipeline.

Required 3D startup transfer is **3,035,372 bytes by day** and **3,028,136 bytes by night**, including the traveller and selected HDR. All section transfer budgets pass. Decoded resource size, browser memory and frame cost remain separate quantities. Application HTML, JavaScript, CSS, fonts and HTTP framing are outside these startup figures. Actual appearance is covered by the separate browser review.

Reproduce using the pinned art toolkit from the repository root; the output directory must be a new ignored directory:

```bash
node experience/evidence/neighborhood-20261023/world/platform-context/audit-candidate9-export.mjs \
  artifacts/neighborhood-20261023/art/shinkyogoku-material-transport \
  artifacts/neighborhood-20261023/art/candidate-9-transport \
  artifacts/neighborhood-20261023/world/candidate9-export-audit-repeat
```

The [audit producer](audit-candidate9-export.mjs) SHA-256 is `a8894cc945b96b7f8613addc2cfbcebfac27d05c820617b478e5e58a2ffbf602`. Its glTF-Transform 4.5.1 and meshoptimizer 1.3.0 readers inspect actual decoded attributes and preserve triangle orientation when comparing records.

## Tenmangū viewing-anchor compatibility

[The compatibility record](tenmangu-compatibility.json), SHA-256 `156cdc90f594a9a69a672ac8003e1ddbfa76259c0dc86c5b59035b0e55cc35dd`, permits precisely six geography fields on `nishiki-tenmangu`: `nodeId`, `approachNodeId`, `x`, `y`, `latitude`, and `longitude`. The pause uses retained node354840400, west of the mapped torii5204263033. The separately recorded EN/ZH observation wording and torii citation are the only content changes.

[The historical geography](geography-before.json.gz) is retained for independent CI checks: gzip SHA-256 `1dfd6a18ed0c5787f1ffbeff285f65ea4deaade909a10529e32bddb74aaaf6f8`, decoded SHA-256 `cb6d616d3858becf459a885ed940a6766cdd942e14a4d0b2b8a39776e3c16e55`. Current geography SHA-256 is `0fe837655a45b8c2685e1bae24d739ef9fdf2c55dc60401588474cfa31bd9c7f`. Canonical scene SHA-256 remains `2979a2e426271fe19c91114928eb27b625cbfe3f8548eef4bdaec73e45cb7e8e`.

All 73 graph nodes, 73 edges, frame, selected edge order and complete six-sight distance **1,353.4440598583508 m** remain identical. The retained eastern metric pose restores with zero XY error and the same camera/lighting. Revision1 remains compatible because positions use the unchanged metric graph; saved stop IDs and their editable order remain valid. Planned leg distances recompute from the reviewed viewing anchor. The available recommendations now contain one distinct reviewed route; edited five-stop orders remain supported.
