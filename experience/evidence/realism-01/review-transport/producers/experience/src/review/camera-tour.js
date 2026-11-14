import { MathUtils, Spherical, Vector3 } from 'three';

export const TOUR_PATH = Object.freeze({
  arcRadians: 0.7,
  durationSeconds: 28,
  minimumApproachSeconds: 2.5,
  maximumApproachSeconds: 8,
  maximumStepSeconds: 0.1,
});

const ease = value => value * value * (3 - 2 * value);
const ready = view => view?.firstView && !view.disposed && !['error', 'loading'].includes(view.status);

export function createCameraTour({ scene, reference, onChange = () => {} }) {
  if (typeof scene?.getView !== 'function' || typeof scene?.setCameraPose !== 'function') {
    throw new TypeError('Camera tour requires scene pose controls');
  }
  for (const key of ['position', 'target']) {
    if (!Array.isArray(reference?.[key]) || reference[key].length !== 3 || !reference[key].every(Number.isFinite)) {
      throw new TypeError(`Invalid tour reference ${key}`);
    }
  }
  const referenceTarget = new Vector3().fromArray(reference.target);
  const referenceOffset = new Vector3().fromArray(reference.position).sub(referenceTarget);
  if (referenceOffset.lengthSq() === 0) throw new RangeError('Tour reference requires a camera offset');
  const referenceSpherical = new Spherical().setFromVector3(referenceOffset);
  let status = 'idle';
  let phase = 'arc';
  let progress = 0;
  let direction = 1;
  let pauseReason = null;
  let animationFrame = 0;
  let previousTime = 0;
  let previousDraw = 0;
  let poseUpdates = 0;
  let pendingCompletion = false;
  let transition = null;
  let disposed = false;

  function poseAt(value) {
    const spherical = referenceSpherical.clone();
    spherical.theta += (ease(value) - 0.5) * TOUR_PATH.arcRadians;
    return { position: new Vector3().setFromSpherical(spherical).add(referenceTarget).toArray(),
      target: referenceTarget.toArray() };
  }

  function getState() {
    return { status, phase, progress, direction, pauseReason, poseUpdates,
      lastPoseRequestedAfterFrame: previousDraw,
      approachProgress: transition ? Math.min(1, transition.elapsed / transition.duration) : 1,
      arcRadians: TOUR_PATH.arcRadians, durationSeconds: TOUR_PATH.durationSeconds,
      reference: { position: [...reference.position], target: [...reference.target] },
      endpointPositions: [poseAt(0).position, poseAt(1).position] };
  }

  function emit() { onChange(getState()); }

  function prepareApproach() {
    const current = scene.getView();
    const destination = poseAt(progress);
    const originTarget = new Vector3().fromArray(current.target);
    const origin = new Vector3().fromArray(current.position);
    const distance = origin.distanceTo(new Vector3().fromArray(destination.position));
    if (distance < 0.000001 && originTarget.distanceTo(referenceTarget) < 0.000001) {
      transition = null;
      phase = 'arc';
      return;
    }
    // 沿着目标周围的球面平滑接入；保留来源的高度和观察半径作为路径终点。
    const originSpherical = new Spherical().setFromVector3(origin.sub(originTarget));
    const destinationSpherical = referenceSpherical.clone();
    destinationSpherical.theta += (ease(progress) - 0.5) * TOUR_PATH.arcRadians;
    const thetaDelta = MathUtils.euclideanModulo(destinationSpherical.theta - originSpherical.theta + Math.PI, Math.PI * 2) - Math.PI;
    transition = { originTarget, originSpherical, destinationSpherical, thetaDelta, elapsed: 0,
      duration: MathUtils.clamp(distance / 5, TOUR_PATH.minimumApproachSeconds, TOUR_PATH.maximumApproachSeconds) };
    phase = 'approach';
  }

  function schedule() {
    if (!disposed && status === 'running' && !animationFrame) animationFrame = requestAnimationFrame(step);
  }

  function step(time) {
    animationFrame = 0;
    if (disposed || status !== 'running') return;
    const view = scene.getView();
    if (!ready(view)) { pause(view.status === 'error' ? 'error' : 'loading'); return; }
    // 每次推进都等待实际提交的新画面；长时间停顿不会造成镜头跳跃。
    const submitted = view.drawnView;
    const poseDrawn = submitted && view.matrixWorld.every((value, index) => Math.abs(value - submitted.matrixWorld[index]) < 1e-7)
      && view.projectionMatrix.every((value, index) => Math.abs(value - submitted.projectionMatrix[index]) < 1e-7);
    if (view.frames <= previousDraw || !poseDrawn) { schedule(); return; }
    if (pendingCompletion) {
      pendingCompletion = false;
      status = 'complete';
      emit();
      return;
    }
    const delta = Math.min(TOUR_PATH.maximumStepSeconds, Math.max(0, (time - previousTime) / 1000));
    previousTime = time;
    let pose;
    if (transition) {
      transition.elapsed = Math.min(transition.duration, transition.elapsed + delta);
      const fraction = ease(transition.elapsed / transition.duration);
      const spherical = transition.originSpherical.clone();
      spherical.theta += transition.thetaDelta * fraction;
      spherical.phi = MathUtils.lerp(spherical.phi, transition.destinationSpherical.phi, fraction);
      spherical.radius = MathUtils.lerp(spherical.radius, transition.destinationSpherical.radius, fraction);
      spherical.makeSafe();
      const target = transition.originTarget.clone().lerp(referenceTarget, fraction);
      pose = { position: new Vector3().setFromSpherical(spherical).add(target).toArray(), target: target.toArray() };
      if (transition.elapsed >= transition.duration) {
        transition = null;
        phase = 'arc';
        emit();
      }
    } else {
      progress = MathUtils.clamp(progress + direction * delta / TOUR_PATH.durationSeconds, 0, 1);
      pose = poseAt(progress);
    }
    if (!scene.setCameraPose(pose)) { pause('loading'); return; }
    previousDraw = view.frames;
    poseUpdates += 1;
    if (phase === 'arc' && ((direction === 1 && progress === 1) || (direction === -1 && progress === 0))) {
      pendingCompletion = true;
    }
    schedule();
  }

  function start() {
    if (disposed || !ready(scene.getView())) return false;
    if (status === 'running') return true;
    if ((progress === 1 && direction === 1) || (progress === 0 && direction === -1)) direction *= -1;
    pendingCompletion = false;
    prepareApproach();
    status = 'running';
    pauseReason = null;
    previousTime = performance.now();
    previousDraw = scene.getView().frames;
    emit();
    schedule();
    return true;
  }

  function pause(reason = 'button') {
    if (status !== 'running') return;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    status = 'paused';
    pauseReason = reason;
    emit();
  }

  function reverse() {
    if (disposed) return;
    direction *= -1;
    pendingCompletion = false;
    if (status === 'idle') progress = direction === 1 ? 0 : 1;
    if (phase === 'approach' && (progress === 0 || progress === 1)) {
      progress = direction === 1 ? 0 : 1;
      prepareApproach();
    }
    if (status === 'complete') status = 'paused';
    emit();
  }

  function reset() {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    status = 'idle';
    phase = 'arc';
    progress = 0;
    direction = 1;
    pauseReason = null;
    transition = null;
    poseUpdates = 0;
    pendingCompletion = false;
    emit();
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  return Object.freeze({ start, pause, reverse, reset, dispose, getState });
}
