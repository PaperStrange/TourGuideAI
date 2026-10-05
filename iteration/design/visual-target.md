# First playable visual target · Shijo

Owner: `art_ux`. Updated 2026-10-05. Status: integrated art inspected in the production browser build;
user visual acceptance and fresh-player comprehension remain pending.

The opening is a warm afternoon architectural diorama of the selected Shijo block: pale stone,
layered green-blue glazing, precise paving and kerbs, a recognizable crossing, restrained Japanese
building identities, and a straw-hatted traveller. The modern commercial setting is deliberate;
there are no invented temples, traditional shop names or tourist scenery.

`iteration/game/src/render-world.js` is original procedural Canvas artwork. Geometry and named
targets come through the shared scene/content contract. Window layouts, materials, vegetation,
lamps, sunlight and character appearance are authored visual treatment, not measured facade facts.
The southern building uses a shallow cutaway so its pavement and placeholder interactions remain
readable. Stripes and lane treatment communicate road texture; they are not verified traffic guidance.

The art contains no downloaded texture or third-party character asset. No generated image is shipped.
Japanese identities are sourced content; no commercial logo artwork is reproduced.

Acceptance requires the corresponding live scene, not this description: match the detailed target
in the actual-size opening, approach, interaction and visit-card states; retain player visibility,
coherent depth and steady camera motion in both complete English and Chinese UI suites. Runtime
screenshots, interaction evidence, QA findings and user acceptance are recorded separately.

## Implemented review proposal

The current opening and interaction frames are the proposed visual target **as implemented**.
There is no earlier user-approved concept image against which to claim a match. The accepted
product direction is detailed stylized 2.5D; these frames make that direction reviewable.

Inspected artifact: `iteration/game/dist/index.html`, SHA-256
`237ce97bd3d9ff25b3b0667e75aafd7038fda70264c81d5f7b480af0b80902bc`.
Art/UX opened all seven final captures supplied by QA on 2026-10-05. The unchanged copies live in
`.dsh/artifacts/evidence/first-playable/`; these are review artifacts, not runtime dependencies.

| State | Exact capture | Observed result |
|---|---|---|
| English opening, 1440×1000 | [Opening](../../.dsh/artifacts/evidence/first-playable/first-playable-initial.png) | Traveller, crossing, north/south frontage identities and first objective are visible together; glazing, stone joints, kerbs, tactile paving, plants and cast shadows replace the old abstract markers |
| Chinese opening, 1440×1000 | [Chinese opening](../../.dsh/artifacts/evidence/first-playable/first-playable-zh-initial.png) | Equivalent scene and objective hierarchy; Chinese controls and Japanese world names render without missing glyphs |
| English opening, 1280×720 | [Compact English](../../.dsh/artifacts/evidence/first-playable/first-playable-en-1280x720.png) | World fills the scene width; player/crossing/nameplates remain visible; sidebar, controls and export fit without footer overlap |
| Chinese opening, 1280×720 | [Compact Chinese](../../.dsh/artifacts/evidence/first-playable/first-playable-zh-1280x720.png) | The same composition remains usable; objective wraps cleanly; no earlier blank right-hand stripe remains |
| Approach beside facade | [Facade approach](../../.dsh/artifacts/evidence/first-playable/first-playable-at-facade.png) | Foreground foliage becomes translucent over the traveller, whose hat/body/grounding ring remain findable; the source-backed building label stays attached to its frontage |
| English visit card | [English card](../../.dsh/artifacts/evidence/first-playable/first-playable-en-card.png) | Title, concise discovery, two choices, language switch, close and source disclosure are visible; choice arrows render correctly |
| Chinese visit card | [Chinese card](../../.dsh/artifacts/evidence/first-playable/first-playable-zh-card.png) | Equivalent choice meanings and controls, clean line breaks and glyphs; no debug IDs or source-enum clutter in the main experience |

## Revisions made from actual browser evidence

- Replaced full-width generic building envelopes with the recorded facade extents; recomposed the spawn
  near the crossing so the first view includes the real named frontages without inventing extensions.
- Separated authored road presentation from mapped crossing endpoints, which are sidewalk centrelines.
- Added existing authored doorway positions, layered material details, a walking traveller and baseline-sorted
  furniture; softened foreground foliage when it would hide the player. The southern building remains an explicit cutaway.
- Art review caught the resized canvas leaving a blank strip at 1280 pixels. Engineering corrected the
  renderer scale mode; final captures show full-width drawing. Root corrected compact layout and missing UI glyphs.
- Added the bundled CJK font as a canvas fallback; initialization waits for it before caching facade lettering.
  Reduced-motion input disables the renderer's marker pulse and walking bob; camera handling is engine-owned.

## Acceptance limits

These observations establish that the detailed artwork and bilingual layouts are implemented and visible
in the cited build. They do not establish user approval, a fresh player's 30-second comprehension result,
fun, surveyed facade appearance or a real-world route trial. Static captures cannot alone establish fluid
movement; QA's separate input/replay/browser evidence and an actual human play session cover that question.
Upper north storeys are intentionally cropped in the compact composition. Materials, planting, lighting,
character proportions and the south cutaway remain authored visual abstractions, not a photographic reconstruction.
