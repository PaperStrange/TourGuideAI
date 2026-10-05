# Street-level art direction

The user approved guided 3D and asked for more realistic building appearance and
lighting. This revision brings the camera closer to a believable modern Kyoto
street. It does not claim a photographed or surveyed reconstruction.

## What changed

- Recorded eight-level building counts replace the proof's short display volumes.
  Ground-floor/storey heights of 3.9/3.05 m are authored, not measured.
- Neutral stone, darker granite, thin aluminum frames and recessed windows replace
  the beige palette and uniformly teal glazing. Original embedded textures add
  restrained paving/grain variation and soft reflection/blind cues.
- Separate ground, upper, shell and roof groups preserve full building volumes
  while allowing the camera to reveal the traveller. The south facade is modeled
  fully; it is not permanently replaced by a short back wall.
- There is no raised display plinth. Fine surface detail replaces hundreds of
  separate paving slabs. Small bevels, curb height and thresholds establish scale.
- An independent traveller has shoulder/hip pivots, a readable rust jacket, hat,
  backpack and feet at the model origin. Runtime walking is driven by simulation.

All facade materials, bay arrangements, roof/backfaces, props, lighting and visual
threshold details are authored. Ten decorative doorway positions retain their
unassigned-tenant status; an attractive door does not establish a real entrance.
The current meaningful encounters remain public-space/frontage interactions.

## Asset and runtime contract

| Asset/group | Use |
|---|---|
| `public/models/shijo-block.glb` | Street, full-height buildings, furniture and source-ID reading anchors |
| `NorthBuilding` / `SouthBuilding` | Stable building parents |
| `NorthGround` / `SouthGround` | Ground-level facade, threshold and name treatment |
| `NorthUpper` / `SouthUpper` | Upper facade modules and floor slabs |
| `NorthShell` / `SouthShell` | Side/rear walls; independently removable from the camera ray |
| `NorthRoof` / `SouthRoof` | Roof and parapets |
| `WalkableRoad` / `WalkableNorthSidewalk` / `WalkableSouthSidewalk` | Actual surface meshes, with `walkable: true` extras; surface-height queries only |
| `public/models/traveller.glb` | Separate animated character asset |
| `Traveller` | Ground origin between feet; faces glTF −Z; approximately 1.7 m tall |
| `LeftLeg` / `RightLeg` | Hip pivots; local X rotation for the walking swing |
| `LeftArm` / `RightArm` | Shoulder pivots; local X swing |
| `Torso` / `Head` | Optional restrained idle response |

Source coordinates remain metres: Blender `(east, north, height)` exports to
browser `(east, height, −north)`. Reading-point coordinates come from the same
canonical module as gameplay. Decorative meshes do not change collision facts.
Batching stays inside semantic groups and preserves texture UVs and smooth normals.
Walkable mesh object names may carry Blender's `.001` suffix; use the `walkable`
boolean and exact `semanticGroup` extra rather than strict object-name equality.

## Lighting guidance

Use neutral daylight, modest warm direct sunlight and a local PMREM environment
for believable glass/metal reflection. Stone and paving remain nonmetallic; glass
uses an opaque stylized approximation with limited metalness, not transmission.
Keep contact shadows attached to feet, curbs and props without broad shadow acne.
Do not tint the whole street green or amber to manufacture atmosphere.

The five small procedural color textures are original art, embedded in the GLB.
There are no fetched photographs, HDRIs, baked sunlight, texture-codec dependencies
or arbitrary Cycles shader graphs. The authored glazing cue is not a photograph
of reflected surroundings. Moving light, transparent glass and normal-map baking
remain separate choices to justify in the actual browser.

Reference lighting uses Cycles CPU, Khronos PBR Neutral and no optional denoiser.
Its area-light appearance is a reference, not proof of browser lighting fidelity.
The reference camera hides south upper/shell/roof groups to show the street;
runtime visibility must respond to the camera and actor instead of borrowing a
fixed reference composition.

## Rebuild and provenance

From the repository root:

```sh
blender -b --python experience/art/build_scene.py --
```

Requires tested Blender 4.3.2, Node on PATH, and the installed Noto CJK font at
`/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`. `--output-dir` changes the
editable `.blend`/PNG/metrics destination; `--asset-dir` changes the GLB destination;
`--skip-render` skips the reference image; `--samples` changes Cycles sample count.
The default source/reference directory is the operating system's temporary
directory plus `tourguideai-experience-art`; runnable models default to
`experience/public/models`. This review explicitly used
`--output-dir /workspace/scratch/experience-art`. Nothing is imported from a
legacy runtime or generated HTML. The generator reads only the current canonical
`src/content/kyoto.js` for world and interaction geometry.

`public/models/provenance.json` records generator/content hashes, model hashes,
source floor-count evidence, geometry, authored treatment and export measurements.
The `.blend` retains original editable objects and packed original color textures.
Font lettering is converted to mesh; retain the Noto notice shipped with this
application when distributing art. The Blender tool has its own GPL-compatible
notice; that does not change the game's or generated artwork's licensing.

## Review status and limits

The revised Blender reference has been rendered and inspected. The closer view
shows differentiated gray paving/stone, recessed glazing, thin metallic edges and
a grounded traveller. The reference is deliberately calmer and less saturated
than the original miniature-like proof. Actual integrated browser comparison is
still required before judging the revision's lighting, occlusion or fluency.

Inspect the same route while walking in EN/ZH: the actor must remain findable,
threshold/action feedback must be understandable, signs and prompts must stay
readable, and camera fades must not remove the ground beneath the player. Returning
from a card must preserve position, direction and journey meaning. Full-trip/day
transitions, real interiors, photographed elevations and immersive sharing scenes
are future work; this asset revision does not claim to deliver those experiences.

## Primary implementation references read

- [Three r186 RoomEnvironment](https://github.com/mrdoob/three.js/blob/r186/examples/jsm/environments/RoomEnvironment.js): generate a local PMREM reflection environment without a network HDRI.
- [Three r186 MeshStandardMaterial](https://github.com/mrdoob/three.js/blob/r186/src/materials/MeshStandardMaterial.js): environment-map recommendation and PBR roughness/metalness behavior.
- [Blender 4.3 glTF exporter](https://docs.blender.org/manual/en/4.3/addons/import_export/scene_gltf2.html): supported Principled material patterns, custom properties, textures and triangulation.
