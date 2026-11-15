# The Pharaohs' Archive

The history of Egyptian football (players, clubs, championships, national teams), a live news feed, and an admin dashboard.

- **Brief, stack, data model, IA, screens, performance, accessibility, roadmap and API:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Public site:** Arabic, right-to-left, built with Vite 5 + React 18 + TypeScript + Tailwind CSS 3.4 (`web/`)
- **Server, API and admin dashboard:** Node 22.5+, Express, built-in SQLite

## Run

```bash
npm install
```

```bash
npm run build
```

```bash
ADMIN_PASSWORD='choose-a-long-password' SESSION_SECRET='random-string' npm start
```

`npm install` also installs the site's dependencies in `web/`. `npm run build` builds the site into `web/dist`, which the server serves.

For development with hot reload, run the server (`npm run dev`) and the site (`npm run dev:web`) in two terminals, then open the Vite address. It forwards `/api` to the server.

If you have a database from an earlier version, the new Arabic columns are added automatically, but the Arabic text is only filled in by a fresh seed (`npm run seed` deletes and re-creates everything).

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
| `UPLOAD_DIR` | `data/uploads` | Where uploaded logos and images are stored |
| `NODE_USE_ENV_PROXY=1` | — | Make feed fetching use `HTTPS_PROXY` when behind a proxy |

## Test

```bash
npm test
```

The tests cover the public API, login, role permissions, the CSRF guard, feed parsing and deduplication, conditional GET, and live delivery over Server-Sent Events.

## Layout

```
server/   index.js (app) · schema.sql · db.js · auth.js · news.js (aggregator + SSE bus) · seed.js · seed-ar.js (Arabic content) · routes/
web/      public site, Arabic RTL (Vite + React + Tailwind): components/Hero.tsx, Nav.tsx, ui.tsx · pages/ · lib/router.tsx
admin/    dashboard (index.html, admin.css, admin.js)
docs/     ARCHITECTURE.md
test/     api.test.js
```

## Design

The public site follows the "Apogee" hero design: full-screen video, glass navigation pills, a glass stat card with a staggered bar chart, weight-450 type and the original CSS keyframes and timing. Adaptations:

- **Arabic and right-to-left.** Line height is raised from 0.95 to 1.15 because Arabic letters are taller.
- **Fonts.** Noto Sans Arabic and Inter replace Suisse Intl, which has no Arabic letters and was linked from an unlicensed mirror. Both are variable fonts, so weight 450 is exact.
- **Real data in the stat card.** It shows continental titles won by Egyptian clubs: each of the 32 bars is a two-year window, the height is the running total, and bright bars mark windows with a new title.
- **Logo.** The site uses its own pyramid mark instead of the Apogee logo.
- **Motion.** Pages change with a 3D turn (View Transitions API). All motion stops when reduced motion is on.

The hero video is the one from the design prompt, hosted on a third-party CDN (allowed in the CSP via `media-src`). Before launch, host a video you have the rights to, and update `HERO_VIDEO` in `web/src/components/Hero.tsx` and the CSP in `server/index.js`.

The admin dashboard keeps its own cream-and-ink design, with an English interface and Arabic fields for every text.

## Logos

Club and national team logos (2027 editions) are added in the dashboard. Open a club or national team, then use **Upload file** next to the logo field and press **Save**. Use only official files supplied or licensed by the club or the Egyptian FA. Logos are trademarks, so none are bundled with the code. Until a logo is added, the site shows a monogram.

## About the seed data

The seed is a starting set: 14 players, 10 clubs, 48 titles and 19 timeline events. Only well-established facts are included. Disputed or fast-changing figures, such as international caps and goals, are left blank on purpose. Editors should verify and extend the data in the dashboard before launch. League title lists are partial.
