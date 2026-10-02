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

Controls: **↑ ↓ ← →** or **WASD** to walk, **E** to open the door you are standing at,
**[** and **]** to zoom. Walk into a wall and the step is refused — that refusal *is*
the collision test.

---

## The two kinds of enterable door

The user's ruling:

> 南侧的店面在世界里不存在：仍然需要设置可以走进去的交互操作，第一版交互反馈显示「内容开发中」即可。以还原现实为第一标准。

(The south-side shopfronts do not exist in the world: the interaction to walk into them
still has to be provided, and for the first version the feedback may read "content under
development". Fidelity to reality is the first standard.)

Enterability is therefore a **set interaction**, not a consequence of geometry — which
matters because the scene's `openings` layer is *derived from the collision bytes*, so the
south side would be structurally zero however the fact layer felt about it.

| | north (7 doors) | south (3 doors) |
|---|---|---|
| surface | `measured-interior` | `unmodelled-interior` |
| real shopfront exists | yes | yes |
| modelled behind the door | **3-row room, closed by a back wall** | **nothing** |
| pressing E shows | "measured interior" + the room's measured extent | **内容开发中** + "本版本未建模，不是布局示意图" |
| draws anything room-shaped | a hatched strip, 1 px per row | **no** |

**A player who cannot tell those apart walks into a shell and believes they saw the real
layout — that is not "under development", it is a lie.** So the placeholder is a single
constant (`PLACEHOLDER_TEXT` in `iteration/tools/viewer-interaction.mjs`), it renders as a
solid amber flag rather than a caption, and nothing room-shaped is drawn for it. An absent
diagram is honest; an invented one is the defect. For the same reason the south panel says
plainly that the shopfront exists in the world and this version has no interior for it,
rather than implying the shop is empty.

## `opener-contract.json` is DERIVED, and that is checkable

```
iteration/tools/build-opener-fact.mjs      the DECLARATION (tracked script)
iteration/viewer/opener-contract.json      its serialised form (derived)
iteration/viewer/opener-contract.md        its human-readable form (derived)
```

The declaration — the `SURFACE` vocabulary, the north/south rule, the placeholder contract —
lives in the **tracked script**. The JSON is regenerable from `doors.json` + `places.json`
+ the scene probe, so it is derived output, not a hand-maintained list. That distinction is
enforced rather than promised:

```bash
node iteration/tools/build-opener-fact.mjs --check   # exits 1 if the artefacts are stale
```

A hand-edit to the JSON fails `--check`, because a hand-maintained vocabulary that other
files copy is D-12 — the defect this project has already paid for four times.

## Assertions

```bash
node iteration/tools/check-viewer.mjs                # 14 assertions — the walk, the container, the export, the declaration
node iteration/tools/check-viewer-page.mjs           # 11 assertions — the BAKED PAGE's own JavaScript, run headlessly
node iteration/tools/build-opener-fact.mjs --check   # the artefacts match the declaration
```

`check-viewer-page.mjs` extracts the page's real `<script>` and evaluates it in `node:vm`
against a minimal DOM stub, so the page's own layer decode, walker, panel and key handler
execute. It is not a screenshot check: it drives the page's own `E` handler at a south door
and reads the panel back.

**No assertion's expectation is a constant.** `check-viewer.mjs` compares the door count
against `doors.json`; `check-viewer-page.mjs` compares the page's printed numbers against the
payload it printed them from; `check-viewer.mjs` compares the page's embedded layer list
against the container's own layout arithmetic. This matters because a previous round moved
the door count 12 → 10 and reddened checks that had nothing to say about whether the world
was correct. Each has a fire drill, the same shape as `validate-doors.mjs --doors`:

```bash
node iteration/tools/check-viewer.mjs --doors <f> --places <f> --opener <f>   # follow, not redden
node iteration/tools/check-viewer-page.mjs --page <baked variant>             # idem
node iteration/tools/bake-viewer.mjs --doors <f> --opener <f> --out <dir>     # bake a variant; the shipped page is untouched
```

---

## What this is, and what it is not

| | |
|---|---|
| **Is** | a top-down view of the frozen corridor read from `build/scene.bin`: collision, building footprints, sourced heights, the street's own drifting centreline, and the 10 authored doors |
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
