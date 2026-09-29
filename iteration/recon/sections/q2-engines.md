## Q2 — Engine / library selection for a browser 2.5D game

**Evidence date: 2026-09-28.** Every version number, date, price and size below was pulled on that date from the npm registry, GitHub release Atom feeds, or the vendor's own docs/pricing pages — all of which were fetched, not recalled. `web_fetch` is blocked in this environment (hostnames resolve into a non-public proxy range), so everything was retrieved over the harness shell network path. Where I could not confirm a figure I write **UNVERIFIED:** and say exactly what is missing. `JUDGMENT:` marks my own reasoning.

**The legacy SPA, as it actually exists in this repo** (read from [package.json](D:/All-Downloads/TourGuideAI/package.json)): `react ^18.2.0`, `react-dom ^18.2.0`, `react-scripts ^5.0.1` (CRA/webpack), `@mui/material ^5.14.5`, `express ^4.21.2`, `openai ^4.0.0`, `@react-google-maps/api ^2.19.2`. **React 18 is the hard architectural fact that decides half of this section** — see Q2.2.

---

### Q2.1 Versions, latest releases, maintenance status (verified 2026-09-28)

| # | Option | Latest stable | Published | Release cadence (observed) | Licence |
|---|---|---|---|---|---|
| 1 | **PixiJS** | `pixi.js` **8.21.0** | 2026-09-17 | ~5 stable releases in the last 12 months (8.18.1 2026-04-14, 8.19.0 2026-06-04, 8.20.0 2026-08-20, 8.20.1 2026-08-26, 8.21.0 2026-09-17) | MIT |
| 1b | **@pixi/react** | **8.0.5** | **2025-12-01** | **Stale — no release in ~10 months** (8.0.3 2025-07-24, 8.0.4 2025-11-18, 8.0.5 2025-12-01) | MIT |
| 2 | **Phaser 4** | `phaser` **4.2.1** | 2026-07-09 | 4.0.0 stable **2026-04-10**, 4.1.0 2026-04-30, 4.2.0 2026-06-19, 4.2.1 2026-07-09 | MIT |
| 2b | **Phaser 3** | **3.90.0** | **2025-05-23** | Line effectively frozen — 3.90.0 is the newest 3.x on npm | MIT |
| 3 | **three.js** | **0.186.1** (r186) | 2026-09-24 | ~every 4–8 weeks (r182 2025-12-10, r183.0 2026-02-18, r184.0 2026-04-16, r185.0 2026-06-25, r186.0 2026-09-08) | MIT |
| 4 | **Babylon.js** | `@babylonjs/core` **9.28.0** | 2026-09-24 | **Patch-per-few-days** (9.26.0 09-10, 9.26.1 09-14, 9.26.2 09-16, 9.27.0 09-17, 9.27.1 09-18, 9.28.0 09-24); 9.0 announced 2026-03-26 | Apache-2.0 |
| 5 | **PlayCanvas** | `playcanvas` **2.22.6** | 2026-09-28 | Very high (2.22.6 and 2.23.0-beta.22 both shipped 2026-09-28) | MIT (engine) |
| 5b | **@playcanvas/react** | **0.11.7** | 2026-09-25 | Active; 0.x — pre-1.0 | MIT |
| 6 | **Godot** | **4.7.2-stable** | 2026-08-22 | 4.7-stable 2026-06-18/19, 4.7.1 2026-07-14, 4.7.2 2026-08-22; 3.6.3-stable 2026-08-22 | MIT |
| 7 | **Unity** | **6000.6.3f1** (Unity 6.6) | docs built 2026-09-26 | Feature streams + patches; 6000.6 is the current stream | Proprietary |
| 8 | **Defold** | **1.13.1-stable** | 2026-08-17 | 1.13.2-beta 2026-09-24, 1.14.0-alpha 2026-09-28 → ~monthly stable, weekly alphas | Source-available "developer-friendly" licence (not MIT) |
| 9 | **React + hand-rolled Canvas/WebGL** | n/a (browser API) | n/a | n/a | n/a |
| 10 | **@react-three/fiber** | **9.8.1** | 2026-09-24 | v10.0.0-alpha.5 2026-09-08; v9 line active | MIT |

Sources: npm registry metadata ([pixi.js](https://registry.npmjs.org/pixi.js), [phaser](https://registry.npmjs.org/phaser), [three](https://registry.npmjs.org/three), [@babylonjs/core](https://registry.npmjs.org/@babylonjs/core), [playcanvas](https://registry.npmjs.org/playcanvas), [@playcanvas/react](https://registry.npmjs.org/@playcanvas/react), [@pixi/react](https://registry.npmjs.org/@pixi/react), [@react-three/fiber](https://registry.npmjs.org/@react-three/fiber), [@react-three/drei](https://registry.npmjs.org/@react-three/drei)); GitHub release feeds ([pixijs/pixijs](https://github.com/pixijs/pixijs/releases.atom), [phaserjs/phaser](https://github.com/phaserjs/phaser/releases.atom), [mrdoob/three.js](https://github.com/mrdoob/three.js/releases.atom), [BabylonJS/Babylon.js](https://github.com/BabylonJS/Babylon.js/releases.atom), [playcanvas/engine](https://github.com/playcanvas/engine/releases.atom), [godotengine/godot](https://github.com/godotengine/godot/releases.atom), [defold/defold](https://github.com/defold/defold/releases.atom), [pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber/releases.atom), [pixijs/pixi-react](https://github.com/pixijs/pixi-react/releases.atom)).

**Phaser 3 → Phaser 4 migration story (verified).** Phaser 4 is a full renderer rebuild: v3 "pipelines" are replaced by single-purpose **render nodes**; FX and masks are unified into one **Filter** system usable on any game object or camera; `setTintFill()` becomes `setTint()` + `setTintMode()`; lighting becomes one call (`sprite.setLighting(true)`, `light.z`); `Geom.Point` is replaced by `Vector2`; `Math.TAU` is *corrected* from the buggy v3 `PI/2` to `PI*2`; `Phaser.Struct.Set`/`Map` become native `Set`/`Map`; `DynamicTexture` now requires `render()`; `roundPixels` now defaults to `false`; compressed textures must be re-compressed for the new internal Y-axis orientation. Removed with no direct replacement: **Mesh and Plane game objects, and the Camera3D / Layer3D plugins** — plus the bundled Spine 3/4 plugins are no longer updated. Phaser's own summary: most games using sprites/text/tilemaps "are probably looking at a few hours of work"; custom WebGL code "will need more time" ([migration article](https://www.phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know), [3 vs 4 article](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4)). `JUDGMENT:` the Camera3D/Layer3D removal matters here — if the 2.5D look was ever planned as "3D camera over 2D art", that route is explicitly gone in Phaser 4.

**WebGPU status per engine (verified):**
- **PixiJS**: WebGPU ships but is **not production-default**. PixiJS's own renderer doc marks `WebGLRenderer` "✅ Recommended" and `WebGPURenderer` "🚧 Experimental", and states: "The WebGPU renderer is feature complete, however, inconsistencies in browser implementations may lead to unexpected behavior. **It is recommended to use the WebGL renderer for production applications.**" ([PixiJS renderers](https://pixijs.com/8.x/guides/components/renderers.md)).
- **three.js**: ships a WebGPU renderer (`three/webgpu`), but R3F's own migration doc calls it "still a work in progress and not fully backward-compatible with all of Three's features" ([R3F v9 migration guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)).
- **Babylon.js**: Babylon 9 features (Clustered Lighting, Volumetric Lighting via WebGPU compute) "work on both WebGPU and WebGL 2" with "graceful fallbacks" ([Babylon.js 9.0 announcement](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0/)).
- **Godot**: "Godot currently does not support WebGPU, which is a prerequisite for allowing Forward+/Mobile to run on the web platform" ([Godot: Exporting for the Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)).
- **Unity**: Web builds are **WebGL 2 only** — "The browser is WebGL 2 capable" is a stated support precondition ([Unity: Web browser compatibility](https://docs.unity3d.com/Manual/webgl-browsercompatibility.html)).

---

### Q2.2 How each option coexists with React in ONE SPA

This is the decisive section for this project, because the binding you can actually install is constrained by **React 18**.

**Peer-dependency reality check (npm metadata, 2026-09-28):**

| Binding | Version | `peerDependencies` | Works on React 18.2? |
|---|---|---|---|
| `@pixi/react` | 8.0.5 | `react >=19.0.0`, `pixi.js ^8.2.6` | **No** |
| `@pixi/react` | 7.1.2 (2024-03-20) | `react >=17.0.0` + a dozen `@pixi/* >=6.0.0` peers | Yes, but it targets **PixiJS v6/v7 modular packages**, not `pixi.js@8` |
| `@react-three/fiber` | 9.8.1 | `react >=19 <19.4`, `three >=0.156` | **No** |
| `@react-three/fiber` | 8.18.0 (2025-02-19) | `react >=18 <19`, `three >=0.133` | Yes — last React 18 line |
| `@react-three/drei` | 10.7.9 | `react ^19`, `@react-three/fiber ^9.0.0` | **No** |
| `@playcanvas/react` | 0.11.7 | `react ^18.3.1 \|\| ^19.1.0`, `playcanvas ^2.11.8` | **Yes** |
| `react-babylonjs` (community) | 4.0.2 | `react >=19`, `@babylonjs/core >=8.32.0 <10` | No (use `r18` dist-tag → 3.4.0, 2026-05-26) |
| Phaser | 4.2.1 | no React peer — framework-agnostic | Yes (no binding involved) |

The PixiJS React v8 rewrite was announced 2025-03-26 and is explicitly "designed exclusively for React 19"; the maintainer's own post says "we recognize that this places significant hurdles in the upgrade path for our **React 18** users" ([Introducing PixiJS React v8](https://pixijs.com/blog/pixi-react-v8-live)). It was rebuilt on a new `react-reconciler` and is "heavily inspired by @react-three/fiber". `JUDGMENT:` the practical reading is that **@pixi/react v8 is unavailable to this repo until React is upgraded to 19**, and v7 is not a substitute because it does not drive `pixi.js@8`.

**Two architectural patterns, and which libraries fit each:**

1. **Imperative canvas as an opaque island (recommended shape).** React owns the DOM shell (MUI chrome, routing, forms, the guide export UI); a single `<div ref>` is handed to an engine that owns the canvas and its own `requestAnimationFrame` loop. React never re-renders per frame and the engine never touches React state. This is what Phaser, PixiJS-without-a-binding, three.js-without-R3F, PlayCanvas-engine-standalone, Godot, Unity and hand-rolled Canvas2D all give you. `JUDGMENT:` for a 1-owner + AI-agents team this is the pattern with the smallest new surface area, because the boundary is one ref and one `destroy()`.
2. **Declarative scene graph as React components.** R3F and `@pixi/react` v8 (and the R3F-inspired PlayCanvas React) reconcile scene nodes through React. You get ergonomic composition and Suspense-based asset loading, but every scene object is a React element, so **scene complexity becomes React reconciliation cost**, and the frame loop must be kept out of render via `useFrame`/`invalidate`. R3F's own performance primer addresses exactly this: use `frameloop="demand"` for on-demand rendering, call `invalidate()` to schedule frames, cache with `useLoader`, and instance repeated objects ([R3F: Scaling performance](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx)).

**React 18 StrictMode double-mount pitfalls (verified as a general React behaviour, and as a real class of bug for canvas libraries).** React's own docs: "Your components will re-render an extra time to find bugs caused by impure rendering" and "Your components will re-run Effects an extra time to find bugs caused by missing Effect cleanup" ([react.dev StrictMode](https://react.dev/reference/react/StrictMode)). Concrete canvas-library evidence of the failure mode: `p5-wrapper/react` issue **#255** is literally titled "React's strict mode causes the canvas to be created twice" ([issue](https://github.com/p5-wrapper/react/issues/255)); a Stack Overflow question titled "Phaser 3 - Duplicate Canvas component is created when creating a new instance of Phaser 3 GameObject in React" reports the same shape for Phaser ([SO 73368742](https://stackoverflow.com/questions/73368742/phaser-3-duplicate-canvas-component-is-created-when-creating-a-new-instance-of)). **Note:** that SO page returned HTTP 403 to my fetch, so I am citing the question title only — I could not read the answers. R3F, which is the most React-native option, states in its v9 guide: "This release contains breaking changes when using Strict Mode, which can highlight bugs during development" ([R3F v9 migration](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)).

`JUDGMENT:` the mitigation is the same in every case and is cheap if designed in from day one — create the engine instance **inside** the effect, return a `destroy()` that removes the canvas and cancels the RAF/ticker, and never construct the engine in a `useMemo` or module scope. Engines that ship a single `destroy()` (Phaser's `game.destroy(true)`, PixiJS `app.destroy()`, three.js `renderer.dispose()` + `forceContextLoss()`) make this a 10-line effect. Concurrent rendering is not a problem for pattern (1) at all, because the game state lives outside React; it becomes a problem for pattern (2) only if you drive the scene from React state at frame rate.

**AI-agent relevance (a real, not soft, factor here).** Phaser markets AI-readiness explicitly and concretely: "Every frontier model knows the Phaser API deeply, so we were careful to ensure this knowledge carried over", plus shippable "skills files" for agents ([phaser.io](https://phaser.io/)); the 3-vs-4 article repeats the claim and notes the v4 design deliberately preserved API familiarity ([Phaser 3 vs 4](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4)). Phaser also ships official integration templates for **React, Vue, NextJS, Svelte, Remix, SolidJS** and multiple bundlers ([phaser.io](https://phaser.io/)). `JUDGMENT:` for a team whose labour is mostly AI agents, a well-known API with vendor-supplied agent context is worth more than a nominally more elegant architecture.

---

### Q2.3 Out-of-the-box 2.5D / isometric support

| Option | Isometric tilemaps | Y-sort / depth sort | 2D-in-3D or ortho 2.5D |
|---|---|---|---|
| **Phaser 4** | **Yes**, in the standard tilemap path: `Phaser.Tilemaps.Parsers.FromOrientationString` recognises `'isometric'`, `'staggered'`, `'hexagonal'`, defaulting to orthogonal ([Phaser 4.0.0 Tilemaps.Parsers](https://docs.phaser.io/api-documentation/4.0.0/namespace/tilemaps-parsers)) | Yes — Phaser has an explicit depth/index model for game objects | Camera3D and Layer3D plugins were **removed in v4** ([migration article](https://www.phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know)) |
| **Phaser 4 GPU tilemap** | **No** — `TilemapGPULayer` is documented as "orthographic maps only" | n/a | n/a |
| **PixiJS v8** | No engine-level isometric tilemap; you position sprites yourself | Yes — containers are z-sortable (`sortableChildren` / `zIndex` is the standard v8 pattern) | No 3D camera; PixiJS docs instead document *mixing PixiJS with three.js* via `resetState()` on both renderers ([PixiJS renderers](https://pixijs.com/8.x/guides/components/renderers.md)) |
| **three.js** | No tilemap concept at all | Manual (`renderOrder`, depth, or sort yourself) | **Native** — `OrthographicCamera` is a core class |
| **Babylon.js** | No tilemap concept | Manual | **Native** — orthographic camera mode on the camera component |
| **PlayCanvas** | No tilemap concept | Manual | **Native** — camera "Projection — perspective vs orthographic projection" is a documented camera section ([PlayCanvas cameras](https://developer.playcanvas.com/user-manual/graphics/cameras/)) |
| **Godot** | **Native** `TileMapLayer` / tilemap nodes + `y_sort_enabled` are engine features (see Godot 4.7 release notes for tilemap/2D work, [Godot 4.7](https://godotengine.org/releases/4.7/)) — but see Q2.7 for the web-export penalty | | Orthographic camera native; Forward+/Mobile not available on web |
| **Unity** | 2D Tilemap + isometric tilemap support in the editor; `JUDGMENT:` strong tooling, but the runtime cost on web is the problem (Q2.7) | | Native |
| **Defold** | Tilemap component is built in | Manual | Orthographic camera available |
| **Hand-rolled Canvas2D** | You write it | You write it | You write it |

**`JUDGMENT:`** For this project the honest question is whether the 2.5D look is **true isometric** or **top-down-with-Y-sorting** (classic JRPG). Top-down-with-Y-sort keeps every engine's fast path open, including Phaser 4's `TilemapGPULayer`. True isometric immediately disqualifies Phaser 4's GPU tilemap layer and pushes you to hand-managed depth sorting in every engine — including the 3D ones, where you would be fighting a 3D scene graph to get 2D painter's-order right. **Recommendation: commit to top-down + Y-sort now**; it is the single cheapest decision available on this list and it preserves the best-performing rendering path in the strongest candidate.

---

### Q2.4 Tilemap tooling

| Option | Tiled | LDtk | Notes |
|---|---|---|---|
| **Phaser 4** | **First-class, built in**: `this.load.tilemapTiledJSON(key, url)` and `this.load.tilemapCSV(...)` are documented loader methods, and orientation strings are parsed natively ([Phaser Loader](https://docs.phaser.io/phaser/concepts/loader), [Parsers](https://docs.phaser.io/api-documentation/4.0.0/namespace/tilemaps-parsers)) | Not built in — community | No third-party dependency to maintain |
| **PixiJS v8** | Community only — e.g. the `pixijs-userland` org maintains a [pixi-ldtk-loader](https://github.com/pixijs-userland/pixi-ldtk-loader) | Community | Extra dependency + its own maintenance risk |
| **three.js / Babylon / PlayCanvas** | Community tilemap loaders only; no engine-level tilemap object | Community | `JUDGMENT:` you are building a tilemap system, not loading one |
| **Godot / Defold** | Native tilemap nodes/components | Native/community | Strongest raw tilemap tooling — but see web-export constraints |

Tiled itself is actively developed: the `mapeditor/tiled` release feed shows `scripting-beta2/3/4/5` shipping through 2026-09-07 → 2026-09-17 ([feed](https://github.com/mapeditor/tiled/releases.atom)). **LDtk looks dormant for editor releases** — the newest LDtk release in the feed is **1.5.3 on 2024-01-15** ([feed](https://github.com/deepnight/ldtk/releases.atom)). `JUDGMENT:` that alone is a reason to standardise the pipeline on **Tiled**, which is also what Phaser supports natively.

---

### Q2.5 Asset pipeline (atlases, glTF, KTX2/Basis) — see Q2.11 for runtime-generated images

- **PixiJS v8**: compressed textures are supported but **must be explicitly registered**: `import 'pixi.js/ktx2'` / `'pixi.js/basis'` / `'pixi.js/dds'` / `'pixi.js/ktx'`, and the imports must run *before* any `Assets.load`. AssetPack can auto-generate `.basis`/`.ktx2`/`.dds` variants and PixiJS picks the best one for the device ([PixiJS compressed textures](https://pixijs.com/8.x/guides/components/assets/compressed-textures)).
- **Phaser 4**: has its own atlas format (**PCT — Phaser Compact Texture**, "typically 90–95% smaller than equivalent JSON atlases") plus spritesheet/atlas loaders; note the v4 breaking change that **compressed textures must be re-compressed for the new internal Y-axis orientation** ([Phaser 3 vs 4](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4), [migration article](https://www.phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know)).
- **three.js**: glTF/GLB via `GLTFLoader` in `three/addons`; KTX2 via `KTX2Loader` — **UNVERIFIED:** I did not fetch the three.js addons docs page in this session, so treat the loader names as expected-but-unconfirmed for this report.
- **Babylon.js**: has a mature glTF/GLB pipeline and its own texture/compression tooling; Babylon 9 adds an "offline texture processing tool" for area-light emission textures ([Babylon 9](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0/)). **UNVERIFIED:** I did not fetch Babylon's KTX2/glTF doc pages directly.
- **Unity**: for web specifically, Unity's own mobile guidance is to "Use ASTC compressed textures where possible" and to prefer **8×8 block sizes** "for a good balance between quality and size that optimizes for download time over a mobile network" ([Unity: Optimize Web platform for mobile](https://docs.unity3d.com/Manual/web-optimization-mobile.html)).

`JUDGMENT:` for a 2D sprite game the atlas question matters more than glTF. PixiJS's explicit-loader model is a small trap (forget the import and KTX2 silently fails); Phaser's single built-in atlas path is fewer moving parts.

---

### Q2.6 TypeScript story

All the serious candidates ship **first-class bundled types**, verified from the npm `types` field:

| Package | `types` field | Verdict |
|---|---|---|
| `pixi.js@8.21.0` | `lib/index.d.ts` | First-class TS |
| `phaser@4.2.1` | `./types/phaser.d.ts` | First-class TS |
| `@babylonjs/core@9.28.0` | `index.d.ts` | First-class TS |
| `playcanvas@2.22.6` | `build/playcanvas.d.ts` | First-class TS |
| `three@0.186.1` | **empty** | **Needs `@types/three`** — currently `@types/three@0.186.0` (2026-09-11), i.e. DefinitelyTyped tracks three.js releases closely |
| `@pixi/react@8.0.5` | `types/index.d.ts` | First-class |
| `@react-three/fiber@9.8.1` | `dist/react-three-fiber.cjs.d.ts` | First-class |
| `@react-three/drei@10.7.9` | `index.d.ts` | First-class |
| `react-babylonjs@4.0.2` | **none** | Community binding, no `types` field |

`JUDGMENT:` TypeScript is a non-differentiator here — every candidate is fine. The one historical exception, Phaser's types quality, is **UNVERIFIED** in this session: I did not fetch the issue threads that would substantiate or refute the old complaints, and I am not going to assert them from memory. What I *can* verify is that `phaser@4.2.1` ships its own `.d.ts`, which is the current state.

---

### Q2.7 Long-term maintenance risk / bus factor

| Option | Who maintains it | Funding / commercial arm | Licence |
|---|---|---|---|
| **PixiJS** | PixiJS team + community | Donation-funded via **Open Collective**: Backer from **$2/mo**, Bronze Sponsor **$100/mo**, Silver **$250/mo**, Gold **$500/mo** ([Open Collective](https://opencollective.com/pixijs)) | MIT |
| **Phaser** | **Phaser Studio Inc.** (company) | Core framework "free and open-source… and it always will be"; commercial arm is **Phaser Editor at $12/month**, Enterprise custom ([Phaser pricing](https://phaser.io/pricing)) | MIT |
| **three.js** | mrdoob + a large contributor base | Community/sponsors ([repo](https://github.com/mrdoob/three.js)) | MIT |
| **Babylon.js** | **Microsoft** — announced on the Windows Developer Blog, authored by Microsoft staff ([Babylon 9 announcement](https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0/)) | Corporate-backed | Apache-2.0 |
| **PlayCanvas** | PlayCanvas Ltd. | Editor tiers: **Free $0**, **Personal $15/mo**, **Organization $50/seat/mo**; "PlayCanvas is free and open source. These plans unlock additional Editor features" ([PlayCanvas plans](https://playcanvas.com/plans)). Wikipedia states the company was acquired by **Snap Inc. in 2017**, citing Business Insider — **single secondary source, not independently confirmed by me** ([Wikipedia](https://en.wikipedia.org/wiki/PlayCanvas)) | MIT (engine) |
| **Godot** | **Godot Foundation** | Donations/Development Fund; "© 2007-2026 Juan Linietsky, Ariel Manzur and contributors. Hosted by the Godot Foundation" ([Godot 4.7](https://godotengine.org/releases/4.7/)) | **MIT** ([godotengine.org/license](https://godotengine.org/license/)) |
| **Unity** | Unity Technologies | Commercial. **Runtime Fee cancelled 2024-09-12** (see Q2.8) | Proprietary |
| **Defold** | **Defold Foundation** (Stockholm, Sweden) | FAQ: "Is Defold still owned by King? **A: No, Defold has been donated to the Defold Foundation. King holds a single seat on the Defold board but has no direct influence on the future of Defold.**" Objectives are protected by Swedish foundation law and cannot change; the foundation "shall not allow third parties to commercialize the software's source code" ([defold.com/open](https://defold.com/open/)) | Source-available, **not** MIT |
| **@react-three/fiber / drei** | pmndrs (Poimandres collective) | Community | MIT |
| **@pixi/react** | PixiJS org, one named maintainer ("Trezy, Pixi React Maintainer") | Community | MIT |

`JUDGMENT:` Two distinct risks here. **(a) Stale-binding risk** is the one that actually threatens this project: `@pixi/react` has not shipped since 2025-12-01 while `pixi.js` shipped 8.21.0 on 2026-09-17 — a ~10-month gap between the React binding and its engine, on a package that on its own blog is described as maintained by a single named maintainer. **(b) Engine-death risk** is low across the board: every engine except Unity is either MIT/Apache-2.0 or foundation-protected. Defold's structure is the strongest anti-enshittification guarantee on the list (the licence literally cannot be changed), but Defold is also the option with the weakest fit here.

---

### Q2.8 WebGPU vs WebGL2 in 2025–2026 (caniuse data, fetched 2026-09-28)

| Feature | Global usage | Key browser status |
|---|---|---|
| **WebGPU** | **85.72% + 1.63% = 87.35%** | Chrome **113+** ✅; Edge **113+** ✅; **Safari 26.0+ supported, but Safari 17.4–18.7 "Disabled by default"**; **Firefox still disabled by default through 156–159**; Opera 99+ ✅; **iOS Safari 26.0+ ✅ / 17.4–18.7 disabled**; Chrome for Android ✅; Samsung Internet 24+ ✅; Firefox for Android 156 disabled; Opera Mini / UC / QQ / Baidu ❌ |
| **WebGL 2.0** | **96.44%** | Chrome 56+ ✅; Safari **15+** ✅; **iOS Safari 15+** ✅; Firefox 51+ ✅; all Android browsers listed ✅ |

Source: [caniuse.com/webgpu](https://caniuse.com/webgpu), [caniuse.com/webgl2](https://caniuse.com/webgl2) (usage stats by StatCounter, August 2026).

**Does WebGPU matter for this project? No — and the docs agree.** `JUDGMENT, backed by the primary docs:` every engine that matters here either tells you not to use WebGPU in production (PixiJS: "recommended to use the WebGL renderer for production applications"), or is still finishing it (three.js: WebGPU renderer "still a work in progress"), or does not have it at all on web (Godot: "currently does not support WebGPU"; Unity Web: WebGL 2 required). The ~9-point usage gap is dominated by exactly the cohort that matters for a phone-played game: **iOS users below Safari 26 / Firefox users of any version**. The correct 2026 decision is to target **WebGL 2**, which sits at 96.44% and is supported on iOS Safari 15+, and to treat WebGPU as an opportunistic upgrade behind a capability check, not a requirement.

---

### Q2.9 Realistic 2.5D browser performance — what is actually published

Published, citable numbers are **thin**. What exists:

| Claim | Source | Type |
|---|---|---|
| "Render **over a million animated sprites in a single draw call** — up to **100 times faster** than before" | [phaser.io](https://phaser.io/) | Vendor claim |
| `SpriteGPULayer`: "can handle **a million or more sprites** with the same performance cost as a few hundred"; trade-off is "**168 bytes of memory per member on both CPU and GPU**"; uses a single texture image, **not** a multi-atlas; "modifying members is expensive" | [Phaser: Render Thousands of Sprites](https://www.phaser.io/news/2026/05/phaser4-spritegpulayer-performance) | Vendor blog |
| `TilemapGPULayer`: "renders an entire tilemap layer as a single quad… rendering cost is fixed per pixel on screen regardless of how many tiles are visible. Zoom out to see 16 million tiles and it renders just as fast"; **maximum size 4096 × 4096 tiles; orthographic maps only** | [Phaser: Render Thousands of Sprites](https://www.phaser.io/news/2026/05/phaser4-spritegpulayer-performance) | Vendor blog |
| Standard Phaser rendering uploads per-sprite transforms to the GPU every frame; "For a few hundred sprites, that's fine. For tens of thousands, it starts to hurt. For hundreds of thousands, it simply won't work." | [Phaser: Render Thousands of Sprites](https://www.phaser.io/news/2026/05/phaser4-spritegpulayer-performance) | Vendor blog |
| PixiJS `ParticleContainer`: "Render **hundreds of thousands or even millions of particles** with high FPS" — flagged as an **experimental API** whose interface may evolve | [PixiJS ParticleContainer](https://pixijs.com/8.x/guides/components/scene-objects/particle-container.md) | Official docs |
| PixiJS batching: "Sprites can be **batched with up to 16 different textures** (dependent on hardware)"; "Sprite masks… are really expensive. Do not use too many in your scene"; "100s of masks will really slow things down" | [PixiJS performance tips](https://pixijs.com/8.x/guides/concepts/performance-tips.md) | Official docs |
| R3F/three.js: "Each mesh is a draw call, you should be mindful of how many of these you employ: **no more than 1000 as the very maximum, and optimally a few hundred or less**" | [R3F: Scaling performance](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx) | Official docs |
| Unity web: "the recommended best practice is to **avoid large numbers of draw calls per frame**, so make sure that both instancing and batching techniques are used"; standard C# jobs are limited to the main thread | [Unity: Web performance considerations](https://docs.unity3d.com/Manual/webgl-performance.html) | Official docs |

**What is not available:** I found **no** independent, reproducible, device-labelled 60 fps benchmark for a 2.5D isometric city scene in any of these engines. **UNVERIFIED:** there is no published "N sprites at 60 fps on a mid-range phone" figure I could retrieve from a primary source. Anyone quoting such a number is estimating.

`JUDGMENT:` For a 2.5D city scene the realistic budget arithmetic is: a full-screen 1920×1080 viewport at 32×32 px tiles is ~2,000 visible tiles; at 64×64 px it is ~500. Both are far below the "hundreds of thousands" thresholds the vendors publish, **provided** the static ground layer is drawn as one batched/GPU tilemap draw and only the dynamic layer (player, NPCs, signage, transit animations) is per-sprite. The binding constraint on a 2.5D scene is therefore **not sprite count — it is (a) draw-call breaks** (texture-atlas discipline: PixiJS explicitly warns that alternating blend modes or exceeding 16 textures per batch de-optimises) and **(b) mobile GPU fill-rate/memory**, not CPU sprite transforms. Practical plan: **one atlas per city style kit**, static ground on a GPU/batched tilemap layer, dynamic layer ≤ a few hundred sprites, and a measured fallback path (lower resolution, fewer dynamic props) rather than an assumed one.

---

### Q2.10 Mobile / touch considerations (phones are the likely target)

- **Canvas/library vs browser constraints (verified):** full-screen and pointer capture can only be entered from a real input handler — Godot: "Browsers do not allow arbitrarily entering full screen. The same goes for capturing the cursor. Instead, these actions have to occur as a response to a JavaScript input event", and the fullscreen project setting "doesn't work unless the engine is started from within a valid input event handler" ([Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)). This constraint is browser-level and applies to every engine on this list — **there is no engine that can auto-fullscreen on load.**
- **Audio requires a user gesture:** "Some browsers restrict autoplay for audio… request the player to click, tap or press a key/button to enable audio" ([Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)). Godot additionally notes that since 4.3, web audio uses sample playback by default and **AudioEffects, reverb, doppler and procedural audio are not supported** in that mode ([same](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)).
- **Storage/persistence on iOS:** Godot requires cookies/IndexedDB for `user://` persistence, notes third-party-cookie requirements inside iframes, and that **incognito/private mode prevents persistence** ([same](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)). Unity separately notes "Apple Safari doesn't support IndexedDB for content running in an iFrame" ([Unity browser compatibility](https://docs.unity3d.com/Manual/webgl-browsercompatibility.html)). `JUDGMENT:` if this SPA is ever embedded in an iframe (store portals, Poki, CrazyGames), **do not rely on IndexedDB in iOS Safari** — keep save state in the server-side account you already have (Express + JWT) rather than client storage. The legacy app already has JWT auth, which makes this the natural path.
- **Background/tab throttling:** Godot pauses the project when the tab loses focus ([same](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)); Unity says background content "only updates once per second in most browsers" and that this makes `Time.time` advance slower than usual ([Unity: Web performance](https://docs.unity3d.com/Manual/webgl-performance.html)). `JUDGMENT:` a turn-based/travel game should **pause on blur by design**; never let the in-game clock depend on wall-clock time, especially given this project's rule that in-game time must equal real-world cost.
- **iOS Safari WebGL 2 caveat:** Godot warns "Safari has several issues with WebGL 2.0 support that other browsers don't have, so we recommend using a Chromium-based browser or Firefox if possible"; Unity notes "Apple Safari doesn't support WebGL 2 in versions before Safari 15" ([Godot](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html), [Unity](https://docs.unity3d.com/Manual/webgl-browsercompatibility.html)). caniuse confirms iOS Safari 15+ supports WebGL 2.0 at 96.44% global ([caniuse webgl2](https://caniuse.com/webgl2)).
- **Concrete numeric mobile limits (canvas size, texture memory caps, per-tab memory ceilings):** **UNVERIFIED.** I did not find these published in a primary source I could fetch in this session. Do not put numbers in the planning report for this; measure on real devices.

`JUDGMENT:` the mobile decision that actually matters is not the engine — it is **build weight on a phone network**. Compare: a Phaser 4 build is ~347 KB gzipped for the whole library ([bundlephobia](https://bundlephobia.com/package/phaser@4.2.1)), versus a Godot web export whose own docs say the `.pck` and `.wasm` "are usually large in size" and recommend Brotli precompression ([Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)), versus a Unity web build measured at **10.7 MB default (3D URP)** and **2.3 MB in a heavily stripped best case** ([aras-p gist](https://gist.github.com/aras-p/740c2d4f9977ce92b7de72b1394dd365)). For a game people reach from a link on a phone, that is the difference between a 1-second and a 20-second load.

---

### Q2.11 Constraints on loading RUNTIME-GENERATED (AI) images as textures

This is the constraint set with the least documentation and the most project-specific risk, so here is what is actually verified plus explicit gaps.

**Verified:**
- **PixiJS v8** changed exactly this API in the v8 migration: "**`Texture.from` no longer will load a texture from a URL.** When using `Texture.from` you will need to pass in a source such as `CanvasSource` / `ImageSource` / `VideoSource` or a resource such as `HTMLImageElement` / `HTMLCanvasElement`" ([PixiJS v8 migration guide](https://pixijs.com/8.x/guides/migrations/v8)). That means a canvas you drew AI output into, or an `HTMLImageElement` you decoded from a blob/data-URI, **is** the sanctioned input — PixiJS v8 is natively friendly to runtime-generated art.
- **Phaser 4**: the loader's image method accepts a URL **or a base64 string**: "`url`: Url of texture, or **base64 string of Uri**" ([Phaser Loader](https://docs.phaser.io/phaser/concepts/loader)). Image and atlas/spritesheet loaders are documented loader methods ([same](https://docs.phaser.io/phaser/concepts/loader)). So an AI image delivered as a data-URI can go straight through the normal asset path.
- **All engines**: any canvas texture path ultimately needs the pixels in a GPU-uploadable form. `JUDGMENT:` the real constraints are generic web constraints, not engine constraints — (i) the image must be **same-origin or CORS-permitted** if you draw it to a canvas and then read it back, otherwise the canvas is tainted; (ii) decode is async, so first-frame availability is not guaranteed; (iii) each unique texture costs GPU memory and each distinct texture in a batch can break batching — PixiJS: "Sprites can be batched with up to **16 different textures** (dependent on hardware)" ([PixiJS performance tips](https://pixijs.com/8.x/guides/concepts/performance-tips.md)) — so N AI-generated images are N potential batch breaks unless you pack them into an atlas.

**UNVERIFIED / explicit gaps:**
- **UNVERIFIED:** whether any engine documents a recommended pattern for *streaming* many runtime-generated textures without leaking GPU memory. PixiJS documents a texture garbage collector and `texture.destroy()` with the advice to "add a random delay to their destruction to remove freezing" when destroying many at once ([PixiJS performance tips](https://pixijs.com/8.x/guides/concepts/performance-tips.md)) — that is the closest thing to official guidance I could retrieve, and it is a warning, not a recipe.
- **UNVERIFIED:** maximum number of distinct textures or maximum texture memory per browser tab on mobile. Not published in any source I could fetch.

**`JUDGMENT:` the architectural rule this implies.** Given this project's fact-integrity contract (facts come from the city pack and carry `source_url` + `verified_at`; narrative is a separate read-only layer), the same separation should be applied to pixels: **AI-generated images must never be the sole representation of a fact-bearing object.** Concretely — an AI-generated *signage texture*, *shopfront illustration* or *NPC portrait* is narrative-layer decoration and is safe to generate at runtime; an AI-generated *station entrance*, *ticket machine*, *platform layout* or *currency note* is a fact-bearing object and must use a **curated, provenance-carrying asset** from the city pack so that the thing the player learns to recognise in-game is the thing they will recognise in Osaka. Engine-wise this is a non-differentiator: every candidate can blit a runtime canvas. It is a data-pipeline rule, not an engine rule — and it argues for picking the engine that gets out of the way of a *curated* atlas pipeline, which favours Phaser's built-in atlas/Tiled tooling over hand-rolled Canvas2D.

---

### Q2.12 Master comparison table

| | PixiJS v8 | Phaser 4 | three.js | Babylon.js | PlayCanvas | Godot 4 | Unity 6 | Defold | Hand-rolled Canvas | R3F |
|---|---|---|---|---|---|---|---|---|---|---|
| **Version** | 8.21.0 | 4.2.1 | 0.186.1 | 9.28.0 | 2.22.6 | 4.7.2 | 6000.6.3f1 | 1.13.1 | — | 9.8.1 |
| **Latest release** | 2026-09-17 | 2026-07-09 | 2026-09-24 | 2026-09-24 | 2026-09-28 | 2026-08-22 | 6000.6 stream | 2026-08-17 | — | 2026-09-24 |
| **Licence** | MIT | MIT | MIT | Apache-2.0 | MIT (engine) | MIT | Proprietary | Source-available | n/a | MIT |
| **Min+gzip (bundlephobia, whole package entry)** | **~255 KB** (261,014 B) | **~347 KB** (355,684 B) | **~181 KB** (184,898 B) | **~1.70 MB** (1,780,395 B) | **~600 KB** (614,786 B) | n/a (wasm+pck, "usually large") | 2.3 MB stripped / 10.7 MB default | n/a | ~0 | **~56 KB** (57,039 B) + three |
| **Official React binding** | `@pixi/react` (React **19 only**) | None — official **templates** for React/Vue/Next/Svelte/Remix/Solid | `@react-three/fiber` | None; `react-babylonjs` is community | **`@playcanvas/react` (React 18 ✅ and 19)** | None | None | None | n/a | is the binding |
| **Works with React 18.2** | ✗ (v8 needs ≥19; v7 doesn't drive Pixi v8) | ✅ (no binding to conflict) | ✗ (v9 needs ≥19; v8.18.0 is the React 18 line) | ✗ (v4 needs ≥19; `r18` tag = 3.4.0) | ✅ | n/a | n/a | n/a | ✅ | ✗ |
| **2.5D/isometric OOTB** | z-sort only | isometric/staggered/hexagonal in standard tilemap; GPU layer **ortho only** | manual (ortho camera native) | manual | manual | native tilemap + y-sort | native tilemap | built-in tilemap | you write it | manual |
| **Tiled importer** | community | **built in** | community | community | community | native | native | native | — | community |
| **KTX2/Basis** | ✅ explicit imports required | ✅ (re-compress for v4 Y-axis) | ✅ via addons (unverified in-session) | ✅ | ✅ | ✅ (VRAM compression export option) | ✅ ASTC recommended on web | ✅ | — | ✅ via three |
| **TS types** | bundled | bundled | **`@types/three`** | bundled | bundled | n/a | n/a | n/a | n/a | bundled |
| **WebGPU** | shipped but **"Experimental… use WebGL for production"** | not advertised | shipped, "work in progress" | ✅ + WebGL2 fallback | ✅ (SuperSplat rebuilt on it) | ❌ ("currently does not support WebGPU") | ❌ WebGL 2 only | ❌ WebGL 2 default | you write it | via three |
| **Backing** | Open Collective donations | Phaser Studio Inc. | mrdoob + community | **Microsoft** | PlayCanvas Ltd. (Snap per Wikipedia) | Godot Foundation | Unity Technologies | **Defold Foundation** | you | pmndrs |

Bundle figures are [bundlephobia](https://bundlephobia.com/) minified+gzipped **for the package's main entry**, which overstates real tree-shaken usage (notably for `@babylonjs/core`, three.js and drei). `JUDGMENT:` treat them as an ordering signal — PixiJS < three.js < Phaser < PlayCanvas ≪ Babylon — not as shipping budgets.

---

### Q2.13 Ranked recommendation (1st → last)

Ranked against the three simultaneous constraints: **(i) MANY 2.5D city scenes, (ii) a React app already in place, (iii) AI-generated content.**

**🥇 PRIMARY PICK — Phaser 4.2.x, driven as an imperative canvas island, no React binding.**

Why it wins on all three constraints at once:
- **(i) Many city scenes** — it is the only 2D-first option with a **built-in Tiled pipeline** (`tilemapTiledJSON`, native handling of `isometric`/`staggered`/`hexagonal` orientation strings), a scene manager (one scene per city, naturally), cameras, tweens, input, atlases and physics in the box, plus a GPU tilemap path that renders a layer "as a single quad" with **fixed cost per pixel regardless of how many tiles are visible** ([Loader](https://docs.phaser.io/phaser/concepts/loader), [Parsers](https://docs.phaser.io/api-documentation/4.0.0/namespace/tilemaps-parsers), [perf article](https://www.phaser.io/news/2026/05/phaser4-spritegpulayer-performance)). Every alternative here requires you to build the tilemap/scene layer yourself.
- **(ii) React already in place** — Phaser has **no React peer dependency**, so the React 18-vs-19 trap that disqualifies `@pixi/react` v8, R3F v9 and `react-babylonjs` v4 simply does not exist. Phaser additionally ships official React templates ([phaser.io](https://phaser.io/)). The integration is one `useEffect` + one `destroy()`.
- **(iii) AI-generated content** — the loader accepts **base64/data-URI images directly** (`url`: "Url of texture, or base64 string of Uri"), which is exactly the shape an AI image API returns; and the vendor documents agent-readiness and ships agent skill files for the coding agents that will write this code ([Loader](https://docs.phaser.io/phaser/concepts/loader), [phaser.io](https://phaser.io/)).
- **Cost:** MIT, Phaser Studio Inc. commercial backing with a live commercial arm ([pricing](https://phaser.io/pricing)), ~347 KB gzip whole-library, 4.2.1 shipped 2026-07-09, and a documented, mechanical 3→4 migration path if any Phaser 3 code is ever ported ([migration](https://www.phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know)).
- **The one design condition attached to this pick:** choose **top-down + Y-sort over true isometric**, because `TilemapGPULayer` is "orthographic maps only". If true isometric is non-negotiable, use Phaser's standard `TilemapLayer` and accept a normal (still fast) sprite path.

**🥈 BACKUP — PixiJS v8.21 as an imperative canvas island (explicitly *without* `@pixi/react`).**

Smallest complete 2D renderer on the list (~255 KB gzip whole-package, 10 deps), best-documented batching behaviour, native `HTMLCanvasElement`/`ImageSource` texture inputs, MIT, and a very active core (8.21.0 on 2026-09-17). It is the right fallback if Phaser's renderer or its scene abstraction fights this project. **Its cost:** zero built-in tilemap, scenes, physics or Tiled loading — you would build a tile/level layer yourself, which on a 1-owner team is precisely the work Phaser donates. Explicitly do **not** take `@pixi/react` with it: v8 requires React ≥19, has not shipped since 2025-12-01, and would re-import the React-version trap you are avoiding.

**🥉 THIRD — React + hand-rolled Canvas2D/WebGL island.**

Underrated for this specific shape of game. A 2.5D tile scene is: one cached static ground layer, a small dynamic sprite layer, and input. Canvas2D plus an offscreen static-layer cache handles that at city scale, adds **0 KB** of dependency, has **zero** possibility of React-version conflict, and cannot be deprecated out from under you. **Cost:** you own animation, atlases, audio, input, camera, and the mobile-fallback path — and with "many city scenes" the per-scene plumbing is where the time goes. Choose this only if the scenes are genuinely simple and the schedule is dominated by the React/data/LLM work rather than rendering.

**4th — three.js + `@react-three/fiber`.** Best-in-class 3D, real orthographic camera, huge ecosystem (drei). Rejected from the podium because (a) R3F v9 requires **React ≥19** and drei 10.7.9 requires `react ^19` — you must upgrade React first, and on React 18 you are pinned to R3F **8.18.0 from 2025-02-19**; (b) it is a 3D engine with no tilemap concept, so constraint (i) becomes "write a tilemap system"; (c) the declarative scene graph turns scene size into React reconciliation cost, with the documented guard rails (`frameloop="demand"`, `invalidate()`, reuse geometries/materials, instancing, ≤~1000 draw calls) all being things you must now apply deliberately ([R3F v9](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide), [scaling performance](https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx)).

**5th — PlayCanvas + `@playcanvas/react`.** Genuinely notable because **`@playcanvas/react` 0.11.7 (2026-09-25) is the only official engine React binding whose peer range accepts React 18** (`react ^18.3.1 || ^19.1.0`). Engine is MIT, extremely actively released (2.22.6 on 2026-09-28), and the Editor has a workable free tier. Rejected from the podium because it is a 3D engine with no tilemap story for constraint (i), the payload is ~600 KB gzip, the React binding is 0.x/pre-1.0, the Editor's practical path is a paid tier ($15/mo Personal, $50/seat/mo Organization) and it is a cloud IDE rather than a local toolchain, and the corporate-ownership line rests on a single secondary source in my evidence.

**6th — Babylon.js 9.** Strongest pure-3D feature set on the list and the only option with unambiguous big-corporate backing (Microsoft, Apache-2.0), with WebGPU *and* WebGL 2 support for its new lighting systems. Rejected because it is the heaviest option by an order of magnitude (~1.70 MB gzip for the whole `@babylonjs/core` entry), has **no official React binding** (community `react-babylonjs` 4.0.2 requires React ≥19; the React 18 line is the `r18` tag pinned at 3.4.0), and offers nothing for tilemaps or 2.5D that three.js does not.

**7th — Defold.** The best *governance* story on the list — the Defold Foundation's objectives are protected by Swedish foundation law and cannot be changed, and King has "no direct influence on the future of Defold" ([defold.com/open](https://defold.com/open/)) — and its HTML5 story is competent and unusually honest (256 MB default heap; **both** `wasm-web` and `wasm_pthread-web` architectures with runtime selection and fallback; explicit COOP/COEP requirement for the threaded build; documented limits that Hot Reload does not work in HTML5 and Chrome debug builds are slow) ([Defold HTML5](https://defold.com/manuals/html5/)). Rejected because it is a Lua engine with its own editor, asset pipeline and project format, which means **zero reuse of the React/TS skills and code this project already has**, no React binding, no Tiled-first tooling, and a source-available licence that is not MIT.

**8th — Godot 4.x web export.** Excellent engine, wrong target. The official docs are unusually candid and disqualifying for this project: **C# projects "currently cannot be exported to the web"** (Godot 3 only); WebGL 2.0 only, Compatibility renderer only, Forward+/Mobile unsupported, **no WebGPU**; threaded export requires SharedArrayBuffer and full cross-origin isolation, meaning **"no ads, nor third-party integrations on the website hosting your game"**; Safari "has several issues with WebGL 2.0 support"; audio effects, reverb, doppler and procedural audio are unsupported in the default web sample mode; no low-level networking, no chunked HTTP responses, and nested/re-entrant HTTP polling can freeze the frame; the `.pck` and `.wasm` are "usually large in size" and itch.io/GitLab Pages do not gzip on the fly ([Godot: Exporting for the Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)). Plus no React integration at all and a hard canvas boundary, so none of the existing MUI shell, routing or guide-export UI is reusable.

**9th — Unity 6 Web.** The heaviest and the most constrained. Officially supported mobile browsers are only **iOS Safari 15+ and Chrome 58+ on Android**; the Web platform has **no managed (C#) threading** ("Managed (C#) threads aren't supported on the Web platform due to the lack of a multithreaded garbage collection feature in WebAssembly"), no `System.Reflection.Emit` (AOT), no `System.Net` networking classes, no IP sockets, no Unity Cache scripting API, and physics results are **not guaranteed to match** the editor; performance guidance is to "avoid large numbers of draw calls per frame"; background tabs drop to ~1 update/second and Unity "can't query a browser for its frame rate" so it assumes 60 fps ([browser compatibility](https://docs.unity3d.com/Manual/webgl-browsercompatibility.html), [technical limitations](https://docs.unity3d.com/6000.6/Documentation/Manual/webgl-technical-overview.html), [web performance](https://docs.unity3d.com/Manual/webgl-performance.html)). Build weight is real: measured **10.7 MB** for a default empty 3D URP web build, **7.7 MB** for 2D BiRP, down to **2.3 MB** only after removing packages including Input System and Unity UI ([aras-p gist](https://gist.github.com/aras-p/740c2d4f9977ce92b7de72b1394dd365)) — that is an *empty* project. Add no React story, a proprietary licence, and a 2024–2026 licensing history that burned community trust ([Runtime Fee cancellation](https://unity.com/blog/unity-is-canceling-the-runtime-fee)). For a link-shared, phone-played 2.5D travel game this is the wrong tool even though the engine is excellent.

**10th — Phaser 3 as a *fresh* choice in 2026.** Phaser 3 is not dead — the framework's own homepage still showcases Phaser 3 titles and 3.90.0 is a shipped release — but its last npm release was **2025-05-23**, Phaser 4.0.0 shipped **2026-04-10** and is now at 4.2.1 with a documented migration path, and the vendor's roadmap energy is entirely in v4 ([phaser.io](https://phaser.io/), [Phaser 3 vs 4](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4)). **UNVERIFIED:** Phaser has not published an end-of-support date for the 3.x line that I could find, so "3.x is unsupported" would be an overstatement — but starting a new multi-year project on it in 2026, when v4 is stable and migrating later is documented work you would simply be deferring, is a choice with no upside.

---

### Q2.14 One specific reason to reject each non-pick

| Option | The single reason to reject it |
|---|---|
| **PixiJS v8 (as primary)** | No tilemap, scene manager or Tiled importer — for "many 2.5D city scenes" you would hand-build the exact layer Phaser gives you free. |
| **@pixi/react v8** | Its peer range is `react >=19.0.0` and it has not shipped since 2025-12-01; it cannot be installed into this React 18.2 app at all. |
| **Phaser 3** | Superseded: 3.90.0 (2025-05-23) predates Phaser 4.0.0 (2026-04-10) and the roadmap is v4-only. |
| **three.js (bare)** | No tilemap, no scene/level abstraction, no depth-sorting opinion — every 2.5D concern is yours to implement. |
| **Babylon.js** | ~1.70 MB gzipped whole-package entry and no official React binding, for capabilities a 2D sprite game will not use. |
| **PlayCanvas** | 0.x React binding plus a cloud-Editor-centric workflow and paid tiers, for a 2D game that will never use its 3D strength. |
| **Godot 4 web** | WebGL2-only, no WebGPU, C# cannot target web, and the threaded build forbids third-party integrations on the hosting site — plus zero React reuse. |
| **Unity 6 Web** | An *empty* optimized build is 2.3 MB and a default one is 10.7 MB, with no managed threading and no React integration. |
| **Defold** | Lua + bespoke editor/project format = no reuse of the existing React/TS codebase and no React binding. |
| **React + hand-rolled canvas** | You re-implement atlases, animation, input, audio, camera and culling yourself — the cost lands precisely where a 1-owner team is thinnest. |
| **R3F** | Requires React ≥19 (v9 peer `react >=19 <19.4`; drei 10.7.9 `react ^19`) and turns scene complexity into React reconciliation cost. |

---

### Open items the planning report must not paper over

1. **UNVERIFIED:** No independent 60 fps benchmark exists (in anything I could fetch) for a 2.5D isometric city scene in any engine. Build a 5-minute spike: one real city pack, real tile atlas, 200 animated NPCs, measured on a real mid-range Android and a real iPhone.
2. **UNVERIFIED:** iOS canvas-size / texture-memory caps and per-tab memory ceilings are not published in a primary source I could retrieve. Measure.
3. **UNVERIFIED:** Phaser 3.x end-of-support date — no official statement found.
4. **UNVERIFIED:** three.js `KTX2Loader`/`GLTFLoader` and Babylon's glTF/KTX2 doc pages were not fetched in this session; the loader names are expected, not confirmed.
5. **UNVERIFIED:** PlayCanvas's ownership by Snap Inc. rests on Wikipedia citing Business Insider — one secondary source, not independently confirmed.
6. **DECISION REQUIRED, not a research gap:** whether the 2.5D look is true isometric or top-down + Y-sort. This single choice changes the recommended engine path (see Q2.3) and should be settled before any engine code is written.

## Sources

- https://registry.npmjs.org/pixi.js
- https://registry.npmjs.org/phaser
- https://registry.npmjs.org/three
- https://registry.npmjs.org/@babylonjs/core
- https://registry.npmjs.org/playcanvas
- https://registry.npmjs.org/@playcanvas/react
- https://registry.npmjs.org/@pixi/react
- https://registry.npmjs.org/@react-three/fiber
- https://registry.npmjs.org/@react-three/drei
- https://registry.npmjs.org/react-babylonjs
- https://registry.npmjs.org/@types/three
- https://github.com/pixijs/pixijs/releases.atom
- https://github.com/pixijs/pixi-react/releases.atom
- https://github.com/phaserjs/phaser/releases.atom
- https://github.com/mrdoob/three.js/releases.atom
- https://github.com/BabylonJS/Babylon.js/releases.atom
- https://github.com/playcanvas/engine/releases.atom
- https://github.com/godotengine/godot/releases.atom
- https://github.com/defold/defold/releases.atom
- https://github.com/pmndrs/react-three-fiber/releases.atom
- https://github.com/pmndrs/drei/releases.atom
- https://github.com/mapeditor/tiled/releases.atom
- https://github.com/deepnight/ldtk/releases.atom
- https://pixijs.com/8.x/guides/components/renderers.md
- https://pixijs.com/8.x/guides/concepts/performance-tips.md
- https://pixijs.com/8.x/guides/components/scene-objects/particle-container.md
- https://pixijs.com/8.x/guides/components/assets/compressed-textures
- https://pixijs.com/8.x/guides/migrations/v8
- https://pixijs.com/blog/pixi-react-v8-live
- https://pixijs.com/blog
- https://opencollective.com/pixijs
- https://phaser.io/
- https://phaser.io/pricing
- https://www.phaser.io/news/2026/04/migrating-from-phaser-3-to-phaser-4-what-you-need-to-know
- https://phaser.io/news/2026/05/phaser-3-vs-phaser-4
- https://www.phaser.io/news/2026/05/phaser4-spritegpulayer-performance
- https://docs.phaser.io/phaser/concepts/loader
- https://docs.phaser.io/api-documentation/4.0.0/namespace/tilemaps-parsers
- https://docs.phaser.io/api-documentation/class/tilemaps-tilemap
- https://threejs.org/docs/index.html#manual/en/introduction/Installation
- https://github.com/mrdoob/three.js
- https://blogs.windows.com/windowsdeveloper/2026/03/26/announcing-babylon-js-9-0/
- https://playcanvas.com/plans
- https://blog.playcanvas.com/
- https://developer.playcanvas.com/user-manual/graphics/cameras/
- https://developer.playcanvas.com/user-manual/react/getting-started/installation/
- https://en.wikipedia.org/wiki/PlayCanvas
- https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
- https://godotengine.org/releases/4.7/
- https://godotengine.org/license/
- https://docs.unity3d.com/Manual/webgl-browsercompatibility.html
- https://docs.unity3d.com/Manual/webgl-performance.html
- https://docs.unity3d.com/Manual/web-optimization-mobile.html
- https://docs.unity3d.com/6000.6/Documentation/Manual/webgl-technical-overview.html
- https://unity.com/blog/unity-is-canceling-the-runtime-fee
- https://unity.com/pricing
- https://unity.com/releases/editor/whats-new/6000.6.3f1
- https://gist.github.com/aras-p/740c2d4f9977ce92b7de72b1394dd365
- https://defold.com/open/
- https://defold.com/manuals/html5/
- https://raw.githubusercontent.com/defold/doc/master/docs/en/manuals/html5.md
- https://caniuse.com/webgpu
- https://caniuse.com/webgl2
- https://react.dev/reference/react/StrictMode
- https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide
- https://raw.githubusercontent.com/pmndrs/react-three-fiber/master/docs/advanced/scaling-performance.mdx
- https://github.com/p5-wrapper/react/issues/255
- https://stackoverflow.com/questions/73368742/phaser-3-duplicate-canvas-component-is-created-when-creating-a-new-instance-of
- https://github.com/pixijs-userland/pixi-ldtk-loader
- https://bundlephobia.com/
