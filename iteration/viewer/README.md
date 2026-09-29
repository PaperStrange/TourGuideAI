# `iteration/viewer/` — the walkable shell

**Gate 1's "walkable 2.5D", in a browser, driven by `scene.bin`.**

Open it directly. No server, no build step, no dependencies:

```powershell
Start-Process iteration/viewer/index.html      # Windows
```
```bash
open iteration/viewer/index.html               # macOS
xdg-open iteration/viewer/index.html           # Linux
```

Controls: **↑ ↓ ← →** or **WASD** to walk, **[** and **]** to zoom.
Walk into a wall and the step is refused — that refusal *is* the collision test.

---

## What this is, and what it is not

| | |
|---|---|
| **Is** | a top-down view of the frozen corridor read from `build/scene.bin`: collision, building footprints, sourced heights, the street's own drifting centreline, and the 12 authored doors |
| **Is** | the third independent reader of the container (`emit-guide.mjs` and `gate-scene-read.mjs` are the other two) |
| **Is not** | a game. No engine, no Phaser, no `src/`. Gate 1's criterion is *walkable*, plus one real person walking it — not game feel. Proving the world is correct comes before deciding whether it needs an engine |
| **Is not** | a second export. Every id on the page comes from `build/guide.json` |

## Why it is ONE self-contained file

Chrome and Firefox refuse to load a module script from `file://` — it is treated
as a CORS request — and even a classic `<script src="…">` is refused. A viewer
that needs `python -m http.server` before it opens is a viewer someone has to
explain first, and the acceptance criterion is that **one real person walks it**.
So the four layers, the manifest, the street profile, the doors and the walker are
all inlined, and the page makes no network request of any kind.

The cost is real and is measured rather than hidden: 193,600 raw layer bytes become
258,136 base64 characters (**+33.3%**), for a page around 311 KB. Base64 is not an
arbitrary choice — the payload lives inside a `<script>` tag, and any denser
encoding whose alphabet contains `<` or a quote can terminate the tag early. Base64's
alphabet is `[A-Za-z0-9+/=]`, which cannot appear in `</script>`.

## The walker is not a copy

`bake-viewer.mjs` serialises the simulation functions out of
`iteration/tools/check-viewer.mjs` with `.toString()` and embeds them. The browser
runs the **same function bodies** the headless assertions check. A hand-written
second copy would be a second source of truth, and this project has already paid
for one of those (D-12: the `valueKind` enum mirrored into `doors.json` went stale).

Two bugs were found by *running* the page rather than reading the bake output, and
both are recorded in `serialiseSimulation()` in `check-viewer.mjs` because the
second one is a JavaScript subtlety that looks like it should work:

1. Emitted as a bare object literal, the functions share no scope. `ReferenceError: idx is not defined` on the first step.
2. Wrapping that literal in an IIFE **does not fix it**: `function idx(){}` in a property position is a *named function expression*, and its name binds only inside its own body. The fix is `function` **declarations** returned as shorthand properties.

## Regenerating

```bash
node iteration/tools/bake-viewer.mjs              # needs build/scene.bin and build/guide.json
node iteration/tools/bake-viewer.mjs --bake-if-absent   # bakes scene.bin first
```

`build/` is gitignored, so a clean clone has neither input. Both scripts in
`iteration/tools/` **fail loudly and name the command to run** rather than emitting
a page that silently renders nothing — this harness has already had seven verdicts
that depended on how the working copy was prepared, and a viewer that is green
only on a warmed machine would be the eighth.

## Staleness is detectable, so this file can be tracked

`index.html` **is** tracked, deliberately, so that a fresh clone gives a person
something they can open immediately. That is only safe because the page **pins the
scene's sha256 in its header**, and `check-viewer.mjs` asserts the pin equals the
hash of the `scene.bin` on disk. A stale page therefore fails the check loudly
instead of quietly drawing a world that no longer exists.

So: **if `scene.bin` changes, re-bake and commit the page, or the viewer check
goes red.** That is the intended behaviour, not an inconvenience.

## Assertions

```bash
node iteration/tools/check-viewer.mjs        # 11 assertions — the simulation, the container, the export
node iteration/tools/check-viewer-page.mjs   # 8 assertions  — the BAKED PAGE's own JavaScript, run headlessly
```

`check-viewer-page.mjs` extracts the page's real `<script>` and evaluates it in
`node:vm` against a minimal DOM stub, so the page's own layer decode, walker,
overlay and key handler execute. It is not a screenshot check: it drives the page's
own `step()` into a wall and reads back the refusal.

Neither script is wired into `run-gates.mjs`. See the task report for the proposed
fourteenth gate.

## Licence

The geometry in `scene.bin` derives from OpenStreetMap (**ODbL 1.0**, © OpenStreetMap
contributors) and is described in `city-packs/kyoto-shijo/`. The twelve doors are
`authored` — nobody has observed them; see `doors.json` `provenance.whyNotObserved`.
