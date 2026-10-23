import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readAssetBytes } from '../src/runtime/asset-bytes.js';
import { verifiedBytes } from '../src/runtime/pack-assets.js';

const rig = await readFile(new URL('../public/lighting/rig.json', import.meta.url));
const alternateRig = await readFile(new URL('../public/packs/ginza-wako/lighting.json', import.meta.url));
const actor = await readFile(new URL('../public/models/traveller.glb', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = bytes => ({ sha256: sha(bytes), bytes: bytes.length });

async function serve(t) {
  const files = new Map([['/TourGuideAI/rig.json', rig], ['/TourGuideAI/traveller.glb', actor]]);
  const requests = [];
  let held = false, disconnected = false, bodyStarted;
  const started = new Promise(resolve => { bodyStarted = resolve; });
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    requests.push({ path: url.pathname, query: url.search, headers: request.headers });
    if (disconnected) { request.socket.destroy(); return; }
    const bytes = files.get(url.pathname);
    if (!bytes) { response.writeHead(404, { 'Cache-Control': 'public, max-age=3600, immutable' }).end(); return; }
    response.writeHead(200, { 'Content-Length': bytes.length, 'Cache-Control': 'public, max-age=3600, immutable',
      ETag: '"' + sha(bytes) + '"' });
    if (held) { response.write(bytes.subarray(0, Math.floor(bytes.length / 2))); bodyStarted(); }
    else response.end(bytes);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return { files, requests, started, hold(value) { held = value; }, disconnect(value) { disconnected = value; },
    url: path => new URL(path, `http://127.0.0.1:${server.address().port}/TourGuideAI/`) };
}

test('actual HTTP asset versions use separate SHA URLs and retain Pages paths and existing query parameters', async t => {
  const service = await serve(t), url = service.url('rig.json?language=en');
  const first = await verifiedBytes(url, identity(rig));
  assert.deepEqual(Buffer.from(first.bytes), rig);
  assert.equal(first.sha256, sha(rig));
  service.files.set('/TourGuideAI/rig.json', alternateRig);
  const second = await verifiedBytes(url, identity(alternateRig));
  assert.deepEqual(Buffer.from(second.bytes), alternateRig);
  assert.equal(second.sha256, sha(alternateRig));
  assert.notEqual(sha(rig), sha(alternateRig));
  assert.equal(url.search, '?language=en');
  assert.deepEqual(service.requests.map(request => request.path), ['/TourGuideAI/rig.json', '/TourGuideAI/rig.json']);
  assert.deepEqual(service.requests.map(request => request.query),
    ['?language=en&sha256=' + sha(rig), '?language=en&sha256=' + sha(alternateRig)]);
  for (const request of service.requests) {
    assert.equal(request.headers['cache-control'], undefined);
    assert.equal(request.headers.pragma, undefined);
  }
});

test('unhashed resources revalidate, including when their URL already contains a hash-looking query', async t => {
  const service = await serve(t), url = service.url('rig.json?sha256=' + sha(rig));
  await readAssetBytes(url);
  service.files.set('/TourGuideAI/rig.json', alternateRig);
  const changed = await readAssetBytes(url);
  assert.deepEqual(Buffer.from(changed.bytes), alternateRig);
  assert.equal(changed.sha256, sha(alternateRig));
  assert.equal(service.requests.length, 2);
  for (const request of service.requests) assert.equal(request.headers['cache-control'], 'max-age=0');
});

test('incorrect real bytes fail without retry and the next explicit call reloads then clears the rejection', async t => {
  const service = await serve(t), url = service.url('rig.json'), expected = identity(alternateRig);
  await assert.rejects(verifiedBytes(url, expected), /Pack asset version mismatch/);
  assert.equal(service.requests.length, 1);
  service.files.set('/TourGuideAI/rig.json', alternateRig);
  const recovered = await verifiedBytes(url, expected);
  assert.deepEqual(Buffer.from(recovered.bytes), alternateRig);
  assert.equal(service.requests.length, 2);
  assert.equal(service.requests[1].headers['cache-control'], 'no-cache');
  assert.equal(service.requests[1].headers.pragma, 'no-cache');
  assert.equal(service.requests[0].query, service.requests[1].query);
  await verifiedBytes(url, expected);
  assert.equal(service.requests[2].headers['cache-control'], undefined);
});

test('declared size still rejects correct-hash bytes, while hash-only lighting identities remain verified', async t => {
  const service = await serve(t), url = service.url('rig.json');
  await assert.rejects(verifiedBytes(url, { ...identity(rig), bytes: rig.length + 1 }), /version mismatch/);
  const verified = await readAssetBytes(url, { sha256: sha(rig) }, undefined,
    { unavailable: 'rig-unavailable', mismatch: 'rig-version-mismatch' });
  assert.deepEqual(Buffer.from(verified.bytes), rig);
  assert.equal(service.requests[1].headers['cache-control'], 'no-cache');
  await assert.rejects(readAssetBytes(url, { sha256: sha(alternateRig) }, undefined,
    { mismatch: 'environment-version-mismatch' }), /^Error: environment-version-mismatch$/);
  await assert.rejects(verifiedBytes(url, { sha256: sha(rig) }), /Invalid expected asset size/);
});

test('aborted real body transfers do not mark a version for cache reload', async t => {
  const service = await serve(t), url = service.url('traveller.glb'), expected = identity(actor);
  service.hold(true);
  const controller = new AbortController(), pending = verifiedBytes(url, expected, controller.signal);
  await service.started;
  controller.abort(new DOMException('Section switched', 'AbortError'));
  await assert.rejects(pending, { name: 'AbortError' });
  service.hold(false);
  assert.deepEqual(Buffer.from((await verifiedBytes(url, expected)).bytes), actor);
  assert.equal(service.requests[1].headers['cache-control'], undefined);
  const count = service.requests.length;
  await assert.rejects(verifiedBytes(url, expected, controller.signal), { name: 'AbortError' });
  assert.equal(service.requests.length, count);
});

test('a cacheable HTTP 404 remains visible until an explicit retry reloads and verifies the actual file', async t => {
  const service = await serve(t), url = service.url('missing.glb'), expected = identity(actor);
  await assert.rejects(verifiedBytes(url, expected), /Pack asset unavailable: 404/);
  assert.equal(service.requests.length, 1);
  assert.equal(service.requests[0].headers['cache-control'], undefined);
  service.files.set('/TourGuideAI/missing.glb', actor);
  assert.deepEqual(Buffer.from((await verifiedBytes(url, expected)).bytes), actor);
  assert.equal(service.requests.length, 2);
  assert.equal(service.requests[1].headers['cache-control'], 'no-cache');
  assert.equal(service.requests[1].headers.pragma, 'no-cache');
  assert.equal(service.requests[0].query, service.requests[1].query);
  await verifiedBytes(url, expected);
  assert.equal(service.requests[2].headers['cache-control'], undefined);
});

test('a real connection failure without an HTTP response does not mark a version for reload', async t => {
  const service = await serve(t), url = service.url('traveller.glb'), expected = identity(actor);
  service.disconnect(true);
  await assert.rejects(verifiedBytes(url, expected), TypeError);
  service.disconnect(false);
  assert.deepEqual(Buffer.from((await verifiedBytes(url, expected)).bytes), actor);
  assert.equal(service.requests.at(-1).headers['cache-control'], undefined);
  assert.equal(service.requests.at(-1).headers.pragma, undefined);
});

test('invalid expected identities fail before issuing a network request', async t => {
  const service = await serve(t), url = service.url('rig.json');
  for (const expected of [{ sha256: 'bad' }, { sha256: sha(rig), bytes: -1 }, { sha256: sha(rig), bytes: Infinity }]) {
    await assert.rejects(readAssetBytes(url, expected), /Invalid expected asset identity/);
  }
  assert.equal(service.requests.length, 0);
});
