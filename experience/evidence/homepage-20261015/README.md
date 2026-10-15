# Explore and Together · release evidence

Runtime source: `c3bf2309329eb1ff212f14d3e24697f38d98a23d` on
`chore-sow-delivery-plan`. Art refinement: `2767263`.
Pages publication: `eb8647d622d983280fba08fe9c23752aac1e81a4`.

The homepage replaces the entry diagram with the live Kyoto street window and
adds Explore / Together journeys. Explore searches real places, shows available
mapped geometry and suggests nearby sightseeing orders. Together uses the actual
local room service for invited participants, wishes and shared selected places.
Countries open an overview before local exploration. The original walk remains
at `walk.html`; the companion and saved-perspective entries remain available.

| Evidence | Result |
|---|---|
| [Final browser report](final/homepage-result.json) | 65 passed; 12 actual captures; zero normal browser errors |
| [Unit suite](unit-tests.tap) | 82 passed |
| [Server suite](server/node-tests.txt) | 7 passed with actual HTTP and SQLite |
| [Client integration](server/client-integration.txt) | 11 passed, including SSE reconnect and restart |
| [Container smoke](server/container-smoke.json) | Actual image, two participants and persisted state after restart |
| [Container build](server/docker-build.txt) | Build completed with proxy CA restricted to its build step |
| [Art comparison](art/after/report.json) | Six matched before/after camera pairs; geometry and texture counts retained |
| [Repository gates](repository-gates.json) | 17 passed |

The final package contains 80 files. Manifest SHA-256:
`fac5a7418a388b09033b2670ded3394a86e477bc3c9100a25b9d30f85a2dd642`.
Browser report SHA-256:
`1ac4aa8010fda2b48c2a4ca9d61f95ce9291156ed12e61d8cccdf9a99f9ac8b4`.
Backend source manifest:
`4237a0c875aebf367b2a58c1ab7d6815df83b2853811b44cb1b24ea080b6eb37`.

The browser used real Photon, Wikipedia and OpenFreeMap responses. The inspected
local area rendered nine building-extrusion features at zoom16.3/pitch56; the Japan
selection remained at zoom4/pitch0 and made no nearby-place request. Two isolated
browser contexts created/joined a real room, contributed and removed wishes,
received streamed state, selected shared views and retained their room on reload.
Input fields did not move the traveller; an actual pavement click did. EN/ZH and
phone checks retained the independent prior saves. Deliberately blocked providers
and an unconfigured model were tested as explicit failure/unavailable conditions.

The runner preserves source/build/driver hashes. Candidate runs and their TLS or
frame-wait diagnostics remain scratch artifacts; they are not the final evidence.
The browser used the environment's existing trusted proxy certificate with TLS
checks enabled. No successful external provider response was substituted.

This baseline release does **not** establish public shared-room or model availability.
All 80 published files matched the tested package in
[hosted verification](hosted-verification.json). The user subsequently chose local
backend testing with GitHub Pages before paid hosting. That connection work has
separate evidence and does not change this baseline report. Model configuration
and an actual model call remain pending. [Optional future hosting](../../docs/render-setup.md).

Agent screenshots establish presentation and compatibility, not human realism,
enjoyment, field usefulness, physical GPS accuracy or everyday-device frame rates.
Mapped global extrusions have different coverage from the authored Kyoto scene.
Google Maps handoff is verified as URLs; real route access and booking facts remain
external. The prior companion evidence remains in `../travel-20261015/` and retains
its original source identity.

Run `node verify-hosted.mjs c3bf2309329eb1ff212f14d3e24697f38d98a23d`
from this directory to compare all final browser-package bytes against Pages.
