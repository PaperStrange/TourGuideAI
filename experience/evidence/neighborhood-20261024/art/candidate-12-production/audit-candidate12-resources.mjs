import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

const root = '/workspace/TourGuideAI';
const directory = path.join(root, 'artifacts/neighborhood-20261024/art/candidate-12-transport');
const baseline = path.join(root, 'artifacts/neighborhood-20261024/art/candidate-11-transport');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse(await fs.readFile(file));
const manifestBytes = await fs.readFile(path.join(directory, 'manifest.json'));
const manifest = JSON.parse(manifestBytes);
const prior = await json(path.join(baseline, 'manifest.json'));
assert.deepEqual(manifest.featureTable, prior.featureTable);
const byFile = records => [...records].sort((left, right) => left.file.localeCompare(right.file));
assert.deepEqual(byFile(manifest.sharedResources), byFile(prior.sharedResources));
for (const record of prior.sharedResources) {
  assert.ok((await fs.readFile(path.join(directory, record.file))).equals(await fs.readFile(path.join(baseline, record.file))), record.file);
}
assert.ok((await fs.readFile(path.join(directory, 'lighting.json'))).equals(await fs.readFile(path.join(baseline, 'lighting.json'))));
const compression = await json(path.join(directory, 'compression-report.json'));
assert.equal(compression.assets.length, 74);
for (const asset of compression.assets) {
  assert.equal(asset.inputIssues.numErrors, 0);
  assert.equal(asset.outputIssues.numErrors, 0);
  assert.equal(asset.maximumPositionErrorMetres, 0);
  assert.equal(asset.maximumUVError, 0);
  assert.equal(asset.sourceIndicesExact, true);
}
const descriptors = [manifest.ground, manifest.context, ...manifest.cells.flatMap(cell => [cell.base, cell.near])];
const transports = new Map();
const geometryChanges = [];
const roofMetadata = [];
const newMaterialDefinitions = new Map();
for (const descriptor of descriptors) {
  let transferBytes = 0;
  for (const record of [descriptor, ...descriptor.dependencies.filter(item => /\.bin$/.test(item.file))]) {
    const bytes = await fs.readFile(path.join(directory, record.file));
    assert.equal(bytes.length, record.bytes);
    assert.equal(hash(bytes), record.sha256);
    const transfer = record.transport ?? record;
    transferBytes += transfer.bytes;
    if (record.transport) {
      const encoded = await fs.readFile(path.join(directory, transfer.file));
      assert.equal(hash(encoded), transfer.sha256);
      assert.equal(encoded.length, transfer.bytes);
      assert.ok(gunzipSync(encoded).equals(bytes));
      transports.set(record.file, transfer);
    }
  }
  assert.equal(transferBytes, descriptor.transferGeometryBytes);
  assert.ok(transferBytes <= descriptor.transferBudgetBytes);
  const old = [prior.ground, prior.context, ...prior.cells.flatMap(cell => [cell.base, cell.near])].find(item => item.file === descriptor.file);
  geometryChanges.push({ file: descriptor.file, trianglesBefore: old.triangles, trianglesAfter: descriptor.triangles,
    triangleDelta: descriptor.triangles - old.triangles, batchesBefore: old.batches, batchesAfter: descriptor.batches,
    batchDelta: descriptor.batches - old.batches, transferBytes });
  const gltf = await json(path.join(directory, descriptor.file));
  for (const node of gltf.nodes ?? []) {
    if (node.extras?.thinSheet) {
      assert.deepEqual(node.extras.thinSheet, { version: 1, role: 'nishiki-colored-roof', sourceId: 'osm:way:772134672',
        sourceIndex: 139, pairedVerticalOffsetMetres: .045, diffuseTransmission: .55, transmissionColor: [1, 1, 1] });
      assert.match(node.extras.occlusionGroup, /^Canopy_cell-/);
      roofMetadata.push({ file: descriptor.file, node: node.name, thinSheet: node.extras.thinSheet });
    }
  }
  for (const material of gltf.materials ?? []) {
    if (['daimaru-brown-tile', 'frontage-dark-glass'].includes(material.name)) {
      const factor = material.pbrMetallicRoughness.baseColorFactor;
      assert.ok(factor && factor.slice(0, 3).every(value => value > 0 && value < 1), material.name);
      const texture = gltf.textures[material.pbrMetallicRoughness.baseColorTexture.index];
      const imageIndex = texture.extensions?.EXT_texture_webp?.source ?? texture.source;
      const imageUri = gltf.images[imageIndex].uri;
      assert.match(imageUri, material.name === 'daimaru-brown-tile' ? /tile-wall-color\.webp$/ : /glass-color\.webp$/);
      newMaterialDefinitions.set(material.name, { material, imageUri });
    }
  }
}
assert.equal(transports.size, 148);
assert.equal(newMaterialDefinitions.size, 2);
assert.ok(roofMetadata.length > 0);
const geography = await json(path.join(root, 'experience/src/neighborhoods/shijo-east/geography.json'));
const spawn = manifest.cells.filter(cell => geography.spawn.x >= cell.bounds.minX && geography.spawn.x <= cell.bounds.maxX && geography.spawn.y >= cell.bounds.minY && geography.spawn.y <= cell.bounds.maxY);
assert.equal(spawn.length, 1);
const resources = new Map();
for (const descriptor of [manifest.ground, manifest.context, manifest.lighting, spawn[0].base]) {
  for (const record of [descriptor, ...descriptor.dependencies]) resources.set(record.file, record);
}
let commonBytes = manifestBytes.length;
for (const record of resources.values()) commonBytes += (record.transport ?? record).bytes;
const actor = await fs.readFile(path.join(root, 'experience/public/models/traveller.glb'));
const rig = await json(path.join(directory, manifest.lighting.file));
const critical = {};
for (const mode of ['day', 'night']) {
  const environment = rig.modes[mode].environment;
  const hdr = await fs.readFile(path.resolve(directory, path.dirname(manifest.lighting.file), environment.file));
  assert.equal(hash(hdr), environment.sha256);
  const totalBytes = commonBytes + actor.length + hdr.length;
  assert.ok(totalBytes <= 4194304);
  critical[mode] = { commonBytes, travellerBytes: actor.length, hdrBytes: hdr.length, totalBytes,
    headroomBytes: 4194304 - totalBytes, limitBytes: 4194304 };
}
const provenance = await json(path.join(directory, 'provenance.json'));
const oldProvenance = await json(path.join(baseline, 'provenance.json'));
for (const key of ['geographySha256', 'sceneSha256', 'preparedArtSha256', 'preparedArtProducerSha256', 'sourceBoundaryClosures', 'sourceTreatmentOverrides', 'sourceMaterialOverrides', 'landmarkMaterialOverrides']) {
  assert.deepEqual(provenance[key], oldProvenance[key]);
}
assert.deepEqual(provenance.riverContext.input, oldProvenance.riverContext.input);
const report = { status: 'pass', manifestSha256: hash(manifestBytes),
  baselineManifestSha256: hash(await fs.readFile(path.join(baseline, 'manifest.json'))),
  producerSha256: hash(await fs.readFile(new URL(import.meta.url))),
  validatedContainers: 74, exactGzipRoundTrips: transports.size, sourceTableExact: true,
  sharedResourcesExact: true, addedImageBytes: 0, lightingRigExact: true, critical,
  startupMeaning: 'Manifest, resident ground/context, opening BASE and deduplicated dependencies plus traveller and selected HDR; page HTML/JS/CSS/fonts and deferred cells remain separate.',
  geometryChanges, roofMetadata, newMaterialDefinitions: Object.fromEntries(newMaterialDefinitions),
  limits: 'Independent decoded protected-ground/other-face/source preservation and actual browser art/shader acceptance remain required.' };
await fs.writeFile(path.join(root, 'artifacts/neighborhood-20261024/art/candidate-12-resource-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, manifest: report.manifestSha256, critical,
  roofMeshes: roofMetadata.length, validated: 74, gzipRoundTrips: transports.size, newImageBytes: 0 }));
