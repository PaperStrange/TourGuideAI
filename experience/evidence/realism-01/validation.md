# Organizational sprint validation

31 October 2026 · Method: local filesystem verification and fresh Git-tree archive.

| Check | Evidence |
| --- | --- |
| Portable Markdown links and JSON | [Validator output](validation-result.json); Markdown parsed with pinned markdown-it-py |
| Competitor evidence identity | All 17 retained originals checked against SHA-256 and byte counts in the provenance manifest |
| Source identity | All nine source records checked against retained bytes; this does not inspect original textured geometry |
| Trial reproducibility | Geography hash, 55 nodes, 54 continuous edges, route length, six sights, four ranges, endpoints and sight membership checked |
| Checkout independence | Same validator executed against a fresh archive of the staged Git tree; ignored downloads/profiles absent |
| Git exclusions | Download, browser-cookie and generated-run sample paths match existing `artifacts/` ignore rule; no workspace artifacts staged |
| Patch hygiene | `git diff --cached --check` |

Reproduction uses the [sprint instructions](../../sprints/realism-01/README.md) and
[validator](../../sprints/realism-01/verify.py). From the repository root, archive
the staged tree into an empty ignored validation directory:

```sh
sprint_tree=$(git write-tree)
mkdir -p artifacts/realism-01/validation/checkout-review
git archive "$sprint_tree" | tar -x -C artifacts/realism-01/validation/checkout-review
PYTHONPATH="$PWD/artifacts/realism-01/tooling" python artifacts/realism-01/validation/checkout-review/experience/sprints/realism-01/verify.py --root artifacts/realism-01/validation/checkout-review
```

Use a new empty destination for each final check. Generated validation runs remain
in the ignored workspace; the retained result is data from the actual validator.
The committed files and their Git identities bind this organization checkpoint.

These checks establish local link target existence, provenance completeness and
file integrity. They do not test external URL availability, original source
appearance, runtime rendering, physical-device latency or participant acceptance.
Application source and deployed assets are unchanged in this delivery.
