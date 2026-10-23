import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getPack, DEFAULT_PACK_ID } from '../packs/registry.js';
import { CAMERA_DEFAULTS, CAMERA_LIMITS, normalizeCameraPose } from './view-state.js';
import { normalizeExplorationCamera } from './exploration-state.js';
import { pointerOperation, pointerMotionChangesCamera, touchPanChangesTarget } from './camera-input.js';

export { CAMERA_DEFAULTS };
export const toScene = (x, north, height = 0) => new THREE.Vector3(x, height, -north);

export function isPlayerInFrame(camera, state) {
  camera.updateMatrixWorld();
  return [0, 1.75].every(height => {
    const point = toScene(state.x, state.y, height).project(camera);
    return point.z >= -1 && point.z <= 1 && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1;
  });
}

export function createGuidedCamera(canvas, initial, reducedMotion, onChange, { solo = false, pack = getPack(DEFAULT_PACK_ID) } = {}) {
  const limits = solo ? pack.camera.limits : CAMERA_LIMITS;
  const defaults = pack.camera.initial, legacyFrontage = pack.camera.legacyFrontage;
  const initialFrontage = state => legacyFrontage && state.y < pack.world.roadCenterY ? 'south' : 'north';
  const camera = new THREE.PerspectiveCamera(pack.camera.fov ?? 42, 1, 0.15, pack.camera.far ?? 200);
  const viewCamera = pack.assets?.sections ? camera.clone() : camera;
  let obstructionResolver = null, obstruction = null;
  let frontage = initialFrontage(initial);
  let base = frontage === 'south' ? Math.PI : 0;
  let aimOffset = null, transition = null, inspecting = false;
  let inspectionAimed = false, inspectionPanned = false, interacting = false, gestureAdopted = false, adopting = false;
  const pointerSamples = new Map();
  let lastPointerId, gestureOperation = null, touchPanStart = null, touchPanLatest = null;
  let currentState = { x: initial.x, y: initial.y, height: initial.height };
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.13;
  controls.rotateSpeed = 0.42;
  controls.zoomSpeed = 0.65;
  const setAzimuthBounds = () => {
    controls.minAzimuthAngle = solo ? -Infinity : base + limits.azimuth[0];
    controls.maxAzimuthAngle = solo ? Infinity : base + limits.azimuth[1];
  };
  setAzimuthBounds();
  [controls.minPolarAngle, controls.maxPolarAngle] = limits.polar;
  [controls.minDistance, controls.maxDistance] = limits.distance;
  function commitInspectionPan() {
    if (inspecting && touchPanChangesTarget(controls, gestureOperation, touchPanStart, touchPanLatest)) inspectionPanned = true;
  }
  function synchronizeCamera(deltaMs = 0) {
    // 同一次触摸更新会依次发送两根手指；绘制前合并中点，区分缩放与主动平移。
    if (deltaMs > 0) commitInspectionPan();
    if (viewCamera === camera) return false;
    const previousPosition = viewCamera.position.clone(), previousRotation = viewCamera.quaternion.clone();
    camera.updateMatrixWorld(); viewCamera.copy(camera);
    obstruction = obstructionResolver?.(camera, controls.target, currentState, {
      preserveActorFrame: !inspecting || !inspectionPanned, minimumSceneDistance: limits.distance[0], deltaMs, reducedMotion }) ?? null;
    if (obstruction) {
      viewCamera.position.copy(obstruction.position); viewCamera.lookAt(obstruction.target);
      viewCamera.updateMatrixWorld();
    }
    return viewCamera.position.distanceToSquared(previousPosition) > 1e-12
      || 1 - Math.abs(viewCamera.quaternion.dot(previousRotation)) > 1e-12;
  }
  let notifiedCamera = null;
  const emitChange = (explicit = true) => {
    synchronizeCamera(); camera.updateMatrixWorld(); viewCamera.updateMatrixWorld();
    const values = [...camera.matrixWorld.elements, ...controls.target,
      ...viewCamera.matrixWorld.elements, ...viewCamera.projectionMatrix.elements];
    // OrbitControls 在距离边界可能因浮点舍入持续报告缩放；只过滤数值精度内的重复通知。
    if (!explicit && notifiedCamera && values.every((value, index) => Math.abs(value - notifiedCamera[index])
      <= 64 * Number.EPSILON * Math.max(1, Math.abs(value), Math.abs(notifiedCamera[index])))) return;
    notifiedCamera = values; onChange();
  };
  const changed = () => {
    if (adopting) return;
    if (solo && inspecting && !transition?.following) {
      const before = controls.target.clone();
      controls.target.set(THREE.MathUtils.clamp(before.x, currentState.x - limits.targetXY, currentState.x + limits.targetXY),
        THREE.MathUtils.clamp(before.y, ...limits.targetHeight),
        THREE.MathUtils.clamp(before.z, -currentState.y - limits.targetXY, -currentState.y + limits.targetXY));
      camera.position.add(controls.target.clone().sub(before));
      aimOffset = { x: controls.target.x - currentState.x, y: -controls.target.z - currentState.y,
        height: controls.target.y };
      camera.updateMatrixWorld();
    }
    emitChange(false);
  };
  function beginCameraInput(operation) {
    if (inspecting) {
      inspectionAimed = true;
      // 平移明确改变观察目标；绕转、俯仰和缩放继续保留人物与街道构图。
      if (operation === 'pan') inspectionPanned = true;
    }
    if (viewCamera === camera || !obstruction || (!obstruction.active && !obstruction.settling)) return;
    if (transition) {
      const enabled = transition.enabled; transition = null; controls.enabled = enabled; setAzimuthBounds();
    }
    // 只有实际相机输入采用可见视点；模式入口与点击选择不会覆盖保存的构图意图。
    const visibleTarget = obstruction.target.clone(), offset = viewCamera.position.clone().sub(visibleTarget);
    const distance = offset.length(), damping = controls.enableDamping;
    if (distance < .001) return;
    adopting = true; controls.enableDamping = false; controls.update();
    controls.target.copy(visibleTarget);
    camera.position.copy(visibleTarget).addScaledVector(offset.divideScalar(distance), Math.max(limits.distance[0], distance));
    aimOffset = { x: visibleTarget.x - currentState.x, y: -visibleTarget.z - currentState.y, height: visibleTarget.y };
    controls.update(); controls.enableDamping = damping; adopting = false;
    camera.updateMatrixWorld(); emitChange();
  }
  const interactionStarted = () => {
    interacting = true; gestureAdopted = false;
    gestureOperation = pointerOperation(controls, pointerSamples.get(lastPointerId) ?? pointerSamples.values().next().value, pointerSamples.size);
    touchPanStart = gestureOperation === 'dolly-pan' ? [...pointerSamples.values()] : null;
    touchPanLatest = touchPanStart;
  };
  const interactionEnded = () => {
    interacting = false; gestureAdopted = false; gestureOperation = null; touchPanStart = null; touchPanLatest = null;
  };
  const pointerStarted = event => {
    if (!controls.enabled || pointerSamples.has(event.pointerId)) return;
    lastPointerId = event.pointerId;
    pointerSamples.set(event.pointerId, { type: event.pointerType, button: event.button,
      modified: event.ctrlKey || event.metaKey || event.shiftKey,
      x: event.pointerType === 'touch' ? event.pageX : event.clientX,
      y: event.pointerType === 'touch' ? event.pageY : event.clientY });
    if (event.pointerType === 'touch' && pointerSamples.size > 2) {
      gestureOperation = null; touchPanStart = null; touchPanLatest = null;
    }
  };
  const pointerMoved = event => {
    const previous = pointerSamples.get(event.pointerId);
    if (!previous || !controls.enabled) return;
    const next = { ...previous, x: event.pointerType === 'touch' ? event.pageX : event.clientX,
      y: event.pointerType === 'touch' ? event.pageY : event.clientY };
    pointerSamples.set(event.pointerId, next);
    const other = [...pointerSamples].find(([id]) => id !== event.pointerId)?.[1];
    if (!interacting || !pointerMotionChangesCamera(controls, gestureOperation, previous, next, other)) return;
    if (gestureOperation === 'dolly-pan') touchPanLatest = [...pointerSamples.values()];
    if (gestureAdopted) return;
    gestureAdopted = true; beginCameraInput(gestureOperation);
  };
  const pointerEnded = event => { commitInspectionPan(); pointerSamples.delete(event.pointerId); };
  const wheelMoved = event => {
    if (controls.enabled && controls.enableZoom && (!interacting || gestureOperation === null) && event.deltaY !== 0) beginCameraInput('zoom');
  };
  controls.addEventListener('change', changed);
  controls.addEventListener('start', interactionStarted);
  controls.addEventListener('end', interactionEnded);
  canvas?.addEventListener('pointerdown', pointerStarted, true);
  canvas?.addEventListener('pointermove', pointerMoved, true);
  canvas?.addEventListener('pointerup', pointerEnded, true);
  canvas?.addEventListener('pointercancel', pointerEnded, true);
  canvas?.addEventListener('wheel', wheelMoved, { capture: true, passive: true });
  const targetFor = state => toScene(state.x + (aimOffset?.x ?? pack.camera.followOffset?.x ?? (frontage === 'north' ? 1.2 : -1.2)),
    state.y + (aimOffset?.y ?? pack.camera.followOffset?.y ?? (frontage === 'north' ? -2.2 : 2.2)),
    aimOffset?.height ?? pack.camera.followOffset?.height ?? 0.9);
  const unwrap = angle => base + Math.atan2(Math.sin(angle - base), Math.cos(angle - base));

  function pose(azimuth, polar, distance) {
    // Public-API inertia flush avoids the post-drag reset drift found in the proof.
    const damping = controls.enableDamping;
    controls.enableDamping = false; controls.update();
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSphericalCoords(
      THREE.MathUtils.clamp(distance, ...limits.distance),
      THREE.MathUtils.clamp(polar, ...limits.polar),
      solo ? azimuth : THREE.MathUtils.clamp(unwrap(azimuth), base + limits.azimuth[0], base + limits.azimuth[1])));
    controls.update(); controls.enableDamping = damping;
    camera.updateMatrixWorld(); emitChange();
  }
  function reset(state = initial) {
    inspectionAimed = false; inspectionPanned = false;
    currentState = { x: state.x, y: state.y, height: state.height };
    finishTransition(); aimOffset = defaults.targetOffset ? { ...defaults.targetOffset } : null;
    frontage = initialFrontage(state);
    base = frontage === 'south' ? Math.PI : 0; setAzimuthBounds();
    controls.target.copy(targetFor(state));
    pose(base + defaults.azimuth, defaults.polar, defaults.distance);
  }
  function restorePose(value, state, animate = false, following = false) {
    const next = solo ? normalizeExplorationCamera(value, limits) : normalizeCameraPose(value);
    if (!next) return false;
    inspectionAimed = inspecting && !following; inspectionPanned = inspectionAimed;
    currentState = { x: state.x, y: state.y, height: state.height };
    const fromTarget = controls.target.clone(), fromPosition = camera.position.clone();
    const wasEnabled = transition?.enabled ?? controls.enabled;
    transition = null;
    aimOffset = next.targetOffset;
    frontage = Math.cos(next.azimuth) < 0 ? 'south' : 'north';
    base = frontage === 'south' ? Math.PI : 0; setAzimuthBounds();
    controls.target.copy(targetFor(state));
    pose(next.azimuth, next.polar, next.distance);
    if (animate && !reducedMotion) {
      const from = new THREE.Spherical().setFromVector3(fromPosition.clone().sub(fromTarget));
      transition = { fromTarget, from, toTarget: controls.target.clone(), toPosition: camera.position.clone(),
        angle: Math.atan2(Math.sin(next.azimuth - from.theta), Math.cos(next.azimuth - from.theta)),
        polar: next.polar, distance: next.distance, elapsed: 0, enabled: wasEnabled, following };
      controls.enabled = false;
      controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity;
      controls.target.copy(fromTarget); camera.position.copy(fromPosition);
      controls.update(); emitChange();
    } else controls.enabled = wasEnabled;
    return true;
  }
  function finishTransition() {
    if (!transition) return;
    const next = transition; transition = null;
    controls.target.copy(next.toTarget); camera.position.copy(next.toPosition);
    controls.enabled = next.enabled; setAzimuthBounds(); controls.update(); emitChange();
  }
  function resumeFollow() {
    if (pack.camera.preserveFramingOnWalk) {
      if (transition?.following || isPlayerInFrame(viewCamera, currentState)) return;
      // 开始行走时只恢复画面外的人物，保留用户的环视方向、俯仰与缩放。
      restorePose({ azimuth: controls.getAzimuthalAngle(), polar: controls.getPolarAngle(),
        distance: controls.getDistance(), targetOffset: pack.camera.followOffset }, currentState, true, true);
      return;
    }
    finishTransition();
    // 主动行走恢复人物构图，环视方向保持不变。
    aimOffset = null;
    if (solo && inspecting) {
      const next = targetFor(currentState);
      camera.position.add(next.clone().sub(controls.target)); controls.target.copy(next);
      controls.update(); changed();
    }
  }
  reset(initial);
  return {
    camera: viewCamera, controls, synchronizeCamera,
    getMovementAzimuth() {
      if (viewCamera === camera) return controls.getAzimuthalAngle();
      // 行走方向跟随实际画面；保存的 OrbitControls 方向继续保留用户构图意图。
      const forward = viewCamera.getWorldDirection(new THREE.Vector3());
      return Math.atan2(-forward.x, -forward.z);
    },
    setObstructionResolver(value) { obstructionResolver = value; synchronizeCamera(); },
    reset, restorePose, finishTransition, resumeFollow,
    setInspecting(value) {
      const leaving = inspecting && !value;
      const next = solo && Boolean(value);
      if (next !== inspecting) { inspectionAimed = false; inspectionPanned = false; }
      inspecting = next; controls.enablePan = inspecting;
      if (leaving && pack.camera.preserveFramingOnWalk) resumeFollow();
    },
    faceTarget(target, state) {
      if (!legacyFrontage) return false;
      const next = initialFrontage(target);
      if (next === frontage) return false;
      finishTransition(); aimOffset = null;
      frontage = next; base = frontage === 'south' ? Math.PI : 0; setAzimuthBounds();
      controls.target.copy(targetFor(state));
      pose(base + defaults.azimuth, defaults.polar, defaults.distance);
      return true;
    },
    follow(state, dt, immediate = false) {
      currentState = { x: state.x, y: state.y, height: state.height };
      if (transition) {
        if (transition.following) {
          const movement = targetFor(state).sub(transition.toTarget);
          transition.toTarget.add(movement); transition.toPosition.add(movement);
        }
        transition.elapsed += dt;
        const t = immediate ? 1 : Math.min(1, transition.elapsed / 420);
        const eased = t * t * (3 - 2 * t);
        controls.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
        camera.position.copy(controls.target).add(new THREE.Vector3().setFromSphericalCoords(
          THREE.MathUtils.lerp(transition.from.radius, transition.distance, eased),
          THREE.MathUtils.lerp(transition.from.phi, transition.polar, eased),
          transition.from.theta + transition.angle * eased));
        controls.update(); emitChange();
        if (t === 1) finishTransition();
        return true;
      }
      const delta = targetFor(state).sub(controls.target);
      if (delta.lengthSq() > 1e-7) {
        delta.multiplyScalar(immediate ? 1 : 1 - Math.exp(-dt / 120));
        controls.target.add(delta); camera.position.add(delta); emitChange();
      }
      return controls.update();
    },
    setReducedMotion(value) {
      finishTransition(); reducedMotion = value;
      const current = this.snapshot();
      controls.enableDamping = false;
      pose(current.azimuth, current.polar, current.distance);
      controls.enableDamping = !value;
    },
    setEnabled(value) {
      finishTransition();
      const current = this.snapshot();
      pose(current.azimuth, current.polar, current.distance);
      controls.enabled = value;
    },
    rotate(delta) { if (delta === 0) return; beginCameraInput('rotate'); pose(unwrap(controls.getAzimuthalAngle()) + delta, controls.getPolarAngle(), controls.getDistance()); },
    tilt(delta) { if (delta === 0) return; beginCameraInput('tilt'); pose(controls.getAzimuthalAngle(), controls.getPolarAngle() + delta, controls.getDistance()); },
    pan(right, up) {
      if (!solo || !inspecting || right === 0 && up === 0) return;
      beginCameraInput('pan');
      camera.updateMatrixWorld();
      const delta = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(right)
        .add(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(up));
      controls.target.add(delta); camera.position.add(delta);
      changed(); controls.update();
    },
    zoom(delta) { if (delta === 0) return; beginCameraInput('zoom'); pose(controls.getAzimuthalAngle(), controls.getPolarAngle(), controls.getDistance() + delta); },
    resize(width, height) { camera.aspect = width / height; camera.updateProjectionMatrix(); emitChange(); },
    project(x, north, height, width, viewportHeight) {
      const projected = toScene(x, north, height).project(viewCamera);
      return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * viewportHeight / 2,
        visible: projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 };
    },
    snapshot() {
      camera.updateMatrixWorld(); viewCamera.updateMatrixWorld();
      return { position: viewCamera.position.toArray(), target: controls.target.toArray(),
        ...(viewCamera !== camera ? { desiredPosition: camera.position.toArray(),
          viewTarget: (obstruction?.target ?? controls.target).toArray(),
          obstruction: obstruction ? { active: obstruction.active, desiredDistance: obstruction.desiredDistance,
            actualDistance: obstruction.actualDistance, targetAdjusted: obstruction.targetAdjusted,
            framingRecovered: obstruction.framingRecovered, actorInFrame: obstruction.actorInFrame,
            actorVerticalOccupancy: obstruction.actorVerticalOccupancy, recoveryFits: obstruction.recoveryFits,
            minimumSceneDistance: obstruction.minimumSceneDistance, clearance: obstruction.clearance,
            angleOffset: obstruction.angleOffset, settling: obstruction.settling } : null } : {}),
        azimuth: controls.getAzimuthalAngle(), polar: controls.getPolarAngle(), distance: controls.getDistance(),
        frontage, azimuthBase: base, relativeAzimuth: unwrap(controls.getAzimuthalAngle()) - base,
        enabled: controls.enabled, damping: controls.enableDamping, transitioning: Boolean(transition),
        solo, inspecting, inspectionAimed, inspectionPanned, panning: controls.enablePan,
        projectionMatrix: viewCamera.projectionMatrix.toArray(), matrixWorld: viewCamera.matrixWorld.toArray(),
        limits: structuredClone(limits) };
    },
    dispose() { controls.removeEventListener('change', changed); controls.removeEventListener('start', interactionStarted);
      controls.removeEventListener('end', interactionEnded);
      canvas?.removeEventListener('pointerdown', pointerStarted, true);
      canvas?.removeEventListener('pointermove', pointerMoved, true);
      canvas?.removeEventListener('pointerup', pointerEnded, true);
      canvas?.removeEventListener('pointercancel', pointerEnded, true);
      canvas?.removeEventListener('wheel', wheelMoved, true); pointerSamples.clear(); controls.dispose(); },
  };
}
