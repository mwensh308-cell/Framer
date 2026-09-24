# Architecture

## Request flow

```
Browser ──► Express (helmet CSP, compression, cookie auth)
              ├── /api/*            JSON REST (routes/api) ──► services ──► repositories ──► SQLite
              ├── /products/:slug…  server-rendered HTML (routes/pages + views)
              ├── /art/:kind/:hex   generated SVG product renders (cached 7 days)
              └── /css /js /img     static assets
```

**Why server-rendered pages + vanilla JS?** Product, category and comparison pages are the pages that must rank and load fast on mobile data. Rendering them on the server gives full HTML to crawlers and a fast first paint; the ~30 KB of client JS only adds motion and interactivity (progressive enhancement). Cart, checkout, account and admin are app-like, `noindex` pages that talk to the REST API. There is no build step to maintain, which suits an intermediate team. If the frontend grows, the same REST API can back a Next.js app later without backend changes.

## Layers (separation of concerns)

| Layer | Folder | Responsibility |
|---|---|---|
| Routes | `routes/api`, `routes/pages.js` | HTTP only: parse, validate, call a service, shape the response |
| Middleware | `middleware/` | `loadUser` (JWT cookie → `req.user`), `requireAuth/Admin`, declarative `validate()`, error handling |
| Services | `services/` | Business rules: `pricing` (server-side totals, stock check, coupons), `orders` (atomic create, status machine, restock), `payments` (COD / Stripe / dev mock) |
| Repositories | `repositories/` | Read models: hydrate products with variants, platforms, ratings; bundles; comparison pairs |
| Views | `views/` | `html` tagged templates that **escape by default**; layout, components, pages |
| SEO | `seo/` | JSON-LD builders and sitemap/robots |

## Data model

Money is stored as **integer minor units** (piasters/cents) everywhere to avoid floating-point errors.

```
categories 1─* products 1─* product_variants *─* bundles (via bundle_items)
                  │  └─* product_platforms (ps5 | ps4)   ← compatibility
                  └─* reviews
users 1─* orders 1─* order_items (snapshot of name/variant/price)
                 └─* order_events (tracking timeline)
coupons, newsletter
```

- **Product vs. variant.** A *product* is the marketing entity (“DualSense Wireless Controller”) with shared copy, highlights and a `specs` JSON object. A *variant* is the purchasable SKU — colour, edition (Disc/Digital), storage — with its own price, compare-at price and stock. This models electronics well: one PDP, many SKUs.
- **Specs as JSON with shared labels per category** (“Storage”, “Disc drive”…) drive both the spec table and the programmatic comparison tables without extra tables. Promote to an EAV/`product_specs` table if you need faceted filtering on specs.
- **Compatibility** (`product_platforms`) powers `/compatible/ps5|ps4`, “Works with” chips and cross-sells, with an optional note (“PS4 games only”).
- **Bundles** reference *variants* (not products) so stock is checked per SKU; the bundle price is computed live from component prices × `discount_percent`, so price changes flow through automatically.
- **Orders snapshot** product/variant names and unit prices so later catalog edits never rewrite history. `order_events` is an append-only timeline shown on the tracking page.

## Checkout & inventory consistency

1. Browser stores only `{variantId, quantity}` / `{bundleId, quantity}` in `localStorage`.
2. `POST /api/cart/quote` re-prices everything from the DB (client prices are ignored).
3. `POST /api/orders` runs **inside one `BEGIN IMMEDIATE` transaction**: re-quote → verify coupon → `UPDATE … SET stock = stock - ? WHERE stock >= ?` per variant (fails atomically if anything sold out) → insert order, items, first event.
4. COD orders go to `processing`; card orders to `pending_payment`, then Stripe Checkout. The Stripe webhook (signature-verified, amount-checked, idempotent) moves them to `paid`.
5. Unpaid card orders older than 60 min are cancelled by a sweeper and their stock released. Cancelling any order restocks it (including bundle components).

Order status machine: `pending_payment → paid → processing → shipped → delivered`, with `cancelled` / `refunded` branches. Illegal transitions return `409`.

## Security

- Passwords: bcrypt (cost 12). Sessions: signed JWT in an `httpOnly`, `SameSite=Lax`, `Secure` (prod) cookie, 7-day expiry.
- CSRF: SameSite cookies **plus** the API rejects non-JSON state-changing requests (`415`), which cross-site HTML forms cannot send.
- XSS: server templates escape all interpolations; client code escapes via `esc()`; strict CSP (`script-src 'self'`, no inline scripts).
- Rate limits on login/register, checkout and tracking. Validation on every write endpoint. Admin routes behind `requireAdmin`.
- Order tracking requires order number **and** email; payment references and user IDs are stripped from public responses.

## Frontend motion system

All animation is CSS-driven with JS only toggling classes/variables, and everything respects `prefers-reduced-motion`:
first-visit loader (PlayStation symbols, CSS-only exit), staggered hero entrance, floating/parallax hero render, marquee, scroll-reveal with sibling stagger (IntersectionObserver), 3D tilt + pointer spotlight on cards, fly-to-cart, cart drawer, sticky buy bar, animated success check.
