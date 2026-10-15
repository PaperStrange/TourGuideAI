import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { PLACES, PLACE_IDS, resolveStops } from '../src/travel/places.js';
import { buildMapsJourney, mapsShareText, journeyCSV, MAX_MAPS_URL_LENGTH } from '../src/travel/maps.js';
import { normalizeJourney, readJourney, writeJourney, readSelectedStops, buildCompanionURL } from '../src/travel/state.js';

const stops = resolveStops(PLACE_IDS);
const pair = stop => `${stop.latitude},${stop.longitude}`;
const urlStops = href => {
  const url = new URL(href), params = url.searchParams;
  if (url.pathname === '/maps/search/') return [params.get('query')];
  return [params.get('origin'), ...(params.has('waypoints') ? params.get('waypoints').split('|') : []), params.get('destination')];
};

test('canonical anchors match raw OSM nodes and the derived Mitsui frontage midpoint', () => {
  const evidence = JSON.parse(readFileSync(new URL('../../city-packs/kyoto-shijo/evidence/osm-block-q2-everything.json', import.meta.url)));
  const find = id => evidence.elements.find(element => element.id === id);
  const crossing = find(465069430), north = crossing.geometry[crossing.nodes.indexOf(4600871814)];
  assert.equal(PLACES[0].latitude, north.lat);
  assert.equal(PLACES[0].longitude, north.lon);
  assert.notEqual(PLACES[0].latitude, find(2737069286).lat);
  const mitsui = find(205732558);
  const from = mitsui.geometry[mitsui.nodes.indexOf(2157078408)];
  const to = mitsui.geometry[mitsui.nodes.indexOf(2157078409)];
  assert.ok(Math.abs(PLACES[1].latitude - (from.lat + to.lat) / 2) < 1e-12);
  assert.ok(Math.abs(PLACES[1].longitude - (from.lon + to.lon) / 2) < 1e-12);
  assert.equal(PLACES[2].latitude, find(14196400744).lat);
  assert.equal(PLACES[2].longitude, find(14196400744).lon);
});

test('resolving places preserves selected order, removes unknown IDs and resolves both languages', () => {
  const result = resolveStops(['mufg', 'unknown', 'crossing', 'mufg'], 'zh');
  assert.deepEqual(result.map(stop => stop.id), ['mufg', 'crossing']);
  assert.equal(result[0].title, PLACES[2].title.zh);
  assert.equal(result[0].detail, PLACES[2].detail.zh);
  assert.equal(result[0].anchor, PLACES[2].anchor.zh);
  assert.deepEqual(resolveStops(null), []);
});

test('zero selected places produce no links; one place produces a coordinate search', () => {
  assert.deepEqual(buildMapsJourney([]), { parts: [], legs: [] });
  assert.equal(mapsShareText([]), '');
  const journey = buildMapsJourney([stops[0]]);
  assert.equal(journey.parts.length, 1);
  assert.deepEqual(journey.legs, []);
  assert.deepEqual(urlStops(journey.parts[0].url), [pair(stops[0])]);
  assert.equal(new URL(journey.parts[0].url).searchParams.has('origin'), false);
});

test('route groups preserve every occurrence and boundary from 2 through 1000 selected places', () => {
  for (const count of [2, 3, 5, 6, 9, 10, 17, 1000]) {
    const selected = Array.from({ length: count }, (_, index) => stops[index % stops.length]);
    const journey = buildMapsJourney(selected);
    const flattened = [];
    journey.parts.forEach((part, index) => {
      assert.ok(part.stops.length >= 2 && part.stops.length <= 5);
      assert.ok(part.url.length <= MAX_MAPS_URL_LENGTH);
      assert.equal(new URL(part.url).searchParams.get('travelmode'), 'walking');
      assert.equal(new URL(part.url).searchParams.get('api'), '1');
      assert.deepEqual(urlStops(part.url), selected.slice(part.startIndex, part.endIndex + 1).map(pair));
      if (index > 0) assert.equal(part.startIndex, journey.parts[index - 1].endIndex);
      flattened.push(...urlStops(part.url).slice(index ? 1 : 0));
    });
    assert.deepEqual(flattened, selected.map(pair));
    assert.equal(journey.legs.length, count - 1);
    journey.legs.forEach((leg, index) => {
      assert.equal(leg.startIndex, index);
      assert.equal(leg.endIndex, index + 1);
      assert.deepEqual(urlStops(leg.url), selected.slice(index, index + 2).map(pair));
    });
  }
});

test('invalid coordinates, sparse inputs and excessive place counts are rejected without partial output', () => {
  const invalid = [null, {}, new Array(1), Array(1001).fill(stops[0])];
  for (const latitude of ['35', null, undefined, NaN, Infinity, -Infinity, 91, -91]) {
    invalid.push([{ ...stops[0], latitude }]);
  }
  for (const longitude of ['135', null, undefined, NaN, Infinity, 181, -181]) {
    invalid.push([{ ...stops[0], longitude }]);
  }
  invalid.push([{ ...stops[0], title: { en: 'Unresolved title' } }]);
  for (const input of invalid) {
    assert.throws(() => buildMapsJourney(input));
    assert.throws(() => mapsShareText(input));
    assert.throws(() => journeyCSV(input));
  }
  for (const latitude of [-90, 0, 90]) for (const longitude of [-180, 0, 180]) {
    assert.equal(buildMapsJourney([{ latitude, longitude }]).parts.length, 1);
  }
});

test('sharing uses selected place data and excludes notes, device position and unrelated fields', () => {
  const selected = stops.map(stop => ({ ...stop, note: 'PRIVATE_NOTE', gps: 'DEVICE_POSITION', visitedAt: 'PRIVATE_DATE' }));
  const journey = buildMapsJourney(selected);
  for (const output of [JSON.stringify(journey), mapsShareText(selected), journeyCSV(selected)]) {
    assert.doesNotMatch(output, /PRIVATE_NOTE|DEVICE_POSITION|PRIVATE_DATE/);
  }
  for (const part of journey.parts) {
    assert.deepEqual([...new URL(part.url).searchParams.keys()].sort(), ['api', 'destination', 'origin', 'travelmode', 'waypoints']);
  }
  const longTitle = [{ ...stops[0], title: '景'.repeat(5000) }, stops[1]];
  assert.ok(buildMapsJourney(longTitle).parts[0].url.length <= MAX_MAPS_URL_LENGTH);
  assert.ok(mapsShareText(longTitle).includes(longTitle[0].title));
});

test('CSV retains every selected pin and escapes punctuation, line breaks and formula names', () => {
  const title = 'A, "quoted" place\n第二行';
  assert.equal(journeyCSV([{ ...stops[0], title }]), `Name,Latitude,Longitude\r\n"A, ""quoted"" place\n第二行",${stops[0].latitude},${stops[0].longitude}\r\n`);
  for (const prefix of ['=', '+', '-', '@', '  =', '\t=', '\r=', '\n=', '\uFEFF=']) {
    const csv = journeyCSV([{ ...stops[0], title: `${prefix}1+1` }]);
    assert.ok(csv.startsWith(`Name,Latitude,Longitude\r\n"'${prefix}1+1"`));
  }
  const selected = Array.from({ length: 1000 }, (_, index) => stops[index % stops.length]);
  assert.equal(journeyCSV(selected).split('\r\n').length, 1002);
});

test('journey normalization preserves cleared selections and independent meaningful marks', () => {
  for (const value of [null, undefined, [], 3, 'record', { selected: 'crossing' }]) {
    assert.deepEqual(normalizeJourney(value), { selected: [...PLACE_IDS], meaningful: [] });
  }
  assert.deepEqual(normalizeJourney({ selected: [], meaningful: ['mufg', 'mufg', 'invented'], gps: { latitude: 1 }, notes: 'private', visited: ['mufg'] }), { selected: [], meaningful: ['mufg'] });
  assert.deepEqual(normalizeJourney({ selected: ['mitsui', 'crossing', 'mitsui', '__proto__'], meaningful: ['crossing'] }), { selected: ['mitsui', 'crossing'], meaningful: ['crossing'] });
  assert.deepEqual(readJourney(undefined), { selected: [...PLACE_IDS], meaningful: [] });
  assert.equal(writeJourney(undefined, { selected: [] }), false);
});

test('native Web Storage retains only canonical selection and meaningful IDs', () => {
  const moduleURL = new URL('../src/travel/state.js', import.meta.url).href;
  const source = `
    import assert from 'node:assert/strict';
    import { readJourney, writeJourney, STORAGE_KEY } from ${JSON.stringify(moduleURL)};
    sessionStorage.clear();
    assert.deepEqual(readJourney(sessionStorage).selected, ['crossing', 'mitsui', 'mufg']);
    assert.equal(writeJourney(sessionStorage, { selected: [], meaningful: ['mufg'], gps: 'private', notes: 'private' }), true);
    assert.deepEqual(JSON.parse(sessionStorage.getItem(STORAGE_KEY)), { selected: [], meaningful: ['mufg'] });
    assert.deepEqual(readJourney(sessionStorage), { selected: [], meaningful: ['mufg'] });
    sessionStorage.setItem(STORAGE_KEY, '{');
    assert.deepEqual(readJourney(sessionStorage), { selected: ['crossing', 'mitsui', 'mufg'], meaningful: [] });
  `;
  const result = spawnSync(process.execPath, ['--experimental-webstorage', '--input-type=module', '--eval', source], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('companion URLs retain deployment paths and carry only explicit locale and known selected IDs', () => {
  assert.equal(readSelectedStops('?lang=zh'), null);
  assert.deepEqual(readSelectedStops('?stops='), []);
  assert.deepEqual(readSelectedStops('?stops=unknown'), []);
  assert.deepEqual(readSelectedStops('?stops=mufg,crossing,mufg'), ['mufg', 'crossing']);
  const href = buildCompanionURL(['mufg', 'crossing', 'unknown'], 'https://user:password@example.test/project/index.html?gps=private#notes', 'zh');
  const url = new URL(href);
  assert.equal(url.pathname, '/project/travel.html');
  assert.equal(url.username, '');
  assert.equal(url.password, '');
  assert.equal(url.hash, '');
  assert.deepEqual([...url.searchParams.keys()], ['lang', 'stops']);
  assert.equal(url.searchParams.get('lang'), 'zh');
  assert.deepEqual(readSelectedStops(url.search), ['mufg', 'crossing']);
  assert.deepEqual(readSelectedStops(new URL(buildCompanionURL([], href)).search), []);
  assert.throws(() => buildCompanionURL(PLACE_IDS, 'file:///project/travel.html'));
});
