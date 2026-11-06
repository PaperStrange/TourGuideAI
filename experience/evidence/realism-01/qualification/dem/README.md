# Bounded terrain-source inspection

6 November 2026 · Kyoto City / MLIT Project PLATEAU · CC BY 4.0.

[Original inspection report](dem-envelope-audit.json) · [Prefix identities and producer](manifest.json)

Four original CityGML DEM envelopes were parsed from **32,768 decoded bytes per
source**, using HTTP Range and the XMLPullParser. Original prefixes and transport
encoding metadata are retained. Each declares EPSG:6697.

Only `523546_dem_6697_00_op.gml` has a declared envelope containing the complete
route. The inventory declares **793,602,405 bytes** for that file; the HTTP range
response reports a gzip-encoded total of 33,281,694 bytes. The bounded inspection
did not acquire the full response. The current 100,000,000-byte limit applies to
the inventory's declared source size, so this automatic acquisition remains
ineligible. That limit is a tool setting, with no user spending requirement.

The three other envelopes do not contain the whole route. Envelope containment
alone supplies no evidence of actual terrain triangles or ground quality. Bridge
deck, pavement, stairs, curb and covered-passage levels still require their own
control data. No terrain elevation was applied to runtime or camera placement.

Reproduce the bounded network inspection with the pinned Requests dependency:

```sh
PYTHONPATH=artifacts/realism-01/site-test-tools python experience/evidence/realism-01/qualification/ground/inspect_dem.py --root . --output artifacts/realism-01/downloads/dem-qualification
```

A subsequent terrain experiment should explicitly budget compressed transfer,
decoded source size and parsing memory, and stream only a reviewed route extent.
It must preserve the source datum and separately qualify pedestrian floors.

The completed [full-source follow-up](../terrain/README.md) used explicit transfer
and decoded-size budgets. It parsed the complete covering file and retained 6,019
route-near triangles. The envelope records above preserve their original bounded
inspection scope. Pedestrian floors and source epoch/model qualification remain open.
