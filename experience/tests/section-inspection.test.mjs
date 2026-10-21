import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { featureForSurface } from '../src/runtime/inspection-features.js';
import { getPack } from '../src/packs/registry.js';
import { createSurfaceInspection } from '../src/runtime/inspection.js';

test('a material batch selects only the source feature belonging to the hit triangle', () => {
  const features = getPack('shijo-east').inspection.features;
  const geometry = new THREE.BoxGeometry(2, 2, 2).toNonIndexed();
  const indices = new Float32Array(geometry.attributes.position.count);
  indices.fill(101, 0, 3); indices.fill(202, 3, 6);
  geometry.setAttribute('_source_index', new THREE.BufferAttribute(indices, 1));
  const material = new THREE.MeshStandardMaterial(), mesh = new THREE.Mesh(geometry, material);
  mesh.userData.featureTable = { 101: { featureIds: [features[0].id] }, 202: { featureIds: [features[1].id] }, 0: { featureIds: [] } };
  mesh.userData.inspectionFeatureIds = features.map(feature => feature.id);
  assert.equal(featureForSurface(mesh, 0, features, { a: 0 }).id, features[0].id);
  assert.equal(featureForSurface(mesh, 0, features, { a: 3 }).id, features[1].id);
  assert.equal(featureForSurface(mesh, 0, features, { a: 6 }), null);
  geometry.dispose(); material.dispose();
});

test('unloading an inspected root removes its actual surface from subsequent rays', () => {
  const feature = getPack('shijo-east').inspection.features[0];
  const geometry = new THREE.BoxGeometry(3, 3, 1), material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geometry, material); mesh.position.y = 1.5;
  mesh.userData.inspectionFeatureIds = [feature.id]; mesh.userData.cellId = 'source-cell';
  mesh.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 100); camera.position.set(0, 1.5, 5); camera.lookAt(0, 1.5, 0);
  const inspection = createSurfaceInspection([], [feature]); inspection.setEnabled(true); inspection.addRoot(mesh);
  inspection.update(camera, { x: 0, y: -5 }, 400, 400);
  assert.equal(inspection.snapshot().focus?.id, feature.id);
  assert.equal(inspection.snapshot().focus?.cellId, 'source-cell');
  inspection.removeRoot(mesh); inspection.update(camera, { x: 0, y: -5 }, 400, 400);
  assert.equal(inspection.snapshot().focus, null);
  geometry.dispose(); material.dispose();
});
