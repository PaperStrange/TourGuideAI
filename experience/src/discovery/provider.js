import { createJSONReader, DiscoveryError } from './transport.js';

export { DiscoveryError } from './transport.js';
export const DEFAULT_RADIUS_METERS = 1200;
export const MAX_RADIUS_METERS = 2000;
export const MAX_NEARBY_PLACES = 30;
export const DISCOVERY_ATTRIBUTION = Object.freeze([
  { label: '© OpenStreetMap contributors · ODbL', url: 'https://www.openstreetmap.org/copyright' },
  { label: 'Wikipedia contributors · CC BY-SA', url: 'https://en.wikipedia.org/wiki/Wikipedia:Copyrights' },
]);
const APPLICATION_AGENT = 'TourGuideAI/0.3 (https://github.com/PaperStrange/TourGuideAI)';
const osmTypes = { N: 'node', W: 'way', R: 'relation' };
const text = value => typeof value === 'string' ? value.trim() : '';

export function validCoordinates(place) {
  return place && typeof place.latitude === 'number' && Number.isFinite(place.latitude)
    && Math.abs(place.latitude) <= 90 && typeof place.longitude === 'number'
    && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180;
}

export function distanceMeters(a, b) {
  if (!validCoordinates(a) || !validCoordinates(b)) throw new TypeError('Coordinates must be finite WGS84 numbers.');
  const radians = value => value * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6_371_008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
}

export function normalizePhoton(data) {
  if (!Array.isArray(data?.features)) throw new DiscoveryError('INVALID_RESPONSE', 'The geocoder returned an invalid response.');
  const result = new Map();
  for (const feature of data.features) {
    const properties = feature.properties;
    const coordinate = feature.geometry?.coordinates;
    const osmType = osmTypes[properties?.osm_type];
    if (feature.geometry?.type !== 'Point' || !Array.isArray(coordinate) || !osmType
      || !Number.isSafeInteger(properties.osm_id) || properties.osm_id <= 0 || !text(properties.name)) continue;
    const place = {
      id: `osm:${osmType}:${properties.osm_id}`,
      title: text(properties.name), latitude: coordinate[1], longitude: coordinate[0],
      kind: text(properties.osm_value) || text(properties.type) || 'place',
      source: 'OpenStreetMap · Photon',
      url: `https://www.openstreetmap.org/${osmType}/${properties.osm_id}`,
      country: text(properties.country), city: text(properties.city),
      locality: text(properties.district) || text(properties.locality) || text(properties.state),
      anchor: 'provider-representative-point',
    };
    if (validCoordinates(place)) result.set(place.id, place);
  }
  return [...result.values()].slice(0, 6);
}

// 分类依据文章描述中的地点词；事件、机构和行政区域不作为游览地点。
export function articleKind(title, description = '') {
  const subject = text(description) || text(title);
  if (/\b(former|demolished|destroyed|defunct|proposed|unbuilt|incident|battle|assassination|massacre|war|diocese)\b/i.test(subject)) return null;
  if (/\b(museum|gallery|art cent(?:er|re)|theat(?:er|re)|opera house)\b/i.test(subject)) return 'culture';
  if (/\b(temple|shrine|church|cathedral|mosque|synagogue|monastery|castle|palace|monument|memorial|historic building|fortress)\b/i.test(subject)) return 'heritage';
  if (/\b(park|garden|viewpoint|waterfall|beach|botanical)\b/i.test(subject)) return 'outdoors';
  if (/\b(market|marketplace|shopping street|pedestrian street|square|plaza)\b/i.test(subject)) return 'street';
  return null;
}

export function normalizeWikipedia(data, center, radiusMeters = DEFAULT_RADIUS_METERS) {
  if (!validCoordinates(center)) throw new TypeError('A valid center is required.');
  validateRadius(radiusMeters);
  if (data?.batchcomplete === true && !data.query) return [];
  if (!Array.isArray(data?.query?.pages)) throw new DiscoveryError('INVALID_RESPONSE', 'Wikipedia returned an invalid response.');
  if (data.continue) throw new DiscoveryError('INCOMPLETE_RESPONSE', 'Wikipedia returned an incomplete nearby result.');
  const result = new Map();
  for (const page of data.query.pages) {
    const coordinate = page.coordinates?.find(item => item.globe === 'earth' && item.primary !== false);
    const kind = articleKind(page.title, page.description);
    if (page.ns !== 0 || !Number.isSafeInteger(page.pageid) || page.pageid <= 0 || !text(page.title)
      || !coordinate || !kind || Object.hasOwn(page.pageprops || {}, 'disambiguation')) continue;
    const place = {
      id: `wikipedia:en:${page.pageid}`, title: text(page.title),
      latitude: coordinate.lat, longitude: coordinate.lon, kind,
      source: 'Wikipedia', url: `https://en.wikipedia.org/?curid=${page.pageid}`,
      description: text(page.description), kindBasis: page.description ? 'article-description' : 'article-title',
      anchor: 'article-representative-point',
      ...(text(page.pageprops?.wikibase_item) ? { wikidataId: text(page.pageprops.wikibase_item) } : {}),
    };
    if (!validCoordinates(place)) continue;
    const distance = distanceMeters(center, place);
    if (distance <= radiusMeters) result.set(place.id, { ...place, distanceMeters: Math.round(distance) });
  }
  return [...result.values()].sort((a, b) => a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id)).slice(0, MAX_NEARBY_PLACES);
}

function validateRadius(radiusMeters) {
  if (!Number.isInteger(radiusMeters) || radiusMeters < 100 || radiusMeters > MAX_RADIUS_METERS) {
    throw new RangeError(`Nearby radius must be an integer from 100 to ${MAX_RADIUS_METERS} meters.`);
  }
}

function endpointURL(value) {
  const url = new URL(value);
  if (url.username || url.password || url.hash || url.search || (url.protocol !== 'https:'
    && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) {
    throw new TypeError('Provider endpoints must be HTTPS URLs without credentials, query parameters or fragments.');
  }
  return url;
}

export function createDiscoveryProvider({ photonEndpoint = 'https://photon.komoot.io/api/', wikipediaEndpoint = 'https://en.wikipedia.org/w/api.php' } = {}) {
  const photon = endpointURL(photonEndpoint);
  const wikipedia = endpointURL(wikipediaEndpoint);
  const readPhoton = createJSONReader();
  const readWikipedia = createJSONReader();
  return {
    async searchCenters(query, { signal } = {}) {
      const term = text(query);
      if (term.length < 2 || term.length > 120) throw new RangeError('Enter a place name between 2 and 120 characters.');
      const url = new URL(photon);
      url.search = new URLSearchParams({ q: term, limit: '6', lang: 'en' });
      return normalizePhoton(await readPhoton(url.href, { signal }));
    },
    async findNearby(center, { radiusMeters = DEFAULT_RADIUS_METERS, signal } = {}) {
      if (!validCoordinates(center)) throw new TypeError('Choose a center with valid coordinates.');
      validateRadius(radiusMeters);
      const url = new URL(wikipedia);
      url.search = new URLSearchParams({
        action: 'query', format: 'json', formatversion: '2', generator: 'geosearch',
        ggscoord: `${center.latitude}|${center.longitude}`, ggsradius: String(radiusMeters),
        ggslimit: String(MAX_NEARBY_PLACES), ggsnamespace: '0',
        prop: 'coordinates|pageprops|description', coprimary: 'primary', colimit: 'max',
        ppprop: 'wikibase_item|disambiguation', origin: '*', maxage: '3600', smaxage: '3600',
      });
      const data = await readWikipedia(url.href, { signal, headers: { 'Api-User-Agent': APPLICATION_AGENT } });
      return normalizeWikipedia(data, center, radiusMeters);
    },
  };
}

const provider = createDiscoveryProvider();
export const searchCenters = provider.searchCenters;
export const findNearby = provider.findNearby;
