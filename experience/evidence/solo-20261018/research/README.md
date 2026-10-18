# Solo coverage research evidence · 2026-10-18

Research only. Runtime source was inspected at `245a1f364aa3b04e270d2d6ee402e31ec3b9d3ce`. Actual public responses were read through the inherited proxy with TLS verification. No key, login, paid service or new infrastructure was configured. `inspect.mjs` uses installed `@mapbox/vector-tile` and `pbf` parsers plus the production discovery modules; it writes `observations.json` from captured bytes.

## Captured responses

| File | Actual source |
| --- | --- |
| `photon-shijo.json` | `https://photon.komoot.io/api/?q=Shijo%20Bridge%20Kyoto&limit=6&lang=en` |
| `photon-eiffel.json` | `https://photon.komoot.io/api/?q=Eiffel%20Tower&limit=6&lang=en` |
| `wiki-shijo.json` | Wikipedia generator geosearch, center `35.0037898|135.7714948`, radius 1200, limit 30, namespace 0; common parameters below. |
| `wiki-eiffel.json` | Same query at `48.8582599|2.2945006`. |
| `openfreemap-liberty.json` | `https://tiles.openfreemap.org/styles/liberty` |
| `openfreemap-planet.json` | `https://tiles.openfreemap.org/planet` |
| `shijo-z14.pbf` | `https://tiles.openfreemap.org/planet/20261011_080001_pt/14/14371/6489.pbf` |
| `eiffel-z14.pbf` | `https://tiles.openfreemap.org/planet/20261011_080001_pt/14/8296/5636.pbf` |

Wikipedia endpoint: `https://en.wikipedia.org/w/api.php`. Parameters: `action=query`, `format=json`, `formatversion=2`, `generator=geosearch`, `ggscoord=<center>`, `ggsradius=1200`, `ggslimit=30`, `ggsnamespace=0`, `prop=coordinates|pageprops|description`, `coprimary=primary`, `colimit=max`, `ppprop=wikibase_item|disambiguation`, `origin=*`, `maxage=3600`, `smaxage=3600`. The retained Shijō response uses the explicitly selected bridge record.

Each response has a corresponding `*-headers.txt`. The two tile requests used `TourGuideAI-research/0.3 (https://github.com/PaperStrange/TourGuideAI)` and at most two parallel requests, within OpenFreeMap's bounded offline allowance. The versioned provider tile paths identify the snapshot. No images, panoramas or scans were downloaded. Header timestamps may describe intermediary/provider caching; this research date records when they were checked.

Map data: © OpenStreetMap contributors, ODbL; schema © OpenMapTiles; tile delivery OpenFreeMap. Wikipedia descriptions are attributed to Wikipedia contributors under CC BY-SA; structured Wikidata identifiers identify linked records. Preserve provider attribution when reusing this evidence.

## Primary documentation actually read

All entries checked 2026-10-18 with the web research tool; descriptions identify the relevant sections, not additional test results.

| Primary source | Reviewed basis |
| --- | --- |
| [OpenFreeMap](https://openfreemap.org/) | Public-instance fees, keys, commercial use, attribution and SLA statements. |
| [OpenFreeMap quick start](https://openfreemap.org/quick_start/) | Current Liberty URL and custom-style hosting. |
| [OpenFreeMap terms](https://openfreemap.org/tos/) | Updated 2026-10-14; automated collection and bounded offline download conditions. |
| [OpenMapTiles schema](https://openmaptiles.org/docs/schema/) | Building rendering fields and approximated-height meaning. |
| [OSM Simple 3D Buildings](https://wiki.openstreetmap.org/wiki/Simple_3D_Buildings) | Optional levels, material, color, building parts and roof attributes. |
| [OSM licensing](https://www.openstreetmap.org/copyright) | Attribution and ODbL. |
| [Photon README](https://raw.githubusercontent.com/komoot/photon/master/README.md) | Public demo usage and availability limits. |
| [MediaWiki geosearch](https://www.mediawiki.org/wiki/API:Geosearch) | Nearby article queries and generator parameters. |
| [Overpass public instances](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) | General application usage, shared resources and data-supply alternatives. |
| [Commons reuse](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) | Individual-file licensing, authorship and additional rights. |
| [Street View Static API policy](https://developers.google.com/maps/documentation/streetview/policies) | Attribution and storage rules for that API. |
| [Google Map Tiles policy](https://developers.google.com/maps/documentation/tile/policies) | Visualization scope, extraction/storage limits. |
| [COLMAP tutorial](https://colmap.github.io/tutorial.html) | Capture prerequisites, reconstruction, meshing and simplification. |
| [COLMAP license](https://github.com/colmap/colmap/blob/main/LICENSE) | Program license and separate dependency licenses. |
| [PMTiles concepts](https://docs.protomaps.com/pmtiles/) | Archive hosting, HTTP range reads and update behavior. |
| [MapLibre Map API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#setpaintproperty) | Named-layer paint updates for the shared palette module. |
| [MapLibre layer specification](https://maplibre.org/maplibre-style-spec/layers/#fill-extrusion-color) | Color paint properties and separate extrusion height/base values. |

The recommendations and relative production-cost rankings in the research document are project engineering judgments. Current capture availability, actual facade reconstruction, street access, rendering quality, participant enjoyment and global completeness were not established by these reads.
