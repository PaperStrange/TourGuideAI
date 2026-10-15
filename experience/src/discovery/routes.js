import { distanceMeters, validCoordinates, MAX_RADIUS_METERS } from './provider.js';

const COPY = {
  en: {
    culture: ['Art and heritage', 'A suggested order favoring museums, galleries and heritage places.'],
    outdoors: ['Open spaces and street life', 'A suggested order favoring parks, gardens and markets.'],
    nearby: ['A little of each', 'A suggested order combining different nearby place categories.'],
    limit: 'Article coordinates are reference points. Check entrances, opening hours and walking directions before traveling.',
  },
  zh: {
    culture: ['艺术与历史', '优先选择博物馆、画廊和历史地点的建议顺序。'],
    outdoors: ['户外与街头', '优先选择公园、花园和市场的建议顺序。'],
    nearby: ['发现不同侧面', '结合周边不同地点类别的建议顺序。'],
    limit: '文章坐标用于定位参考。出行前请确认入口、开放时间和步行导航。',
  },
};

function validatePlace(place) {
  if (!validCoordinates(place) || typeof place.id !== 'string' || !place.id || typeof place.title !== 'string'
    || !place.title || typeof place.source !== 'string' || !place.source) throw new TypeError('Routes require identified places with source attribution and valid coordinates.');
}

function orderedFrom(center, places) {
  let current = center;
  const remaining = [...places], ordered = [];
  while (remaining.length) {
    remaining.sort((a, b) => distanceMeters(current, a) - distanceMeters(current, b) || a.id.localeCompare(b.id));
    current = remaining.shift();
    ordered.push(current);
  }
  return ordered;
}

export function suggestRoutes(center, places, { locale = 'en' } = {}) {
  validatePlace(center);
  if (!Array.isArray(places) || places.length > 1000) throw new TypeError('Expected at most 1000 nearby places.');
  const unique = new Map();
  for (const place of places) {
    validatePlace(place);
    if (place.id !== center.id && distanceMeters(center, place) <= MAX_RADIUS_METERS) unique.set(place.id, place);
  }
  const nearby = [...unique.values()].sort((a, b) => distanceMeters(center, a) - distanceMeters(center, b) || a.id.localeCompare(b.id));
  if (!nearby.length) return [];
  const cultural = nearby.filter(place => ['culture', 'heritage'].includes(place.kind));
  const outdoor = nearby.filter(place => ['outdoors', 'street'].includes(place.kind));
  const mixed = [];
  for (const kind of ['culture', 'heritage', 'outdoors', 'street']) {
    const place = nearby.find(candidate => candidate.kind === kind);
    if (place) mixed.push(place);
  }
  const candidates = [
    { id: 'culture', places: cultural.slice(0, 4) },
    { id: 'outdoors', places: outdoor.slice(0, 4) },
    { id: 'nearby', places: [...mixed, ...nearby.filter(place => !mixed.includes(place))].slice(0, 4) },
  ];
  const seen = new Set(), routes = [], copy = COPY[locale === 'zh' ? 'zh' : 'en'];
  for (const candidate of candidates) {
    if (!candidate.places.length) continue;
    const signature = candidate.places.map(place => place.id).sort().join('|');
    if (seen.has(signature)) continue;
    seen.add(signature);
    const stops = [center, ...orderedFrom(center, candidate.places)].map(place => ({ ...place }));
    routes.push({
      id: candidate.id, title: copy[candidate.id][0], description: copy[candidate.id][1],
      stops, kind: 'suggested-order', source: 'TourGuideAI · category and proximity ordering',
      limitation: copy.limit,
    });
  }
  return routes;
}
