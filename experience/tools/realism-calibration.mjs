import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('../../', import.meta.url));
const archiveRoot = 'experience/evidence/neighborhood-20261024/performance';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const percentile = values => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * .95) - 1] : null;
const requiredNumber = value => { assert(Number.isFinite(value) && value >= 0, 'Missing finite observation'); return value; };

export function readArchive(id, repository = root) {
  assert(['candidate-13', 'candidate-13-q03', 'candidate-13-native-visibility'].includes(id));
  const directory = resolve(repository, archiveRoot, id);
  const bindingBytes = readFileSync(resolve(directory, 'binding.json'));
  const binding = JSON.parse(bindingBytes);
  const records = binding.files ?? binding.evidence;
  assert(Array.isArray(records) && records.length > 0, 'Evidence inventory required');
  const decoded = new Map();
  for (const record of records) {
    const path = resolve(directory, record.file);
    assert.equal(dirname(path), directory, 'Archive inventory must stay within its directory');
    const bytes = readFileSync(path);
    assert.equal(bytes.length, record.bytes, `Byte count: ${record.file}`);
    assert.equal(hash(bytes), record.sha256, `SHA-256: ${record.file}`);
    const payload = record.file.endsWith('.gz') ? gunzipSync(bytes) : bytes;
    if (record.decodedSha256 !== undefined) {
      assert.equal(payload.length, record.decodedBytes, `Decoded byte count: ${record.file}`);
      assert.equal(hash(payload), record.decodedSha256, `Decoded SHA-256: ${record.file}`);
    }
    decoded.set(record.file, payload);
  }
  const bytes = decoded.get('result.json.gz');
  assert(bytes, 'Original report required');
  const report = JSON.parse(bytes);
  assert.equal(report.driverSha256, binding.driverSha256 ?? records.find(record => record.file === 'visibility.executed.mjs.gz')?.decodedSha256);
  return { report, binding, evidence: { path: `${archiveRoot}/${id}/binding.json`, sha256: hash(bindingBytes),
    reportPath: `${archiveRoot}/${id}/result.json.gz`, reportSha256: hash(bytes),
    date: report.startedAt, source: 'Retained original browser run', rights: 'Repository-authored diagnostic observations',
    location: 'Shijō East application on the recorded local software host',
    method: 'Verify compressed and decoded SHA-256, parse original JSON and recompute bounded observations',
    limitations: 'Historical software-host observations; no physical-device or human acceptance', verifiedFiles: records.length } };
}

export function analyzePerformance(report) {
  assert(report?.entries?.length === 4, 'Original four-entry report required');
  assert.deepEqual(report.entries.map(entry => entry.id), ['cold', 'warm-1', 'warm-2', 'warm-3']);
  const entries = report.entries.map((entry, index) => ({ id: entry.id,
    firstUsableMs: requiredNumber(entry.firstUsableObservedMs), residentObservedMs: requiredNumber(entry.settledMs),
    thresholdMs: index ? 3000 : 8000, firstUsableStatus: entry.firstUsableObservedMs <= (index ? 3000 : 8000) ? 'pass' : 'fail',
    fullQualityStatus: 'unverified', fullQualityReason: 'Original trace has no submitted draw bound to final resident detail.' }));
  const trace = report.interactions?.trace;
  assert(trace?.actions?.length === 20 && Array.isArray(trace.frameCounterGaps), 'Original input trace required');
  const responses = trace.actions.flatMap(action => action.response && action.browserInput?.trusted
    ? [requiredNumber(action.response.observedMs - action.browserInput.eventTimeStamp)] : []);
  const handlers = trace.actions.flatMap(action => action.response ? [requiredNumber(action.response.eventToResponseMs)] : []);
  const queues = trace.actions.map(action => requiredNumber(action.browserInput.receivedMs - action.browserInput.eventTimeStamp));
  const intervals = trace.actions.flatMap(action => action.draws.slice(1).map((draw, index) => requiredNumber(draw.observedMs - action.draws[index].observedMs)));
  const perKind = ['walk', 'orbit'].map(kind => {
    const actions = trace.actions.filter(action => action.kind === kind);
    const values = actions.flatMap(action => action.draws.slice(1).map((draw, index) => draw.observedMs - action.draws[index].observedMs));
    return { kind, actions: actions.length, intervals: values.length, p95Ms: percentile(values),
      complete: values.length > 0 && actions.every(action => action.draws.length > 1)
        && !trace.frameCounterGaps.some(gap => actions.some(action => action.id === gap.action)) };
  });
  const inputP95Ms = percentile(responses), frameP95Ms = percentile(intervals);
  return { entries, input: { samples: responses.length, p95Ms: inputP95Ms, handlerP95Ms: percentile(handlers), queueP95Ms: percentile(queues),
    status: inputP95Ms > 100 ? 'fail' : 'unverified',
    limitation: 'Original response used desired camera state; a compliant rendered-camera observation is absent.' },
    frames: { samples: intervals.length, p95Ms: frameP95Ms, gaps: trace.frameCounterGaps.length, groups: perKind,
      observedStatus: frameP95Ms > 33.3 ? 'fail' : 'unverified', completenessStatus: perKind.every(group => group.complete) ? 'pass' : 'unverified' },
    originalChecks: report.checks.map(({ id, pass }) => ({ id, pass })),
    hidden: { originalStatus: report.checks.find(check => check.id === 'hidden-neighborhood-zero-work').pass ? 'pass' : 'fail',
      observationStatus: report.hidden?.observed ? 'observed' : 'unverified' },
    physicalDeviceStatus: 'unverified', fullRouteStatus: 'unverified' };
}

export function calibrate(repository = root) {
  const performance = readArchive('candidate-13', repository);
  const q03 = readArchive('candidate-13-q03', repository);
  const visibility = readArchive('candidate-13-native-visibility', repository);
  const q03Runs = q03.report.runs.filter(run => run.mode === 'together' && run.temperature === 'warm');
  assert.equal(q03Runs.length, 3, 'All original warm Together observations required');
  const q03Values = q03Runs.map(run => requiredNumber(run.languageActionMs));
  const nativeChecks = visibility.report.checks;
  assert.equal(nativeChecks.length, 13);
  const hidden = nativeChecks.find(check => check.id === 'hidden-neighborhood-zero-work');
  const calibration = analyzePerformance(performance.report);
  return { schemaVersion: 1, kind: 'historical-benchmark-calibration',
    method: 'Recomputed from three immutable original reports; no new browser run',
    evidence: [performance.evidence, q03.evidence, visibility.evidence],
    originalPackageSha256: performance.binding.packageManifestSha256,
    conditions: { browser: performance.report.conditions.browser, locale: performance.report.conditions.locale,
      lighting: performance.report.conditions.lighting, graphics: performance.report.conditions.graphics,
      limitation: 'Starting segment; original third-person camera; one session; software renderer. Benchmark V1 conditions differ.' },
    performance: calibration,
    q03: { durationsMs: q03Values, thresholdMsExclusive: 500, status: q03Values.every(value => value < 500) ? 'pass' : 'fail',
      boundary: 'Original driver: before locale click through observed changed document language' },
    nativeVisibility: { passed: nativeChecks.filter(check => check.pass).length, total: nativeChecks.length,
      status: nativeChecks.every(check => check.pass) ? 'pass' : 'fail',
      elapsedMs: hidden.evidence.elapsedMs, renderDelta: hidden.evidence.renderDelta, updateDelta: hidden.evidence.updateDelta,
      limitation: 'Separate native-window software-host observation; original headless unobserved transition remains in its report.' },
    acceptance: { status: 'unverified', reasons: ['Physical reference devices unavailable', 'Complete route under frozen protocol unmeasured',
      'Fresh participant cohorts untested', 'Matched captured sources and held-out references unqualified', 'Complete lifecycle cost estimates absent'] } };
}

export function renderScorecard(result, outputDirectory) {
  const number = value => value === null ? 'unmeasured' : value.toFixed(1);
  const links = result.evidence.map(record => relative(outputDirectory, resolve(root, record.path)).replaceAll('\\', '/'));
  const lines = [
    '# Benchmark calibration · retained candidate 13', '',
    'Historical software-host observations, 24 October 2026. Recomputed from hash-verified original reports. Current Benchmark V1 acceptance remains **unverified**.', '',
    '| Observation | Actual result | Status and scope |', '| --- | --- | --- |',
    `| First usable, cold / warm | ${result.performance.entries.map(entry => number(entry.firstUsableMs)).join(' / ')} ms | ${result.performance.entries.every(entry => entry.firstUsableStatus === 'pass') ? 'pass' : 'fail'} under original entry definition |`,
    `| Resident detail, cold / warm | ${result.performance.entries.map(entry => number(entry.residentObservedMs)).join(' / ')} ms | Full-quality draw unverified |`,
    `| Input timestamp → observed response p95 | ${number(result.performance.input.p95Ms)} ms; target ≤100 ms | fail; original camera boundary retained |`,
    `| Handler response / queue p95 | ${number(result.performance.input.handlerP95Ms)} / ${number(result.performance.input.queueP95Ms)} ms | Diagnostics; queue remains included in latency |`,
    `| Observed frame interval p95 | ${number(result.performance.frames.p95Ms)} ms; target ≤33.3 ms | fail; ${result.performance.frames.gaps} counter gaps |`,
    `| Orbit cadence | ${result.performance.frames.groups.find(group => group.kind === 'orbit').intervals} intervals | unverified |`,
    `| Original warm Together language action | ${result.q03.durationsMs.map(number).join(' / ')} ms; target <500 ms each | ${result.q03.status} |`,
    '| Headless hidden transition | Transition unobserved | Original check failed; visibility behavior unverified in that run |',
    `| Separate native hidden / resume | ${result.nativeVisibility.passed}/${result.nativeVisibility.total}; ${number(result.nativeVisibility.elapsedMs)} ms, draws ${result.nativeVisibility.renderDelta}, updates ${result.nativeVisibility.updateDelta} | ${result.nativeVisibility.status}, recorded native-window scope |`,
    '| Full-route realism, unaided discovery, physical GPU | No qualifying observations | unverified |', '',
    '## Entry loading timeline', '',
    'Times below show first usable and later resident-detail observation on the original page clock. The original trace does not bind detail to a subsequent submitted draw.', '',
    '```mermaid', 'xychart-beta', '  x-axis [cold, warm1, warm2, warm3]', '  y-axis "Seconds since navigation" 0 --> 20',
    `  bar [${result.performance.entries.map(entry => (entry.firstUsableMs / 1000).toFixed(3)).join(', ')}]`,
    `  line [${result.performance.entries.map(entry => (entry.residentObservedMs / 1000).toFixed(3)).join(', ')}]`, '```', '',
    'Bars: first usable. Line: resident detail observed.', '',
    '## Reproduce and inspect', '',
    `- [Original performance receipt](${links[0]})`, `- [Original Q03 receipt](${links[1]})`, `- [Original native visibility receipt](${links[2]})`,
    '- [Machine-readable calibration](calibration.json)', '',
    'Run `node experience/tools/realism-calibration.mjs artifacts/realism-01/runs/calibration` from the repository root. Outputs are deterministic and retain original report identities.', '',
    '## Current comparison prerequisites', '',
    '| Required evidence | Current status |', '| --- | --- |',
    ...result.acceptance.reasons.map(reason => `| ${reason} | unverified |`), '',
    'The full-route comparison scorecard adds matched views, per-edge defects, per-cohort outcomes and cost ranges when those observations exist. No weighted winner is assigned by this calibration.', ''
  ];
  return lines.join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'Usage: node experience/tools/realism-calibration.mjs <output-directory>');
  const output = resolve(root, process.argv[2]);
  assert(output.startsWith(resolve(root, 'artifacts') + '/') || output === resolve(root, 'experience/evidence/realism-01/benchmark'),
    'Output must use the reviewed benchmark directory or ignored artifacts');
  const result = calibrate();
  mkdirSync(output, { recursive: true });
  writeFileSync(resolve(output, 'calibration.json'), JSON.stringify(result, null, 2) + '\n');
  writeFileSync(resolve(output, 'scorecard.md'), renderScorecard(result, output));
  console.log(JSON.stringify({ calibration: 'passed', verifiedFiles: result.evidence.reduce((sum, item) => sum + item.verifiedFiles, 0),
    originalFailures: result.performance.originalChecks.filter(check => !check.pass).map(check => check.id), acceptance: result.acceptance.status }));
}
