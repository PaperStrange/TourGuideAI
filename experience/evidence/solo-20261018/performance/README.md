# Q03 · Together language response

The acceptance target remains **each of three warm Together language actions
under 500 ms**. Both measurement sets miss that target. Q03 remains open P1.

The [before-resize observations](before-resize/result.json) bind package
`81e885e64a92adb6140d230e3819bc3ace119ff4475b50159bc56a5a88c5c268`.
An immutable in-memory copy of the actual build was served over local HTTP;
MapLibre style, tiles, glyphs and Tokyo search used real providers through the
managed proxy. TLS verification remained enabled. Chromium was
`151.0.7922.173`, viewport 1440×1000, DPR 1.

Each independent context completed a cold Together locale action, map readiness
and Tokyo search, then navigated to the same URL for the warm action. The metric
uses browser `performance.now()` immediately before Playwright's locale button
click through observed `document.documentElement.lang === 'zh'`. The three
primary observations ran without profiling. One separate profiled warm action
provides attribution. Local asset delivery differs from the earlier published
HTTPS observations; this before/after comparison uses local HTTP on
both sides. These cloud observations do not establish physical-device latency.

| Warm observation | Action, ms | Before input, ms | Input queue, ms | Handler, ms | Handler end to observation, ms | Event Timing duration, ms |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 1138.6 | 486.2 | 40.9 | 8.4 | 603.1 | 104 |
| 2 | 1155.3 | 519.8 | 41.2 | 5.8 | 588.5 | 96 |
| 3 | 1107.8 | 793.3 | 68.9 | 6.2 | 239.4 | 152 |

After the resize guard, package
`0a6244091b50c9ee7220d698e1109c86bd397dba54384c8db20e68bc57c728e7`
was measured with the same three cold-to-warm pairs, browser, viewport, proxy,
actual providers, local asset serving and action boundary. The capture ran from
13:37:38.524 to 13:37:55.042 UTC on 2026-10-18. The driver option omitted the
separate profiling observation; the primary action code remained unchanged.
The candidate also includes actual-pointer guidance updates, which introduce no
extra guidance update for an unchanged mouse input type.

| Warm observation after guard | Action, ms | Before input, ms | Input queue, ms | Handler, ms | Handler end to observation, ms | Event Timing duration, ms |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 1121.1 | 596.3 | 3.1 | 7.6 | 514.1 | 248 |
| 2 | 1221.9 | 651.3 | 217.2 | 7.1 | 346.3 | 296 |
| 3 | 1097.9 | 722.2 | 97.7 | 5.0 | 273.0 | 192 |

All six primary observations miss the target. Means are 1133.9 ms before and
1147.0 ms after; medians are 1138.6 and 1121.1 ms, with ranges of
1107.8–1155.3 and 1097.9–1221.9 ms. These observations establish no reliable
latency improvement. Each after-guard snapshot records zero map resize events
through the language action, confirming the unnecessary work was removed.
Map startup was still incomplete at those diagnostic snapshots, and subsequent
real readiness checks succeeded. No further runtime optimization is inferred.

Successful-run browser/provider error lists
contain zero entries. Full cold observations, search outcomes, provider responses
and resource timings remain in the raw result.

## Attribution

The separate profiled action measured 1110.4 ms, starting at page time 391.5 ms
and ending at 1501.9 ms. Its additional diagnostic read at 1582.5 ms lies outside
the metric. Input arrived at 956.0 ms; processing started at 958.6 ms and ended
at 970.8 ms. The application handler occupied 12.2 ms under profiling.

Within that exact interval, renderer-main `Commit` events occupy 696.6 ms wall
time across 12 events, with 31.1 ms recorded thread CPU. MapLibre animation-frame
callbacks occupy 120.0 ms wall time / 69.9 ms thread CPU. These nested categories
overlap and must not be summed. CPU samples identify MapLibre glyph/tile setup,
shader-program initialization and frame scheduling; 790.9 ms of sampled wall
time is attributed to native `(program)` frames. This supports rendering/commit
scheduling as a bottleneck in this environment. Every native wait cannot be
assigned to a particular GPU operation. Browser/automation scheduling remains
part of the before-input and after-handler intervals.

The trace also records an avoidable application operation:
`applyCopy → updateMode → showPreview → worldMap.resize()` on locale changes.
Installed MapLibre 6.14.0 `src/ui/map.ts:1602–1659` always resizes its
canvas/renderer and fires movement events, including when dimensions are
unchanged. The application then invalidates map readiness until idle. The
dimension/DPR guard skips that work when the viewport is unchanged. The repeated
observations confirm zero resize events while the latency target remains missed;
visual assets remain unchanged by this correction.

## Retained evidence

- [Raw observations](before-resize/result.json): package and driver hashes,
  unchanged action measurements, Performance timeline and provider results.
- [Chrome trace](before-resize/trace.json): events and action/input marks.
- [CPU profile](before-resize/cpu-profile.json): sampled renderer-main calls.
- [Calculated attribution](before-resize/analysis.json): exact range boundaries,
  clipped event durations and sample call chains. Category totals overlap.
- [After-guard observations](after-resize/result.json): all three repetitions,
  package identity, actual providers and zero-resize diagnostics.
- [Original capture driver](capture-driver-profiled.txt): byte-identical to the
  source hash in the before-guard report.
- [Repeated-capture driver](capture-driver.txt): byte-identical to the source
  hash in the after-guard report; adds the optional `PERF_PROFILE=0` selection.
- [Analysis driver](analysis-driver.txt): attribution calculations retained as
  reviewable text.

The capture followed the action sequence in
[homepage-performance.mjs](../../../tools/homepage-performance.mjs), with a
separate CDP profile and local immutable HTTP serving. The raw result records the
capture driver's hash and complete measurement conditions. To execute a retained
driver, save its exact text as `artifacts/q03-attribution.mjs` in a checked-out
repository with installed `experience` dependencies and the matching
`experience/dist`. It resolves the repository from that location and imports
`../experience/node_modules/playwright/index.mjs`. Run
`PERF_PROFILE=0 PERF_OUTPUT=artifacts/q03-after node artifacts/q03-attribution.mjs`
for the three repeated pairs; omit `PERF_PROFILE` for the original profile plus
three pairs. Use the managed Chromium installation at `/usr/bin/chromium`, the
inherited proxy/CA trust, writable `/home/agent/.pki`, and a short repository-local
output path for Chromium's Unix socket. The driver sets its own repository-local
TMPDIR. It never disables TLS verification. The analysis driver expects
`artifacts/q03-trace/` beside `artifacts/q03-analyze.mjs`.

Failed environment
setup attempts are excluded from this release evidence; they produced no warm
measurement series. All browsers and the local service were closed before QA
resumed its browser window.
