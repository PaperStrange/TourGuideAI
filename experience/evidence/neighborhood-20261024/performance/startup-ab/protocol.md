# Candidate 9 / 10 startup diagnostic

Run only in the root-assigned exclusive browser/CPU window:

```bash
cd /workspace/TourGuideAI
CANDIDATE10_SHA256=afc7934f1b0706ea59caae5e4b1a97a6a3f6366ac65b24cbe79bfc2c2d94e574 node artifacts/neighborhood-20261024/engineering/startup-ab.mjs
```

The runner needs the same permitted NSS access used by the actual provider/browser checks. It inherits proxy and CA configuration, keeps TLS verification enabled, and stores temporary browser files under repository `artifacts/tmp`. It starts and closes its own loopback HTTP service and Chromium processes. No other browser or heavy export should overlap.

Both exact frozen packages are checked before browser launch. Candidate 9 must be `1720fc5907c0c6f2b292aa0e728bcaad8ddbd6c776de7aec2b5a35a513609c9b`; candidate 10 must match the explicit environment value above. Each package gets a fresh default system Chromium 151.0.7922.173 process/context, one cold entry, and one full reload retaining its own HTTP cache. Browser arguments, 1440×1000/DPR1, normal motion, daytime opening and 10 Mbit/s / 80 ms CDP conditions are identical. No inputs or visibility experiments run here.

Read-only RAF sampling uses the existing production observer. First usable requires actual rendered ground, enabled camera, ready lighting, an unpaused visible scene and no restoration/blocking/busy state. Requested-detail time requires all desired levels ready and all download/attachment queues idle, with errors rejected. A separate submitted-detail time waits for the current light shadow-update flags to clear. The report keeps actual frame/shadow counters, counter gaps, sample cost, player/camera/route state, resident geometry, visible-frame draw cost, real network/cache records and server body hashes.

A passive MutationObserver counts writes to the displayed preview/status/lighting/solo fields. For child-list changes it compares removed and added text; for attribute changes it compares old values with the value at callback time. The `oldValueEqualsObservedFinal` count can include batched attribute A→B→A changes and does not establish a redundant assignment. Mutation callback duration is retained separately from RAF sample duration. No DOM value is replaced or forced.

The complete package file differences are retained. Candidate 10 includes the runtime/UI invalidation corrections and art changes, including the platform boundary faces; the report records actual resident geometry and `renderTotals`. Those last-sample renderer totals include all submitted passes and may include shadow rendering. One cold and one warm observation per package cannot establish a distribution, reliable speedup or isolation of either change. This probe preserves the standard performance driver, its thresholds, existing failures, Q03 and all functional/recovery tests.

Output is `artifacts/neighborhood-20261024/engineering/startup-ab/result.json`. Its driver hash, package manifests, error records and exact per-entry state identify the executed observation. Software rendering and this startup-only probe do not establish physical-device fluency or native hidden-tab behavior.
