# Connected neighborhood evidence · 21 October 2026

The approved route joins six exterior sights over **1,353.444 m**. Source and
navigation implementation is committed as `e0c726a`, scenery as `44f638a`, and
integrated streaming/itineraries as `4f8a6ec`. Final scenery/resource accounting is
committed as `cd70174`, with strengthened browser drivers in `6f9ccc2`.
Browser acceptance is blocked by actual interior arcade camera composition.
The published release remains the preceding package
`3e72aa1c53596042a14d1fb2aae9556b0a2caa876be93d424ec9ebe2aebb0162`.

| Evidence | Observed result |
| --- | --- |
| [Independent geographic checks](source/independent-checks.txt) | 13/13 pass: retained source identities, complete mapped connections, official footprints/heights, triangulation and route coverage. |
| [Independent regeneration](source/regeneration-audit.json) | Seven generated content files reproduce byte-for-byte; three retained source hashes match. |
| [Journey panel](panel/result.json) | 16/16 actual browser checks pass for production modules and native browser storage. This run covers the panel without streamed 3D entry. |
| [Unchanged Q03 actions](performance/baseline-actions.json) | 953.5 / 1406.1 / 1096.0 ms on the preceding frozen package; each exceeds 500 ms. |
| [Separate Q03 trace analysis](performance/baseline-trace-analysis.json) | 15 synchronous WebGL readbacks account for 731.9 ms wall time. Handler time is 6 ms; the diagnostic action takes 1224.7 ms. |
| [Actual walking profile](performance/walk-profile/result.json) and [trace analysis](performance/walk-profile/analysis.json) | The first integrated package moves 12.51 m in 26.926 s: 176 simulation ticks, 30 rendered frames and no shadow refresh. Across the trusted-key interval, 29 compositor WebGL readbacks consume 25,637 ms wall time; application animation-frame work totals 190.3 ms. No observer loop runs during the walk. |
| [Compositing diagnostic](performance/compositing/result.json) and [analysis](performance/compositing/analysis.json) | The same assets, initial pose, AA and viewport with SwiftShader GPU compositing remove main-thread readbacks, but produce 31 frames in 25.016 s. GPU-thread buffer swaps take 22,560 ms. This configuration does not improve fluent movement; production quality and Q03 are unchanged. |

The current browser candidate is
`9f3d1550c6263ca35d6c672da67952afcc3d2fb69ea4cf21d1c661ef06ebb4b6`.
Its opening day/night art review passes, and the required daylight 3D startup assets
total 4,152,813 bytes. Focused controls pass 10/10 actual browser checks, including
modal pause/resume, Stop, EN/ZH guidance and retained private records.
[Executed art review](art-review.md) records opening and arcade evidence separately.
The actual bounded arcade test finishes 6 passing and 2 failing checks: the
interior default camera crops the actor's head, and sampled interior rays find no
selectable feature. Market arrival and surface inspection pass. Complete traversal
and whole-entry performance measurements remain pending. CI `39574644628` is
running on `6f9ccc2` at the immediate user-requested checkpoint. The performance
driver has not run on this package. No new release is accepted for publication.
The walking/compositing diagnostic rows above retain their earlier package identity
and do not measure this candidate.

Current access, surveyed grades, simulation widths, facade proportions and authored
lighting remain explicitly distinguished from geographic source data. Software
rendering measurements do not establish physical desktop or phone performance.
The route's art, streaming and complete browser journey require their own frozen
package evidence before publication.
