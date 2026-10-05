# Kyoto content contract

Owner: world-content. Current scope: the existing Shijō–Karasuma street slice,
three useful encounters, and three unfinished south door interactions. No new
venues or reconstructed interiors are claimed.

## Independent application boundary

`src/content/kyoto.js` is the canonical content module for this application and
its Blender authoring pipeline. It has no imports, network requirements, or
runtime dependencies outside `experience/`. The browser and Blender generator
consume the same exports:

| Export | Meaning |
|---|---|
| `WORLD` | Local metre coordinates, street presentation, sourced frontage spans, building identities and source-reported levels |
| `DOORS` | Ten authored doorway positions, each with `tenant: null` |
| `TARGETS` | Three complete public-space/frontage encounters and three unfinished interactions |
| `PRIMARY_TARGET_IDS` | `crossing`, `mitsui`, `mufg`; only these count toward the current encounter set |
| `SOURCES` | Stable source IDs, direct URLs, checked dates and reuse/provenance notes |
| `CONTENT_PROVENANCE` | Local evidence URLs, attribution, translation and presentation boundaries |

The two evidence files are shipped under `public/content-evidence/` and are
available without a network request to the original websites. `geometry.json`
contains the selected source-derived geometry and classifications;
`operator-facts.json` contains the checked operator facts, direct source URLs,
HTML hashes and retrieval times. Neither is a full copyrighted webpage archive.
The geometry file's historical `sourceFile` and hash identify the earlier
curated snapshot; they are an archival citation, never a file that this app must
open. The selected values and their OSM identities are present in the local file.

Operator facts and evidence were migrated without changing their meaning or
checked dates. Copying an existing source record does not constitute checking it
again. The module adds the existing snapshot's reported eight levels for each
building; no new measurement, venue, or visit claim results from this addition.

## Geography and visual fidelity

Coordinates are metres in the existing local frame: X east, Y north. Blender uses
X east, Y north and Z height; the expected glTF/browser mapping is
`(east, height, -north)`. Render projection and camera composition must not change
saved world coordinates or interaction IDs.

| Building | West/east X | Frontage Y at those endpoints | OSM identity |
|---|---|---|---|
| 京都三井ビルディング | 16.522069 / 58.329294 | 4.659507 / 4.770448 | way 205732558 |
| 京都ダイヤビル | 17.526173 / 35.691321 | −19.969317 / −19.747436 | way 205732536 |

Both local source records report `osmBuildingLevels: 8`. This is exposed as
`levels: 8`, with `levelsProvenance`, and means an observed OSM `building:levels`
tag. It does not establish surveyed height in metres, storey height, window
spacing, material, roof shape or a current photographic elevation. An eight-level
visual arrangement can use that count while keeping its dimensions and appearance
authored. A foreground cutaway is a visibility treatment, not a shorter real
building; retain that distinction in asset metadata and review materials.

`northFacadeY` and `southFacadeY` are flat presentation approximations of the
slightly sloped source frontages. Use `yFrom`/`yTo` for the actual mapped slope
when refining geometry. The source crossing lies at X 20.721; its mapped footway
links Y −17.529 to 2.330. Those endpoints are sidewalk centrelines, not surveyed
kerbs. Zebra width, stripe arrangement, road surface bounds, paving, street
furniture and signal appearance/timing remain authored.

The main encounter markers are reading points in public space. The MUFG marker
at `(24.7, −18.5)` is not a surveyed bank entrance or the bank's mapped centre.
The Mitsui marker is similarly a frontage reading point. None of the ten authored
doorways has a known tenant binding. Do not attach the bank, shirt shop or station
exit to a specific doorway because it happens to be nearby.

The available evidence supports names, frontage relationships, reported floor
counts and useful access/service facts. It does not provide a licensed facade
photograph or observed material palette. Refinements should preserve that modern
commercial identity without inventing a temple, traditional shop, advertising
copy, floor plan, entrance sign or an observed roof profile.

## Interaction and itinerary meaning

Each target contains bilingual `title`, its parallel `originalJapaneseName`,
`interaction.eyebrow/title/body/facts`, `choices`, `sources`, and position
provenance. Every fact's `sourceIds` resolves through that target's source list.
Facts without source IDs describe an explicit limitation, not an additional
world fact. English/Chinese names and game prose are authored translations and
presentation; Japanese source names remain available alongside them.

Every choice includes bilingual label, description and outcome plus
`addsToRoute` and `routeKind`. These are planning effects, not proof of a service
being used. `nextTargetId`, when present, suggests the next encounter without
hiding other known places.

- The crossing choice establishes a north-first or bank-first preference.
- Mitsui can add a station-access note or remain only a remembered encounter.
- MUFG distinguishes an ATM plan, a staffed exchange plan, and no cash stop.
  The published schedules, maintenance and card restrictions travel with their
  source references. No live open-now status, exchange rate or individual total
  charge is inferred.
- `D-S1`, `D-S3` and `D-S5` remain `modelled: false` placeholders. Opening them
  cannot increment complete encounters or add a claimed venue to the itinerary.

Keep these states separate: approached, simulated visit, choice made, source
opened, and user-reported real visit. Arrival never makes a fact verified; clicking
a source link records only that action. Skipping a cash stop must remain a valid
choice and must not erase the encounter from a personal memory.

## Continuity and memories — confirmed travel-journey direction

The user confirmed the broad travel journey and specifically requested day
segments, small actions such as opening a door, and sharing the whole trip.
Personal notes are part of the current application integration. The schema below
is a recommended implementation model; recording the direction does not claim
that every proposed lifecycle, media or sharing feature is already implemented.
The current increment's note contract is optional text, at most 500 characters,
attached to a completed encounter and stored separately from city facts. Reset
clears those current notes; no archived history, photo attachment, day scheduler
or sharing service is implied by that local note feature.

Keep the immutable city content separate from a person's durable journey record:

| Record | Proposed content | What it must not imply |
|---|---|---|
| Journey | Stable ID, optional user title, selected destination, created date, ordered day IDs and optional user-chosen lifecycle stage | That the player actually travelled or that an inferred stage is user intent |
| Day | Stable ID, journey ID, user-selected date or ordinal day, ordered planned stops and personal notes | A confirmed real-world date, duration or feasible schedule inferred from the game |
| Encounter event | Event ID, journey ID, day ID, target ID, event kind, real recording time and content version | That a simulated visit is a physical visit |
| Small action | Simulation event ID, day ID, optional door/target ID, action kind and simulation-only status | That an authored door is a surveyed entrance or belongs to a specific tenant |
| Planning choice | Choice ID, target ID, route effect and source snapshot references | A completed withdrawal, purchase, exchange or guaranteed current opening |
| Memory | User-authored note/photo reference, optional user-reported visit date, linked target/journey and media origin | A verified public fact or permission to publish the memory to others |
| Real-visit report | Explicit user action, reported place/date and optional supporting media | Independent location verification; EXIF alone does not verify the visit |

Use distinct event kinds such as `door_opened`, `simulated_visit`, `choice_recorded`,
`source_opened`, `memory_attached`, and `real_visit_reported`. `door_opened` records
a small simulated action; it cannot by itself add a tenant visit, complete an
unfinished place, or certify an entrance. An actual event
timestamp records when the action was saved; a user-provided visit date records
what the user reported. Keep game time out of real-world duration claims.

Preserve earlier choices and source versions when a later trip changes them.
Multiple journeys may reference the same place without overwriting the first
memory. Current planning can read newer facts while an old memory still records
the source version available when it was made. No memory or friendly sentence
may silently become a new opening-hours, price, identity or transport fact.

Whole-trip sharing must include every selected day, its planned stops and chosen
personal notes, rather than exporting only the currently visible day. Preserve
the distinction between plans, simulated encounters and user-reported real visits
in the shared representation; include fact sources and dates where factual
service information is exported. A note is a personal account, never another
source citation. Let the person deliberately choose what personal material to
include before creating a shareable artifact.

Local saving, personal notes and whole-trip export can establish this continuity
without silently promising account sync, lifetime retention, a publicly hosted
link or location tracking. Those delivery capabilities remain separate decisions.
New day content must be supplied or explicitly planned by the user; duplicating
the three existing encounters must not be presented as additional real venues.

## Verification boundary

Migration checks compare all existing exports against their previous values,
allowing only the source-backed `levels`/`levelsProvenance` additions. Coordinates,
choice IDs, source dates, source-read semantics and placeholder state must not
drift during a renderer migration. Evidence checks compare copied bytes and
confirm both level counts in the local geometry snapshot. Browser and art
acceptance remain separate from this content equivalence check.
