import { PLAYER_RADIUS } from './world.js';

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function createNavigation(definition) {
  if (definition.kind === 'rect-crossing') {
    const { world } = definition;
    const bounds = {
      minX: world.bounds.minX + PLAYER_RADIUS, maxX: world.bounds.maxX - PLAYER_RADIUS,
      minY: Math.max(world.bounds.minY, world.southFacadeY) + PLAYER_RADIUS,
      maxY: Math.min(world.bounds.maxY, world.northFacadeY) - PLAYER_RADIUS,
    };
    const project = (x, y) => ({ x: clamp(x, bounds.minX, bounds.maxX), y: clamp(y, bounds.minY, bounds.maxY) });
    return {
      project, bounds,
      contains: (x, y) => x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY,
      route(from, to) {
        const destination = project(to.x, to.y), crossing = world.crossing;
        return crossing && (from.y - world.roadCenterY) * (destination.y - world.roadCenterY) < 0 ? [
          { x: crossing.x, y: from.y > world.roadCenterY ? crossing.northY : crossing.southY },
          { x: crossing.x, y: destination.y > world.roadCenterY ? crossing.northY : crossing.southY }, destination,
        ] : [destination];
      },
      snapshot: () => ({ kind: definition.kind, bounds: { ...bounds }, playerRadius: PLAYER_RADIUS }),
    };
  }
  if (definition.kind !== 'corridor' || !Array.isArray(definition.centerline) || definition.centerline.length < 2 ||
      !Number.isFinite(definition.width) || definition.width <= PLAYER_RADIUS * 2) throw new Error('Invalid navigation corridor');
  const points = definition.centerline.map(({ x, y }) => {
    if (![x, y].every(Number.isFinite)) throw new Error('Invalid corridor point');
    return { x, y };
  });
  // 有限线段的圆角包络构成可走范围；半径扣除角色净空，端点不会延伸成无限道路。
  const radius = definition.width / 2 - PLAYER_RADIUS;
  let total = 0;
  const segments = points.slice(1).map((b, index) => {
    const a = points[index], length = distance(a, b), start = total;
    if (length <= 0.001) throw new Error('Repeated corridor point');
    total += length;
    return { a, b, length, start };
  });
  const closest = (x, y) => {
    let best;
    for (const { a, b, length, start } of segments) {
      const t = clamp(((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / length ** 2, 0, 1);
      const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const d = Math.hypot(point.x - x, point.y - y);
      if (!best || d < best.distance) best = { ...point, distance: d, station: start + t * length };
    }
    return best;
  };
  const project = (x, y) => {
    const near = closest(x, y);
    if (near.distance <= radius) return { x, y };
    const scale = (radius - 0.001) / near.distance;
    return { x: near.x + (x - near.x) * scale, y: near.y + (y - near.y) * scale };
  };
  const bounds = { minX: Math.min(...points.map(p => p.x)) - radius, maxX: Math.max(...points.map(p => p.x)) + radius,
    minY: Math.min(...points.map(p => p.y)) - radius, maxY: Math.max(...points.map(p => p.y)) + radius };
  return {
    project, bounds,
    contains: (x, y) => Number.isFinite(x) && Number.isFinite(y) && closest(x, y).distance <= radius + 0.001,
    route(from, to) {
      const destination = project(to.x, to.y), start = closest(from.x, from.y), end = closest(destination.x, destination.y);
      const low = Math.min(start.station, end.station), high = Math.max(start.station, end.station);
      const vertices = segments.slice(1).filter(s => s.start > low && s.start < high).map(s => ({ ...s.a }));
      if (end.station < start.station) vertices.reverse();
      return [{ x: start.x, y: start.y }, ...vertices, { x: end.x, y: end.y }, destination]
        .filter((point, index, route) => distance(point, index ? route[index - 1] : from) > 0.001);
    },
    snapshot: () => ({ kind: definition.kind, bounds: { ...bounds }, centerline: points.map(p => ({ ...p })),
      width: definition.width, centerRadius: radius, playerRadius: PLAYER_RADIUS, length: total, widthKind: 'authored' }),
  };
}
