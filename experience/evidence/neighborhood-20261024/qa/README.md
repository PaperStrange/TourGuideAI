# Candidate 10 targeted browser evidence

All three runs completed on immutable package
`afc7934f1b0706ea59caae5e4b1a97a6a3f6366ac65b24cbe79bfc2c2d94e574`
(446 files), with scenery manifest
`e58257879fb4ead8af14022e71e329ee3309f9920eec6fe2cf4717276573d108`.
Chromium was the bundled `151.0.7922.34`, headless, at 1440×1000 and DPR 1,
with the existing default graphics and normal motion.

| Run | Result | Elapsed | Complete report SHA-256 |
| --- | --- | --- | --- |
| [Native controls and recovery](candidate-10-native/binding.json) | 41/41 | 147.910 s | `cff2e68c1fbba660f972305705d18bc3460b5ea4b4911394962a2af5c1a53d42` |
| [Platform matched views](candidate-10-platform-review/binding.json) | 10/10 | 28.492 s | `231f79fa2c422bd2bc71106885f8720045741935cc72a2caaf0f393a9926a75e` |
| [Western walking approach](candidate-10-western-approach/binding.json) | 17/17 | 111.927 s | `2e12e8b3bd19f2634c3ef886c6071afff5a5b6ecd793105b52c4317f23483bff` |

Each run contains repeated package preflight assertions. Each portable directory
retains its complete report, executed driver and helper through lossless gzip,
plus a binding of their encoded and decoded identities. Full-page screenshots
are local to those directories. The five actual canvases remain unchanged in
[the art evidence](../art/candidate-10/), with references and hashes in each
binding. Raw originals and real request logs are under
`artifacts/neighborhood-20261024/qa/`.

The executed driver SHA-256 is
`f28a0ea8591b83148d41345f703ab134b8289628b0f697d84fc89451cd1dfc0a`;
the historical source helper is
`5978159dc50a1c5f06d7185e31983b9c87c8547fd5f2a85d1cf3e51c122a83f1`.
The server used actual captured package bytes over loopback HTTP with no-store.
Explicit failure cases aborted real requests; the pending Retry held a real
NEAR request and then allowed its verified response. Successful requests used
the packaged assets. No TLS verification or rendering quality setting changed.

Native coverage includes compressed startup, day/night resource gates,
click/keyboard walking, walking guidance, modal pause, Stop, EN/ZH resume,
private-note and room isolation, initial failure and explicit Retry, loaded
BASE with failed NEAR detail, localized error retention, pending Retry feedback,
actual NEAR attachment and drawing, and cancellation in favor of a newly selected
pack. There were no page exceptions or unexpected network origins.

The platform review restores the recorded connector position and authored review
camera. The western review restores the earlier eastern position, reaches the
reviewed western node through actual walking controls, and deliberately frames
and selects the sourced torii. The report preserves ordinary arrival separately.
It binds matte nonemissive paper to source 1047 and records source 139 lamp
emission at day 0.03 and night 1.4. Actual visible lamp interpretation belongs to
the image review; material metadata and loaded scene membership are separate
observations.

Primary-frame resource checks retain their existing limits: 120 draw calls,
200,000 submitted triangles and complete declared texture estimates at or below
96 MiB. They use a settled frame with unchanged shadow-update counters; ordinary
render totals can contain shadow passes.

These targeted runs preserve their candidate 10 scope. Candidate 9's complete
229-check route and 107-check local camera reports retain their original package
bindings. Elapsed test duration is not a performance metric. The in-app Together
switch checks hidden-scene work; genuine document visibility, startup timing,
physical-device performance and route-wide visual acceptance have separate
evidence.

Reproduction uses the preserved executed driver and helper from the matching
source checkout, with the immutable candidate 10 package:

```sh
TMPDIR=/workspace/TourGuideAI/artifacts/tmp \
EXPERIENCE_QA_CHROMIUM=/workspace/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome \
EXPERIENCE_QA_ONLY=startup,initial-recovery,detail-recovery,latest-intent \
EXPERIENCE_QA_OUTPUT=/workspace/TourGuideAI/artifacts/neighborhood-20261024/qa/reproduction-native \
node experience/tests/browser-neighborhood.mjs \
  /workspace/TourGuideAI/artifacts/neighborhood-20261024/candidate-10
```

Use `platform-review` or `western-approach` as the selected section and a separate
output directory for each matched art run. Scheduling requires an exclusive
browser/CPU window. Preserve the managed proxy and CA configuration.
