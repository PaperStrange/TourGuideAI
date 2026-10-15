export const SERVICE_SELECTION_KEY = 'tourguideai:room-service:v1';

function canonicalURL(url) {
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new TypeError('Use a service URL without credentials, query parameters or a fragment.');
  }
  return url.href.replace(/\/+$/, '');
}

export function normalizeServiceURL(value) {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u0020\\?#]/.test(value.trim())) {
    throw new TypeError('Enter an absolute HTTPS or local HTTP service URL.');
  }
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new TypeError('HTTP is available only for localhost, 127.0.0.1 or [::1].');
  }
  return canonicalURL(url);
}

export function defaultServiceURL(configured, pageURL) {
  const page = new URL(pageURL);
  return canonicalURL(new URL(configured || page.origin, page));
}

export function parseServiceSelection(serialized) {
  if (serialized === null) return null;
  const value = JSON.parse(serialized);
  if (!value || !['sse', 'poll'].includes(value.transport)) throw new TypeError('Unknown update method.');
  return { endpoint: normalizeServiceURL(value.endpoint), transport: value.transport };
}

export function roomCredentialKey(endpoint, roomId) {
  if (typeof roomId !== 'string' || !roomId) throw new TypeError('A room ID is required.');
  return `tourguideai:room-session:v2:${encodeURIComponent(canonicalURL(new URL(endpoint)))}:${encodeURIComponent(roomId)}`;
}
