# Shared virtual-camera panorama trial

This tool runs the pinned official COLMAP 4.2.1 panorama projection and shared-rig workflow on real licensed Kyoto captures. Twelve virtual images share each original panorama's physical center. A successful model therefore requires distinct physical frames and cross-frame structure; 12 rendered faces do not count as 12 recovered camera positions.

| Retained trial | Original sources | Virtual images | Stored / usable pair geometries | Recovered physical frames | Sparse points | CPU elapsed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| [Original spacing, 19 February](../../evidence/realism-01/connector-rig/run-01/summary.json) | 3 | 36 | 20 / 11 | 0 | 0 | 57.65 s |
| [Denser sequence, 17 February](../../evidence/realism-01/connector-rig/run-02/summary.json) | 4 | 48 | 103 / 73 | 4 | 1,377 | 84.10 s |

Both trials used identical reconstruction algorithm settings. The second trial changes the real input sequence, so the comparison supports feasibility on the denser source set; it does not isolate a single causal factor. Sources are Irvin Chen / Panoramax, CC BY-SA 4.0. All positions lie west of the approved first route edge, in the Shijō–Karasuma crossing area. The denser sequence's declared GPS spacing totals 9.586 m with 4 m horizontal accuracy per position; these coordinates are not metric controls and are excluded from fitting.

The denser trial passes the bounded **relative-camera recovery** diagnostic. All 1,377 points have observations from at least two original frames; 1,142 span at least three. The acute physical triangulation angle is at least 1.514°, with median 5.052°. Mean point reprojection error is 0.455 px; the maximum actual observation error is 3.493 px, and every observation has positive camera depth. Known virtual intrinsics and rig transforms remain fixed. This establishes neither surveyed scene shape nor metric scale, walkable ground, occlusion correctness, route coverage, appearance, or continuous walking acceptance.

The original-spacing trial completed with no sparse model. Its retained log shows three selected initial pairs and no subsequent bundle adjustment: initial triangulation yielded no 3D points. Official automatic initialization retries are retained, including the final 25-inlier / 4° stage. No geometric threshold was changed by this wrapper. Default `min_model_size=10` counts virtual images and did not cause that initialization failure. See the [independent failure analysis](../../evidence/realism-01/connector-parallax/README.md) when present in the checkout.

## Reproduce

Use Python 3.12+ with [requirements.txt](requirements.txt). Install into ignored `artifacts/` and keep pip caches and temporary files there. The exact installed official `pycolmap.panorama` file must match the retained [upstream source](../../evidence/realism-01/connector-reconstruction/spherical/producers/upstream-panorama.py). `run.py` checks this, the frozen selection, original JPEG hashes, licensing, native 6080×3040 dimensions, and projection metadata before reconstruction.

The following commands use the already prepared local dependency directories; a clean checkout must first acquire those pinned dependencies and the licensed HD inputs from the retained source URLs and receipts.

```bash
export TMPDIR="$PWD/artifacts/realism-01/connector-rig/python-tmp"
export PYTHONPATH=artifacts/realism-01/connector-rig/python:artifacts/realism-01/connector-reconstruction/python
python experience/tools/connector-rig/run.py \
  --intake artifacts/realism-01/connector-source-intake/intake \
  --selection-reference experience/evidence/realism-01/connector-source-intake/selection/selected.json \
  --output artifacts/realism-01/connector-rig/run-new \
  > artifacts/realism-01/connector-rig/run-new.txt 2>&1
python experience/tools/connector-rig/retain.py \
  --run artifacts/realism-01/connector-rig/run-new \
  --output experience/evidence/realism-01/connector-rig/run-new
python experience/tools/connector-rig/verify.py \
  --evidence experience/evidence/realism-01/connector-rig/run-new
```

For the original source set, use `artifacts/realism-01/free-connector-next/intake` and its frozen `experience/evidence/realism-01/free-connector-next/records/selected.json`. Output directories must be new. Never overwrite a previous actual trial.

`run.py` uses 90° overlapping projections at four azimuths and pitches −35°, 0°, +35°. Official closest-camera partition masks intersect the original spherical upper hemisphere, preventing original lower-half ground and capture-vehicle reflection from contributing features. All original pixels remain unchanged. Camera calibration is SIMPLE_PINHOLE with 1520×1520 pixels and focal length 760 px; each panorama forms one 12-sensor rig frame. Matching skips same-frame pairs and uses official rig verification. Source GPS, invented scale, ground planes, collision proxies, and manual poses are excluded.

## Retained evidence and verification

Each trial contains the exact executed producer, official upstream source/license, settings, original acquisition receipts, immutable run result, actual masks, compact keypoints/matches/inliers, actual sparse binaries where available, numerical comparison board, and file manifest. Hash records include source, date, rights, location, method and limitations. Raw HD images, rendered views, descriptors, full databases and dependency caches remain ignored.

The independent [verify.py](verify.py) checks recorded hashes, acquisition binding, official masks and feature rays, pair index membership, fixed settings, rig composition, and the actual sparse models. For positive models it recomputes camera centers, calibration, actual observation depth and reprojection error, connected physical tracks, and acute parallax for **every** point. Its report separates evidence integrity, relative-camera recovery and the still-unqualified continuous-route milestone.

**Database provenance limitation:** initial diagnostic `pycolmap.Database.open` calls changed the first trial's SQLite header counters before retention. Its original database bytes are unavailable; the immutable run hash remains unchanged. [database-export.json](../../evidence/realism-01/connector-rig/run-01/database-export.json) identifies the observed derivative and compares every retained feature, stored-pair, frame and rig count with the original result. An isolated-copy reproduction records the actual changed header bytes. The second trial's original database still matches its run-end hash. Retention opens only isolated database copies and verifies that the source remains unchanged; no original header is reconstructed. Sparse model binaries and all source/producer hashes have separate integrity checks.

The current runner uses the official triangulation-angle function and an explicit every-point physical-frame gate. The retained executed trial producers predate those diagnostic-only refinements; the independent verifier applies the stronger checks to their actual output. Reconstruction settings are unchanged.
