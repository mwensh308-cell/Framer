-- The Pharaohs' Archive — relational schema (SQLite for the MVP; maps 1:1 to PostgreSQL).
-- Every bilingual text field has _en / _ar columns. Every editorial table has status + timestamps
-- so the admin dashboard can draft, publish and audit changes.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS eras (
  id          INTEGER PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name_en     TEXT NOT NULL,
  name_ar     TEXT,
  start_year  INTEGER NOT NULL,
  end_year    INTEGER,                -- NULL = ongoing
  summary_en  TEXT,
  summary_ar  TEXT
);

CREATE TABLE IF NOT EXISTS clubs (
  id            INTEGER PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  name_en       TEXT NOT NULL,
  name_ar       TEXT,
  nickname_en   TEXT,
  city          TEXT,
  founded_year  INTEGER,
  stadium       TEXT,
  colors        TEXT,                 -- comma-separated hex values
  crest_url     TEXT,
  history_en    TEXT,                 -- long-form Markdown
  history_ar    TEXT,
  status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A club's journey: name changes, promotions, relegations, titles, stadium moves.
CREATE TABLE IF NOT EXISTS club_milestones (
  id        INTEGER PRIMARY KEY,
  club_id   INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  year      INTEGER NOT NULL,
  kind      TEXT NOT NULL CHECK (kind IN ('founded','renamed','title','promotion','relegation','stadium','other')),
  title_en  TEXT NOT NULL,
  title_ar  TEXT
);

CREATE TABLE IF NOT EXISTS players (
  id             INTEGER PRIMARY KEY,
  slug           TEXT UNIQUE NOT NULL,
  name_en        TEXT NOT NULL,
  name_ar        TEXT,
  nickname       TEXT,
  birth_date     TEXT,                -- ISO date; partial dates allowed (YYYY or YYYY-MM)
  death_date     TEXT,
  birthplace     TEXT,
  position       TEXT CHECK (position IN ('GK','DF','MF','FW','COACH')),
  era_id         INTEGER REFERENCES eras(id),
  portrait_url   TEXT,
  bio_en         TEXT,                -- long-form Markdown
  bio_ar         TEXT,
  intl_caps      INTEGER,
  intl_goals     INTEGER,
  is_legend      INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Career spells: one row per player-at-club period. Powers biographies and club squads by era.
CREATE TABLE IF NOT EXISTS player_spells (
  id          INTEGER PRIMARY KEY,
  player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  club_id     INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
  club_name   TEXT,                   -- for foreign clubs not in the clubs table
  from_year   INTEGER,
  to_year     INTEGER,
  apps        INTEGER,
  goals       INTEGER
);

CREATE TABLE IF NOT EXISTS competitions (
  id         INTEGER PRIMARY KEY,
  slug       TEXT UNIQUE NOT NULL,
  name_en    TEXT NOT NULL,
  name_ar    TEXT,
  scope      TEXT NOT NULL CHECK (scope IN ('domestic','continental','international')),
  kind       TEXT NOT NULL CHECK (kind IN ('league','cup','supercup','tournament')),
  first_year INTEGER,
  summary_en TEXT
);

-- One row per edition. Winner is either a club or a national team.
CREATE TABLE IF NOT EXISTS titles (
  id               INTEGER PRIMARY KEY,
  competition_id   INTEGER NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  season           TEXT NOT NULL,     -- '1986' or '2005-06'
  winner_club_id   INTEGER REFERENCES clubs(id),
  winner_team_id   INTEGER REFERENCES national_teams(id),
  runner_up        TEXT,
  final_score      TEXT,
  host             TEXT,
  notes_en         TEXT
);

CREATE TABLE IF NOT EXISTS national_teams (
  id          INTEGER PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  name_en     TEXT NOT NULL,
  name_ar     TEXT,
  category    TEXT NOT NULL CHECK (category IN ('senior','olympic','u20','u17','women','futsal','beach')),
  summary_en  TEXT
);

-- World Cups, AFCONs, Olympics: one row per tournament appearance.
CREATE TABLE IF NOT EXISTS tournament_appearances (
  id          INTEGER PRIMARY KEY,
  team_id     INTEGER NOT NULL REFERENCES national_teams(id) ON DELETE CASCADE,
  tournament  TEXT NOT NULL,          -- 'FIFA World Cup', 'Africa Cup of Nations', 'Olympic Games'
  year        INTEGER NOT NULL,
  host        TEXT,
  result      TEXT,                   -- 'Champions', 'Group stage', 'Fourth place', ...
  coach       TEXT,
  notes_en    TEXT
);

-- Timeline: cross-cutting historical events shown on the home page and /timeline.
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY,
  date        TEXT NOT NULL,
  title_en    TEXT NOT NULL,
  title_ar    TEXT,
  body_en     TEXT,
  club_id     INTEGER REFERENCES clubs(id),
  player_id   INTEGER REFERENCES players(id),
  featured    INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- News: aggregated from external feeds (source_id set) or written in-house (source_id NULL).
CREATE TABLE IF NOT EXISTS news_sources (
  id             INTEGER PRIMARY KEY,
  name           TEXT NOT NULL,
  feed_url       TEXT UNIQUE NOT NULL,
  site_url       TEXT,
  language       TEXT NOT NULL DEFAULT 'en',
  filter_terms   TEXT,                -- comma-separated; NULL = keep every item
  enabled        INTEGER NOT NULL DEFAULT 1,
  poll_minutes   INTEGER NOT NULL DEFAULT 10,
  etag           TEXT,
  last_modified  TEXT,
  last_polled_at TEXT,
  last_status    TEXT,
  last_error     TEXT,
  items_ingested INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS news (
  id            INTEGER PRIMARY KEY,
  source_id     INTEGER REFERENCES news_sources(id) ON DELETE SET NULL,
  guid_hash     TEXT UNIQUE NOT NULL, -- sha1 of canonical URL; dedupes across polls
  url           TEXT,
  title         TEXT NOT NULL,
  excerpt       TEXT,
  body          TEXT,                 -- only for in-house articles; external items link out
  image_url     TEXT,
  language      TEXT NOT NULL DEFAULT 'en',
  tags          TEXT,
  published_at  TEXT NOT NULL,
  pinned        INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','hidden')),
  author_id     INTEGER REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(status, published_at DESC);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,        -- scrypt$salt$hash
  role          TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('admin','editor','viewer')),
  active        INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Every admin write is recorded here: powers the "Activity" monitor in the dashboard.
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  action      TEXT NOT NULL,          -- create | update | delete | login | poll
  entity      TEXT NOT NULL,
  entity_id   INTEGER,
  summary     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
