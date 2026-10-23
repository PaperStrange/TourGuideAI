# Candidate 1 bounded browser verification

All three runs served the same immutable 293-file package, `df711b7d06a0a921545cc82de1ffe3b26dec28a8dc3a86684d837fcdd5e1127c`, from `artifacts/neighborhood-20261023/candidate-1`. Its neighborhood manifest is `add6e399dcebca96cec9daf9e413f1374b6561ca48272b982914a1d6075f961c`. Source and the first driver are committed in `ce2a59a`. No package rebuild occurred during these runs.

| Scope | Passed | Failed | Elapsed | Original report SHA256 |
| --- | ---: | ---: | ---: | --- |
| Recovery, native storage conflicts, desktop/compact residency | 28 | 0 | 212.015 s | `a6dafe86430dbad5c2d3fe96bedcbb0765b62d3c6d467cd9c5f9d175e5f6f8ea` |
| Actual arcade approach/interior and retained bridge view | 10 | 2 | 222.842 s | `ca9b5c023d31a7f7a049b9ff3018bc38874cc7eac1df52eb7934546a40935e71` |
| Deliberate interior framing and source-surface selection | 4 | 0 | 61.613 s | `3996ed13655ab8ea953ab13d0a6e304624aba20fa0541bc00e504b83235f8916` |

The corresponding exact reports are retained as [controls-result.json.gz](controls-result.json.gz), [arcade-result.json.gz](arcade-result.json.gz), and [inspection-result.json.gz](inspection-result.json.gz). Decompression yields the original report bytes and the hashes above. Each report retains every packaged file hash, its browser conditions, actual requests, observations and driver identity. The first two runs used driver SHA256 `83d1ef3384b754d246ce200ee927c6391f70d8d237bd487ee941c7958fab5e35`; the focused inspection used `a2cc60fd01f3fe38510daab4056133d98e1c04ccaf9cfad739717038d2618628`. Exact driver source is retained in [controls-arcade-driver.mjs.gz](controls-arcade-driver.mjs.gz) and [inspection-driver.mjs.gz](inspection-driver.mjs.gz).

## Observed behavior

- A genuinely denied required base asset remains failed through language switching and 1.5 seconds without another required-base request. Explicit Retry loads the real asset, clears the error and preserves itinerary order.
- A future-revision native record survives pagehide/reload and locale changes byte-for-byte until explicit replacement. A second same-origin page updates a current-revision record during a real 15-second held ground request. Late scene completion and actual camera input preserve the newer bytes. Reload saved walk adopts its order and night setting.
- Actual forward/return ground clicks cross the prior failing residency boundary. Desktop recorded 215 frame samples, including 112 attaching samples; attached near cells plus reservations never exceeded three. Compact recorded 182 samples, including 44 attaching samples; the total never exceeded one. A held real near response establishes an observable reservation before release. Settled near sets change across the boundary and desired quality returns.
- Actual walking reaches the same interior position as the earlier camera blocker: `(287.127, 140.015)`. Independent projection through the rendered matrices gives a camera distance of 6.122025 m, actor vertical occupancy of 27.7918%, and feet/head inside the viewport. Camera height is 3.876927 m, below the 4.65 m soffit. Opening Look closer preserves the rendered composition and requested saved view.
- The two preserved failures are fixed eight-point scans that found no selectable surface in the ordinary Market/interior framing. The separate deliberate-input run used `J` 22 times, `=` 16 times and `K` eight times, then pointed at 25% of canvas width and 8% of height. It selected `shijo-east:nishiki-market` in `cell-e002-n001`, at world position `(295.269, 141.357, 4.605)` without moving the player. Generic building faces did not receive a Market identity. [The selected-feature page](inspection-selected-east-below-soffit.png) shows the actual result.
- The exact view saved after the prior full CI walk to Shijo Bridge was restored and captured in both light modes. Its finite far-water cutoff remains an art finding for the next candidate.

## Reproduction and boundaries

Run from `experience/` using the appropriate retained driver source at `tests/browser-neighborhood.mjs`, the retained immutable build path, `TMPDIR` under the repository, and the installed Chromium 151.0.7922.34. `EXPERIENCE_QA_ONLY` values were respectively `initial-recovery,unavailable-revision,external-session,residency-boundary`, `arcade-regression,bridge-review`, and `arcade-inspection`. Each run used an explicit output directory and the existing proxy/CA trust configuration. No TLS verification was disabled.

The residency fixtures bind the original full-walk report and reuse its genuinely visited coordinates, with an explicitly recorded opening camera. The arcade approach/interior and bridge fixtures retain exact prior actual views; their session wrappers are transparently reconstructed through the public helper. These bounded runs supplement [the completed full-route CI evidence](../../ci/README.md); they do not replace a full final-package traversal.

The uncompressed reports and complete screenshots remain in `artifacts/neighborhood-20261023/qa/candidate-1-{controls,arcade,inspection}/`. Portable ordinary, below-roof and bridge canvases are in [the art evidence](../../art/candidate-1/README.md). Candidate 1's subsequent keyboard-orientation and first-adjustment continuity changes require separate build-bound evidence. Browser automation and software-rendered frames do not establish physical-device fluency, perceived realism, or human enjoyment.
