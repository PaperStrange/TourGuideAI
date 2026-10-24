# Candidate 11 default performance observation

One unchanged standard run completed with **16 passes and 3 failures**, zero page
errors and all 20 trusted actions producing observed responses.

| Measurement | Observed | Existing target/result |
| --- | --- | --- |
| Cold first usable | 7,798.0 ms | ≤8,000 ms, pass |
| Cached reload 1 | 2,587.4 ms | ≤3,000 ms, pass |
| Cached reload 2 | 2,667.3 ms | ≤3,000 ms, pass |
| Cached reload 3 | 2,508.2 ms | ≤3,000 ms, pass |
| Event timestamp → changed state/submitted draw p95 | 746.6 ms | ≤100 ms, fail |
| Handler receipt → changed state/submitted draw p95 | 16.0 ms | ≤100 ms, pass; excludes browser queue delay |
| Observed frame interval p95 | 782.0 ms | ≤33.3 ms, fail |
| Headless native hidden-work observation | Both tabs stayed visible | Failed/unobserved |

The ten walking actions provide 30 within-action frame intervals. Nine
first-observation counter gaps remain recorded, so the skipped individual
intervals cannot be reconstructed. Each of the ten orbit nudges generated a
single draw; orbit frame cadence remains unmeasured. The complete report retains
trusted event timestamps, handler receipt/dispatch times, actual hold durations,
observer work, resource/camera snapshots and all failures.

The exact package is
`76c14e7ad8ea57fb81bed982376c5360765a36b0f6a158a45c021c1dc028b2ea`
(446 files). Scenery is
`4fb428b9d5b73274f0e64726cdf045f034e7be1823b8919f7ea6ef7d3bc09544`.
The executing standard driver remains
`1ab216a6b3d7039c42156a782ea0158edcc27f0bb5e58cb26ccf6c8f76709757`.
The complete original report SHA-256 is
`02dadca1ea4c25d07ba2393f7e0f275c13e001bc3ebb436463485d7e682b0cf6`.
It completed at `2026-10-24T03:28:17.664Z`, after 119.720 seconds.

Conditions match the unchanged default protocol: system Chromium
151.0.7922.173, headless SwiftShader, application antialiasing, normal motion,
1440×1000 and DPR 1, with the existing 10 Mbit/s and 80 ms CDP approximation on
actual immutable loopback HTTP. There was one cold navigation and three cached
full-page reloads. All requested detail levels settled successfully at 17,566.9,
12,661.8, 10,718.3 and 10,756.3 ms respectively. No threshold, renderer setting,
request content or simulated clock was changed.

[binding.json](binding.json) records all 446 independently verified package-file
identities, report/source hashes and compact gate results.
[entry-cache.json](entry-cache.json) preserves actual CDP cache observations.
The full report and executed driver are losslessly compressed; the original
protocol and stdout log accompany them. Raw originals remain at
`artifacts/neighborhood-20261024/performance/candidate-11/`.

The standard headless hidden check retains its original ten-second timeout and
actual visible states. Candidate 11's separately configured authenticated Xvfb
and `connectOverCDP({noDefaults:true})`
[native-tab evidence](../candidate-11-native-visibility/README.md) passed 13/13:
trusted hidden/visible events, zero draws, updates and neighborhood requests over
2,018.8 ms, and preserved private view on return. It retains its own report and
does not rewrite this standard result. Software-host timings and submitted
draw observations do not establish physical GPU fluency or display presentation.
The separate Q03 homepage language-action target was not rerun or changed.

Candidate 10's earlier performance and startup A/B reports remain immutable.
This current-package run supplies one observation per entry condition and makes
no statistical speedup claim.
