# `iteration/viewer/` — the walkable shell

**Gate 1's "walkable 2.5D", in a browser, driven by `scene.bin`.**

Open it directly. No server, no build step at run time, no dependencies:

> **On a clean clone the page does not exist yet** — `index.html` is gitignored as a derived
> artefact (see below). Bake it once: `node iteration/tools/bake-viewer.mjs`. After that it
> is a file you open, not a server you start.

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
node iteration/tools/check-viewer-page.mjs           # 18 assertions — the BAKED PAGE's own JavaScript, run headlessly
node iteration/tools/build-opener-fact.mjs --check   # the artefacts match the declaration
```

`check-viewer-page.mjs` extracts the page's real `<script>` and evaluates it in `node:vm`
against a minimal DOM stub, so the page's own layer decode, walker, HUD, receipt and key
handler execute. It is not a screenshot check: it drives the page's own `E` handler at a south
door and reads the receipt back, and it runs the page a second time under `#V-B` to compare
the variants.

**No assertion's expectation is a constant.** `check-viewer.mjs` compares the door count
against `doors.json`; `check-viewer-page.mjs` compares the page's printed counters against the
payload they came from, and compares its anchor set against `build/guide.json` re-read from
disk rather than against the page's own copy of it. This matters because a previous round moved
the door count 12 → 10 and reddened checks that had nothing to say about whether the world was
correct. Each has a fire drill, the same shape as `validate-doors.mjs --doors`:

```bash
node iteration/tools/check-viewer.mjs --doors <f> --places <f> --opener <f>   # follow, not redden
node iteration/tools/check-viewer-page.mjs --page <baked variant>             # idem
node iteration/tools/bake-viewer.mjs --doors <f> --opener <f> --out <dir>     # bake a variant; the shipped page is untouched
```

**Two assertions record their own limits rather than claiming more.** P10 fixes `t=0` and says
so: it proves a RULE, not an EXPERIENCE, because the live sequence depends on the path a player
actually walked and is not assertable without a reference path. P14 searches the delivered text
with comments stripped, because the phrase it forbids survives in the comments that document
its removal, and a check that counted prose would fail the page for explaining itself.

---

## P1 · why a player presses the first arrow key

The shell is also the apparatus for P1, the project's most expensive untested assumption —
that anyone wants to walk this world at all. The spec is `iteration/design/play-systems.md`;
what this page implements from it:

**Four HUD slots, and exactly four** (§1.4):

| | slot | content |
|---|---|---|
| **S1** | edge indicator | direction + integer metres to the current target — **hidden the moment that target is on screen** |
| **S2** | three counters | `街上 n/6 · 门洞 n/10 · 街外 16` — never merged, and all three denominators computed from input |
| **S3** | status readout | `四条通 · 东行 x m · 最近 <real name> ±d m` — the name is a fact-layer VALUE, not a string in the page |
| **S4** | doorway receipt | only while a door is open; the title leads with the door id and along-street metre because seven of the ten doors share one building name |

**Deleted, and the deletion is asserted:** the 10-row debug table, and the line
`E open a door`. That line mattered — it was the only thing telling anyone `E` existed, and
P1 is the experiment that asks whether it is needed. P14 searches the *delivered* text (HTML
and JS comments stripped) so the page is not failed for documenting its own removal.

### Two things the spec and the code disagree about, resolved by measurement

**1. The target sequence must skip placeholder doors.** `next` is
`argmin{distance : a ∈ eligible}` where `eligible` excludes `modelled === false`. Without that
clause the first target is still the crossing — so the trap looks avoided — but targets 2, 3
and 4 are `D-S1 → D-S3 → D-S5`, the three south placeholders, because they sit in a 7 m chain.
A green check on target #1 said nothing about #2–#4, which is why the assertion is on the
**sequence** (`targetSequence`) and not on the first step. Placeholder doors are still drawn,
still enterable, still counted in 门洞 n/10: existing is not gated, **being named** is.

**2. The camera keeps the walker visible before it keeps the target visible.** `camLeft()`
clamps to the world *first* and only then slides toward the target. My first version nudged
toward the target first, which at the western end pushed the window to columns 1..20 and put
the walker **outside** it — P13 reported 1,371 violations starting at step 0. A rule that
keeps the target visible must never outrank one that keeps the player visible.

The measured consequence, and why the camera slides at all: the nearest anchor is at column 20
while the spawn window is columns 0..19, so under a pure centre-and-clamp the world stays
**empty for ten steps** while S1 counts 20 m down to 10 m — only the HUD responding. With the
slide, the first keystroke brings the crosswalk into view and S1 hides because its target is
now on screen:

```
step  x   camLeft  window cols   anchors visible        S1
   0    0        0     0..  19    0                     → 20 m   (0 content cells: the walker is at the world's edge)
   1    1        1     1..  20    1  crossing-karasuma-east   HIDDEN
```

At `t = 0` the world layer holds the centreline and the walker and **nothing else**. That is
not a defect to fix by tuning: §1.1 measured that all 5,601 non-zero `ground` cells are
building footprints, and the nearest anchor is one column beyond a clamped window. It is why
the "first frame is not empty" criterion is written against the **HUD** — `t=0` must name at
least one real fact-layer place, which it does (四条烏丸交差点 東側横断歩道, ±20 m) — rather
than against the window, where it could never go green and would teach people to ignore red.

### Two variants, and they differ in the keymap ALONE

The pair separates "the keys were not discoverable" from "there was no reason to press one".
That separation is only valid if nothing else changes, so P15 runs the page **twice** — in two
independent VM contexts — and requires the same first target and the same counters:

```
iteration/viewer/index.html          V-A  bare      (the default)
iteration/viewer/index.html#V-B      V-B  keymap    ("arrows or WASD move · E opens the door you stand at")
```

The keymap names **keys only** — no goal, no colour legend — because a keymap that explained
the goal would confound the very thing it exists to isolate.

### The key log is a file, not a memory

The page's own handler records every press (`iteration/viewer/index.html` → **导出按键日志**):

```jsonc
[{ "t_ms": 4120, "key": "ArrowRight", "refused": false, "targetId": "kyoto-shijo-crossing-karasuma-east",
   "targetDistM": 19, "derivedCount": 0, "changed": true }]
```

`changed` is computed against the page's `displayState()`, so **"the first press changed
something on screen" is a recorded boolean** rather than a judgement. Unmapped keys are logged
too — a person trying a key the page does not accept is data, not noise.

---

## What this is, and what it is not

| | |
|---|---|
| **Is** | a top-down view of the frozen corridor read from `build/scene.bin`: the street's own drifting centreline, the walker, and 16 anchors (6 sourced places + 10 authored doors) |
| **Is** | the third independent reader of the container (`emit-guide.mjs` and `gate-scene-read.mjs` are the other two) |
| **Is** | P1's apparatus: four HUD slots, a pure-function target, two variants, a key log |
| **Is not** | a game. No engine, no Phaser, no `src/`, and no art assets (`cellPixelSource()` returns `null`; §6.3 records 0 assets) |
| **Is not** | a second export. Every id on the page comes from `build/guide.json` and `city-packs/` |
| **Does not draw** | collision, ground or height rasters. They are still the collision truth — every step is still refused by them — they are simply not the visual. Drawing them is what made the world read as an abstract diagram |

## Why it is ONE self-contained file

Chrome and Firefox refuse to load a module script from `file://` — it is treated
as a CORS request — and even a classic `<script src="…">` is refused. A viewer
that needs `python -m http.server` before it opens is a viewer someone has to
explain first, and the acceptance criterion is that **one real person walks it**.
So every layer the container declares, the manifest, the street profile, the doors and the
walker are
all inlined, and the page makes no network request of any kind.

The cost is real and is measured rather than hidden: every layer the container declares is
base64-encoded into the page, which costs **+33.3%** — a fixed price, so it is stated as a
rate rather than as two byte counts that go stale the next time the scene gains a layer (the
`openings` layer did exactly that to the numbers that used to sit here). `check-viewer-page.mjs`
P0 prints the current raw and encoded totals on every run; read them there.

Base64 is not an arbitrary choice — the payload lives inside a `<script>` tag, and any denser
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

## `index.html` is gitignored, and that is a decision

`.gitignore` excludes it for the same reason `build/` is excluded: it is a derived artefact
that every `emit-scene.mjs` run invalidates, and tracking a ~400 KB file that goes stale on
each bake would put dead copies in history. The gates regenerate it on demand instead —
`V8`/`P8` accept `--bake-if-absent`, and the viewer gates in `run-gates.mjs` bake it.

**So a clean clone does not contain an openable page; it contains the means to make one.**
That is a real cost, and it is the trade the project chose. To get the page:

```bash
node iteration/tools/emit-scene.mjs        # if build/scene.bin is absent
node iteration/tools/emit-guide.mjs        # if build/guide.json is absent
node iteration/tools/build-opener-fact.mjs # the door declarations
node iteration/tools/bake-viewer.mjs       # -> iteration/viewer/index.html
```

**Staleness is still detectable**, which is what makes ignoring it safe rather than merely
convenient: the page **pins the scene's sha256 in its header**, `check-viewer.mjs` V8 asserts
that pin equals the hash of the `scene.bin` on disk, and V8b compares every embedded layer
byte-for-byte against the container. A page baked from a different scene fails loudly instead
of quietly drawing a world that no longer exists — and that check has already earned its keep:
it is what proved a layer-offset error in this reader rather than a stale bake.

## Licence

The geometry in `scene.bin` derives from OpenStreetMap (**ODbL 1.0**, © OpenStreetMap
contributors) and is described in `city-packs/kyoto-shijo/`. The ten doors are
`authored` — nobody has observed them; see `doors.json` `provenance.whyNotObserved`.
