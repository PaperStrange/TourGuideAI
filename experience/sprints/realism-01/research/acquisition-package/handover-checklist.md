# Capture handover checks

Owner: capture / technical art; reviewer: rendering / QA. Prepared 6 November 2026.
Apply these checks to the [exact route scope](route-scope.json). A supplier response must
identify every conditional or unavailable item before a capture booking is considered.
Existing licensed measured sources can satisfy coverage after the same checks. Proposed
route corrections need identified coordinates, pedestrian connections, access and
obstacle evidence, plus approval of common benchmark changes before either renderer
uses them. The quoted baseline remains the approved 54-edge route.

| ID | Required supplier delivery | Measurable receipt check |
| --- | --- | --- |
| H01 Coverage identity | Edge-indexed capture inventory for T01, T02, C01 and T03; six sight approaches; exceptions with coordinates and reason | 54 distinct approved edge IDs, six sight IDs, no omitted connection; source/date/rights/method/limitations attached to every inventory record |
| H02 Street appearance | Calibrated overlapping original imagery of visible frontages, corners, entrances, glazing, eaves, roof undersides, street furniture, ground contacts, pavement and crossings | Each edge has forward/reverse daytime/night coverage status and source-file IDs; each missing or obscured feature has a mapped gap and agreed remedy |
| H03 Pedestrian geometry | Measured walking envelope, surface elevations, curbs, steps, thresholds, covered floors, bridge deck/grade/parapets and canopy clearance; access boundaries | Every edge can be checked against a continuous measured surface and obstacles; six sight poses and close-frontage poses are registered; inferred repair geometry carries separate labels |
| H04 Scale and registration | Horizontal CRS, vertical datum, units, frame transform, survey method, instrument/calibration details, control coordinates and independently measured check coordinates | Reproducible transform; independent horizontal/vertical residual report and uncertainty per control region; supplier proposes accuracy and checkpoint placement before booking for reviewer approval |
| H05 Raw files | Original RGB photographs/video with unaltered timestamps and camera/lens metadata; depth/LiDAR originals where used; separate redacted review copies where needed | Every delivered original is byte-hashed, indexed and readable; author/rightsholder, capture timestamp/timezone, location and processing role resolve for every file; retention and access restrictions are explicit |
| H06 Cameras | Intrinsics, distortion model/coefficients, extrinsics or trajectory with timestamps, image-to-pose mapping, calibration method and uncertainty | Every reconstruction image resolves to a valid calibrated pose; units, axis orientation and projection model documented; reprojection and coordinate checks rerun from supplied values |
| H07 Shared reconstruction source | One licensed reconstruction inventory for both textured mesh and Gaussian splat trials; raw RGB and measured control export | Both outputs identify identical permitted source IDs; omissions and per-output source use are reported; a vendor viewer or proprietary result alone leaves this item unqualified |
| H08 Independent evaluation | Separately reserved photographs/frames and survey checks selected before reconstruction; holdout inventory kept outside reconstruction, texturing and tuning input | Zero holdout IDs/hashes in either input manifest; authoring access to holdouts logged; evaluator retains originals, pose/lighting metadata and untouched hashes |
| H09 Daylight and night | Matched route/feature positions, capture dates and times, weather, exposure/white balance, bracket data where feasible, fixture locations/colors and lit/unlit surfaces | Both lighting conditions cover every edge and sight; lighting changes, motion, closures and occlusions appear in the exception register; vendor states equipment permitted by operators |
| H10 Editable derivatives | Textured mesh in glTF/GLB with textures; splat representation with documented format, attributes and units; source-to-output mapping, tools/versions/settings and processing logs | Both representations load in the intended inspection tools; texture/color conventions and splat basis/opacity/scale semantics are declared; hashes reproduce identity; exports and any conversion fees are itemized |
| H11 Permissions and rights | Capture/access permission plus written commercial rights to process both representations, modify/repair, publish/download through the website, retain permitted originals, refresh and transfer to another supplier | Rightsholder and scope resolve for each source and third-party element; operator/shop permissions, bystander treatment and restrictions are attached; costs/expiry/territories/attribution obligations are explicit |
| H12 Delivery and remedy | Manifest with SHA-256/byte sizes, folder inventory, transfer method, delivery dates, retention, reshoot/repair process and quote validity | All bytes/hashes match; all mandatory fields parse; exceptions are reviewed with explicit acceptance or a remedy/date before the acquisition is accepted |

## Reference coverage and source separation

The existing [trial camera settings](../../experiments/trial-definitions.json) define
1.7 m eye height, both walking directions, daylight/night, four sight yaw offsets,
two stationary pitch angles and physically reachable 2–5 m frontage views. The supplier
must mark reachable positions against measured current access.

| Evaluation coverage | Required inventory cells | Contents of each cell |
| --- | ---: | --- |
| Route movement | 54 edges × 2 directions × 2 lighting conditions = **216** | Registered independent reference-file IDs, coverage extent and capture conditions; explicit missing coverage status |
| Stationary sight views | 6 sights × 4 yaw offsets × 2 pitch angles × 2 lighting conditions = **96** | View pose, visible feature IDs and independently reserved reference-file IDs or a documented inaccessible view |
| Close façades / scene details | Supplier proposes reachable viewpoints for each required feature | Measured distance, feature ID, capture pose, visibility and independent reference-file IDs |

Cells are coverage checks, not a count of unique photographs. One reference can cover
several cells only when its documented view supports them. Supplier must state actual
image counts, overlap, resolution and occlusion limits. Holdouts are captured separately
from training frames, without adjacent-frame reuse that would invalidate the comparison.
Already inspected reference photographs remain context evidence; fresh isolated capture
supports the next blind evaluation.

## Permission and survey checks before booking

For Nishiki, include the operator's one-month application lead time, confirmation of
the commercial reconstruction category and permitted handheld equipment. The published
individual/YouTube guidance prohibits installed lighting and large equipment and
discourages tripods/selfie sticks. Obtain the applicable approved method, visitor
privacy handling and rights scope in writing. Include Shinkyōgoku, shrine approach,
river/bridge restrictions and any shop-specific permission separately.

The supplier must propose measured accuracy and independent checkpoint placement.
Reviewers approve those values before capture; this package supplies no invented
centimeter accuracy claim. Ground uncertainty, deck transitions and covered-floor
registration must support the shared pedestrian volume and the existing actor radius
of 0.32 m. Geometry outside measured access stays unqualified.

## Acceptance authority

Capture / technical art verifies H01–H07 and H09–H12. QA controls H08 and independently
checks file identities, source separation, metric registration and documented coverage.
Missing mandatory data keeps the affected item unqualified. A proposed exception must
identify the affected edge/view and be accepted explicitly before source acceptance.

Product release still requires the existing realism, immersion, independent discovery,
navigation and physical-device performance gates. Acquisition acceptance establishes
usable evidence and source rights; it does not establish those experience results.
