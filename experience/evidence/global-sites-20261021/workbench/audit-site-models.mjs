import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const repository = path.resolve(process.argv[2] ?? '.');
const destination = path.resolve(process.argv[3] ?? 'experience/evidence/global-sites-20261021/workbench/model-audit.json');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const expected = {
  delft: 'b9a63090d9ab6a2335c214b8361519abf9c97ef0dfd33ca1e0fe6b78a08b23e9',
  helsinki: 'e0a7da09e662c8b32ca577e6da5868bbfeadc904e776aefec28cb5f1bf4534d9',
};

async function inspect(name) {
  const directory = path.join(repository, 'artifacts/site-workbench', name);
  const repeatDirectory = path.join(repository, 'artifacts/site-workbench-repeat', name);
  const manifest = await readJSON(path.join(directory, 'manifest.json'));
  const repeatManifest = await readJSON(path.join(repeatDirectory, 'manifest.json'));
  const contextBytes = await fs.readFile(path.join(directory, 'context.json'));
  const context = JSON.parse(contextBytes);
  const bytes = await fs.readFile(path.join(directory, manifest.model.file));
  const repeated = await fs.readFile(path.join(repeatDirectory, repeatManifest.model.file));
  const generator = await fs.readFile(path.join(repository, 'experience/art/build_site_context.py'));
  assert.equal(sha256(bytes), expected[name]);
  assert.equal(sha256(bytes), manifest.model.sha256);
  assert.equal(bytes.length, manifest.model.bytes);
  assert.equal(sha256(repeated), repeatManifest.model.sha256);
  assert.deepEqual(bytes, repeated, 'Runtime GLB bytes must repeat exactly');
  assert.equal(sha256(contextBytes), manifest.contextSha256);
  assert.equal(sha256(generator), manifest.generatorSha256);
  assert.deepEqual(manifest.source, context.source);
  assert.equal(manifest.navigation, 'unreviewed');
  assert.equal(manifest.landmarkArchitecture, 'unreviewed');
  assert.equal(manifest.projection.gltfMapping, '[x, height, -y]');
  assert.deepEqual(manifest.features.map(feature => feature.sourceId), context.features.map(feature => feature.sourceId));
  assert(bytes.length <= manifest.limits.modelBytes);
  const originalBlend = await fs.readFile(path.join(directory, manifest.editable.file));
  const repeatedBlend = await fs.readFile(path.join(repeatDirectory, repeatManifest.editable.file));
  assert.equal(sha256(originalBlend), manifest.editable.sha256);
  assert.equal(sha256(repeatedBlend), repeatManifest.editable.sha256);
  assert.equal(originalBlend.length, manifest.editable.bytes);
  assert.equal(repeatedBlend.length, repeatManifest.editable.bytes);
  const { editable: originalEditable, ...originalMeaning } = manifest;
  const { editable: repeatedEditable, ...repeatedMeaning } = repeatManifest;
  assert.deepEqual(originalMeaning, repeatedMeaning, 'All non-editable-file manifest fields must repeat');

  // 使用实际 Three loader 检查导出的坐标、来源属性和索引三角形。
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  gltf.scene.updateMatrixWorld(true);
  const roots = new Map();
  const featureIndices = new Set();
  const batches = [];
  let triangles = 0;
  let maximumRoofCoordinateErrorMetres = 0;
  const roofAreas = new Map();
  const vector = new Vector3();
  const roofPoints = context.features.map(feature => new Map(feature.polygons.flatMap(polygon => polygon.triangles.flat()).map(point => [point.map(value => value.toFixed(3)).join(','), point])));
  gltf.scene.traverse(object => {
    if (object.userData.sourceId) {
      assert(!roots.has(object.userData.sourceId));
      roots.set(object.userData.sourceId, object.userData);
    }
    if (!object.isMesh) return;
    assert.equal(object.userData.navigation, 'unreviewed');
    const geometry = object.geometry;
    const positions = geometry.getAttribute('position');
    const sourceIndices = geometry.getAttribute('_source_index');
    assert(sourceIndices && sourceIndices.count === positions.count);
    assert(geometry.index && geometry.index.count % 3 === 0);
    const localSources = new Set();
    for (let index = 0; index < positions.count; index++) {
      const sourceIndex = sourceIndices.getX(index);
      assert(Number.isInteger(sourceIndex) && sourceIndex >= -1 && sourceIndex < manifest.features.length);
      vector.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld);
      assert(vector.toArray().every(Number.isFinite));
      if (sourceIndex < 0) {
        assert.equal(object.name, 'context-ground');
        continue;
      }
      featureIndices.add(sourceIndex);
      localSources.add(manifest.features[sourceIndex].sourceId);
      if (object.name === 'context-roof') {
        const source = context.features[sourceIndex];
        assert.equal(source.kind, 'building');
        const point = roofPoints[sourceIndex].get([vector.x, -vector.z].map(value => value.toFixed(3)).join(','));
        assert(point, 'Roof coordinates must come from the prepared geographic polygon');
        const error = Math.max(Math.abs(vector.x - point[0]), Math.abs(vector.z + point[1]), Math.abs(vector.y - source.height.metres));
        assert(error <= .0001, 'Exported axis/height mapping exceeds float32 tolerance');
        maximumRoofCoordinateErrorMetres = Math.max(maximumRoofCoordinateErrorMetres, error);
      }
    }
    for (let triangle = 0; triangle < geometry.index.count; triangle += 3) {
      const vertices = [0, 1, 2].map(offset => geometry.index.getX(triangle + offset));
      const sources = vertices.map(index => sourceIndices.getX(index));
      assert(sources.every(index => index === sources[0]), 'A triangle must have one source identity');
      if (object.name === 'context-roof') {
        const [a, b, c] = vertices.map(index => new Vector3().fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld));
        const area = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)) / 2;
        roofAreas.set(sources[0], (roofAreas.get(sources[0]) ?? 0) + area);
      }
    }
    assert.deepEqual([...localSources].sort(), JSON.parse(object.userData.sourceIds).sort());
    triangles += geometry.index.count / 3;
    batches.push({ name: object.name, triangles: geometry.index.count / 3, sourceCount: localSources.size, sourceAttribute: '_source_index' });
  });
  assert.equal(featureIndices.size, manifest.features.length);
  assert.equal(roots.size, manifest.features.length);
  for (const [index, feature] of context.features.entries()) {
    const metadata = roots.get(feature.sourceId);
    assert(metadata);
    assert.equal(metadata.kind, feature.kind);
    assert.equal(metadata.sourceVersion, String(feature.sourceVersion));
    assert.equal(metadata.sourceTimestamp, String(feature.sourceTimestamp));
    assert.deepEqual(JSON.parse(metadata.sourceTags), feature.sourceTags);
    if (feature.kind === 'building') {
      assert.deepEqual(JSON.parse(metadata.heightMeaning), feature.height);
      assert.equal(metadata.architecturalReview, feature.architecturalReview);
      const expectedArea = feature.polygons.reduce((sum, polygon) => sum + polygon.areaSquareMetres, 0);
      assert(Math.abs(roofAreas.get(index) - expectedArea) <= Math.max(.001, expectedArea * .00001));
    }
  }
  assert.equal(triangles, manifest.geometry.triangles);
  assert.equal(batches.length, manifest.geometry.batches);
  assert(triangles <= manifest.limits.triangles && batches.length <= manifest.limits.batches);
  return {
    id: manifest.id, passed: true, model: manifest.model, geometry: manifest.geometry,
    source: manifest.source, contextSha256: manifest.contextSha256, generatorSha256: manifest.generatorSha256,
    repeatedModelSha256: sha256(repeated), runtimeBytesIdentical: true,
    nonEditableManifestFieldsIdentical: true,
    editable: { original: originalEditable, repeated: repeatedEditable, bytesIdentical: originalBlend.equals(repeatedBlend) },
    inspectedSourceRoots: roots.size, inspectedSourceIndices: featureIndices.size,
    maximumRoofCoordinateErrorMetres, roofAreaMatchesPreparedPolygons: true, batches,
  };
}

const report = {
  schemaVersion: 1, reviewedAt: '2026-10-21',
  method: 'Actual CPU Blender repeat export and Three GLTFLoader parsing; source metadata, per-vertex source identity, coordinates, projected roof area, budgets and manifest hashes',
  scope: 'Internal geographic-context previews. Render inspection does not validate landmark architecture, facade appearance, terrain, public access or walkability. Independent source tests cover polygon hole containment.',
  editableFileDeterminism: 'Actual .blend bytes differ between separate Blender processes; runtime GLB bytes and all non-editable-file manifest fields repeat exactly.',
  sites: [],
};
for (const name of Object.keys(expected)) report.sites.push(await inspect(name));
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.sites.map(site => ({ id: site.id, passed: site.passed, model: site.model, geometry: site.geometry, runtimeBytesIdentical: site.runtimeBytesIdentical }))));
