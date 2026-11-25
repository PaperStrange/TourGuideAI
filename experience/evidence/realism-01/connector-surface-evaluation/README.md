# Actual held-out surface diagnostic · 25 November 2026

Two pre-reserved adjacent panoramas were localized against the unchanged four-panorama, 1,377-point fitting model. Both poses support a limited held-out rendering experiment. The incomplete mesh does **not** pass appearance or route acceptance.

| Actual attempt | Rank 67 | Rank 72 |
|---|---|---|
| Same-index matching; 96 pairs | Pose found; original RANSAC mask contains refined residuals above 4 px; ineligible | No verified 2D–3D associations; ineligible |
| All query-to-fit directions; 1,152 pairs | 578 / 740 unique 3D IDs within 4 px and positive depth | 74 / 104 unique 3D IDs within 4 px and positive depth |
| Final median / p95 reprojection error | 0.538 / 2.057 px | 0.939 / 3.267 px |
| Final maximum reprojection error | 3.802 px | 3.729 px |

The second attempt uses the same threshold and one bounded pose-only refinement of the recomputed consensus. Original RANSAC masks, original refined poses, final masks, every candidate and every supporting native observation remain in the [localization report](localization/run-02/result.json). The [first attempt](localization/run-01/result.json) remains intact. Official approximate-coordinate unique counts and unique model-point ID counts are separate fields.

| Native 8,192² atlas rendering | Rank 67 | Rank 72 |
|---|---:|---:|
| Reported virtual views / views with eligible pixels | 12 / 8 | 12 / 8 |
| Eligible upper-hemisphere pixels | 4,865,528 | 4,865,528 |
| Pixels intersecting the actual surface | 1,471,186 | 633,905 |
| Surface coverage | 30.24% | 13.03% |
| Covered pixels outside pose-candidate neighborhoods | 1,098,646 | 578,147 |
| Mean absolute RGB channel error on those pixels, out of 255 | 19.28 | 36.52 |

See [aggregate results](summary.json), [all 24 view records](render/result.json), and the [texture producer receipt](texture-source.json). Each view retains the exact reference JPEG, coverage-alpha render, original eligible mask and 32-pixel pose-neighborhood mask. Full covered-pixel errors are recorded separately. Missing geometry stays missing; sky is included in the eligible denominator, so these percentages are not façade-only completeness measurements.

The separate [4,096² lossless PNG atlas diagnostic](variant-4096/summary.json) uses the same poses, masks and sampling policy. Its rank 67 / 72 covered counts are 1,471,185 / 633,905; remaining-pixel errors are 19.06 / 36.56 out of 255. Exactly one pixel changes coverage relative to native OBJ rendering; no cause is asserted. Its [30-file manifest](variant-4096/manifest.json) preserves all 24 new render outputs and binds unchanged reference/mask files to the native bundle. Both native and variant artifacts passed independent numerical audits; those audits verify saved ray-coverage masks and photometry, not a second independently implemented raycaster.

Rank 72's inliers occupy only virtual cameras 8, 9 and 11. Its other directions therefore depend on a rig pose estimated from that limited angular support. Both reserved panoramas share the fitting capture sequence and conditions. They do not establish independent capture-family recognition, metric scale, navigable ground, relighting, human realism or coverage of the approved 1.35 km route.

Rendering uses frozen native geometry, Embree first intersections and unlit bilinear atlas sampling. OpenMVS writes `Tr 1.0` in its OBJ material even though its source material is RGB and its own loader ignores that property. This diagnostic explicitly treats captured RGB as opaque; it is not an opacity interpretation or browser shader test. The native 8,192² atlas result must not be attributed to a different delivery atlas.

Provenance: Irvin Chen / Panoramax Taiwan, 17 February 2026 source capture, CC BY-SA 4.0. [Reservation](source/assignment.json) predates downloads and fitting. [Acquisition](source/acquisition.json) and the [source manifest](source/manifest.json) bind exact sources. [Manifest](manifest.json) records hashes, rights, location, methods and limitations for 124 retained data/producer files; this explanatory README is outside that frozen manifest.

The [offline verifier](../../../tools/connector-surface-evaluation/README.md) recomputes native-observation binding, both actual pose attempts and all image metrics. Independent QA separately reproduced numerical associations, pose residual classifications, masks and rendering metrics without re-estimating poses.
