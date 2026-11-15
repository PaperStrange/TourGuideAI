# Shared-camera Kyoto reconstruction · 15 November 2026

Continue R19 from source checkpoint `3bb0b5e`. The public architectural reference,
free-source constraint and complete 1,353.444 m / six-sight objective remain the
basis for this increment. The preceding perspective and spherical trials retain
their original reports and zero-model outcomes.

| Owner | Work | Required evidence |
| --- | --- | --- |
| Reconstruction | Execute the supported COLMAP virtual-camera rig on the same three licensed panoramas | Pinned upstream implementation, exact source images, actual settings/logs, fixed rig calibration and original panorama-frame counts |
| Independent geometry review | Check pair geometry and initialization constraints using the official API | Recomputed pose/parallax from actual matched coordinates; missing database fields stay unmeasured; preserve initialization settings |
| Source / scene | Inspect complete nearby collection metadata for denser eastbound support | Original paginated responses, attribution/rights, collection completeness, exact route correspondence, capture dates and source hashes |
| QA / delivery | Publish an updated visual research comparison after validation | Actual model/camera results, geographic limitations, desktop/mobile checks, published-byte identities and a clean-checkout checkpoint |

## Reconstruction gates

Require three distinct registered **original panorama frames** for connected
three-camera recovery. The virtual views within one panorama share a center and
cannot increase that physical-camera count. Preserve the known relative rotations,
zero virtual-camera translation and declared projection intrinsics. Record finite
camera poses, cross-frame tracks, reprojection errors and triangulation geometry.
Any supported additional reconstruction method keeps its own settings and result.

The source upper-hemisphere mask excludes ground and reflected capture-vehicle
surfaces. A sparse model therefore establishes no walking floor. Model scale,
independent control, eastward surface coverage, occlusion, daylight/night,
appearance and physical-device performance require their own acceptance evidence.
GPS metadata remains a provenance observation until independently qualified.

No reduced geometric threshold or synthetic ground can establish acceptance.
Retain all actual attempts, including library initialization retries and failures.
Raw HD imagery, crops, databases, compiler/package caches and browser profiles
stay under ignored `artifacts/realism-01/` directories.

## Source and delivery gates

Inspect every page of each selected collection. Geographic collection bounds and
camera positions establish search coverage; surface visibility and useful overlap
need image/geometry review. Source families used for reconstruction stay separate
from held-out appearance references. Supplier contact and paid acquisition remain
outside this period.

Update the existing research-board URL with verified results. Keep readable
comparison figures and source photography, exact source and implementation
identities, and explicit model-versus-route qualification. Commit validated tools,
evidence and the [agent checkpoint](../../docs/agent-checkpoint.md), then push the
source branch. The [milestone acceptance matrix](acceptance.md) remains unchanged.
