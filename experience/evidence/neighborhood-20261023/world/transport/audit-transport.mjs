import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const [inputArg, outputArg, repeatArg, reportArg] = process.argv.slice(2);
assert(inputArg && outputArg && repeatArg && reportArg, 'Expected input, output, repeat and audit report paths');
const root = process.cwd();
const input = path.resolve(inputArg), output = path.resolve(outputArg), repeat = path.resolve(repeatArg);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const read = (directory, file) => fs.readFile(path.join(directory, file));
const descriptorList = manifest => [manifest.ground, manifest.context, ...manifest.cells.flatMap(cell => [cell.base, cell.near])].filter(Boolean);

async function inventory(directory) {
  const result = {};
  async function visit(relative = '') {
    for (const entry of (await fs.readdir(path.join(directory, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = path.posix.join(relative, entry.name);
      assert(!entry.isSymbolicLink(), 'Unexpected symbolic link: ' + name);
      if (entry.isDirectory()) await visit(name);
      else {
        assert(entry.isFile(), 'Unexpected file type: ' + name);
        const bytes = await read(directory, name);
        result[name] = { bytes: bytes.length, sha256: sha(bytes) };
      }
    }
  }
  await visit();
  return result;
}

const before = await inventory(input), after = await inventory(output), repeated = await inventory(repeat);
assert.deepEqual(after, repeated, 'Independent output inventory differs');
for (const [file, identity] of Object.entries(before)) {
  assert(after[file], 'Missing original file: ' + file);
  if (file !== 'manifest.json') assert.deepEqual(after[file], identity, 'Original file changed: ' + file);
}
const original = await json(path.join(input, 'manifest.json'));
const packaged = await json(path.join(output, 'manifest.json'));
const producerReport = await json(path.join(output, 'transport-report.json'));
assert.deepEqual(after['transport-input-manifest.json'], before['manifest.json']);
assert.equal(producerReport.inputManifestSha256, before['manifest.json'].sha256);
assert.equal(producerReport.outputManifestSha256, after['manifest.json'].sha256);
assert.equal(producerReport.producerSha256, sha(await fs.readFile('experience/art/package_neighborhood_transport.mjs')));
assert.deepEqual(Object.fromEntries(producerReport.originalInventory.map(({ file, ...identity }) => [file, identity])), before);
assert.equal(producerReport.originalInventorySha256, sha(JSON.stringify(producerReport.originalInventory)));

// 仅允许资源 transport、传输统计与包装报告入口改变。
const normalized = structuredClone(packaged);
const oldDescriptors = descriptorList(original), descriptors = descriptorList(packaged), normalizedDescriptors = descriptorList(normalized);
assert.equal(descriptors.length, oldDescriptors.length);
const uniqueResources = new Map();
const sectionBudgets = [];
for (let index = 0; index < descriptors.length; index++) {
  const oldDescriptor = oldDescriptors[index], descriptor = descriptors[index], adjusted = normalizedDescriptors[index];
  assert.equal(descriptor.file, oldDescriptor.file);
  const records = [descriptor, ...(descriptor.dependencies ?? [])];
  const oldRecords = [oldDescriptor, ...(oldDescriptor.dependencies ?? [])];
  const normalizedRecords = [adjusted, ...(adjusted.dependencies ?? [])];
  assert.equal(records.length, oldRecords.length);
  for (let position = 0; position < records.length; position++) {
    const record = records[position], oldRecord = oldRecords[position];
    assert.equal(record.file, oldRecord.file);
    assert.deepEqual({ bytes: record.bytes, sha256: record.sha256 }, after[record.file]);
    if (oldRecord.transport) assert.deepEqual(record.transport, oldRecord.transport);
    else delete normalizedRecords[position].transport;
    if (uniqueResources.has(record.file)) assert.deepEqual(record, uniqueResources.get(record.file));
    else uniqueResources.set(record.file, record);
  }
  if (Object.hasOwn(oldDescriptor, 'transferGeometryBytes')) adjusted.transferGeometryBytes = oldDescriptor.transferGeometryBytes;
  else delete adjusted.transferGeometryBytes;
  const geometry = records.filter(record => record === descriptor || record.file.endsWith('.bin'));
  const decoded = geometry.reduce((sum, record) => sum + after[record.file].bytes, 0);
  const transfer = geometry.reduce((sum, record) => sum + after[record.transport?.file ?? record.file].bytes, 0);
  const previous = oldRecords.filter(record => record === oldDescriptor || record.file.endsWith('.bin'))
    .reduce((sum, record) => sum + before[record.transport?.file ?? record.file].bytes, 0);
  assert.equal(decoded, descriptor.geometryBytes);
  assert.equal(transfer, descriptor.transferGeometryBytes);
  assert(transfer <= previous);
  const allowedLimit = descriptor.file === 'cells/cell-e000-n000/near.gltf' && descriptor.budgetException ? 3.5 * 1024 ** 2 : 2 * 1024 ** 2;
  assert(transfer <= allowedLimit, 'Section budget exceeded: ' + descriptor.file);
  assert(transfer <= descriptor.transferBudgetBytes, 'Published transferBudgetBytes exceeded: ' + descriptor.file);
  sectionBudgets.push({ file: descriptor.file, decodedGeometryBytes: decoded, transferGeometryBytes: transfer, previousTransferGeometryBytes: previous, allowedLimit });

  // 使用 JSON 中的完整依赖清单核对外部 buffer 和 image；资源字节相等保留全部 glTF 内容。
  const gltf = await json(path.join(output, descriptor.file));
  const uris = [...(gltf.buffers ?? []), ...(gltf.images ?? [])].filter(record => record.uri).map(record => record.uri);
  const referencedFiles = [...new Set(uris.map(uri => path.posix.normalize(path.posix.join(path.posix.dirname(descriptor.file), uri))))].sort();
  assert.deepEqual(referencedFiles, (descriptor.dependencies ?? []).map(record => record.file).sort(), 'glTF dependency mismatch: ' + descriptor.file);
}
delete normalized.transportPackaging;
assert.deepEqual(normalized, original, 'Manifest changed outside the permitted fields');
assert.deepEqual(packaged.transportPackaging, {
  version: 1,
  policy: 'gzip-level9-if-smaller-over-verified-optimized-bytes',
  report: 'transport-report.json',
  sourceManifestSha256: before['manifest.json'].sha256,
});

const runtimePath = path.resolve('experience/src/runtime/section-transport.js');
const { decodeSectionBytes, sectionTransport } = await import(pathToFileURL(runtimePath));
const gzipResults = [];
for (const record of uniqueResources.values()) {
  if (!record.transport) continue;
  assert.equal(record.transport.encoding, 'gzip');
  const encoded = await read(output, record.transport.file), decoded = await read(input, record.file);
  assert.deepEqual(after[record.transport.file], { bytes: record.transport.bytes, sha256: record.transport.sha256 });
  assert(gunzipSync(encoded).equals(decoded), 'gzip byte mismatch: ' + record.file);
  assert.deepEqual(sectionTransport(record), record.transport);
  const runtimeDecoded = await decodeSectionBytes(encoded, record);
  assert(Buffer.from(runtimeDecoded).equals(decoded), 'Runtime decode mismatch: ' + record.file);
  gzipResults.push({ file: record.file, transport: record.transport.file, bytes: encoded.length,
    decodedBytes: decoded.length, decodedSha256: sha(decoded), preexisting: Object.hasOwn(before, record.transport.file) });
}
const added = Object.keys(after).filter(file => !Object.hasOwn(before, file)).sort();
const expectedAdded = ['transport-input-manifest.json', 'transport-report.json', ...gzipResults.filter(record => !record.preexisting).map(record => record.transport)].sort();
assert.deepEqual(added, expectedAdded, 'Unexplained output file');
assert.equal(gzipResults.filter(record => record.preexisting).length, 4);
assert.equal(gzipResults.length, 148);
assert.equal(producerReport.descriptorCount, descriptors.length);
assert.equal(producerReport.processed.length, gzipResults.length);
for (const record of gzipResults) {
  const reported = producerReport.processed.find(item => item.file === record.file);
  assert(reported);
  assert.equal(reported.bytes, record.decodedBytes);
  assert.equal(reported.sha256, record.decodedSha256);
  assert.equal(reported.transferredBytes, record.bytes);
  assert.equal(reported.action, record.preexisting ? 'preserved-existing-gzip' : 'added-gzip');
}

// 启动统计使用实际文件与去重后的依赖，独立核对 actor 和每种环境图。
const opening = packaged.cells.find(cell => cell.id === 'cell-e000-n000');
const startupResources = new Map();
for (const descriptor of [packaged.ground, packaged.context, packaged.lighting, opening.base]) {
  for (const record of [descriptor, ...(descriptor.dependencies ?? [])]) startupResources.set(record.file, record);
}
const startupFiles = [...startupResources.values()].map(record => record.transport?.file ?? record.file);
const commonBytes = after['manifest.json'].bytes + startupFiles.reduce((sum, file) => sum + after[file].bytes, 0);
assert.equal(commonBytes, producerReport.startup.requiredPackageBytes);
const lighting = await json(path.join(output, packaged.lighting.file));
const travellerFile = path.resolve(input, '../../../models/traveller.glb');
const traveller = await fs.readFile(travellerFile);
assert(traveller.equals(await fs.readFile('experience/public/models/traveller.glb')), 'Shared traveller changed');
const modes = {};
for (const [mode, config] of Object.entries(lighting.modes)) {
  const environment = config.environment;
  assert.deepEqual(after[environment.file], { bytes: environment.bytes, sha256: environment.sha256 });
  const totalBytes = commonBytes + traveller.length + after[environment.file].bytes;
  assert.equal(totalBytes, producerReport.startup.modes[mode].totalBytes);
  assert(totalBytes <= 4 * 1024 ** 2);
  modes[mode] = { commonBytes, travellerBytes: traveller.length, hdrBytes: after[environment.file].bytes, totalBytes, limitBytes: 4 * 1024 ** 2 };
}
assert.equal(modes.day.totalBytes, 3030351);
assert.equal(modes.night.totalBytes, 3023115);
const metadataNames = ['provenance.json', 'feature-provenance.json', 'source-ledger.json', 'source-review.json', 'references.json', 'compression-report.json', 'lighting.json', 'river-context.json.gz'];
const sourceAndProvenance = Object.fromEntries(metadataNames.map(file => {
  assert.deepEqual(after[file], before[file]);
  return [file, after[file]];
}));
const report = {
  schemaVersion: 1, status: 'pass', scope: 'Independent local transport-only byte, metadata, dependency, runtime-decoder and reproducibility audit; no browser, rendering, network or memory benchmark',
  input: path.relative(root, input), output: path.relative(root, output), independentRepeat: path.relative(root, repeat),
  inputManifestSha256: before['manifest.json'].sha256, outputManifestSha256: after['manifest.json'].sha256,
  producerSha256: producerReport.producerSha256, auditorSha256: sha(await fs.readFile(new URL(import.meta.url))),
  runtimeDecoderSha256: sha(await fs.readFile(runtimePath)), toolVersions: { node: process.version, zlib: process.versions.zlib },
  originalFileCount: Object.keys(before).length, originalFilesUnchangedExceptManifest: Object.keys(before).length - 1,
  outputFileCount: Object.keys(after).length, repeatedInventoryByteIdentical: true, repeatedInventorySha256: sha(JSON.stringify(after)),
  permittedManifestChangesOnly: true, descriptorCount: descriptors.length,
  addedGzipCount: gzipResults.filter(record => !record.preexisting).length, preservedGzipCount: gzipResults.filter(record => record.preexisting).length,
  sourceAndProvenance, sharedTraveller: { file: path.relative(root, travellerFile), bytes: traveller.length, sha256: sha(traveller) },
  startup: { startupFiles, modes }, sectionBudgets, gzipResults,
  limitations: ['Startup totals describe required 3D resource transfer; JavaScript, CSS, fonts, deferred sections and HTTP framing are separate.', 'Decoded resource bytes and descriptors are preserved; GPU allocation and frame timing were not measured.', 'The copied startup-audit.json binds the original manifest; the transport-report.json and this audit bind the packaged manifest.'],
};
await fs.mkdir(path.dirname(path.resolve(reportArg)), { recursive: true });
await fs.writeFile(reportArg, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, inputManifestSha256: report.inputManifestSha256, outputManifestSha256: report.outputManifestSha256,
  originalFileCount: report.originalFileCount, outputFileCount: report.outputFileCount, descriptors: descriptors.length,
  addedGzipCount: report.addedGzipCount, preservedGzipCount: report.preservedGzipCount, startup: modes,
  auditSha256: sha(await fs.readFile(reportArg)) }, null, 2));
