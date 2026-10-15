# Homepage journeys · Explore and Together

2026-10-15 · Approved implementation in progress. Lead owns homepage integration
and publication. The user selected a small hosted backend for shared journeys.
The [checkpoint](agent-checkpoint.md) records the released baseline; the new
homepage remains unverified until its own release evidence is recorded.

## Two modes with one geographical context

**Explore** opens around a place search and the selected destination. A person can
inspect sourced places, change between the available map/3D views, select places
and review an ordered local journey. Search results must carry a recognizable
place name and enough country/city context to choose the intended destination.

**Together** opens an invitation-based room with a world map. Each participant can
add countries or cities they dream of visiting. The group reviews a suggested
journey, requests a revised suggestion and accepts the current proposal. Selecting a destination
opens its local context and available 3D view. The room exposes contributions from
its participants; it does not imply a public worldwide activity feed.

The geographical progression is world → country/city → local places. Keep the
selected destination, journey and return path visible across map/view changes.
Repeated searches or mode changes must preserve deliberate selections until the
person edits or clears them. Joining a room requires an explicit action and name.

## Page layout and concise guidance

Keep the map or scene central. The header contains TourGuideAI, Explore/Together,
language and available appearance controls. Explore places search above the map;
Together places room context and participant wishes beside it. A compact journey
panel holds selected stops and review actions. On a phone, the journey and room
panels follow the preview in page order with readable section headings and controls.
Direct proposal-reordering controls are deferred; the service supports that operation.

| Purpose | English | 中文 |
|---|---|---|
| Mode | Explore | 探索 |
| Mode | Together | 一起探索 |
| Search | Search a city or place | 搜索城市或地点 |
| Personal wish | Add a place you dream of | 添加你向往的地方 |
| Room wishes | Places we want to see | 我们想去的地方 |
| Invitation | Invite someone | 邀请同行者 |
| Join | Join this journey | 加入这段旅程 |
| Proposal | Suggest a journey | 生成旅程建议 |
| Review | Review the suggested journey | 查看旅程建议 |
| Acceptance | Agree to this journey | 同意这段行程 |
| Local exploration | Explore this destination | 探索这个目的地 |
| Detailed scene | Detailed Kyoto scene | 京都精细场景 |
| Wider view | 3D map | 三维地图 |
| Provenance | Sources and coverage | 来源与覆盖范围 |
| Service unavailable | Shared journeys are unavailable. Your own exploration is still here. | 暂时无法使用共享旅程，你仍可自行探索。 |
| Reconnect | Reconnecting to this journey… | 正在重新连接这段旅程…… |

Use source names in their original writing alongside localized UI when useful.
Room connection state belongs near the room title. A participant's last selected
destination should say what they selected; it cannot establish online presence,
their physical location or their current activity.

## Source, route and visual meaning

Search and nearby place results retain their provider identities and source links.
Current discovery uses Photon search and nearby English Wikipedia articles;
[source coverage](discovery-sources.md) records representative coordinates,
description-based category inference and language limitations.
Representative coordinates identify a place reference; exact entrances and current
access require their own evidence. No-results, provider failure and unavailable
coverage need distinct messages that retain the search and selections.

An ordered list or a connecting line across countries shows **journey order**.
Walking geometry, durations and access claims require an appropriate routing source.
The existing Google Maps handoff computes routes externally. Local category-based
place suggestions and LLM-generated proposals must be distinguishable. The LLM may
select only valid catalogue IDs and explain its proposed order; sourced place facts
retain their original provenance. A proposal becomes shared state only through an
explicit action. An unavailable model reports unavailable planning.

The detailed Kyoto scene has authored, source-informed architectural features and
its existing walking boundary. Wider 3D maps have the actual provider's coverage,
geometry and height limitations. Label that representation when it opens. Searching
another city must never display Kyoto as that city's detailed reconstruction.
Changing to 3D must retain the selected destination; missing 3D coverage offers the
available map with an explanation.

Building appearance and day/night remain release criteria. Review recognizable
Kyoto features, material differences and readable shadows at matched camera views.
Wider building geometry must correspond to its source location. Appearance changes
preserve the camera, selected places, room and proposal. A map theme and a lighting
change must be described according to what actually changes. Neither establishes
current weather, opening hours or a real visit.

## Shared-state behavior

The service stores room participants, their wishes, catalogue places and the current
proposal. Invitation access and participant editing credentials are separate.
Invitation tokens travel in the URL fragment; participant credentials remain in the
creator/joiner's session storage and are excluded from invitations and snapshots.

Two independent participants must see each other's accepted edits. Conflicting
revisions preserve the current server state and explain that the room changed;
stale edits are not applied automatically. Reconnection loads a current snapshot.
Editing a proposal clears prior acceptance, and a newly joined participant must
accept the proposal before everyone is shown as agreeing. LLM generation by itself
does not imply agreement or insert a new shared proposal.

Room sharing includes intentional contributions. Existing private meaningful-place
marks, notes and browser GPS samples stay outside the room. Location continues to
require explicit foreground use in the companion. The new homepage links that tool.

## Existing state and links

The original Kyoto walk remains at `walk.html`. Legacy `index.html?lighting=day|night`
links must reach that walk with their chosen appearance. The fresh homepage uses
`index.html`. Preserve `travel.html?lang=…&stops=…`, including explicit zero selections,
`perspective.html` mode and shared-fragment links, and `journey.html#recap=…` readers.

Retain the independent `tourguideai:journey:v2`, `tourguideai:perspective:v1`,
`tourguideai:travel:v1` and `tourguideai:appearance:v1` records. Homepage/room state
uses its own versioned storage. Do not silently import private records into a room,
reset the original walk or reinterpret its three IDs as arbitrary world destinations.
Storage failure must leave current in-memory selections usable with truthful feedback.

## Release evidence

1. EN/ZH desktop and phone flows: search → intended destination → sourced local
   places → reviewed journey; map/3D and day/night preserve user state.
2. Two separate browser sessions: create/invite/join, contribute different wishes,
   observe updates, review/request a revised proposal/accept, recover from a revision conflict and
   reconnect. Verify server restart persistence against the real service.
3. Real provider requests establish search/coverage behavior. Test an actual model
   response when configured, and honest unavailable planning when it is not.
   No configured hosted service leaves Together visibly unavailable.
4. Old saved records and all listed link types retain their meaning. Recipients
   do not overwrite their own journey, and invitations contain no participant secret.
5. Inspect the actual EN/ZH interface and matched Kyoto lighting views; run relevant
   automated checks, push source and verify the exact hosted frontend and backend
   versions. A local service test does not establish hosted availability.

Human review still determines enjoyment, recognizable realism, emotional expression
and practical field usefulness. The existing feedback about continuous exploration
and expressing attachment remains open; a shared route does not close that question.
