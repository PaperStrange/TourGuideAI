import { WORLD, TARGETS } from './content.js';

export { WORLD, TARGETS };
export const TICK_MS = 1000 / 60;
export const STEP_MM = 76;
export const INTERACTION_RADIUS = 1.65;
export const PROJECTION_Y = 1 / 3;
export const PLAYER_RADIUS = 0.32;

// Geographic coordinates remain in metres; projection affects presentation only.
export function project(x, y, h = 0, camera, width, height) {
  return {
    x: width / 2 + (x - camera.x) * camera.scale,
    y: height / 2 - (y - camera.y + h) * camera.scale * PROJECTION_Y,
  };
}

export function unproject(x, y, camera, width, height) {
  return {
    x: camera.x + (x - width / 2) / camera.scale,
    y: camera.y - (y - height / 2) / (camera.scale * PROJECTION_Y),
  };
}

export function approachPoint(target) {
  return { x: target.approachX ?? target.x, y: target.approachY ?? target.y };
}

export function walkBounds() {
  return {
    minX: WORLD.bounds.minX + PLAYER_RADIUS,
    maxX: WORLD.bounds.maxX - PLAYER_RADIUS,
    minY: Math.max(WORLD.bounds.minY, WORLD.southFacadeY) + PLAYER_RADIUS,
    maxY: Math.min(WORLD.bounds.maxY, WORLD.northFacadeY) - PLAYER_RADIUS,
  };
}

export function clampWalkPoint(x, y) {
  const b = walkBounds();
  return { x: Math.min(b.maxX, Math.max(b.minX, x)), y: Math.min(b.maxY, Math.max(b.minY, y)) };
}

export function initialPosition() {
  const spawn = WORLD.spawn ?? { x: 8, y: WORLD.northFacadeY - 2.1 };
  return clampWalkPoint(spawn.x, spawn.y);
}
