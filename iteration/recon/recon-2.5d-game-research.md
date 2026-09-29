# 2.5D Overseas-Travel Simulation — Reconnaissance & Decisions

**Deliverable of record for the 2.5D game reboot.** This document **absorbs and replaces** the earlier `recon-2.5d-game-research.md` pass: that file's only unique content (its concrete React↔Phaser directory layout) is carried forward verbatim as **Appendix A**, and the earlier file has been removed so there is a single source of truth. The earlier pass had the same conclusions on a thinner evidence base. Raw per-section research inputs for this pass are in [`recon/sections/`](recon/sections/); **content provenance by agent session is recorded in [§ Authored by](#authored-by)**.

**Subject.** A browser game that simulates travelling in Japan across 3–5 cities, whose outputs are (a) a **real-world executable travel guide** the player follows, and (b) a **memoir** built from the real photos they bring back. 1 owner + AI agents.

**Evidence date / snapshot.** 2026-09-28. Every version number, release date, price, licence term and quote below was fetched on that date from a primary source (npm registry, GitHub release feeds/REST, vendor docs, pricing and licence pages, Steam store API, dev blogs, GDC Vault, Wikipedia). Links are inline.

**Retrieval method (matters for reproducibility).** `web_fetch` is **blocked** in this environment — every hostname resolves to a non-public IP. All retrieval went through the shell network path (`curl.exe` / `Invoke-WebRequest`) against static `releases.atom` / `tags.atom` / registry JSON rather than JS-rendered store pages. Three network paths disagree on this machine (`web_fetch` blocked → `curl` per-host → `Invoke-WebRequest` where curl times out); only after all three fail may a fact be recorded unobtainable. See [`docs/handOff/README.md`](README.md).

**Legend.**
- **[F]** verified fact with a source link.
- **[J]** my reasoned judgment. Not a fact; argue with it.
- **[GAP]** could not be verified. Stated as a named unknown — never filled with a plausible number.
- **UNVERIFIED:** appears inline where a specific figure or quotation could not be confirmed.

**Hard framing constraint from the project's own contract (not a research finding).** The game world **is** the fact: places, hours, prices, fares and transit legs come only from `city-pack/**` (or an explicit allow-listed runtime fetch), the LLM never authors them, every fact carries `source_url` + `verified_at`, facts are read-only to every layer above, rejected content is **dropped not corrected**, and **no paid mechanic may alter the time/money ledger**. Authority: [`.dsh/skills/tourguide-fact-integrity/SKILL.md`](../../.dsh/skills/tourguide-fact-integrity/SKILL.md); plan in [`gap-analysis-and-plan.md`](gap-analysis-and-plan.md) §4.1. Several recommendations below are *forced* by this contract — those are marked **[+]contract**.

---

## 0. Executive recommendations

| # | Question | Recommendation | Confidence |
|---|---|---|---|
| 1 | 2.5D style | **(b) 3/4 top-down with layered sprites**, one shared tile vocabulary + a per-city **style kit** (palette + signage + 6–10 district props). Not isometric, not HD-2D, not pre-rendered. | High |
| 2 | Engine | **Phaser 4.2.1**, imperative canvas as an opaque island, React 18 shell unchanged. Backup: **PixiJS v8.21 without `@pixi/react`**. | High |
| 3 | Tooling / assets | **Tiled 1.12.2** (not LDtk — no isometric, dormant releases); **prefer CC0** (Kenney, KayKit, Quaternius) over attribution/non-commercial tiers; hand-drawn is a *later* purchase, not a foundation. | High |
| 4 | Hard problems | Data-driven schedule table + integer tick clock; **inkjs** for authored narrative; **three mechanics, not eight**; **IndexedDB** not localStorage; command-log save + content-addressed LLM cache. | High |
| 5 | LLM role | **Pre-baked, human-reviewed content pack is canonical; live generation is cosmetic only.** ~$0.025/player-hour if live; ~$1–20 one-time per 500 baked quests. | High |
| 6 | Scope | 4 weeks = *one street, one day*; 12 = *one district, three days*; 24 = *one city, one week, loop closed*. **Riskiest assumption: that a player actually walks the exported guide in the real world.** | High |
| 7 | Reuse | Keep the **Express infra + storage trio + UI skeletons** (~4,500 LOC). Throw away **the map path, both `src/api/*` forks, the prompts, RBAC/invites, and ~77,000 LOC** of dead weight. | High |

---

## 1. "2.5D" — what shipped games actually do, and what it costs

### 1.1 The four families reduce to a 2×2, and the background axis is the cost axis

"2.5D" is a loose synonym cluster — the literature notes *"The terms 'isometric 3D', '3/4 perspective', '3/4 view', '2.5D', and 'pseudo 3D' are also sometimes used, although these terms can bear slightly different meanings in other contexts"* ([Wikipedia: Isometric video game graphics](https://en.wikipedia.org/wiki/Isometric_video_game_graphics)).

**[J]** The four families in the brief differ on exactly two axes: is the **background** a 2D bitmap or real-time 3D geometry, and is the **character** a sprite/billboard or a mesh. Backgrounds are where the per-location cost lives, so the background axis is the one that decides this project.

| Family | Background | Characters | Camera |
|---|---|---|---|
| **(a)** isometric tile | 2D tile atlas, parallel projection | 2D sprites | fixed/scrolled parallel |
| **(b)** 3/4 top-down layered | 2D tilemap, near-top-down | 2D sprites, per-layer z-order | fixed top-down |
| **(c)** HD-2D | **real-time 3D geometry** | 2D sprites/billboards | movable 3D |
| **(d)** pre-rendered | **pre-rendered 2D bitmap** of a 3D scene | 2D sprites *or* 3D meshes | fixed per scene |

The (c)/(classic) boundary is stated in the source itself: *"HD-2D shares many characteristics with the classic 2.5D style, combining pixel character sprites with 3D environments; however… Unlike games using the traditional 2.5D approach, HD-2D games feature backgrounds that are entirely rendered in 3D and often make use of complex camerawork"* ([Wikipedia: HD-2D](https://en.wikipedia.org/wiki/HD-2D)).

Two mechanical facts that drive cost engineering **[F]**:
- The projection is parallel, so *"objects do not change in size as they move about an area, there is no need for the computer to scale sprites or do the complex calculations necessary to simulate visual perspective"* ([Wikipedia](https://en.wikipedia.org/wiki/Isometric_video_game_graphics)). **The engine gets a discount the artist pays for**: nothing rotates at runtime, so every object is drawn in 4–8 fixed facings.
- True isometric is ≈35.264°; the pixel-art idiom is **2:1**, i.e. `arctan(1/2) ≈ 26.565°`, formally **dimetric** ([Wikipedia](https://en.wikipedia.org/wiki/Isometric_video_game_graphics)). Any tileset spec must be built on this number — a 32×16 cell is exactly 2:1.

### 1.2 Classification audit — the reference games, verified

| Game | Verified classification | Evidence |
|---|---|---|
| **Octopath Traveler** | (c) HD-2D — *"combining retro Super NES-style character sprites and textures with polygonal environments and high-definition effects"*; UE4, Square Enix × Acquire; the term was coined here | [Wikipedia: Octopath Traveler](https://en.wikipedia.org/wiki/Octopath_Traveler), [HD-2D](https://en.wikipedia.org/wiki/HD-2D) |
| **Triangle Strategy** | (c) HD-2D; UE4, Square Enix × Artdink | [Wikipedia: Triangle Strategy](https://en.wikipedia.org/wiki/Triangle_Strategy) |
| **Live A Live (2022)** | (c) HD-2D; UE4; Tokita *"was inspired to remake Live A Live using the graphical style of Octopath Traveler"* | [Wikipedia: Live A Live](https://en.wikipedia.org/wiki/Live_A_Live) |
| **Sea of Stars** | **(a) pure 2D isometric pixel art — NOT billboard-in-3D.** *"presented in a fixed isometric view using two-dimensional pixel art"*; the team *"spent the first six months of development creating dynamic lighting capabilities that appeared visually consistent with the pixel art"* | [Wikipedia: Sea of Stars](https://en.wikipedia.org/wiki/Sea_of_Stars) |
| **Stardew Valley** | **(b) top-down**, not isometric. Barone was *"the sole developer of the game, including all of its pixel art, music and sound effects"* using Paint.NET, over five years | [Wikipedia: Stardew Valley](https://en.wikipedia.org/wiki/Stardew_Valley) |
| **Diablo II** | (a) fixed-perspective 2D, optionally scaling distant sprites *"to lend it a 'pseudo-3D' appearance"* | [Wikipedia: Isometric video game graphics](https://en.wikipedia.org/wiki/Isometric_video_game_graphics), [Diablo II](https://en.wikipedia.org/wiki/Diablo_II) |
| **Baldur's Gate 1/2** | **(a)+(d) hybrid** — isometric viewpoint, *"pre-rendered locations"* | [Wikipedia: Baldur's Gate](https://en.wikipedia.org/wiki/Baldur%27s_Gate_(video_game)) |
| **Pillars of Eternity** | (d) — *"3D models against two-dimensional pre-rendered backdrops"*; Unity; Kickstarter >US$4M | [Wikipedia: Pillars of Eternity](https://en.wikipedia.org/wiki/Pillars_of_Eternity) |
| **Disco Elysium** | (d)-adjacent, isometric, painterly; **Unity**; ~35 in-house devs + ~20 external consultants at release | [Wikipedia: Disco Elysium](https://en.wikipedia.org/wiki/Disco_Elysium) |
| **Final Fantasy VII/VIII/IX** | (d) — FFVII *"featuring 3D character models superimposed over 2D pre-rendered backgrounds"*; combined dev+marketing ≈US$80M for FFVII | [Wikipedia: Final Fantasy VII](https://en.wikipedia.org/wiki/Final_Fantasy_VII) |
| **Resident Evil (2002)** | (d) — environments pre-rendered because full CG animation *"would require too much hardware capacity"*; 14 months, started with 4 programmers | [Wikipedia: Resident Evil (2002)](https://en.wikipedia.org/wiki/Resident_Evil_(2002_video_game)) |
| **SimCity 2000** | (a) — *"played from an isometric perspective"*, a *"near-isometric dimetric view"* inherited from A-Train | [Wikipedia: SimCity 2000](https://en.wikipedia.org/wiki/SimCity_2000) |
| **RollerCoaster Tycoon 1/2** | (a) — *"The first two games used this isometric viewpoint"* | [Wikipedia: RollerCoaster Tycoon](https://en.wikipedia.org/wiki/RollerCoaster_Tycoon) |
| **Coffee Talk** | (b) — PC-98-inspired pixel art, one fixed set, camerawork *"done through panning, and zooming"*; a reviewer noted the art *"does not have 'a ton of variety' as it is primarily set in a shop"*; Unity, Toge Productions | [Wikipedia: Coffee Talk](https://en.wikipedia.org/wiki/Coffee_Talk_(video_game)) |
| **Age of Empires II** | **UNVERIFIED** as "isometric" from the pages fetched. Engine/scale verified: Genie Engine, 2 years, 50 FTE, budget under $10M | [Wikipedia: Age of Empires II](https://en.wikipedia.org/wiki/Age_of_Empires_II) |
| **Two Point Hospital / Graveyard Keeper / VA-11 HALL-A / Neo Cab** | Engine verified (**Unity**, **Unity**, **GameMaker Studio**, **Unity**); render technique **UNVERIFIED** | [TPH](https://en.wikipedia.org/wiki/Two_Point_Hospital), [GK](https://en.wikipedia.org/wiki/Graveyard_Keeper), [VA-11 HALL-A](https://en.wikipedia.org/wiki/VA-11_Hall-A), [Neo Cab](https://en.wikipedia.org/wiki/Neo_Cab) |

**Two corrections to the brief's premises** **[F]**: **Sea of Stars is not billboard-in-3D** — it is pure 2D isometric with faked lighting, behind a 6-month R&D phase. And **Baldur's Gate 1/2 are not clean family (a)** — the viewpoint is isometric but the environments are pre-rendered, which is family (d)'s cost structure.

### 1.3 The art-cost numbers that actually exist

**One large isometric building — the best hard datapoint found.** Indie dev TranquilBeast published a breakdown of *"one of the most demanding assets they have ever worked on: a large isometric building made up of **126 layers and over 200k pixels**"* for *Death Afterparty*: *"It took **over 60 hours to draw**, plus another **10 to set it up in Unity**."* Structural constraints, verbatim: *"uses a tiled isometric grid where everything needs to fit within a **32x16** layout"*; each layer is a separate image on its own GameObject; *"Unity's default sorting does not work well for this kind of setup, so the developer uses a custom system, placing a sorting point on each object"*; collisions are hand-placed ([Jettelly, 2026-04-28](https://jettelly.com/blog/how-this-developer-built-a-126-layer-isometric-asset-for-unity)).

**[J]** Read that as ~70 hours for **one hero building** in the style with the *most* reusable free tooling. Extrapolate to 3–5 landmarks × 3–5 cities and the isometric route is arithmetically dead for one person.

**Modular-kit economics, from a shipped commercial game.** SimCity 2000's art team built largest-first and derived downward: *"**3 x 3 tile buildings were designed first, then were cut down to create 2 x 2 tile buildings, which were in turn cut down to create 1 x 1 tile buildings**."* Team and duration: *"Jenny and her team of **four** worked full-time on the art and appearance of the game for **four months**"*, using Deluxe Paint on 486 PCs. On city identity, art director Jenny Martin: *"Cities don't have one style, so we wanted to make a mix of the deco and the modern and the old style ornate buildings"* ([Wikipedia: SimCity 2000](https://en.wikipedia.org/wiki/SimCity_2000)).

> **[J] — the single most transferable trick in this report.** Deriving 2×2 and 1×1 buildings by *cropping* 3×3 masters means one hero building yields three placeable assets, and the crop boundary is a free modular seam. For a game that needs many visually distinct cities, this is the highest-leverage authoring rule available.

**Shipping tileset specs — verified, not estimated** **[F]**:

| Pack | Tile sizes | Layout note | Source |
|---|---|---|---|
| LimeZu — Modern Interiors | **16×16 / 32×32 / 48×48** | modular walls/floor/furniture; 2D *and* 3D walls; *"100+ frame by frame made animated objects"*; **"No generative AI was used"** badge | [limezu.itch.io/moderninteriors](https://limezu.itch.io/moderninteriors) |
| LimeZu — Modern Exteriors | **16×16 / 32×32 / 48×48** | *"Streets, buildings and each little detail you need for your cities"*; animated vehicles; **autotiles for Godot and GameMaker Studio** | [limezu.itch.io/modernexteriors](https://limezu.itch.io/modernexteriors) |
| Shubibubi — Cozy People | sprites **20×16**, cell **32×32** | layering *"to make layering clothing and hair as easy as possible"*; 13 hairstyles × 14 colours, 16 clothing × 10 colours, greyscale variants | [shubibubi.itch.io/cozy-people](https://shubibubi.itch.io/cozy-people) |
| TranquilBeast (shipped iso game) | **32×16** iso cell | every element must stay inside tile boundaries for sorting | [Jettelly](https://jettelly.com/blog/how-this-developer-built-a-126-layer-isometric-asset-for-unity) |

**How many unique tiles a modern-city street needs: [GAP].** No authoritative published breakdown exists. What is standable: LimeZu's exteriors pack ships **222 MB across 115 versions**, and the interiors pack documents *"thousands of furniture with different versions and styles"* and *"Single files for EACH furniture sprite… for a total of thousands of pngs"* ([Modern Exteriors](https://limezu.itch.io/modernexteriors), [Modern Interiors](https://limezu.itch.io/moderninteriors)). **Scope any tileset in the thousands of sprites, not hundreds.** Do not put a "tiles per street" figure in the plan.

**Published per-asset rates** **[F]** — from a pixel-artist's public price list ([itch.io: miagameart](https://itch.io/t/4047249/for-hireart-pixel-art-indie-prices-characters-backgrounds-portraits-tilesets)): character sprite ≤32×32 **$15**; ≥48×48 **$25**; **animation $3–8 per frame**; **tilesets from $35**. A rate roundup puts the isometric multiplier at **2–3×** vs a standard view ([StopGame, Mini Painter devlog](https://stopgame.ru/blogs/topic/118292/nikogda_ne_delay_pixel_art_igru_v_izometrii_mini_painter_devlog_1)) and reports a **commercial-licence multiplier of roughly 2×**, tripling at buyout.

**[J] — hourly-rate caveat:** I found no authoritative 2025–2026 freelance game-art rate survey. The only defensible conversion is the verified 70-hours-per-hero-building figure against the $15–40/h band in the same roundup → **~$1,050–2,800 for that single building**. That is arithmetic I performed, not a cited rate.

**What makes a foreign city *read* as foreign** — verified components, strongest evidence first **[F]**:
1. **Architecture kit swap, not tile swap.** Identity comes from the building silhouette vocabulary ([SimCity 2000](https://en.wikipedia.org/wiki/SimCity_2000)).
2. **Per-area ambient audio.** Sabotage *"created different ambient sounds for all of the areas to evoke a sense of place"* ([Sea of Stars](https://en.wikipedia.org/wiki/Sea_of_Stars)).
3. **Deliberate non-reuse.** *"Each area of the game was intended to be distinct so that the player would be constantly discovering something new"*; the team *"tried not to overly reuse enemy and art designs to avoid a sense of repetition"* ([Sea of Stars](https://en.wikipedia.org/wiki/Sea_of_Stars)).
4. **Signage, vehicles, street furniture** — exactly the content LimeZu's exteriors pack markets as city-defining, including *"Animated vehicles ranging from cars to trucks"* ([Modern Exteriors](https://limezu.itch.io/modernexteriors)).
5. **Palette.** LimeZu's own headline is *"Crisp RPG style, **unique**…"*.

### 1.4 Family cost model, and the recommendation

| Family | Marginal cost of city N+1 | Verdict for many foreign cities |
|---|---|---|
| (a) isometric | **Object count × 4–8 facings**, new per city; mitigated only by buying art | Best *look-per-dollar* **if bought, never if drawn** |
| **(b) 3/4 top-down layered** | **Style kit only** — palette + signage + 6–10 props; tiles reused unchanged | **Choose this** |
| (c) HD-2D | Two full pipelines (3D world + pixel sprites) + lighting/post tuning per scene | Reject |
| (d) pre-rendered | One bespoke painting **per screen, per camera angle**; locks resolution | Reject |

> **RECOMMENDATION (Q1): (b), 3/4 top-down with layered sprites, one shared tile vocabulary, per-city style kit.** Reject (a) and (c); treat (d) as a one-off cinematic technique only.

Ranked reasons **[F]**→**[J]**:
1. **Per-tile cost is flat in location count** in (b): one drawn tile is reusable unchanged. In (a) the artist pays object count × facings in every new city — the 2–3× isometric multiplier ([StopGame](https://stopgame.ru/blogs/topic/118292/nikogda_ne_delay_pixel_art_igru_v_izometrii_mini_painter_devlog_1)).
2. **The engine path already points at (b).** Phaser 4's tilemap layer accepts `orthogonal, isometric, hexagonal, and staggered`, **but `TilemapGPULayer` — the fast path — is "Orthographic maps only (no iso/hex/staggered)"** ([Phaser 4.2.1 `skills/tilemaps/SKILL.md`](https://unpkg.com/phaser@4.2.1/skills/tilemaps/SKILL.md)). The fast renderer and isometric art are mutually exclusive in the engine the project already chose.
3. **HD-2D is disqualified by its own vendor.** Asano: *"it costs more than you'd think"* and *"there might not be much to gain from other companies copying it"*; Arai: *"It took a lot of resources to make the map observable from all sides"* ([Nintendo Life](https://www.nintendolife.com/news/2022/05/triangle_strategy_producers_talk_hd_2d_and_why_other_devs_havent_used_it)). Square Enix additionally needs cross-team knowledge transfer between HD-2D projects. A one-owner team has no such pool.
4. **(d) is a pipeline project, not an art project.** Obsidian spent **8 months** just making the tech look like the Infinity Engine, rendering backdrops at **10,000 × 10,000 px** over "days" on a render farm ([Game Developer](https://www.gamedeveloper.com/art/how-obsidian-replicated-the-look-of-an-infinity-engine-game----in-2015), [RPS](https://www.rockpapershotgun.com/pillars-of-eternity-tyranny-art)). Wrong shape of work, and static backdrops cannot be re-lit for day/night.
5. **Layered sprites solve characters cheaply** — 13 hairstyles × 14 colours and clothing in 10 colours from one greyscale base ([Cozy People](https://shubibubi.itch.io/cozy-people)). For a cast of ordinary people in ordinary clothes, that is the highest-leverage single art decision available.

**Cost drivers in priority order** **[J]**:

| # | Driver | Why it ranks here | Anchor |
|---|---|---|---|
| 1 | **Location count × distinct props per location** | The only term that scales with what this game needs most | [LimeZu](https://limezu.itch.io/moderninteriors); [Quaternius 315-module kit](https://quaternius.com/packs/downtowncitymegakit.html) |
| 2 | **Animation frame count** | ~3–5× the static price, multiplied across every NPC | [rate roundup](https://www.163.com/dy/article/L0H298GJ0526K8VB.html) |
| 3 | **Commercial-licence multiplier** | ~2× private commission; ~3× buyout | [same](https://www.163.com/dy/article/L0H298GJ0526K8VB.html) |
| 4 | **Signage / typography localisation** | Largest *perceived* city difference; least served by generic packs | **[J]** |
| 5 | **Depth sorting / anchor conventions** | Zero art budget, but constrains how art may be cut; cheapest now, worst to retrofit | [Jettelly](https://jettelly.com/blog/how-this-developer-built-a-126-layer-isometric-asset-for-unity) |
| 6 | **Ambient audio** | Per-city, small, often CC0 | **[J]** |

**[+]contract** — The skill already states the enforcement rule for driver #1: *"Does a new city need a new tile type? → that is a design bug, not an art task; the tile vocabulary is shared and each city gets only a style kit (palette + signage + 6–10 district props)."* This recon confirms that rule is not arbitrary — it is the only cost model that survives one owner.

---

## 2. Engine & library selection

### 2.1 Versions and maintenance, verified 2026-09-28

| Option | Latest stable | Published | Cadence observed | Licence | Backing / bus factor |
|---|---|---|---|---|---|
| **PixiJS** | `pixi.js` **8.21.0** | 2026-09-17 | ~5 stable releases in 12 months | MIT | PixiJS Collective / Open Collective; 48k★ |
| `@pixi/react` | **8.0.5** | **2025-12-01** | **Stale ~10 months** | MIT | Community |
| **Phaser 4** | `phaser` **4.2.1** | 2026-07-09 | 4.0.0 **2026-04-10** → 4.1.0 04-30 → 4.2.0 06-19 → 4.2.1 07-09 | MIT | Phaser Studio Inc., live commercial arm ([pricing](https://phaser.io/pricing)); 40k★ |
| **Phaser 3** | **3.90.0** | **2025-05-23** | Line frozen | MIT | — |
| **three.js** | **0.186.1** (r186) | 2026-09-24 | ~every 4–8 weeks | MIT | mrdoob + large core team |
| **Babylon.js** | `@babylonjs/core` **9.28.0** | 2026-09-24 | Patch-per-few-days; 9.0 announced 2026-03-26 | Apache-2.0 | Microsoft |
| **PlayCanvas** | `playcanvas` **2.22.6** | 2026-09-28 | Very high | MIT engine | Editor tiers paid; ownership line rests on one secondary source (**UNVERIFIED**) |
| `@playcanvas/react` | **0.11.7** | 2026-09-25 | Active, **0.x pre-1.0** | MIT | — |
| **Godot** | **4.7.2-stable** | 2026-08-22 | 4.7 06-18 → 4.7.1 07-14 → 4.7.2 08-22 | MIT | Godot Foundation |
| **Unity** | **6000.6.3f1** (Unity 6.6) | docs 2026-09-26 | Feature streams + patches | Proprietary | Unity Technologies |
| **Defold** | **1.13.1-stable** | 2026-08-17 | ~monthly stable | Source-available, **not MIT** | Defold Foundation (Swedish foundation law) |
| **React + hand-rolled canvas** | n/a | n/a | n/a | n/a | you |
| `@react-three/fiber` | **9.8.1** | 2026-09-24 | v10 alpha since 2026-09-08 | MIT | pmndrs collective |

Sources: npm registry metadata ([pixi.js](https://registry.npmjs.org/pixi.js), [phaser](https://registry.npmjs.org/phaser), [three](https://registry.npmjs.org/three), [@babylonjs/core](https://registry.npmjs.org/@babylonjs/core), [playcanvas](https://registry.npmjs.org/playcanvas), [@playcanvas/react](https://registry.npmjs.org/@playcanvas/react), [@pixi/react](https://registry.npmjs.org/@pixi/react), [@react-three/fiber](https://registry.npmjs.org/@react-three/fiber)); GitHub release feeds ([pixijs](https://github.com/pixijs/pixijs/releases.atom), [phaser](https://github.com/phaserjs/phaser/releases.atom), [three.js](https://github.com/mrdoob/three.js/releases.atom), [Babylon.js](https://github.com/BabylonJS/Babylon.js/releases.atom), [playcanvas](https://github.com/playcanvas/engine/releases.atom), [godot](https://github.com/godotengine/godot/releases.atom), [defold](https://github.com/defold/defold/releases.atom), [react-three-fiber](https://github.com/pmndrs/react-three-fiber/releases.atom)).

**Phaser 3 → 4 migration** **[F]**: v3 render pipelines become single-purpose **render nodes**; FX/masks unify into one **Filter** system usable on any object or camera; `setTintFill()` → `setTint()` + `setTintMode()`; `Geom.Point` → `Vector2`; `Math.TAU` is *corrected* from the buggy v3 `PI/2` to `PI*2` **[J: a v3 latent correctness bug]**; `Phaser.Struct.Set`/`Map` → native `Set`/`Map`; `DynamicTexture` now requires `render()`; `roundPixels` now defaults `false`; compressed textures must be **re-compressed** for the new internal Y-axis orientation. **Removed with no direct replacement: `Mesh`, `Plane`, `Camera3D`, `Layer3D`** ([migration article](https://www.phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know), [3 vs 4](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4)). Phaser's own estimate: sprites/text/tilemaps ≈ *"a few hours of work"*; custom WebGL more.

### 2.2 React coexistence — the decisive axis, and it is a peer-dependency fact

The binding you can install is constrained by **React 18.2**, which this repo already is ([package.json](../../package.json)):

| Binding | Version | `peerDependencies` | Works on React 18.2? |
|---|---|---|---|
| `@pixi/react` | 8.0.5 | `react >=19.0.0`, `pixi.js ^8.2.6` | **No** |
| `@pixi/react` | 7.1.2 (2024-03-20) | `react >=17` + a dozen `@pixi/* >=6` peers | Yes, but drives **PixiJS v6/v7**, not `pixi.js@8` |
| `@react-three/fiber` | 9.8.1 | `react >=19 <19.4` | **No** |
| `@react-three/fiber` | 8.18.0 (2025-02-19) | `react >=18 <19` | Yes — last React-18 line |
| `@react-three/drei` | 10.7.9 | `react ^19`, `r3f ^9` | **No** |
| `@playcanvas/react` | 0.11.7 | `react ^18.3.1 \|\| ^19.1.0` | **Yes — the only official binding that accepts 18** |
| `react-babylonjs` | 4.0.2 | `react >=19` | No (React-18 line is the `r18` tag pinned at 3.4.0) |
| **Phaser** | 4.2.1 | **no React peer — framework-agnostic** | **Yes, no binding involved** |

The PixiJS React v8 rewrite is explicitly *"designed exclusively for React 19"*, and the maintainer's own post says *"we recognize that this places significant hurdles in the upgrade path for our **React 18** users"* ([Introducing PixiJS React v8](https://pixijs.com/blog/pixi-react-v8-live)). R3F states the identical law: *"Three-fiber is a React renderer, it must pair with a major version of React, just like react-dom"* ([R3F v9 migration](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)).

**[J]** A reconciler-based binding **locks the SPA's React major**. Phaser has no reconciler — that is precisely why it survives React 18. Choosing Pixi or R3F is therefore *two* migrations (engine + React major), not one.

**Two integration patterns** **[F]**→**[J]**:
1. **Imperative canvas as an opaque island (recommended).** React owns the DOM shell (MUI chrome, routing, forms, guide export); a single `<div ref>` is handed to the engine, which owns the canvas and its own RAF loop. React never re-renders per frame. Phaser, Pixi-without-binding, bare three.js, PlayCanvas-standalone, Godot/Unity and hand-rolled canvas all give you this. **Smallest new surface area: one ref and one `destroy()`.**
2. **Declarative scene graph.** R3F and `@pixi/react` v8 reconcile scene nodes through React — ergonomic, with Suspense asset loading, but **scene complexity becomes React reconciliation cost**, and the frame loop must be kept out of render. R3F's own guard rails exist for this: `frameloop="demand"`, `invalidate()`, `useLoader` caching, instancing ([R3F: Scaling performance](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx)).

**StrictMode double-mount is a documented, real class of canvas bug** **[F]**: React's docs state components *"will re-render an extra time to find bugs caused by impure rendering"* and *"will re-run Effects an extra time"* ([react.dev StrictMode](https://react.dev/reference/react/StrictMode)). Concrete instances: `p5-wrapper/react` issue **#255**, titled literally *"React's strict mode causes the canvas to be created twice"* ([issue](https://github.com/p5-wrapper/react/issues/255)); and an SO question titled *"Phaser 3 - Duplicate Canvas component is created when creating a new instance of Phaser 3 GameObject in React"* ([SO 73368742](https://stackoverflow.com/questions/73368742/phaser-3-duplicate-canvas-component-is-created-when-creating-a-new-instance-of) — **UNVERIFIED beyond the title; the page returned HTTP 403**). R3F: *"This release contains breaking changes when using Strict Mode, which can highlight bugs during development"* ([R3F v9](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)).

**[J] The 10-line mitigation, designed in from day one:** construct the engine **inside** the effect (never in `useMemo` or module scope), and return a cleanup that calls the engine's single teardown — `game.destroy(true)`, `app.destroy()`, `renderer.dispose()` + `forceContextLoss()`. Concurrent rendering is then a non-issue for pattern (1), because game state lives outside React.

**AI-agent ergonomics is a real factor here, not a soft one** **[F]**: Phaser markets AI-readiness concretely — *"Every frontier model knows the Phaser API deeply, so we were careful to ensure this knowledge carried over"*, plus shippable agent **skills files** ([phaser.io](https://phaser.io/)) — and ships official integration templates for React, Vue, NextJS, Svelte, Remix, SolidJS ([phaser.io](https://phaser.io/)). **[J]** For a team whose labour is mostly AI agents, a well-known API with vendor-supplied agent context is worth more than nominally cleaner architecture.

### 2.3 Out-of-the-box 2.5D, tilemaps, assets, TypeScript

| Option | Isometric tilemaps | Depth sort | Tiled import | LDtk import | TypeScript |
|---|---|---|---|---|---|
| **Phaser 4** | **Yes** in the standard path — `FromOrientationString` recognises `'isometric'` ([Parsers](https://docs.phaser.io/api-documentation/4.0.0/namespace/tilemaps-parsers)); **GPU layer is ortho-only** | Yes, explicit depth/index model | **First-class built in**: `this.load.tilemapTiledJSON()` ([Loader](https://docs.phaser.io/phaser/concepts/loader)) | Community only | `types/phaser.d.ts` shipped; `main`/`module`/`types` all declared |
| **PixiJS v8** | No engine-level iso; position sprites yourself | `sortableChildren` + `zIndex` (standard v8 pattern) | Community (`pixi-tiledmap`, listed by Tiled itself) | Community (`pixi-ldtk-loader`) | Rebuilt TS-first; WebGPU types need `@webgpu/types` |
| **three.js** | No tilemap concept | Manual | **No official loader** | No | `@types/three` |
| **Babylon.js** | No tilemap concept | Manual | No official loader | No | First-party `.d.ts` |
| **PlayCanvas** | No tilemap concept | Manual | Community | Community | Good |
| **Godot 4** | **Native** — TileSet shape *"rectangular, hexagonal, or isometric (pseudo-3D perspective)"*, node is `TileMapLayer` | `y_sort_enabled` / `Y Sort Origin` | Native `.tscn` exporter + **YATI** | Addon-dependent | GDScript-centric; **C# cannot export to web** |
| **Unity 6 Web** | Editor-side 2D iso tilemap | Manual | Manual | Manual | C# only |

Asset pipeline **[F]**: PixiJS v8 requires **explicit** compressed-texture registration (`import 'pixi.js/ktx2'` etc. before any `Assets.load`) and AssetPack can emit `.basis`/`.ktx2`/`.dds` variants ([PixiJS compressed textures](https://pixijs.com/8.x/guides/components/assets/compressed-textures)). Phaser 4 has its own atlas format — **PCT (Phaser Compact Texture)**, *"typically 90–95% smaller than equivalent JSON atlases"* — plus the v4 breaking change that compressed textures must be re-compressed ([Phaser 3 vs 4](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4)). Unity's own web guidance for mobile is ASTC with **8×8 blocks** ([Unity](https://docs.unity3d.com/Manual/web-optimization-mobile.html)).

### 2.4 Web GPU support, performance, mobile — and what is *not* known

- **WebGPU is not the target.** PixiJS's own renderer doc marks `WebGLRenderer` *"✅ Recommended"* and `WebGPURenderer` *"🚧 Experimental"*, stating *"It is recommended to use the WebGL renderer for production applications"* ([PixiJS renderers](https://pixijs.com/8.x/guides/components/renderers.md)). three.js's WebGPU renderer is *"still a work in progress"* ([R3F v9](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)). **Godot does not support WebGPU** ([Godot: Exporting for the Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)). Unity web is **WebGL 2 only** ([Unity browser compatibility](https://docs.unity3d.com/Manual/webgl-browsercompatibility.html)). WebGPU is ~85.7% global with Firefox disabled-by-default through v159 and Safari partial ([caniuse](https://caniuse.com/webgpu)). **[J]** Target WebGL 2; treat WebGPU as a future free win.
- **[GAP] No independent 60 fps benchmark exists** for a 2.5D isometric city scene in any engine that I could fetch. All sprite-count claims are vendor marketing (Phaser "1M sprites / 1 draw call"; Pixi "hundreds of thousands of particles"). **Do not put a sprite-count number in the plan.** The measurable spike: one real city pack, real atlas, 200 animated NPCs, on a real mid-range Android and a real iPhone — a 5-minute test, not a research question.
- **[GAP] iOS canvas-size / texture-memory / per-tab memory caps** are not published in any primary source retrieved. Measure.
- **Mobile/portal reality** **[F]**: CrazyGames gates monetisation on *"average playtime, conversion to gameplay, and retention"*, with a 7–21-day Basic Launch with monetisation **disabled** ([docs.crazygames.com](https://docs.crazygames.com/)). **[J]** A travel sim whose point is that the player *stops playing and goes to Japan* optimises the opposite metric. Portals are a technical proving ground (they force small builds), not a business model.
- **[J] Runtime AI images**: all candidates can accept a runtime image — Pixi natively takes `HTMLCanvasElement`/`ImageSource`; Phaser takes a URL or a canvas via `textures.addCanvas`. **But [+]** the project's own contract makes runtime AI *art* a non-goal: narrative is text. Keep AI out of the texture path entirely; generate *text*, never sprites.

### 2.5 Ranked recommendation

**🥇 1st — Phaser 4.2.1 as an imperative canvas island, React 18 shell unchanged, top-down + Y-sort.**
- It is the only option simultaneously **browser-native, React-18-compatible, TypeScript-first, and tilemap-grade**. Pixi loses on React 18; R3F loses on React 18; Babylon loses on fit; Godot/Unity/Defold lose on the React/UI half of the product.
- Phaser 3's last release is **3.90.0 (2025-05-23)** and v4 is at **4.2.1 (2026-07-09)** — starting a multi-month project on the frozen branch defers documented migration work for no upside. **[GAP]** Phaser has published no 3.x end-of-support date; "3.x is unsupported" would be an overstatement.
- `TilemapGPULayer` is a genuine advantage: one draw call per layer, fixed per-pixel cost regardless of visible tiles, up to 4096×4096 tiles, seam-free filtering, explicitly recommended for mobile ([Phaser 4 changelog](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4)).
- **The condition accepted with this pick: commit to top-down + Y-sort, not true isometric**, because the GPU layer is ortho-only and v4 deleted the 3D escape hatches. **[J]** This is the single cheapest decision on the whole list, and it is the same decision §1 recommends.
- Cost: ~347 KB gzip whole-library, MIT, 4.2.1 current, documented migration path.

**🥈 2nd (backup) — PixiJS v8.21 as an imperative canvas island, explicitly WITHOUT `@pixi/react`.**
Smallest complete 2D renderer on the list (~255 KB gzip), best-documented batching, native canvas texture inputs, MIT, very active core. **Cost:** zero built-in tilemap, scenes, physics or Tiled loading — you build the exact layer Phaser donates, which is where a one-owner team is thinnest. Take it only if Phaser's renderer or scene abstraction actively fights this project.

**🥉 3rd — React + hand-rolled Canvas2D/WebGL.** Underrated for *this* shape: one cached static ground layer + a small dynamic sprite layer + input. **0 KB** dependency, **zero** React-version risk, cannot be deprecated. Cost: you own atlases, animation, input, audio, camera, culling, and mobile fallback — and with *many city scenes* that per-scene plumbing is where the time goes.

**4th — three.js + R3F.** Best-in-class 3D, real orthographic camera, huge ecosystem. Rejected because (a) R3F v9 needs **React ≥19** and drei 10.7.9 needs `react ^19`, so React 18 pins you to R3F **8.18.0 from 2025-02-19**; (b) no tilemap concept, so "many city scenes" becomes "write a tilemap system"; (c) declarative scene graph turns scene size into reconciliation cost.

**5th — PlayCanvas + `@playcanvas/react`.** Notable: **0.11.7 is the only official engine React binding whose peer range accepts React 18**. Rejected because it is a 3D engine with no 2D tilemap story, ~600 KB gzip, a **0.x pre-1.0** binding, an editor whose practical path is paid ($15/mo Personal; Organization $50/seat/mo; *"private projects will become locked (inaccessible) when you cancel"* — [plans](https://playcanvas.com/plans)), and a cloud IDE rather than a local toolchain.

**6th — Babylon.js 9.** Strongest pure-3D feature set; the only option with unambiguous big-corporate backing (Microsoft, Apache-2.0); its new lighting works on both WebGPU and WebGL 2 with fallbacks ([Babylon 9](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0/)). Rejected: ~**1.70 MB gzip** for the whole `@babylonjs/core` entry, **no official React binding** (community `react-babylonjs` 4.0.2 needs React ≥19; React-18 line is `r18` pinned at 3.4.0), and nothing for tilemaps or 2.5D that three.js lacks.

**7th — Defold.** Best *governance* story on the list (foundation-law-protected objectives; King has *"no direct influence"* — [defold.com/open](https://defold.com/open/)) and an unusually honest HTML5 story (256 MB heap; `wasm-web` **and** `wasm_pthread-web` with runtime selection; explicit COOP/COEP requirement; documented that **Hot Reload does not work in HTML5** — [Defold HTML5](https://defold.com/manuals/html5/)). Rejected: Lua + bespoke editor = **zero reuse** of the existing React/TS skills and code, no React binding, no Tiled-first tooling, and a licence that is not MIT.

**8th — Godot 4.x web export.** Excellent engine, wrong target, and the docs are candid about why: **C# cannot be exported to the web**; WebGL 2 only; Compatibility renderer only; **no WebGPU**; threaded export needs SharedArrayBuffer + full cross-origin isolation, meaning *"no ads, nor third-party integrations on the website hosting your game"*; Safari *"has several issues with WebGL 2.0 support"*; audio effects/reverb/doppler unsupported in the default web sample mode; no low-level networking; `.pck`/`.wasm` *"usually large in size"* and itch.io/GitLab Pages do not gzip on the fly; and *"if the client doesn't receive the required response headers… the project will not run"* ([Godot: Exporting for the Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)). Plus zero React reuse.

**9th — Unity 6 Web.** Heaviest and most constrained. Supported mobile browsers are only **iOS Safari 15+ and Chrome 58+ on Android**; **no managed (C#) threading** (*"Managed (C#) threads aren't supported on the Web platform due to the lack of a multithreaded garbage collection feature in WebAssembly"*); no `Reflection.Emit`; no `System.Net` sockets; physics results are **not guaranteed to match** the editor; background tabs drop to ~1 update/second ([browser compatibility](https://docs.unity3d.com/Manual/webgl-browsercompatibility.html), [technical overview](https://docs.unity3d.com/6000.6/Documentation/Manual/webgl-technical-overview.html), [performance](https://docs.unity3d.com/Manual/webgl-performance.html)). Build weight: a measured **10.7 MB** default empty 3D URP web build, **7.7 MB** for 2D BiRP, **2.3 MB** only after stripping packages — for an *empty* project ([aras-p gist](https://gist.github.com/aras-p/740c2d4f9977ce92b7de72b1394dd365)). The Runtime Fee was cancelled 2024-09-12 ([Unity](https://unity.com/blog/unity-is-canceling-the-runtime-fee)), but the trust cost remains. Wrong tool even though the engine is excellent.

**10th — Phaser 3 as a *fresh* choice in 2026.** Not dead, but its last npm release predates Phaser 4.0.0 by ~11 months and the roadmap energy is entirely v4.

**Falsification triggers `[J]` — what would change the pick:**

| Trigger | New recommendation |
|---|---|
| Art direction becomes **true isometric** | Three.js + R3F **and** upgrade the SPA to React 19 — Phaser 4 cannot render an iso GPU layer and deleted its 3D objects |
| Measured Phaser 4 production bundle **> 1.5 MB gzip** and first-load dominates | Re-open **PixiJS v8 + React 19** (Pixi's `extend()` catalogue exists to keep bundles small) |
| The guide/memoir UI is descoped to **< 5 screens** (game becomes a standalone cart) | **Godot 4.7 web export** becomes viable — budget COOP/COEP and WebGL-2-only, no multithreading |

---

## 3. Isometric/tilemap tooling and asset sources

### 3.1 Tiled vs LDtk — capability fit, not licence, decides it

| | **Tiled** | **LDtk** |
|---|---|---|
| Latest release | **1.12.2, 2026-05-27** (1.12.1 03-25; 1.12.0 03-13; 1.11.2 2025-01-28) ([releases API](https://api.github.com/repos/mapeditor/tiled/releases)) | **1.5.3, 2024-01-15** (1.5.0–1.5.3 all landed 2024-01-10…15) ([releases API](https://api.github.com/repos/deepnight/ldtk/releases)) |
| Site-stated latest (2026-09-28) | 1.12.2 ([docs](https://doc.mapeditor.org/en/stable/)) | **1.5.3** *"Latest stable"* with **1.5.4 (preview)** ([ldtk.io/download](https://ldtk.io/download/)) |
| Repo activity | Last commit **2026-09-25** (*"docs: Point to YATI and ue5-tiled-importer (#4621)"*) | Last commit **2026-07-12** (*"fix/ci"*). **Actively committed to but no tagged release since Jan 2024** — a version-pinning risk |
| Editor licence | **GPL-2.0** ([LICENSE.GPL](https://raw.githubusercontent.com/mapeditor/tiled/master/LICENSE.GPL)) | *"You may use any content created with LDtk as you wish, even for commercial projects. No hidden fee: LDtk will always be free."* ([ldtk.io/download](https://ldtk.io/download/)) |
| Library/format licence | **BSD** for `libtiled` ([LICENSE.BSD](https://raw.githubusercontent.com/mapeditor/tiled/master/LICENSE.BSD)) | MIT per registry metadata; **UNVERIFIED** — the application LICENSE file was not retrievable this pass |
| Orientations | `orthogonal`, `isometric`, `oblique`, `staggered`, `hexagonal` ([JSON map format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)) | **Square grids only** |

**[J]** The GPL/BSD split is a **non-issue**: GPL governs the *editor program*, not the maps you author, and `libtiled` is BSD — you never ship either in a browser game. What decides it is capability.

### 3.2 LDtk does not support isometric — settled, three independent confirmations

1. **Feature request #102, "Hex grids"** (opened 2020-09-26 by morgan3d) was **closed `wontdo ❌`** by maintainer deepnight ([issue #102](https://github.com/deepnight/ldtk/issues/102)).
2. **Feature request #944, "Hex or Isometric tile support"** (2023-07-24) records that it *"is a duplicate of the issue of Hex or Isometric tiles which was first opened 2-3 years ago in issue #102"* and that deepnight *"mentioned the difficulty comes from hidden 'dev costs' of supporting those types of tiles and **placed it under wontdo**"*. Closed ([issue #944](https://github.com/deepnight/ldtk/issues/944)).
3. **The JSON schema has no isometric concept.** Grepping the published schema for grid/geometry fields returns only `defaultGridSize`, `tileGridSize`, `gridSize`, `pxWid` — no orientation, projection-angle or iso flag ([LDtk JSON schema](https://ldtk.io/files/JSON_SCHEMA.json)).

LDtk's only bridge is a one-way TMX export that the maintainer discourages: it *"ONLY exists as a temporary method to load a LDtk project JSON in a game framework that only supports TMX files"*, with *"It is strongly advised to parse the LDtk JSON file"*, and documented limitations (multi-layer explosion, IntGrid flattened to a dummy square tilesheet, arrays flattened to `myArray_0`…, PNG-only) ([ldtk.io exporting-tiled-tmx](https://ldtk.io/docs/game-dev/exporting-tiled-tmx/)).

**[J]** **If the art direction is isometric, LDtk is out of the decision entirely.** If it is top-down layered (which §1 recommends), LDtk's auto-layer rules, Worlds and `.aseprite` live-reload remain genuinely valuable for a one-person art loop, and its lack of isometric support costs nothing. **But** the four-year release gap argues for **Tiled** as the standard anyway, because Tiled is also what Phaser supports natively.

### 3.3 Engine import matrix

| Engine | Version | Tiled | LDtk | Isometric rendering |
|---|---|---|---|---|
| **Phaser 4** | **4.2.1** (2026-07-09) | **First-party** — `load.tilemapTiledJSON()`, `addTilesetImage()`, `createLayer()`, `setCollision()` | No first-party loader | Supported, **not on the GPU fast path**; `TilemapGPULayer` is *"Orthographic maps only"*, single tileset/layer, max 4096×4096 |
| **Phaser 3** | 3.90.0 | First-party | Community | In v3 tilemap API; GPU path ortho-only |
| **PixiJS v8** | **8.21.0** (2026-09-17) | `pixi-tiledmap` (third-party, listed by Tiled itself) | `pixi-ldtk-loader` **v2.3.3, 2024-11-25** | **Not in core.** `@pixi/tilemap` **5.0.2 (2025-07-14)** is *"a low-level **rectangular** tilemap implementation"*; `pixi-viewport` **6.0.3 (2024-11-27)** is the camera (*"v6.0.0 Moves pixi-viewport to pixi.js v8+"*) |
| **Godot 4** | 4.7.2 | **Native `.tscn` exporter ships with Tiled**; **YATI** now the officially pointed-to importer | No first-party importer | **Native** TileSet shape |
| **three.js / Babylon.js** | 0.186.1 / 9.28.0 | **No official loader.** Tiled's HTML5 list names Crafty, Excalibur, GameJs, melonJS, Panda 2, `pixi-tiledmap`, Phaser, TMXjs — **neither three.js nor Babylon** ([Tiled libraries](https://doc.mapeditor.org/en/stable/reference/support-for-tmx-maps/)) | none | You write the projection |

**Source-file evidence:** [Phaser 4.2.1 `skills/tilemaps/SKILL.md`](https://unpkg.com/phaser@4.2.1/skills/tilemaps/SKILL.md) (ships inside the npm package — the "agent skills file"), [Phaser `Tilemaps.Tilemap` API](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap), [`@pixi/tilemap` README](https://raw.githubusercontent.com/pixijs/tilemap/main/README.md), [`pixi-viewport` README](https://raw.githubusercontent.com/davidfig/pixi-viewport/master/README.md), [Godot Using TileSets](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html).

**Godot importer status — a September 2026 change, not folklore** **[F]**: Tiled maintainer **bjorn merged PR #4621 on 2026-09-25**, *"docs: Point to YATI and ue5-tiled-importer"*, rationale: *"Added YATI to the Godot section… **since it is the more complete and popular option**"* ([Tiled PR #4621](https://github.com/mapeditor/tiled/pull/4621)). YATI: **v2.2.7**, requires **Godot ≥4.3** (a 1.7.1 line for 4.2.x), tested *"with **Godot 4.6.1 and Tiled 1.12**"*, supports **all map orientations**, ships GDScript and C# builds, **MIT, © 2023–2026 Roland Helmerichs** ([README](https://raw.githubusercontent.com/Kiamo2/YATI/main/README.md), [LICENSE](https://raw.githubusercontent.com/Kiamo2/YATI/main/LICENSE)). Documented operational hazard: *"**Untick 'Use multiple threads'**… Otherwise — if you have more than one Tiled map — Godot may freeze (+crash) during import."* The older **`vnen/godot-tiled-importer`** is effectively dead — last push **2023-03-15**, i.e. pre-Godot-4 (**UNVERIFIED**: repo status not retrievable this pass; GitHub API rate-limited).

### 3.4 Phaser isometric plugins — do not plan on them

| Package | Version | Published | Status |
|---|---|---|---|
| `phaser3-plugin-isometric` (npm) | **0.0.7** | **2018-12-12** | Dormant ~8 years ([npm](https://registry.npmjs.org/phaser3-plugin-isometric)) |
| `gnunua/phaser3-plugin-isometric` | — | — | Maintainer's own words: *"This is a **WIP** fork"*; 3D AABB physics *"Working, but needs refactoring!"*; debug *"Not working yet!"* ([README](https://raw.githubusercontent.com/gnunua/phaser3-plugin-isometric/master/README.md)) |
| `phaser-ldtk-importer` | **0.0.0** | 2024-04-09 | A `0.0.0` version number signals an unpublished scaffold |

The fork's useful detail: it exposes `scene.isometric.projectionAngle` for *"classic 2:1 pixel dimetric, true 120° isometric or any angle you like"* and adds `scene.add.isoSprite` factories — i.e. it is an **axonometric sprite plugin, not a tilemap renderer** ([README](https://raw.githubusercontent.com/gnunua/phaser3-plugin-isometric/master/README.md)).

> **[J]** A 2018 npm release plus a self-declared WIP fork with broken debug tooling is not a foundation for a multi-city product. The viable isometric options in the JS stack are (i) Phaser 4's classic `TilemapLayer` with iso map data, accepting the non-GPU path, or (ii) a hand-written projection over sprite blitting. **Both cost engineering time the project does not have** — another reason §1 picks top-down.

### 3.5 Asset sources — licence and price, with the traps flagged

**CC0 / zero strings** **[F]**:

| Source | Content relevant here | Licence (published wording) | Price |
|---|---|---|---|
| **Kenney** (2D *and* 3D) | e.g. *City Kit (Commercial)*, 50 files; *Isometric Miniature Dungeon*, 70 files | *"all game assets on the asset pages are public domain licensed (**CC0**). You're free to use them, even in commercial projects."* / *"**Attribution is not required**"* / do not use the logo | Free ([kenney.nl/support](https://kenney.nl/support), [City Kit](https://kenney.nl/assets/city-kit-commercial)) |
| **Kenney All-in-1** (itch) | 60,000+ assets | `Creative Commons Zero v1.0 Universal`; *"unlimited commercial projects"*; note the page also states **"Content: No generative AI was used"** (a provenance claim, not a restriction) | **$19.95** min ([kenney.itch.io](https://kenney.itch.io/kenney-game-assets)) |
| **KayKit** (Kay Lousberg) | Low-poly 3D packs; character packs with animation libraries; single 1024² atlas downsamplable to 128² | *"Free for personal and commercial use, no attribution required. **(CC0 Licensed)**"* | Free; Complete KayKit **$150**; bundles $19.95 ([README](https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/README.md)) |
| **Quaternius** (3D) | **Downtown City MegaKit — 315 models**, *"over 300 modular environment pieces for building full Boston/NYC style city blocks"*; Modular Train Pack; Cars Pack | ⚠️ **Two licence texts coexist**: pack pages say **"License CC0"**, while the site licence page now states the **Quaternius Asset License (QAL) v1.0, last updated 8/28/2026** — *"use… with no credit required. You just can't resell or redistribute the assets themselves as assets."* | Free; source kits via Patreon $10/$20/$50 ([pack](https://quaternius.com/packs/downtowncitymegakit.html), [licence](https://quaternius.com/license.html)) |

**Commercial-OK, but read the terms** **[F]**:

| Source | Commercial? | Attribution | Redistribution | AI clause | Price |
|---|---|---|---|---|---|
| **LimeZu — Modern Interiors** | **Yes** — *"Edit and use the asset in any commercial or non commercial project"* | **REQUIRED** — *"Credits required"* | **No** — reselling/distributing forbidden, including edited | Page badge **"No generative AI was used"**; the full `.txt` licence was **not retrievable** — **UNVERIFIED** whether an AI-reference ban exists | **≥$1.50**; pack 149 MB; 3-pack bundle $5.00 |
| **LimeZu — Modern Exteriors** | Yes, same terms | **REQUIRED** | **No** | same caveat | list **$5.00**, 50% off → **$2.50**; 222 MB, version 115; **autotiles for Godot and GameMaker** |
| **Cup Nooble — Sprout Lands** | ⚠️ **Premium only** | *"Please Credit: Cup Nooble"* | **No** | **"No generative AI was used"** | Premium **≥$3.99**; **the FREE version is NON-COMMERCIAL ONLY** — *"can't be used in any commercial project"* |
| **shubibubi — Cozy People** | Yes at the paid tier | *"Credit appreciated"* (not required) | No | not stated | **$3.99**; **free version non-commercial only**; 7-pack bundle $20.00. **UNVERIFIED: exact terms not retrievable** |
| **CraftPix** | **Yes** — *"unlimited number of free and commercial projects"*, *"Without Royalty Fee"* | **No** | No source-file redistribution | **⛔ EXPLICITLY FORBIDDEN** — assets *"may not be used… for the purposes of training, fine-tuning, developing, testing, validating, or improving any artificial intelligence (AI), machine learning (ML), deep learning, generative AI, or similar systems"* | per-asset ([file licences](https://craftpix.net/file-licenses/)) |
| **Unity Asset Store — *The Japan Collection: Japanese City (Free Version)*** (GK Gutty Kreum) | ⚠️ **Conditional** | — | — | — | **FREE**, but governed by the **Standard Unity Asset Store EULA** with licence type **"Extension Asset"**, which restricts use to projects built with Unity — **verify before assuming it can ship in a Phaser/browser build**. Latest version 1.0, **2024-03-20** ([asset page](https://assetstore.unity.com/packages/2d/environments/the-japan-collection-japanese-city-free-version-278915)) |
| **GameDev Market — *The Japan Collection* (Osaka City / Train Station / Dotonbori / bundle)** | **UNVERIFIED** | — | — | — | **UNVERIFIED: price and licence not retrievable** |
| **Humble Bundle asset bundles** | Yes — *"both Non-Monetized Products and Monetized Products, with no restriction on the number of projects"* | varies | **No** — cannot redistribute outside the product; users may not extract assets | not stated | bundle price; **note the sequel clause** — a sequel is *"a separate Product… conditional upon the purchase of a separate Licence"* ([EULA example](https://support.humblebundle.com/hc/en-us/articles/360036940693-Humble-Make-Your-Card-Game-Assets-EULA)) |

**Retrieval failure, stated exactly `[GAP]`:** `gamedevmarket.net` returned **HTTP 403** to both `Invoke-WebRequest` with a browser UA and `curl.exe`; its mirror served a Cloudflare interstitial; **itch.io store-*listing* pages also 403'd** though individual `*.itch.io` product pages rendered. **I cannot state the Osaka City price, the Complete Japan Collection Bundle price, or either licence.** Confirm manually before they enter a budget. Candidate URLs: [Osaka City](https://gamedevmarket.net/asset/osaka-city-game-assets), [Complete bundle](https://gamedevmarket.net/asset/the-complete-japan-collection-bundle), [Japanese City free](https://www.gamedevmarket.net/asset/the-japan-collection-japanese-city-free-version), [Dotonbori](https://www.gamedevmarket.net/asset/dotonbori-city-game-assets).

> ⚠️ **Three traps that would be shipping breaches, not grey areas**
> 1. **Cup Nooble *Sprout Lands* free tier and shubibubi *Cozy People* free tier are NON-COMMERCIAL ONLY.** Both vendors gate commercial use behind ~$3.99. Shipping the free tier in a monetised browser game is a licence breach.
> 2. **Not all attractive art may be used as AI reference.** "May I ship this art?" and "may I use this art in a training set / as reference?" are governed by *different* clauses, and the free/most-attractive tiers are the ones most likely to carry an AI restriction. CraftPix forbids AI use outright (§3.5), and itch.io hosts artist-authored licences that do the same — e.g. the *General Paid Asset License* (published 2025-04-21 by Yutami): *"The assets **may not be used to train, fine-tune, evaluate, or otherwise contribute to artificial intelligence systems, machine learning models, or datasets, including large language models (LLMs)**"* ([itch.io blog](https://itch.io/blog/929708/general-paid-asset-license)) — **precision: an artist-authored licence published as a blog post on itch.io, NOT a platform-wide EULA**; itch.io lets each creator set terms.
> 3. **A "NoAI" tag can conflict with the licence you want.** Fab's `NoAI` meta tag means *"an asset must not be used for generative AI data collection"*, and *"NoAI meta tags **might not be compatible with Creative Commons licenses**… you **cannot offer an asset with the NoAI meta tag under the Creative Commons Attribution license**. In order to be able to use the NoAI tag you must offer the asset under the **Standard** license"* ([Fab: Licenses and Pricing](https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab)).

**[+]contract** — Any asset rule that varies per file must land in the same discipline the fact layer already enforces: **a per-asset provenance record** (source, licence class, attribution requirement, AI-reference permission, `verified_at`). That is a file in `city-packs/<city>/`, not a wiki page.

### 3.6 3D-kit-driven 2.5D as the alternative

**Sketchfab → Fab, what actually happened** **[F]**: **Fab launched October 2024** *"as the unified replacement for the Unreal Marketplace, Quixel Bridge, Sketchfab's commercial offering, and what remained of ArtStation Marketplace… four catalogs, four seller tools, and four payout systems into a single storefront"*; per Epic's 2025 year-in-review the listing count *"tripled over the course of 2025 to more than 420,000"* and publishers *"doubled to over 20,000"* ([StraySpark 12-month retrospective, 2026-04-17](https://www.strayspark.studio/blog/fab-marketplace-12-month-retrospective-seller-2026)). Licence tiers: **CC-BY (Free)** and **Standard (Free or For Sale)**, with Standard split into **Personal** (buyer has *not* exceeded **$100,000 USD** gross revenue in 12 months) and **Professional** (has); publishers *"must offer their products under the Personal tier and the Professional tier"*; publisher prices follow a preset ladder ending in `.99`. Assets generated purely from prompts are allowed *"provided they carry Fab's mandatory **'Created with AI'** label"* ([Fab licences](https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab), [StraySpark correction 2026-09-25](https://www.strayspark.studio/blog/fab-marketplace-12-month-retrospective-seller-2026)). **UNVERIFIED:** both Sketchfab migration blog posts returned empty bodies, so the exact store-closure date and whether free CC downloads survive on Fab are unconfirmed.

**Google Poly is gone**: uploads stopped 2021-04-30 and *"on **June 30, 2021**, the Poly website will be shutting down"* ([9to5Google, 2020-12-02](https://9to5google.com/2020/12/02/google-poly-shutdown/)). **poly.pizza** advertises *"10,700+ free models"* but **its licence page was not retrieved — per-model terms are UNVERIFIED** ([poly.pizza](https://poly.pizza/)).

**[J] — 3D kit + orthographic camera vs hand-drawn tiles.** I found **no developer-published hours-per-asset figure for the 3D-kit route** and will not invent one.

| Dimension | 3D kit + ortho camera | Hand-drawn 2D tiles |
|---|---|---|
| Up-front cost | **$0–150** — Quaternius/Kenney CC0 free; KayKit Complete $150 | **$0–hundreds** — Kenney 60k-asset CC0 bundle $19.95; LimeZu exteriors $2.50–5.00; the Japanese-city commercial class unpriced here |
| Marginal cost of a new city | Low **if the kit is modular in the right way** — swap facade/roof/sign modules + palette (Quaternius built 300+ modules for "full Boston/NYC style blocks") | Low **if the vocabulary is shared**; catastrophic if each city needs new art |
| Where cost really lands | **Tooling and skill**: ortho camera setup, facing conventions, render-to-sprite or live-3D pipeline, lighting that survives ortho | **Drawing hours**: anchored by the 126-layer building at ~70 h ([Jettelly](https://jettelly.com/blog/how-this-developer-built-a-126-layer-isometric-asset-for-unity)) and the iso 2–3× multiplier ([StopGame](https://stopgame.ru/blogs/topic/118292/nikogda_ne_delay_pixel_art_igru_v_izometrii_mini_painter_devlog_1)) |
| Licence risk | **Lowest available** — CC0 is irrevocable, no attribution, no revenue threshold, no no-AI clause | Higher — LimeZu requires credit; Cup Nooble's free tier is non-commercial; Unity EULA/Extension Asset; possible AI bans |
| "Tokyo vs Osaka" distinctiveness | Harder — a Western modular kit ("Boston/NYC style blocks") needs heavy re-dressing to read as Japan; signage/facade modules are the work | Easier — the Japanese-city asset class exists, but see the retrieval gap |
| Web-build fit | Poor on Phaser 4: the modern Phaser line is 2D and v4 removed `Mesh`/`Plane`/`Camera3D`/`Layer3D` | Fits the chosen renderer directly |

> **RECOMMENDATION (3D): use CC0 3D kits as the greybox and lighting-reference layer, but ship 2D.** The 3D route has the best licence profile in this whole report, and it is the fastest path to a believable test city — but adopting it as the *shipping* pipeline bets the visual identity on re-dressing a Western kit as Japan, and collides with Phaser 4's renderer. **The strongest concrete use is the *A Link Between Worlds* trick: build in 3D, tilt the camera until it reads top-down, and bake to 2D sprites.** That buys the CC0 licence and modularity without inheriting a 3D runtime.

### 3.7 AI image generation for tile art — licence tiers, and where it actually helps

| Tool / model | Licence | Commercial status | Source |
|---|---|---|---|
| **FLUX.1 [dev]** and the whole `[dev]` family (Fill, Depth, Canny, Redux, Kontext, Krea, FLUX.2 [dev]) | **FLUX [dev] Non-Commercial License v2.0, revised 2025-11-25** | **⛔ Blocked.** *"freely available for your **non-commercial and non-production** use"*; "Non-Commercial Purpose" excludes *"(a) for **revenue-generating activity**, (b) in direct interactions with or that **has impact on end users**"*. Note *"**Outputs are not considered Derivatives**"* — the restriction bites on **use**, not ownership | [bfl.ai/legal/non-commercial-license-terms](https://bfl.ai/legal/non-commercial-license-terms) |
| **Stable Diffusion / SDXL — Stability AI Community License** | Last updated 2024-07-05 | **✅ Usable at this project's scale** — *"preserves free access to the Models for people or organizations generating annual revenue of less than US $1,000,000"* | [stability.ai/community-license-agreement](https://stability.ai/community-license-agreement) |
| **SDXL base 1.0 weights card** | **CreativeML Open RAIL++-M** (`openrail++`) | ⚠️ **Dual-labelling hazard**: the weights card says Open RAIL++-M while Stability's own site states the Community License. **Confirm which governs the specific checkpoint you download** | [Hugging Face](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) |
| **Adobe Firefly** | **UNVERIFIED** | Cannot state commercial-safety wording, indemnification scope, or whether indemnity is enterprise-only — every Adobe URL (incl. the `PSLT-AdobeFireflySupplementalCoverage_2024v1.pdf`) **timed out or 403'd**. Only the PDF's existence/title was confirmed via search | — |
| **Scenario** | Published tiers: Starter **$15/mo** (1,500 credits), Pro **$45/mo**, Teams **$75/mo**, Enterprise custom; annual **33% cheaper**; free tier **50 daily credits**. Includes *"Train custom models"* | ✅ Commercial-grade tooling; **output ownership/rights terms were not stated on the pricing page — UNVERIFIED** | [scenario.com/pricing](https://www.scenario.com/pricing) |
| **Layer.ai** | Usage-based; custom model training, Reference Sets, MCP/CLI/API, 3D, *"300+ models"* | **UNVERIFIED** on price and rights — no USD figures published; the help-centre pricing article returned only nav chrome | [layer.ai/pricing](https://www.layer.ai/pricing) |
| **Rosebud AI** | **UNVERIFIED** — not researched this pass | — | — |

**Practical limits of diffusion for tileable, consistent, modular tilesets** — **[J], my synthesis; I retrieved no peer-reviewed or vendor-primary source quantifying a tiling failure rate:**
1. **Seamless tiling needs wraparound-edge control that text-to-image sampling does not provide.** A tile must match its own opposite edge; a sampler optimising a plausible whole image has no such constraint. Countermeasures (offset-and-inpaint, tile-aware samplers, ControlNet-tile, a LoRA trained on seamless tiles) are all **pipeline work** — the same cost class that killed family (d).
2. **Cross-asset consistency is the real blocker for a modular kit.** A tileset is not N good images; it is N *mutually compatible* images sharing pixel grid, light direction, outline weight and palette ramp. Both Scenario and Layer sell **custom-model training on your own art style** as the fix — which is an admission that base models do not hold a style across a set.
3. **Pixel-grid fidelity ≠ image quality.** Sub-pixel drift, anti-aliased edges and non-integer feature sizes break a 16×16/32×32 grid, and cleanup recurs *per asset*.
4. **Output-side provenance is unresolved.** Fab requires a "Created with AI" label; itch.io creator licences may forbid using their art as reference at all; FLUX [dev] forbids end-user-facing commercial use outright. Any AI-assisted pipeline needs a **per-tool, per-output record of which model produced which file** — the same discipline the fact layer already demands for city data.

> **[J] Where AI genuinely helps this project:** concepting and palette exploration; generating **signage and typography variants** (the highest-value per-city differentiator and the least served by generic packs); material/reference sheets for a human artist; and **placeholder art that is explicitly never shipped**. **Where it does not:** producing a coherent, tileable, grid-aligned tileset for a city.

### 3.8 Cost table — four ways to get one city's art

> **[J] These are my estimates, not quoted prices.** Each is anchored on a verified figure above. They assume **one city**, top-down/3-4 layered art (family (b)), a **shared vocabulary across cities**, and the per-city deliverable being a **style kit**, not a full tileset.

| Route | Rough USD for **one city** | What it buys | Anchors / assumptions |
|---|---|---|---|
| **(i) Original hand-drawn tileset** | **$1,500 – $8,000** | A bespoke tileset + props + signage unique to this city | Anchored on marketplace ranges — small tileset **$50–400**, single scene **$80–500**, 4-directional walk cycle **$40–200** ([rate roundup](https://www.163.com/dy/article/L0H298GJ0526K8VB.html)) — plus **animation ≈ 3–5× static** and a **~2× commercial multiplier**. Assumes 8–15 scene/prop batches at mid rates plus one animation set. Top of range is reached as soon as you commission landmarks: the only verified hero datapoint is **~70 h for one 126-layer building** ([Jettelly](https://jettelly.com/blog/how-this-developer-built-a-126-layer-isometric-asset-for-unity)), i.e. **$1,050–2,800 for that single building** at $15–40/h |
| **(ii) Licensed modular kit reuse** | **$20 – $250** | Right to ship a professional modular kit and re-dress it per city | Anchored on **verified** prices only: Kenney All-in-1 **$19.95** (60,000+ CC0 assets); LimeZu Exteriors **$2.50–5.00**, Interiors **≥$1.50**; Cup Nooble Premium **≥$3.99**; KayKit Complete **$150**; Quaternius/Kenney 3D **free**. Covers 1–3 paid packs. **Excludes** the unpriced Japanese-city class and **excludes all art hours** |
| **(iii) 3D kit + ortho render** | **$0 – $150 in assets, plus 2–4 weeks of *your* engineering** | A modular city built from CC0 parts, baked or rendered | Anchors: Quaternius MegaKit (315 models, free), Kenney 3D City Kit (CC0), KayKit Complete **$150**. The real cost is not money: ortho camera setup, facing conventions, bake pipeline, lighting that survives ortho. **No published hours figure exists — [GAP]** |
| **(iv) AI-generated + human cleanup** | **$15 – $60/mo tooling + 2–5× the hand-drawn hours for cleanup** | Reference sheets, signage variants, placeholder art | Anchors: Scenario Starter **$15/mo**, Pro **$45/mo**; SDXL free under $1M revenue. **[J]** The cleanup multiplier is a judgment from the four failure modes in §3.7 — I found no measured figure, and the honest reading is that **AI does not currently reduce the cost of a coherent tileset** |

**[J] The buy-don't-draw conclusion is arithmetic, not taste:** route (ii) at **$20–250** versus route (i) at **$1,500–8,000** is a 10–30× gap for the *same* job, and route (ii) is available *today* with a documented licence. **Start on (ii) + Kenney CC0. Budget (i) only for the 3–5 landmark buildings per city that carry the identity, and only after the loop is proven.**

---

## 4. Genuinely hard problems

### 4A. Walkable city areas with many distinct locations

**The scope-control playbook, with evidence** **[F]**:

| Game / studio | Explicit scope-control move | Source |
|---|---|---|
| Mini Metro (2 people) | Imposed constraints *before* choosing the concept — no hand-built levels, minimal production art — which *"led to them concentrating on concepts that involved procedurally generated levels and abstract visual styles"* | [Wikipedia](https://en.wikipedia.org/wiki/Mini_Metro_(video_game)) |
| A Short Hike (solo) | An external 3-month deadline forced a hard core/stretch split: *"It would still be fun and playable if the stretch goals weren't made, but it kind of allowed me to naturally scale the size of the project to the rate at which work was actually being done."* | [Game Developer](https://www.gamedeveloper.com/design/finding-smart-shortcuts-in-a-short-hike-postmortem-unlocking-the-vault-4) |
| Yakuza / Like a Dragon | Reuse one district (Kamurochō) across the franchise; **density replaces area** | [80.lv on GDC 2025](https://80.lv/articles/like-a-dragon-devs-on-the-effective-reuse-of-kamuroch-map-assets) |
| Persona 5 | Only three dungeon *layout* vocabularies | [Wikipedia](https://en.wikipedia.org/wiki/Persona_5) — *"Dungeon layout was split into three distinct types…"* |
| GeoGuessr | Zero world-building: the world *is* someone else's imagery; built in ~2 weeks | [Wikipedia](https://en.wikipedia.org/wiki/GeoGuessr) |

**"One street, not one city" — the Kamurochō case in the devs' own words** **[F]**: at GDC 2025, in *"The Secret to Narrative-Driven and Short-Term Development in Like a Dragon"*, Design Manager Eiji Hamatsu explained why reusing the same map does not read as laziness: *"In Kamurochō, moving across one wall or ascending one flight of stairs can create a completely different scene or experience."* He attributed it to **zakkyo** buildings, *"multi-tenant buildings symbolic of Japanese city centers"*, whose value is *"the diversity of experiences that can be obtained from multiple different shops crammed into a limited amount of space"* ([80.lv, 2025-03-26](https://80.lv/articles/like-a-dragon-devs-on-the-effective-reuse-of-kamuroch-map-assets)). Kamurochō itself is *"modelled after Kabukichō, Tokyo's renowned red-light district"*, and the franchise had sold *"a combined total of 27.7 million units"* as of 2024 ([Kamurochō](https://en.wikipedia.org/wiki/Kamurocho), [franchise](https://en.wikipedia.org/wiki/Yakuza_(franchise))).

> **[J] — the most transferable lesson in Q4.** RGG does not buy area; it buys **interior density per unit of street**. "Across one wall or up one flight of stairs" is a *tile-vocabulary* statement: the same façade sprite plus a different interior **is a new location**. For this project the correct unit of content is **the doorway and the interior behind it**. **A 40 m × 40 m street with 12 enterable interiors beats 12 separate blocks** — and it is the same authoring economy as the SimCity crop trick in §1.3.

**Adjacent structures worth copying** **[F]**: **80 Days** treats a city as a *text-and-state node* — its press kit advertises a *"massive new content update featuring 30 new cities"*, i.e. 30 cities of content with no geometry ([inkle press kit](https://www.inklestudios.com/press/80days/)); **Kind Words** is one room made by two people ([Wikipedia](https://en.wikipedia.org/wiki/Kind_Words_(video_game))); **Coffee Talk** is one café counter, conceptualised at a 2017 game jam ([Wikipedia](https://en.wikipedia.org/wiki/Coffee_Talk_(video_game))). The counter-example is **Shenmue**, whose *"persistent world with detail considered unprecedented"* — shops opening and closing, buses on timetables, character routines — *"did not recoup its development cost and was a commercial failure"* on 1.2 million sales ([Wikipedia](https://en.wikipedia.org/wiki/Shenmue_(video_game))).

**Real map data** **[F]**:

| Claim | Verdict | Source |
|---|---|---|
| Mini Metro uses OSM | **No evidence found**; design rationale is constraint-driven procedural generation, and the Wikipedia figure is `[citation needed]` | [Wikipedia](https://en.wikipedia.org/wiki/Mini_Metro_(video_game)) |
| MS Flight Simulator (2020) uses OSM | **No evidence found** — it *"simulates the topography of the Earth using data from Bing Maps"* with Azure AI, *"over two petabytes"*, partnering with **Blackshark.ai** | [Wikipedia](https://en.wikipedia.org/wiki/Microsoft_Flight_Simulator_(2020_video_game)) |
| GeoGuessr uses OSM | **No** — Google Street View + Google Maps API | [Wikipedia](https://en.wikipedia.org/wiki/GeoGuessr) |
| **Any** game uses OSM | **Yes — Pokémon GO**, which moved its in-game map display from Google to OSM: *"Goodbye Google, hello OpenStreetMap"* | [Polygon, 2017-12-04](https://www.polygon.com/2017/12/4/16725748/pokemon-go-map-changes-openstreetmap/) |

**ODbL obligations, from OSM's own pages** **[F]** ([openstreetmap.org/copyright](https://www.openstreetmap.org/copyright)): data is under **ODbL** — *"You are free to copy, distribute, transmit and adapt our data, as long as you credit OpenStreetMap and its contributors. If you alter or build upon our data, you may distribute the result only under the same license."* Two mandatory acts: *"Provide credit to OpenStreetMap by displaying our attribution notice"* and *"Make clear that the data is available under the Open Database License."* Critically: *"Although OpenStreetMap is open data, we cannot provide a free-of-charge map API or map tiles for third-parties."* The share-alike boundary is governed by OSMF's endorsed **Community Guidelines** ([osmfoundation.org](https://osmfoundation.org/wiki/Licence/Community_Guidelines)), which define **Produced Work** (*"something created from a database but not a database itself"*), **Collective Database**, **Regional Cuts**, **Horizontal Layers** and **Trivial Transformations**.

> **[J]** The ODbL question is answered almost entirely by **what you bake into the city pack**. If `places.json` rows are mechanically transformed OSM tags, the pack is plausibly a **Derivative Database** and share-alike attaches to *that data* — not to the game engine. If OSM only draws a background while hand-curated facts (hours, fares) come from operators' own pages, the OSM-derived layer is much closer to a **Produced Work**. **Therefore: keep OSM-derived rows in a separately-licensed file with a per-row `source_url` pointing at the OSM object, and treat that file as the thing released under ODbL.** The project's existing per-fact `source_url` + `verified_at` contract already makes this mechanically possible. **UNVERIFIED:** OSMF has published no guideline specific to *video games*; this is my reading of the general guidelines, not a legal opinion and not a statement OSMF has made about games.

### 4B. NPC schedules, day-night and time systems

**How the reference games structure a day** **[F]**:

| Game | Time model | Player control | Save behaviour |
|---|---|---|---|
| Stardew Valley | Real-time tick, **20 in-game hours (6 am → 2 am)** | Wake fixed at 6 am; player chooses bedtime, ending the day | **Saves only on sleep** |
| Animal Crossing | Tied to the **console's real clock and calendar** | None | Continuous, not player-triggered |
| Persona 5 | Discrete calendar days with explicit time slots | Player allocates slots; some scenes remove control | Discrete checkpointed days |
| Majora's Mask | Continuous **3-day** cycle that repeats | Player can rewind | Loop-based |

Evidence **[F]**: Stardew — *"The Day Cycle is a period of 20 hours in-game from 6am to 2am"*; `"10 minutes"` of game time = `"7 seconds"` real time; full day = `"14 minutes"`; and *"The game saves only after the player has gone to sleep and the daily profit breakdown has been accepted."* Time pauses in single-player during cutscenes/dialogs/menus and some animations, but **not** in multiplayer ([Stardew Wiki: Day Cycle](https://stardewvalleywiki.com/Time)). Animal Crossing uses *"the GameCube's built-in clock"* ([Wikipedia](https://en.wikipedia.org/wiki/Animal_Crossing_(video_game))). Persona 5 — *"Some segments take control away from the player aside from limited dialogue choices; this was chosen as it reflects the controlled environment of Japanese high schoolers"*; it shipped with *"an estimated 1,160 scenes"* ([Wikipedia](https://en.wikipedia.org/wiki/Persona_5)). Majora's Mask — *"a perpetually repeating three-day cycle"*; Aonuma on its origin: *"there were ideas that weren't fully utilised"* ([Wikipedia](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Majora%27s_Mask), [Eurogamer](https://www.eurogamer.net/zelda-majoras-mask-time-mechanic-originally-rewound-a-week)); the mechanic was originally a **one-week** rewind.

> **[J] — the time model and the save model are the same decision.** Animal Crossing's real clock means the save is not a snapshot the player owns; Stardew's player-chosen bedtime means the save *is* a discrete, player-owned checkpoint. **[+]contract** — since the product exports a guide at a day boundary, **you want Stardew's model**: a clean, player-triggered day boundary that is also the export boundary. A real-time clock would actively fight the export story.

**What the industry actually documents** **[F]**:
- **Watch Dogs: Legion — "Census"** (Ubisoft Toronto, Christopher Dragert, GDC Programming track): *"Census generates highly realized individuals with detailed demographics and social profiles. These profiles form the basis of **dynamically-generated schedules** that span the entire open world, including meetings with friends, relations, and adversaries."* The talk covers *"optimizing the runtime performance of the relational database"* — i.e. **the hard problem is a relational database, not an AI planner** ([GDC Vault](https://gdcvault.com/play/1027018/Census-The-Systemic-Backbone-Behind)).
- **Kingdom Come: Deliverance 1 & 2 — thousands of NPCs**: *"careful time-slicing, world-state management, and rules that let characters appear persistent without requiring expensive full-fidelity simulation at all times"*; the goal being *"NPCs… have their own paths and lives they follow whether or not the player interacts with them"* ([GameDev.net on the GDC session](https://gamedev.net/news/5526-supporting-thousands-of-npcs-in-kingdom-come-deliverance-kingdom-come/)).
- **F.E.A.R. — "Three States and a Plan: The A.I. of F.E.A.R."** exists as a GDC Vault session and is the canonical public articulation of GOAP in a shipped shooter ([GDC Vault](https://gdcvault.com/play/1013459/Three-States-and-a-Plan)). **UNVERIFIED:** the page rendered only the Vault shell; I attribute nothing beyond its existence and title.

**RECOMMENDATION (4B)** **[J]** — **a data-driven schedule table plus a coarse time-slice tick, with the world clock as an integer and the LLM strictly outside the simulation.**
- **Clock**: an integer `tick` (1 tick = 10 in-game minutes, matching Stardew's granularity) plus derived `day`/`slot`. Integer time makes the sim replayable and makes *"10 in-game minutes = 7 real seconds"* a pure presentation constant ([Stardew Wiki](https://stardewvalleywiki.com/Time)). **Never store wall-clock time in simulation state.**
- **NPC state**: `{ npcId, scheduleId, currentNodeId }` where `scheduleId` indexes a **schedule table** of `(slot → nodeId)`. *This is the Census idea reduced to a CSV.*
- **Tick loop**: advance the clock; resolve `schedule[currentSlot]` **only for NPCs in the active node**. Everything else is `(npcId, nodeId)` with no per-NPC update — *KCD's time-slicing argument at a scale one dev can afford.*
- **Save**: because time is an integer, the save is `{ tick, day, flags, npcNodeIndex, rngState }` — a Stardew-style checkpoint at the day boundary, which is **also the guide-export boundary**.
- **Behaviour trees / utility AI / GOAP: out of scope.** Reserve them for individual set-piece NPCs whose *decision* is the content. A travel sim's NPCs mostly need to *be somewhere*.
- **Documented pattern across three very different shipped systems** **[J]**: data first; time-slice don't simulate; the scheduler is a **database read, not a planner**; GOAP/BT/utility belong *inside a single NPC's decision*, not to the world schedule. For "who is where when", any of the three is over-engineering because the answer is a lookup.

### 4C. Dialog, quest and travel-event data modelling

**Narrative runtime comparison** **[F]** (versions = npm `latest` at research time):

| Tool | Version | Licence | Browser JS/TS runtime? | Verdict |
|---|---|---|---|---|
| **ink / inkjs** | `inkjs` **2.4.0** | **MIT** | **Yes — first-party JS port on npm** | **Strongest fit** |
| **Yarn Spinner** | compiler **v3.2.1** | permissive | **No** — official ports are **Unity and Godot only**; the web entry is a *playground*: *"It's just a website you can visit!"* | Not for a browser game |
| Twine / Tweego | — | Twine **GPL v3**; Tweego BSD-style | Tweego compiles to HTML | Licence friction + no runtime API |
| ChoiceScript | — | **UNVERIFIED** — terms page returned **404** | Hosted/compiled, not a general runtime | Not recommended |
| Ren'Py | — | *"Most of Ren'Py is covered by the terms of the following (MIT) license"* + LGPL portions | Python engine | Wrong platform |
| articy:draft X | current | Commercial | Export only | Free tier **"700 objects 1 per project"**; €6.99/mo, €69.99/yr, teams from €56/mo |
| Unity Dialogue System | current | Commercial | Unity only | **$47.50** (from $95) |

Sources: [`inkjs` registry](https://registry.npmjs.org/inkjs/latest), [Yarn Spinner FAQ](https://docs.yarnspinner.dev/faq.md), [Yarn Spinner releases](https://github.com/YarnSpinnerTool/YarnSpinner/releases/latest), [Twine LICENSE](https://raw.githubusercontent.com/klembot/twinejs/develop/LICENSE), [Tweego LICENSE](https://raw.githubusercontent.com/tmedwards/tweego/master/LICENSE), [Ren'Py licence](https://www.renpy.org/doc/html/license.html), [articy pricing](https://www.articy.com/en/pricing/), [Unity Dialogue System](https://assetstore.unity.com/packages/tools/behavior-ai/dialogue-system-for-unity-11672), [Choice of Games terms (404)](https://www.choiceofgames.com/terms/).

**Yarn Spinner is disqualified for two independent reasons** **[F]**: (1) no browser runtime — the docs index lists no JS/TS runtime ([llms.txt](https://docs.yarnspinner.dev/llms.txt)); (2) **runtime compilation is explicitly not the intended workflow** — *"The intended workflow is to generate and compile Yarn Projects at editor time, not runtime"* ([FAQ](https://docs.yarnspinner.dev/faq.md)), which is incompatible with splicing generated lines mid-conversation.

**Runtime injectability is the deciding criterion** **[J]**: it eliminates Yarn Spinner (editor-time compile), articy:draft and Unity Dialogue System (authoring-then-export to a host engine you do not use), and ChoiceScript/Ren'Py/Twine (runtimes you cannot call from React). **ink/inkjs survives with a caveat**: the story graph is compiled, but `inkjs` is a normal JS library you own — compile at build time, ship the JSON, and **inject text into the presentation layer rather than the story graph**. **UNVERIFIED:** I did not find a supported runtime API for mutating a compiled ink graph. **Plan for: ink for authored structure and branching; a separate generated-text layer filling declared slots.**

> **RECOMMENDATION (4C): `inkjs` (MIT) for the authored narrative graph + a custom TypeScript layer for anything generated.** Anchored: MIT; a real npm version; inkle ships commercial games on it (**80 Days**, **Heaven's Vault** — [press kit](https://www.inklestudios.com/press/80days/)); and its unit of authorship (a node with choices) maps cleanly onto "travel event at a city node".

**Quest and flag modelling** **[J]**:
- **Dialogue-as-data, not dialogue-as-code.** Keep quests, flags and travel events as **JSON**; treat ink as the *presentation layer* for authored conversation. This matches the existing `city-pack/**` JSON contract and lets quest JSON be validated by the same validator as `places.json`.
- **Minimum viable quest schema**: `{ id, titleKey, giverNpcId, preconditionFlags[], steps:[{ id, nodeId, kind, targetId, flagOnComplete }], outcomes:[{ flagSet, effects }] }` — a small DAG of steps with flag side effects. **No general scripting language**: a scripting language in a quest file is how a solo project acquires a second, worse programming language.
- **Flags: a flat, append-only `Set<string>`.** Not a mutable object graph — serialises small, diffs cleanly, and is the natural unit for an event-sourced save.
- **Event sourcing for saves: yes, but bounded.** `{ schemaVersion, seed, commandLog[], snapshotAtCommand }`, folded periodically. **Keep the log prunable** — an unbounded log in IndexedDB is a slow-motion quota bug.
- **ECS: no.** ECS is a performance architecture for thousands of homogeneous entities; this game has tens of NPCs and hundreds of places, and an ECS would destroy the readable JSON contract the fact layer depends on.
- **Localization pattern worth copying**: Yarn Spinner's model is *"1 Yarn Project = 1 CSV spreadsheet per language"* ([FAQ](https://docs.yarnspinner.dev/faq.md)) — **string tables as the exported artifact of the narrative graph**, keyed by line ID.

### 4D. Language barriers, currency, transit, customs, culture shock — what is novel vs what exists

**What the travel games actually shipped** **[F]** (Steam release dates from the store API):

| Game | Developer | Steam release | Mechanic of note |
|---|---|---|---|
| 80 Days | inkle | 2015-09-28 | Map-as-menu; **time + money as the only two resources**; TIME GOTY 2014, IGF Excellence in Narrative 2015, 4× BAFTA noms |
| Heaven's Vault | inkle | 2019-04-16 | Decipherment as the **core loop**; translations feed back into story |
| Chants of Sennaar | Rundisc | 2023-09-05 | **Two people**; deduction-based decipherment |
| TUNIC | TUNIC Team | 2022-03-16 | An in-game manual you must decode |
| Papers, Please | Lucas Pope | 2013-08-08 | Document verification under time pressure + moral cost |
| Wanderlust: Travel Stories | Different Tales | 2019-09-26 | Travelogue structure |
| Bury Me, My Love | The Pixel Hunt | 2019-01-10 | Migration told through a messaging interface |
| Neo Cab | Chance Agency | 2019-10-03 | Rideshare night shift; passenger emotional state |
| Airplane Mode | Bacronym | 2020-10-15 | **The flight cabin is the entire space** |
| Mini Metro | Dinosaur Polo Club | 2015-11-06 | Transit network under growth pressure |
| Overcrowd | SquarePlay Games | 2020-10-06 | Station crowd management |
| Shashingo | Autumn Pioneer | 2024-02-27 | Photography as vocabulary acquisition |
| Recettear | EasyGameStation | 2010-09-10 WW | Shop pricing/haggling |
| Moonlighter | Digital Sun | 2018-05-29 | Shop-by-day / dungeon-by-night |

Sources: [Steam appdetails 381780](https://store.steampowered.com/api/appdetails?appids=381780&languages=english), [774201](https://store.steampowered.com/api/appdetails?appids=774201&languages=english), [1931770](https://store.steampowered.com/api/appdetails?appids=1931770&languages=english), [553420](https://store.steampowered.com/api/appdetails?appids=553420&languages=english), [239030](https://store.steampowered.com/api/appdetails?appids=239030&languages=english), [1051410](https://store.steampowered.com/api/appdetails?appids=1051410&languages=english), [808090](https://store.steampowered.com/api/appdetails?appids=808090&languages=english), [794540](https://store.steampowered.com/api/appdetails?appids=794540&languages=english), [931310](https://store.steampowered.com/api/appdetails?appids=931310&languages=english), [287980](https://store.steampowered.com/api/appdetails?appids=287980&languages=english), [726110](https://store.steampowered.com/api/appdetails?appids=726110&languages=english), [1632490](https://store.steampowered.com/api/appdetails?appids=1632490&languages=english), [606150](https://store.steampowered.com/api/appdetails?appids=606150&languages=english), [80 Days press kit](https://www.inklestudios.com/press/80days/), [Wikipedia: Kind Words](https://en.wikipedia.org/wiki/Kind_Words_(video_game)), [Recettear](https://en.wikipedia.org/wiki/Recettear).

**UNVERIFIED:** **Road to Guangdong**, **Florence**, **7 Days to End with You**, and Desert Bus's exact real-time drive duration — no primary sources fetched. Do not cite dates for these.

**Papers, Please — why the loop works, and what it costs** **[F]**: the loop is stated plainly — *"As a checkpoint inspector, the player must review the documents of arrivals – allowing legitimate travelers through the border, denying entry to those with insufficient or expired documents, and arresting suspected criminals, terrorists, and entrants with forged or stolen documents."* Pope's public dev record is a **TIGSource devlog from November 2012** to the **2013-08-08** release ([dukope devlogs](https://dukope.com/devlogs/papers-please/)). Sales: **500,000 by March 2014**, **>1.8M by August 2016**, **5M by its tenth anniversary** ([Wikipedia](https://en.wikipedia.org/wiki/Papers,_Please)).

> **[J] — the loop is a specific three-part structure, not "bureaucracy is fun":**
> 1. **The rule set is finite and legible.** Every rejection has a citation. Comprehension is the skill.
> 2. **The rule set is *insufficient*.** Documents can be individually valid and jointly contradictory; the player must infer intent, which is where moral weight enters.
> 3. **Time is the antagonist, and it is the player's own throughput.** The cost of care is queue length, so ethics are priced in seconds.
>
> **The critical design lesson: the player must be able to be *right* and still lose.** A customs scene where every answer is checkable is a quiz. Note also what the loop does *not* need: no 3D movement, no art budget, no animation — which is why one person shipped it in **well under two years of public devlog**.

**Language-barrier mechanics** **[F]**: **Heaven's Vault** — *"The player has to decipher and learn the hieroglyphic language of the Ancients"* ([Wikipedia](https://en.wikipedia.org/wiki/Heaven%27s_Vault)); inkle's own framing: *"every inscription you find has a meaning, and the translations you choose feed back into story, changing Aliya's ideas about what she's found"* ([press kit](https://www.inklestudios.com/press/heavensvault/)). **Chants of Sennaar** — two people, *"Julien Moya (art direction and game design) and Thomas Panuel (code and game design)"*, began *"at the start of the COVID-19 pandemic in March 2020"*, worked *"over the next year and a half"* before Focus funded the rest ([Wikipedia](https://en.wikipedia.org/wiki/Chants_of_Sennaar)). **TUNIC** — inspired by *"the sense of mystery he had as a child when reading through game manuals… without being able to understand everything he was reading"* ([Wikipedia](https://en.wikipedia.org/wiki/Tunic_(video_game))).

> **[J]** Both inkle's and Rundisc's designs share one property: **the player's translation is an *input*, not a lookup.** A mechanic where the player looks up a word and the game confirms it is a flashcard app. A mechanic where the game records what the player *believes* and acts on that belief is a game. **This distinction is the whole design — and it is cheap: belief state is a JSON map from glyph to guessed meaning.**

**Currency / exchange** **[F]**: Recettear and Moonlighter monetise **pricing judgement**, not conversion arithmetic — Recettear's Western reception praised shopkeeping as *"a 'strangely fulfilling activity', with some deep gam[eplay]"* despite the premise sounding like *"the dullest activity possible"* ([Wikipedia](https://en.wikipedia.org/wiki/Recettear)). **UNVERIFIED: I found no verified game whose primary mechanic is a live foreign-exchange rate.** **[J]** That makes it either novel or, more likely, tedious.

**Classification: proven vs tedious** **[J]**:

| Mechanic | Status | Why |
|---|---|---|
| Document verification, ambiguous rules, time pressure | **ALREADY DONE WELL, still under-copied** | Papers, Please's three-part structure; no 3D or animation budget |
| Decipherment where the player's **hypothesis** is the state | **ALREADY DONE WELL** (Heaven's Vault, Chants of Sennaar); underexploited outside those two | Cheap — a belief map — with high narrative payoff |
| Route + resource planning with two currencies | **ALREADY DONE WELL** (80 Days); structurally the same pressure model as Mini Metro | Proven; low novelty, low risk |
| Transit network under growth | **ALREADY DONE WELL** twice by one studio | This is a **whole game**; do not ship it as a sub-mechanic |
| Shop pricing / haggling | **ALREADY DONE WELL** | Proven, and orthogonal to travel |
| One-room social space, asynchronous text | **ALREADY DONE WELL** (Kind Words, Coffee Talk, Neo Cab) | Cheapest possible scope; proven |
| **Culture shock as a stat** | **NOVEL / underexploited — high risk** | No verified precedent. A "shock meter" is a status bar; culture shock is only interesting if it changes *which actions are legible* |
| **Live FX-rate arbitrage** | **NOVEL / likely tedious** | No precedent (above). Arithmetic with a moving number is not a decision without a reason to hold or convert |
| **Language barrier as a UI constraint** (menus and signs degrade, not just dialogue) | **NOVEL / underexploited** | The reference games make *text* the puzzle; none make the *interface* the puzzle |
| **Customs with real consequences for the exported guide** | **NOVEL** | No game ties an in-game clearance decision to a real-world artifact |

> **RECOMMENDATION (4D): ship three mechanics, not eight.** (a) document verification under time pressure, (b) decipherment-as-belief-state, (c) route/resource planning. All three are proven, all three are text-and-state rather than art-and-animation, and — decisively — **all three are legible in a guide export**: a cleared customs scene, a word the player learned, a leg they chose to walk. **Cut FX arbitrage and any "culture shock meter".** **[J] The failure mode to fear is not a mechanic that is too simple; it is a *novel* mechanic with no proven fun, tuned by a team that does not exist.**

**[+]contract** — rule 6 (*"No paid shortcut may change the time or money ledger"*) **removes the standard progression reward**: money cannot buy past friction, queues, or waiting. That is another reason to cut currency mechanics — in a normal game FX is a power fantasy (buy your way past friction); here it is forbidden by construction.

### 4E. Localization/i18n as a game mechanic vs a UI concern

**[F]** React i18n options: `i18next` **26.4.2** + `react-i18next` **17.0.15**; `react-intl` (FormatJS); `@lingui/core`; `@tolgee/react`; `typesafe-i18n`. ICU MessageFormat is the standard plural/select syntax ([`intl-messageformat`](https://registry.npmjs.org/intl-messageformat/latest)). **UNVERIFIED:** the exact ICU plural/select syntax was not fetched from Unicode primary docs, and **whether any of these libraries supports runtime-injected messages must be spiked** before the language mechanic depends on it.

**CJK fonts** **[F]**: **Noto Sans CJK / Source Han Sans are SIL OFL 1.1** — verified from both LICENSE files ([Adobe `source-han-sans` LICENSE](https://raw.githubusercontent.com/adobe-fonts/source-han-sans/release/LICENSE.txt), [Noto CJK LICENSE](https://raw.githubusercontent.com/notofonts/noto-cjk/main/LICENSE)). **GAP:** the exact font file sizes were not retrieved (GitHub API rate-limited) — **do not put an MB figure in the plan**, but note the known shape of the problem: a full CJK font is multi-MB, which is fatal to a first load. Subsetting tools: **`fonttools`/`pyftsubset`** ([docs](https://fonttools.readthedocs.io/en/latest/subset/)), **Google Fonts `unicode-range` slicing** ([docs](https://developers.google.com/fonts/docs/getting_started)), and **`glyphhanger`** which generates both the subset and the `unicode-range` CSS from a page's real glyph usage ([repo](https://github.com/pixelcog/glyphhanger)). **UNVERIFIED:** `subfont`'s version/behaviour (GitHub API rate-limited). **GAP:** canvas `fillText` performance — no credible measured source. **Do not put a performance number in the plan**; the spike is one day: at the target glyph count, is per-frame `fillText` acceptable or does text need caching to an offscreen canvas?

> **RECOMMENDATION (4E)** **[J]** — **the subsetting strategy and the language mechanic are the same problem, and that is the opportunity.** If the fiction is that the player cannot read the signs, then the set of glyphs the player can *render* is exactly the set the player has *learned*. Subset the font to **the union of (verified fact strings the guide needs) ∪ (glyphs the player has learned)**, and load the rest lazily as the player progresses. This converts the font-size liability into the mechanic's state, and it removes the question "how much Japanese do we ship" — you ship what the **guide** requires, always, and what the **player** has earned, incrementally.

**The architectural rule** **[J]**:

> A **string table** maps `key → text`. A **language mechanic** maps `key × playerKnowledge → text-the-player-can-actually-read`.

Concretely, four layers, not one `strings.json` per locale:
1. A **fact layer** with one verified per-field per-language value plus provenance — already specified by the `places.json` contract (`nameJa`, `nameZh`, `nameEn`).
2. A **signage layer** whose renderable form is a *function of knowledge state*: `render(sign, knownGlyphs)` emits the original, a partial rendering with unknowns as gaps, or the player's own gloss.
3. A **gloss layer** holding the player's *beliefs* (`glyphId → guessedMeaning`) — what the narrative reads, mirroring Heaven's Vault's *"the translations you choose feed back into story"*.
4. **UI chrome stays ordinary i18n.** `i18next` handles menus and settings; it must never be the mechanism by which in-world text is obscured, or the mechanic leaks into the settings menu.

**The test:** if a reviewer can play with the language setting on "English" and see all in-world text in cleartext, the language "mechanic" is a string table with extra steps.

### 4F. Save/load, determinism, and making an LLM game reproducible and debuggable

**Seeded PRNG** **[F]**: `seedrandom` **3.0.5** (MIT) — *"Calling seedrandom with no arguments creates an ARC4-based PRNG that is autoseeded using the current time, dom state, and other"* ([README](https://raw.githubusercontent.com/davidbau/seedrandom/master/README.md)); `pure-rand` **11.8.0** (MIT) — *"fast and pure pseudorandom number generators for JS/TS. Perfect for reproducible randomness!"* with `xoroshiro128plus(seed)` ([README](https://raw.githubusercontent.com/dubzzz/pure-rand/main/README.md)). Record-replay HTTP: `msw` **2.15.0**, `nock` **14.0.17**, both MIT.

**[J]** `seedrandom`'s documented default is **ARC4-based**, the weaker choice; `pure-rand`'s `xoroshiro128plus` plus its **jump** facility is the better fit for "one world seed, many independent sub-streams" — *"jumping in Xoroshiro 128+ will move you 2^64 generations away…"* ([README](https://raw.githubusercontent.com/dubzzz/pure-rand/main/README.md)). **UNVERIFIED:** whether `pure-rand` documents **state serialisation**. Its README documents seeding and jumping, not a serialisable state object. **A deterministic save that cannot serialise RNG state is not deterministic across a reload**, so verify before designing around it. The fallback is `(worldSeed, commandIndex)` re-derivation — replay the stream to the current command — which is exactly why the command log below matters.

**Determinism pitfalls** **[F]**/**[GAP]**:
- **`Math.random` is not seedable** — no seed parameter ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random)). **[J] A single stray `Math.random()` destroys replay. The mitigation is a lint rule banning it outside the PRNG module, not discipline.**
- **`localStorage` stores UTF-16 strings** — *"The keys and the values stored with localStorage are in the UTF-16 string format"* ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)). A 1 MB JSON payload occupies materially more than 1 MB of budget.
- **GAP:** float non-determinism, `Object.keys` ordering and `Array.sort` stability — sources were read but the workspace cache was destroyed by a concurrent writer before quotes were extracted, and they were not re-fetched. **Do not cite specific guarantees.** The safe rules that need no citation: never iterate object keys to produce ordered simulation output (use an array or `Map`); never rely on the default comparator for simulation-relevant ordering; never compare floats for equality in sim state; never let a float into the save when an integer will do.

**Storage — what the browser actually guarantees** **[F]**, quoted from MDN's [Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria):
- **Web Storage**: *"limited to 10 MiB of data maximum on all browsers. Browsers can store up to 5 MiB of local storage, and 5 MiB of session storage per origin. Once this limit is reached, browsers throw a QuotaExceededError exception which should be handled by using a try...catch block."*
- **Firefox best-effort**: the smaller of *"10% of the total disk size"* or *"10 GiB"* group limit.
- **Firefox persistent granted**: *"up to 50% of the total disk size, capped at 8 TiB."*
- **Eviction is the default**: *"Best-effort: this is the way that data is stored by default."*
- IndexedDB, the Cache API and OPFS are the large-storage mechanisms.

> **[J] The decision is not close. 5 MiB of UTF-16 localStorage is not a save system; it is a settings store.** A save containing a command log plus a city pack will exceed it. Use **IndexedDB** with `navigator.storage.estimate()` for budget reporting and `navigator.storage.persist()` to request eviction protection. **UNVERIFIED:** the exact contracts of `estimate()`/`persist()` — confirm from MDN before relying on either.

Wrappers **[F]**: `dexie` **4.4.6** (Apache-2.0), `idb` **8.0.3** (ISC), `localforage` **1.10.0** (Apache-2.0). **[J] `idb` over `localforage`**: the save architecture needs *queryable* records (events by index, snapshots by version), not a KV shim, and `localforage`'s 1.10.0 is old relative to the others. `dexie` is more capable if you want a query layer and migrations; `idb` plus hand-written migrations is less machinery to own for a 1–2 person team.

**LLM reproducibility — the citable facts** **[F]**:
- **LLM APIs are not deterministic even at temperature 0.** The strongest verifiable source is vendor-adjacent engineering writing quoting OpenAI's own semantics: to get *"(mostly) deterministic outputs"* you must set `seed` and *"Ensure all other parameters… are the exact same across requests"* — and even then *"**There is a small chance that responses differ even when request parameters and system_fingerprint match, due to the inherent non-determinism of computers.**"* ([lakeFS](https://lakefs.io/blog/toggle-openai-model-determinism/)). **UNVERIFIED:** no first-party OpenAI doc stating "not deterministic at temperature 0" was retrievable (the community thread returned 325 bytes). **Do not attribute a stronger claim to OpenAI.**
- **Prompt caching is a cost lever, not a determinism lever.** OpenAI: cached input *"discounted up to 90%"*; minimum cacheable prefix **1,024 tokens** for GPT-5.6 and later; writes **1.25×**, reads **0.1×**; default TTL **30m** ([OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)). Anthropic: default **5-minute** lifetime, refresh free on use; 5-minute writes **1.25×**, 1-hour writes **2×**, reads **0.1×** ([Anthropic prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)).

> **[J] Three consequences:** (1) caching reduces the price of a repeated prefix; it does **not** make the completion reproducible. (2) The **1,024-token minimum is a design constraint on prompt layout** — a system prompt plus a frozen `GuideDoc` prefix must clear it before caching does anything. (3) **TTL is 5–30 minutes**, so a player returning tomorrow gets a cold cache — **a pre-baked content pack is not an optimisation but the only mechanism that works for offline play**, because the browser may have no provider at all.

**RECOMMENDATION (4F): a command-log core with a content-addressed LLM sidecar** **[J]**:

```
save = {
  schemaVersion,            // integer, bumped on every breaking change
  worldSeed,                // one seed per playthrough
  tick,                     // integer simulation clock (4B)
  commandLog: Command[],    // append-only: { i, kind, payload, rngAfter }
  snapshot,                 // optional fold of commandLog[0..snapshotAt]
  snapshotAt,
  llmCacheRefs: string[]    // content hashes into the LLM cache store
}
```

Four properties, each tied to a verified fact above:
1. **Replayable.** Integer time + seeded PRNG ⇒ replaying `commandLog` from `worldSeed` reproduces the session. This is the *only* mechanism that makes a player bug report actionable by a team of two.
2. **Deterministic per-command RNG.** Store `rngAfter` per command so divergence bisects to a single command — the practical answer to the unverified `pure-rand` state-serialisation question: if state cannot be serialised, the *derived* state is recorded instead.
3. **Bounded and migratable.** `schemaVersion` + an ordered list of migration functions; fold the log at every **day boundary** (which is also the guide-export boundary) and prune behind the snapshot.
4. **LLM calls are content-addressed and never in the save.** The save holds **hashes, not text**: `hash(promptTemplateId + factRefs + playerState)` keys an IndexedDB store holding the completion plus the model/params used. Consequences: (a) a replayed session reuses the **exact same** generated line, so replay is stable though the model is not; (b) shipped **golden fixtures** are just this store pre-populated from a recorded session; (c) the **offline content pack is the same store, pre-baked at build time** — required, because TTLs are 5–30 minutes and offline play has no provider.

**Testing** **[J]**: `msw` or `nock` for HTTP-level record-and-replay, plus the content-addressed store for semantic-level fixtures. Record once against the live API, commit the fixture, and run CI with the network hard-disabled — golden-file discipline applied to a non-deterministic dependency.

**Debuggability, stated as one property** **[J]**: **given a save file, the team can reproduce the exact session, including the exact generated text, without network access.** Every element above exists to deliver that. **If a proposed feature cannot be expressed as commands over seeded state plus addressed content, it is a feature that cannot be debugged by two people.**

---

## 5. AI in the loop — where LLM generation works, where it fails, and the cheapest good demo

**[+]contract first** (a design rule, not a research finding): the LLM here may only produce **narrative wrapping over a frozen `GuideDoc`**. Places, hours, fares and transit legs come from `city-pack/**`; the LLM never authors them. So the question is not "can an LLM generate content" but **"which content can it generate without ever touching a fact"** ([SKILL.md](../../.dsh/skills/tourguide-fact-integrity/SKILL.md), [gap-analysis-and-plan.md](gap-analysis-and-plan.md) §4.1).

### 5.1 The dividing line is verifiability, not creativity

**Works** **[F]**:

| Use case | Demonstrated by | Note |
|---|---|---|
| NPC barks / crowd chatter | Ubisoft's **Ghostwriter** — barks are *"brèves répliques ou sons des PNJ en réaction à un événement"*; the tool drafts, writers pick and polish ([Ubisoft, 2023-03-21](https://news.ubisoft.com/fr-fr/article/7Cm07zbBGy4Xml6WgYi25d/quand-ia-et-crativit-convergent-dcouvrez-ghostwriter)) | Short, context-light, disposable = lowest risk |
| Flavour text / naming | **Infinite Craft** — every combination is a model call; results like "Brunch + Sandwich = Sandbrunch" ship as-is ([quuxplusone teardown](https://quuxplusone.github.io/blog/2024/02/08/infinite-craft/)) | Whimsy is a *feature*; determinism is what makes it safe |
| In-character chat / dynamic dialog | **Suck Up!** — each door is a live ChatGPT-driven NPC ([GameLook, 2026-05-11](http://www.gamelook.com.cn/2026/05/592917/)); **Whispers from the Star** ships *"real-time AI conversations"* as the core verb ([Steam 3730100](https://store.steampowered.com/app/3730100/)) | Needs a per-NPC character sheet + refusal handling |
| Summarization / hints | **NVIDIA ACE** positions on-device small models as assistants that *"provide tips and guidance"*, e.g. the *Total War: PHARAOH* advisor grounded in the game's data ([NVIDIA ACE](https://developer.nvidia.com/ace)) | **Grounded in game data, not free invention** |
| Text variation at scale | Ghostwriter's workflow: writer defines character + interaction type, tool proposes variants, writer chooses ([Ubisoft](https://news.ubisoft.com/fr-fr/article/7Cm07zbBGy4Xml6WgYi25d/quand-ia-et-crativit-convergent-dcouvrez-ghostwriter)) | Human-in-the-loop by construction |

**Fails / unreliable** **[F]**:

| Failure mode | Evidence | Why it bites here |
|---|---|---|
| **Moderation over-blocking** | **AI Dungeon**'s 2021 filter *"sometimes prevented the generation of content that it wasn't intended to"*, cutting stories off mid-play; users were alarmed that flagged private fiction was reviewed by staff; Latitude published a defensive post ([Polygon](https://www.polygon.com/22408261/ai-dungeon-filter-controversy-minors-sexual-content-censorship-privacy-latitude/)) | A false positive on a *travel* line ("my five-year-old…") is a broken quest step |
| **Long-horizon consistency** | Anthropic: **"context rot"** — as context grows, accurate recall degrades, and this *"emerges across all models"* ([Anthropic Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)) | A 4-hour playthrough cannot hold canon in-context; canon must live outside the model |
| **Cost/latency at real volume** | **Death by AI**: 700k DAU at day 3, 10M players in month 1, **1.2 billion tokens in month 1**, *"not financially sustainable"* on its launch stack until it switched providers; also churned players over **latency and localization quality** ([Inworld case study, 2025-08-01](https://inworld.ai/blog/how-inworld-helped-the-ai-game-death-by-ai-with-20-million-players-reach-profitability)) | A modest viral demo can outrun a solo dev's budget model |
| **Infrastructure fragility** | **Suck Up!**'s servers went down early in its viral spike, traced to the AI integration ([GameLook](http://www.gamelook.com.cn/2026/05/592917/)) | Live AI ties your uptime to someone else's |
| **Architecture-level failure, not leaf-level** | Proxima's Ran Mo: AI gives *"5–30× on leaf-level functional tasks"* but at trunk/architecture level generated code hides landmines — *"you'll burn a million tokens and make no progress"* ([GameLook](http://www.gamelook.com.cn/2026/05/592917/)) | The failure is structural, not prompt-tuning |
| **Balance, guaranteed solvability, spatial layout** | **UNVERIFIED** at the level of one readable quotable study. Nearest artefact frames 3D level generation as an *optimisation/constraint* problem rather than prompting: *"Constraint Is All You Need: Optimization-Based 3D Level Generation with LLMs"* ([PCG Workshop PDF](https://www.pcgworkshop.com/archive/xu2025constraint.pdf) — title/URL from search, text not extracted) | **[J]** treat level geometry, fare arithmetic, timing budgets and quest solvability as **deterministic code + validator**, never as model output — which is exactly the project's "facts are read-only / drop-don't-correct" rule |

> **[J] The dividing line is verifiability.** Text whose wrongness is merely disappointing (a bark, a shop-sign pun) can be generated live. Text whose wrongness is a **state change in a system with invariants** (coordinates, prices, ordering, solvability) must be produced or verified by code.

### 5.2 Shipped examples and what actually happened

| Project | What shipped | Reported problems | Source |
|---|---|---|---|
| AI Dungeon (Latitude) | Infinite LLM text adventure; 2021 filter for content involving minors | Over-blocking; mid-story stops; staff review of flagged private fiction | [Polygon](https://www.polygon.com/22408261/ai-dungeon-filter-controversy-minors-sexual-content-censorship-privacy-latitude/) |
| **Suck Up!** (Proxima) | Early version Dec 2023; **1.0 on Steam 1 Oct 2025**; each NPC a live ChatGPT character; >100M YouTube views with ~zero marketing | Server outage early in the viral spike, traced to the AI integration; most of the game's best content was created at launch — **the viral moment was a one-off resource**; live cost/latency cited as the genre's real ceiling | [GameLook](http://www.gamelook.com.cn/2026/05/592917/), [Steam 2726370](https://store.steampowered.com/app/2726370/Suck_Up/), [Naavik podcast with CEO Ran Mo](https://naavik.co/podcast/finding-success-with-ai-agents-and-content-creators/) |
| **Death by AI** (Playroom) | Social survival game; 700k DAU day 3, 10M players month 1, 20M+ later; **switched off OpenAI+ElevenLabs to Inworld and reached profitability** | 1.2B tokens month 1; *"not financially sustainable"*; latency + localization churn | [Inworld](https://inworld.ai/blog/how-inworld-helped-the-ai-game-death-by-ai-with-20-million-players-reach-profitability) |
| **Infinite Craft** (Neal Agarwal) | Browser crafting game launched **31 Jan 2024**; every pair resolved by a model (LLaMA 2 per the developer) | Combination results are arbitrary/humorous; **the design works only because results are cached globally**, so a pair always yields the same element for every player | [HN thread incl. dev's LLaMA 2 tweet](https://news.ycombinator.com/item?id=39205020), [quuxplusone](https://quuxplusone.github.io/blog/2024/02/08/infinite-craft/) |
| 1001 Nights (Ada Eden) | *"Book of Infinity: 1001 Nights"*; Steam demo **23 Oct 2024**; documented as an *"AI-native narrative game driven by large language models"* | **UNVERIFIED:** no paper body or postmortem read; no claim made about its runtime | [Steam 2782660](https://store.steampowered.com/app/2782660/), [DiGRA](https://dl.digra.org/index.php/dl/article/view/2258) |
| Hidden Door | Launched an AI-driven social role-playing platform | **UNVERIFIED:** site and coverage are JS-rendered; headline-level evidence only | [GamesBeat](https://gamesbeat.com/hidden-door-launches-social-role-playing-platform-with-ai/) |
| **Ubisoft Ghostwriter** | Internal tool that drafts **barks**; GDC 2023; pairwise feedback trains it | Ubisoft's own article **names no shipped title**; stated goal is to free writers' time, explicitly *"ne remplace pas le scénariste"* | [Ubisoft](https://news.ubisoft.com/fr-fr/article/7Cm07zbBGy4Xml6WgYi25d/quand-ia-et-crativit-convergent-dcouvrez-ghostwriter), [TechCrunch](https://techcrunch.com/2023/03/22/ubisofts-new-ai-tool-automatically-generates-dialogue-for-non-playable-game-characters/) |
| NVIDIA ACE | Cloud + on-device conversational models; named uses include **Total War: PHARAOH**, KRAFTON PUBG CPCs | Vendor-side material; **no independent cost/quality postmortem verified** | [NVIDIA ACE](https://developer.nvidia.com/ace) |
| Inworld AI | Pivoted to voice/TTS + router; Realtime TTS-2 claimed <100 ms TTFB, Flash 25 ms | Its own case study is the strongest public evidence that per-interaction cost is the genre's binding constraint | [Inworld](https://inworld.ai/), [pricing](https://inworld.ai/pricing) |
| Whispers from the Star (Anuttacon) | Released **14 Aug 2025**; *"real-time AI conversations, where your words are her only lifeline"* | **UNVERIFIED:** no cost/quality postmortem found | [Steam 3730100](https://store.steampowered.com/app/3730100/) |
| Mantella (Skyrim/Fallout 4 mod) | STT → LLM → TTS; AGPL-3.0 | **UNVERIFIED:** per-hour cost; README-level evidence | [GitHub](https://github.com/art-from-the-machine/Mantella) |
| Voyager (Minecraft agent) | Skill-library agent; 3.3× unique items, 2.3× travel, up to 15.3× faster milestones | Research setting with code execution + self-verification, not a shipped game | [arXiv 2305.16291](https://arxiv.org/abs/2305.16291) |
| **Generative Agents** (Park et al. 2023) | 25 agents in a sandbox town with memory/reflection/planning | **The cost datapoint that matters:** simulating 25 agents for two days cost *"thousands of dollars in token credits"* and took multiple days | [arXiv 2304.03442](https://arxiv.org/abs/2304.03442) |

### 5.3 Steam's AI rules — disclosure is now a design input

**[F]** Valve's **Content Survey** splits disclosure into **Pre-Generated** (*"content that ships with your game and is consumed by players that is created with the help of AI tools during development"*) and **Live-Generated** (*"created with the help of AI tools while the game is running"*). Live-Generated carries an extra burden: describe the guardrails preventing illegal output. The FAQ also states that if your game connects to an external per-input/output AI service, *"you'll need to manage both access to that external service on behalf of your players and collecting payment from your player using a Steam-supported payment method"* ([Steamworks Content Survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey?language=english)). In **January 2026** Valve rewrote the guidance so that AI-powered *tools* (e.g. code helpers) **do not** require disclosure — *"efficiency gains through the use of [AI-powered dev tools] is not the focus"* ([VGC, 2026-01-17](https://www.videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use/)). Market signal: disclosed genAI use reached **7,818 titles (~7% of the Steam library)** mid-2025 and **10,258 (~8%)** by December 2025, with 2025 disclosed-AI releases producing roughly **$660M** — but only **12 titles in eight figures, 33 over $1M, 170 in six figures** ([Multiplayer.it, 2025-12-22](https://multiplayer.it/notizie/su-steam-i-giochi-che-usano-lia-generativa-hanno-prodotto-ricavi-per-660-milioni-di-dollari-nel-2025.html)).

> **[J] The concentration is the real signal.** Median disclosed-AI game earns nothing. Disclosing "Live-Generated AI content" is also a *marketing* liability in 2026 — so a pre-baked pack is both cheaper **and** safer to describe. **This is a decision input, not a footnote.**

### 5.4 Structured output is the load-bearing engineering decision

**[F]** OpenAI documents the distinction explicitly: with `response_format: {type: "json_object"}` you get valid JSON but **no schema adherence**; only `{type: "json_schema", json_schema: {strict: true, schema: …}}` guarantees adherence. Strict mode supports a **subset** of JSON Schema (`string/number/boolean/integer/object/array/enum/anyOf`, plus `pattern` and `format`), and every object needs `additionalProperties: false` with all fields required. **Refusals are a first-class branch**: handle `refusal` and cases where *"the model might not generate a valid response that matches the provided JSON schema… if the model refuses to answer for safety reasons, or if… you reach a max tokens limit and the response is incomplete"* ([Structured Outputs guide](https://platform.openai.com/docs/guides/structured-outputs)). Tool use is a second path to structure; Anthropic documents a **tool-definition overhead** in the system prompt — e.g. Claude Haiku 4.5 adds **496 tokens** with `auto`/`none` and **588 tokens** with `any`/`tool` ([Anthropic pricing](https://docs.claude.com/en/docs/about-claude/pricing), [OpenAI function calling](https://platform.openai.com/docs/guides/function-calling), [Anthropic tool use](https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview)).

> **[J] Validate anyway, then drop.** Even with strict mode a response can be truncated or refused, so the server must validate the returned object against the same schema with a runtime validator — [Zod](https://zod.dev/) or [Ajv](https://ajv.js.org/) — and on failure run **one** repair attempt, then fall back to a deterministic template. Cap at one: make the repair call *schema-only* (resend the invalid object + the error, not the whole world state). **More than one retry converts a content bug into an unbounded cost bug** — the Death by AI token figures show how fast unbounded calls compound.

### 5.5 Retrieval vs a big cached prompt over a content bible

**[F]** Anthropic's guidance: context is a **finite resource with diminishing returns**, recall degrades as context grows (*"context rot"*), and the goal is *"the smallest possible set of high-signal tokens"* ([Anthropic Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)).

| Situation | Right tool | Why |
|---|---|---|
| Canon is small and stable (a city pack's places, a handful of NPCs, tone rules) | **Large cached prompt** | Cache reads are **0.1×** input on OpenAI (GPT-5.6+) and Anthropic; Gemini's implicit caching is on by default with reads at a fraction of input ([OpenAI](https://platform.openai.com/docs/guides/prompt-caching), [Anthropic](https://docs.claude.com/en/docs/build-with-claude/prompt-caching), [Gemini](https://ai.google.dev/gemini-api/docs/caching)) |
| Canon is large or selectively relevant (100+ places) | **RAG over the content bible** | Avoids paying for tokens a scene does not need; embeddings are cheap — `text-embedding-3-small` **$0.02/1M**, `-large` **$0.13/1M** ([OpenAI embeddings](https://platform.openai.com/docs/guides/embeddings)) |
| Retrieval is only for *narrative flavour* | **RAG is probably overkill** | **[J]** the "content bible" here is likely a few hundred KB; chunking + embedding + a vector store adds a *second* source of nondeterminism (retrieval misses) for a saving measured in fractions of a cent per call |

Vector-store floor: Pinecone has a free Starter tier for *"trying out and for small applications"* ([pricing](https://www.pinecone.io/pricing/)); self-hosting avoids the line item entirely. Semantic caching is a different layer (§5.6). **[+]contract — critical:** whether you use RAG or a cached prompt, the retrieved/cached text must be **fact-layer output** (`city-packs/**` records with `source_url` + `verified_at`), **never model-written lore that a later stage could mistake for a fact.**

### 5.6 Cost and latency per player hour — verified prices, shown arithmetic

**[F]** All USD per 1M tokens, standard tier, from the vendors' own pricing pages:

| Model | Input | Cached read | Output | Cache write |
|---|---|---|---|---|
| `gpt-6-luna` (short-context) | $0.10 | $0.01 | $0.50 | $0.125 |
| `gpt-6-sol` | $2.00 | $0.20 | $10.00 | $2.50 |
| `gpt-6-astra` | $10.00 | $1.00 | $50.00 | $12.50 |
| OpenAI Batch tier | **50% of standard** | — | — | — |
| `text-embedding-3-small` / `-large` | $0.02 / $0.13 | — | — | — |
| `omni-moderation-latest` | **Free** | — | — | — |
| Claude Haiku 4.5 | $1 | $0.10 | $5 | 1.25× / 2× (5 min / 1 h) |
| Claude Sonnet 5 | $2 | $0.20 | $10 | 1.25× / 2× |
| Claude Opus 5.5 | $4 | $0.20 (0.05×) | $20 | 1.25× / 2× |
| Claude Batch tier | **50%** | — | — | — |
| `gemini-3.8-flash` | $0.75 (→$1.50 from 2027-01-01) | $0.075 | $3.75 (→$7.50) | +$0.50 /1M tokens/**hour** storage |
| `gemini-3.5-flash-lite` | $0.30 | $0.03 | $2.50 | +$1.00 /1M tokens/hour |
| Inworld TTS-2 / TTS-2 Flash / STT-1 | $25 / $15 per 1M chars; STT $0.15/hr | — | — | — |

Sources: [OpenAI pricing](https://platform.openai.com/docs/pricing), [OpenAI moderation](https://platform.openai.com/docs/guides/moderation), [Anthropic pricing](https://docs.claude.com/en/docs/about-claude/pricing), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Inworld pricing](https://inworld.ai/pricing).

**Modelling assumptions, stated so the arithmetic is auditable** **[J]**: **barks** — 1 per 20 s = **180/player-hour**, each sending a **1,500-token** shared (cached) prefix and producing **80 tokens**; **dialog** — **12 conversations/hour × 6 turns = 72 calls**, each **2,500 tokens** of context (2,000 cacheable) and **120 output tokens**; **quests** — 3 per hour at **2,500 output tokens** each.

**Computed per-player-hour cost on `gpt-6-luna`** (mechanically from the table above): barks **$0.0099**, dialog **$0.00936**, quests **$0.00615** → **≈$0.0254 per player-hour, all-in including 3 quests**. **A single 2,500-token quest output takes 9.5–15.3 s** of pure generation at measured model speeds — **not a live-generation latency budget** ([LMSpeed/Artificial Analysis records](https://lmspeed.net/leaderboard/model-speed?sort=time-to-first-token&dir=desc)). **One-time bake cost for 500 quests: $1.03** on `gpt-6-luna` (≈**$0.52** batch) versus **$20.50** on Claude Sonnet 5.

**Demo-scale sanity check** **[J]**: 200 playtest player-hours × $0.0254 ≈ **$5.08** of live inference, plus one baked pack of 500 quests at **$1.03–$20.50** one-time → **total LLM spend under $30**.

### 5.7 Caching — four layers, with the actual discounts

**[F]** (1) provider **prompt caching** — OpenAI up to **90%** off cached input, 1,024-token minimum for GPT-5.6+, writes 1.25×, reads **0.1×**, 30m TTL; Anthropic 5-min default, writes 1.25× (5 min) / 2× (1 h), reads **0.1×**. (2) **exact-match** DB. (3) **semantic** cache — GPTCache claims to *"slash your LLM API costs by 10x, boost speed by 100x"* and ships an ONNX embedding + vector-store pipeline ([GPTCache](https://github.com/zilliztech/GPTCache)); Redis markets LangCache as *"save on tokens for common questions"* ([Redis LangCache](https://redis.io/langcache/)). (4) **pre-baked pack** (build time).

> **[J]** Start with layers (1) + (2) + (4). Add semantic caching **only if logs show ≥30% true-duplicate traffic** — *Infinite Craft* proves exact-match alone makes an LLM game economically viable ([teardown](https://quuxplusone.github.io/blog/2024/02/08/infinite-craft/)).

### 5.8 Moderation, safety, ratings, law

**[F]**: **OpenAI's Moderation API is free** — *"The moderation endpoint is free to use, and image files can be up to 20 MB"*; `omni-moderation-latest` accepts text and images but **not audio**; the pricing table lists it as Free. The same page warns it is **not** a CSAM detection system ([guide](https://platform.openai.com/docs/guides/moderation), [pricing](https://platform.openai.com/docs/pricing)). Provider policies are contractual — Anthropic's Usage Policy governs what a deployed NPC may be induced to say via player input ([Anthropic Usage Policy](https://www.anthropic.com/legal/aup)); **UNVERIFIED:** OpenAI's usage-policies page (HTTP 403 through my fetch path). **Age ratings:** the ESRB ratings guide publishes categories, descriptors and interactive elements, but **I could not verify any ESRB or IARC policy specifically requiring generative-AI disclosure** — treat such a claim as UNVERIFIED ([ESRB Ratings Guide](https://www.esrb.org/ratings-guide/)). **EU AI Act, Article 50** (in force **2 August 2026** per Article 113): providers must ensure users are **informed they are interacting with an AI system**, and providers of systems generating synthetic text/image/audio/video must ensure outputs are **marked in a machine-readable format and detectable as artificially generated** ([Article 50](https://artificialintelligenceact.eu/article/50/)). **Children's privacy:** the FTC's COPPA Rule governs collection of children's personal information ([COPPA Rule](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa)); in September 2025 the FTC issued **6(b) orders to seven companies** operating consumer-facing AI companion chatbots, seeking how they *"measure, test, and monitor"* risks ([FTC, 2025-09-11](https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-launches-inquiry-ai-chatbots-acting-companions)).

> **[J]** If any NPC can hold open-ended conversation with a minor, the project inherits this scrutiny. **The cheapest mitigation is a *bounded* conversation surface — enumerable beats, scripted intents — plus the free moderation endpoint on player input.** And note the *practical* failure is the fiction-breaking output, not the illegal one: players report both the joy of an NPC "blocking" them with a nonsensical reply and the frustration of a story ending abruptly ([GameLook](http://www.gamelook.com.cn/2026/05/592917/), [Polygon](https://www.polygon.com/22408261/ai-dungeon-filter-controversy-minors-sexual-content-censorship-privacy-latitude/)). The design answer is a hard content schema plus **drop, don't correct** — never a repair pass that invents a fact.

### 5.9/5.10 Pre-baking, and the cheapest architecture that reaches a good demo

**Why a reviewed pre-generated pack beats live generation for a one-owner team** **[F]**, each item a number or a rule shown above:
1. **Cost:** 500 quests = **$1.03–$20.50 one-time** vs. the same volume generated per player-hour forever.
2. **Latency:** a 2,500-token quest is **9.5–15.3 s** of generation; a pre-baked lookup is a disk read.
3. **Steam:** Pre-Generated needs no live-AI guardrail narrative and no player-facing payment plumbing for external inference; Live-Generated adds both ([Steamworks](https://partner.steamgames.com/doc/gettingstarted/contentsurvey?language=english)).
4. **Ratings/disclosure:** pre-baked text can be reviewed and versioned; EU AI Act Art. 50 marking can be applied at build time ([Art. 50](https://artificialintelligenceact.eu/article/50/)).
5. **Quality gate:** Ghostwriter's shipped posture — model proposes, human chooses — is the only pattern in this research that survived contact with a real production pipeline ([Ubisoft](https://news.ubisoft.com/fr-fr/article/7Cm07zbBGy4Xml6WgYi25d/quand-ia-et-crativit-convergent-dcouvrez-ghostwriter)).
6. **Provider churn:** Death by AI had to swap its entire AI stack mid-launch because unit economics broke ([Inworld](https://inworld.ai/blog/how-inworld-helped-the-ai-game-death-by-ai-with-20-million-players-reach-profitability)). A baked pack is provider-independent.

**Hybrid shape** **[J]**, every element justified by a cited fact:

```
frozen GuideDoc (facts, source_url + verified_at)
        │
        ├─ OFFLINE BAKE (build pipeline, batch tier, human review)
        │    · quest variants, intro/outro narration, NPC bios, guide prose
        │    · stored as narrative records keyed by refFactIds
        │    · reviewed → merged → versioned; unreviewed = not shipped
        │
        └─ RUNTIME (only if the beat is purely cosmetic)
             · exact-match cache → provider prompt cache → tiny model → schema validate
             · on refusal / schema failure / timeout → deterministic template
```

**The last line is the whole safety story: the fallback is a template, never an invention** — the fact layer's "drop, don't correct" rule applied to prose.

| Layer | Choice | Justification (a number) |
|---|---|---|
| Model for **baked** content | `gpt-6-luna` (or `gemini-3.5-flash-lite`) with **Batch** | 500 quests = **$1.03** standard, **~$0.52** batch — cheaper than one hour of live Sonnet-tier play |
| Model for **live** chatter (if enabled at all) | Same cheap tier, low temperature, strict JSON schema | barks + dialog + quests = **$0.0254/player-hour** all-in with cache reads |
| Escalation (bake-time only) | `gpt-6-sol` / Claude Sonnet 5 **via Batch** | $10.25 per 500 quests at 50% off; used only where review says the cheap tier failed |
| Structured output | `json_schema` strict + runtime validation (Zod/Ajv) + **one** repair retry + template fallback | Strict mode guarantees adherence; refusals/truncation are documented and must be handled |
| Context strategy | **One cached content-bible prompt** per scene type; RAG only if the bible exceeds the practical prefix budget | Anthropic: smallest high-signal token set; cache reads at 0.1× |
| Cache layers | (1) exact-match keyed by `(factRefIds, beatId, personaId, modelVersion)`, (2) provider prompt cache, (3) semantic **only** if ≥30% true-duplicate traffic | *Infinite Craft* proves layer 1 alone makes an LLM game viable |
| Voice | **None live.** If needed for a demo, pre-render a bounded set | Live TTS at **$25/1M chars** would dominate the budget (~$0.27/hr for barks alone) |
| Moderation | OpenAI Moderation API on **player input** at minimum (free) + schema-level output constraints | Free endpoint, no audio support, not a CSAM tool |
| Fallback | Deterministic template renderer; drop-don't-correct | Matches the fact-integrity rule and the AI Dungeon lesson that a half-blocked line is worse than a plain one |
| Disclosure | Store-page AI disclosure + in-game "these NPCs are AI" affordance + machine-readable marking | Steam Content Survey; EU AI Act Art. 50 (in force 2026-08-02) |

**What to cut first if time runs out: live generation entirely.** The game must be complete and playable with **zero** API calls — which is also the only way to prove the narrative layer never owned a fact.

---

## 6. Scope-cutting benchmarks

### 6.1 What small teams actually shipped — verified

Release dates from the Steam store API; durations from the cited developer statements **[F]**:

| Game | Release (Steam) | Team | Duration (as stated) |
|---|---|---|---|
| Stardew Valley | **2016-02-26** | Solo | **UNVERIFIED** — the widely repeated 2012 start is not confirmed from a primary source |
| Undertale | **2015-09-15** | Toby Fox (+ Temmie Chang, art) | *"developed by Toby Fox across **32 months**"*; Kickstarter ended **2013-07-24** with **US$51,124** from 2,398 people |
| Papers, Please | **2013-08-08** | Solo (Lucas Pope) | TIGSource devlog **Nov 2012 → Aug 2013** |
| Return of the Obra Dinn | **2018-10-18** | Solo | devlog **May 2014 → Oct 2018** |
| A Short Hike | **2019-07-30** | Solo | *"he had to commit to a **3-month deadline**"* |
| Unpacking | **2021-11-01** | Witch Beam (small studio) | **UNVERIFIED** |
| Venba | **2023-07-31** | Visai Games | **UNVERIFIED**; won the 2024 IGF Grand Prize |
| Kind Words | 2019 | **Two people** — *"programmer and designer Ziba Scott and artist Luigi Guatieri"* | **UNVERIFIED** |
| Donut County | **2018-08-28** | Ben Esposito | **UNVERIFIED** |
| Wilmot's Warehouse | **2019-08-29** | **Two people** — *"Richard Hogg and Ricky Haggett"*; built in **OpenFL** | **UNVERIFIED** |
| Mini Motorways | **2021-07-20** | Dinosaur Polo Club | **UNVERIFIED** |
| Coffee Talk | **2020-01-29** | Toge Productions | conceptualised **2017** at a game jam; demo **2018** |
| Wanderstop | **2025-03-11** | Ivy Road | *"conceptualization began in 2016, and bona fide development… around 2018… work on the project lasting **over nine years**"* |
| Animal Well | **2024-05-09** | Solo (Billy Basso) | *"He thought it would take six months. It took **seven years**."* |
| Balatro | **2024-02-20** | Solo (LocalThunk) | *"Development began in **2021, two and a half years before release**"*; start dated **2021-12-13** |
| Tunic | **2022-03-16** | Solo → +producer | *"developed Tunic… over **seven years**. He began work on it as a solo project in **2015**"* |
| Chants of Sennaar | **2023-09-05** | **Two people** | began *"March 2020"*; *"over the next **year and a half**"* before Focus funded the rest → **~3.5 years** |
| Mini Metro | **2015-11-06** | 2 people | conceived **April 2013** (Ludum Dare 26); alpha Sept 2013; EA Aug 2014; **full release Nov 2015**; *"They initially intended on releasing the final version… by the end of 2013, however **development took far longer than they had expected despite the game's limited scope**"* |
| Shenmue | 2000-11-07 (NA) | Sega AM2 | project began **1996**; *"Despite sales of 1.2 million, Shenmue did not recoup its development cost and was a commercial failure."* |
| 80 Days | 2014-07-31 (iOS) → 2015-09 | inkle | ~14-month staged rollout **of an interactive-fiction game with no world geometry** |

Sources: [Steam 413150](https://store.steampowered.com/api/appdetails?appids=413150&languages=english), [391540](https://store.steampowered.com/api/appdetails?appids=391540&languages=english), [239030](https://store.steampowered.com/api/appdetails?appids=239030&languages=english), [653530](https://store.steampowered.com/api/appdetails?appids=653530&languages=english), [1055540](https://store.steampowered.com/api/appdetails?appids=1055540&languages=english), [1135690](https://store.steampowered.com/api/appdetails?appids=1135690&languages=english), [1491670](https://store.steampowered.com/api/appdetails?appids=1491670&languages=english), [702670](https://store.steampowered.com/api/appdetails?appids=702670&languages=english), [839870](https://store.steampowered.com/api/appdetails?appids=839870&languages=english), [1127500](https://store.steampowered.com/api/appdetails?appids=1127500&languages=english), [914800](https://store.steampowered.com/api/appdetails?appids=914800&languages=english), [1299460](https://store.steampowered.com/api/appdetails?appids=1299460&languages=english), [813230](https://store.steampowered.com/api/appdetails?appids=813230&languages=english), [2379780](https://store.steampowered.com/api/appdetails?appids=2379780&languages=english), [553420](https://store.steampowered.com/api/appdetails?appids=553420&languages=english), [1931770](https://store.steampowered.com/api/appdetails?appids=1931770&languages=english), [287980](https://store.steampowered.com/api/appdetails?appids=287980&languages=english); [Wikipedia: Undertale](https://en.wikipedia.org/wiki/Undertale), [Papers, Please](https://en.wikipedia.org/wiki/Papers,_Please), [A Short Hike](https://en.wikipedia.org/wiki/A_Short_Hike), [Balatro](https://en.wikipedia.org/wiki/Balatro), [Tunic](https://en.wikipedia.org/wiki/Tunic_(video_game)), [Chants of Sennaar](https://en.wikipedia.org/wiki/Chants_of_Sennaar), [Mini Metro](https://en.wikipedia.org/wiki/Mini_Metro_(video_game)), [Wanderstop](https://en.wikipedia.org/wiki/Wanderstop), [Shenmue](https://en.wikipedia.org/wiki/Shenmue_(video_game)), [80 Days](https://en.wikipedia.org/wiki/80_Days_(2014_video_game)); [Game Developer: A Short Hike](https://www.gamedeveloper.com/design/finding-smart-shortcuts-in-a-short-hike-postmortem-unlocking-the-vault-4); [WIRED: Animal Well](https://www.wired.com/story/billy-basso-animal-well-whats-next-gdc/); [dukope devlogs](https://dukope.com/devlogs/papers-please/); [PocketGamer.biz: Balatro timeline](https://www.pocketgamer.biz/i-dont-think-i-would-have-rated-balatro-higher-than-an-8-and-i-made-the-damn-thing/).

> **[J] Read the distribution, not the anecdotes.** Of the durational facts I could verify: **~7 months** of public devlog (Papers, Please), **~3 months** of committed production (A Short Hike), **~2.5 years** (Balatro), **32 months** (Undertale), **~3.5 years** (Chants of Sennaar, 2 people), **~4.4 years** (Obra Dinn), **~7 years** (Tunic, Animal Well), **~9 years** (Wanderstop). The pattern is blunt: **the games that shipped in months had almost no art production** (A Short Hike reused prior assets and leaned on Yarn Spinner; Papers, Please is a static desk). **Every game with a *world* took 3–9 years.** A 2.5D walkable foreign city is a *world*. That is the number the plan must respect: **not 3 months — 3+ years at this fidelity, or a hard reduction in what "world" means.**

### 6.2 Web/browser scope evidence

**[F]** **Poki**: *"500+ game developers"*, *"100 million monthly players"*, *"more than 5 million monthly players per high-performing game"*, *"1B+ gameplays per month"* ([developers.poki.com](https://developers.poki.com/)). **CrazyGames**: submissions *"are carefully reviewed by our QA team"*; **Basic Launch** = *"a limited audience for a temporary period of **7 to 21 days**"* with *"no CrazyGames-specific integration"* and **"Monetization… disabled"*; **Full Launch** requires full implementation and full QA review, after which *"Monetization… [is] enabled and you start receiving revenue share"*; progression is decided on *"average playtime, conversion to gameplay, and retention"* ([docs.crazygames.com](https://docs.crazygames.com/)).

> **[J]** The portal model is a real distribution channel with real reach, and it is **structurally incompatible with this project's core promise** — a travel sim whose point is that the player *stops playing and goes to Japan* optimises the opposite metric. Worth knowing as a **technical** proving ground (it forces small builds and fast loads), not as a business model.

### 6.3 AI-assisted solo development — a named evidence gap

**UNVERIFIED, and this is a finding, not a failure.** I could not verify a single 2024–2026 case of a solo developer shipping a game with Cursor / Claude Code / Copilot **with a concrete elapsed time attributable to a primary source**. Nor could I extract Steam's AI-disclosure policy body text ([Steamworks AI content](https://partner.steamgames.com/doc/store/ai_content) and [Content Survey](https://partner.steamgames.com/doc/gettingstarted/contentsurvey) returned navigation chrome to the extractor). News coverage of the form update exists ([Yahoo Tech](https://tech.yahoo.com/gaming/articles/steam-updates-ai-disclosure-form-225124993.html)) but the extracted text was also chrome.

> **[J] Do not put an "AI multiplies velocity by N×" number in the plan. There is no verified N.** The defensible claims are narrower and still useful: AI assistance is **not in the critical path** of any benchmark above (none of the verified durations involved it), and the projects that shipped fastest did so by **removing art production**, not by adding throughput. **Treat AI assistance as a way to reduce the cost of *code* — which was never the binding constraint for these games — and as no help at all with the binding constraint, which is art and content.**

### 6.4 Realistic MVP at 4 / 12 / 24 weeks

> **[J]** The anchor is §6.1: no verified small team shipped a *walkable world* in under ~3 years, and the sub-1-year games are desk-bound or asset-reusing. **The three milestones below are therefore not three sizes of one product on a schedule; they are three different products**, and the plan is dishonest if presented as the former.

Assumptions stated: 1–2 people; AI assistance for code; the legacy SPA is reused **as a shell** but its OpenAI itinerary generation, Google Maps Places/Directions usage and JWT auth are **not** presumed to survive; the fact-layer contract (`source_url` + `verified_at`, validated by `validate-city-pack.mjs`) applies from week 1; **one city**.

| | **4 weeks** | **12 weeks** | **24 weeks** |
|---|---|---|---|
| **Product** | **One street, one day.** A single 40 m × 40 m 2.5D street with 8–12 enterable interiors, a tick clock, three travel events | **One district, three days.** 3–5 connected streets, a customs scene, a transit leg, one language-decipherment thread | **One city, one week.** Multiple districts; **guide export + memoir return loop closed**; a second city as a *style kit* only |
| **World** | 1 street; shared tile vocabulary; 1 style kit | Customs hall + transit hub + 2 more streets | Full district graph; 6–10 district props per city style kit |
| **Time** | Integer tick clock; 20-hour day at Stardew's ratio; day-boundary save | NPC schedule tables for ~10 NPCs; time-sliced tick (KCD pattern) | ~30 NPCs; multi-day state |
| **Narrative** | `inkjs` 2.4.0 graph for authored events; **LLM off** | ink graph + **one** LLM-filled slot type, content-addressed and cached | Full narrative layer; gloss/belief state drives dialog (Heaven's Vault pattern) |
| **Mechanics** | **One**: document verification with ambiguous rules + throughput time pressure (Papers, Please pattern) | **Two**: + decipherment-as-belief-state (Chants of Sennaar took ~3.5 yrs at 2 people for full scope — so a *thread*, not a system) | **Three**: + route/resource planning with two currencies (80 Days pattern) |
| **Facts** | `pack.json` + `places.json` + `transit.json` for 1 city; validator green in CI; every row `source_url` + `verified_at` | + quarterly re-verification job for semi-static fields; Plan B + buffer surfaced in the export | + freshness tiers enforced; dynamic facts never cached as truth |
| **Tech** | Vite/React shell; `phaser` 4.2.1; `idb` 8.0.3; integer clock; seeded PRNG (`pure-rand`); command-log save with `schemaVersion` | + `msw` golden fixtures; replay-from-save debug tool; offline content pack; `navigator.storage.persist()` | + save migration functions; full replay-determinism test in CI |
| **i18n** | `i18next` 26.4.2 + `react-i18next` 17.0.15 for **UI chrome only** | + subset CJK font driven by *guide-required* glyphs | + learned-glyph incremental font loading tied to the language mechanic |
| **OUT** | Any LLM generation. Any second city. Any procgen map. Multiplayer. Voice. Audio beyond one ambient loop. Mobile layout | Second city. Procgen. Any mechanic whose fun is unproven. ECS. BT/GOAP/utility AI. FX arbitrage. Culture-shock meter | Multi-city at launch. User accounts. Server persistence. Prompt-cached LLM as a *required* path (the offline pack is canonical) |
| **Gate** | A stranger plays one day, exports a guide, and the guide is **executable for that street** | The customs scene is **winnable *and* losable**, and losing is recoverable with a Plan B | **A real person follows the exported guide in the real city and returns photos into the memoir** |

> **[J] Three things that look like scope but are not, and belong in no column:** a **second playable city** before the loop is closed (per the skill, a new city must *not* need a new tile type — so it is a style kit, a ~1-week job *after* the loop works and a multi-week trap before it); **any LLM output in the 4-week build** (it makes replay non-deterministic on day one for zero proven benefit); and **any behaviour-tree/GOAP/utility-AI subsystem** (nothing verified above needed one — Census used a relational database, KCD used time-slicing).
>
> **[J] And one invisible failure mode that must be measured, not assumed:** the **curation time per place**. If it exceeds **~20 minutes/place**, a 150-place city pack is infeasible for one person — and **this failure mode is invisible until someone walks to a closed door on wrong opening hours**. Phase 0's 7-day falsification must record curation minutes per place. See [`gap-analysis-and-plan.md`](gap-analysis-and-plan.md) §5.

### 6.5 The single riskiest assumption

> **[J] The riskiest assumption is that a player who has played the game will voluntarily execute the exported guide in the real world and return with photos — and that this is a loop a person completes once, let alone repeatedly.**

Why this and not the others:
- **It is the only assumption no verified benchmark supports.** Every other risk has a shipped precedent: Papers, Please proves document checking works; Chants of Sennaar proves decipherment works for two people; Stardew proves the tick clock and sleep-save work; Balatro proves a solo dev ships in ~2.5 years. **Nothing in §4 or §6 supplies a single verified example of a game whose intended payoff is a real-world trip.** A Short Hike is the closest analogue, and its payoff is entirely in-game.
- **It is upstream of every other decision.** If players do not complete the loop, the entire fact layer is unnecessary — a fictional city would lose nothing. If they do, every hour on provenance, freshness tiers and validators **is the product**, and every hour on 2.5D fidelity is decoration. The correct engineering spend differs by an order of magnitude across those two worlds, and you cannot know which world you are in until someone takes the trip.
- **It fails silently.** A wrong tile vocabulary is visible. A missing feature is visible. **A loop nobody closes looks exactly like a loop nobody has tried yet** — you will keep building, and the signal will not arrive.
- **The legacy codebase's failure already indicts it.** The project's own rule — *"Am I about to add a feature unrelated to the loop 'play → export guide → travel → memoir'? → reject it. The previous attempt at this project died by accumulating 37k lines of tooling unrelated to the product"* — is itself evidence that the default failure mode is building the loop's *support* instead of testing the loop.

**What to do about it** **[J]**: do not resolve this with research; resolve it with an artefact. In the 4-week build, the day-boundary export must produce a guide for **a street the owner has actually walked**, and the owner must follow it once before week 12 begins. That is a weekend of work producing a single trip, and its result changes the plan more than every source above. It must also be the one place the plan is allowed to be **wrong fast**: if the owner will not follow a one-street guide they wrote themselves, no amount of §4 correctness will save the project.

---

## 7. Reuse assessment — what survives into the 2.5D game, and what is thrown away

Basis: a file-level audit of this repo at HEAD `5bf20fd` (branch `feat-cursor-backend`, 2025-06-09), full inventory in [`recon-codebase-salvage.md`](recon-codebase-salvage.md) (1,047 lines), cross-checked against [`package.json`](../../package.json) and [`App.js`](../../src/App.js) this pass.

### 7.1 The state of the legacy app, stated bluntly

**[F]**:
- **Neither `npm run build` nor `npm start` works today.** Both fail at the *same single missing module*: `Can't resolve '@mui/icons-material/Menu'` in `src/components/common`. `@mui/icons-material` is declared in `package.json:8` but **not installed**, and it is imported at **123 sites across 24 files** — the app shell ([`Navbar.jsx:19`](../../src/components/common/Navbar.jsx#L19)) is the sole non-beta consumer, which is why the build dies in the shell, not deep in the beta code.
- **`webpack.config.js` is dead config.** `react-scripts` governs; there is no `eject`, no `react-app-rewired`/`craco`/`config-overrides.js`. The root webpack config defines no `entry`, no `output` and no `HtmlWebpackPlugin`, so it could not produce a runnable app if it *were* read. Consequence: **`npm run analyze` silently does nothing.**
- **Node 26 is *not* the blocker** — webpack 5.98.0 ships md4 as an **embedded WebAssembly module**, so the classic `ERR_OSSL_EVP_UNSUPPORTED` never fires. **[UNVERIFIED]**: the run stopped at module resolution, so a full build on Node 26 is unproven until the missing package is installed.
- **There is no server-side route-generation backend.** The services that look like one are mock-backed, mounted nowhere, and referenced only by tests. **The real LLM path is browser → `https://api.openai.com/v1/chat/completions`, with the OpenAI key in the bundle** — every proxy call is missing `/api`.
- **The travel product is unreachable and the map is fiction.** `/chat`, `/map`, `/profile` sit behind a `NavGuard` requiring `ROLES.BETA_TESTER` ([`App.js:108-143`](../../src/App.js#L108-L143)) — **you cannot reach them at all without an invite code**. `MapPage`'s geography is `Math.random()` around the National Mall.
- **The safety net is attached to the wrong module.** All four API tests target `src/api/*` (dead forks) while the app runs `src/core/api/*`. **Any "the tests pass, so it works" reasoning about this codebase is invalid.**

### 7.2 KEEP — the genuine salvage (~4,500 LOC)

| Asset | LOC | Decision | Why / what to fix |
|---|---|---|---|
| [`server/routes/googlemaps.js`](../../server/routes/googlemaps.js) | 341 | **KEEP (2 fixes)** | The single most valuable file: 6 real endpoints (`/geocode`, `/nearby`, `/directions`, `/place`, `/photo`, `/autocomplete`), real axios calls via `createGoogleMapsClient`, **key injected server-side from the vault**, `cacheMiddleware` on 5 of 6, uniform error envelope. **[+]contract: this cannot be a *fact* source** — Places/Directions data must not become a `places.json` row without a `source_url` + `verified_at` that a human opened. Keep it as a **curation-time assistant and an online side-channel**, never as the guide's authority. **[J]** Its practical role: help *produce* city packs faster, and power non-fact conveniences (a map preview, a distance sanity check). |
| [`src/core/services/storage/`](../../src/core/services/storage) — `LocalStorageService` 224 + `CacheService` 364 + `SyncService` 267 | **862** | **KEEP** | Correct, dependency-free, and tests genuinely pass. `CacheService` is a TTL cache with LZ-string compression, byte accounting, LRU-ish eviction, prefix invalidation and `getCacheStats()` — **directly reusable as the LLM response cache and the debug overlay.** `SyncService` is queue-based offline→online sync, which is exactly the offline-first plumbing this product needs. **[J]** Add an IndexedDB backend behind the same interface — localStorage's 5 MiB is a settings store, not a save system (§4F). |
| [`server/middleware/rateLimit.js`](../../server/middleware/rateLimit.js) | 101 | **KEEP** | `globalLimiter` / `openaiLimiter` / `mapsLimiter` via `express-rate-limit` 7.5.0, installed and working. **Directly needed to stop a game client from burning LLM budget.** |
| [`server/utils/vaultService.js`](../../server/utils/vaultService.js) + `tokenProvider.js` + `apiHelpers.js` + `logger.js` + `middleware/caching.js` | **~1,300** | **EXTRACT** | Real encrypted secret store with rotation metadata, `local`/`aws`/`hashicorp`/`in-memory` backends and an env-var fallback so it works with **zero** infrastructure. Extract the `local` backend; the AWS/HashiCorp branches are speculative. `apiHelpers`' 60 s/30 s timeouts and structured error envelope `{id, source, status, type, message, code, timestamp}` are a good base. **Fix two known defects:** `tokenProvider.js:154` reassigns a `const` and will throw; and the **1-hour md5 cache is a negative asset for a game** — two players receiving byte-identical content is a bug, not a feature. |
| [`src/components/Timeline/`](../../src/components/Timeline) | 559 | **EXTRACT** | `TimelineComponent` / `DayCard` / `ActivityBlock` with CSS and a **passing test**. A day-by-day, time-ordered activity feed is directly reusable as the **quest journal / schedule panel** — i.e. the exact UI the day-boundary model in §4B needs. |
| [`src/features/travel-planning/components/`](../../src/features/travel-planning/components) | **1,171** | **EXTRACT as skeletons** | The most complete UI in the repo: `ItineraryBuilder` (574), `RoutePreview` (237), `RouteGenerator` (197), `TravelPlanningWorkflow` (154). `RouteGenerator`'s free-text input + explicit "analyze" affordance that **shows the parsed intent back to the player** is a genuinely good game UX shape; `TravelPlanningWorkflow`'s 3-step state machine is the correct quest-flow skeleton. **Known defects:** `ItineraryBuilder`'s drag-reorder is a **stub** — a `↕` button with no `onClick` under a "Drag to reorder activities" instruction; `handleAddActivity` mutates state directly. |
| [`src/contexts/`](../../src/contexts) — `LoadingContext` + `NotificationContext` + `AuthContext` | 412 | **KEEP** | Small, clean, already wired, dependency-free. |
| [`src/utils/imageUtils.js`](../../src/utils/imageUtils.js) | 112 | **EXTRACT** | Reusable for **memoir photo thumbnails** — the one place in the legacy code that touches images, and the memoir is half the product. |
| [`server/routes/openai.js`](../../server/routes/openai.js) | 301 | **EXTRACT chassis, rewrite all 4 prompts** | The route scaffolding, JSON-mode plumbing, caching and error handling are worth keeping. **Every prompt payload is travel-specific and must be rewritten** for the narrative layer — and under **[+]contract** they must produce *narrative fields only*, never facts. |
| [`.cursor/.workflows`](../../.cursor/.workflows) + [`.cursor/rules/`](../../.cursor/rules) | 1,880 | **KEEP** | **The most reusable non-code artifact in the repo** — a workable phase-workflow runbook (OKR discipline, documentation inventories, naming conventions, code-review sessions). Note [`.cursor/.project`](../../.cursor/.project) claims *"Secure API key management… Server-side API proxy endpoints created for all external services"* — **directly contradicted by the code**: the proxy is unreachable and the key ships to the browser. Keep the *process*, distrust the *claims*. |
| [`public/service-worker.js`](../../public/service-worker.js) + `offline.html` | 441 | **EXTRACT strategies** | Real SW code with per-resource cache strategies and an offline fallback. **The caching *strategies* are reusable; the precache list must be rewritten** for game assets and the city-pack (it currently caches an app whose map is a live Google Maps JS load). **[J]** This is the foundation of the offline content pack in §5.10. |

### 7.3 THROW AWAY — and the reasons are specific, not aesthetic

**Immediate deletes** **[F]**:

| Asset | LOC | Reason |
|---|---|---|
| `src/features/beta-program/**` minus auth | **~37,700** | Survey builders, AB-test dashboards, session replay, feature-request boards, SLA tracking, UX scoring — **none of it is about travel.** `App.js` depends on 5 imports from it, so extract auth first. |
| `tests/` (Playwright / k6 / ZAP) | **~8,300** | 5 specs with personas named "elena-family-traveler", "james-business-traveler", plus load tests and a ZAP wrapper. **None can execute**, and they encode a product that no longer exists. |
| `src/tests/**` minus ~12 files | **~35,600** | Mostly tests for the dead beta subsystem. |
| [`src/pages/MapPage.js`](../../src/pages/MapPage.js) | 610 | **~480 of 610 lines are mock and empty shells; geography is `Math.random()`.** Keep only the *layout idea* (map pane + intent panel + day timeline + POI list) as a 2.5D HUD reference. |
| `src/api/*` (two forks) + `src/services/storage/*` shims | **1,884** | **Not re-exports — complete parallel implementations that shadow `src/core/*`.** Recall §7.1: the tests target these while the app runs `core`. Deleting them removes the illusion of coverage. |
| [`server/coverage/`](../../server/coverage) | **12,014** | **Committed generated coverage HTML**, including `lcov-report/*.html` renderings of the project's own source. Pure noise. |
| `server/services/routeGenerationService.js` · `routeManagementService.js` · `models/RouteModel.js` · `clients/openaiClient.js` · `clients/googleMapsClient.js` | 672 | **Orphaned *and* fake** — mounted nowhere, mock-backed, referenced only by tests. |
| [`server/utils/keyManager.js`](../../server/utils/keyManager.js) | 180 | **A third, redundant, non-persistent key store** (in-memory `Map`), used by nobody. |
| `@react-google-maps/api` (dependency) + `src/core/api/googleMapsApi.js` + `src/api/googleMapsApi.js` | **~2,100** | A 2D slippy-map React component **cannot render 2.5D**, and the Maps ToS forbids offline tile caching. Three real defects too: mismatched parameter names, **two endpoints that do not exist**, and a filter-then-index bug that cross-wires distances. |
| `deployment/` | 897 | *"A five-environment, multi-cloud production topology for an app that cannot currently produce a `build/` directory."* Requires Docker, a missing `nginx-frontend.conf`, an AWS account, and a Prometheus/CloudWatch stack. **Keep one idea:** the hash-naming scheme in `deploy-to-cdn.js:145`. |
| Most of `scripts/` | ~3,100 | All orchestrate the dead suites. Keep `generate-keys.js` if the vault path survives. |
| `.babelrc` · `webpack.config.js` | 105 | `.babelrc` duplicates CRA's Babel config and can conflict; `webpack.config.js` is never read (§7.1). |
| `src/components/Navbar.js` + `.css` · `src/components/LoadingProvider.js` · `src/pages/TimelineDemoPage.js` | 483 | Superseded duplicates with **zero importers** (verified by grep), plus an unrouted demo page. |
| `src/features/map-visualization/` · `src/features/user-profile/` | 61 | Empty placeholder dirs — **but `src/features/index.js:11-16` exports from four files that do not exist**, and `travel-planning/index.js` is **1 byte**. Landmines saved only by being imported by nothing. |
| `README.md` / `ARCHITECTURE.md` / `API_OVERVIEW.md` claims | — | **Treat as unverified assertions.** They claim a working key-management system and server-side proxies for all external services; §7.1 contradicts both. |

**REWRITE — right idea, wrong implementation** **[F]**:
- [`src/App.js`](../../src/App.js) (148): keep the lazy-route shape and the backend-availability fallback; **invert the auth model** — 9 of 10 routes are beta-gated, and a game must be public with optional accounts.
- [`src/index.js`](../../src/index.js) (46): structurally correct; replace the ad-hoc two-colour theme, keep SW registration.
- `src/core/api/openaiApi.js` (434) / `src/core/api/googleMapsApi.js` (761): keep `recognizeTextIntent`/`generateRoute` as *concepts*; **the transport, prompts and both code paths are broken.**
- `src/features/travel-planning/services/*` (586): the offline-fallback *pattern* (try API → local → last resort) is right; the implementation is fatally broken and **26 call sites use the wrong method names.**
- [`server/server.js`](../../server/server.js) (266): good bones (helmet + CSP, `/health`); **drop the beta/auth/email/admin mounts and the dev invite-code generators before anything ships.**
- `src/components/common/Navbar.jsx` (171): fine component, one import to replace.
- `.github/workflows/` (~1,900): the *shape* is right; every step invokes a script that is broken today.

### 7.4 What the reuse verdict actually means

> **[J] Roughly 4,500 LOC of ~85,000 is worth carrying, and almost none of it is the product.** What survives is **infrastructure** (key-safe server proxies, rate limiting, a vault, a TTL cache, offline sync, a service worker) and **UI skeletons** (timeline, itinerary editor, workflow state machine). What must be rebuilt is everything the player sees and everything the guide asserts: the renderer, all prompts and JSON contracts, the client LLM module, auth/identity, and the four broken client→server endpoint contracts.

**[+]contract — two salvage items are actively dangerous under the project's own rules:**
1. **`server/routes/googlemaps.js` must not be a fact source.** It is the best code in the repo and the most tempting shortcut. Places/Directions results entering `places.json` without a human opening a source URL is exactly the failure the fact layer exists to prevent, and it is the failure that strands someone outside a locked door.
2. **The 1-hour server-side response cache must be re-specified before it is reused.** Identical generated content for every player destroys the narrative layer's variability — and any cache that stores *narrative* must be content-addressed by fact refs (§4F), not by URL+hour.

**[J] The good news, stated plainly:** the three findings in §7.1 mean there is **less to unwind than the file counts suggest**. The travel product was never reachable, the map was never real, and the LLM path never went through the server. The legacy app is not a foundation to repair; it is a **parts bin**, and it happens to contain exactly the boring infrastructure a small team should not have to write twice.

---

## 8. Open gaps — do not let these become numbers

| # | Gap | Status |
|---|---|---|
| 1 | **No independent 60 fps benchmark** for a 2.5D city scene in any engine; all sprite-count claims are vendor marketing | **Measure** — one real city pack, 200 animated NPCs, a real mid-range Android and a real iPhone |
| 2 | **iOS canvas-size / texture-memory / per-tab caps** unpublished | **Measure** |
| 3 | **Phaser 3.x end-of-support date** — no official statement found | Do not claim "3.x is unsupported" |
| 4 | **"Tiles per modern city street"** — no authoritative breakdown exists | Scope in **thousands of sprites**, per shipped pack contents; no per-street number |
| 5 | **GameDev Market Japan Collection** price and licence; **sketchfab migration dates**; **Adobe Firefly** commercial-safety and indemnity wording; **Layer.ai** price/rights; **shubibubi** exact terms; **poly.pizza** per-model licence | **UNVERIFIED** — confirm manually before any enters a budget |
| 6 | **`pure-rand` state serialisation** — undocumented | **Verify**, else fall back to `(worldSeed, commandIndex)` re-derivation |
| 7 | **Float non-determinism, `Object.keys` ordering, `Array.sort` stability** — sources read but not quoted (cache destroyed by a concurrent writer) | Use the citation-free safe rules in §4F; do not cite guarantees |
| 8 | **Canvas `fillText` performance** and CJK font file sizes | **Spike one day**; no performance number in the plan |
| 9 | **Whether any React i18n library supports runtime-injected messages** | **Spike** before the language mechanic depends on it |
| 10 | **No verified 2024–2026 solo-dev shipping timeline with AI coding assistants**, and no verified HTML5 income reports | **Do not put an "AI is N× faster" number in the plan** |
| 11 | **ESRB/IARC policies specifically requiring generative-AI disclosure** | **UNVERIFIED** — do not assert one exists |
| 12 | **PlayCanvas ownership line** rests on one secondary source | **UNVERIFIED** |
| 13 | **Unity Asset Store "Extension Asset" licence** vs a non-Unity browser build | **Verify before use** — it may be unusable here |
| 14 | **Every asset's AI-reference permission** (LimeZu, shubibubi, and any itch.io creator licence) | **Obtain the actual `.txt` licence** before using art as AI reference |

## 9. Sources

**Engine, browser and rendering**
- https://registry.npmjs.org/pixi.js · https://registry.npmjs.org/phaser · https://registry.npmjs.org/three · https://registry.npmjs.org/@babylonjs/core · https://registry.npmjs.org/playcanvas · https://registry.npmjs.org/@playcanvas/react · https://registry.npmjs.org/@pixi/react · https://registry.npmjs.org/@react-three/fiber · https://registry.npmjs.org/@react-three/drei · https://registry.npmjs.org/react-babylonjs
- https://github.com/pixijs/pixijs/releases.atom · https://github.com/pixijs/pixi-react/releases.atom · https://github.com/phaserjs/phaser/releases.atom · https://github.com/mrdoob/three.js/releases.atom · https://github.com/BabylonJS/Babylon.js/releases.atom · https://github.com/playcanvas/engine/releases.atom · https://github.com/godotengine/godot/releases.atom · https://github.com/defold/defold/releases.atom · https://github.com/pmndrs/react-three-fiber/releases.atom
- https://phaser.io/ · https://phaser.io/pricing · https://www.phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know · https://phaser.io/news/2026/05/phaser-3-vs-phaser-4 · https://docs.phaser.io/phaser/concepts/loader · https://docs.phaser.io/api-documentation/4.0.0/namespace/tilemaps-parsers · https://docs.phaser.io/api-documentation/class/tilemaps-tilemap · https://unpkg.com/phaser@4.2.1/skills/tilemaps/SKILL.md
- https://pixijs.com/8.x/guides/components/renderers.md · https://pixijs.com/8.x/guides/components/assets/compressed-textures · https://pixijs.com/blog/pixi-react-v8-live · https://raw.githubusercontent.com/pixijs/tilemap/main/README.md · https://raw.githubusercontent.com/davidfig/pixi-viewport/master/README.md · https://github.com/pixijs-userland/pixi-ldtk-loader
- https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html · https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html · https://godotengine.org/releases/4.7/
- https://docs.unity3d.com/Manual/webgl-browsercompatibility.html · https://docs.unity3d.com/Manual/webgl-performance.html · https://docs.unity3d.com/Manual/web-optimization-mobile.html · https://docs.unity3d.com/6000.6/Documentation/Manual/webgl-technical-overview.html · https://unity.com/blog/unity-is-canceling-the-runtime-fee · https://gist.github.com/aras-p/740c2d4f9977ce92b7de72b1394dd365
- https://defold.com/open/ · https://defold.com/manuals/html5/ · https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0/ · https://playcanvas.com/plans · https://developer.playcanvas.com/user-manual/graphics/cameras/
- https://caniuse.com/webgpu · https://react.dev/reference/react/StrictMode · https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide · https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx · https://github.com/p5-wrapper/react/issues/255 · https://stackoverflow.com/questions/73368742/phaser-3-duplicate-canvas-component-is-created-when-creating-a-new-instance-of · https://docs.crazygames.com/ · https://developers.poki.com/

**Tilemap tooling and assets**
- https://api.github.com/repos/mapeditor/tiled/releases · https://api.github.com/repos/deepnight/ldtk/releases · https://github.com/mapeditor/tiled/pull/4621 · https://github.com/deepnight/ldtk/issues/102 · https://github.com/deepnight/ldtk/issues/944 · https://raw.githubusercontent.com/mapeditor/tiled/master/LICENSE.GPL · https://raw.githubusercontent.com/mapeditor/tiled/master/LICENSE.BSD
- https://doc.mapeditor.org/en/stable/ · https://doc.mapeditor.org/en/stable/reference/json-map-format/ · https://doc.mapeditor.org/en/stable/reference/support-for-tmx-maps/ · https://ldtk.io/download/ · https://ldtk.io/files/JSON_SCHEMA.json · https://ldtk.io/docs/game-dev/ · https://ldtk.io/docs/game-dev/exporting-tiled-tmx/
- https://raw.githubusercontent.com/Kiamo2/YATI/main/README.md · https://raw.githubusercontent.com/Kiamo2/YATI/main/LICENSE · https://api.github.com/repos/vnen/godot-tiled-importer · https://registry.npmjs.org/phaser3-plugin-isometric · https://raw.githubusercontent.com/gnunua/phaser3-plugin-isometric/master/README.md · https://registry.npmjs.org/@pixi/tilemap · https://registry.npmjs.org/pixi-viewport
- https://kenney.nl/support · https://kenney.nl/assets/city-kit-commercial · https://kenney.itch.io/kenney-game-assets · https://limezu.itch.io/moderninteriors · https://limezu.itch.io/modernexteriors · https://cupnooble.itch.io/sprout-lands-asset-pack · https://shubibubi.itch.io/cozy-people · https://craftpix.net/file-licenses/ · https://itch.io/blog/929708/general-paid-asset-license · https://itch.io/t/4047249/for-hireart-pixel-art-indie-prices-characters-backgrounds-portraits-tilesets
- https://assetstore.unity.com/packages/2d/environments/the-japan-collection-japanese-city-free-version-278915 · https://gamedevmarket.net/asset/osaka-city-game-assets · https://gamedevmarket.net/asset/the-complete-japan-collection-bundle · https://support.humblebundle.com/hc/en-us/articles/360036940693-Humble-Make-Your-Card-Game-Assets-EULA
- https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab · https://www.strayspark.studio/blog/fab-marketplace-12-month-retrospective-seller-2026 · https://quaternius.com/packs/downtowncitymegakit.html · https://quaternius.com/license.html · https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/README.md · https://poly.pizza/ · https://9to5google.com/2020/12/02/google-poly-shutdown/
- https://bfl.ai/legal/non-commercial-license-terms · https://stability.ai/community-license-agreement · https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0 · https://www.scenario.com/pricing · https://www.layer.ai/pricing
- https://jettelly.com/blog/how-this-developer-built-a-126-layer-isometric-asset-for-unity · https://stopgame.ru/blogs/topic/118292/nikogda_ne_delay_pixel_art_igru_v_izometrii_mini_painter_devlog_1 · https://www.163.com/dy/article/L0H298GJ0526K8VB.html · https://www.nintendolife.com/news/2022/05/triangle_strategy_producers_talk_hd_2d_and_why_other_devs_havent_used_it · https://www.gamedeveloper.com/art/how-obsidian-replicated-the-look-of-an-infinity-engine-game----in-2015 · https://www.rockpapershotgun.com/pillars-of-eternity-tyranny-art

**Art-style references and scope**
- https://en.wikipedia.org/wiki/Isometric_video_game_graphics · https://en.wikipedia.org/wiki/HD-2D · https://en.wikipedia.org/wiki/Octopath_Traveler · https://en.wikipedia.org/wiki/Triangle_Strategy · https://en.wikipedia.org/wiki/Live_A_Live · https://en.wikipedia.org/wiki/Sea_of_Stars · https://en.wikipedia.org/wiki/Stardew_Valley · https://en.wikipedia.org/wiki/Diablo_II · https://en.wikipedia.org/wiki/Baldur%27s_Gate_(video_game) · https://en.wikipedia.org/wiki/Pillars_of_Eternity · https://en.wikipedia.org/wiki/Disco_Elysium · https://en.wikipedia.org/wiki/Final_Fantasy_VII · https://en.wikipedia.org/wiki/Resident_Evil_(2002_video_game) · https://en.wikipedia.org/wiki/SimCity_2000 · https://en.wikipedia.org/wiki/RollerCoaster_Tycoon · https://en.wikipedia.org/wiki/Coffee_Talk_(video_game) · https://en.wikipedia.org/wiki/VA-11_Hall-A · https://en.wikipedia.org/wiki/Neo_Cab · https://en.wikipedia.org/wiki/Two_Point_Hospital · https://en.wikipedia.org/wiki/Graveyard_Keeper · https://en.wikipedia.org/wiki/Age_of_Empires_II
- https://en.wikipedia.org/wiki/Mini_Metro_(video_game) · https://80.lv/articles/like-a-dragon-devs-on-the-effective-reuse-of-kamuroch-map-assets · https://en.wikipedia.org/wiki/Kamurocho · https://en.wikipedia.org/wiki/Yakuza_(franchise) · https://en.wikipedia.org/wiki/Persona_5 · https://en.wikipedia.org/wiki/GeoGuessr · https://en.wikipedia.org/wiki/Shenmue_(video_game) · https://en.wikipedia.org/wiki/Kind_Words_(video_game) · https://en.wikipedia.org/wiki/80_Days_(2014_video_game) · https://www.inklestudios.com/press/80days/ · https://en.wikipedia.org/wiki/Undertale · https://en.wikipedia.org/wiki/A_Short_Hike · https://en.wikipedia.org/wiki/Balatro · https://en.wikipedia.org/wiki/Tunic_(video_game) · https://en.wikipedia.org/wiki/Chants_of_Sennaar · https://en.wikipedia.org/wiki/Wanderstop · https://en.wikipedia.org/wiki/Papers,_Please · https://en.wikipedia.org/wiki/Heaven%27s_Vault · https://en.wikipedia.org/wiki/Recettear · https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Majora%27s_Mask · https://en.wikipedia.org/wiki/Animal_Crossing_(video_game)
- https://www.gamedeveloper.com/design/finding-smart-shortcuts-in-a-short-hike-postmortem-unlocking-the-vault-4 · https://www.wired.com/story/billy-basso-animal-well-whats-next-gdc/ · https://dukope.com/devlogs/papers-please/ · https://dukope.com/devlogs/obra-dinn/ · https://www.pocketgamer.biz/i-dont-think-i-would-have-rated-balatro-higher-than-an-8-and-i-made-the-damn-thing/ · https://store.steampowered.com/api/appdetails?appids=413150&languages=english (and 391540, 239030, 653530, 1055540, 1135690, 1491670, 702670, 839870, 1127500, 914800, 1299460, 813230, 2379780, 553420, 1931770, 287980, 381780, 774201, 1051410, 808090, 794540, 931310, 726110, 1632490, 606150)

**Systems, narrative, determinism**
- https://stardewvalleywiki.com/Time · https://gdcvault.com/play/1027018/Census-The-Systemic-Backbone-Behind · https://gdcvault.com/play/1013459/Three-States-and-a-Plan · https://gamedev.net/news/5526-supporting-thousands-of-npcs-in-kingdom-come-deliverance-kingdom-come/ · https://www.eurogamer.net/zelda-majoras-mask-time-mechanic-originally-rewound-a-week
- https://registry.npmjs.org/inkjs/latest · https://docs.yarnspinner.dev/faq.md · https://docs.yarnspinner.dev/llms.txt · https://github.com/YarnSpinnerTool/YarnSpinner/releases/latest · https://raw.githubusercontent.com/klembot/twinejs/develop/LICENSE · https://raw.githubusercontent.com/tmedwards/tweego/master/LICENSE · https://www.renpy.org/doc/html/license.html · https://www.articy.com/en/pricing/ · https://assetstore.unity.com/packages/tools/behavior-ai/dialogue-system-for-unity-11672 · https://www.choiceofgames.com/terms/ · https://www.inklestudios.com/press/heavensvault/
- https://raw.githubusercontent.com/davidbau/seedrandom/master/README.md · https://raw.githubusercontent.com/dubzzz/pure-rand/main/README.md · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random · https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage · https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria · https://registry.npmjs.org/dexie/latest · https://registry.npmjs.org/idb/latest · https://registry.npmjs.org/localforage/latest · https://registry.npmjs.org/msw/latest · https://registry.npmjs.org/nock/latest · https://lakefs.io/blog/toggle-openai-model-determinism/
- https://www.openstreetmap.org/copyright · https://osmfoundation.org/wiki/Licence/Community_Guidelines · https://www.polygon.com/2017/12/4/16725748/pokemon-go-map-changes-openstreetmap/ · https://en.wikipedia.org/wiki/Microsoft_Flight_Simulator_(2020_video_game)
- https://registry.npmjs.org/i18next/latest · https://registry.npmjs.org/react-i18next/latest · https://registry.npmjs.org/intl-messageformat/latest · https://raw.githubusercontent.com/adobe-fonts/source-han-sans/release/LICENSE.txt · https://raw.githubusercontent.com/notofonts/noto-cjk/main/LICENSE · https://fonttools.readthedocs.io/en/latest/subset/ · https://developers.google.com/fonts/docs/getting_started · https://github.com/pixelcog/glyphhanger

**LLM in the loop**
- https://platform.openai.com/docs/pricing · https://platform.openai.com/docs/guides/structured-outputs · https://platform.openai.com/docs/guides/function-calling · https://platform.openai.com/docs/guides/prompt-caching · https://platform.openai.com/docs/guides/embeddings · https://platform.openai.com/docs/guides/moderation · https://developers.openai.com/api/docs/guides/prompt-caching
- https://docs.claude.com/en/docs/about-claude/pricing · https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching · https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview · https://www.anthropic.com/legal/aup · https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents · https://ai.google.dev/gemini-api/docs/pricing · https://ai.google.dev/gemini-api/docs/caching
- https://partner.steamgames.com/doc/gettingstarted/contentsurvey?language=english · https://partner.steamgames.com/doc/store/ai_content · https://www.videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use/ · https://tech.yahoo.com/gaming/articles/steam-updates-ai-disclosure-form-225124993.html · https://multiplayer.it/notizie/su-steam-i-giochi-che-usano-lia-generativa-hanno-prodotto-ricavi-per-660-milioni-di-dollari-nel-2025.html
- https://news.ubisoft.com/fr-fr/article/7Cm07zbBGy4Xml6WgYi25d/quand-ia-et-crativit-convergent-dcouvrez-ghostwriter · https://techcrunch.com/2023/03/22/ubisofts-new-ai-tool-automatically-generates-dialogue-for-non-playable-game-characters/ · https://www.polygon.com/22408261/ai-dungeon-filter-controversy-minors-sexual-content-censorship-privacy-latitude/ · https://inworld.ai/blog/how-inworld-helped-the-ai-game-death-by-ai-with-20-million-players-reach-profitability · https://inworld.ai/pricing · https://www.gamelook.com.cn/2026/05/592917/ · https://store.steampowered.com/app/2726370/Suck_Up/ · https://store.steampowered.com/app/3730100/ · https://store.steampowered.com/app/2782660/ · https://naavik.co/podcast/finding-success-with-ai-agents-and-content-creators/ · https://quuxplusone.github.io/blog/2024/02/08/infinite-craft/ · https://news.ycombinator.com/item?id=39205020
- https://developer.nvidia.com/ace · https://www.convai.com/ · https://github.com/art-from-the-machine/Mantella · https://arxiv.org/abs/2305.16291 · https://arxiv.org/abs/2304.03442 · https://dl.digra.org/index.php/dl/article/view/2258 · https://www.pcgworkshop.com/archive/xu2025constraint.pdf · https://github.com/zilliztech/GPTCache · https://redis.io/langcache/ · https://www.pinecone.io/pricing/ · https://zod.dev/ · https://ajv.js.org/
- https://artificialintelligenceact.eu/article/50/ · https://www.esrb.org/ratings-guide/ · https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa · https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-launches-inquiry-ai-chatbots-acting-companions · https://lmspeed.net/leaderboard/model-speed?sort=time-to-first-token&dir=desc

**This repo**
[`package.json`](../../package.json) · [`src/App.js`](../../src/App.js) · [`src/components/common/Navbar.jsx`](../../src/components/common/Navbar.jsx) · [`server/routes/googlemaps.js`](../../server/routes/googlemaps.js) · [`server/routes/openai.js`](../../server/routes/openai.js) · [`src/core/services/storage/`](../../src/core/services/storage) · [`src/features/travel-planning/components/`](../../src/features/travel-planning/components) · [`src/components/Timeline/`](../../src/components/Timeline) · [`docs/handOff/recon-codebase-salvage.md`](recon-codebase-salvage.md) · [`docs/handOff/gap-analysis-and-plan.md`](gap-analysis-and-plan.md) · [`docs/handOff/README.md`](README.md) · [`.dsh/skills/tourguide-fact-integrity/SKILL.md`](../../.dsh/skills/tourguide-fact-integrity/SKILL.md)

---

*Compiled 2026-09-28 from four parallel research streams (raw sections in [`recon/sections/`](recon/sections/)) plus a file-level audit of this repository. Verified facts carry links; judgments are marked **[J]**; unknowns are marked **[GAP]** or **UNVERIFIED** and were not filled in. No source file was modified by this research.*


---

> **Provenance.** Appendix A is the one artefact carried over from the earlier report
> `recon-2.5d-game-research.md` (the superseded pass). Nothing else from that file is
> reproduced here — its other content is either thinner restatements of sections above or
> subsumed by them. Source of this appendix: see "Authored by" at the end of this document.

## Appendix A. Concrete directory layout — Phaser inside React, with a separate guide/memoir UI layer

```
src/
  app/
    App.tsx                     # router, providers; the ONLY place React majors are pinned
    routes.tsx                  # /play  /guide  /memoir  /settings
    providers/
      StoreProvider.tsx          # warm store (useSyncExternalStore)
      BusProvider.tsx            # typed event bus + dev-time schema validation

  game/                          # ---- everything that may import the engine ----
    engine/
      createGame.ts              # the single Game factory; canvas passed in
      gameConfig.ts              # Phaser config; canvas, scale, physics, scene list
      lifecycle.ts               # useGameInstance(): ref guard, StrictMode-safe mount/destroy
      resize.ts                  # ResizeObserver -> game.scale.resize
    scenes/
      BootScene.ts
      PreloadScene.ts
      CityScene.ts               # tilemap + movement for one city
      OverlayScene.ts            # in-canvas markers, tooltips, transitions
    systems/
      movement.ts
      isometricOrGrid.ts         # grid <-> world projection, kept swappable for §2 tier changes
      timeSystem.ts              # in-game clock, drives day/date
      photoSystem.ts             # captures the frame + writes memoir metadata
    bridge/
      events.ts                  # THE typed bus contract (single source of truth)
      toStore.ts                 # engine -> warm store, throttled
      fromStore.ts               # warm store -> engine, imperative
    render/                      # engine-specific draw helpers (tile, sprite, depth-sort)

  facts/                         # ---- ZERO engine imports; the fact layer lives here ----
    data/
      cities/                    # versioned fact datasets per city (see §5.3)
        tokyo.v1.json
        kyoto.v1.json
    schema/
      place.ts                   # zod: id, name, geo, hours[], price{}, transit[], sources[]
      itinerary.ts               # zod: the exported guide contract (§7.9)
    FactsService.ts              # the ONLY reader of facts/data; no LLM in this module
    provenance.ts                # every fact carries a source ref + asOf

  narrative/                     # ---- the ONLY module allowed to call an LLM ----
    NarrativeService.ts
    prompts/
      system.narrate.v3.txt      # content-hashed; hash recorded per session
    schema/
      narrativeOutput.ts         # zod discriminated union; see §5.4
    guard/
      factLeak.ts                # rejects hours/price/transit-shaped strings
      retry.ts                   # bounded retry, then a deterministic template
    budget/
      ledger.ts                  # per-session tokens + USD, hard cap

  compose/                       # facts + narrative -> renderable blocks (deterministic)
    GuideComposer.ts             # the exported guide; NO LLM call on this path
    MemoirComposer.ts

  guide/                         # ---- the React "executable travel guide" UI layer ----
    GuideApp.tsx
    DayView.tsx
    MapRail.tsx                  # Leaflet/MapLibre + own tiles; NOT Google Maps JS (see §7)
    FactCard.tsx                 # renders ONLY from FactsService
    ExportPanel.tsx              # PDF / HTML / JSON / .ics

  memoir/                        # ---- the photo-album UI layer ----
    MemoirApp.tsx
    PhotoUploader.tsx            # user's real trip photos
    exif.ts                      # timestamp + GPS -> auto-place into the itinerary
    AlbumPage.tsx

  ui/                            # shared presentational components (no engine, no LLM)
    components/
    layouts/AppShell.tsx         # keep-alive shell; canvas survives route changes when needed

  shared/                        # types/utils imported by BOTH game and ui
    types/
    events.d.ts                  # re-export of game/bridge/events.ts types only
```

**Two dependency rules that make the layout load-bearing, not decorative** `[J]`:

1. `game/**` may import `shared/**` and `facts/schema/**`. **`facts/**` and `narrative/**` may never import `game/**`.** Enforce with an ESLint `no-restricted-imports` zone rule and a CI check. This is the mechanical half of §5's enforcement.
2. `guide/**` and `memoir/**` may import `facts/**` and `compose/**` but **never `narrative/**` directly** — narrative text arrives already-composed, so the guide UI cannot accidentally render a raw model string.

---

> **Provenance.** Appendix B is the second and last artefact carried over from the superseded
> earlier report. §5 above states the *rule* (the LLM may only produce narrative wrapping over a
> frozen `GuideDoc`); this appendix states the *mechanism* that makes the rule enforceable, which
> the earlier pass specified in more operational detail than §5 does. Source: see "Authored by".

## Appendix B. Concrete enforcement mechanism — how the fact/narrative separation is actually held

Seven layers, ordered from cheapest to most expensive to bypass:

**(1) Separate services, enforced by the module graph.**
`FactsService` is the only reader of `facts/data/**` and **contains no LLM client import**. `NarrativeService` is the only module holding an LLM client and **has no read access to `facts/data/**`** — it receives a fact payload as an argument and cannot go looking for more. Enforced by ESLint `no-restricted-imports` zones plus a CI check on the import graph, per §3.6 rule 1. This layer stops the leak *at authoring time*, which is the only place it is cheap to stop.

**(2) A typed boundary: the LLM can only return narrative.**
The response contract is a discriminated union in which **no variant has a field that can hold a fact**:

```ts
// narrative/schema/narrativeOutput.ts
const NarrativeBlock = z.object({
  kind: z.literal('narrative'),
  refFactIds: z.array(z.string()).min(1),   // must cite facts it was GIVEN
  text: z.string().max(600),
  tone: z.enum(['quiet', 'brisk', 'warm', 'wry']),
});
const NarrativeResponse = z.object({
  blocks: z.array(NarrativeBlock).min(1).max(6),
});
// NOTE: there is deliberately no `place`, `hours`, `price` or `transit` field.
// A model that wants to invent an opening time has nowhere to put it.
```

Grounded in the provider capability that makes this real rather than aspirational: Structured Outputs "ensures the model will always generate responses that adhere to your supplied JSON Schema, so you don't need to worry about the model omitting a required key, or hallucinating an invalid enum value", with "Reliable type-safety: No need to validate or retry incorrectly formatted responses" and "Explicit refusals: Safety-based model refusals are now programmatically detectable" (`_q5cache\03116E2FC3C2.txt`).

**(3) The fact payload is injected as a read-only context block, never as instructions.**
Facts arrive in a delimited, machine-generated block with stable IDs, and the system prompt states: *this block is the only permitted source of factual content; you may not add entities; every block you return must cite `refFactIds` drawn from this block.* The `refFactIds` field is the enforcement hook — a returned block citing an ID that was not in the payload is rejected by a set-membership check, which costs nothing and catches the most common drift.

**(4) Post-hoc rejection on fact-shaped output.**
`guard/factLeak.ts` runs on every accepted block and rejects on:
- **Time patterns** — `\d{1,2}[:：]\d{2}`, `\d{1,2}\s*(時|am|pm)`, `〜|～|-` between two times, `定休日`, `closed`, `last train`, `終電`.
- **Price patterns** — `¥|￥|\d+\s*円|JPY|\$\d|admission|入場料|fare|運賃`.
- **Transit-instruction patterns** — `line|線|駅|station|exit|出口|transfer|乗り換え` combined with a verb of direction.
- **Entity check** — proper nouns not present in `refFactIds`' payload. This is the one that catches the dangerous long tail.

Rejection semantics: **the block is dropped, not corrected.** Retry is bounded (2 attempts with the failure quoted back). On final failure the composer substitutes a **deterministic template** from `GuideComposer` — so the player always gets a correct, slightly plainer guide, and never a fluent lie. This is the single most important behavioural choice in the section: *degrade to boring, never degrade to wrong.* `[J]`

**(5) Seeded determinism, for reproducibility rather than for uniqueness.**
Two mechanisms, both evidenced:
- **Fact-side determinism** — cache-first, exactly as Infinite Craft does. "the game checks from its database if these two elements have already been combined before … to ensure that the same pair of elements always outputs the same result for all players" (`_q5cache\wiki_infcraft.txt`). Here: `(placeId, dayIndex, styleKey) → narrativeText` is a cache key; a hit never calls the model.
- **Model-side determinism is best-effort only.** The researcher's plan lists the OpenAI seed cookbook and a "defeating nondeterminism in LLM inference" writeup among intended sources (`_research\jobs4.txt`), but neither was captured. `[GAP]` **Do not architect as if seeds give byte-identical output.** Treat the narrative cache as the determinism layer and the seed as a tie-breaker.

**(6) Cost accounting per session, with a hard cap.**
A per-session ledger in `narrative/budget/ledger.ts` records tokens in/out, model id, prompt-cache hit/miss, and USD, keyed by `sessionId`. Hard cap with graceful degradation to templates. Why this is non-negotiable:
- `[F]` Latency of 1–3 s per turn already damages conversational feel (`_q5cache\gamelook_infcraft.txt`); a cost-driven model downgrade is a *design* change, not an ops tweak, and must be visible in the ledger before it is visible to players.
- `[F]` The only AI-native hit in this evidence set was **breaking even** ("It's not making money, but at least it's not losing any", `_q5cache\eg_infcraft.txt`), and multiplayer multiplies cost per player rather than amortising it (`_q5cache\gamelook_infcraft.txt`).
- `[F]` Model deprecation is routine, forcing a re-tune (`_q5cache\suckup.txt`), so the ledger must be able to answer "what would this month have cost on the new model" without a code change.
- The researcher's plan already identified prompt caching as the lever — OpenAI (1,024-token minimum, discount tiers), Anthropic (write 1.25× / read 0.1×, 5-min and 1-hour), Gemini explicit context caching — plus GPTCache and Redis LangCache as semantic-cache options (`_research\jobs4.txt`, `_research\jobs5.txt`). **The OpenAI and Gemini mechanics are now verified; the Anthropic ones are not.** Verified this session: OpenAI prompt caching "reuses work when requests share the same prompt prefix", is **enabled by default** for supported models, discounts cached input "up to **90%**", requires a minimum cacheable prefix of **1,024 tokens** (hidden system content does not count toward it), and bills **cache writes at 1.25× the uncached input rate against reads at 0.1×** — "Writing a prefix once and fully reusing it once costs 1.35× its ordinary input cost, compared with 2× for processing it twice"; across ten requests, one write and nine full reads cost **2.15×** versus **10×** uncached (`_q5cache\oai_cache.txt`). Gemini's page prices context caching for `gemini-3.8-flash` at **$0.075 / 1M tokens** against $0.75 input and $3.75 output, plus **$0.50 / 1M tokens per hour** of storage, with the whole schedule set to roughly double on 2027-01-01 (`_q5cache\gem_pricing.txt`). `[J]` The design consequence for this project: **the GuideDoc is the stable prefix and the per-leg variation must sit after it** — that ordering is the difference between a ~2.15× and a ~10× input bill. Still `[GAP]`: Anthropic's write/read multipliers and TTL behaviour, plus GPTCache and LangCache terms, were never captured.

**(7) Two-sided sourcing: every fact carries provenance, and the UI renders facts only from `FactsService`.**
A fact without a source ref and an `asOf` date does not enter `facts/data/**`. The guide UI physically cannot render a fact from the narrative path, because `guide/FactCard.tsx` reads `FactsService` and the narrative arrives pre-composed as text. Amended or expired facts propagate a "verify before you go" marker into the export. `[J]`

**(8) Steam disclosure is a known obligation, not a surprise.**
`[F]` Developers need not disclose "AI powered tools" used for workflow, but must disclose "AI to generate content for the game" and/or "AI content generated during gameplay"; the content disclosure "counts for the game itself alongside associated material like marketing assets or the store page", and the gameplay disclosure is a checkbox (`_q5cache\gd_valve.txt`). **Plan for both checkboxes to be ticked**, describe the boundary accurately in the disclosure text, and read §5.2's review-count finding as a reason to make the boundary a *marketing* asset ("the facts are sourced; the AI only writes the mood") rather than something to bury. `[J]`

**(9) Content moderation is a budget line, not a feature.**
`[F]` AI Dungeon's failure shows both directions of the trap: unfiltered generation produced illegal content, and keyword filtering produced false positives plus a privacy backlash (`_q5cache\techdirt_aid.txt`). `[J]` For this product the exposure is smaller and the right posture is clearer: the LLM only produces narrative around an itinerary the player themselves assembled, so the moderation surface is NPC dialogue and place descriptions, and the correct control is **input and output classifiers on a narrow, low-stakes channel** — not a keyword blocklist over private text UI. The researcher's plan lists the moderation endpoint among intended sources (`_q5cache\oai_moderation.txt` exists).

### 5.5 What this rule costs

`[J]` Roughly: the LLM's job shrinks from "write the guide" to "write the connective tissue between 30 sourced facts". That is exactly the scope at which Ghostwriter, Suck Up! and Hidden Door succeeded — narrow, bounded, human-reviewed or human-framed. It is also the scope at which the product stops depending on the model's reliability, because the guide is *correct even if the model is offline*. Template fallback means the export path has **zero LLM dependency**: the single most important property in this section.

---

## Authored by

Content provenance for this document, recorded so a reviewer can trace any claim back to the
agent session that produced it. Agent ids are DSH subagent session ids and are stable; use them
rather than pointing at a file, because files get moved and rewritten.

| Content | Produced by | Notes |
|---|---|---|
| §1–§6 (2.5D families and art cost, engine selection, tooling/assets, hard problems, AI in the loop, scope benchmarks), §7 reuse assessment, §8 gaps, §9 sources | **`c7b6d5e0-74b6-40bb-a132-8db4db3ba0c3`** | The primary author of this pass. It reports a "supervision" pattern: `subagent` is depth-capped at 1 for it, so it fanned work out through the `workflow` tool to four internal research streams. Those internal agents have no ids disclosed to this session and are **not** individually attributable. |
| Raw per-section drafts that §1–§6 were compiled from | same agent, via its four internal streams | Landed as `q1q3-art-and-tooling.md` (89,850 B, 22:05), `q2-engines.md` (58,189 B, 22:00), `q4q6-hardproblems-scope.md` (94,122 B, 22:08); a Q5 stream landed as `docs/handOff/archive/page-cache/q5-llm-pipeline.md` because a concurrent writer resolved that path first. |
| §7.1 blunt state-of-the-legacy-app findings (missing module, dead webpack config, mock-backed route services, key shipped to the browser, RBAC gate, tests attached to the wrong module) | **`2a2c867a-dbcf-4200-868a-33b301330bda`** | Produced the file-level audit `recon-codebase-salvage.md` (1,047 lines) that §7 is cross-checked against. Cited here rather than `c7b6d5e0` because those findings originate in that audit. |
| **Appendix A** (React directory layout, `useGameInstance`, `BusProvider`, `StoreProvider`, the `guide/**`/`memoir/**` import constraints) | **`10379568-9840-4401-be9f-49137bab1b8f`** | The earlier, superseded pass. This appendix is its only surviving unique content. |
| Scope-benchmark corrections and the stricter `UNVERIFIED` handling in §6.1 | **`a723f5db-c56c-489b-a3fc-24c2951d7a4e`** | A separate later session that worked on the superseded file and applied `_q2src`→`docs/handOff/archive/engine/` path rewrites and a registry-citation caveat. Its `UNVERIFIED:` discipline is reflected in §6.1 and §8. |
| Engine evidence corpus at `docs/handOff/archive/engine/` (88 files, first write 21:27:49, last 21:59:39) | **shared, not singly attributable** | The corpus spans the working windows of `2a2c867a`, `c7b6d5e0` and `a723f5db`. It is recorded as a shared evidence base; do not attribute it to one agent. |

### Orphaned evidence — flagged deliberately

The Japanese-geodata corpus at `docs/handOff/archive/corpora/geo-japan/` (132 files, written 21:35:48–21:44:37) was produced by **`ee9176b2-7a82-4800-bf7a-966de0ead3f6`**, the geodata/compliance session that failed before producing a report.

**Neither this report nor its superseded predecessor cites it** — verified by searching both for `recon2`, `research-scratch`, `ekispert`, `jorudan`, `odpt`, `mlit-gtfs`, `gmp-terms` and `gmp-service`: zero hits in both. The corpus nonetheless contains primary sources that bear directly on §3.5 and on the guide's executability, including Google Maps Platform service terms, the ODbL text, OSM tile and Nominatim policies, the Geofabrik Japan extract page, Ekispert and Jorudan transit-API pages, ODPT open-transit material (including a PDF), MLIT GTFS material, and Yelp/Mapbox/Foursquare terms.

It is therefore **unmined, not absent**. Treat assembling it into a compliance pre-flight as outstanding work, and do not read its absence from §3.5/§9 as evidence that those sources were checked.
