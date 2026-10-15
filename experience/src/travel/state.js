import { PLACE_IDS } from './places.js';

export const STORAGE_KEY = 'tourguideai:travel:v1';
const knownIds = new Set(PLACE_IDS);
const cleanIds = values => Array.isArray(values) ? [...new Set(values.filter(id => knownIds.has(id)))] : [];

export function normalizeJourney(value) {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    selected: Array.isArray(record.selected) ? cleanIds(record.selected) : [...PLACE_IDS],
    meaningful: cleanIds(record.meaningful),
  };
}

export function readJourney(storage) {
  if (!storage) return normalizeJourney(null);
  let raw;
  try { raw = storage.getItem(STORAGE_KEY); }
  catch { return normalizeJourney(null); }
  if (raw === null) return normalizeJourney(null);
  let value;
  try { value = JSON.parse(raw); }
  catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return normalizeJourney(null);
  }
  return normalizeJourney(value);
}

export function writeJourney(storage, value) {
  const journey = normalizeJourney(value);
  if (!storage) return false;
  try { storage.setItem(STORAGE_KEY, JSON.stringify(journey)); }
  catch { return false; }
  return true;
}

export function readSelectedStops(search) {
  const params = new URLSearchParams(search);
  if (!params.has('stops')) return null;
  return cleanIds(params.get('stops').split(','));
}

export function buildCompanionURL(ids, base, locale = 'en') {
  const url = new URL('./travel.html', base);
  if (!['https:', 'http:'].includes(url.protocol)) throw new TypeError('Companion URL requires an HTTP or HTTPS base.');
  url.search = '';
  url.hash = '';
  url.username = '';
  url.password = '';
  url.searchParams.set('lang', locale === 'zh' ? 'zh' : 'en');
  url.searchParams.set('stops', cleanIds(ids).join(','));
  return url.href;
}
