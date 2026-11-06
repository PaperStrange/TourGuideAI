# Interactive architectural review

This entry packages the licensed Knock Community Hall capture with EN/ZH controls
and a camera-preserving original/streamed comparison. Application files live in
`experience/src/review/`; generated packages and browser state stay in ignored
`artifacts/realism-01/review-page/`.

Install the pinned dependencies with `npm ci` inside `experience/`. The
[original acquisition tool](../splat-fidelity/acquire-hall.py) recovers the exact
free source with `--mode model-preview`. The
[SH2 conversion instructions](../splat-encoding/README.md) recreate the derived
streamed data. Packaging verifies every source against the retained original and
conversion receipts before copying it. A single selected representation loads;
original SOG decoding finishes before a replacement representation mounts.

```bash
npm --prefix experience run build:review
node experience/tools/review-page/package.mjs artifacts/realism-01/review-page/package COMMIT_SHA
node experience/tests/browser-realism-review.mjs artifacts/realism-01/review-page/package
```

Use the current 40-character source commit for `COMMIT_SHA` and an empty output
directory. The package is independently hostable in a subdirectory; its entry is
`index.html`. Serve the complete package, including its attribution and licenses.
The default original cache is `artifacts/realism-01/splat-fidelity/research/`;
the conversion receipt specifies all 40 required RAD/RADC paths and hashes.

Publish the validated package to `previews/realism-01/` on the existing Pages
branch. Verify actual HTTPS responses and repeat the browser walkthrough:

```bash
node experience/tools/verify-published.mjs artifacts/realism-01/review-page/package https://paperstrange.github.io/TourGuideAI/previews/realism-01/ artifacts/realism-01/review-page/published-bytes.json
REVIEW_QA_ONLY=desktop,cancellation,paged-cancellation,phone node experience/tests/browser-realism-review.mjs https://paperstrange.github.io/TourGuideAI/previews/realism-01/ artifacts/realism-01/review-page/qa/hosted
node experience/tools/review-page/retain.mjs artifacts/realism-01/review-page/package artifacts/realism-01/review-page/published-bytes.json
node experience/tools/review-page/verify.mjs
```

QA preserves each attempt, native inputs, submitted camera frames, screenshots,
source requests and environment limitations. The local recovery case returns one
actual HTTP 503 for an asset before serving the real packaged bytes on retry.
Public testing uses the deployed entry. Its byte verification covers the entire
package independently of canceled or unfinished browser responses.

The retained verifier runs without raw downloads, a browser, Rust or network
access. Its successful result concerns the review page. Kyoto coverage, walking,
relighting, physical-device performance and human acceptance remain separate gates.
