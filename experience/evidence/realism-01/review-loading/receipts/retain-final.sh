set -eu
cd /workspace/TourGuideAI
node experience/tools/review-loading/retain.mjs \
  --package artifacts/realism-01/review-loading/package-03 \
  --baseline artifacts/realism-01/review-transport/package-identity2 \
  --published artifacts/realism-01/review-loading/published-bytes.json \
  --trial-package artifacts/realism-01/review-loading/package-01 \
  --trial-package artifacts/realism-01/review-loading/package-02 \
  --regression-qa artifacts/realism-01/review-transport/qa/loading-regression \
  --receipt artifacts/realism-01/review-loading/qa/baseline/2026-11-14T08-58-17-905Z/setup-exit-receipt.json \
  --receipt artifacts/realism-01/review-loading/public-namespace-setup.json \
  --receipt artifacts/realism-01/review-loading/run-isolated-public.sh \
  --receipt artifacts/realism-01/review-transport/qa/display-1794648509091.json \
  --receipt artifacts/realism-01/review-loading/prepare-publication.mjs \
  --receipt artifacts/realism-01/review-loading/publication-03/audit.json \
  --receipt artifacts/realism-01/review-loading/publication-03/pages-build.json \
  --receipt artifacts/realism-01/review-loading/publication-03/canonical-index.html \
  --receipt artifacts/realism-01/review-loading/verify-source-commit.mjs \
  --receipt artifacts/realism-01/review-loading/source-commit.json \
  --receipt artifacts/realism-01/review-loading/retain-final.sh
PYTHONPATH=artifacts/realism-01/tooling node experience/tools/review-loading/verify.mjs > artifacts/realism-01/review-loading/verification.json
