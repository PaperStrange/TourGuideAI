import { normalizeExplorationView } from '../runtime/exploration-state.js';

export const SOLO_STORAGE_KEY = 'tourguideai.solo.places.v1';
export const MAX_KEPT_PLACES = 20;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const text = (value, limit) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
const coordinate = (value, limit) => finite(value) && Math.abs(value) <= limit;
const bounded = (value, min, max) => finite(value) && value >= min && value <= max;
export const hasDetailedStreet = place => place?.kind !== 'area' && place?.kind !== 'country' &&
  Math.abs(place?.latitude - 35.00376) < 0.00055 && Math.abs(place?.longitude - 135.75995) < 0.00065;

export function normalizeMapView(value) {
  if (!object(value) || value.version !== 1 || !Array.isArray(value.center) || value.center.length !== 2 ||
      !coordinate(value.center[0], 180) || !coordinate(value.center[1], 85.051129) ||
      !bounded(value.zoom, 1, 19) || !coordinate(value.bearing, 180) || !bounded(value.pitch, 0, 60)) return null;
  return { version: 1, center: [...value.center], zoom: value.zoom, bearing: value.bearing, pitch: value.pitch };
}

export function normalizeSoloPlace(value) {
  if (!object(value) || !text(value.id, 180) || !text(value.title, 240) ||
      !coordinate(value.longitude, 180) || !coordinate(value.latitude, 90) || !text(value.source, 500) ||
      !text(value.url, 2048) || !URL.canParse(value.url)) return null;
  const url = new URL(value.url);
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const kind = ['country', 'city', 'area', 'poi'].includes(value.kind) ? value.kind : 'poi';
  return { id: value.id, title: value.title, latitude: value.latitude, longitude: value.longitude,
    kind, source: value.source, url: url.href };
}

export function normalizeKeptPlace(value) {
  if (!object(value) || !text(value.id, 80) || !text(value.title, 100) ||
      typeof value.note !== 'string' || value.note.length > 280 || !text(value.savedAt, 40) ||
      !Number.isFinite(Date.parse(value.savedAt))) return null;
  const center = normalizeSoloPlace(value.center), origin = normalizeSoloPlace(value.origin);
  if (!center || !origin || !object(value.route) || !text(value.route.id, 100) ||
      !text(value.route.title, 240) || !Array.isArray(value.route.stops) ||
      !value.route.stops.length || value.route.stops.length > 8) return null;
  const stops = value.route.stops.map(normalizeSoloPlace);
  if (stops.some(stop => !stop) || new Set(stops.map(stop => stop.id)).size !== stops.length) return null;
  const representation = value.representation;
  if (representation === 'street' && !hasDetailedStreet(center)) return null;
  const view = representation === 'street' ? normalizeExplorationView(value.view)
    : representation === 'map' ? normalizeMapView(value.view) : null;
  if (!view || !['day', 'night'].includes(value.lighting)) return null;
  // 保存字段采用允许列表，个人笔记不包含房间凭证或共享成员信息。
  return { id: value.id, title: value.title.trim(), note: value.note.trim(), savedAt: value.savedAt,
    center, origin, representation, view, lighting: value.lighting,
    route: { id: value.route.id, title: value.route.title, stops } };
}

export function parseKeptPlaces(raw) {
  if (raw === null) return [];
  if (typeof raw !== 'string' || raw.length > 300000) throw new Error('solo-storage-invalid');
  const data = JSON.parse(raw);
  if (!object(data) || data.version !== 1 || !Array.isArray(data.places) || data.places.length > MAX_KEPT_PLACES) throw new Error('solo-storage-invalid');
  const places = data.places.map(normalizeKeptPlace);
  if (places.some(place => !place) || new Set(places.map(place => place.id)).size !== places.length) throw new Error('solo-storage-invalid');
  return places;
}

export function writeKeptPlaces(storage, places) {
  const raw = JSON.stringify({ version: 1, places });
  const checked = parseKeptPlaces(raw);
  storage.setItem(SOLO_STORAGE_KEY, JSON.stringify({ version: 1, places: checked }));
  return checked;
}

export function areaAtView(view, title) {
  const camera = normalizeMapView(view);
  if (!camera || camera.zoom < 12) return null;
  const [longitude, latitude] = camera.center;
  return { id: `area:${latitude.toFixed(6)}:${longitude.toFixed(6)}`, title, kind: 'area', latitude, longitude,
    source: 'OpenStreetMap', url: `https://www.openstreetmap.org/#map=16/${latitude.toFixed(6)}/${longitude.toFixed(6)}` };
}
