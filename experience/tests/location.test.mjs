import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOCATION_DEFAULTS, normalizePosition, assessProximity, createLocationController,
} from '../src/travel/location.js';

const epoch = 1_800_000_000_000;
const rawPosition = (timestamp = epoch, accuracy = 8, latitude = 35.003, longitude = 135.759) => ({
  coords: { latitude, longitude, accuracy, altitude: 90, speed: 2, heading: 140 },
  timestamp, privateField: 'not a normalized field',
});
const fix = (accuracy = 8, latitude = 0, longitude = 0, timestamp = epoch) => ({
  latitude, longitude, accuracyM: accuracy, timestamp, receivedAt: epoch,
});
function harness(options = {}) {
  let clock = epoch, visible = true, nextTimer = 0;
  const timers = new Map(), watchers = [], active = new Set(), cleared = [], events = [];
  const listeners = new Set();
  const geolocation = {
    watchPosition(success, error, watchOptions) {
      const id = watchers.length;
      watchers.push({ success, error, options: watchOptions });
      active.add(id);
      return id;
    },
    clearWatch(id) { active.delete(id); cleared.push(id); },
  };
  const controller = createLocationController({
    geolocation, now: () => clock, isVisible: () => visible,
    setTimer(callback, delay) { const id = nextTimer++; timers.set(id, { callback, at: clock + delay }); return id; },
    clearTimer(id) { timers.delete(id); },
    subscribeVisibility(callback) { listeners.add(callback); return () => listeners.delete(callback); },
    onChange: state => events.push(state), options,
  });
  return {
    controller, geolocation, watchers, active, cleared, events, timers, listeners,
    advance(ms, runTimers = true) {
      clock += ms;
      if (runTimers) {
        let iterations = 0;
        while (true) {
          const due = [...timers].find(([, timer]) => timer.at <= clock);
          if (!due) break;
          assert.ok(iterations++ < 100, 'freshness scheduling must terminate');
          timers.delete(due[0]); due[1].callback();
        }
      }
    },
    setVisible(value, notify = true) {
      visible = value;
      if (notify) for (const callback of [...listeners]) callback();
    },
    position(value = rawPosition(clock), id = watchers.length - 1) { watchers[id].success(value); },
    error(code, id = watchers.length - 1) { watchers[id].error({ code, message: 'Browser-specific private error' }); },
  };
}

test('normalization copies only finite coordinates, estimated accuracy and epoch timestamps', () => {
  const raw = rawPosition(), before = JSON.stringify(raw);
  assert.deepEqual(normalizePosition(raw, { now: epoch }), {
    latitude: 35.003, longitude: 135.759, accuracyM: 8, timestamp: epoch, receivedAt: epoch,
  });
  assert.equal(JSON.stringify(raw), before);
  assert.equal(normalizePosition(rawPosition(epoch, 0, -90, -180), { now: epoch }).accuracyM, 0);
  assert.equal(normalizePosition(rawPosition(epoch, 1, 90, 180), { now: epoch }).latitude, 90);
});

test('normalization rejects malformed, stale, nonfinite and future-skewed samples', () => {
  const invalid = [
    null, {}, { coords: {}, timestamp: epoch },
    rawPosition(epoch, -1), rawPosition(epoch, Infinity),
    rawPosition(epoch, 8, NaN), rawPosition(epoch, 8, 90.01),
    rawPosition(epoch, 8, 0, -180.01), rawPosition(epoch, 8, '35', 135),
    rawPosition(Infinity), rawPosition(-1), rawPosition(String(epoch)),
    rawPosition(epoch - 20_000), rawPosition(epoch + 5_001),
  ];
  for (const raw of invalid) assert.equal(normalizePosition(raw, { now: epoch }), null);
  assert.ok(normalizePosition(rawPosition(epoch - 19_999), { now: epoch }));
  assert.ok(normalizePosition(rawPosition(epoch + 5_000), { now: epoch }));
  assert.equal(normalizePosition(rawPosition(), { now: Infinity }), null);
  assert.equal(normalizePosition(rawPosition(epoch - 101), { now: epoch, maxAgeMs: 100 }), null);
  assert.equal(normalizePosition(rawPosition(epoch + 1), { now: epoch, maxFutureSkewMs: 0 }), null);
});

test('nearby estimates require the reported accuracy circle to fit within the chosen radius', () => {
  const place = { latitude: 0, longitude: 0 }, options = { now: epoch, radiusM: 30 };
  const near = assessProximity(fix(8), place, options);
  assert.equal(near.status, 'nearby');
  assert.equal(near.distanceM, 0);
  assert.equal(near.minDistanceM, 0);
  assert.equal(near.maxDistanceM, 8);
  assert.equal(assessProximity(fix(40), place, options).status, 'uncertain');
  const imprecise = assessProximity(fix(80), place, { ...options, radiusM: 100 });
  assert.equal(imprecise.status, 'uncertain');
  assert.equal(imprecise.reason, 'low-accuracy');
  assert.equal(assessProximity(fix(80), place, { ...options, radiusM: 100, maxAccuracyM: 90 }).status, 'nearby');
  assert.equal(assessProximity(fix(30), place, options).status, 'nearby');
});

test('a boundary overlap is uncertain, a separated estimate is outside, and missing/stale data is unknown', () => {
  const place = { latitude: 0, longitude: 0 }, options = { now: epoch, radiusM: 100 };
  const overlap = assessProximity(fix(20, 0, 0.0009), place, options);
  assert.equal(overlap.status, 'uncertain');
  assert.equal(overlap.reason, 'overlapping-boundary');
  const outside = assessProximity(fix(20, 0, 0.002), place, options);
  assert.equal(outside.status, 'outside');
  assert.ok(outside.distanceM > 222 && outside.distanceM < 223);
  assert.equal(assessProximity(null, place, options).reason, 'no-fix');
  assert.equal(assessProximity(fix(8, 0, 0, epoch - 20_000), place, options).reason, 'stale-position');
  assert.equal(assessProximity(fix(), { latitude: 91, longitude: 0 }, options).status, 'unknown');
  assert.equal(assessProximity(fix(), place, { now: epoch }).status, 'unknown');
  assert.equal(assessProximity(fix(), place, { ...options, radiusM: Infinity }).status, 'unknown');
});

test('distance calculation follows the short path across the dateline and stays finite at the poles', () => {
  const dateline = assessProximity(fix(2, 0, 179.999), { latitude: 0, longitude: -179.999 },
    { now: epoch, radiusM: 300 });
  assert.equal(dateline.status, 'nearby');
  assert.ok(dateline.distanceM > 222 && dateline.distanceM < 223);
  const pole = assessProximity(fix(2, 90, 90), { latitude: 90, longitude: -90 },
    { now: epoch, radiusM: 3 });
  assert.equal(pole.status, 'nearby');
  assert.ok(Number.isFinite(pole.distanceM));
});

test('construction requests nothing; explicit Start creates one uncached foreground watch', () => {
  const h = harness();
  assert.deepEqual(h.controller.getState(), { status: 'idle', active: false, fix: null, error: null, reason: null });
  assert.equal(h.watchers.length, 0);
  assert.equal(h.events.length, 0);
  assert.equal(h.controller.start(), true);
  assert.equal(h.controller.getState().status, 'requesting');
  assert.equal(h.watchers.length, 1);
  assert.deepEqual(h.watchers[0].options, { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 });
  assert.equal(h.controller.start(), false);
  assert.equal(h.watchers.length, 1);
  h.controller.destroy();
});

test('accepted fixes distinguish adequate precision from uncertainty without changing journey state', () => {
  const h = harness();
  h.controller.start(); h.position(rawPosition(epoch, 8));
  assert.equal(h.controller.getState().status, 'tracking');
  assert.equal(h.controller.getState().active, true);
  assert.deepEqual(Object.keys(h.controller.getState()).sort(), ['active', 'error', 'fix', 'reason', 'status']);
  h.advance(1); h.position(rawPosition(epoch + 1, 51));
  assert.equal(h.controller.getState().status, 'uncertain');
  assert.equal(h.controller.getState().reason, 'low-accuracy');
  assert.equal(h.controller.getState().fix.accuracyM, 51);
  const copy = h.controller.getState();
  copy.fix.latitude = -30; copy.status = 'invented';
  h.events.at(-1).fix.longitude = -30;
  assert.equal(h.controller.getState().fix.latitude, 35.003);
  assert.equal(h.controller.getState().fix.longitude, 135.759);
  h.controller.destroy();
});

test('freshness expires without a second GPS callback and resumes only with a newer fresh fix', () => {
  const h = harness();
  h.controller.start(); h.position();
  h.advance(19_999); assert.equal(h.controller.getState().status, 'tracking');
  h.advance(1);
  assert.equal(h.controller.getState().status, 'stale');
  assert.equal(h.controller.getState().active, true);
  assert.equal(h.controller.getState().fix.timestamp, epoch);
  assert.equal(h.events.at(-1).status, 'stale');
  h.position();
  assert.equal(h.controller.getState().status, 'tracking');
  assert.equal(h.controller.getState().fix.timestamp, epoch + 20_000);
  h.controller.destroy();
});

test('getState detects expiry even when browser timers are delayed', () => {
  const h = harness();
  h.controller.start(); h.position(); h.advance(20_001, false);
  assert.equal(h.controller.getState().status, 'stale');
  assert.equal(h.timers.size, 0);
  h.controller.destroy();
});

test('invalid initial samples stay unusable; delayed or invalid samples cannot replace a fresh fix', () => {
  const h = harness();
  h.controller.start(); h.position(rawPosition(epoch - 20_000));
  assert.equal(h.controller.getState().status, 'stale');
  assert.equal(h.controller.getState().fix, null);
  h.position(rawPosition(epoch + 6_000));
  assert.equal(h.controller.getState().reason, 'future-position');
  h.position();
  h.advance(10);
  h.position(rawPosition(epoch - 1, 1, 0, 0));
  h.position(rawPosition(epoch, 1, 0, 0));
  h.position(rawPosition(epoch + 10, Infinity));
  assert.equal(h.controller.getState().fix.timestamp, epoch);
  assert.equal(h.controller.getState().fix.latitude, 35.003);
  h.position(rawPosition(epoch + 10, 2));
  assert.equal(h.controller.getState().fix.accuracyM, 2);
  h.controller.destroy();
});

test('Stop clears watch id zero, timers and usable fix, and ignores every late callback', () => {
  const h = harness();
  h.controller.start(); h.position();
  assert.equal(h.timers.size, 1);
  const stopped = h.controller.stop(), eventCount = h.events.length;
  assert.equal(stopped.status, 'idle');
  assert.equal(stopped.fix, null);
  assert.deepEqual(h.cleared, [0]);
  assert.equal(h.timers.size, 0);
  h.position(rawPosition(epoch + 1), 0); h.error(1, 0); h.advance(60_000);
  assert.equal(h.events.length, eventCount);
  assert.equal(h.controller.getState().active, false);
});

test('new sessions reject late callbacks from an earlier generation', () => {
  const h = harness();
  h.controller.start(); h.controller.stop(); h.controller.start();
  h.position(rawPosition(epoch, 1, 0, 0), 0); h.error(1, 0);
  assert.equal(h.controller.getState().status, 'requesting');
  h.position(rawPosition(epoch, 8), 1);
  assert.equal(h.controller.getState().status, 'tracking');
  assert.equal(h.controller.getState().fix.latitude, 35.003);
  h.controller.destroy();
});

test('hiding pauses immediately; showing never silently restarts tracking', () => {
  const h = harness();
  h.controller.start(); h.position(); h.setVisible(false);
  assert.deepEqual(h.controller.getState(), { status: 'paused', active: false, fix: null, error: null, reason: 'hidden' });
  assert.equal(h.active.size, 0);
  h.setVisible(true);
  assert.equal(h.controller.getState().status, 'paused');
  assert.equal(h.watchers.length, 1);
  assert.equal(h.controller.start(), true);
  assert.equal(h.watchers.length, 2);
  h.controller.destroy();
});

test('hidden construction and unannounced hiding cannot start or keep a live watch', () => {
  const h = harness();
  h.setVisible(false);
  assert.equal(h.controller.start(), false);
  assert.equal(h.watchers.length, 0);
  h.setVisible(true); h.controller.start(); h.setVisible(false, false); h.position();
  assert.equal(h.controller.getState().status, 'paused');
  assert.equal(h.active.size, 0);
  h.controller.destroy();
});

test('denial, unavailable fixes and timeouts stop the watch and expose stable localized message keys', () => {
  for (const [code, status, expectedCode, messageKey] of [
    [1, 'denied', 'permission-denied', 'locationDenied'],
    [2, 'unavailable', 'position-unavailable', 'locationUnavailable'],
    [3, 'error', 'timeout', 'locationTimeout'],
    [99, 'error', 'watch-failed', 'locationUnavailable'],
    ['constructor', 'error', 'watch-failed', 'locationUnavailable'],
  ]) {
    const h = harness();
    h.controller.start(); h.position(); h.error(code);
    assert.equal(h.controller.getState().status, status);
    assert.deepEqual(h.controller.getState().error, { code: expectedCode, messageKey });
    assert.equal(h.controller.getState().fix, null);
    assert.equal(h.active.size, 0);
    assert.equal(h.timers.size, 0);
    assert.equal(h.controller.start(), true, 'retry is an explicit action');
    h.controller.destroy();
  }
});

test('missing geolocation and provider exceptions leave manual fallback available', () => {
  const missing = createLocationController();
  assert.equal(missing.start(), false);
  assert.equal(missing.getState().status, 'unavailable');
  assert.equal(missing.getState().error.code, 'unsupported');
  missing.destroy();
  const throwing = createLocationController({ geolocation: {
    watchPosition() { throw new Error('Browser implementation details'); }, clearWatch() {},
  } });
  assert.equal(throwing.start(), false);
  assert.deepEqual(throwing.getState().error, { code: 'watch-failed', messageKey: 'locationUnavailable' });
  assert.equal(throwing.getState().active, false);
  throwing.destroy();
});

test('a synchronous denial cannot leak the watch returned after its callback', () => {
  const cleared = [];
  const controller = createLocationController({ geolocation: {
    watchPosition(success, error) { error({ code: 1 }); return 0; },
    clearWatch(id) { cleared.push(id); },
  } });
  assert.equal(controller.start(), false);
  assert.equal(controller.getState().status, 'denied');
  assert.deepEqual(cleared, [0]);
  controller.destroy();
});

test('a synchronous consumer Stop during requesting prevents permission initiation', () => {
  let watches = 0, controller;
  controller = createLocationController({
    geolocation: { watchPosition() { watches += 1; return 0; }, clearWatch() {} },
    onChange(state) { if (state.status === 'requesting') controller.stop(); },
  });
  assert.equal(controller.start(), false);
  assert.equal(watches, 0);
  assert.equal(controller.getState().status, 'idle');
  controller.destroy();
});

test('destroy unsubscribes, cancels work and permanently prevents future starts', () => {
  const h = harness();
  h.controller.start(); h.position();
  const events = h.events.length;
  h.controller.destroy(); h.controller.destroy();
  assert.equal(h.active.size, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(h.listeners.size, 0);
  assert.deepEqual(h.cleared, [0]);
  h.position(rawPosition(epoch + 1)); h.error(1); h.setVisible(false); h.advance(60_000);
  assert.equal(h.events.length, events);
  assert.equal(h.controller.start(), false);
  assert.equal(h.controller.getState().reason, 'destroyed');
});

test('freshness, precision and watch timeout are configurable with safe defaults for invalid options', () => {
  assert.equal(LOCATION_DEFAULTS.maxAgeMs, 20_000);
  assert.equal(LOCATION_DEFAULTS.maxAccuracyM, 50);
  const h = harness({ maxAgeMs: 100, maxAccuracyM: 3, timeoutMs: 500 });
  h.controller.start(); h.position(rawPosition(epoch, 4));
  assert.equal(h.controller.getState().status, 'uncertain');
  assert.equal(h.watchers[0].options.timeout, 500);
  h.advance(100); assert.equal(h.controller.getState().status, 'stale');
  h.controller.destroy();
  const fallback = harness({ maxAgeMs: NaN, maxAccuracyM: -1, timeoutMs: Infinity });
  fallback.controller.start(); fallback.position(rawPosition(epoch, 49));
  assert.equal(fallback.controller.getState().status, 'tracking');
  assert.equal(fallback.watchers[0].options.timeout, 15_000);
  fallback.advance(19_999); assert.equal(fallback.controller.getState().status, 'tracking');
  fallback.controller.destroy();
});
