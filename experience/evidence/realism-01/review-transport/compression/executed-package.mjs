import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync, gunzipSync } from 'node:zlib';

const root = path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const { values } = parseArgs({ options: {
  output: { type: 'string' },
  baseline: { type: 'string', default: 'artifacts/realism-01/review-transport/baseline' },
  build: { type: 'string', default: 'artifacts/realism-01/review-page/build' },
  implementation: { type: 'string' },
  encoding: { type: 'string', default: 'gzip' },
  'measure-only': { type: 'boolean', default: false },
} });
assert(values.output, 'Provide --output inside ignored artifacts.');
assert(['gzip', 'identity'].includes(values.encoding), 'Use --encoding gzip or identity.');
assert(values['measure-only'] || /^[a-f0-9]{40}$/.test(values.implementation ?? ''),
  'Packaging requires --implementation with the 40-character source base commit.');
const baseline = path.resolve(root, values.baseline);
const build = path.resolve(root, values.build);
const output = path.resolve(root, values.output);
for (const directory of [baseline, build, output]) {
  assert(directory.startsWith(path.join(root, 'artifacts') + path.sep), 'Directories must remain inside ignored artifacts.');
}
assert(output !== baseline && !output.startsWith(baseline + path.sep), 'Output must be separate from the baseline.');
const sha = data => createHash('sha256').update(data).digest('hex');
const relative = filename => path.relative(root, filename);
const evidence = path.join(root, 'experience/evidence/realism-01/review-page');
const approvedManifestBytes = await readFile(path.join(evidence, 'package-manifest.json'));
const baselineManifestBytes = await readFile(path.join(baseline, 'package-manifest.json'));
assert.equal(sha(baselineManifestBytes), sha(approvedManifestBytes), 'Baseline package manifest differs from the reviewed release.');
const approved = JSON.parse(approvedManifestBytes);
assert.equal(approved.files.length, 50, 'Expected the 50-file approved release.');
assert.equal(new Set(approved.files.map(file => file.path)).size, approved.files.length, 'Duplicate baseline paths.');
const baselineFiles = new Map();

// 对全部已发布文件进行验证后，才生成任何新的表示。
for (const expected of approved.files) {
  const filename = path.resolve(baseline, expected.path);
  assert(filename.startsWith(baseline + path.sep), `Invalid baseline path: ${expected.path}`);
  assert((await stat(filename)).isFile(), `Expected a baseline file: ${expected.path}`);
  const data = await readFile(filename);
  assert.equal(data.length, expected.bytes, `Baseline size: ${expected.path}`);
  assert.equal(sha(data), expected.sha256, `Baseline hash: ${expected.path}`);
  baselineFiles.set(expected.path, { filename, ...expected });
}
const streamedInputs = approved.files.filter(file => file.path.startsWith('data/streamed/') && /\.radc?$/.test(file.path));
const headerInput = streamedInputs.find(file => file.path.endsWith('.rad'));
const chunkInputs = streamedInputs.filter(file => file.path.endsWith('.radc'));
assert.equal(streamedInputs.length, 40, 'Expected 40 streamed source files.');
assert.equal(chunkInputs.length, 39, 'Expected 39 RADC chunks.');
assert(headerInput, 'RAD header is missing.');
assert(baselineFiles.has('data/knock-original.sog'), 'Original source is missing.');
if (!values['measure-only']) await stat(path.join(build, 'realism-review.html'));
await mkdir(output, { recursive: true });
assert.equal((await readdir(output)).length, 0, 'Output directory must be empty.');

const startedAt = new Date().toISOString();
const outputFiles = [];
const measurements = [];
const chunkMetadata = {};
const sectionBudgetBytes = 2 * 1024 * 1024;
const generatedEncoding = values['measure-only'] ? 'gzip' : values.encoding;

async function writeContent(destination, data, source, extra = {}) {
  const filename = path.join(output, destination);
  await mkdir(path.dirname(filename), { recursive: true });
  await writeFile(filename, data);
  outputFiles.push({ path: destination, source, bytes: data.length, sha256: sha(data), ...extra });
}

for (const expected of streamedInputs) {
  const input = await readFile(baselineFiles.get(expected.path).filename);
  const isChunk = expected.path.endsWith('.radc');
  const compressionStarted = performance.now();
  const compressed = isChunk ? gzipSync(input, { level: 9 }) : input;
  const compressionMilliseconds = isChunk ? performance.now() - compressionStarted : 0;
  const decodeStarted = performance.now();
  const decoded = isChunk ? gunzipSync(compressed, { maxOutputLength: expected.bytes }) : compressed;
  const verificationDecodeMilliseconds = isChunk ? performance.now() - decodeStarted : 0;
  assert.equal(decoded.length, expected.bytes, `Decoded size: ${expected.path}`);
  assert.equal(sha(decoded), expected.sha256, `Decoded hash: ${expected.path}`);
  assert(decoded.equals(input), `Decoded content: ${expected.path}`);
  const compressedPath = isChunk ? `${expected.path}.gz` : expected.path;
  const destination = generatedEncoding === 'gzip' ? compressedPath : expected.path;
  const payload = generatedEncoding === 'gzip' ? compressed : input;
  await writeContent(destination, payload, relative(baselineFiles.get(expected.path).filename), {
    decodedBytes: expected.bytes, decodedSha256: expected.sha256,
    encoding: isChunk ? generatedEncoding : 'identity',
  });
  const persisted = await readFile(path.join(output, destination));
  const persistedDecoded = isChunk && generatedEncoding === 'gzip'
    ? gunzipSync(persisted, { maxOutputLength: expected.bytes }) : persisted;
  assert.equal(sha(persistedDecoded), expected.sha256, `Persisted decoded identity: ${destination}`);
  measurements.push({
    sourcePath: expected.path,
    rawBytes: input.length,
    rawSha256: expected.sha256,
    compressedPath,
    compressedBytes: compressed.length,
    compressedSha256: sha(compressed),
    decodedBytes: decoded.length,
    decodedSha256: sha(decoded),
    identical: true,
    compressionMilliseconds,
    verificationDecodeMilliseconds,
    ordinarySection: isChunk,
    rawWithinSectionBudget: isChunk ? input.length <= sectionBudgetBytes : null,
    compressedWithinSectionBudget: isChunk ? compressed.length <= sectionBudgetBytes : null,
  });
  if (isChunk) chunkMetadata[path.basename(expected.path)] = {
    url: `./${compressedPath}`,
    decodedBytes: expected.bytes,
    decodedSha256: expected.sha256,
    encodedBytes: compressed.length,
    encodedSha256: sha(compressed),
  };
}

const rawBytes = measurements.reduce((sum, item) => sum + item.rawBytes, 0);
const compressedBytes = measurements.reduce((sum, item) => sum + item.compressedBytes, 0);
const report = {
  schemaVersion: 1,
  kind: 'lossless-streamed-source-transport',
  startedAt,
  finishedAt: new Date().toISOString(),
  baseline: { packageManifestPath: relative(path.join(baseline, 'package-manifest.json')),
    packageManifestSha256: sha(baselineManifestBytes), verifiedFiles: approved.files.length,
    sourceSha256: approved.sourceSha256, sourceUrl: approved.sourceUrl,
    sourceAuthor: approved.sourceAuthor, sourceLicense: approved.sourceLicense },
  method: { encoder: 'node:zlib gzipSync', decoder: 'node:zlib gunzipSync', level: 9,
    node: process.version, zlib: process.versions.zlib,
    headerEncoding: 'identity', chunkEncoding: 'gzip', streamedShDegree: 2,
    sourceDataChanged: false, renderingSettingsChanged: false },
  producer: { path: relative(fileURLToPath(import.meta.url)), sha256: sha(await readFile(fileURLToPath(import.meta.url))) },
  totals: { files: measurements.length, chunks: chunkInputs.length, decodedIdentical: measurements.length,
    rawBytes, compressedBytes, savedBytes: rawBytes - compressedBytes,
    reductionPercent: (rawBytes - compressedBytes) / rawBytes * 100,
    sectionBudgetBytes,
    rawSectionsAboveBudget: measurements.filter(item => item.ordinarySection && !item.rawWithinSectionBudget).length,
    compressedSectionsAboveBudget: measurements.filter(item => item.ordinarySection && !item.compressedWithinSectionBudget).length },
  limitations: 'File sizes and local codec timings only. HTTP transfer headers, unfinished responses, browser decode/sort/upload, first visibility, settled quality and physical-device performance require independent browser evidence.',
  files: measurements,
};
await writeContent('compression-report.json', Buffer.from(`${JSON.stringify(report, null, 2)}\n`), 'Generated measurement from exact reviewed sources');

if (!values['measure-only']) {
  async function copyBuild(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await copyBuild(filename);
      else {
        const destination = path.relative(build, filename);
        await writeContent(destination === 'realism-review.html' ? 'index.html' : destination,
          await readFile(filename), relative(filename));
      }
    }
  }
  await copyBuild(build);
  for (const name of ['data/knock-original.sog', 'licenses/source.txt', 'licenses/spark.txt', 'licenses/three.txt', 'source-receipt.json']) {
    const file = baselineFiles.get(name);
    assert(file, `Missing reviewed supporting asset: ${name}`);
    await writeContent(name, await readFile(file.filename), relative(file.filename));
  }
  const assets = JSON.parse(await readFile(baselineFiles.get('review-assets.json').filename, 'utf8'));
  if (values.encoding === 'gzip') assets.transport = {
    encoding: 'gzip',
    header: { bytes: headerInput.bytes, sha256: headerInput.sha256 },
    chunks: chunkMetadata,
  };
  await writeContent('review-assets.json', Buffer.from(`${JSON.stringify(assets, null, 2)}\n`), 'Reviewed asset metadata with explicit transport identities');
  const producerPaths = ['experience/realism-review.html', 'experience/vite.review.config.mjs',
    'experience/package.json', 'experience/package-lock.json', relative(fileURLToPath(import.meta.url))];
  for (const entry of await readdir(path.join(root, 'experience/src/review'), { withFileTypes: true })) {
    if (entry.isFile()) producerPaths.push(`experience/src/review/${entry.name}`);
  }
  const producers = [];
  for (const filename of producerPaths.sort()) {
    const data = await readFile(path.join(root, filename));
    producers.push({ path: filename, bytes: data.length, sha256: sha(data) });
  }
  outputFiles.sort((left, right) => left.path.localeCompare(right.path));
  const manifest = {
    schemaVersion: 2,
    kind: 'interactive-architecture-review-lossless-transport',
    createdAt: new Date().toISOString(),
    implementationBase: values.implementation,
    baselinePackageManifestSha256: sha(baselineManifestBytes),
    sourceUrl: approved.sourceUrl, sourceLicense: approved.sourceLicense,
    sourceAuthor: approved.sourceAuthor, sourceSha256: approved.sourceSha256,
    dependencies: approved.dependencies,
    transportEncoding: values.encoding,
    streamedDecodedBytes: rawBytes,
    streamedEncodedBytes: values.encoding === 'gzip' ? compressedBytes : rawBytes,
    limits: approved.limits,
    bytes: outputFiles.reduce((sum, item) => sum + item.bytes, 0),
    files: outputFiles,
    producers,
  };
  await writeFile(path.join(output, 'package-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ output: relative(output), encoding: generatedEncoding, ...report.totals,
  reportSha256: sha(await readFile(path.join(output, 'compression-report.json'))) }));
