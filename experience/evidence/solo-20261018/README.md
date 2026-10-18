# Solo exploration · 18 October 2026

Runtime source `a1dbd36298e56109a396d2df1a9031851859b3c9` produces the reviewed
90-file package
`0a6244091b50c9ee7220d698e1109c86bd397dba54384c8db20e68bc57c728e7`.
Pages runtime `9e8ecadd1fa3efe44d69396e55b6375ca4097fd4` is deployed. All 90
published files match; actual hosted solo 19/19 and homepage 21/21 checks pass. The
[sprint plan](../../docs/sprint-solo-20261018.md) preceded production at `1babfc6`.

## Delivered behavior

Solo Kyoto supports free movement, full camera control and optional source-linked
inspection of an actually visible facade. The wider map supports deliberate
discovery at its current center. Private kept places retain the chosen identity
or unnamed area, camera, lighting, optional personal words and selected stop order.
Returning restores those choices. English/Chinese guidance follows keyboard,
mouse and touch inputs. Solo notes and selections remain outside room state.

One map palette maintains visual continuity across provider coverage. Four
original architectural finish maps and calibrated existing canopy lights refine
the detailed Kyoto setting. Detailed authored scenes and approximate mapped
buildings retain separate coverage labels. Google Maps calculates directions
through the selected places; map lines display their proposed visiting order.

## Verification and artifact scope

| Evidence | Result | Binding |
|---|---|---|
| [Application](final/unit-checks.txt), [service](final/service-checks.txt), [repository](final/gates-checks.txt) | 105/105, 13/13, 17/17 | Final source and configured local service |
| [Complete current solo CI](ci/current/solo-result.json) | 75/75 | Source `02c2d63`, exact `0a624409…`; all connected solo scenarios with the current driver |
| [Published files](hosted/published-files.json) | 90/90 | Every built file fetched over actual HTTPS and SHA-256 matched |
| [Published solo](hosted/solo/README.md) | 19/19 | Actual EN/ZH desktop/phone, night-camera return, Eiffel and panned-area discovery, source/order/Maps return; 132 completed response bodies match |
| [Published homepage](hosted/homepage/walkthrough-result.json) | 21/21 | Actual EN/ZH desktop/phone; 107 completed response bodies match |
| [Complete solo diagnostic](final/solo-full-diagnostic/solo-result.json) | 69/71 | `9b1ba2b1…`; actual inspection, private street/night return, room isolation, real-provider map return, legacy saves, missing finish, map recovery, malformed storage and actual browser quota |
| [Final map and phone](final/map-phone/solo-result.json) | 39/39 | `0a624409…`; actual provider discovery, cancellation/retry, saved views/order, locale and viewport resize, EN/ZH touch, hybrid input and phone map return |
| [Startup and hidden work](final/startup/result.json) | 8/8 | `0a624409…`; one initial draw, keyboard walk, locale, night, zero hidden scene work and resume |
| [Original pause/lighting](final/runtime-pause/runtime-pause-result.json) | 19/19 | `0a624409…`; original walk modal, pause, appearance and startup behavior |
| [Original appearance](final/appearance/browser-result.json) | 14/14 | `0a624409…`, bundled Chromium 151.0.7922.34; calibrated fixtures, actual HDR, delayed response, recovery and bounded resources |
| [Matched art](art/reviewed-art.md) | Bounded refinement accepted | Eight same-pose baseline/final captures; final art on `81e885e6…` retains identical runtime asset/profile bytes in `0a624409…` |
| [Final phone art](final/phone-art/art-poses-result.json) | Two actual tap-driven day/night captures, zero errors | `0a624409…`; viewport screenshots preserve mobile emulation |
| [Q03 performance](performance/README.md) | Target remains missed | Three matched local warm actions: 1121.1 / 1221.9 / 1097.9 ms; each must be below 500 ms |

The [validation boundaries](final/validation-boundaries.json) record the exact
package differences and evidence hashes. From `9b1ba2b1…` to `0a624409…`, only
`index.html` and the homepage/world-map JavaScript/source-map pairs change. All
85 other files match, including shared street runtime, art, CSS and other entries.
The complete report's two phone diagnostics are explained by the retained
[actual input probe](final/phone-input-diagnostic/result.json): Chromium full-page
capture reset mobile emulation, and the initial map gesture used one finger where
cooperative controls require two. Final viewport captures and actual two-finger
gestures verify those behaviors. The complete report remains immutable; counts
overlap and must not be combined into a product success rate.

CI `39131040477` on initial runtime `1ce9360` passes homepage 65/65, full
walkthrough 264/264, perspective 80/80 and companion 73/73. Original walk records
131/133; two lighting expectations omit the profile's calibrated fixture overrides.
The actual lights match the profile. The corrected expectations pass the 14/14
focused appearance run on final bytes, including actual HDR retry.
[Current CI](ci/current/README.md) on source `02c2d63` passes complete solo 75/75,
homepage 65/65, perspective 80/80 and travel 73/73 on the exact published package.
Run `39133355919` continues its extended walkthrough and original-walk jobs;
aggregate completion remains pending. [Earlier CI evidence](ci/README.md) retains
its original outcomes.

Hosted reports use actual HTTPS assets and providers without response replacement
or disabled TLS verification. Default `/api/health` 404 responses reflect the
unconfigured public backend and are recorded separately from JavaScript page
exceptions, which are zero. A few navigated-away response bodies were unavailable
to browser capture; the independent 90-file verification covers the full build.
The hosted driver's valid moving-map state is guarded before reading its camera;
its independently tested readiness guard changes no runtime or CI-suite input.
Launch and wait-predicate diagnostics remain beside the final hosted solo report.

## Breadth decision and remaining gates

The [coverage research](../../docs/solo-coverage-research-20261018.md) recommends
one styled global map with selectively reviewed area packs for richer local
identity. Actual Shijō Bridge and Eiffel-area provider responses and two bounded
tile samples establish available data. They do not establish a public pedestrian
graph, verified opening hours or reconstructed facades. Licensed media and owned
scans remain optional production methods with separate rights and review costs.
The actual Paris capture shows the Eiffel Tower as approximate tall extrusions,
without its open lattice silhouette. Global map styling therefore establishes
consistent orientation and interaction; recognizable landmark geometry needs
its own reviewed detail. The coverage research records this observed boundary.

The revised glazing is an opaque authored approximation. Agent review establishes
visible material separation and usable controls; enjoyment, emotional value,
recognition and physical-device performance need human observations. Replay in
Sprint 2B stays conditional on that evidence.

Q03 remains open P1. The size guard removes unnecessary map canvas resets but the
matched observations establish no reliable latency improvement. Together has no
public backend or configured LLM; its service remains locally tested. No paid
hosting, tunnel, account or media service is introduced by this iteration.
