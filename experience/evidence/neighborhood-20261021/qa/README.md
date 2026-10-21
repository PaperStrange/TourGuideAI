# Neighborhood browser checkpoint

The frozen application package is `9f3d1550c6263ca35d6c672da67952afcc3d2fb69ea4cf21d1c661ef06ebb4b6`. These are automated Chromium 151.0.7922.34 software-rendering observations at 1440 × 1000 with normal motion. They do not establish physical-device fluency or human place recognition.

- [Controls report](controls/neighborhood-result.json): **10 passed, 0 failed**, completed 2026-10-21 09:01:40.709 UTC. SHA256 `07cf2c0df99bbb4423f4705268f35705e6982e90ed11aabb9a44288e43a074a4`. Actual Walk to, modal pause/resume, event-time Stop, locale switching and private-data preservation passed. The screenshot-layout check records sticky scrolling and preserves the camera through actual scroll-to-top normalization.
- [Arcade report](arcade-blocker/arcade-result.json): **6 passed, 2 failed**, completed 2026-10-21 09:11:37.696 UTC. SHA256 `4096de8b10722d34e3f52a6c5bf71b475b1a6630b5fba9583bbe34a5378fb408`. The remaining approach reached Market through actual walking; Market surface selection, interior Stop and user-controlled below-roof framing passed. No page exceptions occurred.

The arcade camera remains a release blocker. After actual walking and Stop at `(287.127, 140.015, 0)`, edge `osm:way:66703315:354840397:5554417552`, edge distance `37.546087771041506`, obstruction handling reduced actual camera distance to `0.2 m`. The projected head reached normalized device Y `1.019106717584311`, above the viewport. Exact desired/actual camera positions, target, matrices and grounded pose are retained in the report. The separate interior east-facing inspection assertion also failed because the sampled rays yielded no selected feature; Market surface selection succeeded. That interior result still requires diagnosis.

All 22 arcade screenshots are preserved. Ordinary interior views, east-facing views, and lower-eye day/night views are separately named. The lower-eye views were obtained through actual keyboard orbit, zoom and tilt controls. Opening resource observations remain limited to the declared allocated-texture inventory and cached-shadow primary-frame method recorded in the controls report; full-route resource acceptance is pending.

## Provenance and replay

[source-walk-result.json](arcade-blocker/source-walk-result.json), SHA256 `ab353164cf5c4fdd323880d9368e3f96f9ffc0abff3f80a0e655801ed7880ebb`, preserves the previous actual walk on package `34aff7623cc8676541773bd26e45b69b6b325f34859d195a4f7a19b97cbb3e99`. That walk reached the recorded approach position before its deadline. Original localStorage bytes were not retained. The bounded regression reconstructs a new session through the public planner/session helpers using that observed position, camera and selected order; every subsequent movement uses the production UI.

The exact [regression driver](arcade-blocker/arcade-regression.mjs) is retained with SHA256 `553b4a439bf36604abc28da8e8e3716328ca169a13cb8c990f2dc5a59521a00d`. Its recorded working path is restored by these commands from the repository root:

```sh
mkdir -p artifacts/neighborhood-20261021/qa/first-arcade artifacts/neighborhood-20261021/qa/replay artifacts/tmp
cp experience/evidence/neighborhood-20261021/qa/arcade-blocker/source-walk-result.json artifacts/neighborhood-20261021/qa/first-arcade/result.json
cp experience/evidence/neighborhood-20261021/qa/arcade-blocker/arcade-regression.mjs artifacts/neighborhood-20261021/qa/arcade-regression.mjs
TMPDIR="$PWD/artifacts/tmp" EXPERIENCE_QA_CHROMIUM=/workspace/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome EXPERIENCE_QA_OUTPUT="$PWD/artifacts/neighborhood-20261021/qa/replay" node artifacts/neighborhood-20261021/qa/arcade-regression.mjs artifacts/neighborhood-20261021/candidate-build
```

The command requires the matching immutable built directory, installed browser dependencies, normal TLS trust and the established narrow writable NSS directory permission where required. Regenerated application bytes receive a new report/package binding. Resume only after root grants the exclusive browser window. At this checkpoint all QA browsers and servers are closed; the neighborhood performance benchmark is explicitly pending.
