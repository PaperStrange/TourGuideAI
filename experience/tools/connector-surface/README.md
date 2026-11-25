# CPU surface reconstruction

The recorded experiment imports the frozen four-panorama COLMAP rig into official OpenMVS 2.4.0, estimates CPU depth maps, reconstructs triangles and applies source photograph textures. [Retained results](../../evidence/realism-01/connector-surface/README.md) bind source identities, original camera poses, commands, outputs and independent checks.

Python 3.12 uses [requirements.txt](requirements.txt). All dependencies, released executables, source downloads and depth caches belong in ignored artifacts. The native OpenMVS Ubuntu archive is pinned to SHA-256 `7104ae1ddd6ca38fbca9e0e4a70b20af59e21e0b497eb7181c864fbf38ca8d00`; its executable hashes and original package installation report are retained in [toolchain evidence](../../evidence/realism-01/connector-surface/toolchain/manifest.json).

Restore the exact original images using the [source intake instructions](../connector-surface-sources/README.md). The fitting directory must contain ranks 68–71 only. Ranks 67 and 72 remain reserved throughout preparation, densification, meshing and texturing.

```sh
mkdir -p artifacts/realism-01/connector-surface/python-tmp artifacts/realism-01/connector-surface/python-cache
TMPDIR="$PWD/artifacts/realism-01/connector-surface/python-tmp" PIP_CACHE_DIR="$PWD/artifacts/realism-01/connector-surface/python-cache" python -m pip install --target artifacts/realism-01/connector-surface/python --requirement experience/tools/connector-surface/requirements.txt
python experience/tools/connector-surface/acquire.py
PYTHONPATH=artifacts/realism-01/connector-surface/python python experience/tools/connector-surface/prepare.py --intake artifacts/realism-01/connector-surface-sources/fit --output artifacts/realism-01/connector-surface/run-new
PYTHONPATH=artifacts/realism-01/connector-surface/python python experience/tools/connector-surface/process.py --run artifacts/realism-01/connector-surface/run-new --stage dense
```

`acquire.py --verify-existing` verifies a previously downloaded archive and its extracted executables. It creates a new verification receipt and refuses to replace one. Every preparation and reconstruction stage likewise requires a new output or stage identity.

Before meshing, independently verify the dense PLY view lists using the actual internal image-array mapping in `prepared.json`: distinct physical sources, positive depth, original mask membership, native neighbor baselines and camera preservation. The [recorded independent checks](../../evidence/realism-01/connector-surface-qa/README.md) describe the observed boundary deviations and support angles. Keep those observations when assessing the resulting surface.

```sh
PYTHONPATH=artifacts/realism-01/connector-surface/python python experience/tools/connector-surface/process.py --run artifacts/realism-01/connector-surface/run-new --stage mesh
PYTHONPATH=artifacts/realism-01/connector-surface/python python experience/tools/connector-surface/process.py --run artifacts/realism-01/connector-surface/run-new --stage texture
PYTHONPATH=artifacts/realism-01/connector-surface/python python experience/tools/connector-surface/handoff.py --run artifacts/realism-01/connector-surface/run-new
```

`prepare.py` reproduces every original perspective JPEG with official COLMAP `PanoProcessor`; verifies its hash; retains the original upper-hemisphere masks; and omits exactly the 16 views whose masks contain zero valid pixels. All 1,377 original points and all four physical frames survive. Original 48-camera coordinates remain frozen. Two official reverse exports check image order and camera poses; regenerated reverse-export observations serve camera diagnostics only.

`process.py` records executable hashes, exact command arguments, timestamps, outputs and its executed producer. Densification retains view-support lists with `--archive-type -1`. Meshing explicitly consumes the resulting dense PLY. Tower priors, normalization, scale estimation, synthetic hole filling and smoothing are disabled. Original-resolution texture fitting disables sharpening and seam color adjustment. Native raw mesh and default mesh-cleaning results both remain available.

`texture_variant.py` runs the supported full-source-resolution 4096-atlas glTF/PNG derivative in a separate directory:

```sh
PYTHONPATH=artifacts/realism-01/connector-surface/python python experience/tools/connector-surface/texture_variant.py --run artifacts/realism-01/connector-surface/run-new --output artifacts/realism-01/connector-surface/texture-4096-new
```

The exporter preserves RGB photographs in external PNGs and marks the glTF material unlit. Review its actual geometry, atlas dimensions, triangle samples and held-out images independently. Changes to texture assignment across separate runs remain measurable limitations.

Offline verification of the retained original experiment needs only Python's standard library:

```sh
python experience/tools/connector-surface/verify.py --evidence experience/evidence/realism-01/connector-surface/run-01
python experience/tools/connector-surface/verify.py --evidence experience/evidence/realism-01/connector-surface/run-02
python experience/tools/connector-surface/verify.py --evidence experience/evidence/realism-01/connector-surface/review-inputs
python experience/tools/connector-surface/verify.py --evidence experience/evidence/realism-01/connector-surface/toolchain
python experience/tools/connector-surface/verify.py --evidence experience/evidence/realism-01/connector-surface/texture-4096-01
```

`retain.py`, `retain_inputs.py`, `retain_toolchain.py` and `retain_variant.py` package inspected artifacts without replacing an existing evidence directory. Compressed records retain both stored-byte and original-byte hashes. Native software archives, browser profiles and depth caches stay ignored.
