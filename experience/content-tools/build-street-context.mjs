#!/usr/bin/env node
/**
 * Authoring-only extraction of frozen, tracked OSM evidence.
 * These upstream dependencies are necessary to recover actual footprint corners
 * and surrounding ways absent from the original small frontage extract. They are
 * never imported by the browser or normal Vite build. The generated JSON contains
 * all consumed coordinates and source identities, and ships inside experience/.
 * Run from any directory: node experience/content-tools/build-street-context.mjs
 * Use --check to compare without writing, or --output /path/file.json.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGIN, PROJECTION, projectMicroDeg } from '../../docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs';
import { WORLD } from '../src/content/kyoto.js';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
if (args.some((x, i) => x !== '--check' && x !== '--output' && args[i - 1] !== '--output')) {
  throw new Error('Usage: build-street-context.mjs [--check] [--output file.json]');
}
const outputFlag = args.indexOf('--output');
if (outputFlag >= 0 && !args[outputFlag + 1]) throw new Error('--output requires a file path');
const outputPath = outputFlag >= 0 ? resolve(args[outputFlag + 1]) : resolve(repo, 'experience/public/content-evidence/street-context.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePaths = {
  footprints: 'city-packs/kyoto-shijo/evidence/osm-block-q1-footprints.json',
  block: 'city-packs/kyoto-shijo/evidence/osm-block-q2-everything.json',
  corridor: 'city-packs/kyoto-shijo/evidence/osm-corridor-map.json',
};
const sources = {};
const inputs = {};
for (const [id, path] of Object.entries(sourcePaths)) {
  const bytes = readFileSync(resolve(repo, path));
  const data = JSON.parse(bytes);
  inputs[id] = { data, elements: new Map(data.elements.map(x => [`${x.type}/${x.id}`, x])) };
  sources[id] = {
    path, sha256: hash(bytes), osmBaseTimestamp: data.osm3s?.timestamp_osm_base ?? null,
    note: 'Tracked upstream snapshot; path is an authoring citation, not a runtime dependency.',
  };
}
for (const [id, path] of Object.entries({
  projection: 'docs/handOff/dsh-bundle-tourguide-2.5d/tools/world-grid.mjs',
  primaryContent: 'experience/src/content/kyoto.js',
})) sources[id] = { path, sha256: hash(readFileSync(resolve(repo, path))) };

const renderBounds = { minX: -95, maxX: 70, minY: -90, maxY: 75 };
const round = n => Number(n.toFixed(6));
function project(p, nodeId = null) {
  if (!Number.isFinite(p?.lon) || !Number.isFinite(p?.lat)) throw new Error(`Missing geometry for node ${nodeId}`);
  const m = projectMicroDeg(Math.round(p.lon * 1e6), Math.round(p.lat * 1e6), ORIGIN);
  return {
    x: round(m.x_m),
    y: round(m.y_m),
    nodeId,
  };
}
function way(sourceId, id) {
  const source = inputs[sourceId];
  const feature = source.elements.get(`way/${id}`);
  if (!feature) throw new Error(`Missing ${sourceId} way ${id}`);
  const path = feature.nodes.map((nodeId, i) => project(feature.geometry?.[i] ?? source.elements.get(`node/${nodeId}`), nodeId));
  return { feature, path };
}
const same = (a, b) => a.x === b.x && a.y === b.y;
const inside = p => p.x >= renderBounds.minX && p.x <= renderBounds.maxX && p.y >= renderBounds.minY && p.y <= renderBounds.maxY;
function area(ring) {
  return ring.slice(1).reduce((a, p, i) => a + ring[i].x * p.y - p.x * ring[i].y, 0) / 2;
}
function clipSegment(a, b) {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const [p, q] of [[-dx, a.x - renderBounds.minX], [dx, renderBounds.maxX - a.x], [-dy, a.y - renderBounds.minY], [dy, renderBounds.maxY - a.y]]) {
    if (p === 0) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    if (t0 > t1) return null;
  }
  if (t1 - t0 < 1e-12) return null;
  const point = t => t === 0 ? a : t === 1 ? b : { x: round(a.x + t * dx), y: round(a.y + t * dy), nodeId: null };
  return [point(t0), point(t1)];
}
function clippedPaths(path) {
  const parts = [];
  for (let i = 1; i < path.length; i++) {
    const line = clipSegment(path[i - 1], path[i]);
    if (!line) continue;
    const previous = parts.at(-1);
    if (previous && same(previous.at(-1), line[0])) previous.push(line[1]);
    else parts.push(line);
  }
  return parts;
}
function record(sourceId, osmType, osmId) {
  return { sourceId, osmType, osmId, url: `https://www.openstreetmap.org/${osmType}/${osmId}`, valueKind: 'derived', gameplay: false };
}

const buildingSpecs = [
  ['footprints', 205732558, 'mitsui', 'primary', [2157078408, 2157078412]],
  ['footprints', 205732536, 'daiya', 'primary', [2157078403, 2157078404]],
  ['corridor', 344477489, 'northwest-context', 'context', null],
  ['corridor', 1317905647, 'southwest-context', 'context', null],
  ['corridor', 205732486, 'southwest-background', 'context', null],
];
const buildings = buildingSpecs.map(([sourceId, osmId, id, role, cornerNodes]) => {
  const { feature, path } = way(sourceId, osmId);
  if (!same(path[0], path.at(-1))) throw new Error(`Unclosed building ring ${osmId}`);
  if (!path.every(inside)) throw new Error(`Building ${osmId} is outside selected render bounds`);
  const footprint = area(path) < 0 ? [...path].reverse() : path;
  const result = {
    ...record(sourceId, 'way', osmId), id, role, name: feature.tags.name ?? null,
    levels: feature.tags['building:levels'] ? Number(feature.tags['building:levels']) : null,
    heightMetres: feature.tags.height ? Number(feature.tags.height) : null,
    footprint, winding: 'counterclockwise', closed: true,
    note: 'OSM traced footprint. Floor count is a tag, not measured height. Context identity does not add an encounter or entrance.',
  };
  if (cornerNodes) {
    const [from, to] = cornerNodes.map(id => path.find(p => p.nodeId === id));
    if (!from || !to) throw new Error(`Missing corner nodes ${osmId}`);
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const fromIndex = footprint.findIndex(p => p.nodeId === from.nodeId);
    const followsCounterclockwise = footprint[(fromIndex + 1) % (footprint.length - 1)].nodeId === to.nodeId;
    const normalSign = followsCounterclockwise ? 1 : -1;
    result.chamfer = {
      from, to, midpoint: { x: round((from.x + to.x) / 2), y: round((from.y + to.y) / 2) },
      lengthMetres: round(length),
      tangentDegrees: round(Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI),
      outwardNormal: { x: round(normalSign * (to.y - from.y) / length), y: round(-normalSign * (to.x - from.x) / length) },
      note: 'Mapped diagonal footprint edge. It does not measure the classical feature or its cornice/column offsets.',
    };
  }
  return result;
});

function pathsFromWays(candidates, kind) {
  return candidates.flatMap(([sourceId, id]) => {
    const { feature, path } = way(sourceId, id);
    return clippedPaths(path).map((points, part) => ({
      ...record(sourceId, 'way', id), id: `${kind}-${id}-${part}`, path: points,
      name: feature.tags.name ?? null, highway: feature.tags.highway ?? null,
      surface: feature.tags.surface ?? null, widthMetres: null,
      ...(kind === 'road' ? { oneway: feature.tags.oneway === 'yes', lanes: feature.tags.lanes ? Number(feature.tags.lanes) : null } : {}),
      ...(kind === 'sidewalk' ? { covered: feature.tags.covered === 'yes' ? true : feature.tags.covered === 'no' ? false : null } : {}),
      ...(kind === 'crossing' ? { crossing: feature.tags.crossing ?? null, markings: feature.tags['crossing:markings'] ?? null } : {}),
      clippedToRenderBounds: !path.every(inside),
      note: kind === 'hedge' ? 'Mapped hedge line; thickness, height and plant appearance are authored.' : 'Mapped centreline, not a kerb or surface boundary; display width and elevation remain authored. Not a walkable polygon.',
    }));
  });
}
const surfaceWay = e => e.type === 'way' && e.tags?.tunnel !== 'yes' && !(Number(e.tags?.layer) < 0);
const allCorridorWays = inputs.corridor.data.elements.filter(surfaceWay);
const roads = pathsFromWays(allCorridorWays.filter(e => ['四条通', '烏丸通'].includes(e.tags?.name)).map(e => ['corridor', e.id]), 'road');
const primarySidewalkIds = new Set([907059193, 907059194, 465066447, 465069406]);
const sidewalks = pathsFromWays([
  ...[...primarySidewalkIds].map(id => ['block', id]),
  ...allCorridorWays.filter(e => e.tags?.footway === 'sidewalk' && !primarySidewalkIds.has(e.id)).map(e => ['corridor', e.id]),
], 'sidewalk');
const crossings = pathsFromWays([
  ['block', 465069430],
  ...allCorridorWays.filter(e => e.tags?.footway === 'crossing' && e.id !== 465069430).map(e => ['corridor', e.id]),
], 'crossing');
const hedges = pathsFromWays([['block', 907059199], ['block', 907059200]], 'hedge');
const trees = [13037178804].map(id => {
  const e = inputs.block.elements.get(`node/${id}`);
  return { ...record('block', 'node', id), ...project(e, id), species: e.tags.species ?? null, heightMetres: null, note: 'Mapped tree location; species, canopy dimensions and any planter are not established.' };
});
const crossingControls = [2737069286].map(id => {
  const e = inputs.block.elements.get(`node/${id}`);
  return { ...record('block', 'node', id), ...project(e, id), tactilePaving: e.tags.tactile_paving === 'yes', audibleSignals: e.tags['traffic_signals:sound'] === 'yes', note: 'Presence at this crossing, not exact tactile layout, kerb ramp or signal-pole positions.' };
});

const result = {
  schema: 'tourguide.street-context/v1',
  purpose: 'Shared visual context for live PBR and matching Blender renders; no added gameplay, venues, walkability or entrance claims.',
  sourceVersion: 'frozen-tracked-inputs-identified-by-sha256',
  generator: 'experience/content-tools/build-street-context.mjs',
  licence: { name: 'ODbL 1.0', url: 'https://opendatacommons.org/licenses/odbl/1-0/', attribution: '© OpenStreetMap contributors', copyrightUrl: 'https://www.openstreetmap.org/copyright', derivedDatabase: true },
  projection: { originLonUdeg: ORIGIN.lonUdeg, originLatUdeg: ORIGIN.latUdeg, metresPerDegreeLon: PROJECTION.metresPerDegreeLon, metresPerDegreeLat: PROJECTION.metresPerDegreeLat, coordinateOrder: 'x east, y north; metres', gltfMapping: 'x, height, -y', quantization: 'Round source lon/lat to integer microdegrees before projection, matching the frozen contract.' },
  sources, renderBounds, renderBoundsValueKind: 'authored selection for display clipping',
  playableBounds: WORLD.bounds,
  boundaryPolicy: 'Render context is not included in navigation or pointer targets. Keep existing WORLD/DOORS/TARGETS and movement rules unless a separate gameplay change is implemented.',
  buildings, roads, sidewalks, crossings, hedges, trees, crossingControls,
  limitations: [
    'OSM traced geometry is not a survey or a guarantee of current conditions.',
    'Road/footway paths are centrelines. Widths, kerbs, ramp geometry, surface heights and traffic simulation are not established.',
    'Building heights, bay dimensions, roofing, classical feature detail and photographic materials require their own authored/reference provenance.',
    'Mapped nearby building identities are visual context only; no new venue interaction, opening hours, tenant binding or walkable access is created.',
  ],
};
const bytes = `${JSON.stringify(result, null, 2)}\n`;
if (args.includes('--check')) {
  if (readFileSync(outputPath, 'utf8') !== bytes) throw new Error('street-context.json differs from the frozen source extraction; regenerate intentionally.');
  console.log(`street-context check passed: ${hash(bytes)}`);
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, bytes);
  console.log(`Wrote ${outputPath}: ${buildings.length} buildings, ${roads.length} road paths, ${sidewalks.length} sidewalks, ${crossings.length} crossings; sha256 ${hash(bytes)}`);
}
