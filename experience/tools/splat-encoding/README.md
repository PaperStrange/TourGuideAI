# Single SH2 encoding experiment

This experiment uses the existing licensed Knock Hall source, the pinned official
Spark 2.4.0 CPU converter and the unchanged
[bounded streaming harness](../splat-streaming/README.md). It explicitly reduces the
derived spherical-harmonic degree from SH3 to SH2 while preserving the original SOG.
No acquisition, additional candidate family or production runtime change is involved.

The sole new conversion uses:

```bash
artifacts/realism-01/splat-streaming/tooling/target/release/build-lod --quality --rad-chunked --max-sh=2 artifacts/realism-01/splat-streaming/converted/sh2/knock-original.sog
```

The actual recorded command ran in an isolated encoding directory; completed files
were moved without changing bytes into the fresh `converted/sh2/` directory required
by the existing harness. The [execution receipt](../../evidence/realism-01/qualification/splat-encoding/conversion/execution.json)
records both locations, command, source/tool hashes, full metadata and every output.
Keep source SHA-256 `81d061bad6ba255689939847482836f7d70bf2e222abce04e6d81c2c976c6a71`;
new conversion files are capped at 200 MB. Do not overwrite retained attempts.

```bash
node experience/tools/splat-streaming/capture.mjs artifacts/realism-01/splat-streaming/sh2-focused-run artifacts/realism-01/splat-streaming/converted/sh2 --focused
python experience/tools/splat-encoding/retain.py
python experience/tools/splat-encoding/verify.py
```

The named run has already completed. Use a fresh browser output name for a new attempt
and explicitly update the retained run selection before retaining that attempt.
`retain.py` copies completed reports and frozen frames, records external reference
hashes, calculates image differences and creates the comparison board. `verify.py`
checks retained evidence without the raw 84 MB RAD output. It reuses the pinned streaming
verifier's raw CDP transfer and cancellation checks, and independently compares both
new images to the full-source SH3 reference.

Requirements: the same Playwright / Three / Chromium environment as the streaming
experiment; NumPy 2.5.4 and Pillow 12.3.0 for image verification. Raw conversion data,
temporary files and browser profiles remain in ignored artifacts.

The [results](../../evidence/realism-01/qualification/splat-encoding/README.md) distinguish
the passing first-visible byte boundary from remaining section, directional-fidelity,
full-quality and physical-device gates. SH2 removes seven degree-3 basis terms per color,
or 21 directional coefficients per Gaussian; view-dependent highlights and angular
color detail require further evaluation.
