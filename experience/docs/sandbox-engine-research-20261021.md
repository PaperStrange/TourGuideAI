# Sandbox engine research for real-place travel

Research date: 21 October 2026 UTC. The user asks for engine research before
continuing implementation. Production edits and browser experiments were paused
while engineering, art, world-content, product and QA reviewed the options.
Existing published Shijō/Ginza behavior remains the comparison baseline.

## Decision and evidence boundary

Continue with Three.js and MapLibre for the next deliverable, applying the useful
sandbox patterns to content production and scene management. Keep Blender as the
editable architectural production tool. Evaluate an existing geographic generator
on the captured Delft and Helsinki data before expanding our own generator.

The current application already has a fixed simulation step, interpolated walking,
camera-relative movement, surface inspection, scene loading/disposal, visibility
pause and versioned private returns. The observed problems are incomplete street
composition, missing architectural detail and a separately measured MapLibre
language-action delay. A replacement renderer has no demonstrated advantage for
these problems. This decision concerns the next iteration; it leaves engine
adoption available when a measured requirement justifies it.

Research establishes available capabilities. It does not establish comparative
frame rates, device compatibility, authoring savings or participant enjoyment.
Those require the experiments below. Q03 retains its unchanged measurement and
500 ms target.

## What transfers from sandbox and open-world engines

| Pattern and primary reference | Application to this product | Required evidence |
| --- | --- | --- |
| [Luanti loaded and active map regions](https://api.luanti.org/map-terminology-and-coordinates/) | Load nearby geography; update interactive entities only near the traveler. Keep distant scenery inexpensive and stop hidden work. | Actual boundary crossings, canceled requests, no missing surfaces, bounded resources and stable saved locations. |
| [Unreal World Partition](https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partition-in-unreal-engine) | Organize a city into addressable local areas with loading priorities, neighboring-area preparation and distant representations. Keep geographic coordinates separate from local rendering coordinates. | Compare readiness, stalls, bytes and resource peaks on a representative connected route. Cell dimensions must follow measurement. |
| [Unreal procedural content generation](https://dev.epicgames.com/documentation/en-us/unreal-engine/procedural-content-generation-overview) | Drive reusable facade, roof and street modules with observed feature attributes and explicit authored choices. Generate reproducible assets during production. | Landmark silhouette, footprint, courtyard, units, module placement, material response and provenance checks. |
| Persistent actions and reusable behaviors | Let travelers approach, inspect, choose a view, leave a private expression and deliberately revisit it. Current Together shares plans and explicitly selected destination focus; synchronized walking remains future work. | Actual actions and durable returns; participant evidence for meaning and enjoyment. |

Luanti distinguishes loaded regions from the smaller active simulation region.
Unreal combines streamed cells with hierarchical distant representations and
procedural generation. These are useful architectural examples. Their existence
does not supply surveyed buildings, visitor access or current activity for a
selected real-world destination.

## Engine options

| Direction | Relevant strengths | Integration and operating implications | Current conclusion |
| --- | --- | --- | --- |
| Existing Three.js + MapLibre | Existing GLB/PBR assets, HTML controls, map coverage and tested walking/saves. | We own game behavior and scene lifecycle. Add spatial streaming only when connected coverage needs it. | Use for the current deliverable. |
| [PlayCanvas](https://playcanvas.com/products/engine) | Browser-focused JavaScript engine, components, physics, animation, glTF, WebGL2/WebGPU. | [Standalone npm/Vite use](https://developer.playcanvas.com/user-manual/engine/standalone/) permits our existing hosting; cloud editor use is optional. Camera, navigation, materials and saves still require integration. | Candidate when authoring reusable behaviors becomes the limiting factor; no benchmark yet. |
| [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) | Integrated scene editor and gameplay systems. | Current stable web guidance uses Compatibility/WebGL2; Godot 4 C# projects cannot currently export to web. Desktop renderer features and thread-dependent deployment require separate checks. HTML/map integration remains work. | Evaluate if integrated gameplay authoring becomes a demonstrated need. |
| [Luanti](https://docs.luanti.org/about/luanti/) | Voxel world generation, Lua modding, persistence and multiplayer. | Official distribution uses [native clients](https://www.luanti.org/en/downloads/). A maintained browser delivery path and conversion of our detailed mesh content are unverified. | Reference for world organization and simulation; adoption implies a separately evaluated product direction. |
| [Minecraft](https://www.minecraft.net/en-us/article/what-minecraft) | Strong reference for self-directed discovery, creation and play together. | It is a game/platform with its own [usage terms](https://www.minecraft.net/en-us/usage-guidelines), distribution and content rules. | Experience reference; an independent website needs its own delivery/runtime choice. |

Software licenses, hosted editor services, geographic data and infrastructure have
separate costs. An open engine does not remove asset production, review, bandwidth
or maintenance costs. No paid account or hosting change is selected by this research.

## Repeatable geographic content

[OSM2World's JVM interface](https://osm2world.org/docs/library-jvm/) supports actual
OSM XML/PBF input and GLB output. Its geographic modules offer a concrete way to
reuse building/road interpretation. The [browser interface](https://osm2world.org/docs/library-web/)
supports detail levels 0–4; its documentation describes it as recently introduced
and recommends smaller datasets. Offline production gives us a place to review
results, supply consistent materials and measure the exported resources.

Current source uses an [MIT license](https://raw.githubusercontent.com/tordanik/OSM2World/master/LICENSE.txt).
The [default style](https://raw.githubusercontent.com/tordanik/OSM2World-default-style/master/README.md)
declares its configuration and textures public domain/CC0. The actual downloaded
binary and its dependency notices must be inspected independently. OSM data retains
ODbL attribution and obligations. Pin the converter, style, input hashes and options;
a moving latest-build URL alone is insufficient for reproducibility.

The production sequence is:

1. Resolve a real feature and capture bounded source data with date, identifier,
   rights and complete geometry dependencies.
2. Audit missing values and incomplete relations; distinguish the query bounds
   from the complete geometry returned by the provider.
3. Generate geographic context with a pinned converter. Retain source IDs,
   original tags, coordinate frame and every authored assumption separately.
4. Review in Blender. Apply shared PBR finishes and reusable architectural modules;
   give recognizable landmarks their source-reviewed silhouette and facade details.
5. Prepare nearby/distant detail, material grouping and light response. Keep walking
   surfaces and semantic interactions independently reviewed.
6. Validate GLB resources, geometry, actual browser appearance, controls and resource
   lifetime. Register a playable place only after navigation and interaction review.

Data-rich city models and licensed capture can enter the same review/export
sequence. Availability and rights vary by location. A country name cannot determine
a building's roof, facade, interior, lighting or visitor access. Broader coverage
therefore combines consistent geographic context with selectively reviewed places.

## Research-to-code experiment

The first experiment uses the actual captured Delft Markt and Helsinki Senate
Square inputs. Compare generated geographic context and the existing reviewed
Ginza pack by their intended quality level. Record converter/config/source hashes,
source IDs, holes and footprint preservation, omissions, bytes, triangles, materials
and timings. Inspect actual day/night output and continuous camera response.
Geographic context remains explicitly unreviewed for walking and landmark fidelity.

Proceed with the converter only after checking coordinate units, complete-building
and courtyard geometry, source-ID mapping or an independently preserved sidecar,
licensed reproducible inputs, measured resources and identified manual corrections.
Unresolved source loss, geometric corruption or unsuitable output keeps a sample
in research. Record the converter decision before resuming production. Reviewed
authored context remains available for sites whose conversion does not pass.

The [actual converter experiment](../evidence/global-sites-20261021/converter/README.md)
produced 3.15 MB and 3.97 MB GLBs with retained landmark IDs, while logging roof and
triangle errors despite exit code zero. Automatic conversion therefore does not
pass this gate. Preserve it as authoring research; proceed with independently
reviewed Ginza context and explicit source auditing. Neither generated site is
published or registered as playable.

Ginza's bounded art experiment uses the source-supported surrounding streets and
footprints, reusable facade details, glass roughness response and coherent local
light pools. Preserve the Wako landmark, the existing 55.28 m walking corridor,
Shijō assets, camera/save meaning and current pack budgets. Match both frontages,
day/night, desktop and phone before publication.

A renderer comparison becomes justified if this experiment identifies a capability
or authoring constraint in the existing runtime. Use one challenger, identical
GLB/HDR bytes, navigation, camera poses, controls and saved states. Measure actual
first usable frame, input response, frame distributions, resource lifetime and
HTML integration. Require the full walking/day-night/return path, actual touch and
failure/cancellation checks. Cloud software-GPU observations establish matched-host
behavior; physical-device performance remains a separate measurement.

## Product hypothesis

Sandbox enjoyment depends on useful agency and understandable consequences. Our
experiment should let someone discover a detail through movement, choose a view
or expression and return to that intentional choice. Added decorative activity
alone cannot establish enjoyment. Simulated activity must have an honest meaning.

[Google's Ask Maps and Immersive Navigation announcement](https://blog.google/products-and-platforms/products/maps/ask-maps-immersive-navigation/)
and [Mindtrip's traveler FAQ](https://resources.mindtrip.ai/travelers/help/traveler-faqs)
already describe substantial AI, mapping and collaborative travel capabilities.
The differentiating hypothesis is enjoyable embodied discovery and personal
connection to recognizable places, supported by practical real-world routing.
Recognition, voluntary exploration, expression and desire to return each require
participant evidence; wider destination coverage is an independent measure.
Compare the same place facts and story in interactive movement and flat media,
observing voluntary exploration and meaningful expression separately from visual
quality and conversion success.

## Engineering capability check

Official documentation checked on 2026-10-21 supports borrowing the following
techniques without selecting a new renderer:

- **Three.js:** [BatchedMesh](https://threejs.org/docs/pages/BatchedMesh.html)
  supports shared-material batching and per-object frustum culling;
  [LOD](https://threejs.org/docs/pages/LOD.html) supports distance thresholds and
  hysteresis. [Rendering on demand](https://threejs.org/manual/pages/rendering-on-demand.html)
  is an established pattern. These capabilities still need appropriate asset
  partitions, semantic IDs and loading budgets. Our current packs do not acquire
  progressive spatial streaming merely by enabling LOD.
- **PlayCanvas:** [standalone npm/Vite use](https://developer.playcanvas.com/user-manual/engine/standalone/)
  can retain our HTML interface and hosting. Its
  [clustered lighting](https://developer.playcanvas.com/user-manual/graphics/lighting/clustered-lighting/)
  uses local-light selection and shadow atlases, and its
  [lightmapping](https://developer.playcanvas.com/user-manual/graphics/lighting/lightmapping/)
  supports external bakes or runtime generation. These are relevant if scene
  authoring or lighting becomes the limiting workflow. Its
  [streamed SOG](https://developer.playcanvas.com/user-manual/gaussian-splatting/building/unified-rendering/lod-streaming/)
  capability concerns Gaussian splats; it does not automatically stream our GLB
  streets or establish their walkability.
- **Babylon.js:** [AssetContainers](https://doc.babylonjs.com/features/featuresDeepDive/importers/assetContainers/)
  manage scene assets and reusable instances.
  [Thin instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances/)
  reduce per-instance JavaScript objects, with group-level visibility tradeoffs.
  [Navigation V2](https://doc.babylonjs.com/features/featuresDeepDive/crowdNavigation/v2Intro/)
  wraps Recast through an add-on; current guidance recommends pre-generated
  production navmeshes and identifies worker generation as unfinished. Babylon
  is a stronger candidate when multiple navigating agents or broader navigation
  systems become required, rather than for the current reviewed sidewalk alone.

Any migration must reproduce camera framing, visible-surface inspection,
day/night appearance, private and shared view versions, cancellation/disposal,
hidden-work behavior and bilingual controls. The renderer cannot supply source
provenance or visitor access. PlayCanvas is the conditional authoring/lighting
challenger; Babylon is the conditional navigation/simulation challenger. Neither
has demonstrated a performance advantage on our assets.

Q03 remains a separate MapLibre/input investigation: the measured Together action
does not activate the detailed Three scene. Replacing that scene's renderer would
not test the observed bottleneck. Keep the existing latency gate and preserved
traces; no engine-only benchmark is justified by this evidence.
