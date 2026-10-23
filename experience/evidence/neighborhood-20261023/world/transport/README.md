# Candidate 6 transport audit

The independent [audit](transport-audit.json) passed on 2026-10-23. Its [reproducible script](audit-transport.mjs) checks actual files, gzip decoding through zlib and the application decoder, permitted manifest changes, glTF dependencies, section limits and complete directory reproduction. No browser, rendering, network or memory benchmark was performed for this audit.

The audited neighborhood is shipped at [`experience/public/assets/neighborhoods/shijo-east/`](../../../../public/assets/neighborhoods/shijo-east/). The existing [transport report](../../../../public/assets/neighborhoods/shijo-east/transport-report.json) retains the complete original inventory and per-resource accounting. The [input manifest](../../../../public/assets/neighborhoods/shijo-east/transport-input-manifest.json) retains the original descriptor bytes. These public files are linked here without duplicate copies.

| Identity | SHA-256 |
| --- | --- |
| Candidate 6 application package, 445 files | `ca4b3c95bc2a6b94ad2cc978a083d1e3c3c109d65febce326a5e16e937dc271b` |
| Original neighborhood manifest | `90c0873c5e540147630c970d4a2ea692c1583b3c407c175a2659d4e1e93934c8` |
| Packaged neighborhood manifest | `deb00b97ca3e29e314a13225678c7e6827de59a0f8ff68d5d3bdccc7d3563458` |
| Packaging producer | `28f183454199911ba85a77fd2c961600464b3c6d1a153e43c3f2da99e80539dd` |
| Public transport report | `6ce2e9265dea4034c5715f859ee9a17f14efa492d4af8accfa805df39aafcc1f` |
| Independent audit | `12566451aec9cc954be7548b0b831987026f692874dc29f9a280b0adb3b1501b` |
| Independent audit script | `907aacc162c7c2c56bd6f8bd07a91085c7b3ab6907c480fad2152ac6132e15ed` |

The application package identity is recorded by the build owner in `artifacts/neighborhood-20261023/candidate-6-identity.json`. It includes this neighborhood's manifest and transport report. The independent transport audit covers the 346-file neighborhood directory; application-wide browser acceptance belongs to the candidate 6 QA evidence.

All 199 original files other than the manifest remain byte-identical. All 346 output files, including the report, match the independent reproduction. The 144 added gzip resources and four retained river gzip resources decode to their declared originals. Geometry, material, source, provenance and optimizer bytes remain unchanged. Manifest differences are limited to resource transport descriptors, `transferGeometryBytes` and `transportPackaging`.

All 74 sections pass their published 2 MiB transfer limits. The producer also recognizes the previously approved Mitsui NEAR-only 3.5 MiB ceiling; its actual compressed geometry is 1,024,500 bytes. Required initial 3D transfer is **3,030,351 bytes in daylight** and **3,023,115 bytes at night**, below 4,194,304 bytes. These totals include the manifest, resident ground/context, opening BASE, deduplicated dependencies, lighting, selected HDR and traveller. Page JavaScript, CSS, fonts, deferred sections and HTTP framing remain separate. Decoded file bytes and runtime residency accounting remain unchanged; GPU allocation and frame timing require their own measurements.

Run from the repository root with Node `v24.19.0` and zlib `1.3.2.1-motley-3246f1b`, using an absent or empty repeat directory:

```bash
node experience/art/package_neighborhood_transport.mjs \
  --input artifacts/neighborhood-20261023/candidate-5/assets/neighborhoods/shijo-east \
  --output artifacts/neighborhood-20261023/world/transport-repeat-final \
  --report transport-report.json \
  --startup-cell cell-e000-n000

node experience/evidence/neighborhood-20261023/world/transport/audit-transport.mjs \
  artifacts/neighborhood-20261023/candidate-5/assets/neighborhoods/shijo-east \
  artifacts/neighborhood-20261023/art/transport-only-verified \
  artifacts/neighborhood-20261023/world/transport-repeat-final \
  artifacts/neighborhood-20261023/world/transport-audit.json
```

The executed input/output/repeat snapshots are ignored artifacts. Reproduction requires those snapshots, or equivalent directories restored from the public transport report's `originalInventory`: copy each original resource, restore `manifest.json` from `transport-input-manifest.json`, and verify every listed hash. The original traveller is also required at `../../../models/traveller.glb` relative to the input neighborhood. The published output directory can replace `transport-only-verified` in the audit command. Output paths recorded in a regenerated audit will reflect those chosen directories.

The copied `startup-audit.json` records the original manifest identity. The public `transport-report.json` and this independent audit record the packaged manifest identity. Deterministic reproduction was measured with the tool versions above; cross-version gzip byte identity was not tested.
