import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { localPagesConfig, PAGES_ORIGIN } from '../src/local-pages.js';

test('Pages local configuration retains a stable database and exact additional origins', () => {
  const config = localPagesConfig({});
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 8787);
  assert.equal(config.databasePath, fileURLToPath(new URL('../.data/rooms.sqlite', import.meta.url)));
  assert.ok(config.allowedOrigins.includes(PAGES_ORIGIN));
  assert.ok(config.allowedOrigins.includes('http://localhost:4185'));
  const custom = localPagesConfig({ ALLOWED_ORIGINS: 'https://demo.example', DATABASE_PATH: './custom.sqlite' });
  assert.deepEqual(custom.allowedOrigins, [PAGES_ORIGIN, 'https://demo.example']);
  assert.ok(custom.databasePath.endsWith('/custom.sqlite'));
  assert.throws(() => localPagesConfig({ ALLOWED_ORIGINS: 'https://paperstrange.github.io/TourGuideAI' }));
});

test('the actual local launcher accepts Pages preflight and recovers its room after process restart', { timeout: 15000 }, async t => {
  const base = new URL('../.data/tests/', import.meta.url);
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(new URL('pages-', base));
  let running;
  async function start() {
    const child = spawn(process.execPath, [fileURLToPath(new URL('../src/local-pages.js', import.meta.url))], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: '0', DATABASE_PATH: join(directory, 'rooms.sqlite'),
        ALLOWED_ORIGINS: 'https://another.example', LLM_API_KEY: '', LLM_MODEL: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const url = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', code => reject(new Error(`Local launcher exited before readiness: ${code}`)));
      child.stdout.on('data', chunk => {
        output += chunk;
        const address = output.match(/listening at (http:\/\/127\.0\.0\.1:\d+)/)?.[1];
        if (address) resolve(address);
      });
    });
    return { url, async close() { if (child.exitCode !== null) return; const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; } };
  }
  t.after(async () => { await running?.close(); await rm(directory, { recursive: true, force: true }); });
  running = await start();
  const preflight = await fetch(`${running.url}/api/rooms`, { method: 'OPTIONS', headers: {
    Origin: PAGES_ORIGIN, 'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization,x-participant-token,content-type',
  }, signal: AbortSignal.timeout(5000) });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), PAGES_ORIGIN);
  assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/);
  const createdResponse = await fetch(`${running.url}/api/rooms`, { method: 'POST', headers: { Origin: PAGES_ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Local persistence', displayName: 'Tester', catalog: [] }), signal: AbortSignal.timeout(5000) });
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  await running.close();
  running = await start();
  const restoredResponse = await fetch(`${running.url}/api/rooms/${created.room.id}`, {
    headers: { Origin: PAGES_ORIGIN, Authorization: `Bearer ${created.inviteToken}` }, signal: AbortSignal.timeout(5000),
  });
  assert.equal(restoredResponse.status, 200);
  assert.deepEqual((await restoredResponse.json()).room, created.room);
});
