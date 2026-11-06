import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { calibrate, readArchive } from '../tools/realism-calibration.mjs';
import { evaluateBenchmark, evaluateRun, fullQualityGate, inputCompletenessGate, inspectFiles, numericGate,
  runOrderGate, validateComparison, validateManifest, verifyEvidence } from '../tools/realism-benchmark.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const manifestPath = new URL('../sprints/realism-01/benchmark-manifest.json', import.meta.url);
const manifestBytes = readFileSync(manifestPath);
const manifest = JSON.parse(manifestBytes);
const manifestSha256 = createHash('sha256').update(manifestBytes).digest('hex');
const diagnostic = name => JSON.parse(gunzipSync(readFileSync(new URL(
  `../evidence/realism-01/measurement/${name}.json.gz`, import.meta.url))));

test('checked-in draft retains missing device, candidate and participant prerequisites', () => {
  validateManifest(manifest);
  const result = inspectFiles(manifestPath, [], repository);
  assert.equal(result.technicalStatus, 'unverified');
  assert.equal(result.selectionStatus, 'unverified');
  assert(result.gates.every(gate => gate.status === 'unverified'));
  assert.equal(result.runs.length, 0);
  assert(manifest.devices.every(device => device.hardware === null));
  assert(manifest.prerequisites.length >= 6);
});

test('absent results, schema drift and prematurely frozen actual draft cannot pass', () => {
  assert.throws(() => evaluateBenchmark(undefined, [], manifestSha256), /Invalid BenchmarkManifest/);
  const frozen = structuredClone(manifest);
  frozen.status = 'frozen';
  assert.throws(() => evaluateBenchmark(frozen, [], manifestSha256), /unresolved prerequisites/);
  const drifted = structuredClone(manifest);
  drifted.route.edgeCount -= 1;
  assert.throws(() => validateManifest(drifted), /Invalid BenchmarkManifest/);
  assert.throws(() => evaluateRun(undefined), /Invalid RunResult/);
  assert.equal(numericGate('missing measurement', null, 100).status, 'unverified');
});

test('hash-verified historical queue and frame failures retain their numeric classifications', () => {
  const result = calibrate();
  assert.equal(numericGate('queued input', result.performance.input.p95Ms, 100).status, 'fail');
  assert.equal(numericGate('frame intervals', result.performance.frames.p95Ms, 33.3).status, 'fail');
  assert.equal(numericGate('missing orbit cadence', result.performance.frames.groups.find(group => group.kind === 'orbit').p95Ms, 33.3).status, 'unverified');
  for (const duration of result.q03.durationsMs) assert.equal(numericGate('Q03', duration, 500, { strict: true }).status, 'fail');
  for (const entry of result.performance.entries) {
    assert.equal(numericGate(entry.id, entry.firstUsableMs, entry.thresholdMs).status, 'pass');
    assert.equal(fullQualityGate(entry).status, 'unverified');
  }
});

test('original third-person partial-route report cannot masquerade as a frozen full-route result', () => {
  const { report } = readArchive('candidate-13');
  assert.throws(() => evaluateRun(report), /Invalid RunResult/);
  assert.throws(() => evaluateBenchmark(manifest, [report], manifestSha256), /Invalid RunResult/);
});

test('retained route identity is verified and altered provenance is rejected', () => {
  const record = { path: manifest.route.path, sha256: manifest.route.sha256,
    bytes: readFileSync(new URL('../src/neighborhoods/shijo-east/geography.json', import.meta.url)).length };
  verifyEvidence(repository, [record]);
  const changed = structuredClone(record);
  changed.bytes -= 1;
  assert.throws(() => verifyEvidence(repository, [changed]), /Evidence identity differs/);
  assert.throws(() => verifyEvidence(repository, [{ ...record, path: fileURLToPath(manifestPath) }]), /must be relative/);
});

test('every retained dispatched input needs its own response, including a missing response among successful actions', () => {
  const actions = diagnostic('result').interactions.trace.actions;
  const intended = actions.map(action => ({ actionId: action.id }));
  const dispatched = actions.map(action => ({ actionId: action.id, eventTimeStampMs: action.browserInput.eventTimeStamp,
    receivedMs: action.browserInput.receivedMs, trusted: action.browserInput.trusted }));
  const responses = actions.filter(action => action.response).map(action => ({ actionId: action.id,
    eventTimeStampMs: action.browserInput.eventTimeStamp }));
  assert.equal(inputCompletenessGate(intended, dispatched, responses).status, 'pass');
  const missingResponse = inputCompletenessGate(intended, dispatched, responses.slice(1));
  assert.equal(missingResponse.status, 'unverified');
  assert.deepEqual(missingResponse.evidence.missingResponses, [actions[0].id]);
  const missingDispatch = inputCompletenessGate(intended, dispatched.slice(1), responses.slice(1));
  assert.equal(missingDispatch.status, 'unverified');
  assert.deepEqual(missingDispatch.evidence.missingDispatches, [actions[0].id]);
  assert.equal(inputCompletenessGate([], [], []).status, 'unverified');
  assert.throws(() => inputCompletenessGate(intended, dispatched, [...responses, responses[0]]), /Duplicate input/);
});

test('retained diagnostic start times identify a run order contradiction without changing their observations', () => {
  const reports = [diagnostic('development-attempt'), diagnostic('result')];
  const runs = reports.map((report, index) => ({ startedAt: report.startedAt, candidateId: report.protocol,
    device: { id: report.conditions.graphics.unmaskedRenderer },
    condition: { locale: report.conditions.locale, lighting: report.conditions.lighting, session: index + 1 } }));
  const order = runs.map(run => ({ candidateId: run.candidateId, deviceId: run.device.id, ...run.condition }));
  assert.equal(runOrderGate(order, runs).status, 'pass');
  assert.equal(runOrderGate(order, runs.slice(0, 1)).status, 'unverified');
  assert.equal(runOrderGate([...order].reverse(), runs).status, 'fail');
  assert.equal(runOrderGate([], runs).status, 'unverified');
});

test('the draft comparison has no eligible pair or declared execution plan', () => {
  assert.equal(manifest.finalComparison.kind, 'renderer');
  assert.equal(manifest.interactionPlan.length, 0);
  assert.equal(manifest.runOrder.length, 0);
  assert.throws(() => validateComparison(manifest.finalComparison, manifest.candidates), /candidate count/);
  const invalidKind = structuredClone(manifest);
  invalidKind.finalComparison.kind = '';
  assert.throws(() => validateManifest(invalidKind), /Invalid BenchmarkManifest/);
});
