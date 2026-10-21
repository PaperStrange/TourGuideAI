# Lively streets and geographic production · 21 October 2026

Runtime/source implementation: `9f5725d94e5a82e18acdf116e6da8a034c82fe65`.
Final internal-viewer shadow correction and reusable HTTP checks: `218fd16`.
The final 95-file application package is
`3e72aa1c53596042a14d1fb2aae9556b0a2caa876be93d424ec9ebe2aebb0162`.
CI `39552515626` completed successfully. Pages runtime `17b8f37` is published and
verified: **95/95** actual HTTPS files match and **16/16** hosted journey checks
pass with zero page exceptions. Metadata-only commit `09fec3a` records the result.

## Research and implemented behavior

The [sandbox-engine decision](../../docs/sandbox-engine-research-20261021.md)
was committed before production. Retain Three.js and MapLibre while adopting
source-bound modular content, shared materials, bounded resource use and selective
activity. Spatial streaming and engine migration remain future decisions requiring
measured benefits. PlayCanvas is a conditional authoring/lighting challenger;
Babylon is a conditional navigation/simulation challenger.

Ginza gains source-supported neighboring buildings and street surfaces, revised
glass response and night-light pools. Its existing approximately 55.28 m walking
corridor, Wako geometry, actor and saved-view meaning are preserved. All Kyoto
assets remain unchanged. The final Ginza model has **8,148,792 bytes**, **87,154
triangles** and **55 batches**; the complete place pack has **8,268,894 bytes**.

The [geographic site workbench](../../content-tools/README.md) prepares captured
OSM data with osm2geojson, pyproj and Shapely, exports editable Blender scenes and
shared-material GLBs, and provides a local bilingual browser for source inspection.
Delft and Helsinki exercise two countries, different building density and courtyard
geometry. Original geographic data, observed/derived/authored heights, exclusions,
rights, coordinates and stable feature identities remain explicit. The viewer
checks coherent source/context/model identities and supports actual orbit, pan,
zoom, reset, source picking, day/night and failure recovery.

These two outputs are internal geographic-context previews. Roof forms, facade
design, terrain and walking access require independent review before publication
as playable packs. No country-wide accuracy, navigation or architectural realism
is established by successful conversion. The separate OSM2World experiment
retains its [failed automatic-production gate](converter/README.md).

## Validation evidence

| Evidence | Result and scope |
| --- | --- |
| [Application](final/unit-checks.txt) / [service](final/service-checks.txt) / [repository](final/repository-gates.txt) | 121 / 13 / 17 checks pass. |
| [Local interaction reports](final/README.md) | Full 81-check pack walkthrough on preceding `db924643…`; corrected final material passes 12 checks at seven identical poses. Exact four-file asset delta is retained. |
| [Final CI place-pack report](ci/current/packs-result.json) | 81/81 checks pass on final `3e72aa1c…`, including actual walking, normal-motion recovery, saved returns and resource lifetime. All 95 packaged files match. |
| [Complete packaged CI](ci/README.md) | Original walk 133, perspective 80, companion 73, homepage 65, solo 75, packs 81 and extended walkthrough 264 all pass. Seven report manifests match every final packaged file; artifact ZIP digests match GitHub metadata. |
| [Ginza art review](art/README.md) | Actual day/night, desktop/phone and both-frontage review; original 42 protected meshes and all 55 meshes across the glazing revision retain geometry/transforms. |
| [Source and GLB audit](workbench/README.md) | 18 strict source tests pass. Both actual GLBs parse with source identities and repeat byte-for-byte; editable `.blend` bytes differ between processes. |
| [Workbench browser](workbench/browser/site-workbench-result.json) | 36/36 checks pass on actual exports, including landmark picking, keyboard/touch, day/night, EN/ZH, resource stability and denied-load recovery. |
| [Map response investigation](performance/README.md) | Q03 remains open P1. Antialiasing remains enabled after matched edge-quality review. |
| [Provider retry](final/map-retry/README.md) | 18/18 checks pass on the final package: actual style/tile failures recover in EN/ZH with view, route and private data preserved. |
| [Workbench HTTP](workbench/http-result.json) / [shadow review](workbench/shadows/README.md) | 40 HTTP/coherence checks pass. Eight matched visual pairs accept the corrected shadow fit for geographic-context review. |
| [Actual published verification](hosted/README.md) | 95/95 HTTPS file hashes match; 16/16 desktop journey checks pass, covering walking, camera, lighting, both-area saves/returns, EN/ZH and Maps order. |

Counts overlap and remain separate. Automated checks establish their stated
behavior and data boundaries. Human recognition, enjoyment, emotional value and
physical-device fluency remain unverified. Backend testing remains local and
requires no paid hosting or new account.

The final package's unchanged Q03 protocol records **1187.8 / 1061.8 / 1156.5 ms**;
each exceeds 500 ms. The context viewer retains faint Helsinki foreground-ground
modulation as P2 polish. Landmark architecture and real nighttime appearance remain
unreviewed for both generated contexts.
