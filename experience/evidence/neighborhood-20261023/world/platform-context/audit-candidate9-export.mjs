import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

// 只读取真实资源；每个来源的完整属性、材质和世界变换参与精确比较。
const root = path.resolve(fileURLToPath(new URL('../../../../../', import.meta.url)));
const [baselineArg, candidateArg, outputArg] = process.argv.slice(2);
assert(baselineArg && candidateArg && outputArg, 'Supply baseline, candidate and ignored output directory');
const baseline = path.resolve(baselineArg), candidate = path.resolve(candidateArg), output = path.resolve(outputArg);
assert(output.startsWith(path.join(root, 'artifacts') + path.sep));
const targetId = 'kyoto-city:bldg_74454289-1d7a-4105-87ea-26e36c69bc44', targetIndex = 223;
const oldGeo = 'cb6d616d3858becf459a885ed940a6766cdd942e14a4d0b2b8a39776e3c16e55';
const newGeo = '0fe837655a45b8c2685e1bae24d739ef9fdf2c55dc60401588474cfa31bd9c7f';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const identity = async file => { const bytes = await fs.readFile(file); return { bytes: bytes.length, sha256: sha(bytes) }; };
const stable = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const sections = manifest => [manifest.ground, manifest.context, ...manifest.cells.flatMap(cell => [cell.base, cell.near])];
const tools = path.join(root, 'artifacts/neighborhood-20261021/art/tools/node_modules');
const { NodeIO } = await import(pathToFileURL(path.join(tools, '@gltf-transform/core/dist/index.js')));
const { ALL_EXTENSIONS } = await import(pathToFileURL(path.join(tools, '@gltf-transform/extensions/dist/index.js')));
const { MeshoptDecoder } = await import(pathToFileURL(path.join(tools, 'meshoptimizer/index.js')));
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const before = await json(path.join(baseline, 'manifest.json')), after = await json(path.join(candidate, 'manifest.json'));
assert.equal((await identity(path.join(baseline, 'manifest.json'))).sha256, '4e490c35d171aceb160efb70d94ae8c9fc097a2ad4440fe1010c1b619ca7a601');
assert.equal((await identity(path.join(candidate, 'manifest.json'))).sha256, '79b1a3ed91f0b672364c690e44de9278dce555fab0074ce0dc4aaa8add62f534');
for (const field of ['id', 'revision', 'frame', 'bounds', 'featureTable', 'lighting']) assert.deepEqual(after[field], before[field]);
assert.equal(after.featureTable[targetIndex].sourceId, targetId);
const previousSections = sections(before), currentSections = sections(after);
assert.equal(currentSections.length, 74);
assert.deepEqual(currentSections.map(item => item.file), previousSections.map(item => item.file));
assert.deepEqual(after.cells.map(({ base, near, ...rest }) => rest), before.cells.map(({ base, near, ...rest }) => rest));

async function inventory(directory, prefix = '') {
  const result = {};
  for (const entry of await fs.readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const file = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(result, await inventory(directory, file));
    else { assert(entry.isFile()); result[file] = await identity(path.join(directory, file)); }
  }
  return result;
}
// 解析成熟 glTF 格式使用 NodeIO；材质引用按资源定义比较，允许容器索引重排。
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
const allMaterials = new Map();
async function inspect(directory, file, expectedGeography) {
  const raw = await json(path.join(directory, file)), materials = materialRecords(raw);
  for (const scene of raw.scenes ?? []) if (scene.extras?.sourceSha256) assert.equal(scene.extras.sourceSha256, expectedGeography);
  const document = await io.read(path.join(directory, file)), groups = new Map(), target = [];
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
      const materialKey = file + ':' + materialName;
      if (directory === baseline) allMaterials.set(materialKey, material);
      else if (allMaterials.has(materialKey)) assert.deepEqual(material, allMaterials.get(materialKey));
      else assert(materialName === 'paving' && file.startsWith('cells/cell-e001-s001/'));
      const attributes = Array.from({ length: positions.getCount() }, (_, vertex) => stable(semantics.map(name =>
        [name, primitive.getAttribute(name).getElement(vertex, [])])));
      for (let offset = 0; offset < indices.length; offset += 3) {
        const vertices = Array.from(indices.slice(offset, offset + 3)), source = Math.round(sources.getScalar(vertices[0]));
        assert(vertices.every(vertex => Math.abs(sources.getScalar(vertex) - source) <= .001));
        const record = stable({ matrix, material, corners: oriented(vertices.map(vertex => attributes[vertex])) });
        const records = groups.get(source) ?? []; records.push(record); groups.set(source, records);
        if (source === targetIndex) target.push({ fingerprint: record, material: materialName,
          points: vertices.map(vertex => transform(positions.getElement(vertex, []), matrix)),
          normals: vertices.map(vertex => primitive.getAttribute('NORMAL').getElement(vertex, [])) });
      }
    }
  }
  return { groups: Object.fromEntries([...groups].sort(([a], [b]) => a - b).map(([id, records]) =>
    [id, { triangles: records.length, sha256: sha(records.sort().join('\n')) }])), target };
}
await fs.mkdir(output, { recursive: true });
const inventoryBefore = await inventory(baseline), inventoryAfter = await inventory(candidate);
assert.deepEqual(Object.keys(inventoryAfter).sort(), Object.keys(inventoryBefore).sort());
const permittedChanges = new Set(['manifest.json', 'provenance.json', 'compression-report.json', 'transport-report.json',
  'transport-input-manifest.json', 'river-context.json.gz', 'feature-provenance.json', ...currentSections.flatMap(section => [section, ...section.dependencies])
    .flatMap(item => /\.(gltf|bin)$/.test(item.file) ? [item.file, ...(item.transport ? [item.transport.file] : [])] : [])]);
const changedResources = [], byteExactResources = [];
for (const [file, record] of Object.entries(inventoryBefore)) {
  if (record.sha256 === inventoryAfter[file].sha256) byteExactResources.push(file);
  else { assert(permittedChanges.has(file), 'Unrelated resource changed: ' + file); changedResources.push(file); }
}
const comparisons = [], floors = [];
for (let index = 0; index < currentSections.length; index++) {
  const section = currentSections[index], oldSection = previousSections[index];
  const first = await inspect(baseline, section.file, oldGeo), second = await inspect(candidate, section.file, newGeo);
  const firstGroups = { ...first.groups }, secondGroups = { ...second.groups };
  if (first.target.length || second.target.length) {
    assert(['cells/cell-e001-s001/base.gltf', 'cells/cell-e001-s001/near.gltf'].includes(section.file));
    assert.equal(first.target.length, 108); assert.equal(second.target.length, 110);
    const remaining = [...second.target];
    for (const record of first.target) {
      const position = remaining.findIndex(item => item.fingerprint === record.fingerprint);
      assert(position >= 0, 'An existing platform triangle changed: ' + section.file); remaining.splice(position, 1);
    }
    assert.equal(remaining.length, 2);
    const roofPlan = first.target.filter(item => item.material === 'roof' && item.points.every(point => Math.abs(point[1] - 2.124) < 1e-6))
      .map(item => oriented(item.points.map(point => stable([point[0], point[2]])))).sort();
    assert.equal(roofPlan.length, 2);
    for (const face of remaining) {
      assert.equal(face.material, 'paving'); assert(face.points.every(point => point[1] === 0));
      assert(face.normals.every(normal => Math.abs(normal[1] - 1) < 1e-6));
      const [a, b, c] = face.points, upwardCross = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      assert(upwardCross > 0, 'Floor winding must face upward');
    }
    assert.deepEqual(remaining.map(item => oriented(item.points.map(point => stable([point[0], point[2]])))).sort(), roofPlan);
    floors.push({ file: section.file, oldTriangles: 108, newTriangles: 110, addedTriangles: remaining.map(({ fingerprint, ...rest }) => rest),
      oldTargetFingerprint: first.groups[targetIndex], existingTrianglesExact: true, floorMatchesRetainedRoofPlan: true });
    delete firstGroups[targetIndex]; delete secondGroups[targetIndex];
    assert.equal(section.triangles, oldSection.triangles + 2);
  } else assert.equal(section.triangles, oldSection.triangles);
  assert.deepEqual(secondGroups, firstGroups, 'Unrelated decoded source changed: ' + section.file);
  comparisons.push({ file: section.file, sourceGroupsCompared: Object.keys(first.groups).length,
    unchangedGroupsSha256: sha(stable(firstGroups)), trianglesBefore: oldSection.triangles, trianglesAfter: section.triangles,
    batchesBefore: oldSection.batches, batchesAfter: section.batches });
  console.log('Compared ' + section.file);
}
assert.equal(floors.length, 2);

const provenanceBefore = await json(path.join(baseline, 'provenance.json')), provenance = await json(path.join(candidate, 'provenance.json'));
const producerFiles = { styleSha256: 'experience/art/neighborhood-style.json', generatorSha256: 'experience/art/build_neighborhood.py',
  geometryHelperSha256: 'experience/art/neighborhood_mesh.py', landmarkHelperSha256: 'experience/art/neighborhood_landmarks.py',
  materialHelperSha256: 'experience/art/neighborhood_materials.py', sceneSha256: 'experience/src/neighborhoods/shijo-east/scene.json',
  geographySha256: 'experience/src/neighborhoods/shijo-east/geography.json', preparedArtProducerSha256: 'experience/content-tools/prepare-neighborhood-art.py',
  preparedArtSha256: 'artifacts/neighborhood-20261023/world/art-selection.json' };
for (const [field, file] of Object.entries(producerFiles)) assert.equal((await identity(path.join(root, file))).sha256, provenance[field]);
assert.equal(provenance.geographySha256, newGeo); assert.equal(provenance.sceneSha256, provenanceBefore.sceneSha256);
assert.deepEqual(provenance.sourceMaterialOverrides, provenanceBefore.sourceMaterialOverrides);
for (const field of ['walkableMaterialAudit', 'arcadeGeometryAudit', 'waterBoundaryAudit', 'reviewedRoadMask', 'sourceLedger', 'references', 'retainedLandmarks'])
  assert.deepEqual(provenance[field], provenanceBefore[field]);
const treatment = provenance.sourceTreatmentOverrides[0], oldTreatment = provenanceBefore.sourceTreatmentOverrides[0];
assert.equal(provenance.sourceTreatmentOverrides.length, 1); assert.equal(treatment.sourceId, targetId);
const restoredConstruction = { ...treatment.construction };
assert.equal(restoredConstruction.floorMaterial, 'paving'); assert.equal(restoredConstruction.floorHeightMetres, 0);
assert.equal(restoredConstruction.floorWalkable, false);
for (const field of ['floorMaterial', 'floorHeightMetres', 'floorWalkable']) delete restoredConstruction[field];
assert.deepEqual(restoredConstruction, oldTreatment.construction);
assert.deepEqual(treatment.evidence.slice(0, 3), oldTreatment.evidence); assert.equal(treatment.evidence.length, 4);
for (const record of treatment.evidenceRecords) {
  const bytes = await fs.readFile(path.join(root, record.file)); assert.equal(sha(bytes), record.sha256); assert.deepEqual(JSON.parse(bytes), record.record);
}
const floorEvidence = treatment.evidenceRecords[3];
assert.equal(floorEvidence.sha256, 'c3f236da23c9e83b9a44d5d4b2a06d0f03cbca14be8c79b780713a62ea1aea8a');
const oldFeatures = await json(path.join(baseline, 'feature-provenance.json'));
const newFeatures = await json(path.join(candidate, 'feature-provenance.json'));
const featureOverride = newFeatures[targetIndex].treatmentOverride;
assert.deepEqual(featureOverride.construction, treatment.construction);
assert.deepEqual(featureOverride.evidence, treatment.evidence);
assert.equal(featureOverride.authored, treatment.authored);
for (const field of ['construction', 'evidence', 'authored']) featureOverride[field] = oldFeatures[targetIndex].treatmentOverride[field];
assert.deepEqual(newFeatures, oldFeatures, 'Feature provenance changed outside the approved floor metadata');
const riverInput = provenance.riverContext.input, encodedRiver = await fs.readFile(path.join(candidate, riverInput.file));
assert.deepEqual({ bytes: encodedRiver.length, sha256: sha(encodedRiver) }, { bytes: riverInput.bytes, sha256: riverInput.sha256 });
const decodedRiver = gunzipSync(encodedRiver); assert.equal(sha(decodedRiver), riverInput.decodedSha256); assert.equal(decodedRiver.length, riverInput.decodedBytes);
assert.equal(riverInput.decodedSha256, 'd77ea7a06b26954ea52a6991d45cd4c044b4c1659afd2df2bbe457cd23aef1c5');
const oldRiver = JSON.parse(gunzipSync(await fs.readFile(path.join(baseline, provenanceBefore.riverContext.input.file))));
const newRiver = JSON.parse(decodedRiver); newRiver.sourceHashes = oldRiver.sourceHashes; assert.deepEqual(newRiver, oldRiver);

// 资源哈希、gzip 解码以及传输预算独立核对；解码字节不作为显存测量。
const gzipResources = new Set(), sectionBudgets = [];
for (const section of currentSections) {
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
const compression = await json(path.join(candidate, 'compression-report.json'));
assert.equal(compression.assets.length, 74);
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
const report = { status: 'pass', reviewedAt: '2026-10-23', sourceId: targetId, sourceIndex: targetIndex,
  baseline: { directory: path.relative(root, baseline), manifest: inventoryBefore['manifest.json'] },
  candidate: { directory: path.relative(root, candidate), manifest: inventoryAfter['manifest.json'], provenance: inventoryAfter['provenance.json'] },
  producer: { file: path.relative(root, fileURLToPath(import.meta.url)), ...await identity(fileURLToPath(import.meta.url)) },
  parserVersions: { gltfTransform: '4.5.1', meshoptimizer: '1.3.0' },
  comparison: { sections: comparisons, floors, sourceGroupsCompared: comparisons.reduce((sum, item) => sum + item.sourceGroupsCompared, 0),
    completeExistingAttributesMaterialsMatricesExact: true, allUnrelatedSourcesExact: true },
  source: { geographySha256: newGeo, sceneSha256: provenance.sceneSha256, preparedArtSha256: provenance.preparedArtSha256,
    riverContextDecodedSha256: riverInput.decodedSha256, floorEvidence: treatment.evidence[3], producerFiles,
    sourceIndicesExact: true, featureTableExact: true, riverGeometryExact: true },
  resources: { files: Object.keys(inventoryAfter).length, byteExactCount: byteExactResources.length, changedResources,
    newImages: 0, gzipRoundTrips: gzipResources.size },
  validation: { containers: 74, reportedErrors: 0 }, budgets: { sections: sectionBudgets, startup: critical },
  limits: 'The source footprint is used as an authored paving plan at virtual height0. Real material/elevation remain unmeasured. The pre-export independent overlap evidence establishes zero overlap with retained display/navigation. This decoded audit proves two upward floor triangles and preservation; actual browser appearance, GPU memory and performance require separate checks. Startup totals exclude application HTML/JS/CSS/fonts and HTTP framing.' };
await fs.writeFile(path.join(output, 'candidate9-export-audit.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, sections: comparisons.length, floors: floors.length, gzipRoundTrips: gzipResources.size, critical }));
