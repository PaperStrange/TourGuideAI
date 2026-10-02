---
name: tourguide-fact-integrity
description: Use when working on ANY part of the TourGuideAI 2.5D travel-simulation reboot — city-pack data, scenes, itinerary/guide export, photo memoir, narrative or LLM code, roadmap decisions, or when about to add a monetization or progression mechanic. Enforces the fact-layer provenance contract, the fact/narrative separation, the "drop don't correct" rule for LLM output, and the paid-realism red line.
---

# TourGuideAI fact integrity

This project is a 2.5D travel-simulation game whose output is **executed in the real world**: the player plays in-game and exports a travel guide they then follow in Japan, then returns real trip photos into a memoir.

That single fact is the source of every rule below. **A hallucinated place, a stale opening time, or a wrong fare is not a cosmetic bug — it strands a real person in a city where they do not speak the language.** The legacy version of this project failed precisely because it treated generated content as advice rather than as instruction.

## Before you report anything as verified

**六条，因为每一条都对应一次我实际犯过的错。**

1. **引用来源就打开来源。** 不要引"我读过的文件里的某句"。要引**那一句**，回原始字节核**主谓**——我引 `★四条烏丸、交差点の角の立地。` 说"银行在街角"，而该句主语是**建物**、谓语是**立地**。
2. **我算出来的中间值，先与独立来源交叉验证，再拿它当证据。** 我报过一个"三个互相矛盾的实测事实"，其中两个是我自己的算术（datum 平移减了两次）。
3. **说"已落档"之前先查。** 我说三个错都记了，实际只记了一个。
4. **"哪些文件要改"沿【数据流】走，不沿卡里提到的字段走。** 我漏了 `evidence/tools/block-doors.json`——它是 `attestations/` 的**上游**，只改下游会在下次构建被静默回退。
5. **写进卡或文件的判据，必须是【能失败的】**，并**贴出它失败过的输出**。只见过通过的检查还没有被测试过——`gate-scene-read` 的 `R3` 把版本写成字面量，于是在容器换代后仍然通过。
6. **不知道就说不知道。** 把假设写成事实是本项目最严重的失职；而"我以为我核过了"与"事实"之间没有中间地带。

**而这六条的效力不在于被写下来。** 本项目自己已经证明四次：**写下教训不阻止它发生，接线才阻止。** 所以每条后面那句"我犯过"是必须的——**它把规则绑在一个具体的、可查的实例上，而不是一个抽象的告诫。**

## The iron rules

1. **The game world IS the fact.** Places, hours, prices, transit, and travel times in the game must equal the real world's. The player's playthrough is the itinerary — the guide is a projection of it, not a separate generated artifact.

2. **Facts come only from the fact layer.** `city-pack/**` data (or an explicit runtime fetch from an allowed provider) is the ONLY permitted source of place names, addresses, coordinates, opening hours, prices, fares, and transit legs. The LLM never authors any of these.

3. **Every fact carries `source_url` + `verified_at`.** A fact without provenance does not exist. It must not be rendered, exported, or defaulted to something plausible.

4. **Facts are read-only to every layer above them.** Narrative and presentation layers receive a frozen `GuideDoc`; they never write fact fields.

5. **Drop, don't correct.** When a validator, schema check, or provenance gate rejects content, discard it. Do **not** repair it, guess a substitute, or fall back to a fluent-sounding value. The safe degradation is a plain deterministic template, never an invented detail.

6. **No paid shortcut may change the time or money ledger.** Any mechanic that lets money skip waiting, skip queues, fast-travel, or buy extra time breaks the equality between in-game cost and real cost, which destroys the guide's executability.

## Freshness is tiered — treat the tiers differently

| Tier | Examples | Handling |
|---|---|---|
| **Static** | coordinates, address, station names | curate once, re-verify yearly |
| **Semi-static** | opening hours, admission fees, closed days | re-verify quarterly; always surface `verified_at` in the guide |
| **Dynamic** | temporary closures, seasonal hours, events | never cache as truth; query at play time or render an explicit "confirm before you go" affordance |

Every exported guide must give the user a Plan B and a buffer for any semi-static or dynamic fact. "We told you the hours, you should have checked" is a product failure, not a user error.

## The fact-layer contract (city pack)

```
city-packs/<city-id>/
  pack.json      { schemaVersion, cityId, nameLocal, nameEn, ... , sources[] }
  places.json    [{ id, nameJa, nameZh, nameEn, lat, lng, category,
                    hours[], admission{}, closedDays[],
                    source_url, verified_at }, ...]
  transit.json   [{ from, to, mode, lineName, minutes, fareIC, fareTicket,
                    transfers, source_url, verified_at }, ...]
  <city-id>-osm[-<domain>].json
                 ODbL 1.0 Derivative Database: every OSM-derived value lives
                 here, and places.json / transit.json reach it by placeId.
                 Attribution and the licence URI travel inside the file.
```

**Coordinate representations — settled 2026-09-30, do not re-litigate.** Two frozen
documents used to disagree about this; the ruling is:

- `lat` / `lng` (decimal numbers) are **canonical in the fact layer**, because they are what
  this schema and `validate-city-pack.mjs` specify.
- **Integer microdegrees** (`latUdeg` / `lonUdeg`) are the **provenance form**. They live in
  the `*-osm*.json` half, reached via `osmRecord`, and they are what the projection contract
  computes with. The fact layer is ~9.1 cm east-west per microdegree, so no place record may
  claim finer precision than that.
- **No second alias is permitted — meaning no second *value*.** Carrying one number in two
  representations, with one authoritative and the other recomputed and asserted, is *not* the
  forbidden alias. `validate-city-pack-v2.mjs` check (C) recomputes the twin and fails if the
  two ever diverge, so the two spellings cannot drift apart.

Rules the validator enforces mechanically:

- `lat` / `lng` are numbers in range; every fact record has a non-empty `source_url` (http/https) and an ISO `verified_at` date that is not in the future.
- `hours` / `admission` / `closedDays` are **semi-static**: each entry carries its own `source_url` + `verified_at`, because a fee or a closing time with no source of its own is the failure that strands someone outside a locked door. `fail`-closed: free-text hours are not a fact.
- Every record declares a `factTier` (`static` | `semi-static` | `dynamic`), derived from the fields it carries. Dynamic facts (temporary closures, seasonal hours, event dates) are **never cached as truth**.
- No fact record may carry narrative-only fields (`flavor`, `story`, `quote`, `description_llm`). Narrative lives in the narrative layer, keyed by `refFactIds`.
- No fact record may carry an agent self-assessed field (`confidence`, `score`, `certainty`). It is not mechanically checkable and it dilutes the "every field has a checkable source" rule.
- A place referenced by transit or itinerary must exist in `places.json` (no dangling ids). **Drop the leg rather than redirect it to a place the player did not ask for.**
- A record that has sourced facts but **no position in any source** is not a place record. Keep it out of `places.json`, keep it with its provenance in an `attestations/` file, and name the gap — never derive a coordinate from an address string.

Validate with:

```bash
# the contract gate (provenance presence)
node docs/handOff/dsh-bundle-tourguide-2.5d/tools/validate-city-pack.mjs <city-pack-dir>

# the adequacy gate (does each source actually support the value?) — run from the repo root,
# from inside the pack, or from anywhere; add --json for CI
node city-packs/<city-id>/validate-city-pack-v2.mjs [repo-root] [pack-dir] [--json]
```

Exit code `0` = pass, `1` = contract violation (the report names every offending record), `2` = usage error. `--json` prints one JSON object on one line (`passed`, `failed`, `exitCode`, `checks[]`, `violations[]`, `evidenceSha256`) — nothing else on stdout, so CI can parse it directly.

**Presence is not adequacy.** `validate-city-pack.mjs` cannot tell whether a `source_url`
supports the hours recorded against it. That gap is why every place's source must be
**opened and read during curation**, why the pack records *what was read* at each URL, and why
`validate-city-pack-v2.mjs` exists: it checks that every cited URL resolves to non-empty
**evidence bytes on disk**, so "this URL was opened" is a checked fact rather than a claim.

## Before you accept a change, ask these

- Does this change let any non-fact layer produce a place, hour, price, or transit leg? → reject.
- Does a new fact field have `source_url` + `verified_at`? → otherwise it is not a fact.
- Does this mechanic change the in-game time/money ledger for money? → reject.
- Does a new city need a new **tile type**? → that is a design bug, not an art task; the tile vocabulary is shared and each city gets only a style kit (palette + signage + 6–10 district props).
- Am I about to add a feature unrelated to the loop "play → export guide → travel → memoir"? → reject it. The previous attempt at this project died by accumulating 37k lines of tooling unrelated to the product.

## Where the rest of the decisions live

- Design intent and the panel's red-team findings: `iteration/design/design-core.md` — the canonical design document. Its §11 records the expert review, the corrections adopted, and the three open disagreements.
- Implementation-level visual/UI spec: `iteration/design/appendix-visual-and-ui-spec.md`
- Roadmap, phases, acceptance gates, monetization design, and open questions: `iteration/recon/gap-analysis-and-plan.md`
- What the legacy codebase can donate and what it cannot: `iteration/recon/recon-codebase-salvage.md`
- Engine/visual-tier/LLM-boundary research: `iteration/recon/recon-2.5d-game-research.md` — the canonical recon document. Read its **Appendix A** for the concrete React↔Phaser directory layout, **Appendix B** for the seven-layer enforcement mechanism, and **"Authored by"** for which agent session produced which content. It also pointed at the Japanese-geodata corpus now at `docs/handOff/archive/corpora/geo-japan/` (134 files). That corpus is **still not mined by any report** — but the licence questions it existed for were answered separately: the PLATEAU / GSI / MLIT-KSJ clauses were fetched into `docs/handOff/evidence/`, and the review-source lines landed as `iteration/recon/review-source-{matrix,japan,zh}.md`.
- Verbatim licensing evidence (Google Maps ToS, ODbL, OSM tile policy): `docs/handOff/evidence/` (14 snapshots, **frozen** — see below). The research plan and plugin survey are **not** there: they are `iteration/reference/` (`DSH-PLUGINS-FOR-2.5D.md`, `research-plan-jobs1.txt`, `Q5_ai_in_the_loop.md`), which is where both `iteration/README.md` and the files' own README put them.

Planning and research artefacts for this reboot live under `iteration/` (moved there from
`docs/handOff/` so they are version-controlled); `iteration/README.md` is the entry point and lists
what to read in what order. `docs/handOff/` now holds three things: `evidence/` (licence-clause
snapshots, **frozen by the user's ruling as a handoff-stage artefact** — a sha256 baseline at
`iteration/design/handoff-evidence-baseline.json` is enforced by
`iteration/tools/gate-artifact-layout.mjs`, so any edit, addition or deletion in that directory
fails the layout gate), `dsh-bundle-tourguide-2.5d/` (the tool bundle), and `archive/` (576 files,
~90 MB of raw crawl and corpus material, mostly gitignored). When implementation starts, follow the
repository's own documentation conventions again and do not keep adding planning files.

**Three corrections to earlier versions of this paragraph.** A skill that describes a workspace that
no longer exists sends the next session looking in the wrong place — the same failure as D-07's
README describing workflows that never existed:

1. `evidence/` was described as snapshots "the gate scripts read by relative path". **The archive is
   still not read by any gate, and should not be** — it is the pipeline's OUTPUT, so a gate depending
   on it would invert the dependency: someone else's handoff folder changes and our gate goes red
   while our code is untouched. What was missing was the other half: nothing verified that a licence
   snapshot still EXISTED, so deleting one left every gate green while a compliance claim lost its
   basis. That is now fixed by copying the snapshots to `.dsh/artifacts/licences/` (2.4 MB, tracked)
   and having `gate-artifact-layout.mjs` assert each one's presence and hash against
   `.dsh/artifacts/licences/MANIFEST.json`. So the claim became true, in the correct direction:
   the gate reads the pipeline's own copy, and `docs/handOff/evidence/` stays exactly as found.
   Deleting or editing a snapshot now fails the gate (`licence-missing` / `licence-modified`), and
   `--self-test` proves it.2. `dsh-bundle-tourguide-2.5d/` was described as junction-linked into the DSH profile and therefore
   unable to move. **It is not a link** (`LinkType` is empty, no `Target`). It still should not move,
   on the simpler and true reason that it is the tool bundle.
3. `archive/` was not mentioned at all, so the folder's real bulk went undeclared.

**And the reference/ correction has a direction**, recorded because I initially got it backwards:
`iteration/reference/` stays where it is and THIS FILE was the stale one. `iteration/README.md`
(2026-09-30 02:37) is 22 minutes newer than this skill (02:15), it names `reference/` explicitly in
its reading order, and the files are physically there. Moving them into `docs/handOff/reference/`
would have contradicted the project's own entry point — which is why the earlier statement here was
corrected rather than acted on.

## Retrieval reality in this environment (verified, do not re-derive)

There are **three network paths and they disagree**. Never conclude "this fact is
unobtainable" from one failure — escalate through them:

| path | status | evidence |
|---|---|---|
| harness `web_fetch` tool | **blocked** | hostnames fail with "resolves to a non-public IP address" |
| `curl` | works, per-host | `platform.openai.com` → HTTP 200; `en.wikipedia.org` → exit 28 timeout |
| `Invoke-WebRequest` (via `_fetch.ps1` at the repo root) | works where curl times out | `en.wikipedia.org/wiki/Unpacking_(video_game)` → 200 in ~1s, content usable |

`web_search` also works and returns usable summaries.

So the order to try is: `web_fetch` → `curl` → `Invoke-WebRequest`. Only after all
three fail may a fact be recorded as unobtainable.

`_q5cache/` was deleted mid-project and is unrecoverable (it was never git-tracked).
Any research claim that matters must live in a **tracked** file, never only in a
scratch cache. Prefer `evidence_add` + `research_report` for anything load-bearing,
and keep the fetched source next to the claim. Note that `evidence_add`'s ledger
resolves "workspace" to the process cwd (`C:\Users\NemoH`), so relative and `D:\`
absolute origins are both rejected — pass `content` inline instead.

## Known validator boundaries (do not mistake for guarantees)

`validate-city-pack.mjs` checks provenance **presence**, never provenance **adequacy**. It cannot tell whether a `source_url` actually supports the hours, fares, or closed days recorded against it. That is the gap that strands someone outside a locked door, so it needs a human step:

- Every place's source must be **opened and read during curation**, not merely cited.
- Record what the source attests to, and re-read it when the semi-static tier comes up for review.
- A URL that was never opened does not count as verification.

Do **not** add an agent-assessed `confidence` field to fact records: an assessment is not mechanically checkable, and adding one weakens the "every field has a checkable source" rule. Derive freshness from `category` (static / semi-static / dynamic) plus `verified_at` instead.

