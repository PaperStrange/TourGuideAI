// SPDX-License-Identifier: GPL-3.0-or-later
// 对已验证的资源添加 gzip 传输文件；原始 glTF、二进制、材料及来源字节保持不变。
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

const args = process.argv.slice(2);
if (args.length % 2) throw new Error('Expected named option/value pairs');
const options = Object.fromEntries(Array.from({ length: args.length / 2 }, (_, index) => [args[index * 2], args[index * 2 + 1]]));
for (const key of Object.keys(options)) if (!['--input', '--output', '--report', '--startup-cell'].includes(key)) throw new Error('Unknown option: ' + key);
for (const key of ['--input', '--output']) if (!options[key]) throw new Error('Missing ' + key);
const sourceDir = await fs.realpath(options['--input']);
const targetDir = path.resolve(options['--output']);
if (sourceDir === targetDir || sourceDir.startsWith(targetDir + path.sep) || targetDir.startsWith(sourceDir + path.sep)) throw new Error('Input and output directories must be independent');
const reportFile = options['--report'] ?? 'transport-report.json';
if (reportFile === 'transport-input-manifest.json') throw new Error('Report must have a distinct filename');
const startupCellId = options['--startup-cell'] ?? 'cell-e000-n000';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function resourcePath(root, file) {
  if (typeof file !== 'string' || !file || path.isAbsolute(file) || path.posix.normalize(file) !== file
    || file.includes('\\') || file.includes('?') || file.includes('#')) throw new Error('Invalid package resource path');
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(root + path.sep)) throw new Error('Resource is outside its package: ' + file);
  return resolved;
}
resourcePath(targetDir, reportFile);
const sourceManifestBytes = await fs.readFile(path.join(sourceDir, 'manifest.json'));
const sourceManifestHash = sha(sourceManifestBytes);
const manifest = JSON.parse(sourceManifestBytes);
if (manifest.version !== 1 || !manifest.ground || !Array.isArray(manifest.cells)) throw new Error('Expected a version1 neighborhood manifest');
if (manifest.transportPackaging) throw new Error('Input already has a transport-only report; reproduce from the recorded optimized input');
const descriptors = [manifest.ground, manifest.context, ...manifest.cells.flatMap(cell => [cell.base, cell.near])].filter(Boolean);
const startupCell = manifest.cells.find(cell => cell.id === startupCellId);
if (!startupCell?.base) throw new Error('Startup cell is absent');
const inventory = [];
async function inspectDirectory(directory) {
  for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Package contains a symbolic link');
    if (entry.isDirectory()) await inspectDirectory(file);
    else if (entry.isFile()) {
      const bytes = await fs.readFile(file);
      inventory.push({ file: path.relative(sourceDir, file).split(path.sep).join('/'), bytes: bytes.length, sha256: sha(bytes) });
    } else throw new Error('Unsupported package entry');
  }
}
await inspectDirectory(sourceDir);
const sourceInventory = new Map(inventory.map(record => [record.file, record]));
for (const file of [reportFile, 'transport-input-manifest.json']) if (sourceInventory.has(file)) throw new Error('Output metadata would replace an input file: ' + file);
await fs.mkdir(targetDir, { recursive: true });
if ((await fs.readdir(targetDir)).length) throw new Error('Output directory must be empty');
await fs.cp(sourceDir, targetDir, { recursive: true });
await fs.writeFile(path.join(targetDir, 'transport-input-manifest.json'), sourceManifestBytes);

const resources = new Map();
for (const descriptor of descriptors) for (const record of [descriptor, ...(descriptor.dependencies ?? [])]) {
  const expected = sourceInventory.get(record.file);
  if (!expected || record.sha256 !== expected.sha256 || record.bytes !== expected.bytes) throw new Error('Declared resource differs from frozen input: ' + record.file);
  const previous = resources.get(record.file);
  if (previous && JSON.stringify(previous.record.transport) !== JSON.stringify(record.transport)) throw new Error('Conflicting resource transports: ' + record.file);
  if (!previous) resources.set(record.file, { record, aliases: [record] });
  else previous.aliases.push(record);
}
function geometryResources(descriptor) {
  return [descriptor, ...(descriptor.dependencies ?? []).filter(record => record.file.endsWith('.bin'))];
}
const originalTransfer = new Map(descriptors.map(descriptor => [descriptor.file,
  geometryResources(descriptor).reduce((sum, record) => sum + (record.transport?.bytes ?? record.bytes), 0)]));
const startupResources = new Map();
for (const descriptor of [manifest.ground, manifest.context, manifest.lighting, startupCell.base].filter(Boolean)) {
  for (const record of [descriptor, ...(descriptor.dependencies ?? [])]) startupResources.set(record.file, record);
}
const initialCommonBytes = sourceManifestBytes.length + [...startupResources.values()].reduce((sum, record) => sum + (record.transport?.bytes ?? record.bytes), 0);
const processed = [];
for (const [file, item] of [...resources].sort(([a], [b]) => a.localeCompare(b))) {
  const record = item.record;
  if (!/\.(gltf|bin)$/.test(file)) continue;
  const decoded = await fs.readFile(resourcePath(sourceDir, file));
  let action = 'unchanged-no-saving', encodedBytes = record.bytes;
  if (record.transport) {
    const transport = record.transport, expected = sourceInventory.get(transport.file);
    if (transport.encoding !== 'gzip' || !expected || expected.bytes !== transport.bytes || expected.sha256 !== transport.sha256) throw new Error('Existing transport identity mismatch');
    const encoded = await fs.readFile(resourcePath(sourceDir, transport.file));
    if (!gunzipSync(encoded).equals(decoded)) throw new Error('Existing gzip does not decode to its declared resource');
    action = 'preserved-existing-gzip'; encodedBytes = encoded.length;
  } else {
    const encoded = gzipSync(decoded, { level: 9 });
    if (!gunzipSync(encoded).equals(decoded)) throw new Error('Gzip round trip changed source bytes');
    if (encoded.length < decoded.length) {
      const transport = { file: file + '.gz', bytes: encoded.length, sha256: sha(encoded), encoding: 'gzip' };
      if (sourceInventory.has(transport.file)) throw new Error('New transport would replace an input file');
      await fs.writeFile(resourcePath(targetDir, transport.file), encoded);
      for (const alias of item.aliases) alias.transport = { ...transport };
      action = 'added-gzip'; encodedBytes = encoded.length;
    }
  }
  processed.push({ file, bytes: record.bytes, sha256: record.sha256, action, transferredBytes: encodedBytes,
    transport: record.transport ?? null, decodedBytesExact: true });
}
const sectionBudgets = [];
for (const descriptor of descriptors) {
  const logical = geometryResources(descriptor);
  const decodedBytes = logical.reduce((sum, record) => sum + record.bytes, 0);
  if (decodedBytes !== descriptor.geometryBytes) throw new Error('Decoded geometry accounting mismatch');
  const transferBytes = logical.reduce((sum, record) => sum + (record.transport?.bytes ?? record.bytes), 0);
  if (transferBytes > originalTransfer.get(descriptor.file)) throw new Error('Transport pass increased section transfer');
  const permittedBudget = descriptor.budgetException && descriptor.file === 'cells/cell-e000-n000/near.gltf'
    ? 3.5 * 1024 * 1024 : descriptor.transferBudgetBytes;
  if (!Number.isFinite(permittedBudget) || permittedBudget <= 0 || transferBytes > permittedBudget) throw new Error('Section transfer budget exceeded');
  descriptor.transferGeometryBytes = transferBytes;
  sectionBudgets.push({ file: descriptor.file, decodedGeometryBytes: decodedBytes, transferGeometryBytes: transferBytes,
    previousTransferGeometryBytes: originalTransfer.get(descriptor.file), transferBudgetBytes: descriptor.transferBudgetBytes });
}
manifest.transportPackaging = { version: 1, policy: 'gzip-level9-if-smaller-over-verified-optimized-bytes',
  report: reportFile, sourceManifestSha256: sourceManifestHash };
const outputManifestBytes = Buffer.from(JSON.stringify(manifest) + '\n');
await fs.writeFile(path.join(targetDir, 'manifest.json'), outputManifestBytes);
for (const expected of inventory) {
  if (expected.file === 'manifest.json') continue;
  const bytes = await fs.readFile(resourcePath(targetDir, expected.file));
  if (bytes.length !== expected.bytes || sha(bytes) !== expected.sha256) throw new Error('Copied input bytes changed: ' + expected.file);
}
const commonBytes = outputManifestBytes.length + [...startupResources.values()].reduce((sum, record) => sum + (record.transport?.bytes ?? record.bytes), 0);
let startup = { startupCellId, previousRequiredPackageBytes: initialCommonBytes, requiredPackageBytes: commonBytes,
  basis: 'Manifest, ground/context/lighting, opening BASE and deduplicated dependencies; shared actor and selected HDR recorded below when a matching prior audit exists' };
if (sourceInventory.has('startup-audit.json')) {
  const audit = JSON.parse(await fs.readFile(path.join(sourceDir, 'startup-audit.json'), 'utf8'));
  if (audit.manifestSha256 !== sourceManifestHash) throw new Error('Startup audit does not bind the frozen input manifest');
  startup = { ...startup, sourceAuditSha256: sourceInventory.get('startup-audit.json').sha256, modes: {} };
  for (const [mode, previous] of Object.entries(audit.critical)) {
    if (previous.commonBytes !== initialCommonBytes) throw new Error('Startup accounting differs from prior audit');
    const totalBytes = commonBytes + previous.travellerBytes + previous.hdrBytes;
    if (totalBytes > previous.limitBytes) throw new Error('Required startup 3D transfer exceeds its limit');
    startup.modes[mode] = { totalBytes, previousTotalBytes: previous.totalBytes, limitBytes: previous.limitBytes,
      headroomBytes: previous.limitBytes - totalBytes, unchangedTravellerBytes: previous.travellerBytes, unchangedHDRBytes: previous.hdrBytes };
  }
}
const report = { version: 1, status: 'complete', inputManifestSha256: sourceManifestHash, outputManifestSha256: sha(outputManifestBytes),
  producerSha256: sha(await fs.readFile(new URL(import.meta.url))), toolVersions: { node: process.version, zlib: process.versions.zlib },
  policy: manifest.transportPackaging.policy, originalInventory: inventory, originalInventorySha256: sha(JSON.stringify(inventory)),
  originalFilesExceptManifestByteIdentical: true, manifestChanges: 'transport per encoded resource, transferGeometryBytes and transportPackaging only',
  decodedMemoryPolicy: 'Decoded file bytes and geometryBytes unchanged; runtime retainedBytes remains decoded memory',
  descriptorCount: descriptors.length, processed, sectionBudgets, startup };
await fs.mkdir(path.dirname(resourcePath(targetDir, reportFile)), { recursive: true });
await fs.writeFile(resourcePath(targetDir, reportFile), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ manifestSha256: report.outputManifestSha256, descriptorCount: descriptors.length,
  addedGzip: processed.filter(item => item.action === 'added-gzip').length, preservedGzip: processed.filter(item => item.action === 'preserved-existing-gzip').length,
  startup }, null, 2));
