import { PLAYER_RADIUS } from './world.js';

const EPSILON = 0.001;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const separation = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.height - b.height);
const horizontalDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 200;

function position(value, label) {
  if (!value || ![value.x, value.y, value.height].every(Number.isFinite)) throw new TypeError(`Invalid ${label} position`);
  return { x: value.x, y: value.y, height: value.height };
}

function prepareGraph(definition) {
  if (!definition || definition.kind !== 'route-graph' || !Array.isArray(definition.nodes) ||
      !Array.isArray(definition.edges)) throw new TypeError('Expected a route-graph navigation definition');
  const playerRadius = definition.playerRadius ?? PLAYER_RADIUS;
  if (!Number.isFinite(playerRadius) || playerRadius <= 0) throw new TypeError('Invalid route player radius');
  const nodes = new Map(), edges = new Map(), connections = new Map();
  for (const input of definition.nodes) {
    if (!identifier(input.id) || nodes.has(input.id)) throw new TypeError('Route nodes require unique IDs');
    nodes.set(input.id, { id: input.id, ...position(input, 'node') });
    connections.set(input.id, []);
  }
  const edgeIds = new Set();
  for (const input of definition.edges) {
    if (!identifier(input.id) || edgeIds.has(input.id)) throw new TypeError('Route edges require unique IDs');
    edgeIds.add(input.id);
    if (!nodes.has(input.from) || !nodes.has(input.to) || input.from === input.to) throw new TypeError('Invalid route edge endpoints');
    if (!Number.isFinite(input.width) || input.width <= playerRadius * 2) throw new TypeError('Route width must exceed player clearance');
    if (!Array.isArray(input.points) || input.points.length < 2) throw new TypeError('Route edges require a centerline');
    if (input.bidirectional !== undefined && typeof input.bidirectional !== 'boolean') throw new TypeError('Invalid route edge direction');
    for (const field of ['accessible', 'reviewed']) {
      if (input[field] !== undefined && typeof input[field] !== 'boolean') throw new TypeError(`Invalid route edge ${field} decision`);
    }
    const points = input.points.map(point => position(point, 'edge'));
    if (separation(points[0], nodes.get(input.from)) > EPSILON ||
        separation(points.at(-1), nodes.get(input.to)) > EPSILON) throw new TypeError('Route centerline must meet its endpoint nodes');
    let length = 0;
    const segments = points.slice(1).map((b, index) => {
      const a = points[index], horizontal = horizontalDistance(a, b), segmentLength = separation(a, b);
      if (horizontal <= EPSILON) throw new TypeError('Route centerlines require distinct horizontal positions');
      const segment = { a, b, start: length, length: segmentLength, horizontal };
      length += segmentLength;
      return segment;
    });
    if (input.accessible === false || input.reviewed === false) continue;
    const edge = { id: input.id, from: input.from, to: input.to, width: input.width,
      radius: input.width / 2 - playerRadius, bidirectional: input.bidirectional !== false, points, segments, length };
    edges.set(edge.id, edge);
    connections.get(edge.from).push(edge);
    connections.get(edge.to).push(edge);
  }
  if (!nodes.size || !edges.size) throw new TypeError('Route navigation requires usable nodes and edges');
  for (const incident of connections.values()) incident.sort((a, b) => a.id.localeCompare(b.id));
  const allPoints = [...edges.values()].flatMap(edge => edge.points.map(point => ({ ...point, radius: edge.radius })));
  const bounds = {
    minX: Math.min(...allPoints.map(point => point.x - point.radius)),
    maxX: Math.max(...allPoints.map(point => point.x + point.radius)),
    minY: Math.min(...allPoints.map(point => point.y - point.radius)),
    maxY: Math.max(...allPoints.map(point => point.y + point.radius)),
  };
  return { nodes, edges, connections, playerRadius, bounds };
}

function centerAt(edge, station) {
  const edgeDistance = clamp(station, 0, edge.length);
  const segment = edge.segments.find(candidate => candidate.start + candidate.length >= edgeDistance - 1e-9) ?? edge.segments.at(-1);
  const t = clamp((edgeDistance - segment.start) / segment.length, 0, 1);
  return { x: segment.a.x + (segment.b.x - segment.a.x) * t,
    y: segment.a.y + (segment.b.y - segment.a.y) * t,
    height: segment.a.height + (segment.b.height - segment.a.height) * t, edgeId: edge.id, edgeDistance };
}

function closestOnEdge(edge, x, y, low = 0, high = edge.length) {
  let best = null;
  for (const segment of edge.segments) {
    if (segment.start > high || segment.start + segment.length < low) continue;
    const minT = clamp((low - segment.start) / segment.length, 0, 1);
    const maxT = clamp((high - segment.start) / segment.length, 0, 1);
    const t = clamp(((x - segment.a.x) * (segment.b.x - segment.a.x) +
      (y - segment.a.y) * (segment.b.y - segment.a.y)) / segment.horizontal ** 2, minT, maxT);
    const point = centerAt(edge, segment.start + t * segment.length), distance = Math.hypot(x - point.x, y - point.y);
    if (!best || distance < best.distance - 1e-9) best = { ...point, distance };
  }
  return best;
}

function boundedPoint(edge, near, x, y) {
  const scale = near.distance > edge.radius ? Math.max(0, edge.radius - EPSILON) / near.distance : 1;
  return { x: near.x + (x - near.x) * scale, y: near.y + (y - near.y) * scale,
    height: near.height, edgeId: edge.id, edgeDistance: near.edgeDistance };
}

function edgeSection(edge, start, end) {
  const low = Math.min(start, end), high = Math.max(start, end);
  const middle = edge.segments.slice(1).map(segment => segment.start)
    .filter(station => station > low + 1e-9 && station < high - 1e-9);
  if (end < start) middle.reverse();
  return [centerAt(edge, start), ...middle.map(station => centerAt(edge, station)), centerAt(edge, end)];
}

function compactPoints(points) {
  return points.filter((point, index) => !index || separation(point, points[index - 1]) > 1e-9 ||
    point.edgeId !== points[index - 1].edgeId);
}

export function validateRouteGraph(definition) {
  const graph = prepareGraph(definition);
  return { nodeCount: graph.nodes.size, edgeCount: graph.edges.size, bounds: { ...graph.bounds },
    lengthMeters: [...graph.edges.values()].reduce((length, edge) => length + edge.length, 0) };
}

export function createRouteNavigation(definition) {
  const { nodes, edges, connections, playerRadius, bounds } = prepareGraph(definition);

  function locate(input) {
    if (!input || typeof input !== 'object') throw new TypeError('Expected a route location');
    if (input.nodeId !== undefined) {
      const node = nodes.get(input.nodeId);
      if (!node || !connections.get(node.id).length) throw new RangeError('Unknown or unavailable route node');
      const edge = connections.get(node.id)[0];
      return { ...node, edgeId: edge.id, edgeDistance: edge.from === node.id ? 0 : edge.length };
    }
    if (![input.x, input.y].every(Number.isFinite)) throw new TypeError('Invalid route coordinates');
    if (input.edgeId !== undefined && !edges.has(input.edgeId)) throw new RangeError('Unknown or unavailable route edge');
    if (input.edgeDistance !== undefined && !Number.isFinite(input.edgeDistance)) throw new TypeError('Invalid route station');
    const candidates = input.edgeId === undefined ? [...edges.values()] : [edges.get(input.edgeId)];
    let best;
    for (const edge of candidates) {
      const low = Number.isFinite(input.edgeDistance) ? Math.max(0, input.edgeDistance - edge.radius - 1) : 0;
      const high = Number.isFinite(input.edgeDistance) ? Math.min(edge.length, input.edgeDistance + edge.radius + 1) : edge.length;
      if (low > high) throw new RangeError('Route station is outside its edge');
      const near = closestOnEdge(edge, input.x, input.y, low, high);
      if (!best || near.distance < best.near.distance - 1e-9) best = { edge, near };
    }
    return boundedPoint(best.edge, best.near, input.x, input.y);
  }

  function project(x, y, from) {
    if (!from) return locate({ x, y });
    if (![x, y, from.x, from.y].every(Number.isFinite)) throw new TypeError('Invalid route movement coordinates');
    const requestedDistance = Math.hypot(x - from.x, y - from.y);
    if (requestedDistance > 1 + EPSILON) throw new RangeError('Route movement projection requires a step of at most one meter');
    const current = locate(from), currentEdge = edges.get(current.edgeId);
    if (!currentEdge.bidirectional && closestOnEdge(currentEdge, x, y).edgeDistance < current.edgeDistance - EPSILON) return current;
    const intervals = [{ edge: currentEdge,
      low: Math.max(0, current.edgeDistance - (currentEdge.bidirectional ? requestedDistance + currentEdge.radius * 2 : 0)),
      high: Math.min(currentEdge.length, current.edgeDistance + requestedDistance + currentEdge.radius * 2) }];
    // 路口转向只经过当前边的共用节点，平行街道和立交不会因距离接近而连接。
    for (const nodeId of [currentEdge.from, currentEdge.to]) {
      if (!currentEdge.bidirectional && nodeId === currentEdge.from) continue;
      const node = nodes.get(nodeId);
      const remaining = nodeId === currentEdge.from ? current.edgeDistance : currentEdge.length - current.edgeDistance;
      if (remaining > currentEdge.radius + requestedDistance ||
          separation(current, node) > currentEdge.radius + requestedDistance + EPSILON) continue;
      for (const edge of connections.get(nodeId)) {
        if (edge.id === currentEdge.id || (!edge.bidirectional && edge.to === nodeId)) continue;
        const reach = requestedDistance + Math.min(currentEdge.radius, edge.radius) * 2;
        intervals.push({ edge, low: edge.from === nodeId ? 0 : Math.max(0, edge.length - reach),
          high: edge.from === nodeId ? Math.min(edge.length, reach) : edge.length });
      }
    }
    let best;
    for (const { edge, low, high } of intervals) {
      const near = closestOnEdge(edge, x, y, low, high);
      const point = boundedPoint(edge, near, x, y), distance = Math.hypot(point.x - x, point.y - y);
      if (!best || distance < best.distance - 1e-9 ||
          (Math.abs(distance - best.distance) <= 1e-9 && near.distance < best.nearDistance - 1e-9)) {
        best = { point, distance, nearDistance: near.distance };
      }
    }
    return best.point;
  }

  function endpoints(input, start) {
    if (input.nodeId !== undefined) {
      const point = locate(input);
      return { point, candidates: [{ nodeId: input.nodeId, cost: 0, points: [point], edgeIds: [] }] };
    }
    const point = locate(input), edge = edges.get(point.edgeId), center = centerAt(edge, point.edgeDistance);
    const lateral = separation(point, center), candidates = [];
    const add = (nodeId, station) => {
      const section = start ? edgeSection(edge, point.edgeDistance, station) : edgeSection(edge, station, point.edgeDistance);
      candidates.push({ nodeId, cost: Math.abs(station - point.edgeDistance) + lateral,
        points: start ? [point, ...section] : [...section, point], edgeIds: [edge.id] });
    };
    if (!start || edge.bidirectional) add(edge.from, 0);
    if (start || edge.bidirectional) add(edge.to, edge.length);
    return { point, edge, candidates };
  }

  function path(from, to) {
    for (const input of [from, to]) {
      if (input?.nodeId !== undefined && nodes.has(input.nodeId) && !connections.get(input.nodeId).length) return null;
    }
    const start = endpoints(from, true), end = endpoints(to, false);
    if (start.point.edgeId === end.point.edgeId && separation(start.point, end.point) <= 1e-9) {
      return { points: [start.point], edgeIds: [], distanceMeters: 0 };
    }
    let best = null;
    if (start.edge && end.edge && start.edge.id === end.edge.id &&
        (start.edge.bidirectional || end.point.edgeDistance >= start.point.edgeDistance)) {
      const section = edgeSection(start.edge, start.point.edgeDistance, end.point.edgeDistance);
      best = { points: compactPoints([start.point, ...section, end.point]), edgeIds: [start.edge.id],
        distanceMeters: separation(start.point, section[0]) + Math.abs(end.point.edgeDistance - start.point.edgeDistance) +
          separation(section.at(-1), end.point) };
    }
    const distances = new Map(), previous = new Map(), origins = new Map(), pending = new Set();
    for (const candidate of start.candidates) {
      if (!distances.has(candidate.nodeId) || candidate.cost < distances.get(candidate.nodeId)) {
        distances.set(candidate.nodeId, candidate.cost); origins.set(candidate.nodeId, candidate); pending.add(candidate.nodeId);
      }
    }
    while (pending.size) {
      const nodeId = [...pending].sort((a, b) => distances.get(a) - distances.get(b) || a.localeCompare(b))[0];
      pending.delete(nodeId);
      for (const edge of connections.get(nodeId)) {
        if (!edge.bidirectional && edge.to === nodeId) continue;
        const next = edge.from === nodeId ? edge.to : edge.from, cost = distances.get(nodeId) + edge.length;
        if (distances.has(next) && cost >= distances.get(next) - 1e-9) continue;
        distances.set(next, cost); previous.set(next, { nodeId, edge }); origins.set(next, origins.get(nodeId)); pending.add(next);
      }
    }
    for (const candidate of end.candidates) {
      const distanceMeters = distances.get(candidate.nodeId) + candidate.cost;
      if (!Number.isFinite(distanceMeters) || (best && distanceMeters >= best.distanceMeters - 1e-9)) continue;
      const traversals = [];
      let cursor = candidate.nodeId;
      while (previous.has(cursor)) {
        const { nodeId, edge } = previous.get(cursor);
        traversals.unshift({ edge, forward: edge.from === nodeId }); cursor = nodeId;
      }
      const origin = origins.get(candidate.nodeId);
      const middle = traversals.flatMap(({ edge, forward }) => edgeSection(edge, forward ? 0 : edge.length, forward ? edge.length : 0));
      const edgeIds = [...origin.edgeIds, ...traversals.map(({ edge }) => edge.id), ...candidate.edgeIds]
        .filter((id, index, ids) => !index || id !== ids[index - 1]);
      best = { points: compactPoints([...origin.points, ...middle, ...candidate.points]), edgeIds, distanceMeters };
    }
    return best;
  }

  return {
    bounds, locate, project, path,
    contains(x, y, edgeId) {
      if (![x, y].every(Number.isFinite)) return false;
      if (edgeId !== undefined && !edges.has(edgeId)) return false;
      const candidates = edgeId === undefined ? edges.values() : [edges.get(edgeId)];
      for (const edge of candidates) if (closestOnEdge(edge, x, y).distance <= edge.radius + EPSILON) return true;
      return false;
    },
    route(from, to) {
      const result = path(from, to);
      return result ? result.points.filter((point, index) => horizontalDistance(point, index ? result.points[index - 1] : from) > EPSILON) : [];
    },
    snapshot: () => ({ kind: 'route-graph', bounds: { ...bounds }, playerRadius,
      nodes: [...nodes.values()].map(node => ({ ...node })),
      edges: [...edges.values()].map(edge => ({ id: edge.id, from: edge.from, to: edge.to, width: edge.width,
        bidirectional: edge.bidirectional, length: edge.length, points: edge.points.map(point => ({ ...point })) })) }),
  };
}
