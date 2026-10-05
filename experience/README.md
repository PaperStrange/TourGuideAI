# Kyoto · a guided 3D travel experience

A small walk through Shijo: approach source-backed places, make a choice, keep a
personal note, then take those notes with you. Complete English/Chinese guidance
and a guided camera support the first launched version's direction.

This is the new independent application. Install and run it from this directory:

```sh
npm ci
npm run dev
```

Requires Node.js 24+. Open `http://localhost:4185/`. Walk with WASD/arrow keys or a
click on the ground. Drag to orbit, scroll to zoom, and use Reset view to recover
framing. E opens a nearby encounter; Escape closes it. After a choice, optionally
save a personal note. Save field notes downloads your choices and saved notes as
readable HTML. Nothing is posted to a service.

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

## Project map

- [Architecture and directory boundaries](docs/architecture.md)
- [GitHub research and adopted patterns](docs/github-research.md)
- [Trip, day, interaction and sharing design](docs/immersion.md)
- [Current iteration](docs/iteration.md)
- [Asset direction and reproduction](docs/art-direction.md)
- [Content and source boundaries](docs/content-contract.md)
- [Building photographs, Street View research and facade references](docs/facade-references.md)

The scene uses original Blender-authored assets and local source evidence. Licensed
building photographs guide facade details; [artwork credits](public/credits.html)
ship with the application. Physical heights, exact dimensions and lighting are authored; source-backed building
levels do not constitute a surveyed reconstruction. Public-frontage encounters do
not assert permission to enter unverified interiors.

Journeys live in this browser origin's localStorage. The app can read the earlier
save key on the same origin; different ports/domains/devices have separate storage.
Reset clears the current walk and its notes. Trip archives, photo memoirs, daily
itineraries and online sharing remain future slices.

Three.js uses the MIT license; the bundled font includes its Noto OFL notice.
The Blender Python authoring tool has its own GPL notice, distinct from generated
artwork. Source geometry attribution remains © OpenStreetMap contributors, ODbL.

The scoped GitHub Actions workflow builds and tests this package on relevant pushes. To regenerate the known UI font subset after copy changes, install Python fontTools and the Noto CJK source font, then run `python tools/build-font.py`. Arbitrary personal-note glyphs may use the declared system font fallbacks.
