# Bounded Spark streaming experiment

Uses the existing CC BY 4.0 Knock Community Hall source by scbenoit with Spark 2.4.0
and Three 0.186.1. Production application modules remain unchanged. The
[retained results](../../evidence/realism-01/qualification/splat-streaming/README.md)
include the original transfer failure, compact encoding trial, lifecycle observations
and frozen comparison frames.

## Official conversion

Spark source commit: `ffe210dc0a45d0515a06c9235878108112827d61` (`v2.4.0`). The
[official LoD instructions](https://github.com/sparkjsdev/spark/blob/ffe210dc0a45d0515a06c9235878108112827d61/docs/docs/lod-getting-started.md)
and [CPU converter](https://github.com/sparkjsdev/spark/blob/ffe210dc0a45d0515a06c9235878108112827d61/rust/build-lod/src/main.rs)
support SOG input, quality LoD, and a RAD header with independently fetched RADC pages.
The checked source uses 65,536 splats per page. Explicit `--quality` selects the recorded
algorithm regardless of defaults in documentation.

The retained run used official Rust 1.91.0 components, verified against its release
manifest, and `cargo build --release --locked --no-default-features` to compile the
CPU converter. Tooling stayed below its 1.5 GB cap. Downloads, compilation, command
lines, exact inputs and dependency checksums are recorded in
[conversion receipts](../../evidence/realism-01/qualification/splat-streaming/conversion/acquisition.json)
and [execution records](../../evidence/realism-01/qualification/splat-streaming/conversion/execution.json).

Use a checkout of that exact upstream revision and an installed matching Rust toolchain.
Keep Cargo, Rustup, build outputs and temporary files under ignored project artifacts.
With the current verified tool available:

```bash
artifacts/realism-01/splat-streaming/tooling/target/release/build-lod --quality --rad-chunked artifacts/realism-01/splat-streaming/converted/knock-original.sog
artifacts/realism-01/splat-streaming/tooling/target/release/build-lod --csplat --quality --rad-chunked artifacts/realism-01/splat-streaming/converted/compact/knock-original.sog
```

Place an unchanged copy of the acquired original in each destination beforehand;
its required SHA-256 is `81d061bad6ba255689939847482836f7d70bf2e222abce04e6d81c2c976c6a71`.
The converter writes next to the input. Both runs retain SH degree 3. `--csplat`
quantizes intermediate input values; it does not reduce the source SH degree or
automatically produce a small bootstrap. Every run records its actual output hashes.

## Browser observations

Requires workspace Playwright / Three, `/usr/bin/chromium`, Python NumPy / Pillow and
the verified Hall configuration, camera and Spark runtime from the fidelity experiment.
Use fresh run directories; preserve previous attempts.

```bash
node experience/tools/splat-streaming/capture.mjs artifacts/realism-01/splat-streaming/new-mechanics-run artifacts/realism-01/splat-streaming/converted/compact
node experience/tools/splat-streaming/capture.mjs artifacts/realism-01/splat-streaming/new-focused-run artifacts/realism-01/splat-streaming/converted/compact --focused
```

The viewer uses `paged: true`, an eight-page / 524,288-splat resident pool, a
262,144-splat display target, one fetcher, a three-second inactive-tree cleanup timeout,
the recorded source camera and focal adjustment 2. The server returns actual RAD bytes,
supports HTTP byte ranges and uses gzip level 9 for text resources. Chromium applies
10 Mbps / 80 ms network conditions and disables its cache. Temporary browser files
remain under ignored `artifacts/splat-streaming-tmp/`.

First visibility is established by a submitted frame with source splats and nonblack
pixels. Its frame pauses for capture. Later comparison frames require the active LoD
camera to match, no queued source fetch/upload, completed worker tasks, camera/page
stability and a paused frame counter before/after the screenshot. Initial visibility
does not establish the benchmark's full-quality view.

The full run exercises native orbit/dolly, page replacement, three unload/reload cycles
and cancellation. `--focused` captures the initial views and attributes cancellation
to a source request spanning the recorded removal time. CDP measurements count encoded
response bodies and response headers, including partial transfers in progress at first
visibility. Request headers and lower network protocol overhead remain unmeasured.

CPU array and logical texture observations are partial; worker/WASM heaps, actual driver
residency and transient decoding are excluded. The shared decode worker pool may remain
after the renderer's dedicated workers are terminated. Browser object counts alone
cannot establish complete resource release. Shared-host CPU activity and SwiftShader
timings cannot qualify physical-device performance.

The reviewed retained runs are enumerated in `retain.py`. It preserves their tool
snapshots, conversion receipts, source/reference identities, comparisons and image board.

```bash
python experience/tools/splat-streaming/retain.py
python experience/tools/splat-streaming/verify.py
```

The integrity verifier reads tracked evidence and producer files without requiring raw
scene downloads or installed Rust. Its successful result preserves failed transfer
checks and all unverified release gates.
