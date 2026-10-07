import { createGame } from '../runtime/create-game.js';
import { normalizePerspectiveView } from '../runtime/view-state.js';

// This adapter owns only a live presentation. Saving, attribution and sharing are
// the application's responsibility; it never opens or mutates a Kyoto journey.
export async function createPerspectiveView(host, { locale = 'en', onState, onStatus, initialView } = {}) {
  let game, latest = null, status = 'loading', currentView = null, destroyed = false;
  const snapshot = () => ({
    position: latest ? { x: latest.x, y: latest.y } : null,
    moving: latest?.moving ?? false, paused: latest?.paused ?? false,
    ready: status === 'ready', settled: status === 'ready' && Boolean(currentView),
    view: currentView ? structuredClone(currentView) : null,
  });
  const publish = () => { if (!destroyed) onState?.(snapshot()); };
  game = await createGame(host, {
    locale, encounters: false, lightingMode: 'day', initialView: normalizePerspectiveView(initialView),
    onState(value) { latest = value; if (game) currentView = game.captureView(); publish(); },
    onViewChange(value) { if (game) latest = game.getState(); currentView = value; publish(); },
    onStatus(value) { status = value.status; onStatus?.(value); publish(); },
  });
  if (status !== 'ready') {
    destroyed = true;
    game.destroy();
    throw Object.assign(new Error('Perspective view could not initialize'), { code: 'perspective-unavailable', status });
  }
  latest = game.getState(); currentView = game.captureView(); publish();
  const update = action => { if (destroyed) return false; const result = action(); latest = game.getState(); currentView = game.captureView(); publish(); return result; };
  const api = {
    moveTo: (x, y) => update(() => game.moveTo(x, y)),
    focusMoment: moment => update(() => game.focusMoment(moment)),
    captureView: () => destroyed ? null : game.captureView(),
    restoreView: value => update(() => game.restoreView(value)),
    setLocale: value => update(() => game.setLocale(value)),
    setPaused: value => update(() => game.setPaused(value)),
    resetCamera: () => update(() => game.resetCamera()),
    setLightingMode: value => destroyed ? Promise.resolve(null) : game.setLightingMode(value),
    getLightingState: () => destroyed ? null : game.getLightingState(),
    destroy() {
      if (destroyed) return;
      destroyed = true; game.destroy();
      if (window.__PERSPECTIVE_VIEW__?.host === host) delete window.__PERSPECTIVE_VIEW__;
    },
  };
  if (import.meta.env.DEV || new URLSearchParams(location.search).get('qa') === '1') {
    window.__PERSPECTIVE_VIEW__ = Object.freeze({ host, snapshot,
      camera: () => game.getCameraState(), renderer: () => window.__TOUR_GAME__?.host === host ? window.__TOUR_GAME__.renderer() : null });
  }
  return api;
}
