# Architectural loading measurements

Use Node 24, Chromium with Playwright 1.62.1, and these pinned Python dependencies
inside the ignored tooling directory. Keep package caches and temporary files in
the sprint's ignored artifact directory:

```bash
mkdir -p artifacts/realism-01/review-loading/python-tmp artifacts/realism-01/review-loading/python-cache
TMPDIR="$PWD/artifacts/realism-01/review-loading/python-tmp" PIP_CACHE_DIR="$PWD/artifacts/realism-01/review-loading/python-cache" python -m pip install --target artifacts/realism-01/tooling numpy==2.5.4 Pillow==12.3.0 lxml==6.1.1
```

The browser driver compares the approved guided release and the current package
with the same 1000 × 800 viewport, DPR 1, cold browser cache, 10 Mbps throughput
and 80 ms latency. It records first visibility, real camera-button input,
submitted views, progressive detail, reset and settled captures. The source files,
camera, capture lighting and renderer fidelity settings remain the reference.

Use the current source commit and a new empty output directory when packaging:

```bash
npm --prefix experience run build:review
node experience/tools/review-transport/package.mjs --output artifacts/realism-01/review-loading/package --implementation COMMIT_SHA
node experience/tests/browser-review-loading.mjs artifacts/realism-01/review-transport/package-identity2 artifacts/realism-01/review-loading/qa/baseline
node experience/tests/browser-review-loading.mjs artifacts/realism-01/review-loading/package artifacts/realism-01/review-loading/qa/candidate BASELINE_RESULT_JSON
```

Use the exact completed baseline report for `BASELINE_RESULT_JSON`. Its condition,
camera and PNG identities are retained. Run browsers sequentially on the shared
renderer. Published checks use the canonical HTTPS entry and ordinary TLS
verification. Record the public baseline before publication, then pass that exact
report to the candidate run after publication. Independent public-file verification
binds the observed candidate to its package:

```bash
node experience/tests/browser-review-loading.mjs https://paperstrange.github.io/TourGuideAI/previews/realism-01/ artifacts/realism-01/review-loading/qa/public-baseline
node experience/tests/browser-review-loading.mjs https://paperstrange.github.io/TourGuideAI/previews/realism-01/ artifacts/realism-01/review-loading/qa/public PUBLIC_BASELINE_RESULT_JSON
node experience/tools/verify-published.mjs artifacts/realism-01/review-loading/package https://paperstrange.github.io/TourGuideAI/previews/realism-01/ artifacts/realism-01/review-loading/published-bytes.json
```

Retain evidence after every browser attempt has ended. `--regression-qa` can add
the existing control/recovery suite's dedicated output directory. Repeat
`--receipt` for reviewed setup or publication receipts; source caches and browser
profiles remain in ignored artifacts. An interrupted report retains its original
bytes and requires a separate receipt naming `attemptReport`, `reportSha256`,
`driverSha256`, the observed termination and its limitations.
Repeat `--trial-package` to preserve earlier candidate package identities. The
retainer verifies their actual files and saves their manifests and source metadata.

```bash
node experience/tools/review-loading/retain.mjs --package artifacts/realism-01/review-loading/package --baseline artifacts/realism-01/review-transport/package-identity2 --published artifacts/realism-01/review-loading/published-bytes.json
PYTHONPATH=artifacts/realism-01/tooling node experience/tools/review-loading/verify.mjs
```

The verifier works against an optional clean-checkout root argument. Pillow
independently decodes the retained PNGs. The HTML entry comparison uses lxml
6.1.1, retaining the exact added icon and requiring the remaining parsed document
to be identical. Every other packaged file and runtime producer must retain its
size and SHA-256 for that entry-only classification. D25 requires matched submitted cameras
and splat counts, maximum RGB difference ≤1/255, p95 difference zero and identical
alpha. Exact equality remains a separate diagnostic. Every failure and ended
attempt remains in the retained reports.

First-view transfer and post-interaction settled transfer have separate
boundaries. Response accounting includes unfinished requests and the initial
encoded response prefix. The asynchronous renderer retains a separate settled
view qualified by three consecutive submitted frames: camera, content and count
must agree before drawing and at the following idle observation. Its readiness
time is the later observation; the baseline's submitted-frame timing retains its
original meaning. Main-thread and frame observations describe the actual
software-renderer run; they leave physical-device fluency and full-route
acceptance unverified.

Input timing starts in the trusted click handler and ends at the qualifying
submitted frame observed by the browser driver. This is an observed response
delay; it does not establish the earliest response frame or time spent waiting
before the input handler runs. Completed HTTP responses are independently
reconciled against their encoded-prefix and data events. Any discrepancy is
retained; complete responses use the authoritative `loadingFinished` total.

The retained public baseline includes a site-root `/favicon.ico` 404. Its source,
capture and control evidence remains eligible for the matched comparison; the
HTTP check remains failed in the report and verifier output. Current public
release coverage requires all functional checks to pass.
