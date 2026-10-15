# Local backend with GitHub Pages

Runtime source: `bdc85fd4cd5dd90f390f042c0112b8d80fc19768`.
Verified Pages runtime: `53cf8647a46d365bf2b7774e0971d9bcd24b1711`.
Verification metadata: `ad9fc10d6b90ca824fd8203cba1cff8b33366665`, changing
only `review-build.json` after the browser run.
The user selected local testing before paid hosting.

The backend runs through `npm run local:pages` with SQLite persistence and the
exact Pages origin allowed. Together includes an explicit EN/ZH connection panel,
HTTPS or loopback HTTP addresses, SSE or periodic updates, endpoint-scoped member
credentials and confirmation before opening an unfamiliar invitation. Switching
services cancels pending operations and clears the active invitation. Independent
journey saves remain unchanged.

| Evidence | Result |
|---|---|
| [Candidate browser report](candidate/connection-result.json) | 37 passed against two real loopback APIs; candidate bytes served under Pages origin |
| [Actual published-page browser report](published/connection-result.json) | 38 passed; two real loopback APIs; 112 retrieved static responses matched the reviewed package |
| [Published bytes](candidate/hosted-verification.json) | All 80 files match; source descriptor matches |
| [Unit tests](unit-tests.txt) | 87 passed |
| [Service tests](../server/local-pages-node-tests.txt) | 13 passed, including actual process restart and polling recovery |
| [Repository gates](repository-gates.json) | 17 passed |

Package manifest SHA-256:
`2550220e09dea51021564de8cafd0fb16df8c15b7140a1c466628679a5424ab9`.
Candidate browser report SHA-256:
`e6e30ab3e7cf6b6ec89f3ec7685ffb1617f7b7df7b6fd9cc11ba8c28f94c6309`.
Actual published-page browser report SHA-256:
`85edcd8335ed4e1fde97eb90619f0a9d70af0fcc911758927a8ab04eb62dbc8e`.
The font was regenerated from the known homepage and companion copy with no
missing source glyphs. Arbitrary traveler-entered text can use system fallbacks.

The candidate report covers two clients, SSE and polling, invitation confirmation
without prior authorization headers, endpoint selection/reset/reload, member
credential isolation, cancellation during a real pending request, preserved
private saves, and English/Chinese phone layouts. Local Network Access permission
was granted by automation; this does not establish that every browser or managed
device permits loopback access. The default unconfigured Pages `/api/health`
returns the expected 404. No successful API/provider response was fabricated.

The actual published-page run completed at 2026-10-15 19:33:22 UTC. It loaded the
real HTTPS Pages assets and used two isolated local APIs, with no replaced
successful response. All 112 captured bodies across 16 requested static paths
matched; the separate comparison covered all 80 package files. Its driver awaits
pending asset-body reads before closing each context. Manual browser permission
UX and physical devices remain untested. Runtime CI is
[run 38794089854](https://github.com/PaperStrange/TourGuideAI/actions/runs/38794089854);
check its recorded state before claiming all regression jobs passed.

No public tunnel or paid service has been created. Automatic approval review
rejected starting Tunnelmole because room content and invitation/member tokens
would pass through a third-party relay without explicit approval. A proxy-mediated
WebSocket handshake succeeded; it does not establish an operating tunnel. A user
on another device cannot reach this workspace's loopback address. The
[local guide](../../../server/docs/local-pages.md) provides a same-computer setup.
Public remote testing remains pending tunnel approval and actual validation.

AI planning remains unavailable until a model provider is configured and tested.
These checks do not establish human enjoyment, realism, physical-device frame
rates or travel usefulness. Baseline homepage/art evidence retains its original
source and package identity in the parent directory.
