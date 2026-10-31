# Milestone acceptance matrix

31 October 2026 · QA and product jointly own acceptance. All production gates remain
open. The [existing candidate-13 measurements](../../evidence/neighborhood-20261024/performance/candidate-13/README.md)
retain their original software-rendering scope.

| Gate | Method / required result | Current evidence |
| --- | --- | --- |
| Route | Walk all 54 edges, 1,353.444 m and six sights; inspect both directions and every connection | Current geometry identifies scope; new appearance remains unqualified |
| Fidelity | Held-out photographs at 1.7 m eye height, 2–5 m frontage, corners, reverse views and covered passages; record each façade, entrance and road mismatch | Source audit identifies missing material |
| Lighting | Independently review daylight and night, materials, ground contact, readable entrances and light sources | Matched night sources and production results pending |
| Discovery | First unaided walk hides sight labels, pins and arrival prompts; retain control guidance; record spontaneous notice of each sight before any prompt | No independent participant results |
| Recognition | After discovery, match each sight to held-out photographs; missed spontaneous discovery remains a failure | Each cohort must have ≥7/8 notice and correctly match each of the six sights |
| Journey | Entry → walk → inspect → keep view → return; no assistance; EN and ZH | Each cohort ≥7/8 complete; inspect keyboard, pointer, focus, Escape and explicit resume |
| Perception | Separate 1–7 realism and immersion ratings | Each cohort median ≥5/7 for both; record denominators and uncertainty |
| Loading | 10 Mbps / 80 ms; one cold and three warm entries on declared physical devices | First usable ≤8 s cold and ≤3 s for each warm entry |
| Full-quality readiness | Desired scene sections/materials resident, followed by actual submitted draw | Report separately from first usable; disclose delays in participant review |
| Responsiveness | Event timestamp → changed state/submitted draw, including browser queue | p95 ≤100 ms; handler-only timings and physical display presentation are separate |
| Frame cadence | Full-quality route traversal on physical GPU; retain raw frame intervals | p95 ≤33.3 ms; no dropped samples hidden |
| Together locale | Existing Q03 warm locale change protocol | Each <500 ms; current issue remains open |
| Rights and integrity | Object/asset provenance, licenses, coordinate reference system and vertical datum | No inferred appearance or authored elevations presented as surveyed facts |
| Release | Build identity, public URL, asset byte checks and native walkthrough | New production release pending |

## Participant protocol

Recruit **32 independent non-author participants**, eight in each EN/day, ZH/day,
EN/night and ZH/night cohort. Each person's first exposure uses their assigned mode.
Keep discovery before photo matching. A repeated day/night visit cannot establish an
independent first-exposure result for both modes. Report exploratory results without
claiming population-wide preference. Recruitment and physical-device access remain
unarranged; record them as dependencies rather than inferred passes.

## Resource and compatibility gates

- Startup ≤4 MiB; ordinary section ≤2 MiB; reviewed Mitsui near-detail exception ≤3.5 MiB.
- At most two downloads and one decode/attach; retained sections ≤64 MiB.
- Primary view ≤200,000 triangles / 120 draw calls; combined texture estimate ≤96 MiB,
  including HDR/PMREM, actor/contact/shadow targets. Report decoder and geometry overhead separately.
- Future KTX2 intake requires loader and memory-accounting support before claiming savings.
- Preserve place IDs and saved notes. Geometry revisions preserve historical records and
  offer an explicit visit to the current location. Eye-level saved views require backward
  reading of existing orbit records. No persistence/API changes occur in this organization sprint.

Renderer eligibility requires rights, continuous movement and performance. Score eligible
representations using 45% realism/recognition, 35% immersion, 10% travel usefulness and
10% cost/scaling. Publisher videos supply reference observations only; the matched Kyoto
trials supply the production decision evidence.
