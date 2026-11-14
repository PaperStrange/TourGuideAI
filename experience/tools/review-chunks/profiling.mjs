import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../../../', import.meta.url));
const mode = process.argv[2];
assert(['--retain', '--verify'].includes(mode), 'Use --retain or --verify [checkout-root]');
const root = mode === '--verify' && process.argv[3] ? resolve(process.argv[3]) : repository;
const output = resolve(root, 'experience/evidence/realism-01/review-chunks-profiling');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = filename => JSON.parse(readFileSync(filename));
const sameCamera = (a, b) => ['matrixWorld', 'projectionMatrix'].every(key => a?.[key]?.length === 16
  && b?.[key]?.length === 16 && a[key].every((value, index) => Math.abs(value - b[key][index]) < 1e-7));
const provenance = {
  source: 'TourGuideAI real browser observations; Knock Community Hall by scbenoit, https://superspl.at/scene/0ff2e6dc',
  date: new Date().toISOString(), rights: 'Project-generated records and code; adapted captured images CC BY 4.0, scbenoit.',
  location: 'Knock Community Hall, Innisfil, Ontario, Canada; managed Chromium software-rendering environment.',
  method: 'Actual packaged source, trusted native buttons, animation-frame observations, CDP responses and independent Pillow decoding.',
  limitations: 'Diagnostic architectural review. Physical performance, full route, ground/collision and Kyoto appearance remain unverified.',
};
if (mode === '--retain') {
  mkdirSync(output, { recursive: true });
  const files = [];
  function retain(source, path, extra = {}) {
    assert(!files.some(file => file.path === path));
    const bytes = readFileSync(source);
    const target = resolve(output, path); assert(target.startsWith(output + sep));
    mkdirSync(dirname(target), { recursive: true }); copyFileSync(source, target);
    files.push({ path, input: relative(root, source), bytes: bytes.length, sha256: sha(bytes), ...provenance, ...extra });
  }
  const packageDirectory = resolve(root, 'artifacts/realism-01/review-loading/package-03');
  const packageManifest = json(resolve(packageDirectory, 'package-manifest.json'));
  assert.equal(sha(readFileSync(resolve(packageDirectory, 'package-manifest.json'))), '6673bc5de654b71ba9e0fc5a799d72cb24af3654264aa1b3841c1236ae8223b5');
  for (const file of packageManifest.files) {
    const bytes = readFileSync(resolve(packageDirectory, file.path));
    assert.equal(bytes.length, file.bytes); assert.equal(sha(bytes), file.sha256);
  }
  for (const filename of ['package-manifest.json', 'review-assets.json', 'index.html']) retain(resolve(packageDirectory, filename), `package/${filename}`);
  retain(resolve(root, 'experience/evidence/realism-01/review-loading/receipts/source-commit.json'), 'package/source-commit.json');
  for (const file of packageManifest.producers) {
    const bytes = readFileSync(resolve(root, file.path)); assert.equal(sha(bytes), file.sha256);
    retain(resolve(root, file.path), `producers/${file.path}`);
  }
  for (const filename of ['experience/tests/browser-review-chunks.mjs', 'experience/tools/review-chunks/profiling.mjs', 'experience/tools/review-loading/compare-images.py']) {
    retain(resolve(root, filename), `producers/${filename}`);
  }
  const qa = resolve(root, 'artifacts/realism-01/review-chunks/qa/baseline');
  const attempts = [];
  for (const directory of readdirSync(qa, { withFileTypes: true })) {
    assert(directory.isDirectory());
    const folder = resolve(qa, directory.name);
    const report = json(resolve(folder, 'result.json'));
    assert(report.finishedAt, `Attempt remains active: ${directory.name}`);
    assert.equal(sha(readFileSync(resolve(folder, 'executed-driver.mjs'))), report.driver.sha256);
    for (const filename of ['result.json', 'executed-driver.mjs', ...(report.captures ?? []).map(capture => capture.path)]) {
      retain(resolve(folder, filename), `runs/${directory.name}/${filename}`, { date: report.finishedAt });
    }
    attempts.push({ path: `runs/${directory.name}/result.json`, completed: report.completed, finishedAt: report.finishedAt, driverSha256: report.driver.sha256 });
  }
  const manifest = { schemaVersion: 1, createdAt: provenance.date, files, attempts,
    packageManifestSha256: sha(readFileSync(resolve(packageDirectory, 'package-manifest.json'))),
    runtimeCommit: 'b4b140d2c48b7e185e296272f9fb141588caca95',
    publishedCommit: '3f1d3e6f578877f8d7fdd908e3f19a9b3eb658f3',
    scope: 'Current unchanged local package profiling; no new runtime or public release.' };
  writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}
const manifest = json(resolve(output, 'manifest.json'));
assert.equal(new Set(manifest.files.map(file => file.path)).size, manifest.files.length);
for (const file of manifest.files) {
  const path = resolve(output, file.path); assert(path.startsWith(output + sep));
  const bytes = readFileSync(path); assert.equal(bytes.length, file.bytes, file.path); assert.equal(sha(bytes), file.sha256, file.path);
  for (const field of ['source', 'date', 'rights', 'location', 'method', 'limitations']) assert(file[field], `${file.path}: ${field}`);
}
const packaged = json(resolve(output, 'package/package-manifest.json'));
assert.equal(sha(readFileSync(resolve(output, 'package/package-manifest.json'))), manifest.packageManifestSha256);
assert.equal(manifest.packageManifestSha256, '6673bc5de654b71ba9e0fc5a799d72cb24af3654264aa1b3841c1236ae8223b5');
const sourceCommit = json(resolve(output, 'package/source-commit.json'));
assert.equal(sourceCommit.commit, manifest.runtimeCommit);
assert.equal(sourceCommit.packageManifestSha256, manifest.packageManifestSha256);
assert.deepEqual(sourceCommit.files, packaged.producers);
for (const producer of packaged.producers) assert.equal(sha(readFileSync(resolve(output, 'producers', producer.path))), producer.sha256);
const completed = [];
function transferAt(report, milliseconds) {
  const boundary = report.navigationStart + milliseconds / 1000;
  const requests = report.network.filter(item => item.startedAt <= boundary).map(item => {
    const complete = Number.isFinite(item.finishedAt) && item.finishedAt <= boundary;
    const received = Number.isFinite(item.responseAt) && item.responseAt <= boundary;
    const bytes = complete ? item.totalEncodedBytes : (received ? item.initialEncodedPrefixBytes : 0)
      + item.data.filter(event => event.timestamp <= boundary).reduce((sum, event) => sum + event.encodedDataLength, 0);
    return { requestId: item.requestId, url: item.url, complete, bytes };
  });
  return { boundaryAtMs: milliseconds, boundary, requests, totalEncodedBytes: requests.reduce((sum, item) => sum + item.bytes, 0),
    inflightBytes: requests.filter(item => !item.complete).reduce((sum, item) => sum + item.bytes, 0) };
}
function settled(view) {
  const record = view.settledView; assert.equal(record.qualifiedFrames.length, 3);
  assert(view.paging.idle && view.paging.settled && sameCamera(view, record) && sameCamera(view, view.drawnView));
  assert.equal(new Set(record.qualifiedFrames.map(frame => frame.frames)).size, 3);
  assert.equal(record.drawnSplats, view.drawnSplats); assert.equal(view.drawnView.drawnSplats, view.drawnSplats);
  assert(!view.requests.some(request => request.status === 'pending'));
  for (const [index, frame] of record.qualifiedFrames.entries()) {
    assert(frame.pagingBeforeRender.idle && frame.observation.paging.idle);
    assert(sameCamera(frame.beforeRender, frame) && sameCamera(frame, frame.observation));
    assert(sameCamera(frame, record)); assert.deepEqual(frame.content, record.content);
    if (index > 0) assert(frame.frames > record.qualifiedFrames[index - 1].frames);
    assert.deepEqual(frame.beforeRender.content, frame.content); assert.deepEqual(frame.content, frame.observation.content);
    assert(frame.observedAt >= frame.submittedAt);
  }
  assert.deepEqual(record.content, view.drawnView.content);
}
for (const attempt of manifest.attempts) {
  const report = json(resolve(output, attempt.path));
  assert.equal(report.driver.sha256, attempt.driverSha256);
  assert.equal(sha(readFileSync(resolve(output, dirname(attempt.path), 'executed-driver.mjs'))), attempt.driverSha256);
  assert.deepEqual(report.packageManifest, packaged); assert(report.finishedAt);
  if (!report.completed) { assert(report.termination); continue; }
  assert.equal(report.packageIdentity.manifestSha256, manifest.packageManifestSha256);
  assert(report.packageIdentity.verified);
  assert.deepEqual(report.packageIdentity.verifiedFiles, packaged.files.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })));
  assert.deepEqual(report.firstVisibleTransfer, transferAt(report, report.firstView.firstVisibleAt));
  assert.deepEqual(report.captures.map(capture => capture.name), report.conditions.capturePoses);
  for (const capture of report.captures) {
    const bytes = readFileSync(resolve(output, dirname(attempt.path), capture.path));
    assert.equal(sha(bytes), capture.sha256); assert.equal(bytes.length, capture.bytes);
    settled(capture.before); settled(capture.after); assert(sameCamera(capture.before, capture.after));
    assert.deepEqual(capture.before.drawnView.content, capture.after.drawnView.content);
    assert.deepEqual(capture.transfer, transferAt(report, capture.before.settledView.observedAt));
  }
  const frames = report.observations.frames;
  const gaps = frames.slice(1).flatMap((frame, index) => frame.frames > frames[index].frames + 1 ? [{
    from: frames[index].frames, to: frame.frames, missing: frame.frames - frames[index].frames - 1,
    fromSubmittedAt: frames[index].submittedAt, toSubmittedAt: frame.submittedAt }] : []);
  assert.deepEqual(gaps, report.observations.gaps);
  assert.deepEqual(report.probes.map(probe => probe.action), report.conditions.cameraActions);
  for (const probe of report.probes) {
    const input = probe.input; assert(input.trusted && input.eventAt >= 0 && input.handlerAt >= input.eventAt);
    assert(report.observations.inputs.some(observed => JSON.stringify(observed) === JSON.stringify(input)));
    const first = frames.find(frame => frame.submittedAt >= input.handlerAt && frame.frames > input.before.frames && sameCamera(frame, input.requested));
    assert.deepEqual(first, probe.firstObservedResponse); assert(!sameCamera(input.before, first));
    assert.deepEqual(probe.observationGaps, gaps.filter(gap => gap.to > input.before.frames && gap.from < first.frames));
    assert.equal(probe.eventToSubmittedMs, first.submittedAt - input.eventAt);
    assert.equal(probe.handlerToSubmittedMs, first.submittedAt - input.handlerAt);
    assert.equal(probe.eventQueueMs, input.handlerAt - input.eventAt);
    assert.equal(probe.observationLagMs, first.observedAt - first.submittedAt);
  }
  const source = report.captures.find(capture => capture.name === 'source');
  const repeat = report.captures.find(capture => capture.name === 'source-repeat');
  const independent = JSON.parse(execFileSync('python', [resolve(output, 'producers/experience/tools/review-loading/compare-images.py'),
    resolve(output, dirname(attempt.path), source.path), resolve(output, dirname(attempt.path), repeat.path)], { encoding: 'utf8' }));
  assert(sameCamera(source.before, repeat.before));
  assert.equal(source.before.drawnSplats, repeat.before.drawnSplats);
  const browserComparison = report.imageComparisons.find(comparison => comparison.id === 'same-build-repeatability');
  assert.deepEqual(browserComparison.criteria, { maxChannelError: 0, p95ChannelError: 0, alphaMismatches: 0, source: 'Exact repeatability' });
  for (const key of ['width', 'height', 'maxChannelError', 'p95ChannelError', 'meanAbsoluteError255', 'differingRgbChannels', 'alphaMismatches']) {
    assert.equal(browserComparison[key], independent[key]);
  }
  assert.equal(report.checks.find(check => check.id === 'same-build-repeatability').pass,
    sameCamera(source.before, repeat.before) && source.before.drawnSplats === repeat.before.drawnSplats && independent.exactPixels);
  assert.equal(report.checks.find(check => check.id === 'same-build-repeatability-exact').pass, independent.exactPixels);
  completed.push({ path: attempt.path, checks: report.checks.length, firstVisibleBytes: report.firstVisibleTransfer.totalEncodedBytes,
    firstVisibleAtMs: report.firstView.firstVisibleAt, poses: report.captures.map(capture => ({ name: capture.name,
      drawnSplats: capture.before.drawnSplats, atMs: capture.before.settledView.observedAt, bytes: capture.transfer.totalEncodedBytes })),
    probes: report.probes.map(probe => ({ action: probe.action, phase: probe.phase, eventToSubmittedMs: probe.eventToSubmittedMs,
      handlerToSubmittedMs: probe.handlerToSubmittedMs, eventQueueMs: probe.eventQueueMs, observationLagMs: probe.observationLagMs,
      gaps: probe.observationGaps.length })), frames: frames.length, gaps: gaps.length, independentPixels: independent,
    failedChecks: report.checks.filter(check => !check.pass).map(check => ({ id: check.id, category: check.category })),
    observedAcceptancePassed: report.checks.every(check => check.pass || ['budget', 'diagnostic'].includes(check.category)) });
}
assert.equal(completed.length, 1, 'This evidence retains one completed unchanged-runtime profile');
const result = { integrityPass: true, files: manifest.files.length, attempts: manifest.attempts.length, completed };
console.log(JSON.stringify(result, null, 2));
