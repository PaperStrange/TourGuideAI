# Neighborhood performance protocol

Run only after the exact neighborhood build passes startup and visual review, in
an exclusive browser/GPU window agreed with the lead and QA. Every result binds
its executing driver and captured package bytes.

```sh
node experience/tools/neighborhood-performance.mjs experience/dist
```

Paths resolve from the repository. `NEIGHBORHOOD_PERF_OUTPUT` selects an ignored
directory beneath `artifacts`; its default is `artifacts/neighborhood-performance`.
`EXPERIENCE_QA_CHROMIUM` selects Chromium, defaulting to `/usr/bin/chromium`.
The tool sets `TMPDIR` to the short `artifacts/tmp` directory. Keep the existing
proxy and CA configuration; TLS verification remains enabled. `--help` describes
the invocation without starting a browser.

Use `--headed` with an available graphical display for the background-tab check:

```sh
node experience/tools/neighborhood-performance.mjs experience/dist --headed
```

A desktop display or explicitly provisioned Xvfb display is required for headed
Chromium. Record that display condition with the result. The default remains
headless. A browser that keeps both tabs visible produces a failed, unobserved
hidden-work check; the other measurements and final resource checks remain in the
report. The tool does not override visibility properties or change rendering
quality. A missing display causes browser startup to fail.

## Optional Mesa software diagnostic

The default launch and all measurement boundaries and thresholds remain unchanged.
An explicit option selects the separately labelled software-renderer diagnostic:

```sh
NEIGHBORHOOD_PERF_OUTPUT=artifacts/neighborhood-performance-mesa \
  node experience/tools/neighborhood-performance.mjs experience/dist --graphics=mesa-software
```

This option uses headless Chromium with `--enable-gpu --use-gl=angle
--use-angle=gl-egl --ozone-platform=headless --ignore-gpu-blocklist`, retaining the
existing `--no-sandbox` environment launch argument. It sets
`EGL_PLATFORM=surfaceless`, `LIBGL_ALWAYS_SOFTWARE=true`, and
`GALLIUM_DRIVER=llvmpipe`. Mesa's shader cache is inside the selected output
directory; Chromium temporary files remain under `artifacts/tmp`. All other
environment values, including proxy and CA settings, are inherited. TLS checks
remain enabled. The required Mesa EGL/llvmpipe libraries must already be installed.
Combining this option with `--headed` is rejected.

Chromium 151.0.7922.173's
[software-renderer blocklist](https://github.com/chromium/chromium/blob/151.0.7922.173/gpu/config/software_rendering_list.json)
entry 3 disables GPU features for Linux renderers matching `llvmpipe`. The explicit
[documented switch](https://github.com/chromium/chromium/blob/151.0.7922.173/gpu/config/gpu_switches.cc)
bypasses that compatibility decision for this diagnostic. It does not establish
physical GPU performance or resolve native background-tab visibility.

Each entry records the application's actual WebGL renderer and context attributes.
The diagnostic rejects a renderer without `llvmpipe`, a SwiftShader fallback, or
changes to `alpha:true`, `antialias:true`, `depth:true`,
`premultipliedAlpha:true`, `preserveDrawingBuffer:false`, or
`powerPreference:high-performance`. The application creates its own context;
the driver does not replace it. The report also records launch arguments,
explicit environment overrides, browser version and CDP `SystemInfo.getInfo`.
After all timing and hidden-state observations, it captures the actual final
canvas with its camera/state and image hash for visual review.

Keep the original default-renderer reports and failed capability probes. Compare
these results as distinct software configurations on the same immutable build,
viewport, quality, network approximation and input protocol. Passing a software
diagnostic does not close a physical-device acceptance gate.

The tool reads the actual build into an immutable HTTP server on an ephemeral
loopback port. It serves only those captured bytes, records their SHA-256 hashes,
and returns 404 for unavailable API requests. It uses no response interception,
model service or room backend. HTML revalidates with ETags; assets remain cacheable.
Responses have no content encoding. The resulting timings describe this local
delivery protocol, including its uncompressed transfer sizes.

## Entry observations

Use Chromium at 1440 × 1000, DPR 1, English, daylight and normal motion. CDP applies
10,000,000 bits/second in both directions and 80 ms request latency. This is the
declared network approximation; it does not reproduce every physical RTT effect.

Navigate directly to the neighborhood in a fresh browser context with an initially
cleared browser cache. Record one cold entry, then three full-page warm reloads in
that same context, retaining cache and the route session. Do not move between these
entries. Wait for outstanding neighborhood downloads/attachments before each
reload and require every desired cell to reach its requested resident detail.
Record and reject section errors even when base geometry remains available.
Warm entry means a cached full-page load, not resuming a resident scene.

First usable is the earliest browser animation-frame observation of a matching
neighborhood with a submitted draw, ready lighting, enabled camera, unpaused
player, ground hit, valid route position, no blocking section/restore and completed
opening action. The report preserves the runtime's own loading/first-render values
separately. Actual keyboard response is checked after the entry measurements;
readiness alone is not labeled physical input validation.

Cold exit: **≤8,000 ms**. Each warm exit: **≤3,000 ms**. Preserve every observation
and missed target. ResourceTiming reports completed transferred/decoded bytes at
readiness; navigation bytes and outstanding requests are separate. CDP records
request timing, encoded bytes, cache behavior and failures for further inspection.

## Input and rendering observations

After the fourth entry, focus the actual scene and perform ten alternating
ArrowRight/ArrowLeft holds. Enter Look closer through its visible control, then
perform ten alternating L/J orbit nudges. Playwright sends one keydown and one
keyup per action; J/L applies a discrete camera adjustment without synthesized
key repeat. Each hold lasts at least 300 ms; a missing response fails after ten
seconds. Record actual event receipt/release durations, which can exceed the
requested delay when rendering blocks browser work. Escape exits inspection. These actions exercise
the starting segment and do not substitute for the complete-route walkthrough.

For every action retain:

- Browser `performance.now()` immediately before Playwright dispatch.
- The trusted key event's `timeStamp` and receipt time in the browser.
- Actual hold durations from event timestamps and from browser handler receipts.
- The first observed changed position/azimuth with an increased draw counter.
- Submitted-draw observation times, counter increments and observer execution cost.

The report preserves three response measurements: event `timeStamp` → changed
state plus submitted draw, browser handler receipt → that observation, and
automation dispatch → that observation. Event timestamp response includes browser
queue delay; receipt response excludes it. Dispatch response also includes
automation scheduling. Each event timestamp and receipt p95 exit is **≤100 ms**;
the timestamp check requires all twenty valid observations. Browser queue delay is
reported separately. These measurements leave physical screen presentation
unmeasured. p95 uses the nearest-rank definition, with sample counts and raw
values retained. Observed rendered-frame interval p95
exit: **≤33.3 ms**. Intentional gaps between actions are excluded. A skipped draw
counter increment prevents declaring the frame gate passed because individual
frame intervals could not be recovered from that observation. The first draw
counter comparison spans the pre-dispatch sample through the first post-event
observation; a gap there cannot assign every draw to the action. Preserve that
gap and keep the gate failed. Report walking, orbit and combined distributions,
including each action's observed draw count. A one-draw orbit nudge provides no
within-action interval; its frame cadence remains unmeasured. Combined frame
statistics describe only the groups that supplied intervals. Observer cost
remains visible.

## Hidden work and interpretation

Stop the benchmark animation-frame observer. Open a blank tab and bring it to the
front; record native `visibilitychange` events and require actual `document.hidden`
on the neighborhood. Use 100 ms timer polling because a hidden page can suspend
animation-frame callbacks. After 1.5 seconds to
settle, measure two seconds of runtime draw/update counters, page CPU metrics and
new neighborhood HTTP requests. The hidden exit requires zero new draws, updates
and neighborhood requests. CPU values are observations; browser sampling calls
and other page work are not attributed exclusively to the scene.

If the actual hidden state is absent after ten seconds, record both tabs' observed
visibility, event history and timeout. Mark the hidden check failed/unobserved,
retain the startup/input results and execute final page-exception/resource checks.
No hidden runtime-work claim is available from that attempt. After closing the
blank tab, record the neighborhood's returned visibility.

The report includes exact package/driver hashes, OS/CPU/memory, browser and WebGL
renderer/vendor, viewport, input trace, failures and target results. SwiftShader or
other software-renderer observations cannot establish physical GPU or phone
performance. This tool leaves the separate **Q03 <500 ms** locale-action metric
unchanged. The original homepage performance driver remains its measurement tool.
