import express, { Router } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { all, get, run, audit, ENTITIES, UPLOAD_DIR } from '../db.js';
import { requireRole, verifyPassword, hashPassword, issueToken, sessionCookie } from '../auth.js';
import { newsBus, pollSource, pollDue, NEWS_SELECT } from '../news.js';

export const adminApi = Router();

// ---- Auth -------------------------------------------------------------------------------

const attempts = new Map(); // naive per-IP login throttle; swap for Redis in production
adminApi.post('/login', (req, res) => {
  const key = req.ip;
  const a = attempts.get(key) || { n: 0, until: 0 };
  if (a.until > Date.now()) return res.status(429).json({ error: 'Too many attempts, try again in a minute' });

  const { email, password } = req.body || {};
  const user = get('SELECT * FROM users WHERE email = ? AND active = 1', String(email || '').toLowerCase());
  if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
    a.n += 1;
    if (a.n >= 5) Object.assign(a, { n: 0, until: Date.now() + 60_000 });
    attempts.set(key, a);
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  attempts.delete(key);
  run(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?`, user.id);
  audit(user.id, 'login', 'users', user.id, user.email);
  res.set('Set-Cookie', sessionCookie(issueToken(user)));
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

adminApi.post('/logout', (req, res) => {
  res.set('Set-Cookie', sessionCookie('', 0));
  res.json({ ok: true });
});

adminApi.get('/me', requireRole('viewer'), (req, res) => res.json(req.user));

// ---- Overview / monitoring ----------------------------------------------------------------

adminApi.get('/overview', requireRole('viewer'), (req, res) => {
  const count = (t, w = '') => get(`SELECT COUNT(*) c FROM ${t} ${w}`).c;
  res.json({
    counts: {
      players: count('players'), clubs: count('clubs'), titles: count('titles'),
      news: count('news'), news_today: count('news', "WHERE published_at >= date('now')"),
      drafts: count('players', "WHERE status='draft'") + count('clubs', "WHERE status='draft'") + count('news', "WHERE status='draft'"),
      users: count('users'),
    },
    sources: all('SELECT id, name, enabled, poll_minutes, last_polled_at, last_status, last_error, items_ingested FROM news_sources ORDER BY name'),
    activity: all(`SELECT a.id, a.action, a.entity, a.entity_id, a.summary, a.created_at, u.name AS user
      FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 15`),
    news_per_day: all(`SELECT date(published_at) AS day, COUNT(*) AS n FROM news
      WHERE published_at >= date('now','-13 days') GROUP BY day ORDER BY day`),
  });
});

adminApi.get('/audit', requireRole('viewer'), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  res.json(all(`SELECT a.*, u.name AS user FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.id DESC LIMIT ?`, limit));
});

// ---- News operations ----------------------------------------------------------------------

adminApi.post('/news_sources/:id/poll', requireRole('editor'), async (req, res) => {
  const source = get('SELECT * FROM news_sources WHERE id = ?', req.params.id);
  if (!source) return res.status(404).json({ error: 'Not found' });
  res.json(await pollSource(source));
});

adminApi.post('/news/poll-all', requireRole('editor'), async (req, res) => res.json(await pollDue({ force: true })));

// ---- Logo / image uploads ----------------------------------------------------------------
// Raw image body (Content-Type: image/*). Files are content-addressed, so re-uploading the same
// logo returns the same URL. The file signature must match the declared type.

const IMAGE_TYPES = {
  'image/png': ['png', (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))],
  'image/jpeg': ['jpg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  'image/webp': ['webp', (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP'],
  'image/svg+xml': ['svg', (b) => /<svg[\s>]/i.test(b.subarray(0, 2048).toString())],
};

adminApi.post('/uploads', requireRole('editor'), express.raw({ type: Object.keys(IMAGE_TYPES), limit: '2mb' }), (req, res) => {
  const type = String(req.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const spec = IMAGE_TYPES[type];
  if (!spec || !Buffer.isBuffer(req.body) || !req.body.length) {
    return res.status(415).json({ error: 'Upload a PNG, JPEG, WebP or SVG image (max 2 MB)' });
  }
  const [ext, looksRight] = spec;
  if (!looksRight(req.body)) return res.status(400).json({ error: 'File content does not match its image type' });
  const name = `${createHash('sha256').update(req.body).digest('hex').slice(0, 24)}.${ext}`;
  mkdirSync(UPLOAD_DIR, { recursive: true });
  writeFileSync(join(UPLOAD_DIR, name), req.body);
  audit(req.user.id, 'create', 'uploads', null, name);
  res.status(201).json({ url: `/uploads/${name}` });
});

// ---- Users (admin only) -------------------------------------------------------------------

const USER_FIELDS = 'id, email, name, role, active, last_login_at, created_at';

adminApi.get('/users', requireRole('admin'), (req, res) => res.json(all(`SELECT ${USER_FIELDS} FROM users ORDER BY id`)));

adminApi.post('/users', requireRole('admin'), (req, res) => {
  const { email, name, role = 'editor', password } = req.body || {};
  if (!email || !name || !password || password.length < 10) {
    return res.status(400).json({ error: 'email, name and a password of at least 10 characters are required' });
  }
  try {
    const r = run('INSERT INTO users (email, name, role, password_hash) VALUES (?,?,?,?)',
      email.toLowerCase(), name, role, hashPassword(password));
    audit(req.user.id, 'create', 'users', r.lastInsertRowid, `${email} (${role})`);
    res.status(201).json(get(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, r.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ error: e.message.includes('UNIQUE') ? 'Email already in use' : e.message });
  }
});

adminApi.put('/users/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  const { name, role, active, password } = req.body || {};
  if (id === req.user.id && (role && role !== 'admin' || active === 0 || active === false)) {
    return res.status(400).json({ error: 'You cannot demote or deactivate your own account' });
  }
  const user = get('SELECT * FROM users WHERE id = ?', id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  run('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?',
    name ?? user.name, role ?? user.role, active === undefined ? user.active : Number(Boolean(active)), id);
  if (password) {
    if (password.length < 10) return res.status(400).json({ error: 'Password must be at least 10 characters' });
    run('UPDATE users SET password_hash = ? WHERE id = ?', hashPassword(password), id);
  }
  audit(req.user.id, 'update', 'users', id, user.email);
  res.json(get(`SELECT ${USER_FIELDS} FROM users WHERE id = ?`, id));
});

adminApi.delete('/users/:id', requireRole('admin'), (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  const user = get('SELECT email FROM users WHERE id = ?', id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  run('UPDATE news SET author_id = NULL WHERE author_id = ?', id);
  run('UPDATE audit_log SET user_id = NULL WHERE user_id = ?', id);
  run('DELETE FROM users WHERE id = ?', id);
  audit(req.user.id, 'delete', 'users', id, user.email);
  res.status(204).end();
});

// ---- Generic content CRUD for every entity in ENTITIES -------------------------------------

function entityOr404(req, res) {
  const e = ENTITIES[req.params.entity];
  if (!e) res.status(404).json({ error: `Unknown entity "${req.params.entity}"` });
  return e;
}

/** Keeps only allow-listed columns; empty strings become NULL. */
function pick(e, body = {}) {
  const out = {};
  for (const c of e.columns) if (c in body) out[c] = body[c] === '' ? null : body[c];
  return out;
}

const label = (row) => row?.name_en || row?.title_en || row?.title || row?.name || row?.season || `#${row?.id}`;

adminApi.get('/:entity', requireRole('viewer'), (req, res) => {
  const e = entityOr404(req, res); if (!e) return;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = (Math.max(parseInt(req.query.page, 10) || 1, 1) - 1) * limit;
  const where = [], params = [];
  if (req.query.q) { where.push('(' + e.search.map((c) => `${c} LIKE ?`).join(' OR ') + ')'); params.push(...e.search.map(() => `%${req.query.q}%`)); }
  if (req.query.status && e.columns.includes('status')) { where.push('status = ?'); params.push(req.query.status); }
  for (const fk of ['player_id', 'club_id', 'competition_id', 'team_id']) {
    if (req.query[fk] && e.columns.includes(fk)) { where.push(`${fk} = ?`); params.push(req.query[fk]); }
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  res.json({
    total: get(`SELECT COUNT(*) c FROM ${e.table} ${w}`, ...params).c,
    items: all(`SELECT * FROM ${e.table} ${w} ORDER BY ${e.order} LIMIT ? OFFSET ?`, ...params, limit, offset),
  });
});

adminApi.get('/:entity/:id', requireRole('viewer'), (req, res) => {
  const e = entityOr404(req, res); if (!e) return;
  const row = get(`SELECT * FROM ${e.table} WHERE id = ?`, req.params.id);
  return row ? res.json(row) : res.status(404).json({ error: 'Not found' });
});

adminApi.post('/:entity', requireRole('editor'), (req, res) => {
  const e = entityOr404(req, res); if (!e) return;
  const data = pick(e, req.body);
  if (e.table === 'news') {
    // In-house article: synthesise a dedupe hash and default to now.
    data.published_at ??= new Date().toISOString();
    data.guid_hash = createHash('sha1').update(`local:${randomBytes(8).toString('hex')}`).digest('hex');
    data.author_id = req.user.id;
  }
  const cols = Object.keys(data);
  if (!cols.length) return res.status(400).json({ error: 'No valid fields supplied' });
  try {
    const r = run(`INSERT INTO ${e.table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, ...Object.values(data));
    const row = get(`SELECT * FROM ${e.table} WHERE id = ?`, r.lastInsertRowid);
    audit(req.user.id, 'create', e.table, row.id, label(row));
    if (e.table === 'news') newsBus.emit('news', get(`${NEWS_SELECT} WHERE n.id = ?`, row.id));
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

adminApi.put('/:entity/:id', requireRole('editor'), (req, res) => {
  const e = entityOr404(req, res); if (!e) return;
  const before = get(`SELECT * FROM ${e.table} WHERE id = ?`, req.params.id);
  if (!before) return res.status(404).json({ error: 'Not found' });
  const data = pick(e, req.body);
  const cols = Object.keys(data);
  if (!cols.length) return res.status(400).json({ error: 'No valid fields supplied' });
  const touch = 'updated_at' in before ? ", updated_at = datetime('now')" : '';
  try {
    run(`UPDATE ${e.table} SET ${cols.map((c) => `${c} = ?`).join(', ')}${touch} WHERE id = ?`, ...Object.values(data), before.id);
    const row = get(`SELECT * FROM ${e.table} WHERE id = ?`, before.id);
    const changed = cols.filter((c) => String(before[c] ?? '') !== String(row[c] ?? ''));
    audit(req.user.id, 'update', e.table, row.id, `${label(row)}${changed.length ? ` (${changed.join(', ')})` : ''}`);
    if (e.table === 'news' && before.status !== 'published' && row.status === 'published') {
      newsBus.emit('news', get(`${NEWS_SELECT} WHERE n.id = ?`, row.id));
    }
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

adminApi.delete('/:entity/:id', requireRole('admin'), (req, res) => {
  const e = entityOr404(req, res); if (!e) return;
  const row = get(`SELECT * FROM ${e.table} WHERE id = ?`, req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  try {
    run(`DELETE FROM ${e.table} WHERE id = ?`, row.id);
  } catch (err) {
    return res.status(409).json({ error: `Cannot delete: other records reference it (${err.message})` });
  }
  audit(req.user.id, 'delete', e.table, row.id, label(row));
  res.status(204).end();
});
