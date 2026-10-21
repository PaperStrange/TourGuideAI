import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRestoreIntent } from '../src/runtime/restore-intent.js';

const geographyURL = new URL('../src/neighborhoods/shijo-east/geography.json', import.meta.url);

async function readActualRoute() {
  const geography = JSON.parse(await readFile(geographyURL, 'utf8'));
  assert.ok(geography.navigation.nodes.length > 0);
  return geography;
}

test('changed viewing intent prevents a late file read from applying a saved pose', async () => {
  const intent = createRestoreIntent();
  let applied = false, finishedReading = false, preparationSignal;
  const result = intent.run({
    async prepare(signal) {
      preparationSignal = signal;
      await readActualRoute();
      finishedReading = true;
    },
    apply() { applied = true; return true; },
  });
  assert.equal(intent.isPending(), true);
  intent.cancel();
  assert.equal(preparationSignal.aborted, true);
  assert.equal(await result, false);
  assert.equal(finishedReading, true);
  assert.equal(applied, false);
  assert.equal(intent.isPending(), false);
});

test('a newer return remains authoritative while both route files finish reading', async () => {
  const intent = createRestoreIntent();
  const applied = [];
  let firstSignal, secondSignal;
  const first = intent.run({
    async prepare(signal) { firstSignal = signal; await readActualRoute(); },
    apply() { applied.push('first'); return true; },
  });
  const second = intent.run({
    async prepare(signal) { secondSignal = signal; await readActualRoute(); },
    apply() { applied.push('second'); return true; },
  });
  assert.equal(firstSignal.aborted, true);
  assert.equal(secondSignal.aborted, false);
  assert.deepEqual(await Promise.all([first, second]), [false, true]);
  assert.deepEqual(applied, ['second']);
  assert.equal(intent.isPending(), false);
});

test('a homepage cancellation also suppresses a producer that completes its file read', async () => {
  const intent = createRestoreIntent(), controller = new AbortController();
  let applied = false, completed = false;
  const result = intent.run({
    signal: controller.signal,
    async prepare() { await readActualRoute(); completed = true; },
    apply() { applied = true; return true; },
  });
  controller.abort();
  assert.equal(await result, false);
  assert.equal(completed, true);
  assert.equal(applied, false);
  assert.equal(intent.isPending(), false);
});

test('a real file failure remains visible and the following valid return can complete', async () => {
  const intent = createRestoreIntent();
  let applied = false;
  await assert.rejects(intent.run({
    prepare: () => readFile(new URL('geography.json/missing', geographyURL)),
    apply() { applied = true; return true; },
  }), { code: 'ENOTDIR' });
  assert.equal(applied, false);
  assert.equal(intent.isPending(), false);
  assert.equal(await intent.run({
    prepare: readActualRoute,
    apply() { applied = true; return true; },
  }), true);
  assert.equal(applied, true);
  assert.equal(intent.isPending(), false);
});
