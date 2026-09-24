# Deployment & scaling

## Recommended stack by stage

| Stage | Hosting | Database | Media | Payments |
|---|---|---|---|---|
| **Launch** (this repo as-is) | One container on Railway / Render / Fly.io, or a small VPS behind Caddy/Nginx | SQLite on a **persistent volume** (WAL mode) — handles thousands of orders/day on one instance | Generated SVG art → swap in real photos on Cloudinary / S3 + CloudFront | Cash on delivery + Stripe Checkout |
| **Growth** | 2+ app instances behind a load balancer | **PostgreSQL** (Neon, Supabase, RDS) | CDN for `/css`, `/js`, `/img`, `/art` | Add a local gateway (Paymob / Fawry for Egypt) as another provider in `services/payments.js` |
| **Scale** | Containers on ECS/Kubernetes, CDN caching HTML for public pages | Postgres + read replica, Redis for sessions/rate limits/cache | Image CDN with AVIF/WebP resizing | Webhook queue (e.g. SQS) |

## Production checklist

1. `NODE_ENV=production`, `SITE_URL=https://your-domain` (used for canonical URLs, sitemap, Stripe redirects).
2. `JWT_SECRET` — 32+ random chars (`openssl rand -hex 32`); the app refuses to start without it.
3. `ADMIN_EMAIL` / `ADMIN_PASSWORD` — the seeder refuses the default password in production.
4. `DB_FILE` on a persistent volume; schedule backups (`sqlite3 store.db ".backup backup.db"` or Litestream to S3).
5. Stripe: set `STRIPE_SECRET_KEY`; create a webhook to `https://your-domain/api/payments/stripe/webhook` for `checkout.session.completed` and set `STRIPE_WEBHOOK_SECRET`. Check that your Stripe account supports your `STORE_CURRENCY` (EGP support varies by account country — otherwise use a local gateway).
6. HTTPS terminated at the proxy/PaaS (`trust proxy` is enabled in production so secure cookies and rate limits work).
7. Submit `/sitemap.xml` in Google Search Console; verify structured data with the Rich Results Test.
8. Replace sample reviews with real ones and confirm policy copy (see README).

## Docker

```bash
docker build -t el3alamy-store .
docker run -p 3000:3000 -v el3alamy-data:/data \
  -e SITE_URL=https://el3alamy.store -e JWT_SECRET=... -e ADMIN_PASSWORD=... el3alamy-store
```

## Moving to PostgreSQL

All SQL lives in `server/db`, `server/repositories`, `server/services` and `server/routes/api/admin.js`. To migrate: swap `db/index.js` for a `pg` pool with the same `get()/tx()` shape, convert `schema.sql` (`INTEGER PRIMARY KEY` → `BIGSERIAL`, `datetime('now')` → `now()`, `?` → `$1…`), and make handlers `async`. Keep money as integer minor units (`BIGINT`). A query builder such as Kysely or Drizzle keeps the SQL readable while making this portable.

## Performance notes

- Public pages send `Cache-Control: public, max-age=60` — put a CDN in front and they will absorb traffic spikes (drops, sales). Personal pages are `private, no-store`.
- `/art/*.svg` is `immutable` for 7 days; the logo 30 days; other static assets 7 days in production.
- gzip via `compression`; fonts `display=swap`; hero image `fetchpriority=high`, everything else lazy-loaded.

## Observability

Add request logging (pino-http), error tracking (Sentry), uptime checks on `/api/health`, and analytics events for `view_item`, `add_to_cart`, `begin_checkout`, `purchase`.
