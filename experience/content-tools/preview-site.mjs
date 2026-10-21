import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';

const toolsDirectory = dirname(fileURLToPath(import.meta.url));
const experienceDirectory = resolve(toolsDirectory, '..');
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream' };

function inside(root, path) {
  const suffix = relative(root, path);
  return suffix === '' || (!isAbsolute(suffix) && suffix !== '..' && !suffix.startsWith(`..${sep}`));
}

function safeParts(path) {
  if (path.includes('\\') || path.includes('\0')) throw new Error('Invalid path');
  const parts = path.split('/').filter(Boolean);
  if (parts.some(part => part === '.' || part === '..')) throw new Error('Invalid path');
  return parts;
}

async function restrictedFile(root, filename) {
  const parts = safeParts(filename);
  const requested = resolve(root, ...parts);
  if (!inside(root, requested)) throw new Error('Path outside permitted directory');
  const canonical = await realpath(requested);
  if (!inside(root, canonical)) throw new Error('Symbolic link outside permitted directory');
  if (!(await stat(canonical)).isFile()) throw new Error('Regular file required');
  return canonical;
}

function validateManifest(manifest) {
  if (manifest.schemaVersion !== 1 || !/^[a-z0-9][a-z0-9_-]*$/i.test(manifest.id || '')) throw new Error('Invalid site manifest identity');
  if (manifest.representation !== 'geographic-context' || manifest.navigation !== 'unreviewed') throw new Error('Geographic context with unreviewed navigation required');
  if (!manifest.model || !/^[a-f0-9]{64}$/i.test(manifest.model.sha256 || '') || !Number.isSafeInteger(manifest.model.bytes) || manifest.model.bytes <= 0) throw new Error('Model hash and byte length required');
  if (typeof manifest.model.file !== 'string' || !manifest.model.file.endsWith('.glb') || isAbsolute(manifest.model.file)) throw new Error('Relative GLB file required');
  safeParts(manifest.model.file);
}

export async function readSiteBundle(root) {
  const buffers = await Promise.all(['manifest.json','context.json','review.json'].map(async file => readFile(await restrictedFile(root,file))));
  const manifest = JSON.parse(buffers[0]);
  validateManifest(manifest);
  if (!/^[a-f0-9]{64}$/i.test(manifest.contextSha256 || '') || createHash('sha256').update(buffers[1]).digest('hex') !== manifest.contextSha256.toLowerCase()) throw new Error('Context SHA-256 does not match the manifest');
  const context = JSON.parse(buffers[1]), review = JSON.parse(buffers[2]);
  if (context.id !== manifest.id || review.siteId !== manifest.id) throw new Error('Site metadata identity does not match');
  for (const record of [manifest,context,review]) {
    if (record.representation !== 'geographic-context' || record.navigation !== 'unreviewed') throw new Error('Site review status does not match');
    if (!/^[a-f0-9]{64}$/i.test(record.configSha256 || '') || record.configSha256 !== manifest.configSha256) throw new Error('Site configuration SHA-256 does not match');
    if (!/^[a-f0-9]{64}$/i.test(record.source?.sha256 || '') || record.source.sha256 !== manifest.source?.sha256) throw new Error('Site source SHA-256 does not match');
  }
  return {manifest,context,review};
}

export async function startWorkbenchServer({ directories, port = 4197 }) {
  if (!Array.isArray(directories) || directories.length === 0) throw new Error('Provide at least one site output directory');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
  const viewerRoot = await realpath(resolve(toolsDirectory, 'viewer'));
  const vendorRoot = await realpath(resolve(experienceDirectory, 'node_modules/three'));
  const lightingRoot = await realpath(resolve(experienceDirectory, 'public/lighting'));
  const sites = new Map();
  for (const directory of directories) {
    const root = await realpath(resolve(directory));
    const {manifest} = await readSiteBundle(root);
    if (sites.has(manifest.id)) throw new Error(`Duplicate site ID: ${manifest.id}`);
    await restrictedFile(root, 'context.json');
    await restrictedFile(root, 'review.json');
    await restrictedFile(root, manifest.model.file);
    sites.set(manifest.id, { root, manifest });
  }

  const securityHeaders = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  };
  const server = createServer(async (request, response) => {
    let status = 404;
    try {
      const localPort = server.address().port;
      const permittedHosts = [`127.0.0.1:${localPort}`, `localhost:${localPort}`];
      if (!permittedHosts.includes(request.headers.host) || (request.headers.origin && !permittedHosts.some(host => request.headers.origin === `http://${host}`))) {
        status = 403;
        throw new Error('Local origin required');
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        status = 405;
        throw new Error('Read-only server');
      }
      const pathname = decodeURIComponent(request.url.split('?')[0]);
      const parts = safeParts(pathname);
      if (pathname === '/api/sites') {
        const body = JSON.stringify({ sites: [...sites.values()].map(({ manifest }) => ({ id: manifest.id, title: manifest.title, representation: manifest.representation, navigation: manifest.navigation })) });
        response.writeHead(200, { ...securityHeaders, 'Content-Type': mimeTypes['.json'] });
        response.end(request.method === 'HEAD' ? undefined : body);
        return;
      }
      let root;
      let filename;
      if (pathname === '/' || pathname === '/index.html') {
        root = viewerRoot;
        filename = 'index.html';
      } else if (['/main.js', '/style.css'].includes(pathname)) {
        root = viewerRoot;
        filename = parts[0];
      } else if (parts[0] === 'vendor' && parts[1] === 'three' && ['build', 'examples'].includes(parts[2]) && pathname.endsWith('.js')) {
        root = vendorRoot;
        filename = parts.slice(2).join('/');
      } else if (parts[0] === 'lighting' && ['resources.json', 'environments/day-1k.hdr', 'environments/night-1k.hdr'].includes(parts.slice(1).join('/'))) {
        root = lightingRoot;
        filename = parts.slice(1).join('/');
      } else if (parts[0] === 'sites' && sites.has(parts[1])) {
        const site = sites.get(parts[1]);
        filename = parts.slice(2).join('/');
        if (!['manifest.json', 'context.json', 'review.json', site.manifest.model.file].includes(filename)) throw new Error('File is not exposed');
        root = site.root;
        const current = await readSiteBundle(root);
        if (current.manifest.id !== site.manifest.id || current.manifest.model.file !== site.manifest.model.file) throw new Error('Site export identity changed; restart the workbench');
      } else {
        throw new Error('File is not exposed');
      }
      const file = await restrictedFile(root, filename);
      const body = await readFile(file);
      response.writeHead(200, { ...securityHeaders, 'Content-Type': mimeTypes[extname(file)] || 'application/octet-stream', 'Content-Length': body.length });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      response.writeHead(status, { ...securityHeaders, 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : `${error.message}\n`);
    }
  });
  await new Promise((resolveListening, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolveListening);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolveClosed, reject) => {
      server.close(error => error ? reject(error) : resolveClosed());
      server.closeAllConnections();
    }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values, positionals } = parseArgs({ options: { port: { type: 'string', default: '4197' }, help: { type: 'boolean', short: 'h' } }, allowPositionals: true });
  if (values.help) {
    console.log('node experience/content-tools/preview-site.mjs [--port 4197] <site-output-directory>...');
  } else {
    const service = await startWorkbenchServer({ directories: positionals, port: Number(values.port) });
    console.log(`Site workbench: ${service.url}`);
    process.once('SIGINT', async () => { await service.close(); });
    process.once('SIGTERM', async () => { await service.close(); });
  }
}
