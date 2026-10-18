import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { normalizePhoton, normalizeWikipedia } from '../../../src/discovery/provider.js';
import { suggestRoutes } from '../../../src/discovery/routes.js';

const read = name => fs.readFileSync(new URL(name, import.meta.url));
const json = name => JSON.parse(read(name));
const cases = [
  { id: 'shijo', x: 14371, y: 6489, selectedId: 'osm:way:532008156' },
  { id: 'eiffel', x: 8296, y: 5636, selectedId: 'osm:way:5013364' },
];
const results = cases.map(area => {
  const places = normalizePhoton(json(`photon-${area.id}.json`));
  const center = places.find(place => place.id === area.selectedId);
  if (!center) throw new Error(`Missing actual source place: ${area.selectedId}`);
  const nearby = normalizeWikipedia(json(`wiki-${area.id}.json`), center);
  const bytes = read(`${area.id}-z14.pbf`);
  const tile = new VectorTile(new PbfReader(bytes));
  const layers = {};
  for (const name of ['building', 'transportation', 'water', 'waterway', 'landuse', 'landcover', 'park']) {
    const layer = tile.layers[name];
    const classes = {}, heights = {}, fields = new Set();
    for (let index = 0; index < (layer?.length ?? 0); index++) {
      const properties = layer.feature(index).properties;
      Object.keys(properties).forEach(field => fields.add(field));
      if (properties.class) classes[properties.class] = (classes[properties.class] ?? 0) + 1;
      if (Number.isFinite(properties.render_height)) heights[properties.render_height] = (heights[properties.render_height] ?? 0) + 1;
    }
    layers[name] = { features: layer?.length ?? 0, fields: [...fields].sort(), classes, heights };
  }
  return { area: area.id, center, nearby: nearby.map(({ id, title, kind, latitude, longitude, url }) => ({ id, title, kind, latitude, longitude, url })),
    suggestedOrders: suggestRoutes(center, nearby).map(route => ({ id: route.id, stops: route.stops.map(place => place.id) })),
    tile: { z: 14, x: area.x, y: area.y, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), layers } };
});
fs.writeFileSync(new URL('observations.json', import.meta.url), JSON.stringify({ checkedAt: '2026-10-18', scope: 'One actual z14 tile and one nearby query per area; no topology, access or visual reconstruction verification.', results }, null, 2) + '\n');
console.log(JSON.stringify(results.map(result => ({ area: result.area, center: result.center, nearby: result.nearby, orders: result.suggestedOrders.length,
  tileBytes: result.tile.bytes, layers: Object.fromEntries(Object.entries(result.tile.layers).map(([id, layer]) => [id, { features: layer.features, classes: layer.classes, heights: layer.heights }])) })), null, 2));
