import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

// 使用成熟 glTF 读取器核对实际解码资源；输出只包含独立审计记录。
const root = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const [baselineArg, candidateArg, expectedManifest, outputArg] = process.argv.slice(2);
assert(baselineArg && candidateArg && expectedManifest && outputArg, 'Supply baseline, candidate, frozen manifest SHA256 and output directory');
const baseline = path.resolve(baselineArg), candidate = path.resolve(candidateArg), output = path.resolve(outputArg);
assert(output.startsWith(path.join(root, 'artifacts') + path.sep));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const identity = async file => { const bytes = await fs.readFile(file); return { bytes: bytes.length, sha256: sha(bytes) }; };
const stable = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const sectionList = manifest => [manifest.ground, manifest.context, ...manifest.cells.flatMap(cell => [cell.base, cell.near])];
const tools = path.join(root, 'artifacts/neighborhood-20261021/art/tools/node_modules');
const { NodeIO } = await import(pathToFileURL(path.join(tools, '@gltf-transform/core/dist/index.js')));
const { ALL_EXTENSIONS } = await import(pathToFileURL(path.join(tools, '@gltf-transform/extensions/dist/index.js')));
const { MeshoptDecoder } = await import(pathToFileURL(path.join(tools, 'meshoptimizer/index.js')));
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const before = await json(path.join(baseline, 'manifest.json')), after = await json(path.join(candidate, 'manifest.json'));
assert.equal((await identity(path.join(baseline, 'manifest.json'))).sha256, '79b1a3ed91f0b672364c690e44de9278dce555fab0074ce0dc4aaa8add62f534');
assert.equal((await identity(path.join(candidate, 'manifest.json'))).sha256, expectedManifest);
for (const field of ['id', 'revision', 'frame', 'bounds', 'featureTable', 'lighting']) assert.deepEqual(after[field], before[field]);
const oldSections = sectionList(before), newSections = sectionList(after);
assert.equal(newSections.length, 74); assert.deepEqual(newSections.map(item => item.file), oldSections.map(item => item.file));
assert.deepEqual(after.cells.map(({ base, near, ...rest }) => rest), before.cells.map(({ base, near, ...rest }) => rest));
const platformId = 'kyoto-city:bldg_74454289-1d7a-4105-87ea-26e36c69bc44', platformIndex = 223, toriiIndex = 1047;
assert.equal(after.featureTable[platformIndex].sourceId, platformId);
assert.equal(after.featureTable[toriiIndex].sourceId, 'osm:node:5204263033');

async function inventory(directory, prefix = '') {
  const result = {};
  for (const entry of await fs.readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const file = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(result, await inventory(directory, file));
    else { assert(entry.isFile()); result[file] = await identity(path.join(directory, file)); }
  }
  return result;
}
function materialRecords(document) {
  function resolve(value, key = '') {
    if (Array.isArray(value)) return value.map(item => resolve(item));
    if (!value || typeof value !== 'object') return value;
    const result = {};
    for (const [name, item] of Object.entries(value)) {
      if (name === 'index' && key.endsWith('Texture')) {
        const texture = document.textures[item];
        result.resource = { ...texture, sampler: document.samplers?.[texture.sampler] ?? null,
          source: texture.source === undefined ? null : document.images[texture.source] };
        if (texture.extensions?.EXT_texture_webp) result.resource.extensions = { ...texture.extensions,
          EXT_texture_webp: { source: document.images[texture.extensions.EXT_texture_webp.source] } };
      } else result[name] = resolve(item, name);
    }
    return result;
  }
  return new Map(document.materials.map(material => [material.name, resolve(material)]));
}
const oriented = corners => [0, 1, 2].map(start => [0, 1, 2].map(offset => corners[(start + offset) % 3]).join('|')).sort()[0];
const transform = (point, matrix) => [0, 1, 2].map(axis =>
  matrix[axis] * point[0] + matrix[axis + 4] * point[1] + matrix[axis + 8] * point[2] + matrix[axis + 12]);
async function inspect(directory, file, oldMaterials = null) {
  const raw = await json(path.join(directory, file)), materials = materialRecords(raw);
  if (oldMaterials) for (const [name, material] of materials) {
    if (name !== 'torii-paper') assert.deepEqual(material, oldMaterials.get(name), 'Existing material changed: ' + file + ':' + name);
  }
  const document = await io.read(path.join(directory, file)), groups = new Map(), platform = [], paper = [];
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const matrix = node.getWorldMatrix();
    for (const primitive of mesh.listPrimitives()) {
      assert.equal(primitive.getMode(), 4);
      const semantics = primitive.listSemantics().sort(), sourceName = semantics.find(name => name.toUpperCase() === '_SOURCE_INDEX');
      assert(sourceName);
      const sources = primitive.getAttribute(sourceName), positions = primitive.getAttribute('POSITION');
      const indices = primitive.getIndices().getArray(), materialName = primitive.getMaterial().getName(), material = materials.get(materialName);
      assert(material);
      const isPaper = materialName === 'torii-paper';
      if (isPaper) {
        assert(oldMaterials?.has('lamp'));
        assert.equal(material.alphaMode ?? 'OPAQUE', 'OPAQUE');
        assert.deepEqual(material.emissiveFactor ?? [0, 0, 0], [0, 0, 0]);
        assert.equal(material.pbrMetallicRoughness.metallicFactor ?? 1, 0);
        assert(Math.abs(material.pbrMetallicRoughness.roughnessFactor - .9) < 1e-6);
        assert(!material.normalTexture && !material.emissiveTexture && !material.pbrMetallicRoughness.baseColorTexture);
        assert(!material.extensions?.KHR_materials_transmission);
      }
      const attributes = Array.from({ length: positions.getCount() }, (_, vertex) => stable(semantics.map(name =>
        [name, primitive.getAttribute(name).getElement(vertex, [])])));
      for (let offset = 0; offset < indices.length; offset += 3) {
        const vertices = Array.from(indices.slice(offset, offset + 3)), source = Math.round(sources.getScalar(vertices[0]));
        assert(vertices.every(vertex => Math.abs(sources.getScalar(vertex) - source) <= .001));
        if (isPaper) assert.equal(source, toriiIndex);
        const fingerprint = stable({ matrix, material: isPaper ? oldMaterials.get('lamp') : material,
          corners: oriented(vertices.map(vertex => attributes[vertex])) });
        const records = groups.get(source) ?? []; records.push(fingerprint); groups.set(source, records);
        if (source === platformIndex || isPaper) {
          const record = { fingerprint, material: materialName, points: vertices.map(vertex => transform(positions.getElement(vertex, []), matrix)),
            normals: vertices.map(vertex => primitive.getAttribute('NORMAL').getElement(vertex, [])), semantics };
          if (source === platformIndex) platform.push(record);
          if (isPaper) paper.push(record);
        }
      }
    }
  }
  return { groups: Object.fromEntries([...groups].sort(([a], [b]) => a - b).map(([id, records]) =>
    [id, { triangles: records.length, sha256: sha(records.sort().join('\n')) }])), platform, paper, materials,
    sceneExtras: raw.scenes?.map(scene => scene.extras) };
}
await fs.mkdir(output, { recursive: true });
const inventoryBefore = await inventory(baseline), inventoryAfter = await inventory(candidate);
assert.deepEqual(Object.keys(inventoryAfter).sort(), Object.keys(inventoryBefore).sort());
const permittedChanges = new Set(['manifest.json', 'provenance.json', 'compression-report.json', 'transport-report.json',
  'transport-input-manifest.json', 'feature-provenance.json', ...newSections.flatMap(section => [section, ...section.dependencies])
    .flatMap(item => /\.(gltf|bin)$/.test(item.file) ? [item.file, ...(item.transport ? [item.transport.file] : [])] : [])]);
const changedResources = [], byteExactResources = [];
for (const [file, record] of Object.entries(inventoryBefore)) {
  if (record.sha256 === inventoryAfter[file].sha256) byteExactResources.push(file);
  else { assert(permittedChanges.has(file), 'Unrelated resource changed: ' + file); changedResources.push(file); }
}
const scene = await json(path.join(root, 'experience/src/neighborhoods/shijo-east/scene.json'));
const ring = scene.features.find(feature => feature.sourceId === platformId).polygons[0].outer;
const edgeEndpoints = ring.slice(0, -1).map((point, index) => [point, ring[index + 1]].map(([x, y]) => [Math.fround(x), -Math.fround(y)]));
const comparisons = [], floorEdges = [], paperSections = [];
for (let index = 0; index < newSections.length; index++) {
  const section = newSections[index], oldSection = oldSections[index];
  const first = await inspect(baseline, section.file), second = await inspect(candidate, section.file, first.materials);
  assert.deepEqual(second.sceneExtras, first.sceneExtras);
  const firstGroups = { ...first.groups }, secondGroups = { ...second.groups };
  if (first.platform.length || second.platform.length) {
    assert(['cells/cell-e001-s001/base.gltf', 'cells/cell-e001-s001/near.gltf'].includes(section.file));
    assert.equal(first.platform.length, 110); assert.equal(second.platform.length, 118);
    const remaining = [...second.platform];
    for (const record of first.platform) {
      const position = remaining.findIndex(item => item.fingerprint === record.fingerprint);
      assert(position >= 0, 'Existing platform triangle changed: ' + section.file); remaining.splice(position, 1);
    }
    assert.equal(remaining.length, 8);
    const counts = [0, 0, 0, 0];
    for (const face of remaining) {
      assert.equal(face.material, 'paving');
      assert(face.points.every(point => point.every(Number.isFinite) && [0, Math.fround(-.04)].includes(point[1])));
      assert(face.points.some(point => point[1] === 0) && face.points.some(point => point[1] === Math.fround(-.04)));
      const edge = edgeEndpoints.findIndex(ends => face.points.every(point => ends.some(end => point[0] === end[0] && point[2] === end[1])));
      assert(edge >= 0, 'Closure extends beyond the existing boundary'); counts[edge]++;
      const [a, b, c] = face.points, ab = b.map((v, k) => v - a[k]), ac = c.map((v, k) => v - a[k]);
      const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      const [start, end] = edgeEndpoints[edge], outward = [start[1] - end[1], 0, end[0] - start[0]];
      assert(normal[0] * outward[0] + normal[2] * outward[2] > 0, 'Closure winding must point outward');
      assert(face.normals.every(n => n.every(Number.isFinite) && Math.abs(n[1]) < 1e-6 && n[0] * outward[0] + n[2] * outward[2] > 0));
    }
    assert.deepEqual(counts, [2, 2, 2, 2]);
    floorEdges.push({ file: section.file, existingTriangles: 110, newTriangles: 118, addedPerBoundary: counts,
      addedTriangles: remaining.map(({ fingerprint, ...rest }) => rest), existingAttributesExact: true });
    delete firstGroups[platformIndex]; delete secondGroups[platformIndex];
    assert.equal(section.triangles, oldSection.triangles + 8);
  } else assert.equal(section.triangles, oldSection.triangles);
  assert.deepEqual(secondGroups, firstGroups, 'Decoded source attributes/material/world matrix changed: ' + section.file);
  if (second.paper.length) {
    assert.equal(section.file, 'cells/cell-e006-n001/near.gltf'); assert.equal(second.paper.length, 6);
    paperSections.push({ file: section.file, triangles: second.paper.length, material: second.materials.get('torii-paper'),
      unchangedGeometryAndAttributes: true, sourceIndex: toriiIndex });
  }
  comparisons.push({ file: section.file, sourceGroupsCompared: Object.keys(first.groups).length,
    unchangedGroupsSha256: sha(stable(firstGroups)), trianglesBefore: oldSection.triangles, trianglesAfter: section.triangles,
    batchesBefore: oldSection.batches, batchesAfter: section.batches });
  console.log('Compared ' + section.file);
}
assert.equal(floorEdges.length, 2); assert.equal(paperSections.length, 1);

const oldProvenance = await json(path.join(baseline, 'provenance.json')), provenance = await json(path.join(candidate, 'provenance.json'));
const producerFiles = { styleSha256: 'experience/art/neighborhood-style.json', generatorSha256: 'experience/art/build_neighborhood.py',
  geometryHelperSha256: 'experience/art/neighborhood_mesh.py', landmarkHelperSha256: 'experience/art/neighborhood_landmarks.py',
  materialHelperSha256: 'experience/art/neighborhood_materials.py', sceneSha256: 'experience/src/neighborhoods/shijo-east/scene.json',
  geographySha256: 'experience/src/neighborhoods/shijo-east/geography.json', preparedArtSha256: 'artifacts/neighborhood-20261023/world/art-selection.json' };
for (const [field, file] of Object.entries(producerFiles)) assert.equal((await identity(path.join(root, file))).sha256, provenance[field]);
for (const field of ['sceneSha256', 'geographySha256', 'preparedArtSha256', 'preparedArtSourceHashes', 'preparedArtProducerSha256',
  'walkableMaterialAudit', 'arcadeGeometryAudit', 'waterBoundaryAudit', 'reviewedRoadMask', 'sourceLedger', 'references', 'retainedLandmarks', 'riverContext', 'sourceMaterialOverrides'])
  assert.deepEqual(provenance[field], oldProvenance[field]);
const treatment = provenance.sourceTreatmentOverrides[0], oldTreatment = oldProvenance.sourceTreatmentOverrides[0];
assert.equal(provenance.sourceTreatmentOverrides.length, 1); assert.equal(treatment.sourceId, platformId);
assert.equal(treatment.construction.floorEdgeBottomMetres, -.04);
const construction = { ...treatment.construction }; delete construction.floorEdgeBottomMetres;
assert.deepEqual(construction, oldTreatment.construction);
assert.deepEqual(treatment.evidence.slice(0, 4), oldTreatment.evidence); assert.equal(treatment.evidence.length, 5);
const landmark = provenance.landmarkMaterialOverrides[0]; assert.equal(provenance.landmarkMaterialOverrides.length, 1);
assert.equal(landmark.sourceId, 'osm:node:5204263033'); assert.equal(landmark.expectedSourceIndex, toriiIndex);
assert.equal(landmark.hangingMaterial, 'torii-paper'); assert.equal(landmark.priorHangingMaterial, 'lamp');
for (const record of [...treatment.evidenceRecords, ...landmark.evidenceRecords]) {
  const bytes = await fs.readFile(path.join(root, record.file)); assert.equal(sha(bytes), record.sha256); assert.deepEqual(JSON.parse(bytes), record.record);
}
assert.equal(treatment.evidence[4].sha256, '1ca8cd8131f2d2d1dcdee8328292c3fd0c8172e60122d02e0ddc76b833be1d70');
assert.equal(landmark.evidence[0].sha256, '1c0d04780039823cdce0831bd32867373082b329b57c4ae53a167b16238b03d4');
const oldFeatures = await json(path.join(baseline, 'feature-provenance.json')), newFeatures = await json(path.join(candidate, 'feature-provenance.json'));
for (const field of ['construction', 'evidence', 'authored']) {
  assert.deepEqual(newFeatures[platformIndex].treatmentOverride[field], treatment[field]);
  newFeatures[platformIndex].treatmentOverride[field] = oldFeatures[platformIndex].treatmentOverride[field];
}
assert.deepEqual(newFeatures, oldFeatures);

const gzipResources = new Set(), sectionBudgets = [];
for (const section of newSections) {
  for (const resource of [section, ...section.dependencies]) {
    assert.deepEqual(inventoryAfter[resource.file], { bytes: resource.bytes, sha256: resource.sha256 });
    if (resource.transport && !gzipResources.has(resource.transport.file)) {
      const encoded = await fs.readFile(path.join(candidate, resource.transport.file)), decoded = gunzipSync(encoded);
      assert.equal(resource.transport.encoding, 'gzip');
      assert.deepEqual({ bytes: encoded.length, sha256: sha(encoded) }, { bytes: resource.transport.bytes, sha256: resource.transport.sha256 });
      assert.deepEqual({ bytes: decoded.length, sha256: sha(decoded) }, { bytes: resource.bytes, sha256: resource.sha256 });
      gzipResources.add(resource.transport.file);
    }
  }
  const geometry = [section, ...section.dependencies.filter(item => item.file.endsWith('.bin'))];
  const transferred = geometry.reduce((sum, item) => sum + (item.transport ?? item).bytes, 0), decoded = geometry.reduce((sum, item) => sum + item.bytes, 0);
  const limit = section.file === 'cells/cell-e000-n000/near.gltf' ? 3.5 * 1024 * 1024 : 2 * 1024 * 1024;
  assert(transferred <= limit); assert.equal(section.transferGeometryBytes, transferred);
  sectionBudgets.push({ file: section.file, transferBytes: transferred, decodedBytes: decoded, limitBytes: limit });
}
const compression = await json(path.join(candidate, 'compression-report.json')); assert.equal(compression.assets.length, 74);
assert(compression.assets.every(asset => !asset.inputIssues.numErrors && !asset.outputIssues.numErrors &&
  asset.maximumPositionErrorMetres === 0 && asset.maximumUVError === 0 && asset.sourceIndicesExact));
const transport = await json(path.join(candidate, 'transport-report.json'));
assert.equal(transport.outputManifestSha256, inventoryAfter['manifest.json'].sha256);
assert.equal(transport.inputManifestSha256, inventoryAfter['transport-input-manifest.json'].sha256);
assert.deepEqual(inventoryAfter[after.provenance.file], { bytes: after.provenance.bytes, sha256: after.provenance.sha256 });
const startup = new Map();
for (const section of [after.ground, after.context, after.lighting, after.cells.find(cell => cell.id === 'cell-e000-n000').base])
  for (const resource of [section, ...section.dependencies]) startup.set(resource.file, resource);
let commonBytes = inventoryAfter['manifest.json'].bytes;
for (const resource of startup.values()) { const transferred = resource.transport ?? resource;
  assert.deepEqual(inventoryAfter[transferred.file], { bytes: transferred.bytes, sha256: transferred.sha256 }); commonBytes += transferred.bytes; }
const traveller = await identity(path.join(root, 'experience/public/models/traveller.glb')), lighting = await json(path.join(candidate, after.lighting.file)), critical = {};
for (const mode of ['day', 'night']) {
  const environment = lighting.modes[mode].environment, hdr = await identity(path.resolve(candidate, path.dirname(after.lighting.file), environment.file));
  assert.equal(hdr.sha256, environment.sha256); assert.equal(hdr.bytes, environment.bytes);
  const totalBytes = commonBytes + traveller.bytes + hdr.bytes; assert(totalBytes <= 4 * 1024 * 1024);
  critical[mode] = { totalBytes, commonBytes, travellerBytes: traveller.bytes, hdrBytes: hdr.bytes, limitBytes: 4 * 1024 * 1024 };
}
const report = { status: 'pass', reviewedAt: '2026-10-24',
  baseline: { directory: path.relative(root, baseline), manifest: inventoryBefore['manifest.json'] },
  candidate: { directory: path.relative(root, candidate), manifest: inventoryAfter['manifest.json'], provenance: inventoryAfter['provenance.json'] },
  producer: { file: path.relative(root, fileURLToPath(import.meta.url)), ...await identity(fileURLToPath(import.meta.url)) },
  parserVersions: { gltfTransform: '4.5.1', meshoptimizer: '1.3.0' },
  comparison: { sections: comparisons, floorEdges, paperSections, sourceGroupsCompared: comparisons.reduce((sum, item) => sum + item.sourceGroupsCompared, 0),
    completeExistingAttributesMatricesExact: true, allUnrelatedMaterialsExact: true },
  source: { geographySha256: provenance.geographySha256, sceneSha256: provenance.sceneSha256,
    preparedArtSha256: provenance.preparedArtSha256, floorEvidence: treatment.evidence[4], paperEvidence: landmark.evidence[0],
    producerFiles, featureTableExact: true, originalSourceAndNavigationExact: true },
  resources: { files: Object.keys(inventoryAfter).length, byteExactCount: byteExactResources.length, changedResources,
    newImages: 0, gzipRoundTrips: gzipResources.size },
  validation: { containers: 74, reportedErrors: 0 }, budgets: { sections: sectionBudgets, startup: critical },
  limits: 'Floor boundary height and paper PBR response remain authored. The retained reference is dated2007. This audit establishes decoded geometry/material/provenance preservation; actual visual quality, GPU memory and frame timing require separate checks. Startup excludes application HTML/JS/CSS/fonts and HTTP framing.' };
await fs.writeFile(path.join(output, 'candidate10-export-audit.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, sections: comparisons.length, floors: floorEdges.length, paperSections: paperSections.length, gzipRoundTrips: gzipResources.size, critical }));
