import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { loadNeighborhoodGeometry } from './helpers/neighborhood-geometry.mjs';
import { createCameraObstruction } from '../src/runtime/camera-obstruction.js';
import { createGuidedCamera } from '../src/runtime/camera.js';
import { normalizeExplorationCamera } from '../src/runtime/exploration-state.js';
import { getPack } from '../src/packs/registry.js';

test('the recorded Tenmangu orbit keeps street scale, allows reversal, and preserves deliberate independent inspection', async t => {
  const bytes = gunzipSync(await readFile(new URL('../evidence/neighborhood-20261023/qa/candidate-6-tenmangu-framing/neighborhood-result.json.gz', import.meta.url)));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '22b714288618cc34b9ac8369545a62a3d21ca18a6a8e2141dd9ae815d0ceef2f');
  const observed = JSON.parse(bytes).scenarios['tenmangu-native-framing'].inputs[0].before;
  const idleObserved = JSON.parse(await readFile(new URL('./fixtures/tenmangu-idle-pose.json', import.meta.url)));
  const idleBytes = gunzipSync(await readFile(new URL('../../' + idleObserved.report, import.meta.url)));
  assert.equal(createHash('sha256').update(idleBytes).digest('hex'), idleObserved.reportSha256);
  const idleReport = JSON.parse(idleBytes);
  const capturedIdle = idleReport.checks.find(check => check.id === idleObserved.checkId).evidence.before;
  assert.equal(idleReport.artifact.manifestSha256, idleObserved.packageSha256);
  assert.equal(idleReport.source.geographySha256, idleObserved.geographySha256);
  assert.equal(idleReport.source.manifestSha256, idleObserved.manifestSha256);
  assert.deepEqual(capturedIdle.home.currentView.player, idleObserved.player);
  assert.deepEqual(capturedIdle.home.currentView.camera, idleObserved.camera);
  for (const key of ['target', 'desiredPosition', 'position']) assert.deepEqual(capturedIdle.camera[key], idleObserved[key]);
  assert.deepEqual(capturedIdle.stream.cells.filter(cell => cell.level).map(({ id, level }) => ({ id, level })), idleObserved.cells);
  const player = structuredClone(observed.route.position), originalPlayer = structuredClone(player);
  assert.deepEqual(player, idleObserved.player);
  assert.deepEqual(observed.home.currentView.camera, idleObserved.camera);
  assert.deepEqual(observed.stream.cells.filter(cell => cell.level).map(({ id, level }) => ({ id, level })), idleObserved.cells);
  const base = new URL('../public/assets/neighborhoods/shijo-east/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('manifest.json', base)));
  const roots = [];
  try {
    for (const asset of [manifest.context, ...observed.stream.cells.filter(cell => cell.level)
      .map(item => manifest.cells.find(cell => cell.id === item.id)[item.level])]) {
      roots.push(await loadNeighborhoodGeometry(new URL(asset.file, base)));
    }
    for (const reducedMotion of [false, true]) {
      const collision = createCameraObstruction((mesh, hit) => {
        if (mesh.userData.occlusionGroup?.startsWith('Canopy_') || mesh.userData.semanticGroup?.includes('Canopy')) return true;
        const index = mesh.geometry.getAttribute('_source_index')?.getX(hit.face.a);
        const source = (mesh.userData.featureTable ?? manifest.featureTable)?.[index];
        return source?.kind === 'building' || source?.sourceId?.startsWith('kyoto-city:bldg_');
      });
      roots.forEach(root => collision.addRoot(root));
      let notifications = 0;
      const rig = createGuidedCamera(null, player, reducedMotion, () => { notifications++; }, { solo: true, pack: getPack('shijo-east') });
      try {
        rig.resize(observed.camera.projectionMatrix[5] / observed.camera.projectionMatrix[0], 1);
        rig.restorePose(observed.home.currentView.camera, player); rig.setObstructionResolver(collision.resolve);
        const savedCamera = () => {
          const value = rig.snapshot();
          return normalizeExplorationCamera({ azimuth: value.azimuth, polar: value.polar, distance: value.distance,
            targetOffset: { x: value.target[0] - player.x, y: -value.target[2] - player.y, height: value.target[1] } }, value.limits);
        };
        function checkRecordedIdle() {
          // 保留 candidate 8 的原始浮点姿态，直接复现边界收敛；提前预热会跳过实际出现的累计舍入。
          rig.controls.target.fromArray(idleObserved.target);
          rig.controls.object.position.fromArray(idleObserved.desiredPosition);
          rig.controls.object.lookAt(rig.controls.target); rig.controls.object.updateMatrixWorld(true);
          rig.controls.update(); rig.synchronizeCamera(1000 / 60);
          const stationary = rig.snapshot(), stationarySave = savedCamera();
          assert.ok(new THREE.Vector3().fromArray(stationary.position).distanceTo(new THREE.Vector3().fromArray(idleObserved.position)) < 1e-10);
          let nativeChanges = 0, synchronizedChanges = 0;
          const countNativeChange = () => { nativeChanges++; };
          rig.controls.addEventListener('change', countNativeChange);
          notifications = 0;
          for (let frame = 0; frame < 2400; frame++) {
            rig.follow(player, 1000 / 60);
            if (rig.synchronizeCamera(1000 / 60)) synchronizedChanges++;
          }
          rig.controls.removeEventListener('change', countNativeChange);
          const converged = rig.snapshot();
          assert.ok(nativeChanges > 0, 'The actual minimum-radius pose exercises OrbitControls roundoff change events.');
          assert.notDeepEqual(converged.desiredPosition, stationary.desiredPosition, 'Recorded floating-point convergence remains unmodified.');
          assert.equal(notifications, 0, 'The complete recorded convergence must not request draws for minimum-radius roundoff.');
          assert.equal(synchronizedChanges, 0);
          assert.deepEqual(savedCamera(), stationarySave, 'Filtering draw notifications preserves private camera intent.');
          assert.ok(new THREE.Vector3().fromArray(converged.position).distanceTo(new THREE.Vector3().fromArray(stationary.position)) < 1e-10);
          t.diagnostic(JSON.stringify({ reducedMotion, inspecting: converged.inspecting, updates: 2400, nativeChanges, notifications, synchronizedChanges }));
        }
        checkRecordedIdle();
        const before = rig.snapshot();
        assert.ok(new THREE.Vector3().fromArray(before.position).distanceTo(new THREE.Vector3().fromArray(observed.camera.position)) < .01,
          'The test starts at the actual recovered view captured before the failing native J input.');
        rig.setInspecting(true); rig.synchronizeCamera(1000 / 60);
        assert.deepEqual(rig.snapshot().desiredPosition, before.desiredPosition);
        assert.deepEqual(rig.snapshot().position, before.position);
        checkRecordedIdle();
        const untouched = rig.snapshot();
        rig.rotate(0); rig.tilt(0); rig.zoom(0); rig.pan(0, 0);
        assert.deepEqual(rig.snapshot(), untouched, 'Zero input keeps saved framing and inspection intent unchanged.');
        function assertStreetFrame() {
          const camera = rig.snapshot();
          assert.ok(camera.obstruction.actualDistance >= 5 - 1e-6, 'An orbit must not silently zoom through the pack minimum.');
          assert.ok(camera.obstruction.actorVerticalOccupancy <= .5, 'The actor leaves room for the real street.');
          for (const height of [0, 1.75]) {
            const point = new THREE.Vector3(player.x, player.height + height, -player.y).project(rig.camera);
            assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && Math.abs(point.z) < 1);
          }
          return new THREE.Vector3().fromArray(camera.position);
        }
        function settleStreet(previous) {
          for (let frame = 0; frame < 180; frame++) {
            const current = assertStreetFrame();
            assert.ok(current.distanceTo(previous) < .5, 'A small input cannot jump to another side of the passage.');
            previous = current; rig.synchronizeCamera(1000 / 60);
          }
          assert.equal(rig.snapshot().obstruction.settling, false);
          return assertStreetFrame();
        }
        const visible = new THREE.Spherical().setFromVector3(new THREE.Vector3().fromArray(before.position)
          .sub(new THREE.Vector3().fromArray(before.viewTarget)));
        rig.rotate(-.08);
        assert.ok(notifications > 0, 'Actual orbit input still invalidates the view.');
        assert.equal(rig.snapshot().inspectionPanned, false);
        assert.ok(Math.abs(rig.snapshot().azimuth - visible.theta + .08) < 1e-6);
        const blocked = settleStreet(new THREE.Vector3().fromArray(before.position));
        assert.deepEqual(rig.snapshot().target, before.viewTarget);
        rig.rotate(.08);
        const reversed = settleStreet(blocked);
        assert.ok(reversed.distanceTo(blocked) > .2, 'Reversing away from the wall still changes the view.');
        rig.tilt(-.06); settleStreet(reversed);
        const beforeZoom = rig.snapshot(); rig.zoom(-1);
        settleStreet(new THREE.Vector3().fromArray(beforeZoom.position));

        // 主动向上平移检查真实立面；人物可以离开画面，目标不会被人物构图覆盖。
        rig.pan(0, 1.5);
        for (let frame = 0; frame < 180; frame++) rig.synchronizeCamera(1000 / 60);
        const panned = rig.snapshot();
        assert.equal(panned.inspectionPanned, true);
        assert.ok(panned.target[1] > beforeZoom.target[1] + 1);
        assert.deepEqual(panned.viewTarget, panned.target);
        assert.equal(panned.obstruction.framingRecovered, false);
        assert.equal(panned.obstruction.actorInFrame, false, 'Purposeful detail inspection can leave the actor outside the view.');
        const saved = { azimuth: panned.azimuth, polar: panned.polar, distance: panned.distance,
          targetOffset: { x: panned.target[0] - player.x, y: -panned.target[2] - player.y, height: panned.target[1] } };
        rig.restorePose(saved, player);
        assert.deepEqual(rig.snapshot().viewTarget, rig.snapshot().target);
        assert.equal(rig.snapshot().obstruction.actorInFrame, false);
        rig.setInspecting(false);
        for (let frame = 0; frame < 180; frame++) { rig.follow(player, 1000 / 60); rig.synchronizeCamera(1000 / 60); }
        assertStreetFrame();
        assert.deepEqual(player, originalPlayer);
        const beforeResize = notifications, projection = rig.snapshot().projectionMatrix;
        rig.resize(1, 1);
        assert.ok(notifications > beforeResize, 'Projection changes still invalidate the view.');
        assert.notDeepEqual(rig.snapshot().projectionMatrix, projection);
        const beforeSameAspectResize = notifications;
        rig.resize(2, 2);
        assert.ok(notifications > beforeSameAspectResize, 'A viewport size change still invalidates at the same aspect ratio.');
        for (let input = 0; input < 8; input++) {
          const beforeNativePan = notifications, savedBeforeNativePan = savedCamera();
          rig.controls.target.x += .01; rig.controls.object.position.x += .01;
          rig.controls.update();
          assert.ok(notifications > beforeNativePan, 'Each real public OrbitControls pose change still reaches the application.');
          assert.notDeepEqual(savedCamera(), savedBeforeNativePan);
        }
        rig.setInspecting(true);
        for (const operation of ['rotate', 'pan']) {
          for (let input = 0; input < 3; input++) {
            const beforeInput = notifications;
            if (operation === 'pan') rig.pan(1e-14, 0); else rig.rotate(1e-14);
            assert.ok(notifications > beforeInput, 'Every deliberate camera command publishes even a numerically tiny adjustment.');
          }
        }
      } finally { collision.dispose(); }
    }
  } finally {
    for (const root of roots) root.traverse(mesh => { mesh.geometry?.dispose(); mesh.material?.dispose(); });
  }
});
