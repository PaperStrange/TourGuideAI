import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation/create-simulation.js';
import { getPack } from '../src/packs/registry.js';
import { clearMovementState, getRouteProgress } from '../src/runtime/route-progress.js';

test('walking progress follows the actual reviewed route and changes after a new movement intent', () => {
  const pack = getPack('shijo-east'), simulation = createSimulation(pack), player = simulation.createState();
  const target = pack.route.sights.at(-1);
  const path = simulation.navigation.path(player, target);
  simulation.setDestination(player, target.x, target.y);
  const before = getRouteProgress(player);
  assert.ok(Math.hypot(before.goal.x - target.x, before.goal.y - target.y) < .001);
  assert.ok(Math.abs(before.remainingDistanceMeters - path.distanceMeters) < .01);
  for (let index = 0; index < 120; index++) simulation.stepSimulation(player);
  const after = getRouteProgress(player);
  assert.ok(after.remainingDistanceMeters < before.remainingDistanceMeters - 8);
  assert.deepEqual(after.goal, before.goal);
  player.paused = true;
  simulation.stepSimulation(player, { x: 1 });
  assert.deepEqual(getRouteProgress(player), { ...after, paused: true });
  player.paused = false;
  simulation.stepSimulation(player, { x: 1 });
  assert.deepEqual(getRouteProgress(player), { goal: null, remainingDistanceMeters: 0, paused: false });
});

test('arrival has no active destination and a published goal cannot change the queued path', () => {
  const pack = getPack('shijo-east'), simulation = createSimulation(pack), player = simulation.createState();
  const target = pack.route.sights[1];
  simulation.setDestination(player, target.x, target.y);
  const goal = getRouteProgress(player).goal;
  goal.x += 100;
  assert.ok(Math.abs(getRouteProgress(player).goal.x - target.x) < .001);
  let steps = 0;
  while (player.destination && steps++ < 20000) simulation.stepSimulation(player);
  assert.ok(steps < 20000);
  assert.deepEqual(getRouteProgress(player), { goal: null, remainingDistanceMeters: 0, paused: false });
});

test('modal pause preserves the reviewed walk, while explicit cancellation removes it', () => {
  const pack = getPack('shijo-east'), simulation = createSimulation(pack), player = simulation.createState();
  simulation.setDestination(player, pack.route.sights[1].x, pack.route.sights[1].y);
  for (let index = 0; index < 30; index++) simulation.stepSimulation(player);
  const before = simulation.snapshot(player), progress = getRouteProgress(player);
  clearMovementState(player, { preserveDestination: true }); player.paused = true;
  for (let index = 0; index < 120; index++) simulation.stepSimulation(player);
  assert.equal(player.x, before.x); assert.equal(player.y, before.y);
  assert.equal(player.tick, before.tick); assert.equal(player.moving, false);
  assert.deepEqual(player.destination, before.destination); assert.deepEqual(player.waypoints, before.waypoints);
  assert.deepEqual(getRouteProgress(player), { ...progress, paused: true });
  clearMovementState(player, { preserveDestination: true }); player.paused = false;
  simulation.stepSimulation(player);
  assert.ok(getRouteProgress(player).remainingDistanceMeters < progress.remainingDistanceMeters);
  assert.deepEqual(getRouteProgress(player).goal, progress.goal);
  clearMovementState(player);
  const stopped = simulation.snapshot(player);
  for (let index = 0; index < 120; index++) simulation.stepSimulation(player);
  assert.equal(player.x, stopped.x); assert.equal(player.y, stopped.y);
  assert.deepEqual(getRouteProgress(player), { goal: null, remainingDistanceMeters: 0, paused: false });
});
