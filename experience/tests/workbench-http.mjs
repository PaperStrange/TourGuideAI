import assert from 'node:assert/strict';
import { request } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, copyFile, symlink, rm, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { startWorkbenchServer, readSiteBundle } from '../content-tools/preview-site.mjs';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { values, positionals } = parseArgs({ options: { output: { type: 'string' }, help: { type: 'boolean', short: 'h' } }, allowPositionals: true });
const usage = 'node experience/tests/workbench-http.mjs [--output report.json] <actual-site-directory> <another-actual-site-directory>...';
if (values.help) { console.log(usage); process.exit(0); }
if (positionals.length < 2) throw new Error(`At least two distinct generated sites are required.\n${usage}`);
const directories = positionals.map(path => resolve(path));
const output = resolve(values.output || resolve(repository, 'artifacts/workbench-http/result.json'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { startedAt: new Date().toISOString(), checks: [], sites: [], server: '127.0.0.1',
  scope: 'Actual generated asset HTTP, coherent metadata, read-only routes and traversal/origin/symlink restrictions; no browser rendering evidence',
  driverSha256: hash(await readFile(fileURLToPath(import.meta.url))),
  serverSha256: hash(await readFile(new URL('../content-tools/preview-site.mjs', import.meta.url))) };
await mkdir(dirname(output), { recursive: true });
await mkdir(resolve(repository, 'artifacts'), { recursive: true });
const scratch = await mkdtemp(resolve(repository, 'artifacts/workbench-http-'));
let service, endpoint;

function check(condition, label) {
  assert.ok(condition, label);
  report.checks.push({ label, passed: true });
}

async function rejects(action, expected, label) {
  await assert.rejects(async () => {
    const unexpected = await action;
    await unexpected?.close?.();
  }, expected);
  report.checks.push({ label, passed: true });
}

async function send(path, options = {}) {
  return new Promise((resolveResponse, reject) => {
    const req = request({ hostname: endpoint.hostname, port: endpoint.port, path,
      method: options.method || 'GET', headers: options.headers || {} }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => resolveResponse({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    req.setTimeout(10000, () => req.destroy(new Error(`Local HTTP timeout: ${path}`)));
    req.on('error', reject); req.end();
  });
}

try {
  service = await startWorkbenchServer({ directories, port: 0 });
  endpoint = new URL(service.url);
  const listing = await send('/api/sites');
  check(listing.status === 200, 'site listing');
  const sites = JSON.parse(listing.body).sites;
  check(sites.length === directories.length, 'all supplied actual sites listed');
  const firstId = sites[0].id;
  for (const site of sites) {
    const manifest = JSON.parse((await send(`/sites/${site.id}/manifest.json`)).body);
    const model = await send(`/sites/${site.id}/${manifest.model.file}`);
    check(model.status === 200, `${site.id}: actual model HTTP`);
    check(model.body.length === manifest.model.bytes, `${site.id}: actual model byte length`);
    check(hash(model.body) === manifest.model.sha256, `${site.id}: actual model SHA-256`);
    check((await send(`/sites/${site.id}/context.json`)).status === 200, `${site.id}: actual context`);
    check((await send(`/sites/${site.id}/review.json`)).status === 200, `${site.id}: actual review`);
    report.sites.push({ id: site.id, modelSha256: manifest.model.sha256, contextSha256: manifest.contextSha256,
      configSha256: manifest.configSha256, sourceSha256: manifest.source.sha256 });
  }
  for (const path of ['/', '/main.js', '/style.css', '/vendor/three/build/three.module.js',
    '/vendor/three/build/three.core.js', '/vendor/three/examples/jsm/loaders/GLTFLoader.js',
    '/lighting/resources.json', '/lighting/environments/day-1k.hdr', '/lighting/environments/night-1k.hdr']) {
    check((await send(path)).status === 200, `allowed ${path}`);
  }
  for (const path of ['/package.json', '/../experience/package.json', '/%2e%2e/experience/package.json',
    `/sites/${firstId}/../../package.json`, `/sites/${firstId}/%2e%2e/context.json`, `/sites/${firstId}/site.blend`,
    '/vendor/three/package.json', '/lighting/rig.json', '/%00', `/sites/${firstId}/%5c..%5cscene.glb`]) {
    check((await send(path)).status === 404, `denied ${path}`);
  }
  check((await send('/', { method: 'POST' })).status === 405, 'writes denied');
  check((await send('/', { headers: { Host: 'outside.example' } })).status === 403, 'foreign Host denied');
  check((await send('/', { headers: { Origin: 'https://outside.example' } })).status === 403, 'foreign Origin denied');
  const head = await send('/', { method: 'HEAD' });
  check(head.status === 200 && head.body.length === 0, 'HEAD has no body');
  await rejects(startWorkbenchServer({ directories: [directories[0], directories[0]], port: 0 }), /Duplicate site ID/, 'duplicate site rejected');

  // 负例只重组真实导出文件，不伪造地理数据或 HTTP 服务。
  const symlinkDirectory = resolve(scratch, 'symlink');
  await mkdir(symlinkDirectory);
  await symlink(resolve(directories[0], 'manifest.json'), resolve(symlinkDirectory, 'manifest.json'));
  await rejects(startWorkbenchServer({ directories: [symlinkDirectory], port: 0 }), /Symbolic link outside/, 'escaping symlink rejected');
  const mismatchDirectory = resolve(scratch, 'coherence');
  await mkdir(mismatchDirectory);
  for (const file of ['manifest.json', 'context.json', 'review.json']) {
    await copyFile(resolve(directories[0], file), resolve(mismatchDirectory, file));
  }
  check((await readSiteBundle(mismatchDirectory)).manifest.id === firstId, 'copied actual export metadata agrees');
  await copyFile(resolve(directories[1], 'context.json'), resolve(mismatchDirectory, 'context.json'));
  await rejects(readSiteBundle(mismatchDirectory), /Context SHA-256/, 'mixed actual context rejected');
  await copyFile(resolve(directories[0], 'context.json'), resolve(mismatchDirectory, 'context.json'));
  await copyFile(resolve(directories[1], 'review.json'), resolve(mismatchDirectory, 'review.json'));
  await rejects(readSiteBundle(mismatchDirectory), /Site metadata identity/, 'mixed actual review rejected');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack; throw error;
} finally {
  try { await service?.close(); }
  finally {
    await rm(scratch, { recursive: true, force: true });
    report.finishedAt = new Date().toISOString(); report.passed = report.checks.length;
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ status: report.status, passed: report.passed, sites: report.sites.map(site => site.id), output }));
  }
}
