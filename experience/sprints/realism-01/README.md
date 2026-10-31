# Realism 01 · Kyoto route

31 October 2026 · Sprint owner: delivery lead · Status: organization and evidence intake.

Deliver the complete **1,353.444 m, six-sight Shijō East walk**, with recognizable
architecture, continuous navigation and a coherent English/Chinese journey in
daylight and night. The organizational sprint prepares the source review and
controlled trials. Production renderer selection and milestone acceptance remain open.

## Work and evidence

| Read | Purpose |
| --- | --- |
| [Backlog](backlog.md) | Owners, dependencies, deliverables and completion evidence |
| [Acceptance matrix](acceptance.md) | Independent discovery, visual fidelity, journey and performance gates |
| [Decisions](decisions.md) | Approved scope and pending representation decision |
| [Competitor board](research/competitors.md) | Actual screenshots, publisher frames and bounded observations |
| [Source coverage](research/source-coverage.md) | All sights and connecting streets, with missing appearance data |
| [Licensing receipts](research/licensing-receipts.json) | Source dates, rights, hashes and limitations |
| [Capture requirements](research/capture-requirements.md) | Itemized acquisition proposal; supplier prices remain unquoted |
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
validation record. This sprint introduces no runtime API changes.

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
