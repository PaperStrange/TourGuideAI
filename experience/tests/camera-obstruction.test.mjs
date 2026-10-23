import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createCameraObstruction } from '../src/runtime/camera-obstruction.js';
import { createGuidedCamera } from '../src/runtime/camera.js';
import { getPack } from '../src/packs/registry.js';

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
  const result = collision.resolve(camera, target, { x: 0, y: 0, height: 0 }, { preserveActorFrame: false });
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
  const result = collision.resolve(camera, target, { x: 0, y: -6, height: 0 }, { preserveActorFrame: false });
  assert.equal(result.active, true);
  assert.ok(result.position.z > 3.4);
  const excluded = createCameraObstruction(() => false); excluded.addRoot(wall);
  assert.ok(excluded.resolve(camera, target, { x: 0, y: -6, height: 0 }).position.distanceTo(camera.position) < 1e-9);
  collision.dispose(); excluded.dispose(); wall.geometry.dispose(); wall.material.dispose();
});

test('a narrow passage recovers the whole actor through a clear direction without moving the desired camera', () => {
  const corridor = new THREE.Group();
  for (const z of [-1.5, 1.5]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 8, .2), new THREE.MeshStandardMaterial());
    wall.position.set(0, 4, z); corridor.add(wall);
  }
  corridor.updateMatrixWorld(true);
  const collision = createCameraObstruction(() => true); collision.addRoot(corridor);
  const target = new THREE.Vector3(0, 1.6, 1.2), camera = desiredCamera(target);
  const savedPosition = camera.position.clone(), savedTarget = target.clone();
  const result = collision.resolve(camera, target, { x: 0, y: 0, height: 0 });
  const actual = camera.clone(); actual.position.copy(result.position); actual.lookAt(result.target); actual.updateMatrixWorld(true);
  assert.equal(result.framingRecovered, true);
  for (const height of [0, 1.75]) {
    const point = new THREE.Vector3(0, height, 0).project(actual);
    assert.ok(Math.abs(point.x) <= .95 && Math.abs(point.y) <= .95 && Math.abs(point.z) <= 1);
  }
  assert.ok(Math.abs(result.position.z) < 1.4, 'The rendered camera remains inside the real wall surfaces.');
  assert.deepEqual(camera.position, savedPosition); assert.deepEqual(target, savedTarget);
  collision.dispose(); corridor.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); });
});

test('intentional inspection framing remains when collision clearance is usable', () => {
  const wall = facade(), collision = createCameraObstruction(() => true), target = new THREE.Vector3(0, 5.5, 0);
  const camera = desiredCamera(target); camera.position.set(0, 6, 8); camera.lookAt(target); camera.updateMatrixWorld(true);
  collision.addRoot(wall);
  const result = collision.resolve(camera, target, { x: 0, y: 0, height: 0 }, { preserveActorFrame: false });
  assert.equal(result.active, true); assert.equal(result.framingRecovered, false);
  assert.deepEqual(result.target, target);
  assert.ok(result.actualDistance > 1);
  collision.dispose(); wall.geometry.dispose(); wall.material.dispose();
});

test('indirect acceleration retains source indices and finds a blocking surface behind an excluded surface in one batch', () => {
  const parts = [2, 4].map((z, index) => {
    const geometry = new THREE.PlaneGeometry(20, 12).translate(0, 4, z);
    geometry.setAttribute('_source_index', new THREE.Float32BufferAttribute(
      new Float32Array(geometry.attributes.position.count).fill(index + 1), 1));
    return geometry;
  });
  const geometry = mergeGeometries(parts), originalIndex = geometry.index.array.slice();
  const originalSources = geometry.getAttribute('_source_index').array.slice();
  const wall = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()); wall.updateMatrixWorld(true);
  const target = new THREE.Vector3(0, 1.6, 0), camera = desiredCamera(target);
  const collision = createCameraObstruction((mesh, hit) => mesh.geometry.getAttribute('_source_index').getX(hit.face.a) === 2);
  collision.addRoot(wall);
  const result = collision.resolve(camera, target, { x: 0, y: 0, height: 0 }, { preserveActorFrame: false });
  assert.ok(result.position.z > 3 && result.position.z < 4, 'The actual second plane stops the camera.');
  assert.deepEqual(geometry.index.array, originalIndex);
  assert.deepEqual(geometry.getAttribute('_source_index').array, originalSources);
  const sibling = wall.clone(); sibling.position.x = 30; sibling.updateMatrixWorld(true);
  collision.addRoot(sibling);
  const allocated = collision.snapshot();
  assert.equal(allocated.trees, 1); assert.ok(allocated.estimatedCpuBytes > 0);
  collision.removeRoot(wall); assert.equal(collision.snapshot().trees, 1);
  collision.removeRoot(sibling);
  assert.equal(collision.snapshot().trees, 0); assert.equal(collision.snapshot().estimatedCpuBytes, 0);
  collision.dispose(); parts.forEach(part => part.dispose()); geometry.dispose(); wall.material.dispose();
});

test('recovery remains continuous across equivalent geometry replacement and settles after removal using elapsed time', () => {
  const corridor = new THREE.Group();
  for (const z of [-1.5, 1.5]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 8, .2), new THREE.MeshStandardMaterial());
    wall.position.set(0, 4, z); corridor.add(wall);
  }
  corridor.updateMatrixWorld(true);
  const collision = createCameraObstruction(() => true), target = new THREE.Vector3(0, 1.6, 1.2);
  const camera = desiredCamera(target), player = { x: 0, y: 0, height: 0 };
  const motion = { deltaMs: 1000 / 60, reducedMotion: false };
  collision.addRoot(corridor);
  const recovery = collision.resolve(camera, target, player, motion);
  assert.equal(recovery.recoveryFits, true);
  const replacement = corridor.clone(); replacement.updateMatrixWorld(true);
  collision.removeRoot(corridor); collision.addRoot(replacement);
  const replaced = collision.resolve(camera, target, player, motion);
  assert.ok(replaced.position.distanceTo(recovery.position) < 1e-6);
  collision.removeRoot(replacement);
  const first = collision.resolve(camera, target, player, motion);
  assert.equal(first.settling, true);
  assert.ok(first.position.distanceTo(camera.position) > .1, 'Removing geometry begins a timed return to the requested view.');
  for (let index = 0; index < 5; index++) {
    const sameFrame = collision.resolve(camera, target, player, { ...motion, deltaMs: 0 });
    assert.ok(sameFrame.position.distanceTo(first.position) < 1e-8, 'Repeated synchronizations without elapsed time do not advance easing.');
  }
  let result = first, draws = 0;
  while (result.settling && draws++ < 180) {
    result = collision.resolve(camera, target, player, motion);
    assert.ok(result.actorVerticalOccupancy <= .5 && result.actualDistance >= 5);
  }
  assert.equal(result.settling, false); assert.ok(draws > 1 && draws < 180);
  assert.ok(result.position.distanceTo(camera.position) < 1e-8);
  collision.addRoot(corridor);
  const restored = collision.resolve(camera, target, player, { ...motion, reducedMotion: true });
  assert.equal(restored.settling, false); assert.equal(restored.recoveryFits, true);
  collision.dispose(); corridor.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); });
});

test('Look closer retains the recovered composition until deliberate camera input and reset preserves the desired pose', () => {
  const corridor = new THREE.Group();
  for (const z of [-1.5, 1.5]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 8, .2), new THREE.MeshStandardMaterial());
    wall.position.set(0, 4, z); corridor.add(wall);
  }
  corridor.updateMatrixWorld(true);
  const collision = createCameraObstruction(() => true); collision.addRoot(corridor);
  const player = { x: 0, y: 0, height: 0 };
  for (const reducedMotion of [false, true]) {
    const rig = createGuidedCamera(null, player, reducedMotion, () => {}, { solo: true, pack: getPack('shijo-east') });
    rig.setObstructionResolver(collision.resolve);
    const before = rig.snapshot();
    rig.setInspecting(true);
    for (let index = 0; index < 20; index++) rig.synchronizeCamera(1000 / 60);
    const opened = rig.snapshot();
    assert.equal(opened.inspectionAimed, false);
    assert.deepEqual(opened.position, before.position);
    assert.deepEqual(opened.viewTarget, before.viewTarget);
    assert.deepEqual(opened.desiredPosition, before.desiredPosition);
    rig.pan(0, 1);
    assert.equal(rig.snapshot().inspectionAimed, true);
    assert.notDeepEqual(rig.snapshot().target, before.target);
    rig.reset(player); rig.synchronizeCamera(1000 / 60);
    const reset = rig.snapshot();
    assert.equal(reset.inspectionAimed, false);
    assert.deepEqual(reset.desiredPosition, before.desiredPosition);
    assert.ok(reset.obstruction.recoveryFits);
  }
  collision.dispose(); corridor.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); });
});

test('standalone Shijo and Ginza retain their existing OrbitControls walking direction', () => {
  for (const id of ['shijo-karasuma', 'ginza-wako']) {
    const pack = getPack(id), player = pack.world.spawn;
    const rig = createGuidedCamera(null, player, true, () => {}, { solo: true, pack });
    rig.rotate(.35);
    assert.equal(rig.getMovementAzimuth(), rig.controls.getAzimuthalAngle());
  }
});
