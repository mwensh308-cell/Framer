// Serves a built site's folder on loopback so it can be captured like the original.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

/** The file a request path maps to inside `dir`, or null when it would leave it. */
export function resolveInside(dir, urlPath) {
  let p;
  try {
    p = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  const file = path.resolve(dir, `.${path.posix.normalize(`/${p}`)}`);
  const rel = path.relative(dir, file);
  return rel.startsWith('..') || path.isAbsolute(rel) ? null : file;
}

export function serveDir(dir) {
  dir = path.resolve(dir);
  const server = http.createServer((req, res) => {
    let file = resolveInside(dir, req.url || '/');
    if (!file) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;
    // A single-page app answers every path with its start page.
    if (!fs.existsSync(file)) file = path.join(dir, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() }));
  });
}
