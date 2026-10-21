# Neighborhood performance protocol

Run only after the exact neighborhood build passes startup and visual review, in
an exclusive browser/GPU window agreed with the lead and QA. The driver has not
yet established benchmark results.

```sh
node experience/tools/neighborhood-performance.mjs experience/dist
```

Paths resolve from the repository. `NEIGHBORHOOD_PERF_OUTPUT` selects an ignored
directory beneath `artifacts`; its default is `artifacts/neighborhood-performance`.
`EXPERIENCE_QA_CHROMIUM` selects Chromium, defaulting to `/usr/bin/chromium`.
The tool sets `TMPDIR` to the short `artifacts/tmp` directory. Keep the existing
proxy and CA configuration; TLS verification remains enabled. `--help` describes
the invocation without starting a browser.

The tool reads the actual build into an immutable HTTP server on an ephemeral
loopback port. It serves only those captured bytes, records their SHA-256 hashes,
and returns 404 for unavailable API requests. It uses no response interception,
model service or room backend. HTML revalidates with ETags; assets remain cacheable.
Responses have no content encoding. The resulting timings describe this local
delivery protocol, including its uncompressed transfer sizes.

## Entry observations

Use Chromium at 1440 × 1000, DPR 1, English, daylight and normal motion. CDP applies
10,000,000 bits/second in both directions and 80 ms request latency. This is the
declared network approximation; it does not reproduce every physical RTT effect.

Navigate directly to the neighborhood in a fresh browser context with an initially
cleared browser cache. Record one cold entry, then three full-page warm reloads in
that same context, retaining cache and the route session. Do not move between these
entries. Wait for outstanding neighborhood downloads/attachments before each
reload. Warm entry means a cached full-page load, not resuming a resident scene.

First usable is the earliest browser animation-frame observation of a matching
neighborhood with a submitted draw, ready lighting, enabled camera, unpaused
player, ground hit, valid route position, no blocking section/restore and completed
opening action. The report preserves the runtime's own loading/first-render values
separately. Actual keyboard response is checked after the entry measurements;
readiness alone is not labeled physical input validation.

Cold exit: **≤8,000 ms**. Each warm exit: **≤3,000 ms**. Preserve every observation
and missed target. ResourceTiming reports completed transferred/decoded bytes at
readiness; navigation bytes and outstanding requests are separate. CDP records
request timing, encoded bytes, cache behavior and failures for further inspection.

## Input and rendering observations

After the fourth entry, focus the actual scene and perform ten alternating
ArrowRight/ArrowLeft holds. Enter Look closer through its visible control, then
perform ten alternating L/J orbit holds. Each hold lasts at least 300 ms; a missing
response fails after ten seconds. Escape exits inspection. These actions exercise
the starting segment and do not substitute for the complete-route walkthrough.

For every action retain:

- Browser `performance.now()` immediately before Playwright dispatch.
- The trusted key event's `timeStamp` and receipt time in the browser.
- The first observed changed position/azimuth with an increased draw counter.
- Submitted-draw observation times, counter increments and observer execution cost.

Input response is event receipt → changed state plus draw. Dispatch → response is
also reported and includes automation scheduling. Neither measures physical screen
presentation. p95 uses the nearest-rank definition, with sample counts and raw
values retained. Input p95 exit: **≤100 ms**. Observed rendered-frame interval p95
exit: **≤33.3 ms**. Intentional gaps between actions are excluded. A skipped draw
counter increment prevents declaring the frame gate passed because individual
frame intervals could not be recovered from that observation. Report walking,
orbit and combined distributions. Observer cost remains visible.

## Hidden work and interpretation

Stop the benchmark animation-frame observer. Open a blank tab and bring it to the
front; require actual `document.hidden` on the neighborhood. After 1.5 seconds to
settle, measure two seconds of runtime draw/update counters, page CPU metrics and
new neighborhood HTTP requests. The hidden exit requires zero new draws, updates
and neighborhood requests. CPU values are observations; browser sampling calls
and other page work are not attributed exclusively to the scene.

The report includes exact package/driver hashes, OS/CPU/memory, browser and WebGL
renderer/vendor, viewport, input trace, failures and target results. SwiftShader or
other software-renderer observations cannot establish physical GPU or phone
performance. This tool leaves the separate **Q03 <500 ms** locale-action metric
unchanged. The original homepage performance driver remains its measurement tool.
