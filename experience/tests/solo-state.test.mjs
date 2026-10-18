import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SOLO_STORAGE_KEY, MAX_KEPT_PLACES, normalizeMapView, normalizeSoloPlace,
  normalizeKeptPlace, parseKeptPlaces, writeKeptPlaces, areaAtView } from '../src/solo/state.js';

const place = (id = 'crossing') => ({ id, title: 'Shijō–Karasuma crossing', kind: 'poi',
  latitude: 35.00376, longitude: 135.7599457, source: 'OpenStreetMap',
  url: 'https://www.openstreetmap.org/node/4600871814' });
const mapView = () => ({ version: 1, center: [2.349, 48.856], zoom: 15, bearing: -27, pitch: 48 });
const streetView = () => ({ version: 2, player: { x: 23.8, y: 2.1 }, camera: {
  azimuth: 1.7, polar: 1.1, distance: 12, targetOffset: { x: 4, y: -6, height: 9 },
} });
const kept = (representation = 'street') => ({ id: 'kept-example', title: 'A corner to remember',
  note: '<img src=x onerror=alert(1)> 私人的想法 & "my view"', savedAt: '2026-10-18T12:00:00.000Z',
  center: representation === 'street' ? place() : areaAtView(mapView(), 'An unnamed area'),
  origin: representation === 'street' ? place('origin') : areaAtView(mapView(), 'An unnamed area'),
  representation, lighting: 'night', view: representation === 'street' ? streetView() : mapView(),
  route: { id: 'personal-order', title: 'Selected order', stops: [place('second'), place('first')] },
});
const raw = places => JSON.stringify({ version: 1, places });
const legacyKey = 'tourguideai:journey:v2';
const legacyValue = '{"notes":{"mitsui":"Existing private words"}}';
const persistenceMode = process.argv.find(value => value.startsWith('--solo-persist='))?.split('=')[1];

// 使用 Node 的实际 Web Storage 文件跨进程读写，保留已有应用数据。
if (persistenceMode) {
  if (persistenceMode === 'write') {
    localStorage.setItem(legacyKey, legacyValue);
    localStorage.setItem('tourguideai:perspective:v1', 'Existing perspective bytes');
    assert.deepEqual(writeKeptPlaces(localStorage, [kept(), kept('map')].map((item, index) => ({ ...item, id: 'saved-' + index }))),
      [kept(), kept('map')].map((item, index) => normalizeKeptPlace({ ...item, id: 'saved-' + index })));
    const persisted = localStorage.getItem(SOLO_STORAGE_KEY);
    assert.throws(() => writeKeptPlaces(localStorage, [kept(), { invalid: true }]));
    assert.equal(localStorage.getItem(SOLO_STORAGE_KEY), persisted);
  } else {
    const restored = parseKeptPlaces(localStorage.getItem(SOLO_STORAGE_KEY));
    assert.equal(restored.length, 2);
    assert.equal(restored[0].view.camera.azimuth, 1.7);
    assert.deepEqual(restored[1].view, mapView());
    assert.deepEqual(restored[0].route.stops.map(stop => stop.id), ['second', 'first']);
    assert.equal(restored[0].note, kept().note);
  }
  assert.equal(localStorage.getItem(legacyKey), legacyValue);
  assert.equal(localStorage.getItem('tourguideai:perspective:v1'), 'Existing perspective bytes');
} else {
  test('private street and map records retain independent source identity, framing and chosen stop order', () => {
    for (const representation of ['street', 'map']) {
      const value = kept(representation), before = structuredClone(value);
      const normalized = normalizeKeptPlace(value);
      assert.deepEqual(value, before);
      assert.equal(normalized.representation, representation);
      assert.deepEqual(normalized.center, value.center);
      assert.deepEqual(normalized.origin, value.origin);
      assert.deepEqual(normalized.view, value.view);
      assert.equal(normalized.note, value.note);
      assert.deepEqual(normalized.route.stops.map(stop => stop.id), ['second', 'first']);
      assert.deepEqual(parseKeptPlaces(raw([normalized])), [normalized]);
    }
  });

  test('allowlisted saved fields exclude room credentials, journey progress and unselected private data', () => {
    const value = kept();
    Object.assign(value, { participantToken: 'credential', inviteToken: 'invite', visits: ['mufg'], otherNotes: 'unsaved' });
    value.center.participantToken = 'nested credential';
    value.view.visitedIds = ['mitsui'];
    value.route.stops[0].personalNote = 'another note';
    const normalized = normalizeKeptPlace(value), serialized = JSON.stringify(normalized);
    for (const secret of ['credential', 'inviteToken', 'visits', 'unsaved', 'visitedIds', 'another note']) assert.equal(serialized.includes(secret), false);
    assert.equal(normalized.note, kept().note);
    assert.deepEqual(Object.keys(normalized.center).sort(), ['id', 'kind', 'latitude', 'longitude', 'source', 'title', 'url']);
  });

  test('kept street identity cannot assign the Kyoto reconstruction to a distant or unnamed area', () => {
    const paris = { ...place('paris'), title: 'Paris', kind: 'city', latitude: 48.8566, longitude: 2.3522,
      url: 'https://www.openstreetmap.org/relation/7444' };
    assert.equal(normalizeKeptPlace({ ...kept(), center: paris, origin: paris }), null);
    const area = { ...place('area'), kind: 'area' };
    assert.equal(normalizeKeptPlace({ ...kept(), center: area }), null);
    assert.equal(normalizeKeptPlace({ ...kept(), center: { ...place(), kind: 'country' } }), null);
    assert.ok(normalizeKeptPlace({ ...kept('map'), center: place() }), 'a provider map may depict the Kyoto area without becoming a street pose');
  });

  test('source references require bounded coordinates and a credential-free HTTPS URL', () => {
    for (const invalid of [null, [], { ...place(), source: '' }, { ...place(), title: ' ' },
      { ...place(), latitude: 91 }, { ...place(), longitude: Infinity }, { ...place(), latitude: '35' },
      { ...place(), url: 'javascript:alert(1)' }, { ...place(), url: 'http://example.com/place' },
      { ...place(), url: 'https://member:secret@example.com/place' }, { ...place(), url: '/local-place' },
    ]) assert.equal(normalizeSoloPlace(invalid), null);
    assert.deepEqual(normalizeSoloPlace({ ...place(), extra: 'discarded' }), place());
  });

  test('map views and explicit area discovery retain actual center and reject invalid camera values', () => {
    for (const invalid of [null, { ...mapView(), version: 2 }, { ...mapView(), center: [181, 30] },
      { ...mapView(), center: [2, 86] }, { ...mapView(), center: [2, 3, 4] },
      { ...mapView(), zoom: Infinity }, { ...mapView(), zoom: 20 }, { ...mapView(), bearing: 181 },
      { ...mapView(), pitch: -1 }, { ...mapView(), pitch: 61 },
    ]) assert.equal(normalizeMapView(invalid), null);
    assert.equal(areaAtView({ ...mapView(), zoom: 11.99 }, 'Area'), null);
    const area = areaAtView(mapView(), 'Unnamed area');
    assert.equal(area.kind, 'area');
    assert.equal(area.title, 'Unnamed area');
    assert.deepEqual([area.longitude, area.latitude], mapView().center);
    assert.ok(area.id.includes('48.856000:2.349000'));
    assert.equal(new URL(area.url).hostname, 'www.openstreetmap.org');
    assert.equal(areaAtView(mapView(), '区域').id, area.id);
  });

  test('record, route and envelope limits reject corruption without discarding valid entries silently', () => {
    const value = kept();
    for (const invalid of [{ ...value, title: 'x'.repeat(101) }, { ...value, note: 'x'.repeat(281) },
      { ...value, savedAt: 'not-a-date' }, { ...value, lighting: 'live weather' },
      { ...value, route: { ...value.route, stops: [] } },
      { ...value, route: { ...value.route, stops: [place(), place()] } },
      { ...value, route: { ...value.route, stops: Array.from({ length: 9 }, (_, index) => place(String(index))) } },
      { ...value, representation: 'recorded-real-visit' }, { ...value, view: mapView() },
    ]) assert.equal(normalizeKeptPlace(invalid), null);
    assert.ok(normalizeKeptPlace({ ...value, title: '中'.repeat(100), note: '中'.repeat(280) }));
    const maximum = Array.from({ length: MAX_KEPT_PLACES }, (_, index) => ({ ...kept(), id: 'kept-' + index }));
    assert.equal(parseKeptPlaces(raw(maximum)).length, MAX_KEPT_PLACES);
    for (const invalid of ['broken-json', '[]', '{"version":2,"places":[]}', 'x'.repeat(300001),
      raw([kept(), kept()]), raw([...maximum, { ...kept(), id: 'too-many' }]), raw([kept(), { invalid: true }]),
    ]) assert.throws(() => parseKeptPlaces(invalid));
    assert.deepEqual(parseKeptPlaces(null), []);
  });

  test('actual Web Storage persists map and street views across processes while retaining legacy saves', () => {
    const root = fileURLToPath(new URL('../../artifacts/solo-state-unit/', import.meta.url));
    mkdirSync(root, { recursive: true });
    const directory = mkdtempSync(join(root, 'storage-'));
    try {
      for (const mode of ['write', 'read']) {
        const result = spawnSync(process.execPath, ['--experimental-webstorage', '--localstorage-file=' + join(directory, 'places.db'),
          fileURLToPath(import.meta.url), '--solo-persist=' + mode], { encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr || result.stdout);
      }
    } finally { rmSync(directory, { recursive: true }); }
  });
}
