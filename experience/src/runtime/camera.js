import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getPack, DEFAULT_PACK_ID } from '../packs/registry.js';
import { CAMERA_DEFAULTS, CAMERA_LIMITS, normalizeCameraPose } from './view-state.js';
import { normalizeExplorationCamera } from './exploration-state.js';

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
  const camera = new THREE.PerspectiveCamera(pack.camera.fov ?? 42, 1, 0.15, 200);
  let frontage = initialFrontage(initial);
  let base = frontage === 'south' ? Math.PI : 0;
  let aimOffset = null, transition = null, inspecting = false;
  let currentState = { x: initial.x, y: initial.y };
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
  const changed = () => {
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
    onChange();
  };
  controls.addEventListener('change', changed);
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
    camera.updateMatrixWorld(); onChange();
  }
  function reset(state = initial) {
    currentState = { x: state.x, y: state.y };
    finishTransition(); aimOffset = defaults.targetOffset ? { ...defaults.targetOffset } : null;
    frontage = initialFrontage(state);
    base = frontage === 'south' ? Math.PI : 0; setAzimuthBounds();
    controls.target.copy(targetFor(state));
    pose(base + defaults.azimuth, defaults.polar, defaults.distance);
  }
  function restorePose(value, state, animate = false, following = false) {
    const next = solo ? normalizeExplorationCamera(value, limits) : normalizeCameraPose(value);
    if (!next) return false;
    currentState = { x: state.x, y: state.y };
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
      controls.update(); onChange();
    } else controls.enabled = wasEnabled;
    return true;
  }
  function finishTransition() {
    if (!transition) return;
    const next = transition; transition = null;
    controls.target.copy(next.toTarget); camera.position.copy(next.toPosition);
    controls.enabled = next.enabled; setAzimuthBounds(); controls.update(); onChange();
  }
  function resumeFollow() {
    if (pack.camera.preserveFramingOnWalk) {
      if (transition?.following || isPlayerInFrame(camera, currentState)) return;
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
    camera, controls,
    reset, restorePose, finishTransition, resumeFollow,
    setInspecting(value) {
      const leaving = inspecting && !value;
      inspecting = solo && Boolean(value); controls.enablePan = inspecting;
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
      currentState = { x: state.x, y: state.y };
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
        controls.update(); onChange();
        if (t === 1) finishTransition();
        return true;
      }
      const delta = targetFor(state).sub(controls.target);
      if (delta.lengthSq() > 1e-7) {
        delta.multiplyScalar(immediate ? 1 : 1 - Math.exp(-dt / 120));
        controls.target.add(delta); camera.position.add(delta); onChange();
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
    rotate(delta) { pose(unwrap(controls.getAzimuthalAngle()) + delta, controls.getPolarAngle(), controls.getDistance()); },
    tilt(delta) { pose(controls.getAzimuthalAngle(), controls.getPolarAngle() + delta, controls.getDistance()); },
    pan(right, up) {
      if (!solo || !inspecting) return;
      camera.updateMatrixWorld();
      const delta = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(right)
        .add(new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(up));
      controls.target.add(delta); camera.position.add(delta);
      changed(); controls.update();
    },
    zoom(delta) { pose(controls.getAzimuthalAngle(), controls.getPolarAngle(), controls.getDistance() + delta); },
    resize(width, height) { camera.aspect = width / height; camera.updateProjectionMatrix(); onChange(); },
    project(x, north, height, width, viewportHeight) {
      const projected = toScene(x, north, height).project(camera);
      return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * viewportHeight / 2,
        visible: projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 };
    },
    snapshot() {
      camera.updateMatrixWorld();
      return { position: camera.position.toArray(), target: controls.target.toArray(),
        azimuth: controls.getAzimuthalAngle(), polar: controls.getPolarAngle(), distance: controls.getDistance(),
        frontage, azimuthBase: base, relativeAzimuth: unwrap(controls.getAzimuthalAngle()) - base,
        enabled: controls.enabled, damping: controls.enableDamping, transitioning: Boolean(transition),
        solo, inspecting, panning: controls.enablePan,
        projectionMatrix: camera.projectionMatrix.toArray(), matrixWorld: camera.matrixWorld.toArray(),
        limits: structuredClone(limits) };
    },
    dispose() { controls.removeEventListener('change', changed); controls.dispose(); },
  };
}
