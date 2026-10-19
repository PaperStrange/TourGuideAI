# Ginza Wako source ledger · 19 October 2026

Owner: world-content. Milestone plan: `997afd8`. Canonical authoring data is
[`content/ginza-wako/source.json`](../content/ginza-wako/source.json), pack ID
`ginza-wako`, revision 1. Source preparation is complete; rendered appearance,
interactive traversal and pack switching require integrated browser verification.

## Identity, building geometry and dimensions

[SEIKO HOUSE](https://www.seiko.co.jp/en/seiko_house_ginza/) identifies the Wako
building at 4-5-11 Ginza, Chuo-ku, Tokyo. Its [history and building specifications](https://www.seiko.co.jp/en/seiko_house_ginza/history/)
give these distinct quantities:

| Operator quantity | Metres |
| --- | ---: |
| Ground to roof | 30.30 |
| Clock tower rise | 9.09 |
| Ground to clock-tower top | 39.39 |
| Lightning rod on top of the tower | 8 |
| Clock dial diameter | 2.4 |
| Minute hand length | 1.17 |
| Hour hand length | 0.75 |

The operator identifies polished Mannari-ishi from Okayama for floors 1–2 and
Mikage-ishi granite from the Korean peninsula, with a tapped finish, for floors
3 and above. Storey heights, material-boundary elevations, PBR settings and
colour remain authored. The source does not provide tower footprint dimensions,
bay spacing, cornice depth or surveyed hidden elevations.

The actual operator response was retrieved on 19 October at 15:12:04 UTC through
the inherited proxy with TLS verification. The [fact record](../evidence/area-packs-20261019/ginza-wako/operator-facts.json)
retains the response hash, byte count, source URL and paraphrased facts. Operator
photographs and long marketing passages are outside the asset inputs.

The [actual OSM map response](../evidence/area-packs-20261019/ginza-wako/osm-map.osm)
contains Wako way `103509469`, version 15, timestamp `2026-01-28T06:26:07Z`.
The source file preserves all twelve distinct vertices and the closing vertex,
in their clockwise source order. Its `height=28` is retained as a conflicting
source tag; vertical authoring uses the explicit operator quantities above.
OSM's `building:levels=7` and `wheelchair=yes` are source reports. They establish
neither individual storey heights nor access along this selected sidewalk.

## Frame and bounded walking surface

Origin: OSM node `2135828626`, WGS84 latitude `35.6714369`, longitude
`139.7650181`. The local equirectangular projection uses radius `6378137 m` and
the cosine of the origin latitude. Coordinates are X east, Y north, Z height;
glTF receives `(x, height, -y)`. Source decimals remain intact, and projected
metres are rounded to six decimals. This frame is independent of Kyoto's frozen
projection and save coordinates. The elevation datum is authored level ground.

| Selected path node | X, metres | Y, metres |
| --- | ---: | ---: |
| `5091948700` | −21.984286 | 19.915057 |
| `6272872988` | −13.727744 | 12.434387 |
| `2135828626` | 0 | 0 |
| `2217343249` | 8.500711 | 2.192994 |
| `9926470824` | 19.633025 | 14.827756 |

The chain follows way `211774044` v8, way `667867139` v3 and the selected end
segment of way `522859644` v5. Shared node identities establish connection.
Every selected way has `highway=footway`, `footway=sidewalk` and
`surface=paving_stones`; no selected way has a crossing, steps, indoor or tunnel
tag. Source width, grade, kerb and explicit access tags are absent. The selected
projected centerline length is approximately **55.281851 m**.

Engineering's 19 October map-geometry review measured a minimum centerline to
building-footprint distance of **2.600928 m**. The approved **4 m full-width**
authored corridor therefore retains at least **0.600928 m** between its inner
edge and the mapped footprint. The actor radius is **0.32 m**, leaving an
authored player-center radius of **1.68 m** within the finite round-ended
corridor. These values do not measure actual kerbs or obstacles. The chosen spawn
is internal node `6272872988`. Roads, adjacent crossings, station passages,
unselected sidewalk continuations and building interiors remain outside traversal.

The footprint centroid supplies a representative building coordinate for place
identity: latitude `35.6716444607219`, longitude `139.76502277971164`. It is a
derived building reference; walking and spawn use the separate sidewalk chain.

## Visual references and credits

| Reference | Author and date | License and retained evidence |
| --- | --- | --- |
| [Ginza Wako 20241021.jpg](https://commons.wikimedia.org/wiki/File:Ginza_Wako_20241021.jpg) | Supanut Arunoprayote · 21 October 2024 | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Existing unchanged Wikimedia 960px thumbnail and [metadata](../evidence/recognition-selection-20261007/reference.json); lead/art inspected the original. |
| [SEIKO HOUSE GINZA 20221216.jpg](https://commons.wikimedia.org/wiki/File:SEIKO_HOUSE_GINZA_20221216.jpg) | 先従隗始 · 16 December 2022 | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Metadata [revision 1099170969](https://commons.wikimedia.org/w/index.php?title=File:SEIKO_HOUSE_GINZA_20221216.jpg&oldid=1099170969); art downloaded and inspected the original on 19 October. |

The 2022 original contains 3,820,388 bytes with SHA-256
`5fdafe7a88dff4046e8439b74115fafa0661732713118cba57876774ea31bb93`.
Its research copy is in `artifacts/ginza-art-20261019/references/wako-2022.jpg`.
Art owns any retained resized derivative and its change/hash record. The canonical
source file records both references; neither photograph is a runtime texture.

Art's reviewed anchors are the convex corner, stepped clock crown and grille,
paired tower pilasters, six central arched upper openings, the distinct narrower
wing openings, cornice brackets, horizontal decorative divisions and recessed
stone/glass base. Exact bay dimensions and depths remain authored. Foreground
glazing marks in the 2022 photograph are excluded from the building. Both views
partly obscure ground details; unseen façades, roofs, doors and current access
remain unverified. The photographs document their capture dates, not a 2026 site
inspection or calibrated material colours.

The [public credits page](../public/credits.html) names each author, links the
file and license, records image handling, and describes use as reference for
original simplified geometry and materials. It preserves © OpenStreetMap
contributors and ODbL attribution separately from photo licenses and authored
code/art, and links the operator specifications. The generator publishes a
verbatim source copy at `packs/ginza-wako/source.json` and records its hash in
the pack manifest. The [public-copy verification](../evidence/area-packs-20261019/ginza-wako/public-source-verification.json)
confirms that the 13,177-byte copy, manifest and provenance retain the frozen
canonical source identity, dimensions and photo records.

## Source verification

The [evidence ledger](../evidence/area-packs-20261019/ginza-wako/README.md) records
retrieval and verification. The [source verification result](../evidence/area-packs-20261019/ginza-wako/source-verification.json)
passes 124 assertions against canonical source SHA-256
`6e583689dc460e4a9c496838c44f57925bb8dc4b546338e4ff58f6967eddf674`.
Checks compare every selected node and way version with the retained XML,
recompute projection, length, area centroid and footprint clearance, and check
closure, connectivity, evidence hashes and photo credits. Existing Kyoto photo
articles and full software/font notices are unchanged. These checks do not
certify visual fidelity, accessible public routing or current conditions.
