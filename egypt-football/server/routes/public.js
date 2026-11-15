import { Router } from 'express';
import { all, get } from '../db.js';
import { newsBus, NEWS_SELECT } from '../news.js';

export const publicApi = Router();

const PUB = "status = 'published'";
const page = (req, max = 100) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 24, 1), max);
  const p = Math.max(parseInt(req.query.page, 10) || 1, 1);
  return { limit, offset: (p - 1) * limit, page: p };
};
const notFound = (res) => res.status(404).json({ error: 'Not found' });

// Short shared caching for archive data; news is fresher.
publicApi.use((req, res, next) => {
  res.set('Cache-Control', req.path.startsWith('/news') ? 'no-store' : 'public, max-age=60, stale-while-revalidate=300');
  next();
});

publicApi.get('/stats', (req, res) => {
  res.json({
    players: get(`SELECT COUNT(*) c FROM players WHERE ${PUB}`).c,
    clubs: get(`SELECT COUNT(*) c FROM clubs WHERE ${PUB}`).c,
    titles: get('SELECT COUNT(*) c FROM titles').c,
    afcon_titles: get(`SELECT COUNT(*) c FROM tournament_appearances a JOIN national_teams t ON t.id = a.team_id
      WHERE t.category = 'senior' AND a.tournament = 'Africa Cup of Nations' AND a.result = 'Champions'`).c,
    world_cups: get(`SELECT COUNT(*) c FROM tournament_appearances a JOIN national_teams t ON t.id = a.team_id
      WHERE t.category = 'senior' AND a.tournament = 'FIFA World Cup'`).c,
  });
});

// Continental titles won by Egyptian clubs, by year: powers the home-page chart.
publicApi.get('/stats/continental', (req, res) => {
  const rows = all(`SELECT CAST(substr(t.season, 1, 4) AS INTEGER) AS year, COUNT(*) AS n FROM titles t
    JOIN competitions co ON co.id = t.competition_id WHERE co.scope = 'continental' AND t.winner_club_id IS NOT NULL
    GROUP BY year ORDER BY year`);
  res.json({ total: rows.reduce((s, r) => s + r.n, 0), years: rows });
});

publicApi.get('/eras', (req, res) => res.json(all('SELECT * FROM eras ORDER BY start_year')));

publicApi.get('/players', (req, res) => {
  const { limit, offset, page: p } = page(req);
  const where = [PUB.replace('status', 'p.status')], params = [];
  if (req.query.q) { where.push('(p.name_en LIKE ? OR p.name_ar LIKE ? OR p.nickname LIKE ?)'); params.push(...Array(3).fill(`%${req.query.q}%`)); }
  if (req.query.position) { where.push('p.position = ?'); params.push(req.query.position); }
  if (req.query.era) { where.push('e.slug = ?'); params.push(req.query.era); }
  if (req.query.legend === '1') where.push('p.is_legend = 1');
  const w = where.join(' AND ');
  const from = 'FROM players p LEFT JOIN eras e ON e.id = p.era_id';
  res.json({
    page: p, limit,
    total: get(`SELECT COUNT(*) c ${from} WHERE ${w}`, ...params).c,
    items: all(`SELECT p.id, p.slug, p.name_en, p.name_ar, p.nickname, p.nickname_ar, p.position, p.birth_date, p.death_date,
      p.portrait_url, p.intl_caps, p.intl_goals, p.is_legend, e.name_en AS era, e.name_ar AS era_ar ${from} WHERE ${w}
      ORDER BY p.is_legend DESC, p.name_en LIMIT ? OFFSET ?`, ...params, limit, offset),
  });
});

publicApi.get('/players/:slug', (req, res) => {
  const player = get(`SELECT p.*, e.name_en AS era, e.name_ar AS era_ar, e.slug AS era_slug FROM players p
    LEFT JOIN eras e ON e.id = p.era_id WHERE p.slug = ? AND p.${PUB}`, req.params.slug);
  if (!player) return notFound(res);
  player.career = all(`SELECT s.from_year, s.to_year, s.apps, s.goals, COALESCE(c.name_en, s.club_name) AS club,
    COALESCE(c.name_ar, s.club_name_ar, c.name_en, s.club_name) AS club_ar,
    c.slug AS club_slug FROM player_spells s LEFT JOIN clubs c ON c.id = s.club_id
    WHERE s.player_id = ? ORDER BY s.from_year`, player.id);
  player.events = all(`SELECT date, title_en, title_ar FROM events WHERE player_id = ? AND ${PUB} ORDER BY date`, player.id);
  res.json(player);
});

publicApi.get('/clubs', (req, res) => {
  res.json(all(`SELECT c.id, c.slug, c.name_en, c.name_ar, c.nickname_en, c.nickname_ar, c.city, c.city_ar, c.founded_year, c.colors, c.crest_url,
    (SELECT COUNT(*) FROM titles t WHERE t.winner_club_id = c.id) AS trophies
    FROM clubs c WHERE c.${PUB} ORDER BY trophies DESC, c.founded_year`));
});

publicApi.get('/clubs/:slug', (req, res) => {
  const club = get(`SELECT * FROM clubs WHERE slug = ? AND ${PUB}`, req.params.slug);
  if (!club) return notFound(res);
  club.milestones = all('SELECT year, kind, title_en, title_ar FROM club_milestones WHERE club_id = ? ORDER BY year', club.id);
  club.honours = all(`SELECT co.name_en AS competition, co.name_ar AS competition_ar, co.slug AS competition_slug, co.scope, COUNT(*) AS count,
    GROUP_CONCAT(t.season, ', ') AS seasons FROM titles t JOIN competitions co ON co.id = t.competition_id
    WHERE t.winner_club_id = ? GROUP BY co.id ORDER BY co.scope DESC, count DESC`, club.id);
  club.players = all(`SELECT DISTINCT p.slug, p.name_en, p.name_ar, p.position, MIN(s.from_year) AS from_year, MAX(s.to_year) AS to_year
    FROM player_spells s JOIN players p ON p.id = s.player_id WHERE s.club_id = ? AND p.${PUB}
    GROUP BY p.id ORDER BY from_year`, club.id);
  res.json(club);
});

publicApi.get('/competitions', (req, res) => {
  res.json(all(`SELECT co.*, (SELECT COUNT(*) FROM titles t WHERE t.competition_id = co.id) AS editions
    FROM competitions co ORDER BY co.scope, co.first_year`));
});

publicApi.get('/competitions/:slug', (req, res) => {
  const comp = get('SELECT * FROM competitions WHERE slug = ?', req.params.slug);
  if (!comp) return notFound(res);
  comp.titles = all(`SELECT t.season, t.runner_up, t.runner_up_ar, t.final_score, t.host, t.host_ar, t.notes_en,
    COALESCE(c.name_en, nt.name_en) AS winner, COALESCE(c.name_ar, nt.name_ar) AS winner_ar, c.slug AS winner_slug
    FROM titles t LEFT JOIN clubs c ON c.id = t.winner_club_id LEFT JOIN national_teams nt ON nt.id = t.winner_team_id
    WHERE t.competition_id = ? ORDER BY t.season DESC`, comp.id);
  comp.leaderboard = all(`SELECT COALESCE(c.name_en, nt.name_en) AS winner, COALESCE(c.name_ar, nt.name_ar) AS winner_ar, c.slug AS winner_slug, COUNT(*) AS count
    FROM titles t LEFT JOIN clubs c ON c.id = t.winner_club_id LEFT JOIN national_teams nt ON nt.id = t.winner_team_id
    WHERE t.competition_id = ? GROUP BY winner ORDER BY count DESC`, comp.id);
  res.json(comp);
});

publicApi.get('/national-teams', (req, res) => res.json(all('SELECT * FROM national_teams ORDER BY id')));

publicApi.get('/national-teams/:slug', (req, res) => {
  const team = get('SELECT * FROM national_teams WHERE slug = ?', req.params.slug);
  if (!team) return notFound(res);
  team.appearances = all('SELECT tournament, year, host, host_ar, result, coach, coach_ar, notes_en, notes_ar FROM tournament_appearances WHERE team_id = ? ORDER BY year', team.id);
  res.json(team);
});

publicApi.get('/timeline', (req, res) => {
  const featured = req.query.featured === '1' ? 'AND featured = 1' : '';
  res.json(all(`SELECT ev.date, ev.title_en, ev.title_ar, ev.body_en, ev.body_ar, ev.featured, c.slug AS club_slug, p.slug AS player_slug
    FROM events ev LEFT JOIN clubs c ON c.id = ev.club_id LEFT JOIN players p ON p.id = ev.player_id
    WHERE ev.${PUB} ${featured} ORDER BY ev.date`));
});

publicApi.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ players: [], clubs: [], competitions: [] });
  const like = `%${q}%`;
  res.json({
    players: all(`SELECT slug, name_en, name_ar, position FROM players WHERE ${PUB} AND (name_en LIKE ? OR name_ar LIKE ? OR nickname LIKE ?) LIMIT 8`, like, like, like),
    clubs: all(`SELECT slug, name_en, name_ar, city FROM clubs WHERE ${PUB} AND (name_en LIKE ? OR name_ar LIKE ? OR nickname_en LIKE ?) LIMIT 8`, like, like, like),
    competitions: all('SELECT slug, name_en FROM competitions WHERE name_en LIKE ? OR name_ar LIKE ? LIMIT 5', like, like),
  });
});

publicApi.get('/news', (req, res) => {
  const { limit, offset, page: p } = page(req, 50);
  const where = ["n.status = 'published'"], params = [];
  if (req.query.lang) { where.push('n.language = ?'); params.push(req.query.lang); }
  if (req.query.since) { where.push('n.published_at > ?'); params.push(req.query.since); }
  const w = where.join(' AND ');
  res.json({
    page: p, limit,
    total: get(`SELECT COUNT(*) c FROM news n WHERE ${w}`, ...params).c,
    items: all(`${NEWS_SELECT} WHERE ${w} ORDER BY n.pinned DESC, n.published_at DESC LIMIT ? OFFSET ?`, ...params, limit, offset),
  });
});

publicApi.get('/news/:id', (req, res) => {
  const item = get(`${NEWS_SELECT} WHERE n.id = ? AND n.status = 'published'`, req.params.id);
  return item ? res.json(item) : notFound(res);
});

// Server-Sent Events: every newly ingested or published item is pushed to open pages.
publicApi.get('/news-stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  res.write('retry: 5000\n\n');
  const send = (item) => { if (item.status === 'published') res.write(`event: news\ndata: ${JSON.stringify(item)}\n\n`); };
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
  newsBus.on('news', send);
  req.on('close', () => { clearInterval(ping); newsBus.off('news', send); });
});
