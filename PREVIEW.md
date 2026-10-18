# Review TourGuideAI

## Solo exploration candidate · publication pending

The workspace candidate adds a free-orbit Kyoto view with optional **Look closer**
inspection, explicit **Explore this area** discovery on the wider map, and private
**Keep this place** views with lighting, optional words and the selected place order.
Current source is `a1dbd36298e56109a396d2df1a9031851859b3c9`; its reviewed package manifest is
`0a6244091b50c9ee7220d698e1109c86bd397dba54384c8db20e68bc57c728e7`.
The published links below still refer to the preceding verified quality release
until the lead records the new publication and exact-byte verification.

For the workspace candidate, use `npm run preview` in `experience` with its current
built package, and open `http://localhost:4186/`. The solo flow needs no room service
or model credentials. Walk and orbit Kyoto, choose **Look closer**, move laterally
to inspect a visible facade detail, and optionally keep your view. Search for
another place, pan its map and select **Explore this area**. Choose an actual
source-linked visiting order, keep it, and reopen it from **Places to return to**.
Touch and keyboard guidance are available in English and Chinese. Stored places
are private to that browser/origin; Maps calculates directions through selected stops.

The material review accepts clearer facade/glazing separation and reduced canopy
shadow wedges. User realism and experiential value remain open. Final focused
browser checks pass 39/39, with earlier street checks retaining their own package
scope. Final local startup 8/8 and pause/appearance 19/19 pass. Original-walk CI
recorded 131/133; an expected appearance-fixture correction is undergoing focused
verification, with runtime unchanged. Current-source CI and publication remain
pending. Warm Together
language actions still miss the unchanged 500 ms target; this release makes no
latency-gain claim. See the [solo acceptance record](experience/docs/sprint-solo-20261018.md)
and [coverage recommendation](experience/docs/solo-coverage-research-20261018.md).
Broader coverage uses a shared-style provider map with selectively reviewed area
packs proposed for richer detail. The next decision gates are three matched warm
locale actions each below 500 ms, one sourced area-pack decision within an explicit
art/cost budget, and human meaning/recognition evidence. Replay remains conditional
Sprint 2B work; no further area pack is delivered by this recommendation.

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
Detailed facade interpretation is available in Kyoto; wider views use mapped
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
- [Play in daylight](https://paperstrange.github.io/TourGuideAI/?lighting=day)
- [Play at night](https://paperstrange.github.io/TourGuideAI/?lighting=night)
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
