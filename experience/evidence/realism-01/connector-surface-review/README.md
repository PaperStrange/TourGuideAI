# Published Kyoto surface comparison · 25 November 2026

The [interactive preview](https://paperstrange.github.io/TourGuideAI/previews/kyoto-source-review/)
offers four original photograph/camera choices, explicit 3D loading, drag, zoom,
keyboard controls, Reset and English/Chinese guidance. The surface uses captured
daylight colors and native double-sided geometry. Original image bytes and
reconstruction coordinates remain unchanged; the browser explicitly applies
full-resolution trilinear mipmaps.

| Check | Actual result | Retained evidence |
| --- | --- | --- |
| Packaged desktop/mobile walkthrough | 57 passing checks, including capture selection during loading | [Local report](qa/1-local/result.json) |
| Hosted desktop/mobile walkthrough | 57 passing checks; zero page or HTTP errors | [Public report](qa/2-public/result.json) |
| Native camera projection | Four source cameras; maximum error approximately 1.14 × 10⁻¹² px | Both browser reports |
| Published bytes | All 198 files match, including the package manifest | [HTTPS verification](receipts/6-https-bytes.json) |
| Geometry and texture download | 6,563,792 bytes | [Package manifest](package/package-manifest.json) |
| Texture plus framebuffer estimate | 102.96 MiB desktop; 89.01 MiB mobile viewport | Public report, reported DPR 1 and four samples |
| Reserved-view surface coverage | 30.24% / 13.03%, including sky in the eligible denominator | [Independent evaluation](../connector-surface-qa/heldout/README.md) |

Chromium used SwiftShader. Texture and framebuffer calculations omit unknown
driver padding, compositor/backing buffers and physical allocation. The 96 MiB
allocation gate, 4 MiB startup gate, 2 MiB section gate and physical-device fluency
remain open. Screenshots retain actual rendered output without visual grading.
Ground, metric scale, continuous eastward coverage, independent recognition,
human realism and the complete 1,353.444 m / six-sight route remain unqualified.

Package manifest SHA-256:
`5625b6dd2289308c7629d74c3c10d05fea8c0f1e1a275f3126725af52b5f2c8e`.
The [exact source binding](receipts/1-source-commit.json) identifies
`e3a57cb817ea14aa7a891be60de37ef8280cf329`; packaging base is
`fae1e1165e321ba5887a9ceedfc4cc15e42496c9`.
Pages commit `a3fce128e0d70d455c3d6975d5c88026bfc975db` has
[built successfully](receipts/5-build-02.json), with tree
`c7b49e24604e2ec5d596843993c715339717924e`.
The [publication audit](receipts/2-audit.json) confirms every other published
path is unchanged. Of the previous 157 paths, 155 keep their exact bytes;
the previous homepage is also retained as `index-20261115.html`. The current
homepage and package manifest carry this increment.

The [235-file evidence manifest](manifest.json) binds exact package, producer,
browser and publication records. It also retains the two initial browser setup
and texture-policy attempts as historical receipts. The tested final package is
identified separately in both successful reports. Raw browser profiles, source
downloads and caches stay ignored. Source photographs and derived surfaces are
credited to Irvin Chen / Panoramax Taiwan under CC BY-SA 4.0; Three.js retains
its MIT license. [Reproduction instructions](../../../tools/connector-surface-review/README.md)
include offline verification and immutable source checks.
