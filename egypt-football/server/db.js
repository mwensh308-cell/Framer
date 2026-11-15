import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import SCHEMA from './schema.js';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// On Vercel only /tmp is writable: the database is created and seeded there per function instance.
const DATA_DIR = process.env.VERCEL ? '/tmp' : join(here, '..', 'data');
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, 'archive.db');
export const UPLOAD_DIR = process.env.UPLOAD_DIR || join(DATA_DIR, 'uploads');

if (DB_PATH !== ':memory:') mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
db.exec(SCHEMA);

// Lightweight migrations for databases created by earlier versions.
const hasColumn = (table, col) => db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
const ADDED_COLUMNS = {
  national_teams: ['crest_url', 'summary_ar'],
  clubs: ['nickname_ar', 'city_ar', 'stadium_ar'],
  players: ['nickname_ar', 'birthplace_ar'],
  player_spells: ['club_name_ar'],
  competitions: ['summary_ar'],
  titles: ['runner_up_ar', 'host_ar'],
  tournament_appearances: ['host_ar', 'coach_ar', 'notes_ar'],
  events: ['body_ar'],
};
for (const [table, cols] of Object.entries(ADDED_COLUMNS)) {
  for (const col of cols) if (!hasColumn(table, col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT`);
}

/** Plain objects instead of null-prototype rows, so JSON and spreads behave normally. */
const plain = (row) => (row ? { ...row } : row);

export const all = (sql, ...params) => db.prepare(sql).all(...params).map(plain);
export const get = (sql, ...params) => plain(db.prepare(sql).get(...params));
export const run = (sql, ...params) => db.prepare(sql).run(...params);

/**
 * Editable entities exposed to the admin CRUD API. `columns` is an allow-list:
 * only these fields can be written from the dashboard, which blocks mass-assignment.
 */
export const ENTITIES = {
  players: {
    table: 'players',
    columns: ['slug', 'name_en', 'name_ar', 'nickname', 'nickname_ar', 'birth_date', 'death_date', 'birthplace', 'birthplace_ar', 'position',
      'era_id', 'portrait_url', 'bio_en', 'bio_ar', 'intl_caps', 'intl_goals', 'is_legend', 'status'],
    search: ['name_en', 'name_ar', 'nickname'],
    order: 'name_en',
  },
  clubs: {
    table: 'clubs',
    columns: ['slug', 'name_en', 'name_ar', 'nickname_en', 'nickname_ar', 'city', 'city_ar', 'founded_year', 'stadium', 'stadium_ar', 'colors',
      'crest_url', 'history_en', 'history_ar', 'status'],
    search: ['name_en', 'name_ar', 'city'],
    order: 'founded_year',
  },
  player_spells: {
    table: 'player_spells',
    columns: ['player_id', 'club_id', 'club_name', 'club_name_ar', 'from_year', 'to_year', 'apps', 'goals'],
    search: ['club_name'],
    order: 'player_id, from_year',
  },
  club_milestones: {
    table: 'club_milestones',
    columns: ['club_id', 'year', 'kind', 'title_en', 'title_ar'],
    search: ['title_en'],
    order: 'club_id, year',
  },
  competitions: {
    table: 'competitions',
    columns: ['slug', 'name_en', 'name_ar', 'scope', 'kind', 'first_year', 'summary_en', 'summary_ar'],
    search: ['name_en', 'name_ar'],
    order: 'first_year',
  },
  titles: {
    table: 'titles',
    columns: ['competition_id', 'season', 'winner_club_id', 'winner_team_id', 'runner_up', 'runner_up_ar', 'final_score', 'host', 'host_ar', 'notes_en'],
    search: ['season', 'runner_up'],
    order: 'season DESC',
  },
  national_teams: {
    table: 'national_teams',
    columns: ['slug', 'name_en', 'name_ar', 'category', 'crest_url', 'summary_en', 'summary_ar'],
    search: ['name_en'],
    order: 'id',
  },
  tournament_appearances: {
    table: 'tournament_appearances',
    columns: ['team_id', 'tournament', 'year', 'host', 'host_ar', 'result', 'coach', 'coach_ar', 'notes_en', 'notes_ar'],
    search: ['tournament', 'result', 'host'],
    order: 'year DESC',
  },
  events: {
    table: 'events',
    columns: ['date', 'title_en', 'title_ar', 'body_en', 'body_ar', 'club_id', 'player_id', 'featured', 'status'],
    search: ['title_en', 'title_ar'],
    order: 'date DESC',
  },
  news: {
    table: 'news',
    columns: ['title', 'excerpt', 'body', 'url', 'image_url', 'language', 'tags', 'published_at', 'pinned', 'status'],
    search: ['title', 'excerpt'],
    order: 'published_at DESC',
  },
  news_sources: {
    table: 'news_sources',
    columns: ['name', 'feed_url', 'site_url', 'language', 'filter_terms', 'enabled', 'poll_minutes'],
    search: ['name', 'feed_url'],
    order: 'name',
  },
};

export function audit(userId, action, entity, entityId, summary) {
  run('INSERT INTO audit_log (user_id, action, entity, entity_id, summary) VALUES (?,?,?,?,?)',
    userId ?? null, action, entity, entityId ?? null, summary ?? null);
}
