import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { WORLD } from '../simulation/world.js';

export const CAMERA_DEFAULTS = Object.freeze({ azimuth: 0.22, polar: 0.88, distance: 24 });
const limits = { azimuth: [-0.65, 0.65], polar: [0.66, 1.05], distance: [22, 48] };
export const toScene = (x, north, height = 0) => new THREE.Vector3(x, height, -north);

export function createGuidedCamera(canvas, initial, reducedMotion, onChange) {
  const camera = new THREE.PerspectiveCamera(42, 1, 0.15, 200);
  let frontage = initial.y < WORLD.roadCenterY ? 'south' : 'north';
  let base = frontage === 'south' ? Math.PI : 0;
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
  const targetFor = state => toScene(state.x + (frontage === 'north' ? 1.2 : -1.2),
    state.y + (frontage === 'north' ? -2.2 : 2.2), 0.9);
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
    frontage = state.y < WORLD.roadCenterY ? 'south' : 'north';
    base = frontage === 'south' ? Math.PI : 0; setAzimuthBounds();
    controls.target.copy(targetFor(state));
    pose(base + CAMERA_DEFAULTS.azimuth, CAMERA_DEFAULTS.polar, CAMERA_DEFAULTS.distance);
  }
  reset(initial);
  return {
    camera, controls,
    reset,
    faceTarget(target, state) {
      const next = target.y < WORLD.roadCenterY ? 'south' : 'north';
      if (next === frontage) return false;
      frontage = next; base = frontage === 'south' ? Math.PI : 0; setAzimuthBounds();
      controls.target.copy(targetFor(state));
      pose(base + CAMERA_DEFAULTS.azimuth, CAMERA_DEFAULTS.polar, CAMERA_DEFAULTS.distance);
      return true;
    },
    follow(state, dt, immediate = false) {
      const delta = targetFor(state).sub(controls.target);
      if (delta.lengthSq() > 1e-7) {
        delta.multiplyScalar(immediate ? 1 : 1 - Math.exp(-dt / 120));
        controls.target.add(delta); camera.position.add(delta); onChange();
      }
      return controls.update();
    },
    setReducedMotion(value) {
      const current = this.snapshot();
      controls.enableDamping = false;
      pose(current.azimuth, current.polar, current.distance);
      controls.enableDamping = !value;
    },
    setEnabled(value) {
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
        enabled: controls.enabled, damping: controls.enableDamping,
        projectionMatrix: camera.projectionMatrix.toArray(), matrixWorld: camera.matrixWorld.toArray(),
        limits: structuredClone(limits) };
    },
    dispose() { controls.removeEventListener('change', onChange); controls.dispose(); },
  };
}
