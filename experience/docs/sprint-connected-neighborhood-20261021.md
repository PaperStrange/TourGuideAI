# Connected neighborhood walks · 2026-10-21

The user approves implementation of a continuous 1–2 km neighborhood walk with
5–8 sights, consistent street detail and richer solo recommendations. Desktop
performance has priority; phones retain the interaction with reduced visual detail.

## Experience and acceptance

The pilot starts at Shijō–Karasuma and connects Mitsui's frontage, Nishiki Market,
Nishiki Tenmangū's street approach, Takase River, Pontochō's southern entrance and
the Shijō Bridge viewpoint. The source audit verifies mapped pedestrian edges,
distance and crossings, and records the evidence available for grades and covered
market clearances. Actual grades, current access and surveyed clearances remain
unverified in this pilot. The browser walkthrough must verify the authored virtual
ground and arcade clearance independently of those real-world unknowns.
The crossing is a departure waypoint. Shop interiors are outside the route.

The player walks continuously, looks around, inspects visible architectural
features, chooses daylight or night and keeps private views anywhere. English and
Chinese controls, optional information, existing saved places and Maps export
remain supported. A chosen itinerary persists when another place is previewed.

Recommendations use identified sights, stated interests and the reviewed pedestrian
network. They offer up to three distinct alternatives where the content supports
them, with editable selected stops. Distance comes from route geometry. Every sight
retains source identity, approach location, localized information and review date.
Hours, prices and access statements require supporting evidence.

## Delivery and responsibilities

| Sprint | Owners | Completion evidence |
| --- | --- | --- |
| N00 · Route and sources | World content, product, QA | Source bounds, rights, complete connected route, sight identities and benchmark protocol |
| N01 · Continuous movement | Engineering, navigation, QA | Persistent simulation/camera, resident ground, branching pedestrian navigation, streamed section lifecycle and interruption recovery |
| N02 · Street detail and solo journey | Art, world content, product, lead | Reviewed connecting façades and sights, day/night, compressed assets, persistent editable sightseeing journey |
| N03 · Acceptance and publication | QA, art, lead | Actual-input walkthrough, visual review, performance evidence, regression results, source/Pages/evidence identities |

World content owns geographic intake and `src/neighborhoods/shijo-east/`.
Engineering owns the route scene, loading, residency and runtime integration.
Navigation owns the new pure graph navigation module. Art owns Blender production
and spatial assets. Product owns pure recommendation and journey-session modules.
The lead owns homepage integration, documentation, builds, commits and publication.
QA independently verifies behavior and evidence. Browser/GPU work is scheduled
exclusively; agents coordinate shared data interfaces before editing dependent code.

## Rendering and data

Retain Three.js, MapLibre and Blender. One route scene retains the player, camera
and lighting. Approximately 100 m scenery sections load ahead of movement, with
whole-building and junction boundaries respected. The entire reviewed navigation
graph and inexpensive ground remain resident. Required missing scenery prevents
entry at its boundary; retry preserves the current journey. Detailed assets refine
complete basic surroundings and can be released independently of navigation.

A versioned route definition records its geographic frame, stable nodes/edges,
sights, section bounds and asset hashes. A separate private route session records
the chosen order, position, camera, lighting and progress. Existing saved views
remain readable. These identifiers support later shared walking; multiplayer
transport and hosted services are outside this milestone.

Source geometry, observed architectural features and authored interpretation remain
distinguishable. Blender modules share material resources while retaining local
building proportions and recognizable landmark features. Runtime detail levels
preserve feature identity. Compression requires matched visual verification.

Initial budgets: critical startup assets at most 4 MiB; ordinary sections at most
2 MiB; two simultaneous downloads and one decode/attachment job; 200,000 visible
triangles, 120 draw calls and 96 MiB estimated active textures. Record exceptions
and their evidence before accepting a package. Shadow and transient decoder costs
are measured separately.

The retained Mitsui near-detail assembly has an explicit 3.5 MiB transfer ceiling
to preserve its reviewed architecture. Its base representation and all ordinary
sections retain the 2 MiB ceiling; critical startup retains the 4 MiB gate. Geometry,
UVs and source indices remain exact through compression. The near-detail exception
requires matched visual review and actual streaming evidence.

## Verification and release

Walk the complete route in both directions and visit every sight through actual
controls. Exercise section boundaries, reversal, inspection, a 15-second delayed
section, failed requests, retries, cancellation, saved returns and reloads. Ground,
position, camera intent and private words persist. Repeated visits must stay within
declared resource budgets; hidden scenes retain zero update/draw behavior.

Review every connecting block and sight in daylight and night, including arcade
clearance and river/bridge approaches. Check desktop and touch controls, EN/ZH
copy, original pack/save compatibility and every Maps stop.

Desktop targets are first usable walking within 8 seconds at 10 Mbps / 80 ms RTT,
warm entry within 3 seconds, p95 frame interval at most 33.3 ms and p95 input
response at most 100 ms; aim for 60 fps. Record actual hardware, renderer, browser,
viewport, quality, cache state, input trace and exact package. Software-host results
cannot establish physical GPU or phone performance. Q03 retains its existing
three-independent-warm-action threshold below 500 ms and remains open until passed.

The lead commits and pushes reviewable implementation units, updates the agent
checkpoint, freezes the verified package, runs required CI and publishes through
the existing Pages workflow. A source or quality gap is reported before reducing
the approved scope. No paid infrastructure is required for the pilot.

The connected-neighborhood CI job has a bounded 240-minute software-renderer
execution allowance and a 40-minute limit per walking leg. The actual test covers
2,706.888 m out and back, with a longest leg of 458.534 m. The initial software
probe measured 0.593 m/s overall and 0.276 m/s during its final minute; these
observations justify the tooling allowance and fail the intended fluent experience.
This allowance does not change the startup, frame, input or Q03 acceptance targets.

## Geographic expansion

Reuse source adapters, architectural components, route definitions and the same
acceptance process. Distinguish map coverage, geographic 3D context and reviewed
walking routes. Record production hours, transfer bytes and review failures per
kilometer before forecasting additional-country delivery.
