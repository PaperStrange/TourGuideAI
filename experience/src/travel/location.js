/**
 * Foreground-only location estimates. This module never reads navigator, the DOM,
 * storage or journey state; the caller supplies the browser adapters.
 */
export const LOCATION_DEFAULTS = Object.freeze({
  maxAgeMs: 20_000,
  maxAccuracyM: 50,
  maxFutureSkewMs: 5_000,
  timeoutMs: 15_000,
});

const finite = value => typeof value === 'number' && Number.isFinite(value);
const positive = (value, fallback) => finite(value) && value > 0 ? value : fallback;
const nonnegative = (value, fallback) => finite(value) && value >= 0 ? value : fallback;
const settings = options => ({
  maxAgeMs: positive(options?.maxAgeMs, LOCATION_DEFAULTS.maxAgeMs),
  maxAccuracyM: nonnegative(options?.maxAccuracyM, LOCATION_DEFAULTS.maxAccuracyM),
  maxFutureSkewMs: nonnegative(options?.maxFutureSkewMs, LOCATION_DEFAULTS.maxFutureSkewMs),
  timeoutMs: positive(options?.timeoutMs, LOCATION_DEFAULTS.timeoutMs),
});
const validCoordinates = value => value && finite(value.latitude) && finite(value.longitude)
  && value.latitude >= -90 && value.latitude <= 90
  && value.longitude >= -180 && value.longitude <= 180;

function positionResult(position, clock, config) {
  const coords = position?.coords;
  if (!finite(clock) || !validCoordinates(coords) || !finite(coords.accuracy)
    || coords.accuracy < 0 || !finite(position?.timestamp) || position.timestamp < 0) {
    return { fix: null, reason: 'invalid-position' };
  }
  if (position.timestamp > clock + config.maxFutureSkewMs) {
    return { fix: null, reason: 'future-position' };
  }
  if (clock - position.timestamp >= config.maxAgeMs) {
    return { fix: null, reason: 'stale-position' };
  }
  return { fix: {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracyM: coords.accuracy,
    timestamp: position.timestamp,
    receivedAt: clock,
  }, reason: null };
}

/** Return only a fresh, finite WGS84 fix; timestamps are epoch milliseconds. */
export function normalizePosition(position, options = {}) {
  return positionResult(position, options.now ?? Date.now(), settings(options)).fix;
}

function distanceBetween(a, b) {
  const radians = Math.PI / 180;
  const deltaLat = (b.latitude - a.latitude) * radians;
  const deltaLon = (b.longitude - a.longitude) * radians;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(a.latitude * radians)
    * Math.cos(b.latitude * radians) * Math.sin(deltaLon / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

/**
 * A nearby estimate requires the entire reported accuracy circle to fit inside
 * radiusM. This is not proof of entry or a visit. Call only for an active session.
 * Places are {latitude, longitude}; no place identity or journey fields change.
 */
export function assessProximity(fix, place, options = {}) {
  const unknown = reason => ({
    status: 'unknown', distanceM: null, accuracyM: null,
    minDistanceM: null, maxDistanceM: null, reason,
  });
  const config = settings(options), clock = options.now ?? Date.now();
  if (!validCoordinates(place) || !finite(options.radiusM) || options.radiusM <= 0) {
    return unknown('invalid-place');
  }
  if (!fix) return unknown('no-fix');
  const result = positionResult({
    coords: { latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracyM },
    timestamp: fix.timestamp,
  }, clock, config);
  if (!result.fix) return unknown(result.reason);
  const distanceM = distanceBetween(fix, place), accuracyM = fix.accuracyM;
  const minDistanceM = Math.max(0, distanceM - accuracyM);
  const maxDistanceM = distanceM + accuracyM;
  const tooImprecise = accuracyM > config.maxAccuracyM;
  const status = minDistanceM > options.radiusM ? 'outside'
    : !tooImprecise && maxDistanceM <= options.radiusM ? 'nearby' : 'uncertain';
  return {
    status, distanceM, accuracyM, minDistanceM, maxDistanceM,
    reason: status === 'uncertain' ? (tooImprecise ? 'low-accuracy' : 'overlapping-boundary') : null,
  };
}

const copyState = state => ({
  ...state, fix: state.fix ? { ...state.fix } : null,
  error: state.error ? { ...state.error } : null,
});

/**
 * Inject a geolocation object with watchPosition/clearWatch, a clock and timers
 * for testing, and optionally subscribeVisibility(listener) -> unsubscribe.
 * isVisible() must be false whenever the companion is not in the foreground.
 * Returning to the foreground never restarts a watch: call start() explicitly.
 */
export function createLocationController({
  geolocation,
  now = Date.now,
  isVisible = () => true,
  subscribeVisibility,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
  onChange = () => {},
  options = {},
} = {}) {
  const config = settings(options);
  let state = { status: 'idle', active: false, fix: null, error: null, reason: null };
  let destroyed = false, generation = 0, watchId = null, expiryId = null;
  let unsubscribe = null;

  const publish = next => {
    state = next;
    onChange(copyState(state));
  };
  const clearExpiry = () => {
    if (expiryId !== null) { clearTimer(expiryId); expiryId = null; }
  };
  const cancel = () => {
    generation += 1;
    clearExpiry();
    if (watchId !== null) {
      const id = watchId;
      watchId = null;
      try { geolocation.clearWatch(id); } catch { /* Session is still invalidated. */ }
    }
  };
  const inactive = (status, reason = null, error = null) => {
    cancel();
    publish({ status, active: false, fix: null, error, reason });
  };
  const current = token => !destroyed && state.active && generation === token;

  function refreshFreshness() {
    if (!state.active || !state.fix || state.status === 'stale') return;
    const age = now() - state.fix.timestamp;
    if (!finite(age) || age >= config.maxAgeMs || age < -config.maxFutureSkewMs) {
      clearExpiry();
      publish({ ...state, status: 'stale', reason: 'stale-position' });
    }
  }
  function scheduleExpiry(token) {
    clearExpiry();
    if (!current(token) || !state.fix || state.status === 'stale') return;
    const delay = Math.max(1, state.fix.timestamp + config.maxAgeMs - now());
    expiryId = setTimer(() => {
      expiryId = null;
      if (!current(token)) return;
      refreshFreshness();
      if (state.status !== 'stale') scheduleExpiry(token);
    }, Math.min(delay, 2_147_483_647));
  }
  function foreground(token) {
    if (!current(token)) return false;
    if (!isVisible()) { inactive('paused', 'hidden'); return false; }
    return true;
  }
  function acceptPosition(position, token) {
    if (!foreground(token)) return;
    refreshFreshness();
    if (!current(token)) return;
    // A delayed callback must not replace a more recent accepted sample.
    if (state.fix && finite(position?.timestamp) && position.timestamp <= state.fix.timestamp) return;
    const result = positionResult(position, now(), config);
    if (!result.fix) {
      if (state.fix) return;
      const stale = result.reason === 'stale-position';
      publish({ ...state, status: stale ? 'stale' : 'uncertain', reason: result.reason });
      return;
    }
    const uncertain = result.fix.accuracyM > config.maxAccuracyM;
    publish({
      status: uncertain ? 'uncertain' : 'tracking', active: true, fix: result.fix,
      error: null, reason: uncertain ? 'low-accuracy' : null,
    });
    scheduleExpiry(token);
  }
  function acceptError(error, token) {
    if (!foreground(token)) return;
    const known = {
      1: ['denied', 'permission-denied', 'locationDenied'],
      2: ['unavailable', 'position-unavailable', 'locationUnavailable'],
      3: ['error', 'timeout', 'locationTimeout'],
    };
    const [status, code, messageKey] = Object.hasOwn(known, error?.code) ? known[error.code]
      : ['error', 'watch-failed', 'locationUnavailable'];
    inactive(status, code, { code, messageKey });
  }

  function start() {
    if (destroyed || state.active) return false;
    if (!isVisible()) { inactive('paused', 'hidden'); return false; }
    if (typeof geolocation?.watchPosition !== 'function'
      || typeof geolocation?.clearWatch !== 'function') {
      inactive('unavailable', 'unsupported', { code: 'unsupported', messageKey: 'locationUnavailable' });
      return false;
    }
    cancel();
    const token = generation;
    publish({ status: 'requesting', active: true, fix: null, error: null, reason: null });
    if (!current(token)) return false;
    try {
      const id = geolocation.watchPosition(
        position => acceptPosition(position, token),
        error => acceptError(error, token),
        { enableHighAccuracy: true, maximumAge: 0, timeout: config.timeoutMs },
      );
      // Some injected providers call back synchronously before returning an id.
      if (current(token)) watchId = id;
      else { try { geolocation.clearWatch(id); } catch { /* Already invalidated. */ } }
      return current(token);
    } catch {
      if (current(token)) inactive('error', 'watch-failed', {
        code: 'watch-failed', messageKey: 'locationUnavailable',
      });
      return false;
    }
  }
  function stop() {
    if (!destroyed) inactive('idle', 'stopped');
    return copyState(state);
  }
  function getState() {
    refreshFreshness();
    return copyState(state);
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancel();
    if (typeof unsubscribe === 'function') unsubscribe();
    unsubscribe = null;
    state = { status: 'idle', active: false, fix: null, error: null, reason: 'destroyed' };
  }
  if (typeof subscribeVisibility === 'function') {
    unsubscribe = subscribeVisibility(() => {
      if (!destroyed && state.active && !isVisible()) inactive('paused', 'hidden');
    });
  }
  return { start, stop, getState, destroy };
}
