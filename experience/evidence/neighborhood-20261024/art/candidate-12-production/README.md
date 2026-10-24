# Candidate12 source-bound frontage and roof materials

Producer validation and independent decoded preservation pass for manifest `86e4f424a36cb858c16f6e282ad8ceb8f146d6b285d482de3c0ce2fe2f726b61`. The [actual roof day/night review](../candidate-12/roof/README.md) accepts the bounded source139 material improvement in package `e86aa1c7…`. The [matched frontage review](../candidate-12/frontages/README.md) accepts source201's pictured lower/middle differentiation, and the [retained upper replay](../candidate-12/upper201/README.md) accepts its visible25–27m material transition. Source274 has only a cropped upper fragment reviewed. Full elevations and whole-route appearance remain outside those findings. Root owns public promotion and application integration.

## Authored scope

- Source201, municipal `bldg_3313947c-c2d9-4b7c-9692-b8a4568ec600`, polygon0/outer edge3: pale lower stone, brown tiled middle, pale upper band and stepped-head lower openings. The [source review](../../world/connector-fronts/daimaru-source-review.json) is bound at SHA256 `93bc46595c9ec5b3b42707c351670968592e13af2190da208d22760aab33945b`.
- Source274, municipal `bldg_943c9e01-9535-4980-a843-c3a80fed160b`, polygon0/outer edge2: anonymous pale horizontal bands and dark ribbon glazing. Its [approved association](../../world/connector-fronts/anonymous-west-neighbor-approved.json), SHA256 `feba0e468af8df64fb333fc8a62c311b3226807743fe8a4fc060a85bab69deac`, remains a qualified inference from the photographed adjacency and retained parcel order.
- Every original facade face intersecting below3.5m is retained completely. Existing crossing wall panels set the actual new-profile lower seams at3.836241818m for201 and3.82788m for274. Original roofs, cornices, other edges, footprints, heights and navigation remain protected. Band elevations, bay divisions, recesses and material response are authored; the reference is dated2021. Ground-passage arches, tenant identities, signs and grille placement are outside these profiles.
- Source139, `osm:way:772134672`: existing paired colored roof faces receive dedicated `nishiki-ridge-red`, `nishiki-ridge-gold` and `nishiki-ridge-green` materials. All geometry,45mm vertical pairing, UV scale, source identity and canopy groups remain preserved. Red entrance trim, soffits and lamps retain their previous materials. Mesh `thinSheet` metadata specifies a0.55 diffuse fraction and neutral transmission multiplier, with actual scene illumination supplying the runtime response. There is no emission, framebuffer transmission or local sky-visibility bake. Optical coefficients and colors remain authored. The linked two-view browser review records actual shader compilation, source/face identity, material appearance, frame budgets and unload/return counts; external-occluder pixel response remains unobserved.

The two facade materials reuse the original ceramic/glazing images through glTF base-color factors. Exported factors are `[0.4993943274,0.3046562672,0.2242484838,1]` for brown tile and `[0.3260877430,0.3963721395,0.4296338260,1]` for dark glazing. No photographic pixels or new images are included. The reference ledger retains Nryate,2021-03-14,CC BY-SA4.0 and the original photograph identity.

## Producer checks

All74 glTF containers validate with zero errors. The existing optimizer confirms exact positions, UVs and source indices;148 gzip round trips preserve decoded resource bytes. Existing shared image/HDR/rig bytes and the global source table remain unchanged. Normal/tangent warnings retain the validator's actual recorded scope.

The [independent audit](../../world/candidate12-export-audit.json), SHA256 `ccba681ffcab6f0daa807c10d7e377e5553b6b608f0790b6df8df3ba24467b17`, passes all74 sections and9,731 section/source comparisons. Every protected lower triangle, roof/cornice/other face, unrelated complete attribute/material/transform/metadata record and walkable byte array remains exact. Source139's ten section/level combinations retain their original geometry and trim; the exported opposite-normal pairing agrees with45mm within0.0000000763m. The decoded inherited frontage seams are3.836241722m/3.827879906m, reflecting the existing float32 positions.

| Changed section | BASE triangle change | NEAR triangle change | Batch change per level |
| --- | ---: | ---: | ---: |
| e001n000 / source274 | +506 | −722 | +1 |
| e002n000 / source201 | +2,142 | −2,058 | +1 |

Roof-role reassignment changes no triangle or batch count. Thirty exported roof meshes carry the source-specific metadata. Combined facade changes remain below the approved4,000 added-triangle and3 added-batch targets. Actual roof views pass the primary-frame limits at83 calls/85,731 triangles in both modes. Matched frontage primary frames also pass: source201 front76/96,918, source201 oblique61/89,308 and source274 prior60/93,629 calls/triangles in both modes.

Required3D startup transfer is3,037,665B by day and3,030,429B at night, including the manifest, resident ground/context, opening BASE, deduplicated dependencies,35,556B traveller and the selected HDR. The4MiB headroom is1,156,639B/1,163,875B. Application HTML/JS/CSS/fonts and deferred sections are separate. Gzip transfer does not reduce decoded geometry-memory accounting.

## Reproduction

Run from the repository root, with exclusive CPU access:

```sh
env TMPDIR="$PWD/artifacts/tmp" blender --background --threads 4 --python experience/art/build_neighborhood.py -- --geography experience/src/neighborhoods/shijo-east/geography.json --scene experience/src/neighborhoods/shijo-east/scene.json --prepared-art artifacts/neighborhood-20261023/world/art-selection.json --river-context artifacts/neighborhood-20261023/world/river-context.json --style experience/art/neighborhood-style.json --asset-dir artifacts/neighborhood-20261024/art/candidate-12-raw-final --output-dir artifacts/neighborhood-20261024/art/candidate-12-build-final
node experience/art/optimize_neighborhood.mjs --input artifacts/neighborhood-20261024/art/candidate-12-raw-final --output artifacts/neighborhood-20261024/art/candidate-12-optimized-final --tools artifacts/neighborhood-20261021/art/tools --retained-texture-size 256 --report artifacts/neighborhood-20261024/art/candidate-12-optimized-final/compression-report.json
node experience/art/package_neighborhood_transport.mjs --input artifacts/neighborhood-20261024/art/candidate-12-optimized-final --output artifacts/neighborhood-20261024/art/candidate-12-transport --report transport-report.json --startup-cell cell-e000-n000
```

Final provenance SHA256 is `4be84e2d9c2bbb50979ed6df2f591f61df0ad651c0e864ce6b1679b9d8fadb3c`; compression report is `1ce6611578011a92b1e2d397c4022ef897982911c1fa08352c990a89f69c1193`; transport report is `360fe8f1dc694d731d04186d49f690a2da09bf8ccf4f2cf67864f553f56cae67`.

The [source proof](candidate-12-source-proof.json), [resource audit](candidate-12-resource-audit.json) and both executed audit scripts are preserved here as50,459B of unchanged original data. [Binding.json](binding.json) records every file hash, original path, command, candidate identity and remaining limits. Restore the archived scripts to their recorded original paths to replay their unchanged path resolution. This packaging uses no compression or image transformation.

Matched native views must preserve the visible source/edge identity and disclose their pictured extent. A lower-frontage view cannot establish the upper band or complete elevation. This candidate does not establish whole-route realistic reconstruction or human realism.
