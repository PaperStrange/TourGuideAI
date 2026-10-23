import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { loadNeighborhoodGeometry } from './helpers/neighborhood-geometry.mjs';
import { createCameraObstruction } from '../src/runtime/camera-obstruction.js';
import { createGuidedCamera } from '../src/runtime/camera.js';
import { cameraRelativeInput } from '../src/simulation/world.js';
import { getPack } from '../src/packs/registry.js';

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
    const rig = createGuidedCamera(null, player, true, () => {}, { solo: true, pack: getPack('shijo-east') });
    rig.restorePose({ azimuth: observed.camera.azimuth, polar: observed.camera.polar, distance: observed.camera.distance,
      targetOffset: { x: target.x - player.x, y: -target.z - player.y, height: target.y } }, player);
    rig.setObstructionResolver(collision.resolve);
    const desiredBeforeInput = rig.snapshot();
    const forward = rig.camera.getWorldDirection(new THREE.Vector3());
    const right = new THREE.Vector3().setFromMatrixColumn(rig.camera.matrixWorld, 0);
    for (const [horizontal, vertical, vector] of [[0, 1, forward], [1, 0, right]]) {
      const actualInput = cameraRelativeInput(horizontal, vertical, rig.getMovementAzimuth());
      const length = Math.hypot(vector.x, vector.z);
      assert.ok(Math.abs(actualInput.x - vector.x / length) < 1e-6);
      assert.ok(Math.abs(actualInput.y + vector.z / length) < 1e-6);
    }
    const angularDifference = Math.atan2(Math.sin(rig.getMovementAzimuth() - rig.controls.getAzimuthalAngle()),
      Math.cos(rig.getMovementAzimuth() - rig.controls.getAzimuthalAngle()));
    assert.ok(Math.abs(angularDifference) > Math.PI / 4, 'The actual recovered pose must exercise a substantial input-direction difference.');
    assert.deepEqual(rig.snapshot().desiredPosition, desiredBeforeInput.desiredPosition);
    assert.equal(rig.snapshot().azimuth, desiredBeforeInput.azimuth);
    for (const reducedMotion of [false, true]) {
      for (const operation of ['rotate', 'tilt', 'zoom', 'pan']) {
        const controlled = createGuidedCamera(null, player, reducedMotion, () => {}, { solo: true, pack: getPack('shijo-east') });
        controlled.restorePose({ azimuth: observed.camera.azimuth, polar: observed.camera.polar, distance: observed.camera.distance,
          targetOffset: { x: target.x - player.x, y: -target.z - player.y, height: target.y } }, player);
        controlled.setObstructionResolver(collision.resolve); controlled.setInspecting(true);
        const before = controlled.snapshot(), viewTarget = new THREE.Vector3().fromArray(before.viewTarget);
        const visibleOffset = new THREE.Vector3().fromArray(before.position).sub(viewTarget);
        const visible = new THREE.Spherical().setFromVector3(visibleOffset);
        const expectedTarget = viewTarget.clone();
        if (operation === 'pan') {
          expectedTarget.add(new THREE.Vector3().setFromMatrixColumn(controlled.camera.matrixWorld, 0).multiplyScalar(.1))
            .add(new THREE.Vector3().setFromMatrixColumn(controlled.camera.matrixWorld, 1).multiplyScalar(.1));
          controlled.pan(.1, .1);
        } else controlled[operation](operation === 'zoom' ? -.3 : .05);
        const after = controlled.snapshot();
        const expectedYaw = visible.theta + (operation === 'rotate' ? .05 : 0);
        const angleError = Math.atan2(Math.sin(after.azimuth - expectedYaw), Math.cos(after.azimuth - expectedYaw));
        assert.ok(Math.abs(angleError) < 1e-6, `${operation} starts from the actual rendered yaw.`);
        assert.ok(Math.abs(after.polar - visible.phi - (operation === 'tilt' ? .05 : 0)) < 1e-6);
        const expectedDistance = Math.max(getPack('shijo-east').camera.limits.distance[0], visible.radius + (operation === 'zoom' ? -.3 : 0));
        assert.ok(Math.abs(after.distance - expectedDistance) < 1e-6, `${operation} starts from the visible radius within the pack zoom limit.`);
        assert.ok(new THREE.Vector3().fromArray(after.target).distanceTo(expectedTarget) < 1e-6);
        assert.ok(new THREE.Vector3().fromArray(after.position).distanceTo(new THREE.Vector3().fromArray(before.position)) < 1,
          'One small deliberate input must not jump from the corridor to the hidden requested camera.');
        assert.equal(after.inspectionAimed, true);
        assert.deepEqual(player, beforePlayer);
      }
    }
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
