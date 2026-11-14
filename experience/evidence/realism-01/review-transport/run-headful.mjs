import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = '/workspace/TourGuideAI';
const temporary = resolve(root, 'artifacts/review-transport-tmp');
mkdirSync(temporary, { recursive: true });
const display = '127.0.0.1:91';
const authority = resolve(temporary, 'Xauthority');
const cookie = randomBytes(16).toString('hex');
const authentication = spawnSync('/usr/bin/xauth', ['-f', authority, 'add', display, 'MIT-MAGIC-COOKIE-1', cookie], { encoding: 'utf8' });
if (authentication.status !== 0) throw new Error(authentication.stderr);
const executable = resolve(root, 'artifacts/realism-01/review-transport/xvfb/root/usr/bin/Xvfb');
const arguments_ = [':91', '-nolock', '-nolisten', 'unix', '-listen', 'tcp', '-auth', authority, '-screen', '0', '1440x1000x24', '-noreset'];
const server = spawn(executable, arguments_, { cwd: root, env: { ...process.env, TMPDIR: temporary }, stdio: ['ignore', 'ignore', 'pipe'] });
let diagnostic = '';
server.stderr.on('data', bytes => { diagnostic += bytes; });
const env = { ...process.env, DISPLAY: display, XAUTHORITY: authority, TMPDIR: temporary, REVIEW_QA_HEADED: '1' };
const receipt = { startedAt: new Date().toISOString(), launcherSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'), executable, arguments: arguments_, display, authentication: 'Task-local MIT-MAGIC-COOKIE-1', unixSocketDisabled: true, lockFileDisabled: true };
let manager;
try {
  let ready = false;
  for (let index = 0; index < 100; index++) {
    if (server.exitCode !== null) throw new Error(`Xvfb exited ${server.exitCode}: ${diagnostic}`);
    const probe = spawnSync('/usr/bin/xdpyinfo', ['-display', display], { env, encoding: 'utf8' });
    if (probe.status === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  if (!ready) throw new Error('Authenticated Xvfb display did not become ready');
  const managerPath = resolve(root, 'artifacts/realism-01/review-transport/window-manager/root/usr/bin/twm');
  const managerArguments = ['-display', display, '-f', resolve(root, 'artifacts/realism-01/review-transport/window-manager/twmrc')];
  receipt.windowManager = { executable: managerPath, arguments: managerArguments };
  manager = spawn(managerPath, managerArguments, { cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'] });
  manager.stderr.on('data', bytes => { diagnostic += bytes; });
  await new Promise(resolve => setTimeout(resolve, 300));
  if (manager.exitCode !== null) throw new Error(`Window manager exited ${manager.exitCode}: ${diagnostic}`);
  const command = process.argv.slice(2);
  if (!command.length) throw new Error('Provide a Node script and its arguments');
  receipt.command = command;
  const child = spawn(process.execPath, command, { cwd: root, env, stdio: 'inherit' });
  const exitCode = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
  receipt.exitCode = exitCode;
  process.exitCode = exitCode;
} finally {
  manager?.kill('SIGTERM');
  server.kill('SIGTERM');
  receipt.finishedAt = new Date().toISOString();
  receipt.diagnostic = diagnostic;
  writeFileSync(resolve(root, `artifacts/realism-01/review-transport/qa/display-${Date.now()}.json`), JSON.stringify(receipt, null, 2) + '\n');
}
