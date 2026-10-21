# Q03 map latency investigation — 2026-10-21

**Q03 remains open. Every unprofiled warm observation below exceeds the unchanged
500 ms limit.** Antialiasing is restored to `true` after actual paired images showed
degraded building edges. Final acceptance on the retained AA-on configuration
measures **1187.8 / 1061.8 / 1156.5 ms**, so the final candidate also misses the gate.
This acceptance repetition changes no options or measurement semantics.

## Preserved observations

| Capture | Configuration | Three unprofiled warm actions, ms | Disposition |
| --- | --- | --- | --- |
| [q21b](q21b/result.json) · [analysis](q21b/analysis.json) | Published baseline; post-load color preparation; AA on | 1206.2 / 1115.1 / 1131.6 | All fail. Baseline retained. |
| [q21s](q21s/result.json) · [analysis](q21s/analysis.json) | Final colors/journey layers prepared before style creation; AA on | 1077.1 / 1031.2 / 1160.9 | All fail; ranges overlap baseline. No reliable latency-gain claim. |
| [q21d](q21d/result.json) · [analysis](q21d/analysis.json) | Pre-load preparation; AA on; `desynchronized:true` | 1305.9 / 1358.5 / 1230.2 | All fail. Actual context honored the hint; hint removed. |
| [q21a](q21a/result.json) · [analysis](q21a/analysis.json) | Pre-load preparation; AA off; desynchronized off | 905.2 / 810.8 / 901.4 | All fail. Lower measured values, but visual-quality rejection. |
| [q21f](q21f/result.json) · [analysis](q21f/analysis.json) | Integrated candidate before map retry repair; pre-load preparation; AA on; desynchronized off | 1064.6 / 1049.2 / 917.4 | All fail. Preserved acceptance measurement. |
| [q21r](q21r/result.json) · [analysis](q21r/analysis.json) | Final candidate including map retry repair; pre-load preparation; AA on; desynchronized off | 1187.8 / 1061.8 / 1156.5 | All fail. Final acceptance measurement; Q03 remains open. |

Each result preserves individual cold/warm observations, timestamps, resource
requests, input events, errors and the complete immutable build-file manifest.
The baseline also contains a separate profiled warm action of 1188.8 ms; it is
excluded from the three-observation comparison. All six captures used driver
SHA256 `b54abb7eaf169ec6496602605f39cb2528aef193e28bddacd7c669d21f8ab5b3`.

| Capture | Immutable package manifest SHA256 | UTC measurement interval |
| --- | --- | --- |
| q21b | `5a8e0f67506cd164e7422e8aaf22c6a77685c4a7996168aac16703a6b0d0deb7` | 04:49:44–04:50:04 |
| q21s | `735d3f52e70ffd7fbfe05752b29feff76b728d26e861eddd52be53bf0ec55ef9` | 04:54:09–04:54:23 |
| q21d | `bc8adb4869580c674f086a121b6c51e9ea16ff7561133d61dad637e4cded960e` | 04:56:54–04:57:09 |
| q21a | `6c18ba30d254a1a8738d7e0a0f90894e89d7f2efc1c262a2213763bb32a928fc` | 05:13:41–05:13:53 |
| q21f | `63f813639c87a260855d68b52222fc0dda4134668808132f85f7b7a4a7cb706f` | 05:42:10–05:42:25 |
| q21r | `3e72aa1c53596042a14d1fb2aae9556b0a2caa876be93d424ec9ebe2aebb0162` | 05:57:02–05:57:18 |

## Unchanged protocol and attribution limits

Chromium **151.0.7922.173**, 1440×1000 viewport, DPR 1, normal motion and the same
managed cloud software renderer were used. Frozen build bytes were served over
local HTTP. External map and Tokyo-search providers remained real; no network
interception or TLS bypass was used. Other agents paused browsers and heavy CPU
work during each timed interval. These are matched-host observations, not evidence
of physical desktop or phone performance, and are distinct from earlier hosted
HTTPS measurements.

Each independent context performs a cold Together language action, waits for map
readiness, completes the actual Tokyo search, then navigates to the same URL warm.
The primary metric remains `performance.now()` immediately before Playwright's
locale-button click through observation of `document.lang === 'zh'`. All three
warm actions must individually be below 500 ms. Automation scheduling remains
inside the metric; handler time does not replace it.

The baseline profile shows substantial renderer-main commit wall time relative to
thread CPU time. Locale click handlers are short, but this does not identify every
native wait or prove a particular GPU operation caused it. Analysis categories
overlap and must not be summed. The analysis field `presentationMs` retains its
original name but contains **EventTiming event duration**, not an isolated
presentation-time measurement. Frame counts were sampled after the action and
must not be described as frames rendered strictly within the action interval.

## Actual visual comparison and decision

[Quality result](quality/result.json) binds all eight PNGs, camera poses, context
attributes, CSS/module hashes and provider outcomes. Pairs are:

| View | AA on | AA off |
| --- | --- | --- |
| Desktop world, 1280×800 | [baseline](quality/desktop-world-baseline-aa-true.png) | [candidate](quality/desktop-world-candidate-aa-false.png) |
| Desktop local, 1280×800 | [baseline](quality/desktop-local-baseline-aa-true.png) | [candidate](quality/desktop-local-candidate-aa-false.png) |
| Phone world, 390×844 | [baseline](quality/phone-world-baseline-aa-true.png) | [candidate](quality/phone-world-candidate-aa-false.png) |
| Phone local, 390×844 | [baseline](quality/phone-local-baseline-aa-true.png) | [candidate](quality/phone-local-candidate-aa-false.png) |

These use actual built map adapters and production CSS in a fixed-size capture
harness, with real provider requests, canonical Shijō/Ginza places, DPR 1 and
reduced motion for settled images. They are visual adapter evidence, not a new
homepage workflow or latency test. Paired poses match exactly. Local views report
77 rendered buildings on desktop and 53 on phone in both versions. All captures
report ready status and no page, map or request failures.

Engineering and independent art review both found visibly stepped/noisy rooflines
and diagonal building edges with AA off, including the phone view. Labels and pins
remained similarly readable; existing overlapping local pins were unchanged.
The building-quality priority therefore rejects AA off. No automated image metric
is used to declare visual acceptance.

All 94 runtime files in the visual baseline exactly match q21b. Its visual manifest
hash differs because the Pages checkout also includes `.nojekyll` and
`review-build.json`. The visual candidate matches q21a's package exactly.

The retained source keeps AA on, removes the desynchronized hint, and prepares the
validated final style before MapLibre creates its layers. The latter is retained
for coherent initialization, with three focused preservation/validation tests
passing; it is not credited with a demonstrated latency improvement. The final
AA-on integrated build is bound by q21r. All three actual contexts report AA on and
desynchronized off, with no page errors or failed requests. Click handlers take
5.7 / 9.0 / 6.0 ms; these diagnostics do not replace the failed primary metric.
The retry repair is separately verified by [actual request-denial checks](../final/map-retry/README.md).

## Reproducibility

Byte-identical driver sources are preserved as data:

- [Capture driver](capture-driver.txt): `b54abb7eaf169ec6496602605f39cb2528aef193e28bddacd7c669d21f8ab5b3`.
- [Analysis driver](analysis-driver.txt): `0d3ca41585005d663afac6755e34e2c891e2f03c0cc56b8743b8777516f2fa08`.
- [Quality driver](quality-driver.txt): `ab3dbcf2c123e4c9030212b601eac145b05337e9408a66ff865cf07e702bba66`.

The capture driver originally lived at `artifacts/q03-attribution.mjs`, resolves
the repository relative to that location, imports its installed Playwright, and
reads `experience/dist`. Baseline command: `PERF_OUTPUT=artifacts/q21b node
artifacts/q03-attribution.mjs`. Later commands additionally set `PERF_PROFILE=0`
and their respective output directory. It creates a short TMPDIR under that
directory, launches `/usr/bin/chromium` and retains inherited proxy/CA settings.
The original run required narrow write access to `/home/agent/.pki`.

The quality driver originally lived at `artifacts/q21-map-quality.mjs`; it also
requires the baseline checkout `/workspace/TourGuideAI-pages`. These historical
paths are recorded conditions, not dependencies needed to read this evidence.
Re-running requires restoring the corresponding immutable builds; current dist
alone cannot reproduce all six captured packages.

The [raw baseline trace](q21b/trace.json.gz) is losslessly gzip-compressed;
decompressed SHA256 is `31dd35e26cde25658b44829e0a15918935dbbb6b8f942351157b0ab76661675f`.
The [CPU profile](q21b/cpu-profile.json) SHA256 is
`d6e87bdda80441c1e079d0fff361d3000ddab1f68d8da1f23bf90f572c59eb0d`.
