# Openable surfaces — the fact layer for door interaction

> **DERIVED OUTPUT of `iteration/tools/build-opener-fact.mjs`. Do not hand-edit.**
>
> The DECLARATION lives in that script: the `SURFACE` vocabulary, the north/south rule,
> and the placeholder contract. This file is its serialised form, regenerable from
> `doors.json` + `places.json` + the scene probe. A hand-edit here would be a second
> source of truth for a declared vocabulary, which is D-12 — the defect this project has
> already paid for four times. Run the generator with `--check` to compare the artefacts
> against what the script would write; any difference fails.

## Why enterability is declared and not derived

The scene's `openings` are derived from the collision bytes, so the south side is structurally
zero and would stay zero however the fact layer felt about it. The user's ruling makes
enterability a **set interaction**, so it is declared here and consumed by the viewer:

> 南侧的店面在世界里不存在：仍然需要设置可以走进去的交互操作，第一版交互反馈显示「内容开发中」即可。以还原现实为第一标准。

## Surface kinds

| kind | real interior exists | modelled | interaction |
|---|---|---|---|
| `measured-interior` | true | true | `enter-measured` |
| `unmodelled-interior` | true | false | `placeholder` |

**Rule.** The emitted corridor is 40 m deep (worldGrid.hTiles), so the collision layer can only carry an interior that falls inside it. A north-side door opens into a modelled room; a south-side door opens onto a building that lies OUTSIDE that window, so the engine has no geometry for it at all. The shortfall is in the MODEL, not in the world: both shopfronts exist in reality, and doors.json records both as valueKind=authored.

## Doors

| door | cell | side | place | surface | modelled depth (evidence) |
|---|---|---|---|---|---|
| D-N1 | 18,24 | north | 京都三井ビルディング | `measured-interior` | 3 row(s) |
| D-N2 | 21,24 | north | 京都三井ビルディング | `measured-interior` | 3 row(s) |
| D-N3 | 24,24 | north | 京都三井ビルディング | `measured-interior` | 3 row(s) |
| D-N4 | 28,24 | north | 京都三井ビルディング | `measured-interior` | 3 row(s) |
| D-N5 | 31,24 | north | 京都三井ビルディング | `measured-interior` | 3 row(s) |
| D-N6 | 35,24 | north | 京都三井ビルディング | `measured-interior` | 3 row(s) |
| D-N7 | 38,24 | north | 京都三井ビルディング | `measured-interior` | 3 row(s) |
| D-S1 | 19,0 | south | 京都ダイヤビル | `unmodelled-interior` | 0 row(s) |
| D-S3 | 26,0 | south | 京都ダイヤビル | `unmodelled-interior` | 0 row(s) |
| D-S5 | 33,0 | south | 京都ダイヤビル | `unmodelled-interior` | 0 row(s) |

Counts: **10 doors, 10 openable** — 7 measured, 3 unmodelled.

**The modelled depth column is EVIDENCE, not the criterion.** It is measured from the collision
layer and recorded so the two can be reconciled; the `surface` column is what decides, and it is
decided by which side of the street the shopfront is on.
