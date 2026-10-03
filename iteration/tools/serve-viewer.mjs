// A minimal static server for the viewer, so the page can be tried over http as well as file://.
// It serves only the viewer directory and refuses everything else; no directory listing.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';

const ROOT = 'D:/All-Downloads/TourGuideAI/iteration/viewer';
const PORT = Number(process.argv[2] || 8088);
const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/' ) rel = '/index.html';
    const abs = normalize(join(ROOT, rel));
    if (!abs.startsWith(normalize(ROOT))) { res.writeHead(403).end('forbidden'); return; }
    const s = await stat(abs);
    if (!s.isFile()) { res.writeHead(404).end('not found'); return; }
    const body = await readFile(abs);
    res.writeHead(200, {
      'content-type': TYPES[extname(abs)] || 'application/octet-stream',
      'content-length': body.length,
      'cache-control': 'no-store',
    });
    res.end(body);
    console.log(`${new Date().toISOString()}  200  ${rel}  ${body.length} B`);
  } catch (e) {
    res.writeHead(404).end('not found');
    console.log(`${new Date().toISOString()}  404  ${req.url}`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('viewer served at:');
  console.log(`  http://127.0.0.1:${PORT}/           -> V-A (bare)`);
  console.log(`  http://127.0.0.1:${PORT}/#V-B       -> V-B (keymap)`);
  console.log(`root: ${ROOT}`);
  console.log('ctrl-c to stop');
});
