import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(here, '..', 'data', 'archive.db');
export const UPLOAD_DIR = process.env.UPLOAD_DIR || join(here, '..', 'data', 'uploads');

if (DB_PATH !== ':memory:') mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));

// Lightweight migrations for databases created by earlier versions.
const hasColumn = (table, col) => db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
if (!hasColumn('national_teams', 'crest_url')) db.exec('ALTER TABLE national_teams ADD COLUMN crest_url TEXT');

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
    columns: ['slug', 'name_en', 'name_ar', 'nickname', 'birth_date', 'death_date', 'birthplace', 'position',
      'era_id', 'portrait_url', 'bio_en', 'bio_ar', 'intl_caps', 'intl_goals', 'is_legend', 'status'],
    search: ['name_en', 'name_ar', 'nickname'],
    order: 'name_en',
  },
  clubs: {
    table: 'clubs',
    columns: ['slug', 'name_en', 'name_ar', 'nickname_en', 'city', 'founded_year', 'stadium', 'colors',
      'crest_url', 'history_en', 'history_ar', 'status'],
    search: ['name_en', 'name_ar', 'city'],
    order: 'founded_year',
  },
  player_spells: {
    table: 'player_spells',
    columns: ['player_id', 'club_id', 'club_name', 'from_year', 'to_year', 'apps', 'goals'],
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
    columns: ['slug', 'name_en', 'name_ar', 'scope', 'kind', 'first_year', 'summary_en'],
    search: ['name_en', 'name_ar'],
    order: 'first_year',
  },
  titles: {
    table: 'titles',
    columns: ['competition_id', 'season', 'winner_club_id', 'winner_team_id', 'runner_up', 'final_score', 'host', 'notes_en'],
    search: ['season', 'runner_up'],
    order: 'season DESC',
  },
  national_teams: {
    table: 'national_teams',
    columns: ['slug', 'name_en', 'name_ar', 'category', 'crest_url', 'summary_en'],
    search: ['name_en'],
    order: 'id',
  },
  tournament_appearances: {
    table: 'tournament_appearances',
    columns: ['team_id', 'tournament', 'year', 'host', 'result', 'coach', 'notes_en'],
    search: ['tournament', 'result', 'host'],
    order: 'year DESC',
  },
  events: {
    table: 'events',
    columns: ['date', 'title_en', 'title_ar', 'body_en', 'club_id', 'player_id', 'featured', 'status'],
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
