# Guided 3D facade increment · 2026-10-05

The final packaged build passed **53/53 browser checks**, **16/16 pure tests** and
**17/17 repository integrity gates**. The browser walkthrough exercised the built
site with external requests denied. It records the three encounters, EN/ZH guidance,
world movement/picking/collision, personal notes, export, credits, legacy save
migration, restart and graphics recovery. Deliberately forced WebGL failure has
its expected diagnostic recorded separately from unexpected errors.

- [Exact browser report and built file hashes](browser/browser-result.json)
- [Repository gate report](repository-gates.json)
- [Application source and deployable-input hashes](source-manifest.json)
- [English opening](browser/opening-en.png)
- [Chinese opening](browser/opening-zh.png)
- [South-side bank approach](browser/south-bank-approach.png)
- [Detailed validation and limits](../docs/validation.md)
- [Executed-art review](../docs/art-direction.md)

Built manifest SHA-256:
`ebe2883e971a6e00cbb73cc3e171718e28d04998c3716f8c009b9ee5b292fe79`.

Chromium 151 used ANGLE Vulkan SwiftShader. These timings establish behavior on
this software-rendered executor, not target-device fluency. The bank journey took
183.091 seconds with continuous position and frame traces; do not present this as
an accepted interaction speed. Headless blur cleanup uses an explicitly injected
blur with a real held key; OS/tab switching needs a suitable manual environment.

Agent art review found no blocker in the inspected frames. Bright/seamed canopies,
small or obscured physical signage, narrow post overlap in some poses and incomplete
west context remain polish limits. User art acceptance, hardware performance and
fresh-user discovery remain open. The included exported note is synthetic QA text,
not a real visitor's account. Daily/trip memoirs and online sharing are later slices.
