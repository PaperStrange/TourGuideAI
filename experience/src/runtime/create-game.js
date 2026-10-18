import * as THREE from 'three';
import { WORLD, TARGETS, TICK_MS, INTERACTION_RADIUS, approachPoint } from '../simulation/world.js';
import { createState, stepSimulation, refreshProximity, snapshot, setDestination, cameraRelativeInput } from '../simulation/index.js';
import { createGuidedCamera } from './camera.js';
import { createWorldView } from './world-view.js';
import { lightingMode as normalizeLightingMode } from './lighting-contract.js';
import { CAMERA_DEFAULTS, normalizePerspectiveView } from './view-state.js';
import { normalizeExplorationView } from './exploration-state.js';

const keys = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
const byId = new Map(TARGETS.map(target => [target.id, target]));
const observing = () => import.meta.env.DEV || new URLSearchParams(location.search).get('qa') === '1';

export async function createGame(host, options = {}) {
  if (!(host instanceof HTMLElement)) throw new Error('A scene host is required.');
  const encounters = options.encounters !== false;
  const solo = options.solo === true;
  const normalizeView = solo ? normalizeExplorationView : normalizePerspectiveView;
  const initialView = normalizeView(options.initialView);
  let player = refreshProximity(createState(options.saved?.game ?? options.saved ?? options.initialState));
  if (initialView) { player.x = initialView.player.x; player.y = initialView.player.y; refreshProximity(player); }
  let locale = options.locale === 'zh' ? 'zh' : 'en';
  let previous = { x: player.x, y: player.y };
  let renderer, canvas, view, rig, observer, frameHandle, firstFrameHandle, animateFrame;
  let status = 'loading', destroyed = false, dirty = true, readyNotified = false;
  let accumulator = 0, lastTime = null, notifications = 0, renderedFrames = 0;
  let visible = true, updateFrames = 0;
  let inspecting = false, previousInspection = '', previousView = '';
  let width = 1, height = 1, queuedInteraction = null, pointer = null;
  let arrivalIdleMs = 0;
  let requestedLightingMode = normalizeLightingMode(options.lightingMode);
  let lightingState = { requestedMode: requestedLightingMode, mode: null, phase: 'loading' };
  const lightingStatus = value => { lightingState = value; if (!destroyed) options.onLightingStatus?.(value); };
  const abort = new AbortController();
  const held = new Set(), activePointers = new Set(), cleanups = [], commandTrace = [];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motion.matches;
  const publish = () => {
    if (!destroyed) { (options.onState ?? options.onUpdate)?.(snapshot(player)); publishView(); }
  };
  const notify = (next, progress) => {
    status = next;
    host.dataset.sceneStatus = next;
    options.onStatus?.({ status: next, progress });
    if (!readyNotified && next !== 'loading') {
      readyNotified = true; options.onReady?.({ status: next === 'ready' ? 'ready' : 'unavailable' });
    }
  };
  const listen = (target, type, handler, config) => {
    target.addEventListener(type, handler, config);
    cleanups.push(() => target.removeEventListener(type, handler, config));
  };
  const scheduleFrame = () => {
    if (!destroyed && status === 'ready' && visible && !document.hidden && animateFrame && frameHandle === undefined) {
      frameHandle = requestAnimationFrame(animateFrame);
    }
  };
  const stopFrames = () => { cancelAnimationFrame(frameHandle); frameHandle = undefined; lastTime = null; };
  function publishView() {
    if (!rig || destroyed || !options.onViewChange) return;
    const captured = api.captureView(), signature = JSON.stringify(captured);
    if (signature === previousView) return;
    previousView = signature; options.onViewChange(captured);
  }
  const invalidate = () => { dirty = true; scheduleFrame(); publishView(); };
  const publishInspection = () => {
    if (!solo || destroyed || !view) return;
    const value = view.getInspectionState(), signature = JSON.stringify(value);
    if (signature === previousInspection) return;
    previousInspection = signature; options.onInspectionChange?.(value);
  };
  const updateInspection = () => {
    if (view && inspecting) { view.updateInspection(rig.camera, player, width, height); publishInspection(); }
  };
  const clearMovement = () => {
    held.clear(); player.destination = null; player.waypoints = []; player.moving = false;
    queuedInteraction = null; accumulator = 0; previous = { x: player.x, y: player.y }; dirty = true;
  };
  const interact = id => {
    const target = byId.get(id);
    if (!encounters || status !== 'ready' || player.paused || !target) return;
    const point = approachPoint(target);
    if (Math.hypot(player.x - point.x, player.y - point.y) > INTERACTION_RADIUS) return;
    clearMovement(); player.selectedTargetId = id;
    rig?.faceTarget(target, player);
    options.onInteract?.(id); publish();
  };
  function localize() {
    if (solo) {
      canvas?.setAttribute('aria-label', locale === 'zh'
        ? '京都四条街景。WASD 或方向键行走，拖动环视，滚动缩放。近看模式中，右键拖动或双指移动构图；J/L 左右环视，I/K 调整俯仰，按住 Shift 配合这些键平移构图，+/- 缩放，E 查看中央细节，Esc 退出近看。'
        : 'Kyoto Shijo street. Walk with WASD or arrow keys, drag to look around, and scroll to zoom. In Look closer mode, right-drag or use two fingers to frame; J/L orbit, I/K tilt, hold Shift with these keys to pan, +/- zoom, E inspects the center, and Escape leaves Look closer.');
      return;
    }
    canvas?.setAttribute('aria-label', locale === 'zh'
      ? `京都四条街景。WASD 或方向键行走，拖动环视，滚动缩放${encounters ? '，靠近后按 E 互动' : ''}。`
      : `Kyoto Shijo street. Walk with WASD or arrow keys, drag to look around, and scroll to zoom${encounters ? '. Press E nearby to interact' : ''}.`);
  }
  const api = {
    getState: () => snapshot(player),
    getCameraState: () => rig?.snapshot() ?? null,
    captureView() {
      const camera = rig?.snapshot();
      if (!camera || camera.transitioning) return null;
      return normalizeView({ version: solo ? 2 : 1, player: { x: player.x, y: player.y }, camera: {
        azimuth: camera.azimuth, polar: camera.polar, distance: camera.distance,
        targetOffset: { x: camera.target[0] - player.x, y: -camera.target[2] - player.y, height: camera.target[1] },
      } });
    },
    restoreView(value) {
      const next = normalizeView(value);
      if (!next || !rig || status !== 'ready' || destroyed) return false;
      clearMovement(); player.x = next.player.x; player.y = next.player.y;
      previous = { ...next.player }; refreshProximity(player);
      rig.restorePose(next.camera, player); dirty = true; publish();
      return true;
    },
    focusMoment(moment) {
      const point = moment?.lookAt ?? moment?.focus;
      if (!rig || status !== 'ready' || destroyed || !point ||
          ![point.x, point.y, point.height].every(Number.isFinite)) return false;
      const dx = point.x - player.x, dy = point.y - player.y;
      const next = normalizeView({ version: solo ? 2 : 1, player, camera: {
        ...CAMERA_DEFAULTS, ...moment.camera,
        azimuth: moment.camera?.azimuth ?? Math.atan2(-dx, dy),
        targetOffset: { x: dx, y: dy, height: point.height },
      } });
      if (!next) return false;
      clearMovement(); rig.restorePose(next.camera, player, !player.paused);
      dirty = true; publish(); return true;
    },
    getLightingState: () => view?.getLightingState() ?? structuredClone(lightingState),
    getInspectionState: () => view?.getInspectionState() ?? { enabled: false, focus: null, selected: null },
    setInspecting(value) {
      if (!solo || destroyed) return false;
      const next = Boolean(value);
      if (inspecting === next) return inspecting;
      if (next) clearMovement();
      inspecting = next; rig?.setInspecting(inspecting); view?.setInspecting(inspecting);
      updateInspection(); publishInspection(); return inspecting;
    },
    clearInspection() { view?.clearInspection(); publishInspection(); },
    inspectAt(x, y) {
      if (!solo || !inspecting || !visible || player.paused || status !== 'ready') return null;
      view.setInspectionPoint(x, y); updateInspection();
      const result = view.selectInspection(); publishInspection(); return result?.selected ?? null;
    },
    async setLightingMode(value) {
      requestedLightingMode = normalizeLightingMode(value);
      if (!view) return structuredClone(lightingState);
      return view.setLightingMode(requestedLightingMode);
    },
    setPaused(value) {
      const next = Boolean(value);
      if (player.paused === next) return;
      clearMovement(); player.paused = next;
      rig?.setEnabled(visible && !player.paused && status === 'ready'); scheduleFrame(); publish();
    },
    setVisible(value) {
      const next = Boolean(value);
      if (visible === next) return;
      visible = next; clearMovement(); lastTime = null;
      rig?.setEnabled(visible && !player.paused && status === 'ready');
      if (visible) scheduleFrame(); else stopFrames();
    },
    setLocale(value) { locale = value === 'zh' ? 'zh' : 'en'; localize(); },
    reset() {
      clearMovement(); player = refreshProximity(createState());
      previous = { x: player.x, y: player.y }; rig?.reset(player); rig?.setEnabled(visible && status === 'ready');
      publish();
    },
    resetCamera() { if (!player.paused) { rig?.reset(player); dirty = true; } },
    rotateCamera(delta) { if (!player.paused && Number.isFinite(delta)) rig?.rotate(delta); },
    tiltCamera(delta) { if (!player.paused && Number.isFinite(delta)) rig?.tilt(delta); },
    panCamera(right, up) { if (!player.paused && Number.isFinite(right) && Number.isFinite(up)) rig?.pan(right, up); },
    zoomCamera(delta) { if (!player.paused && Number.isFinite(delta)) rig?.zoom(delta); },
    markVisited(id, choiceId) {
      if (!encounters || !byId.has(id)) return;
      if (!player.visitedIds.includes(id)) player.visitedIds.push(id);
      if (typeof choiceId === 'string') player.choiceIds[id] = choiceId;
      dirty = true; publish();
    },
    markSourceRead(id) {
      if (!encounters) return;
      if (byId.has(id) && !player.readSourceIds.includes(id)) player.readSourceIds.push(id);
      publish();
    },
    setSelectedTarget(id) { if (encounters && byId.has(id)) { player.selectedTargetId = id; dirty = true; publish(); } },
    moveTo(x, y) {
      if (player.paused || status !== 'ready' || !Number.isFinite(x) || !Number.isFinite(y)) return;
      rig.resumeFollow();
      held.clear(); queuedInteraction = null; setDestination(player, x, y); dirty = true; publish();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true; abort.abort(); clearMovement(); stopFrames(); cancelAnimationFrame(firstFrameHandle);
      observer?.disconnect(); for (const cleanup of cleanups) cleanup();
      rig?.dispose(); view?.dispose(); renderer?.dispose(); canvas?.remove();
      if (window.__TOUR_GAME__?.host === host) delete window.__TOUR_GAME__;
    },
  };
  host.tabIndex = 0; notify('loading', 0); publish();
  function unavailable(next, error) {
    clearMovement(); cancelAnimationFrame(frameHandle); rig?.setEnabled(false);
    notify(next); publish();
    if (observing()) host.dataset.sceneError = error?.message ?? String(error ?? next);
  }
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    canvas = renderer.domElement;
    Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: 'grab' });
    host.prepend(canvas); localize();
    rig = createGuidedCamera(canvas, player, reducedMotion, invalidate, { solo });
    if (initialView) rig.restorePose(initialView.camera, player);
    rig.setEnabled(false);
    const resize = () => {
      width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight);
      renderer.setSize(width, height, false); rig.resize(width, height); dirty = true;
    };
    observer = new ResizeObserver(resize); observer.observe(host); resize();
    listen(canvas, 'webglcontextlost', event => { event.preventDefault(); abort.abort(); unavailable('context-lost'); });
    listen(motion, 'change', event => { reducedMotion = event.matches; rig.setReducedMotion(reducedMotion); dirty = true; });
    const isText = event => event.target instanceof HTMLElement &&
      (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName));
    listen(window, 'keydown', event => {
      if (status !== 'ready' || !visible || player.paused || isText(event) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (keys[event.code]) { event.preventDefault(); rig.resumeFollow(); held.add(event.code); queuedInteraction = null; }
      if (solo && inspecting && event.code === 'KeyE' && !event.repeat) { event.preventDefault(); api.inspectAt(); }
      if (solo && inspecting && event.code === 'Escape') { event.preventDefault(); api.setInspecting(false); }
      if (solo && inspecting && host.contains(document.activeElement)) {
        const orbit = { KeyJ: -0.08, KeyL: 0.08 }[event.code];
        const tilt = { KeyI: -0.06, KeyK: 0.06 }[event.code];
        const zoom = { Equal: -1, NumpadAdd: -1, Minus: 1, NumpadSubtract: 1 }[event.code];
        if (orbit || tilt || zoom) {
          event.preventDefault(); view.setInspectionPoint();
          if (event.shiftKey && (orbit || tilt)) rig.pan(orbit ? Math.sign(orbit) : 0, tilt ? -Math.sign(tilt) : 0);
          else {
            if (orbit) rig.rotate(orbit);
            if (tilt) rig.tilt(tilt);
          }
          if (zoom) rig.zoom(zoom);
        }
      }
      if (encounters && event.code === 'KeyE' && !event.repeat) { event.preventDefault(); interact(player.nearbyTargetId); }
    });
    listen(window, 'keyup', event => { held.delete(event.code); });
    listen(window, 'blur', clearMovement);
    listen(document, 'visibilitychange', () => {
      if (document.hidden) { clearMovement(); stopFrames(); }
      else scheduleFrame();
    });
    const pointerPoint = event => {
      const rect = canvas.getBoundingClientRect();
      return { x: (event.clientX - rect.left) * width / rect.width, y: (event.clientY - rect.top) * height / rect.height };
    };
    const targetAt = point => {
      if (!encounters) return null;
      let nearest = null, distance = 27;
      for (const target of TARGETS) {
        const approach = approachPoint(target);
        const ground = view.floorHeight(approach.x, approach.y);
        const projected = rig.project(approach.x, approach.y, ground + 0.12, width, height);
        const candidate = Math.hypot(projected.x - point.x, projected.y - point.y);
        if (projected.visible && candidate < distance) { nearest = target; distance = candidate; }
      }
      return nearest;
    };
    listen(canvas, 'pointerdown', event => {
      if (player.paused || status !== 'ready') return;
      activePointers.add(event.pointerId);
      if (activePointers.size > 1) { if (pointer) pointer.cancelled = true; return; }
      if (event.button !== 0) return;
      rig.finishTransition();
      host.focus({ preventScroll: true });
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0, cancelled: false };
    });
    listen(canvas, 'pointermove', event => {
      if (pointer?.id === event.pointerId) {
        pointer.distance = Math.max(pointer.distance, Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y));
        canvas.style.cursor = pointer.distance > 6 ? 'grabbing' : 'grab';
      } else if (status === 'ready' && !player.paused) canvas.style.cursor = targetAt(pointerPoint(event)) ? 'pointer' : 'grab';
      if (inspecting && status === 'ready' && !player.paused) {
        const point = pointerPoint(event);
        view.setInspectionPoint(pointer?.distance > 6 ? undefined : point.x, pointer?.distance > 6 ? undefined : point.y);
      }
    });
    listen(canvas, 'pointerleave', () => { if (inspecting) view?.setInspectionPoint(); });
    listen(canvas, 'pointercancel', event => { activePointers.delete(event.pointerId); pointer = null; });
    listen(canvas, 'pointerup', event => {
      activePointers.delete(event.pointerId);
      const gesture = pointer;
      if (gesture?.id !== event.pointerId) return;
      pointer = null; canvas.style.cursor = 'grab';
      if (gesture.cancelled || gesture.distance > 6 || player.paused || status !== 'ready') return;
      const point = pointerPoint(event), target = targetAt(point);
      if (solo && inspecting && api.inspectAt(point.x, point.y)) return;
      held.clear(); queuedInteraction = null;
      if (target) {
        player.selectedTargetId = target.id;
        const approach = approachPoint(target);
        if (Math.hypot(player.x - approach.x, player.y - approach.y) <= INTERACTION_RADIUS) interact(target.id);
        else { setDestination(player, approach.x, approach.y); queuedInteraction = target.id; }
      } else {
        const destination = view.pickGround(rig.camera, point.x, point.y, width, height);
        if (destination) { rig.resumeFollow(); setDestination(player, destination.x, destination.y); }
      }
      dirty = true; publish();
    });
    const started = performance.now();
    view = await createWorldView(renderer, { encounters, solo, signal: abort.signal, onProgress: progress => notify('loading', progress),
      lightingMode: requestedLightingMode, onLightingStatus: lightingStatus, onInvalidate: invalidate });
    if (destroyed || abort.signal.aborted) { view.dispose(); return api; }
    view.setInspecting(inspecting); rig.setInspecting(inspecting);
    const assetsReadyAt = performance.now();
    view.update(player, rig.camera, { dt: 1000, reducedMotion: true });
    notify('loading', 0.85);
    await renderer.compileAsync(view.scene, rig.camera);
    if (destroyed || abort.signal.aborted) return api;
    const compiledAt = performance.now();
    let firstRenderMs = 0;
    // 首次绘制包含纹理上传与阴影准备；完成后才报告街景可用。
    await new Promise((resolve, reject) => {
      const cancelled = () => { cancelAnimationFrame(firstFrameHandle); reject(abort.signal.reason); };
      abort.signal.addEventListener('abort', cancelled, { once: true });
      firstFrameHandle = requestAnimationFrame(() => {
        abort.signal.removeEventListener('abort', cancelled);
        try {
          rig.setEnabled(visible && !player.paused);
          const renderStarted = performance.now();
          renderer.render(view.scene, rig.camera); renderedFrames++; dirty = false;
          firstRenderMs = performance.now() - renderStarted;
          resolve();
        } catch (error) { reject(error); }
      });
    });
    if (destroyed || abort.signal.aborted) return api;
    const loadMs = performance.now() - started;
    const startup = { assetsAndLightingMs: assetsReadyAt - started, compileMs: compiledAt - assetsReadyAt, firstRenderMs, readyMs: loadMs };
    notify('ready', 1); publish();
    updateInspection(); publishInspection();
    if (observing()) {
      window.__TOUR_GAME__ = Object.freeze({
        host, snapshot: api.getState, camera: api.getCameraState,
        viewport: () => ({ width, height, dpr: renderer.getPixelRatio(), rect: canvas.getBoundingClientRect().toJSON() }),
        screenPoint: (x, y, h = 0.2) => rig.project(x, y, h, width, height),
        targets: () => encounters ? TARGETS.map(({ id, x, y, approachX, approachY }) => ({ id, x, y, approachX, approachY })) : [],
        commands: () => commandTrace.map(command => ({ ...command })),
        inspection: api.getInspectionState,
        renderer: () => ({ status, loadMs, startup: { ...startup }, renderedFrames, updateFrames, visible, render: { ...renderer.info.render },
          memory: { ...renderer.info.memory }, scene: view.stats(), reducedMotion, lighting: view.getLightingState() }),
      });
    }
    animateFrame = function animate(now) {
      frameHandle = undefined;
      if (destroyed || status !== 'ready' || !visible || document.hidden) { lastTime = null; return; }
      updateFrames++;
      const dt = lastTime === null ? 0 : Math.min(100, now - lastTime); lastTime = now;
      if (!document.hidden && !player.paused) {
        accumulator = Math.min(accumulator + dt, TICK_MS * 6);
        while (accumulator + 0.00001 >= TICK_MS) {
          previous = { x: player.x, y: player.y };
          let right = 0, forward = 0;
          for (const code of held) { right += keys[code][0]; forward += keys[code][1]; }
          const input = cameraRelativeInput(right, forward, rig.controls.getAzimuthalAngle());
          stepSimulation(player, input); accumulator -= TICK_MS;
          if (observing() && (input.x || input.y)) {
            commandTrace.push({ tick: player.tick, ...input }); if (commandTrace.length > 600) commandTrace.shift();
          }
          if (queuedInteraction && !player.destination) {
            const id = queuedInteraction; queuedInteraction = null; interact(id);
          }
          if (++notifications >= 6) { notifications = 0; publish(); }
          if (player.paused) break;
        }
        rig.follow(player, dt, reducedMotion);
        const arrived = encounters ? byId.get(player.selectedTargetId) : null;
        if (arrived && player.nearbyTargetId === arrived.id && !player.destination && !player.moving && !held.size && !pointer) {
          arrivalIdleMs += dt;
          if (arrivalIdleMs >= 200) rig.faceTarget(arrived, player);
        } else arrivalIdleMs = 0;
      }
      const alpha = reducedMotion || player.paused ? 1 : Math.max(0, Math.min(1, accumulator / TICK_MS));
      const rendered = { ...player, x: previous.x + (player.x - previous.x) * alpha,
        y: previous.y + (player.y - previous.y) * alpha };
      dirty = view.update(rendered, rig.camera, { dt, reducedMotion }) || dirty;
      updateInspection();
      if (dirty && !document.hidden) {
        renderer.render(view.scene, rig.camera); renderedFrames++; dirty = false;
      }
      scheduleFrame();
    };
    scheduleFrame();
  } catch (error) {
    if (!destroyed && status !== 'context-lost') unavailable('unavailable', error);
  }
  return api;
}
