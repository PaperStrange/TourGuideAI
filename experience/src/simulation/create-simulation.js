import { WORLD, TARGETS, STEP_MM, INTERACTION_RADIUS, approachPoint } from './world.js';
import { createNavigation } from './navigation.js';

const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const mm = value => Math.round(value * 1000);

export function createSimulation(pack = { world: WORLD, targets: TARGETS, navigation: { kind: 'rect-crossing', world: WORLD } }) {
  const { world, targets = [] } = pack, navigation = createNavigation(pack.navigation);
  const validIds = new Set(targets.map(({ id }) => id));
  const ids = values => [...new Set(Array.isArray(values) ? values.filter(id => validIds.has(id)) : [])];
  const strings = values => Object.fromEntries(Object.entries(values && typeof values === 'object' ? values : {})
    .filter(([id, value]) => validIds.has(id) && typeof value === 'string'));
  function createState(saved = {}) {
    if (!saved || typeof saved !== 'object') saved = {};
    const point = navigation.project(finite(saved.x, world.spawn.x), finite(saved.y, world.spawn.y));
    const facing = ['north', 'south', 'east', 'west'].includes(saved.facing) ? saved.facing : 'east';
    return {
      x: mm(point.x) / 1000, y: mm(point.y) / 1000, tick: Math.max(0, Math.floor(finite(saved.tick, 0))), facing,
      heading: finite(saved.heading, { north: 0, east: Math.PI / 2, south: Math.PI, west: -Math.PI / 2 }[facing]),
      moving: false, paused: false, visitedIds: ids(saved.visitedIds), readSourceIds: ids(saved.readSourceIds),
      choiceIds: strings(saved.choiceIds), selectedTargetId: validIds.has(saved.selectedTargetId) ? saved.selectedTargetId : targets[0]?.id ?? null,
      nearbyTargetId: null, nearestTargetId: null, targetDistance: null, destination: null, waypoints: [],
    };
  }
  function setDestination(state, x, y) {
    if (![x, y].every(Number.isFinite)) return state;
    state.waypoints = navigation.route(state, { x, y });
    state.destination = state.waypoints.shift() ?? null;
    return state;
  }
  function refreshProximity(state) {
    let nearest = null, distance = Infinity;
    for (const target of targets) {
      const point = approachPoint(target), candidate = Math.hypot(point.x - state.x, point.y - state.y);
      if (candidate < distance) { nearest = target; distance = candidate; }
    }
    state.nearestTargetId = nearest?.id ?? null;
    state.nearbyTargetId = distance <= INTERACTION_RADIUS ? nearest.id : null;
    state.targetDistance = nearest ? Math.round(distance * 10) / 10 : null;
    return state;
  }
  function stepSimulation(state, input = {}) {
    if (state.paused) { state.moving = false; return state; }
    state.tick++;
    let dx = finite(input.x, 0), dy = finite(input.y, 0);
    if (Math.hypot(dx, dy) > 1e-6) { state.destination = null; state.waypoints = []; }
    else if (state.destination) {
      dx = state.destination.x - state.x; dy = state.destination.y - state.y;
      if (Math.hypot(dx, dy) <= STEP_MM / 1000) {
        const point = navigation.project(state.destination.x, state.destination.y);
        state.moving = point.x !== state.x || point.y !== state.y;
        state.x = mm(point.x) / 1000; state.y = mm(point.y) / 1000;
        state.destination = state.waypoints.shift() ?? null;
        return refreshProximity(state);
      }
    }
    const length = Math.hypot(dx, dy); state.moving = false;
    if (length > 1e-6) {
      const point = navigation.project((mm(state.x) + Math.round(dx / length * STEP_MM)) / 1000,
        (mm(state.y) + Math.round(dy / length * STEP_MM)) / 1000);
      state.moving = point.x !== state.x || point.y !== state.y;
      state.x = mm(point.x) / 1000; state.y = mm(point.y) / 1000;
      state.heading = Math.round(Math.atan2(dx, dy) * 1e6) / 1e6;
      state.facing = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'north' : 'south');
      if (!state.moving) { state.destination = null; state.waypoints = []; }
    }
    return refreshProximity(state);
  }
  return { createState, setDestination, refreshProximity, stepSimulation, snapshot, navigation };
}

export function snapshot(state) {
  return { ...state, visitedIds: [...state.visitedIds], readSourceIds: [...state.readSourceIds], choiceIds: { ...state.choiceIds },
    destination: state.destination ? { ...state.destination } : null, waypoints: state.waypoints.map(point => ({ ...point })) };
}
