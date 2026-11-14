# Lossless transport for the approved capture

The tool verifies all 50 files against the reviewed public package. Public
packages preserve the original SOG, all 40 RAD/RADC files and asset metadata.
The separate measurement mode compresses the 39 RADC chunks with Node's native
gzip encoder at level 9. Every decoded file must match its reviewed size, SHA-256
and original bytes. Existing capture coefficients, camera and renderer settings
remain the reference.

Restore the approved Pages package to
`artifacts/realism-01/review-transport/baseline/`, including its package manifest.
The reference is Pages commit `1a938ebd48e2606b52e54cc1d57cc8a4e2f28a96`:

```bash
git fetch origin 1a938ebd48e2606b52e54cc1d57cc8a4e2f28a96
mkdir -p artifacts/realism-01/review-transport/baseline
git archive 1a938ebd48e2606b52e54cc1d57cc8a4e2f28a96 previews/realism-01 | tar -xf - --strip-components=2 -C artifacts/realism-01/review-transport/baseline
```

Run the measurement independently of an application build:

```bash
node experience/tools/review-transport/package.mjs --measure-only --output artifacts/realism-01/review-transport/compression-01
```

The output contains compressed source chunks and `compression-report.json`, with
all 40 source/decoded identities, per-file sizes, codec timings, total savings and
the count of ordinary chunks above 2 MiB. Compression results do not establish
browser startup or physical-device performance.

The measured 14 November trial preserved all 40 decoded identities:

| Measurement | Raw | Gzip level 9 |
| --- | ---: | ---: |
| Complete streamed source, including unchanged header | 84,115,304 bytes | 84,106,128 bytes |
| Ordinary chunks above 2 MiB | 37 of 39 | 37 of 39 |
| Initial numbered chunk | 2,283,352 bytes | 2,283,494 bytes |

The total reduction is 9,176 bytes (0.0109%). The section-size gate remains open.
This measurement does not support adopting gzip as a loading improvement.

Build the application and package the original source transport:

```bash
npm --prefix experience run build:review
node experience/tools/review-transport/package.mjs --output artifacts/realism-01/review-transport/package-identity --implementation COMMIT_SHA
```

Use the current 40-character source base commit for `COMMIT_SHA`. Every output
directory must be empty and inside ignored `artifacts/`. Optional `--baseline`
and `--build` paths must also remain inside that directory. The original package
manifest is checked against the tracked release receipt before output generation.

Public packages retain the reviewed `review-assets.json` bytes and native RAD
filenames. Gzip outputs remain in the measurement directory. That directory also
stores the exact executed tool beside its report; codec evidence can be traced to
the producer even after subsequent implementation changes.

`package-manifest.json` includes every generated file, the original baseline
manifest identity, current producer hashes, source byte totals and source credit.
The package carries the source, Spark and Three license texts. Public delivery
requires independent actual-HTTPS byte checks and browser evidence for encoded
transfers, cancellation, decoding, settled appearance and control behavior.

## Browser verification

The ordinary suite tests actual controls, transport failures and the complete
guided endpoint. A slow software renderer needs a longer functional deadline;
this does not alter the path, movement speed, source or 240-second settling limit.

```bash
REVIEW_QA_TOUR_TIMEOUT=900000 REVIEW_QA_ENDPOINT_VIEWPORT=800x600 node experience/tests/browser-review-transport.mjs artifacts/realism-01/review-transport/package-identity artifacts/realism-01/review-transport/qa/local-functional
REVIEW_QA_ONLY=transport REVIEW_QA_REPEATABILITY=1 node experience/tests/browser-review-transport.mjs artifacts/realism-01/review-transport/package-identity artifacts/realism-01/review-transport/qa/local-comparison artifacts/realism-01/review-transport/baseline
```

Native tab visibility runs separately on an authenticated X display. The driver
starts standalone Chromium and attaches with `noDefaults: true`, leaving native
focus and visibility behavior intact. Set `DISPLAY` and `XAUTHORITY` for the real
display before running:

```bash
REVIEW_QA_NATIVE_CONTEXT=1 REVIEW_QA_ONLY=tour node experience/tests/browser-review-transport.mjs artifacts/realism-01/review-transport/package-identity artifacts/realism-01/review-transport/qa/local-native
```

Use the canonical HTTPS URL as the first argument for hosted checks. The public
ordinary run uses `REVIEW_QA_ONLY=shell,module-recovery,desktop,cancellation,paged-cancellation,recovery,phone,transport`;
native tour controls run separately. The full endpoint is covered locally and
by independent exact public-file verification. Its complete sweep is not repeated
over HTTPS. Retain actual public behavior and the byte verification independently.

The [release evidence](../../evidence/realism-01/review-transport/README.md)
preserves every ended attempt and the exact display/trust setup. After collecting
all reports, retain and verify them:

```bash
node experience/tools/verify-published.mjs artifacts/realism-01/review-transport/package-identity https://paperstrange.github.io/TourGuideAI/previews/realism-01/ artifacts/realism-01/review-transport/published-bytes.json
node experience/tools/review-transport/retain.mjs --package artifacts/realism-01/review-transport/package-identity --published artifacts/realism-01/review-transport/published-bytes.json
PYTHONPATH=artifacts/realism-01/tooling node experience/tools/review-transport/verify.mjs
```

The verifier also runs against a clean checkout without raw source downloads or
browser profiles. It verifies recorded source identities, actual transfer events,
PNG pixels and declared coverage; it does not rerun the browser or infer physical
performance. Strict pixel-equality diagnostics remain distinct from D25's explicit
one-intensity-step appearance tolerance and from route acceptance.
