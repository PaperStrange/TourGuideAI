import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { getPack } from '../src/packs/registry.js';
import { loadPackManifest, verifiedBytes } from '../src/runtime/pack-assets.js';
import { waitForTask } from '../src/runtime/cancellation.js';

const pack = getPack('ginza-wako');
const publicRoot = new URL('../public/', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function serve(run) {
  const requests = [], pending = new Set();
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    requests.push(path);
    if (!/^\/app\/(packs\/ginza-wako\/(manifest|materials|lighting|provenance)\.json|packs\/ginza-wako\/scene\.glb|models\/traveller\.glb)$/.test(path)) {
      response.writeHead(404); response.end(); return;
    }
    const bytes = await readFile(new URL(path.slice('/app/'.length), publicRoot));
    if (request.headers['x-test-delay']) {
      const timer = setTimeout(() => { pending.delete(timer); response.end(bytes); }, 5000);
      pending.add(timer); response.once('close', () => { clearTimeout(timer); pending.delete(timer); });
      response.writeHead(200); response.flushHeaders();
    } else { response.writeHead(200); response.end(bytes); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = new URL(`http://127.0.0.1:${server.address().port}/app/`);
  try { await run(base, requests); }
  finally {
    for (const timer of pending) clearTimeout(timer);
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
}

test('the actual exported pack manifest and model verify over local HTTP with embedded PBR', { timeout: 15000 }, async () => {
  await serve(async (base, requests) => {
    const manifest = await loadPackManifest(pack, base);
    assert.equal(manifest.id, pack.id); assert.equal(manifest.revision, pack.revision);
    assert.deepEqual(requests, ['/app/packs/ginza-wako/manifest.json', '/app/packs/ginza-wako/materials.json']);
    const model = await verifiedBytes(new URL(pack.assets.scene, base), manifest.model);
    const source = await readFile(new URL(pack.assets.scene, publicRoot));
    assert.equal(model.sha256, hash(source)); assert.equal(model.sha256, manifest.model.sha256);
    assert.equal(model.bytes.byteLength, source.byteLength);
    assert.ok(requests.every(path => !path.includes('shijo-block') && !path.includes('/architectural/')));
  });
});

test('a different expected revision rejects actual model bytes before a renderer can consume them', { timeout: 15000 }, async () => {
  await serve(async base => {
    const source = await readFile(new URL(pack.assets.scene, publicRoot));
    await assert.rejects(verifiedBytes(new URL(pack.assets.scene, base), { sha256: '0'.repeat(64), bytes: source.length }),
      /version mismatch/);
  });
});

test('cancelling a real in-flight HTTP asset prevents completion and releases the waiting startup', { timeout: 15000 }, async () => {
  await serve(async base => {
    const controller = new AbortController();
    const request = await fetch(new URL('models/traveller.glb', base), {
      signal: controller.signal, headers: { 'X-Test-Delay': '1' },
    });
    const body = request.arrayBuffer();
    const waiting = waitForTask(body, controller.signal);
    controller.abort(new DOMException('Pack switched', 'AbortError'));
    await assert.rejects(waiting, { name: 'AbortError' });
    await assert.rejects(body, { name: 'AbortError' });
    await assert.rejects(verifiedBytes(new URL(pack.assets.scene, base), null, controller.signal), { name: 'AbortError' });
  });
});
