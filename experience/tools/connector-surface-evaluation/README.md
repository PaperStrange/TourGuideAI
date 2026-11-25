# Frozen-scene held-out evaluation

This tool localizes two panoramas reserved before dense fitting, then measures the actual textured mesh from their estimated camera poses. It uses the original four-frame COLMAP model; it never bundle-adjusts that model or substitutes GPS camera positions.

The retained [results](../../evidence/realism-01/connector-surface-evaluation/README.md) include both matching attempts. Query-to-fitting matches transfer 3D IDs only after exact reproduction of all 48 fitting images and SIFT keypoint arrays. Two-dimensional feature measurements come from the original COLMAP observations, not the OpenMVS roundtrip export.

Pinned dependencies are in [requirements.txt](requirements.txt). Install into an ignored environment with its temporary/cache directories under `artifacts/realism-01/connector-surface-evaluation/`. In the recorded environment:

```sh
export PYTHONPATH=artifacts/realism-01/connector-surface-evaluation/python:artifacts/realism-01/connector-surface/python
export TMPDIR=/workspace/TourGuideAI/artifacts/realism-01/connector-surface-evaluation/temporary
export OPENBLAS_NUM_THREADS=1
export OMP_NUM_THREADS=2
python experience/tools/connector-surface-evaluation/evidence.py --verify experience/evidence/realism-01/connector-surface-evaluation
python experience/tools/connector-surface-evaluation/variant_evidence.py --verify experience/evidence/realism-01/connector-surface-evaluation/variant-4096
```

The offline check reads retained keypoints, pair associations, original model points, reference images, rendered images and masks. It recomputes both pose attempts and every pixel denominator/photometric result. It needs no raw downloads or feature database.

To repeat acquisition-dependent work, restore the exact source images from the [source evidence](../../evidence/realism-01/connector-surface-sources/manifest.json) and the frozen fitting inputs. Choose fresh ignored output directories; the tools refuse to overwrite runs. The recorded invocations were:

```sh
python experience/tools/connector-surface-evaluation/localize.py --source-root artifacts/realism-01/connector-surface-sources --output artifacts/realism-01/connector-surface-evaluation/run-01
python experience/tools/connector-surface-evaluation/relocalize.py --previous artifacts/realism-01/connector-surface-evaluation/run-01 --output artifacts/realism-01/connector-surface-evaluation/run-02
python experience/tools/connector-surface-evaluation/render.py --mesh artifacts/realism-01/connector-surface/run-02/scene_textured.obj --localization artifacts/realism-01/connector-surface-evaluation/run-02/result.json --output artifacts/realism-01/connector-surface-evaluation/render-01
```

Use each retained `executed-*.py` source snapshot when reproducing its exact historical implementation. The current renderer additionally accepts the separately evaluated OpenMVS unlit glTF atlas variant, with default-white base color and opaque material requirements. It retains external asset hashes before and after rendering.

The second command also verifies the native bundle, then checks the separate 4,096² atlas outputs and retained glTF/PNG hashes. Its reference JPEGs and pixel masks reuse the native bundle by exact hash; no pose is estimated again for this variant.

Photometry is conditional on actual ray coverage. The complete original upper-hemisphere partition, including sky, is the coverage denominator. A fixed 32-pixel neighborhood around every pose candidate is excluded only from the additional sensitivity metric; full covered-pixel errors remain recorded. No threshold in these tools qualifies realism, independent recognition or a completed walking route.
