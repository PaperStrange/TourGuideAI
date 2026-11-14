# Lossless transport for the approved capture

The tool verifies all 50 files against the reviewed public package. Public
packages preserve the original SOG, all 40 RAD/RADC files and asset metadata.
The separate measurement mode compresses the 39 RADC chunks with Node's native
gzip encoder at level 9. Every decoded file must match its reviewed size, SHA-256
and original bytes. Existing capture coefficients, camera and renderer settings
remain the reference.

Restore the approved Pages package to
`artifacts/realism-01/review-transport/baseline/`, including its package manifest.
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
