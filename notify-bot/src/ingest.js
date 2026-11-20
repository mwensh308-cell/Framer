// The endpoint the phone posts to: POST /api/notifications with `Authorization: Bearer <DEVICE_TOKEN>`
// and one notification as JSON, or { "items": [...] } for several (the phone's queue after being offline).
import http from 'node:http';
import crypto from 'node:crypto';
import { normalize } from './store.js';

const MAX_BODY = 2_000_000;
const MAX_ITEMS = 1000;

function same(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function createIngest({ store, deviceToken, onStored = () => {} }) {
  if (!deviceToken || deviceToken.length < 16) throw new Error('DEVICE_TOKEN must be set to a secret of at least 16 characters.');
  return http.createServer(async (req, res) => {
    const send = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && url.pathname === '/health') return send(200, { ok: true });
    if (url.pathname !== '/api/notifications') return send(404, { error: 'not found' });
    if (req.method !== 'POST') return send(405, { error: 'POST only' });
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ') || !same(auth.slice(7), deviceToken)) return send(401, { error: 'unauthorized' });

    let body;
    try {
      body = JSON.parse(await read(req));
    } catch (e) {
      return send(400, { error: e.message === 'too large' ? 'body too large' : 'invalid JSON' });
    }
    const items = Array.isArray(body?.items) ? body.items.slice(0, MAX_ITEMS) : [body];
    let stored = 0;
    let skipped = 0;
    for (const raw of items) {
      const n = normalize(raw);
      const saved = n && store.add(n);
      if (!saved) {
        skipped += 1;
        continue;
      }
      stored += 1;
      try {
        await onStored(saved);
      } catch (e) {
        // Forwarding is best effort: the notification is already kept.
        console.error('forward:', e.message);
      }
    }
    return send(200, { stored, skipped });
  });
}

function read(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
