import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSavedJourney, readPersonalNotes, STORAGE_KEY, LEGACY_KEY } from '../src/app/journey-store.js';

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
