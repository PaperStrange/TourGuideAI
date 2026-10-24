import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

// 使用成熟 glTF 读取器，逐来源核对完整属性及已批准的边界面。
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
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const before = await json(path.join(baseline, 'manifest.json')), after = await json(path.join(candidate, 'manifest.json'));
assert.equal((await identity(path.join(baseline, 'manifest.json'))).sha256, 'e58257879fb4ead8af14022e71e329ee3309f9920eec6fe2cf4717276573d108');
assert.equal((await identity(path.join(candidate, 'manifest.json'))).sha256, expectedManifest);
for (const field of ['id', 'revision', 'frame', 'bounds', 'featureTable', 'lighting']) assert.deepEqual(after[field], before[field]);
const oldSections = sectionList(before), newSections = sectionList(after);
assert.equal(newSections.length, 74);
assert.deepEqual(newSections.map(item => item.file), oldSections.map(item => item.file));
assert.deepEqual(after.cells.map(({ base, near, ...rest }) => rest), before.cells.map(({ base, near, ...rest }) => rest));
const evidenceFile = 'experience/evidence/neighborhood-20261024/world/visible-boundaries/closure-proposal.json';
assert.equal((await identity(path.join(root, evidenceFile))).sha256, 'e1dfea3c79d40ac5a438fe8c1089c6453ba6650df56016af28b33e61173f8b71');
const evidence = await json(path.join(root, evidenceFile));
const segments = [...evidence.buildingSegments, ...evidence.roadSegments];
assert.equal(segments.length, 6);
for (const segment of segments) {
  assert.equal(after.featureTable[segment.sourceIndex].sourceId, segment.sourceId);
  assert.equal(segment.walkable, false); assert.equal(segment.higherSurfaceOnLeft, true);
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
const oriented = corners => [0, 1, 2].map(start => [0, 1, 2].map(offset => corners[(start + offset) % 3]).join('|')).sort()[0];
const transform = (point, matrix) => [0, 1, 2].map(axis =>
  matrix[axis] * point[0] + matrix[axis + 4] * point[1] + matrix[axis + 8] * point[2] + matrix[axis + 12]);
const typedIdentity = array => ({ type: array.constructor.name, length: array.length,
  sha256: sha(Buffer.from(array.buffer, array.byteOffset, array.byteLength)) });
async function inspect(directory, file) {
  const raw = await json(path.join(directory, file)), materials = materialRecords(raw);
  const document = await io.read(path.join(directory, file)), groups = new Map(), targets = new Map(), walkable = {}, nodeExtras = {};
  for (const node of document.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const matrix = node.getWorldMatrix(), extras = node.getExtras();
    assert(!Object.hasOwn(nodeExtras, node.getName())); nodeExtras[node.getName()] = extras;
    for (const [primitiveIndex, primitive] of mesh.listPrimitives().entries()) {
      assert.equal(primitive.getMode(), 4);
      const semantics = primitive.listSemantics().sort(), sourceName = semantics.find(name => name.toUpperCase() === '_SOURCE_INDEX');
      assert(sourceName);
      const sources = primitive.getAttribute(sourceName), positions = primitive.getAttribute('POSITION');
      const indices = primitive.getIndices().getArray(), materialName = primitive.getMaterial().getName(), material = materials[materialName];
      assert(material);
      if (extras.walkable === true) walkable[node.getName() + ':' + primitiveIndex] = {
        extras, matrix, material, indices: typedIdentity(indices),
        attributes: Object.fromEntries(semantics.map(name => [name, typedIdentity(primitive.getAttribute(name).getArray())])) };
      const attributes = Array.from({ length: positions.getCount() }, (_, vertex) => stable(semantics.map(name =>
        [name, primitive.getAttribute(name).getElement(vertex, [])])));
      for (let offset = 0; offset < indices.length; offset += 3) {
        const vertices = Array.from(indices.slice(offset, offset + 3)), source = Math.round(sources.getScalar(vertices[0]));
        assert(vertices.every(vertex => Math.abs(sources.getScalar(vertex) - source) <= .001));
        const fingerprint = stable({ matrix, material, corners: oriented(vertices.map(vertex => attributes[vertex])) });
        const records = groups.get(source) ?? []; records.push(fingerprint); groups.set(source, records);
        if ([20, 151, 731].includes(source)) {
          const records = targets.get(source) ?? [];
          records.push({ fingerprint, material: materialName, node: node.getName(), extras,
            points: vertices.map(vertex => transform(positions.getElement(vertex, []), matrix)),
            normals: vertices.map(vertex => primitive.getAttribute('NORMAL').getElement(vertex, [])), semantics,
            allAttributesFinite: vertices.every(vertex => semantics.every(name => primitive.getAttribute(name).getElement(vertex, []).every(Number.isFinite))) });
          targets.set(source, records);
        }
      }
    }
  }
  return { groups: Object.fromEntries([...groups].sort(([a], [b]) => a - b).map(([id, records]) =>
    [id, { triangles: records.length, sha256: sha(records.sort().join('\n')) }])), targets, materials, walkable,
    sceneExtras: raw.scenes?.map(scene => scene.extras), nodeExtras };
}
function validateAddedFaces(faces, source, file) {
  const selected = segments.filter(segment => segment.sourceIndex === source);
  assert.equal(faces.length, selected.length * 2);
  const reviewed = selected.map(segment => ({ segment, faces: [], endpoints: [segment.from, segment.to]
    .map(([x, north]) => [Math.fround(x), -Math.fround(north)]),
    top: Math.fround(segment.topHeightMetres), bottom: Math.fround(segment.bottomHeightMetres) }));
  for (const face of faces) {
    assert(face.allAttributesFinite); assert.equal(face.material, source === 731 ? 'tile-wall' : 'paving');
    if (source !== 731) { assert.equal(file, 'ground.gltf'); assert.equal(face.extras.walkable, false); assert.equal(face.node, 'Resident_paving'); }
    const target = reviewed.find(item => face.points.every(point => [item.top, item.bottom].includes(point[1]) &&
      item.endpoints.some(end => point[0] === end[0] && point[2] === end[1])));
    assert(target, 'Added face extends outside the approved segment: ' + file);
    assert(face.points.some(point => point[1] === target.top) && face.points.some(point => point[1] === target.bottom));
    const [a, b, c] = face.points, ab = b.map((v, k) => v - a[k]), ac = c.map((v, k) => v - a[k]);
    const normal = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const [start, end] = target.endpoints, outward = [start[1] - end[1], 0, end[0] - start[0]];
    assert(normal[0] * outward[0] + normal[2] * outward[2] > 0, 'Boundary must face the lower surface');
    assert(face.normals.every(n => n.every(Number.isFinite) && Math.abs(n[1]) < 1e-6 && n[0] * outward[0] + n[2] * outward[2] > 0));
    target.faces.push({ ...face, area: Math.hypot(...normal) / 2 });
  }
  return reviewed.map(({ segment, faces, endpoints, top, bottom }) => {
    assert.equal(faces.length, 2);
    assert.notEqual(oriented(faces[0].points.map(stable)), oriented(faces[1].points.map(stable)));
    assert.equal(new Set(faces.flatMap(face => face.points.map(stable))).size, 4);
    const area = Math.hypot(endpoints[1][0] - endpoints[0][0], endpoints[1][1] - endpoints[0][1]) * (top - bottom);
    assert(Math.abs(faces.reduce((sum, face) => sum + face.area, 0) - area) < 1e-10);
    return { id: segment.id, sourceIndex: source, endpointsExactFloat32: true, top, bottom, areaSquareMetres: area,
      faces: faces.map(({ fingerprint, ...rest }) => rest) };
  });
}

await fs.mkdir(output, { recursive: true });
const inventoryBefore = await inventory(baseline), inventoryAfter = await inventory(candidate);
assert.deepEqual(Object.keys(inventoryAfter).sort(), Object.keys(inventoryBefore).sort());
const permittedChanges = new Set(['manifest.json', 'provenance.json', 'compression-report.json', 'transport-report.json',
  'transport-input-manifest.json', ...newSections.flatMap(section => [section, ...section.dependencies])
    .flatMap(item => /\.(gltf|bin)$/.test(item.file) ? [item.file, ...(item.transport ? [item.transport.file] : [])] : [])]);
const changedResources = [], byteExactResources = [];
for (const [file, record] of Object.entries(inventoryBefore)) {
  if (record.sha256 === inventoryAfter[file].sha256) byteExactResources.push(file);
  else { assert(permittedChanges.has(file), 'Unrelated resource changed: ' + file); changedResources.push(file); }
}
const comparisons = [], closures = [], walkableChecks = [];
for (let index = 0; index < newSections.length; index++) {
  const section = newSections[index], oldSection = oldSections[index];
  const first = await inspect(baseline, section.file), second = await inspect(candidate, section.file);
  assert.deepEqual(second.materials, first.materials, 'Material definitions changed: ' + section.file);
  assert.deepEqual(second.sceneExtras, first.sceneExtras);
  assert.deepEqual(second.nodeExtras, first.nodeExtras, 'Node metadata changed: ' + section.file);
  assert.deepEqual(second.walkable, first.walkable, 'Walkable mesh bytes/metadata changed: ' + section.file);
  if (Object.keys(first.walkable).length) walkableChecks.push({ file: section.file, primitives: first.walkable });
  const firstGroups = { ...first.groups }, secondGroups = { ...second.groups };
  let added = 0;
  for (const source of [20, 151, 731]) {
    const originals = first.targets.get(source) ?? [], remaining = [...(second.targets.get(source) ?? [])];
    for (const record of originals) {
      const position = remaining.findIndex(item => item.fingerprint === record.fingerprint);
      assert(position >= 0, 'Existing triangle changed: ' + section.file + ':' + source); remaining.splice(position, 1);
    }
    if (remaining.length) {
      if (source === 731) assert(['cells/cell-e006-n001/base.gltf', 'cells/cell-e006-n001/near.gltf'].includes(section.file));
      else assert.equal(section.file, 'ground.gltf');
      closures.push({ file: section.file, sourceIndex: source, originalTriangles: originals.length,
        addedTriangles: remaining.length, segments: validateAddedFaces(remaining, source, section.file), originalAttributesExact: true });
      added += remaining.length;
    }
    assert.equal((second.targets.get(source) ?? []).length, originals.length + remaining.length);
    delete firstGroups[source]; delete secondGroups[source];
  }
  assert.deepEqual(secondGroups, firstGroups, 'Unrelated decoded source attributes/material/world matrix changed: ' + section.file);
  assert.equal(section.triangles, oldSection.triangles + added);
  comparisons.push({ file: section.file, sourceGroupsCompared: Object.keys(first.groups).length,
    unchangedGroupsSha256: sha(stable(firstGroups)), trianglesBefore: oldSection.triangles, trianglesAfter: section.triangles,
    addedTriangles: added, batchesBefore: oldSection.batches, batchesAfter: section.batches });
  console.log('Compared ' + section.file);
}
assert.equal(closures.length, 4); assert.equal(closures.filter(item => item.sourceIndex === 731).length, 2);
assert.equal(closures.reduce((sum, item) => sum + item.addedTriangles, 0), 20);
assert.equal(walkableChecks.length, 1); assert.equal(Object.keys(walkableChecks[0].primitives).length, 2);

const oldProvenance = await json(path.join(baseline, 'provenance.json')), provenance = await json(path.join(candidate, 'provenance.json'));
const producerFiles = { styleSha256: 'experience/art/neighborhood-style.json', generatorSha256: 'experience/art/build_neighborhood.py',
  geometryHelperSha256: 'experience/art/neighborhood_mesh.py', landmarkHelperSha256: 'experience/art/neighborhood_landmarks.py',
  materialHelperSha256: 'experience/art/neighborhood_materials.py', sceneSha256: 'experience/src/neighborhoods/shijo-east/scene.json',
  geographySha256: 'experience/src/neighborhoods/shijo-east/geography.json', preparedArtSha256: 'artifacts/neighborhood-20261023/world/art-selection.json' };
for (const [field, file] of Object.entries(producerFiles)) assert.equal((await identity(path.join(root, file))).sha256, provenance[field]);
const allowedProvenanceChanges = new Set(['styleSha256', 'generatorSha256', 'geometryHelperSha256', 'elapsedSeconds', 'sourceBoundaryClosures']);
for (const field of new Set([...Object.keys(oldProvenance), ...Object.keys(provenance)]))
  if (!allowedProvenanceChanges.has(field)) assert.deepEqual(provenance[field], oldProvenance[field], 'Unrelated provenance changed: ' + field);
const closureProvenance = provenance.sourceBoundaryClosures, style = await json(path.join(root, producerFiles.styleSha256));
assert.deepEqual(closureProvenance.overrides, style.sourceBoundaryClosures);
assert.equal(Object.keys(closureProvenance.overrides).length, 3);
assert.equal(closureProvenance.evidenceRecords.length, 1);
assert.equal(closureProvenance.evidenceRecords[0].file, evidenceFile);
assert.equal(closureProvenance.evidenceRecords[0].sha256, (await identity(path.join(root, evidenceFile))).sha256);
assert.deepEqual(closureProvenance.evidenceRecords[0].record, evidence);
for (const record of evidence.inputs) assert.deepEqual(await identity(path.join(root, record.file)), { bytes: record.bytes, sha256: record.sha256 });
for (const source of [20, 151, 731]) {
  const sourceId = after.featureTable[source].sourceId, override = closureProvenance.overrides[sourceId];
  assert.equal(override.expectedSourceIndex, source);
  assert.deepEqual(override.segmentIds, segments.filter(segment => segment.sourceIndex === source).map(segment => segment.id));
  assert.deepEqual(closureProvenance.addedTriangles[sourceId], { triangles: source === 731 ? 8 : 2,
    scope: source === 731 ? 'each-building-lod' : 'resident-nonwalkable-ground' });
}

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
  comparison: { sections: comparisons, closures, walkableChecks, sourceGroupsCompared: comparisons.reduce((sum, item) => sum + item.sourceGroupsCompared, 0),
    completeExistingAttributesMatricesExact: true, allMaterialsExact: true, walkableAttributeAndIndexBytesExact: true },
  source: { geographySha256: provenance.geographySha256, sceneSha256: provenance.sceneSha256, preparedArtSha256: provenance.preparedArtSha256,
    boundaryEvidence: closureProvenance.evidenceRecords[0], producerFiles, featureTableExact: true, originalSourceAndNavigationExact: true },
  resources: { files: Object.keys(inventoryAfter).length, byteExactCount: byteExactResources.length, changedResources,
    newImages: 0, gzipRoundTrips: gzipResources.size },
  validation: { containers: 74, reportedErrors: 0 }, budgets: { sections: sectionBudgets, startup: critical },
  limits: 'Boundary heights remain authored display levels. This audit establishes decoded geometry/material/provenance preservation; matched visual quality, GPU memory and frame timing require separate checks. Startup excludes application HTML/JS/CSS/fonts and HTTP framing. Excluded bridge overlap and rounded angular boundary receive no added geometry.' };
await fs.writeFile(path.join(output, 'candidate11-export-audit.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, sections: comparisons.length, closures: closures.length, gzipRoundTrips: gzipResources.size, critical }));
