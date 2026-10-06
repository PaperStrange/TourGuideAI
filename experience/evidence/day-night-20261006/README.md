# Daylight and night review · 2026-10-06

Application `a176cf38fbf1645fa8a5a0eb72a99d017ba705ab` passed **130/130 browser checks, 33/33 pure tests
and 17/17 repository gates**. Pages commit `afea7b97d8a3e349d1b454de27d59aeb1dd6725b` serves the exact tested
package; every one of its 38 files was retrieved over HTTPS and hash-verified.

- [Play in daylight](https://paperstrange.github.io/TourGuideAI/?lighting=day) or [at night](https://paperstrange.github.io/TourGuideAI/?lighting=night)
- [Compare the three matched viewpoints in both modes](https://paperstrange.github.io/TourGuideAI/comparison.html)
- [Browser checks, conditions, screenshots and package hashes](browser/browser-result.json)
- [Independent six-image/rig/HDR preflight](browser/asset-preflight.json)
- [Pure tests](unit-tests.tap), [build output](build.txt) and [repository gates](repo-gates.json)
- [Frozen source inventory](source-manifest.json) and [hosted verification](hosted-verification.json)
- [Night opening EN](browser/opening-night-en.png) and [ZH](browser/opening-night-zh.png)
- [Walked bank approach](browser/south-bank-approach.png)
- [Art review and limits](../../docs/art-direction.md), [full QA record](../../docs/validation.md) and [resource research](../../docs/lighting-resources.md)

Package manifest SHA-256: `06bd6490029b8067c43a19dde5c957c467441fc829d5b00b91d2d21056938bef`.
Browser report SHA-256: `cb2ef0c473ca29d93f22bb01702f6beba1f3f6ccd95e69bc5ceba70e18c5343d`.
Source inventory SHA-256: `f2e206c2a1531bc2f8c6e49b4d17bd09da0c67d51b3dd2cb27067b7bc65c4184`.
Render-study manifest SHA-256: `e2274732cff1a12fde5df1074cdf2dee2d00673c56e9bd1311b8935697c401e1`.
Shared rig SHA-256: `29cc4209b243e3c069f3516cd0c236c68c0bcb0cb2526aa285f2fdd15caf1766`.

The single full browser run exercised the night route and retained the existing
movement, collision, choice, note and multi-format sharing checks. Focused mode
checks cover actual rendered change at a fixed camera, isolated preferences,
warm-cache resource counts, delayed and stale loads, failure/retry, and context
recovery. Comparison checks bind all six still images to their matching cameras,
rig and local HDRs. Synthetic notes and localhost URLs in the artifacts are QA
fixtures, not a real visitor's trip or a public personal recap.

The two CC0 Poly Haven HDR maps are local illumination/reflection inputs, not
Kyoto panorama backgrounds. Existing geometry remains unchanged. Mode selection
does not imply real-world time, weather, occupancy or opening hours. Cycles stills
use 96 samples and OIDN beauty-only scene-linear denoising. The daylight world
suppresses a competing captured sun on non-glossy rays while retaining glossy
HDR response; this is an explicit renderer approximation, not identical physical
transport in the two engines. Per-image producer hashes preserve the unchanged
night renders' provenance when the day-only script correction was applied.

Night readability in inspected screenshots and successful automation do not
establish user realism acceptance or target-device fluency. Dark offline glazing,
very dim Daiya daytime frontage, simplified vegetation, geometric shadow wedges
and small physical lettering remain visible limits. Software-GPU timing is not
hardware acceptance. Native sharing used API stubs; actual OS sheets and recipient
delivery remain outside these checks. Prior delivery evidence remains unchanged.

The [independent GitHub CI run](https://github.com/PaperStrange/TourGuideAI/actions/runs/37420468044)
is recorded separately from the local complete browser evidence above. See the
current validation record for its last verified state.
