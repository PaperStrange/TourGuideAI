import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCameraPose, normalizePerspectiveView } from '../src/runtime/view-state.js';
import { STORAGE_KEY, createRecord, normalizeRecord, readRecord, writeRecord, saveMoment,
  removeMoment, normalizeView, feedbackReport } from '../src/perspective/state.js';
import { createShareURL, readSharedMoment, MAX_SHARE_URL_LENGTH } from '../src/perspective/share.js';

const pose = () => ({ version: 1, player: { x: 23.8, y: 2.1 }, camera: {
  azimuth: 0.22, polar: 0.88, distance: 24, targetOffset: { x: 1.2, y: -2.2, height: 0.9 },
} });

test('a private viewing pose preserves independent camera direction and strips journey data without mutation', () => {
  const value = { ...pose(), visitedIds: ['mufg'], notes: 'Not a camera field' };
  value.camera.azimuth = Math.PI + 0.2;
  value.camera.targetOffset = { x: -4, y: -19, height: 11 };
  const before = structuredClone(value);
  const result = normalizePerspectiveView(value);
  assert.deepEqual(value, before);
  assert.deepEqual(Object.keys(result).sort(), ['camera', 'player', 'version']);
  assert.deepEqual(result.player, { x: 23.8, y: 2.1 });
  assert.ok(Math.abs(result.camera.azimuth - (Math.PI + 0.2)) < 0.000001);
  assert.deepEqual(result.camera.targetOffset, { x: -4, y: -19, height: 11 });
});

test('untrusted viewing poses reject nonfinite/type/version errors and bound camera/player ranges', () => {
  for (const invalid of [null, [], 'pose', { ...pose(), version: 2 },
    { ...pose(), player: { x: Infinity, y: 2 } }, { ...pose(), player: { x: '23.8', y: 2 } },
    { ...pose(), camera: { ...pose().camera, polar: NaN } },
    { ...pose(), camera: { ...pose().camera, targetOffset: { x: 0, y: 0, height: Infinity } } },
  ]) assert.equal(normalizePerspectiveView(invalid), null);
  const result = normalizePerspectiveView({ ...pose(), player: { x: -1000, y: 1000 }, camera: {
    azimuth: 1.5, polar: -100, distance: 1000, targetOffset: { x: 100, y: -100, height: 100 },
  } });
  assert.equal(result.player.x, 0.32);
  assert.ok(result.player.y < 5 && result.player.y > 0, 'outside position must return inside the north facade');
  assert.deepEqual(result.camera, { azimuth: 0.65, polar: 0.66, distance: 48,
    targetOffset: { x: 32, y: -32, height: 20 } });
  assert.equal(normalizeCameraPose({ ...pose().camera, distance: -1 }).distance, 22);
});

test('old framing without a target offset receives a facing-appropriate default, not journey meaning', () => {
  const north = normalizeCameraPose({ azimuth: 0.22, polar: 0.88, distance: 24 });
  const south = normalizeCameraPose({ azimuth: Math.PI, polar: 0.88, distance: 24 });
  assert.deepEqual(north.targetOffset, { x: 1.2, y: -2.2, height: 0.9 });
  assert.deepEqual(south.targetOffset, { x: -1.2, y: 2.2, height: 0.9 });
});

const view = () => ({ kind: 'walk', pose: pose() });
const storyView = () => ({ kind: 'story', scale: 1.5, x: 0.25, y: 0.75 });
const personal = '<img src=x onerror="window.__injected=1"> 晚风 & "灯光" 🚶';
const moment = (momentId = 'arrive', note = personal, framing = view()) => ({ momentId, note, view: framing });
const rawShare = value => '#moment=' + Buffer.from(JSON.stringify(value)).toString('base64url');
const storage = (entries = {}) => {
  const values = new Map(Object.entries(entries)), writes = [];
  return { values, writes, getItem: key => values.get(key) ?? null,
    setItem(key, value) { writes.push({ key, value }); values.set(key, value); } };
};
const throwsCode = (run, code) => assert.throws(run, error => error.code === code);

test('private saves read and write only their own key; invalid or denied storage cannot import the Kyoto journey', () => {
  const oldKey = 'tourguideai:journey:v2';
  const oldValue = '{"version":2,"notes":{"crossing":"Private legacy note"}}';
  const store = storage({ [oldKey]: oldValue, 'tourguideai:appearance:v1': '{"lighting":"night"}' });
  assert.equal(readRecord(store), null);
  const record = saveMoment(createRecord({ mode: 'story', locale: 'zh' }), moment('arrive', personal, storyView()));
  assert.equal(writeRecord(store, record), true);
  assert.deepEqual(readRecord(store), record);
  assert.deepEqual(store.writes.map(write => write.key), [STORAGE_KEY]);
  assert.equal(store.values.get(oldKey), oldValue);
  assert.equal(store.values.get('tourguideai:appearance:v1'), '{"lighting":"night"}');
  for (const value of ['null', '[]', 'broken JSON', '{"version":2,"chapter":"kyoto-looking-closer"}']) {
    store.values.set(STORAGE_KEY, value); assert.equal(readRecord(store), null);
  }
  const blocked = { getItem() { throw Error('Denied'); }, setItem() { throw Error('Denied'); } };
  assert.equal(readRecord(blocked), null);
  assert.equal(writeRecord(blocked, record), false);
  assert.equal(writeRecord(store, { version: 99 }), false);
});

test('record normalization allows only known moments, explicit presentation fields and bounded local feedback', () => {
  const raw = { ...createRecord({ mode: 'story', locale: 'zh' }), index: 99, visitedIds: ['mufg'],
    revealedIds: ['arrive', 'invented', 'arrive', 'mitsui-rhythm'],
    moments: [moment(), moment('invented'), moment('arrive', 'Most recent saved revision'),
      moment('mitsui-rhythm', 'Private second note', storyView()), moment('daiya-rhythm', '私'.repeat(501))],
    trial: { assignment: 'story', source: 'link', crossover: true, participants: 99 },
    feedback: { score: 4, note: 'n'.repeat(501), mode: 'story', claimedSuccessRate: 100 },
  };
  const before = structuredClone(raw), result = normalizeRecord(raw);
  assert.deepEqual(raw, before);
  assert.equal(result.index, 2);
  assert.deepEqual(result.revealedIds, ['arrive', 'mitsui-rhythm']);
  assert.deepEqual(result.moments.map(item => item.momentId), ['arrive', 'mitsui-rhythm']);
  assert.equal(result.moments[0].note, 'Most recent saved revision');
  assert.equal(result.feedback.note.length, 500);
  assert.deepEqual(result.trial, { assignment: 'story', source: 'link', crossover: true });
  assert.equal(Object.hasOwn(result, 'visitedIds'), false);
  assert.equal(Object.hasOwn(result.feedback, 'claimedSuccessRate'), false);
  assert.equal(normalizeRecord({ ...raw, chapter: 'another-city' }), null);
  assert.equal(normalizeRecord({ ...raw, version: 2 }), null);
  assert.equal(normalizeRecord({ ...raw, feedback: { score: 6 } }).feedback, null);
});

test('saving, editing and deleting one private moment preserve the other moments and the caller record', () => {
  const original = saveMoment(createRecord(), moment('mitsui-rhythm', 'Keep this separate', storyView()));
  const before = structuredClone(original);
  const saved = saveMoment(original, moment());
  assert.deepEqual(original, before);
  const edited = saveMoment(saved, moment('arrive', 'Explicitly edited', storyView()));
  assert.equal(saved.moments.find(item => item.momentId === 'arrive').note, personal);
  assert.equal(edited.moments.length, 2);
  assert.deepEqual(edited.moments.find(item => item.momentId === 'arrive').view, storyView());
  const removed = removeMoment(edited, 'arrive');
  assert.deepEqual(removed.moments, original.moments);
  assert.equal(edited.moments.length, 2);
  assert.equal(saveMoment(original, moment('arrive', '中'.repeat(500))).moments.length, 2);
  assert.throws(() => saveMoment(original, moment('arrive', '中'.repeat(501))));
  assert.throws(() => saveMoment(original, moment('invented')));
});

test('story framing is bounded independently and never becomes an invented live-camera pose', () => {
  assert.deepEqual(normalizeView({ kind: 'story', scale: 8, x: -3, y: 3, pose: pose() }),
    { kind: 'story', scale: 2, x: 0, y: 1 });
  assert.deepEqual(normalizeView({ ...storyView(), extra: 'private' }), storyView());
  for (const value of [null, [], { ...storyView(), x: '0' }, { ...storyView(), scale: Infinity },
    { kind: 'photograph', pose: pose() }, { kind: 'walk', pose: null }]) assert.equal(normalizeView(value), null);
});

test('sharing defaults to no personal note and serializes only the explicitly selected saved moment', () => {
  const record = saveMoment(saveMoment(createRecord(), moment()), moment('mitsui-rhythm', 'Unselected secret'));
  record.feedback = { score: 4, note: 'Private evaluation', mode: 'walk' };
  const before = structuredClone(record);
  const url = createShareURL(record.moments[0], 'https://example.test/project/perspective.html?mode=walk', { locale: 'zh' });
  const parsed = new URL(url), shared = readSharedMoment(parsed.hash);
  assert.equal(parsed.pathname, '/project/perspective.html');
  assert.equal(parsed.search, '');
  assert.deepEqual(shared, { v: 1, chapter: 'kyoto-looking-closer', locale: 'zh', momentId: 'arrive', note: '', view: view() });
  assert.equal(JSON.stringify(shared).includes('Unselected secret'), false);
  assert.equal(JSON.stringify(shared).includes('Private evaluation'), false);
  assert.deepEqual(record, before);
});

test('explicitly included English/Chinese personal text and either framing round-trip as plain data', () => {
  for (const locale of ['en', 'zh']) for (const framing of [view(), storyView()]) {
    const original = moment('daiya-rhythm', personal, framing);
    const url = createShareURL(original, 'https://example.test/project/perspective.html', { locale, includeNote: true });
    const decoded = readSharedMoment(new URL(url).hash);
    assert.equal(decoded.note, personal);
    assert.equal(decoded.locale, locale);
    assert.deepEqual(decoded.view, framing);
    assert.equal(url, createShareURL(original, 'https://example.test/project/perspective.html', { locale, includeNote: true }));
  }
});

test('recipient fragments reject malformed, unsupported, oversized and invalid-UTF8 data without exposing extra fields', () => {
  const valid = readSharedMoment(new URL(createShareURL(moment(), 'https://example.test/')).hash);
  for (const raw of [null, [], { ...valid, v: 2 }, { ...valid, chapter: 'other' }, { ...valid, locale: 'ja' },
    { ...valid, momentId: 'invented' }, { ...valid, note: 'x'.repeat(501) }, { ...valid, view: null }]) {
    throwsCode(() => readSharedMoment(rawShare(raw)), 'invalid');
  }
  for (const hash of ['', '#moment=', '#moment=%3Cscript%3E', '#recap=abc', '#moment=wyg']) {
    throwsCode(() => readSharedMoment(hash), 'invalid');
  }
  throwsCode(() => readSharedMoment('#moment=' + 'a'.repeat(MAX_SHARE_URL_LENGTH)), 'too-long');
  throwsCode(() => createShareURL(moment(), 'https://example.test/' + 'a'.repeat(MAX_SHARE_URL_LENGTH) + '/'), 'too-long');
  const stripped = readSharedMoment(rawShare({ ...valid, notes: { mitsui: 'Other private text' }, participantCount: 99 }));
  assert.deepEqual(stripped, valid);
});

test('optional feedback export is one local report and excludes private notes, camera positions and invented aggregates', () => {
  const record = saveMoment(createRecord({ mode: 'story', locale: 'zh' }), moment());
  assert.equal(feedbackReport(record), null);
  record.revealedIds = ['arrive'];
  record.feedback = { score: 4, note: 'AUTOMATED FIXTURE — not a human response', mode: 'story' };
  const result = feedbackReport(record);
  assert.equal(result.savedMomentCount, 1);
  assert.equal(result.feedback.note, record.feedback.note);
  assert.deepEqual(result.viewedMoments, ['arrive']);
  assert.match(result.notice, /One local self-report/);
  assert.equal(JSON.stringify(result).includes(personal), false);
  assert.equal(Object.hasOwn(result, 'moments'), false);
  assert.equal(Object.hasOwn(result, 'participants'), false);
  assert.equal(Object.hasOwn(result, 'successRate'), false);
});
