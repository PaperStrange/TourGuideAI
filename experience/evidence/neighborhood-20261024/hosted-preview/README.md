# Hosted six-sight preview verification

The actual HTTPS preview opens the connected Shijō east neighborhood in English
and Chinese. The bounded browser run completed with **21 passing checks and
4 failed checks**. Both public entry URLs showed a ready 3D canvas, all six
reviewed stops and the `1.35 km` route. Actual native Walk-to, Stop, Look closer,
Escape and night controls worked in both locales, with grounded movement and
unchanged selected order. The language landing links and both 390 px layouts
passed visibility, hit-target and horizontal-overflow checks.

- Landing: https://paperstrange.github.io/TourGuideAI/previews/shijo-east-c13/
- English: https://paperstrange.github.io/TourGuideAI/previews/shijo-east-c13/app/?mode=explore&pack=shijo-east&lang=en
- Chinese: https://paperstrange.github.io/TourGuideAI/previews/shijo-east-c13/app/?mode=explore&pack=shijo-east&lang=zh

The ordinary public URLs were checked through actual DOM state and captured
before navigation. Each locale then navigated to its separately recorded
`qa=1` URL for the read-only runtime observers. Those diagnostic URLs retain
the same production code and actual HTTPS resources. Six recorded native
events per locale were trusted. No route interception, response replacement,
seeded storage or injected player/camera state was used.

The four original failed assertions remain in the report:

| Failed scope | Recorded evidence |
| --- | --- |
| English completed browser response-body identity | 142 of 145 bodies matched; granite color/normal and font bodies became unavailable after navigation. All three recorded statuses were 200; no observed body hash mismatch. |
| Chinese completed browser response-body identity | 143 of 144 bodies matched; one font body became unavailable after navigation. Its recorded status was 200; no observed body hash mismatch. |
| English console-error check | Two actual 404 console entries at `https://paperstrange.github.io/api/health`. |
| Chinese console-error check | Two actual 404 console entries at `https://paperstrange.github.io/api/health`. |

The service health endpoint is unavailable on this static preview. This run
does not verify a hosted room backend. Both locales recorded zero page
exceptions and zero shader-error messages. The original console-error checks
remain failed; no zero-console or all-checks-pass claim is made. Browser body
observation gaps remain unobserved in this run.

The independently executed HTTPS file verifier passed **448/448**: all 446
canonical app files plus the landing and preview metadata. It establishes
published file identity separately from the missing browser response bodies.
Its unchanged report is `https-files.json.gz`, decoded SHA-256
`f0604aca48627b45d693a1edd3470de96dc776223a3ce7d6ae6d0f466959f054`.
The verifier source and Pages build metadata are retained alongside it.

Pages commit is `10e95b1d52aee46bbcd9c296746127e29b1b4131`.
The exact canonical app package is
`65167ee402d6d59978b5f979de8c6987721ec891ffec1ce6127831d7c0dd354e`
(446 files), implementation `28439744b6349b795ac0a50c20c5d45d735bb2ed`.
The executing browser driver SHA-256 is
`2423512ec9d8d2b988792b353cdef8dee180c00fdd853b1b570b302bceefc9c1`.
Original browser report SHA-256:
`87887b93d08e63ac29ea2928ccae3e353dd4ce10214c006bd0d4cd5960de4552`.
Execution used bundled Chromium 151.0.7922.34, desktop 1440×1000/DPR 1, normal
motion, inherited proxy and TLS verification. It ran
`2026-10-24T06:03:44.901Z`–`06:05:21.863Z` (96.962 seconds), then closed its
browser. This supplies hosted entry/control evidence; full traversal,
performance thresholds, physical-device performance and milestone acceptance
retain their separate scopes.

[binding.json](binding.json) binds the original report, executed driver,
stdout, eight unchanged screenshots, published-byte verifier and two earlier
diagnostic attempts. Reports, source and logs are losslessly compressed.
Raw originals remain in
`artifacts/neighborhood-20261024/qa/hosted-c13-public-and-observer/`.

[Landing diagnostic](landing-diagnostic/README.md) preserves the initial 1/2
result. [Observer diagnostic](observer-diagnostic/README.md) preserves the 7/4
result and root-directed closure. The final bounded flow was not rerun after
the four documented assertions above.
