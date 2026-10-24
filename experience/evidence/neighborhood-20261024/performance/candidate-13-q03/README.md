# Candidate 13 original Q03 observations

The original homepage performance driver completed its twelve observations once:
three repetitions of Explore/Together, each with cold and same-context warm
navigation. Q03 uses the three warm Together locale actions.

| Repetition | Locale action | Existing target/result |
| --- | --- | --- |
| 1 | 1,090.0 ms | <500 ms, fail |
| 2 | 1,102.5 ms | <500 ms, fail |
| 3 | 1,100.2 ms | <500 ms, fail |

All three main responses were HTTP 200 with zero page errors and identical HTML
SHA-256 `fcbb12ac13b98698f28040aa9645df45c05543ec566fd300ac65a95bc08e1073`.
Each warm Together observation included 14 same-origin Resource Timing entries
with zero transfer bytes and a positive decoded size. The full report preserves
all twelve timelines, external requests and errors. No timing was repeated.

The exact 446-file package is
`e8eed9146ea83accaf54769ff2aaaf5a902cfd344295e3348e11684e50838b0c`,
implementation `28439744b6349b795ac0a50c20c5d45d735bb2ed`.
The unchanged executing driver SHA-256 is
`15d131cf48aaad8394f22951cae382938eae04e7c80c005133a38ef3ed5bc3ff`.
The actual loopback HTTP wrapper SHA-256 is
`efa843620e3553e29b3d4180554f72bf99373520cf06c6683291c0dddb27a4ec`.
Original report SHA-256:
`af55b6d67aa3bc70da975cacafd51387bd764cfb43a1b953d5da8454b34119e9`.
Execution ran `2026-10-24T05:05:20.853Z`–`05:06:33.932Z` (73.079 seconds).

The original measurement begins before the actual locale click and ends when
the changed document language is observed; automation scheduling remains within
that duration. Chromium 151.0.7922.173 ran at 1440×1000/DPR 1 on this software
host. The inherited proxy and TLS verification remained enabled. Photon and map
requests reached their actual services. The wrapper served the immutable bytes
through HTTP with the retained local cache policy: assets use a one-hour public
cache lifetime and other paths use `no-cache`. No response interception or fetch
replacement was used.

[binding.json](binding.json) records all twelve compact results and the three
unchanged Q03 gates, browser conditions, exact package and source identities.
Original report, HTTP records, served-file manifest, driver, wrapper and stdout
are losslessly compressed alongside it. Raw originals remain at `artifacts/q13/`.
Q03 remains open. These software-host/provider observations do not establish
physical-device performance.
