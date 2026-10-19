import test from 'node:test';
import assert from 'node:assert/strict';
import { getPack, listPacks, getPackForPlace, getPackPlace } from '../src/packs/registry.js';
import { createSimulation } from '../src/simulation/create-simulation.js';
import { createNavigation } from '../src/simulation/navigation.js';
import { normalizeExplorationView } from '../src/runtime/exploration-state.js';
import { normalizePerspectiveView } from '../src/runtime/view-state.js';
import { PLACES } from '../src/travel/places.js';
import source from '../content/ginza-wako/source.json' with { type: 'json' };
import { PerspectiveCamera, Vector3 } from 'three';
import { createGuidedCamera, isPlayerInFrame } from '../src/runtime/camera.js';

const shijo = getPack('shijo-karasuma'), ginza = getPack('ginza-wako');
const camera = { azimuth: 2.4, polar: 0.8, distance: 25, targetOffset: { x: 2, y: 3, height: 12 } };
const pose = pack => ({ version: 3, packId: pack.id, revision: pack.revision, player: { ...pack.world.spawn }, camera: { ...camera } });
const near = (actual, expected, tolerance = 0.002) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

test('reviewed registry retains the existing crossing and excludes broad or unsupported places', () => {
  assert.deepEqual(listPacks().map(pack => pack.id), ['shijo-karasuma', 'ginza-wako']);
  const crossing = PLACES.find(place => place.id === 'crossing'), place = getPackPlace(shijo.id, 'zh');
  assert.equal(place.id, crossing.id); assert.equal(place.latitude, crossing.latitude);
  assert.equal(place.longitude, crossing.longitude); assert.equal(place.url, crossing.source);
  for (const pack of listPacks()) assert.equal(getPackForPlace(getPackPlace(pack.id)).id, pack.id);
  for (const kind of ['area', 'country', 'city']) assert.equal(getPackForPlace({ ...place, kind }), null);
  assert.equal(getPackForPlace({ ...place, latitude: 0 }), null);
  assert.equal(getPack('missing'), null); assert.equal(getPackPlace('missing'), null);
});

test('pack views migrate old Shijo data and reject cross-pack or revised coordinate spaces', () => {
  const old = { version: 2, player: { x: 23.8, y: 2.1 }, camera };
  assert.equal(normalizeExplorationView(old).packId, shijo.id);
  assert.equal(normalizeExplorationView(old, ginza.id), null);
  assert.equal(normalizeExplorationView({ ...old, packId: ginza.id }), null);
  for (const pack of listPacks()) {
    const raw = { ...pose(pack), note: 'private', visitedIds: ['mitsui'], token: 'outside-view' };
    const saved = normalizeExplorationView(raw, pack.id);
    assert.deepEqual(normalizeExplorationView(saved, pack.id), saved);
    assert.deepEqual(Object.keys(saved).sort(), ['camera', 'packId', 'player', 'revision', 'version']);
    assert.equal(normalizeExplorationView({ ...raw, revision: 2 }, pack.id), null);
    assert.equal(normalizeExplorationView({ ...raw, packId: 'missing' }, pack.id), null);
    assert.equal(normalizeExplorationView({ ...raw, player: { x: Infinity, y: 0 } }, pack.id), null);
  }
  assert.equal(normalizeExplorationView(pose(ginza)), null);
  assert.equal(normalizePerspectiveView(pose(ginza)), null);
  const shared = { ...old, version: 1 };
  assert.equal(normalizePerspectiveView(shared).version, 1);
  assert.equal(normalizeExplorationView(shared).version, 3);
});

test('Ginza framing and navigation use their own bounds without shifting the historical Shijo pose', () => {
  const raw = pose(ginza); raw.camera.targetOffset.height = 39.39;
  const saved = normalizeExplorationView(raw, ginza.id);
  assert.ok(saved.player.x < 0); near(saved.player.x, -13.727744);
  near(saved.camera.targetOffset.height, 39.39);
  const historical = normalizeExplorationView({ version: 2, player: { x: -100, y: 100 }, camera });
  assert.equal(historical.player.x, 0.32); assert.equal(historical.player.y, 4.34);
  assert.equal(normalizeExplorationView(pose(shijo), ginza.id), null);
});

test('the authored finite corridor follows the frozen connected source path and respects endpoint limits', () => {
  assert.deepEqual(ginza.navigation.centerline, source.sidewalk.centerline.map(({ x, y }) => ({ x, y })));
  const nav = createNavigation(ginza.navigation), stats = nav.snapshot();
  near(stats.length, 55.281851, 0.00001); near(stats.width, 4); near(stats.centerRadius, 1.68);
  assert.equal(nav.contains(0, 20), false);
  assert.equal(nav.contains(-100, 100), false);
  const left = nav.project(-100, 100), first = source.sidewalk.centerline[0];
  near(Math.hypot(left.x - first.x, left.y - first.y), 1.679);
  assert.ok(nav.contains(left.x, left.y));
});

test('actual fixed-step corner travel reaches both wings while remaining within the reviewed corridor', () => {
  const sim = createSimulation(ginza), state = sim.createState();
  const last = source.sidewalk.centerline.at(-1), first = source.sidewalk.centerline[0];
  for (const target of [last, first]) {
    sim.setDestination(state, target.x, target.y);
    assert.ok([state.destination, ...state.waypoints].some(point => point.x === 0 && point.y === 0));
    let ticks = 0, reachedCorner = false;
    while (state.destination && ticks++ < 3000) {
      sim.stepSimulation(state);
      assert.ok(sim.navigation.contains(state.x, state.y), `outside at ${state.x},${state.y}`);
      if (Math.hypot(state.x, state.y) < 0.09) reachedCorner = true;
    }
    assert.ok(ticks < 3000); assert.ok(reachedCorner);
    near(state.x, target.x); near(state.y, target.y);
  }
  assert.deepEqual(state.visitedIds, []); assert.deepEqual(state.choiceIds, {});
  assert.equal(state.selectedTargetId, null);
});

test('holding movement against the road and building boundaries cannot escape the capsule envelope', () => {
  const sim = createSimulation(ginza);
  for (const input of [{ x: -1, y: -1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }]) {
    const state = sim.createState();
    for (let tick = 0; tick < 1200; tick++) {
      sim.stepSimulation(state, input); assert.ok(sim.navigation.contains(state.x, state.y));
    }
  }
});

test('two simultaneous simulation instances retain separate movement, targets and paused state', () => {
  const kyotoSim = createSimulation(shijo), ginzaSim = createSimulation(ginza);
  const kyoto = kyotoSim.createState({ visitedIds: ['mitsui'] }), tokyo = ginzaSim.createState({ visitedIds: ['mitsui'] });
  const before = kyotoSim.snapshot(kyoto);
  ginzaSim.setDestination(tokyo, 0, 0);
  for (let i = 0; i < 100; i++) ginzaSim.stepSimulation(tokyo);
  assert.deepEqual(kyotoSim.snapshot(kyoto), before);
  assert.deepEqual(tokyo.visitedIds, []); assert.deepEqual(kyoto.visitedIds, ['mitsui']);
  tokyo.paused = true;
  const paused = ginzaSim.snapshot(tokyo); ginzaSim.stepSimulation(tokyo);
  assert.equal(tokyo.tick, paused.tick); assert.equal(tokyo.x, paused.x); assert.equal(tokyo.y, paused.y);
});

test('the opening contains both footprint wings, source height extrema and the grounded traveller on desktop and portrait', () => {
  const { initial, fov } = ginza.camera, spawn = ginza.world.spawn, offset = initial.targetOffset;
  const dimensions = source.building.dimensions;
  const anchors = source.building.footprint.flatMap(point => [0, dimensions.roofHeightMetres]
    .map(height => new Vector3(point.x, height, -point.y)));
  // 将塔顶放在来源轮廓最靠近相机的转角，检验比实际后退塔身更保守的竖向范围。
  const front = source.building.footprint.reduce((a, b) => a.y < b.y ? a : b);
  anchors.push(new Vector3(front.x, dimensions.groundToClockTowerTopMetres + dimensions.lightningRodHeightMetres, -front.y));
  anchors.push(new Vector3(spawn.x, 0, -spawn.y), new Vector3(spawn.x, 1.75, -spawn.y));
  for (const aspect of [1.38, 352 / 430]) {
    const viewCamera = new PerspectiveCamera(fov, aspect, .15, 200);
    const target = new Vector3(spawn.x + offset.x, offset.height, -spawn.y - offset.y);
    viewCamera.position.copy(target).add(new Vector3().setFromSphericalCoords(initial.distance, initial.polar, initial.azimuth));
    viewCamera.lookAt(target); viewCamera.updateMatrixWorld();
    assert.ok(viewCamera.position.y < dimensions.roofHeightMetres);
    for (const anchor of anchors) {
      const projected = anchor.clone().project(viewCamera);
      assert.ok(Math.abs(projected.x) < .94 && Math.abs(projected.y) < .94,
        `Opening clips ${anchor.toArray()} at aspect ${aspect}: ${projected.toArray()}`);
    }
  }
  assert.equal(shijo.camera.fov ?? 42, 42);
});

test('player framing detects a close architectural gaze and the follow offset restores visibility with the same orbit and zoom', () => {
  const player = ginza.world.spawn, { initial, followOffset, limits, fov } = ginza.camera;
  for (const aspect of [1.38, 352 / 430]) {
    const viewCamera = new PerspectiveCamera(fov, aspect, .15, 200);
    const target = new Vector3(player.x + initial.targetOffset.x, initial.targetOffset.height, -player.y - initial.targetOffset.y);
    viewCamera.position.copy(target).add(new Vector3().setFromSphericalCoords(initial.distance, initial.polar, initial.azimuth));
    viewCamera.lookAt(target);
    assert.equal(isPlayerInFrame(viewCamera, player), true, 'opening stays framed');
    for (const azimuth of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      for (const polar of limits.polar) {
        target.set(player.x, source.building.dimensions.groundToClockTowerTopMetres, -player.y);
        viewCamera.position.copy(target).add(new Vector3().setFromSphericalCoords(limits.distance[0], polar, azimuth));
        viewCamera.lookAt(target);
        assert.equal(isPlayerInFrame(viewCamera, player), false, 'close tower view excludes the player');
        const direction = viewCamera.getWorldDirection(new Vector3());
        const nextTarget = new Vector3(player.x + followOffset.x, followOffset.height, -player.y - followOffset.y);
        viewCamera.position.add(nextTarget.clone().sub(target));
        viewCamera.lookAt(nextTarget);
        assert.equal(isPlayerInFrame(viewCamera, player), true, `follow view at ${aspect}/${azimuth}/${polar}`);
        near(viewCamera.position.distanceTo(nextTarget), limits.distance[0], 1e-10);
        near(viewCamera.getWorldDirection(new Vector3()).distanceTo(direction), 0, 1e-10);
      }
    }
  }
});

test('Keep walking recovers an off-screen player smoothly, tolerates held input and honors reduced motion', () => {
  for (const [reducedMotion, leaveInspection] of [[false, false], [false, true], [true, false], [true, true]]) {
    const player = { ...ginza.world.spawn };
    // OrbitControls 支持不连接 DOM 的相机；这里直接检验真实的相机与过渡状态。
    const rig = createGuidedCamera(null, player, reducedMotion, () => {}, { solo: true, pack: ginza });
    rig.resize(352, 430);
    const opening = rig.snapshot();
    rig.setInspecting(false); rig.resumeFollow();
    assert.deepEqual(rig.snapshot(), opening, 'valid opening and initial mode setup stay unchanged');
    rig.setInspecting(true);
    const detail = { azimuth: 1.2, polar: 1.45, distance: 10,
      targetOffset: { x: 0, y: 0, height: source.building.dimensions.groundToClockTowerTopMetres } };
    rig.restorePose(detail, player);
    assert.equal(isPlayerInFrame(rig.camera, player), false);
    const before = rig.snapshot();
    if (leaveInspection) rig.setInspecting(false); else rig.resumeFollow();
    assert.equal(rig.snapshot().transitioning, !reducedMotion);
    if (!reducedMotion) assert.deepEqual(rig.snapshot().position, before.position, 'recovery begins without a jump');
    for (let frame = 0; frame < 30; frame++) {
      player.x += .01;
      rig.resumeFollow();
      rig.follow(player, 16, reducedMotion);
    }
    const recovered = rig.snapshot();
    assert.equal(recovered.transitioning, false, 'held movement does not restart the transition');
    assert.equal(isPlayerInFrame(rig.camera, player), true);
    near(recovered.azimuth, detail.azimuth, 1e-6);
    near(recovered.polar, detail.polar, 1e-6);
    near(recovered.distance, detail.distance, 1e-6);
    near(recovered.target[1], ginza.camera.followOffset.height, 1e-6);
  }
});
