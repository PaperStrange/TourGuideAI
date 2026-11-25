# Independent surface QA

`analyze.py` reads actual OpenMVS PLY outputs with `plyfile`, imports the camera
roundtrip with the unchanged official COLMAP reader and binds every view to the
original native `pycolmap` model. Support is counted by physical panorama frame.
OpenCV, SciPy and Trimesh provide mask resizing, boundary distances, nearest-point
queries and mesh topology measurements. No scene fitting, source filtering or
database opening occurs in this audit.

Install [requirements.txt](requirements.txt) in an ignored environment. Preserve
the exact source masks and original model referenced by the retained manifest.

The implemented command accepts `--prepared`, `--roundtrip`, `--reader`, `--dense`
and a new `--output` directory under `artifacts/realism-01/connector-surface-qa/`.
Add `--mesh`, `--native-intrinsics` and `--texture` for the completed surface audit.
`--native-intrinsics` reads the saved scene's actual K/R/C values exported by the
official OpenMVS interface reader. The [executed arguments](../../evidence/realism-01/connector-surface-qa/execution.json)
identify this run exactly.

`retain.py --retain OUTPUT_DIRECTORY` retains immutable input bytes and the
actual report. `retain.py --verify EVIDENCE_DIRECTORY` works offline, validates
all hashes and independently recomputes the measurements from retained geometry.
It requires the recorded package versions; original photographs and transient
depth maps remain outside this verification dependency.

The [reviewed results](../../evidence/realism-01/connector-surface-qa/README.md)
separate relative multi-position support, observed mask-boundary differences,
mesh interpolation and texture allocation from physical appearance and walking
acceptance.

`heldout.py` independently checks the retained query keypoints, native point
tracks, fixed camera poses, coverage masks and saved-pixel errors. The separate
[held-out bundle](../../evidence/realism-01/connector-surface-qa/heldout/README.md)
retains both original copied-database audits and portable checks of the native
and 4096 atlas variants. Run `retain_heldout.py --verify
experience/evidence/realism-01/connector-surface-qa/heldout` to recompute the
portable checks. Its explicit omissions cover absent database rows and raw
tentative matches; it does not rerun pose estimation or raycasting.
