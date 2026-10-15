import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer, createConnection } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { startServer } from '../src/server.js';
import { createRoomClient } from '../../src/home/room-client.js';

const catalog = [{ id: 'kyoto', name: 'Kyoto', kind: 'city', latitude: 35.0116, longitude: 135.7681 }];

async function eventually(predicate, message) {
  const deadline = performance.now() + 5000;
  while (!predicate()) {
    assert.ok(performance.now() < deadline, message);
    await delay(10);
  }
}

async function setup(t) {
  const base = new URL('../.data/tests/', import.meta.url);
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(new URL('poll-', base));
  const service = await startServer({ port: 0, host: '127.0.0.1', databasePath: join(directory, 'rooms.sqlite'),
    config: { provider: { apiKey: '', model: '' } } });
  const client = createRoomClient({ baseURL: service.url, transport: 'poll', pollIntervalMs: 30, reconnectDelayMs: 30 });
  const created = await client.create({ title: 'Periodic updates', displayName: 'Alice', catalog });
  const session = { ...created, roomId: created.room.id };
  t.after(async () => { await service.close(); await rm(directory, { recursive: true, force: true }); });
  return { service, client, session };
}

// 真实 TCP 转发器暂停上游响应，保留实际服务生成的 HTTP 字节。
async function bufferedConnection(t, service) {
  let blocked = true;
  const connections = new Set();
  const server = createServer(downstream => {
    const upstream = createConnection(Number(new URL(service.url).port), '127.0.0.1');
    const connection = { downstream, upstream, chunks: [], ended: false };
    connections.add(connection);
    downstream.pipe(upstream);
    upstream.on('data', chunk => {
      if (blocked) connection.chunks.push(chunk);
      else downstream.write(chunk);
    });
    upstream.on('end', () => { connection.ended = true; if (!blocked) downstream.end(); });
    upstream.on('error', () => downstream.destroy());
    downstream.on('error', () => upstream.destroy());
    downstream.on('close', () => { upstream.destroy(); connections.delete(connection); });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(async () => {
    for (const { downstream, upstream } of connections) { downstream.destroy(); upstream.destroy(); }
    await new Promise(resolve => server.close(resolve));
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    hasBufferedResponse: () => [...connections].some(connection => connection.chunks.length),
    release() {
      blocked = false;
      for (const connection of connections) {
        for (const chunk of connection.chunks) connection.downstream.write(chunk);
        connection.chunks = [];
        if (connection.ended) connection.downstream.end();
      }
    },
  };
}

test('two polling clients receive actual committed changes once per revision and stop after cancellation', { timeout: 10000 }, async t => {
  const { service, client, session } = await setup(t);
  const second = createRoomClient({ baseURL: service.url, transport: 'poll', pollIntervalMs: 30 });
  const joined = await second.join(session, { displayName: 'Bob', expectedRevision: session.room.revision });
  const bob = { roomId: session.roomId, inviteToken: session.inviteToken, ...joined };
  const firstRooms = [], secondRooms = [], statuses = [];
  const abort = new AbortController();
  const firstStream = client.subscribe(session, { onRoom: room => firstRooms.push(room), onStatus: value => statuses.push(value), signal: abort.signal });
  const secondStream = second.subscribe(bob, { onRoom: room => secondRooms.push(room) });
  t.after(() => { firstStream.close(); secondStream.close(); });
  await eventually(() => firstRooms.length && secondRooms.length, 'both clients receive the initial room');
  await delay(120);
  assert.equal(firstRooms.length, 1);
  assert.equal(secondRooms.length, 1);
  const updated = await second.action(bob, { expectedRevision: joined.room.revision, action: { type: 'dream.add', destinationId: 'kyoto' } });
  await eventually(() => firstRooms.at(-1).revision === updated.room.revision && secondRooms.at(-1).revision === updated.room.revision,
    'both clients receive the persisted wish');
  assert.deepEqual(firstRooms.at(-1), updated.room);
  firstStream.reconnect();
  await delay(100);
  assert.equal(firstRooms.length, 2, 'explicit reconnect does not repeat an unchanged revision');
  abort.abort();
  secondStream.close();
  await second.action(bob, { expectedRevision: updated.room.revision, action: { type: 'presence.focus', destinationId: 'kyoto' } });
  await delay(120);
  assert.equal(firstRooms.length, 2);
  assert.equal(secondRooms.length, 2);
  assert.equal(statuses.at(-1), 'closed');
});

test('actual buffered HTTP responses time out with backoff and periodic reads recover when transport resumes', { timeout: 10000 }, async t => {
  const { service, session } = await setup(t);
  const transport = await bufferedConnection(t, service);
  const errors = [], rooms = [], statuses = [];
  const client = createRoomClient({ baseURL: transport.url, transport: 'poll', pollIntervalMs: 60, reconnectDelayMs: 60, pollTimeoutMs: 80 });
  const stream = client.subscribe(session, {
    onRoom: room => rooms.push(room), onStatus: value => statuses.push(value),
    onError: (error, info) => errors.push({ error, info, at: performance.now() }),
  });
  t.after(() => stream.close());
  await eventually(() => errors.length === 3, 'three stalled reads reach their deadlines');
  assert.ok(errors.every(({ error, info }) => error.code === 'poll_timeout' && info.willRetry));
  assert.ok(errors[1].at - errors[0].at >= 120, 'first retry waits for the interval and request deadline');
  assert.ok(errors[2].at - errors[1].at >= 180, 'second retry increases the wait');
  assert.equal(rooms.length, 0);
  transport.release();
  await eventually(() => rooms.length === 1, 'a real snapshot arrives when the connection resumes');
  assert.deepEqual(rooms[0], session.room);
  assert.equal(statuses.at(-1), 'connected');
});

test('closing a pending periodic read suppresses its delayed response and callbacks', { timeout: 10000 }, async t => {
  const { service, session } = await setup(t);
  const transport = await bufferedConnection(t, service);
  const rooms = [], errors = [], statuses = [];
  const client = createRoomClient({ baseURL: transport.url, transport: 'poll', pollIntervalMs: 30 });
  const stream = client.subscribe(session, { onRoom: room => rooms.push(room), onError: error => errors.push(error), onStatus: value => statuses.push(value) });
  t.after(() => stream.close());
  await eventually(transport.hasBufferedResponse, 'the real service has sent its response');
  stream.close();
  transport.release();
  stream.reconnect();
  await delay(120);
  assert.deepEqual(rooms, []);
  assert.deepEqual(errors, []);
  assert.equal(statuses.at(-1), 'closed');
});

test('polling invitation rejection is terminal and the default subscription retains real SSE', { timeout: 10000 }, async t => {
  const { service, client, session } = await setup(t);
  const errors = [], statuses = [];
  const rejected = client.subscribe({ ...session, inviteToken: 'invalid' }, {
    onRoom: () => assert.fail('a rejected invitation cannot read a room'),
    onError: (error, info) => errors.push({ error, info }), onStatus: value => statuses.push(value),
  });
  t.after(() => rejected.close());
  await eventually(() => statuses.at(-1) === 'closed', 'invalid credentials close the subscription');
  await delay(120);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].error.status, 401);
  assert.equal(errors[0].info.willRetry, false);
  const rooms = [];
  const live = createRoomClient({ baseURL: service.url }).subscribe(session, { onRoom: room => rooms.push(room) });
  t.after(() => live.close());
  await eventually(() => rooms.length === 1, 'the default client receives an actual SSE snapshot');
  const updated = await client.action(session, { expectedRevision: session.room.revision, action: { type: 'dream.add', destinationId: 'kyoto' } });
  await eventually(() => rooms.at(-1).revision === updated.room.revision, 'the default stream receives the committed change');
});
