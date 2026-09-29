// split-pack-meta.mjs — move the non-array head of places.json / transit.json into
// evidence/tools/, leaving the two fact files as top-level arrays.
//
// Why: the fact-layer contract (skill `tourguide-fact-integrity`) types places.json and
// transit.json as arrays, and validate-city-pack.mjs rejects any other top-level shape
// with BAD_SHAPE. Pack-level metadata therefore belongs in pack.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK = resolve(HERE, '../..');

const JOBS = [
  { file: 'places.json', key: 'places', metaOut: 'places.meta.json' },
  { file: 'transit.json', key: 'legs', metaOut: 'transit.meta.json' },
];

for (const job of JOBS) {
  const p = resolve(PACK, job.file);
  const doc = JSON.parse(readFileSync(p, 'utf8'));
  if (Array.isArray(doc)) { console.log(`${job.file} is already an array — nothing to do`); continue; }
  const rows = doc[job.key];
  if (!Array.isArray(rows)) throw new Error(`${job.file}: expected an array at "${job.key}"`);
  const meta = { ...doc };
  delete meta[job.key];
  writeFileSync(resolve(HERE, job.metaOut), JSON.stringify(meta, null, 2) + '\n', 'utf8');
  writeFileSync(p, JSON.stringify(rows, null, 2) + '\n', 'utf8');
  console.log(`${job.file}: ${rows.length} rows to a bare array; meta (${Object.keys(meta).join(', ')}) -> evidence/tools/${job.metaOut}`);
}
