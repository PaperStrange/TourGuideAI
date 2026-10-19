# Ginza Wako primary evidence · 19 October 2026

The canonical source file is [`content/ginza-wako/source.json`](../../../content/ginza-wako/source.json).
The [source ledger](../../../docs/ginza-wako-sources.md) describes the geometry,
official dimensions, authored assumptions and photo credits.

| Record | Retrieval and scope |
| --- | --- |
| [`osm-map.osm`](osm-map.osm) | Actual [OSM map API response](https://api.openstreetmap.org/api/0.6/map?bbox=139.7647,35.6714,139.7653,35.67185), HTTP 200 on 2026-10-19 at 15:12:04 UTC; 319,804 bytes; SHA-256 `651fa5737c1b2b530d9a817daa6884cce38b1f1bb099ee7ef31ea88f02b88b64`. Raw response includes complete ways returned for this small selection; only the explicitly selected building/path records enter the pack. |
| [`osm-map.headers`](osm-map.headers) | Actual response headers from the same request. |
| [`operator-facts.json`](operator-facts.json) | Factual extraction from the actual [Seiko history/specification response](https://www.seiko.co.jp/en/seiko_house_ginza/history/), HTTP 200 on 2026-10-19 at 15:12:04 UTC; full HTML response 66,402 bytes, SHA-256 `cd6dfe04a6729c2eb10b22d593bd0222a6818ca31ce0c5da8fc341fe58f0db8f`. Paraphrased measurements/materials are retained; full HTML is an ignored research capture. |
| [`source-verification.json`](source-verification.json) | Actual local source review: 124 assertions passed. Retained XML identities/order/tags, projection, topology, centerline length, polygon centroid, footprint clearance, operator dimensions, actual photo hashes and public credits were checked. The source hash is recorded; integrated browser/model validation is a separate review. |
| [`public-source-verification.json`](public-source-verification.json) | Five checks passed after export: generated public copy is byte-identical to the canonical source; manifest and provenance bind its hash; operator dimensions and both photo records survive unchanged. Model-size revisions and final browser review remain separate. |

Requests retained the inherited proxy, verified TLS, supplied the identifying
User-Agent `TourGuideAI-research/0.3 (https://github.com/PaperStrange/TourGuideAI)`,
and used no credentials or paid endpoints. Full operator and supplementary
Commons HTML captures are under `artifacts/ginza-source-20261019/`; raw transient
cookies are outside the retained evidence. There was no browser/GPU use by
world-content.

OSM geometry is © OpenStreetMap contributors under
[ODbL](https://www.openstreetmap.org/copyright). The canonical source retains IDs,
versions, node order and WGS84 coordinates. New local projected values and the
building centroid are derived. Collision width, elevation and spawn selection
are authored. Neither source topology nor the resulting simulation establishes
current public access or surveyed pedestrian clearance.

The 2024 photo was already retained and reviewed in the recognition evidence.
The 2022 photo's file page was retrieved at 15:12:03 UTC; HTML SHA-256
`0bab37620a911243f0d2cd0657277df8733acf03d36998e41fc0748d06802f59`.
Its CC0 license, author and capture date are recorded in the canonical source.
Art separately downloaded and inspected the actual original and supplied its
file hash and visible-feature observations. Art owns the retained derivative;
this folder contains no copied photo textures or operator imagery.

The review command was
`python artifacts/ginza-source-20261019/verify_source.py`, using Python XML,
math/hash libraries and the installed lxml HTML parser. It read the actual local
operator/photo captures and compared the four existing Kyoto credit articles and
full legal notices with repository HEAD. The report records those passed checks;
raw source data and reference hashes allow independent verification. The exported
public source copy at `packs/ginza-wako/source.json` was separately checked:
13,177 bytes, SHA-256
`6e583689dc460e4a9c496838c44f57925bb8dc4b546338e4ff58f6967eddf674`.
The source-copy check establishes the credits destination within the generated
public tree; hosted availability remains a release check.
