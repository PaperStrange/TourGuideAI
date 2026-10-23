# Browser asset-cache verification

Run in a coordinated browser window with the reviewed build and current frozen
production `src/runtime/asset-bytes.js`:

```sh
ASSET_CACHE_OUTPUT=artifacts/asset-cache \
node experience/tools/browser-asset-cache.mjs experience/dist
```

`EXPERIENCE_QA_CHROMIUM` selects Chromium. `--help` performs no browser work. The
driver uses the existing proxy configuration, retains TLS verification, and sets
`TMPDIR` to repository `artifacts/tmp`. Each browser request has a ten-second
abort deadline. The test imports the captured production module into a local
page and performs sequential calls through its exported `readAssetBytes` API.

The loopback HTTP server serves actual packaged Shijō and Ginza lighting JSON
and the actual traveller GLB. It records status, cache headers, conditional
request headers, body byte lengths and hashes. Chromium's HTTP cache stays
enabled after one initial cache clear. CDP cache/network events and browser
ResourceTiming are retained. There is no request interception or fetch override.

The required cases are:

- Repeating a verified rig and model returns identical bytes with one server
  request for each resource.
- Changing the expected SHA at one path retrieves the other packaged rig;
  requesting the original version again retrieves its original cached bytes.
- A native HTTP request caches the wrong actual rig under an expected-version
  URL. Production integrity validation rejects those bytes. After the server
  publishes the correct actual rig, the next explicit production call recovers,
  and a further call uses the verified cache entry.
- A real HTTP404 response is explicitly cacheable and read into Chromium's
  cache. Production loading rejects the cached HTTP error. After the server
  publishes the actual model with HTTP200, an explicit production call recovers
  and subsequent calls remain cacheable.
- Unhashed resources issue real conditional revalidation, receive HTTP304 when
  unchanged, and receive changed actual bytes with HTTP200. A hash-looking query
  string alone does not change that behavior.

These server transitions are controlled HTTP failure and version-change cases.
Their successful bodies are unchanged packaged files. The driver snapshots its
executed source, production loader, and all three input bodies into the evidence
directory, with identities in `result.json`. Every assertion retains its server
requests and browser result; independent cases continue after an assertion fails.

The report establishes browser-cache behavior for the captured production loader
and asset bytes. Scene rendering, full application integration, external CDN
cache policy, startup speed, and physical-device performance need their respective
checks. No performance threshold is changed by this test.
