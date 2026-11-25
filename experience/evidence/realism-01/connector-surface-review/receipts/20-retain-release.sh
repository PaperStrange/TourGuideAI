set -eu
surface_review=artifacts/realism-01/connector-surface-review
node experience/tools/connector-surface-review/retain.mjs \
  --package "$surface_review/package-06" \
  --qa "$surface_review/qa-06/result.json" \
  --qa "$surface_review/public-qa-01/result.json" \
  --receipt "$surface_review/source-commit.json" \
  --receipt "$surface_review/publication-01/audit.json" \
  --receipt "$surface_review/publication-01/commit.txt" \
  --receipt "$surface_review/publication-01/commit-object.txt" \
  --receipt "$surface_review/publication-01/build-02.json" \
  --receipt "$surface_review/publication-01/https-bytes.json" \
  --receipt "$surface_review/prepare-publication.mjs" \
  --receipt experience/tools/verify-published.mjs \
  --receipt "$surface_review/browser-trust.json" \
  --receipt "$surface_review/prepare-browser.py" \
  --receipt "$surface_review/run-isolated-public.sh" \
  --receipt "$surface_review/qa-01/result.json" \
  --receipt "$surface_review/qa-01/executed-driver.mjs" \
  --receipt "$surface_review/qa-02/result.json" \
  --receipt "$surface_review/qa-02/executed-driver.mjs" \
  --receipt "$surface_review/validate-checkout.sh" \
  --receipt "$surface_review/validation/experiments-results-02/sprint.json" \
  --receipt "$surface_review/validation/experiments-results-02/heldout-evaluation-output.jsonl" \
  --receipt "$surface_review/validation/experiments-results-02/independent-heldout.json" \
  --receipt "$surface_review/retain-release.sh"
node experience/tools/connector-surface-review/verify.mjs
