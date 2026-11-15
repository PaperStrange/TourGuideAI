# Independent Kyoto native-model review · 15 November 2026

Reloading the actual run-02 COLMAP binary model reproduces four physical camera positions and 1,377 sparse points. Every retained point is observed from at least two physical positions. The reviewed outcome is a relative-geometry diagnostic.

| Recomputed measurement | Result |
|---|---:|
| Original panoramas / registered virtual images | 4 / 48 |
| Sparse points / actual observations | 1,377 / 4,386 |
| Points observed from at least three physical positions | 1,142 |
| Observations with positive camera depth | 4,386 / 4,386 |
| Minimum / median maximum physical triangulation angle | 1.5136° / 5.0515° |
| Median / 95th percentile observation reprojection error | 0.2961 px / 1.4896 px |
| Maximum observation reprojection error | 3.4928 px |
| Physical camera graph connected through point tracks | Yes, all four positions |

The independent producer uses `pycolmap.Reconstruction`, `Camera.img_from_cam` and `calculate_triangulation_angle`. It recomputes each observation from the native 3D point and camera pose, checks its original track reference, and groups virtual views by physical frame before measuring angles. It verifies the known pinhole projection intrinsics and coincident sensor centers within each panorama. Every point meets the unchanged 1.5° physical-angle filter and every observation meets the unchanged 4 px error filter. These checks read model files and perform numerical calculations without opening a reconstruction database.

Declared GPS distances and recovered relative baselines have different proportions:

| Source ranks | Model baseline / largest model baseline | Declared GPS distance | GPS distance / largest GPS distance |
|---|---:|---:|---:|
| 68 → 69 | 0.0535 | 4.5647 m | 0.4762 |
| 69 → 70 | 0.4993 | 2.2823 m | 0.2381 |
| 70 → 71 | 0.4472 | 2.7388 m | 0.2857 |
| 68 → 71 | 1.0000 | 9.5858 m | 1.0000 |

Each source position declares 4 m horizontal accuracy. The GPS coordinates provide no independent geometric ground truth at these separations. No scale or alignment has been fitted. The model's largest baseline is 10 arbitrary units; this value carries no metre interpretation. Ground, continuous walking surface, source coverage, realistic appearance and the full 1.35 km route remain separate requirements.

The [report](report.json) retains every independently recomputed observation and point measurement, source hashes, package versions, frame centers, all six pair baselines and shared-point counts. The [manifest](manifest.json) hashes the [native model](model/images.bin), [source metadata](selected.json) and [executed producer](executed-model-geometry.py). The source capture was made on 17 February 2026 by Irvin Chen / Panoramax Taiwan, under CC BY-SA 4.0. The four positions are west of the approved first route edge.

Run the offline verification using `pycolmap==4.2.1`, `numpy==2.5.4` and `pyproj==3.8.0`:

```sh
PYTHONPATH=artifacts/realism-01/free-connector-next/python:artifacts/realism-01/connector-reconstruction/python python experience/tools/connector-reconstruction/model-geometry.py --verify experience/evidence/realism-01/connector-rig-geometry
```

Verification checks the retained byte hashes and exactly reproduces the measurements. Original run files are hash-checked before and after acquisition. Runtime assets, source databases and geometric thresholds are unchanged by this review.
