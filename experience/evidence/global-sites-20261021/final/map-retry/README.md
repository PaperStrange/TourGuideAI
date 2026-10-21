# Map style retry verification

The retry adapter releases the current style with MapLibre's public
`setStyle(null)` before loading the prepared provider style. Camera position,
markers, pending places and route order remain in the existing map adapter.

MapLibre 6.14 `src/ui/map.ts` lines 2737–2743 defers a `transformStyle` update
until the previous style emits `style.load` when that style is still unloaded.
`src/style/style.ts` lines 452–479 emits an error after a denied initial request.
The retained [before report](before.json) reproduces one denied style request,
followed by Retry entering loading state without sending a second request.
The original complete CI failure remains in [solo-result.json](../../ci/initial/solo-result.json).

The [after report](after.json) records **18/18 passing checks** against immutable
package `3e72aa1c53596042a14d1fb2aae9556b0a2caa876be93d424ec9ebe2aebb0162`:

- Initial style denial and recovery in English and Chinese.
- Loaded style with denied vector tiles, followed by recovery.
- A second actual provider style request, a ready map and two visible marker elements.
- Preserved camera, selected places, ordered route and byte-identical private data.
- Exact saved-camera reopening and locale switching after recovery.
- No browser page exceptions.

The baseline package is
`63f813639c87a260855d68b52222fc0dda4134668808132f85f7b7a4a7cb706f`.
Both runs use Chromium 151.0.7922.173, viewport 1440×1000, DPR 1 and reduced motion.
Built assets are served from an immutable in-memory local HTTP snapshot. Provider
requests remain real, except for the explicitly denied requests; TLS verification
and the inherited proxy remain enabled. The saved view is an actual record from
the retained CI report. These checks establish recovery behavior, not physical
device performance or visual quality.

The byte-identical [capture driver](capture-driver.mjs.txt) originally lived at
`artifacts/style-retry-probe.mjs` and resolves installed Playwright and
`experience/dist` relative to that location. Its original input-report path was
`experience/evidence/global-sites-20261021/ci/solo-result.json`; that report is now
retained under `ci/initial/solo-result.json`. These are the recorded invocations,
each run while `experience/dist` contained its corresponding package above:

```sh
MAP_RETRY_BASELINE=1 MAP_RETRY_OUTPUT=artifacts/style-retry-before node artifacts/style-retry-probe.mjs
MAP_RETRY_OUTPUT=artifacts/style-retry-after node artifacts/style-retry-probe.mjs
```

`MAP_RETRY_BASELINE` selects the observation procedure, not the application bytes.
Replaying the archived probe requires the corresponding retained build and a
working copy of the driver with the input-report path updated. Record the changed
driver hash and write new outputs separately. The maintained complete regression
is `npm run test:solo -- dist` from `experience`; its final CI report verifies the
same initial-style retry and exact saved-camera return.

The baseline observes request dispatch for five seconds; the original CI report
also preserves its full timeout. Successful candidate recovery waits for actual
provider readiness and exact saved-view reopening. The original CI assertions and
timeouts are unchanged. Browser processes are closed after each report.
