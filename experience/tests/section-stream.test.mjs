import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import geography from '../src/neighborhoods/shijo-east/geography.json' with { type: 'json' };
import { selectSections } from '../src/runtime/section-residency.js';
import { planSectionLoads } from '../src/runtime/section-stream.js';

const manifest = JSON.parse(await readFile(new URL('../public/assets/neighborhoods/shijo-east/manifest.json', import.meta.url)));
const firstEdge = geography.navigation.edges.find(edge => edge.id === geography.spawn.edgeId);
// CI 39574644628 在这段真实道路上记录了 near 区块切换。
const crossingPosition = { x: 84.610, y: 1.636, destination: firstEdge.points.at(-1) };
const statesFor = selection => {
  const levels = new Map(selection.map(item => [item.id, item.level]));
  return new Map(manifest.cells.map(definition => [definition.id, {
    definition, residentLevel: levels.get(definition.id) ?? null, loading: null, error: null,
  }]));
};
const nearLoads = loads => loads.filter(load => load.level === 'near');
const residentNear = cells => [...cells.values()].filter(cell => cell.residentLevel === 'near').length;

test('the recorded Shijo transition waits for outgoing detail to be replaced before promoting the next block', () => {
  const initial = selectSections(manifest.cells, geography.spawn);
  const cells = statesFor(initial), selected = selectSections(manifest.cells, crossingPosition);
  const outgoing = cells.get('cell-e000-s001'), incoming = cells.get('cell-e001-s001');
  assert.equal(outgoing.residentLevel, 'near');
  assert.equal(incoming.residentLevel, 'base');
  assert.equal(selected.find(item => item.id === outgoing.definition.id).level, 'base');
  assert.equal(selected.find(item => item.id === incoming.definition.id).level, 'near');
  const requested = planSectionLoads(cells, selected, { nearLimit: 3 });
  assert.equal(nearLoads(requested).length, 0);
  assert.ok(requested.some(load => load.id === outgoing.definition.id && load.level === 'base'));
  assert.equal(residentNear(cells), 3);
  outgoing.loading = { level: 'base' };
  assert.equal(nearLoads(planSectionLoads(cells, selected, { nearLimit: 3 })).length, 0);
  assert.equal(outgoing.residentLevel, 'near');
  outgoing.residentLevel = 'base'; outgoing.loading = null;
  assert.deepEqual(nearLoads(planSectionLoads(cells, selected, { nearLimit: 3 })), [
    { id: incoming.definition.id, level: 'near' },
  ]);
});

test('cancelled promotions retain capacity until cleanup and allow the changed route to resume afterward', () => {
  const selected = selectSections(manifest.cells, crossingPosition), cells = statesFor(selected);
  const pending = cells.get('cell-e001-s001'); pending.residentLevel = 'base';
  const returning = selectSections(manifest.cells, geography.spawn);
  assert.equal(residentNear(cells), 2);
  assert.equal(nearLoads(planSectionLoads(cells, returning, { nearLimit: 3, reservedNear: 1 })).length, 0);
  assert.equal(pending.residentLevel, 'base');
  assert.deepEqual(nearLoads(planSectionLoads(cells, returning, { nearLimit: 3, reservedNear: 0 })), [
    { id: 'cell-e000-s001', level: 'near' },
  ]);
  pending.loading = { level: 'near' };
  assert.equal(nearLoads(planSectionLoads(cells, selected, { nearLimit: 3, reservedNear: 1 })).length, 0);
  pending.loading = null;
  assert.deepEqual(nearLoads(planSectionLoads(cells, selected, { nearLimit: 3 })), [
    { id: pending.definition.id, level: 'near' },
  ]);
});

test('compact walking keeps one detailed block and retains complete scenery when a demotion fails', () => {
  const initial = selectSections(manifest.cells, geography.spawn, { tier: 'compact' });
  const selected = selectSections(manifest.cells, firstEdge.points.at(-1), { tier: 'compact' });
  const cells = statesFor(initial), outgoing = cells.get(initial.find(item => item.level === 'near').id);
  const incoming = selected.find(item => item.level === 'near');
  assert.notEqual(incoming.id, outgoing.definition.id);
  assert.equal(selected.find(item => item.id === outgoing.definition.id).level, 'base');
  outgoing.error = { level: 'base', message: 'The source asset transfer failed' };
  const failed = planSectionLoads(cells, selected, { nearLimit: 1 });
  assert.equal(nearLoads(failed).length, 0);
  assert.ok(!failed.some(load => load.id === outgoing.definition.id));
  assert.equal(outgoing.residentLevel, 'near');
  outgoing.error = null;
  const retry = planSectionLoads(cells, selected, { nearLimit: 1 });
  assert.ok(retry.some(load => load.id === outgoing.definition.id && load.level === 'base'));
  assert.equal(nearLoads(retry).length, 0);
  outgoing.residentLevel = 'base';
  assert.deepEqual(nearLoads(planSectionLoads(cells, selected, { nearLimit: 1 })), [{ id: incoming.id, level: 'near' }]);
  assert.ok([...cells.values()].filter(cell => initial.some(item => item.id === cell.definition.id)).every(cell => cell.residentLevel));
});

test('multiple pending detail requests share the same near capacity on the actual neighborhood manifest', () => {
  const selected = selectSections(manifest.cells, geography.spawn), cells = statesFor(selected);
  for (const cell of cells.values()) if (cell.residentLevel === 'near') cell.residentLevel = 'base';
  assert.equal(nearLoads(planSectionLoads(cells, selected, { nearLimit: 3, reservedNear: 2 })).length, 1);
  assert.equal(nearLoads(planSectionLoads(cells, selected, { nearLimit: 1, reservedNear: 1 })).length, 0);
  assert.equal(nearLoads(planSectionLoads(cells, selected, { nearLimit: 1 })).length, 1);
});
