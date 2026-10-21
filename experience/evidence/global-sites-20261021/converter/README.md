# Actual OSM2World conversion experiment

Executed 21 October 2026 UTC on the retained Delft and Helsinki OSM XML responses.
Inputs retain the hashes, URLs and timestamps in `../research/retrievals.json`.
No source tags were replaced, removed or synthesized for this experiment.

The official latest-build archive was downloaded from
`https://osm2world.org/download/files/latest/OSM2World-latest-bin.zip`.
HTTP Last-Modified: 28 August 2026 20:36:34 GMT. Archive size: 472,935,372 bytes.
Archive SHA256: `185d3ec08b703b04ae84f583955e6638bd2d76382425f4d2afe74d09c0a1fc0c`.
CLI version: `0.5.0-SNAPSHOT`; Java: OpenJDK 21.0.12.1.
The archive's own LICENSE.txt contains the MIT license, © 2010–2026 contributors.
No converter binary or generated asset is bundled into the website.

`OSM2World.jar` SHA256:
`c81398b2c396f5a234d15429419aaa5843d34708f421d05a213369a62212610f`.
Bundled `standard.properties` SHA256:
`c5470ee49ef3139464024f7d9eca871c9fe6cabd735c4f8e92fe8a369c7d638b`.

Both commands ran from the extracted distribution with an absolute input/output
path and a repository-local Java temporary directory:

```sh
java -Djava.io.tmpdir=/workspace/TourGuideAI/artifacts/tmp -Xmx2G \
  -jar OSM2World.jar convert --config standard.properties --lod 2 \
  -i /workspace/TourGuideAI/experience/evidence/global-sites-20261021/research/delft-markt.osm \
  -o /workspace/TourGuideAI/artifacts/sandbox-research/delft-lod2.glb
java -Djava.io.tmpdir=/workspace/TourGuideAI/artifacts/tmp -Xmx2G \
  -jar OSM2World.jar convert --config standard.properties --lod 2 \
  -i /workspace/TourGuideAI/experience/evidence/global-sites-20261021/research/helsinki-senate.osm \
  -o /workspace/TourGuideAI/artifacts/sandbox-research/helsinki-lod2.glb
```

| Actual output | Bytes | Triangles | Mesh primitives | Embedded images | Process exit |
| --- | ---: | ---: | ---: | ---: | ---: |
| Delft LOD2 | 3,152,800 | 7,587 | 437 | 36 | 0 |
| Helsinki LOD2 | 3,965,632 | 14,352 | 512 | 40 | 0 |

The mesh-primitive count describes the file, not measured GPU draw calls. The
structural inspection uses `pygltflib==1.16.5`; its script is
`../research/inspect_converter.py`. The retained JSON includes output hashes,
scene origins, source-ID metadata and every error/warning header. Both required
landmark IDs appear in metadata. This establishes identity retention only, not
complete or correct generated architecture. No matched rendering, conversion
timing, full geometry validation or physical-device performance claim is made.

## Production decision

**Automatic conversion does not pass the production gate.** Delft reports roof
generation exceptions for ways 775746411, 775746403 and 775746404. Helsinki reports
a degenerate triangle for way 29478214, incomplete building relations, conflicting
height constraints and wall-boundary warnings. The complete captured logs are
retained next to this document. A successful command and a parseable GLB cannot
establish a complete site.

Keep this converter available for reviewed authoring experiments. Resolve and
independently check affected features before adopting any generated output. The
bounded Ginza art work can proceed from its independently reviewed source context.
The common workbench must preserve unsupported/missing-data reports and must
never register a geographic preview as a reviewed walking area automatically.
No generated output from this experiment is published or registered as playable.
