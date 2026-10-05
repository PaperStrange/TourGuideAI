import { WORLD, TARGETS } from '../content/kyoto.js';

export { WORLD, TARGETS };
export const TICK_MS = 1000 / 60;
export const STEP_MM = 76;
export const PLAYER_RADIUS = 0.32;
export const INTERACTION_RADIUS = 1.65;

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
  const bounds = walkBounds();
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, y)),
  };
}

export function initialPosition() {
  return clampWalkPoint(WORLD.spawn.x, WORLD.spawn.y);
}

// Camera azimuth is measured around Three's +Y axis from +Z. In world space,
// north is +y (Three -Z), so forward at positive yaw turns toward world west.
export function cameraRelativeInput(right, forward, yaw) {
  const angle = Number.isFinite(yaw) ? yaw : 0;
  const x = right * Math.cos(angle) - forward * Math.sin(angle);
  const y = right * Math.sin(angle) + forward * Math.cos(angle);
  return { x: Math.round(x * 1e6) / 1e6, y: Math.round(y * 1e6) / 1e6 };
}
