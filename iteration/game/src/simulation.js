import { WORLD, TARGETS, STEP_MM, INTERACTION_RADIUS, approachPoint, clampWalkPoint, initialPosition } from './scene-config.js';

const validIds = new Set(TARGETS.map((target) => target.id));
const ids = (values) => [...new Set(Array.isArray(values) ? values.filter((id) => validIds.has(id)) : [])];
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const mm = (value) => Math.round(value * 1000);

export function createState(saved = {}) {
  if (!saved || typeof saved !== 'object') saved = {};
  const start = initialPosition();
  const p = clampWalkPoint(finite(saved.x, start.x), finite(saved.y, start.y));
  return {
    x: mm(p.x) / 1000,
    y: mm(p.y) / 1000,
    tick: Math.max(0, Math.floor(finite(saved.tick, 0))),
    facing: ['north', 'south', 'east', 'west'].includes(saved.facing) ? saved.facing : 'east',
    moving: false,
    paused: false,
    visitedIds: ids(saved.visitedIds),
    readSourceIds: ids(saved.readSourceIds),
    choiceIds: Object.fromEntries(Object.entries(saved.choiceIds ?? {}).filter(([id, value]) => validIds.has(id) && typeof value === 'string')),
    selectedTargetId: validIds.has(saved.selectedTargetId) ? saved.selectedTargetId : (TARGETS[0]?.id ?? null),
    nearbyTargetId: null,
    nearestTargetId: null,
    targetDistance: null,
    destination: null,
    waypoints: [],
  };
}

export function setDestination(state, x, y) {
  const destination = clampWalkPoint(x, y);
  const crossesRoad = (state.y - WORLD.roadCenterY) * (destination.y - WORLD.roadCenterY) < 0;
  const crossing = WORLD.crossing;
  state.waypoints = crossesRoad && crossing ? [
    { x: crossing.x, y: state.y > WORLD.roadCenterY ? crossing.northY : crossing.southY },
    { x: crossing.x, y: destination.y > WORLD.roadCenterY ? crossing.northY : crossing.southY },
    destination,
  ] : [destination];
  state.destination = state.waypoints.shift();
}

export function refreshProximity(state) {
  let nearest = null;
  let distance = Infinity;
  for (const target of TARGETS) {
    const point = approachPoint(target);
    const d = Math.hypot(point.x - state.x, point.y - state.y);
    if (d < distance) { nearest = target; distance = d; }
  }
  state.nearestTargetId = nearest?.id ?? null;
  state.nearbyTargetId = distance <= INTERACTION_RADIUS ? nearest.id : null;
  state.targetDistance = nearest ? Math.round(distance * 10) / 10 : null;
  return state;
}

// Only this function advances simulation time. Millimetre rounding makes command
// replay independent of rendering cadence and prevents accumulated float drift.
export function stepSimulation(state, input = {}) {
  if (state.paused) { state.moving = false; return state; }
  state.tick += 1;
  let dx = Math.sign(input.x || 0), dy = Math.sign(input.y || 0);
  if (dx || dy) { state.destination = null; state.waypoints = []; }
  else if (state.destination) {
    dx = state.destination.x - state.x;
    dy = state.destination.y - state.y;
    if (Math.hypot(dx, dy) <= STEP_MM / 1000) {
      const p = clampWalkPoint(state.destination.x, state.destination.y);
      state.x = mm(p.x) / 1000;
      state.y = mm(p.y) / 1000;
      state.destination = state.waypoints.shift() ?? null;
      state.moving = false;
      return refreshProximity(state);
    }
  }
  const length = Math.hypot(dx, dy);
  state.moving = false;
  if (length > 0) {
    const next = clampWalkPoint(
      (mm(state.x) + Math.round(dx / length * STEP_MM)) / 1000,
      (mm(state.y) + Math.round(dy / length * STEP_MM)) / 1000,
    );
    state.moving = next.x !== state.x || next.y !== state.y;
    state.x = mm(next.x) / 1000;
    state.y = mm(next.y) / 1000;
    state.facing = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'north' : 'south');
    if (!state.moving) { state.destination = null; state.waypoints = []; }
  }
  return refreshProximity(state);
}

export function snapshot(state) {
  return {
    ...state,
    visitedIds: [...state.visitedIds],
    readSourceIds: [...state.readSourceIds],
    choiceIds: { ...state.choiceIds },
    destination: state.destination ? { ...state.destination } : null,
    waypoints: state.waypoints.map((point) => ({ ...point })),
  };
}
