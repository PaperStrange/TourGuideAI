import { Application, Renderable, CANVAS } from 'melonjs';
import { drawWorld } from './render-world.js';
import { WORLD, TARGETS, TICK_MS, INTERACTION_RADIUS, project, unproject, approachPoint } from './scene-config.js';
import { createState, stepSimulation, refreshProximity, snapshot, setDestination } from './simulation.js';

const DIRECTIONS = {
  ArrowUp: [0, 1], KeyW: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};
const targetById = new Map(TARGETS.map((target) => [target.id, target]));

export async function createGame(container, options = {}) {
  if (!(container instanceof HTMLElement)) throw new Error('The game needs a canvas container.');
  let player = refreshProximity(createState(options.initialState));
  let previous = { x: player.x, y: player.y };
  let locale = options.locale === 'zh' ? 'zh' : 'en';
  let width = Math.max(320, container.clientWidth), height = Math.max(240, container.clientHeight);
  let accumulator = 0, notificationTicks = 0, renderTime = 0;
  let hoveredTargetId = null, queuedInteraction = null, destroyed = false;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
  const updateMotionPreference = (event) => { reducedMotion = event.matches; };
  motionPreference.addEventListener('change', updateMotionPreference);
  const held = new Set();
  const camera = { x: player.x + 3, y: WORLD.roadCenterY + 2.5, scale: 42 };
  container.tabIndex = 0;
  const app = new Application(width, height, {
    // Flex resizes the render surface to its container. Stretch would retain the
    // startup design size and apply its old scale again on a later window event.
    parent: container, renderer: CANVAS, scale: 'auto', scaleMethod: 'flex',
    scaleTarget: container, antiAlias: false, consoleHeader: false, physic: 'none',
    backgroundColor: '#ede6d5',
  });
  app.pauseOnBlur = false;
  app.resumeOnFocus = false;
  app.world.fps = 60;
  app.updateFrameRate();
  const canvas = app.canvas;
  canvas.setAttribute('aria-label', locale === 'zh' ? '京都四条通可交互街景' : 'Interactive Shijo Street, Kyoto');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';

  const publish = () => { if (!destroyed) options.onUpdate?.(snapshot(player)); };
  const clearMovement = () => {
    held.clear();
    player.destination = null;
    player.waypoints = [];
    player.moving = false;
    queuedInteraction = null;
    accumulator = 0;
    previous = { x: player.x, y: player.y };
  };
  const interact = (id) => {
    const target = targetById.get(id);
    if (!target || player.paused) return;
    const p = approachPoint(target);
    if (Math.hypot(player.x - p.x, player.y - p.y) > INTERACTION_RADIUS) return;
    clearMovement();
    player.selectedTargetId = id;
    options.onInteract?.(id);
    publish();
  };

  class StreetScene extends Renderable {
    constructor() {
      super(0, 0, width, height);
      this.anchorPoint.set(0, 0);
      this.floating = true;
      this.alwaysUpdate = true;
    }
    update(dt) {
      renderTime += Math.min(dt, 100);
      accumulator = Math.min(accumulator + Math.min(dt, 100), TICK_MS * 6);
      while (accumulator + 0.00001 >= TICK_MS) {
        previous = { x: player.x, y: player.y };
        let x = 0, y = 0;
        for (const code of held) { const d = DIRECTIONS[code]; if (d) { x += d[0]; y += d[1]; } }
        stepSimulation(player, { x, y });
        accumulator -= TICK_MS;
        if (queuedInteraction && !player.destination) {
          const id = queuedInteraction;
          queuedInteraction = null;
          interact(id);
        }
        if (++notificationTicks >= 6) { notificationTicks = 0; publish(); }
      }
      camera.scale = Math.max(32, Math.min(46, width / 27));
      const halfView = width / camera.scale / 2;
      const margin = Math.min(halfView, (WORLD.bounds.maxX - WORLD.bounds.minX) / 2);
      const targetX = Math.max(WORLD.bounds.minX + margin, Math.min(WORLD.bounds.maxX - margin, player.x + 2));
      camera.x = reducedMotion ? targetX : camera.x + (targetX - camera.x) * Math.min(1, dt / 120);
      return true;
    }
    draw(renderer) {
      const ctx = renderer.getContext();
      ctx.save();
      ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      const interpolation = reducedMotion ? 1 : Math.max(0, Math.min(1, accumulator / TICK_MS));
      const renderState = {
        ...player,
        x: previous.x + (player.x - previous.x) * interpolation,
        y: previous.y + (player.y - previous.y) * interpolation,
      };
      drawWorld(ctx, { width, height, camera, state: renderState, targets: TARGETS, world: WORLD, locale,
        now: renderTime, interpolation, reducedMotion, hoveredTargetId, nearbyTargetId: player.nearbyTargetId });
      ctx.restore();
    }
  }
  const scene = new StreetScene();
  app.world.addChild(scene);
  app.repaint();

  const resize = () => {
    width = Math.max(320, container.clientWidth);
    height = Math.max(240, container.clientHeight);
    app.renderer.resize(width, height);
    scene.width = width;
    scene.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    app.repaint();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  const isTextInput = (event) => event.target instanceof HTMLElement &&
    (event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName));
  const keydown = (event) => {
    if (player.paused || isTextInput(event) || event.altKey || event.metaKey || event.ctrlKey) return;
    if (DIRECTIONS[event.code]) {
      event.preventDefault();
      held.add(event.code);
      queuedInteraction = null;
      return;
    }
    if (event.code === 'KeyE' && !event.repeat) {
      event.preventDefault();
      interact(player.nearbyTargetId);
    }
  };
  const keyup = (event) => { held.delete(event.code); };
  const visibility = () => { if (document.hidden) clearMovement(); };
  const pointerPosition = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * width / rect.width, y: (event.clientY - rect.top) * height / rect.height };
  };
  const targetAt = (point) => {
    let found = null, closest = 36;
    for (const target of TARGETS) {
      const approach = approachPoint(target);
      const p = project(approach.x, approach.y, 0, camera, width, height);
      const marker = project(target.x, target.y, 1.1, camera, width, height);
      const distance = Math.min(Math.hypot(point.x - p.x, point.y - p.y), Math.hypot(point.x - marker.x, point.y - marker.y));
      if (distance < closest) { found = target; closest = distance; }
    }
    return found;
  };
  const pointermove = (event) => {
    hoveredTargetId = targetAt(pointerPosition(event))?.id ?? null;
    canvas.style.cursor = hoveredTargetId ? 'pointer' : 'crosshair';
  };
  const pointerdown = (event) => {
    if (player.paused || (event.button !== undefined && event.button !== 0)) return;
    event.preventDefault();
    container.focus({ preventScroll: true });
    const point = pointerPosition(event), target = targetAt(point);
    held.clear();
    if (target) {
      player.selectedTargetId = target.id;
      const p = approachPoint(target);
      if (Math.hypot(player.x - p.x, player.y - p.y) <= INTERACTION_RADIUS) interact(target.id);
      else { setDestination(player, p.x, p.y); queuedInteraction = target.id; }
    } else {
      const p = unproject(point.x, point.y, camera, width, height);
      setDestination(player, p.x, p.y);
      queuedInteraction = null;
    }
    publish();
  };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', clearMovement);
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('pointermove', pointermove);
  canvas.addEventListener('pointerdown', pointerdown);

  const api = {
    getState: () => snapshot(player),
    setPaused(value) { clearMovement(); player.paused = Boolean(value); publish(); },
    setLocale(value) {
      locale = value === 'zh' ? 'zh' : 'en';
      canvas.setAttribute('aria-label', locale === 'zh' ? '京都四条通可交互街景' : 'Interactive Shijo Street, Kyoto');
      app.repaint();
    },
    reset() {
      clearMovement(); player = refreshProximity(createState());
      previous = { x: player.x, y: player.y }; camera.x = player.x + 2;
      publish();
    },
    markVisited(id, choiceId) {
      if (!targetById.has(id)) return;
      if (!player.visitedIds.includes(id)) player.visitedIds.push(id);
      if (typeof choiceId === 'string') player.choiceIds[id] = choiceId;
      publish();
    },
    markSourceRead(id) {
      if (targetById.has(id) && !player.readSourceIds.includes(id)) player.readSourceIds.push(id);
      publish();
    },
    setSelectedTarget(id) { if (targetById.has(id)) { player.selectedTargetId = id; publish(); } },
    moveTo(x, y) {
      if (player.paused || !Number.isFinite(x) || !Number.isFinite(y)) return;
      held.clear(); queuedInteraction = null; setDestination(player, x, y); publish();
    },
    destroy() {
      destroyed = true; clearMovement(); observer.disconnect();
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', clearMovement); document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointermove', pointermove); canvas.removeEventListener('pointerdown', pointerdown);
      motionPreference.removeEventListener('change', updateMotionPreference);
      app.destroy();
      if (import.meta.env.DEV) delete window.__TOUR_GAME__;
    },
  };
  if (import.meta.env.DEV) {
    window.__TOUR_GAME__ = { snapshot: api.getState,
      targets: () => TARGETS.map(({ id, x, y, approachY }) => ({ id, x, y, approachY })),
      screenPoint: (x, y) => project(x, y, 0, camera, width, height),
      viewport: () => ({ width, height, camera: { ...camera } }),
    };
  }
  resize();
  publish();
  return api;
}
