# Immersion across a travel journey

Updated 2026-10-07. Owner: `product_design`.

## Current direction is open to discovery

The user explicitly says the SOW was initial product-design guidance and may be broken in pursuit
of a more interesting idea. It records prior ambitions; it no longer binds us to game-first, traveler
preparation, mandatory planning outputs or a trip → day → moment hierarchy. Those purposes can be
retested alongside delight, curiosity, social connection and memory without a booked trip.

Recognition of a real place is affirmed qualitatively. The user is less positive about menu choices
and finds the tiny street's interaction/travel weak, while seeing promise in people's footprints.
Live-browser A is favored informally; the reported “roughly 60% positive feedback on realism” has
an unknown denominator/method and is not a fidelity score. Retain B as a reference unless retired.
More menu cards or a larger movement log are not established answers to the experience gap.

## Recommended experiment: borrow someone's eyes

The current team recommendation is a **short connected approach → explicitly shared view → follow
curiosity and notice a detail → hear the author's brief remark → optionally frame a view and leave
one sentence → another person gains a new way to notice**. A later real visit/reflection is possible,
but is not necessary to give the interaction value. Attention, enjoyment and connection are primary
questions for this experiment; orientation is a useful secondary benefit to measure separately.

Begin with a framed view and short text. Photos, sketches, audio, stories and longer annotated trails
are possible expressive forms later, not a feature list to build now. A full path recorder is not a
prerequisite. A purpose invites exploration; reading, contributing, sharing and planning a trip remain
optional. The approach and departure should feel connected rather than like an isolated popup.
Include contrasting viewpoints and a reveal/ending; another landmark turntable cannot answer the
depth concern. The current 64 m strip is not assumed sufficient. Establish the smallest connected
space that supports the experience, with source evidence before any navigable extension.

Use an available person's explicitly shared moment. A clearly labelled team-authored example may
support a usability prototype, but cannot prove connection with another traveler. Personal material
starts private; sharing previews exactly the selected view/text. Reading a friend's contribution does
not record one's own visit or change one's saved walk. Virtual exploration, shared personal material,
user-reported real visits and sourced facts remain distinct. No automatic GPS tracking, public home
or exact-time history, popularity ranking, co-presence or social feed is required for this proof.

Compare the same story/view in a flat card and in the moving scene. Does the invitation make a person
notice something, understand the author's perspective or want to express something of their own?
If a static card provides the same value with less friction, simplify. If interaction is only clicking
facts or menus, added value from play remains unproven. Reported connection/confidence, virtual
recognition, unseen-photo/map transfer and actual field use are different observations.

[Positioning](positioning.md) compares three creative hypotheses: shared perspectives (recommended),
curiosity-led discovery and personal return/memory. Its three exploratory sprints are discovery →
private authorship → recipient experience. This is a recommendation to test one small prototype,
not a commitment to implement all hypotheses or an announcement of new runtime capabilities.

## Delivered baseline and parallel art work

The current Kyoto slice supplies working EN/ZH guidance, three sourced encounters, local personal
notes, authored day/night and previewed selected-note link/PNG/print recaps. The user accepted
fluency/guidance for the Pages build they played. See [validation.md](validation.md) and
[iteration.md](iteration.md) for exact technical evidence and its limits. These results do not prove
that people enjoy shared perspectives, want to contribute, return, or can use a complete field route.

The navigable 64 m strip/one crossing is not a wider connected travel experience. Existing recaps
require supported encounter IDs and choices; they do not already store arbitrary shared viewpoints
or continuous footprints. Reuse working patterns where helpful, and do not fabricate historical paths
from old saves. New connected movement needs supported geometry/access rather than background
meshes becoming navigable by accident.

[Ginza 4-chome/Wako](recognition-study.md) stays a parallel bounded architecture study with three
live camera views. It checks recognizable building features, not the whole product proposition.
It does not add a Ginza walk, venue interactions or a second-city game.

The user's Minecraft, Terraria, Animal Crossing, The Sims 4 and Scriptum references contribute agency,
discovery, attachment, personal stories and situated investigation. They do not require construction,
household simulation or AR equipment. Mainline Animal Crossing/The Sims 4 are life-simulation
references. The positioning document retains the source checks and Scriptum availability limits.

## Scales we can explore

| Scale | Possible experience | Status |
|---|---|---|
| One moment | Follow another person's gaze, notice a feature, form a personal response | Recommended first experiment: view plus short text, clearly shared or labelled authored |
| A short connected walk | Arrival, curiosity, an optional discovery and a natural departure | Enough continuity to test the moment in place; no full-city promise |
| Another person's perspective | Read a selected contribution and decide what it means to you | Explicit opt-in sharing; meaningful recipient experience remains unproven |
| Return and memory | Revisit one's own observation; optionally connect a later real visit | A creative hypothesis, not a required travel or retention loop |
| Days or whole trips | Turn selected discoveries into practical intentions and later memoirs | Earlier ambitions retained as optional directions; not prerequisites for delight or connection |

A reason to return can be curiosity, a remembered moment or a person's perspective. Avoid making
participation compulsory through expiring rewards, streaks or guilt about not contributing.

## Embodied place: art, light and camera

- Use the selected block's supported building identity, massing, frontage rhythm and sign placement.
  Do not substitute generic Kyoto ornament for evidence. Unsupported detail remains authored treatment.
- Let glass, metal, stone and paving react differently to light. Contact shadows should connect feet,
  frames and street objects to their surfaces; recessed glazing and edge detail should survive movement.
- Keep a coherent light direction, visible player silhouette and legible Japanese signs. A lighting
  preset is presentation, not a claim about the real weather, local time or current operating conditions.
- Restrained ambient movement may support the place, but must not block controls, imply verified
  crowd/traffic patterns or introduce unsourced interactive businesses. Respect reduced motion.
- The approved 3D camera uses guided framing with bounded orbit/zoom and a reset. Judge it while
  walking: the player remains findable, nearby actions remain readable and orientation is recoverable.
  Orbiting must not accidentally walk or activate an encounter. Resetting the view must not reset play.
- Keep HTML objectives, controls and encounter cards stable while the world moves. A player should
  be able to move, inspect, read, decide and continue without learning a separate interface each time.

Blender is an authoring tool for the implemented geometry/material pipeline. Judge the exported browser
scene, including near views and movement, rather than accepting a Blender render as the product.

The delivered comparison presents both a live browser view and a Blender-rendered still, using the same
street model and matched framing. Both must be available for review, with their fixed comparison
views identified. An improved still does not prove gameplay rendering quality, and authored context
does not add verified venues, entrances or navigable territory. Comparison controls leave the saved
walk unchanged. User acceptance of the revised appearance remains open.

## Daylight and night atmosphere

The user requested daylight/night modes and better use of online building resources for lighting and
shadows. The modes are delivered and browser-checked; user judgment of realism remains separate.
Any externally sourced geometry, materials or lighting assets need the art/content owners' provenance
and license review. A reusable building asset is visual material, not evidence of a particular Kyoto
building, tenant, entrance or opening time.

The product behavior is a compact, explicit **Daylight / Night** choice, with an accessible **Time of
day** group and complete EN/ZH states. Start in daylight unless a valid local appearance preference
exists. Apply the player's choice immediately; no animated clock or automatic day cycle is required.
If assets are still loading, distinguish the requested mode from the applied scene and do not announce
success before it appears. A recoverable lighting failure uses readable basic lighting with a retry,
without blocking the walk or pretending the richer lighting loaded.

Store appearance preference separately as `tourguideai:appearance:v1 = { lighting }` and preserve it
when the player resets the walk. A `?lighting=` override supports review of a chosen mode. Failure to
store the preference does not prevent the current scene from switching. Changing
light must preserve position, camera framing, selected place, visit/choice state, open modal, keyboard
focus and saved or draft personal notes. The toggle should not create an entry action or unpause an
open encounter. Controls stay in the main toolbar; a native modal makes that toolbar inert, so no
duplicate controls are needed inside encounter cards. An already requested asynchronous switch must
not disturb a card opened while its lighting assets finish loading. Recap DTOs and their creation
dates remain unchanged: lighting is presentation, not
a real visit fact, a schedule, current weather or proof that any business is open.

The comparison page exposes the same daylight/night choice. For a chosen view, its live renderer and
Blender still must both identify the selected lighting. If a matching still is unavailable, say so;
never relabel a daylight image as night. Camera/view selection stays fixed across mode changes to
make building depth, material response and shadows comparable.

Review both modes at actual browser size in EN and ZH, including the compact layout. Labels and
focus rings must remain visible without crowding the scene controls. Walk and orbit, request a lighting
switch, then open an encounter before it finishes; the card and play state must survive. Type an
unsaved note, close the card, switch lighting and reopen it; the draft must remain. Night must retain a findable actor,
readable Japanese signs and available actions; daylight must show coherent material and shadow
response without washing out those cues. Exercise loading, rapid mode changes, fallback and retry,
then reload and reset the walk to check appearance retention. Technical checks remain separate from
the user's judgment of the revised lighting and realism.

## The interaction rhythm

| Moment | Current public-frontage experience | Observable failure |
|---|---|---|
| Approach | Recognize a real place and move toward its reading point | Marker, label and actionable position refer to different things; actor disappears behind the facade |
| Anticipation | Nearby highlight and EN/ZH action explain what pressing E/click will do | Flickering prompt, unexplained disabled action, or wording promises entry where no interior exists |
| Action feedback | A deliberate action produces visible feedback once | No response, repeated activation, or a camera drag triggers the action |
| Transition | Movement pauses; the encounter opens with the correct place and useful choice | Input leaks into the world, target changes, or focus is lost |
| Consequence | Chosen outcome changes the player's route intent or memory; optionally add a personal note | Skipping becomes a planned stop, or the visit falsely marks source facts as verified |
| Return | Close resumes from the same position and restores control; next purpose is clear | Teleport, immediate reopen, stuck movement, or loss of a note draft |

Opening a door later deserves this same rhythm, including threshold movement and a readable return path.
This block currently uses authored public-frontage reading points and retained unfinished doorways.
Do not animate an invented tenant entrance or interior and present it as a sourced real-world visit.
Any eventual door/interior slice needs its own content and art evidence first.

## Small continuity feature: implementation contract

The current increment is deliberately personal and local:

1. After completing an encounter, a player may write a plain-text note of up to 500 characters. The
   note is optional; leaving it empty never blocks exploration or progress.
2. An explicit save stores the note for that encounter. Editing or clearing replaces that encounter's
   current note; there is no claimed note-version history or trip archive.
3. Reload restores valid visit order, choices and saved notes. A quiet returning-walk message supports
   resuming; it does not add a blocking welcome flow or pretend the player visited Japan physically.
4. Sharing includes only explicitly selected saved personal notes, clearly separate from source-backed travel information.
   Changing a route choice changes route intent; a skipped stop may remain a memory without becoming
   a planned stop. Notes cannot overwrite source facts or create a verification badge.
5. Locale/camera changes preserve current play and any note draft. Saved notes retain the player's
   own language; they are neither automatically translated nor used to unlock Japanese signs.
6. Use versioned local persistence. A validated same-origin legacy save may be imported once. This
   does not promise cross-origin/device migration or cloud backup. Explicit reset clears the current
   walk's visits, choices and personal notes, and must not silently re-import them on reload.

Conceptual state separates `visit order`, `choice by target`, `personal note by target`, `source-read
state` and `UI preferences`. The runtime owner chooses the serialization. Source-backed city content
remains read-only; personal memory never enters the city facts or provenance records.

## MVP acceptance on the runnable build

| Check | Passing evidence |
|---|---|
| Convincing place | Compare the supported block reference and live browser scene from matching views, then walk/orbit. Building identity, depth, material response, readable signs and grounded light hold up in motion. User judges the resulting art. |
| Fluent action | Complete approach → prompt → action → choice → close → continue in EN and ZH. No unexplained retries, input leaks, lost player/focus or accidental action from camera drag. |
| Personal continuity | Save different notes on two completed encounters, reload and revisit each. Correct text and choices return with their own places; editing one does not change the other. |
| Draft and locale | Type without saving, switch EN/ZH or reset the camera, then return to the note. Draft, position and selected encounter remain intact. |
| Clear save state | Success feedback follows successful persistence. If storage fails, do not claim the note is saved; retain the visible draft and explain how to keep a copy. |
| Faithful output | Inspect exported field notes after add/skip choices. Only selected route intent is represented as planned; personal text is rendered as text and labelled personal, with factual sources still separate. |
| Honest reset and return | Cancel reset retains everything; confirm clears the current walk and notes. Reload does not restore cleared legacy progress. Returning text appears only for an actual saved walk. |
| Accessibility/recovery | Controls and note editing work by keyboard with visible focus. Error/retry UI is bilingual; failure to show 3D must not misleadingly claim the scene loaded. |

Art quality and interaction fluency are separate acceptance conditions; neither compensates for the
other. Source validity, technical checks and agent review also remain distinct from user acceptance.
Do not invent performance, satisfaction or retention thresholds; observe the targeted failures and
record remaining problems against the reviewed build.

## Current sharing slice: one preview, multiple formats

The old action immediately downloaded standalone HTML. The replacement opens an in-app preview
before anything is copied, handed to a device share service, downloaded or printed. The user requested
all three output styles below. None is a substitute for the others.

| Format | What the recipient gets | Capability and limit |
|---|---|---|
| Web link | A readable mobile page containing the selected walk, choices, notes and source details | Explicit native Share or Copy link. The static page reads a versioned fragment payload; no account, game loading or WebGL is required to read it. No short-link service, revocation or personalized social-preview promise. |
| PNG card | A purpose-built image of the same selected walk | Download image, plus native image sharing where supported. A static card is easy to view but has no interactive source expansion or recipient language switch. Keep an accessible HTML counterpart. |
| Print / PDF | A readable layout opened from the dedicated journey reader | The browser print dialog handles printing or Save as PDF where supported. Opening the dialog is not proof of a saved file. |

The selection contract is the same across formats:

- Start with completed supported encounters in recorded order. Distinguish choices added to the
  planned route from discoveries merely remembered. Unfinished placeholder doors never become stops.
- Personal notes start unchecked individually. Only explicitly saved notes can be selected; an unsaved
  draft remains local. A note change in the preview affects every output, not the underlying saved note.
- Show the simulated-walk label and creation date. Creation date is the artifact date, not a claimed
  real visit or a new source-verification date. Notes remain player prose, separate from sourced facts.
- Make selected notes visible in the preview and explain that recipients can read them. Anyone who
  receives or is forwarded a link, image or PDF can keep its contents. There is no revocation promise.
- Keep EN/ZH controls and outcomes complete. Interface changes do not translate personal prose,
  alter original Japanese place names, change the chosen stops or clear note selections.
- Explicit native sharing only hands content to a device service; it does not prove recipient delivery.
  Clipboard success means copied. Download initiation and print-dialog opening do not prove saving.
- Close or cancel returns to the same play state and retains drafts. Native cancellation is neutral;
  an error retains the preview and selection. No completed encounter means no output action, with a
  clear invitation to discover a place first. Sharing with no personal notes is valid.

The agreed transport record is a versioned DTO with `v: 1`, `pack: kyoto-shijo`, language, creation
date and ordered stops containing known place/choice IDs plus optional selected notes. Validate those
IDs and the schema before rendering; imported share content never changes the recipient's saved walk.
The full fragment URL is limited to 8192 characters for this bounded slice. This is an implementation
limit, not a guarantee that every messaging application accepts that length. Reject an oversized,
unsupported or malformed link clearly; never silently truncate notes or reinterpret unknown choices.
Sources and their checking dates stay distinct from the shared artifact's creation date.

Verification must compare sender preview against a fresh-browser recipient and each output: include
one selected note and exclude another, preserve add-versus-remembered choices, switch EN/ZH, inspect
Chinese wrapping, and exercise cancel, unavailable native sharing/clipboard, malformed link and empty
walk states. A PNG must preserve selected content rather than silently cut off long notes. Browser
checks cannot establish that an external messaging service delivered the artifact. The revised sharing
experience and revised art both require review against their actual delivered outputs.

## Optional travel continuity, if it earns its place

These earlier ideas remain possible directions. The shared-perspective experiment does not require
them, and traveler preparation is one hypothesis rather than the sole product purpose.

- **Before departure:** preserve intentions and must-do places, then rehearse sourced decisions in
  the game. Export a practical route with required facts, current verification dates and honest gaps.
- **During each day:** later add a day opening and optional closing reflection. Only use sourced
  opening/transport constraints; do not invent urgency to make an itinerary feel dramatic.
- **At real visits:** later accept personal observations and photos with the corresponding place/day.
  Mark them as player-reported real visits, separately from simulated visits and verified source facts.
- **After the trip:** later let the player select photos, notes and route moments for a complete memoir,
  compare intention with experience and carry chosen interests into another trip.
- **Whole-trip sharing:** extend the current short-walk formats to selected days and a complete trip,
  retaining source attribution and the simulated/real-reported distinction. Personal notes/photos
  require explicit inclusion. No community feed, automatic posting, account service or multiplayer
  expansion is included in this increment.

## Public implementation references read for this proposal

Read on 2026-10-05 through GitHub API/raw source, resolving each default branch to a commit first.
These are public experience implementations, not proof that a particular technique improves our
players' immersion. No popularity count or unseen user study is used as evidence. No code, art or
audio is copied into this project.

| Reference | Direct source observation | Pattern adopted; boundary |
|---|---|---|
| [Bruno Simon — Folio 2019](https://github.com/brunosimon/folio-2019) at `540f13573a6da282eae942a4c67335b97cd18970` | [Area.js](https://github.com/brunosimon/folio-2019/blob/540f13573a6da282eae942a4c67335b97cd18970/src/javascript/World/Area.js#L181) separates interaction feedback from proximity enter/leave and an available key cue; [Camera.js](https://github.com/brunosimon/folio-2019/blob/540f13573a6da282eae942a4c67335b97cd18970/src/javascript/Camera.js#L92) follows an eased target and bounds zoom; [Controls.js](https://github.com/brunosimon/folio-2019/blob/540f13573a6da282eae942a4c67335b97cd18970/src/javascript/World/Controls.js#L32) clears held actions on visibility loss. | Bind motion, spatial arrival, available action and feedback into one readable experience. Keep recovery reliable. Do not copy the driving fantasy, physics toys or animated fence treatment into a factual pedestrian street. |
| [A Dark Room](https://github.com/doublespeakgames/adarkroom) at `1fada4620b6c66bd07bf15a3f1eb8223df8bc1d7` | The [README](https://github.com/doublespeakgames/adarkroom/blob/1fada4620b6c66bd07bf15a3f1eb8223df8bc1d7/README.md) links the playable browser game and multiple language editions. [engine.js](https://github.com/doublespeakgames/adarkroom/blob/1fada4620b6c66bd07bf15a3f1eb8223df8bc1d7/script/engine.js#L272) saves state, reloads/migrates it and exposes player-triggered export/import; [state_manager.js](https://github.com/doublespeakgames/adarkroom/blob/1fada4620b6c66bd07bf15a3f1eb8223df8bc1d7/script/state_manager.js#L260) explicitly migrates older state. | A changed world/state can make return meaningful even without photorealism. Preserve the player's choices and provide deliberate control over their record. Do not import resource grinding, cooldown pressure, generated geography or assumptions that fictional state is travel fact. |

Source-file SHA-256 anchors for the observations above:

- Folio `Area.js`: `d0e938703c09637d1e0287209a5ec97da830a0bf6dc8b03a8f752ab59317ed15`.
- Folio `Camera.js`: `7dd17917ce69fc0457f39f370036459de6ca9887fc9089557b2a95c1cd697acb`.
- Folio `Controls.js`: `12bd695e501eea9a9d08a07ce95adffb351250c025fff68ef2a25be02e269b11`.
- A Dark Room `engine.js`: `e3ab30d0c34cb8cef6a7ab67f88085509eb831ce2b9448a61125cb570a737d88`.
- A Dark Room `state_manager.js`: `85441d6f3143c99818938644dc15f0ba0a1fb740a4904b02d5d96347015e5826`.
