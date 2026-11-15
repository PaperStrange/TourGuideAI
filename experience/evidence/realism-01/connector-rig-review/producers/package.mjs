import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../..');
const workspace = resolve(root, 'artifacts/realism-01/connector-rig-review');
const output = resolve(process.argv[2] || resolve(workspace, 'package'));
const implementationBase = process.argv[3];
assert(/^[a-f0-9]{40}$/.test(implementationBase || ''), 'Supply the inspected implementation base commit');
assert(output.startsWith(workspace + sep), 'Use the ignored review workspace');
assert(!existsSync(output), 'Use a new output directory');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = filename => JSON.parse(readFileSync(filename));
const number = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
const files = new Map();
const bindings = [];

function verifiedManifest(directory, filename = 'manifest.json') {
  const bytes = readFileSync(resolve(directory, filename));
  const manifest = JSON.parse(bytes);
  const records = manifest.files || manifest.records;
  assert(Array.isArray(records), `Missing file records: ${filename}`);
  for (const record of records) {
    const name = record.path || record.file;
    const path = resolve(directory, name);
    assert(path.startsWith(directory + sep), `Manifest file escaped its directory: ${name}`);
    const data = readFileSync(path);
    assert.equal(data.length, record.bytes, path);
    assert.equal(sha(data), record.sha256, path);
  }
  bindings.push({ path: relative(root, resolve(directory, filename)), sha256: sha(bytes) });
  return { ...manifest, files: records };
}

function copy(name, source) {
  assert(!files.has(name), `Duplicate package entry: ${name}`);
  const data = readFileSync(source);
  const path = resolve(output, name);
  assert(path.startsWith(output + sep), name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  files.set(name, { path: name, bytes: data.length, sha256: sha(data), source: relative(root, source) });
}

function copyRetained(directory, manifest, name, destination) {
  assert(manifest.files.some(record => (record.path || record.file) === name), `${name} must be retained`);
  copy(destination, resolve(directory, name));
}

const historical = resolve(root, 'experience/evidence/realism-01/free-connector-board/package');
const historicalManifest = verifiedManifest(historical, 'package-manifest.json');
for (const file of historicalManifest.files) {
  if (file.path !== 'index.html') copy(file.path, resolve(historical, file.path));
}
copy('index-20261114.html', resolve(historical, 'index.html'));
copy('history/package-20261114.json', resolve(historical, 'package-manifest.json'));
for (const name of ['index.html', 'styles.css', 'board.js']) copy(name, resolve(directory, name));

const trials = [];
for (const id of ['run-01', 'run-02']) {
  const rigDirectory = resolve(root, 'experience/evidence/realism-01/connector-rig', id);
  const rigManifest = verifiedManifest(rigDirectory);
  for (const name of ['result.json', 'summary.json', 'geometry-board.png', 'manifest.json']) {
    if (name === 'manifest.json') copy(`rig/${id}/${name}`, resolve(rigDirectory, name));
    else copyRetained(rigDirectory, rigManifest, name, `rig/${id}/${name}`);
  }
  const result = read(resolve(rigDirectory, 'result.json'));
  assert(result.completed, `${id} must be complete`);
  assert.equal(result.databasePhysicalFrames.length, result.sources.length);
  assert.equal(result.databasePhysicalFrames.reduce((sum, frame) => sum + frame.dataCount, 0), result.features.length);
  assert.equal(result.features.length, result.sources.length * result.conditions.virtualCamerasPerPanorama);
  trials.push({ id, result });
}
const sourceDirectory = resolve(root, 'experience/evidence/realism-01/connector-source-intake');
const sourceManifest = verifiedManifest(sourceDirectory);
for (const record of sourceManifest.files) {
  const name = record.path || record.file;
  copyRetained(sourceDirectory, sourceManifest, name, `coverage/${name}`);
}
copy('coverage/manifest.json', resolve(sourceDirectory, 'manifest.json'));
const parallaxDirectory = resolve(root, 'experience/evidence/realism-01/connector-parallax');
const parallaxManifest = verifiedManifest(parallaxDirectory);
for (const record of parallaxManifest.files) {
  const name = record.path || record.file;
  copyRetained(parallaxDirectory, parallaxManifest, name, `parallax/${name}`);
}
copy('parallax/manifest.json', resolve(parallaxDirectory, 'manifest.json'));
const independentDirectory = resolve(root, 'experience/evidence/realism-01/connector-rig-geometry');
const independentManifest = verifiedManifest(independentDirectory);
for (const record of independentManifest.files) {
  const name = record.path || record.file;
  copyRetained(independentDirectory, independentManifest, name, `independent/${name}`);
}
copy('independent/manifest.json', resolve(independentDirectory, 'manifest.json'));

const rig = trials[0].result;
const dense = trials[1].result;
const coverage = read(resolve(sourceDirectory, 'findings.json'));
const previous = read(resolve(historical, 'records/findings.json'));
const selected = read(resolve(historical, 'records/selected.json')).sort((a, b) => a.rank - b.rank);
const perspective = read(resolve(historical, 'geometry/perspective-result.json'));
const spherical = read(resolve(historical, 'geometry/spherical-result.json'));
assert(rig.completed && perspective.completed && spherical.completed, 'All camera trials must be complete');
assert.equal(coverage.routeQualified, false, 'This research board does not release a route');
assert.equal(coverage.previousFindingsSha256, sha(readFileSync(resolve(historical, 'records/findings.json'))));
assert.equal(new Set(rig.sources.map(source => source.id)).size, selected.length);
assert.deepEqual(rig.sources.map(source => source.id).sort(), selected.map(source => source.id).sort());
const denseSelected = read(resolve(sourceDirectory, 'selection/selected.json')).sort((a, b) => a.rank - b.rank);
assert.deepEqual(dense.sources.map(source => source.id).sort(), denseSelected.map(source => source.id).sort());
const connected = dense.models.filter(model => model.relativeCameraDiagnosticPass && model.registeredAllInputPanoramas
  && model.missingInputPanoramas.length === 0 && model.registeredPhysicalFrames === dense.sources.length
  && model.registeredPanoramas.length === dense.sources.length);
assert(connected.every(model => model.finitePointsAndErrors && model.pointsAcrossAtLeastTwoPhysicalFrames > 0));
const registered = Math.max(0, ...dense.models.map(model => model.registeredPhysicalFrames));
const points = Math.max(0, ...connected.map(model => model.points3D));
const largest = connected.find(model => model.points3D === points);
const independent = read(resolve(independentDirectory, 'report.json'));
assert.equal(independent.sourceHashes['result.json'], sha(readFileSync(resolve(output, 'rig/run-02/result.json'))));
assert.equal(independent.metricOrRouteQualified, false);
assert.equal(independent.relativeGeometryDiagnosticPassed, Boolean(connected.length));
assert.equal(independent.analysis.registeredPhysicalFrames, registered);
assert.equal(independent.analysis.sparsePoints, points);
const sourceCount = coverage.recordsAudited;
assert.equal(coverage.groups.reduce((sum, group) => sum + group.records, 0), sourceCount);
const near = coverage.routeCamerasWithin50Metres;
const newNear = coverage.newRouteCamerasWithin50Metres;
assert.equal(coverage.groups.reduce((sum, group) => sum + group.routeCamerasWithin50Metres, 0), near);
assert.equal(coverage.groups.reduce((sum, group) => sum + group.newRouteCamerasWithin50Metres, 0), newNear);
const sourceDate = new Date(dense.finishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function priorMethod(id, title, report, constraints) {
  const pairs = report.directions.flatMap(direction => direction.pairs);
  const models = report.directions.flatMap(direction => direction.models);
  return { id, title, sourcePositions: `${report.sources.length} physical positions`, constraints,
    result: `${models.length} models · ${pairs.filter(pair => pair.verifiedInliers > 0).length}/${pairs.length} pairs with verified correspondences`,
    physicalPositions: report.sources.length, modelCount: models.length, latest: false };
}

const data = {
  schemaVersion: 1,
  date: `Reviewed trial · ${sourceDate} · free sources only`,
  finding: {
    title: connected.length ? 'The denser photographs recover a connected camera model' : 'Two source sets; no connected scene yet',
    description: connected.length
      ? 'The latest shared-rig trial uses four closer source positions from 17 February. Recovered relative camera poses establish a sparse diagnostic; metric scale and walking surfaces remain unverified.'
      : 'The original three positions and four closer positions from a different capture date were tested separately. Neither shared-rig run connects its physical source positions. More generated views do not create new street coverage.',
    measures: [
      { label: 'Latest trial: physical positions', value: String(dense.sources.length) },
      { label: 'Latest trial: generated views', value: String(dense.features.length) },
      { label: 'Latest trial: registered positions', value: String(registered) },
      { label: 'Latest trial: fully connected models', value: String(connected.length) },
    ],
  },
  methods: [
    priorMethod('perspective', 'Independent perspective crops', perspective, `${perspective.directions.length} separate viewing directions; no shared rig`),
    priorMethod('spherical', 'Native spherical cameras', spherical, 'One complete panorama per position'),
    { id: 'shared-rig', title: 'Shared rig · original 19 February sources', sourcePositions: `${selected.length} physical positions`,
      constraints: `${rig.features.length} virtual views; ${rig.conditions.virtualCamerasPerPanorama} fixed directions per panorama`,
      result: `${rig.models.length} models · ${Math.max(0, ...rig.models.map(model => model.registeredPhysicalFrames))}/${selected.length} physical positions recovered`,
      physicalPositions: selected.length, virtualImages: rig.features.length, modelCount: rig.models.length, latest: false },
    { id: 'dense-shared-rig', title: 'Shared rig · denser 17 February sources', sourcePositions: `${dense.sources.length} physical positions`,
      constraints: `${dense.features.length} virtual views; ${dense.conditions.virtualCamerasPerPanorama} fixed directions per panorama`,
      result: `${dense.models.length} models · ${registered}/${dense.sources.length} physical positions recovered`,
      physicalPositions: dense.sources.length, virtualImages: dense.features.length, modelCount: dense.models.length, latest: true },
  ],
  rigFigure: {
    path: 'rig/run-02/geometry-board.png',
    caption: connected.length
      ? `Measured sparse geometry: ${number(points)} points; ${largest.p95ObservedReprojectionErrorPixels.toFixed(2)} px 95th-percentile observation error; ${largest.medianMaximumPhysicalTriangulationAngleDegrees.toFixed(2)}° median physical-camera parallax. An independent native-model reload confirms the camera and point counts. Scale is arbitrary and surfaces remain unbuilt.`
      : 'Denser four-position shared-rig trial: image correspondences did not produce a connected sparse reconstruction. The recovery result is retained for comparison.',
  },
  coverage: {
    figure: 'coverage/coverage.svg',
    description: `${number(sourceCount)} source records across ${coverage.groups.length} complete local collections; ${newNear} additional cameras within 50 m of the route compared with the earlier ${previous.records.length}-record query.`,
    caption: 'Both trial sequences remain west of the first route edge. Map positions come from contributor metadata; route proximity establishes no surface overlap, connected reconstruction or measured pedestrian floor.',
    measures: [
      { label: 'Complete local collections audited', value: String(coverage.groups.length) },
      { label: 'Camera records within 50 m of the route', value: number(near) },
      { label: 'Of those, newly found in this audit', value: number(newNear) },
    ],
  },
  denseSources: {
    figure: 'coverage/contact-sheet.webp',
    caption: 'Four closer source positions from 17 February 2026. Irvin Chen / Panoramax Taiwan · CC BY-SA 4.0. These photographs were newly acquired from records already present in the earlier metadata query; their positions remain west of the route start.',
    photographs: denseSelected.map(source => ({ id: source.id, path: `coverage/selection/${source.id}-sd.jpg`, source: source.source, rank: source.rank })),
  },
  photographs: selected.map(source => ({
    id: source.id, path: `records/${source.id}-sd.jpg`,
    alt: `Original equirectangular street photograph from panorama position ${source.rank} near Shijō–Karasuma`,
    label: `Position ${source.rank} · ${source.routeDistanceMetres.toFixed(2)} m from the first edge start`,
    attribution: 'Irvin Chen / Panoramax Taiwan', license: 'CC BY-SA 4.0',
    date: new Date(source.date).toLocaleString('en-GB', { timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'medium' }) + ' JST',
    source: source.source,
    note: 'Unchanged service preview. Reconstruction uses the native 6080 × 3040 source and masks the lower hemisphere; scale, floor and full physical calibration remain unverified.',
  })),
  nextSteps: [
    connected.length
      ? 'Use the recovered cameras for a bounded surface reconstruction, checking held-out views, silhouette accuracy and capture artefacts before selecting a rendering method.'
      : 'Establish connected physical camera poses on suitable free imagery before selecting a scene-building method.',
    'Find eastward surface overlap, then establish measured scale and a continuous pedestrian floor before a walking preview.',
    'Keep the approved texture and lighting experience while testing landmark recognition, EN/ZH guidance and performance on the full six-sight route.',
  ],
  evidence: [
    { label: 'Original three-position shared-rig measurements', path: 'rig/run-01/summary.json' },
    { label: 'Original three-position shared-rig comparison', path: 'rig/run-01/geometry-board.png' },
    { label: 'Denser four-position shared-rig measurements', path: 'rig/run-02/summary.json' },
    { label: 'Denser four-position complete result', path: 'rig/run-02/result.json' },
    { label: 'Independent native-model verification', path: 'independent/report.json' },
    { label: 'Independent verification scope and limits', path: 'independent/README.md' },
    { label: 'Source coverage findings', path: 'coverage/findings.json' },
    { label: 'Source audit scope and limitations', path: 'coverage/README.md' },
    { label: 'Earlier perspective comparison', path: 'geometry/perspective-board.png' },
    { label: 'Earlier spherical comparison', path: 'geometry/spherical-board.png' },
    { label: 'Earlier spherical pair-angle audit', path: 'parallax/parallax.png' },
    { label: 'Pair-angle audit scope and measurements', path: 'parallax/README.md' },
  ],
  sourceBindings: bindings,
};
const generated = Buffer.from(JSON.stringify(data, null, 2) + '\n');
writeFileSync(resolve(output, 'review-data.json'), generated);
files.set('review-data.json', { path: 'review-data.json', bytes: generated.length, sha256: sha(generated),
  source: 'experience/evidence/realism-01/connector-rig-review/package/review-data.json',
  generatedFrom: bindings.map(binding => binding.path) });
const manifest = {
  schemaVersion: 1, id: 'realism-01-kyoto-connector-rig-review', createdAt: new Date().toISOString(), implementationBase,
  sourceBindings: bindings,
  producer: { path: relative(root, fileURLToPath(import.meta.url)), sha256: sha(readFileSync(fileURLToPath(import.meta.url))) },
  scope: 'Public research comparison of physical-camera recovery and source coverage; no application runtime or route qualification',
  files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path, 'en')),
};
writeFileSync(resolve(output, 'package-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ output: relative(root, output), files: files.size,
  bytes: [...files.values()].reduce((sum, file) => sum + file.bytes, 0),
  manifestSha256: sha(readFileSync(resolve(output, 'package-manifest.json'))) }));
