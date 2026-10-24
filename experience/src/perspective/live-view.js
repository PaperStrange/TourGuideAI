import { createGame } from '../runtime/create-game.js';
import { DEFAULT_PACK_ID } from '../packs/registry.js';

// This adapter owns only a live presentation. Saving, attribution and sharing are
// the application's responsibility; it never opens or mutates a Kyoto journey.
export async function createPerspectiveView(host, { locale = 'en', onState, onStatus, onViewChange, onStreamingChange, onCameraConstraintChange,
  onInspectionChange, initialView, solo = false, packId = DEFAULT_PACK_ID, signal, initialLighting = 'day', qualityTier } = {}) {
  let game, latest = null, status = 'loading', currentView = null, destroyed = false;
  const snapshot = () => ({
    position: latest ? { x: latest.x, y: latest.y } : null,
    moving: latest?.moving ?? false, paused: latest?.paused ?? false,
    ready: status === 'ready', settled: status === 'ready' && Boolean(currentView),
    view: currentView ? structuredClone(currentView) : null, pack: game?.getPackInfo() ?? { packId },
  });
  const publish = () => { if (!destroyed && !signal?.aborted) onState?.(snapshot()); };
  game = await createGame(host, {
    locale, solo, packId, signal, qualityTier, encounters: false, lightingMode: initialLighting,
    initialView,
    onState(value) { latest = value; if (game) currentView = game.captureView(); publish(); },
    onViewChange(value) {
      if (game) latest = game.getState(); currentView = value; publish();
      if (!destroyed) onViewChange?.(value);
    },
    onInspectionChange(value) { if (!destroyed) onInspectionChange?.(value); },
    onStreamingChange(value) { if (!destroyed) onStreamingChange?.(value); },
    onCameraConstraintChange(value) { if (!destroyed) onCameraConstraintChange?.(value); },
    onStatus(value) { status = value.status; onStatus?.(value); publish(); },
  });
  if (status !== 'ready') {
    destroyed = true;
    game.destroy();
    throw Object.assign(new Error('Perspective view could not initialize'), { code: 'perspective-unavailable', status });
  }
  latest = game.getState(); currentView = game.captureView(); publish();
  const update = action => {
    if (destroyed) return false;
    const finish = result => { if (!destroyed) { latest = game.getState(); currentView = game.captureView(); publish(); } return result; };
    const result = action(); return result?.then ? result.then(finish) : finish(result);
  };
  const api = {
    getPackInfo: () => game.getPackInfo(),
    getRouteState: () => game.getRouteState(), getStreamState: () => game.getStreamState(),
    retryStreaming: () => update(() => game.retryStreaming()), focusSight: id => update(() => game.focusSight(id)),
    moveTo: (x, y) => update(() => game.moveTo(x, y)),
    stopWalking: () => update(() => game.stopWalking()),
    focusMoment: moment => update(() => game.focusMoment(moment)),
    captureView: () => destroyed ? null : game.captureView(),
    restoreView: (value, options) => update(() => game.restoreView(value, options)),
    cancelRestore: () => game.cancelRestore(),
    setLocale: value => update(() => game.setLocale(value)),
    setPaused: value => update(() => game.setPaused(value)),
    setVisible: value => update(() => game.setVisible(value)),
    setInspecting: value => update(() => game.setInspecting(value)),
    clearInspection: () => update(() => game.clearInspection()),
    inspectAt: (x, y) => update(() => game.inspectAt(x, y)),
    getInspectionState: () => destroyed ? null : game.getInspectionState(),
    resetCamera: () => update(() => game.resetCamera()),
    rotateCamera: delta => update(() => game.rotateCamera(delta)),
    tiltCamera: delta => update(() => game.tiltCamera(delta)),
    panCamera: (right, up) => update(() => game.panCamera(right, up)),
    zoomCamera: delta => update(() => game.zoomCamera(delta)),
    setLightingMode: value => destroyed ? Promise.resolve(null) : game.setLightingMode(value),
    getLightingState: () => destroyed ? null : game.getLightingState(),
    destroy() {
      if (destroyed) return;
      destroyed = true; game.destroy();
      signal?.removeEventListener('abort', api.destroy);
      if (window.__PERSPECTIVE_VIEW__?.host === host) delete window.__PERSPECTIVE_VIEW__;
    },
  };
  signal?.addEventListener('abort', api.destroy, { once: true });
  if (import.meta.env.DEV || new URLSearchParams(location.search).get('qa') === '1') {
    window.__PERSPECTIVE_VIEW__ = Object.freeze({ host, snapshot, pack: game.getPackInfo,
      inspection: () => game.getInspectionState(), streaming: game.getStreamState, route: game.getRouteState,
      camera: () => game.getCameraState(), renderer: () => window.__TOUR_GAME__?.host === host ? window.__TOUR_GAME__.renderer() : null });
  }
  return api;
}
