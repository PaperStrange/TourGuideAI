import { TARGETS, STEP_MM, INTERACTION_RADIUS, WORLD,
  approachPoint, clampWalkPoint, initialPosition } from './world.js';
export { cameraRelativeInput } from './world.js';

const validIds = new Set(TARGETS.map(({ id }) => id));
const ids = values => [...new Set(Array.isArray(values) ? values.filter(id => validIds.has(id)) : [])];
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const mm = value => Math.round(value * 1000);
const validStrings = values => Object.fromEntries(Object.entries(values && typeof values === 'object' ? values : {})
  .filter(([id, value]) => validIds.has(id) && typeof value === 'string'));

export function createState(saved = {}) {
  if (!saved || typeof saved !== 'object') saved = {};
  const start = initialPosition();
  const position = clampWalkPoint(finite(saved.x, start.x), finite(saved.y, start.y));
  const facing = ['north', 'south', 'east', 'west'].includes(saved.facing) ? saved.facing : 'east';
  return {
    x: mm(position.x) / 1000, y: mm(position.y) / 1000,
    tick: Math.max(0, Math.floor(finite(saved.tick, 0))),
    facing,
    heading: finite(saved.heading, { north: 0, east: Math.PI / 2, south: Math.PI, west: -Math.PI / 2 }[facing]),
    moving: false, paused: false,
    visitedIds: ids(saved.visitedIds), readSourceIds: ids(saved.readSourceIds),
    choiceIds: validStrings(saved.choiceIds),
    selectedTargetId: validIds.has(saved.selectedTargetId) ? saved.selectedTargetId : TARGETS[0]?.id ?? null,
    nearbyTargetId: null, nearestTargetId: null, targetDistance: null,
    destination: null, waypoints: [],
  };
}

export function setDestination(state, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return state;
  const destination = clampWalkPoint(x, y);
  const crossing = WORLD.crossing;
  const crossesRoad = (state.y - WORLD.roadCenterY) * (destination.y - WORLD.roadCenterY) < 0;
  state.waypoints = crossesRoad && crossing ? [
    { x: crossing.x, y: state.y > WORLD.roadCenterY ? crossing.northY : crossing.southY },
    { x: crossing.x, y: destination.y > WORLD.roadCenterY ? crossing.northY : crossing.southY },
    destination,
  ] : [destination];
  state.destination = state.waypoints.shift();
  return state;
}

export function refreshProximity(state) {
  let nearest = null, distance = Infinity;
  for (const target of TARGETS) {
    const point = approachPoint(target);
    const candidate = Math.hypot(point.x - state.x, point.y - state.y);
    if (candidate < distance) { nearest = target; distance = candidate; }
  }
  state.nearestTargetId = nearest?.id ?? null;
  state.nearbyTargetId = distance <= INTERACTION_RADIUS ? nearest.id : null;
  state.targetDistance = nearest ? Math.round(distance * 10) / 10 : null;
  return state;
}

// Replay records world-space vectors per fixed tick, after camera transformation.
// Millimetre steps retain intermediate angles; Math.sign would collapse every
// rotated input to one of eight directions and break camera-relative walking.
export function stepSimulation(state, input = {}) {
  if (state.paused) { state.moving = false; return state; }
  state.tick++;
  let dx = finite(input.x, 0), dy = finite(input.y, 0);
  if (Math.hypot(dx, dy) > 1e-6) { state.destination = null; state.waypoints = []; }
  else if (state.destination) {
    dx = state.destination.x - state.x;
    dy = state.destination.y - state.y;
    if (Math.hypot(dx, dy) <= STEP_MM / 1000) {
      const point = clampWalkPoint(state.destination.x, state.destination.y);
      state.moving = point.x !== state.x || point.y !== state.y;
      state.x = mm(point.x) / 1000; state.y = mm(point.y) / 1000;
      state.destination = state.waypoints.shift() ?? null;
      return refreshProximity(state);
    }
  }
  const length = Math.hypot(dx, dy);
  state.moving = false;
  if (length > 1e-6) {
    const point = clampWalkPoint((mm(state.x) + Math.round(dx / length * STEP_MM)) / 1000,
      (mm(state.y) + Math.round(dy / length * STEP_MM)) / 1000);
    state.moving = point.x !== state.x || point.y !== state.y;
    state.x = mm(point.x) / 1000; state.y = mm(point.y) / 1000;
    state.heading = Math.round(Math.atan2(dx, dy) * 1e6) / 1e6;
    state.facing = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'north' : 'south');
    if (!state.moving) { state.destination = null; state.waypoints = []; }
  }
  return refreshProximity(state);
}

export function snapshot(state) {
  return { ...state, visitedIds: [...state.visitedIds], readSourceIds: [...state.readSourceIds],
    choiceIds: { ...state.choiceIds },
    destination: state.destination ? { ...state.destination } : null,
    waypoints: state.waypoints.map(point => ({ ...point })) };
}
