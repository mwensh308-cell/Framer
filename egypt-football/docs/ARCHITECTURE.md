# The Pharaohs' Archive — Product & Architecture Brief

## 1. Project brief

**What:** The reference website for Egyptian football history. It covers players across all eras, every club's journey from founding to today, domestic and continental championships, every national team, and a live news feed of Egyptian football headlines from major outlets. A separate admin dashboard lets staff edit everything, publish news and events, manage users and monitor the automatic updates.

**Who it's for**
| Audience | Need |
|---|---|
| Fans (Egypt and the diaspora, Arabic and English) | Look up a player or club, settle a debate, follow today's news |
| Journalists and researchers | Reliable, citable records: dates, finals, squads |
| Editors (internal) | Fast data entry, a draft → publish workflow, a log of every change |

**Success measures:** organic search share for player and club names; time on biography pages; how quickly news appears (target: under 5 minutes from the publisher); how quickly corrections ship (target: under 24 hours).

**Principles:** the archive is the product and news brings people in. Every fact is editable and logged. Pages are fast on mid-range Android phones over 3G. Arabic is a first-class language.

## 2. Technical stack

| Layer | Production target | MVP in this repo (same contracts) |
|---|---|---|
| Public frontend | **Next.js (App Router) + React Server Components**, static generation with incremental revalidation for archive pages | Vanilla ES modules, History API router (`public/`) |
| Styling / motion | CSS custom properties + CSS Modules; motion through CSS and `IntersectionObserver`, with View Transitions for page changes | Same approach (`public/styles.css`) |
| Admin | Next.js route group `/admin` with React Hook Form + Zod and TanStack Table | Schema-driven vanilla SPA (`admin/`) |
| API | Node.js (NestJS or Next.js route handlers), REST `/api/v1`, OpenAPI spec | Express 5 (`server/routes`) |
| Database | **PostgreSQL 16** (Prisma), `pg_trgm` + Arabic-normalised search columns | SQLite (`node:sqlite`) with identical tables |
| Search | Postgres full-text search to start; Meilisearch once the archive passes about 50k records | `LIKE` search |
| News ingestion | Worker on a queue (BullMQ + Redis): poll RSS/Atom feeds with ETag, dedupe, keyword or ML classifier | In-process scheduler (`server/news.js`) |
| Real-time | Server-Sent Events through Redis pub/sub (scales horizontally) | SSE from an in-process EventEmitter |
| Media | S3 / R2 + image CDN (AVIF/WebP, responsive `srcset`) | URL fields |
| Auth | Sessions in an httpOnly cookie, Argon2id, TOTP 2FA for admins, roles (admin / editor / viewer) | scrypt + HMAC-signed cookie, same three roles |
| Hosting | Vercel or Cloudflare for the frontend; Fly.io or Render for the API and worker; managed Postgres | `npm start` |
| Observability | OpenTelemetry → Grafana; Sentry; uptime checks on every feed | Feed-health panel + audit log |

## 3. Data model

```
eras 1─* players 1─* player_spells *─1 clubs 1─* club_milestones
                                         │
competitions 1─* titles *─1 clubs        │
                 titles *─1 national_teams 1─* tournament_appearances
events *─1 clubs / players               (timeline)
news_sources 1─* news *─1 users (author)
users 1─* audit_log
```

| Entity | Key fields | Notes |
|---|---|---|
| `players` | slug, name_en/ar, birth/death date (partial dates allowed), position, era_id, bio_en/ar, caps/goals, is_legend, status | One biography per player; career comes from `player_spells` |
| `player_spells` | player_id, club_id **or** club_name, from/to year, apps, goals | Foreign clubs go in `club_name`, so no stub records are needed |
| `clubs` | slug, names, city, founded_year, stadium, colors, history_en/ar, status | |
| `club_milestones` | club_id, year, kind (founded, renamed, title, promotion, relegation, stadium) | Powers the "journey" timeline on each club page |
| `competitions` | slug, scope (domestic, continental, international), kind | |
| `titles` | competition_id, season, winner_club_id **or** winner_team_id, runner-up, score, host | One row per edition won |
| `national_teams` | slug, category (senior, olympic, u20, u17, women, futsal, beach) | |
| `tournament_appearances` | team_id, tournament, year, host, result, coach | World Cups, AFCONs, Olympics |
| `events` | date, title, body, related club/player, featured | The cross-site timeline |
| `news_sources` | feed_url, language, filter_terms, poll_minutes, etag, last_status/error | Health is shown in the dashboard |
| `news` | guid_hash (dedupe), url, title, excerpt, body (in-house only), language, pinned, status | External items store only a headline and excerpt, then link out |
| `users` / `audit_log` | role, active / who, action, entity, summary, time | Every write is logged |

The full DDL is in [`server/schema.sql`](../server/schema.sql). For production, add `revisions` (a JSON snapshot before each update, so any edit can be rolled back), `media`, `sources_citations` (a reference URL per fact), and `matches` / `lineups` for match-level history.

## 4. Information architecture

```
/                         Home: hero, key numbers, latest news, legends, moments, clubs
/players                  Filter by name (EN/AR), position, era
/players/:slug            Biography, facts, career table, key moments
/clubs                    All clubs ranked by trophies
/clubs/:slug              History, journey timeline, honours, notable players
/championships            Domestic / continental / international
/championships/:slug      Egyptian winners by season + most-titles leaderboard
/national-teams           Senior, Olympic, youth, women
/national-teams/:slug     Appearances grouped by tournament
/timeline                 1907 → today, banded by era
/news, /news/:id          Live feed (language filter) + in-house articles
/search?q=                Players, clubs, competitions
/admin                    Overview · News · Sources · Timeline · Players · Clubs ·
                          Competitions · Titles · National teams · Users · Activity
```
Later: `/ar/...` mirrored routes with `hreflang`, `/eras/:slug`, `/matches/:id`, `/derby` (Al Ahly vs Zamalek head-to-head).

## 5. Core UI/UX screens

| Screen | Purpose | Key components |
|---|---|---|
| Home | Hook visitors and send them deeper | Display hero, animated key numbers, live ticker, legends grid, "moments" carousel |
| Player biography | The most-visited page type | Bilingual name header, facts strip, long-form serif biography with drop cap, career table, key moments |
| Club journey | Tell the club's story | Crest from club colours, history, vertical journey timeline (titles highlighted), honours with proportional bars |
| Championship | Answer "who won when?" | Season table + leaderboard |
| Timeline | Browse by era | Era bands, featured events in red, links to players and clubs |
| News | Freshness | Reverse-chronological list; new items slide in at the top, or a "N new stories" toast if the reader has scrolled, so content never jumps |
| Admin overview | Monitoring | Key numbers, feed health with per-feed "Check" button, 14-day story chart, recent activity |
| Admin editor | Data entry | Forms generated from the schema, RTL Arabic fields, drafts, nested child records (career spells, milestones, titles, appearances) |
| Admin users | Access control | Role select, activate/deactivate, reset password, invite |

**Visual language:** papyrus-paper background, ink black, flag red only for live and action states, pharaonic gold only for honours. Barlow Condensed for display, Source Serif for long reading, IBM Plex Sans / Plex Sans Arabic for the interface. Dark mode follows the system setting.

**Motion:** reveal-on-scroll, count-up numbers, bars that grow, and a highlight flash on new news. All motion is under 1 second and switched off under `prefers-reduced-motion`.

## 6. Performance

- Archive pages are statically generated and revalidated when content is edited (on-demand ISR triggered by admin saves), so the time to first byte comes from the CDN.
- Budgets: LCP < 2.0 s and INP < 200 ms on a Moto G-class phone over 4G; under 120 KB of JS on content pages. The MVP ships 0 KB of framework code.
- Fonts: `display=swap`, preconnect, subsets for Arabic and Latin.
- Images: AVIF/WebP, sized `srcset`, lazy-loaded below the fold.
- API: `Cache-Control: max-age=60, stale-while-revalidate=300` on archive endpoints, `no-store` on news; paginated lists (max 100 items).
- News: conditional GET (`If-None-Match`, `If-Modified-Since`) keeps polling cheap. Deduping by normalised-URL hash stops duplicate inserts. One SSE connection per tab.
- DB: indexes on `news(status, published_at)` and `audit_log(created_at)`; in Postgres, add trigram indexes on names.

## 7. Accessibility (WCAG 2.2 AA)

- Skip link, landmark regions, one `h1` per page, focus moves to `main` on route change, visible `:focus-visible` rings.
- Colour contrast is checked on paper and in dark mode (gold text uses a darker `--gold` than the decorative gold).
- `lang="ar"` + `dir="rtl"` on every Arabic string, so screen readers switch voice.
- The news list announces through `aria-live`; the toast is a `role="status"` button; external links say "opens in a new tab".
- Tables have `scope` headers and captions; charts have text equivalents (`role="img"` + label).
- Touch targets are at least 44 px; the mobile menu toggle uses `aria-expanded`; there is no horizontal scroll at 320 px.
- Respects `prefers-reduced-motion` and `prefers-color-scheme`.

## 8. Security & content integrity

Role-based access checked on every request (the role is re-read from the DB, so deactivation takes effect immediately). Cookies are httpOnly + SameSite=Strict and admin writes must be JSON, which guards against CSRF. Columns are allow-listed per entity (no mass assignment). Login is rate-limited, CSP is set, every write is audited, and only admins can delete. For news, we store only the headline, excerpt and link (no full-text republishing) and respect each publisher's terms. Production adds 2FA, revision history, and a citation field per fact.

## 9. Incremental roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| **0 — MVP (this repo)** | Schema, public archive pages, live news over SSE, admin CRUD, users/roles, audit log, feed health, tests | `npm test` passes; editors can run it end to end |
| **1 — Production foundation** (4–6 wks) | Postgres + Prisma migration, Next.js frontend with ISR, S3 media, Redis + worker for ingestion, CI/CD, Sentry | Lighthouse ≥ 95; zero-downtime deploys |
| **2 — Arabic-first & content scale** (4–6 wks) | Full `/ar` locale and RTL layout, bulk CSV import, revisions and rollback, citations, editorial review step (draft → review → publish) | 500+ players, 60+ clubs, all AFCON/WC squads |
| **3 — Depth** (6–8 wks) | Matches, line-ups, head-to-head (Cairo derby), season tables, coaches, stadiums, interactive era explorer | Every Premier League season since 1948–49 |
| **4 — Engagement** | Accounts, favourites, push alerts for followed clubs, an ML relevance classifier for news, quizzes and "on this day" | Repeat visits / weekly active users |

## 10. API reference

Public (`/api/v1`, read-only, cacheable)

| Method & path | Returns |
|---|---|
| `GET /stats` | `{ players, clubs, titles, afcon_titles, world_cups }` |
| `GET /eras` | Eras in date order |
| `GET /players?q=&position=&era=&legend=1&page=&limit=` | `{ page, limit, total, items[] }` |
| `GET /players/:slug` | Player + `career[]` + `events[]` |
| `GET /clubs` · `GET /clubs/:slug` | List with trophy counts · club + `milestones[]`, `honours[]`, `players[]` |
| `GET /competitions` · `GET /competitions/:slug` | List · `titles[]` + `leaderboard[]` |
| `GET /national-teams` · `GET /national-teams/:slug` | List · team + `appearances[]` |
| `GET /timeline?featured=1` | Events |
| `GET /search?q=` | `{ players[], clubs[], competitions[] }` |
| `GET /news?lang=&since=&page=` · `GET /news/:id` | Paginated news · single item |
| `GET /news-stream` | `text/event-stream`, `event: news` per new item |

Admin (`/api/admin`, cookie session; minimum role in brackets)

| Method & path | Purpose |
|---|---|
| `POST /login` · `POST /logout` · `GET /me` | Session |
| `GET /overview` (viewer) | Counts, feed health, activity, news per day |
| `GET /audit?limit=` (viewer) | Activity log |
| `GET /:entity?q=&status=&page=&<fk>=` · `GET /:entity/:id` (viewer) | List / read any entity |
| `POST /:entity` · `PUT /:entity/:id` (editor) | Create / update (allow-listed columns) |
| `DELETE /:entity/:id` (admin) | Delete |
| `POST /news_sources/:id/poll` · `POST /news/poll-all` (editor) | Ingest feeds now |
| `GET/POST /users` · `PUT/DELETE /users/:id` (admin) | User management |

`:entity` ∈ `players, player_spells, clubs, club_milestones, competitions, titles, national_teams, tournament_appearances, events, news, news_sources`.

### Sample payloads

```jsonc
// GET /api/v1/players/mohamed-salah
{
  "id": 12, "slug": "mohamed-salah", "name_en": "Mohamed Salah", "name_ar": "محمد صلاح",
  "nickname": "The Egyptian King", "birth_date": "1992-06-15", "birthplace": "Nagrig, Gharbia",
  "position": "FW", "era": "The global era", "is_legend": 1, "bio_en": "From Nagrig to Liverpool…",
  "career": [
    { "club": "El Mokawloon El Arab", "club_slug": "arab-contractors", "from_year": 2010, "to_year": 2012 },
    { "club": "Liverpool", "club_slug": null, "from_year": 2017, "to_year": null }
  ],
  "events": [{ "date": "2017-10-08", "title_en": "Salah's penalty sends Egypt to the 2018 World Cup" }]
}

// POST /api/admin/news   (editor)
{ "title": "Pharaohs squad announced", "excerpt": "…", "body": "…", "language": "en", "status": "published", "pinned": 0 }
// → 201 { "id": 41, …, "author_id": 1 }   and broadcast on /api/v1/news-stream

// SSE frame from /api/v1/news-stream
// event: news
// data: {"id":41,"title":"…","url":"https://…","source_name":"BBC Sport – Football","published_at":"2026-11-15T10:00:00.000Z"}

// POST /api/admin/news_sources   (editor)
{ "name": "Kooora", "feed_url": "https://example.org/rss", "language": "ar", "poll_minutes": 5, "filter_terms": "مصر,الأهلي,الزمالك" }
```
