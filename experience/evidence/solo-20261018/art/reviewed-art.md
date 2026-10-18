# Sprint 2A matched art review — 2026-10-18

The eight final browser captures show a visible material and lighting improvement:
Mitsui's glazed planes, frame divisions and sill borders separate from its pale
wall; Daiya's tall glazing remains distinct from its vertical stone ribs. Local
night light pools retain the actor and crossing while long outward canopy-shadow
wedges are reduced. This review accepts that bounded change for delivery. Human
recognition and the user's realism preference remain unestablished.

## Exact evidence

- [Baseline report](baseline/art-poses-result.json): package SHA-256
  `8751ba4ecb6f6fcec70d1c2d25cff41b074671ea4433d3bf5b4a087ac810d2fb`.
- [Final report](final/art-poses-result.json): package SHA-256
  `81e885e64a92adb6140d230e3819bc3ace119ff4475b50159bc56a5a88c5c268`.
- Runtime finish manifest SHA-256:
  `5947c4fe04f6bc6ced85b4c6920e7a1f7f88cbec6ea67180133eea69d8c48813`.
- Captured material source SHA-256:
  `c380455d098a053f79cd11b541077c5a994d36ad642d70f791ecc9fe011293da`.
- Captured architectural profile SHA-256:
  `31fa3b3afb98ef1080af202562192d9de17d8cf11ef1fb96716a1890e18454a7`.
- GLB SHA-256 stays
  `f4135e225f0575daca660c055a5fbdbc4ef3af31bd72736d1dbc806f07ff331c`;
  the original rig, both HDR files and actor also retain their bytes.

The six desktop captures construct the shipped public `createGame` API with
canonical `initialView` values. They use 1440×1000, DPR 1 and reduced motion.
The two phone captures operate the homepage at 390×844, with a 352×428 scene.
Each capture waits for its requested lighting mode, readiness and an actual draw.
All eight actual camera matrices match the baseline; reports record full matrices,
viewport, source bindings and individual screenshot hashes. Reported browser
errors are zero. These fixed-pose captures are not a walked-route demonstration.

| Pose | Player east/north | Azimuth / polar / distance | Aim offset east/north/height |
|---|---|---|---|
| Intersection | 20.721 / 2.33 | 3.361593 / 1.05 / 32 | 0 / −11.32 / 4 |
| Mitsui | 24.7 / −18.5 | −0.4 / 1.05 / 36 | −4.7 / 25 / 11 |
| Daiya | 23.8 / 2.1 | 3.541593 / 1.05 / 36 | −6.8 / −24.1 / 10 |

Angles are radians, distances metres. Phone views use the ordinary opening pose.

## Visible findings

| Comparison | Observed result |
|---|---|
| Mitsui [before](baseline/mitsui-day-desktop.png) / [after](final/mitsui-day-desktop.png) | Individual window planes and frame divisions are visible inside existing recesses. Sill edges and pale masonry remain distinct. The curved classical corner is preserved; this view exposes only part of its column arrangement. |
| Daiya [before](baseline/daiya-day-desktop.png) / [after](final/daiya-day-desktop.png) | Tall glazed strips, narrow transoms and pale vertical ribs separate clearly. The paired-column diagonal remains distinct from Mitsui's punched-window wall. |
| Intersection night [before](baseline/intersection-night-desktop.png) / [after](final/intersection-night-desktop.png) | Pavement light pools and glass/frame divisions remain readable. The large outward shadow wedges are shorter, and the actor/crossing remain visible. |
| Phone [day](final/opening-day-phone.png) / [night](final/opening-night-phone.png) | Existing facade relief, traveller and useful pavement are readable at the recorded scene size. UI/control behavior belongs to the separate solo walkthrough. |

## Resources and limits

Four original 512×512 PNGs total 313,860 bytes; their manifest adds 2,258 bytes.
The 316,118-byte package stays below the agreed 512 KiB transfer budget. A second
Blender 4.3.2 materials-only export produced the same manifest and image hashes.
Every final capture reports four applied finish maps and four disposed original
maps, with fourteen filtered scene textures. Total renderer texture counts match
the corresponding baseline: desktop day 20/19/19, desktop night 28/27/27, and
phone day/night 20/29. Seven focused material/profile/lighting checks pass.

Day submitted draw calls and triangles match each baseline pose. Night captured
shadow-update calls decrease: intersection 345→308, Mitsui 386→357, Daiya 423→384,
phone 451→412. These are captured render submissions, not FPS or hardware fluency
results. Mesh geometry and the number of lights/shadow maps are unchanged.

Glazing remains an opaque PBR approximation with repeated authored surface cues.
Strong corner washes and simplified vegetation remain visible. This evidence does
not establish real interior content, entrance access, measured material values,
or acceptable motion on physical phones. The four reviewed photographic references
inform building character; their pixels are absent from the runtime materials.
Continuous movement, view-dependent reflections, inspection and saved-view return
must be judged with the separate interactive walkthrough.
