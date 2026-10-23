# Candidate 2 focused verification

The frozen 299-file package `f27fbe22db95a007010d2d46a661f27752a2361f5d9d84aaa4e4588c498e0dc5` ran from `artifacts/neighborhood-20261023/candidate-2`, on source `88af351d9662a191762442022c21a0831e1b2feb`. Its scenery manifest is `90c0873c5e540147630c970d4a2ea692c1583b3c407c175a2659d4e1e93934c8`.

The run completed in 801.991 seconds with **67 passing and two failing checks**. The exact [report](../../art/candidate-2/browser-result.json.gz) has decoded SHA256 `731fd628b48a76cf4411d47636e79a6c0f76975237a32f63a84f5951ae75a1d7`. The exact [executed driver](browser-neighborhood.mjs.gz) has decoded SHA256 `106b11626a5b6909b1c5ace62bf1ab9f26653842914bab492a23215098d8501c`. Both files retain their original bytes. The report records all packaged hashes, inputs, native events, rendered matrices, requests, responses, source-view provenance and observations.

The two failures are stationary canvas clicks during Look closer, in normal and reduced motion. A missed detail selection continued into ground navigation and moved the traveler. The captured desired orbit/tilt/distance remained unchanged and `inspectionAimed` stayed false. The accepted interaction requires a missed inspection click to remain stationary; these failures require a separate corrected build and verification.

The passing scope includes actual walking from the previously visited approach into Nishiki Market, ordinary and below-roof camera limits, genuine source-surface inspection, visible-pose camera adjustment, rendered-direction ArrowUp/ArrowRight, native wheel/drag/keyboard inputs, ignored horizontal middle drag and three-finger movement, both motion settings, and hidden inactivity with retained night/pose on return. Restored fixtures use previously observed actual-walk poses and explicitly reconstructed public session records.

Gzip transport checks verify encoded size/hash, decompressed size/hash and exact logical bytes. Bridge resources stay unloaded at the original starting location. Bridge, Takase and Pontochō load actual `.gltf.gz`/`.bin.gz` responses without fetching their unencoded logical geometry paths.

| Retained actual view | Primary calls, day/night | Primary triangles, day/night | Declared allocated texture bytes, day/night |
| --- | ---: | ---: | ---: |
| Shijo Bridge | 74 / 74 | 46,897 / 46,897 | 46,159,188 / 54,023,508 |
| Takase River | 78 / 78 | 61,996 / 61,996 | 46,159,188 / 54,023,508 |
| Pontochō entrance | 82 / 82 | 53,183 / 53,183 | 46,159,188 / 54,023,508 |

Each primary measurement uses a new actual frame at the same stopped pose with unchanged shadow invalidation count and no pending shadow updates. Ordinary screenshot render totals can include shadow passes. The complete texture estimate includes shared images, actor/contact textures, cached PMREM/workspace and allocated shadow targets; driver padding, canvas/compositor, geometry and temporary conversion peaks remain excluded.

The driver used Chromium 151.0.7922.34, 1440×1000 desktop contexts, the existing proxy and certificate trust, and native browser input. Gesture scenarios explicitly used a touch-capable desktop context. No physical-device or human enjoyment result is inferred.

Reproduction uses `EXPERIENCE_QA_ONLY=arcade-regression,bridge-review,arcade-inspection,recovered-keyboard,recovered-camera-input` with the retained driver at `experience/tests/browser-neighborhood.mjs`, the immutable candidate2 build, an explicit output directory, and `TMPDIR` under repository artifacts. Raw report and 36 captures remain in `artifacts/neighborhood-20261023/qa/candidate-2-focused/`. Selected portable art views and their independent disposition are [recorded separately](../../art/candidate-2/README.md). This focused run supplements the full-route evidence; final corrected-package traversal remains a separate gate.
