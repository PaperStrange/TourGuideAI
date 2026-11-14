import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../../../', import.meta.url)));
const directory = path.join(root, 'experience/evidence/realism-01/review-transport');
const sha = data => createHash('sha256').update(data).digest('hex');
const json = async filename => JSON.parse(await readFile(filename, 'utf8'));
const manifest = await json(path.join(directory, 'manifest.json'));
const retained = new Map();
for (const record of manifest.files) {
  assert(!retained.has(record.path), `Duplicate record: ${record.path}`);
  const filename = path.resolve(directory, record.path);
  assert(filename.startsWith(directory + path.sep), `Invalid evidence path: ${record.path}`);
  const bytes = await readFile(filename);
  assert.equal(bytes.length, record.bytes, `Evidence size: ${record.path}`);
  assert.equal(sha(bytes), record.sha256, `Evidence hash: ${record.path}`);
  for (const key of ['source', 'recordDate', 'rights', 'location', 'method', 'limitations']) {
    assert(record[key], `Missing ${key}: ${record.path}`);
  }
  retained.set(record.path, record);
}
for (const producer of manifest.producers) {
  const record = retained.get(producer.path);
  assert(record && record.sourcePath === producer.sourcePath, `Producer path: ${producer.sourcePath}`);
  assert.equal(record.bytes, producer.bytes);
  assert.equal(record.sha256, producer.sha256);
}
const displaySource = await json(path.join(directory, 'display/source/acquisition.json'));
for (const expected of displaySource.files) {
  const record = retained.get(`display/source/${expected.path}`);
  assert.equal(record?.bytes, expected.bytes);
  assert.equal(record?.sha256, expected.sha256);
  assert.equal(record?.source, expected.sourceUrl);
  assert.equal(record?.rights, expected.rights);
}
assert.equal(manifest.limits.startupBytes, 4 * 1024 * 1024);
assert.equal(manifest.limits.ordinarySectionBytes, 2 * 1024 * 1024);
assert.equal(manifest.appearanceProtocol.decision, 'D25');
assert.equal(manifest.appearanceProtocol.maxChannelError, 1);
assert.equal(manifest.appearanceProtocol.p95ChannelError, 0);
assert.equal(manifest.appearanceProtocol.alphaMismatches, 0);
const baseline = await json(path.join(directory, 'baseline/package-manifest.json'));
const approvedBytes = await readFile(path.join(root, 'experience/evidence/realism-01/review-page/package-manifest.json'));
assert.equal(retained.get('baseline/package-manifest.json').sha256, sha(approvedBytes));
const sourceRecords = new Map(baseline.files.filter(file => /data\/streamed\/.*\.radc?$/.test(file.path))
  .map(file => [file.path, file]));
assert.equal(sourceRecords.size, 40);
assert.equal(baseline.sourceSha256, manifest.sourceSha256);
const released = await json(path.join(directory, 'release/package-manifest.json'));
assert.equal(released.transportEncoding, 'identity');
assert.equal(released.baselinePackageManifestSha256, sha(approvedBytes));
assert.equal(released.sourceSha256, baseline.sourceSha256);
assert.deepEqual(released.dependencies, baseline.dependencies);
const baselineAssets = await json(path.join(directory, 'baseline/review-assets.json'));
const releaseAssets = await json(path.join(directory, 'release/review-assets.json'));
assert.deepEqual(releaseAssets, baselineAssets, 'Native source and camera metadata must remain unchanged.');

function verifyCompression(report, label) {
  assert(report.startedAt && report.finishedAt, `Compression timestamps: ${label}`);
  assert.equal(report.baseline.packageManifestSha256, sha(approvedBytes), `Baseline identity: ${label}`);
  assert.equal(report.baseline.verifiedFiles, baseline.files.length);
  for (const key of ['sourceSha256', 'sourceUrl', 'sourceAuthor', 'sourceLicense']) {
    assert.equal(report.baseline[key], baseline[key], `Source provenance ${key}: ${label}`);
  }
  assert.equal(report.files.length, 40);
  assert.equal(new Set(report.files.map(item => item.sourcePath)).size, 40);
  let rawBytes = 0, compressedBytes = 0, chunks = 0, rawAbove = 0, compressedAbove = 0;
  for (const item of report.files) {
    const original = sourceRecords.get(item.sourcePath);
    assert(original, `Unexpected source: ${item.sourcePath}`);
    assert.equal(item.rawBytes, original.bytes);
    assert.equal(item.rawSha256, original.sha256);
    assert.equal(item.decodedBytes, original.bytes);
    assert.equal(item.decodedSha256, original.sha256);
    assert.equal(item.identical, true);
    assert(Number.isSafeInteger(item.compressedBytes) && item.compressedBytes > 0);
    assert(/^[a-f0-9]{64}$/.test(item.compressedSha256));
    const isChunk = item.sourcePath.endsWith('.radc');
    assert.equal(item.ordinarySection, isChunk);
    if (isChunk) {
      chunks += 1;
      const rawPass = original.bytes <= manifest.limits.ordinarySectionBytes;
      const compressedPass = item.compressedBytes <= manifest.limits.ordinarySectionBytes;
      assert.equal(item.rawWithinSectionBudget, rawPass);
      assert.equal(item.compressedWithinSectionBudget, compressedPass);
      if (!rawPass) rawAbove += 1;
      if (!compressedPass) compressedAbove += 1;
    } else {
      assert.equal(item.compressedBytes, original.bytes);
      assert.equal(item.compressedSha256, original.sha256);
    }
    rawBytes += original.bytes;
    compressedBytes += item.compressedBytes;
  }
  assert.equal(chunks, 39);
  const expected = { files: 40, chunks, decodedIdentical: 40, rawBytes, compressedBytes,
    savedBytes: rawBytes - compressedBytes, reductionPercent: (rawBytes - compressedBytes) / rawBytes * 100,
    sectionBudgetBytes: manifest.limits.ordinarySectionBytes,
    rawSectionsAboveBudget: rawAbove, compressedSectionsAboveBudget: compressedAbove };
  assert.deepEqual(report.totals, expected, `Compression totals: ${label}`);
  assert.equal(report.method.streamedShDegree, 2);
  assert.equal(report.method.encoder, 'node:zlib gzipSync');
  assert.equal(report.method.decoder, 'node:zlib gunzipSync');
  assert.equal(report.method.level, 9);
  assert.equal(report.method.headerEncoding, 'identity');
  assert.equal(report.method.chunkEncoding, 'gzip');
  assert.equal(report.method.sourceDataChanged, false);
  assert.equal(report.method.renderingSettingsChanged, false);
  return expected;
}
const compression = await json(path.join(directory, 'compression/report.json'));
const compressionTotals = verifyCompression(compression, 'measured gzip trial');
assert.equal(retained.get('compression/executed-package.mjs').sha256, compression.producer.sha256);
const compressionAttempts = [{ path: 'compression/report.json', totals: compressionTotals }];
for (const record of manifest.files.filter(item => /^compression\/attempts\/[^/]+\/report\.json$/.test(item.path))) {
  const report = await json(path.join(directory, record.path));
  const totals = verifyCompression(report, record.path);
  assert.equal(retained.get(path.join(path.dirname(record.path), 'executed-package.mjs'))?.sha256, report.producer.sha256);
  compressionAttempts.push({ path: record.path, totals });
}
for (const [name, source] of sourceRecords) {
  const candidate = released.files.find(item => item.path === name);
  assert(candidate, `Missing native source: ${name}`);
  assert.equal(candidate.bytes, source.bytes);
  assert.equal(candidate.sha256, source.sha256);
}
assert.equal(released.streamedSourceBytes, compressionTotals.rawBytes);
const original = baseline.files.find(item => item.path === 'data/knock-original.sog');
assert.equal(released.files.find(item => item.path === original.path)?.sha256, original.sha256);
for (const producer of released.producers) {
  const snapshot = manifest.producers.find(item => item.sourcePath === producer.path);
  assert(snapshot, `Missing release producer: ${producer.path}`);
  assert.equal(snapshot.bytes, producer.bytes);
  assert.equal(snapshot.sha256, producer.sha256);
}

const published = await json(path.join(directory, 'published-bytes.json'));
const publicationAudit = await json(path.join(directory, 'release/publication-audit.json'));
assert.equal(publicationAudit.packageManifestSha256, retained.get('release/package-manifest.json').sha256);
assert.equal(publicationAudit.verifiedFiles, released.files.length + 1);
assert.equal(publicationAudit.otherPublishedPathsUnchanged, true);
for (const key of ['tree', 'parent', 'implementation']) assert(/^[a-f0-9]{40}$/.test(publicationAudit[key]));
assert.equal(published.baseURL, manifest.publicUrl);
assert.equal(published.failed, 0, 'Public byte verification has failures');
assert.equal(published.files.length, released.files.length + 1);
for (const expected of released.files) {
  const observed = published.files.find(item => item.path === '/' + expected.path);
  assert(observed?.pass, `Public file missing: ${expected.path}`);
  assert.equal(observed.observed.bytes, expected.bytes);
  assert.equal(observed.observed.sha256, expected.sha256);
}
assert.equal(published.files.find(item => item.path === '/package-manifest.json')?.observed.sha256,
  retained.get('release/package-manifest.json').sha256);

const reports = [];
const recomputedTransfers = [];
const recomputedImages = [];
const recomputedTourMotion = [];
const interruptedAttempts = [];
const encodedPrefixChecks = [];
const sameCamera = (left, right) => ['matrixWorld', 'projectionMatrix'].every(key =>
  left?.[key]?.length === 16 && right?.[key]?.length === 16
  && left[key].every((value, index) => Math.abs(value - right[key][index]) < 1e-7));

function transferredAt(network, scenario, boundary) {
  assert(Number.isFinite(boundary) && boundary > 0, 'A finite CDP boundary is required');
  const requests = network.filter(item => item.scenario === scenario && item.startedAt <= boundary).map(item => {
    const complete = Number.isFinite(item.finishedAt) && item.finishedAt <= boundary;
    const responseStarted = Number.isFinite(item.responseAt) && item.responseAt <= boundary;
    const bodyBytes = item.data.filter(event => event.timestamp <= boundary).reduce((sum, event) => sum + event.encodedDataLength, 0);
    const bytes = complete ? item.totalEncodedBytes : (responseStarted ? item.headerBytes : 0) + bodyBytes;
    assert(Number.isFinite(bytes) && bytes >= 0, `Unknown encoded bytes for ${item.requestId}`);
    return { requestId: item.requestId, url: item.url, complete, responseStarted, encodedBytes: bytes,
      headerBytes: responseStarted ? item.headerBytes : 0, observedBodyBytes: bodyBytes };
  });
  const completedBytes = requests.filter(item => item.complete).reduce((sum, item) => sum + item.encodedBytes, 0);
  const inflightBytes = requests.filter(item => !item.complete).reduce((sum, item) => sum + item.encodedBytes, 0);
  return { boundary, completedBytes, inflightBytes, totalEncodedBytes: completedBytes + inflightBytes, requests };
}

const imageMetricsProgram = `
import hashlib
import json
import math
import sys
from PIL import Image, ImageChops

reference = Image.open(sys.argv[1]).convert("RGBA")
candidate = Image.open(sys.argv[2]).convert("RGBA")
assert reference.size == candidate.size
reference_bytes = reference.tobytes()
candidate_bytes = candidate.tobytes()
histogram = ImageChops.difference(reference.convert("RGB"), candidate.convert("RGB")).histogram()
counts = [sum(histogram[value + band * 256] for band in range(3)) for value in range(256)]
channels = reference.width * reference.height * 3
rank = math.ceil(channels * .95)
accumulated = 0
percentile = 0
for value, count in enumerate(counts):
    accumulated += count
    if accumulated >= rank:
        percentile = value
        break
alpha_histogram = ImageChops.difference(reference.getchannel("A"), candidate.getchannel("A")).histogram()
print(json.dumps({
    "dimensions": {"width": reference.width, "height": reference.height},
    "referencePixelSha256": hashlib.sha256(reference_bytes).hexdigest(),
    "candidatePixelSha256": hashlib.sha256(candidate_bytes).hexdigest(),
    "meanAbsoluteError255": sum(value * count for value, count in enumerate(counts)) / channels,
    "differingRgbChannels": sum(counts[1:]),
    "p95ChannelError": percentile,
    "maxChannelError": max(value for value, count in enumerate(counts) if count),
    "alphaMismatches": sum(alpha_histogram[1:]),
    "exactPixels": reference_bytes == candidate_bytes,
}))
`;
const execute = promisify(execFile);
const nativeVisibility = [];
for (const [reportName, producerName] of [['result.json', 'probe.mjs'], ['result-01-sandbox.json', 'probe-01.mjs']]) {
  const folder = 'diagnostics/native-visibility';
  const report = await json(path.join(directory, folder, reportName));
  assert.equal(retained.get(`${folder}/${producerName}`).sha256, report.scriptSha256);
  assert(report.finishedAt);
  if (report.completed) {
    const background = report.samples.find(sample => sample.phase === 'background-tab');
    const returned = report.samples.find(sample => sample.phase === 'returned-tab');
    const sameWindow = report.originalWindow.windowId === report.backgroundWindow.windowId;
    assert.equal(report.sameWindow, sameWindow);
    assert.equal(report.nativeTabVisibilityPass, sameWindow && background.hidden === true && returned.hidden === false
      && background.visibilityEvents.some(event => event.hidden && event.trusted)
      && returned.visibilityEvents.some(event => !event.hidden && event.trusted));
    assert.equal(report.nativeMinimizePass, report.samples.find(sample => sample.phase === 'minimized').hidden === true);
  } else assert(report.error, 'Failed native visibility probe requires its actual error');
  nativeVisibility.push({ path: `${folder}/${reportName}`, completed: report.completed,
    nativeTabVisibilityPass: report.nativeTabVisibilityPass ?? null, nativeMinimizePass: report.nativeMinimizePass ?? null });
}

for (const record of manifest.files.filter(item => item.path.startsWith('runs/') && item.path.endsWith('/result.json'))) {
  const report = await json(path.join(directory, record.path));
  const folder = path.dirname(record.path);
  if (!report.finishedAt) {
    assert.equal(report.completed, false);
    const receiptRecord = retained.get(record.interruptionReceipt);
    assert(receiptRecord, `Unfinished attempt requires an interruption receipt: ${record.path}`);
    const receipt = await json(path.join(directory, receiptRecord.path));
    assert.equal(receipt.runnerExited, true);
    assert.equal(receipt.originalReportChanged, false);
    assert.equal(receipt.attemptReport, record.input);
    assert.equal(receipt.reportSha256, record.sha256);
    assert.equal(receipt.driverSha256, report.driver.sha256);
    assert(receipt.recordedAt && receipt.method && receipt.limitations);
    assert.deepEqual(receipt.completedSections, Object.entries(report.sections)
      .filter(([, progress]) => progress.completed).map(([section]) => section));
    assert.equal(receipt.passingChecks, report.checks.filter(check => check.pass).length);
    interruptedAttempts.push({ attempt: folder, receipt: receiptRecord.path,
      observedRecoveryAt: receipt.recordedAt, originalFinishedAt: null, originalCompleted: false });
  }
  assert.equal(retained.get(path.join(folder, 'executed-driver.mjs'))?.sha256, report.driver.sha256);
  if (report.environment.trustReceipt) {
    const receipt = report.environment.trustReceipt;
    const record = manifest.files.find(item => item.input === receipt.path);
    assert(record, `Missing trust receipt: ${receipt.path}`);
    assert.equal(receipt.sha256, record.sha256);
    assert.deepEqual(receipt.content, await json(path.join(directory, record.path)));
  }
  for (const screenshot of report.screenshots) {
    const picture = retained.get(path.join(folder, screenshot.path));
    assert(picture, `Missing capture: ${screenshot.path}`);
    assert.equal(picture.bytes, screenshot.bytes);
    assert.equal(picture.sha256, screenshot.sha256);
  }
  for (const check of report.checks) {
    if (check.category === 'budget') assert(/^transfer-.*-first-visible-within-4mib$/.test(check.id), `Unexpected budget category: ${check.id}`);
    if (check.category === 'diagnostic') assert(/^(approved-reference|candidate-repeatability|reference-repeatability)-identical-settled-pixels$/.test(check.id),
      `Unexpected diagnostic category: ${check.id}`);
  }
  const movement = report.checks.find(check => check.id === 'tour-renders-continuous-movement');
  if (movement) {
    const { before, after } = movement.evidence;
    const advanced = after.drawnView.frames > before.drawnView.frames;
    const changed = !sameCamera(before.drawnView, after.drawnView);
    assert.equal(movement.pass, changed && after.tour.status === 'running');
    if (movement.pass) assert(advanced && before.drawnView.drawnSplats > 0 && after.drawnView.drawnSplats > 0);
    recomputedTourMotion.push({ attempt: folder, beforeFrame: before.drawnView.frames,
      afterFrame: after.drawnView.frames, submittedCameraChanged: changed,
      beforePosition: before.drawnView.matrixWorld.slice(12, 15), afterPosition: after.drawnView.matrixWorld.slice(12, 15) });
  }
  const paused = report.checks.find(check => check.id === 'tour-pause-holds-camera');
  if (paused) {
    const { before, after } = paused.evidence;
    assert.equal(paused.pass, after.tour.status === 'paused' && sameCamera(before, after));
    if (paused.pass) {
      assert(sameCamera(before, before.drawnView) && sameCamera(after, after.drawnView));
      assert(after.drawnView.frames > before.drawnView.frames);
    }
  }
  const hidden = report.checks.find(check => check.id === 'tour-hidden-tab-pauses');
  if (hidden?.evidence.visibilityEvents) {
    const observed = hidden.evidence;
    assert.equal(hidden.pass, observed.hiddenObserved && observed.sourceWindow.windowId === observed.backgroundWindow.windowId
      && observed.visibilityEvents.some(event => event.hidden && event.trusted)
      && observed.returned.tour.status === 'paused' && observed.returned.tour.pauseReason === 'hidden');
  }
  if (report.sourceIdentity) {
    const identity = report.sourceIdentity;
    assert.equal(identity.approvedManifest.sha256, sha(approvedBytes));
    const expected = baseline.files.filter(file => file.path.startsWith('data/'));
    assert.equal(expected.length, 41);
    assert.equal(identity.declared.length, expected.length);
    assert.equal(new Set(identity.declared.map(item => item.path)).size, expected.length);
    let declaredIdentical = true;
    for (const item of identity.declared) {
      const source = expected.find(file => file.path === item.path);
      assert(source, `Unexpected declared source: ${item.path}`);
      assert.equal(item.sha256, source.sha256);
      assert.equal(item.bytes, source.bytes);
      declaredIdentical &&= item.candidate?.sha256 === source.sha256 && item.candidate?.bytes === source.bytes;
    }
    assert.equal(report.checks.find(check => check.id === 'source-manifest-retains-approved-data')?.pass, declaredIdentical);
    if (identity.localByteHashesAvailable) {
      assert.equal(identity.observed.length, expected.length);
      assert.equal(new Set(identity.observed.map(item => item.path)).size, expected.length);
      let observedIdentical = true;
      for (const item of identity.observed) {
        const source = expected.find(file => file.path === item.path);
        assert(source, `Unexpected observed source: ${item.path}`);
        assert.equal(item.expected.sha256, source.sha256);
        assert.equal(item.expected.bytes, source.bytes);
        assert.deepEqual(item.observed, report.packageFiles.find(file => file.path === item.path));
        observedIdentical &&= item.observed?.sha256 === source.sha256 && item.observed?.bytes === source.bytes;
      }
      assert.equal(report.checks.find(check => check.id === 'local-source-bytes-retain-approved-data')?.pass, observedIdentical);
    }
  }
  for (const [label, entry] of Object.entries(report.transfer ?? {})) {
    const scenario = `transport-${label}`;
    if (report.target.startsWith('https:')) {
      const completed = report.network.filter(item => item.scenario === scenario && Number.isFinite(item.finishedAt));
      for (const response of completed) {
        const reconstructed = response.headerBytes + response.data.reduce((sum, event) => sum + event.encodedDataLength, 0);
        assert.equal(reconstructed, response.totalEncodedBytes, `${record.path}: encoded response prefix ${response.url}`);
      }
      encodedPrefixChecks.push({ attempt: folder, scenario, completedResponses: completed.length, discrepancies: 0 });
    }
    assert.deepEqual(entry.conditions, { downloadBitsPerSecond: 10000000, latencyMs: 80, cacheDisabled: true });
    const boundaries = [
      ['firstVisibleObservedTransfer', entry.navStart + entry.firstVisibleObservedAtMs / 1000],
      ['settledObservedTransfer', entry.navStart + entry.settledObservedAtMs / 1000],
    ];
    if (label === 'reference') {
      assert.equal(entry.firstVisibleBoundary, null);
      assert.equal(entry.settledBoundary, null);
      assert.equal(entry.firstVisible, null);
      assert.equal(entry.settled, null);
    } else {
      assert.equal(entry.firstVisibleAtMs, entry.firstView.firstVisibleAt);
      assert.equal(entry.settledAtMs, entry.settledView.firstSettledAt);
      assert.equal(entry.firstVisibleBoundary, entry.navStart + entry.firstVisibleAtMs / 1000);
      assert.equal(entry.settledBoundary, entry.navStart + entry.settledAtMs / 1000);
      assert(entry.firstVisibleBoundary <= entry.settledBoundary);
      assert.equal(entry.settledView.drawnView.paging?.settled, true);
      assert(sameCamera(entry.settledView, entry.settledView.drawnView));
      assert.equal(entry.settledView.drawnView.drawnSplats, entry.settledView.drawnSplats);
      assert.equal(entry.settledView.drawnView.frames, entry.settledView.frames);
      assert(entry.settledView.drawnView.submittedAt >= entry.settledAtMs);
      assert(entry.settledView.firstSettledFrame <= entry.settledView.drawnView.frames);
      boundaries.push(['firstVisible', entry.firstVisibleBoundary], ['settled', entry.settledBoundary]);
    }
    assert(entry.settledView.drawnSplats > 0 && entry.canvasScreenshot.stableDuringCapture);
    assert(sameCamera(entry.canvasScreenshot.before, entry.canvasScreenshot.after));
    assert.equal(entry.canvasScreenshot.before.drawnSplats, entry.canvasScreenshot.after.drawnSplats);
    for (const [key, boundary] of boundaries) {
      const measured = transferredAt(report.network, scenario, boundary);
      assert.deepEqual(entry[key], measured, `${record.path}: ${label} ${key}`);
      recomputedTransfers.push({ attempt: folder, label, boundary: key, bytes: measured.totalEncodedBytes,
        within4MiB: measured.totalEncodedBytes <= manifest.limits.startupBytes });
    }
    const budget = report.checks.find(check => check.id === `transfer-${label}-first-visible-within-4mib`);
    if (label !== 'reference') {
      assert(budget?.category === 'budget');
      assert.equal(budget.pass, entry.firstVisible.totalEncodedBytes <= manifest.limits.startupBytes);
    }
  }
  for (const [key, label] of [['imageComparison', 'approved-reference'],
    ['candidateRepeatability', 'candidate-repeatability'], ['referenceRepeatability', 'reference-repeatability']]) {
    const comparison = report[key];
    if (!comparison) continue;
    const source = report.screenshots.find(item => item.path === comparison.referencePath);
    const candidate = report.screenshots.find(item => item.path === comparison.candidatePath);
    assert(source && candidate, 'Compared PNG captures are missing');
    assert(source.stableDuringCapture && candidate.stableDuringCapture);
    assert.equal(comparison.sameCamera, sameCamera(source.before, candidate.before));
    assert.equal(comparison.referenceDrawnSplats, source.before.drawnSplats);
    assert.equal(comparison.candidateDrawnSplats, candidate.before.drawnSplats);
    assert.equal(report.checks.find(check => check.id === `${label}-same-camera`)?.pass,
      comparison.sameCamera && comparison.referenceDrawnSplats === comparison.candidateDrawnSplats);
    if (comparison.appearanceCriteria) {
      assert.deepEqual(comparison.appearanceCriteria, { maxChannelError: 1, p95ChannelError: 0,
        alphaMismatches: 0, source: 'D25 appearance protocol' });
      for (const [key, field] of [['matrixWorld', 'worldMatrixMaxAbsoluteDifference'],
        ['projectionMatrix', 'projectionMatrixMaxAbsoluteDifference']]) {
        const maximum = Math.max(...source.before[key].map((value, index) => Math.abs(value - candidate.before[key][index])));
        assert.equal(comparison[field], maximum);
      }
    }
    assert.equal(comparison.pixelFormat, 'RGBA8');
    assert.equal(comparison.metricChannels, 'RGB');
    assert.equal(comparison.p95Definition, 'Ascending absolute RGB channel differences, rank ceil(0.95*N), one-based');
    const referencePath = path.join(directory, folder, comparison.referencePath);
    const candidatePath = path.join(directory, folder, comparison.candidatePath);
    assert(retained.has(path.join(folder, comparison.referencePath)) && retained.has(path.join(folder, comparison.candidatePath)));
    const { stdout } = await execute(process.env.REVIEW_VERIFY_PYTHON || 'python', ['-c', imageMetricsProgram, referencePath, candidatePath]);
    const measured = JSON.parse(stdout);
    for (const [key, value] of Object.entries(measured)) {
      if (key === 'differingRgbChannels' && comparison[key] === undefined) continue;
      assert.deepEqual(comparison[key], value, `${record.path}: PNG ${key}`);
    }
    assert.equal(report.checks.find(check => check.id === `${label}-identical-settled-pixels`)?.pass, measured.exactPixels);
    if (comparison.appearanceCriteria) {
      const passes = comparison.sameCamera && comparison.referenceDrawnSplats === comparison.candidateDrawnSplats
        && measured.maxChannelError <= manifest.appearanceProtocol.maxChannelError
        && measured.p95ChannelError === manifest.appearanceProtocol.p95ChannelError
        && measured.alphaMismatches === manifest.appearanceProtocol.alphaMismatches;
      assert.equal(report.checks.find(check => check.id === `${label}-appearance-preserved`)?.pass, passes);
    }
    recomputedImages.push({ attempt: folder, comparison: key, ...measured });
  }
  reports.push({ report, folder });
}
const functionalChecks = report => report.checks.filter(check => !['budget', 'diagnostic'].includes(check.category));
const functional = report => report.completed && functionalChecks(report).length > 0
  && functionalChecks(report).every(check => check.pass);
const sectionNames = ['shell', 'module-recovery', 'desktop', 'cancellation', 'paged-cancellation',
  'recovery', 'phone', 'tour', 'tour-endpoints'];
const currentManifest = report => report.sourceIdentity?.candidateManifest.sha256 === retained.get('release/package-manifest.json').sha256;
const samePackage = report => currentManifest(report) && released.files.every(file =>
  report.packageFiles.some(item => item.path === file.path && item.sha256 === file.sha256 && item.bytes === file.bytes));
const matchesHostedCode = report => released.files.filter(file => file.path === 'index.html' || /\.(js|css)$/.test(file.path))
  .every(file => report.responses.some(response => response.sha256 === file.sha256
    && new URL(response.url).pathname.endsWith('/' + file.path)));
const checksPassed = checks => checks.filter(check => !['budget', 'diagnostic'].includes(check.category)).every(check => check.pass);
const observedErrorsAbsent = report => report.pageErrors.length === 0
  && report.responses.every(response => response.status < 400 || response.scenario === 'recovery')
  && report.requests.every(request => !request.external);
const partialAttemptCoverage = [];
function completedSections(report, folder) {
  if (functional(report)) return report.environment.sections;
  if (!observedErrorsAbsent(report)) return [];
  if (report.sections) {
    const sections = [];
    for (const [section, progress] of Object.entries(report.sections)) {
      if (!progress.completed) continue;
      assert(report.environment.sections.includes(section) && progress.startedAt && progress.finishedAt);
      assert(Number.isInteger(progress.firstCheck) && Number.isInteger(progress.lastCheck)
        && progress.firstCheck >= 0 && progress.lastCheck >= progress.firstCheck && progress.lastCheck < report.checks.length);
      if (checksPassed(report.checks.slice(progress.firstCheck, progress.lastCheck + 1))) sections.push(section);
    }
    if (sections.length) partialAttemptCoverage.push({ attempt: folder, sections,
      method: 'Recorded completed sections and their successful check ranges; overall attempt remains incomplete.' });
    return sections;
  }
  // 历史驱动按顺序执行；后续场景的检查证明前面场景已经返回，整体超时仍然保留。
  if (report.driver.sha256 !== '6ceb33e4762310c0914e1c96aa3c1ad4814a8f65a7e88573108e3b2d820b52e1') return [];
  const sequence = ['shell', 'module-recovery', 'desktop', 'cancellation', 'paged-cancellation', 'recovery', 'phone', 'tour-endpoints'];
  assert.deepEqual(report.environment.sections, sequence);
  assert(report.termination?.stack.includes('Object.tourEndpoints'));
  assert.deepEqual(report.checks.slice(-2).map(check => check.id),
    ['tour-approach-pause-holds-camera', 'tour-approach-resume-keeps-current-view']);
  assert(checksPassed(report.checks));
  for (const name of ['shell', 'moduleRecovery', 'desktop', 'cancellation', 'pagedCancellation', 'recovery', 'phone']) {
    assert(report.scenarios[name], `Missing completed scenario: ${name}`);
  }
  const sections = sequence.slice(0, -1);
  partialAttemptCoverage.push({ attempt: folder, sections,
    method: 'Archived sequential driver reached two checks in tour-endpoints after all seven preceding scenarios returned. Endpoint timeout remains unqualified.' });
  return sections;
}
// 每个场景都必须来自相同发布字节的实际成功运行，允许独立的有界浏览器会话。
const coverage = {};
for (const target of ['local', 'public']) {
  const eligible = reports.filter(({ report }) => target === 'local'
    ? !report.target.startsWith('https:') && samePackage(report)
    : report.target === manifest.publicUrl && currentManifest(report) && matchesHostedCode(report))
    .map(({ report, folder }) => ({ folder, sections: completedSections(report, folder) }));
  const requiredSections = target === 'public' ? sectionNames.filter(section => section !== 'tour-endpoints') : sectionNames;
  coverage[target] = Object.fromEntries(requiredSections.map(section => [section,
    eligible.filter(item => item.sections.includes(section)).map(({ folder }) => folder)]));
  for (const [section, attempts] of Object.entries(coverage[target])) {
    assert(attempts.length > 0, `Successful final ${target} walkthrough is missing section: ${section}`);
  }
}
const appearancePreserved = comparison => comparison?.appearanceCriteria && comparison.sameCamera
  && comparison.referenceDrawnSplats === comparison.candidateDrawnSplats
  && comparison.maxChannelError <= manifest.appearanceProtocol.maxChannelError
  && comparison.p95ChannelError === manifest.appearanceProtocol.p95ChannelError
  && comparison.alphaMismatches === manifest.appearanceProtocol.alphaMismatches;
const appearanceQualification = reports.filter(({ report }) => functional(report) && samePackage(report)
  && ['imageComparison', 'candidateRepeatability', 'referenceRepeatability'].every(key => appearancePreserved(report[key]))
  && baseline.files.every(file => (report.referencePackageFiles ?? []).some(item => item.path === file.path
    && item.sha256 === file.sha256 && item.bytes === file.bytes)));
assert(appearanceQualification.length > 0,
  'Final package requires a measured approved-baseline comparison and same-build repeatability within D25');
console.log(JSON.stringify({ verified: true, files: manifest.files.length, producers: manifest.producers.length,
  attempts: reports.length, functionalAttempts: reports.filter(({ report }) => functional(report)).length,
  coverage, partialAttemptCoverage, interruptedAttempts,
  publicEndpointCoverage: 'Full sweep verified on the byte-identical local package; no independent public endpoint sweep claimed.',
  publicFiles: published.files.length, compression: compressionTotals, compressionAttempts,
  retainedBudgetFailures: reports.flatMap(({ report, folder }) => report.checks
    .filter(check => check.category === 'budget' && !check.pass).map(check => ({ attempt: folder, id: check.id }))),
  retainedExactPixelFailures: reports.flatMap(({ report, folder }) => report.checks
    .filter(check => check.id.endsWith('-identical-settled-pixels') && !check.pass).map(check => ({ attempt: folder, id: check.id }))),
  appearanceQualification: appearanceQualification.map(({ folder }) => folder),
  recomputedTransfers, recomputedImages, recomputedTourMotion, nativeVisibility, encodedPrefixChecks,
  physicalDevicePerformance: 'unverified' }));
