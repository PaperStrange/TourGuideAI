# Street-level art direction

The user approved guided 3D and asked for more realistic building appearance and
lighting. This revision brings the camera closer to a believable modern Kyoto
street and replaces generic window grids with distinct, reference-informed
building character. It does not claim a photographed or surveyed reconstruction.

## What changed

- Recorded eight-level building counts replace the proof's short display volumes.
  Ground-floor heights are 3.9 m north and 4.7 m south; upper storeys are 3.05 m.
  Those heights in metres are authored, not measured.
- Mitsui has solid pale stone, individually punched dark windows, substantial
  piers/spandrels and a simplified classical corner. Daiya has pale vertical ribs,
  tall dark glazing strips, a horizontal belt and paired corner columns. Their
  frontages no longer share one curtain-wall pattern.
- Neutral stone, darker granite, thin aluminum frames and recessed windows replace
  the beige palette and uniformly teal glazing. Original embedded textures add
  restrained paving/grain variation and soft reflection/blind cues. Dark lower
  frames, pale canopies and restrained green/red accents give the sidewalk scale.
- Separate ground, upper, shell and roof groups preserve full building volumes
  while allowing the camera to reveal the traveller. The south facade is modeled
  fully; it is not permanently replaced by a short back wall.
- There is no raised display plinth. Fine surface detail replaces hundreds of
  separate paving slabs. Small bevels, curb height and thresholds establish scale.
- An independent traveller has shoulder/hip pivots, a readable rust jacket, hat,
  backpack and feet at the model origin. Runtime walking is driven by simulation.

The four licensed photographs in [the reference record](facade-references.md)
informed original simplified geometry/materials; their pixels are not included.
Full views establish the two different street-face orientations. Daiya's single
bounded arch is on the west return: the clearer Karasuma arch array was not
transferred to Shijō. Nighttime photo warmth is not treated as measured stone color.
No Google Street View imagery or derived asset data was used.

Facade dimensions, bay arrangements, corner simplification, materials,
roof/backfaces, props, lighting and threshold details remain authored. Source
frontage X spans and eight-level metadata are retained; flat facade Y is an
authored approximation of the slightly sloping mapped frontage. Ten decorative
doorway positions retain their unassigned-tenant status; an attractive door does
not establish a real entrance.
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
| `NorthCanopy` / `SouthCanopy` | Separately hideable covered-sidewalk roof |
| `NorthCanopyPosts` / `SouthCanopyPosts` | Slender supports, separate from facade bounds for occlusion |
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

The six small procedural color textures are original art, embedded in the GLB.
There are no fetched photographs, HDRIs, baked sunlight, texture-codec dependencies
or arbitrary Cycles shader graphs. The authored glazing cue is not a photograph
of reflected surroundings. Moving light, transparent glass and normal-map baking
remain separate choices to justify in the actual browser.

The generator's optional reference lighting uses Cycles CPU, Khronos PBR Neutral
and no optional denoiser. Its area-light appearance is a reference, not proof of
browser lighting fidelity. The reference camera hides south upper/shell/roof
groups; runtime visibility responds to the camera and actor. The facade pass was
exported with `--skip-render`: an earlier beauty PNG does not depict this asset.

## Rebuild and provenance

From the repository root:

```sh
blender -b --python experience/art/build_scene.py -- --skip-render
```

Requires tested Blender 4.3.2, Node on PATH, and the installed Noto CJK font at
`/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`. `--output-dir` changes the
editable `.blend`/PNG/metrics destination; `--asset-dir` changes the GLB destination;
`--skip-render` skips the reference image; `--samples` changes Cycles sample count.
The default source/reference directory is the operating system's temporary
directory plus `tourguideai-experience-art`; runnable models default to
`experience/public/models`. This facade review explicitly used
`--output-dir /workspace/scratch/experience-facade-art --skip-render` and produced
the editable `shijo-block.blend` there. Nothing is imported from a legacy runtime
or generated HTML. The generator reads the current canonical `src/content/kyoto.js`
for geometry and the tracked facade-reference JSON for attribution metadata.

`public/models/provenance.json` records generator/content hashes, model hashes,
source floor-count evidence, geometry, authored treatment, all four photographic
reference records and export measurements. This was an actual successful export;
byte-identical reproducibility from a second run was not measured for this pass.
The `.blend` retains original editable objects and packed original color textures.
Font lettering is converted to mesh; retain the Noto notice shipped with this
application when distributing art. The Blender tool has its own GPL-compatible
notice; that does not change the game's or generated artwork's licensing.

## Review status and limits

The final facade GLB is `68c2afa632505ddb6ae2a65d93c615403a476f4859885ca5860fbc3bfcd6980b`:
3,682,648 bytes, 56 mesh primitives, 44,852 triangles and six embedded textures.
The separate traveller is 44,608 bytes and 752 triangles; its established limb
pivots and ground origin remain intact. These are export measurements, not frame
rate or art-quality scores.

The art lead inspected QA's actual browser [English opening](../evidence/browser/opening-en.png),
[Chinese opening](../evidence/browser/opening-zh.png),
[compact Chinese view](../evidence/browser/compact-zh.png) and
[north close approach](../evidence/browser/actor-near-facade.png) from the
final-facades run, against this GLB and runtime JS prefix `0d567976`.
The opening now visibly separates pale solid stone, inset dark windows, dark
lower glazing and the covered sidewalk. Part of
the classical corner is visible, with upper mass naturally cropped by the closer
camera. The traveller and crossing are findable in both locales; no ghost building
overlay appears. At the close north approach the rust shoulders/hat and legs remain
visible, although a slender canopy post overlaps the actor's centre in that pose.

The actual [south-bank arrival](../evidence/browser/south-bank-approach.png)
shows a different tall stone/glass rhythm, quiet horizontal belt, paired corner
columns and a thin red frontage stripe. The camera faces the south frontage;
the traveller, gold interaction ring and contextual action remain readable.
The [Chinese bank card](../evidence/browser/bank-card-zh.png) is clear and retains
the street as background context. The south elevation is cooler and shadier than
the opening's north facade, with a broad street shadow rather than the former
ghost overlay. Opaque stylized glass and a simple actor contact shadow still
limit realism; this is not a physically complete daylight reconstruction.

The canopy is very bright with pronounced repeated seams, while distant mesh
lettering remains too small for reliable reading; the stable interface supplies
place names. Some ground signs are partly hidden by the canopy at the guided
camera angle. These are visible polish limits, not evidence of photographic
fidelity. The west contextual patch remains incomplete because this pass did not
invent a Karasuma road surface. No additional asset blocker was identified in the
reviewed opening, north approach and actual south arrival. User acceptance of
appearance and interaction fluency remains separate from these art observations
and QA checks. The software-GPU walkthrough confirms route completion, not
hardware-independent smoothness or user immersion.

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
