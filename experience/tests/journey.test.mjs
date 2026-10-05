import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSavedJourney, readPersonalNotes, STORAGE_KEY, LEGACY_KEY } from '../src/app/journey-store.js';
import { renderFieldNotes } from '../src/app/field-notes.js';

const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v1-completed.json', import.meta.url)));
const storage = entries => ({ getItem: key => Object.hasOwn(entries, key) ? entries[key] : null });

test('legacy import occurs only when the current save is absent', () => {
  assert.deepEqual(readSavedJourney(storage({ [LEGACY_KEY]: JSON.stringify(legacy) })), legacy);
  const current = { version: 2, locale: 'en', notes: { crossing: 'A new walk' }, game: { x: 30, y: 1 } };
  assert.deepEqual(readSavedJourney(storage({
    [STORAGE_KEY]: JSON.stringify(current), [LEGACY_KEY]: JSON.stringify(legacy),
  })), current);
});

test('malformed current saves cannot resurrect an older completed journey', () => {
  for (const raw of ['', '{', 'null', '[]', '42']) {
    assert.deepEqual(readSavedJourney(storage({
      [STORAGE_KEY]: raw, [LEGACY_KEY]: JSON.stringify(legacy),
    })), {}, `current value ${JSON.stringify(raw)}`);
  }
  assert.deepEqual(readSavedJourney({ getItem() { throw new Error('storage unavailable'); } }), {});
});

test('personal notes retain plain text, reject invalid targets/types and enforce the input limit', () => {
  const text = '<b>晚风 & "灯光"</b>\nA quiet crossing.';
  const notes = readPersonalNotes({ crossing: text, mitsui: 'x'.repeat(510), invented: 'not a real place', mufg: 7 }, new Set(['crossing', 'mitsui', 'mufg']));
  assert.deepEqual(notes, { crossing: text, mitsui: 'x'.repeat(500) });
  for (const invalid of [null, 7, 'a note', ['not a mapping']]) {
    assert.deepEqual(readPersonalNotes(invalid, new Set(['crossing'])), {});
  }
});

test('both locale exports escape notes as text without changing the journey', () => {
  const note = '<b data-personal-note>晚风 & "灯光"</b>\nMy walk.';
  const state = structuredClone(legacy.game);
  const before = structuredClone(state);
  for (const locale of ['en', 'zh']) {
    const html = renderFieldNotes({ locale, state, notes: { crossing: note } });
    assert.ok(html.includes('&lt;b data-personal-note&gt;晚风 &amp; &quot;灯光&quot;&lt;/b&gt;\nMy walk.'));
    assert.ok(!html.includes('<b data-personal-note>'));
    assert.ok(html.includes(`<html lang="${locale}">`));
    assert.equal((html.match(/class="personal-note"/g) || []).length, 1);
  }
  assert.deepEqual(state, before);
});

test('skipped station/cash choices produce memories rather than planned stops', () => {
  const skipped = renderFieldNotes({ locale: 'en', state: legacy.game });
  assert.ok(skipped.includes('Stay above ground; Mitsui remains a memory'));
  assert.ok(skipped.includes('No cash-service stop planned'));
  assert.ok(!skipped.includes('Arrival note:'));
  assert.ok(!skipped.includes('Cash plan:'));
  const plannedState = structuredClone(legacy.game);
  plannedState.choiceIds.mitsui = 'save-station-clue';
  plannedState.choiceIds.mufg = 'plan-atm';
  const planned = renderFieldNotes({ locale: 'en', state: plannedState });
  assert.ok(planned.includes('Arrival note:'));
  assert.ok(planned.includes('Cash plan: use MUFG'));
  assert.notEqual(planned, skipped);
});

test('unvisited targets and placeholder doors do not enter the exported journey', () => {
  const state = { visitedIds: ['crossing', 'D-S3', 'invented'], choiceIds: { crossing: 'north-first' } };
  const html = renderFieldNotes({ locale: 'zh', state, notes: {
    crossing: '真实的个人记录', mitsui: '未到访笔记不导出', 'D-S3': '占位不充数', invented: '虚构地点不导出',
  } });
  assert.equal((html.match(/<section>/g) || []).length, 1);
  assert.ok(html.includes('真实的个人记录'));
  for (const omitted of ['未到访笔记不导出', '占位不充数', '虚构地点不导出']) assert.ok(!html.includes(omitted));
});
