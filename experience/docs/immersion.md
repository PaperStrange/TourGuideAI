# Immersion across a travel journey

Updated 2026-10-06. Owner: `product_design`.

## Approved direction and this increment

The user confirmed that immersion should span the travel journey, with smaller scenes for each day,
individual actions such as opening a door, and sharing the whole trip. This is a direction for the
product; it does not mean daily itineraries, reconstructed interiors or sharing services already exist.
The game remains the main experience: choices made while playing become a useful route, then a
personal record of a real trip. It must remain enjoyable to explore before anything is exported.

The user also found the 3D experiment more spatially convincing but its buildings and lighting less
realistic. The next improvement is recognizable architecture, believable materials and light, and
responsive actions in that place. A renderer change alone does not establish immersion.

This increment stays in the existing Kyoto/Shijo block with the existing sourced encounters. It
implements a small continuity feature: an optional personal note for each completed encounter, saved
alongside the current walk and included in the player's exported field notes. The UI supports complete
selectable English and Chinese, while Japanese source signs remain Japanese.

The personal-note implementation was verified in the 2026-10-05 browser build; see
[independent validation](validation.md) for its evidence and limits. That build passed 53/53 browser
checks, 16/16 pure tests and 17/17 repository gates. On 2026-10-06 the user accepted its fluency and
guidance on GitHub Pages, but rejected the overly simple appearance and standalone HTML sharing
experience. The next slice therefore improves appearance and sharing while preserving the accepted
interaction. It requires its own verification; earlier checks do not certify new changes.

The user requested both rendered visual solutions and multiple sharing formats. They are not mutually
exclusive alternatives. The sharing contract below is authorized implementation work, not a claim
that it is already verified. This remains a short simulated walk, not a complete trip or photo memoir.

## Four scales of experience

| Approved scale | Player experience | Scope and evidence of success |
|---|---|---|
| Whole trip | Anticipate a place, rehearse choices, travel, remember, decide what to share | Preserve the player's intentions, selected stops and memories across those stages. A player can explain which choices shaped the resulting itinerary and which observations came from the real trip. |
| Each day | Arrive with a purpose, adapt during the day, close the day with a useful keepsake | Later: a day opening, a readable plan with sourced constraints and alternatives, and a closing summary. Day assignment is the player's plan, not proof of a real reservation or opening time. |
| Each interaction | Approach, anticipate an action, act, receive feedback, transition and return | Now: visible destination, stable nearby cue, responsive action, readable encounter and choice outcome, then return to the same street with control restored. Later: sourced door/interior transitions. |
| Whole-trip sharing | Select what matters and present it to someone else | Later: review a curated artifact covering selected days, routes and memories before explicitly saving or sharing it. The user chooses whether personal notes/photos are included. No automatic social post. |

A reason to return should be a remembered intention or a new journey, not a streak, expiring reward,
guilt message or a score for how much personal material someone contributes.

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

The next comparison presents both a live browser view and a Blender-rendered still, using the same
street model and matched framing. Both must be available for review, with their fixed comparison
views identified. An improved still does not prove gameplay rendering quality, and authored context
does not add verified venues, entrances or navigable territory. Comparison controls leave the saved
walk unchanged. User acceptance of the revised appearance remains open.

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

## Later journey continuity: proposals, not this build

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
