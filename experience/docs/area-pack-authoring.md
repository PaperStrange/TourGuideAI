# Authoring a reviewed area pack

2026-10-19 · Applies to the [Ginza milestone](sprint-packs-20261019.md).
The current implementation uses a shared runtime with explicit Shijō and Ginza
definitions. Ginza's export, art review and integrated interaction/resource checks
are recorded in the [milestone evidence](../evidence/area-packs-20261019/README.md).
This guide describes the reusable process and current entry points. Human recognition
and enjoyment require separate participant evidence.

## 1. Establish the place and playable boundary

World-content owns canonical source data, beginning with
[`content/ginza-wako/source.json`](../content/ginza-wako/source.json) and its
[source ledger](ginza-wako-sources.md). Preserve stable provider IDs, raw responses,
versions/retrieval dates, source URLs, licenses and known conflicts. Separate
observed facts, source-derived geometry and authored simulation values.

Record a representative Maps coordinate independently from the actor spawn and
local geometry origin. Define the geographic-to-local conversion and units once.
For Ginza, origin node `2135828626` is at `35.6714369, 139.7650181`; local X is east,
Y north and Z height, with glTF coordinates `(x, height, -y)`. Source sidewalk
connectivity supports a roughly 55.28 m centerline. Its 4 m full-width corridor,
level ground and 0.32 m actor radius are authored simulation values. Existing
Shijō keeps its own frozen frame and navigation behavior.

Select a coherent approach, change of viewpoint and place to pause. Confirm the
usable route boundary and visibility of the intended features before producing
geometry. Missing access/width/grade evidence stays explicit. Preserve building
identity and real Maps coordinates without implying a surveyed entrance or an
approved real-world walking route.

## 2. Retain a shared style and distinctive local features

Art and world agree on the features a person should notice while moving. Wako's
clock tower, convex corner, window hierarchy, cornices and stone/glass base supply
the current anchors. Reference photos need author, capture date, license and any
alteration record. Operator facts and geometry/photo licenses remain separate.

Reuse the actor, interaction language, shared finish machinery and the
[`map-style.js`](../src/home/map-style.js) palette. Preserve source-specific
proportions and materials: Wako's documented lower polished stone and upper
granite require their own authored PBR treatment. Reference exposure supplies no
calibrated surface color or baked lighting. Produce original simplified geometry;
record unseen or approximate details in provenance.

Art owns [`art/build_ginza.py`](../art/build_ginza.py), the new model and lighting/
material records. Its current argument parser accepts the following command from
the repository root; Blender is installed at `/usr/bin/blender` in this workspace:

```bash
blender --background --factory-startup --python experience/art/build_ginza.py -- \
  --source experience/content/ginza-wako/source.json \
  --output-dir artifacts/ginza-art-20261019/build \
  --asset-dir experience/public/packs/ginza-wako
```

The generator writes editable `artifacts/ginza-art-20261019/build/ginza-wako.blend`
from the repository root. Runtime exports are
`experience/public/packs/ginza-wako/{scene.glb,lighting.json,materials.json,source.json,provenance.json,manifest.json}`.
The GLB embeds original PBR maps; Traveller/HDR assets are
shared. Verify each export against its manifest before building. Keep scratch
outputs under ignored `artifacts/`. Preserve existing Kyoto asset hashes and
record generator/source/output hashes, Blender version and actual production/revision effort.

## 3. Integrate the pack through existing controls

Engineering owns [`packs/registry.js`](../src/packs/registry.js) and the
[`ginza-wako.js`](../src/packs/ginza-wako.js) definition. The registry exposes
`getPack`, `getPackForPlace`, `getPackPlace` and `listPacks`. Definitions supply
stable ID/revision, EN/ZH title/description, source place, coverage, navigation,
spawn, assets, lighting, camera limits and inspectable features. Source ownership
remains with world-content; runtime behavior remains with engineering.

Shijō uses its existing rectangle/crossing strategy. Ginza uses a bounded corridor
and footprint. New navigation shapes require explicit engineering and source
review. Map coordinates, query origin, selected place and simulated actor position
retain distinct meanings. The registry's coverage test must only offer a detailed
walk where that pack is appropriate.

Reuse walking, rotation, tilt, inspection pan, zoom, day/night and optional visible
surface inspection. Feature IDs connect real scene surfaces to short bilingual
context and sources. Opening a detail does not move the camera or complete a visit.
When the actor is outside the frame, Keep walking or deliberate movement restores
actor framing while preserving orbit and zoom. A view that already contains the
actor stays unchanged.
Root owns homepage entry/exit, source labels and solo save integration.

## 4. Bind resources and saved-view compatibility

Ginza's marginal production caps are **≤8 MiB model plus place-specific maps**,
**≤100,000 triangles** and **≤64 mesh/material batches**. Record actual export and
runtime measurements before accepting the pack. Identify reused assets separately;
measure readiness, switching and disposal independently of file size. Fetch area
geometry only after selection, cancel superseded loads, and suspend inactive
updates/draws. The current [export manifest](../public/packs/ginza-wako/manifest.json)
records file hashes, bytes, triangles and primitives; it establishes export
measurements. The delivered model is 7,970,296 bytes, 84,624 triangles and 48 batches;
its twelve maps contain 1,376,256 decoded pixels. Runtime resource and appearance
checks retain their separate reports in the milestone evidence.

Use `shijo-karasuma` revision 1 and `ginza-wako` revision 1. New solo captures carry
`{version: 3, packId, revision, player, camera}`. Historical untagged v1/v2 street
views resolve to Shijō; the saved collection envelope remains version 1. Preserve
unknown pack/revision records and personal words with an explicit unavailable
state. Never reinterpret their coordinates in another area. A change to frame,
navigation or pose meaning needs a revision/compatibility decision before release;
asset hashes also identify cosmetic changes.

## 5. Verify the usable journey and publish its evidence

QA coordinates browser/GPU use with art and engineering. From `experience/`, the
existing package scripts and pack driver's argument parser support:

```bash
mkdir -p /workspace/TourGuideAI/artifacts/tmp
export TMPDIR=/workspace/TourGuideAI/artifacts/tmp
npm test
python3 tools/build-font.py
npm run build
PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright \
EXPERIENCE_QA_OUTPUT=/workspace/TourGuideAI/artifacts/packs-20261019/browser \
EXPERIENCE_QA_TIMEOUT=120000 node tests/browser-packs.mjs dist
```

The driver requires a built homepage and `packs/ginza-wako/scene.glb`. It serves
immutable build bytes, uses real providers and an isolated local room service,
and records package/driver hashes. Regenerate the font before the build so new
pack EN/ZH text is included. The short ignored `TMPDIR` keeps browser temporary
files inside the workspace and leaves room for Unix socket names. Each report binds
its exact package; scoped diagnostic runs retain their limited coverage.
`EXPERIENCE_QA_CHROMIUM` optionally selects a browser executable; otherwise it uses
Playwright's installed Chromium. Preserve the managed proxy and browser TLS trust.
`EXPERIENCE_QA_ONLY` accepts comma-separated current sections: `openings`, `continuity`,
`phone`, `framing-recovery`, `latest-intent`, `asset-recovery`, `unsupported-revision`,
`search-cancellation`, `locale-pending`, `resources`. A section run retains its limited coverage.

Review the actual sequence: old Shijō save → Ginza approach/corner/inspection →
keep view/light/words → map → reload → return to both saved areas → Maps handoff.
Repeat EN/ZH with keyboard and touch. Check unknown revisions, delayed/canceled
selection, denied assets/retry, selected order and legacy storage isolation.
Inspect actual moving and frozen arrival/oblique/pause views by day/night against
annotated references at desktop and phone scale. Generic silhouette, concealed
anchors, flat unreadable glazing, detached shadows or lost actor/pavement contrast
require revision. Screenshots and automated checks do not establish human meaning.

Record source/package/asset hashes, actual checks, resource measurements, source
conditions and review findings. Q03 keeps its unchanged gate: each of three matched
warm Together locale actions **<500 ms**; the prior 1.1–1.2 s observations leave it
open. Lead resolves release blockers, commits, publishes and verifies hosted bytes
and the actual journey. Pending checks stay pending in release documents.

## Recurring work for each area and update

- **Source owner:** recheck identity, route/source changes, rights and uncertainty;
  retain retrieval and review dates plus the reason for any changed geometry.
- **Art owner:** maintain a small reviewed feature set, dated reference crops,
  reproducible exports, source-specific surfaces and measured asset budgets.
- **Engineering/root:** preserve control behavior, pack lifecycle, compatible saved
  views and source/Maps identity; explicitly handle unavailable revisions.
- **QA/product/art:** replay the cross-area journey and failed-load recovery,
  review source-matched motion/day-night frames, and retain bounded evidence.

Shared machinery reduces repeated implementation. Each new area still needs
curation, original art and independent review. Log actual effort and maintenance
work; do not infer production hours or recognition rates from reuse or test counts.
