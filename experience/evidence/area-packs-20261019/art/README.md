# Ginza/Wako art review · 2026-10-19

## Reviewed live output

The four opening images were captured from the actual browser after the selected HDR reached `ready` and the scene rendered. Desktop viewport: 1440 × 1000, English; phone viewport: 390 × 844, Chinese. Reduced motion was enabled. The desktop images include the full page; the phone images capture the viewport after scrolling to the scene.

- [Desktop daylight](openings/ginza-opening-desktop-en-day.png)
- [Desktop night](openings/ginza-opening-desktop-en-night.png)
- [Phone daylight](openings/ginza-opening-phone-zh-day.png)
- [Phone night](openings/ginza-opening-phone-zh-night.png)
- [Exact browser report, poses, matrices and image hashes](openings/packs-result.json)

The opening report records 11/11 passing asset, readiness, pose and layout checks. Its tested local package manifest SHA256 is `076c29d858eeb3d8e0fa1e7653f30011d711c08d4538319843a47a1eca98a2e7`. These assertions establish which output was reviewed; visual judgment is recorded separately below.

The lead accepted this bounded pack's corrected art presentation for continued delivery. User judgment of recognizability and realism remains open. The corrected phone continuity evidence below uses the same tested local package and model. Publication is outside the scope of these captures.

## Observations from the four frames

1. The complete clock tower, crown and lightning rod fit both viewport shapes. The camera remains below the building's roof, so the rounded corner and two street-facing wings dominate the view. The six arched upper corner openings, narrow rectangular middle openings, upper cornice and lower ornamental belt are identifiable.
2. The intermediate floors read as continuous stone piers with recessed glazing. Restrained sill projection and continuous stone mapping keep the major cornices visually distinct. The upper granite and lower polished stone/glazing regions have different responses, although the opening scale limits inspection of small surface details.
3. The pavement and facade apron are visible in daylight and night. The yellow-clothed actor is discernible near the left pavement in all four openings. The phone's walking guidance is outside the canvas. The opening prioritizes the whole building, leaving the actor small; closer walking and inspection need their own evidence.
4. Night has a readable clock face, warm central facade illumination and separate pavement light pools. The stone remains visible outside the brightest wash. A central vertical wash and pronounced local shadow edges remain visible authored choices.

Remaining limits are explicit: the dark road and two unlabelled background masses give the scene a bounded architectural-study character. Glass is opaque reflective PBR with authored depth cues. Rear elevations, tower placement within the mapped corner, storey divisions, ornamental simplification and lighting placement remain authored. This release makes no measured reconstruction, interior, doorway-access or current-opening claim.

## Moving phone views

The [phone continuity report](movement/packs-result.json) records 17/17 passing checks. Actual pavement taps moved the actor through the bend and onward to the second frontage. The report retains per-target progress and grounding evidence in `observations.groundClicks`, plus screenshot poses and resource hashes.

- [At the corner](movement/phone-ginza-sidewalk-node-2.png): actor near `(-0.005, 0.021)`; rounded facade, upper window hierarchy and grounded actor remain visible.
- [Past the corner](movement/phone-ginza-sidewalk-node-3.png): actor near `(8.496, 2.215)`; the facade shifts laterally and the corner's curvature is visible from the changed position.
- [At the second frontage endpoint](movement/phone-ginza-sidewalk-node-4.png): actor near `(19.628, 14.850)`; pavement and actor remain visible, while most of Wako lies beyond the left frame edge.
- [English interaction state](movement/ginza-en-phone.png) and [Chinese night state](movement/ginza-zh-phone.png): guidance and actions remain visible below the canvas; the endpoint composition still emphasizes the authored background mass.

All three route images preserve the opening camera offset, angle and distance while following the player's changing position. This provides visible travel continuity and also explains the endpoint framing limit. Manual orbit, pinch, inspection-close, Reset and resumed walking passed behaviorally. This report did not capture the transient closer inspection pose. The scheduled final review will add a user-framed second-wing detail image; these images alone establish no close-detail visual judgment.

## Source and asset identity

| Item | SHA256 |
| --- | --- |
| `scene.glb` | `70870bc6603a93067356674bd3674caf191d96d0c425b6c30d53003808023f56` |
| `lighting.json` | `be44dd796f7933b8855c54fa36a75aa98b51f1176e425af94afecc2f159e639d` |
| `materials.json` | `989f8a236a56d245f2999323785a6c740625e585bb713bcf4c1e7eb92d8242c2` |
| Pack manifest | `982a3c995d903468fb666c5aeb424d5703e2a7d1fac153ffdee3f5ada718604e` |
| Canonical and copied source JSON | `6e583689dc460e4a9c496838c44f57925bb8dc4b546338e4ff58f6967eddf674` |
| `build_ginza.py` | `41f43ddc9f29fdfa386e04af3ac48622099eca0891cc32d0110081d8288ed03d` |

The [asset manifest](../../../public/packs/ginza-wako/manifest.json) binds the generated files; [export provenance](../../../public/packs/ginza-wako/provenance.json) records source references and authored decisions. The provenance status describes export time. This review records the subsequent actual-browser observations without changing exported asset bytes.

Source axes are east/north/height in metres, mapped to glTF east/height/negative-north. The origin is OSM node 2135828626 at latitude 35.6714369, longitude 139.7650181. The closed Wako footprint and connected sidewalk centreline come from the retained OSM data. The 55.281851 m centreline has an authored 4 m level corridor; actor radius is 0.32 m and allowed centre radius is 1.68 m. The walkable surface top is 0 m. Pavement between the corridor and facade is visual context.

Operator specifications support the 30.30 m roof, 9.09 m clock-tower rise, 39.39 m tower top, 8 m lightning rod and 2.4 m clock dial. They also distinguish polished Mannari-ishi on the first two floors from tapped Mikage-ishi granite above. The retained OSM 28 m height tag remains recorded as a source conflict. Individual window dimensions and stone maps are authored.

Two inspected licensed references guide the original geometry: Supanut Arunoprayote's `Ginza Wako 20241021.jpg` (CC BY 4.0) and 先従隗始's `SEIKO HOUSE GINZA 20221216.jpg` (CC0 1.0). Exact pages, file hashes and review limitations are in [the public source record](../../../public/packs/ginza-wako/source.json). Photograph pixels are excluded from the runtime maps.

## Opening camera and illumination

The captured view uses player coordinates `(-13.728, 12.434)`, azimuth `0.05`, polar angle `1.49`, distance `64`, and target offset `{x:13.7, y:0, height:24.5}`. Wako uses a 48° vertical field of view. Actual Three camera position is approximately `(3.160232, 29.665341, 51.277494)`, looking toward `(-0.028, 24.5, -12.434)`. Both modes retain this pose.

The pack uses the shared local day/night HDR files, with hashes `d0b515b6741e44ceaa7dc2e42a64ec30f61871ae313762729c6a14f5343484f2` and `a690048dcecabf5ed1ad773f7abdec7cce7b1fea4d89b17f054a18f3e0fa2919`. Their panoramas illuminate surfaces and reflections. The rendered background is authored. Night uses three shadow-casting pavement spots plus two facade/tower washes, with pack-specific environment, fill and emissive values recorded in `lighting.json`.

## Production work and measured budget

The editable scene was generated with Blender 4.3.2 from canonical source JSON. Production work includes source-footprint massing, two straight wings and the sampled rounded corner, physically recessed window assemblies, upper arches, cornices, clock assembly, original PBR maps, semantic inspection/occlusion groups, and the connected walking surface. Material refinements retain continuous stone piers, restrained intermediate surrounds and distinct major belts. Polygon slabs have consistently upward-facing top surfaces. Map resolution is 512² for upper granite and 256² for the other three original surface sets.

| Measurement | Actual | Approved cap |
| --- | ---: | ---: |
| Model including embedded maps | 7,970,296 bytes | 8,388,608 bytes |
| Entire pack including JSON and manifest | 8,000,958 bytes | Reported for deployment accounting |
| Triangles | 84,624 | 100,000 |
| Mesh/material batches | 48 | 64 |
| Embedded original maps | 12 | Included in the byte cap |

The generator records 107.62 seconds for its final export invocation. This is an export measurement; no authoring-hours estimate or device performance result is inferred. The shared traveller and HDR files are excluded from marginal pack bytes. The editable `.blend` remains in ignored `artifacts/ginza-art-20261019/build/`. No offline beauty image substitutes for the reviewed browser frames.

## Preserved Shijō assets

The browser report verifies the prior package's model, finish maps, HDR files and lighting bytes. The following identities remain unchanged:

| Item | SHA256 |
| --- | --- |
| Shijō model | `f4135e225f0575daca660c055a5fbdbc4ef3af31bd72736d1dbc806f07ff331c` |
| Shared traveller | `ee5307da94f4d1994e5323a0d31d6f79a255c9f2f10459e0a0e6434fb051fdb1` |
| Shared original lighting rig | `29cc4209b243e3c069f3516cd0c236c68c0bcb0cb2526aa285f2fdd15caf1766` |
| Architectural finish manifest | `5947c4fe04f6bc6ced85b4c6920e7a1f7f88cbec6ea67180133eea69d8c48813` |
| Architectural profile source | `31fa3b3afb98ef1080af202562192d9de17d8cf11ef1fb96716a1890e18454a7` |

Shijō retains its own camera settings and material/lighting policy. The Wako assets and view configuration are separate pack resources.
