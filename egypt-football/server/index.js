import express from 'express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get, UPLOAD_DIR } from './db.js';
import { publicApi } from './routes/public.js';
import { adminApi } from './routes/admin.js';
import { startScheduler } from './news.js';
import { seed } from './seed.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;

if (!get('SELECT COUNT(*) c FROM clubs').c) seed();

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' https: data:; media-src 'self' https://d8j0ntlcm91z4.cloudfront.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'",
  });
  next();
});
app.use(express.json({ limit: '1mb' }));

// Admin writes must be JSON: with SameSite=Strict cookies this blocks cross-site form CSRF.
app.use('/api/admin', (req, res, next) => {
  const imageUpload = req.path === '/uploads' && req.is('image/*'); // forms cannot send image/* cross-site
  if (req.method !== 'GET' && req.method !== 'DELETE' && !req.is('application/json') && !imageUpload) {
    return res.status(415).json({ error: 'Content-Type must be application/json' });
  }
  next();
});

app.use('/api/v1', publicApi);
app.use('/api/admin', adminApi);
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Uploaded logos: long-cached, and sandboxed so an SVG opened directly can never run script.
app.use('/uploads', (req, res, next) => {
  res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  next();
}, express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true, fallthrough: false }));
app.use('/admin', express.static(join(root, 'admin'), { maxAge: '5m' }));
// Public site: the Vite build of web/ (run `npm run build`). Hashed assets are cached for a year.
const site = join(root, 'web', 'dist');
app.use('/assets', express.static(join(site, 'assets'), { maxAge: '1y', immutable: true }));
app.use(express.static(site, { maxAge: '5m', index: false }));
// SPA fallbacks
app.get(/^\/admin(\/.*)?$/, (req, res) => res.sendFile(join(root, 'admin', 'index.html')));
app.get(/^\/(?!api\/|uploads\/).*/, (req, res, next) => res.sendFile(join(site, 'index.html'), (err) => err && next(Object.assign(new Error('Site not built: run npm run build'), { status: 503 }))));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`Pharaohs' Archive on http://localhost:${PORT}  (admin: /admin)`);
    if (process.env.NEWS_POLLING !== 'off') startScheduler();
  });
}
