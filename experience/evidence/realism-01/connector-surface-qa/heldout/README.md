# Independent held-out measurement verification

The [report](report.json) independently checks shared native COLMAP point tracks,
retained keypoints and saved poses, with separate measurements for both rendered
atlas variants. The [manifest](manifest.json) binds eight measurement/producer
files and 179 repository dependencies. Input keypoints and localization evidence
are referenced from the existing evaluation bundle.

| Recomputed measurement | Native atlas | 4096 atlas variant |
| --- | ---: | ---: |
| Rendered views | 24 | 24 |
| Eligible pixels, including uncovered regions | 9,731,056 | 9,731,056 |
| Covered pixels | 2,105,091 | 2,105,090 |
| Coverage | 21.632709% | 21.632698% |
| Pixels after excluding pose-feature neighborhoods | 1,676,793 | 1,676,793 |
| Covered-pixel mean absolute channel error, out of 255 | 24.031114 | 23.920727 |
| Remaining-pixel mean absolute channel error, out of 255 | 25.223118 | 25.096294 |
| Rank 67 remaining-pixel mean error, out of 255 | 19.280019 | 19.061220 |
| Rank 72 remaining-pixel mean error, out of 255 | 36.516719 | 36.564676 |

Repacking and PNG encoding have small, mixed effects on the two measured views.
The aggregate error decrease does not establish an improvement in human realism.

Shared checks reconstruct candidate selection from all 1,152 saved verified-pair
records, bind 48 fitting keypoint arrays exactly, and verify all 856 associations
and 2,223 native support-track memberships. The saved camera matrices reproduce
every positive-depth and final 4-pixel classification. Held-out ranks 67 and 72
retain 578 and 74 unique inliers respectively. Pose estimation is not rerun.

The portable bundle retains exact keypoints and verified match tuples. Descriptors,
raw tentative-match arrays and `features.db` are omitted. Consequently, portable
verification does not repeat database row, configuration or tentative-count checks.
The unchanged [native historical audit](historical/native/result.json) and
[4096 historical audit](historical/4096/result.json), together with their exact
executed producers, preserve the completed copied-database checks and original
absolute source identities. Frozen databases were never opened by the auditor.

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=artifacts/realism-01/connector-surface/python python experience/tools/connector-surface-qa/retain_heldout.py --verify experience/evidence/realism-01/connector-surface-qa/heldout
```

Install the pinned dependencies from
[requirements.txt](../../../../tools/connector-surface-qa/requirements.txt) into
the indicated Python directory when needed. The command verifies hashes and
recomputes both sets of pose classifications and saved-pixel measurements using
repository evidence. Generated verification outputs go into ignored `artifacts/`.

These are adjacent images from the same capture sequence with model-relative
estimated poses. Numeric agreement provides no independent surveyed accuracy,
human realism, continuous pedestrian surface, relighting or full-route acceptance.
Pixel verification checks saved colors and alpha; it does not rerender mesh
visibility. The 32-pixel exclusion discs do not establish independence from every
feature descriptor's support. Source-derived evidence retains **Irvin Chen /
Panoramax Taiwan, CC BY-SA 4.0** attribution.
