# Geographic-context shadow review · 21 October 2026

The actual browser captures preserve **eight matched before/after pairs**, with
sixteen PNGs: Delft and Helsinki, desktop and phone, daylight and night. Art review
accepts the bounded shadow correction for this internal geographic-context viewer.

The correction fits the directional shadow camera to the model's light-space
bounds and derives normal/depth bias from shadow texel size. The shadow map remains
1024 × 1024. Model bytes, camera behavior, material palette and illumination
intensities remain unchanged.

## Captures and review

| Site / viewport / light | Before | After |
| --- | --- | --- |
| Delft · desktop · daylight | [Before](before/delft-markt-desktop-day.png) | [After](after/delft-markt-desktop-day.png) |
| Delft · desktop · night | [Before](before/delft-markt-desktop-night.png) | [After](after/delft-markt-desktop-night.png) |
| Delft · phone · daylight | [Before](before/delft-markt-phone-day.png) | [After](after/delft-markt-phone-day.png) |
| Delft · phone · night | [Before](before/delft-markt-phone-night.png) | [After](after/delft-markt-phone-night.png) |
| Helsinki · desktop · daylight | [Before](before/helsinki-senate-desktop-day.png) | [After](after/helsinki-senate-desktop-day.png) |
| Helsinki · desktop · night | [Before](before/helsinki-senate-desktop-night.png) | [After](after/helsinki-senate-desktop-night.png) |
| Helsinki · phone · daylight | [Before](before/helsinki-senate-phone-day.png) | [After](after/helsinki-senate-phone-day.png) |
| Helsinki · phone · night | [Before](before/helsinki-senate-phone-night.png) | [After](after/helsinki-senate-phone-night.png) |

Independent art review finds the obvious repeated roof/wall bands and strong
ground striping removed at both captured viewport scales. Window rows, courtyard
shapes and ground layers are easier to read. No detached building-base gap was
observed in these views. Night retains its deliberately schematic presentation;
controls and composition remain readable and unchanged.

**Remaining P2:** faint broad ground modulation remains near the foreground in
Helsinki daylight. Further calibration is deferred for this geographic-context
viewer. Architecture, roof/building-part interpretation, grade, real access,
recognition and human enjoyment remain outside this acceptance.

## Exact bindings

The [before report](before/capture.json) and [after report](after/capture.json)
record every pose, viewport, model identity, render count and captured filename.
Exact comparisons establish **8/8 identical camera objects and viewport objects**,
including projection/world matrices, buffer dimensions and pixel ratio. Both runs
record zero page exceptions. These are capture checks; the full interaction and
recovery suite has its own report in the parent workbench evidence.

| Item | SHA-256 / value |
| --- | --- |
| Viewer before (`viewer/main.js`) | `c6ba1ef32c935c046941e00512f7f445a534e1e324b259f8d2e63140c35dd71e` |
| Viewer after (`viewer/main.js`) | `75e0ed4e4751a773e5caa5dd44738efd0452b3581c63d9ee523edb107f18fab9` |
| Delft GLB, both runs | `b9a63090d9ab6a2335c214b8361519abf9c97ef0dfd33ca1e0fe6b78a08b23e9` · 844,128 bytes |
| Helsinki GLB, both runs | `e0a7da09e662c8b32ca577e6da5868bbfeadc904e776aefec28cb5f1bf4534d9` · 928,416 bytes |
| Archived capture driver | `999cc37ef835041c5ec6c5bacaf94116cc0e3fa497785e0c4d5ef97e77b45d64` |
| Before report | `bf9a4344f634c3f512408d0a19270245b8488642795d8d49a48228506b78ce18` |
| After report | `9b9a00f75aebcd2f96e9f5538c949409758a5f4093adbf7075e23d3cfd4245d2` |

Browser: Playwright Chromium **151.0.7922.34**, headless, reduced motion, DPR 1.
Desktop viewport: **1440 × 1000** with full-page screenshots. Phone viewport:
**390 × 844**, touch enabled, viewport screenshots. The driver uses actual local
site exports and real input controls without replacing successful responses.
Before capture: **05:44:12.802–05:44:35.687 UTC**; after capture:
**05:45:08.181–05:45:30.243 UTC**. Physical-device performance is unmeasured here.

The [driver archive](capture-driver.mjs) preserves the exact executed bytes. Its
original execution location was `artifacts/workbench-shadow-capture.mjs`; relative
imports and output paths assume that location. The original commands, from the
repository root with the corresponding viewer source and actual site exports, were:

```bash
TMPDIR=/workspace/TourGuideAI/artifacts/tmp PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright node artifacts/workbench-shadow-capture.mjs before
TMPDIR=/workspace/TourGuideAI/artifacts/tmp PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright node artifacts/workbench-shadow-capture.mjs after
```

All PNGs, reports and the driver retain byte identity with the original captures.
From this directory, `sha256sum -c checksums.sha256` verifies the archived files.
