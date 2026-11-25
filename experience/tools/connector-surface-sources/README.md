# Restored fitting images and reserved evaluation views

`intake.py` uses the previously retained complete Panoramax collection snapshot
to select fitting ranks 68–71 and reserved ranks 67/72. Source metadata, license,
photographer, camera dimensions and original fitting-image hashes are checked
before the inputs reach reconstruction. The source membership record precedes
acquisition and remains immutable.

The current [retained evidence](../../evidence/realism-01/connector-surface-sources/README.md)
contains exact metadata responses, preview JPEGs, image receipts and offline
checks. Native HD files remain in the ignored workspace. The fitting folder is
`artifacts/realism-01/connector-surface-sources/fit/`; the reserved folder is
`artifacts/realism-01/connector-surface-sources/holdout/`. Each contains
`selected.json`, source metadata, `<id>-hd.jpg`, `<id>-sd.jpg` and individual
acquisition receipts.

With Python 3.12 and [requirements.txt](requirements.txt), restore into a new
ignored workspace using:

```sh
python experience/tools/connector-surface-sources/intake.py reserve
python experience/tools/connector-surface-sources/intake.py acquire
python experience/tools/connector-surface-sources/intake.py verify
```

`reserve` requires the assignment file to be absent. `acquire` reuses a cached
file only after exact receipt verification and checks restored fitting bytes
against the immutable prior receipt. `verify` reads the tracked evidence and
checks its source bindings independently of the artifact workspace. `retain`
packages an inspected acquisition for this increment; existing reviewed evidence
must be preserved before preparing a subsequent acquisition.

These are neighboring views from one capture family. They must remain excluded
from geometry, densification, refinement and texture fitting. Any pose-only
localization and held-out pixel assessment needs its own recorded observations
and acceptance criteria. Geographic coverage, metric floors, real-world scale
and the full 1.35 km route remain separate requirements.
