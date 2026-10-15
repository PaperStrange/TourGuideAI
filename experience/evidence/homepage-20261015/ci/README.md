# Runtime CI evidence

Run: [38790342241](https://github.com/PaperStrange/TourGuideAI/actions/runs/38790342241), source `c3bf2309329eb1ff212f14d3e24697f38d98a23d`.

The run completed as `cancelled` at 2026-10-15 19:28:17 UTC after the next source push superseded it. Homepage, travel companion and shared perspective jobs succeeded. Original walk was cancelled during its Chromium step at 19:28:16 UTC; the available job status contains no test failure before cancellation. `run-status.json` preserves the final GitHub response.

The next runtime run is [38794089854](https://github.com/PaperStrange/TourGuideAI/actions/runs/38794089854), source `bdc85fd4cd5dd90f390f042c0112b8d80fc19768`. Its results are separate from this superseded run.

`artifacts.json` records GitHub's available artifact metadata. Downloads of the successful homepage and travel ZIPs returned HTTP 403 at the Azure blob-storage redirect. The direct completed-job log download was blocked at that redirect too. Therefore this directory does not contain inspected CI browser reports or CI package manifests, and no equality with the locally verified package is inferred.

The locally verified homepage report and screenshots remain in the neighboring release evidence. No local suite was repeated during CI monitoring.
