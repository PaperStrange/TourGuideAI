# Free route capture follow-up · 14 November 2026

The seven sequence IDs from the [previous route lookup](../../../evidence/realism-01/qualification/free-sources/query-coverage.json)
now have complete first-page responses from KartaView's documented photo endpoint.
Every response reports API code `600`, body HTTP code `200` and
`hasMoreData:false`. The seven sequences contain **nine photographs**, including
two additional IDs in sequence `11606832`.

| Sequence / exact retained response | Photo count | Declared calibration |
| --- | ---: | --- |
| [11606832](../../../evidence/realism-01/free-route-20261114/responses/sequence-11606832-150.json) | 3 | Camera parameters absent; FOV and heading zero |
| [11716327](../../../evidence/realism-01/free-route-20261114/responses/sequence-11716327.json) | 1 | Camera parameters absent; FOV and heading zero |
| [11716328](../../../evidence/realism-01/free-route-20261114/responses/sequence-11716328.json) | 1 | Camera parameters absent; FOV and heading zero |
| [11716329](../../../evidence/realism-01/free-route-20261114/responses/sequence-11716329.json) | 1 | Camera parameters absent; FOV and heading zero |
| [11716330](../../../evidence/realism-01/free-route-20261114/responses/sequence-11716330.json) | 1 | Camera parameters absent; FOV and heading zero |
| [11716350](../../../evidence/realism-01/free-route-20261114/responses/sequence-11716350.json) | 1 | Camera parameters absent; FOV and heading zero |
| [11716354](../../../evidence/realism-01/free-route-20261114/responses/sequence-11716354.json) | 1 | Camera parameters absent; FOV and heading zero |

The [recomputed findings](../../../evidence/realism-01/free-route-20261114/findings.json)
bind the original 54-edge / 1,353.444 m route and previous query evidence by
SHA-256. All nine declared camera positions lie outside the bounding rectangle
of the route's complete polylines. Additional IDs `2625879233` and `2625879234`
both declare **135.774933 E, 35.007063 N**. Position alone cannot establish which
features appear in an image. Zero headings and FOV values establish no usable
orientation or calibration. This follow-up acquired metadata only; the five
previously unreviewed images remain visually unreviewed.

## Provenance and verification

Queries used `https://api.kartaview.org/2.0/photo/` with each retained `sequenceId`,
`page=1` and documented maximum `itemsPerPage=150`, between 08:57:09 and 08:57:24
UTC on 14 November. Exact responses and HTTP headers are retained unchanged.
The [manifest](../../../evidence/realism-01/free-route-20261114/manifest.json)
records 22 files with source, date, rights, location, method, limits and SHA-256.
It also preserves the parameter-validation response from the earlier oversized
page request separately from successful coverage.

The [complete photo API template](../../../evidence/realism-01/free-route-20261114/photo-api.html)
and [license passage](../../../evidence/realism-01/free-route-20261114/data-license.html)
come from the hash-identified official application bundle, decoded using Babel.
KartaView licenses street imagery and 3D spatial data under CC BY-SA 4.0 with
**© Grab and KartaView Contributors** attribution. Images are absent from this
evidence bundle. The full application cache remains ignored; extracted source
offsets and its original hash are retained.

Run the independent integrity and metadata checks from a clean checkout:

```sh
node experience/evidence/realism-01/free-route-20261114/retain.mjs --verify
```

## Next qualification

This sequence follow-up supplies no calibrated route connector. Admission still
requires freely licensed overlapping views of an actual connecting segment,
recoverable camera calibration/poses, verified scale, continuous measured
pedestrian floor and sight correspondence. Apply the existing
[handover checklist](acquisition-package/handover-checklist.md) to the next actual
capture. The complete route, independent lighting evidence and realism gates
remain open. No supplier contact, purchase or account request occurred.
