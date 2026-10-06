# Expanded Shijō street: two rendering approaches

On 2026-10-06 the user accepted the play guidance and interaction fluency, but
rejected the previous building/street art as too simple and artificial. Earlier
“no blocker” observations established usability, not acceptable visual quality.
This expanded comparison is a new art candidate; user visual acceptance remains
pending.

## Daylight and Night lighting iteration

The implemented lighting revision keeps both source GLBs unchanged and adds selectable
Daylight / Night looks to the playable scene and matched comparison. The shared
[`lighting/rig.json`](../public/lighting/rig.json) supplies authored light positions,
colors, intensities, shadow settings, HDR orientation, exposure and exact material
emission rules. The rig is frozen after review of actual browser opening and bank
views. Six final matched stills are delivered; final browser validation remains a
separate check of the exact packaged application.

Daylight reduces the former uniform hemisphere fill so window recesses, sills and
canopy junctions retain directional contrast. Night combines restrained cool
environment light with warm canopy pools and separate classical-corner washes;
it is not a global blue/dark tint. Four local spotlights can cast cached shadows.
Two further canopy fills, two street-light pools and two corner washes do not add
realtime shadow maps. The local shadow filter radius is 4.5 pixels; this is a PCF
approximation, not physically traced area-light penumbra.
The existing off-white lamp/sign material and selected primary ground glazing
receive emission; upper offices do not all become uniformly lit. These authored
effects do not establish actual lighting schedules, occupied rooms, opening hours,
verified lamp locations or enterable interiors.

The [lighting resource record](../public/lighting/resources.json) documents the
exact CC0 Poly Haven 1K HDRIs: Urban Street04 by Andreas Mischok and Modern
Buildings Night by Greg Zaal. They were captured in London and Berlin, respectively,
and are used only for illumination/reflections. Neither panorama replaces the
Kyoto background. The maps have independent exposures; their artistic yaw and
intensity calibration is not a measured Kyoto sun direction or photometric pair.

Cycles uses the same rig intent but explicitly separate environment strength,
light power, exposure and sampling/clamping settings. Three uses PMREM and cached
shadow maps; Cycles traces indirect light and emissive bounce. The six target
images pair the same three camera views with both modes. The final pass uses
96 samples and the same external HDR denoising treatment for both modes; a still
cannot establish night-time playable readability.

The initial Cycles daytime draft exposed competing shadows from the HDR's solar
disc and the separately placed directional key. Daylight now caps each linear HDR
RGB channel at 1.0 for non-glossy environment paths before applying environment
strength; glossy rays retain the original HDR branch, and camera rays still use
the authored background. This suppresses the second direct shadow without editing
the source `.hdr`. It is a renderer-specific lighting approximation, not physically
identical transport between A and B. The corrected preview was inspected and has
one tree shadow. Night keeps its previously reviewed environment processing.

The rendered night intersection retains the separate column shafts and mouldings
inside its warm corner washes. Both frontage views show localized pavement light
and dark upper glazing; night is visibly different from a global exposure tint.
OIDN removes the earlier grain but softens some fine stone detail. The pale Daiya
name plaque becomes very bright, reducing contrast of its small in-scene lettering;
the browser's localized place labels remain the reliable reading aid. The upper
Daiya glazing also has a pronounced HDR reflection. These are documented visual
limits, not evidence that the user has accepted the lighting or architectural art.
The corrected Daiya daylight still remains very dark beneath the canopy and on
the shaded frontage. It is unsuitable for reading small physical lettering; the
comparison demonstrates a rendering difference, not equal visibility in all views.

| Matched camera | Daylight still | Night still |
|---|---|---|
| Intersection | [Day](../public/render-study/intersection-day.png) | [Night](../public/render-study/intersection-night.png) |
| Mitsui frontage | [Day](../public/render-study/mitsui-frontage-day.png) | [Night](../public/render-study/mitsui-frontage-night.png) |
| Daiya frontage | [Day](../public/render-study/daiya-frontage-day.png) | [Night](../public/render-study/daiya-frontage-night.png) |

The six 1200×750 PNGs total 4,044,206 bytes. Model, actor, rig, HDR, source-scene,
raw linear, filtered linear and final image hashes were checked. The earlier
unpaired public images were removed; historical browser evidence remains intact.

The exact packaged [English night opening](../evidence/day-night-20261006/browser/opening-night-en.png)
and [Chinese night opening](../evidence/day-night-20261006/browser/opening-night-zh.png)
were inspected independently. The traveller, first destination ring, tactile path,
crossing and localized controls remain readable inside distinct warm pools. The
larger PCF radius filters edges but the long canopy/post shadow wedges remain
visibly geometric. This is bounded realtime shadow filtering, not area-light
shadow equivalence or a user vote approving the revised art.

The [walked night bank approach](../evidence/day-night-20261006/browser/south-bank-approach.png)
also keeps the traveller and destination ring distinct inside a warm pavement pool.
The southern classical columns retain visible form above the canopy, while upper
glazing remains very dark. The [Chinese encounter card](../evidence/day-night-20261006/browser/bank-card-zh.png)
and contextual action remain readable after the actual crossing route. In the
compact and wall-adjacent captures the traveller remains findable, although a
canopy edge grazes the hat near the wall; this does not establish unobstructed
silhouette in every possible camera pose.

All six actual browser comparisons were independently inspected:

| Matched camera | Daylight A/B evidence | Night A/B evidence |
|---|---|---|
| Intersection | [Day](../evidence/day-night-20261006/browser/comparison-intersection-day-both-en.png) | [Night](../evidence/day-night-20261006/browser/comparison-intersection-night-both-en.png) |
| Mitsui frontage | [Day](../evidence/day-night-20261006/browser/comparison-mitsui-frontage-day-both-en.png) | [Night](../evidence/day-night-20261006/browser/comparison-mitsui-frontage-night-both-en.png) |
| Daiya frontage | [Day](../evidence/day-night-20261006/browser/comparison-daiya-frontage-day-both-en.png) | [Night](../evidence/day-night-20261006/browser/comparison-daiya-frontage-night-both-en.png) |

Framing, corner shafts, canopy construction and traveller placement visibly align.
Daylight A retains more shaded frontage/glazing detail; B gives stronger sill and
contact-shadow depth but substantially underexposes the Daiya frontage. At night,
A shows distinct pavement pools and bright corner washes; B is darker and warmer,
with softer indirect transitions and a pronounced reflection across upper Daiya
glass. Mitsui's four shafts and Daiya's paired shafts remain distinguishable, but
the bright night name plaque loses fine lettering, especially in B. These are
observable differences between implemented alternatives, not evidence that B is
preferable or that either meets the user's final art-quality standard.

## Shared architectural scene

The current scene uses seven complete mapped building footprints, rather than
short display volumes. Mitsui and Daiya now turn around their actual diagonal
intersection planes. Mitsui's four-column curved classical feature and Daiya's
paired-column feature occupy those planes; neither is attached to a substituted
straight Shijō wall. Floor counts are sourced metadata. Heights in metres,
construction proportions, roof treatment and materials remain authored.

The reference-informed foreground includes punched window recesses and stone
sills, continuous masonry courses, distinct vertical glazing/ribs, canopy panels
with separate support ribs and underside fittings, dark/metal ground frames,
curb transitions, drainage and tactile surface relief. Masonry courses and piers
do not overlap coplanarly; glazing is in front of its opaque reveal backing.

Mapped road and sidewalk centrelines, hedges, one tree position and two eastward
neighboring masses connect the primary buildings to a larger street. Road buffer
widths of 9.7 m per one-way centreline / 18.3 m along Shijō, sidewalk buffers of
3.3 m, kerbs, signal housings, tactile layout, tree species/size and plant form are
presentation choices. Traffic signals are static authored objects, not live
states or a signal-timing simulation. The distant neutral ground and road
continuation beyond the clipped source bounds are explicitly authored background;
they do not establish additional observed buildings or navigation.

The four licensed photographs in [the façade reference record](facade-references.md)
inform original geometry and materials. Their pixels are not included. Street-face
orientation matters: the clearer Karasuma arch treatment belongs on Daiya's west
return, not repeated along Shijō. Nighttime photo lighting is not measured stone
color. No Google Street View imagery or derived asset data is used. Ten authored
door positions remain unassigned; these are frontage interactions, not verified
entrances or reconstructed interiors.

## Material and lighting treatment

Four original 512×512 surface sets add tangent-space normal and roughness maps to
stone, granite, paving and asphalt. Together with the glazing color cues, the GLB
contains fourteen embedded images. Color maps use color interpretation; normal
and roughness maps use non-color data. There are no copied photographic textures,
external image requests, texture-codec dependencies or baked direct sunlight.
No scene AO texture is currently baked: geometric recesses, shadows and—in B—
path-traced indirect light supply that depth. Glass remains an opaque PBR
approximation; it does not reconstruct a real interior or transmit light like a
complete architectural glazing assembly.

**A — realtime PBR:** the actual GLB uses the selected mode's HDR reflections,
hemisphere fill, directional key, local fixtures and emission from the shared rig.
The interactive game retains its guided camera and controls. The separate
comparison fixes its camera to the selected study view and keeps all buildings
visible.

**B — Blender Cycles stills:** the same source geometry, materials, traveller pose
and camera are path traced with indirect light and reflections. These are fixed
images, not evidence of realtime path-traced play. Cycles world fill, sun energy,
exposure and compositor mist are separately recorded in the manifest. These
day/night calibrations are not numerically equivalent to Three's PMREM/hemisphere
lighting. The two approaches share a nominal haze range; Three
view-depth fog and Blender mist are not identical physical atmosphere models.

## Comparison and evidence contract

[`render-study/manifest.json`](../public/render-study/manifest.json) is authoritative
for all three views: intersection, Mitsui frontage and Daiya frontage. It records
vertical FOV, aspect, camera position/target/up, near/far planes, model and actor
hashes, each still's hash, source scene/context hashes, Blender version, actual
sample count, render duration and lighting differences. Images and live views are
letterboxed to the same aspect; they must not be stretched or independently
reframed. A model change requires new stills from its corresponding `.blend`.

Source coordinates are metres: Blender `(east, north, height)` maps to Three
`(east, height, −north)`. The same exported geometry supplies both the game and
study. The study uses no gameplay occlusion cutaway. A beautiful still does not
establish acceptable walking visuals, interaction fluency or hardware performance.

Review at actual playing scale and in the browser: the two corner silhouettes,
window recesses, canopy underside and stone/metal/glass transitions must be
readable; the street must retain asphalt/pavement distinction and grounded feet;
there must be no blocking foreground mass, ghost façade, checkerboard masonry
artifact or dominant exposed stage edge. The user judges whether the resulting
street appearance is convincing enough. Technical checks do not supply that vote.

### Review of the preceding daylight candidate

The preceding Cycles images were inspected at 1200×750, 64 samples, without
denoising, before the selectable lighting rig. Its
[intersection comparison](../evidence/detail-study-20261006/browser/comparison-intersection-both-en.png) exposes all
four Mitsui columns and Daiya's paired columns on separate diagonal faces. The
road/pavement distinction, curved planted corners and eastward continuation are
visible together. The two close views reveal window recesses and sills, continuous
stone courses, canopy supports and kerb transitions; the previous checkerboard
masonry artifact is absent.

Visible limits remain: the glazing and lettering beneath both canopies are dark;
fine sampling grain remains in shaded surfaces; foliage is simplified, street
activity is sparse, and repeated contextual windows are still authored background
architecture. The study is a material and construction comparison, not a finished
photographic reconstruction. Final browser comparison and walking captures must
be reviewed separately; these offline observations do not establish user approval.

The final-build [English opening](../evidence/detail-study-20261006/browser/opening-en.png)
and [Chinese opening](../evidence/detail-study-20261006/browser/opening-zh.png) were
also inspected: source-shaped corner returns, planting, window sills and road
contrast carry into realtime rendering, while the traveller and target rings
remain readable. The high gameplay camera makes the canopy look bright and flat;
asphalt shows broad mottling, and the repeated foliage remains visibly stylized.
At the [façade collision wall](../evidence/detail-study-20261006/browser/actor-near-facade.png),
a canopy post overlaps the traveller's torso and legs and the canopy partly covers
the hat. The actor remains locatable, but this is not an unobstructed silhouette
in every pose. These findings do not override the user's pending art judgment.

The [south bank approach](../evidence/detail-study-20261006/browser/south-bank-approach.png)
was captured after an actual walk through the crossing. Its arrival camera shows
Daiya's vertical glazing and diagonal corner separately from Mitsui's punched
windows; the traveller, destination ring and Chinese action prompt remain readable.
The [bank card](../evidence/detail-study-20261006/browser/bank-card-zh.png) opens over
that scene with clear localized choices. Bright canopy surfaces, opaque dark glass
and repeated planting still limit realism in this view.

The restored-position [western asphalt](../evidence/detail-study-20261006/browser/western-asphalt-restored.png)
and [eastern context-occlusion](../evidence/detail-study-20261006/browser/eastern-context-occlusion-restored.png)
probes also keep the traveller visible; the eastern contextual building no longer
overlays the camera. These are restored test positions, not additional walked-route
evidence. Ground-height checks establish contact coordinates, while the subtle
actor contact shadow still leaves room for stronger visual grounding.

The actual browser comparisons—[intersection](../evidence/detail-study-20261006/browser/comparison-intersection-both-en.png),
[Mitsui](../evidence/detail-study-20261006/browser/comparison-mitsui-frontage-both-en.png)
and [Daiya](../evidence/detail-study-20261006/browser/comparison-daiya-frontage-both-en.png)—
were independently inspected. Framing, four-column versus paired-column corners,
traveller placement and frontage construction align. A is brighter and cleaner,
with more readable ground glazing, but strong ambient fill flattens its recesses
and canopy junctions. B gives stronger sill, column and contact-shadow depth,
while losing some ground-level glass and lettering in shade and retaining fine
sampling grain. This is a meaningful implemented comparison; it does not establish
that B is preferable, that either is photorealistic, or that the user has accepted
the revised art. Actual-device performance remains unmeasured by this visual review.

## Runtime asset contract

| Group / asset | Contract |
|---|---|
| `public/models/shijo-block.glb` | Complete expanded street geometry and original PBR materials |
| `NorthBuilding` / `SouthBuilding` | Primary building parents |
| `North/SouthGround`, `Upper`, `Shell`, `Roof` | Independent primary visibility groups |
| `North/SouthCanopy`, `CanopyPosts` | Separate roof/support visibility, avoiding whole-façade removal for one post |
| `ContextBuilding_<osmId>` | One visibility group per surrounding building; roofs/walls/windows only |
| `Context` | Display-only background, planting and context surfaces; not one occludable building |
| `walkable: true` mesh extra | Actual visible simulation surfaces clipped to existing play bounds; road .05 m, pavement .17 m |
| `public/models/traveller.glb` | Separate traveller, ground origin between feet, approximately 1.7 m tall, faces glTF −Z |
| `LeftLeg` / `RightLeg`, `LeftArm` / `RightArm` | Existing hip/shoulder pivots for procedural walking |

The original navigation bounds, target coordinates and input controls remain
unchanged. Supplemental clipped movement surfaces are authored simulation
surfaces, not verified real-world walkability. Context outside those bounds is
not newly navigable. Consumers use `walkable` / `semanticGroup` metadata rather
than relying on an exact count or unsuffixed Blender object name.

## Rebuild and provenance

From the repository root, using tested Blender 4.3.2, Node and the installed Noto
CJK font at `/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`:

```sh
blender -b --python experience/art/build_scene.py -- \
  --output-dir /tmp/tourguideai-experience-art --skip-render
blender -b --python experience/art/render_study.py -- \
  --blend /tmp/tourguideai-experience-art/shijo-block.blend --samples 96 \
  --denoiser /path/to/oidn-2.5.1/bin/oidnDenoise \
  --work-dir /tmp/tourguideai-lighting-linear
```

The model generator's default editable output is the operating system temporary
directory plus `tourguideai-experience-art`; `--output-dir` overrides it. Runnable
models default to `experience/public/models`; `--asset-dir` overrides that path.
The study defaults to `experience/public/render-study`, 1200×750; sample count,
image dimensions, selected views/modes and output directory are configurable. The
reviewed editable source is under `/workspace/scratch/experience-street-study-final`.
The built-in Blender denoiser is unavailable in this installation. The tested
optional external tool is official [Intel Open Image Denoise 2.5.1](https://github.com/RenderKit/oidn/releases/tag/v2.5.1),
an Apache-2.0 CPU CLI. The verified Linux archive SHA-256 is
`743c3e2aff8c220d5d70fe6cb970fb3d36f2702d2693c61d1d148e404cf37cd6`.
It is an authoring dependency, not shipped in the browser application.

The renderer writes 32-bit scene-linear EXR, passes linear RGB PFM to OIDN's
`RT` / `high` HDR filter on CPU with four threads, then applies the same Khronos
PBR Neutral view transform and mode exposure to the filtered result. It does not
blur a screenshot. This uses beauty RGB only, without albedo/normal guide passes;
small details can be smoothed. The manifest records the verified executable hash,
tool version, source/config hashes, raw EXR/PFM and filtered PFM hashes, final PNG
hashes, samples and durations. Raw intermediates remain in the specified scratch
directory. Omitting `--denoiser` is supported and records unfiltered output.
`--preserve-renders` can retain unchanged images only after matching their model,
rig, source scene, context, camera, sampling and denoiser inputs and verifying the
existing image hashes. Per-image producer-script hashes distinguish retained
night renders from the corrected daytime pass; the top-level script hash identifies
the current manifest writer. No unchanged image is relabelled as a new render.

[`provenance.json`](../public/models/provenance.json) binds the generator, canonical
content, expanded context, model hashes, material counts and authored/source
boundaries. The generator imports only the current tracked content and reference
metadata; it has no authoring or runtime import dependency on `iteration/`.
The `.blend` preserves editable source objects and packed original images.
A second byte-identical export has not been claimed for this revision.

The Blender scripts retain their GPL-compatible notice and accompanying
[`COPYING-GPL-3.0.txt`](../art/COPYING-GPL-3.0.txt); this does not change the game's
or generated artwork's licensing. Keep the shipped Noto notice and photographic
reference credits with distributed assets.

## Implementation references

- [Three r186 RoomEnvironment](https://github.com/mrdoob/three.js/blob/r186/examples/jsm/environments/RoomEnvironment.js): local PMREM reflection environment.
- [Three r186 MeshStandardMaterial](https://github.com/mrdoob/three.js/blob/r186/src/materials/MeshStandardMaterial.js): PBR roughness/metalness and environment response.
- [Blender 4.3 glTF exporter](https://docs.blender.org/manual/en/4.3/addons/import_export/scene_gltf2.html): Principled materials, normal/roughness textures, custom properties and geometry export.
