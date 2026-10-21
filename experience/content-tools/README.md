# Geographic site workbench

This internal authoring workflow turns a captured OSM XML snapshot into an audited
local scene, an editable Blender file and a browser preview. Its output is
**geographic context with unreviewed architecture and navigation**. It does not
register a playable area, change Shijō/Ginza saves or provide real-world routing.

Run the commands below from the repository root. Generated files belong under
ignored `artifacts/`; use a fresh output directory for each reviewable revision.
Do not regenerate an output directory while the preview server is using it.

## Dependencies

- Node.js 24 and the locked dependencies in `experience/package-lock.json`.
- Python 3.12 with the versions in [requirements.txt](requirements.txt):
  osm2geojson 0.3.2, Shapely 2.2.0 and pyproj 3.8.0.
- **Blender 4.3.2**. The exporter checks this exact version and rejects others.
- A WebGL2-capable browser for preview. No GPU is needed for preparation or the
  Blender background export; these commands do not render a beauty image.

```sh
mkdir -p artifacts/tmp artifacts/site-tools-python artifacts/pip-cache
TMPDIR="$PWD/artifacts/tmp" python3 -m pip install \
  --cache-dir artifacts/pip-cache \
  --target artifacts/site-tools-python \
  --requirement experience/content-tools/requirements.txt
npm ci --prefix experience
blender --version
```

The Python target keeps authoring dependencies outside the website and global
Python installation. Keep the session's configured proxy and CA trust for package
installation; do not disable TLS verification. Preparation, export and the local
viewer consume captured/local files and do not fetch fresh geographic data.

## Prepare the captured sites

The checked-in examples are [Delft Markt](../content/sites/delft-markt.json) and
[Helsinki Senate Square](../content/sites/helsinki-senate.json). Each configuration
binds a source file, SHA-256, retrieval URL/date, rights, required OSM identity,
display bounds, projection origin and explicitly authored policy.

```sh
TMPDIR="$PWD/artifacts/tmp" PYTHONPATH="$PWD/artifacts/site-tools-python" \
  python3 experience/content-tools/prepare-site.py \
  --site experience/content/sites/delft-markt.json \
  --output artifacts/site-workbench/delft

TMPDIR="$PWD/artifacts/tmp" PYTHONPATH="$PWD/artifacts/site-tools-python" \
  python3 experience/content-tools/prepare-site.py \
  --site experience/content/sites/helsinki-senate.json \
  --output artifacts/site-workbench/helsinki
```

| Prepared file | Meaning |
| --- | --- |
| `context.json` | Source identities/tags and original geometry, projected geometry, disjoint display surfaces, preserved holes, triangulation, authored policy and input hashes. |
| `review.json` | Tool versions, exclusions, missing evidence, counts and buildings using authored fallback heights. Read this before export. |
| `source.geojson` | WGS84 source geometry and provenance for retained features; it is not the clipped/flattened display mesh or a reviewed walking map. |

The preparer verifies the captured source hash and required identity. It uses
osm2geojson for conversion, pyproj for local azimuthal-equidistant projection, and
Shapely for geometry operations and constrained triangulation. Missing dependencies,
invalid rings, unsupported relations and intersecting buildings are reported or
rejected; missing source nodes are never invented. Source longitude/latitude maps
to local east/north metres, then glTF `[east, height, -north]`.

For the supplied sites, display inputs are quantized once to **1 mm**; subsequent
intersection/difference/union operations use full floating-point precision so
adjacent surfaces share intersections. Boolean outputs receive topology-preserving
cleanup at `1e-10` m; polygon components of at most `1e-10` m² are recorded and
omitted. `review.json.booleanSurfaceNormalization` records affected features,
removed areas and area change. Triangles of at most `1e-12` m² are also recorded
in `omittedNumericalTriangleAreasSquareMetres`. Display rings are reconstructed
from the union of retained triangles, with area/hole checks. This removes numerical
degeneracies; it does not increase geographic accuracy or silently repair missing
source geometry.

## Export with Blender

Use each prepared directory as its export directory so the preview receives the
matching `context.json`, `review.json`, GLB and manifest together.

```sh
TMPDIR="$PWD/artifacts/tmp" blender --background --factory-startup \
  --python-exit-code 1 --python experience/art/build_site_context.py -- \
  --context artifacts/site-workbench/delft/context.json \
  --output-dir artifacts/site-workbench/delft

TMPDIR="$PWD/artifacts/tmp" blender --background --factory-startup \
  --python-exit-code 1 --python experience/art/build_site_context.py -- \
  --context artifacts/site-workbench/helsinki/context.json \
  --output-dir artifacts/site-workbench/helsinki
```

`--factory-startup` starts a clean Blender scene. `--python-exit-code 1` makes a
script failure fail the command instead of being mistaken for a successful export.

The exporter validates ring winding, areas, prepared triangles, source identities
and review status. It produces:

- `site.blend`: separate editable source-feature objects and original source tags.
- `scene.glb`: shared-material batches with stable source metadata and a
  `_SOURCE_INDEX` vertex attribute for surface inspection.
- `manifest.json`: model/editable-file hashes and sizes, geometry counts,
  source/config/context/generator identities, coordinate mapping and limitations.

The configured limits are capped at **8 MiB per GLB, 100,000 triangles and 128
material batches**. A budget or validation failure is not a usable new revision;
review the output set before previewing it. `scene.pending.glb` is an intermediate,
not the selected model. The exporter authors flat-roof massing, neutral PBR finishes
and repeated window panels; source metadata does not make those details observed.

## Preview locally

```sh
node experience/content-tools/preview-site.mjs --port 4197 \
  artifacts/site-workbench/delft artifacts/site-workbench/helsinki
```

Open the printed `http://127.0.0.1:4197` address. Add `?lang=zh` for Chinese; the
language controls also switch the interface. Stop the process with Ctrl+C.
`--port 0` requests an available port; `--help` prints usage.

The server binds to loopback and exposes only the selected site files, the viewer,
installed Three.js modules and the project's credited HDR resources. It does not
serve the repository generally or publish a public URL. Remote-device access or
hosting would be a separate deployment change.

The viewer provides orbit, pan, zoom, reset, day/night and surface-source inspection:

- Drag to orbit; right-drag or two fingers to pan; wheel or pinch to zoom.
- Focus the scene for arrow-key orbit, Shift+arrow pan, `+`/`-` zoom and `R` reset.
- Click a surface, or press Enter to inspect the view center. The ground display
  has no source-feature identity.

Day/night uses authored lighting with the locally retained, credited CC0 HDR
environments. It does not represent the site's current conditions, occupancy or
opening hours. Source details are review data, not visitor instructions. A ready
frame and successful hash check establish loading integrity, not architectural
accuracy or permission to walk there.

The server and viewer verify context bytes against `manifest.contextSha256` and
require matching site/configuration/source identities across the metadata. The
viewer also checks model bytes/hash and the GLB's own scene identities. Keep all
sidecars with their matching export; a newly prepared context is not interchangeable
with a previous model of the same named site.

The real-file HTTP regression can run without a browser after export:

```sh
node experience/tests/workbench-http.mjs \
  --output artifacts/workbench-http/result.json \
  artifacts/site-workbench/delft artifacts/site-workbench/helsinki
```

It requires at least two distinct actual generated sites, starts its own loopback
server on an available port, and checks served model bytes, route restrictions and
mixed-site metadata rejection. Temporary negative cases copy/link those actual
files into a repository-local directory that is removed afterward. It neither
modifies the supplied exports nor substitutes for browser/visual review.

## Review before adding a site or publishing output

1. **Capture and identify.** Retain the original OSM response and retrieval
   metadata. Required way/relation members and their nodes must be present. Record
   query bounds separately from display bounds: an API response may include
   complete intersecting ways without providing complete coverage of an enlarged
   display area. Retain OSM attribution and ODbL obligations for derived data.
2. **Review geographic interpretation.** Check footprint identity, holes,
   exclusions, overlapping buildings, bridges/tunnels and boundaries against the
   retained source. Buildings crossing the selected boundary are excluded rather
   than cut into fake facades. Linear road/path widths may be authored. Display
   order is building, path, road, water, green; flattened layers are not surveyed
   elevation or a grade-separated transport model.
3. **Review architecture and rights.** OSM `height` is a reported tag, not a
   verified survey. A storey count multiplied by an authored storey height is a
   derived estimate; fallback heights, windows and materials are authored. Roof
   forms, building assemblies/parts, landmark silhouette, facade details, entrances
   and local ground levels require separate evidence. Keep permissions and credits
   for any additional imagery/materials independently of software licenses.
4. **Review export and browser behavior.** Bind one complete output set to its
   manifest; inspect actual day/night frames, both desktop and phone, source picking,
   reset, keyboard/touch controls, switching/cancellation, failed-load retry and
   hidden work. Compare appearance with suitable references, not only mesh counts.
5. **Promote deliberately.** A playable pack needs separately reviewed access and
   navigation, collision/ground coverage, interactions, versioned save identity,
   source disclosures and resource-lifetime evidence. This workbench has no
   automatic promotion into `src/packs/registry.js`.

For a new location, copy a configuration under `experience/content/sites/`, choose
a unique lowercase ID and a required `osm:way:…` or `osm:relation:…` identity, set
bilingual titles and country code, and replace the source metadata with the actual
capture. `source.file` is relative to the configuration file. Place the origin
inside ordered `[west, south, east, north]` bounds; antimeridian-crossing bounds and
latitudes outside −85…85 are unsupported. The local bounds must fit the configured
radius (10–2,000 m). Numerical display precision is not survey accuracy. Set and
review all authored policies and budgets, then run the same prepare/export/preview
commands with that configuration and a fresh output directory.

The separate [OSM2World experiment](../evidence/global-sites-20261021/converter/README.md)
produced parseable GLBs but reported geometry/assembly errors. It is not a required
dependency or an accepted replacement for this pipeline. See the
[sandbox research decision](../docs/sandbox-engine-research-20261021.md) for the
reason to reuse mature geographic operations while keeping source and architectural
review explicit. The older `build-street-context.mjs` remains a separate Shijō
authoring extraction; it is not the generic site preparer.
