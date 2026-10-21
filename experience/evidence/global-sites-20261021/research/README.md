# Global-site source evidence — 2026-10-21

This directory contains real bounded source responses and data-quality observations used to evaluate a reusable geographic scene workflow. It does not establish a reviewed walking route in Delft or Helsinki.

| File | Meaning |
| --- | --- |
| `delft-markt.osm` | Original OSM API XML; bbox4.3570,52.0108,4.3595,52.0121;703,490 bytes; SHA25669e5fb1b52dd50d95a1ac9c2fa59616bb668ed7db46d9bfcb8e93dd23f607b7e. |
| `helsinki-senate.osm` | Original OSM API XML; bbox24.9518,60.1681,24.9548,60.1704;654,698 bytes; SHA256ca1efe4230b3022f9df213d05dfae50a1454dd1662c016faae22dba1b6644424. |
| `retrievals.json` | Actual successful request URLs, effective URLs, UTC timestamps, HTTP statuses, byte counts and SHA256 hashes. Documentation captures listed under `artifacts/` are local ignored research material; those files are not part of this retained package. |
| `inspect_sources.py` / `observations.json` | Repeatable XML identity, tag-presence and member-completeness census. Counts cover entire responses, including complete ways beyond query bounds. |
| `geometry-review.json` | Shapely/pyproj review of selected landmark rings/reference points and Ginza context clearances. Surface validation checks the authored-width layers separately from source centerlines. |
| `prepare_ginza_context.py` | Replays source selection/projection and the authored Ginza display-surface policy, including GEOS constrained triangulation and hole/exclusion coverage checks. Output is canonical `experience/content/ginza-wako/context.json`. |
| `source-notes.md` | Primary-source findings, software/data rights and current engine research observations. |

The OSM responses retain source object IDs, versions and edit timestamps. Download date and mapping/edit date have different meanings. Both responses carry OSM copyright/license metadata. Attribution: © OpenStreetMap contributors; data license [ODbL](https://www.openstreetmap.org/copyright). Derived geometry retains that provenance.

The exact canonical Ginza context SHA256 is `8afacd1d73dc1326466388f6e093538e775b97dafb6b3256c21721daf9c163e3`. Its source is the already retained Oct19 raw XML, SHA256 `651fa5737c1b2b530d9a817daa6884cce38b1f1bb099ee7ef31ea88f02b88b64`. It adds visual context only. The source body, walkway and inspection points remain unchanged.

Replay from the repository root with the environment's installed tools:

```bash
PYTHONPATH="$PWD/artifacts/site-tools-python" TMPDIR="$PWD/artifacts/tmp" python3 experience/evidence/global-sites-20261021/research/prepare_ginza_context.py > artifacts/global-sites-20261021/research/context-replay.json
cmp artifacts/global-sites-20261021/research/context-replay.json experience/content/ginza-wako/context.json
```

Preparation used Python3.12, Shapely2.2.0 and pyproj3.8.0. Raw source and canonical source hashes bind the result. GEOS output ordering can vary across library versions; reproduce with the recorded environment before interpreting a byte change as a geographic change.
