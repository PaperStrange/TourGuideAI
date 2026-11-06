# User lessons and acceptance traceability

5 November 2026 · Product and QA maintain this register. Its requirements come
from the user's retained feedback and approvals. Each row identifies the test,
evidence and decision needed to close the concern. Absence of evidence leaves
the requirement open. The [benchmark protocol](benchmark.md) fixes the comparison
conditions and selection rules.

| ID | Requirement and retained lesson | Test / required evidence | Decision |
| --- | --- | --- | --- |
| L01 | Recognizable real architecture: repeated façades, rigid buildings and simplified roads weakened realism | Held-out independently sourced photographs excluded from authoring; matched eye-height frontage, corner, entrance and reverse views; location-indexed mismatch records | Art accepts each sight and every connecting section only with source-backed identity; [coverage audit](research/source-coverage.md) remains open |
| L02 | The milestone is the complete 1.35 km walk: two separate sites did not communicate a continuous six-sight journey | Record all 54 edges both directions, covered passages, connections and bridge; associate gaps and interruption defects with route edge IDs | Complete-route continuity is mandatory; [T04](experiments/trial-definitions.json) is the release extent |
| L03 | Each of the six sights must be discoverable while walking without product indications | Fresh participants, hidden sight labels/pins/arrival prompts, retained controls/real signage; spontaneous notice locked before held-out photo matching | Each cohort ≥7/8 jointly notice and match every sight; [participant protocol](benchmark.md) |
| L04 | Live interaction carries the experience: reading and recorded visuals alone did not establish immersive play | Native movement, turns, close approach, pause and return; retain inputs, actual submitted camera/state and draws; distinguish publisher frames and tested actions | Require playable evidence; [competitor records](research/competitors.md) retain their bounded evidence categories |
| L05 | Building detail and plausible illumination must work together in daylight and night | Site-specific architecture under consistent materials/rendering; review shadows, physical fixtures, exposure transitions, contact and baked highlights against held-out references | Both lighting modes pass independently; darkening a daylight image does not establish night acceptance |
| L06 | Old links and fragmented paths disrupted immersion | Ordinary homepage/shared entry → Start/Resume → Route/Place/Saved panels; keyboard/pointer, focus, Escape, explicit movement resume and return | One coherent journey, ≥7/8 unaided completions per cohort; shared planning and reviewed walks have clear entry states |
| L07 | English UI contained Chinese descriptions; guidance must serve both target languages | EN/ZH controls, objectives, loading, empty/error states, unavailable services and share flows; preserve authentic Japanese source signage | UI language is consistent in each complete journey; signage remains attributable scene content |
| L08 | Sharing should convey finding a meaningful place; checkpoint text and instructed completion are insufficient signals | Keep location, actual view, lighting and route; restore them on return; optional words and explicit sharing consent; measure spontaneous saving separately from instructed saving | Preserve existing saved-record compatibility and personal expression; no inference of emotional value from task completion alone |
| L09 | A standalone HTML file was unusual as the main sharing action; the whole trip should open in Google Maps | Explicit Maps / personal view / optional card actions; verify all stops in order, continuous segment boundaries, ≤3 intermediate waypoints per Maps URL and reopen behavior | Offer scenario-appropriate sharing choices; route information survives export |
| L10 | Real-world location sharing can support travel, with user control | Foreground consent, Stop/Resume, denied or stale fixes, manual exploration and return; separate real-phone field accuracy observations | Preserve the usable manual journey; simulated location tests cannot close field accuracy |
| L11 | City/country scope needs reliable coverage and truthful availability | Distinguish searchable places, reviewed walkable packs, local backend and public service availability; test missing coverage and connection errors | A search result never promises detailed 3D coverage; synchronized multiplayer walking remains a separate milestone |
| L12 | Repeated stops and inflated claims made progress difficult to verify | Provenance and hashes, portable evidence, source/saved-record compatibility, validated checkpoint and synchronized commits; ordinary public entry and published-byte check | Report actual gate state and preview identity; [backlog](backlog.md) distinguishes delivery from external dependencies |

## Current evidence boundaries

The [retained performance observations](../../evidence/neighborhood-20261024/performance/candidate-13/README.md)
include 892.0 ms event-to-draw p95, 972.3 ms observed frame-interval p95 and
missing frame intervals. The [retained Q03 observations](../../evidence/neighborhood-20261024/performance/candidate-13-q03/README.md)
are each above 500 ms. These results remain calibration cases for the new
measurement implementation, with their original device and protocol scope.

Current-year issue review covers 2026 issue creation and updates. The GitHub queries
`created:2026-01-01..2026-12-31` and `updated:2026-01-01..2026-12-31` for this repository
on 5 November 2026 each returned zero matching issues. Earlier issue records are outside
the user's requested iteration scope. New current-year issues may enter this
register when their behavior is reproduced against the current application.

Physical-device access, fresh participants, source acquisition quotes and any
needed capture permission/funding remain explicit dependencies. The scene audit
and benchmark implementation can proceed while their status is recorded; dependent
acceptance and final representation selection remain open.
