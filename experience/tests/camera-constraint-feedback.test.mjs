import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createCameraConstraintFeedback, createOrbitGestureMeasurement } from '../src/runtime/camera-constraint-feedback.js';

const trace = JSON.parse(await readFile(new URL('./fixtures/source274-orbit-constraint.json', import.meta.url)));
const azimuth = camera => Math.atan2(camera.position[0] - camera.viewTarget[0], camera.position[2] - camera.viewTarget[2]);
const delta = value => Math.atan2(Math.sin(value), Math.cos(value));
function replay(feedback, input, settling = input.after.obstruction.settling) {
  feedback.recordOrbit({ startAzimuth: azimuth(input.before),
    requestedDelta: delta(input.after.azimuth - azimuth(input.before)) });
  feedback.observe({ azimuth: azimuth(input.after), active: input.after.obstruction.active, settling });
}

test('the captured 40 native orbit attempts report the repeated constraint once, after genuine progress stops', () => {
  assert.equal(trace.sourceSha256, '325abe1a5ec772f0eb0284aebf7a047feac4111b9ce3450bb7ff0ae25258f500');
  assert.equal(trace.driverSha256, 'aa4c5b0096836627f15b0aaa6135b954c3e195c0c3e31dc5d230e454bc9eefa1');
  assert.equal(trace.inputs.length, 40);
  const changes = [], blockedAt = [], feedback = createCameraConstraintFeedback(value => changes.push(value));
  trace.inputs.forEach((input, index) => {
    assert.equal(input.key, 'l');
    assert.ok(Math.abs(delta(input.after.azimuth - azimuth(input.before)) - .08) < 1e-12);
    replay(feedback, input);
    if (feedback.isBlocked()) blockedAt.push(index);
  });
  assert.equal(blockedAt[0], 9);
  assert.equal(blockedAt.length, 31);
  assert.deepEqual(changes, [true]);
});

test('the same constrained observations from a restore or passive camera update never imply deliberate attempts', () => {
  const changes = [], feedback = createCameraConstraintFeedback(value => changes.push(value));
  for (const input of trace.inputs) feedback.observe({ azimuth: azimuth(input.after), ...input.after.obstruction });
  assert.deepEqual(changes, []);
  assert.equal(feedback.isBlocked(), false);
});

test('unfinished recovery and repeated observations count only one completed attempt', () => {
  const changes = [], feedback = createCameraConstraintFeedback(value => changes.push(value)), input = trace.inputs[7];
  replay(feedback, input, true);
  for (let index = 0; index < 200; index++) feedback.observe({ azimuth: azimuth(input.after), active: true, settling: true });
  assert.deepEqual(changes, []);
  feedback.observe({ azimuth: azimuth(input.after), active: true, settling: false });
  for (let index = 0; index < 200; index++) feedback.observe({ azimuth: azimuth(input.after), active: true, settling: false });
  assert.deepEqual(changes, []);
  replay(feedback, trace.inputs[8]); assert.deepEqual(changes, []);
  replay(feedback, trace.inputs[9]); assert.deepEqual(changes, [true]);
});

test('reversing the requested direction clears the hint before a new sequence', () => {
  const changes = [], feedback = createCameraConstraintFeedback(value => changes.push(value));
  for (const input of trace.inputs.slice(7, 10)) replay(feedback, input);
  const startAzimuth = azimuth(trace.inputs[9].after);
  feedback.recordOrbit({ startAzimuth, requestedDelta: -.08 });
  assert.deepEqual(changes, [true, false]);
  feedback.observe({ azimuth: startAzimuth, active: true, settling: false });
  assert.equal(feedback.isBlocked(), false);
});

test('actual progress clears a displayed constraint even during settling, while free-space steps never show it', () => {
  const changes = [], feedback = createCameraConstraintFeedback(value => changes.push(value));
  for (const input of trace.inputs.slice(0, 3)) replay(feedback, input);
  assert.deepEqual(changes, []);
  for (const input of trace.inputs.slice(7, 10)) replay(feedback, input);
  feedback.recordOrbit({ startAzimuth: azimuth(trace.inputs[9].after), requestedDelta: .08 });
  feedback.observe({ azimuth: azimuth(trace.inputs[9].after) + .04, active: true, settling: true });
  assert.deepEqual(changes, [true, false]);
});

test('clear is idempotent and cancels pending attempts for other controls and lifecycle changes', () => {
  const changes = [], feedback = createCameraConstraintFeedback(value => changes.push(value));
  for (const input of trace.inputs.slice(7, 10)) replay(feedback, input);
  replay(feedback, trace.inputs[10], true);
  feedback.clear(); feedback.clear();
  feedback.observe({ azimuth: azimuth(trace.inputs[10].after), active: true, settling: false });
  assert.deepEqual(changes, [true, false]);
  replay(feedback, trace.inputs[11]); replay(feedback, trace.inputs[12]);
  assert.equal(feedback.isBlocked(), false);
});

test('a superseded orbit contributes no completed attempt and tiny input or an unconstrained zoom limit cannot raise the hint', () => {
  const changes = [], feedback = createCameraConstraintFeedback(value => changes.push(value));
  replay(feedback, trace.inputs[7], true); feedback.cancelPendingOrbit();
  feedback.observe({ azimuth: azimuth(trace.inputs[7].after), active: true, settling: false });
  replay(feedback, trace.inputs[8]); replay(feedback, trace.inputs[9]);
  assert.equal(feedback.isBlocked(), false);
  feedback.clear();
  for (let index = 0; index < 5; index++) {
    feedback.recordOrbit({ startAzimuth: 0, requestedDelta: .001 });
    feedback.observe({ azimuth: 0, active: true, settling: false });
    feedback.recordOrbit({ startAzimuth: 0, requestedDelta: .08 });
    feedback.observe({ azimuth: 0, active: false, settling: false });
  }
  assert.deepEqual(changes, []);
});

test('actual OrbitControls damping remains unfinished when a change event and 100ms frame observation share one frame', () => {
  const captured = trace.inputs[0].before, camera = new THREE.PerspectiveCamera(42, 1, .15, 200);
  camera.position.fromArray(captured.position);
  const controls = new OrbitControls(camera, null);
  controls.target.fromArray(captured.viewTarget); controls.update();
  controls.enableDamping = true; controls.dampingFactor = .13;
  const measurement = createOrbitGestureMeasurement({ startAzimuth: azimuth(captured), requestedAzimuth: controls.getAzimuthalAngle() });
  let eventObservations = 0, measured, frames = 0;
  const changed = () => {
    eventObservations++; measurement.observe(controls.getAzimuthalAngle(), 0);
  };
  controls.addEventListener('change', changed);
  try {
    controls.rotateLeft(-.08);
    assert.equal(measurement.observe(controls.getAzimuthalAngle(), 100).settled, false,
      'The frame contains the rotation already seen by its synchronous change listener.');
    for (; frames < 300; frames++) {
      const before = controls.getAzimuthalAngle(); controls.update();
      const after = controls.getAzimuthalAngle();
      measured = measurement.observe(after, 100);
      if (Math.abs(delta(after - before)) > 1e-7) assert.equal(measured.settled, false);
      if (measured.settled) break;
    }
    assert.ok(eventObservations > 1);
    assert.ok(frames > 10 && frames < 300);
    assert.equal(measured.settled, true);
    assert.ok(Math.abs(measured.requestedDelta - .08) < .000001);
  } finally {
    // 此实例没有连接 DOM；移除测试添加的真实事件监听即可释放引用。
    controls.removeEventListener('change', changed);
  }
});

test('zero-time repeated observations neither advance stability nor discard motion before the frame boundary', () => {
  const measurement = createOrbitGestureMeasurement({ startAzimuth: 0, requestedAzimuth: 0 });
  measurement.observe(.08, 0);
  for (let index = 0; index < 100; index++) assert.equal(measurement.observe(.08, 0).settled, false);
  assert.equal(measurement.observe(.08, 100).settled, false);
  assert.equal(measurement.observe(.08, 50).settled, false);
  assert.equal(measurement.observe(.08, 50).settled, true);
  assert.equal(measurement.observe(.09, 0).settled, false);
  assert.equal(measurement.observe(.09, 100).settled, false);
  assert.equal(measurement.observe(.09, 100).settled, true);
});
