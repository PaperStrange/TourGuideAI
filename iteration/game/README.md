# Kyoto · First playable

A desktop browser game slice of Kyoto's Shijo–Karasuma block. Walk a detailed
stylized street, discover the crossing and two real building frontages, make a
sourced travel choice, and save the resulting personal field notes.

## Run

Requires **Node.js 24 or newer**.

```sh
cd iteration/game
npm ci
npm run dev
```

Open the printed localhost URL (normally `http://localhost:4173`).

```sh
npm run build
npm run preview -- --port 4174
```

`dist/index.html` contains the engine, game, styles, bilingual catalogs, subset
font and license notices. It makes no required secondary network requests.
The accompanying `dist/content-evidence/` files record the scene's source basis;
they are documentation, not runtime downloads. The HTML is intended to launch
locally, but direct `file://` navigation could not be verified in this managed
Chromium environment because its policy blocks that scheme. The exact built
HTML is tested through an allowed HTTP document with every secondary request
denied. Standard HTTP preview is verified.

## Play

- Walk with **WASD / arrow keys**, or click the pavement.
- Click a destination in the left journal to walk there, then press **E** or the
  contextual button. Clicking a scene marker approaches and opens it.
- Choose an action in the place card; **Esc** or the close button resumes the walk.
- **EN / 中文** switches the complete guidance suite while preserving progress and
  the open card. Japanese place names remain Japanese.
- Progress saves in this browser's local storage. **↺** offers a confirmed restart.
  Clearing browser data removes the save. No account or server is required.
- **Save field notes** downloads a small, printable HTML note reflecting actual
  choices. It is a discovery preview, not a complete travel-ready itinerary.
- System **reduced motion** disables camera easing, marker pulsing and walking bob.

Gameplay targets desktop keyboard/mouse. The UI adapts to smaller windows; touch
play and a full accessible nonvisual world-navigation mode are not claimed.

## Delivered scope and source limits

Three encounters: Shijo–Karasuma crossing, Kyoto Mitsui Building frontage and
MUFG Kyoto Branch frontage in Kyoto Daiya Building. The useful choice separates
an ATM plan from a staffed currency-exchange plan, using official operator
information and clearly dated source disclosures. The three retained south-side
unfinished doorways show an honest unavailable-content state and do not increase
completion. There are no invented interiors or confirmed tenant-to-door mappings.

Mapped building spans/crossing coordinates are distinguished from authored
facade treatment, street furniture and curb widths in `src/content.js` and
`public/content-evidence/`. The scene is a stylized interpretation, not a surveyed
photographic reconstruction. This is the first-playable slice; the full Gate 1
street, twelve meaningful destinations, field trial and multi-city game remain
later milestones. A player visit never becomes factual verification.

## Review and validation

The acceptance contract is `../design/first-playable-brief.md`; the visual
reference and implementation record are `../design/visual-target.md`.
`../design/first-playable-result.md` records the exact tested build, browser,
checks, visual findings and remaining human acceptance decisions.

The independent browser script is an evidence capture, not a repository gate
that purports to judge art. It needs existing Playwright and Chromium tooling:

```sh
# Run from the repository root, after building iteration/game.
NODE_PATH=/path/to/node_modules TG_QA_CHROMIUM=/path/to/chromium \
  TG_QA_OUTPUT=/tmp/tourguide-evidence \
  node iteration/game/qa/browser-check.mjs iteration/game/dist/index.html
node iteration/tools/run-gates.mjs
```

Playwright video recording also requires its configured ffmpeg executable.
The browser check drives visible controls and actual input; it does not teleport
through a production-only debug API. Development builds expose a read-only
`window.__TOUR_GAME__` observation aid. Production builds omit it.

## Credits and redistribution

Original procedural Canvas artwork was created for this slice. No third-party
photos, copied logos or generated-image dependencies are used.

- Geometry: © OpenStreetMap contributors, ODbL. See the source disclosures and
  `public/content-evidence/geometry.json` for feature IDs and provenance.
- Runtime: melonJS 18.3.0, MIT; howler and core-js runtime dependencies, MIT.
  Notices are in `src/assets/THIRD-PARTY-NOTICES.txt` and embedded in the HTML.
- Typeface: a subset of Noto Sans CJK SC Regular, SIL Open Font License 1.1.
  `src/assets/NOTO-LICENSE.txt` carries the supplied copyright/license notice and
  is embedded in the HTML. The subset supplies the current game's text; regenerate
  it when adding glyphs. System serif/Japanese fonts are preferred where present.
- Operator facts: links, checked dates and concise factual evidence are retained
  in `public/content-evidence/operator-facts.json`. No claim of live availability.

The game workspace is isolated from the historical React application and legacy
viewer. Its dependency lockfile is independent; build output and installed
packages are ignored.
