import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizePhoton, normalizeWikipedia, createDiscoveryProvider, distanceMeters, articleKind } from '../src/discovery/provider.js';
import { suggestRoutes } from '../src/discovery/routes.js';
import { retryAfterMilliseconds } from '../src/discovery/transport.js';
import { PLACES } from '../src/travel/places.js';
import { buildMapsJourney } from '../src/travel/maps.js';

const observed = JSON.parse(readFileSync(new URL('./fixtures/discovery-kyoto-observed.json', import.meta.url)));
const crossing = PLACES.find(place => place.id === 'crossing');
const center = { ...crossing, title: crossing.title.en };
const nearby = normalizeWikipedia(observed.wikipedia, center);

test('Photon keeps source identity, coordinate order and disambiguating country metadata', () => {
  const places = normalizePhoton(observed.photon);
  const city = places.find(place => place.id === 'osm:relation:357794');
  assert.equal(places.length, 3);
  assert.equal(city.latitude, 35.0115754);
  assert.equal(city.longitude, 135.7681441);
  assert.equal(city.title, 'Kyoto');
  assert.equal(city.country, 'Japan');
  assert.equal(city.kind, 'city');
  assert.equal(city.url, 'https://www.openstreetmap.org/relation/357794');
  assert.equal(city.anchor, 'provider-representative-point');
  assert.throws(() => normalizePhoton(null), { code: 'INVALID_RESPONSE' });
});

test('Wikipedia filters actual non-place articles, keeps nearby source coordinates and descriptive categories', () => {
  assert.equal(nearby.length, 9);
  assert.equal(nearby.some(place => /Restoration|Station/.test(place.title)), false);
  const market = nearby.find(place => place.id === 'wikipedia:en:14538385');
  assert.equal(market.kind, 'street');
  assert.equal(market.kindBasis, 'article-description');
  assert.equal(market.latitude, 35.00502778);
  assert.equal(market.longitude, 135.76613889);
  assert.equal(market.url, 'https://en.wikipedia.org/?curid=14538385');
  assert.equal(market.wikidataId, 'Q11650434');
  assert.ok(nearby.every(place => distanceMeters(center, place) <= 1200));
  assert.deepEqual(normalizeWikipedia(observed.wikipedia, center, 100), []);
  assert.throws(() => normalizeWikipedia(observed.wikipedia, center, 2001), RangeError);
  assert.throws(() => normalizeWikipedia({ ...observed.wikipedia, continue: { continue: '' } }, center), { code: 'INCOMPLETE_RESPONSE' });
  assert.equal(articleKind('Honnō-ji Incident', '1582 attempted assassination of Oda Nobunaga'), null);
});

test('three distinct suggestions preserve sourced places and export every selected pin', () => {
  const original = structuredClone(nearby);
  const routes = suggestRoutes(center, nearby);
  assert.deepEqual(routes.map(route => route.id), ['culture', 'outdoors', 'nearby']);
  const known = new Map([center, ...nearby].map(place => [place.id, place]));
  const sets = new Set();
  for (const route of routes) {
    assert.equal(route.kind, 'suggested-order');
    assert.equal(route.stops[0].id, center.id);
    assert.ok(route.stops.length >= 2 && route.stops.length <= 5);
    assert.equal(new Set(route.stops.map(place => place.id)).size, route.stops.length);
    sets.add(route.stops.map(place => place.id).sort().join('|'));
    for (const place of route.stops) assert.deepEqual(place, known.get(place.id));
    const maps = buildMapsJourney(route.stops);
    assert.equal(maps.parts.length, 1);
    assert.equal(maps.parts[0].stops.length, route.stops.length);
    assert.equal(Object.hasOwn(route, 'duration'), false);
    assert.equal(Object.hasOwn(route, 'geometry'), false);
  }
  assert.equal(sets.size, 3);
  assert.deepEqual(nearby, original);
  assert.equal(suggestRoutes(center, nearby, { locale: 'zh' })[0].title, '艺术与历史');
});

test('insufficient nearby coverage stays explicit and duplicate inputs cannot manufacture alternatives', () => {
  assert.deepEqual(suggestRoutes(center, []), []);
  const one = nearby[0];
  const routes = suggestRoutes(center, [one, one]);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].stops.length, 2);
  const distant = normalizePhoton(observed.photon).find(place => place.id === 'osm:node:3628707764');
  assert.ok(distanceMeters(center, distant) > 2000);
  assert.deepEqual(suggestRoutes(center, [distant]), []);
  assert.equal(distanceMeters(center, center), 0);
  assert.throws(() => suggestRoutes({ ...center, latitude: '35' }, nearby), TypeError);
  assert.throws(() => suggestRoutes(center, [null]), TypeError);
});

test('requests reject invalid inputs and already-cancelled reads before contacting a provider', async () => {
  const provider = createDiscoveryProvider();
  await assert.rejects(provider.searchCenters(''), RangeError);
  await assert.rejects(provider.searchCenters('x'.repeat(121)), RangeError);
  await assert.rejects(provider.findNearby({ latitude: NaN, longitude: 0 }), TypeError);
  await assert.rejects(provider.findNearby(center, { radiusMeters: 99 }), RangeError);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(provider.searchCenters('Kyoto', { signal: controller.signal }), { name: 'AbortError' });
  await assert.rejects(provider.findNearby(center, { signal: controller.signal }), { name: 'AbortError' });
  assert.throws(() => createDiscoveryProvider({ photonEndpoint: 'http://example.com/' }), TypeError);
  assert.throws(() => createDiscoveryProvider({ wikipediaEndpoint: 'https://example.com/?secret=value' }), TypeError);
});

test('Retry-After preserves server delays for seconds and HTTP dates', () => {
  const now = Date.parse('2026-10-15T18:00:00Z');
  assert.equal(retryAfterMilliseconds('120', now), 120_000);
  assert.equal(retryAfterMilliseconds('Thu, 15 Oct 2026 18:01:00 GMT', now), 60_000);
  assert.equal(retryAfterMilliseconds(null, now), 60_000);
  assert.equal(retryAfterMilliseconds('0', now), 1000);
});
