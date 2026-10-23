# Candidate 6: Mesa software diagnostic

Executed once on 2026-10-23, 04:32:57.319–04:33:34.910 UTC. Browser, context and
HTTP service closed after the run. The exit status is 1 because five checks failed.
This is a separately labelled software-renderer diagnostic on the unchanged
candidate 6 build. The original default-renderer evidence remains in
`../candidate-6/`; its measurements and acceptance disposition are preserved.

| Binding | SHA-256 |
| --- | --- |
| Captured package file manifest | `ca4b3c95bc2a6b94ad2cc978a083d1e3c3c109d65febce326a5e16e937dc271b` |
| Executed driver, decompressed | `1ab216a6b3d7039c42156a782ea0158edcc27f0bb5e58cb26ccf6c8f76709757` |
| Result JSON, decompressed | `6ffdb00d44fa9c561f2f22b799f54946c252f4f787ec6101a4e2572be09811fb` |
| Post-measurement canvas | `6c07b94a96c8068372f4d8b1de08e7e5efc3bc472f0d8984d72824bb216de6a3` |

The compressed result and executing driver are byte-preserving copies. The full
result includes every packaged file hash, CDP requests/cache evidence, all four
entry observations, the twenty actual input events, runtime counters, context
attributes, actual browser command line and `SystemInfo.getInfo`.

## Conditions and observations

System Chromium **151.0.7922.173**, headless, 1440 × 1000, DPR 1, English/daylight,
normal motion, the same one-cold/three-warm protocol and actual twenty input
actions. CDP applies 10 Mbps and 80 ms latency to the real immutable loopback HTTP
server. The application creates its own WebGL2 context. All four entries report
`ANGLE (Mesa, llvmpipe (LLVM 19.1.7 256 bits), OpenGL ES 3.2)` with the unchanged
application attributes: alpha/antialias/depth/premultipliedAlpha true,
preserveDrawingBuffer false and powerPreference high-performance.

The explicit diagnostic option uses `--enable-gpu --use-gl=angle
--use-angle=gl-egl --ozone-platform=headless --ignore-gpu-blocklist` alongside the
existing environment's `--no-sandbox` launch argument. It sets EGL_PLATFORM to
surfaceless, LIBGL_ALWAYS_SOFTWARE to true and GALLIUM_DRIVER to llvmpipe. All
temporary/cache files remain in repository artifacts. Proxy/CA settings and TLS
checks are preserved. No production code, models, context settings, viewport,
quality, simulation clock, measurement boundaries or thresholds changed.

| Observation | Default SwiftShader | Mesa diagnostic | Unchanged target |
| --- | ---: | ---: | ---: |
| Cold usable entry | 7,797.0 ms | 9,537.0 ms | ≤8,000 ms |
| Warm 1 | 2,927.1 ms | 1,367.4 ms | ≤3,000 ms |
| Warm 2 | 2,926.7 ms | 1,217.9 ms | ≤3,000 ms |
| Warm 3 | 3,056.1 ms | 1,232.8 ms | ≤3,000 ms |
| Handler receipt → submitted response p95 | 20.5 ms | 129.4 ms | ≤100 ms |
| Event timestamp → submitted response p95 | 994.4 ms | 129.7 ms | ≤100 ms |
| Automation dispatch → response p95 | 999.1 ms | 130.2 ms | Observation |
| Observed frame interval p95 | 1,048.1 ms | 197.8 ms | ≤33.3 ms |
| Within-action intervals / counter gaps | 30 / 9 | 11 / 0 | Zero gaps |
| Observer work p95 | 0.4 ms | 0.4 ms | Observation |

All twenty actual inputs responded. Each entry reached all desired detail levels.
There were no page exceptions or missing build resources. The Mesa report has
18 passing and 5 failing checks: cold entry, receipt response, event timestamp
response, frame interval, and hidden work. Native hidden state remained
**unobserved**, so this run supplies no hidden-tab work proof. Ten discrete orbit
nudges supplied no within-action frame intervals; the combined frame estimate
comes from eleven walking intervals. The final canvas was captured only after
all timing and visibility observations, with its actual camera/state recorded.
Art's read-only review found the traveller, tactile paving, crossing, canopy
supports and facade visibly rendered. Thin diagonal surface patterning remains
visible on broad facade/paving surfaces. This single frame establishes scene
presence; renderer parity and improved image quality are unverified.

The faster warm entries and shorter browser queue observations apply to this
software configuration. Cold entry and receipt-to-response became slower.
These single-run observations do not establish physical GPU performance, phone
performance, complete-route cadence, or closure of the separate Q03 metric.

## Capability evidence and reproduction

`initial-capability.json` preserves the failed Mesa attempt with alpha:false,
which differs from the application. Its SHA-256 is
`b500b259ebf4ac8f21203891f0a0eba2834a7ff678cfed32c4897468729e53ab`.
`blocklist-capability.json` preserves the successful follow-up using the exact
application attributes and the explicit blocklist switch; its SHA-256 is
`fe156162b9b84e1fef7c74d00c182d5d5afa561fbdc3489117b66fae18df58c7`.
That probe reports four AA samples and no GL errors. Both corresponding driver
sources are retained as text evidence. Their original execution directory was
`artifacts/neighborhood-20261023/`, where the relative Playwright import resolves.

The exact Chromium source identifies the relevant compatibility decision:
[software_rendering_list.json](https://github.com/chromium/chromium/blob/151.0.7922.173/gpu/config/software_rendering_list.json)
entry 3 matches Linux llvmpipe and disables GPU features;
[gpu_switches.cc](https://github.com/chromium/chromium/blob/151.0.7922.173/gpu/config/gpu_switches.cc)
documents the explicit ignore switch. The successful probe and full run confirm
actual llvmpipe initialization with that configuration.

Run the preserved tool source from its repository `experience/tools/` location,
using an available exact candidate 6 package and a fresh output directory:

```sh
NEIGHBORHOOD_PERF_OUTPUT=artifacts/neighborhood-20261023/performance/candidate-6-mesa \
EXPERIENCE_QA_CHROMIUM=/usr/bin/chromium \
node experience/tools/neighborhood-performance.mjs \
  artifacts/neighborhood-20261023/candidate-6 --graphics=mesa-software
```

The managed environment required narrow read/write access to `/home/agent/.pki`
for Chromium's existing NSS trust database. No certificate-verification bypass
was used. The original output directory is immutable evidence; choose a new
directory for any separately authorized reproduction.

## Native headed/Ozone visibility capability

One additional capability probe ran at 04:40:17.626–04:40:38.004 UTC. Its
`headless:false` launch used the same system Chromium, Mesa flags and exact
application WebGL attributes. The recorded Chromium command line has no
`--headless` switch. Ozone supplied its internal virtual display, without Xorg,
Xvfb or a physical display. Actual llvmpipe initialized with four AA samples and
no GL errors.

Two actual tabs shared one browser window. The probe issued first-tab activation,
second-tab activation, first-tab return, native window minimize and restore
requests. Every phase retained `document.hidden === false` in both documents;
neither document emitted a `visibilitychange` event. Page timer and RAF counters
continued, and no page exceptions occurred. The capability check failed and the
browser/context/server closed. There is no actual-scene hidden-work result from
this configuration. The native hidden-state acceptance gate remains open.

Only read-only page listeners and observations were installed. No visibility
property, event, browser state or page lifecycle was emulated. The native window
requests used `Browser.setWindowBounds`; tab activation used `bringToFront`.
Minimized window bounds were not sampled separately, so the report establishes
the observed visibility outcome of those requests.

| Preserved evidence | SHA-256 of original bytes |
| --- | --- |
| `headed-ozone-visibility.json.gz`, decompressed | `f056da4a91ad2d302abab1dada2837f2624d503093dc2dc8a632f9ceca232261` |
| `headed-ozone-visibility-driver.txt` | `c7b77fcf16de857298e512ccee2952238ca67b8257e51ccdea3a3e9148e3a22c` |

The driver was executed from `artifacts/neighborhood-20261023/`, resolving its
relative Playwright import, with output under `headed-ozone-visibility/` in that
directory and the same narrow NSS database permission. Its complete native
visibility events, timer samples, actual context and SystemInfo are preserved.
No additional display configuration or launch-flag experiment is part of this
evidence.
