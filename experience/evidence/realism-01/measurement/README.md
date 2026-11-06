# Submitted-frame diagnostic · 5 November 2026

[Original report](result.json.gz) · [Binding and file hashes](binding.json) ·
[Measurement protocol](../../../tools/neighborhood-performance.md)

The actual local run used Chromium 151.0.7922.173 with SwiftShader, English/day,
1440 × 1000 at DPR 1, and the driver's 10 Mbps / 80 ms loopback approximation.
It ran from 16:14:48 to 16:17:21 UTC and returned exit code 1: **12 checks passed,
11 failed**. All failures remain in the report. This is a starting-segment
instrumentation diagnostic; physical-device, full-route and human acceptance
remain unverified.

| Entry | First usable | Resident detail observed | Following draw submitted | Full-quality observed | Target for each entry measurement |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cold | 8,475.5 ms | 20,796.7 ms | 20,799.2 ms | 21,724.5 ms | ≤8,000 ms |
| Warm 1 | 3,487.0 ms | 15,497.5 ms | 15,500.1 ms | 16,535.0 ms | ≤3,000 ms |
| Warm 2 | 3,171.5 ms | 14,265.4 ms | 14,272.6 ms | 15,162.9 ms | ≤3,000 ms |
| Warm 3 | 3,523.5 ms | 16,261.7 ms | 16,264.3 ms | 17,307.7 ms | ≤3,000 ms |

Each full-quality record contains the desired resident cell IDs, asset hashes,
lighting hashes, the counter before readiness, and a greater draw counter with
its actual camera matrices/interpolated position. These observations verify the
implemented boundary. Selected resident detail does not establish architecture
quality or coverage beyond the starting segment. The final observation includes
RAF sampling delay; submitted-draw time remains available separately. Physical
screen presentation is unmeasured.

| Interaction observation | Actual result | Interpretation |
| --- | ---: | --- |
| Trusted inputs with changed submitted frames | 20 / 20 | Ten walking holds and ten orbit nudges observed |
| Event timestamp → response p95 | 910.3 ms | Fails ≤100 ms; includes queue time |
| Handler receipt → response p95 | 18.6 ms | Passes its separate diagnostic threshold |
| Browser event queue p95 | 905.8 ms | Preserved independently |
| Observed walking frame interval p95 | 1,038.1 ms | Fails ≤33.3 ms |
| Draw-counter gaps | 9 | Missing intervals remain unverified |
| Orbit frame intervals | 0 | Cadence unmeasured; combined gate cannot pass |
| Native hidden state | Unobserved | Hidden-work check fails; no suspension claim |
| Page exceptions / missing build resources | 0 / 0 | Both checks passed; expected absent API responses retained |

Package manifest SHA-256:
`b7febf6f721107b28fdfe822dc2ebe73633829f3a01791a691eb7cdf72ac67c2`.
The binding includes the executed driver/helper SHA-256 values, compressed and
decoded evidence hashes, host/browser details, all per-action observations and
the unchanged original bytes of the report.

The [earlier implementation attempt](development-attempt.json.gz) is retained
with its failures and source hashes. Exact executing source copies were saved
for the final run. The initial sandbox launch denied the local listening socket
before browser startup; the approved network-enabled launch executed the runs.

Six regression tests replay these captured observations and the archived
candidate-13 observations. They check report identity, later-draw readiness,
actual submitted-camera response, unchanged/reversed frames, event queue retention,
and immutable camera copies:

```sh
node --test --test-isolation=none --test-reporter=spec experience/tests/measurement-boundaries.test.mjs
```

Result: **6 passed, 0 failed**. The final production build also passed with the
existing large-chunk warning. To reproduce retention after a completed local run:

```sh
node experience/tools/retain-measurement.mjs artifacts/realism-01/runs/measurement-v2-final artifacts/realism-01/runs/measurement-v2
```

Project-generated evidence and repository source follow the repository MIT
license. Source asset rights remain in their existing receipts. Raw browser
profiles, caches and build intermediates stay under ignored `artifacts/`.
