# Agent checkpoint · Explore and Together homepage

2026-10-23 UTC · Lead owns integration, commits and publication.
**State: connected-neighborhood implementation is authorized and in progress.
The approved target is a continuous 1–2 km Shijō neighborhood with 5–8 sights,
desktop-first delivery and richer solo routes. Published runtime `17b8f37` remains
the verified baseline. Q03 is open P1; backend tests remain local.**

## Resumed iteration · 2026-10-23

The user explicitly resumed implementation toward the approved milestone.
The preserved starting checkpoint is **`57a8bf8795bb10a5bb264451f93b2414f0d4939c`**
on `origin/chore-sow-delivery-plan`. Its application, content, asset and test
implementation is **`6f9ccc247d269b8548b6103326bcf67431fd846a`**.
`cd70174` contains final crossing assets, complete texture accounting and browser
drivers; `6f9ccc2` strengthens successful detail-load checks, actual 15-second
loading recovery and inspection-event synchronization. The checkpoint/evidence
commit is metadata only. No new package has been published.

Commit **`6ee2248766c3ac1c3cbf219533a9279a7ed6b220`** is pushed. Its recovery increment preserves a failed preview until an explicit retry,
guards private journey writes against changed stored bytes, and reserves near-detail
capacity through loading/cancellation cleanup. Twenty targeted route, native-storage,
asset and scheduling checks pass. Font regeneration reports zero missing glyphs.
CI **39886300478** was superseded by **39888148078** on
**`ce2a59afd1a06b8cb17c60869f11ab1ec00a1ac0`**. Geographic preparation, perspective,
companion, homepage, solo, original-walk and reviewed-pack jobs pass. The complete
neighborhood job remains running at this checkpoint. This CI covers candidate-1;
the subsequent camera-input and river-context changes require their own validation.

The current immutable browser candidate is
**`artifacts/neighborhood-20261023/candidate-2`**, copied from the canonical
`experience/dist` build. Application checks pass **191/191**, with no skips.
Its 299-file package identity is
**`f27fbe22db95a007010d2d46a661f27752a2361f5d9d84aaa4e4588c498e0dc5`**.
Its scenery manifest is
**`90c0873c5e540147630c970d4a2ea692c1583b3c407c175a2659d4e1e93934c8`**.
QA has the exclusive browser window for native camera input, rendered-direction
walking, deliberate market inspection, day/night river views and resource counts.
Actual-view acceptance and the performance benchmark remain pending.

Preserved candidate-1 has 293 files and package identity
**`df711b7d06a0a921545cc82de1ffe3b26dec28a8dc3a86684d837fcdd5e1127c`**.
Actual recovery, native-storage preservation and desktop/compact detail-transition
checks pass **28/28**. A second tab writes during a real 15-second held opening;
stale completion and camera saves preserve its bytes, and Reload adopts its route
and night mode. Initial failure stays failed through a locale change until Retry.
Across actual boundary crossings, desktop retains at most three near sections
including reservations; compact retains one. The candidate is not accepted for
publication.

Candidate-1 arcade/bridge checks finish **10 passing / 2 failing**. Both failures
are fixed screen-point inspection scans; the full actor remains visible beneath
the arcade, entry into Look closer preserves the view, and ground checks pass.
A separate deliberate-control inspection run passes **4/4**, selecting the actual
market soffit without moving the player. The complete original reports and
executed drivers remain under `evidence/neighborhood-20261023/qa/candidate-1/`.
The inspection attempt exposed a usability issue: camera input was starting from
the hidden desired pose. Candidate-2 rebases actual drag, wheel and keyboard
adjustments on the visible recovered pose while preserving intent for a click or
mode entry. Ignored middle-button and three-finger gestures also preserve intent.
Walking input follows the rendered camera direction. Thirty-two focused
camera/legacy checks pass; actual browser verification is pending.

The camera retains desired saved OrbitControls intent and constrains the rendered
view against actual building and canopy geometry. Scoped `three-mesh-bvh` indices
preserve triangle/source correspondence and are released with their scene roots.
Recovery retains at least 5 m viewing distance and at most half-frame actor height,
with time-based collision-checked settling. Look closer keeps its entry composition
until deliberate camera input. The actual arcade-geometry sweep covers 300 adjacent
poses: minimum distance **5.0002 m**, maximum actor occupancy **33.85%**, maximum
adjacent camera shift **0.218 m**, and zero invalid recoveries. Geometry-query p95
is **2.011 ms** on this host; this does not establish rendered fluency. Portable
driver, output and asset identities are in `evidence/neighborhood-20261023/runtime-camera/`.

The art candidate adds 106 source-adjacent market façade edges, 114 authored soffit
sections and 39 bank faces. Canonical source geometry and navigation remain unchanged.
Derived input and roadway-mask reproduction are byte-identical; source checks pass
13/13. All 74 glTF files validate, and all 10,974 sampled corridor positions retain
coverage. Candidate-2 required daylight 3D resources total **4,159,329 bytes**,
below 4 MiB; night resources total **4,152,093 bytes**. The Mitsui NEAR exception remains 3.5 MiB;
ordinary/base sections retain 2 MiB. Source audits and reproducible commands are in
`evidence/neighborhood-20261023/world/` and `docs/neighborhood-authoring.md`.

**Remaining visual gates:** deliberate arcade input/inspection and the extended
river/city context in daylight and night. The frozen context input is
`57ae1683df42b8220591708cc9b01d71573da697fdf0290744aba44c41fc0006`, with 29 surfaces,
4,019 complete official building masses and 136 bank segments. Independent audit
and exact reproduction pass. Existing display overlap is zero; navigation remains
unchanged. The extent includes nearby retained route positions and remains beyond
the 270 m fog endpoint for the audited camera limits and aspect ratios up to 2.0.
Portable selected geometry, licenses and reproduction commands are in
`evidence/neighborhood-20261023/world/river-context.md`. The bridge-cell scenery
uses spatial groups and complete per-mesh source tables. Its BASE/NEAR geometry
transfers are **1,655,373 / 1,740,511 bytes**, within the existing 2 MiB limit.
Decoded glTF/binary containers are **3,841,229 / 4,060,035 bytes**; decoded bytes
remain in residency accounting. Bitwise vertex reuse, triangle reordering and gzip
preserve oriented triangle attributes, transforms and source identity. Position and
UV error remain zero. Runtime verifies encoded bytes before bounded decompression,
then verifies decoded size and SHA256 while retaining logical dependency paths.
Nine targeted resource/scheduling/real-HTTP transport checks pass. Browser parsing,
actual resource counts and visual composition remain separate pending gates.

The bounded arcade report finishes **6 passing / 2 failing** checks, with no runtime
exceptions, at `2026-10-21T09:11:37.696Z`. SHA256:
`4096de8b10722d34e3f52a6c5bf71b475b1a6630b5fba9583bbe34a5378fb408`.
Its original driver SHA256 is
`553b4a439bf36604abc28da8e8e3716328ca169a13cb8c990f2dc5a59521a00d`.
The test returns to a previously actually visited pose through production session
helpers, then uses actual controls. That regression does not replace complete
outward-and-return traversal. Portable evidence is under
`experience/evidence/neighborhood-20261021/`; original working output is
`artifacts/neighborhood-20261021/qa/candidate-arcade-final/`.

CI **39574644628** completed on `6f9ccc2`. Seven jobs pass: geographic source
preparation, original walk (133 checks), perspective (80), companion (73), homepage
(65 plus 264 extended checks), solo (75), and reviewed packs (81). The neighborhood
report has **70 passing / 12 failing** checks. The complete 2,706.888 m outward and
return traversal finishes and covers every selected route cell. Nine failed path
assertions expose transient near-detail residency of four sections against the
three-section limit; ground, texture, retained-byte and download/attachment limits
pass those samples. The remaining failures concern initial-load retry during a
locale change and stale in-memory writes overwriting a newer stored revision.

All eight downloaded evidence ZIP digests match GitHub's artifact records. Their
package is `809a90dbabae9becc384e67f006275ca6b27f107f74c81f28f916c595601fb9e`.
All 293 file paths match the local candidate; executable, HTML, CSS, model, image
and data bytes match exactly. Twenty-one source-map files differ and retain their
own package identities. Evidence is under `evidence/neighborhood-20261023/ci/`.

Next actions, in order:

1. Verify actual camera drag, wheel, keyboard and click behavior, market inspection,
   rendered-direction walking, stopped settling and hidden state. Review day/night
   bridge and nearby approaches with actual resource counts. Preserve candidate-1
   and every original failed observation.
2. Confirm actual gzip bridge requests and decoded model rendering, then obtain
   independent art review of the immutable candidate-2 captures. Bind each report
   and capture to exact package and executed-driver hashes.
3. Review completed CI evidence, then validate the changed candidate with the
   complete route, streaming delay/failure/retry, saved returns, private records,
   EN/ZH, Maps export and existing journeys. Keep failed observations explicit.
4. Run `experience/tools/neighborhood-performance.mjs` in an exclusive GPU window
   after browser/art acceptance. The driver/protocol are committed and **have not
   run** on this candidate. Thresholds remain 8 s cold, 3 s warm, 100 ms input p95,
   33.3 ms observed frame p95; Q03 retains its separate unchanged threshold.
5. Update evidence/checkpoint and push each coherent correction. Publish only the
   accepted frozen package through the existing Pages worktree, then verify HTTPS
   files and actual journeys.

Engineering owns the camera correction; navigation owns the streaming transition;
product owns stored-record preservation; art/world own source-grounded arcade and
waterfront corrections. The lead owns initial-preview recovery, integration,
builds, commits and publication. QA owns independent evidence and actual browser
verification. Browser/GPU and Blender export windows remain coordinated. Current
working root is `/workspace/TourGuideAI`; use its ignored `artifacts/tmp` as TMPDIR.
Browser NSS requires write access to `/home/agent/.pki`. Keep proxy/CA settings and
TLS verification. Check local instructions before resuming edits.

## Active iteration · connected neighborhood

The user approved the [connected-neighborhood plan](sprint-connected-neighborhood-20261021.md).
N00 source review passes: the selected route is **1,353.444 m**, with 73 nodes,
73 edges and six sights. It retains actual OSM connections and 848 official Kyoto
building footprints. Independent source checks pass **13/13**, and seven generated
content files reproduce byte-for-byte. Navigation checks pass **10/10**, including
the complete forward/return walk and every branch. Ground heights, simulation
widths, canopy clearance and current access retain their explicit review limits.

The source and navigation work is committed and pushed as `e0c726a`. Earlier
reviewable units are the plan `3d8acd8`, wider solo suggestions `4a86db3` and mapped
walking geometry `03f9a81`. The sourced scenery and authoring workflow are pushed
as `44f638a`; integrated streaming, private editable routes, guidance and camera
obstruction handling are pushed as `4f8a6ec`. Application checks pass **174/174**,
local service checks **13/13**, and repository gates **17/17** with no skips.
CI `39566220597` passes all seven jobs for the committed geographic increment;
it does not cover the subsequent integrated runtime. Actual browser acceptance
of the integrated runtime remains in progress.
The current immutable candidate has package identity
`9f3d1550c6263ca35d6c672da67952afcc3d2fb69ea4cf21d1c661ef06ebb4b6`
and scenery manifest
`4b543ce1609d5fa90ca92949b99050d06b2607d9e74c5477373dd79d691bd721`.
Its opening day/night art review passes: retained crossing surfaces, building
finishes, windows and lighting remain readable. Required 3D startup assets total
**4,152,813 bytes** in daylight, below 4 MiB; page scripts, styles and fonts have
their own whole-entry measurement. A settled daylight frame records **79 draw
calls**, **136,250 submitted triangles** and **47,906,815 bytes** of estimated
active texture/render-target storage, including lighting allocations. These are
opening observations; resource gates also apply throughout the actual route.

Focused browser checks pass **10/10**, including event-time Stop behavior,
modal pause/resume, remaining-distance guidance, EN/ZH and private records.
Full-page screenshots record scroll positions and normalize page scroll before
capture so sticky layout and scene framing can be reviewed independently.
The bounded arcade regression exposes the camera/inspection blockers recorded
above. Full-route acceptance and measured performance remain pending. The previous
published package remains the release baseline.

All 10,974 sampled corridor positions have required scenery coverage, with at most
nine selected sections and three near-detail sections. This static coverage check
does not replace the complete actual-input walk. The reusable production workflow
is documented in `neighborhood-authoring.md`. All 74 glTF exports pass validation;
position, UV and source-index arrays remain exact through compression. The source
ledger distinguishes retained geometry, authored surfaces and reviewed exceptions.

The actual first-package walking profile records 30 frames and 12.51 m in 26.926 s.
Animation-frame tasks average about 6.6 ms, while compositor readbacks wait for
25,637 ms. A separately labelled SwiftShader GPU-compositing diagnostic removes
those readbacks but retains approximately 1.2 fps, with 22,560 ms in GPU-thread
buffer swaps. This establishes a software-rendering limit; changing compositor
flags does not establish fluent travel. Simulation timing, quality and Q03 remain
unchanged. Portable observations are in the connected-neighborhood evidence.

Current unchanged Q03 diagnostics are **953.5 / 1406.1 / 1096.0 ms**, all above
500 ms. A separate trace records 731.9 ms wall time in 15 synchronous WebGL
readbacks; input-handler time is 6 ms. This software-renderer evidence identifies
a concrete investigation area and does not establish a physical-device result.
The metric and visual-quality requirements remain unchanged.

World content owns geographic intake, source attribution and the reusable workflow;
art owns Blender production and visual assets; engineering owns the persistent
scene and streaming lifecycle; navigation independently reviews topology and runtime;
product owns recommendations and private journey state; QA owns independent source,
browser and performance evidence. The lead owns homepage integration, builds,
commits and publication. No new art or runtime package is accepted for publication.

## Completed iteration · lively streets and geographic production

The [iteration plan](sprint-lively-sites-20261021.md) is committed as `1f9fc77`.
The user requested sandbox-engine research before further production changes.
All implementation and browser work paused during the review. The
[engine decision](sandbox-engine-research-20261021.md) and
[geographic workflow research](global-site-workflow-research.md) recommend retaining
the current browser runtime and borrowing spatial loading, selective activity,
reusable architectural modules and distance-based detail. Engine migration has no
measured benefit for the current problems; PlayCanvas remains a conditional
authoring/lighting candidate and Babylon a conditional navigation/agent candidate.

The actual OSM2World experiment converted the two captured international sites,
retaining landmark IDs, but logged geometry errors despite exit code zero.
[Portable evidence](../evidence/global-sites-20261021/converter/README.md) records
the failed automatic-production gate. These outputs are research artifacts.
Ginza's independently reviewed source context passes art production and browser
review. International geographic context retains explicit audit and manual review.

The implemented [site workbench](../content-tools/README.md) prepares real Delft
and Helsinki source data, preserves source geometry and courtyards, and exports
editable Blender context plus GLB models. Source checks pass **18/18**, with strict
coordinate, disjointness, triangulation, provenance and failure assertions.
Displayed rings describe the actual retained triangles; numerical cleanup is
recorded separately from original geographic geometry. The internal browser viewer
checks model/context hashes and matching metadata identities. HTTP checks pass
**40/40**; the final browser walkthrough passes **36/36**. Eight matched visual
pairs accept the bounded shadow correction for context review. Faint Helsinki
foreground modulation remains P2. These scenes retain explicit
unreviewed architecture and access status and are not registered as playable packs.

The Ginza candidate adds mapped neighboring context, street layers, authored glass
response and revised night pools. Model `ca7098c9…` has **8,148,792 bytes**, **87,154
triangles** and **55 batches**; the whole pack has **8,268,894 bytes**. Independent
binary audits preserve the original 42 landmark/navigation meshes and all 55 meshes
across the final glazing correction. The final package passes **81/81** CI pack
browser checks, including normal-motion recovery. Corrected material passes
**12/12** local checks at seven identical poses and independent art review; those
captures retain their original package identity, with all art assets unchanged.
Application **121/121**, service **13/13** and
repository **17/17** checks pass on the current source.

Fresh unchanged Q03 observations are **1206.2 / 1115.1 / 1131.6 ms**. Pre-load style
initialization gives **1077.1 / 1031.2 / 1160.9 ms**; variation overlaps, so no
reliable improvement is established. The antialias-disabled diagnostic records
**905.2 / 810.8 / 901.4 ms**, still above the target; matched visual review rejects
its edge quality. The implementation retains antialiasing and prepares the existing
map style before layer creation. Final package measurements are
**1187.8 / 1061.8 / 1156.5 ms**; all miss the unchanged 500 ms threshold.
Preserve the unchanged driver and three independent warm-action threshold.

Runtime implementation `3214398`, final workbench correction `218fd16` and provider
retry recovery `9f5725d` are committed and pushed. Retry releases the unloaded
MapLibre style before requesting it again, preserving the selected view, route
and private records. Focused EN/ZH style/tile recovery checks pass **18/18**.
The frozen 95-file package is
`3e72aa1c53596042a14d1fb2aae9556b0a2caa876be93d424ec9ebe2aebb0162`.
CI `39552515626` completed successfully on this exact package: original walk
**133**, perspective **80**, companion **73**, homepage **65**, solo **75**,
reviewed packs **81**, extended walkthrough **264**, and geographic source
preparation **18**. All seven browser reports match every packaged file and their
downloaded artifact digests. Reports are retained under
[iteration evidence](../evidence/global-sites-20261021/README.md).

[Actual HTTPS verification](../evidence/global-sites-20261021/hosted/README.md)
confirms **95/95** files and **16/16** live journey checks, with zero page exceptions.
Pages runtime is `17b8f371e0f8a21d990837ea3f5606829a16c784`; metadata-only commit
`09fec3a` records that result. L02–L06 are complete. L01 remains open P1.

Next: promote one geographic context through source-matched architecture and
navigation review using the existing Shijō/Ginza interaction requirements. The
iteration plan records that scope and the separate performance gate. Only the lead
builds, commits and publishes; browser/GPU windows remain exclusive.

## Current iteration · reviewed interactive places

The user approves consistent map styling and selectively reviewed neighborhood and
landmark packs, with Shijō–Karasuma's actual 3D interaction retained. The
[pack sprint plan](sprint-packs-20261019.md) defines one integrated milestone:
a reusable pack system demonstrated by Shijō and a source-reviewed Ginza/Wako
sidewalk approach, with walking, full camera controls, optional surface inspection,
day/night and private saved returns in both places.

The team selects Ginza's connected same-side sidewalk chain and the operator's
architectural dimensions. Sidewalk widths and unobserved geometry are authored.
World owns source data; art owns the new Blender generator and assets; engineering
owns pack definitions, runtime and navigation; lead owns homepage and private-state
integration; QA owns actual-input cross-area verification. Production follows the
recorded source boundary and asset budgets. Existing Kyoto assets, shared links,
route identity and private records remain regression requirements. This release
records source/Pages/evidence/checkpoint synchronization after actual testing.

The plan is committed and pushed as `997afd8`; implementation is committed and
pushed as `379e9d3223d5352ca298e841a7ccbb3694c75d8c`. The final 94-file package is
`5a8e0f67506cd164e7422e8aaf22c6a77685c4a7996168aac16703a6b0d0deb7`.
CI `39281251953` supplies seven complete passing reports on those exact bytes:
original walk **133**, perspective **80**, companion **73**, homepage **65**, solo
**75**, reviewed packs **75** and extended walkthrough **264**. The workflow
completed successfully. [Final local evidence](../evidence/area-packs-20261019/README.md)
records **51/51** interaction checks, **23/23** recovery/resource checks, full solo
**75/75**, homepage **65/65** and extended walkthrough **264/264**. Actual keyboard/touch movement, second-frontage
framing, off-screen actor recovery, both-area saved return, canceled loads, real
delayed-provider locale changes and private-room isolation pass. Counts overlap.

Application checks pass **120/120**. Source review passes **124/124**, with **5/5**
public-source export checks. The frozen model `70870bc6…` is **7,970,296 bytes**,
**84,624 triangles** and **48 batches**, with twelve original embedded maps and
**1,376,256 decoded pixels**. The whole pack is **8,000,958 bytes**. Existing Kyoto
model, actor, finishes and lighting remain unchanged. Three return cycles retain
stable renderer counts and one active instance/canvas; hidden scenes perform zero
updates/draws over two seconds. Actual GPU byte allocation remains unmeasured.

Art review records source-matched openings, walking/closer views and actual
high-detail-to-walking recovery with each capture's exact package binding.
Full-street realism and human recognition remain unverified; Ginza's surrounding
buildings and road are simplified context. The reusable
[authoring guide](area-pack-authoring.md) records production and maintenance steps.
Current [matched Q03 observations](../evidence/area-packs-20261019/performance/README.md)
are **1223.2 / 1104.9 / 1170.7 ms**, retaining the open P1 status and unchanged
500 ms threshold. Service **13/13** and repository **17/17** checks pass.

[Published verification](../evidence/area-packs-20261019/hosted/README.md) confirms
all **94/94** HTTPS files and **16/16** actual desktop journey checks: model draw,
walking, orbit, night, both-area saves/reload/returns, EN/ZH, actual Maps order,
surrounding map and localized Shijō links, with zero page exceptions. Pages runtime
is `3362d6cf61c689a32ded9886a3ed1e45837fe6fe`; verification metadata is committed as
`d8fd0ef`. The metadata update contains no runtime changes. P00–P06 are complete.

## Preceding release · solo exploration

The user authorizes the next iteration and research into broader solo travel while
preserving art, quality and usable interaction. The [solo sprint plan](sprint-solo-20261018.md)
was recorded before production. Current scope connects free Kyoto exploration and
source-bound visible-surface inspection, explicit discovery at the wider map's
current area, and private chosen-place/view/selected-order continuity. Detailed
authored Kyoto and approximate provider map coverage remain distinguishable.

Root owns homepage/map presentation and solo-state integration. Engineering owns
opt-in exploration camera and continuous inspection response; art owns existing
facade/material/day-night refinements. World-content owns the
[broader coverage research](solo-coverage-research-20261018.md); product owns the
plan and experience criteria; QA owns independent behavior and visual-evidence
collection. Root coordinates shared interfaces, GPU windows and release.
The plan is committed as `1babfc636c75006550646e371759aa2dba46f77c`; current runtime
source is `a1dbd36298e56109a396d2df1a9031851859b3c9`. Application **105/105**,
service **13/13** and repository **17/17** checks pass. The
[portable local evidence](../evidence/solo-20261018/final/validation-boundaries.json)
binds the final 90-file package
`0a6244091b50c9ee7220d698e1109c86bd397dba54384c8db20e68bc57c728e7`.
Current source CI at `02c2d63ff407f706054d1029ebee46b39216a01d` passes the complete
solo suite **75/75** on these exact bytes. The preceding solo run passes 69/71 and retains two phone-driver
diagnostics. Final focused 39/39 checks establish correct actual touch guidance,
two-finger map movement, saved return and resizing; shared street runtime bytes
match that complete run. Final startup/hidden work passes 8/8 and original-walk
pause/lighting passes 19/19. Counts overlap and stay separate.
[Matched art review](../evidence/solo-20261018/art/reviewed-art.md) accepts clearer
glazing/frame/recess separation and reduced canopy-shadow wedges. Human realism,
recognition and emotional value remain unverified.

CI `39131040477` on initial source `1ce9360` passes homepage 65/65, walkthrough
264/264, perspective 80/80 and companion 73/73. Original walk records 131/133:
two expectations omitted the calibrated canopy fixture overrides while actual
lights match the profile. The corrected expectation passes
[14/14 focused appearance checks](../evidence/solo-20261018/final/appearance/browser-result.json)
on final bytes, including actual HDR retry. The raw CI failure stays in its evidence.
The [current CI record](../evidence/solo-20261018/ci/current/README.md) binds source
`02c2d63` to full solo 75/75, homepage 65/65, perspective 80/80 and companion 73/73.
[Run 39133355919](https://github.com/PaperStrange/TourGuideAI/actions/runs/39133355919)
completed successfully. The [completion evidence](../evidence/solo-20261018/ci/completed/README.md)
verifies original walk **133/133** and extended walkthrough **264/264**, including
the exact 90-file published package binding. Final hosted verification passes
[90/90 files](../evidence/solo-20261018/hosted/published-files.json),
[19/19 solo checks](../evidence/solo-20261018/hosted/solo/README.md) and
[21/21 homepage checks](../evidence/solo-20261018/hosted/homepage/walkthrough-result.json).
All checks use actual HTTPS Pages and providers. The default service-health 404
is recorded separately from JavaScript exceptions; no hosted service is configured.
[Q03 observations](../evidence/solo-20261018/performance/README.md)
remain **1121.1 / 1221.9 / 1097.9 ms**, all above the unchanged 500 ms threshold.
The map resize guard removes unnecessary work and establishes no latency gain.
Sprint 2B replay remains conditional; existing routes, locales, private saves and
shared links must retain their meaning.

## Resume from saved work

- Workspace: `/workspace/TourGuideAI`; source branch: `chore-sow-delivery-plan`.
- Current pack plan/runtime: `997afd8` / `379e9d3`; package `5a8e0f67…` is frozen.
  Pages runtime `3362d6cf61c689a32ded9886a3ed1e45837fe6fe` is published and verified;
  metadata update is `d8fd0ef`. Complete CI, focused local checks, all 94 published
  files and 16 hosted journey checks pass. Inspect the current working tree before
  edits; release documentation may have a later commit than runtime. Keep report
  scopes and open Q03 explicit.
- Quality runtime: `828a405194d82e465887b15c8bcaedfaa3d04f9d`.
  [Sprint plan](sprint-quality-20261016.md) was issued and pushed as `a834cc5`
  before implementation. Pages runtime commit is `c3bcceb` and package manifest is
  `8751ba4ecb6f6fcec70d1c2d25cff41b074671ea4433d3bf5b4a087ac810d2fb`.
  [CI for the preceding runtime](https://github.com/PaperStrange/TourGuideAI/actions/runs/38847943226)
  passes perspective/travel. Its homepage failure identified the search-grid sizing
  issue repaired in `d21c708`; the original walk passed 69 checks before a stale
  localized-credits selector prevented a click. The driver is repaired and its
  focused credits/attribution/return checks pass 3/3. [Final source CI](https://github.com/PaperStrange/TourGuideAI/actions/runs/38851871150)
  completed successfully on `54fdbaf9bed4328e36a70aeee23e73d0d4aed564`.
- Candidate fixes preserve locale and route origin, restore phone navigation,
  constrain the phone scene width, load the street engine on demand, suspend hidden
  scene updates, and provide map/lighting recovery. The approved model, photographic
  environments and architectural profile are retained. Full EN/ZH desktop/phone
  walkthrough passes 264 checks on package `6cdc0ad9`. The CSS repair passes six
  matching-browser layout stages. Final startup package `8751ba4e` passes 65 homepage,
  8 startup interaction and 19 original-walk pause/appearance checks. Unit/service
  suites pass 89/13. The complete final local original walk also passes 133/133.
  Final-source CI reports original-walk 133/133, full walkthrough 264/264, homepage
  65/65, perspective 80/80 and travel 73/73 on exact `8751ba4e`.
  [Final CI record](../evidence/quality-20261016/ci/final-run-summary.json).
  The older asset binding remains preceding-runtime evidence.
  [Quality evidence](../evidence/quality-20261016/README.md) records the separate
  conditions. The preceding CSS publication matches all 79 files and passes 38
  hosted connection, 21 homepage/phone and 9 navigation checks. Final startup
  publication also matches all 79 files and passes 21 actual hosted homepage/phone
  checks. All 12 final timing observations use the published bytes and record no
  failed requests or page exceptions. Together street payload and hidden updates/
  draws are zero; Explore draws once at startup. Warm Together locale actions
  take 1177.8 / 1113.4 / 1134.5 ms and miss the unchanged <500 ms target. Q03 remains
  open P1. Retain functional fixes; investigate the remaining delay before broader
  expansion. The original baseline remains faster for warm Explore readiness.
- The preceding quality milestone started from checkpoint commit `3794918`.
- Local connection runtime: `bdc85fd4cd5dd90f390f042c0112b8d80fc19768`;
  verified Pages runtime: `53cf8647a46d365bf2b7774e0971d9bcd24b1711`;
  Pages verification metadata: `ad9fc10d6b90ca824fd8203cba1cff8b33366665`.
- Homepage baseline: `c3bf2309329eb1ff212f14d3e24697f38d98a23d`;
  baseline Pages: `eb8647d622d983280fba08fe9c23752aac1e81a4`;
  art refinement: `2767263`.
  [Homepage evidence](../evidence/homepage-20261015/README.md).
- Latest direction: implement reviewed interactive place packs, preserving the
  shared map style and Shijō's usable 3D interaction. Continue workspace testing and
  independent routine product decisions. Building realism, lighting and meaningful
  exploration remain core challenges. No public tunnel or paid service is required
  or introduced by the current plan.
- Local service runs on loopback port 8787 with durable ignored SQLite storage
  and the exact Pages origin allowed. Continue same-computer browser testing;
  the user chose this path after the previous tunnel proposal. No public
  forwarding endpoint exists.
- Repeatable setup: `npm ci` then `npm run local:pages` in `experience/server`.
  [Local guide](../server/docs/local-pages.md). The current workspace process uses
  ignored `server/.data/local-test.sqlite`; the launcher default is
  `server/.data/rooms.sqlite`. Recheck the process before resuming; no availability
  beyond the execution environment's lifetime is promised.
- Together's **Testing connection** supports an explicitly chosen HTTPS or
  loopback HTTP endpoint and live or periodic updates. Selection stays in the
  tab. Member credentials are endpoint-scoped; unfamiliar invitations require
  confirmation before any token-bearing request. Endpoint changes clear the
  active invitation and cancel pending room operations. Existing journey saves
  are retained. AI remains unavailable without a configured model provider.
- Previously released companion application: `a8c3e493058198e8e5012bc9fd470190dc358148`.
- Previous Pages: `6b5b1ea41a658badc8d364ad2267d07028b8fdbe`; publication worktree:
  `/workspace/TourGuideAI-pages`, branch `publish-travel-20261015`.
- Released companion entry: [travel.html](https://paperstrange.github.io/TourGuideAI/travel.html).
  [Review instructions](../../PREVIEW.md) and [evidence](../evidence/travel-20261015/README.md).
- Resume from the recorded release and inspect the working tree for current changes.
- Node 24.19 and dependencies are available at this checkpoint. Recheck on another
  environment rather than assuming installed tools or scratch evidence persisted.

The user authorized a homepage with Explore and Together, selected a small hosted
backend and requested synchronized commits/checkpoints. Continue that work within
the agreed scope. SOW remains initial guidance. Historical closed reviewers are
not active team members.

## Approved scope and present limits

The [homepage brief](homepage-journeys.md) defines the new release criteria:
Explore searches a real place, opens its available scene/map and suggests sourced
local stops. Together uses invitation-based rooms for participants' dream countries
or cities, a shared world map, local views and reviewed journey proposals. The
backend provides persisted room state, revision-checked edits, streamed updates
and a configured-model planning endpoint. Shared activity means intentional room
contributions and selected views; it carries no physical-location presence claim.

Building realism and day/night remain priorities. Detailed Kyoto and wider 3D-map
coverage must be labelled according to the delivered geometry. Source-informed
place order, externally computed directions and model-generated proposals retain
their different meanings. Hosted API availability and model readiness remain
pending verification; the homepage reads actual service capabilities.

The existing `travel.html` companion retains Google Maps directions, optional
manual My Maps CSV import and explicit foreground location. Its independent saved
selections/meaningful marks and old query links must remain usable. The original
Kyoto walk moves to `walk.html`; legacy `index.html?lighting=…` links must reach it.
Existing perspective and recap links keep their recipient behavior and saves.

Location starts explicitly, pauses when hidden and requires Resume when visible
again. No background tracking, stored/uploaded GPS history or automatic visit marks.
Directions represent Google-computed routes through selected places, not a person's
recorded movement. Planned places, personal significance, virtual moments and
user-reported real visits must remain distinct.

The **Find your own place** direction now has a published, verified Sprint 2A solo slice:
continuous exploration response and deliberate private view/place return. Personal
approach/pause replay and recipient handoff remain conditional Sprint 2B work.
Current implementation does not establish emotional value or complete that
expressive experience.
The reviewed-pack milestone adds Ginza as a second interactive area.

## Active owners and next actions

| Owner | Current boundary | Delivery state / continuing responsibility |
|---|---|---|
| Lead | Homepage/map/solo state, integration, checkpoint, release | Pack selection, versioned returns, publication and actual HTTPS verification complete; retain Q03 as the next technical priority |
| Engineering | Pack registry, runtime, simulation and perspective adapter | Shared controls, bounded Ginza navigation, compatible saves and cancellation/disposal verified; preserve these interfaces |
| World-content | Ginza source data and provenance | Source chain, operator dimensions and reference rights reviewed; recheck source changes before later revisions |
| QA-release | Browser drivers and independent walkthrough | Local final interaction/recovery/solo/homepage/walkthrough checks pass; preserve driver and package identities |
| Product-design | Pack sprint and experience criteria | Plan and final claims reviewed; human recognition, enjoyment and meaningful return remain unverified |
| Art/UX | Ginza generator, model, materials and lighting | Final source-matched views and budgets reviewed; Kyoto assets preserved; surrounding realism remains open |

Paths in the ownership table are relative to `experience/`. Do not edit another
owner's files; report interface conflicts to that owner. Preserve unrelated changes.

## Exact local resume and verification commands

Inspect before editing or rebuilding:

```sh
cd /workspace/TourGuideAI
git status --short
git branch --show-current
git log -3 --oneline
git diff --stat
node --version
```

Check the service and independent application. The homepage browser suite starts
an isolated real SQLite service and serves an immutable build snapshot internally;
no shared API process or preview server is required for that suite.

```sh
cd /workspace/TourGuideAI/experience/server
npm ci --cache /workspace/.npm-cache
npm test
cd /workspace/TourGuideAI/experience
npm ci --cache /workspace/.npm-cache
npm test
npm run build
export TMPDIR=/workspace/TourGuideAI/artifacts/homepage-qa/tmp
export PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright
mkdir -p "$TMPDIR"
EXPERIENCE_QA_CHROMIUM=/usr/bin/chromium EXPERIENCE_QA_OUTPUT=/workspace/TourGuideAI/artifacts/homepage-qa/browser node tests/browser-homepage.mjs dist
npm run test:travel -- dist
EXPERIENCE_QA_TIMEOUT=600000 npm run test:perspective -- dist
EXPERIENCE_QA_TIMEOUT=600000 npm run test:browser -- dist
cd /workspace/TourGuideAI
node iteration/tools/run-gates.mjs
```

The matching Playwright Chromium is installed at the browser path above. On a fresh
environment install it with `npm exec --cache /workspace/.npm-cache -- playwright install chromium`
using the same `PLAYWRIGHT_BROWSERS_PATH`. Coordinate GPU-heavy suites with QA.

## Preceding quality release checks

The quality package `8751ba4e` passes 89 application tests, 13 service tests,
17 repository gates, 65 homepage checks, 8 startup interaction checks,
19 original-walk pause/appearance checks and 3 credits/return checks. Actual Pages
passes 21 homepage/phone checks and all 79 files match the tested package.
Final-source CI confirms original-walk 133/133, full walkthrough 264/264, homepage
65/65, perspective 80/80 and companion 73/73 on the same manifest. All scheduled
suites completed successfully; this evidence covers the preceding quality release.
The separate final local original-walk run passes **133/133**, with actual movement
through all three encounters, selected sharing, graphics recovery and migrations.

The preceding 264-check matrix and later focused checks retain their own package
identities in the [quality evidence](../evidence/quality-20261016/README.md).
Twelve matched final timing observations establish the startup and hidden-work
improvements; warm Together language-action latency remains above its target.
This remains an explicit open P1, with no general physical-device speed claim.

## Previous homepage and local-connection checks

The published homepage baseline passes 65 browser checks, 82 unit tests, 7 server
checks, 11 client integration checks and 17 repository gates. The Docker service
retains room state across restart. All 80 published files match the tested hashes.
Evidence lives in `experience/evidence/homepage-20261015/`. The local connection
increment passes 37 candidate and 38 actual published-page browser checks, 87 unit tests, 13 service tests and
17 repository gates; its evidence lives in that directory's `local-pages/` folder.
Candidate tests use real loopback APIs and candidate frontend bytes served under
the Pages origin. The published run uses actual HTTPS assets with two loopback
APIs; all 112 captured static responses match. A separate comparison verifies all
80 published files. Browser local-network permission was granted by automation;
manual permission UX and physical-device access remain untested.
The font includes all known homepage and companion copy with no missing glyphs.
No model call or public room-service availability has been established. Do not
include service secrets or participant credentials in the checkpoint.

## Previous companion release evidence

The companion passes **73/73 browser checks**, the application passes **74/74 unit
tests**, and **17/17 repository gates** pass. The final companion report is
`experience/evidence/travel-20261015/final/travel-result.json`; its package manifest
is `6a4f5b2f11d67153058305d73ffc715d3dd7bdd5c16531bd2a89b2a933fe0608`.
The original walk passes 130 checks, perspective passes 80, and focused sharing
passes 24. Their resource bindings match the final package. All 63 hosted files
match, and [CI run 38779049743](https://github.com/PaperStrange/TourGuideAI/actions/runs/38779049743)
succeeds for all three runtime jobs. That companion release has synchronized source
and Pages records.

Completed companion evidence is in `experience/evidence/travel-20261015/`, for runtime
`a8c3e49`. These results do not validate the homepage changes. Physical review covers
GPS, permission/OS sharing behavior, Google directions and My Maps import on actual
devices. The next product discussion concerns the proposed continuous exploration
and meaningful-moment experience, beyond this practical handoff.

Commit and push coherent reviewable increments; do not leave the milestone only
in scratch files or process memory. Finish with source/Pages identities and explicit
remaining limits. Simulated browser location is not a physical field trial, and
technical delivery is not acceptance of enjoyment, emotional expression or utility.
