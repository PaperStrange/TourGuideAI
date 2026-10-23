# Shijo-east arcade and bank preparation — 2026-10-23

The retained input contains **106 façade edges, 114 authored soffit sections (232 triangles), and 39 bank segments**. [connection-audit.json](connection-audit.json) records the independent geometry checks, eight unchanged canonical files, input/producer hashes, tool versions and byte-identical reproduction. [source-checks.txt](source-checks.txt) records **13/13** geographic source checks.

The separate [river context preparation](river-context.md) records the later bounded shoreline/city continuation, complete selected official source data, camera extent and independent audit. Its input leaves this arcade/bank input unchanged.

| Recorded artifact | SHA256 |
|---|---|
| Frozen and repeated `art-selection.json` | `082d759b38360183c70bbd37dc4317c7a8e6d20cb4e5a1a0d4afc09bfdd73b28` |
| `connection-audit.json` | `56ceeff35f985794f9660ca95d9e3ee91d578ae0c4e9a40232ada7e33dabdb51` |
| `source-checks.txt` | `36b16f46cf789687b42971764c4af1d9c671450b89fc9b2867b84e317c659b59` |
| Preparation script | `7955255aa8908f2b647839477d090c204ab82da16baf144160717e74c46b38fa` |
| Canonical `scene.json` | `2979a2e426271fe19c91114928eb27b625cbfe3f8548eef4bdaec73e45cb7e8e` |
| Canonical `geography.json` | `cb6d616d3858becf459a885ed940a6766cdd942e14a4d0b2b8a39776e3c16e55` |

Nishiki connections use a **6 m authored limit** between the mapped roof and retained building edges. The actual maximum vertex distance is **5.484965 m**. Mapped roads and transverse paths have zero area overlap with joins; the northern gap at local x = 550 m remains open. Attachments preserve source-edge direction, polygon holes and nondegenerate float32 triangles. `unjoinedLargeGaps` covers candidates reaching that producer check; it is not an inventory of all absent construction.

Kamo contributes seven mapped-area bank segments. Misosogi contributes 23 mapped-area segments. Takase contributes nine segments from its existing authored-width water corridor. Internal centerline boundaries and clipped extent caps are excluded. Every segment has water on its left. Ground **−0.04 m** and water **−2.5 m**, along with art's soffit/fascia dimensions, are authored virtual levels. The evidence establishes source correspondence and rendering-input consistency; actual construction, height, access and visual acceptance require separate review. Canonical navigation and source geometry are unchanged.

Source rights and capture dates remain in the [canonical ledger](../../../src/neighborhoods/shijo-east/source-ledger.json): OpenStreetMap contributors, ODbL 1.0; Kyoto City LOD1, CC BY 4.0. Photographic appearance references remain in the art reference ledger. No new source imagery or geographic acquisition was needed for this increment.

## Reproduction

Run from the repository root with the pinned dependencies in `experience/content-tools/shijo-east-requirements.txt`. This run used Python **3.12.14**, NumPy **2.5.4**, Shapely **2.2.0** and GEOS **3.14.1**. The existing Node toolkit supplies glTF Transform **4.5.1** and Three.js for the road-mask extractor. Intermediate JSON remains under ignored `artifacts/`; the 5.3 MB prepared input is regenerated from retained sources.

```bash
export TMPDIR="$PWD/artifacts/tmp"
export PYTHONPATH="$PWD/artifacts/site-tools-python:$PWD/artifacts/neighborhood-20261021/world/python"
node experience/content-tools/extract-shijo-road-mask.mjs --model experience/public/models/shijo-block.glb --tools artifacts/neighborhood-20261021/art/tools --output artifacts/neighborhood-20261021/world/reviewed-road-mask.json
python3 experience/content-tools/prepare-neighborhood-art.py --scene experience/src/neighborhoods/shijo-east/scene.json --geography experience/src/neighborhoods/shijo-east/geography.json --reviewed-road artifacts/neighborhood-20261021/world/reviewed-road-mask.json --output artifacts/neighborhood-20261023/world/art-selection.json
python3 experience/content-tools/prepare-neighborhood-art.py --scene experience/src/neighborhoods/shijo-east/scene.json --geography experience/src/neighborhoods/shijo-east/geography.json --reviewed-road artifacts/neighborhood-20261021/world/reviewed-road-mask.json --output artifacts/neighborhood-20261023/world/repeat/art-selection.json
python3 experience/evidence/neighborhood-20261023/world/audit-connections.py --prepared artifacts/neighborhood-20261023/world/art-selection.json --repeat artifacts/neighborhood-20261023/world/repeat/art-selection.json --output artifacts/neighborhood-20261023/world/repeat/connection-audit.json
python3 experience/tests/neighborhood-source-test.py
```

The observed preparation reused the retained road mask and generated the separate `repeat/` output. An additional extractor run into `repeat/reviewed-road-mask.json` reproduced the original mask byte-for-byte (`6a5de3121e364dd4e9fec7a7382e20986d575b24209ee82f7f7cdf905d07c18f`); `cmp` exited successfully. The extractor command above rebuilds that prerequisite when absent; its exact input hashes are included in the audit. Preserve the frozen input during active art export. [audit-connections.py](audit-connections.py) reads source data independently and fails on byte differences, changed source hashes, invalid attachment/triangle geometry or unsupported bank boundaries. The existing source suite independently checks retained OSM dependencies, official geometry and route access classifications. This evidence does not record a Blender export or browser run.
