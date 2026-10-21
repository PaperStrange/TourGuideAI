import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizePhoton, normalizeWikipedia, createDiscoveryProvider, distanceMeters, articleKind } from '../src/discovery/provider.js';
import { suggestRoutes } from '../src/discovery/routes.js';
import { retryAfterMilliseconds } from '../src/discovery/transport.js';
import { PLACES } from '../src/travel/places.js';
import { buildMapsJourney } from '../src/travel/maps.js';

const observed = JSON.parse(readFileSync(new URL('./fixtures/discovery-kyoto-observed.json', import.meta.url)));
const observedEiffel = JSON.parse(readFileSync(new URL('../evidence/quality-20261016/provider-review/nearby-eiffel.json', import.meta.url)));
const reviewedPalazzo = JSON.parse(readFileSync(new URL('../evidence/quality-20261016/provider-review/palazzo-wikidata.json', import.meta.url)));
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
    assert.ok(route.stops.length >= 2 && route.stops.length <= 8);
    assert.equal(new Set(route.stops.map(place => place.id)).size, route.stops.length);
    sets.add(route.stops.map(place => place.id).sort().join('|'));
    for (const place of route.stops) assert.deepEqual(place, known.get(place.id));
    const maps = buildMapsJourney(route.stops);
    const exported = maps.parts.flatMap((part, index) => index ? part.stops.slice(1) : part.stops);
    assert.deepEqual(exported.map(place => place.id), route.stops.map(place => place.id));
    assert.ok(maps.parts.every(part => part.stops.length <= 5));
    assert.equal(Object.hasOwn(route, 'duration'), false);
    assert.equal(Object.hasOwn(route, 'geometry'), false);
  }
  assert.equal(sets.size, 3);
  assert.equal(routes.find(route => route.id === 'nearby').stops.length, 8);
  assert.deepEqual(nearby, original);
  assert.equal(suggestRoutes(center, nearby, { locale: 'zh' })[0].title, '艺术与历史');
});

test('shorter suggested walks retain source identities and the selected capacity', () => {
  const routes = suggestRoutes(center, nearby, { maxStops: 5 });
  assert.equal(routes.find(route => route.id === 'nearby').stops.length, 5);
  assert.ok(routes.every(route => route.stops.length <= 5));
  for (const maxStops of [1, 9, 3.5, '8']) assert.throws(() => suggestRoutes(center, nearby, { maxStops }), RangeError);
});

test('the captured Paris response excludes its reviewed Venice coordinate conflict and retains other nearby places', () => {
  const eiffel = { id: 'osm:way:5013364', title: 'Eiffel Tower', latitude: 48.8582599, longitude: 2.2945006, source: 'OpenStreetMap · Photon' };
  const original = structuredClone(observedEiffel);
  const palazzo = observedEiffel.query.pages.find(page => page.pageid === 48435351);
  assert.equal(palazzo.description, 'Palace on the Grand Canal, Venice');
  assert.deepEqual(palazzo.coordinates[0], { lat: 48.8583, lon: 2.2923, primary: true, globe: 'earth' });
  const places = normalizeWikipedia(observedEiffel, eiffel);
  assert.deepEqual(places.map(place => place.id), [
    'wikipedia:en:5455300', 'wikipedia:en:212301', 'wikipedia:en:56929702', 'wikipedia:en:49887902',
  ]);
  for (const place of places) {
    const source = observedEiffel.query.pages.find(page => `wikipedia:en:${page.pageid}` === place.id);
    assert.equal(place.latitude, source.coordinates[0].lat);
    assert.equal(place.longitude, source.coordinates[0].lon);
  }
  const routes = suggestRoutes(eiffel, places);
  assert.ok(routes.length > 0);
  for (const route of routes) {
    assert.equal(route.stops.some(place => place.id === 'wikipedia:en:48435351'), false);
    assert.equal(buildMapsJourney(route.stops).parts.flatMap(part => part.stops).some(place => place.id === 'wikipedia:en:48435351'), false);
  }
  assert.deepEqual(observedEiffel, original);
});

test('a candidate corrected upstream record is accepted near Venice with its supplied coordinates unchanged', () => {
  const corrected = structuredClone(observedEiffel);
  const palazzo = corrected.query.pages.find(page => page.pageid === 48435351);
  const coordinate = reviewedPalazzo.entities.Q16585996.claims.P625[0].mainsnak.datavalue.value;
  palazzo.coordinates[0].lat = coordinate.latitude;
  palazzo.coordinates[0].lon = coordinate.longitude;
  const venice = { latitude: coordinate.latitude, longitude: coordinate.longitude };
  const places = normalizeWikipedia(corrected, venice);
  assert.equal(places.length, 1);
  assert.equal(places[0].id, 'wikipedia:en:48435351');
  assert.equal(places[0].title, palazzo.title);
  assert.equal(places[0].latitude, coordinate.latitude);
  assert.equal(places[0].longitude, coordinate.longitude);
  assert.equal(places[0].source, 'Wikipedia');
  assert.equal(places[0].url, 'https://en.wikipedia.org/?curid=48435351');
  assert.equal(normalizeWikipedia(observedEiffel, { latitude: 48.8583, longitude: 2.2923 }).some(place => place.id === 'wikipedia:en:48435351'), false);
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
