import test from 'node:test';
import assert from 'node:assert/strict';
import { describeJourneyWalking } from '../src/home/journey-panel.js';
import { createJourneyPlanner } from '../src/journey/recommendations.js';
import { createJourneySession } from '../src/journey/session.js';
import { createSimulation } from '../src/simulation/create-simulation.js';
import { getRouteProgress } from '../src/runtime/route-progress.js';
import { getPack } from '../src/packs/registry.js';
import geography from '../src/neighborhoods/shijo-east/geography.json' with { type: 'json' };
import { SIGHTS } from '../src/neighborhoods/shijo-east/sights.js';

const pack = getPack('shijo-east');
const planner = createJourneyPlanner({ routeId: pack.id, revision: pack.revision,
  graph: pack.navigation, startNodeId: geography.startNodeId, sights: SIGHTS });
const routeState = state => ({ id: pack.id, revision: pack.revision, position: { x: state.x, y: state.y },
  ...getRouteProgress(state) });

test('walking guidance uses the actual queued graph path and localized sight goal without changing the itinerary', () => {
  const simulation = createSimulation(pack), state = simulation.createState();
  const sight = SIGHTS.find(value => value.id === 'nishiki-tenmangu');
  const session = createJourneySession(planner.recommend()[0]), saved = JSON.stringify(session);
  simulation.setDestination(state, sight.position.x, sight.position.y);
  const current = routeState(state), english = describeJourneyWalking(current, planner, 'en');
  assert.equal(english.sightId, sight.id);
  assert.equal(english.target, 'Walking to ' + sight.title.en);
  assert.equal(english.remainingMeters, Math.ceil(current.remainingDistanceMeters));
  assert.ok(current.remainingDistanceMeters > Math.hypot(sight.position.x - state.x, sight.position.y - state.y));
  const chinese = describeJourneyWalking(current, planner, 'zh');
  assert.equal(chinese.target, '正在步行前往' + sight.title.zh);
  assert.equal(chinese.remainingMeters, english.remainingMeters);
  assert.ok(chinese.distance.endsWith('米'));
  for (let index = 0; index < 240; index++) simulation.stepSimulation(state);
  assert.ok(describeJourneyWalking(routeState(state), planner).remainingMeters < english.remainingMeters);
  assert.equal(JSON.stringify(session), saved);
});

test('redirecting through the actual graph replaces sight guidance with the selected point', () => {
  const simulation = createSimulation(pack), state = simulation.createState();
  const sight = SIGHTS.at(-1);
  simulation.setDestination(state, sight.position.x, sight.position.y);
  assert.equal(describeJourneyWalking(routeState(state), planner).sightId, sight.id);
  const point = pack.navigation.nodes.find(node => !SIGHTS.some(value =>
    Math.hypot(node.x - value.position.x, node.y - value.position.y) <= .15));
  simulation.setDestination(state, point.x, point.y);
  const guidance = describeJourneyWalking(routeState(state), planner);
  assert.equal(guidance.sightId, null);
  assert.equal(guidance.target, 'Walking to your chosen point');
  assert.equal(describeJourneyWalking(routeState(state), planner, 'zh').target, '正在步行前往你选定的位置');
});

test('pausing and manual movement do not retain a false active walking claim', () => {
  const simulation = createSimulation(pack), state = simulation.createState();
  const sight = SIGHTS.at(-1);
  simulation.setDestination(state, sight.position.x, sight.position.y);
  state.paused = true; simulation.stepSimulation(state);
  const english = describeJourneyWalking(routeState(state), planner), chinese = describeJourneyWalking(routeState(state), planner, 'zh');
  assert.equal(english.phase, 'paused'); assert.equal(english.target, 'Destination: ' + sight.title.en);
  assert.equal(english.detail, 'This walk is paused.'); assert.equal(chinese.detail, '当前步行已暂停。');
  state.paused = false; simulation.stepSimulation(state, { x: 1, y: 0 });
  assert.equal(describeJourneyWalking(routeState(state), planner), null);
  assert.equal(describeJourneyWalking(null, planner), null);
  simulation.setDestination(state, sight.position.x, sight.position.y);
  assert.equal(describeJourneyWalking({ ...routeState(state), id: 'ginza-wako' }, planner), null);
  assert.equal(describeJourneyWalking({ ...routeState(state), revision: pack.revision + 1 }, planner), null);
});
