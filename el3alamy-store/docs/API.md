# REST API

Base path `/api`. JSON in/out. State-changing requests must send `Content-Type: application/json`. Auth is a session cookie set by `/auth/login` or `/auth/register`. Money fields are integer minor units.

Errors: `{ "error": "message", "details"?: {...} }` with `401` (sign in), `403` (forbidden), `404`, `409` (conflict: stock, duplicate, illegal status), `415`, `422` (validation), `429` (rate limit).

## Public

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Liveness probe |
| GET | `/config` | Currency, card availability, shipping thresholds |
| GET | `/categories` | Categories with product counts |
| GET | `/products?category=&platform=ps5\|ps4&q=&sort=featured\|newest\|price-asc\|price-desc\|name&featured=true` | Product list (variants, platforms, rating, price range) |
| GET | `/products/:slug` | Product + reviews + bundles containing it + related |
| GET | `/bundles` | Active bundles with computed price & savings |
| GET | `/search?q=` | Up to 6 quick results |
| POST | `/cart/quote` | `{items:[{variantId,quantity}], bundles:[{bundleId,quantity}], coupon?}` → lines, subtotal, discount, shipping, total, issues |
| POST | `/newsletter` | `{email}` |

## Auth

| Method | Path | Body |
|---|---|---|
| POST | `/auth/register` | `{name, email, password(8+)}` — also links earlier guest orders with the same email |
| POST | `/auth/login` | `{email, password}` |
| POST | `/auth/logout` | `{}` |
| GET | `/auth/me` | — |

## Orders

| Method | Path | Description |
|---|---|---|
| POST | `/orders` | `{email, paymentMethod: "cod"\|"card", cart, address:{fullName, phone, line1, line2?, city, region?, postalCode?, country}}` → `{order, redirect}` (redirect to Stripe or confirmation) |
| POST | `/orders/track` | `{number, email}` → order with timeline |
| GET | `/orders/mine` | Signed-in user's orders |
| GET | `/orders/:number` | Owner or admin |
| POST | `/payments/stripe/webhook` | Stripe `checkout.session.completed` (raw body, signature verified) |

## Admin (role `admin`)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Revenue, orders by status, 30-day series, low stock, customer count |
| GET/POST | `/admin/products` | List (incl. inactive) / create `{slug,name,categorySlug,kind,art,tagline,description,platforms,specs?,highlights?}` |
| PATCH | `/admin/products/:id` | `{name?, tagline?, description?, featured?, active?}` |
| POST | `/admin/products/:id/variants` | `{sku, name, price, stock, color?, colorHex?, compareAtPrice?}` |
| PATCH | `/admin/variants/:id` | `{price?, compareAtPrice?, stock?, active?, name?, color?, colorHex?}` |
| GET/POST | `/admin/bundles` | List / create `{slug,name,description,discountPercent,items:[{variantId,quantity}]}` |
| PATCH | `/admin/bundles/:id` | `{active}` |
| GET | `/admin/orders?status=` | Latest 100 orders |
| GET | `/admin/orders/:number` | Full order incl. address + allowed next statuses |
| POST | `/admin/orders/:number/status` | `{status, note?, trackingNumber?}` — enforces the status machine; cancelling restocks |
| GET/POST | `/admin/coupons` | List / upsert `{code, percentOff, minSubtotal?}` |
| GET | `/admin/customers` | Customers with order count & lifetime spend |
