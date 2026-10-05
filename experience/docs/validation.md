# Playable 3D revision · independent validation

Owner: QA. Status: **53/53 packaged-browser checks and 16/16 pure tests pass;
human art/interaction and representative-device acceptance remain pending**.
The production browser run completed on 2026-10-05, 06:53:03–07:03:45 UTC.
Earlier 2D and Blender-proof results are baselines, not passes for this application.

The focused revision must preserve the three sourced encounters while adding
guided 3D navigation, more convincing executed art, and a small personal record
of the journey. A browser check cannot establish human immersion, accepted visual
quality, a real entrance, or a successful Kyoto field walk.

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

## Results

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
