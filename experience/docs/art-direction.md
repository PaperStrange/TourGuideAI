# Expanded Shijō street: two rendering approaches

On 2026-10-06 the user accepted the play guidance and interaction fluency, but
rejected the previous building/street art as too simple and artificial. Earlier
“no blocker” observations established usability, not acceptable visual quality.
This expanded comparison is a new art candidate; user visual acceptance remains
pending.

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

**A — realtime PBR:** the actual GLB uses environment reflections, hemisphere fill
and a directional light with shadow maps. The interactive game retains its guided
camera and controls. The separate comparison fixes its camera to the selected
study view and keeps all buildings visible.

**B — Blender Cycles stills:** the same source geometry, materials, traveller pose
and camera are path traced with indirect light and reflections. These are fixed
images, not evidence of realtime path-traced play. Cycles world fill, sun energy,
exposure and compositor mist are separately recorded in the manifest. They are
calibrated for readable daylight, not claimed numerically equivalent to Three's
PMREM/hemisphere lighting. The two approaches share a nominal haze range; Three
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
  --blend /tmp/tourguideai-experience-art/shijo-block.blend --samples 64
```

The model generator's default editable output is the operating system temporary
directory plus `tourguideai-experience-art`; `--output-dir` overrides it. Runnable
models default to `experience/public/models`; `--asset-dir` overrides that path.
The study defaults to `experience/public/render-study`, 1200×750; sample count,
image dimensions, selected views and output directory are configurable. The
reviewed editable source is under `/workspace/scratch/experience-street-study-final`.
OpenImageDenoise is unavailable in the installed build, so rendering explicitly
disables denoising. Inspect the manifest for actual final render settings.

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
