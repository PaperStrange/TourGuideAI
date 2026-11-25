# Independent 4096 atlas audit

The native OpenMVS glTF derivative preserves all 66,755 oriented triangles with exact float32 vertex positions. Its 37,299 parsed vertices include duplicated coordinates at UV seams. The image and material references resolve to one 4096 × 4096 RGB PNG and an unlit material. The atlas requires 64 MiB for its RGBA base allocation; the retained 8192 atlas requires 256 MiB. Source images remain at 1520 × 1520.

| Measurement | Actual result |
|---|---:|
| Added or missing oriented triangles | 0 |
| Maximum vertex displacement | 0 |
| Constant-UV faces | 634, unchanged |
| Paired interior colour samples | 264,484 |
| Mean RGB absolute difference from 8192 JPEG | 1.158 / 255 |
| Median RGB absolute difference | 0.977 / 255 |
| 95th percentile RGB absolute difference | 2.734 / 255 |
| Maximum RGB absolute difference | 21.707 / 255 |

Four barycentric samples are evaluated on every triangle with nonconstant UVs in both outputs. The comparison uses mature trimesh loaders, canonical geometric corner order and bilinear image sampling with the exporter’s half-pixel convention. The baseline contains JPEG compression; the candidate uses PNG. These measurements preserve the observed differences without assuming equal texture assignments.

An additional diagnostic samples 4,096 evenly spaced triangles. For each sample, fitted source views must have positive depth, image coverage and four valid mask pixels for bilinear sampling. Across 16,232 eligible samples, the smallest RGB mean absolute difference among eligible views averages `0.001629 / 255`; 99.9877% are below `1 / 255`. This is an optimistic consistency measurement: source assignments and occlusion are unavailable. It contributes no held-out acceptance evidence.

## Reproduction

`audit.py` accepts explicit paths. Use the dependency versions recorded in `result.json`, restore the original run and native variant, and extract the original-resolution matrices using the official reader in the sibling `mask-audit` bundle.

```sh
python audit.py --baseline ORIGINAL_RUN --variant NATIVE_VARIANT --intrinsics source-intrinsics.json --output NEW_RESULT.json
python manifest.py
```

The original inputs and PNG remain in ignored artifacts. `command.json`, `result.json`, `source-intrinsics.json` and their hashes remain available in a clean checkout. Each evidence record identifies its source, date, rights, location, method and limitations. Performance beyond the atlas base allocation, full-route coverage, walkability and held-out appearance remain separate gates.
