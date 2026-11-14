# RAD page-size qualification · 14 November 2026

| Measurement | Approved source | Official S8Delta trial |
| --- | ---: | ---: |
| Complete RAD files | 84,115,304 bytes | 84,748,928 bytes |
| Data pages | 39 | 39 |
| Pages above 2 MiB | 37 | 37 |
| Root page | 2,283,352 bytes | 2,298,408 bytes |
| Nodes / SH degree | 2,541,177 / SH2 | 2,541,177 / SH2 |
| Changed positions, colors, scales, opacity, SH coefficients | — | 0 |
| Changed child counts / child indices | — | 0 / 0 |
| Changed decoded quaternion components | — | 68,224 |
| Exact decoded identity gate | Reference | **Failed** |

The official decoder/encoder trial adds **633,624 bytes**. Its orientation
re-encoding changes 68,224 floating-point components, with maximum absolute
component difference 2.0. A component difference does not directly measure angular
or image error. The strict preservation gate rejects the derivative, and the
approved published assets remain unchanged. No browser rendering of this
derivative was performed.

[Actual comparison](comparison.json) · [Output and exit reason](conversion-output.txt)
· [File and dependency receipts](result.json) · [Integrity manifest](manifest.json)

## Supported encoding controls

The complete pinned [converter source](upstream/rust/build-lod/src/main.rs) exposes
LoD method, intermediate precision, SH degree, cropping, clustering and output
format. It provides no page-length or DEFLATE-level argument. The
[RAD encoder](upstream/rust/spark-lib/src/rad.rs) fixes each page at 65,536 nodes
and compresses each property internally at DEFLATE level 6. The
[hierarchy ordering](upstream/rust/spark-lib/src/chunk_tree.rs) uses matching
64 Ki-node batches. Its public SH encoding API supports S8Delta, which is the
single bounded alternative measured here.

The previous outer-gzip experiment and this exact-coefficient experiment leave
the ordinary-page target open. The next encoding change needs an encoder API
that preserves compressed-property values while allowing internal compression
control, or coordinated page-size support in the encoder and runtime. Any such
change still requires unchanged hierarchy/geometry/appearance evidence and actual
loading measurements. Current source-qualified Kyoto route construction retains
its separate source requirements.

## Evidence and limits

The input is scbenoit's CC BY 4.0 Knock Community Hall capture in Canada, using the
approved SH2 derivative. It provides no Kyoto route coverage. All 40 input hashes
match the [approved release manifest](approved-package-manifest.json). The tool
uses unchanged official Spark source at
`ffe210dc0a45d0515a06c9235878108112827d61`; retained upstream files match the original
[source-acquisition receipt](source-acquisition.json), and all 46 restored files
are recorded in [tooling restoration](tooling-restoration.json).

The [exact producer snapshot](producers/rust/src/main.rs) invokes the upstream
parser and encoder, preserves page indices and hierarchy, and compares each
decoded scalar bit pattern. The retained Cargo.lock and downloaded crate hashes
pin this trial's dependencies. Upstream source is MIT licensed; its
[license](upstream/LICENSE) is included. Reports contain hashes and numeric
measurements, with source assets retained only in ignored artifacts.

The experiment completed conversion and comparison, then exited with code 1 at
the identity assertion. [Reproduction and offline verification](../../../tools/review-chunks/README.md)
remain available in a clean checkout. Verification checks receipts, provenance
and arithmetic; replaying the decoded comparison requires restoring the actual
assets and compiler. Physical-device performance, image equivalence and complete
Kyoto-route acceptance remain unverified.
