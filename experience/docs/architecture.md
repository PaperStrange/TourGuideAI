# Experience architecture

User direction on 2026-10-05 explicitly permits a new structure. `experience/` is
an independently installable, buildable browser game. Its runtime and art pipeline
read their own source and local assets. The historical prototypes remain useful
comparison evidence; the new package does not import them.

```text
experience/
  src/
    app/            application orchestration, journey storage, field-note export
    runtime/        Three.js scene, camera, input, loading and disposal
    simulation/     fixed-step movement, bounds, proximity and serializable state
    content/        sourced Kyoto geometry, places and choice content
    ui/             bilingual copy, accessible DOM styling and bundled font
  art/              reproducible Blender authoring script
  public/
    models/         exported scene/player GLBs and asset provenance
    content-evidence/  local snapshots behind verified content
  tests/            simulation, persistence, export and real-browser checks
  docs/             product direction, decisions, research and validation
  evidence/         selected delivery evidence and exact build/source inventory
  dist/             generated deployable files (ignored)
```

## Boundaries

`src/app/main.js` binds the HTML interface to `createGame`. The runtime publishes
snapshots and interaction requests. Cards pause movement; language changes keep
position, choices and camera. Input uses camera-relative movement projected onto
the ground; saved positions remain in metres in the original world coordinate
system. Fixed-step simulation must preserve the actual vector, not just key names.

The GLB world mapping is `(east, height, -north)`. Semantic scene groups support
occlusion independently of decorative material batching. The actor is a separate
asset with explicit limb pivots. Walk feedback uses movement; it must stop when
movement or the application pauses. Camera drag and click-to-walk are distinct
input gestures. Camera reset restores a readable player-relative framing.

`journey-store.js` accepts the current `tourguideai:journey:v2` record first. Only an
absent v2 key permits importing `tourguideai:first-walk:v1`; a malformed or empty v2
record does not resurrect an earlier walk. This is same-origin browser storage.
Moving between ports/domains does not automatically transfer localStorage.

The record contains `version`, `locale`, `hints`, `game` and `notes`. Notes use
known place IDs, plain strings and a 500 UTF-16 code-unit limit matching HTML
`maxlength`. They are user memories, not facts. Explicit saving gives success or
failure feedback; locale changes and closing/reopening the encounter preserve the current in-memory draft. Only explicitly saved text survives reload and enters the export. Reset clears
this walk and its notes after the existing confirmation. There is no archive or
cloud sync yet.

`field-notes.js` creates a local, user-triggered HTML download from recorded visits,
choices and saved personal notes. Text is escaped. Exporting does not publish the
journey to a service. Future whole-trip sharing requires a preview of the selected
days, notes and images and an explicit sharing action.

## Delivery and quality

`npm ci`, `npm test`, `npm run build` and `npm run test:browser -- dist` are scoped to this
folder. The release is a standard static site with local model/font/source assets.
Serving a downloaded build folder needs a static HTTP server; direct `file://`
launch and an offline service-worker install are separate capabilities.

Pin dependencies and keep the lockfile. Generated Blender source stays in the
review package; the authoring script and deployable GLBs travel with the repository.
License notices remain with their respective runtime/font/art tools. No secret or
service account is required by the playable slice.

Read-only development / `?qa=1` observations expose camera and simulation state for
independent checks of real input. They provide no teleport or completion command.
Use visual review and named hardware measurements in addition to technical checks.
The software-rendered executor cannot certify desktop interaction fluency.
