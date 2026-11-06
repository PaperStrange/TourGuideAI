# Realism 01 · Kyoto route

6 November 2026 · Sprint owner: delivery lead · Status: Benchmark V1 and original
source inspection delivered; appearance, ground and capture qualification open.

Deliver the complete **1,353.444 m, six-sight Shijō East walk**, with recognizable
architecture, continuous navigation and a coherent English/Chinese journey in
daylight and night. The route includes 54 edges, 55 nodes and 13 streaming cells.
Production renderer selection and milestone acceptance remain open.

## Work and evidence

| Read | Purpose |
| --- | --- |
| [Backlog](backlog.md) | Owners, dependencies, deliverables and completion evidence |
| [Acceptance matrix](acceptance.md) | Independent discovery, visual fidelity, journey and performance gates |
| [Decisions](decisions.md) | Approved scope and pending representation decision |
| [Benchmark V1](benchmark.md) | Frozen conditions, measurements, human protocol and selection rules |
| [User lessons](lessons.md) | Requirement → test → evidence → decision traceability |
| [Historical calibration scorecard](../../evidence/realism-01/benchmark/scorecard.md) | Recomputed retained observations and explicit current acceptance gaps |
| [Competitor board](research/competitors.md) | Actual screenshots, publisher frames and bounded observations |
| [Source coverage](research/source-coverage.md) | All sights and connecting streets, with missing appearance data |
| [Original-source visual board](../../evidence/realism-01/qualification/README.md) | 73 decoded tiles, 18 actual browser captures, six-sight identity and ground review |
| [Licensing receipts](research/licensing-receipts.json) | Source dates, rights, hashes and limitations |
| [Capture requirements](research/capture-requirements.md) | Itemized acquisition proposal and public price references; complete-route quote remains unavailable |
| [Controlled trials](experiments/README.md) | Matched inputs, routes, viewpoints and comparison protocol |
| [Evidence store](../../evidence/realism-01/README.md) | Reviewed artifacts and validation records |

## Storage and handoff

| Location | Rule |
| --- | --- |
| This sprint directory | Versioned briefs, backlog, decisions, source receipts and trial definitions |
| `experience/evidence/realism-01/` | Versioned reviewed snapshots, manifests and measurement reports |
| `artifacts/realism-01/` | Ignored downloads, intermediates, browser profiles, generated runs and clean-checkout validation |
| Existing application and city-pack directories | Production code and approved runtime assets after the representation decision |

Each evidence record includes source, date, rights, location, method, limitations,
byte count and SHA-256. Preserve capture dates separately from retrieval/publication
dates. Publisher imagery is research reference; product reuse rights require review.
Keep raw media out of production asset bundles.

Use `downloads/`, `intermediates/`, `browser-profiles/`, `runs/` and `validation/`
inside the ignored workspace. These directories are created locally and can be
recreated on any checkout. Refer to optional local artifacts using code paths;
required review evidence must resolve within the tracked repository.

The [agent checkpoint](../../docs/agent-checkpoint.md) is the integration entry.
Update the backlog and checkpoint with each validated delivery, then commit and
push to `chore-sow-delivery-plan`. Publish a runtime preview only with its own
validation record. Benchmark instrumentation remains read-only; public service
APIs are unchanged.

## Delivery sequence

| Phase | Required output | Decision boundary |
| --- | --- | --- |
| 1 · Benchmark | Lesson register, measurement boundaries, result validation and historical calibration; arrange device/participant access | Diagnostic results retain their original scope; acceptance remains evidence-required |
| 2 · Sources | All 54 edges mapped to reviewed objects, appearance, rights, dates and ground; itemized acquisition proposal for gaps | Actual source qualification and approved capture where needed |
| 3 · Controlled trials | Matched frontage, market/shrine and river/bridge trials | Technical eligibility and one frozen final A/B pair |
| 4 · Full-route candidates | Comparable complete builds with the same journey, saves, EN/ZH and daylight/night | Every route edge and both candidate identities ready for acceptance |
| 5 · Selection/release | Physical-device and fresh-participant results, visual scorecard, cost uncertainty and public-byte verification | Apply Benchmark V1 selection rules and release gates |

Identify physical devices, participant recruitment and capture needs during phases
1–2. Their absence blocks dependent gates. A technical shortlist does not establish
the eventual A/B winner. With one qualified candidate, report absolute acceptance.

## Validation

Install the pinned review dependency into the ignored workspace:

```sh
python -m pip install --target artifacts/realism-01/tooling -r experience/sprints/realism-01/requirements.txt
PYTHONPATH=artifacts/realism-01/tooling python experience/sprints/realism-01/verify.py --root .
```

Run the same validator against an archive of the staged Git tree before committing.
It checks Markdown link targets, JSON decoding and evidence hashes. Check Git ignore
rules for raw downloads and browser profiles, and review the staged file list before
pushing. Record actual results in the evidence store; no browser performance or human
acceptance is inferred from documentation validation.
