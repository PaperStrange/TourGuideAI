import { createRouteNavigation } from '../simulation/route-navigation.js';
import { MAX_JOURNEY_SIGHTS } from './session.js';

export const JOURNEY_INTEREST_LABELS = Object.freeze({
  architecture: { en: 'Architecture', zh: '建筑' },
  history: { en: 'History', zh: '历史' },
  heritage: { en: 'Heritage', zh: '历史遗产' },
  culture: { en: 'Culture', zh: '文化' },
  food: { en: 'Food', zh: '饮食' },
  shopping: { en: 'Shops and markets', zh: '商店与市场' },
  street: { en: 'Street scenes', zh: '街头景致' },
  outdoors: { en: 'Open spaces', zh: '户外空间' },
  water: { en: 'Waterfronts', zh: '水岸' },
  nature: { en: 'Nature', zh: '自然' },
});

export const MIN_VARIANT_EDGE_CHANGE = 0.1;

const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 160 && /^[a-zA-Z0-9:_.-]+$/.test(value);
const bilingual = value => value && ['en', 'zh'].every(locale => typeof value[locale] === 'string' && value[locale].trim());
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const signature = ids => [...ids].sort(compare).join('|');

function required(condition, message) {
  if (!condition) throw new TypeError(message);
}

function uniqueIds(value, maximum, label) {
  required(Array.isArray(value) && value.length <= maximum && value.every(identifier)
    && new Set(value).size === value.length, `Invalid ${label}`);
  return [...value];
}

function sourceURL(value) {
  if (typeof value !== 'string' || !URL.canParse(value)) return false;
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
}

function validateSight(value, nodeIds) {
  required(value && identifier(value.id) && nodeIds.has(value.nodeId), 'A sight requires its reviewed graph node');
  required(bilingual(value.title) && bilingual(value.reason), 'A sight requires English and Chinese names and source-bound reasons');
  required(identifier(value.category) && typeof value.source === 'string' && value.source.trim()
    && sourceURL(value.url), 'A sight requires category and source attribution');
  required(Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90
    && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180, 'Invalid sight coordinates');
  uniqueIds(value.interests, 12, 'sight interests');
  required(Array.isArray(value.sources) && value.sources.length > 0
    && value.sources.every(source => source && sourceURL(source.url)), 'A recommendation reason requires source links');
  return structuredClone(value);
}

function compact(points) {
  return points.filter((point, index) => !index || ['x', 'y', 'height', 'edgeId'].some(key => point[key] !== points[index - 1][key]));
}

export function createJourneyPlanner({ routeId, revision, graph, sights, startNodeId, interestLabels = JOURNEY_INTEREST_LABELS }) {
  required(identifier(routeId) && Number.isSafeInteger(revision) && revision > 0 && identifier(startNodeId), 'Invalid neighborhood identity');
  required(Array.isArray(sights) && sights.length > 0 && sights.length <= MAX_JOURNEY_SIGHTS, 'A neighborhood supports up to eight distinct sights');
  const navigation = createRouteNavigation(graph), snapshot = navigation.snapshot();
  const edgeLengths = new Map(snapshot.edges.map(edge => [edge.id, edge.length]));
  const nodeIds = new Set(snapshot.nodes.map(node => node.id));
  const activeNodes = new Set(snapshot.edges.flatMap(edge => [edge.from, edge.to]));
  required(activeNodes.has(startNodeId), 'The neighborhood start has no reviewed walking edge');
  const catalog = sights.map(sight => validateSight(sight, nodeIds)).sort((a, b) => compare(a.id, b.id));
  required(new Set(catalog.map(sight => sight.id)).size === catalog.length, 'Sight IDs must be distinct');
  const byId = new Map(catalog.map(sight => [sight.id, sight]));
  const interestIds = [...new Set(catalog.flatMap(sight => sight.interests))].sort(compare);
  required(interestIds.every(id => bilingual(interestLabels[id])), 'Neighborhood interests require English and Chinese labels');
  const labels = Object.fromEntries(interestIds.map(id => [id, structuredClone(interestLabels[id])]));
  const paths = new Map();
  function path(from, to) {
    const key = JSON.stringify([from, to]);
    if (!paths.has(key)) paths.set(key, activeNodes.has(from) && activeNodes.has(to)
      ? navigation.path({ nodeId: from }, { nodeId: to }) : null);
    return paths.get(key);
  }
  const available = catalog.filter(sight => path(startNodeId, sight.nodeId));
  const availableIds = new Set(available.map(sight => sight.id));

  function preferences({ interests = [], mustSeeIds = [] } = {}) {
    interests = uniqueIds(interests, 12, 'journey interests');
    mustSeeIds = uniqueIds(mustSeeIds, MAX_JOURNEY_SIGHTS, 'must-see sights');
    required(interests.every(id => interestIds.includes(id)), 'Unknown neighborhood interest');
    required(mustSeeIds.every(id => byId.has(id)), 'Unknown must-see sight');
    return { interests, mustSeeIds };
  }

  function route(stopIds, options = {}) {
    stopIds = uniqueIds(stopIds, MAX_JOURNEY_SIGHTS, 'selected sights');
    required(stopIds.length > 0 && stopIds.every(id => availableIds.has(id)), 'Selected sights must be reachable in the reviewed neighborhood');
    const chosen = preferences(options), variantId = options.variantId ?? 'custom';
    required(identifier(variantId), 'Invalid journey variant');
    required(chosen.mustSeeIds.every(id => stopIds.includes(id)), 'The journey omits a must-see sight');
    const stops = stopIds.map(id => byId.get(id)), legs = [];
    let previousNodeId = startNodeId;
    for (const sight of stops) {
      const leg = path(previousNodeId, sight.nodeId);
      if (!leg) throw new RangeError('The selected order has no reviewed walking connection');
      legs.push({ fromNodeId: previousNodeId, toNodeId: sight.nodeId, sightId: sight.id, ...structuredClone(leg) });
      previousNodeId = sight.nodeId;
    }
    const distanceMeters = legs.reduce((total, leg) => total + leg.distanceMeters, 0);
    const theme = variantId.startsWith('interest-') && labels[variantId.slice(9)] ? variantId.slice(9) : null;
    const title = variantId === 'neighborhood' ? { en: 'Neighborhood contrasts', zh: '街区的不同侧面' }
      : variantId === 'your-interests' ? { en: 'A walk for your interests', zh: '围绕你的兴趣漫步' }
      : theme ? { en: `${labels[theme].en} along the way`, zh: `一路发现${labels[theme].zh}` }
      : { en: 'Your neighborhood walk', zh: '你的街区漫步' };
    return { routeId, revision, startNodeId, variantId, kind: 'reviewed-walk', ...chosen,
      title, theme,
      stopIds, stops: structuredClone(stops), legs, points: compact(legs.flatMap(leg => leg.points)),
      edgeIds: legs.flatMap(leg => leg.edgeIds).filter((id, index, ids) => !index || id !== ids[index - 1]), distanceMeters,
      reasons: stops.map(sight => ({ sightId: sight.id, text: structuredClone(sight.reason),
        matchedInterests: sight.interests.filter(id => chosen.interests.includes(id)), sources: structuredClone(sight.sources) })),
      scope: { sightCount: stopIds.length >= 5 && stopIds.length <= 8, walkingDistance: distanceMeters >= 1000 && distanceMeters <= 2000 } };
  }

  // 最多八个景点采用集合动态规划，所有距离均来自已审核的步行图。
  function candidateOrders() {
    const size = available.length, limit = 1 << size;
    const table = Array.from({ length: limit }, () => Array(size).fill(null));
    const retain = (mask, last, candidate) => {
      const current = table[mask][last];
      if (!current || candidate.distance < current.distance - 1e-7
        || (Math.abs(candidate.distance - current.distance) <= 1e-7 && compare(candidate.order.join('|'), current.order.join('|')) < 0)) table[mask][last] = candidate;
    };
    for (let index = 0; index < size; index++) {
      retain(1 << index, index, { order: [available[index].id], distance: path(startNodeId, available[index].nodeId).distanceMeters });
    }
    for (let mask = 1; mask < limit; mask++) {
      for (let last = 0; last < size; last++) {
        const current = table[mask][last];
        if (!current) continue;
        for (let next = 0; next < size; next++) {
          if (mask & (1 << next)) continue;
          const leg = path(available[last].nodeId, available[next].nodeId);
          if (leg) retain(mask | (1 << next), next, { order: [...current.order, available[next].id], distance: current.distance + leg.distanceMeters });
        }
      }
    }
    return table.slice(1).map(states => states.filter(Boolean).sort((a, b) => a.distance - b.distance
      || compare(a.order.join('|'), b.order.join('|')))[0]).filter(Boolean);
  }
  const candidates = candidateOrders();

  function changedCoverage(first, second) {
    const a = new Set(first.edgeIds), b = new Set(second.edgeIds), union = new Set([...a, ...b]);
    let changed = 0, total = 0;
    for (const id of union) {
      const length = edgeLengths.get(id);
      total += length;
      if (a.has(id) !== b.has(id)) changed += length;
    }
    return total > 0 ? changed / total : 0;
  }

  function recommend({ minStops = 5, maxStops = MAX_JOURNEY_SIGHTS,
    minDistanceMeters = 1000, maxDistanceMeters = 2000, ...requested } = {}) {
    required(Number.isInteger(minStops) && Number.isInteger(maxStops) && minStops >= 1
      && minStops <= maxStops && maxStops <= MAX_JOURNEY_SIGHTS, 'Invalid recommendation sight range');
    required(Number.isFinite(minDistanceMeters) && Number.isFinite(maxDistanceMeters)
      && minDistanceMeters >= 0 && maxDistanceMeters >= minDistanceMeters, 'Invalid recommendation walking range');
    const chosen = preferences(requested);
    if (chosen.mustSeeIds.some(id => !availableIds.has(id))) return [];
    const constrained = candidates.filter(candidate => candidate.order.length >= minStops && candidate.order.length <= maxStops
      && candidate.distance >= minDistanceMeters && candidate.distance <= maxDistanceMeters
      && chosen.mustSeeIds.every(id => candidate.order.includes(id)));
    const diversity = candidate => new Set(candidate.order.map(id => byId.get(id).category)).size;
    const matched = (candidate, interests) => candidate.order.filter(id => byId.get(id).interests.some(interest => interests.includes(interest))).length;
    const defaultOrder = (a, b) => diversity(b) - diversity(a) || b.order.length - a.order.length || a.distance - b.distance
      || compare(a.order.join('|'), b.order.join('|'));
    const baseline = [...constrained].sort(defaultOrder)[0];
    const eligible = constrained.filter(candidate => !chosen.interests.length
      || candidate.order.some(id => byId.get(id).interests.some(interest => chosen.interests.includes(interest))));
    const generalOrder = (a, b) => matched(b, chosen.interests) - matched(a, chosen.interests) || defaultOrder(a, b);
    eligible.sort(generalOrder);
    if (!eligible.length) return [];
    // 兴趣改变同一范围和必访条件下的景点顺序时，才使用个性化名称。
    const personalized = chosen.interests.length > 0 && eligible[0].order.join('|') !== baseline.order.join('|');
    const selected = [route(eligible[0].order, { ...chosen, variantId: personalized ? 'your-interests' : 'neighborhood' })];
    const themes = [...chosen.interests, ...interestIds.filter(id => !chosen.interests.includes(id))];
    for (const interest of themes) {
      if (selected.length === 3) break;
      const density = candidate => matched(candidate, [interest]) / candidate.order.length;
      const ranked = eligible.filter(candidate => matched(candidate, [interest]) >= 2 && density(candidate) > density(eligible[0]) + 1e-9)
        .sort((a, b) => density(b) - density(a) || matched(b, [interest]) - matched(a, [interest]) || generalOrder(a, b));
      for (const candidate of ranked) {
        const plan = route(candidate.order, { ...chosen, variantId: `interest-${interest}` });
        const sightSet = signature(plan.stopIds);
        // 变体至少改变十分之一的步行边长度；几米的观察点差异不形成另一条路线。
        if (selected.some(other => signature(other.stopIds) === sightSet || changedCoverage(plan, other) < MIN_VARIANT_EDGE_CHANGE)) continue;
        selected.push(plan);
        break;
      }
    }
    return selected;
  }

  function edit(plan, action) {
    required(plan?.routeId === routeId && plan.revision === revision && action && typeof action.type === 'string', 'Journey edit requires the matching route revision');
    const current = route(plan.stopIds, plan), stopIds = [...current.stopIds];
    let mustSeeIds = [...current.mustSeeIds];
    if (action.type === 'add') {
      required(availableIds.has(action.sightId) && !stopIds.includes(action.sightId), 'Choose a new reachable sight');
      const index = action.index ?? stopIds.length;
      required(Number.isInteger(index) && index >= 0 && index <= stopIds.length, 'Invalid added sight position');
      stopIds.splice(index, 0, action.sightId);
    } else if (action.type === 'remove') {
      const index = stopIds.indexOf(action.sightId);
      required(index !== -1, 'The selected sight is absent from this journey');
      stopIds.splice(index, 1);
      mustSeeIds = mustSeeIds.filter(id => id !== action.sightId);
    } else if (action.type === 'reorder') {
      const ordered = uniqueIds(action.stopIds, MAX_JOURNEY_SIGHTS, 'reordered sights');
      required(signature(ordered) === signature(stopIds), 'Reordering must retain every selected sight');
      stopIds.splice(0, stopIds.length, ...ordered);
    } else if (action.type === 'reverse') stopIds.reverse();
    else throw new TypeError('Unknown journey edit');
    return route(stopIds, { interests: current.interests, mustSeeIds, variantId: 'custom' });
  }

  return { routeId, revision, startNodeId, sights: structuredClone(catalog), availableSightIds: [...availableIds], interestIds, interestLabels: labels,
    recommend, route, edit };
}
