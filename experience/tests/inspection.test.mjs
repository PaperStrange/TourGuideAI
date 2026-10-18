import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { normalizeExplorationView } from '../src/runtime/exploration-state.js';
import { normalizePerspectiveView } from '../src/runtime/view-state.js';
import { createSurfaceInspection } from '../src/runtime/inspection.js';

const pose = () => ({ version: 2, player: { x: 23.8, y: 2.1 }, camera: {
  azimuth: Math.PI / 2, polar: 0.9, distance: 14, targetOffset: { x: 0, y: 0, height: 8 },
} });

test('exploration saves retain arbitrary orbit while legacy sharing retains its existing interpretation', () => {
  const raw = { ...pose(), visits: ['mitsui'], note: 'A private field outside the pose' };
  const before = structuredClone(raw), saved = normalizeExplorationView(raw);
  assert.deepEqual(raw, before);
  assert.ok(Math.abs(saved.camera.azimuth - Math.PI / 2) < 1e-6);
  assert.deepEqual(Object.keys(saved).sort(), ['camera', 'player', 'version']);
  assert.deepEqual(normalizeExplorationView(saved), saved);
  assert.equal(normalizePerspectiveView(raw), null);
  const old = { ...pose(), version: 1 };
  assert.equal(normalizePerspectiveView(old).camera.azimuth, 0.65);
  const migrated = normalizeExplorationView(old);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.camera.azimuth, 0.65);
  assert.equal(migrated.camera.distance, 22);
});

test('exploration pose validation rejects nonfinite values and bounds position, framing and distance', () => {
  for (const invalid of [null, [], { ...pose(), version: 3 },
    { ...pose(), player: { x: Infinity, y: 2 } },
    { ...pose(), camera: { ...pose().camera, azimuth: NaN } },
    { ...pose(), camera: { ...pose().camera, distance: '14' } },
    { ...pose(), camera: { ...pose().camera, targetOffset: { x: 0, y: 0, height: Infinity } } },
  ]) assert.equal(normalizeExplorationView(invalid), null);
  const saved = normalizeExplorationView({ ...pose(), player: { x: -1000, y: 1000 }, camera: {
    azimuth: Math.PI * 8 + 1.8, polar: 4, distance: -4,
    targetOffset: { x: 200, y: -200, height: 500 },
  } });
  assert.equal(saved.player.x, 0.32);
  assert.ok(saved.player.y > 0 && saved.player.y < 5);
  assert.deepEqual(saved.camera, { azimuth: 1.8, polar: 1.2, distance: 10,
    targetOffset: { x: 32, y: -32, height: 20 } });
});

function surfaceScene() {
  const scene = new THREE.Scene();
  const material = new THREE.MeshStandardMaterial(); material.name = 'glazing';
  const facade = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 1), material);
  facade.userData.semanticGroup = 'NorthUpper'; facade.position.set(0, 2, -5);
  scene.add(facade);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 2, 5); camera.lookAt(0, 2, -5); camera.updateMatrixWorld();
  const player = { x: 0, y: 0 };
  return { scene, facade, camera, player };
}

test('real surface rays change focus with framing and require explicit selection', () => {
  const { scene, facade, camera, player } = surfaceScene();
  scene.updateMatrixWorld(true);
  const inspection = createSurfaceInspection([scene]);
  inspection.setEnabled(true);
  assert.equal(inspection.update(camera, player, 600, 600), true);
  const initial = inspection.snapshot();
  assert.equal(initial.focus.id, 'mitsui-window-bays');
  assert.deepEqual(initial.focus.screen, { x: 300, y: 300 });
  assert.equal(initial.focus.point.y, 4.5);
  assert.equal(initial.selected, null);
  assert.equal(inspection.update(camera, player, 600, 600), false);
  assert.deepEqual(inspection.select().selected, initial.focus);
  camera.position.x = 2; camera.lookAt(0, 2, -5); camera.updateMatrixWorld();
  assert.equal(inspection.update(camera, player, 600, 600), true);
  assert.notEqual(inspection.snapshot().focus.point.x, initial.focus.point.x);
  assert.notEqual(inspection.snapshot().focus.readability, initial.focus.readability);
  assert.deepEqual(inspection.snapshot().selected, initial.focus);
  inspection.clear(); assert.equal(inspection.snapshot().selected, null);
  inspection.point(-400, -400); inspection.update(camera, player, 600, 600);
  assert.equal(inspection.snapshot().focus, null);
  inspection.setEnabled(false);
  assert.deepEqual(inspection.snapshot(), { enabled: false, focus: null, selected: null });
  facade.geometry.dispose(); facade.material.dispose();
});

test('a nearer actual object blocks inspection and hidden or fading surfaces cannot be selected', () => {
  const { scene, facade, camera, player } = surfaceScene();
  const blocker = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 1), new THREE.MeshBasicMaterial());
  blocker.position.set(0, 2, 0); scene.add(blocker); scene.updateMatrixWorld(true);
  const inspection = createSurfaceInspection([scene]); inspection.setEnabled(true);
  inspection.update(camera, player, 600, 600);
  assert.equal(inspection.snapshot().focus, null);
  blocker.visible = false; inspection.update(camera, player, 600, 600);
  assert.equal(inspection.snapshot().focus.id, 'mitsui-window-bays');
  facade.material.opacity = 0.5; inspection.update(camera, player, 600, 600);
  assert.equal(inspection.snapshot().focus, null);
  facade.material.opacity = 1; facade.visible = false; inspection.update(camera, player, 600, 600);
  assert.equal(inspection.snapshot().focus, null);
  for (const mesh of [facade, blocker]) { mesh.geometry.dispose(); mesh.material.dispose(); }
});

test('unsupported material, distant player and grazing surface do not produce a source detail', () => {
  const { scene, facade, camera, player } = surfaceScene();
  scene.updateMatrixWorld(true);
  const inspection = createSurfaceInspection([scene]); inspection.setEnabled(true);
  inspection.update(camera, { x: 100, y: 0 }, 600, 600);
  assert.equal(inspection.snapshot().focus, null);
  facade.material.name = 'unreviewed-sign'; inspection.point(); inspection.update(camera, player, 600, 600);
  assert.equal(inspection.snapshot().focus, null);
  facade.material.name = 'glazing';
  facade.geometry.dispose(); facade.geometry = new THREE.PlaneGeometry(4, 4);
  camera.position.set(19.9, 2, -4.9); camera.lookAt(0, 2, -5); camera.updateMatrixWorld();
  inspection.point(); inspection.update(camera, player, 600, 600);
  assert.equal(inspection.snapshot().focus, null);
  facade.geometry.dispose(); facade.material.dispose();
});
