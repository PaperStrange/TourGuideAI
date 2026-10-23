import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import geography from '../src/neighborhoods/shijo-east/geography.json' with { type: 'json' };
import { SIGHTS } from '../src/neighborhoods/shijo-east/sights.js';
import { createJourneyPlanner, MIN_VARIANT_EDGE_CHANGE } from '../src/journey/recommendations.js';
import { createRouteNavigation } from '../src/simulation/route-navigation.js';
import { normalizeExplorationView } from '../src/runtime/exploration-state.js';
import { createJourneySession, normalizeJourneySession, selectJourneyRoute, updateJourneyProgress,
  isJourneySessionAvailable, readJourneyRecord, readJourneySession, writeJourneySession, clearJourneySession,
  JOURNEY_STORAGE_KEY } from '../src/journey/session.js';

const definition = { routeId: 'shijo-east', revision: 1, graph: geography.navigation,
  sights: SIGHTS, startNodeId: geography.selectedRoute.nodeIds[0] };
const planner = createJourneyPlanner(definition);
const selected = () => planner.recommend()[0];
const createdAt = '2026-10-21T12:00:00.000Z';
const updatedAt = '2026-10-21T12:01:00.000Z';
const signature = values => [...new Set(values)].sort().join('|');
const sourceBytes = JSON.stringify({ geography, sights: SIGHTS });
const navigation = createRouteNavigation(geography.navigation);
const interiorEdge = geography.navigation.edges.find(edge => edge.reviewed !== false && edge.accessible !== false);
const [edgeStart, edgeEnd] = interiorEdge.points;
const position = navigation.locate({ x: (edgeStart.x + edgeEnd.x) / 2, y: (edgeStart.y + edgeEnd.y) / 2, edgeId: interiorEdge.id });
const view = () => normalizeExplorationView({ version: 3, packId: 'shijo-east', revision: 1,
  player: { x: position.x, y: position.y, height: position.height, edgeId: position.edgeId, edgeDistance: position.edgeDistance },
  camera: { azimuth: 0.7, polar: 1.1, distance: 20, targetOffset: { x: 1, y: 2, height: 3 } } }, 'shijo-east');
const session = () => createJourneySession(selected(), { now: createdAt, view: view(), lighting: 'night' });
const persistenceMode = process.argv.find(value => value.startsWith('--journey-storage='))?.slice('--journey-storage='.length);

if (persistenceMode) {
  const retainedKey = 'tourguideai.solo.places.v1';
  const retainedValue = JSON.stringify({ version: 1, places: [], privateTestNote: 'Keep these bytes · 保留这些内容' });
  if (persistenceMode === 'write') {
    localStorage.setItem(retainedKey, retainedValue);
    localStorage.setItem('tourguideai:journey:v2', 'Earlier walk notes');
    writeJourneySession(localStorage, session());
    const before = localStorage.getItem(JOURNEY_STORAGE_KEY);
    assert.throws(() => writeJourneySession(localStorage, { ...session(), stopIds: [] }));
    assert.equal(localStorage.getItem(JOURNEY_STORAGE_KEY), before);
  } else if (persistenceMode === 'read') {
    const restored = readJourneySession(localStorage);
    assert.deepEqual(restored, session());
    assert.ok(restored.progress.view.player.edgeDistance > 0);
    assert.equal(restored.progress.view.player.edgeDistance, view().player.edgeDistance);
    assert.deepEqual(normalizeExplorationView(restored.progress.view, 'shijo-east'), restored.progress.view);
    const future = { ...session(), revision: 99 };
    writeJourneySession(localStorage, future);
    assert.equal(isJourneySessionAvailable(readJourneySession(localStorage), planner), false);
    assert.deepEqual(readJourneySession(localStorage), future);
    const unreadable = '{"version":2,"privateWords":"preserve this"}';
    localStorage.setItem(JOURNEY_STORAGE_KEY, unreadable);
    assert.throws(() => readJourneySession(localStorage));
    assert.equal(localStorage.getItem(JOURNEY_STORAGE_KEY), unreadable);
    writeJourneySession(localStorage, session());
    clearJourneySession(localStorage);
    assert.equal(readJourneySession(localStorage), null);
  } else if (persistenceMode === 'guard') {
    const initial = readJourneyRecord(localStorage);
    const progress = updateJourneyProgress(initial.session, { focusedSightId: initial.session.stopIds[1] }, { now: updatedAt });
    writeJourneySession(localStorage, progress, { expectedRaw: initial.raw });
    const current = readJourneyRecord(localStorage);
    assert.deepEqual(current.session, progress);
    const pending = updateJourneyProgress(current.session, { lighting: 'day' }, { now: updatedAt });
    // 实际 localStorage 中的另一条记录必须保留；旧页面的进度写入需要拒绝。
    const future = { ...current.session, revision: current.session.revision + 100, privateWords: '保留更新记录中的原始字段' };
    const futureBytes = JSON.stringify(future, null, 2);
    localStorage.setItem(JOURNEY_STORAGE_KEY, futureBytes);
    assert.throws(() => writeJourneySession(localStorage, pending, { expectedRaw: current.raw }),
      error => error.code === 'journey-storage-conflict');
    assert.equal(localStorage.getItem(JOURNEY_STORAGE_KEY), futureBytes);
    const unavailable = readJourneyRecord(localStorage);
    assert.equal(unavailable.raw, futureBytes);
    assert.equal(isJourneySessionAvailable(unavailable.session, planner), false);
    const replacement = createJourneySession(selected(), { now: updatedAt });
    writeJourneySession(localStorage, replacement, { expectedRaw: unavailable.raw });
    assert.deepEqual(readJourneySession(localStorage), replacement);

    const beforeChange = readJourneyRecord(localStorage);
    const otherRoute = selectJourneyRoute(beforeChange.session, planner.edit(selected(), { type: 'reverse' }), { now: updatedAt });
    writeJourneySession(localStorage, otherRoute, { expectedRaw: beforeChange.raw });
    const changedBytes = localStorage.getItem(JOURNEY_STORAGE_KEY);
    assert.throws(() => writeJourneySession(localStorage, pending, { expectedRaw: beforeChange.raw }),
      error => error.code === 'journey-storage-conflict');
    assert.equal(localStorage.getItem(JOURNEY_STORAGE_KEY), changedBytes);

    localStorage.removeItem(JOURNEY_STORAGE_KEY);
    assert.throws(() => writeJourneySession(localStorage, pending, { expectedRaw: changedBytes }),
      error => error.code === 'journey-storage-conflict');
    assert.equal(localStorage.getItem(JOURNEY_STORAGE_KEY), null);
    const unsupported = '{"version":2,"privateWords":"保留不可读取的数据"}';
    localStorage.setItem(JOURNEY_STORAGE_KEY, unsupported);
    assert.throws(() => writeJourneySession(localStorage, pending, { expectedRaw: null }),
      error => error.code === 'journey-storage-conflict');
    assert.equal(localStorage.getItem(JOURNEY_STORAGE_KEY), unsupported);
    writeJourneySession(localStorage, session(), { expectedRaw: unsupported });
  } else throw new Error('Unknown persistence test mode');
  assert.equal(localStorage.getItem(retainedKey), retainedValue);
  assert.equal(localStorage.getItem('tourguideai:journey:v2'), 'Earlier walk notes');
} else {
  test('the captured neighborhood offers a connected 1–2 km walk with five to eight sourced sights', () => {
    const recommendations = planner.recommend();
    assert.ok(recommendations.length >= 1 && recommendations.length <= 3);
    for (const plan of recommendations) {
      assert.ok(plan.stopIds.length >= 5 && plan.stopIds.length <= 8);
      assert.equal(plan.stopIds.length, new Set(plan.stopIds).size);
      assert.ok(plan.distanceMeters >= 1000 && plan.distanceMeters <= 2000);
      assert.deepEqual(plan.scope, { sightCount: true, walkingDistance: true });
      assert.equal(plan.kind, 'reviewed-walk');
      assert.equal(plan.legs.length, plan.stopIds.length);
      assert.ok(plan.edgeIds.every(id => geography.navigation.edges.some(edge => edge.id === id && edge.reviewed !== false && edge.accessible !== false)));
      for (const reason of plan.reasons) {
        const sight = SIGHTS.find(candidate => candidate.id === reason.sightId);
        assert.deepEqual(reason.text, sight.reason);
        assert.deepEqual(reason.sources, sight.sources);
        assert.ok(reason.text.en && reason.text.zh);
      }
    }
    const edgeLengths = new Map(createRouteNavigation(geography.navigation).snapshot().edges.map(edge => [edge.id, edge.length]));
    for (let index = 1; index < recommendations.length; index++) {
      for (const previous of recommendations.slice(0, index)) {
        assert.notEqual(signature(recommendations[index].stopIds), signature(previous.stopIds));
        assert.notEqual(signature(recommendations[index].edgeIds), signature(previous.edgeIds));
        const currentEdges = new Set(recommendations[index].edgeIds), previousEdges = new Set(previous.edgeIds);
        let changedLength = 0, totalLength = 0;
        for (const id of new Set([...currentEdges, ...previousEdges])) {
          totalLength += edgeLengths.get(id);
          if (currentEdges.has(id) !== previousEdges.has(id)) changedLength += edgeLengths.get(id);
        }
        assert.ok(changedLength / totalLength >= MIN_VARIANT_EDGE_CHANGE, 'a short changed approach alone cannot manufacture another recommendation');
      }
    }
    assert.deepEqual(planner.recommend(), recommendations);
  });

  test('network distance and walking geometry preserve every selected leg and source sight', () => {
    const plan = selected(), nodes = new Map(geography.navigation.nodes.map(node => [node.id, node]));
    let sum = 0, source = nodes.get(plan.startNodeId), straight = 0;
    for (const [index, leg] of plan.legs.entries()) {
      const sight = SIGHTS.find(candidate => candidate.id === plan.stopIds[index]), destination = nodes.get(sight.nodeId);
      assert.equal(leg.sightId, sight.id);
      assert.equal(leg.fromNodeId, source.id);
      assert.equal(leg.toNodeId, destination.id);
      assert.ok(leg.points.length > 0);
      assert.ok(Math.hypot(leg.points[0].x - source.x, leg.points[0].y - source.y) < 0.001);
      assert.ok(Math.hypot(leg.points.at(-1).x - destination.x, leg.points.at(-1).y - destination.y) < 0.001);
      straight += Math.hypot(destination.x - source.x, destination.y - source.y);
      sum += leg.distanceMeters;
      source = destination;
    }
    assert.equal(plan.distanceMeters, sum);
    assert.ok(plan.distanceMeters > straight, 'the actual route follows connected street turns');
    assert.deepEqual(plan.stops.map(stop => stop.id), plan.stopIds);
    assert.ok(plan.points.length > plan.stops.length);
  });

  test('must-see selections, interest labels and insufficient coverage have explicit results', () => {
    const mustSeeIds = SIGHTS.map(sight => sight.id), interests = planner.interestIds.slice(0, 1);
    const recommendations = planner.recommend({ mustSeeIds, interests });
    assert.ok(recommendations.length > 0);
    for (const plan of recommendations) {
      assert.ok(mustSeeIds.every(id => plan.stopIds.includes(id)));
      assert.deepEqual(plan.mustSeeIds, mustSeeIds);
      assert.deepEqual(plan.interests, interests);
      assert.deepEqual(planner.route(plan.stopIds, plan).title, plan.title);
    }
    for (const id of planner.interestIds) assert.ok(planner.interestLabels[id].en && planner.interestLabels[id].zh);
    for (const interest of planner.interestIds) {
      for (const plan of planner.recommend({ interests: [interest] })) {
        assert.ok(plan.reasons.some(reason => reason.matchedInterests.includes(interest)), 'every personalized suggestion includes a selected interest');
      }
    }
    assert.deepEqual(planner.recommend({ mustSeeIds, maxStops: mustSeeIds.length - 1 }), []);
    assert.deepEqual(planner.recommend({ maxDistanceMeters: 1000, minDistanceMeters: 1000 }), []);
    assert.throws(() => planner.recommend({ interests: ['unknown-interest'] }));
    assert.throws(() => planner.recommend({ mustSeeIds: ['unmapped-sight'] }));
  });

  test('adding, removing, reversing and reordering recalculate reviewed connections without mutating the selected route', () => {
    const original = selected(), before = structuredClone(original), sightId = original.stopIds[1];
    const marked = planner.route(original.stopIds, { mustSeeIds: [sightId] });
    const removed = planner.edit(marked, { type: 'remove', sightId });
    assert.ok(!removed.stopIds.includes(sightId));
    assert.deepEqual(removed.mustSeeIds, []);
    const restored = planner.edit(removed, { type: 'add', sightId, index: 1 });
    assert.deepEqual(restored.stopIds, original.stopIds);
    assert.equal(restored.distanceMeters, original.distanceMeters);
    const reversed = planner.edit(original, { type: 'reverse' });
    assert.deepEqual(reversed.stopIds, [...original.stopIds].reverse());
    assert.equal(reversed.legs[0].fromNodeId, original.startNodeId);
    assert.deepEqual(reversed, planner.edit(original, { type: 'reorder', stopIds: [...original.stopIds].reverse() }));
    assert.deepEqual(original, before);
    assert.throws(() => planner.edit(original, { type: 'reorder', stopIds: original.stopIds.slice(1) }));
    assert.throws(() => planner.edit(original, { type: 'add', sightId: original.stopIds[0] }));
    assert.throws(() => planner.edit({ ...original, revision: 999 }, { type: 'reverse' }));
  });

  test('explicit short personal orders remain usable and unreviewed edges cannot become recommendations', () => {
    const one = planner.route([SIGHTS[0].id]);
    assert.equal(one.scope.sightCount, false);
    assert.equal(one.stopIds.length, 1);
    assert.throws(() => planner.edit(one, { type: 'remove', sightId: one.stopIds[0] }));
    const blocked = structuredClone(geography.navigation);
    for (const edge of blocked.edges) edge.reviewed = false;
    assert.throws(() => createJourneyPlanner({ ...definition, graph: blocked }));
    assert.throws(() => planner.route(['unmapped-sight']));
  });

  test('returned plans are independent of canonical source data and later recommendations', () => {
    const result = selected(), before = selected();
    result.stops[0].title.en = 'Changed only in this returned value';
    result.reasons[0].sources[0].url = 'https://example.org/edited';
    result.points[0].x += 100;
    result.legs[0].points[0].height += 1;
    assert.deepEqual(selected(), before);
    assert.equal(JSON.stringify({ geography, sights: SIGHTS }), sourceBytes);
  });

  test('journey progress keeps its exact private view while explicit route edits preserve selected identity', () => {
    const current = session(), before = structuredClone(current);
    assert.ok(current.progress.view.player.edgeDistance > 0);
    assert.deepEqual(current.progress.view, view());
    assert.deepEqual(normalizeExplorationView(current.progress.view, 'shijo-east'), current.progress.view);
    const focusedSightId = current.stopIds[1];
    const focused = updateJourneyProgress(current, { focusedSightId }, { now: updatedAt });
    const changed = selectJourneyRoute(focused, planner.edit(selected(), { type: 'reverse' }), { now: updatedAt });
    assert.deepEqual(changed.progress.view, current.progress.view);
    assert.equal(changed.progress.lighting, 'night');
    assert.equal(changed.progress.focusedSightId, focusedSightId);
    assert.deepEqual(changed.stopIds, [...current.stopIds].reverse());
    assert.deepEqual(current, before);
    assert.deepEqual(normalizeJourneySession(changed), changed);
    const removed = selectJourneyRoute(focused, planner.edit(selected(), { type: 'remove', sightId: focusedSightId }), { now: updatedAt });
    assert.equal(removed.progress.focusedSightId, null);
    assert.deepEqual(removed.progress.view, current.progress.view);
  });

  test('preview-only operations leave the active session unchanged and a new revision requires an explicit fresh view', () => {
    const current = session(), before = JSON.stringify(current);
    planner.recommend({ interests: planner.interestIds.slice(0, 1) });
    planner.route([...current.stopIds].reverse());
    assert.equal(JSON.stringify(current), before);
    const future = { ...current, revision: 9 };
    assert.deepEqual(normalizeJourneySession(future), future);
    assert.equal(isJourneySessionAvailable(future, planner), false);
    const selectedFuture = selectJourneyRoute(current, { ...selected(), revision: 9 }, { now: updatedAt });
    assert.equal(selectedFuture.progress.view, null);
    assert.equal(selectedFuture.progress.focusedSightId, null);
  });

  test('session fields exclude room data and unrelated notes while rejecting invalid coordinates and order', () => {
    const value = session();
    Object.assign(value, { inviteToken: 'unselected-invite', participantToken: 'unselected-member', note: 'other private words' });
    value.progress.view.player.realVisit = true;
    value.progress.view.camera.inviteToken = 'nested-credential';
    const checked = normalizeJourneySession(value), serialized = JSON.stringify(checked);
    for (const text of ['unselected-invite', 'unselected-member', 'other private words', 'realVisit', 'nested-credential']) assert.equal(serialized.includes(text), false);
    assert.deepEqual(checked.progress.view, view());
    assert.throws(() => normalizeJourneySession({ ...checked, stopIds: [] }));
    assert.throws(() => normalizeJourneySession({ ...checked, stopIds: [checked.stopIds[0], checked.stopIds[0]] }));
    assert.throws(() => updateJourneyProgress(checked, { focusedSightId: 'unselected-sight' }));
    assert.throws(() => updateJourneyProgress(checked, { view: { ...view(), player: { x: Infinity, y: 1 } } }));
    for (const edgeDistance of [-1, Infinity, NaN, 1e7 + 1]) {
      assert.throws(() => updateJourneyProgress(checked, { view: { ...view(), player: { ...view().player, edgeDistance } } }));
    }
    assert.throws(() => updateJourneyProgress(checked, { view: { ...view(), player: { ...view().player, edgeId: undefined } } }));
    assert.throws(() => updateJourneyProgress(checked, { lighting: 'current weather' }));
  });

  test('actual browser-style storage persists route/view across processes and preserves earlier private saves', () => {
    const root = fileURLToPath(new URL('../../artifacts/journey-session-unit/', import.meta.url));
    mkdirSync(root, { recursive: true });
    const directory = mkdtempSync(join(root, 'storage-'));
    try {
      for (const mode of ['write', 'read']) {
        const result = spawnSync(process.execPath, ['--experimental-webstorage', '--localstorage-file=' + join(directory, 'journey.db'),
          fileURLToPath(import.meta.url), '--journey-storage=' + mode], { encoding: 'utf8' });
        assert.equal(result.status, 0, result.stdout + result.stderr);
      }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  test('native storage rejects stale progress after external revision, route, removal or unreadable changes and permits explicit replacement', () => {
    const root = fileURLToPath(new URL('../../artifacts/journey-session-unit/', import.meta.url));
    mkdirSync(root, { recursive: true });
    const directory = mkdtempSync(join(root, 'conflict-'));
    try {
      for (const mode of ['write', 'guard', 'read']) {
        const result = spawnSync(process.execPath, ['--experimental-webstorage', '--localstorage-file=' + join(directory, 'journey.db'),
          fileURLToPath(import.meta.url), '--journey-storage=' + mode], { encoding: 'utf8' });
        assert.equal(result.status, 0, result.stdout + result.stderr);
      }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
}
