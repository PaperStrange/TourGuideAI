# Geographic context workbench evidence · 2026-10-21

These are internal production previews of Delft Markt and Helsinki Senate Square. Actual retained OpenStreetMap data supplies feature identity and geographic geometry. The generated buildings show maximum-height massing with authored neutral windows, rims and PBR finishes. Landmark roof/body structure, facade design, terrain, entrances, public access, collision and walking navigation require review before either area can become a detailed interactive pack.

The frozen inputs pass the [18 independent source tests](site-tests.txt). The [actual model audit](model-audit.json) passes Three.js GLTFLoader parsing, per-vertex source identity, source metadata, coordinate/height mapping, projected roof area, manifest hashes and export budgets. Separate CPU Blender exports produce byte-identical runtime GLBs. These checks establish data and export consistency.

The final [browser walkthrough](browser/site-workbench-result.json) passes **36/36** checks with actual source picking, camera controls, EN/ZH, day/night, phone touch, bounded resources, hidden work and failed-load recovery. [HTTP checks](http-result.json) pass **40/40** on the real output sets. [Eight matched visual pairs](shadows/README.md) accept the shadow correction for geographic-context review; viewer SHA-256 is `75e0ed4e4751a773e5caa5dd44738efd0452b3581c63d9ee523edb107f18fab9`. Faint Helsinki foreground modulation remains P2. These checks establish no landmark fidelity, current access or human realism acceptance.

| Site | GLB bytes | Triangles | Material batches | Buildings | Rendered courtyard rings | GLB SHA-256 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Delft Markt | 844,128 | 11,135 | 10 | 84 | 0 | `b9a63090d9ab6a2335c214b8361519abf9c97ef0dfd33ca1e0fe6b78a08b23e9` |
| Helsinki Senate Square | 928,416 | 12,557 | 11 | 17 | 2 | `e0a7da09e662c8b32ca577e6da5868bbfeadc904e776aefec28cb5f1bf4534d9` |

Each export is below the configured 8 MiB, 100,000-triangle and 128-batch limits. Maximum observed roof-coordinate differences after float32 GLB conversion are 0.000003785 m for Delft and 0.000007569 m for Helsinki. Shared material meshes expose `_SOURCE_INDEX`, read as `_source_index` by Three.js; this indexes `manifest.features`. Authored ground has index `-1`. Source metadata roots retain the original OSM identifiers, versions, timestamps and tags.

**Retained evidence.** [Delft manifest](delft-manifest.json), [Delft review](delft-review.json), [Helsinki manifest](helsinki-manifest.json), and [Helsinki review](helsinki-review.json) are unchanged copies of the reviewed output files. Full GLBs, editable Blender files, prepared contexts and repeat-export logs remain in ignored `artifacts/site-workbench/` and `artifacts/site-workbench-repeat/`; this portable evidence directory contains no Blender binaries. The audit records both original and repeated editable-file hashes. `.blend` bytes differ across the separate Blender executions; the runtime GLB bytes and every manifest field outside the editable-file record match exactly.

**Source and extent.** The captured [Delft OSM XML](../research/delft-markt.osm) has SHA-256 `69e5fb1b52dd50d95a1ac9c2fa59616bb668ed7db46d9bfcb8e93dd23f607b7e`; the [Helsinki OSM XML](../research/helsinki-senate.osm) has SHA-256 `ca1efe4230b3022f9df213d05dfae50a1454dd1662c016faae22dba1b6644424`. Both were retrieved on 2026-10-21 and retain © OpenStreetMap contributors / ODbL-1.0 provenance. Query URLs, UTC retrieval times and source hashes remain in every manifest. Delft display bounds are `[4.357, 52.0108, 4.3595, 52.0121]`. Helsinki display bounds are `[24.9516, 60.1681, 24.9558, 60.1707]`, using retained complete feature geometry; its original query bounds remain `[24.9518, 60.1681, 24.9548, 60.1704]`. The expanded display frame does not establish complete source coverage outside the original query.

Prepared display geometry uses a declared 1 mm precision. Original source and projected geometry are preserved separately. Source tests check display error bounds, triangle coverage, hole preservation, disjoint surfaces, incomplete relations and invalid input rejection. Flat ground, missing heights/widths, window arrangement and material appearance retain explicit authored or unreviewed classifications.

**Reproduction.** Run from the repository root with the checked GIS dependencies in `artifacts/site-tools-python` and Blender 4.3.2. Preparation writes a chosen output directory; use a fresh directory when retaining previous evidence.

```sh
PYTHONPATH=artifacts/site-tools-python python3 experience/content-tools/prepare-site.py --site experience/content/sites/delft-markt.json --output artifacts/site-workbench/delft
PYTHONPATH=artifacts/site-tools-python python3 experience/content-tools/prepare-site.py --site experience/content/sites/helsinki-senate.json --output artifacts/site-workbench/helsinki
PYTHONPATH=artifacts/site-tools-python python3 experience/tests/site-workbench-test.py
TMPDIR=/workspace/TourGuideAI/artifacts/tmp blender --background --factory-startup --threads 2 --python-exit-code 1 --python experience/art/build_site_context.py -- --context artifacts/site-workbench/delft/context.json --output-dir artifacts/site-workbench-repeat/delft
TMPDIR=/workspace/TourGuideAI/artifacts/tmp blender --background --factory-startup --threads 2 --python-exit-code 1 --python experience/art/build_site_context.py -- --context artifacts/site-workbench/helsinki/context.json --output-dir artifacts/site-workbench-repeat/helsinki
node experience/evidence/global-sites-20261021/workbench/audit-site-models.mjs . artifacts/site-workbench-repeat/model-audit.json
```

The checked original exports use the same Blender commands with `--output-dir artifacts/site-workbench/delft` and `--output-dir artifacts/site-workbench/helsinki`. The [audit script](audit-site-models.mjs) binds the two frozen GLB hashes and compares original and repeated outputs. The source test log has SHA-256 `412aacfec3f21859bdfa2cee49e990bef8bc6a9b84ad83cfc28f83987ad14273`, with preparation script `5fc136bd4e50402963de83e8d80aafa0c1c5603843a1d8cdd7ca82a4872d7f04` and test script `427bbe165b9db983416061e357d7057bd1b367d119a56fafc57b4a13538ffde3`. The exporter SHA-256 is recorded in both manifests and in the model audit.
