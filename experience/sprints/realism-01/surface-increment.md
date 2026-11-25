# Kyoto surface reconstruction · 25 November 2026

Continue from source checkpoint `c64c5dc`. The recovered four-camera model and
1,377 sparse points supply relative poses for a bounded surface experiment.
The complete 1,353.444 m / six-sight milestone and its
[acceptance matrix](acceptance.md) remain unchanged.

| Owner | Deliverable | Evidence required |
| --- | --- | --- |
| Source / scene | Restore the four fitted panoramas and reserve adjacent ranks 67 and 72 before fitting | Exact image bytes, original acquisition hashes, current receipts, rights, physical-frame membership and source dates |
| Reconstruction | Execute the supported CPU OpenMVS dense, mesh and texture workflow | Pinned release and binary hashes, complete relevant upstream instructions, all commands/settings/logs, camera conversion checks and actual outputs |
| Evaluation | Localize reserved images against frozen sparse geometry and evaluate visible surfaces | Actual 2D–3D associations, pose inliers/errors, unchanged fitted cameras/points, visible-pixel denominators and reproducible image measurements |
| Independent QA | Recompute surface and held-out measurements | Geometry/material validity, source exclusions, physical-camera support, visibility and measurement limits |
| Delivery | Provide an inspectable result, update checkpoint and synchronize commits | Actual browser controls, source attribution, immutable package identities, clean-checkout verification and hosted-byte checks |

## Frozen source roles

Ranks 68–71 of the 17 February 2026 collection
`cf65c61d-2a42-452d-8095-a1daee44e6a9` remain the four fitted physical positions.
Their original [source records](../../evidence/realism-01/connector-source-intake/selection/selected.json)
and [native camera model](../../evidence/realism-01/connector-rig-geometry/README.md)
are immutable inputs. Virtual views from a panorama share one physical center.

Ranks 67 and 72 are reserved for evaluation, subject to actual image acquisition
and supported pose recovery. Exclude them from dense reconstruction, mesh fitting,
texturing and adjustment of the four fitted cameras or points. Preserve every
localization outcome. Adjacent frames from the same capture sequence support a
bounded generalization check; independent capture-family, recognition and human
acceptance require their own sources and observations.

## Surface and measurement checks

- Preserve fixed projection calibration and explicit correspondence between
  native COLMAP images and imported OpenMVS cameras.
- Select stereo support across distinct physical positions. Co-located virtual
  directions cannot supply triangulation baseline.
- Carry the existing upper-hemisphere masks into dense processing. Ground and
  capture-vehicle reflections remain outside the current qualified input.
- Disable automatic tower-cylinder points, coordinate normalization, scale
  estimation and mesh hole filling. Record all actual algorithm settings.
- Check finite geometry, valid triangles, texture/material references, image
  support and output size. Report observed holes and uncovered regions.
- Report held-out pose validity and visible-pixel coverage before photometric
  errors. Failed poses or absent coverage leave the affected metric unverified.
- Keep metric scale, physical floor, lighting, eastbound coverage and full-route
  realism open until their required evidence exists. The approved Hall experience
  remains the visual reference.

Tools and reviewed evidence use dedicated `connector-surface*` directories in the
existing tool/evidence locations. Raw photographs, binaries, dependency caches,
working databases and browser profiles stay under ignored `artifacts/realism-01/`.
Each evidence record includes source, date, rights, location, method, limitations
and hashes. Free sources only; retain actual failed trials and setup attempts.
Commit validated increments and update the [checkpoint](../../docs/agent-checkpoint.md).
