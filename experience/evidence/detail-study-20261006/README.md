# Expanded street and sharing review · 2026-10-06

The frozen application at `6a532aa9a2ef0e9d4366ff8159f497f0843b737e` passed
**97/97 browser checks, 22/22 pure tests and 17/17 repository gates**. The existing
[playable site](https://paperstrange.github.io/TourGuideAI/) and
[matched rendering study](https://paperstrange.github.io/TourGuideAI/comparison.html)
serve those exact built files from Pages commit
`28dc489c6dfca4f761feca3ac56246f704a39d1e`.

- [Browser report, conditions, built-file hashes and screenshot inventory](browser/browser-result.json)
- [Pure tests](unit-tests.tap) and [repository gates](repo-gates.json)
- [Application, art, source-evidence and driver inventory](source-manifest.json)
- [Hosted verification: all 31 files match the tested package](hosted-verification.json)
- [Intersection A/B](browser/comparison-intersection-both-en.png), [Mitsui close view](browser/comparison-mitsui-frontage-both-en.png), [Daiya close view](browser/comparison-daiya-frontage-both-en.png)
- [English opening](browser/opening-en.png) and [walked bank arrival](browser/south-bank-approach.png)
- [Sharing preview](browser/share-preview-zh.png), [fresh phone-width reader](browser/shared-recipient-zh-mobile.png), [PNG](browser/shared-recap-zh.png), [PDF](browser/shared-recap-zh.pdf)
- [Supplemental four-page PDF review inventory](pdf-review.json)
- [Full validation](../../docs/validation.md) and [art review](../../docs/art-direction.md)

Built-file manifest SHA-256:
`90f1e630c30f6094cff2ed17d6007658f156635f673c431ebf29bdefe9ec96e4`.
Browser report SHA-256:
`e2e117bcfed6b5cd59e627273f634d4a109e48cba767d04a2a624d394b7d0da0`.
Source inventory SHA-256:
`cb058e6c4588ec8fa7abe71eec14946826997482f3d7590a1aa7b5bcaca4ab94`.

The full browser run lasted 04:51:57–05:01:14 UTC in Chromium 151 with SwiftShader.
It walked all three encounters, exercised real input and clipboard, and opened the
selected recap in a fresh context. PNG and four-page PDF retain the complete
500-character Chinese test note; unchecked notes and the unsaved draft are absent.
Included notes and the localhost URL are synthetic QA artifacts, not a visitor's
account or a publicly hosted personal recap.

The three A/B views use identical geometry and camera poses. A is realtime PBR;
B is a fixed 1200×750 Cycles image at 64 samples without denoising. A reads brighter;
B gives stronger contact/recess depth but darker glazing and residual grain.
Neither establishes a photorealistic reconstruction or user art acceptance.

Software-rendered timings do not establish performance on the user's device. The
new street GLB is 14.27 MB, and the three comparison stills total 4.19 MB. Native
sharing was checked through API stubs, not an OS share sheet or actual recipient
delivery. The long-note PDF has a sparse title-only first page because encounter
blocks avoid page breaks; all content remains intact. Simplified foliage, dark
glazing, canopy glare and occasional post overlap remain visible art limits.

Historical 2026-10-05 reports and artifacts in the parent evidence folder remain
unchanged. Completion of these checks does not complete the broader SOW, a real
Kyoto field walk, full-trip/day memoirs, or human realism acceptance.

The [separate initial CI run](https://github.com/PaperStrange/TourGuideAI/actions/runs/37415711959)
passed 29 checks before its four-minute bank-walk deadline expired on a slower
software renderer. Its [failed-run log](ci-initial-timeout.log) records ongoing
movement; it is a failed run, separate from the complete 97-pass validation above.
Workflow-only commit `2006b91` raises the bounded tool allowance to ten minutes
and the job cap to thirty minutes. The
[CI rerun](https://github.com/PaperStrange/TourGuideAI/actions/runs/37416980474)
is in progress at this documentation handoff. Application, art and tested package
bytes remain unchanged; this timing allowance is not a performance acceptance.
