# Splat source-fidelity diagnostic

This isolated tool compares the existing shoe through Spark 2.4.0 and GaussianSplats3D 0.4.7, then compares the original CC-BY-4.0 Knock Community Hall source through the publisher's cached PlayCanvas runtime and Spark. It changes no application runtime.

Requirements: installed workspace dependencies (Three 0.186.1, Playwright), `/usr/bin/chromium`, Python NumPy/Pillow/BeautifulSoup. The current research environment provides BeautifulSoup through `PYTHONPATH=artifacts/source-review-python`. Browser temporary files stay under ignored `artifacts/splat-fidelity-tmp/` because Chromium socket paths have a length limit. Local listeners require network permission in the managed sandbox.

Install the [pinned Python packages](requirements.txt) in an ignored tool directory.
`verify.py --root . --retained-only` checks the tracked evidence without original
source downloads. It recomputes all five image comparisons, binds historical
producers and served inputs, verifies matching cameras, preserves the failed
hidden/resume observation and checks actual preview dependencies against the
package manifest. NumPy 2.5.4 and Pillow 12.3.0 are required for reproducible pixels.
Omit `--retained-only` to recheck cached original sources and ZIP entries as well.

From the repository root, preserve each run in a fresh output directory:

```bash
python experience/tools/splat-qualification/acquire.py --output artifacts/realism-01/splat-qualification/downloads
python experience/tools/splat-fidelity/acquire.py --output artifacts/realism-01/splat-fidelity/downloads
PYTHONPATH=artifacts/source-review-python python experience/tools/splat-fidelity/acquire-hall.py --offline
node experience/tools/splat-fidelity/capture.mjs artifacts/realism-01/splat-fidelity/new-shoe-run
python experience/tools/splat-fidelity/compare.py artifacts/realism-01/splat-fidelity/new-shoe-run
node experience/tools/splat-fidelity/capture-hall.mjs artifacts/realism-01/splat-fidelity/new-hall-run
python experience/tools/splat-fidelity/compare-hall.py artifacts/realism-01/splat-fidelity/new-hall-run
node experience/tools/splat-fidelity/capture-hall.mjs artifacts/realism-01/splat-fidelity/new-focal2-run --focal2 --calibration-only
python experience/tools/splat-fidelity/compare-hall.py artifacts/realism-01/splat-fidelity/new-focal2-run
```

Remove `--offline` to acquire missing original hall responses within a 40 MB hard budget. The source manifest checks exact byte counts and SHA-256. Publisher HTML contains a session identifier; a fresh response may differ and is intentionally rejected for review. The retained cache reproduces the exact archive and settings. This limitation does not affect serving the self-contained preview after packaging. Upstream Spark acquisition is the existing separate tool and has its own pinned integrity checks.

```bash
python experience/tools/splat-fidelity/package-preview.py artifacts/realism-01/splat-fidelity/local-preview
node experience/tools/splat-fidelity/check-preview.mjs
python -m http.server 8765 --bind 127.0.0.1 --directory artifacts/realism-01/splat-fidelity/local-preview
```

Open `http://127.0.0.1:8765/`. The preview uses the documented PlayCanvas focal adjustment 2; it has no external asset requests, API calls or credentials. Attribution links open on explicit user action. The source remains a full 1,935,275-splat asset, so this is a desktop source preview with unqualified latency/mobile support. Reload after resizing. `check-preview.mjs` verifies the packaged paths, visible attribution, real source count and native input.

The diagnostic camera copies the measured publisher projection. The local preview uses its current viewport aspect ratio. The publisher's original render is cached unchanged, with supported `noanim`, `noui`, `webgl` parameters; telemetry is blocked and recorded. The publisher poster is never substituted for a tested frame.

`retain.py` copies only the reviewed named runs and unchanged screenshots into the evidence folder, retains historical producer snapshots and writes SHA-256 records. Run it after the reviewed runs and preview check finish. New attempts must retain their own directories and must not silently overwrite earlier evidence. The [evidence review](../../evidence/realism-01/qualification/splat-fidelity/README.md) records the failed assumptions, measured differences and remaining gates.
