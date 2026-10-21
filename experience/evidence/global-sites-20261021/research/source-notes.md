# Primary-source ledger

Read on 2026-10-21. Documentation findings are paraphrases unless quotation marks appear. Actual raw request metadata for the initial data/tool research is in `retrievals.json`. The engine/OSM2World extension was read through the web research tool and ordinary TLS-verified public-source downloads. No login, payment, provider credential or engine installation was performed by this research lane.

## Geographic sources

| Primary source | What was checked | Scope and rights |
| --- | --- | --- |
| [OSM copyright](https://www.openstreetmap.org/copyright) | OSM data license and attribution requirements. | ODbL data; attribute OpenStreetMap contributors. Software and independent media have separate licenses. |
| [OSM API policy](https://operations.osmfoundation.org/policies/api/) | Main API use, concurrency/user-agent guidance and alternatives for large/repeated data access. | The retained two requests are bounded research captures. A production geography service needs suitable extracts/provider infrastructure and caching. |
| [Overture buildings guide](https://docs.overturemaps.org/guides/buildings/) | Buildings/building parts, source precedence, heights, GERS IDs, footprint/roofprint distinction and current release context. | Buildings theme ODbL; source representation and completeness vary. Parts have parent-building relationships and are not all GERS features. No Overture download was made. |
| [3DBAG overview](https://docs.3dbag.nl/en/) | Netherlands building models from BAG/AHN, LoD1.2/1.3/2.2, model quality/representation limits and delivery formats. | Roof/building geometry can improve area preparation; detailed facade/entrance claims require other evidence. |
| [3DBAG copyright](https://docs.3dbag.nl/en/copyright/) | CC BY 4.0 and required attribution wording. | Credit: “© 3DBAG by tudelft3d and 3DGI”; link the copyright notice and indicate changes. |
| [3DBAG services](https://docs.3dbag.nl/en/delivery/webservices/) | Single-BAG-ID/bbox CityJSONFeature API, pagination, CRS and 3D Tiles. | API EPSG:7415; tiles EPSG:4978, 3D Tiles1.1/glTF. Service availability does not establish a measured project cost. No city model was downloaded. |
| [Helsinki 3D](https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-3d) | Semantic CityGML LoD1/2, textured/mesh products, stable identifiers, ETRS-GK25/N2000, area-download options and capture limits. | CC BY 4.0. Reflective/moving surfaces can affect mesh quality; source accuracy statements are provider claims. No Helsinki 3D dataset was downloaded. |
| [Delft official monument11901](https://monumentenregister.cultureelerfgoed.nl/monumenten/11901) | City Hall identity, Markt87 and architectural description. | Identity/descriptive facts support the chosen sample. No operator photograph or measured facade geometry is imported. |
| [Helsinki Cathedral operator](https://helsingintuomiokirkko.fi/en/index/uusipaataso.html) | Visitor identity, changing church-use arrangements and accessible-entry information. | No current-access guarantee or specific doorway is promoted into the workbench. |

## Modeling, capture and delivery

| Primary source | Verified finding | Project implication |
| --- | --- | --- |
| [BlenderGIS README](https://raw.githubusercontent.com/domlysz/BlenderGIS/master/README.md), [license](https://raw.githubusercontent.com/domlysz/BlenderGIS/master/LICENSE) | GIS import capabilities; OpenTopography requires a key; GPLv3 software license. | Optional authoring tool, version compatibility untested here. Software license does not assign rights to input imagery. |
| [Geometry Nodes introduction](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/introduction.html) | Procedural geometry operates on meshes, curves, point clouds and instances. | Shared geometry/material rules are practical; sources still determine actual location identity. |
| [Blender glTF exporter](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html) | Supported PBR/material/export behavior, triangulation, extras, instancing and punctual lights. | Procedural shaders need supported nodes/baking; World/Area lighting is omitted, so environment lighting remains explicit runtime data. |
| [COLMAP tutorial](https://colmap.github.io/tutorial.html), [license](https://colmap.github.io/license.html) | Multi-view capture, textured surfaces, consistent light, SfM/MVS, mesh processing; BSD software license. | Capture rights, cleanup, relighting and collision remain distinct tasks. No reconstruction or time/cost benchmark was run. |
| [Graphdeco reference license](https://raw.githubusercontent.com/graphdeco-inria/gaussian-splatting/main/LICENSE.md) | Reference implementation license covers research/evaluation/noncommercial use; commercial use needs permission. | This restriction applies to that software, not every implementation of Gaussian splatting. |
| [gsplat README](https://raw.githubusercontent.com/nerfstudio-project/gsplat/main/README.md), [license](https://raw.githubusercontent.com/nerfstudio-project/gsplat/main/LICENSE) | CUDA/PyTorch implementation, COLMAP-input workflow and Apache2.0 license. | Alternative software licensing exists; image rights and project/mobile feasibility remain untested. |
| [Current glTF splat specification](https://raw.githubusercontent.com/KhronosGroup/glTF/main/extensions/2.0/Khronos/KHR_gaussian_splatting/README.md) | Status: “Complete, Ratified by the Khronos Group.” Display-referred color/SH appearance, ignored ordinary glTF material for splat primitives and implementation-dependent relighting. | A standard exists; our Three.js implementation has not been tested with it. Collision and factual surface semantics need a separate representation. |
| [OGC 3D Tiles](https://www.ogc.org/standards/3dtiles/), [current specification repository](https://raw.githubusercontent.com/CesiumGS/3d-tiles/main/README.md) | Hierarchical geographic content delivery; 1.1 supports glTF, metadata, implicit tiling and multiple contents. Version2.0 is described as in development. | Useful delivery architecture for larger coverage. Navigation, access and interaction are application data. |

The current splat specification raw SHA256 is `d01452284b84cd767c658c928e1ffcdce0809f4ebe7a39be91f0b793258a5f26`. Documentation updates can alter status; retain the review date and hash when making implementation decisions.

## Geographic engine sources

| Source read | Verified behavior or boundary |
| --- | --- |
| [Cesium Unreal README](https://raw.githubusercontent.com/CesiumGS/cesium-unreal/main/README.md) | Apache2.0/free commercial plugin; external/private/cloud sources and physics/character integration; ion service is optional. |
| [Cesium Unity README](https://raw.githubusercontent.com/CesiumGS/cesium-unity/main/README.md) | Apache2.0/free commercial plugin; external sources and Unity objects/physics/character integration. |
| [Cesium Unreal placing objects](https://cesium.com/learn/unreal/unreal-placing-objects/) | View-dependent tiles can lose physics/shadow participation when culled; globe anchors/local origins and Earth-relative orientation matter. |
| [Cesium Unity supported platforms](https://cesium.com/learn/cesium-unity/ref-doc/supported-platforms.html) | Current1.26.0 documentation supports WebGL and WebGPU, Unity6+, native multithreading and required HTTP headers. |
| [Cesium Unity web build](https://cesium.com/learn/unity/building-an-app-for-the-web/) | COOP same-origin, COEP require-corp, CORP cross-origin; Brotli serving configuration and startup implications. |
| [Unreal World Partition](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine) | Grid-cell loading by streaming sources, HLOD, destination preloading and builder commandlets. |
| [Unreal PCG generation modes](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-pcg-generation-modes-in-unreal-engine) | Partitioned/hierarchical/runtime generation; placement sources, scheduling, cleanup and LOD-related performance controls. |
| [Unity heightmaps](https://docs.unity.com/en-us/engine/6000.6/manual/creating-environments/script-terrain/terrain-heightmaps) | Heightmap import can represent real elevation or authored terrain; source scale, resolution and orientation are explicit. |
| [Unreal Pixel Streaming overview](https://dev.epicgames.com/documentation/unreal-engine/overview-of-pixel-streaming-in-unreal-engine) | Remote GPU application renders media; browsers send control events through WebRTC, with signaling and network traversal infrastructure. |
| [Cesium ion pricing](https://cesium.com/platform/cesium-ion/pricing/) | Community restrictions/quotas; published Commercial individual $149/month and team $524/month. External-organization solution integration has a contact-sales clause. These figures are not a project quote. |
| [Unreal licensing](https://www.unrealengine.com/license) | Published royalty/seat thresholds and rates; eligibility depends on product distribution/revenue. |
| [Unity pricing2026](https://unity.com/products/pricing-updates) | Personal up to $200K funding/revenue; Pro $2,310/year or $210/month per seat; Runtime Fee canceled; other plan conditions apply. |

No reviewed engine page promises complete arbitrary-country facade geometry or current public access. Streaming/modeling capability and geographic coverage must be recorded separately.

## OSM2World source-to-Blender review

The [JVM documentation](https://osm2world.org/docs/library-jvm/) was read in full: Java17+, XML/PBF input, output GLB and explicit styling. The [web documentation](https://osm2world.org/docs/library-web/) describes ESM conversion, LOD0–4, compatible triangle/PBR meshes and self-hosting style resources beyond initial experimentation. This web path is described as recently introduced.

Current [software license](https://raw.githubusercontent.com/tordanik/OSM2World/master/LICENSE.txt) is MIT; retain copyright/permission notices. The [default-style README](https://raw.githubusercontent.com/tordanik/OSM2World-default-style/master/README.md) dedicates configuration and textures to public domain/CC0. It does not establish a license for every separately acquired external model. Website example renderings have their own stated CC BY-SA2.0 license; they are not imported assets.

Current source files were downloaded normally into ignored local research storage and read. Their mutable upstream URLs, captured hashes and applicable observations are:

| Source | Captured SHA256 | Observations |
| --- | --- | --- |
| [GltfOutput.java](https://raw.githubusercontent.com/tordanik/OSM2World/master/core/src/main/java/org/osm2world/output/gltf/GltfOutput.java) | `d42ab842f5eee7619de3563141122e30b1c33c26b476c21c78c68b62b2d35924` | Parent extras can contain `osmId` and `osmTags`; scene/root extras include origin; GLB PBR output includes base color/normal/ORM. Mesh merging and low-LOD quantization affect identity granularity/precision. |
| [O2WConfig.java](https://raw.githubusercontent.com/tordanik/OSM2World/master/core/src/main/java/org/osm2world/conversion/O2WConfig.java) | `cc5b75df7abe5b37e61b075b380866db7d50b9b46dbb48ea9661f9c99008fe0d` | `keepOsmElements=true`; default `exportMetadata=ID`, additional `TAGS` supported with semicolon-separated list. Default tangent-plane projection and zero terrain interpolator. |

These source observations apply to the captured current source. A downloaded executable may be an earlier revision. The actual conversion experiment must record its version/hash and inspect emitted extras before relying on any option. Raw OSM remains the authority for IDs, tags, versions and dates; generated defaults remain authored presentation.
