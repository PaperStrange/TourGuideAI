import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createSectionAssets } from '../src/runtime/section-assets.js';
import { createTaskQueue } from '../src/runtime/section-queue.js';

test('actual packaged model requests share leases, obey the download limit and release bytes', async () => {
  const names = ['models/traveller.glb', 'models/shijo-block.glb', 'packs/ginza-wako/scene.glb'];
  const descriptors = await Promise.all(names.map(async file => {
    const bytes = await readFile(new URL('../public/' + file, import.meta.url));
    return { file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  }));
  const counts = new Map();
  const server = createServer((request, response) => {
    const file = new URL(request.url, 'http://localhost').pathname.slice(1);
    if (!names.includes(file)) { response.writeHead(404).end(); return; }
    counts.set(file, (counts.get(file) ?? 0) + 1);
    createReadStream(fileURLToPath(new URL('../public/' + file, import.meta.url))).pipe(response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const assets = createSectionAssets(new URL(`http://127.0.0.1:${server.address().port}/manifest.json`));
  try {
    const first = assets.download(descriptors[0]);
    const shared = assets.download(descriptors[0]);
    const bundles = await Promise.all([first, shared, ...descriptors.slice(1).map(asset => assets.download(asset))]);
    assert.equal(counts.get(names[0]), 1);
    assert.equal(assets.snapshot().downloads.peak, 2);
    assert.equal(assets.snapshot().resourceCount, 3);
    const actor = await assets.parse(bundles[0]);
    assert.ok(actor.root.getObjectByName('Traveller'));
    actor.release(); assert.equal(assets.snapshot().releasedModels, 1);
    assert.equal(assets.snapshot().resourceCount, 3);
    for (const bundle of bundles.slice(1)) bundle.release();
    assert.equal(assets.snapshot().resourceCount, 0); assert.equal(assets.snapshot().retainedBytes, 0);
    await assert.rejects(assets.download({ ...descriptors[0], sha256: '0'.repeat(64) }), /version mismatch/);
    assert.equal(assets.snapshot().resourceCount, 0);
  } finally { assets.dispose(); await new Promise(resolve => server.close(resolve)); }
});

test('attachment queue serializes real file hashing and rejects a cancelled queued operation', async () => {
  const queue = createTaskQueue(1), abort = new AbortController();
  const actualFile = new URL('../public/packs/ginza-wako/scene.glb', import.meta.url);
  const hash = async () => createHash('sha256').update(await readFile(actualFile)).digest('hex');
  const first = queue.run(hash);
  const cancelled = queue.run(hash, abort.signal);
  abort.abort(new DOMException('Cancelled by the next section request', 'AbortError'));
  await assert.rejects(cancelled, { name: 'AbortError' });
  assert.equal((await first).length, 64);
  assert.equal(queue.snapshot().peak, 1); assert.equal(queue.snapshot().queued, 0);
  queue.dispose();
});
