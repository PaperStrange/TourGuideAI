import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const build = path.join(root, 'artifacts/realism-01/review-page/build');
const output = path.resolve(process.argv[2] ?? path.join(root, 'artifacts/realism-01/review-page/package'));
const implementationBase = process.argv[3];
if (!/^[a-f0-9]{40}$/.test(implementationBase ?? '')) {
  throw new Error('Provide the current implementation base commit as the third argument');
}
if (!output.startsWith(path.join(root, 'artifacts') + path.sep)) {
  throw new Error('Review package output must be inside ignored artifacts');
}
await mkdir(output, { recursive: true });
if ((await readdir(output)).length) throw new Error('Use an empty package output directory');
const sha = data => createHash('sha256').update(data).digest('hex');
const readJson = async name => JSON.parse(await readFile(path.join(root, name), 'utf8'));
const evidence = 'experience/evidence/realism-01/qualification';
const original = await readJson(`${evidence}/splat-fidelity/archive-layout.json`);
const conversion = await readJson(`${evidence}/splat-encoding/conversion/execution.json`);
const records = [];

async function include(source, destination, expected) {
  const absolute = path.join(root, source);
  const data = await readFile(absolute);
  const digest = sha(data);
  if (expected && (expected.bytes !== data.length || expected.sha256 !== digest)) {
    throw new Error(`Asset differs from reviewed source: ${source}`);
  }
  await mkdir(path.dirname(path.join(output, destination)), { recursive: true });
  await cp(absolute, path.join(output, destination));
  records.push({ path: destination, source, bytes: data.length, sha256: digest });
}

async function includeBuild(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) await includeBuild(source);
    else {
      const relative = path.relative(build, source);
      await include(path.relative(root, source), relative === 'realism-review.html' ? 'index.html' : relative);
    }
  }
}

await includeBuild(build);
await include('experience/src/review/review-assets.json', 'review-assets.json');
await include('artifacts/realism-01/splat-fidelity/research/knock-original.sog', 'data/knock-original.sog', original);
if (conversion.source.sha256 !== original.sha256) throw new Error('Streamed source identity differs');
const outputs = conversion.outputs.filter(item => /\.radc?$/.test(item.path));
if (outputs.length !== 40) throw new Error('Expected one RAD manifest and 39 chunks');
for (const record of outputs) await include(record.path, `data/streamed/${path.basename(record.path)}`, record);
await include(`${evidence}/splat-fidelity/knock-credit.txt`, 'licenses/source.txt');
await include(`${evidence}/splat-fidelity/knock-source-receipt.json`, 'source-receipt.json');
await include('experience/node_modules/@sparkjsdev/spark/LICENSE', 'licenses/spark.txt');
await include('experience/node_modules/three/LICENSE', 'licenses/three.txt');
await stat(path.join(output, 'index.html'));
records.sort((a, b) => a.path.localeCompare(b.path));
const manifest = {
  schemaVersion: 1,
  kind: 'interactive-architecture-review',
  createdAt: new Date().toISOString(),
  implementationBase,
  sourceUrl: conversion.sourceUrl,
  sourceLicense: conversion.sourceLicense,
  sourceAuthor: conversion.sourceAuthor,
  sourceSha256: original.sha256,
  dependencies: { spark: '2.4.0', three: '0.186.1' },
  limits: 'Architectural inspection of a Canadian capture. Original SH3 and streamed SH2 differ in detail and directional color. Kyoto route realism, walking, relighting and physical-device performance acceptance remain separate.',
  bytes: records.reduce((sum, item) => sum + item.bytes, 0),
  files: records,
};
await writeFile(path.join(output, 'package-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(root, output), files: records.length, bytes: manifest.bytes,
  manifestSha256: sha(await readFile(path.join(output, 'package-manifest.json'))) }));
