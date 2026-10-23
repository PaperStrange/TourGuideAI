# Candidate 5 performance

Package `223fcf32ae41551aab0096dae95d8160c679dacb38469c0f7dbdfb4163b37f23`
contains the hash-versioned caching increment. Its 299 files total 88,005,902 bytes;
scenery manifest `90c0873c5e540147630c970d4a2ea692c1583b3c407c175a2659d4e1e93934c8`
and decoded scenery remain unchanged from candidate 3.

The exclusive benchmark ran from `2026-10-23T03:32:40.808Z` to
`2026-10-23T03:35:01.101Z`. The [complete report](result.json.gz) has decoded SHA256
`e9d62064a6f8f57efb24453aa5c9712cc68e4bed5f9b0c3dc65a1a1afa87f12f`.
The [executed driver](neighborhood-performance.mjs.gz) has decoded SHA256
`3b46f1951e9e96b9e03ba1f681bee96b46abd49d680b58d22ed35954cd38d39f`.

| Gate | Observed | Target | Result |
| --- | --- | --- | --- |
| Cold first usable | 9,059.1 ms | ≤8,000 ms | Missed |
| Three warm entries | 2,545.0 / 2,701.9 / 2,766.5 ms | Each ≤3,000 ms | Passed |
| Event timestamp → changed state and submitted draw p95 | 925.5 ms | ≤100 ms | Missed |
| Handler receipt → response p95 | 12.6 ms | ≤100 ms | Passed for this diagnostic interval |
| Walking observed frame interval p95 | 945.6 ms | ≤33.3 ms with complete observations | Missed |
| Actual background-tab zero work | Visibility transition unobserved | Actual hidden state and zero work | Unresolved |

All **19 checks** execute: **15 pass / 4 fail**, with zero page or driver exceptions
and no missing build resources. Every entry reaches its requested scenery detail.
Twenty trusted actions respond. Dispatch-to-response p95 is 927.0 ms. Walking has
29 observed intervals and nine initial counter gaps; orbit has ten single-draw
nudges and no interval distribution. Observer work p95 is 0.4 ms. Both headless
documents remain visible with zero visibility events, so no background-tab work
sample is claimed. Actual Together-mode scene hiding has separate focused evidence.

Each warm entry has **56/56 SHA-versioned requests served from browser cache**.
HTML, the fresh manifest, unhashed traveller and unavailable API health reach the
server. Completed resource transfer at first usable is 600 bytes plus 300 navigation
bytes per warm entry, with 7,285,101 completed decoded body bytes. The
[real-browser cache checks](../../qa/candidate-5-cache/README.md) separately verify
same-version reuse, new-version freshness and explicit recovery from cached
integrity/HTTP failures.

The declared conditions match candidate 3: Chromium 151.0.7922.34, Linux x64,
five logical AMD EPYC CPUs, SwiftShader Vulkan software rendering, 1440×1000,
DPR 1, daylight, English, normal motion, actual immutable loopback HTTP with
10 Mbps / 80 ms CDP throttling and uncompressed server responses. No other browser,
asset processing or Blender export ran during measurement. The revised driver
additionally gates native-event timestamp latency and explicitly records absent
hidden-tab observations. It retains the original receipt and frame-gap gates.

Warm-entry median improves from 4,549.7 ms in candidate 3 to 2,701.9 ms in this run.
Cold entry, frame cadence and queued input still miss their targets. Software-host
results leave physical GPU and phone performance unmeasured. Q03 remains open.
This package has not been published.
