import { clampWalkPoint } from '../simulation/world.js';
import { normalizePerspectiveView } from './view-state.js';

export const EXPLORATION_CAMERA_LIMITS = Object.freeze({ polar: [0.55, 1.2], distance: [10, 48] });
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const round = value => Math.round(value * 1e6) / 1e6;

export function normalizeExplorationCamera(value) {
  if (!record(value) || !['azimuth', 'polar', 'distance'].every(key => finite(value[key]))) return null;
  const azimuth = Math.atan2(Math.sin(value.azimuth), Math.cos(value.azimuth));
  const south = Math.cos(azimuth) < 0;
  const offset = value.targetOffset ?? { x: south ? -1.2 : 1.2, y: south ? 2.2 : -2.2, height: 0.9 };
  if (!record(offset) || !['x', 'y', 'height'].every(key => finite(offset[key]))) return null;
  return {
    azimuth: round(azimuth),
    polar: round(clamp(value.polar, ...EXPLORATION_CAMERA_LIMITS.polar)),
    distance: round(clamp(value.distance, ...EXPLORATION_CAMERA_LIMITS.distance)),
    targetOffset: { x: round(clamp(offset.x, -32, 32)), y: round(clamp(offset.y, -32, 32)),
      height: round(clamp(offset.height, 0.5, 20)) },
  };
}

// 新的个人视角保留完整方向；旧分享数据继续由原有 version 1 校验器处理。
export function normalizeExplorationView(value) {
  if (!record(value)) return null;
  if (value.version === 1) {
    const previous = normalizePerspectiveView(value);
    return previous ? { version: 2, player: previous.player,
      camera: normalizeExplorationCamera(previous.camera) } : null;
  }
  if (value.version !== 2 || !record(value.player) ||
      !finite(value.player.x) || !finite(value.player.y)) return null;
  const camera = normalizeExplorationCamera(value.camera);
  if (!camera) return null;
  const point = clampWalkPoint(value.player.x, value.player.y);
  return { version: 2, player: { x: Math.round(point.x * 1000) / 1000,
    y: Math.round(point.y * 1000) / 1000 }, camera };
}
