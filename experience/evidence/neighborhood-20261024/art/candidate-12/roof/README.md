# Candidate12 Nishiki roof review

The two actual browser views support a bounded improvement in the colored ridge's daylight readability. The visible red underside is independently identified as source139, `osm:way:772134672`, with material `nishiki-ridge-red`. This disposition applies to the pictured roof, adjoining soffits and street. Source201/274 facade appearance and whole-route realism remain separate review items.

## Actual image observations

| View | Observed result |
| --- | --- |
| [Day](arcade-below-roof-day-canvas.png) | The red, yellow and green longitudinal panels are clearly distinguishable. Gray soffits and repeated frames continue to define the covered street; facade recesses, paving and the complete actor remain readable. |
| [Night](arcade-below-roof-night-canvas.png) | The colored ridge remains identifiable alongside visible downlight bodies and warm pavement pools. The actor and route remain readable. This pair shows no new conspicuous panel glow or broken shadow edge. |

The retained `nishiki-arcade-2025` reference shows bright colored central roof panels, broad gray soffits and small downlights. The reference is bound in the [production ledger and proof](../../candidate-12-production/README.md); its original SHA256 is `88b3befbe6bf974f3e44a71700c67d90388b46c6d0003a2db52debcb17a670d9`. The dated photograph supports these visual cues. The current opaque sheet response, hue and optical coefficients remain authored approximations; local sky visibility and measured transmission are unverified.

The historical [candidate2 day](../../../../neighborhood-20261023/art/candidate-2/arcade-below-roof-day-canvas.png) and [night](../../../../neighborhood-20261023/art/candidate-2/arcade-below-roof-night-canvas.png) views were also inspected. They belong to package `f27fbe22db95a007010d2d46a661f27752a2361f5d9d84aaa4e4588c498e0dc5`. Their projection matrices match; maximum camera-position/matrix component difference is `0.000000827635`. They provide a comparable historical composition. Several material and runtime changes separate those packages, so the observed improvement is assessed as their combined appearance. The independent candidate12-versus11 export audit separately establishes exact source139 geometry and entrance-trim preservation.

## Source and renderer evidence

The [geometry classification](../../../qa/candidate-12-roof/geometry/README.md) confirms the actual downward-facing red panel at normalized canvas coordinate `(0.535874066, 0.145549107)`: face55 of `cell-e002-n001_near_Canopy_nishiki-ridge-red`, world position `[298.819966634, 4.938333352, -140.000473022]`, normal `[0, -0.722999818, 0.690848220]`. The incident-side geometry ray is unblocked after the exported45mm pairing and actual light bias. Both modes contain26 geometrically exposed samples and0 occluded samples. This classification establishes source and face identity; external-building-shadow pixel response remains unobserved.

The finalized browser report passes20/20 checks with no console/page shader errors. Both cached-shadow primary frames draw83 calls and85,731 triangles, within the120/200,000 limits. Shadow-update counters remain unchanged during those specific measurements. Two unload/return cycles settle at the same95 geometries and40 textures. These counters retain their measured browser scope and provide no physical-GPU latency conclusion.

## Reproducible bindings

- Tested application package: `e86aa1c715fb76cd111feae41a0383ee34005aefd64fe5c48eba7615676e5733`.
- Scene manifest: `86e4f424a36cb858c16f6e282ad8ceb8f146d6b285d482de3c0ce2fe2f726b61`.
- Browser report decoded SHA256: `dde090dbbff0bf35aa41d3beb25884f153a3050443714f0d6ae61d9936660134`; driver: `71032b2ea1e55444c8736ba043476cf4086d7ef75d1665e225b26811e969eeb3`.
- Day PNG: `80f40dd3b7ce8990e6cbf6d32c1f3cf1b1aacb0f156a5d5156ea1d16e587bf64`,555,692B.
- Night PNG: `a3ccc1bd14dd9597328c1067c27709898b48ad1f2deae44192997e732236b7f9`,667,986B.

[reviewed-captures.json](reviewed-captures.json) retains the original source paths, exact camera/layout/lighting state, image identities and cached-shadow checks. QA owns the [complete report and driver](../../../qa/candidate-12-roof/). These1,223,678B of PNGs were copied unchanged; no image transformation or new browser render was performed for this record.

The current geometry still simplifies the reference's panel construction and adjacent shop fronts. Other roof sections, source201/274 upper elevations, complete route recognition and human realism are outside this two-view acceptance.
