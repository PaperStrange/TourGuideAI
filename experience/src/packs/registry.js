import { SHIJO_PACK } from './shijo-karasuma.js';
import { GINZA_PACK } from './ginza-wako.js';
import { SHIJO_EAST_PACK } from './shijo-east.js';

export const DEFAULT_PACK_ID = 'shijo-karasuma';
const packs = [SHIJO_PACK, GINZA_PACK, SHIJO_EAST_PACK];

export function getPack(id = DEFAULT_PACK_ID) {
  return packs.find(pack => pack.id === id) ?? null;
}

export function listPacks() { return [...packs]; }

export function getPackForPlace(place) {
  if (!place || ['area', 'country', 'city'].includes(place.kind) ||
      !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return null;
  const explicit = packs.find(pack => pack.placeIds?.includes(place.id));
  if (explicit) return explicit;
  return packs.find(pack => {
    const bounds = pack.coverage;
    if (!bounds) return false;
    return Math.abs(place.latitude - bounds.latitude) < bounds.latitudeRadius &&
      Math.abs(place.longitude - bounds.longitude) < bounds.longitudeRadius;
  }) ?? null;
}

export function getPackPlace(id, locale = 'en') {
  const pack = getPack(id);
  return pack ? { ...pack.place, title: pack.title[locale === 'zh' ? 'zh' : 'en'] } : null;
}
