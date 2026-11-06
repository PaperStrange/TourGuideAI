import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createFrameMeasurement } from '../src/runtime/submitted-frame.js';

const directory = new URL('../evidence/realism-01/measurement/', import.meta.url);
const binding = JSON.parse(readFileSync(new URL('binding.json', directory)));
const bytes = gunzipSync(readFileSync(new URL('result.json.gz', directory)));
const report = JSON.parse(bytes), measurement = createFrameMeasurement();

test('actual diagnostic records preserve their bound report identity and complete trusted inputs', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), binding.files[0].decodedSha256);
  assert.equal(report.protocol, 'neighborhood-starting-segment-v2');
  assert.equal(report.entries.length, 4);
  assert.equal(report.interactions.trace.actions.length, 20);
  assert.ok(report.interactions.trace.actions.every(action => action.browserInput.trusted && action.browserRelease.trusted));
});

test('each captured full-quality observation follows resident resources and their subsequent submitted draw', () => {
  for (const entry of report.entries) {
    const frame = entry.fullQuality.frame;
    assert.equal(measurement.fullQuality(frame), true);
    assert.ok(frame.frame > frame.quality.frameBefore);
    assert.ok(entry.fullQualityObservedMs >= frame.submittedMs);
    assert.ok(entry.fullQualityObservedMs >= entry.firstUsableObservedMs);
    assert.equal(measurement.fullQuality(frame.quality), false);
    const first = entry.observation.trace.firstUsable.state.submittedFrame;
    assert.equal(measurement.fullQuality(first), false);
    assert.equal(measurement.changed(first, frame, 'orbit'), false);
  }
  assert.equal(measurement.fullQuality(null), false);
});

test('recorded input responses require an actual changed camera or player in a newer submitted frame', () => {
  for (const action of report.interactions.trace.actions) {
    const before = action.before.submittedFrame, after = action.response.state.submittedFrame;
    assert.equal(measurement.changed(before, after, action.kind), true);
    assert.equal(measurement.changed(before, before, action.kind), false);
    assert.equal(measurement.changed(after, before, action.kind), false);
    assert.ok(after.drawStartedMs >= action.browserInput.receivedMs);
    assert.ok(action.response.observedMs >= after.submittedMs);
  }
});

test('historical requested azimuth observations cannot establish submitted-camera response', () => {
  const historical = JSON.parse(gunzipSync(readFileSync(new URL(
    '../evidence/neighborhood-20261024/performance/candidate-13/result.json.gz', import.meta.url))));
  for (const action of historical.interactions.trace.actions.filter(action => action.kind === 'orbit')) {
    assert.notEqual(action.before.camera.azimuth, action.response.state.camera.azimuth);
    assert.equal(measurement.changed(action.before, action.response.state, 'orbit'), false);
  }
});

test('the actual input timestamps retain queue time and skipped frame observations', () => {
  const actions = report.interactions.trace.actions;
  const delays = actions.map(action => action.response.observedMs - action.browserInput.eventTimeStamp);
  assert.deepEqual(delays, report.interactions.summary.groups.all.eventTimestampToResponseMs);
  assert.ok(actions.some(action => action.browserInput.receivedMs - action.browserInput.eventTimeStamp > 100));
  assert.equal(report.checks.find(check => check.id === 'input-event-timestamp-response-p95').pass, false);
  assert.ok(report.interactions.trace.frameCounterGaps.length > 0);
  assert.equal(report.checks.find(check => check.id === 'observed-frame-interval-p95').pass, false);
});

test('copied submitted camera matrices stay fixed when the actual Three camera changes later', () => {
  const source = report.entries[0].fullQuality.frame, camera = new THREE.PerspectiveCamera();
  camera.matrixWorld.fromArray(source.camera.matrixWorld);
  camera.projectionMatrix.fromArray(source.camera.projectionMatrix);
  const captured = measurement.capture({ ...source, camera });
  assert.deepEqual(captured.camera, source.camera);
  camera.matrixWorld.makeTranslation(1, 2, 3); camera.fov = 60; camera.updateProjectionMatrix();
  assert.deepEqual(captured.camera, source.camera);
  assert.throws(() => measurement.capture({ ...source, camera,
    drawStartedMs: source.submittedMs + 1 }), /Invalid submitted draw boundary/);
});
