# Published solo smoke · 18 October 2026

The completed run in [solo-hosted-result.json](solo-hosted-result.json) passed **19 checks** from `2026-10-18T13:54:51.344Z` to `2026-10-18T13:56:29.134Z` against `https://paperstrange.github.io/TourGuideAI/`.

- Published release: Pages commit `9e8ecadd1fa3efe44d69396e55b6375ca4097fd4`, deployment run `39133371423`, runtime source `a1dbd36`.
- Supplied package: 90 files; manifest SHA-256 `0a6244091b50c9ee7220d698e1109c86bd397dba54384c8db20e68bc57c728e7`.
- Actual driver SHA-256: `b97103fce92ddc35f67c27305ba47c43b18007c37d40ab3ee965c2f67e3adbe8`. The run used `tests/browser-solo-hosted.mjs` with its camera-motion wait guard; this driver change does not change the published runtime.
- Chromium used the inherited proxy with TLS verification, isolated contexts and reduced motion. There was no response interception, local backend, storage seeding or paid endpoint. Private records were created through the actual UI.

## Checked behavior

Desktop English/Chinese checks cover Look closer controls, stable player position, day/night resources, saving an optional private note, and exact saved view/light restoration after reload. Phone checks use actual taps in a 390 × 844 touch context, confirm touch guidance and horizontal fit, and save a chosen night view. The phone screenshot captures the viewport.

The map scenario searched for Eiffel Tower through Photon, selected OSM way `5013364` at `48.8582599, 2.2945006`, and checked the integrated map palette. An unobstructed canvas drag changed the view while preserving the named selection and making no nearby request. “Explore this area” queried Wikipedia at the panned center, `48.85842341645528, 2.293591238202225`. The selected place order, source URLs, Maps URLs and exact camera survived saving and reopening. The reviewed Palazzo coordinate conflict was excluded.

Raw actual provider responses are retained with their request URLs, HTTP status, byte count and SHA-256 in the result:

- [Photon search](map-provider-103.json)
- [Wikipedia around the selected Eiffel point](map-provider-106.json)
- [Wikipedia around the panned area](map-provider-108.json)

The run hashed **132 completed same-origin responses covering 29 distinct build files**, all matching the supplied package. Two font response bodies were unavailable to Playwright after navigation; their HTTP 200 records and body-read diagnostics remain in the report. This smoke run's downloaded-resource comparison covers the resources it observed. The release's separate [full-package download verification](../published-files.json) passed for all 90 files.

All three scenarios recorded zero unhandled page exceptions and zero failed requests. Five actual `/api/health` requests returned the expected static-host HTTP 404, with corresponding browser console diagnostics. Shared service operation was outside this run's scope.

Screenshots: [Chinese street/night](hosted-street-zh-night.png), [Chinese phone](hosted-phone-zh.png), [reopened Paris map](hosted-paris-reopened.png). Screenshots are evidence captures; these automated checks do not measure emotional engagement or physical-device fluency.

## Preserved diagnostics

[launch-failure.json](launch-failure.json) records a Chromium launch failure before navigation: the nested temporary directory exceeded the Unix socket path limit. The completed run used the shorter repository-local `artifacts/tmp` directory.

[wait-diagnostic/solo-hosted-result.json](wait-diagnostic/solo-hosted-result.json) and its accompanying captures/provider responses retain the initial browser attempt. Its injected Playwright wait predicate dereferenced `currentView.center` while map movement intentionally exposed a null current view. The exception stack identifies that predicate. The completed run waits until the current view exists and records zero page exceptions. Application runtime files were unchanged throughout these attempts.

## Reproduction

From `experience/`, with the published package in `dist/` and an existing writable NSS certificate store:

```sh
TMPDIR=/workspace/TourGuideAI/artifacts/tmp \
EXPERIENCE_QA_OUTPUT=/workspace/TourGuideAI/experience/evidence/solo-20261018/hosted/solo \
EXPERIENCE_QA_CHROMIUM=/usr/bin/chromium \
node tests/browser-solo-hosted.mjs dist
```

The run granted filesystem write access to `/home/agent/.pki`; it retained the configured certificate store and proxy. Future reproductions should use a fresh output directory to preserve this release's raw evidence. No browser or backend process remained active after completion.
