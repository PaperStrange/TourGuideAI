# Exact-value RAD encoding trial

The measured S8Delta trial is rejected by the existing appearance-preservation
gate. [Results and provenance](../../evidence/realism-01/review-chunks/README.md)
retain the complete comparison and input/output file hashes. The published review
continues using its existing assets.

## Reproduction

Run from the repository root with Python 3.11 or newer, a C linker and network
access for the pinned free toolchain and dependencies. The restoration script
verifies all 46 files against the existing source-acquisition receipts and installs
Rust 1.91.0 under ignored artifacts. It does not change system tooling.

```sh
python experience/tools/review-chunks/restore-tooling.py
PATH="$PWD/artifacts/realism-01/review-chunks/tooling/native/bin:$PATH" CARGO_HOME="$PWD/artifacts/realism-01/review-chunks/tooling/cargo-home" CARGO_TARGET_DIR="$PWD/artifacts/realism-01/review-chunks/tooling/target" TMPDIR="$PWD/artifacts/realism-01/review-chunks/tooling/temporary" cargo build --manifest-path experience/tools/review-chunks/rust/Cargo.toml --release --locked
artifacts/realism-01/review-chunks/tooling/target/release/review-rad-encoding artifacts/realism-01/review-loading/package-03/data/streamed/knock-original-lod.rad artifacts/realism-01/review-chunks/reproduction-01
```

Restore the 40 approved streamed files from Pages commit
`3f1d3e6f578877f8d7fdd908e3f19a9b3eb658f3`, directory
`previews/realism-01/data/streamed/`. Their required hashes are in the retained
[approved package manifest](../../evidence/realism-01/review-chunks/approved-package-manifest.json).
The final argument must name a new directory. The trial writes all output files
and `comparison.json`, then exits with code 1 when any decoded value changes.
This measured rejection is expected for the retained source; do not publish the
derivative or remove its identity assertion.

The harness uses Spark's original `RadDecoder` and `RadEncoder` at commit
`ffe210dc0a45d0515a06c9235878108112827d61`. It retains the source's hierarchy,
index order, page size, coefficient degree and quantization ranges. It invokes
no LoD rebuilding, clustering, cropping or coefficient reduction. The explicit
SH encoding becomes S8Delta. Every position, opacity, color, scale, quaternion,
SH1/SH2 coefficient, child count and child index is compared after both sources
pass through the official decoder.

The trial's Cargo.lock pins its actual dependencies. Their checksums are retained
separately from the historical converter's dependency versions. The result
measures this exact codec invocation and does not isolate a general S8Delta
compression advantage.

## Offline verification

```sh
python experience/tools/review-chunks/retain.py --verify
```

An optional following argument selects a retained evidence directory in a clean
checkout. Verification checks all 16 retained files, approved input identities,
46 restored source/toolchain identities, original upstream code hashes, actual
dependency archive checksums and measured byte totals. Decoded comparisons remain
recorded observations; rerunning them requires the original files and compiler.
The raw assets, binary, Cargo cache and compiler installation remain ignored.
