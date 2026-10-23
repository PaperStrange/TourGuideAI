# Connected neighborhood authoring

This workflow preserves a real route's geographic identity while preparing editable scenery and a bounded interactive walk. The current implementation is the **1,353.444 m Shijo-east route**, with six exterior sights and a connected street loop. Its source audit and generated geography are reproducible. Art export and runtime acceptance require their own recorded results.

## Responsibilities and reusable boundaries

| Stage | Automated work | Reviewed or authored work |
|---|---|---|
| Intake | Bounded downloads, response receipts, hashes, archive validation, GDAL conversion | Geographic extent, provider terms, capture dates, permitted reuse |
| Geography | Mature OSM conversion, projection, GEOS polygons/triangles, graph distances, footprint clearance checks | Pedestrian eligibility, crossings, areas versus centerlines, grades and unknown access |
| Content | Stable sight anchors and geographic links | Distinct sights, bilingual factual descriptions, route rationale, practical facts |
| Art preparation | Whole-building selection, 100 m canopy sections, route-facing edge selection | Licensed references, architectural recognition, facade families, canopy and ground interpretation |
| Export | Shared PBR resources, editable Blender scenes, source indices, asset hashes and size gates | Material scale, detail placement, lighting, continuous visual quality |
| Runtime acceptance | Graph tests, manifest validation, bounded streaming, saved-route tests | Actual browser traversal, visual inspection, performance evidence and product acceptance |

The OSM geometry helpers and `prepare-neighborhood-art.py` consume reusable data structures. `intake-shijo-east.py`, `review-shijo-east.py` and `prepare-shijo-east.py` contain the approved Kyoto bounds, source IDs and route choices. A new city needs a reviewed source adapter and route definition. Country names do not select architectural styles or establish pedestrian access.

## 1. Capture sources and their rights

Use the inherited network proxy and TLS trust. Set temporary files inside the ignored repository artifacts directory. Commands below run from the repository root; Python 3.12, GDAL 3.10.3 and Blender 4.3.2 were used for this route.

```bash
mkdir -p artifacts/tmp artifacts/neighborhood-20261021/world/raw
export TMPDIR="$PWD/artifacts/tmp"
python3 -m pip install --target artifacts/neighborhood-tools-python -r experience/content-tools/shijo-east-requirements.txt
export PYTHONPATH="$PWD/artifacts/neighborhood-tools-python"
python3 experience/content-tools/intake-shijo-east.py osm --output artifacts/neighborhood-20261021/world/raw
python3 experience/content-tools/intake-shijo-east.py resource --resource-id 21422 --maximum-bytes 150000000 --output artifacts/neighborhood-20261021/world/raw
```

The OSM command has a fixed reviewed bounding box. It is an authoring operation; browser users do not query the OSM editing API. Repeating acquisition captures a new revision and requires another review. Reproducing the accepted package uses the retained snapshot.

Kyoto's [LOD1_2025 building resource](https://data.city.kyoto.lg.jp/resource/?id=21422) is published by Kyoto City under **CC BY 4.0**. The captured archive is 116,298,045 bytes. Its database includes source geometry, stable `gml_id`, heights and other attributes; individual creation/survey dates remain attached. The [dataset page](https://data.city.kyoto.lg.jp/dataset/00661/) update date is not a universal capture date. The smaller inspected LOD3 transport/bridge resources cover a different extent and supply no Shijo Bridge deck geometry.

Retain URL, retrieval time, response hash, source version/date, CRS and vertical-datum information, rights, attribution, and all selected original geometry. Keep OSM-derived data under **ODbL 1.0** and municipal data under its own stated license. Operator facts can be paraphrased with citations; operator photographs require separate reuse permission. Photographic references retain their individual author, date, license and image hash. Google Street View extraction is outside this workflow.

## 2. Prepare complete geometry and an explicit route

The actual Kyoto GDAL extraction is:

```bash
ogr2ogr -f GeoJSON artifacts/neighborhood-20261021/world/kyoto-lod1-route.geojson artifacts/neighborhood-20261021/world/raw/kyoto-21422/*.gdb 建物LOD1_R7 -spat 135.7593 35.0030 135.7722 35.0057 -spat_srs EPSG:4326 -t_srs EPSG:4326 -select 'gml_id,作成日,計測高さ,計測高さ_単位,地上階数,地下階数,建築年,用途,構造種別,調査年,建物ID,LOD1幾何オブジェクト原典資料,主題属性,名称'
python3 experience/content-tools/prepare-shijo-east.py --source artifacts/neighborhood-20261021/world/raw/osm-map.json --official artifacts/neighborhood-20261021/world/kyoto-lod1-route.geojson --output experience/src/neighborhoods/shijo-east
```

Use a fresh extraction destination when repeating GDAL conversion. Preparation uses NetworkX, osm2geojson, Shapely/GEOS and pyproj. Complete building solids remain in `sources/kyoto-lod1.geojson`; footprint union and original Z range are derived separately. A model's vertical extent and a source's measured-height attribute remain distinct fields. Missing roof shapes, facade layouts and entrances remain explicit unknowns.

Canonical outputs:

- `geography.json`: identity/revision, geographic frame, navigation nodes/edges, source classifications, six sight approaches and ordered route.
- `scene.json`: complete source footprints, holes, prepared triangles, authored display surfaces, canopy records and mapped point landmarks.
- `sights.js`: bilingual sight descriptions, interest categories, itinerary-independent reasons, practical facts and links.
- `source-ledger.json`, `source-review.json`, `sources/`: licensed snapshots, hashes, reviewed exclusions and remaining uncertainty.

Shijo preserves the existing local frame: origin **135.759719°E, 35.003739°N**, longitude scale **91,282.15 m/degree**, latitude scale **110,940.65 m/degree**. Local axes are east/north/up; glTF coordinates are **[east, height, −north]**. Another area requires a suitable reviewed local projection. Web Mercator display units must not be treated as ground metres.

An edge must connect actual shared nodes or document a reviewed authored segment contained within a mapped pedestrian area. Area perimeters are not automatically routes. Keep crossings, conditional vehicle access, steps, grade and wheelchair information. The current route uses authored level-zero ground and a 1.5 m simulation corridor; actual widths, grade, canopy clearance and present access remain unverified. Source-based place identity alone never makes a surface navigable.

## 3. Prepare visual sections without altering geography

```bash
npm ci --prefix experience
npm install --prefix artifacts/neighborhood-20261021/art/tools --save-exact @gltf-transform/core@4.5.1 @gltf-transform/extensions@4.5.1 @gltf-transform/functions@4.5.1 meshoptimizer@1.3.0 gltf-validator@2.0.0-dev.3.10 sharp@0.35.5
node experience/content-tools/extract-shijo-road-mask.mjs --model experience/public/models/shijo-block.glb --tools artifacts/neighborhood-20261021/art/tools --output artifacts/neighborhood-20261021/world/reviewed-road-mask.json
python3 experience/content-tools/prepare-neighborhood-art.py --scene experience/src/neighborhoods/shijo-east/scene.json --geography experience/src/neighborhoods/shijo-east/geography.json --reviewed-road artifacts/neighborhood-20261021/world/reviewed-road-mask.json --output artifacts/neighborhood-20261023/world/art-selection.json
```

This command verifies matching identity/frame and unchanged source hashes. It sections canopy plans at 100 m boundaries, verifies union/triangle area conservation, and selects exterior building edges within 25 m whose outward normals face the route. Occlusion still needs visual review. Whole building footprints remain intact; long arcade roofs receive streamed sections. The current selection contains 28 roof sections and 1,321 candidate facade edges across 848 ground buildings.

The Shijo extractor uses glTF Transform and Three.js to read the two original roadway meshes and ten raised sidewalk meshes. Road top faces minus raised sidewalk top faces form the reviewed visual mask, constrained to the original 64 m scene. Model and `WORLD` source hashes, exact triangles and authored-width meaning accompany it. This retained-scene adapter is specific to Shijo; another location needs its own reviewed display basis.

The helper derives `walkableMaterialSurfaces` from that mask, frozen motor-road polygons and explicit asphalt surface tags. Both material groups retain the original surface identity and level-zero height. `walkableMaterialAudit` checks combined area, boundary and overlap; the union difference is below 5 × 10⁻¹² m². `displayMaterialSurfaces` replaces nonwalkable land, roads and paths, retaining their original source IDs and authored heights. The tagged asphalt crossing retains asphalt, and Nishiki's pedestrian paving remains paving outside motor-road intersections. Road display widths keep their tagged or authored meaning.

Nonwalkable display triangulation rejects float32 collapse before Blender export. Exactly one numerically collapsed face currently needs omission: its original area is 1.302 × 10⁻⁶ m² and boundary displacement is 2.170 × 10⁻⁶ m. Raw vertices and measured changes are retained in `float32DisplayAudit`; hard rejection thresholds are 10⁻⁵ m² and 10⁻⁵ m. Display rings derive from retained GEOS triangles. This cleanup leaves the canonical source and walking surface unchanged.

Nishiki's `arcadeFacadeEdges` and `arcadeSoffitSections` connect the retained roof `osm:way:772134672` toward facing LOD1 building edges under an explicit **6 m authored connection limit**. The current result contains 106 source edges and 114 sections; the maximum vertex distance from the source roof is **5.485 m**. Sections retain their building edge IDs and direction, subtract mapped roads and transverse paths, and preserve the roof and building footprints. The northern gap at local x = 550 m remains open. These joins interpret separately mapped surfaces; actual construction widths and clearances remain unmeasured. The current art profile uses authored soffit top **4.65 m**, underside **4.605 m** and attached fascia **3.85–4.60 m** above virtual level zero.

`waterBankSegments` supplies 39 vertical display segments along retained water/land boundaries. Kamo and Misosogi use mapped water-area edges; Takase uses the sides of its existing **4 m authored water buffer**. Display-extent caps and the Kamo centerline inside its area are excluded. Matching uses a **2 mm display tolerance**. Bank faces run from authored ground **−0.04 m** to water **−2.5 m**; actual bank heights, profiles and access remain unmeasured. These faces add no horizontal walking surface. `arcadeGeometryAudit` and `waterBoundaryAudit`, plus source and preparation-script hashes, accompany exported provenance.

Art owns `experience/art/neighborhood-style.json`, the generator and the reference ledger. Recipes record reference IDs, material scale and authored dimensions. Shared materials support consistent appearance, while reviewed landmark geometry supplies recognizable differences. Canopies remain elevated elements; their footprints must not become solid walls across a public arcade. Water and riverbanks need explicit display heights, with navigation elevations kept independently.

The generator writes an uncompressed package into the ignored authoring directory. Editable Blender files use a separate directory:

```bash
blender --background --threads 4 --python experience/art/build_neighborhood.py -- --geography experience/src/neighborhoods/shijo-east/geography.json --scene experience/src/neighborhoods/shijo-east/scene.json --prepared-art artifacts/neighborhood-20261023/world/art-selection.json --style experience/art/neighborhood-style.json --asset-dir artifacts/neighborhood-20261023/art/arcade-raw --output-dir artifacts/neighborhood-20261023/art/arcade-build
```

Run export in the team's assigned CPU window. The export supplies resident ground, spatial base/near glTF sections, shared textures, editable `.blend` files, source indices, `manifest.json` and provenance. The source ledger, source review and photographic reference ledger accompany the assets. `neighborhood-references.json` identifies the seven new image references and their limitations; existing Shijo landmark references remain retained.

The verified delivery stage uses Node.js 24+, glTF Transform 4.5.1, meshoptimizer 1.3.0, glTF Validator 2.0.0-dev.3.10 and Sharp 0.35.5:

```bash
node experience/art/optimize_neighborhood.mjs --input artifacts/neighborhood-20261023/art/arcade-raw --output artifacts/neighborhood-20261023/art/arcade-candidate --tools artifacts/neighborhood-20261021/art/tools --retained-texture-size 256 --report artifacts/neighborhood-20261023/art/arcade-candidate/compression-report.json
```

The dependency record is `experience/art/neighborhood-toolkit.json`. The optimizer validates glTF before and after `EXT_meshopt_compression`, decodes the output and compares oriented triangles, attributes, source indices and node metadata. Over-budget input sections use 16-bit normal/tangent quantization; its error is measured. World positions, UVs and source indices are checked against the original geometry, with actual preservation results recorded per asset. The approved `--retained-texture-size 256` setting creates route-only Lanczos3 derivatives of retained authored textures; original pack assets remain unchanged. Other textures retain their dimensions. Lossless WebP conversion compares every decoded RGBA8 pixel and image dimension against that selected input, with sampling recorded per image. Full feature records remain in `feature-provenance.json`; the manifest carries the compact runtime identifiers. Copying an unverified raw export into the public directory does not satisfy this stage. Evaluate changed encoder settings in a separate ignored output directory and review that candidate before replacing published assets.

Ordinary sections, base sections, ground and context retain a **2 MiB** geometry-transfer limit. The retained Mitsui NEAR section has an explicitly approved **3.5 MiB** allowance to preserve its reviewed architecture. Daiya and all other sections retain the ordinary limit. Critical startup remains **4 MiB** for required 3D resources, including the traveller, buffers, textures and lighting; page JavaScript, CSS and fonts are reported separately. The generator derives 512 px environment maps and records original and derivative hashes in `lighting.json`. These are separate gates: the section allowance does not relax the startup budget. Use the final manifest and ordinary downloaded bytes; retain the compression report and source hashes with the package.

## 4. Verify the exact source and built package

Reproduce preparation into a different ignored directory, preserving accepted outputs:

```bash
python3 experience/content-tools/prepare-shijo-east.py --source artifacts/neighborhood-20261021/world/raw/osm-map.json --official artifacts/neighborhood-20261021/world/kyoto-lod1-route.geojson --output artifacts/neighborhood-20261021/world/repeat
python3 experience/content-tools/audit-shijo-east-repeat.py --canonical experience/src/neighborhoods/shijo-east --repeat artifacts/neighborhood-20261021/world/repeat --output artifacts/neighborhood-20261021/world/regeneration-audit.json
python3 experience/tests/neighborhood-source-test.py
```

The source gate checks retained hashes, complete way/ring dependencies, original coordinates and identifiers, projected versus geodesic length, connected sight approaches, bridge-area containment, official footprint/height preservation, holes and display triangles. The current source preparation reproduces seven files byte-for-byte, and its authored corridor has zero overlap with official ground-building footprints. Independent source QA passes **13/13**. Portable results are retained in [the source evidence directory](../evidence/neighborhood-20261021/source/): `independent-checks.txt` and `regeneration-audit.json`. These results cover source preparation.

The [2026-10-23 derived-input evidence](../evidence/neighborhood-20261023/world/README.md) records byte-identical art preparation and a fresh 13/13 source check. Its independent audit checks actual attachment edges, cross-street exclusions, polygon/triangle coverage, float32 validity, bank boundary classification and unchanged canonical hashes. Reproduction commands and complete input/producer/output hashes are retained there. Browser appearance and navigation acceptance require the checks below.

From `experience/`, run the integration checks on the completed exported package:

```bash
npm test
npm run build
EXPERIENCE_QA_OUTPUT=../artifacts/neighborhood-20261023/qa/browser node tests/browser-neighborhood.mjs dist
```

The browser driver requires the complete neighborhood manifest and built bytes. Coordinate the exclusive browser/GPU window. Check actual six-sight traversal and return, ground support, arcade visibility, crossings, day/night appearance, inspection, route editing, saved view and locale restoration, Maps handoff, streaming/resource disposal and real failure recovery. Preserve screenshots, network records, package hashes and driver hashes. Existing Kyoto/Ginza interactions and private saves must continue working. Publication uses the accepted immutable package, with source/license links verified in the deployed copy.

## Geographic expansion limits

A new city qualifies for a detailed route only after connected public-space geometry, identity-matched references, access/grade treatment and performance gates are reviewed. Source LOD1 geometry supports massing; individual facade and entrance reconstruction need additional evidence. A 3D mesh or a POI list does not establish traversable ground. Country-wide map coverage and nearby recommendations remain a separate coverage tier. Update source and pack revisions deliberately, review affected geometry/content, and preserve the meaning of existing saves.
