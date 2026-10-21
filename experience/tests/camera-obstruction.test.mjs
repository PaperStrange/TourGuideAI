import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCameraObstruction } from '../src/runtime/camera-obstruction.js';

function facade() {
  const geometry = new THREE.BoxGeometry(12, 8, .3), material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 4, 3); mesh.updateMatrixWorld(true);
  return mesh;
}
function desiredCamera(target = new THREE.Vector3(0, 1.6, 0)) {
  const camera = new THREE.PerspectiveCamera(48, 1.4, .15, 350);
  camera.position.set(0, 3.5, 8); camera.lookAt(target); camera.updateMatrixWorld(true);
  return camera;
}

test('an opaque facade shortens only the rendered pose and unload restores the requested camera', () => {
  const wall = facade(), collision = createCameraObstruction(() => true), target = new THREE.Vector3(0, 1.6, 0);
  const camera = desiredCamera(target), before = camera.position.clone(); collision.addRoot(wall);
  const result = collision.resolve(camera, target, { x: 0, y: 0, height: 0 });
  assert.equal(result.active, true);
  assert.ok(result.position.z < 2.6, 'The camera stays in front of the first facade surface.');
  assert.ok(result.actualDistance < result.desiredDistance);
  assert.deepEqual(camera.position, before);
  collision.removeRoot(wall);
  const restored = collision.resolve(camera, target, { x: 0, y: 0, height: 0 });
  assert.equal(restored.active, false);
  assert.ok(restored.position.distanceTo(before) < 1e-9);
  collision.dispose(); wall.geometry.dispose(); wall.material.dispose();
});

test('a framing target inside a building is constrained before the camera ray is evaluated', () => {
  const wall = facade(), collision = createCameraObstruction(() => true), target = new THREE.Vector3(0, 1.6, 3);
  const camera = desiredCamera(target); collision.addRoot(wall);
  const result = collision.resolve(camera, target, { x: 0, y: 0, height: 0 });
  assert.equal(result.targetAdjusted, true);
  assert.ok(result.target.z < 2.6);
  assert.ok(result.position.z < 2.9);
  collision.dispose(); wall.geometry.dispose(); wall.material.dispose();
});

test('collision uses either side of actual geometry while excluded surfaces do not constrain the camera', () => {
  const wall = facade(), target = new THREE.Vector3(0, 1.6, 6), camera = desiredCamera(target);
  camera.position.set(0, 3.5, -4); camera.lookAt(target); camera.updateMatrixWorld(true);
  const collision = createCameraObstruction(() => true); collision.addRoot(wall);
  const result = collision.resolve(camera, target, { x: 0, y: -6, height: 0 });
  assert.equal(result.active, true);
  assert.ok(result.position.z > 3.4);
  const excluded = createCameraObstruction(() => false); excluded.addRoot(wall);
  assert.ok(excluded.resolve(camera, target, { x: 0, y: -6, height: 0 }).position.distanceTo(camera.position) < 1e-9);
  collision.dispose(); excluded.dispose(); wall.geometry.dispose(); wall.material.dispose();
});
