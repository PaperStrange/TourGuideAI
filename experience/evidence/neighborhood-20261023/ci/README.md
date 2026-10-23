# CI closure: 39574644628

[The completed run](https://github.com/PaperStrange/TourGuideAI/actions/runs/39574644628) tested source `6f9ccc247d269b8548b6103326bcf67431fd846a` and finished with failure on 2026-10-21 at 11:56:57 UTC.

| Browser suite | Passed | Failed |
| --- | ---: | ---: |
| Original walk | 133 | 0 |
| Shared perspective | 80 | 0 |
| Travel companion | 73 | 0 |
| Homepage | 65 | 0 |
| Extended walkthrough | 264 | 0 |
| Solo exploration | 75 | 0 |
| Reviewed packs | 81 | 0 |
| Connected neighborhood | 70 | 12 |

The geographic source job passed 18 workbench and 13 neighborhood checks, recorded in [source-job.log](source-job.log). Browser results above do not establish physical-device fluency or human recognition.

## Preserved bytes

[verification.json](verification.json) records every original report SHA256, artifact ID and verified ZIP digest. [artifacts.json](artifacts.json) and [jobs.json](jobs.json) retain the corresponding GitHub API evidence. All eight reports are also retained here as deterministic gzip files; decompression yields the original report bytes. The 97 MB neighborhood JSON is preserved as [neighborhood-result.json.gz](neighborhood-result.json.gz). The original ZIPs, extracted screenshots and raw JSON remain under ignored `artifacts/neighborhood-20261023/ci/`.

All eight browser reports bind the same 293-file CI package, `809a90dbabae9becc384e67f006275ca6b27f107f74c81f28f916c595601fb9e`. Direct hashing of every file in the retained local build confirms its package `9f3d1550c6263ca35d6c672da67952afcc3d2fb69ea4cf21d1c661ef06ebb4b6`. Exactly 21 source-map files differ. All executable JavaScript, HTML, CSS, models, images, fonts and other data bytes match. These remain separate package identities.

The neighborhood report SHA256 is `5a5c9f94960fb3212ed01f9a5d606034f267de1e3c5ffa82e3748f75052a9cfd`; its original artifact ZIP SHA256 is `cee5d5830f7a2b4de90b49e7d3c803117024f9fdaeececbdcae9c061f19ed768`. No temporary signed download URLs are retained.

## Actual route and failed checks

The browser completed the six-sight outbound journey and full return, observing every selected route cell in both directions. The longest completed leg was the river-to-Tenmangu return at 1,909,363 ms. Saved route/pose/light reload, map return, delayed restore cancellation, warm saved-view returns and private-data preservation passed.

[failure-analysis.json](failure-analysis.json) evaluates the exact individual predicates for every recorded arrival sample and retains each first offending sample:

- Nine arrival checks failed because four near-detail cells were briefly attached where the limit is three. Ground hits, corridor containment, actor height, download/attachment limits, nine-cell residency, CPU retention and complete texture accounting passed those paths. Settled primary-frame budgets passed.
- Initial asset failure preserved the selected itinerary. Changing locale automatically began another scene request, hid Retry and changed the error state to loading. Once the driver released the denial, that request reached ready without an explicit Retry click; `openError` remained in the journey panel. The subsequent click timed out on the hidden button.
- The unknown-revision case wrote future-revision bytes while the current page retained revision 1 in memory, then reloaded. The pagehide capture/flush path writes the in-memory session. The reloaded page showed revision 1 and the expected replacement controls never appeared. The newer-record preservation behavior requires correction and an independent browser check.

This closure preserves the failed acceptance result. The local arcade camera/head-crop and interior inspection findings are separately recorded in [the October 21 QA checkpoint](../../neighborhood-20261021/qa/README.md). New source changes require their own build and evidence binding.
