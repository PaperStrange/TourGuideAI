import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

const root = path.resolve(fileURLToPath(new URL('../../../../../', import.meta.url)));
const [baselineArg, candidateArg, outputArg] = process.argv.slice(2);
assert(baselineArg && candidateArg && outputArg, 'Supply baseline, candidate and ignored output directory');
const baseline = path.resolve(baselineArg), candidate = path.resolve(candidateArg), output = path.resolve(outputArg);
assert(output.startsWith(path.join(root, 'artifacts') + path.sep), 'Intermediate output must remain ignored');
const targetId = 'kyoto-city:bldg_74454289-1d7a-4105-87ea-26e36c69bc44';
const targetIndex = 223;
const targetFiles = ['cells/cell-e001-s001/base.gltf', 'cells/cell-e001-s001/near.gltf'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const record = async file => { const bytes = await fs.readFile(file); return { bytes: bytes.length, sha256: sha(bytes) }; };
const tools = path.join(root, 'artifacts/neighborhood-20261021/art/tools/node_modules');
const { NodeIO } = await import(pathToFileURL(path.join(tools, '@gltf-transform/core/dist/index.js')));
const { ALL_EXTENSIONS } = await import(pathToFileURL(path.join(tools, '@gltf-transform/extensions/dist/index.js')));
const { MeshoptDecoder } = await import(pathToFileURL(path.join(tools, 'meshoptimizer/index.js')));
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const manifestBefore = await readJSON(path.join(baseline, 'manifest.json'));
const manifestAfter = await readJSON(path.join(candidate, 'manifest.json'));
assert.equal((await record(path.join(baseline, 'manifest.json'))).sha256,
  'deb00b97ca3e29e314a13225678c7e6827de59a0f8ff68d5d3bdccc7d3563458', 'Baseline must be frozen candidate6');
assert.deepEqual(manifestAfter.featureTable, manifestBefore.featureTable);
assert.equal(manifestAfter.featureTable[targetIndex].sourceId, targetId);
const sections = manifest => [manifest.ground, manifest.context, ...manifest.cells.flatMap(cell => [cell.base, cell.near])];
const beforeSections = sections(manifestBefore), afterSections = sections(manifestAfter);
assert.deepEqual(afterSections.map(item => item.file), beforeSections.map(item => item.file));

async function inventory(directory, prefix = '') {
  const result = {};
  for (const entry of await fs.readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const file = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(result, await inventory(directory, file));
    else { assert(entry.isFile()); result[file] = await record(path.join(directory, file)); }
  }
  return result;
}

// 使用完整材质描述，并将纹理索引解析为对应资源，允许容器内部重新编号。
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
        if (texture.extensions?.EXT_texture_webp) {
          result.resource.extensions = { ...texture.extensions, EXT_texture_webp: {
            source: document.images[texture.extensions.EXT_texture_webp.source] } };
        }
      } else result[name] = resolve(item, name);
    }
    return result;
  }
  return new Map(document.materials.map(material => [material.name, resolve(material)]));
}

const transform = (point, matrix) => [0, 1, 2].map(axis =>
  matrix[axis] * point[0] + matrix[axis + 4] * point[1] + matrix[axis + 8] * point[2] + matrix[axis + 12]);
const oriented = corners => [0, 1, 2].map(start => [0, 1, 2].map(offset => corners[(start + offset) % 3]).join('|')).sort()[0];
async function inspect(directory, file) {
  const source = await readJSON(path.join(directory, file));
  const materials = materialRecords(source);
  const doc = await io.read(path.join(directory, file));
  const groups = new Map(), target = [], topRecords = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const matrix = node.getWorldMatrix();
    for (const primitive of mesh.listPrimitives()) {
      const semantics = primitive.listSemantics().sort();
      const sourceName = semantics.find(name => name.toUpperCase() === '_SOURCE_INDEX');
      assert(sourceName, 'Every triangle needs a source index');
      assert.equal(primitive.getMode(), 4);
      const indexAttribute = primitive.getAttribute(sourceName);
      const positions = primitive.getAttribute('POSITION');
      const indices = primitive.getIndices().getArray();
      const materialName = primitive.getMaterial().getName();
      const material = materials.get(materialName);
      assert(material);
      const attributes = Array.from({ length: positions.getCount() }, (_, vertex) =>
        JSON.stringify(semantics.map(name => [name, primitive.getAttribute(name).getElement(vertex, [])])));
      for (let offset = 0; offset < indices.length; offset += 3) {
        const corners = Array.from(indices.slice(offset, offset + 3));
        const id = Math.round(indexAttribute.getScalar(corners[0]));
        // 旧地标包含浮点来源属性；只在审计分组时舍入，比较保留全部原始属性数值。
        assert(corners.every(vertex => Math.abs(indexAttribute.getScalar(vertex) - id) <= .001));
        const full = JSON.stringify({ matrix, material, corners: oriented(corners.map(vertex => attributes[vertex])) });
        if (id !== targetIndex) {
          const records = groups.get(id) ?? []; records.push(full); groups.set(id, records); continue;
        }
        const vertices = corners.map(vertex => {
          const [x, height, negativeNorth] = transform(positions.getElement(vertex, []), matrix);
          return [x, -negativeNorth, height];
        });
        target.push({ material: materialName, vertices });
        if (vertices.every(vertex => Math.abs(vertex[2] - 2.124) < 1e-6)) topRecords.push(full);
      }
    }
  }
  return { groups: Object.fromEntries([...groups].sort(([a], [b]) => a - b).map(([id, records]) =>
    [id, { triangles: records.length, sha256: sha(records.sort().join('\n')) }])),
  target, roof: { triangles: topRecords.length, sha256: sha(topRecords.sort().join('\n')) } };
}

await fs.mkdir(output, { recursive: true });
const beforeInventory = await inventory(baseline), afterInventory = await inventory(candidate);
const changed = [], byteExact = [];
const omittedReports = [];
const allowed = new Set(['manifest.json', 'provenance.json', 'feature-provenance.json', 'compression-report.json', 'transport-report.json', 'transport-input-manifest.json',
  ...afterSections.flatMap(section => [section, ...section.dependencies]).flatMap(item =>
    /\.(gltf|bin)$/.test(item.file) ? [item.file, ...(item.transport ? [item.transport.file] : [])] : [])]);
for (const [file, identity] of Object.entries(beforeInventory)) {
  if (['river-package-audit.json', 'startup-audit.json'].includes(file) && !afterInventory[file]) { omittedReports.push({ file, ...identity }); continue; }
  assert(afterInventory[file], 'Missing baseline resource: ' + file);
  if (identity.sha256 === afterInventory[file].sha256) byteExact.push(file);
  else { assert(allowed.has(file), 'Unexpected resource change: ' + file); changed.push(file); }
}
assert.deepEqual(Object.keys(afterInventory).sort(), Object.keys(beforeInventory).filter(file => !omittedReports.some(item => item.file === file)).sort(), 'Runtime resource inventory must stay stable');
const inspected = [];
const byteExactSections = [];
for (let index = 0; index < beforeSections.length; index++) {
  const before = beforeSections[index], after = afterSections[index];
  const beforeContainers = [before, ...before.dependencies.filter(item => item.file.endsWith('.bin'))];
  if (beforeContainers.every(item => beforeInventory[item.file].sha256 === afterInventory[item.file].sha256)) {
    byteExactSections.push(before.file);
    continue;
  }
  const first = await inspect(baseline, before.file), second = await inspect(candidate, after.file);
  assert.deepEqual(second.groups, first.groups, 'Unrelated triangle attributes/materials changed');
  let extraction = {};
  if (targetFiles.includes(before.file)) {
    assert.deepEqual(second.roof, first.roof, 'Exact source top faces changed');
    assert.equal(second.roof.triangles, 2);
    const targetPath = path.join(output, path.basename(path.dirname(after.file)) + '-' + path.basename(after.file) + '.triangles.json');
    await fs.writeFile(targetPath, JSON.stringify({ file: after.file, sourceId: targetId, sourceIndex: targetIndex, triangles: second.target }) + '\n');
    extraction = { extractedTriangles: path.relative(root, targetPath), extractedTrianglesIdentity: await record(targetPath) };
  } else {
    assert.equal(first.target.length, 0); assert.equal(second.target.length, 0);
    assert.equal(after.triangles, before.triangles); assert.equal(after.batches, before.batches);
    assert.deepEqual(after.detail, before.detail);
  }
  inspected.push({ file: after.file, unrelatedSourceGroups: Object.keys(second.groups).length,
    unrelatedGroups: second.groups, sourceRoof: second.roof, beforeTargetTriangles: first.target.length,
    afterTargetTriangles: second.target.length, ...extraction });
}
assert.equal(inspected.filter(item => item.extractedTriangles).length, 2);

const provenance = await readJSON(path.join(candidate, 'provenance.json'));
const originalProvenance = await readJSON(path.join(baseline, 'provenance.json'));
assert.deepEqual(await record(path.join(candidate, manifestAfter.provenance.file)),
  { bytes: manifestAfter.provenance.bytes, sha256: manifestAfter.provenance.sha256 });
for (const [field, file] of Object.entries({ styleSha256: 'experience/art/neighborhood-style.json',
  generatorSha256: 'experience/art/build_neighborhood.py', geometryHelperSha256: 'experience/art/neighborhood_mesh.py' })) {
  assert.equal((await record(path.join(root, file))).sha256, provenance[field]);
}
const transportReport = await readJSON(path.join(candidate, 'transport-report.json'));
assert.equal(transportReport.outputManifestSha256, (await record(path.join(candidate, 'manifest.json'))).sha256);
assert.equal(transportReport.inputManifestSha256, (await record(path.join(candidate, 'transport-input-manifest.json'))).sha256);
const sceneFile = path.join(root, 'experience/src/neighborhoods/shijo-east/scene.json');
const geographyFile = path.join(root, 'experience/src/neighborhoods/shijo-east/geography.json');
assert.equal((await record(sceneFile)).sha256, originalProvenance.sceneSha256);
assert.equal((await record(geographyFile)).sha256, originalProvenance.geographySha256);
assert.equal(provenance.sceneSha256, originalProvenance.sceneSha256);
assert.equal(provenance.geographySha256, originalProvenance.geographySha256);
assert.equal(provenance.preparedArtSha256, originalProvenance.preparedArtSha256);
const treatment = provenance.sourceTreatmentOverrides.find(item => item.sourceId === targetId);
assert.equal(provenance.sourceTreatmentOverrides.length, 1);
assert.equal(treatment.expectedSourceIndex, targetIndex);
assert.equal(treatment.treatment, 'wall-less-structure');
assert.deepEqual(treatment.construction, { roofThicknessMetres: .08, postCount: 7, postWidthMetres: .12,
  endInsetMetres: .45, beamDepthMetres: .10, beamWidthMetres: .10, roofMaterial: 'roof', structureMaterial: 'frame' });
for (const evidence of treatment.evidenceRecords) {
  const bytes = await fs.readFile(path.join(root, evidence.file));
  assert.equal(sha(bytes), evidence.sha256); assert.deepEqual(JSON.parse(bytes), evidence.record);
}
assert(treatment.evidenceRecords.some(item => item.record.additionalProperties?.['分類'] === '普通無壁舎'));
const featuresBefore = await readJSON(path.join(baseline, 'feature-provenance.json'));
const featuresAfter = await readJSON(path.join(candidate, 'feature-provenance.json'));
assert.equal(featuresAfter.length, featuresBefore.length);
for (let index = 0; index < featuresBefore.length; index++) {
  if (index !== targetIndex) assert.deepEqual(featuresAfter[index], featuresBefore[index]);
  else {
    const { recipeId: oldRecipe, ...oldFeature } = featuresBefore[index];
    const { recipeId, treatmentOverride, ...newFeature } = featuresAfter[index];
    assert.deepEqual(newFeature, oldFeature);
    const { sourceId, evidenceRecords, ...expectedOverride } = treatment;
    assert.deepEqual(treatmentOverride, expectedOverride);
    assert.equal(recipeId, treatment.recipeId);
  }
}
const gzipChecks = [];
for (const item of afterSections.flatMap(section => [section, ...section.dependencies])) {
  assert.deepEqual(await record(path.join(candidate, item.file)), { bytes: item.bytes, sha256: item.sha256 });
  if (!item.transport) continue;
  const encoded = await fs.readFile(path.join(candidate, item.transport.file));
  assert.equal(encoded.length, item.transport.bytes); assert.equal(sha(encoded), item.transport.sha256);
  const decoded = gunzipSync(encoded);
  assert.equal(decoded.length, item.bytes); assert.equal(sha(decoded), item.sha256);
  gzipChecks.push(item.transport.file);
}

const geometryReport = path.join(output, 'open-form-geometry.json');
execFileSync('python3', [fileURLToPath(new URL('audit-open-form.py', import.meta.url)),
  '--output', geometryReport, ...inspected.filter(item => item.extractedTriangles).map(item => path.join(root, item.extractedTriangles))], { cwd: root, stdio: 'inherit' });
const geometry = await readJSON(geometryReport);
const report = { status: 'pass', reviewedAt: '2026-10-23', sourceId: targetId, sourceIndex: targetIndex,
  baseline: { directory: path.relative(root, baseline), manifest: await record(path.join(baseline, 'manifest.json')) },
  candidate: { directory: path.relative(root, candidate), manifest: await record(path.join(candidate, 'manifest.json')),
    provenance: await record(path.join(candidate, 'provenance.json')) },
  source: { scene: await record(sceneFile), geography: await record(geographyFile), treatment },
  auditProducer: await record(fileURLToPath(import.meta.url)), geometryAuditProducer: await record(fileURLToPath(new URL('audit-open-form.py', import.meta.url))),
  parserVersions: { gltfTransform: '4.5.1', meshoptimizer: '1.3.0', shapely: '2.2.0' },
  sourceGrouping: 'Legacy floating source indices are grouped by nearest integer within0.001; every raw source-attribute value remains in the exact triangle comparison.',
  resourceCount: Object.keys(afterInventory).length, byteExactResources: byteExact.length, changedResources: changed, omittedLegacyAuditReports: omittedReports,
  comparedSections: afterSections.length, byteExactSections, inspectedSections: inspected, verifiedGzipResources: new Set(gzipChecks).size,
  geometry, limitations: 'The source footprint is used as an authored roof outline. Assembly checked against approved parameters and retained display geometry; an independently surveyed roof plan, present-day construction, measured clearance and visual acceptance are separate.' };
await fs.writeFile(path.join(output, 'open-export-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, sections: report.comparedSections, changedResources: changed,
  postCounts: geometry.sections.map(section => section.posts.length), geometryReport }));
