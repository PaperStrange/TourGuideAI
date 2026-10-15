# Travel companion evidence · 2026-10-15

Runtime source: `a8c3e493058198e8e5012bc9fd470190dc358148` on
`chore-sow-delivery-plan`. The foundations are in `6452aae`.
Published Pages commit: `6b5b1ea41a658badc8d364ad2267d07028b8fdbe`.

The companion connects selected Kyoto places to Google Maps directions and offers
explicit foreground location. It supports English/Chinese, ordered stop editing,
manual My Maps CSV import, private meaningful-place marks and a return to the
existing view/note experience. Location samples remain in memory.

| Evidence | Result |
|---|---|
| [Unit suite](unit-tests.tap) | 74 passed, zero skips |
| [Companion browser report](final/travel-result.json) | 73 passed; seven EN/ZH and location-state captures |
| [Shared-perspective regression](perspective-result.json) | 80 passed |
| [Focused sharing regression](sharing-result.json) | 24 passed, including the recap→companion link and locale |
| [Repository gates](repository-gates.json) | 17 passed, zero skips |
| [Original walk regression](original-result.json) | 130 passed |
| [Hosted byte comparison](hosted-verification.json) | All 63 files match |
| [Runtime CI status](ci-status.json) | All three jobs succeeded at `a8c3e49` |

The final package has **63 files**, with manifest SHA-256
`6a4f5b2f11d67153058305d73ffc715d3dd7bdd5c16531bd2a89b2a933fe0608`.
The final companion report SHA-256 is
`ea7fa1080a00b55825ba273cdbfadb608ece2cebba9f98834df0465058469c68`.

The perspective regression ran while the companion's presentation was being
repaired. [Its binding](perspective-binding.json) verifies that all 19 packaged
files actually requested by those scenarios are byte-identical in the final
package. [The sharing binding](sharing-binding.json) similarly verifies all 16
requested files; [the original binding](original-binding.json) verifies all 32.
This records the tested resources explicitly instead of treating
an earlier whole-package manifest as the final one.

The companion checks cover permission/start behavior; continuous controlled
position/accuracy updates; stale, denied, unavailable and outside-area states;
hidden-page pause and explicit resume; late callbacks after Stop; keyboard focus;
route order and reload through real entry parameters; blocked storage; selected
exports; and preservation of both older saves. Route grouping through 1,000 stops
is unit-tested. The shipped catalogue remains three places.

Native Chromium geolocation establishes permission grant, an initial fix and
explicit recovery after provider error. Its position-emulation update can emit an
unavailable error before a new position. Continuous-success and error timing use
separately labelled controlled callbacks. These establish application behavior;
they do not establish physical GPS accuracy or uninterrupted field tracking.

Maps URLs are inspected against documented parameter behavior without loading
Google's route UI. The Google-computed path, native Maps app, recipient delivery,
phone share sheet, My Maps account import and real walk remain human review items.
Screenshot review establishes presentation clarity, not emotional usefulness or
ordinary-device performance. No new architectural-realism acceptance is claimed.

`verify-hosted.mjs` compares deployed bytes against the final browser manifest.
`bind-regressions.mjs` compares a regression's requested resources against that
same manifest. The [agent checkpoint](../../docs/agent-checkpoint.md) records
release identities and exact resume commands.
