# Shared-perspective delivery · 2026-10-07

Application `f701bdaf98f98a47d112220763009f35cbdf28c0` is published by Pages commit `89ff73ea3577721e6a5aab312b6814dd6d65ee5c`. All
57 hosted package files match the tested hashes.

- [Walk & look](https://paperstrange.github.io/TourGuideAI/perspective.html?mode=walk)
- [Map & story](https://paperstrange.github.io/TourGuideAI/perspective.html?mode=story)
- [中文](https://paperstrange.github.io/TourGuideAI/perspective.html?mode=walk&lang=zh)
- [Lean phases and sprint gates](../../docs/lean-iteration.md)
- [Next human review protocol](../../docs/perspective-review.md)

## Technical evidence

- **80/80 new-flow browser checks**: [complete local report](browser/perspective-result.json).
- **Original 130-check suite: final CI passed**. [Provider run/job record](ci-status.json).
- **44/44 pure tests**, **17/17 repository gates**: [unit output](unit-tests.tap), [gates](repo-gates.json).
- **10/10 additional mobile live checks**: [touch input report](mobile-live/mobile-result.json),
  [English capture](mobile-live/mobile-live-en.png), [Chinese capture](mobile-live/mobile-live-zh.png).
- [Independent CI run](https://github.com/PaperStrange/TourGuideAI/actions/runs/37580389117)
  builds and checks the new experience and original walk in parallel jobs.
- [Build output](build.txt), [source inventory](source-manifest.json), [hosted verification](hosted-verification.json).
- [Art preflight](asset-preflight.json) checks the three actual browser captures,
  shared camera fields and hashes. Existing models/lighting are reused.
- [Pure-test mutation evidence](pure-mutations.json) and [focused recipient check](recipient-focused-result.json).

Package manifest SHA-256: `0dcb86bc7247f0b790627ecc61799a8c60268475e802da8f940995fe2791e613`.

The checks cover the actual three-observation walk, matched EN/ZH content, keyboard
movement and framing, saved views/notes across reload, edit/removal, opt-in selected
sharing, fresh read-only recipients, malformed input, blocked storage, asset and
WebGL failure/retry, delayed loading and phone layout. Original movement, collisions,
encounters, lighting, old saves and link/PNG/print sharing are separately retained.

An earlier diagnostic run caught compact-sidebar clipping from the new entry link.
The link now shares an existing row; the final original CI suite covers the repair.
The [local diagnostic report](diagnostics/original-before-repair.json) intentionally
retains its 129 passes and one layout failure on the earlier package
([earlier screenshot](diagnostics/compact-before-repair.png)). The
[15-check repair proof](layout-repair/layout-result.json) and
[exact package delta](layout-repair/artifact-delta.json) bind the correction to the
release: only the original entry HTML/main bundle/map changed, with 54 packaged
files unchanged. CI artifact downloads were blocked by this environment's proxy
at GitHub's Azure artifact host. Provider status is preserved separately; the
complete new-flow report and screenshots are from the final local run, not a
mislabelled downloaded CI artifact.
An exact CSS-string assertion also exposed decimal serialization and float32
rounding in the test itself. Its replacement checks numeric framing at float32
precision, retains an exact note comparison, and rejects a deliberately wrong scale
or origin. Earlier diagnostic failures are not counted as passes.

The bounded mobile live probe uses trusted touch taps/swipes in Chromium mobile
emulation: tap navigation, orbit without accidental walking or page scrolling,
EN/ZH control hints, note editing/save, draft preservation and horizontal fit pass.
Its retained diagnostics document two probe issues: observing startup before
arrival, and full-page capture resetting Chromium's touch emulation. The final
probe waits for stopped arrival and uses viewport captures while checking that
touch emulation remains active. This is not a physical-device acceptance test.

## Product limits

This is a complete small **experience experiment**, not a human A/B result. All
sample observations are explicitly studio-authored. No real travelers, human
ratings, reciprocal connection, market demand or field-use benefit are invented.
Notes/feedback stay local; a user explicitly includes a saved note in a share link
or exports a feedback report. One reflection is retained, so export it before a
second-format review if both responses matter. Direct format links and crossovers
are distinguished from the initial random assignment.

Both formats use daylight for this comparison; the original walk retains day/night.
Story plates are illustrated live-scene captures, not photographs. A live recipient
restores the saved camera; if 3D cannot load, a labelled reference illustration is
shown instead of claiming to reproduce that framing. Image/frame changes, walking
time and repeat exposure mean this is a delivered-experience comparison, not an
isolated renderer experiment.

Building geometry remains authored and approximate. Dark glazing, simplified
vegetation and tiny signage remain art limitations. Software-rendered automation
does not establish fluency on ordinary devices. Clipboard/preview checks do not
prove real delivery, every OS share sheet or enjoyment. City/country expansion is
conditional on the next review gates; no additional-city model was built here.
