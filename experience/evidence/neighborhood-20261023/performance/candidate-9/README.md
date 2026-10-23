# Candidate9 default performance observation

One complete run on the final package recorded 14 passing and 5 failing checks.
Chromium 151.0.7922.173 used the unchanged default headless/SwiftShader path,
1440 × 1000 at DPR 1, antialiasing enabled, and the protocol's 10 Mbit/s and
80 ms CDP network approximation. The browser and HTTP service closed at
2026-10-23T06:37:05.328Z. No additional renderer or flag experiment was run.

| Observation | Measured | Existing target | Outcome |
| --- | ---: | ---: | --- |
| Cold first usable view | 8,352.8 ms | ≤8,000 ms | Failed |
| Warm reload 1 | 3,013.9 ms | ≤3,000 ms | Failed |
| Warm reload 2 | 2,907.5 ms | ≤3,000 ms | Passed |
| Warm reload 3 | 2,956.8 ms | ≤3,000 ms | Passed |
| Input receipt → changed state/submitted draw p95 | 12.9 ms | ≤100 ms | Passed |
| Event timestamp → changed state/submitted draw p95 | 933.8 ms | ≤100 ms | Failed |
| Observed within-action frame interval p95 | 996.4 ms | ≤33.3 ms, no counter gaps | Failed |
| Native hidden-tab inactivity | Unobserved | Actual hidden transition and zero work | Failed/unobserved |

All 20 trusted actions produced responses. The 10 orbit actions are discrete
nudges with one draw each; orbit frame cadence is unmeasured. The 10 walking
actions supplied 30 observed within-action draw intervals. Nine first-observation
counter increments were 2, and the unchanged counter-gap gate remains failed.
The observer's own work p95 was 0.5 ms. The receipt-only metric excludes browser
queue delay; the event-timestamp metric includes it. Physical display presentation
is unmeasured. There were no page exceptions or missing packaged resources.

The actual background-tab attempt left both pages visible and produced no
visibilitychange event within 10 seconds. The complete unobserved result is
retained without a visibility override. This run does not establish native
hidden-tab behavior, physical-device performance or human comfort.

`entry-cache.json` retains each entry's actual CDP request/status/cache record.
The cold entry had 57 neighborhood requests, zero disk-cache responses and
5,427,337 encoded bytes through settling. Each warm entry had 57 neighborhood
requests, 56 disk-cache responses and 267 encoded bytes; the sole uncached
neighborhood record was the manifest revalidation. The full report also retains
the independent 88-entry server HTTP log and exact served body hashes.
First usable view and complete requested-detail readiness are separate:
the latter occurred at 24,263.1 ms cold and 17,360.9 / 15,438.9 / 15,015.4 ms warm.

Package SHA:
`1720fc5907c0c6f2b292aa0e728bcaad8ddbd6c776de7aec2b5a35a513609c9b`.
All 446 package-file bytes were independently reverified during preservation.
Executing tool SHA:
`1ab216a6b3d7039c42156a782ea0158edcc27f0bb5e58cb26ccf6c8f76709757`.
Complete report decoded SHA:
`472ce83cea34d14bd00bf29510586e41b76575cc1ddd6fb96e0c50ed59e36104`.

`result.json.gz` and `neighborhood-performance.executed.mjs.gz` preserve exact
decoded bytes. `binding.json` records file hashes, conditions, per-entry cache
counts, all failed check IDs, timing groups and hidden-state evidence.
`protocol.md` is the executed tool's unchanged protocol. Earlier default and
Mesa observations remain in their original directories.
