# Source inspection viewer

The viewer assembles the selected original PLATEAU GLBs in the extraction
manifest's local east/up/south frame. It applies the recorded `CESIUM_RTC`
placement matrix and the declared per-tile batch selection. Three's GLTF/Draco
loaders decode the source. Original vertex coordinates, UVs and materials remain
unchanged; replacement LOD objects are excluded through the recorded index selection.

The source height anchor is provisional. The six sight positions carry a height
method and `heightQualified: false`; each approach/reverse camera uses the
explicit normalized route tangent. Camera eye offset is 1.7 m. Elevated context
uses a separate 27 m offset. These positions establish source inspection views;
they do not establish pedestrian ground or traversability.

Neutral white diagnostic illumination exposes the original materials. The viewer
adds no ground, architectural repair, traffic or night fixtures. Orbit and pan are
inspection controls. No performance or gameplay acceptance follows from this tool.

From the repository root, after reproducing the source extraction:

```sh
node experience/tools/source-qualification/capture-review.mjs --manifest artifacts/realism-01/runs/route-qualification/review-manifest.json --serve --port 4198
```

Open the printed local URL. To capture the six sights in approach, reverse and
elevated-context poses using the actual browser:

```sh
node experience/tools/source-qualification/capture-review.mjs --manifest artifacts/realism-01/runs/route-qualification/review-manifest.json --output artifacts/realism-01/runs/source-review
```

The capture command requires local listening-socket permission and Chromium
(`EXPERIENCE_QA_CHROMIUM` can select its executable). It records JPEG originals
at quality 92, their hashes, exact source/tool identities, submitted camera
matrices, actual graphics identity, loaded geometry, native orbit input and all
page errors. The local HTTP service serves only the declared source files, viewer
and installed Three modules/decoder. It performs no external image requests.

The visible-content check requires submitted geometry and a nonuniform interior
pixel sample. An image with missing geometry remains in the evidence and fails
that check. Passing this check establishes neither landmark recognition nor
realism. Review each source image and its method/limitations before promoting it
to the sprint evidence directory.
