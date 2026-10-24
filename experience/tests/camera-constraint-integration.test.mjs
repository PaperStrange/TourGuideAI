import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadNeighborhoodGeometry } from './helpers/neighborhood-geometry.mjs';
import { createCameraObstruction } from '../src/runtime/camera-obstruction.js';
import { createGuidedCamera } from '../src/runtime/camera.js';
import { getPack } from '../src/packs/registry.js';

test('actual source274 geometry preserves the native camera trace and accumulates stalls across internal safe-pose adoption', async () => {
  const captured = JSON.parse(await readFile(new URL('./fixtures/source274-guidance-failure.json', import.meta.url)));
  assert.equal(captured.reportSha256, 'e625fdcb2bd81daee2c47bbdf7d7b1b466feeeefe354816b2b0db918f1ba4cc8');
  const base = new URL('../public/assets/neighborhoods/shijo-east/', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('manifest.json', base))), roots = [], callbacks = [], calls = [];
  const collision = createCameraObstruction((mesh, hit) => {
    if (mesh.userData.occlusionGroup?.startsWith('Canopy_') || mesh.userData.semanticGroup?.includes('Canopy')) return true;
    const index = mesh.geometry.getAttribute('_source_index')?.getX(hit.face.a);
    const source = (mesh.userData.featureTable ?? manifest.featureTable)?.[index];
    return source?.kind === 'building' || source?.sourceId?.startsWith('kyoto-city:bldg_') === true;
  });
  const player = structuredClone(captured.player);
  let phase = 'setup';
  try {
    for (const asset of [manifest.context, ...captured.cells.map(cell => manifest.cells.find(value => value.id === cell.id)[cell.level])]) {
      const root = await loadNeighborhoodGeometry(new URL(asset.file, base)); roots.push(root); collision.addRoot(root);
    }
    const rig = createGuidedCamera(null, player, false, () => {}, { solo: true, pack: getPack('shijo-east'),
      onConstraintChange(value) { callbacks.push({ phase, value }); } });
    rig.resize(captured.projectionMatrix[5] / captured.projectionMatrix[0], 1);
    rig.restorePose(captured.camera, player);
    // 完整保留真实求解器调用，仅记录其结果；中间安全视点不会替换成测试数据。
    rig.setObstructionResolver((camera, target, state, options) => {
      const result = collision.resolve(camera, target, state, options);
      calls.push({ phase, active: result.active, deltaMs: options.deltaMs,
        yaw: Math.atan2(result.position.x - result.target.x, result.position.z - result.target.z) });
      return result;
    });
    rig.setInspecting(true);
    for (let step = 0; step < captured.steps.length; step++) {
      assert.equal(captured.steps[step].key, 'l');
      phase = 'input-' + step; rig.rotate(.08); phase = 'settle-' + step;
      let quiet = 0, previous = rig.snapshot();
      for (let frame = 0; frame < 100; frame++) {
        rig.follow(player, 100); rig.synchronizeCamera(100);
        const after = rig.snapshot();
        const unchanged = after.matrixWorld.every((value, index) => Math.abs(value - previous.matrixWorld[index]) < .00001);
        quiet = !after.obstruction.settling && unchanged ? quiet + 1 : 0; previous = after;
        if (quiet >= 3) break;
      }
      assert.ok(quiet >= 3, 'The real collision response must settle.');
      const actual = rig.snapshot(), expected = captured.steps[step].after;
      for (const field of ['position', 'desiredPosition', 'target', 'viewTarget', 'matrixWorld']) {
        assert.ok(actual[field].every((value, index) => Math.abs(value - expected[field][index]) < 1e-9),
          'Feedback must preserve the captured native ' + field + ' at step ' + step);
      }
      if (step < 9) assert.deepEqual(callbacks, []);
    }
    assert.deepEqual(callbacks, [{ phase: 'settle-9', value: true }]);
    const adopted = calls.filter(value => value.phase === 'input-9');
    assert.equal(adopted[0].active, false);
    assert.equal(adopted[0].deltaMs, 0);
    assert.ok(adopted.slice(1).some(value => value.active), 'The same native input then reaches the actual constrained direction.');
    assert.ok(adopted.every(value => Math.abs(value.yaw - adopted[0].yaw) < .005));
    phase = 'tilt'; rig.tilt(-.06);
    assert.deepEqual(callbacks, [{ phase: 'settle-9', value: true }, { phase: 'tilt', value: false }]);
    assert.deepEqual(player, captured.player);
  } finally {
    collision.dispose();
    for (const root of roots) root.traverse(mesh => {
      mesh.geometry?.dispose(); for (const material of [mesh.material].flat()) material?.dispose();
    });
  }
});
