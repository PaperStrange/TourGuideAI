import Ajv from 'ajv';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const schemaDirectory = new URL('../sprints/realism-01/schemas/', import.meta.url);
const readJSON = path => JSON.parse(readFileSync(path, 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: true });
const manifestSchema = readJSON(new URL('manifest.schema.json', schemaDirectory));
ajv.addSchema(manifestSchema);
const validateManifestSchema = ajv.getSchema('realism-manifest-v1');
const validateRunSchema = ajv.compile(readJSON(new URL('run-result.schema.json', schemaDirectory)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const identityKeys = ['hardware', 'operatingSystem', 'browser', 'graphicsDriver', 'powerMode'];
const entryIds = ['cold', 'warm-1', 'warm-2', 'warm-3'];
const directions = ['forward', 'reverse'];
const edgeIndices = Array.from({ length: 54 }, (_, index) => index);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const conditionKey = value => `${value.candidateId}/${value.deviceId}/${value.locale}/${value.lighting}/${value.session}`;
const runCondition = run => ({ candidateId: run.candidateId, deviceId: run.device.id, ...run.condition });
const require = (condition, message) => { if (!condition) throw new Error(message); };
const gate = (id, status, evidence) => ({ id, status, evidence });
const combine = gates => gates.some(item => item.status === 'fail') ? 'fail'
  : gates.some(item => item.status === 'unverified') ? 'unverified' : 'pass';

export const percentile95 = values => values.length
  ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * .95) - 1] : null;

export function numericGate(id, value, maximum, { strict = false } = {}) {
  return gate(id, value === null || value === undefined ? 'unverified'
    : Number.isFinite(value) && value >= 0 && (strict ? value < maximum : value <= maximum) ? 'pass' : 'fail',
  { observed: value ?? null, maximum, comparison: strict ? '<' : '<=' });
}

export function fullQualityGate(entry) {
  const value = entry.fullQuality;
  if (!value) return gate(`${entry.id}-full-quality`, 'unverified', 'No final-detail submitted-frame observation.');
  const containsDetail = value.geometryReady && value.materialsReady && value.lightingReady
    && value.requiredDetailSha256 === value.drawnDetailSha256;
  const laterDraw = value.drawFrame > value.residentFrame && value.drawSubmittedAtMs > value.residentAtMs;
  if (!containsDetail || !laterDraw) return gate(`${entry.id}-full-quality`, 'unverified',
    'Required resident geometry/materials/lighting must be bound to a later submitted frame.');
  return numericGate(`${entry.id}-full-quality`, value.drawSubmittedAtMs, entry.id === 'cold' ? 8000 : 3000);
}

export function inputCompletenessGate(plannedActions, dispatchedActions, responses) {
  const planned = new Set(plannedActions.map(value => value.actionId));
  const dispatched = new Set(dispatchedActions.map(value => value.actionId));
  const responded = new Set(responses.map(value => value.actionId));
  require(planned.size === plannedActions.length && dispatched.size === dispatchedActions.length
    && responded.size === responses.length, 'Duplicate input action identity.');
  require(dispatchedActions.every(value => planned.has(value.actionId)), 'Input action is absent from frozen plan.');
  require(responses.every(value => dispatched.has(value.actionId)), 'Input response has no dispatched action.');
  for (const response of responses) {
    const dispatch = dispatchedActions.find(value => value.actionId === response.actionId);
    require(response.eventTimeStampMs === dispatch.eventTimeStampMs, 'Input response timestamp differs from dispatched action.');
  }
  const missingDispatches = [...planned].filter(id => !dispatched.has(id));
  const missingResponses = [...dispatched].filter(id => !responded.has(id));
  const untrusted = dispatchedActions.filter(value => !value.trusted).map(value => value.actionId);
  return gate('input-observation-completeness', planned.size > 0 && missingDispatches.length === 0
    && missingResponses.length === 0 && untrusted.length === 0 ? 'pass' : 'unverified',
  { intended: planned.size, dispatched: dispatched.size, responses: responded.size, missingDispatches, missingResponses, untrusted });
}

export function validateComparison(comparison, candidates) {
  const selected = comparison.candidateIds.map(id => candidates.find(candidate => candidate.id === id));
  require(selected.every(Boolean), 'Unknown final comparison candidate.');
  require(selected.length === (comparison.kind === 'absolute' ? 1 : 2), 'Comparison kind and candidate count differ.');
  if (comparison.kind === 'renderer') {
    for (const key of ['sourceManifestSha256', 'cameraSha256', 'groundCollisionSha256', 'interfaceSha256', 'qualitySha256']) {
      require(selected[0].binding[key] === selected[1].binding[key], `Renderer comparison requires matched ${key}.`);
    }
  }
}

function validateFrozenPlan(manifest) {
  const plan = manifest.interactionPlan;
  for (const direction of directions) {
    for (const index of edgeIndices) require(plan.some(action => action.direction === direction
      && action.edgeIndex === index && action.kind === 'walk'), `Missing planned walk: ${direction}/${index}`);
    for (const region of manifest.requiredTurnRegions) require(plan.some(action => action.direction === direction
      && action.edgeIndex === region.edgeIndex && action.kind === 'turn'), `Missing planned turn: ${direction}/${region.edgeIndex}`);
  }
  const ids = manifest.finalComparison.candidateIds;
  require(manifest.candidates.length === ids.length, 'Frozen candidate inventory must match final comparison.');
  require(manifest.runOrder.length === ids.length * 24, 'Frozen run order must contain the complete condition matrix.');
  for (const device of manifest.devices) for (const locale of ['en', 'zh']) for (const lighting of ['day', 'night']) {
    const order = manifest.runOrder.filter(value => value.deviceId === device.id && value.locale === locale && value.lighting === lighting);
    const expected = [1, 2, 3].flatMap(session => ids.map((id, index) => ({
      candidateId: ids[(index + session - 1) % ids.length], deviceId: device.id, locale, lighting, session,
    })));
    require(same(order.map(conditionKey), expected.map(conditionKey)),
      `Run order must rotate candidates across sessions: ${device.id}/${locale}/${lighting}`);
  }
}

export function runOrderGate(runOrder, runs) {
  if (!runOrder.length) return gate('observed-run-order', 'unverified', 'No frozen run order.');
  const order = runOrder.map(conditionKey);
  const observed = [...runs].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const indices = observed.map(run => order.indexOf(conditionKey(runCondition(run))));
  require(indices.every(index => index >= 0), 'Observed run is absent from frozen run order.');
  const chronological = indices.every((value, index) => index === 0 || value > indices[index - 1]);
  const distinctTimes = new Set(runs.map(run => Date.parse(run.startedAt))).size === runs.length;
  return gate('observed-run-order', !chronological ? 'fail'
    : observed.length === order.length && distinctTimes ? 'pass' : 'unverified', { planned: order, observed: observed.map(run => conditionKey(runCondition(run))) });
}

export function validateManifest(manifest) {
  require(validateManifestSchema(manifest), `Invalid BenchmarkManifest: ${ajv.errorsText(validateManifestSchema.errors)}`);
  require(new Set(manifest.candidates.map(candidate => candidate.id)).size === manifest.candidates.length, 'Duplicate candidate IDs.');
  require(new Set(manifest.devices.map(device => device.id)).size === 2, 'Both reference devices are required.');
  require(new Set(manifest.requiredTurnRegions.map(region => region.sightId)).size === manifest.requiredTurnRegions.length, 'Duplicate required turn region.');
  require(new Set(manifest.interactionPlan.map(action => action.actionId)).size === manifest.interactionPlan.length, 'Duplicate planned action ID.');
  require(new Set(manifest.runOrder.map(conditionKey)).size === manifest.runOrder.length, 'Duplicate planned session condition.');
  for (const candidate of manifest.candidates) {
    const evidenceHashes = new Set(candidate.evidence.map(record => record.sha256));
    for (const [key, value] of Object.entries(candidate.binding)) {
      if (key.endsWith('Sha256')) require(evidenceHashes.has(value), `Missing bound evidence: ${candidate.id}/${key}`);
    }
  }
  if (manifest.status === 'frozen') {
    require(manifest.prerequisites.length === 0, 'Frozen manifest has unresolved prerequisites.');
    require(manifest.candidates.length > 0, 'Frozen manifest requires candidates.');
    for (const device of manifest.devices) require(identityKeys.every(key => device[key]), `Incomplete device identity: ${device.id}`);
    require(manifest.finalComparison.candidateIds.length > 0, 'Frozen manifest requires a declared comparison or absolute-acceptance candidate.');
    require(manifest.finalComparison.candidateIds.every(id => manifest.candidates.some(candidate => candidate.id === id)), 'Unknown final comparison candidate.');
    const comparison = manifest.finalComparison;
    require(comparison.costReferenceHours !== null && comparison.costReferenceCash !== null
      && comparison.currency && comparison.costEvidence.length > 0, 'Frozen manifest requires complete cost references and evidence.');
    validateComparison(comparison, manifest.candidates);
    validateFrozenPlan(manifest);
  }
  return manifest;
}

export function validateRun(run, manifest, manifestSha256) {
  require(validateRunSchema(run), `Invalid RunResult: ${ajv.errorsText(validateRunSchema.errors)}`);
  require(run.manifestSha256 === manifestSha256, `Manifest identity differs: ${run.runId}`);
  require(Number.isFinite(Date.parse(run.startedAt)) && Date.parse(run.finishedAt) > Date.parse(run.startedAt), `Invalid run time range: ${run.runId}`);
  const candidate = manifest.candidates.find(item => item.id === run.candidateId);
  require(candidate, `Unknown candidate: ${run.candidateId}`);
  require(Object.entries(candidate.binding).every(([key, value]) => run.binding[key] === value), `Candidate identity differs: ${run.runId}`);
  const device = manifest.devices.find(item => item.id === run.device.id);
  require(identityKeys.every(key => run.device[key] === device[key]), `Device identity differs: ${run.runId}`);
  require(new Set(run.entries.map(entry => entry.id)).size === run.entries.length, `Duplicate entry: ${run.runId}`);
  for (const entry of run.entries) if (entry.fullQuality) {
    require(entry.fullQuality.requiredDetailSha256 === candidate.binding.requiredStartingDetailSha256,
      `Starting detail differs from frozen requirements: ${run.runId}/${entry.id}`);
  }
  inputCompletenessGate(manifest.interactionPlan, run.dispatchedActions, run.interactions);
  for (const dispatch of run.dispatchedActions) require(dispatch.receivedMs >= dispatch.eventTimeStampMs,
    `Input receipt precedes event timestamp: ${run.runId}/${dispatch.actionId}`);
  for (const action of run.interactions) {
    const intended = manifest.interactionPlan.find(value => value.actionId === action.actionId);
    const dispatch = run.dispatchedActions.find(value => value.actionId === action.actionId);
    require(['edgeIndex', 'direction', 'kind'].every(key => action[key] === intended[key]), `Input response differs from frozen action: ${run.runId}/${action.actionId}`);
    require(action.visibleStateChangedAtMs >= dispatch.receivedMs
      && action.drawSubmittedAtMs >= action.visibleStateChangedAtMs, `Input timestamps are out of order: ${run.runId}`);
    require(action.drawFrame > action.beforeFrame, `Input lacks a later submitted draw: ${run.runId}`);
    require(!same(action.actualStateBefore, action.actualStateAfter), `Input lacks changed actual camera state: ${run.runId}`);
  }
  return run;
}

function movementGates(run, requiredTurnRegions) {
  const gates = [gate('required-turn-inventory', requiredTurnRegions.length >= 6 ? 'pass' : 'unverified', requiredTurnRegions)];
  for (const direction of directions) {
    for (const index of edgeIndices) {
      const actions = run.interactions.filter(action => action.direction === direction && action.edgeIndex === index && action.kind === 'walk');
      gates.push(numericGate(`input-${direction}-${index}-walk`, percentile95(actions.map(action => action.drawSubmittedAtMs - action.eventTimeStampMs)), 100));
      const intervals = run.cadence.filter(value => value.direction === direction && value.edgeIndex === index && value.kind === 'walk');
      gates.push(numericGate(`cadence-${direction}-${index}-walk`, percentile95(intervals.flatMap(value => value.intervalsMs)), 33.3));
    }
    const turns = run.interactions.filter(action => action.direction === direction && action.kind === 'turn');
    gates.push(numericGate(`input-${direction}-turn`, percentile95(turns.map(action => action.drawSubmittedAtMs - action.eventTimeStampMs)), 100));
    const turnIntervals = run.cadence.filter(value => value.direction === direction && value.kind === 'turn');
    gates.push(numericGate(`cadence-${direction}-turn`, percentile95(turnIntervals.flatMap(value => value.intervalsMs)), 33.3));
  }
  // 各个有观测的转向区域独立计算，避免区域平均值掩盖失败。
  const requiredIndices = requiredTurnRegions.map(region => region.edgeIndex);
  const turnIndices = new Set([...requiredIndices, ...run.interactions.filter(value => value.kind === 'turn').map(value => value.edgeIndex)]);
  for (const index of turnIndices) {
    for (const direction of directions) {
      const turns = run.interactions.filter(value => value.kind === 'turn' && value.edgeIndex === index && value.direction === direction);
      if (turns.length || requiredIndices.includes(index)) gates.push(numericGate(`input-${direction}-${index}-turn`, percentile95(turns.map(value => value.drawSubmittedAtMs - value.eventTimeStampMs)), 100));
      const intervals = run.cadence.filter(value => value.kind === 'turn' && value.edgeIndex === index && value.direction === direction);
      if (turns.length || intervals.length || requiredIndices.includes(index)) gates.push(numericGate(`cadence-${direction}-${index}-turn`, percentile95(intervals.flatMap(value => value.intervalsMs)), 33.3));
    }
  }
  const missingIntervals = run.cadence.reduce((sum, value) => sum + value.missingCounterIntervals, 0);
  gates.push(gate('frame-observation-completeness', run.cadence.length && missingIntervals === 0 ? 'pass' : 'unverified', { missingIntervals }));
  return gates;
}

function resourceGates(resources) {
  if (!resources) return [gate('resource-accounting', 'unverified', 'Resource measurements absent.')];
  const MiB = 1024 ** 2;
  const limits = { startupPackBytes: 4 * MiB, ordinarySectionPeakBytes: 2 * MiB,
    reviewedMitsuiNearBytes: 3.5 * MiB, concurrentDownloads: 2, concurrentDecodeAttach: 1,
    retainedSectionsPeakBytes: 64 * MiB, primaryMeshTriangles: 200000, primaryMeshDraws: 120,
    combinedTexturesPeakBytes: 96 * MiB };
  const gates = Object.entries(limits).map(([id, maximum]) => numericGate(`resource-${id}`, resources[id], maximum));
  const known = Object.values(resources).every(value => value !== null)
    && resources.accountingComplete && resources.lodOverlapIncluded && resources.lightingAndRenderTargetsIncluded;
  gates.push(gate('resource-accounting', known ? 'pass' : 'unverified', {
    splatBuffersPeakBytes: resources.splatBuffersPeakBytes, sortingPeakBytes: resources.sortingPeakBytes,
    decodedAssetsPeakBytes: resources.decodedAssetsPeakBytes, temporaryAllocationsPeakBytes: resources.temporaryAllocationsPeakBytes,
    lodOverlapIncluded: resources.lodOverlapIncluded, lightingAndRenderTargetsIncluded: resources.lightingAndRenderTargetsIncluded,
  }));
  return gates;
}

export function evaluateRun(run, manifest) {
  require(validateRunSchema(run), `Invalid RunResult: ${ajv.errorsText(validateRunSchema.errors)}`);
  const gates = [gate('physical-device', run.device.physicalGPU ? 'pass' : 'unverified', run.device),
    gate('retained-run-evidence', run.evidence.length > 0 ? 'pass' : 'unverified', run.evidence.map(value => value.path)),
    gate('entry-completeness', entryIds.every(id => run.entries.some(entry => entry.id === id)) ? 'pass' : 'unverified', run.entries.map(entry => entry.id))];
  gates.push(inputCompletenessGate(manifest?.interactionPlan ?? [], run.dispatchedActions, run.interactions));
  for (const entry of run.entries) {
    gates.push(numericGate(`${entry.id}-first-usable`, entry.firstUsableMs, entry.id === 'cold' ? 8000 : 3000), fullQualityGate(entry));
  }
  const traversal = run.traversal;
  const distinctRecordings = new Set(traversal.recordings.map(value => value.evidence.sha256)).size === 2
    && directions.every(direction => traversal.recordings.some(value => value.direction === direction));
  gates.push(gate('complete-native-traversal', traversal.nativeInput && distinctRecordings
    && same(traversal.forwardEdgeIndices, edgeIndices) && same(traversal.reverseEdgeIndices, [...edgeIndices].reverse()) ? 'pass' : 'unverified', traversal));
  gates.push(...movementGates(run, manifest?.requiredTurnRegions ?? []), ...resourceGates(run.resources));
  const q03 = run.q03?.warmTogetherLocaleMs;
  gates.push(gate('q03-observation-completeness', q03?.length === 3 ? 'pass' : 'unverified', q03 ?? null));
  q03?.forEach((value, index) => gates.push(numericGate(`q03-${index + 1}`, value, 500, { strict: true })));
  const hidden = run.hidden;
  gates.push(gate('hidden-resume', !hidden?.observedDocumentHidden || !hidden.observedDocumentVisible || hidden.durationMs < 2000 ? 'unverified'
    : hidden.draws === 0 && hidden.updates === 0 && hidden.requests === 0 && hidden.restoredStateMatches
      && hidden.resumedDraws > 0 && hidden.resumedInputObserved ? 'pass' : 'fail', hidden));
  return { runId: run.runId, candidateId: run.candidateId, status: combine(gates), gates };
}

export function evaluateBenchmark(manifest, runs, manifestSha256) {
  validateManifest(manifest);
  require(/^[a-f0-9]{64}$/.test(manifestSha256), 'Exact manifest bytes must have a SHA-256 binding.');
  const runIds = new Set(), contexts = new Set(), conditions = new Set();
  for (const run of runs) {
    validateRun(run, manifest, manifestSha256);
    const condition = conditionKey(runCondition(run));
    require(!runIds.has(run.runId), `Duplicate run ID: ${run.runId}`);
    require(!contexts.has(run.contextSessionId), `Independent sessions require distinct browser contexts: ${run.contextSessionId}`);
    require(!conditions.has(condition), `Duplicate session condition: ${condition}`);
    runIds.add(run.runId); contexts.add(run.contextSessionId); conditions.add(condition);
  }
  const gates = [gate('frozen-protocol', manifest.status === 'frozen' ? 'pass' : 'unverified', manifest.prerequisites)];
  gates.push(runOrderGate(manifest.runOrder, runs));
  const missingConditions = [];
  for (const candidate of manifest.candidates) for (const device of manifest.devices) {
    for (const locale of ['en', 'zh']) for (const lighting of ['day', 'night']) for (const session of [1, 2, 3]) {
      const id = `${candidate.id}/${device.id}/${locale}/${lighting}/${session}`;
      if (!conditions.has(id)) missingConditions.push(id);
    }
  }
  gates.push(gate('complete-session-matrix', manifest.candidates.length > 0 && missingConditions.length === 0 ? 'pass' : 'unverified',
    { reports: runs.length, required: manifest.candidates.length * 24, entriesPerSession: 4, missingConditions }));
  const results = runs.map(run => evaluateRun(run, manifest));
  const technicalStatus = combine([...gates, ...results]);
  return { schemaVersion: 1, kind: 'BenchmarkEvaluation', manifestSha256, technicalStatus,
    selectionStatus: 'unverified', selectionEvidenceRequired: [
      'Reviewed source rights, complete architecture/lighting coverage and held-out reference qualification.',
      'Independent 32-participant-per-product cohort outcomes, saved-data/journey acceptance and visual defect review.',
      'Frozen first-year costs, weighted comparison, participant-level confidence interval and cost sensitivity analysis.',
    ], gates, runs: results,
    limitations: ['Submitted frames measure renderer submission; physical display presentation remains unmeasured.',
      'Technical gates alone cannot establish realism, immersion, independent discovery or a renderer-selection winner.'] };
}

export function verifyEvidence(root, records) {
  const base = realpathSync(root);
  for (const record of records) {
    require(!isAbsolute(record.path), `Evidence path must be relative: ${record.path}`);
    const path = realpathSync(resolve(base, record.path));
    const local = relative(base, path);
    require(local !== '..' && !local.startsWith('../') && !isAbsolute(local), `Evidence escapes checkout: ${record.path}`);
    const bytes = readFileSync(path);
    require(bytes.length === record.bytes && hash(bytes) === record.sha256, `Evidence identity differs: ${record.path}`);
  }
}

export function inspectFiles(manifestPath, runPaths, root = repository) {
  const manifestBytes = readFileSync(manifestPath), manifest = JSON.parse(manifestBytes);
  const runs = runPaths.map(readJSON);
  const result = evaluateBenchmark(manifest, runs, hash(manifestBytes));
  const routeBytes = readFileSync(resolve(root, manifest.route.path));
  require(hash(routeBytes) === manifest.route.sha256, 'Route identity differs.');
  const route = JSON.parse(routeBytes);
  require(route.selectedRoute.edgeIds.length === 54 && route.sights.length === 6
    && route.selectedRoute.lengthMetres === manifest.route.lengthMetres, 'Route scope differs.');
  for (const sight of route.sights) {
    const expected = Math.min(53, route.selectedRoute.nodeIds.indexOf(sight.nodeId));
    require(expected >= 0 && manifest.requiredTurnRegions.some(region => region.sightId === sight.id && region.edgeIndex === expected),
      `Required sight turn region differs: ${sight.id}`);
  }
  verifyEvidence(root, [...manifest.candidates.flatMap(candidate => candidate.evidence), ...manifest.finalComparison.costEvidence,
    ...runs.flatMap(run => [...run.evidence, ...run.traversal.recordings.map(recording => recording.evidence)])]);
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const output = args.find(value => value.startsWith('--output='))?.slice('--output='.length);
  const inputs = args.filter(value => !value.startsWith('--output='));
  require(inputs.length > 0 && inputs.every(value => !value.startsWith('--')), 'Usage: node experience/tools/realism-benchmark.mjs <manifest.json> [run-result.json ...] [--output=<path>]');
  const result = inspectFiles(resolve(inputs[0]), inputs.slice(1).map(value => resolve(value)));
  const text = JSON.stringify(result, null, 2) + '\n';
  if (output) writeFileSync(resolve(output), text);
  console.log(text.trimEnd());
  process.exitCode = result.technicalStatus === 'pass' ? 0 : 2;
}
