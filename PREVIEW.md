# Review without a local server

- [Play in daylight](https://paperstrange.github.io/TourGuideAI/?lighting=day)
- [Play at night](https://paperstrange.github.io/TourGuideAI/?lighting=night)
- [Compare the expanded street renderings](https://paperstrange.github.io/TourGuideAI/comparison.html)
- [Published build identity](https://paperstrange.github.io/TourGuideAI/review-build.json)

The current package is live from application `f701bda` and Pages `89ff73e`.
It adds **Borrow someone’s eyes**, a three-observation Kyoto loop with saved
perspectives and selected moment links. Both formats support English and Chinese:

- [Try Walk & look](https://paperstrange.github.io/TourGuideAI/perspective.html?mode=walk)
- [Try Map & story](https://paperstrange.github.io/TourGuideAI/perspective.html?mode=story)
- [中文体验](https://paperstrange.github.io/TourGuideAI/perspective.html?mode=walk&lang=zh)

Save a frame with an optional note, reopen/edit it, then preview one selected moment.
The note checkbox starts off. A shared link opens a read-only view and does not
change the recipient's saved walk. Notes and optional feedback stay on the device;
use **Download my feedback** to provide the local reflection explicitly.

The package passes 80 new-flow browser checks, 130 original-walk browser
checks, 44 pure tests and 17 repository gates. All 57 hosted package files
match the tested hashes. [Evidence and limits](experience/evidence/perspective-20261007/README.md).
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
