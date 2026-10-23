import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { loadNeighborhoodGeometry } from './helpers/neighborhood-geometry.mjs';
import { createCameraObstruction } from '../src/runtime/camera-obstruction.js';

test('the actually visited Nishiki interior pose keeps feet and head inside its collision-constrained camera', async () => {
  const evidence = JSON.parse(await readFile(new URL('../evidence/neighborhood-20261021/qa/arcade-blocker/arcade-result.json', import.meta.url)));
  const observed = evidence.captures.find(value => value.file === 'inside-arcade-day.png').observed;
  const base = new URL('../public/assets/neighborhoods/shijo-east/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('manifest.json', base)));
  const roots = [];
  const collision = createCameraObstruction((mesh, hit) => {
    if (mesh.userData.occlusionGroup?.startsWith('Canopy_') || mesh.userData.semanticGroup?.includes('Canopy')) return true;
    const index = mesh.geometry.getAttribute('_source_index')?.getX(hit.face.a);
    return manifest.featureTable[index]?.sourceId?.startsWith('kyoto-city:bldg_');
  });
  try {
    for (const asset of [manifest.context, ...observed.stream.cells.filter(cell => cell.level)
      .map(item => manifest.cells.find(cell => cell.id === item.id)[item.level])]) {
      const root = await loadNeighborhoodGeometry(new URL(asset.file, base)); roots.push(root); collision.addRoot(root);
    }
    const player = structuredClone(observed.route.position), beforePlayer = structuredClone(player);
    const camera = new THREE.PerspectiveCamera(48, 1, .15, 350);
    camera.projectionMatrix.fromArray(observed.camera.projectionMatrix);
    camera.position.fromArray(observed.camera.desiredPosition);
    const target = new THREE.Vector3().fromArray(observed.camera.target), saved = camera.position.clone();
    camera.lookAt(target); camera.updateMatrixWorld(true);
    const result = collision.resolve(camera, target, player);
    const actual = camera.clone(); actual.position.copy(result.position); actual.lookAt(result.target); actual.updateMatrixWorld(true);
    for (const height of [0, 1.75]) {
      const point = new THREE.Vector3(player.x, player.height + height, -player.y).project(actual);
      assert.ok(Math.abs(point.x) <= .95 && Math.abs(point.y) <= .95 && Math.abs(point.z) <= 1,
        'The real interior geometry must leave the full actor visible.');
    }
    assert.ok(result.actualDistance >= 5, 'The recovered view must retain space for the surrounding street.');
    assert.ok(result.actorVerticalOccupancy <= .5, 'The actor must leave at least half the frame for the surroundings.');
    assert.ok(result.position.y < 4.65, 'The interior camera remains below the actual arcade soffit.');
    assert.deepEqual(player, beforePlayer); assert.deepEqual(camera.position, saved);
    let previousPosition = null;
    for (let step = 0; step < 300; step++) {
      const adjacent = { ...player, x: player.x - 10 + step * .076 };
      const aim = new THREE.Vector3(adjacent.x + 1.2, 1.6, -adjacent.y + 2.2);
      camera.position.copy(aim).add(new THREE.Vector3().setFromSphericalCoords(22, 1.1, .22));
      camera.lookAt(aim); camera.updateMatrixWorld(true);
      const next = collision.resolve(camera, aim, adjacent, { deltaMs: 1000 / 60, reducedMotion: false });
      assert.ok(next.actualDistance >= 5 && next.actorVerticalOccupancy <= .5 && next.actorInFrame,
        'Every adjacent geometry probe must retain a usable view of the actor and surroundings.');
      assert.ok(next.position.y < 4.65, 'Camera movement must remain below the actual soffit.');
      if (previousPosition) assert.ok(next.position.distanceTo(previousPosition) < .5,
        'Adjacent 0.076m probes must not produce a sudden corridor-direction or distance jump.');
      previousPosition = next.position.clone();
    }
    camera.position.copy(saved); camera.lookAt(target); camera.updateMatrixWorld(true);
    for (const root of roots) collision.removeRoot(root);
    const unblocked = collision.resolve(camera, target, player);
    assert.ok(unblocked.position.distanceTo(saved) < 1e-8);
  } finally {
    collision.dispose();
    for (const root of roots) root.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); });
  }
});
