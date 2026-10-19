import { normalizePerspectiveView } from './view-state.js';
import { getPack, DEFAULT_PACK_ID } from '../packs/registry.js';
import { createNavigation } from '../simulation/navigation.js';

export const EXPLORATION_CAMERA_LIMITS = Object.freeze({ polar: [0.55, 1.2], distance: [10, 48] });
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const round = value => Math.round(value * 1e6) / 1e6;
const navigationByPack = new Map();

export function normalizeExplorationCamera(value, limits = { ...EXPLORATION_CAMERA_LIMITS, targetXY: 32, targetHeight: [0.5, 20] }) {
  if (!record(value) || !['azimuth', 'polar', 'distance'].every(key => finite(value[key]))) return null;
  const azimuth = Math.atan2(Math.sin(value.azimuth), Math.cos(value.azimuth));
  const south = Math.cos(azimuth) < 0;
  const offset = value.targetOffset ?? { x: south ? -1.2 : 1.2, y: south ? 2.2 : -2.2, height: 0.9 };
  if (!record(offset) || !['x', 'y', 'height'].every(key => finite(offset[key]))) return null;
  return {
    azimuth: round(azimuth),
    polar: round(clamp(value.polar, ...limits.polar)),
    distance: round(clamp(value.distance, ...limits.distance)),
    targetOffset: { x: round(clamp(offset.x, -limits.targetXY, limits.targetXY)), y: round(clamp(offset.y, -limits.targetXY, limits.targetXY)),
      height: round(clamp(offset.height, ...limits.targetHeight)) },
  };
}

// 新的个人视角保留完整方向；旧分享数据继续由原有 version 1 校验器处理。
export function normalizeExplorationView(value, packId = DEFAULT_PACK_ID) {
  const pack = getPack(packId);
  if (!pack || !record(value)) return null;
  const legacy = value.version === 1 || value.version === 2;
  if (legacy && (pack.id !== DEFAULT_PACK_ID || value.packId !== undefined || value.revision !== undefined)) return null;
  if (!legacy && (value.version !== 3 || value.packId !== pack.id || value.revision !== pack.revision)) return null;
  if (value.version === 1) {
    const previous = normalizePerspectiveView(value);
    return previous ? normalizeExplorationView({ ...previous, version: 2 }, packId) : null;
  }
  if (!record(value.player) ||
      !finite(value.player.x) || !finite(value.player.y)) return null;
  const camera = normalizeExplorationCamera(value.camera, pack.camera.limits);
  if (!camera) return null;
  if (!navigationByPack.has(pack.id)) navigationByPack.set(pack.id, createNavigation(pack.navigation));
  const point = navigationByPack.get(pack.id).project(value.player.x, value.player.y);
  return { version: 3, packId: pack.id, revision: pack.revision, player: { x: Math.round(point.x * 1000) / 1000,
    y: Math.round(point.y * 1000) / 1000 }, camera };
}
