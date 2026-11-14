# Kyoto panorama reconstruction diagnostics

This CPU workflow measures image overlap and attempts sparse reconstruction from
three actual licensed panoramas. It supports fixed virtual perspective cameras
and COLMAP's native `EQUIRECTANGULAR` camera. The
[retained results](../../evidence/realism-01/connector-reconstruction/README.md)
identify every source and preserve both completed attempts.

Install the pinned dependencies into the ignored workspace. Keep all temporary
and plotting caches there:

```sh
mkdir -p artifacts/realism-01/connector-reconstruction/python-tmp artifacts/realism-01/connector-reconstruction/python-cache artifacts/realism-01/connector-reconstruction/plot-cache
TMPDIR="$PWD/artifacts/realism-01/connector-reconstruction/python-tmp" PIP_CACHE_DIR="$PWD/artifacts/realism-01/connector-reconstruction/python-cache" python -m pip install --target artifacts/realism-01/connector-reconstruction/python -r experience/tools/connector-reconstruction/requirements.txt
```

The [source intake](../../evidence/realism-01/free-connector-next/README.md)
provides `selected.json`, three highest-resolution JPEGs and their exact receipts
under `artifacts/realism-01/free-connector-next/intake/`. The reconstruction tool
requires each acquired JPEG to match its receipt and declared dimensions.
Panorama ranks 57, 58 and 59 belong to one sequence, captured on 19 February 2026
by Irvin Chen under CC BY-SA 4.0. Their declared camera positions are west of the
approved route's first edge.

Run each experiment into a new output directory, retaining its real log:

```sh
TMPDIR="$PWD/artifacts/realism-01/connector-reconstruction/python-tmp" PYTHONPATH=artifacts/realism-01/connector-reconstruction/python python experience/tools/connector-reconstruction/overlap.py --intake artifacts/realism-01/free-connector-next/intake --output artifacts/realism-01/connector-reconstruction/run-perspective > artifacts/realism-01/connector-reconstruction/run-perspective.txt 2>&1
TMPDIR="$PWD/artifacts/realism-01/connector-reconstruction/python-tmp" PYTHONPATH=artifacts/realism-01/connector-reconstruction/python python experience/tools/connector-reconstruction/overlap.py --projection spherical --intake artifacts/realism-01/free-connector-next/intake --output artifacts/realism-01/connector-reconstruction/run-spherical > artifacts/realism-01/connector-reconstruction/run-spherical.txt 2>&1
```

Perspective mode creates four independent groups of three 90° views at
1024 × 1024 pixels. `py360convert` supplies the projection. Its inclusive pixel
endpoints and COLMAP's half-pixel convention produce fixed intrinsics
`511.5, 511.5, 512, 512`. Spherical mode uses all azimuths of the same three
6080 × 3040 panoramas, with a 3040-pixel maximum feature-extraction size. COLMAP
handles coordinates at the original image resolution.

Both modes use CPU SIFT, two threads, exhaustive matching and a common upper-half
feature mask. Source review found car-roof reflection and traffic in the lower
hemisphere. The mask also excludes the ground. Camera GPS, heading and declared
accuracy remain provenance; they do not enter fitting or establish metric scale.
Physical stitching calibration remains unverified.

Sparse mapping keeps the library's geometric initialization settings. The
minimum model size is three images for this three-camera test. COLMAP's own
automatic initialization retries and constraint adjustments remain visible in
the logs. A completed diagnostic may produce zero sparse models. The report
records that outcome without converting it into an acceptance pass.

`retain.py` copies the exact executed producer, results, settings, model files
when present and compact pair observations read through the official database
API. It produces numerical comparison figures. Use a new evidence directory for
each retained experiment; the existing frozen directories are immutable.

Verify the retained experiments, optionally against a clean archive with `--root`:

```sh
PYTHONPATH=artifacts/realism-01/connector-reconstruction/python python experience/tools/connector-reconstruction/verify.py --experiment perspective
PYTHONPATH=artifacts/realism-01/connector-reconstruction/python python experience/tools/connector-reconstruction/verify.py --experiment spherical
```

The verifier checks exact file hashes, source selection, producer identity,
pair-count consistency and inlier membership. If a model exists, it independently
loads the COLMAP binary model and compares every point, camera and reported
reprojection statistic. File integrity and internal geometry consistency leave
continuous floors, independent control, lighting, appearance and full-route
acceptance open.
