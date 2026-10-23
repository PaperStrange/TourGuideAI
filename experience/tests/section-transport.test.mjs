import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { createSectionAssets } from '../src/runtime/section-assets.js';
import { decodeSectionBytes, sectionTransport } from '../src/runtime/section-transport.js';

const decoded = await readFile(new URL('../public/models/traveller.glb', import.meta.url));
const encoded = gzipSync(decoded, { level: 9 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const descriptor = {
  file: 'traveller.glb', bytes: decoded.length, sha256: sha(decoded),
  transport: { file: 'traveller.glb.gz', bytes: encoded.length, sha256: sha(encoded), encoding: 'gzip' },
};

test('gzip transport preserves a real packaged model and accounts for decoded resident memory', async () => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push(request.url);
    if (new URL(request.url, 'http://localhost').pathname !== '/traveller.glb.gz') { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': 'application/gzip', 'Content-Length': encoded.length });
    response.end(encoded);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const assets = createSectionAssets(new URL(`http://127.0.0.1:${server.address().port}/manifest.json`));
  try {
    const [first, shared] = await Promise.all([assets.download(descriptor), assets.download(descriptor)]);
    assert.deepEqual(requests, ['/traveller.glb.gz?sha256=' + descriptor.transport.sha256]);
    assert.deepEqual(Buffer.from(first.entries[0].bytes), decoded);
    assert.equal(assets.snapshot().loadedBytes, encoded.length);
    assert.equal(assets.snapshot().decodedBytes, decoded.length);
    assert.equal(assets.snapshot().retainedBytes, decoded.length);
    const actor = await assets.parse(first);
    assert.ok(actor.root.getObjectByName('Traveller'));
    actor.release();
    assert.equal(assets.snapshot().retainedBytes, decoded.length);
    shared.release();
    assert.equal(assets.snapshot().retainedBytes, 0);
    assert.equal(assets.snapshot().resourceCount, 0);
    await assert.rejects(assets.download({ ...descriptor, transport: { ...descriptor.transport, sha256: '0'.repeat(64) } }), /version mismatch/);
    assert.equal(assets.snapshot().retainedBytes, 0);
    await assert.rejects(assets.download({ ...descriptor, sha256: '0'.repeat(64) }), /Decoded section version mismatch/);
    assert.equal(assets.snapshot().resourceCount, 0);
  } finally { assets.dispose(); await new Promise(resolve => server.close(resolve)); }
});

test('gzip decoding rejects unsupported metadata, truncated data and declared size or identity mismatches', async () => {
  assert.throws(() => sectionTransport({ ...descriptor, transport: { ...descriptor.transport, encoding: 'unknown' } }), /Invalid section transport/);
  await assert.rejects(decodeSectionBytes(encoded, { ...descriptor, bytes: decoded.length - 1 }), /exceeds its declared size/);
  await assert.rejects(decodeSectionBytes(encoded, { ...descriptor, bytes: decoded.length + 1 }), /size mismatch/);
  await assert.rejects(decodeSectionBytes(encoded, { ...descriptor, sha256: '0'.repeat(64) }), /version mismatch/);
  await assert.rejects(decodeSectionBytes(encoded.subarray(0, encoded.length - 8), descriptor));
  const controller = new AbortController();
  controller.abort(new DOMException('Cancelled route section', 'AbortError'));
  await assert.rejects(decodeSectionBytes(encoded, descriptor, controller.signal), { name: 'AbortError' });
});

test('cancelling a real gzip request releases the section lease and decoded-memory reservation', async () => {
  let requested;
  const started = new Promise(resolve => { requested = resolve; });
  const server = createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/gzip', 'Content-Length': encoded.length });
    response.write(encoded.subarray(0, Math.floor(encoded.length / 2)));
    requested();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const assets = createSectionAssets(new URL(`http://127.0.0.1:${server.address().port}/manifest.json`));
  try {
    const controller = new AbortController();
    const pending = assets.download(descriptor, controller.signal);
    await started;
    controller.abort(new DOMException('Changed route', 'AbortError'));
    await assert.rejects(pending, { name: 'AbortError' });
    assert.equal(assets.snapshot().resourceCount, 0);
    assert.equal(assets.snapshot().retainedBytes, 0);
  } finally { assets.dispose(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
