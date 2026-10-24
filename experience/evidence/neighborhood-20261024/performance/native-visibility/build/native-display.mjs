import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { access, mkdir, open, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const executable = path.join(root, 'build/hw/vfb/Xvfb');
const expectedSha256 = '9ffcf7961c43aea2a920a340b1d95064d7b359b9e41af6f4ddbd9aea711e6172';

export async function startNativeDisplay({ name, display = 91, screen = '1440x1000x24' }) {
  if (!/^[a-z0-9-]+$/.test(name) || !Number.isInteger(display) || display < 1 || display > 999
    || !/^\d+x\d+x24$/.test(screen)) throw new Error('Invalid native display identity');
  if (createHash('sha256').update(await readFile(executable)).digest('hex') !== expectedSha256)
    throw new Error('Xvfb binary differs from the recorded build');
  await access(path.join(root, 'runtime/xkb'), constants.W_OK | constants.X_OK);
  const directory = path.join(root, 'runtime', name);
  await mkdir(directory, { recursive: false });
  for (const child of ['cache', 'config', 'run']) await mkdir(path.join(directory, child), { mode: 0o700 });
  // Chromium 的内部 Unix socket 需要较短路径；显示编号保证该临时目录由本次运行独占。
  const temporary = path.join(path.dirname(root), 'x' + display);
  await mkdir(temporary, { mode: 0o700 });
  const authority = path.join(directory, 'Xauthority');
  await writeFile(authority, '', { mode: 0o600, flag: 'wx' });
  const clientEnv = { ...process.env, DISPLAY: `127.0.0.1:${display}`, XAUTHORITY: authority,
    TMPDIR: temporary, XDG_CACHE_HOME: path.join(directory, 'cache'),
    XDG_CONFIG_HOME: path.join(directory, 'config'), XDG_RUNTIME_DIR: path.join(directory, 'run') };
  // Cookie 仅通过标准输入交给 xauth，证据文件只记录授权文件路径。
  const authorization = spawnSync('/usr/bin/xauth', ['-f', authority], { env: clientEnv, cwd: directory,
    input: `add ${clientEnv.DISPLAY} MIT-MAGIC-COOKIE-1 ${randomBytes(16).toString('hex')}\nexit\n`, encoding: 'utf8' });
  if (authorization.error) throw authorization.error;
  if (authorization.status !== 0) throw new Error(`xauth failed: ${authorization.stderr}`);
  const args = [`:${display}`, '-screen', '0', screen, '-nolisten', 'unix', '-nolisten', 'local',
    '-listen', 'tcp', '-auth', authority, '-displayfd', '3', '-noreset'];
  const log = await open(path.join(directory, 'xvfb.log'), 'wx', 0o600);
  const server = spawn(executable, args, { cwd: directory,
    env: { ...clientEnv, LD_LIBRARY_PATH: path.join(root, 'deps/usr/lib/x86_64-linux-gnu')
      + (process.env.LD_LIBRARY_PATH ? ':' + process.env.LD_LIBRARY_PATH : ''),
    LIBGL_DRIVERS_PATH: '/usr/lib/x86_64-linux-gnu/dri',
    MESA_SHADER_CACHE_DIR: path.join(directory, 'cache') }, stdio: ['ignore', log.fd, log.fd, 'pipe'] });
  const exited = new Promise(resolve => { server.once('exit', (code, signal) => resolve({ code, signal }));
    server.once('error', error => resolve({ error: error.message })); });
  let closed = false;
  async function close() {
    if (closed) return;
    closed = true;
    server.kill('SIGTERM');
    const force = setTimeout(() => server.kill('SIGKILL'), 5000);
    try { await exited; } finally { clearTimeout(force); await log.close(); }
  }
  try {
    await new Promise((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error('Xvfb readiness timed out')), 15000);
      let response = '';
      const fail = error => { clearTimeout(deadline); reject(error); };
      server.once('error', fail);
      server.once('exit', () => fail(new Error('Xvfb exited before readiness')));
      server.stdio[3].setEncoding('utf8');
      server.stdio[3].on('data', data => {
        response += data;
        if (response.includes('\n')) {
          clearTimeout(deadline);
          if (response.trim() === String(display)) resolve();
          else reject(new Error('Xvfb announced an unexpected display'));
        }
      });
    });
    const manifest = { startedAt: new Date().toISOString(), pid: server.pid, executable,
      executableSha256: expectedSha256, args, display: clientEnv.DISPLAY, screen, directory,
      paths: { authority, xkbOutput: path.join(root, 'runtime/xkb'), temp: clientEnv.TMPDIR,
        cache: clientEnv.XDG_CACHE_HOME, config: clientEnv.XDG_CONFIG_HOME, runtime: clientEnv.XDG_RUNTIME_DIR,
        serverLibraries: path.join(root, 'deps/usr/lib/x86_64-linux-gnu'), serverDriDrivers: '/usr/lib/x86_64-linux-gnu/dri' },
      scope: 'Native X11 visibility verification; MIT-SHM disabled, GLX retained. Physical GPU and ordinary-configuration performance unverified.' };
    await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    return { env: clientEnv, manifest, close };
  } catch (error) { await close(); throw error; }
}
