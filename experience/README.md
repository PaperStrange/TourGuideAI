# TourGuideAI · Explore and plan together

The homepage opens a live Kyoto street preview and a worldwide place search.
Explore offers nearby sightseeing suggestions and Google Maps handoff. Together
uses a 2D world map, invited rooms, shared dream destinations and local 3D previews.
English/Chinese guidance is available throughout. Countries remain overview-level
until a city or landmark is chosen.

The frontend is built for GitHub Pages. [The separate Node service](server/README.md)
provides persisted rooms and configured-provider AI proposals; start it on port 8787
for the Vite development proxy, or set `VITE_TRAVEL_API_URL` before a production
build. Public hosting and model credentials remain deployment prerequisites.
[Journey behavior](docs/homepage-journeys.md) · [Data sources](docs/discovery-sources.md)

## Original Kyoto walk

A small walk through Shijo: approach source-backed places, make a choice, keep a
personal note, then take those notes with you. Complete English/Chinese guidance
and a guided camera support the first launched version's direction.

This is the new independent application. Install and run it from this directory:

```sh
npm ci
npm run dev
```

Requires Node.js 24.19+. Open `http://localhost:4185/` for the homepage or
`http://localhost:4185/walk.html` for the original walk. Walk with WASD/arrow keys or a
click on the ground. Drag to orbit, scroll to zoom, and use Reset view to recover
framing. E opens a nearby encounter; Escape closes it. After a choice, optionally
save a personal note. **Daylight / Night** changes the street's lighting while
keeping the camera and journey. Your explicit selection is remembered separately
from the walk; resetting the journey keeps that preference. Night uses local warm
lights and illuminated building features. The mode does not indicate real time or
whether a venue is open.

**Preview & share** offers a browser link, a PNG card and a
print/PDF reader. Saved notes are individually opt-in and visible before sharing.
The link carries the selected recap in its fragment; recipients can read and
forward it. The reader runs without the game and does not alter their own journey.

**Compare street renderings** opens matching views of the expanded street in
realtime PBR and Blender path tracing. The offline images are labelled static;
they are an art comparison, not a demonstration of realtime frame rate. Both
treatments offer daylight and night at the same three camera positions.

```sh
npm test
npm run build
npm run preview
npx playwright install chromium
npm run test:browser -- dist
```

The preview serves `dist/` on port 4186. See [validation](docs/validation.md) for
browser prerequisites, exact verification and known limits. To host or move the
build, keep the entire `dist/` directory, including `models/` and `assets/`.

## Shared-perspective iteration

Open `perspective.html` for **Borrow someone’s eyes**: three studio-authored
observations around the crossing, a personal saved frame with an optional note,
and one selected moment shared as a read-only browser link. English and Chinese
are available throughout. `?mode=walk` opens the live format;
`?mode=story` opens the matched map/story format. This experience comparison is
separate from the earlier live/Blender rendering study.

The story format uses actual illustrated captures of our live scene. This first
comparison holds daylight constant. The original walk retains daylight/night and
its multi-format recap. Perspective notes and feedback use their own local save;
they do not migrate or change the original journey. Notes are excluded from share
links until explicitly selected. Links carry readable data in their fragment and
can be forwarded. No account or feedback collection server is involved.

Run `npm run test:perspective -- dist` after building to exercise the new flow.
See [the lean iteration and decision gates](docs/lean-iteration.md).

## Travel companion

Open `travel.html` to carry selected Kyoto places into Google Maps. Arrange the
stops, copy/share the route links, or download pins for manual Google My Maps
import. **Use my location** starts foreground nearby context; leaving the page
pauses it and returning requires Resume. GPS samples are neither saved nor included
in shares. Personal meaningful-place marks stay separate from visits and the
existing virtual views/notes. All controls support English and Chinese.

Run `npm run test:travel -- dist` after building. See the
[companion behavior](docs/travel-companion.md) and [agent checkpoint](docs/agent-checkpoint.md).

## Project map

- [Architecture and directory boundaries](docs/architecture.md)
- [GitHub research and adopted patterns](docs/github-research.md)
- [Trip, day, interaction and sharing design](docs/immersion.md)
- [Current iteration](docs/iteration.md)
- [Asset direction and reproduction](docs/art-direction.md)
- [Content and source boundaries](docs/content-contract.md)
- [Building photographs, Street View research and facade references](docs/facade-references.md)
- [Licensed lighting environments and online resource research](docs/lighting-resources.md)
- [Product positioning and proposed next sprints](docs/positioning.md)
- [City/country solutions, costs, competition and approved experience A/B](docs/city-country-strategy.md)
- [Selected Ginza building-recognition reference](docs/recognition-study.md)

The scene uses original Blender-authored assets and local source evidence. Licensed
building photographs guide facade details; [artwork credits](public/credits.html)
ship with the application. Physical heights, exact dimensions and lighting are authored; source-backed building
levels do not constitute a surveyed reconstruction. Public-frontage encounters do
not assert permission to enter unverified interiors.

Journeys live in this browser origin's localStorage. The app can read the earlier
save key on the same origin; different ports/domains/devices have separate storage.
Reset clears the current walk and its notes. Trip archives, photo memoirs, daily
itineraries, photo sharing and a hosted short-link service remain future slices.

Three.js uses the MIT license; the bundled font includes its Noto OFL notice.
The Blender Python authoring tool has its own GPL notice, distinct from generated
artwork. Source geometry attribution remains © OpenStreetMap contributors, ODbL.

The scoped GitHub Actions workflow builds and tests this package on relevant pushes. To regenerate the known UI font subset after copy changes, install Python fontTools and the Noto CJK source font, then run `python tools/build-font.py`. Arbitrary personal-note glyphs may use the declared system font fallbacks.
