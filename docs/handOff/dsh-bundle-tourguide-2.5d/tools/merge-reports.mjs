// One-shot merge helper: appends the old report's unique §3.6 (the concrete React
// directory layout) into the new report as an appendix, with provenance, then
// appends a provenance/authored-by section. Usage:
//   node merge-reports.mjs <old.md> <new.md>
import { readFileSync, writeFileSync } from 'node:fs';

const [oldPath, newPath] = process.argv.slice(2);
if (!oldPath || !newPath) {
  console.error('usage: node merge-reports.mjs <old.md> <new.md>');
  process.exit(2);
}

const oldLines = readFileSync(oldPath, 'utf8').split(/\r?\n/);
const start = oldLines.findIndex((l) => /^### 3\.6 /.test(l));
const end = oldLines.findIndex((l, i) => i > start && /^## 4\./.test(l));
if (start < 0 || end < 0) {
  console.error('could not locate old §3.6 boundaries');
  process.exit(1);
}

// Trim the trailing "---" separator the old section carried before "## 4.".
let body = oldLines.slice(start, end);
while (body.length && /^(-{3,}|\s*)$/.test(body[body.length - 1])) body.pop();

// Re-level the heading into the new report's appendix numbering.
body[0] = '## Appendix A. Concrete directory layout — Phaser inside React, with a separate guide/memoir UI layer';

const appendix = [
  '',
  '---',
  '',
  '> **Provenance.** Appendix A is the one artefact carried over from the earlier report',
  '> `recon-2.5d-game-research.md` (the superseded pass). Nothing else from that file is',
  '> reproduced here — its other content is either thinner restatements of sections above or',
  '> subsumed by them. Source of this appendix: see "Authored by" at the end of this document.',
  '',
  ...body,
  '',
].join('\n');

const authoredBy = [
  '',
  '---',
  '',
  '## Authored by',
  '',
  'Content provenance for this document, recorded so a reviewer can trace any claim back to the',
  'agent session that produced it. Agent ids are DSH subagent session ids and are stable; use them',
  'rather than pointing at a file, because files get moved and rewritten.',
  '',
  '| Content | Produced by | Notes |',
  '|---|---|---|',
  '| §1–§6 (2.5D families and art cost, engine selection, tooling/assets, hard problems, AI in the loop, scope benchmarks), §7 reuse assessment, §8 gaps, §9 sources | **`c7b6d5e0-74b6-40bb-a132-8db4db3ba0c3`** | The primary author of this pass. It reports a "supervision" pattern: `subagent` is depth-capped at 1 for it, so it fanned work out through the `workflow` tool to four internal research streams. Those internal agents have no ids disclosed to this session and are **not** individually attributable. |',
  '| Raw per-section drafts that §1–§6 were compiled from | same agent, via its four internal streams | Landed as `q1q3-art-and-tooling.md` (89,850 B, 22:05), `q2-engines.md` (58,189 B, 22:00), `q4q6-hardproblems-scope.md` (94,122 B, 22:08); a Q5 stream landed as `docs/handOff/recon-tmp/q5-llm-pipeline.md` because a concurrent writer resolved that path first. |',
  '| §7.1 blunt state-of-the-legacy-app findings (missing module, dead webpack config, mock-backed route services, key shipped to the browser, RBAC gate, tests attached to the wrong module) | **`2a2c867a-dbcf-4200-868a-33b301330bda`** | Produced the file-level audit `recon-codebase-salvage.md` (1,047 lines) that §7 is cross-checked against. Cited here rather than `c7b6d5e0` because those findings originate in that audit. |',
  '| **Appendix A** (React directory layout, `useGameInstance`, `BusProvider`, `StoreProvider`, the `guide/**`/`memoir/**` import constraints) | **`10379568-9840-4401-be9f-49137bab1b8f`** | The earlier, superseded pass. This appendix is its only surviving unique content. |',
  '| Scope-benchmark corrections and the stricter `UNVERIFIED` handling in §6.1 | **`a723f5db-c56c-489b-a3fc-24c2951d7a4e`** | A separate later session that worked on the superseded file and applied `_q2src`→`docs/handOff/engine-evidence/` path rewrites and a registry-citation caveat. Its `UNVERIFIED:` discipline is reflected in §6.1 and §8. |',
  '| Engine evidence corpus at `docs/handOff/engine-evidence/` (88 files, first write 21:27:49, last 21:59:39) | **shared, not singly attributable** | The corpus spans the working windows of `2a2c867a`, `c7b6d5e0` and `a723f5db`. It is recorded as a shared evidence base; do not attribute it to one agent. |',
  '',
  '### Orphaned evidence — flagged deliberately',
  '',
  'The Japanese-geodata corpus at `docs/handOff/research-scratch/recon2/` (132 files, written 21:35:48–21:44:37) was produced by **`ee9176b2-7a82-4800-bf7a-966de0ead3f6`**, the geodata/compliance session that failed before producing a report.',
  '',
  '**Neither this report nor its superseded predecessor cites it** — verified by searching both for `recon2`, `research-scratch`, `ekispert`, `jorudan`, `odpt`, `mlit-gtfs`, `gmp-terms` and `gmp-service`: zero hits in both. The corpus nonetheless contains primary sources that bear directly on §3.5 and on the guide\'s executability, including Google Maps Platform service terms, the ODbL text, OSM tile and Nominatim policies, the Geofabrik Japan extract page, Ekispert and Jorudan transit-API pages, ODPT open-transit material (including a PDF), MLIT GTFS material, and Yelp/Mapbox/Foursquare terms.',
  '',
  'It is therefore **unmined, not absent**. Treat assembling it into a compliance pre-flight as outstanding work, and do not read its absence from §3.5/§9 as evidence that those sources were checked.',
  '',
].join('\n');

const current = readFileSync(newPath, 'utf8');
if (current.includes('## Authored by')) {
  console.error('refusing to run: new report already contains "## Authored by"');
  process.exit(1);
}
writeFileSync(newPath, current + '\n' + appendix + authoredBy, 'utf8');
console.log('appended Appendix A and the Authored by section');
console.log(`  appendix body lines: ${body.length}`);
console.log(`  new file size: ${readFileSync(newPath, 'utf8').length}`);
