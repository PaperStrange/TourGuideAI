import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createConnection } from 'node:net';
import { EventSourceParserStream } from 'eventsource-parser/stream';
import { startServer } from '../src/server.js';
import { validateGroundedPlan } from '../src/planner.js';

const catalog = [
  { id: 'kyoto', name: 'Kyoto', kind: 'city', latitude: 35.0116, longitude: 135.7681, country: 'Japan' },
  { id: 'tokyo', name: 'Tokyo', kind: 'city', latitude: 35.6762, longitude: 139.6503, country: 'Japan' },
];
const disabledProvider = { provider: { apiKey: '', model: '' } };

async function isolatedService(t) {
  const base = new URL('../.data/tests/', import.meta.url);
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(new URL('run-', base));
  const databasePath = join(directory, 'rooms.sqlite');
  let service = await startServer({ port: 0, host: '127.0.0.1', databasePath, config: disabledProvider });
  t.after(async () => { await service.close(); await rm(directory, { recursive: true, force: true }); });
  return {
    get service() { return service; }, databasePath,
    async restart() { await service.close(); service = await startServer({ port: 0, host: '127.0.0.1', databasePath, config: disabledProvider }); },
  };
}
async function request(service, path, { method = 'GET', body, session, headers = {} } = {}) {
  const response = await fetch(service.url + path, {
    method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(session ? { Authorization: `Bearer ${session.inviteToken}`, 'X-Participant-Token': session.participantToken } : {}), ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, headers: response.headers, data: response.status === 204 ? null : await response.json() };
}
const action = (service, room, session, value, expectedRevision = room.revision) => request(service, `/api/rooms/${room.id}/actions`, {
  method: 'POST', session, body: { participantId: session.participantId, expectedRevision, action: value },
});
async function connect(service, roomId, session) {
  const abort = new AbortController();
  const response = await fetch(`${service.url}/api/rooms/${roomId}/events`, {
    headers: { Authorization: `Bearer ${session.inviteToken}` }, signal: abort.signal,
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const reader = response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream()).getReader();
  return {
    async next() {
      const result = await reader.read();
      assert.equal(result.done, false);
      assert.equal(result.value.event, 'room');
      const room = JSON.parse(result.value.data);
      assert.equal(result.value.id, String(room.revision));
      return room;
    },
    async close() { await reader.cancel(); abort.abort(); },
  };
}

test('two real HTTP clients collaborate, receive SSE snapshots and recover the persisted room after restart', { timeout: 20000 }, async t => {
  const runtime = await isolatedService(t);
  const health = await request(runtime.service, '/api/health');
  assert.deepEqual(health.data, { ok: true, capabilities: { rooms: true, events: true, planning: false }, provider: { configured: false } });
  const created = await request(runtime.service, '/api/rooms', { method: 'POST', body: { title: 'Japan together', displayName: 'Alice', catalog } });
  assert.equal(created.status, 201);
  const alice = created.data;
  let room = alice.room;
  const joined = await request(runtime.service, `/api/rooms/${room.id}/actions`, {
    method: 'POST', session: alice, body: { expectedRevision: room.revision, action: { type: 'participant.join', displayName: 'Bob' } },
  });
  assert.equal(joined.status, 200);
  const bob = { ...joined.data, inviteToken: alice.inviteToken };
  room = joined.data.room;
  assert.equal(room.participants.length, 2);
  const first = await connect(runtime.service, room.id, alice), second = await connect(runtime.service, room.id, bob);
  assert.deepEqual(await first.next(), room);
  assert.deepEqual(await second.next(), room);

  const writes = await Promise.all([
    action(runtime.service, room, alice, { type: 'dream.add', destinationId: 'kyoto', note: 'Gardens' }),
    action(runtime.service, room, bob, { type: 'dream.add', destinationId: 'tokyo', note: 'Architecture' }),
  ]);
  assert.deepEqual(writes.map(result => result.status).sort(), [200, 409]);
  const conflictIndex = writes.findIndex(result => result.status === 409);
  assert.equal(writes[conflictIndex].data.error.code, 'revision_conflict');
  room = writes[conflictIndex].data.room;
  assert.equal(room.dreams.length, 1);
  assert.deepEqual(await first.next(), room);
  assert.deepEqual(await second.next(), room);
  const retry = await action(runtime.service, room, conflictIndex === 0 ? alice : bob,
    { type: 'dream.add', destinationId: conflictIndex === 0 ? 'kyoto' : 'tokyo', note: 'Explicit retry after reviewing current state' });
  assert.equal(retry.status, 200);
  room = retry.data.room;
  assert.equal(room.dreams.length, 2);
  assert.deepEqual(await first.next(), room);
  assert.deepEqual(await second.next(), room);
  const focus = await action(runtime.service, room, bob, { type: 'presence.focus', destinationId: 'kyoto' });
  room = focus.data.room;
  assert.equal(room.participants.find(person => person.id === bob.participantId).focusedDestinationId, 'kyoto');
  assert.deepEqual(await first.next(), room);
  assert.deepEqual(await second.next(), room);
  const serialized = JSON.stringify(room);
  for (const secret of [alice.inviteToken, alice.participantToken, bob.participantToken]) assert.equal(serialized.includes(secret), false);
  await first.close(); await second.close();

  const proposed = await action(runtime.service, room, alice, { type: 'plan.propose', title: 'Our cities', summary: 'Visit the cities we selected.', stopIds: ['kyoto', 'tokyo'] });
  room = proposed.data.room;
  assert.equal(room.plan.status, 'proposed');
  room = (await action(runtime.service, room, alice, { type: 'plan.accept' })).data.room;
  assert.equal(room.plan.status, 'proposed');
  room = (await action(runtime.service, room, bob, { type: 'plan.accept' })).data.room;
  assert.equal(room.plan.status, 'accepted');
  const reordered = await action(runtime.service, room, bob, { type: 'plan.reorder', stopIds: ['tokyo', 'kyoto'] });
  room = reordered.data.room;
  assert.deepEqual(room.plan.acceptedBy, []);
  assert.equal(room.plan.status, 'proposed');
  assert.equal((await action(runtime.service, room, bob, { type: 'plan.reorder', stopIds: ['tokyo', 'tokyo'] })).status, 422);
  assert.equal((await action(runtime.service, room, alice, { type: 'presence.focus', destinationId: 'unknown' })).status, 422);
  assert.equal((await action(runtime.service, room, { ...alice, participantToken: bob.participantToken }, { type: 'plan.accept' })).status, 403);
  const unavailable = await request(runtime.service, '/api/plan', { method: 'POST', session: alice,
    body: { roomId: room.id, participantId: alice.participantId, locale: 'zh', preferences: 'Keep both cities.' } });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.data.error.code, 'llm_unconfigured');
  assert.deepEqual((await request(runtime.service, `/api/rooms/${room.id}`, { session: alice })).data.room, room);
  await runtime.restart();
  const restored = await request(runtime.service, `/api/rooms/${room.id}`, { session: alice });
  assert.deepEqual(restored.data.room, room);
  const reconnect = await connect(runtime.service, room.id, bob);
  assert.deepEqual(await reconnect.next(), room);
  const accepted = await action(runtime.service, room, bob, { type: 'plan.accept' });
  assert.equal(accepted.status, 200);
  assert.deepEqual(await reconnect.next(), accepted.data.room);
  await reconnect.close();
  const bytes = await readFile(runtime.databasePath);
  assert.equal(bytes.includes(Buffer.from(alice.inviteToken)), false);
  assert.equal(bytes.includes(Buffer.from(alice.participantToken)), false);
});

test('room credentials, contributor ownership, request validation and origin allowlist are enforced over HTTP', async t => {
  const { service } = await isolatedService(t);
  const created = await request(service, '/api/rooms', { method: 'POST', body: { title: 'Choices', displayName: 'Owner', catalog } });
  const owner = created.data;
  let room = owner.room;
  assert.equal((await request(service, `/api/rooms/${room.id}`)).status, 401);
  assert.equal((await request(service, `/api/rooms/${room.id}`, { session: { ...owner, inviteToken: 'invalid' } })).status, 401);
  assert.equal((await request(service, '/api/health', { headers: { Origin: 'https://unlisted.example' } })).status, 403);
  const preflight = await request(service, `/api/rooms/${room.id}/actions`, { method: 'OPTIONS', headers: {
    Origin: 'http://localhost:4185', 'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,x-participant-token,content-type',
  } });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('access-control-allow-headers'), /X-Participant-Token/);
  assert.equal((await request(service, '/api/rooms', { method: 'POST', body: { title: 'Bad', displayName: 'A', catalog: [{ ...catalog[0], latitude: 91 }] } })).status, 400);
  const joined = await request(service, `/api/rooms/${room.id}/actions`, { method: 'POST', session: owner,
    body: { expectedRevision: room.revision, action: { type: 'participant.join', displayName: 'Guest' } } });
  const guest = { ...joined.data, inviteToken: owner.inviteToken };
  room = joined.data.room;
  room = (await action(service, room, owner, { type: 'dream.add', destinationId: 'kyoto' })).data.room;
  assert.equal((await action(service, room, guest, { type: 'dream.remove', dreamId: room.dreams[0].id })).status, 403);
  const removed = await action(service, room, owner, { type: 'dream.remove', dreamId: room.dreams[0].id });
  assert.equal(removed.status, 200);
  assert.deepEqual(removed.data.room.dreams, []);
  room = removed.data.room;
  const added = await action(service, room, guest, { type: 'catalog.add', place: {
    id: 'osaka', name: 'Osaka', kind: 'city', latitude: 34.6937, longitude: 135.5023,
  } });
  assert.equal(added.status, 200);
  assert.equal(added.data.room.catalog.at(-1).id, 'osaka');
  assert.equal((await action(service, added.data.room, guest, { type: 'catalog.add', place: catalog[0] })).status, 409);
});

test('proposal validation allows catalog-grounded IDs and rejects invented or omitted contributed destinations', () => {
  const room = { catalog, dreams: [{ destinationId: 'kyoto' }, { destinationId: 'tokyo' }] };
  const proposal = { title: 'Japan cities', summary: 'A suggested order.', stopIds: ['kyoto', 'tokyo'] };
  assert.deepEqual(validateGroundedPlan(proposal, room), proposal);
  assert.throws(() => validateGroundedPlan({ ...proposal, stopIds: ['kyoto', 'invented'] }, room), error => error.code === 'llm_unknown_place');
  assert.throws(() => validateGroundedPlan({ ...proposal, stopIds: ['kyoto'] }, room), error => error.code === 'llm_missing_destination');
  assert.throws(() => validateGroundedPlan({ ...proposal, stopIds: ['kyoto', 'kyoto'] }, room), error => error.code === 'llm_invalid_response');
  assert.throws(() => validateGroundedPlan({ ...proposal, arbitraryFact: 'unsupported' }, room), error => error.code === 'llm_invalid_response');
});

test('service shutdown completes while an invited client keeps its SSE connection open', { timeout: 6000 }, async t => {
  const { service } = await isolatedService(t);
  const created = await request(service, '/api/rooms', { method: 'POST', body: { title: 'Shutdown', displayName: 'Reader', catalog } });
  const stream = await connect(service, created.data.room.id, created.data);
  await stream.next();
  const started = performance.now();
  await service.close();
  assert.ok(performance.now() - started < 2000, 'active SSE must not keep shutdown waiting for an idle connection timeout');
  await stream.close();
});

test('changed wishes clear group acceptance and prevent an outdated proposal from omitting the new destination', async t => {
  const { service } = await isolatedService(t);
  const owner = (await request(service, '/api/rooms', { method: 'POST', body: { title: 'Updated wishes', displayName: 'First', catalog } })).data;
  let room = owner.room;
  const joined = await request(service, `/api/rooms/${room.id}/actions`, { method: 'POST', session: owner,
    body: { expectedRevision: room.revision, action: { type: 'participant.join', displayName: 'Second' } } });
  const guest = { ...joined.data, inviteToken: owner.inviteToken };
  room = joined.data.room;
  room = (await action(service, room, owner, { type: 'dream.add', destinationId: 'kyoto' })).data.room;
  room = (await action(service, room, owner, { type: 'plan.propose', title: 'Kyoto', summary: '', stopIds: ['kyoto'] })).data.room;
  room = (await action(service, room, owner, { type: 'plan.accept' })).data.room;
  room = (await action(service, room, guest, { type: 'plan.accept' })).data.room;
  assert.equal(room.plan.status, 'accepted');
  room = (await action(service, room, guest, { type: 'dream.add', destinationId: 'tokyo' })).data.room;
  assert.equal(room.plan.status, 'proposed');
  assert.deepEqual(room.plan.acceptedBy, []);
  const staleAccept = await action(service, room, owner, { type: 'plan.accept' });
  assert.equal(staleAccept.status, 422);
  assert.equal(staleAccept.data.error.code, 'missing_destinations');
  const omitted = await action(service, room, owner, { type: 'plan.propose', title: 'Only Kyoto', summary: '', stopIds: ['kyoto'] });
  assert.equal(omitted.status, 422);
  room = (await action(service, room, owner, { type: 'plan.propose', title: 'Both cities', summary: '', stopIds: ['kyoto', 'tokyo'] })).data.room;
  room = (await action(service, room, owner, { type: 'plan.accept' })).data.room;
  room = (await action(service, room, guest, { type: 'plan.accept' })).data.room;
  assert.equal(room.plan.status, 'accepted');
  room = (await action(service, room, guest, { type: 'dream.remove', dreamId: room.dreams.find(dream => dream.destinationId === 'tokyo').id })).data.room;
  assert.equal(room.plan.status, 'proposed');
  assert.deepEqual(room.plan.acceptedBy, []);
  assert.deepEqual(room.plan.stopIds, ['kyoto', 'tokyo']);
});

test('shutdown closes an actual incomplete HTTP connection within its configured grace period', { timeout: 6000 }, async t => {
  const base = new URL('../.data/tests/', import.meta.url);
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(new URL('shutdown-', base));
  const service = await startServer({ port: 0, host: '127.0.0.1', databasePath: join(directory, 'rooms.sqlite'),
    config: disabledProvider, shutdownGraceMs: 100 });
  const socket = createConnection(Number(new URL(service.url).port), '127.0.0.1');
  t.after(async () => { socket.destroy(); await service.close(); await rm(directory, { recursive: true, force: true }); });
  await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('error', reject); });
  socket.write('GET /api/health HTTP/1.1\r\nHost: localhost\r\n');
  const started = performance.now();
  await service.close();
  assert.ok(performance.now() - started < 2000);
});

test('a valid catalog larger than the HTTP high-water mark still streams its committed update', { timeout: 6000 }, async t => {
  const { service } = await isolatedService(t);
  const places = Array.from({ length: 100 }, (_, index) => ({
    ...catalog[0], id: `place-${index}`, name: `Place ${index}`, sourceUrl: `https://example.com/${'reference'.repeat(120)}/${index}`,
  }));
  const created = await request(service, '/api/rooms', { method: 'POST', body: { title: 'Catalog capacity', displayName: 'Reader', catalog: places } });
  assert.equal(created.status, 201);
  const session = created.data, stream = await connect(service, session.room.id, session);
  assert.equal((await stream.next()).catalog.length, 100);
  const update = await action(service, session.room, session, { type: 'dream.add', destinationId: 'place-0' });
  assert.equal(update.status, 200);
  assert.deepEqual(await stream.next(), update.data.room);
  await stream.close();
});
