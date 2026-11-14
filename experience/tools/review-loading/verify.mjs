import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../../../', import.meta.url)));
const directory = path.join(root, 'experience/evidence/realism-01/review-loading');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const execute = promisify(execFile);
const json = async filename => JSON.parse(await readFile(filename, 'utf8'));
const manifest = await json(path.join(directory, 'manifest.json'));
assert.equal(manifest.kind, 'responsive-architectural-loading');
assert.deepEqual(manifest.appearanceProtocol, { decision: 'D25', maxChannelError: 1, p95ChannelError: 0, alphaMismatches: 0 });
assert.equal(manifest.limits.startupBytes, 4 * 1024 * 1024);
assert.equal(manifest.limits.ordinarySectionBytes, 2 * 1024 * 1024);
const retained = new Map();
const originalInputs = new Map();
for (const record of manifest.files) {
  assert(!retained.has(record.path), `Duplicate evidence: ${record.path}`);
  const filename = path.resolve(directory, record.path);
  assert(filename.startsWith(directory + path.sep), `Invalid evidence path: ${record.path}`);
  const bytes = await readFile(filename);
  assert.equal(bytes.length, record.bytes, `Evidence size: ${record.path}`);
  assert.equal(sha(bytes), record.sha256, `Evidence hash: ${record.path}`);
  for (const key of ['source', 'recordDate', 'rights', 'location', 'method', 'limitations']) {
    assert(record[key], `Missing ${key}: ${record.path}`);
  }
  retained.set(record.path, record);
  originalInputs.set(record.input, record);
}
for (const producer of manifest.producers) {
  const record = retained.get(producer.path);
  assert(record && record.sourcePath === producer.sourcePath);
  assert.equal(record.bytes, producer.bytes);
  assert.equal(record.sha256, producer.sha256);
}
for (const record of manifest.files.filter(file => file.path.startsWith('receipts/') && file.path.endsWith('.json'))) {
  const receipt = await json(path.join(directory, record.path));
  if (receipt.wrapper) {
    const wrapper = originalInputs.get(receipt.wrapper);
    assert.equal(wrapper?.sha256, receipt.wrapperSha256, `Setup wrapper: ${record.path}`);
  }
}
const baseline = await json(path.join(directory, 'baseline/package-manifest.json'));
const candidate = await json(path.join(directory, 'candidate/package-manifest.json'));
const priorManifest = await readFile(path.join(root, 'experience/evidence/realism-01/review-transport/release/package-manifest.json'));
assert.equal(retained.get('baseline/package-manifest.json').sha256, sha(priorManifest), 'Baseline must match the approved public guided release.');
for (const [label, packaged] of [['baseline', baseline], ['candidate', candidate]]) {
  const identity = manifest.packageIdentities[label];
  assert.equal(identity.sha256, retained.get(`${label}/package-manifest.json`).sha256);
  assert.equal(identity.verifiedFiles, packaged.files.length);
  assert(identity.verifiedAt);
  assert.equal(new Set(packaged.files.map(file => file.path)).size, packaged.files.length);
  assert.equal(packaged.transportEncoding, 'identity');
}
const trialDifferences = [];
for (const identity of manifest.trialPackages) {
  const packaged = await json(path.join(directory, identity.label, 'package-manifest.json'));
  assert.equal(identity.sha256, retained.get(`${identity.label}/package-manifest.json`).sha256);
  assert.equal(identity.verifiedFiles, packaged.files.length);
  assert(identity.verifiedAt);
  assert.equal(packaged.sourceSha256, baseline.sourceSha256);
  for (const source of baseline.files.filter(file => file.path.startsWith('data/'))) {
    const actual = packaged.files.find(file => file.path === source.path);
    assert.equal(actual?.sha256, source.sha256);
    assert.equal(actual?.bytes, source.bytes);
  }
  const changes = (before, after, key) => ({
    added: after.filter(item => !before.some(previous => previous[key] === item[key])).map(item => item[key]),
    removed: before.filter(item => !after.some(current => current[key] === item[key])).map(item => item[key]),
    changed: before.filter(item => after.some(current => current[key] === item[key]
      && (current.sha256 !== item.sha256 || current.bytes !== item.bytes))).map(item => item[key]),
  });
  const files = changes(packaged.files, candidate.files, 'path');
  const producers = changes(packaged.producers, candidate.producers, 'path');
  const iconEntryOnly = files.removed.length === 0 && files.added.length === 1
    && /^assets\/favicon-[\w-]+\.svg$/.test(files.added[0])
    && JSON.stringify(files.changed) === JSON.stringify(['index.html'])
    && producers.removed.length === 0 && JSON.stringify(producers.added) === JSON.stringify(['experience/src/review/favicon.svg'])
    && JSON.stringify(producers.changed) === JSON.stringify(['experience/realism-review.html']);
  let documentComparison = null;
  if (iconEntryOnly) {
    const { stdout } = await execute(process.env.REVIEW_VERIFY_PYTHON || 'python', [
      path.join(directory, 'producers/experience/tools/review-loading/compare-entry.py'),
      path.join(directory, identity.label, 'index.html'), path.join(directory, 'candidate/index.html'), files.added[0],
    ]);
    documentComparison = JSON.parse(stdout);
    assert.equal(documentComparison.remainingDocumentIdentical, true);
  }
  trialDifferences.push({ manifestSha256: identity.sha256, label: identity.label, files, producers,
    iconEntryOnly, documentComparison });
}
assert.deepEqual(candidate.dependencies, baseline.dependencies);
assert.equal(candidate.sourceSha256, baseline.sourceSha256);
assert.equal(manifest.sourceSha256, baseline.sourceSha256);
assert.equal(retained.get('candidate/review-assets.json').sha256, retained.get('baseline/review-assets.json').sha256);
const sources = baseline.files.filter(file => file.path.startsWith('data/'));
assert.equal(sources.length, 41);
for (const original of sources) {
  const current = candidate.files.find(file => file.path === original.path);
  assert.equal(current?.sha256, original.sha256, `Source hash: ${original.path}`);
  assert.equal(current?.bytes, original.bytes, `Source size: ${original.path}`);
}
for (const expected of candidate.producers) {
  const producer = manifest.producers.find(item => item.sourcePath === expected.path);
  assert.equal(producer?.sha256, expected.sha256, `Packaged producer: ${expected.path}`);
  assert.equal(producer?.bytes, expected.bytes);
}
const published = await json(path.join(directory, 'published-bytes.json'));
assert.equal(published.baseURL, manifest.publicUrl);
assert.equal(published.failed, 0);
assert.equal(published.files.length, candidate.files.length + 1);
for (const expected of candidate.files) {
  const actual = published.files.find(file => file.path === '/' + expected.path);
  assert(actual?.pass, `Published file: ${expected.path}`);
  assert.equal(actual.observed.bytes, expected.bytes);
  assert.equal(actual.observed.sha256, expected.sha256);
}
assert.equal(published.files.find(file => file.path === '/package-manifest.json')?.observed.sha256,
  retained.get('candidate/package-manifest.json').sha256);

const sameCamera = (left, right) => ['matrixWorld', 'projectionMatrix'].every(key =>
  left?.[key]?.length === 16 && right?.[key]?.length === 16
  && left[key].every((value, index) => Math.abs(value - right[key][index]) < 1e-7));
function verifyIdle(paging) {
  assert.equal(paging.idle, true);
  assert(paging.cameraCoveredByLod && paging.mappingMatches);
  for (const key of ['pending', 'readyUploads', 'lodDirty', 'workerBusy', 'sorting', 'sortDirty']) {
    assert(!paging[key], `Settled observation contains ${key}`);
  }
}

function verifySettlement(view) {
  assert(view.drawnSplats > 0 && sameCamera(view, view.drawnView));
  assert(!view.requests.some(request => request.status === 'pending'));
  if (!Object.hasOwn(view, 'settledView')) {
    assert.equal(view.drawnView.paging.settled, true);
    return { kind: 'submitted-frame', atMs: view.drawnView.submittedAt };
  }
  const settled = view.settledView;
  assert(settled && settled.qualifiedFrames.length === 3);
  assert.equal(settled.frames, view.drawnView.frames);
  assert.equal(settled.drawnSplats, view.drawnSplats);
  assert(sameCamera(settled, view.drawnView));
  assert.deepEqual(settled.content, view.drawnView.content);
  verifyIdle(view.paging);
  assert.equal(view.paging.settled, true);
  for (let index = 0; index < settled.qualifiedFrames.length; index += 1) {
    const frame = settled.qualifiedFrames[index];
    assert(frame.beforeRender.observedAt <= frame.submittedAt && frame.submittedAt <= frame.observedAt);
    assert.equal(frame.observedAt, frame.observation.observedAt);
    verifyIdle(frame.pagingBeforeRender);
    verifyIdle(frame.observation.paging);
    assert.deepEqual(frame.beforeRender.paging, frame.pagingBeforeRender);
    assert(sameCamera(frame.beforeRender, frame) && sameCamera(frame, frame.observation));
    assert.deepEqual(frame.beforeRender.content, frame.content);
    assert.deepEqual(frame.content, frame.observation.content);
    assert(frame.content.drawnSplats > 0);
    if (index > 0) {
      const previous = settled.qualifiedFrames[index - 1];
      assert.equal(frame.frames, previous.frames + 1);
      assert(frame.submittedAt > previous.submittedAt);
      assert(sameCamera(previous, frame));
      assert.deepEqual(previous.content, frame.content);
    }
  }
  const final = settled.qualifiedFrames.at(-1);
  assert.equal(final.frames, settled.frames);
  assert.equal(final.submittedAt, settled.submittedAt);
  assert.equal(final.observedAt, settled.observedAt);
  assert.deepEqual(final.content, settled.content);
  assert.deepEqual(final.observation, settled.observation);
  assert(sameCamera(final, settled));
  return { kind: 'post-submit-observation', atMs: settled.observedAt };
}
const originalRelative = filename => path.isAbsolute(filename)
  ? path.relative(manifest.workspaceRoot, filename) : filename;
const originalFile = filename => {
  const record = originalInputs.get(originalRelative(filename));
  assert(record, `Unretained original input: ${filename}`);
  return path.join(directory, record.path);
};

function transferredAt(network, boundary) {
  assert(Number.isFinite(boundary) && boundary > 0);
  const requests = network.filter(item => item.startedAt <= boundary).map(item => {
    const complete = Number.isFinite(item.finishedAt) && item.finishedAt <= boundary;
    const received = Number.isFinite(item.responseAt) && item.responseAt <= boundary;
    const later = item.data.filter(event => event.timestamp <= boundary)
      .reduce((total, event) => total + event.encodedDataLength, 0);
    const bytes = complete ? item.totalEncodedBytes : (received ? item.initialEncodedPrefixBytes : 0) + later;
    assert(Number.isFinite(bytes) && bytes >= 0);
    return { requestId: item.requestId, url: item.url, complete, bytes };
  });
  return { boundary, totalEncodedBytes: requests.reduce((total, item) => total + item.bytes, 0),
    inflightBytes: requests.filter(item => !item.complete).reduce((total, item) => total + item.bytes, 0), requests };
}
const images = [];
const transfers = [];
const probes = [];
const detailScheduling = [];
const encodedPrefixes = [];
const reports = [];
const regressions = [];
for (const attempt of manifest.attempts) {
  const record = retained.get(attempt.path);
  assert(record, `Missing browser attempt: ${attempt.path}`);
  const report = await json(path.join(directory, attempt.path));
  assert(report.startedAt);
  if (!report.finishedAt) {
    assert.equal(report.completed, false);
    const receiptRecord = retained.get(attempt.interruptionReceipt);
    assert(receiptRecord, `Unfinished attempt requires an interruption receipt: ${attempt.path}`);
    const receipt = await json(path.join(directory, receiptRecord.path));
    assert.equal(receipt.runnerExited, true);
    assert.equal(receipt.originalReportChanged, false);
    assert.equal(receipt.reportSha256, record.sha256);
    assert.equal(receipt.driverSha256, report.driver.sha256);
    assert.equal(originalRelative(receipt.attemptReport), record.input);
    assert(receipt.recordedAt && receipt.method && receipt.limitations);
  }
  assert.equal(report.completed, attempt.completed);
  assert.equal(report.finishedAt ?? null, attempt.finishedAt);
  assert.equal(report.driver.sha256, attempt.driverSha256);
  const folder = path.dirname(attempt.path);
  assert.equal(retained.get(`${folder}/executed-driver.mjs`)?.sha256, report.driver.sha256);
  for (const capture of [...(report.captures ?? []), ...(report.screenshots ?? [])]) {
    const image = retained.get(`${folder}/${capture.path}`);
    assert.equal(image?.sha256, capture.sha256);
    assert.equal(image?.bytes, capture.bytes);
  }
  if (attempt.path.startsWith('runs/regression/')) {
    const currentManifest = report.sourceIdentity?.candidateManifest.sha256 === manifest.packageIdentities.candidate.sha256;
    const currentFiles = report.target.startsWith('https:')
      ? candidate.files.filter(file => file.path === 'index.html' || /\.(js|css)$/.test(file.path))
        .every(file => report.responses.some(response => response.sha256 === file.sha256
          && new URL(response.url).pathname.endsWith('/' + file.path)))
      : candidate.files.every(file => report.packageFiles.some(item => item.path === file.path
        && item.sha256 === file.sha256 && item.bytes === file.bytes));
    const runtimeFiles = candidate.files.filter(file => /\.(js|css|wasm)$/.test(file.path) || file.path === 'review-assets.json'
      || file.path.startsWith('data/'));
    const currentRuntimeAssets = !report.target.startsWith('https:') && runtimeFiles.every(file =>
      report.packageFiles.some(item => item.path === file.path && item.sha256 === file.sha256 && item.bytes === file.bytes));
    regressions.push({ attempt: attempt.path, completed: report.completed,
      currentPackage: currentManifest && currentFiles, currentRuntimeAssets,
      trialToCurrent: trialDifferences.find(trial => trial.manifestSha256 === report.sourceIdentity?.candidateManifest.sha256) ?? null,
      checks: report.checks.length, failures: report.checks.filter(check => !check.pass).map(check => check.id),
      sections: report.sections ?? null });
    continue;
  }
  assert.deepEqual(report.conditions, { viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1,
    downloadBitsPerSecond: 10000000, latencyMs: 80, cacheDisabled: true, sampleIntervalMs: 100 });
  const completedHttp = report.network.filter(request => Number.isFinite(request.finishedAt) && /^https?:/.test(request.url));
  const discrepancies = completedHttp.map(request => ({ request,
    reconstructed: request.initialEncodedPrefixBytes + request.data.reduce((sum, event) => sum + event.encodedDataLength, 0) }))
    .filter(({ request, reconstructed }) => reconstructed !== request.totalEncodedBytes)
    .map(({ request, reconstructed }) => {
      const boundaries = [report.firstVisibleTransfer, report.settledAfterInteraction?.transfer].filter(Boolean);
      const affected = boundaries.filter(boundary => boundary.requests.some(item => item.requestId === request.requestId && !item.complete && item.bytes > 0));
      assert.equal(affected.length, 0, `Unreconciled partial HTTP response at a claimed boundary: ${new URL(request.url).pathname}`);
      return { requestId: request.requestId, path: new URL(request.url).pathname,
        reconstructed, totalEncodedBytes: request.totalEncodedBytes, affectedMeasuredBoundaries: affected.length };
    });
  encodedPrefixes.push({ attempt: attempt.path, completedHttpResponses: completedHttp.length, discrepancies });
  if (report.firstVisibleTransfer) {
    const boundary = report.navStart + report.firstView.firstVisibleAt / 1000;
    const observed = transferredAt(report.network, boundary);
    assert.deepEqual(report.firstVisibleTransfer, observed, `${attempt.path}: first-visible bytes`);
    const budget = report.checks.find(check => check.id === 'first-view-4mib-budget');
    assert.equal(budget?.category, 'budget');
    assert.equal(budget.pass, observed.totalEncodedBytes <= manifest.limits.startupBytes);
    transfers.push({ attempt: attempt.path, boundary: 'first-visible', bytes: observed.totalEncodedBytes,
      within4MiB: budget.pass, atMs: report.firstView.firstVisibleAt });
  }
  if (report.settledAfterInteraction) {
    const { view, transfer } = report.settledAfterInteraction;
    const settlement = verifySettlement(view);
    if (report.settledAfterInteraction.boundaryAtMs !== undefined) {
      assert.equal(report.settledAfterInteraction.boundaryAtMs, settlement.atMs);
    }
    const boundary = report.navStart + settlement.atMs / 1000;
    assert.deepEqual(transfer, transferredAt(report.network, boundary));
    transfers.push({ attempt: attempt.path, boundary: 'settled-after-input', bytes: transfer.totalEncodedBytes,
      atMs: settlement.atMs, boundaryKind: settlement.kind });
  }
  if (report.finalView?.loadingSchedule) {
    const view = report.finalView;
    const schedule = view.loadingSchedule;
    assert(Number.isFinite(schedule.detailReleasedAt) && schedule.detailReleasedAt >= view.firstVisibleAt);
    assert.equal(schedule.waitingChunks, 0);
    const rootChunk = view.requests.find(request => request.url === schedule.rootChunkUrl);
    assert(rootChunk?.status === 'complete' && rootChunk.endedAt <= view.firstVisibleAt);
    const details = view.requests.filter(request => request.url.endsWith('.radc') && request.url !== schedule.rootChunkUrl);
    assert(details.length > 0);
    for (const request of details) assert(request.startedAt >= schedule.detailReleasedAt);
    detailScheduling.push({ attempt: attempt.path, firstVisibleAt: view.firstVisibleAt,
      detailReleasedAt: schedule.detailReleasedAt, subsequentChunkRequests: details.length });
  }
  for (const probe of report.probes) {
    assert.equal(probe.submittedAt, probe.after.drawnView.submittedAt);
    const inputTime = probe.input?.at ?? probe.startedAt;
    assert.equal(probe.inputToSubmittedMs, probe.submittedAt - inputTime);
    assert(probe.after.drawnView.frames > probe.before.frames);
    assert(!sameCamera(probe.before.drawnView, probe.after.drawnView));
    assert(sameCamera(probe.after, probe.after.drawnView));
    if (probe.input) assert(probe.input.trusted && probe.input.action === probe.action);
    probes.push({ attempt: attempt.path, phase: probe.phase, action: probe.action,
      inputToSubmittedMs: probe.inputToSubmittedMs,
      timingOrigin: probe.input ? 'trusted-click' : 'automation-before-click' });
  }
  for (const comparison of report.imageComparisons ?? []) {
    const repeatability = comparison.criteria.source === 'Exact same-build repeatability';
    assert.deepEqual(comparison.criteria, { maxChannelError: repeatability ? 0 : 1,
      p95ChannelError: 0, alphaMismatches: 0, source: repeatability ? 'Exact same-build repeatability' : 'D25' });
    const leftRecord = originalInputs.get(originalRelative(comparison.referencePath));
    const rightRecord = originalInputs.get(originalRelative(comparison.candidatePath));
    assert(leftRecord && rightRecord);
    const { stdout } = await execute(process.env.REVIEW_VERIFY_PYTHON || 'python', [
      path.join(directory, 'producers/experience/tools/review-loading/compare-images.py'),
      originalFile(comparison.referencePath), originalFile(comparison.candidatePath),
    ]);
    const measured = JSON.parse(stdout);
    for (const key of ['width', 'height', 'maxChannelError', 'p95ChannelError', 'meanAbsoluteError255', 'differingRgbChannels', 'alphaMismatches']) {
      assert.equal(comparison[key], measured[key], `${attempt.path}: PNG ${key}`);
    }
    const captureReport = async record => json(path.join(directory, path.dirname(record.path), 'result.json'));
    const leftReport = await captureReport(leftRecord);
    const rightReport = await captureReport(rightRecord);
    const left = leftReport.captures.find(item => item.path === path.basename(leftRecord.path));
    const right = rightReport.captures.find(item => item.path === path.basename(rightRecord.path));
    assert(left && right);
    if (comparison.id === 'same-build-repeatability') {
      assert(right.before.frames > left.before.frames, 'Repeated captures need distinct submitted frames.');
    }
    for (const capture of [left, right]) {
      assert(sameCamera(capture.before, capture.after) && sameCamera(capture.before, capture.before.drawnView));
      assert.equal(capture.before.drawnSplats, capture.after.drawnSplats);
      verifySettlement(capture.before);
      verifySettlement(capture.after);
    }
    const matched = sameCamera(left.before, right.before) && left.before.drawnSplats === right.before.drawnSplats;
    assert.equal(comparison.sameCameraAndCount, matched);
    const passes = matched && measured.maxChannelError <= comparison.criteria.maxChannelError
      && measured.p95ChannelError === 0 && measured.alphaMismatches === 0;
    if (comparison.id) {
      assert.equal(report.checks.find(check => check.id === comparison.id)?.pass, passes);
      assert.equal(report.checks.find(check => check.id === `${comparison.id}-exact-pixels`)?.pass, measured.exactPixels);
    }
    images.push({ attempt: attempt.path, id: comparison.id ?? null, ...measured, sameCameraAndCount: matched,
      criterion: comparison.criteria.source, passesCriterion: passes });
  }
  if (report.baseline) {
    const baselineRecord = originalInputs.get(originalRelative(report.baseline.path));
    assert.equal(baselineRecord?.sha256, report.baseline.sha256);
    const compared = await json(path.join(directory, baselineRecord.path));
    assert.equal(compared.packageIdentity?.manifestSha256, manifest.packageIdentities.baseline.sha256);
    assert.deepEqual(compared.conditions, report.conditions);
    assert.equal(compared.target.startsWith('https:'), report.target.startsWith('https:'));
  }
  reports.push({ attempt: attempt.path, report });
}

const baselineFaviconOnly = report => {
  if (!report.target.startsWith('https:')) return false;
  const failures = report.network.filter(request => request.status >= 400);
  return failures.length === 1 && failures[0].status === 404
    && failures[0].url === new URL('/favicon.ico', report.target).href;
};
const passed = (report, allowBaselineFavicon = false) => report.completed && report.probes.length === 4 && report.captures.length === 2
  && report.probes.every(probe => probe.input?.trusted)
  && report.pageErrors.length === 0 && report.checks.filter(check => !['budget', 'diagnostic'].includes(check.category))
    .every(check => check.pass || (allowBaselineFavicon && check.id === 'no-http-errors' && baselineFaviconOnly(report)));
const matches = (report, label) => report.packageIdentity?.manifestSha256 === manifest.packageIdentities[label].sha256;
const baselineRuns = reports.filter(({ report }) => passed(report) && !report.target.startsWith('https:') && matches(report, 'baseline'));
const publicBaselineRuns = reports.filter(({ report }) => passed(report, true) && report.target === manifest.publicUrl && matches(report, 'baseline'));
const localRuns = reports.filter(({ report }) => passed(report) && !report.target.startsWith('https:') && matches(report, 'candidate')
  && report.imageComparisons.some(comparison => comparison.id === 'approved-appearance-preserved'));
const publicRuns = reports.filter(({ report }) => passed(report) && report.target === manifest.publicUrl && matches(report, 'candidate')
  && report.imageComparisons.some(comparison => comparison.id === 'approved-appearance-preserved'));
assert(baselineRuns.length, 'A complete baseline run with trusted-input timing is required.');
assert(localRuns.length, 'A complete candidate run with matched appearance is required.');
assert(publicBaselineRuns.length, 'A complete public baseline loading run is required.');
assert(publicRuns.length, 'A complete public loading run with matched appearance and the current package identity is required.');
for (const { report } of [...baselineRuns, ...localRuns]) {
  assert.equal(report.packageIdentity.verified, true);
  const packaged = matches(report, 'baseline') ? baseline : candidate;
  assert.equal(report.packageIdentity.verifiedFiles.length, packaged.files.length);
  for (const expected of packaged.files) {
    const observed = report.packageIdentity.verifiedFiles.find(file => file.path === expected.path);
    assert.equal(observed?.sha256, expected.sha256);
    assert.equal(observed?.bytes, expected.bytes);
  }
  assert.deepEqual(report.packageManifest, packaged);
}
for (const { report } of publicRuns) assert.deepEqual(report.packageManifest, candidate);
for (const { report } of publicBaselineRuns) assert.deepEqual(report.packageManifest, baseline);
console.log(JSON.stringify({ verified: true, files: manifest.files.length, producers: manifest.producers.length,
  attempts: manifest.attempts.length, sourceFiles: sources.length, publicFiles: published.files.length,
  coverage: { baseline: baselineRuns.map(run => run.attempt), publicBaseline: publicBaselineRuns.map(run => run.attempt),
    local: localRuns.map(run => run.attempt), public: publicRuns.map(run => run.attempt) },
  publicBaselineScope: 'Comparison evidence requires all source, capture and control checks. The sole site-root favicon 404 is retained as a failed HTTP check and gives no fully-passing baseline claim.',
  transfers, probes, detailScheduling, encodedPrefixes, trialDifferences, images, regressions,
  retainedFailures: reports.flatMap(({ attempt, report }) => report.checks.filter(check => !check.pass).map(check => ({ attempt, id: check.id, category: check.category }))),
  physicalDevicePerformance: 'unverified' }));
