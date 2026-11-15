# Kyoto connected-camera research board

The canonical board remains `previews/kyoto-source-review/`. This iteration compares physical camera recovery and actual source coverage. It preserves the earlier source and geometry URLs and their bytes. Production walking, metric floors, route recognition, day/night coverage and device performance require separate acceptance.

`package.mjs` verifies retained source manifests before deriving the visible measurements. Physical positions and virtual viewing directions have separate fields. The generated `review-data.json` retains input-manifest bindings; its exact bytes enter the reviewed package and source commit.

Run from the repository root after both source and rig evidence are retained:

```sh
node experience/tools/connector-rig-review/package.mjs artifacts/realism-01/connector-rig-review/package COMMIT_SHA
node experience/tools/connector-rig-review/check.mjs artifacts/realism-01/connector-rig-review/package artifacts/realism-01/connector-rig-review/qa-local
node experience/tools/connector-rig-review/retain.mjs --package artifacts/realism-01/connector-rig-review/package --qa artifacts/realism-01/connector-rig-review/qa-local/result.json
node experience/tools/connector-rig-review/verify.mjs
```

Use a fresh output directory for each package or browser run. The browser driver uses a short ignored `artifacts/rig-board-tmp` directory, the installed Chromium by default, and `CHROMIUM_PATH` when the environment supplies a configured launcher. Remote checks use the configured proxy and normal certificate validation. Browser profiles and source caches remain outside retained evidence.

After publication, run the same browser driver against the canonical HTTPS URL and retain both local and public reports. Pass publication receipts with repeatable `--receipt` arguments. The release coordinator separately binds the committed source bytes, Pages commit/tree, deployment response and served package bytes. A local report alone does not establish publication.

The checks verify desktop 1280 px and mobile 375 px layouts, decoded images, source attribution, visible measurements, relative links, all package hashes, historical URL bytes and the canonical entry. They provide no physical-device or walking-route acceptance.
