# Playable 3D revision · independent validation

Owner: QA. Status: **test preparation; the new playable build has not been validated**.
This record will identify the exact production artifact and evidence after the
browser run. Earlier 2D and Blender-proof results are baselines, not passes for
this application.

The focused revision must preserve the three sourced encounters while adding
guided 3D navigation, more convincing executed art, and a small personal record
of the journey. A browser check cannot establish human immersion, accepted visual
quality, a real entrance, or a successful Kyoto field walk.

## Planned behavioral evidence

| Contract | Meaningful observation |
|---|---|
| Camera-relative walking | Walk at distinct camera headings; compare world displacement with independently known camera axes. Release and focus loss stop movement. Camera changes never alter saved world coordinates by themselves. |
| Pointer intent | A drag changes the camera without queuing a walk. A pavement click reaches the corresponding ground point after camera rotation and resize. Picking must not imply an unsourced interior. |
| Collision and proximity | Approach the actual north/south facade boundaries; continued input cannot cross them. A stable nearby prompt identifies the same target opened by E or the contextual button. |
| Full encounter chain | Walk to the crossing, Mitsui and MUFG through visible UI and actual input. Open, read, choose, close and resume; retain distinct route choices. Opening or source reading alone never creates a visit. |
| Modal and locale | Movement pauses while the card is open. Repeated E opens once; closing does not immediately reopen. EN/ZH switching preserves position, open target, choices and keyboard focus. |
| Saved journeys | Load real v1 position/choice fixtures into the new application, reload the migrated save, and retain their meaning. A current v2 save takes precedence over older data. Invalid data recovers without fabricated visits. |
| Personal notes | A completed encounter accepts a bounded plain-text note. Reload and locale changes preserve it; exported text is escaped and keeps its original language. Notes never become sourced facts or verification. |
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

Pending a frozen playable build and independent browser run. No pass count,
hardware guarantee, human acceptance or release approval is claimed here.
