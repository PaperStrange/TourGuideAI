# Candidate 10 default performance observation

The unchanged standard driver completed one run: **16 checks passed and 3
failed**, with no page errors. The startup observations met their existing
targets; queued input response, frame cadence and genuine background-tab
observation remain open in this headless configuration.

| Measurement | Observed | Existing target/result |
| --- | --- | --- |
| Cold first usable | 7,772.3 ms | ≤8,000 ms, pass |
| Cached reload 1 | 2,577.9 ms | ≤3,000 ms, pass |
| Cached reload 2 | 2,542.3 ms | ≤3,000 ms, pass |
| Cached reload 3 | 2,652.0 ms | ≤3,000 ms, pass |
| Event timestamp → changed state/submitted draw p95 | 808.3 ms | ≤100 ms, fail |
| Handler receipt → changed state/submitted draw p95 | 15.2 ms | ≤100 ms, pass; excludes browser queue delay |
| Observed rendered-frame interval p95 | 843.9 ms | ≤33.3 ms, fail |
| Native hidden-work observation | Both tabs stayed visible | Failed/unobserved |

All 20 trusted actions produced an observed response. The ten walking actions
supplied 30 within-action frame intervals. Nine first-observation counter gaps
remain recorded, so individual missing intervals cannot be reconstructed. Each
of the ten orbit nudges generated one observed draw and no within-action
interval; orbit frame cadence is unmeasured. The unchanged raw event timestamps,
receipt/dispatch times, actual hold durations and observer work remain in the
complete report.

This run used system Chromium `151.0.7922.173`, default SwiftShader, headless,
1440×1000, DPR 1, normal motion and application antialiasing. The network protocol
was the existing 10 Mbit/s plus 80 ms CDP approximation on an actual immutable
loopback HTTP server. One fresh-cache navigation was followed by three cached
full-page reloads. All requested detail sections settled successfully. These
software-host observations do not establish physical-device performance or
display presentation timing.

The package is
`afc7934f1b0706ea59caae5e4b1a97a6a3f6366ac65b24cbe79bfc2c2d94e574`
(446 files), with scenery
`e58257879fb4ead8af14022e71e329ee3309f9920eec6fe2cf4717276573d108`.
The unchanged executing driver is
`1ab216a6b3d7039c42156a782ea0158edcc27f0bb5e58cb26ccf6c8f76709757`.
The run lasted 123.873 seconds and completed at
`2026-10-24T02:57:35.547Z`.

[binding.json](binding.json) records all file, report and source identities,
individual entry/cache data and exact gates. [entry-cache.json](entry-cache.json)
retains every relevant CDP request and cache observation. The original complete
report and executed driver are preserved through lossless gzip; `protocol.md`
and `run.log` accompany them. The raw source directory is
`artifacts/neighborhood-20261024/performance/candidate-10/`.

The background-tab attempt retained actual native events: both pages remained
visible, no `visibilitychange` occurred, and the ten-second wait timed out.
The report continues through the final resource and exception checks. The first
authenticated Xvfb observation also left native hidden state unobserved. A
[separate native-context observation](../native-visibility/README.md), using direct
Chromium startup and public `connectOverCDP({noDefaults:true})`, subsequently passed
13/13 checks with trusted hidden/visible events and zero scene work over
2,019.4 ms. Both original failures retain their own evidence and configuration.
The Q03 homepage language-action target
has its own measurement protocol and is unchanged by these neighborhood timings.

The separate paired startup diagnostic retains its original 19-pass/2-fail
report and cache-condition comparison. That experiment used one cold and one
cached sample per candidate and supplies no timing distribution. Its evidence
does not replace this standard run or candidate 9's preserved results.
