# Kyoto vertical-datum diagnostic

6 November 2026 · [Original diagnostic](datum-diagnostic.json) · [Independent GDAL check](independent-grid-check.json) · [File identities](manifest.json)

Both geoid transformations were evaluated explicitly against the same six route
anchors and 1,868 selected source building occurrences. The source coordinates
are EPSG:6697, **JGD2011 plus gravity-related vertical height**. The Three source
viewer uses **WGS84 ellipsoidal coordinates converted to ECEF and a local
east/up/south frame with origin ellipsoid height zero**.

| Route anchor | GSIGEO2011 undulation (m) | JPGEO2024 undulation (m) | 2024 − 2011 (m) |
| --- | ---: | ---: | ---: |
| Mitsui frontage | 37.302601 | 37.449487 | 0.146886 |
| Nishiki west | 37.301249 | 37.448077 | 0.146828 |
| Tenmangū approach | 37.300335 | 37.447274 | 0.146939 |
| Takase at Shijō | 37.300562 | 37.447720 | 0.147158 |
| Pontochō entrance | 37.300436 | 37.447609 | 0.147173 |
| Shijō Bridge | 37.300342 | 37.447526 | 0.147184 |

These are **mathematical H=0 reference evaluations** of the geoid models. They
assign no ground height. All 12 inverse round trips pass. Independent GDAL 3.10.3
GeoTIFF bilinear interpolation agrees with the explicit PROJ results to
7.11 × 10⁻¹⁵ m across the 12 samples. This checks software interpretation of the
same input grids; it supplies no independent survey accuracy.

## Model and source epochs

The unchanged [PROJ-data source documentation](jp_gsi_README.txt) declares both
grids **CC BY 4.0**, with Geospatial Information Authority of Japan attribution and
the original conversion/permission identifiers. [Acquisition receipts](download-receipts.json)
bind 7,810,467 original bytes including that document. Raw grids stay in ignored
`artifacts/realism-01/ground-datum/downloads/`.

| Grid | Source / date information | Evaluation boundary |
| --- | --- | --- |
| GSIGEO2011 | Converted from `gsigeo2011_ver2_1.asc`; native grid date 2020-10-28 | Explicit historical-model diagnostic. PROJ reports combined operation accuracy as unknown (`-1`) |
| JPGEO2024 | Converted from `JPGEO2024.isg`; documentation says official in Japan on **2025-04-01** | Explicit current-model diagnostic. PROJ reports combined operation accuracy 1.03 m |

The [retained Kyoto metadata](../ground/road-ground-audit.json) gives FY2021 for
LOD2 buildings/LOD1 roads and FY2023 for LOD3 source acquisition. The DEM resource
row says `基盤地図情報` (Fundamental Geospatial Data), with its acquisition-year
field blank. The DEM object's 2023-03-24 creation date establishes object creation;
the original terrain survey epoch remains unverified. Neither the resource's
2026 publication date nor the installed PROJ preferred-operation order establishes
which model should be applied to that terrain source.

## Source-height consistency

For the Mitsui source object, converting the original minimum/maximum gravity
heights at its recorded source point gives these residuals:

| Model | Decoded minimum − converted source minimum | Decoded maximum − converted source maximum |
| --- | ---: | ---: |
| GSIGEO2011 | −0.000143 m | +0.000035 m |
| JPGEO2024 | −0.147000 m | −0.146822 m |

All 17 selected LOD3 building occurrences have GSIGEO2011 extremum residuals
within 0.000085 m. Their JPGEO2024 residuals are approximately −0.147 m. This
supports consistency of the existing converted geometry with GSIGEO2011.

Every source-object residual is retained. Some LOD1/LOD2 extrema differ by tens
of metres. Source extrema and decoded mesh extrema can refer to different
vertices or source geometry extents; evaluation at the recorded object point
also differs from evaluation at each extremal vertex. These observations cannot
be used as independent control points, a universal height offset or an acceptance
score. The retained report includes every outlier and its original source ID.

## Actual terrain profile conversion

The [two-model terrain/frame result](terrain-frame-diagnostic.json) binds the
retained [1,434-sample terrain profile](../terrain/terrain-profile.json) by hash.
All actual source gravity heights were converted through both declared models,
then through WGS84 ECEF into the existing local east/up/south frame. Each of the
**2,868** local-frame results also agrees with PROJ's independent topocentric
pipeline, with maximum difference 2.28 × 10⁻¹³ m.

| Sight | Original terrain H (m) | GSIGEO2011 local up (m) | JPGEO2024 local up (m) |
| --- | ---: | ---: | ---: |
| Mitsui frontage | 36.996224 | 74.298791 | 74.445677 |
| Nishiki west | 38.936294 | 76.230595 | 76.377423 |
| Tenmangū approach | 38.854988 | 76.120426 | 76.267365 |
| Takase at Shijō | 38.303798 | 75.528897 | 75.676056 |
| Pontochō entrance | 38.335386 | 75.551625 | 75.698798 |
| Shijō Bridge | 35.592232 | 72.801674 | 72.948858 |

Local tangent-frame up differs from ellipsoidal height by up to **0.090900 m**
over these samples. The bridge terrain observation is approximately 2.74 m below
the entrance terrain observation. These are source terrain values; a bridge deck
or covered passage still needs its own reviewed pedestrian surface. No sample
gains pedestrian-floor qualification through this coordinate conversion.

## Reproduce and apply only to a declared experiment

PyProj 3.8.0 / PROJ 9.8.1 select each grid by its explicit pipeline. PROJ network
lookup is disabled, so the recorded local grid is required. Grid names, original
hashes, PROJJSON, operation descriptions and accuracy metadata remain in the
diagnostic. Pinned requirements are in
[the tool directory](../../../../tools/ground-datum/requirements.txt) and
[the GDAL requirement](../../../../tools/ground-datum/requirements-gdal.txt).

```sh
PYTHONPATH=artifacts/realism-01/geometry-tools:artifacts/realism-01/inspection-tools python experience/tools/ground-datum/diagnose.py --root . --cache artifacts/realism-01/ground-datum/downloads --output artifacts/realism-01/ground-datum/run
/usr/bin/python3 experience/tools/ground-datum/verify-grid.py --root . --cache artifacts/realism-01/ground-datum/downloads --output artifacts/realism-01/ground-datum/run
PYTHONPATH=artifacts/realism-01/geometry-tools:artifacts/realism-01/inspection-tools python experience/tools/ground-datum/profile.py --root . --cache artifacts/realism-01/ground-datum/downloads --profile experience/evidence/realism-01/qualification/terrain/terrain-profile.json --diagnostic artifacts/realism-01/ground-datum/run/datum-diagnostic.json --output artifacts/realism-01/ground-datum/run
```

Existing cached bytes must match their receipts. New acquisitions need review of
their original hashes. The acquisition limit is **64 MiB combined**; this run
used 7.81 MB. Datum conversion for a future experiment should transform actual
`(longitude, latitude, H)` through the explicitly declared model to EPSG:4979,
then to EPSG:4978 and the existing local rotation. Local tangent-frame `y` includes
curvature relative to the origin and is distinct from ellipsoidal height itself.

Keep original gravity heights, converted ellipsoidal heights, chosen-model label,
grid hash and transformation version. Evaluate common measured control points and
actual pedestrian surfaces separately. **Source epoch/model choice, pedestrian
ground, collision, current access and production acceptance remain unverified.**
This diagnostic applies no transformation to the application or public preview.
