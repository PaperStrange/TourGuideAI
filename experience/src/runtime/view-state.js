import { clampWalkPoint } from '../simulation/world.js';

export const CAMERA_LIMITS = Object.freeze({ azimuth: [-0.65, 0.65], polar: [0.66, 1.05], distance: [22, 48] });
export const CAMERA_DEFAULTS = Object.freeze({ azimuth: 0.22, polar: 0.88, distance: 24 });
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const round = value => Math.round(value * 1e6) / 1e6;

export function normalizeCameraPose(value) {
  if (!record(value) || !['azimuth', 'polar', 'distance'].every(key => finite(value[key]))) return null;
  // Facing belongs to the view, not to the pavement occupied by the traveller.
  const base = Math.cos(value.azimuth) < 0 ? Math.PI : 0;
  const relative = Math.atan2(Math.sin(value.azimuth - base), Math.cos(value.azimuth - base));
  const offset = value.targetOffset ?? { x: base ? -1.2 : 1.2, y: base ? 2.2 : -2.2, height: 0.9 };
  if (!record(offset) || !['x', 'y', 'height'].every(key => finite(offset[key]))) return null;
  return {
    azimuth: round(base + clamp(relative, ...CAMERA_LIMITS.azimuth)),
    polar: round(clamp(value.polar, ...CAMERA_LIMITS.polar)),
    distance: round(clamp(value.distance, ...CAMERA_LIMITS.distance)),
    targetOffset: { x: round(clamp(offset.x, -32, 32)), y: round(clamp(offset.y, -32, 32)), height: round(clamp(offset.height, 0.5, 20)) },
  };
}

// A view is a bounded, plain presentation value. It carries no journey history.
export function normalizePerspectiveView(value) {
  if (!record(value) || value.version !== 1 || !record(value.player) ||
      !finite(value.player.x) || !finite(value.player.y)) return null;
  const camera = normalizeCameraPose(value.camera);
  if (!camera) return null;
  const point = clampWalkPoint(value.player.x, value.player.y);
  return { version: 1, player: { x: Math.round(point.x * 1000) / 1000, y: Math.round(point.y * 1000) / 1000 }, camera };
}
