import test from 'node:test';
import assert from 'node:assert/strict';
import source from '../content/ginza-wako/source.json' with { type: 'json' };
import { journeyFeatures, journeyGeometry } from '../src/home/map-route-data.js';

// 已审核的 Ginza 弯曲步道提供真实多段线；此测试不声称覆盖新的完整街区。
const points = source.sidewalk.centerline;
const coordinates = points.map(point => [point.longitude, point.latitude]);
const stops = [points[0], points.at(-1)].map(point => ({
  id: `osm:node:${point.nodeId}`, latitude: point.latitude, longitude: point.longitude,
}));
const route = () => ({ id: source.sidewalk.id, stops: structuredClone(stops),
  geometry: { type: 'LineString', coordinates: structuredClone(coordinates) } });

test('walking geometry retains the actual corner instead of connecting only the selected endpoints', () => {
  const selected = route(), original = structuredClone(selected);
  const actual = journeyGeometry(selected);
  assert.deepEqual(actual.coordinates, coordinates);
  assert.equal(actual.coordinates.length, 5);
  assert.ok(actual.coordinates.some(point => point[0] === source.projection.origin.longitude
    && point[1] === source.projection.origin.latitude));
  assert.deepEqual(selected, original);
});

test('walking geometry and a visiting order keep distinct map semantics', () => {
  const walked = route(), visiting = { id: 'selected-endpoints', stops: structuredClone(stops) };
  const features = journeyFeatures([walked, visiting], ['#123456', '#654321']);
  assert.equal(features.length, 2);
  assert.equal(features[0].properties.path, 'walking-route');
  assert.equal(features[1].properties.path, 'visiting-order');
  assert.deepEqual(features[0].geometry.coordinates, coordinates);
  assert.deepEqual(features[1].geometry.coordinates, [coordinates[0], coordinates.at(-1)]);
  assert.equal(features[0].properties.color, '#123456');
  assert.equal(features[1].properties.color, '#654321');
});

test('one selected destination still displays its explicit start-to-destination walking path', () => {
  const selected = route(); selected.stops = [selected.stops.at(-1)];
  const features = journeyFeatures([selected], ['#123456']);
  assert.equal(features.length, 1, 'An actual walking path remains visible after removing other destinations.');
  assert.equal(features[0].properties.path, 'walking-route');
  assert.deepEqual(features[0].geometry.coordinates, coordinates);
});

test('a single reference point without walking geometry creates no invented line', () => {
  assert.deepEqual(journeyFeatures([{ stops: [stops[0]] }], ['#123456']), []);
});

test('map output does not share mutable coordinates with the selected route', () => {
  const selected = route(), original = structuredClone(selected);
  const rendered = journeyFeatures([selected], ['#123456']);
  rendered[0].geometry.coordinates[1][0] += 0.001;
  rendered[0].geometry.coordinates.push([0, 0]);
  assert.deepEqual(selected, original);
});

test('malformed supplied paths fail without becoming geographic visiting-order lines', () => {
  const changes = [
    selected => { selected.geometry = null; },
    selected => { selected.geometry.type = 'Polygon'; },
    selected => { selected.geometry.coordinates = [coordinates[0]]; },
    selected => { selected.geometry.coordinates[2][0] = NaN; },
    selected => { selected.geometry.coordinates[2][1] = 91; },
    selected => { selected.geometry.coordinates[2][0] = 181; },
    selected => { selected.geometry.coordinates[2] = [...coordinates[2], 0]; },
  ];
  for (const change of changes) {
    const selected = route(); change(selected);
    assert.throws(() => journeyGeometry(selected), /valid WGS84 LineString/);
    assert.throws(() => journeyFeatures([selected], ['#123456']), /valid WGS84 LineString/);
  }
});
