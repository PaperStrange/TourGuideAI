# River context preparation

The separate input extends the displayed Kamo shoreline and surrounding city beyond the retained route scene. Its **29 surface records, 4,019 complete LOD1 building footprints and 136 bank segments** attach to `cell-e010-n000`. Canonical geography, navigation and the existing display remain unchanged. The source data comes from the already captured Kyoto FileGDB and complete retained OSM water geometries.

[river-context-audit.json](river-context-audit.json) independently verifies all selected building IDs, complete source solids, Z ranges, ≤1 mm footprint presentation precision, triangles/holes, float32 validity, source bank boundaries and camera coverage. Two actual preparations are byte-identical. The [source ledger](river-context-sources/ledger.json) retains acquisition/extraction dates, original archive/query hashes, rights and the complete selected solids in a **1,214,916-byte gzip GeoJSON**. A fresh selection from the 5,827-record GDAL query reproduces that compressed snapshot byte-for-byte.

| Artifact | SHA256 |
|---|---|
| Ignored `river-context.json` | `57ae1683df42b8220591708cc9b01d71573da697fdf0290744aba44c41fc0006` |
| Independent audit | `af50da08405c14c4e8e79dd1d69ace2f5f1072564c509e38f4c82ebd2aa5aa2f` |
| Preparation script | `4208d4034678ed022a45f99a23a1a7d3bc03bd0a1036c0ef82f368af63ce4201` |
| Selected official source gzip | `314ff3d835c487332c3d5b81d58b77d011ff969d347bb835602e7d8063d76462` |

The display extent buffers actual route positions inside the bridge cell's **230 m retention region** by **500 m**. The independent audit includes the complete connecting route and the Takase, Pontochō and bridge pauses, a **55 m orbit**, independently bounded **±40 m** target axes, **48° vertical FOV**, and desktop aspect **≤2.0**. It accounts for fog's view-space depth and frustum corners. Minimum conservative outer-boundary view-depth is **275.463 m**, beyond the current **270 m** fog endpoint. Wider viewport aspects or changed camera/residency limits require another coverage review.

New land is an authored flat background at **−0.04 m**, including beneath new building bases at **0 m**. Water remains **−2.5 m**. Area shorelines retain source geometry; bank faces use those boundaries with authored vertical levels. Existing mapped road continuations retain their source or authored-width classification. Building heights retain the original solid Z-range meaning. Context terrain, facade detail, entrances and current access remain unmeasured or unreviewed.

The actual overlap with frozen display is **0 m²**. Mutual new-surface overlap is **3.10 × 10⁻⁸ m²**. Eight triangles collapse after actual float32 conversion; their omitted area is **4.3164 × 10⁻⁵ m²**, and maximum cleanup boundary change is **0.035 mm**. The input explicitly limits existing/mutual overlap to **10⁻⁵ m²** and aggregate coverage difference to **0.001 m²**. These limits apply to this separate context display. Source and walking-surface conservation retain their existing checks.

Prepared counts are **2,847 surface triangles**, **22,805 building-roof triangles**, and an estimated **61,630 plain wall triangles** before art-specific geometry. The art export must measure the ordinary **2 MiB per-section** limit and startup metadata budget. Full source tables remain deferred; these preparation results do not establish encoded size, browser appearance or runtime performance.

## Reproduce from portable source

Use the Python dependencies and ignored `art-selection.json` reproduction documented in [README.md](README.md). Run from the repository root:

```bash
export TMPDIR="$PWD/artifacts/tmp"
export PYTHONPATH="$PWD/artifacts/site-tools-python:$PWD/artifacts/neighborhood-20261021/world/python"
python3 experience/content-tools/prepare-river-context.py --scene experience/src/neighborhoods/shijo-east/scene.json --geography experience/src/neighborhoods/shijo-east/geography.json --prepared-art artifacts/neighborhood-20261023/world/art-selection.json --official experience/evidence/neighborhood-20261023/world/river-context-sources/kyoto-lod1.geojson.gz --output artifacts/neighborhood-20261023/world/river-context.json
python3 experience/content-tools/prepare-river-context.py --scene experience/src/neighborhoods/shijo-east/scene.json --geography experience/src/neighborhoods/shijo-east/geography.json --prepared-art artifacts/neighborhood-20261023/world/art-selection.json --official experience/evidence/neighborhood-20261023/world/river-context-sources/kyoto-lod1.geojson.gz --output artifacts/neighborhood-20261023/world/repeat/river-context.json
python3 experience/evidence/neighborhood-20261023/world/audit-river-context.py --input artifacts/neighborhood-20261023/world/river-context.json --repeat artifacts/neighborhood-20261023/world/repeat/river-context.json --output artifacts/neighborhood-20261023/world/repeat/river-context-audit.json
```

## Repeat the original bounded selection

This requires the retained official archive/FileGDB. Use fresh ignored destinations for GDAL output. No network acquisition is needed:

```bash
ogr2ogr -f GeoJSON artifacts/neighborhood-20261023/world/kyoto-lod1-river-query.geojson artifacts/neighborhood-20261021/world/raw/kyoto-21422/bldg_LOD1_R7_公開用.gdb 建物LOD1_R7 -spat 135.76266904790313 34.99931856516312 135.77700572946156 35.00856887291362 -spat_srs EPSG:4326 -t_srs EPSG:4326 -select 'gml_id,作成日,計測高さ,計測高さ_単位,地上階数,地下階数,建築年,用途,構造種別,調査年,建物ID,LOD1幾何オブジェクト原典資料,主題属性,名称'
python3 experience/content-tools/prepare-river-context.py --scene experience/src/neighborhoods/shijo-east/scene.json --geography experience/src/neighborhoods/shijo-east/geography.json --prepared-art artifacts/neighborhood-20261023/world/art-selection.json --official artifacts/neighborhood-20261023/world/kyoto-lod1-river-query.geojson --selected-source artifacts/neighborhood-20261023/world/repeat/selected-source.geojson.gz --output artifacts/neighborhood-20261023/world/repeat/source-selection.json
cmp experience/evidence/neighborhood-20261023/world/river-context-sources/kyoto-lod1.geojson.gz artifacts/neighborhood-20261023/world/repeat/selected-source.geojson.gz
```
