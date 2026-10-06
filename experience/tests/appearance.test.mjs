import test from 'node:test';
import assert from 'node:assert/strict';
import { APPEARANCE_KEY, readAppearance, writeAppearance } from '../src/app/appearance.js';
import { STORAGE_KEY } from '../src/app/journey-store.js';
import { createRecap, encodeRecap, decodeRecap } from '../src/app/share.js';

const storage = raw => ({ getItem: key => key === APPEARANCE_KEY ? raw : null });

test('an explicit valid appearance overrides storage without changing the preference', () => {
  const stored = storage('{"lighting":"night"}');
  assert.equal(readAppearance(stored, '?lighting=day'), 'day');
  assert.equal(readAppearance(stored, '?lighting=night'), 'night');
  assert.equal(readAppearance(stored, '?lighting=unknown'), 'night');
  assert.equal(readAppearance(stored), 'night');
  assert.equal(readAppearance({ getItem() { throw new Error('denied'); } }, '?lighting=night'), 'night');
});

test('malformed, absent and blocked appearance storage leaves a usable day default', () => {
  for (const raw of [null, '', '{', 'null', '[]', '42', '"night"', '{"lighting":"dusk"}', '{"lighting":false}']) {
    assert.equal(readAppearance(storage(raw), '?lighting=invalid'), 'day', String(raw));
  }
  assert.equal(readAppearance(undefined), 'day');
  assert.equal(readAppearance({ getItem() { throw new Error('denied'); } }), 'day');
});

test('appearance writes are bounded to their own key and denied writes are recoverable', () => {
  const journey = '{"version":2,"game":{"x":23.8,"y":2.1}}';
  const entries = new Map([[STORAGE_KEY, journey]]), writes = [];
  const store = {
    getItem: key => entries.get(key) ?? null,
    setItem(key, value) { writes.push(key); entries.set(key, value); },
  };
  assert.equal(writeAppearance(store, 'night'), true);
  assert.deepEqual(writes, [APPEARANCE_KEY]);
  assert.equal(entries.get(STORAGE_KEY), journey);
  assert.deepEqual(JSON.parse(entries.get(APPEARANCE_KEY)), { lighting: 'night' });
  assert.equal(readAppearance(store), 'night');
  assert.equal(writeAppearance(store, 'dusk'), false);
  assert.deepEqual(writes, [APPEARANCE_KEY]);
  assert.equal(writeAppearance({ setItem() { throw new Error('denied'); } }, 'day'), false);
  assert.equal(writeAppearance(undefined, 'night'), false);
});

test('appearance changes do not change a shared journey snapshot or its creation date', () => {
  const input = { locale: 'en', created: '2026-10-06', notes: { crossing: 'My evening note' },
    includedNoteIds: ['crossing'], state: { visitedIds: ['crossing'], choiceIds: { crossing: 'north-first' } } };
  const day = createRecap({ ...input, appearance: 'day', state: { ...input.state, lighting: 'day' } });
  const night = createRecap({ ...input, appearance: 'night', state: { ...input.state, lighting: 'night' } });
  assert.deepEqual(night, day);
  assert.equal(encodeRecap(night), encodeRecap(day));
  assert.deepEqual(decodeRecap(encodeRecap(night)), {
    v: 1, pack: 'kyoto-shijo', lang: 'en', created: '2026-10-06',
    stops: [{ id: 'crossing', choice: 'north-first', note: 'My evening note' }],
  });
});
