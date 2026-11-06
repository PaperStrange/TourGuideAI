# Benchmark implementation validation · 6 November 2026

The recovered worktree contains the Benchmark V1 protocol, strict manifest/result
schemas, technical gate evaluator, actual submitted-frame instrumentation, retained
diagnostic outputs and source acquisition index. No new route assets or public
preview were released.

| Check | Actual result | Evidence boundary |
| --- | --- | --- |
| Application tests | 230 passed before final evaluator review | Includes six captured-frame regression tests, historical calibration and draft benchmark rejection |
| Final benchmark tests | 16 passed, no skips | Six measurement, eight benchmark and two calibration tests; includes three added after the complete app run |
| Repository gates | 17 passed, no skips | Required repository checks; loopback and subprocess permission enabled |
| Neighborhood geography | 13 passed | Retained geographic sources and connected route |
| Geographic preparation | 18 passed | Original workbench checks with declared osm2geojson dependencies |
| Production build | Passed | Completed before the retained browser run; existing large-chunk warning remains |
| Actual browser diagnostic | 12 passed / 11 failed | [Report and hashes](measurement/README.md); starting segment, Chromium/SwiftShader, EN/day |
| Historical calibration | 17 original files verified; original failures preserved | [Scorecard](benchmark/scorecard.md) and [JSON](benchmark/calibration.json) |
| Original source samples | Five passed byte/attribute/texture verification | [Original-byte validation](sources/original-byte-validation.json) |
| Source acquisition index | Reproduced JSON and SVG exactly | [All 54 edges](sources/README.md); every appearance/ground/lighting qualification remains unverified |
| Portable evidence | [Validator output](validation-result.json) | Relative links, provenance, source hashes, compressed/decoded diagnostic hashes and route continuity |
| Clean checkout | 19 Markdown documents / 221 relative links; all declared hashes passed | Fresh staged-tree archive, without ignored downloads or browser profiles |
| Git exclusions | Raw downloads, browser profiles and generated-run paths ignored | Existing `artifacts/` rule; only reviewed evidence enters the commit |

The reviewed evaluator requires a frozen action inventory, retains missing
dispatched/response observations, verifies matching renderer comparison inputs,
and checks the frozen rotated run order. These checks use the retained actual
20-action browser diagnostic for input validation. No full-route result was
created from that starting-segment diagnostic.

The initial app and repository checks encountered sandbox restrictions on local
listening sockets and child processes. The same checks completed with the required
permission. Logs remain under ignored
`artifacts/realism-01/validation/recovery-20261106/`. The remote-turn interruption
left the worktree and completed browser evidence intact.

Reproduce from the repository root after installing the declared dependencies:

```sh
node --test --test-isolation=none --test-reporter=spec experience/tests/measurement-boundaries.test.mjs experience/tests/realism-calibration.test.mjs experience/tests/realism-benchmark.test.mjs
node experience/tools/realism-calibration.mjs artifacts/realism-01/runs/calibration-review
node experience/tools/realism-benchmark.mjs experience/sprints/realism-01/benchmark-manifest.json
PYTHONPATH=artifacts/realism-01/tooling python experience/sprints/realism-01/verify.py --root .
```

The benchmark command intentionally exits **2** with `unverified`: the draft has
no qualified comparison candidates or physical-device reports. Successful schema,
calibration and unit checks cannot close those missing observations. The current
browser diagnostic also retains failing loading, input, frame and hidden-state
checks. Physical-device acceptance, independent discovery, realistic appearance
and final selection remain open.
