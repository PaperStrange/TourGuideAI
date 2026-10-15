import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const image = process.argv[2] ?? 'tourguideai-rooms:qa-20261015';
const suffix = randomUUID().slice(0, 8);
const containerName = `tourguideai-room-smoke-${suffix}`;
const volumeName = `tourguideai-room-data-${suffix}`;
const dockerEnvironment = { ...process.env };
for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete dockerEnvironment[key];
const docker = (...args) => execFileSync('docker', ['--host=unix:///var/run/docker.sock', ...args], {
  env: dockerEnvironment, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
const report = { image, checks: [], sourceHashes: {} };
for (const file of ['config.js', 'errors.js', 'planner.js', 'schemas.js', 'server.js', 'store.js']) {
  report.sourceHashes[file] = createHash('sha256').update(readFileSync(new URL(`../src/${file}`, import.meta.url))).digest('hex');
}
let containerCreated = false, volumeCreated = false;

async function waitHealthy(url) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return response.json();
    } catch (error) {
      if (!(error instanceof TypeError) && error.name !== 'TimeoutError') throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('The real container did not become healthy within 15 seconds.');
}
async function jsonRequest(url, path, body, credentials) {
  const response = await fetch(url + path, {
    method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(5000),
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(credentials ? { Authorization: `Bearer ${credentials.inviteToken}`, 'X-Participant-Token': credentials.participantToken } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.ok(response.ok, `HTTP request failed with ${response.status}`);
  return response.json();
}

try {
  docker('volume', 'create', volumeName); volumeCreated = true;
  docker('create', '--name', containerName, '--publish', '127.0.0.1::8787',
    '--mount', `type=volume,source=${volumeName},target=/data`,
    '--env', 'LLM_API_KEY=', '--env', 'LLM_MODEL=', image);
  containerCreated = true;
  docker('start', containerName);
  let url = `http://${docker('port', containerName, '8787/tcp')}`;
  report.health = await waitHealthy(url);
  assert.equal(report.health.ok, true);
  assert.equal(report.health.capabilities.planning, false);
  report.checks.push('actual container health with explicit unconfigured provider');
  const owner = await jsonRequest(url, '/api/rooms', { title: 'Container persistence', displayName: 'First', catalog: [
    { id: 'kyoto', name: 'Kyoto', kind: 'city', latitude: 35.0116, longitude: 135.7681 },
  ] });
  const joined = await jsonRequest(url, `/api/rooms/${owner.room.id}/actions`, {
    expectedRevision: 0, action: { type: 'participant.join', displayName: 'Second' },
  }, owner);
  const changed = await jsonRequest(url, `/api/rooms/${owner.room.id}/actions`, {
    expectedRevision: joined.room.revision, participantId: owner.participantId,
    action: { type: 'dream.add', destinationId: 'kyoto', note: 'Retain through a real container restart.' },
  }, owner);
  report.checks.push('two participants and a contributed destination persisted on the named volume');
  docker('restart', '--time', '10', containerName);
  url = `http://${docker('port', containerName, '8787/tcp')}`;
  await waitHealthy(url);
  const restored = await jsonRequest(url, `/api/rooms/${owner.room.id}`, null, owner);
  assert.deepEqual(restored.room, changed.room);
  report.checks.push('same authenticated room and revision recovered after container restart');
  report.persisted = { participantCount: restored.room.participants.length, wishCount: restored.room.dreams.length, revision: restored.room.revision };
  docker('exec', containerName, 'sh', '-c', 'test ! -e /run/secrets/proxy_ca');
  assert.equal(docker('exec', containerName, 'node', '-e', 'console.log(process.getuid())'), '1000');
  report.checks.push('non-root runtime and build-only proxy CA absent from container');
  report.imageId = docker('image', 'inspect', image, '--format', '{{.Id}}');
} catch (error) {
  if (containerCreated) {
    console.error(docker('logs', containerName));
    console.error(docker('inspect', containerName, '--format', '{{json .State}}'));
  }
  throw error;
} finally {
  if (containerCreated) docker('rm', '--force', containerName);
  if (volumeCreated) docker('volume', 'rm', volumeName);
}
report.cleanup = 'owned container and volume removed';
console.log(JSON.stringify(report, null, 2));
