## Kyoto captured-surface research viewer

The interactive comparison uses the native OpenMVS 4096-pixel glTF surface from four fitted panorama positions. Source photographs and derived surfaces are credited to Irvin Chen / Panoramax Taiwan under CC BY-SA 4.0. Three.js 0.186.1 and its official loaders and OrbitControls are distributed with their MIT license.

The canonical research entry offers four matched photograph/camera choices, explicit 3D loading, drag and zoom, keyboard controls, reset, and complete English/Chinese guidance. Rendering uses captured sRGB colors with MeshBasicMaterial and NoToneMapping. The viewer explicitly generates normal mipmaps and uses trilinear minification for the full-resolution texture; the native glTF sampler uses linear filtering and its source bytes remain unchanged. The original source camera matrices and native pycolmap point projections establish the OpenCV/Three coordinate conversion. The source principal point is `(760, 760)` in 1520-square pixel-edge coordinates; OpenMVS's internal `(759.5, 759.5)` pixel-center convention is recorded separately.

The 66,755 triangles retain native model-relative coordinates. Of these, 634 faces carry OpenMVS's unassigned-patch marker. Source-view comparison measures fitted views; reserved ranks 67 and 72 measure neighboring captures from the same sequence. Rank 72's localized pose has final support in three upper directions. Coverage and excluded pixels are reported before color residuals. The browser preserves the native glTF double-sided material; the numerical evaluator also intersects both sides. Browser filtering uses trilinear mipmaps; evaluation uses bilinear atlas samples. Appearance, metric scale, pedestrian ground, independent recognition, continuous route and physical-device latency remain unqualified.

The 8192-pixel native baseline remains in its retained source evidence. Its atlas requires 341.33 MiB with RGBA8 mipmaps. The 4096 candidate requires 85.33 MiB before render targets; its geometry and atlas are independently compared to the baseline. The combined 3D asset download is 6,563,792 bytes. The existing 4 MiB startup, 2 MiB section and 96 MiB texture/target gates remain open. Explicit loading controls the research transfer boundary. Browser reports record decoded texture dimensions, native mipmap filters, drawing-buffer dimensions, samples, color/depth/stencil bits, DPR and the estimated attachment allocation. Driver padding, compositor, backing buffers and physical allocation remain unknown.

Reproduction, from the repository root, after retaining the surface, source views, native/4096 evaluations and audits:

```bash
node experience/tools/connector-surface-review/package.mjs artifacts/realism-01/connector-surface-review/package-N FULL_INSPECTED_BASE_COMMIT
node experience/tools/connector-surface-review/check.mjs artifacts/realism-01/connector-surface-review/package-N artifacts/realism-01/connector-surface-review/qa-N
node experience/tools/connector-surface-review/retain.mjs --package artifacts/realism-01/connector-surface-review/package-N --qa artifacts/realism-01/connector-surface-review/qa-N/result.json
node experience/tools/connector-surface-review/verify.mjs
node experience/tools/connector-surface-review/verify-source.mjs experience/evidence/realism-01/connector-surface-review/package EXACT_SOURCE_COMMIT artifacts/realism-01/connector-surface-review/source-commit.json
```

`check.mjs` uses installed Chromium and Playwright for trusted native inputs, actual WebGL draws and readPixels, independent projection checks for every selected camera, lazy-transfer boundaries, EN/ZH control guidance, mobile/desktop layout, and exact package bytes. Screenshots are retained without visual interpretation. SwiftShader supplies no device latency or human realism acceptance. Failed runs stay in their ignored run directories. `retain.mjs` accepts multiple `--qa` and `--receipt` arguments for later hosted execution and publication evidence.

The previous research index is preserved as `index-20261115.html`; every earlier content path keeps its bytes. Application modules and the approved Hall runtime are outside this package. Source manifests, hashes, original rights, capture locations, and methods remain linked through the package manifest and retained records. Offline verification reads committed evidence and needs no imagery provider or browser. Exact source verification binds every package file to a subsequent immutable commit, including vendored dependency bytes and generated metadata.
