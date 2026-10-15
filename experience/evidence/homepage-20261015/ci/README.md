# Runtime CI evidence

Run: [38790342241](https://github.com/PaperStrange/TourGuideAI/actions/runs/38790342241), source `c3bf2309329eb1ff212f14d3e24697f38d98a23d`.

At 2026-10-15 19:10 UTC, homepage, travel companion and shared perspective jobs had succeeded. Original walk remained in its Chromium step. The JSON status is the GitHub response captured at this checkpoint, not a final completion claim.

`artifacts.json` records GitHub's available artifact metadata. Downloads of the successful homepage and travel ZIPs returned HTTP 403 at the Azure blob-storage redirect. The direct completed-job log download was blocked at that redirect too. Therefore this directory does not contain inspected CI browser reports or CI package manifests, and no equality with the locally verified package is inferred.

The locally verified homepage report and screenshots remain in the neighboring release evidence. No local suite was repeated during CI monitoring.
