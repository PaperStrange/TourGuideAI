# Benchmark V1 · Kyoto representation selection

5 November 2026 · Protocol identity: `realism-v1`; manifest: `realism-01-protocol-v1` · Owners: product,
rendering, art and QA. The approved deliverable is the **1,353.444 m route, 55 nodes,
54 edges, six sights and 13 streaming cells**. Every connecting street is included.
The [lesson register](lessons.md), [acceptance matrix](acceptance.md) and
[controlled trials](experiments/README.md) apply to the same milestone.

## Frozen comparison and evidence

Before comparison, freeze the build, runtime assets, source files, held-out reference
photographs, common reviewed ground/collision surface, camera trajectory, interface,
rendering quality, lighting settings and run order. Record SHA-256 identities and
the tool versions that produced them. Hold out reference photographs from both
geometry reconstruction and material authoring. Any changed input starts a new
comparison identity and requires repeating the matched condition.

Use versioned `BenchmarkManifest` and `RunResult` records to bind candidate, build,
asset/source identities, exact device/driver, trial, observations, gate status and
evidence. Every result uses `pass`, `fail` or `unverified`, with its measurement
boundary and source record. Missing observations cannot produce a pass. Keep all
attempts, interruptions, frame-counter gaps, unavailable responses and incomplete
traversals. Separate publisher footage, source inspection, deterministic camera
runs, native-input observations, physical-device measurements and participant
results throughout the scorecard.

The deterministic trajectory compares rendering at identical poses. A separate
native-input walkthrough tests movement, turning, close approach, pause, panels,
return and resume. A requested camera value cannot establish visible movement;
observe the actual submitted camera/state and its corresponding draw.
Instrumentation is read-only and remains outside ordinary user journeys. No public
service API changes are required for this benchmark.

## Technical conditions and gates

| Condition | Frozen value |
| --- | --- |
| Physical devices | Windows 11 laptop, Intel Iris Xe, 16 GB, Chrome; MacBook Air M1, 8 GB, Safari |
| Device record | Exact model, OS/browser/driver version, power mode, thermal state and graphics identity |
| View | 1440 × 1000 viewport, DPR 1; record actual canvas dimensions |
| Camera | Eye 1.7 m above reviewed ground, vertical FOV 60°, walk 1.4 m/s |
| Network | 10 Mbps and 80 ms; record the actual throttling method and limitations |
| Conditions | Each candidate × device × English/Chinese × daylight/night |
| Repetitions | Three independent sessions per condition, each one cold entry and three warm entries: 12 entries per condition |
| Order | Rotate candidate order across sessions; retain every attempt and predeclare order |
| Route | All 54 edges in both directions, including covered passages, connections and bridge approach |

Physical-device access is a prerequisite. Software-rendered host observations are
diagnostic evidence and do not close physical-GPU gates. Submitted draws do not
measure physical display presentation latency.

| Gate | Required observation |
| --- | --- |
| First usable | Separately record readiness, grounded scene, enabled controls and a submitted draw; ≤8 s cold and ≤3 s for every warm entry |
| Full-quality starting view | Required geometry, materials, lighting and detail resident, followed by a later submitted frame containing them; ≤8 s cold and ≤3 s for every warm entry |
| Input response | Event timestamp through actual visible camera/state change to its corresponding draw, including browser queue; p95 ≤100 ms |
| Frame cadence | During walking and turning, including streaming; p95 ≤33.3 ms; report each route region and action group, with missing intervals unverified |
| Together locale Q03 | Each warm locale action <500 ms using the original click-to-observed-document-language boundary |
| Hidden/resume | Actual browser hidden transition, suspended scene work, subsequent visible transition and correct state restoration |
| Continuity | Complete forward/reverse route recordings, all edge IDs accounted for, and a location-indexed defect map |

The full-quality 8/3-second limit is a new gate. Preserve historical first-usable
results and historical detail-residency observations under their original names.
The current third-person starting-segment probe has different conditions from this
eye-height full-route protocol; a comparison requires matched new runs.

| Resource | Limit / accounting requirement |
| --- | --- |
| Startup transfer | ≤4 MiB |
| Ordinary section | ≤2 MiB |
| Reviewed Mitsui near detail | ≤3.5 MiB exception, identified explicitly |
| Concurrent work | At most two downloads and one decode/attach |
| Retained sections | ≤64 MiB |
| Primary mesh view | ≤200,000 triangles and ≤120 draw calls |
| Combined textures | ≤96 MiB including HDR, PMREM, actor, contact and shadow targets |
| Transient residency | Record old/new LOD overlap, decoded assets, temporary allocations, splat sorting and buffers, decoder/geometry overhead and observed peaks |

Unknown resource use stays unverified. A splat representation must report its own
buffer, sorting and rendering costs; a mesh triangle count cannot close those
measurements. KTX2 savings require actual loader and memory-accounting support.

## Independent participant protocol

Recruit **32 fresh, unfamiliar, non-author participants for each compared product**,
including the existing baseline when claiming an improvement over it. Randomly
assign eight per product to each cohort: EN/day, ZH/day, EN/night and ZH/night.
Use a separate fresh group for each product; a participant's exposure to another
candidate or reference photo disqualifies that exposure as unaided discovery.
Lock the cohort assignments, task wording and analysis before data collection.

1. Start from the ordinary homepage or shared entry assigned by the protocol.
   Hide sight labels, map pins and arrival prompts during the first walk; retain
   control guidance and authentic real-world signage. Record spontaneous notice
   of each sight before presenting photos or another candidate.
2. Ask participants to match the noticed sights to held-out photographs. For each
   sight, success requires both spontaneous notice and correct matching. Require
   **at least 7/8 successes for every sight in every cohort**.
3. Observe the unassisted entry → walk → inspect → keep view → return journey.
   Require **at least 7/8 completions per cohort**. Record assistance, abandoned
   steps and missing observations in the denominator.
4. Ask separate realism and immersion questions on a 1–7 scale. Require **median
   ≥5/7 for each measure in each cohort**. Record the reason for each rating.
5. Ask the fixed usefulness question: **“How much did this experience help you
   choose a place you would visit or return to?”** Use a 1–7 response and record
   the participant's reason. Record voluntary saving separately from completion
   of an instructed saving task.

The participant is the statistical unit. Each person's six recognition answers
remain grouped. Report cohort counts, exclusions, assistance and incomplete data.
These exploratory cohorts establish the declared acceptance evidence; they do
not establish population-wide preference. Recruitment remains a dependency until
actual participants have been arranged.

## Scoring and selection

Rights, source integrity, route continuity, physical performance, resource budgets
and the participant acceptance thresholds are mandatory. Score only complete,
eligible candidates. Predeclare one final A/B pair before quality testing.

| Component | Weight | Calculation |
| --- | --- | --- |
| Realism | 25 | Participant 1–7 rating normalized by `(rating − 1) / 6`; equal cohort weight |
| Joint discovery and recognition | 20 | Each participant's six joint outcomes averaged; equal cohort weight |
| Immersion | 35 | Participant 1–7 rating normalized by `(rating − 1) / 6`; equal cohort weight |
| Travel usefulness | 10 | Fixed 1–7 response normalized by `(rating − 1) / 6`; equal cohort weight |
| Production/maintenance labor | 5 | `100 / (1 + personHours / referenceHours)`, divided by 100 for weighting |
| Cash cost | 5 | `100 / (1 + cash / referenceCash)`, divided by 100 for weighting |

Estimate the same first-year work for both products: producing the complete route,
**10,000 complete visits per month**, and **one refresh of 20% of its content**.
Include acquisition, processing, review, hosting and maintenance. Preserve raw
quotes, currency, conversion date, ranges and assumptions. Before quality testing,
freeze each reference as the median of the declared pair's complete estimates,
with a minimum positive reference of one person-hour or one currency unit.
Unknown costs block the complete score; do not substitute zero or redistribute
their weight.

A winner requires all of the following:

- At least **5 points out of 100** total advantage.
- Neither realism nor immersion has a lower point estimate.
- A positive lower bound of the **95% participant-level, cohort-stratified
  confidence interval** for the human-quality difference (the combined 25/20/35/10
  components). Use 10,000 bootstrap resamples with a seed derived from the frozen
  manifest SHA-256; resample participants independently within product/cohort and
  retain each participant's complete response vector. Use the 2.5th and 97.5th
  percentiles and report the method, seed and complete interval.
- The total advantage survives the declared cost uncertainty ranges, including
  the unfavorable cost combination for the proposed winner.

Otherwise record **inconclusive**. If only one candidate qualifies, report absolute
acceptance without a superiority claim. The final scorecard includes paired views,
the route defect map, cohort results, loading timelines, cost ranges and linked
pass/fail/unverified evidence. Technical trials establish eligibility; final
selection follows comparable full-route builds and the required physical/human
results.

## Calibration and delivery

The [draft benchmark manifest](benchmark-manifest.json) records actual missing
candidate/source/device inputs as prerequisites. [Manifest](schemas/manifest.schema.json)
and [run-result](schemas/run-result.schema.json) schemas define versioned input
records. The [technical evaluator](../../tools/realism-benchmark.mjs) validates
records and technical eligibility; the participant analysis and final weighted
selection described above require their own collected evidence and analysis.

The frozen manifest includes `interactionPlan` with stable action IDs for every
required walk and turn, and `runOrder` for the complete condition matrix. Each run
retains dispatched input IDs, original event and receipt timestamps, and matching
response IDs. Missing dispatches or responses remain unverified even when other
inputs succeed. Actual run start times must follow the declared order, with
candidate order rotated across sessions for each device/language/lighting condition.
Declare comparison kind as `renderer`, `product` or single-candidate `absolute`.
A renderer pair requires matching source, camera, ground/collision, interface and
common quality/lighting hashes. The draft leaves these execution inventories
unfilled until their required inputs are qualified.

From the repository root:

```sh
node experience/tools/realism-benchmark.mjs experience/sprints/realism-01/benchmark-manifest.json --output=artifacts/realism-01/runs/benchmark-validation.json
node experience/tools/realism-calibration.mjs artifacts/realism-01/runs/calibration
```

The draft manifest yields unverified acceptance because the required candidate
and device observations are absent. The [retained calibration scorecard](../../evidence/realism-01/benchmark/scorecard.md)
and [machine-readable result](../../evidence/realism-01/benchmark/calibration.json)
preserve historical diagnostic evidence.

Use retained observations to check that the evaluator preserves evidence scope:

| Retained observation | Required interpretation |
| --- | --- |
| [Candidate 13](../../evidence/neighborhood-20261024/performance/candidate-13/README.md): cold 7,885.6 ms, warm 2,767.7 / 2,766.7 / 2,647.7 ms | Historical first-usable thresholds passed for the observed entries; full Benchmark V1 acceptance unverified |
| Same report: event timestamp p95 892.0 ms; handler p95 18.1 ms | Event-timestamp gate failed; retain browser queue within response measurement |
| Same report: frame p95 972.3 ms, eight counter gaps, single-draw orbit actions | Observed cadence failed; skipped intervals and orbit cadence unverified |
| Same report: requested detail resident at 19,001.2 / 12,459.2 / 12,857.7 / 11,760.8 ms | Retain residency times; subsequent full-quality draw boundary unmeasured |
| [Q03](../../evidence/neighborhood-20261024/performance/candidate-13-q03/README.md): 1,090.0 / 1,102.5 / 1,100.2 ms | Every observed action failed the original <500 ms threshold |
| [Native visibility](../../evidence/neighborhood-20261024/performance/candidate-13-native-visibility/README.md): 13/13, zero work over 2,019.6 ms | Separate actual hidden-state evidence; preserve the original headless unobserved transition |

Validate final-quality-after-draw ordering, actual camera changes, queued input,
missing frame intervals, incomplete traversal and absent reports. Exercise saved
views, Maps stop order and segment continuity, EN/ZH states, GPS consent/manual
recovery and service errors with their own journey evidence. Validate tracked
documents and hashes in a clean checkout. Update the backlog and agent checkpoint,
commit and push each validated delivery. Public release requires the complete
acceptance matrix and verification of published bytes.
