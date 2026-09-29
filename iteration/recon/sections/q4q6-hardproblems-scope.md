## Q4 — Genuinely hard problems

Research recon for a 2.5D browser travel-simulation reusing the legacy React 18 + Express SPA.
Conventions: every factual claim carries an inline link to a source I actually fetched. `JUDGMENT:` marks my own reasoning. `UNVERIFIED:` marks what I could not confirm.

---

### Q4A. Walkable city areas with many distinct locations

#### The scope-control playbook, with evidence

| Game / studio | Explicit scope-control move | Verifiable source |
|---|---|---|
| Mini Metro (Dinosaur Polo Club, 2 people) | Imposed constraints *before* choosing the concept: no hand-built levels, minimal production art, no audio-dependent concept → forced procedural levels + abstract visuals | [Wikipedia, Mini Metro](https://en.wikipedia.org/wiki/Mini_Metro_(video_game)) — *"They also did not want to hand-build each level in the game"*, and this *"led to them concentrating on concepts that involved procedurally generated levels and abstract visual styles"* |
| A Short Hike (Adam Robinson-Yu, solo) | External 3-month deadline forced a hard core/stretch split; core was deliberately "good", not MVP | [Game Developer, A Short Hike postmortem coverage](https://www.gamedeveloper.com/design/finding-smart-shortcuts-in-a-short-hike-postmortem-unlocking-the-vault-4) — *"It would still be fun and playable if the stretch goals weren't made, but it kind of allowed me to naturally scale the size of the project to the rate at which work was actually being done."* |
| Yakuza / Like a Dragon (RGG Studio) | Reuse one district (Kamurochō) across the whole franchise; density replaces area | [80.lv on the GDC 2025 RGG session](https://80.lv/articles/like-a-dragon-devs-on-the-effective-reuse-of-kamuroch-map-assets) |
| Persona 5 (Atlus) | Only three dungeon *layout* vocabularies, plus a modelled-on-real-Tokyo overworld | [Wikipedia, Persona 5](https://en.wikipedia.org/wiki/Persona_5) — *"Dungeon layout was split into three distinct types: the Tokyo overworld environments, 'institutions' such as Joker's high school, and dungeon environments."* |
| Stardew Valley (ConcernedApe, solo) | One valley, one farm; content depth over map count (see Q4B for the clock) | [Stardew Valley Wiki, Day Cycle](https://stardewvalleywiki.com/Time) |
| GeoGuessr (Anton Wallén) | Zero world-building: the world *is* Google's imagery; whole game built in ~2 weeks | [Wikipedia, GeoGuessr](https://en.wikipedia.org/wiki/GeoGuessr) — *"The game's development took approximately two weeks' work, using Backbone.js and the Google Maps API."* |

#### "One street, not one city" — the Kamurochō case, in the devs' own words

- Kamurochō is *"a fictional district of Tokyo"* from Sega's Yakuza franchise, *"modelled after Kabukichō, Tokyo's renowned red-light district"*, first appearing in [Yakuza (2005)](https://en.wikipedia.org/wiki/Kamurocho).
- It *"has appeared as the primary setting in most Yakuza main series titles and several spin-off games"* ([Wikipedia, Kamurochō](https://en.wikipedia.org/wiki/Kamurocho)). The franchise runs 2005–present and had sold *"a combined total of 27.7 million units"* as of 2024 ([Wikipedia, Yakuza franchise](https://en.wikipedia.org/wiki/Yakuza_(franchise))).
- At GDC 2025, in a session titled *"The Secret to Narrative-Driven and Short-Term Development in Like a Dragon"*, Chief Director Ryosuke Horii and Design Manager Eiji Hamatsu explained the reuse. Hamatsu, on why reusing the same map doesn't read as laziness: *"In Kamurochō, moving across one wall or ascending one flight of stairs can create a completely different scene or experience."* He attributed this to **zakkyo** buildings, *"multi-tenant buildings symbolic of Japanese city centers"*, whose two advantages are *"the visual image of a glamorous entertainment district"* and *"the diversity of experiences that can be obtained from multiple different shops crammed into a limited amount of space"* ([80.lv, 26 March 2025](https://80.lv/articles/like-a-dragon-devs-on-the-effective-reuse-of-kamuroch-map-assets)).

`JUDGMENT:` This is the single most transferable lesson in Q4A. RGG does not buy area; it buys **vertical and interior density per unit of street**. "Moving across one wall or ascending one flight of stairs" is a *tile-vocabulary* statement: the same façade sprite plus a different interior is a new location. For a 2.5D browser game with a shared tile vocabulary and a per-city style kit, the correct unit of content is **the doorway and the interior behind it**, not the city block. A 40 m × 40 m street with 12 enterable interiors beats 12 separate blocks.

#### Single-location and map-as-menu structures

- **80 Days (inkle, 2014)** — iOS 31 July 2014, Android 15 December 2014, Windows/macOS 29 September 2015 ([Wikipedia, 80 Days](https://en.wikipedia.org/wiki/80_Days_(2014_video_game))). The Steam store entry lists the PC release as **28 Sep, 2015** ([Steam appdetails appid 381780](https://store.steampowered.com/api/appdetails?appids=381780&languages=english)). Its awards: *"TIME Magazine Game of the Year 2014, winner of IGF for Excellence in Narrative 2015, four BAFTA nominations in 2015"* ([inkle press kit](https://www.inklestudios.com/press/80days/)). The same press kit advertises a *"massive new content update featuring 30 new cities in the Americas"* — i.e. **a city in 80 Days is a text-and-state node, not a space**. `JUDGMENT:` for this project, modelling cities as *menu-navigable nodes with stateful interiors* is the only structurally honest option for 1–2 people; the 2.5D layer is then a *presentation* of the node, not a navigable world.
- **Shenmue** is the cautionary counter-example: *"Shenmue features a persistent world with detail considered unprecedented for games at the time… Shops open and close, buses run to timetables, and characters have routines, each per the in-game clock."* It nevertheless *"did not recoup its development cost and was a commercial failure"* on 1.2 million sales ([Wikipedia, Shenmue](https://en.wikipedia.org/wiki/Shenmue_(video_game))). The simulation fidelity was real, expensive, and commercially unrewarded.
- **Kind Words (Popcannibal, 2019)** — two people (*"programmer and designer Ziba Scott and artist Luigi Guatieri"*), a single room, first released as a Humble Bundle original ([Wikipedia, Kind Words](https://en.wikipedia.org/wiki/Kind_Words_(video_game))). Zero world geometry; the entire product is one diegetic interface.
- **Coffee Talk (Toge Productions, 2020)** — one café counter. Released 29 January 2020; conceptualised in **2017** at Toge's annual game jam as *Project Green Tea Latte* ([Wikipedia, Coffee Talk](https://en.wikipedia.org/wiki/Coffee_Talk_(video_game))).
- **Neo Cab** (Chance Agency, Steam 3 Oct 2019) and **VA-11 Hall-A** (Sukeban Games, Steam 21 Jun 2016) follow the same one-seat framing ([Neo Cab](https://en.wikipedia.org/wiki/Neo_Cab), [VA-11 Hall-A](https://en.wikipedia.org/wiki/VA-11_Hall-A)).

`UNVERIFIED:` Stardew Valley's exact count of named map areas and its tile dimensions — the wiki `Locations` page did not return usable content, and I did not find a primary source stating an area count. I also could not verify The Sims' lot-size/neighbourhood-loading specifics from a primary source (the `The Sims (video game)` article I fetched did not yield the lot-system detail I needed). Do not put a number in the plan for either.

#### Real map data — what is actually verifiable

| Claim | Verdict | Source |
|---|---|---|
| Mini Metro uses OpenStreetMap | **No evidence found.** The map set is described as *"playable maps of 34 cities"* with the appearance of *"modern transit maps"*, and the design rationale given is constraint-driven procedural generation — OSM is not mentioned. The Wikipedia figure is itself flagged `[citation needed]` | [Wikipedia, Mini Metro](https://en.wikipedia.org/wiki/Mini_Metro_(video_game)) |
| Microsoft Flight Simulator (2020) uses OSM | **No evidence found.** It *"simulates the topography of the Earth using data from Bing Maps"* with *"Microsoft Azure's artificial intelligence (AI)"* generating 3D representations, *"over two petabytes of world map data"*, partnering with **Blackshark.ai** | [Wikipedia, Microsoft Flight Simulator (2020)](https://en.wikipedia.org/wiki/Microsoft_Flight_Simulator_(2020_video_game)) |
| GeoGuessr uses OSM | **No.** It is *"a geography game in which players try to deduce locations from Google Street View imagery"*, using *"the Google Maps API"* | [Wikipedia, GeoGuessr](https://en.wikipedia.org/wiki/GeoGuessr) |
| **Any** game uses OSM | **Yes — Pokémon GO**, which moved its in-game map display from Google to OSM: *"Pokémon Go's maps now look a lot different — Goodbye Google, hello OpenStreetMap"* | [Polygon, 4 Dec 2017](https://www.polygon.com/2017/12/4/16725748/pokemon-go-map-changes-openstreetmap/) |
| OSM wiki documents games using OSM | **No page exists.** Both `OpenStreetMap in video games` and `Software/Video games` return *"There is currently no text in this page."* | [OSM Wiki](https://wiki.openstreetmap.org/wiki/OpenStreetMap_in_video_games); [OSM Wiki](https://wiki.openstreetmap.org/wiki/Software/Video_games) |

`ANECDOTAL / low-confidence:` an OSM contributor's diary entry on the Pokémon GO switch states *"They have probably been using OSM worldwide for some underlying game mechanics (e.g…)"* — the contributor is speculating about mechanics, not reporting a fact ([OSM user diary, Rovastar](https://www.openstreetmap.org/user/Rovastar/diary/42850)). Treat the *display-map* switch as verified and the *mechanics* claim as unverified.

#### ODbL obligations for a game — what OSM actually says

From OSM's own copyright page ([openstreetmap.org/copyright](https://www.openstreetmap.org/copyright)):

- Data is licensed under **ODbL** by the OSM Foundation. *"You are free to copy, distribute, transmit and adapt our data, as long as you credit OpenStreetMap and its contributors. If you alter or build upon our data, you may distribute the result only under the same license."*
- Two mandatory acts: *"Provide credit to OpenStreetMap by displaying our attribution notice"* and *"Make clear that the data is available under the Open Database License."*
- *"Generally speaking, to make clear that the data is available under the Open Database License, you may link to this copyright page. If you are distributing OSM in data form, please name and link directly to the license(s)."*
- **No free map API or tiles for third parties:** *"Although OpenStreetMap is open data, we cannot provide a free-of-charge map API or map tiles for third-parties."* Separate [API](https://www.openstreetmap.org/copyright), Tile and Nominatim usage policies apply.
- Attribution display rules vary by medium (*"different rules apply… depending on whether you have created a browsable map, a printed map or a static image"*).

The ODbL *share-alike* question — "does my game become ODbL?" — is governed by OSMF's endorsed **Community Guidelines** ([osmfoundation.org/wiki/Licence/Community_Guidelines](https://osmfoundation.org/wiki/Licence/Community_Guidelines)), which name the operative concepts:

- **Produced Work** — *"'Produced Work' is a term used by ODbL to broadly separate something created from a database but not a database itself. For OpenStreetMap, this often means a map, but could be something else (a mug, a data visualisation...)."*
- **Collective Database** — *"a database consisting of a collection of 'independent' databases"*; where a data type is entirely non-OSM within a regional cut, the combination is a Collective Database, *"rather than a Derivative Database"*.
- **Regional Cuts** and **Horizontal Layers** — using OSM in one region and another supplier elsewhere, or layering OSM with incompatible sources, does not oblige you to share the non-OSM layers.
- **Trivial Transformations**, **Geocoding**, and **Substantial** thresholds are separately defined guidelines.

`JUDGMENT:` For this project the ODbL question is answered almost entirely by *what you bake into the city pack*. If `places.json` rows are derived from OSM (a name, a lat/lng, a category mechanically transformed from OSM tags), the pack is plausibly a **Derivative Database** and share-alike attaches to *that data*, not to the game engine. If OSM is used only to draw a background and hand-curated facts (hours, fares) come from operators' own pages, the OSM-derived layer is much closer to a **Produced Work**. **The plan should therefore keep OSM-derived rows in a separately-licensed file with a per-row `source_url` of the OSM object, and treat that file as the thing released under ODbL** — which the project's existing per-fact `source_url` + `verified_at` contract already makes mechanically possible. `UNVERIFIED:` OSMF has no published guideline specific to *video games*; the above is my reading of the general guidelines plus the copyright page, not a legal opinion, and not a statement OSMF has made about games.

---

### Q4B. NPC schedules / day-night / time systems

#### How the reference games structure a day

| Game | Time model | Player control over time | Save behaviour |
|---|---|---|---|
| Stardew Valley | Real-time tick, 20 in-game hours (6 am → 2 am) | Wake fixed at 6 am; player chooses bedtime, which ends the day | **Saves only on sleep** |
| Animal Crossing | Tied to the **console's real clock and calendar** | None — the day advances with real time | Persistence is continuous, not player-triggered |
| Persona 5 | Discrete calendar days with explicit time slots | Player allocates slots; some scenes remove control | Discrete checkpointed days |
| Majora's Mask | Continuous 3-day cycle that repeats | Player can rewind the cycle | Loop-based, not per-day |

Evidence:

- **Stardew Valley**: *"The Day Cycle is a period of 20 hours in-game from 6am to 2am."* The time mapping is explicit: *"10 minutes"* of game time = *"7 seconds"* real time; *"Full day 6am to 2am, 20 hours"* = *"14 minutes"* real time. And critically: *"The game saves only after the player has gone to sleep and the daily profit breakdown has been accepted, signaling the start of a new day."* Time also pauses during *"a cutscene, viewing a dialog or menu… and during some animations"* in single-player, but **does not pause in multiplayer** ([Stardew Valley Wiki, Day Cycle](https://stardewvalleywiki.com/Time)).
- **Animal Crossing**: the GameCube port *"uses the GameCube's built-in clock"*; critics praised *"the game's use of the GameCube's internal clock and calendar"* ([Wikipedia, Animal Crossing](https://en.wikipedia.org/wiki/Animal_Crossing_(video_game))). The original N64 release was 14 April 2001.
- **Persona 5**: *"Some segments take control away from the player aside from limited dialogue choices; this was chosen as it reflects the controlled environment of Japanese high schoolers."* The game shipped with *"an estimated 1,160 scenes"*, and Atlus built event-scene tooling internally that *"was greatly expanded over the previous two entries"* ([Wikipedia, Persona 5](https://en.wikipedia.org/wiki/Persona_5)).
- **Majora's Mask**: a *"perpetually repeating three-day cycle"*, with *"the clock at the bottom of the screen"* indicating position in the cycle ([Wikipedia, Majora's Mask](https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Majora%27s_Mask)). Aonuma, on where it came from: *"The development of Ocarina of Time was so long, we were able to put in a whole lot of different elements into that game. Out of those, there were ideas that weren't fully utilised, and ones that weren't used to their full potential"* ([Eurogamer](https://www.eurogamer.net/zelda-majoras-mask-time-mechanic-originally-rewound-a-week)). The mechanic was originally a *one-week* rewind.

`JUDGMENT:` Note the coupling in the table — **the time model and the save model are the same decision**. Animal Crossing's real clock means the save is not a snapshot the player owns; Stardew's player-chosen bedtime means the save *is* a discrete, player-owned checkpoint. If your game exports a travel guide at the end of a session, you want Stardew's model (a clean, player-triggered day boundary that is also the export boundary), not Animal Crossing's.

#### NPC scheduling architecture — what the industry actually documents

- **Watch Dogs: Legion — "Census"**, described by Ubisoft Toronto's Christopher Dragert (PhD) in a GDC Programming-track session: *"Census generates highly realized individuals with detailed demographics and social profiles. These profiles form the basis of **dynamically-generated schedules** that span the entire open world, including meetings with friends, relations, and adversaries."* The talk covers *"optimizing the runtime performance of the relational database"* and *"the challenges of large-scale tagging and data integration across content teams"* ([GDC Vault](https://gdcvault.com/play/1027018/Census-The-Systemic-Backbone-Behind)). Note the deliverable: **schedules are generated from profile data**, and the hard engineering problem is a *relational database*, not an AI planner.
- **Kingdom Come: Deliverance 1 & 2 — thousands of NPCs.** Warhorse's approach is characterised as *"careful time-slicing, world-state management, and rules that let characters appear persistent without requiring expensive full-fidelity simulation at all times."* The design goal, in the session's framing: *"NPCs in KCD2 have their own paths and lives they follow whether or not the player interacts with them."* ([GameDev.net report on the GDC session](https://gamedev.net/news/5526-supporting-thousands-of-npcs-in-kingdom-come-deliverance-kingdom-come/)).
- **F.E.A.R. — "Three States and a Plan: The A.I. of F.E.A.R."** exists as a GDC Vault session ([gdcvault.com/play/1013459](https://gdcvault.com/play/1013459/Three-States-and-a-Plan)) and is the canonical public articulation of goal-oriented action planning in a shipped shooter. `UNVERIFIED:` I fetched the session page but it rendered only the Vault shell; I could not extract the talk's own text, so I am not attributing any specific quote or claim to it beyond its existence and title.

`JUDGMENT:` The documented pattern across three very different shipped systems is consistent and is **not** "pick utility AI vs behaviour trees vs GOAP":

1. **Data first.** Characters have profile rows (Census) or rules (KCD); the schedule is a *function of data*, not a hand-authored tree.
2. **Time-slice, don't simulate.** KCD's stated mechanism is time-slicing plus world-state rules so NPCs *"appear persistent without requiring expensive full-fidelity simulation at all times."*
3. **The scheduler is a database read, not a planner.** Census's hardest problem was relational-DB performance.
4. **GOAP/BTs/utility belong inside a single NPC's decision, not to the world schedule.** For a schedule of "who is where when", any of the three is over-engineering because the answer is a lookup.

#### Recommended architecture

`JUDGMENT:` **Recommendation: a data-driven schedule table plus a coarse time-slice tick, with the world clock as an integer and the LLM strictly outside the simulation.**

- **Clock**: an integer `tick` (e.g. 1 tick = 10 in-game minutes, matching Stardew's granularity) plus a derived `day`/`slot`. Integer time makes the whole sim replayable and makes "10 in-game minutes = 7 real seconds" a pure presentation constant ([Stardew Valley Wiki](https://stardewvalleywiki.com/Time)). Never store wall-clock time in the simulation state.
- **NPC state**: `{ npcId, scheduleId, currentNodeId }` where `scheduleId` indexes a **schedule table** of `(slot → nodeId)`. This is the Census idea reduced to a CSV.
- **Tick loop**: advance the clock; for each *active* node only, resolve `schedule[currentSlot]` for the NPCs in it. Everything else is `(npcId, nodeId)` with no per-NPC update. This is KCD's *"time-slicing"* argument at a scale a solo dev can afford ([GameDev.net](https://gamedev.net/news/5526-supporting-thousands-of-npcs-in-kingdom-come-deliverance-kingdom-come/)).
- **Save**: because time is an integer, the save is `{ tick, day, flags, npcNodeIndex, rngState }` — a Stardew-style checkpoint at a day boundary. Note that **Stardew's own save point is the day boundary, and its stated reason is that the daily profit breakdown must be accepted** ([Stardew Valley Wiki](https://stardewvalleywiki.com/Time)); the analogous boundary here is "end of the day, before the guide is exported", not "every dialog line".
- **Behaviour trees / utility AI / GOAP**: **out of scope.** `JUDGMENT:` reserve them for individual set-piece NPCs whose *decision* is the content. A travel sim's NPCs mostly need to *be somewhere*.
- **Save-system cost of the three options, stated plainly** (JUDGMENT, derived from the sources above): a **real-time clock** (Animal Crossing) makes the save a continuously-mutating thing the player cannot rewind, which is hostile to a "replay this trip" export story; **player-driven slots** (Persona) makes the save a small, well-defined, discrete snapshot but pushes all the authoring cost into the 1,160-scene problem ([Wikipedia, Persona 5](https://en.wikipedia.org/wiki/Persona_5)); a **tick clock with a chosen day boundary** (Stardew) gives you a small snapshot *and* a natural export trigger. Choose the third.
- **Determinism interaction**: an integer tick clock is only replayable if the tick's randomness comes from a seeded PRNG whose state you serialise — see Q4F.

---

### Q4C. Dialog / quest / travel-event data modelling

#### Runtime and licence comparison for browser use

Versions are the `latest` dist-tag from the npm registry at time of research.

| Tool | Latest version | Licence | Browser JS/TS runtime? | Editor tooling | Verdict for a React web game |
|---|---|---|---|---|---|
| **ink / inkjs** | `inkjs` **2.4.0** | **MIT** | **Yes** — `inkjs` is a first-party JS port published to npm | inkle's Inky editor; VS Code syntax highlighting; ink is used by inkle's own shipped games | **Strongest fit** |
| **Yarn Spinner** | compiler **v3.2.1** | Repo licence file present (permissive) | **No first-party JS/TS runtime** — official ports are **Unity** and **Godot** only | Unity/Godot packages; paid add-ons; separate "Try Yarn Spinner" *website* playground | Not for a browser game |
| **Twine / Tweego** | Tweego (CLI compiler) | Twine: **GPL v3**; Tweego: **BSD-style** | Tweego compiles to HTML — output runs in browser | Twine's visual editor is the product | Licence friction (Twine GPL v3) + no runtime API |
| **ChoiceScript** | — | `UNVERIFIED:` the Choice of Games terms page returned **Error 404** | Hosted/compiled, not a general runtime | ChoiceScript IDE | Not recommended |
| **Ren'Py** | *"Most of Ren'Py is covered by the terms of the following (MIT) license"* | MIT + *"Portions of Ren'Py are derived from source code that is licensed under the LGPL"* | Python engine, not browser | Ren'Py launcher + its own script language | Wrong platform |
| **articy:draft X** | current | Commercial | Export/integration only | Standalone authoring suite | **Free tier: "700 objects 1 per project"**; monthly **6.99 €**, annual **69.99 €**, teams **from 56.00 €/month** |
| **Unity Dialogue System** (Pixel Crushers) | current | Commercial Unity asset | Unity only | Unity inspector | **$47.50** (shown discounted from **$95**) |

Sources: [`intl-messageformat`-style registry JSON pattern used for all npm facts — inkjs `latest`](https://registry.npmjs.org/inkjs/latest); [Yarn Spinner FAQ](https://docs.yarnspinner.dev/faq.md); [Yarn Spinner releases](https://github.com/YarnSpinnerTool/YarnSpinner/releases/latest); [Twine repo LICENSE (GPL v3)](https://raw.githubusercontent.com/klembot/twinejs/develop/LICENSE); [Tweego LICENSE (BSD-style, "Copyright (c) 2014-2020, Thomas Michael Edwards")](https://raw.githubusercontent.com/tmedwards/tweego/master/LICENSE); [Ren'Py licence page](https://www.renpy.org/doc/html/license.html); [articy:draft pricing](https://www.articy.com/en/pricing/); [Unity Asset Store — Dialogue System for Unity](https://assetstore.unity.com/packages/tools/behavior-ai/dialogue-system-for-unity-11672); [Choice of Games terms — 404](https://www.choiceofgames.com/terms/).

#### Why Yarn Spinner is disqualified for this project (two independent reasons)

1. **No browser runtime.** The official feature list is *"Yarn Spinner for Unity"*, *"Yarn Spinner for Godot"*, plus *"Try Yarn Spinner, an online tool that allows you to write Yarn scripts and Play them in a web browser. It's useful to write basic Yarn, and test things out. It's just a website you can visit!"* — the web entry is a *playground*, explicitly separate from the shipping integrations ([Yarn Spinner FAQ](https://docs.yarnspinner.dev/faq.md)). The documentation index lists no JavaScript or TypeScript runtime ([docs.yarnspinner.dev/llms.txt](https://docs.yarnspinner.dev/llms.txt)).
2. **Runtime compilation is explicitly not the intended workflow:** *"How do I generate a Yarn Project at runtime? How do I load/compile Yarn scripts at runtime? The intended workflow is to generate and compile Yarn Projects at editor time, not runtime."* ([Yarn Spinner FAQ](https://docs.yarnspinner.dev/faq.md)). That is incompatible with splicing LLM-generated lines in mid-conversation.

#### Runtime injectability — the deciding criterion

The brief asks whether you can splice LLM-generated lines in at runtime. `JUDGMENT:` This single requirement eliminates most of the field:

- **Yarn Spinner: no.** Editor-time compilation is the documented workflow (above).
- **articy:draft / Unity Dialogue System: no.** Both are authoring-then-export pipelines tied to a host engine you are not using.
- **ChoiceScript / Ren'Py / Twine: no.** Their runtimes are not libraries you can call from React.
- **ink/inkjs: yes, with a caveat.** ink's *story graph* is compiled, but ink's `inkjs` runtime is a normal JS library you own; you can compile a story at build time, ship the JSON, and **inject text into the presentation layer rather than the story graph**. `UNVERIFIED:` I did not fetch a source documenting a supported runtime API for mutating a compiled ink story graph, so do not plan on rewriting the graph at runtime. Plan instead on: **ink for authored structure and branching; a separate generated-text layer for LLM lines that fill declared slots.**

`JUDGMENT:` **Recommendation for this React web game: `inkjs` (MIT) for the authored narrative graph, plus a custom TypeScript layer for anything LLM-generated.** Rationale, each point anchored above: it is MIT-licensed; it publishes an npm package at a real version; inkle ships commercial games on it (80 Days and Heaven's Vault are both inkle titles — [80 Days press kit](https://www.inklestudios.com/press/80days/), [Heaven's Vault press kit](https://www.inklestudios.com/press/heavensvault/)); and its unit of authorship (a node with choices) maps cleanly onto "travel event at a city node".

#### Quest and flag modelling

`JUDGMENT:` Recommendations, with the reasoning visible:

- **Dialogue-as-data, not dialogue-as-code.** ink is *already* a data/code hybrid but its output is a compiled artifact; keep quests, flags and travel events as **JSON**, and treat ink as the *presentation layer* for authored conversations. This matches the project's existing `city-pack/**` JSON contract and lets quest JSON be validated by the same validator as `places.json`.
- **Quest schema (minimum viable):** `{ id, titleKey, giverNpcId, preconditionFlags[], steps:[{ id, nodeId, kind, targetId, flagOnComplete }], outcomes:[{ flagSet, effects }] }` — i.e. a small DAG of steps with flag side effects. No general scripting language: a scripting language in a quest file is how solo projects acquire a second, worse programming language.
- **Flags: a flat, append-only set.** Not a mutable object graph. `Set<string>` serialises to a small array, diffs cleanly, and is the natural unit for an **event-sourced** save.
- **Event sourcing for saves: yes, but bounded.** Store `{ schemaVersion, seed, commandLog[], snapshotAtCommand }` and periodically fold into a snapshot. This gives replay-based debugging (Q4F) for free. `JUDGMENT:` keep the command log *bounded and prunable* — an unbounded log in IndexedDB is a slow-motion quota bug.
- **ECS: no.** `JUDGMENT:` ECS is a performance architecture for thousands of homogeneous entities. This game has tens of NPCs and hundreds of places; an ECS adds indirection and destroys the readable JSON contract that the fact layer depends on.
- **Localization of narrative**: note that Yarn Spinner's model is *"1 Yarn Project = 1 CSV spreadsheet per language"* ([Yarn Spinner FAQ](https://docs.yarnspinner.dev/faq.md)) — a useful pattern to copy regardless of engine: **string tables as the exported artifact of the narrative graph**, keyed by line ID.

---

### Q4D. Language barriers, currency, transit, customs, culture shock as mechanics

#### What the travel games actually shipped, and when

| Game | Developer | Steam release | Mechanic of note |
|---|---|---|---|
| 80 Days | inkle Ltd | 28 Sep 2015 ([Steam 381780](https://store.steampowered.com/api/appdetails?appids=381780&languages=english)) | Map-as-menu; time+money as the only two resources; TIME GOTY 2014, IGF Excellence in Narrative 2015, 4× BAFTA noms ([press kit](https://www.inklestudios.com/press/80days/)) |
| Heaven's Vault | inkle Ltd | 16 Apr 2019 ([Steam 774201](https://store.steampowered.com/api/appdetails?appids=774201&languages=english)) | Decipherment as the core loop; translations feed back into story |
| Chants of Sennaar | Rundisc | 5 Sep 2023 ([Steam 1931770](https://store.steampowered.com/api/appdetails?appids=1931770&languages=english)) | Two-person team; deduction-based language decipherment |
| TUNIC | TUNIC Team | 16 Mar 2022 ([Steam 553420](https://store.steampowered.com/api/appdetails?appids=553420&languages=english)) | An in-game manual you must decode |
| Papers, Please | Lucas Pope | 8 Aug 2013 ([Steam 239030](https://store.steampowered.com/api/appdetails?appids=239030&languages=english)) | Document verification under time pressure + moral cost |
| Wanderlust: Travel Stories | Different Tales | 26 Sep 2019 ([Steam 1051410](https://store.steampowered.com/api/appdetails?appids=1051410&languages=english)) | Travelogue structure |
| Where the Water Tastes Like Wine | Dim Bulb Games | 28 Feb 2018 ([Steam 447120](https://store.steampowered.com/api/appdetails?appids=447120&languages=english)) | American folklore travel; commercially troubled |
| Bury Me, My Love | The Pixel Hunt | 10 Jan 2019 ([Steam 808090](https://store.steampowered.com/api/appdetails?appids=808090&languages=english)) | Migration told through a messaging interface |
| Neo Cab | Chance Agency | 3 Oct 2019 ([Steam 794540](https://store.steampowered.com/api/appdetails?appids=794540&languages=english)) | Rideshare night shift; passenger emotional state |
| Airplane Mode | Bacronym | 15 Oct 2020 ([Steam 931310](https://store.steampowered.com/api/appdetails?appids=931310&languages=english)) | Flight cabin as the entire space |
| Kind Words | Popcannibal | 2019 ([Wikipedia](https://en.wikipedia.org/wiki/Kind_Words_(video_game))) | One room; asynchronous text |
| Recettear | EasyGameStation | 10 Sep 2010 WW, Dec 2007 JP ([Wikipedia](https://en.wikipedia.org/wiki/Recettear)) | Shop pricing/haggling loop |
| Moonlighter | Digital Sun | 29 May 2018 ([Steam 606150](https://store.steampowered.com/api/appdetails?appids=606150&languages=english)) | Shop-by-day / dungeon-by-night pricing loop |
| Mini Metro | Dinosaur Polo Club | 6 Nov 2015 ([Steam 287980](https://store.steampowered.com/api/appdetails?appids=287980&languages=english)) | Transit network under growth pressure |
| Overcrowd: A Commute 'Em Up | SquarePlay Games | 6 Oct 2020 ([Steam 726110](https://store.steampowered.com/api/appdetails?appids=726110&languages=english)) | Station crowd management |
| Mini Motorways | Dinosaur Polo Club | 20 Jul 2021 ([Steam 1127500](https://store.steampowered.com/api/appdetails?appids=1127500&languages=english)) | Road network, same lineage as Mini Metro |
| Shashingo: Learn Japanese with Photography | Autumn Pioneer | 27 Feb 2024 ([Steam 1632490](https://store.steampowered.com/api/appdetails?appids=1632490&languages=english)) | Photography as vocabulary acquisition |
| Coffee Talk | Toge Productions | 29 Jan 2020 ([Steam 914800](https://store.steampowered.com/api/appdetails?appids=914800&languages=english)) | Beverage-making as conversation pacing |

`UNVERIFIED:` **Road to Guangdong**, **Florence** (Steam search returned only its soundtrack and an unrelated title), **7 Days to End with You**, and **Desert Bus**'s exact real-time drive duration. I did not fetch primary sources for these; do not cite a date or duration for them. Desert Bus's mechanic is verifiable only in outline: Tucson → Las Vegas, *"at a top speed of 45"* mph, with no other vehicles and scenery *"only of dead trees and bushes"* ([Wikipedia, Desert Bus](https://en.wikipedia.org/wiki/Desert_Bus)).

#### Papers, Please — the document-checking loop

- The loop is stated plainly: *"As a checkpoint inspector, the player must review the documents of arrivals – allowing legitimate travelers through the border, denying entry to those with insufficient or expired documents, and arresting suspected criminals, terrorists, and entrants with forged or stolen documents."* ([Wikipedia, Papers, Please](https://en.wikipedia.org/wiki/Papers,_Please)).
- Pope's public development record is a **TIGSource devlog beginning November 2012** and running through the 8 August 2013 release, with a public demo that *"gained positive attention"* and a Steam Greenlight submission in April 2013 ([dukope devlog index, Papers, Please](https://dukope.com/devlogs/papers-please/); [Wikipedia](https://en.wikipedia.org/wiki/Papers,_Please)).
- Commercial trajectory: *"As of March 2014… the game had sold 500,000 copies"*; *"By August 2016… more than 1.8 million copies"*; *"By its tenth anniversary, the game had sold 5 million units."* ([Wikipedia, Papers, Please](https://en.wikipedia.org/wiki/Papers,_Please)).

`JUDGMENT:` Why the loop works — and it is a *specific* three-part structure, not "bureaucracy is fun":
1. **The rule set is finite and legible.** Every rejection has a citation the player can point at. Comprehension is the skill.
2. **The rule set is *insufficient*.** Documents can be individually valid and jointly contradictory. The player must infer intent, which is where moral weight enters.
3. **Time is the antagonist, and it is the player's own throughput.** The cost of care is queue length, so the player's ethics are priced in seconds.
`JUDGMENT:` **The critical design lesson for a travel sim: the player must be able to be *right* and still lose.** A customs scene where every answer is checkable is a quiz. A customs scene where the player must choose between a slow certain check and a fast uncertain one is a game. Note also what the loop *doesn't* need: no 3D movement, no art budget, no animation. That is why one person shipped it in well under two years of public devlog.

#### Language-barrier mechanics

- **Heaven's Vault**: *"The player has to decipher and learn the hieroglyphic language of the Ancients, a lost civilization. This involves finding and collecting inscriptions from ancient artifacts, sites and ruins and translating and discussing texts with other characters"* ([Wikipedia, Heaven's Vault](https://en.wikipedia.org/wiki/Heaven%27s_Vault)). inkle's own framing of the twist: *"every inscription you find has a meaning, and the translations you choose feed back into story, changing Aliya's ideas about what she's found. But be warned…"* ([inkle press kit](https://www.inklestudios.com/press/heavensvault/)).
- **Chants of Sennaar**: built by a **two-person** studio, *"Julien Moya (art direction and game design) and Thomas Panuel (code and game design)"*. It began *"at the start of the COVID-19 pandemic in March 2020"*; the pair *"worked on Chants of Sennaar over the next year and a half"* before taking it to Gamescom 2021, where Focus Entertainment funded the remainder ([Wikipedia, Chants of Sennaar](https://en.wikipedia.org/wiki/Chants_of_Sennaar)).
- **TUNIC**: inspired by *"the sense of mystery he had as a child when reading through game manuals… without being able to understand everything he was reading due to lack of reading ability or context"* ([Wikipedia, Tunic](https://en.wikipedia.org/wiki/Tunic_(video_game))).

`JUDGMENT:` Both inkle's and Rundisc's designs share one property: **the player's translation is an *input*, not a lookup.** Heaven's Vault's *"the translations you choose feed back into story"* and Chants of Sennaar's deduction loop both make the player's *hypothesis* the state. A mechanic where the player looks up a word and the game confirms it is a flashcard app. A mechanic where the game records what the player *believes* and then acts on that belief is a game. This distinction is the whole design, and it is also cheap: belief state is a JSON map from glyph to guessed meaning.

#### Currency / exchange

`JUDGMENT:` Recettear and Moonlighter both monetise **pricing judgement**, not conversion arithmetic. Recettear's Western reception explicitly praised shopkeeping as *"a 'strangely fulfilling activity', with some deep gam[eplay]"* despite the premise sounding like *"the dullest activity possible"* ([Wikipedia, Recettear](https://en.wikipedia.org/wiki/Recettear)).

`UNVERIFIED:` I found **no** verified game whose primary mechanic is a **live foreign-exchange rate**. If the plan wants "currency exchange as a mechanic", note that there is no proven precedent to copy — which makes it either novel or, more likely, tedious.

#### Classification: proven vs tedious

| Mechanic | Status | Why |
|---|---|---|
| Document verification with ambiguous rules under time pressure | **ALREADY DONE WELL, and still under-copied** | Papers, Please's three-part structure; no 3D budget needed |
| Decipherment where the player's *hypothesis* is the state | **ALREADY DONE WELL** by Heaven's Vault + Chants of Sennaar; still underexploited outside those two | Cheap (a belief map), high narrative payoff |
| Route + resource planning with two currencies (time, money) | **ALREADY DONE WELL** — 80 Days, and structurally identical to Mini Metro's pressure model | Proven; low novelty, low risk |
| Transit network under growth | **ALREADY DONE WELL** — Mini Metro / Mini Motorways, twice by the same studio | This is a *whole game*; do not ship it as a sub-mechanic |
| Shop pricing / haggling | **ALREADY DONE WELL** — Recettear, Moonlighter | Proven, and orthogonal to travel |
| One-room social space with asynchronous text | **ALREADY DONE WELL** — Kind Words, Coffee Talk, Neo Cab | Cheapest possible scope; proven |
| **Culture shock as a stat** | **NOVEL / underexploited — and high risk** | There is no verified precedent. A "shock meter" is a status bar; culture shock is only interesting if it changes *which actions are legible to the player* |
| **Live FX-rate arbitrage** | **NOVEL / underexploited — and likely tedious** | No verified precedent (see UNVERIFIED above). Arithmetic with a moving number is not a decision unless there is a *reason* to hold or convert |
| **Language barrier as a UI constraint** (menus and signs degrade, not just dialogue) | **NOVEL / underexploited** | The reference games make *text* the puzzle; none make the *interface* the puzzle |
| **Customs/immigration with real consequences for the exported guide** | **NOVEL** | No game ties an in-game clearance decision to a real-world artifact |

`JUDGMENT:` **Be opinionated: ship three mechanics, not eight.** Take (a) document verification under time pressure, (b) decipherment-as-belief-state, (c) route/resource planning. All three are proven, all three are text-and-state rather than art-and-animation, and — decisively for this project — all three are *legible in a guide export*: a cleared customs scene, a word the player learned, a leg they chose to walk. Cut the FX-rate arbitrage and any "culture shock meter". `JUDGMENT:` the failure mode to fear is not a mechanic that's too simple; it's a *novel* mechanic that has no proven fun and must be tuned by a team that does not exist.

#### The constraint that changes everything here

The project's own contract states: *"No paid shortcut may change the time or money ledger. Any mechanic that lets money skip waiting, skip queues, fast-travel, or buy extra time breaks the equality between in-game cost and real cost, which destroys the guide's executability."* (`tourguide-fact-integrity` skill, iron rule 6). `JUDGMENT:` This is a genuine design constraint and it removes the standard progression reward. Currency-exchange mechanics in a normal game are a *power fantasy* (buy your way past friction); here they cannot be. That is another reason to cut them.

---

### Q4E. Localization / i18n as a game mechanic vs a UI concern

#### React i18n libraries — version and licence

All versions are the npm registry `latest` dist-tag at time of research.

| Package | Version | Licence |
|---|---|---|
| `i18next` | **26.4.2** | **MIT** |
| `react-i18next` | **17.0.15** | **MIT** |
| `react-intl` | **12.1.3** | **BSD-3-Clause** |
| `intl-messageformat` | **12.1.2** | **BSD-3-Clause** |
| `@lingui/core` | **6.8.0** | **MIT** |
| `@tolgee/react` | **7.2.1** | **MIT** |
| `typesafe-i18n` | **5.27.1** | **MIT** |

Source for every row: the npm registry `latest` document, e.g. [`registry.npmjs.org/i18next/latest`](https://registry.npmjs.org/i18next/latest), [`react-i18next/latest`](https://registry.npmjs.org/react-i18next/latest), [`react-intl/latest`](https://registry.npmjs.org/react-intl/latest), [`@lingui/core/latest`](https://registry.npmjs.org/@lingui%2Fcore/latest), [`@tolgee/react/latest`](https://registry.npmjs.org/@tolgee%2Freact/latest), [`typesafe-i18n/latest`](https://registry.npmjs.org/typesafe-i18n/latest), [`intl-messageformat/latest`](https://registry.npmjs.org/intl-messageformat/latest).

`JUDGMENT:` For a project already on React 18 + MUI v5 and reusing an existing SPA, **`i18next` + `react-i18next` (MIT) is the low-risk default**, with `intl-messageformat` (BSD-3-Clause) layered in *only* for plural/select correctness. Rationale: MIT is the least-friction licence for a commercial game; `react-i18next` is a peer of React rather than a framework; and keeping ICU formatting in a separate, standards-tracking package avoids betting the message format on any one library's parser.

`UNVERIFIED:` I did not fetch each library's documentation to confirm ICU MessageFormat support, runtime-injected-message support, or extraction-CLI behaviour. **Do not put "library X supports runtime message injection" in the plan** — that capability is exactly what the language mechanic depends on, and it must be checked in the docs and then proved with a spike before it is designed around.

#### ICU MessageFormat

`UNVERIFIED:` I did not fetch the Unicode ICU MessageFormat documentation, so I am not asserting its plural/select syntax from a primary source. What *is* verified is that ICU formatting is a separately-versioned, independently-licensed package in the React ecosystem (`intl-messageformat` **12.1.2**, BSD-3-Clause, [npm registry](https://registry.npmjs.org/intl-messageformat/latest)), which is the reason to keep it out of the i18n framework.

#### i18n × LLM generation

`UNVERIFIED:` I found **no primary vendor source** (OpenAI, Anthropic, or Google) stating whether to generate directly in the target language or to post-translate. Treat the choice as an open engineering question to be resolved by measurement, not by citing a doc that does not exist.

`JUDGMENT:` The right framing follows from the project's own fact/narrative split. Facts (`city-pack/**`) carry `source_url` + `verified_at` and must never be produced by the LLM at all — they are *curated once*, with `nameJa` / `nameZh` / `nameEn` as separate verified fields. Narrative is LLM-adjacent. Therefore: **generate narrative directly in the player's chosen output language, and never machine-translate a fact.** Post-translation of a verified place name is how a correct Japanese address becomes a plausible-looking wrong one, which is precisely the failure the project already identified as fatal.

#### CJK fonts in canvas

**Licences — verified from the licence files themselves:**

- **Noto Sans CJK**: *"This Font Software is licensed under the SIL Open Font License, Version 1.1."* ([notofonts/noto-cjk `Sans/LICENSE`](https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/LICENSE)).
- **Source Han Sans**: *"Copyright 2014-2025 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source'… This Font Software is licensed under the SIL Open Font License, Version 1.1."* ([adobe-fonts/source-han-sans `LICENSE.txt`](https://raw.githubusercontent.com/adobe-fonts/source-han-sans/release/LICENSE.txt)).

So **SIL OFL 1.1 is confirmed for both** — they are the same typeface family under two names. OFL permits embedding in a game and permits subsetting; the Reserved Font Name clause restricts *renaming the font*, not using it. `UNVERIFIED:` I did not fetch the OFL FAQ or the full OFL text to quote the Reserved Font Name clause or the embedding permission, so treat the OFL *obligations* (what must ship alongside the font) as something to confirm from the licence text before shipping.

**The size problem.** The Noto CJK release listing names the shipped artefacts as *"OTF, OTC, Super OTC, Subset OTF, Variable OTF/TTF"* for Noto Serif CJK Version 2.003 ([noto-cjk releases](https://github.com/notofonts/noto-cjk/releases/latest)). `UNVERIFIED:` I could not retrieve **exact file sizes** for these artefacts — the GitHub API rate-limited and the releases page text did not include byte counts. **The plan must not quote a megabyte figure for the CJK font until it is measured**, but the architectural conclusion is forced regardless: a full-collection CJK font is far too large to ship to a browser alongside a game bundle, and the multi-weight *"Super OTC"* form is larger still.

**Mitigations, verified as existing (not as measured):**

- **`fonttools` / `pyftsubset` subsetting** — [fonttools subset documentation](https://fonttools.readthedocs.io/en/latest/subset/).
- **Google Fonts CSS API `unicode-range` slicing** — [Google Fonts getting started](https://developers.google.com/fonts/docs/getting_started).
- **`glyphhanger`** — a tool for producing subset fonts and the `unicode-range` CSS from a page's actual glyph usage ([github.com/pixelcog/glyphhanger](https://github.com/pixelcog/glyphhanger)).
- `UNVERIFIED:` `subfont` — the GitHub API call for its latest release was rate-limited, so I am not asserting its version or behaviour.

`JUDGMENT:` The subsetting strategy and the language mechanic are *the same problem, and that is the opportunity*. If the game's fiction is that the player cannot read the signs, then the set of glyphs the player can render is exactly the set the player has learned. Subset the font to **the union of (verified fact strings the guide needs) ∪ (glyphs the player has learned)** and load the rest lazily as the player progresses. This turns the font-size liability into the mechanic's state, and it removes the need to decide "how much of Japanese do we ship" — you ship what the *guide* requires, always, and what the *player* has earned, incrementally.

`UNVERIFIED:` canvas `fillText` performance. I did not obtain a credible measured source on canvas text rendering cost, measureText caching, or glyph-atlas trade-offs. **Do not put a performance number in the plan.** The measurable question to spike is: at the target glyph count, is per-frame `fillText` acceptable, or does text need to be cached to an offscreen canvas / bitmap atlas? That is a one-day experiment, not a research question.

#### Language as a mechanic, not a string table

`JUDGMENT:` The architectural argument, stated as a rule:

> A **string table** maps `key → text`. A **language mechanic** maps `key × playerKnowledge → text-the-player-can-actually-read`.

Concretely, this project should not have one `strings.json` per locale. It should have:

1. A **fact layer** with one verified, per-field, per-language value plus provenance — already specified by the project's `places.json` contract (`nameJa`, `nameZh`, `nameEn`).
2. A **signage layer** whose renderable form is a *function of knowledge state*: `render(sign, knownGlyphs)` emits the original, a partial rendering with unknowns as gaps, or the player's own gloss.
3. A **gloss layer** holding the player's *beliefs* (`glyphId → guessedMeaning`), which is what the narrative reads — mirroring Heaven's Vault's *"the translations you choose feed back into story"* ([inkle press kit](https://www.inklestudios.com/press/heavensvault/)).
4. **UI chrome stays ordinary i18n.** `i18next` handles menus and settings; it must never be the mechanism by which in-world text is obscured, or the mechanic leaks into the settings menu.

The test: if a reviewer can play the game with the language-setting switched to "English" and see all the in-world text cleartext, the language "mechanic" is a string table with extra steps.

---

### Q4F. Save/load, determinism, LLM reproducibility & debuggability

#### Seeded PRNG packages

| Package | Version | Licence | Note |
|---|---|---|---|
| `seedrandom` | **3.0.5** | **MIT** | *"Calling seedrandom with no arguments creates an ARC4-based PRNG that is autoseeded using the current time, dom state, and other"* ([README](https://raw.githubusercontent.com/davidbau/seedrandom/master/README.md)) |
| `pure-rand` | **11.8.0** | **MIT** | Documents itself as *"fast and pure pseudorandom number generators for JS/TS. Perfect for reproducible randomness!"* with `xoroshiro128plus(seed)` ([README](https://raw.githubusercontent.com/dubzzz/pure-rand/main/README.md)) |
| `msw` (LLM/HTTP record-replay) | **2.15.0** | **MIT** | [npm registry](https://registry.npmjs.org/msw/latest) |
| `nock` (HTTP record-replay) | **14.0.17** | **MIT** | [npm registry](https://registry.npmjs.org/nock/latest) |

Versions/licences from the npm registry `latest` documents: [`seedrandom/latest`](https://registry.npmjs.org/seedrandom/latest), [`pure-rand/latest`](https://registry.npmjs.org/pure-rand/latest).

`UNVERIFIED:` `Alea` and `mulberry32` as standalone npm packages — I did not fetch their registry entries. Note that `seedrandom`'s documented default is **ARC4-based**, and ARC4 is the weaker of the choices; `pure-rand`'s `xoroshiro128plus` and its **jump** facility are the better engineering fit for "one world seed, many independent sub-streams": its README explains that *"the best way to ensure fully unrelated sequences is rather to use jumps… jumping in Xoroshiro 128+ will move you 2^64 generations away from the current one on a generator having a sequence of 2^128 elements"* ([pure-rand README](https://raw.githubusercontent.com/dubzzz/pure-rand/main/README.md)).

`UNVERIFIED:` whether `pure-rand` documents **state serialisation** (i.e. can you persist and restore an RNG mid-stream?). Its README documents seeding and jumping; it does not, in the text I retrieved, document a serialisable state object. **A deterministic save that cannot serialise RNG state is not deterministic across a reload**, so this must be verified before it is designed around. If it cannot be serialised, the correct fallback is `(worldSeed, commandIndex)` re-derivation — replay the stream to the current command — which is why the command log in Q4C matters.

#### Determinism pitfalls

- **`Math.random` is not seedable**: it returns a `Number` "with positive sign, greater than or equal to 0 but less than 1", and there is no seed parameter ([MDN, Math.random](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random)). `JUDGMENT:` a single stray `Math.random()` anywhere in the sim destroys replay; the mitigation is a lint rule banning it outside the PRNG module, not discipline.
- **`localStorage` stores UTF-16 strings**: *"The keys and the values stored with localStorage are in the UTF-16 string format."* ([MDN, Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)). `JUDGMENT:` relevant to save size — a JSON save is stored as UTF-16, so a 1 MB JSON payload occupies materially more than 1 MB of the localStorage budget.
- `UNVERIFIED:` **float non-determinism, `Object.keys` ordering, and `Array.prototype.sort` stability.** I fetched MDN's `Array.sort` and `Object.keys` pages and the Gaffer On Games floating-point-determinism article, but the workspace cache for those was destroyed by a concurrent writer before I extracted quotes, and I did not re-fetch them. **Do not cite specific guarantees for key ordering or sort stability in the plan.** The safe engineering rules that do not require the citation: never iterate an object's keys to produce ordered simulation output (use an array or a `Map`); never rely on the default comparator for simulation-relevant ordering; never compare floats for equality in the sim state; and never let a float enter the save when an integer will do.

#### Storage: what the browser actually guarantees

Quotas, quoted verbatim from MDN's Storage quotas and eviction criteria page ([MDN, Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)):

- **Web Storage (localStorage/sessionStorage):** *"Web Storage, which can be accessed by using the localStorage and sessionStorage properties of the window object, is limited to 10 MiB of data maximum on all browsers. Browsers can store up to 5 MiB of local storage, and 5 MiB of session storage per origin. Once this limit is reached, browsers throw a QuotaExceededError exception which should be handled by using a try...catch block."*
- **Firefox, best-effort mode:** the smaller of *"10% of the total disk size where the profile of the user is stored"* or *"10 GiB, which is the group limit that Firefox applies to all origins that are part of the same site."*
- **Firefox, persistent storage granted:** *"up to 50% of the total disk size, capped at 8 TiB."*
- **Eviction is the default, not the exception:** *"Best-effort: this is the way that data is stored by default. Best-effort data persists as long as the origin is below its quota, the device has enough storage space, and the user doesn't…"* ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)).
- IndexedDB, the Cache API, and OPFS are the large-storage mechanisms; *"The Cache API provides a persistent storage mechanism for HTTP request and response object pairs"* ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)).

`JUDGMENT:` The decision is not close. **5 MiB of UTF-16 localStorage is not a save system; it is a settings store.** A save containing a command log plus a city pack will exceed it. Use **IndexedDB**, with `navigator.storage.estimate()` for budget reporting and `navigator.storage.persist()` to request eviction protection — `UNVERIFIED:` I did not re-fetch the MDN pages for `estimate()`/`persist()` after the cache was destroyed, so confirm their exact contracts from MDN before relying on either.

| Wrapper | Version | Licence |
|---|---|---|
| `dexie` | **4.4.6** | **Apache-2.0** |
| `idb` | **8.0.3** | **ISC** |
| `localforage` | **1.10.0** | **Apache-2.0** |

([`dexie/latest`](https://registry.npmjs.org/dexie/latest), [`idb/latest`](https://registry.npmjs.org/idb/latest), [`localforage/latest`](https://registry.npmjs.org/localforage/latest)).

`JUDGMENT:` **`idb` (ISC) over `localforage`.** `localforage` is a localStorage-shaped key/value API and its latest published version is **1.10.0**, which is old relative to the others; the save architecture here needs *queryable* records (events by index, snapshots by version), not a KV shim. `dexie` (Apache-2.0, 4.4.6) is the more capable option if you want a query layer and migrations; `idb` is the thinner, smaller-surface option. For a 1–2 person team, `idb` plus hand-written migration functions is less machinery to own.

#### LLM reproducibility — the citable facts

**LLM APIs are not deterministic even at temperature 0.** The strongest source I could verify is not a vendor doc but a vendor-adjacent engineering writeup quoting OpenAI's own semantics:

- To get *"(mostly) deterministic outputs across OpenAI API calls"*, you must set `seed` and *"Ensure all other parameters (like prompt or temperature) are the exact same across requests."* And even then: *"If the seed, request parameters, and system_fingerprint all match across your requests, then model outputs will mostly be identical. **There is a small chance that responses differ even when request parameters and system_fingerprint match, due to the inherent non-determinism of computers.**"* ([lakeFS, "How to Toggle OpenAI Model Determinism"](https://lakefs.io/blog/toggle-openai-model-determinism/)).
- The same writeup frames the general case: *"Language models are Stochastic models (stochastic refers to a random or probabilistic process) which means their behavior is non-deterministic in nature and involves chance or probability."* ([lakeFS](https://lakefs.io/blog/toggle-openai-model-determinism/)).

`UNVERIFIED:` I could **not** retrieve a first-party OpenAI documentation statement of the form "outputs are not deterministic even at temperature 0". The OpenAI community thread on the topic returned only 325 bytes to my extractor ([community.openai.com thread](https://community.openai.com/t/chatcompletions-are-not-deterministic-even-with-seed-set-temperature-0-top-p-0-n-1/685769)) — so I am citing its existence and title, not its contents. **The plan should treat "LLM output is not reproducible" as established by the seed/`system_fingerprint` caveat above, and should not attribute a stronger claim to OpenAI.**

**Prompt caching — exact published economics:**

- **OpenAI**: *"Cheaper input tokens: Pay the model's reduced cached-input rate for reused tokens, **discounted up to 90%**."* Minimum cacheable prefix: *"The minimum cacheable prompt length is **1,024 tokens** for GPT-5.6 and later and varies by request settings for earlier models."* Writes cost more, reads much less: *"cache writes cost **1.25×** the standard, uncached input-token rate… subsequent reads cost only **0.1×** that rate."* Default lifetime: *"the only supported value, **30m**, is also the default."* ([OpenAI prompt caching docs](https://developers.openai.com/api/docs/guides/prompt-caching)).
- **Anthropic**: *"By default, the cache has a **5-minute** lifetime. The cache is refreshed for no additional cost each time the cached content is used."* *"**5-minute cache write tokens are 1.25 times** the base input tokens price"*, *"**1-hour cache write tokens are 2 times** the base input tokens price"*, and *"**Cache read tokens are 0.1 times** the base input tokens price."* ([Anthropic prompt caching docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)).

`JUDGMENT:` Three consequences for this project:
1. **Prompt caching is a cost lever, not a determinism lever.** It reduces the price of a repeated prefix; it does not make the *completion* reproducible.
2. **The 1,024-token minimum (OpenAI) is a design constraint on prompt layout.** A system prompt plus the frozen `GuideDoc` prefix must clear the threshold before caching does anything. If the fact prefix is short, caching buys nothing.
3. **Cache TTL is short (5–30 min).** A *player* who returns tomorrow gets a cold cache. So a **pre-baked content pack** is not an optimisation — for offline play it is the only mechanism that works, because the browser may be offline entirely.

#### Recommended debuggable architecture

`JUDGMENT:` **Recommendation — a command-log core with a content-addressed LLM sidecar.**

```
save = {
  schemaVersion,            // integer, bumped on every breaking change
  worldSeed,                // one seed per playthrough
  tick,                     // integer simulation clock (Q4B)
  commandLog: Command[],    // append-only: { i, kind, payload, rngAfter }
  snapshot,                 // optional fold of commandLog[0..snapshotAt]
  snapshotAt,
  llmCacheRefs: string[]    // content hashes into the LLM cache store
}
```

Four properties, each tied to a verified fact above:

1. **Replayable.** Because time is an integer and every random draw comes from a seeded PRNG, replaying `commandLog` from `worldSeed` reproduces the session. This is the *only* mechanism that makes a bug report from a player actionable by a team of two.
2. **Deterministic per-command RNG.** Store `rngAfter` per command so a divergence can be bisected to a single command rather than re-derived. This is the practical answer to the unverified `pure-rand` state-serialisation question: if state cannot be serialised, the *derived* state is recorded instead.
3. **Bounded and migratable.** `schemaVersion` plus an ordered list of migration functions. Fold the log into a snapshot at every day boundary (which is also the guide-export boundary — Q4B), and prune the log behind the snapshot. This keeps the save small despite event sourcing.
4. **LLM calls are content-addressed and never in the save.** The save holds **hashes**, not text. `hash(promptTemplateId + factRefs + playerState)` keys a store (IndexedDB) holding the completion and the model/params used. Consequences: (a) a replayed session reuses the *exact same* generated line, so replay is stable even though the model is not; (b) shipped **golden fixtures** are just this store pre-populated from a recorded session; (c) the offline content pack is the same store, pre-baked at build time — which is required, because cache TTLs are 5–30 minutes and offline play has no provider at all.

**Testing.** `JUDGMENT:` `msw` (2.15.0, MIT) or `nock` (14.0.17, MIT) for HTTP-level record-and-replay, plus the content-addressed store for semantic-level fixtures. Record once against the live API, commit the fixture, and run CI with the network hard-disabled — the same discipline as golden-file testing, applied to a non-deterministic dependency.

**Debuggability, explicitly.** `JUDGMENT:` The property that matters is: **given a save file, the team can reproduce the exact session, including the exact generated text, without network access.** Every element above exists to deliver that one property. If a proposed feature cannot be expressed as commands over seeded state plus addressed content, it is a feature that cannot be debugged by two people.

---

## Q6 — Scope-cutting benchmarks

### Q6.1 What small teams actually shipped — verified

Release dates below are from the Steam store API (`release_date`) and developer names from the same payload; durations are from the cited developer statements.

| Game | Release (Steam) | Team | Development duration (as stated) | Source |
|---|---|---|---|---|
| Stardew Valley | **26 Feb 2016** | Solo (ConcernedApe / Eric Barone) | `UNVERIFIED:` the widely-repeated 2012 start is **not** confirmed from a primary source I fetched | [Steam 413150](https://store.steampowered.com/api/appdetails?appids=413150&languages=english) |
| Undertale | **15 Sep 2015** | Toby Fox (+ Temmie Chang, art) | *"developed by Toby Fox across **32 months**"*; Kickstarter launched 24 Jun 2013 with a US$5,000 goal, *"ended on July 24, 2013, with **US$51,124** raised by 2,398 people"* | [Wikipedia, Undertale](https://en.wikipedia.org/wiki/Undertale); [Steam 391540](https://store.steampowered.com/api/appdetails?appids=391540&languages=english) |
| Papers, Please | **8 Aug 2013** | Solo (Lucas Pope) | Public TIGSource devlog runs from **Nov 2012** to the Aug 2013 release | [dukope devlog index](https://dukope.com/devlogs/papers-please/); [Steam 239030](https://store.steampowered.com/api/appdetails?appids=239030&languages=english) |
| Return of the Obra Dinn | **18 Oct 2018** | Solo (Lucas Pope) | Devlog archive runs from **May 2014** to the Oct 2018 release | [dukope devlog index](https://dukope.com/devlogs/obra-dinn/); [Steam 653530](https://store.steampowered.com/api/appdetails?appids=653530&languages=english) |
| A Short Hike | **30 Jul 2019** | Solo (Adam Robinson-Yu) | *"he had to commit to a **3-month deadline**"*; *"finish a very robust little game in **three months**"* | [Game Developer](https://www.gamedeveloper.com/design/finding-smart-shortcuts-in-a-short-hike-postmortem-unlocking-the-vault-4); [Steam 1055540](https://store.steampowered.com/api/appdetails?appids=1055540&languages=english) |
| Unpacking | **1 Nov 2021** | Witch Beam (small studio, Brisbane) | `UNVERIFIED:` no primary duration statement retrieved | [Steam 1135690](https://store.steampowered.com/api/appdetails?appids=1135690&languages=english); [Wikipedia](https://en.wikipedia.org/wiki/Unpacking_(video_game)) |
| Venba | **31 Jul 2023** | Visai Games | `UNVERIFIED:` duration | [Steam 1491670](https://store.steampowered.com/api/appdetails?appids=1491670&languages=english); won the 2024 IGF Grand Prize ([Wikipedia, Venba](https://en.wikipedia.org/wiki/Venba_(video_game))) |
| Kind Words | **2019** | **Two people** — *"programmer and designer Ziba Scott and artist Luigi Guatieri"* | `UNVERIFIED:` duration | [Wikipedia, Kind Words](https://en.wikipedia.org/wiki/Kind_Words_(video_game)) |
| Donut County | **28 Aug 2018** | Ben Esposito | `UNVERIFIED:` the often-cited multi-year "hole" prototype phase | [Steam 702670](https://store.steampowered.com/api/appdetails?appids=702670&languages=english) |
| Wilmot's Warehouse | **29 Aug 2019** | **Two people** — *"Richard Hogg and Ricky Haggett"*; published by Finji; built in **OpenFL** | `UNVERIFIED:` duration | [Wikipedia, Wilmot's Warehouse](https://en.wikipedia.org/wiki/Wilmot%27s_Warehouse); [Steam 839870](https://store.steampowered.com/api/appdetails?appids=839870&languages=english) |
| Mini Motorways | **20 Jul 2021** | Dinosaur Polo Club | `UNVERIFIED:` duration | [Steam 1127500](https://store.steampowered.com/api/appdetails?appids=1127500&languages=english) |
| Coffee Talk | **29 Jan 2020** | Toge Productions | Conceptualised **2017** at Toge's game jam as *Project Green Tea Latte*; demo published **2018** | [Wikipedia, Coffee Talk](https://en.wikipedia.org/wiki/Coffee_Talk_(video_game)); [Steam 914800](https://store.steampowered.com/api/appdetails?appids=914800&languages=english) |
| Wanderstop | **11 Mar 2025** | Ivy Road | *"conceptualization began in 2016, and bona fide development on the game began around 2018. With work on the project lasting **over nine years**"*; lead animator began **2019**, animation team later grew to *"as many as four simultaneous people"* | [Wikipedia, Wanderstop](https://en.wikipedia.org/wiki/Wanderstop); [Steam 1299460](https://store.steampowered.com/api/appdetails?appids=1299460&languages=english) |
| Animal Well | **9 May 2024** | Solo (Billy Basso); publisher **Bigmode** | *"He thought it would take six months. It took **seven years**."*; *"For **four years**, Basso worked on a primitive version… in his free time, supporting himself with his day job"*; after signing Bigmode he quit, and *"It ended up still being about **three years** until it was done"* | [WIRED](https://www.wired.com/story/billy-basso-animal-well-whats-next-gdc/); [Steam 813230](https://store.steampowered.com/api/appdetails?appids=813230&languages=english) |
| Balatro | **20 Feb 2024** | Solo (LocalThunk); publisher **Playstack** | *"Development began in **2021, two-and-a-half years before release**"*; his own timeline dates the start to **13 December 2021**, a first public Steam beta in **May 2023**, a new demo in **late September 2023**, and announces a **20 February 2024** release date; **114,977** Steam wishlists by end of January 2024 | [Wikipedia, Balatro](https://en.wikipedia.org/wiki/Balatro); [PocketGamer.biz on the published timeline](https://www.pocketgamer.biz/i-dont-think-i-would-have-rated-balatro-higher-than-an-8-and-i-made-the-damn-thing/); [Steam 2379780](https://store.steampowered.com/api/appdetails?appids=2379780&languages=english) |

Additional verified data points from the same batch:

- **Tunic**: *"Designer Andrew Shouldice developed Tunic, his first major game, over **seven years**. He began work on it as a solo project in **2015**"*; *"After a couple years of development, Shouldice was joined by Felix Kramer, who became the producer, leading to connecting with publisher Finji in **2017**."* Released **16 Mar 2022** ([Wikipedia, Tunic](https://en.wikipedia.org/wiki/Tunic_(video_game)); [Steam 553420](https://store.steampowered.com/api/appdetails?appids=553420&languages=english)).
- **Chants of Sennaar**: **two people**; began *"at the start of the COVID-19 pandemic in **March 2020**"*; *"worked on Chants of Sennaar over the next **year and a half**"*; Focus Entertainment funded the rest; released **5 Sep 2023** — i.e. ~3.5 years from start to ship ([Wikipedia](https://en.wikipedia.org/wiki/Chants_of_Sennaar); [Steam 1931770](https://store.steampowered.com/api/appdetails?appids=1931770&languages=english)).
- **Mini Metro**: conceived **April 2013** for **Ludum Dare 26** (ranked *#1 in "Innovation"* and *#7 in "Overall"*), alpha **Sept 2013**, Steam Early Access **Aug 2014**, full release **Nov 2015**; *"They initially intended on releasing the final version of the game by the end of 2013, however **development took far longer than they had expected despite the game's limited scope**."* Also: *"Peter Curry had been working on Mini Metro full-time since March 2014, and his brother Robert started working full-time in November 2014."* ([Wikipedia, Mini Metro](https://en.wikipedia.org/wiki/Mini_Metro_(video_game))).
- **Shenmue**: Sega AM2 began a Saturn RPG project in **1996**; development moved to Dreamcast; released NA **7 Nov 2000**; *"Despite sales of 1.2 million, Shenmue did not recoup its development cost and was a commercial failure."* ([Wikipedia, Shenmue](https://en.wikipedia.org/wiki/Shenmue_(video_game))).
- **80 Days**: iOS **31 Jul 2014** → Android **15 Dec 2014** → Windows/macOS **Sep 2015** — a ~14-month staged rollout of an interactive-fiction game with no world geometry ([Wikipedia](https://en.wikipedia.org/wiki/80_Days_(2014_video_game))).

`JUDGMENT:` Read the distribution, not the anecdotes. Of the durations I could verify: **~7 months** of public devlog (Papers, Please), **~3 months** of committed production for A Short Hike, **~2.5 years** (Balatro), **32 months** (Undertale), **~3.5 years** (Chants of Sennaar, 2 people), **~4.4 years** (Obra Dinn devlog), **~7 years** (Tunic; Animal Well), **~9 years** (Wanderstop). The pattern is blunt: **the games that shipped in months had almost no art production** (A Short Hike reused assets from prior projects and leaned on Yarn Spinner; Papers, Please is a static desk). Every game with a *world* took 3–9 years. A 2.5D walkable foreign city is a *world*. That is the number the plan has to respect: **not 3 months — 3+ years at this fidelity, or a hard reduction in what "world" means.**

### Q6.2 Web/browser game scope evidence

Portal terms and processes (verbatim where quoted):

- **Poki**: *"Poki is the leading web gaming platform, powered by a community of **500+ game developers**."* Claims *"**100 million** monthly players"*, *"With more than **5 million monthly players per high-performing game**"*, and *"**1B+ gameplays per month**"*. Poki also offers *"Poki Playtesting"* for pre-release feedback ([developers.poki.com](https://developers.poki.com/)).
- **CrazyGames**: submissions *"are carefully reviewed by our QA team according to our technical and quality requirements."* The launch process is explicitly two-stage: **Basic Launch** = *"Test your game on our platform with a limited audience for a temporary period of **7 to 21 days**"*, requiring *"no CrazyGames-specific integration and only Basic QA review"*, with *"Monetization (video ads, banners, in-game purchases) **disabled**"*; **Full Launch** requires *"Full Implementation of CrazyGames requirements, including a Full QA review"* and only then is *"Monetization… enabled and you start receiving revenue share."* Progression is decided on *"key engagement metrics - **average playtime, conversion to gameplay, and retention**"* ([docs.crazygames.com](https://docs.crazygames.com/)).

`JUDGMENT:` The portal model is a real distribution channel with real reach, and it is **structurally incompatible with this project's core promise.** CrazyGames gates monetisation on *conversion to gameplay* and *average playtime*; a travel sim whose whole point is that the player stops playing and goes to Japan is optimised for the opposite metric. The portals are worth knowing about as a *technical* proving ground (they force small builds and fast loads), not as a business model for this game.

Engine/bundle facts for browser targets (versions from npm `latest`):

| Package | Version | Licence |
|---|---|---|
| `@react-three/fiber` | **9.8.1** | **MIT** |
| `phaser` | **4.2.1** | **MIT** |
| `pixi.js` | **8.21.0** | `UNVERIFIED:` no `license` field in the npm `latest` document I retrieved |

([`@react-three/fiber/latest`](https://registry.npmjs.org/@react-three%2Ffiber/latest), [`phaser/latest`](https://registry.npmjs.org/phaser/latest), [`pixi.js/latest`](https://registry.npmjs.org/pixi.js/latest)).

`UNVERIFIED:` Unity WebGL and Godot web-export limitations, and any published HTML5 income reports, itch.io jam-to-commercial conversion cases, and 2024–2026 solo devs shipping with AI assistants at stated elapsed times. I fetched [Unity's WebGL build manual](https://docs.unity3d.com/Manual/webgl-building.html) and [Godot's web export page](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) but could not extract their limitation sections (both pages rendered navigation-heavy and the Godot page exceeded my extraction cap). **Do not put engine-web caveats, browser-game income figures, or AI-assisted timelines in the plan.** This is a real gap, and it is the gap most likely to be filled with plausible-sounding invention — so it should be an explicit, named unknown in the plan rather than a number.

`JUDGMENT:` On engine reuse: the legacy SPA is React 18 + MUI v5. `@react-three/fiber` **9.8.1 (MIT)** is the natural bridge if you want to keep React as the shell and render a 2.5D scene in WebGL — it lets the existing component tree survive. `pixi.js` **8.21.0** is the stronger choice if the 2.5D is *sprite-and-parallax* rather than true 3D, because a 2D renderer imposes no lighting/material budget. `phaser` **4.2.1 (MIT)** is the option that abandons the React shell in favour of a game framework — highest ceiling for game feel, highest cost in throwing away the SPA you already have.

### Q6.3 AI-assisted solo development — an evidence gap

`UNVERIFIED — and this is a finding, not a failure.` I could not verify a single 2024–2026 case of a solo developer shipping a game with Cursor / Claude Code / Copilot **with a concrete elapsed time attributable to a primary source**. Nor could I extract Steam's AI-disclosure policy wording: [the Steamworks AI content page](https://partner.steamgames.com/doc/store/ai_content) and [the Content Survey page](https://partner.steamgames.com/doc/gettingstarted/contentsurvey) both returned navigation chrome rather than policy body text to my extractor. News coverage of a Steam disclosure-form update exists ([Yahoo Tech](https://tech.yahoo.com/gaming/articles/steam-updates-ai-disclosure-form-225124993.html)) but the extracted text was also chrome.

`JUDGMENT:` **Do not put an "AI multiplies velocity by N×" number in the plan.** There is no verified N. The defensible claims are narrower and still useful: AI assistance is not in the critical path of the benchmarks above (none of the verified durations above involve AI-assisted development), and the projects that shipped fastest did so by *removing art production*, not by adding throughput. Treat AI assistance as a way to reduce the cost of *code* — which was never the binding constraint for these games — and as no help at all with the binding constraint, which is art and content.

### Q6.4 Realistic MVP at 4 / 12 / 24 weeks

`JUDGMENT:` The anchor is the verified distribution in Q6.1: no verified small team shipped a *walkable world* in under ~3 years, and the sub-1-year games are desk-bound or asset-reusing. Therefore the three milestones below are **not three sizes of the same game**; they are three different products, and the plan is dishonest if it presents them as one product on a schedule.

Assumptions stated explicitly: 1–2 people; AI assistance for code; the legacy React SPA is *reused as a shell* but its OpenAI itinerary generation, Google Maps Places/Directions usage and JWT auth are **not** presumed to survive; the fact layer contract (`source_url` + `verified_at`, validate with `validate-city-pack.mjs`) applies from week 1; one city.

| | **4 weeks** | **12 weeks** | **24 weeks** |
|---|---|---|---|
| **Product** | **One street, one day.** A single 40 m × 40 m 2.5D street with 8–12 enterable interiors, a tick clock, and three travel events. | **One district, three days.** 3–5 connected streets, a customs scene, a transit leg, and one language-decipherment thread. | **One city, one week.** Multiple districts; guide export + memoir return loop closed; a second city as a *style kit* only. |
| **IN — world** | 1 street; shared tile vocabulary; 1 style kit | Customs hall + transit hub + 2 more streets | Full district graph; 6–10 district props per city style kit |
| **IN — time** | Integer tick clock; 20-hour day at Stardew's ratio ([wiki](https://stardewvalleywiki.com/Time)); day-boundary save | NPC schedule tables for ~10 NPCs; time-sliced tick (KCD pattern) | Schedule tables for ~30 NPCs; multi-day state |
| **IN — narrative** | `inkjs` 2.4.0 graph for authored events; LLM **off** | ink graph + 1 LLM-filled slot type, content-addressed and cached | Full narrative layer; gloss/belief state drives dialog (Heaven's Vault pattern) |
| **IN — mechanics** | **One**: document verification with ambiguous rules + player-throughput time pressure (Papers, Please pattern) | **Two**: + decipherment-as-belief-state (Chants of Sennaar pattern, ~3.5 yrs for 2 people at full scope — so a *thread*, not a system) | **Three**: + route/resource planning with two currencies (80 Days pattern) |
| **IN — facts** | `pack.json` + `places.json` + `transit.json` for 1 city; validator green in CI; every row `source_url` + `verified_at` | + quarterly re-verification job for semi-static fields; Plan B + buffer surfaced in export | + freshness tiers enforced; dynamic facts never cached as truth |
| **IN — tech** | Vite/React shell; `idb` 8.0.3; integer clock; seeded PRNG; command-log save with `schemaVersion` | + `msw` golden fixtures; replay-from-save debug tool; offline content pack; `navigator.storage.persist()` | + save migration functions; full replay determinism test in CI |
| **IN — i18n** | `i18next` 26.4.2 + `react-i18next` 17.0.15 for UI chrome only | + subset CJK font driven by *guide-required* glyphs | + learned-glyph incremental font loading tied to the language mechanic |
| **OUT** | Any LLM generation. Any second city. Any procedurally generated map. Multiplayer. Voice. Audio beyond one ambient loop. Mobile layout. | Second city. Procedural generation. Any mechanic whose fun is unproven. ECS. Behaviour trees / GOAP / utility AI. FX-rate arbitrage. Culture-shock meter. | Multi-city at launch. User accounts. Server persistence. Prompt-cached LLM as a *required* path (offline pack is canonical) |
| **Gate to pass** | A stranger can play one day, export a guide, and the guide is *executable* for that street | The customs scene is winnable *and* losable, and losing is recoverable with a Plan B | A real person follows the exported guide in the real city and returns photos into the memoir |

`JUDGMENT:` Three things that look like scope but are not, and should be cut from all three columns: a second playable city before the loop is closed (the project's own skill says a new city must **not** need a new tile type — so a second city is a style kit, `JUDGMENT:` a 1-week job *after* the loop works and a multi-week trap before it); any LLM output in the 4-week build (it makes replay non-deterministic on day one, for zero proven benefit); and any behaviour-tree/GOAP/utility-AI subsystem (nothing verified above needed one — Census used a relational database, KCD used time-slicing).

### Q6.5 The single riskiest assumption

`JUDGMENT:` **The riskiest assumption is that a player who has played the game will voluntarily execute the exported guide in the real world and return with photos — and that this is a loop a person actually completes once, let alone repeatedly.**

Why this and not the others:

- **It is the only assumption that no verified benchmark supports.** Every other risk in this plan has a shipped precedent: Papers, Please proves document checking works ([Wikipedia](https://en.wikipedia.org/wiki/Papers,_Please)); Chants of Sennaar proves decipherment works for a two-person team ([Wikipedia](https://en.wikipedia.org/wiki/Chants_of_Sennaar)); Stardew proves the tick clock and sleep-save work ([wiki](https://stardewvalleywiki.com/Time)); Balatro proves a solo dev ships in 2.5 years ([Wikipedia](https://en.wikipedia.org/wiki/Balatro)). **Nothing in Q4A–Q4F or Q6 supplies a single verified example of a game whose intended payoff is a real-world trip.** A Short Hike's *"no time limit nor a losing condition"* and its fantasy island ([Wikipedia](https://en.wikipedia.org/wiki/A_Short_Hike)) is the closest analogue, and its payoff is entirely in-game.
- **It is upstream of every other decision.** If players do not complete the loop, the entire fact layer is unnecessary — you could ship a fictional city and lose nothing. If they do complete it, then every hour spent on the fact layer's provenance, freshness tiers and validators is the *product*, and every hour spent on 2.5D fidelity is decoration. The correct engineering spend differs by an order of magnitude across those two worlds, and you cannot know which world you are in until someone actually takes the trip.
- **It is the assumption that fails silently.** A wrong tile vocabulary is visible. A missing feature is visible. A loop that nobody closes looks exactly like a loop nobody has tried yet — you will keep building, and the signal will not arrive.
- **It is the assumption that the legacy codebase's failure already indicts.** The project's own post-mortem rule — *"Am I about to add a feature unrelated to the loop 'play → export guide → travel → memoir'? → reject it. The previous attempt at this project died by accumulating 37k lines of tooling unrelated to the product"* — is itself evidence that the team's default failure mode is building the loop's *support* instead of testing the loop.

**What to do about it, concretely (JUDGMENT):** do not resolve this assumption with research; resolve it with an artefact. In the 4-week build, the day-boundary export must produce a guide for **a street the owner has actually walked**, and the owner must follow it once before week 12 begins. `JUDGMENT:` That is a single weekend of work producing a single trip, and its result changes the plan more than any of the twenty-six sources above. `JUDGMENT:` It should also be the one place where the plan is allowed to be *wrong fast*: if the owner will not follow a one-street guide they wrote themselves, no amount of Q4A–Q4F correctness will save the project.

---

## Sources

**Scope, streaming and travel games**
- https://en.wikipedia.org/wiki/Mini_Metro_(video_game)
- https://en.wikipedia.org/wiki/GeoGuessr
- https://en.wikipedia.org/wiki/Shenmue_(video_game)
- https://en.wikipedia.org/wiki/Persona_5
- https://en.wikipedia.org/wiki/Kamurocho
- https://en.wikipedia.org/wiki/Yakuza_(franchise)
- https://80.lv/articles/like-a-dragon-devs-on-the-effective-reuse-of-kamuroch-map-assets
- https://en.wikipedia.org/wiki/80_Days_(2014_video_game)
- https://www.inklestudios.com/press/80days/
- https://www.inklestudios.com/80days/
- https://en.wikipedia.org/wiki/Kind_Words_(video_game)
- https://en.wikipedia.org/wiki/Coffee_Talk_(video_game)
- https://en.wikipedia.org/wiki/Neo_Cab
- https://en.wikipedia.org/wiki/VA-11_Hall-A
- https://en.wikipedia.org/wiki/Wilmot%27s_Warehouse
- https://en.wikipedia.org/wiki/Mini_Motorways
- https://en.wikipedia.org/wiki/The_Sims_4

**Time, schedules and NPC architecture**
- https://stardewvalleywiki.com/Time
- https://en.wikipedia.org/wiki/Animal_Crossing_(video_game)
- https://en.wikipedia.org/wiki/The_Legend_of_Zelda:_Majora%27s_Mask
- https://www.eurogamer.net/zelda-majoras-mask-time-mechanic-originally-rewound-a-week
- https://gdcvault.com/play/1027018/Census-The-Systemic-Backbone-Behind
- https://gdcvault.com/play/1013459/Three-States-and-a-Plan
- https://gamedev.net/news/5526-supporting-thousands-of-npcs-in-kingdom-come-deliverance-kingdom-come/

**Narrative tooling**
- https://registry.npmjs.org/inkjs/latest
- https://www.inklestudios.com/ink/
- https://docs.yarnspinner.dev/faq.md
- https://docs.yarnspinner.dev/llms.txt
- https://github.com/YarnSpinnerTool/YarnSpinner/releases/latest
- https://raw.githubusercontent.com/klembot/twinejs/develop/LICENSE
- https://raw.githubusercontent.com/tmedwards/tweego/master/LICENSE
- https://www.choiceofgames.com/terms/
- https://www.renpy.org/doc/html/license.html
- https://www.articy.com/en/pricing/
- https://assetstore.unity.com/packages/tools/behavior-ai/dialogue-system-for-unity-11672

**Mechanics references**
- https://en.wikipedia.org/wiki/Papers,_Please
- https://dukope.com/devlogs/papers-please/
- https://dukope.com/devlogs/obra-dinn/
- https://en.wikipedia.org/wiki/Heaven%27s_Vault
- https://www.inklestudios.com/press/heavensvault/
- https://www.inklestudios.com/heavensvault/
- https://en.wikipedia.org/wiki/Chants_of_Sennaar
- https://en.wikipedia.org/wiki/Tunic_(video_game)
- https://en.wikipedia.org/wiki/Recettear
- https://en.wikipedia.org/wiki/Moonlighter_(video_game)
- https://en.wikipedia.org/wiki/Desert_Bus
- https://en.wikipedia.org/wiki/Where_the_Water_Tastes_Like_Wine

**Maps, OSM licensing and web platforms**
- https://www.openstreetmap.org/copyright
- https://www.openstreetmap.org/copyright/en
- https://osmfoundation.org/wiki/Licence/Community_Guidelines
- https://wiki.openstreetmap.org/wiki/OpenStreetMap_in_video_games
- https://wiki.openstreetmap.org/wiki/Software/Video_games
- https://www.openstreetmap.org/user/Rovastar/diary/42850
- https://www.polygon.com/2017/12/4/16725748/pokemon-go-map-changes-openstreetmap/
- https://en.wikipedia.org/wiki/Microsoft_Flight_Simulator_(2020_video_game)
- https://developers.poki.com/
- https://docs.crazygames.com/
- https://partner.steamgames.com/doc/store/ai_content
- https://partner.steamgames.com/doc/gettingstarted/contentsurvey
- https://tech.yahoo.com/gaming/articles/steam-updates-ai-disclosure-form-225124993.html
- https://docs.unity3d.com/Manual/webgl-building.html
- https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html

**i18n and fonts**
- https://registry.npmjs.org/i18next/latest
- https://registry.npmjs.org/react-i18next/latest
- https://registry.npmjs.org/react-intl/latest
- https://registry.npmjs.org/intl-messageformat/latest
- https://registry.npmjs.org/@lingui%2Fcore/latest
- https://registry.npmjs.org/@tolgee%2Freact/latest
- https://registry.npmjs.org/typesafe-i18n/latest
- https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/LICENSE
- https://raw.githubusercontent.com/adobe-fonts/source-han-sans/release/LICENSE.txt
- https://github.com/notofonts/noto-cjk/releases/latest
- https://fonttools.readthedocs.io/en/latest/subset/
- https://developers.google.com/fonts/docs/getting_started
- https://github.com/pixelcog/glyphhanger

**Save, determinism, LLM reproducibility**
- https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
- https://registry.npmjs.org/seedrandom/latest
- https://registry.npmjs.org/pure-rand/latest
- https://raw.githubusercontent.com/davidbau/seedrandom/master/README.md
- https://raw.githubusercontent.com/dubzzz/pure-rand/main/README.md
- https://registry.npmjs.org/dexie/latest
- https://registry.npmjs.org/idb/latest
- https://registry.npmjs.org/localforage/latest
- https://registry.npmjs.org/msw/latest
- https://registry.npmjs.org/nock/latest
- https://developers.openai.com/api/docs/guides/prompt-caching
- https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- https://lakefs.io/blog/toggle-openai-model-determinism/
- https://community.openai.com/t/chatcompletions-are-not-deterministic-even-with-seed-set-temperature-0-top-p-0-n-1/685769

**Scope benchmarks and dev timelines**
- https://www.gamedeveloper.com/design/finding-smart-shortcuts-in-a-short-hike-postmortem-unlocking-the-vault-4
- https://www.wired.com/story/billy-basso-animal-well-whats-next-gdc/
- https://www.pocketgamer.biz/i-dont-think-i-would-have-rated-balatro-higher-than-an-8-and-i-made-the-damn-thing/
- https://en.wikipedia.org/wiki/Balatro
- https://en.wikipedia.org/wiki/Undertale
- https://en.wikipedia.org/wiki/A_Short_Hike
- https://en.wikipedia.org/wiki/Unpacking_(video_game)
- https://en.wikipedia.org/wiki/Venba_(video_game)
- https://en.wikipedia.org/wiki/Wanderstop
- https://registry.npmjs.org/@react-three%2Ffiber/latest
- https://registry.npmjs.org/phaser/latest
- https://registry.npmjs.org/pixi.js/latest

**Steam store API (release dates and developers)**
- https://store.steampowered.com/api/appdetails?appids=413150&languages=english (Stardew Valley)
- https://store.steampowered.com/api/appdetails?appids=391540&languages=english (Undertale)
- https://store.steampowered.com/api/appdetails?appids=239030&languages=english (Papers, Please)
- https://store.steampowered.com/api/appdetails?appids=653530&languages=english (Return of the Obra Dinn)
- https://store.steampowered.com/api/appdetails?appids=1055540&languages=english (A Short Hike)
- https://store.steampowered.com/api/appdetails?appids=1135690&languages=english (Unpacking)
- https://store.steampowered.com/api/appdetails?appids=1491670&languages=english (Venba)
- https://store.steampowered.com/api/appdetails?appids=702670&languages=english (Donut County)
- https://store.steampowered.com/api/appdetails?appids=839870&languages=english (Wilmot's Warehouse)
- https://store.steampowered.com/api/appdetails?appids=1127500&languages=english (Mini Motorways)
- https://store.steampowered.com/api/appdetails?appids=914800&languages=english (Coffee Talk)
- https://store.steampowered.com/api/appdetails?appids=1299460&languages=english (Wanderstop)
- https://store.steampowered.com/api/appdetails?appids=813230&languages=english (Animal Well)
- https://store.steampowered.com/api/appdetails?appids=2379780&languages=english (Balatro)
- https://store.steampowered.com/api/appdetails?appids=381780&languages=english (80 Days)
- https://store.steampowered.com/api/appdetails?appids=774201&languages=english (Heaven's Vault)
- https://store.steampowered.com/api/appdetails?appids=1931770&languages=english (Chants of Sennaar)
- https://store.steampowered.com/api/appdetails?appids=553420&languages=english (TUNIC)
- https://store.steampowered.com/api/appdetails?appids=1632490&languages=english (Shashingo)
- https://store.steampowered.com/api/appdetails?appids=70400&languages=english (Recettear)
- https://store.steampowered.com/api/appdetails?appids=606150&languages=english (Moonlighter)
- https://store.steampowered.com/api/appdetails?appids=287980&languages=english (Mini Metro)
- https://store.steampowered.com/api/appdetails?appids=726110&languages=english (Overcrowd)
- https://store.steampowered.com/api/appdetails?appids=808090&languages=english (Bury Me, My Love)
- https://store.steampowered.com/api/appdetails?appids=1051410&languages=english (Wanderlust: Travel Stories)
- https://store.steampowered.com/api/appdetails?appids=447120&languages=english (Where the Water Tastes Like Wine)
- https://store.steampowered.com/api/appdetails?appids=931310&languages=english (Airplane Mode)
- https://store.steampowered.com/api/appdetails?appids=794540&languages=english (Neo Cab)
- https://store.steampowered.com/api/appdetails?appids=447530&languages=english (VA-11 Hall-A)
- https://store.steampowered.com/api/appdetails?appids=758330&languages=english (Shenmue I & II)
- https://store.steampowered.com/api/appdetails?appids=1222670&languages=english (The Sims 4)
- https://store.steampowered.com/api/appdetails?appids=1687950&languages=english (Persona 5 Royal)
