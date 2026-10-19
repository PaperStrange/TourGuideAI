# Reviewed interactive places · 19 October 2026

Runtime source: `379e9d3223d5352ca298e841a7ccbb3694c75d8c`.
Tested 94-file package:
`5a8e0f67506cd164e7422e8aaf22c6a77685c4a7996168aac16703a6b0d0deb7`.
The [plan](../../docs/sprint-packs-20261019.md) was committed as `997afd8` before
production. Complete packaged regressions pass; publication verification is in progress.

## Delivered behavior

Shijō–Karasuma and Ginza/Wako share pack selection, walking, orbit/tilt/pan/zoom,
day/night, optional visible-surface inspection and private saved return. Ginza
follows approximately 55.28 m of connected mapped sidewalk around two frontages.
Its corridor width and simulation surfaces are authored. In Ginza, choosing Keep
walking recovers an off-screen actor while retaining orbit and zoom. Older Shijō views
retain their coordinate interpretation; unavailable pack/revision records retain
their notes and show an explicit unavailable state.

The broader map keeps its shared style and real provider identity. Nearby
suggestions and Maps handoff preserve actual selected coordinates and visiting
order. Private saved words stay independent from shared rooms. No hosted service,
model credential or paid deployment was added.

## Exact local evidence

| Evidence | Result and scope |
| --- | --- |
| [Application checks](final/unit-checks.txt) | 120/120; geometry/navigation, camera recovery, real asset verification/cancellation, saved-state compatibility and existing units. |
| [Room service](final/service-checks.txt) | 13/13; actual HTTP, SQLite, participants and service lifecycle. |
| [Repository gates](final/repository-gates.txt) | 17/17; no skips. |
| [Source review](ginza-wako/README.md) | 124 source checks and five exported-source checks, with actual OSM response and operator/reference records. |
| [Final interactions](final/interactions/packs-result.json) | 51/51; desktop/phone walking, boundary/input release, second-wing framing, optional inspection, EN/ZH, notes and cross-area return, real Maps coordinates, high-detail framing recovery. |
| [Recovery and resources](final/recovery-resources/packs-result.json) | 23/23; canceled loading, denied-model retry, unknown revisions, stale searches, real delayed Wikipedia locale completion, repeated switching, hidden work and private-room isolation. |
| [Full local solo](final/solo/solo-result.json) | 75/75; both locales, desktop/phone, actual map interaction, private records and saved returns. |
| [Full local homepage](final/homepage/homepage-result.json) | 65/65; real provider discovery, two participants, service availability, localized links and mode transitions. |
| [Full local extended walkthrough](final/walkthrough/walkthrough-result.json) | 264/264; both journeys, legacy pages, touch/keyboard controls, real local rooms, service confirmation, denied model/HDR recovery and actual Reset controls. |
| [Complete CI browser reports](ci/README.md) | Original walk 133, perspective 80, companion 73, homepage 65, solo 75, packs 75 and extended walkthrough 264; every report passes on the same 94-file package. Workflow finalization was still in progress at artifact retrieval. |
| [Art review](art/README.md) | Actual openings, moving/closer views and recovery frames compared with licensed references; capture/package boundaries are explicit. |
| [Language latency](performance/README.md) | Three matched warm actions: 1223.2 /1104.9 /1170.7 ms. Q03 remains open P1 against each action below 500 ms. |

Counts overlap and remain separate. Actual browser reports bind complete package
file hashes, driver hashes, requests, poses and captures. Successful loads use the
immutable build; failure cases explicitly delay or deny actual requests. Providers
receive real requests with TLS verification. No replacement success payload is
used. Local browser checks use bundled Chromium `151.0.7922.34`; the separately
matched latency probe retains Chromium `151.0.7922.173` and its prior protocol.
Local screenshot files are retained beside their reports under the original
basenames; absolute workspace capture paths in raw reports identify those files.

## Art, resources and scope

The new model is 7,970,296 bytes, 84,624 triangles and 48 batches, within the agreed
8 MiB /100,000 /64 limits. The whole pack is 8,000,958 bytes. Its twelve original
maps contain 1,376,256 decoded pixels: 5,505,024 bytes at RGBA8 base level, excluding
mipmaps and allocation overhead. Actual GPU byte allocation is unmeasured.

Across three return cycles, Ginza retains 70 renderer geometries and 24 textures;
Shijō retains 111 and 28. Each settled scene has one active instance, one canvas
and zero pending loads; replaced instances are disposed. Hidden sampling records
zero updates, draws or additional detailed-asset fetches over two seconds. Together
startup requests no detailed-area assets. These are bounded resource observations,
with no physical-device performance guarantee.

The model, traveller, finishes and lighting assets of existing Shijō remain
byte-identical to the preceding published package. The [authoring guide](../../docs/area-pack-authoring.md)
records the reusable process and recurring source/art/review responsibilities.
Production work and the 107.62-second export invocation are recorded in the art
review; authoring hours and future production throughput were not measured.

Ginza's surrounding road/buildings remain simplified context. Glazing, lighting,
unseen geometry and collision widths are authored; current access and a surveyed
reconstruction are not established. Human recognition, enjoyment and emotional
value remain unverified. Replay remains conditional future work.
