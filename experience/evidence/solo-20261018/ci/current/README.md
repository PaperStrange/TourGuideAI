# CI · 02c2d63

[Run 39133355919](https://github.com/PaperStrange/TourGuideAI/actions/runs/39133355919)
tests source `02c2d63ff407f706054d1029ebee46b39216a01d`. At the retained snapshot,
**2026-10-18 13:58:20 UTC**, the aggregate workflow is pending: the extended
homepage walkthrough and original-walk jobs are still running. The completed
reports below bind the exact published package
`0a6244091b50c9ee7220d698e1109c86bd397dba54384c8db20e68bc57c728e7`
under Chromium `151.0.7922.34`.

| Report | Recorded checks | Job status |
|---|---:|---|
| [Solo exploration](solo-result.json) | 75 passed, 0 failed | Success |
| [Travel companion](travel-result.json) | 73 passed, 0 failed | Success |
| [Homepage](homepage-result.json) | 65 passed, 0 failed | Extended walkthrough running |
| [Shared perspective](perspective-result.json) | 80 passed, 0 failed | Success |
| Extended homepage walkthrough | Pending | Running |
| Original walk | Pending | Running |

[runtime-binding.json](runtime-binding.json) compares every file in each CI
package manifest with the published package, checks runtime/home/solo source
hashes, and verifies downloaded ZIP digests against GitHub metadata.
[run-status.json](run-status.json) and [artifacts.json](artifacts.json) preserve
the observed GitHub job status and artifact identities. Reports were extracted
unchanged through the GitHub artifact connector. Screenshots and generated test
databases are outside this curated report folder.

The earlier run's original-walk 131/133 failure remains unchanged in the parent
folder. This run includes the fixture-aware lighting expectation. This folder is
an immutable observed-status snapshot; it makes no later aggregate-success claim.
The running jobs have not been canceled or restarted by this collection.
