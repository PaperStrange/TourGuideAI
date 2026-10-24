# Candidate 13 CI observation

Run `40064451730` tests implementation
`28439744b6349b795ac0a50c20c5d45d735bb2ed`. At
`2026-10-24T05:52:38.080Z`, seven jobs had succeeded: source preparation,
travel, solo, perspective, reviewed packs, original walk and homepage with its
extended walkthrough. Connected neighborhood remained in progress. The complete
current-source traversal remains pending.

Seven available completed browser reports contain **771 passes and zero
failures**: packs 81, original walk 133, travel 73, homepage 65, extended
walkthrough 264, perspective 80 and solo 75. The source-preparation log
separately records 18 workbench and 13 neighborhood source tests passing.

All available ZIP sizes and SHA-256 digests match GitHub artifact metadata. Each
report binds the same 446-file CI package:
`65167ee402d6d59978b5f979de8c6987721ec891ffec1ce6127831d7c0dd354e`.
The retained local candidate 13 package is
`e8eed9146ea83accaf54769ff2aaaf5a902cfd344295e3348e11684e50838b0c`.
Every path is present and **425 files match exactly**. The 21 differing files
are JavaScript source maps. Changing only their parsed `sources[]` prefixes
from `../../../../experience/` to `../../` and serializing the JSON reproduces
every CI map size and SHA-256 exactly. All source contents and mappings are
unchanged. Executable JavaScript, HTML, CSS, models, images, fonts and other
data bytes match. These are distinct full-package identities with a verified
source-path-only difference.

Root's subsequent canonical default-output build is preserved at
`artifacts/neighborhood-20261024/candidate-13-canonical`. Independent QA readback
verified all **446 files byte-for-byte** against the CI manifest, including the
21 maps. It has the CI package identity `65167ee4…`; the complete identity and
96,952,094-byte inventory are in the
[canonical package record](../../validation/candidate-13-canonical-package.json).
The original local browser/performance package and reports retain `e8eed914…`.
No browser or timing run was repeated for the debug source-path difference.

[verification.json](verification.json) preserves artifact IDs/digests, all
report/source hashes, the 446-file comparison and exact per-map proof. Original
reports, executed drivers/helpers, local source maps, the comparison script,
local package manifest and source-job log are losslessly compressed.
[observed-run.json](observed-run.json) retains the timed job/artifact snapshot.
The report drivers and dependencies match the tested source commit. Raw ZIPs
remain in `artifacts/neighborhood-20261024/ci/candidate-13/`; temporary signed
download URLs are excluded. No CI restart or local test rerun was performed.

The earlier `05:12:54.468Z` observation remains unchanged in
[observed-run-051254.json](observed-run-051254.json) and
[verification-051254.json](verification-051254.json), with its four-report
293-pass scope. The newly verified packs artifact is `12549515897`, ZIP SHA-256
`edeb7140e98cf53bd1f4c78abb5fc767a5675a154118b123696790af2fa4669e`.
Its original decoded report SHA-256 is
`052eb9ec618d022bb415e785d3fc77b3426a1c347518bc0e261728e92241e253`;
its 446 package entries match the canonical inventory exactly.

The `05:18:38.689Z` five-report observation remains unchanged in
[observed-run-051838.json](observed-run-051838.json) and
[verification-051838.json](verification-051838.json), with its 374-pass scope.
The original-walk artifact `12549441816` has ZIP SHA-256
`ea06f11dbfa6c52829468a592c78413db52af5ed07a837fe081701b62edf7b92`
and decoded report SHA-256
`642a1596f2ece14ebb8b6f6e473088cf2ddb28ba736bd3784a07a508e47dcdc7`.
The extended-walkthrough artifact `12548693176` has ZIP SHA-256
`d3e13d644fff30b7d82799bdfacd987bff0997684571b28c3f331c365b99e899`
and decoded report SHA-256
`09c673ea294e9a852f31a1d8bc521c49f18143559f838a1319b08385b1703d96`.
Both complete reports, their source-matched drivers and all 446 canonical file
identities were verified without rerunning tests.

Local [camera guidance](../../qa/candidate-13-camera-guidance-desktop/README.md),
[standard performance](../../performance/candidate-13/README.md),
[Q03](../../performance/candidate-13-q03/README.md) and
[native visibility](../../performance/candidate-13-native-visibility/README.md)
retain their independent current-package scopes and original failures.
