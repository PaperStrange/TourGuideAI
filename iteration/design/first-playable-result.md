# First playable · independent browser result

Recorded 2026-10-05 by `qa_release`.

**Status: ready for user review.** Automated browser behavior and agent visual/content
review passed for the artifact below. User approval of the implemented art and
interaction feel, fresh-user discoverability, and the real Kyoto field walk remain
pending. This is not Gate 1 completion or a release of a complete travel guide.

## Exact artifact and evidence

| Item | Evidence |
|---|---|
| Production HTML | 647,462 bytes; SHA-256 `237ce97bd3d9ff25b3b0667e75aafd7038fda70264c81d5f7b480af0b80902bc` |
| Browser | Chromium `151.0.7922.173`, real canvas/DOM, desktop keyboard and pointer input |
| Automated result | **44 checks passed, none failed**; [machine-readable result](../../.dsh/artifacts/evidence/first-playable/browser-result.json) |
| Result SHA-256 | `f3821418048742b8639b6fb0dec2634c55bad7c6a8cac90016b027bc6ded5e66` |
| English opening | [1440 × 1000 capture](../../.dsh/artifacts/evidence/first-playable/first-playable-initial.png) |
| Chinese opening | [1440 × 1000 capture](../../.dsh/artifacts/evidence/first-playable/first-playable-zh-initial.png) |
| Compact desktop | [English 1280 × 720](../../.dsh/artifacts/evidence/first-playable/first-playable-en-1280x720.png), [Chinese 1280 × 720](../../.dsh/artifacts/evidence/first-playable/first-playable-zh-1280x720.png) |
| Actual encounter | [English card](../../.dsh/artifacts/evidence/first-playable/first-playable-en-card.png), [Chinese card](../../.dsh/artifacts/evidence/first-playable/first-playable-zh-card.png), [Chinese choice outcome](../../.dsh/artifacts/evidence/first-playable/first-playable-zh-choice.png) |
| Foreground visibility | [Actor behind the tree near the facade](../../.dsh/artifacts/evidence/first-playable/first-playable-at-facade.png) |
| Source run | `/workspace/scratch/first-playable-evidence/final/`; 15 screenshots, input-action log, downloaded field notes and browser videos |

The exact document bytes were supplied to an allowed localhost URL through
Playwright request interception. Every secondary resource request was denied and
recorded. The application and exported notes made **zero secondary requests** and
produced **zero page or console errors** during the run. No project test framework
or new repository gate was added.

## What was demonstrated

- **The complete interaction works in English and Chinese:** move, approach,
  identify the nearby prompt, open the card, choose or close, and resume walking.
  Holding/releasing movement, facade collision, repeated E, modal movement pause,
  close without immediate reopen, and restored movement focus passed.
- **Language selection preserves the open interaction:** position, selected
  destination, visits, choices and source-read state survive switching. The chosen
  outcome remains visible and keyboard focus stays on the corresponding language
  button. Japanese place names retain their original meaning.
- **Pointer navigation works:** clicking unmarked pavement reaches that point;
  automatic travel to the south-side bank passes through the mapped crossing.
  The nearby prompt remains stable while stationary.
- **Progress has distinct meanings:** merely opening a card creates no visit;
  reading sources does not create a visit; choosing creates one visit. The
  unfinished south doorway returns honest development feedback and never becomes
  a completed venue. Reload preserves position, locale and chosen progress.
- **The output reflects choices:** the tested north-side choice appears in the
  notes; declining the station plan and cash stop produces memory notes rather
  than those planned stops. The Chinese export renders at a 390-pixel phone width
  without horizontal overflow; phone and print captures were inspected.
- **Recovery and replay work for the tested cases:** null, primitive, malformed
  JSON and invalid game saves recover to valid initial state. A 1,426-command
  movement/collision sequence reaches the same state across save/restore; changing
  a command changes the result, and paused simulation does not advance.

## Independent visual observations

The implemented scene visibly contains a traveler, crossing, curbs, frontages,
world names, street furniture and coherent depth. English and Chinese objectives,
controls and cards are legible in the inspected captures, including the bundled
Chinese/Japanese characters and arrow glyphs. The actor remains discernible behind
foreground foliage because the obstructing tree fades.

Agent reviews by QA, art/UX and product design found no remaining blocking art,
language, choice-meaning or interaction defect in the inspected views. This is
agent review of the implementation, not approval by an unbriefed player or a claim
that the visual reference has already been accepted by the user.

Two real browser defects were found and corrected before this result: resizing
caused melonJS to shrink the canvas CSS again after capture, leaving a blank strip;
and compact-layout footer overlap was aggravated by comma text nodes between
journey items. The final resized canvas and container both measure **970 × 520**;
the 1280 × 720 document fits its viewport, with export and controls above the footer.

An idle 90-frame sample recorded median **16.7 ms**, p95 **50 ms**, maximum **66.6 ms**
between animation frames in this headless, video-recording environment. These are
observations, not an FPS guarantee or a substitute for human fluency evaluation.

## Limits and remaining acceptance

- **Direct `file://` startup remains unverified in this environment.** Managed
  Chromium policy rejects that scheme with `ERR_BLOCKED_BY_ADMINISTRATOR`. The
  policy was not bypassed. The single-document, zero-secondary-request run proves
  network independence here, not every browser's local-file behavior.
- Only the stated Chromium environment was exercised. Safari, Firefox, other
  hardware, assistive technology and extended-session stability are unverified.
- No fresh participant performed the 30-second discoverability probe. The
  90-second reward probe and user judgment of art quality/interaction feel remain
  pending. A repeated agent walkthrough cannot establish first-use comprehension.
- No physical route was walked, no real entrances/interiors were verified by this
  QA run, and no real photo memoir was completed. Current exports explicitly remain
  exploratory field notes; twelve enterable destinations and full Gate 1 are open.

## Reproduction

Build the game with its existing `npm run build`, then invoke the ad hoc
[`browser-check.mjs`](../game/qa/browser-check.mjs) with the built HTML path as its
required argument. It uses existing Playwright, Chromium and FFmpeg tooling;
`TG_QA_OUTPUT` selects the evidence directory. On this executor Playwright came from
`/opt/codex/runtimes/cua/lib/node_modules`, Chromium from `/usr/bin/chromium`, and
system FFmpeg was reused through a temporary Playwright cache under `/tmp`.

The browser script SHA-256 at this run is
`1875f29a3be55d8a3391430315f249b591f318429041baa54a087f656140e9b4`.
The separately exercised simulation source SHA-256 is
`2d0c914280b238c1b6272c06c1828ebf957528013f665d98e58e5c9552856d84`.
