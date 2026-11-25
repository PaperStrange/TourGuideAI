# Independent mask and texture audit

The saved OpenMVS interface archive contains 32 correctly associated source masks from four physical panoramas. Every image and mask hash matches the prepared input. Camera centers are unchanged. Actual densification, mesh and texture commands satisfy the explicit reviewed settings.

Texturing preserves all 33,482 vertices and 66,755 oriented triangles. The maximum vertex displacement is `8.509800543069248e-7` native units, within the pinned OBJ exporter's six-decimal serialization bound. The exported OBJ has 634 faces with a constant UV marker in one atlas location, corresponding to the unassigned-patch convention described in `upstream/SceneTexture.cpp`. Source-view IDs are absent from this export; the marker measurement includes the documented possibility of six-decimal UV rounding for very small projected triangles.

`run-02-mask-command-audit.json`, `run-02-texture-geometry-audit.json` and `run-02-texture-assignment-audit.json` retain the actual measurements. `run-02-dense-intrinsics.json` records the saved camera matrices through the official interface reader for the separate projection audit. `manifest.json` identifies retained sources, rights, methods, limitations and SHA-256 hashes. Original run outputs, executable files, dependency caches and build attempts remain under ignored artifacts.

## Reproduction

The Python producers accept explicit run and repository paths. They require the versions recorded in the parent surface dependency receipt: numpy, Pillow, plyfile and trimesh, plus scipy for geometry comparison. The original run resides at `artifacts/realism-01/connector-surface/run-02` when restored by the surface pipeline.

Compile the interface readers from this directory using the unchanged retained `upstream/Interface.h`, the pinned nlohmann JSON header and the matching OpenCV development headers in `dependencies.json`. Obtain those dependencies in an ignored artifact directory and verify their hashes before compilation. The JSON header must be available as `upstream/json.hpp` in the dependency include directory.

```sh
g++ -std=c++17 -O1 -Wall -Wextra -I OPEN_CV_INCLUDE -I DEPENDENCY_DIRECTORY inspect-interface.cpp -o IGNORED_OUTPUT/inspect-interface
g++ -std=c++17 -O1 -Wall -Wextra -I OPEN_CV_INCLUDE -I DEPENDENCY_DIRECTORY inspect-intrinsics.cpp -o IGNORED_OUTPUT/inspect-intrinsics
python audit-run.py --root REPOSITORY --run RUN --inspector IGNORED_OUTPUT/inspect-interface --output NEW_AUDIT.json
python compare-texture-geometry.py --run RUN --output NEW_GEOMETRY_AUDIT.json
python audit-texture-assignment.py --run RUN --output NEW_ASSIGNMENT_AUDIT.json
```

The small C++ adapters call the upstream `MVS::ARCHIVE::SerializeLoad` implementation. The Python producers use existing parsers for JSON, PLY, OBJ and images. An output path must be new; completed evidence is preserved.

## Native material interpretation

OpenMVS v2.4.0 `ObjModel::MaterialLib::Save` unconditionally exports `Tr 1.000000`. Its material stores RGB colour and an RGB diffuse image, and its loader does not read a transparency field. The actual MTL follows this convention. A Three.js consumer should use MTLLoader's documented `invertTrProperty: true` option for this exporter; retain the original MTL and its hash. The complete pinned `upstream/OBJ.cpp` and `upstream/OBJ.h` preserve the source proof and original Boost license notices.

## Limits

These checks establish saved input associations, command conformance and geometry preservation during texturing. They do not establish full-route coverage, metric scale, independent held-out image quality, useful walkability or lighting-mode quality. The numerical density and mesh coverage review is maintained separately.
