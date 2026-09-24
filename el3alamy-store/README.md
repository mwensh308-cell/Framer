# El3alamy Store

Premium e-commerce storefront for **PlayStation consoles (PS5 Pro, PS5 Slim, PS4) and accessories**, founded by Mostafa Ahmed Elalamy.

- **Frontend:** server-rendered HTML (fast first paint, fully crawlable) + a small vanilla-JS layer for motion, cart drawer, search, filters, checkout, account and admin. No build step.
- **Backend:** Node.js + Express REST API, SQLite (`node:sqlite`, no native build), JWT sessions in httpOnly cookies, Stripe Checkout or cash on delivery.
- **SEO:** category hubs, platform collections, auto-generated “A vs B” comparisons, JSON-LD (Product, Offer, Review, Breadcrumb, FAQ, ItemList, Store), XML sitemap and robots.txt.
- **Socials:** Instagram, TikTok and Facebook in the header menu (mobile), home “Meet the founder” block, the footer “Join the squad” section, About and Support pages, and `sameAs` in structured data.

## Quick start

```bash
cd el3alamy-store
cp .env.example .env          # optional in development
npm install
npm run dev                   # http://localhost:3000 (seeds the catalog on first boot)
npm test                      # 11 end-to-end API/page tests on an in-memory DB
```

Requires **Node.js 22.5+** (for the built-in `node:sqlite`).

Sign in at `/account` with the seeded admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`, default `admin@el3alamy.store` / `ChangeMe!2026`) and open `/admin`. **Change these before going live.**

Try the coupon codes `WELCOME10` or `EL3ALAMY5` at checkout. In development, “Credit / debit card” simulates a successful payment; set `STRIPE_SECRET_KEY` to use real Stripe Checkout.

## Project layout

```
el3alamy-store/
├── server/
│   ├── index.js            # boot: open DB, seed, listen, stale-order sweeper
│   ├── app.js              # Express app: security headers, static, API, pages
│   ├── config.js           # env-driven settings (+ tiny .env loader)
│   ├── db/                 # schema.sql, connection + transactions, catalog seed data
│   ├── repositories/       # read models (products, variants, bundles, comparisons)
│   ├── services/           # business logic: pricing, orders, payments
│   ├── middleware/         # auth, validation, errors
│   ├── routes/api/         # REST endpoints (auth, catalog, orders, admin)
│   ├── routes/pages.js     # server-rendered pages, sitemap, robots, product art
│   ├── seo/                # JSON-LD builders, sitemap
│   └── views/              # escaped html`` templates, layout, components, pages, SVG art
├── public/                 # css/main.css, js/*.js, img/ (logo, favicon)
├── test/                   # node:test suite
└── docs/                   # ARCHITECTURE, API, DEPLOYMENT, SEO-STRATEGY
```

## Documentation

- [Architecture & data model](docs/ARCHITECTURE.md)
- [REST API reference](docs/API.md)
- [Deployment & scaling](docs/DEPLOYMENT.md)
- [Programmatic SEO strategy](docs/SEO-STRATEGY.md)

## Before launch — business details to confirm

Placeholder copy that should be checked against how the store actually operates:
delivery times (“48 hour delivery in Cairo”, same-day dispatch before 3pm), warranty length (12 months consoles / 6 months accessories),
the 14-day return policy, the contact email `hello@el3alamy.store`, shipping fees (`SHIPPING_FLAT`, `FREE_SHIPPING_THRESHOLD`), launch prices/stock in `server/db/catalog.js`, and the sample reviews (replace with real customer reviews — publishing invented reviews is not allowed by Google’s review-snippet policy or consumer-protection law).
