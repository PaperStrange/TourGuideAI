# Startup A/B observation · 2026-10-24

The executed run retains **19 passing and 2 failing checks**. It ran from
02:53:45.196 to 02:54:55.238 UTC with system Chromium 151.0.7922.173 and the
default software graphics path. Both packages used 1440×1000/DPR1, normal
motion, the same daytime opening and 10 Mbit/s / 80 ms CDP network conditions.
Each package had one fresh-context cold entry and one cached full reload.

The two failed checks compare each warm entry with candidate 9's cold reference.
Independent exact-field comparison finds one difference in each failure:
`player.edgeDistance` is `0` cold and `0.000334` m after reload. Player x/y,
height, heading, desired saved view and selected detail levels remain identical.
Comparing candidate 9 cold with candidate 10 cold, and candidate 9 warm with
candidate 10 warm, produces **zero differences** in those original fields,
the actual rendered camera and the actual ground observation. This additional
analysis leaves both executed failures unchanged.

| Observation | Candidate 9 cold | Candidate 10 cold | Candidate 9 warm | Candidate 10 warm |
| --- | ---: | ---: | ---: | ---: |
| First usable view, ms | 8,074.2 | 7,799.2 | 2,993.0 | 2,750.9 |
| Requested detail ready, ms | 20,572.7 | 16,558.0 | 13,596.0 | 12,970.8 |
| Detail with pending shadow flags cleared, ms | 21,520.9 | 17,390.9 | 14,338.2 | 13,969.7 |
| Draw counter at that final observation | 18 | 13 | 17 | 16 |
| Shadow invalidation counter | 14 | 14 | 14 | 14 |
| Observed preview DOM mutation records | 560 | 185 | 572 | 185 |
| Old value equals callback-time final value | 537 | 162 | 549 | 162 |

Every entry reached all requested detail levels without an asset or page error.
Each final scene retained six cells, three at near detail, with maximum two
downloads and one attachment. Resident geometry remained 32 meshes / 21,654
triangles. Streamed geometry increased from 169,539 to 169,547 triangles, matching
the eight platform boundary triangles. Retained section bytes increased by 355
to 8,323,123 B. The complete texture estimate remained 47,906,815 B with its
existing declared exclusions. Final renderer totals were 153 calls / 291,559
triangles for every entry; these totals include shadow passes and are separate
from the primary-frame budget checks. Random texture UUIDs differ across browser
instances and do not change their dimensions or memory estimates.

The observed DOM-write and frame reductions are retained with their timing.
There is one observation per condition, and candidate 10 also contains asset
changes. They establish neither an isolated causal effect nor a reliable speedup.
Shadow invalidations count requests rather than GPU shadow-pass duration.
Attribute mutation comparisons can include a batched A→B→A sequence; they do not
prove a redundant assignment. RAF observer work and counter gaps, mutation
callback cost, cache records and actual HTTP response hashes remain in the report.
The separate standard performance run, Q03, native visibility and physical-device
performance retain their own outcomes.

## Exact evidence

- Candidate 9 package: `1720fc5907c0c6f2b292aa0e728bcaad8ddbd6c776de7aec2b5a35a513609c9b`.
- Candidate 10 package: `afc7934f1b0706ea59caae5e4b1a97a6a3f6366ac65b24cbe79bfc2c2d94e574`.
- Original report SHA256: `bc9bd0f8a05c0a2734de2d548b5d36bac300aabaa876ff961117ff57e5d25410`.
- Executed driver SHA256: `ed6a6ad5116bd55ac3d3d85699686c35c915a507f578f412371c7f2109826567`.

[result.json.gz](result.json.gz) and
[startup-ab.executed.mjs.gz](startup-ab.executed.mjs.gz) decompress to the exact
executed bytes. [analysis.json](analysis.json) retains the independent original
failure analysis, same-cache comparisons, complete resource observations and
compressed/decoded hashes. [file-differences.json](file-differences.json) records
all 67 changed package paths; both complete 446-file manifests remain in the raw
report. [runtime-ui.diff](runtime-ui.diff) records the two runtime/UI changes from
source `9b973f0` to `4b87555`. [protocol.md](protocol.md) preserves the executed
diagnostic's conditions and limits, and [run.log](run.log) retains its execution
output. The standard performance tool was unchanged.
