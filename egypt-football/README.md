# The Pharaohs' Archive

The history of Egyptian football (players, clubs, championships, national teams), a live news feed, and an admin dashboard.

- **Brief, stack, data model, IA, screens, performance, accessibility, roadmap and API:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Working MVP:** Node 22.5+, Express, built-in SQLite. No build step.

## Run

```bash
npm install
```

```bash
ADMIN_PASSWORD='choose-a-long-password' SESSION_SECRET='random-string' npm start
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin (sign in as `admin@example.com`, or whatever `ADMIN_EMAIL` is set to)

If `ADMIN_PASSWORD` is unset, a random password is printed when the database is first seeded. To reseed from scratch, run `npm run seed`.

| Env var | Default | Purpose |
|---|---|---|
| `PORT` | 3000 | HTTP port |
| `DB_PATH` | `data/archive.db` | SQLite file (`:memory:` for tests) |
| `SESSION_SECRET` | random per boot | Signs admin sessions |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@example.com` / random | First admin account |
| `NEWS_POLLING` | on | Set to `off` to disable the feed scheduler |
| `NODE_USE_ENV_PROXY=1` | — | Make feed fetching use `HTTPS_PROXY` when behind a proxy |

## Test

```bash
npm test
```

The tests cover the public API, login, role permissions, the CSRF guard, feed parsing and deduplication, conditional GET, and live delivery over Server-Sent Events.

## Layout

```
server/   index.js (app) · schema.sql · db.js · auth.js · news.js (aggregator + SSE bus) · seed.js · routes/
public/   public site (index.html, styles.css, app.js)
admin/    dashboard (index.html, admin.css, admin.js)
docs/     ARCHITECTURE.md
test/     api.test.js
```

## About the seed data

The seed is a starting set: 14 players, 10 clubs, 48 titles and 19 timeline events. Only well-established facts are included. Disputed or fast-changing figures, such as international caps and goals, are left blank on purpose. Editors should verify and extend the data in the dashboard before launch. League title lists are partial.
