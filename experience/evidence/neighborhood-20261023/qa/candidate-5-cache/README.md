# Candidate 5 browser-cache evidence

The production byte loader passed **11/11** checks in Chromium
**151.0.7922.34**, using real loopback HTTP and the browser's enabled HTTP cache.
The run completed at 2026-10-23T03:32:11.135Z. Browser, context and server closed;
there were no page errors or external requests.

| Identity | SHA-256 |
| --- | --- |
| Candidate package, 299 files | `223fcf32ae41551aab0096dae95d8160c679dacb38469c0f7dbdfb4163b37f23` |
| Executed driver | `6f7650460a704f7a28dc469c6ab97d132636ea268f411d089339186e73229e43` |
| Production `asset-bytes.js` | `4cf39e70533a07df14c258291178ceefd5cb289df8b8bab79f0da810e2fbf005` |
| Decoded result JSON | `b72005a0ddfc05d80deed06aa513f404fdeb97461b692da338bbf1ddd620e988` |

[binding.json](binding.json) records compressed and decoded evidence hashes,
fixture identities, and the loader's matching source content in the verified
candidate's lighting source map. All 299 package files were independently read
and checked against [package-identity.json](package-identity.json).

[result.json.gz](result.json.gz) preserves the complete report unchanged.
[executed-driver.mjs.gz](executed-driver.mjs.gz) and
[asset-bytes.js.gz](asset-bytes.js.gz) preserve the exact executed sources.
The `fixtures` directory contains the unchanged packaged Shijō lighting JSON,
Ginza lighting JSON and traveller GLB. Every compressed evidence file was decoded
and compared with its original bytes after packaging.

The checks establish that:

- Repeated verified rig/model requests reuse the browser cache without additional
  server requests.
- A new expected SHA at the same path retrieves the other actual packaged rig,
  while the original version remains separately cached.
- Actual cached bytes with the wrong identity are rejected. An explicit retry
  retrieves corrected bytes; the following read reuses that verified cache entry.
- A real cacheable HTTP404 is rejected, and an explicit retry retrieves the
  corrected actual model after the server changes to HTTP200.
- Unhashed resources revalidate through HTTP304 and observe changed bytes through
  HTTP200, including URLs with a hash-looking query parameter.

The report retains 17 server request records, seven CDP cache observations, actual
response body hashes, conditional request headers, browser resource timing and
each production-loader result. Faults and version changes were real HTTP server
transitions. The driver used no request interception or fetch replacement.

This evidence concerns the captured loader and asset identities. The separate
candidate5 performance report uses Chromium151.0.7922.173 and measures full-app
startup and input behavior. Physical-device performance, external CDN behavior
and complete-route acceptance retain their separate evidence requirements.

Reproduction instructions: [browser-asset-cache.md](../../../../tools/browser-asset-cache.md).
