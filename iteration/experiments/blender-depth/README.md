# Blender → browser depth proof

This is a bounded technology experiment for the next visual iteration. It does
not replace `iteration/game/`, add venues, or implement a new gameplay loop.
The recommendation, sprint plan and acceptance criteria are in
[the research document](../../design/blender-depth-research.md).

## Reproduce

Test tooling: Blender 4.3.2, Node.js 24+, pinned Three.js 0.186.1 and esbuild 0.28.2.
The Blender generator reads the existing `iteration/game/src/content.js` through
Node, so run it from a checkout containing the first playable.

From the repository root:

```sh
blender -b --python iteration/experiments/blender-depth/build_scene.py -- \
  --output-dir /tmp/tourguide-blender-depth
```

The generator writes editable `block.blend`, exported `block.glb`, `render.png`,
`world.json` and `metrics.json` outside the repository. `--samples` controls the
Cycles reference render; `--skip-render` exports only the scene and GLB.
The current generator uses the installed Noto CJK font for mesh lettering; the
metrics identify it. Keep the font notice when distributing generated assets.

Then:

```sh
cd iteration/experiments/blender-depth
npm ci
node probe.mjs --glb /tmp/tourguide-blender-depth/block.glb \
  --fallback /tmp/tourguide-blender-depth/render.png \
  --out /tmp/tourguide-blender-depth --serve --port 4180
```

Open `http://localhost:4180/`. Drag or use the camera buttons to see real depth;
scroll to zoom. `EN / 中文` changes the explanatory interface. This study has a
static traveler and place labels, not playable encounters. Camera control and
model rendering cannot establish gameplay fluency on their own.

`depth-proof.html` embeds the Three.js runtime, GLB and optional fixed-view image.
`build-report.json` records the exact file sizes, hashes and dependency inventory.
The browser must support WebGL2. A fixed-view fallback is deliberately a static
reference image; it is not equivalent to interactive 3D or the existing game.
Direct `file://` launch is a separate, environment-dependent check; HTTP preview
is the reproducible launch path here.

## Scope and source boundaries

Blender uses `(east, north, height)`, meters. Standard glTF Y-up export maps this
to browser `(east, height, -north)`. The source facade spans, crossing and stable
IDs come from existing content. All heights/depths, roofs, backfaces, facade
modules, material treatment, furniture, traveler, lighting and camera are authored.
The foreground building is intentionally cut away. This is not an architectural
survey and does not establish real entrances or reconstructed interiors.

The experiment uses ordinary opaque Principled PBR materials. Glazing is stylized
opaque material, not an assertion of physical glass simulation. No baked textures,
texture compression or animation pipeline has been validated by this proof.
Cycles lighting and browser lighting differ; judge the browser image separately.
The generator retains editable modules in Blender and batches compatible static
meshes for GLB export. The production iteration must preserve the components it
needs to animate, hide for occlusion, or bind to interactions.

## Rights and reproducibility

- Geometry attribution: © OpenStreetMap contributors, ODbL; the original factual
  and authored distinction remains recorded in the first-playable content.
- Generated models/materials are original work for this experiment. Noto CJK
  lettering is identified in the metadata; retain its supplied OFL notice.
- `build_scene.py` is separately marked GPL-3.0-or-later because it is a Blender
  Python tool. That marking is not a license change to the browser game or an
  assertion that Blender-created artwork becomes GPL.
- Three.js is MIT; its license is included in the generated proof HTML.
- The `.blend`, GLB and HTML are generated review artifacts in scratch. Source
  scripts and the dependency lockfile are kept here; final measured evidence is
  linked from the research record. No production game source is edited.
