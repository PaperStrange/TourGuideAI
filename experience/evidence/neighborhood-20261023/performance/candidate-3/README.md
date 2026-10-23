# Candidate 3 performance observations

The immutable package is `4fbeebdbde8ba750f619a0fc5c3e15637a49cdb92e90e22f376c41ce8d8c7922`
from source `9a3b9e8d7e9f8ae078d4671117fc87c295ef7af0`. Its scenery manifest is
`90c0873c5e540147630c970d4a2ea692c1583b3c407c175a2659d4e1e93934c8`.
The exclusive benchmark ran from `2026-10-23T03:14:37.154Z` to
`2026-10-23T03:17:13.968Z`. No other browser, Blender export or asset processing
ran during that window.

The [complete report](result.json.gz) has decoded SHA256
`8d4f217241a05884a86e689097a8339802693f06071273ce93aa4721c33621b2`.
The [executed driver](neighborhood-performance.mjs.gz) has decoded SHA256
`671842a971b1dd5089912761dec76c531977b27111e12fe8a6e8fb690f494d94`.
It records the exact 299-file manifest, HTTP/CDP requests, resource timings, native
input timestamps, draw counters, observer costs, runtime states and every failure.

## Measurements

| Observation | Actual | Required | Result |
| --- | --- | --- | --- |
| Cold first usable | 9,218.4 ms | ≤8,000 ms | Missed |
| Warm first usable 1 | 4,549.7 ms | ≤3,000 ms | Missed |
| Warm first usable 2 | 4,641.5 ms | ≤3,000 ms | Missed |
| Warm first usable 3 | 4,542.1 ms | ≤3,000 ms | Missed |
| Trusted event receipt → changed state and submitted draw, combined p95 | 19.8 ms | ≤100 ms | Met for this defined interval |
| Observed walking draw interval p95 | 1,047.8 ms | ≤33.3 ms, complete observations | Missed |
| Actual background-tab zero-work sample | Not observed | Actual hidden document and zero new work | Unresolved |

All four entries reach their requested resident scenery detail without section
errors. The twenty native key actions produce twenty observed responses. Walking
event-response p95 is 21.9 ms; orbit p95 is 19.8 ms. Automation dispatch-to-response
p95 is **860.3 ms**, which includes event delivery delays excluded from the receipt
metric. Independently calculated from the retained native event timestamps,
event creation to observed response p95 is **856.1 ms** combined and **870.7 ms**
for walking. Actual walking holds last 2,286–3,150.7 ms; orbit holds last
807.1–1,003.5 ms. The receipt-only passing check does not establish the intended
100 ms user response or physical screen presentation.

Thirty walking frame intervals were observed, and nine first-action observations
record two-counter increments. The frame gate fails; individual missed intervals
cannot be recovered. Each of the ten orbit key holds produces one observed draw,
so this run has no orbit frame-interval distribution. Observer work p95 is 0.4 ms.

The driver records ten passing and five failing checks, then terminates at the
background-tab visibility timeout. Its final hidden sample, page-exception check
and missing-resource check were not completed. The complete failed observation
remains unchanged. The independent [53-check interaction run](../../qa/candidate-3/README.md)
verifies zero work when the scene is hidden through the actual Together interface;
that scope is separate from background browser-tab behavior.

## Conditions and investigation

Chromium 151.0.7922.173 runs headless on Linux 6.18.55, x64, with five logical CPUs
reported as AMD EPYC 9V74 and 18,882,674,688 bytes RAM. The actual WebGL renderer is
ANGLE Vulkan **SwiftShader Device (Subzero)**; the host exposes no `/dev/dri` device.
Viewport is 1440×1000, DPR 1, English, daylight, normal motion. CDP applies 10 Mbps
and 80 ms request latency to actual immutable loopback HTTP responses. The server
uses ETags, cacheable assets and uncompressed responses; it has no room/LLM backend.
Physical GPU and phone performance remain unmeasured. Q03 remains separate and open.

Cached neighborhood and lighting resources revalidate with approximately 84–86 ms
request duration and 300-byte ResourceTiming transfer accounting per resource.
Their bodies match the cold entry, and the original loader requests `no-cache`.
Warm ground/context dependencies each form roughly half-second request sequences.
This is evidence for hash-versioned asset caching while keeping manifests fresh,
integrity verification and existing queue limits. No measured improvement is
claimed by this report.

The separate blank-page [visibility observation](browser-visibility.json) has
SHA256 `ae097f12a329fcc61256dd4e0ddf87a227a9cde9b8fe6d243240b75746ae0593`.
Its [exact probe](probe-browser-visibility.mjs) records actual browser actions:
opening two pages, bringing the second forward, minimizing the first window, then
restoring it. This Chromium headless session reports both documents visible in
every case. No document property or lifecycle state was overridden. The probe was
executed from `artifacts/neighborhood-20261023/`; its import resolves from that
original location. A genuine hidden-tab observation requires a browser environment
that provides that visibility transition.

The performance gates remain open. This package has not been published.
