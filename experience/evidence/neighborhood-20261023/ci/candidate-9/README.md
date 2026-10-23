# Candidate 9 CI evidence

[Run 39909716421](https://github.com/PaperStrange/TourGuideAI/actions/runs/39909716421) consumes source `9b973f0d98426a102af1c936286052d46986f895`. The captured run is **in progress**. Unfinished jobs remain pending.

| Suite | Observed result |
| --- | --- |
| Geographic source preparation | Success: 18 workbench and 13 neighborhood source checks |
| Original walk | 133 passed, 0 failed |
| Shared perspective | 80 passed, 0 failed |
| Homepage basic browser checks | 65 passed, 0 failed |
| Extended homepage walkthrough | 264 passed, 0 failed |
| Solo exploration | 75 passed, 0 failed |
| Travel companion | 73 passed, 0 failed |
| Reviewed place packs | 81 passed, 0 failed |
| Connected neighborhood | Pending |

All seven downloaded browser reports consume candidate 9 package `1720fc5907c0c6f2b292aa0e728bcaad8ddbd6c776de7aec2b5a35a513609c9b`. Direct hashing of the frozen local candidate and comparison with each report confirms all **446 files** match, including source maps. Each recorded driver SHA256 also matches its exact file at source `9b973f0d98426a102af1c936286052d46986f895`. The reports retain their actual browser versions, timing, checks and consumed-file manifests.

[verification.json](verification.json) records original report SHA256 values, compressed report hashes, artifact IDs, verified ZIP digests, check counts, driver/source bindings and package comparisons. Each `*-result.json.gz` decompresses to the original downloaded report bytes. `browser-result.json.gz` is the original-walk report. [source-job.log](source-job.log) retains the completed geographic-source job output. [run.json](run.json), [jobs.json](jobs.json) and [artifacts.json](artifacts.json) retain the remote snapshots taken after report extraction; `verification.json` records the capture time. The connected-neighborhood job is the sole unfinished job in that snapshot.

ZIP archives and extracted JSON remain under ignored `artifacts/neighborhood-20261023/ci/candidate-9/`. Temporary signed download URLs are excluded. Reconciliation uses real GitHub job/artifact reads and lightweight local report extraction; it does not launch a browser or modify the workflow.

These completed software-environment checks do not close pending suites, physical-device fluency, or the native hidden-tab visibility gate. The workflow aggregate remains pending until its actual completion is recorded.
