# GitHub research · 2026-10-05

The new experience uses a small standalone Vite/Three.js application, with separate
simulation, rendering, content and interface modules. This is a design chosen for
this game after reading current upstream examples, not a claim that one folder
layout is a universal standard. Repository popularity does not prove travel-game
usability or measurable immersion.

## Sources actually read

| Repository / source | Observed pattern | Application here |
|---|---|---|
| [Vite vanilla starter](https://github.com/vitejs/vite/blob/main/packages/create-vite/template-vanilla/package.json) and [entry module](https://github.com/vitejs/vite/blob/main/packages/create-vite/template-vanilla/src/main.js) | Small ESM entry, ordinary asset imports, independent dev/build/preview commands; current source listed Vite 8.3.1 | One independently installable application; no framework or monorepo required for this scope |
| [Three.js glTF example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_loader_gltf.html) | Environment reflections, explicit tone mapping, bounded OrbitControls, shader preparation and stale async-load checks | Deliberate material/light pipeline, recoverable camera and loading lifecycle; use local resources rather than the example's external model/HDR downloads |
| [Three r186 RoomEnvironment](https://github.com/mrdoob/three.js/blob/r186/examples/jsm/environments/RoomEnvironment.js) and [MeshStandardMaterial](https://github.com/mrdoob/three.js/blob/r186/src/materials/MeshStandardMaterial.js) | PMREM from an in-memory environment; PBR roughness/metalness need useful illumination and reflections | Original neutral environment, glass/metal response, no mandatory external HDRI |
| [Bruno Simon Folio 2025](https://github.com/brunosimon/folio-2025/blob/main/readme.md) | Explicit order from input to simulation, player, view, effects, rendering and monitoring; Blender exports and later compression preserve source assets | Separate simulation from visual feedback; build responsive approach/interaction moments; retain editable originals and ship derived GLBs |
| [React Three Fiber performance guide](https://github.com/pmndrs/react-three-fiber/blob/master/docs/advanced/scaling-performance.mdx) | Reuse geometry/materials, instance repeated objects, avoid unnecessary idle frames, adapt pixel ratio | Apply underlying Three.js resource principles without adding React as a dependency |

The current-default-branch reads above are observations on this date. File Git blob
IDs returned by GitHub were, respectively:

- Vite starter package: `8199ca21b193a75b026f5be17a30a481fcbf700a`.
- Vite entry: `6d895a9c64dc8a5333f3ebf038aefecc80b8e4a1`.
- Three example: `f53b44870e0a1c0ef9e2c85a491f77d94e0fd70c`.
- Folio 2025 readme: `11e5c8155e60b0c1a5e609797d946c466cc19e0d`.
- R3F guide: `c72f2153be5763b2f8ab456f1515b035c722b669`.

The product review also read pinned Folio 2019 and A Dark Room interaction/save
patterns; exact references and the limited lessons are in [immersion.md](immersion.md).
No third-party game artwork or wholesale application template was copied.

## Decisions

Keep a focused vanilla ESM runtime. Introducing React, an ECS, a server, a physics
engine or several packages would need a concrete requirement. Vite serves the
independent project and creates the release assets; Three handles the scene;
Blender generates original art. Pinned installed versions are in the lockfile,
which is authoritative for this implementation rather than the moving upstream
starter version.

The simulation owns positions and proximity. The renderer owns scene resources,
lighting, camera and picking. The DOM owns readable bilingual controls and cards.
Journey persistence and exports are small pure boundaries with tests. Asset
provenance travels beside the art instead of being inferred from a realistic image.

Review the actual playable build at the intended player scale. The earlier wide
Blender proof establishes export feasibility; it cannot settle facade realism,
interaction fluency, or whether a user wants to continue their travel story.
