# Review without a local server

- [Travel companion · English](https://paperstrange.github.io/TourGuideAI/travel.html?lang=en)
- [地图与实地散步 · 中文](https://paperstrange.github.io/TourGuideAI/travel.html?lang=zh)
- [Play in daylight](https://paperstrange.github.io/TourGuideAI/?lighting=day)
- [Play at night](https://paperstrange.github.io/TourGuideAI/?lighting=night)
- [Compare the expanded street renderings](https://paperstrange.github.io/TourGuideAI/comparison.html)
- [Published build identity](https://paperstrange.github.io/TourGuideAI/review-build.json)

The current package is live from application `a8c3e49` and Pages `6b5b1ea`.
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
