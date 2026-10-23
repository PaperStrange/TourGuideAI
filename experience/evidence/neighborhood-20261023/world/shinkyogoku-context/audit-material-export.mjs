import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

// 独立读取全部解码三角形；只有指定屋顶的新切线和材质属于允许差异。
const root = path.resolve(fileURLToPath(new URL('../../../../../', import.meta.url)));
const [baselineArg, candidateArg, outputArg] = process.argv.slice(2);
assert(baselineArg && candidateArg && outputArg, 'Supply baseline, candidate and ignored output directory');
const baseline = path.resolve(baselineArg), candidate = path.resolve(candidateArg), output = path.resolve(outputArg);
assert(output.startsWith(path.join(root, 'artifacts') + path.sep), 'Intermediate output must remain ignored');
const targetId = 'osm:way:551741577', targetIndex = 116, newMaterial = 'shinkyogoku-panel';
const expectedCells = ['cell-e006-n000', 'cell-e006-n001', 'cell-e006-n002', 'cell-e006-n003',
  'cell-e006-n004', 'cell-e007-n003', 'cell-e007-n004', 'cell-e007-n005'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const identity = async file => { const bytes = await fs.readFile(file); return { bytes: bytes.length, sha256: sha(bytes) }; };
const stable = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const sections = manifest => [manifest.ground, manifest.context, ...manifest.cells.flatMap(cell => [cell.base, cell.near])];
const toolDirectory = path.join(root, 'artifacts/neighborhood-20261021/art/tools/node_modules');
const { NodeIO } = await import(pathToFileURL(path.join(toolDirectory, '@gltf-transform/core/dist/index.js')));
const { ALL_EXTENSIONS } = await import(pathToFileURL(path.join(toolDirectory, '@gltf-transform/extensions/dist/index.js')));
const { MeshoptDecoder } = await import(pathToFileURL(path.join(toolDirectory, 'meshoptimizer/index.js')));
const { default: sharp } = await import(pathToFileURL(path.join(toolDirectory, 'sharp/dist/index.mjs')));
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const before = await readJSON(path.join(baseline, 'manifest.json'));
const after = await readJSON(path.join(candidate, 'manifest.json'));
assert.equal((await identity(path.join(baseline, 'manifest.json'))).sha256,
  '679241ee06a8115ad3f95ddd523c2f56555b900f3ecc4437d272573a968ec4e5');
for (const field of ['id', 'revision', 'frame', 'bounds', 'featureTable', 'lighting']) assert.deepEqual(after[field], before[field]);
assert.equal(after.featureTable[targetIndex].sourceId, targetId);
const oldSections = sections(before), newSections = sections(after);
assert.equal(newSections.length, 74);
assert.deepEqual(newSections.map(item => item.file), oldSections.map(item => item.file));
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

// 纹理和采样器按内容解析，容器内部索引重排不等同于材质变化。
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
const tangentSummary = { verticesChecked: 0, verticesWithoutTangents: 0, maximumNormalDot: 0, maximumLengthError: 0,
  maximumNormalLengthError: 0, maximumHandednessError: 0 };
const materialDefinitions = new Map();
async function inspect(directory, file, replacementRoof = null) {
  const json = await readJSON(path.join(directory, file));
  const materials = materialRecords(json);
  const document = await io.read(path.join(directory, file));
  const groups = new Map(), materialCounts = {}, targetSemantics = {}, panelDefinitions = [];
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const matrix = node.getWorldMatrix();
    for (const primitive of mesh.listPrimitives()) {
      assert.equal(primitive.getMode(), 4);
      const semantics = primitive.listSemantics().sort();
      const sourceName = semantics.find(name => name.toUpperCase() === '_SOURCE_INDEX');
      assert(sourceName);
      const sourceAttribute = primitive.getAttribute(sourceName), positions = primitive.getAttribute('POSITION');
      const indices = primitive.getIndices().getArray();
      const materialName = primitive.getMaterial().getName(), material = materials.get(materialName);
      assert(material);
      const isPanel = materialName === newMaterial;
      if (isPanel) {
        assert(replacementRoof, 'Baseline cannot contain the new material');
        assert.equal(material.alphaMode ?? 'OPAQUE', 'OPAQUE');
        assert.deepEqual(material.emissiveFactor ?? [0, 0, 0], [0, 0, 0]);
        assert.equal(material.pbrMetallicRoughness.metallicFactor ?? 1, 0);
        assert(Math.abs(material.normalTexture.scale - .12) < 1e-6);
        assert(!material.extensions?.KHR_materials_transmission);
        panelDefinitions.push(material);
      }
      const attributes = Array.from({ length: positions.getCount() }, (_, vertex) => stable(semantics
        .filter(name => !(isPanel && name === 'TANGENT'))
        .map(name => [name, primitive.getAttribute(name).getElement(vertex, [])])));
      for (let offset = 0; offset < indices.length; offset += 3) {
        const vertices = Array.from(indices.slice(offset, offset + 3));
        const sourceIndex = Math.round(sourceAttribute.getScalar(vertices[0]));
        // 仅审计分组兼容旧浮点来源编号；全部原始属性仍纳入精确比较。
        assert(vertices.every(vertex => Math.abs(sourceAttribute.getScalar(vertex) - sourceIndex) <= .001));
        if (isPanel) {
          assert.equal(sourceIndex, targetIndex, 'Replacement material leaked to another source');
          for (const vertex of vertices) {
            assert(Math.abs(transform(positions.getElement(vertex, []), matrix)[1] - 5) < 1e-6);
            const tangentAttribute = primitive.getAttribute('TANGENT');
            if (!tangentAttribute) { tangentSummary.verticesWithoutTangents++; continue; }
            const tangent = tangentAttribute.getElement(vertex, []);
            const normal = primitive.getAttribute('NORMAL').getElement(vertex, []);
            assert([...tangent, ...normal].every(Number.isFinite));
            const dot = Math.abs(normal.reduce((sum, value, index) => sum + value * tangent[index], 0));
            const lengthError = Math.abs(Math.hypot(...tangent.slice(0, 3)) - 1);
            const normalError = Math.abs(Math.hypot(...normal) - 1);
            const handednessError = Math.abs(Math.abs(tangent[3]) - 1);
            assert(dot <= 1e-4 && lengthError <= 1e-4 && normalError <= 1e-4 && handednessError <= 1e-6);
            tangentSummary.verticesChecked++;
            tangentSummary.maximumNormalDot = Math.max(tangentSummary.maximumNormalDot, dot);
            tangentSummary.maximumLengthError = Math.max(tangentSummary.maximumLengthError, lengthError);
            tangentSummary.maximumNormalLengthError = Math.max(tangentSummary.maximumNormalLengthError, normalError);
            tangentSummary.maximumHandednessError = Math.max(tangentSummary.maximumHandednessError, handednessError);
          }
        }
        if (sourceIndex === targetIndex) {
          materialCounts[materialName] = (materialCounts[materialName] ?? 0) + 1;
          targetSemantics[materialName] = semantics;
          if (!replacementRoof && materialName === 'roof') assert(!semantics.includes('TANGENT'));
        }
        const record = stable({ matrix, material: isPanel ? replacementRoof : material,
          corners: oriented(vertices.map(vertex => attributes[vertex])) });
        const group = groups.get(sourceIndex) ?? []; group.push(record); groups.set(sourceIndex, group);
      }
    }
  }
  if (panelDefinitions.length) {
    for (const material of panelDefinitions) {
      const normalized = stable(material);
      if (materialDefinitions.size) assert(materialDefinitions.has(normalized), 'Panel material varies across cells');
      materialDefinitions.set(normalized, material);
    }
  }
  return { groups: Object.fromEntries([...groups].sort(([a], [b]) => a - b).map(([id, records]) =>
    [id, { triangles: records.length, sha256: sha(records.sort().join('\n')) }])), materialCounts, targetSemantics,
    roofMaterial: materials.get('roof') };
}

await fs.mkdir(output, { recursive: true });
const inventoryBefore = await inventory(baseline), inventoryAfter = await inventory(candidate);
const byteExact = [], changed = [], added = Object.keys(inventoryAfter).filter(file => !inventoryBefore[file]);
const newMapPattern = /^shared\/materials\/shinkyogoku-panel-(color|normal|roughness)\.webp$/;
assert.equal(added.length, 3); assert(added.every(file => newMapPattern.test(file)));
const permittedChanges = new Set(['manifest.json', 'provenance.json', 'compression-report.json',
  'transport-report.json', 'transport-input-manifest.json', ...newSections.flatMap(section => [section, ...section.dependencies])
    .flatMap(item => /\.(gltf|bin)$/.test(item.file) ? [item.file, ...(item.transport ? [item.transport.file] : [])] : [])]);
for (const [file, record] of Object.entries(inventoryBefore)) {
  assert(inventoryAfter[file], 'Missing original resource: ' + file);
  if (record.sha256 === inventoryAfter[file].sha256) byteExact.push(file);
  else { assert(permittedChanges.has(file), 'Unrelated resource changed: ' + file); changed.push(file); }
}
const comparisons = [];
for (let index = 0; index < newSections.length; index++) {
  const oldSection = oldSections[index], newSection = newSections[index];
  const first = await inspect(baseline, oldSection.file);
  const second = await inspect(candidate, newSection.file, first.roofMaterial ?? {});
  assert.deepEqual(second.groups, first.groups, 'Decoded per-source attributes/material/world transform changed: ' + newSection.file);
  assert.equal(newSection.triangles, oldSection.triangles);
  const oldMaterials = first.materialCounts, newMaterials = { ...second.materialCounts };
  if (newMaterials[newMaterial]) { newMaterials.roof = newMaterials[newMaterial]; delete newMaterials[newMaterial]; }
  assert.deepEqual(newMaterials, oldMaterials, 'Unexpected target material assignment: ' + newSection.file);
  if (oldMaterials.roof) assert(second.materialCounts[newMaterial]);
  comparisons.push({ file: newSection.file, sourceGroups: second.groups, targetMaterialsBefore: oldMaterials,
    targetMaterialsAfter: second.materialCounts, targetAttributesBefore: first.targetSemantics,
    targetAttributesAfter: second.targetSemantics, triangles: newSection.triangles,
    batchesBefore: oldSection.batches, batchesAfter: newSection.batches });
  console.log('Compared ' + newSection.file);
}
assert.deepEqual(comparisons.filter(item => item.targetMaterialsAfter[newMaterial]).map(item => item.file).sort(),
  expectedCells.flatMap(cell => ['base', 'near'].map(lod => `cells/${cell}/${lod}.gltf`)).sort());

const provenanceBefore = await readJSON(path.join(baseline, 'provenance.json'));
const provenance = await readJSON(path.join(candidate, 'provenance.json'));
for (const field of ['sceneSha256', 'geographySha256', 'preparedArtSha256', 'preparedArtProducerSha256',
  'geometryHelperSha256', 'sourceTreatmentOverrides']) assert.deepEqual(provenance[field], provenanceBefore[field]);
const producerFiles = { styleSha256: 'experience/art/neighborhood-style.json', generatorSha256: 'experience/art/build_neighborhood.py',
  landmarkHelperSha256: 'experience/art/neighborhood_landmarks.py', materialHelperSha256: 'experience/art/neighborhood_materials.py',
  sceneSha256: 'experience/src/neighborhoods/shijo-east/scene.json', geographySha256: 'experience/src/neighborhoods/shijo-east/geography.json' };
for (const [field, file] of Object.entries(producerFiles)) assert.equal((await identity(path.join(root, file))).sha256, provenance[field]);
assert.equal(provenance.sourceMaterialOverrides.length, 1);
const override = provenance.sourceMaterialOverrides[0];
assert.equal(override.sourceId, targetId); assert.equal(override.expectedSourceIndex, targetIndex);
assert.equal(override.expectedSourceVersion, 8); assert.equal(override.expectedTopHeightMetres, 5);
assert.equal(override.roofMaterial, newMaterial); assert.equal(override.priorRoofMaterial, 'roof');
for (const evidence of override.evidenceRecords) {
  const bytes = await fs.readFile(path.join(root, evidence.file));
  assert.equal(sha(bytes), evidence.sha256); assert.deepEqual(JSON.parse(bytes), evidence.record);
}
const maps = [];
for (const file of added.sort()) {
  const bytes = await fs.readFile(path.join(candidate, file));
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.width, 128); assert.equal(metadata.height, 128); assert.equal(metadata.format, 'webp');
  const stats = await sharp(bytes).stats();
  maps.push({ file, ...inventoryAfter[file], width: metadata.width, height: metadata.height,
    channels: metadata.channels, hasAlpha: metadata.hasAlpha, channelStatistics: stats.channels });
}

const checkedResources = new Map(), gzipResources = new Set(), sectionBudgets = [];
for (const section of newSections) {
  for (const resource of [section, ...section.dependencies]) {
    assert.deepEqual(inventoryAfter[resource.file], { bytes: resource.bytes, sha256: resource.sha256 });
    const previous = checkedResources.get(resource.file);
    if (previous) assert.deepEqual(previous, resource); else checkedResources.set(resource.file, resource);
    if (resource.transport && !gzipResources.has(resource.transport.file)) {
      const encoded = await fs.readFile(path.join(candidate, resource.transport.file));
      assert.equal(resource.transport.encoding, 'gzip');
      assert.deepEqual({ bytes: encoded.length, sha256: sha(encoded) }, { bytes: resource.transport.bytes, sha256: resource.transport.sha256 });
      const decoded = gunzipSync(encoded);
      assert.deepEqual({ bytes: decoded.length, sha256: sha(decoded) }, { bytes: resource.bytes, sha256: resource.sha256 });
      gzipResources.add(resource.transport.file);
    }
  }
  const geometry = [section, ...section.dependencies.filter(item => item.file.endsWith('.bin'))];
  const transferred = geometry.reduce((sum, item) => sum + (item.transport ?? item).bytes, 0);
  const decoded = geometry.reduce((sum, item) => sum + item.bytes, 0);
  const limit = section.file === 'cells/cell-e000-n000/near.gltf' ? 3.5 * 1024 * 1024 : 2 * 1024 * 1024;
  assert(transferred <= limit);
  assert.equal(section.transferGeometryBytes, transferred);
  sectionBudgets.push({ file: section.file, transferBytes: transferred, decodedBytes: decoded, limitBytes: limit });
}
const compression = await readJSON(path.join(candidate, 'compression-report.json'));
assert.equal(compression.assets.length, 74);
assert(compression.assets.every(asset => !asset.inputIssues.numErrors && !asset.outputIssues.numErrors &&
  asset.maximumPositionErrorMetres === 0 && asset.maximumUVError === 0 && asset.sourceIndicesExact));
const transport = await readJSON(path.join(candidate, 'transport-report.json'));
assert.equal(transport.outputManifestSha256, inventoryAfter['manifest.json'].sha256);
assert.equal(transport.inputManifestSha256, inventoryAfter['transport-input-manifest.json'].sha256);
assert.deepEqual(inventoryAfter[after.provenance.file], { bytes: after.provenance.bytes, sha256: after.provenance.sha256 });

// 启动传输去重并计入旅人和当前 HDR；解码资源大小单独报告，不等同于显存测量。
const startup = new Map();
for (const section of [after.ground, after.context, after.lighting, after.cells.find(cell => cell.id === 'cell-e000-n000').base]) {
  for (const resource of [section, ...section.dependencies]) startup.set(resource.file, resource);
}
let commonBytes = inventoryAfter['manifest.json'].bytes;
for (const resource of startup.values()) {
  const encoded = resource.transport ?? resource;
  assert.deepEqual(inventoryAfter[encoded.file], { bytes: encoded.bytes, sha256: encoded.sha256 });
  commonBytes += encoded.bytes;
}
assert(!added.some(file => startup.has(file)), 'New material unexpectedly enters startup resources');
const travellerFile = 'experience/public/models/traveller.glb', traveller = await identity(path.join(root, travellerFile));
const lighting = await readJSON(path.join(candidate, after.lighting.file));
const critical = {};
for (const mode of ['day', 'night']) {
  const environment = lighting.modes[mode].environment;
  const hdr = await identity(path.resolve(candidate, path.dirname(after.lighting.file), environment.file));
  assert.equal(hdr.sha256, environment.sha256); assert.equal(hdr.bytes, environment.bytes);
  const totalBytes = commonBytes + traveller.bytes + hdr.bytes;
  assert(totalBytes <= 4 * 1024 * 1024);
  critical[mode] = { commonBytes, travellerBytes: traveller.bytes, hdrBytes: hdr.bytes, totalBytes, limitBytes: 4 * 1024 * 1024 };
}
const report = { status: 'pass', reviewedAt: '2026-10-23', sourceId: targetId, sourceIndex: targetIndex,
  baseline: { directory: path.relative(root, baseline), manifest: inventoryBefore['manifest.json'] },
  candidate: { directory: path.relative(root, candidate), manifest: inventoryAfter['manifest.json'], provenance: inventoryAfter['provenance.json'] },
  auditProducer: await identity(fileURLToPath(import.meta.url)), producerBindings: producerFiles,
  source: { sceneSha256: provenance.sceneSha256, geographySha256: provenance.geographySha256, override },
  parserVersions: { gltfTransform: '4.5.1', meshoptimizer: '1.3.0', sharp: sharp.versions.sharp },
  permittedDifference: 'Only source116 existing roof triangles may use the new opaque PBR material and newly generated tangent attribute. Existing attributes, oriented triangles, matrices and all unrelated material definitions are compared exactly. Tangent presence is recorded; exported tangents, when present, are validated separately.',
  comparison: { decodedSections: comparisons.length, sections: comparisons, tangentSummary, panelMaterials: [...materialDefinitions.values()] },
  resources: { count: Object.keys(inventoryAfter).length, byteExactCount: byteExact.length, changed, addedMaps: maps, verifiedGzipResources: gzipResources.size },
  validation: { containerCount: compression.assets.length, errors: 0,
    warnings: compression.assets.map(asset => ({ file: asset.file, input: asset.inputIssues.numWarnings, output: asset.outputIssues.numWarnings })) },
  budgets: { sections: sectionBudgets, startup: critical, traveller: { file: travellerFile, ...traveller },
    newTextureRGBA8FullMipEquivalentBytes: 3 * (128 ** 2 + 64 ** 2 + 32 ** 2 + 16 ** 2 + 8 ** 2 + 4 ** 2 + 2 ** 2 + 1) * 4 },
  limitations: 'The 2022 association image has unspecified street position and supplies no measured profile or current-condition evidence. Original opaque materials approximate appearance only. This audit does not establish visual quality, transparent transmission, measured geometry, navigational access, GPU memory or runtime frame cost. Startup totals exclude application HTML/JS/CSS/fonts and HTTP framing.' };
await fs.writeFile(path.join(output, 'material-export-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, sections: comparisons.length, maps: maps.length, tangentSummary, critical }));
