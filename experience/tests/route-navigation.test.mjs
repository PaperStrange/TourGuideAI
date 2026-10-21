import test from 'node:test';
import assert from 'node:assert/strict';
import source from '../content/ginza-wako/source.json' with { type: 'json' };
import neighborhood from '../src/neighborhoods/shijo-east/geography.json' with { type: 'json' };
import { createRouteNavigation, validateRouteGraph } from '../src/simulation/route-navigation.js';

// 使用已审查的 Ginza 来源中心线检验图导航，保留现有场景明确标注的平面高度和四米宽度。
const nodes = source.sidewalk.centerline.map(point => ({ id: point.nodeId, x: point.x, y: point.y, height: 0 }));
const byId = new Map(nodes.map(point => [point.id, point]));
const graph = { kind: 'route-graph', nodes, edges: source.sidewalk.sourceWays.map(way => ({
  id: `osm-way-${way.osmWayId}`, from: way.selectedNodeIds[0], to: way.selectedNodeIds.at(-1),
  width: 4, points: way.selectedNodeIds.map(id => ({ ...byId.get(id) })), bidirectional: true,
})) };
const near = (actual, expected, tolerance = 0.002) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const walk = (navigation, input, destination) => {
  let pose = navigation.locate(input), ticks = 0;
  const limit = Math.ceil(navigation.path(pose, destination).distanceMeters / 0.076) + 200;
  for (const point of navigation.route(pose, destination)) {
    while (Math.hypot(point.x - pose.x, point.y - pose.y) > 1e-6) {
      const distance = Math.hypot(point.x - pose.x, point.y - pose.y), amount = Math.min(0.076, distance);
      const next = navigation.project(pose.x + (point.x - pose.x) * amount / distance,
        pose.y + (point.y - pose.y) * amount / distance, pose);
      assert.ok(navigation.contains(next.x, next.y, next.edgeId));
      assert.ok(Math.hypot(next.x - pose.x, next.y - pose.y) <= 0.077);
      assert.equal(next.height, 0);
      assert.ok(++ticks < limit, `the walking path must make progress at each connected corner: ${pose.edgeId}`);
      pose = next;
    }
  }
  return pose;
};

test('the graph retains source nodes, shared corners and measured centerline distance', () => {
  const stats = validateRouteGraph(graph), nav = createRouteNavigation(graph);
  assert.equal(stats.nodeCount, 5); assert.equal(stats.edgeCount, 3);
  near(stats.lengthMeters, source.sidewalk.projectedLengthMetres, 0.000001);
  const path = nav.path({ nodeId: nodes[0].id }, { nodeId: nodes.at(-1).id });
  near(path.distanceMeters, source.sidewalk.projectedLengthMetres, 0.000001);
  assert.deepEqual(path.edgeIds, graph.edges.map(edge => edge.id));
  assert.ok(path.points.some(point => point.x === 0 && point.y === 0));
  assert.deepEqual(nav.snapshot().nodes.map(node => node.id), nodes.map(node => node.id));
});

test('actual fixed-distance movement crosses source junctions and returns without position jumps', () => {
  const nav = createRouteNavigation(graph);
  const end = walk(nav, { nodeId: nodes[0].id }, { nodeId: nodes.at(-1).id });
  near(end.x, nodes.at(-1).x); near(end.y, nodes.at(-1).y);
  assert.equal(end.edgeId, graph.edges.at(-1).id);
  const start = walk(nav, end, { nodeId: nodes[0].id });
  near(start.x, nodes[0].x); near(start.y, nodes[0].y);
  assert.equal(start.edgeId, graph.edges[0].id);
});

test('partial-edge paths account for centerline station and lateral approach', () => {
  const nav = createRouteNavigation(graph), edge = graph.edges[0];
  const a = nodes[0], b = nodes[1];
  const from = nav.locate({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, edgeId: edge.id });
  const end = nav.locate({ x: b.x, y: b.y, edgeId: edge.id });
  const path = nav.path(from, end);
  near(path.distanceMeters, Math.hypot(a.x - b.x, a.y - b.y) / 2, 0.000001);
  assert.deepEqual(path.edgeIds, [edge.id]);
  near(nav.path(end, from).distanceMeters, path.distanceMeters, 0.000001);
  assert.equal(nav.path(from, from).distanceMeters, 0);
  const lateral = nav.locate({ ...from, x: from.x + 0.4 });
  assert.equal(nav.path(lateral, lateral).distanceMeters, 0);
  assert.deepEqual(nav.route(lateral, lateral), []);
});

test('access and review exclusions disconnect the graph without fabricating a connection', () => {
  for (const exclusion of [{ accessible: false }, { reviewed: false }]) {
    const changed = structuredClone(graph); Object.assign(changed.edges[1], exclusion);
    const nav = createRouteNavigation(changed);
    assert.equal(nav.path({ nodeId: nodes[0].id }, { nodeId: nodes.at(-1).id }), null);
    assert.deepEqual(nav.route(nodes[0], nodes.at(-1)), []);
    assert.equal(nav.snapshot().edges.length, 2);
  }
});

test('movement remains within its current edge before a shared-node portal', () => {
  const nav = createRouteNavigation(graph);
  let pose = nav.locate({ nodeId: nodes[0].id });
  for (let tick = 0; tick < 1000; tick++) {
    pose = nav.project(pose.x - 0.076, pose.y - 0.076, pose);
    assert.equal(pose.edgeId, graph.edges[0].id);
    assert.ok(nav.contains(pose.x, pose.y, pose.edgeId));
  }
  assert.throws(() => nav.project(nodes.at(-1).x, nodes.at(-1).y, pose), /at most one meter/);
});

test('direction restrictions affect both path search and independent movement', () => {
  const changed = structuredClone(graph); changed.edges[0].bidirectional = false;
  const nav = createRouteNavigation(changed);
  assert.equal(nav.path({ nodeId: nodes.at(-1).id }, { nodeId: nodes[0].id }), null);
  assert.ok(nav.path({ nodeId: nodes[0].id }, { nodeId: nodes.at(-1).id }));
  const pose = nav.locate({ ...nodes[1], edgeId: changed.edges[0].id });
  const previous = nodes[0], length = Math.hypot(previous.x - pose.x, previous.y - pose.y);
  const moved = nav.project(pose.x + (previous.x - pose.x) * 0.076 / length,
    pose.y + (previous.y - pose.y) * 0.076 / length, pose);
  near(moved.x, pose.x, 0.000001); near(moved.y, pose.y, 0.000001);
});

test('invalid geometry and ambiguous identities fail at graph construction', () => {
  const cases = [
    changed => { changed.nodes[1].id = changed.nodes[0].id; },
    changed => { changed.edges[1].id = changed.edges[0].id; },
    changed => { changed.edges[0].points[0].x += 1; },
    changed => { changed.edges[0].width = 0.64; },
    changed => { changed.edges[0].points[1].height = NaN; },
    changed => { changed.edges[0].from = 'unknown'; },
    changed => { changed.edges[0].accessible = 'false'; },
    changed => { changed.edges[0].reviewed = 'false'; },
  ];
  for (const change of cases) {
    const changed = structuredClone(graph); change(changed);
    assert.throws(() => createRouteNavigation(changed));
  }
  const nav = createRouteNavigation(graph);
  assert.throws(() => nav.locate({ ...nodes[0], edgeId: 'unknown' }), /Unknown/);
  assert.throws(() => nav.locate({ ...nodes[0], edgeDistance: NaN }), /station/);
  assert.equal(nav.contains(NaN, 0), false);
});

test('the actual Shijo neighborhood connects all six sight approaches within the published route distance', () => {
  const nav = createRouteNavigation(neighborhood.navigation), sights = neighborhood.sights;
  assert.equal(sights.length, 6);
  let length = 0;
  for (let index = 1; index < sights.length; index++) {
    const from = { nodeId: sights[index - 1].approachNodeId }, to = { nodeId: sights[index].approachNodeId };
    const forward = nav.path(from, to), reverse = nav.path(to, from);
    assert.ok(forward && reverse);
    near(forward.distanceMeters, reverse.distanceMeters, 0.000001);
    assert.ok(forward.points.every(point => Number.isFinite(point.height) && point.edgeId));
    length += forward.distanceMeters;
  }
  near(length, neighborhood.selectedRoute.lengthMetres, 0.001);
  assert.ok(length >= 1000 && length <= 2000);
  assert.equal(neighborhood.coverage.terrain, 'authored-flat-display');
  for (const edge of neighborhood.navigation.edges) {
    assert.equal(edge.reviewed, true); assert.equal(edge.accessible, true);
    assert.equal(edge.surveyedGrade, null);
  }
});

test('the complete Shijo walk and return retain position through every sight and source junction', () => {
  const nav = createRouteNavigation(neighborhood.navigation), sights = neighborhood.sights;
  let pose = nav.locate({ nodeId: sights[0].approachNodeId });
  for (const sight of [...sights.slice(1), ...sights.slice(0, -1).reverse()]) {
    pose = walk(nav, pose, { nodeId: sight.approachNodeId });
    near(pose.x, sight.x); near(pose.y, sight.y);
  }
  near(pose.x, sights[0].x); near(pose.y, sights[0].y);
});

test('every included Shijo branch permits independent forward and reverse traversal', () => {
  const nav = createRouteNavigation(neighborhood.navigation);
  for (const edge of neighborhood.navigation.edges) {
    const from = { nodeId: edge.from }, to = { nodeId: edge.to };
    const target = nav.locate(to), start = nav.locate(from);
    let pose = walk(nav, from, to);
    near(pose.x, target.x); near(pose.y, target.y);
    pose = walk(nav, pose, from);
    near(pose.x, start.x); near(pose.y, start.y);
  }
});
