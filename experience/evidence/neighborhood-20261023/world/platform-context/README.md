# Shijo Takakura platform context

Reviewed 2026-10-23. The [audit](audit.json) confirms that OSM platform node `8886543723` lies within municipal LOD1 feature `kyoto-city:bldg_74454289-1d7a-4105-87ea-26e36c69bc44`. This establishes a spatial association with the bus platform. The exact shelter enclosure, support layout, roof thickness and present condition remain unverified.

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

Existing licensed facade references cover the original western landmarks and the other reviewed route sights. Art confirmed no retained photograph covers this precise `x158–188` stretch. This bounded lookup did not establish a currently retrievable photograph or construction drawing for the precise mass. Public availability of the official pages does not establish permission to redistribute their imagery. No image pixels, Street View material or architectural geometry were acquired for this audit.

## Proposed art treatment

Preserve the exact footprint, source ID, 2.124 m extent, authored base height and navigation. Give this feature an explicit low-structure treatment with a neutral authored finish; suppress the generic commercial window bays, shop-like recesses and associated glazing emission. Record the bus-platform association and unresolved construction separately. The generator currently assigns generic urban families in `build_neighborhood.py` lines 225–240; that assignment does not use the platform record.

This proposal removes unsupported architectural cues. The preserved opaque envelope can still obscure the carriageway. New openings, columns, elevated roof clearance or a replacement shelter assembly require location-specific evidence and a separate reviewed decision. This audit changes no canonical scene, source geometry, navigation or art assets.

## Reproduction

Run the bounded [source check](check-platform.py) from the repository root:

```bash
PYTHONPATH=artifacts/site-tools-python \
python3 experience/evidence/neighborhood-20261023/world/platform-context/check-platform.py \
  --raw-osm artifacts/neighborhood-20261021/world/raw/osm-map.json
```

The recorded run used Python 3.12 and Shapely 2.2.0 and passed. It verifies both retained municipal file hashes, exact properties, projection, containment, the literal shelter tag, source height meanings, relation membership and byte-derived raw OSM identity. A clean checkout can omit `--raw-osm` to verify the portable records against the committed municipal geometry; that run explicitly reports `rawOsmIdentityChecked:false`.
