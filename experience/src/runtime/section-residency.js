export const STREAM_LIMITS = Object.freeze({ downloads: 2, attachments: 1, baseCells: 9, nearCells: 3,
  residentBytes: 64 * 1024 * 1024, prefetchDistance: 180, retainDistance: 230 });

export function distanceToCell(point, bounds) {
  return Math.hypot(Math.max(bounds.minX - point.x, 0, point.x - bounds.maxX),
    Math.max(bounds.minY - point.y, 0, point.y - bounds.maxY));
}

export function cellsAtPoint(cells, point) {
  return cells.filter(cell => distanceToCell(point, cell.bounds) <= 0.001);
}

export function validateRouteCellCoverage(cells, navigation) {
  for (const edge of navigation.edges) {
    if (edge.accessible === false || edge.reviewed === false) continue;
    const radius = edge.width / 2 - (navigation.playerRadius ?? PLAYER_RADIUS);
    for (let index = 1; index < edge.points.length; index++) {
      const a = edge.points[index - 1], b = edge.points[index], length = Math.hypot(b.x - a.x, b.y - a.y);
      const steps = Math.ceil(length);
      for (let step = 0; step <= steps; step++) for (const side of [-1, 0, 1]) {
        const point = { x: a.x + (b.x - a.x) * step / steps - (b.y - a.y) / length * radius * side,
          y: a.y + (b.y - a.y) * step / steps + (b.x - a.x) / length * radius * side };
        if (!cellsAtPoint(cells, point).length) throw new Error('Neighborhood cells do not cover reviewed edge ' + edge.id);
      }
    }
  }
  return true;
}

// 角色所在区块始终优先；预取依据行走方向，观察中的表面保持驻留。
export function selectSections(cells, player, { tier = 'desktop', pinnedIds = [], residentIds = [], limits = STREAM_LIMITS } = {}) {
  const required = new Set(cellsAtPoint(cells, player).map(cell => cell.id));
  const pinned = new Set(pinnedIds), resident = new Set(residentIds);
  const direction = player.destination
    ? { x: player.destination.x - player.x, y: player.destination.y - player.y }
    : { x: Math.sin(player.heading ?? 0), y: Math.cos(player.heading ?? 0) };
  const length = Math.hypot(direction.x, direction.y) || 1;
  const ranked = cells.map(cell => {
    const distance = distanceToCell(player, cell.bounds);
    const dx = (cell.bounds.minX + cell.bounds.maxX) / 2 - player.x;
    const dy = (cell.bounds.minY + cell.bounds.maxY) / 2 - player.y;
    const ahead = (dx * direction.x + dy * direction.y) / length;
    return { cell, distance, score: distance - Math.min(60, Math.max(0, ahead)) * 0.3 };
  }).filter(({ cell, distance }) => required.has(cell.id) || pinned.has(cell.id) ||
    distance <= limits.prefetchDistance || resident.has(cell.id) && distance <= limits.retainDistance)
    .sort((a, b) => Number(required.has(b.cell.id)) - Number(required.has(a.cell.id)) ||
      Number(pinned.has(b.cell.id)) - Number(pinned.has(a.cell.id)) || a.score - b.score || a.cell.id.localeCompare(b.cell.id));
  const selected = ranked.slice(0, Math.max(limits.baseCells, required.size + pinned.size));
  const nearCount = tier === 'compact' ? 1 : limits.nearCells;
  const near = new Set(selected.filter(({ cell }) => cell.near && pinned.has(cell.id)).map(({ cell }) => cell.id));
  for (const { cell } of selected) if (cell.near && near.size < nearCount) near.add(cell.id);
  return selected.map(({ cell, distance }) => ({ id: cell.id, required: required.has(cell.id),
    level: cell.near && near.has(cell.id) ? 'near' : 'base', distance }));
}

export function validateSectionManifest(value, pack) {
  if (value?.version !== 1 || value.id !== pack.id || value.revision !== pack.revision ||
      !Array.isArray(value.cells) || !value.cells.length || !value.ground || !value.lighting) {
    throw new Error('Neighborhood manifest identity or resident assets are invalid');
  }
  const checkAsset = asset => {
    if (!asset || typeof asset.file !== 'string' || !asset.file || asset.file.startsWith('/') ||
        asset.file.includes('..') || /[?#:]/.test(asset.file) || !/^[a-f0-9]{64}$/.test(asset.sha256) ||
        !Number.isSafeInteger(asset.bytes) || asset.bytes <= 0) throw new Error('Invalid neighborhood asset');
    for (const dependency of asset.dependencies ?? []) checkAsset(dependency);
  };
  checkAsset(value.ground); checkAsset(value.lighting);
  if (value.context) checkAsset(value.context);
  if (pack.frame && (!value.frame || value.frame.origin?.longitude !== pack.frame.origin.longitude ||
      value.frame.origin?.latitude !== pack.frame.origin.latitude ||
      value.frame.metresPerDegreeLon !== pack.frame.metresPerDegreeLon ||
      value.frame.metresPerDegreeLat !== pack.frame.metresPerDegreeLat)) throw new Error('Neighborhood coordinate frame mismatch');
  const ids = new Set();
  for (const cell of value.cells) {
    const bounds = cell.bounds;
    if (typeof cell.id !== 'string' || ids.has(cell.id) || !bounds ||
        !['minX', 'minY', 'maxX', 'maxY'].every(key => Number.isFinite(bounds[key])) ||
        bounds.minX >= bounds.maxX || bounds.minY >= bounds.maxY) throw new Error('Invalid neighborhood cell');
    ids.add(cell.id); checkAsset(cell.base); if (cell.near) checkAsset(cell.near);
  }
  if (pack.navigation?.kind === 'route-graph') validateRouteCellCoverage(value.cells, pack.navigation);
  return value;
}
import { PLAYER_RADIUS } from '../simulation/world.js';

