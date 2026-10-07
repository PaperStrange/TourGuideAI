# Playable 3D revision · independent validation

Owner: QA. Current status, 2026-10-06: **the user accepts fluency and guidance
for the Pages build they played; building/street realism is not accepted**.
The day/night and local-HDR revision passes **130/130 packaged-browser checks,
33/33 pure tests and 17/17 repository gates**. It is published on Pages with all
38 hosted files matching the tested package. The preceding expanded-street and
sharing revision passed 97 browser checks. Neither automated result establishes
user acceptance of revised art or representative-device performance.
The historical 2026-10-05 evidence remains unchanged below.

The focused revision must preserve the three sourced encounters while adding
guided 3D navigation, more convincing executed art, and a small personal record
of the journey. A browser check cannot establish human immersion, accepted visual
quality, a real entrance, or a successful Kyoto field walk.

## User review · 2026-10-06

After playing the deployed Pages experience, the user reported that it
“successfully achieved fluency and guidance.” This accepts those aspects for the
build they tested. The same review says the buildings and streets are too simple
to represent reality, so visual realism remains an unmet acceptance criterion.
The earlier agent review found no blocking rendering defect in its inspected
frames; it did not establish the realism the user now explicitly rejects.

The user also found standalone HTML sharing unusual. The historical export checks
prove that the file reflects the played choices and escapes personal text; they
do not establish that downloading and sending HTML is a suitable sharing flow.
In a subsequent decision on the same day, the user requested multiple sharing
formats and both visual treatments on an expanded street. Those new outputs
require their own validation; the earlier download checks do not establish them.

The review did not specify browser, device, GPU or viewport, and it was not bound
to a recorded deployment hash. Do not generalize its acceptance to every build or
device. It is not a fresh-user study, a Kyoto field test, or acceptance of
whole-trip immersion/sharing. The frozen reports, counts and artifact hashes below
remain the evidence for the separate 2026-10-05 automated run.

## Current revision QA plan · 2026-10-06

The frozen revision has completed the automated checks below. The scope is a
matched real-time/Cycles comparison plus in-app preview, recipient link, native
sharing where available, PNG and print/PDF-reader outputs. This evidence establishes
observed behavior and delivered outputs; preferred art quality and real recipient
use remain separate reviews. Historical evidence stays immutable.

| Review point | Evidence and observable failure |
|---|---|
| Reality comparison | Compare the current and revised **browser-rendered** street at matched opening, crossing and north/south approach views against the cited real-place references. Judge facade proportions, material/light response, street detail and recognizable place identity at actual playing size. More props or a Blender beauty image cannot establish success. The user must confirm that the buildings and street now represent the intended reality; record remaining authored approximations. |
| Preserve accepted play | Walk the same three encounters with EN and ZH controls after the rendering changes. A hidden actor, unstable prompt, changed collision/ground picking, camera obstruction or lost choice/note is a regression. Record device/browser and moving-scene timings on the device reviewed; software-GPU timings alone cannot preserve the user's fluency acceptance. Reuse the relevant existing checks rather than duplicating the entire suite for each art edit. |
| Matched treatment comparison | Verify the same expanded geometry, camera position/target, vertical field of view, aspect and hidden groups from the comparison manifest. Inspect real-time output and the supplied Cycles still at their intended uncropped aspect in A/B and side-by-side modes. Check EN/ZH, local asset loading, usable still-image fallback when WebGL is unavailable and visible failure for a missing manifest/image. A successful import or matching camera alone cannot establish preferred art quality. |
| Preview before sharing | Create an in-app preview from an actual played journey. It must retain the selected choices, distinguish skipped stops, and include only saved personal notes explicitly selected for sharing; unsaved drafts and unchecked notes stay absent. Returning to the walk preserves position, progress and notes. Compare the preview with the recipient content and each selected output. |
| Recipient handoff | Copy a link and open it in a separate browser context without the author's storage/session. The recipient must read the same choices, selected personal content, sources and EN/ZH text without WebGL or journey-storage writes. Malformed, unsupported-version and oversized fragments must show a usable error rather than a partial or fabricated recap. Untrusted text must remain text. |
| Multiple outputs | Verify PNG signature, decodable dimensions and visible recap content; verify the print reader's content and print layout separately from link delivery. Native-share payload and cancellation can be exercised with a browser-API stub, but the device share sheet requires a supported-device check. Do not claim that browser print-layout inspection establishes every OS PDF printer or that copying a link publishes server-side content. |

## Day/night delivery · 2026-10-06

The [frozen browser report](../evidence/day-night-20261006/browser/browser-result.json)
records **130 passing checks, zero failures**, 14 scenarios and 37 screenshot hashes.
One full night walkthrough ran **05:49:52–06:05:36 UTC** in Chromium 151 with
SwiftShader against application `a176cf38fbf1645fa8a5a0eb72a99d017ba705ab`.
The [33 pure tests](../evidence/day-night-20261006/unit-tests.tap) and
[17 repository gates](../evidence/day-night-20261006/repo-gates.json) pass.
The [asset preflight](../evidence/day-night-20261006/browser/asset-preflight.json)
independently verified the unchanged models, shared rig, both HDR files and all
six 1200×750 image hashes before the browser opened. Four driver-module hashes
and the exact built-file inventory are recorded in the browser report.

| Contract | Observed result |
|---|---|
| Real appearance change | Applied rig/HDR identities, active fixture and emissive state, and fixed-camera scene pixels distinguish day and night. EN/ZH and compact controls remain readable and preserve the world/camera. |
| Preserve the walk | The actual crossing → Mitsui → MUFG route, collision/picking, modal pause/focus, choices, saved notes and unsaved draft behavior pass at night. Completing a delayed HDR load leaves an open card, its draft and keyboard focus intact. |
| Separate preference | Appearance remains in its own local-storage key, outside journey saves and recaps. Graphics-loss reload retains the selected night preference; comparison selection is query-local and makes no journey/preference writes. |
| Loading and resources | Stale requests cannot override the latest selection. Missing night HDRs show localized fallback/retry in both the game and comparison. Three warm-switch samples remain at 29 textures, 116 geometries and two cached environments, with no extra canvas. This bounded check is not a lifetime memory guarantee. |
| Six matched views | Both modes at all three views use the exact still/model/HDR/rig hashes, camera matrices, aspect and mesh visibility. Mode/view selection survives comparison recovery; no-WebGL fallback retains the selected night still. Missing image and manifest fixtures remain usable and localized. |
| Sharing and continuity | The completed night journey retains link, PNG and print/PDF-reader outputs, opt-in saved notes, excluded drafts, fresh-recipient isolation, legacy-save migration and reset behavior. Native-share APIs use stubs; OS sheets and actual delivery are not established. |

The night bank route took 222.985 seconds over 79 observed frame increments on the
software renderer. The final moving scene recorded 100 calls and 132,564 triangles,
with 29 textures and 124 geometries; the different allocation state must not be
confused with the fixed-camera warm-switch samples. These figures are tooling
conditions, not a passed hardware fluency target. Agent art/product review of the
actual opening, compact, walked-bank and six comparison frames found no new
blocking readability or matching defect. The dark Daiya daylight still, dark glass,
simplified vegetation, bright physical plaque and geometric shadow wedges remain
visible limitations; human realism acceptance remains open.

[Pages verification](../evidence/day-night-20261006/hosted-verification.json) confirms
commit `afea7b97d8a3e349d1b454de27d59aeb1dd6725b` serves all 38 exact tested files.
Package manifest SHA-256 is
`06bd6490029b8067c43a19dde5c957c467441fc829d5b00b91d2d21056938bef`;
browser report SHA-256 is
`cb2ef0c473ca29d93f22bb01702f6beba1f3f6ccd95e69bc5ceba70e18c5343d`.
The shared rig hash is
`29cc4209b243e3c069f3516cd0c236c68c0bcb0cb2526aa285f2fdd15caf1766`;
the six-image study hash is
`e2274732cff1a12fde5df1074cdf2dee2d00673c56e9bd1311b8935697c401e1`.
Full source and asset identities are in the [delivery evidence](../evidence/day-night-20261006/README.md).

The separate [GitHub CI run 37420468044](https://github.com/PaperStrange/TourGuideAI/actions/runs/37420468044)
completed successfully on 2026-10-06 at 06:19:13 UTC against `a176cf38…`, as
rechecked on 2026-10-07. Install, pure tests, build, packaged Chromium checks and
evidence upload all succeeded. Its result is separate from the complete local
130-pass report above; no uninspected CI artifact hash is claimed.
No redundant full local run was made after the frozen candidate passed.

The earlier five-check draft capture used rig `d5afc0ab…`; it is superseded by this
complete result. The final Cycles daylight correction removes a competing HDR sun
on non-glossy rays, and both modes use scene-linear OIDN denoising. Source HDRs
remain unchanged; [resource documentation](lighting-resources.md) records licenses,
processing and authored-versus-observed limits. No asset implies actual Kyoto
weather, time, occupancy or venue opening hours.

## Preceding expanded-street results · 2026-10-06

The [final browser report](../evidence/detail-study-20261006/browser/browser-result.json)
records **97 passing checks, zero failures**, 11 scenarios and 27 screenshot hashes.
It ran against source commit `6a532aa9a2ef0e9d4366ff8159f497f0843b737e` on
2026-10-06, **04:51:57–05:01:14 UTC**. The driver snapshots all built file bytes
before launching the browser; its report also records hashes of all three driver
modules. The [pure test output](../evidence/detail-study-20261006/unit-tests.tap)
records **22/22 passing**, and the separate
[repository report](../evidence/detail-study-20261006/repo-gates.json) records
**17/17 passing with no skips**.

| Frozen artifact | SHA-256 |
|---|---|
| Built-file manifest in browser report | `90f1e630c30f6094cff2ed17d6007658f156635f673c431ebf29bdefe9ec96e4` |
| Street GLB | `f4135e225f0575daca660c055a5fbdbc4ef3af31bd72736d1dbc806f07ff331c` |
| Matched-render manifest | `70db2117cae68ecb751a0f860009ccbcf2a2424b60dd2d0060d4cdb92c4b490f` |
| Browser report | `e2e117bcfed6b5cd59e627273f634d4a109e48cba767d04a2a624d394b7d0da0` |

The actual walk completed crossing → Mitsui → MUFG with distinct choices and
separate source-reading/visiting state. Camera-relative movement, drag-versus-walk,
real pavement/road picking, both facade bounds, EN/ZH modal focus/pause/resume,
saved notes, unsaved draft return, v1 migration and restart precedence passed.
Context-loss retry retained the journey. Opening sharing before the scene finished
loading retained pause and dialog focus. The
[western road probe](../evidence/detail-study-20261006/browser/western-asphalt-restored.png)
restored `(8,2.1)` and clicked the actual asphalt at `(9,2.1)`; the
[eastern camera probe](../evidence/detail-study-20261006/browser/eastern-context-occlusion-restored.png)
retained `(50,-2)` while hiding the contextual building containing the camera.
Both grounded the actor on the actual `.05` surface, and independent image review
found the actor visible. Expanded context does not expand the accepted walking
bounds or establish additional visitable entrances.

The sharing checks used this played journey, not only a completed-save fixture.
The [preview](../evidence/detail-study-20261006/browser/share-preview-zh.png) and
[fresh recipient](../evidence/detail-study-20261006/browser/shared-recipient-zh-mobile.png)
matched exactly. Selected saved notes appeared; unchecked notes and the unsaved
bank draft did not. The recipient required no WebGL or author storage and made no
journey-storage writes. Malformed, unsupported and oversized links showed localized
errors. The downloaded [PNG](../evidence/detail-study-20261006/browser/shared-recap-zh.png)
is 1080×3357 and includes the complete 500-character Chinese note, its final line,
Japanese names, choices and sources. The actual
[PDF](../evidence/detail-study-20261006/browser/shared-recap-zh.pdf) was inspected on
all four A4 pages; no content was lost. Its long-note case leaves a sparse title-only
first page because encounter blocks avoid page breaks, a remaining layout polish
issue. Clipboard transfer was real; native link/image handoff and cancellation used
observed API stubs. These do not establish an OS share sheet, actual delivery or
every device's PDF printer.

All three comparison views loaded the exact model and 1200×750/64-sample still
hashes. Camera matrices, field of view, aspect and actual mesh visibility matched
the manifest. A/B/side-by-side modes, EN/ZH, context-loss retry and the usable still
when WebGL is unavailable passed. The page did not alter the existing journey.
Missing manifest/image fixtures exposed localized recoverable errors. Normal
scenarios had no external requests, uncaught exceptions or console errors;
deliberate unavailable-WebGL and missing-asset fixtures produced only their
expected context-creation/404 diagnostics.

Independent QA/art review inspected the final
[opening](../evidence/detail-study-20261006/browser/opening-en.png),
[south arrival](../evidence/detail-study-20261006/browser/south-bank-approach.png),
[intersection comparison](../evidence/detail-study-20261006/browser/comparison-intersection-both-en.png),
[Mitsui comparison](../evidence/detail-study-20261006/browser/comparison-mitsui-frontage-both-en.png)
and [Daiya comparison](../evidence/detail-study-20261006/browser/comparison-daiya-frontage-both-en.png).
Asphalt is distinct from pavement, corner returns/context survive browser rendering,
and the two treatments retain the same composition and geometry. The live image
is brighter with flatter recess shading; Cycles gives stronger sill/column/contact
depth but darker under-canopy glazing/lettering and visible grain. Other remaining
limits are the bright canopy, repeated stylized foliage, broad asphalt mottling and
subtle actor contact shadow. At the
[wall-adjacent pose](../evidence/detail-study-20261006/browser/actor-near-facade.png),
a canopy post and edge partly obscure the actor's silhouette. No new compatibility
blocker was observed; this is not a realism or art-preference acceptance claim.

Conditions: Chromium 151, WebGL 2, ANGLE Vulkan SwiftShader, DPR 1, desktop
1440×1000 and 1280×720, recipient width 390px. The traced Mitsui-to-bank route took
144.608 seconds and advanced continuously through 79 rendered-frame increments.
The recorded game frame submitted 99 calls / 132,552 triangles, with 110 geometries
and 19 textures allocated; allocation counts are not memory bytes. These are
software-GPU observations, not hardware budgets or fluency acceptance. Headless
focus-loss testing injected a blur event; actual OS focus switching, representative
hardware, fresh-user discoverability, physical field use, recipient usability and
whole-trip immersion remain unverified. The bundle was served as packaged HTTP
resources with external requests denied; native `file://` launch was not tested.

### Separate CI status

[CI run 37415711959](https://github.com/PaperStrange/TourGuideAI/actions/runs/37415711959)
failed after 29 passing checks when the bank approach exceeded its 240,000ms
software-rendering allowance; the [failed-run log](../evidence/detail-study-20261006/ci-initial-timeout.log)
is retained separately. Its trace advanced continuously through the mapped
crossing to `(21.091,-17.619)` at 241,316ms; it does not show a stuck route. This is
classified as a tooling deadline failure, not a completed CI pass or a desktop
performance result. A workflow-only change raises the allowance to 600,000ms and
the job cap to 30 minutes. [Rerun 37416980474](https://github.com/PaperStrange/TourGuideAI/actions/runs/37416980474)
on workflow-only commit `2006b912ed3febf39b63a1902fd5c24db7e0749d` **succeeded**,
confirmed through the GitHub run status. Runtime, assets and assertions remained
unchanged for that rerun. The local 97-check report retains its own package hash;
no uninspected CI artifact hash is claimed. This success predates the new day/night
revision, which still requires its own validation.

The earlier focused sharing run passed 21/21 on a different preliminary package
(manifest `6071e73c17d0b7abc4034e3a45d752caba645129c4e03b50a0bbef8726c78b2b`).
Preliminary browser review exposed tiled carriageways, while the independent ground
audit found incomplete western coverage. Those results are superseded by the frozen
result above, not counted as final visual acceptance. The final full run needed no
source or driver edits.

## Behavioral evidence

| Contract | Meaningful observation |
|---|---|
| Camera-relative walking | Walk at distinct camera headings; compare world displacement with independently known camera axes. Release and focus loss stop movement. Camera changes never alter saved world coordinates by themselves. |
| Pointer intent | A drag changes the camera without queuing a walk. A pavement click reaches the corresponding ground point after camera rotation and resize. Picking must not imply an unsourced interior. |
| Collision and proximity | Approach the actual north/south facade boundaries; continued input cannot cross them. A stable nearby prompt identifies the same target opened by E or the contextual button. |
| Full encounter chain | Walk to the crossing, Mitsui and MUFG through visible UI and actual input. Open, read, choose, close and resume; retain distinct route choices. Opening or source reading alone never creates a visit. |
| Modal and locale | Movement pauses while the card is open. Repeated E opens once; closing does not immediately reopen. EN/ZH switching preserves position, open target, choices and keyboard focus. |
| Saved journeys | Load real v1 position/choice fixtures into the new application, reload the migrated save, and retain their meaning. A current v2 save takes precedence over older data. Invalid data recovers without fabricated visits. |
| Personal notes | A completed encounter accepts a bounded plain-text note. Unsaved drafts survive locale changes and closing/reopening; only explicit Save makes them persistent/exportable. Reload preserves saved text; exports escape it and keep its original language. Notes never become sourced facts or verification. |
| Player-derived output | Export only on the user's action. Different choices remain different in the notes; skipped stops are not planned route entries. Check a Chinese note at phone width and print layout. |
| Renderer and recovery | Inspect actual WebGL output at desktop sizes, including an actor near occluders. Check reduced motion and localized rendering failure without discarding saved progress. |
| Packaged delivery | Record artifact hashes, requests and browser errors. Exercise the shipped assets with external requests denied. Native local-file startup requires a browser environment that permits it. |

Adapt the old behavior checks to these contracts. Do not retain its orthographic
screen-to-world formula, cardinal-only input assumptions or road-edge pixel-color
assertion in a perspective renderer. A stable save comparison ignores the running
simulation clock and transient movement flags; it checks position and journey
meaning instead.

## Legacy fixture provenance

`tests/fixtures/legacy-v1-mid-journey.json` is the complete `before` save recorded by
the earlier `save-reload-position-progress-locale` browser check. It contains a
Chinese journey at `(22.241, 2.33)`, a crossing choice and Mitsui selected next.

`tests/fixtures/legacy-v1-completed.json` contains the game snapshot recorded by
`chinese-choice-retained`, wrapped with the Chinese locale and enabled hints from
that walkthrough. It preserves all three actual choices, including the skipped
station and cash stops. It is an explicit fixture assembled from recorded state,
not a claim that this exact complete JSON document was separately downloaded.

Both derive from first-playable HTML SHA-256
`237ce97bd3d9ff25b3b0667e75aafd7038fda70264c81d5f7b480af0b80902bc`
and browser evidence SHA-256
`f3821418048742b8639b6fb0dec2634c55bad7c6a8cac90016b027bc6ded5e66`.
The fixtures are self-contained; tests must not depend on the old project layout.

## Visual, performance and human review

Compare the actual rendered building materials, lighting and actor-scale views
with the intended direction, then inspect them during a complete interaction.
Record concrete problems such as floating feet, wrong shadows, unreadable signs,
camera jumps, label overlap and a hidden actor. A Blender reference image or
successful GLB import cannot pass this review.

Record GPU/driver, viewport, DPR and frame-sampling conditions. Software-rendered
cloud timings establish behavior on that executor only; they cannot establish
desktop GPU performance or fluent play. Hardware budgets remain provisional
until a representative device is named and exercised.

User review must separately judge the executed art and the feel of walking,
approaching, discovering and resuming. Fresh-user discoverability needs an
unbriefed participant. The new personal notes support a memory of this slice;
whole-day immersion, a completed trip memoir and sharing remain distinct product
outcomes until demonstrated.

## Historical results · 2026-10-05

The 16 pure tests pass on 2026-10-05. They cover camera-relative vectors, movement
quantization, collision, crossing navigation, pause/replay, legacy save meaning,
storage precedence and personal-note/export behavior. They caught a real migration
defect: missing v1 heading initially made every restored actor face east. The
runtime now derives its heading from the preserved legacy facing value.

The final [browser report](../evidence/browser/browser-result.json) records
**53 passing checks, zero failures**, four scenarios and 15 screenshot hashes.
It exercises actual movement, two surface heights, both facade bounds, the complete
crossing → Mitsui → MUFG sequence, bilingual modal/return behavior, notes, exports,
legacy migration, reset precedence and WebGL failure/retry. No external requests
or uncaught errors occurred. The deliberately unavailable-WebGL scenario produced
the expected Three.js context-creation diagnostic; normal and recovery scenarios
had no console errors. The [repository gate report](../evidence/repository-gates.json)
is separate from these browser checks.

| Frozen artifact | SHA-256 |
|---|---|
| Built-file manifest in browser report | `ebe2883e971a6e00cbb73cc3e171718e28d04998c3716f8c009b9ee5b292fe79` |
| Main JS `index-DHReIO-L.js` | `0d56797624e13406ab2605fb2fc835b8d4fd33eb2d46181882139c1964a12e29` |
| Street GLB | `68c2afa632505ddb6ae2a65d93c615403a476f4859885ca5860fbc3bfcd6980b` |
| Browser report | `4ad0fe0ff9b93a2219f5ff4d98e145d20fc0ad0179e8607644b81ec5cf21b26e` |

Conditions: Chromium 151.0.7922.173, ANGLE Vulkan SwiftShader, DPR 1, desktop
1440×1000 and 1280×720; exported notes also inspected at 390px and print layout.
The bank route took 183.091 seconds from Mitsui under this software renderer and
instrumentation. Its samples show continuous movement through the crossing and
79 rendered-frame increments; this is not a desktop fluency result. The final
observed scene frame reported 76 draw calls / 43,998 submitted triangles, with
77 geometries and 11 textures allocated. Allocation counts are not memory bytes.
The earlier 90-second timeout was superseded by this complete traced route.

Independent QA/art review inspected the actual [English opening](../evidence/browser/opening-en.png),
[Chinese opening](../evidence/browser/opening-zh.png),
[compact view](../evidence/browser/compact-zh.png),
[near-facade actor](../evidence/browser/actor-near-facade.png) and
[south-bank arrival](../evidence/browser/south-bank-approach.png).
The revised stone, punched windows and classical detail distinguish Mitsui from
the south facade's vertical ribs/tall glazing; the former ghost overlays are gone.
No blocking visual defect was found in these inspected views. Known polish limits:
very bright canopy/repeated seams, occasional slim-post overlap of the actor,
small mesh lettering, opaque glazing and a simplified actor contact shadow.
These observations do not replace the user's quality or immersion judgment.

The [Chinese saved note](../evidence/browser/saved-personal-note-zh.png),
[bank card](../evidence/browser/bank-card-zh.png) and
[played field-note export](../evidence/browser/played-field-notes-zh.html) preserve
the actual tested choices and escaped personal text. Whole-trip memoir/sharing,
unbriefed discoverability, physical field use and OS focus switching remain
unverified product outcomes.

## Run the checks

From the `experience` directory:

```sh
npm ci
npm test
npm run build
npm run test:browser -- dist
```

The declared Playwright dependency supplies the driver. Install its Chromium
browser with Playwright's supported installation command, or set
`EXPERIENCE_QA_CHROMIUM` to an existing compatible Chromium executable. When that
variable is unset, Playwright selects its own installed browser; no machine-specific
executable path is hardcoded.

- `EXPERIENCE_QA_OUTPUT`: evidence directory; defaults to `experience-qa` inside
  the operating system's temporary directory. CI can use `test-results/browser`.
- `EXPERIENCE_QA_TIMEOUT`: per-scenario waiting budget in milliseconds; default
  240,000. This is a tooling timeout, not a promised loading time or walking speed.
- `npm run test:browser -- dist --review`: limited opening/bank visual captures;
  the report explicitly states that the complete behavior suite was not run.
- `npm run test:browser -- dist --review --saved-bank`: fresh opening and a
  restored recorded bank save; this does not establish a newly walked route.
- `npm run test:browser -- dist --sharing`: focused sharing from restored progress
  with WebGL deliberately unavailable; no gameplay or art acceptance.
- `npm run test:browser -- dist --comparison`: comparison views, modes and failure
  fixtures only; no gameplay or sharing acceptance.

The runner snapshots the complete built directory and records each file hash.
Playwright serves those immutable bytes at a local HTTP origin and denies requests
outside the package, so no preview process is required. Local JS, CSS, fonts and
GLB requests are expected in this new distribution; the contract is zero external
dependencies, not the earlier single-document packaging claim. The user-facing
offline game requires a local HTTP launcher. Exported field notes remain standalone
HTML.

Production `?qa=1` exposes only observation: state, camera matrices, viewport and
renderer information. The tests use real keyboard/pointer/UI actions and do not
teleport the player. Ground clicks are calculated independently from observed
matrices at the authored pavement and road heights, then checked against the
actual arrival position. User memory text and saved data are tested through the
production interface as well as the pure functions.

This executor's headless Chromium keeps pages focused/visible when switching tabs.
The runner therefore labels focus-loss cleanup as an injected `blur` event while
a real movement key is held. It does not claim to establish actual OS-window or
tab switching. Rendering failure and context loss are likewise deliberate fault
injections; Retry must restore the saved journey through the visible interface.
