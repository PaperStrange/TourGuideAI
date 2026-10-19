# Q03 · reviewed-pack candidate

The three matched warm Together language actions measure **1223.2, 1104.9 and
1170.7 ms**. Each remains above the unchanged **500 ms** threshold. Q03 remains
open P1; these observations establish no latency improvement.

[Actual observations](result.json) bind the 94-file candidate package
`5a8e0f67506cd164e7422e8aaf22c6a77685c4a7996168aac16703a6b0d0deb7`.
The unchanged retained capture driver is described in the
[preceding measurement protocol](../../solo-20261018/performance/README.md).
It serves immutable actual build bytes over local HTTP and makes real provider
requests through the inherited proxy with TLS verification. The browser is
Chromium `151.0.7922.173`, viewport 1440 × 1000, DPR 1. Each independent context
completes a cold Together locale action, map readiness and Tokyo search, followed
by a warm navigation and measured locale action. The interval begins immediately
before the Playwright click and ends when `document.documentElement.lang` is
observed as `zh`; automation scheduling remains included.

The invocation was
`PERF_PROFILE=0 PERF_OUTPUT=artifacts/pq03 node artifacts/q03-attribution.mjs`.
No profiling or concurrent browser task ran during these observations. The raw
record includes all cold/warm observations, provider results, errors, driver hash
and complete package file hashes. These cloud software-renderer observations
do not establish physical-device performance.
