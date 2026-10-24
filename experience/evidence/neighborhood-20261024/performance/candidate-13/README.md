# Candidate 13 default performance observation

One unchanged standard run completed with **16 passes and 3 failures**, zero page
errors and all 20 trusted actions producing observed responses.

| Measurement | Observed | Existing target/result |
| --- | --- | --- |
| Cold first usable | 7,885.6 ms | ≤8,000 ms, pass |
| Cached reload 1 | 2,767.7 ms | ≤3,000 ms, pass |
| Cached reload 2 | 2,766.7 ms | ≤3,000 ms, pass |
| Cached reload 3 | 2,647.7 ms | ≤3,000 ms, pass |
| Event timestamp → changed state/submitted draw p95 | 892.0 ms | ≤100 ms, fail |
| Handler receipt → changed state/submitted draw p95 | 18.1 ms | ≤100 ms, pass; excludes browser queue delay |
| Observed frame interval p95 | 972.3 ms | ≤33.3 ms, fail |
| Headless native hidden-work observation | Both tabs stayed visible | Failed/unobserved |

The ten walking actions provide 29 within-action frame intervals. Eight
first-observation counter gaps remain recorded; the individual skipped intervals
cannot be reconstructed. Each of the ten orbit nudges generated one draw, so
orbit frame cadence remains unmeasured. The original report retains event and
handler timestamps, dispatch durations, actual hold durations, all camera and
resource snapshots, observer work and failed checks. Observer work p95 was
0.4 ms; the event queue p95 was 887.8 ms.

The exact package is
`e8eed9146ea83accaf54769ff2aaaf5a902cfd344295e3348e11684e50838b0c`
(446 files), from implementation
`28439744b6349b795ac0a50c20c5d45d735bb2ed`. Scenery is
`86e4f424a36cb858c16f6e282ad8ceb8f146d6b285d482de3c0ce2fe2f726b61`.
The executing standard driver remains
`1ab216a6b3d7039c42156a782ea0158edcc27f0bb5e58cb26ccf6c8f76709757`.
The complete original report SHA-256 is
`f76a6480651653daa4461a78807e7ba8ced6f484f280cc63932ce1025b5ef2c6`.
Execution lasted 126.941 seconds, ending `2026-10-24T05:04:59.495Z`.

Conditions follow the unchanged default protocol: system Chromium
151.0.7922.173, headless SwiftShader, application antialiasing, normal motion,
1440×1000/DPR 1, and the existing 10 Mbit/s and 80 ms CDP approximation through
actual immutable loopback HTTP. Requested detail settled at 19,001.2, 12,459.2,
12,857.7 and 11,760.8 ms. No measured run was repeated.

Each entry observed 76 HTTP resources, including 57 neighborhood resources.
The cold entry had zero disk-cache responses. Each warm entry had 56 neighborhood
disk-cache responses; CDP recorded 267 encoded neighborhood bytes through detail
settlement. [entry-cache.json](entry-cache.json) retains each request/status/cache
observation. These observations include requested detail beyond first usable.

[binding.json](binding.json) binds the original report, executed driver, protocol,
stdout and all 446 checked package files. The report, driver and stdout are
losslessly compressed. Originals remain under
`artifacts/neighborhood-20261024/performance/candidate-13/`.

The standard headless hidden check retains its original ten-second timeout and
visible states. The separately configured authenticated Xvfb/default-context
[native-tab run](../candidate-13-native-visibility/README.md) passed 13/13 with
trusted hidden/visible events and zero draws, updates and neighborhood requests
over 2,019.6 ms. Its separate result preserves the standard failure. The original
[Q03 sequence](../candidate-13-q03/README.md) also retains its own timing scope.
Software-host timings and submitted draws do not establish physical GPU fluency
or display presentation. One observation per entry condition supplies no
statistical speedup claim.
