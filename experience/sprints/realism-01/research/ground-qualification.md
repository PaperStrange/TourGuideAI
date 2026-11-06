# Ground and adjacent-ward acquisition decision

6 November 2026 · R04 source qualification · Scene / geography / QA.

The [road source inspection](../../../evidence/realism-01/qualification/ground/README.md)
provides actual source polygons for every approved route edge. The 110 nearby
LOD1 roads are planar with zero source Z. One nearby LOD3 sidewalk section has
JGD2011 vertical heights near the route's final five edges. All pedestrian-volume,
ground elevation and current-access gates remain open.

| Next input | Known acquisition | Required review before use |
| --- | --- | --- |
| Shijō opposite-side buildings and Mitsui correspondence | Seven Shimogyo tiles decoded; exact Mitsui GML ID found once after source replacement selection | Qualify current façade/entrance appearance against independent views; preserve original LOD and textures |
| Eastern bridge view buildings | One Higashiyama tile decoded and included in the 18-view source diagnostic | Complete view context and bridge geometry remain missing/unqualified; route-forward bridge capture fails visible-content check |
| General road outlines | Two original CityGML files: 1,007,792 and 3,638,216 bytes, parsed successfully | Use as horizontal footprint reference; distinguish road classification from pedestrian access |
| Ground elevations outside the detailed sidewalk | Complete covering DEM streamed: 2,042,977 triangles parsed, 6,019 retained; all 1,434 route samples covered | Qualify terrain versus bridge/passage/curb levels, source epoch/model and independent control points |
| Detailed floor and curb geometry for the rest of the walk | No qualifying source established by the inspected road files | Obtain licensed survey/capture for gaps, including covered entrances and crossing transitions; require independent ground/collision review |
| Day/night pavement and fixture appearance | No pavement images in the inspected road source geometry | Obtain dated material/lighting references and held-out comparison views; geometric source metadata does not establish appearance |

The [machine-readable audit](../../../evidence/realism-01/qualification/ground/road-ground-audit.json)
contains exact DEM URLs/file sizes, code dictionaries, source hashes and all 54 edge
records. The retained Kyoto catalogue exposes one LOD3 bridge collection; the
previous bridge audit does not establish a qualifying Shijō Bridge model. Shijō
deck height and railing geometry therefore remain acquisition/review items.

The [bounded DEM inspection](../../../evidence/realism-01/qualification/dem/README.md)
preserves four original 32,768-byte decoded prefixes. The subsequent
[full-source experiment](../../../evidence/realism-01/qualification/terrain/README.md)
uses explicit 64 MiB encoded / 900 MiB decoded budgets and retains only the route
triangle subset. Actual extraction peak RSS is 98.2 MB. The source profile covers
the route, with bridge terrain approximately 2.74 m below the entrance terrain;
pedestrian deck geometry requires separate qualification.

[Explicit geoid-model diagnostics](../../../evidence/realism-01/qualification/datum/README.md)
show GSIGEO2011 consistency with inspected source meshes, while JPGEO2024 shifts
route values by about 0.147 m. Both coordinate calculations pass independent
implementation checks. These checks establish no physical survey accuracy or
accepted pedestrian surface.

Use a shared reviewed local reference frame for building meshes, ground and camera
paths. Record the source horizontal CRS, gravity-related vertical CRS, any geoid
model and conversion version, control points and residuals. Preserve original source
heights. Any runtime origin offset must be explicit and common to all candidates.
Neither the route's authored height zero nor LOD1 source height zero supplies that
registration. No vertical conversion or production collision update was performed.

The resource metadata lists FY2021 aerial photographs for building LOD2 and road
LOD1 geometry and FY2023 vehicle photo/laser survey for LOD3. The records' 2026
publication date is separate. Current entrance, access and illumination conditions
need their own evidence. No supplier quote or paid capture has been requested.
