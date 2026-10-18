# CI · 1ce9360

[Run 39131040477](https://github.com/PaperStrange/TourGuideAI/actions/runs/39131040477)
tests source `1ce9360a89e3ab72943bb2d1876051f80a14bf1e`. It completed with the
original-walk job failing two assertions; the other three jobs succeeded.

| Report | Result |
|---|---:|
| [Homepage](homepage-result.json) | 65 passed, 0 failed |
| [Extended walkthrough](walkthrough-result.json) | 264 passed, 0 failed |
| [Shared perspective](perspective-result.json) | 80 passed, 0 failed |
| [Travel companion](travel-result.json) | 73 passed, 0 failed |
| [Original walk](original-walk-result.json) | 131 passed, 2 failed |

All downloaded reports bind package
`81e885e64a92adb6140d230e3819bc3ace119ff4475b50159bc56a5a88c5c268`
and Chromium `151.0.7922.34`. This run predates the dedicated solo browser job.
The later local package is
`0a6244091b50c9ee7220d698e1109c86bd397dba54384c8db20e68bc57c728e7`.
Its runtime source is `a1dbd36298e56109a396d2df1a9031851859b3c9`.

[runtime-binding.json](runtime-binding.json) compares recorded requested assets,
both complete package manifests, and source-file hashes. The later package changes
the homepage and world-map bundles, their source maps, and `index.html`. Its
homepage/controller guidance and map resize guard require their separate local
evidence. All recorded assets requested by the perspective and travel suites
match the later package. The original-walk suite's recorded assets also match.
This CI run does not certify the later homepage bytes.

The failed original-walk checks are
`night-applies-distinct-local-environment-lights-and-emission` and
`hdr-retry-applies-the-real-local-asset`. Both use `lightingMatchesRig` in
`tests/browser-appearance.mjs`, whose expected-value merge includes the profile's
environment, hemisphere and sun fields while omitting its per-fixture overrides.
The retained night snapshot reports the four calibrated canopy fixtures at 150,
matching `architectural-profile.js`; the helper compares them with the base rig's
170. That snapshot has ready night lighting and the expected local HDR hash.
The retry assertion stores no detailed snapshot, so its behavior requires the
separate focused verification. The CI failures remain recorded exactly; an
updated assertion and subsequent run have their own evidence.

[run-status.json](run-status.json) retains job/step results and source identity;
[artifacts.json](artifacts.json) retains GitHub artifact metadata.
[original-walk-job.txt](original-walk-job.txt) preserves the failed browser step's
GitHub log. The downloaded
ZIP digests match GitHub's published SHA-256 digests. JSON reports are extracted
unchanged. The GitHub connector retrieved artifacts after CLI artifact downloads
returned HTTP 403. Screenshots and generated test databases are excluded from
this curated report folder. Test counts establish the recorded automated checks;
they do not establish human enjoyment or hardware fluency.
