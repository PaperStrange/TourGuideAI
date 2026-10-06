# Playable 3D revision · independent validation

Owner: QA. Current status, 2026-10-06: **the user accepts fluency and guidance
for the Pages build they played; building/street realism is not accepted**.
The subsequent expanded-street/comparison/sharing revision is under validation;
the baseline's acceptance does not automatically extend to those changes.
The historical 2026-10-05 evidence remains **53/53 packaged-browser checks and
16/16 pure tests passing**. Representative-device coverage remains unestablished.
The production browser run completed on 2026-10-05, 06:53:03–07:03:45 UTC.
Earlier 2D and Blender-proof results are baselines, not passes for this application.

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

Implementation and QA preparation are in progress; no new visual/sharing pass is
claimed. The scope is a matched real-time/Cycles comparison plus in-app preview,
recipient link, native sharing where available, PNG and print/PDF-reader outputs.
Reuse the existing runner and tests; historical evidence stays immutable.

| Review point | Evidence and observable failure |
|---|---|
| Reality comparison | Compare the current and revised **browser-rendered** street at matched opening, crossing and north/south approach views against the cited real-place references. Judge facade proportions, material/light response, street detail and recognizable place identity at actual playing size. More props or a Blender beauty image cannot establish success. The user must confirm that the buildings and street now represent the intended reality; record remaining authored approximations. |
| Preserve accepted play | Walk the same three encounters with EN and ZH controls after the rendering changes. A hidden actor, unstable prompt, changed collision/ground picking, camera obstruction or lost choice/note is a regression. Record device/browser and moving-scene timings on the device reviewed; software-GPU timings alone cannot preserve the user's fluency acceptance. Reuse the relevant existing checks rather than duplicating the entire suite for each art edit. |
| Matched treatment comparison | Verify the same expanded geometry, camera position/target, vertical field of view, aspect and hidden groups from the comparison manifest. Inspect real-time output and the supplied Cycles still at their intended uncropped aspect in A/B and side-by-side modes. Check EN/ZH, local asset loading, usable still-image fallback when WebGL is unavailable and visible failure for a missing manifest/image. A successful import or matching camera alone cannot establish preferred art quality. |
| Preview before sharing | Create an in-app preview from an actual played journey. It must retain the selected choices, distinguish skipped stops, and include only saved personal notes explicitly selected for sharing; unsaved drafts and unchecked notes stay absent. Returning to the walk preserves position, progress and notes. Compare the preview with the recipient content and each selected output. |
| Recipient handoff | Copy a link and open it in a separate browser context without the author's storage/session. The recipient must read the same choices, selected personal content, sources and EN/ZH text without WebGL or journey-storage writes. Malformed, unsupported-version and oversized fragments must show a usable error rather than a partial or fabricated recap. Untrusted text must remain text. |
| Multiple outputs | Verify PNG signature, decodable dimensions and visible recap content; verify the print reader's content and print layout separately from link delivery. Native-share payload and cancellation can be exercised with a browser-API stub, but the device share sheet requires a supported-device check. Do not claim that browser print-layout inspection establishes every OS PDF printer or that copying a link publishes server-side content. |

The new recap/storage/simulation suite currently passes **22/22 pure tests**.
A focused restored-journey sharing run passed **21/21 browser checks** on
2026-10-06, with WebGL deliberately unavailable. It exercised the actual clipboard,
a fresh recipient context, a 500-character Chinese selected note, unchecked-note
exclusion, PNG download/decode, Chromium PDF, localized invalid links and native
handoff/cancellation stubs. It did not walk the expanded scene or exercise an
unsaved draft created in gameplay. Its package-manifest hash is
`6071e73c17d0b7abc4034e3a45d752caba645129c4e03b50a0bbef8726c78b2b`;
temporary evidence is `/workspace/scratch/experience-qa/sharing-20261006/`.
Subsequent startup-race, native-unavailable, western-ground and comparison checks
are prepared for the final frozen package; they are not yet passes.

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
