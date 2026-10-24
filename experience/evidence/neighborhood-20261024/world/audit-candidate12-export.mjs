import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { APPROVED_FACADES, EXPECTED_THIN_SHEET, THIN_MATERIALS,
  assertFacadeRegionPreserved, assertThinSheetPairs } from './candidate12-regions.mjs';

// 独立解码全部模型，完整保留来源属性；授权变化分别接受区域和材质角色检查。
const root = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const [baselineArg, candidateArg, expectedManifest, outputArg] = process.argv.slice(2);
assert(baselineArg && candidateArg && expectedManifest && outputArg);
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
const { Matrix3, Matrix4, Vector3 } = await import(pathToFileURL(path.join(root, 'experience/node_modules/three/build/three.module.js')));
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const before = await json(path.join(baseline, 'manifest.json')), after = await json(path.join(candidate, 'manifest.json'));
assert.equal((await identity(path.join(baseline, 'manifest.json'))).sha256, '4fb428b9d5b73274f0e64726cdf045f034e7be1823b8919f7ea6ef7d3bc09544');
assert.equal((await identity(path.join(candidate, 'manifest.json'))).sha256, expectedManifest);
for (const field of ['id', 'revision', 'frame', 'bounds', 'featureTable', 'lighting', 'cellSizeMetres', 'limits'])
  assert.deepEqual(after[field], before[field], field);
const resourcesByFile = resources => Object.fromEntries(resources.map(resource => [resource.file, resource]));
assert.equal(new Set(after.sharedResources.map(item => item.file)).size, after.sharedResources.length);
assert.deepEqual(resourcesByFile(after.sharedResources), resourcesByFile(before.sharedResources));
const oldSections = sectionList(before), newSections = sectionList(after);
assert.equal(newSections.length, 74);
assert.deepEqual(newSections.map(item => item.file), oldSections.map(item => item.file));
assert.deepEqual(after.cells.map(({ base, near, ...rest }) => rest), before.cells.map(({ base, near, ...rest }) => rest));
const scene = await json(path.join(root, 'experience/src/neighborhoods/shijo-east/scene.json'));
const features = Object.fromEntries(scene.features.map(feature => [feature.sourceId, feature]));
const reviewFiles = {
  201: ['connector-fronts/daimaru-source-review.json', '93bc46595c9ec5b3b42707c351670968592e13af2190da208d22760aab33945b'],
  274: ['connector-fronts/anonymous-west-neighbor-approved.json', 'feba0e468af8df64fb333fc8a62c311b3226807743fe8a4fc060a85bab69deac'],
};
for (const [index, [file, expected]] of Object.entries(reviewFiles)) {
  const absolute = fileURLToPath(new URL(file, import.meta.url));
  assert.equal((await identity(absolute)).sha256, expected);
  const review = await json(absolute);
  assert.equal(review.sourceId, after.featureTable[index].sourceId);
  assert.equal(review.status, 'source-reviewed-bounded-authoring');
  for (const key of ['scene', 'geography'])
    assert.equal((await identity(path.join(root, review[key].file))).sha256, review[key].sha256);
  assert.equal((await identity(path.join(root, review.photographicReference.originalFile))).sha256,
    review.photographicReference.originalSha256);
}

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
  return Object.fromEntries(document.materials.map(material => [material.name, resolve(material)]));
}
const newMaterialSources = { 'daimaru-brown-tile': 201, 'frontage-dark-glass': 274,
  ...Object.fromEntries(Object.keys(THIN_MATERIALS).map(name => [name, 139])) };
const oriented = corners => [0, 1, 2].map(start => [0, 1, 2].map(offset => corners[(start + offset) % 3]).join('|')).sort()[0];
const transform = (point, matrix) => [0, 1, 2].map(axis =>
  matrix[axis] * point[0] + matrix[axis + 4] * point[1] + matrix[axis + 8] * point[2] + matrix[axis + 12]);
const typedIdentity = array => ({ type: array.constructor.name, length: array.length,
  sha256: sha(Buffer.from(array.buffer, array.byteOffset, array.byteLength)) });
async function inspect(directory, file, priorMaterials = null) {
  const raw = await json(path.join(directory, file)), materials = materialRecords(raw);
  const originalMaterials = priorMaterials ?? materials;
  const document = await io.read(path.join(directory, file)), groups = new Map(), targets = new Map(), walkable = {}, thin = [];
  const usedNewMaterials = new Set();
  for (const [name, material] of Object.entries(materials)) {
    if (!Object.hasOwn(newMaterialSources, name)) assert.deepEqual(material, originalMaterials[name], 'Existing material changed: ' + name);
    else {
      assert(material.pbrMetallicRoughness); assert.equal(material.alphaMode ?? 'OPAQUE', 'OPAQUE');
      assert.deepEqual(material.emissiveFactor ?? [0, 0, 0], [0, 0, 0]);
      assert.equal(material.extensions?.KHR_materials_transmission?.transmissionFactor ?? 0, 0);
      if (THIN_MATERIALS[name]) assert.equal(material.pbrMetallicRoughness.metallicFactor ?? 1, 0);
    }
  }
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const matrix = node.getWorldMatrix(), extras = node.getExtras();
    const normalMatrix = new Matrix3().getNormalMatrix(new Matrix4().fromArray(matrix));
    for (const [primitiveIndex, primitive] of mesh.listPrimitives().entries()) {
      assert.equal(primitive.getMode(), 4);
      const semantics = primitive.listSemantics().sort(), sourceName = semantics.find(name => name.toUpperCase() === '_SOURCE_INDEX');
      assert(sourceName);
      const sources = primitive.getAttribute(sourceName), positions = primitive.getAttribute('POSITION'), normals = primitive.getAttribute('NORMAL');
      const indices = primitive.getIndices().getArray(), materialName = primitive.getMaterial().getName(), material = materials[materialName];
      assert(material);
      if (extras.walkable === true) walkable[node.getName() + ':' + primitiveIndex] = {
        extras, matrix, material, indices: typedIdentity(indices),
        attributes: Object.fromEntries(semantics.map(name => [name, typedIdentity(primitive.getAttribute(name).getArray())])) };
      const canonicalExtras = structuredClone(extras);
      let canonicalMaterial = material;
      if (THIN_MATERIALS[materialName]) {
        assert.deepEqual(extras.thinSheet, EXPECTED_THIN_SHEET);
        assert.equal(extras.occlusionGroup, 'Canopy_' + extras.cellId);
        assert(node.getName().includes('_Canopy_'));
        delete canonicalExtras.thinSheet; canonicalMaterial = originalMaterials[THIN_MATERIALS[materialName]];
      } else assert.equal(extras.thinSheet, undefined, 'Unapproved thin-sheet assignment');
      const primitiveIdentity = sha(stable({ matrix, material: canonicalMaterial, extras: canonicalExtras }));
      const attributes = Array.from({ length: positions.getCount() }, (_, vertex) => stable(semantics.map(name =>
        [name, primitive.getAttribute(name).getElement(vertex, [])])));
      for (let offset = 0; offset < indices.length; offset += 3) {
        const vertices = Array.from(indices.slice(offset, offset + 3)), sourceIndex = Math.round(sources.getScalar(vertices[0]));
        assert(vertices.every(vertex => Math.abs(sources.getScalar(vertex) - sourceIndex) <= .001));
        if (Object.hasOwn(newMaterialSources, materialName)) {
          assert.equal(sourceIndex, newMaterialSources[materialName]); usedNewMaterials.add(materialName);
        }
        const fingerprint = sha(primitiveIdentity + '\n' + oriented(vertices.map(vertex => attributes[vertex])));
        const group = groups.get(sourceIndex) ?? []; group.push(fingerprint); groups.set(sourceIndex, group);
        if ([139, 201, 274].includes(sourceIndex)) {
          const record = { fingerprint, sourceIndex, material: materialName,
            points: vertices.map(vertex => transform(positions.getElement(vertex, []), matrix)),
            worldNormals: vertices.map(vertex => new Vector3().fromArray(normals.getElement(vertex, [])).applyNormalMatrix(normalMatrix).toArray()),
            thinSheet: extras.thinSheet,
            allAttributesFinite: vertices.every(vertex => semantics.every(name => primitive.getAttribute(name).getElement(vertex, []).every(Number.isFinite))) };
          const target = targets.get(sourceIndex) ?? []; target.push(record); targets.set(sourceIndex, target);
          if (THIN_MATERIALS[materialName]) thin.push(record);
        }
      }
    }
  }
  return { groups: Object.fromEntries([...groups].sort(([a], [b]) => a - b).map(([id, records]) =>
    [id, { triangles: records.length, sha256: sha(records.sort().join('\n')) }])), targets, materials, walkable, thin,
    usedNewMaterials: [...usedNewMaterials], sceneExtras: raw.scenes?.map(scene => scene.extras) };
}

await fs.mkdir(output, { recursive: true });
const inventoryBefore = await inventory(baseline), inventoryAfter = await inventory(candidate);
assert.deepEqual(Object.keys(inventoryAfter).sort(), Object.keys(inventoryBefore).sort());
const permittedChanges = new Set(['manifest.json', 'provenance.json', 'references.json', 'compression-report.json', 'transport-report.json',
  'transport-input-manifest.json', ...newSections.flatMap(section => [section, ...section.dependencies])
    .flatMap(item => /\.(gltf|bin)$/.test(item.file) ? [item.file, ...(item.transport ? [item.transport.file] : [])] : [])]);
const changedResources = [], byteExactResources = [];
for (const [file, record] of Object.entries(inventoryBefore)) {
  if (record.sha256 === inventoryAfter[file].sha256) byteExactResources.push(file);
  else { assert(permittedChanges.has(file), 'Unrelated resource changed: ' + file); changedResources.push(file); }
}
const comparisons = [], regions = [], thinSheets = [], walkableChecks = [], materialsAdded = new Set();
for (let index = 0; index < newSections.length; index++) {
  const section = newSections[index], oldSection = oldSections[index];
  const first = await inspect(baseline, section.file), second = await inspect(candidate, section.file, first.materials);
  assert.deepEqual(second.sceneExtras, first.sceneExtras);
  assert.deepEqual(second.walkable, first.walkable, 'Walkable mesh bytes/metadata changed: ' + section.file);
  if (Object.keys(first.walkable).length) walkableChecks.push({ file: section.file, primitives: first.walkable });
  const firstGroups = { ...first.groups }, secondGroups = { ...second.groups };
  let delta = 0;
  for (const sourceIndex of [201, 274]) {
    const originals = first.targets.get(sourceIndex) ?? [], replacements = second.targets.get(sourceIndex) ?? [];
    if (!originals.length) { assert.equal(replacements.length, 0); continue; }
    const feature = features[after.featureTable[sourceIndex].sourceId]; assert(feature);
    const lod = path.basename(section.file, '.gltf');
    const result = assertFacadeRegionPreserved(originals, replacements, { sourceIndex, lod, feature });
    regions.push({ file: section.file, ...result }); delta += replacements.length - originals.length;
    delete firstGroups[sourceIndex]; delete secondGroups[sourceIndex];
  }
  assert.deepEqual(secondGroups, firstGroups, 'Unapproved decoded source attributes/material/world matrix/metadata changed: ' + section.file);
  if (second.thin.length) thinSheets.push({ file: section.file, ...assertThinSheetPairs(second.thin),
    originalRoofAndTrimAttributesExact: true, canonicalMaterialMapping: THIN_MATERIALS });
  for (const name of second.usedNewMaterials) materialsAdded.add(name);
  assert.equal(section.triangles, oldSection.triangles + delta);
  comparisons.push({ file: section.file, sourceGroupsCompared: Object.keys(first.groups).length,
    unchangedGroupsSha256: sha(stable(firstGroups)), trianglesBefore: oldSection.triangles, trianglesAfter: section.triangles,
    approvedTriangleDelta: delta, batchesBefore: oldSection.batches, batchesAfter: section.batches });
  console.log('Compared ' + section.file);
}
assert.equal(regions.length, 4);
assert.deepEqual(regions.map(item => [item.sourceIndex, item.lod]).sort(), [[201, 'base'], [201, 'near'], [274, 'base'], [274, 'near']]);
assert(thinSheets.length > 0);
assert.deepEqual([...materialsAdded].sort(), Object.keys(newMaterialSources).sort());
assert.equal(walkableChecks.length, 1); assert.equal(Object.keys(walkableChecks[0].primitives).length, 2);
assert(regions.filter(item => item.lod === 'base').reduce((sum, item) => sum + item.afterTriangles - item.beforeTriangles, 0) <= 4000);

const oldProvenance = await json(path.join(baseline, 'provenance.json')), provenance = await json(path.join(candidate, 'provenance.json'));
const producerFiles = { styleSha256: 'experience/art/neighborhood-style.json', generatorSha256: 'experience/art/build_neighborhood.py',
  geometryHelperSha256: 'experience/art/neighborhood_mesh.py', landmarkHelperSha256: 'experience/art/neighborhood_landmarks.py',
  materialHelperSha256: 'experience/art/neighborhood_materials.py', sceneSha256: 'experience/src/neighborhoods/shijo-east/scene.json',
  geographySha256: 'experience/src/neighborhoods/shijo-east/geography.json', preparedArtSha256: 'artifacts/neighborhood-20261023/world/art-selection.json' };
for (const [field, file] of Object.entries(producerFiles)) assert.equal((await identity(path.join(root, file))).sha256, provenance[field]);
const allowedProvenanceChanges = new Set(['styleSha256', 'generatorSha256', 'geometryHelperSha256', 'landmarkHelperSha256',
  'elapsedSeconds', 'sourceFacadeOverrides', 'sourceThinSheets', 'references', 'referenceIds']);
for (const field of new Set([...Object.keys(oldProvenance), ...Object.keys(provenance)]))
  if (!allowedProvenanceChanges.has(field)) assert.deepEqual(provenance[field], oldProvenance[field], 'Unrelated provenance changed: ' + field);
const style = await json(path.join(root, producerFiles.styleSha256));
assert.equal(provenance.sourceFacadeOverrides.length, 2);
for (const override of provenance.sourceFacadeOverrides) {
  const { sourceId, evidenceRecord, ...settings } = override;
  assert.deepEqual(settings, style.sourceFacadeOverrides[sourceId]);
  assert(Object.hasOwn(APPROVED_FACADES, settings.expectedSourceIndex));
  assert.equal((await identity(path.join(root, settings.evidence.file))).sha256, settings.evidence.sha256);
  assert.deepEqual(evidenceRecord, await json(path.join(root, settings.evidence.file)));
}
assert.deepEqual(provenance.sourceThinSheets, style.sourceThinSheets);
assert.deepEqual(Object.keys(provenance.sourceThinSheets), ['osm:way:772134672']);
assert.deepEqual(provenance.sourceThinSheets['osm:way:772134672'].thinSheet, EXPECTED_THIN_SHEET);
const oldReferences = await json(path.join(baseline, 'references.json')), references = await json(path.join(candidate, 'references.json'));
assert.deepEqual(references.references.filter(item => item.id !== 'daimaru-shijo-2021'), oldReferences.references);
assert.equal(references.references.length, oldReferences.references.length + 1);
const addedReference = references.references.find(item => item.id === 'daimaru-shijo-2021');
assert.equal(addedReference.sha256, '663c0cad636d1fc03bc2ec3785ab5c6429227c31e65b2e2bc587695bcce9cb2b');
assert.equal(addedReference.author, 'Nryate'); assert.equal(addedReference.license, 'CC BY-SA 4.0');
assert.equal(addedReference.captureDate, '2021-03-14');
assert.deepEqual(provenance.referenceIds, [...new Set([...oldProvenance.referenceIds, 'daimaru-shijo-2021'])].sort());
assert.deepEqual(inventoryAfter[provenance.references.file], { bytes: provenance.references.bytes, sha256: provenance.references.sha256 });

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
assert.equal(gzipResources.size, 148);
const compression = await json(path.join(candidate, 'compression-report.json')); assert.equal(compression.assets.length, 74);
assert.equal(compression.producerSha256, (await identity(path.join(root, 'experience/art/optimize_neighborhood.mjs'))).sha256);
assert(compression.assets.every(asset => !asset.inputIssues.numErrors && !asset.outputIssues.numErrors &&
  asset.maximumPositionErrorMetres === 0 && asset.maximumUVError === 0 && asset.sourceIndicesExact));
const transport = await json(path.join(candidate, 'transport-report.json'));
assert.equal(transport.producerSha256, (await identity(path.join(root, 'experience/art/package_neighborhood_transport.mjs'))).sha256);
assert.equal(transport.outputManifestSha256, inventoryAfter['manifest.json'].sha256);
assert.equal(transport.inputManifestSha256, inventoryAfter['transport-input-manifest.json'].sha256);
assert.deepEqual(inventoryAfter[after.provenance.file], { bytes: after.provenance.bytes, sha256: after.provenance.sha256 });
const startup = new Map();
for (const section of [after.ground, after.context, after.lighting, after.cells.find(cell => cell.id === 'cell-e000-n000').base])
  for (const resource of [section, ...section.dependencies]) startup.set(resource.file, resource);
let commonBytes = inventoryAfter['manifest.json'].bytes;
for (const resource of startup.values()) { const transferred = resource.transport ?? resource;
  assert.deepEqual(inventoryAfter[transferred.file], { bytes: transferred.bytes, sha256: transferred.sha256 }); commonBytes += transferred.bytes; }
const traveller = await identity(path.join(root, 'experience/public/models/traveller.glb'));
const lighting = await json(path.join(candidate, after.lighting.file)), critical = {};
for (const mode of ['day', 'night']) {
  const environment = lighting.modes[mode].environment, hdr = await identity(path.resolve(candidate, path.dirname(after.lighting.file), environment.file));
  assert.equal(hdr.sha256, environment.sha256); assert.equal(hdr.bytes, environment.bytes);
  const totalBytes = commonBytes + traveller.bytes + hdr.bytes; assert(totalBytes <= 4 * 1024 * 1024);
  critical[mode] = { totalBytes, commonBytes, travellerBytes: traveller.bytes, hdrBytes: hdr.bytes, limitBytes: 4 * 1024 * 1024 };
}
const report = { status: 'pass', reviewedAt: '2026-10-24',
  baseline: { directory: path.relative(root, baseline), manifest: inventoryBefore['manifest.json'] },
  candidate: { directory: path.relative(root, candidate), manifest: inventoryAfter['manifest.json'], provenance: inventoryAfter['provenance.json'] },
  producer: { file: path.relative(root, fileURLToPath(import.meta.url)), ...await identity(fileURLToPath(import.meta.url)),
    regions: { file: path.relative(root, fileURLToPath(new URL('candidate12-regions.mjs', import.meta.url))),
      ...await identity(fileURLToPath(new URL('candidate12-regions.mjs', import.meta.url))) } },
  parserVersions: { gltfTransform: '4.5.1', meshoptimizer: '1.3.0' },
  comparison: { sections: comparisons, regions, thinSheets, walkableChecks,
    sourceGroupsCompared: comparisons.reduce((sum, item) => sum + item.sourceGroupsCompared, 0),
    allUnapprovedAttributesMaterialsTransformsMetadataExact: true, walkableAttributeAndIndexBytesExact: true,
    allExistingMaterialDefinitionsExact: true, newMaterialSources },
  source: { geographySha256: provenance.geographySha256, sceneSha256: provenance.sceneSha256,
    preparedArtSha256: provenance.preparedArtSha256, reviewFiles, producerFiles,
    featureTableExact: true, originalSourceAndNavigationExact: true, photographicReference: addedReference },
  resources: { files: Object.keys(inventoryAfter).length, byteExactCount: byteExactResources.length, changedResources,
    newImages: 0, gzipRoundTrips: gzipResources.size },
  validation: { containers: 74, reportedErrors: 0 }, budgets: { sections: sectionBudgets, startup: critical },
  limits: 'Authored facade dimensions and thin-sheet optical values remain explicit. Exact oriented triangles retain source attributes and world transforms despite container indexing/order. This decoded audit requires separate native day/night visual acceptance and timing. Startup excludes HTML/JS/CSS/fonts and HTTP framing.' };
await fs.writeFile(path.join(output, 'candidate12-export-audit.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, sections: comparisons.length, regions: regions.length,
  thinSheetSections: thinSheets.length, gzipRoundTrips: gzipResources.size, critical }));
