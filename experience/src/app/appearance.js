// Appearance is a local viewing preference, separate from the saved journey.
export const APPEARANCE_KEY = 'tourguideai:appearance:v1';
const validMode = mode => mode === 'day' || mode === 'night';

export function readAppearance(storage, search = '') {
  const requested = new URLSearchParams(search).get('lighting');
  if (validMode(requested)) return requested;
  try {
    const saved = JSON.parse(storage?.getItem(APPEARANCE_KEY) ?? 'null');
    if (saved && !Array.isArray(saved) && validMode(saved.lighting)) return saved.lighting;
  } catch { /* A blocked or malformed preference leaves the default view usable. */ }
  return 'day';
}

export function writeAppearance(storage, mode) {
  if (!validMode(mode)) return false;
  try {
    if (!storage) return false;
    storage.setItem(APPEARANCE_KEY, JSON.stringify({ lighting: mode }));
    return true;
  } catch { return false; }
}
