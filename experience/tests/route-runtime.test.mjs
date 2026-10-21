import test from 'node:test';
import assert from 'node:assert/strict';
import geography from '../src/neighborhoods/shijo-east/geography.json' with { type: 'json' };
import { createSimulation } from '../src/simulation/create-simulation.js';
import { createNavigation } from '../src/simulation/navigation.js';
import { selectSections, cellsAtPoint, STREAM_LIMITS } from '../src/runtime/section-residency.js';
import { normalizeExplorationView } from '../src/runtime/exploration-state.js';
import { getPack, getPackForPlace, getPackPlace } from '../src/packs/registry.js';

const pack = { world: { spawn: geography.spawn }, navigation: geography.navigation, targets: [] };

test('millimetre simulation completes each sourced sight and returns with topology preserved', () => {
  const sim = createSimulation(pack), state = sim.createState();
  for (const sight of [...geography.sights.slice(1), ...geography.sights.slice().reverse()]) {
    sim.setDestination(state, sight.x, sight.y);
    let steps = 0;
    while (state.destination && steps++ < 40000) sim.stepSimulation(state);
    assert.ok(steps < 40000, `Arrival stalled at ${sight.id}`);
    assert.ok(Math.hypot(state.x - sight.x, state.y - sight.y) < .01, sight.id);
    assert.equal(typeof state.edgeId, 'string');
    assert.ok(Number.isFinite(state.edgeDistance));
    assert.ok(sim.navigation.contains(state.x, state.y));
  }
});

test('a pending section preserves the actual path and resumes after admission', () => {
  const sim = createSimulation(pack), state = sim.createState();
  const destination = geography.sights[1]; sim.setDestination(state, destination.x, destination.y);
  const before = sim.snapshot(state);
  for (let index = 0; index < 120; index++) sim.stepSimulation(state, {}, () => false);
  assert.equal(state.x, before.x); assert.equal(state.y, before.y);
  assert.deepEqual(state.destination, before.destination); assert.deepEqual(state.waypoints, before.waypoints);
  sim.stepSimulation(state, {}, () => true);
  assert.ok(Math.hypot(state.x - before.x, state.y - before.y) > .02);
  assert.deepEqual(state.visitedIds, []);
});

test('a route save preserves edge identity and resumes the same branch', () => {
  const sim = createSimulation(pack), state = sim.createState();
  sim.setDestination(state, geography.sights[2].x, geography.sights[2].y);
  for (let index = 0; index < 900; index++) sim.stepSimulation(state);
  const restored = sim.createState(JSON.parse(JSON.stringify(sim.snapshot(state))));
  assert.equal(restored.edgeId, state.edgeId);
  assert.ok(Math.abs(restored.edgeDistance - state.edgeDistance) < .002);
  assert.equal(restored.height, state.height);
  assert.ok(Math.hypot(restored.x - state.x, restored.y - state.y) <= .002);
});

test('route view identity rejects stale topology and keeps existing pack selection explicit', () => {
  const route = getPack('shijo-east'), sim = createSimulation(route), state = sim.createState();
  const input = { version: 3, packId: route.id, revision: route.revision, player: state,
    camera: { ...route.camera.initial, targetOffset: route.camera.followOffset } };
  const value = normalizeExplorationView(input, route.id);
  assert.deepEqual(normalizeExplorationView(value, route.id), value);
  assert.equal(value.player.edgeId, state.edgeId); assert.equal(value.player.height, 0);
  assert.equal(normalizeExplorationView({ ...input, player: { ...state, edgeId: 'unavailable-edge' } }, route.id), null);
  assert.equal(normalizeExplorationView({ ...input, player: { ...state, edgeDistance: Infinity } }, route.id), null);
  assert.equal(normalizeExplorationView({ ...input, revision: route.revision + 1 }, route.id), null);
  assert.equal(getPackForPlace(getPackPlace(route.id)).id, route.id);
  assert.equal(getPackForPlace(getPackPlace('shijo-karasuma')).id, 'shijo-karasuma');
  assert.notEqual(getPackForPlace({ ...getPackPlace(route.id), id: 'unrelated-place' })?.id, route.id);
  sim.setDestination(state, geography.sights.at(-1).x, geography.sights.at(-1).y);
  for (let index = 0; index < 15000 && state.destination; index++) {
    sim.stepSimulation(state);
    if (index % 50 === 0) {
      const kept = normalizeExplorationView({ ...input, player: state }, route.id);
      assert.deepEqual(normalizeExplorationView(kept, route.id), kept, `Pose changed at tick ${index}`);
    }
  }
});

test('spatial residency retains required cells and a selected surface with bounded near detail', () => {
  const navigation = createNavigation(geography.navigation);
  const cells = [];
  for (let x = Math.floor(navigation.bounds.minX / 100) * 100; x <= navigation.bounds.maxX; x += 100) {
    for (let y = Math.floor(navigation.bounds.minY / 100) * 100; y <= navigation.bounds.maxY; y += 100) {
      cells.push({ id: `${x}:${y}`, bounds: { minX: x, maxX: x + 100, minY: y, maxY: y + 100 }, near: {} });
    }
  }
  const point = geography.sights[2], required = cellsAtPoint(cells, point);
  const pinned = cellsAtPoint(cells, geography.sights[1])[0];
  const selected = selectSections(cells, point, { pinnedIds: [pinned.id] });
  for (const cell of required) assert.ok(selected.some(item => item.id === cell.id && item.required));
  assert.ok(selected.some(item => item.id === pinned.id && item.level === 'near'));
  assert.ok(selected.length <= STREAM_LIMITS.baseCells);
  assert.ok(selected.filter(item => item.level === 'near').length <= STREAM_LIMITS.nearCells);
  const compact = selectSections(cells, point, { tier: 'compact' });
  assert.equal(compact.filter(item => item.level === 'near').length, 1);
  assert.ok(!compact.some(item => item.id === cells.at(-1).id));
});
