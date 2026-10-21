import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { prepareTravelMapStyle, TRAVEL_MAP_PAINT, TRAVEL_MAP_STYLE_ID } from '../src/home/map-style.js';

const observed = JSON.parse(readFileSync(new URL('../evidence/solo-20261018/research/openfreemap-liberty.json', import.meta.url)));

test('travel colors target actual Liberty layers and pass the MapLibre style validator', () => {
  const styled = prepareTravelMapStyle(observed);
  const used = new Set();
  for (const override of TRAVEL_MAP_PAINT) {
    assert.equal(used.has(override.id), false, override.id);
    used.add(override.id);
    const layer = styled.layers.find(candidate => candidate.id === override.id);
    assert.ok(layer, override.id);
    assert.equal(layer.type, override.type, override.id);
    for (const [property, value] of Object.entries(override.paint)) assert.equal(layer.paint[property], value);
  }
  assert.deepEqual(validateStyleMin(styled).map(error => error.message), []);
  assert.equal(TRAVEL_MAP_STYLE_ID, 'tourguideai-travel-map-v1');
});

test('travel style preserves source geometry rules, heights, labels, attribution and non-color paint', () => {
  const before = structuredClone(observed), styled = prepareTravelMapStyle(observed);
  for (const override of TRAVEL_MAP_PAINT) {
    const layer = observed.layers.find(candidate => candidate.id === override.id);
    assert.notEqual(layer.type, 'symbol');
    assert.ok(Object.keys(override.paint).every(property => property.endsWith('-color')));
    assert.ok(Object.keys(override.paint).every(property => Object.hasOwn(layer.paint, property)));
  }
  const building = observed.layers.find(layer => layer.id === 'building-3d');
  assert.deepEqual(building.paint['fill-extrusion-height'], ['get', 'render_height']);
  assert.deepEqual(building.paint['fill-extrusion-base'], ['get', 'render_min_height']);
  assert.ok(observed.sources.openmaptiles.url.startsWith('https://tiles.openfreemap.org/'));
  assert.deepEqual(observed, before);
  assert.deepEqual(styled.sources, observed.sources);
  assert.deepEqual(styled.layers.filter(layer => layer.type === 'symbol'), observed.layers.filter(layer => layer.type === 'symbol'));
  for (const [index, layer] of observed.layers.entries()) {
    const { paint, ...geometry } = layer, { paint: styledPaint, ...styledGeometry } = styled.layers[index];
    assert.deepEqual(styledGeometry, geometry);
    for (const [property, value] of Object.entries(paint || {})) {
      if (!property.endsWith('-color')) assert.deepEqual(styledPaint[property], value);
    }
  }
  assert.deepEqual(prepareTravelMapStyle(styled), styled);
});

test('incompatible provider layers reject before any supplied style is changed', () => {
  for (const mutate of [style => { style.layers = style.layers.filter(layer => layer.id !== 'water'); },
    style => { style.layers.find(layer => layer.id === 'water').type = 'line'; }]) {
    const supplied = structuredClone(observed); mutate(supplied);
    const before = structuredClone(supplied);
    assert.throws(() => prepareTravelMapStyle(supplied), /requires Liberty layer water/);
    assert.deepEqual(supplied, before);
  }
});
