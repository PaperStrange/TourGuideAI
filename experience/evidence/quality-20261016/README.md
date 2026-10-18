# Quality sprint evidence · 2026-10-16

The [sprint plan](../../docs/sprint-quality-20261016.md) defines the navigation,
language, loading and complete-journey review. The source branch is
`chore-sow-delivery-plan`. Runtime source is
`828a405194d82e465887b15c8bcaedfaa3d04f9d`; final package manifest is
`8751ba4ecb6f6fcec70d1c2d25cff41b074671ea4433d3bf5b4a087ac810d2fb`.
Pages runtime commit is `c3bcceb`. [Published-byte verification](hosted-verification.json)
matches all 79 files. Test drivers are pushed as `54fdbaf`. The complete final local
original-walk regression passes 133 checks. All five final CI reports pass on this
package; Q03's locale-action latency target remains open P1.

## Recorded checks

| Evidence | Observed result and scope |
| --- | --- |
| [Application checks](checks/unit-tests.txt) | 89 passed; includes actual captured provider data and selected Maps coordinates. |
| [Room service checks](checks/server-tests.txt) | 13 passed against actual local HTTP/SQLite services. |
| [Repository gates](checks/repository-gates.json) | 17 passed against the staged delivery, with no skipped gates. |
| [Complete walkthrough](walkthrough-result.json) | 264 passed across EN/ZH desktop/phone, including supporting navigation, legacy inputs, selected sharing, real discovery, touch, actual rooms and recovery. Package `6cdc0ad9`; see the final CSS verification below. |
| [Complete final original walk](original-walk-result.json) | 133 passed on exact `8751ba4e`, bundled Chromium 151.0.7922.34. Actual three-encounter route, sharing/recipient/PNG/PDF, credits/return, graphics recovery, restart, migrations, HDR faults/retry and six matched comparison views. 14 scenarios and 37 captures; 04:41:19–04:57:59 UTC. |
| [Final homepage](startup/homepage-result.json) | 65 passed on final package `8751ba4e` using Chromium 151.0.7922.34, matching GitHub's browser build. |
| [Startup interaction](startup/interaction-result.json) | 8 passed on `8751ba4e`: one initial draw, actual keyboard movement, accessibility, rendered night, zero hidden updates/draws and resumed movement. |
| [Original-walk pause](startup/runtime-pause-result.json) | 19 passed on `8751ba4e`: held/released movement; encounter, share and reset dialogs; locale/focus/draft preservation; delayed real night HDR and startup completion beneath a dialog. |
| [Credits and return](startup/credits-result.json) | 3 passed on `8751ba4e`: actual localized popup, retained license/source checks and return preserving saved progress. |
| [Phone layout](phone-layout/after.json) | All six stages pass in the matching browser, before/after scene and fonts become ready, across languages and modes. Document and inner width stay 390px. |
| [Phone room journey](local-rooms/walkthrough-result.json) | 17 passed across EN/ZH; two isolated browser clients, real room writes, SSE/poll updates, invitation confirmation, reload and removal. |
| [Phone lighting recovery](lighting-recovery/walkthrough-result.json) | 15 passed across EN/ZH; deliberate model/HDR request denial, visible recovery, actual drag/Reset/Retry, preserved player state and restored resources. |
| [Partial map failure](map-recovery/after.json) | One actual tile request deliberately denied; error persists through locale changes and real Retry preserves the map view. |
| [Final performance](performance/final.json) | 12 actual HTTPS observations; exact final HTML in every run, zero page exceptions or failed requests. Together loads zero street dependencies, hidden updates/draws remain zero, and Explore draws once at startup. Warm Together locale actions are 1177.8 / 1113.4 / 1134.5 ms, failing the unchanged <500 ms target. |
| [Published final homepage](startup/hosted-home-result.json) | 21 passed on actual final Pages resources, including phone layout and downloaded-response hash checks. |
| [Final-source CI](ci/final-run-summary.json): [original walk](ci/final-original-walk-result.json), [complete walkthrough](ci/final-walkthrough-result.json), [homepage](ci/final-homepage-result.json), [perspective](ci/final-perspective-result.json), [companion](ci/final-travel-result.json) | 133, 264, 65, 80 and 73 passed, respectively, on exact final manifest `8751ba4e`. Run `38851871150` completed successfully for every scheduled suite. |
| [Provider coordinate review](provider-review/README.md) | Captured Wikipedia/Wikidata evidence and a bounded correction for one conflicting record. |
| [CI asset binding](ci-consumed-assets-binding.json) | Perspective 80/80 and companion 73/73 pass on `e9959df`. All requested assets match the CSS package `9a55e7b5`. Final startup scheduling changes renderer bytes; this is preceding-runtime evidence. |
| [First publication verification](published-css-release/hosted-verification.json) | All 79 files match `9a55e7b5` on actual Pages HTTPS. Hosted checks pass: 38 connection, 21 homepage/phone, 9 supporting navigation. |

## Package evolution and browser conditions

The [recorded CI homepage result](ci/e9959df-homepage-result.json) identifies a
search form extending to 463px in English and 442px in Chinese on a 390px viewport.
The matching local bundled browser reproduces all six affected layout stages in
[the original package](phone-layout/before.json). The final CSS allows the grid
track and form to shrink to the available width. Matching-browser layout and
complete homepage checks pass on the repaired package.

The [CSS package comparison](final-css-delta.json) records 75 byte-identical
files. The homepage CSS and its HTML reference change. The generated homepage
JavaScript differs only in its source-map filename; the source map differs only
in file metadata. The full walkthrough's application behavior and art evidence
apply to that CSS package, with layout independently verified. The 264 checks
from that earlier local report retain their package scope. The separate final CI
walkthrough above repeats and passes all 264 checks on `8751ba4e`.

The final startup package includes camera enabling in the first draw, avoids a
draw for DOM-only locale changes, and treats a repeated pause state as unchanged.
Its homepage and shared-runtime checks are recorded separately above. Geometry,
materials and lighting assets are retained. The earlier CI asset binding applies
to `9a55e7b5`; final renderer bytes have changed.

The local room and lighting reports identify the immutable built package as
`6cdc0ad9abd0ed507c3a883299164d04569b7a6ef7c789b30bcec7b8dd064935`.
Their frontend bytes are served under the Pages origin by the test harness;
successful external provider requests and loopback backend requests are real.
These local runs are distinct from actual published-page verification.

## Interpretation and limits

Browser local-network permission is granted by automation. Phone checks use a
390 × 844 touch viewport. Physical-phone performance, native permission/share UI,
field GPS use and human judgments of realism or emotional value remain unverified.
The backend stays local and no LLM provider is configured. Nearby suggestions are
source-linked visiting orders; Google Maps computes directions through the chosen
places. Detailed Kyoto remains an authored interpretation, with wider mapped
building coverage supplied by external providers.

The English lighting-recovery message and Reset outer boxes have a 3.36px edge
overlap at this phone size. Complete text fits, actual Reset restores the camera,
and Retry succeeds. Spacing polish is recorded as P2. Architecture and lighting
assets are retained; this sprint makes no new realism claim. All four render-ready
night captures and daylight references received an independent art review;
[screenshots](screenshots/) retain matching capture hashes in the walkthrough.

Reports retain original capture paths and driver hashes. Curated JSON files are
copied from ignored workspace evidence without changing their recorded results.
An interrupted diagnostic run or a failed driver setup is excluded from acceptance
counts. The `ci/` directory retains the initial failing job logs and the cancelled
intermediate original-walk run as diagnostic evidence; neither counts as a final
pass. CI `e9959df` failed phone layout and the original walk's stale localized-credits
selector. Its [original-walk report](ci/e9959df-original-walk-result.json) records
69 passing checks before the selector prevents the click. The final local original
walk passes 133 checks. The final CI reports establish their stated scopes and the
completed run summary verifies aggregate success on `8751ba4e`. This evidence does
not validate the later solo iteration or close Q03's latency target.
