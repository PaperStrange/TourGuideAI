import test from 'node:test';
import assert from 'node:assert/strict';
import { calibrate, analyzePerformance, readArchive } from '../tools/realism-calibration.mjs';

test('immutable candidate 13 reports retain their failures and distinct native visibility observation', () => {
  const result = calibrate();
  assert.equal(result.evidence.reduce((sum, item) => sum + item.verifiedFiles, 0), 17);
  assert.equal(result.performance.originalChecks.filter(check => !check.pass).length, 3);
  assert(result.performance.entries.every(entry => entry.firstUsableStatus === 'pass' && entry.fullQualityStatus === 'unverified'));
  assert.equal(result.performance.input.status, 'fail');
  assert(Math.abs(result.performance.input.p95Ms - 892) < .01);
  assert(result.performance.input.handlerP95Ms < 100);
  assert(result.performance.input.queueP95Ms > 800);
  assert.equal(result.performance.frames.observedStatus, 'fail');
  assert.equal(result.performance.frames.completenessStatus, 'unverified');
  assert.equal(result.performance.frames.gaps, 8);
  assert.equal(result.performance.frames.groups.find(group => group.kind === 'orbit').intervals, 0);
  assert.equal(result.q03.status, 'fail');
  assert(result.q03.durationsMs.every(value => value > 1000));
  assert.equal(result.performance.hidden.originalStatus, 'fail');
  assert.equal(result.nativeVisibility.status, 'pass');
  assert.equal(result.acceptance.status, 'unverified');
});

test('missing or truncated retained reports cannot be calibrated', () => {
  assert.throws(() => analyzePerformance(undefined), /four-entry/);
  const { report } = readArchive('candidate-13');
  const incomplete = structuredClone(report);
  incomplete.entries.pop();
  assert.throws(() => analyzePerformance(incomplete), /four-entry/);
  const absentTrace = structuredClone(report);
  delete absentTrace.interactions;
  assert.throws(() => analyzePerformance(absentTrace), /input trace/);
});
