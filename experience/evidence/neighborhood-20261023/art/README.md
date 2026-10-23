# Executed arcade and riverbank review · 2026-10-23

Candidate 6 preserves the decoded candidate-2 art assets through verified transport packaging. Bounded crossing/frontage, arcade enclosure/framing and river-continuation reviews are accepted. Current daylight/night review at Tenmangū and eight previously visited connector cells remains pending. Whole-neighborhood visual acceptance and human realism have not been established. The candidate-1 and candidate-2 records below retain their respective package identities and observations.

## Candidate 1 captured build

- Tested local package: `df711b7d06a0a921545cc82de1ffe3b26dec28a8dc3a86684d837fcdd5e1127c`.
- Neighborhood manifest: `add6e399dcebca96cec9daf9e413f1374b6561ca48272b982914a1d6075f961c`.
- [Browser record, gzip](candidate-1/browser-result.json.gz): decompressed SHA256 `ca9b5c023d31a7f7a049b9ff3018bc38874cc7eac1df52eb7934546a40935e71`. The record contains ten passing checks and two failed surface-selection scans. It records actual matrices, source/resource hashes, settled lighting and ordinary walking/control inputs.
- The restored starting point was previously visited in the completed route. The new run walked to Market and another 20m inside. The bridge view restores the exact previously walked pause; this capture does not establish a new full-route traversal.

## Observed views

| Actual canvas | SHA256 |
| --- | --- |
| [Ordinary arcade daylight](candidate-1/arcade-inside-ordinary-day-canvas.png) | `493633db1b4beb9371c11b65f24414c44ff95f4b554a65fce101c7046e7ea20d` |
| [Ordinary arcade night](candidate-1/arcade-inside-ordinary-night-canvas.png) | `138b3671d3d6250742f14b67b37893a595dfeb5b105fbfa1c2c4806833a9a16c` |
| [Below-roof daylight](candidate-1/arcade-below-roof-day-canvas.png) | `07662181b8916af4485404e3b49ce0b90cf3e995ff7ef97aa103711bce99c642` |
| [Below-roof night](candidate-1/arcade-below-roof-night-canvas.png) | `fb6f41f742aaa203f1b45ccc1110293d74428f0971ec3febaa0810f7492bfe18` |
| [Bridge daylight](candidate-1/bridge-prior-actual-pose-day-canvas.png) | `ceaea455072cada07f82fb098c8c611480ddefc191c29a376d9a7aac10a53efc` |
| [Bridge night](candidate-1/bridge-prior-actual-pose-night-canvas.png) | `8a889e8fa827dd7fa9d543eb7d48199122714bf68dca0e1e26edbcc01c6b193c` |

At the ordinary interior position `x287.127,y140.015`, the complete traveller and forward paving are readable in both modes. The recorded recovered camera distance is approximately `6.122m`; the actor occupies `27.79%` of the image height. This resolves the inspected head crop. The camera behavior has separate [runtime evidence](../runtime-camera/README.md).

The deliberate below-roof views expose broad gray soffits joining the frontage, the red/yellow/green ridge, and varied timber/metal lower frames. These cues correspond to the reviewed `nishiki-arcade-2025` reference. Recesses and local night pools are visible. A close foreground window occupies roughly half of these frames; they establish the assembly's appearance while leaving overall inspection composition limited.

The separate [deliberate inspection report](candidate-1/inspection-result.json.gz) passes four checks on the same package. Decompressed SHA256 is `3996ed13655ab8ea953ab13d0a6e304624aba20fa0541bc00e504b83235f8916`. Actual orbit/zoom/tilt and pointer input select the visible soffit at world `295.269,141.357,height4.605`, resolving the Market source feature while preserving the player position. The [selection canvas](candidate-1/inspection-selected-east-below-soffit-canvas.png), SHA256 `6d71abecd1b5d52a1c23430fc49c6a34bf8c552334b8ae9176f6dfac8975ff6d`, shows the reticle on that surface. The two fixed scans in the broader report remain retained diagnostics.

The bridge captures show continuous vertical bank faces where the earlier image showed sky-colored gaps. The river and land still terminate against the background inside the view. The finite display extent remains a visual blocker for this viewpoint. Night water has a broad HDR reflection; that reflection is authored environment illumination. It does not represent observed Kyoto fixtures or current conditions.

## Construction and resource evidence

[Frozen production provenance](candidate-1/provenance.json) binds the generator, source files and derived geometry. The [source audit](../world/README.md) covers 106 arcade façade edges, 114 soffit sections and 39 bank segments. Connections attach to source footprint edges with an authored maximum span of 6m, preserve mapped cross-street openings and retain source roof/building geometry. Lower storefront construction has no tenant, entry or interior correspondence. Bank heights connect the existing authored ground/water levels; the mapped plan boundaries remain preserved.

[Required 3D byte audit](candidate-1/startup-audit.json) records daylight `4,156,102B` and night `4,148,866B`, within the `4,194,304B` limit. Daylight headroom is `38,202B`. This accounting covers required 3D resources; page JavaScript/CSS/fonts and deferred sections are separate. Mitsui NEAR is `3,150,508B` under its approved 3.5MiB exception; Daiya NEAR is `1,961,243B` under 2MiB. All 74 exported glTF files pass the asset validator, and compression preserves decoded positions, UVs and source indices. Actual rendering performance and primary draw submissions require the runtime reports.

The new bank geometry resides in streamed river cells. Resident ground geometry and canonical navigation are unchanged. Original standalone Shijō/Ginza assets remain unchanged. The source-backed river continuation is a separate candidate; no continuation improvement is claimed by these images.

## Candidate 2 source-backed river continuation

The packaged continuation is frozen at manifest `90c0873c5e540147630c970d4a2ea692c1583b3c407c175a2659d4e1e93934c8`. Its executed browser review appears below. The following resource and source checks establish the exact asset package.

[Production provenance](candidate-2/provenance.json) binds the independently audited input `57ae1683df42b8220591708cc9b01d71573da697fdf0290744aba44c41fc0006`. It preserves 4,019 complete official building footprints, retained mapped river boundaries, and 136 added bank segments. Surrounding land, flat display heights and neutral building materials are authored. The 500m display envelope follows the actual route positions inside the bridge cell's retention area. The source audit reports minimum conservative boundary view depth `275.463m` for the declared camera limits and aspect ratio at most `2.0`; fog ends at `270m`.

Building meshes use 100m spatial groups to retain frustum culling. A [source-based visibility estimate](candidate-2/pre-export-visibility.json) adds 38–42 visible material batches at the recorded Takase, Pontochō and bridge cameras. These estimates do not establish actual browser submissions. Primary-view limits remain 120 draw calls and 200,000 triangles.

| Resource | Transferred geometry bytes | Decoded glTF + binary bytes | Transfer limit |
| --- | ---: | ---: | ---: |
| Bridge BASE | 1,655,373 | 3,841,229 | 2,097,152 |
| Bridge NEAR | 1,740,511 | 4,060,035 | 2,097,152 |

The bridge descriptors preserve the ordinary decoded `file`, `bytes` and `sha256`. Each glTF/binary resource also declares a gzip `transport` with its own file, size and hash. `transferGeometryBytes` measures the encoded resources; `geometryBytes` and runtime retention continue to count decoded containers. GPU allocations require separate runtime measurements. Shared images are accounted for separately and reused.

The [package audit](candidate-2/river-package-audit.json) verifies 186 decoded resources and all four gzip resources, including byte-identical decompression. The [compression record](candidate-2/compression-report.json.gz), decompressed SHA256 `0651555917b4fdd0a126c91470bd15c126a5c6eab9213afa0c0779eab6e0218d`, records 74 glTF files with zero validator errors, zero decoded world-position error and exact UV/source indices. Bridge vertices with bitwise-identical attributes are reused; triangle order changes preserve complete oriented attributes, source tables and transforms. The existing 16-bit normal/tangent policy is recorded separately. No source footprint or visible triangle is removed by this packaging step.

[Required 3D bytes](candidate-2/startup-audit.json) are `4,159,329B` in daylight and `4,152,093B` at night, within 4MiB. Daylight headroom is `34,975B`. River geometry is deferred; page JavaScript/CSS/fonts remain outside this resource metric. The [coverage check](candidate-2/cell-coverage.json) covers all 10,974 navigation samples. The existing global source-index table is unchanged; river meshes retain complete deferred source tables.

The [initial byte measurement](candidate-2/initial-byte-breakdown.json) preserves the failed 4,356,484B bridge packaging result. [BASE](candidate-2/base-exact-dedup-experiment.json) and [NEAR](candidate-2/near-exact-dedup-experiment.json) experiments record exact vertex-reuse measurements. Original raw output remains in ignored `artifacts/neighborhood-20261023/art/river-raw-final/`; the verified package is `river-transport-candidate/`. The generator's optional `--river-context` reads the audited derived input. `optimize_neighborhood.mjs` performs the bridge-specific exact reuse, meshopt encoding and gzip validation. The input itself is retained as deterministic `river-context.json.gz` with its decoded SHA and byte count in provenance.

## Candidate 2 executed views

The tested local package is `f27fbe22db95a007010d2d46a661f27752a2361f5d9d84aaa4e4588c498e0dc5`. [Recorded captures](candidate-2/reviewed-captures.json) bind every unchanged image to its exact camera, player, lighting, resource identities and renderer counters. The arcade evidence includes actual approach/interior walking and deliberate camera inputs. River views restore exact previously walked viewpoints.

The finalized [browser record](candidate-2/browser-result.json.gz), decompressed SHA256 `731fd628b48a76cf4411d47636e79a6c0f76975237a32f63a84f5951ae75a1d7`, contains 67 passing checks and two failed stationary-inspection movement checks, in normal and reduced motion. Art, river, source and resource checks pass. The two interaction failures remain runtime release blockers for this tested package and are tracked separately from this visual disposition.

| Reviewed view | Daylight | Night |
| --- | --- | --- |
| Ordinary interior | [Canvas](candidate-2/arcade-inside-ordinary-day-canvas.png) | [Canvas](candidate-2/arcade-inside-ordinary-night-canvas.png) |
| Below-roof interior | [Canvas](candidate-2/arcade-below-roof-day-canvas.png) | [Canvas](candidate-2/arcade-below-roof-night-canvas.png) |
| Shijō Bridge | [Canvas](candidate-2/bridge-prior-actual-pose-day-canvas.png) | [Canvas](candidate-2/bridge-prior-actual-pose-night-canvas.png) |
| Takase River | [Canvas](candidate-2/takase-river-prior-actual-pose-day-canvas.png) | [Canvas](candidate-2/takase-river-prior-actual-pose-night-canvas.png) |
| Pontochō entrance | [Canvas](candidate-2/pontocho-entrance-prior-actual-pose-day-canvas.png) | [Canvas](candidate-2/pontocho-entrance-prior-actual-pose-night-canvas.png) |

The ordinary arcade frames retain the full traveller and readable forward paving. Deliberate lower-eye framing exposes the connected gray soffits, coloured central ridge, recessed bays and mixed timber/metal frames along the street. The foreground window no longer dominates this reviewed composition. Night pools remain legible on the actor and paving. These cues support the bounded covered-street correction against the retained reference; tenant identities, entry access and measured construction dimensions remain unclaimed.

At the matched bridge camera, water and shoreline now continue into haze. The Takase and Pontochō approach views also retain distant street/water continuity. No new termination seam is visible in these reviewed daylight/night frames. The bounded river-continuation and arcade-framing corrections pass this art review.

Cached-shadow river frames record 74 calls / 46,897 triangles at the bridge, 78 / 61,996 at Takase and 82 / 53,183 at Pontochō in both modes, within 120 calls / 200,000 triangles. QA establishes these primary counts using a new same-pose frame with unchanged shadow-update counters. Daylight arcade screenshots record 77–83 calls / 80,881–85,725 triangles. Night arcade screenshots record 263–269 calls / 356,013–360,857 triangles. Those arcade values retain full renderer totals, which can include shadow refresh; their primary-only counts are not inferred by subtraction.

Visible limits remain: repeated generic connector openings, dark glazing, uniform authored bank treatment, plain distant masses, small overview actors, dim Takase night foreground and strong coloured HDR reflections on water. Thin bright façade/ground seams are visible in existing connector geometry. These findings do not establish whole-neighborhood human realism or physical-device fluency acceptance.
