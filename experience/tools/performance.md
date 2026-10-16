# Homepage performance measurement

Run with the app's installed Playwright dependency and an available Chromium executable:

```sh
node experience/tools/homepage-performance.mjs
```

The driver resolves paths from its own location. `PERF_URL` selects the page, `PERF_RUNS` selects repetitions, `PERF_OUTPUT` selects the report directory, and `EXPERIENCE_QA_CHROMIUM` selects Chromium. Relative output paths resolve against the repository. The default output is `artifacts/performance-final/result.json`.

The default run visits the published GitHub Pages homepage three times in each mode. Each repetition uses a fresh browser context for a cold visit and the same context for a warm visit. Viewport is 1440 × 1000 at DPR 1. Requests use the inherited proxy with TLS verification. Providers receive actual requests. The driver does not intercept requests, throttle the network, or clear a warm context's cache.

| Measurement | Start and observation |
| --- | --- |
| Shell | Navigation start → visible mode control after DOMContentLoaded |
| Language action | Browser timestamp immediately before Playwright clicks Chinese → document language observed as Chinese |
| Preview | Navigation start → scene ready or map ready observed through the read-only diagnostic API |
| Search | Browser timestamp immediately before submitting Tokyo → form completion signal observed; results and status retained |
| Hidden street work | After switching to Together and allowing 1.5 seconds to settle, compare render/update counters and browser CPU metrics over 2 seconds |

Action measurements include automation dispatch and scheduling. Preview observation includes preceding language actions. ResourceTiming entries retain response sizes and durations; the decoded sizes of `lighting-*.js`, `create-game-*.js`, `live-view-*.js`, models and HDR files describe detailed-street downloads. MapLibre remains a separate map dependency. Each result records its driver hash, HTML response hash, browser version, provider failures and individual runs. Cloud software rendering cannot establish physical-device frame rates.

The original October 16 baseline records producer hash `99681f5ebe84b79185e7bda18dc3596b64c350437574ed9b14890b23fc2c0f95`. The final driver adds three observations: WebGL renderer identification, the hidden street update counter, and search completion through `aria-busy` when present. The original search button became enabled during pending replacement searches, so its disabled state no longer identifies completion. The revised completion check retains the original disabled-button check for earlier builds. The action timestamps, waits, viewport, cache sequence and provider query stay equivalent. The baseline did not record an update counter; its hidden-scene evidence contains rendered-frame and CPU deltas only.

## Partial map failure and recovery

```sh
node experience/tools/map-failure-probe.mjs
```

This probe snapshots `experience/dist`, serves those immutable bytes on an ephemeral loopback port, and deliberately aborts one actual OpenFreeMap raster tile request. Other provider requests proceed normally. It checks that the map retains its error and Retry control, that language switching preserves the failed view, and that Retry recovers through the actual provider while preserving camera position and places. It performs no room writes. `MAP_PROBE_DIST` and `MAP_PROBE_OUTPUT` override the input and output paths; the default report is `artifacts/map-failure/result.json`.

Both drivers exit unsuccessfully when their required observations fail. Reports retain the evidence and errors for diagnosis. Schedule these browser runs separately from other rendering checks to keep shared cloud GPU contention out of timing comparisons.

## Initial street drawing

```sh
node experience/tools/startup-probe.mjs
```

This focused check serves an immutable build with an isolated local room service. Actual keyboard and homepage controls verify one initial draw before readiness, walking, language accessibility, rendered night lighting, paused hidden work and resumed walking. `STARTUP_PROBE_DIST` selects the build and `STARTUP_PROBE_OUTPUT` selects its report directory, defaulting to `artifacts/startup-probe`. This local check verifies rendering and interaction behavior; the published performance driver supplies network timing evidence.
