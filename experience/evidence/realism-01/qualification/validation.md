# Source qualification validation

6 November 2026 · R04 inspection delivery. Scope: source acquisition/decoding,
original-material browser review, landmark correspondence and road/terrain audit.
Production application modules and deployed assets remain unchanged.

## Retained browser result

[Original report](views/result.json) · [All 18 captures](views/board.md)

Chromium 151 / SwiftShader, viewport 1440 × 1000 / DPR 1. The source canvas has its
own recorded dimensions. Original GLTF materials receive neutral diagnostic
lighting. Camera anchors are explicitly provisional. Five checks pass: six sights
in three poses, native orbit changes submitted camera, all 73 source models load,
119,514 selected triangles agree with the decoded inventory, and zero page errors.
**One check fails:** the bridge-forward image has a dominant background fraction
of 0.997603, exceeding the 0.995 limit. That image and the complete failed report
remain unchanged. A successful integrity check cannot make this diagnostic pass.

## Reproduction and integrity

The [actual reproduction report](validation/reproduction.json), bound by its
[provenance manifest](validation/manifest.json), passes **83 byte-identical output
comparisons and 73 original-tile receipt checks**. The second extraction includes
all 73 GLBs, five geometry outputs, three road outputs and two landmark outputs.
Both JavaScript files pass `node --check`; `git diff --check` passes.

The [reproduction tool](../../../tools/source-qualification/verify-reproduction.py)
compares repeated extraction outputs and GLBs with the retained original run,
repeated GDAL road outputs with retained evidence, and repeated semantic joins
with the six-sight report. It also checks every acquired B3DM's original receipt.

The sprint validator checks local Markdown targets, JSON parsing, qualification
provenance and file hashes, gzip decoded identity, producer hashes, source
replacement ancestry, object/batch/triangle consistency, all 54 ordered edges,
browser pose coverage and actual failed visibility observations. It binds semantic
input identities and reparses the four retained DEM envelope prefixes.
The worktree check passes **52 qualification file hashes and 18 producer hashes**,
including all 18 captured images. Reference verification passes three retained
photographs, zero overlap with the existing authoring registry and both provider
receipt/cache identities. No physical-device or participant test was performed.

The staged-tree archive passes the same validator: **29 Markdown documents,
310 relative targets and 44 JSON documents**, with all qualification hashes and
source relationships intact. Original CityGML prefixes retain their exact CRLF,
whitespace and truncation bytes through a path-specific Git attribute. Raw caches,
browser state and generated source models are excluded from the staged tree.
Local validation reports are under
`artifacts/realism-01/validation/source-qualification/`.

```sh
PYTHONPATH=artifacts/realism-01/geometry-tools:artifacts/realism-01/inspection-tools python experience/tools/source-qualification/match-landmarks.py --root . --objects experience/evidence/realism-01/qualification/geometry/objects.geojson.gz --output artifacts/realism-01/runs/landmark-qualification-reproduction
python experience/tools/source-qualification/verify-reproduction.py --root . --output artifacts/realism-01/validation/source-qualification/reproduction.json
PYTHONPATH=artifacts/realism-01/tooling python experience/sprints/realism-01/verify.py --root .
```

Run the geometry and road reproduction commands in their respective evidence
READMEs before the comparison. Use `route-qualification-reproduction` for the
second geometry output. Browser reruns create new images/reports; preserve each
completed attempt and compare its actual outcomes separately. Native orbit is the
only interaction tested by this source viewer.

Raw 73-tile downloads, extracted GLBs, Python packages, browser temporary state,
logs and generated reruns stay under ignored `artifacts/`. The tracked evidence
and documentation are intended to verify from a staged-tree archive without
those caches. The public candidate-13 preview and its known performance failures
retain their separate identities.

## Parallel terrain, datum and splat follow-up

The [candidate status table](../../../sprints/realism-01/experiments/candidate-status.md)
separates current engineering/source evidence from Kyoto benchmark qualification.

| Executed check | Actual result |
| --- | --- |
| Full-source terrain extraction repeated | 2,042,977 source triangles; all 6,019 retained triangle records reproduce byte for byte |
| Route profile repeated | 1,434 covered samples / 54 edges; JSON and SVG reproduce byte for byte |
| Explicit vertical models | 12 GDAL/PROJ grid checks and 2,868 local-frame checks pass |
| Local splat compatibility | Six engineering checks pass; zero page errors; original startup failure retained |
| Splat evidence verifier | 13 file hashes and six producer hashes pass; source/sample/runtime identities agree |
| Combined worktree evidence validation | 74 qualification file hashes and 34 producer hashes pass; original bridge visibility failure retained |
| Parallel follow-up clean checkout | 33 Markdown documents, 363 relative targets and 58 JSON documents pass; splat verifier also passes from the archive |

The terrain pipeline ran in two declared Python environments: native GDAL source
parsing and pinned profile dependencies. Its full decoded source remained streamed;
only original gzip bytes and the selected route subset were retained. Software
rendering and source-profile results establish no physical-device, independent
discovery or realism/immersion acceptance. Correct splat source rendering remains
unverified because the sample has no independent reference view or orientation.
