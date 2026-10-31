# Matched Kyoto representation trials

Prepared 31 October 2026. **Status: defined; execution blocked on qualified source material and a physical-GPU test device.** No representation has won this comparison. The delivery target remains all six sights and 1,353.444 m of connected walking.

[Trial definitions](trial-definitions.json) pin the existing [route geography](../../../src/neighborhoods/shijo-east/geography.json) by SHA-256. The coordinates describe the existing application's route. Its zero heights, corridor widths and bridge endpoint include authored values; they cannot establish surveyed terrain, a building entrance or current public access.

| Trial | Route anchors | Inspect in both directions |
| --- | --- | --- |
| T01 · Street frontage | Mitsui frontage → Nishiki Market approach | Windows, recesses, entrances, corners, ground contacts and continuous connecting streets |
| T02 · Covered market/shrine | Nishiki Market approach → Shinkyōgoku/Shijō junction approach | Individual storefronts, arcade roof/undersides, lighting changes and Tenmangū approach identity |
| T03 · River/alley/bridge | Takase River approach → Shijō Bridge view | River edge, railing, Pontochō southern entrance and bridge approach; the northern alley is outside this route |
| T04 · Full route | All 55 selected nodes / 54 edges | Every connection, all six independently recognizable sights, streaming and return walking |

## Source and experiment admission

1. Bind each candidate to the source-coverage and licensing records in [research](../research/). Record original files, capture dates, location, CRS/vertical datum, calibration, masks and every SHA-256. Preserve a held-out photograph set that neither candidate uses for reconstruction or material authoring.
2. For a mesh/splat A/B, reconstruct both from the **same licensed capture** with the same coverage and exposure subset. Municipal textured mesh and independently captured splats receive separate absolute photo evaluations until matched inputs exist. Publisher footage supplies visual references only.
3. Review a common pedestrian surface and collision mesh independently of visual detail levels. Resolve the datum and source alignment before ground-relative cameras run. Both renderers use the identical surface, collision asset, walking volume, route and hashed camera trajectory. A blocked or unsafe route segment stops qualification and enters the gap register.
4. Freeze source-processing settings, tool versions, engine/loader versions, runtime quality settings and device/browser identity in the run manifest. Pin one manifest per representation; disclose geometry repair, authored lighting and preprocessing time. Do not vary camera, exposure target or quality settings during a run.

## Camera generation and execution

Follow the deterministic recipe in `trial-definitions.json`. Its route index ranges are inclusive; edge geometry must be oriented using the ordered route nodes. Sample every 0.1 m along the actual polyline, then query the common reviewed ground surface. Export the resulting trajectory and hash it once for both candidates. The supplied route coordinates are selection anchors, not new survey measurements.

At each listed sight, stop and capture forward, left, right and reverse views relative to the route tangent. Capture a full 360° yaw sweep, then inspect upward under eaves. The close-frontage review requires 2–5 m distance: record target feature IDs and measured camera-to-feature distance. If that distance cannot be reached within the reviewed pedestrian volume, flag the missing close view; do not move the camera through geometry. Save these additional camera poses before running either candidate.

Run daylight and night as separate matched conditions. Record captured lighting and any reconstruction/relighting limitations. A brightness reduction alone does not establish believable night illumination. Record light-source placement, ground contact shadows, exposure discontinuities and baked-highlight artifacts against held-out references.

## Evidence and decision

| Output | Required content |
| --- | --- |
| Paired contact sheet | Same trial, timestamp, pose, condition and viewport; source photograph beside each pair; unaltered originals retained |
| Motion capture | Forward/reverse traversal, corners, roof transitions, full-quality loading and visible LOD changes; label recording overhead |
| Run manifest | Source/asset/camera hashes, device/browser, settings, build commit, timestamps, rights, method and limitations |
| Measurements | Cold + three warm loads, first-usable and full-quality-ready clocks, event-timestamp-to-submitted-draw latency, frame intervals, transfer/decode and resource residency |
| Defect sheet | Exact location/pose, severity, coverage holes, floating/smeared geometry, frozen people, reflection errors and navigation interruption |

Store generated runs under ignored `artifacts/realism-01/runs/<trial>/<condition>/<representation>/<run-id>/`; promote reviewed evidence into [the sprint evidence directory](../../../evidence/realism-01/). Use a named physical GPU for acceptance. Software-rendered observations retain their environment label.

Retain the existing gates: first usable ≤8 s cold and each warm ≤3 s at 10 Mbps/80 ms; input event timestamp to changed state/submitted draw p95 ≤100 ms; frame interval p95 ≤33.3 ms; every Q03 warm action <500 ms. Report full-quality readiness separately. The [candidate-13 measurement record](../../../evidence/neighborhood-20261024/performance/candidate-13/README.md) supplies the bounded baseline and open failures. No new acceptance measurements exist yet.

Score qualified candidates using realism/recognition 45%, immersion 35%, usefulness 10%, cost/scaling 10%; rights, continuous walking and performance are independent gates. Trial results feed the sprint decision record. Complete-route, independent participant acceptance remains required after any renderer decision.
