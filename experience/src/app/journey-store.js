export const STORAGE_KEY = 'tourguideai:journey:v2';
export const LEGACY_KEY = 'tourguideai:first-walk:v1';

// Import the earlier save only when this origin has never written a v2 record.
// A malformed v2 record must not resurrect an older, deliberately reset journey.
export function readSavedJourney(storage) {
  try {
    const current = storage.getItem(STORAGE_KEY);
    const raw = current === null ? storage.getItem(LEGACY_KEY) : current;
    const value = JSON.parse(raw ?? '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export function readPersonalNotes(value, validIds) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([id, note]) => validIds.has(id) && typeof note === 'string')
    .map(([id, note]) => [id, note.slice(0, 500)]));
}
