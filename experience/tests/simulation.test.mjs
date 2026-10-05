import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createState, stepSimulation, setDestination, refreshProximity, snapshot,
  cameraRelativeInput } from '../src/simulation/index.js';
import { WORLD, TARGETS, PLAYER_RADIUS } from '../src/simulation/world.js';

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url)));
const close = (actual, expected, tolerance = 0.000001) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const position = state => [state.x, state.y];
const advance = (state, count, input = {}) => {
  for (let i = 0; i < count; i++) stepSimulation(state, input);
  return state;
};

test('camera-relative axes remain correct at cardinal and intermediate headings', () => {
  const cases = [
    { input: [0, 1, 0], expected: [0, 1] },
    { input: [1, 0, 0], expected: [1, 0] },
    { input: [0, 1, Math.PI / 2], expected: [-1, 0] },
    { input: [1, 0, Math.PI / 2], expected: [0, 1] },
    { input: [0, 1, -Math.PI / 2], expected: [1, 0] },
    { input: [0, 1, Math.PI / 6], expected: [-0.5, 0.8660254] },
    { input: [1, 1, Math.PI / 4], expected: [0, 1.41421356] },
  ];
  for (const { input, expected } of cases) {
    const actual = cameraRelativeInput(...input);
    close(actual.x, expected[0]); close(actual.y, expected[1]);
  }
});

test('a rotated walk preserves its angle instead of snapping to a diagonal', () => {
  const state = createState({ x: 30, y: 0 });
  advance(state, 20, cameraRelativeInput(0, 1, Math.PI / 6));
  close(state.x, 29.24);
  close(state.y, 1.32);
  assert.ok(state.y > 30 - state.x, 'north displacement should exceed west displacement');
  const stopped = position(state);
  advance(state, 10);
  assert.deepEqual(position(state), stopped, 'released input must not retain movement');
});

for (const name of ['legacy-v1-mid-journey', 'legacy-v1-completed']) {
  test(`${name} retains position and journey meaning`, () => {
    const old = fixture(name).game;
    const restored = createState(old);
    assert.deepEqual(position(restored), position(old));
    for (const key of ['visitedIds', 'readSourceIds', 'choiceIds', 'selectedTargetId', 'facing']) {
      assert.deepEqual(restored[key], old[key], key);
    }
    assert.equal(restored.paused, false);
    assert.equal(restored.destination, null, 'restoring must not start an unattended walk');
  });
}

test('legacy facing initializes the 3D actor heading consistently', () => {
  for (const [facing, heading] of [['north', 0], ['east', Math.PI / 2], ['south', Math.PI], ['west', -Math.PI / 2]]) {
    const state = createState({ facing });
    close(Math.sin(state.heading), Math.sin(heading));
    close(Math.cos(state.heading), Math.cos(heading));
  }
});

test('facade bounds stop continuing input, allowing only millimetre quantization', () => {
  const state = createState({ x: 30, y: 0 });
  advance(state, 200, { y: 1 });
  close(state.y, WORLD.northFacadeY - PLAYER_RADIUS, 0.001);
  const north = position(state);
  advance(state, 40, { y: 1 });
  assert.deepEqual(position(state), north);
  advance(state, 600, { y: -1 });
  close(state.y, WORLD.southFacadeY + PLAYER_RADIUS, 0.001);
  const south = position(state);
  advance(state, 40, { y: -1 });
  assert.deepEqual(position(state), south);
});

test('automatic north-to-bank walk uses the mapped crossing without awarding progress', () => {
  const state = createState({ x: 32, y: 2.1 });
  const bank = TARGETS.find(({ id }) => id === 'mufg');
  const goal = { x: bank.approachX ?? bank.x, y: bank.approachY ?? bank.y };
  setDestination(state, goal.x, goal.y);
  const onRoad = [];
  for (let i = 0; i < 2000 && state.destination; i++) {
    stepSimulation(state);
    if (state.y < -2 && state.y > -15) onRoad.push(position(state));
  }
  assert.ok(onRoad.length > 0, 'the route must actually cross the road');
  assert.ok(onRoad.every(([x]) => Math.abs(x - WORLD.crossing.x) < 0.001));
  close(state.x, goal.x, 0.001); close(state.y, goal.y, 0.001);
  assert.equal(state.nearbyTargetId, 'mufg');
  assert.deepEqual(state.visitedIds, []);
  assert.deepEqual(state.readSourceIds, []);
  assert.deepEqual(state.choiceIds, {});
});

test('modal pause freezes navigation and simulation time; resume continues the route', () => {
  const state = createState({ x: 30, y: 0 });
  setDestination(state, 32, 0);
  advance(state, 3);
  state.paused = true;
  const paused = snapshot(state);
  advance(state, 100, { x: 1 });
  assert.deepEqual(position(state), position(paused));
  assert.equal(state.tick, paused.tick);
  assert.deepEqual(state.destination, paused.destination);
  state.paused = false;
  stepSimulation(state);
  assert.ok(state.x > paused.x);
});

test('fixed world-input replay survives a save checkpoint and responds to changed input', () => {
  const commands = [
    ...Array.from({ length: 120 }, () => ({ x: 1 })),
    ...Array.from({ length: 80 }, () => ({ x: -0.5, y: 0.866025 })),
    ...Array.from({ length: 110 }, () => ({ y: -1 })),
    {},
  ];
  const seed = fixture('legacy-v1-mid-journey').game;
  const continuous = createState(seed);
  commands.forEach(input => stepSimulation(continuous, input));
  let resumed = createState(seed);
  commands.slice(0, 150).forEach(input => stepSimulation(resumed, input));
  resumed = createState(JSON.parse(JSON.stringify(snapshot(resumed))));
  commands.slice(150).forEach(input => stepSimulation(resumed, input));
  assert.deepEqual(snapshot(resumed), snapshot(continuous));
  assert.notDeepEqual(position(continuous), position(seed));
  const changed = createState(seed);
  commands.slice(0, -1).forEach(input => stepSimulation(changed, input));
  stepSimulation(changed, { x: -1 });
  assert.notDeepEqual(position(changed), position(continuous));
});

test('invalid restore data cannot manufacture a valid position or unsupported target', () => {
  for (const input of [null, 7, { x: 'bad', y: null, paused: true, visitedIds: ['invented'], readSourceIds: true, choiceIds: null }]) {
    const state = createState(input);
    assert.deepEqual(position(state), [WORLD.spawn.x, WORLD.spawn.y]);
    assert.deepEqual(state.visitedIds, []);
    assert.deepEqual(state.readSourceIds, []);
    assert.equal(state.paused, false);
    assert.ok(Number.isFinite(state.heading));
  }
  const state = createState({ x: 30, y: 0 });
  setDestination(state, NaN, Infinity);
  assert.equal(state.destination, null);
  refreshProximity(state);
  assert.ok(state.nearestTargetId && Number.isFinite(state.targetDistance));
});
