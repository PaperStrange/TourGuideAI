# Independent Kyoto surface measurements · 25 November 2026

| Recomputed measurement | Result |
| --- | ---: |
| Original physical camera positions / imported virtual views | 4 / 32 |
| Original views with zero retained mask pixels, omitted before densification | 16 |
| Dense points / source-view observations | 39,651 / 144,118 |
| Points supported by two / three / four physical positions | 7 / 14,472 / 25,172 |
| Positive-depth observations | 144,118 / 144,118 |
| Minimum / median maximum physical parallax | 0.9147° / 10.2400° |
| Points below 1.5° physical parallax | 3 |
| Mesh vertices / triangles / zero-area triangles | 33,482 / 66,755 / 0 |
| Connected face components / largest component | 5 / 53.68% of faces |
| Maximum triangle edge / maximum physical-camera baseline | 13.531 / 10 arbitrary units |
| Maximum face-centroid distance to the dense cloud | 4.702 arbitrary units |

The [report](report.json) independently reloads the native source cameras and the
OpenMVS camera roundtrip, then reads actual PLY support lists with `plyfile`.
Every dense point has observations from at least two distinct original panorama
positions. The largest physical baseline remains **10 arbitrary units**.
Nearest-cloud measurements describe mesh interpolation; physical surface accuracy,
continuous ground, collision and route quality remain unqualified.

At the original 1,520 px resolution, 43 source-view projections sample excluded
mask pixels within 1–1.414 px of a valid pixel. Using the actual saved 760 px camera
intrinsics and OpenCV nearest-neighbor mask resizing, nine projections sample
excluded pixels within 1–1.414 native pixels. Their point IDs, coordinates and
distances are retained. Fused 3D points can move relative to individual depth-map
observations; these checks expose the boundary differences. All points and source
masks remain unchanged.

The actual atlas is **8,192 × 8,192 RGB**, encoded as a 2,262,452-byte JPEG. A
hypothetical uncompressed RGBA8 upload requires 256 MiB for its base level and
341.33 MiB with every mip level. These calculated allocations exceed the 96 MiB
production texture budget. Physical GPU allocation and browser performance require
their own measurements.

[Exact geometry inputs](manifest.json), [per-point measurements](point-measurements.npz),
the executed producer and pinned source reader are retained. Source-derived imagery
and geometry retain **Irvin Chen / Panoramax Taiwan, CC BY-SA 4.0** attribution.
The capture positions are west of the approved route start. Held-out-view pose,
coverage and image-error measurements receive their own evaluation.

The [independent held-out audit](heldout/README.md) recomputes both atlas
variants' saved-pixel measurements and query-pose classifications. The native
surface covers 30.24% and 13.03% of the two reserved queries' eligible pixels;
these denominators include sky. Its separate manifest preserves the distinction
between historical database checks and portable retained-data verification.

```sh
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=artifacts/realism-01/connector-surface/python python experience/tools/connector-surface-qa/retain.py --verify experience/evidence/realism-01/connector-surface-qa
```

Verification checks 15 retained files and 18 original-source dependencies, then
recomputes every physical-support count, depth, angle, mask projection, mesh
measurement and texture allocation. Counts and decisions compare exactly;
floating measurements use relative and absolute tolerances of `1e-10`.

