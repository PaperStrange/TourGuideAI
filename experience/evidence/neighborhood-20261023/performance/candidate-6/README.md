# Candidate 6 performance

Package `ca4b3c95bc2a6b94ad2cc978a083d1e3c3c109d65febce326a5e16e937dc271b`
contains 445 files / 96,679,636 bytes. Its scenery manifest is
`deb00b97ca3e29e314a13225678c7e6827de59a0f8ff68d5d3bdccc7d3563458`.
Source `9b5d5f7998f952ca4dd8944b003a3c1bfaea1c20` adds lossless gzip transport;
all decoded scenery bytes match candidate 5. Required 3D startup transfer is
3,030,351 bytes in daylight and 3,023,115 bytes at night. The independent
[transport audit](../../world/transport/README.md) records exact reproduction.

The exclusive benchmark ran from `2026-10-23T03:57:06.658Z` to
`2026-10-23T03:59:31.264Z`. The [complete report](result.json.gz) has decoded SHA256
`a464f097839a971ebd3f160e6c95f2b250fd0456ecca7796e6e372dbbd79c594`.
The [executed driver](neighborhood-performance.mjs.gz) has decoded SHA256
`3b46f1951e9e96b9e03ba1f681bee96b46abd49d680b58d22ed35954cd38d39f`.

| Gate | Observed | Target | Result |
| --- | --- | --- | --- |
| Cold first usable | 7,797.0 ms | ≤8,000 ms | Passed in this run |
| Three warm entries | 2,927.1 / 2,926.7 / 3,056.1 ms | Each ≤3,000 ms | Third entry missed |
| Event timestamp → changed state and submitted draw p95 | 994.4 ms | ≤100 ms | Missed |
| Handler receipt → response p95 | 20.5 ms | ≤100 ms | Passed for this diagnostic interval |
| Walking observed frame interval p95 | 1,048.1 ms | ≤33.3 ms with complete observations | Missed |
| Actual background-tab zero work | Visibility transition unobserved | Actual hidden state and zero work | Unresolved |

All **19 checks** execute: **15 pass / 4 fail**, with zero page or driver
exceptions and no missing build resources. Every entry reaches its requested
scenery detail. Twenty trusted actions respond. Event queue p95 is 989.5 ms and
dispatch-to-response p95 is 999.1 ms. Walking supplies 30 observed intervals with
nine initial draw-counter gaps. Orbit supplies ten single-draw nudges and no
within-action interval distribution. Observer work p95 is 0.4 ms.

All **56/56 SHA-versioned requests** use the browser cache on each warm entry.
At first usable, completed warm resource transfer is 600 bytes plus 300 navigation
bytes. Completed HTTP decoded body bytes are 5,063,162; gzip containers in this
metric still require application decompression and retain their full declared
decoded residency. Cold completed transfer at readiness is 4,839,460 bytes plus
1,902 navigation bytes; outstanding requests are preserved separately in the
report. These whole-page observations include resources outside the required 3D
startup budget.

Conditions match candidate 5: Chromium 151.0.7922.173, Linux x64, five logical AMD
EPYC CPUs, SwiftShader Vulkan software rendering, 1440×1000, DPR 1, daylight,
English and normal motion. Delivery uses actual immutable loopback HTTP with
10 Mbps / 80 ms CDP throttling and no HTTP content encoding. No other browser,
asset processing or Blender export ran during measurement. The measured cold
entry improves from 9,059.1 ms to 7,797.0 ms; warm entry and all other observations
remain reported independently. One cold observation does not establish timing
stability or physical-device performance.

Both headless documents remain visible with zero native visibility events.
No hidden-work sample is claimed. Engineering's bounded environment check found
Xorg and the dummy driver installed, with no configured display. The installed
Xorg source requires writable `/var/lib/xkb` or a `/tmp` fallback; the current
workspace constraints permit neither launch path. A provisioned native display
with permitted storage is required for that check. No permissions, display
state or visibility properties were altered.

Physical GPU and phone performance, Q03, full-route acceptance and complete art
review remain separate release gates. This candidate has not been published.
