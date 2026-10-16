# Published performance comparison — 2026-10-16

The final startup correction removes the duplicate initial street draw. The original warm Together language-action target remains unmet, so Q03 remains open at P1. These measurements do not establish an overall improvement in 3D preview latency or physical-device frame rate.

## Evidence and conditions

| Report | UTC interval | Report SHA-256 |
| --- | --- | --- |
| [Original baseline](baseline.json) | 03:18:26.753–03:20:04.370 | `4f06b9a0a895568325faec32e9b360ae26ec5084ace0c8c2acd9534bcace739f` |
| [First published candidate](first-published.json) | 04:23:35.144–04:25:05.608 | `d155c1745e91f9c62a90147ad6a309a4c127a4245f5eeaf7933e8bc8208d2f0f` |
| [Final startup correction](final.json) | 04:37:20.353–04:38:41.066 | `d89100a34266659e0dbdcc0a9f48e01404106402402b0fc1fb31f1b02dd068da` |

Each report retains all 12 observations: three repetitions of Explore/Together, each with a fresh-context cold visit and same-context warm visit. All use Chromium 151.0.7922.173, 1440 × 1000, DPR 1, the inherited proxy and TLS verification, actual published assets and provider requests, and no network interception or throttling. The final reports identify SwiftShader software rendering. Other browser and network verification was paused during each timing window. The root's brief repository gate check ended at 04:39:44 UTC, after the final timing window.

All 12 final observations returned the expected HTML hash `86693c3539c8be3b2c947d8b25be8eea087eb53a515cb379a3a898ea9c0095e3`, with no page exceptions, failed requests or aborted observations. The expected unavailable Pages `/api/health` response remains recorded; this timing run does not demonstrate a hosted collaboration service.

The original producer hash is retained in `baseline.json`. The two later reports use tracked driver SHA-256 `15d131cf48aaad8394f22951cae382938eae04e7c80c005133a38ef3ed5bc3ff`. Its instrumentation additions are WebGL identification, the hidden update counter and search completion through `aria-busy` when available; the original disabled-button check remains for earlier builds. Action timestamps, query, cache sequence and readiness waits are unchanged. See [measurement instructions](../../../tools/performance.md).

## Unchanged target disposition

| Target | Baseline | First candidate | Final | Disposition |
| --- | --- | --- | --- | --- |
| Together initial detailed-street decoded bytes = 0 | 672,579 in each of six visits | 0 in all six | 0 in all six | Pass |
| Hidden street update and draw deltas = 0 over 2 s | Draw delta 0; update counter unavailable | Both 0 in all six | Both 0 in all six | Pass; no invented baseline update count |
| Ready follows an actual initial draw | One observed draw in all six Explore visits | Two observed draws in all six | One observed draw in all six | Pass; duplicate startup draw corrected |
| Every warm Together language action < 500 ms | 890.8 / 1,261.6 / 946.5 ms | 1,140.0 / 937.4 / 1,060.3 ms | **1,177.8 / 1,113.4 / 1,134.5 ms** | **Fail, Q03 open P1** |

Detailed-street bytes include `lighting-*.js`, `create-game-*.js`, `live-view-*.js`, GLB and HDR assets; MapLibre is separate. Final hidden samples also recorded zero script time, with 1.54–3.18 ms of total browser task time over each two-second window. Art geometry, textures and lighting resources were preserved.

The language-action metric starts immediately before Playwright dispatches the click and ends when Chinese document language is observed. It includes automation/frame scheduling. For the three final warm Together clicks, actual handler times were 6.9 / 5.8 / 5.2 ms, input queues were 1.9 / 65.1 / 73.0 ms, and Event Timing durations were 112 / 152 / 144 ms. These narrower observations help locate the delay but do not replace the failed end-to-end target or prove that all remaining delay belongs to one subsystem.

## Matched timing results

Values below are medians of three observations in milliseconds; every individual result remains in the JSON reports. Shell means navigation to an observed visible mode control. Preview means navigation to observed street/map readiness **after the two preceding language actions**; it is not isolated GPU rendering time.

| Mode / cache | Shell baseline → final | Preview baseline → first candidate → final |
| --- | --- | --- |
| Explore / cold | 476.8 → 417.2 | 5,093.9 → 7,284.3 → 5,409.5 |
| Explore / warm | 146.7 → 146.6 | 3,993.1 → 6,243.3 → 4,461.5 |
| Together / cold | 535.2 → 390.4 | 2,089.9 → 2,379.3 → 2,553.1 |
| Together / warm | 293.7 → 309.2 | 2,024.0 → 1,636.3 → 1,691.5 |

The final warm Explore observations were 4,350.4 / 4,809.9 / 4,461.5 ms, down from the first candidate's 6,712.9 / 6,243.3 / 6,093.1 ms. The original baseline remains faster at 3,880.4 / 3,993.1 / 4,068.9 ms. Final cold Explore observations were 5,908.9 / 5,164.4 / 5,409.5 ms. The duplicate-draw correction is supported by source inspection, the actual draw counts and the focused interaction probe; remaining timing differences are not assigned a cause without further evidence.

Final cold Tokyo search completion was 1,068.0 / 776.4 / 315.1 ms after Explore and 1,084.5 / 339.3 / 308.5 ms after Together. Provider response and cache variability prevent attributing these differences wholly to application changes. A successful driver exit means observations completed without runtime errors; it does not mean every latency target passed.

## Final runtime review

Read-only review of `82994b8..828a405` found no material regression concern in the runtime delta. The only runtime change is in `src/runtime/create-game.js`: it enables the camera immediately before the first actual draw, removes the later duplicate enable, makes unchanged pause state a no-op, and avoids invalidating WebGL for the canvas ARIA label. Readiness still follows drawing, pause transitions still clear movement and update controls, and current callers do not use repeated same-state pause calls as a movement-cancel command. The canvas locale function has no in-scene visual text to redraw.

This conclusion combines source/caller review with the existing focused eight-check startup evidence; it does not claim exhaustive race or device coverage. No additional tests or source changes were introduced during this review.
