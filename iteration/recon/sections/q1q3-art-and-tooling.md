# Recon Q1 + Q3 — 2.5D style families, shipped references, art-cost drivers, isometric/tilemap tooling and asset sources

> Scope: Q1 (2.5D definition & shipped reference games) and Q3 (isometric/tilemap tooling + asset sources) for the TourGuideAI 2.5D overseas-travel-simulation reboot.
> Retrieval date: **2026-09-28**. Every factual claim carries an inline link to a URL that was fetched in this pass or that appeared in search results; where a page could not be retrieved, the claim is marked **UNVERIFIED:** with the exact gap named.
> `JUDGMENT:` marks my own reasoning, never a sourced fact.
>
> Environment note: in this session the `web_fetch` tool resolved most hosts to non-public IPs. Retrieval was done through `Invoke-WebRequest`/`curl` from the shell instead. Hosts that refused automated retrieval are named individually below rather than silently omitted.

---

## Q1 — '2.5D' definition, shipped reference games, and what actually drives art cost

### 1.1 The four families, their exact visual signature, and the cost driver in each

| Family | Exact visual signature | Shipped references | What drives cost per distinct location |
|---|---|---|---|
| **(a) Isometric tile 2.5D** | No vanishing point — every object shows **two side faces plus the top face**, and apparent scale does not change with distance ([Mini Painter devlog, 18 May 2025 — "У вас нет точек схода… Всегда видны две боковые грани объекта и его верхняя грань"](https://stopgame.ru/blogs/topic/118292/nikogda_ne_delay_pixel_art_igru_v_izometrii_mini_painter_devlog_1)). Projection is parameterisable: the Phaser plugin exposes `projectionAngle` for "classic 2:1 pixel dimetric, true 120° isometric or any angle you like" ([gnunua/phaser3-plugin-isometric README](https://raw.githubusercontent.com/gnunua/phaser3-plugin-isometric/master/README.md)). Tiled models it as a first-class orientation alongside `orthogonal`, `oblique`, `staggered`, `hexagonal` ([Tiled JSON Map Format reference](https://doc.mapeditor.org/en/stable/reference/json-map-format/)). | Diablo II and RollerCoaster Tycoon both sit in Wikipedia's *Video games with isometric graphics* category ([Diablo II](https://en.wikipedia.org/wiki/Diablo_II), [RollerCoaster Tycoon](https://en.wikipedia.org/wiki/RollerCoaster_Tycoon_(video_game))); Sea of Stars is "presented in a fixed isometric view using two-dimensional pixel art" ([Wikipedia](https://en.wikipedia.org/wiki/Sea_of_Stars)); Graveyard Keeper runs on Unity ([Wikipedia](https://en.wikipedia.org/wiki/Graveyard_Keeper)) | **Object count × viewable faces**, not map area. The devlog states you will "рисовать… в два или три раза больше, чем во всех иных стандартных видах визуализации. Три грани любого объекта — это много" — draw **two to three times more** than in any standard view, because three faces per object is a lot ([Mini Painter devlog](https://stopgame.ru/blogs/topic/118292/nikogda_ne_delay_pixel_art_igru_v_izometrii_mini_painter_devlog_1)). Rounded objects are called out as the worst case, because pixel-art circles in axonometric projection are extremely labour-intensive. Second driver: **depth sorting**, which constrains *how you may draw*, not just how much — "everything still needs to stay within tile boundaries so Unity can sort it correctly" ([Jettelly, 28 Apr 2026, on a 126-layer isometric building](https://jettelly.com/blog/how-this-developer-built-a-126-layer-isometric-asset-for-unity)) |
| **(b) 3/4 top-down with layered sprites** | Orthogonal or near-orthogonal grid; the camera is tilted enough that building fronts and character bodies are visible, but the tile grid stays axis-aligned. Characters are built from **stacked layers** (body / clothing / hair / accessories) so one base sprite yields many looks — the Cozy People pack ships "character sprites … in a 32x32 px layout to make layering clothing and hair as easy as possible", 13 hairstyles × 14 colours and all clothing in 10 colours ([shubibubi, Cozy People](https://shubibubi.itch.io/cozy-people)). | Stardew Valley — MonoGame, with one person credited for "writing, art, audio, and programming" ([Wikipedia](https://en.wikipedia.org/wiki/Stardew_Valley)); Coffee Talk (Unity, [Wikipedia](https://en.wikipedia.org/wiki/Coffee_Talk_(video_game))); Neo Cab (Unity, [Wikipedia](https://en.wikipedia.org/wiki/Neo_Cab)); VA-11 HALL-A (GameMaker Studio, [Wikipedia](https://en.wikipedia.org/wiki/VA-11_HALL-A)) | **Breadth of the prop/interior vocabulary, not per-tile drawing effort.** Because the grid is axis-aligned, one drawn tile is reusable everywhere; the cost is the *number of distinct props and furniture sets* a location needs. LimeZu's Modern Interiors is scoped as "Thousands of furniture", "100+ frame by frame made animated objects" and modular walls/floors/carpets/tables, and the author reports "+2000 hours of work poured into this asset" ([LimeZu, Modern Interiors](https://limezu.itch.io/moderninteriors)). Character cost collapses via layering rather than via drawing new characters |
| **(c) 2D sprites/billboards in a 3D world ('HD-2D')** | Real-time 3D geometry for the environment, 2D pixel sprites for characters/monsters, plus modern lighting and post. Square Enix's own producers describe it as "rich HD 3D backdrops with SNES-inspired pixel art characters", and the 4Gamer interviewer frames the target as a **diorama**: "realistic lighting shine on deformed characters – it feels like I'm looking at a diorama or a vignette-like object" ([Nintendo Life, 30 May 2022](https://www.nintendolife.com/news/2022/05/triangle-strategy-producers-talk-hd-2d-and-why-other-devs-havent-used-it)) | Octopath Traveler, Triangle Strategy, Live A Live (2022 remake). Live A Live's remake runs on **Unreal Engine 4** ([Wikipedia infobox](https://en.wikipedia.org/wiki/Live_A_Live)); Triangle Strategy's producers confirm HD-2D and that the camera problem changed per game ([Nintendo Life](https://www.nintendolife.com/news/2022/05/triangle-strategy-producers-talk-hd-2d-and-why-other-devs-havent-used-it)) | **Two pipelines instead of one**, plus a per-game camera solution. Tomoya Asano, on why other studios have not copied it: "It's probably worth noting that **it costs more than you'd think**. In that respect, it's a good match for the titles [we] want out of Square Enix. There might not be much to gain from other companies copying it." His colleague Yasuaki Arai, on Triangle Strategy's rotatable camera: "**It took a lot of resources to make the map observable from all sides.** At the start of development, we spent a lot of time discussing what to do at the edge of maps." Same interview notes that Square Enix teams **share HD-2D know-how between projects**, because it is not easy to apply ([Nintendo Life](https://www.nintendolife.com/news/2022/05/triangle-strategy-producers-talk-hd-2d-and-why-other-devs-havent-used-it); the same interview origin is reported in Spanish at [Vandal, 31 May 2022](https://vandal.elespanol.com/noticia/1350754011/los-productores-de-square-enix-dicen-que-el-hd2d-es-mas-caro-de-lo-que-parece/)) |
| **(d) Pre-rendered background + 2D/3D character** | A high-resolution *static* backdrop image is composited behind moving characters. The defining property is that the backdrop is **rendered offline from dense 3D geometry and shipped as a picture**, so the runtime never redraws it. | Baldur's Gate 1/2 (Infinity Engine; the game's "distinctive pre-rendered backgrounds have become synonymous with isometric RPGs") and Pillars of Eternity (Unity), which deliberately rebuilt that look ([Rock Paper Shotgun, 4 Sep 2017](https://www.rockpapershotgun.com/pillars-of-eternity-tyranny-art)); Final Fantasy VII — "3D character models superimposed over 2D pre-rendered backgrounds" ([Wikipedia](https://en.wikipedia.org/wiki/Final_Fantasy_VII)) | **Render time and render farm throughput, plus a bespoke toolchain.** Obsidian's Adam Brennecke: "Our backgrounds, they have millions and millions of really high poly, highly dense geometry, and the art-team just go wild with it… **It takes days to render these images out, because they're so high-res, they're 10,000 by 10,000 pixels.** It's more like how a movie is made, where you need a fat renderer farm with a lot of computers churning out these really highly dense, really crazy images all night and all day" ([RPS](https://www.rockpapershotgun.com/pillars-of-eternity-tyranny-art)). The toolchain itself was the bigger cost: "**8 months of development was trying to figure out how to actually make a game that still looked like the Infinity Engine**" ([Game Developer, 5 Sep 2017](https://www.gamedeveloper.com/art/how-obsidian-replicated-the-look-of-an-infinity-engine-game----in-2015)) |

`JUDGMENT:` Families (a) and (d) are the two that punish a small team hardest, for opposite reasons: (a) multiplies *drawing* work per object by face count and adds a sorting constraint; (d) needs an offline render pipeline and a camera/backdrop compositing toolchain that has to be re-solved per project. (b) is the only family whose per-tile cost stays flat as location count grows.

---

### 1.2 Verified style classification of the named reference games

Legend for the **Confidence** column: *verified* = the classification rests on a page fetched in this pass; *partial* = the engine/technique is verified but the specific rendering statement is not; *UNVERIFIED* = I could not confirm it and will not guess.

| Game | Family | Visual signature | Engine / toolchain | Confidence | Source |
|---|---|---|---|---|---|
| Octopath Traveler | (c) HD-2D | 3D backdrops + pixel sprites, heavy lighting/post | HD-2D; UE4-family (see note) | partial | [Nintendo Life](https://www.nintendolife.com/news/2022/05/triangle-strategy-producers-talk-hd-2d-and-why-other-devs-havent-used-it), [The Verge HD-2D explainer](https://www.theverge.com/entertainment/840080/square-enix-hd2d-games-octopath-dragon-quest) |
| Triangle Strategy | (c) HD-2D | HD-2D with a **360°-rotatable** tactical camera — the producers say making maps look good from all angles "took a lot of resources" | not stated in the fetched source | verified (family), engine UNVERIFIED | [Nintendo Life](https://www.nintendolife.com/news/2022/05/triangle-strategy-producers-talk-hd-2d-and-why-other-devs-havent-used-it) |
| Live A Live (2022 remake) | (c) HD-2D | HD-2D remake of the 1994 SFC title; Wikipedia's own comparison caption reads "the battle system as seen in the Super Famicom original (top) and the **HD-2D remake** (bottom)" | **Unreal Engine 4** | verified | [Wikipedia](https://en.wikipedia.org/wiki/Live_A_Live) |
| Sea of Stars | (a)/(b) — **isometric-presented 2D pixel art, NOT confirmed HD-2D** | "presented in a fixed isometric view using two-dimensional pixel art, similar to SNES-era RPGs"; movement "breaks free from the classic bound-to-the-grid tileset movement" | Unity + Aseprite, with a custom lighting/render pipeline | family verified; **whether world geometry is 3D is UNVERIFIED** | [Wikipedia](https://en.wikipedia.org/wiki/Sea_of_Stars); [Steam store page](https://store.steampowered.com/app/1244090/Sea_of_Stars/) — "Our custom-made render pipeline allows the creation of a breathtaking world coming to life by pushing the limits of 2D pixel-art games"; secondary Spanish summary of the Unity+Aseprite pipeline at [Foro3D, 1 May 2026](https://foro3d.com/2026/mayo/sea-of-stars-pixel-art-clasico-con-iluminacion-moderna-en-unity.html) |
| Stardew Valley | (b) | Top-down pixel farm sim on an orthogonal tile grid | **MonoGame**; one person credited for art as well as code | engine verified; exact camera angle is `JUDGMENT:` | [Wikipedia](https://en.wikipedia.org/wiki/Stardew_Valley) |
| Diablo II | (a) | Isometric 2D sprite ARPG | — | verified (isometric category) | [Wikipedia](https://en.wikipedia.org/wiki/Diablo_II) |
| Baldur's Gate 1/2 | (a)+(d) | Isometric RPG on **pre-rendered backdrops** | **Infinity Engine** | verified | [Wikipedia](https://en.wikipedia.org/wiki/Baldur%27s_Gate_(video_game)), [RPS](https://www.rockpapershotgun.com/pillars-of-eternity-tyranny-art) |
| Pillars of Eternity | (d) | Pre-rendered backdrops at **10,000 × 10,000 px** plus **3D character models**, dynamic lighting and particles | **Unity** | verified | [RPS](https://www.rockpapershotgun.com/pillars-of-eternity-tyranny-art), [Wikipedia](https://en.wikipedia.org/wiki/Pillars_of_Eternity) |
| Disco Elysium | (a) presentation; background pipeline **UNVERIFIED** | "presented in an isometric perspective in which the player character is controlled" | **Unity** | perspective verified; **whether backdrops are hand-painted 2D with 3D characters is UNVERIFIED** — the ZA/UM GDC art talk exists but I could not retrieve a first-party statement | [Wikipedia](https://en.wikipedia.org/wiki/Disco_Elysium) |
| Final Fantasy VII | (d) | "3D character models superimposed over **2D pre-rendered backgrounds**"; the first FF to use FMV and 3D CG | — | verified | [Wikipedia](https://en.wikipedia.org/wiki/Final_Fantasy_VII) |
| Final Fantasy VIII / IX | (d) | Same pre-rendered-backdrop paradigm | — | **UNVERIFIED** — I did not retrieve a source for VIII or IX specifically in this pass | — |
| Resident Evil 1 remake (2002 / 2015 HD) | (d) — commonly documented as pre-rendered backdrops | — | **MT Framework** (HD remaster) | engine verified; **the pre-rendered-background claim is UNVERIFIED in this pass** | [Wikipedia](https://en.wikipedia.org/wiki/Resident_Evil_(2002_video_game)) |
| Age of Empires II | (a) | Isometric 2D sprite RTS | **Genie Engine**, released 1999-09-27 | engine verified; **isometric classification itself not separately verified in this pass** | [Wikipedia](https://en.wikipedia.org/wiki/Age_of_Empires_II) |
| SimCity 2000 | (a) | Isometric city grid | — | **UNVERIFIED** — the Wikipedia infobox carries no engine and my grep did not surface an isometric statement | [Wikipedia](https://en.wikipedia.org/wiki/SimCity_2000) |
| RollerCoaster Tycoon | (a) | Isometric park builder; Wikipedia places it in *Video games with isometric graphics* | written in **assembly language** per Wikipedia's categories | verified | [Wikipedia](https://en.wikipedia.org/wiki/RollerCoaster_Tycoon_(video_game)) |
| Two Point Hospital | 2D sprites in a 3D world (a (c)-adjacent family, **not** HD-2D pixel art) | Modern-styled sprites in a real-time 3D environment | **Unity** | engine verified; **the sprite-in-3D rendering claim is UNVERIFIED** — I could not retrieve the art-director interview | [Wikipedia](https://en.wikipedia.org/wiki/Two_Point_Hospital) |
| Graveyard Keeper | (a) | Isometric pixel management sim, Unity | **Unity** | engine verified; **isometric classification not separately verified in this pass** | [Wikipedia](https://en.wikipedia.org/wiki/Graveyard_Keeper) |
| Coffee Talk | (b)-adjacent — 2D visual novel with layered static art | Visual novel; 2D character/background compositing | **Unity** | engine + genre verified; layered-sprite claim is `JUDGMENT:` | [Wikipedia](https://en.wikipedia.org/wiki/Coffee_Talk_(video_game)) |
| VA-11 HALL-A | (b)-adjacent — 2D visual novel | Visual novel | **GameMaker Studio** | engine + genre verified | [Wikipedia](https://en.wikipedia.org/wiki/VA-11_HALL-A) |
| Neo Cab | (b)-adjacent — 2D visual novel | Visual novel | **Unity** | engine + genre verified | [Wikipedia](https://en.wikipedia.org/wiki/Neo_Cab) |
| The Legend of Zelda: A Link Between Worlds | **Not a 2D sprite game — real 3D models rendered under a faked top-down camera.** Aonuma: "We had purposefully **tilted the objects back** so you could see Link and the others' faces and bodies when looking from directly above"; Shikata: "If you looked straight down from the top, all you could see was Link's hat… it looked like some mysterious green object moving around!" | 60 fps, stereoscopic 3D | Nintendo 3DS | verified | [Iwata Asks, Nintendo](https://iwataasks.nintendo.com/interviews/3ds/a-link-between-worlds/0/3/) |

`JUDGMENT:` The single most decision-relevant correction in this table is **A Link Between Worlds**: it is routinely cited as a "2D top-down" reference, but Nintendo's own developers describe it as 3D objects deliberately tilted back to *read* as top-down. That is a cheap, legitimate 2.5D trick — the whole visual identity comes from one camera/rotation decision rather than from hand-drawing tiles.

`JUDGMENT:` The second is **Sea of Stars**. It is frequently filed under HD-2D, but the developer's own store copy says "2D pixel-art games" and Wikipedia describes it as 2D pixel art in a fixed isometric view. On the evidence I retrieved it is *not* an HD-2D billboard game. I could not verify whether its lighting is applied to 3D geometry or to 2D sprites in a 3D scene — do not cite it as proof that "billboard-in-3D is achievable by a small team."

---

### 1.3 Art-cost drivers — what the numbers actually say

#### 1.3.1 Tile dimensions and tile counts

| Fact | Number | Source |
|---|---|---|
| LimeZu Modern Interiors ships in three tile sizes — **16×16, 32×32 and 48×48** — from one art source | 3 sizes | [LimeZu](https://limezu.itch.io/moderninteriors) |
| Same for Modern Exteriors | 3 sizes | [LimeZu](https://limezu.itch.io/modernexteriors) |
| Cozy People character sprites are **20×16 px** drawn inside a **32×32** cell, specifically so clothing/hair can be layered | 20×16 in 32×32 | [shubibubi](https://shubibubi.itch.io/cozy-people) |
| One shipped 2D isometric pack, Kenney's *Isometric Miniature Dungeon*, is **70 files** | 70 assets | [kenney.nl](https://kenney.nl/assets/isometric-miniature-dungeon) |
| One shipped 3D city kit, Kenney's *City Kit (Commercial)*, is **50 files** | 50 assets | [kenney.nl](https://kenney.nl/assets/city-kit-commercial) |
| Quaternius' *Downtown City MegaKit* — "over 300 modular environment pieces for building full Boston/NYC style city blocks" — is **315 models** in FBX / .blend / glTF | 315 models | [quaternius.com](https://quaternius.com/packs/downtowncitymegakit.html) |
| Kenney's *All-in-1* bundle is advertised at **60,000+ total assets** across 2D sprites, 3D models, UI, audio (1,200+ SFX) and fonts | 60,000+ | [kenney.itch.io](https://kenney.itch.io/kenney-game-assets) |
| LimeZu reports **+2000 hours** for Modern Interiors; Modern Exteriors is described as "more than 2000 hours of work" | ~2,000 h each | [LimeZu MI](https://limezu.itch.io/moderninteriors), [LimeZu ME](https://limezu.itch.io/modernexteriors) |

`JUDGMENT:` **There is no canonical "how many tiles does a city street need" number, and I will not invent one.** The published packs give you the shape of the answer instead: a *single-theme* interior pack is a multi-thousand-hour artefact, a *single* modular 3D city kit is ~300 modules, and a generalist 2D pack is ~70 files. Any city-street estimate should be built by counting the props in a reference scene and multiplying, not by quoting a figure from a blog post.

#### 1.3.2 The one hard "one isometric building takes X hours" datapoint I could verify

Indie developer **TranquilBeast** documented a single large isometric building for *Death Afterparty*:

- **126 layers**, **over 200k hand-pixelled pixels**
- **"over 60 hours to draw, plus another 10 to set it up in Unity"** → ~70 hours for one hero building
- Built on a **32×16 tiled isometric grid** ("everything needs to fit within a 32x16 layout")
- The hard constraint was not drawing but **sorting**: "Even when drawing elements like roofs that sit above the base, everything still needs to stay within tile boundaries so Unity can sort it correctly. This often means splitting elements across tiles in ways that are not easy to think through at first."

Source: [Jettelly, 28 April 2026](https://jettelly.com/blog/how-this-developer-built-a-126-layer-isometric-asset-for-unity), reporting the developer's own [r/SoloDevelopment post](https://www.reddit.com/r/SoloDevelopment/).

`JUDGMENT:` Use ~70 h as an **upper-bound hero-asset** datapoint, not a per-building average. A generic walk-past building is far cheaper; but the number is the only first-party hours figure I found, and it validly kills any plan that assumes "one isometric building per afternoon" once you need hero-quality landmarks for many cities.

#### 1.3.3 Published freelance and marketplace rates

The most concrete rate table I found is a Chinese-language survey roundup (2026-06-28) summarising a **July 2025** study across 11 platforms (Mihuashi, Chuzhan, Bilibili Workshop, Taobao/Xianyu, Fiverr, Upwork, Skeb, Pixiv and others). It is a **secondary aggregator, not a primary platform price list** — treat the figures as indicative:

| Asset type | Entry | Mid | Professional |
|---|---|---|---|
| 32×32 static character | $5–15 | $15–40 | $40–80 |
| 4-directional walk cycle (4–8 frames) | $15–40 | $40–100 | $80–200 |
| Small tileset | $20–50 | $50–150 | $150–400 |
| Single scene | $30–80 | $80–200 | $200–500 |

Other figures from the same roundup: Fiverr Vetted Pro **$40–75/hr**; Upwork mid-level artists commonly **$15–40/hr**; Fiverr hosts **3,000+** sprite gigs spanning **$5 to $800+**. The three multipliers it identifies are (i) **animation ≈ 3–5× static**, (ii) **commercial licence ≈ 2× the private-commission price, buyout ≈ 3×**, and (iii) **quantity**, with indie-forum totals of **50,000 CNY to $120,000** discussed for 100–1,000+ sprites. It also recommends a prototype path of itch.io packs + 1–2 custom heroes + AI-assisted simple props (the article cites **$0.5–2 per item**) inside **$200**. Source: [163.com / 网易号, 2026-06-28](https://www.163.com/dy/article/L0H298GJ0526K8VB.html).

`JUDGMENT:` The article's own headline advice — "don't be fooled by the shelf price; what decides your bill is the multiplication behind it" — is the correct framing for this project. The commercial-licence multiplier is the one most likely to be missed: a rate that looks affordable per asset roughly doubles the moment the asset enters a product.

#### 1.3.4 What makes a foreign city *read* as distinct

The published packs answer this implicitly rather than theoretically. LimeZu's Modern Exteriors is sold as "**Streets, buildings and each little detail you need for your cities**" plus "**Animated vehicles ranging from cars to trucks**" and "**Autotiles for Godot and Game Maker Studio**", all on "a unique palette" ([LimeZu](https://limezu.itch.io/modernexteriors)). Modern Interiors enumerates **interior archetypes** rather than tiles — "japanese house, clothing store, museum, ice-cream shop, TV studio, condominium, hospital, morgue…" ([LimeZu](https://limezu.itch.io/moderninteriors)).

`JUDGMENT:` Combining that with the project's own tile-vocabulary rule, the cheapest correct reading of "distinct city" is:

1. **shared tile vocabulary** (one street/floor/wall system for every city),
2. **per-city palette swap**,
3. **per-city signage/typography** (this is where Japan reads as Japan — it is a font and kanji problem, not a tile problem),
4. **6–10 district props per city** (a vending-machine bank, a station sign, a shrine gate, a conbini facade…),
5. **ambient audio bed** (train chime, crossing signal, announcement).

Steps 1 is paid once; 2–5 are cheap per city. Steps 2–5 are also the parts that carry **the least licence risk**, because they are usually generated in-house.

`JUDGMENT:` This also means the honest answer to "how many tiles does a new city need?" is **almost none** — a new city needs a *style kit*, not a tileset. That is exactly the design rule already recorded for this project: "Does a new city need a new **tile type**? → that is a design bug, not an art task; the tile vocabulary is shared and each city gets only a style kit (palette + signage + 6–10 district props)."

---

### 1.4 RECOMMENDATION — which of (a)–(d) for many distinct foreign-city locations

**Recommend (b), "3/4 top-down with layered sprites", with a shared tile vocabulary and per-city style kits. Reject (a) and (c). Treat (d) as a one-off cinematic technique only.**

Ranked reasons, in order of weight:

1. **Per-tile cost is flat in location count.** In (a) the cost is object count × visible faces and you pay it in every new city; the Mini Painter devlog puts the multiplier at 2–3× versus a standard view ([StopGame](https://stopgame.ru/blogs/topic/118292/nikogda_ne_delay_pixel_art_igru_v_izometrii_mini_painter_devlog_1)). In (b) one drawn tile is reusable unchanged, so marginal city cost trends toward the style kit alone.
2. **The engine path is already decided and it points at (b).** Phaser 4's tilemap layer explicitly supports `orthogonal, isometric, hexagonal, and staggered` maps, **but `TilemapGPULayer` — the fast path — is "Orthographic maps only (no iso/hex/staggered)"** ([Phaser 4.2.1 `skills/tilemaps/SKILL.md`](https://unpkg.com/phaser@4.2.1/skills/tilemaps/SKILL.md); the same four orientations are listed in the [Phaser `Tilemap` API docs](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap)). Phaser 4.2.1 shipped 2026-07-09 ([npm](https://registry.npmjs.org/phaser)). So the *fast* tilemap path and the isometric art direction are mutually exclusive in the engine the project already has.
3. **HD-2D is disqualified by its own vendor.** Asano: "it costs more than you'd think" and "there might not be much to gain from other companies copying it"; Arai: "It took a lot of resources to make the map observable from all sides" ([Nintendo Life](https://www.nintendolife.com/news/2022/05/triangle-strategy-producers-talk-hd-2d-and-why-other-devs-havent-used-it)). Square Enix additionally needs *cross-team knowledge transfer between HD-2D projects* to make it work at all. A one-owner team has no such pool.
4. **(d) is a pipeline project, not an art project.** Obsidian spent **8 months** just getting the tech to look like the Infinity Engine, and renders backdrops at **10,000 × 10,000 px** over "days" on a render farm ([Game Developer](https://www.gamedeveloper.com/art/how-obsidian-replicated-the-look-of-an-infinity-engine-game----in-2015), [Rock Paper Shotgun](https://www.rockpapershotgun.com/pillars-of-eternity-tyranny-art)). That is the wrong shape of work for one owner plus coding agents, and it is also the wrong *output*: static backdrops cannot be re-lit for a day/night or weather system the way (b) can.
5. **Layered sprites solve characters cheaply.** Cozy People's 32×32 layering scheme yields 13 hairstyles × 14 colours and clothing in 10 colours from one sprite base ([shubibubi](https://shubibubi.itch.io/cozy-people)). For a game whose cast is ordinary people in ordinary clothes across many cities, that is the highest-leverage art decision available.

**Cost drivers in priority order** (highest first):

| # | Driver | Why it ranks here | Anchor |
|---|---|---|---|
| 1 | **Location count × distinct props required per location** | The only term that scales with the thing this game needs most (many cities). Keep it near-constant via the shared vocabulary + style kit | [LimeZu MI "thousands of furniture"](https://limezu.itch.io/moderninteriors); [Quaternius 315-module city kit](https://quaternius.com/packs/downtowncitymegakit.html) |
| 2 | **Animation frame count** | ~3–5× the static price per asset, and it multiplies across every character and NPC | [163.com rate roundup](https://www.163.com/dy/article/L0H298GJ0526K8VB.html); [LimeZu "100+ frame by frame made animated objects"](https://limezu.itch.io/moderninteriors) |
| 3 | **Commercial-licence multiplier** | Roughly doubles the private-commission price; the buyout tier roughly triples it. Turns a "cheap" rate into a budget line | [163.com rate roundup](https://www.163.com/dy/article/L0H298GJ0526K8VB.html) |
| 4 | **Signage / typography localisation** | The single largest *perceived* difference between cities, and the least served by generic packs — see §3.5 | `JUDGMENT:` |
| 5 | **Depth sorting / anchor conventions** | Zero art budget, but it constrains how art may be drawn and cut. Cheapest to get right at the start, most expensive to retrofit | [Jettelly / TranquilBeast](https://jettelly.com/blog/how-this-developer-built-a-126-layer-isometric-asset-for-unity) |
| 6 | **Ambient audio** | Per-city, small, and often licensable cheaply under CC0 | `JUDGMENT:` |

---

## Q3 — Isometric/tilemap tooling and asset sources

### 3.1 Tiled and LDtk: current versions, release dates, licence split

| | **Tiled** | **LDtk** |
|---|---|---|
| Latest release | **1.12.2, published 2026-05-27** (1.12.1: 2026-03-25; 1.12.0: 2026-03-13; 1.11.2: 2025-01-28; 1.11.0: 2024-06-27) | **1.5.3, published 2024-01-15** (1.5.2: 2024-01-12; 1.5.1: 2024-01-11; 1.5.0: 2024-01-10) |
| Release evidence | [GitHub Releases API](https://api.github.com/repos/mapeditor/tiled/releases) | [GitHub Releases API](https://api.github.com/repos/deepnight/ldtk/releases) |
| Site-stated "latest stable" (2026-09-28) | 1.12.2 (docs PDFs are versioned `Tiled 1.12.2 documentation`) — [Tiled docs](https://doc.mapeditor.org/en/stable/) | **1.5.3**, described as "Latest stable (1.5.3, free)" with a **1.5.4 (preview)** listed — [ldtk.io/download](https://ldtk.io/download/), [ldtk.io/release-notes](https://ldtk.io/release-notes/) |
| Repo activity | Last commit **2026-09-25** ("docs: Point to YATI and ue5-tiled-importer (#4621)") | Last commit **2026-07-12** ("Merge pull request #1230 … fix/ci"). **Note the asymmetry: LDtk is actively committed to but has not cut a tagged release since Jan 2024** — a version-pinning risk for a project that needs schema stability |
| Licence of the *editor* | **GPL-2.0** ([LICENSE.GPL](https://raw.githubusercontent.com/mapeditor/tiled/master/LICENSE.GPL)) | LDtk's own site: "**You may use any content created with LDtk as you wish, even for commercial projects. No hidden fee: LDtk will always be free.**" — [ldtk.io/download](https://ldtk.io/download/) |
| Licence of the *libraries/format* | **BSD** ([LICENSE.BSD](https://raw.githubusercontent.com/mapeditor/tiled/master/LICENSE.BSD)) — this covers `libtiled`, listed in the Tiled docs as "C++/Qt based libtiled, used by Tiled itself and included at `src/libtiled` (BSD)" ([Tiled libraries page](https://doc.mapeditor.org/en/stable/reference/support-for-tmx-maps/)) | MIT per the project's npm/registry metadata for the level-editor package ([npm search index](https://registry.npmjs.org/-/v1/search?text=ldtk)); **the LDtk *application* source licence could not be re-confirmed from a fetched LICENSE file in this pass — UNVERIFIED** |
| Map orientations supported | `orthogonal`, `isometric`, `oblique`, `staggered`, `hexagonal` ([Tiled JSON Map Format](https://doc.mapeditor.org/en/stable/reference/json-map-format/)) | **Square grids only — no hexadecimal, no isometric** (see §3.2) |
| Interchange | Native XML (`.tmx`/`.tsx`) and JSON (`.tmj`/`.tsj`) | Native `.ldtk` JSON + a **Tiled TMX export** |

`JUDGMENT:` The licence asymmetry is **not** the deciding factor. GPL-2.0 governs the *editor program*; it does not reach the maps you author with it — the project's own earlier recon reached the same conclusion. What decides it is capability fit, and on isometric the answer is one-sided.

---

### 3.2 Does LDtk support isometric tilemaps? — **No, and this is settled**

**Verified negative.** Three independent confirmations:

1. **Feature request #102, "Feature request: Hex grids"**, opened 2020-09-26 by morgan3d, was **closed with the label `wontdo ❌`** by the maintainer — [github.com/deepnight/ldtk/issues/102](https://github.com/deepnight/ldtk/issues/102).
2. **Feature request #944, "Feature request: Hex or Isometric tile support"**, opened 2023-07-24, records that it "is a duplicate of the issue of Hex or Isometric tiles which was first opened 2-3 years ago in issue #102" and that maintainer deepnight "mentioned the difficulty comes from hidden 'dev costs' of supporting those types of tiles and **placed it under wontdo**". The issue is **Closed** — [github.com/deepnight/ldtk/issues/944](https://github.com/deepnight/ldtk/issues/944).
3. **The JSON schema has no isometric concept.** Grepping the published schema for grid/geometry fields returns only `defaultGridSize`, `tileGridSize`, `gridSize`, `pxWid` — there is no orientation, projection-angle, or isometric flag — [LDtk JSON schema](https://ldtk.io/files/JSON_SCHEMA.json). The docs likewise describe only "Tile layers" and "IntGrid layers" ([LDtk docs](https://ldtk.io/docs/game-dev/)).

**LDtk's only bridge to isometric is a one-way export, and the maintainer discourages relying on it.** LDtk can export a project to TMX, but the docs state it "**ONLY exists as a temporary method** to load a LDtk project JSON in a game framework that only supports TMX files" and that "**It is strongly advised to parse the LDtk JSON file or use the Super Simple Export to get the best results**". Documented limitations include multi-layer explosion ("tiles … might be exported as multiple Tiled layers"), IntGrid becoming a dummy tilesheet of plain squares, arrays flattened to `myArray_0`, `myArray_1`…, and Aseprite files unsupported (PNG only) — [ldtk.io/docs/game-dev/exporting-tiled-tmx](https://ldtk.io/docs/game-dev/exporting-tiled-tmx/).

`JUDGMENT:` **If the art direction is isometric, LDtk is out of the tooling decision entirely.** Its real strengths — auto-layer rules, Worlds, and direct `.aseprite` live-reload — are orthogonal to the isometric problem dimension, and the TMX export path is explicitly a compatibility shim rather than a workflow. Conversely, if the art direction is (b) top-down layered, LDtk's Aseprite live-reload and auto-layering remain genuinely valuable for a one-person art loop, and its lack of isometric support costs nothing.

---

### 3.3 Engine import matrix (2025–2026 state)

| Engine / lib | Version (as of 2026-09-28) | Tiled import | LDtk import | Isometric rendering | Licence |
|---|---|---|---|---|---|
| **Phaser 4** | **4.2.1**, published 2026-07-09 ([npm](https://registry.npmjs.org/phaser)) | **First-party.** `this.load.tilemapTiledJSON()`, `map.addTilesetImage()`, `map.createLayer()`, `setCollision()` — documented in the shipped skill file ([`skills/tilemaps/SKILL.md`](https://unpkg.com/phaser@4.2.1/skills/tilemaps/SKILL.md)) | **No first-party loader.** Community options only (see below) | **Supported but not on the GPU fast path.** "Phaser supports orthogonal, isometric, hexagonal, and staggered maps"; `TilemapGPULayer` (v4.0.0+) is "**Orthographic maps only (no iso/hex/staggered)**", single tileset per layer, max 4096×4096 tiles ([SKILL.md](https://unpkg.com/phaser@4.2.1/skills/tilemaps/SKILL.md)) | MIT ([npm](https://registry.npmjs.org/phaser)) |
| **Phaser 4 (release line)** | 4.1.0 "Salusa" published **30 April 2026** — its headline change was making `Layer` a proper `GameObject`; **"Layers must still sit at the top of a scene or inside other Layers. They cannot be children of Containers."** ([phaser.io](https://phaser.io/news/2026/04/phaser-4-1-0-salusa-release)) | — | — | — | MIT |
| **Phaser 3** | 3.90.0 (last v3 publish 2025-05-23, per the project's own prior recon) | First-party | Community only | Isometric exists in the v3 tilemap API; GPU tilemap is ortho-only | MIT |
| **PixiJS v8** | **8.21.0**, published 2026-09-17 ([npm](https://registry.npmjs.org/pixi.js)) | `pixi-tiledmap` (third-party, listed in Tiled's own docs as "A loader and renderer for Tiled Maps in Pixi.JS", [Tiled libraries page](https://doc.mapeditor.org/en/stable/reference/support-for-tmx-maps/)) | `pixi-ldtk-loader` **v2.3.3, published 2024-11-25** ([npm search index](https://registry.npmjs.org/-/v1/search?text=ldtk)) | **Not in the core tilemap package.** `@pixi/tilemap` describes itself as "a low-level **rectangular** tilemap implementation" ([README](https://raw.githubusercontent.com/pixijs/tilemap/main/README.md)) | MIT |
| **`@pixi/tilemap`** | **5.0.2**, published 2025-07-14 ([npm](https://registry.npmjs.org/@pixi/tilemap)) | n/a (renderer only) | n/a | **Rectangular only.** Version map: v5.x ⇄ PixiJS v8 ([README](https://raw.githubusercontent.com/pixijs/tilemap/main/README.md)) | MIT |
| **`pixi-viewport`** | **6.0.3**, published 2024-11-27 ([npm](https://registry.npmjs.org/pixi-viewport)) | n/a (camera only) | n/a | n/a — but it is the standard pan/zoom camera. "**v6.0.0** Moves pixi-viewport to **pixi.js v8+**" ([README](https://raw.githubusercontent.com/davidfig/pixi-viewport/master/README.md)) | MIT |
| **Godot 4** | not re-verified here; the project's prior recon records 4.5.2 (2026-03-19) as the stable download | **First-party Tiled→Godot 4 `.tscn` exporter ships with Tiled**; Tiled's docs additionally point to **YATI** as the recommended third-party importer after PR #4621 | YATI supports Tiled, **not** LDtk. No first-party LDtk importer | **Native.** A TileSet tile shape may be "rectangular, hexagonal, or **isometric** (pseudo-3D perspective)"; default is Square and "you can also choose Isometric" ([Godot 4 Using TileSets](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html)) | MIT |
| **Three.js / Babylon.js** | not re-verified | **No first-party Tiled importer.** Tiled's HTML5 section lists neither Three.js nor Babylon.js among the JS engines with Tiled support — it lists Crafty, Excalibur (`excalibur-tiled`), GameJs, melonJS, Panda 2, `pixi-tiledmap`, Phaser and TMXjs ([Tiled libraries page](https://doc.mapeditor.org/en/stable/reference/support-for-tmx-maps/)) | none listed | Three.js/Babylon.js give you 3D and you write the projection yourself; a community example exists at [Babylon.js forum "Best way to render tilemaps?"](https://forum.babylonjs.com/t/best-way-to-render-tilemaps/39985) | MIT (both) |

`JUDGMENT:` **The single most important line in this table for this project is the Phaser one.** Phaser 4 gives you a first-party Tiled loader *and* isometric map support — but they do not compose with the fast renderer. If the project picks isometric art, it either accepts the slower classic `TilemapLayer`, or writes its own isometric renderer, or leaves Phaser. If it picks top-down layered art, Phaser 4 + Tiled + `TilemapGPULayer` is a fully first-party, MIT-licensed, actively-released path.

---

### 3.4 Godot 4: TileMapLayer/TileSet isometric, and the importer question (YATI vs the dead vnen importer)

**Isometric support is first-party and documented.**
- A TileSet tile shape may be "rectangular, hexagonal, or isometric (pseudo-3D perspective)". "The default tile shape is Square, but you can also choose Isometric", and when using a non-square shape "you may also need to adjust the Tile [size]" — [Godot 4 "Using TileSets"](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html).
- Godot 4's node for this is **`TileMapLayer`** (the successor to the monolithic `TileMap` node) — the same page's structure is titled "Using TileSets → TileMapLayer", and Godot's class reference pages for `TileMapLayer`, `TileSet`, `TileSetAtlasSource`, `TileSetScenesCollectionSource` and `TileSetSource` are the linked API surface ([Godot 4 "Using TileSets"](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html)).

**YATI is now the officially pointed-to importer — this is a September 2026 change, not folklore.**
Tiled maintainer **bjorn** merged **PR #4621 on 2026-09-25**, titled *"docs: Point to YATI and ue5-tiled-importer"*, with the rationale: "Added YATI to the Godot section in `support-for-tmx-maps.rst` and to the Godot 4 exporter manual page, **since it is the more complete and popular option.**" — [Tiled PR #4621](https://github.com/mapeditor/tiled/pull/4621). This is the same commit that is the repository's latest commit on 2026-09-28.

**YATI facts:**
- Full name: *YATI (Yet Another Tiled Importer) for Godot 4*; "This addon is for Godot 4 only and won't work with Godot 3.x" — [README](https://raw.githubusercontent.com/Kiamo2/YATI/main/README.md).
- **Latest version 2.2.7, requires Godot 4.3.0 or higher.** A separate **1.7.1** line exists for Godot 4.2.x.
- "Tested on Windows 10 with **Godot 4.6.1 and Tiled 1.12**."
- Supports "**all map orientations**", all layer and object kinds, visibility/opacity/tint/offsets/probability, parallaxes, tile collisions, tile animations, templates and custom properties.
- Runtime packages available since v1.5.2.
- Ships in **GDScript and C#** variants; for the C# build "Run your project once for building the plugin, otherwise enabling will fail."
- Documented operational warning: "**Untick 'Use multiple threads'** in Project Settings (Advanced) Editor>>Import. Otherwise — if you have more than one Tiled map — Godot may freeze (+crash) during import."
- **MIT licence**, "Copyright (c) 2023-2026 Roland Helmerichs" — [LICENSE](https://raw.githubusercontent.com/Kiamo2/YATI/main/LICENSE).

**On the old `vnen/godot-tiled-importer`:** the Tiled docs still list a "Godot Tiled importer (Mono version)" that "imports Tiled maps exported to JSON (.tmj) format" and "supports all map orientations", and separately note that Tiled itself ships a Godot-4 `.tscn` exporter ([Tiled libraries page](https://doc.mapeditor.org/en/stable/reference/support-for-tmx-maps/)). **UNVERIFIED:** I could not retrieve the vnen repository page in this pass (GitHub rate-limited the API and HTML fetches were unavailable), so I cannot state its last-commit date, archived status, or whether it is formally deprecated. What *is* verified is that Tiled's maintainer now directs users to YATI instead.

---

### 3.5 Phaser 3/4 isometric plugin state

| Package | Version | Published | Licence | Status |
|---|---|---|---|---|
| `phaser3-plugin-isometric` (npm) | **0.0.7** | **2018-12-12** | MIT | Effectively dormant — ~8 years without a release as of 2026-09 ([npm registry](https://registry.npmjs.org/phaser3-plugin-isometric)) |
| `gnunua/phaser3-plugin-isometric` (GitHub fork) | — | — | inherits | The maintainer describes it plainly: "This is a **WIP** fork of `lewster32/phaser-plugin-isometric` to make it work with Phaser 3." Feature parity is partial: 3D AABB physics is "**Working, but needs refactoring!**" and debug utilities are "**Not working yet!**" ([README](https://raw.githubusercontent.com/gnunua/phaser3-plugin-isometric/master/README.md)) |
| `phaser-ldtk-importer` | **0.0.0** | 2024-04-09 | — | A `0.0.0` version number is a strong signal of an unpublished scaffold ([npm search index](https://registry.npmjs.org/-/v1/search?text=ldtk)) |

The fork's capability note is the useful part for a 2.5D decision: it exposes `scene.isometric.projectionAngle` for "classic 2:1 pixel dimetric, true 120° isometric or any angle you like", and adds `scene.add.isoSprite` factory methods — i.e. it is an *axonometric sprite* plugin, not a tilemap renderer ([README](https://raw.githubusercontent.com/gnunua/phaser3-plugin-isometric/master/README.md)).

`JUDGMENT:` **Do not plan on the Phaser isometric plugin.** A 2018 npm release plus a self-declared WIP fork with broken debug tooling is not a foundation for a multi-city product. The viable isometric options in the JS stack are (i) Phaser 4's classic `TilemapLayer` with isometric map data, accepting the non-GPU path, or (ii) a hand-written projection on top of `@pixi/tilemap`-style sprite blitting.

---

### 3.6 PixiJS isometric approaches

Three composable pieces, none of which is an isometric renderer:

1. **`@pixi/tilemap` v5.0.2** — "a low-level **rectangular** tilemap implementation, optimized for high performance rendering", with a version map pairing v5.x to PixiJS v8. Demos exist for **WebGL and WebGPU**; settings note a "limitation on 16k tiles per one tilemap", liftable with `settings.use32bitIndex = true` on PixiJS v5.1.0+. — [README](https://raw.githubusercontent.com/pixijs/tilemap/main/README.md).
2. **`pixi-viewport` v6.0.3** — the pan/zoom/follow camera: "dragging, pinch-to-zoom, mouse wheel zooming, decelerated dragging, follow target, animate, snap to point, snap to zoom, clamping, bouncing on edges, and move on mouse edges". "v6.0.0 Moves pixi-viewport to **pixi.js v8+**." — [README](https://raw.githubusercontent.com/davidfig/pixi-viewport/master/README.md).
3. **Depth sorting** — PixiJS's `sortableChildren` + per-object `zIndex` is the standard mechanism for painter's-algorithm ordering. **UNVERIFIED:** I did not retrieve a first-party PixiJS doc page stating the isometric depth-sort recipe in this pass; treat `sortableChildren`/`zIndex` as the known-good mechanism but confirm against current PixiJS v8 docs before relying on it.

`JUDGMENT:` The PixiJS isometric path is "assemble it yourself": rectangular tilemap + camera + your own projection maths + your own sort key. That is genuinely not much code for a 2:1 dimetric grid, but it is code the team owns forever, with no upstream to fix it.

---

### 3.7 Open-licence tileset packs relevant to modern cities, interiors, transit and landmarks

**Commercial-safety summary: safe / conditional / NOT safe.**

| Pack / creator | Content relevant here | Tile size | Price (USD) | Licence terms as published | Commercial? | AI-reference usable? |
|---|---|---|---|---|---|---|
| **Kenney — 2D** (e.g. *Isometric Miniature Dungeon*, 70 files, CC0, released 2019) | Modular 2D isometric pieces; general-purpose | — | Free; *All-in-1* bundle **$19.95 or more** for **60,000+ assets** | "all game assets on the asset pages are public domain licensed (**CC0**). You're free to use them, even in commercial projects"; "**Attribution is not required**"; do not use the Kenney logo — [kenney.nl/support](https://kenney.nl/support). Bundle page states "Asset license **Creative Commons Zero v1.0 Universal**" and, notably, "**Content: No generative AI was used**" — [kenney.itch.io](https://kenney.itch.io/kenney-game-assets) | ✅ **Yes** | ✅ Yes (CC0) |
| **Kenney — 3D City kits** (*City Kit (Commercial)* 50 files; also Suburban, Roads, Industrial) | Modular 3D city blocks — the most likely 3D-kit starting point | n/a | Free; in the All-in-1 bundle | "License **Creative Commons CC0**"; releases 1.0 (2021), 2.0 "Completely remade", 2.1 "Fixed problem skyscraper E" — [kenney.nl](https://kenney.nl/assets/city-kit-commercial) | ✅ **Yes** | ✅ Yes |
| **LimeZu — Modern Interiors** | Interiors across 30+ archetypes incl. **japanese house**, museum, grocery, hospital, clothing store; 2D **and** 3D walls; 100+ animated objects; character generator (100+ outfits, 200 hairstyles, 80 accessories, 9 skin colours) | **16×16, 32×32, 48×48** | Complete version licence "paying at least **1.50$**"; page also offers "this asset pack and 2 more for **$5.00 USD**" (Fall Sale 2026) | "YOU CAN: Edit and use the asset in any commercial or non commercial project… YOU CAN'T: Resell or distribute the asset to others; Edit and resell the asset to others. **Credits required**" — [limezu.itch.io/moderninteriors](https://limezu.itch.io/moderninteriors) | ✅ Yes, **with mandatory credit** | **UNVERIFIED** — no AI-training clause was visible in the retrieved text, but the full `.txt` licence file was not retrievable; obtain it before using the art as AI reference |
| **LimeZu — Modern Exteriors** | "**Streets, buildings and each little detail you need for your cities**"; **animated vehicles from cars to trucks**; autotiles for Godot and GameMaker | **16×16, 32×32, 48×48** | **$5.00** list, **$2.50** at 50% off | Same wording as above: commercial OK, no resale, "**Credits required**" — [limezu.itch.io/modernexteriors](https://limezu.itch.io/modernexteriors) | ✅ Yes, **with mandatory credit** | **UNVERIFIED** (same caveat) |
| **Cup Nooble — Sprout Lands** | Pastel 16-bit farming pack (plants, animals, tools); NOT city/transit | — | Premium from **$3.99**; free basic pack | **Two different licences.** Premium: "can be used in any commercial or non-commercial project… can't be resold or redistributed". **Free version: "can be used in any non-commercial project… can't be used in any commercial project"** — [cupnooble.itch.io](https://cupnooble.itch.io/sprout-lands-asset-pack) | ⚠️ **Premium yes; FREE VERSION IS NON-COMMERCIAL ONLY — do not ship it** | **UNVERIFIED** |
| **shubibubi — Cozy People** | Layered character sprites (5 skin tones, 13 hairstyles × 14 colours, clothing × 10 colours), 15 speech/thought bubbles | Sprites **20×16**, layout cell **32×32** | Name-your-own-price; "this asset pack and 6 more for **$20.00 USD**" (all things cozy bundle) | Licence text not captured in the retrieved page body — **UNVERIFIED: the exact commercial/AI terms were not retrievable** | **UNVERIFIED** | **UNVERIFIED** |
| **CraftPix** | Store-wide library incl. tilesets, characters, GUI, backgrounds | varies | subscription / per-asset | Premium: "You can use, copy, adapt, modify, prepare derivative works"; "You can use each product in **unlimited number of free and commercial projects**"; "**Without Royalty Fee**"; after subscription ends "you can continue to use all the downloaded game assets". Forbidden: reselling source files "or slightly modified version of the art", and redistribution "in a manner that would make some or all of the art files useable to another end user via the app" — [craftpix.net/file-licenses](https://craftpix.net/file-licenses/) | ✅ Yes | **UNVERIFIED** |
| **OpenGameArt (OGA)** | Mixed; licence varies per asset | varies | Free | "**Yes, you can use any of the art submitted to this site. Even in commercial projects.** Just be sure to adhere to the license terms." Multi-licensed assets: the site documents how to read multiple licences on one submission — [opengameart.org/content/faq](https://opengameart.org/content/faq) | ✅ per-asset licence | Depends on the per-asset licence |
| **Unity Asset Store — *The Japan Collection: Japanese City (Free Version)*** by GK Gutty Kreum | Japanese-city pixel-art tileset, tagged `city pack`, `pixel-art`, `road`, `japanese`, `free`, `Tilemap`, `Environment`, `Modular` | — | **FREE** | "License agreement **Standard Unity Asset Store EULA**"; "License type **Extension Asset**"; file size 252.1 KB; latest version **1.0**, latest release date **Mar 20, 2024**; original Unity version 2021.3.2; 786 favourites — [assetstore.unity.com](https://assetstore.unity.com/packages/2d/environments/the-japan-collection-japanese-city-free-version-278915) | ⚠️ **Conditional** — the Unity Asset Store EULA governs, **not** a CC licence; "Extension Asset" restricts use to projects built with Unity. **Verify before assuming it can ship in a browser/Phaser build** | **UNVERIFIED** |
| **GameDev Market — *The Japan Collection: Osaka City*** by GuttyKreum, and *The Complete Japan Collection Bundle* | The commercial Japanese-city packs — the single most on-target paid asset class for this project | — | **UNVERIFIED: price not retrievable** | **UNVERIFIED: licence terms not retrievable** | **UNVERIFIED** | **UNVERIFIED** |
| **GameDev Market — *The Japan Collection: Japanese City (Free Version)*** | Free counterpart of the above | — | Free | **UNVERIFIED** | **UNVERIFIED** | **UNVERIFIED** |

**Retrieval failure — stated exactly:** `gamedevmarket.net` returned **HTTP 403 Forbidden** to both `Invoke-WebRequest` with a browser User-Agent and to `curl.exe`, and its mirror `gms.purwana.net` returned a Cloudflare interstitial. `itch.io` store-**listing** pages (`/game-assets/...`) also returned **403**, though individual `*.itch.io` product pages rendered fine. I therefore **cannot state the Osaka City price, the Complete Japan Collection Bundle price, or either one's licence terms.** Confirm these manually before they enter a budget. The product URLs found in search are: [Osaka City](https://gamedevmarket.net/asset/osaka-city-game-assets), [Complete Japan Collection Bundle](https://gamedevmarket.net/asset/the-complete-japan-collection-bundle), [Japanese City free version](https://www.gamedevmarket.net/asset/the-japan-collection-japanese-city-free-version), [Dotonbori City](https://www.gamedevmarket.net/asset/dotonbori-city-game-assets).

**Humble Bundle asset bundles:** **UNVERIFIED** — I did not retrieve a current Humble Bundle asset bundle in this pass and will not describe one.

#### 3.7.1 "No AI training" clauses — what actually exists

This matters for this project because the reboot plan contemplates using licensed art as **AI reference**, which a no-AI-training clause would prohibit.

- **A real, published example of such a clause**, in itch.io's own blog: *General Paid Asset License* (published 2025-04-21 by Yutami), which states: "The assets **may not be used to train, fine-tune, evaluate, or otherwise contribute to artificial intelligence systems, machine learning models, or datasets, including large language models (LLMs).**" The same licence also bans blockchain/NFT use and "incorporat[ing] into software, services, or systems that automatically generate or distribute derivative assets". — [itch.io blog](https://itch.io/blog/929708/general-paid-asset-license). **Important precision: this is an artist-authored licence published as a blog post on itch.io, not itch.io's platform-wide EULA.** itch.io as a platform lets each creator set terms.
- **On the 3D marketplaces the restriction is a first-class flag.** Epic's Fab defines a **`NoAI` meta tag** meaning "an asset must not be used for generative AI data collection". Critically for licence planning: "NoAI meta tags **might not be compatible with Creative Commons licenses**. This means that you **cannot offer an asset with the NoAI meta tag under the Creative Commons Attribution license**. In order to be able to use the NoAI tag you must offer the asset under the **Standard** license." — [Fab: Licenses and Pricing](https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab).
- **Kenney's bundle is the opposite case and is explicit:** "**Content: No generative AI was used**" ([kenney.itch.io](https://kenney.itch.io/kenney-game-assets)) — a provenance claim, not a usage restriction.

`JUDGMENT:` **Treat "may I use this art as AI reference / in a training set?" as a separate question from "may I ship this art?"** They are governed by different clauses, and the free/most-attractive tiers are the ones most likely to carry an AI restriction. Get the actual `.txt` licence file for LimeZu and shubibubi before either is used as reference material.

---

### 3.8 3D-model-driven 2.5D as the alternative

#### 3.8.1 Sketchfab → Fab: what actually happened

- **Fab launched in October 2024** "as the unified replacement for the **Unreal Marketplace, Quixel Bridge, Sketchfab's commercial offering, and what remained of ArtStation Marketplace**. It consolidated four catalogs, four seller tools, and four payout systems into a single storefront." — [StraySpark, "Fab Marketplace: A 12-Month Retrospective from a Seller", 17 Apr 2026](https://www.strayspark.studio/blog/fab-marketplace-12-month-retrospective-seller-2026). The October launch window is corroborated by Epic's own blog title, "Fab content marketplace launches in October — publishing portal opens today" ([unrealengine.com](https://www.unrealengine.com/en-US/blog/fab-content-marketplace-launches-in-october-publishing-portal-opens-today)) — **note: that page returned HTTP 403 to automated retrieval, so I am citing its title as it appeared in search results, not its body.**
- Scale after one year: "Per **Epic's own 2025 year-in-review**, the live listing count **tripled over the course of 2025 to more than 420,000**, and the publisher count **doubled to over 20,000**." — [StraySpark](https://www.strayspark.studio/blog/fab-marketplace-12-month-retrospective-seller-2026).
- Sketchfab's migration mechanics: the primary announcement is *"Fab Publishing Portal Open for Sketchfab Migration"* ([sketchfab.com](https://sketchfab.com/blogs/community/fab-publishing-portal-open-for-sketchfab-migration/)) and the follow-up *"Sketchfab Update: What You Need To Know Now That Fab's Live"* ([blog.sketchfab.com](https://blog.sketchfab.com/blogs/community/sketchfab-update-what-you-need-to-know-now-that-fabs-live/)). **UNVERIFIED: both pages returned empty bodies to every retrieval method I tried (JS-rendered, and `curl` yielded nothing). I therefore cannot state the exact store-closure date, nor whether free CC-licensed Sketchfab downloads remain available post-migration, from a fetched source.**
- **Fab's licence tiers — verified:**
  - Licence types offered: **"Creative Commons Attribution (CC-BY) (Free)"** and **"Standard (Free or For Sale)"**.
  - The Standard licence has two price tiers, **Personal** and **Professional**, and "Publishers **must** offer their products under the Personal tier and the Professional tier."
  - The buyer's tier is determined by revenue: **Personal** = "buyers who have **not** generated more than **$100,000 USD** in gross revenue from commercial activity in the last 12 months"; **Professional** = "buyers who have generated **more than $100,000 USD**".
  - Personal may include a **Reference Only** version for UEFN content.
  - Legacy Unreal Engine Marketplace licences are being phased out — products migrated from UE Marketplace may be temporarily offered under the legacy licence until the publisher updates them; **new products cannot be published under it.**
  - Publisher prices are set in USD from a preset ladder ($1 increments to $100; $5 increments $100–150; $10 to $250; $25 to $500; $100 to $1,500), all ending in `.99`.
  - Source: [Fab: Licenses and Pricing](https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab).
- **AI-content labelling on Fab:** an asset generated purely from prompts **is allowed**, "provided they carry Fab's mandatory **'Created with AI'** label" — [StraySpark, correction dated 25 Sep 2026](https://www.strayspark.studio/blog/fab-marketplace-12-month-retrospective-seller-2026).

#### 3.8.2 CC0 / free 3D sources

| Source | Relevant content | Price | Licence (as published) | Notes |
|---|---|---|---|---|
| **Kenney 3D kits** | *City Kit (Commercial)* 50 files, plus Suburban / Roads / Industrial | Free; All-in-1 $19.95+ | **CC0** | [kenney.nl/assets/city-kit-commercial](https://kenney.nl/assets/city-kit-commercial) |
| **Quaternius** | **Downtown City MegaKit — 315 models, "over 300 modular environment pieces for building full Boston/NYC style city blocks"**, with "Unity, Godot and Unreal projects with an efficient fake window interior shader, vertex color controlled wear, fake normal bevels and custom simple collisions", May 2026. Also a **Modular Train Pack**, **Cars Pack**, **Cyberpunk Game Kit** | Free download; **Source kits via Patreon** — Silver $10 → 1 credit, Gold $20 → 2, Diamond $50 → 5 | Pack page states "**License CC0**". The site-wide licence page now states the **Quaternius Asset License (QAL) v1.0, last updated 8/28/2026**: "You can use these assets, free of charge, in personal, educational, and commercial games and other projects, **with no credit required**. You just can't resell or redistribute the assets themselves as assets." | ⚠️ **Two licence texts coexist** — pack pages say CC0, the site licence page says QAL v1.0. [quaternius.com/packs/downtowncitymegakit.html](https://quaternius.com/packs/downtowncitymegakit.html), [quaternius.com/license.html](https://quaternius.com/license.html) |
| **KayKit (Kay Lousberg)** | Low-poly packs: *Medieval Hexagon Pack* ("200+ stylised low-poly medieval hexagonal tiles, buildings, and props"), Furniture Bits, Restaurant Bits, character animation libraries; single 1024×1024 gradient atlas downsamplable to 128×128; `.FBX`/`.GLTF` | **The Complete KayKit $150** ("all current and future KayKit assets"); bundles **$19.95**; character packs **$19.99** | **CC0 1.0 Universal** — repo README: "**Free for personal and commercial use, no attribution required. (CC0 Licensed)**" | [README](https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/README.md), [kaylousberg.itch.io](https://kaylousberg.itch.io/) |
| **poly.pizza** | "**10,700+ free models**" — characters, guns, cars, trees, buildings, rooms, rocks; free asset packs; has an API | Free | **UNVERIFIED: I retrieved the homepage but not its licence page**, so I cannot state per-model licence terms | [poly.pizza](https://poly.pizza/) |
| **Google Poly** | **Shut down.** Google announced it on 2020-12-02: uploads stopped **2021-04-30**, and "on **June 30, 2021**, the Poly website will be shutting down… After June 30, `poly.google.com` and associated APIs will no longer be accessible." | — | — | [9to5Google, 2 Dec 2020](https://9to5google.com/2020/12/02/google-poly-shutdown/). The same article notes Sketchfab's CEO publicly offered former Poly users a home; given §3.8.1, that route now runs through Fab |

#### 3.8.3 "3D kit + orthographic camera reads as 2.5D" vs hand-drawn tiles

`JUDGMENT:` — this comparison is my reasoning anchored on the verified prices above; **I found no developer-published hours-per-asset figure for the 3D-kit route**, and I am not going to invent one.

| Dimension | 3D kit + orthographic camera | Hand-drawn 2D tileset |
|---|---|---|
| **Up-front cost** | **$0–150.** Quaternius Downtown City MegaKit is free (CC0/QAL), Kenney 3D city kits are free (CC0), KayKit Complete is **$150** and its individual packs $19.95–19.99. The paid tier buys source files, shaders and better modularity, not the right to ship | **$0–hundreds.** Kenney's 60,000-asset CC0 bundle is **$19.95**; LimeZu Modern Exteriors is **$2.50–5.00**; the commercial Japanese-city class is unpriced here (GDM 403) |
| **Marginal cost of a new city** | Very low **if the kit is modular in the right way**: swap facade/roof/sign modules and the palette. Quaternius' kit was explicitly built to produce "full Boston/NYC style city blocks" from 300+ modules, and shares "optimized texture sets" | Very low **if the vocabulary is shared**: palette + signage + 6–10 props. Very high if each city needs new hand-drawn art |
| **Where the real cost lands** | **Tooling and skill, not assets.** You must own: orthographic camera setup, sprite/facing conventions, a render-to-sprite or live-3D pipeline, lighting that survives the ortho projection, and a decision about whether you render once to PNGs or render at runtime | **Drawing hours.** Anchored by the 126-layer building at **~70 h** ([Jettelly](https://jettelly.com/blog/how-this-developer-built-a-126-layer-isometric-asset-for-unity)) and the isometric 2–3× multiplier ([StopGame](https://stopgame.ru/blogs/topic/118292/nikogda_ne_delay_pixel_art_igru_v_izometrii_mini_painter_devlog_1)) |
| **Licence risk** | **Lowest available.** CC0 is irrevocable and imposes no attribution, no revenue threshold and no no-AI clause. Kenney's CC0 covers 2D *and* 3D; KayKit is CC0; Quaternius is CC0/QAL-without-attribution | Higher. LimeZu requires **mandatory credit**; Cup Nooble's free tier is **non-commercial only**; the Unity Asset Store Japan Collection is bound by the **Unity EULA and an "Extension Asset" licence type**; itch.io creator licences may carry AI-training bans |
| **Distinctiveness of "Tokyo vs Osaka vs Seoul"** | Harder. A Western-authored modular kit (*"Boston/NYC style city blocks"*) has to be re-dressed heavily to read as Japan; signage and facade modules are the work | Easier and more direct, because the Japanese-city asset class exists — but see §3.7 for the retrieval gap on its licences |
| **Web-build fit** | Requires the renderer to draw 3D. If the project stays on Phaser 4, this is a poor fit: the modern Phaser line is a 2D renderer, and the project's prior recon records that Phaser 4 removed `Mesh`, `Plane`, `Camera3D` and `Layer3D` | Fits the existing renderer directly |

`JUDGMENT:` **Recommendation: use CC0 3D kits as the greybox and lighting-reference layer, but ship 2D.** The 3D route's licence profile is the best in this entire report (CC0 across Kenney, KayKit and Quaternius, with no revenue threshold and no AI clause), and it is the fastest way to a believable test city — but adopting it as the *shipping* pipeline means betting the visual identity on a Western modular kit being convincingly re-dressed as Japan, and it collides with the Phaser 4 renderer the project already chose. The strongest concrete use of 3D here is the same trick Nintendo used in *A Link Between Worlds*: build in 3D, tilt the camera until it reads as top-down, and **bake the result to 2D sprites**. That buys the 3D kit's CC0 licence and modularity without inheriting a 3D runtime.

---

### 3.9 AI image generation for tile art, 2025–2026

#### 3.9.1 Licence tiers — what is verified

| Tool / model | Licence | Commercial status for this project | Source |
|---|---|---|---|
| **FLUX.1 [dev] and the FLUX [dev] family** (incl. `FLUX.1 Fill [dev]`, `Depth`, `Canny`, `Redux`, `Kontext [dev]`, `Krea [dev]`, and `FLUX.2 [dev]`) | **FLUX [dev] Non-Commercial License v2.0 — "Last Revised on November 25, 2025"** | ❌ **Blocked for a commercial game.** The licence grants use "freely available for your **non-commercial and non-production** use". "Non-Commercial Purpose" is defined to exclude, "for clarity", use "(a) for **revenue-generating activity**, (b) in direct interactions with or that **has impact on end users**, or (c) to train, fine tune, or distill other models for commercial use". A shipped game is (a) and (b). Note that "**Outputs are not considered Derivatives**" — so the restriction bites on *use*, not on owning the image | [bfl.ai/legal/non-commercial-license-terms](https://bfl.ai/legal/non-commercial-license-terms) |
| **Stable Diffusion / SDXL — Stability AI Community License** | **Stability AI Community License Agreement, Last Updated: July 5, 2024** | ✅ **Usable at this project's scale.** "This Agreement is intended to allow research, non-commercial, and limited commercial uses of the Models free of charge. In order to ensure that certain limited commercial uses of the Models continue to be allowed, this Agreement **preserves free access to the Models for people or organizations generating annual revenue of less than US $1,000,000** (or local currency equivalent)." Above that threshold a paid licence is required | [stability.ai/community-license-agreement](https://stability.ai/community-license-agreement) |
| **SDXL base 1.0 weights specifically** | The Hugging Face model card is labelled **"License: CreativeML Open RAIL++-M License"** (`openrail++`) | ⚠️ Note the **dual-labelling hazard**: the *weights card* says Open RAIL++-M while *Stability's own site* states the Community License. Confirm which governs the specific checkpoint and version you download before shipping | [huggingface.co/stabilityai/stable-diffusion-xl-base-1.0](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) |
| **Adobe Firefly** | **UNVERIFIED.** Adobe's own wording on commercial safety **and on IP indemnification** could not be retrieved: `adobe.com/legal/licenses-terms/adobe-gen-ai-user-guidelines.html`, `business.adobe.com/products/firefly/enterprise.html`, `business.adobe.com/products/firefly-business/firefly-ai-approach.html`, `helpx.adobe.com/.../adobe-firefly-faq.html` all either **timed out at 45–60 s or returned HTTP 403**, and the enterprise legal FAQ PDF (`adobe.com/cc-shared/assets/pdf/enterprise/firefly-legal-faqs-enterprise-customers-2024-06-11.pdf`) and the **"PSLT – Adobe Firefly Supplemental Coverage (2024v1)"** PDF (`adobe.com/content/dam/cc/en/legal/terms/enterprise/pdfs/PSLT-AdobeFireflySupplementalCoverage_2024v1.pdf`) both timed out. **I cannot state Adobe's indemnification scope, whether it is enterprise-only, or its exact wording.** The existence and title of the *Supplemental Coverage* PDF were confirmed only via search results | — |
| **Scenario** | Published tiers: **Starter $15/mo** (1,500 credits), **Pro $45/mo** (5,000 credits), **Teams $75/mo** (10,000 credits, up to 25 users), **Enterprise** custom (min 10 users, annual). Annual billing is **33% cheaper**. Free tier = **50 daily credits, no credit card**. Includes "Train custom models", "65+ core AI models" (Starter) / "30+ advanced models" (Pro), private generations | ✅ Commercial-grade tooling; **the published pricing page did not state output ownership/rights terms — UNVERIFIED on rights** | [scenario.com/pricing](https://www.scenario.com/pricing) |
| **Layer.ai** | Usage-based ("usage-based AI for game studios"); features include custom model training on your own art style, Reference Sets, MCP/CLI/API access, 3D generation, Audio via ElevenLabs, QA scoring, and "**300+** [models] across image, video, 3D and audio" | **UNVERIFIED on price and on rights.** The marketing pricing page shows no USD figures, and the help-centre article *"Guide to Layer's Subscriptions & Pricing"* returned only its navigation chrome to automated retrieval | [layer.ai/pricing](https://www.layer.ai/pricing), [help.layer.ai pricing guide](https://help.layer.ai/en/articles/12037310-guide-to-layer-s-subscriptions-pricing) |
| **Rosebud AI** | **UNVERIFIED** — not researched in this pass | — | — |

#### 3.9.2 Practical limits of diffusion for tileable, consistent, modular tilesets

`JUDGMENT:` — the four failure modes below are my synthesis from the licence/pipeline evidence above and from the tile-production facts in §1.3. **I did not retrieve a peer-reviewed or vendor-primary source quantifying diffusion's tiling failure rate, so the mechanisms are stated as reasoning, not as measured results.**

1. **Seamless tiling requires wraparound-edge control that text-to-image sampling does not provide natively.** A tile must match its own opposite edge; a diffusion sampler optimising for a plausible whole image has no such constraint. The workable countermeasures are offset-and-inpaint passes and dedicated seamless-tile workflows (tile-aware samplers / ControlNet-tile conditioning / a LoRA trained on seamless tiles) — all of which are *pipeline* work, i.e. the same class of cost that killed family (d) for a small team.
2. **Cross-asset consistency is the real blocker for a modular kit.** A tileset is not N good images; it is N mutually-compatible images. Modular walls must share a pixel grid, a light direction, an outline weight and a palette ramp. LimeZu's packs achieve this because *one person* drew ~2,000 hours of them; Scenario and Layer both sell **custom-model training on your own art style** as the fix ([scenario.com](https://www.scenario.com/pricing), [layer.ai](https://www.layer.ai/pricing)) — which is an admission that base models do not hold a style across a set.
3. **Pixel-grid fidelity is a distinct problem from image quality.** Sub-pixel drift, anti-aliased edges and non-integer feature sizes all break a 16×16 or 32×32 grid. Cleaning that up by hand is exactly the "human cleanup" line in the cost table below, and it does not amortise: it recurs per asset.
4. **Licence provenance on the output side is unresolved.** Fab requires a **"Created with AI"** label on purely prompt-generated assets ([StraySpark, 25 Sep 2026 correction](https://www.strayspark.studio/blog/fab-marketplace-12-month-retrospective-seller-2026)); itch.io creator licences may forbid using their art *as reference at all* (§3.7.1); and FLUX [dev]'s licence forbids end-user-facing commercial use outright (§3.9.1). Any AI-assisted pipeline therefore needs a **per-tool, per-output record** of which model produced which file — which is the same discipline the project's fact-layer already demands for city data.

`JUDGMENT:` **Where AI genuinely helps this project:** concepting and palette exploration; generating **signage and typography** variants (the highest-value per-city differentiator and the least served by generic packs); generating **material/reference sheets** for a human tile artist; and producing **placeholder** art that is explicitly never shipped. Where it does not help: producing a coherent, tileable, grid-aligned tileset for a city.

---

### 3.10 JUDGMENT cost table — four ways to get one city's art

> **These are my estimates, not quoted prices.** Each is anchored on the verified figures cited in this section and is deliberately expressed as a range with the anchor named. They assume **one city**, top-down/3-4 layered art (family (b)), a **shared tile vocabulary across cities**, and the per-city deliverable being a *style kit* rather than a full tileset.

| Route | Rough USD for **one city** | What it buys | Anchors and assumptions |
|---|---|---|---|
| **(i) Original hand-drawn tileset for one city** | **$1,500 – $8,000** | A bespoke tileset + props + signage that only this city has | Anchored on the mid/professional marketplace ranges — small tileset **$50–400**, single scene **$80–500**, 4-directional walk cycle **$40–200** ([163.com rate roundup](https://www.163.com/dy/article/L0H298GJ0526K8VB.html)) — and on **animation ≈ 3–5× static** plus a **~2× commercial-licence multiplier**. Assumes ~8–15 scene/prop batches at mid rates **plus** the commercial multiplier and one animation set. `JUDGMENT:` the top of the range is reached as soon as you commission hero landmarks: the only verified hero datapoint is **~70 hours for one 126-layer isometric building** ([Jettelly](https://jettelly.com/blog/how-this-developer-built-a-126-layer-isometric-asset-for-unity)), which at the **$15–40/hr** Upwork mid-level band in the same rate roundup is **$1,050–2,800 for that single building** |
| **(ii) Licensed modular kit reuse** | **$20 – $250** | The right to ship a professional modular kit and re-dress it per city | Anchored on **verified** prices only: **$19.95** for Kenney All-in-1 with 60,000+ CC0 assets ([kenney.itch.io](https://kenney.itch.io/kenney-game-assets)); **$2.50–5.00** for LimeZu Modern Exteriors, **≥$1.50** for Modern Interiors ([LimeZu ME](https://limezu.itch.io/modernexteriors), [LimeZu MI](https://limezu.itch.io/moderninteriors)); **$3.99+** Cup Nooble Premium ([Cup Nooble](https://cupnooble.itch.io/sprout-lands-asset-pack)); **$150** KayKit Complete ([kaylousberg.itch.io](https://kaylousberg.itch.io/)); Quaternius and Kenney 3D kits **free**. Range covers 1–3 paid packs. **Excludes** the unpriced Japanese-city class (GDM 403) and **excludes any art hours** |
| **(iii) 3D kit + orthographic render** | **$0 – $400** direct + **a large un-priced tooling cost** | CC0/CC0-equivalent 3D city modules, rendered from an ortho camera to sprites or drawn live | Direct cost anchored on **$0** for Kenney 3D city kits and Quaternius Downtown City MegaKit (**315 models, CC0**), and **$0–150** for KayKit ([kenney.nl](https://kenney.nl/assets/city-kit-commercial), [quaternius.com](https://quaternius.com/packs/downtowncitymegakit.html), [kaylousberg.itch.io](https://kaylousberg.itch.io/)). **The real cost is engineering, not purchase:** camera/projection setup, sprite-facing conventions, lighting survival under ortho, and a bake-or-runtime-render decision. **I have no verified hour figure for this and will not invent one** |
| **(iv) AI-generated + human cleanup** | **$45 – $300** in subscriptions, **plus unbounded cleanup hours** | Concept/palette/signage iteration, reference sheets, and *some* shippable props | Subscription side is **verified**: Scenario **$15–75/mo** ([scenario.com](https://www.scenario.com/pricing)); Stability Community Licence is **free below $1M annual revenue** ([stability.ai](https://stability.ai/community-license-agreement)). **FLUX [dev] must be excluded — its licence forbids revenue-generating and end-user-facing use** ([bfl.ai](https://bfl.ai/legal/non-commercial-license-terms)). The 1.3.3 roundup cites AI-assisted simple props at **$0.5–2 per item** ([163.com](https://www.163.com/dy/article/L0H298GJ0526K8VB.html)). **`JUDGMENT:` the cleanup line is where this route fails** — grid alignment, edge wraparound and cross-asset consistency are per-asset manual work, and Layer/Scenario both sell custom style training precisely because base models do not hold a kit together |

`JUDGMENT:` **Ranked by cost-effectiveness for this project, given "many distinct foreign-city locations":**

1. **(ii) Licensed modular kit + per-city style kit.** ~$20–250 buys a shipping-legal base. It is the only route whose cost does not scale with city count.
2. **(iii) CC0 3D kit, baked to 2D.** Free assets, the cleanest licence profile in this report, and a genuine differentiator if the team can afford the tooling — but it is an engineering project first.
3. **(iv) AI for signage, palette and reference only — never for the shipped tileset.**
4. **(i) Original hand-drawn tileset.** Reserve it for the 3–5 hero locations that carry the product's identity, not for the general city vocabulary.

**The one-line risk:** the asset class this project most needs — Japanese city streets, stations and interiors — is both the class with the **least retrievable licence and price information** in this pass (GameDev Market returned 403 to every method) and the class most likely to carry a **mandatory-credit or no-AI clause** (LimeZu requires credit; itch.io creator licences can ban AI use entirely). Resolve both before any art budget is committed.

---

## Sources

**Tooling — Tiled**
- [Tiled Releases API (v1.12.2 / 1.12.1 / 1.12.0 / 1.11.2 / 1.11.0 with dates)](https://api.github.com/repos/mapeditor/tiled/releases)
- [Tiled LICENSE.GPL (GPL-2.0)](https://raw.githubusercontent.com/mapeditor/tiled/master/LICENSE.GPL)
- [Tiled LICENSE.BSD](https://raw.githubusercontent.com/mapeditor/tiled/master/LICENSE.BSD)
- [Tiled JSON Map Format — orientation enum](https://doc.mapeditor.org/en/stable/reference/json-map-format/)
- [Tiled — Libraries and Frameworks / support for TMX maps](https://doc.mapeditor.org/en/stable/reference/support-for-tmx-maps/)
- [Tiled PR #4621 — "docs: Point to YATI and ue5-tiled-importer", merged 2026-09-25](https://github.com/mapeditor/tiled/pull/4621)
- [Tiled documentation home (stable = 1.12.2)](https://doc.mapeditor.org/en/stable/)

**Tooling — LDtk**
- [LDtk Releases API (v1.5.3, 2024-01-15)](https://api.github.com/repos/deepnight/ldtk/releases)
- [ldtk.io — Download ("Latest stable (1.5.3, free)", commercial-use grant)](https://ldtk.io/download/)
- [ldtk.io — Release notes (1.5.4 preview)](https://ldtk.io/release-notes/)
- [LDtk issue #944 — "Feature request: Hex or Isometric tile support" (Closed)](https://github.com/deepnight/ldtk/issues/944)
- [LDtk issue #102 — "Feature request: Hex grids" (Closed, label `wontdo ❌`)](https://github.com/deepnight/ldtk/issues/102)
- [LDtk JSON schema 1.5.3](https://ldtk.io/files/JSON_SCHEMA.json)
- [LDtk docs — Loading LDtk in your game](https://ldtk.io/docs/game-dev/)
- [LDtk docs — Tiled TMX export and its limitations](https://ldtk.io/docs/game-dev/exporting-tiled-tmx/)
- [LDtk README (raw)](https://raw.githubusercontent.com/deepnight/ldtk/master/README.md)

**Tooling — engines and loaders**
- [Phaser 4.2.1 — `skills/tilemaps/SKILL.md` (orientations; TilemapGPULayer ortho-only)](https://unpkg.com/phaser@4.2.1/skills/tilemaps/SKILL.md)
- [Phaser `Tilemaps.Tilemap` API docs (orientation)](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap)
- [Phaser v4.1.0 "Salusa" release notes, 30 April 2026](https://phaser.io/news/2026/04/phaser-4-1-0-salusa-release)
- [npm registry — `phaser`](https://registry.npmjs.org/phaser) · [`pixi.js`](https://registry.npmjs.org/pixi.js) · [`@pixi/tilemap`](https://registry.npmjs.org/@pixi/tilemap) · [`pixi-viewport`](https://registry.npmjs.org/pixi-viewport) · [`phaser3-plugin-isometric`](https://registry.npmjs.org/phaser3-plugin-isometric)
- [npm search index for "ldtk" (pixi-ldtk-loader, @excaliburjs/plugin-ldtk, phaser-ldtk-importer, …)](https://registry.npmjs.org/-/v1/search?text=ldtk)
- [@pixi/tilemap README — "low-level rectangular tilemap"](https://raw.githubusercontent.com/pixijs/tilemap/main/README.md)
- [pixi-viewport README — v6.0.0 → pixi.js v8+](https://raw.githubusercontent.com/davidfig/pixi-viewport/master/README.md)
- [gnunua/phaser3-plugin-isometric README — self-described WIP fork](https://raw.githubusercontent.com/gnunua/phaser3-plugin-isometric/master/README.md)
- [Godot 4 — Using TileSets (rectangular / hexagonal / isometric tile shapes)](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilesets.html)
- [YATI README (v2.2.7; Godot 4.3+; "all map orientations"; multithread warning)](https://raw.githubusercontent.com/Kiamo2/YATI/main/README.md)
- [YATI LICENSE (MIT, 2023-2026 Roland Helmerichs)](https://raw.githubusercontent.com/Kiamo2/YATI/main/LICENSE)
- [Babylon.js forum — "Best way to render tilemaps?"](https://forum.babylonjs.com/t/best-way-to-render-tilemaps/39985)

**Asset packs and marketplaces**
- [Kenney — Support / licence FAQ (CC0, commercial OK, no attribution)](https://kenney.nl/support)
- [Kenney — Isometric Miniature Dungeon (70 files, CC0, 2019)](https://kenney.nl/assets/isometric-miniature-dungeon)
- [Kenney — City Kit (Commercial) (3D, 50 files, CC0)](https://kenney.nl/assets/city-kit-commercial)
- [Kenney Game Assets All-in-1, $19.95 (60,000+ assets, CC0, "No generative AI was used")](https://kenney.itch.io/kenney-game-assets)
- [LimeZu — Modern Interiors (16/32/48; commercial OK; credits required; 2000+ hours)](https://limezu.itch.io/moderninteriors)
- [LimeZu — Modern Exteriors ($5.00 / $2.50; commercial OK; credits required)](https://limezu.itch.io/modernexteriors)
- [Cup Nooble — Sprout Lands (premium $3.99+ commercial; free tier non-commercial only)](https://cupnooble.itch.io/sprout-lands-asset-pack)
- [shubibubi — Cozy People (32×32 layout, 20×16 sprites)](https://shubibubi.itch.io/cozy-people)
- [CraftPix — File Licenses](https://craftpix.net/file-licenses/)
- [OpenGameArt — FAQ ("Even in commercial projects")](https://opengameart.org/content/faq)
- [Unity Asset Store — The Japan Collection: Japanese City (Free Version) by GK Gutty Kreum](https://assetstore.unity.com/packages/2d/environments/the-japan-collection-japanese-city-free-version-278915)
- [itch.io blog — General Paid Asset License (AI-training ban; published 2025-04-21)](https://itch.io/blog/929708/general-paid-asset-license)
- GameDev Market pages (URLs seen in search results; **all returned HTTP 403 and could not be read**): [Osaka City](https://gamedevmarket.net/asset/osaka-city-game-assets) · [Complete Japan Collection Bundle](https://gamedevmarket.net/asset/the-complete-japan-collection-bundle) · [Japanese City (free version)](https://www.gamedevmarket.net/asset/the-japan-collection-japanese-city-free-version) · [Dotonbori City](https://gamedevmarket.net/asset/dotonbori-city-game-assets)

**3D model sources**
- [Fab — Licenses and Pricing (CC-BY vs Standard; Personal/Professional $100k threshold; NoAI tag)](https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab)
- [Epic — "Fab content marketplace launches in October" (title only; page returned 403)](https://www.unrealengine.com/en-US/blog/fab-content-marketplace-launches-in-october-publishing-portal-opens-today)
- [StraySpark — "Fab Marketplace: A 12-Month Retrospective from a Seller", 17 Apr 2026 (corrected 25 Sep 2026)](https://www.strayspark.studio/blog/fab-marketplace-12-month-retrospective-seller-2026)
- [Sketchfab — "Fab Publishing Portal Open for Sketchfab Migration" (body not retrievable)](https://sketchfab.com/blogs/community/fab-publishing-portal-open-for-sketchfab-migration/)
- [Sketchfab — "Sketchfab Update: What You Need To Know Now That Fab's Live" (body not retrievable)](https://blog.sketchfab.com/blogs/community/sketchfab-update-what-you-need-to-know-now-that-fabs-live/)
- [9to5Google — "Google is pulling the plug on 'Poly' … in 2021", 2 Dec 2020](https://9to5google.com/2020/12/02/google-poly-shutdown/)
- [Quaternius — Asset License (QAL) v1.0, last updated 8/28/2026](https://quaternius.com/license.html)
- [Quaternius — Downtown City MegaKit (315 models, CC0, May 2026)](https://quaternius.com/packs/downtowncitymegakit.html)
- [KayKit — Character Pack: Adventurers README (CC0 1.0)](https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/README.md)
- [Kay Lousberg — itch.io catalogue (Complete KayKit $150; packs $19.95–19.99)](https://kaylousberg.itch.io/)
- [Poly Pizza (10,700+ free models)](https://poly.pizza/)

**AI image generation**
- [Black Forest Labs — FLUX [dev] Non-Commercial License v2.0, revised 25 Nov 2025](https://bfl.ai/legal/non-commercial-license-terms)
- [Stability AI — Community License Agreement, updated 5 July 2024 (<$1M revenue free tier)](https://stability.ai/community-license-agreement)
- [Hugging Face — stabilityai/stable-diffusion-xl-base-1.0 (CreativeML Open RAIL++-M)](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0)
- [Scenario — Pricing ($15 / $45 / $75; 50 free daily credits)](https://www.scenario.com/pricing)
- [Layer.ai — Pricing (usage-based; 300+ models)](https://www.layer.ai/pricing)
- [Layer.ai Help Center — Guide to Subscriptions & Pricing (body not retrievable)](https://help.layer.ai/en/articles/12037310-guide-to-layer-s-subscriptions-pricing)
- Adobe Firefly documents that **could not be retrieved** (all timed out or returned 403): [Adobe Gen AI User Guidelines](https://www.adobe.com/legal/licenses-terms/adobe-gen-ai-user-guidelines.html) · [Firefly for Enterprise](https://business.adobe.com/products/firefly/enterprise.html) · [Firefly AI approach](https://business.adobe.com/products/firefly-business/firefly-ai-approach.html) · [Firefly legal FAQs PDF](https://www.adobe.com/cc-shared/assets/pdf/enterprise/firefly-legal-faqs-enterprise-customers-2024-06-11.pdf) · [PSLT Adobe Firefly Supplemental Coverage (2024v1) PDF](https://www.adobe.com/content/dam/cc/en/legal/terms/enterprise/pdfs/PSLT-AdobeFireflySupplementalCoverage_2024v1.pdf)

**Q1 — reference games and art-cost evidence**
- [Wikipedia — Sea of Stars](https://en.wikipedia.org/wiki/Sea_of_Stars) · [Steam — Sea of Stars](https://store.steampowered.com/app/1244090/Sea_of_Stars/)
- [Wikipedia — Live A Live (Unreal Engine 4 remake)](https://en.wikipedia.org/wiki/Live_A_Live)
- [Nintendo Life — "Triangle Strategy Producers Talk HD-2D And Why Other Devs Haven't Used it", 30 May 2022](https://www.nintendolife.com/news/2022/05/triangle-strategy-producers-talk-hd-2d-and-why-other-devs-havent-used-it)
- [Vandal — Spanish report of the same 4Gamer interview, 31 May 2022](https://vandal.elespanol.com/noticia/1350754011/los-productores-de-square-enix-dicen-que-el-hd2d-es-mas-caro-de-lo-que-parece/)
- [The Verge — Square Enix HD-2D explainer](https://www.theverge.com/entertainment/840080/square-enix-hd2d-games-octopath-dragon-quest)
- [Rock Paper Shotgun — "Beyond Infinity: Obsidian on modernising the art of the isometric RPG", 4 Sep 2017](https://www.rockpapershotgun.com/pillars-of-eternity-tyranny-art)
- [Game Developer — "How Obsidian replicated the look of an Infinity Engine game — in 2015", 5 Sep 2017](https://www.gamedeveloper.com/art/how-obsidian-replicated-the-look-of-an-infinity-engine-game----in-2015)
- [Iwata Asks (Nintendo) — The Legend of Zelda: A Link Between Worlds, "Direct Top-down View"](https://iwataasks.nintendo.com/interviews/3ds/a-link-between-worlds/0/3/)
- [Jettelly — "How This Developer Built a 126-Layer Isometric Asset using Unity", 28 Apr 2026](https://jettelly.com/blog/how-this-developer-built-a-126-layer-isometric-asset-for-unity)
- [StopGame — "Никогда не делай pixel art игру в изометрии. Mini Painter Devlog #1", 18 May 2025](https://stopgame.ru/blogs/topic/118292/nikogda_ne_delay_pixel_art_igru_v_izometrii_mini_painter_devlog_1)
- [163.com / 网易号 — pixel-art outsourcing rate roundup citing a July 2025 11-platform survey, 28 Jun 2026](https://www.163.com/dy/article/L0H298GJ0526K8VB.html)
- [Foro3D — Sea of Stars Unity/Aseprite pipeline summary, 1 May 2026](https://foro3d.com/2026/mayo/sea-of-stars-pixel-art-clasico-con-iluminacion-moderna-en-unity.html)
- Wikipedia engine/classification pages: [Stardew Valley](https://en.wikipedia.org/wiki/Stardew_Valley) · [Diablo II](https://en.wikipedia.org/wiki/Diablo_II) · [Baldur's Gate](https://en.wikipedia.org/wiki/Baldur%27s_Gate_(video_game)) · [Pillars of Eternity](https://en.wikipedia.org/wiki/Pillars_of_Eternity) · [Disco Elysium](https://en.wikipedia.org/wiki/Disco_Elysium) · [Final Fantasy VII](https://en.wikipedia.org/wiki/Final_Fantasy_VII) · [Resident Evil (2002)](https://en.wikipedia.org/wiki/Resident_Evil_(2002_video_game)) · [Age of Empires II](https://en.wikipedia.org/wiki/Age_of_Empires_II) · [SimCity 2000](https://en.wikipedia.org/wiki/SimCity_2000) · [RollerCoaster Tycoon](https://en.wikipedia.org/wiki/RollerCoaster_Tycoon_(video_game)) · [Two Point Hospital](https://en.wikipedia.org/wiki/Two_Point_Hospital) · [Graveyard Keeper](https://en.wikipedia.org/wiki/Graveyard_Keeper) · [Coffee Talk](https://en.wikipedia.org/wiki/Coffee_Talk_(video_game)) · [VA-11 HALL-A](https://en.wikipedia.org/wiki/VA-11_HALL-A) · [Neo Cab](https://en.wikipedia.org/wiki/Neo_Cab)
