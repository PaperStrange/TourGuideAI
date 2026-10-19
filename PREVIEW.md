# Review TourGuideAI

## Reviewed places · Kyoto and Ginza

[Explore TourGuideAI](https://paperstrange.github.io/TourGuideAI/) ·
[中文首页](https://paperstrange.github.io/TourGuideAI/?lang=zh)

The new homepage release offers two interactive walks: **Shijō–Karasuma, Kyoto**
and **Ginza Wako corner, Tokyo**. Select either place above the street window,
walk, orbit, tilt and zoom, or use **Look closer** to inspect visible features.
Ginza follows approximately 55.28 m of connected sidewalk around Wako's curved
corner and two frontages. Day/night, private **Keep this place** views, optional
words and return to a saved viewpoint work in both areas. Shijō's existing art
and guided journeys remain available.

Runtime and validation source: `379e9d3223d5352ca298e841a7ccbb3694c75d8c`.
Pages package commit: `3362d6cf61c689a32ded9886a3ed1e45837fe6fe`.
The 94-file tested package is
`5a8e0f67506cd164e7422e8aaf22c6a77685c4a7996168aac16703a6b0d0deb7`.
The package is pushed; GitHub deployment and actual HTTPS verification are pending.

The solo flow needs no room service or model credentials. Search for another
place, pan its shared-style map and select **Explore this area**. Choose a
source-linked visiting order, keep it, and reopen it from **Places to return to**.
Use **See surrounding map** to move between a reviewed street and the wider map.
Touch and keyboard guidance are available in English and Chinese. Stored places
are private to that browser/origin; Maps calculates directions through selected stops.

All complete packaged browser reports pass: original walk **133**, perspective
**80**, companion **73**, homepage **65**, solo **75**, reviewed packs **75** and
extended walkthrough **264**. Local interaction, recovery, full solo, homepage
and extended walkthrough checks also pass. Counts overlap. The
[milestone record](experience/evidence/area-packs-20261019/README.md) preserves exact
source, package and report identities.

Ginza's model meets its 8 MiB, 100,000-triangle and 64-batch production limits.
Surrounding buildings and roads remain simplified; simulation width, unseen detail
and lighting are authored. Human realism, recognition and enjoyment remain open.
Warm Together language actions measure **1223.2 / 1104.9 / 1170.7 ms**, above the
unchanged 500 ms target; Q03 remains open P1. The
[iteration plan](experience/docs/sprint-packs-20261019.md) and
[authoring guide](experience/docs/area-pack-authoring.md) describe the reusable
pack system and recurring source/art/review work. Replay remains conditional on
experience evidence.

For an optional workspace preview, run `npm run preview` in `experience` with the
current built package and open `http://localhost:4186/`. Browser saves stay on their
own origin; localhost and the published site have separate private collections.

## Published Explore and Together homepage

[Open the homepage](https://paperstrange.github.io/TourGuideAI/) ·
[中文首页](https://paperstrange.github.io/TourGuideAI/?lang=zh)

Explore starts with the live Kyoto street window, day/night controls and a place
search. Choose another center to see its mapped buildings and nearby Wikipedia
places; choose a suggested order and open it in Google Maps. A country opens a
country overview, with a prompt to choose a city or landmark for local exploration.

Together opens a world map. The implemented room service supports invitation
links, each person's dream places, shared selected views and reviewed AI proposals.
Local backend testing with this GitHub Pages frontend is the current delivery
target, before paid hosting. A running room service enables collaboration;
model credentials are separately required for AI planning. The frontend reports
the service's actual availability.
Detailed facade interpretation is available in Kyoto and Ginza; wider views use mapped
building shapes and heights. Existing notes and the on-site companion remain usable.

For local room tests, run `npm ci` and `npm run local:pages` from
`experience/server` on your computer. Open Together on Pages on that same computer,
expand **Testing connection**, enter `http://127.0.0.1:8787`, and choose **Connect**.
Allow the browser's local-network prompt if shown. Keep the terminal running.
An unfamiliar invitation asks you to confirm the service before opening its room.
Other devices require a reachable HTTPS endpoint; a room invitation alone does
not expose a local server. The [local guide](experience/server/docs/local-pages.md)
covers both paths and the optional periodic-update setting.

[Current delivery checkpoint](experience/docs/agent-checkpoint.md) ·
[Local backend with GitHub Pages](experience/server/docs/local-pages.md) ·
[Service deployment](experience/server/README.md) ·
[Optional future Render setup](experience/docs/render-setup.md) ·
[Place sources](experience/docs/discovery-sources.md)

## Previous companion release

- [Travel companion · English](https://paperstrange.github.io/TourGuideAI/travel.html?lang=en)
- [地图与实地散步 · 中文](https://paperstrange.github.io/TourGuideAI/travel.html?lang=zh)
- [Play in daylight](https://paperstrange.github.io/TourGuideAI/walk.html?lighting=day)
- [Play at night](https://paperstrange.github.io/TourGuideAI/walk.html?lighting=night)
- [Compare the expanded street renderings](https://paperstrange.github.io/TourGuideAI/comparison.html)
- [Published build identity](https://paperstrange.github.io/TourGuideAI/review-build.json)

The previous companion package was released from application `a8c3e49` and Pages `6b5b1ea`.
**Take the journey with you** lets you choose and reorder Kyoto places, share the
journey through Google Maps, or export pins for manual Google My Maps import.
Use **Use my location** when there to update nearby context. Location pauses when
the page is hidden and requires Resume; GPS samples stay out of saves and shares.
The pilot covers three places around Shijō–Karasuma. Directions are recalculated
by Google. Physical GPS and external-app handoffs still need device review.

The package passes 73 companion browser checks, 130 original-walk checks,
80 perspective checks, 24 focused sharing checks, 74 unit tests and 17 repository
gates. All three runtime CI jobs pass; all 63 hosted files match the tested hashes.
[Evidence and limits](experience/evidence/travel-20261015/README.md).

**Borrow someone’s eyes** remains available: a three-observation Kyoto loop with
saved perspectives and selected moment links. Both formats support English and Chinese:

- [Try Walk & look](https://paperstrange.github.io/TourGuideAI/perspective.html?mode=walk)
- [Try Map & story](https://paperstrange.github.io/TourGuideAI/perspective.html?mode=story)
- [中文体验](https://paperstrange.github.io/TourGuideAI/perspective.html?mode=walk&lang=zh)

Save a frame with an optional note, reopen/edit it, then preview one selected moment.
The note checkbox starts off. A shared link opens a read-only view and does not
change the recipient's saved walk. Notes and optional feedback stay on the device;
use **Download my feedback** to provide the local reflection explicitly.

Human enjoyment and differentiation remain the next sprint's questions; this is
an implemented comparison, not a completed user study.

The following controls and multiple recap formats belong to the original walk,
which remains available at the links above.

Use **Daylight / Night** above the street to change its atmosphere at any time
outside an open encounter. The selected mode is remembered separately from your
journey. It does not change choices, notes, progress or actual venue opening hours.
Warm local fixtures, shadows and licensed HDR environments change the lighting and
reflections; the maps are not panorama backgrounds.

The comparison offers the intersection and two closer frontage views in both
lighting modes, for six matched live/Blender pairs. Switch
between side-by-side and full-width display to inspect building construction,
materials and light. A is live PBR; B contains Blender path-traced stills. They
share scene geometry and camera poses. Offline stills do not demonstrate gameplay
performance or a freely navigable second renderer.

After making a choice in the walk, select **Preview & share**. Choose which saved
personal notes to include (all start unselected), then use any of these formats:

- Share/copy a link to a readable webpage. The selected recap travels in its URL
  fragment; anyone receiving that link can read or forward it.
- Download a PNG card; supported browsers also offer native image sharing.
- Open the print reader, then print or use the browser's Save as PDF destination.

Both the interface and reader support English and Chinese. The reader needs no
game or account and does not modify a recipient's saved walk. Sharing never
includes unsaved drafts or unchecked notes. The current recap covers this simulated
Shijō walk, not a completed real trip or a full travel itinerary.

GitHub Pages uses the `gh-pages` branch, `/ (root)`. The source branch is
`chore-sow-delivery-plan`; the published build descriptor identifies the tested
distribution and source commit. Keep the whole `experience/dist/` folder when
hosting independently. This hosted origin has its own local save, separate from
localhost and other devices.

The user accepted fluency and guidance on the preceding hosted build. Revised
realism remains a user review criterion. See the [current validation record](experience/docs/validation.md)
and [art direction and limitations](experience/docs/art-direction.md) for the
new checks, actual browser evidence and authored approximations. Historical
2026-10-05 reports remain unchanged in `experience/evidence/`.
