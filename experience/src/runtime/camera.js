import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WORLD } from '../simulation/world.js';
import { CAMERA_DEFAULTS, CAMERA_LIMITS, normalizeCameraPose } from './view-state.js';

export { CAMERA_DEFAULTS };
const limits = CAMERA_LIMITS;
export const toScene = (x, north, height = 0) => new THREE.Vector3(x, height, -north);

export function createGuidedCamera(canvas, initial, reducedMotion, onChange) {
  const camera = new THREE.PerspectiveCamera(42, 1, 0.15, 200);
  let frontage = initial.y < WORLD.roadCenterY ? 'south' : 'north';
  let base = frontage === 'south' ? Math.PI : 0;
  let aimOffset = null, transition = null;
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = !reducedMotion;
  controls.dampingFactor = 0.13;
  controls.rotateSpeed = 0.42;
  controls.zoomSpeed = 0.65;
  const setAzimuthBounds = () => {
    controls.minAzimuthAngle = base + limits.azimuth[0];
    controls.maxAzimuthAngle = base + limits.azimuth[1];
  };
  setAzimuthBounds();
  [controls.minPolarAngle, controls.maxPolarAngle] = limits.polar;
  [controls.minDistance, controls.maxDistance] = limits.distance;
  controls.addEventListener('change', onChange);
  const targetFor = state => toScene(state.x + (aimOffset?.x ?? (frontage === 'north' ? 1.2 : -1.2)),
    state.y + (aimOffset?.y ?? (frontage === 'north' ? -2.2 : 2.2)), aimOffset?.height ?? 0.9);
  const unwrap = angle => base + Math.atan2(Math.sin(angle - base), Math.cos(angle - base));

  function pose(azimuth, polar, distance) {
    // Public-API inertia flush avoids the post-drag reset drift found in the proof.
    const damping = controls.enableDamping;
    controls.enableDamping = false; controls.update();
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSphericalCoords(
      THREE.MathUtils.clamp(distance, ...limits.distance),
      THREE.MathUtils.clamp(polar, ...limits.polar),
      THREE.MathUtils.clamp(unwrap(azimuth), base + limits.azimuth[0], base + limits.azimuth[1])));
    controls.update(); controls.enableDamping = damping;
    camera.updateMatrixWorld(); onChange();
  }
  function reset(state = initial) {
    finishTransition(); aimOffset = null;
    frontage = state.y < WORLD.roadCenterY ? 'south' : 'north';
    base = frontage === 'south' ? Math.PI : 0; setAzimuthBounds();
    controls.target.copy(targetFor(state));
    pose(base + CAMERA_DEFAULTS.azimuth, CAMERA_DEFAULTS.polar, CAMERA_DEFAULTS.distance);
  }
  function restorePose(value, state, animate = false) {
    const next = normalizeCameraPose(value);
    if (!next) return false;
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
        polar: next.polar, distance: next.distance, elapsed: 0, enabled: wasEnabled };
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
  reset(initial);
  return {
    camera, controls,
    reset, restorePose, finishTransition,
    resumeFollow() {
      finishTransition();
      // Looking at an architectural feature may put the actor outside the frame.
      // A deliberate walk returns the aim to the actor without reversing yaw.
      aimOffset = null;
    },
    faceTarget(target, state) {
      const next = target.y < WORLD.roadCenterY ? 'south' : 'north';
      if (next === frontage) return false;
      finishTransition(); aimOffset = null;
      frontage = next; base = frontage === 'south' ? Math.PI : 0; setAzimuthBounds();
      controls.target.copy(targetFor(state));
      pose(base + CAMERA_DEFAULTS.azimuth, CAMERA_DEFAULTS.polar, CAMERA_DEFAULTS.distance);
      return true;
    },
    follow(state, dt, immediate = false) {
      if (transition) {
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
        projectionMatrix: camera.projectionMatrix.toArray(), matrixWorld: camera.matrixWorld.toArray(),
        limits: structuredClone(limits) };
    },
    dispose() { controls.removeEventListener('change', onChange); controls.dispose(); },
  };
}
