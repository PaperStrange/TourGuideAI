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
| Ground elevations outside the detailed sidewalk | Four DEM envelopes inspected; covering source declares 793,602,405 bytes, with HTTP gzip total 33,281,694 bytes | Plan streamed acquisition/parse resources explicitly; verify actual triangle coverage, preserve EPSG:6697 datum and distinguish terrain from bridge/passage/curb levels |
| Detailed floor and curb geometry for the rest of the walk | No qualifying source established by the inspected road files | Obtain licensed survey/capture for gaps, including covered entrances and crossing transitions; require independent ground/collision review |
| Day/night pavement and fixture appearance | No pavement images in the inspected road source geometry | Obtain dated material/lighting references and held-out comparison views; geometric source metadata does not establish appearance |

The [machine-readable audit](../../../evidence/realism-01/qualification/ground/road-ground-audit.json)
contains exact DEM URLs/file sizes, code dictionaries, source hashes and all 54 edge
records. The retained Kyoto catalogue exposes one LOD3 bridge collection; the
previous bridge audit does not establish a qualifying Shijō Bridge model. Shijō
deck height and railing geometry therefore remain acquisition/review items.

The [bounded DEM inspection](../../../evidence/realism-01/qualification/dem/README.md)
preserves four original 32,768-byte decoded prefixes. Full terrain acquisition
exceeds the current tool's 100 MB decoded-source setting. This resource setting
does not require spending or user permission; the next terrain experiment must
budget compressed transfer, streamed parsing and retained route extent explicitly.

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
