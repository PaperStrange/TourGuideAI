# Initial geometry replay: three Kyoto panoramas

This package reproduces the three initial-pair attempts from the shared-rig
run-01 using COLMAP 4.2.1 and the actual retained correspondence database.
The source is Irvin Chen's Panoramax Taiwan imagery, CC BY-SA 4.0; source IDs,
capture dates, coordinates and attribution are retained in
[selected.json](source-run/selected.json). These three cameras lie west of the
first approved route edge. This diagnostic establishes no eastbound route
coverage, metric scale, floor, collision, lighting or player acceptance.

| Seed image IDs | Physical frames / virtual images | Eligible tracks before geometry | Initial 3D points | Maximum diagnostic angle |
|---|---:|---:|---:|---:|
| 8 / 7 | 2 / 24 | 60 | 0 | 2.35761° |
| 36 / 35 | 2 / 24 | 109 | 0 | 0.83900° |
| 36 / 34 | 2 / 24 | 112 | 0 | 1.18185° |

The replay uses the existing pipeline's final automatic initialization stage:
25 inliers and 4°. Its complete library schedule is `(100,16°), (50,16°),
(50,8°), (25,8°), (25,4°)`. Matching, graph membership, the two-view-track
policy, the 2° angular residual limit and camera calibration remain unchanged.
Every official `TriangulateImage` call returns zero new observations. All 281
eligible candidates are rejected by the official triangulation estimator.
Of 281 midpoint attempts, 280 return finite points with positive camera depth;
all 280 measured acute angles are below 4°. This result describes the retained
tracks and estimated poses for this three-panorama run. The separate four-frame
shared-rig trial has its own evidence and acceptance assessment.

The original end-of-run database hash is
`da40dbfad58945367d8218a3edec029a4b93e9f09d027cb85d226a93e1813dc6`.
Those exact bytes are unavailable after earlier library inspections. The sealed
gzip contains the post-inspection derivative, decoded SHA-256
`2e007e817b23783d1fc35d89198c95e4305d6af10e8eb10ef9be5134822114b1`.
The exact chronology of the modifying library opens is unknown. The replay and
retention independently confirm that this derivative stays unchanged.
`Database.open` is applied only to disposable copies; its header changes are
recorded. No database header is reconstructed.

[result.json](result.json) preserves the completed run's exact report,
coordinates, eligibility, camera poses, API settings and source hashes.
[manifest.json](manifest.json) seals every retained file and identifies the
decoded database bytes. The original producer and current verification producer
are retained under `producers/`; the complete pinned official sources and tag
receipt are under `upstream/`. Upstream source files retain their BSD license
headers. Native database formats are read through SQLite/COLMAP APIs.

From a clean checkout with [requirements.txt](requirements.txt) installed:

```sh
PYTHONDONTWRITEBYTECODE=1 OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=2 python experience/tools/connector-reconstruction/seed-geometry.py --verify experience/evidence/realism-01/connector-seed-geometry --verification-output artifacts/realism-01/connector-parallax/seed-verification-01
```

The verification destination must be new. Verification hashes every file,
decompresses the sealed database into that ignored directory, repeats all three
in-memory seed attempts, and compares every seed field with the frozen report.
Counts and decisions must match exactly; floating values use relative tolerance
`1e-9` and absolute tolerance `1e-10`. Retained file hashes are checked again after
replay. No images, browser, network service or original artifact directory is
needed for this verification.
