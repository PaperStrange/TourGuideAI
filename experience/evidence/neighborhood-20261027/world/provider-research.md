# Real-source Kyoto 3D review — 27 October 2026

Status: research and proposed comparison only. No production geometry, route, renderer, service account or paid API was changed. No city meshes, texture packages or Google imagery were downloaded. The retained files below are documentation and source metadata.

## Textured PLATEAU is the strongest next comparison

The actual Kyoto 2025 metadata states `Licensed under CC BY 4.0`, permits commercial adaptation, and identifies vehicle-mounted photographic laser surveying as the source of LOD3 buildings, roads, furniture, vegetation and bridges. Its resource CSV dates those LOD3 inputs to **FY2023**. The package metadata date is **2026-03-31**; that date does not make the photographed appearances current. Kyoto City owns the model copyright. Attribute the dataset and indicate modifications.

The live [CityGML file-list API](https://docs.plateauview.mlit.go.jp/api/rest/operations/datacatalogcitygmlconditions/) returned these records for the proposed Pontochō research rectangle, longitude135.7708–135.7715 / latitude35.0039–35.0057:

| Source mesh52354601 | Actual inventory | Advertised source-file bytes |
| --- | --- | ---: |
| Buildings | 4,444 objects with LOD2; 138 also have LOD3 | 325,851,198 |
| Street furniture | 977 objects; 964 have LOD3 | 254,905,827 |
| Roads | 680 objects; 18 have LOD3 | 3,638,216 |

Those counts belong to the containing mesh file, rather than precisely to the requested rectangle. The API returns files intersecting the area. It does not return an exact clipped object inventory. The building/appearance files remain uninspected.

The current catalog supplies a textured Nakagyō building collection, `26104_bldg_lod3`, whose downloadable archive is listed as269,679,040bytes. Its actual tileset properties report `_lod.minimum=1` and `_lod.maximum=3`. Thus, the district-wide tileset bounds cannot establish continuous LOD3. The complete city CityGML ZIP is2,700,713,500bytes; a bounded source selection is appropriate for the proposed experiment.

The [official MLIT Blender tutorial](https://www.mlit.go.jp/plateau/learning/tpc32-1/) explicitly demonstrates Pontochō LOD3 and describes terrace fences, shop signs and lanterns in the imported data. It also documents geometry cleanup and separately added scene detail/lighting. Its finished film is not a raw-data quality benchmark. Our current preparation consumes building footprints and vertical ranges; it does not preserve these higher-detail source surfaces or their photographic appearance.

**Proposed comparison:** a150–250m Pontochō alley specimen using original LOD3 surfaces/appearance plus available source roads/furniture, assessed at normal walking height with names hidden. The current1,353.444m route visits the southern entrance and bridge; extending north into the alley would be an explicitly approved experiment. The captured road/furniture tileset bounds begin near35.003919N, approximately16m north of the existing entrance pause35.003775N. Neither those bounds nor the tutorial establish a complete ground connection at that pause.

Before authorizing production, inspect actual per-building LOD, textures, street coverage, missing faces beneath eaves, dates and pedestrian surfaces. Record which portions of the six-sight route receive actual textured LOD2/LOD3. An imported door/window surface does not establish present access or an enterable interior.

The [PLATEAU delivery documentation](https://docs.plateauview.mlit.go.jp/datasets/3d-tiles/) supports direct3D Tiles delivery and CityGML conversion. It explicitly calls the public service experimental, without guaranteed duration/service level, and allows data changes without notice. A reviewed, versioned self-hosted extract is a production proposal; bandwidth/storage and preparation remain real costs even with a zero data-license fee. [MLIT policy](https://www.mlit.go.jp/plateau/site-policy/) requires attribution and modification notices, addresses third-party/legal exceptions, and permits CC BY4.0 use of covered content. The retained Kyoto metadata provides the exact dataset-specific CC BY4.0 statement.

## Provider and capture comparison

| Method | Contribution to walking realism | Control and delivery | Costs and conditions verified here |
| --- | --- | --- | --- |
| Kyoto textured PLATEAU LOD2/LOD3 | Actual place geometry/appearance; strongest identified editable source for the Pontochō area. Exact route-wide quality still untested. | Source meshes and appearance can be preserved, cleaned and delivered as reviewed glTF/3D Tiles. Navigation, under-roof gaps, material response and night appearance require review. | Kyoto source CC BY4.0. Data fee zero; preparation and hosting costs unmeasured. Public streaming service is experimental. |
| Google Photorealistic3D Tiles, optionally through Cesium | Real textured surroundings and continuous viewing where supplied. Japan coverage is documented; this route’s walking-height appearance, under-arcade detail and refresh date were not inspected. | Live attributed visualization. Independent foreground models are permitted under the tile policy. Exporting/remeshing Google content into owned assets is outside the documented permission. | Current direct price:1,000 free monthly root requests; next tier US$6/1,000. Billing and API credentials required. Regional and distribution limitations below. |
| Owned or expressly licensed capture → photogrammetry / splats | Can capture the actual visible frontage, street clutter and local material character at pedestrian height. Occlusion and moving subjects remain capture concerns. | Mesh photogrammetry supports editable geometry after cleanup; splats primarily preserve captured appearance. Collision, identity and relighting need independent treatment. No local capture exists from this research. | Fieldwork, permission, processing and update cost unmeasured; do not quote a per-kilometre estimate. Software rights do not grant rights to photographs. Root is reviewing capture-service options separately. |
| Location-matched licensed photographs / Mapillary with reviewed geometry | Stronger façade references or an explicit photo/panorama view. Individual images alone do not establish a continuous traversable scene. | Per-image identity/date/license; independently reviewed geometry and interaction remain necessary. | Mapillary’s official help page identifies CC BY-SA4.0 imagery. Service/API access and exact Kyoto image coverage were not verified; no token or image request was made. |

These are qualitative production comparisons, not measured build-time or GPU-performance results. Realism and immersion are the selection priorities. Geographic coverage does not substitute for acceptable ordinary-view quality.

## Google and Cesium constraints relevant to this product

The current [global price table](https://developers.google.com/maps/billing-and-pricing/pricing) lists Photorealistic3D Tiles SKU `C6E1-98B2-DBD0`:1,000 free monthly billable events, then US$6 per1,000 through100,000; subsequent tiers are5.10/4.20/3.30/2.40. Under a one-root-request-per-visit assumption,10,000 visits would cost US$54 for that SKU alone. That is an illustration, not a forecast: reloads/session renewal and other services alter usage. The [usage page](https://developers.google.com/maps/documentation/tile/usage-and-billing) says a root request supports up to three hours of renderer requests and requires enabled billing plus credentials.

The [Map Tiles policy](https://developers.google.com/maps/documentation/tile/policies) explicitly allows independently created foreground3D objects over Google's tiles, with clear attribution of both sources. It prohibits deriving those objects from the tiles by hand or machine. It also restricts caching/offline use and nonvisual geodata extraction. Therefore, a Google comparison would use the supported live renderer path; Google imagery would not become Blender textures, generated façades, an exported collision model or a self-hosted tiles archive. Logo and viewport-dependent third-party credits must remain visible. Our existing MapLibre/map display relationships also need review against the applicable terms.

The standard non-EEA [Terms3.2.1(c)(v)](https://cloud.google.com/maps-platform/terms) prohibit distributing/marketing an application using Maps Core Services in a prohibited territory. The [current territory list](https://cloud.google.com/maps-platform/terms/maps-prohibited-territories) includes China. Regional terms can differ; this research does not assume the user's billing entity or a negotiated agreement. The [coverage table](https://developers.google.com/maps/coverage) separately lists Japan with2D/3D and China with2D alone. These are distinct service/distribution and data-coverage questions; no claim about actual China network reachability was tested. For applicable new/modified EEA-billing projects, [Google explicitly disables Photorealistic3D Tiles with403 responses](https://developers.google.com/maps/comms/eea/map-tiles).

[Cesium ion pricing](https://cesium.com/platform/cesium-ion/pricing/) currently lists a free evaluation/personal tier, commercial US$149/month individual or524/team, and150GB/month streaming on commercial. It expressly asks users integrating ion into solutions used outside their organization to contact sales about integration pricing/licensing. Its published plans cannot be treated as a confirmed price for this public travel product. Cesium rendering, ion hosting and third-party content each have their own permissions; ion does not expand Google's content rights.

[Mapillary's imagery license page](https://help.mapillary.com/hc/en-us/articles/115001770409-CC-BY-SA-license-for-open-data), updated2025-05-12, identifies CC BY-SA4.0 and attribution to the image/user. ShareAlike applies to applicable adaptations of licensed imagery; this statement does not assign that license to the application's entire codebase. The service terms page required login in this session, so production API/reconstruction permissions remain unresolved.

[COLMAP](https://colmap.github.io/tutorial.html) documents overlapping multi-view capture, similar illumination, avoidance of specular surfaces and mesh/texture reconstruction. Its [BSD license](https://colmap.github.io/license.html) is separate from dependencies and input-image rights. For our arcades/glazing/night requirement, capture quality and material preparation must be evaluated explicitly. No photogrammetry reconstruction was performed.

## Decision evidence and remaining choices

The useful next decision is approval of a **source-quality comparison**, with raw-data and edited-result views clearly distinguished. Proposed inspection criteria are readable actual façade identity without labels, believable connected ground/eaves, perspective changes while walking, and known capture/geometry gaps. Compare the original source mesh at ordinary eye level before investing in custom repair. Record actual download/GPU/memory costs only when that experiment is authorized and run.

The source selection requires product decisions about a concentrated Pontochō experiment versus preserving the exact six-sight itinerary, initial delivery markets/billing entity, ongoing provider budget, and whether local capture can be commissioned or supplied. None is settled by a provider's marketing imagery.

Portable factual inputs are `pontocho-file-list.json` and `kyoto-2025-metadata.zip` alongside this note. `source-receipts.json` binds them and the retained ignored catalog/tileset reads. Full documentation snapshots and research-only fetch scripts remain under `artifacts/neighborhood-20261027/world/`. The Kyoto municipal dataset page returned503, the G-spatial dataset/API returned403 and the tutorial's historical extentPDF returned404 during this review; current catalog and metadata responses succeeded. No missing source was replaced with a fabricated result.
