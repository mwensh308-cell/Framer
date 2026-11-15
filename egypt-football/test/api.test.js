import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.DB_PATH = ':memory:';
process.env.ADMIN_PASSWORD = 'test-password-123';
process.env.SESSION_SECRET = 'test-secret';

const { app } = await import('../server/index.js');
const { parseFeed, ingest, pollSource } = await import('../server/news.js');
const { get } = await import('../server/db.js');

let server, base, cookie = '';
before(async () => { server = app.listen(0); await new Promise((r) => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());

const call = async (path, { method = 'GET', body, auth = true } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(auth && cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
};

test('public archive endpoints return seeded data', async () => {
  const stats = await call('/api/v1/stats');
  assert.equal(stats.body.afcon_titles, 7);
  assert.equal(stats.body.world_cups, 4);

  const salah = await call('/api/v1/players/mohamed-salah');
  assert.equal(salah.status, 200);
  assert.ok(salah.body.career.some((s) => s.club === 'Liverpool'));

  const ahly = await call('/api/v1/clubs/al-ahly');
  const cl = ahly.body.honours.find((h) => h.competition_slug === 'caf-champions-league');
  assert.equal(cl.count, 12);

  const search = await call('/api/v1/search?q=' + encodeURIComponent('الأهلي'));
  assert.equal(search.body.clubs[0].slug, 'al-ahly');

  assert.equal((await call('/api/v1/players/nobody')).status, 404);
});

test('admin requires sign-in and rejects bad passwords', async () => {
  assert.equal((await call('/api/admin/overview', { auth: false })).status, 401);
  assert.equal((await call('/api/admin/login', { method: 'POST', body: { email: 'admin@example.com', password: 'wrong-password' } })).status, 401);
  const ok = await call('/api/admin/login', { method: 'POST', body: { email: 'admin@example.com', password: 'test-password-123' } });
  assert.equal(ok.status, 200);
  cookie = ok.headers.get('set-cookie').split(';')[0];
  assert.match(ok.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
});

test('editor can create and publish content; only admins can delete', async () => {
  const created = await call('/api/admin/players', { method: 'POST', body: { slug: 'test-player', name_en: 'Test Player', position: 'MF', status: 'draft', password_hash: 'ignored' } });
  assert.equal(created.status, 201);
  assert.equal((await call('/api/v1/players/test-player')).status, 404, 'drafts stay private');

  await call(`/api/admin/players/${created.body.id}`, { method: 'PUT', body: { status: 'published' } });
  assert.equal((await call('/api/v1/players/test-player')).status, 200);

  await call('/api/admin/users', { method: 'POST', body: { email: 'ed@example.com', name: 'Ed', role: 'editor', password: 'editor-pass-1' } });
  const adminCookie = cookie;
  const login = await call('/api/admin/login', { method: 'POST', body: { email: 'ed@example.com', password: 'editor-pass-1' } });
  cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await call(`/api/admin/players/${created.body.id}`, { method: 'DELETE' })).status, 403);
  assert.equal((await call('/api/admin/users')).status, 403);
  cookie = adminCookie;
  assert.equal((await call(`/api/admin/players/${created.body.id}`, { method: 'DELETE' })).status, 204);

  const log = await call('/api/admin/audit');
  assert.ok(log.body.some((a) => a.action === 'delete' && a.entity === 'players'));
});

test('admin writes must be JSON (CSRF guard)', async () => {
  const res = await fetch(base + '/api/admin/players', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'name_en=x' });
  assert.equal(res.status, 415);
});

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title>
  <item><title>Salah scores twice as Egypt win</title><link>https://example.com/a?utm=1</link><description>&lt;p&gt;Report&lt;/p&gt;</description><pubDate>Sun, 15 Nov 2026 10:00:00 GMT</pubDate></item>
  <item><title>Unrelated tennis story</title><link>https://example.com/b</link><pubDate>Sun, 15 Nov 2026 09:00:00 GMT</pubDate></item>
</channel></rss>`;

test('feed parser filters by keyword and dedupes', () => {
  const items = parseFeed(RSS);
  assert.equal(items.length, 2);
  assert.equal(items[0].excerpt, 'Report');
  const source = get('SELECT * FROM news_sources LIMIT 1');
  assert.equal(ingest(source, items).length, 1, 'only the Egypt story matches');
  assert.equal(ingest(source, parseFeed(RSS.replace('?utm=1', ''))).length, 0, 'same URL is not inserted twice');
});

test('polling pushes new items to the live stream', async () => {
  const ctrl = new AbortController();
  const stream = await fetch(base + '/api/v1/news-stream', { signal: ctrl.signal });
  const reader = stream.body.getReader();
  const source = get('SELECT * FROM news_sources LIMIT 1 OFFSET 1');
  const feed = RSS.replace('https://example.com/a?utm=1', 'https://example.com/live').replace('Salah scores twice', 'Marmoush hat-trick');
  const result = await pollSource(source, { fetchImpl: async () => new Response(feed, { headers: { etag: '"v1"' } }) });
  assert.equal(result.inserted, 1);

  let buf = '';
  while (!buf.includes('event: news')) buf += new TextDecoder().decode((await reader.read()).value);
  assert.match(buf, /Marmoush hat-trick/);
  ctrl.abort();

  const notModified = await pollSource(get('SELECT * FROM news_sources WHERE id = ?', source.id), {
    fetchImpl: async (url, opts) => { assert.equal(opts.headers['If-None-Match'], '"v1"'); return new Response(null, { status: 304 }); },
  });
  assert.equal(notModified.status, 'not-modified');
});
