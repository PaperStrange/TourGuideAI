import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRecap, validateRecap, encodeRecap, decodeRecap, buildRecapUrl,
  renderRecap, recapView, MAX_SHARE_URL_LENGTH } from '../src/app/share.js';

const legacy = JSON.parse(readFileSync(new URL('./fixtures/legacy-v1-completed.json', import.meta.url)));
const created = '2026-10-06';
const personal = '<b data-personal-note>晚风 & "灯光"</b>\nMy walk. 🚶';
const make = overrides => createRecap({ locale: 'en', state: legacy.game, created, ...overrides });
const raw = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const throwsCode = (run, code) => assert.throws(run, error => error.code === code);

test('recaps default to no personal notes and do not expose or mutate game state', () => {
  const state = structuredClone(legacy.game), notes = { crossing: personal, mitsui: 'Private note' };
  const before = structuredClone({ state, notes });
  const recap = make({ state, notes });
  assert.deepEqual(recap, { v: 1, pack: 'kyoto-shijo', lang: 'en', created, stops: [
    { id: 'crossing', choice: 'north-first' },
    { id: 'mitsui', choice: 'street-only' },
    { id: 'mufg', choice: 'no-cash-stop' },
  ] });
  assert.deepEqual({ state, notes }, before);
  assert.ok(!JSON.stringify(recap).includes('Private note'));
  assert.ok(!Object.hasOwn(recap, 'game'));
});

test('only explicitly selected saved notes on real visited targets enter a recap', () => {
  const state = { ...legacy.game, visitedIds: ['crossing', 'crossing', 'mitsui', 'D-S3', 'invented'] };
  const recap = make({ state, notes: {
    crossing: personal, mitsui: 'Unchecked', mufg: 'Unvisited', 'D-S3': 'Placeholder', invented: 'Fabricated',
  }, includedNoteIds: new Set(['crossing', 'mufg', 'D-S3', 'invented']) });
  assert.deepEqual(recap.stops, [
    { id: 'crossing', choice: 'north-first', note: personal },
    { id: 'mitsui', choice: 'street-only' },
  ]);
});

test('English and Chinese recap fragments round-trip without losing selected Unicode text', () => {
  for (const locale of ['en', 'zh']) {
    const recap = make({ locale, notes: { crossing: personal }, includedNoteIds: ['crossing'] });
    const encoded = encodeRecap(recap);
    assert.match(encoded, /^[A-Za-z0-9_-]+$/);
    assert.deepEqual(decodeRecap(encoded), recap);
    assert.deepEqual(decodeRecap('#recap=' + encoded), recap);
    assert.equal(encodeRecap(recap), encoded, 'same fixed snapshot should encode identically');
  }
});

test('share links retain a Pages subdirectory and discard author query/hash data', () => {
  const recap = make({ locale: 'zh' });
  const link = new URL(buildRecapUrl(recap, 'https://example.test/project/index.html?qa=1#private-ui'));
  assert.equal(link.origin, 'https://example.test');
  assert.equal(link.pathname, '/project/journey.html');
  assert.equal(link.search, '');
  assert.deepEqual(decodeRecap(link.hash), recap);
  assert.ok(link.href.length <= MAX_SHARE_URL_LENGTH);
  throwsCode(() => buildRecapUrl(recap, 'https://example.test/' + 'x'.repeat(MAX_SHARE_URL_LENGTH) + '/index.html'), 'shareTooLong');
});

test('route choices and remembered stops remain semantically distinct in both languages', () => {
  for (const locale of ['en', 'zh']) {
    const skipped = recapView(make(), locale);
    assert.notEqual(skipped.stops[0].kind, skipped.stops[1].kind);
    assert.equal(skipped.stops[1].kind, skipped.stops[2].kind);
    const state = structuredClone(legacy.game);
    state.choiceIds.mitsui = 'save-station-clue'; state.choiceIds.mufg = 'plan-atm';
    const planned = recapView(make({ state }), locale);
    assert.ok(planned.stops.every(stop => stop.kind === planned.stops[0].kind));
    assert.notEqual(planned.stops[1].outcome, skipped.stops[1].outcome);
    assert.notEqual(planned.stops[2].outcome, skipped.stops[2].outcome);
    assert.ok(planned.stops.every(stop => stop.sources.length && stop.provenance));
  }
});

test('untrusted recap notes remain escaped text in both language presentations', () => {
  const note = '</p><img data-injected src=x onerror="alert(1)">晚风 & "灯光"';
  const recap = make({ notes: { crossing: note }, includedNoteIds: ['crossing'] });
  const before = structuredClone(recap);
  for (const locale of ['en', 'zh']) {
    const html = renderRecap(recap, locale);
    assert.ok(html.includes('&lt;/p&gt;&lt;img data-injected src=x onerror=&quot;alert(1)&quot;&gt;晚风 &amp; &quot;灯光&quot;'));
    assert.ok(!html.includes('<img data-injected'));
    assert.equal((html.match(/class="recap-note"/g) || []).length, 1);
    assert.equal(recapView(recap, locale).stops[0].note, note);
  }
  assert.deepEqual(recap, before);
});

test('invalid structure, targets, choices, dates and note types cannot become partial recaps', () => {
  const base = make();
  const invalid = [
    null, [], { ...base, pack: 'other-city' }, { ...base, lang: 'ja' },
    { ...base, created: '2026-02-30' }, { ...base, created: '2026-10-06T00:00:00Z' },
    { ...base, secret: 'unexpected field' }, { ...base, stops: [] },
    { ...base, stops: [{ id: 'D-S3', choice: 'north-first' }] },
    { ...base, stops: [{ id: 'crossing', choice: 'plan-atm' }] },
    { ...base, stops: [base.stops[0], base.stops[0]] },
    { ...base, stops: [{ ...base.stops[0], note: 123 }] },
    { ...base, stops: [{ ...base.stops[0], note: 'x'.repeat(501) }] },
    { ...base, stops: [{ ...base.stops[0], note: '\ud800' }] },
    { ...base, stops: [{ ...base.stops[0], title: 'Injected venue' }] },
  ];
  for (const value of invalid) throwsCode(() => decodeRecap(raw(value)), 'shareInvalid');
  throwsCode(() => createRecap({ locale: 'en', state: { visitedIds: [], choiceIds: {} }, created }), 'shareInvalid');
});

test('unsupported, malformed and oversized links produce distinct bounded failures', () => {
  throwsCode(() => decodeRecap(raw({ ...make(), v: 99 })), 'shareUnsupported');
  for (const value of ['', '#recap=', 'not+url/base64=', '#other=x', 'A', Buffer.from([0xff]).toString('base64url')]) {
    throwsCode(() => decodeRecap(value), 'shareInvalid');
  }
  throwsCode(() => decodeRecap('x'.repeat(MAX_SHARE_URL_LENGTH + 1)), 'shareTooLong');
});

test('creation bounds selected text and repairs a split Unicode surrogate before encoding', () => {
  const recap = make({ notes: { crossing: '界'.repeat(499) + '🚶' }, includedNoteIds: ['crossing'] });
  assert.equal(recap.stops[0].note.length, 500);
  assert.ok(recap.stops[0].note.isWellFormed());
  assert.deepEqual(decodeRecap(encodeRecap(recap)), validateRecap(recap));
});
